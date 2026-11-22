'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useThemeSampleSections } from '@/hooks/useThemeSampleSections';
import { feedSectionPreview } from '@/lib/feedSectionPreview';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

export type FeedSectionPreview = { type: NewSectionType; section: InvitationSection };
export type FeedSectionPreviews = { items: FeedSectionPreview[]; ctx: RenderContext; lang: string; fontFaces: string };

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

// The Add section cards' pictures, drawn in the theme edit mode shows, with no text animation.
// Without a Save my date theme (no samples), every card is createSection(type, eventType).
export function useFeedSectionPreviews({
    types,
    themeSlug,
    document,
    theme,
    media,
    eventType,
    enabled,
}: FeedSectionPreviewsInput): FeedSectionPreviews {
    const locale = useLocale();
    const samples = useThemeSampleSections(enabled && themeSlug ? themeSlug : null);
    const fonts = useInvitationFonts(enabled);

    const items = useMemo(
        () => types.map((type) => ({ type, section: feedSectionPreview(type, samples?.sections ?? null, eventType) })),
        [types, samples, eventType],
    );
    const ctx = useMemo(() => {
        const sampleMedia: MediaResolver = (mediaId) => samples?.imageUrls[mediaId] ?? media(mediaId);
        return {
            ...buildRenderContext(document, { ...theme, textAnimation: 'none' }, sampleMedia),
            labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
        };
    }, [document, theme, media, samples, locale]);

    return { items, ctx, lang: locale, fontFaces: enabled ? uploadedFontFaceCss(fonts.data ?? [], [document, theme]) : '' };
}
