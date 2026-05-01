'use client';
import { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function FinanceReportsPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [invReports, setInvReports] = useState<any[]>([]);
  const [sessionReports, setSessionReports] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [tab, setTab] = useState<'sales' | 'inventory' | 'sessions'>('sales');
  const [selectedReport, setSelectedReport] = useState<any>(null);

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
  const totalCash = summary.reduce((s, r) => s + (r.cash_total || 0), 0);
  const totalCard = summary.reduce((s, r) => s + (r.card_total || 0), 0);

  // Group summary by date for trend chart
  const trendDataMap = new Map<string, number>();
  summary.forEach(r => {
    trendDataMap.set(r.date, (trendDataMap.get(r.date) || 0) + r.total);
  });
  const trendData = Array.from(trendDataMap.entries()).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));

  const pieData = [
    { name: 'Cash', value: totalCash, color: '#10b981' },
    { name: 'Card', value: totalCard, color: '#3b82f6' },
  ];

  const barData = topProducts.map(p => ({
    name: p.product_name,
    revenue: p.total_revenue,
    qty: p.total_qty
  }));

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

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Revenue Trend Chart */}
            <div className="card" style={{ height: '300px' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.9rem' }}>Revenue Trend</h3>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Method Pie Chart */}
            <div className="card" style={{ height: '300px' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.9rem' }}>Payment Distribution</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Top Products Bar Chart */}
            <div className="card" style={{ height: '350px' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.9rem' }}>Top Products by Revenue</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={barData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} width={80} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="var(--success)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card table-wrap" style={{ height: '350px', overflowY: 'auto' }}>
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
          </div>

          <div className="card table-wrap">
            <h3 style={{ fontWeight: 600, marginBottom: '.75rem', fontSize: '.9rem' }}>Top Products List</h3>
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
        </>
      )}

      {tab === 'inventory' && (() => {
        const latest = invReports[0] ? JSON.parse(invReports[0].data_json) : null;
        if (!latest) return (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No inventory reports found. Create one from the Inventory Dashboard first.
          </div>
        );

        // Process data for charts
        const catValueMap = new Map<string, number>();
        latest.products.forEach((p: any) => {
          const cat = p.category_name || 'Uncategorized';
          catValueMap.set(cat, (catValueMap.get(cat) || 0) + (p.cost_price * p.quantity));
        });
        const catValueData = Array.from(catValueMap.entries()).map(([name, value]) => ({ name, value }));

        const stockStatusData = [
          { name: 'Low Stock', value: latest.summary.low_stock_count, color: '#ef4444' },
          { name: 'Normal', value: latest.summary.total_products - latest.summary.low_stock_count, color: '#10b981' },
        ];

        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>LKR {latest.summary.total_value.toLocaleString()}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Total Inventory Value</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{latest.summary.low_stock_count}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Low Stock Products</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>{latest.summary.total_products}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Total Active Products</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ height: '300px' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.9rem' }}>Value by Category (LKR)</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={catValueData} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8" label>
                      {catValueData.map((_, i) => <Cell key={i} fill={`hsl(${i * 45}, 70%, 50%)`} />)}
                    </Pie>
                    <Tooltip formatter={(val: any) => `LKR ${Number(val).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card" style={{ height: '300px' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.9rem' }}>Stock Health</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={stockStatusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {stockStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card table-wrap">
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>📜 Report History</h2>
              </div>
              <table>
                <thead><tr><th>Title</th><th>Date</th><th>Manager</th><th>Action</th></tr></thead>
                <tbody>
                  {invReports.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.title}</td>
                      <td>{r.report_date}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.manager_name}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          const d = JSON.parse(r.data_json);
                          setSelectedReport({ ...r, data: d });
                        }}>Quick Summary</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

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

      {/* Quick Summary Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>📊 Report Summary</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport(null)}>✕</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '.25rem' }}>Title</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedReport.title}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Total Value</div>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>LKR {selectedReport.data.summary.total_value.toLocaleString()}</div>
              </div>
              <div className="stat-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Total Products</div>
                <div style={{ fontWeight: 800, color: 'var(--info)', fontSize: '1.1rem' }}>{selectedReport.data.summary.total_products}</div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.875rem', fontWeight: 600, color: '#ef4444' }}>⚠️ Low Stock Items</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ef4444' }}>{selectedReport.data.summary.low_stock_count}</span>
              </div>
            </div>

            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Generated on: {selectedReport.report_date}</span>
              <span>By: {selectedReport.manager_name}</span>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setSelectedReport(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
