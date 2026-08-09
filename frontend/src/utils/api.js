// Lightweight fetch-based API client
const BASE_URL = import.meta.env.VITE_API_URL || 'https://peace-mindset-backend.onrender.com/api';

const getToken = () => localStorage.getItem('token');

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  // Handle empty responses
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const error = new Error(data?.error || data?.message || 'Request failed');
    error.response = { data, status: res.status };
    throw error;
  }
  return { data };
};

const request = async (method, url, body, options = {}) => {
  const headers = {
    ...options.headers,
  };

  // Only set Content-Type for non-FormData requests
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    method,
    headers,
    credentials: 'include',
    mode: 'cors',
  };

  if (body !== undefined && body !== null) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  config.signal = controller.signal;

  try {
    const res = await fetch(`${BASE_URL}${url}`, config);
    clearTimeout(timeout);
    return await handleResponse(res);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      const error = new Error('Request timeout - please try again');
      error.response = { data: { error: 'Request timeout' }, status: 408 };
      throw error;
    }
    throw err;
  }
};

const upload = async (url, formData) => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    mode: 'cors',
    body: formData,
  });
  return await handleResponse(res);
};

const api = {
  get:    (url, opts)       => request('GET',    url, undefined, opts),
  post:   (url, body, opts) => request('POST',   url, body,      opts),
  put:    (url, body, opts) => request('PUT',    url, body,      opts),
  patch:  (url, body, opts) => request('PATCH',  url, body,      opts),
  delete: (url, opts)       => request('DELETE', url, undefined, opts),
  upload,
};

export default api;
