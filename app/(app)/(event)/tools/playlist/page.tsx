import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventModuleKeys } from '@/hooks/useEventModules';
import { playlistKeys } from '@/hooks/usePlaylist';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventModuleResponseDto, PlaylistSuggestionResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import PlaylistPage from './PageClient';

// PlaylistScreen needs the event's modules (to check whether playlist is
// enabled) before it can even decide what to render, then the suggestions
// list — both prefetched here so neither shows a loading state.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context?.activeEventId) {
        const { accessToken, activeEventId } = context;

        try {
            const [modules, suggestions] = await Promise.all([
                serverGet<EventModuleResponseDto[]>(endpoints.events.modules(activeEventId), accessToken),
                serverGet<PlaylistSuggestionResponseDto[]>(endpoints.events.playlistSuggestions(activeEventId), accessToken),
            ]);
            queryClient.setQueryData(eventModuleKeys.list(activeEventId), normalizeList(modules).items);
            queryClient.setQueryData(playlistKeys.suggestions(activeEventId), normalizeList(suggestions).items);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <PlaylistPage />
        </HydrationBoundary>
    );
}
