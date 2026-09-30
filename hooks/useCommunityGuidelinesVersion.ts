'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CommunityGuidelinesDto } from '@/lib/api/types';

export const communityGuidelinesQueryKey = ['legal', 'community-guidelines'] as const;

// The version in force, which registration must send back. The locale doesn't
// matter for the version, so it always asks for en.
export function useCommunityGuidelinesVersion() {
    return useQuery({
        queryKey: communityGuidelinesQueryKey,
        queryFn: () => api.get<CommunityGuidelinesDto>(endpoints.legal.communityGuidelines({ locale: 'en' })),
        select: (dto) => dto.version,
        staleTime: 5 * 60 * 1000,
    });
}
