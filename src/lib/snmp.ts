import snmp from 'net-snmp';
import { getMatchingRule, ModelRule } from './modelRules';

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

const TABLE_OID_PREFIX = '1.3.6.1.2.1.43.11.1.1';

export async function fetchPrinterStatus(ip: string): Promise<PrinterSNMPData> {
    return new Promise((resolve) => {
        const session = snmp.createSession(ip, 'public', {
            timeout: 10000,
            retries: 3,
            transport: 'udp4'
        });

        const result: PrinterSNMPData = {
            isOnline: false,
            status: 'Offline',
            supplies: [],
        };

        session.get([OIDS.sysDescr], (error, varbinds) => {
            if (error) {
                session.close();
                console.error(`[SNMP] Connection failed to ${ip}: ${error.message}`);
                resolve(result);
                return;
            }

            result.isOnline = true;
            result.status = 'Running';

            if (!varbinds || varbinds.length === 0 || !varbinds[0] || !varbinds[0].value) {
                session.close();
                resolve(result);
                return;
            }

            const sysDescr = varbinds[0]!.value!.toString();
            const rule = getMatchingRule(sysDescr);
            if (rule) {
                console.log(`[SNMP] Matched rule "${rule.name}" for ${ip}`);
            }

            session.get([OIDS.hrPrinterDetectedErrorState], (err, errorVarbinds) => {
                let explicitStatus = '';
                let hasNoTonerError = false;
                let hasLowTonerError = false;

                if (!err && errorVarbinds && errorVarbinds.length > 0 && !snmp.isVarbindError(errorVarbinds[0])) {
                    const buffer = errorVarbinds[0].value;
                    if (Buffer.isBuffer(buffer) && buffer.length > 0) {
                        const b0 = buffer[0];
                        if (b0 & 0x04) explicitStatus = '卡纸';
                        else if (b0 & 0x40) explicitStatus = '缺纸';
                        else if (b0 & 0x08) explicitStatus = '仓门打开';
                        else if (b0 & 0x10) { explicitStatus = '缺粉'; hasNoTonerError = true; }
                        else if ((b0 & 0x01) || (b0 & 0x02)) explicitStatus = '故障';

                        if (b0 & 0x10) hasNoTonerError = true;
                        if (b0 & 0x20) hasLowTonerError = true;

                        if (!explicitStatus && buffer.length > 1) {
                            const b1 = buffer[1];
                            if (b1 & 0x04) explicitStatus = '缺纸';
                        }
                    }
                }

                if (explicitStatus) {
                    result.status = explicitStatus;
                }

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

                        if (colId === 6) {
                            let val = vb.value;
                            if (Buffer.isBuffer(val)) val = val.toString();
                            row.desc = val?.toString() || '';
                        } else if (colId === 8) {
                            row.max = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                        } else if (colId === 9) {
                            row.level = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                        }
                    }
                }, (err) => {
                    if (err) {
                        console.error(`[SNMP] Subtree error for ${ip}:`, err.message);
                    }

                    if (rule?.quirks?.use_private_mib && rule.quirks.private_mib_oid) {
                        console.log(`[SNMP] Using private MIB ${rule.quirks.private_mib_oid} for ${ip}`);
                        const ricohTonerTable = rule.quirks.private_mib_oid;
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
                                if (colId === 2) {
                                    let val = vb.value; if (Buffer.isBuffer(val)) val = val.toString(); ricohRow.name = val?.toString() || '';
                                } else if (colId === 3) {
                                    let val = vb.value; if (Buffer.isBuffer(val)) val = val.toString(); ricohRow.desc = val?.toString() || '';
                                } else if (colId === 5) {
                                    ricohRow.percent = typeof vb.value === 'number' ? vb.value : parseInt(vb.value?.toString() || '0');
                                }
                            }
                        }, (ricohErr) => {
                            if (ricohErr) console.error(`[SNMP] Private MIB error ${ip}:`, ricohErr.message);
                            result.supplies = [];
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
                        return;
                    }

                    const forceNoToner = rule?.quirks?.force_level_on_error?.no_toner;
                    const forceLowToner = rule?.quirks?.force_level_on_error?.low_toner;

                    for (const [key, row] of rows.entries()) {
                        if (row.desc && row.level != null && row.max != null) {
                            const desc = row.desc;
                            let level = row.level;
                            let max = row.max;
                            let percent = 0;

                            const invMap = rule?.quirks?.invalid_value_mapping;

                            if (forceNoToner !== undefined && forceLowToner !== undefined) {
                                if (level === -2 || level === -3) {
                                    if (hasNoTonerError) {
                                        level = forceNoToner;
                                        percent = forceNoToner;
                                    } else {
                                        level = forceLowToner;
                                        percent = forceLowToner;
                                    }
                                    if (max <= 0) max = 100;
                                }
                            } else {
                                if (level === -3) {
                                    percent = invMap?.some_remaining ?? 25;
                                } else if (level === -2 || max === -2) {
                                    percent = invMap?.unknown ?? 0;
                                } else if (level === -1) {
                                    percent = invMap?.other ?? 0;
                                } else if (max > 0 && level >= 0) {
                                    percent = Math.round((level / max) * 100);
                                } else if (max <= 0 && level > 0 && level <= 100) {
                                    percent = level;
                                }
                            }

                            if (percent < 0) percent = 0;
                            if (percent > 100) percent = 100;

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
                                lower.includes('cartridge')
                            ) {
                                type = 'toner';
                            }

                            result.supplies.push({ color: desc, level, max, percent, type });
                        }
                    }

                    result.supplies = result.supplies.filter(supply => {
                        if (supply.level > 0 || supply.max > 0 || supply.percent > 0) return true;
                        if (supply.type === 'waste') return true;
                        return false;
                    });

                    session.close();
                    resolve(result);
                });
            });
        });
    });
}
