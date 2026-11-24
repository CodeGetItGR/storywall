'use client';

import { useMemo } from 'react';

import type { FeedAddItem } from '@/components/feed/edit/FeedAddSectionSheet';
import { FeedSectionPreviewPicture } from '@/components/feed/edit/FeedSectionPreviewPicture';
import { useFeedSectionName } from '@/hooks/useFeedSectionName';
import type { EventTypeConvention } from '@/lib/api/types';
import type { FeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';

const NONE: FeedAddItem<NewSectionType>[] = [];

// Invitation mode's Add section list: each section's name and its picture in the theme edit mode shows.
export function useFeedInvitationAddItems(previews: FeedSectionPreviews | null, eventType: EventTypeConvention): FeedAddItem<NewSectionType>[] {
    const { sectionName } = useFeedSectionName(eventType);
    return useMemo(
        () =>
            previews?.items.map((item) => ({
                type: item.type,
                name: sectionName(item.type),
                picture: <FeedSectionPreviewPicture preview={item} ctx={previews.ctx} lang={previews.lang} fontFaces={previews.fontFaces} />,
            })) ?? NONE,
        [previews, sectionName],
    );
}
