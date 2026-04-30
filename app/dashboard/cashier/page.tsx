'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Product { id: number; name: string; category_name?: string; selling_price: number; quantity: number; unit: string; }
interface CartItem { product: Product; quantity: number; }

export default function CashierPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [payment, setPayment] = useState<'cash' | 'card'>('cash');
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [error, setError] = useState('');
  const [sessionReport, setSessionReport] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ status: 'active' });
    if (filterCat) params.set('category', filterCat);
    if (search) params.set('search', search);
    const res = await fetch(`/api/products?${params}`);
    if (res.ok) { const d = await res.json(); setProducts(d.products); }
  }, [filterCat, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  function addToCart(product: Product) {
    if (product.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: number, qty: number) {
    if (qty <= 0) { setCart(cart.filter(i => i.product.id !== productId)); return; }
    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  }

  function removeFromCart(productId: number) { setCart(cart.filter(i => i.product.id !== productId)); }

  const subtotal = cart.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const change = payment === 'cash' ? (parseFloat(cashGiven) || 0) - total : 0;

  async function checkout() {
    if (!cart.length) { setError('Cart is empty'); return; }
    setSubmitting(true); setError('');
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.selling_price }));
    const res = await fetch('/api/sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, payment_method: payment, customer_name: customerName, notes, discount_amount: discountAmt }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error); setSubmitting(false); return; }
    const billRes = await fetch(`/api/sales/${d.saleId}`);
    if (billRes.ok) { const bd = await billRes.json(); setLastBill({ ...bd.sale, items: bd.sale.items, change }); }
    setCart([]); setDiscount('0'); setCustomerName(''); setCashGiven(''); setNotes('');
    loadProducts();
    setSubmitting(false);
  }

  function printBill(bill: any) {
    const now = new Date(bill.created_at || Date.now()).toLocaleString('en-LK');
    const rows = (bill.items || []).map((item: any) =>
      `<tr><td>${item.product_name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">LKR ${item.unit_price.toFixed(2)}</td><td style="text-align:right">LKR ${item.subtotal.toFixed(2)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${bill.id}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:1cm;max-width:80mm}
        h1{font-size:16px;text-align:center;margin-bottom:2px} p{text-align:center;font-size:11px;color:#555;margin:2px 0}
        hr{border:none;border-top:1px dashed #999;margin:8px 0}
        table{width:100%;font-size:11px;border-collapse:collapse}
        th{font-size:10px;text-align:left;border-bottom:1px solid #ccc;padding:3px 2px}
        td{padding:3px 2px;vertical-align:top}
        .total{font-size:14px;font-weight:bold;text-align:right;margin-top:6px}
        .footer{text-align:center;font-size:10px;color:#888;margin-top:10px}
        @media print{@page{margin:0.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69</h1>
      <p>Receipt #${bill.id} · ${bill.session_type} session</p>
      <p>${now}</p>
      ${bill.customer_name ? `<p>Customer: ${bill.customer_name}</p>` : ''}
      <hr>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <hr>
      ${bill.discount_amount > 0 ? `<div style="text-align:right;font-size:12px">Discount: − LKR ${bill.discount_amount.toFixed(2)}</div>` : ''}
      <div class="total">TOTAL: LKR ${bill.total_amount.toFixed(2)}</div>
      <div style="text-align:right;font-size:11px">Payment: ${bill.payment_method}</div>
      ${bill.change > 0 ? `<div style="text-align:right;font-size:11px;color:green">Change: LKR ${bill.change.toFixed(2)}</div>` : ''}
      <div class="footer">Thank you! Visit again ☕</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  async function closeSession() {
    const now = new Date();
    const sessionType = now.getHours() >= 7 && now.getHours() < 16 ? 'lunch' : 'night';
    const today = now.toISOString().split('T')[0];
    const res = await fetch(`/api/sales?from=${today}&to=${today}&session=${sessionType}`);
    if (!res.ok) return;
    const { sales } = await res.json();
    const totalRevenue = sales.reduce((s: number, s2: any) => s + s2.total_amount, 0);
    const totalTx = sales.length;
    const cashSales = sales.filter((s: any) => s.payment_method === 'cash').reduce((s: number, s2: any) => s + s2.total_amount, 0);
    const cardSales = sales.filter((s: any) => s.payment_method === 'card').reduce((s: number, s2: any) => s + s2.total_amount, 0);
    setSessionReport({ sessionType, date: today, totalRevenue, totalTx, cashSales, cardSales, sales, generated: now.toLocaleString('en-LK') });
  }

  function printSessionReport(r: any) {
    const rows = r.sales.map((s: any) =>
      `<tr><td>#${s.id}</td><td>${s.customer_name || '—'}</td><td>${s.payment_method}</td><td style="text-align:right">LKR ${s.total_amount.toFixed(2)}</td><td>${(s.created_at || '').slice(11, 16)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Session Report — Cafe 69</title>
      <style>
        body{font-family:Arial,sans-serif;margin:2cm;color:#000}
        h1{font-size:20px;margin-bottom:4px} p{font-size:12px;color:#555;margin:2px 0}
        .summary{display:flex;gap:20px;margin:16px 0;flex-wrap:wrap}
        .box{border:1px solid #ddd;padding:10px 16px;border-radius:6px;min-width:140px}
        .box-val{font-size:18px;font-weight:bold;color:#333} .box-lbl{font-size:11px;color:#777}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
        th{background:#f5f5f5;padding:8px 10px;text-align:left;border:1px solid #ddd;font-weight:600}
        td{padding:7px 10px;border:1px solid #ddd}
        .footer{margin-top:20px;font-size:11px;color:#888;text-align:center}
        @media print{@page{margin:1.5cm}}
      </style></head><body>
      <h1>☕ Cafe 69 — Session Sales Report</h1>
      <p>Session: <strong>${r.sessionType === 'lunch' ? '🌅 Lunch' : '🌙 Night'}</strong> · Date: ${r.date}</p>
      <p>Generated: ${r.generated}</p>
      <div class="summary">
        <div class="box"><div class="box-val">LKR ${r.totalRevenue.toFixed(2)}</div><div class="box-lbl">Total Revenue</div></div>
        <div class="box"><div class="box-val">${r.totalTx}</div><div class="box-lbl">Transactions</div></div>
        <div class="box"><div class="box-val">LKR ${r.cashSales.toFixed(2)}</div><div class="box-lbl">Cash Sales</div></div>
        <div class="box"><div class="box-val">LKR ${r.cardSales.toFixed(2)}</div><div class="box-lbl">Card Sales</div></div>
      </div>
      <table><thead><tr><th>Bill #</th><th>Customer</th><th>Payment</th><th>Amount</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Cafe 69 POS System · Cashier Session Close Report · Confidential</div>
      </body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', height: 'calc(100vh - 120px)' }}>
      {/* Left – Products */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <input ref={searchRef} className="input" style={{ flex: '1 1 200px' }} placeholder="🔍 Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ flex: '0 0 160px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={closeSession} title="Close current session and generate report">🔒 Close Session</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '.75rem' }}>
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.quantity <= 0}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', textAlign: 'left', cursor: p.quantity <= 0 ? 'not-allowed' : 'pointer', opacity: p.quantity <= 0 ? 0.4 : 1, transition: 'all 0.15s' }}
                onMouseEnter={e => { if (p.quantity > 0) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '.4rem' }}>🍽️</div>
                <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text-primary)', marginBottom: '.2rem' }}>{p.name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.4rem' }}>{p.category_name}</div>
                <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--accent)' }}>LKR {p.selling_price.toFixed(2)}</div>
                <div style={{ fontSize: '.7rem', color: p.quantity <= 5 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '.2rem' }}>
                  Stock: {p.quantity} {p.unit}
                </div>
              </button>
            ))}
            {!products.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No products found</div>}
          </div>
        </div>
      </div>

      {/* Right – Cart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', overflow: 'hidden' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>🛒 Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)</h2>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!cart.length && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '.875rem' }}>Add items to start</div>}
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem 0', borderBottom: '1px solid rgba(42,42,58,.5)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--accent)' }}>LKR {item.product.selling_price.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <button onClick={() => updateQty(item.product.id, item.quantity - 1)} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)', width: 24, height: 24, borderRadius: '4px', cursor: 'pointer', fontSize: '.9rem' }}>−</button>
                <span style={{ fontSize: '.8rem', fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => updateQty(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.quantity} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)', width: 24, height: 24, borderRadius: '4px', cursor: 'pointer', fontSize: '.9rem' }}>+</button>
              </div>
              <div style={{ fontSize: '.8rem', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>LKR {(item.product.selling_price * item.quantity).toFixed(2)}</div>
              <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '.9rem' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <input className="input" style={{ fontSize: '.8rem' }} placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={() => setPayment('cash')} className={`btn btn-sm ${payment === 'cash' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>💵 Cash</button>
            <button onClick={() => setPayment('card')} className={`btn btn-sm ${payment === 'card' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>💳 Card</button>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input className="input" style={{ fontSize: '.8rem' }} placeholder="Discount (LKR)" value={discount} onChange={e => setDiscount(e.target.value)} />
            {payment === 'cash' && <input className="input" style={{ fontSize: '.8rem' }} placeholder="Cash given" value={cashGiven} onChange={e => setCashGiven(e.target.value)} />}
          </div>
          <input className="input" style={{ fontSize: '.8rem' }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '.75rem', fontSize: '.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>Subtotal</span><span>LKR {subtotal.toFixed(2)}</span></div>
            {discountAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}><span>Discount</span><span>− LKR {discountAmt.toFixed(2)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', marginTop: '.4rem' }}><span>TOTAL</span><span>LKR {total.toFixed(2)}</span></div>
            {payment === 'cash' && parseFloat(cashGiven) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', marginTop: '.3rem' }}><span>Change</span><span>LKR {change.toFixed(2)}</span></div>}
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: '.8rem', background: 'rgba(239,68,68,.1)', padding: '.5rem .75rem', borderRadius: '8px' }}>{error}</div>}

          <button onClick={checkout} disabled={submitting || !cart.length} className="btn btn-success" style={{ width: '100%', justifyContent: 'center', padding: '.75rem', fontSize: '.95rem', fontWeight: 700 }}>
            {submitting ? '⏳ Processing…' : `✅ Checkout — LKR ${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Bill Receipt Modal */}
      {lastBill && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>✅</div>
              <h2 style={{ fontWeight: 700, marginTop: '.5rem' }}>Payment Successful!</h2>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Bill #{lastBill.id} · {lastBill.session_type} session</div>
            </div>
            {lastBill.customer_name && <div style={{ textAlign: 'center', fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: '.75rem' }}>Customer: {lastBill.customer_name}</div>}
            <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '.75rem 0', margin: '.75rem 0' }}>
              {lastBill.items?.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', padding: '.2rem 0' }}>
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>LKR {item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {lastBill.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--danger)', marginBottom: '.3rem' }}><span>Discount</span><span>− LKR {lastBill.discount_amount.toFixed(2)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)', marginBottom: '.5rem' }}><span>Total</span><span>LKR {lastBill.total_amount.toFixed(2)}</span></div>
            {lastBill.change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: 'var(--success)', marginBottom: '1rem', fontWeight: 600 }}><span>Change</span><span>LKR {lastBill.change.toFixed(2)}</span></div>}
            <div style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Thank you! Visit again ☕</div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => printBill(lastBill)}>🖨️ Print</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setLastBill(null)}>New Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* Session Report Modal */}
      {sessionReport && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 620, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontWeight: 700 }}>🔒 Session Close Report</h2>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                  {sessionReport.sessionType === 'lunch' ? '🌅 Lunch' : '🌙 Night'} Session · {sessionReport.date}
                </div>
              </div>
              <span className={`badge badge-${sessionReport.sessionType}`}>{sessionReport.sessionType}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Total Revenue', value: `LKR ${sessionReport.totalRevenue.toFixed(2)}`, color: 'var(--success)' },
                { label: 'Transactions', value: sessionReport.totalTx, color: 'var(--accent)' },
                { label: 'Cash Sales', value: `LKR ${sessionReport.cashSales.toFixed(2)}`, color: 'var(--info)' },
                { label: 'Card Sales', value: `LKR ${sessionReport.cardSales.toFixed(2)}`, color: 'var(--night)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {sessionReport.sales.length > 0 && (
              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead><tr><th>#</th><th>Customer</th><th>Payment</th><th>Amount</th><th>Time</th></tr></thead>
                  <tbody>
                    {sessionReport.sales.map((s: any) => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                        <td>{s.customer_name || '—'}</td>
                        <td><span className={`badge badge-${s.payment_method === 'cash' ? 'active' : 'pending'}`}>{s.payment_method}</span></td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>LKR {s.total_amount.toFixed(2)}</td>
                        <td style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{(s.created_at || '').slice(11, 16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!sessionReport.sales.length && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No sales in this session</div>}

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSessionReport(null)}>Close</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => printSessionReport(sessionReport)}>🖨️ Print Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
