import { NextRequest } from 'next/server';
import { assertCsrf, assertSameOrigin, json, withApi } from '@/lib/server/http';
import { clearSessionCookies, destroySession } from '@/lib/server/auth';
import { SESSION_COOKIE } from '@/lib/server/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi('auth.logout', async (request: NextRequest) => {
  assertSameOrigin(request);
  assertCsrf(request);
  await destroySession(request.cookies.get(SESSION_COOKIE)?.value);
  const response = json({ ok: true });
  clearSessionCookies(response);
  return response;
});
