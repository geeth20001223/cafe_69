'use client';
import { useState, useEffect, useCallback } from 'react';

interface Alert {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  status: string;
  requested_qty: number | null;
  requested_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}

function roundFloat(n: number): number {
  return parseFloat(n.toFixed(2));
}

function QtyStepper({
  alertId, unit, value, onChange,
}: {
  alertId: number; unit: string; value: string; onChange: (id: number, v: string) => void;
}) {
  const num  = parseFloat(value) || 0;
  const STEP = 0.25;
  const MIN  = 0.25;
  const dec  = () => onChange(alertId, String(roundFloat(Math.max(MIN, num - STEP))));
  const inc  = () => onChange(alertId, String(roundFloat(num + STEP)));

  const handleBlur = () => {
    const clamped = roundFloat(Math.max(MIN, num));
    onChange(alertId, String(clamped));
  };

  const btnStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    width: 32, height: 36, border: '1px solid var(--border)',
    borderRight: side === 'left' ? 'none' : '1px solid var(--border)',
    borderLeft: side === 'right' ? 'none' : '1px solid var(--border)',
    borderRadius: side === 'left' ? '8px 0 0 8px' : '0 8px 8px 0',
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s', flexShrink: 0,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button style={btnStyle('left')} onClick={dec} title="Decrease">−</button>
      <input
        type="number"
        min={0.25}
        step={0.25}
        value={value}
        onChange={e => onChange(alertId, e.target.value)}
        onBlur={handleBlur}
        style={{
          width: 72, height: 36, textAlign: 'center',
          border: '1px solid var(--border)', background: 'var(--bg-secondary)',
          color: 'var(--text-primary)', fontSize: '.85rem', fontWeight: 700,
          outline: 'none',
        }}
        placeholder="0"
      />
      <button style={btnStyle('right')} onClick={inc} title="Increase">+</button>
      {unit && <span style={{ marginLeft: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>{unit}</span>}
    </div>
  );
}

export default function FinanceRestockPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertTab, setAlertTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [alertLoading, setAlertLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleQtyChange = (id: number, v: string) =>
    setQtyMap(prev => ({ ...prev, [id]: v }));

  const loadAlerts = useCallback(async () => {
    setAlertLoading(true);
    const res = await fetch(`/api/alerts?status=${alertTab}`);
    if (res.ok) {
      const d = await res.json();
      const list: Alert[] = d.alerts || [];
      setAlerts(list);
      const initial: Record<number, string> = {};
      for (const a of list) {
        if (a.requested_qty) initial[a.id] = String(a.requested_qty);
      }
      setQtyMap(prev => ({ ...initial, ...prev }));
    }
    setAlertLoading(false);
  }, [alertTab]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  async function approve(alertId: number) {
    const qty = parseFloat(qtyMap[alertId] || '0');
    if (!qty || qty <= 0) { showToast('error', '❌ Enter a valid quantity first'); return; }
    setActionId(alertId);
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_with_qty', id: alertId, qty }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast('success', `✅ Approved! Inventory notified to refill stock.`);
      loadAlerts();
    } else {
      showToast('error', `❌ ${d.error}`);
    }
    setActionId(null);
  }

  async function reject(alertId: number) {
    setActionId(alertId);
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id: alertId }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast('error', '❌ Restock request rejected');
      loadAlerts();
    } else {
      showToast('error', `❌ ${d.error}`);
    }
    setActionId(null);
  }

  const pendingCount = alerts.filter(a => a.status === 'pending').length;

  return (
    <div className="fade-in">
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '14px 20px', borderRadius: '10px', maxWidth: '400px',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          backdropFilter: 'blur(12px)', color: toast.type === 'success' ? '#4ade80' : '#f87171',
          fontSize: '.875rem', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>{toast.msg}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔁 Restock Management</h1>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>Review and approve inventory restock requests from the stock manager</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAlerts}>🔄 Refresh Alerts</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {([
            { key: 'pending',  label: 'Pending',  icon: '⏳', color: '#f59e0b' },
            { key: 'approved', label: 'Approved', icon: '✅', color: '#22c55e' },
            { key: 'rejected', label: 'Rejected', icon: '❌', color: '#ef4444' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setAlertTab(tab.key)} style={{
              padding: '.6rem .9rem', borderRadius: '8px', fontSize: '.82rem', fontWeight: 600,
              border: `1px solid ${alertTab === tab.key ? tab.color : 'var(--border)'}`,
              background: alertTab === tab.key ? `${tab.color}18` : 'var(--bg-secondary)',
              color: alertTab === tab.key ? tab.color : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {tab.icon} {tab.label} {tab.key === 'pending' && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>

        {alertLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{alertTab === 'pending' ? '📭' : '✨'}</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>No {alertTab} alerts found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.map(alert => {
              const busy = actionId === alert.id;
              const currentQty = parseFloat(qtyMap[alert.id] || '0');
              const statusColor = alert.status === 'approved' ? '#22c55e' : alert.status === 'rejected' ? '#ef4444' : '#f59e0b';

              return (
                <div key={alert.id} className="fade-in" style={{
                  background: 'var(--bg-secondary)', borderRadius: '12px',
                  padding: '1.25rem', borderLeft: `5px solid ${statusColor}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{alert.product_name}</span>
                        <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '.2rem .6rem', borderRadius: '999px', background: `${statusColor}20`, color: statusColor, textTransform: 'uppercase' }}>
                          {alert.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                        Current Stock: <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{alert.quantity} {alert.unit}</span> · 
                        Threshold: {alert.low_stock_threshold} {alert.unit}
                      </div>
                    </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Created: {new Date(alert.created_at).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                  </div>

                  {alert.status === 'pending' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '.5rem', textTransform: 'uppercase' }}>Approving Quantity</div>
                        <QtyStepper alertId={alert.id} unit={alert.unit} value={qtyMap[alert.id] || ''} onChange={handleQtyChange} />
                      </div>
                      <div style={{ display: 'flex', gap: '.75rem' }}>
                        <button className="btn btn-danger" onClick={() => reject(alert.id)} disabled={busy}>Reject</button>
                        <button className="btn btn-success" style={{ minWidth: '120px' }} onClick={() => approve(alert.id)} disabled={busy || currentQty <= 0}>
                          {busy ? 'Processing…' : '✅ Approve'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '2rem', padding: '.75rem 1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', fontSize: '.9rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Quantity:</span> <strong>{alert.requested_qty} {alert.unit}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Reviewer:</span> <strong>{alert.approved_by_name}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{new Date(alert.approved_at || '').toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
