/**
 * Password hashing and session tokens.
 *
 * scrypt from node:crypto — no third-party dependency, memory-hard, and the
 * parameters are stored alongside the digest so they can be raised later
 * without invalidating existing passwords.
 *
 * Session tokens are 32 random bytes. Only their SHA-256 digest is stored, so a
 * database leak does not hand an attacker usable sessions.
 */
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_BYTES = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_BYTES, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nRaw, rRaw, pRaw, saltRaw, keyRaw] = parts;
  const N = Number(nRaw), r = Number(rRaw), p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N < 1024 || N > 1 << 20) return false;
  try {
    const salt = Buffer.from(saltRaw, 'base64url');
    const expected = Buffer.from(keyRaw, 'base64url');
    // Buffer.from(..., 'base64url') silently drops invalid characters, so a
    // corrupt digest can decode to an EMPTY buffer. Without these floors a
    // zero-length key would compare equal to a zero-length derivation and
    // authenticate any password. Fail closed on anything undersized.
    if (salt.length < SALT_BYTES || expected.length < 32) return false;
    const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: PARAMS.maxmem });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * A dummy digest in the stored format, verified when the email is unknown so
 * that login takes the same time whether or not the account exists.
 */
export const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export const SESSION_COOKIE = 'winit_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Constant-time-ish comparison for the CSRF double-submit token. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
