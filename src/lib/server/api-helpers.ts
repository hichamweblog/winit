import { NextRequest } from 'next/server';
import { ApiError, assertCsrf, assertSameOrigin, enforceRateLimit } from './http';
import type { Identity } from './auth';
import { dateKey } from './dto';

export const stamp = () => new Date();
export const newId = () => crypto.randomUUID();

export const notFound = (what: string) => new ApiError(404, `${what} غير موجود`, 'not_found');

/** Query-string date, validated — an invalid value is a 400, never a silent fallback. */
export function queryDate(request: NextRequest, name: string, fallback: string): string {
  const raw = request.nextUrl.searchParams.get(name);
  if (raw === null) return fallback;
  const parsed = dateKey.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, `قيمة ${name} ليست تاريخاً صالحاً`, 'validation_failed');
  return parsed.data;
}

export function shiftDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Mutations require a same-origin JSON request; real sessions also need CSRF. */
export function guardMutation(request: NextRequest, identity: Identity) {
  assertSameOrigin(request);
  // The demo workspace is public by design, so a CSRF token adds nothing there.
  // Real accounts always carry one.
  if (!identity.demo) assertCsrf(request);
  enforceRateLimit(request, 'write', 240, 60 * 1000);
}
