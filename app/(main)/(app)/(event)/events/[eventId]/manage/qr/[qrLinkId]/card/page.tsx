import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { qrLinkKeys } from '@/hooks/useQrLinks';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { QrLinkResponseDto, VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { hasVendorCapability } from '@/lib/vendors';

import QrCardPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string; qrLinkId: string }> };

async function prefetchLinks(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const qrLinks = await serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
    } catch {
        // Best-effort — useEventQrLinks fetches normally on the client if this fails.
    }
}

// Seeds the vendor role (EventRouteGate reads it) and answers whether the planner has the QR tool.
async function prefetchPlannerAccess(queryClient: QueryClient, eventId: string, accessToken: string): Promise<boolean> {
    try {
        const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), accessToken);
        queryClient.setQueryData(vendorKeys.me(eventId), me);
        return hasVendorCapability(me, 'QR_READ');
    } catch {
        return false;
    }
}

// Prefetches the event's QR links and card designs, for the host or a planner with the QR tool, so
// QrCardScreen draws the card without its loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context) {
        const allowed = context.isHost || (await prefetchPlannerAccess(queryClient, eventId, context.accessToken));
        if (allowed) {
            await Promise.all([
                prefetchLinks(queryClient, eventId, context.accessToken),
                prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
            ]);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <QrCardPage />
        </HydrationBoundary>
    );
}
