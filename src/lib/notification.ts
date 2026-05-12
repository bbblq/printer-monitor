
import db from './db';
import { formatBeijingDateTime } from './time';

interface FeishuConfig {
    webhookUrl: string;
    enabled: boolean;
    notifyLow: boolean;
    notifyReplacement: boolean;
    notifyDaily: boolean;
    dailyTime: string;
    footerUrl: string;
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
        notifyLow: config.feishu_notify_low !== '0',
        notifyReplacement: config.feishu_notify_replacement !== '0',
        notifyDaily: config.feishu_notify_daily === '1',
        dailyTime: config.feishu_daily_time || '09:00',
        footerUrl: config.feishu_footer_url || ''
    };
}

export async function sendFeishuCard(title: string, markdownContent: string, color: 'blue' | 'red' | 'orange' | 'green' = 'blue') {
    const config = getFeishuConfig();
    if (!config.enabled || !config.webhookUrl) {
        console.log('[Feishu] Disabled or no webhook URL');
        return false;
    }

const timeStr = formatBeijingDateTime();

    const elements: any[] = [
        {
            tag: 'div',
            text: {
                tag: 'lark_md',
                content: markdownContent
            }
        }
    ];

    if (config.footerUrl) {
        elements.push({
            tag: 'div',
            text: {
                tag: 'lark_md',
                content: `[🔗 View Dashboard](${config.footerUrl})`
            }
        });
    }

    elements.push({
        tag: 'note',
        elements: [
            {
                tag: 'plain_text',
                content: `时间: ${timeStr}`
            }
        ]
    });

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
            elements
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
