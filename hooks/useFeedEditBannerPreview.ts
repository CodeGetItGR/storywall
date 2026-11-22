'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedEditBannerLook, feedEditBannerPicture } from '@/lib/feedEditBannerLook';
import { invitationThemeKeys, isCatalogueEventType } from '@/lib/invitation/themeCatalogue';

// The banner picture's data; null only while it is still loading. The Overview's server render prefetches the
// layout, the catalogue, the stand-in theme and its fonts (manage/(root)/page.tsx), so on a full load it draws at once.
export function useFeedEditBannerPreview(event: EventDetailResponseDto) {
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled: true });
    const catalogueType = isCatalogueEventType(event.eventType);
    const onWall = !layout.isLoading && layout.themeSlug === null;
    // The catalogue is read only for a feed on the wall theme: its first theme for the event type stands in.
    const catalogue = useInvitationThemeCatalogue({ enabled: catalogueType && onWall });
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

    return useMemo(
        () => (look ? feedEditBannerPicture(look, { event, layoutDocument: document, fonts: fonts.data ?? [], locale }) : null),
        [look, event, document, fonts.data, locale],
    );
}
