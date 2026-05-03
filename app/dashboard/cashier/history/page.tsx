'use client';
import { useState, useEffect } from 'react';
import { getBusinessDateString } from '@/app/lib/session';

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(getBusinessDateString());
  const [dateTo, setDateTo] = useState(getBusinessDateString());
  const [sessionFilter, setSessionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (sessionFilter) params.set('session', sessionFilter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/sales?${params}`);
    if (res.ok) { const d = await res.json(); setSales(d.sales); }
  };
  useEffect(() => { load(); }, [dateFrom, dateTo, sessionFilter, search]);

  async function viewDetail(id: number) {
    const res = await fetch(`/api/sales/${id}`);
    if (res.ok) { const d = await res.json(); setDetail(d.sale); }
  }

  function printKOT(bill: any) {
    const now = new Date(bill.created_at || Date.now()).toLocaleString('en-LK');
    const rows = (bill.items || []).map((item: any) =>
      `<tr><td style="font-size:18px;font-weight:bold;padding:10px 0">${item.product_name}</td><td style="font-size:22px;font-weight:bold;text-align:right">x ${item.quantity}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>KOT #${bill.id}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:0.5cm;max-width:80mm}
        h1{font-size:22px;text-align:center;margin-bottom:2px;border-bottom:2px solid #000;padding-bottom:5px}
        p{text-align:center;font-size:14px;margin:5px 0;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        td{border-bottom:1px dashed #ccc}
        .footer{text-align:center;font-size:12px;margin-top:20px;border-top:1px solid #000;padding-top:10px}
      </style></head><body>
      <h1>KITCHEN ORDER (KOT)</h1>
      <p>Order #${bill.id} · ${bill.session_type}</p>
      <p>${now}</p>
      ${bill.customer_name ? `<p>Customer: ${bill.customer_name}</p>` : ''}
      <hr>
      <table><tbody>${rows}</tbody></table>
      <div class="footer">Cafe 69 POS · Kitchen Copy</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  function printBill(bill: any) {
    const now = new Date(bill.created_at || Date.now()).toLocaleString('en-LK');
    const rows = (bill.items || []).map((item: any) =>
      `<tr><td>${item.product_name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">LKR ${item.unit_price.toFixed(2)}</td><td style="text-align:right">LKR ${item.subtotal.toFixed(2)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${bill.id}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:1cm;max-width:80mm}
        h1{font-size:16px;text-align:center;margin-bottom:2px} p{text-align:center;font-size:11px;color:#555;margin:2px 0}
        hr{border:none;border-top:1px dashed #999;margin:8px 0}
        table{width:100%;font-size:11px;border-collapse:collapse}
        th{font-size:10px;text-align:left;border-bottom:1px solid #ccc;padding:3px 2px}
        td{padding:3px 2px;vertical-align:top}
        .total{font-size:14px;font-weight:bold;text-align:right;margin-top:6px}
        .footer{text-align:center;font-size:10px;color:#888;margin-top:10px}
        @media print{@page{margin:0.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69</h1>
      <p>Receipt #${bill.id} · ${bill.session_type} session</p>
      <p>${now}</p>
      ${bill.customer_name ? `<p>Customer: ${bill.customer_name}</p>` : ''}
      ${bill.customer_phone ? `<p>Mobile: ${bill.customer_phone}</p>` : ''}
      <hr>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <hr>
      ${bill.discount_amount > 0 ? `<div style="text-align:right;font-size:12px">Discount: − LKR ${bill.discount_amount.toFixed(2)}</div>` : ''}
      <div class="total">TOTAL: LKR ${bill.total_amount.toFixed(2)}</div>
      <div style="text-align:right;font-size:11px">Payment: ${bill.payment_method}</div>
      <div class="footer">Thank you! Visit again ☕</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  function printAllSales() {
    const now = new Date().toLocaleString('en-LK');
    const totalRevenue = sales.reduce((s, sale) => s + sale.total_amount, 0);
    const rows = sales.map(s =>
      `<tr><td>#${s.id}</td><td>${s.session_type}</td><td>${s.customer_name || '—'}</td><td>${s.payment_method}</td><td>${s.item_count} items</td><td style="text-align:right;font-weight:bold">LKR ${s.total_amount.toFixed(2)}</td><td>${(s.created_at || '').slice(0, 16)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Sales History — Cafe 69</title>
      <style>
        body{font-family:Arial,sans-serif;margin:2cm;color:#000}
        h1{font-size:20px;margin-bottom:4px} p{font-size:12px;color:#555;margin:2px 0 12px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#f5f5f5;padding:8px 10px;text-align:left;border:1px solid #ddd;font-weight:600}
        td{padding:7px 10px;border:1px solid #ddd}
        .total{font-size:14px;font-weight:bold;text-align:right;margin-top:12px;color:#333}
        .footer{margin-top:20px;font-size:11px;color:#888;text-align:center}
        @media print{@page{margin:1.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69 — Sales History</h1>
      <p>Generated: ${now} · ${sales.length} transactions · ${dateFrom || 'All dates'} ${dateTo ? '→ ' + dateTo : ''}</p>
      <table><thead><tr><th>#</th><th>Session</th><th>Customer</th><th>Payment</th><th>Items</th><th>Amount</th><th>Date/Time</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="total">Grand Total: LKR ${totalRevenue.toFixed(2)}</div>
      <div class="footer">Cafe 69 POS System · Sales Report</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  const totalRevenue = sales.reduce((s, sale) => s + sale.total_amount, 0);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📜 Sales History</h1>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-secondary" onClick={() => {
            const parts = window.location.pathname.split('/');
            if (parts[parts.length - 1] === 'history') parts.pop();
            window.location.href = parts.join('/');
          }}>◀ Back to POS</button>
          <button className="btn btn-secondary" onClick={printAllSales}>🖨️ Print Report</button>
        </div>
      </div>

      <div className="card fade-in stagger-1" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.35rem' }}>🔍 Search Customer, Mobile or Bill #</label>
          <input className="input" style={{ width: '100%' }} placeholder="e.g. John, 077..., 1045" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.35rem' }}>From Date</label>
          <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.35rem' }}>To Date</label>
          <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.35rem' }}>Session</label>
          <select className="input" value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}>
            <option value="">All Sessions</option>
            <option value="lunch">Lunch</option>
            <option value="night">Night</option>
          </select>
        </div>
        <div style={{ paddingBottom: '.5rem', fontWeight: 700, color: 'var(--accent)', marginLeft: 'auto' }}>
          LKR {totalRevenue.toFixed(2)} ({sales.length} sales)
        </div>
      </div>

      <div className="card table-wrap fade-in stagger-2">
        <table style={{ minWidth: '900px', borderCollapse: 'separate', borderSpacing: '0 .25rem' }}>
          <thead>
            <tr>
              <th style={{ width: '8%' }}>#</th>
              <th style={{ width: '12%' }}>Session</th>
              <th style={{ width: '25%' }}>Customer</th>
              <th style={{ width: '12%' }}>Payment</th>
              <th style={{ width: '10%' }}>Items</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Total (LKR)</th>
              <th style={{ width: '10%' }}>Time</th>
              <th style={{ width: '8%', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody style={{ verticalAlign: 'middle' }}>
            {sales.map(s => (
              <tr key={s.id}>
                <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{s.id}</td>
                <td><span className={`badge badge-${s.session_type}`}>{s.session_type}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <div>{s.customer_name || '—'}</div>
                  {s.customer_phone && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>📱 {s.customer_phone}</div>}
                </td>
                <td><span className="badge badge-pending">{s.payment_method}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{s.item_count} items</td>
                <td style={{ fontWeight: 700, color: 'var(--success)', textAlign: 'right' }}>{s.total_amount.toFixed(2)}</td>
                <td style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.created_at?.slice(11, 16)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewDetail(s.id)}>View</button>
                </td>
              </tr>
            ))}
            {!sales.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No sales found</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Sale #{detail.id}</h2>
            <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '.75rem' }}>
              <span className={`badge badge-${detail.session_type}`}>{detail.session_type}</span>
               &nbsp; {detail.payment_method} &nbsp; {detail.created_at?.slice(0, 16)}
            </div>
            {(detail.customer_name || detail.customer_phone) && (
              <div style={{ background: 'var(--bg-secondary)', padding: '.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.85rem' }}>
                {detail.customer_name && <div><strong>Customer:</strong> {detail.customer_name}</div>}
                {detail.customer_phone && <div><strong>Mobile:</strong> {detail.customer_phone}</div>}
              </div>
            )}
            {detail.items?.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', padding: '.3rem 0', borderBottom: '1px solid rgba(42,42,58,.5)' }}>
                <span>{item.product_name} × {item.quantity}</span>
                <span>LKR {item.subtotal.toFixed(2)}</span>
              </div>
            ))}
            {detail.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', marginTop: '.5rem', fontSize: '.875rem' }}><span>Discount</span><span>− LKR {detail.discount_amount.toFixed(2)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', marginTop: '.75rem' }}><span>Total</span><span>LKR {detail.total_amount.toFixed(2)}</span></div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" style={{ flex: 1, minWidth: '90px', justifyContent: 'center' }} onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-danger" style={{ flex: 1, minWidth: '90px', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} onClick={() => {
                if(window.confirm('Void this bill and return to POS for editing?')) {
                  const parts = window.location.pathname.split('/');
                  if (parts[parts.length - 1] === 'history') parts.pop();
                  window.location.href = parts.join('/') + `?edit=${detail.id}`;
                }
              }}>✏️ Edit</button>
              <button className="btn btn-secondary" style={{ flex: 1, minWidth: '90px', justifyContent: 'center', background: 'rgba(99,102,241,0.1)', color: '#818cf8' }} onClick={() => printKOT(detail)}>🖨️ KOT</button>
              <button className="btn btn-primary" style={{ flex: 1, minWidth: '90px', justifyContent: 'center' }} onClick={() => printBill(detail)}>🖨️ Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
