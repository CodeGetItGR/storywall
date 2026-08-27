import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { prefetchMyEventDetails } from '@/lib/api/prefetchMyEvents';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import HomePage from './PageClient';

// Prefetches the user's memberships and every membership's event detail —
// HomeContent needs the full set (not just the first 2) to rank them by
// start date before slicing to the recent-events preview.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context) {
        await prefetchMyEventDetails(queryClient, context);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <HomePage />
        </HydrationBoundary>
    );
}
