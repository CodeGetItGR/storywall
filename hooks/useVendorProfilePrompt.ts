'use client';

import { useCallback, useState } from 'react';

import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useMyVendorRole } from '@/hooks/useVendors';

// The first-join sheet: open while the caller is a vendor here without a profile.
// "Later" closes it for this visit only; it opens again on the next one until the profile is filled in.
export function useVendorProfilePrompt(eventId: string) {
    const role = useMyVendorRole(eventId);
    const needsProfile = role.data ? !role.data.profileComplete : false;
    const profile = useVendorProfile(needsProfile);
    const [dismissed, setDismissed] = useState(false);

    const close = useCallback(() => setDismissed(true), []);

    return {
        open: needsProfile && !dismissed,
        profile: profile.data ?? null,
        defaultType: role.data?.vendorType ?? 'OTHER',
        close,
    };
}
