'use client';
import { useState, useEffect, useCallback } from 'react';

interface Product {
  id: number; name: string; category_id?: number; category_name?: string;
  cost_price: number; selling_price: number;
  quantity: number; unit: string; status: string;
}
interface Category { id: number; name: string; }

export default function PriceManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editSell, setEditSell] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');

  const load = useCallback(async () => {
    const res = await fetch('/api/products?status=active');
    if (res.ok) { const d = await res.json(); setProducts(d.products); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const categoriesMap = new Map<string, Product[]>();
  const uncategorized: Product[] = [];
  
  filtered.forEach(p => {
    if (!p.category_name) {
      uncategorized.push(p);
    } else {
      if (!categoriesMap.has(p.category_name)) categoriesMap.set(p.category_name, []);
      categoriesMap.get(p.category_name)!.push(p);
    }
  });

  const sortedCategories = Array.from(categoriesMap.keys()).sort();
  if (uncategorized.length > 0) sortedCategories.push('Uncategorized');

  const categoryIcons: Record<string, string> = {
    'Beverages': '☕',
    'Main Course': '🍱',
    'Desserts': '🍰',
    'Snacks': '🍔',
    'Uncategorized': '🏷️',
    'All': '📋'
  };

  const getIcon = (cat: string) => categoryIcons[cat] || '🍽️';

  function startEdit(p: Product) {
    setEditId(p.id);
    setEditCost(p.cost_price.toFixed(2));
    setEditSell(p.selling_price.toFixed(2));
    setError('');
  }

  function cancelEdit() { setEditId(null); setError(''); }

  async function savePrice(id: number) {
    setSaving(true); setError('');
    const cost = parseFloat(editCost);
    const sell = parseFloat(editSell);
    if (isNaN(cost) || isNaN(sell) || cost < 0 || sell < 0) {
      setError('Enter valid prices'); setSaving(false); return;
    }
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_price: cost, selling_price: sell }),
    });
    if (res.ok) {
      setSaved(id); setTimeout(() => setSaved(null), 2000);
      setEditId(null); await load();
    } else {
      const d = await res.json(); setError(d.error || 'Failed to save');
    }
    setSaving(false);
  }

  function printPriceList() {
    const now = new Date().toLocaleString('en-LK');
    const rows = filtered.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category_name || '—'}</td>
        <td>LKR ${p.cost_price.toFixed(2)}</td>
        <td>LKR ${p.selling_price.toFixed(2)}</td>
        <td>${((p.selling_price - p.cost_price) / (p.cost_price || 1) * 100).toFixed(1)}%</td>
        <td>${p.quantity} ${p.unit}</td>
      </tr>`).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Price List — Cafe 69</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2cm; color: #000; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { font-size: 12px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f5f5f5; padding: 8px 10px; text-align: left; border: 1px solid #ddd; font-weight: 600; }
        td { padding: 7px 10px; border: 1px solid #ddd; }
        tr:nth-child(even) td { background: #fafafa; }
        .footer { margin-top: 20px; font-size: 11px; color: #888; text-align: center; }
      </style></head>
      <body>
        <h1>☕ Cafe 69 — Price List</h1>
        <p>Generated: ${now} · ${filtered.length} products</p>
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Cost Price</th><th>Selling Price</th><th>Margin %</th><th>Stock</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Cafe 69 POS System · Finance Department · Confidential</div>
      </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>💲 Price Management</h1>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>Update prices for all active products</p>
        </div>
        <button className="btn btn-secondary" onClick={printPriceList}>🖨️ Print Price List</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '.75rem', overflowX: 'auto', padding: '1rem', scrollbarWidth: 'none' }}>
        {['All', ...sortedCategories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minWidth: '100px', padding: '.75rem', borderRadius: '12px', border: '1px solid var(--border)',
              background: selectedCategory === cat ? 'var(--accent)' : 'var(--bg-secondary)',
              color: selectedCategory === cat ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, gap: '.4rem'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{getIcon(cat)}</span>
            <span style={{ fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{cat}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <input className="input" placeholder="🔍 Search products in this category…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,.1)', padding: '.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '.875rem' }}>{error}</div>}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
          No products found matching your search.
        </div>
      ) : (
        sortedCategories.map(cat => {
          if (selectedCategory !== 'All' && selectedCategory !== cat) return null;
          const catProducts = cat === 'Uncategorized' ? uncategorized : categoriesMap.get(cat)!;
          if (catProducts.length === 0) return null;
          
          return (
            <div key={cat} className="card table-wrap" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                🏷️ {cat} <span style={{ fontSize: '.75rem', fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '.15rem .5rem', borderRadius: '999px', border: '1px solid var(--border)' }}>{catProducts.length} items</span>
              </div>
              <table style={{ minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Cost Price (LKR)</th>
                    <th>Selling Price (LKR)</th>
                    <th>Margin</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {catProducts.map(p => {
                    const isEditing = editId === p.id;
                    const margin = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.cost_price * 100) : 0;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.category_name || '—'}</span>
                        </td>
                        <td style={{ color: p.quantity <= 5 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '.8rem' }}>{p.quantity} {p.unit}</td>
                        <td>
                          {isEditing
                            ? <input className="input" style={{ width: 110, fontSize: '.85rem' }} value={editCost} onChange={e => setEditCost(e.target.value)} type="number" step="0.01" min="0" autoFocus />
                            : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.cost_price.toFixed(2)}</span>
                          }
                        </td>
                        <td>
                          {isEditing
                            ? <input className="input" style={{ width: 110, fontSize: '.85rem' }} value={editSell} onChange={e => setEditSell(e.target.value)} type="number" step="0.01" min="0" />
                            : <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: 600 }}>{p.selling_price.toFixed(2)}</span>
                          }
                        </td>
                        <td>
                          <span style={{ color: margin >= 20 ? 'var(--success)' : margin >= 0 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600, fontSize: '.85rem' }}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '.4rem' }}>
                              <button className="btn btn-success btn-sm" disabled={saving} onClick={() => savePrice(p.id)}>
                                {saving ? '…' : '✓ Save'}
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>✕</button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => startEdit(p)}
                              style={saved === p.id ? { borderColor: 'var(--success)', color: 'var(--success)' } : {}}
                            >
                              {saved === p.id ? '✓ Saved' : '✏️ Edit'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      )}

      <div style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
        💡 Tip: Click ✏️ Edit on any row to update prices inline. Margin is auto-calculated.
      </div>
    </div>
  );
}
