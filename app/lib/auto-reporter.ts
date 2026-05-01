import { getDb } from './db';
import { getCurrentSession, getSLTime } from './session';
import { transporter } from './mailer';

/**
 * Checks if the previous session was reported.
 * If not, generates and sends both Sales and Inventory reports.
 * This is designed to be called at the start of a new session or periodically.
 */
export async function checkAndAutoReport() {
  const now = getSLTime();
  const currentSession = getCurrentSession();
  const today = now.toISOString().split('T')[0];
  
  const db = getDb();
  
  // Find the last session report
  const lastReport = db.prepare('SELECT * FROM session_reports ORDER BY id DESC LIMIT 1').get() as any;
  
  if (!lastReport) return; // No reports yet

  // Logic: Check if the last record in session_reports is for the previous session
  // Example: If it's now 'lunch' (7am-4pm), the last report should be 'night' from yesterday/today
  const expectedLastSession = currentSession === 'lunch' ? 'night' : 'lunch';
  
  const lastSessionReport = db.prepare(`
    SELECT * FROM session_reports 
    WHERE session_type = ? 
    ORDER BY created_at DESC LIMIT 1
  `).get(expectedLastSession) as any;

  if (!lastSessionReport) {
    // If we've never reported this session type, we might want to skip or force it
    return;
  }

  const lastDate = lastSessionReport.created_at.split(' ')[0];
  const isDifferentDay = today !== lastDate;

  // If we are in Lunch and the last Night report is NOT from the "current" night cycle
  if (currentSession === 'lunch' && isDifferentDay) {
     console.log(`[AutoReporter] Night session (${lastDate}) auto-close triggered.`);
     await triggerCombinedReport('night', lastDate);
  } 
  // If we are in Night and the last Lunch report is from yesterday (meaning today's lunch was skipped)
  else if (currentSession === 'night' && isDifferentDay) {
     console.log(`[AutoReporter] Lunch session (${today}) auto-close triggered.`);
     await triggerCombinedReport('lunch', today);
  }
}

/**
 * Triggers both Sales and Inventory reports for a specific session/date
 */
export async function triggerCombinedReport(sessionType: string, date: string, triggeredBy: string = 'System') {
  try {
    // 1. Sales Report
    const salesRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/session-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
      body: JSON.stringify({
        sessionType,
        date,
        isAuto: true,
        triggeredBy
      })
    });

    // 2. Inventory Report
    const invRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
      body: JSON.stringify({
        title: `Auto Inventory Report (${sessionType} session) - ${date}`,
        report_date: date,
        isAuto: true,
        triggeredBy
      })
    });

    console.log(`[AutoReporter] Reports triggered for ${sessionType} ${date}: Sales(${salesRes.status}), Inventory(${invRes.status})`);
  } catch (err) {
    console.error('[AutoReporter] Failed to trigger reports:', err);
  }
}
