import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import type { AdminInvitationThemeDto } from '@/lib/adminInvitationThemes';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';
import { makeQueryClient } from '@/lib/queryClient';

import ThemeEditorPage from './PageClient';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('InvitationEditor');
    return { title: t('themeMetaTitle') };
}

type PageProps = { params: Promise<{ themeId: string }> };

// An admin's theme in the invitation editor (KAN-68). The layout checks Save my date shows
// and the shell lets admins only; the theme is prefetched on a full page load.
export default async function Page({ params }: PageProps) {
    const { themeId } = await params;
    const queryClient = makeQueryClient();
    const accessToken = await prefetchAccessToken();

    // True when the theme is in the cache for this page.
    const [uploadedFonts, prefetched] = await Promise.all([
        fetchUploadedFonts(),
        (async () => {
            if (!accessToken) return false;
            try {
                const theme = await serverGet<AdminInvitationThemeDto>(endpoints.admin.invitationThemes.byId(themeId), accessToken);
                queryClient.setQueryData(adminInvitationThemeKeys.detail(themeId), theme);
                return true;
            } catch {
                // Best-effort: not an admin, or Spring is down. The editor loads the theme itself.
                return false;
            }
        })(),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ThemeEditorPage themeId={themeId} uploadedFonts={uploadedFonts} prefetched={prefetched} />
        </HydrationBoundary>
    );
}
