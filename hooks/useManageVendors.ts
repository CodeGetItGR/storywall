'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventVendors, usePatchVendor, useRemoveVendor } from '@/hooks/useVendors';

// Manage → Vendors: the joined vendors, the open vendor's sheet and its remove confirmation. The links live in useVendorInvite.
export function useManageVendors(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const vendorsQuery = useEventVendors(eventId);
    const patchVendor = usePatchVendor(eventId);
    const removeVendor = useRemoveVendor(eventId);
    const [openVendorId, setOpenVendorId] = useState<string | null>(null);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
    const selectedVendor = vendors.find((vendor) => vendor.id === openVendorId) ?? null;

    const openVendor = useCallback((vendorId: string) => {
        setError(null);
        setOpenVendorId(vendorId);
    }, []);
    const closeVendor = useCallback(() => {
        setOpenVendorId(null);
        setRemoveOpen(false);
    }, []);

    const toggleHidden = useCallback(async () => {
        if (!selectedVendor) return;
        setError(null);
        try {
            await patchVendor.mutateAsync({ vendorId: selectedVendor.id, patch: { hiddenByHost: !selectedVendor.hiddenByHost } });
        } catch (patchError) {
            setError(toErrorMessage(patchError));
        }
    }, [patchVendor, selectedVendor, toErrorMessage]);

    const requestRemove = useCallback(() => setRemoveOpen(true), []);
    const cancelRemove = useCallback(() => setRemoveOpen(false), []);
    const confirmRemove = useCallback(async () => {
        if (!selectedVendor) return;
        setError(null);
        try {
            await removeVendor.mutateAsync(selectedVendor.id);
            setOpenVendorId(null);
        } catch (removeError) {
            setError(toErrorMessage(removeError));
        } finally {
            setRemoveOpen(false);
        }
    }, [removeVendor, selectedVendor, toErrorMessage]);

    return {
        vendors,
        isLoading: vendorsQuery.isLoading,
        selectedVendor,
        removeOpen,
        error,
        isPatching: patchVendor.isPending,
        isRemoving: removeVendor.isPending,
        openVendor,
        closeVendor,
        toggleHidden,
        requestRemove,
        cancelRemove,
        confirmRemove,
    };
}
