const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'cafe69.db'));

const tables = [
  { name: 'quotations', cols: ['created_at', 'approved_at'] },
  { name: 'stock_alerts', cols: ['created_at', 'approved_at'] },
  { name: 'sales', cols: ['created_at'] },
  { name: 'inventory_reports', cols: ['created_at'] },
  { name: 'session_reports', cols: ['created_at'] },
  { name: 'products', cols: ['created_at', 'updated_at'] },
  { name: 'users', cols: ['created_at'] },
  { name: 'categories', cols: ['created_at'] }
];

db.transaction(() => {
  for (const table of tables) {
    for (const col of table.cols) {
      // Only update if it looks like a UTC timestamp (e.g. created recently and clearly behind)
      // Or just update all that haven't been shifted yet.
      // A simple heuristic: if it's before today's local time start, it might be UTC.
      // Actually, safest is to check if it's already in the future relative to UTC.
      // But we know the database was using UTC until now.
      
      console.log(`Migrating ${table.name}.${col}...`);
      db.prepare(`
        UPDATE ${table.name} 
        SET ${col} = datetime(${col}, 'localtime') 
        WHERE ${col} IS NOT NULL AND ${col} NOT LIKE '%+%'
      `).run();
    }
  }
})();

console.log('Migration complete.');
