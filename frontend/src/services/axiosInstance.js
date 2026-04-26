import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taskflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 with refresh token
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/refresh') {
        localStorage.removeItem("taskflow_token");
        localStorage.removeItem("taskflow_refresh");
        localStorage.removeItem("taskflow_user");
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("taskflow_refresh");
        if (!refreshToken) throw new Error('No refresh token');

        const res = await api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data;

        localStorage.setItem("taskflow_token", accessToken);
        localStorage.setItem("taskflow_refresh", newRefresh);

        refreshQueue.forEach(p => p.resolve(accessToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach(p => p.reject(refreshError));
        refreshQueue = [];
        localStorage.removeItem("taskflow_token");
        localStorage.removeItem("taskflow_refresh");
        localStorage.removeItem("taskflow_user");
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
