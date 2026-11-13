import { apiFetch } from '../api';
import minhaLogo from "../../assets/logoside.png";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff, User, Phone, Calendar } from 'lucide-react';

const signupDraftKey = 'pathfinder-signup-draft';

const emptyFormData = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  senha: '',
  confirmarSenha: '',
};

export default function Signup() {

  const maskTelefone = (value: string) => {
  // Remove tudo que não for número
  let v = value.replace(/\D/g, ''); 

  // Formato fixo: (99) 9999-9999
  if (v.length <= 10) {
    return v
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14);
  }
  
  // Formato celular: (99) 99999-9999
  return v
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(() => {
    return sessionStorage.getItem(`${signupDraftKey}-accepted`) === 'true';
  });
  
  const [formData, setFormData] = useState(() => {
    const savedDraft = sessionStorage.getItem(signupDraftKey);
    if (!savedDraft) return emptyFormData;

    try {
      return { ...emptyFormData, ...JSON.parse(savedDraft) };
    } catch {
      sessionStorage.removeItem(signupDraftKey);
      return emptyFormData;
    }
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(signupDraftKey, JSON.stringify(formData));
    sessionStorage.setItem(`${signupDraftKey}-accepted`, String(acceptedTerms));
  }, [formData, acceptedTerms]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nome = formData.nome.trim();
    const email = formData.email.trim().toLowerCase();
    const senha = formData.senha.trim();
    const confirmarSenha = formData.confirmarSenha.trim();

    // Validações básicas
    if (!nome || !email || !formData.telefone || !formData.dataNascimento || !senha) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (!acceptedTerms) {
      setError('Aceite a Política de Privacidade e os Termos de Uso para continuar.');
      return;
    }

    // Forçar domínio @gmail.com
    if (!email.endsWith('@gmail.com')) {
      setError('O e-mail deve ser do domínio @gmail.com');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não conferem');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await apiFetch(`${apiUrl}/api/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          email,
          senha,
          telefone: formData.telefone,
          data_nascimento: formData.dataNascimento ? new Date(`${formData.dataNascimento}T00:00:00Z`).toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Se o backend retornou algum erro (ex: email duplicado)
        throw new Error(data.error || 'Erro ao criar conta.');
      }

      // Se deu tudo certo, redireciona para o login
      sessionStorage.removeItem(signupDraftKey);
      sessionStorage.removeItem(`${signupDraftKey}-accepted`);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D32F2F] via-[#E53935] to-[#FF8A65] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center mb-4">
              <img
                src={minhaLogo}
                alt="Logo PathFinder"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PathFinder</h1>
            <p className="text-gray-600 text-center text-sm">
              Crie sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: João Silva"
                  // Aceita letras com acentos e exige um espaço seguido de pelo menos mais uma letra (sobrenome)
                  pattern="^[A-Za-zÀ-ÖØ-öø-ÿ]+(\s+[A-Za-zÀ-ÖØ-öø-ÿ]+)+$"
                  // Mensagem customizada que vai aparecer para o usuário se ele violar o padrão acima
                  title="Por favor, insira o seu nome completo (Nome e pelo menos um Sobrenome)."
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
              </div>
            </div>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => {
                    // 1. Aplica a máscara no valor digitado
                    const valorMascarado = maskTelefone(e.target.value);
                    
                    // 2. Simula o evento do handleChange com o valor já formatado
                    handleChange({
                      target: {
                        name: 'telefone',
                        value: valorMascarado
                      }
                    } as any); // O "as any" evita erros de tipagem do TypeScript neste caso
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label htmlFor="dataNascimento" className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  // 🔥 Correção: Trava a data máxima no dia de hoje e a mínima em 1900
                  max={new Date().toISOString().split("T")[0]}
                  min="1910-01-01"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.senha}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D32F2F] transition-colors text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-[#D32F2F] rounded-r-xl">
                <p className="text-[#D32F2F] text-sm font-medium">{error}</p>
              </div>
            )}

            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#D32F2F]"
              />
              <span>
                Li e aceito a <button type="button" onClick={() => navigate('/privacidade')} className="font-medium text-[#D32F2F]">Política de Privacidade</button> e os <button type="button" onClick={() => navigate('/termos')} className="font-medium text-[#D32F2F]">Termos de Uso</button>.
              </span>
            </label>

            {/* Cadastrar Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] disabled:bg-gray-400 text-white py-4 rounded-xl font-medium text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? 'Criando conta...' : 'Cadastrar'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-[#D32F2F] hover:text-[#B71C1C] font-medium py-2 transition-colors text-base"
            >
              Já tem conta? Entrar
            </button>
          </div>
        </div>

        <p className="text-center text-white/90 text-sm mt-6">
          Sistema de monitoramento e segurança para pessoas com deficiência visual
        </p>
      </div>
    </div>
  );
}
