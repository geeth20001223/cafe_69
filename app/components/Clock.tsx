'use client';
import { useState, useEffect } from 'react';
import { getSLTime, formatSLTime, formatSLDate, getCurrentSession, getSessionLabel } from '@/app/lib/session';

export default function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [session, setSession] = useState('');

  useEffect(() => {
    function tick() {
      const now = getSLTime();
      setTime(formatSLTime(now));
      setDate(formatSLDate(now));
      setSession(getSessionLabel(getCurrentSession()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const sessionColor = session.includes('Lunch') ? 'var(--lunch)' : session.includes('Night') ? 'var(--night)' : 'var(--text-muted)';

  return (
    <div style={{ textAlign: 'right', lineHeight: 1.1, minWidth: '180px', zIndex: 30 }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '1px' }}>{time}</div>
      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{date}</div>
      <div style={{ 
        fontSize: '.65rem', 
        color: sessionColor, 
        fontWeight: 700, 
        marginTop: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        gap: '6px',
        textTransform: 'uppercase'
      }}>
         <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: sessionColor, boxShadow: `0 0 5px ${sessionColor}` }}></span>
         {session}
         <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: sessionColor, boxShadow: `0 0 5px ${sessionColor}` }}></span>
      </div>
    </div>
  );
}
