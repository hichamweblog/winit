'use client';

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it must render its own html/body and cannot rely on the
 * app's CSS being loaded.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#EDF2F4', color: '#0E2A33', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: '32rem', padding: '2rem', textAlign: 'center' }} role="alert">
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 .75rem' }}>تعذر تحميل التطبيق</h1>
          <p style={{ margin: '0 0 1.5rem', lineHeight: 1.8 }}>حدث خطأ في هيكل الصفحة. أعد المحاولة.</p>
          <button type="button" onClick={reset} style={{ minBlockSize: 44, paddingInline: '1.25rem', border: 0, borderRadius: 8, background: '#14535F', color: '#fff', font: 'inherit', cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
