'use client';

import { useTranslations } from 'next-intl';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { useThemePicker } from '@/hooks/useThemePicker';
import type { EventThemeDto } from '@/lib/api/types';

// The "No theme" card, drawn in `look`: the wall look picking it gives (null: the plain look).
export function useNoThemeCard(look: EventThemeDto | null, selected: boolean): ThemeRadioOption {
    const t = useTranslations('ManagePage.settings.theme');
    return {
        id: 'none',
        presetId: null,
        label: t('none'),
        backgroundColor: look?.backgroundColor ?? null,
        illustrationUrl: look?.illustrationUrl ?? null,
        titleColor: look?.titleColor ?? null,
        headingFont: look?.headingFont ?? null,
        selected,
    };
}

// "No theme", the applied theme when it is no longer offered, and every preset, as theme cards.
// `checkable` is off while the feed is on a Save my date theme: then no wall card is the current one,
// and the no-longer-offered one, which can't be picked again, is left out.
export function useWallThemeOptions(picker: ReturnType<typeof useThemePicker>, { checkable }: { checkable: boolean }): ThemeRadioOption[] {
    const t = useTranslations('ManagePage.settings.theme');
    const localizedText = useLocalizedText();
    const stale = checkable ? picker.staleTheme : null;
    const none = useNoThemeCard(null, checkable && picker.selectedKey === null);

    return [
        none,
        // The applied theme leads when it is no longer offered, so the host can see what is on the event.
        ...(stale
            ? [
                  {
                      id: 'current',
                      presetId: undefined,
                      label: t('current'),
                      backgroundColor: stale.backgroundColor,
                      illustrationUrl: stale.illustrationUrl,
                      titleColor: stale.titleColor,
                      headingFont: stale.headingFont,
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
            selected: checkable && picker.selectedKey === preset.key,
        })),
    ];
}
