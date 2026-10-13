'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ThemePresetRadioGroup } from '@/components/manage/ThemePresetRadioGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useThemeRadioOptions } from '@/hooks/useThemeRadioOptions';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The creation form's optional theme step. Nothing is saved here: the pick goes out with
// the create request (or a PUT /theme when the draft already exists).
export function EventThemeStep() {
    const t = useTranslations('ManagePage.settings.theme');
    const tSteps = useTranslations('CreateEventPage.steps');
    const toErrorMessage = useApiErrorMessage();
    const headingId = useId();
    const { title, selectedEventType, themePresets, isThemePresetsLoading, themePresetsError, selectedThemePresetId, onSelectThemePreset, error } =
        useCreateEventForm();
    const themeName = useModuleCopy(selectedEventType)('theme').name;

    // The cards preview the title from the details step; without one they show just the theme name.
    const previewTitle = title.trim() || undefined;
    const options = useThemeRadioOptions(themePresets, selectedThemePresetId);

    return (
        <section>
            <h3 id={headingId} className="sr-only">
                {themeName}
            </h3>
            <p className="text-sm text-ink-muted">{tSteps('themeHint')}</p>

            {isThemePresetsLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {!isThemePresetsLoading && Boolean(themePresetsError) && (
                <p className="mt-4 text-xs text-rose-500">{toErrorMessage(themePresetsError)}</p>
            )}
            {!isThemePresetsLoading && !themePresetsError && (
                <ThemePresetRadioGroup
                    options={options}
                    labelledBy={headingId}
                    disabled={false}
                    size="large"
                    previewTitle={previewTitle}
                    onSelectAction={onSelectThemePreset}
                />
            )}

            {error && (
                <p role="alert" className="mt-3 text-xs text-rose-500">
                    {error}
                </p>
            )}
        </section>
    );
}
