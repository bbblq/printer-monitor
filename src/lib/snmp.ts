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

            // --- 1. Model Detection & Quirks ---
            const sysDescr = varbinds[0]!.value!.toString().toLowerCase();

            // Rules for specific printer models
            const isRicoh = sysDescr.includes('ricoh');
            const isCanonLBP = sysDescr.includes('canon') && (sysDescr.includes('lbp') || sysDescr.includes('laser'));

            // --- 2. Fetch Error State (Paper Jam, No Paper, etc.) ---
            session.get([OIDS.hrPrinterDetectedErrorState], (err, errorVarbinds) => {
                let explicitStatus = '';
                let hasNoTonerError = false;
                let hasLowTonerError = false;

                if (!err && errorVarbinds && errorVarbinds.length > 0 && !snmp.isVarbindError(errorVarbinds[0])) {
                    const buffer = errorVarbinds[0].value;
                    if (Buffer.isBuffer(buffer) && buffer.length > 0) {
                        const b0 = buffer[0];
                        // RFC 3805 - hrPrinterDetectedErrorState (Octet String)
                        // B0: lowPaper(0)=0x80, noPaper(1)=0x40, lowToner(2)=0x20, noToner(3)=0x10,
                        //     doorOpen(4)=0x08, jammed(5)=0x04, offline(6)=0x02, serviceRequested(7)=0x01

                        // Check specific flags
                        if (b0 & 0x04) explicitStatus = '卡纸';
                        else if (b0 & 0x40) explicitStatus = '缺纸';
                        else if (b0 & 0x08) explicitStatus = '仓门打开';
                        else if (b0 & 0x10) { explicitStatus = '如果没有墨粉'; hasNoTonerError = true; } // "No Toner"
                        else if ((b0 & 0x01) || (b0 & 0x02)) explicitStatus = '故障';

                        // Flag recording (even if not setting status text)
                        if (b0 & 0x10) hasNoTonerError = true;
                        if (b0 & 0x20) hasLowTonerError = true;

                        // Check byte 1 for Input Tray Empty (if needed)
                        if (!explicitStatus && buffer.length > 1) {
                            const b1 = buffer[1];
                            if (b1 & 0x04) explicitStatus = '缺纸';
                        }
                    }
                }

                if (explicitStatus) {
                    result.status = explicitStatus === '如果没有墨粉' ? '缺粉' : explicitStatus;
                } else if (hasLowTonerError) {
                    // Optional: Show low toner status if everything else is fine
                    // result.status = '墨粉低'; 
                }

                // --- 3. Fetch Supplies (Standard MIB) ---
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

                    // --- 4. Special Handling & Optimizations ---

                    // A. Ricoh Specific Logic
                    // Check if we got -3/-2 values (Ricoh issue)
                    const hasInvalidValues = Array.from(rows.values()).some(row => row.level === -3 || row.max === -2);

                    if (isRicoh && hasInvalidValues) {
                        console.log(`[SNMP] Detected Ricoh printer with invalid standard values, trying Ricoh-specific OIDs for ${ip}`);
                        // ... Ricoh Private MIB Walk (Nested) ...
                        const ricohTonerTable = '1.3.6.1.4.1.367.3.2.1.2.24.1.1';
                        const ricohRows = new Map<string, { name?: string, desc?: string, percent?: number }>();
                        session.subtree(ricohTonerTable, 10, (varbinds) => {
                            for (const vb of varbinds) { // Parse Ricoh varbinds
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
                                if (colId === 2) {
                                    let val = vb.value; if (Buffer.isBuffer(val)) val = val.toString(); ricohRow.name = val?.toString() || '';
                                } else if (colId === 3) {
                                    let val = vb.value; if (Buffer.isBuffer(val)) val = val.toString(); ricohRow.desc = val?.toString() || '';
                                } else if (colId === 5) {
                                    ricohRow.percent = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                                }
                            }
                        }, (ricohErr) => {
                            if (ricohErr) console.error(`[SNMP] Ricoh hook error ${ip}:`, ricohErr.message);
                            result.supplies = [];
                            // Map Ricoh rows to result
                            for (const [idx, ricohRow] of ricohRows.entries()) {
                                if (ricohRow.percent != null) {
                                    const desc = ricohRow.desc || ricohRow.name || 'Unknown Toner';
                                    const type = (desc.toLowerCase().includes('waste') || desc.includes('废')) ? 'waste' : 'toner';
                                    result.supplies.push({ color: desc, level: ricohRow.percent, max: 100, percent: ricohRow.percent, type });
                                }
                            }
                            session.close();
                            resolve(result);
                        });
                        return; // Exit main flow, waiting for Ricoh callback
                    }

                    // B. Standard & Other Model Logic
                    for (const [key, row] of rows.entries()) {
                        if (row.desc && row.level != null && row.max != null) {
                            const desc = row.desc;
                            let level = row.level;
                            let max = row.max;
                            let percent = 0;

                            // RFC 3805 Special Values: -1 (Other), -2 (Unknown), -3 (Some Remaining)

                            // --- Canon LBP Optimization Rule ---
                            // If Unknown (-2) or Some (-3), map to binary status based on ErrorState
                            if (isCanonLBP && (level === -2 || level === -3)) {
                                if (hasNoTonerError) {
                                    level = 0; // Force Empty
                                    percent = 0;
                                } else {
                                    level = 100; // Force Full (Operating)
                                    percent = 100;
                                }
                                // Ensure max is positive so it renders
                                if (max <= 0) max = 100;
                            }
                            // --- Standard Calculation ---
                            else if (level === -3) {
                                percent = 25; // "Some" generic fallback
                            } else if (level === -2 || max === -2) {
                                percent = 0; // Unknown
                            } else if (max > 0 && level >= 0) {
                                percent = Math.round((level / max) * 100);
                            } else if (max <= 0 && level > 0 && level <= 100) {
                                percent = level; // Direct percent
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
                                lower.includes('品红色') || lower.includes('黄色') ||
                                lower.includes('cartridge') // Generic cartridge
                            ) {
                                type = 'toner';
                            }

                            result.supplies.push({ color: desc, level, max, percent, type });
                        }
                    }

                    // Final cleanup: Remove obvious placeholders
                    result.supplies = result.supplies.filter(supply => {
                        if (supply.level > 0 || supply.max > 0 || supply.percent > 0) return true;
                        if (supply.type === 'waste') return true;
                        // Special case: if we forced a Canon supply to 0 (No Toner), we still want to SHOW it as empty,
                        // not hide it.
                        if (isCanonLBP && supply.type === 'toner') return true;
                        return false;
                    });

                    session.close();
                    resolve(result);
                });
            });
        });
    });
}
