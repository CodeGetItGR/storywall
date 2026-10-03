'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';

import { usePresignedUrlRefreshMs } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { UserResponseDto } from '@/lib/api/types';

export const meQueryKey = ['me'] as const;

// Session/login/oauth don't carry fields that only live on UserResponseDto
// (e.g. emailVerified) — this fetches /api/me and merges the result into the
// shared auth state via updateProfile, so every consumer of useAuth().user
// sees it, not just whichever screen happened to trigger the fetch.
export function useMe(): UseQueryResult<UserResponseDto> {
    const { user, updateProfile } = useAuth();
    const userId = user?.userId ?? null;
    const query = useQuery({
        queryKey: meQueryKey,
        queryFn: () => api.get<UserResponseDto>(endpoints.me.profile),
        enabled: Boolean(user),
        // profilePictureUrl is presigned.
        staleTime: usePresignedUrlRefreshMs(),
    });

    // Merged only once someone is signed in, and again when that changes: on a
    // full page load the server seeds this query (see AppProviders) before the
    // session it came with is adopted, and adopting it resets emailVerified.
    useEffect(() => {
        if (query.data && userId) updateProfile(query.data);
    }, [query.data, updateProfile, userId]);

    return query;
}
