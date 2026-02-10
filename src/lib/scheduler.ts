
import { getFeishuConfig, sendFeishuCard } from './notification';
import { generateDailyReport } from './report';

let schedulerInterval: NodeJS.Timeout | null = null;

export function startReportScheduler() {
    if (schedulerInterval) clearInterval(schedulerInterval);

    console.log('[Scheduler] Started');
    // 每分钟检查一次
    schedulerInterval = setInterval(() => {
        try {
            const config = getFeishuConfig();
            if (!config.enabled || !config.notifyDaily) return;

            const now = new Date();
            // 强制使用北京时间 (UTC+8)
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const beijingTime = new Date(utc + (3600000 * 8));

            const currentHour = beijingTime.getHours();
            const currentMinute = beijingTime.getMinutes();

            const [targetHour, targetMinute] = (config.dailyTime || '09:00').split(':').map(Number);

            if (currentHour === targetHour && currentMinute === targetMinute) {
                console.log('[Scheduler] Sending daily report...');
                const report = generateDailyReport();
                sendFeishuCard('📊 每日耗材报表', report, 'blue').catch(console.error);
            }
        } catch (e) {
            console.error('[Scheduler] Error checking schedule:', e);
        }
    }, 60 * 1000); // 60秒
}

export function stopReportScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Stopped');
    }
}

export async function sendReportNow() {
    try {
        const report = generateDailyReport();
        const result = await sendFeishuCard('📊 每日耗材报表 (立即发送)', report, 'blue');
        return { success: result, message: result ? '已发送' : '发送失败' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
