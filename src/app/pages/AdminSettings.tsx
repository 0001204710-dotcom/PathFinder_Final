import { apiFetch } from '../api';
import { Save, Bell, Lock, Database, Mail, Server, Check, AlertCircle, Eye, EyeOff, TestTube } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';

interface Config {
  emailNotifications: boolean;
  backupEnabled: boolean;
  maintenanceMode: boolean;
  twoFactorRequired: boolean;
  emailServer: {
    host: string;
    port: string;
    username: string;
    password: string;
  };
  backupSchedule: string;
  apiRateLimit: string;
}

export default function AdminSettings() {
  const [config, setConfig] = useState<Config>({
    emailNotifications: true,
    backupEnabled: true,
    maintenanceMode: false,
    twoFactorRequired: true,
    emailServer: {
      host: 'smtp.gmail.com',
      port: '587',
      username: 'pathfinder@example.com',
      password: '',
    },
    backupSchedule: 'diária',
    apiRateLimit: '1000',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('http://localhost:4000/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        console.log('Usando configurações padrão');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch('http://localhost:4000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro na conexão com servidor' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const response = await apiFetch('http://localhost:4000/api/config/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.emailServer),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email de teste enviado com sucesso!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Erro ao enviar email de teste' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao testar conexão de email' });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-600">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações do Sistema</h1>
        <p className="text-gray-600">Gerencie as configurações gerais do PathFinder</p>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <p
            className={`font-medium ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Notifications Settings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Notificações</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Notificações por Email</p>
              <p className="text-sm text-gray-600">Receber alertas críticos por email</p>
            </div>
            <Switch.Root
              checked={config.emailNotifications}
              onCheckedChange={(checked) => setConfig({ ...config, emailNotifications: checked })}
              className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#7d1f1f] transition-colors"
            >
              <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-lg transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notificações de Dispositivos Offline</p>
              <p className="text-sm text-gray-600">Alertar quando dispositivos ficarem offline</p>
            </div>
            <Switch.Root className="w-11 h-6 bg-[#7d1f1f] rounded-full relative" defaultChecked>
              <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-lg transition-transform translate-x-5" />
            </Switch.Root>
          </div>
        </div>
      </div>

      {/* Email Server Configuration */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Servidor de Email</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Host SMTP</label>
            <input
              type="text"
              value={config.emailServer.host}
              onChange={(e) => setConfig({
                ...config,
                emailServer: { ...config.emailServer, host: e.target.value }
              })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#7d1f1f] transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Porta</label>
              <input
                type="text"
                value={config.emailServer.port}
                onChange={(e) => setConfig({
                  ...config,
                  emailServer: { ...config.emailServer, port: e.target.value }
                })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#7d1f1f] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={config.emailServer.username}
                onChange={(e) => setConfig({
                  ...config,
                  emailServer: { ...config.emailServer, username: e.target.value }
                })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#7d1f1f] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha SMTP</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.emailServer.password}
                onChange={(e) => setConfig({
                  ...config,
                  emailServer: { ...config.emailServer, password: e.target.value }
                })}
                placeholder="Digite sua senha SMTP"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#7d1f1f] transition-colors pr-12"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleTestEmail}
            disabled={testingEmail || !config.emailServer.host || !config.emailServer.username || !config.emailServer.password}
            className="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {testingEmail ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Backup e Recuperação</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Backup Automático</p>
              <p className="text-sm text-gray-600">Realizar backups automáticos do banco de dados</p>
            </div>
            <Switch.Root
              checked={config.backupEnabled}
              onCheckedChange={(checked) => setConfig({ ...config, backupEnabled: checked })}
              className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#7d1f1f] transition-colors"
            >
              <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-lg transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>

          {config.backupEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequência de Backup</label>
              <select
                value={config.backupSchedule}
                onChange={(e) => setConfig({ ...config, backupSchedule: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#7d1f1f] transition-colors bg-white"
              >
                <option value="diária">Diária (00:00)</option>
                <option value="semanal">Semanal (Domingo 00:00)</option>
                <option value="mensal">Mensal (1º dia 00:00)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Segurança</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Autenticação de Dois Fatores</p>
              <p className="text-sm text-gray-600">Exigir 2FA para todos os administradores</p>
            </div>
            <Switch.Root
              checked={config.twoFactorRequired}
              onCheckedChange={(checked) => setConfig({ ...config, twoFactorRequired: checked })}
              className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#7d1f1f] transition-colors"
            >
              <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-lg transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Modo de Manutenção</p>
              <p className="text-sm text-gray-600">Colocar o sistema em manutenção (apenas admins)</p>
            </div>
            <Switch.Root
              checked={config.maintenanceMode}
              onCheckedChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
              className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-[#7d1f1f] transition-colors"
            >
              <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-lg transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">API</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Limite de Taxa (Requisições/Hora)</label>
            <input
              type="number"
              value={config.apiRateLimit}
              onChange={(e) => setConfig({ ...config, apiRateLimit: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#7d1f1f] transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">Limite máximo de requisições por hora por IP</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-[#F5F5F5] py-4 -mx-8 px-8">
        <button 
          onClick={() => fetchConfig()}
          className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Descartar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg ${
            saving
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-[#7d1f1f] hover:bg-[#6b1919] text-white'
          }`}
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
