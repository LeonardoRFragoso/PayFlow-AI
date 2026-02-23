import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { billingAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import { Gem, Check, Crown, Zap, Shield, TrendingUp, CreditCard, X, AlertTriangle, Sparkles } from 'lucide-react';

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
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Carregando planos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Planos e Assinatura</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Escolha o plano ideal para suas necessidades</p>
        </div>

        {/* Usage card - Modern */}
        {usage && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg p-6 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Uso do Plano</h2>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Plano atual:</span>
                <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-full capitalize">
                  {usage.plan}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {usage.used} / {usage.limit === 'unlimited' ? '∞' : usage.limit} transações
              </span>
            </div>
            
            {usage.limit !== 'unlimited' ? (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      usage.percentage >= 90 ? 'bg-gradient-to-r from-red-500 to-pink-500' : usage.percentage >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {usage.remaining === 0
                    ? '⚠️ Limite atingido! Faça upgrade para continuar.'
                    : `${usage.remaining} transações restantes este mês (${usage.percentage.toFixed(0)}% usado)`}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Sparkles className="w-4 h-4" />
                <p className="text-sm font-semibold">Transações ilimitadas ativadas!</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={loadPayments}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Ver histórico de pagamentos
              </button>
              {usage.plan !== 'free' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Cancelar assinatura
                </button>
              )}
            </div>
          </div>
        )}

        {/* Plans grid - Premium design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isCurrent = usage?.plan === plan.slug;
            const isPro = plan.slug === 'pro';
            return (
              <div
                key={plan.id}
                className={`group relative bg-gradient-to-br rounded-2xl shadow-xl p-8 border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
                  isPro
                    ? 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-500 dark:border-indigo-400'
                    : 'from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-gray-200 dark:border-gray-700'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    <Crown className="w-3.5 h-3.5" />
                    RECOMENDADO
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${
                    isPro 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                      : 'bg-gradient-to-br from-gray-400 to-blue-500'
                  }`}>
                    {isPro ? (
                      <Gem className="w-6 h-6 text-white" />
                    ) : (
                      <Shield className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      R$ {Number(plan.price).toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">/mês</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <li key={key} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="mt-0.5 p-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="capitalize flex-1"><strong>{key}:</strong> {value}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="mt-0.5 p-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="flex-1">
                      {plan.transaction_limit ? `${plan.transaction_limit} transações/mês` : '✨ Transações ilimitadas'}
                    </span>
                  </li>
                </ul>

                {isCurrent ? (
                  <div className="w-full py-3 text-center text-sm font-bold bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 rounded-xl border-2 border-green-500 dark:border-green-600">
                    ✓ Plano Atual
                  </div>
                ) : plan.price > 0 ? (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {checkoutLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Assinar Agora
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                    Plano Gratuito
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment history modal */}
        {showPayments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Histórico de Pagamentos</h2>
                </div>
                <button 
                  onClick={() => setShowPayments(false)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cancelar Assinatura</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Tem certeza? Você perderá acesso aos recursos do plano Pro e voltará ao plano gratuito com limite de 20 transações/mês.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Manter Plano
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg"
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
