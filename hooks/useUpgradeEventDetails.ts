'use client';

import { type SubmitEvent, useCallback, useState } from 'react';

import { useEventDetailsForm } from '@/hooks/useEventDetailsForm';
import type { EventDetailResponseDto, OrderSummaryDto, UpgradeCoverageOptionDto, UpgradeOptionResponseDto } from '@/lib/api/types';
import { upgradedCoverageEndsAt } from '@/lib/eventCoverage';
import { eventDetailsStorageKey } from '@/lib/eventDetailsForm';
import { upgradeEarliestStartAt, upgradeNeedsEventDetails } from '@/lib/upgradeOptions';

/**
 * The date and place an upgrade asks for first when the new plan needs them and the event has none. They go with the
 * checkout request, and reach the event only when the payment settles. Every (re)load starts on the details step,
 * with what was typed remembered.
 */
export function useUpgradeEventDetails({
    eventId,
    event,
    entry,
    duration,
    orders,
}: {
    eventId: string;
    event: EventDetailResponseDto | undefined;
    entry: UpgradeOptionResponseDto | null;
    duration: UpgradeCoverageOptionDto | null;
    orders: OrderSummaryDto[] | undefined;
}) {
    const needsDetails = upgradeNeedsEventDetails(entry, event);
    const form = useEventDetailsForm({
        storageKey: eventDetailsStorageKey(eventId),
        earliestStartAt: needsDetails && event ? upgradeEarliestStartAt(orders ?? [], event.createdAt) : null,
        coverageEndsAt: needsDetails && event ? upgradedCoverageEndsAt(event.schedule.coverageEndsAt, duration?.monthsAdded ?? 0) : null,
    });
    const [confirmed, setConfirmed] = useState(false);
    const { applyServerError, isComplete } = form;

    const handleSubmit = useCallback(
        (submitEvent: SubmitEvent<HTMLFormElement>) => {
            submitEvent.preventDefault();
            if (isComplete) setConfirmed(true);
        },
        [isComplete],
    );

    const edit = useCallback(() => setConfirmed(false), []);

    // True when the error is about the details: their step shows it on the field.
    const handleCheckoutError = useCallback(
        (error: unknown): boolean => {
            if (!needsDetails || !applyServerError(error)) return false;
            setConfirmed(false);
            return true;
        },
        [applyServerError, needsDetails],
    );

    return {
        form,
        needsDetails,
        showsStep: needsDetails && !confirmed,
        handleSubmit,
        edit,
        handleCheckoutError,
        // Only when they're needed; the backend ignores them otherwise.
        requestFields: needsDetails && form.request ? { details: form.request } : {},
    };
}
