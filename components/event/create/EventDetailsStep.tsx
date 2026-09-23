'use client';

import { useLocale, useTranslations } from 'next-intl';

import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import { formatDate } from '@/lib/datetime';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventDetailsStep() {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const {
        selectedEventType,
        title,
        titleError,
        onTitleChange,
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
    const voice = useEventTypeVoice(selectedEventType);
    const labels = useCreateEventFieldLabels(selectedEventType);

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Form Fields */}
            <div className="space-y-4">
                <FormFieldLabel label={labels.title} required>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={onTitleChange}
                        placeholder={voice.titlePlaceholder}
                        className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                    />
                    {titleError && <span className="text-xs text-rose-500">{titleError}</span>}
                </FormFieldLabel>

                {/* Schedule */}
                <FormFieldLabel label={labels.startAt} required>
                    <input
                        type="datetime-local"
                        required
                        value={startAt}
                        onChange={onStartAtChange}
                        min={startAtMin}
                        max={startAtMax}
                        className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {scheduleError ? (
                        <span className="text-xs text-rose-500">{scheduleError}</span>
                    ) : projectedCoverage ? (
                        <span className="text-xs text-ink-muted">
                            {t('coverageProjection', {
                                opensAt: formatDate(locale, projectedCoverage.galleryOpensAt, { dateStyle: 'medium' }),
                                endsAt: formatDate(locale, projectedCoverage.coverageEndsAt, { dateStyle: 'medium' }),
                            })}
                        </span>
                    ) : (
                        <span className="text-xs text-ink-muted">{t('startAtHint')}</span>
                    )}
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
                    <FormFieldLabel label={t('fields.locationName')} required>
                        <input
                            type="text"
                            required
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
                        value={mapsUrl}
                        onChange={onMapsUrlChange}
                        placeholder={t('placeholders.mapsUrl')}
                        className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                    />
                </FormFieldLabel>

                {/* Creation Hint */}
                <p className="pt-1 text-xs leading-relaxed text-ink-muted">{t('detailsHint')}</p>
            </div>
        </div>
    );
}
