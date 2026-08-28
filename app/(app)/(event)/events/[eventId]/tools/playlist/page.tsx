import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';

import { eventModuleKeys } from '@/hooks/useEventModules';
import { playlistKeys } from '@/hooks/usePlaylist';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventModuleResponseDto, PlaylistSuggestionResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { makeQueryClient } from '@/lib/queryClient';

import PlaylistPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// PlaylistScreen needs the event's modules (to check whether playlist is
// enabled) before it can even decide what to render, then the suggestions
// list — both prefetched here so neither shows a loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const [modules, suggestions] = await Promise.all([
                serverGet<EventModuleResponseDto[]>(endpoints.events.modules(eventId), accessToken),
                serverGet<PlaylistSuggestionResponseDto[]>(endpoints.events.playlistSuggestions(eventId), accessToken),
            ]);
            queryClient.setQueryData(eventModuleKeys.list(eventId), normalizeList(modules).items);
            queryClient.setQueryData(playlistKeys.suggestions(eventId), normalizeList(suggestions).items);
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
