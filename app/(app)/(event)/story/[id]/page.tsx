import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { mediaKeys } from '@/hooks/useMedia';
import { storyKeys } from '@/hooks/useStories';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventMemberResponseDto, MediaResponseDto, StoryResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { makeQueryClient } from '@/lib/queryClient';

import StoryPage from './PageClient';

type PageProps = { params: Promise<{ id: string }> };

// StoryBoundary needs the story itself, then (once its eventId is known) the
// event's other stories, members, and the story's media — all prefetched
// here in the same request/response round trip instead of a client waterfall.
export default async function Page({ params }: PageProps) {
    const { id } = await params;
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const story = await serverGet<StoryResponseDto>(endpoints.stories.byId(id), accessToken);
            queryClient.setQueryData(storyKeys.detail(id), story);

            const [allStories, members, media] = await Promise.all([
                serverGet<StoryResponseDto[]>(endpoints.events.stories(story.eventId), accessToken),
                serverGet<EventMemberResponseDto[]>(endpoints.events.members(story.eventId), accessToken),
                story.mediaId ? serverGet<MediaResponseDto>(endpoints.medias.byId(story.mediaId), accessToken) : Promise.resolve(null),
            ]);

            queryClient.setQueryData(storyKeys.list(story.eventId), normalizeList(allStories).items);
            queryClient.setQueryData(eventMemberKeys.list(story.eventId), normalizeList(members).items);
            if (media) queryClient.setQueryData(mediaKeys.detail(story.mediaId), media);
        } catch {
            // Best-effort — StoryBoundary's own hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <StoryPage params={params} />
        </HydrationBoundary>
    );
}
