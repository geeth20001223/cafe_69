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
      <div className="lightning-shield"></div>
      <div className="lightning-strike-layer"></div>
      {/* Top Decoration Bar with Minimalist Scanner */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '32px', background: 'rgba(23, 23, 23, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', zIndex: 100 }}>
         <div style={{ position: 'relative', width: '100%', height: '100%', marginLeft: 0, overflow: 'hidden' }}>
            <div style={{ 
               position: 'absolute', 
               top: '50%', 
               left: 0, 
               width: '300px', 
               height: '1px', 
               background: 'linear-gradient(to right, transparent, rgba(255, 60, 60, 1), transparent)',
               animationName: 'scanner-sweep, strobe-flicker',
               animationDuration: '4s, 1.5s',
               animationIterationCount: 'infinite, infinite',
               animationTimingFunction: 'linear, ease-in-out',
               boxShadow: '0 0 8px rgba(255, 60, 60, 0.4)',
               transform: 'translateY(-50%)'
            }}></div>
            <div style={{ 
               position: 'absolute', 
               top: '50%', 
               left: 0, 
               width: '300px', 
               height: '1px', 
               background: 'linear-gradient(to right, transparent, rgba(0, 191, 255, 1), transparent)',
               animationName: 'scanner-sweep, strobe-flicker',
               animationDuration: '4s, 1.5s',
               animationIterationCount: 'infinite, infinite',
               animationTimingFunction: 'linear, ease-in-out',
               animationDelay: '2s, 2s',
               boxShadow: '0 0 8px rgba(0, 191, 255, 0.4)',
               transform: 'translateY(-50%)'
            }}></div>
         </div>
      </div>
      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: 52, height: 52, background: 'var(--accent)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.5rem' }}>☕</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Cafe 69</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '.15rem', fontSize: '.85rem' }}>POS Management System</p>
        </div>

        <div className="card" style={{ borderRadius: '16px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>Sign in to your account</h2>

          {error && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171', borderRadius: '8px', padding: '.5rem .75rem', marginBottom: '1rem', fontSize: '.8rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div style={{ marginBottom: '.75rem' }}>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>Email Address</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@cafe69.lk" required style={{ padding: '.6rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ padding: '.6rem' }} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '.65rem', fontSize: '.95rem' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', padding: '.75rem', border: '1px dashed var(--border)', borderRadius: '10px', fontSize: '.75rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              🔒 Authorized Personnel Only. <br/>
              Contact management for system credentials.
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.7rem', marginTop: '1.25rem' }}>
          Sri Lanka Time (UTC+5:30) · Cafe 69 © 2024
        </p>
      </div>
    </div>
  );
}
