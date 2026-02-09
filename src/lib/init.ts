// Server-side initialization for auto-refresh
import { startAutoRefresh } from './autoRefresh';
import { seedPrinters } from './printerService';
import { seedDefaultSettings } from './db';

let initialized = false;

export function initializeApp() {
    if (initialized) {
        return;
    }

    console.log('[App Init] Initializing printer monitoring system...');

    // Seed default settings
    seedDefaultSettings();

    // Seed printers if needed
    seedPrinters();

    // Start auto-refresh service
    startAutoRefresh();

    initialized = true;
    console.log('[App Init] Initialization complete');
}
