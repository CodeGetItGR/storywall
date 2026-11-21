'use client';

import { useLocale } from 'next-intl';

import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { joinLine, previewWhen } from '@/lib/createEventWizardReview';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The account step's card: photo, title, then date · plan.
export function useCreateEventWizardAccountPreview() {
    const locale = useLocale();
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const type = form.eventTypes.find((entry) => entry.eventTypeKey === form.selectedEventType);

    return {
        photoSrc: createEventTypePhoto(form.selectedEventType, type?.imageUrl ?? null),
        alt: typeCopy(form.selectedEventType).name,
        title: form.trimmedTitle,
        titleIsPlaceholder: false,
        // A lite plan asks for no date: only the plan.
        line: joinLine([form.asksDetails ? previewWhen(locale, form.startAt) : null, form.selectedPlan?.name ?? null]),
    };
}
