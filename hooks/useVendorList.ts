import { useCallback, useMemo } from 'react';

import { useEventVendors, useMyVendorRole, useRecordVendorClick } from '@/hooks/useVendors';
import type { VendorRowDto } from '@/lib/api/types';
import { listedVendors, sortByVendorType } from '@/lib/vendors';

// The vendor list guests see: listed rows in type order, and the click count for outgoing links.
export function useVendorList(eventId: string) {
    const { data, isLoading } = useEventVendors(eventId);
    const myVendorId = useMyVendorRole(eventId).data?.vendorId ?? null;
    const recordClick = useRecordVendorClick(eventId);
    const vendors = useMemo(() => sortByVendorType(listedVendors(data ?? [])), [data]);

    // A vendor opening their own link is not a visit.
    const openVendor = useCallback(
        (vendor: VendorRowDto) => {
            if (vendor.id !== myVendorId) recordClick(vendor.id);
        },
        [myVendorId, recordClick],
    );

    return { vendors, isLoading, openVendor };
}
