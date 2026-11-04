import type { EventDetailsRequestDto } from '@/lib/api/types';
import { getCurrentTimezone } from '@/lib/timezones';

export type EventDetailsValues = {
    startAt: string;
    timezone: string;
    locationName: string;
    locationAddress: string;
    mapsUrl: string;
};

export function emptyEventDetailsValues(): EventDetailsValues {
    return { startAt: '', timezone: getCurrentTimezone(), locationName: '', locationAddress: '', mapsUrl: '' };
}

export function eventDetailsStorageKey(eventId: string): string {
    return `storywall.eventDetails.${eventId}`;
}

// What was typed earlier in this tab; null when there is nothing usable.
export function readEventDetailsValues(key: string): EventDetailsValues | null {
    try {
        const stored = window.sessionStorage.getItem(key);
        if (!stored) return null;
        const parsed = JSON.parse(stored) as Partial<EventDetailsValues>;
        const empty = emptyEventDetailsValues();
        const text = (field: keyof EventDetailsValues) => (typeof parsed[field] === 'string' ? parsed[field] : empty[field]);
        return {
            startAt: text('startAt'),
            timezone: text('timezone'),
            locationName: text('locationName'),
            locationAddress: text('locationAddress'),
            mapsUrl: text('mapsUrl'),
        };
    } catch {
        return null;
    }
}

export function rememberEventDetailsValues(key: string, values: EventDetailsValues): void {
    try {
        window.sessionStorage.setItem(key, JSON.stringify(values));
    } catch {
        // Storage blocked: the values last as long as the page.
    }
}

// The server fills the end when it is left out. Null until there is a start.
export function eventDetailsRequest(values: EventDetailsValues): EventDetailsRequestDto | null {
    const start = new Date(values.startAt);
    if (!values.startAt || Number.isNaN(start.getTime())) return null;
    return {
        startAt: start.toISOString(),
        timezone: values.timezone,
        locationName: values.locationName.trim(),
        locationAddress: values.locationAddress.trim(),
        mapsUrl: values.mapsUrl.trim() || undefined,
    };
}
