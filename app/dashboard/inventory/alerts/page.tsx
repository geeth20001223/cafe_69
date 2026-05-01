'use client';
import { useState, useEffect, useCallback } from 'react';

interface Alert {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  message: string;
  is_read: number;
  status: string;            // 'pending' | 'approved' | 'rejected'
  requested_qty: number | null;
  requested_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}

// Config for each restock status
const RESTOCK_STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  pending: {
    label: 'Pending', icon: '⏳', color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
    desc: 'Awaiting finance approval',
  },
  approved: {
    label: 'Approved', icon: '✅', color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)',
    desc: 'Finance approved — stock updated',
  },
  rejected: {
    label: 'Rejected', icon: '❌', color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)',
    desc: 'Finance rejected the request',
  },
};

export default function AlertsPage() {
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [showAll, setShowAll]     = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [toast, setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    const res = await fetch(showAll ? '/api/alerts' : '/api/alerts?unread=true');
    if (res.ok) { const d = await res.json(); setAlerts(d.alerts || []); }
  }, [showAll]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: number) {
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markRead: true, id }),
    });
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
      res.ok
        ? showToast('success', '📧 Email alert sent to finance manager!')
        : showToast('error', `❌ Failed: ${data.error || 'Unknown error'}`);
    } catch {
      showToast('error', '❌ Network error. Could not send email.');
    } finally {
      setSendingId(null);
    }
  }

  async function submitRestockRequest(alertId: number) {
    const qty = parseFloat(qtyInputs[alertId] || '0');
    if (!qty || qty <= 0) { showToast('error', 'Enter a valid quantity greater than 0'); return; }
    setSubmitting(alertId);
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', id: alertId, requested_qty: qty }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast('success', `📦 Restock request sent to finance manager (+${qty} units)`);
      setQtyInputs(prev => { const n = { ...prev }; delete n[alertId]; return n; });
      load();
    } else {
      showToast('error', `❌ ${d.error}`);
    }
    setSubmitting(null);
  }

  // Determine left-border color per alert
  function getBorderColor(a: Alert) {
    if (a.status === 'approved') return '#22c55e';
    if (a.status === 'rejected') return '#ef4444';
    if (a.requested_qty)         return '#f59e0b';
    return 'var(--danger)';
  }

  return (
    <div className="fade-in">

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '14px 20px', borderRadius: '10px', maxWidth: '400px',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          backdropFilter: 'blur(12px)',
          color: toast.type === 'success' ? '#4ade80' : '#f87171',
          fontSize: '.875rem', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔔 Stock Alerts</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Refresh</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Show all (including read)
          </label>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {Object.entries(RESTOCK_STATUS).map(([key, cfg]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '.4rem',
            padding: '.3rem .8rem', borderRadius: '999px', fontSize: '.75rem',
            background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 600,
          }}>
            {cfg.icon} {cfg.label} — {cfg.desc}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {alerts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div style={{ fontWeight: 600 }}>No active stock alerts</div>
          <div style={{ fontSize: '.875rem', marginTop: '.5rem' }}>All inventory levels are within threshold</div>
        </div>
      )}

      {/* Alert cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
        {alerts.map(a => {
          const restockCfg = RESTOCK_STATUS[a.status] || RESTOCK_STATUS.pending;
          const isApproved = a.status === 'approved';
          const isRejected = a.status === 'rejected';
          const hasRequest = !!a.requested_qty;

          return (
            <div key={a.id} className="card" style={{
              borderLeft: `4px solid ${getBorderColor(a)}`,
              opacity: isApproved ? 1 : a.is_read && !hasRequest ? 0.65 : 1,
              transition: 'all 0.2s',
            }}>
              {/* ── Top row: product info + restock status badge ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>

                  {/* Product name + LOW STOCK tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.product_name}</span>
                    <span className="badge badge-inactive" style={{ fontSize: '.7rem' }}>LOW STOCK</span>
                  </div>

                  {/* Message */}
                  <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: '.35rem' }}>{a.message}</div>

                  {/* Current / Threshold / Date */}
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                    Current: <strong style={{ color: 'var(--danger)' }}>{a.quantity} {a.unit}</strong>
                    &nbsp;· Threshold: {a.low_stock_threshold} {a.unit}
                    &nbsp;· {a.created_at?.slice(0, 16)}
                  </div>

                  {/* ── RESTOCK STATUS BLOCK ── */}
                  <div style={{
                    background: restockCfg.bg,
                    border: `1px solid ${restockCfg.border}`,
                    borderRadius: '10px', padding: '.75rem 1rem',
                    display: 'flex', flexDirection: 'column', gap: '.4rem',
                  }}>
                    {/* Status header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <span style={{
                        fontWeight: 700, fontSize: '.8rem', color: restockCfg.color,
                        display: 'flex', alignItems: 'center', gap: '.3rem',
                      }}>
                        {restockCfg.icon} Restock Status: {restockCfg.label.toUpperCase()}
                      </span>
                    </div>

                    {/* Requested qty */}
                    {hasRequest && (
                      <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                        📦 Requested: <strong style={{ color: restockCfg.color }}>+{a.requested_qty} {a.unit}</strong>
                        {a.requested_by_name && <span style={{ color: 'var(--text-muted)' }}> by {a.requested_by_name}</span>}
                      </div>
                    )}

                    {/* Finance decision */}
                    {isApproved && (
                      <div style={{ fontSize: '.8rem', color: '#4ade80', fontWeight: 600 }}>
                        ✅ Approved by <strong>{a.approved_by_name}</strong> on {a.approved_at?.slice(0, 16)}
                        <span style={{ marginLeft: '.5rem', color: 'var(--text-muted)', fontWeight: 400 }}>— stock has been updated</span>
                      </div>
                    )}
                    {isRejected && (
                      <div style={{ fontSize: '.8rem', color: '#f87171', fontWeight: 600 }}>
                        ❌ Rejected by <strong>{a.approved_by_name}</strong> on {a.approved_at?.slice(0, 16)}
                        <span style={{ marginLeft: '.5rem', color: 'var(--text-muted)', fontWeight: 400 }}>— submit a new request if needed</span>
                      </div>
                    )}
                    {!hasRequest && !isApproved && !isRejected && (
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Enter a restock quantity below and submit to finance manager
                      </div>
                    )}
                    {hasRequest && !isApproved && !isRejected && (
                      <div style={{ fontSize: '.78rem', color: '#f59e0b' }}>
                        ⏳ Waiting for finance manager to approve or reject
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Right panel: actions ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', alignItems: 'flex-end', minWidth: 200 }}>

                  {/* Submit restock request — only when pending & no request yet OR rejected */}
                  {(!hasRequest || isRejected) && (
                    <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        placeholder={`Qty (${a.unit})`}
                        value={qtyInputs[a.id] || ''}
                        onChange={e => setQtyInputs(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="input"
                        style={{ width: 110, padding: '.4rem .6rem', fontSize: '.82rem' }}
                        title="Enter quantity to restock"
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => submitRestockRequest(a.id)}
                        disabled={submitting === a.id || !qtyInputs[a.id]}
                        title="Send restock request to finance"
                      >
                        {submitting === a.id ? '⏳' : '📤 Request'}
                      </button>
                    </div>
                  )}

                  {/* Email manager button — always available */}
                  <button
                    id={`send-email-${a.id}`}
                    className="btn btn-sm"
                    onClick={() => sendEmailAlert(a.id)}
                    disabled={sendingId === a.id}
                    style={{
                      background: sendingId === a.id
                        ? 'rgba(234,179,8,0.2)'
                        : 'linear-gradient(135deg,rgba(234,179,8,0.15),rgba(239,68,68,0.15))',
                      border: '1px solid rgba(234,179,8,0.4)', color: '#fbbf24',
                      fontWeight: 600, padding: '6px 14px', borderRadius: '8px',
                      fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                    title="Send Gmail alert to finance manager"
                  >
                    {sendingId === a.id ? <>⏳ Sending…</> : <>📧 Email Manager</>}
                  </button>

                  {/* Mark read */}
                  {!a.is_read && !isApproved && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => markRead(a.id)}
                    >
                      ✓ Mark Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
