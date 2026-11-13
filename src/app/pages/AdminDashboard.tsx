import { apiFetch } from '../api';
import { BarChart3, Users, Activity, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AlertStats {
  total: number;
  today: number;
  active: number;
  resolved: number;
  byDate: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [dependentes, setDependentes] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    total: 0,
    today: 0,
    active: 0,
    resolved: 0,
    byDate: [],
  });
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      Promise.all([
        apiFetch('http://localhost:4000/api/usuarios').then((r) => r.json()),
        apiFetch('http://localhost:4000/api/dispositivos').then((r) => r.json()),
        apiFetch('http://localhost:4000/api/dependentes').then((r) => r.json()),
        apiFetch('http://localhost:4000/api/alertas').then((r) => r.json())
      ])
        .then(([u, d, dep, a]) => {
          setUsuarios(u || []);
          setDispositivos(d || []);
          setDependentes(dep || []);
          setAlertas(a || []);

          // Calcular estatísticas de alertas
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const alertsByDate: { [key: string]: number } = {};
          let alertsToday = 0;
          let activeAlerts = 0;
          let resolvedAlerts = 0;

          (a || []).forEach((alerta: any) => {
            if (alerta.status === 'ativo' || alerta.status === 'pendente') activeAlerts++;
            if (alerta.status === 'resolvido') resolvedAlerts++;

            const alertDate = new Date(alerta.data_hora);
            if (alertDate >= today) alertsToday++;

            const dateStr = alertDate.toLocaleDateString('pt-BR');
            alertsByDate[dateStr] = (alertsByDate[dateStr] || 0) + 1;
          });

          setAlertStats({
            total: (a || []).length,
            today: alertsToday,
            active: activeAlerts,
            resolved: resolvedAlerts,
            byDate: Object.entries(alertsByDate)
              .map(([date, count]) => ({ date, count: count as number }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(-7),
          });
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const dispositivosOnline = dispositivos.filter((d: any) => d.gps_online === true).length;
  const taxaResposta = alertStats.total > 0 ? Math.round((alertStats.resolved / alertStats.total) * 100) : 0;

  const stats = [
    { label: 'Usuários', value: usuarios.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Dispositivos Online', value: `${dispositivosOnline}/${dependentes.length}`, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Alertas Ativos', value: alertStats.active, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Taxa de Resolução', value: `${taxaResposta}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const maxAlertCount = alertStats.byDate.length > 0 ? Math.max(...alertStats.byDate.map((d) => d.count)) : 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel Administrativo</h1>
        <p className="text-gray-600 text-lg">Monitoramento em tempo real do sistema PathFinder</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Alert Trends Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Tendência de Alertas</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('7d')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === '7d' ? 'bg-[#D32F2F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimePeriod('30d')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === '30d' ? 'bg-[#D32F2F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setTimePeriod('90d')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === '90d' ? 'bg-[#D32F2F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90D
            </button>
          </div>
        </div>

        <div className="h-64 flex items-flex-end gap-2 px-4">
          {alertStats.byDate.length > 0 ? (
            alertStats.byDate.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-[#D32F2F] to-[#FF8A65] rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(day.count / maxAlertCount) * 200}px`, minHeight: day.count > 0 ? '8px' : '2px' }}
                    title={`${day.date}: ${day.count} alertas`}
                  />
                </div>
                <span className="text-xs text-gray-600 text-center">{day.date.split('/')[0]}/{day.date.split('/')[1]}</span>
              </div>
            ))
          ) : (
            <div className="w-full text-center text-gray-500">Sem dados de alertas</div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Atividade Recente</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(alertas.slice(0, 8) || []).map((activity: any, idx: number) => (
              <div key={activity.id ?? idx} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.prioridade === 'alta' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <span className={`text-sm font-bold ${
                    activity.prioridade === 'alta' ? 'text-red-600' : 'text-yellow-600'
                  }`}>{(activity.dependente?.nome || 'E').charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{activity.dependente?.nome || 'Evento'}</p>
                  <p className="text-sm text-gray-600 truncate">{activity.titulo || activity.descricao || activity.tipo || ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'resolvido' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {activity.status === 'resolvido' ? 'Resolvido' : 'Ativo'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{activity.data_hora ? new Date(activity.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Status do Sistema</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-gray-900">API Backend</p>
                <p className="text-sm text-gray-600">http://localhost:4000</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-gray-900">Banco de Dados</p>
                <p className="text-sm text-gray-600">MySQL 8.0.30</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-gray-900">Dispositivos</p>
                <p className="text-sm text-gray-600">{dispositivosOnline} de {dependentes.length} online</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${dispositivosOnline > 0 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                <span className={`text-sm font-medium ${dispositivosOnline > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {dispositivosOnline > 0 ? 'Operacional' : 'Verificar'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-blue-200">
              <div>
                <p className="font-medium text-gray-900">Resumo</p>
                <p className="text-sm text-gray-600">
                  {usuarios.length} usuários, {alertStats.active} alertas ativos
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
          <p className="text-gray-600 text-sm mb-2">Alertas de Hoje</p>
          <p className="text-4xl font-bold text-red-600">{loading ? '—' : alertStats.today}</p>
          <p className="text-xs text-gray-600 mt-2">Últimas 24 horas</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
          <p className="text-gray-600 text-sm mb-2">Alertas Ativos</p>
          <p className="text-4xl font-bold text-orange-600">{loading ? '—' : alertStats.active}</p>
          <p className="text-xs text-gray-600 mt-2">Aguardando resolução</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
          <p className="text-gray-600 text-sm mb-2">Taxa de Resolução</p>
          <p className="text-4xl font-bold text-green-600">{loading ? '—' : taxaResposta}%</p>
          <p className="text-xs text-gray-600 mt-2">{alertStats.resolved} de {alertStats.total} resolvidos</p>
        </div>
      </div>
    </div>
  );
}
