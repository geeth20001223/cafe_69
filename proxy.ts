import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './app/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    return NextResponse.next();
  }

  // Dashboard routes
  if (pathname.startsWith('/dashboard/')) {
    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', req.url));
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.redirect(new URL('/login', req.url));

    const role = payload.role;
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/dashboard/inventory') && !['admin', 'inventory_manager'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/dashboard/cashier') && !['admin', 'cashier'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/dashboard/finance') && !['admin', 'finance_manager'].includes(role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
