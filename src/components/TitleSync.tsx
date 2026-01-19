'use client';

import { useEffect, useState } from 'react';

export function TitleSync() {
    useEffect(() => {
        // Function to fetch and update title
        const updateTitle = async () => {
            try {
                const res = await fetch('/api/settings');
                const settings = await res.json();
                const titleSetting = settings.find((s: any) => s.key === 'system_title');
                if (titleSetting && titleSetting.value) {
                    document.title = titleSetting.value;
                }
            } catch (e) {
                console.error('Failed to sync title', e);
            }
        };

        // Initial update
        updateTitle();

        // Optional: Poll for changes every minute or listen for an event?
        // For now, load once. The user can refresh if they change it. 
        // Or we can poll slowly.
        const interval = setInterval(updateTitle, 30000);

        return () => clearInterval(interval);
    }, []);

    return null;
}
