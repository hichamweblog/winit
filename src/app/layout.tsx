import type { Metadata, Viewport } from 'next';
import { El_Messiri, Readex_Pro, Noto_Naskh_Arabic } from 'next/font/google';
import PwaRegister from './components/PwaRegister';
import './globals.css';

const elMessiri = El_Messiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const readexPro = Readex_Pro({
  subsets: ['arabic', 'latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
});

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-reading',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1A20' },
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
    <html lang="ar" dir="rtl" className={`${elMessiri.variable} ${readexPro.variable} ${notoNaskh.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`${elMessiri.variable} ${readexPro.variable} ${notoNaskh.variable}`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
