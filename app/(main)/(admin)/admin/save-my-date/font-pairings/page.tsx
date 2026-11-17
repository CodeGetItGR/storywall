import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { FontPairingsPanel } from '@/components/admin/saveMyDate/fontPairings/FontPairingsPanel';
import { adminKeys } from '@/hooks/useAdmin';
import { adminFontPairingKeys } from '@/hooks/useAdminFontPairings';
import type { AdminFontPairingDto } from '@/lib/adminFontPairings';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the pairings and the event type names so the list renders at once on a full page load.
// The font lists the drawer needs load when it opens.
export default async function SaveMyDateFontPairingsPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const [pairings, eventTypes] = await Promise.all([
                serverGet<AdminFontPairingDto[]>(endpoints.admin.invitationFontPairings.list, accessToken),
                serverGet<PlatformEventTypeResponseDto[]>(endpoints.admin.platformEventTypes.list, accessToken),
            ]);
            queryClient.setQueryData(adminFontPairingKeys.list(), pairings);
            queryClient.setQueryData(adminKeys.platformEventTypes, eventTypes);
        } catch {
            // Best-effort: not an admin, or Spring is down. The client hooks fetch as usual.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <FontPairingsPanel />
        </HydrationBoundary>
    );
}
