import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager', 'finance_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = `
    SELECT q.*, u.name as manager_name, a.name as approver_name
    FROM quotations q
    LEFT JOIN users u ON q.manager_id = u.id
    LEFT JOIN users a ON q.approved_by = a.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (status) { query += ' AND q.status = ?'; args.push(status); }
  if (session.role === 'inventory_manager') {
    query += ' AND q.manager_id = ?'; args.push(session.id);
  }
  query += ' ORDER BY q.created_at DESC';

  const result = await db.execute({ sql: query, args });
  const quotations = result.rows;
  return NextResponse.json({ quotations });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, items, notes } = await req.json();
  if (!items || !items.length) {
    return NextResponse.json({ error: 'Items required' }, { status: 400 });
  }

  const total = items.reduce((sum: number, i: any) => sum + (parseFloat(i.unit_price) * parseFloat(i.quantity)), 0);

  const db = getDb();
  const result = await db.execute({
    sql: `
      INSERT INTO quotations (manager_id, title, items_json, total, notes, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+5 hours', '30 minutes'))
    `,
    args: [session.id, title || 'Quotation', JSON.stringify(items), total, notes || null]
  });

  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, markRead } = await req.json();
  const db = getDb();

  if (markRead && id) {
    await db.execute({ sql: 'UPDATE quotations SET is_read = 1 WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
