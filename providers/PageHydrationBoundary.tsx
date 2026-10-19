'use client';

import { type DehydratedState, HydrationBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useHydrateEmptyQueries } from '@/hooks/useHydrateEmptyQueries';

// HydrationBoundary for a page that prefetches the app config. AppProviders reads the config
// above every page, so the query already exists when the page renders, and HydrationBoundary
// alone would fill it only after the first render, after the client has asked for it again.
export function PageHydrationBoundary({ state, children }: { state: DehydratedState; children: ReactNode }) {
    useHydrateEmptyQueries(state);

    return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
