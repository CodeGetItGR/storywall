'use client';

import { type DehydratedState, hydrate, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Fills, during render, the queries in `state` that the cache already holds without data.
 * HydrationBoundary waits for an effect on any query that already exists, so on-screen data
 * isn't swapped mid-render; a query with no data has nothing on screen to swap.
 */
export function useHydrateEmptyQueries(state: DehydratedState): void {
    const queryClient = useQueryClient();

    // In render, like HydrationBoundary's own pass over new queries. hydrate() is idempotent.
    useMemo(() => {
        const cache = queryClient.getQueryCache();
        const queries = state.queries.filter((query) => query.state.data !== undefined && cache.get(query.queryHash)?.state.data === undefined);
        if (queries.length > 0) hydrate(queryClient, { queries });
    }, [queryClient, state]);
}
