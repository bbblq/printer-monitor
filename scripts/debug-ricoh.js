const snmp = require('net-snmp');

// Target the Ricoh MP 2014ad
const ip = '192.168.20.17';
const session = snmp.createSession(ip, 'public', {
    timeout: 5000,
    retries: 1
});

console.log(`Checking connection to ${ip}...`);

const OIDS = {
    sysDescr: '1.3.6.1.2.1.1.1.0',
    prtMarkerSupplies: '1.3.6.1.2.1.43.11.1.1'
};

session.get([OIDS.sysDescr], (error, varbinds) => {
    if (error) {
        console.error('Basic connection failed:', error.toString());
    } else {
        console.log('Online check passed. SysDescr:', varbinds[0].value.toString());

        console.log('Walking supplies table...');
        session.subtree(OIDS.prtMarkerSupplies, (varbinds) => {
            for (const vb of varbinds)
                console.log(vb.oid + ' = ' + vb.value);
        }, (err) => {
            if (err) console.error('Walk failed:', err.toString());
            else console.log('Walk done.');
            session.close();
        });
    }
});
