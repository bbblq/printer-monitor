import { fetchPrinterStatus } from '../src/lib/snmp';

const ip = '192.168.20.17'; // Ricoh MP 2014ad

console.log(`Testing Ricoh MP 2014ad at ${ip}...\n`);

(async () => {
    const result = await fetchPrinterStatus(ip);

    console.log(`Status: ${result.status}`);
    console.log(`Online: ${result.isOnline}`);
    console.log(`\nSupplies (${result.supplies.length}):`);

    for (const supply of result.supplies) {
        console.log(`\n  Color: ${supply.color}`);
        console.log(`  Level: ${supply.level}`);
        console.log(`  Max: ${supply.max}`);
        console.log(`  Percent: ${supply.percent}%`);
        console.log(`  Type: ${supply.type}`);
    }
})();
