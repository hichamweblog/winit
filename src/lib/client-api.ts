'use client';

/**
 * Browser-side API helper.
 *
 * Adds the double-submit CSRF header to every mutation and turns non-2xx
 * responses into typed errors. A 401 dispatches `winit:unauthenticated` so the
 * auth gate can show the login screen instead of leaving a broken board.
 */

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string, public requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const UNAUTHENTICATED_EVENT = 'winit:unauthenticated';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function csrfToken(): string | null {
  return readCookie('winit_csrf');
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal };

export async function api<T = unknown>(url: string, options: Options = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const mutating = method !== 'GET' && method !== 'HEAD';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (mutating) {
    const token = csrfToken();
    if (token) headers['x-csrf-token'] = token;
  }
  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
    credentials: 'same-origin',
    signal: options.signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHENTICATED_EVENT));
    }
    throw new ApiClientError(
      (payload as { error?: string }).error ?? 'حدث خطأ غير متوقع',
      response.status,
      (payload as { code?: string }).code,
      (payload as { requestId?: string }).requestId,
    );
  }
  return payload as T;
}
