import type { Metadata, Viewport } from 'next';
import PwaRegister from './components/PwaRegister';
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1128' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Winit — مساحتك للإنجاز',
  description: 'مساحة هادئة تجمع أهدافك، عاداتك، ووقتك في مكان واحد.',
  applicationName: 'Winit',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Winit',
  },
};

// §11.1: resolve the theme before first paint so there is no flash. Always set
// data-mode (falling back to the OS preference) so the token layer has a single
// dark selector to target.
const themeBootstrap = "try{var s=localStorage.getItem('winit-mode');var d=s==='light'||s==='dark'?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.mode=d?'dark':'light'}catch(e){}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
