import { apiFetch } from '../api';
import { FileHeart, User, Phone, AlertCircle, Pill, Syringe, QrCode, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

interface Medication {
  id: number;
  nome: string;
  dosagem?: string | null;
  horario?: string | null;
}

interface EmergencyContact {
  id: number;
  nome: string;
  telefone: string;
  relacao: string;
}

interface MedicalData {
  id: number;
  nome: string;
  idade: number;
  data_nascimento: string;
  tipo_sanguineo?: string | null;
  alergias?: string | null;
  observacoes_medicas?: string | null;
  peso?: number | null;
  altura?: number | null;
  medicamentos: Medication[];
  url_foto?: string | null;
}

interface ContextType {
  currentDependent: MedicalData | null;
  setCurrentDependent: (dependent: MedicalData | null) => void;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// Constantes para os novos seletores
const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sabe'];
const GRAVIDADES = ['Leve', 'Moderada', 'Grave'];

// Funções utilitárias para converter as alergias do formato de String do Banco para a Lista do Frontend
function parseAlergias(alergiasString?: string | null) {
  if (!alergiasString) return [];
  return alergiasString.split(/[,;]+/).map(item => {
    const match = item.match(/(.*?)\s*\((.*?)\)/); // Ex: "Dipirona (Grave)"
    if (match) {
      return { nome: match[1].trim(), gravidade: match[2].trim() };
    }
    return { nome: item.trim(), gravidade: 'Desconhecida' };
  }).filter(a => a.nome !== '');
}

function stringifyAlergias(alergiasArray: { nome: string; gravidade: string }[]) {
  return alergiasArray
    .filter(a => a.nome.trim() !== '')
    .map(a => `${a.nome} (${a.gravidade})`)
    .join(', ');
}

// Funções utilitárias para converter as condições médicas do formato de String do Banco para a Lista do Frontend
function parseConditions(conditionsString?: string | null) {
  if (!conditionsString) return [];
  return conditionsString.split(/[,;]+/).map(item => {
    const match = item.match(/(.*?)\s*\((.*?)\)/); // Ex: "Diabetes (Moderada)"
    if (match) {
      return { nome: match[1].trim(), gravidade: match[2].trim() };
    }
    return { nome: item.trim(), gravidade: 'Moderada' };
  }).filter(c => c.nome !== '');
}

function stringifyConditions(conditionsArray: { nome: string; gravidade: string }[]) {
  return conditionsArray
    .filter(c => c.nome.trim() !== '')
    .map(c => `${c.nome} (${c.gravidade})`)
    .join(', ');
}

export default function MedicalRecord() {
  const { currentDependent } = useOutletContext<ContextType>();
  const [showQR, setShowQR] = useState(false);
  const [record, setRecord] = useState<MedicalData | null>(null);
  const [loading, setLoading] = useState(true);

  // Medicamentos (Atualizado com separação de unidade e tempo)
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedNome, setNewMedNome] = useState('');
  const [newMedQuantidade, setNewMedQuantidade] = useState('');
  const [newMedUnidade, setNewMedUnidade] = useState('mg');
  const [newMedHorario, setNewMedHorario] = useState('');

  // Ficha médica (Atualizado para lidar com a lista dinâmica)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTipoSanguineo, setEditTipoSanguineo] = useState('Não sabe');
  const [editAlergiasArray, setEditAlergiasArray] = useState<{ nome: string; gravidade: string }[]>([]);
  const [editObservacoesArray, setEditObservacoesArray] = useState<{ nome: string; gravidade: string }[]>([]);

  // Contatos de emergência
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactNome, setNewContactNome] = useState('');
  const [newContactTelefone, setNewContactTelefone] = useState('');
  const [newContactRelacao, setNewContactRelacao] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Carrega ficha médica
  useEffect(() => {
    let active = true;

    async function loadRecord() {
      setLoading(true);
      try {
        const dependentId = Number(currentDependent?.id ?? 0);
        if (!dependentId) {
          if (active) setRecord(null);
          return;
        }

        const response = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}/ficha-medica`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!active) return;
        setRecord(data);
        
        // Alimenta os estados do modal de edição
        setEditTipoSanguineo(data.tipo_sanguineo ?? 'Não sabe');
        setEditAlergiasArray(parseAlergias(data.alergias));
        setEditObservacoesArray(parseConditions(data.observacoes_medicas));
      } catch (error) {
        console.error('Erro ao carregar ficha médica:', error);
        if (active) setRecord(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRecord();
    return () => { active = false; };
  }, [currentDependent?.id, apiUrl]);

  // Carrega contatos de emergência
  useEffect(() => {
    let active = true;
    setEmergencyContacts([]);

    async function loadContacts() {
      const dependentId = Number(currentDependent?.id ?? 0);
      if (!dependentId) {
        setEmergencyContacts([]);
        setLoadingContacts(false);
        return;
      }
      try {
        setLoadingContacts(true);
        const response = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}/contatos-emergencia`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (active) setEmergencyContacts(data);
      } catch (error) {
        console.error('Erro ao carregar contatos de emergência:', error);
        if (active) setEmergencyContacts([]);
      } finally {
        if (active) setLoadingContacts(false);
      }
    }
    loadContacts();
    return () => { active = false; };
  }, [currentDependent?.id, apiUrl]);

  // Funções de Alergias no Modal
  const adicionarAlergia = () => {
    setEditAlergiasArray([...editAlergiasArray, { nome: '', gravidade: 'Leve' }]);
  };
  const removerAlergia = (index: number) => {
    setEditAlergiasArray(editAlergiasArray.filter((_, i) => i !== index));
  };
  const atualizarAlergia = (index: number, campo: 'nome' | 'gravidade', valor: string) => {
    const novasAlergias = [...editAlergiasArray];
    novasAlergias[index][campo] = valor;
    setEditAlergiasArray(novasAlergias);
  };

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingContact(true);
      const dependentId = Number(currentDependent?.id ?? 0);
      const resp = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}/contatos-emergencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newContactNome, telefone: newContactTelefone, relacao: newContactRelacao }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const created: EmergencyContact = await resp.json();
      setEmergencyContacts((prev) => [...prev, created]);
      setShowAddContactModal(false);
      setNewContactNome('');
      setNewContactTelefone('');
      setNewContactRelacao('');
    } catch (error) {
      console.error('Erro ao adicionar contato:', error);
      alert('Erro ao adicionar contato de emergência.');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleDeleteContact(contactId: number) {
    if (!confirm('Remover este contato de emergência?')) return;
    try {
      const resp = await apiFetch(`${apiUrl}/api/contatos-emergencia/${contactId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (error) {
      console.error('Erro ao remover contato:', error);
      alert('Erro ao remover contato de emergência.');
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center">
        <p className="text-gray-600 text-lg">Carregando...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            {currentDependent
              ? 'Nenhuma ficha médica encontrada para este dependente.'
              : 'Selecione um dependente na barra lateral para visualizar a ficha médica.'}
          </p>
        </div>
      </div>
    );
  }

  const allergies = parseAlergias(record?.alergias);

  const conditions = record?.observacoes_medicas
    ? parseConditions(record.observacoes_medicas).map((cond) => ({
        name: cond.nome,
        severity: cond.gravidade,
        icon: AlertCircle,
      }))
    : [];

  const medications = record?.medicamentos ?? [];

  const medicalInfo = {
    name: record?.nome ?? 'Paciente não encontrado',
    age: record?.idade ?? 0,
    birthDate: record ? new Date(record.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A',
    bloodType: record?.tipo_sanguineo ?? 'N/A',
    weight: record?.peso ? `${record.peso.toFixed(1)} kg` : 'N/A',
    height: record?.altura ? `${record.altura} cm` : 'N/A',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ficha Médica</h1>
        <p className="text-gray-600 text-lg">Informações de saúde e contatos de emergência</p>
      </div>

      {/* QR Code */}
      <div className="bg-gradient-to-r from-[#cc0000] to-[#FF8A65] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">QR Code de Emergência</h2>
            <p className="text-white/90 mb-4">
              Em caso de emergência, profissionais de saúde podem escanear este código para acessar suas informações médicas
            </p>
            <button
              onClick={() => setShowQR(!showQR)}
              className="px-6 py-3 bg-white text-[#cc0000] rounded-lg font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              {showQR ? 'Ocultar QR Code' : 'Mostrar QR Code'}
            </button>
          </div>
          {showQR && (
            <div className="bg-white p-6 rounded-xl shadow-xl">
              <div className="w-48 h-48 bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="grid grid-cols-8 grid-rows-8 gap-1 p-4">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'}`} />
                  ))}
                </div>
              </div>
              <p className="text-center text-gray-600 text-sm mt-3 font-medium">
                ID: PF-{medicalInfo.name.slice(0, 4).toUpperCase()}-2026
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Informações Pessoais */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Informações Pessoais</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Nome Completo', value: medicalInfo.name },
            { label: 'Idade', value: `${medicalInfo.age} anos` },
            { label: 'Data de Nascimento', value: medicalInfo.birthDate },
            { label: 'Tipo Sanguíneo', value: medicalInfo.bloodType },
            { label: 'Peso', value: medicalInfo.weight },
            { label: 'Altura', value: medicalInfo.height },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">{label}</p>
              <p className="font-bold text-gray-900 text-lg">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Condições Médicas */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <FileHeart className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Condições Médicas</h2>
        </div>
        <div className="space-y-3">
          {conditions.length === 0 ? (
             <p className="text-gray-500 text-sm">Nenhuma observação médica registrada.</p>
          ) : conditions.map((condition, index) => {
            const Icon = condition.icon;
            return (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#cc0000]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#cc0000]" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{condition.name}</p>
                    <p className="text-sm text-gray-600">Gravidade: {condition.severity}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Medicamentos + Alergias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Pill className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Medicamentos</h3>
          </div>
          <div className="space-y-3">
            {medications.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum medicamento registrado.</p>
            ) : medications.map((med, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg flex items-start gap-3">
                <Pill className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{med.nome}</p>
                  <p className="text-sm text-gray-600">
                    {med.dosagem ?? 'Sem dosagem'} • {med.horario ?? 'Sem horário'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Syringe className="w-6 h-6 text-[#cc0000]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Alergias</h3>
          </div>
          <div className="space-y-3">
            {allergies.length === 0 ? (
               <p className="text-gray-500 text-sm">Nenhuma alergia registrada.</p>
            ) : allergies.map((allergy, index) => (
              <div key={index} className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500 flex items-center justify-between">
                <p className="font-bold text-gray-900">{allergy.nome}</p>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  {allergy.gravidade}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contatos de Emergência */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Phone className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Contatos de Emergência</h2>
          </div>
          <button
            onClick={() => setShowAddContactModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar Contato
          </button>
        </div>

        {loadingContacts ? (
          <p className="text-gray-500 text-sm">Carregando contatos...</p>
        ) : emergencyContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Phone className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum contato de emergência cadastrado.</p>
            <p className="text-sm">Clique em "Adicionar Contato" para incluir um.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="p-5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative group border border-gray-200">
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-100 text-red-500"
                  title="Remover contato"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">{contact.relacao}</p>
                </div>
                <p className="font-bold text-gray-900 mb-1">{contact.nome}</p>
                <p className="text-[#cc0000] font-medium text-lg">{contact.telefone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botões de ação do Rodapé */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
        <button
          onClick={() => setShowAddMedModal(true)}
          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Adicionar Medicamento
        </button>
        <button
          onClick={() => setShowEditModal(true)}
          className="px-6 py-3 bg-[#cc0000] hover:bg-[#B71C1C] text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Editar Ficha Médica
        </button>
      </div>


      
      {/* ========================================================================= */}
      {/* MODAIS A PARTIR DAQUI */}
      {/* ========================================================================= */}

      {/* Modal: Adicionar Contato de Emergência */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Adicionar Contato de Emergência</h3>
            <form onSubmit={handleAddContact}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none"
                  value={newContactNome}
                  onChange={(e) => setNewContactNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 outline-none"
                  value={newContactTelefone}
                  onChange={(e) => setNewContactTelefone(maskPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  maxLength={15}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Relação</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  value={newContactRelacao}
                  onChange={(e) => setNewContactRelacao(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Pai/Mãe">Pai/Mãe</option>
                  <option value="Irmão/Irmã">Irmão/Irmã</option>
                  <option value="Médico">Médico</option>
                  <option value="Cuidador">Cuidador</option>
                  <option value="Amigo(a)">Amigo(a)</option>
                  <option value="Emergência">Emergência (SAMU/etc)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {savingContact ? 'Salvando...' : 'Adicionar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Medicamento */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Adicionar Medicamento</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const dependentId = Number(currentDependent?.id ?? 0);
                  const dosagemFinal = `${newMedQuantidade}${newMedUnidade}`; // Ex: junta "500" com "mg"
                  
                  const resp = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}/medicamentos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: newMedNome, dosagem: dosagemFinal, horario: newMedHorario }),
                  });
                  if (!resp.ok) throw new Error('HTTP ' + resp.status);
                  
                  const updatedResp = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}/ficha-medica`);
                  if (!updatedResp.ok) throw new Error('HTTP ' + updatedResp.status);
                  setRecord(await updatedResp.json());
                  
                  setShowAddMedModal(false);
                  setNewMedNome(''); setNewMedQuantidade(''); setNewMedUnidade('mg'); setNewMedHorario('');
                } catch (error) {
                  console.error('Erro ao adicionar medicamento:', error);
                  alert('Erro ao adicionar medicamento.');
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Medicamento</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" 
                  placeholder="Ex: Paracetamol"
                  value={newMedNome} 
                  onChange={(e) => setNewMedNome(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosagem</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newMedQuantidade}
                    onChange={(e) => setNewMedQuantidade(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-2/3 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                  <select
                    value={newMedUnidade}
                    onChange={(e) => setNewMedUnidade(e.target.value)}
                    className="w-1/3 border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="gotas">gotas</option>
                    <option value="cp">cp</option>
                    <option value="UI">UI</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                <input 
                  type="time" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" 
                  value={newMedHorario} 
                  onChange={(e) => setNewMedHorario(e.target.value)} 
                  required 
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddMedModal(false)} 
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Ficha Médica */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Editar Ficha Médica</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const dependentId = Number(currentDependent?.id ?? 0);
                  const alergiasFinal = stringifyAlergias(editAlergiasArray);
                  const observacoesFinal = stringifyConditions(editObservacoesArray);

                  const resp = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      tipo_sanguineo: editTipoSanguineo, 
                      alergias: alergiasFinal, 
                      observacoes_medicas: observacoesFinal 
                    }),
                  });
                  if (!resp.ok) throw new Error('HTTP ' + resp.status);
                  
                  // Recarrega os dados fresquinhos do banco
                  const updatedResp = await apiFetch(`${apiUrl}/api/dependentes/${dependentId}/ficha-medica`);
                  if (!updatedResp.ok) throw new Error('HTTP ' + updatedResp.status);
                  
                  const updatedData = await updatedResp.json();
                  setRecord(updatedData);
                  setEditTipoSanguineo(updatedData.tipo_sanguineo ?? 'Não sabe');
                  setEditAlergiasArray(parseAlergias(updatedData.alergias));
                  setEditObservacoesArray(parseConditions(updatedData.observacoes_medicas));
                  
                  setShowEditModal(false);
                } catch (error) {
                  console.error('Erro ao atualizar ficha médica:', error);
                  alert('Erro ao atualizar ficha médica.');
                }
              }}
            >
              
              {/* Seletor do Tipo Sanguíneo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Sanguíneo</label>
                <select
                  value={editTipoSanguineo}
                  onChange={(e) => setEditTipoSanguineo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#D32F2F] outline-none"
                >
                  {TIPOS_SANGUINEOS.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              {/* Lista Dinâmica de Alergias */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Alergias</label>
                  <button 
                    type="button"
                    onClick={adicionarAlergia}
                    className="text-sm text-[#D32F2F] font-semibold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Alergia
                  </button>
                </div>
                
                {editAlergiasArray.length === 0 ? (
                  <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                    Nenhuma alergia registrada. Clique em adicionar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editAlergiasArray.map((alergia, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <input
                          type="text"
                          placeholder="Ex: Dipirona"
                          value={alergia.nome}
                          onChange={(e) => atualizarAlergia(index, 'nome', e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#D32F2F] outline-none"
                        />
                        <select
                          value={alergia.gravidade}
                          onChange={(e) => atualizarAlergia(index, 'gravidade', e.target.value)}
                          className="w-32 border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#D32F2F] outline-none"
                        >
                          {GRAVIDADES.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removerAlergia(index)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover alergia"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista Dinâmica de Condições Médicas (Observações Médicas) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Condições Médicas</label>
                  <button 
                    type="button"
                    onClick={() => setEditObservacoesArray([...editObservacoesArray, { nome: '', gravidade: 'Moderada' }])}
                    className="text-sm text-[#D32F2F] font-semibold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Condição
                  </button>
                </div>
                
                {editObservacoesArray.length === 0 ? (
                  <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                    Nenhuma condição médica registrada. Clique em adicionar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editObservacoesArray.map((condicao, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <input
                          type="text"
                          placeholder="Ex: Diabetes"
                          value={condicao.nome}
                          onChange={(e) => {
                            const novasCondicoes = [...editObservacoesArray];
                            novasCondicoes[index].nome = e.target.value;
                            setEditObservacoesArray(novasCondicoes);
                          }}
                          className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#D32F2F] outline-none"
                        />
                        <select
                          value={condicao.gravidade}
                          onChange={(e) => {
                            const novasCondicoes = [...editObservacoesArray];
                            novasCondicoes[index].gravidade = e.target.value;
                            setEditObservacoesArray(novasCondicoes);
                          }}
                          className="w-32 border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#D32F2F] outline-none"
                        >
                          {GRAVIDADES.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setEditObservacoesArray(editObservacoesArray.filter((_, i) => i !== index))}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover condição"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-[#cc0000] text-white font-medium rounded-lg hover:bg-[#B71C1C] transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}