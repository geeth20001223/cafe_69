import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';
import { transporter } from '@/app/lib/mailer';

// ─── HTML email builder ───────────────────────────────────────────────────────
function buildEmailHtml(report: {
  sessionType: string;
  date: string;
  generated: string;
  cashierName: string;
  totalRevenue: number;
  totalTx: number;
  cashSales: number;
  cardSales: number;
  totalDiscount: number;
  sales: any[];
  productSales: any[];
}): string {
  const sessionLabel = report.sessionType === 'lunch' ? '🌅 Lunch Session' : '🌙 Night Session';

  const rows = report.sales
    .map(
      (s) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">#${s.id}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.customer_name || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${s.cashier_name || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-transform:capitalize;">${s.payment_method}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#16a34a;">LKR ${Number(s.total_amount).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888;">${(s.created_at || '').slice(11, 16)}</td>
    </tr>`
    )
    .join('');

  const noSalesRow = `
    <tr>
      <td colspan="6" style="padding:20px;text-align:center;color:#888;">No sales recorded in this session</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Session Close Report — Cafe 69</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:800px;margin:20px auto;background:#fff;border:1px solid #e1e4e8;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background:#1a1a1a;padding:40px 32px;color:#fff;border-bottom:4px solid #f59e0b;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:32px;font-weight:800;letter-spacing:-1px;">CAFE 69</div>
          <div style="font-size:14px;color:#fbbf24;font-weight:600;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Official Session Report</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:700;">${sessionLabel}</div>
          <div style="font-size:13px;opacity:0.8;">${report.date}</div>
        </div>
      </div>
    </div>

    <!-- Summary Box -->
    <div style="padding:32px;background:#fff;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
        <div style="padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
          <div style="font-size:11px;color:#166534;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Total Revenue</div>
          <div style="font-size:20px;font-weight:800;color:#15803d;">LKR ${report.totalRevenue.toFixed(2)}</div>
        </div>
        <div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;text-align:center;">
          <div style="font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Transactions</div>
          <div style="font-size:20px;font-weight:800;color:#1d4ed8;">${report.totalTx}</div>
        </div>
        <div style="padding:16px;background:#fefce8;border:1px solid #fef08a;border-radius:8px;text-align:center;">
          <div style="font-size:11px;color:#854d0e;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Cash Volume</div>
          <div style="font-size:20px;font-weight:800;color:#a16207;">LKR ${report.cashSales.toFixed(2)}</div>
        </div>
        <div style="padding:16px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;text-align:center;">
          <div style="font-size:11px;color:#6b21a8;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Card Volume</div>
          <div style="font-size:20px;font-weight:800;color:#7e22ce;">LKR ${report.cardSales.toFixed(2)}</div>
        </div>
      </div>

      <!-- Tables -->
      <div style="margin-bottom:32px;">
        <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #eee;">Inventory Consumption Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:12px;text-align:left;border:1px solid #e2e8f0;color:#475569;">Item Name</th>
              <th style="padding:12px;text-align:center;border:1px solid #e2e8f0;color:#475569;">Qty Sold</th>
              <th style="padding:12px;text-align:right;border:1px solid #e2e8f0;color:#475569;">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            ${report.productSales.length > 0 
              ? report.productSales.map((p, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#fcfcfc'};">
                  <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:600;">${p.product_name}</td>
                  <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;">${p.total_quantity}</td>
                  <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#15803d;">LKR ${Number(p.total_revenue).toFixed(2)}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="3" style="padding:24px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0;">No items sold</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <div>
        <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #eee;">Detailed Transaction Log</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;color:#475569;">Ref #</th>
              <th style="padding:10px;text-align:left;border:1px solid #e2e8f0;color:#475569;">Customer / Cashier</th>
              <th style="padding:10px;text-align:center;border:1px solid #e2e8f0;color:#475569;">Method</th>
              <th style="padding:10px;text-align:right;border:1px solid #e2e8f0;color:#475569;">Amount</th>
              <th style="padding:10px;text-align:center;border:1px solid #e2e8f0;color:#475569;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${report.sales.length > 0 ? rows : noSalesRow}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Report Generated Automatically by Cafe 69 System</div>
      <div style="font-size:10px;color:#94a3b8;">System Time: ${report.generated} | Status: Finalized</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── POST /api/session-close ──────────────────────────────────────────────────
import { generateSalesPDF, generateInventoryPDF } from '@/app/lib/pdf-generator';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  let { sessionType, date, totalRevenue, totalTx, cashSales, cardSales, totalDiscount, sales } = body;

  const database = getDb();
  
  // Logical Session Range calculation
  const now = new Date();
  const businessDay = date || now.toISOString().split('T')[0];
  const sType = sessionType || (now.getHours() >= 7 && now.getHours() < 16 ? 'lunch' : 'night');

  let startTime, endTime;
  if (sType === 'lunch') {
    startTime = `${businessDay} 07:00:00`;
    endTime = `${businessDay} 15:59:59`;
  } else {
    const bDayObj = new Date(businessDay);
    const nextDayObj = new Date(bDayObj);
    nextDayObj.setDate(bDayObj.getDate() + 1);
    const nextDay = nextDayObj.toISOString().split('T')[0];
    startTime = `${businessDay} 16:00:00`;
    endTime = `${nextDay} 06:59:59`;
  }

  // 1. Fetch Sales Data
  const salesRes = await database.execute({
    sql: `
      SELECT s.*, u.name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.created_at BETWEEN ? AND ? 
      AND s.status = 'completed'
    `,
    args: [startTime, endTime]
  });
  const salesData = salesRes.rows as any[];

  sales = salesData;
  totalRevenue = sales.reduce((s: number, s2: any) => s + s2.total_amount, 0);
  totalTx = sales.length;
  cashSales = sales.filter((s: any) => s.payment_method === 'cash').reduce((s: number, s2: any) => s + s2.total_amount, 0);
  cardSales = sales.filter((s: any) => s.payment_method === 'card').reduce((s: number, s2: any) => s + s2.total_amount, 0);
  totalDiscount = sales.reduce((s: number, s2: any) => s + (s2.discount_amount || 0), 0);
  sessionType = sType;
  date = businessDay;

  // 2. Fetch Product Sales Summary
  const itemsSummaryRes = await database.execute({
    sql: `
      SELECT si.product_name, SUM(si.quantity) as qty, SUM(si.subtotal) as total
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY si.product_name ORDER BY total DESC
    `,
    args: [startTime, endTime]
  });
  const itemsSummary = itemsSummaryRes.rows;

  // 3. Fetch Inventory Data (Snapshot)
  const productsRes = await database.execute(`
    SELECT p.*, c.name as category_name,
           (SELECT requested_qty FROM stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'approved' ORDER BY sa.approved_at DESC LIMIT 1) as last_restock_qty,
           (SELECT approved_at FROM stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'approved' ORDER BY sa.approved_at DESC LIMIT 1) as last_restock_date
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' ORDER BY c.name, p.name
  `);
  const products = productsRes.rows;

  const inventoryData = {
    generated_at: now.toISOString(),
    generated_by: session.name,
    products,
    summary: {
      total_products: products.length,
      total_value: (products as any[]).reduce((s, p) => s + p.cost_price * p.quantity, 0),
      low_stock_count: (products as any[]).filter(p => p.quantity <= p.low_stock_threshold).length,
    }
  };

  const finalDataJson = {
    ...body,
    session_type: sessionType,
    date: date,
    total_sales: totalRevenue,
    total_transactions: totalTx,
    by_payment: {
      cash: cashSales,
      card: cardSales
    },
    items_summary: itemsSummary,
    inventory: inventoryData,
    sales: salesData
  };

  // 4. Save Session Report to DB
  try {
    await database.execute({
      sql: `
        INSERT INTO session_reports (session_type, start_time, end_time, total_sales, total_transactions, data_json, sent_to_finance)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      args: [
        sessionType,
        startTime,
        endTime,
        totalRevenue,
        totalTx,
        JSON.stringify(finalDataJson)
      ]
    });
  } catch (dbErr) {
    console.error('[session-close] DB error:', dbErr);
  }

  // 4. Recipients
  const managersRes = await database.execute(
    "SELECT email FROM users WHERE role = 'finance_manager' AND is_active = 1"
  );
  const recipients = managersRes.rows.map(m => String(m.email));

  if (!recipients.length) {
    return NextResponse.json({ success: true, emailSent: false, reason: 'No recipients' });
  }

  // 5. Build Combined Email
  const productSalesRes = await database.execute({
    sql: `
      SELECT si.product_name, SUM(si.quantity) as total_quantity, SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY si.product_name ORDER BY total_revenue DESC
    `,
    args: [startTime, endTime]
  });
  const productSales = productSalesRes.rows;

  const reportObj = {
    sessionType, date, generated: now.toLocaleString('en-LK'), cashierName: session.name,
    totalRevenue: Number(totalRevenue), totalTx: Number(totalTx),
    cashSales: Number(cashSales), cardSales: Number(cardSales), totalDiscount: Number(totalDiscount),
    sales: sales || [], productSales: productSales || [],
  };

  const salesHtml = buildEmailHtml(reportObj);
  const combinedHtml = salesHtml.replace('</body></html>', `
    <div style="padding: 20px; border-top: 2px dashed #eee; margin-top: 30px;">
      <h2 style="color: #064e3b; margin-bottom: 10px;">Inventory Snapshot</h2>
      <p>Attached to this email, you will also find the full <strong>Inventory_Status.pdf</strong> showing current stock levels and valuations.</p>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
        <div style="font-size: 14px; color: #166534;"><strong>Total Stock Value:</strong> LKR ${inventoryData.summary.total_value.toLocaleString()}</div>
        <div style="font-size: 14px; color: #991b1b;"><strong>Low Stock Alerts:</strong> ${inventoryData.summary.low_stock_count} items</div>
      </div>
    </div>
  </body></html>`);

  try {
    let attachments = [];
    try {
      const salesPdf = await generateSalesPDF(reportObj);
      attachments.push({ filename: `Sales_Report_${date}_${sessionType}.pdf`, content: salesPdf });
      
      const invPdf = await generateInventoryPDF(inventoryData);
      attachments.push({ filename: `Inventory_Status_${date}.pdf`, content: invPdf });
    } catch (pdfErr: any) {
      console.error('[session-close] PDF generation failed:', pdfErr.message);
    }

    await transporter.sendMail({
      from: `"Cafe 69 POS" <${process.env.GMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `[Cafe 69] Combined Session & Inventory Report — ${date} (${sType})`,
      html: combinedHtml,
      attachments
    });

    await database.execute({
      sql: 'UPDATE session_reports SET sent_to_finance = 1 WHERE session_type = ? AND start_time = ?',
      args: [sessionType, startTime]
    });

    return NextResponse.json({ success: true, emailSent: true, sentTo: recipients });
  } catch (err: any) {
    console.error('[session-close] Email error:', err.message);
    return NextResponse.json({ success: true, emailSent: false, error: err.message });
  }
}
