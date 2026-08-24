'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention } from '@/lib/api/types';

type EventDetailsStepProps = {
    eventType: EventTypeConvention;
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
    onTitleChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onStartAtChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onEndAtChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onTimezoneChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onLocationNameChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function EventDetailsStep({
    eventType,
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
    onTitleChangeAction,
    onStartAtChangeAction,
    onEndAtChangeAction,
    onTimezoneChangeAction,
    onLocationNameChangeAction,
}: EventDetailsStepProps) {
    const t = useTranslations('CreateEventPage');
    const voice = useEventTypeVoice(eventType);

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Form Fields */}
            <div className="space-y-4">
                <FormFieldLabel label={t('fields.title')} required>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={onTitleChangeAction}
                        placeholder={voice.titlePlaceholder}
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
                            onChange={onStartAtChangeAction}
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
                            onChange={onEndAtChangeAction}
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
                        onChange={onTimezoneChangeAction}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>

                {/* Location */}
                <FormFieldLabel label={t('fields.locationName')} optional>
                    <input
                        type="text"
                        value={locationName}
                        onChange={onLocationNameChangeAction}
                        placeholder={voice.locationPlaceholder}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>
            </div>
        </div>
    );
}
