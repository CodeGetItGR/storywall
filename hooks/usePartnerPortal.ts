import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PartnerPortalResponseDto } from '@/lib/api/types';

export const partnerPortalKeys = {
    me: ['partners', 'me', 'portal'] as const,
};

// The signed-in partner's page. A 403 (not verified, not linked) is an answer, not a blip, so it is not retried.
export function usePartnerPortal(enabled = true) {
    return useQuery({
        queryKey: partnerPortalKeys.me,
        queryFn: () => api.get<PartnerPortalResponseDto>(endpoints.partners.me),
        enabled,
        retry: false,
    });
}
