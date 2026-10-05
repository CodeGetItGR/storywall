'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useId, useState } from 'react';

import { ThemePresetOption } from '@/components/manage/ThemePresetOption';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useThemePicker } from '@/hooks/useThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

type Option = {
    id: string;
    presetId: string | null | undefined;
    label: string;
    backgroundColor: string | null;
    illustrationUrl: string | null;
    selected: boolean;
};

// `showHeading` is off in the Theme section, whose section title already names it.
export function ThemePicker({
    event,
    canWrite,
    showHeading = true,
}: {
    event: EventDetailResponseDto;
    canWrite: boolean;
    showHeading?: boolean;
}) {
    const t = useTranslations('ManagePage.settings.theme');
    const toErrorMessage = useApiErrorMessage();
    const localizedText = useLocalizedText();
    const picker = useThemePicker(event, canWrite);
    const headingId = useId();
    // The option the host last moved focus to; the tab stop follows it (roving tabindex).
    const [focusedId, setFocusedId] = useState<string | null>(null);

    if (!picker.available) return null;

    // The applied theme leads when it is no longer offered, so the host can see what is on the event.
    const options: Option[] = [
        { id: 'none', presetId: null, label: t('none'), backgroundColor: null, illustrationUrl: null, selected: picker.selectedKey === null },
        ...(picker.staleTheme
            ? [
                  {
                      id: 'current',
                      presetId: undefined,
                      label: t('current'),
                      backgroundColor: picker.staleTheme.backgroundColor,
                      illustrationUrl: picker.staleTheme.illustrationUrl,
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
            selected: picker.selectedKey === preset.key,
        })),
    ];
    const tabbableId =
        (options.some((option) => option.id === focusedId) ? focusedId : options.find((option) => option.selected)?.id) ?? options[0].id;
    const status = picker.isSaving ? t('saving') : picker.isSaved ? t('saved') : '';

    function handleKeyDown(keyEvent: KeyboardEvent<HTMLDivElement>) {
        const { key } = keyEvent;
        const radios = Array.from(keyEvent.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
        const current = radios.indexOf(document.activeElement as HTMLElement);
        if (current === -1) return;
        let next: number;
        if (NEXT_KEYS.includes(key)) next = (current + 1) % radios.length;
        else if (PREVIOUS_KEYS.includes(key)) next = (current - 1 + radios.length) % radios.length;
        else if (key === 'Home') next = 0;
        else if (key === 'End') next = radios.length - 1;
        else return;
        keyEvent.preventDefault();
        radios[next].focus();
    }

    return (
        <section className="mb-6">
            {/* Heading */}
            <h2 id={headingId} className={showHeading ? 'text-xs font-semibold tracking-wide text-ink-muted uppercase' : 'sr-only'}>
                {t('label')}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{t('hint')}</p>

            {/* Loading / error */}
            {picker.isLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {picker.loadError && <p className="mt-4 text-xs text-rose-500">{toErrorMessage(picker.loadError)}</p>}

            {/* Options */}
            {!picker.isLoading && !picker.loadError && (
                <div role="radiogroup" aria-labelledby={headingId} onKeyDown={handleKeyDown} className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {options.map((option) => (
                        <ThemePresetOption
                            key={option.id}
                            optionId={option.id}
                            presetId={option.presetId}
                            label={option.label}
                            backgroundColor={option.backgroundColor}
                            illustrationUrl={option.illustrationUrl}
                            selected={option.selected}
                            saving={option.presetId !== undefined && picker.isSaving && picker.savingPresetId === option.presetId}
                            disabled={picker.disabled}
                            tabbable={option.id === tabbableId}
                            onSelectAction={picker.select}
                            onFocusAction={setFocusedId}
                        />
                    ))}
                </div>
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
