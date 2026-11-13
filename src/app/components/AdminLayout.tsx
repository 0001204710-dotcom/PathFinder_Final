import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import minhaLogo from "../../assets/logoEscura.png";

const adminMenuItems = [
  { path: '/admin', label: 'Dashboard Admin', icon: BarChart3 },
  { path: '/admin/users', label: 'Usuários', icon: Users },
  { path: '/admin/alerts', label: 'Alertas', icon: AlertCircle },
  { path: '/admin/reports', label: 'Relatórios', icon: FileText },
  { path: '/admin/settings', label: 'Configurações', icon: SettingsIcon },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('authToken') || localStorage.getItem('isAdmin') !== 'true') {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#7d1f1f]">
            <Link
              to="/admin"
            >
              <img
                src={minhaLogo}
                alt="Logo PathFinder"
                className="w-8 h-8 object-contain"
              />
            </Link>
          </div>
               <h1 className="text-xl font-bold text-gray-900">Admin</h1>
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
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
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
          <div className="h-16 lg:h-20 flex items-center gap-3 px-6 border-b border-gray-200 bg-[#f5e6e6]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#7d1f1f]">
              <Link
                to = "/admin"
                className="w-11 h-11 object-contain"
              >
                <img
                  src={minhaLogo}
                  alt="Logo PathFinder"
                  className="w-11 h-11 object-contain"
                />
              </Link>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PathFinder</h1>
              <p className="text-xs text-[#7d1f1f]">Painel Admin</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {adminMenuItems.map((item) => {
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
                      ? 'bg-[#7d1f1f] text-white shadow-lg scale-[1.02]'
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

          {/* Admin Info & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-10 h-10 bg-[#7d1f1f] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">AD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">Administrador</p>
                <p className="text-sm text-gray-500">Admin</p>
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
          <Outlet />
        </div>
      </main>
    </div>
  );
}
