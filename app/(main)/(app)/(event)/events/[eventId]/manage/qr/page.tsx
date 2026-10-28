import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { qrLinkKeys } from '@/hooks/useQrLinks';
import { usageKeys } from '@/hooks/useUsage';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { EventUsageResponseDto, QrLinkResponseDto, QrLinkStatsDto, VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { hasVendorCapability } from '@/lib/vendors';

import InvitationsQrPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

async function prefetchHostData(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const [qrLinks, qrLinkStats, usage] = await Promise.all([
            serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken),
            serverGet<QrLinkStatsDto[]>(endpoints.events.qrLinkStats(eventId), accessToken),
            serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), accessToken),
        ]);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
        queryClient.setQueryData(qrLinkKeys.stats(eventId), normalizeList(qrLinkStats).items);
        queryClient.setQueryData(usageKeys.event(eventId), usage);
    } catch {
        // Best-effort — useEventQrLinks/useEventQrLinkStats/useEventUsage fetch normally on the client if this fails.
    }
}

async function prefetchPlannerLinks(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const qrLinks = await serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
    } catch {
        // Best-effort — useEventQrLinks fetches normally on the client if this fails.
    }
}

// A planner with the QR_READ tool open gets the links and the card designs: no stats, no usage.
async function prefetchPlannerData(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), accessToken);
        queryClient.setQueryData(vendorKeys.me(eventId), me);
        if (!hasVendorCapability(me, 'QR_READ')) return;
    } catch {
        // Best-effort — the hooks fetch normally on the client if this fails.
        return;
    }
    await Promise.all([prefetchPlannerLinks(queryClient, eventId, accessToken), prefetchQrCardTemplates(queryClient, eventId, accessToken)]);
}

// Prefetches the event's QR links, their stats, and usage (host-only) so
// InvitationsQrScreen finds them already cached instead of showing its
// loading state. A planner gets the vendor role and the links. Both get the card designs, so Print knows where to go.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context) {
        if (context.isHost) {
            await Promise.all([
                prefetchHostData(queryClient, eventId, context.accessToken),
                prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
            ]);
        } else {
            await prefetchPlannerData(queryClient, eventId, context.accessToken);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <InvitationsQrPage />
        </HydrationBoundary>
    );
}
