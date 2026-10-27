'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useResetVendorLink, useVendorLinks } from '@/hooks/useVendors';
import type { PartnerRole } from '@/lib/api/types';
import { sortByVendorType } from '@/lib/vendors';

// Manage → Vendors: the "Invite" sheet. One type at a time, its link, its QR and the reset confirmation.
export function useVendorInvite(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const linksQuery = useVendorLinks(eventId, true);
    const resetLink = useResetVendorLink(eventId);
    const [open, setOpen] = useState(false);
    const [pickedType, setPickedType] = useState<PartnerRole | null>(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const links = useMemo(() => sortByVendorType(linksQuery.data ?? []), [linksQuery.data]);
    // The first type until the host picks one, so the sheet never opens without a link.
    const link = links.find((candidate) => candidate.vendorType === pickedType) ?? links[0] ?? null;

    const openInvite = useCallback(() => {
        setError(null);
        setQrOpen(false);
        setOpen(true);
    }, []);
    const closeInvite = useCallback(() => {
        setOpen(false);
        setResetOpen(false);
    }, []);

    const pickType = useCallback((type: PartnerRole) => {
        setError(null);
        setQrOpen(false);
        setPickedType(type);
    }, []);

    const toggleQr = useCallback(() => setQrOpen((current) => !current), []);

    const requestReset = useCallback(() => {
        setError(null);
        setResetOpen(true);
    }, []);
    const cancelReset = useCallback(() => setResetOpen(false), []);
    const confirmReset = useCallback(async () => {
        if (!link) return;
        try {
            await resetLink.mutateAsync(link.vendorType);
        } catch (resetError) {
            setError(toErrorMessage(resetError));
        } finally {
            setResetOpen(false);
        }
    }, [link, resetLink, toErrorMessage]);

    return {
        links,
        link,
        isLoading: linksQuery.isLoading,
        open,
        qrOpen,
        resetOpen,
        error,
        isResetting: resetLink.isPending,
        openInvite,
        closeInvite,
        pickType,
        toggleQr,
        requestReset,
        cancelReset,
        confirmReset,
    };
}
