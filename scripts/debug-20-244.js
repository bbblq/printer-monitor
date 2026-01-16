const snmp = require('net-snmp');

const ip = '192.168.20.244';
const session = snmp.createSession(ip, 'public', {
    timeout: 5000,
    retries: 1
});

console.log(`Checking connection to ${ip}...`);

const OIDS = {
    sysDescr: '1.3.6.1.2.1.1.1.0',
    hrDeviceStatus: '1.3.6.1.2.1.25.3.2.1.5.1',
    prtMarkerSupplies: '1.3.6.1.2.1.43.11.1.1'
};

// 1. Check basic connectivity
session.get([OIDS.sysDescr], (error, varbinds) => {
    if (error) {
        console.error('Basic connection failed:', error.toString());
    } else {
        console.log('Online check passed. SysDescr:', varbinds[0].value.toString());

        // 2. Walk supplies table
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
