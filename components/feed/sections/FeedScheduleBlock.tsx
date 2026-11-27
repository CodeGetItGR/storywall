'use client';

import { FeedScheduleTimeline } from '@/components/feed/sections/FeedScheduleTimeline';
import { useFeedScheduleDays } from '@/hooks/useFeedSchedule';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';

// The Schedule block (KAN-283): the timeline of the sessions to come. underTools: in edit mode, with room for the
// block's tools over it, where it keeps its past sessions once the last one is over.
export function FeedScheduleBlock({ event, underTools = false }: { event: EventDetailResponseDto; underTools?: boolean }) {
    const days = useFeedScheduleDays(event, underTools);
    const heading = useModuleCopy(event.eventType)('schedule').name;
    if (days.length === 0) return null;

    return <FeedScheduleTimeline event={event} heading={heading} days={days} className={underTools ? 'pt-18' : undefined} />;
}
