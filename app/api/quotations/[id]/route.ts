import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  // Finance manager or admin can approve/reject
  if (body.status && ['approved', 'rejected'].includes(body.status)) {
    if (!['admin', 'finance_manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    db.prepare(`
      UPDATE quotations SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?
    `).run(body.status, session.id, id);
    return NextResponse.json({ success: true });
  }

  // Inventory manager can update their own pending quotation
  const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as any;
  if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (quotation.manager_id !== session.id && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (quotation.status !== 'pending') {
    return NextResponse.json({ error: 'Cannot edit non-pending quotation' }, { status: 400 });
  }

  const { title, items, notes } = body;
  const total = items ? items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0) : quotation.total;
  db.prepare('UPDATE quotations SET title = ?, items_json = ?, total = ?, notes = ? WHERE id = ?').run(
    title || quotation.title,
    items ? JSON.stringify(items) : quotation.items_json,
    total,
    notes !== undefined ? notes : quotation.notes,
    id
  );
  return NextResponse.json({ success: true });
}
