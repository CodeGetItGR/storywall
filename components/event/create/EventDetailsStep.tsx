'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { EventGiftFields } from '@/components/event/create/EventGiftFields';
import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';
import { EventTitleField } from '@/components/event/create/EventTitleField';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
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
    const labels = useCreateEventFieldLabels(selectedEventType);
    const limits = useContentLimits();

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Form Fields */}
            <div className="space-y-4">
                <EventTitleField />

                {/* Schedule */}
                <FormFieldLabel label={labels.startAt} required>
                    <DateTimeField
                        required
                        value={startAt}
                        onChange={onStartAtChange}
                        min={startAtMin}
                        max={startAtMax}
                        aria-invalid={Boolean(scheduleError)}
                        inputClassName="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {scheduleError ? (
                        <span className="text-xs text-rose-500">{scheduleError}</span>
                    ) : !showScheduleHint ? null : projectedCoverage ? (
                        <span className="text-xs text-ink-muted">
                            {t('coverageProjection', { endsAt: formatDate(locale, projectedCoverage.coverageEndsAt, { dateStyle: 'medium' }) })}
                        </span>
                    ) : (
                        <span className="text-xs text-ink-muted">{t('startAtHint')}</span>
                    )}
                </FormFieldLabel>

                {/* Timezone */}
                {timezoneField ?? (
                    <EventTimezoneField
                        label={t('fields.timezone')}
                        value={timezone}
                        options={timezoneOptions}
                        error={timezoneError}
                        onChangeAction={onTimezoneChange}
                    />
                )}

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
                            placeholder={addressPlaceholder ?? t('placeholders.locationAddress')}
                            className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                        />
                        {locationAddressError && <span className="text-xs text-rose-500">{locationAddressError}</span>}
                    </FormFieldLabel>
                </div>
                {locationNote}
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

                {/* Gift */}
                <EventGiftFields />

                {/* Creation Hint */}
                <p className="pt-1 text-xs leading-relaxed text-ink-muted">{t('detailsHint')}</p>
            </div>
        </div>
    );
}
