import db from './db';

export interface PrinterInfo {
    id: number;
    name: string;
    brand: string;
    model: string;
    location: string;
    ip: string;
    status: string;
    is_online: number;
}

export interface SupplyInfo {
    printer_id: number;
    color: string;
    level: number;
    max_capacity: number;
    percent: number;
}

export interface ReplacementInfo {
    id: number;
    printer_id: number;
    printer_name: string;
    color: string;
    level: number;
    replaced_at: string;
    recorded_at: string;
}

export function getAllPrinters(): PrinterInfo[] {
    return db.prepare(`
        SELECT p.*, COALESCE(s.status, 'Unknown') as status, COALESCE(s.is_online, 0) as is_online
        FROM printers p
        LEFT JOIN printer_status s ON p.id = s.printer_id
        ORDER BY p.display_order ASC, p.id ASC
    `).all() as PrinterInfo[];
}

export function getAllSupplies(): SupplyInfo[] {
    const printers = db.prepare('SELECT id FROM printers').all() as { id: number }[];
    const supplies: SupplyInfo[] = [];

    for (const p of printers) {
        const rows = db.prepare('SELECT * FROM supplies_current WHERE printer_id = ?').all(p.id) as any[];
        for (const row of rows) {
            const percent = row.max_capacity > 0 ? Math.round((row.level / row.max_capacity) * 100) : 0;
            supplies.push({
                printer_id: p.id,
                color: row.color,
                level: row.level,
                max_capacity: row.max_capacity,
                percent,
            });
        }
    }
    return supplies;
}

export function getReplacementsByMonth(): ReplacementInfo[] {
    return db.prepare(`
        SELECT h.*, p.name as printer_name
        FROM supplies_history h
        JOIN printers p ON h.printer_id = p.id
        WHERE h.source = 'auto' AND COALESCE(h.replaced_at, h.recorded_at) >= datetime('now', 'start of month')
        ORDER BY COALESCE(h.replaced_at, h.recorded_at) DESC
    `).all() as ReplacementInfo[];
}

export function getReplacementsByYear(): ReplacementInfo[] {
    return db.prepare(`
        SELECT h.*, p.name as printer_name
        FROM supplies_history h
        JOIN printers p ON h.printer_id = p.id
        WHERE h.source = 'auto' AND COALESCE(h.replaced_at, h.recorded_at) >= datetime('now', 'start of year')
        ORDER BY COALESCE(h.replaced_at, h.recorded_at) DESC
    `).all() as ReplacementInfo[];
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return `${beijingTime.getMonth() + 1}/${beijingTime.getDate()} ${beijingTime.getHours().toString().padStart(2, '0')}:${beijingTime.getMinutes().toString().padStart(2, '0')}`;
}

export function generateDailyReport(): string {
    const printers = getAllPrinters();
    const supplies = getAllSupplies();
    const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });

    const monthReplacements = getReplacementsByMonth();
    const yearReplacements = getReplacementsByYear();

    // 耗材不足（低于10%）
    const lowSupplies = supplies.filter(s => s.percent > 0 && s.percent <= 10);

    // 打印机状态统计
    const onlinePrinters = printers.filter(p => p.is_online === 1);
    const offlinePrinters = printers.filter(p => p.is_online === 0);

    let report = `**🗓️ 日报时间**: ${today}\n\n`;

    // 打印机状态概览
    report += `**🔹 设备状态**\n`;
    report += `总计: ${printers.length} 台 | 🟢 在线: ${onlinePrinters.length} | 🔴 离线: ${offlinePrinters.length}\n`;
    if (offlinePrinters.length > 0) {
        offlinePrinters.forEach(p => {
            report += `  - ${p.name} (${p.location})\n`;
        });
    }

    report += `\n**🔹 本月更换记录**\n`;
    if (monthReplacements.length === 0) {
        report += `(无)\n`;
    } else {
        for (const r of monthReplacements) {
            const displayDate = r.replaced_at || r.recorded_at;
            report += `- ${displayDate ? displayDate.substring(5, 16) : '未知时间'} ${r.printer_name} ${r.color}\n`;
        }
    }

    report += `\n**🔸 耗材不足 (<10%)**\n`;
    if (lowSupplies.length === 0) {
        report += `(全部正常)\n`;
    } else {
        for (const s of lowSupplies) {
            const printer = printers.find(p => p.id === s.printer_id);
            const emoji = s.percent <= 5 ? '🔴' : '🟡';
            report += `${emoji} ${printer?.name || '未知'} ${s.color} **${s.percent}%**\n`;
        }
    }

    return report;
}

export function generateAlertMessage(
    printer: PrinterInfo,
    supply: SupplyInfo,
    alertType: 'low' | 'empty'
): { title: string; content: string } {
    const title = alertType === 'empty' ? '🚨 耗材耗尽' : '⚠️ 耗材不足';
    const status = alertType === 'empty' ? '已耗尽，请立即更换' : '含量过低，请及时更换';

    const content = `打印机: ${printer.name}
位置: ${printer.location}
耗材: ${supply.color}
剩余: ${supply.percent}%
状态: ${status}
型号: ${printer.brand} ${printer.model}`;

    return { title, content };
}

export function generateReplacementMessage(
    printer: PrinterInfo,
    supply: SupplyInfo,
    oldPercent: number,
    newPercent: number
): { title: string; content: string } {
    const content = `打印机: ${printer.name}
位置: ${printer.location}
耗材: ${supply.color}
用量: ${oldPercent.toFixed(0)}% → ${newPercent.toFixed(0)}%
型号: ${printer.brand} ${printer.model}`;
    return { title: '🔄 耗材更换', content };
}
