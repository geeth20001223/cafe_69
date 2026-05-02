import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cafe69-super-secret-key-2024-lka'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('cafe69_token')?.value;

  // 1. Protection for internal paths (must go through /s/)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/sys.')) {
    return NextResponse.redirect(new URL('/auth.v1', req.url));
  }

  // 2. Dynamic Route Handling (/s/[urlKey]/[route])
  if (pathname.startsWith('/s/')) {
    const parts = pathname.split('/');
    if (parts.length < 4) return NextResponse.redirect(new URL('/auth.v1', req.url));
    
    const urlKey = parts[2];
    const systemPath = parts[3]; // e.g., admin, terminal, inventory
    const subPath = parts.slice(4).join('/');

    if (!token) return NextResponse.redirect(new URL('/auth.v1', req.url));

    try {
      const { payload } = await jwtVerify(token, SECRET);
      const session = payload as any;

      if (session.urlKey !== urlKey) {
        return NextResponse.redirect(new URL('/auth.v1', req.url));
      }

      // Map system paths back to internal dashboard routes
      const pathMap: Record<string, string> = {
        admin: 'admin',
        terminal: 'cashier',
        inventory: 'inventory',
        finance: 'finance',
        restock: 'restock'
      };

      const internalRole = pathMap[systemPath];
      if (!internalRole) return NextResponse.redirect(new URL('/auth.v1', req.url));

      // Rewrite to internal dashboard route
      const destination = `/dashboard/${internalRole}${subPath ? '/' + subPath : ''}`;
      return NextResponse.rewrite(new URL(destination, req.url));

    } catch (e) {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sys.:path*',
    '/s/:path*',
  ],
};
