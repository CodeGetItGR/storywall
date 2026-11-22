'use client';

import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useThemeSampleSections } from '@/hooks/useThemeSampleSections';
import { buildFeedSectionPreviews, type FeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

export type { FeedSectionPreview, FeedSectionPreviews } from '@/lib/feedSectionPreview';

type FeedSectionPreviewsInput = {
    types: NewSectionType[];
    // The session's theme: its slug ('' on the wall theme) for the samples, its design for the look.
    themeSlug: string;
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    eventType: string;
    // Only while the picker is open.
    enabled: boolean;
};

// The Add section cards' pictures, drawn in the theme edit mode shows. Built only while the picker is open; while it
// closes (and until it opens again) the last cards stay, so the sheet doesn't change as it slides away. Null until
// it first opens. The samples load whether or not it is open, so the cards don't change on first open either.
export function useFeedSectionPreviews({
    types,
    themeSlug,
    document,
    theme,
    media,
    eventType,
    enabled,
}: FeedSectionPreviewsInput): FeedSectionPreviews | null {
    const locale = useLocale();
    const samples = useThemeSampleSections(themeSlug || null);
    const fonts = useInvitationFonts(true);
    const fontList = fonts.data;

    const live = useMemo(
        () => (enabled ? buildFeedSectionPreviews({ types, document, theme, media, eventType, samples, fonts: fontList ?? [], locale }) : null),
        [enabled, types, document, theme, media, eventType, samples, fontList, locale],
    );
    const [last, setLast] = useState(live);
    if (live && live !== last) setLast(live);

    return live ?? last;
}
