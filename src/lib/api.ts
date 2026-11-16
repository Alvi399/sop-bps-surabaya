import axios from 'axios';

// Determine API URL based on environment (Defaults directly to Cloudflare tunnel VPS backend)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backendsop.serverbpsjosjis.dpdns.org/api';
const API_URL = API_BASE_URL;

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
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('bps_sop_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL, API_URL };