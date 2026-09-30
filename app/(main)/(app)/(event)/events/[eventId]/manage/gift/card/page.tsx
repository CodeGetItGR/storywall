import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { giftKeys } from '@/hooks/useGift';
import { endpoints } from '@/lib/api/endpoints';
import { serverGetOrNull } from '@/lib/api/serverFetch';
import type { GiftHandoverResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import GiftCardPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the gift (any host) so the card's QR draws without a loading state.
// The PIN is never fetched: only a card issued in this visit has it, in memory.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        try {
            const gift = await serverGetOrNull<GiftHandoverResponseDto>(endpoints.events.gift(eventId), context.accessToken);
            queryClient.setQueryData(giftKeys.event(eventId), gift);
        } catch {
            // Best-effort — useEventGift fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <GiftCardPage />
        </HydrationBoundary>
    );
}
