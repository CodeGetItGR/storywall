// While an admin fills a demo event, content can be authored as one of its account-less
// guests: the backend reads this header on content writes (demo-event-fe-integration.md §8).
export const DEMO_ACT_AS_HEADER = 'X-Demo-Act-As-Member';

type DemoActAs = { eventId: string; memberId: string };

let current: DemoActAs | null = null;

export function setDemoActAsMember(value: DemoActAs | null): void {
    current = value;
}

// Content writes only. Anything else (member management, event settings…) stays the admin's own.
const CONTENT_WRITE_PATH =
    /^\/api\/(?:posts|comments|reactions|stories|medias|post-medias|playlist-suggestions|playlist-votes|rsvps|rsvp-session-responses|wishbook)(?:[/?]|$)|^\/api\/events\/[^/]+\/(?:media|posts|stories|wishbook|playlist-suggestions|rsvps)(?:[/?]|$)/;

// Editing or deleting a post, comment, story, photo, wish or song stays the admin's own: as a host
// they may change any of it, while the chosen guest may only change what that guest wrote.
const MODERATED_ITEM_PATH = /^\/api\/(?:posts|comments|stories|medias|wishbook|playlist-suggestions)\/[^/?]+(?:\?|$)/;

export function demoActAsHeaders(method: string | undefined, path: string): Record<string, string> {
    if (!current) return {};
    const verb = (method ?? 'GET').toUpperCase();
    if (verb === 'GET') return {};
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
