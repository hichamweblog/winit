import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'الشروط — Winit', // i18n-exempt: server metadata
  description: 'شروط استخدام Winit: الحساب، والمحتوى، والحدود.', // i18n-exempt: server metadata
};

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
