import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { printerDisplayNameSql } from '@/lib/printerName';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let dateFilter = '';
    const params: string[] = [];

    if (year && month) {
        // Filter by specific month
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
        const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
        dateFilter = 'WHERE COALESCE(h.replaced_at, h.recorded_at) >= ? AND COALESCE(h.replaced_at, h.recorded_at) < ?';
        params.push(startDate, endDate);
    }

    // Get all replacement history with printer info
    const history = db.prepare(`
        SELECT 
            h.*,
            ${printerDisplayNameSql('p')} as printer_name,
            p.brand,
            p.model,
            p.location,
            p.ip as printer_ip
        FROM supplies_history h
        LEFT JOIN printers p ON h.printer_id = p.id
        ${dateFilter}
        ORDER BY COALESCE(h.replaced_at, h.recorded_at) DESC
    `).all(...params);

    return NextResponse.json(history);
}
