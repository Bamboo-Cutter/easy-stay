import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// 自动带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (data) =>
  api.post("/auth/login", data);

export const getMe = () =>
  api.get("/auth/me");

export const register = (data) => api.post("/auth/register", data);
