'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatTime, formatTimeRange } from '@/lib/datetime';

export function ScheduleStorySession({ session, locale }: { session: EventSessionResponseDto; locale: string }) {
    const t = useTranslations('SchedulePage');

    return (
        <article className="relative rounded-2xl bg-white/10 p-4 shadow-sm backdrop-blur-sm">
            <div className="absolute -left-5 top-5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-amber-200" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold leading-snug text-white">{session.title}</h2>
                    {session.description && <p className="mt-1 text-sm leading-relaxed text-white/70">{session.description}</p>}
                </div>
                <p className="shrink-0 text-right text-xs font-semibold tabular-nums text-amber-100">
                    {formatTimeRange(locale, session.startAt, session.endAt, t('timeTba'))}
                </p>
            </div>

            {session.locationName && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-white/62">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-medium">{session.locationName}</span>
                </div>
            )}

            {session.endAt && (
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                    {t('endsAt', { time: formatTime(locale, session.endAt) })}
                </p>
            )}
        </article>
    );
}
