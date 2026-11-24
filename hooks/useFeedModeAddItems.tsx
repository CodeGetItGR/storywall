'use client';

import { useMemo, useState } from 'react';

import type { FeedAddItem } from '@/components/feed/edit/FeedAddSectionSheet';
import { FeedModeSectionPicture } from '@/components/feed/edit/FeedModeSectionPicture';
import { useFeedSectionName } from '@/hooks/useFeedSectionName';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { MediaResolver } from '@/lib/invitation/render';
import type { FeedModeSectionType } from '@/lib/invitation/sections';

// Feed mode's Add section list. While the sheet closes it keeps the list it was opened with, so nothing changes as it
// slides away (useFeedSectionPreviews does the same).
export function useFeedModeAddItems(
    event: EventDetailResponseDto,
    types: readonly FeedModeSectionType[],
    media: MediaResolver,
    open: boolean,
): FeedAddItem<FeedModeSectionType>[] {
    const { sectionName } = useFeedSectionName(event.eventType);
    const [last, setLast] = useState(types);
    if (open && types !== last) setLast(types);
    const listed = open ? types : last;

    return useMemo(
        () =>
            listed.map((type) => ({
                type,
                name: sectionName(type),
                picture: <FeedModeSectionPicture event={event} type={type} media={media} />,
            })),
        [event, listed, media, sectionName],
    );
}
