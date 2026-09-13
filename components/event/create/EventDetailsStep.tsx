'use client';

import { useTranslations } from 'next-intl';

import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventDetailsStep() {
    const t = useTranslations('CreateEventPage');
    const {
        selectedEventType,
        title,
        titleError,
        onTitleChange,
        startAt,
        scheduleError,
        startAtMin,
        startAtMax,
        onStartAtChange,
        endAt,
        endAtMin,
        onEndAtChange,
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
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
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
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>

                <FormFieldLabel label={t('fields.endAt')} required>
                    <input
                        type="datetime-local"
                        required
                        value={endAt}
                        onChange={onEndAtChange}
                        min={endAtMin}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>
                {scheduleError && <p className="text-xs text-rose-500">{scheduleError}</p>}

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
                            className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
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
                            className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
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
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>

                {/* Creation Hint */}
                <p className="pt-1 text-xs leading-relaxed text-ink-muted">{t('detailsHint')}</p>
            </div>
        </div>
    );
}
