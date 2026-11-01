'use client';

import { useCallback, useState } from 'react';

import { useBecomePartner } from '@/hooks/useBecomePartner';
import { useBusinessContact } from '@/hooks/useBusinessContact';
import { useBusinessEvents } from '@/hooks/useBusinessEvents';
import { useBusinessOverview } from '@/hooks/useBusinessOverview';
import { useBusinessSectionTarget } from '@/hooks/useBusinessSectionTarget';
import { usePartnerPortal } from '@/hooks/usePartnerPortal';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useVendorServicesSection } from '@/hooks/useVendorServicesSection';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { businessEarnings, businessSections } from '@/lib/business';
import { profileLoadState, vendorProfileStatus } from '@/lib/vendors';

// Everything the business page shows, as plain values and actions. The partner data is read only for partners.
// The page opens for vendors and approved partners alike; the overview's 403 is what says "not a vendor".
export function useBusinessPage() {
    const overview = useBusinessOverview();
    const partner = Boolean(overview.data?.partner);
    const portal = usePartnerPortal(partner);
    const events = useBusinessEvents(Boolean(overview.data));
    const profileQuery = useVendorProfile();
    const profileStatus = vendorProfileStatus(profileQuery);
    const profileState = profileLoadState(profileQuery);
    const services = useVendorServicesSection(
        overview.data ? { vendorType: overview.data.vendorType ?? null, approvedPartner: partner } : null,
        profileStatus,
    );
    const contact = useBusinessContact();
    const becomePartner = useBecomePartner();
    const [profileOpen, setProfileOpen] = useState(false);
    // The edit form starts from the loaded profile, so it opens only once there is one to start from.
    const openProfile = useCallback(() => {
        if (profileState === 'ready') setProfileOpen(true);
    }, [profileState]);
    const closeProfile = useCallback(() => setProfileOpen(false), []);

    const notVendor = getErrorCode(overview.error) === ERROR_CODES.NOT_A_VENDOR;
    const cardPreview = portal.data?.cardPreview ?? null;
    const sections = overview.data ? businessSections(overview.data, cardPreview) : null;
    useBusinessSectionTarget(sections !== null);

    const refetchOverview = overview.refetch;
    const retry = useCallback(() => void refetchOverview(), [refetchOverview]);
    const refetchProfile = profileQuery.refetch;
    const retryProfile = useCallback(() => void refetchProfile(), [refetchProfile]);
    const refetchPortal = portal.refetch;
    const retryEarnings = useCallback(() => void refetchPortal(), [refetchPortal]);
    const profile = profileQuery.data ?? null;

    return {
        isLoading: overview.isLoading,
        notVendor,
        loadFailed: Boolean(overview.error) && !notVendor,
        retry,
        overview: overview.data ?? null,
        sections,
        profile,
        profileState,
        retryProfile,
        // The profile read finished with none: offer to set it up. Never while loading or after a failed read.
        needsProfile: profileStatus === 'missing',
        // A partner with no vendor details yet still has a name: their partner name.
        name: profile?.businessName ?? portal.data?.name ?? null,
        earnings: businessEarnings(partner, portal),
        retryEarnings,
        cardPreview,
        events,
        services,
        contact,
        becomePartner,
        profileOpen: profileOpen && profileState === 'ready',
        openProfile,
        closeProfile,
    };
}
