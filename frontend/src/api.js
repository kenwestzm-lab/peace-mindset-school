import axios from "axios";

const API = axios.create({
  baseURL: "https://peace-mindset-school.vercel.app",
  timeout: 20000,
  withCredentials: true
});

export default API;
