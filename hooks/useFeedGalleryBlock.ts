'use client';

import { useMemo } from 'react';

import { useFeedGalleryUpload } from '@/hooks/useFeedGalleryUpload';
import { useEventMedia } from '@/hooks/useMedia';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useUploadAccept } from '@/hooks/useUploadAccept';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventDeleted, isEventWritable } from '@/lib/eventLifecycle';
import { feedMosaic } from '@/lib/feedModuleContent';
import { INCIDENT_MODE } from '@/lib/incident';
import { isGalleryOpenToGuests, isMemberArchiveEnabled } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';
import { useActiveMember, useIsHost } from '@/providers/EventProvider';

// The feed's Gallery block (KAN-299): the newest guest-album items for the mosaic, where its photos lead, and its upload.
// available: the event still has the gallery; without it the block draws its empty look with the button off.
export function useFeedGalleryBlock(event: EventDetailResponseDto, available: boolean) {
    const isHost = useIsHost();
    const member = useActiveMember();
    const name = useModuleCopy(event.eventType)('gallery').name;
    const media = useEventMedia(available ? event.id : null);
    const upload = useFeedGalleryUpload(event);
    const accept = useUploadAccept().media;

    const firstPage = media.data?.pages[0];
    const items = useMemo(() => media.data?.pages.flatMap((page) => page.content) ?? [], [media.data?.pages]);
    const { tiles, more } = useMemo(() => feedMosaic(items, firstPage?.page.totalElements ?? 0), [firstPage?.page.totalElements, items]);

    // Guests open the gallery page only where it is open to them; elsewhere the photos don't lead anywhere.
    const photosHref = available && (isHost || isGalleryOpenToGuests(event)) ? routes.events.tools.gallery(event.id) : null;
    const canUpload = !INCIDENT_MODE && available && Boolean(member) && isEventWritable(event.status) && !isEventDeleted(event);

    return {
        name,
        tiles,
        more,
        loading: available && media.isLoading,
        photosHref,
        upload: canUpload ? { ...upload, accept } : null,
        // Uploaders are told everything here becomes downloadable by every member (gallery spec §7).
        archiveNote: canUpload && isMemberArchiveEnabled(event.modules),
        available,
    };
}
