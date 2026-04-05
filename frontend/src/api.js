import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://peace-mindset-backend.onrender.com/api",
  timeout: 20000,
  withCredentials: true
});

export default API;
