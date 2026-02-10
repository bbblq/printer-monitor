import db from './db';
import { format } from 'datetime';

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

export function getRecentReplacements(days: number = 7): ReplacementInfo[] {
    return db.prepare(`
        SELECT h.*, p.name as printer_name
        FROM supplies_history h
        JOIN printers p ON h.printer_id = p.id
        WHERE h.source = 'auto' AND h.recorded_at >= datetime('now', '-${days} days')
        ORDER BY h.recorded_at DESC
    `).all() as ReplacementInfo[];
}

export function generateDailyReport(): string {
    const printers = getAllPrinters();
    const supplies = getAllSupplies();
    const today = new Date().toLocaleDateString('zh-CN');

    let report = `# 打印机耗材日报 - ${today}\n\n`;
    report += `## 📊 概览\n\n`;
    report += `- 打印机总数: ${printers.length}\n`;
    report += `- 在线打印机: ${printers.filter(p => p.is_online).length}\n`;
    report += `- 离线打印机: ${printers.filter(p => !p.is_online).length}\n\n`;

    report += `## 🖨️ 打印机状态\n\n`;
    for (const p of printers) {
        const statusIcon = p.is_online ? '🟢' : '🔴';
        const statusText = p.is_online ? (p.status || '正常') : '离线';
        report += `${statusIcon} **${p.name}** (${p.location})\n`;
        report += `   - 型号: ${p.brand} ${p.model}\n`;
        report += `   - 状态: ${statusText}\n\n`;
    }

    report += `## 🧴 耗材状态\n\n`;
    const lowSupplies = supplies.filter(s => s.percent <= 10);
    const emptySupplies = supplies.filter(s => s.percent === 0);

    if (lowSupplies.length > 0) {
        report += `### ⚠️ 耗材不足 (≤10%)\n\n`;
        for (const s of lowSupplies) {
            const printer = printers.find(p => p.id === s.printer_id);
            const emoji = s.percent === 0 ? '🔴' : '🟡';
            report += `${emoji} ${printer?.name || s.printer_id} - ${s.color}: ${s.percent}%\n`;
        }
        report += '\n';
    } else {
        report += `### ✅ 耗材充足\n\n`;
        report += `所有打印机耗材均在正常范围。\n\n`;
    }

    if (emptySupplies.length > 0) {
        report += `### 🔴 耗材耗尽\n\n`;
        for (const s of emptySupplies) {
            const printer = printers.find(p => p.id === s.printer_id);
            report += `🚨 ${printer?.name || s.printer_id} - ${s.color}: 已耗尽\n`;
        }
        report += '\n';
    }

    const replacements = getRecentReplacements(1);
    if (replacements.length > 0) {
        report += `## 🔄 今日更换记录\n\n`;
        for (const r of replacements) {
            report += `- ${r.recorded_at.split(' ')[1]?.substring(0, 5) || ''} ${r.printer_name} - ${r.color} (${r.level}%)\n`;
        }
        report += '\n';
    }

    report += `---\n`;
    report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;

    return report;
}

export function generateAlertMessage(
    printer: PrinterInfo,
    supply: SupplyInfo,
    alertType: 'low' | 'empty'
): { title: string; content: string } {
    const title = alertType === 'empty' ? '🚨 耗材耗尽提醒' : '⚠️ 耗材不足提醒';

    const content = `
打印机: ${printer.name}
位置: ${printer.location}
耗材: ${supply.color}
剩余: ${supply.percent}%
状态: ${alertType === 'empty' ? '已耗尽，请立即更换' : '含量过低，请及时更换'}

IP: ${printer.ip}
型号: ${printer.brand} ${printer.model}
    `.trim();

    return { title, content };
}

export function generateReplacementMessage(
    printer: PrinterInfo,
    supply: SupplyInfo,
    oldPercent: number,
    newPercent: number
): { title: string; content: string } {
    const content = `
打印机: ${printer.name}
位置: ${printer.location}
耗材: ${supply.color}
状态: 已更换
用量: ${oldPercent.toFixed(0)}% → ${newPercent.toFixed(0)}%

IP: ${printer.ip}
型号: ${printer.brand} ${printer.model}
    `.trim();

    return { title: '🔄 耗材更换记录', content };
}
