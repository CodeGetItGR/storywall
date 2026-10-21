'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { isEventVendorKey, useDismissPartnerPrompt, useVendorProfile } from '@/hooks/useVendorProfile';
import type { ApplyFormDefaults } from '@/lib/forBusinessApplication';
import { vendorApplySearch } from '@/lib/vendors';

// The vendor page's partner prompt: the sheet's starting values, its attribution and the dismissal.
export function useBecomePartner() {
    const { user } = useAuth();
    const { data: profile } = useVendorProfile();
    const queryClient = useQueryClient();
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
    // A sent application ends the prompt on the server; refresh only once the sheet is closed, so the "Thanks" stays visible.
    const closeSheet = useCallback(() => {
        setSheetOpen(false);
        queryClient.invalidateQueries({ predicate: (query) => isEventVendorKey(query.queryKey) });
    }, [queryClient]);
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
