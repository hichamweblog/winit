/**
 * Compact labels for dense list rows.
 *
 * The sidebar goal list used to wrap long project names onto two lines, which
 * made rows uneven and pushed the list down. Per the user's request a name now
 * occupies exactly one line, and anything longer than two words is shortened
 * with an ellipsis. The full name is always preserved in `title`/`aria-label`,
 * so nothing is lost for hover or for a screen reader.
 *
 * This deliberately deviates from Calm Sea §6.2 ("names wrap rather than
 * truncate"); the deviation is recorded in docs/review-and-refinements.md.
 * CSS ellipsis remains as a second guard for names that are two words but still
 * too wide for the column.
 */

/** Collapses whitespace runs without touching the words themselves. */
function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Keeps at most `maxWords` words, appending U+2026 when anything was dropped.
 * Returns '' for empty input so callers can fall back to a placeholder.
 */
export function truncateWords(value: string | null | undefined, maxWords = 2): string {
  const text = normalise(value ?? '');
  if (!text) return '';
  const words = text.split(' ');
  if (words.length <= maxWords || maxWords < 1) return text;
  return `${words.slice(0, maxWords).join(' ')}\u2026`;
}

/** True when `truncateWords` would shorten the value — lets the UI add a title. */
export function isTruncated(value: string | null | undefined, maxWords = 2): boolean {
  const text = normalise(value ?? '');
  return text !== '' && text.split(' ').length > Math.max(1, maxWords);
}
