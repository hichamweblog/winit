import { NextRequest } from 'next/server';
import { ApiError, assertSameOrigin, enforceRateLimit, json, readJson, withApi } from '@/lib/server/http';
import { loginInput } from '@/lib/server/dto';
import { DUMMY_HASH, verifyPassword } from '@/lib/server/password';
import { createSession, findUserByEmail, purgeExpiredSessions, setSessionCookies } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi('auth.login', async (request: NextRequest) => {
  assertSameOrigin(request);
  enforceRateLimit(request, 'login', 10, 15 * 60 * 1000);
  const input = await readJson(request, loginInput);
  const user = await findUserByEmail(input.email);
  // Always run scrypt, even for an unknown email, so response time does not
  // reveal whether an account exists. The message is identical in both cases.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'invalid_credentials');
  await purgeExpiredSessions();
  const { token, csrf, expiresAt } = await createSession(user.id);
  const response = json({ user: { id: user.id, email: user.email, name: user.name }, csrfToken: csrf });
  setSessionCookies(response, token, csrf, expiresAt);
  return response;
});
