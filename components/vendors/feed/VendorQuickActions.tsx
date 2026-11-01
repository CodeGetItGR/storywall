'use client';

import { VendorQuickActionRow } from '@/components/vendors/feed/VendorQuickActionRow';
import { useVendorQuickActions } from '@/hooks/useVendorQuickActions';

// The signed-in vendor's tools on the feed, one tap away. Only the vendor sees it.
export function VendorQuickActions({ eventId, isHost }: { eventId: string; isHost: boolean }) {
    const actions = useVendorQuickActions(eventId, isHost);
    if (actions.length === 0) return null;
    return <VendorQuickActionRow actions={actions} />;
}
