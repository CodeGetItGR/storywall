import * as Sentry from '@sentry/nextjs';

import { sentrySharedOptions } from '@/lib/sentry/options';

export function register() {
    Sentry.init(sentrySharedOptions);
}

// Errors thrown while rendering Server Components, route handlers and the proxy.
export const onRequestError = Sentry.captureRequestError;
