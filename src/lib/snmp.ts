import snmp from 'net-snmp';

export interface PrinterSNMPData {
    isOnline: boolean;
    status: string;
    supplies: Array<{
        color: string;
        level: number;
        max: number;
        percent: number;
        type: 'toner' | 'waste' | 'other';
    }>;
}

const OIDS = {
    hrDeviceStatus: '1.3.6.1.2.1.25.3.2.1.5.1',
    sysDescr: '1.3.6.1.2.1.1.1.0',
    hrPrinterDetectedErrorState: '1.3.6.1.2.1.25.3.5.1.1',
};

// prtMarkerSuppliesTable prefix
const TABLE_OID_PREFIX = '1.3.6.1.2.1.43.11.1.1';

export async function fetchPrinterStatus(ip: string): Promise<PrinterSNMPData> {
    return new Promise((resolve) => {
        const session = snmp.createSession(ip, 'public', {
            timeout: 5000,
            retries: 2,
            transport: 'udp4'
        });

        const result: PrinterSNMPData = {
            isOnline: false,
            status: 'Offline',
            supplies: [],
        };

        // 1. Check connectivity (Only check sysDescr first for max compatibility)
        // Some HP printers fail if you request multiple OIDs or specific hrDeviceStatus index
        session.get([OIDS.sysDescr], (error, varbinds) => {
            if (error) {
                session.close();
                console.error(`[SNMP] Connection failed to ${ip}: ${error.message}`);
                resolve(result);
                return;
            }

            result.isOnline = true;
            result.status = 'Running'; // Default to Running if online

            // Check if this is a Ricoh printer
            if (!varbinds || varbinds.length === 0 || !varbinds[0] || !varbinds[0].value) {
                session.close();
                resolve(result);
                return;
            }

            const sysDescr = varbinds[0]!.value!.toString().toLowerCase();
            const isRicoh = sysDescr.includes('ricoh');

            // 1.5 Fetch Error State (Paper Jam, No Paper, etc.)
            session.get([OIDS.hrPrinterDetectedErrorState], (err, errorVarbinds) => {
                let explicitStatus = '';

                if (!err && errorVarbinds && errorVarbinds.length > 0 && !snmp.isVarbindError(errorVarbinds[0])) {
                    const buffer = errorVarbinds[0].value;
                    if (Buffer.isBuffer(buffer) && buffer.length > 0) {
                        const b0 = buffer[0];
                        // RFC 3805 - hrPrinterDetectedErrorState (Octet String)
                        // lowPaper(0) -> 0x80
                        // noPaper(1) -> 0x40
                        // lowToner(2) -> 0x20
                        // noToner(3) -> 0x10
                        // doorOpen(4) -> 0x08
                        // jammed(5) -> 0x04
                        // offline(6) -> 0x02
                        // serviceRequested(7) -> 0x01
                        // inputTrayEmpty(13) -> 2nd byte 0x04? Need careful bit check logic.

                        // Simplification for user request: "Jam, No Paper, Other Fault"

                        // Check for JAM (Bit 5 in byte 0 -> 0x04)
                        if (b0 & 0x04) {
                            explicitStatus = '卡纸';
                        }
                        // Check for No Paper (Bit 1 -> 0x40) or Input Tray Empty (Bit 13 -> Byte 1, Bit 5 -> 0x20?)
                        // Let's stick to standard noPaper first.
                        else if (b0 & 0x40) {
                            explicitStatus = '缺纸';
                        }
                        // Check for Door Open (Bit 4 -> 0x08)
                        else if (b0 & 0x08) {
                            explicitStatus = '仓门打开'; // Treat as fault
                        }
                        // Check for Service Requested (Bit 7 -> 0x01) or other errors
                        else if ((b0 & 0x01) || (b0 & 0x02)) {
                            explicitStatus = '故障';
                        }

                        // Check byte 1 if exists for Input Empty (13)
                        if (!explicitStatus && buffer.length > 1) {
                            const b1 = buffer[1];
                            // inputTrayEmpty(13) -> index 13.
                            // Byte 0: 0-7. Byte 1: 8-15.
                            // 13 is 6th bit of Byte 1? (8,9,10,11,12,13)
                            // 8=0x80, 9=0x40, 10=0x20, 11=0x10, 12=0x08, 13=0x04
                            if (b1 & 0x04) {
                                explicitStatus = '缺纸';
                            }
                        }
                    }
                }

                if (explicitStatus) {
                    result.status = explicitStatus;
                }

                // 2. Fetch supplies using generic subtree walk
                const rows = new Map<string, { desc?: string, max?: number, level?: number }>();

                session.subtree(TABLE_OID_PREFIX, 20, (varbinds) => {
                    for (const vb of varbinds) {
                        if (snmp.isVarbindError(vb)) continue;

                        const oid = vb.oid;
                        if (!oid.startsWith(TABLE_OID_PREFIX)) continue;

                        const parts = oid.split('.');
                        const prefixParts = TABLE_OID_PREFIX.split('.');
                        if (parts.length <= prefixParts.length + 1) continue;

                        const colId = parseInt(parts[prefixParts.length]);
                        const rowIdx = parts.slice(prefixParts.length + 1).join('.');

                        if (!rows.has(rowIdx)) rows.set(rowIdx, {});
                        const row = rows.get(rowIdx)!;

                        if (colId === 6) { // Description
                            let val = vb.value;
                            if (Buffer.isBuffer(val)) val = val.toString();
                            row.desc = val?.toString() || '';
                        } else if (colId === 8) { // Max Capacity
                            row.max = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                        } else if (colId === 9) { // Level
                            row.level = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                        }
                    }
                }, (err) => {
                    if (err) {
                        console.error(`[SNMP] Subtree error for ${ip}:`, err.message);
                    }

                    // Check if we got -3/-2 values (Ricoh issue) and need to use Ricoh-specific OIDs
                    const hasInvalidValues = Array.from(rows.values()).some(
                        row => row.level === -3 || row.max === -2
                    );

                    if (isRicoh && hasInvalidValues) {
                        console.log(`[SNMP] Detected Ricoh printer with invalid standard values, trying Ricoh-specific OIDs for ${ip}`);

                        // Try Ricoh-specific toner level OID
                        // OID 1.3.6.1.4.1.367.3.2.1.2.24.1.1 is the Ricoh toner table
                        const ricohTonerTable = '1.3.6.1.4.1.367.3.2.1.2.24.1.1';
                        const ricohRows = new Map<string, { name?: string, desc?: string, percent?: number }>();

                        session.subtree(ricohTonerTable, 10, (varbinds) => {
                            for (const vb of varbinds) {
                                if (snmp.isVarbindError(vb)) continue;

                                const oid = vb.oid;
                                if (!oid.startsWith(ricohTonerTable)) continue;

                                const parts = oid.split('.');
                                const prefixParts = ricohTonerTable.split('.');
                                if (parts.length <= prefixParts.length + 1) continue;

                                const colId = parseInt(parts[prefixParts.length]);
                                const rowIdx = parts.slice(prefixParts.length + 1).join('.');

                                if (!ricohRows.has(rowIdx)) ricohRows.set(rowIdx, {});
                                const ricohRow = ricohRows.get(rowIdx)!;

                                if (colId === 2) { // Color name
                                    let val = vb.value;
                                    if (Buffer.isBuffer(val)) val = val.toString();
                                    ricohRow.name = val?.toString() || '';
                                } else if (colId === 3) { // Description
                                    let val = vb.value;
                                    if (Buffer.isBuffer(val)) val = val.toString();
                                    ricohRow.desc = val?.toString() || '';
                                } else if (colId === 5) { // Percentage remaining
                                    ricohRow.percent = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                                }
                            }
                        }, (ricohErr) => {
                            if (ricohErr) {
                                console.error(`[SNMP] Ricoh-specific subtree error for ${ip}:`, ricohErr.message);
                            }

                            // Clear previous invalid supplies and add Ricoh-specific data
                            result.supplies = [];

                            for (const [idx, ricohRow] of ricohRows.entries()) {
                                if (ricohRow.percent != null) {
                                    const desc = ricohRow.desc || ricohRow.name || 'Unknown Toner';
                                    const percent = ricohRow.percent;

                                    // Type classification
                                    let type: 'toner' | 'waste' | 'other' = 'toner';
                                    const lower = desc.toLowerCase();

                                    if (lower.includes('waste') || lower.includes('废弃')) {
                                        type = 'waste';
                                    }

                                    result.supplies.push({
                                        color: desc,
                                        level: percent,
                                        max: 100,
                                        percent,
                                        type
                                    });
                                }
                            }

                            session.close();
                            resolve(result);
                        });
                    } else {
                        // Process standard rows
                        for (const [key, row] of rows.entries()) {
                            // Logic: we need Description. 
                            // Max/Level can be weird numbers.
                            if (row.desc && row.level != null && row.max != null) {
                                const desc = row.desc;
                                let level = row.level;
                                let max = row.max;
                                let percent = 0;

                                // RFC 3805 Special Values:
                                // -1: other
                                // -2: unknown
                                // -3: someRemaining

                                if (level === -3) {
                                    // "Some Remaining" -> Treat as OK/Good. 
                                    // We'll visually show it as ~25% or special handling, but let's say 25% for now so it's visible.
                                    // Max might be -2 (unknown).
                                    percent = 25;
                                } else if (level === -2 || max === -2) {
                                    // Unknown level -> 0?
                                    percent = 0;
                                } else if (max > 0 && level >= 0) {
                                    percent = Math.round((level / max) * 100);
                                } else if (max <= 0 && level > 0 && level <= 100) {
                                    // Some devices report percent directly in level with max 0/100
                                    percent = level;
                                }

                                if (percent < 0) percent = 0;
                                if (percent > 100) percent = 100;

                                // Type classification
                                let type: 'toner' | 'waste' | 'other' = 'other';
                                const lower = desc.toLowerCase();

                                if (lower.includes('waste') || lower.includes('废弃')) {
                                    type = 'waste';
                                } else if (
                                    lower.includes('toner') || lower.includes('碳粉') || lower.includes('墨') ||
                                    lower.includes('black') || lower.includes('cyan') ||
                                    lower.includes('magenta') || lower.includes('yellow') ||
                                    lower.includes('黑色') || lower.includes('青色') ||
                                    lower.includes('品红色') || lower.includes('黄色')
                                ) {
                                    type = 'toner';
                                }

                                result.supplies.push({
                                    color: desc,
                                    level,
                                    max,
                                    percent,
                                    type
                                });
                            }
                        }

                        // Filter out empty/placeholder cartridges (common in monochrome printers)
                        // Remove supplies that are 0% with level=0 and max=0 (likely placeholder entries)
                        result.supplies = result.supplies.filter(supply => {
                            // Keep if it has actual data (not 0/0)
                            if (supply.level > 0 || supply.max > 0) return true;
                            // Keep if it's a waste container (even if empty)
                            if (supply.type === 'waste') return true;
                            // Remove empty placeholders
                            return false;
                        });

                        session.close();
                        resolve(result);
                    }
                });
            });
        });
    });
}
