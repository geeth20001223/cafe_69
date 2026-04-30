'use client';
import { useState, useEffect } from 'react';

export default function SessionReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    fetch('/api/reports/session').then(r => r.json()).then(d => setReports(d.reports || []));
  }, []);

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>🕐 Session Reports</h1>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Session</th><th>Date</th><th>Start</th><th>End</th><th>Transactions</th><th>Total (LKR)</th><th>Action</th></tr></thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td><span className={`badge badge-${r.session_type}`}>{r.session_type}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '.875rem' }}>{r.start_time?.slice(0, 10)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{r.start_time?.slice(11, 16)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{r.end_time?.slice(11, 16)}</td>
                <td>{r.total_transactions}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total_sales?.toFixed(2)}</td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => setDetail(r)}>Details</button></td>
              </tr>
            ))}
            {!reports.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No session reports yet</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>
              <span className={`badge badge-${detail.session_type}`}>{detail.session_type}</span> Session Report
            </h2>
            <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {detail.start_time?.slice(0, 16)} → {detail.end_time?.slice(11, 16)}
            </div>
            {(() => {
              const data = JSON.parse(detail.data_json || '{}');
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>LKR {detail.total_sales?.toFixed(2)}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>LKR {data.by_payment?.cash?.toFixed(2) || '0.00'}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Cash</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--info)' }}>LKR {data.by_payment?.card?.toFixed(2) || '0.00'}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Card</div>
                    </div>
                  </div>
                  {data.items_summary?.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.5rem' }}>Top Items</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                        <thead><tr><th style={{ textAlign: 'left', padding: '.4rem .5rem', color: 'var(--text-secondary)' }}>Product</th><th style={{ textAlign: 'right', padding: '.4rem .5rem', color: 'var(--text-secondary)' }}>Qty</th><th style={{ textAlign: 'right', padding: '.4rem .5rem', color: 'var(--text-secondary)' }}>Revenue</th></tr></thead>
                        <tbody>
                          {data.items_summary.slice(0, 10).map((item: any, i: number) => (
                            <tr key={i}>
                              <td style={{ padding: '.3rem .5rem' }}>{item.product_name}</td>
                              <td style={{ textAlign: 'right', padding: '.3rem .5rem' }}>{item.qty}</td>
                              <td style={{ textAlign: 'right', padding: '.3rem .5rem', color: 'var(--success)' }}>LKR {item.total?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={() => setDetail(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
