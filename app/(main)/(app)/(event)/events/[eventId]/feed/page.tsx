import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { HE_OR_SHE_MODULE, heOrSheKeys } from '@/hooks/useHeOrShe';
import { storyKeys } from '@/hooks/useStories';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList, type Page } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { HeOrSheViewDto, PostResponseDto, StoryResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { postKeys, POSTS_PAGE_SIZE } from '@/lib/postQueries';
import { makeQueryClient } from '@/lib/queryClient';

import FeedPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

async function prefetchPosts(queryClient: QueryClient, eventId: string, accessToken: string): Promise<void> {
    try {
        if (!(await serverModuleReadable(eventId, 'posts', accessToken))) return;
        const firstPage = await serverGet<Page<PostResponseDto>>(`${endpoints.events.posts(eventId)}?page=0&size=${POSTS_PAGE_SIZE}`, accessToken);
        queryClient.setQueryData(postKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
    } catch {
        // Best-effort — useEventPosts fetches normally on the client if this fails.
    }
}

// The Boy or Girl? prompt card sits at the top of the posts.
async function prefetchHeOrShe(queryClient: QueryClient, eventId: string, accessToken: string): Promise<void> {
    try {
        const [postsReadable, heOrSheReadable] = await Promise.all([
            serverModuleReadable(eventId, 'posts', accessToken),
            serverModuleReadable(eventId, HE_OR_SHE_MODULE, accessToken),
        ]);
        if (!postsReadable || !heOrSheReadable) return;
        const view = await serverGet<HeOrSheViewDto>(endpoints.events.heOrShe(eventId), accessToken);
        queryClient.setQueryData(heOrSheKeys.view(eventId), view);
    } catch {
        // Best-effort — useHeOrShe fetches normally on the client if this fails.
    }
}

async function prefetchStories(queryClient: QueryClient, eventId: string, accessToken: string): Promise<void> {
    try {
        if (!(await serverModuleReadable(eventId, 'stories', accessToken))) return;
        const stories = await serverGet<StoryResponseDto[]>(endpoints.events.stories(eventId), accessToken);
        queryClient.setQueryData(storyKeys.list(eventId), normalizeList(stories).items);
    } catch {
        // Best-effort — useEventStories fetches normally on the client if this fails.
    }
}

// Prefetches what the top of the feed shows: the first page of posts, the Boy or Girl? view for its
// prompt card, and the stories row, all at once. FeedPageBoundary then finds them cached and skips
// its skeletons. The event itself is already prefetched one level up by the (event) layout.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        await Promise.all([
            prefetchPosts(queryClient, eventId, accessToken),
            prefetchHeOrShe(queryClient, eventId, accessToken),
            prefetchStories(queryClient, eventId, accessToken),
        ]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <FeedPage params={params} />
        </HydrationBoundary>
    );
}
