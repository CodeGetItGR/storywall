'use client';

import { useCallback } from 'react';

import { FeedModuleBlock } from '@/components/feed/layout/FeedModuleBlock';
import { useFeedSectionName } from '@/hooks/useFeedSectionName';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedScheduleEditorHref } from '@/lib/feedModuleBlocks';
import { drawsScheduleCard } from '@/lib/feedSchedule';
import type { InvitationSection } from '@/lib/invitation/sections';
import { useIsHost } from '@/providers/EventProvider';

type CardEvent = Pick<EventDetailResponseDto, 'id' | 'eventType' | 'modules' | 'sessions' | 'schedule'>;

// The card hosts and co-hosts get for a schedule with no sessions, opening its editor. Null for any other block or
// viewer. underTools: in edit mode, with room for the block's tools.
export function useFeedScheduleCardPart(event: CardEvent, underTools = false) {
    const isHost = useIsHost();
    const { blockName } = useFeedSectionName(event.eventType);

    return useCallback(
        (section: InvitationSection) =>
            isHost && drawsScheduleCard(section, event) ? (
                <FeedModuleBlock
                    module="schedule"
                    name={blockName(section)}
                    eventType={event.eventType}
                    href={feedScheduleEditorHref(event.id)}
                    available
                    underTools={underTools}
                />
            ) : null,
        [blockName, event, isHost, underTools],
    );
}
