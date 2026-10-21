'use client';

import { useMyVendorRole } from '@/hooks/useVendors';

// The feed's RSVP prompt: a guest with no RSVP yet. Vendors don't RSVP, so it stays hidden while we find out.
export function useRsvpPromptVisible({
    eventId,
    isHost,
    rsvpAvailable,
    rsvpId,
}: {
    eventId: string;
    isHost: boolean;
    rsvpAvailable: boolean;
    rsvpId: string | null;
}): boolean {
    // A host is never a vendor, so the host skips the role request.
    const vendorRole = useMyVendorRole(isHost ? null : eventId);
    const isGuest = !vendorRole.isLoading && !vendorRole.data;
    return rsvpAvailable && !isHost && rsvpId === null && isGuest;
}
