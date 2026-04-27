import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getPrinterDisplayName } from '@/lib/printerName';

type ImportedPrinter = {
    name?: string | null;
    brand?: string | null;
    model?: string | null;
    ip?: string | null;
    location?: string | null;
    display_order?: number | null;
    consumable_model?: string | null;
};

export async function POST(req: Request) {
    try {
        const printers = await req.json();

        if (!Array.isArray(printers)) {
            return NextResponse.json({ error: 'Invalid data format. Expected an array.' }, { status: 400 });
        }

        const upsertByIp = db.prepare(`
            INSERT INTO printers (name, brand, model, ip, location, display_order, consumable_model)
            VALUES (@name, @brand, @model, @ip, @location, @display_order, @consumable_model)
            ON CONFLICT(ip) DO UPDATE SET
                name = excluded.name,
                brand = excluded.brand,
                model = excluded.model,
                location = excluded.location,
                display_order = excluded.display_order,
                consumable_model = excluded.consumable_model
        `);

        const safeTransaction = db.transaction((items: ImportedPrinter[]) => {
            for (const item of items) {
                const ip = item.ip?.trim();
                if (!ip) continue;

                upsertByIp.run({
                    name: getPrinterDisplayName(item),
                    brand: item.brand || '',
                    model: item.model || '',
                    ip,
                    location: item.location || '',
                    display_order: item.display_order || 0,
                    consumable_model: item.consumable_model || ''
                });
            }
        });

        safeTransaction(printers);

        return NextResponse.json({ success: true, count: printers.length });
    } catch (error: unknown) {
        console.error('Import error:', error);
        const message = error instanceof Error ? error.message : 'Import failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
