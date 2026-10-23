import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { VendorRowDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';

import VendorListPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the vendor list for any member while the vendors module is readable,
// gated like useEventVendors, so VendorListScreen finds it cached.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context && readableModuleKeys(event).has('vendors')) {
        try {
            const vendors = await serverGet<VendorRowDto[]>(endpoints.events.vendors(eventId), context.accessToken);
            queryClient.setQueryData(vendorKeys.list(eventId), vendors);
        } catch {
            // Best-effort — useEventVendors fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <VendorListPage />
        </HydrationBoundary>
    );
}
