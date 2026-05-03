const { getDb } = require('./app/lib/db');
const path = require('path');

async function test() {
  process.env.TURSO_DATABASE_URL = `file:${path.join(process.cwd(), 'cafe69.db')}`;
  const db = getDb();
  try {
    const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='parked_bills'");
    console.log('Table exists:', res.rows.length > 0);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
