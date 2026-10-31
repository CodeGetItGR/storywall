'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useMyVendorRole, usePatchVendor } from '@/hooks/useVendors';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { capabilitiesOfType, hasVendorCapability, vendorProfileStatus, vendorToolLinks } from '@/lib/vendors';
import { useActiveEvent } from '@/providers/EventProvider';

// The vendor page: role, tools, the list switch and the details sheet.
// The page is not gated on the vendors module: with it off, the vendor still sees their own
// details and why the tools are closed, and the sections that need the module stay hidden.
export function useVendorMePage(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const activeEvent = useActiveEvent();
    const role = useMyVendorRole(eventId);
    const me = role.data ?? null;
    const profile = useVendorProfile(me !== null);
    const patchVendor = usePatchVendor(eventId);
    const [profileOpen, setProfileOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modules = useMemo(() => readableModuleKeys(activeEvent), [activeEvent]);
    const vendorsReadable = modules.has('vendors');

    const toggleListed = useCallback(async () => {
        if (!me) return;
        setError(null);
        try {
            await patchVendor.mutateAsync({ vendorId: me.vendorId, patch: { optedOut: !me.optedOut } });
        } catch (patchError) {
            setError(toErrorMessage(patchError));
        }
    }, [me, patchVendor, toErrorMessage]);

    const openProfile = useCallback(() => setProfileOpen(true), []);
    const closeProfile = useCallback(() => setProfileOpen(false), []);

    return {
        me,
        isLoading: role.isLoading,
        profile: profile.data ?? null,
        // The read is null until the first save.
        profileStatus: vendorProfileStatus(profile),
        tools: me ? vendorToolLinks(eventId, me, modules) : [],
        // The type has a Pro album at all (capabilities is empty while the tools are off); the Pro list needs the gallery and vendors modules.
        // The section stays after the access window so past uploads remain visible; canUploadPro closes the upload.
        hasProAlbum: me ? capabilitiesOfType(me.vendorType).includes('PRO_ALBUM') && vendorsReadable && modules.has('gallery') : false,
        canUploadPro: hasVendorCapability(me, 'PRO_ALBUM'),
        // The list switch calls a vendors-module endpoint.
        canChooseListing: vendorsReadable,
        listed: me ? !me.optedOut : false,
        hiddenByHost: me?.hiddenByHost ?? false,
        toggleListed,
        isTogglingListed: patchVendor.isPending,
        error,
        profileOpen,
        openProfile,
        closeProfile,
    };
}
