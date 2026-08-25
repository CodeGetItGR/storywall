'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import type { EventTypeConvention } from '@/lib/api/types';
import type { EventEndPreset } from '@/lib/eventEndPresets';

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
    endAtPresets: EventEndPreset[];
    timezone: string;
    timezoneOptions: string[];
    locationName: string;
    onTitleChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onStartAtChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onEndAtChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onSelectEndAtPresetAction: (value: string) => void;
    onTimezoneChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
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
    endAtPresets,
    timezone,
    timezoneOptions,
    locationName,
    onTitleChangeAction,
    onStartAtChangeAction,
    onEndAtChangeAction,
    onSelectEndAtPresetAction,
    onTimezoneChangeAction,
    onLocationNameChangeAction,
}: EventDetailsStepProps) {
    const t = useTranslations('CreateEventPage');
    const voice = useEventTypeVoice(eventType);

    const handleEndAtPresetClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const value = event.currentTarget.dataset.value;
            if (value) onSelectEndAtPresetAction(value);
        },
        [onSelectEndAtPresetAction]
    );

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
                    <FormFieldLabel label={t('fields.endAt')}>
                        <input
                            type="datetime-local"
                            required
                            value={endAt}
                            onChange={onEndAtChangeAction}
                            min={endAtMin}
                            className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                        {/* End Presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {endAtPresets.map((preset) => (
                                <button
                                    key={preset.key}
                                    type="button"
                                    data-value={preset.value ?? undefined}
                                    disabled={!preset.value}
                                    onClick={handleEndAtPresetClick}
                                    className="rounded-full bg-surface-muted/70 px-2.5 py-1 text-[11px] font-medium text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {t(`endAtPresets.${preset.labelKey}`)}
                                </button>
                            ))}
                        </div>
                    </FormFieldLabel>
                </div>
                {scheduleError && <p className="text-xs text-rose-500">{scheduleError}</p>}

                <FormFieldLabel label={t('fields.timezone')} required>
                    <span className="relative">
                        <select
                            required
                            value={timezone}
                            onChange={onTimezoneChangeAction}
                            className="w-full appearance-none rounded-xl bg-surface-muted py-3 pr-12 pl-4 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/30"
                        >
                            {timezoneOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-muted"
                        />
                    </span>
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

                {/* Creation Hint */}
                <p className="pt-1 text-xs leading-relaxed text-ink-muted">{t('detailsHint')}</p>
            </div>
        </div>
    );
}
