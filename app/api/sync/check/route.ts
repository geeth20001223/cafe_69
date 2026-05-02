import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';

export async function GET() {
  const db = getDb();
  const res = await db.execute('SELECT version FROM system_sync WHERE id = 1');
  const row = res.rows[0] as unknown as { version: number };
  return NextResponse.json({ version: row?.version || 0 });
}
