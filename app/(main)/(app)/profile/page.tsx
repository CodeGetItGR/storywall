import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { ProfileContent } from '@/components/profile/ProfileContent';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverGetOrNull, serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, BusinessProfileResponseDto, NewsletterStatusResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { businessProfileKeys } from '@/lib/businessProfile';
import { newsletterKeys } from '@/lib/newsletter';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the newsletter status and business profile so those sections
// render without a loading state. Guests get a 403 here and fall through silently,
// matching the client, which never asks for them.
export default async function ProfilePage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
            queryClient.setQueryData(appConfigKeys.all, config);
            if (config.newsletter?.enabled) {
                const status = await serverGet<NewsletterStatusResponseDto>(endpoints.me.newsletter, accessToken);
                queryClient.setQueryData(newsletterKeys.status, status);
            }
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
        try {
            // A 404 (no profile yet) seeds null, so the section renders its empty state at once.
            const businessProfile = await serverGetOrNull<BusinessProfileResponseDto>(endpoints.me.businessProfile, accessToken);
            queryClient.setQueryData(businessProfileKeys.mine, businessProfile);
        } catch {
            // Best-effort, as above.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ProfileContent />
        </HydrationBoundary>
    );
}
