import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach the token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token is invalid or expired, go back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.includes("/auth/login");
    if (err.response?.status === 401 && !isLogin) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const errorMessage = (err) =>
  err.response
    ? err.response.data?.message || `Server error (${err.response.status})`
    : "Cannot reach the server";

export default api;
