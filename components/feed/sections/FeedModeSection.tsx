'use client';

import type { ReactNode } from 'react';

import { FeedPinnedPhotos } from '@/components/feed/sections/FeedPinnedPhotos';
import { FeedPinnedSection } from '@/components/feed/sections/FeedPinnedSection';
import { FeedPromptSection } from '@/components/feed/sections/FeedPromptSection';
import { FeedScheduleSection } from '@/components/feed/sections/FeedScheduleSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type FeedModeSectionProps = {
    event: EventDetailResponseDto;
    section: InvitationSection;
    media: MediaResolver;
    // What edit mode draws in place of a section with nothing to show.
    placeholder?: ReactNode;
    // A tap on a pinned photo opens it full screen: the member page only.
    opensPhotos?: boolean;
};

// One of Feed mode's sections, by its type.
export function FeedModeSection({ event, section, media, placeholder, opensPhotos = false }: FeedModeSectionProps) {
    switch (section.type) {
        case 'feedSchedule':
            return <FeedScheduleSection event={event} placeholder={placeholder} />;
        case 'feedPrompt':
            return <FeedPromptSection text={section.data.text} placeholder={placeholder} />;
        case 'feedPinned':
            return opensPhotos ? (
                <FeedPinnedPhotos photos={section.data.photos} media={media} />
            ) : (
                <FeedPinnedSection photos={section.data.photos} media={media} placeholder={placeholder} />
            );
        default:
            return null;
    }
}
