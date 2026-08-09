type RouteQueryValue = string | number | boolean | null | undefined;

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
    welcome: '/welcome',
    login: '/login',
    register: '/register',
    invite: '/invite',
    events: {
        new: '/events/new',
        settingsPlan: (eventId: string) => `/events/${eventId}/settings/plan`,
        checkoutSuccess: (eventId: string, orderId?: string | null) => withQuery(`/events/${eventId}/checkout/success`, { orderId }),
        checkoutCancelled: (eventId: string) => `/events/${eventId}/checkout/cancelled`,
    },
    plans: (params: { plan?: string | null } = {}) => withQuery('/plans', params),
    manage: '/manage',
    admin: '/admin',
    notifications: '/notifications',
    profile: '/profile',
    story: (storyId: string) => `/story/${storyId}`,
    post: {
        feed: (eventId: string) => `/feed/${eventId}`,
        feedWithPost: (eventId: string, postId: string) => withQuery(`/feed/${eventId}`, { post: postId }),
    },
    inviteToken: (token: string) => `/invite/${token}`,
    tools: {
        root: '/tools',
        rsvp: '/tools/rsvp',
        rsvpSubmit: '/tools/rsvp/submit',
        playlist: '/tools/playlist',
        quiz: '/tools/quiz',
        futureMessages: '/tools/future-messages',
        gifts: '/tools/gifts',
        schedule: '/tools/schedule',
        seating: '/tools/seating',
        venue: '/tools/venue',
        wishbook: '/tools/wishbook',
    },
    auth: {
        login: (params: { invite?: string | null; email?: string | null }) => withQuery('/login', params),
        register: (params: { invite?: string | null; email?: string | null }) => withQuery('/register', params),
        manage: (params: { tab?: 'invitations' | 'overview' | 'rsvp' | 'settings' | null }) => withQuery('/manage', params),
        rsvpSubmit: (attending: 'attending' | 'not-attending') => withQuery('/tools/rsvp/submit', { attending }),
    },
} as const;
