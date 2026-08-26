'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { ScheduleStoryDateBadge } from '@/components/story/ScheduleStoryDateBadge';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

export function ScheduleStoryAvatar() {
    const t = useTranslations('StoryAvatar');
    const locale = useLocale();
    const activeEvent = useActiveEvent();

    return (
        <Link href={routes.storySchedule} className="flex shrink-0 flex-col items-center gap-2 group" aria-label={t('scheduleStory')}>
            <ScheduleStoryDateBadge date={activeEvent?.schedule.startAt} locale={locale} />
            <span className="max-w-14 truncate text-center text-[11px] font-medium leading-tight text-ink-muted">{t('scheduleStory')}</span>
        </Link>
    );
}
