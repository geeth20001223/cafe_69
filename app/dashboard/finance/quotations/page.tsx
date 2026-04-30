'use client';
import { useState, useEffect } from 'react';

export default function FinanceQuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [detail, setDetail] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch('/api/quotations' + params);
    if (res.ok) { const d = await res.json(); setQuotations(d.quotations); }
  };
  useEffect(() => { load(); }, [filterStatus]);

  async function decide(id: number, status: 'approved' | 'rejected') {
    setProcessing(true);
    await fetch(`/api/quotations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setDetail(null); load(); setProcessing(false);
  }

  function printQuotation(q: any) {
    const parsedItems = JSON.parse(q.items_json || '[]');
    const now = new Date().toLocaleString('en-LK');
    const rows = parsedItems.map((item: any) =>
      `<tr><td>${item.name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">LKR ${parseFloat(item.unit_price).toFixed(2)}</td><td style="text-align:right;font-weight:bold">LKR ${(item.quantity * item.unit_price).toFixed(2)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Quotation — ${q.title}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:2cm;color:#000}
        h1{font-size:20px;margin-bottom:4px} .meta{font-size:12px;color:#555;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#f5f5f5;padding:8px 10px;text-align:left;border:1px solid #ddd;font-weight:600}
        td{padding:7px 10px;border:1px solid #ddd}
        .grand{text-align:right;font-size:16px;font-weight:bold;margin-top:12px}
        .status{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600}
        .status-pending{background:#fef3c7;color:#92400e}
        .status-approved{background:#d1fae5;color:#065f46}
        .status-rejected{background:#fee2e2;color:#991b1b}
        .footer{margin-top:24px;font-size:11px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:12px}
        @media print{@page{margin:1.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69 — Quotation Review</h1>
      <div class="meta">
        <strong>${q.title}</strong><br>
        Submitted by: ${q.manager_name || '—'} · Date: ${(q.created_at || '').slice(0, 10)}<br>
        Printed: ${now}<br>
        Status: <span class="status status-${q.status}">${q.status.toUpperCase()}</span>
        ${q.approver_name ? ` · Reviewed by: ${q.approver_name}` : ''}
      </div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Quantity</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody></table>
      ${q.notes ? `<p style="margin-top:12px;font-size:12px;color:#555">Notes: ${q.notes}</p>` : ''}
      <div class="grand">Grand Total: LKR ${parseFloat(q.total).toFixed(2)}</div>
      <div class="footer">Cafe 69 POS System · Finance Department · Quotation Review Document</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>📋 Quotations Review</h1>

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '.75rem' }}>
        <select className="input" style={{ maxWidth: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Manager</th><th>Total (LKR)</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {quotations.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 500 }}>{q.title}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{q.manager_name}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{parseFloat(q.total).toFixed(2)}</td>
                <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{q.created_at?.slice(0, 10)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDetail(q)}>Review</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => printQuotation(q)}>🖨️</button>
                  </div>
                </td>
              </tr>
            ))}
            {!quotations.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No quotations found</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700 }}>{detail.title}</h2>
              <span className={`badge badge-${detail.status}`}>{detail.status}</span>
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              By: {detail.manager_name} · {detail.created_at?.slice(0, 10)}
            </div>
            <div className="table-wrap" style={{ marginBottom: '1rem' }}>
              <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {JSON.parse(detail.items_json || '[]').map((item: any, i: number) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>LKR {parseFloat(item.unit_price).toFixed(2)}</td>
                      <td style={{ color: 'var(--accent)' }}>LKR {(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.notes && <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Notes: {detail.notes}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', marginBottom: '1.25rem' }}>
              Grand Total: LKR {parseFloat(detail.total).toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => printQuotation(detail)}>🖨️ Print</button>
              {detail.status === 'pending' && <>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} disabled={processing} onClick={() => decide(detail.id, 'rejected')}>✕ Reject</button>
                <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} disabled={processing} onClick={() => decide(detail.id, 'approved')}>✓ Approve</button>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
