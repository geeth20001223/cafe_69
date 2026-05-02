import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['192.168.1.177'],
  async rewrites() {
    return [
      { source: '/auth.v1', destination: '/login' },
      { source: '/sys.admin/:path*', destination: '/dashboard/admin/:path*' },
      { source: '/sys.inventory/:path*', destination: '/dashboard/inventory/:path*' },
      { source: '/sys.restock/:path*', destination: '/dashboard/restock/:path*' },
      { source: '/sys.terminal/:path*', destination: '/dashboard/cashier/:path*' },
      { source: '/sys.finance/:path*', destination: '/dashboard/finance/:path*' },
    ];
  },
  async redirects() {
    return [
      { source: '/login', destination: '/auth.v1', permanent: true },
      { source: '/dashboard/admin', destination: '/sys.admin', permanent: true },
      { source: '/dashboard/admin/users', destination: '/sys.admin/users', permanent: true },
      { source: '/dashboard/inventory/:path*', destination: '/sys.inventory/:path*', permanent: true },
      { source: '/dashboard/cashier/:path*', destination: '/sys.terminal/:path*', permanent: true },
      { source: '/dashboard/finance/:path*', destination: '/sys.finance/:path*', permanent: true },
      { source: '/dashboard/restock', destination: '/sys.restock', permanent: true },
    ];
  },
};

export default nextConfig;
