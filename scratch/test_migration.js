const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'cafe69.db'));

const row = db.prepare("SELECT created_at, datetime(created_at, 'localtime') as local FROM quotations LIMIT 1").get();
console.log('Original:', row.created_at);
console.log('Converted:', row.local);
