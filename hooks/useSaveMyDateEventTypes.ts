'use client';

import { useCallback, useMemo } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import { useLocalizedText } from '@/hooks/useLocalizedText';

export type SaveMyDateEventTypes = { options: EventTypeOption[]; labelOf: (key: string) => string };

// Every platform event type, in the registry's order, with its name in the admin's language. A key
// the registry doesn't know shows as the key.
export function useSaveMyDateEventTypes(): SaveMyDateEventTypes {
    const localizedText = useLocalizedText();
    const eventTypesQuery = useAdminPlatformEventTypes();

    const options = useMemo<EventTypeOption[]>(
        () => (eventTypesQuery.data ?? []).map((eventType) => ({ key: eventType.eventTypeKey, label: localizedText(eventType.name, eventType.eventTypeKey) })),
        [eventTypesQuery.data, localizedText],
    );
    const labels = useMemo(() => Object.fromEntries(options.map((option) => [option.key, option.label])) as Record<string, string>, [options]);
    const labelOf = useCallback((key: string) => labels[key] ?? key, [labels]);

    return { options, labelOf };
}
