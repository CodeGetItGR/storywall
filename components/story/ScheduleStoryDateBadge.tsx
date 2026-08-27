'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

type ScheduleStoryDateBadgeProps = {
    date?: string | null;
    locale: string;
    size?: 'sm' | 'md';
    className?: string;
};

export function ScheduleStoryDateBadge({ date, locale, size = 'md', className }: ScheduleStoryDateBadgeProps) {
    const t = useTranslations('StoryAvatar');
    const isSmall = size === 'sm';

    if (!date) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center rounded-full bg-gradient-brand p-0.75',
                    isSmall ? 'h-9 w-9' : 'h-15.5 w-15.5',
                    className
                )}
                aria-hidden="true"
            >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <CalendarDays className={cn(isSmall ? 'h-4 w-4' : 'h-7 w-7')} />
                    </div>
                </div>
            </div>
        );
    }

    const month = formatDate(locale, date, { month: 'short' }).toUpperCase();
    const day = formatDate(locale, date, { day: 'numeric' });
    const label = formatDate(locale, date, { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div
            className={cn('flex items-center justify-center rounded-full bg-gradient-brand p-0.75', isSmall ? 'h-9 w-9' : 'h-15.5 w-15.5', className)}
            role="img"
            aria-label={t('scheduleStory')}
            title={label}
        >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-0.5">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <span className={cn('font-semibold uppercase leading-none tracking-[0.08em]', isSmall ? 'text-[8px]' : 'text-[10px]')}>
                        {month}
                    </span>
                    <span className={cn('font-bold leading-none', isSmall ? 'text-[11px]' : 'text-base')}>{day}</span>
                </div>
            </div>
        </div>
    );
}
