import { apiFetch } from '../api';
import minhaLogo from '../../assets/logoside.png';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

type RecoveryMethod = 'email' | 'admin';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState<RecoveryMethod | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [supportCode, setSupportCode] = useState('');
  const [adminContact, setAdminContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestRecovery = async (recoveryMethod: RecoveryMethod) => {
    setError('');
    setMessage('');
    setSupportCode('');

    if (!identifier.trim()) {
      setError('Informe o e-mail ou telefone cadastrado.');
      return;
    }
    if (recoveryMethod === 'email' && !identifier.trim().includes('@')) {
      setError('Para receber o código por e-mail, informe seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/password-recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), method: recoveryMethod }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar a recuperação.');

      setMethod(recoveryMethod);
      setMessage(data.message);
      if (recoveryMethod === 'admin') {
        setSupportCode(data.code);
        setAdminContact(data.adminContact);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiFetch('/api/password-recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: code.trim(),
          senha: newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível redefinir a senha.');
      setMessage(data.message);
      setCode('');
      setNewPassword('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D32F2F] via-[#E53935] to-[#FF8A65] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-7">
          <img src={minhaLogo} alt="Logo PathFinder" className="w-16 h-16 object-contain mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Recuperar conta</h1>
          <p className="text-gray-600 text-center mt-2">
            Escolha como deseja recuperar o acesso à sua conta.
          </p>
        </div>

        {error && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}
        {message && <p role="status" className="mb-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm">{message}</p>}

        <label htmlFor="account-identifier" className="block text-sm font-medium text-gray-700 mb-2">
          E-mail ou telefone cadastrado
        </label>
        <input
          id="account-identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="seu@email.com ou telefone"
          disabled={method === 'email'}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] disabled:bg-gray-50"
        />

        {!method && (
          <div className="space-y-3 mt-5">
            <button
              type="button"
              disabled={loading}
              onClick={() => requestRecovery('email')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 text-left hover:border-[#D32F2F] disabled:opacity-60"
            >
              <Mail className="w-5 h-5 text-[#D32F2F]" />
              <span>
                <span className="block font-semibold text-gray-900">Receber código por e-mail</span>
                <span className="block text-sm text-gray-600">Enviaremos um código temporário para sua conta.</span>
              </span>
            </button>
            <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
              <p className="font-semibold text-gray-900">Código por telefone (SMS)</p>
              <p className="text-sm text-gray-600 mt-1">Indisponível no momento; o sistema ainda não tem provedor de SMS configurado.</p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => requestRecovery('admin')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 text-left hover:border-[#D32F2F] disabled:opacity-60"
            >
              <ShieldCheck className="w-5 h-5 text-[#D32F2F]" />
              <span>
                <span className="block font-semibold text-gray-900">Não tenho acesso ao e-mail</span>
                <span className="block text-sm text-gray-600">Gere um código para informar ao administrador.</span>
              </span>
            </button>
          </div>
        )}

        {method === 'email' && (
          <form onSubmit={resetPassword} className="space-y-4 mt-5">
            <label className="block text-sm font-medium text-gray-700">
              Código recebido por e-mail
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-2 w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F]"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Nova senha (mínimo 8 caracteres)
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F]"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] disabled:bg-gray-400 text-white py-3 rounded-xl font-medium"
            >
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod(null);
                setMessage('');
                setError('');
              }}
              className="w-full text-[#D32F2F] hover:text-[#B71C1C] py-2 font-medium"
            >
              Não recebeu o código? Escolher outra forma
            </button>
          </form>
        )}

        {method === 'admin' && supportCode && (
          <div className="mt-5 space-y-3">
            <p className="text-gray-700">
              Entre em contato com o administrador pelo e-mail{' '}
              <a className="font-semibold text-[#D32F2F] underline" href={`mailto:${adminContact}`}>
                {adminContact || 'configurado pela administração do sistema'}
              </a>
              {' '}e informe o código abaixo ao administrador:
            </p>
            <p className="text-center rounded-xl bg-gray-100 px-4 py-5 font-mono text-3xl tracking-[0.3em] font-bold text-gray-900">
              {supportCode}
            </p>
            <p className="text-sm text-gray-600">O código expira em 15 minutos e só pode ser usado uma vez.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </button>
      </div>
    </div>
  );
}
