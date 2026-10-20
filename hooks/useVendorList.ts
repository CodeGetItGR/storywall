import { useCallback, useMemo } from 'react';

import { useEventVendors, useRecordVendorClick } from '@/hooks/useVendors';
import type { VendorRowDto } from '@/lib/api/types';
import { listedVendors, sortByVendorType } from '@/lib/vendors';

// The vendor list guests see: listed rows in type order, and the click count for outgoing links.
export function useVendorList(eventId: string) {
    const { data, isLoading } = useEventVendors(eventId);
    const recordClick = useRecordVendorClick(eventId);
    const vendors = useMemo(() => sortByVendorType(listedVendors(data ?? [])), [data]);

    // The backend does not count a vendor opening their own row, so every tap is reported.
    const openVendor = useCallback(
        (vendor: VendorRowDto) => {
            recordClick(vendor.id);
        },
        [recordClick],
    );

    return { vendors, isLoading, openVendor };
}
