'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventVendors, usePatchVendor, useRemoveVendor } from '@/hooks/useVendors';

// Manage → Vendors: the joined vendors, their row actions, the open vendor's sheet and the remove
// confirmation. Hide/show and remove work from a row or the sheet. The links live in useVendorInvite.
export function useManageVendors(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const vendorsQuery = useEventVendors(eventId);
    const patchVendor = usePatchVendor(eventId);
    const removeVendor = useRemoveVendor(eventId);
    const [openVendorId, setOpenVendorId] = useState<string | null>(null);
    const [removeVendorId, setRemoveVendorId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
    const selectedVendor = vendors.find((vendor) => vendor.id === openVendorId) ?? null;
    const removeTarget = vendors.find((vendor) => vendor.id === removeVendorId) ?? null;
    const patchingVendorId = patchVendor.isPending ? (patchVendor.variables?.vendorId ?? null) : null;

    const openVendor = useCallback((vendorId: string) => {
        setError(null);
        setOpenVendorId(vendorId);
    }, []);
    const closeVendor = useCallback(() => {
        setOpenVendorId(null);
        setRemoveVendorId(null);
        setError(null);
    }, []);

    const toggleHidden = useCallback(
        async (vendorId: string) => {
            const vendor = vendors.find((candidate) => candidate.id === vendorId);
            if (!vendor) return;
            setError(null);
            try {
                await patchVendor.mutateAsync({ vendorId, patch: { hiddenByHost: !vendor.hiddenByHost } });
            } catch (patchError) {
                setError(toErrorMessage(patchError));
            }
        },
        [patchVendor, vendors, toErrorMessage],
    );

    const requestRemove = useCallback((vendorId: string) => {
        setError(null);
        setRemoveVendorId(vendorId);
    }, []);
    const cancelRemove = useCallback(() => setRemoveVendorId(null), []);
    const confirmRemove = useCallback(async () => {
        if (!removeTarget) return;
        setError(null);
        try {
            await removeVendor.mutateAsync(removeTarget.id);
            setOpenVendorId((current) => (current === removeTarget.id ? null : current));
        } catch (removeError) {
            setError(toErrorMessage(removeError));
        } finally {
            setRemoveVendorId(null);
        }
    }, [removeVendor, removeTarget, toErrorMessage]);

    return {
        vendors,
        isLoading: vendorsQuery.isLoading,
        selectedVendor,
        removeTarget,
        // One error, shown where the host acted: in the sheet while it is open, else above the list.
        sheetError: selectedVendor ? error : null,
        listError: selectedVendor ? null : error,
        patchingVendorId,
        isSheetPatching: selectedVendor !== null && patchingVendorId === selectedVendor.id,
        isRemoving: removeVendor.isPending,
        openVendor,
        closeVendor,
        toggleHidden,
        requestRemove,
        cancelRemove,
        confirmRemove,
    };
}
