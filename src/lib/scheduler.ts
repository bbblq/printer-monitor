
import { getFeishuConfig, sendFeishuCard } from './notification';
import { generateDailyReport } from './report';
import { getBeijingClock, getBeijingDateKey } from './time';

let schedulerInterval: NodeJS.Timeout | null = null;
let lastSentDate: string | null = null; // 记录上次发送的日期 (YYYY-MM-DD)

export function startReportScheduler() {
    if (schedulerInterval) clearInterval(schedulerInterval);

    console.log('[Scheduler] Started');
    // 每分钟检查一次
    schedulerInterval = setInterval(() => {
        try {
            const config = getFeishuConfig();
            if (!config.enabled || !config.notifyDaily) return;

            const { hour: currentHour, minute: currentMinute } = getBeijingClock();
            const currentDate = getBeijingDateKey();

            const [targetHour, targetMinute] = (config.dailyTime || '09:00').split(':').map(Number);

            // 防重复：检查是否已在今天发送过
            if (currentHour === targetHour && currentMinute === targetMinute && lastSentDate !== currentDate) {
                console.log('[Scheduler] Sending daily report...');
                lastSentDate = currentDate; // 标记今天已发送
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
