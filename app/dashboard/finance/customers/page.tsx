'use client';
import { useState, useEffect, useCallback } from 'react';
import { parseDBTime } from '@/app/lib/session';

export default function CustomerContactsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/customers');
    if (res.ok) {
      const d = await res.json();
      setCustomers(d.customers || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter(c => 
    (c.customer_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (c.customer_phone || '').includes(search)
  );

  function printList() {
    const now = new Date().toLocaleString('en-LK');
    const rows = filtered.map(c => 
      `<tr>
        <td>${c.customer_name || '—'}</td>
        <td>${c.customer_phone}</td>
        <td>${c.total_bills}</td>
        <td style="text-align:right">LKR ${Number(c.total_spent).toFixed(2)}</td>
        <td>${c.last_visit?.slice(0, 10)}</td>
      </tr>`
    ).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Customer Contact List — Cafe 69</title>
      <style>
        body{font-family:Arial,sans-serif;margin:2cm;color:#000}
        h1{font-size:20px;margin-bottom:4px} p{font-size:12px;color:#555;margin:2px 0 20px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#f5f5f5;padding:10px;text-align:left;border:1px solid #ddd;font-weight:600}
        td{padding:10px;border:1px solid #ddd}
        @media print{@page{margin:1.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69 — Customer Contact List</h1>
      <p>Generated: ${now} · ${filtered.length} customers found</p>
      <table><thead><tr><th>Customer Name</th><th>Mobile Number</th><th>Bills</th><th>Total Spent</th><th>Last Visit</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📱 Customer Contacts</h1>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>List of mobile numbers collected during billing</p>
        </div>
        <button className="btn btn-secondary" onClick={printList} disabled={!filtered.length}>🖨️ Print List</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <input 
          className="input" 
          placeholder="🔍 Search by name or mobile number…" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
            <div>{search ? 'No matches found' : 'No customer contacts found in sales records'}</div>
          </div>
        ) : (
          <table style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Total Bills</th>
                <th style={{ textAlign: 'right' }}>Total Spent</th>
                <th>Last Visit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.customer_name || '—'}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem' }}>{c.customer_phone}</td>
                  <td>{c.total_bills}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>LKR {Number(c.total_spent).toFixed(2)}</td>
                  <td style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                    {parseDBTime(c.last_visit).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                  </td>
                  <td>
                    <a href={`tel:${c.customer_phone}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>📞 Call</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
