import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { InvitationTextsPanel } from '@/components/admin/saveMyDate/texts/InvitationTextsPanel';
import { adminKeys } from '@/hooks/useAdmin';
import { adminInvitationTextKeys } from '@/hooks/useAdminInvitationTexts';
import type { AdminInvitationTextDto } from '@/lib/adminInvitationTexts';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the texts and the event type names so the list renders at once on a full page load.
export default async function SaveMyDateTextsPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const [texts, eventTypes] = await Promise.all([
                serverGet<AdminInvitationTextDto[]>(endpoints.admin.invitationTexts.list, accessToken),
                serverGet<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list, accessToken),
            ]);
            queryClient.setQueryData(adminInvitationTextKeys.list(), texts);
            queryClient.setQueryData(adminKeys.platformEventTypes, eventTypes);
        } catch {
            // Best-effort: not an admin, or Spring is down. The client hooks fetch as usual.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <InvitationTextsPanel />
        </HydrationBoundary>
    );
}
