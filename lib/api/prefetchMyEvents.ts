import type { QueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { ServerEventContext } from '@/lib/auth/serverEventContext';

// Shared by the home and events list pages: seeds the same membership list
// (myEventsKeys.all) and per-event detail cache (eventKeys.detail) that
// useMyEvents/useEventDetails read client-side, so both screens land with
// the full event grid already warm instead of showing their loading state.
export async function prefetchMyEventDetails(queryClient: QueryClient, context: ServerEventContext) {
    queryClient.setQueryData(myEventsKeys.all, context.memberships);

    try {
        const details = await Promise.all(
            context.memberships.map((member) => serverGet<EventDetailResponseDto>(endpoints.events.byId(member.eventId), context.accessToken))
        );
        details.forEach((event, i) => {
            queryClient.setQueryData(eventKeys.detail(context.memberships[i].eventId), event);
        });
    } catch {
        // Best-effort — useEventDetails fetches normally on the client if this fails.
    }
}
