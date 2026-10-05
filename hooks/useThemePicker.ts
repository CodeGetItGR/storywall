'use client';

import { useCallback } from 'react';

import { useEventThemePresets, useSetEventTheme } from '@/hooks/useEventTheme';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';

// The host's theme choice in event settings. Only while the plan includes the
// theme module. A pick applies at once with its own PUT, separate from the
// settings form's Save. The current pick is matched by key: the event carries
// the preset's key, not its id.
export function useThemePicker(event: EventDetailResponseDto, canWrite: boolean) {
    const available = isModuleAvailable(event.modules, 'theme');
    const presets = useEventThemePresets(available ? event.id : null);
    const setTheme = useSetEventTheme(event.id);
    const { mutate, isPending } = setTheme;

    const select = useCallback(
        (presetId: string | null) => {
            if (!canWrite || isPending) return;
            mutate(presetId);
        },
        [canWrite, isPending, mutate],
    );

    return {
        available,
        presets: presets.data ?? [],
        isLoading: presets.isLoading,
        loadError: presets.error,
        selectedKey: event.theme?.presetKey ?? null,
        isSaving: isPending,
        // Meaningful only while isSaving: the preset id being saved, or null for "No theme".
        savingPresetId: isPending ? (setTheme.variables ?? null) : null,
        saveError: setTheme.error,
        disabled: !canWrite || isPending,
        select,
    };
}
