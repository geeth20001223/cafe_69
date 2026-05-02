'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Clock from './Clock';

interface NavItem { label: string; href: string; icon: string; }

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/sys.admin', icon: '🏠' },
    { label: 'User Management', href: '/sys.admin/users', icon: '👥' },
    { label: 'Inventory', href: '/sys.inventory', icon: '📦' },
    { label: 'Sales', href: '/sys.terminal', icon: '🛒' },
    { label: 'Finance', href: '/sys.finance', icon: '💰' },
  ],
  inventory_manager: [
    { label: 'Dashboard', href: '/sys.inventory', icon: '🏠' },
    { label: 'Stock Alerts', href: '/sys.inventory/alerts', icon: '🔔' },
    { label: 'Restock Dashboard', href: '/sys.restock', icon: '🔁' },
    { label: 'Reports', href: '/sys.inventory/reports', icon: '📊' },
    { label: 'Quotations', href: '/sys.inventory/quotations', icon: '📋' },
  ],
  cashier: [
    { label: 'POS Terminal', href: '/sys.terminal', icon: '🛒' },
    { label: 'Sales History', href: '/sys.terminal/history', icon: '📜' },
  ],
  finance_manager: [
    { label: 'Dashboard', href: '/sys.finance', icon: '🏠' },
    { label: 'Sales Reports', href: '/sys.finance/reports', icon: '📊' },
    { label: 'Quotations', href: '/sys.finance/quotations', icon: '📋' },
    { label: 'Session Reports', href: '/sys.finance/sessions', icon: '🕐' },
  ],
};

interface SidebarProps { role: string; name: string; urlKey?: string; onClose?: () => void; }

export default function Sidebar({ role, name, urlKey, onClose }: SidebarProps) {
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
    router.push('/auth.v1');
  }

  return (
    <aside className="sidebar" style={{ width: collapsed ? 64 : 240 }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>☕</span>
        {!collapsed && <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>Cafe 69</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="sidebar-collapse-btn"
          style={{ 
            marginLeft: collapsed ? '0' : 'auto', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            fontSize: '1.2rem',
            padding: '.25rem',
            display: collapsed ? 'block' : 'block' 
          }}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? '▶' : '☰'}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map((item, idx) => {
          const isRoot = item.href === `/sys.${role}`;
          const dynamicHref = `/s/${urlKey || 'session'}${item.href}`;
          const isActive = pathname === dynamicHref || (!isRoot && pathname.startsWith(dynamicHref + '/'));
          
          let count = 0;
          if (item.label === 'Quotations') count = pendingQuotes;
          if (item.label === 'Stock Alerts') count = unreadAlerts;
          
          const showBadge = count > 0;
          
          return (
            <Link 
              key={item.href} 
              href={dynamicHref} 
              onClick={async () => {
                if (role === 'inventory_manager' && item.label === 'Quotations' && pendingQuotes > 0) {
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
                if (onClose) onClose();
              }}
              className={`sidebar-link ${isActive ? 'active' : ''} fade-in stagger-${(idx % 4) + 1} ${showBadge ? 'animate-pulse-notification' : ''}`}
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
      <div className="sidebar-footer">
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
