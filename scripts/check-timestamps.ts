import Database from 'better-sqlite3';

const db = new Database('printers.db');

console.log('Checking timestamp format in database:\n');

const records = db.prepare(`
    SELECT id, color, recorded_at 
    FROM supplies_history 
    ORDER BY recorded_at DESC 
    LIMIT 3
`).all();

for (const record of records as any[]) {
    console.log(`ID: ${record.id}`);
    console.log(`Color: ${record.color}`);
    console.log(`DB Timestamp: ${record.recorded_at}`);

    const date = new Date(record.recorded_at);
    console.log(`Parsed as Date: ${date.toISOString()}`);
    console.log(`UTC: ${date.toUTCString()}`);
    console.log(`Local: ${date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    console.log('---');
}

db.close();
