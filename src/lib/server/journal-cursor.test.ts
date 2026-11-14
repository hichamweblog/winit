import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeJournalCursor, encodeJournalCursor } from './journal-cursor';

test('journal cursors preserve the date and ID tie-breaker', () => {
  const first = encodeJournalCursor('2026-11-14', 'entry-a');
  const second = encodeJournalCursor('2026-11-14', 'entry-b');

  assert.notEqual(first, second);
  assert.deepEqual(decodeJournalCursor(first), { entryDate: '2026-11-14', id: 'entry-a' });
  assert.deepEqual(decodeJournalCursor(second), { entryDate: '2026-11-14', id: 'entry-b' });
});

test('journal cursors reject incomplete and malformed values', () => {
  assert.equal(decodeJournalCursor('2026-11-14'), null);
  assert.equal(decodeJournalCursor('invalid'), null);
  assert.equal(decodeJournalCursor(Buffer.from('["2026-11-14",""]').toString('base64url')), null);
});
