'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminDemoEvents } from '@/hooks/useAdminDemoEvents';
import { parseDemoEventsHash } from '@/lib/adminDemoEventsRouting';
import type { DemoEventResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

export type DemoEventRow = {
    eventType: PlatformEventTypeResponseDto;
    demo: DemoEventResponseDto | null;
};

function currentEventTypeKey(): string | null {
    return typeof window === 'undefined' ? null : parseDemoEventsHash(window.location.hash);
}

// One row per event type, joined with that type's demo (if any). The hash picks the detail page.
export function useDemoEventsPanel() {
    const eventTypesQuery = useAdminPlatformEventTypes();
    const demoEventsQuery = useAdminDemoEvents();
    const [selectedKey, setSelectedKey] = useState<string | null>(currentEventTypeKey);

    useEffect(() => {
        function syncFromHash() {
            setSelectedKey(currentEventTypeKey());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const rows = useMemo<DemoEventRow[]>(() => {
        const demos = new Map((demoEventsQuery.data ?? []).map((demo) => [demo.eventTypeKey, demo]));
        return [...(eventTypesQuery.data ?? [])]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((eventType) => ({ eventType, demo: demos.get(eventType.eventTypeKey) ?? null }));
    }, [demoEventsQuery.data, eventTypesQuery.data]);

    return {
        rows,
        selectedKey,
        selectedRow: rows.find((row) => row.eventType.eventTypeKey === selectedKey) ?? null,
        isLoading: eventTypesQuery.isLoading || demoEventsQuery.isLoading,
        error: eventTypesQuery.error ?? demoEventsQuery.error,
    };
}
