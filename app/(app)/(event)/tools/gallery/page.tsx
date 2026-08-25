import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { MEDIA_PAGE_SIZE, mediaKeys } from '@/hooks/useMedia';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { MediaResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import GalleryPage from './PageClient';

// Prefetches the gallery's first page of media for the active event so
// GalleryScreen finds it already cached instead of showing its loading state.
export default async function Page() {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context?.activeEventId) {
        try {
            const firstPage = await serverGet<Page<MediaResponseDto>>(
                `${endpoints.events.media(context.activeEventId)}?page=0&size=${MEDIA_PAGE_SIZE}`,
                context.accessToken
            );
            queryClient.setQueryData(mediaKeys.list(context.activeEventId), { pages: [firstPage], pageParams: [0] });
        } catch {
            // Best-effort — useEventMedia fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <GalleryPage />
        </HydrationBoundary>
    );
}
