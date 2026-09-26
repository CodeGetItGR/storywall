'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';

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
    const query = useQuery({
        queryKey: meQueryKey,
        queryFn: () => api.get<UserResponseDto>(endpoints.me.profile),
        enabled: Boolean(user),
    });

    useEffect(() => {
        if (query.data) updateProfile(query.data);
    }, [query.data, updateProfile]);

    return query;
}
