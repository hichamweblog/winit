import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { ApiError, json, readJson, withApi } from '@/lib/server/http';
import { clearSessionCookies, deleteUserAccount, requireIdentity } from '@/lib/server/auth';
import { verifyPassword } from '@/lib/server/password';
import { guardMutation, notFound } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = withApi('account.delete', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);

  if (identity.demo) {
    throw new ApiError(403, 'لا يمكن حذف الحساب التجريبي', 'forbidden');
  }

  const input = await readJson(
    request,
    z.object({ password: z.string().min(1, 'اكتب كلمة المرور لتأكيد الحذف') }).strict(),
  );

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);

  if (!user) throw notFound('المستخدم');

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(403, 'كلمة المرور غير صحيحة', 'invalid_password');
  }

  await deleteUserAccount(identity.userId);
  const response = json({ ok: true, deleted: true });
  clearSessionCookies(response);
  return response;
});
