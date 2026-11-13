"""
arduino/leitor_arduino.py
Lê os dados do Arduino via porta Serial e envia para o servidor Pathfinder.

Instalacao:
    pip install pyserial requests

Uso:
    python leitor_arduino.py
"""

import serial
import requests
import time

# ================================================
# CONFIGURACAO - ajuste conforme necessario
# ================================================
PORTA        = 'COM5'
BAUD         = 9600
URL_SERVIDOR = 'http://localhost:4000/arduino/dados'

print("=" * 50)
print("   Pathfinder - Leitor Arduino")
print("=" * 50)
print(f"Porta:    {PORTA}")
print(f"Servidor: {URL_SERVIDOR}")
print("Iniciando...\n")

try:
    ser = serial.Serial(PORTA, BAUD, timeout=0.1)  # timeout curto = sem travamento
    time.sleep(2)
    print("Arduino conectado!\n")
except serial.SerialException as e:
    print(f"ERRO: Nao foi possivel abrir a porta {PORTA}")
    print(f"Detalhes: {e}")
    print("\nDica: verifique a porta no Arduino IDE em Ferramentas > Porta")
    exit(1)


def parse_linha(linha: str) -> dict | None:
    """
    Formato CSV esperado:
    distancia,bateria,latitude,longitude,queda,sos,estado
    Exemplo: 25,0,0.000000,0.000000,0,0,NORMAL
    """
    try:
        partes = linha.split(',')
        if len(partes) < 7:
            return None

        return {
            "distancia": int(partes[0]),
            "bateria":   int(partes[1]),
            "latitude":  float(partes[2]) if float(partes[2]) != 0.0 else None,
            "longitude": float(partes[3]) if float(partes[3]) != 0.0 else None,
            "queda":     partes[4].strip() == '1',
            "sos":       partes[5].strip() == '1',
            "estado":    partes[6].strip()
        }
    except (ValueError, IndexError):
        return None


def enviar_e_checar_resposta(dados: dict) -> bool:
    """
    Envia dados ao servidor e verifica se há ordem de disparar o buzzer web
    """
    try:
        resposta = requests.post(URL_SERVIDOR, json=dados, timeout=2)
        
        # Se salvou no Node com sucesso, verifica se o servidor mandou disparar o SOS web
        if resposta.status_code == 201:
            res_json = resposta.json()
            # Se o backend Node anexar 'disparar_web' na resposta do POST de salvamento
            if res_json.get('disparar_web') == True:
                print("🚨 Comando SOS recebido da Dashboard! Escrevendo na Serial...")
                ser.write(b'S') # Envia o byte 'S' para o Arduino disparar o buzzer
            return True
            
        return False
    except requests.exceptions.ConnectionError:
        return False


while True:
    try:
        linha = ser.readline().decode('utf-8', errors='ignore').strip()

        if not linha:
            continue  # sem sleep — lê imediatamente a próxima linha

        dados = parse_linha(linha)

        if dados is None:
            continue  # linha inválida, tenta de novo sem esperar

        # Log no terminal
        icon = "🔴" if dados['estado'] == 'CRITICO' else ("🟡" if dados['estado'] == 'ALERTA' else "🟢")
        print(f"{icon}  Dist: {dados['distancia']}cm | "
              f"Bat: {dados['bateria']}% | "
              f"Queda: {'SIM' if dados['queda'] else 'nao'} | "
              f"SOS: {'SIM' if dados['sos'] else 'nao'} | "
              f"Estado: {dados['estado']}")

        if dados['sos']:
            print("  ⚠️  SOS ACIONADO!")
        if dados['queda']:
            print("  ⚠️  QUEDA DETECTADA!")

        ok = enviar_e_checar_resposta(dados)
        if not ok:
            print("  ⚠️  Servidor offline - dado nao salvo")

    except KeyboardInterrupt:
        print("\n\nEncerrando leitor...")
        ser.close()
        break
    except Exception as e:
        print(f"Erro inesperado: {e}")