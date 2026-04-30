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

  const products = db.prepare(query).all(...args);
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

  if (!name || cost_price === undefined || selling_price === undefined) {
    return NextResponse.json({ error: 'Name, cost price, and selling price required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO products (name, category_id, cost_price, selling_price, quantity, unit, low_stock_threshold, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    category_id || null,
    parseFloat(cost_price),
    parseFloat(selling_price),
    parseFloat(quantity || 0),
    unit || 'pcs',
    parseFloat(low_stock_threshold || 10),
    description || null
  ) as any;

  // Check if low stock alert needed
  checkAndCreateAlert(db, result.lastInsertRowid as number);

  return NextResponse.json({ success: true, id: result.lastInsertRowid });
}

function checkAndCreateAlert(db: any, productId: number) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (product && product.quantity <= product.low_stock_threshold) {
    // Check if alert already exists (unread)
    const existing = db.prepare(
      'SELECT id FROM stock_alerts WHERE product_id = ? AND is_read = 0'
    ).get(productId);
    if (!existing) {
      db.prepare(`
        INSERT INTO stock_alerts (product_id, alert_type, message)
        VALUES (?, 'low_stock', ?)
      `).run(productId, `Low stock alert: "${product.name}" has ${product.quantity} ${product.unit} remaining (threshold: ${product.low_stock_threshold})`);
    }
  }
}