'use client';

import { useTranslations } from 'next-intl';

import { OverviewFabButton } from '@/components/layout/mobile-tab-bar/OverviewFabButton';
import { useJourneyStepsLeft } from '@/hooks/useJourneyStepsLeft';
import { useOverviewFabEvent } from '@/hooks/useOverviewFabEvent';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type Placement = { raised: boolean; hidden: boolean };

/** KAN-236: hosts' floating way back to the Overview, with the steps left in this phase. */
export function OverviewFab(placement: Placement) {
    const event = useOverviewFabEvent();
    if (!event) return null;
    // Keyed by event, so the count's queries always belong to the event on screen.
    return <OverviewFabForEvent key={event.id} event={event} {...placement} />;
}

function OverviewFabForEvent({ event, raised, hidden }: Placement & { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');
    const count = useJourneyStepsLeft(event);
    return <OverviewFabButton href={routes.events.manage(event.id)} label={t('sections.overview')} count={count} raised={raised} hidden={hidden} />;
}
