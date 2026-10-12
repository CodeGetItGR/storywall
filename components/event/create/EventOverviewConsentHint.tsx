'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { focusFirstUncheckedBox } from '@/lib/createEventSteps';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

/** Tells the host why Pay is disabled and takes them to the unticked box. */
export function EventOverviewConsentHint() {
    const t = useTranslations('CreateEventPage');
    const { formId, consentSatisfied, error } = useCreateEventForm();
    const onShowBoxes = useCallback(() => focusFirstUncheckedBox(formId), [formId]);

    // The submit error takes the slot when both apply.
    if (consentSatisfied || error) return null;

    return (
        <button
            type="button"
            onClick={onShowBoxes}
            className="mb-2 flex min-h-8 w-full items-center justify-center text-xs font-semibold text-primary-dark underline underline-offset-2"
        >
            {t('overview.consentHint')}
        </button>
    );
}
