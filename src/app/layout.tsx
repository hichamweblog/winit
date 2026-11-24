import type { Metadata, Viewport } from 'next';
import PwaRegister from './components/PwaRegister';
import { LocaleProvider } from './locale';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F7F8' },
    { media: '(prefers-color-scheme: dark)', color: '#11101B' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Winit — مساحتك للإنجاز',
  description: 'مساحة هادئة تجمع أهدافك، عاداتك، ووقتك في مكان واحد.',
  applicationName: 'Winit',
  manifest: '/manifest.webmanifest',
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
const themeBootstrap = "try{var s=localStorage.getItem('winit-mode');var d=s==='light'||s==='dark'?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.mode=d?'dark':'light';document.documentElement.dataset.theme=d?'winit-energy-dark':'winit-energy';document.documentElement.dataset.vibe='energy';var l=localStorage.getItem('winit-language');if(l==='ar'||l==='en'){document.documentElement.lang=l;document.documentElement.dir=l==='en'?'ltr':'rtl';document.documentElement.dataset.language=l}else{document.documentElement.dataset.language='ar'}}catch(e){document.documentElement.dataset.mode='light';document.documentElement.dataset.theme='winit-energy';document.documentElement.dataset.vibe='energy';document.documentElement.dataset.language='ar'}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-language="ar" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <LocaleProvider>
          <PwaRegister />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
