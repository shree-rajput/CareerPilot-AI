import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("careerpilot_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
