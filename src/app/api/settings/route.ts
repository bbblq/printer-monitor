import { NextResponse } from 'next/server';
import { getAllSettings } from '@/lib/printerService';

export async function GET() {
    try {
        const settingsArr = getAllSettings();
        const settings = settingsArr.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        // Return only public settings
        return NextResponse.json({
            system_title: settings['system_title'] || 'Printer Monitor',
            system_logo: settings['system_logo'] || '',
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
