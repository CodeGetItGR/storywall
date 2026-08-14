'use client';

import { createContext, type ReactNode, type RefObject, useContext } from 'react';

import type { EventDetailResponseDto, ModuleKeyConvention, PostResponseDto } from '@/lib/api/types';

type FeedPageContextValue = {
    event: EventDetailResponseDto;
    eventId: string;
    isFetchingNextPage: boolean;
    isHost: boolean;
    loadMoreRef: RefObject<HTMLDivElement | null>;
    loadingMoreLabel: string;
    moduleFlags: Record<ModuleKeyConvention, boolean>;
    posts: PostResponseDto[];
    storedRsvpId: string | null | undefined;
};

const FeedPageContext = createContext<FeedPageContextValue | null>(null);

export function FeedPageProvider({ children, value }: { children: ReactNode; value: FeedPageContextValue }) {
    return <FeedPageContext.Provider value={value}>{children}</FeedPageContext.Provider>;
}

export function useFeedPage() {
    const context = useContext(FeedPageContext);
    if (!context) {
        throw new Error('useFeedPage must be used within FeedPageProvider');
    }

    return context;
}
