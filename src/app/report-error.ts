/**
 * Error reporting without paying for it in the shared bundle.
 *
 * Sentry is a dependency and is initialised at the app's entry
 * (instrumentation-client.ts), but both the SDK and this call site load it
 * lazily: with no NEXT_PUBLIC_SENTRY_DSN nothing is fetched at all, and with
 * one the SDK arrives in its own chunk after the app is interactive.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function reportError(error: unknown): void {
  if (!dsn) return;
  void import('@sentry/nextjs')
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => { /* reporting must never break the screen showing the error */ });
}
