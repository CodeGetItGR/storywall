import { cache } from 'react';

import { serverPublicCachedGet, serverPublicCachedGetOrNull } from '@/lib/api/serverFetch';
import {
    CATALOGUE_EVENT_TYPES,
    type InvitationThemeCardDto,
    type InvitationThemePage,
    invitationThemesEndpoint,
    mergeCatalogue,
    readThemePage,
} from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto, previewThemeSlug } from '@/lib/invitation/themePreview';

// The same for every visitor, so cached: uncached, every view would spend this server's one rate-limit
// budget at the backend. Five minutes stays well inside the image URLs' lifetime.
export const THEME_CATALOGUE_REVALIDATE_SECONDS = 300;

// Server-only: every active theme the catalogue lists. Throws when the backend fails.
export async function fetchThemeCatalogue(): Promise<InvitationThemeCardDto[]> {
    const lists = await Promise.all(
        CATALOGUE_EVENT_TYPES.map((eventType) =>
            serverPublicCachedGet<InvitationThemeCardDto[]>(invitationThemesEndpoint(eventType), THEME_CATALOGUE_REVALIDATE_SECONDS),
        ),
    );
    return mergeCatalogue(lists);
}

// Server-only: an active theme's page, or null when no active theme has this slug. Cached per request too,
// so the page and its metadata make one call. Throws when the backend fails.
export const fetchThemePage = cache(async (slug: string): Promise<InvitationThemePage | null> => {
    if (!previewThemeSlug({ theme: slug })) return null;
    const dto = await serverPublicCachedGetOrNull<InvitationThemePublicDto>(invitationThemeEndpoint(slug), THEME_CATALOGUE_REVALIDATE_SECONDS);
    return dto && readThemePage(dto);
});
