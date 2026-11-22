'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';
import { feedEditBannerLook } from '@/lib/feedEditBanner';
import { feedPageTheme } from '@/lib/feedPageTheme';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { invitationThemeKeys, isCatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

// The banner picture's data; null only while it is still loading. The Overview's server render prefetches the
// layout, the catalogue and the stand-in theme (manage/(root)/page.tsx), so on a full load it draws at once.
export function useFeedEditBannerPreview(event: EventDetailResponseDto) {
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled: true });
    const catalogueType = isCatalogueEventType(event.eventType);
    const catalogue = useInvitationThemeCatalogue({ enabled: catalogueType });
    const onWall = !layout.isLoading && layout.themeSlug === null;
    // The catalogue's first theme for the event type stands in for a feed on the wall theme.
    const fallbackSlug = catalogueType ? (catalogue.themes?.find((theme) => theme.eventType === event.eventType)?.slug ?? null) : null;
    const fallback = useQuery({
        queryKey: invitationThemeKeys.publicTheme(fallbackSlug ?? ''),
        queryFn: () => fetchInvitationTheme(fallbackSlug!),
        enabled: onWall && fallbackSlug !== null,
        staleTime: 5 * 60_000,
    });
    // A disabled query stays pending, so each wait names the fetch that really runs. A failed fetch draws the wall look.
    const waiting = layout.isLoading || (onWall && ((catalogueType && catalogue.isPending) || (fallbackSlug !== null && fallback.isPending)));
    const { document, theme, media, revision, themeSlug } = layout;
    const look = useMemo(
        () => (waiting ? null : feedEditBannerLook({ document, theme, media, revision, themeSlug }, fallback.data)),
        [waiting, document, theme, media, revision, themeSlug, fallback.data],
    );
    const fonts = useInvitationFonts(look?.kind === 'invitation');

    return useMemo(() => {
        if (!look) return null;
        if (look.kind === 'wall') {
            // The event's own wall theme, with the feed's background colour when it has one.
            const wall = feedPageTheme(event.theme, document.overrides.backgroundColor).theme;
            const style = eventThemeStyle(wall?.backgroundColor, { titleColor: wall?.titleColor, headingFont: wall?.headingFont });
            return { kind: 'wall' as const, event: { ...event, theme: wall }, style, headingFont: style ? (wall?.headingFont ?? null) : null };
        }
        const ctx = {
            ...buildRenderContext(look.document, { ...look.theme, textAnimation: 'none' }, look.media),
            labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
        };
        return {
            kind: 'invitation' as const,
            ctx,
            cover: look.cover,
            index: look.document.sections.indexOf(look.cover),
            lang: locale,
            fontFaces: uploadedFontFaceCss(fonts.data ?? [], [look.document, look.theme]),
        };
    }, [look, event, document, fonts.data, locale]);
}
