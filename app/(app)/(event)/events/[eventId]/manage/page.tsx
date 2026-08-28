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

type PageProps = { params: Promise<{ eventId: string }> };

// ManageScreen fires six host-only calls in parallel on mount (members,
// rsvps, invitations, qr links, qr link stats, usage) — the biggest single
// client-side waterfall in the app. Mirrors ManageScreen's own gating
// (isHost, and isDraft for everything but usage) so a prefetch is never
// wasted on data the client wouldn't have requested anyway.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        const { accessToken } = context;

        try {
            const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
            const isDraft = event.status === 'DRAFT';

            const usage = await serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), accessToken);
            queryClient.setQueryData(usageKeys.event(eventId), usage);

            if (!isDraft) {
                const [members, rsvps, invitations, qrLinks, qrLinkStats] = await Promise.all([
                    serverGet<EventMemberResponseDto[]>(endpoints.events.members(eventId), accessToken),
                    serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(eventId), accessToken),
                    serverGet<EventInvitationResponseDto[]>(endpoints.events.invitations(eventId), accessToken),
                    serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken),
                    serverGet<QrLinkStatsDto[]>(endpoints.events.qrLinkStats(eventId), accessToken),
                ]);

                queryClient.setQueryData(eventMemberKeys.list(eventId), normalizeList(members).items);
                queryClient.setQueryData(rsvpKeys.list(eventId), normalizeList(rsvps).items);
                queryClient.setQueryData(eventInvitationKeys.list(eventId), normalizeList(invitations).items);
                queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
                queryClient.setQueryData(qrLinkKeys.stats(eventId), normalizeList(qrLinkStats).items);
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
