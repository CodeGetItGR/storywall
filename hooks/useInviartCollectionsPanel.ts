'use client';

import { useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminInviartCollections } from '@/hooks/useAdminInviartCollections';
import type { EventTypeConvention } from '@/lib/api/types';

export type InviartCollectionRow = { eventType: EventTypeConvention; collectionHandle: string | null };

// One row per event type, with its INVIART collection when it has one, and which row is open.
export function useInviartCollectionsPanel() {
    const eventTypes = useAdminPlatformEventTypes();
    const collections = useAdminInviartCollections();
    const [open, setOpen] = useState<InviartCollectionRow | null>(null);

    const rows = useMemo<InviartCollectionRow[]>(() => {
        const handles = new Map((collections.data ?? []).map((row) => [row.eventType, row.collectionHandle]));
        return (eventTypes.data ?? []).map((eventType) => ({
            eventType: eventType.eventTypeKey,
            collectionHandle: handles.get(eventType.eventTypeKey) ?? null,
        }));
    }, [collections.data, eventTypes.data]);

    return {
        rows,
        isLoading: eventTypes.isLoading || collections.isLoading,
        error: eventTypes.error ?? collections.error,
        open,
        openRow: setOpen,
        close: () => setOpen(null),
    };
}
