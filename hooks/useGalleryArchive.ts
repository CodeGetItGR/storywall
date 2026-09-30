'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaArchiveManifestDto, MediaArchiveVariant, MediaSummaryDto } from '@/lib/api/types';

export const galleryArchiveKeys = {
    manifest: (eventId: string, variant: MediaArchiveVariant) => ['events', eventId, 'media', 'archive', variant] as const,
    summary: (eventId: string) => ['events', eventId, 'media', 'summary'] as const,
};

// The gallery's photo and video counts for the host's side panel, which shows on every page. The
// manifest has the same counts but reads every row of the gallery to plan the download.
export function useGallerySummary(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();
    const galleryReadable = useModuleReadable(eventId, 'gallery');

    return useQuery({
        queryKey: galleryArchiveKeys.summary(eventId ?? ''),
        queryFn: () => api.get<MediaSummaryDto>(endpoints.events.mediaSummary(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated && galleryReadable,
    });
}

export function useGalleryArchiveManifest(eventId: string | null, variant: MediaArchiveVariant, enabled = true) {
    const { isAuthenticated } = useAuth();
    const galleryReadable = useModuleReadable(eventId, 'gallery');

    return useQuery({
        queryKey: galleryArchiveKeys.manifest(eventId ?? '', variant),
        queryFn: () => api.get<MediaArchiveManifestDto>(endpoints.events.mediaArchiveManifest(eventId!, variant)),
        enabled: Boolean(eventId) && enabled && isAuthenticated && galleryReadable,
        retry: false,
    });
}
