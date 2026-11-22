'use client';

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import { api } from '@/lib/api/client';
import { isHexColor } from '@/lib/eventTheme';
import { themeDesignSchema } from '@/lib/invitation/theme';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

const THEME_STALE_MS = 5 * 60_000;

export function fetchInvitationTheme(slug: string): Promise<InvitationThemePublicDto> {
    return api.get<InvitationThemePublicDto>(invitationThemeEndpoint(slug));
}

export type InvitationThemeCard = {
    slug: string;
    name: string;
    cardColor: string | null;
    illustrationUrl: string | null;
    // From the theme's design, once it has loaded.
    titleFontFamily: string | null;
    titleColor: string | null;
};

// Stable, so the combined list keeps its identity between renders.
function designsOf(results: UseQueryResult<InvitationThemePublicDto>[]) {
    return results.map((result) => result.data);
}

// The event type's Save my date themes as Theme page cards. Each card shows at once from the catalogue;
// its title font and colour follow when the theme's design loads.
export function useInvitationThemeCards(eventType: string, { enabled }: { enabled: boolean }) {
    const catalogue = useInvitationThemeCatalogue({ enabled });
    const listed = useMemo(
        () => (enabled ? (catalogue.themes ?? []).filter((theme) => theme.eventType === eventType) : []),
        [enabled, catalogue.themes, eventType],
    );
    const themes = useQueries({
        queries: listed.map((theme) => ({
            queryKey: invitationThemeKeys.publicTheme(theme.slug),
            queryFn: () => fetchInvitationTheme(theme.slug),
            staleTime: THEME_STALE_MS,
        })),
        combine: designsOf,
    });
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(listed.length > 0);

    const cards = useMemo<InvitationThemeCard[]>(
        () =>
            listed.map((theme, index) => {
                const design = themeDesignSchema.safeParse(themes[index]?.design);
                const primary = design.success ? design.data.colors.primary : null;
                return {
                    slug: theme.slug,
                    name: theme.name,
                    cardColor: theme.cardColor,
                    illustrationUrl: theme.cardThumbUrl,
                    titleFontFamily: design.success ? design.data.fonts.title : null,
                    titleColor: primary && isHexColor(primary) ? primary : null,
                };
            }),
        [listed, themes],
    );

    const fontFaces = useMemo(() => uploadedFontFaceCss(fonts.data ?? [], themes.map((theme) => theme?.design ?? null)), [fonts.data, themes]);

    return { cards, fontFaces, isLoading: enabled && catalogue.isPending };
}
