'use client';
import { useState, useEffect, useCallback } from 'react';

interface Product { id: number; name: string; category_id: number; category_name?: string; cost_price: number; selling_price: number; quantity: number; unit: string; low_stock_threshold: number; status: string; description?: string; }
interface Category { id: number; name: string; }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category_id: '', quantity: '', unit: 'pcs', low_stock_threshold: '10', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterCat) params.set('category', filterCat);
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('search', search);
    const res = await fetch(`/api/products?${params}`);
    if (res.ok) { const d = await res.json(); setProducts(d.products); }
  }, [filterCat, filterStatus, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories));
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', category_id: '', quantity: '', unit: 'pcs', low_stock_threshold: '10', description: '' });
    setError(''); setShowModal(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, category_id: String(p.category_id || ''), quantity: String(p.quantity), unit: p.unit, low_stock_threshold: String(p.low_stock_threshold), description: p.description || '' });
    setError(''); setShowModal(true);
  }

  // Float adjustment: "1 and half" → 1.5
  function parseQty(val: string): number {
    const cleaned = val.replace(',', '.').replace(/\s*(and\s*)?half/i, '.5');
    return parseFloat(cleaned) || 0;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const payload = {
      name: form.name, category_id: form.category_id || null,
      quantity: parseQty(form.quantity),
      unit: form.unit,
      low_stock_threshold: parseQty(form.low_stock_threshold),
      description: form.description,
    };
    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    if (!res.ok) { setError(d.error); setSaving(false); return; }
    setShowModal(false); load(); setSaving(false);
  }

  async function toggleStatus(p: Product) {
    await fetch(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: p.status === 'active' ? 'inactive' : 'active' }) });
    load();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Products</h1>
        <button className="btn btn-primary" onClick={openAdd}>➕ Add Product</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ flex: '0 0 160px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ flex: '0 0 130px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table style={{ minWidth: '900px' }}>
          <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => {
              const pct = p.low_stock_threshold > 0 ? Math.min(100, (p.quantity / p.low_stock_threshold) * 50) : 100;
              const isLow = p.quantity <= p.low_stock_threshold;
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{p.description}</div>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.category_name || '—'}</td>
                  <td style={{ minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <span style={{ color: isLow ? 'var(--danger)' : 'var(--text-primary)', fontSize: '.875rem', fontWeight: isLow ? 700 : 400 }}>
                        {p.quantity} {p.unit}
                      </span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: '.3rem' }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: isLow ? 'var(--danger)' : 'var(--success)' }} />
                    </div>
                  </td>
                  <td><span className={`badge ${p.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{p.status}</span></td>
                  <td style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️</button>
                    <button className={`btn btn-sm ${p.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(p)}>
                      {p.status === 'active' ? 'Off' : 'On'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!products.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No products found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560, overflowY: 'auto', maxHeight: '90vh' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{editing ? 'Edit Product' : 'Add Product'}</h2>
            {error && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,.1)', padding: '.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.875rem' }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Product Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hot Coffee" required />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Category</label>
                  <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">— Select —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Unit</label>
                  <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['pcs', 'kg', 'g', 'L', 'ml', 'cup', 'plate', 'bottle', 'pack'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Quantity</label>
                  <input className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 1.5" />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Low Stock Threshold</label>
                  <input className="input" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} placeholder="10" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.3rem' }}>Description</label>
                  <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
