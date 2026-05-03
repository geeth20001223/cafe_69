const { getDb } = require('./app/lib/db');
const path = require('path');

async function test() {
  process.env.TURSO_DATABASE_URL = `file:${path.join(process.cwd(), 'cafe69.db')}`;
  const db = getDb();
  const res = await db.execute("SELECT customer_name, customer_phone FROM sales LIMIT 10");
  console.log(JSON.stringify(res.rows, null, 2));
}

test();
