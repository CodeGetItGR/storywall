import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { WISHBOOK_PAGE_SIZE, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import WishbookPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches what the client asks for: the hosts' list for a host, the
// caller's own wishes for a guest. Guests never get the hosts' list.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const context = await resolveServerEventContext(eventId);
    const queryClient = makeQueryClient();

    if (context?.activeEventId === eventId) {
        const { accessToken } = context;
        try {
            if (!(await serverModuleReadable(eventId, 'wishbook', accessToken))) throw new Error('wishbook unavailable');
            if (context.isHost) {
                const firstPage = await serverGet<Page<WishbookEntryResponseDto>>(
                    `${endpoints.events.wishbook(eventId)}?page=0&size=${WISHBOOK_PAGE_SIZE}`,
                    accessToken,
                );
                queryClient.setQueryData(wishbookKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
            } else {
                const mine = await serverGet<Page<WishbookEntryResponseDto>>(
                    `${endpoints.events.wishbookMine(eventId)}?page=0&size=${WISHBOOK_PAGE_SIZE}`,
                    accessToken,
                );
                queryClient.setQueryData(wishbookKeys.mine(eventId), { pages: [mine], pageParams: [0] });
            }
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
