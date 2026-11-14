const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type JournalCursor = {
  entryDate: string;
  id: string;
};

export function encodeJournalCursor(entryDate: string, id: string): string {
  return Buffer.from(JSON.stringify([entryDate, id])).toString('base64url');
}

export function decodeJournalCursor(value: string): JournalCursor | null {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      Array.isArray(decoded) &&
      decoded.length === 2 &&
      typeof decoded[0] === 'string' &&
      DATE_PATTERN.test(decoded[0]) &&
      typeof decoded[1] === 'string' &&
      decoded[1].length > 0
    ) {
      return { entryDate: decoded[0], id: decoded[1] };
    }
  } catch {
    return null;
  }

  return null;
}
