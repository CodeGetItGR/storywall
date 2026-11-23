import type { FeedModePick } from '@/lib/feedMode';

// Each viewer's last Invitation | Feed pick, per event, on this device. localStorage when the browser allows it; a
// blocked or full store keeps the pick in memory for this visit, and the opening rules apply next time.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function key(eventId: string): string {
    return `storywall.feedMode.${eventId}`;
}

function readStorage(eventId: string): string | null {
    try {
        return window.localStorage.getItem(key(eventId));
    } catch {
        return null;
    }
}

export function storedFeedModePick(eventId: string): string | null {
    return readStorage(eventId) ?? memory.get(eventId) ?? null;
}

// The server knows no pick: undefined until the browser has read it.
export function serverFeedModePick(): undefined {
    return undefined;
}

export function saveFeedModePick(eventId: string, pick: FeedModePick): void {
    const raw = JSON.stringify(pick);
    if (storedFeedModePick(eventId) === raw) return;
    try {
        window.localStorage.setItem(key(eventId), raw);
        memory.delete(eventId);
    } catch {
        memory.set(eventId, raw);
    }
    listeners.forEach((listener) => listener());
}

export function subscribeFeedModePicks(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
