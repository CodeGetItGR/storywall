type RouteQueryValue = string | number | boolean | null | undefined;

export type CheckoutIntent = 'activation' | 'upgrade' | 'storage';
// 'billing' is kept as an alias for the plan section so existing links keep working.
export type ManageTab = 'billing' | 'coverage' | 'invitations' | 'orders' | 'overview' | 'plan' | 'refund' | 'rsvp' | 'settings';

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
        new: '/events/new',
        manage: (eventId: string, params: { tab?: ManageTab | null } = {}) => withQuery(`/events/${eventId}/manage`, params),
        tools: {
            rsvp: (eventId: string) => `/events/${eventId}/tools/rsvp`,
            rsvpSubmit: (eventId: string, attending?: 'attending' | 'not-attending' | null) =>
                withQuery(`/events/${eventId}/tools/rsvp/submit`, { attending }),
            gallery: (eventId: string) => `/events/${eventId}/tools/gallery`,
            playlist: (eventId: string) => `/events/${eventId}/tools/playlist`,
            quiz: (eventId: string) => `/events/${eventId}/tools/quiz`,
            gifts: (eventId: string) => `/events/${eventId}/tools/gifts`,
            schedule: (eventId: string) => `/events/${eventId}/tools/schedule`,
            wishbook: (eventId: string) => `/events/${eventId}/tools/wishbook`,
        },
        story: (eventId: string, storyId: string) => `/events/${eventId}/story/${storyId}`,
        storySchedule: (eventId: string) => `/events/${eventId}/story/schedule`,
        settingsAddons: (eventId: string) => `/events/${eventId}/settings/addons`,
        checkoutReview: (eventId: string, intent: CheckoutIntent, code?: string | null) =>
            withQuery(`/events/${eventId}/checkout/review`, { intent, code }),
        checkoutSuccess: (eventId: string, orderId?: string | null) => withQuery(`/events/${eventId}/checkout/success`, { orderId }),
        checkoutCancelled: (eventId: string) => `/events/${eventId}/checkout/cancelled`,
    },
    plans: (params: { eventId?: string | null; plan?: string | null } = {}) => withQuery('/plans', params),
    admin: '/admin',
    notifications: '/notifications',
    post: {
        feed: (eventId: string) => `/feed/${eventId}`,
        feedWithPost: (eventId: string, postId: string) => withQuery(`/feed/${eventId}`, { post: postId }),
    },
    inviteToken: (token: string) => `/invite/${token}`,
    auth: {
        login: (params: { invite?: string | null; email?: string | null; passwordChanged?: string | null }) => withQuery('/login', params),
        register: (params: { invite?: string | null; email?: string | null }) => withQuery('/register', params),
    },
} as const;
