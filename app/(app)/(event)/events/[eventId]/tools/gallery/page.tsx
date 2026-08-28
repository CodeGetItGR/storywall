import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { headers } from 'next/headers';

import { MEDIA_PAGE_SIZE, mediaKeys } from '@/hooks/useMedia';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { MediaResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { makeQueryClient } from '@/lib/queryClient';

import GalleryPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches the gallery's first page of media for the event named in the
// URL so GalleryScreen finds it already cached instead of showing its
// loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const firstPage = await serverGet<Page<MediaResponseDto>>(
                `${endpoints.events.media(eventId)}?page=0&size=${MEDIA_PAGE_SIZE}`,
                accessToken
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
