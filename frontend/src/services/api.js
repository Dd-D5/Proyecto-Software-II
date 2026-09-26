/**
 * Helper centralizado para peticiones a la API REST de AegisTrap
 */

export function getApiBaseUrl() {
  const host = window.location.hostname || '127.0.0.1';
  const port = (import.meta && import.meta.env && import.meta.env.VITE_API_PORT) || '8085';
  return `http://${host}:${port}`;
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('aegis_token') || '';
  const url = `${getApiBaseUrl()}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 && endpoint !== '/api/login') {
    localStorage.removeItem('aegis_token');
    window.dispatchEvent(new Event('aegis_unauthorized'));
  }

  return response;
}
