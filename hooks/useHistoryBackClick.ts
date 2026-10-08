'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

import { hasInAppPrevious } from '@/lib/inAppHistory';

// Turns a back link into a browser back step when the previous page is in the app,
// so the user returns to wherever they came from. Otherwise the link's own href is the fallback.
export function useHistoryBackClick(enabled: boolean, onClick?: (event: MouseEvent<HTMLAnchorElement>) => void) {
    const router = useRouter();

    return (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!enabled || event.defaultPrevented) return;
        // Modified clicks open the fallback href in a new tab or window.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!hasInAppPrevious()) return;

        event.preventDefault();
        router.back();
    };
}
