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
      await db.execute({ sql: 'UPDATE users SET is_active = ? WHERE id = ?', args: [body.is_active ? 1 : 0, id] });
    }
    if (body.role) {
      const validRoles = ['admin', 'inventory_manager', 'cashier', 'finance_manager'];
      if (!validRoles.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      await db.execute({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [body.role, id] });
    }
    if (body.email) {
      const existingRes = await db.execute({ sql: 'SELECT id FROM users WHERE email = ? AND id != ?', args: [body.email, id] });
      if (existingRes.rows.length > 0) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      await db.execute({ sql: 'UPDATE users SET email = ? WHERE id = ?', args: [body.email, id] });
    }
    if (body.name) {
      await db.execute({ sql: 'UPDATE users SET name = ? WHERE id = ?', args: [body.name, id] });
    }
    if (body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      const hash = bcrypt.hashSync(body.password, 10);
      await db.execute({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [hash, id] });
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
  
  // Optional: Check for sales/quotations before hard delete to prevent orphaned records
  // For now, we perform a hard delete as requested.
  try {
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Cannot delete user: They may have associated sales or reports. Deactivate them instead.' }, { status: 400 });
  }
}

