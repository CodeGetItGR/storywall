'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MemberArchiveResponseDto } from '@/lib/api/types';

export const memberArchiveKeys = {
    detail: (eventId: string) => ['events', eventId, 'media', 'member-archive'] as const,
};

// The members' prebuilt gallery archive. Its part links are presigned and expire, so they are never
// trusted from cache: staleTime 0, and the modal refetches before every download.
export function useMemberArchive(eventId: string | null, enabled = true) {
    const { isAuthenticated } = useAuth();
    const galleryReadable = useModuleReadable(eventId, 'gallery');

    return useQuery({
        queryKey: memberArchiveKeys.detail(eventId ?? ''),
        queryFn: () => api.get<MemberArchiveResponseDto>(endpoints.events.memberArchive(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated && galleryReadable,
        staleTime: 0,
        retry: false,
    });
}
