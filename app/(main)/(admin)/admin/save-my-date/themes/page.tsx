import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { InvitationThemesPanel } from '@/components/admin/saveMyDate/themes/InvitationThemesPanel';
import { adminKeys } from '@/hooks/useAdmin';
import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import type { AdminInvitationThemeSummaryDto } from '@/lib/adminInvitationThemes';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the themes and the event type names so the list renders at once on a full page load.
export default async function SaveMyDateThemesPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const [themes, eventTypes] = await Promise.all([
                serverGet<AdminInvitationThemeSummaryDto[]>(endpoints.admin.invitationThemes.list, accessToken),
                serverGet<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list, accessToken),
            ]);
            queryClient.setQueryData(adminInvitationThemeKeys.list(), themes);
            queryClient.setQueryData(adminKeys.platformEventTypes, eventTypes);
        } catch {
            // Best-effort: not an admin, or Spring is down. The client hooks fetch as usual.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <InvitationThemesPanel />
        </HydrationBoundary>
    );
}
