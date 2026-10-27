import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { VendorLinkDto, VendorRowDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { isEventDeleted, readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import ManageVendorsPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the vendor links and the joined vendors (host only, vendors module readable),
// gated like useVendorLinks / useEventVendors, so ManageVendorsScreen finds them cached.
// A deleted event's host is redirected away from this route, so nothing is fetched for it.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context?.isHost && event && !isEventDeleted(event) && readableModuleKeys(event).has('vendors')) {
        try {
            const [links, vendors] = await Promise.all([
                serverGet<VendorLinkDto[]>(endpoints.events.vendorLinks(eventId), context.accessToken),
                serverGet<VendorRowDto[]>(endpoints.events.vendors(eventId), context.accessToken),
            ]);
            queryClient.setQueryData(vendorKeys.links(eventId), links);
            queryClient.setQueryData(vendorKeys.list(eventId), vendors);
        } catch {
            // Best-effort — useVendorLinks/useEventVendors fetch normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ManageVendorsPage />
        </HydrationBoundary>
    );
}
