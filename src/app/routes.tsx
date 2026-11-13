import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import LoginAdmin from "./pages/LoginAdmin";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Location from "./pages/Location";
import Alerts from "./pages/Alerts";
import MedicalRecord from "./pages/MedicalRecord";
import Dependents from "./pages/Dependents";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminReports from "./pages/AdminReports";
import AdminSettings from "./pages/AdminSettings";
import AdminAlerts from "./pages/AdminAlerts";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Subscription from "./pages/Subscription";
import CurrentPlan from "./pages/CurrentPlan";
import InstitutionalDashboard from "./pages/InstitutionalDashboard";

export const router = createBrowserRouter([
  // Public Routes
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/admin/login",
    Component: LoginAdmin,
  },
  {
    path: "/privacidade",
    Component: PrivacyPolicy,
  },
  {
    path: "/termos",
    Component: TermsOfUse,
  },
  {
    path: "/subscription",
    Component: Layout,
    children: [
      { index: true, Component: CurrentPlan },
    ],
  },
  {
    path: "/plans",
    Component: Layout,
    children: [
      { index: true, Component: Subscription },
    ],
  },
  {
    path: "/institutional",
    Component: InstitutionalDashboard,
  },

  // User Routes
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "location", Component: Location },
      { path: "alerts", Component: Alerts },
      { path: "medical", Component: MedicalRecord },
      { path: "dependents", Component: Dependents },
      { path: "settings", Component: Settings },
    ],
  },

  // Admin Routes
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "users", Component: AdminUsers },
      { path: "alerts", Component: AdminAlerts },
      { path: "reports", Component: AdminReports },
      { path: "settings", Component: AdminSettings },
    ],
  },

  // Redirecionamento de segurança caso digitem rotas inexistentes
  {
    path: "*",
    Component: Login, // ou criar um componente de página 404 customizado se preferir
  }
]);
