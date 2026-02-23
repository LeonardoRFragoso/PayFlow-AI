import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { authAPI, billingAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import { User as UserIcon, Mail, Phone, Calendar, Gem, TrendingUp, MessageCircle, Sparkles } from 'lucide-react';

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
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Carregando perfil...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Meu Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : ''}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</label>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">WhatsApp</label>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.phone_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        {usage && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                <Gem className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Assinatura</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Plano Atual</span>
                <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full capitalize">
                  {usage.plan}
                </span>
              </div>
              
              <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Transações este mês</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {usage.used} / {usage.limit === 'unlimited' ? '∞' : usage.limit}
                  </span>
                </div>
                
                {usage.limit !== 'unlimited' ? (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          usage.percentage >= 90 ? 'bg-gradient-to-r from-red-500 to-pink-500' : usage.percentage >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                        style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{usage.percentage.toFixed(0)}% usado</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{usage.remaining} restantes</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Transações ilimitadas!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Guide */}
        <div className="relative bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-2xl shadow-lg p-6 border border-green-200 dark:border-green-800 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">💬 Como usar o WhatsApp</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Envie mensagens para nosso WhatsApp usando o número cadastrado acima.
              </p>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Exemplos de comandos:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 text-xs mt-0.5">•</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">"Gastei R$ 50 com almoço"</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 text-xs mt-0.5">•</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">"Recebi R$ 3000 de salário"</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 text-xs mt-0.5">•</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">"Quanto gastei esse mês?"</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 text-xs mt-0.5">•</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">"Lembrar de pagar conta dia 25"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
