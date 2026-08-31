import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PartnerPortalResponseDto } from '@/lib/api/types';

export const partnerPortalKeys = {
    portal: (token: string) => ['partners', token, 'portal'] as const,
};

export function usePartnerPortal(token: string | null) {
    return useQuery({
        queryKey: partnerPortalKeys.portal(token ?? ''),
        queryFn: () => api.publicGet<PartnerPortalResponseDto>(endpoints.partners.portal(token!)),
        enabled: Boolean(token),
        retry: false,
    });
}
