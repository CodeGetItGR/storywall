import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { rsvpKeys } from '@/hooks/useRsvps';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, EventMemberResponseDto, RsvpResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import RsvpPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// RsvpScreen is host-only (see EventRouteGate requireHost in PageClient) and
// needs both members and rsvps to build the roster — prefetched together so
// neither shows a loading state for the host who lands here. Skipped when the
// event's plan doesn't include RSVP, since RsvpScreen then renders no roster.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        const { accessToken } = context;

        try {
            const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
            if (!isModuleAvailable(event.modules, 'rsvp')) throw new Error('rsvp unavailable');

            const [members, rsvps] = await Promise.all([
                serverGet<EventMemberResponseDto[]>(endpoints.events.members(eventId), accessToken),
                serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(eventId), accessToken),
            ]);
            queryClient.setQueryData(eventMemberKeys.list(eventId), normalizeList(members).items);
            queryClient.setQueryData(rsvpKeys.list(eventId), normalizeList(rsvps).items);
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
