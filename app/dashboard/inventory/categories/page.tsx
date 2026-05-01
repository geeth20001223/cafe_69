'use client';
import { useState, useEffect, useCallback } from 'react';

interface Category { id: number; name: string; description?: string; status: string; }
interface Product {
  id: number; name: string; category_id: number | null; category_name?: string;
  cost_price: number; selling_price: number; quantity: number; unit: string;
  low_stock_threshold: number; status: string; description?: string;
}

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'cup', 'plate', 'bottle', 'pack'];

const emptyProduct = { name: '', category_id: '', quantity: '', unit: 'pcs', low_stock_threshold: '10', description: '' };

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');

  // Product modal (scoped to a category)
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ ...emptyProduct });
  const [targetCatId, setTargetCatId] = useState<number | null>(null);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodError, setProdError] = useState('');

  const loadAll = useCallback(async () => {
    const [catRes, prodRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/products'),
    ]);
    if (catRes.ok) { const d = await catRes.json(); setCats(d.categories); }
    if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Toggle category expand/collapse
  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() { setExpanded(new Set(cats.map(c => c.id))); }
  function collapseAll() { setExpanded(new Set()); }

  // Products grouped by category
  function productsInCat(catId: number) {
    return products.filter(p => p.category_id === catId && p.status === 'active');
  }
  function uncategorised() {
    return products.filter(p => !p.category_id && p.status === 'active');
  }

  const filteredCats = cats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Category CRUD ──────────────────────────────────────────
  function openAddCat() { setEditingCat(null); setCatForm({ name: '', description: '' }); setCatError(''); setShowCatModal(true); }
  function openEditCat(c: Category, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingCat(c); setCatForm({ name: c.name, description: c.description || '' }); setCatError(''); setShowCatModal(true);
  }
  async function saveCat(e: React.FormEvent) {
    e.preventDefault(); setCatSaving(true); setCatError('');
    const url = editingCat ? `/api/categories/${editingCat.id}` : '/api/categories';
    const method = editingCat ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) });
    const d = await res.json();
    if (!res.ok) { setCatError(d.error || 'Failed'); setCatSaving(false); return; }
    setShowCatModal(false); loadAll(); setCatSaving(false);
  }
  async function toggleCatStatus(c: Category, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/categories/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: c.status === 'active' ? 'inactive' : 'active' }) });
    loadAll();
  }

  // ── Product CRUD ───────────────────────────────────────────
  function openAddProduct(catId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingProd(null);
    setTargetCatId(catId);
    setProdForm({ ...emptyProduct, category_id: String(catId) });
    setProdError(''); setShowProdModal(true);
  }
  function openEditProduct(p: Product, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingProd(p);
    setTargetCatId(p.category_id);
    setProdForm({
      name: p.name, category_id: String(p.category_id || ''),
      quantity: String(p.quantity), unit: p.unit,
      low_stock_threshold: String(p.low_stock_threshold), description: p.description || '',
    });
    setProdError(''); setShowProdModal(true);
  }
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault(); setProdSaving(true); setProdError('');
    const payload = {
      name: prodForm.name,
      category_id: prodForm.category_id || null,
      quantity: parseFloat(prodForm.quantity) || 0,
      unit: prodForm.unit,
      low_stock_threshold: parseFloat(prodForm.low_stock_threshold) || 10,
      description: prodForm.description,
    };
    const url = editingProd ? `/api/products/${editingProd.id}` : '/api/products';
    const method = editingProd ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    if (!res.ok) { setProdError(d.error || 'Failed'); setProdSaving(false); return; }
    setShowProdModal(false); loadAll(); setProdSaving(false);
  }
  async function toggleProductStatus(p: Product, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: p.status === 'active' ? 'inactive' : 'active' }) });
    loadAll();
  }

  const inputLabel = (text: string) => (
    <label style={{ fontSize: '.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>{text}</label>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🏷️ Categories & Products</h1>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
            {cats.length} categories · {products.filter(p => p.status === 'active').length} active products
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={expandAll}>▼ Expand All</button>
          <button className="btn btn-secondary btn-sm" onClick={collapseAll}>▲ Collapse All</button>
          <button className="btn btn-primary" onClick={openAddCat}>➕ Add Category</button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <input className="input" placeholder="🔍 Search categories…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category accordion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {filteredCats.map(cat => {
          const catProducts = productsInCat(cat.id);
          const isOpen = expanded.has(cat.id);
          return (
            <div key={cat.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Category header row – click to expand */}
              <div
                onClick={() => toggleExpand(cat.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: '1.1rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', color: 'var(--text-muted)' }}>▶</span>
                <span style={{ fontSize: '1.3rem' }}>🏷️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cat.name}</div>
                  {cat.description && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>{cat.description}</div>}
                </div>
                {/* Product count pill */}
                <div style={{ background: catProducts.length > 0 ? 'rgba(245,158,11,.15)' : 'var(--bg-hover)', color: catProducts.length > 0 ? 'var(--accent)' : 'var(--text-muted)', padding: '.25rem .75rem', borderRadius: '999px', fontSize: '.8rem', fontWeight: 700, flexShrink: 0 }}>
                  {catProducts.length} {catProducts.length === 1 ? 'product' : 'products'}
                </div>
                <span className={`badge ${cat.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{cat.status}</span>
                {/* Action buttons – stop propagation so they don't toggle */}
                <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={e => openAddProduct(cat.id, e)} title="Add product to this category">➕</button>
                  <button className="btn btn-secondary btn-sm" onClick={e => openEditCat(cat, e)}>✏️</button>
                  <button className={`btn btn-sm ${cat.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={e => toggleCatStatus(cat, e)}>
                    {cat.status === 'active' ? 'Off' : 'On'}
                  </button>
                </div>
              </div>

              {/* Expanded product list */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {catProducts.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.875rem' }}>
                      No products in this category.&nbsp;
                      <button onClick={e => openAddProduct(cat.id, e)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '.875rem', fontWeight: 600 }}>
                        ➕ Add one now
                      </button>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '.6rem 1.25rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.78rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Product</th>
                            <th style={{ padding: '.6rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.78rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Stock</th>
                            <th style={{ padding: '.6rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.78rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catProducts.map((p, idx) => {
                            const isLow = p.quantity <= p.low_stock_threshold;
                            return (
                              <tr key={p.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                                <td style={{ padding: '.6rem 1.25rem' }}>
                                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                                  {p.description && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{p.description}</div>}
                                </td>
                                <td style={{ padding: '.6rem 1rem', textAlign: 'center' }}>
                                  <span style={{ color: isLow ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isLow ? 700 : 400, fontSize: '.85rem' }}>
                                    {p.quantity} {p.unit}
                                  </span>
                                  {isLow && <span style={{ marginLeft: '.4rem', fontSize: '.7rem', color: 'var(--danger)' }}>⚠️ Low</span>}
                                </td>
                                <td style={{ padding: '.6rem 1rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'center' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={e => openEditProduct(p, e)}>✏️</button>
                                    <button className="btn btn-danger btn-sm" onClick={e => toggleProductStatus(p, e)}>Off</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {/* Add product footer */}
                      <div style={{ padding: '.6rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                        <button className="btn btn-secondary btn-sm" onClick={e => openAddProduct(cat.id, e)}>➕ Add product to {cat.name}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorised products */}
        {uncategorised().length > 0 && !search && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px dashed var(--border)' }}>
            <div onClick={() => toggleExpand(-1)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.1rem', transition: 'transform 0.2s', transform: expanded.has(-1) ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', color: 'var(--text-muted)' }}>▶</span>
              <span style={{ fontSize: '1.3rem' }}>📦</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)' }}>Uncategorised</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Products with no category assigned</div>
              </div>
              <div style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', padding: '.25rem .75rem', borderRadius: '999px', fontSize: '.8rem', fontWeight: 700 }}>
                {uncategorised().length} products
              </div>
            </div>
            {expanded.has(-1) && (
              <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '.6rem 1.25rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.78rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Product</th>
                      <th style={{ padding: '.6rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.78rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Stock</th>
                      <th style={{ padding: '.6rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.78rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uncategorised().map((p, idx) => (
                      <tr key={p.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                        <td style={{ padding: '.6rem 1.25rem', fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: '.6rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{p.quantity} {p.unit}</td>
                        <td style={{ padding: '.6rem 1rem', textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={e => openEditProduct(p, e)}>✏️ Assign Category</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!filteredCats.length && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No categories found</div>}
      </div>

      {/* ── Category Modal ── */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal">
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{editingCat ? '✏️ Edit Category' : '➕ Add Category'}</h2>
            {catError && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,.1)', padding: '.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.875rem' }}>{catError}</div>}
            <form onSubmit={saveCat} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <div>
                {inputLabel('Category Name *')}
                <input className="input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Beverages" required />
              </div>
              <div>
                {inputLabel('Description (optional)')}
                <input className="input" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Short description" />
              </div>
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={catSaving}>{catSaving ? 'Saving…' : editingCat ? 'Update' : 'Add Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Product Modal ── */}
      {showProdModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowProdModal(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>
              {editingProd ? '✏️ Edit Product' : `➕ Add Product to ${cats.find(c => c.id === targetCatId)?.name || 'Category'}`}
            </h2>
            {prodError && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,.1)', padding: '.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.875rem' }}>{prodError}</div>}
            <form onSubmit={saveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  {inputLabel('Product Name *')}
                  <input className="input" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} placeholder="e.g. Hot Coffee" required />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  {inputLabel('Category')}
                  <select className="input" value={prodForm.category_id} onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}>
                    <option value="">— Uncategorised —</option>
                    {cats.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  {inputLabel('Unit')}
                  <select className="input" value={prodForm.unit} onChange={e => setProdForm({ ...prodForm, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  {inputLabel('Low Stock Alert At')}
                  <input className="input" type="number" min="0" step="1" value={prodForm.low_stock_threshold} onChange={e => setProdForm({ ...prodForm, low_stock_threshold: e.target.value })} placeholder="10" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  {inputLabel('Initial Stock Quantity')}
                  <input className="input" type="number" min="0" step="0.5" value={prodForm.quantity} onChange={e => setProdForm({ ...prodForm, quantity: e.target.value })} placeholder="0" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  {inputLabel('Description (optional)')}
                  <input className="input" value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} placeholder="Short description" />
                </div>
              </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '.6rem 1rem', fontSize: '.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  💡 Prices are managed by the Finance department.
                </div>
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowProdModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={prodSaving}>{prodSaving ? 'Saving…' : editingProd ? 'Update Product' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
