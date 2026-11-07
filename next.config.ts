import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
