'use client';

import { useMemo } from 'react';

import type { FeedSectionContent } from '@/components/feed/edit/FeedSectionContentFields';
import type { FeedFailedPhoto } from '@/hooks/useFeedSectionEdits';
import { blockTextColor } from '@/lib/feedBlockEdits';
import { canHaveBackground } from '@/lib/feedSectionBackground';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type ContentEdits = {
    uploadingId: string | null;
    failed: FeedFailedPhoto | null;
    addPhoto: (sectionId: string, file: File) => Promise<boolean>;
    setTextColor: (sectionId: string, color: string) => void;
};

// The photo and text colour settings of the section whose settings are open; null for a block without them.
export function useFeedSectionContent(
    section: InvitationSection | null,
    ctx: RenderContext,
    themeColors: readonly string[],
    { uploadingId, failed, addPhoto, setTextColor }: ContentEdits,
): FeedSectionContent | null {
    return useMemo(() => {
        if (!section || !canHaveBackground(section)) return null;
        return {
            textColor: blockTextColor(section, ctx),
            themeColors,
            uploading: uploadingId === section.id,
            failed: failed?.id === section.id && failed.place === 'content',
            onPhoto: (file) => void addPhoto(section.id, file),
            onTextColor: (color) => setTextColor(section.id, color),
        };
    }, [addPhoto, ctx, failed, section, setTextColor, themeColors, uploadingId]);
}
