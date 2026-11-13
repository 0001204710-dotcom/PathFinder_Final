import { apiFetch } from '../api';
import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, Filter, X, Check, AlertCircle } from 'lucide-react';

interface User {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  data_criacao?: string;
  dependentes?: any[];
  assinaturas?: Array<{
    status: string;
    ciclo_cobranca: 'mensal' | 'anual';
    valor_centavos: number;
    validade_ate: string;
    plano: { nome: string };
  }>;
}

const subscriptionIsActive = (subscription: NonNullable<User['assinaturas']>[number]) =>
  subscription.status === 'simulada' && new Date(subscription.validade_ate) > new Date();

const subscriptionStatusLabel = (subscription: NonNullable<User['assinaturas']>[number]) => {
  if (subscriptionIsActive(subscription)) return 'Demonstração ativa';
  if (subscription.status === 'simulada') return 'Expirada';
  if (subscription.status === 'substituida') return 'Substituída';
  return subscription.status;
};

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    codigoRecuperacao: '',
    telefone: '',
    data_nascimento: '',
  });

  const fetchUsers = () => {
    setLoading(true);
    apiFetch('/api/usuarios')
      .then((r) => r.json())
      .then((data) => setUsers(data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveUser = async () => {
    if (!formData.nome || !formData.email) {
      setMessage({ type: 'error', text: 'Preenchha nome e email' });
      return;
    }

    if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
      setMessage({ type: 'error', text: 'O e-mail deve ser do domínio @gmail.com' });
      return;
    }

    setSaving(true);
    try {
      const method = editingUserId ? 'PUT' : 'POST';
      const url = editingUserId ? `/api/usuarios/${editingUserId}` : '/api/usuarios';
      const body: {
        nome: string;
        email: string;
        senha?: string;
        codigoRecuperacao?: string;
        telefone: string;
        data_nascimento: string;
      } = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento,
      };

      if (!editingUserId) {
        if (!formData.senha) {
          setMessage({ type: 'error', text: 'Preenchha a senha para novo usuário' });
          setSaving(false);
          return;
        }
        body.senha = formData.senha;
      } else if (formData.senha) {
        body.senha = formData.senha;
        body.codigoRecuperacao = formData.codigoRecuperacao;
      }

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: editingUserId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!' });
        setFormData({ nome: '', email: '', senha: '', codigoRecuperacao: '', telefone: '', data_nascimento: '' });
        setEditingUserId(null);
        setShowModal(false);
        fetchUsers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar usuário' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro na requisição' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const res = await apiFetch(`/api/usuarios/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Usuário deletado com sucesso!' });
        fetchUsers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Erro ao deletar usuário' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro na requisição' });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      nome: user.nome || '',
      email: user.email || '',
      senha: '',
      codigoRecuperacao: '',
      telefone: user.telefone || '',
      data_nascimento: user.data_nascimento ? new Date(user.data_nascimento).toISOString().split('T')[0] : '',
    });
    setShowModal(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = (user.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const modalTitle = editingUserId ? 'Editar Usuário' : 'Novo Usuário';
  const submitButtonText = editingUserId ? 'Salvar Alterações' : 'Criar Usuário';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Feedback Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Usuários</h1>
          <p className="text-gray-600">Gerencie usuários do sistema PathFinder</p>
        </div>
        <button
          onClick={() => {
            setEditingUserId(null);
            setFormData({ nome: '', email: '', senha: '', codigoRecuperacao: '', telefone: '', data_nascimento: '' });
            setShowModal(true);
          }}
          className="bg-[#7d1f1f] hover:bg-[#6b1919] text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f] transition-colors"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Dependentes</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plano contratado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Criado em</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{user.nome}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-medium">{(user.dependentes || []).length}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.assinaturas?.[0] ? (
                      <div>
                        <p className="font-semibold text-gray-900">{user.assinaturas[0].plano.nome}</p>
                        <p className="text-sm text-gray-600">
                          R$ {(user.assinaturas[0].valor_centavos / 100).toFixed(2).replace('.', ',')} / {user.assinaturas[0].ciclo_cobranca === 'anual' ? 'ano' : 'mês'}
                        </p>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          subscriptionIsActive(user.assinaturas[0])
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {subscriptionStatusLabel(user.assinaturas[0])}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          Até {new Date(user.assinaturas[0].validade_ate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ) : (
                      <span className="font-medium text-red-700">Sem plano</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600">{user.data_criacao ? new Date(user.data_criacao).toLocaleDateString() : '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Carregando usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum usuário encontrado</p>
          </div>
        ) : null}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{modalTitle}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUserId(null);
                  setFormData({ nome: '', email: '', senha: '', codigoRecuperacao: '', telefone: '', data_nascimento: '' });
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f]"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f]"
              />
              {editingUserId && (
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Código informado pelo usuário (obrigatório para alterar senha)"
                  value={formData.codigoRecuperacao}
                  onChange={(e) => setFormData({ ...formData, codigoRecuperacao: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f]"
                />
              )}
              <input
                type="password"
                placeholder={editingUserId ? 'Nova senha (opcional)' : 'Senha'}
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f]"
              />
              {editingUserId && formData.senha && !formData.codigoRecuperacao && (
                <p className="text-sm text-amber-700">A nova senha só será salva com o código de recuperação fornecido pelo usuário.</p>
              )}
              <input
                type="tel"
                placeholder="Telefone (opcional)"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f]"
              />
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#7d1f1f]"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUserId(null);
                  setFormData({ nome: '', email: '', senha: '', codigoRecuperacao: '', telefone: '', data_nascimento: '' });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className={`flex-1 px-4 py-3 rounded-xl font-medium text-white transition-colors ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#7d1f1f] hover:bg-[#6b1919]'
                }`}
              >
                {saving ? 'Salvando...' : editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
