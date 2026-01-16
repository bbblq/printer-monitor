import snmp from 'net-snmp';

// Test both problematic printers
const printers = [
    { name: 'HP LaserJet MFP M437nda', ip: '192.168.22.252' },
    { name: 'Ricoh MP 2014', ip: '192.168.20.17' }
];

const TABLE_OID_PREFIX = '1.3.6.1.2.1.43.11.1.1';

async function testPrinter(name, ip) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${name} (${ip})`);
    console.log('='.repeat(60));

    return new Promise((resolve) => {
        const session = snmp.createSession(ip, 'public', {
            timeout: 5000,
            retries: 2,
            transport: 'udp4'
        });

        // First check connectivity
        session.get(['1.3.6.1.2.1.1.1.0'], (error, varbinds) => {
            if (error) {
                console.error(`❌ Connection failed: ${error.message}`);
                session.close();
                resolve();
                return;
            }

            console.log(`✅ Online - ${varbinds[0].value.toString().substring(0, 50)}...`);

            // Now walk the supplies table
            const rows = new Map();

            console.log('\n📊 Walking supplies table...');
            session.subtree(TABLE_OID_PREFIX, 20, (varbinds) => {
                for (const vb of varbinds) {
                    if (snmp.isVarbindError(vb)) continue;

                    const oid = vb.oid;
                    if (!oid.startsWith(TABLE_OID_PREFIX)) continue;

                    const parts = oid.split('.');
                    const prefixParts = TABLE_OID_PREFIX.split('.');
                    if (parts.length <= prefixParts.length + 1) continue;

                    const colId = parseInt(parts[prefixParts.length]);
                    const rowIdx = parts.slice(prefixParts.length + 1).join('.');

                    if (!rows.has(rowIdx)) rows.set(rowIdx, {});
                    const row = rows.get(rowIdx);

                    if (colId === 6) { // Description
                        let val = vb.value;
                        if (Buffer.isBuffer(val)) val = val.toString();
                        row.desc = val.toString();
                    } else if (colId === 8) { // Max Capacity
                        row.max = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                    } else if (colId === 9) { // Level
                        row.level = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                    }
                }
            }, (err) => {
                if (err) {
                    console.error(`❌ Subtree error: ${err.message}`);
                }

                console.log(`\n📦 Found ${rows.size} supply entries:\n`);

                for (const [idx, row] of rows.entries()) {
                    console.log(`Row ${idx}:`);
                    console.log(`  Description: ${row.desc || 'N/A'}`);
                    console.log(`  Level: ${row.level ?? 'N/A'}`);
                    console.log(`  Max: ${row.max ?? 'N/A'}`);

                    if (row.desc && row.level != null && row.max != null) {
                        let percent = 0;

                        if (row.level === -3) {
                            percent = 25; // someRemaining
                            console.log(`  Percent: ${percent}% (someRemaining)`);
                        } else if (row.level === -2 || row.max === -2) {
                            percent = 0; // unknown
                            console.log(`  Percent: ${percent}% (unknown)`);
                        } else if (row.max > 0 && row.level >= 0) {
                            percent = Math.round((row.level / row.max) * 100);
                            console.log(`  Percent: ${percent}%`);
                        } else if (row.max <= 0 && row.level > 0 && row.level <= 100) {
                            percent = row.level;
                            console.log(`  Percent: ${percent}% (direct)`);
                        } else {
                            console.log(`  ⚠️  Cannot calculate percent - unusual values`);
                        }
                    } else {
                        console.log(`  ⚠️  Incomplete data`);
                    }
                    console.log('');
                }

                session.close();
                resolve();
            });
        });
    });
}

// Run tests sequentially
(async () => {
    for (const printer of printers) {
        await testPrinter(printer.name, printer.ip);
    }
    console.log('\n✅ All tests complete');
})();
