import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { remindersAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';

interface Reminder {
  id: number;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  created_at: string;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadReminders();
  }, [showCompleted]);

  const loadReminders = async () => {
    try {
      const res = await remindersAPI.getAll(showCompleted);
      setReminders(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        title: form.title,
        description: form.description || null,
        due_date: form.due_date + ':00',
      };
      if (editingId) {
        await remindersAPI.update(editingId, data);
      } else {
        await remindersAPI.create(data);
      }
      setShowModal(false);
      resetForm();
      loadReminders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (r: Reminder) => {
    setEditingId(r.id);
    const dt = r.due_date.slice(0, 16);
    setForm({
      title: r.title,
      description: r.description || '',
      due_date: dt,
    });
    setShowModal(true);
  };

  const handleComplete = async (id: number) => {
    try {
      await remindersAPI.markCompleted(id);
      loadReminders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;
    try {
      await remindersAPI.delete(id);
      loadReminders();
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', description: '', due_date: '' });
    setError('');
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const pendingCount = reminders.filter((r) => !r.is_completed).length;
  const completedCount = reminders.filter((r) => r.is_completed).length;

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date() ;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lembretes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} · {completedCount} concluído{completedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            + Novo Lembrete
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCompleted(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showCompleted
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setShowCompleted(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCompleted
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando...</div>
          ) : reminders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum lembrete encontrado</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reminders.map((r) => (
                <div key={r.id} className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${r.is_completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      onClick={() => !r.is_completed && handleComplete(r.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        r.is_completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                      }`}
                    >
                      {r.is_completed && '✓'}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${r.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {r.title}
                      </p>
                      {r.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.description}</p>
                      )}
                      <p className={`text-xs mt-0.5 ${
                        !r.is_completed && isOverdue(r.due_date)
                          ? 'text-red-500 dark:text-red-400 font-medium'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {new Date(r.due_date).toLocaleString('pt-BR')}
                        {!r.is_completed && isOverdue(r.due_date) && ' · Atrasado!'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 text-sm">✏️</button>
                    <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingId ? 'Editar Lembrete' : 'Novo Lembrete'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ex: Pagar conta de luz"
                />
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data e Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
