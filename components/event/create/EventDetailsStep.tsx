'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { EventGiftFields } from '@/components/event/create/EventGiftFields';
import { EventScheduleVenueFields } from '@/components/event/create/EventScheduleVenueFields';
import { EventTitleField } from '@/components/event/create/EventTitleField';
import { formatDate } from '@/lib/datetime';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

type EventDetailsStepProps = {
    // Replaces today's time zone field (the wizard shows a one-line summary instead).
    timezoneField?: ReactNode;
    // The coverage hint under the date ("Coverage starts…", "Photos kept until…"). Errors always show.
    showScheduleHint?: boolean;
    addressPlaceholder?: string;
    // A line under the venue fields (the wizard's reception note).
    locationNote?: ReactNode;
};

export function EventDetailsStep({ timezoneField, showScheduleHint = true, addressPlaceholder, locationNote }: EventDetailsStepProps = {}) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const {
        selectedEventType,
        startAt,
        scheduleError,
        projectedCoverage,
        startAtMin,
        startAtMax,
        onStartAtChange,
        timezone,
        timezoneError,
        timezoneOptions,
        onTimezoneChange,
        locationName,
        locationNameError,
        onLocationNameChange,
        locationAddress,
        locationAddressError,
        onLocationAddressChange,
        mapsUrl,
        onMapsUrlChange,
    } = useCreateEventForm();

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Form Fields */}
            <div className="space-y-4">
                <EventTitleField />

                <EventScheduleVenueFields
                    eventType={selectedEventType}
                    startAt={startAt}
                    startAtMin={startAtMin}
                    startAtMax={startAtMax}
                    scheduleError={scheduleError}
                    startAtHint={
                        showScheduleHint && (
                            <span className="text-xs text-ink-muted">
                                {projectedCoverage
                                    ? t('coverageProjection', {
                                          endsAt: formatDate(locale, projectedCoverage.coverageEndsAt, { dateStyle: 'medium' }),
                                      })
                                    : t('startAtHint')}
                            </span>
                        )
                    }
                    onStartAtChange={onStartAtChange}
                    timezone={timezone}
                    timezoneOptions={timezoneOptions}
                    timezoneError={timezoneError}
                    onTimezoneChange={onTimezoneChange}
                    timezoneField={timezoneField}
                    locationName={locationName}
                    locationNameError={locationNameError}
                    onLocationNameChange={onLocationNameChange}
                    locationAddress={locationAddress}
                    locationAddressError={locationAddressError}
                    onLocationAddressChange={onLocationAddressChange}
                    addressPlaceholder={addressPlaceholder}
                    locationNote={locationNote}
                    mapsUrl={mapsUrl}
                    onMapsUrlChange={onMapsUrlChange}
                />

                {/* Gift */}
                <EventGiftFields />

                {/* Creation Hint */}
                <p className="pt-1 text-xs leading-relaxed text-ink-muted">{t('detailsHint')}</p>
            </div>
        </div>
    );
}
