import Database from 'better-sqlite3';

const db = new Database('printers.db');

console.log('Checking supplies for Ricoh MP 2014ad printers:\n');

const printers = db.prepare(`
    SELECT id, name, ip, location 
    FROM printers 
    WHERE model LIKE '%2014%'
`).all();

for (const printer of printers as any[]) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Printer: ${printer.name} (${printer.location})`);
    console.log(`IP: ${printer.ip}`);
    console.log('='.repeat(60));

    const supplies = db.prepare(`
        SELECT color, level, max_capacity 
        FROM supplies_current 
        WHERE printer_id = ?
    `).all(printer.id);

    console.log(`\nSupplies in database (${supplies.length}):`);
    for (const supply of supplies as any[]) {
        const percent = supply.max_capacity > 0 ? Math.round((supply.level / supply.max_capacity) * 100) : 0;
        console.log(`  - ${supply.color}: ${supply.level}/${supply.max_capacity} (${percent}%)`);
    }
}

db.close();
