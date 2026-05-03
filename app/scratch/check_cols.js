const { getDb } = require('./app/lib/db');
const path = require('path');

async function test() {
  process.env.TURSO_DATABASE_URL = `file:${path.join(process.cwd(), 'cafe69.db')}`;
  const db = getDb();
  const res = await db.execute("PRAGMA table_info(sales)");
  console.log(JSON.stringify(res.rows, null, 2));
}

test();
