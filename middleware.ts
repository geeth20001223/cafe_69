import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cafe69-super-secret-key-2024-lka'
);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth.v1', req.url));
  }

  // 2. Handle /sys.[role] shortcuts
  if (pathname.startsWith('/sys.')) {
    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/auth.v1', req.url));
    const session = await verifyToken(token) as any;
    if (!session || !session.urlKey) return NextResponse.redirect(new URL('/auth.v1', req.url));
    
    // Redirect to the obfuscated URL
    return NextResponse.redirect(new URL(`/s/${session.urlKey}${pathname}`, req.url));
  }

  // 3. Handle dynamic system routes (/s/[key]/sys.[role]/...)
  if (pathname.startsWith('/s/')) {
    const parts = pathname.split('/');
    if (parts.length < 4) return NextResponse.next();
    
    const urlKey = parts[2];
    const systemPathWithPrefix = parts[3];
    const systemPath = systemPathWithPrefix.replace('sys.', '');
    const subPath = parts.slice(4).join('/');

    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/auth.v1', req.url));

    const session = await verifyToken(token) as any;
    if (!session || session.urlKey !== urlKey) {
      return NextResponse.redirect(new URL('/auth.v1', req.url));
    }

    const pathMap: Record<string, string> = {
      admin: 'admin',
      terminal: 'cashier',
      inventory: 'inventory',
      finance: 'finance',
      restock: 'restock'
    };

    const internalRole = pathMap[systemPath];
    if (!internalRole) return NextResponse.next();

    // Role-based Path Access Control
    const role = session.role;
    if (role !== 'admin') {
      if (internalRole === 'admin') return NextResponse.redirect(new URL('/auth.v1', req.url));
      if (internalRole === 'cashier' && role !== 'cashier') return NextResponse.redirect(new URL('/auth.v1', req.url));
      if (internalRole === 'inventory' && role !== 'inventory_manager') return NextResponse.redirect(new URL('/auth.v1', req.url));
      if (internalRole === 'finance' && role !== 'finance_manager') return NextResponse.redirect(new URL('/auth.v1', req.url));
    }

    const destination = `/dashboard/${internalRole}${subPath ? '/' + subPath : ''}`;
    return NextResponse.rewrite(new URL(destination, req.url));
  }

  // 4. Protect direct access to dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('cafe69_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/auth.v1', req.url));
    
    const session = await verifyToken(token) as any;
    if (!session) return NextResponse.redirect(new URL('/auth.v1', req.url));
    
    // If accessing dashboard directly, force a redirect to the masked path
    const roleMap: Record<string, string> = {
      admin: 'sys.admin',
      cashier: 'sys.terminal',
      inventory_manager: 'sys.inventory',
      finance_manager: 'sys.finance'
    };
    return NextResponse.redirect(new URL(`/s/${session.urlKey}/${roleMap[session.role] || 'sys.admin'}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/s/:path*', '/dashboard/:path*', '/sys.:path*'],
};
