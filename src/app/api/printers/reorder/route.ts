import { NextResponse } from 'next/server';
import { reorderPrinters } from '@/lib/printerService';

export async function POST(request: Request) {
    try {
        const { orderedIds } = await request.json();
        if (!Array.isArray(orderedIds)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        reorderPrinters(orderedIds);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
    }
}
