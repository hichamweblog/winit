'use client';

/**
 * Browser-side API helper.
 *
 * Adds the double-submit CSRF header to every mutation, enforces a sane default
 * request timeout (20s) so UI never hangs indefinitely, and turns non-2xx
 * responses into typed errors with friendly Arabic messages.
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

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './types';

export function csrfToken(): string | null {
  return readCookie(CSRF_COOKIE_NAME);
}

type Options = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;

export async function api<T = unknown>(url: string, options: Options = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const mutating = method !== 'GET' && method !== 'HEAD';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (mutating) {
    const token = csrfToken();
    if (token) headers[CSRF_HEADER_NAME] = token;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new ApiClientError(
        'استغرق الخادم وقتاً أطول من المتوقع؛ يرجى إعادة المحاولة',
        504,
        'timeout',
      );
    }
    throw new ApiClientError(
      'تعذر الاتصال بالخادم؛ تحقق من اتصال الإنترنت وأعد المحاولة',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHENTICATED_EVENT));
    }

    let defaultMsg = 'حدث خطأ غير متوقع';
    if (response.status === 504) defaultMsg = 'استغرق الخادم وقتاً أطول من المتوقع؛ يرجى إعادة المحاولة';
    else if (response.status === 502 || response.status === 503) {
      defaultMsg = 'الخدمة غير متاحة مؤقتاً؛ يرجى الانتظار لحظات ثم إعادة المحاولة';
    }

    throw new ApiClientError(
      (payload as { error?: string }).error ?? defaultMsg,
      response.status,
      (payload as { code?: string }).code,
      (payload as { requestId?: string }).requestId,
    );
  }

  return payload as T;
}
