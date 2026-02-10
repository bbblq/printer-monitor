// Server-side initialization for auto-refresh
import { startAutoRefresh } from './autoRefresh';
import { seedPrinters } from './printerService';
import { seedDefaultSettings } from './db';
import { initModelRulesTable } from './modelRules';
import { startReportScheduler } from './scheduler';

export function initializeApp() {
    console.log('[App Init] Initializing printer monitoring system...');

    seedDefaultSettings();
    initModelRulesTable();
    seedPrinters();
    startReportScheduler();

    console.log('[App Init] Initialization complete');
}

// Auto-run initialization when imported
initializeApp();
