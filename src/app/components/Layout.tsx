import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  MapPin,
  Bell,
  FileHeart,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  Users,
  CreditCard,
} from 'lucide-react';
import { DependentSelector, type Dependent } from './DependentSelector';
import minhaLogo from "../../assets/logologin.png";
import { apiFetch } from '../api';

interface UserProfile {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  data_nascimento?: string | null;
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/location', label: 'Localização', icon: MapPin },
  { path: '/alerts', label: 'Alertas', icon: Bell },
  { path: '/medical', label: 'Ficha Médica', icon: FileHeart },
  { path: '/dependents', label: 'Meus Dependentes', icon: Users },
  { path: '/subscription', label: 'Meu Plano', icon: CreditCard },
  { path: '/settings', label: 'Configurações', icon: SettingsIcon },
];

interface SubscriptionSummary {
  id: number;
  status: string;
  validade_ate: string;
  valor_centavos: number;
  plano: {
    nome: string;
  };
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [currentDependent, setCurrentDependent] = useState<Dependent | null>(null);
  // 🌟 Inicialização inteligente: lê o localStorage imediatamente no F5 antes de renderizar
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const userStorage = localStorage.getItem('user');
    if (userStorage) {
      try {
        const usuarioLogado = JSON.parse(userStorage);
        return {
          id: usuarioLogado.id,
          nome: usuarioLogado.nome,
          email: usuarioLogado.email,
          telefone: usuarioLogado.telefone ?? null,
          data_nascimento: usuarioLogado.data_nascimento || null,
        };
      } catch (e) {
        console.error("Erro ao converter usuário do localStorage no F5", e);
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionRetry, setSubscriptionRetry] = useState(0);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // 🌟 Apenas verifica se há necessidade de mandar para o Login
    useEffect(() => {
      if (!currentUser || !localStorage.getItem('authToken')) {
        navigate('/login');
      }
    }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser || !localStorage.getItem('authToken')) return;

    let cancelled = false;
    async function checkSubscription() {
      setSubscriptionLoading(true);
      setSubscriptionError('');
      try {
        const response = await apiFetch(`${apiUrl}/api/subscription`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível validar o plano.');

        if (cancelled) return;
        setSubscription(data.assinatura);
        if (data.assinatura?.status !== 'simulada') {
          navigate('/plans', { replace: true });
        } else if (data.assinatura.plano.nome === 'Institucional') {
          navigate('/institutional', { replace: true });
        }
      } catch (error) {
        if (!cancelled) {
          setSubscriptionError(error instanceof Error ? error.message : 'Erro ao validar o plano.');
        }
      } finally {
        if (!cancelled) {
          setSubscriptionLoading(false);
          setSubscriptionChecked(true);
        }
      }
    }
    checkSubscription();
    return () => { cancelled = true; };
  }, [apiUrl, currentUser, navigate, subscriptionRetry]);

  // 🌟 2. SEGUNDO: Busca os dependentes e filtra APENAS os do usuário logado
  useEffect(() => {
    let active = true;

    async function fetchSidebarDependents() {
      if (!currentUser || subscription?.status !== 'simulada') return;

      try {
        const response = await apiFetch(`${apiUrl}/api/dependentes`);
        if (response.ok) {
          const data = await response.json();

          const meusDependentes = data.filter((dep: any) => dep.usuario_id === currentUser.id);

          const mapped: Dependent[] = meusDependentes.map((dep: any) => ({
            id: dep.id,
            name: dep.nome,
            photo: dep.url_foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dep.nome)}`,
            relationship: dep.genero || dep.parentesco || 'Dependente',
            hasAlert: dep.medicamentos && dep.medicamentos.length > 0,
          }));

          if (!active) return;
          setDependents(mapped);
          setCurrentDependent((selected) => mapped.find((dep) => dep.id === selected?.id) ?? mapped[0] ?? null);
        }
      } catch (err) {
        console.error('Erro ao buscar dependentes na sidebar:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchSidebarDependents();

    window.addEventListener('pathfinder:dependents-changed', fetchSidebarDependents);
    return () => {
      active = false;
      window.removeEventListener('pathfinder:dependents-changed', fetchSidebarDependents);
    };
  }, [apiUrl, currentUser, subscription?.status]);

  // Função de Logout
  const handleLogout = () => {
    localStorage.removeItem('user'); // Limpa os dados do usuário ao sair
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  if (subscriptionLoading || !subscriptionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-xl font-semibold text-gray-800" role="status">Verificando seu plano...</p>
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Não foi possível validar seu plano</h1>
          <p className="mt-3 text-lg text-gray-700">{subscriptionError}</p>
          <button
            type="button"
            onClick={() => setSubscriptionRetry((retry) => retry + 1)}
            className="mt-6 rounded-lg bg-[#D32F2F] px-6 py-3 text-lg font-bold text-white hover:bg-[#B71C1C]"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 block w-full rounded-lg border border-gray-300 px-6 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-50"
          >
            Sair
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <Link to="/" className="w-8 h-8 object-contain">
                <img src={minhaLogo} alt="Logo PathFinder" className="w-8 h-8 object-contain" />
              </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">PathFinder</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 lg:h-20 flex items-center gap-3 px-6 border-b border-gray-200">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
              <Link to="/" className="w-11 h-11 object-contain"> 
                <img src={minhaLogo} alt="Logo PathFinder" className="w-11 h-11 object-contain" />
              </Link>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PathFinder</h1>
              <p className="text-xs text-gray-500">Sistema de Acessibilidade</p>
            </div>
          </div>

          {/* Dependent Selector */}
          <div className="px-3 pt-4">
            {loading ? (
              <div className="h-14 bg-gray-100 animate-pulse rounded-xl w-full" />
            ) : currentDependent ? (
              <DependentSelector
                dependents={dependents}
                currentDependent={currentDependent}
                onSelectDependent={setCurrentDependent}
              />
            ) : (
              <p className="text-xs text-center text-gray-400 py-2">Nenhum dependente encontrado</p>
            )}
          </div>
          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive
                      ? 'bg-[#cc0000] text-white shadow-lg scale-[1.02]'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-10 h-10 bg-[#ff914d] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{currentUser ? currentUser.nome.slice(0, 2).toUpperCase() : 'JD'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{currentUser?.nome ?? 'Usuário'}</p>
                <p className="text-sm text-gray-500 truncate">{currentUser?.email ?? 'Perfil não carregado'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet context={{
            currentDependent,
            currentUser,
            setCurrentDependent,
            setCurrentUser,
            refreshSubscription: () => setSubscriptionRetry((retry) => retry + 1),
          }} />
        </div>
      </main>
    </div>
  );
}