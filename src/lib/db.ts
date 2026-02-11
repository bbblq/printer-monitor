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


`);

// 添加is_binary字段（如果不存在）
try {
  db.exec(`ALTER TABLE supplies_current ADD COLUMN is_binary INTEGER DEFAULT 0`);
} catch (e) {
  // 字段已存在，忽略错误
}

try {
  db.exec(`ALTER TABLE supplies_history ADD COLUMN is_binary INTEGER DEFAULT 0`);
} catch (e) {
  // 字段已存在，忽略错误
}

// 添加replaced_at字段（实际换墨日期，与recorded_at记录添加时间分离）
try {
  db.exec(`ALTER TABLE supplies_history ADD COLUMN replaced_at DATETIME`);
  // 迁移：已有数据的replaced_at用recorded_at填充
  db.exec(`UPDATE supplies_history SET replaced_at = recorded_at WHERE replaced_at IS NULL`);
} catch (e) {
  // 字段已存在，忽略错误
}


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
