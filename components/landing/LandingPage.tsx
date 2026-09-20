import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { LandingContent } from '@/components/landing/LandingContent';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { makeQueryClient } from '@/lib/queryClient';

export async function LandingPage() {
    const queryClient = makeQueryClient();

    try {
        const config = await serverPublicGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort — useAppConfig() fetches normally on the client if this fails.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <LandingContent />
        </HydrationBoundary>
    );
}
