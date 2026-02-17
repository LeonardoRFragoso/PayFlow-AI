import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone_number: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const transactionsAPI = {
  getAll: (limit = 100, offset = 0) =>
    api.get(`/transactions/?limit=${limit}&offset=${offset}`),
  getById: (id: number) => api.get(`/transactions/${id}`),
  create: (data: any) => api.post('/transactions/', data),
  update: (id: number, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  getByDateRange: (startDate: string, endDate: string) =>
    api.get(`/transactions/date-range/?start_date=${startDate}&end_date=${endDate}`),
};

export const remindersAPI = {
  getAll: (includeCompleted = false) =>
    api.get(`/reminders/?include_completed=${includeCompleted}`),
  getUpcoming: (days = 7) => api.get(`/reminders/upcoming?days=${days}`),
  getById: (id: number) => api.get(`/reminders/${id}`),
  create: (data: any) => api.post('/reminders/', data),
  update: (id: number, data: any) => api.put(`/reminders/${id}`, data),
  markCompleted: (id: number) => api.post(`/reminders/${id}/complete`),
  delete: (id: number) => api.delete(`/reminders/${id}`),
};

export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMonthly: (year: number, month: number) =>
    api.get(`/reports/monthly/${year}/${month}`),
  getCurrentMonth: () => api.get('/reports/current-month'),
  getPeriod: (startDate: string, endDate: string) =>
    api.get(`/reports/period?start_date=${startDate}&end_date=${endDate}`),
};

export default api;
