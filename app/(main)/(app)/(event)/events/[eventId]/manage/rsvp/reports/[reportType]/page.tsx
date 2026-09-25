import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { rsvpKeys } from '@/hooks/useRsvps';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, RsvpReportDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { isRsvpReportType } from '@/lib/rsvpReport';

import RsvpReportPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string; reportType: string }> };

// Host-only, like the report endpoint. Prefetches the report so the page opens
// drawn, gated like useRsvpReport (host, rsvp readable). A deleted event has no
// writable RSVP module (and this route isn't in isDeletedEventRouteAllowed), so
// the report prefetch is skipped, mirroring manage/page.tsx's own isEventDeleted check.
export default async function Page({ params }: PageProps) {
    const { eventId, reportType } = await params;
    if (!isRsvpReportType(reportType)) notFound();

    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        const { accessToken } = context;

        try {
            const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
            if (isEventDeleted(event)) throw new Error('deleted');

            if (await serverModuleReadable(eventId, 'rsvp', accessToken)) {
                const report = await serverGet<RsvpReportDto>(endpoints.events.rsvpReport(eventId, reportType), accessToken);
                queryClient.setQueryData(rsvpKeys.report(eventId, reportType, await getServerLocale()), report);
            }
        } catch {
            // Best-effort — useRsvpReport fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <RsvpReportPage />
        </HydrationBoundary>
    );
}
