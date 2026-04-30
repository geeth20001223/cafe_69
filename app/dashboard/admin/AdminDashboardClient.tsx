'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface User { id: number; name: string; email: string; role: string; is_active: number; created_at: string; }
interface Stats { totalSales: number; salesCount: number; productsCount: number; alertsCount: number; }

const ROLES = ['admin', 'inventory_manager', 'cashier', 'finance_manager'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', inventory_manager: 'Inventory Manager',
  cashier: 'Cashier', finance_manager: 'Finance Manager',
};
const ROLE_ICONS: Record<string, string> = {
  admin: '🔑', inventory_manager: '📦', cashier: '🛒', finance_manager: '💰',
};
const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444', inventory_manager: '#3b82f6', cashier: '#22c55e', finance_manager: '#f59e0b',
};

const emptyForm = { name: '', email: '', password: '', role: 'cashier' };

export default function AdminDashboardClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSales: 0, salesCount: 0, productsCount: 0, alertsCount: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [usersRes, prodRes, salesRes, alertRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/products?status=active'),
      fetch(`/api/sales?from=${today}&to=${today}`),
      fetch('/api/alerts?unread=true'),
    ]);
    if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users || []); }
    const products = prodRes.ok ? await prodRes.json() : { products: [] };
    const sales = salesRes.ok ? await salesRes.json() : { sales: [] };
    const alerts = alertRes.ok ? await alertRes.json() : { alerts: [] };
    setStats({
      productsCount: (products.products || []).length,
      totalSales: (sales.sales || []).reduce((s: number, x: any) => s + x.total_amount, 0),
      salesCount: (sales.sales || []).length,
      alertsCount: (alerts.alerts || []).length,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeUsers = users.filter(u => u.is_active);
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const usersByRole = ROLES.map(role => ({
    role,
    cnt: activeUsers.filter(u => u.role === role).length,
  }));

  function openAdd() {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setFormError(''); setShowPwd(false); setShowModal(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormError(''); setShowPwd(false); setShowModal(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError('');
    let res: Response;
    if (editingUser) {
      const payload: any = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;
      res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
    }
    const d = await res.json();
    if (!res.ok) { setFormError(d.error || 'Something went wrong'); setSaving(false); return; }
    setShowModal(false);
    setSuccessMsg(editingUser ? `✅ ${form.name} updated` : `✅ ${form.name} created`);
    setTimeout(() => setSuccessMsg(''), 3000);
    await loadAll();
    setSaving(false);
  }

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }),
    });
    await loadAll();
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔑 Admin Dashboard</h1>
        <button className="btn btn-primary" onClick={openAdd}>➕ Add User</button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', color: 'var(--success)', padding: '.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '.875rem', fontWeight: 500 }}>
          {successMsg}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Today's Revenue", value: loading ? '…' : `LKR ${stats.totalSales.toFixed(2)}`, sub: `${stats.salesCount} transactions`, icon: '💰', color: '#22c55e' },
          { label: 'Active Products', value: loading ? '…' : stats.productsCount, sub: 'in inventory', icon: '📦', color: '#3b82f6' },
          { label: 'Stock Alerts', value: loading ? '…' : stats.alertsCount, sub: 'unread alerts', icon: '🔔', color: stats.alertsCount > 0 ? '#ef4444' : '#64748b' },
          { label: 'Active Users', value: loading ? '…' : activeUsers.length, sub: 'across all roles', icon: '👥', color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '.1rem' }}>{stat.label}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Role breakdown */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem' }}>Active Users by Role</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '.75rem' }}>
          {usersByRole.map(({ role, cnt }) => (
            <div key={role} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center', borderLeft: `3px solid ${ROLE_COLORS[role]}` }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '.25rem' }}>{ROLE_ICONS[role]}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: ROLE_COLORS[role] }}>{cnt}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', marginTop: '.2rem' }}>{ROLE_LABELS[role]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Full user table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
          <h2 style={{ fontWeight: 600 }}>All Users <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({users.length})</span></h2>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <input className="input" style={{ width: 200 }} placeholder="🔍 Search name / email…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input" style={{ width: 180 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading…</td></tr>
              )}
              {!loading && filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>{u.email}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', background: 'var(--bg-hover)', padding: '.2rem .6rem', borderRadius: '6px', fontSize: '.78rem', fontWeight: 600 }}>
                      {ROLE_ICONS[u.role]} {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{u.created_at?.slice(0, 10)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏️ Edit</button>
                      <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {users.length === 0 ? 'No users yet. Add one above.' : 'No users match your filter.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>
              {editingUser ? `✏️ Edit — ${editingUser.name}` : '➕ Add New User'}
            </h2>

            {formError && (
              <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,.1)', padding: '.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.875rem' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              {/* Role pill selector */}
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.5rem' }}>Role *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                      style={{
                        padding: '.6rem .75rem', borderRadius: '8px',
                        border: `2px solid ${form.role === r ? ROLE_COLORS[r] : 'var(--border)'}`,
                        background: form.role === r ? `${ROLE_COLORS[r]}22` : 'var(--bg-secondary)',
                        color: form.role === r ? ROLE_COLORS[r] : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '.4rem', transition: 'all 0.15s',
                      }}>
                      {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kasun Perera" required />
              </div>

              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Email Address *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="kasun@cafe69.lk" required />
              </div>

              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>
                  Password {editingUser && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep current)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input" type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                    minLength={editingUser ? undefined : 6}
                    required={!editingUser}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.9rem' }}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '.75rem', marginTop: '.25rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? (editingUser ? 'Updating…' : 'Creating…') : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
