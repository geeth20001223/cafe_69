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
            {/* Optional title or breadcrumbs */}
          </div>

          <div className="header-center">
            {/* Can be used for central info if needed */}
          </div>

          <div className="header-right">
            <div className="clock-container">
              <div className="hud-bracket top-right"></div>
              <div className="hud-bracket bottom-right"></div>
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
