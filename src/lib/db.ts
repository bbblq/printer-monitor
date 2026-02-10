import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'printers.db');

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
    if (!dbInstance) {
        dbInstance = new Database(dbPath);
        dbInstance.pragma('journal_mode = WAL');
    }
    return dbInstance;
}

const db = {
    prepare: (sql: string) => getDb().prepare(sql),
    exec: (sql: string) => getDb().exec(sql),
    transaction: (fn: any) => getDb().transaction(fn),
    pragma: (sql: string) => getDb().pragma(sql),
};

db.exec(`
  CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    brand TEXT,
    model TEXT,
    ip TEXT UNIQUE,
    location TEXT,
    display_order INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    consumable_model TEXT
  );

  CREATE TABLE IF NOT EXISTS supplies_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    printer_id INTEGER,
    color TEXT,
    level INTEGER,
    max_capacity INTEGER,
    source TEXT DEFAULT 'auto',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    remark TEXT,
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

  CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    enabled INTEGER DEFAULT 0,
    alert_low_percent INTEGER DEFAULT 10,
    alert_empty INTEGER DEFAULT 1,
    alert_replacement INTEGER DEFAULT 1,
    report_enabled INTEGER DEFAULT 0,
    report_cron TEXT DEFAULT '0 9 * * 1',
    report_recipients TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notification_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_id INTEGER,
    type TEXT,
    title TEXT,
    content TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    error TEXT,
    FOREIGN KEY(setting_id) REFERENCES notification_settings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_noti_history_setting ON notification_history(setting_id);
`);

export default db;

export function seedDefaultSettings() {
  const seedSettings = (key: string, value: string) => {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
  };

  seedSettings('system_title', 'Printer Monitor');
  seedSettings('system_logo', '');
  seedSettings('refresh_interval', '15');
  seedSettings('admin_password', 'admin');
}
