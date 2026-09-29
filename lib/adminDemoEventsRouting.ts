export const DEMO_EVENTS_HASH_ROOT = '#demo-events';

export function isDemoEventsHash(hash: string): boolean {
    return hash === DEMO_EVENTS_HASH_ROOT || hash.startsWith(`${DEMO_EVENTS_HASH_ROOT}/`);
}

// `#demo-events/<EVENT_TYPE_KEY>` opens that type's page; the bare root is the list.
export function parseDemoEventsHash(hash: string): string | null {
    if (!isDemoEventsHash(hash)) return null;
    const rest = hash.slice(DEMO_EVENTS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatDemoEventsHash(eventTypeKey: string | null): string {
    return eventTypeKey ? `${DEMO_EVENTS_HASH_ROOT}/${encodeURIComponent(eventTypeKey)}` : DEMO_EVENTS_HASH_ROOT;
}
