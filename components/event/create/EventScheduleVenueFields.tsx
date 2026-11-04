'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, ReactNode } from 'react';

import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import type { EventTypeConvention } from '@/lib/api/types';

// The date, time zone and place of an event, in the create wizard and wherever else an event gets them later.
export function EventScheduleVenueFields({
    eventType,
    startAt,
    startAtMin,
    startAtMax,
    scheduleError,
    startAtHint,
    onStartAtChange,
    timezone,
    timezoneOptions,
    timezoneError,
    onTimezoneChange,
    locationName,
    locationNameError,
    onLocationNameChange,
    locationAddress,
    locationAddressError,
    onLocationAddressChange,
    mapsUrl,
    onMapsUrlChange,
}: {
    eventType: EventTypeConvention;
    startAt: string;
    startAtMin: string;
    startAtMax?: string;
    scheduleError: string | null;
    // Shown under the date while it has no error.
    startAtHint?: ReactNode;
    onStartAtChange: (value: string) => void;
    timezone: string;
    timezoneOptions: string[];
    timezoneError: string | null;
    onTimezoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
    locationName: string;
    locationNameError?: string;
    onLocationNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    locationAddress: string;
    locationAddressError?: string;
    onLocationAddressChange: (event: ChangeEvent<HTMLInputElement>) => void;
    mapsUrl: string;
    onMapsUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('CreateEventPage');
    const labels = useCreateEventFieldLabels(eventType);
    const limits = useContentLimits();

    return (
        <>
            {/* Schedule */}
            <FormFieldLabel label={labels.startAt} required>
                <DateTimeField
                    required
                    value={startAt}
                    onChange={onStartAtChange}
                    min={startAtMin}
                    max={startAtMax}
                    inputClassName="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none focus:ring-2 focus:ring-primary/30"
                />
                {scheduleError ? <span className="text-xs text-rose-500">{scheduleError}</span> : startAtHint}
            </FormFieldLabel>

            {/* Timezone */}
            <EventTimezoneField
                label={t('fields.timezone')}
                value={timezone}
                options={timezoneOptions}
                error={timezoneError}
                onChangeAction={onTimezoneChange}
            />

            {/* Location */}
            <div className="grid gap-3 sm:grid-cols-2">
                <FormFieldLabel label={labels.locationName} required>
                    <input
                        type="text"
                        required
                        maxLength={limits.locationNameMaxLength}
                        value={locationName}
                        onChange={onLocationNameChange}
                        className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                    />
                    {locationNameError && <span className="text-xs text-rose-500">{locationNameError}</span>}
                </FormFieldLabel>
                <FormFieldLabel label={t('fields.locationAddress')} required>
                    <input
                        type="text"
                        required
                        maxLength={limits.locationAddressMaxLength}
                        value={locationAddress}
                        onChange={onLocationAddressChange}
                        placeholder={t('placeholders.locationAddress')}
                        className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                    />
                    {locationAddressError && <span className="text-xs text-rose-500">{locationAddressError}</span>}
                </FormFieldLabel>
            </div>
            <FormFieldLabel label={t('fields.mapsUrl')} optional>
                <input
                    type="url"
                    maxLength={limits.urlMaxLength}
                    value={mapsUrl}
                    onChange={onMapsUrlChange}
                    placeholder={t('placeholders.mapsUrl')}
                    className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                />
            </FormFieldLabel>
        </>
    );
}
