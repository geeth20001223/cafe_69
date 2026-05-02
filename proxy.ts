import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './app/lib/auth';

const PUBLIC_PATHS = ['/auth.v1', '/api/auth/login', '/_next', '/favicon.ico'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 1. Block direct access to internal paths
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/sys.')) {
    return NextResponse.redirect(new URL('/auth.v1', req.url));
  }

  // 2. Dynamic Route Handling (/s/[urlKey]/sys.[route])
  if (pathname.startsWith('/s/')) {
    const parts = pathname.split('/');
    if (parts.length < 4) return NextResponse.redirect(new URL('/auth.v1', req.url));
    
    const urlKey = parts[2];
    const systemPathWithPrefix = parts[3]; // e.g., sys.admin
    const systemPath = systemPathWithPrefix.replace('sys.', '');
    const subPath = parts.slice(4).join('/');

    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/auth.v1', req.url));

    const session = await verifyToken(token);
    if (!session || session.urlKey !== urlKey) {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }

    // Role-based validation for the path
    const pathMap: Record<string, string> = {
      admin: 'admin',
      terminal: 'cashier',
      inventory: 'inventory',
      finance: 'finance',
      restock: 'restock'
    };

    const internalRole = pathMap[systemPath];
    if (!internalRole) return NextResponse.redirect(new URL('/auth.v1', req.url));

    // Guard access based on session role
    const role = session.role;
    if (internalRole === 'admin' && role !== 'admin') {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }
    if (internalRole === 'inventory' && !['admin', 'inventory_manager'].includes(role)) {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }
    if (internalRole === 'cashier' && !['admin', 'cashier'].includes(role)) {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }
    if (internalRole === 'finance' && !['admin', 'finance_manager'].includes(role)) {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }

    // Rewrite to internal dashboard route
    const destination = `/dashboard/${internalRole}${subPath ? '/' + subPath : ''}`;
    return NextResponse.rewrite(new URL(destination, req.url));
  }

  // API protection
  if (pathname.startsWith('/api/')) {
    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
