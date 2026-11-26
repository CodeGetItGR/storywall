'use client';

import { useState } from 'react';

import { useMyVendorRole } from '@/hooks/useVendors';
import { isRsvpClosed } from '@/lib/invitation/rsvpSessions';

// The feed's RSVP prompt: a guest with no RSVP yet, until the reply-by date (KAN-297). Vendors don't RSVP, so it stays
// hidden while we find out.
export function useRsvpPromptVisible({
    eventId,
    isHost,
    rsvpAvailable,
    rsvpId,
    deadline = null,
}: {
    eventId: string;
    isHost: boolean;
    rsvpAvailable: boolean;
    rsvpId: string | null;
    deadline?: string | null;
}): boolean {
    // A host is never a vendor, so the host skips the role request.
    const vendorRole = useMyVendorRole(isHost ? null : eventId);
    const isGuest = !vendorRole.isLoading && !vendorRole.data;
    // The time the page opened: a prompt doesn't vanish under the guest while they read.
    const [openedAt] = useState(() => Date.now());
    return rsvpAvailable && !isHost && rsvpId === null && isGuest && !isRsvpClosed(deadline, openedAt);
}
