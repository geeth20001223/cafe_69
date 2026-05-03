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
      customer_phone,
      MAX(customer_name) as customer_name, 
      MAX(created_at) as last_visit,
      COUNT(*) as total_bills,
      SUM(total_amount) as total_spent
    FROM sales 
    WHERE customer_phone IS NOT NULL AND length(customer_phone) > 2
    GROUP BY customer_phone
    ORDER BY last_visit DESC
  `;

  try {
    const result = await db.execute({ sql: query, args: [] });
    const customers = result.rows.map(row => ({
      customer_name: row.customer_name || 'Customer',
      customer_phone: row.customer_phone,
      last_visit: row.last_visit,
      total_bills: Number(row.total_bills || 0),
      total_spent: Number(row.total_spent || 0)
    }));
    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error('[Customers API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
