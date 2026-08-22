'use client';

import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';

export function ScheduleStoryAvatar() {
    const t = useTranslations('StoryAvatar');

    return (
        <Link href={routes.storySchedule} className="flex shrink-0 flex-col items-center gap-2 group" aria-label={t('scheduleStory')}>
            <div className="flex h-15.5 w-15.5 items-center justify-center rounded-full bg-gradient-brand p-0.75" aria-hidden="true">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <CalendarDays className="h-7 w-7" />
                    </div>
                </div>
            </div>
            <span className="max-w-14 truncate text-center text-[11px] font-medium leading-tight text-ink-muted">{t('scheduleStory')}</span>
        </Link>
    );
}
