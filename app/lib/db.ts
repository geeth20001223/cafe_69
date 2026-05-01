import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'cafe69.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','inventory_manager','cashier','finance_manager')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      low_stock_threshold REAL DEFAULT 10,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      alert_type TEXT DEFAULT 'low_stock',
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER REFERENCES users(id),
      session_type TEXT NOT NULL CHECK(session_type IN ('lunch','night')),
      total_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','card')),
      customer_name TEXT,
      customer_phone TEXT,
      notes TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manager_id INTEGER REFERENCES users(id),
      title TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      items_json TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manager_id INTEGER REFERENCES users(id),
      report_date TEXT NOT NULL,
      report_type TEXT DEFAULT 'daily',
      title TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      total_sales REAL DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      data_json TEXT NOT NULL,
      sent_to_finance INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate stock_alerts to support restock workflow
  const migrateCol = (sql: string) => { try { db.exec(sql); } catch { /* already exists */ } };
  migrateCol(`ALTER TABLE stock_alerts ADD COLUMN status TEXT DEFAULT 'pending'`);
  migrateCol(`ALTER TABLE stock_alerts ADD COLUMN requested_qty REAL`);
  migrateCol(`ALTER TABLE stock_alerts ADD COLUMN requested_by INTEGER`);
  migrateCol(`ALTER TABLE stock_alerts ADD COLUMN approved_by INTEGER`);
  migrateCol(`ALTER TABLE stock_alerts ADD COLUMN approved_at TEXT`);

  // Seed default admin
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run('System Admin', 'admin@cafe69.lk', hash, 'admin');
  }

  // Seed default categories
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (catCount === 0) {
    const cats = ['Beverages', 'Food', 'Desserts', 'Snacks', 'Specials'];
    for (const cat of cats) {
      db.prepare('INSERT INTO categories (name) VALUES (?)').run(cat);
    }
  }
}
