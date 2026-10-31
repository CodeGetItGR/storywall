'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Tailwind's `md` breakpoint, where the nav rail and right panel replace the tab bar.
export const MD_MEDIA_QUERY = '(min-width: 48rem)';

function getServerSnapshot() {
    return false;
}

// Whether the viewport matches `query`, kept current as it changes. False on the server.
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);
            return () => list.removeEventListener('change', onChange);
        },
        [query],
    );

    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, getServerSnapshot);
}
