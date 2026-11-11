import { NextRequest } from 'next/server';
import { CSRF_COOKIE, json, withApi } from '@/lib/server/http';
import { demoModeEnabled, resolveIdentity } from '@/lib/server/auth';
import { newSessionToken, SESSION_TTL_MS } from '@/lib/server/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who am I? 200 with `user: null` when anonymous, so the client can branch. */
export const GET = withApi('auth.session', async (request: NextRequest) => {
  const identity = await resolveIdentity(request);
  let csrfToken = request.cookies.get(CSRF_COOKIE)?.value ?? null;
  let reissuedCsrf = false;

  if (identity && !csrfToken) {
    csrfToken = newSessionToken();
    reissuedCsrf = true;
  }

  const response = json({
    user: identity
      ? { id: identity.userId, email: identity.email, name: identity.name, workspaceId: identity.workspaceId, role: identity.role, demo: identity.demo }
      : null,
    csrfToken,
    demoMode: demoModeEnabled(),
  });

  if (reissuedCsrf && csrfToken) {
    const isSecure = process.env.NODE_ENV === 'production' && process.env.WINIT_INSECURE_COOKIES !== '1';
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      expires: new Date(Date.now() + SESSION_TTL_MS),
    });
  }

  return response;
});
