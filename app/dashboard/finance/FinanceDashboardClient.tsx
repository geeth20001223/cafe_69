'use client';
import { useState, useEffect, useCallback } from 'react';
import { getSLTime, getSLDateString } from '@/app/lib/session';
import PriceManagementPage from './prices/page';

// ── Bill Modal ────────────────────────────────────────────────────────────────
function BillModal({ bill, onClose }: { bill: any; onClose: () => void }) {
  function printBill() {
    const now = new Date(bill.created_at || Date.now()).toLocaleString('en-LK');
    const rows = (bill.items || []).map((item: any) =>
      `<tr><td>${item.product_name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">LKR ${Number(item.unit_price).toFixed(2)}</td><td style="text-align:right">LKR ${Number(item.subtotal).toFixed(2)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${bill.id}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:1cm;max-width:80mm}
        h1{font-size:16px;text-align:center;margin-bottom:2px} p{text-align:center;font-size:11px;color:#555;margin:2px 0}
        hr{border:none;border-top:1px dashed #999;margin:8px 0}
        table{width:100%;font-size:11px;border-collapse:collapse}
        th{font-size:10px;text-align:left;border-bottom:1px solid #ccc;padding:3px 2px}
        td{padding:3px 2px;vertical-align:top}
        .total{font-size:14px;font-weight:bold;text-align:right;margin-top:6px}
        .footer{text-align:center;font-size:10px;color:#888;margin-top:10px}
        @media print{@page{margin:0.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69</h1>
      <p>Receipt #${bill.id} · ${bill.session_type} session</p>
      <p>${now}</p>
      <p>Cashier: ${bill.cashier_name || '—'}</p>
      ${bill.customer_name ? `<p>Customer: ${bill.customer_name}</p>` : ''}
      <hr>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <hr>
      ${bill.discount_amount > 0 ? `<div style="text-align:right;font-size:12px">Discount: − LKR ${Number(bill.discount_amount).toFixed(2)}</div>` : ''}
      <div class="total">TOTAL: LKR ${Number(bill.total_amount).toFixed(2)}</div>
      <div style="text-align:right;font-size:11px">Payment: ${bill.payment_method}</div>
      <div class="footer">Thank you! Visit again ☕</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>🧾 Bill #{bill.id}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
          >×</button>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '.8rem', color: 'var(--text-secondary)' }}>
          <span className={`badge badge-${bill.session_type}`}>{bill.session_type === 'lunch' ? '🌅 Lunch' : '🌙 Night'}</span>
          <span className="badge badge-pending">{bill.payment_method}</span>
          <span style={{ color: 'var(--text-muted)' }}>{bill.created_at?.slice(0, 16)}</span>
          {bill.cashier_name && <span>Cashier: <strong>{bill.cashier_name}</strong></span>}
          {bill.customer_name && <span>Customer: <strong>{bill.customer_name}</strong></span>}
        </div>

        {/* Items */}
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '.5rem 0', marginBottom: '.75rem' }}>
          {(bill.items || []).map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', padding: '.35rem 0', gap: '1rem' }}>
              <span style={{ color: 'var(--text-primary)' }}>
                {item.product_name} <span style={{ color: 'var(--text-muted)' }}>× {item.quantity}</span>
              </span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>LKR {Number(item.subtotal).toFixed(2)}</span>
            </div>
          ))}
          {(!bill.items || bill.items.length === 0) && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No items found</div>
          )}
        </div>

        {/* Totals */}
        {bill.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: 'var(--danger)', marginBottom: '.35rem' }}>
            <span>Discount</span><span>− LKR {Number(bill.discount_amount).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent)', marginBottom: '1rem' }}>
          <span>Total</span><span>LKR {Number(bill.total_amount).toFixed(2)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={printBill}>🖨️ Print Bill</button>
        </div>
      </div>
    </div>
  );
}

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

// Round to avoid floating point artifacts (e.g. 0.1+0.2 = 0.30000000004)
function roundFloat(n: number): number {
  return parseFloat(n.toFixed(2));
}

// Quantity stepper — step 0.5 allows 0.5 / 1.0 / 1.5 / 1.25 etc.
function QtyStepper({
  alertId, unit, value, onChange,
}: {
  alertId: number; unit: string; value: string; onChange: (id: number, v: string) => void;
}) {
  const num  = parseFloat(value) || 0;
  const STEP = 0.25;   // quarter steps: 0.25 / 0.5 / 0.75 / 1.0 / 1.25 / 1.5…
  const MIN  = 0.25;   // minimum restock qty
  const dec  = () => onChange(alertId, String(roundFloat(Math.max(MIN, num - STEP))));
  const inc  = () => onChange(alertId, String(roundFloat(num + STEP)));

  // When user types manually — clamp and round on blur
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

export default function FinanceDashboardClient() {
  const [todayRevenue, setTodayRevenue]   = useState(0);
  const [todayCount, setTodayCount]       = useState(0);
  const [monthRevenue, setMonthRevenue]   = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [bySess, setBySess]               = useState<{ session_type: string; t: number; c: number }[]>([]);
  const [statsLoading, setStatsLoading]   = useState(true);

  // Today's transactions list
  const [todaySales, setTodaySales]       = useState<any[]>([]);
  // Bill modal
  const [selectedBill, setSelectedBill]   = useState<any | null>(null);
  const [billLoading, setBillLoading]     = useState(false);

  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [alertTab, setAlertTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [alertLoading, setAlertLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  // Per-alert quantity state
  const [qtyMap, setQtyMap] = useState<Record<number, string>>({});

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleQtyChange = (id: number, v: string) =>
    setQtyMap(prev => ({ ...prev, [id]: v }));

  // ── View Bill ──────────────────────────────────────────────────────────────
  const viewBill = useCallback(async (saleId: number) => {
    setBillLoading(true);
    const res = await fetch(`/api/sales/${saleId}`);
    if (res.ok) { const d = await res.json(); setSelectedBill(d.sale); }
    setBillLoading(false);
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const today    = getSLDateString();
    const slNow    = getSLTime();
    const firstDay = getSLDateString(new Date(slNow.getFullYear(), slNow.getMonth(), 1));
    const [todayRes, monthRes, quotesRes] = await Promise.all([
      fetch(`/api/sales?from=${today}&to=${today}`),
      fetch(`/api/sales?from=${firstDay}&to=${today}`),
      fetch('/api/quotations?status=pending'),
    ]);
    if (todayRes.ok) {
      const d = await todayRes.json();
      const sales: any[] = d.sales || [];
      setTodayRevenue(sales.reduce((s, x) => s + x.total_amount, 0));
      setTodayCount(sales.length);
      setTodaySales(sales);
      const map: Record<string, { t: number; c: number }> = {};
      for (const s of sales) {
        if (!map[s.session_type]) map[s.session_type] = { t: 0, c: 0 };
        map[s.session_type].t += s.total_amount;
        map[s.session_type].c += 1;
      }
      setBySess(Object.entries(map).map(([session_type, v]) => ({ session_type, ...v })));
    }
    if (monthRes.ok) {
      const d = await monthRes.json();
      setMonthRevenue((d.sales || []).reduce((s: number, x: any) => s + x.total_amount, 0));
    }
    if (quotesRes.ok) {
      const d = await quotesRes.json();
      setPendingQuotes((d.quotations || []).length);
    }
    setStatsLoading(false);
  }, []);

  // ── Alerts ──────────────────────────────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    setAlertLoading(true);
    const res = await fetch(`/api/alerts?status=${alertTab}`);
    if (res.ok) {
      const d = await res.json();
      const list: Alert[] = d.alerts || [];
      setAlerts(list);
      // Pre-fill qty from existing request if present
      const initial: Record<number, string> = {};
      for (const a of list) {
        if (a.requested_qty) initial[a.id] = String(a.requested_qty);
      }
      setQtyMap(prev => ({ ...initial, ...prev }));
    }
    setAlertLoading(false);
  }, [alertTab]);

  useEffect(() => { 
    loadStats(); 
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);
  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  // ── Actions ─────────────────────────────────────────────────────────────
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
    res.ok
      ? showToast('success', `✅ Approved! +${qty} units added to stock`)
      : showToast('error', `❌ ${d.error}`);
    setActionId(null);
    loadAlerts();
  }

  async function reject(alertId: number) {
    setActionId(alertId);
    const res = await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id: alertId }),
    });
    const d = await res.json();
    res.ok
      ? showToast('error', '❌ Restock request rejected')
      : showToast('error', `❌ ${d.error}`);
    setActionId(null);
    loadAlerts();
  }

  const needsApproval = alerts.filter(a => a.status === 'pending').length;

  return (
    <>
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
        }}>{toast.msg}</div>
      )}

      {/* ══ SECTION 1: STATS ══ */}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>💰 Finance Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Today's Revenue",   value: `LKR ${todayRevenue.toLocaleString('en-LK',{minimumFractionDigits:2})}`, sub: `${todayCount} transactions`,  icon: '💵', color: '#22c55e' },
          { label: 'Month Revenue',     value: `LKR ${monthRevenue.toLocaleString('en-LK',{minimumFractionDigits:2})}`, sub: 'Current month',              icon: '📈', color: '#3b82f6' },
          { label: 'Pending Quotations',value: pendingQuotes, sub: 'Awaiting approval',  icon: '📋', color: '#f59e0b', animate: pendingQuotes > 0 },
          { label: 'Restock Pending',   value: needsApproval, sub: 'Need your approval', icon: '🔁', color: needsApproval > 0 ? '#ef4444' : '#64748b' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.animate ? 'animate-pulse-notification' : ''}`}>
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem', position: 'relative', width: 'fit-content' }}>
              {s.icon}
              {s.animate && <span className="notification-badge">{s.value}</span>}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{statsLoading ? '…' : s.value}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '.1rem' }}>{s.label}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ══ SECTION 1.5: MANAGEMENT TILES ══ */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🛠️ Management Modules</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Sales Reports', href: '/dashboard/finance/reports', icon: '📊', color: '#3b82f6' },
          { label: 'Quotations', href: '/dashboard/finance/quotations', icon: '📋', color: '#f59e0b' },
          { label: 'Session Reports', href: '/dashboard/finance/sessions', icon: '🕐', color: '#8b5cf6' },
          { label: 'Price List', href: '/dashboard/finance/prices', icon: '💲', color: '#10b981' },
          { label: 'Restock Request', href: '/dashboard/finance/restock', icon: '🔁', color: '#ef4444' },
        ].map(m => (
          <a
            key={m.label}
            href={m.href}
            style={{
              textDecoration: 'none', background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem',
              border: '1px solid var(--border)', transition: 'all 0.2s ease', textAlign: 'center'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
              e.currentTarget.style.borderColor = m.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: `${m.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: m.color,
              position: 'relative',
              animation: (m.label === 'Quotations' && pendingQuotes > 0) ? 'notification-pulse 2s infinite ease-in-out' : 'none'
            }}>
              {m.icon}
              {(m.label === 'Quotations' && pendingQuotes > 0) && (
                <span className="notification-badge">{pendingQuotes}</span>
              )}
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '.9rem' }}>{m.label}</div>
          </a>
        ))}
      </div>

      {bySess.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 600, marginBottom: '1rem' }}>Today by Session</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem' }}>
            {bySess.map(s => (
              <div key={s.session_type} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ marginBottom: '.5rem' }}>
                  <span className={`badge badge-${s.session_type}`}>{s.session_type === 'lunch' ? '🌅 Lunch' : '🌙 Night'}</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>LKR {s.t.toFixed(2)}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{s.c} transactions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ SECTION 1b: TODAY'S TRANSACTIONS ══ */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>🧾 Today's Transactions</h2>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>Click "View Bill" to see the full itemised receipt</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadStats} title="Refresh">🔄</button>
        </div>

        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
        ) : todaySales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>📭</div>
            <div style={{ fontWeight: 600 }}>No transactions today</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>Session</th>
                  <th>Cashier</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Items</th>
                  <th>Total (LKR)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {todaySales.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{s.id}</td>
                    <td style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.created_at?.slice(11, 16)}</td>
                    <td><span className={`badge badge-${s.session_type}`}>{s.session_type === 'lunch' ? '🌅 Lunch' : '🌙 Night'}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.cashier_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.customer_name || '—'}</td>
                    <td><span className="badge badge-pending">{s.payment_method}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.item_count}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{Number(s.total_amount).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewBill(s.id)}
                        disabled={billLoading}
                      >
                        {billLoading ? '…' : '🧾 View Bill'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Bill Modal */}
    {selectedBill && (
      <BillModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
    )}
    </>
  );
}
