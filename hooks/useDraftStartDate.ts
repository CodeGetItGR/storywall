'use client';

import { useTranslations } from 'next-intl';
import { type SubmitEvent, useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpdateEvent } from '@/hooks/useEvent';
import {
    DEFAULT_EVENT_LENGTH_MS,
    eventWindowFromLocalStart,
    getScheduleDatetimeLocalBounds,
    isDatetimeLocalAfter,
    isDatetimeLocalBefore,
    toDatetimeLocalValue,
} from '@/lib/datetime';

// The length the draft already has, so moving its start keeps the same end-to-start gap.
function eventLengthMs(startAt: string | null, endAt: string | null): number {
    if (!startAt || !endAt) return DEFAULT_EVENT_LENGTH_MS;
    const length = Date.parse(endAt) - Date.parse(startAt);
    return Number.isFinite(length) && length > 0 ? length : DEFAULT_EVENT_LENGTH_MS;
}

/**
 * Moving a draft's date from its overview (a draft host can't reach the schedule
 * tools): a start in the future, the end moved with it. Checkout answers 3035 once
 * the saved start has passed.
 */
export function useDraftStartDate(eventId: string, { startAt, endAt }: { startAt: string | null; endAt: string | null }) {
    const t = useTranslations('CreateEventPage');
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const updateEvent = useUpdateEvent(eventId);
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { startAtMin, startAtMax } = getScheduleDatetimeLocalBounds({ startAt: value, maxLeadDays: appConfig?.coverage.maxLeadDays });
    const validationError =
        value && isDatetimeLocalBefore(value, startAtMin)
            ? t('validation.startInPast')
            : value && isDatetimeLocalAfter(value, startAtMax)
              ? t('validation.startTooFarAhead')
              : null;

    const open = useCallback(() => {
        setValue(toDatetimeLocalValue(startAt));
        setError(null);
        setIsOpen(true);
    }, [startAt]);

    const close = useCallback(() => {
        if (!updateEvent.isPending) setIsOpen(false);
    }, [updateEvent.isPending]);

    const handleChange = useCallback((nextValue: string) => setValue(nextValue), []);

    const { mutateAsync } = updateEvent;
    const save = useCallback(async () => {
        const dates = eventWindowFromLocalStart(value, eventLengthMs(startAt, endAt));
        if (!dates || validationError) return;
        setError(null);
        try {
            await mutateAsync(dates);
            setIsOpen(false);
        } catch (saveError) {
            setError(toErrorMessage(saveError));
        }
    }, [endAt, mutateAsync, startAt, toErrorMessage, validationError, value]);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            void save();
        },
        [save],
    );

    return {
        isOpen,
        value,
        min: startAtMin,
        max: startAtMax,
        validationError,
        error,
        canSave: Boolean(value) && !validationError,
        isSaving: updateEvent.isPending,
        open,
        close,
        handleChange,
        handleSubmit,
    };
}

export type DraftStartDate = ReturnType<typeof useDraftStartDate>;
