/**
 * Sentry is wired but inactive until NEXT_PUBLIC_SENTRY_DSN is set, so a fresh
 * clone (and CI) never phones home — and never ships the SDK to the phone
 * either, since it is imported only when a DSN exists.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      tracesSampleRate: 0,
      environment: process.env.NODE_ENV,
      beforeSend(event) {
        // No PII leaves the device: drop the user block from every event.
        delete event.user;
        return event;
      },
    });
  });
}
