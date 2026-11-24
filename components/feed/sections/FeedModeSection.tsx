'use client';

import type { ReactNode } from 'react';

import { FeedPromptSection } from '@/components/feed/sections/FeedPromptSection';
import { FeedScheduleSection } from '@/components/feed/sections/FeedScheduleSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { InvitationSection } from '@/lib/invitation/sections';

// placeholder: what edit mode draws in place of a section with nothing to show.
type FeedModeSectionProps = { event: EventDetailResponseDto; section: InvitationSection; placeholder?: ReactNode };

// One of Feed mode's sections, by its type.
export function FeedModeSection({ event, section, placeholder }: FeedModeSectionProps) {
    switch (section.type) {
        case 'feedSchedule':
            return <FeedScheduleSection event={event} placeholder={placeholder} />;
        case 'feedPrompt':
            return <FeedPromptSection text={section.data.text} placeholder={placeholder} />;
        default:
            return null;
    }
}
