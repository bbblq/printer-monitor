import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
    try {
        const printers = await req.json();

        if (!Array.isArray(printers)) {
            return NextResponse.json({ error: 'Invalid data format. Expected an array.' }, { status: 400 });
        }

        const insertOrUpdate = db.prepare(`
            INSERT INTO printers (id, name, brand, model, ip, location, display_order, consumable_model)
            VALUES (@id, @name, @brand, @model, @ip, @location, @display_order, @consumable_model)
            ON CONFLICT(ip) DO UPDATE SET
                name = excluded.name,
                brand = excluded.brand,
                model = excluded.model,
                location = excluded.location,
                display_order = excluded.display_order,
                consumable_model = excluded.consumable_model
        `);

        // Use a transaction for safety
        const transaction = db.transaction((items) => {
            for (const item of items) {
                // Ensure required fields
                if (!item.ip || !item.brand || !item.model) continue;

                // We might not want to enforce ID matching because IDs are auto-increment.
                // However, if we are restoring a backup, preserving IDs is good IF they don't conflict.
                // But relying on IP as unique identifier is better for merging.
                // The query above UPSERTs on IP.

                // If we want to strictly respect IDs from the file, we can include ID.
                // But usually, it's safer to let the DB handle IDs if it's a new installation,
                // or match by IP.
                // The provided query uses INSERT ... VALUES (@id ...) which implies we try to use the ID.
                // If ID exists (and is PK), it might conflict.
                // But `printers` table usually has `id` as PK.
                // The constraint violation for `ON CONFLICT` acts on UNIQUE constraints.
                // ID is PK, so it is unique. IP is also UNIQUE.

                // Strategy:
                // If we are "Importing Device List", usually we want to sync.
                // Let's try to UPSERT on IP. ID usually shouldn't be forced unless we are doing a full restore.
                // If I omit @id from INSERT, it generates a new one.
                // If I include @id, it tries to use it.
                // Let's remove ID from the insert to avoid PK conflicts, relying on IP to identify the printer.

                insertOrUpdate.run({
                    id: item.id, // Trying to keep ID if possible? No, let's let SQLite handle IDs or just match by IP.
                    // Actually, if we just want to update the list, matching by IP is the most robust way for "devices".

                    // Let's adjust the query to ignore ID for insertion, but maybe we can't easily "update by ip" if we don't insert ID?
                    // No, `ON CONFLICT(ip)` works fine.

                    name: item.name || '',
                    brand: item.brand,
                    model: item.model,
                    ip: item.ip,
                    location: item.location || '',
                    display_order: item.display_order || 0,
                    consumable_model: item.consumable_model || ''
                });
            }
        });

        // Wait, if I use the query above:
        // `VALUES (@id, ...)` -> checks if ID exists. If ID is provided and exists, it might conflict on PK.
        // If IP exists, it conflicts on IP unique constraint.
        // It's complicated to handle both.
        // Let's simplified the import: Match by IP.
        // If IP exists -> Update.
        // If IP does not exist -> Insert (new ID).

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

        const safeTransaction = db.transaction((items) => {
            for (const item of items) {
                if (!item.ip) continue;
                upsertByIp.run({
                    name: item.name || '',
                    brand: item.brand || '',
                    model: item.model || '',
                    ip: item.ip,
                    location: item.location || '',
                    display_order: item.display_order || 0,
                    consumable_model: item.consumable_model || ''
                });
            }
        });

        safeTransaction(printers);

        return NextResponse.json({ success: true, count: printers.length });
    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
