// Sri Lanka Time (UTC+5:30) session logic

export type SessionType = 'lunch' | 'night';

/**
 * Get current session based on Sri Lanka time (UTC+5:30)
 * Lunch: 07:00 - 16:00 (4PM)
 * Night: 16:00 - 00:00 (Midnight)
 * Closed: 00:00 - 07:00
 */
export function getCurrentSession(): SessionType {
  const sltTime = getSLTime();
  const hour = sltTime.getHours();
  const minute = sltTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const lunchStart = 7 * 60;   // 07:00
  const lunchEnd = 16 * 60;    // 16:00
  const nightEnd = 24 * 60;    // 24:00

  if (timeInMinutes >= lunchStart && timeInMinutes < lunchEnd) return 'lunch';
  return 'night'; // night covers 16:00 onwards and early morning (before 07:00)
}

export function getSLTime(): Date {
  const now = new Date();
  // UTC+5:30 offset in ms
  const sltOffset = (5 * 60 + 30) * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + sltOffset);
}

export function formatSLTime(date?: Date): string {
  const d = date || getSLTime();
  return d.toLocaleTimeString('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatSLDate(date?: Date): string {
  const d = date || getSLTime();
  return d.toLocaleDateString('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Colombo',
  });
}

export function getSessionLabel(session: SessionType): string {
  if (session === 'lunch') return '🌅 Lunch Session (7:00 AM – 4:00 PM)';
  return '🌙 Night Session (4:00 PM – 7:00 AM)';
}
