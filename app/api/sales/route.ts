import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';
import { getCurrentSession } from '@/app/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');
  const sessionType = searchParams.get('session');
  const cashierId = searchParams.get('cashier');

  // Cashiers can only see their own sales
  let query = `
    SELECT s.*, u.name as cashier_name,
           COUNT(si.id) as item_count
    FROM sales s
    LEFT JOIN users u ON s.cashier_id = u.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (session.role === 'cashier') {
    query += ' AND s.cashier_id = ?'; args.push(session.id);
  } else if (cashierId) {
    query += ' AND s.cashier_id = ?'; args.push(cashierId);
  }
  if (dateFrom) { query += ' AND DATE(s.created_at) >= ?'; args.push(dateFrom); }
  if (dateTo) { query += ' AND DATE(s.created_at) <= ?'; args.push(dateTo); }
  if (sessionType) { query += ' AND s.session_type = ?'; args.push(sessionType); }

  query += ' GROUP BY s.id ORDER BY s.created_at DESC';

  const sales = db.prepare(query).all(...args);
  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'cashier'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { items, payment_method, customer_name, customer_phone, notes, discount_amount } = body;

  if (!items || !items.length || !payment_method) {
    return NextResponse.json({ error: 'Items and payment method required' }, { status: 400 });
  }

  const sessionType = getCurrentSession();
  const db = getDb();
  
  // ── Auto-Report Check ──────────────────────────────────────────────────────
  // If we are starting a new session/day, check if the previous one was reported
  try {
    const { checkAndAutoReport } = await import('@/app/lib/auto-reporter');
    await checkAndAutoReport();
  } catch (err) {
    console.error('[Sales API] Auto-report check failed', err);
  }

  const discount = parseFloat(discount_amount || 0);

  // Calculate total
  let total = 0;
  for (const item of items) {
    total += parseFloat(item.unit_price) * parseFloat(item.quantity);
  }
  total = Math.max(0, total - discount);

  const insertSale = db.transaction(() => {
    const saleResult = db.prepare(`
      INSERT INTO sales (cashier_id, session_type, total_amount, discount_amount, payment_method, customer_name, customer_phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.id, sessionType, total, discount, payment_method, customer_name || null, customer_phone || null, notes || null) as any;

    const saleId = saleResult.lastInsertRowid;

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}`);
      }

      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, product.name, item.quantity, item.unit_price, product.cost_price, item.unit_price * item.quantity);

      // Deduct stock
      const newQty = product.quantity - parseFloat(item.quantity);
      db.prepare('UPDATE products SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, item.product_id);

      // Check low stock
      if (newQty <= product.low_stock_threshold) {
        const existing = db.prepare('SELECT id FROM stock_alerts WHERE product_id = ? AND is_read = 0').get(item.product_id);
        if (!existing) {
          db.prepare(`
            INSERT INTO stock_alerts (product_id, alert_type, message)
            VALUES (?, 'low_stock', ?)
          `).run(item.product_id, `Low stock: "${product.name}" has ${newQty} ${product.unit} remaining`);
        }
      }
    }

    return saleId;
  });

  try {
    const saleId = insertSale();
    return NextResponse.json({ success: true, saleId, total });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}