import { createClient } from '@libsql/client';
import path from 'path';

async function checkTime() {
  const client = createClient({ url: `file:${path.join(process.cwd(), 'cafe69.db')}` });
  const res = await client.execute("SELECT datetime('now') as utc, datetime('now', '+5 hours', '30 minutes') as slt, DATE(datetime('now', '+5 hours', '30 minutes')) as slt_date");
  console.log(JSON.stringify(res.rows[0], null, 2));
}

checkTime();
