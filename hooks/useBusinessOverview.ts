import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BusinessOverviewDto } from '@/lib/api/types';

export const businessKeys = {
    overview: ['business', 'overview'] as const,
    events: ['business', 'events'] as const,
};

// The business page's totals. The app's default retry policy skips 4xx, so a 403 (not a vendor) is not retried.
export function useBusinessOverview(enabled = true) {
    return useQuery({
        queryKey: businessKeys.overview,
        queryFn: () => api.get<BusinessOverviewDto>(endpoints.me.business),
        enabled,
    });
}
