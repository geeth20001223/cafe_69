'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      const role = data.user.role;
      const routes: Record<string, string> = {
        admin: '/dashboard/admin',
        inventory_manager: '/dashboard/inventory',
        cashier: '/dashboard/cashier',
        finance_manager: '/dashboard/finance',
      };
      router.push(routes[role] || '/dashboard/admin');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: 'var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem' }}>☕</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Cafe 69</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '.25rem', fontSize: '.9rem' }}>POS Management System</p>
        </div>

        <div className="card" style={{ borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Sign in to your account</h2>

          {error && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171', borderRadius: '8px', padding: '.75rem 1rem', marginBottom: '1rem', fontSize: '.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '.4rem' }}>Email Address</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@cafe69.lk" required />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '.4rem' }}>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '.75rem', fontSize: '1rem' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '.8rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '.5rem', fontWeight: 600 }}>Default Admin</p>
            <p style={{ color: 'var(--text-secondary)' }}>📧 admin@cafe69.lk</p>
            <p style={{ color: 'var(--text-secondary)' }}>🔑 admin123</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.75rem', marginTop: '1.5rem' }}>
          Sri Lanka Time (UTC+5:30) · Cafe 69 © 2024
        </p>
      </div>
    </div>
  );
}
