'use client';

import { useCallback } from 'react';

import { useEventThemePresets, useSetEventTheme } from '@/hooks/useEventTheme';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';

// GET theme-presets answers 5144 once the event has ended and 5012 when the
// plan has no theme module. Neither is a failure worth showing: the picker just isn't offered.
const PICKER_UNAVAILABLE_CODES: ReadonlyArray<number | string | undefined> = [ERROR_CODES.EVENT_ENDED, ERROR_CODES.MODULE_NOT_AVAILABLE];

// The host's theme choice in event settings. Only while the plan includes the
// theme module. A pick applies at once with its own PUT, separate from the
// settings form's Save. The current pick is matched by key: the event carries
// the preset's key, not its id.
export function useThemePicker(event: EventDetailResponseDto, canWrite: boolean) {
    const available = isModuleAvailable(event.modules, 'theme');
    const presets = useEventThemePresets(available ? event.id : null);
    const setTheme = useSetEventTheme(event.id);
    const { mutate, isPending } = setTheme;
    const quiet = PICKER_UNAVAILABLE_CODES.includes(getErrorCode(presets.error));

    const select = useCallback(
        (presetId: string | null) => {
            if (!canWrite || isPending) return;
            mutate(presetId);
        },
        [canWrite, isPending, mutate],
    );

    return {
        available: available && !quiet,
        presets: presets.data ?? [],
        isLoading: presets.isLoading,
        loadError: quiet ? null : presets.error,
        selectedKey: event.theme?.presetKey ?? null,
        isSaving: isPending,
        // Meaningful only while isSaving: the preset id being saved, or null for "No theme".
        savingPresetId: isPending ? (setTheme.variables ?? null) : null,
        saveError: setTheme.error,
        disabled: !canWrite || isPending,
        select,
    };
}
