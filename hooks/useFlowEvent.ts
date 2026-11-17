'use client';

import { useEffect, useRef } from 'react';

import { type FlowEvent, trackFlowWhenReady } from '@/lib/flowTracking';

// Sends an event once when it first appears and again only when it changes. Null sends nothing.
export function useFlowEvent(event: FlowEvent | null): void {
    const key = event ? JSON.stringify(event) : null;
    const sentKey = useRef<string | null>(null);

    useEffect(() => {
        if (!key || sentKey.current === key) return;
        sentKey.current = key;
        trackFlowWhenReady(JSON.parse(key) as FlowEvent);
    }, [key]);
}
