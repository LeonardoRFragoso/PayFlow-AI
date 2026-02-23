import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { adminAPI } from '../services/api';
import { adminCrudAPI } from '../services/adminAPI';
import { getErrorMessage } from '../utils/errorHandler';
import { Users, CreditCard, Bell, BarChart3, Edit2, Trash2, Search, RefreshCw, TrendingUp, TrendingDown, Wallet, Gem } from 'lucide-react';

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

type TabType = 'dashboard' | 'users' | 'transactions' | 'reminders';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [conversion, setConversion] = useState<ConversionMetrics | null>(null);
  const [churn, setChurn] = useState<ChurnMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // CRUD states
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [crudLoading, setCrudLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadOverviewStats();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'reminders') loadReminders();
  }, [activeTab]);

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
  
  const loadOverviewStats = async () => {
    try {
      const res = await adminCrudAPI.getOverviewStats();
      setOverviewStats(res.data);
    } catch (err: any) {
      console.error('Error loading overview stats:', err);
    }
  };
  
  const loadUsers = async () => {
    setCrudLoading(true);
    try {
      const res = await adminCrudAPI.getUsers({ search: searchTerm || undefined });
      setUsers(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setCrudLoading(false);
    }
  };
  
  const loadTransactions = async () => {
    setCrudLoading(true);
    try {
      const res = await adminCrudAPI.getTransactions();
      setTransactions(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setCrudLoading(false);
    }
  };
  
  const loadReminders = async () => {
    setCrudLoading(true);
    try {
      const res = await adminCrudAPI.getReminders();
      setReminders(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setCrudLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.')) return;
    try {
      await adminCrudAPI.deleteUser(userId);
      loadUsers();
      loadOverviewStats();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };
  
  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await adminCrudAPI.deleteTransaction(transactionId);
      loadTransactions();
      loadOverviewStats();
    } catch (err: any) {
      alert(getErrorMessage(err));
    }
  };
  
  const handleDeleteReminder = async (reminderId: number) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;
    try {
      await adminCrudAPI.deleteReminder(reminderId);
      loadReminders();
      loadOverviewStats();
    } catch (err: any) {
      alert(getErrorMessage(err));
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

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: BarChart3 },
    { id: 'users' as TabType, label: 'Usuários', icon: Users },
    { id: 'transactions' as TabType, label: 'Transações', icon: CreditCard },
    { id: 'reminders' as TabType, label: 'Lembretes', icon: Bell },
  ];
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Painel Administrativo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie todos os recursos do sistema</p>
        </div>
        
        {/* Overview Stats */}
        {overviewStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Total Usuários</p>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overviewStats.total_users}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">Usuários Ativos</p>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{overviewStats.active_users}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Transações</p>
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overviewStats.total_transactions}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Lembretes</p>
              </div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{overviewStats.total_reminders}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <p className="text-xs font-semibold text-pink-700 dark:text-pink-300">Assinaturas</p>
              </div>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{overviewStats.active_subscriptions}</p>
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
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
        )}
        
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <button
                  onClick={loadUsers}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {crudLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Carregando usuários...</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Telefone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Plano</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Transações</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.phone_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.plan === 'pro' 
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {user.plan || 'free'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.transactions_count}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Todas as Transações</h3>
              <button
                onClick={loadTransactions}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            
            {crudLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Carregando transações...</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Usuário</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Categoria</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{transaction.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{transaction.user_name}</td>
                          <td className="px-4 py-3">
                            {transaction.type === 'income' ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                                <TrendingUp className="w-3 h-3" /> Receita
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold">
                                <TrendingDown className="w-3 h-3" /> Despesa
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm font-bold ${
                            transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            R$ {Number(transaction.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{transaction.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Excluir transação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Todos os Lembretes</h3>
              <button
                onClick={loadReminders}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            
            {crudLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Carregando lembretes...</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Usuário</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Título</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {reminders.map((reminder) => (
                        <tr key={reminder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{reminder.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{reminder.user_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{reminder.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(reminder.due_date).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            {reminder.is_completed ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                Concluído
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteReminder(reminder.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Excluir lembrete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
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
