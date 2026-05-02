import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import Sidebar from '@/app/components/Sidebar';
import Clock from '@/app/components/Clock';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth.v1');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div className="lightning-shield"></div>
      <div className="lightning-strike-layer"></div>
      <Sidebar role={session.role} name={session.name} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          padding: '0',
          borderBottom: '2px solid rgba(255,255,255,0.08)',
          background: 'rgba(13, 13, 13, 0.9)',
          backdropFilter: 'blur(20px)',
          display: 'grid',
          gridTemplateColumns: '260px 1fr 280px',
          height: '68px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
        }}>
          {/* INTEGRATED SCANNER (Full Screen Width) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
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

          <div style={{
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.01)',
            minWidth: '260px'
          }}>
          </div>

          {/* SEGMENT 2: SPACER (Scanner is now absolute) */}
          <div style={{ flex: 1 }}></div>

          <div style={{
            padding: '0 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.01)'
          }}>
            <div style={{ position: 'relative' }}>
              <div className="hud-bracket top-right" style={{ right: '-8px', top: '-4px', width: '8px', height: '8px' }}></div>
              <div className="hud-bracket bottom-right" style={{ right: '-8px', bottom: '-4px', width: '8px', height: '8px' }}></div>
              <Clock />
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
