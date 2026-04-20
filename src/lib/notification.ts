
import db from './db';

interface FeishuConfig {
    webhookUrl: string;
    enabled: boolean;
    notifyLow: boolean;
    notifyReplacement: boolean;
    notifyDaily: boolean;
    dailyTime: string;
}

export function getFeishuConfig(): FeishuConfig {
    const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'feishu_%'").all() as { key: string, value: string }[];
    const config: any = {};
    for (const s of settings) {
        config[s.key] = s.value;
    }
    return {
        webhookUrl: config.feishu_webhook_url || '',
        enabled: config.feishu_enabled === '1',
        notifyLow: config.feishu_notify_low !== '0', // Default true
        notifyReplacement: config.feishu_notify_replacement !== '0', // Default true
        notifyDaily: config.feishu_notify_daily === '1', // Default false
        dailyTime: config.feishu_daily_time || '09:00',
    };
}

export async function sendFeishuCard(title: string, markdownContent: string, color: 'blue' | 'red' | 'orange' | 'green' = 'blue') {
    const config = getFeishuConfig();
    if (!config.enabled || !config.webhookUrl) {
        console.log('[Feishu] Disabled or no webhook URL');
        return false;
    }

    // 获取正确的北京时间
    const now = new Date();
    // getTimezoneOffset returns the offset from UTC to local time in minutes
    // For UTC+8, it returns -480 (local is 480 minutes ahead of UTC)
    // Formula: UTC = local_time - offset(minutes) = now.getTime() - (offset * 60000)
    // Then add 8 hours for Beijing time
    const utc = now.getTime() - (now.getTimezoneOffset() * 60000);
    const beijingOffset = 8 * 60 * 60 * 1000; // UTC+8 in milliseconds
    const beijingTime = new Date(utc + beijingOffset);
    const timeStr = `${beijingTime.getFullYear()}/${String(beijingTime.getMonth() + 1).padStart(2, '0')}/${String(beijingTime.getDate()).padStart(2, '0')} ${String(beijingTime.getHours()).padStart(2, '0')}:${String(beijingTime.getMinutes()).padStart(2, '0')}:${String(beijingTime.getSeconds()).padStart(2, '0')}`;

    const card = {
        msg_type: 'interactive',
        card: {
            header: {
                title: {
                    tag: 'plain_text',
                    content: title
                },
                template: color
            },
            elements: [
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: markdownContent
                    }
                },
                {
                    tag: 'note',
                    elements: [
                        {
                            tag: 'plain_text',
                            content: `时间: ${timeStr}`
                        }
                    ]
                }
            ]
        }
    };

    try {
        const res = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(card)
        });
        const result = await res.json();
        if (result.code !== 0) {
            console.error('[Feishu] Error:', result);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[Feishu] Exception:', e);
        return false;
    }
}
