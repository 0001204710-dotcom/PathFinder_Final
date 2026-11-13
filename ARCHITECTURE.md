# Arquitetura do PathFinder

Este documento descreve a arquitetura implementada no repositório, seus principais fluxos e os limites atuais entre frontend, backend, banco de dados e integração com Arduino.

## Visão geral

O PathFinder é uma aplicação web para acompanhamento de dependentes, informações médicas, localização, alertas e dispositivos de monitoramento. O sistema é dividido em:

- **Frontend:** React 18, TypeScript, Vite, React Router e Tailwind CSS.
- **Backend:** Node.js, TypeScript e Express.
- **Persistência:** MySQL acessado pelo Prisma ORM.
- **Integração IoT:** script Python que lê dados seriais do Arduino e os envia ao backend HTTP.
- **Autenticação:** JWT armazenado no `localStorage` do navegador e enviado automaticamente no cabeçalho `Authorization`.

```mermaid
flowchart LR
    U[Usuário no navegador] --> FE[Frontend React/Vite]
    FE -->|/api + Bearer JWT| API[Backend Express :4000]
    API --> AUTH[Middleware JWT e autorização admin]
    AUTH --> ORM[Prisma Client]
    ORM --> DB[(MySQL)]

    AR[Arduino] -->|Serial CSV| PY[arduino/leitor_arduino.py]
    PY -->|POST /arduino/dados| API
    FE -->|GET /arduino/ultima\nPOST /arduino/disparar-sos| API
    API -->|resposta disparar_web| PY
    PY -->|Serial S| AR
```

## Estrutura de diretórios

```text
pathFinder-main/
├── src/                         # Aplicação React
│   ├── main.tsx                 # Bootstrap, estilos e injeção do JWT
│   └── app/
│       ├── App.tsx              # RouterProvider
│       ├── routes.tsx           # Rotas públicas, usuário e admin
│       ├── components/          # Layouts e componentes reutilizáveis
│       └── pages/               # Telas por fluxo de negócio
├── server/
│   ├── src/index.ts             # Express, autenticação e endpoints HTTP
│   ├── src/arduino.routes.ts    # Endpoints de telemetria Arduino
│   ├── src/prismaClient.ts      # Instância compartilhada do Prisma
│   └── prisma/schema.prisma     # Modelo MySQL
├── arduino/leitor_arduino.py    # Ponte Serial -> HTTP -> Serial
├── vite.config.ts               # Dev server e proxy /api
└── package.json                 # Scripts e dependências do frontend
```

## Frontend

### Inicialização

`src/main.tsx` cria a aplicação React, importa os estilos globais e substitui `window.fetch` por um wrapper que lê `authToken` do `localStorage`. Quando existe token, o wrapper adiciona:

```http
Authorization: Bearer <token>
```

`src/app/App.tsx` entrega o controle ao `RouterProvider`. As rotas são declaradas em `src/app/routes.tsx`:

- públicas: `/login`, `/signup`, `/admin/login`, `/privacidade` e `/termos`;
- usuário: `/`, `/location`, `/alerts`, `/medical`, `/dependents` e `/settings`;
- administração: `/admin`, `/admin/users`, `/admin/alerts`, `/admin/reports` e `/admin/settings`.

Os layouts organizam a navegação e as páginas fazem as chamadas HTTP diretamente com `fetch`. Não existe, no estado atual, uma camada frontend separada de serviços ou um cliente HTTP dedicado.

### Comunicação durante o desenvolvimento

O Vite executa o frontend e encaminha somente o prefixo `/api` para `http://localhost:4000`. Algumas telas usam caminhos relativos, enquanto outras usam explicitamente `http://localhost:4000`; ambos os formatos aparecem no código atual.

## Backend

O processo é inicializado por `server/src/index.ts`:

1. carrega variáveis de ambiente com `dotenv`;
2. cria o Express;
3. habilita CORS e parsing de JSON;
4. registra o middleware de autenticação para `/api`;
5. registra as rotas Arduino em `/arduino`;
6. executa as operações de domínio usando Prisma;
7. escuta na porta definida por `PORT`, com fallback para `4000`.

### Autenticação e autorização

O middleware aplicado em `/api` deixa públicas apenas:

- `GET /api/health`;
- `POST /api/login`;
- `POST /api/admin/login`;
- `POST /api/usuarios`.

As demais rotas `/api` exigem um JWT válido. O token contém `sub`, `email` e `isAdmin`, com validade de oito horas. A autorização de dependentes restringe usuários comuns a registros cujo `usuario_id` corresponde ao usuário autenticado. Rotas administrativas usam `requireAdmin` e exigem `isAdmin: true`.

### Organização atual do backend

O backend é funcional, mas monolítico: autenticação, validações, regras de negócio, chamadas Prisma e respostas HTTP estão concentradas principalmente em `server/src/index.ts`. A integração Arduino foi isolada em `server/src/arduino.routes.ts`.

## API HTTP

### Saúde e autenticação

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET | `/api/health` | Verifica se o servidor está ativo |
| POST | `/api/login` | Autentica usuário e retorna JWT |
| POST | `/api/admin/login` | Autentica administrador e retorna JWT administrativo |
| POST | `/api/usuarios` | Cria usuário |

### Dependentes e informações médicas

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET | `/api/dependentes` | Lista dependentes acessíveis |
| POST | `/api/dependentes` | Cria dependente e, opcionalmente, dispositivo |
| GET | `/api/dependentes/:id` | Consulta dependente com relações |
| PUT | `/api/dependentes/:id` | Atualiza dependente |
| DELETE | `/api/dependentes/:id` | Remove dependente |
| GET | `/api/dependentes/:id/ficha-medica` | Retorna ficha médica resumida |
| GET/POST | `/api/dependentes/:id/medicamentos` | Lista ou cria medicamento |
| PUT/DELETE | `/api/medicamentos/:id` | Atualiza ou remove medicamento |
| POST | `/api/medicamentos/:id/snooze` | Adia um alerta de medicamento |
| GET/POST | `/api/dependentes/:id/contatos-emergencia` | Lista ou cria contato |
| DELETE | `/api/contatos-emergencia/:id` | Remove contato |

### Monitoramento e administração

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET | `/api/dashboard` | Agrega dados para o dashboard |
| GET/POST | `/api/alertas` | Lista ou cria alertas |
| GET | `/api/localizacoes` | Consulta localizações |
| GET | `/api/dispositivos` | Consulta dispositivos |
| GET/PUT/DELETE | `/api/usuarios...` | Administração de usuários |
| GET/POST | `/api/config` | Consulta ou altera configurações administrativas |
| POST | `/api/config/test-email` | Testa conexão SMTP |

### Arduino

As rotas Arduino usam o prefixo `/arduino`, e não `/api`:

| Método | Rota | Finalidade |
| --- | --- | --- |
| POST | `/arduino/dados` | Persiste uma leitura e retorna a fila do SOS web |
| GET | `/arduino/leituras` | Lista as últimas 50 leituras |
| GET | `/arduino/alertas` | Lista leituras com SOS ou queda |
| GET | `/arduino/ultima` | Retorna a leitura mais recente |
| POST | `/arduino/disparar-sos` | Enfileira comando para o buzzer do Arduino |

## Modelo de dados

O schema Prisma usa MySQL. As entidades principais são:

- `usuarios`: conta, credenciais e dados básicos do usuário;
- `dependentes`: pessoa monitorada e seus dados médicos;
- `medicamentos`: medicamentos associados a um dependente;
- `contatos_emergencia`: contatos associados a um dependente;
- `alertas`: eventos e notificações do dependente;
- `localizacoes`: histórico de posições e localização atual;
- `dispositivos`: dispositivo de monitoramento, bateria e status GPS;
- `LeituraArduino`: telemetria bruta do sensor, mapeada para a tabela `leitura_arduino`.

As relações usam o dependente como centro do domínio. A exclusão de um dependente remove em cascata medicamentos, alertas, localizações, dispositivos e contatos relacionados. A relação usuário-dependente usa `SetNull` na exclusão do usuário.

## Fluxo Arduino

1. O Arduino envia uma linha CSV pela porta serial.
2. `leitor_arduino.py` valida e converte a linha para JSON.
3. O script faz `POST http://localhost:4000/arduino/dados`.
4. O backend grava a leitura em `leitura_arduino`.
5. Se o dashboard tiver chamado `/arduino/disparar-sos`, a resposta inclui `disparar_web: true`.
6. O script envia o byte `S` de volta pela serial para acionar o buzzer.

O sinal de SOS web é mantido em uma variável global em memória. Portanto, ele é temporário, não é persistido e não é adequado para múltiplas instâncias do backend sem uma fila ou armazenamento compartilhado.

## Execução local

### Frontend

Na raiz do frontend:

```bash
npm install
npm run dev
```

O proxy espera o backend em `http://localhost:4000`.

### Backend

Configure `server/.env` com pelo menos:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/pathfinder"
JWT_SECRET="uma-chave-secreta"
PORT=4000
```

Depois execute:

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Para produção, use `npm run build` e depois `npm start` dentro de `server`.

### Leitor Arduino

Instale `pyserial` e `requests`, ajuste `PORTA` e execute:

```bash
python arduino/leitor_arduino.py
```

## Limites e pontos de atenção

- As rotas `/arduino` não passam pelo middleware JWT de `/api`; devem ser protegidas antes de uma implantação exposta à rede.
- As configurações administrativas ficam em memória e são perdidas ao reiniciar o processo.
- O segredo SMTP recebido pela configuração não deve ser tratado como persistência segura; o estado atual mantém configuração em memória.
- O backend não apresenta uma camada formal de serviços, validação por schema ou tratamento centralizado de erros.
- O frontend possui URLs de API relativas e absolutas; a configuração deve ser padronizada antes de ambientes além do desenvolvimento local.
- O script Arduino depende de uma única porta serial e de um único backend disponível.