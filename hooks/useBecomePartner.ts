'use client';

import { useCallback, useMemo, useState } from 'react';

import type { ApplyFormDefaults } from '@/components/forBusiness/ForBusinessApplyForm';
import { useAuth } from '@/hooks/useAuth';
import { useDismissPartnerPrompt, useVendorProfile } from '@/hooks/useVendorProfile';
import { vendorApplySearch } from '@/lib/vendors';

// The vendor page's partner prompt: the sheet's starting values, its attribution and the dismissal.
export function useBecomePartner() {
    const { user } = useAuth();
    const { data: profile } = useVendorProfile();
    const dismissPrompt = useDismissPartnerPrompt();
    const [sheetOpen, setSheetOpen] = useState(false);
    const vendorType = profile?.vendorType ?? 'OTHER';
    const firstName = user?.firstName;
    const lastName = user?.lastName;
    const email = user?.email;
    const businessName = profile?.businessName;
    const link = profile?.link;

    const defaults = useMemo<ApplyFormDefaults>(
        () => ({
            name: [firstName, lastName].filter(Boolean).join(' '),
            businessName: businessName ?? '',
            role: vendorType,
            email: email ?? '',
            link: link ?? '',
        }),
        [firstName, lastName, businessName, vendorType, email, link],
    );

    const openSheet = useCallback(() => setSheetOpen(true), []);
    const closeSheet = useCallback(() => setSheetOpen(false), []);
    const { mutateAsync: dismissAsync } = dismissPrompt;
    const dismiss = useCallback(async () => {
        try {
            await dismissAsync();
        } catch {
            // The card stays; the next tap tries again.
        }
    }, [dismissAsync]);

    return { defaults, search: vendorApplySearch(vendorType), sheetOpen, openSheet, closeSheet, dismiss, isDismissing: dismissPrompt.isPending };
}
