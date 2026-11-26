'use client';

import { useMemo } from 'react';

import { useContentAccess } from '@/hooks/useContentAccess';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useMyWishes, useWishbook } from '@/hooks/useWishbook';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { FEED_WISH_CARDS } from '@/lib/feedModuleContent';
import { routes } from '@/lib/routes';
import { useActiveMember, useIsHost } from '@/providers/EventProvider';

// Where the wishbook page lists a guest's own wishes (MyWishesSection).
const MY_WISHES_ANCHOR = '#my-wishes-title';

// The feed's Wishbook block (KAN-299): the newest wishes for its cards, the link to the rest and the Write button.
// Hosts read everyone's wishes; a guest reads only their own (the API refuses them the rest).
// available: the event still has the wishbook; without it the block draws its empty look with the button off.
export function useFeedWishbookBlock(event: EventDetailResponseDto, available: boolean) {
    const isHost = useIsHost();
    const member = useActiveMember();
    const { isDemoBuilder } = useContentAccess();
    const name = useModuleCopy(event.eventType)('wishbook').name;
    const all = useWishbook(available && isHost ? event.id : null);
    const mine = useMyWishes(available && !isHost && member ? event.id : null);
    const query = isHost ? all : mine;

    const firstPage = query.data?.pages[0];
    const wishes = useMemo(() => (firstPage?.content ?? []).slice(0, FEED_WISH_CARDS), [firstPage?.content]);
    const total = firstPage?.page.totalElements ?? 0;
    const page = routes.events.tools.wishbook(event.id);

    // The same rule as the wishbook page: hosts read, guests write, on a live event (an admin building the demo writes too).
    const canWrite = available && event.status === 'ACTIVE' && (!isHost || isDemoBuilder);

    return {
        name,
        wishes,
        loading: available && query.isLoading,
        isHost,
        writeHref: canWrite ? page : null,
        listHref: total > 0 ? (isHost ? page : `${page}${MY_WISHES_ANCHOR}`) : null,
        total,
        available,
    };
}
