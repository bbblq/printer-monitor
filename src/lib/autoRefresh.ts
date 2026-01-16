import { refreshAllPrinters, getSetting } from './printerService';

let intervalId: NodeJS.Timeout | null = null;
let currentInterval: number | null = null;

export function startAutoRefresh() {
    // Read interval from database, default to 15 minutes
    const intervalStr = getSetting('refresh_interval') || '15';
    const intervalMinutes = parseInt(intervalStr, 10) || 15;
    const intervalMs = intervalMinutes * 60 * 1000;

    // 如果已经在运行且频率没变，不需要重启
    if (intervalId && currentInterval === intervalMs) {
        return;
    }

    if (intervalId) {
        stopAutoRefresh();
    }

    currentInterval = intervalMs;
    console.log(`[Auto-Refresh] Starting automatic printer status refresh every ${intervalMinutes} minutes`);

    intervalId = setInterval(async () => {
        const now = new Date().toISOString();
        console.log(`[Auto-Refresh] Running scheduled refresh at ${now}`);

        try {
            await refreshAllPrinters();
            console.log('[Auto-Refresh] Refresh completed successfully');
        } catch (error) {
            console.error('[Auto-Refresh] Error during scheduled refresh:', error);
        }
    }, intervalMs);

    // 立即执行一次初始刷新
    console.log('[Auto-Refresh] Running initial refresh...');
    refreshAllPrinters().catch(err => {
        console.error('[Auto-Refresh] Error during initial refresh:', err);
    });
}

export function stopAutoRefresh() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        currentInterval = null;
        console.log('[Auto-Refresh] Stopped automatic printer status refresh');
    }
}

export function restartAutoRefresh() {
    stopAutoRefresh();
    startAutoRefresh();
}

// 导出当前状态
export function isAutoRefreshRunning(): boolean {
    return intervalId !== null;
}
