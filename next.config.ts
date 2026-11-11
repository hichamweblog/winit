import type { NextConfig } from 'next';

/**
 * Content Security Policy.
 *
 * `unsafe-inline` is required for two things Next does by default: the inline
 * theme-bootstrap script in the root layout, and the framework's own hydration
 * payload. `unsafe-eval` is only added in development, where the dev overlay
 * needs it. Everything else is locked to same-origin; fonts are self-hosted via
 * @fontsource so no third-party font host is allowed.
 *
 * Tightening this to nonce-based script-src is tracked in the production
 * readiness review — it needs middleware to inject a per-request nonce.
 */
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // Two years, preload. Only meaningful over HTTPS; browsers ignore it on HTTP.
  // Operators must be sure every subdomain is TLS-ready before relying on it.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  serverExternalPackages: [],
  poweredByHeader: false,
  reactStrictMode: true,
  // Standalone output is for the Docker image only. `next start` warns and
  // misbehaves with it, so local/CI production runs keep the default output.
  output: process.env.WINIT_STANDALONE === '1' ? 'standalone' : undefined,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
