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

// The partner data (and a partner photographer's print sizes) for an overview that says so, the same gates as
// useBusinessPage. Each read is best-effort on its own.
async function partnerReads(overview: BusinessOverviewDto, accessToken: string) {
    const withServices = overview.partner && overview.vendorType === 'PHOTOGRAPHER';
    const [portal, services] = await Promise.all([
        overview.partner ? serverGet<PartnerPortalResponseDto>(endpoints.partners.me, accessToken).catch(() => null) : null,
        withServices ? serverGet<VendorServiceItemDto[]>(endpoints.me.vendorServices, accessToken).catch(() => null) : null,
    ]);
    return { portal, services };
}

// Prefetches the overview, the first events page and the profile at once, and the partner reads as soon as the
// overview says the account is a partner. Every read is best-effort: a failed one seeds nothing and the client asks
// again. A 403 (not a vendor) seeds nothing; the client asks again and shows why.
export default async function BusinessPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const overviewRead = serverGet<BusinessOverviewDto>(endpoints.me.business, accessToken).catch(() => null);
            const [overview, events, profile, partner] = await Promise.all([
                overviewRead,
                serverGet<ApiPage<BusinessEventDto>>(endpoints.me.businessEvents(0, BUSINESS_EVENTS_PAGE_SIZE), accessToken).catch(() => null),
                // null is a real answer (no details saved yet); undefined is a failed read.
                serverGetOrNull<VendorProfileDto>(endpoints.me.vendorProfile, accessToken).catch(() => undefined),
                overviewRead.then((read) => (read ? partnerReads(read, accessToken) : null)),
            ]);
            if (overview) {
                queryClient.setQueryData(businessKeys.overview, overview);
                // The client reads events only once it has the overview.
                if (events) queryClient.setQueryData(businessKeys.events, { pages: [events], pageParams: [0] });
            }
            if (profile !== undefined) queryClient.setQueryData(vendorProfileKeys.mine, profile);
            if (partner?.portal) queryClient.setQueryData(partnerPortalKeys.me, partner.portal);
            if (partner?.services) queryClient.setQueryData(vendorServiceKeys.mine, partner.services);
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
