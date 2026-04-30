import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  try {
    if (body.is_active !== undefined) {
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(body.is_active ? 1 : 0, id);
    }
    if (body.role) {
      const validRoles = ['admin', 'inventory_manager', 'cashier', 'finance_manager'];
      if (!validRoles.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, id);
    }
    if (body.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(body.email, id);
      if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(body.email, id);
    }
    if (body.name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(body.name, id);
    }
    if (body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      const hash = bcrypt.hashSync(body.password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (Number(id) === session.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
