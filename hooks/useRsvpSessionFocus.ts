'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { rsvpSessionAnchor } from '@/lib/feedScheduleRsvp';

// The session a link asked about (?session=), scrolled into view once its question is drawn.
export function useRsvpSessionFocus(ready: boolean): string | null {
    const sessionId = useSearchParams().get('session');

    useEffect(() => {
        if (!sessionId || !ready) return;
        document.getElementById(rsvpSessionAnchor(sessionId))?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [ready, sessionId]);

    return sessionId;
}
