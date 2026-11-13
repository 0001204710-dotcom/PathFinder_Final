import { apiFetch } from '../api';
import { Shield, Users, Activity, AlertTriangle, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Admin() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [dependentes, setDependentes] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      Promise.all([
        apiFetch('/api/usuarios').then((r) => r.json()),
        apiFetch('/api/dispositivos').then((r) => r.json()),
        apiFetch('/api/dependentes').then((r) => r.json()),
        apiFetch('/api/alertas').then((r) => r.json())
      ])
        .then(([u, d, dep, a]) => {
          setUsuarios(u || []);
          setDispositivos(d || []);
          setDependentes(dep || []);
          setAlertas(a || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const resolvidos = alertas.filter((a: any) => a.status === 'resolvido').length;
  const taxaResposta = alertas.length > 0 ? Math.round((resolvidos / alertas.length) * 100) : 0;
  
  // Dispositivos online = dispositivos com GPS online baseado em dependentes
  const dispositivosOnline = dispositivos.filter((d: any) => d.gps_online === true).length;

  const systemStats = [
    { label: 'Usuários Ativos', value: usuarios.length, change: '+0%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Dispositivos Online', value: dispositivosOnline, change: `/${dependentes.length}`, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Alertas Hoje', value: alertas.length, change: '+0%', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Taxa de Resposta', value: `${taxaResposta}%`, change: '+0%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const recentUsers = usuarios.slice(0, 4).map((u: any) => ({
    name: u.nome,
    status: 'online',
    device: (u.dependentes && u.dependentes[0]) ? `DEP-${u.dependentes[0].id}` : '-',
    lastSeen: '-',
    alerts: 0,
  }));

  const deviceStatus = dispositivos.slice(0, 6).map((d: any) => ({
    id: d.id,
    user: d.dependente?.nome || '-',
    battery: d.bateria ?? 0,
    gps: d.gps_online ? 'online' : 'offline',
    connection: d.status || 'unknown',
    status: d.gps_online ? 'active' : 'inactive',
  }));

  const criticalAlerts = alertas.slice(0, 3).map((a: any) => ({
    user: a.dependente?.nome || '-',
    type: a.titulo || a.tipo || 'Alerta',
    severity: a.prioridade || 'high',
    time: a.data_hora ? new Date(a.data_hora).toLocaleString() : '-',
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel Administrativo</h1>
          <p className="text-gray-600 text-lg">Monitoramento e gerenciamento do sistema PathFinder</p>
        </div>
        <div className="w-14 h-14 bg-[#D32F2F] rounded-xl flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className={`text-sm font-medium text-green-600`}>{stat.change}</span>
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Critical Alerts */}
      <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas Críticos</h2>
        </div>

        <div className="space-y-3">
          {criticalAlerts.map((alert, index) => (
            <div key={index} className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{alert.user}</p>
                  <p className="text-gray-600">{alert.type}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {alert.severity === 'high' ? 'Alta' : 'Média'}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">{alert.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Usuários Ativos</h3>
            <Users className="w-6 h-6 text-gray-400" />
          </div>

          <div className="space-y-3">
            {recentUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF8A65] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.device}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-600">{user.lastSeen}</span>
                  </div>
                  {user.alerts > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">{user.alerts} alertas</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors">
            Ver Todos os Usuários
          </button>
        </div>

        {/* Device Status */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Status dos Dispositivos</h3>
            <Activity className="w-6 h-6 text-gray-400" />
          </div>

          <div className="space-y-3">
            {deviceStatus.map((device, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{device.id}</p>
                    <p className="text-sm text-gray-600">{device.user}</p>
                  </div>
                  {device.status === 'active' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Bateria</p>
                    <p className={`font-medium ${device.battery > 50 ? 'text-green-600' : device.battery > 20 ? 'text-orange-600' : 'text-red-600'}`}>{device.battery}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">GPS</p>
                    <p className={`font-medium ${device.gps === 'online' ? 'text-green-600' : 'text-red-600'}`}>{device.gps}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sinal</p>
                    <p className={`font-medium ${device.connection === 'strong' ? 'text-green-600' : device.connection === 'medium' ? 'text-orange-600' : 'text-red-600'}`}>{device.connection}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors">
            Gerenciar Dispositivos
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Status Geral do Sistema</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900">Servidor</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">Online</p>
            <p className="text-sm text-gray-600">99.9% uptime</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900">Banco de Dados</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">Operacional</p>
            <p className="text-sm text-gray-600">Backup em 2h</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900">API</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">Ativo</p>
            <p className="text-sm text-gray-600">120ms latência</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-lg transition-colors text-center">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Adicionar Usuário</span>
          </button>
          <button className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center">
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Monitorar Sistema</span>
          </button>
          <button className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Ver Relatórios</span>
          </button>
          <button className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center">
            <Shield className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Configurações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
