import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { mediaKeys, mediaListPath } from '@/hooks/useMedia';
import { vendorProfileKeys } from '@/hooks/useVendorProfile';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import type { Page as ApiPage } from '@/lib/api/pagination';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { MediaResponseDto, VendorMeDto, VendorProfileDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { makeQueryClient } from '@/lib/queryClient';
import { capabilitiesOfType } from '@/lib/vendors';

import VendorMePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the caller's vendor role, their profile and, for Pro album types, the Pro first page.
// The role and profile are not module-gated (the page works with the vendors module off), like their hooks.
// Hosts are never vendors, so they get nothing.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context && !context.isHost) {
        try {
            const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
            queryClient.setQueryData(vendorKeys.me(eventId), me);
            if (me) {
                const modules = readableModuleKeys(event);
                // The same gating as the page's Pro section: the type has the album and both modules are readable.
                const withPro = capabilitiesOfType(me.vendorType).includes('PRO_ALBUM') && modules.has('vendors') && modules.has('gallery');
                const [profile, proFirstPage] = await Promise.all([
                    serverGetOrNull<VendorProfileDto>(endpoints.me.vendorProfile, context.accessToken),
                    withPro ? serverGet<ApiPage<MediaResponseDto>>(mediaListPath(eventId, 'PRO', 0), context.accessToken) : Promise.resolve(null),
                ]);
                queryClient.setQueryData(vendorProfileKeys.mine, profile);
                if (proFirstPage) queryClient.setQueryData(mediaKeys.proList(eventId), { pages: [proFirstPage], pageParams: [0] });
            }
        } catch {
            // Best-effort — the hooks fetch normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <VendorMePage />
        </HydrationBoundary>
    );
}
