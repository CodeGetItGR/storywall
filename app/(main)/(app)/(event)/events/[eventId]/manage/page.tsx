import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventInvitationKeys } from '@/hooks/useEventInvitations';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { rsvpKeys } from '@/hooks/useRsvps';
import { usageKeys } from '@/hooks/useUsage';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type {
    EventDetailResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventUsageResponseDto,
    RsvpResponseDto,
} from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { isEventDeleted, isModuleAvailable } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import ManagePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// ManageScreen fires four host-only calls in parallel on mount (members,
// rsvps, invitations, usage) — the biggest single client-side waterfall in
// the app. Mirrors ManageScreen's own gating (isHost, isDraft for everything
// but usage, and the plan including RSVP for rsvps) so a prefetch is never wasted on data the client
// wouldn't have requested anyway. QR links have their own dedicated page
// (manage/qr) with their own prefetch.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        const { accessToken } = context;

        try {
            const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
            const isDraft = event.status === 'DRAFT';

            // A deleted event's manage page shows only the banner and billing;
            // ManageScreen passes null ids for everything else, so don't prefetch it.
            if (isEventDeleted(event)) throw new Error('deleted');

            const usage = await serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), accessToken);
            queryClient.setQueryData(usageKeys.event(eventId), usage);

            if (!isDraft) {
                const rsvpAvailable = isModuleAvailable(event.modules, 'rsvp');
                const [members, rsvps, invitations] = await Promise.all([
                    serverGet<EventMemberResponseDto[]>(endpoints.events.members(eventId), accessToken),
                    rsvpAvailable ? serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(eventId), accessToken) : null,
                    serverGet<EventInvitationResponseDto[]>(endpoints.events.invitations(eventId), accessToken),
                ]);

                queryClient.setQueryData(eventMemberKeys.list(eventId), normalizeList(members).items);
                if (rsvps) queryClient.setQueryData(rsvpKeys.list(eventId), normalizeList(rsvps).items);
                queryClient.setQueryData(eventInvitationKeys.list(eventId), normalizeList(invitations).items);
            }
        } catch {
            // Best-effort — ManageScreen's own hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ManagePage />
        </HydrationBoundary>
    );
}
