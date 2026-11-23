'use client';

import { useEffect, useState } from 'react';
import { Download } from '../icons';
import { useLocale } from '../locale';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function PwaInstall() {
  const { t } = useLocale();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setPromptEvent(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="pwa-install-row">
      <span className="setting-icon" aria-hidden="true"><Download size={17} /></span>
      <div className="setting-copy">
        <b>{installed ? t('التطبيق مثبت') : t('ثبّت Winit على جهازك')}</b>
        <span>{installed
          ? t('يمكنك فتح Winit من الشاشة الرئيسية كتطبيق مستقل.')
          : t('أضف Winit إلى شاشتك الرئيسية لفتح أسرع وتجربة مستقلة عن المتصفح.')}</span>
        {!installed && ios && <span className="pwa-install-help">{t('للتثبيت على iPhone أو iPad: افتح «مشاركة» ثم اختر «إضافة إلى الشاشة الرئيسية».')}</span>}
        {!installed && !ios && !promptEvent && <span className="pwa-install-help">{t('يمكنك تثبيت التطبيق من قائمة المتصفح.')}</span>}
      </div>
      {promptEvent && !installed && (
        <button type="button" className="btn btn-primary primary-button pwa-install-button" disabled={busy} onClick={() => void install()}>
          {busy ? '…' : t('تثبيت التطبيق')}
        </button>
      )}
    </div>
  );
}
