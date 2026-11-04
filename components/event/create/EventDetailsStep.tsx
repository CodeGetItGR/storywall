'use client';

import { useLocale, useTranslations } from 'next-intl';

import { EventGiftFields } from '@/components/event/create/EventGiftFields';
import { EventScheduleVenueFields } from '@/components/event/create/EventScheduleVenueFields';
import { EventTitleField } from '@/components/event/create/EventTitleField';
import { formatDate } from '@/lib/datetime';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventDetailsStep() {
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
                        <span className="text-xs text-ink-muted">
                            {projectedCoverage
                                ? t('coverageProjection', { endsAt: formatDate(locale, projectedCoverage.coverageEndsAt, { dateStyle: 'medium' }) })
                                : t('startAtHint')}
                        </span>
                    }
                    onStartAtChange={onStartAtChange}
                    timezone={timezone}
                    timezoneOptions={timezoneOptions}
                    timezoneError={timezoneError}
                    onTimezoneChange={onTimezoneChange}
                    locationName={locationName}
                    locationNameError={locationNameError}
                    onLocationNameChange={onLocationNameChange}
                    locationAddress={locationAddress}
                    locationAddressError={locationAddressError}
                    onLocationAddressChange={onLocationAddressChange}
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
