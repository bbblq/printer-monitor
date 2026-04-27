import { NextResponse } from 'next/server';
import { getAllPrinters, addPrinter, getPrinterSupplies } from '@/lib/printerService';
import { initializeApp } from '@/lib/init';

function isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

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
    const { name, brand, model, ip, location, consumable_model } = body;

    if (!ip || !brand) {
        return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    if (!isValidIP(ip)) {
        return NextResponse.json({ error: 'IP地址格式无效' }, { status: 400 });
    }

    try {
        addPrinter({ name, brand, model, ip, location, consumable_model });
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to add printer';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
