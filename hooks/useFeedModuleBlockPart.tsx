'use client';

import { useCallback } from 'react';

import { FeedModuleBlock } from '@/components/feed/layout/FeedModuleBlock';
import { FeedGalleryModule, FeedWishbookModule } from '@/components/feed/modules/FeedModuleContentBlocks';
import { FeedScheduleBlock } from '@/components/feed/sections/FeedScheduleBlock';
import { useAuth } from '@/hooks/useAuth';
import { useFeedScheduleCardPart } from '@/hooks/useFeedScheduleCardPart';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { feedModuleToolHref, moduleOfBlock } from '@/lib/feedModuleBlocks';
import { drawsScheduleCard, drawsScheduleTimeline } from '@/lib/feedSchedule';
import type { InvitationSection } from '@/lib/invitation/sections';

// What FeedTopFrame draws inside a module block (plan 7c): the block, opening the module's tool for a member. Schedule
// draws its timeline instead, or the hosts' card while it has no sessions.
// underTools: in edit mode, with room for the block's tools.
export function useFeedModuleBlockPart(event: EventDetailResponseDto, underTools = false) {
    const { id, eventType, modules } = event;
    const scheduleCard = useFeedScheduleCardPart(event, underTools);
    const { isAuthenticated } = useAuth();
    return useCallback(
        (section: InvitationSection) => {
            const key = moduleOfBlock(section);
            if (!key) return null;
            if (drawsScheduleCard(section, event)) return scheduleCard(section);
            if (drawsScheduleTimeline(section, event)) return <FeedScheduleBlock event={event} underTools={underTools} />;
            if (key === 'gallery' || key === 'wishbook') {
                // A signed-out visitor can't read photos or wishes: these two blocks aren't drawn for them.
                if (!isAuthenticated) return null;
                const Block = key === 'gallery' ? FeedGalleryModule : FeedWishbookModule;
                return <Block event={event} available={isModuleAvailable(modules, key)} underTools={underTools} />;
            }
            return (
                <FeedModuleBlock
                    module={key}
                    eventType={eventType}
                    href={feedModuleToolHref(id, key)}
                    available={isModuleAvailable(modules, key)}
                    underTools={underTools}
                />
            );
        },
        [event, eventType, id, isAuthenticated, modules, scheduleCard, underTools],
    );
}
