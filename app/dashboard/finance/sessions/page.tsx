'use client';
import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function SessionReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    fetch('/api/reports/session').then(r => r.json()).then(d => setReports(d.reports || []));
  }, []);

  const chartData = useMemo(() => {
    return [...reports].reverse().slice(-7).map(r => ({
      name: `${r.session_type === 'lunch' ? '☀️' : '🌙'} ${r.start_time?.slice(5, 10)}`,
      total: r.total_sales,
      transactions: r.total_transactions
    }));
  }, [reports]);

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>🕐 Session Reports</h1>

      {reports.length > 0 && (
        <div className="card fade-in stagger-1" style={{ marginBottom: '1.5rem', height: 300, padding: '1.5rem .5rem .5rem' }}>
          <h2 style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginLeft: '1rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Last 7 Sessions Sales Trend (LKR)
          </h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `LKR ${v/1000}k`} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--accent)', fontWeight: 700 }}
              />
              <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card table-wrap fade-in stagger-2">
        <table style={{ borderCollapse: 'separate', borderSpacing: '0 .25rem' }}>
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Session</th>
              <th style={{ width: '15%' }}>Date</th>
              <th style={{ width: '12%' }}>Start</th>
              <th style={{ width: '12%' }}>End</th>
              <th style={{ width: '12%' }}>Transactions</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Total (LKR)</th>
              <th style={{ width: '14%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody style={{ verticalAlign: 'middle' }}>
            {reports.map(r => (
              <tr key={r.id}>
                <td><span className={`badge badge-${r.session_type}`}>{r.session_type}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '.875rem' }}>{r.start_time?.slice(0, 10)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{r.start_time?.slice(11, 16)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{r.end_time?.slice(11, 16)}</td>
                <td style={{ fontWeight: 600 }}>{r.total_transactions}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>{r.total_sales?.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-secondary btn-sm" onClick={() => setDetail(r)}>Details</button></td>
              </tr>
            ))}
            {!reports.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No session reports yet</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <span className={`badge badge-${detail.session_type}`}>{detail.session_type}</span> Session Detail
            </h2>
            <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              🗓️ {detail.start_time?.slice(0, 10)} &nbsp; | &nbsp; 🕒 {detail.start_time?.slice(11, 16)} → {detail.end_time?.slice(11, 16)}
            </div>
            
            {(() => {
              const data = JSON.parse(detail.data_json || '{}');
              const paymentData = [
                { name: 'Cash', value: data.by_payment?.cash || 0, color: 'var(--success)' },
                { name: 'Card', value: data.by_payment?.card || 0, color: 'var(--info)' }
              ];
              const itemsData = (data.items_summary || [])
                .slice(0, 5)
                .map((it: any) => ({ name: it.product_name, revenue: it.total }));

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)' }}>LKR {detail.total_sales?.toLocaleString()}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '.25rem' }}>Total Sales</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>LKR {data.by_payment?.cash?.toLocaleString() || '0'}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '.25rem' }}>Cash</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--info)' }}>LKR {data.by_payment?.card?.toLocaleString() || '0'}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '.25rem' }}>Card</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="card" style={{ padding: '1rem', height: 250, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Payment Breakdown</h3>
                      {paymentData.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={paymentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {paymentData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '.8rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>No payment data available</div>
                      )}
                    </div>

                    <div className="card" style={{ padding: '1rem', height: 250, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Product Revenue</h3>
                      {itemsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={itemsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            <Bar dataKey="revenue" fill="var(--success)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '.8rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>No items data available</div>
                      )}
                    </div>
                  </div>

                  {data.items_summary?.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.75rem', color: 'var(--text-primary)' }}>Detailed Breakdown</h3>
                      <div className="table-wrap" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '.5rem', fontSize: '.75rem' }}>Product</th>
                              <th style={{ textAlign: 'right', padding: '.5rem', fontSize: '.75rem' }}>Qty</th>
                              <th style={{ textAlign: 'right', padding: '.5rem', fontSize: '.75rem' }}>Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.items_summary.map((item: any, i: number) => (
                              <tr key={i}>
                                <td style={{ padding: '.4rem .5rem', fontSize: '.8rem' }}>{item.product_name}</td>
                                <td style={{ textAlign: 'right', padding: '.4rem .5rem', fontSize: '.8rem', fontWeight: 600 }}>{item.qty}</td>
                                <td style={{ textAlign: 'right', padding: '.4rem .5rem', fontSize: '.8rem', fontWeight: 700, color: 'var(--success)' }}>LKR {item.total?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }} onClick={() => setDetail(null)}>Close Report</button>
          </div>
        </div>
      )}
    </div>
  );
}
