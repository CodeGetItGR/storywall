import type { EventDetailResponseDto, EventPatchDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { formatEventDateParts } from '@/lib/datetime';
import { eventCapabilities } from '@/lib/eventCapabilities';
import { isModuleAvailable } from '@/lib/eventLifecycle';

// The parts of the Settings invite preview that open an editor of their own (KAN-228).
// The venue is a session, edited in the Schedule editor sheet, so it is not one of them.
export type SettingsPart = 'cover' | 'title' | 'date' | 'location' | 'description';

type PartsInput = Pick<EventDetailResponseDto, 'id' | 'status' | 'deletedAt' | 'suspended' | 'capabilities' | 'modules'>;

// A lite event has no guests, so no date or place to set.
export function showsDetailsParts(event: PartsInput): boolean {
    return eventCapabilities(event)?.showsDetailsSettings ?? true;
}

// The parts an event shows, in preview order.
export function getSettingsParts(event: PartsInput): SettingsPart[] {
    return showsDetailsParts(event) ? ['cover', 'title', 'date', 'location', 'description'] : ['cover', 'title', 'description'];
}

// Weddings and baptisms have a venue (the secondary session). It can be added only while the
// plan has the schedule, as the Schedule tool asks.
export function showsVenuePart(event: Pick<EventDetailResponseDto, 'eventType' | 'modules'> & PartsInput): boolean {
    const takesGuests = eventCapabilities(event)?.takesGuests ?? true;
    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey);
    return takesGuests && hasVenueConvention && isModuleAvailable(event.modules, 'schedule');
}

// Only the text fields that changed, trimmed. An editor sends nothing else.
export function changedTextFields<K extends keyof EventPatchDto>(
    values: Record<K, string>,
    initial: Record<K, string>,
): Partial<Record<K, string>> {
    const patch: Partial<Record<K, string>> = {};
    for (const key of Object.keys(values) as K[]) {
        const next = values[key].trim();
        if (next !== initial[key].trim()) patch[key] = next;
    }
    return patch;
}

// "Sat 12 Dec 2026 · 18:00", in the event's time zone as guests see it. Null without a date.
export function formatPreviewDateTime(locale: string, value: string | null | undefined, timeZone: string | null | undefined): string | null {
    const parts = formatEventDateParts(locale, value, null, timeZone);
    return parts ? `${parts.date} · ${parts.time}` : null;
}
