import { NextResponse } from 'next/server';
import { reorderPrinters, getReplacementHistory, addReplacementHistory, deleteReplacementHistory } from '@/lib/printerService';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const printerId = searchParams.get('printerId');

    if (!printerId) {
        return NextResponse.json({ error: 'Printer ID required' }, { status: 400 });
    }

    const history = getReplacementHistory(parseInt(printerId));
    return NextResponse.json(history);
}

export async function POST(request: Request) {
    // Determine action from URL or body?
    // Let's assume standard POST is for "Add History" OR "Reorder" based on body content.
    // Or we can verify route handling. 
    // Wait, simpler to have separate routes if actions differ significantly, but for now we can check body.

    // Actually, reorder is global, history is per printer or global.
    // Let's check if it's a history addition or reorder.

    const body = await request.json();

    if (body.action === 'reorder') {
        const { orderedIds } = body;
        if (!Array.isArray(orderedIds)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        reorderPrinters(orderedIds);
        return NextResponse.json({ success: true });
    }

    if (body.action === 'add_history') {
        const { printerId, color, remark, level, maxCapacity, source } = body;
        addReplacementHistory(printerId, color, remark, level, maxCapacity, source);
        return NextResponse.json({ success: true });
    }

    // Default to handling basic "history add" if fields match?
    // Let's stick to the action check above.

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    deleteReplacementHistory(parseInt(id));
    return NextResponse.json({ success: true });
}
