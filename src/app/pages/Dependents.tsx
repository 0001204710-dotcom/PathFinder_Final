import { Users, MapPin, Bell, Battery, Plus, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DependentData {
  id: string;
  name: string;
  relationship: string;
  photo: string;
  deviceId: string;
  gpsStatus: 'online' | 'offline';
  batteryLevel: number;
  lastAlert: string | null;
  alertType?: 'warning' | 'critical' | 'info';
}

interface DependenteDB {
  id: number;
  nome: string;
  data_nascimento: string;
  genero?: string;
  Cpf?: string;
  tipo_sanguineo?: string;
  alergias?: string;
  observacoes_medicas?: string;
  url_foto?: string;
  medicamentos?: Array<{
    id: number;
    nome: string;
    dosagem?: string;
    horario?: string;
  }>;
}

export default function Dependents() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [dependents, setDependents] = useState<DependentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [idade, setIdade] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [urlFoto, setUrlFoto] = useState('');

  useEffect(() => {
    const fetchDependents = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/dependentes`);
        const data: DependenteDB[] = await response.json();

        const mapped = data.map((dep) => ({
          id: String(dep.id),
          name: dep.nome,
          relationship: dep.observacoes_medicas || 'Dependente',
          photo: dep.url_foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dep.nome}`,
          deviceId: `PF-${3000 + dep.id}`,
          gpsStatus: 'online' as const,
          batteryLevel: 75,
          lastAlert: dep.medicamentos && dep.medicamentos.length > 0 ? `${dep.medicamentos.length} medicamentos` : null,
          alertType: 'info' as const,
        }));

        setDependents(mapped);
      } catch (err) {
        console.error('Erro ao buscar dependentes:', err);
        setDependents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDependents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/dependentes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          parentesco,
          idade: parseInt(idade),
          deviceId,
          url_foto: urlFoto,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNome('');
        setParentesco('');
        setIdade('');
        setDeviceId('');
        setUrlFoto('');
        // Recarregar lista de dependentes
        const apiUrl2 = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const fetchResponse = await fetch(`${apiUrl2}/api/dependentes`);
        const data: DependenteDB[] = await fetchResponse.json();
        const mapped = data.map((dep) => ({
          id: String(dep.id),
          name: dep.nome,
          relationship: dep.observacoes_medicas || 'Dependente',
          photo: dep.url_foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dep.nome}`,
          deviceId: `PF-${3000 + dep.id}`,
          gpsStatus: 'online' as const,
          batteryLevel: 75,
          lastAlert: dep.medicamentos && dep.medicamentos.length > 0 ? `${dep.medicamentos.length} medicamentos` : null,
          alertType: 'info' as const,
        }));
        setDependents(mapped);
      } else {
        alert('Erro ao cadastrar dependente');
      }
    } catch (err) {
      console.error('Erro ao cadastrar dependente:', err);
      alert('Erro ao cadastrar dependente');
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600 bg-green-50';
    if (level > 20) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getAlertColor = (type?: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Dependentes</h1>
          <p className="text-gray-600 text-lg">Gerencie e monitore todos os seus dependentes</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Adicionar Dependente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <p className="text-gray-600">Total de Dependentes</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dependents.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <p className="text-gray-600">Dispositivos Ativos</p>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {dependents.filter((d) => d.gpsStatus === 'online').length}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <p className="text-gray-600">Alertas Pendentes</p>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {dependents.filter((d) => d.lastAlert).length}
          </p>
        </div>
      </div>

      {/* Dependents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-100 animate-pulse">
              <div className="h-32 bg-gray-200" />
              <div className="pt-14 p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                <div className="space-y-3">
                  <div className="h-12 bg-gray-100 rounded" />
                  <div className="h-12 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dependents.map((dependent) => (
          <div
            key={dependent.id}
            className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-100 hover:border-[#FF8A65] transition-all hover:shadow-lg"
          >
            {/* Header with Photo */}
            <div className="relative h-32 bg-gradient-to-br from-[#D32F2F] to-[#FF8A65]">
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <img
                  src={dependent.photo}
                  alt={dependent.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              </div>
            </div>

            {/* Content */}
            <div className="pt-14 p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{dependent.name}</h3>
                <p className="text-gray-600">{dependent.relationship}</p>
                <p className="text-sm text-gray-500 mt-1">{dependent.deviceId}</p>
              </div>

              {/* Status Indicators */}
              <div className="space-y-3 mb-4">
                {/* GPS Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">GPS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        dependent.gpsStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        dependent.gpsStatus === 'online' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {dependent.gpsStatus === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Battery */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Battery className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Bateria</span>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${getBatteryColor(dependent.batteryLevel)}`}>
                    {dependent.batteryLevel}%
                  </span>
                </div>

                {/* Last Alert */}
                {dependent.lastAlert && (
                  <div className={`p-3 rounded-lg border-2 ${getAlertColor(dependent.alertType)}`}>
                    <div className="flex items-start gap-2">
                      <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Último Alerta</p>
                        <p className="text-sm">{dependent.lastAlert}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-medium transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white rounded-xl shadow-md border-2 border-dashed border-gray-300 hover:border-[#D32F2F] hover:bg-gray-50 transition-all min-h-[400px] flex flex-col items-center justify-center gap-4 p-6"
        >
          <div className="w-20 h-20 bg-[#D32F2F] rounded-full flex items-center justify-center">
            <Plus className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 mb-1">Adicionar Novo Dependente</p>
            <p className="text-gray-600">Cadastre um novo dependente para monitoramento</p>
          </div>
        </button>
      </div>
      )}

      {/* Add Dependent Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowAddModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Cadastrar Novo Dependente</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600 rotate-45" />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Maria Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parentesco
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mãe, Pai, Avó"
                      value={parentesco}
                      onChange={(e) => setParentesco(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idade
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 65"
                      value={idade}
                      onChange={(e) => setIdade(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID do Dispositivo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: PF-2027"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL da Foto
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={urlFoto}
                      onChange={(e) => setUrlFoto(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#D32F2F] transition-colors"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-lg font-medium transition-colors"
                    >
                      Cadastrar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
