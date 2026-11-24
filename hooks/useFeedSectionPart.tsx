'use client';

import { useCallback } from 'react';

import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// What FeedTopFrame draws for one of Feed mode's sections on the member page, where a tap opens a pinned photo.
export function useFeedSectionPart(event: EventDetailResponseDto, media: MediaResolver) {
    return useCallback(
        (section: InvitationSection) => <FeedModeSection event={event} section={section} media={media} opensPhotos />,
        [event, media],
    );
}
