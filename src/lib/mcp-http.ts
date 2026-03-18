import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IncomingMessage, ServerResponse, createServer } from 'http';
import { z } from 'zod';
import Database from 'better-sqlite3';
import path from 'path';

// Database setup
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

// Tool handlers map
const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>> = {};

// Tools - store handlers directly
server.tool(
    'get_printers',
    'Get all printers with their status and supplies',
    {},
    async () => {
        const printers = getAllPrinters().map(p => ({
            ...p,
            supplies: getPrinterSupplies(p.id),
        }));
        return { content: [{ type: 'text', text: JSON.stringify(printers, null, 2) }] };
    }
);

server.tool(
    'get_printer_detail',
    'Get detailed information for a specific printer',
    { printer_id: z.number().describe('The printer ID') },
    async ({ printer_id }) => {
        const printer = getAllPrinters().find(p => p.id === printer_id);
        if (!printer) {
            return { content: [{ type: 'text', text: `Printer not found: ${printer_id}` }], isError: true };
        }
        const supplies = getPrinterSupplies(printer_id as number);
        return { content: [{ type: 'text', text: JSON.stringify({ ...printer, supplies }, null, 2) }] };
    }
);

server.tool(
    'get_printer_supplies',
    'Get supply levels for a specific printer',
    { printer_id: z.number().describe('The printer ID') },
    async ({ printer_id }) => {
        return { content: [{ type: 'text', text: JSON.stringify(getPrinterSupplies(printer_id as number), null, 2) }] };
    }
);

server.tool(
    'get_printer_history',
    'Get replacement history for a printer',
    { printer_id: z.number().optional().describe('The printer ID') },
    async ({ printer_id }) => {
        return { content: [{ type: 'text', text: JSON.stringify(getReplacementHistory(printer_id as number | undefined), null, 2) }] };
    }
);

server.tool(
    'get_offline_printers',
    'Get list of offline printers',
    {},
    async () => {
        return { content: [{ type: 'text', text: JSON.stringify(getOfflinePrinters(), null, 2) }] };
    }
);

server.tool(
    'get_low_ink_printers',
    'Get printers with low ink/supply levels',
    { threshold: z.number().optional().describe('Percentage threshold (default: 20)') },
    async ({ threshold = 20 }) => {
        return { content: [{ type: 'text', text: JSON.stringify(getLowInkPrinters(threshold as number), null, 2) }] };
    }
);

server.tool(
    'get_system_summary',
    'Get overall system summary',
    {},
    async () => {
        return { content: [{ type: 'text', text: getPrinterSummary() }] };
    }
);

server.tool(
    'search_printers',
    'Search printers by location, brand, model, or IP',
    { query: z.string().describe('Search query') },
    async ({ query }) => {
        const q = (query as string).toLowerCase();
        const printers = getAllPrinters().filter(p =>
            p.location.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.model.toLowerCase().includes(q) ||
            p.ip.includes(q)
        );
        return { content: [{ type: 'text', text: JSON.stringify(printers, null, 2) }] };
    }
);

// Get the underlying server
const mcpServer = server.server;

// HTTP Server with proper MCP handling
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    try {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }

        if (!body) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Empty request body' }));
            return;
        }

        const request = JSON.parse(body);
        const id = request.id;
        const method = request.method;
        const params = request.params || {};

        let result: unknown;

        // Direct tool handlers - bypass MCP server internals
        if (method === 'tools/list') {
            result = {
                tools: [
                    { name: 'get_printers', description: 'Get all printers with their status and supplies', inputSchema: { type: 'object', properties: {} } },
                    { name: 'get_printer_detail', description: 'Get detailed information for a specific printer', inputSchema: { type: 'object', properties: { printer_id: { type: 'number' } }, required: ['printer_id'] } },
                    { name: 'get_printer_supplies', description: 'Get supply levels for a specific printer', inputSchema: { type: 'object', properties: { printer_id: { type: 'number' } }, required: ['printer_id'] } },
                    { name: 'get_printer_history', description: 'Get replacement history for a printer', inputSchema: { type: 'object', properties: { printer_id: { type: 'number' } } } },
                    { name: 'get_offline_printers', description: 'Get list of offline printers', inputSchema: { type: 'object', properties: {} } },
                    { name: 'get_low_ink_printers', description: 'Get printers with low ink/supply levels', inputSchema: { type: 'object', properties: { threshold: { type: 'number' } } } },
                    { name: 'get_system_summary', description: 'Get overall system summary', inputSchema: { type: 'object', properties: {} } },
                    { name: 'search_printers', description: 'Search printers by location, brand, model, or IP', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
                ]
            };
        } else if (method === 'tools/call') {
            const toolName = params.name;
            const args = params.arguments || {};

            try {
                if (toolName === 'get_printers') {
                    const printers = getAllPrinters().map(p => ({ ...p, supplies: getPrinterSupplies(p.id) }));
                    result = { content: [{ type: 'text', text: JSON.stringify(printers, null, 2) }] };
                } else if (toolName === 'get_printer_detail') {
                    const printer = getAllPrinters().find(p => p.id === args.printer_id);
                    if (!printer) {
                        result = { content: [{ type: 'text', text: `Printer not found: ${args.printer_id}` }], isError: true };
                    } else {
                        result = { content: [{ type: 'text', text: JSON.stringify({ ...printer, supplies: getPrinterSupplies(printer.id) }, null, 2) }] };
                    }
                } else if (toolName === 'get_printer_supplies') {
                    result = { content: [{ type: 'text', text: JSON.stringify(getPrinterSupplies(args.printer_id), null, 2) }] };
                } else if (toolName === 'get_printer_history') {
                    result = { content: [{ type: 'text', text: JSON.stringify(getReplacementHistory(args.printer_id), null, 2) }] };
                } else if (toolName === 'get_offline_printers') {
                    result = { content: [{ type: 'text', text: JSON.stringify(getOfflinePrinters(), null, 2) }] };
                } else if (toolName === 'get_low_ink_printers') {
                    result = { content: [{ type: 'text', text: JSON.stringify(getLowInkPrinters(args.threshold || 20), null, 2) }] };
                } else if (toolName === 'get_system_summary') {
                    result = { content: [{ type: 'text', text: getPrinterSummary() }] };
                } else if (toolName === 'search_printers') {
                    const q = String(args.query || '').toLowerCase();
                    const printers = getAllPrinters().filter(p =>
                        p.location.toLowerCase().includes(q) ||
                        p.brand.toLowerCase().includes(q) ||
                        p.model.toLowerCase().includes(q) ||
                        p.ip.includes(q)
                    );
                    result = { content: [{ type: 'text', text: JSON.stringify(printers, null, 2) }] };
                } else {
                    result = { content: [{ type: 'text', text: `Tool not found: ${toolName}` }], isError: true };
                }
            } catch (e: any) {
                result = { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
            }
        } else if (method === 'resources/list') {
            result = { resources: [] };
        } else {
            result = { error: `Unknown method: ${method}` };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));

    } catch (error) {
        console.error('Error handling request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            jsonrpc: '2.0', 
            id: null, 
            error: { code: -32603, message: String(error) } 
        }));
    }
};

const httpServer = createServer(requestHandler);

httpServer.listen(PORT, HOST, () => {
    console.log(``);
    console.log(`🎯 MCP HTTP Server running at http://${HOST}:${PORT}/mcp`);
    console.log(`🌐 Website: http://localhost:3000`);
    console.log(`📋 Available tools:`);
    console.log(`   - get_printers`);
    console.log(`   - get_printer_detail`);
    console.log(`   - get_printer_supplies`);
    console.log(`   - get_printer_history`);
    console.log(`   - get_offline_printers`);
    console.log(`   - get_low_ink_printers`);
    console.log(`   - get_system_summary`);
    console.log(`   - search_printers`);
    console.log(``);
});

// Keep server running
process.on('SIGTERM', () => {
    httpServer.close();
    db.close();
    process.exit(0);
});
