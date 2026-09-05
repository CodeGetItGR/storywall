'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaArchiveManifestDto, MediaArchiveVariant } from '@/lib/api/types';

export const galleryArchiveKeys = {
    manifest: (eventId: string, variant: MediaArchiveVariant) => ['events', eventId, 'media', 'archive', variant] as const,
};

export function useGalleryArchiveManifest(eventId: string | null, variant: MediaArchiveVariant, enabled = true) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: galleryArchiveKeys.manifest(eventId ?? '', variant),
        queryFn: () => api.get<MediaArchiveManifestDto>(endpoints.events.mediaArchiveManifest(eventId!, variant)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
        retry: false,
    });
}
