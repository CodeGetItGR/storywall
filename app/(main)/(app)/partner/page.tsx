import { dehydrate } from '@tanstack/react-query';

import { PartnerPortalBoundary } from '@/components/partners/PartnerPortalBoundary';
import { partnerPortalKeys } from '@/hooks/usePartnerPortal';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { PartnerPortalResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { PageHydrationBoundary } from '@/providers/PageHydrationBoundary';

// A 403 (not verified, not a partner) seeds nothing; the client asks again and shows why.
export default async function PartnerPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            queryClient.setQueryData(partnerPortalKeys.me, await serverGet<PartnerPortalResponseDto>(endpoints.partners.me, accessToken));
        } catch {
            // Best-effort — the client hook fetches normally if this fails.
        }
    }

    return (
        <PageHydrationBoundary state={dehydrate(queryClient)}>
            <PartnerPortalBoundary />
        </PageHydrationBoundary>
    );
}
