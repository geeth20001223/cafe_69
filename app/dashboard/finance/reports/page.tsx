'use client';
import { useState, useEffect } from 'react';

export default function FinanceReportsPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [invReports, setInvReports] = useState<any[]>([]);
  const [sessionReports, setSessionReports] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [tab, setTab] = useState<'sales' | 'inventory' | 'sessions'>('sales');

  const loadSales = async () => {
    const res = await fetch(`/api/reports?type=sales_summary&from=${dateFrom}&to=${dateTo}`);
    if (res.ok) { const d = await res.json(); setSummary(d.summary || []); setTopProducts(d.topProducts || []); }
  };
  const loadInventory = async () => {
    const res = await fetch('/api/reports?type=inventory');
    if (res.ok) { const d = await res.json(); setInvReports(d.reports || []); }
  };
  const loadSessions = async () => {
    const res = await fetch('/api/reports/session');
    if (res.ok) { const d = await res.json(); setSessionReports(d.reports || []); }
  };

  useEffect(() => { if (tab === 'sales') loadSales(); }, [dateFrom, dateTo, tab]);
  useEffect(() => { if (tab === 'inventory') loadInventory(); }, [tab]);
  useEffect(() => { if (tab === 'sessions') loadSessions(); }, [tab]);

  const totalRevenue = summary.reduce((s, r) => s + r.total, 0);
  const totalTx = summary.reduce((s, r) => s + r.transactions, 0);

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>📊 Reports</h1>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem' }}>
        {(['sales', 'inventory', 'sessions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}>
            {t === 'sales' ? '💰 Sales' : t === 'inventory' ? '📦 Inventory' : '🕐 Sessions'}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <>
          <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input" type="date" style={{ flex: '0 0 150px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input className="input" type="date" style={{ flex: '0 0 150px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={loadSales}>🔍 Filter</button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.1rem' }}>LKR {totalRevenue.toFixed(2)}</div><div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Total Revenue</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, color: 'var(--info)', fontSize: '1.1rem' }}>{totalTx}</div><div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Transactions</div></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card table-wrap">
              <h3 style={{ fontWeight: 600, marginBottom: '.75rem', fontSize: '.9rem' }}>Daily Breakdown</h3>
              <table>
                <thead><tr><th>Date</th><th>Session</th><th>Txns</th><th>Cash</th><th>Card</th><th>Total</th></tr></thead>
                <tbody>
                  {summary.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '.8rem' }}>{r.date}</td>
                      <td><span className={`badge badge-${r.session_type}`}>{r.session_type}</span></td>
                      <td>{r.transactions}</td>
                      <td style={{ fontSize: '.8rem' }}>{r.cash_total?.toFixed(2)}</td>
                      <td style={{ fontSize: '.8rem' }}>{r.card_total?.toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                  {!summary.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No data</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card table-wrap">
              <h3 style={{ fontWeight: 600, marginBottom: '.75rem', fontSize: '.9rem' }}>Top Products</h3>
              <table>
                <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, fontSize: '.875rem' }}>{p.product_name}</td>
                      <td>{p.total_qty}</td>
                      <td style={{ color: 'var(--success)' }}>LKR {p.total_revenue?.toFixed(2)}</td>
                    </tr>
                  ))}
                  {!topProducts.length && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'inventory' && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Date</th><th>Manager</th><th>Action</th></tr></thead>
            <tbody>
              {invReports.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td>{r.report_date}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.manager_name}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => alert(JSON.stringify(JSON.parse(r.data_json).summary, null, 2))}>Summary</button></td>
                </tr>
              ))}
              {!invReports.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No inventory reports yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Session</th><th>Start</th><th>End</th><th>Transactions</th><th>Total (LKR)</th></tr></thead>
            <tbody>
              {sessionReports.map(r => (
                <tr key={r.id}>
                  <td><span className={`badge badge-${r.session_type}`}>{r.session_type}</span></td>
                  <td style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{r.start_time?.slice(0, 16)}</td>
                  <td style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{r.end_time?.slice(0, 16)}</td>
                  <td>{r.total_transactions}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total_sales?.toFixed(2)}</td>
                </tr>
              ))}
              {!sessionReports.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No session reports yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
