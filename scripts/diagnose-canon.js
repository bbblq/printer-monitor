const snmp = require('net-snmp');

const target = '192.168.20.44';
const community = 'public';
const session = snmp.createSession(target, community, { timeout: 3000, retries: 1 });

console.log('Checking Canon Enterprise OID tree...');

session.subtree('1.3.6.1.4.1.1602', 10, (varbinds) => {
    varbinds.forEach(vb => {
        console.log(`${vb.oid} -> ${vb.value}`);
    });
}, (err) => {
    if (err) console.log('Walk finished/error:', err.message);
    else console.log('Walk finished.');
    session.close();
});
