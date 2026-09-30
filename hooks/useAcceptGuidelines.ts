'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { meQueryKey } from '@/hooks/useMe';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuidelinesAcceptanceRequestDto } from '@/lib/api/types';

// POST /api/me/guidelines-acceptance → 204. Refetches /api/me either way: on
// success the gate closes, on 3037 the new version arrives with it.
export function useAcceptGuidelines() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (version: string) => api.post<void>(endpoints.me.guidelinesAcceptance, { version } satisfies GuidelinesAcceptanceRequestDto),
        onSettled: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
    });
}
