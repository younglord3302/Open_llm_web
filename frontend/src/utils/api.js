/**
 * Centralised API utility — automatically injects Bearer token
 * and base URL into every request.
 */
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('llm_token');
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

export const api = {
  async get(path) {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    if (res.status === 401) throw new AuthError();
    return res;
  },

  async post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    if (res.status === 401) throw new AuthError();
    return res;
  },

  async delete(path) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.status === 401) throw new AuthError();
    return res;
  },

  // Special: multipart upload with auth
  async upload(path, formData) {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (res.status === 401) throw new AuthError();
    return res;
  },

  // Special: SSE streaming with auth
  async stream(path, body) {
    const token = getToken();
    return fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  },

  // Auth-specific (no token needed)
  async login(email, password) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res;
  },

  async register(email, password, name) {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    return res;
  }
};

export class AuthError extends Error {
  constructor() {
    super('Session expired. Please log in again.');
    this.name = 'AuthError';
  }
}
