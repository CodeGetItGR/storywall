import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventInvitationKeys } from '@/hooks/useEventInvitations';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { qrLinkKeys } from '@/hooks/useQrLinks';
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
    QrLinkResponseDto,
    QrLinkStatsDto,
    RsvpResponseDto,
} from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import ManagePage from './PageClient';

// ManageScreen fires six host-only calls in parallel on mount (members,
// rsvps, invitations, qr links, qr link stats, usage) — the biggest single
// client-side waterfall in the app. Mirrors ManageScreen's own gating
// (isHost, and isDraft for everything but usage) so a prefetch is never
// wasted on data the client wouldn't have requested anyway.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context?.activeEventId && context.isHost) {
        const { accessToken, activeEventId } = context;

        try {
            const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(activeEventId), accessToken);
            const isDraft = event.status === 'DRAFT';

            const usage = await serverGet<EventUsageResponseDto>(endpoints.events.usage(activeEventId), accessToken);
            queryClient.setQueryData(usageKeys.event(activeEventId), usage);

            if (!isDraft) {
                const [members, rsvps, invitations, qrLinks, qrLinkStats] = await Promise.all([
                    serverGet<EventMemberResponseDto[]>(endpoints.events.members(activeEventId), accessToken),
                    serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(activeEventId), accessToken),
                    serverGet<EventInvitationResponseDto[]>(endpoints.events.invitations(activeEventId), accessToken),
                    serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(activeEventId), accessToken),
                    serverGet<QrLinkStatsDto[]>(endpoints.events.qrLinkStats(activeEventId), accessToken),
                ]);

                queryClient.setQueryData(eventMemberKeys.list(activeEventId), normalizeList(members).items);
                queryClient.setQueryData(rsvpKeys.list(activeEventId), normalizeList(rsvps).items);
                queryClient.setQueryData(eventInvitationKeys.list(activeEventId), normalizeList(invitations).items);
                queryClient.setQueryData(qrLinkKeys.list(activeEventId), normalizeList(qrLinks).items);
                queryClient.setQueryData(qrLinkKeys.stats(activeEventId), normalizeList(qrLinkStats).items);
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
