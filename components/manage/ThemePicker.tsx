'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useThemePicker } from '@/hooks/useThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';

// `showHeading` is off in the Theme section, whose section title already names it.
export function ThemePicker({ event, canWrite, showHeading = true }: { event: EventDetailResponseDto; canWrite: boolean; showHeading?: boolean }) {
    const t = useTranslations('ManagePage.settings.theme');
    const toErrorMessage = useApiErrorMessage();
    const localizedText = useLocalizedText();
    const themeName = useModuleCopy(event.eventType)('theme').name;
    const picker = useThemePicker(event, canWrite);
    const headingId = useId();

    if (!picker.available) return null;

    // The applied theme leads when it is no longer offered, so the host can see what is on the event.
    const options: ThemeRadioOption[] = [
        {
            id: 'none',
            presetId: null,
            label: t('none'),
            backgroundColor: null,
            illustrationUrl: null,
            titleColor: null,
            headingFont: null,
            selected: picker.selectedKey === null,
        },
        ...(picker.staleTheme
            ? [
                  {
                      id: 'current',
                      presetId: undefined,
                      label: t('current'),
                      backgroundColor: picker.staleTheme.backgroundColor,
                      illustrationUrl: picker.staleTheme.illustrationUrl,
                      titleColor: picker.staleTheme.titleColor,
                      headingFont: picker.staleTheme.headingFont,
                      selected: true,
                  },
              ]
            : []),
        ...picker.presets.map((preset) => ({
            id: preset.id,
            presetId: preset.id,
            label: localizedText(preset.name, preset.key),
            backgroundColor: preset.backgroundColor,
            illustrationUrl: preset.illustrationUrl,
            titleColor: preset.titleColor,
            headingFont: preset.headingFont,
            selected: picker.selectedKey === preset.key,
        })),
    ];
    const status = picker.isSaving ? t('saving') : picker.isSaved ? t('saved') : '';

    return (
        <section className="mb-6">
            {/* Heading */}
            <h2 id={headingId} className={showHeading ? 'text-xs font-semibold tracking-wide text-ink-muted uppercase' : 'sr-only'}>
                {themeName}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t('hint')}</p>

            {/* Loading / error */}
            {picker.isLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {picker.loadError && <p className="mt-4 text-xs text-rose-500">{toErrorMessage(picker.loadError)}</p>}

            {/* Options */}
            {!picker.isLoading && !picker.loadError && (
                <ThemePresetRadioGroup
                    options={options}
                    labelledBy={headingId}
                    disabled={picker.disabled}
                    savingPresetId={picker.isSaving ? picker.savingPresetId : undefined}
                    onSelectAction={picker.select}
                />
            )}

            {/* Save status, announced politely; a failure is an alert */}
            <p role="status" className="sr-only">
                {status}
            </p>
            {picker.saveError && (
                <p role="alert" className="mt-3 text-xs text-rose-500">
                    {toErrorMessage(picker.saveError)}
                </p>
            )}
        </section>
    );
}
