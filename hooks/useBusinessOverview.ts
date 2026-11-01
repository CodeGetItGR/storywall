import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BusinessOverviewDto } from '@/lib/api/types';

export const businessKeys = {
    all: ['business'] as const,
    overview: ['business', 'overview'] as const,
    events: ['business', 'events'] as const,
};

// The business page's totals. A 403 (not a vendor) is an answer, not a blip, so it is not retried.
export function useBusinessOverview(enabled = true) {
    return useQuery({
        queryKey: businessKeys.overview,
        queryFn: () => api.get<BusinessOverviewDto>(endpoints.me.business),
        enabled,
        retry: false,
    });
}
