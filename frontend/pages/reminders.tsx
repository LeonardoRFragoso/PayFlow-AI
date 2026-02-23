import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { remindersAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';
import { Bell, Plus, Edit2, Trash2, Check, Clock, AlertCircle, Calendar, X, CheckCircle2 } from 'lucide-react';

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Lembretes</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                  {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                  {completedCount} concluído{completedCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Novo Lembrete
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowCompleted(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              !showCompleted
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pendentes
          </button>
          <button
            onClick={() => setShowCompleted(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              showCompleted
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Todos
          </button>
        </div>

        {/* Reminders list */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Carregando lembretes...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum lembrete encontrado</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crie seu primeiro lembrete</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reminders.map((r) => {
                const overdue = !r.is_completed && isOverdue(r.due_date);
                return (
                  <div key={r.id} className={`group flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50/30 dark:hover:from-gray-700/50 dark:hover:to-purple-900/10 transition-all duration-200 ${r.is_completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        onClick={() => !r.is_completed && handleComplete(r.id)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          r.is_completed
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 shadow-lg'
                            : 'border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                        }`}
                      >
                        {r.is_completed && <Check className="w-5 h-5 text-white" />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${r.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {r.title}
                        </p>
                        {r.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{r.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`flex items-center gap-1 text-xs ${
                            overdue
                              ? 'text-red-500 dark:text-red-400 font-semibold'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {overdue ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Calendar className="w-3 h-3" />
                            )}
                            <span>{new Date(r.due_date).toLocaleString('pt-BR')}</span>
                          </div>
                          {overdue && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">
                              Atrasado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => handleEdit(r)} 
                        className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(r.id)} 
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {editingId ? 'Editar Lembrete' : 'Novo Lembrete'}
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
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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
