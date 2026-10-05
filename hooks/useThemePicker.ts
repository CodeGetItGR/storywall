'use client';

import { useCallback, useRef } from 'react';

import { useEventThemePresets, useSetEventTheme } from '@/hooks/useEventTheme';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventEnded, isModuleAvailable } from '@/lib/eventLifecycle';

// GET theme-presets answers 5144 once the event has ended and 5012 when the
// plan has no theme module. Neither is a failure worth showing: the picker just isn't offered.
const PICKER_UNAVAILABLE_CODES: ReadonlyArray<number | string | undefined> = [ERROR_CODES.EVENT_ENDED, ERROR_CODES.MODULE_NOT_AVAILABLE];

// The host's theme choice in event settings. Only while the plan includes the
// theme module and the event hasn't ended (the server answers 5144 after that).
// A pick applies at once with its own PUT, separate from the settings form's Save. The current pick is matched by key: the event carries
// the preset's key, not its id.
export function useThemePicker(event: EventDetailResponseDto, canWrite: boolean) {
    const available = isModuleAvailable(event.modules, 'theme') && !isEventEnded(event);
    const presets = useEventThemePresets(available ? event.id : null);
    const setTheme = useSetEventTheme(event.id);
    const { mutate, isPending } = setTheme;
    // Set synchronously: two clicks in one tick both see isPending false.
    const inFlight = useRef(false);
    const quiet = PICKER_UNAVAILABLE_CODES.includes(getErrorCode(presets.error));

    const select = useCallback(
        (presetId: string | null) => {
            if (!canWrite || isPending || inFlight.current) return;
            inFlight.current = true;
            mutate(presetId, {
                onSettled: () => {
                    inFlight.current = false;
                },
            });
        },
        [canWrite, isPending, mutate],
    );

    return {
        available: available && !quiet,
        presets: presets.data ?? [],
        isLoading: presets.isLoading,
        loadError: quiet ? null : presets.error,
        selectedKey: event.theme?.presetKey ?? null,
        // What is applied when it is no longer among the offered presets (archived,
        // or no longer offered for the event); null while the list is still loading.
        staleTheme: presets.data && event.theme && !presets.data.some((preset) => preset.key === event.theme!.presetKey) ? event.theme : null,
        isSaving: isPending,
        isSaved: setTheme.isSuccess,
        // Meaningful only while isSaving: the preset id being saved, or null for "No theme".
        savingPresetId: isPending ? (setTheme.variables ?? null) : null,
        saveError: setTheme.error,
        disabled: !canWrite || isPending,
        select,
    };
}
