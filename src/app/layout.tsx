import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

import { TitleSync } from '@/components/TitleSync';

export const metadata: Metadata = {
    title: 'Printer Monitor', // Default, will be overridden by TitleSync
    description: 'Real-time network printer monitoring system',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <TitleSync />
                {children}
            </body>
        </html>
    );
}
