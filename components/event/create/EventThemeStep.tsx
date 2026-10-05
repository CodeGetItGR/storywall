'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The creation form's optional theme step. Nothing is saved here: the pick goes out with
// the create request (or a PUT /theme when the draft already exists).
export function EventThemeStep() {
    const t = useTranslations('ManagePage.settings.theme');
    const tSteps = useTranslations('CreateEventPage.steps');
    const toErrorMessage = useApiErrorMessage();
    const localizedText = useLocalizedText();
    const headingId = useId();
    const { themePresets, isThemePresetsLoading, themePresetsError, selectedThemePresetId, onSelectThemePreset, error } = useCreateEventForm();

    const options: ThemeRadioOption[] = [
        { id: 'none', presetId: null, label: t('none'), backgroundColor: null, illustrationUrl: null, selected: selectedThemePresetId === null },
        ...themePresets.map((preset) => ({
            id: preset.id,
            presetId: preset.id,
            label: localizedText(preset.name, preset.key),
            backgroundColor: preset.backgroundColor,
            illustrationUrl: preset.illustrationUrl,
            selected: selectedThemePresetId === preset.id,
        })),
    ];

    return (
        <section>
            <h3 id={headingId} className="sr-only">
                {t('label')}
            </h3>
            <p className="text-sm text-ink-muted">{tSteps('themeHint')}</p>

            {isThemePresetsLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {!isThemePresetsLoading && Boolean(themePresetsError) && (
                <p className="mt-4 text-xs text-rose-500">{toErrorMessage(themePresetsError)}</p>
            )}
            {!isThemePresetsLoading && !themePresetsError && (
                <ThemePresetRadioGroup options={options} labelledBy={headingId} disabled={false} size="large" onSelectAction={onSelectThemePreset} />
            )}

            {error && (
                <p role="alert" className="mt-3 text-xs text-rose-500">
                    {error}
                </p>
            )}
        </section>
    );
}
