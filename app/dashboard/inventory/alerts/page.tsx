'use client';
import { useState, useEffect } from 'react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/alerts${showAll ? '' : '?unread=true'}`);
    if (res.ok) { const d = await res.json(); setAlerts(d.alerts); }
  };
  useEffect(() => { load(); }, [showAll]);

  async function markRead(id: number) {
    await fetch('/api/alerts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔔 Stock Alerts</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Show all (including read)
          </label>
        </div>
      </div>

      {alerts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div style={{ fontWeight: 600 }}>No active stock alerts</div>
          <div style={{ fontSize: '.875rem', marginTop: '.5rem' }}>All inventory levels are within threshold</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {alerts.map(a => (
          <div key={a.id} className="card" style={{ borderLeft: `4px solid ${a.is_read ? 'var(--border)' : 'var(--danger)'}`, opacity: a.is_read ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <span style={{ fontWeight: 600, color: a.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{a.product_name}</span>
                  {!a.is_read && <span className="badge badge-inactive" style={{ fontSize: '.7rem' }}>LOW STOCK</span>}
                </div>
                <div style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: '.3rem' }}>{a.message}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                  Current: <strong style={{ color: 'var(--danger)' }}>{a.quantity} {a.unit}</strong>
                  &nbsp;· Threshold: {a.low_stock_threshold} · {a.created_at?.slice(0, 16)}
                </div>
              </div>
              {!a.is_read && (
                <button className="btn btn-secondary btn-sm" onClick={() => markRead(a.id)} style={{ flexShrink: 0 }}>✓ Mark Read</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
