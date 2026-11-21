'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';

type ThemePickerViewProps = {
    heading: string;
    // Off in the Theme section, whose section title already names it.
    showHeading: boolean;
    isLoading: boolean;
    loadError: unknown;
    options: ThemeRadioOption[];
    disabled: boolean;
    savingPresetId: string | null | undefined;
    previewTitle: string | undefined;
    isSaving: boolean;
    isSaved: boolean;
    saveError: unknown;
    onSelectAction: (choice: string | null) => void;
};

// The theme grid with its heading, loading and save states. Shared by the wall-only picker and the
// one that also lists Save my date themes.
export function ThemePickerView({
    heading,
    showHeading,
    isLoading,
    loadError,
    options,
    disabled,
    savingPresetId,
    previewTitle,
    isSaving,
    isSaved,
    saveError,
    onSelectAction,
}: ThemePickerViewProps) {
    const t = useTranslations('ManagePage.settings.theme');
    const toErrorMessage = useApiErrorMessage();
    const headingId = useId();
    const status = isSaving ? t('saving') : isSaved ? t('saved') : '';

    return (
        <section className="mb-6">
            {/* Heading */}
            <h2 id={headingId} className={showHeading ? 'text-xs font-semibold tracking-wide text-ink-muted uppercase' : 'sr-only'}>
                {heading}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t('hint')}</p>

            {/* Loading / error */}
            {isLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {Boolean(loadError) && <p className="mt-4 text-xs text-rose-500">{toErrorMessage(loadError)}</p>}

            {/* Options */}
            {!isLoading && !loadError && (
                <ThemePresetRadioGroup
                    options={options}
                    labelledBy={headingId}
                    disabled={disabled}
                    savingPresetId={savingPresetId}
                    previewTitle={previewTitle}
                    onSelectAction={onSelectAction}
                />
            )}

            {/* Save status, announced politely; a failure is an alert */}
            <p role="status" className="sr-only">
                {status}
            </p>
            {Boolean(saveError) && (
                <p role="alert" className="mt-3 text-xs text-rose-500">
                    {toErrorMessage(saveError)}
                </p>
            )}
        </section>
    );
}
