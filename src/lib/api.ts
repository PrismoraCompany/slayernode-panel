/**
 * Shared SlayerNode Authenticated Fetch & CSRF Wrapper
 * Sends HttpOnly session cookies (credentials: 'same-origin') and binds X-CSRF-Token
 * automatically to all mutating API requests.
 */

let currentCsrfToken = '';

export function setCsrfToken(token: string | null | undefined) {
  currentCsrfToken = token ? String(token) : '';
}

export function getCsrfToken(): string {
  return currentCsrfToken;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = String(init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || {});

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && currentCsrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', currentCsrfToken);
  }

  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
}

export async function apiJson<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, init);
  if (res.status === 204) {
    return null as T;
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const errMsg =
      data?.error ||
      data?.errors?.[0]?.detail ||
      data?.message ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return data as T;
}
