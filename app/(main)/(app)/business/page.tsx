import { dehydrate } from '@tanstack/react-query';

import { BusinessScreen } from '@/components/business/BusinessScreen';
import { BUSINESS_EVENTS_PAGE_SIZE } from '@/hooks/useBusinessEvents';
import { businessKeys } from '@/hooks/useBusinessOverview';
import { partnerPortalKeys } from '@/hooks/usePartnerPortal';
import { vendorProfileKeys } from '@/hooks/useVendorProfile';
import { vendorServiceKeys } from '@/hooks/useVendorServices';
import { endpoints } from '@/lib/api/endpoints';
import type { Page as ApiPage } from '@/lib/api/pagination';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { BusinessEventDto, BusinessOverviewDto, PartnerPortalResponseDto, VendorProfileDto, VendorServiceItemDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { PageHydrationBoundary } from '@/providers/PageHydrationBoundary';

// Prefetches the overview, then the first events page, the profile and, for partners, their partner data
// (and a partner photographer's print sizes), the same gates as useBusinessPage.
// A 403 (not a vendor) seeds nothing; the client asks again and shows why.
export default async function BusinessPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const overview = await serverGet<BusinessOverviewDto>(endpoints.me.business, accessToken);
            queryClient.setQueryData(businessKeys.overview, overview);
            const withServices = overview.partner && overview.vendorType === 'PHOTOGRAPHER';
            // Each read is best-effort on its own: a failed one must not drop the rest.
            const [events, profile, portal, services] = await Promise.all([
                serverGet<ApiPage<BusinessEventDto>>(endpoints.me.businessEvents(0, BUSINESS_EVENTS_PAGE_SIZE), accessToken).catch(() => null),
                // null is a real answer (no details saved yet); undefined is a failed read.
                serverGetOrNull<VendorProfileDto>(endpoints.me.vendorProfile, accessToken).catch(() => undefined),
                overview.partner ? serverGet<PartnerPortalResponseDto>(endpoints.partners.me, accessToken).catch(() => null) : null,
                withServices ? serverGet<VendorServiceItemDto[]>(endpoints.me.vendorServices, accessToken).catch(() => null) : null,
            ]);
            if (events) queryClient.setQueryData(businessKeys.events, { pages: [events], pageParams: [0] });
            if (profile !== undefined) queryClient.setQueryData(vendorProfileKeys.mine, profile);
            if (portal) queryClient.setQueryData(partnerPortalKeys.me, portal);
            if (services) queryClient.setQueryData(vendorServiceKeys.mine, services);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <PageHydrationBoundary state={dehydrate(queryClient)}>
            <BusinessScreen />
        </PageHydrationBoundary>
    );
}
