import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CalendarDays, CheckCircle2, CreditCard, Users } from 'lucide-react';
import { apiFetch } from '../api';

interface CurrentSubscription {
  id: number;
  status: string;
  ciclo_cobranca: 'mensal' | 'anual';
  valor_centavos: number;
  inicio: string;
  validade_ate: string;
  plano: {
    nome: string;
    max_dependentes: number;
    descricao: string;
  };
}

const formatPrice = (priceCents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceCents / 100);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export default function CurrentPlan() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentPlan() {
      setLoading(true);
      setError('');
      try {
        const response = await apiFetch('/api/subscription');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar seu plano.');

        if (!cancelled) {
          if (data.assinatura?.status !== 'simulada') {
            navigate('/plans', { replace: true });
            return;
          }
          setSubscription(data.assinatura);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar o plano.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCurrentPlan();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return <p className="py-16 text-center text-lg font-medium text-gray-700" role="status">Carregando seu plano...</p>;
  }

  if (error) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Não foi possível carregar seu plano</h1>
        <p className="mt-3 text-lg text-gray-700">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 min-h-12 rounded-xl bg-[#D32F2F] px-6 py-3 text-lg font-bold text-white hover:bg-[#B71C1C]"
        >
          Tentar novamente
        </button>
      </section>
    );
  }

  if (!subscription) return null;

  const periodLabel = subscription.ciclo_cobranca === 'anual' ? 'ano' : 'mês';
  return (
    <main className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-[#B71C1C]">Conta e assinatura</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Meu Plano</h1>
        <p className="mt-2 text-lg text-gray-700">Confira o plano vinculado à sua conta.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-[#7d1f1f] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-white/85">Plano atual</p>
              <h2 className="mt-1 text-3xl font-bold">{subscription.plano.nome}</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-bold text-[#7d1f1f]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Ativo
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <p className="text-lg leading-relaxed text-gray-700">{subscription.plano.descricao}</p>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-5">
              <dt className="flex items-center gap-2 text-base font-semibold text-gray-700">
                <CreditCard className="h-5 w-5 text-[#7d1f1f]" aria-hidden="true" />
                Valor do plano
              </dt>
              <dd className="mt-2 text-2xl font-bold text-gray-900">
                {formatPrice(subscription.valor_centavos)}
                <span className="ml-1 text-base font-medium text-gray-600">/ {periodLabel}</span>
              </dd>
              <dd className="mt-1 text-sm text-gray-600">
                Cobrança {subscription.ciclo_cobranca === 'anual' ? 'anual' : 'mensal'}
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-5">
              <dt className="flex items-center gap-2 text-base font-semibold text-gray-700">
                <Users className="h-5 w-5 text-[#7d1f1f]" aria-hidden="true" />
                Limite do plano
              </dt>
              <dd className="mt-2 text-2xl font-bold text-gray-900">
                Até {subscription.plano.max_dependentes} {subscription.plano.max_dependentes === 1 ? 'dependente' : 'dependentes'}
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-5">
              <dt className="flex items-center gap-2 text-base font-semibold text-gray-700">
                <CalendarDays className="h-5 w-5 text-[#7d1f1f]" aria-hidden="true" />
                Início do acesso
              </dt>
              <dd className="mt-2 text-lg font-semibold text-gray-900">{formatDate(subscription.inicio)}</dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-5">
              <dt className="flex items-center gap-2 text-base font-semibold text-gray-700">
                <CalendarDays className="h-5 w-5 text-[#7d1f1f]" aria-hidden="true" />
                Acesso válido até
              </dt>
              <dd className="mt-2 text-lg font-semibold text-gray-900">{formatDate(subscription.validade_ate)}</dd>
            </div>
          </dl>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-amber-950">
            Esta assinatura está em modo de demonstração. O valor e o período são registrados no sistema,
            mas não há cobrança nem aprovação financeira real.
          </div>

          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#D32F2F] px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-[#B71C1C] focus:outline-none focus:ring-4 focus:ring-red-200 sm:w-auto"
          >
            Ver ou alterar plano
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}
