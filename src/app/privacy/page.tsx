import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'الخصوصية — Winit', // i18n-exempt: server metadata
  description: 'كيف يتعامل Winit مع بياناتك: ما يُخزَّن، وما لا يُجمَع، وكيف تحذفه.', // i18n-exempt: server metadata
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
