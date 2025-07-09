import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  regenerateApiKey: () => api.post('/auth/regenerate-api-key'),
};

// URL endpoints
export const urlAPI = {
  create: (data) => api.post('/urls/shorten', data),
  getAll: (params) => api.get('/urls', { params }),
  getOne: (id) => api.get(`/urls/${id}`),
  update: (id, data) => api.put(`/urls/${id}`, data),
  delete: (id) => api.delete(`/urls/${id}`),
};

// Analytics endpoints
export const analyticsAPI = {
  getUrlAnalytics: (id, params) => api.get(`/analytics/url/${id}`, { params }),
  getDashboardStats: (params) => api.get('/analytics/dashboard', { params }),
};

// Webhook endpoints
export const webhookAPI = {
  create: (data) => api.post('/webhooks', data),
  getAll: () => api.get('/webhooks'),
  update: (id, data) => api.put(`/webhooks/${id}`, data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  test: (id) => api.post(`/webhooks/${id}/test`),
};

export default api;