import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventSessionKeys } from '@/hooks/useEventSessions';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import SchedulePage from './PageClient';

// Prefetches the active event's sessions so ScheduleScreen renders the list
// immediately instead of its loading state.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context?.activeEventId) {
        try {
            const sessions = await serverGet<EventSessionResponseDto[]>(endpoints.events.sessions(context.activeEventId), context.accessToken);
            queryClient.setQueryData(eventSessionKeys.list(context.activeEventId), normalizeList(sessions).items);
        } catch {
            // Best-effort — useEventSessions fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <SchedulePage />
        </HydrationBoundary>
    );
}
