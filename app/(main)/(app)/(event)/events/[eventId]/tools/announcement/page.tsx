import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { serverGetOrNull } from '@/lib/api/serverFetch';
import type { VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import AnnouncementPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// The composer starts empty, so the only read is the planner's vendor role, which the route gate asks for.
// Hosts are never vendors, so they get nothing.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context && !context.isHost) {
        try {
            const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
            queryClient.setQueryData(vendorKeys.me(eventId), me);
        } catch {
            // Best-effort — useMyVendorRole fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AnnouncementPage />
        </HydrationBoundary>
    );
}
