import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS parked_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_code TEXT UNIQUE NOT NULL,
    cashier_id INTEGER REFERENCES users(id),
    customer_name TEXT,
    customer_phone TEXT,
    items_json TEXT NOT NULL,
    discount_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
  )`);
  const result = await db.execute("SELECT * FROM parked_bills ORDER BY created_at DESC");
  return NextResponse.json({ bills: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { items, customer_name, customer_phone, discount_amount, notes } = await req.json();
  if (!items || !items.length) {
    return NextResponse.json({ error: 'Items required' }, { status: 400 });
  }

  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS parked_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_code TEXT UNIQUE NOT NULL,
    cashier_id INTEGER REFERENCES users(id),
    customer_name TEXT,
    customer_phone TEXT,
    items_json TEXT NOT NULL,
    discount_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
  )`);
  
  // Generate daily token code
  const today = new Date().toISOString().split('T')[0];
  const countRes = await db.execute({
    sql: "SELECT COUNT(*) as c FROM parked_bills WHERE created_at LIKE ?",
    args: [`${today}%`]
  });
  const nextNum = Number(countRes.rows[0].c) + 1;
  const tokenCode = `T-${nextNum.toString().padStart(3, '0')}`;

  try {
    await db.execute({
      sql: `INSERT INTO parked_bills (token_code, cashier_id, customer_name, customer_phone, items_json, discount_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [tokenCode, session.id, customer_name || null, customer_phone || null, JSON.stringify(items), discount_amount || 0, notes || null]
    });

    return NextResponse.json({ success: true, tokenCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const db = getDb();
  await db.execute({ sql: 'DELETE FROM parked_bills WHERE id = ?', args: [id] });
  
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, items, customer_name, customer_phone, discount_amount, notes } = await req.json();
  if (!id || !items) return NextResponse.json({ error: 'ID and items required' }, { status: 400 });

  const db = getDb();
  try {
    await db.execute({
      sql: `UPDATE parked_bills SET items_json = ?, customer_name = ?, customer_phone = ?, discount_amount = ?, notes = ? WHERE id = ?`,
      args: [JSON.stringify(items), customer_name || null, customer_phone || null, discount_amount || 0, notes || null, id]
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
