'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { daysBetween, formatDate, localDay } from '@/lib/datetime';
import { afterStartDay, currentPhase, JOURNEY_PHASES, type JourneyPhase, journeyTimeZone, primaryDay } from '@/lib/eventJourney';

export type PhaseStep = { phase: JourneyPhase; label: string; caption: string; state: 'done' | 'current' | 'upcoming' };

// A yyyy-mm-dd day formatted on its own, so no time zone can shift it.
function formatDay(locale: string, day: string, options: Intl.DateTimeFormatOptions): string {
    return formatDate(locale, `${day}T12:00:00Z`, { ...options, timeZone: 'UTC' });
}

/** The phase the event is in, the phase on screen, and the stepper's three steps (none for an event without a date). */
export function useEventJourneyPhase(event: Pick<EventDetailResponseDto, 'sessions' | 'schedule'>, now: Date = new Date()) {
    const t = useTranslations('ManagePage.journey');
    const locale = useLocale();
    const current = currentPhase(event, now);
    const [selected, select] = useState<JourneyPhase>(current);

    const steps = useMemo<PhaseStep[]>(() => {
        const primary = primaryDay(event);
        const afterStart = afterStartDay(event);
        if (primary === null || afterStart === null) return [];
        const today = localDay(now, journeyTimeZone(event));
        const currentIndex = JOURNEY_PHASES.indexOf(current);
        const captions: Record<JourneyPhase, string> = {
            before: currentIndex > 0 ? t('phases.done') : t('phases.daysToGo', { count: Math.max(0, daysBetween(today, primary)) }),
            day: current === 'day' ? t('phases.today') : formatDay(locale, primary, { weekday: 'short', day: 'numeric', month: 'short' }),
            after: t('phases.from', { date: formatDay(locale, afterStart, { day: 'numeric', month: 'short' }) }),
        };
        return JOURNEY_PHASES.map((phase, index) => ({
            phase,
            label: t(`phases.${phase}`),
            caption: captions[phase],
            state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
        }));
    }, [event, now, current, locale, t]);

    return { current, selected, select, steps };
}
