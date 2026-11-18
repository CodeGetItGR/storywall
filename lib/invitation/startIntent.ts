// The event a host chose a theme for, from that event's Manage page. The next draft started in this
// tab goes on that event when the theme is for its type. Kept for the tab only.

const STORAGE_KEY = 'storywall:invitationStartEvent:v1';

export type InvitationStartIntent = { eventId: string; eventType: string };

function isIntent(value: unknown): value is InvitationStartIntent {
    if (!value || typeof value !== 'object') return false;
    const { eventId, eventType } = value as Record<string, unknown>;
    return typeof eventId === 'string' && eventId.length > 0 && typeof eventType === 'string' && eventType.length > 0;
}

export function rememberStartIntent(intent: InvitationStartIntent): void {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
    } catch {
        // Best effort: the host then picks the event when publishing.
    }
}

// Read once: the intent is gone after the next draft starts.
export function takeStartIntent(): InvitationStartIntent | null {
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return isIntent(parsed) ? parsed : null;
    } catch {
        return null;
    }
}
