'use client';

import { useCallback } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateQrLink, useEventQrLinks } from '@/hooks/useQrLinks';
import type { GalleryModuleConfiguration } from '@/lib/api/types';
import { findGalleryQrLink } from '@/lib/qrLinks';

export function useGalleryQrScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const toErrorMessage = useApiErrorMessage();
    const { data: qrLinks, isLoading } = useEventQrLinks(eventId);
    const createQrLink = useCreateQrLink(eventId);

    const galleryModule = activeEvent?.modules.find((module) => module.moduleKey === 'gallery');
    const galleryEnabled = galleryModule?.isAvailable ?? false;
    const qrUploadEnabled = (galleryModule?.configuration as GalleryModuleConfiguration | null)?.qrUploadEnabled ?? true;

    const qrLink = findGalleryQrLink(qrLinks ?? []);

    const handleCreate = useCallback(async () => {
        await createQrLink.mutateAsync({ targetType: 'MEDIA_UPLOAD' });
    }, [createQrLink]);

    return {
        eventId,
        galleryEnabled,
        qrUploadEnabled,
        isLoading,
        qrLink,
        handleCreate,
        isCreating: createQrLink.isPending,
        createError: createQrLink.isError ? toErrorMessage(createQrLink.error) : null,
    } as const;
}
