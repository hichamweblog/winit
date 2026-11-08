/**
 * Session resolution and tenant scoping.
 *
 * Every data route derives `userId` / `workspaceId` from the session cookie —
 * never from a constant and never from the request body. The workspace is the
 * user's oldest membership, which for a personal account is the one created at
 * registration.
 *
 * Demo mode (`WINIT_DEMO_MODE=1`) is an explicit opt-in that serves a shared
 * scratch workspace to anonymous visitors. It must never be enabled on a real
 * deployment; the login screen and the health endpoint both surface it.
 */
import { and, eq, gt, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { memberships, sessions, users, workspaces } from '@/db/schema';
import { ApiError, CSRF_COOKIE } from './http';
import {
  hashSessionToken,
  newSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from './password';

export type Identity = {
  userId: string;
  workspaceId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  demo: boolean;
};

export const DEMO_USER_ID = 'user_personal';
export const DEMO_WORKSPACE_ID = 'workspace_personal';

export function demoModeEnabled(): boolean {
  return process.env.WINIT_DEMO_MODE === '1';
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  // Secure by default in production; allow plain HTTP only when the operator
  // explicitly says the deployment is not TLS-terminated (local previews).
  secure: process.env.NODE_ENV === 'production' && process.env.WINIT_INSECURE_COOKIES !== '1',
  path: '/',
});

export async function createSession(userId: string): Promise<{ token: string; csrf: string; expiresAt: Date }> {
  const token = newSessionToken();
  const csrf = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    token: hashSessionToken(token),
    expiresAt,
  });
  // Opportunistic cleanup of this user's *expired* sessions so the table cannot
  // grow without bound. Never touches live sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return { token, csrf, expiresAt };
}

/** Removes every expired session. Called by the cleanup script and on login. */
export async function purgeExpiredSessions(): Promise<number> {
  const removed = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  return removed.length;
}

export function setSessionCookies(response: NextResponse, token: string, csrf: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
  // Readable by script on purpose: the double-submit pattern requires the
  // client to echo this value in a header, which a cross-site page cannot read.
  response.cookies.set(CSRF_COOKIE, csrf, { ...cookieOptions(), httpOnly: false, expires: expiresAt });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(CSRF_COOKIE, '', { ...cookieOptions(), httpOnly: false, maxAge: 0 });
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, hashSessionToken(token)));
}

async function identityForUser(userId: string): Promise<Identity | null> {
  const [row] = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      workspaceId: memberships.workspaceId,
      role: memberships.role,
    })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(eq(users.id, userId))
    .orderBy(memberships.createdAt)
    .limit(1);
  if (!row) return null;
  return { ...row, demo: false };
}

/** Resolves the caller, or null when anonymous and demo mode is off. */
export async function resolveIdentity(request: NextRequest): Promise<Identity | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.token, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (session) {
      const identity = await identityForUser(session.userId);
      if (identity) return identity;
    }
  }
  if (demoModeEnabled()) {
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, DEMO_WORKSPACE_ID)).limit(1);
    if (workspace) {
      return {
        userId: DEMO_USER_ID,
        workspaceId: DEMO_WORKSPACE_ID,
        email: 'demo@winit.local',
        name: 'زائر تجريبي',
        role: 'owner',
        demo: true,
      };
    }
  }
  return null;
}

export async function requireIdentity(request: NextRequest): Promise<Identity> {
  const identity = await resolveIdentity(request);
  if (!identity) throw new ApiError(401, 'يلزم تسجيل الدخول للوصول إلى هذه البيانات', 'unauthenticated');
  return identity;
}

/** Registration creates the user, their personal workspace and the owner membership atomically. */
export async function registerUser(email: string, name: string, passwordHash: string) {
  const userId = crypto.randomUUID();
  const workspaceId = crypto.randomUUID();
  const slugBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 24) || 'workspace';
  const slug = `${slugBase}-${workspaceId.slice(0, 8)}`;
  db.transaction((tx) => {
    tx.insert(users).values({ id: userId, email, name, passwordHash }).run();
    tx.insert(workspaces).values({ id: workspaceId, name: `مساحة ${name}`, slug, ownerId: userId, plan: 'personal' }).run();
    tx.insert(memberships).values({ id: crypto.randomUUID(), workspaceId, userId, role: 'owner' }).run();
  });
  return { userId, workspaceId };
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}
