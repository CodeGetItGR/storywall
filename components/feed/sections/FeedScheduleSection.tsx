'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FeedScheduleTimeline } from '@/components/feed/sections/FeedScheduleTimeline';
import { useFeedSchedule } from '@/hooks/useFeedSchedule';
import type { EventDetailResponseDto } from '@/lib/api/types';

// Today's schedule: the timeline of the day's sessions.
export function FeedScheduleSection({ event, placeholder = null }: { event: EventDetailResponseDto; placeholder?: ReactNode }) {
    const t = useTranslations('InvitationEditor.sectionNames');
    const items = useFeedSchedule(event);
    if (!items) return placeholder;

    return <FeedScheduleTimeline event={event} heading={t('feedSchedule')} days={[{ day: 'today', label: null, items }]} />;
}
