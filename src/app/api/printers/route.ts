import { NextResponse } from 'next/server';
import { getAllPrinters, addPrinter, getPrinterSupplies } from '@/lib/printerService';
import { initializeApp } from '@/lib/init';

// Ensure initialization runs on first access
let initialized = false;

export async function GET() {
    if (!initialized) {
        initializeApp();
        initialized = true;
    }

    const printers = getAllPrinters();
    const result = printers.map(p => ({
        ...p,
        supplies: getPrinterSupplies(p.id)
    }));
    return NextResponse.json(result);
}

export async function POST(request: Request) {
    const body = await request.json();
    const { name, brand, model, ip, location } = body;

    if (!ip || !brand) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        addPrinter({ name, brand, model, ip, location });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
