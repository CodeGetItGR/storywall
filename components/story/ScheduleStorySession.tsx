'use client';

import { ExternalLink, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatTimeRange } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export function ScheduleStorySession({ session, locale }: { session: EventSessionResponseDto; locale: string }) {
    const t = useTranslations('SchedulePage');
    const hasMeta = Boolean(session.description || session.locationName || session.endAt);
    const storyTimeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    return (
        <article className="relative flex items-center gap-x-4 border-t border-border py-5 first:border-t-0">
            <div className={'flex flex-col items-center gap-x-4 gap-y-3'}>
                <div className={'flex gap-5 justify-start w-full'}>
                    {/* Session Dot */}
                    <div className={cn('flex justify-center', hasMeta ? 'self-start pt-1.5' : 'self-center')}>
                        <div className="h-2.5 w-2.5 rounded-full bg-ink-faint" aria-hidden="true" />
                    </div>

                    {/* Time */}
                    <p
                        className={cn(
                            'text-md font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums w-full',
                            hasMeta ? 'self-start pt-0.5' : 'self-center'
                        )}
                    >
                        {formatTimeRange(locale, session.startAt, session.endAt, t('timeTba'), storyTimeFormat)}
                    </p>
                </div>

                {/* Session Details */}
                <div className={cn('min-w-0 ml-7.5', hasMeta ? 'self-start pt-0.5' : 'flex min-h-9 items-center self-center')}>
                    <h2 className="text-2xl font-semibold leading-tight text-ink">{session.title}</h2>
                    {session.description && <p className="mt-1 text-sm leading-snug text-ink-muted">{session.description}</p>}

                    {session.locationName && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{session.locationName}</span>
                            {session.mapsUrl && (
                                <a
                                    href={session.mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={t('host.openMap', { title: session.title })}
                                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] leading-none text-ink-muted transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                                >
                                    {t('story.directions')}
                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
