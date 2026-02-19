import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { adminAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';

interface Metrics {
  total_users: number;
  active_subscriptions: number;
  total_transactions: number;
  total_revenue: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
}

interface FunnelMetrics {
  registered: number;
  first_transaction: number;
  active_7d: number;
  subscribed: number;
  conversion_rates: Record<string, number>;
}

interface ConversionMetrics {
  free_to_paid: number;
  trial_to_paid: number;
  total_free: number;
  total_paid: number;
}

interface ChurnMetrics {
  churned_users: number;
  total_active: number;
  churn_rate: number;
}

export default function Admin() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [conversion, setConversion] = useState<ConversionMetrics | null>(null);
  const [churn, setChurn] = useState<ChurnMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metricsRes, funnelRes, conversionRes, churnRes] = await Promise.all([
        adminAPI.getMetrics(),
        adminAPI.getFunnel(),
        adminAPI.getConversion(),
        adminAPI.getChurn(),
      ]);
      setMetrics(metricsRes.data);
      setFunnel(funnelRes.data);
      setConversion(conversionRes.data);
      setChurn(churnRes.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500 dark:text-gray-400">Carregando métricas...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-6 rounded-lg">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Painel Admin</h1>

        {/* Key metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Usuários" value={metrics.total_users} />
            <MetricCard label="Assinaturas Ativas" value={metrics.active_subscriptions} />
            <MetricCard label="Total Transações" value={metrics.total_transactions} />
            <MetricCard label="Receita Total" value={`R$ ${Number(metrics.total_revenue || 0).toFixed(2)}`} />
            <MetricCard label="Novos Hoje" value={metrics.new_users_today} color="green" />
            <MetricCard label="Novos Semana" value={metrics.new_users_this_week} color="blue" />
            <MetricCard label="Novos Mês" value={metrics.new_users_this_month} color="purple" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel */}
          {funnel && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Funil de Conversão</h3>
              <div className="space-y-3">
                <FunnelStep label="Registrados" value={funnel.registered} max={funnel.registered} />
                <FunnelStep label="1ª Transação" value={funnel.first_transaction} max={funnel.registered} />
                <FunnelStep label="Ativos (7d)" value={funnel.active_7d} max={funnel.registered} />
                <FunnelStep label="Assinantes" value={funnel.subscribed} max={funnel.registered} />
              </div>
              {funnel.conversion_rates && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  {Object.entries(funnel.conversion_rates).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{(Number(value) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversion & Churn */}
          <div className="space-y-6">
            {conversion && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Conversão</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Free → Pago</p>
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {(Number(conversion.free_to_paid || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Usuários Free</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{conversion.total_free}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Usuários Pagos</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{conversion.total_paid}</p>
                  </div>
                </div>
              </div>
            )}

            {churn && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Churn</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Taxa Churn</p>
                    <p className={`text-2xl font-bold ${churn.churn_rate > 0.1 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {(Number(churn.churn_rate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Churned</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{churn.churned_users}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ativos</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{churn.total_active}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClasses: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    default: 'text-gray-900 dark:text-gray-100',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colorClasses[color || 'default']}`}>{value}</p>
    </div>
  );
}

function FunnelStep({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div className="bg-primary-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
