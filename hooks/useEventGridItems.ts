import { useMemo, useState } from 'react';

import type { EventDetailState } from '@/hooks/useEvent';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';

export interface EventGridItem {
    member: EventMemberResponseDto;
    event: EventDetailResponseDto | undefined;
    isLoading: boolean;
}

// Pairs each membership with its (possibly still-loading) event detail — the
// shape EventsGrid renders, shared by the home page's recent-events preview
// and the full /events grid.
export function useEventGridItems(memberships: EventMemberResponseDto[], eventDetails: EventDetailState[]): EventGridItem[] {
    return useMemo(
        () => memberships.map((member, i) => ({ member, event: eventDetails[i]?.data, isLoading: eventDetails[i]?.isLoading ?? false })),
        [memberships, eventDetails],
    );
}

function rankEventItems(items: EventGridItem[], now: number, limit: number): EventGridItem[] {
    const ranked = [...items].sort((a, b) => {
        const aStart = a.event?.schedule.startAt ? new Date(a.event.schedule.startAt).getTime() : null;
        const bStart = b.event?.schedule.startAt ? new Date(b.event.schedule.startAt).getTime() : null;

        if (aStart === null && bStart === null) return 0;
        if (aStart === null) return 1;
        if (bStart === null) return -1;

        const aUpcoming = aStart >= now;
        const bUpcoming = bStart >= now;

        if (aUpcoming && bUpcoming) return aStart - bStart;
        if (!aUpcoming && !bUpcoming) return bStart - aStart;
        return aUpcoming ? -1 : 1;
    });

    return ranked.slice(0, limit);
}

// Ranks items by nearest upcoming start date first, then most recently
// started for events already underway — so the home page's preview always
// leads with what's actually next — and caps the result to `limit`. "Now"
// is read once on mount, which keeps the ranking pure during render without
// a second render to catch up.
export function useRecentEventItems(items: EventGridItem[], limit: number): EventGridItem[] {
    const [now] = useState(() => Date.now());
    return useMemo(() => rankEventItems(items, now, limit), [items, now, limit]);
}
