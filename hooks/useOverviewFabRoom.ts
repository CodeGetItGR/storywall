'use client';

import { usePathname } from 'next/navigation';

import { isAccountRoute, isFeedRoute } from '@/components/layout/mobile-tab-bar/utils';
import { useOverviewFabEvent } from '@/hooks/useOverviewFabEvent';

/**
 * Whether the page needs room under its content for the floating Overview button (phones),
 * so the button never covers the last row. The feed keeps its own room for its buttons.
 */
export function useOverviewFabRoom(): boolean {
    const event = useOverviewFabEvent();
    const pathname = usePathname();
    return event !== null && !isFeedRoute(pathname) && !isAccountRoute(pathname);
}
