// Test the updated SNMP code with Ricoh printers
import { fetchPrinterStatus } from '../src/lib/snmp';

const printers = [
    { name: 'Ricoh MP 2014ad (1层西区)', ip: '192.168.20.17' },
    { name: 'Ricoh MP 2014ad (1层东区)', ip: '192.168.20.252' }
];

(async () => {
    for (const printer of printers) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${printer.name} (${printer.ip})`);
        console.log('='.repeat(60));

        try {
            const result = await fetchPrinterStatus(printer.ip);

            console.log(`\nStatus: ${result.status}`);
            console.log(`Online: ${result.isOnline}`);
            console.log(`\nSupplies (${result.supplies.length}):`);

            for (const supply of result.supplies) {
                console.log(`  - ${supply.color}`);
                console.log(`    Level: ${supply.level} / ${supply.max}`);
                console.log(`    Percent: ${supply.percent}%`);
                console.log(`    Type: ${supply.type}`);
            }
        } catch (error) {
            console.error(`Error: ${(error as any).message}`);
        }
    }

    console.log('\n✅ All tests complete');
})();
