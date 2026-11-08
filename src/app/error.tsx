'use client';

/**
 * Route-level error boundary. Keeps the shell usable and offers a retry instead
 * of a blank screen. The digest is the only server detail shown — it correlates
 * with the server log without leaking a stack trace.
 */
import { useEffect } from 'react';
import { AlertTriangle, Reset } from './icons';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('route error:', error); }, [error]);
  return (
    <main className="fallback-screen" role="alert">
      <span className="fallback-icon"><AlertTriangle size={24} /></span>
      <h1>حدث خطأ غير متوقع</h1>
      <p>لم تُفقد بياناتك المحفوظة. أعد المحاولة، وإن تكرر الخطأ أعد تحميل الصفحة.</p>
      {error.digest && <p className="fallback-digest">رمز المتابعة: <bdi>{error.digest}</bdi></p>}
      <button type="button" className="primary-button" onClick={reset}><Reset size={16} />إعادة المحاولة</button>
    </main>
  );
}
