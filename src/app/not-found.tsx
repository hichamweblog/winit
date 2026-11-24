'use client';

import Link from 'next/link';
import { ArrowNarrowLeft, Search } from './icons';
import { useLocale } from './locale';

export default function NotFound() {
  const { t } = useLocale();
  return (
    <main className="fallback-screen">
      <span className="fallback-icon"><Search size={24} /></span>
      <h1>{t('الصفحة غير موجودة')}</h1>
      <p>{t('الرابط الذي فتحته لا يقابل صفحة في التطبيق.')}</p>
      <Link href="/" className="btn btn-primary primary-button"><ArrowNarrowLeft size={16} />{t('العودة إلى اليوم')}</Link>
    </main>
  );
}
