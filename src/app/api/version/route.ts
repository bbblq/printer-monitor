import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
    try {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
        return NextResponse.json({
            version: packageJson.version,
            name: packageJson.name
        });
    } catch {
        return NextResponse.json({
            version: 'unknown',
            name: 'printer-monitor'
        });
    }
}
