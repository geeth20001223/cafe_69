const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'cafe69.db'));

const result = db.prepare("SELECT datetime('now') as utc, datetime('now', 'localtime') as local").get();
console.log('UTC:', result.utc);
console.log('Local:', result.local);
console.log('System Time:', new Date().toString());
