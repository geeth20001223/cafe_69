'use client';
import { useState, useEffect } from 'react';

interface QuotationItem { name: string; quantity: number; unit_price: number; }

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<QuotationItem[]>([{ name: '', quantity: 1, unit_price: 0 }]);
  const [qTitle, setQTitle] = useState('');
  const [qNotes, setQNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch('/api/quotations' + params);
    if (res.ok) { const d = await res.json(); setQuotations(d.quotations); }
  };
  useEffect(() => { 
    load(); 
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  function addItem() { setItems([...items, { name: '', quantity: 1, unit_price: 0 }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof QuotationItem, val: string | number) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: field === 'name' ? val : parseFloat(String(val)) || 0 } : item));
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch('/api/quotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: qTitle, items, notes: qNotes }) });
    if (res.ok) { setShowModal(false); setItems([{ name: '', quantity: 1, unit_price: 0 }]); setQTitle(''); setQNotes(''); load(); }
    setSaving(false);
  }

  function printQuotation(q: any) {
    const parsedItems: QuotationItem[] = JSON.parse(q.items_json || '[]');
    const now = new Date().toLocaleString('en-LK');
    const rows = parsedItems.map(item =>
      `<tr><td>${item.name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">LKR ${parseFloat(String(item.unit_price)).toFixed(2)}</td><td style="text-align:right;font-weight:bold">LKR ${(item.quantity * item.unit_price).toFixed(2)}</td></tr>`
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
      <h1>☕ Cafe 69 — Quotation</h1>
      <div class="meta">
        <strong>${q.title}</strong><br>
        Submitted by: ${q.manager_name || '—'} · Date: ${q.created_at?.replace('T', ' ').slice(0, 19)}<br>
        Printed: ${now}<br>
        Status: <span class="status status-${q.status}">${q.status.toUpperCase()}</span>
        ${q.approver_name ? ` · Reviewed by: ${q.approver_name}` : ''}
      </div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Quantity</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody></table>
      ${q.notes ? `<p style="margin-top:12px;font-size:12px;color:#555">Notes: ${q.notes}</p>` : ''}
      <div class="grand">Grand Total: LKR ${parseFloat(q.total).toFixed(2)}</div>
      <div class="footer">Cafe 69 POS System · Inventory Department · Quotation Document</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📜 Quotations Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Quotation</button>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'All Quotations', count: quotations.length, color: 'var(--accent)', icon: '📜' },
          { label: 'Pending', count: quotations.filter(q => q.status === 'pending').length, color: '#f59e0b', icon: '⏳' },
          { label: 'Approved', count: quotations.filter(q => q.status === 'approved').length, color: '#22c55e', icon: '✅' },
          { label: 'Rejected', count: quotations.filter(q => q.status === 'rejected').length, color: '#ef4444', icon: '❌' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '.25rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '.75rem' }}>
        <select className="input" style={{ maxWidth: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table style={{ minWidth: '900px' }}>
          <thead><tr><th>Title</th><th>Total (LKR)</th><th>Status</th><th>Date</th><th>Approved By</th><th>Actions</th></tr></thead>
          <tbody>
            {quotations.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 500 }}>{q.title}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{parseFloat(q.total).toFixed(2)}</td>
                <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{q.created_at?.replace('T', ' ').slice(0, 19)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{q.approver_name || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDetail(q)}>View</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => printQuotation(q)}>🖨️</button>
                  </div>
                </td>
              </tr>
            ))}
            {!quotations.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No quotations yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700 }}>{detail.title}</h2>
              <span className={`badge badge-${detail.status}`}>{detail.status}</span>
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Date: {detail.created_at?.replace('T', ' ').slice(0, 19)}
              {detail.approver_name && <span> · Reviewed by: {detail.approver_name}</span>}
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

            {detail.approval_notes && (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                background: detail.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${detail.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                marginBottom: '1.25rem'
              }}>
                <div style={{ 
                  fontSize: '.7rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  color: detail.status === 'rejected' ? '#ef4444' : '#22c55e',
                  marginBottom: '.25rem'
                }}>
                  Finance Decision Feedback
                </div>
                <div style={{ fontSize: '.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                  "{detail.approval_notes}"
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => printQuotation(detail)}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {/* New Quotation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>New Quotation</h2>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <input className="input" placeholder="Quotation title" value={qTitle} onChange={e => setQTitle(e.target.value)} required />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.875rem' }}>
                <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '.5rem', fontWeight: 600 }}>Items</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 32px', gap: '.5rem', marginBottom: '.5rem' }}>
                    <input className="input" placeholder="Item name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} required />
                    <input className="input" type="number" min="0" step="0.5" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                    <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(i)} style={{ padding: '0 .5rem' }}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
                <div style={{ marginTop: '.75rem', fontWeight: 700, color: 'var(--accent)' }}>Total: LKR {total.toFixed(2)}</div>
              </div>
              <textarea className="input" placeholder="Notes (optional)" value={qNotes} onChange={e => setQNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Submitting…' : 'Submit to Finance'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
