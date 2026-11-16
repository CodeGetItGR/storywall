'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { OverviewJourneyView } from '@/components/manage/overview/OverviewJourneyView';
import { useAfterJourney } from '@/hooks/useAfterJourney';
import { type JourneyCounts, useBeforeJourney } from '@/hooks/useBeforeJourney';
import { useDayJourney } from '@/hooks/useDayJourney';
import { useEventJourneyPhase } from '@/hooks/useEventJourneyPhase';
import { useOverviewPlanLine } from '@/hooks/useOverviewPlanLine';
import type { EventDetailResponseDto, EventUsageResponseDto } from '@/lib/api/types';
import { isLiteEvent } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

/** Gathers the journey for a live event and hands it to the view. */
export function OverviewJourney({
    event,
    eventUsage,
    planName,
    counts,
}: {
    event: EventDetailResponseDto;
    eventUsage: EventUsageResponseDto | null;
    planName: string | null;
    counts: JourneyCounts;
}) {
    const t = useTranslations('ManagePage');
    // One "now" for the page's life, so phases and session states agree with each other.
    const [now] = useState(() => new Date());
    const phase = useEventJourneyPhase(event, now);
    const before = useBeforeJourney(event, counts, now);
    const day = useDayJourney(event, now);
    const after = useAfterJourney(event, planName, now);
    const planLine = useOverviewPlanLine(event.id, planName, eventUsage);

    return (
        <OverviewJourneyView
            labels={{ getReady: t('journey.getReady'), day: t('journey.phases.day'), afterEvent: t('journey.afterEvent') }}
            steps={phase.steps}
            selected={phase.selected}
            onSelectPhase={phase.select}
            before={{ ...before, printHref: isLiteEvent(event) ? routes.events.tools.gallery(event.id) : routes.events.invitationsQr(event.id) }}
            day={day}
            after={after}
            planLine={planLine}
        />
    );
}
