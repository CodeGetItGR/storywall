import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { rsvpKeys } from '@/hooks/useRsvps';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventMemberResponseDto, RsvpResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import RsvpPage from './PageClient';

// RsvpScreen is host-only (see EventRouteGate requireHost in PageClient) and
// needs both members and rsvps to build the roster — prefetched together so
// neither shows a loading state for the host who lands here.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context?.activeEventId && context.isHost) {
        const { accessToken, activeEventId } = context;

        try {
            const [members, rsvps] = await Promise.all([
                serverGet<EventMemberResponseDto[]>(endpoints.events.members(activeEventId), accessToken),
                serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(activeEventId), accessToken),
            ]);
            queryClient.setQueryData(eventMemberKeys.list(activeEventId), normalizeList(members).items);
            queryClient.setQueryData(rsvpKeys.list(activeEventId), normalizeList(rsvps).items);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <RsvpPage />
        </HydrationBoundary>
    );
}
