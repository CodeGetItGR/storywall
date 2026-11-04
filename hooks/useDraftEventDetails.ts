'use client';

import { type SubmitEvent, useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUpdateEvent } from '@/hooks/useEvent';
import { useEventDetailsForm } from '@/hooks/useEventDetailsForm';
import { projectCoverage } from '@/lib/eventCoverage';
import { eventDetailsStorageKey } from '@/lib/eventDetailsForm';

/**
 * The date and place of a draft on a plan that needs them and has none. They are saved on the draft before paying:
 * a draft's checkout request carries no details.
 */
export function useDraftEventDetails(eventId: string, { hostingMonths }: { hostingMonths: number | undefined }) {
    const toErrorMessage = useApiErrorMessage();
    const updateEvent = useUpdateEvent(eventId);
    const form = useEventDetailsForm({
        storageKey: eventDetailsStorageKey(eventId),
        coverageEndsAt: projectCoverage({ hostingMonths })?.coverageEndsAt,
    });
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const open = useCallback(() => {
        setError(null);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        if (!updateEvent.isPending) setIsOpen(false);
    }, [updateEvent.isPending]);

    const { mutateAsync } = updateEvent;
    const { applyServerError, isComplete, request } = form;
    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!isComplete || !request) return;
            setError(null);
            try {
                await mutateAsync(request);
                setIsOpen(false);
            } catch (saveError) {
                if (!applyServerError(saveError)) setError(toErrorMessage(saveError));
            }
        },
        [applyServerError, isComplete, mutateAsync, request, toErrorMessage],
    );

    return { form, isOpen, error, isSaving: updateEvent.isPending, open, close, handleSubmit };
}

export type DraftEventDetails = ReturnType<typeof useDraftEventDetails>;
