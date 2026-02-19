import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { billingAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';

interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billing_cycle: string;
  features: Record<string, string>;
  transaction_limit: number | null;
  is_active: boolean;
}

interface Usage {
  plan: string;
  limit: number | string;
  used: number;
  remaining: number | string;
  percentage: number;
}

interface Payment {
  id: number;
  mp_payment_id: string | null;
  status: string;
  event_type: string;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  created_at: string;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    
    // Revalidar ao focar na janela (usuário volta do Mercado Pago)
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, usageRes] = await Promise.all([
        billingAPI.getPlans(),
        billingAPI.getUsage(),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setUsage(usageRes.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await billingAPI.getPayments();
      setPayments(res.data);
      setShowPayments(true);
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleCheckout = async (planId: number) => {
    setCheckoutLoading(true);
    try {
      const res = await billingAPI.createCheckout(planId);
      if (res.data.checkout_url) {
        window.open(res.data.checkout_url, '_blank');
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await billingAPI.cancelSubscription();
      alert('Assinatura cancelada com sucesso');
      setShowCancelModal(false);
      loadData();
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setCancelLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    approved: 'Aprovado',
    pending: 'Pendente',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planos e Assinatura</h1>

        {/* Usage card */}
        {usage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Uso do Plano</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Plano atual: <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{usage.plan}</span>
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {usage.used} / {usage.limit === 'unlimited' ? '∞' : usage.limit} transações
              </span>
            </div>
            {usage.limit !== 'unlimited' && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    usage.percentage >= 90 ? 'bg-red-500' : usage.percentage >= 70 ? 'bg-yellow-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                />
              </div>
            )}
            {usage.limit !== 'unlimited' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {usage.remaining === 0
                  ? 'Limite atingido! Faça upgrade para continuar.'
                  : `${usage.remaining} transações restantes este mês`}
              </p>
            )}
            {usage.limit === 'unlimited' && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">Transações ilimitadas</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={loadPayments}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ver histórico de pagamentos
              </button>
              {usage.plan !== 'free' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isCurrent = usage?.plan === plan.slug;
            const isPro = plan.slug === 'pro';
            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 transition-colors ${
                  isPro
                    ? 'border-primary-500 dark:border-primary-400'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    RECOMENDADO
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    R$ {Number(plan.price).toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/mês</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <li key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-green-500">✓</span>
                      <span className="capitalize">{key}: {value}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500">✓</span>
                    {plan.transaction_limit ? `${plan.transaction_limit} transações/mês` : 'Transações ilimitadas'}
                  </li>
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2 text-center text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    Plano Atual
                  </div>
                ) : plan.price > 0 ? (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading}
                    className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {checkoutLoading ? 'Processando...' : 'Assinar Agora'}
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    Plano Gratuito
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment history modal */}
        {showPayments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Histórico de Pagamentos</h2>
                <button onClick={() => setShowPayments(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
              </div>
              <div className="p-6">
                {payments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center">Nenhum pagamento encontrado</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{p.event_type}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(p.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          {p.amount && (
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">R$ {Number(p.amount).toFixed(2)}</p>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            p.status === 'approved'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : p.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {statusLabels[p.status] || p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancel modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Cancelar Assinatura</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Tem certeza? Você perderá acesso aos recursos do plano Pro e voltará ao plano gratuito com limite de 20 transações/mês.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Manter Plano
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {cancelLoading ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
