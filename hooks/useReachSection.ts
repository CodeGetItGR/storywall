'use client';

import { useMemo } from 'react';

import { useVendorReach } from '@/hooks/useVendorReach';
import type { VendorMeDto } from '@/lib/api/types';
import { reachSampleTiles, reachTiles } from '@/lib/vendorReach';
import { capabilitiesOfType } from '@/lib/vendors';

// The vendor page's Reach section: every vendor row has one, before and after access ends.
// A non-partner also gets the blurred sample of the partner numbers their type would see.
export function useReachSection(eventId: string, me: VendorMeDto | null) {
    const reach = useVendorReach(eventId, me !== null);
    const tiles = useMemo(() => (reach.data ? reachTiles(reach.data) : []), [reach.data]);
    const hasProAlbum = me ? capabilitiesOfType(me.vendorType).includes('PRO_ALBUM') : false;
    const sampleTiles = useMemo(() => reachSampleTiles(hasProAlbum), [hasProAlbum]);

    return {
        visible: me !== null,
        tiles,
        partner: reach.data?.partner ?? false,
        sampleTiles,
        isLoading: reach.isLoading,
        loadFailed: reach.isError,
    };
}
