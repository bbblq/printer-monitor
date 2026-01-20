import { fetchPrinterStatus } from '../src/lib/snmp';

const ips = [
    { name: 'HP MFP437 (Current DB IP)', ip: '192.168.20.244' },
    { name: 'HP MFP437 (Original Seed IP)', ip: '192.168.22.252' }
];

(async () => {
    for (const test of ips) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${test.name} (${test.ip})`);
        console.log('='.repeat(60));

        try {
            const result = await fetchPrinterStatus(test.ip);

            console.log(`Status: ${result.status}`);
            console.log(`Online: ${result.isOnline}`);
            console.log(`Supplies: ${result.supplies.length}`);

            for (const supply of result.supplies) {
                console.log(`  - ${supply.color}: ${supply.percent}%`);
            }
        } catch (error) {
            console.error(`Error: ${(error as any).message}`);
        }
    }

    console.log('\n✅ All tests complete');
})();
