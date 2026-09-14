'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { findGalleryQrLink, isGalleryQrFeatureEnabled } from '@/lib/qrLinks';

export function useGalleryQrScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const { data: qrLinks, isLoading } = useEventQrLinks(eventId);

    // Gated the same way as the nav entries that link here (see
    // useToolsMenuItems/useRightContextPanel) — this page shouldn't be
    // reachable at all when the gallery QR feature is off for this event.
    const featureEnabled = isGalleryQrFeatureEnabled(activeEvent?.modules);

    const qrLink = findGalleryQrLink(qrLinks ?? []);

    return {
        eventId,
        featureEnabled,
        isLoading,
        qrLink,
    } as const;
}
