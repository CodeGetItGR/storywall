import * as Sentry from '@sentry/nextjs';

import { scrubRecordingEvent, sentrySharedOptions } from '@/lib/sentry/options';

Sentry.init({
    ...sentrySharedOptions,
    // Trace headers on same-origin requests only: Spring's CORS doesn't allow
    // sentry-trace or baggage, and the default also matches localhost:8080.
    tracePropagationTargets: [/^\/(?!\/)/],
    // Replays only for sessions that hit an error, with every text and media masked.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
            beforeAddRecordingEvent: scrubRecordingEvent,
        }),
    ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
