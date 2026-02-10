import { NextResponse } from 'next/server';
import { getAllNotificationSettings, getNotificationHistory, createNotificationSetting, updateNotificationSetting, deleteNotificationSetting } from '@/lib/notification';
import { sendReportNow } from '@/lib/scheduler';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        if (type === 'history') {
            const limit = parseInt(searchParams.get('limit') || '50');
            const history = getNotificationHistory(limit);
            return NextResponse.json({ success: true, data: history });
        }

        const settings = getAllNotificationSettings();
        return NextResponse.json({ success: true, data: settings });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'send_report') {
            const result = sendReportNow();
            return NextResponse.json(result);
        }

        const { name, type, config, enabled, alert_low_percent, alert_empty, alert_replacement, report_enabled, report_cron, report_recipients } = body;

        if (!name || !type || !config) {
            return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
        }

        createNotificationSetting({
            name,
            type,
            config,
            enabled: enabled ? 1 : 0,
            alert_low_percent,
            alert_empty: alert_empty ? 1 : 0,
            alert_replacement: alert_replacement ? 1 : 0,
            report_enabled: report_enabled ? 1 : 0,
            report_cron,
            report_recipients,
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: '缺少设置ID' }, { status: 400 });
        }

        updateNotificationSetting(id, data);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get('id') || '0');

        if (!id) {
            return NextResponse.json({ error: '缺少设置ID' }, { status: 400 });
        }

        deleteNotificationSetting(id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
