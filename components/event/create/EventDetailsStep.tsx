'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';

type EventDetailsStepProps = {
    title: string;
    titleError?: string | null;
    startAt: string;
    endAt: string;
    scheduleError?: string | null;
    startAtMin: string;
    startAtMax?: string;
    endAtMin: string;
    timezone: string;
    locationName: string;
    onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onStartAtChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onEndAtChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onTimezoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onLocationNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function EventDetailsStep({
    title,
    titleError,
    startAt,
    endAt,
    scheduleError,
    startAtMin,
    startAtMax,
    endAtMin,
    timezone,
    locationName,
    onTitleChange,
    onStartAtChange,
    onEndAtChange,
    onTimezoneChange,
    onLocationNameChange,
}: EventDetailsStepProps) {
    const t = useTranslations('CreateEventPage');

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Form Fields */}
            <div className="space-y-4">
                <FormFieldLabel label={t('fields.title')} required>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={onTitleChange}
                        placeholder={t('placeholders.title')}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    {titleError && <span className="text-xs text-rose-500">{titleError}</span>}
                </FormFieldLabel>

                {/* Schedule */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormFieldLabel label={t('fields.startAt')} required>
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
                </div>
                {scheduleError && <p className="text-xs text-rose-500">{scheduleError}</p>}

                <FormFieldLabel label={t('fields.timezone')} required>
                    <input
                        type="text"
                        required
                        value={timezone}
                        onChange={onTimezoneChange}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>

                {/* Location */}
                <FormFieldLabel label={t('fields.locationName')} optional>
                    <input
                        type="text"
                        value={locationName}
                        onChange={onLocationNameChange}
                        placeholder={t('placeholders.locationName')}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>
            </div>
        </div>
    );
}
