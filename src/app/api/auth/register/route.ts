import { NextRequest } from 'next/server';
import { ApiError, assertSameOrigin, enforceRateLimit, json, readJson, withApi } from '@/lib/server/http';
import { registerInput } from '@/lib/server/dto';
import { hashPassword } from '@/lib/server/password';
import { createSession, findUserByEmail, registerUser, setSessionCookies } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi('auth.register', async (request: NextRequest) => {
  assertSameOrigin(request);
  // Registration is expensive (scrypt) and creates rows: keep it tight.
  enforceRateLimit(request, 'register', 5, 15 * 60 * 1000);
  const input = await readJson(request, registerInput);
  if (await findUserByEmail(input.email)) {
    throw new ApiError(409, 'هذا البريد مسجّل بالفعل؛ جرّب تسجيل الدخول', 'email_taken');
  }
  const passwordHash = await hashPassword(input.password);
  let created;
  try {
    created = await registerUser(input.email, input.name, passwordHash);
  } catch (cause) {
    // Unique-constraint race between the check above and the insert.
    if (String(cause).includes('UNIQUE')) throw new ApiError(409, 'هذا البريد مسجّل بالفعل', 'email_taken');
    throw cause;
  }
  const { token, csrf, expiresAt } = await createSession(created.userId);
  const response = json({
    user: { id: created.userId, email: input.email, name: input.name },
    workspaceId: created.workspaceId,
    csrfToken: csrf,
  }, 201);
  setSessionCookies(response, token, csrf, expiresAt);
  return response;
});
