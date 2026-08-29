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
        <article className="relative flex items-center gap-x-4 border-t border-white/10 py-5 first:border-t-0">


            <div className={'flex flex-col items-center gap-x-4 gap-y-3'}>
                <div className={'flex gap-5 justify-start w-full'}>
                    {/* Session Dot */}
                    <div className={cn('flex justify-center', hasMeta ? 'self-start pt-1.5' : 'self-center')}>
                        <div className="h-2.5 w-2.5 rounded-full bg-white/36" aria-hidden="true" />
                    </div>

                    {/* Time */}
                    <p className={cn(
                            'text-lg font-semibold leading-none tracking-[-0.03em] text-white tabular-nums w-full',
                            hasMeta ? 'self-start pt-0.5' : 'self-center'
                        )}
                    >
                        {formatTimeRange(locale, session.startAt, session.endAt, t('timeTba'), storyTimeFormat)}
                    </p>
                </div>

                {/* Session Details */}
                <div className={cn('min-w-0 ml-7.5', hasMeta ? 'self-start pt-0.5' : 'flex min-h-9 items-center self-center')}>
                    <h2 className="text-xl font-semibold leading-tight text-white">{session.title}</h2>
                    {session.description && <p className="mt-1 text-sm leading-snug text-white/68">{session.description}</p>}

                    {session.locationName && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/58">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{session.locationName}</span>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
