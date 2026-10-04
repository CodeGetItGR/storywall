'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { meQueryKey } from '@/hooks/useMe';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { TermsAcceptanceRequestDto } from '@/lib/api/types';

// POST /api/me/terms-acceptance → 204, with the 18+ confirmation. Refetches
// /api/me either way: on success the gate closes, on 3043 the new version arrives with it.
export function useAcceptTerms() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (version: string) =>
            api.post<void>(endpoints.me.termsAcceptance, { version, adultConfirmed: true } satisfies TermsAcceptanceRequestDto),
        onSettled: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
    });
}
