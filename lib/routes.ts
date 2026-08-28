type RouteQueryValue = string | number | boolean | null | undefined;

export type CheckoutIntent = 'activation' | 'upgrade' | 'storage';

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
        settingsAddons: (eventId: string) => `/events/${eventId}/settings/addons`,
        checkoutReview: (eventId: string, intent: CheckoutIntent, code?: string | null) =>
            withQuery(`/events/${eventId}/checkout/review`, { intent, code }),
        checkoutSuccess: (eventId: string, orderId?: string | null) => withQuery(`/events/${eventId}/checkout/success`, { orderId }),
        checkoutCancelled: (eventId: string) => `/events/${eventId}/checkout/cancelled`,
    },
    plans: (params: { eventId?: string | null; plan?: string | null } = {}) => withQuery('/plans', params),
    manage: '/manage',
    admin: '/admin',
    notifications: '/notifications',
    storySchedule: '/story/schedule',
    story: (storyId: string) => `/story/${storyId}`,
    post: {
        feed: (eventId: string) => `/feed/${eventId}`,
        feedWithPost: (eventId: string, postId: string) => withQuery(`/feed/${eventId}`, { post: postId }),
    },
    inviteToken: (token: string) => `/invite/${token}`,
    tools: {
        rsvp: '/tools/rsvp',
        rsvpSubmit: '/tools/rsvp/submit',
        gallery: '/tools/gallery',
        playlist: '/tools/playlist',
        quiz: '/tools/quiz',
        gifts: '/tools/gifts',
        schedule: '/tools/schedule',
        wishbook: '/tools/wishbook',
    },
    auth: {
        login: (params: { invite?: string | null; email?: string | null; passwordChanged?: string | null }) => withQuery('/login', params),
        register: (params: { invite?: string | null; email?: string | null }) => withQuery('/register', params),
        manage: (params: {
            // 'billing' is kept as an alias for the plan section so existing links keep working.
            tab?: 'billing' | 'coverage' | 'invitations' | 'orders' | 'overview' | 'plan' | 'refund' | 'rsvp' | 'settings' | null;
        }) => withQuery('/manage', params),
        rsvpSubmit: (attending: 'attending' | 'not-attending') => withQuery('/tools/rsvp/submit', { attending }),
    },
} as const;
