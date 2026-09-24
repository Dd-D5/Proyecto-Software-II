/**
 * Helper centralizado para peticiones a la API REST de AegisTrap
 */

export function getApiBaseUrl() {
  const host = window.location.hostname || '127.0.0.1';
  return `http://${host}:8080`;
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
