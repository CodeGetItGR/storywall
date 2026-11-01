'use client';

import { useCallback, useState } from 'react';

import { useBecomePartner } from '@/hooks/useBecomePartner';
import { useBusinessContact } from '@/hooks/useBusinessContact';
import { useBusinessEvents } from '@/hooks/useBusinessEvents';
import { useBusinessOverview } from '@/hooks/useBusinessOverview';
import { usePartnerPortal } from '@/hooks/usePartnerPortal';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useVendorServicesSection } from '@/hooks/useVendorServicesSection';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { businessSections } from '@/lib/business';
import { partnerBalances } from '@/lib/partnerPortal';
import { vendorProfileStatus } from '@/lib/vendors';

// Everything the business page shows, as plain values and actions. The partner data is read only for partners.
export function useBusinessPage() {
    const overview = useBusinessOverview();
    const partner = Boolean(overview.data?.partner);
    const portal = usePartnerPortal(partner);
    const events = useBusinessEvents(Boolean(overview.data));
    const profileQuery = useVendorProfile();
    const profileStatus = vendorProfileStatus(profileQuery);
    const services = useVendorServicesSection(
        overview.data ? { vendorType: overview.data.vendorType, approvedPartner: partner } : null,
        profileStatus,
    );
    const contact = useBusinessContact();
    const becomePartner = useBecomePartner();
    const [profileOpen, setProfileOpen] = useState(false);
    const openProfile = useCallback(() => setProfileOpen(true), []);
    const closeProfile = useCallback(() => setProfileOpen(false), []);

    const notVendor = getErrorCode(overview.error) === ERROR_CODES.NOT_A_VENDOR;
    const cardPreview = portal.data?.cardPreview ?? null;
    const refetchOverview = overview.refetch;
    const retry = useCallback(() => void refetchOverview(), [refetchOverview]);

    return {
        isLoading: overview.isLoading,
        notVendor,
        loadFailed: Boolean(overview.error) && !notVendor,
        retry,
        overview: overview.data ?? null,
        sections: overview.data ? businessSections(overview.data, cardPreview) : null,
        profile: profileQuery.data ?? null,
        balances: portal.data ? partnerBalances(portal.data.totals) : null,
        tierProgress: portal.data?.tierProgress ?? null,
        cardPreview,
        events,
        services,
        contact,
        becomePartner,
        profileOpen,
        openProfile,
        closeProfile,
    };
}
