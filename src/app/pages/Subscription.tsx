import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { Check, CreditCard, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../api';

type BillingCycle = 'mensal' | 'anual';

interface Plan {
  id: number;
  nome: string;
  preco_centavos: number;
  preco_anual_centavos: number;
  max_dependentes: number;
  descricao: string;
}

interface Subscription {
  id: number;
  status: string;
  ciclo_cobranca: BillingCycle;
  valor_centavos: number;
  validade_ate: string;
  plano: Plan;
}

const formatPrice = (priceCents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceCents / 100);

const getAnnualDiscount = (monthlyPriceCents: number, annualPriceCents: number) => {
  const monthlyTotalCents = monthlyPriceCents * 12;
  if (monthlyTotalCents <= 0 || annualPriceCents <= 0 || annualPriceCents >= monthlyTotalCents) return null;
  return ((monthlyTotalCents - annualPriceCents) / monthlyTotalCents) * 100;
};

const formatDiscount = (discount: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(discount);

export default function Subscription() {
  const navigate = useNavigate();
  const { refreshSubscription } = useOutletContext<{ refreshSubscription?: () => void }>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensal');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    async function loadPlans() {
      setLoading(true);
      setError('');
      try {
        const [plansResponse, subscriptionResponse] = await Promise.all([
          apiFetch('/api/plans'),
          apiFetch('/api/subscription'),
        ]);
        if (!plansResponse.ok) throw new Error('Não foi possível carregar os planos.');
        if (!subscriptionResponse.ok) {
          const body = await subscriptionResponse.json().catch(() => null);
          throw new Error(body?.error || 'Não foi possível consultar sua assinatura.');
        }

        const planList: Plan[] = await plansResponse.json();
        const subscriptionData: { assinatura: Subscription | null } = await subscriptionResponse.json();
        if (!cancelled) {
          setPlans(planList);
          setSubscription(subscriptionData.assinatura);
          setSelectedPlanId(subscriptionData.assinatura?.plano.id ?? planList[0]?.id ?? null);
          setBillingCycle(subscriptionData.assinatura?.ciclo_cobranca ?? 'mensal');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar os planos.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPlans();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSimulatedCheckout = async () => {
    if (!selectedPlanId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/api/subscription/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId, billingCycle }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível simular a contratação.');

      setSubscription(result.assinatura);
      setSuccess(result.mensagem);
      refreshSubscription?.();
      if (result.assinatura?.plano?.nome === 'Institucional') {
        navigate('/institutional', { replace: true });
      }
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Erro ao simular a contratação.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedPrice = selectedPlan
    ? billingCycle === 'anual' ? selectedPlan.preco_anual_centavos : selectedPlan.preco_centavos
    : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-[#B71C1C]">Planos PathFinder</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Escolha ou altere seu plano</h1>
        <p className="mt-2 text-lg text-gray-700">Selecione um plano e um ciclo de cobrança para sua conta.</p>
      </header>

      <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5" role="note">
        <div className="flex gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 flex-shrink-0 text-amber-800" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-amber-950">Ambiente de demonstração</h2>
            <p className="mt-1 text-base text-amber-950">
              Os valores em reais são apenas para simulação. Não há cobrança, pagamento, aprovação financeira
              nem armazenamento de dados de cartão.
            </p>
          </div>
        </div>
      </section>

      {subscription?.status === 'simulada' && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-base text-gray-800">
          Plano atual: <strong>{subscription.plano.nome}</strong> — ciclo {subscription.ciclo_cobranca}.
          Ao confirmar uma opção, ela substituirá o plano atual em modo demonstrativo.
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-base font-medium text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-base font-medium text-green-900">
          <p>{success}</p>
          <button
            type="button"
            onClick={() => navigate('/subscription')}
            className="mt-3 inline-flex min-h-12 items-center rounded-lg bg-green-800 px-5 py-3 text-base font-bold text-white hover:bg-green-900"
          >
            Voltar ao meu plano
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-lg text-gray-700" role="status">Carregando planos...</p>
      ) : (
        <>
          <section aria-labelledby="billing-cycle-title" className="space-y-3">
            <h2 id="billing-cycle-title" className="text-xl font-bold text-gray-900">Ciclo de cobrança</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { value: 'mensal', label: 'Mensal', description: 'Valor cobrado por mês.' },
                { value: 'anual', label: 'Anual', description: 'Valor total do ano, conforme tabela.' },
              ] as const).map((cycle) => (
                <button
                  key={cycle.value}
                  type="button"
                  aria-pressed={billingCycle === cycle.value}
                  onClick={() => setBillingCycle(cycle.value)}
                  className={`rounded-xl border-2 bg-white p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-red-200 ${
                    billingCycle === cycle.value ? 'border-[#D32F2F] shadow-md' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="block text-lg font-bold text-gray-900">{cycle.label}</span>
                  <span className="mt-1 block text-base text-gray-700">{cycle.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" aria-label="Planos disponíveis">
            {plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const planPrice = billingCycle === 'anual' ? plan.preco_anual_centavos : plan.preco_centavos;
              const annualDiscount = getAnnualDiscount(plan.preco_centavos, plan.preco_anual_centavos);
              const isCurrentPlan = subscription?.status === 'simulada'
                && subscription.plano.id === plan.id
                && subscription.ciclo_cobranca === billingCycle;
              return (
                <button
                  key={plan.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`flex h-full flex-col rounded-2xl border-2 bg-white p-6 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-red-200 ${
                    selected ? 'border-[#D32F2F] shadow-lg' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-xl font-bold text-gray-900">{plan.nome}</span>
                    {selected && <Check className="h-6 w-6 text-[#D32F2F]" aria-label="Plano selecionado" />}
                  </span>
                  {isCurrentPlan && (
                    <span className="mt-2 w-fit rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-900">
                      Seu plano atual
                    </span>
                  )}
                  <span className="mt-4 text-3xl font-bold text-gray-900">{formatPrice(planPrice)}</span>
                  <span className="text-base text-gray-600">{billingCycle === 'anual' ? 'por ano (simulado)' : 'por mês (simulado)'}</span>
                  {billingCycle === 'anual' && annualDiscount !== null && (
                    <span className="mt-2 w-fit rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-900">
                      {formatDiscount(annualDiscount)}% de desconto vs. 12 mensalidades
                    </span>
                  )}
                  <span className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-base font-semibold text-gray-800">
                    Até {plan.max_dependentes} {plan.max_dependentes === 1 ? 'dependente' : 'dependentes'}
                  </span>
                  <span className="mt-4 flex-1 text-base leading-relaxed text-gray-700">{plan.descricao}</span>
                </button>
              );
            })}
          </section>

          {!plans.length && !error && (
            <p className="rounded-lg bg-white p-6 text-center text-lg text-gray-700">
              Nenhum plano está disponível no momento.
            </p>
          )}

          {plans.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CreditCard className="mt-1 h-7 w-7 flex-shrink-0 text-[#7d1f1f]" aria-hidden="true" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Resumo da opção selecionada</h2>
                  <p className="mt-2 text-lg text-gray-800">
                    {selectedPlan ? `${selectedPlan.nome} — ${formatPrice(selectedPrice)} / ${billingCycle === 'anual' ? 'ano' : 'mês'}` : 'Selecione um plano.'}
                  </p>
                  <p className="mt-2 text-base text-gray-700">
                    A confirmação registra a assinatura no banco e libera o acesso demonstrativo pelo período escolhido.
                    Nenhuma transação financeira será iniciada.
                  </p>
                  <button
                    type="button"
                    onClick={handleSimulatedCheckout}
                    disabled={submitting || !selectedPlanId}
                    className="mt-5 min-h-14 rounded-xl bg-[#D32F2F] px-7 py-4 text-lg font-bold text-white hover:bg-[#B71C1C] disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {submitting ? 'Registrando simulação...' : 'Confirmar plano demonstrativo'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
