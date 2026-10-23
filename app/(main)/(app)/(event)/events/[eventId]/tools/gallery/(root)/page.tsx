import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { mediaKeys, mediaListPath } from '@/hooks/useMedia';
import type { Page } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { MediaResponseDto } from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { isGalleryOpenToGuests } from '@/lib/qrLinks';
import { makeQueryClient } from '@/lib/queryClient';

import GalleryPage from '../PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the gallery's first page of media for the event named in the
// URL (and the Pro album's first page when the vendors module is on) so
// GalleryScreen finds it already cached instead of showing its loading
// state. Gallery is host-only unless members get the archive (see
// isGalleryOpenToGuests in PageClient), so this mirrors that gating rather
// than wasting a fetch for guests who'll be redirected client-side.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    if (context && (context.isHost || isGalleryOpenToGuests(event)) && readableModuleKeys(event).has('gallery')) {
        try {
            const withPro = readableModuleKeys(event).has('vendors');
            const [firstPage, proFirstPage] = await Promise.all([
                serverGet<Page<MediaResponseDto>>(mediaListPath(eventId, 'GUEST', 0), context.accessToken),
                // A failed Pro page must not drop the guest page: the client fetches the Pro album itself.
                withPro ? serverGet<Page<MediaResponseDto>>(mediaListPath(eventId, 'PRO', 0), context.accessToken).catch(() => null) : null,
            ]);
            queryClient.setQueryData(mediaKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
            if (proFirstPage) queryClient.setQueryData(mediaKeys.proList(eventId), { pages: [proFirstPage], pageParams: [0] });
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
