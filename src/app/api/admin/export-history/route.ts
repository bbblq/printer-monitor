import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        // detailed query joining printers and history
        const history = db.prepare(`
            SELECT 
                h.id,
                h.printer_id,
                p.name as printer_name,
                p.ip as printer_ip,
                p.location as printer_location,
                p.model as printer_model,
                h.color,
                h.level,
                h.max_capacity,
                h.source,
                h.remark,
                h.recorded_at
            FROM supplies_history h
            LEFT JOIN printers p ON h.printer_id = p.id
            ORDER BY h.recorded_at DESC
        `).all();

        return new NextResponse(JSON.stringify(history, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="consumables_history_${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
