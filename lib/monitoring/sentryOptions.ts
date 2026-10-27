// What the browser, Node and edge Sentry setups share. With no DSN the SDK
// stays off, so a local build sends nothing unless .env.local sets one.
// No dataCollection: the SDK then sends no IP, cookies, headers or bodies.
// The signed-in user's id is the only user data (see hooks/useSentryUser.ts).
export const sentryBaseOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Set at build time in next.config.mjs.
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
};
