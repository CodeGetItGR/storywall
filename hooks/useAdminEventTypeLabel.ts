'use client';

import { useCallback } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useLocalizedEventTypeName } from '@/hooks/useLocalizedEventTypeName';

// The event type's localized name; its key until the registry has loaded, or if it is gone from it.
export function useAdminEventTypeLabel() {
    const eventTypesQuery = useAdminPlatformEventTypes();
    const eventTypeName = useLocalizedEventTypeName();

    return useCallback(
        (eventTypeKey: string) => {
            const eventType = eventTypesQuery.data?.find((candidate) => candidate.eventTypeKey === eventTypeKey);
            return eventType ? eventTypeName(eventType) : eventTypeKey;
        },
        [eventTypeName, eventTypesQuery.data],
    );
}
