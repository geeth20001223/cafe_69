import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/app/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ? AND is_active = 1',
      args: [email]
    });
    const user = result.rows[0] as any;
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const urlKey = Math.random().toString(36).substring(2, 10);

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      urlKey
    });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, urlKey },
    });
    res.cookies.set('cafe69_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || req.url.startsWith('https'),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return res;
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
