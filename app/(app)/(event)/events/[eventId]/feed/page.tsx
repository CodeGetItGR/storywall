import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';

import { postKeys, POSTS_PAGE_SIZE } from '@/hooks/usePosts';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { PostResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { makeQueryClient } from '@/lib/queryClient';

import FeedPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the feed's first page of posts so FeedPageBoundary finds it
// already cached and skips the loading skeleton — the event itself is
// already prefetched one level up by the (event) layout.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const firstPage = await serverGet<Page<PostResponseDto>>(
                `${endpoints.events.posts(eventId)}?page=0&size=${POSTS_PAGE_SIZE}`,
                accessToken
            );
            queryClient.setQueryData(postKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
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
