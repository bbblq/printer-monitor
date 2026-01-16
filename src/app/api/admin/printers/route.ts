import { NextResponse } from 'next/server';
import { deletePrinter, addPrinter, getAllPrinters, updatePrinter } from '@/lib/printerService'; // Reusing existing services

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, id, ...data } = body;

        if (action === 'delete' && id) {
            deletePrinter(id);
            return NextResponse.json({ success: true });
        } else if (action === 'update' && id) {
            updatePrinter(id, data);
            return NextResponse.json({ success: true });
        } else if (action === 'reorder' && body.updates) {
            // Batch update display_order for multiple printers
            for (const update of body.updates) {
                updatePrinter(update.id, { display_order: update.display_order });
            }
            return NextResponse.json({ success: true });
        }

        // Handle add is already covered in main route but we can consolidate or keep separate.
        // Let's rely on standard method separation usually but for quick admin actions:

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
