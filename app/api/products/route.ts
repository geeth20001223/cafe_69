import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (category) { query += ' AND p.category_id = ?'; args.push(category); }
  if (status) { query += ' AND p.status = ?'; args.push(status); }
  if (search) { query += ' AND (p.name LIKE ? OR p.description LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY p.name ASC';

  const result = await db.execute({ sql: query, args });
  const products = result.rows;
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, category_id, cost_price, selling_price, quantity, unit, low_stock_threshold, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Prices are initialized to 0; only Finance Manager can set/change them
  const cPrice = 0;
  const sPrice = 0;

  const db = getDb();
  const result = await db.execute({
    sql: `
      INSERT INTO products (name, category_id, cost_price, selling_price, quantity, unit, low_stock_threshold, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      name,
      category_id || null,
      cPrice,
      sPrice,
      parseFloat(quantity || 0),
      unit || 'pcs',
      parseFloat(low_stock_threshold || 10),
      description || null
    ]
  });

  const lastId = Number(result.lastInsertRowid);
  // Check if low stock alert needed
  await checkAndCreateAlert(db, lastId);

  return NextResponse.json({ success: true, id: lastId });
}

async function checkAndCreateAlert(db: any, productId: number) {
  const result = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [productId] });
  const product = result.rows[0] as any;
  if (product && product.quantity <= product.low_stock_threshold) {
    // Check if alert already exists (unread)
    const existingRes = await db.execute({
      sql: 'SELECT id FROM stock_alerts WHERE product_id = ? AND is_read = 0',
      args: [productId]
    });
    if (existingRes.rows.length === 0) {
      await db.execute({
        sql: `
          INSERT INTO stock_alerts (product_id, alert_type, message, created_at)
          VALUES (?, 'low_stock', ?, datetime('now', '+5 hours', '30 minutes'))
        `,
        args: [productId, `Low stock alert: "${product.name}" has ${product.quantity} ${product.unit} remaining (threshold: ${product.low_stock_threshold})`]
      });
    }
  }
}