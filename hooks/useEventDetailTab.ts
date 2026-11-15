'use client';

import { useEffect, useState } from 'react';

import { type EventDetailTab, parseEventsTab } from '@/lib/adminEvents';

function currentTab(): EventDetailTab {
    return typeof window === 'undefined' ? 'settings' : parseEventsTab(window.location.hash);
}

// Which section of the event page the hash has open. The tab links are plain hash links, so Back
// and a reload land on the same tab.
export function useEventDetailTab(): EventDetailTab {
    const [tab, setTab] = useState<EventDetailTab>(currentTab);

    useEffect(() => {
        function syncFromHash() {
            setTab(currentTab());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    return tab;
}
