import snmp from 'net-snmp';

// Test Ricoh-specific OIDs
const ip = '192.168.20.17'; // Ricoh MP 2014ad
console.log(`Testing Ricoh MP 2014ad at ${ip} with various OIDs...\n`);

const session = snmp.createSession(ip, 'public', {
    timeout: 5000,
    retries: 2,
    transport: 'udp4'
});

// Common Ricoh-specific OIDs to try
const testOIDs = [
    // Standard Printer MIB
    { name: 'prtMarkerSuppliesLevel', oid: '1.3.6.1.2.1.43.11.1.1.9.1.1' },
    { name: 'prtMarkerSuppliesMaxCapacity', oid: '1.3.6.1.2.1.43.11.1.1.8.1.1' },
    { name: 'prtMarkerSuppliesDescription', oid: '1.3.6.1.2.1.43.11.1.1.6.1.1' },
    { name: 'prtMarkerSuppliesType', oid: '1.3.6.1.2.1.43.11.1.1.4.1.1' },
    { name: 'prtMarkerSuppliesClass', oid: '1.3.6.1.2.1.43.11.1.1.3.1.1' },

    // Try walking entire supplies table
    { name: 'prtMarkerSuppliesTable (walk)', oid: '1.3.6.1.2.1.43.11.1.1', walk: true },

    // Ricoh enterprise OID (if exists)
    { name: 'Ricoh Enterprise Base', oid: '1.3.6.1.4.1.367', walk: true },
];

async function testOID(name, oid, walk = false) {
    return new Promise((resolve) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${name}`);
        console.log(`OID: ${oid}`);
        console.log('='.repeat(60));

        if (walk) {
            session.subtree(oid, 10, (varbinds) => {
                for (const vb of varbinds) {
                    if (snmp.isVarbindError(vb)) {
                        console.log(`  ${vb.oid} = ERROR: ${snmp.varbindError(vb)}`);
                    } else {
                        let value = vb.value;
                        if (Buffer.isBuffer(value)) {
                            value = value.toString();
                        }
                        console.log(`  ${vb.oid} = ${value}`);
                    }
                }
            }, (err) => {
                if (err) {
                    console.error(`❌ Walk failed: ${err.message}`);
                } else {
                    console.log(`✅ Walk completed`);
                }
                resolve();
            });
        } else {
            session.get([oid], (error, varbinds) => {
                if (error) {
                    console.error(`❌ Failed: ${error.message}`);
                    resolve();
                    return;
                }

                for (const vb of varbinds) {
                    if (snmp.isVarbindError(vb)) {
                        console.log(`❌ Error: ${snmp.varbindError(vb)}`);
                    } else {
                        let value = vb.value;
                        if (Buffer.isBuffer(value)) {
                            value = value.toString();
                        }
                        console.log(`✅ Value: ${value}`);
                    }
                }
                resolve();
            });
        }
    });
}

(async () => {
    for (const test of testOIDs) {
        await testOID(test.name, test.oid, test.walk);
    }

    session.close();
    console.log('\n✅ All tests complete');
})();
