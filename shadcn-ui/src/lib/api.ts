import axios from 'axios';

// Determine API URL based on environment
const isDevelopment = import.meta.env.DEV;

const API_BASE_URL = isDevelopment
  ? 'http://localhost:8000/api'
  : (import.meta.env.VITE_API_URL || '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const auth = localStorage.getItem('bps_sop_auth');
    if (auth) {
      try {
        const { token } = JSON.parse(auth);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bps_sop_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };