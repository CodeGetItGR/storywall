import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';

// Shared between the client QueryClientProvider (providers/Providers.tsx) and
// any Server Component that prefetches into a per-request QueryClient before
// handing it to <HydrationBoundary> — keeping retry/staleTime behavior
// identical on both sides avoids a hydration mismatch in query state.
// For content guests keep adding during the event (feed, comments, gallery,
// playlist, wishbook, RSVPs): coming back to it should show what's new.
export const LIVE_CONTENT_STALE_TIME = 30 * 1000;

export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => {
                    // 4xx responses (bad auth, validation, not-found, etc.) won't
                    // succeed on retry — only retry transient/server errors.
                    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
                    return failureCount < 2;
                },
                // Most reads change rarely and every mutation invalidates what it
                // touches, so cached data stays fresh for a while instead of being
                // re-requested by every component that mounts it. Lists that must
                // stay live poll on their own refetchInterval.
                staleTime: 10 * 60 * 1000,
                refetchOnWindowFocus: false,
            },
        },
    });
}
