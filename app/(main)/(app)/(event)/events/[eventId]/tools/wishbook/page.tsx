import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';

import { WISHBOOK_PAGE_SIZE, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { makeQueryClient } from '@/lib/queryClient';

import WishbookPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the wishbook's first page of entries and its count so the host
// view renders immediately instead of showing its loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const [firstPage, count] = await Promise.all([
                serverGet<Page<WishbookEntryResponseDto>>(`${endpoints.events.wishbook(eventId)}?page=0&size=${WISHBOOK_PAGE_SIZE}`, accessToken),
                serverGet<number>(endpoints.events.wishbookCount(eventId), accessToken),
            ]);
            queryClient.setQueryData(wishbookKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
            queryClient.setQueryData(wishbookKeys.count(eventId), count);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <WishbookPage />
        </HydrationBoundary>
    );
}
