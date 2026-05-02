import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

// Called when a session ends to generate session report
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'cashier'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { session_type, start_time, end_time } = await req.json();
  if (!session_type || !start_time || !end_time) {
    return NextResponse.json({ error: 'session_type, start_time, end_time required' }, { status: 400 });
  }

  const db = getDb();
  const startDate = start_time.split('T')[0];

  const salesRes = await db.execute({
    sql: `
      SELECT s.*, u.name as cashier_name FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE session_type = ? AND DATE(datetime(created_at, '-7 hours')) = ?
    `,
    args: [session_type, startDate]
  });
  const salesData = salesRes.rows as any[];

  const itemsRes = await db.execute({
    sql: `
      SELECT si.product_name, SUM(si.quantity) as qty, SUM(si.subtotal) as total
      FROM sale_items si
      LEFT JOIN sales s ON si.sale_id = s.id
      WHERE s.session_type = ? AND DATE(datetime(s.created_at, '-7 hours')) = ?
      GROUP BY si.product_name ORDER BY total DESC
    `,
    args: [session_type, startDate]
  });
  const items = itemsRes.rows;

  const total_sales = salesData.reduce((s, sale) => s + sale.total_amount, 0);

  const data = {
    sales: salesData,
    items_summary: items,
    by_payment: {
      cash: salesData.filter(s => s.payment_method === 'cash').reduce((s, x) => s + x.total_amount, 0),
      card: salesData.filter(s => s.payment_method === 'card').reduce((s, x) => s + x.total_amount, 0),
    }
  };

  const result = await db.execute({
    sql: `
      INSERT INTO session_reports (session_type, start_time, end_time, total_sales, total_transactions, data_json, sent_to_finance)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `,
    args: [session_type, start_time, end_time, total_sales, salesData.length, JSON.stringify(data)]
  });

  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid), total_sales, transactions: salesData.length });
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const reportsRes = await db.execute('SELECT * FROM session_reports ORDER BY created_at DESC LIMIT 30');
  const reports = reportsRes.rows;
  return NextResponse.json({ reports });
}
