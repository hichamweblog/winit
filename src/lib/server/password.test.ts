import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DUMMY_HASH,
  hashPassword,
  hashSessionToken,
  newSessionToken,
  safeEqual,
  verifyPassword,
} from './password';

test('a hashed password verifies, and the plaintext is never stored', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.ok(hash.startsWith('scrypt$16384$8$1$'));
  assert.ok(!hash.includes('correct'));
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyPassword('Correct horse battery staple', hash), false);
  assert.equal(await verifyPassword('', hash), false);
});

test('the same password hashes differently every time (random salt)', async () => {
  const [a, b] = await Promise.all([hashPassword('same password here'), hashPassword('same password here')]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('same password here', a), true);
  assert.equal(await verifyPassword('same password here', b), true);
});

test('Unicode passwords are normalised so equivalent input still matches', async () => {
  // é as one code point vs e + combining acute — NFKC makes these identical.
  const hash = await hashPassword('caf\u00e9-password');
  assert.equal(await verifyPassword('cafe\u0301-password', hash), true);
});

test('malformed or legacy digests fail closed instead of throwing', async () => {
  for (const bad of ['', 'local-demo', 'scrypt$1$2$3', 'bcrypt$stuff', 'scrypt$abc$8$1$cw$a', 'scrypt$16384$8$1$!!!$!!!']) {
    assert.equal(await verifyPassword('anything at all', bad), false, `digest: ${bad}`);
  }
});

test('absurd cost parameters are rejected rather than allocating memory', async () => {
  assert.equal(await verifyPassword('x', `scrypt$${2 ** 40}$8$1$AAAA$AAAA`), false);
  assert.equal(await verifyPassword('x', 'scrypt$512$8$1$AAAA$AAAA'), false);
});

test('the dummy hash is well-formed so unknown emails cost the same as known ones', async () => {
  const parts = DUMMY_HASH.split('$');
  assert.equal(parts.length, 6);
  assert.equal(parts[0], 'scrypt');
  assert.equal(Number(parts[1]), 16384);
  assert.equal(await verifyPassword('anything at all', DUMMY_HASH), false);
});

test('session tokens are unique, URL-safe and stored only as a digest', () => {
  const a = newSessionToken();
  const b = newSessionToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/); // 32 bytes, base64url, no padding
  const digest = hashSessionToken(a);
  assert.notEqual(digest, a);
  assert.equal(digest, hashSessionToken(a)); // deterministic
  assert.notEqual(digest, hashSessionToken(b));
  assert.match(digest, /^[A-Za-z0-9_-]{43}$/); // SHA-256
});

test('safeEqual compares without leaking on length mismatch', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
});
