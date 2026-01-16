import snmp from 'net-snmp';

const ip = '192.168.20.6'; // User provided IP
console.log(`Checking ${ip}...`);

const session = snmp.createSession(ip, 'public', {
    timeout: 3000,
    retries: 1,
    transport: 'udp4'
});

// Try subtree on just the Level column
const OID_LEVEL = '1.3.6.1.2.1.43.11.1.1.9';
const OID_DESC = '1.3.6.1.2.1.43.11.1.1.6';

console.log('Walking descs...');
session.subtree(OID_DESC, 20, (varbinds) => {
    for (const vb of varbinds) console.log(vb.oid + ' = ' + vb.value);
}, (err) => {
    if (err) console.error(err);
    console.log('---');
    session.subtree(OID_LEVEL, 20, (varbinds) => {
        for (const vb of varbinds) console.log(vb.oid + ' = ' + vb.value);
    }, (err) => {
        session.close();
    });
});
