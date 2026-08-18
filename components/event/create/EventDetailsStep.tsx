'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';

const EVENT_TYPES: EventTypeConvention[] = ['WEDDING', 'BAPTISM', 'BIRTHDAY', 'CONFERENCE'];

type EventDetailsStepProps = {
    selectedPlan?: PlanTierResponseDto;
    title: string;
    titleError?: string | null;
    eventType: EventTypeConvention;
    startAt: string;
    endAt: string;
    timezone: string;
    locationName: string;
    onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onEventTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    onStartAtChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onEndAtChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onTimezoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onLocationNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onBack: () => void;
};

export function EventDetailsStep({
    selectedPlan,
    title,
    titleError,
    eventType,
    startAt,
    endAt,
    timezone,
    locationName,
    onTitleChange,
    onEventTypeChange,
    onStartAtChange,
    onEndAtChange,
    onTimezoneChange,
    onLocationNameChange,
    onBack,
}: EventDetailsStepProps) {
    const t = useTranslations('CreateEventPage');

    return (
        <div className="flex flex-col gap-4">
            <button type="button" onClick={onBack} className="self-start text-xs font-semibold text-ink-muted hover:text-ink">
                {t('backToAddons')}
            </button>
            {selectedPlan && (
                <div className="rounded-xl bg-primary-light px-4 py-3 text-sm text-primary-dark">
                    <p>{t('selectedPlan', { plan: selectedPlan.name })}</p>
                </div>
            )}
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

            <FormFieldLabel label={t('fields.eventType')}>
                <div className="relative">
                    <select
                        value={eventType}
                        onChange={onEventTypeChange}
                        className="w-full appearance-none bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition pr-10"
                    >
                        {EVENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {t(`eventTypes.${type}`)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                </div>
            </FormFieldLabel>

            <div className="grid gap-3 sm:grid-cols-2">
                <FormFieldLabel label={t('fields.startAt')} required>
                    <input
                        type="datetime-local"
                        required
                        value={startAt}
                        onChange={onStartAtChange}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>
                <FormFieldLabel label={t('fields.endAt')} required>
                    <input
                        type="datetime-local"
                        required
                        value={endAt}
                        onChange={onEndAtChange}
                        className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                </FormFieldLabel>
            </div>

            <FormFieldLabel label={t('fields.timezone')} required>
                <input
                    type="text"
                    required
                    value={timezone}
                    onChange={onTimezoneChange}
                    className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
            </FormFieldLabel>

            <FormFieldLabel label={t('fields.locationName')} optional>
                <input
                    type="text"
                    value={locationName}
                    onChange={onLocationNameChange}
                    placeholder={t('placeholders.locationName')}
                    className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
            </FormFieldLabel>

            <button
                type="submit"
                disabled={!title.trim() || !startAt || !endAt}
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {t('continueToOverview')}
            </button>
        </div>
    );
}
