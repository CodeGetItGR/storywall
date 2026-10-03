import type { QueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { ServerEventContext } from '@/lib/auth/serverEventContext';

// For the home page: seeds the same membership list (myEventsKeys.all) and
// per-event detail cache (eventKeys.detail) that useMyEvents/useEventDetails
// read client-side, so the screen lands with its events already warm instead
// of showing their loading state.
export async function prefetchMyEventDetails(queryClient: QueryClient, context: ServerEventContext) {
    queryClient.setQueryData(myEventsKeys.all, context.memberships);

    // Each event seeds on its own: one that fails must not discard the rest.
    // useEventDetails fetches whatever is missing on the client.
    const details = await Promise.allSettled(
        context.memberships.map((member) => serverGet<EventDetailResponseDto>(endpoints.events.byId(member.eventId), context.accessToken)),
    );
    details.forEach((result, i) => {
        if (result.status === 'fulfilled') queryClient.setQueryData(eventKeys.detail(context.memberships[i].eventId), result.value);
    });
}
