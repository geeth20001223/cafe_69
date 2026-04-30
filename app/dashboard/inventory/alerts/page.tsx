'use client';
import { useState, useEffect } from 'react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const load = async () => {
    const res = await fetch(`/api/alerts${showAll ? '' : '?unread=true'}`);
    if (res.ok) { const d = await res.json(); setAlerts(d.alerts); }
  };
  useEffect(() => { load(); }, [showAll]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  async function markRead(id: number) {
    await fetch('/api/alerts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  async function sendEmailAlert(alertId: number) {
    setSendingId(alertId);
    try {
      const res = await fetch('/api/alerts/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', '📧 Email alert sent to stock manager!');
      } else {
        showToast('error', `❌ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      showToast('error', '❌ Network error. Could not send email.');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="fade-in">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '14px 20px', borderRadius: '10px', maxWidth: '360px',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          backdropFilter: 'blur(12px)', color: toast.type === 'success' ? '#4ade80' : '#f87171',
          fontSize: '.875rem', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
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

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
                {/* Gmail Alert Button */}
                <button
                  id={`send-email-${a.id}`}
                  className="btn btn-sm"
                  onClick={() => sendEmailAlert(a.id)}
                  disabled={sendingId === a.id}
                  style={{
                    background: sendingId === a.id
                      ? 'rgba(234,179,8,0.2)'
                      : 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(239,68,68,0.15))',
                    border: '1px solid rgba(234,179,8,0.4)',
                    color: '#fbbf24',
                    fontWeight: 600,
                    cursor: sendingId === a.id ? 'not-allowed' : 'pointer',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '.8rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Send Gmail alert to stock manager"
                >
                  {sendingId === a.id ? (
                    <>⏳ Sending…</>
                  ) : (
                    <>📧 Email Manager</>
                  )}
                </button>

                {/* Mark Read Button */}
                {!a.is_read && (
                  <button className="btn btn-secondary btn-sm" onClick={() => markRead(a.id)} style={{ flexShrink: 0 }}>✓ Mark Read</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
