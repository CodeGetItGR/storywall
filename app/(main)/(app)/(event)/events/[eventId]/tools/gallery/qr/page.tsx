import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { qrLinkKeys } from '@/hooks/useQrLinks';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';
import { serverGet } from '@/lib/api/serverFetch';
import type { QrLinkResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import GalleryQrPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

async function prefetchLinks(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const qrLinks = await serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
    } catch {
        // Best-effort — useEventQrLinks fetches normally on the client if this fails.
    }
}

// Prefetches the event's QR links and card designs (host-only) so GalleryQrScreen finds its gallery
// upload code, and where Print goes, already cached instead of showing its loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        await Promise.all([
            prefetchLinks(queryClient, eventId, context.accessToken),
            prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
        ]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <GalleryQrPage />
        </HydrationBoundary>
    );
}
