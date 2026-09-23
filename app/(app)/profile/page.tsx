import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';

import { ProfileContent } from '@/components/profile/ProfileContent';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, NewsletterStatusResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { newsletterKeys } from '@/lib/newsletter';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the newsletter status so the profile's newsletter section renders
// without a loading state. Guests get a 403 here and fall through silently,
// matching the client, which never asks for them.
export default async function ProfilePage() {
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
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
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ProfileContent />
        </HydrationBoundary>
    );
}
