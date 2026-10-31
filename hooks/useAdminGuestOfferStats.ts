'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { adminGuestOfferKeys } from '@/hooks/useAdminGuestOffer';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuestOfferStatsDto } from '@/lib/api/types';

// Days back, today included. 0 is all time.
export const GUEST_OFFER_STAT_RANGES = [7, 30, 90, 0] as const;
export type GuestOfferStatRange = (typeof GUEST_OFFER_STAT_RANGES)[number];

// How guests responded to the offer card, over the chosen range.
export function useAdminGuestOfferStats() {
    const [days, setDays] = useState<GuestOfferStatRange>(30);
    const query = useQuery({
        queryKey: adminGuestOfferKeys.stats(days),
        queryFn: () => api.get<GuestOfferStatsDto>(days === 0 ? endpoints.admin.guestOfferStats : `${endpoints.admin.guestOfferStats}?days=${days}`),
        placeholderData: keepPreviousData,
    });

    return {
        days,
        setDays,
        stats: query.data ?? null,
        isLoading: query.isLoading,
        loadFailed: query.isError,
    };
}
