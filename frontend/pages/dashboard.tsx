import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { reportsAPI, billingAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import Link from 'next/link';

interface DashboardData {
  summary: {
    period: string;
    total_income: number;
    total_expenses: number;
    balance: number;
    transaction_count: number;
    by_category: { category: string; type: string; total: number }[];
  };
  recent_transactions: any[];
  upcoming_reminders: any[];
}

interface Usage {
  plan: string;
  limit: number | string;
  used: number;
  remaining: number | string;
  percentage: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, usageRes] = await Promise.all([
        reportsAPI.getDashboard(),
        billingAPI.getUsage(),
      ]);
      setData(dashRes.data);
      setUsage(usageRes.data);
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
          <p className="text-gray-500 dark:text-gray-400 text-lg">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => { setError(''); loadData(); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const expenseCategories = data?.summary?.by_category?.filter((c) => c.type === 'expense') || [];
  const incomeCategories = data?.summary?.by_category?.filter((c) => c.type === 'income') || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {data?.summary?.period || ''}
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Receitas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              R$ {Number(data?.summary?.total_income || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Despesas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              R$ {Number(data?.summary?.total_expenses || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Geral</p>
            <p className={`text-2xl font-bold mt-1 ${(data?.summary?.balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              R$ {Number(data?.summary?.balance || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Transações</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {data?.summary?.transaction_count || 0}
            </p>
          </div>
        </div>

        {/* Plan usage */}
        {usage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Plano <span className="capitalize">{usage.plan}</span>
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {usage.used} / {usage.limit === 'unlimited' ? '∞' : usage.limit} transações
              </span>
            </div>
            {usage.limit !== 'unlimited' ? (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      usage.percentage >= 90 ? 'bg-red-500' : usage.percentage >= 70 ? 'bg-yellow-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                  />
                </div>
                {usage.percentage >= 80 && (
                  <Link href="/plans" className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
                    Fazer upgrade para transações ilimitadas
                  </Link>
                )}
              </>
            ) : (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Transações ilimitadas</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Transações Recentes</h3>
              <Link href="/transactions" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Ver todas</Link>
            </div>
            <div className="p-5">
              {data?.recent_transactions && data.recent_transactions.length > 0 ? (
                <div className="space-y-3">
                  {data.recent_transactions.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {t.category}{t.description ? ` - ${t.description}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ml-3 ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma transação registrada</p>
              )}
            </div>
          </div>

          {/* Upcoming reminders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Próximos Lembretes</h3>
              <Link href="/reminders" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Ver todos</Link>
            </div>
            <div className="p-5">
              {data?.upcoming_reminders && data.upcoming_reminders.length > 0 ? (
                <div className="space-y-3">
                  {data.upcoming_reminders.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{r.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-3">
                        {new Date(r.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lembrete pendente</p>
              )}
            </div>
          </div>
        </div>

        {/* Categories breakdown */}
        {expenseCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Despesas por Categoria</h3>
            <div className="space-y-3">
              {expenseCategories.map((cat, i) => {
                const maxTotal = Math.max(...expenseCategories.map((c) => c.total));
                const pct = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{cat.category}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">R$ {Number(cat.total).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-red-400 dark:bg-red-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WhatsApp tip */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4 rounded-r-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Use o WhatsApp!</h3>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
            Envie mensagens como "Gastei R$ 50 com almoço" ou "Quanto gastei esse mês?" para registrar e consultar suas finanças rapidamente.
          </p>
        </div>
      </div>
    </Layout>
  );
}
