import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';
import { sendStockAlertEmail } from '@/app/lib/email';

export async function POST(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'inventory_manager'].includes(session.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { alertId } = await req.json();
    if (!alertId) {
        return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    const db = getDb();

    // Fetch full alert details including product info
    const alertRes = await db.execute({
      sql: `
        SELECT sa.*, p.name as product_name, p.quantity, p.unit, p.low_stock_threshold
        FROM stock_alerts sa
        LEFT JOIN products p ON sa.product_id = p.id
        WHERE sa.id = ?
      `,
      args: [alertId]
    });
    const alert = alertRes.rows[0] as any;

    if (!alert) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const result = await sendStockAlertEmail({
        productName: alert.product_name,
        quantity: alert.quantity,
        unit: alert.unit,
        threshold: alert.low_stock_threshold,
        alertMessage: alert.message,
        createdAt: alert.created_at,
    });

    if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Email sent to stock manager successfully` });
}
