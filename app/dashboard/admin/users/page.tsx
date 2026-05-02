'use client';
import { useState, useEffect } from 'react';

interface User { id: number; name: string; email: string; role: string; is_active: number; created_at: string; }

const ROLES = ['admin', 'inventory_manager', 'cashier', 'finance_manager'];
const ROLE_LABELS: Record<string, string> = { admin: 'Admin', inventory_manager: 'Inventory Manager', cashier: 'Cashier', finance_manager: 'Finance Manager' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch('/api/users');
    if (res.ok) { const d = await res.json(); setUsers(d.users); }
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  async function createUser(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    if (!res.ok) { setError(d.error); setSaving(false); return; }
    setShowModal(false); setForm({ name: '', email: '', password: '', role: 'cashier' }); load(); setSaving(false);
  }

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }) });
    load();
  }

  async function deleteUser(u: User) {
    if (!confirm(`❗ Are you sure you want to PERMANENTLY DELETE "${u.name}"?\n\nThis action cannot be undone.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Failed to delete user');
    }
    load();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add User</button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td><span className="badge badge-pending">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td><span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{u.created_at?.slice(0, 10)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Create User</h2>
            {error && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,.1)', padding: '.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.875rem' }}>{error}</div>}
            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Full Name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Silva" required />
              </div>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@cafe69.lk" required />
              </div>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Password</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" minLength={6} required />
              </div>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Role</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
