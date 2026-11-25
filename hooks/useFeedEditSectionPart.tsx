'use client';

import { useCallback } from 'react';

import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import { useFeedScheduleCardPart } from '@/hooks/useFeedScheduleCardPart';
import { useFeedSectionName } from '@/hooks/useFeedSectionName';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// What FeedTopFrame draws for one of Feed mode's sections in edit mode: its live content, or its name while there is
// nothing to show. Pinned photos take no taps here: a tap opens the section's settings.
export function useFeedEditSectionPart(event: EventDetailResponseDto, media: MediaResolver) {
    const { blockName } = useFeedSectionName(event.eventType);
    const scheduleCard = useFeedScheduleCardPart(event, true);
    return useCallback(
        (section: InvitationSection) =>
            scheduleCard(section) ?? (
                <FeedModeSection event={event} section={section} media={media} placeholder={<FeedBlockPlaceholder name={blockName(section)} />} />
            ),
        [blockName, event, media, scheduleCard],
    );
}
