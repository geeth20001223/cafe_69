import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const result = await db.execute('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
  const users = result.rows;
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }
    const validRoles = ['admin', 'inventory_manager', 'cashier', 'finance_manager'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const db = getDb();
    const existingRes = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (existingRes.rows.length > 0) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
 
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      args: [name, email, hash, role]
    });
    return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
