import { API_CONFIG } from '@/config/api';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';
const SESSION_KEY = 'sessionId';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: unknown, sessionId?: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_CONFIG.API_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: T & { success?: boolean; message?: string };
  try {
    data = (text ? JSON.parse(text) : {}) as T & { success?: boolean; message?: string };
  } catch {
    throw new Error(text || `Request failed (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}
