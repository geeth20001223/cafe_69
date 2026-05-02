'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Clock from './Clock';

interface NavItem { label: string; href: string; icon: string; }

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: '🏠' },
    { label: 'User Management', href: '/dashboard/admin/users', icon: '👥' },
    { label: 'Inventory', href: '/dashboard/inventory', icon: '📦' },
    { label: 'Sales', href: '/dashboard/cashier', icon: '🛒' },
    { label: 'Finance', href: '/dashboard/finance', icon: '💰' },
  ],
  inventory_manager: [
    { label: 'Dashboard', href: '/dashboard/inventory', icon: '🏠' },
    { label: 'Stock Alerts', href: '/dashboard/inventory/alerts', icon: '🔔' },
    { label: 'Restock Dashboard', href: '/dashboard/restock', icon: '🔁' },
    { label: 'Reports', href: '/dashboard/inventory/reports', icon: '📊' },
    { label: 'Quotations', href: '/dashboard/inventory/quotations', icon: '📋' },
  ],
  cashier: [
    { label: 'POS Terminal', href: '/dashboard/cashier', icon: '🛒' },
    { label: 'Sales History', href: '/dashboard/cashier/history', icon: '📜' },
  ],
  finance_manager: [
    { label: 'Dashboard', href: '/dashboard/finance', icon: '🏠' },
    { label: 'Sales Reports', href: '/dashboard/finance/reports', icon: '📊' },
    { label: 'Quotations', href: '/dashboard/finance/quotations', icon: '📋' },
    { label: 'Session Reports', href: '/dashboard/finance/sessions', icon: '🕐' },
  ],
};

interface SidebarProps { role: string; name: string; }

export default function Sidebar({ role, name }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Fetch notifications
  useEffect(() => {
    const load = () => {
      // Finance / Admin: Quotations pending approval
      if (role === 'finance_manager' || role === 'admin') {
        fetch('/api/quotations?status=pending')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.quotations) setPendingQuotes(data.quotations.length);
          });
      }
      // Inventory / Admin: Quotation reactions (approved/rejected) not yet seen
      if (role === 'inventory_manager') {
        fetch('/api/quotations')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.quotations) {
              const unreadReactions = data.quotations.filter((q: any) => q.status !== 'pending' && q.is_read === 0);
              setPendingQuotes(unreadReactions.length);
            }
          });
      }
      // Inventory / Admin: Alerts
      if (role === 'inventory_manager' || role === 'admin') {
        fetch('/api/alerts')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.alerts) {
              setUnreadAlerts(data.alerts.filter((a: any) => a.is_read === 0).length);
            }
          });
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [role]);

  const nav = navByRole[role] || [];

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    inventory_manager: 'Inventory Manager',
    cashier: 'Cashier',
    finance_manager: 'Finance Manager',
  };

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.75rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>☕</span>
        {!collapsed && <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>Cafe 69</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          style={{ 
            marginLeft: collapsed ? '0' : 'auto', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            fontSize: '1.2rem',
            padding: '.25rem',
            display: 'block' 
          }}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? '▶' : '☰'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '.75rem .5rem', display: 'flex', flexDirection: 'column', gap: '.25rem', overflowY: 'auto' }}>
        {nav.map((item, idx) => {
          const isRoot = item.href === `/dashboard/${role}`;
          const isActive = pathname === item.href || (!isRoot && pathname.startsWith(item.href + '/'));
          
          let count = 0;
          if (item.label === 'Quotations') count = pendingQuotes;
          if (item.label === 'Stock Alerts') count = unreadAlerts;
          
          const showBadge = count > 0;
          const shouldAnimate = showBadge;
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={async () => {
                if (role === 'inventory_manager' && item.label === 'Quotations' && pendingQuotes > 0) {
                  // Mark all unread reactions as read
                  const res = await fetch('/api/quotations');
                  if (res.ok) {
                    const data = await res.json();
                    const unread = data.quotations.filter((q: any) => q.status !== 'pending' && q.is_read === 0);
                    await Promise.all(unread.map((q: any) => 
                      fetch('/api/quotations', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: q.id, markRead: true })
                      })
                    ));
                  }
                }
              }}
              className={`sidebar-link ${isActive ? 'active' : ''} fade-in stagger-${(idx % 4) + 1} ${shouldAnimate ? 'animate-pulse-notification' : ''}`}
              style={{ position: 'relative' }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {showBadge && (
                <span className="notification-badge" style={{ 
                  top: '50%', 
                  right: collapsed ? '4px' : '10px', 
                  transform: 'translateY(-50%)',
                  fontSize: '0.6rem',
                  height: '16px',
                  minWidth: '16px'
                }}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '.75rem', borderTop: '1px solid var(--border)' }}>
        {!collapsed && (
          <div style={{ marginBottom: '.75rem' }}>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{roleLabels[role]}</div>
          </div>
        )}
        <button onClick={logout} disabled={loggingOut} className="btn btn-secondary" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', fontSize: '.8rem', padding: '.5rem' }}>
          <span>🚪</span>{!collapsed && (loggingOut ? 'Signing out…' : 'Sign Out')}
        </button>
      </div>
    </aside>
  );
}
