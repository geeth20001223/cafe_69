import { createClient, type Client } from '@libsql/client';
import path from 'path';
import bcrypt from 'bcryptjs';

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'cafe69.db')}`;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient({ url, authToken });
  }
  return client;
}

export async function initSchema() {
  const db = getDb();
  
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','inventory_manager','cashier','finance_manager')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS products (
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
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes')),
      updated_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      alert_type TEXT DEFAULT 'low_stock',
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS sales (
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
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manager_id INTEGER REFERENCES users(id),
      title TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      items_json TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manager_id INTEGER REFERENCES users(id),
      report_date TEXT NOT NULL,
      report_type TEXT DEFAULT 'daily',
      title TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS session_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      total_sales REAL DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      data_json TEXT NOT NULL,
      sent_to_finance INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    `CREATE TABLE IF NOT EXISTS system_sync (
      id INTEGER PRIMARY KEY,
      version INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now', '+5 hours', '30 minutes'))
    )`,
    "INSERT OR IGNORE INTO system_sync (id, version) VALUES (1, 0)"
  ], "write");

  // Migrate columns
  const migrateCol = async (sql: string) => { try { await db.execute(sql); } catch { /* exists */ } };
  await migrateCol(`ALTER TABLE stock_alerts ADD COLUMN status TEXT DEFAULT 'pending'`);
  await migrateCol(`ALTER TABLE stock_alerts ADD COLUMN requested_qty REAL`);
  await migrateCol(`ALTER TABLE stock_alerts ADD COLUMN requested_by INTEGER`);
  await migrateCol(`ALTER TABLE stock_alerts ADD COLUMN approved_by INTEGER`);
  await migrateCol(`ALTER TABLE stock_alerts ADD COLUMN approved_at TEXT`);
  await migrateCol(`ALTER TABLE quotations ADD COLUMN approval_notes TEXT`);
  await migrateCol(`ALTER TABLE quotations ADD COLUMN is_read INTEGER DEFAULT 0`);

  // Seed Admin
  const adminRes = await db.execute({ sql: "SELECT id FROM users WHERE role = 'admin' LIMIT 1", args: [] });
  if (adminRes.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute({
      sql: "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      args: ['System Admin', 'admin@cafe69.lk', hash, 'admin']
    });
  }

  // Seed Categories
  const catRes = await db.execute("SELECT COUNT(*) as c FROM categories");
  if (Number(catRes.rows[0].c) === 0) {
    const cats = ['Beverages', 'Food', 'Desserts', 'Snacks', 'Specials'];
    for (const cat of cats) {
      await db.execute({ sql: "INSERT INTO categories (name) VALUES (?)", args: [cat] });
    }
  }
}

export async function touchSync() {
  const db = getDb();
  await db.execute("UPDATE system_sync SET version = version + 1, updated_at = datetime('now', '+5 hours', '30 minutes') WHERE id = 1");
}

