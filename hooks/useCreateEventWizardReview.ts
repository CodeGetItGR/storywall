'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { joinLine, planRowDetail } from '@/lib/createEventWizardReview';
import { formatEventDateParts } from '@/lib/datetime';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The review's summary card: the event (Edit → details) and the plan (Change → plan).
export function useCreateEventWizardReview() {
    const locale = useLocale();
    const tDurations = useTranslations('Durations');
    const tPricing = useTranslations('LandingPage.pricing');
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();

    const type = form.eventTypes.find((entry) => entry.eventTypeKey === form.selectedEventType);
    const plan = form.selectedPlan;
    const option = form.selectedOption;

    return {
        event: {
            photoSrc: createEventTypePhoto(form.selectedEventType, type?.imageUrl ?? null),
            alt: typeCopy(form.selectedEventType).name,
            title: form.trimmedTitle,
            line: joinLine([formatEventDateParts(locale, form.startAt, null)?.date, form.locationName]),
            onEdit: form.goToDetails,
        },
        plan:
            plan && option
                ? {
                      title: joinLine([plan.name, tDurations('months', { count: option.months })]),
                      detail: planRowDetail(plan, {
                          guestsUpTo: (count) => tPricing('guestsUpTo', { count }),
                          guestsUnlimited: tPricing('guestsUnlimited'),
                          storageUnlimited: tPricing('storageUnlimited'),
                      }),
                      onChange: form.goToPlan,
                  }
                : null,
    };
}

export type CreateEventWizardReview = ReturnType<typeof useCreateEventWizardReview>;
