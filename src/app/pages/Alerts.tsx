import { apiFetch } from '../api';
import { AlertTriangle, Bell, Zap, Heart, MapPin, Clock, CheckCircle, XCircle, Radio, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

interface AlertsContext {
  currentDependent: { id: number; name?: string; nome?: string } | null;
}

interface AlertItem {
  id: number;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  data_hora: string;
  status: string;
  prioridade: string;
  dependente?: { nome: string } | null;
}

interface RecurringAlertSchedule {
  id: number;
  tipo: string;
  titulo: string;
  prioridade: string;
  dias_semana: string;
  horario: string;
  data_inicio: string;
  proximo_disparo: string;
  dependente?: { nome: string } | null;
}

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

const getAlertIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'bateria': return Zap;
    case 'saúde':
    case 'saude': return Heart;
    case 'localização':
    case 'localizacao': return MapPin;
    case 'obstáculo':
    case 'obstaculo':
    case 'queda': return AlertTriangle;
    default: return Bell;
  }
};

const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime);
  return {
    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: BRASILIA_TIME_ZONE }),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BRASILIA_TIME_ZONE }),
  };
};

const getBrasiliaDate = (date: Date) => date.toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: BRASILIA_TIME_ZONE,
});

const getBrasiliaDateTimeInput = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BRASILIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

const getNextBrasiliaDateTimeInput = () => getBrasiliaDateTimeInput(new Date(Date.now() + 5 * 60 * 1000));

const parseBrasiliaDateTimeInput = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const utcTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BRASILIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcTime));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  const brasiliaAsUtc = Date.UTC(
    Number(part('year')),
    Number(part('month')) - 1,
    Number(part('day')),
    Number(part('hour')),
    Number(part('minute')),
  );
  const result = new Date(utcTime - (brasiliaAsUtc - utcTime));

  if (getBrasiliaDateTimeInput(result) !== value) return null;
  return result;
};

export default function Alerts() {
  const { currentDependent } = useOutletContext<AlertsContext>();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'resolvido'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [newAlertType, setNewAlertType] = useState('medicamento');
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDescription, setNewAlertDescription] = useState('');
  const [newAlertPriority, setNewAlertPriority] = useState('media');
  const [scheduleMode, setScheduleMode] = useState<'weekly' | 'once'>('weekly');
  const [newAlertDateTime, setNewAlertDateTime] = useState(getNextBrasiliaDateTimeInput);
  const [weeklyStartDate, setWeeklyStartDate] = useState(() => getNextBrasiliaDateTimeInput().slice(0, 10));
  const [weeklyTime, setWeeklyTime] = useState(() => getNextBrasiliaDateTimeInput().slice(11, 16));
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringAlertSchedule[]>([]);
  const [creatingAlert, setCreatingAlert] = useState(false);

  // Arduino state
  const [arduino, setArduino] = useState<ArduinoLeitura | null>(null);
  const [arduinoOnline, setArduinoOnline] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  async function loadAlerts() {
    try {
      const response = await apiFetch(`${apiUrl}/api/alertas`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: AlertItem[] = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecurringSchedules() {
    try {
      const response = await apiFetch(`${apiUrl}/api/alertas/recorrentes`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: RecurringAlertSchedule[] = await response.json();
      setRecurringSchedules(data);
    } catch (error) {
      console.error('Erro ao carregar programações de alertas:', error);
    }
  }

  // Cria alerta no banco quando Arduino detecta queda ou SOS
  async function criarAlertaArduino(tipo: 'queda' | 'sos') {
    try {
      await apiFetch(`${apiUrl}/api/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipo === 'queda' ? 'queda' : 'sos',
          titulo: tipo === 'queda' ? '⚠️ Queda Detectada pelo Sensor' : '🚨 SOS Acionado pelo Dispositivo',
          descricao: tipo === 'queda'
            ? 'O sensor Arduino detectou uma possível queda. Verifique imediatamente.'
            : 'O botão SOS foi pressionado no dispositivo. Emergência ativada.',
          prioridade: 'alta',
          status: 'ativo',
        }),
      });
      await loadAlerts();
    } catch (err) {
      console.error('Erro ao criar alerta do Arduino:', err);
    }
  }

  useEffect(() => {
    loadAlerts();
    loadRecurringSchedules();
    const id = setInterval(loadAlerts, 2000);
    return () => clearInterval(id);
  }, [apiUrl]);

  async function handleCancelRecurringSchedule(scheduleId: number) {
    try {
      const response = await apiFetch(`${apiUrl}/api/alertas/recorrentes/${scheduleId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }
      setRecurringSchedules((previous) => previous.filter((schedule) => schedule.id !== scheduleId));
    } catch (error) {
      console.error('Erro ao cancelar programação de alerta:', error);
      alert(error instanceof Error ? error.message : 'Erro ao cancelar programação.');
    }
  }

  async function handleCreateAlert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentDependent) {
      alert('Selecione um dependente antes de criar um alerta.');
      return;
    }

    const alertDate = scheduleMode === 'once' ? parseBrasiliaDateTimeInput(newAlertDateTime) : null;
    if (scheduleMode === 'once' && (!alertDate || alertDate.getTime() <= Date.now())) {
      alert('Selecione uma data e hora futuras para o alerta.');
      return;
    }
    if (scheduleMode === 'weekly' && weeklyDays.length === 0) {
      alert('Selecione pelo menos um dia da semana para a programação.');
      return;
    }
    if (scheduleMode === 'weekly' && weeklyStartDate < getBrasiliaDate(new Date()).split('/').reverse().join('-')) {
      alert('A data de início da programação não pode estar no passado.');
      return;
    }

    try {
      setCreatingAlert(true);
      const response = await apiFetch(`${apiUrl}/api/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dependente_id: currentDependent.id,
          tipo: newAlertType,
          titulo: newAlertTitle.trim(),
          descricao: newAlertDescription.trim() || null,
          prioridade: newAlertPriority,
          status: 'ativo',
          ...(scheduleMode === 'once' && alertDate ? { data_hora: alertDate.toISOString() } : {}),
          ...(scheduleMode === 'weekly' ? {
            recorrencia: {
              dias_semana: weeklyDays,
              data_inicio: weeklyStartDate,
              horario: weeklyTime,
            },
          } : {}),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const created = await response.json();
      if (scheduleMode === 'weekly') {
        setRecurringSchedules((previous) => [created, ...previous]);
      } else {
        const dependentName = currentDependent.name ?? currentDependent.nome ?? 'Dependente';
        setAlerts((previous) => [{ ...created, dependente: { nome: dependentName } }, ...previous]);
        setVisibleCount((count) => Math.max(count, 10));
        setStatusFilter('all');
        setPriorityFilter('all');
      }
      setNewAlertTitle('');
      setNewAlertDescription('');
      setNewAlertType('medicamento');
      setScheduleMode('weekly');
      setNewAlertDateTime(getNextBrasiliaDateTimeInput());
      setWeeklyStartDate(getNextBrasiliaDateTimeInput().slice(0, 10));
      setWeeklyTime(getNextBrasiliaDateTimeInput().slice(11, 16));
      setWeeklyDays([]);
      setNewAlertPriority('media');
      setShowCreateAlert(false);
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      alert(error instanceof Error ? error.message : 'Erro ao criar alerta.');
    } finally {
      setCreatingAlert(false);
    }
  }

  // Poll Arduino a cada 2s e gera alertas automáticos
  useEffect(() => {
    let prevQueda = false;
    let prevSos = false;

    async function pollArduino() {
      try {
        const res = await apiFetch(`${apiUrl}/arduino/ultima`);
        if (!res.ok) { setArduinoOnline(false); return; }
        const data: ArduinoLeitura = await res.json();
        setArduino(data);
        const ts = new Date(data.timestamp).getTime();
        setArduinoOnline(Date.now() - ts < 10000);

        const quedaAtual = Boolean(data.queda);
        const sosAtual = Boolean(data.sos);

        // Dispara alerta só na transição false → true (borda de subida)
        if (quedaAtual && !prevQueda) await criarAlertaArduino('queda');
        if (sosAtual && !prevSos) await criarAlertaArduino('sos');

        prevQueda = quedaAtual;
        prevSos = sosAtual;
      } catch {
        setArduinoOnline(false);
      }
    }

    pollArduino();
    const id = setInterval(pollArduino, 2000);
    return () => clearInterval(id);
  }, [apiUrl]);

  const stats = [
    {
      label: 'Total Hoje',
      value: alerts.filter((a) => getBrasiliaDate(new Date(a.data_hora)) === getBrasiliaDate(new Date())).length.toString(),
      color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      label: 'Ativos',
      value: alerts.filter((a) => a.status === 'ativo').length.toString(),
      color: 'text-[#cc0000]', bg: 'bg-red-50',
    },
    {
      label: 'Resolvidos',
      value: alerts.filter((a) => a.status === 'resolvido').length.toString(),
      color: 'text-green-600', bg: 'bg-green-50',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': case 'alta': return 'border-l-red-600 bg-red-50/30';
      case 'medium': case 'média': case 'media': return 'border-l-orange-500 bg-orange-50/30';
      case 'low': case 'baixa': return 'border-l-yellow-500 bg-yellow-50/30';
      default: return 'border-l-gray-500 bg-gray-50/30';
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': case 'alta':
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-semibold">Alta</span>;
      case 'medium': case 'média': case 'media':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-xs font-semibold">Média</span>;
      case 'low': case 'baixa':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-lg text-xs font-semibold">Baixa</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold">{priority}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ativo') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
          <XCircle className="w-4 h-4 animate-pulse" /> Ativo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
        <CheckCircle className="w-4 h-4" /> Resolvido
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando alertas...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Alertas</h1>
            <p className="text-gray-600 text-lg">Histórico e notificações do sistema</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextDateTime = getNextBrasiliaDateTimeInput();
              setNewAlertDateTime(nextDateTime);
              setWeeklyStartDate(nextDateTime.slice(0, 10));
              setWeeklyTime(nextDateTime.slice(11, 16));
              setWeeklyDays([]);
              setShowCreateAlert(true);
            }}
            disabled={!currentDependent}
            className="inline-flex items-center gap-2 rounded-lg bg-[#cc0000] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Novo alerta
          </button>
        </div>
      </div>

      {showCreateAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateAlert} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Criar novo alerta</h2>
              <p className="mt-1 text-sm text-gray-600">
                Para {currentDependent?.name ?? currentDependent?.nome} · horário de Brasília (BRT)
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de alerta
              <select
                value={newAlertType}
                onChange={(event) => setNewAlertType(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                <option value="medicamento">Medicamento</option>
                <option value="lembrete">Lembrete</option>
                <option value="saude">Saúde</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Frequência
              <select
                value={scheduleMode}
                onChange={(event) => setScheduleMode(event.target.value as 'weekly' | 'once')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                <option value="weekly">Repetir semanalmente</option>
                <option value="once">Uma vez</option>
              </select>
            </label>
            {scheduleMode === 'weekly' ? (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Começar a partir de
                  <input
                    type="date"
                    required
                    min={getBrasiliaDate(new Date()).split('/').reverse().join('-')}
                    value={weeklyStartDate}
                    onChange={(event) => setWeeklyStartDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                </label>
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700">Dias da semana</legend>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {[
                      { value: 1, label: 'Seg' },
                      { value: 2, label: 'Ter' },
                      { value: 3, label: 'Qua' },
                      { value: 4, label: 'Qui' },
                      { value: 5, label: 'Sex' },
                      { value: 6, label: 'Sáb' },
                      { value: 0, label: 'Dom' },
                    ].map((day) => {
                      const selected = weeklyDays.includes(day.value);
                      return (
                        <label key={day.value} className={`cursor-pointer rounded-lg border px-1 py-2 text-center text-xs font-medium ${
                          selected ? 'border-[#cc0000] bg-red-50 text-[#cc0000]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setWeeklyDays((previous) => selected
                              ? previous.filter((value) => value !== day.value)
                              : [...previous, day.value])}
                            className="sr-only"
                          />
                          {day.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="block text-sm font-medium text-gray-700">
                  Horário aproximado
                  <input
                    type="time"
                    required
                    value={weeklyTime}
                    onChange={(event) => setWeeklyTime(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">Horário de Brasília (BRT)</span>
                </label>
              </>
            ) : (
              <label className="block text-sm font-medium text-gray-700">
                Data e hora do alerta
                <input
                  type="datetime-local"
                  required
                  min={getBrasiliaDateTimeInput(new Date())}
                  value={newAlertDateTime}
                  onChange={(event) => setNewAlertDateTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">Horário de Brasília (BRT)</span>
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Título
              <input
                required
                maxLength={150}
                value={newAlertTitle}
                onChange={(event) => setNewAlertTitle(event.target.value)}
                placeholder="Ex.: Tomar medicamento"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Descrição
              <textarea
                maxLength={2000}
                value={newAlertDescription}
                onChange={(event) => setNewAlertDescription(event.target.value)}
                placeholder="Detalhes do alerta (opcional)"
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Prioridade
              <select
                value={newAlertPriority}
                onChange={(event) => setNewAlertPriority(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </label>
            <p className="text-xs text-gray-500">
              Criado em {new Date().toLocaleString('pt-BR', { timeZone: BRASILIA_TIME_ZONE })}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateAlert(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingAlert || !currentDependent}
                className="rounded-lg bg-[#cc0000] px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {creatingAlert ? 'Criando...' : 'Criar alerta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Arduino ao vivo */}
      {arduino && (
        <div className={`rounded-xl p-4 border-l-4 flex items-center gap-4 ${
          arduino.sos || arduino.queda
            ? 'bg-red-50 border-red-500'
            : arduinoOnline ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300'
        }`}>
          <Radio className={`w-6 h-6 flex-shrink-0 ${arduino.sos || arduino.queda ? 'text-red-500 animate-pulse' : arduinoOnline ? 'text-green-500' : 'text-gray-400'}`} />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              Sensor Arduino — <span className={arduinoOnline ? 'text-green-600' : 'text-gray-400'}>{arduinoOnline ? 'Online' : 'Offline'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Estado: <strong>{arduino.estado}</strong> &nbsp;|&nbsp; Bateria: <strong>{arduino.bateria}%</strong>
              {arduino.queda ? <span className="ml-2 text-red-600 font-bold">⚠️ QUEDA ATIVA</span> : null}
              {arduino.sos ? <span className="ml-2 text-red-600 font-bold">🚨 SOS ATIVO</span> : null}
            </p>
          </div>
        </div>
      )}

      {recurringSchedules.length > 0 && (
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Programações semanais</h2>
          <div className="divide-y divide-gray-100">
            {recurringSchedules.map((schedule) => {
              const days = schedule.dias_semana.split(',').map(Number);
              const dayNames = [
                { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
                { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' },
                { value: 0, label: 'Dom' },
              ].filter((day) => days.includes(day.value)).map((day) => day.label).join(', ');
              return (
                <div key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">{schedule.titulo} <span className="font-normal text-gray-500">· {schedule.tipo}</span></p>
                    <p className="text-sm text-gray-600">
                      {dayNames} às {schedule.horario} · próximo: {formatDateTime(schedule.proximo_disparo).date} às {formatDateTime(schedule.proximo_disparo).time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelRecurringSchedule(schedule.id)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar programação
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <p className="text-gray-600 mb-2">{stat.label}</p>
            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}
            className={`px-4 py-2 rounded-lg font-medium ${statusFilter === 'all' && priorityFilter === 'all' ? 'bg-[#cc0000] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            Todos ({alerts.length})
          </button>
          <button onClick={() => setStatusFilter('ativo')}
            className={`px-4 py-2 rounded-lg font-medium ${statusFilter === 'ativo' ? 'bg-[#cc0000] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            Ativos ({alerts.filter(a => a.status === 'ativo').length})
          </button>
          <button onClick={() => setStatusFilter('resolvido')}
            className={`px-4 py-2 rounded-lg font-medium ${statusFilter === 'resolvido' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            Resolvidos ({alerts.filter(a => a.status === 'resolvido').length})
          </button>
          <div className="ml-auto flex gap-2">
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${priorityFilter === p ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                {p === 'all' ? 'Todas' : p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {alerts
            .filter((a) => statusFilter === 'all' || a.status === statusFilter)
            .filter((a) => {
              if (priorityFilter === 'all') return true;
              const p = a.prioridade?.toLowerCase();
              if (priorityFilter === 'high') return p === 'high' || p === 'alta';
              if (priorityFilter === 'medium') return p === 'medium' || p === 'media' || p === 'média';
              if (priorityFilter === 'low') return p === 'low' || p === 'baixa';
              return true;
            })
            .slice(0, visibleCount)
            .map((alert) => {
              const Icon = getAlertIcon(alert.tipo);
              const formatted = formatDateTime(alert.data_hora);
              return (
                <div key={alert.id} className={`p-6 border-l-4 ${getPriorityColor(alert.prioridade)} hover:bg-gray-50/60 transition-colors`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100">
                      <Icon className="w-6 h-6 text-[#cc0000]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-gray-900 text-lg">{alert.titulo}</h3>
                            {renderPriorityBadge(alert.prioridade)}
                          </div>
                          <p className="text-gray-600">{alert.descricao ?? alert.tipo}</p>
                          <p className="text-sm text-gray-500 mt-2">Dependente: {alert.dependente?.nome ?? 'Não informado'}</p>
                        </div>
                        {getStatusBadge(alert.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        <span className="flex items-center gap-1.5 text-gray-600 text-sm">
                          <Clock className="w-4 h-4" /> {formatted.date} às {formatted.time}
                        </span>
                        <span className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">{alert.tipo}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setSelectedAlert(alert)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={() => setVisibleCount((c) => c + 10)} disabled={visibleCount >= alerts.length}
            className="w-full py-3 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg font-medium text-gray-700 transition-colors disabled:opacity-50">
            {visibleCount >= alerts.length ? 'Sem mais alertas' : 'Carregar Mais Alertas'}
          </button>
        </div>
      </div>

      {/* Emergency Card */}
      <div className="bg-gradient-to-r from-[#cc0000] to-[#ff914d] rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Precisa de Ajuda Imediata?</h3>
            <p className="text-white/90 mb-4">Em caso de emergência, acione o botão SOS no Dashboard</p>
          </div>
          <Bell className="w-12 h-12 text-white/80" />
        </div>
        <Link to="/" className="inline-block text-center px-6 py-3 bg-white text-[#cc0000] rounded-lg font-bold hover:bg-gray-100 transition-colors">
          Ir para Dashboard
        </Link>
      </div>

      {/* Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedAlert(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-11/12 max-w-2xl p-6 z-10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">Detalhes do Alerta</h3>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-500 hover:text-gray-800">Fechar</button>
            </div>
            <div className="space-y-3">
              <p className="text-lg font-semibold">{selectedAlert.titulo}</p>
              <p className="text-gray-700">{selectedAlert.descricao ?? selectedAlert.tipo}</p>
              <p className="text-sm text-gray-500">Dependente: {selectedAlert.dependente?.nome ?? 'Não informado'}</p>
              <p className="text-sm text-gray-500">Data: {formatDateTime(selectedAlert.data_hora).date} às {formatDateTime(selectedAlert.data_hora).time}</p>
              <div className="flex items-center gap-2 text-sm"><span>Prioridade:</span>{renderPriorityBadge(selectedAlert.prioridade)}</div>
              <p className="text-sm">Status: <strong>{selectedAlert.status}</strong></p>
            </div>
            <div className="mt-6 flex gap-3 justify-end border-t border-gray-100 pt-4">
              {selectedAlert.status !== 'resolvido' && (
                <button
                  onClick={async () => {
                    setAlerts((prev) => prev.map(a => a.id === selectedAlert.id ? { ...a, status: 'resolvido' } : a));
                    setSelectedAlert((s) => s ? { ...s, status: 'resolvido' } : s);
                    try {
                      await apiFetch(`${apiUrl}/api/alertas/${selectedAlert.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'resolvido' }),
                      });
                      setTimeout(() => setSelectedAlert(null), 500);
                    } catch (e) { console.error(e); }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
                  Marcar como Resolvido
                </button>
              )}
              <button onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 transition-colors rounded-lg font-medium">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}