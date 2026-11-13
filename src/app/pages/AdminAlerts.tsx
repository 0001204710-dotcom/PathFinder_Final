import { apiFetch } from '../api';
import { AlertCircle, CheckCircle, Clock, MessageSquare, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Alert {
  id: number;
  titulo: string;
  descricao?: string;
  status: 'ativo' | 'pendente' | 'resolvido';
  prioridade: 'alta' | 'média' | 'baixa';
  data_hora: string;
  usuario_id?: number;
  dispositivo_id?: number;
  notas?: string;
}

interface AlertDetail extends Alert {
  usuario?: { nome: string; email: string };
  dispositivo?: { modelo: string; serial: string };
}

export default function AdminAlerts() {
  const [alertas, setAlertas] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'resolvido'>('todos');
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAlertas();
    const interval = setInterval(fetchAlertas, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlertas = () => {
    setLoading(true);
    apiFetch('http://localhost:4000/api/alertas')
      .then((r) => r.json())
      .then((data) => {
        setAlertas(data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const filteredAlertas = alertas.filter((a) => {
    if (filter === 'todos') return true;
    return a.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolvido':
        return 'bg-green-100 text-green-700';
      case 'ativo':
        return 'bg-red-100 text-red-700';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'text-red-600 bg-red-50';
      case 'média':
        return 'text-orange-600 bg-orange-50';
      case 'baixa':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleResolveAlert = async () => {
    if (!selectedAlert) return;

    try {
      const response = await apiFetch(`http://localhost:4000/api/alertas/${selectedAlert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolvido',
          notas: notes,
        }),
      });

      if (response.ok) {
        setMessage('Alerta resolvido com sucesso!');
        setTimeout(() => setMessage(''), 3000);
        setSelectedAlert(null);
        setNotes('');
        fetchAlertas();
      } else {
        setMessage('Erro ao resolver alerta');
      }
    } catch (error) {
      console.error(error);
      setMessage('Erro ao resolver alerta');
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    if (!confirm('Tem certeza que deseja deletar este alerta?')) return;

    try {
      const response = await apiFetch(`http://localhost:4000/api/alertas/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Alerta deletado com sucesso!');
        setTimeout(() => setMessage(''), 3000);
        fetchAlertas();
      } else {
        setMessage('Erro ao deletar alerta');
      }
    } catch (error) {
      console.error(error);
      setMessage('Erro ao deletar alerta');
    }
  };

  const stats = {
    total: alertas.length,
    ativos: alertas.filter((a) => a.status === 'ativo').length,
    resolvidos: alertas.filter((a) => a.status === 'resolvido').length,
    pendentes: alertas.filter((a) => a.status === 'pendente').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Alertas</h1>
        <p className="text-gray-600">Visualize, resolva e gerencie todos os alertas do sistema</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Total de Alertas</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '—' : stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">Sistema</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Alertas Ativos</p>
          <p className="text-3xl font-bold text-red-600">{loading ? '—' : stats.ativos}</p>
          <p className="text-xs text-gray-500 mt-2">Precisam atenção</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Pendentes</p>
          <p className="text-3xl font-bold text-yellow-600">{loading ? '—' : stats.pendentes}</p>
          <p className="text-xs text-gray-500 mt-2">Em revisão</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <p className="text-gray-600 text-sm mb-2">Resolvidos</p>
          <p className="text-3xl font-bold text-green-600">{loading ? '—' : stats.resolvidos}</p>
          <p className="text-xs text-gray-500 mt-2">Concluídos</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {(['todos', 'ativo', 'resolvido'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-[#7d1f1f] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'todos' ? 'Todos' : status === 'ativo' ? 'Ativos' : 'Resolvidos'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {filteredAlertas.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum alerta encontrado para este filtro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Título</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Prioridade</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAlertas.map((alerta) => (
                  <tr key={alerta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{alerta.titulo}</p>
                      {alerta.descricao && <p className="text-sm text-gray-500">{alerta.descricao}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(alerta.status)}`}>
                        {alerta.status === 'resolvido'
                          ? 'Resolvido'
                          : alerta.status === 'ativo'
                          ? 'Ativo'
                          : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(alerta.prioridade)}`}>
                        {alerta.prioridade.charAt(0).toUpperCase() + alerta.prioridade.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(alerta.data_hora).toLocaleDateString('pt-BR')}
                      <br />
                      {new Date(alerta.data_hora).toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedAlert(alerta as AlertDetail);
                            setNotes(alerta.notas || '');
                          }}
                          className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          Detalhes
                        </button>
                        {alerta.status !== 'resolvido' && (
                          <button
                            onClick={() => {
                              setSelectedAlert(alerta as AlertDetail);
                              setNotes(alerta.notas || '');
                            }}
                            className="text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                          >
                            Resolver
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAlert(alerta.id)}
                          className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          Deletar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Alerta</h2>
              <button
                onClick={() => {
                  setSelectedAlert(null);
                  setNotes('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Título</h3>
                  <p className="text-lg font-bold text-gray-900">{selectedAlert.titulo}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">Status</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${getStatusColor(selectedAlert.status)}`}>
                      {selectedAlert.status === 'resolvido'
                        ? 'Resolvido'
                        : selectedAlert.status === 'ativo'
                        ? 'Ativo'
                        : 'Pendente'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">Prioridade</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${getPriorityColor(selectedAlert.prioridade)}`}>
                      {selectedAlert.prioridade.charAt(0).toUpperCase() + selectedAlert.prioridade.slice(1)}
                    </span>
                  </div>
                </div>

                {selectedAlert.descricao && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">Descrição</h3>
                    <p className="text-gray-700">{selectedAlert.descricao}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">Data e Hora</h3>
                    <p className="text-gray-700">
                      {new Date(selectedAlert.data_hora).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(selectedAlert.data_hora).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notas de Resolução
                  </h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione notas sobre este alerta..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7d1f1f] focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedAlert(null);
                    setNotes('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                {selectedAlert.status !== 'resolvido' && (
                  <button
                    onClick={handleResolveAlert}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Resolvido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
