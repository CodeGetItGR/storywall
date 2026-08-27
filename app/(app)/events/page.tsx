import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { prefetchMyEventDetails } from '@/lib/api/prefetchMyEvents';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import EventsPage from './PageClient';

// Prefetches the user's memberships and every membership's event detail so
// the grid renders warm instead of showing its loading state on first paint.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context) {
        await prefetchMyEventDetails(queryClient, context);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <EventsPage />
        </HydrationBoundary>
    );
}
