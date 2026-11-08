import Link from 'next/link';
import { ArrowNarrowLeft, Search } from './icons';

export default function NotFound() {
  return (
    <main className="fallback-screen">
      <span className="fallback-icon"><Search size={24} /></span>
      <h1>الصفحة غير موجودة</h1>
      <p>الرابط الذي فتحته لا يقابل صفحة في التطبيق.</p>
      <Link href="/" className="primary-button"><ArrowNarrowLeft size={16} />العودة إلى اليوم</Link>
    </main>
  );
}
