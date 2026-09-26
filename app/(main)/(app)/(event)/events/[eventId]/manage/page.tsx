import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventInvitationKeys } from '@/hooks/useEventInvitations';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { rsvpKeys } from '@/hooks/useRsvps';
import { usageKeys } from '@/hooks/useUsage';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventInvitationResponseDto, EventMemberResponseDto, EventUsageResponseDto, RsvpReportDto, RsvpResponseDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { isEventDeleted, isModuleAvailable } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { resolveRsvpSubTab } from '@/lib/rsvpReport';

import ManagePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }>; searchParams: Promise<{ tab?: string; section?: string }> };

// ManageScreen fires four host-only calls in parallel on mount (members,
// rsvps, invitations, usage) — the biggest single client-side waterfall in
// the app. Mirrors ManageScreen's own gating (isHost, isDraft for everything
// but usage, and the plan including RSVP for rsvps) so a prefetch is never wasted on data the client
// wouldn't have requested anyway. QR links have their own dedicated page
// (manage/qr) with their own prefetch.
// The RSVP stats sub-tab's STATISTICS report is prefetched when that sub-tab opens.
export default async function Page({ params, searchParams }: PageProps) {
    const { eventId } = await params;
    const { tab, section } = await searchParams;
    // RsvpTab opens on its stats sub-tab, which reads the STATISTICS report (see useRsvpSubTab).
    const opensRsvpStats = tab === 'rsvp' && resolveRsvpSubTab(section) === 'stats';
    const queryClient = makeQueryClient();
    // The event doesn't depend on the memberships, so both load at once.
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    // A deleted event's manage page shows only the banner and billing;
    // ManageScreen passes null ids for everything else, so don't prefetch it.
    if (context?.isHost && event && !isEventDeleted(event)) {
        const { accessToken } = context;
        const isDraft = event.status === 'DRAFT';
        const rsvpAvailable = isModuleAvailable(event.modules, 'rsvp');

        try {
            // Usage and the guest lists load together, and each seeds on its own:
            // a failed guest list must not discard usage, or the reverse.
            const [usage, lists] = await Promise.all([
                serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), accessToken).catch(() => null),
                isDraft
                    ? null
                    : Promise.all([
                          serverGet<EventMemberResponseDto[]>(endpoints.events.members(eventId), accessToken),
                          rsvpAvailable ? serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(eventId), accessToken) : null,
                          serverGet<EventInvitationResponseDto[]>(endpoints.events.invitations(eventId), accessToken),
                          rsvpAvailable && opensRsvpStats
                              ? // A failed report fetch alone must not discard the members/rsvps/invitations
                                // prefetches above in the same Promise.all — serverGet throws on !res.ok.
                                serverGet<RsvpReportDto>(endpoints.events.rsvpReport(eventId, 'STATISTICS'), accessToken).catch(() => null)
                              : null,
                      ]).catch(() => null),
            ]);

            if (usage) queryClient.setQueryData(usageKeys.event(eventId), usage);
            if (lists) {
                const [members, rsvps, invitations, rsvpReport] = lists;
                queryClient.setQueryData(eventMemberKeys.list(eventId), normalizeList(members).items);
                if (rsvps) queryClient.setQueryData(rsvpKeys.list(eventId), normalizeList(rsvps).items);
                queryClient.setQueryData(eventInvitationKeys.list(eventId), normalizeList(invitations).items);
                if (rsvpReport) queryClient.setQueryData(rsvpKeys.report(eventId, 'STATISTICS', await getServerLocale()), rsvpReport);
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
