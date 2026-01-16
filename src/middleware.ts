import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Only protect /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Exception for login page
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        const authCookie = request.cookies.get('admin_auth');

        // Simple check - in real app use robust tokens
        if (authCookie?.value !== 'true') {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
