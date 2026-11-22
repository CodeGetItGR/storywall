'use client';

import { ThemePickerView } from '@/components/manage/ThemePickerView';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themePreviewTitle } from '@/lib/eventTheme';

// The wall themes only: the draft Overview's theme step, and the Theme section while the feed editor
// is off. `showHeading` is off in the Theme section, whose section title already names it.
export function ThemePicker({ event, canWrite, showHeading = true }: { event: EventDetailResponseDto; canWrite: boolean; showHeading?: boolean }) {
    const themeName = useModuleCopy(event.eventType)('theme').name;
    const picker = useThemePicker(event, canWrite);
    const options = useWallThemeOptions(picker, { checkable: true });

    if (!picker.available) return null;

    return (
        <ThemePickerView
            heading={themeName}
            showHeading={showHeading}
            isLoading={picker.isLoading}
            loadError={picker.loadError}
            options={options}
            disabled={picker.disabled}
            savingPresetId={picker.isSaving ? picker.savingPresetId : undefined}
            previewTitle={themePreviewTitle(event.title)}
            isSaving={picker.isSaving}
            isSaved={picker.isSaved}
            saveError={picker.saveError}
            onSelectAction={picker.select}
        />
    );
}
