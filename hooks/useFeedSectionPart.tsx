'use client';

import { useCallback } from 'react';

import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import { useFeedScheduleCardPart } from '@/hooks/useFeedScheduleCardPart';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// What FeedTopFrame draws for one of Feed mode's sections on the member page, where a tap opens a pinned photo.
export function useFeedSectionPart(event: EventDetailResponseDto, media: MediaResolver) {
    const scheduleCard = useFeedScheduleCardPart(event);
    return useCallback(
        (section: InvitationSection) => scheduleCard(section) ?? <FeedModeSection event={event} section={section} media={media} opensPhotos />,
        [event, media, scheduleCard],
    );
}
