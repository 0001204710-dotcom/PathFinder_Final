import { apiFetch } from '../api';
import minhaLogo from "../../assets/logoside.png";
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Adicionado estado de loading

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailNormalized = email.trim().toLowerCase();
    const passwordNormalized = password.trim();

    if (!emailNormalized.endsWith('@gmail.com')) {
      setError('Use um e-mail @gmail.com');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await apiFetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailNormalized,
          senha: passwordNormalized,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      // Salva os dados do usuário logado para usar nas outras telas do app
      localStorage.setItem('user', JSON.stringify(data.usuario));
      localStorage.setItem('authToken', data.token);
      
      // Redireciona para o Dashboard principal do usuário
      navigate(data.institutionalAccess ? '/institutional' : '/');
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D32F2F] via-[#E53935] to-[#FF8A65] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center mb-4">
              <img
                src={minhaLogo}
                alt="Logo PathFinder"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PathFinder</h1>
            <p className="text-gray-600 text-center text-lg">
              Sistema de Acessibilidade Inteligente
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-[#D32F2F] rounded-r-xl">
                <p className="text-[#D32F2F] text-sm font-medium">{error}</p>
              </div>
            )}
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] disabled:bg-gray-400 text-white py-4 rounded-xl font-medium text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors text-base"
            >
              Esqueceu a senha?
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full text-[#D32F2F] hover:text-[#B71C1C] font-medium py-2 transition-colors text-base"
            >
              Criar nova conta
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors text-base border-t border-gray-200 pt-4"
            >
              Acesso Administrativo →
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/90 text-sm">
          Sistema de monitoramento e segurança para pessoas com deficiência visual
        </p>
      </div>
    </div>
  );
}