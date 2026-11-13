import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  Building2,
  Check,
  Clock3,
  HeartPulse,
  Layers3,
  LogOut,
  Pencil,
  Plus,
  Search,
  Save,
  ShieldCheck,
  Stethoscope,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { apiFetch } from '../api';
import minhaLogo from '../../assets/logologin.png';

interface Doctor {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  especialidade?: string | null;
}

interface InstitutionalGroup {
  id: number;
  nome: string;
  medico_id: number | null;
  medico: { id: number; nome: string } | null;
  dependentCount: number;
}

interface InstitutionalDependent {
  id: number;
  nome: string;
  data_nascimento: string;
  medico_institucional_id: number | null;
  grupo_institucional_id: number | null;
  medico_institucional: { id: number; nome: string } | null;
  grupo_institucional: {
    id: number;
    nome: string;
    medico: { id: number; nome: string } | null;
  } | null;
  dispositivos: Array<{
    id: number;
    nome: string;
    status: string;
    bateria: number | null;
    gps_online: boolean;
    ultima_atualizacao: string;
  }>;
  alertas: Array<{
    id: number;
    titulo: string;
    prioridade: string;
    status: string;
    data_hora: string;
  }>;
}

interface InstitutionalDashboardData {
  role: 'owner' | 'doctor';
  institution: { id: number; nome: string; email: string; telefone: string | null } | null;
  user: { id: number; nome: string; email: string } | null;
  dependents: InstitutionalDependent[];
  activeAlertCount: number;
  doctors: Doctor[];
  groups: InstitutionalGroup[];
}

interface AssignmentDraft {
  doctorId: string;
  groupId: string;
}

const sectionLinkClass = 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-red-50 hover:text-[#B71C1C]';

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date.slice(0, 10)}T12:00:00`));

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

const getErrorMessage = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null);
  return body?.error || fallback;
};

export default function InstitutionalDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<InstitutionalDashboardData | null>(null);
  const [drafts, setDrafts] = useState<Record<number, AssignmentDraft>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dependentForm, setDependentForm] = useState({ nome: '', data_nascimento: '' });
  const [profileForm, setProfileForm] = useState({ nome: '', email: '', telefone: '' });
  const [doctorForm, setDoctorForm] = useState({ nome: '', email: '', especialidade: '', senha: '' });
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [doctorEditForm, setDoctorEditForm] = useState({ nome: '', especialidade: '' });
  const [groupForm, setGroupForm] = useState({ nome: '', medicoId: '' });
  const [selectedDependents, setSelectedDependents] = useState<number[]>([]);
  const dirtyAssignments = useRef(new Set<number>());
  const dirtyProfile = useRef(false);

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/institutional/dashboard');
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível abrir o painel institucional.'));
      const data: InstitutionalDashboardData = await response.json();
      setDashboard(data);
      setProfileForm((current) => dirtyProfile.current ? current : {
        nome: data.institution?.nome ?? '',
        email: data.institution?.email ?? '',
        telefone: data.institution?.telefone ?? '',
      });
      setLastUpdated(new Date());
      setDrafts((current) => {
        const synced: Record<number, AssignmentDraft> = {};
        for (const dependent of data.dependents) {
          synced[dependent.id] = dirtyAssignments.current.has(dependent.id)
            ? current[dependent.id] ?? { doctorId: '', groupId: '' }
            : {
              doctorId: dependent.medico_institucional_id?.toString() ?? '',
              groupId: dependent.grupo_institucional_id?.toString() ?? '',
            };
        }
        return synced;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar o painel institucional.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login', { replace: true });
      return;
    }
    void loadDashboard(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadDashboard();
    }, 30_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void loadDashboard();
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [loadDashboard, navigate]);

  const filteredDependents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    return (dashboard?.dependents ?? []).filter((dependent) =>
      dependent.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || dependent.grupo_institucional?.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
    );
  }, [dashboard?.dependents, search]);

  const activeAlerts = dashboard?.activeAlertCount ?? 0;
  const onlineDevices = dashboard?.dependents.reduce(
    (total, dependent) => total + dependent.dispositivos.filter((device) => device.gps_online).length,
    0,
  ) ?? 0;
  const totalDevices = dashboard?.dependents.reduce((total, dependent) => total + dependent.dispositivos.length, 0) ?? 0;
  const isOwner = dashboard?.role === 'owner';

  const saveInstitutionProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileForm.nome.trim() || !profileForm.email.trim()) {
      setError('Informe o nome e o e-mail da instituição.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch('/api/institutional/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível salvar o perfil da instituição.'));
      dirtyProfile.current = false;
      setNotice('Perfil da instituição atualizado.');
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao salvar o perfil da instituição.');
    } finally {
      setSaving(false);
    }
  };

  const saveDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!doctorForm.nome.trim() || !doctorForm.email.trim() || doctorForm.senha.length < 8) {
      setError('Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch('/api/institutional/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorForm),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível cadastrar o profissional.'));
      setDoctorForm({ nome: '', email: '', especialidade: '', senha: '' });
      setNotice('Acesso profissional criado. Compartilhe a senha inicial por um canal seguro.');
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao cadastrar o profissional.');
    } finally {
      setSaving(false);
    }
  };

  const saveDoctorEdit = async (event: FormEvent<HTMLFormElement>, doctorId: number) => {
    event.preventDefault();
    if (!doctorEditForm.nome.trim()) {
      setError('Informe o nome do profissional.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/api/institutional/doctors/${doctorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorEditForm),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível atualizar o profissional.'));
      setEditingDoctorId(null);
      setNotice('Dados do profissional atualizados.');
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao atualizar o profissional.');
    } finally {
      setSaving(false);
    }
  };

  const saveDependent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch('/api/dependentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dependentForm.nome,
          data_nascimento: dependentForm.data_nascimento,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível cadastrar a pessoa.'));
      setDependentForm({ nome: '', data_nascimento: '' });
      setNotice('Pessoa cadastrada. Agora você pode atribuí-la a um médico ou grupo.');
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao cadastrar a pessoa.');
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupForm.nome.trim()) {
      setError('Informe um nome para o grupo.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch('/api/institutional/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: groupForm.nome,
          medicoId: groupForm.medicoId || null,
          dependentIds: selectedDependents,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível criar o grupo.'));
      setGroupForm({ nome: '', medicoId: '' });
      setSelectedDependents([]);
      setNotice('Grupo criado e dependentes vinculados.');
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao criar o grupo.');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (dependentId: number) => {
    const draft = drafts[dependentId] ?? { doctorId: '', groupId: '' };
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/api/institutional/dependents/${dependentId}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicoId: draft.doctorId || null, grupoId: draft.groupId || null }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível salvar a atribuição.'));
      dirtyAssignments.current.delete(dependentId);
      setNotice('Responsável e grupo atualizados.');
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao salvar a atribuição.');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAdmin');
    navigate('/login', { replace: true });
  };

  const resolveAlert = async (alertId: number) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/api/institutional/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolvido' }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível atualizar o alerta.'));
      setNotice('Alerta marcado como resolvido.');
      await loadDashboard();
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Erro ao atualizar o alerta.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-lg font-semibold text-gray-700" role="status">Carregando painel institucional...</div>;
  }

  if (error && !dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#B71C1C]" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Painel institucional indisponível</h1>
          <p className="mt-3 text-gray-700">{error}</p>
          <button type="button" onClick={() => void loadDashboard(true)} className="mt-6 rounded-xl bg-[#D32F2F] px-6 py-3 font-bold text-white hover:bg-[#B71C1C]">
            Tentar novamente
          </button>
          <button type="button" onClick={logout} className="ml-3 rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700">
            Sair
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-gray-900 lg:flex">
      <aside className="flex w-full flex-col border-b border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
          <img src={minhaLogo} alt="PathFinder" className="h-11 w-11 object-contain" />
          <div>
            <p className="text-lg font-extrabold tracking-tight">PathFinder</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B71C1C]">Institucional</p>
          </div>
        </div>
        <nav aria-label="Navegação institucional" className="flex gap-1 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:py-6">
          <a href="#visao-geral" className={sectionLinkClass}><Activity className="h-5 w-5" /> Visão geral</a>
          <a href="#pessoas" className={sectionLinkClass}><Users className="h-5 w-5" /> Pessoas</a>
          {isOwner && <a href="#equipe" className={sectionLinkClass}><Stethoscope className="h-5 w-5" /> Equipe médica</a>}
          {isOwner && <a href="#grupos" className={sectionLinkClass}><Layers3 className="h-5 w-5" /> Grupos</a>}
          {isOwner && <a href="#perfil" className={sectionLinkClass}><Building2 className="h-5 w-5" /> Perfil da instituição</a>}
        </nav>
        <div className="hidden border-t border-gray-100 p-5 lg:block">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-[#B71C1C]"><Building2 className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{dashboard?.institution?.nome ?? 'Instituição'}</p>
              <p className="text-xs text-gray-500">{isOwner ? 'Gestor da instituição' : 'Área do profissional'}</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-9">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-[#B71C1C]">
              {dashboard?.user?.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? 'PF'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{dashboard?.user?.nome ?? 'Usuário'}</p>
              <p className="truncate text-xs text-gray-500">{dashboard?.user?.email} · {isOwner ? 'Líder institucional' : 'Profissional responsável'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void loadDashboard()} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#D32F2F] hover:text-[#B71C1C]">
              Atualizar agora
            </button>
            <button type="button" onClick={logout} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Trocar conta
            </button>
            <button type="button" onClick={logout} className="rounded-xl bg-[#D32F2F] px-3 py-2 text-sm font-bold text-white hover:bg-[#B71C1C]">
              Sair da conta
            </button>
          </div>
        </div>

        <header id="visao-geral" className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#B71C1C]">Gestão assistencial</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{dashboard?.institution?.nome ?? 'Painel institucional'}</h1>
            <p className="mt-2 max-w-2xl text-base text-gray-600">
              {isOwner
                ? 'Gerencie pessoas, equipe profissional e grupos da instituição.'
                : `Acompanhe os grupos e as pessoas sob sua responsabilidade${dashboard?.user?.nome ? `, ${dashboard.user.nome}` : ''}.`}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {lastUpdated ? `Dados do banco atualizados às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Atualização automática a cada 30 segundos.` : 'Sincronizando com o banco de dados...'}
            </p>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"><Check className="h-5 w-5" />{notice}</div>}

        <section aria-label="Indicadores da instituição" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Pessoas acompanhadas" value={dashboard?.dependents.length ?? 0} caption="Cadastro da instituição" />
          <MetricCard icon={AlertTriangle} label="Alertas em aberto" value={activeAlerts} caption="Atenção da equipe" accent={activeAlerts > 0} />
          <MetricCard icon={Wifi} label="Dispositivos conectados" value={`${onlineDevices}/${totalDevices}`} caption="Conexão informada" />
          <MetricCard
            icon={isOwner ? Stethoscope : Layers3}
            label={isOwner ? 'Profissionais' : 'Grupos sob responsabilidade'}
            value={isOwner ? dashboard?.doctors.length ?? 0 : dashboard?.groups.length ?? 0}
            caption={isOwner ? 'Equipe cadastrada' : 'Escopo atribuído pelo líder'}
          />
        </section>

        {isOwner && (
          <section id="perfil" className="mt-9 scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-50 p-3 text-[#B71C1C]"><Building2 className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#B71C1C]">Identidade e contato</p>
                <h2 className="mt-1 text-2xl font-bold">Perfil da instituição</h2>
                <p className="mt-1 text-sm text-gray-600">Personalize o nome e os dados de contato exibidos no painel.</p>
              </div>
            </div>
            <form onSubmit={saveInstitutionProfile} className="mt-5 grid gap-4 md:grid-cols-3">
              <FormField
                label="Nome da instituição"
                value={profileForm.nome}
                onChange={(nome) => {
                  dirtyProfile.current = true;
                  setProfileForm({ ...profileForm, nome });
                }}
                placeholder="Nome da instituição"
                required
              />
              <FormField
                label="E-mail de acesso"
                type="email"
                value={profileForm.email}
                onChange={(email) => {
                  dirtyProfile.current = true;
                  setProfileForm({ ...profileForm, email });
                }}
                placeholder="instituicao@gmail.com"
                required
              />
              <FormField
                label="Telefone de contato"
                type="tel"
                value={profileForm.telefone}
                onChange={(telefone) => {
                  dirtyProfile.current = true;
                  setProfileForm({ ...profileForm, telefone });
                }}
                placeholder="(11) 99999-9999"
              />
              <div className="md:col-span-3">
                <button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D32F2F] px-5 py-2.5 font-bold text-white hover:bg-[#B71C1C] disabled:cursor-wait disabled:bg-gray-400">
                  <Save className="h-4 w-4" /> Salvar perfil
                </button>
              </div>
            </form>
          </section>
        )}

        {isOwner && (
          <section id="equipe" className="mt-9 scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#B71C1C]">Acessos e responsáveis</p>
                <h2 className="mt-1 text-2xl font-bold">Equipe médica</h2>
                <p className="mt-1 text-sm text-gray-600">Cadastre cada profissional com uma conta individual do PathFinder.</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-[#B71C1C]">{dashboard?.doctors.length ?? 0} profissionais</span>
            </div>
            <form onSubmit={saveDoctor} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <FormField label="Nome completo" value={doctorForm.nome} onChange={(nome) => setDoctorForm({ ...doctorForm, nome })} placeholder="Dra. Ana Souza" required />
              <FormField label="E-mail de acesso" type="email" value={doctorForm.email} onChange={(email) => setDoctorForm({ ...doctorForm, email })} placeholder="medico@gmail.com" required />
              <FormField label="Especialidade" value={doctorForm.especialidade} onChange={(especialidade) => setDoctorForm({ ...doctorForm, especialidade })} placeholder="Clínica médica" />
              <FormField label="Senha inicial" type="password" value={doctorForm.senha} onChange={(senha) => setDoctorForm({ ...doctorForm, senha })} placeholder="Mínimo 8 caracteres" required />
              <button disabled={saving} className="flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-[#D32F2F] px-4 py-2.5 font-bold text-white hover:bg-[#B71C1C] disabled:cursor-wait disabled:bg-gray-400">
                <Plus className="h-4 w-4" /> Adicionar profissional
              </button>
            </form>
            <div className="mt-5 divide-y divide-gray-100">
              {dashboard?.doctors.length ? dashboard.doctors.map((doctor) => (
                <div key={doctor.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  {editingDoctorId === doctor.id ? (
                    <form onSubmit={(event) => void saveDoctorEdit(event, doctor.id)} className="grid w-full gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
                      <FormField
                        label="Nome completo"
                        value={doctorEditForm.nome}
                        onChange={(nome) => setDoctorEditForm({ ...doctorEditForm, nome })}
                        placeholder="Nome do profissional"
                        required
                      />
                      <FormField
                        label="Especialidade"
                        value={doctorEditForm.especialidade}
                        onChange={(especialidade) => setDoctorEditForm({ ...doctorEditForm, especialidade })}
                        placeholder="Ex.: Cardiologia"
                      />
                      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D32F2F] px-4 py-2.5 font-bold text-white hover:bg-[#B71C1C] disabled:cursor-wait disabled:bg-gray-400">
                        <Save className="h-4 w-4" /> Salvar
                      </button>
                      <button type="button" disabled={saving} onClick={() => setEditingDoctorId(null)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                        <X className="h-4 w-4" /> Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[#B71C1C]"><Stethoscope className="h-5 w-5" /></div>
                        <div><p className="font-bold">{doctor.nome}</p><p className="text-sm text-gray-500">{doctor.especialidade || 'Especialidade não informada'} · {doctor.email}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800">Acesso individual ativo</span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setDoctorEditForm({ nome: doctor.nome, especialidade: doctor.especialidade ?? '' });
                            setEditingDoctorId(doctor.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#D32F2F] hover:text-[#B71C1C] disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )) : <p className="py-5 text-sm text-gray-500">Ainda não há profissionais cadastrados.</p>}
            </div>
          </section>
        )}

        {isOwner && (
          <section id="grupos" className="mt-6 scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#B71C1C]">Organização do atendimento</p>
              <h2 className="mt-1 text-2xl font-bold">Grupos de acompanhamento</h2>
              <p className="mt-1 text-sm text-gray-600">Crie uma equipe ou ala e atribua os dependentes de uma vez. A atribuição individual de um médico substitui a do grupo.</p>
            </div>
            <form onSubmit={saveGroup} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
              <FormField label="Nome do grupo" value={groupForm.nome} onChange={(nome) => setGroupForm({ ...groupForm, nome })} placeholder="Ex.: Ala de reabilitação" required />
              <label className="block text-sm font-semibold text-gray-700">
                Médico responsável
                <select value={groupForm.medicoId} onChange={(event) => setGroupForm({ ...groupForm, medicoId: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm">
                  <option value="">Sem responsável definido</option>
                  {dashboard?.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.nome}</option>)}
                </select>
              </label>
              <details className="rounded-xl border border-gray-200 px-4 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">Selecionar pessoas ({selectedDependents.length})</summary>
                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto border-t border-gray-100 pt-3">
                  {dashboard?.dependents.map((dependent) => (
                    <label key={dependent.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={selectedDependents.includes(dependent.id)} onChange={(event) => {
                        setSelectedDependents((current) => event.target.checked
                          ? [...current, dependent.id]
                          : current.filter((id) => id !== dependent.id));
                      }} className="h-4 w-4 accent-[#D32F2F]" />
                      {dependent.nome}
                    </label>
                  ))}
                  {!dashboard?.dependents.length && <p className="text-sm text-gray-500">Cadastre pessoas para formar um grupo.</p>}
                </div>
              </details>
              <button disabled={saving} className="min-h-11 rounded-xl border border-[#D32F2F] px-5 py-2.5 font-bold text-[#B71C1C] hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">
                Criar grupo
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {dashboard?.groups.map((group) => (
                <div key={group.id} className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="font-bold">{group.nome}</p>
                  <p className="mt-1 text-xs text-gray-500">{group.dependentCount} pessoas · {group.medico?.nome ?? 'Sem médico responsável'}</p>
                </div>
              ))}
              {!dashboard?.groups.length && <p className="text-sm text-gray-500">Nenhum grupo criado ainda.</p>}
            </div>
          </section>
        )}

        <section id="pessoas" className="mt-9 scroll-mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#B71C1C]">Visão operacional</p>
              <h2 className="mt-1 text-2xl font-bold">Pessoas e atribuições</h2>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {isOwner && (
                <details className="relative">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl bg-[#D32F2F] px-4 text-sm font-bold text-white hover:bg-[#B71C1C]">
                    <Plus className="h-4 w-4" /> Cadastrar pessoa
                  </summary>
                  <form onSubmit={saveDependent} className="absolute right-0 z-10 mt-2 grid w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:right-0">
                    <FormField label="Nome completo" value={dependentForm.nome} onChange={(nome) => setDependentForm({ ...dependentForm, nome })} placeholder="Nome e sobrenome" required />
                    <FormField label="Data de nascimento" type="date" value={dependentForm.data_nascimento} onChange={(data_nascimento) => setDependentForm({ ...dependentForm, data_nascimento })} placeholder="" required />
                    <button disabled={saving} className="min-h-11 rounded-xl bg-[#D32F2F] px-4 font-bold text-white hover:bg-[#B71C1C] disabled:cursor-wait disabled:opacity-60">Salvar cadastro</button>
                  </form>
                </details>
              )}
              <label className="relative block w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pessoa ou grupo" className="min-h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:border-[#D32F2F] focus:outline-none focus:ring-2 focus:ring-red-100" />
              </label>
            </div>
          </div>

          {filteredDependents.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 font-semibold text-gray-700">{search ? 'Nenhuma pessoa corresponde à busca.' : 'Nenhuma pessoa está vinculada à instituição ainda.'}</p>
              <p className="mt-1 text-sm text-gray-500">Os dependentes cadastrados pela conta institucional aparecerão aqui.</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1.25fr_1fr_1fr_1fr_1.5fr_auto] gap-4 bg-gray-50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 xl:grid">
                <span>Pessoa</span><span>Dispositivo</span><span>Médico</span><span>Grupo</span><span>Alerta recente</span><span></span>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredDependents.map((dependent) => {
                  const draft = drafts[dependent.id] ?? { doctorId: '', groupId: '' };
                  const directDoctor = dashboard?.doctors.find((doctor) => doctor.id.toString() === draft.doctorId);
                  const inheritedDoctor = dashboard?.groups.find((group) => group.id.toString() === draft.groupId)?.medico;
                  const currentDoctorName = directDoctor?.nome ?? inheritedDoctor?.nome ?? dependent.medico_institucional?.nome ?? dependent.grupo_institucional?.medico?.nome;
                  const latestAlert = dependent.alertas[0];
                  return (
                    <article key={dependent.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1.5fr_auto] xl:items-center xl:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-[#B71C1C]"><HeartPulse className="h-5 w-5" /></div>
                        <div><p className="font-bold">{dependent.nome}</p><p className="text-xs text-gray-500">Nasc. {formatDate(dependent.data_nascimento)}</p></div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 xl:hidden">Dispositivo</p>
                        {dependent.dispositivos.length ? dependent.dispositivos.map((device) => (
                          <p key={device.id} className="flex items-center gap-1.5 text-sm font-medium">
                            {device.gps_online ? <Wifi className="h-4 w-4 text-green-600" /> : <Wifi className="h-4 w-4 text-red-600" />}
                            {device.nome} <span className={device.gps_online ? 'text-green-700' : 'text-red-700'}>{device.gps_online ? 'Online' : 'Offline'}</span>
                            {device.bateria !== null && <span className="inline-flex items-center text-xs text-gray-500"><Battery className="h-3.5 w-3.5" />{device.bateria}%</span>}
                          </p>
                        )) : <p className="text-sm text-gray-400">Sem dispositivo</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 xl:hidden">Médico</p>
                        {isOwner ? (
                          <select aria-label={`Médico direto de ${dependent.nome}`} value={draft.doctorId} onChange={(event) => {
                            dirtyAssignments.current.add(dependent.id);
                            setDrafts({ ...drafts, [dependent.id]: { ...draft, doctorId: event.target.value } });
                          }} className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm">
                            <option value="">Usar médico do grupo</option>
                            {dashboard?.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.nome}</option>)}
                          </select>
                        ) : <p className="text-sm font-semibold">{currentDoctorName ?? 'Aguardando atribuição'}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 xl:hidden">Grupo</p>
                        {isOwner ? (
                          <select aria-label={`Grupo de ${dependent.nome}`} value={draft.groupId} onChange={(event) => {
                            dirtyAssignments.current.add(dependent.id);
                            setDrafts({ ...drafts, [dependent.id]: { ...draft, groupId: event.target.value } });
                          }} className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm">
                            <option value="">Sem grupo</option>
                            {dashboard?.groups.map((group) => <option key={group.id} value={group.id}>{group.nome}</option>)}
                          </select>
                        ) : <p className="text-sm">{dependent.grupo_institucional?.nome ?? 'Individual'}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 xl:hidden">Alerta recente</p>
                        {latestAlert ? (
                          <p className="flex items-start gap-2 text-sm">
                            <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${latestAlert.prioridade.toLowerCase().includes('alta') || latestAlert.prioridade.toLowerCase().includes('crít') ? 'text-red-600' : 'text-amber-600'}`} />
                            <span><span className="block font-semibold">{latestAlert.titulo}</span><span className="text-xs text-gray-500">{formatDateTime(latestAlert.data_hora)}</span></span>
                          </p>
                        ) : <p className="text-sm text-gray-400">Sem alerta em aberto</p>}
                        {latestAlert && (
                          <button type="button" disabled={saving} onClick={() => void resolveAlert(latestAlert.id)} className="mt-2 rounded-lg border border-green-200 px-2.5 py-1 text-xs font-bold text-green-800 hover:bg-green-50 disabled:opacity-50">
                            Marcar como resolvido
                          </button>
                        )}
                      </div>
                      {isOwner && (
                        <button type="button" disabled={saving} onClick={() => void saveAssignment(dependent.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#D32F2F] px-3 text-sm font-bold text-white hover:bg-[#B71C1C] disabled:cursor-wait disabled:opacity-60">
                          <Check className="h-4 w-4" /> Salvar
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#B71C1C]" />Acesso limitado aos dados desta instituição.</span>
          <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />Painel de gestão e acompanhamento.</span>
          <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 lg:hidden"><LogOut className="h-4 w-4" />Sair</button>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, caption, accent = false }: {
  icon: typeof Users;
  label: string;
  value: number | string;
  caption: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-gray-500">{label}</p><p className={`mt-2 text-3xl font-extrabold ${accent ? 'text-[#B71C1C]' : 'text-gray-900'}`}>{value}</p></div>
        <div className={`rounded-xl p-3 ${accent ? 'bg-red-50 text-[#B71C1C]' : 'bg-gray-50 text-[#7d1f1f]'}`}><Icon className="h-5 w-5" /></div>
      </div>
      <p className="mt-3 text-xs font-medium text-gray-500">{caption}</p>
    </article>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} minLength={type === 'password' ? 8 : undefined} className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none transition focus:border-[#D32F2F] focus:ring-2 focus:ring-red-100" />
    </label>
  );
}
