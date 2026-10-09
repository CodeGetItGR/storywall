'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

import { ScheduleStoryDateBadge } from '@/components/story/ScheduleStoryDateBadge';
import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

export function ScheduleStoryAvatar() {
    const locale = useLocale();
    const activeEvent = useActiveEvent();
    const scheduleName = useActiveModuleCopy('schedule').name;

    if (!activeEvent) return null;

    return (
        <Link
            href={routes.events.storySchedule(activeEvent.id)}
            className="group flex shrink-0 flex-col items-center gap-2"
            aria-label={scheduleName}
        >
            <ScheduleStoryDateBadge date={activeEvent.schedule.startAt} locale={locale} />
            <span className="max-w-14 truncate text-center text-[11px] leading-tight font-medium text-ink-muted">{scheduleName}</span>
        </Link>
    );
}
