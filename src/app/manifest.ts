import type { MetadataRoute } from 'next';

/** Web App Manifest served at /manifest.webmanifest (the URL Next links to). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Winit — Focus, habits and goals',
    short_name: 'Winit',
    description: 'A calm space to plan tasks, build habits and focus on what matters.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F4F7F8',
    theme_color: '#3E3758',
    dir: 'auto',
    lang: 'en',
    categories: ['productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
