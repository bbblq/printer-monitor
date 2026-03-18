import { NextResponse } from 'next/server';
import { refreshAllPrinters } from '@/lib/printerService';

export async function POST() {
    try {
        await refreshAllPrinters();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
