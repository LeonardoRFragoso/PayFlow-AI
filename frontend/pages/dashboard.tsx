import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { reportsAPI, transactionsAPI, remindersAPI } from '@/services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  LogOut,
  PieChart,
  List
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const balance = summary.balance || 0;
  const isPositive = balance >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Assistente Financeiro</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Receitas</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {summary.total_income?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {summary.total_expenses?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Saldo</p>
                <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {balance.toFixed(2)}
                </p>
              </div>
              <div className={`${isPositive ? 'bg-green-100' : 'bg-red-100'} p-3 rounded-full`}>
                <Wallet className={`w-6 h-6 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <List className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">Transações Recentes</h2>
            </div>
            <div className="space-y-3">
              {dashboardData?.recent_transactions?.length > 0 ? (
                dashboardData.recent_transactions.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.category}</p>
                      <p className="text-sm text-gray-600">{transaction.description || 'Sem descrição'}</p>
                      <p className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhuma transação registrada</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">Próximos Lembretes</h2>
            </div>
            <div className="space-y-3">
              {dashboardData?.upcoming_reminders?.length > 0 ? (
                dashboardData.upcoming_reminders.map((reminder: any) => (
                  <div key={reminder.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-primary-100 p-2 rounded-full mt-1">
                      <Calendar className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{reminder.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(reminder.due_date).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(reminder.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum lembrete pendente</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-primary-900 mb-2">💬 Use o WhatsApp!</h3>
          <p className="text-primary-800">
            Envie mensagens para o nosso WhatsApp para registrar despesas, receitas e criar lembretes de forma rápida e fácil!
          </p>
          <p className="text-sm text-primary-700 mt-2">
            Exemplos: "Gastei R$ 50 com almoço", "Recebi R$ 3000 de salário", "Lembrar de pagar conta amanhã"
          </p>
        </div>
      </main>
    </div>
  );
}
