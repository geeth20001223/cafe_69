'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProductsPage from './products/page';
import CategoriesPage from './categories/page';

interface Alert {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  message: string;
  status: string;
  requested_qty: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  is_read: number;
}

interface Stats {
  products: number;
  categories: number;
  lowStock: number;
  unreadAlerts: number;
  inventoryValue: number;
}

const STATUS_CFG = {
  pending: {
    label: 'Pending Finance Approval', icon: '⏳',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',
    leftBar: '#f59e0b',
    desc: 'Restock requested — waiting for finance manager',
  },
  approved: {
    label: 'Approved by Finance', icon: '✅',
    color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)',
    leftBar: '#22c55e',
    desc: 'Stock has been updated',
  },
  rejected: {
    label: 'Rejected by Finance', icon: '❌',
    color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
    leftBar: '#ef4444',
    desc: 'Request was declined — submit a new one',
  },
  no_request: {
    label: 'No Request Yet', icon: '📭',
    color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',
    leftBar: 'var(--danger)',
    desc: 'Go to Stock Alerts to submit a restock request',
  },
};

export default function InventoryDashboardClient() {
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0, lowStock: 0, unreadAlerts: 0, inventoryValue: 0 });
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'no_request'>('pending');
  const [mainTab, setMainTab] = useState<'overview' | 'categories'>('overview');
  const [loading, setLoading] = useState(true);
 
  const [syncVersion, setSyncVersion] = useState(0);
 
  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, catRes, alertRes, qRes] = await Promise.all([
      fetch('/api/products?status=active'),
      fetch('/api/categories'),
      fetch('/api/alerts'),
      fetch('/api/quotations'),
    ]);
 
    if (prodRes.ok) {
      const d = await prodRes.json();
      const prods: any[] = d.products || [];
      setStats(prev => ({
        ...prev,
        products: prods.length,
        lowStock: prods.filter((p: any) => p.quantity <= p.low_stock_threshold).length,
        inventoryValue: prods.reduce((s: number, p: any) => s + p.cost_price * p.quantity, 0),
      }));
    }
    if (catRes.ok) {
      const d = await catRes.json();
      setStats(prev => ({ ...prev, categories: (d.categories || []).length }));
    }
    if (alertRes.ok) {
      const d = await alertRes.json();
      const alerts: Alert[] = d.alerts || [];
      setAllAlerts(alerts);
      setStats(prev => ({ ...prev, unreadAlerts: alerts.filter(a => a.is_read === 0).length }));
    }
    if (qRes.ok) {
      const d = await qRes.json();
      setRecentQuotations(d.quotations || []);
    }
    setLoading(false);
  }, []);

  const checkSync = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/check');
      if (res.ok) {
        const { version } = await res.json();
        if (version > syncVersion) {
          setSyncVersion(version);
          await load();
        }
      }
    } catch (e) { console.error('Sync check failed', e); }
  }, [syncVersion, load]);

  const markQuotationRead = async (id: number) => {
    await fetch('/api/quotations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, markRead: true })
    });
    load();
  };

  useEffect(() => { 
    load().then(() => {
      fetch('/api/sync/check').then(r => r.json()).then(d => setSyncVersion(d.version || 0));
    });
    const interval = setInterval(checkSync, 5000); // Pulse check every 5s
    return () => clearInterval(interval);
  }, [checkSync]);

  const markTabRead = async (key: keyof typeof classified) => {
    const unreadIds = classified[key].filter(a => a.is_read === 0).map(a => a.id);
    if (unreadIds.length === 0) return;
    
    await Promise.all(unreadIds.map(id => 
      fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, markRead: true })
      })
    ));
    load();
  };

  const classified = {
    pending:    allAlerts.filter(a => a.status === 'pending' && a.requested_qty),
    approved:   allAlerts.filter(a => a.status === 'approved'),
    rejected:   allAlerts.filter(a => a.status === 'rejected'),
    no_request: allAlerts.filter(a => a.status === 'pending' && !a.requested_qty),
  };

  const tabAlerts = classified[activeTab];
  const cfg = STATUS_CFG[activeTab];
  const unreadInTab = classified[activeTab].filter(a => a.is_read === 0).length;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📦 Inventory Dashboard</h1>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className={`btn btn-sm ${mainTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMainTab('overview')}>📊 Overview</button>
          <button className={`btn btn-sm ${mainTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMainTab('categories')}>🏷️ Categories & Products</button>
          <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {mainTab === 'overview' && (
        <>
          {/* ══ STAT CARDS ══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Active Products',  value: stats.products,       icon: '🍽️', color: '#3b82f6' },
              { label: 'Categories',       value: stats.categories,     icon: '🏷️', color: '#8b5cf6' },
              { label: 'Low Stock Items',  value: stats.lowStock,       icon: '⚠️', color: '#ef4444' },
              { 
                label: 'Unread Alerts',    
                value: stats.unreadAlerts,   
                icon: '🔔', 
                color: '#f59e0b', 
                animate: stats.unreadAlerts > 0,
                onClick: () => { setActiveTab('no_request'); document.getElementById('tracker-section')?.scrollIntoView({ behavior: 'smooth' }); }
              },
              { label: 'Inventory Value',  value: `LKR ${stats.inventoryValue.toLocaleString('en-LK',{minimumFractionDigits:2})}`, icon: '💎', color: '#22c55e' },
            ].map(s => (
              <div 
                key={s.label} 
                className={`stat-card ${s.animate ? 'animate-pulse-notification' : ''}`}
                onClick={s.onClick}
                style={{ cursor: s.onClick ? 'pointer' : 'default' }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '.5rem', position: 'relative', width: 'fit-content' }}>
                  {s.icon}
                  {s.animate && <span className="notification-badge">{s.value}</span>}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{loading ? '…' : s.value}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginTop: '.1rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ══ RESTOCK STATUS TRACKER ══ */}
          <div id="tracker-section" className="card" style={{ borderTop: '3px solid var(--accent)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>📋 Status Trackers</h2>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                  Monitor finance decisions on stock alerts and formal quotations
                </p>
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <Link 
                  href="/dashboard/inventory/quotations" 
                  onClick={async () => {
                    const unread = recentQuotations.filter(q => q.status !== 'pending' && q.is_read === 0);
                    if (unread.length > 0) {
                      await Promise.all(unread.map(q => markQuotationRead(q.id)));
                    }
                  }}
                  className={`btn btn-secondary btn-sm ${recentQuotations.some(q => q.status !== 'pending' && q.is_read === 0) ? 'animate-pulse-notification' : ''}`}
                  style={{ position: 'relative' }}
                >
                  📋 Quotations
                  {recentQuotations.filter(q => q.status !== 'pending' && q.is_read === 0).length > 0 && (
                    <span className="notification-badge" style={{ top: '-4px', right: '-4px' }}>
                      {recentQuotations.filter(q => q.status !== 'pending' && q.is_read === 0).length}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard/inventory/alerts" className={`btn btn-secondary btn-sm ${stats.unreadAlerts > 0 ? 'animate-pulse-notification' : ''}`} style={{ position: 'relative', overflow: 'visible' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔔</span> 
                  Alerts
                  {stats.unreadAlerts > 0 && <span className="notification-badge" style={{ top: '-4px', right: '-4px' }}>{stats.unreadAlerts}</span>}
                </Link>
              </div>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(Object.entries(STATUS_CFG) as [keyof typeof STATUS_CFG, typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([key, c]) => {
                const alertsInKey = classified[key];
                const count = alertsInKey.length;
                const unreadCount = alertsInKey.filter(a => a.is_read === 0).length;
                const isActive = activeTab === key;
                const shouldAnimate = unreadCount > 0;
                
                return (
                  <button 
                    key={key} 
                    onClick={() => {
                      setActiveTab(key);
                      if (unreadCount > 0) markTabRead(key);
                    }} 
                    className={shouldAnimate ? 'animate-pulse-notification' : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.4rem',
                      padding: '.45rem 1rem', borderRadius: '8px', fontSize: '.82rem', fontWeight: 600,
                      border: `1px solid ${isActive ? c.color : 'var(--border)'}`,
                      background: isActive ? `${c.color}18` : 'var(--bg-secondary)',
                      color: isActive ? c.color : 'var(--text-secondary)',
                      cursor: 'pointer', transition: 'all 0.15s',
                      position: 'relative'
                    }}
                  >
                    {c.icon} {key === 'no_request' ? 'No Request' : key.charAt(0).toUpperCase() + key.slice(1)}
                    <span style={{
                      background: isActive ? c.color : 'var(--border)',
                      color: isActive ? '#000' : 'var(--text-muted)',
                      borderRadius: '999px', padding: '0 .45rem', fontSize: '.72rem', fontWeight: 700,
                    }}>
                      {count}
                    </span>
                    {shouldAnimate && <span className="notification-badge" style={{ top: '-6px', right: '-6px' }}>{unreadCount}</span>}
                  </button>
                );
              })}

              {unreadInTab > 0 && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => markTabRead(activeTab)}
                  style={{ marginLeft: 'auto', fontSize: '.75rem', height: '32px' }}
                >
                  ✅ Mark All as Seen
                </button>
              )}
            </div>

            {/* Status description */}
            <div style={{
              padding: '.6rem 1rem', borderRadius: '8px', marginBottom: '1rem',
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: '.82rem', color: cfg.color, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '.5rem',
            }}>
              {cfg.icon} {cfg.label} — <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{cfg.desc}</span>
            </div>

            {/* Alert rows */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : tabAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>{cfg.icon}</div>
                <div style={{ fontWeight: 600 }}>No alerts in this category</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {tabAlerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '1rem', flexWrap: 'wrap',
                    padding: '.85rem 1.1rem', borderRadius: '10px',
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    borderLeft: `4px solid ${cfg.leftBar}`,
                  }}>
                    {/* Left: product info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{a.product_name}</span>
                        <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,.15)', color: '#f87171', padding: '.1rem .5rem', borderRadius: '999px', fontWeight: 700 }}>
                          LOW STOCK
                        </span>
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                        Stock: <strong style={{ color: 'var(--danger)' }}>{a.quantity} {a.unit}</strong>
                        &nbsp;· Min: {a.low_stock_threshold} {a.unit}
                        &nbsp;· {a.created_at?.slice(0, 10)}
                      </div>
                    </div>

                    {/* Middle: restock qty */}
                    {a.requested_qty && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: '.15rem' }}>REQUESTED</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: cfg.color }}>+{a.requested_qty} {a.unit}</div>
                      </div>
                    )}

                    {/* Right: finance decision */}
                    <div style={{ textAlign: 'right', minWidth: 160 }}>
                      {a.approved_by_name ? (
                        <>
                          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                            {activeTab === 'approved' ? '✅ Approved' : '❌ Rejected'} by
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '.88rem', color: cfg.color }}>{a.approved_by_name}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.approved_at?.slice(0, 16)}</div>
                        </>
                      ) : activeTab === 'pending' ? (
                        <div style={{ fontSize: '.78rem', color: '#f59e0b', fontStyle: 'italic' }}>
                          ⏳ Awaiting finance decision
                        </div>
                      ) : (
                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Not yet submitted
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ══ RECENT QUOTATIONS ══ */}
          <div className="card" style={{ marginTop: '1.5rem', borderTop: '3px solid var(--info)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>📜 Recent Quotations</h2>
              <Link href="/dashboard/inventory/quotations" style={{ fontSize: '.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : recentQuotations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>No recent quotations found</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Title</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {recentQuotations.slice(0, 5).map(q => {
                      const isUnreadReaction = q.status !== 'pending' && q.is_read === 0;
                      return (
                        <tr key={q.id} className={isUnreadReaction ? 'animate-pulse-notification' : ''}>
                          <td style={{ fontWeight: 500, fontSize: '.85rem' }}>{q.title}</td>
                          <td style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.85rem' }}>LKR {parseFloat(q.total).toFixed(2)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                              <span className={`badge badge-${q.status}`} style={{ 
                                fontSize: '.7rem',
                                animation: isUnreadReaction ? 'notification-pulse 2s infinite ease-in-out' : 'none'
                              }}>
                                {q.status}
                              </span>
                              {isUnreadReaction && (
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ fontSize: '.65rem', padding: '1px 5px', height: '18px' }}
                                  onClick={() => markQuotationRead(q.id)}
                                >
                                  Seen
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{q.created_at?.replace('T', ' ').slice(0, 19)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {mainTab === 'categories' && (
        <CategoriesPage />
      )}
    </div>
  );
}
