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
    <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{time}</div>
      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{date}</div>
      <div style={{ fontSize: '.7rem', color: sessionColor, fontWeight: 600, marginTop: '.1rem' }}>{session}</div>
    </div>
  );
}
