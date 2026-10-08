'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { normalizeEventTypeSlug } from '@/lib/eventTypeSlug';
import { LANDING_EVENT_PARAM, landingEventHref } from '@/lib/landingPricing';
import { replacePageUrl } from '@/lib/overlayHistory';

// Picking writes the URL without a popstate, so this store tells its readers itself.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener('popstate', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('popstate', listener);
    };
}

function readUrlSlug(): string | null {
    return normalizeEventTypeSlug(new URLSearchParams(window.location.search).get(LANDING_EVENT_PARAM));
}

// The server render and hydration don't know the URL: they show the default, then the URL's pick.
function readServerSlug(): string | null {
    return null;
}

// Which event type the landing pricing shows: the one in ?event= if it is among ids, else defaultId,
// else the first. Picking one replaces ?event= in place, with no navigation or server render.
export function useLandingPricingEventType(ids: readonly string[], defaultId: string | null) {
    const urlSlug = useSyncExternalStore(subscribe, readUrlSlug, readServerSlug);
    const selectedId =
        urlSlug !== null && ids.includes(urlSlug) ? urlSlug : defaultId !== null && ids.includes(defaultId) ? defaultId : (ids[0] ?? null);

    const selectEventType = useCallback(
        (id: string) => {
            if (!ids.includes(id)) return;
            replacePageUrl(landingEventHref(window.location.href, id));
            listeners.forEach((listener) => listener());
        },
        [ids],
    );

    return { selectedId, selectEventType };
}
