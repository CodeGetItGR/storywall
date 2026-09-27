'use client';

import { useEffect } from 'react';

import { reportCrash } from '@/lib/betaFeedback/crashReporter';

// Error boundaries catch what the window `error` listener never sees.
export function useReportCrash(error: unknown): void {
    useEffect(() => {
        reportCrash(error);
    }, [error]);
}
