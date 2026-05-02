import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';
import { transporter } from '@/app/lib/mailer';
import { getSLTime, getSLDateString } from '@/app/lib/session';
import { generateInventoryPDF } from '@/app/lib/pdf-generator';

// ─── HTML email builder for inventory ─────────────────────────────────────────
function buildInventoryEmailHtml(reportTitle: string, data: any): string {
  const generatedBy = data.generated_by;
  const generatedAt = new Date(data.generated_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });

  const rows = data.products
    .map((p: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500;">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#6b7280;">${p.category_name || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:${p.quantity <= p.low_stock_threshold ? '#dc2626' : '#111'};font-weight:${p.quantity <= p.low_stock_threshold ? 'bold' : 'normal'};">
        ${p.quantity} ${p.unit}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#4f46e5;">
        ${p.last_restock_qty ? `${p.last_restock_qty} ${p.unit}<br><span style="font-size:11px;color:#888;">${new Date(p.last_restock_date).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</span>` : '—'}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">LKR ${(p.cost_price * p.quantity).toFixed(2)}</td>
    </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${reportTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:850px;margin:20px auto;background:#fff;border:1px solid #e1e4e8;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background:#064e3b;padding:40px 32px;color:#fff;border-bottom:4px solid #10b981;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:32px;font-weight:800;letter-spacing:-1px;">CAFE 69</div>
          <div style="font-size:14px;color:#34d399;font-weight:600;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Inventory Status Report</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:700;">Stock Snapshot</div>
          <div style="font-size:13px;opacity:0.8;">${new Date(data.generated_at).toLocaleDateString('en-LK')}</div>
        </div>
      </div>
    </div>

    <!-- Summary Box -->
    <div style="padding:32px;background:#fff;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
        <div style="padding:20px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#0369a1;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Active Products</div>
          <div style="font-size:24px;font-weight:800;color:#0ea5e9;">${data.summary.total_products}</div>
        </div>
        <div style="padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#166534;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Inventory Value</div>
          <div style="font-size:24px;font-weight:800;color:#15803d;">LKR ${data.summary.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div style="padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Low Stock Alerts</div>
          <div style="font-size:24px;font-weight:800;color:#dc2626;">${data.summary.low_stock_count}</div>
        </div>
      </div>

      <!-- Table -->
      <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #eee;">Current Stock Levels</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:12px;text-align:left;border:1px solid #e2e8f0;color:#475569;">Product Detail</th>
            <th style="padding:12px;text-align:left;border:1px solid #e2e8f0;color:#475569;">Category</th>
            <th style="padding:12px;text-align:center;border:1px solid #e2e8f0;color:#475569;">Current Stock</th>
            <th style="padding:12px;text-align:right;border:1px solid #e2e8f0;color:#475569;">Valuation (Cost)</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="padding:24px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0;">No inventory data available</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:32px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="margin-bottom:20px;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://cafe-69.vercel.app')}/api/auth/force?to=/dashboard/inventory/reports" 
           style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.2);">
          🔐 View Detailed Report in POS
        </a>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Generated by ${generatedBy} at ${generatedAt}</div>
      <div style="font-size:10px;color:#94a3b8;">Cafe 69 POS System · Internal Audit Document</div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'inventory';
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');

  if (type === 'inventory') {
    let query = 'SELECT r.*, u.name as manager_name FROM inventory_reports r LEFT JOIN users u ON r.manager_id = u.id WHERE 1=1';
    const args: any[] = [];
    if (dateFrom) { query += ' AND r.report_date >= ?'; args.push(dateFrom); }
    if (dateTo) { query += ' AND r.report_date <= ?'; args.push(dateTo); }
    query += ' ORDER BY r.created_at DESC';
    const reportsRes = await db.execute({ sql: query, args });
    const reports = reportsRes.rows;
    return NextResponse.json({ reports });
  }

  if (type === 'sales_summary') {
    const slNow = getSLTime();
    const from = dateFrom || getSLDateString(slNow);
    const to = dateTo || from;
    const summaryRes = await db.execute({
      sql: `
        SELECT DATE(created_at) as date, session_type, COUNT(*) as transactions, SUM(total_amount) as total,
          SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_total,
          SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END) as card_total
        FROM sales WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at), session_type ORDER BY date DESC, session_type
      `,
      args: [from, to]
    });
    const summary = summaryRes.rows;
    const topProductsRes = await db.execute({
      sql: `
        SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue
        FROM sale_items si LEFT JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.created_at) BETWEEN ? AND ? GROUP BY si.product_name ORDER BY total_revenue DESC LIMIT 10
      `,
      args: [from, to]
    });
    const topProducts = topProductsRes.rows;
    return NextResponse.json({ summary, topProducts });
  }

  if (type === 'session') {
    const reportsRes = await db.execute('SELECT * FROM session_reports ORDER BY created_at DESC LIMIT 50');
    const reports = reportsRes.rows;
    return NextResponse.json({ reports });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'inventory_manager', 'cashier'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, report_date } = await req.json();
  const db = getDb();

  const productsRes = await db.execute(`
    SELECT p.*, c.name as category_name,
           (SELECT requested_qty FROM stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'approved' ORDER BY sa.approved_at DESC LIMIT 1) as last_restock_qty,
           (SELECT approved_at FROM stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'approved' ORDER BY sa.approved_at DESC LIMIT 1) as last_restock_date
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' ORDER BY c.name, p.name
  `);
  const products = productsRes.rows;

  const slNow = getSLTime();
  const data = {
    generated_at: slNow.toISOString(),
    generated_by: session.name,
    products,
    summary: {
      total_products: products.length,
      total_value: (products as any[]).reduce((s, p) => s + p.cost_price * p.quantity, 0),
      low_stock_count: (products as any[]).filter(p => p.quantity <= p.low_stock_threshold).length,
    }
  };

  const date = report_date || getSLDateString(slNow);
  const finalTitle = title || `Inventory Report - ${date}`;
  const result = await db.execute({
    sql: `
      INSERT INTO inventory_reports (manager_id, report_date, title, data_json)
      VALUES (?, ?, ?, ?)
    `,
    args: [session.id, date, finalTitle, JSON.stringify(data)]
  });

  let recipients: string[] = [];
  const envEmail = process.env.FINANCE_MANAGER_EMAIL?.trim();
  if (envEmail) {
    recipients = [envEmail];
  } else {
    const managersRes = await db.execute("SELECT email FROM users WHERE role = 'finance_manager' AND is_active = 1");
    recipients = managersRes.rows.map(m => String(m.email));
  }
  let emailSent = false;
  let emailReason = '';

  if (recipients.length > 0) {
    const html = buildInventoryEmailHtml(finalTitle, data);
    let attachments = [];

    try {
      const pdfBuffer = await generateInventoryPDF(data);
      attachments.push({
        filename: `${finalTitle.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer
      });
    } catch (pdfErr: any) {
      console.error('[inventory-report] PDF generation error:', pdfErr.message);
    }

    try {
      await transporter.sendMail({
        from: `"Cafe 69 POS" <${process.env.GMAIL_USER}>`,
        to: recipients.join(', '),
        subject: `[Cafe 69] ${finalTitle}`,
        html,
        attachments
      });
      emailSent = true;
    } catch (e: any) {
      console.error('[inventory-report] Email error:', e.message);
      emailReason = e.message;
    }
  }

  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid), data, emailSent, emailReason, sentTo: recipients });
}