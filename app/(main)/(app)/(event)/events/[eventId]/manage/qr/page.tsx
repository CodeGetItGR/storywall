import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { qrLinkKeys } from '@/hooks/useQrLinks';
import { usageKeys } from '@/hooks/useUsage';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventUsageResponseDto, QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import InvitationsQrPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the event's QR links, their stats, and usage (host-only) so
// InvitationsQrScreen finds them already cached instead of showing its
// loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        const { accessToken } = context;

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

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <InvitationsQrPage />
        </HydrationBoundary>
    );
}
