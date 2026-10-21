import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { rsvpKeys } from '@/hooks/useRsvps';
import { vendorKeys } from '@/hooks/useVendors';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { RsvpReportDto, VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { isEventDeleted, readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { isRsvpReportType } from '@/lib/rsvpReport';
import { hasVendorCapability } from '@/lib/vendors';

import RsvpReportPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string; reportType: string }> };

// For hosts, and for planners with the RSVP_REPORT tool open. Prefetches the report so the page
// opens drawn, gated like useRsvpReport (rsvp readable). A deleted event's report prefetch is
// skipped: DeletedEventRouteGuard redirects this route away for a deleted event's host (it isn't
// in isDeletedEventRouteAllowed), so the prefetch would be wasted, mirroring
// manage/(root)/page.tsx's own isEventDeleted check.
export default async function Page({ params }: PageProps) {
    const { eventId, reportType } = await params;
    if (!isRsvpReportType(reportType)) notFound();

    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context && event && !isEventDeleted(event) && readableModuleKeys(event).has('rsvp')) {
        try {
            let allowed = context.isHost;
            if (!allowed) {
                const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
                queryClient.setQueryData(vendorKeys.me(eventId), me);
                allowed = hasVendorCapability(me, 'RSVP_REPORT');
            }
            if (allowed) {
                const report = await serverGet<RsvpReportDto>(endpoints.events.rsvpReport(eventId, reportType), context.accessToken);
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
