export function eventDescriptionViewsKey(eventId: string) {
    return `storywall.eventDescriptionViews.${eventId}`;
}

// Client-writable, non-sensitive cookie (not httpOnly — see lib/auth/authCookies.ts
// for the actual session cookies) mirroring the last-active event id, so both
// the browser and the (event) layout's server-side prefetch can agree on
// which event to load without a client-only sessionStorage round trip.
export const ACTIVE_EVENT_COOKIE = 'storywall_active_event';

export function getActiveEventCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${ACTIVE_EVENT_COOKIE}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

export function setActiveEventCookie(eventId: string) {
    if (typeof document === 'undefined') return;
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    // 1 year — a UX convenience default, not a security boundary.
    document.cookie = `${ACTIVE_EVENT_COOKIE}=${encodeURIComponent(eventId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
}
