// While an admin fills a demo event, content can be authored as one of its account-less
// guests: the backend reads this header on content writes (demo-event-fe-integration.md §8).
export const DEMO_ACT_AS_HEADER = 'X-Demo-Act-As-Member';

export type DemoActAs = { eventId: string; memberId: string };

let current: DemoActAs | null = null;
const listeners = new Set<() => void>();

export function setDemoActAsMember(value: DemoActAs | null): void {
    if (current?.eventId === value?.eventId && current?.memberId === value?.memberId) return;
    current = value;
    listeners.forEach((listener) => listener());
}

// For useSyncExternalStore: the UI shows who new content is posted as.
export function subscribeDemoActAs(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getDemoActAs(): DemoActAs | null {
    return current;
}

// Content writes, plus the personal reads below. Anything else (member management, event settings…) stays the admin's own.
const CONTENT_WRITE_PATH =
    /^\/api\/(?:posts|comments|reactions|stories|medias|post-medias|playlist-suggestions|playlist-votes|rsvps|rsvp-session-responses|wishbook)(?:[/?]|$)|^\/api\/events\/[^/]+\/(?:media|posts|stories|wishbook|playlist-suggestions|rsvps)(?:[/?]|$)/;

// Editing or deleting a post, comment, story, photo, wish or song stays the admin's own: as a host
// they may change any of it, while the chosen guest may only change what that guest wrote.
const MODERATED_ITEM_PATH = /^\/api\/(?:posts|comments|stories|medias|wishbook|playlist-suggestions)\/[^/?]+(?:\?|$)/;

// Post, song and story reads too: myReactionType, myVote and viewedByCurrentUser are then the
// chosen guest's (the lists and single items only — demo-event-fe-integration.md §8).
const PERSONAL_READ_PATH =
    /^\/api\/events\/[^/]+\/(?:posts|playlist-suggestions|stories)(?:\?|$)|^\/api\/(?:posts|playlist-suggestions|stories)\/[^/?]+(?:\?|$)/;

export function demoActAsHeaders(method: string | undefined, path: string): Record<string, string> {
    if (!current) return {};
    const verb = (method ?? 'GET').toUpperCase();
    if (verb === 'GET') return PERSONAL_READ_PATH.test(path) ? { [DEMO_ACT_AS_HEADER]: current.memberId } : {};
    if (!CONTENT_WRITE_PATH.test(path)) return {};
    if ((verb === 'PATCH' || verb === 'DELETE') && MODERATED_ITEM_PATH.test(path)) return {};
    return { [DEMO_ACT_AS_HEADER]: current.memberId };
}

const storageKey = (eventId: string) => `storywall:demo-act-as:${eventId}`;

export function readStoredDemoActAs(eventId: string): string | null {
    try {
        return window.localStorage.getItem(storageKey(eventId));
    } catch {
        return null;
    }
}

export function storeDemoActAs(eventId: string, memberId: string | null): void {
    try {
        if (memberId) window.localStorage.setItem(storageKey(eventId), memberId);
        else window.localStorage.removeItem(storageKey(eventId));
    } catch {
        // Only a convenience; the host stays selected.
    }
}
