import type { Metadata } from 'next';
// Calm Sea §3.1 — El Messiri (headings + large numerals), Readex Pro (all UI),
// Noto Naskh Arabic (reading container only). Tajawal is no longer used.
import '@fontsource/el-messiri/arabic-600.css';
import '@fontsource/el-messiri/latin-600.css';
import '@fontsource/el-messiri/arabic-700.css';
import '@fontsource/el-messiri/latin-700.css';
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

// §11.1: resolve the theme before first paint so there is no flash. Always set
// data-mode (falling back to the OS preference) so the token layer has a single
// dark selector to target.
const themeBootstrap = "try{var s=localStorage.getItem('winit-mode');var d=s==='light'||s==='dark'?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.mode=d?'dark':'light'}catch(e){}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}</body></html>;
}
