import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { getSessionFromRequest } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'finance_manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  
  // Get unique customers (name + phone) from sales table
  // We prioritize entries that have at least a phone number
  const query = `
    SELECT 
      customer_name, 
      customer_phone, 
      MAX(created_at) as last_visit,
      COUNT(id) as total_bills,
      SUM(total_amount) as total_spent
    FROM sales 
    WHERE customer_phone IS NOT NULL AND customer_phone != ''
    GROUP BY customer_phone
    ORDER BY last_visit DESC
  `;

  try {
    const result = await db.execute(query);
    return NextResponse.json({ customers: result.rows });
  } catch (error: any) {
    console.error('[Customers API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
