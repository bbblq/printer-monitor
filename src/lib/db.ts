import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'printers.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    brand TEXT,
    model TEXT,
    ip TEXT UNIQUE,
    location TEXT,
    display_order INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS supplies_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    printer_id INTEGER,
    color TEXT,
    level INTEGER,
    max_capacity INTEGER,
    source TEXT DEFAULT 'auto',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(printer_id) REFERENCES printers(id)
  );

  CREATE TABLE IF NOT EXISTS printer_status (
    printer_id INTEGER PRIMARY KEY,
    status TEXT,
    is_online INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(printer_id) REFERENCES printers(id)
  );
  
  CREATE TABLE IF NOT EXISTS supplies_current (
      printer_id INTEGER,
      color TEXT,
      level INTEGER,
      max_capacity INTEGER,
      FOREIGN KEY(printer_id) REFERENCES printers(id),
      UNIQUE(printer_id, color)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add display_order column if it doesn't exist
try {
  db.prepare('ALTER TABLE printers ADD COLUMN display_order INTEGER DEFAULT 0').run();
  console.log('[DB] Added display_order column to printers table');
} catch (e) {
  // Column already exists, ignore
}

// Migration: Add source column to supplies_history if it doesn't exist
try {
  db.prepare('ALTER TABLE supplies_history ADD COLUMN source TEXT DEFAULT "auto"').run();
  console.log('[DB] Added source column to supplies_history table');
} catch (e) {
  // Column already exists, ignore
}

// Migration: Add remark column to supplies_history if it doesn't exist
try {
  db.prepare('ALTER TABLE supplies_history ADD COLUMN remark TEXT').run();
  console.log('[DB] Added remark column to supplies_history table');
} catch (e) {
  // Column already exists, ignore
}

// Initial settings seed
const seedSettings = (key: string, value: string) => {
  const exists = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
  if (!exists) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
};

seedSettings('system_title', 'Printer Monitor');
seedSettings('system_logo', '');
seedSettings('refresh_interval', '15'); // default 15 minutes as requested
seedSettings('admin_password', 'admin');

export default db;
