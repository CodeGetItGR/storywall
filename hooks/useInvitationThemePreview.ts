'use client';

import { useMemo } from 'react';

import { useAdminInvitationTheme, useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { adminThemePreview } from '@/lib/adminInvitationThemes';
import type { ThemePreview } from '@/lib/invitation/themePreview';

export type InvitationThemePreviewState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; preview: ThemePreview };

// One theme drawn as guests would see it, from the admin API, so drafts and hidden themes show too.
export function useInvitationThemePreview(themeId: string) {
    const themeQuery = useAdminInvitationTheme(themeId);
    const fontsQuery = useInvitationFonts(true);

    const state = useMemo<InvitationThemePreviewState>(() => {
        if (themeQuery.error) return { status: 'failed' };
        if (!themeQuery.data) return { status: 'loading' };
        try {
            return { status: 'ready', preview: adminThemePreview(themeQuery.data) };
        } catch {
            return { status: 'failed' };
        }
    }, [themeQuery.data, themeQuery.error]);

    return {
        state,
        name: themeQuery.data?.name ?? null,
        // Without the font catalogue, uploaded fonts fall back; the theme still draws.
        uploadedFonts: fontsQuery.data ?? [],
    };
}
