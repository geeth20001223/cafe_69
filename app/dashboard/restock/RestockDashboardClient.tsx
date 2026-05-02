'use client';
import { useState, useEffect, useCallback } from 'react';

interface Alert {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  message: string;
  status: string;
  requested_qty: number | null;
  requested_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  is_read: number;
  created_at: string;
}

interface Me { role: string; name: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '⏳' },
  approved: { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: '✅' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '❌' },
};

export default function RestockDashboardClient() {
  const [me, setMe] = useState<Me | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [meRes, alertRes] = await Promise.all([
      fetch('/api/auth'),
      fetch('/api/alerts'), // Fetch ALL to get correct counts
    ]);
    if (meRes.ok) { const d = await meRes.json(); setMe(d); }
    if (alertRes.ok) { const d = await alertRes.json(); setAlerts(d.alerts || []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitRequest(alertId: number) {
    const qty = parseFloat(qtyInputs[alertId] || '0');
    if (!qty || qty <= 0) { showToast('error', 'Enter a valid quantity > 0'); return; }
    setActionId(alertId);
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', id: alertId, requested_qty: qty }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast('success', `📦 Restock request submitted for ${qty} units`);
      setQtyInputs(prev => { const n = { ...prev }; delete n[alertId]; return n; });
      load();
    } else {
      showToast('error', `❌ ${d.error}`);
    }
    setActionId(null);
  }

  async function doAction(alertId: number, action: 'approve' | 'reject') {
    setActionId(alertId);
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id: alertId }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast(
        action === 'approve' ? 'success' : 'error',
        action === 'approve' ? '✅ Restock approved — stock updated!' : '❌ Restock request rejected'
      );
      load();
    } else {
      showToast('error', `❌ ${d.error}`);
    }
    setActionId(null);
  }

  const isInventory = me?.role === 'inventory_manager' || me?.role === 'admin';
  const isFinance = me?.role === 'finance_manager' || me?.role === 'admin';

  // Calculate counts from the full alerts array
  const counts = {
    all: alerts.length,
    pending: alerts.filter(a => a.status === 'pending').length,
    approved: alerts.filter(a => a.status === 'approved').length,
    rejected: alerts.filter(a => a.status === 'rejected').length,
  };

  // Filter alerts for display
  const displayAlerts = filter === 'all' ? alerts : alerts.filter(a => a.status === filter);

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '14px 20px', borderRadius: '10px', maxWidth: '380px',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          backdropFilter: 'blur(12px)',
          color: toast.type === 'success' ? '#4ade80' : '#f87171',
          fontSize: '.875rem', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📦 Restock Dashboard</h1>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
            {isInventory && isFinance
              ? 'Admin view — request and approve restocking'
              : isInventory
                ? 'Submit restock requests for low-stock items'
                : 'Review and approve restock requests'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Refresh</button>
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { role: 'Inventory Manager', icon: '📦', desc: 'Enters restock quantity', active: isInventory },
          { role: 'Finance Manager',   icon: '💰', desc: 'Approves or rejects',     active: isFinance },
        ].map(r => (
          <div key={r.role} style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            padding: '.5rem 1rem', borderRadius: '8px',
            background: r.active ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
            border: `1px solid ${r.active ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
            fontSize: '.8rem',
          }}>
            <span>{r.icon}</span>
            <div>
              <div style={{ fontWeight: 600, color: r.active ? 'var(--accent)' : 'var(--text-secondary)' }}>{r.role}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{r.desc}</div>
            </div>
            {r.active && <span style={{ color: 'var(--success)', fontSize: '.8rem' }}>● You</span>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => {
          const cfg = f === 'all' ? { label: 'All', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '📋' } : STATUS_CONFIG[f];
          const isActive = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '.5rem 1.1rem', borderRadius: '8px', fontSize: '.85rem', fontWeight: 600,
                border: `1px solid ${isActive ? cfg.color : 'var(--border)'}`,
                background: isActive ? cfg.bg : 'var(--bg-secondary)',
                color: isActive ? cfg.color : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '.4rem',
              }}>
              {cfg.icon} {cfg.label}
              <span style={{
                background: isActive ? cfg.color : 'var(--border)',
                color: isActive ? '#000' : 'var(--text-muted)',
                borderRadius: '999px', padding: '0 .4rem', fontSize: '.7rem', fontWeight: 700,
              }}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alert cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</div>
      ) : displayAlerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div style={{ fontWeight: 600 }}>No alerts in this category</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
          {displayAlerts.map(alert => {
            const cfg = STATUS_CONFIG[alert.status] || STATUS_CONFIG.pending;
            const isPending = alert.status === 'pending';
            const isApproved = alert.status === 'approved';
            const hasRequest = !!alert.requested_qty;
            const busy = actionId === alert.id;

            return (
              <div key={alert.id} className="card" style={{
                borderLeft: `4px solid ${cfg.color}`,
                transition: 'all 0.2s',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.75rem' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {/* Product name + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{alert.product_name}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.3rem',
                        padding: '.2rem .65rem', borderRadius: '999px', fontSize: '.75rem', fontWeight: 700,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    {/* Stock info */}
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '.82rem', marginBottom: '.5rem' }}>
                      <span>
                        Current: <strong style={{ color: alert.quantity <= alert.low_stock_threshold ? 'var(--danger)' : 'var(--success)' }}>
                          {alert.quantity} {alert.unit}
                        </strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Threshold: {alert.low_stock_threshold} {alert.unit}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{alert.created_at?.slice(0, 16)}</span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', maxWidth: 260, marginBottom: '.6rem' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, transition: 'width 0.4s',
                        width: `${Math.min(100, (alert.quantity / alert.low_stock_threshold) * 100)}%`,
                        background: isApproved ? 'var(--success)' : alert.quantity === 0 ? 'var(--danger)' : 'var(--warning)',
                      }} />
                    </div>

                    {/* Restock info */}
                    {hasRequest && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                        background: isApproved ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${isApproved ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        borderRadius: '8px', padding: '.4rem .75rem', fontSize: '.8rem',
                      }}>
                        <span>📋</span>
                        <span>Restock request: <strong style={{ color: isApproved ? 'var(--success)' : 'var(--accent)' }}>
                          +{alert.requested_qty} {alert.unit}
                        </strong></span>
                        {alert.requested_by_name && (
                          <span style={{ color: 'var(--text-muted)' }}>by {alert.requested_by_name}</span>
                        )}
                      </div>
                    )}

                    {isApproved && alert.approved_by_name && (
                      <div style={{ marginTop: '.4rem', fontSize: '.78rem', color: 'var(--success)' }}>
                        ✅ Approved by <strong>{alert.approved_by_name}</strong> · {alert.approved_at?.slice(0, 16)}
                      </div>
                    )}

                    {alert.status === 'rejected' && alert.approved_by_name && (
                      <div style={{ marginTop: '.4rem', fontSize: '.78rem', color: 'var(--danger)' }}>
                        ❌ Rejected by <strong>{alert.approved_by_name}</strong> · {alert.approved_at?.slice(0, 16)}
                      </div>
                    )}
                  </div>

                  {/* Action panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', alignItems: 'flex-end', minWidth: 200 }}>

                    {/* INVENTORY: enter restock qty */}
                    {isInventory && isPending && (
                      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          placeholder={`Qty (${alert.unit})`}
                          value={qtyInputs[alert.id] || ''}
                          onChange={e => setQtyInputs(prev => ({ ...prev, [alert.id]: e.target.value }))}
                          className="input"
                          style={{ width: 110, padding: '.4rem .6rem', fontSize: '.82rem' }}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => submitRequest(alert.id)}
                          disabled={busy || !qtyInputs[alert.id]}
                        >
                          {busy ? '⏳' : '📤 Request'}
                        </button>
                      </div>
                    )}

                    {/* FINANCE: approve / reject */}
                    {isFinance && isPending && hasRequest && (
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => doAction(alert.id, 'approve')}
                          disabled={busy}
                        >
                          {busy ? '⏳' : '✅ Approve'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => doAction(alert.id, 'reject')}
                          disabled={busy}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}

                    {/* Waiting for finance approval */}
                    {isInventory && !isFinance && isPending && hasRequest && (
                      <div style={{ fontSize: '.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                        ⏳ Awaiting finance approval
                      </div>
                    )}

                    {/* Finance waiting for inventory request */}
                    {isFinance && !isInventory && isPending && !hasRequest && (
                      <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                        📦 Waiting for inventory request
                      </div>
                    )}

                    {/* Approved badge */}
                    {isApproved && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '.4rem',
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '8px', padding: '.4rem .8rem', fontSize: '.82rem',
                        color: 'var(--success)', fontWeight: 600,
                      }}>
                        ✅ Stock Restocked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
