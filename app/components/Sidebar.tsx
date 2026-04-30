'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Clock from './Clock';

interface NavItem { label: string; href: string; icon: string; }

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: '🏠' },
    { label: 'User Management', href: '/dashboard/admin/users', icon: '👥' },
    { label: 'Products', href: '/dashboard/inventory/products', icon: '🍽️' },
    { label: 'Categories', href: '/dashboard/inventory/categories', icon: '🏷️' },
    { label: 'Inventory', href: '/dashboard/inventory', icon: '📦' },
    { label: 'Sales', href: '/dashboard/cashier', icon: '🛒' },
    { label: 'Finance', href: '/dashboard/finance', icon: '💰' },
  ],
  inventory_manager: [
    { label: 'Dashboard', href: '/dashboard/inventory', icon: '🏠' },
    { label: 'Products', href: '/dashboard/inventory/products', icon: '🍽️' },
    { label: 'Categories', href: '/dashboard/inventory/categories', icon: '🏷️' },
    { label: 'Stock Alerts', href: '/dashboard/inventory/alerts', icon: '🔔' },
    { label: 'Reports', href: '/dashboard/inventory/reports', icon: '📊' },
    { label: 'Quotations', href: '/dashboard/inventory/quotations', icon: '📋' },
  ],
  cashier: [
    { label: 'POS Terminal', href: '/dashboard/cashier', icon: '🛒' },
    { label: 'Sales History', href: '/dashboard/cashier/history', icon: '📜' },
  ],
  finance_manager: [
    { label: 'Dashboard', href: '/dashboard/finance', icon: '🏠' },
    { label: 'Price Management', href: '/dashboard/finance/prices', icon: '💲' },
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
        <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', display: collapsed ? 'none' : 'block' }}>☰</button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '.75rem .5rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
        {nav.map(item => (
          <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
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
