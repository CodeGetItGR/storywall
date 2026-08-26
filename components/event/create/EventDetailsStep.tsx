'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention } from '@/lib/api/types';

type EventDetailsStepProps = {
    eventType: EventTypeConvention;
    title: string;
    titleError?: string | null;
    startAt: string;
    scheduleError?: string | null;
    startAtMin: string;
    timezone: string;
    timezoneError?: string | null;
    timezoneOptions: string[];
    onTitleChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onStartAtChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onTimezoneChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function EventDetailsStep({
    eventType,
    title,
    titleError,
    startAt,
    scheduleError,
    startAtMin,
    timezone,
    timezoneError,
    timezoneOptions,
    onTitleChangeAction,
    onStartAtChangeAction,
    onTimezoneChangeAction,
}: EventDetailsStepProps) {
    const t = useTranslations('CreateEventPage');
    const voice = useEventTypeVoice(eventType);
    const labels = useCreateEventFieldLabels(eventType);

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Form Fields */}
            <div className="space-y-4">
                <FormFieldLabel label={labels.title} required>
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
                <FormFieldLabel label={labels.startAt} required>
                    <input
                        type="datetime-local"
                        required
                        value={startAt}
                        onChange={onStartAtChangeAction}
                        min={startAtMin}
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
                    onChangeAction={onTimezoneChangeAction}
                />
                {/* Creation Hint */}
                <p className="pt-1 text-xs leading-relaxed text-ink-muted">{t('detailsHint')}</p>
            </div>
        </div>
    );
}
