import type { InvitationEventData, InvitationEventSession } from '@/lib/invitation/eventLinks';
import { mapsUrl } from '@/lib/invitation/mapLinks';

// One place the feed's Places section lists (KAN-293): the sessions held there, in schedule order, and the place.
// sessions is empty for the event's own place.
export type EventPlace = { key: string; sessions: string[]; name: string; address: string; mapUrl: string };

// Two sessions are at the same place when their name and address read the same, whatever the case or spaces.
function placeKey(name: string, address: string): string {
    return `${name}|${address}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

// The schedule's order: by start time, as the timeline draws them; sessions without a time after, in the event's order.
function scheduleOrder(sessions: readonly InvitationEventSession[]): InvitationEventSession[] {
    const start = (session: InvitationEventSession) => (session.startAt ? Date.parse(session.startAt) : Number.MAX_SAFE_INTEGER);
    return [...sessions].sort((a, b) => start(a) - start(b) || a.displayOrder - b.displayOrder);
}

function place(name: string | null, address: string | null, map: string | null): Omit<EventPlace, 'key' | 'sessions'> | null {
    const cleanName = name?.trim() ?? '';
    const cleanAddress = address?.trim() ?? '';
    if (!cleanName && !cleanAddress) return null;
    return { name: cleanName, address: cleanAddress, mapUrl: map?.trim() || mapsUrl(cleanName, cleanAddress) };
}

// Every session that has a place, in schedule order, each place once with the names of the sessions held there. With
// no session at a place (or no schedule), the event's own place; nothing when the event has none either. The main
// session mirrors the event's place, so the event's address stands in for one the session doesn't have.
export function eventPlaces(event: InvitationEventData): EventPlace[] {
    const places = new Map<string, EventPlace>();
    for (const session of scheduleOrder(event.sessions ?? [])) {
        const address = session.locationAddress ?? (session.isMain ? event.location.address : null);
        const found = place(session.locationName, address, session.mapsUrl);
        if (!found) continue;
        const key = placeKey(found.name, found.address);
        const known = places.get(key);
        const title = session.title.trim();
        if (known) {
            if (title && !known.sessions.includes(title)) known.sessions.push(title);
        } else {
            places.set(key, { ...found, key, sessions: title ? [title] : [] });
        }
    }
    if (places.size > 0) return [...places.values()];
    const own = place(event.location.name, event.location.address, event.location.mapsUrl);
    return own ? [{ ...own, key: placeKey(own.name, own.address), sessions: [] }] : [];
}
