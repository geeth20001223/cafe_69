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
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'no_request'>('pending');
  const [mainTab, setMainTab] = useState<'overview' | 'categories'>('overview');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, catRes, alertRes] = await Promise.all([
      fetch('/api/products?status=active'),
      fetch('/api/categories'),
      fetch('/api/alerts'),          // all alerts (no filter)
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
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Classify alerts into tabs
  const classified = {
    pending:    allAlerts.filter(a => a.status === 'pending' && a.requested_qty),
    approved:   allAlerts.filter(a => a.status === 'approved'),
    rejected:   allAlerts.filter(a => a.status === 'rejected'),
    no_request: allAlerts.filter(a => a.status === 'pending' && !a.requested_qty),
  };

  const tabAlerts = classified[activeTab];
  const cfg = STATUS_CFG[activeTab];

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
              { label: 'Unread Alerts',    value: stats.unreadAlerts,   icon: '🔔', color: '#f59e0b' },
              { label: 'Inventory Value',  value: `LKR ${stats.inventoryValue.toLocaleString('en-LK',{minimumFractionDigits:2})}`, icon: '💎', color: '#22c55e' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{loading ? '…' : s.value}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginTop: '.1rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ══ RESTOCK STATUS TRACKER ══ */}
          <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>📋 Restock Status Tracker</h2>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                  Track the finance manager's approval decisions on your restock requests
                </p>
              </div>
              <Link href="/dashboard/inventory/alerts" className="btn btn-secondary btn-sm">
                <span className={stats.unreadAlerts > 0 ? 'animate-bell' : ''}>🔔</span> Manage Alerts
              </Link>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {(Object.entries(STATUS_CFG) as [keyof typeof STATUS_CFG, typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([key, c]) => {
                const count = classified[key].length;
                const isActive = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key)} style={{
                    display: 'flex', alignItems: 'center', gap: '.4rem',
                    padding: '.45rem 1rem', borderRadius: '8px', fontSize: '.82rem', fontWeight: 600,
                    border: `1px solid ${isActive ? c.color : 'var(--border)'}`,
                    background: isActive ? `${c.color}18` : 'var(--bg-secondary)',
                    color: isActive ? c.color : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {c.icon} {key === 'no_request' ? 'No Request' : key.charAt(0).toUpperCase() + key.slice(1)}
                    <span style={{
                      background: isActive ? c.color : 'var(--border)',
                      color: isActive ? '#000' : 'var(--text-muted)',
                      borderRadius: '999px', padding: '0 .45rem', fontSize: '.72rem', fontWeight: 700,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
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
        </>
      )}

      {mainTab === 'categories' && (
        <CategoriesPage />
      )}
    </div>
  );
}
