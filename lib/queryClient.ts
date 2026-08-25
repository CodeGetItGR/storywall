import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';

// Shared between the client QueryClientProvider (providers/Providers.tsx) and
// any Server Component that prefetches into a per-request QueryClient before
// handing it to <HydrationBoundary> — keeping retry/staleTime behavior
// identical on both sides avoids a hydration mismatch in query state.
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
                staleTime: 30 * 1000,
            },
        },
    });
}
