import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const qId = parseInt(id);
  if (isNaN(qId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await req.json();
  const db = getDb();

  console.log(`[quotations-put] ID: ${qId}, Role: ${session.role}, Action: ${body.status || 'Edit'}`);

  // Finance manager or admin can approve/reject
  if (body.status && ['approved', 'rejected'].includes(body.status)) {
    if (!['admin', 'finance_manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const result = await db.execute({
      sql: "UPDATE quotations SET status = ?, approved_by = ?, approved_at = datetime('now', '+5 hours', '30 minutes'), approval_notes = ?, is_read = 0 WHERE id = ?",
      args: [body.status, session.id, body.approval_notes || null, qId]
    });
    
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Quotation not found or no change' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  // Inventory manager can update their own pending quotation
  const qRes = await db.execute({ sql: 'SELECT * FROM quotations WHERE id = ?', args: [id] });
  const quotation = qRes.rows[0] as any;
  if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (quotation.manager_id !== session.id && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (quotation.status !== 'pending') {
    return NextResponse.json({ error: 'Cannot edit non-pending quotation' }, { status: 400 });
  }

  const { title, items, notes } = body;
  const total = items ? items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0) : quotation.total;
  await db.execute({
    sql: 'UPDATE quotations SET title = ?, items_json = ?, total = ?, notes = ? WHERE id = ?',
    args: [
      title || quotation.title,
      items ? JSON.stringify(items) : quotation.items_json,
      total,
      notes !== undefined ? notes : quotation.notes,
      id
    ]
  });
  return NextResponse.json({ success: true });
}
