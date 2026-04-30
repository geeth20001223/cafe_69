import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get('unread') === 'true';

  let query = `
    SELECT sa.*, p.name as product_name, p.quantity, p.unit, p.low_stock_threshold
    FROM stock_alerts sa
    LEFT JOIN products p ON sa.product_id = p.id
  `;
  if (onlyUnread) query += ' WHERE sa.is_read = 0';
  query += ' ORDER BY sa.created_at DESC';

  const alerts = db.prepare(query).all();
  return NextResponse.json({ alerts });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const db = getDb();
  db.prepare('UPDATE stock_alerts SET is_read = 1 WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
