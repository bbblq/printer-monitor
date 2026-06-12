import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { printerDisplayNameSql } from '@/lib/printerName';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const month = searchParams.get('month');

        let dateFilter = '';
        const params: string[] = [];

        if (year && month) {
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
            const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
            const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
            dateFilter = 'WHERE COALESCE(h.replaced_at, h.recorded_at) >= ? AND COALESCE(h.replaced_at, h.recorded_at) < ?';
            params.push(startDate, endDate);
        } else if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${parseInt(year) + 1}-01-01`;
            dateFilter = 'WHERE COALESCE(h.replaced_at, h.recorded_at) >= ? AND COALESCE(h.replaced_at, h.recorded_at) < ?';
            params.push(startDate, endDate);
        }

        const history = db.prepare(`
            SELECT 
                h.id,
                h.printer_id,
                ${printerDisplayNameSql('p')} as printer_name,
                p.ip as printer_ip,
                p.brand,
                p.model,
                p.location,
                h.color,
                h.level,
                h.max_capacity,
                h.source,
                h.remark,
                h.replaced_at,
                h.recorded_at
            FROM supplies_history h
            LEFT JOIN printers p ON h.printer_id = p.id
            ${dateFilter}
            ORDER BY COALESCE(h.replaced_at, h.recorded_at) DESC
        `).all(...params) as any[];

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Printer Monitor';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('耗材更换记录', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        sheet.columns = [
            { header: '序号', key: 'index', width: 8 },
            { header: '更换日期', key: 'replaced_at', width: 22 },
            { header: '打印机', key: 'printer_name', width: 24 },
            { header: '位置', key: 'location', width: 20 },
            { header: '品牌', key: 'brand', width: 14 },
            { header: '型号', key: 'model', width: 22 },
            { header: 'IP 地址', key: 'printer_ip', width: 16 },
            { header: '颜色', key: 'color', width: 14 },
            { header: '当前余量', key: 'level', width: 12 },
            { header: '满量', key: 'max_capacity', width: 10 },
            { header: '百分比', key: 'percent', width: 10 },
            { header: '类型', key: 'source', width: 10 },
            { header: '备注', key: 'remark', width: 30 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E40AF' }
        };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).height = 24;

        history.forEach((row, idx) => {
            const maxCap = row.max_capacity || 0;
            const lv = row.level || 0;
            const percent = maxCap > 0 ? Math.round((lv / maxCap) * 100) : 0;
            const replacedAt = row.replaced_at || row.recorded_at || '';
            const source = row.source === 'auto' ? '自动' : '手动';
            const colorName = normalizeColorName(row.color);

            sheet.addRow({
                index: idx + 1,
                replaced_at: formatExcelDate(replacedAt),
                printer_name: row.printer_name || '',
                location: row.location || '',
                brand: row.brand || '',
                model: row.model || '',
                printer_ip: row.printer_ip || '',
                color: colorName,
                level: lv,
                max_capacity: maxCap,
                percent: `${percent}%`,
                source,
                remark: row.remark || ''
            });
        });

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            row.alignment = { vertical: 'middle' };
            row.getCell('source').alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('percent').alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('index').alignment = { vertical: 'middle', horizontal: 'center' };

            const colorCell = row.getCell('color');
            const bg = colorBgMap(row.color);
            if (bg) {
                colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                colorCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            }

            if (rowNumber % 2 === 0) {
                for (let i = 1; i <= sheet.columnCount; i++) {
                    const cell = row.getCell(i);
                    if (!cell.fill || cell.fill.type !== 'pattern') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                    }
                }
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = buildFileName(year, month);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            }
        });
    } catch (error: unknown) {
        console.error('[ExportExcel] Error:', error);
        const message = error instanceof Error ? error.message : 'Export failed';
        return NextResponse.json({ error: message, stack: error instanceof Error ? error.stack : null }, { status: 500 });
    }
}

function buildFileName(year: string | null, month: string | null): string {
    if (year && month) {
        return `耗材更换记录_${year}年${parseInt(month)}月.xlsx`;
    }
    if (year) {
        return `耗材更换记录_${year}年.xlsx`;
    }
    return `耗材更换记录_${new Date().toISOString().split('T')[0]}.xlsx`;
}

function formatExcelDate(value: string): string {
    if (!value) return '';
    try {
        let utcDate: Date;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
            utcDate = new Date(value.replace(' ', 'T') + 'Z');
        } else {
            utcDate = new Date(value.endsWith('Z') ? value : value + ' UTC');
        }
        if (isNaN(utcDate.getTime())) return value;
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Shanghai'
        }).format(utcDate).replace(/\//g, '-');
    } catch {
        return value;
    }
}

function normalizeColorName(name: string | null | undefined): string {
    if (!name) return '未知';
    const lower = name.toLowerCase();
    if (lower.includes('black') || lower.includes('黑') || lower.includes('k')) return '黑色';
    if (lower.includes('cyan') || lower.includes('青') || (lower.includes('c') && !lower.includes('black'))) return '青色';
    if (lower.includes('magenta') || lower.includes('品') || lower.includes('m')) return '品红';
    if (lower.includes('yellow') || lower.includes('黄') || lower.includes('y')) return '黄色';
    if (lower.includes('waste')) return '废粉盒';
    return name;
}

function colorBgMap(name: string | null | undefined): string | null {
    if (!name) return null;
    const lower = name.toLowerCase();
    if (lower.includes('black') || lower.includes('黑') || lower.includes('k')) return 'FF1E293B';
    if (lower.includes('cyan') || lower.includes('青') || (lower.includes('c') && !lower.includes('black'))) return 'FF06B6D4';
    if (lower.includes('magenta') || lower.includes('品') || lower.includes('m')) return 'FFD946EF';
    if (lower.includes('yellow') || lower.includes('黄') || lower.includes('y')) return 'FFEAB308';
    if (lower.includes('waste')) return 'FF9CA3AF';
    return null;
}
