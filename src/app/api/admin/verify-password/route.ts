import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/printerService';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();
        const storedPassword = getSetting('admin_password') || 'admin'; // Fallback to 'admin'

        if (password === storedPassword) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
        }
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
