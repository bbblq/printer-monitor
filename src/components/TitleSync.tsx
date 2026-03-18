'use client';

import { useEffect, useState } from 'react';

export function TitleSync() {
    useEffect(() => {
        const updateTitle = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                const titleSetting = data.system_title || 'Printer Monitor';
                document.title = titleSetting;
            } catch (e) {
                console.error('Failed to sync title', e);
            }
        };

        updateTitle();

        const interval = setInterval(updateTitle, 30000);

        return () => clearInterval(interval);
    }, []);

    return null;
}
