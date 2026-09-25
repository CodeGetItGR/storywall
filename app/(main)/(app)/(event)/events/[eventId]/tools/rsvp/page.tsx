import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { rsvpKeys } from '@/hooks/useRsvps';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, EventMemberResponseDto, RsvpReportDto, RsvpResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { resolveRsvpSubTab } from '@/lib/rsvpReport';

import RsvpPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }>; searchParams: Promise<{ section?: string }> };

// RsvpScreen is host-only (see EventRouteGate requireHost in PageClient) and
// needs both members and rsvps to build the roster — prefetched together so
// neither shows a loading state for the host who lands here. Skipped when the
// event's plan doesn't include RSVP, since RsvpScreen then renders no roster.
// The RSVP stats sub-tab's STATISTICS report is prefetched when that sub-tab opens.
export default async function Page({ params, searchParams }: PageProps) {
    const { eventId } = await params;
    const { section } = await searchParams;
    // Mirrors useRsvpSubTab: stats unless the URL asks for list or reports.
    const opensStats = resolveRsvpSubTab(section) === 'stats';
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        const { accessToken } = context;

        try {
            const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
            if (!isModuleAvailable(event.modules, 'rsvp')) throw new Error('rsvp unavailable');

            const [members, rsvps, rsvpReport] = await Promise.all([
                serverGet<EventMemberResponseDto[]>(endpoints.events.members(eventId), accessToken),
                serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(eventId), accessToken),
                // A failed report fetch alone must not discard the members/rsvps prefetches
                // above in the same Promise.all — serverGet throws on !res.ok.
                opensStats ? serverGet<RsvpReportDto>(endpoints.events.rsvpReport(eventId, 'STATISTICS'), accessToken).catch(() => null) : null,
            ]);
            queryClient.setQueryData(eventMemberKeys.list(eventId), normalizeList(members).items);
            queryClient.setQueryData(rsvpKeys.list(eventId), normalizeList(rsvps).items);
            if (rsvpReport) queryClient.setQueryData(rsvpKeys.report(eventId, 'STATISTICS', await getServerLocale()), rsvpReport);
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
