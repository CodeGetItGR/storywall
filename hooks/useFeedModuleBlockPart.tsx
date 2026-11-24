'use client';

import { useCallback } from 'react';

import { FeedModuleBlock } from '@/components/feed/layout/FeedModuleBlock';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { feedModuleToolHref, moduleOfBlock } from '@/lib/feedModuleBlocks';
import type { InvitationSection } from '@/lib/invitation/sections';

// What FeedTopFrame draws inside a module block (plan 7c): the block, opening the module's tool for a member.
export function useFeedModuleBlockPart(event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'modules'>) {
    const { id, eventType, modules } = event;
    return useCallback(
        (section: InvitationSection) => {
            const key = moduleOfBlock(section);
            if (!key) return null;
            return (
                <FeedModuleBlock
                    module={key}
                    eventType={eventType}
                    href={feedModuleToolHref(id, key)}
                    available={isModuleAvailable(modules, key)}
                />
            );
        },
        [eventType, id, modules],
    );
}
