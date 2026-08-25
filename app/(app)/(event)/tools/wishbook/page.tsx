import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { WISHBOOK_PAGE_SIZE, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import WishbookPage from './PageClient';

// Prefetches the wishbook's first page of entries and its count so the host
// view renders immediately instead of showing its loading state.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context?.activeEventId) {
        const { accessToken, activeEventId } = context;

        try {
            const [firstPage, count] = await Promise.all([
                serverGet<Page<WishbookEntryResponseDto>>(
                    `${endpoints.events.wishbook(activeEventId)}?page=0&size=${WISHBOOK_PAGE_SIZE}`,
                    accessToken
                ),
                serverGet<number>(endpoints.events.wishbookCount(activeEventId), accessToken),
            ]);
            queryClient.setQueryData(wishbookKeys.list(activeEventId), { pages: [firstPage], pageParams: [0] });
            queryClient.setQueryData(wishbookKeys.count(activeEventId), count);
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
