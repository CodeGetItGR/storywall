import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { SaveMyDateFontsPanel } from '@/components/admin/saveMyDate/fonts/SaveMyDateFontsPanel';
import { adminKeys } from '@/hooks/useAdmin';
import { adminThemeFontKeys } from '@/hooks/useAdminThemeFonts';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { AdminThemeFontDto, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches Save my date's fonts and the event type names so the list renders at once on a full page load.
export default async function SaveMyDateFontsPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const [fonts, eventTypes] = await Promise.all([
                serverGet<AdminThemeFontDto[]>(endpoints.admin.themeFonts.listIn('INVITATION'), accessToken),
                serverGet<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list, accessToken),
            ]);
            queryClient.setQueryData(adminThemeFontKeys.list('INVITATION'), fonts);
            queryClient.setQueryData(adminKeys.platformEventTypes, eventTypes);
        } catch {
            // Best-effort: not an admin, or Spring is down. The client hooks fetch as usual.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <SaveMyDateFontsPanel />
        </HydrationBoundary>
    );
}
