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
