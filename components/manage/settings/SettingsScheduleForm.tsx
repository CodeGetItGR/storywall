'use client';

import { useTranslations } from 'next-intl';

import { settingsHintClass, settingsInputClass, settingsLabelClass } from '@/components/manage/settings/settingsFieldStyles';
import { SettingsSaveButton } from '@/components/manage/settings/SettingsSaveButton';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useSettingsScheduleForm } from '@/hooks/useSettingsScheduleForm';
import type { EventDetailResponseDto } from '@/lib/api/types';

// The date editor: start (with today's hint) and end (with the end presets).
export function SettingsScheduleForm({ event, label, onSavedAction }: { event: EventDetailResponseDto; label: string; onSavedAction: () => void }) {
    const t = useTranslations('ManagePage.settings');
    const tCreateEvent = useTranslations('CreateEventPage');
    const form = useSettingsScheduleForm({ event, onSaved: onSavedAction });

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
            {/* Start */}
            <FormFieldLabel label={label} required labelClassName={settingsLabelClass}>
                <DateTimeField
                    required
                    value={form.startAt}
                    onChange={form.handleStartAtChange}
                    disabled={form.eventHasStarted}
                    min={form.startAtMin}
                    max={form.startAtMax}
                    inputClassName={settingsInputClass}
                />
                <p className={settingsHintClass}>{form.startHint}</p>
            </FormFieldLabel>

            {/* End */}
            <FormFieldLabel label={t('fields.endAt')} required labelClassName={settingsLabelClass}>
                <DateTimeField required value={form.endAt} onChange={form.handleEndAtChange} min={form.endAtMin} inputClassName={settingsInputClass} />
                {/* End presets */}
                <div className="flex flex-wrap gap-1.5">
                    {form.endAtPresets.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            data-value={preset.value ?? undefined}
                            disabled={!preset.value}
                            onClick={form.handleEndAtPresetClick}
                            className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-muted transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {tCreateEvent(`endAtPresets.${preset.labelKey}`)}
                        </button>
                    ))}
                </div>
            </FormFieldLabel>
            {form.scheduleError && <p className="text-xs text-rose-500">{form.scheduleError}</p>}

            {/* Save */}
            <SettingsSaveButton canSave={form.canSave} isSaving={form.isSaving} errorMessage={form.errorMessage} />
        </form>
    );
}
