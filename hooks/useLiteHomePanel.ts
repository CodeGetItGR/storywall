'use client';

import { MD_MEDIA_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { isLiveLiteEvent } from '@/lib/eventCapabilities';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

// Whether this page is a lite event's home with the host tools panel beside it. On phones the tab bar's event
// menu has the tools, and the panel isn't mounted, so its summaries aren't fetched.
export function useLiteHomePanel(): boolean {
    const activeEvent = useActiveEvent();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const isDesktop = useMediaQuery(MD_MEDIA_QUERY);
    return isDesktop && !isLoading && isHost && isLiveLiteEvent(activeEvent);
}
