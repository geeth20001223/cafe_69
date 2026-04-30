import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const sale = db.prepare('SELECT s.*, u.name as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id WHERE s.id = ?').get(id) as any;
  if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cashiers can only see their own
  if (session.role === 'cashier' && sale.cashier_id !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
  return NextResponse.json({ sale: { ...sale, items } });
}
