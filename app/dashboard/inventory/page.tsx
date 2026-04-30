import { getSession } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';
import { redirect } from 'next/navigation';

export default async function InventoryDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['admin', 'inventory_manager'].includes(session.role)) redirect('/login');

  const db = getDb();
  const totalProducts = db.prepare("SELECT COUNT(*) as c FROM products WHERE status='active'").get() as any;
  const lowStock = db.prepare("SELECT COUNT(*) as c FROM products WHERE quantity<=low_stock_threshold AND status='active'").get() as any;
  const totalCats = db.prepare("SELECT COUNT(*) as c FROM categories WHERE status='active'").get() as any;
  const alerts = db.prepare('SELECT COUNT(*) as c FROM stock_alerts WHERE is_read=0').get() as any;
  const totalValue = db.prepare("SELECT SUM(cost_price*quantity) as v FROM products WHERE status='active'").get() as any;
  const recentAlerts = db.prepare(`
    SELECT sa.*, p.name as product_name, p.quantity, p.unit FROM stock_alerts sa
    LEFT JOIN products p ON sa.product_id=p.id WHERE sa.is_read=0 ORDER BY sa.created_at DESC LIMIT 5
  `).all() as any[];

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Inventory Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Active Products', value: totalProducts?.c || 0, icon: '🍽️', color: '#3b82f6' },
          { label: 'Categories', value: totalCats?.c || 0, icon: '🏷️', color: '#8b5cf6' },
          { label: 'Low Stock Items', value: lowStock?.c || 0, icon: '⚠️', color: '#ef4444' },
          { label: 'Unread Alerts', value: alerts?.c || 0, icon: '🔔', color: '#f59e0b' },
          { label: 'Inventory Value', value: `LKR ${(totalValue?.v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, icon: '💎', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginTop: '.1rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {recentAlerts.length > 0 && (
        <div className="card">
          <h2 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--danger)' }}>🔔 Recent Stock Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {recentAlerts.map(a => (
              <div key={a.id} style={{ padding: '.75rem 1rem', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', fontSize: '.875rem' }}>
                <span style={{ fontWeight: 600 }}>{a.product_name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '.5rem' }}>— {a.quantity} {a.unit} remaining</span>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{a.created_at?.slice(0, 16)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
