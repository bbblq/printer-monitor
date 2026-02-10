import { notificationService } from './notification';
import { generateDailyReport } from './report';
import { getAllNotificationSettings } from './notification';

let schedulerInterval: NodeJS.Timeout | null = null;

function parseCron(cron: string): { hour: number; minute: number; dayOfWeek?: number } {
    const parts = cron.split(' ');
    if (parts.length < 5) {
        return { hour: 9, minute: 0 };
    }
    const minute = parseInt(parts[1]) || 0;
    const hour = parseInt(parts[2]) || 9;
    const dayOfWeek = parts[5] ? parseInt(parts[5]) : undefined;
    return { hour, minute, dayOfWeek };
}

export function startReportScheduler() {
    if (schedulerInterval) {
        console.log('[Report Scheduler] Already running');
        return;
    }

    console.log('[Report Scheduler] Starting...');

    const checkAndSend = () => {
        const settings = getAllNotificationSettings() as any[];
        const now = new Date();

        for (const setting of settings) {
            if (setting.report_enabled !== 1) continue;

            const { hour, minute, dayOfWeek } = parseCron(setting.report_cron || '0 9 * * 1');

            if (now.getHours() === hour && now.getMinutes() === minute) {
                if (dayOfWeek !== undefined && dayOfWeek !== -1) {
                    if (now.getDay() !== dayOfWeek) continue;
                }

                console.log(`[Report Scheduler] Sending report for setting ${setting.id}...`);
                const report = generateDailyReport();
                notificationService.send({
                    title: '📊 打印机耗材日报',
                    content: report,
                    type: 'report',
                });
            }
        }
    };

    checkAndSend();
    schedulerInterval = setInterval(checkAndSend, 60000);
}

export function stopReportScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Report Scheduler] Stopped');
    }
}

export function sendReportNow(): { success: boolean; message: string } {
    try {
        const report = generateDailyReport();
        notificationService.send({
            title: '📊 打印机耗材报表（立即发送）',
            content: report,
            type: 'report',
        });
        return { success: true, message: '报表已发送' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
