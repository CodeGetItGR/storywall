'use client';

import { useMemo } from 'react';

import type { FeedSectionContent } from '@/components/feed/edit/FeedSectionContentFields';
import type { FeedFailedPhoto } from '@/hooks/useFeedSectionEdits';
import { blockTextColor } from '@/lib/feedBlockEdits';
import { canHaveBackground, sectionColor, sectionPhoto } from '@/lib/feedSectionBackground';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type ContentEdits = {
    uploadingId: string | null;
    failed: FeedFailedPhoto | null;
    addPhoto: (sectionId: string, file: File) => Promise<boolean>;
    setTextColor: (sectionId: string, color: string) => void;
    setBackgroundPhoto: (sectionId: string, file: File) => Promise<boolean>;
    removeBackgroundPhoto: (sectionId: string) => void;
    setBackgroundColor: (sectionId: string, color: string | undefined) => void;
};

// The photo, text colour and background settings of the section whose settings are open; null for a block without them.
export function useFeedSectionContent(
    section: InvitationSection | null,
    ctx: RenderContext,
    themeColors: readonly string[],
    { uploadingId, failed, addPhoto, setTextColor, setBackgroundPhoto, removeBackgroundPhoto, setBackgroundColor }: ContentEdits,
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
            background: {
                color: sectionColor(section),
                hasPhoto: sectionPhoto(section) !== undefined,
                failed: failed?.id === section.id && failed.place === 'background',
                onColor: (color) => setBackgroundColor(section.id, color),
                onPickPhoto: (file) => void setBackgroundPhoto(section.id, file),
                onRemovePhoto: () => removeBackgroundPhoto(section.id),
            },
        };
    }, [addPhoto, ctx, failed, removeBackgroundPhoto, section, setBackgroundColor, setBackgroundPhoto, setTextColor, themeColors, uploadingId]);
}
