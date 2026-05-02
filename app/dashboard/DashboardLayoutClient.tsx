'use client';
import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import Clock from '@/app/components/Clock';

interface Props {
  children: React.ReactNode;
  session: {
    role: string;
    name: string;
    urlKey?: string;
  };
}

export default function DashboardLayoutClient({ children, session }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard-container">
      <div className="lightning-shield"></div>
      <div className="lightning-strike-layer"></div>
      
      {/* Sidebar Container */}
      <div className={`sidebar-wrapper ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar 
          role={session.role} 
          name={session.name} 
          urlKey={session.urlKey} 
          onClose={() => setMobileOpen(false)} 
        />
      </div>
      
      {/* Mobile Overlay */}
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)}></div>}

      <div className="main-viewport">
        {/* Top bar */}
        <header className="dashboard-header">
          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-toggle" onClick={() => setMobileOpen(true)}>
            ☰
          </button>

          {/* INTEGRATED SCANNER */}
          <div className="header-scanner-container">
            <div className="scanner-line red"></div>
            <div className="scanner-line blue"></div>
          </div>

          <div className="header-left">
          </div>

          <div style={{ flex: 1 }}></div>

          <div className="header-right">
            <div style={{ position: 'relative' }}>
              <div className="hud-bracket top-right" style={{ right: '-8px', top: '-4px', width: '8px', height: '8px' }}></div>
              <div className="hud-bracket bottom-right" style={{ right: '-8px', bottom: '-4px', width: '8px', height: '8px' }}></div>
              <Clock />
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}
