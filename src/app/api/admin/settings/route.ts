import { NextResponse } from 'next/server';
import { getAllSettings, updateSetting } from '@/lib/printerService';
import { restartAutoRefresh } from '@/lib/autoRefresh';

export async function GET() {
    try {
        const settings = getAllSettings();
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);
        return NextResponse.json(settingsMap);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        for (const [key, value] of Object.entries(body)) {
            updateSetting(key, value as string);
        }

        // If refresh_interval was updated, restart the auto-refresh service
        if (body.refresh_interval) {
            restartAutoRefresh();
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
