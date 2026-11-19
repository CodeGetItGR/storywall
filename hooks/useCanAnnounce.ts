'use client';

import { useMyVendorRole } from '@/hooks/useVendors';
import { canAnnounce } from '@/lib/announcementComposer';
import { useContentAccessMode, useIsHost, useRouteEventId } from '@/providers/EventProvider';

// Whether the composer offers Announcement. Only on an event's own pages: id-less
// pages keep the remembered event but must not fire event-scoped requests for it.
// A host is never a vendor, so the host skips the role request.
export function useCanAnnounce(canComposePost: boolean): boolean {
    const isHost = useIsHost();
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';
    const routeEventId = useRouteEventId();
    const vendorRole = useMyVendorRole(isHost || !canComposePost ? null : routeEventId);

    if (!routeEventId) return false;
    return canAnnounce({ canComposePost, isHost, vendorRole: vendorRole.data, isDemoVisitor });
}
