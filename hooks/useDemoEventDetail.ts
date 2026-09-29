'use client';

import { useCallback, useMemo } from 'react';

import { useAdminDemoEvents, useRemoveAdminDemoEvent, useSetAdminDemoEvent } from '@/hooks/useAdminDemoEvents';
import { useAuth } from '@/hooks/useAuth';
import { useDisclosure } from '@/hooks/useDisclosure';
import type { ProvisionEventOptions } from '@/hooks/useProvisionEventForm';
import type { ProvisionHost } from '@/lib/adminAccountProvisioning';
import type { EventResponseDto, EventTypeConvention } from '@/lib/api/types';

export function useDemoEventDetail(eventTypeKey: EventTypeConvention) {
    const { user } = useAuth();
    const setDemo = useSetAdminDemoEvent();
    const removeDemo = useRemoveAdminDemoEvent();
    const removeConfirm = useDisclosure();
    const createDrawer = useDisclosure();
    // Kept warm so AppShell lets this admin into the new event right away.
    useAdminDemoEvents();

    // A demo's primary host has to be an admin, so the signed-in admin hosts the new event.
    const host = useMemo<ProvisionHost | null>(
        () => (user ? { id: user.userId, email: user.email, firstName: user.firstName, lastName: user.lastName } : null),
        [user],
    );

    const provisionOptions = useMemo<ProvisionEventOptions>(
        () => ({
            eventType: eventTypeKey,
            onProvisioned: (event: EventResponseDto) => {
                removeDemo.reset();
                return setDemo.mutateAsync({ eventTypeKey, input: { eventId: event.id } });
            },
        }),
        [eventTypeKey, removeDemo, setDemo],
    );

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            const eventId = String(new FormData(form).get('eventId') ?? '').trim();
            if (!eventId) return;
            removeDemo.reset();
            setDemo.mutate({ eventTypeKey, input: { eventId } }, { onSuccess: () => form.reset() });
        },
        [eventTypeKey, removeDemo, setDemo],
    );

    const confirmRemove = useCallback(async () => {
        setDemo.reset();
        try {
            await removeDemo.mutateAsync(eventTypeKey);
        } catch {
            // Shown from `error`.
        } finally {
            removeConfirm.toggle();
        }
    }, [eventTypeKey, removeConfirm, removeDemo, setDemo]);

    return {
        host,
        provisionOptions,
        createDrawer,
        isSaving: setDemo.isPending,
        isRemoving: removeDemo.isPending,
        error: setDemo.error ?? removeDemo.error,
        removeConfirm,
        handleSubmit,
        confirmRemove,
    };
}
