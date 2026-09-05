import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';

type RouteQueryValue = string | number | boolean | null | undefined;

export type CheckoutIntent = 'activation' | 'upgrade' | 'storage';
// 'billing' is kept as an alias for the plan section so existing links keep working.
export type ManageTab = 'billing' | 'coverage' | 'danger' | 'help' | 'invitations' | 'orders' | 'overview' | 'plan' | 'rsvp' | 'settings';

// The demo event lives outside the real /events/{eventId} tree (which proxy.ts protects
// behind a real session) — see docs/superpowers/plans/2026-09-05-demo-event.md, design note 1.
function eventBasePath(eventId: string): string {
    return eventId === DEMO_EVENT_ID ? '/demo' : `/events/${eventId}`;
}

function withQuery(pathname: string, params: Record<string, RouteQueryValue>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') continue;
        searchParams.set(key, String(value));
    }

    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
}

export const routes = {
    feed: '/feed',
    eventNotFound: '/event-not-found',
    login: '/login',
    register: '/register',
    invite: '/invite',
    home: '/home',
    modules: '/modules',
    profile: '/profile',
    events: {
        new: (params: { step?: string | null } = {}) => withQuery('/events/new', params),
        manage: (eventId: string, params: { tab?: ManageTab | null; section?: string | null } = {}) =>
            withQuery(`${eventBasePath(eventId)}/manage`, params),
        tools: {
            rsvp: (eventId: string) => `${eventBasePath(eventId)}/tools/rsvp`,
            rsvpSubmit: (eventId: string, attending?: 'attending' | 'not-attending' | null) =>
                withQuery(`${eventBasePath(eventId)}/tools/rsvp/submit`, { attending }),
            gallery: (eventId: string) => `${eventBasePath(eventId)}/tools/gallery`,
            playlist: (eventId: string) => `${eventBasePath(eventId)}/tools/playlist`,
            quiz: (eventId: string) => `${eventBasePath(eventId)}/tools/quiz`,
            gifts: (eventId: string) => `${eventBasePath(eventId)}/tools/gifts`,
            schedule: (eventId: string, params: { section?: string | null } = {}) => withQuery(`${eventBasePath(eventId)}/tools/schedule`, params),
            wishbook: (eventId: string) => `${eventBasePath(eventId)}/tools/wishbook`,
        },
        storySchedule: (eventId: string) => `${eventBasePath(eventId)}/story/schedule`,
        location: (eventId: string, role?: 'main' | 'secondary' | null) => `${eventBasePath(eventId)}/location${role ? `/${role}` : ''}`,
        feed: (eventId: string, params: { post?: string | null } = {}) => withQuery(`${eventBasePath(eventId)}/feed`, params),
        settingsAddons: (eventId: string) => `${eventBasePath(eventId)}/settings/addons`,
        checkoutReview: (eventId: string, intent: CheckoutIntent, code?: string | null, cancelled?: boolean | null) =>
            withQuery(`${eventBasePath(eventId)}/checkout/review`, { intent, code, cancelled }),
        checkoutSuccess: (eventId: string, orderId?: string | null) => withQuery(`${eventBasePath(eventId)}/checkout/success`, { orderId }),
        checkoutCancelled: (eventId: string) => `${eventBasePath(eventId)}/checkout/cancelled`,
    },
    plans: (params: { eventId?: string | null; plan?: string | null } = {}) => withQuery('/plans', params),
    admin: '/admin',
    notifications: '/notifications',
    inviteToken: (token: string) => `/invite/${token}`,
    auth: {
        login: (params: { invite?: string | null; email?: string | null; passwordChanged?: string | null }) => withQuery('/login', params),
        register: (params: { invite?: string | null; email?: string | null }) => withQuery('/register', params),
    },
} as const;
