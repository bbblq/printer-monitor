import { NextResponse } from 'next/server';
import snmp from 'net-snmp';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    if (!ip) {
        return NextResponse.json({ error: '缺少 IP 地址' }, { status: 400 });
    }

    const result = {
        ip,
        sysDescr: '',
        raw: {} as Record<string, string>,
        rows: [] as Array<{ index: string; desc: string; level: string; max: string }>,
    };

    try {
        const session = snmp.createSession(ip, 'public', {
            timeout: 15000,
            retries: 3,
            transport: 'udp4',
        });

        await new Promise<void>((resolve) => {
            session.get(['1.3.6.1.2.1.1.1.0'], (error, varbinds) => {
                if (!error && varbinds && varbinds[0]?.value) {
                    result.sysDescr = varbinds[0].value.toString();
                }

                const tableOid = '1.3.6.1.2.1.43.11.1.1';
                const rows = new Map<string, { desc?: string; level?: string; max?: string }>();

                session.subtree(tableOid, 20, (varbinds) => {
                    for (const vb of varbinds) {
                        if (snmp.isVarbindError(vb)) continue;
                        const oid = vb.oid;
                        let val = vb.value;
                        if (Buffer.isBuffer(val)) val = val.toString();
                        result.raw[oid] = val;

                        if (!oid.startsWith(tableOid)) continue;

                        const parts = oid.split('.');
                        const prefixParts = tableOid.split('.');
                        const rowIdx = parts.slice(prefixParts.length + 1).join('.');

                        if (!rows.has(rowIdx)) rows.set(rowIdx, { desc: '', level: '', max: '' });
                        const row = rows.get(rowIdx)!;

                        const colId = parseInt(parts[prefixParts.length]);

                        if (colId === 6) row.desc = val;
                        else if (colId === 8) row.max = val;
                        else if (colId === 9) row.level = val;
                    }
                }, (err) => {
                    if (!err) {
                        for (const [idx, row] of rows) {
                            result.rows.push({
                                index: idx,
                                desc: row.desc || '-',
                                level: row.level || '-',
                                max: row.max || '-',
                            });
                        }
                    }
                    session.close();
                    resolve();
                });
            });
        });

        return NextResponse.json(result);

    } catch (e) {
        return NextResponse.json({ error: 'SNMP 请求失败: ' + (e as Error).message }, { status: 500 });
    }
}
