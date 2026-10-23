import * as Sentry from '@sentry/nextjs';

import { sentrySharedOptions } from '@/lib/sentry/options';

Sentry.init(sentrySharedOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
