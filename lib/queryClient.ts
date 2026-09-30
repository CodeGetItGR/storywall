import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { reopenGuidelinesGateOn4013 } from '@/lib/guidelinesAcceptance';

// Shared between the client QueryClientProvider (providers/Providers.tsx) and
// any Server Component that prefetches into a per-request QueryClient before
// handing it to <HydrationBoundary> — keeping retry/staleTime behavior
// identical on both sides avoids a hydration mismatch in query state.
export function makeQueryClient() {
    const client: QueryClient = new QueryClient({
        // Any request refused for unaccepted guidelines reopens the gate. Calls made
        // with api.* outside React Query don't pass through here; the gate still
        // opens on the next /api/me refetch.
        queryCache: new QueryCache({ onError: (error) => reopenGuidelinesGateOn4013(error, client) }),
        mutationCache: new MutationCache({ onError: (error) => reopenGuidelinesGateOn4013(error, client) }),
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
    return client;
}
