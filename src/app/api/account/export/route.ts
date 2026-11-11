import { NextRequest } from 'next/server';
import { ApiError, assertSameOrigin, enforceRateLimit, json, withApi } from '@/lib/server/http';
import { exportUserData, requireIdentity } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('account.export', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  assertSameOrigin(request);
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  if (identity.demo) {
    throw new ApiError(403, 'غير متاح للحساب التجريبي', 'forbidden');
  }

  const exportData = await exportUserData(identity.userId, ws);
  return json(exportData);
});
