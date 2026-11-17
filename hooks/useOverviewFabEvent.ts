'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { isOverviewPath } from '@/lib/eventJourney';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { isLiteEvent } from '@/lib/liteEvents';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

/** The event the floating Overview button opens, or null when it shouldn't show (KAN-236). */
export function useOverviewFabEvent(): EventDetailResponseDto | null {
    const event = useActiveEvent();
    const isHost = useIsHost();
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();

    if (!event || !isHost) return null;
    // Only a live full event has the Overview journey whose steps the badge counts.
    if (event.status === 'DRAFT' || isEventDeleted(event) || isLiteEvent(event)) return null;
    if (isOverviewPath(event.id, pathname, searchParams)) return null;
    return event;
}
