import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const result = await db.execute('SELECT * FROM categories ORDER BY name ASC');
  const cats = result.rows;
  return NextResponse.json({ categories: cats });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const db = getDb();
  const result = await db.execute({
    sql: 'INSERT INTO categories (name, description) VALUES (?, ?)',
    args: [name, description || null]
  });
  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
}
