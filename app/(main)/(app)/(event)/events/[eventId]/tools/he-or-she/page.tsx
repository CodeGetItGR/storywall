import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { HE_OR_SHE_MODULE, heOrSheKeys } from '@/hooks/useHeOrShe';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { HeOrSheViewDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import HeOrShePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the Boy or Girl? view so the page renders at once. The host-only results load on the
// client: telling host from guest here would cost another call for a section below the fold.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            if (!(await serverModuleReadable(eventId, HE_OR_SHE_MODULE, accessToken))) throw new Error('he_or_she unavailable');
            const view = await serverGet<HeOrSheViewDto>(endpoints.events.heOrShe(eventId), accessToken);
            queryClient.setQueryData(heOrSheKeys.view(eventId), view);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <HeOrShePage />
        </HydrationBoundary>
    );
}
