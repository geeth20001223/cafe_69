import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['192.168.1.177'],
  async redirects() {
    return [
      { source: '/login', destination: '/auth.v1', permanent: true },
    ];
  },
};

export default nextConfig;
