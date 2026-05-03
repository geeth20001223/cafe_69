import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const saleRes = await db.execute({
    sql: 'SELECT s.*, u.name as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id WHERE s.id = ?',
    args: [id]
  });
  const sale = saleRes.rows[0] as any;
  if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cashiers can only see their own
  if (session.role === 'cashier' && Number(sale.cashier_id) !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const itemsRes = await db.execute({ sql: 'SELECT * FROM sale_items WHERE sale_id = ?', args: [id] });
  const items = itemsRes.rows;
  return NextResponse.json({ sale: { ...sale, items } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'cashier'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  try {
    // 1. Get items to restore stock
    const itemsRes = await db.execute({ sql: 'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', args: [id] });
    const items = itemsRes.rows;

    const queries: any[] = [];
    for (const item of items) {
      queries.push({
        sql: "UPDATE products SET quantity = quantity + ?, updated_at = datetime('now', '+5 hours', '30 minutes') WHERE id = ?",
        args: [item.quantity, item.product_id]
      });
    }

    // 2. Delete sale (items will cascade delete)
    queries.push({ sql: 'DELETE FROM sales WHERE id = ?', args: [id] });

    await db.batch(queries, "write");
    
    const { touchSync } = await import('@/app/lib/db');
    await touchSync();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
