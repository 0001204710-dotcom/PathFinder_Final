import { apiFetch } from '../api';
import { User, Bell, Volume2, Vibrate, Bluetooth, MapPin, Shield, Speaker, Hand, TestTube2 } from 'lucide-react';
import { useState, useEffect, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { useOutletContext } from 'react-router-dom'; // Padronizado para react-router-dom

interface UserProfile {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  data_nascimento?: string | null;
}

export default function Settings() {
  // Coletando os dados globais do Layout de forma segura
  const context = useOutletContext<{ currentUser: UserProfile | null; setCurrentUser?: Dispatch<SetStateAction<UserProfile | null>> }>();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [autoEmergency, setAutoEmergency] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(75);

  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTelefone, setProfileTelefone] = useState('');
  const [profileDataNascimento, setProfileDataNascimento] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  const [batteryThreshold, setBatteryThreshold] = useState(20);
  const [notifyBattery, setNotifyBattery] = useState(true);
  const [medicationPriority, setMedicationPriority] = useState('high');

  const [alertSystemEnabled, setAlertSystemEnabled] = useState(true);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [vibrationAlertsEnabled, setVibrationAlertsEnabled] = useState(true);
  const [soundIntensity, setSoundIntensity] = useState(7);
  const [vibrationIntensity, setVibrationIntensity] = useState(5);
  const [testingDevice, setTestingDevice] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Sincroniza os inputs locais com o usuário do contexto global
  // Sincroniza os inputs locais com o usuário do contexto global
  useEffect(() => {
    function loadUserProfile() {
      // 1. Prioridade máxima: Dados do Contexto Global
      if (context?.currentUser) {
        setProfileNome(context.currentUser.nome || '');
        setProfileEmail(context.currentUser.email || '');
        setProfileTelefone(context.currentUser.telefone || '');
        
        const dataRaw = context.currentUser.data_nascimento || (context.currentUser as any).dataNascimento;
        
        if (dataRaw) {
          // Se já for uma string contendo traço no padrão correto (AAAA-MM-DD), joga direto no input
          if (dataRaw.includes('-') && !dataRaw.includes('T') && !dataRaw.includes('/')) {
            setProfileDataNascimento(dataRaw);
          } else if (dataRaw.includes('/')) {
            setProfileDataNascimento(dataRaw.split('/').reverse().join('-')); // DD/MM/AAAA -> AAAA-MM-DD
          } else {
            setProfileDataNascimento(dataRaw.split('T')[0]); // ISO -> AAAA-MM-DD
          }
        } else {
          setProfileDataNascimento('');
        }
        setProfileLoaded(true);
        return;
      }

      // 2. Fallback: LocalStorage
      const userStorage = localStorage.getItem('user');
      if (userStorage) {
        try {
          const usuarioLogado = JSON.parse(userStorage);
          setProfileNome(usuarioLogado.nome || '');
          setProfileEmail(usuarioLogado.email || '');
          setProfileTelefone(usuarioLogado.telefone || '');
          
          const dataRaw = usuarioLogado.data_nascimento || usuarioLogado.dataNascimento;
          if (dataRaw) {
            if (dataRaw.includes('-') && !dataRaw.includes('T') && !dataRaw.includes('/')) {
              setProfileDataNascimento(dataRaw);
            } else if (dataRaw.includes('/')) {
              setProfileDataNascimento(dataRaw.split('/').reverse().join('-'));
            } else {
              setProfileDataNascimento(dataRaw.split('T')[0]);
            }
          } else {
            setProfileDataNascimento('');
          }
        } catch (err) {
          console.error('Erro ao ler localStorage em Settings:', err);
        }
      }
      setProfileLoaded(true);
    }

    loadUserProfile();
  }, [context?.currentUser]);

  const handleTestDevice = () => {
    setTestingDevice(true);
    setTimeout(() => setTestingDevice(false), 2000);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!profileNome || !profileEmail) {
      setError('Nome e e-mail são obrigatórios');
      return;
    }

    if (!profileEmail.toLowerCase().endsWith('@gmail.com')) {
      setError('O e-mail deve ser do domínio @gmail.com');
      return;
    }

    setProfileSaving(true);

    try {
      // Usa o ID dinâmico vindo do contexto (Pedro ou qualquer outro logado)
      const userId = context?.currentUser?.id ?? 1;
      const response = await apiFetch(`${apiUrl}/api/usuarios/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: profileNome,
          email: profileEmail,
          telefone: profileTelefone || null,
          // Formata antes de mandar pro banco para não dar erro de fuso horário
          data_nascimento: profileDataNascimento ? new Date(`${profileDataNascimento}T00:00:00Z`).toISOString() : null,
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setSuccessMessage('Perfil atualizado com sucesso.');

        // Salva na engrenagem global para atualizar a barra lateral e outras telas na hora!
        if (context?.setCurrentUser) {
          context.setCurrentUser(updated);
        }
      } else {
        setError('Não foi possível atualizar o perfil. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError('Erro ao atualizar o perfil. Verifique sua conexão.');
    } finally {
      setProfileSaving(false);
    }
  };

  const getActiveAlertTypes = () => {
    if (!alertSystemEnabled) return 'sistema desativado';
    const types = [];
    if (soundAlertsEnabled) types.push(`som (nível ${soundIntensity})`);
    if (vibrationAlertsEnabled) types.push(`vibração (nível ${vibrationIntensity})`);
    if (types.length === 0) return 'nenhum alerta ativo';
    return types.join(' e ');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600 text-lg">Personalize as preferências do sistema</p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Perfil do Usuário</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-[#D32F2F] rounded-r-xl">
              <p className="text-[#D32F2F] text-sm font-medium">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-xl">
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={profileNome}
                onChange={(e) => setProfileNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#cc0000] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#cc0000] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={profileTelefone}
                onChange={(e) => setProfileTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#cc0000] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={profileDataNascimento}
                onChange={(e) => setProfileDataNascimento(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                min="1910-01-01"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#cc0000] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!profileLoaded || profileSaving}
            className="w-full px-6 py-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl font-medium transition-colors shadow-lg disabled:opacity-50"
          >
            {profileSaving ? 'Salvando perfil...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      {/* Alert Customization Module */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-[#FF8A65]/10 rounded-xl flex items-center justify-center">
            <Bell className="w-8 h-8 text-[#cc0000]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Personalização de Alertas</h2>
            <p className="text-gray-600">Configure o comportamento do dispositivo vestível</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  alertSystemEnabled ? 'bg-green-50' : 'bg-gray-200'
                }`}>
                  <Shield className={`w-8 h-8 ${alertSystemEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Ativar Sistema de Alertas</h3>
                  <p className="text-gray-600">Controle principal de todos os alertas</p>
                </div>
              </div>
              <Switch.Root
                checked={alertSystemEnabled}
                onCheckedChange={setAlertSystemEnabled}
                className="w-16 h-9 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
              >
                <Switch.Thumb className="block w-7 h-7 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-8 shadow-lg" />
              </Switch.Root>
            </div>
          </div>

          <div className={`space-y-8 transition-opacity ${!alertSystemEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Modos de Alerta</h3>
              <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-[#FF8A65] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        soundAlertsEnabled ? 'bg-[#cc0000]/10' : 'bg-gray-200'
                      }`}>
                        <Speaker className={`w-7 h-7 ${soundAlertsEnabled ? 'text-[#cc0000]' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">Alertas Sonoros</p>
                        <p className="text-sm text-gray-600">Emitir sons de notificação</p>
                      </div>
                    </div>
                    <Switch.Root
                      checked={soundAlertsEnabled}
                      onCheckedChange={setSoundAlertsEnabled}
                      className="w-16 h-9 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
                    >
                      <Switch.Thumb className="block w-7 h-7 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-8 shadow-lg" />
                    </Switch.Root>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-[#FF8A65] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        vibrationAlertsEnabled ? 'bg-[#cc0000]/10' : 'bg-gray-200'
                      }`}>
                        <Hand className={`w-7 h-7 ${vibrationAlertsEnabled ? 'text-[#cc0000]' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">Alertas Táteis (Vibração)</p>
                        <p className="text-sm text-gray-600">Vibrar para notificações</p>
                      </div>
                    </div>
                    <Switch.Root
                      checked={vibrationAlertsEnabled}
                      onCheckedChange={setVibrationAlertsEnabled}
                      className="w-16 h-9 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
                    >
                      <Switch.Thumb className="block w-7 h-7 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-8 shadow-lg" />
                    </Switch.Root>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 pt-4">
              <div className={`transition-opacity ${!soundAlertsEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Speaker className="w-6 h-6 text-[#FF8A65]" />
                  <h3 className="text-xl font-bold text-gray-900">Volume do Som</h3>
                </div>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Nível Atual</p>
                    <p className="text-4xl font-bold text-[#FF8A65]">{soundIntensity}</p>
                  </div>
                  <div className="px-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={soundIntensity}
                      onChange={(e) => setSoundIntensity(Number(e.target.value))}
                      disabled={!soundAlertsEnabled}
                      className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: soundAlertsEnabled
                          ? `linear-gradient(to right, #FF8A65 0%, #FF8A65 ${(soundIntensity - 1) * 11.11}%, #E5E7EB ${(soundIntensity - 1) * 11.11}%, #E5E7EB 100%)`
                          : '#E5E7EB',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="text-lg font-bold text-gray-900">Baixo</span>
                    <span className="text-lg font-bold text-gray-900">Alto</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-3 rounded transition-colors ${
                          soundAlertsEnabled && i < soundIntensity ? 'bg-[#FF8A65]' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className={`transition-opacity ${!vibrationAlertsEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Hand className="w-6 h-6 text-[#FF8A65]" />
                  <h3 className="text-xl font-bold text-gray-900">Força da Vibração</h3>
                </div>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Nível Atual</p>
                    <p className="text-4xl font-bold text-[#FF8A65]">{vibrationIntensity}</p>
                  </div>
                  <div className="px-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={vibrationIntensity}
                      onChange={(e) => setVibrationIntensity(Number(e.target.value))}
                      disabled={!vibrationAlertsEnabled}
                      className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: vibrationAlertsEnabled
                          ? `linear-gradient(to right, #FF8A65 0%, #FF8A65 ${(vibrationIntensity - 1) * 11.11}%, #E5E7EB ${(vibrationIntensity - 1) * 11.11}%, #E5E7EB 100%)`
                          : '#E5E7EB',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="text-lg font-bold text-gray-900">Baixo</span>
                    <span className="text-lg font-bold text-gray-900">Alto</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-3 rounded transition-colors ${
                          vibrationAlertsEnabled && i < vibrationIntensity ? 'bg-[#FF8A65]' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleTestDevice}
                disabled={testingDevice || (!soundAlertsEnabled && !vibrationAlertsEnabled)}
                className={`
                  w-full py-5 rounded-xl font-bold text-lg transition-all
                  flex items-center justify-center gap-3
                  ${testingDevice
                    ? 'bg-green-600 border-green-600 text-white shadow-lg'
                    : (!soundAlertsEnabled && !vibrationAlertsEnabled)
                    ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-2 border-[#cc0000] text-[#cc0000] hover:bg-[#cc0000] hover:text-white'
                  }
                `}
              >
                <TestTube2 className="w-6 h-6" />
                {testingDevice ? 'Teste Enviado ao Dispositivo!' : 'Testar no Dispositivo'}
              </button>
              <p className="text-center text-sm text-gray-600 mt-3">
                {alertSystemEnabled
                  ? `O dispositivo vestível irá emitir ${getActiveAlertTypes()}`
                  : 'Sistema de alertas desativado'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences & Rules */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <Bell className="w-7 h-7 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Preferências e Regras de Alertas</h2>
            <p className="text-sm text-gray-500">Defina os gatilhos e a urgência das notificações do sistema</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Notificações Push</p>
                <p className="text-sm text-gray-600">Receber alertas gerais do dispositivo na tela</p>
              </div>
            </div>
            <Switch.Root
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
              className="w-14 h-8 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
            >
              <Switch.Thumb className="block w-6 h-6 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Emergência Automática</p>
                <p className="text-sm text-gray-600">Acionar SOS imediatamente em quedas detectadas</p>
              </div>
            </div>
            <Switch.Root
              checked={autoEmergency}
              onCheckedChange={setAutoEmergency}
              className="w-14 h-8 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
            >
              <Switch.Thumb className="block w-6 h-6 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>

          <div className="border-t border-gray-100 my-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Gatilhos Personalizados</h3>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bluetooth className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Alerta de Bateria do Dispositivo</p>
                  <p className="text-sm text-gray-600">Avisar quando a bateria do vestível estiver criticamente baixa</p>
                </div>
              </div>
              <Switch.Root
                checked={notifyBattery}
                onCheckedChange={setNotifyBattery}
                className="w-14 h-8 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
              >
                <Switch.Thumb className="block w-6 h-6 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-7" />
              </Switch.Root>
            </div>

            {notifyBattery && (
              <div className="pt-2 pl-8 flex items-center gap-3 animate-fadeIn">
                <label className="text-sm text-gray-700 font-medium">Disparar quando atingir:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="45"
                    value={batteryThreshold}
                    onChange={(e) => setBatteryThreshold(Math.max(5, Math.min(100, Number(e.target.value))))}
                    className="w-20 px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#cc0000] font-semibold text-gray-700"
                  />
                  <span className="text-gray-600 font-medium">%</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg md:flex md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Atraso de Medicamentos</p>
                <p className="text-sm text-gray-600">Nível de prioridade caso o dependente esqueça o remédio</p>
              </div>
            </div>
            <div>
              <select
                value={medicationPriority}
                onChange={(e) => setMedicationPriority(e.target.value)}
                className="w-full md:w-36 px-3 py-2 border-2 border-gray-200 rounded-lg bg-white font-medium text-gray-700 focus:outline-none focus:border-[#cc0000] cursor-pointer"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta 🚨</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sound & Vibration Section */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
            <Volume2 className="w-7 h-7 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Som e Vibração</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Som de Alertas</p>
                <p className="text-sm text-gray-600">Reproduzir sons nas notificações</p>
              </div>
            </div>
            <Switch.Root
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              className="w-14 h-8 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
            >
              <Switch.Thumb className="block w-6 h-6 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Volume: {volumeLevel}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volumeLevel}
              onChange={(e) => setVolumeLevel(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#cc0000]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Vibração</p>
                <p className="text-sm text-gray-600">Vibrar em alertas importantes</p>
              </div>
            </div>
            <Switch.Root
              checked={vibrationEnabled}
              onCheckedChange={setVibrationEnabled}
              className="w-14 h-8 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
            >
              <Switch.Thumb className="block w-6 h-6 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>
        </div>
      </div>

      {/* Device Connection */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <Bluetooth className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Conexão do Dispositivo</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <p className="font-bold text-gray-900">PathFinder Device #2026</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Conectado
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Bateria</p>
                <p className="font-medium text-gray-900">87%</p>
              </div>
              <div>
                <p className="text-gray-600">Sinal</p>
                <p className="font-medium text-gray-900">Forte</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Rastreamento GPS</p>
                <p className="text-sm text-gray-600">Compartilhar localização</p>
              </div>
            </div>
            <Switch.Root
              checked={locationEnabled}
              onCheckedChange={setLocationEnabled}
              className="w-14 h-8 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#cc0000] transition-colors"
            >
              <Switch.Thumb className="block w-6 h-6 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>

          <button className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors">
            Reconectar Dispositivo
          </button>
        </div>
      </div>
    </div>
  );
}