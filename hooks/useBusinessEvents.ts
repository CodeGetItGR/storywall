import { useInfiniteQuery } from '@tanstack/react-query';

import { businessKeys } from '@/hooks/useBusinessOverview';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { BusinessEventDto } from '@/lib/api/types';

export const BUSINESS_EVENTS_PAGE_SIZE = 10;

// The vendor's events, newest first, ten at a time.
export function useBusinessEvents(enabled = true) {
    const query = useInfiniteQuery({
        queryKey: businessKeys.events,
        queryFn: ({ pageParam }) => api.get<Page<BusinessEventDto>>(endpoints.me.businessEvents(pageParam, BUSINESS_EVENTS_PAGE_SIZE)),
        initialPageParam: 0,
        getNextPageParam: (last) => (last.page.number + 1 < last.page.totalPages ? last.page.number + 1 : undefined),
        enabled,
        retry: false,
    });
    const events = query.data?.pages.flatMap((page) => page.content) ?? [];

    return {
        events,
        isLoading: query.isLoading,
        // Only a read with nothing to show counts as failed.
        loadFailed: Boolean(query.error) && events.length === 0,
        hasMore: Boolean(query.hasNextPage),
        isLoadingMore: query.isFetchingNextPage,
        loadMore: () => void query.fetchNextPage(),
        retry: () => void query.refetch(),
    };
}
