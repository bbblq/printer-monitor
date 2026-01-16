import { NextResponse } from 'next/server';
import { getReplacementHistory, addReplacementHistory, deleteReplacementHistory } from '@/lib/printerService';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const printerId = parseInt(id);
    const history = getReplacementHistory(printerId);
    return NextResponse.json(history);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const printerId = parseInt(id);
        const body = await request.json();
        const { action, color, level, maxCapacity, historyId } = body;

        if (action === 'add') {
            if (!color || level == null || maxCapacity == null) {
                return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
            }
            addReplacementHistory(printerId, color, level, maxCapacity, 'manual');
            return NextResponse.json({ success: true });
        } else if (action === 'delete' && historyId) {
            deleteReplacementHistory(historyId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: '无效操作' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
