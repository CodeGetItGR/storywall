import type { EventTypeConvention } from '@/lib/api/types';

// An event type as it appears in a URL: BABY_SHOWER → baby-shower.
export function eventTypeSlug(eventTypeKey: EventTypeConvention): string {
    return eventTypeKey.toLowerCase().replaceAll('_', '-');
}

// A slug as typed in a link, in the same form (Baby_Shower → baby-shower). Null when blank.
export function normalizeEventTypeSlug(value: string | null): string | null {
    const slug = value?.trim().toLowerCase().replaceAll('_', '-');
    return slug ? slug : null;
}
