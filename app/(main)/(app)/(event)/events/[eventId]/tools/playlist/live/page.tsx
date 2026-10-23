import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { playlistKeys } from '@/hooks/usePlaylist';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { PlaylistSuggestionLeaderboardDto, VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { hasVendorCapability } from '@/lib/vendors';

import PlaylistLivePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the leaderboard for hosts, and for a DJ after their vendor role
// (which the route gate asks for too). Anyone else gets only the role.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context) {
        try {
            let allowed = context.isHost;
            if (!context.isHost) {
                const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
                queryClient.setQueryData(vendorKeys.me(eventId), me);
                allowed = hasVendorCapability(me, 'SONG_REQUESTS');
            }
            // Like the hook: only while the playlist is readable.
            if (allowed && readableModuleKeys(event).has('playlist')) {
                const rows = await serverGet<PlaylistSuggestionLeaderboardDto[]>(
                    endpoints.events.playlistSuggestionsLeaderboard(eventId),
                    context.accessToken,
                );
                queryClient.setQueryData(playlistKeys.leaderboard(eventId), rows);
            }
        } catch {
            // Best-effort — the hooks fetch normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <PlaylistLivePage />
        </HydrationBoundary>
    );
}
