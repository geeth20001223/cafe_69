import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager', 'finance_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  // Field permissions based on role
  let allowed: string[] = [];
  if (session.role === 'admin') {
    allowed = ['name', 'category_id', 'quantity', 'unit', 'low_stock_threshold', 'status', 'description', 'cost_price', 'selling_price'];
  } else if (session.role === 'finance_manager') {
    allowed = ['cost_price', 'selling_price'];
  } else if (session.role === 'inventory_manager') {
    allowed = ['name', 'category_id', 'quantity', 'unit', 'low_stock_threshold', 'status', 'description'];
  }

  const fields: string[] = [];
  const vals: any[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      const numFields = ['cost_price', 'selling_price', 'quantity', 'low_stock_threshold'];
      vals.push(numFields.includes(key) ? parseFloat(body[key]) : body[key]);
    }
  }
  fields.push('updated_at = datetime(\'now\')');
  vals.push(id);

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...vals);

  // Re-check alerts after update
  checkAndCreateAlert(db, Number(id));

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const db = getDb();
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run('inactive', id);
  return NextResponse.json({ success: true });
}

function checkAndCreateAlert(db: any, productId: number) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (!product) return;
  if (product.quantity <= product.low_stock_threshold) {
    const existing = db.prepare(
      'SELECT id FROM stock_alerts WHERE product_id = ? AND is_read = 0'
    ).get(productId);
    if (!existing) {
      db.prepare(`
        INSERT INTO stock_alerts (product_id, alert_type, message)
        VALUES (?, 'low_stock', ?)
      `).run(productId, `Low stock: "${product.name}" has ${product.quantity} ${product.unit} remaining (threshold: ${product.low_stock_threshold})`);
    }
  } else {
    // Clear old unread alerts if stock is replenished
    db.prepare('UPDATE stock_alerts SET is_read = 1 WHERE product_id = ? AND is_read = 0').run(productId);
  }
}
