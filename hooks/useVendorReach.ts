'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorReachDto } from '@/lib/api/types';

// Not under vendorKeys.me: a vendor patch invalidates `me` and must not refetch the reach.
export const vendorReachKeys = {
    me: (eventId: string) => ['events', eventId, 'vendors', 'reach'] as const,
};

// The caller's reach in the event. `enabled` once vendors/me says they are a vendor; read once per visit, no polling.
export function useVendorReach(eventId: string, enabled: boolean) {
    return useQuery({
        queryKey: vendorReachKeys.me(eventId),
        queryFn: () => api.get<VendorReachDto>(endpoints.events.vendorReach(eventId)),
        enabled,
    });
}
