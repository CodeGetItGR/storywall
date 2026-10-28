import * as Sentry from '@sentry/nextjs';

import { sentrySharedOptions } from '@/lib/sentry/options';

// No session replays: the privacy policy allows them only with Analytics consent, and nothing
// waits for that consent yet. Turn them back on together with that check.
Sentry.init({
    ...sentrySharedOptions,
    // Trace headers on same-origin requests only: Spring's CORS doesn't allow
    // sentry-trace or baggage, and the default also matches localhost:8080.
    tracePropagationTargets: [/^\/(?!\/)/],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
