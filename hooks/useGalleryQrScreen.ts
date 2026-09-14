'use client';

import { useCallback } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateQrLink, useEventQrLinks } from '@/hooks/useQrLinks';
import { findGalleryQrLink, isGalleryQrFeatureEnabled } from '@/lib/qrLinks';

export function useGalleryQrScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const toErrorMessage = useApiErrorMessage();
    const { data: qrLinks, isLoading } = useEventQrLinks(eventId);
    const createQrLink = useCreateQrLink(eventId);

    // Gated the same way as the nav entries that link here (see
    // useToolsMenuItems/useRightContextPanel) — this page shouldn't be
    // reachable at all when the gallery QR feature is off for this event.
    const featureEnabled = isGalleryQrFeatureEnabled(activeEvent?.modules);

    const qrLink = findGalleryQrLink(qrLinks ?? []);

    const handleCreate = useCallback(async () => {
        await createQrLink.mutateAsync({ targetType: 'MEDIA_UPLOAD' });
    }, [createQrLink]);

    return {
        eventId,
        featureEnabled,
        isLoading,
        qrLink,
        handleCreate,
        isCreating: createQrLink.isPending,
        createError: createQrLink.isError ? toErrorMessage(createQrLink.error) : null,
    } as const;
}
