import api from './api';

export const adminCrudAPI = {
  // Users
  getUsers: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  
  getUserDetail: (userId: number) =>
    api.get(`/admin/users/${userId}`),
  
  updateUser: (userId: number, data: any) =>
    api.put(`/admin/users/${userId}`, data),
  
  deleteUser: (userId: number) =>
    api.delete(`/admin/users/${userId}`),
  
  // Transactions
  getTransactions: (params?: { skip?: number; limit?: number; user_id?: number; type?: string }) =>
    api.get('/admin/transactions', { params }),
  
  deleteTransaction: (transactionId: number) =>
    api.delete(`/admin/transactions/${transactionId}`),
  
  // Reminders
  getReminders: (params?: { skip?: number; limit?: number; user_id?: number; completed?: boolean }) =>
    api.get('/admin/reminders', { params }),
  
  deleteReminder: (reminderId: number) =>
    api.delete(`/admin/reminders/${reminderId}`),
  
  // Stats
  getOverviewStats: () =>
    api.get('/admin/stats/overview'),
};
