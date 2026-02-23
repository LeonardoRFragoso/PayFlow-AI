import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { transactionsAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import { TrendingUp, TrendingDown, Wallet, Plus, Edit2, Trash2, Filter, Calendar, CreditCard, X } from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  category: string;
  description: string | null;
  payment_method: string;
  affects_balance: boolean;
  date: string;
  created_at: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  conta_corrente: 'Conta Corrente',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  outros: 'Outros',
};

const CATEGORIES = [
  'alimentacao', 'transporte', 'saude', 'lazer', 'educacao',
  'moradia', 'salario', 'freelance', 'investimento', 'outros'
];

const PAYMENT_METHODS = [
  'conta_corrente', 'cartao_credito', 'cartao_debito', 'pix', 'dinheiro', 'outros'
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: 'outros',
    description: '',
    payment_method: 'conta_corrente',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await transactionsAPI.getAll(200);
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        ...form,
        amount: parseFloat(form.amount),
      };
      if (editingId) {
        await transactionsAPI.update(editingId, data);
      } else {
        await transactionsAPI.create(data);
      }
      setShowModal(false);
      resetForm();
      loadTransactions();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setForm({
      type: t.type,
      amount: t.amount.toString(),
      category: t.category,
      description: t.description || '',
      payment_method: t.payment_method,
      date: t.date,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await transactionsAPI.delete(id);
      loadTransactions();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      type: 'expense',
      amount: '',
      category: 'outros',
      description: '',
      payment_method: 'conta_corrente',
      date: new Date().toISOString().split('T')[0],
    });
    setError('');
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const txList = Array.isArray(transactions) ? transactions : [];

  const filtered = txList.filter((t) => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const totalIncome = txList
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = txList
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Transações</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie suas receitas e despesas</p>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Nova Transação
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-green-200 dark:border-green-800 overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-400/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Receitas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {Number(totalIncome).toFixed(2)}</p>
            </div>
          </div>
          <div className="group relative bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-red-200 dark:border-red-800 overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-400/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Despesas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {Number(totalExpense).toFixed(2)}</p>
            </div>
          </div>
          <div className={`group relative bg-gradient-to-br ${totalIncome - totalExpense >= 0 ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800' : 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800'} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-20 h-20 ${totalIncome - totalExpense >= 0 ? 'bg-blue-400/10' : 'bg-orange-400/10'} rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 ${totalIncome - totalExpense >= 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-orange-100 dark:bg-orange-900/40'} rounded-lg`}>
                  <Wallet className={`w-5 h-5 ${totalIncome - totalExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>
              </div>
              <p className={`text-sm font-medium ${totalIncome - totalExpense >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'} mb-1`}>Saldo</p>
              <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                R$ {(totalIncome - totalExpense).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtrar:</span>
          </div>
          <div className="flex gap-2">
            {(['all', 'income', 'expense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'income' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction list */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Carregando transações...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Adicione sua primeira transação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((t) => (
                <div key={t.id} className="group flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 dark:hover:from-gray-700/50 dark:hover:to-blue-900/10 transition-all duration-200">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      t.type === 'income' ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30' : 'bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30'
                    }`}>
                      {t.type === 'income' ? (
                        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate capitalize">
                        {t.category} {t.description ? `- ${t.description}` : ''}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <CreditCard className="w-3 h-3" />
                        <span>{PAYMENT_LABELS[t.payment_method] || t.payment_method}</span>
                        <span>·</span>
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        {!t.affects_balance && (
                          <>
                            <span>·</span>
                            <span className="text-orange-500 dark:text-orange-400">Não afeta saldo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-base font-bold ${
                      t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => handleEdit(t)} 
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pagamento</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>{PAYMENT_LABELS[pm]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
