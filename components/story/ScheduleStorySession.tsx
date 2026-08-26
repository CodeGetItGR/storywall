'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatTime, formatTimeRange } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export function ScheduleStorySession({ session, locale }: { session: EventSessionResponseDto; locale: string }) {
    const t = useTranslations('SchedulePage');
    const hasMeta = Boolean(session.description || session.locationName || session.endAt);
    const storyTimeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    return (
        <article className="relative grid grid-cols-[1rem_5.25rem_minmax(0,1fr)] items-center gap-x-4 border-t border-white/10 py-5 first:border-t-0">
            {/* Session Dot */}
            <div className={cn('flex justify-center', hasMeta ? 'self-start pt-1.5' : 'self-center')}>
                <div className="h-2.5 w-2.5 rounded-full bg-white/36" aria-hidden="true" />
            </div>

            {/* Time */}
            <p
                className={cn(
                    'text-2xl font-semibold leading-none tracking-[-0.03em] text-white tabular-nums',
                    hasMeta ? 'self-start pt-0.5' : 'self-center'
                )}
            >
                {formatTimeRange(locale, session.startAt, session.endAt, t('timeTba'), storyTimeFormat)}
            </p>

            {/* Session Details */}
            <div className={cn('min-w-0', hasMeta ? 'self-start pt-0.5' : 'flex min-h-9 items-center self-center')}>
                <h2 className="text-lg font-semibold leading-tight text-white">{session.title}</h2>
                {session.description && <p className="mt-1 text-sm leading-snug text-white/68">{session.description}</p>}

                {session.locationName && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/58">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{session.locationName}</span>
                    </div>
                )}

                {session.endAt && (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/42">
                        {t('endsAt', { time: formatTime(locale, session.endAt, storyTimeFormat) })}
                    </p>
                )}
            </div>
        </article>
    );
}
