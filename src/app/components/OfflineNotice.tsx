'use client';

import { useEffect, useState } from 'react';
import { Info } from '../icons';
import { useLocale } from '../locale';

/**
 * The app is installable and works offline, so the browser being offline is a
 * normal state, not an error. One quiet strip says what changed and gets out
 * of the way the moment the network is back. It renders nothing on the server
 * or when online, so it never shifts the first paint.
 */
export default function OfflineNotice() {
  const { t } = useLocale();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-strip" role="status" aria-live="polite">
      <Info size={16} aria-hidden="true" />
      <span>{t('أنت غير متصل — التغييرات لن تُحفظ حتى تعود الشبكة.')}</span>
    </div>
  );
}
