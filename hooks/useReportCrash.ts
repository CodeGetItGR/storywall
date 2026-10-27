'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import { reportCrash } from '@/lib/betaFeedback/crashReporter';

// Error boundaries catch what the window `error` listener and Sentry's global
// handlers never see.
export function useReportCrash(error: unknown): void {
    useEffect(() => {
        reportCrash(error);
        Sentry.captureException(error);
    }, [error]);
}
