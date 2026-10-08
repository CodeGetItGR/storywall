'use client';

import { useInvalidate } from '@refinedev/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';

import { adminKeys } from '@/hooks/useAdmin';
import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export const EVENT_TYPE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

// The card image of one event type in the create-event picker. Each change is
// saved at once (POST replaces, DELETE clears) and the drawer shows the
// server's answer, since its own `eventType` is a snapshot from the list.
export function useEventTypeCardImage(eventType: PlatformEventTypeResponseDto | null) {
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    const [latest, setLatest] = useState<PlatformEventTypeResponseDto | null>(null);
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    function onSaved(saved: PlatformEventTypeResponseDto) {
        setLatest(saved);
        void queryClient.invalidateQueries({ queryKey: adminKeys.platformEventTypes });
        invalidate({ resource: 'platform-event-types', dataProviderName: 'platform-event-types', invalidates: ['list'] });
        invalidatePublicConfig(queryClient);
    }

    const upload = useMutation({
        mutationFn: ({ eventTypeKey, file }: { eventTypeKey: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<PlatformEventTypeResponseDto>(endpoints.admin.platformEventTypes.image(eventTypeKey), formData);
        },
        onSuccess: onSaved,
    });
    const remove = useMutation({
        mutationFn: (eventTypeKey: string) => api.del<PlatformEventTypeResponseDto>(endpoints.admin.platformEventTypes.image(eventTypeKey)),
        onSuccess: (saved) => {
            onSaved(saved);
            setConfirmingRemove(false);
        },
    });

    const current = latest && eventType && latest.eventTypeKey === eventType.eventTypeKey ? latest : eventType;

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.currentTarget.files?.[0];
        // Lets the same file be picked again after a refusal.
        event.currentTarget.value = '';
        if (!file || !eventType) return;
        remove.reset();
        upload.mutate({ eventTypeKey: eventType.eventTypeKey, file });
    }

    function openRemove() {
        upload.reset();
        setConfirmingRemove(true);
    }

    function closeRemove() {
        setConfirmingRemove(false);
    }

    function confirmRemove() {
        if (eventType) remove.mutate(eventType.eventTypeKey);
    }

    function reset() {
        setLatest(null);
        setConfirmingRemove(false);
        upload.reset();
        remove.reset();
    }

    return {
        imageUrl: current?.imageUrl ?? null,
        isUploading: upload.isPending,
        isRemoving: remove.isPending,
        error: upload.error ?? remove.error,
        confirmingRemove,
        handleFileChange,
        openRemove,
        closeRemove,
        confirmRemove,
        reset,
    };
}

export type EventTypeCardImage = ReturnType<typeof useEventTypeCardImage>;
