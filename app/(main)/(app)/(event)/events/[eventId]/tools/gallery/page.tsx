import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { MEDIA_PAGE_SIZE, mediaKeys } from '@/hooks/useMedia';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { MediaResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import GalleryPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the gallery's first page of media for the event named in the
// URL so GalleryScreen finds it already cached instead of showing its
// loading state. Gallery is host-only (see EventRouteGate requireHost in
// PageClient), so this mirrors that gating rather than wasting a fetch for
// members who'll be redirected client-side.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        try {
            if (!(await serverModuleReadable(eventId, 'gallery', context.accessToken))) throw new Error('gallery unavailable');
            const firstPage = await serverGet<Page<MediaResponseDto>>(
                `${endpoints.events.media(eventId)}?page=0&size=${MEDIA_PAGE_SIZE}`,
                context.accessToken,
            );
            queryClient.setQueryData(mediaKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
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
