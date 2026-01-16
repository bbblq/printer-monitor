import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const printers = db.prepare('SELECT * FROM printers ORDER BY display_order ASC, id ASC').all();
        return new NextResponse(JSON.stringify(printers, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="printers_export.json"'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
