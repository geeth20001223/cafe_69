import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';
import { sendStockActionNotification } from '@/app/lib/email';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager', 'finance_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get('unread') === 'true';
  const statusFilter = searchParams.get('status'); // pending | approved | rejected

  let query = `
    SELECT sa.*,
      p.name as product_name, p.quantity, p.unit, p.low_stock_threshold,
      u1.name as requested_by_name,
      u2.name as approved_by_name
    FROM stock_alerts sa
    LEFT JOIN products p ON sa.product_id = p.id
    LEFT JOIN users u1 ON sa.requested_by = u1.id
    LEFT JOIN users u2 ON sa.approved_by = u2.id
  `;
  const conditions: string[] = [];
  if (onlyUnread) conditions.push('sa.is_read = 0');
  if (statusFilter) conditions.push(`sa.status = '${statusFilter}'`);
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  if (statusFilter === 'pending') {
    query += ' ORDER BY sa.created_at DESC';
  } else if (statusFilter === 'approved' || statusFilter === 'rejected') {
    query += ' ORDER BY sa.approved_at DESC';
  } else {
    query += ' ORDER BY sa.created_at DESC';
  }

  const result = await db.execute(query);
  const alerts = result.rows;
  return NextResponse.json({ alerts });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = getDb();
  const { touchSync } = await import('@/app/lib/db');

  // Mark read
  if (body.markRead) {
    await db.execute({ sql: 'UPDATE stock_alerts SET is_read = 1 WHERE id = ?', args: [body.id] });
    await touchSync();
    return NextResponse.json({ success: true });
  }

  // Mark all as read for current view
  if (body.action === 'mark_all_read') {
    // If finance_manager, mark pending as read
    if (session.role === 'finance_manager' || session.role === 'admin') {
      await db.execute("UPDATE stock_alerts SET is_read = 1 WHERE status = 'pending'");
    }
    // If inventory_manager, mark approved/rejected as read
    if (session.role === 'inventory_manager' || session.role === 'admin') {
      await db.execute("UPDATE stock_alerts SET is_read = 1 WHERE status IN ('approved', 'rejected')");
    }
    await touchSync();
    return NextResponse.json({ success: true });
  }

  // Inventory manager: submit restock request
  if (body.action === 'request' && ['admin', 'inventory_manager'].includes(session.role)) {
    const { id, requested_qty } = body;
    if (!requested_qty || requested_qty <= 0) {
      return NextResponse.json({ error: 'requested_qty must be > 0' }, { status: 400 });
    }
    await db.execute({
      sql: `
        UPDATE stock_alerts
        SET requested_qty = ?, requested_by = ?, status = 'pending', is_read = 0
        WHERE id = ?
      `,
      args: [requested_qty, session.id, id]
    });
    await touchSync();

    // Notify others
    const pRes = await db.execute({ sql: 'SELECT name FROM products WHERE id = (SELECT product_id FROM stock_alerts WHERE id = ?)', args: [id] });
    const pName = (pRes.rows[0] as any)?.name || 'Unknown Product';
    sendStockActionNotification({
      productName: pName,
      action: 'requested',
      performedBy: session.name,
      quantity: requested_qty,
      alertId: id
    }).catch(e => console.error('Notification error:', e));

    return NextResponse.json({ success: true });
  }

  // Finance manager: approve with their own qty (bypasses inventory request)
  if (body.action === 'approve_with_qty' && ['admin', 'finance_manager'].includes(session.role)) {
    const { id, qty } = body;
    if (!qty || qty <= 0) return NextResponse.json({ error: 'qty must be > 0' }, { status: 400 });
    const alertRes = await db.execute({ sql: 'SELECT * FROM stock_alerts WHERE id = ?', args: [id] });
    const alert = alertRes.rows[0] as any;
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

    await db.execute({
      sql: `UPDATE stock_alerts SET requested_qty = ?, requested_by = ?, status = 'approved',
            approved_by = ?, approved_at = datetime('now', '+5 hours', '30 minutes'), is_read = 0 WHERE id = ?`,
      args: [qty, session.id, session.id, id]
    });

    await touchSync();

    // Notify others
    const pRes = await db.execute({ sql: 'SELECT name FROM products WHERE id = ?', args: [alert.product_id] });
    const pName = (pRes.rows[0] as any)?.name || 'Unknown Product';
    sendStockActionNotification({
      productName: pName,
      action: 'approved',
      performedBy: session.name,
      quantity: qty,
      alertId: id
    }).catch(e => console.error('Notification error:', e));

    return NextResponse.json({ success: true });
  }

  // Finance manager: approve → updates product quantity
  if (body.action === 'approve' && ['admin', 'finance_manager'].includes(session.role)) {
    const { id } = body;
    const alertRes = await db.execute({ sql: 'SELECT * FROM stock_alerts WHERE id = ?', args: [id] });
    const alert = alertRes.rows[0] as any;
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    if (!alert.requested_qty) return NextResponse.json({ error: 'No restock request submitted yet' }, { status: 400 });

    await db.execute({
      sql: "UPDATE stock_alerts SET status = 'approved', approved_by = ?, approved_at = datetime('now', '+5 hours', '30 minutes'), is_read = 0 WHERE id = ?",
      args: [session.id, id]
    });

    await touchSync();

    // Notify others
    const pRes = await db.execute({ sql: 'SELECT name FROM products WHERE id = ?', args: [alert.product_id] });
    const pName = (pRes.rows[0] as any)?.name || 'Unknown Product';
    sendStockActionNotification({
      productName: pName,
      action: 'approved',
      performedBy: session.name,
      quantity: alert.requested_qty,
      alertId: id
    }).catch(e => console.error('Notification error:', e));

    return NextResponse.json({ success: true });
  }

  // Finance manager: reject
  if (body.action === 'reject' && ['admin', 'finance_manager'].includes(session.role)) {
    const { id } = body;
    await db.execute({
      sql: "UPDATE stock_alerts SET status = 'rejected', is_read = 0, approved_by = ?, approved_at = datetime('now', '+5 hours', '30 minutes') WHERE id = ?",
      args: [session.id, id]
    });
    await touchSync();

    // Notify others
    const pRes = await db.execute({ sql: 'SELECT name FROM products WHERE id = (SELECT product_id FROM stock_alerts WHERE id = ?)', args: [id] });
    const pName = (pRes.rows[0] as any)?.name || 'Unknown Product';
    sendStockActionNotification({
      productName: pName,
      action: 'rejected',
      performedBy: session.name,
      alertId: id
    }).catch(e => console.error('Notification error:', e));

    return NextResponse.json({ success: true });
  }

  // Inventory manager: refill (physically add stock after finance approval)
  if (body.action === 'refill' && ['admin', 'inventory_manager'].includes(session.role)) {
    const { id } = body;
    const alertRes = await db.execute({ sql: 'SELECT * FROM stock_alerts WHERE id = ?', args: [id] });
    const alert = alertRes.rows[0] as any;
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    if (alert.status !== 'approved') return NextResponse.json({ error: 'Only approved requests can be refilled' }, { status: 400 });

    const qtyToAdd = alert.requested_qty || 0;

    await db.batch([
      {
        sql: "UPDATE products SET quantity = quantity + ?, updated_at = datetime('now', '+5 hours', '30 minutes') WHERE id = ?",
        args: [qtyToAdd, alert.product_id]
      },
      {
        sql: "UPDATE stock_alerts SET status = 'refilled', refilled_at = datetime('now', '+5 hours', '30 minutes'), refilled_by = ? WHERE id = ?",
        args: [session.id, id]
      }
    ], "write");

    await touchSync();
    return NextResponse.json({ success: true });
  }

  // Legacy: mark read by id only
  if (body.id) {
    await db.execute({ sql: 'UPDATE stock_alerts SET is_read = 1 WHERE id = ?', args: [body.id] });
    await touchSync();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
