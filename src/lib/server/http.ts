/**
 * Shared HTTP plumbing for the API: typed errors, request ids, structured
 * logging, strict JSON body parsing, CSRF defence and rate limiting.
 *
 * Everything here is server-only. Nothing in this file may be imported from a
 * client component.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeEqual } from './password';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'bad_request',
    public headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const MAX_BODY_BYTES = 64 * 1024;

/** JSON response that always carries the request id and never caches. */
export function json(data: unknown, status = 200, requestId?: string, extra?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
      ...(requestId ? { 'x-request-id': requestId } : {}),
      ...extra,
    },
  });
}

/**
 * Strict JSON body reader.
 *
 * Rejects anything that is not `application/json`, which — combined with the
 * Origin check below — blocks simple cross-site form posts (they can only send
 * urlencoded/multipart/text-plain, none of which pass here).
 */
export async function readJson<T extends z.ZodType>(request: NextRequest, schema: T): Promise<z.infer<T>> {
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) {
    throw new ApiError(415, 'نوع المحتوى غير مدعوم؛ أرسل application/json', 'unsupported_media_type');
  }
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new ApiError(413, 'حجم الطلب أكبر من المسموح', 'payload_too_large');
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw new ApiError(413, 'حجم الطلب أكبر من المسموح', 'payload_too_large');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'صيغة JSON غير صالحة', 'invalid_json');
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path?.join('.');
    throw new ApiError(400, issue?.message || 'بيانات غير صالحة', 'validation_failed', field ? { 'x-validation-field': field } : undefined);
  }
  return result.data;
}

/**
 * Same-origin check for state-changing requests.
 *
 * Browsers always send Origin on cross-site fetch/form POSTs. If it is present
 * it must match the request URL's origin (or the configured public origin when
 * running behind a proxy). Non-browser clients send no Origin and are allowed
 * through — they cannot ride a user's ambient cookies.
 */
export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (origin === 'null') throw new ApiError(403, 'مصدر الطلب غير موثوق', 'bad_origin');

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, 'مصدر الطلب غير موثوق', 'bad_origin');
  }

  // Compare HOSTS, not full origins. Behind a TLS-terminating proxy the browser
  // sends `https://app.example.com` while Next may reconstruct `http://…`
  // internally; requiring an exact scheme match would 403 every mutation in
  // that (very common) deployment. An attacker still needs a page on the same
  // host, which is same-origin by definition, so this relaxation is safe.
  const allowedHosts = new Set<string>([request.nextUrl.host]);
  const host = request.headers.get('host');
  if (host) allowedHosts.add(host);
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) allowedHosts.add(forwardedHost.split(',')[0].trim());
  const configured = process.env.WINIT_PUBLIC_ORIGIN;
  if (configured) {
    try { allowedHosts.add(new URL(configured).host); } catch { /* ignore a malformed setting */ }
  }

  if (!allowedHosts.has(originHost)) {
    throw new ApiError(403, 'مصدر الطلب غير موثوق', 'bad_origin');
  }
}

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/types';

/** Double-submit CSRF token for cookie-authenticated mutations. */
export const CSRF_COOKIE = CSRF_COOKIE_NAME;
export const CSRF_HEADER = CSRF_HEADER_NAME;

export function assertCsrf(request: NextRequest) {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  const header = request.headers.get(CSRF_HEADER);
  if (!cookie || !header || !safeEqual(cookie, header)) {
    throw new ApiError(403, 'انتهت صلاحية الجلسة؛ أعد تحميل الصفحة', 'csrf_failed');
  }
}

/* ------------------------------------------------------------------ */
/*  Rate limiting                                                      */
/*  Fixed-window counters in process memory. Correct for a single      */
/*  instance; a multi-instance deployment must swap this for Redis.    */
/* ------------------------------------------------------------------ */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export function clientIp(request: NextRequest): string {
  // Only trust proxy headers when the operator says we are behind a proxy.
  if (process.env.WINIT_TRUST_PROXY === '1') {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64);
    const real = request.headers.get('x-real-ip');
    if (real) return real.slice(0, 64);
  }
  return 'local';
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

export function enforceRateLimit(request: NextRequest, scope: string, limit: number, windowMs: number) {
  const result = rateLimit(`${scope}:${clientIp(request)}`, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(429, 'محاولات كثيرة خلال وقت قصير؛ انتظر قليلاً ثم أعد المحاولة', 'rate_limited', {
      'retry-after': String(result.retryAfter),
    });
  }
  return result;
}

/** Test helper — never called by application code. */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}

/* ------------------------------------------------------------------ */
/*  Handler wrapper                                                    */
/* ------------------------------------------------------------------ */

type Handler = (request: NextRequest, context: { requestId: string }) => Promise<NextResponse>;

/**
 * Wraps a route handler with a request id, one structured log line per request,
 * and a single place where errors become responses. Stack traces never reach
 * the client.
 */
export function withApi(route: string, handler: Handler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    let response: NextResponse;
    try {
      response = await handler(request, { requestId });
    } catch (cause) {
      if (cause instanceof ApiError) {
        response = json({ error: cause.message, code: cause.code, requestId }, cause.status, requestId, cause.headers);
      } else if (cause instanceof z.ZodError) {
        response = json({ error: cause.issues[0]?.message ?? 'بيانات غير صالحة', code: 'validation_failed', requestId }, 400, requestId);
      } else {
        log('error', route, requestId, request, 500, started, cause);
        return json({ error: 'حدث خطأ غير متوقع في الخادم', code: 'internal_error', requestId }, 500, requestId);
      }
    }
    response.headers.set('x-request-id', requestId);
    response.headers.set('cache-control', 'no-store');
    log(response.status >= 500 ? 'error' : 'info', route, requestId, request, response.status, started);
    return response;
  };
}

function log(
  level: 'info' | 'error',
  route: string,
  requestId: string,
  request: NextRequest,
  status: number,
  started: number,
  cause?: unknown,
) {
  const entry = {
    level,
    requestId,
    method: request.method,
    // The pathname only — query strings can contain journal search terms.
    path: request.nextUrl.pathname,
    status,
    ms: Date.now() - started,
    ...(cause ? { error: cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}
