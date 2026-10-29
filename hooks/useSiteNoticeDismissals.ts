'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { addDismissal, parseDismissals, readDismissalsCookie, subscribeDismissals, writeDismissalsCookie } from '@/lib/siteNoticeDismissals';

// initialRaw: the cookie as the server read it, so the first client render matches the HTML.
export function useSiteNoticeDismissals(initialRaw: string) {
    const getServerSnapshot = useCallback(() => initialRaw, [initialRaw]);
    const raw = useSyncExternalStore(subscribeDismissals, readDismissalsCookie, getServerSnapshot);
    const dismissed = useMemo(() => new Set(parseDismissals(raw)), [raw]);
    const dismiss = useCallback((key: string) => writeDismissalsCookie(addDismissal(readDismissalsCookie(), key)), []);
    return { dismissed, dismiss };
}
