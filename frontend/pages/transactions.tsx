import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { transactionsAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transações</h1>
          <button
            onClick={openNewModal}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            + Nova Transação
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Receitas</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {Number(totalIncome).toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Despesas</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">R$ {Number(totalExpense).toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
            <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              R$ {(totalIncome - totalExpense).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhuma transação encontrada</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      t.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <span className="text-lg">{t.type === 'income' ? '💰' : '💸'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {t.category} {t.description ? `- ${t.description}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {PAYMENT_LABELS[t.payment_method] || t.payment_method} · {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {!t.affects_balance && ' · Não afeta saldo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-bold ${
                      t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                    </span>
                    <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 text-sm">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm">
                      🗑️
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingId ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
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
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
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
