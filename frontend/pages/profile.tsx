import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { authAPI, billingAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';

interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  created_at: string;
}

interface Usage {
  plan: string;
  limit: number | string;
  used: number;
  remaining: number | string;
  percentage: number;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, usageRes] = await Promise.all([
        authAPI.getMe(),
        billingAPI.getUsage(),
      ]);
      setUser(userRes.data);
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
          <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Perfil</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user?.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">WhatsApp</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user?.phone_number}</p>
            </div>
          </div>
        </div>

        {usage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Assinatura</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Plano</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{usage.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Transações este mês</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {usage.used} / {usage.limit === 'unlimited' ? '∞' : usage.limit}
                </span>
              </div>
              {usage.limit !== 'unlimited' && (
                <>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        usage.percentage >= 90 ? 'bg-red-500' : usage.percentage >= 70 ? 'bg-yellow-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Restantes</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{usage.remaining}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4 rounded-r-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Como usar o WhatsApp</h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <p>Envie mensagens para nosso WhatsApp usando o número cadastrado acima.</p>
            <p className="font-medium">Exemplos:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>"Gastei R$ 50 com almoço"</li>
              <li>"Recebi R$ 3000 de salário"</li>
              <li>"Quanto gastei esse mês?"</li>
              <li>"Lembrar de pagar conta dia 25"</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
