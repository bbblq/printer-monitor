const snmp = require('net-snmp');

const target = '192.168.20.44';
const community = 'public';

console.log(`Scanning ${target} for SNMP data...`);

const session = snmp.createSession(target, community, {
    timeout: 5000,
    retries: 2,
    transport: 'udp4'
});

const OIDS = {
    sysDescr: '1.3.6.1.2.1.1.1.0',
    hrPrinterDetectedErrorState: '1.3.6.1.2.1.25.3.5.1.1',
    prtMarkerSuppliesTable: '1.3.6.1.2.1.43.11.1.1'
};

/* check sysDescr first */
session.get([OIDS.sysDescr], (err, varbinds) => {
    if (err) {
        console.error('Error fetching sysDescr:', err);
    } else {
        console.log('sysDescr:', varbinds[0].value.toString());
    }

    /* check ErrorState independently */
    session.get([OIDS.hrPrinterDetectedErrorState], (err, varbinds) => {
        if (err) {
            console.error('Error fetching hrPrinterDetectedErrorState:', err.name, err.message);
        } else {
            console.log('hrPrinterDetectedErrorState:', varbinds[0].value);
        }

        /* Walk supplies */
        session.subtree(OIDS.prtMarkerSuppliesTable, 20, (varbinds) => {
            varbinds.forEach(vb => {
                let val = vb.value;
                if (Buffer.isBuffer(val)) val = val.toString();
                // Check if it looks like a number but is a buffer
                console.log(`[Supplies] ${vb.oid} -> ${val}`);
            });
        }, (err) => {
            if (err) console.error('Subtree error:', err);
            session.close();
        });
    });
});
