import Database from 'better-sqlite3';

const db = new Database('printers.db');

console.log('All printers in database:\n');
const printers = db.prepare('SELECT id, name, model, ip, location FROM printers').all();

for (const p of printers) {
    console.log(`ID: ${p.id}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  Model: ${p.model}`);
    console.log(`  IP: ${p.ip}`);
    console.log(`  Location: ${p.location}`);
    console.log('');
}

db.close();
