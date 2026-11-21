'use client';

import { useCallback, useState } from 'react';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

export type DangerZoneWishbookLink = { href: string; label: string };

// What the Danger zone offers to keep before deleting: the gallery's download
// window and a link to the wishbook, each only when the plan has it.
export function useDangerZoneDownloads(event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'modules'>) {
    const moduleCopy = useModuleCopy(event.eventType);
    const [archiveOpen, setArchiveOpen] = useState(false);

    const showGalleryDownload = isModuleAvailable(event.modules, 'gallery');
    const wishbook: DangerZoneWishbookLink | null = isModuleAvailable(event.modules, 'wishbook')
        ? { href: routes.events.tools.wishbook(event.id), label: moduleCopy('wishbook').name }
        : null;

    const openArchive = useCallback(() => setArchiveOpen(true), []);
    const closeArchive = useCallback(() => setArchiveOpen(false), []);

    return { showGalleryDownload, wishbook, archiveOpen, openArchive, closeArchive };
}
