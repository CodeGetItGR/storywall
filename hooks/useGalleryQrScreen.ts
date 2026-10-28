'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useQrCardHref } from '@/hooks/useQrCardTemplates';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { demoGuestPagePathForEvent } from '@/lib/demo/demoRouting';
import { findGalleryQrLink, isGalleryQrFeatureEnabled } from '@/lib/qrLinks';

export function useGalleryQrScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const { data: qrLinks, isLoading } = useEventQrLinks(eventId);

    // Gated the same way as the nav entries that link here (see
    // useToolsMenuItems/useRightContextPanel) — this page shouldn't be
    // reachable at all when the gallery QR feature is off for this event.
    const featureEnabled = isGalleryQrFeatureEnabled(activeEvent?.modules);

    const qrLink = findGalleryQrLink(qrLinks ?? []);
    const cardHref = useQrCardHref(eventId, qrLink?.id ?? '');

    return {
        cardHref: qrLink ? cardHref : null,
        // Only in the demo: its upload page, on this device.
        demoUploadHref: demoGuestPagePathForEvent(eventId, 'upload'),
        eventId,
        featureEnabled,
        isLoading,
        qrLink,
    } as const;
}
