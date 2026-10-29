'use client';

import { useMemo } from 'react';

import { useBecomePartner } from '@/hooks/useBecomePartner';
import { useVendorReach } from '@/hooks/useVendorReach';
import type { VendorMeDto } from '@/lib/api/types';
import { reachTiles } from '@/lib/vendorReach';

// The vendor page's Reach section: every vendor row has one, before and after access ends.
export function useReachSection(eventId: string, me: VendorMeDto | null) {
    const reach = useVendorReach(eventId, me !== null);
    const partnerSheet = useBecomePartner();
    const tiles = useMemo(() => (reach.data ? reachTiles(reach.data) : []), [reach.data]);

    return {
        visible: me !== null,
        tiles,
        partner: reach.data?.partner ?? false,
        showPartnerAction: me?.showPartnerPrompt ?? false,
        isLoading: reach.isLoading,
        loadFailed: reach.isError,
        partnerSheet,
    };
}
