'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventVendors, usePatchVendor, useRemoveVendor, useResetVendorLink, useVendorLinks } from '@/hooks/useVendors';
import type { PartnerRole } from '@/lib/api/types';
import { sortByVendorType } from '@/lib/vendors';

// Manage → Vendors: the links, the joined vendors, the open sheet and the two confirmations.
export function useManageVendors(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const linksQuery = useVendorLinks(eventId, true);
    const vendorsQuery = useEventVendors(eventId);
    const resetLink = useResetVendorLink(eventId);
    const patchVendor = usePatchVendor(eventId);
    const removeVendor = useRemoveVendor(eventId);
    const [resetType, setResetType] = useState<PartnerRole | null>(null);
    const [qrType, setQrType] = useState<PartnerRole | null>(null);
    const [openVendorId, setOpenVendorId] = useState<string | null>(null);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const links = useMemo(() => sortByVendorType(linksQuery.data ?? []), [linksQuery.data]);
    const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data]);
    const selectedVendor = vendors.find((vendor) => vendor.id === openVendorId) ?? null;
    const qrLink = links.find((link) => link.vendorType === qrType) ?? null;

    const requestReset = useCallback((type: PartnerRole) => {
        setError(null);
        setResetType(type);
    }, []);
    const cancelReset = useCallback(() => setResetType(null), []);
    const confirmReset = useCallback(async () => {
        if (!resetType) return;
        try {
            await resetLink.mutateAsync(resetType);
        } catch (resetError) {
            setError(toErrorMessage(resetError));
        } finally {
            setResetType(null);
        }
    }, [resetLink, resetType, toErrorMessage]);

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

    const openQr = useCallback((type: PartnerRole) => setQrType(type), []);
    const closeQr = useCallback(() => setQrType(null), []);

    return {
        links,
        vendors,
        isLoading: linksQuery.isLoading || vendorsQuery.isLoading,
        selectedVendor,
        resetType,
        removeOpen,
        qrLink,
        error,
        isResetting: resetLink.isPending,
        isPatching: patchVendor.isPending,
        isRemoving: removeVendor.isPending,
        requestReset,
        cancelReset,
        confirmReset,
        openVendor,
        closeVendor,
        toggleHidden,
        requestRemove,
        cancelRemove,
        confirmRemove,
        openQr,
        closeQr,
    };
}
