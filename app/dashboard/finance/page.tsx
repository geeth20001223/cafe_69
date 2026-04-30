import { getSession } from '@/app/lib/auth';
import { getDb } from '@/app/lib/db';
import { redirect } from 'next/navigation';

export default async function FinanceDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['admin', 'finance_manager'].includes(session.role)) redirect('/login');

  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const todayRevenue = db.prepare('SELECT SUM(total_amount) as t, COUNT(*) as c FROM sales WHERE DATE(created_at)=?').get(today) as any;
  const monthRevenue = db.prepare(`SELECT SUM(total_amount) as t FROM sales WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')`).get() as any;
  const pendingQuotes = db.prepare("SELECT COUNT(*) as c FROM quotations WHERE status='pending'").get() as any;
  const sessionReports = db.prepare('SELECT COUNT(*) as c FROM session_reports WHERE sent_to_finance=1').get() as any;

  const bySess = db.prepare(`
    SELECT session_type, SUM(total_amount) as t, COUNT(*) as c
    FROM sales WHERE DATE(created_at)=? GROUP BY session_type
  `).all(today) as any[];

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>💰 Finance Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Today's Revenue", value: `LKR ${(todayRevenue?.t || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, sub: `${todayRevenue?.c || 0} transactions`, icon: '💵', color: '#22c55e' },
          { label: 'Month Revenue', value: `LKR ${(monthRevenue?.t || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, sub: 'Current month', icon: '📈', color: '#3b82f6' },
          { label: 'Pending Quotations', value: pendingQuotes?.c || 0, sub: 'Awaiting approval', icon: '📋', color: '#f59e0b' },
          { label: 'Session Reports', value: sessionReports?.c || 0, sub: 'Received', icon: '📊', color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '.1rem' }}>{s.label}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {bySess.length > 0 && (
        <div className="card">
          <h2 style={{ fontWeight: 600, marginBottom: '1rem' }}>Today by Session</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem' }}>
            {bySess.map(s => (
              <div key={s.session_type} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ marginBottom: '.5rem' }}><span className={`badge badge-${s.session_type}`}>{s.session_type === 'lunch' ? '🌅 Lunch' : '🌙 Night'}</span></div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>LKR {s.t.toFixed(2)}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{s.c} transactions</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
