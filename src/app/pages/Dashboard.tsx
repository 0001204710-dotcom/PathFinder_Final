import { apiFetch } from '../api';
import { AlertTriangle, MapPin, Bell, Activity, Zap, Clock, Radio, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { MedicationAlarm } from '../components/MedicationAlarm';
import { NextMedicationWidget } from '../components/NextMedicationWidget';

interface DashboardMedication {
  id: number;
  nome: string;
  dosagem?: string | null;
  horario?: string | null;
  dependentes?: { nome: string } | null;
}

interface DashboardAlert {
  id: number;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  status: string;
  prioridade: string;
  data_hora: string;
  dependente?: { nome: string } | null;
}

interface DashboardLocation {
  id: number;
  endereco: string;
  latitude?: number | null;
  longitude?: number | null;
  data_hora: string;
  atual: boolean;
}

interface DashboardDevice {
  id: number;
  nome: string;
  status: string;
  bateria?: number | null;
  gps_online: boolean;
  ultima_atualizacao: string;
}

interface DashboardResponse {
  device: DashboardDevice | null;
  alertsSummary: {
    totalToday: number;
    active: number;
    resolved: number;
  };
  lastLocation: DashboardLocation | null;
  recentAlerts: DashboardAlert[];
  medications: DashboardMedication[];
  nextMedication: {
    id?: number;
    nome: string;
    dosagem?: string | null;
    horario?: string | null;
    dependente_id?: number | null;
  } | null;
}

// ── Arduino types ──────────────────────────────────────────────────────────────
interface ArduinoLeitura {
  id: number;
  distancia: number;
  bateria: number;
  latitude: number | null;
  longitude: number | null;
  queda: boolean | number;
  sos: boolean | number;
  estado: string;
  timestamp: string;
}

export default function Dashboard() {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [showMedicationAlarm, setShowMedicationAlarm] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  
  // ── CONTROLE DO ALARME AUTOMÁTICO ────────────────────────────────────────────
  const [alarmeDisparadoId, setAlarmeDisparadoId] = useState<string | null>(null);

  // ── Arduino state ────────────────────────────────────────────────────────────
  const [arduino, setArduino] = useState<ArduinoLeitura | null>(null);
  const [arduinoOnline, setArduinoOnline] = useState(false);
  const [lastArduinoUpdate, setLastArduinoUpdate] = useState<Date | null>(null);
  
  // ── ESTADOS DO ALERTA EM TEMPO REAL ──────────────────────────────────────────
  const [realtimeAlert, setRealtimeAlert] = useState<{ tipo: 'QUEDA' | 'SOS'; id: number } | null>(null);
  const [ultimoAlertIdProcessado, setUltimoAlertIdProcessado] = useState<number | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const context = useOutletContext<{ currentDependent: { id: number; nome: string } | null }>();

  async function loadDashboard() {
    try {
      const dependenteId = context?.currentDependent?.id ?? null;
      const url = dependenteId ? `${apiUrl}/api/dashboard?dependente_id=${dependenteId}` : `${apiUrl}/api/dashboard`;
      const response = await apiFetch(url);
      const data: DashboardResponse = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  // ── FUNÇÃO PARA TOCAR SOM NO NAVEGADOR ──────────────────────────────────────
  const tocarSomAlerta = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // Tom de alerta
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 800); // Toca por 800ms
    } catch (e) {
      console.error("Não foi possível tocar o som de alerta:", e);
    }
  };

  // ── Poll Arduino a cada 2 segundos ──────────────────────────────────────────
  async function loadArduino() {
    try {
      const res = await apiFetch(`${apiUrl}/arduino/ultima`);
      if (!res.ok) { setArduinoOnline(false); return; }
      const data: ArduinoLeitura = await res.json();
      setArduino(data);
      setLastArduinoUpdate(new Date());

      // Considera offline se a última leitura tem mais de 10 segundos
      const ts = new Date(data.timestamp).getTime();
      setArduinoOnline(Date.now() - ts < 10000);

      // ── LÓGICA DO ALERTA EM TEMPO REAL (QUEDA OU SOS) ──────────────────────
      if (data.id !== ultimoAlertIdProcessado) {
        if (data.sos === 1 || data.sos === true) {
          setRealtimeAlert({ tipo: 'SOS', id: data.id });
          setUltimoAlertIdProcessado(data.id);
          tocarSomAlerta();
        } else if (data.queda === 1 || data.queda === true) {
          setRealtimeAlert({ tipo: 'QUEDA', id: data.id });
          setUltimoAlertIdProcessado(data.id);
          tocarSomAlerta();
        }
      }

    } catch {
      setArduinoOnline(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function safeLoad() { if (mounted) await loadDashboard(); }
    safeLoad();
    const id = setInterval(safeLoad, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, [apiUrl, context?.currentDependent?.id]);

  useEffect(() => {
    loadArduino();
    const id = setInterval(loadArduino, 2000);
    return () => clearInterval(id);
  }, [apiUrl, ultimoAlertIdProcessado]);

  useEffect(() => {
    if ((window as any).__medMissTimeout) { clearTimeout((window as any).__medMissTimeout); (window as any).__medMissTimeout = null; }
    if ((window as any).__medReopenTimeout) { clearTimeout((window as any).__medReopenTimeout); (window as any).__medReopenTimeout = null; }
    setShowMedicationAlarm(false);
  }, [context?.currentDependent?.id]);

  const registrarAlertaAtrasoOuCancelamento = async (motivo: string) => {
    try {
      const medName = nextMedication.name;
      const dependenteId = (dashboardData?.nextMedication as any)?.dependente_id ?? context?.currentDependent?.id ?? null;
      await apiFetch(`${apiUrl}/api/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dependente_id: dependenteId,
          tipo: 'medicamento',
          titulo: `Medicação: ${medName}`,
          descricao: `O medicamento ${medName} (${nextMedication.dosage}) agendado para às ${nextMedication.time} foi ${motivo}.`,
          prioridade: 'alta',
          status: 'ativo',
        }),
      });
      await loadDashboard();
    } catch (err) {
      console.error('Erro ao criar alerta de medicamento:', err);
    }
  };

  const registrarAlertaDisparo = async (med: any) => {
    try {
      const dependenteId = med.dependente_id ?? context?.currentDependent?.id ?? null;
      await apiFetch(`${apiUrl}/api/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dependente_id: dependenteId,
          tipo: 'medicamento',
          titulo: `Hora da Medicação: ${med.nome}`,
          descricao: `É hora de tomar o medicamento ${med.nome} (${med.dosagem || '1 comprimido'}).`,
          prioridade: 'alta',
          status: 'ativo',
        }),
      });
      await loadDashboard(); // Recarrega para aparecer na listagem "Alertas Recentes" da tela
    } catch (err) {
      console.error('Erro ao disparar alerta no banco:', err);
    }
  };

  // ── MOTOR AUTOMÁTICO DE DISPARO DA MEDICAÇÃO ──────────────────────────────
  useEffect(() => {
    const med = dashboardData?.nextMedication;
    if (!med || !med.horario) return;

    const monitorarRelogio = setInterval(() => {
      const agora = new Date();
      const horaAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;
      
      const horaMedicamento = med.horario.substring(0, 5);
      const dataHoje = agora.toLocaleDateString('pt-BR');
      const chaveDoAlarme = `${med.id}-${dataHoje}`;

      if (horaAtual === horaMedicamento && alarmeDisparadoId !== chaveDoAlarme) {
        setAlarmeDisparadoId(chaveDoAlarme);
        setShowMedicationAlarm(true);
        tocarSomAlerta();
        registrarAlertaDisparo(med);
      }
    }, 10000); // Roda a cada 10 segundos

    return () => clearInterval(monitorarRelogio);
  }, [dashboardData?.nextMedication, alarmeDisparadoId, apiUrl, context?.currentDependent?.id]);

  const handleEmergency = async () => {
    setEmergencyActive(true);
    
    try {
      await apiFetch(`${apiUrl}/arduino/disparar-sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Erro ao enviar comando SOS para o backend:', err);
    }

    setTimeout(() => setEmergencyActive(false), 3000);
  };

  const getFormattedTime = (time?: string | null) => {
    if (!time) return '--:--';
    return time.length >= 5 ? time.slice(0, 5) : time;
  };

  const getMinutesUntil = (time?: string | null) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  };

  let nextMedication = {
    name: 'Sem medicação agendada',
    dosage: 'Sem dados',
    time: '--:--',
    minutesUntil: 0,
    hasMedication: false,
  } as any;

  if (dashboardData?.nextMedication) {
    const md = dashboardData.nextMedication as any;
    let minutesUntil = getMinutesUntil(md.horario);
    let time = getFormattedTime(md.horario);
    if (snoozedUntil && snoozedUntil > Date.now()) {
      const d = new Date(snoozedUntil);
      const pad = (n: number) => String(n).padStart(2, '0');
      time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      minutesUntil = Math.max(0, Math.round((snoozedUntil - Date.now()) / 60000));
    }
    nextMedication = { id: md.id, name: md.nome, dosage: md.dosagem || '1 comprimido', time, minutesUntil, hasMedication: true };
  }

  const handleConfirmMedication = () => {
    setShowMedicationAlarm(false);
    setSnoozedUntil(null);
    if ((window as any).__medMissTimeout) { clearTimeout((window as any).__medMissTimeout); (window as any).__medMissTimeout = null; }
    if ((window as any).__medReopenTimeout) { clearTimeout((window as any).__medReopenTimeout); (window as any).__medReopenTimeout = null; }
  };

  const handleSnoozeMedication = async (minutes = 10) => {
    try {
      const medId = (dashboardData?.nextMedication as any)?.id;
      if (medId) {
        await apiFetch(`${apiUrl}/api/medicamentos/${medId}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes }),
        });
      }
    } catch (err) { console.error('Erro ao registrar snooze:', err); }

    setShowMedicationAlarm(false);
    const reopenTimestamp = Date.now() + minutes * 60000;
    setSnoozedUntil(reopenTimestamp);
    if ((window as any).__medMissTimeout) { clearTimeout((window as any).__medMissTimeout); (window as any).__medMissTimeout = null; }
    const reopenId = window.setTimeout(() => { setShowMedicationAlarm(true); (window as any).__medReopenTimeout = null; }, minutes * 60000);
    (window as any).__medReopenTimeout = reopenId;
  };

  useEffect(() => {
    if (!showMedicationAlarm) return;
    const missId = window.setTimeout(async () => {
      await registrarAlertaAtrasoOuCancelamento('perdido por falta de confirmação na janela de 5 minutos');
    }, 5 * 60000);
    (window as any).__medMissTimeout = missId;
    return () => { if ((window as any).__medMissTimeout) { clearTimeout((window as any).__medMissTimeout); (window as any).__medMissTimeout = null; } };
  }, [showMedicationAlarm, dashboardData?.nextMedication]);

  const stats = [
    { label: 'Dispositivo', value: dashboardData?.device?.status ?? (loading ? 'Carregando...' : 'Offline'), icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Bateria', value: dashboardData?.device?.bateria != null ? `${dashboardData?.device?.bateria}%` : 'N/D', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Alertas Hoje', value: dashboardData?.alertsSummary?.totalToday?.toString() ?? '0', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'GPS', value: dashboardData?.device?.gps_online ? 'Online' : 'Offline', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const recentAlerts = dashboardData?.recentAlerts ?? [];
  const lastLocation = dashboardData?.lastLocation;

  // ── Arduino helpers ──────────────────────────────────────────────────────────
  const estadoCor: Record<string, { badge: string; border: string }> = {
    NORMAL:  { badge: 'bg-green-100 text-green-700',  border: 'border-green-400' },
    ALERTA:  { badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-400' },
    CRITICO: { badge: 'bg-red-100 text-red-700',       border: 'border-red-500' },
  };
  const estadoAtual = arduino?.estado ?? 'NORMAL';
  const cores = estadoCor[estadoAtual] ?? estadoCor['NORMAL'];

  const distanciaLabel = (d?: number) => {
    if (d === undefined || d === null) return '---';
    if (d >= 999) return '> 4m';
    return `${d} cm`;
  };

  const bateriaBarCor = (b?: number) => {
    if (!b) return 'bg-gray-300';
    if (b <= 20) return 'bg-red-500';
    if (b <= 50) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 text-lg">Bem-vindo ao sistema PathFinder</p>
      </div>

      {/* Emergency Button */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Botão de Emergência</h2>
          <p className="text-gray-600 mb-6 text-lg">Pressione em caso de emergência</p>
          <button
            onClick={handleEmergency}
            className={`w-48 h-48 mx-auto rounded-full font-bold text-2xl transition-all duration-300 shadow-2xl ${emergencyActive ? 'bg-[#990000] scale-95 shadow-inner' : 'bg-[#cc0000] hover:bg-[#b30000] hover:scale-105 active:scale-95'} text-white flex flex-col items-center justify-center gap-3`}
          >
            <Bell className="w-16 h-16" />
            <span>SOS</span>
          </button>
          {emergencyActive && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-[#cc0000] rounded-r-xl animate-pulse">
              <p className="text-[#cc0000] font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                🚨 Alerta de emergência enviado!
              </p>
              <p className="text-gray-600 ml-7">Contatos de emergência foram notificados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Arduino Widget ─────────────────────────────────────────────────────── */}
      <div className={`bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border-l-4 ${cores.border}`}>
        {/* título + status online */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <Radio className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Sensor Arduino</h3>
              <p className="text-xs text-gray-400">
                {lastArduinoUpdate
                  ? `Atualizado às ${lastArduinoUpdate.toLocaleTimeString('pt-BR')}`
                  : 'Aguardando dados...'}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${arduinoOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {arduinoOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {arduinoOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {arduino ? (
          <>
            {/* Estado badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${cores.badge}`}>
                <span className={`w-2 h-2 rounded-full ${estadoAtual === 'CRITICO' ? 'bg-red-500 animate-ping' : estadoAtual === 'ALERTA' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                {estadoAtual}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bateria */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">Bateria</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">{arduino.bateria}%</p>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${bateriaBarCor(arduino.bateria)}`}
                    style={{ width: `${arduino.bateria}%` }}
                  />
                </div>
              </div>

              {/* Localização */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">Localização</span>
                </div>
                {arduino.latitude && arduino.longitude ? (
                  <>
                    <p className="text-sm font-bold text-gray-900">Lat: {Number(arduino.latitude).toFixed(6)}</p>
                    <p className="text-sm font-bold text-gray-900">Lng: {Number(arduino.longitude).toFixed(6)}</p>
                    <a
                      href={`https://maps.google.com/?q=${arduino.latitude},${arduino.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                    >
                      Ver no mapa →
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Sem sinal GPS</p>
                )}
              </div>

              {/* Queda */}
              <div className={`rounded-xl p-4 ${arduino.queda ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`w-4 h-4 ${arduino.queda ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-xs text-gray-500 font-medium">Queda Detectada</span>
                </div>
                <p className={`text-2xl font-bold ${arduino.queda ? 'text-red-600' : 'text-gray-400'}`}>
                  {arduino.queda ? 'SIM ⚠️' : 'Não'}
                </p>
                {arduino.queda && (
                  <p className="text-xs text-red-500 mt-1">Verificar imediatamente!</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Radio className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhum dado recebido ainda</p>
            <p className="text-sm mt-1">Verifique se o Arduino e o leitor_arduino.py estão rodando</p>
          </div>
        )}
      </div>

      {/* Medication Alarm */}
      <MedicationAlarm
        isOpen={showMedicationAlarm}
        onClose={async () => {
          setShowMedicationAlarm(false);
          await registrarAlertaAtrasoOuCancelamento('ignorado ou fechado pelo usuário no aviso rápido');
          if ((window as any).__medMissTimeout) { clearTimeout((window as any).__medMissTimeout); (window as any).__medMissTimeout = null; }
        }}
        medication={nextMedication}
        onConfirm={handleConfirmMedication}
        onSnooze={handleSnoozeMedication}
      />

      <NextMedicationWidget
        nextMedication={nextMedication}
        onTimerComplete={async () => {
          setShowMedicationAlarm(true);
          await registrarAlertaAtrasoOuCancelamento('com o tempo esgotado (horário atingido)');
        }}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Location */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Última Localização</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Endereço</p>
              <p className="font-medium text-gray-900">{lastLocation?.endereco ?? 'Nenhum local registrado'}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {lastLocation
                  ? new Date(lastLocation.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : 'Sem atualização'}
              </span>
            </div>
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Alertas Recentes</h3>
          </div>
          <div className="space-y-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#ff914d]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-[#ff914d]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{alert.titulo}</p>
                      <p className="text-sm text-gray-600">{alert.descricao ?? alert.tipo}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.dependente?.nome ?? 'Anônimo'}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-500">Nenhum alerta recente disponível.</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Atalhos Rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/location" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center">
            <MapPin className="w-8 h-8 text-[#cc0000] mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Ver Mapa</span>
          </Link>
          <Link to="/alerts" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center">
            <Bell className="w-8 h-8 text-[#cc0000] mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Alertas</span>
          </Link>
          <Link to="/dependents" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center">
            <Activity className="w-8 h-8 text-[#cc0000] mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Meus Dependentes</span>
          </Link>
          <button
            onClick={() => setShowMedicationAlarm(true)}
            className="p-4 bg-[#ff914d] hover:bg-[#e68245] rounded-lg transition-colors text-center"
          >
            <Clock className="w-8 h-8 text-white mx-auto mb-2" />
            <span className="text-sm font-medium text-white">Testar Alarme</span>
          </button>
        </div>
      </div>

      {/* ── MODAL DE EMERGÊNCIA EM TEMPO REAL ── */}
      {realtimeAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border-4 border-red-600 shadow-2xl text-center space-y-6 animate-bounce">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-14 h-14 text-red-600" />
            </div>
            
            <div>
              <h2 className="text-3xl font-extrabold text-red-600 mb-2">
                🚨 ALERTA CRÍTICO!
              </h2>
              <p className="text-xl text-gray-700 font-medium">
                O dispositivo do dependente detectou um evento de:
              </p>
              <p className="text-4xl font-black text-gray-900 mt-4 bg-red-50 py-4 rounded-2xl border border-red-200 tracking-wider">
                {realtimeAlert.tipo}
              </p>
            </div>

            <p className="text-gray-500 text-sm mt-4">
              Verifique o usuário imediatamente e tome as providências de socorro necessárias.
            </p>

            <button
              onClick={() => setRealtimeAlert(null)}
              className="w-full py-4 mt-6 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg active:scale-95"
            >
              Estou Ciente / Fechar Alerta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}