'use client';

import { useTranslations } from 'next-intl';

import { ThemePresetOption } from '@/components/manage/ThemePresetOption';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useThemePicker } from '@/hooks/useThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';

export function ThemePicker({ event, canWrite }: { event: EventDetailResponseDto; canWrite: boolean }) {
    const t = useTranslations('ManagePage.settings.theme');
    const toErrorMessage = useApiErrorMessage();
    const localizedText = useLocalizedText();
    const picker = useThemePicker(event, canWrite);

    if (!picker.available) return null;

    return (
        <section className="mb-6" aria-labelledby="event-theme-heading">
            {/* Heading */}
            <h2 id="event-theme-heading" className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {t('label')}
            </h2>

            {/* Loading / error */}
            {picker.isLoading && <LoadingState label={t('loading')} className="mt-2 justify-start" />}
            {picker.loadError && <p className="mt-2 text-xs text-rose-500">{toErrorMessage(picker.loadError)}</p>}

            {/* Options */}
            {!picker.isLoading && !picker.loadError && (
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    <ThemePresetOption
                        presetId={null}
                        label={t('none')}
                        backgroundColor={null}
                        illustrationUrl={null}
                        selected={picker.selectedKey === null}
                        saving={picker.isSaving && picker.savingPresetId === null}
                        disabled={picker.disabled}
                        onSelectAction={picker.select}
                    />
                    {picker.presets.map((preset) => (
                        <ThemePresetOption
                            key={preset.id}
                            presetId={preset.id}
                            label={localizedText(preset.name, preset.key)}
                            backgroundColor={preset.backgroundColor}
                            illustrationUrl={preset.illustrationUrl}
                            selected={picker.selectedKey === preset.key}
                            saving={picker.isSaving && picker.savingPresetId === preset.id}
                            disabled={picker.disabled}
                            onSelectAction={picker.select}
                        />
                    ))}
                </div>
            )}

            {/* Save error */}
            {picker.saveError && <p className="mt-1.5 text-xs text-rose-500">{toErrorMessage(picker.saveError)}</p>}
        </section>
    );
}
