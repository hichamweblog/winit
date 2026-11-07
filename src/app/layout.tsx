import type { Metadata } from 'next';
import '@fontsource/tajawal/arabic-400.css';
import '@fontsource/tajawal/arabic-700.css';
import '@fontsource/readex-pro/arabic-300.css';
import '@fontsource/readex-pro/latin-300.css';
import '@fontsource/readex-pro/arabic-400.css';
import '@fontsource/readex-pro/latin-400.css';
import '@fontsource/readex-pro/arabic-500.css';
import '@fontsource/readex-pro/latin-500.css';
import '@fontsource/readex-pro/arabic-600.css';
import '@fontsource/readex-pro/latin-600.css';
import '@fontsource/readex-pro/arabic-700.css';
import '@fontsource/readex-pro/latin-700.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Winit — مساحتك للإنجاز',
  description: 'مساحة هادئة تجمع أهدافك، عاداتك، ووقتك في مكان واحد.',
  applicationName: 'Winit',
};

const themeBootstrap = "try{const mode=localStorage.getItem('winit-mode');if(mode==='light'||mode==='dark')document.documentElement.dataset.mode=mode}catch{}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}</body></html>;
}
