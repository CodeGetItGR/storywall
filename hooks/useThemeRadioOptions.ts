'use client';

import { useTranslations } from 'next-intl';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { ThemePresetDto } from '@/lib/api/types';

// "No theme" followed by every preset, for a theme picker that hasn't saved anything yet.
export function useThemeRadioOptions(presets: ThemePresetDto[], selectedPresetId: string | null): ThemeRadioOption[] {
    const t = useTranslations('ManagePage.settings.theme');
    const localizedText = useLocalizedText();

    return [
        {
            id: 'none',
            presetId: null,
            label: t('none'),
            backgroundColor: null,
            illustrationUrl: null,
            titleColor: null,
            headingFont: null,
            selected: selectedPresetId === null,
        },
        ...presets.map((preset) => ({
            id: preset.id,
            presetId: preset.id,
            label: localizedText(preset.name, preset.key),
            backgroundColor: preset.backgroundColor,
            illustrationUrl: preset.illustrationUrl,
            titleColor: preset.titleColor,
            headingFont: preset.headingFont,
            selected: selectedPresetId === preset.id,
        })),
    ];
}
