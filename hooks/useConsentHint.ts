'use client';

import { useCallback } from 'react';

import { focusFirstUncheckedBox } from '@/lib/createEventSteps';
import { trackFlow } from '@/lib/flowTracking';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Whether the create form's "tick the boxes" hint shows, and the tap that takes the host to them.
export function useConsentHint(highlight: boolean): { show: boolean; onShowBoxes: () => void } {
    const { formId, consentSatisfied, error } = useCreateEventForm();
    const onShowBoxes = useCallback(() => {
        trackFlow({ name: 'Consent Hint', from: 'wizard' });
        focusFirstUncheckedBox(formId, { highlight });
    }, [formId, highlight]);
    return { show: !consentSatisfied && !error, onShowBoxes };
}
