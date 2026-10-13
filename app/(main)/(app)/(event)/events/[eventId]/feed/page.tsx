import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { HE_OR_SHE_MODULE, heOrSheKeys } from '@/hooks/useHeOrShe';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { HeOrSheViewDto, PostResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { postKeys, POSTS_PAGE_SIZE } from '@/lib/postQueries';
import { makeQueryClient } from '@/lib/queryClient';

import FeedPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the feed's first page of posts (and the Boy or Girl? view, for its prompt card) so FeedPageBoundary finds it
// already cached and skips the loading skeleton — the event itself is
// already prefetched one level up by the (event) layout.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            if (!(await serverModuleReadable(eventId, 'posts', accessToken))) throw new Error('posts unavailable');
            const firstPage = await serverGet<Page<PostResponseDto>>(
                `${endpoints.events.posts(eventId)}?page=0&size=${POSTS_PAGE_SIZE}`,
                accessToken,
            );
            queryClient.setQueryData(postKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
            try {
                // The Boy or Girl? prompt card sits at the top of the posts.
                if (!(await serverModuleReadable(eventId, HE_OR_SHE_MODULE, accessToken))) throw new Error('he_or_she unavailable');
                const view = await serverGet<HeOrSheViewDto>(endpoints.events.heOrShe(eventId), accessToken);
                queryClient.setQueryData(heOrSheKeys.view(eventId), view);
            } catch {
                // Best-effort — useHeOrShe fetches normally on the client if this fails.
            }
        } catch {
            // Best-effort — useEventPosts fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <FeedPage params={params} />
        </HydrationBoundary>
    );
}
