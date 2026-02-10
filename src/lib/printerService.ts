import db from './db';
import { fetchPrinterStatus } from './snmp';
import { notificationService, getAllNotificationSettings } from './notification';
import { generateAlertMessage, generateReplacementMessage } from './report';

export type Printer = {
    id: number;
    name: string;
    brand: string;
    model: string;
    ip: string;
    location: string;
    added_at: string;
    display_order?: number;
    consumable_model?: string;
};

export type PrinterStatus = {
    printer_id: number;
    status: string;
    is_online: number; // 0 or 1
    last_updated: string;
};

export type Supply = {
    printer_id: number;
    color: string;
    level: number;
    max_capacity: number;
    type?: 'toner' | 'waste' | 'other';
    percent?: number;
};

const INITIAL_PRINTERS: Omit<Printer, 'id' | 'added_at'>[] = [];

export function seedPrinters() {
    const count = (db.prepare('SELECT count(*) as c FROM printers').get() as { c: number }).c;

    // Auto-migration for consumable_model column
    try {
        db.prepare('ALTER TABLE printers ADD COLUMN consumable_model TEXT').run();
    } catch (e) {
        // Column likely exists, ignore
    }

    if (count === 0) {
        const insert = db.prepare('INSERT INTO printers (location, brand, model, ip, name, consumable_model) VALUES (@location, @brand, @model, @ip, @name, @consumable_model)');
        const insertMany = db.transaction((printers) => {
            for (const p of printers) {
                insert.run({ ...p, name: `${p.brand} ${p.model}`, consumable_model: '' });
            }
        });
        insertMany(INITIAL_PRINTERS);
    }
}

export function getAllPrinters() {
    return db.prepare(`
    SELECT p.*, COALESCE(s.status, 'Unknown') as status, COALESCE(s.is_online, 0) as is_online, s.last_updated
    FROM printers p
    LEFT JOIN printer_status s ON p.id = s.printer_id
    ORDER BY p.display_order ASC, p.id ASC
  `).all() as (Printer & PrinterStatus)[];
}

export function getPrinterSupplies(printerId: number) {
    return db.prepare('SELECT * FROM supplies_current WHERE printer_id = ?').all(printerId) as Supply[];
}

export function addPrinter(data: Omit<Printer, 'id' | 'added_at'>) {
    const stmt = db.prepare('INSERT INTO printers (location, brand, model, ip, name, consumable_model) VALUES (@location, @brand, @model, @ip, @name, @consumable_model)');
    return stmt.run({ ...data, consumable_model: data.consumable_model || '' });
}

export function updatePrinter(id: number, data: Partial<Printer>) {
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'added_at').map(k => `${k} = @${k}`).join(', ');
    if (!fields) return;
    const stmt = db.prepare(`UPDATE printers SET ${fields} WHERE id = @id`);
    return stmt.run({ ...data, id });
}

export function deletePrinter(id: number) {
    const deleteTransaction = db.transaction((printerId) => {
        db.prepare('DELETE FROM printer_status WHERE printer_id = ?').run(printerId);
        db.prepare('DELETE FROM supplies_current WHERE printer_id = ?').run(printerId);
        db.prepare('DELETE FROM supplies_history WHERE printer_id = ?').run(printerId);
        db.prepare('DELETE FROM printers WHERE id = ?').run(printerId);
    });
    return deleteTransaction(id);
}

export function getReplacementHistory(printerId: number) {
    return db.prepare('SELECT * FROM supplies_history WHERE printer_id = ? ORDER BY recorded_at DESC').all(printerId);
}

export function reorderPrinters(orderedIds: number[]) {
    const update = db.prepare('UPDATE printers SET display_order = ? WHERE id = ?');
    const updateMany = db.transaction((ids: number[]) => {
        for (let i = 0; i < ids.length; i++) {
            update.run(i, ids[i]);
        }
    });
    updateMany(orderedIds);
}

export function addReplacementHistory(printerId: number, color: string, remark: string = '', level: number = 100, maxCapacity: number = 100, source: 'auto' | 'manual' = 'manual') {
    const stmt = db.prepare(`
        INSERT INTO supplies_history (printer_id, color, level, max_capacity, source, remark)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(printerId, color, level, maxCapacity, source, remark);
}

export function deleteReplacementHistory(id: number) {
    return db.prepare('DELETE FROM supplies_history WHERE id = ?').run(id);
}

export async function refreshAllPrinters() {
    const printers = db.prepare('SELECT * FROM printers').all() as Printer[];
    const notificationSettings = getAllNotificationSettings();
    const enabledNotifications = notificationSettings.filter((s: any) => s.enabled === 1);
    const hasAlertConfig = enabledNotifications.length > 0;

    const refreshPrinter = async (p: Printer) => {
        try {
            const data = await fetchPrinterStatus(p.ip);

            db.prepare(`
                INSERT INTO printer_status (printer_id, status, is_online, last_updated)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(printer_id) DO UPDATE SET
                status=excluded.status,
                is_online=excluded.is_online,
                last_updated=excluded.last_updated
            `).run(p.id, data.status, data.isOnline ? 1 : 0);

            if (data.isOnline && data.supplies.length > 0) {
                const currentSupplies = new Map<string, { level: number, max: number }>();
                const existing = db.prepare('SELECT color, level, max_capacity FROM supplies_current WHERE printer_id = ?').all(p.id) as { color: string, level: number, max_capacity: number }[];
                for (const s of existing) {
                    currentSupplies.set(s.color, { level: s.level, max: s.max_capacity });
                }

                db.prepare('DELETE FROM supplies_current WHERE printer_id = ?').run(p.id);

                const updateSupply = db.prepare(`
                    INSERT INTO supplies_current (printer_id, color, level, max_capacity)
                    VALUES (?, ?, ?, ?)
                `);

                const insertHistory = db.prepare(`
                    INSERT INTO supplies_history (printer_id, color, level, max_capacity, source, remark)
                    VALUES (?, ?, ?, ?, 'auto', '系统自动检测')
                `);

                const tx = db.transaction(() => {
                    for (const supply of data.supplies) {
                        const old = currentSupplies.get(supply.color);
                        const percent = supply.max > 0 ? (supply.level / supply.max) * 100 : 0;

                        if (old) {
                            const oldPercent = old.max > 0 ? (old.level / old.max) * 100 : 0;
                            const newPercent = percent;
                            const percentJump = newPercent - oldPercent;

                            if (percentJump > 40 && newPercent >= 90 && oldPercent < 100) {
                                console.log(`[Replacement Detected] ${p.name} - ${supply.color}: ${oldPercent.toFixed(1)}% -> ${newPercent.toFixed(1)}%`);
                                insertHistory.run(p.id, supply.color, supply.level, supply.max);

                                if (hasAlertConfig) {
                                    for (const setting of enabledNotifications) {
                                        if (setting.alert_replacement === 1) {
                                            const msg = generateReplacementMessage(p, supply, oldPercent, newPercent);
                                            notificationService.send({ ...msg, type: 'alert' });
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        if (hasAlertConfig) {
                            for (const setting of enabledNotifications) {
                                const lowPercent = setting.alert_low_percent || 10;

                                if (supply.type === 'toner') {
                                    if (percent === 0 && setting.alert_empty === 1) {
                                        const msg = generateAlertMessage(p, { ...supply, percent }, 'empty');
                                        notificationService.send({ ...msg, type: 'alert' });
                                    } else if (percent <= lowPercent && percent > 0 && old?.max !== supply.max) {
                                        const msg = generateAlertMessage(p, { ...supply, percent }, 'low');
                                        notificationService.send({ ...msg, type: 'alert' });
                                    }
                                }
                            }
                        }

                        updateSupply.run(p.id, supply.color, supply.level, supply.max);
                    }
                });
                tx();
            }
        } catch (e) {
            console.error(`刷新打印机 ${p.ip} 失败:`, e);
        }
    };

    const BATCH_SIZE = 5;
    for (let i = 0; i < printers.length; i += BATCH_SIZE) {
        const batch = printers.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(refreshPrinter));
    }
}

// Settings management
export function getSetting(key: string): string | null {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
}

export function getAllSettings() {
    return db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[];
}

export function updateSetting(key: string, value: string) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
