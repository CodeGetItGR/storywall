'use client';

import { useMyWishes } from '@/hooks/useWishbook';

// The guest's own wishes, shaped for MyWishesSection. Pass null for a host (they read everyone's list).
export function useMyWishesList(eventId: string | null) {
    const myWishes = useMyWishes(eventId);

    function loadMore() {
        void myWishes.fetchNextPage();
    }

    return {
        entries: myWishes.data?.pages.flatMap((page) => page.content) ?? [],
        isLoading: myWishes.isLoading,
        hasNextPage: Boolean(myWishes.hasNextPage),
        isFetchingNextPage: myWishes.isFetchingNextPage,
        onLoadMore: loadMore,
    };
}
