import { useEffect, useMemo, useState } from 'react';

import type { useEventDetails } from '@/hooks/useEvent';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';

export interface EventGridItem {
    member: EventMemberResponseDto;
    event: EventDetailResponseDto | undefined;
    isLoading: boolean;
}

// Pairs each membership with its (possibly still-loading) event detail — the
// shape EventsGrid renders, shared by the home page's recent-events preview
// and the full /events grid.
export function useEventGridItems(memberships: EventMemberResponseDto[], eventQueries: ReturnType<typeof useEventDetails>): EventGridItem[] {
    return useMemo(
        () => memberships.map((member, i) => ({ member, event: eventQueries[i]?.data, isLoading: eventQueries[i]?.isLoading ?? false })),
        [memberships, eventQueries]
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
// is read once on mount and re-read whenever the inputs change (rather than
// on every render) to keep the ranking pure during render, mirroring
// ManageScreen's daysToGo pattern.
export function useRecentEventItems(items: EventGridItem[], limit: number): EventGridItem[] {
    const [ranked, setRanked] = useState(() => rankEventItems(items, Date.now(), limit));

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Re-rank when the underlying items/limit change; see comment above.
        setRanked(rankEventItems(items, Date.now(), limit));
    }, [items, limit]);

    return ranked;
}
