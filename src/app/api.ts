export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isApiRequest = new URL(requestUrl, window.location.origin).pathname.startsWith('/api/');
  const token = isApiRequest ? localStorage.getItem('authToken') : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
