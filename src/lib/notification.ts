import db from './db';
import { format } from 'datetime';

export type NotificationType = 'wechat_work' | 'feishu' | 'email';

export interface NotificationConfig {
    wechat_work?: {
        webhook_url: string;
    };
    feishu?: {
        webhook_url: string;
    };
    email?: {
        smtp_host: string;
        smtp_port: number;
        smtp_user: string;
        smtp_password: string;
        from_email: string;
        to_emails: string;
    };
}

export interface NotificationPayload {
    title: string;
    content: string;
    type?: 'alert' | 'report';
}

class NotificationService {
    private async sendWebHook(webhookUrl: string, data: any): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                return { success: false, error: `HTTP ${res.status}: ${await res.text()}` };
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async sendWeChatWork(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
        const settings = db.prepare('SELECT * FROM notification_settings WHERE type = ? AND enabled = 1').all('wechat_work') as any[];
        const results: { setting_id: number; result: { success: boolean; error?: string } }[] = [];

        for (const setting of settings) {
            const config = JSON.parse(setting.config);
            if (!config.webhook_url) continue;

            const data = {
                msgtype: 'text',
                text: {
                    content: `[${payload.title}]\n${payload.content}`,
                },
            };

            const result = await this.sendWebHook(config.webhook_url, data);
            results.push({ setting_id: setting.id, result });

            db.prepare(`
                INSERT INTO notification_history (setting_id, type, title, content, status, error)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(setting.id, 'wechat_work', payload.title, payload.content, result.success ? 'sent' : 'failed', result.error || null);
        }

        return { success: results.every(r => r.result.success), error: results.find(r => !r.result.success)?.result.error };
    }

    async sendFeishu(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
        const settings = db.prepare('SELECT * FROM notification_settings WHERE type = ? AND enabled = 1').all('feishu') as any[];
        const results: { setting_id: number; result: { success: boolean; error?: string } }[] = [];

        for (const setting of settings) {
            const config = JSON.parse(setting.config);
            if (!config.webhook_url) continue;

            const data = {
                msg_type: 'text',
                content: JSON.stringify({
                    text: `[${payload.title}]\n${payload.content}`,
                }),
            };

            const result = await this.sendWebHook(config.webhook_url, data);
            results.push({ setting_id: setting.id, result });

            db.prepare(`
                INSERT INTO notification_history (setting_id, type, title, content, status, error)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(setting.id, 'feishu', payload.title, payload.content, result.success ? 'sent' : 'failed', result.error || null);
        }

        return { success: results.every(r => r.result.success), error: results.find(r => !r.result.success)?.result.error };
    }

    async sendEmail(subject: string, body: string): Promise<{ success: boolean; error?: string }> {
        const settings = db.prepare('SELECT * FROM notification_settings WHERE type = ? AND enabled = 1').all('email') as any[];
        const results: { setting_id: number; result: { success: boolean; error?: string } }[] = [];

        for (const setting of settings) {
            const config = JSON.parse(setting.config);
            if (!config.smtp_host || !config.to_emails) continue;

            try {
                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.default.createTransport({
                    host: config.smtp_host,
                    port: config.smtp_port,
                    secure: config.smtp_port === 465,
                    auth: {
                        user: config.smtp_user,
                        pass: config.smtp_password,
                    },
                });

                await transporter.sendMail({
                    from: config.from_email || config.smtp_user,
                    to: config.to_emails,
                    subject: `[Printer Monitor] ${subject}`,
                    text: body,
                    html: body.replace(/\n/g, '<br>'),
                });

                results.push({ setting_id: setting.id, result: { success: true } });
            } catch (e: any) {
                results.push({ setting_id: setting.id, result: { success: false, error: e.message } });
            }

            db.prepare(`
                INSERT INTO notification_history (setting_id, type, title, content, status, error)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(setting.id, 'email', subject, body, results[results.length - 1].result.success ? 'sent' : 'failed', results[results.length - 1].result.error || null);
        }

        return { success: results.every(r => r.result.success), error: results.find(r => !r.result.success)?.result.error };
    }

    async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
        const errors: string[] = [];

        const wxResult = await this.sendWeChatWork(payload);
        if (!wxResult.success) errors.push(`微信: ${wxResult.error}`);

        const fsResult = await this.sendFeishu(payload);
        if (!fsResult.success) errors.push(`飞书: ${fsResult.error}`);

        const emailResult = await this.sendEmail(payload.title, payload.content);
        if (!emailResult.success) errors.push(`邮件: ${emailResult.error}`);

        return { success: errors.length === 0, error: errors.join('; ') };
    }
}

export const notificationService = new NotificationService();

export function getAllNotificationSettings() {
    return db.prepare('SELECT * FROM notification_settings ORDER BY id').all() as any[];
}

export function getNotificationSetting(id: number) {
    return db.prepare('SELECT * FROM notification_settings WHERE id = ?').get(id) as any | undefined;
}

export function createNotificationSetting(data: {
    name: string;
    type: NotificationType;
    config: NotificationConfig;
    enabled?: number;
    alert_low_percent?: number;
    alert_empty?: number;
    alert_replacement?: number;
    report_enabled?: number;
    report_cron?: string;
    report_recipients?: string;
}) {
    return db.prepare(`
        INSERT INTO notification_settings (name, type, config, enabled, alert_low_percent, alert_empty, alert_replacement, report_enabled, report_cron, report_recipients)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.name,
        data.type,
        JSON.stringify(data.config),
        data.enabled ?? 0,
        data.alert_low_percent ?? 10,
        data.alert_empty ?? 1,
        data.alert_replacement ?? 1,
        data.report_enabled ?? 0,
        data.report_cron ?? '0 9 * * 1',
        data.report_recipients || null
    );
}

export function updateNotificationSetting(id: number, data: Partial<{
    name: string;
    config: NotificationConfig;
    enabled: number;
    alert_low_percent: number;
    alert_empty: number;
    alert_replacement: number;
    report_enabled: number;
    report_cron: string;
    report_recipients: string;
}>) {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(data.config)); }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled); }
    if (data.alert_low_percent !== undefined) { updates.push('alert_low_percent = ?'); values.push(data.alert_low_percent); }
    if (data.alert_empty !== undefined) { updates.push('alert_empty = ?'); values.push(data.alert_empty); }
    if (data.alert_replacement !== undefined) { updates.push('alert_replacement = ?'); values.push(data.alert_replacement); }
    if (data.report_enabled !== undefined) { updates.push('report_enabled = ?'); values.push(data.report_enabled); }
    if (data.report_cron !== undefined) { updates.push('report_cron = ?'); values.push(data.report_cron); }
    if (data.report_recipients !== undefined) { updates.push('report_recipients = ?'); values.push(data.report_recipients); }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return db.prepare(`UPDATE notification_settings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteNotificationSetting(id: number) {
    return db.prepare('DELETE FROM notification_settings WHERE id = ?').run(id);
}

export function getNotificationHistory(limit: number = 50) {
    return db.prepare(`
        SELECT h.*, s.name as setting_name
        FROM notification_history h
        LEFT JOIN notification_settings s ON h.setting_id = s.id
        ORDER BY h.sent_at DESC
        LIMIT ?
    `).all(limit);
}
