import { NextRequest } from 'next/server';
import { CSRF_COOKIE, json, withApi } from '@/lib/server/http';
import { demoModeEnabled, resolveIdentity } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who am I? 200 with `user: null` when anonymous, so the client can branch. */
export const GET = withApi('auth.session', async (request: NextRequest) => {
  const identity = await resolveIdentity(request);
  return json({
    user: identity
      ? { id: identity.userId, email: identity.email, name: identity.name, workspaceId: identity.workspaceId, role: identity.role, demo: identity.demo }
      : null,
    csrfToken: request.cookies.get(CSRF_COOKIE)?.value ?? null,
    demoMode: demoModeEnabled(),
  });
});
