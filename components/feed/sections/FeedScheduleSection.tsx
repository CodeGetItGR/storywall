'use client';

import type { ReactNode } from 'react';

import { FeedScheduleTimeline } from '@/components/feed/sections/FeedScheduleTimeline';
import { useFeedScheduleDays } from '@/hooks/useFeedSchedule';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';

// Feed mode's schedule: the same timeline as the Schedule block (KAN-293), the sessions to come by day, under the
// Schedule module's name. inEditor: edit mode, where it keeps its past sessions once the last one is over.
type FeedScheduleSectionProps = { event: EventDetailResponseDto; placeholder?: ReactNode; inEditor?: boolean };

export function FeedScheduleSection({ event, placeholder = null, inEditor = false }: FeedScheduleSectionProps) {
    const days = useFeedScheduleDays(event, inEditor);
    const heading = useModuleCopy(event.eventType)('schedule').name;
    if (days.length === 0) return placeholder;

    return <FeedScheduleTimeline event={event} heading={heading} days={days} />;
}
