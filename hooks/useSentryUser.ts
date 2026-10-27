'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Tags Sentry events with the signed-in user's id, and nothing else about them.
export function useSentryUser(userId: string | null): void {
    useEffect(() => {
        Sentry.setUser(userId ? { id: userId } : null);
    }, [userId]);
}
