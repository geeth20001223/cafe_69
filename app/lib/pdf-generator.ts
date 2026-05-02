import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSLTime } from '@/app/lib/session';

export async function generateSalesPDF(report: any) {
  const doc = new jsPDF();
  const sessionLabel = report.sessionType === 'lunch' ? 'Lunch' : 'Night';

  // Header
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 26);
  doc.text('CAFE 69 — Official Session Report', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${sessionLabel} Session | Date: ${report.date}`, 14, 30);
  doc.text(`Generated: ${report.generated}`, 14, 37);
  doc.line(14, 42, 196, 42);

  // Summary Table
  autoTable(doc, {
    startY: 50,
    head: [['Description', 'Value']],
    body: [
      ['Total Revenue', `LKR ${report.totalRevenue.toFixed(2)}`],
      ['Total Transactions', report.totalTx],
      ['Cash Sales', `LKR ${report.cashSales.toFixed(2)}`],
      ['Card Sales', `LKR ${report.cardSales.toFixed(2)}`],
      ['Total Discount', `LKR ${report.totalDiscount.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [26, 26, 26] },
  });

  // Product Sales
  doc.setFontSize(14);
  doc.setTextColor(26, 26, 26);
  // @ts-ignore
  const finalY1 = doc.lastAutoTable.finalY;
  doc.text('Product Consumption Summary', 14, finalY1 + 15);

  autoTable(doc, {
    startY: finalY1 + 20,
    head: [['Product Name', 'Quantity', 'Revenue']],
    body: report.productSales.map((p: any) => [
      p.product_name,
      p.total_quantity,
      `LKR ${Number(p.total_revenue).toFixed(2)}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [6, 78, 59] },
  });

  // Detailed Transactions
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Detailed Transaction Log', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Ref #', 'Customer', 'Cashier', 'Method', 'Amount', 'Time']],
    body: report.sales.map((s: any) => [
      `#${s.id}`,
      s.customer_name || '-',
      s.cashier_name || '-',
      s.payment_method,
      `LKR ${Number(s.total_amount).toFixed(2)}`,
      (s.created_at || '').slice(11, 16)
    ]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 46, 129] },
  });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateInventoryPDF(data: any) {
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(6, 78, 59);
  doc.text('CAFE 69 — Inventory Status Report', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const slNow = getSLTime();
  doc.text(`Date: ${slNow.toLocaleDateString('en-LK')}`, 14, 30);
  doc.line(14, 35, 196, 35);

  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: [
      ['Total Products', data.summary.total_products],
      ['Inventory Value (Cost)', `LKR ${data.summary.total_value.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
      ['Low Stock Alerts', data.summary.low_stock_count],
    ],
    theme: 'plain',
    styles: { fontStyle: 'bold' }
  });

  // @ts-ignore
  const finalY2 = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: finalY2 + 15,
    head: [['Product', 'Category', 'Stock', 'Threshold', 'Last Restock', 'Restock Date', 'Value (Cost)']],
    body: data.products.map((p: any) => [
      p.name,
      p.category_name || 'Uncategorized',
      `${p.quantity} ${p.unit}`,
      p.low_stock_threshold,
      p.last_restock_qty ? `${p.last_restock_qty} ${p.unit}` : '-',
      p.last_restock_date ? p.last_restock_date.replace('T', ' ').slice(0, 16) : '-',
      `LKR ${(p.quantity * p.cost_price).toFixed(2)}`
    ]),
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [6, 78, 59] },
    columnStyles: {
      2: { halign: 'center' },
      4: { halign: 'center' },
      6: { halign: 'right' }
    }
  });

  return Buffer.from(doc.output('arraybuffer'));
}
