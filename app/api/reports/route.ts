import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'inventory';
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');

  if (type === 'inventory') {
    // Inventory reports
    let query = 'SELECT r.*, u.name as manager_name FROM inventory_reports r LEFT JOIN users u ON r.manager_id = u.id WHERE 1=1';
    const args: any[] = [];
    if (dateFrom) { query += ' AND r.report_date >= ?'; args.push(dateFrom); }
    if (dateTo) { query += ' AND r.report_date <= ?'; args.push(dateTo); }
    query += ' ORDER BY r.created_at DESC';
    const reports = db.prepare(query).all(...args);
    return NextResponse.json({ reports });
  }

  if (type === 'sales_summary') {
    const from = dateFrom || new Date().toISOString().split('T')[0];
    const to = dateTo || from;

    const summary = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        session_type,
        COUNT(*) as transactions,
        SUM(total_amount) as total,
        SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_total,
        SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_total
      FROM sales
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at), session_type
      ORDER BY date DESC, session_type
    `).all(from, to);

    const topProducts = db.prepare(`
      SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue
      FROM sale_items si
      LEFT JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
      GROUP BY si.product_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all(from, to);

    return NextResponse.json({ summary, topProducts });
  }

  if (type === 'session') {
    const reports = db.prepare('SELECT * FROM session_reports ORDER BY created_at DESC LIMIT 50').all();
    return NextResponse.json({ reports });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, report_date } = await req.json();
  const db = getDb();

  // Generate current inventory snapshot
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active'
    ORDER BY c.name, p.name
  `).all();

  const data = {
    generated_at: new Date().toISOString(),
    generated_by: session.name,
    products,
    summary: {
      total_products: products.length,
      total_value: (products as any[]).reduce((s, p) => s + p.cost_price * p.quantity, 0),
      low_stock_count: (products as any[]).filter(p => p.quantity <= p.low_stock_threshold).length,
    }
  };

  const date = report_date || new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    INSERT INTO inventory_reports (manager_id, report_date, title, data_json)
    VALUES (?, ?, ?, ?)
  `).run(session.id, date, title || `Inventory Report - ${date}`, JSON.stringify(data)) as any;

  return NextResponse.json({ success: true, id: result.lastInsertRowid, data });
}