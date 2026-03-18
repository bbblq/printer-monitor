import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import path from 'path';

// Database setup (same as main app)
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'printers.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Types
interface Printer {
    id: number;
    name: string;
    brand: string;
    model: string;
    ip: string;
    location: string;
    display_order: number;
    consumable_model: string;
    status: string;
    is_online: number;
    last_updated: string;
}

interface Supply {
    printer_id: number;
    color: string;
    level: number;
    max_capacity: number;
    is_binary: number;
    percent: number;
}

// Helper functions
function getAllPrinters(): Printer[] {
    return db.prepare(`
        SELECT p.*, COALESCE(s.status, 'Unknown') as status, COALESCE(s.is_online, 0) as is_online, s.last_updated
        FROM printers p
        LEFT JOIN printer_status s ON p.id = s.printer_id
        ORDER BY p.display_order ASC, p.id ASC
    `).all() as Printer[];
}

function getPrinterSupplies(printerId: number): Supply[] {
    const supplies = db.prepare('SELECT * FROM supplies_current WHERE printer_id = ?').all(printerId) as Supply[];
    return supplies.map(s => ({
        ...s,
        percent: s.max_capacity > 0 ? Math.round((s.level / s.max_capacity) * 100) : 0
    }));
}

function getReplacementHistory(printerId?: number): unknown[] {
    if (printerId) {
        return db.prepare('SELECT * FROM supplies_history WHERE printer_id = ? ORDER BY replaced_at DESC').all(printerId);
    }
    return db.prepare('SELECT * FROM supplies_history ORDER BY replaced_at DESC LIMIT 100').all();
}

function getAllSettings(): Record<string, string> {
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

function getOfflinePrinters(): Printer[] {
    return db.prepare(`
        SELECT p.*, COALESCE(s.status, 'Unknown') as status, COALESCE(s.is_online, 0) as is_online, s.last_updated
        FROM printers p
        LEFT JOIN printer_status s ON p.id = s.printer_id
        WHERE s.is_online = 0 OR s.is_online IS NULL
    `).all() as Printer[];
}

function getLowInkPrinters(threshold = 20): (Printer & { supplies: Supply[] })[] {
    const printers = getAllPrinters();
    const lowInk: (Printer & { supplies: Supply[] })[] = [];

    for (const printer of printers) {
        if (printer.is_online !== 1) continue;
        const supplies = getPrinterSupplies(printer.id);
        const lowSupplies = supplies.filter(s => s.percent <= threshold);
        if (lowSupplies.length > 0) {
            lowInk.push({ ...printer, supplies: lowSupplies });
        }
    }
    return lowInk;
}

function getPrinterSummary(): string {
    const printers = getAllPrinters();
    const online = printers.filter(p => p.is_online === 1).length;
    const offline = printers.filter(p => p.is_online !== 1).length;
    const lowInk = getLowInkPrinters();

    return `Printer Monitor Summary

Total: ${printers.length} printers
Online: ${online}
Offline: ${offline}
Low Ink: ${lowInk} printers`;
}

// Create MCP Server
const server = new McpServer({
    name: 'printer-monitor',
    version: '1.0.0',
});

// Tools
server.tool(
    'get_printers',
    'Get all printers with their status and supplies',
    {},
    async () => {
        const printers = getAllPrinters().map(p => ({
            ...p,
            supplies: getPrinterSupplies(p.id),
        }));
        return {
            content: [{ type: 'text', text: JSON.stringify(printers, null, 2) }],
        };
    }
);

server.tool(
    'get_printer_detail',
    'Get detailed information for a specific printer',
    {
        printer_id: z.number().describe('The printer ID'),
    },
    async ({ printer_id }) => {
        const printer = getAllPrinters().find(p => p.id === printer_id);
        if (!printer) {
            return {
                content: [{ type: 'text', text: `Printer not found: ${printer_id}` }],
                isError: true,
            };
        }
        const supplies = getPrinterSupplies(printer_id);
        return {
            content: [{ type: 'text', text: JSON.stringify({ ...printer, supplies }, null, 2) }],
        };
    }
);

server.tool(
    'get_printer_supplies',
    'Get supply levels for a specific printer',
    {
        printer_id: z.number().describe('The printer ID'),
    },
    async ({ printer_id }) => {
        return {
            content: [{ type: 'text', text: JSON.stringify(getPrinterSupplies(printer_id), null, 2) }],
        };
    }
);

server.tool(
    'get_printer_history',
    'Get replacement history for a printer',
    {
        printer_id: z.number().optional().describe('The printer ID (optional, returns all if not specified)'),
    },
    async ({ printer_id }) => {
        return {
            content: [{ type: 'text', text: JSON.stringify(getReplacementHistory(printer_id), null, 2) }],
        };
    }
);

server.tool(
    'get_offline_printers',
    'Get list of offline printers',
    {},
    async () => {
        return {
            content: [{ type: 'text', text: JSON.stringify(getOfflinePrinters(), null, 2) }],
        };
    }
);

server.tool(
    'get_low_ink_printers',
    'Get printers with low ink/supply levels',
    {
        threshold: z.number().optional().describe('Percentage threshold (default: 20)'),
    },
    async ({ threshold = 20 }) => {
        return {
            content: [{ type: 'text', text: JSON.stringify(getLowInkPrinters(threshold), null, 2) }],
        };
    }
);

server.tool(
    'get_system_summary',
    'Get overall system summary',
    {},
    async () => {
        return {
            content: [{ type: 'text', text: getPrinterSummary() }],
        };
    }
);

server.tool(
    'search_printers',
    'Search printers by location, brand, model, or IP',
    {
        query: z.string().describe('Search query'),
    },
    async ({ query }) => {
        const q = query.toLowerCase();
        const printers = getAllPrinters().filter(p =>
            p.location.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.model.toLowerCase().includes(q) ||
            p.ip.includes(q)
        );
        return {
            content: [{ type: 'text', text: JSON.stringify(printers, null, 2) }],
        };
    }
);

// Resources
server.resource(
    'printer-summary',
    'printer://summary',
    'Overall printer monitoring summary',
    async () => ({
        contents: [{
            uri: 'printer://summary',
            text: getPrinterSummary(),
        }],
    })
);

server.resource(
    'printer-list',
    'printer://list',
    'List of all printers with status',
    async () => ({
        contents: [{
            uri: 'printer://list',
            text: JSON.stringify(getAllPrinters()),
        }],
    })
);

server.resource(
    'offline-printers',
    'printer://offline',
    'List of offline printers',
    async () => ({
        contents: [{
            uri: 'printer://offline',
            text: JSON.stringify(getOfflinePrinters()),
        }],
    })
);

server.resource(
    'low-ink-printers',
    'printer://low-ink',
    'Printers with ink level below 20%',
    async () => ({
        contents: [{
            uri: 'printer://low-ink',
            text: JSON.stringify(getLowInkPrinters()),
        }],
    })
);

server.resource(
    'system-settings',
    'printer://settings',
    'System configuration settings',
    async () => ({
        contents: [{
            uri: 'printer://settings',
            text: JSON.stringify(getAllSettings()),
        }],
    })
);

// Start server
const transport = new StdioServerTransport();
(async () => {
    await server.connect(transport);
})();
