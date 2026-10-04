'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { LegalDocumentDto } from '@/lib/api/types';

export const termsVersionQueryKey = ['legal', 'terms'] as const;

// The Terms of Use version in force, which sign-up must send back. The locale
// doesn't matter for the version, so it always asks for en.
export function useTermsVersion() {
    return useQuery({
        queryKey: termsVersionQueryKey,
        queryFn: () => api.get<LegalDocumentDto>(endpoints.legal.document({ document: 'terms', locale: 'en' })),
        select: (dto) => dto.version,
        staleTime: 5 * 60 * 1000,
    });
}
