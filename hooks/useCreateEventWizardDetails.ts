'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';

import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { joinLine, previewWhen } from '@/lib/createEventWizardReview';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The details step as plain values: the live preview card and the one-line time zone.
export function useCreateEventWizardDetails() {
    const locale = useLocale();
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const voice = useEventTypeVoice(form.selectedEventType);
    const [timeZoneOpen, setTimeZoneOpen] = useState(false);

    const type = form.eventTypes.find((entry) => entry.eventTypeKey === form.selectedEventType);
    const typedTitle = form.title.trim();

    return {
        preview: {
            photoSrc: createEventTypePhoto(form.selectedEventType, type?.imageUrl ?? null),
            alt: typeCopy(form.selectedEventType).name,
            title: typedTitle || voice.titlePlaceholder,
            titleIsPlaceholder: !typedTitle,
            line: joinLine([previewWhen(locale, form.startAt), form.locationName]),
        },
        timeZone: {
            zone: form.timezone,
            // An error keeps the field open so it can be fixed.
            open: timeZoneOpen || Boolean(form.timezoneError),
            onOpen: () => setTimeZoneOpen(true),
            options: form.timezoneOptions,
            error: form.timezoneError,
            onChange: form.onTimezoneChange,
        },
    };
}
