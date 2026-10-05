import type { ThemePresetDto } from '@/lib/api/types';
import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// Every step, in order. The theme step is shown only when themeStepAvailable says so.
export const CREATE_EVENT_STEPS: CreateEventStep[] = ['type', 'plan', 'details', 'theme', 'overview'];

export function parseCreateEventStep(value: string | null): CreateEventStep {
    return CREATE_EVENT_STEPS.find((step) => step === value) ?? 'type';
}

// The steps the host walks through: the theme step only when there is something to pick.
export function visibleCreateEventSteps(themeStepAvailable: boolean): CreateEventStep[] {
    return themeStepAvailable ? CREATE_EVENT_STEPS : CREATE_EVENT_STEPS.filter((step) => step !== 'theme');
}

// Whether to offer the theme step: the chosen plan lists the theme module and the type
// has presets. Kept while the list loads so the step doesn't flicker away; a failed
// load skips it (the host can still pick a theme from the draft later).
export function isThemeStepAvailable({
    planHasTheme,
    isLoading,
    presets,
}: {
    planHasTheme: boolean;
    isLoading: boolean;
    presets: ThemePresetDto[] | undefined;
}): boolean {
    return planHasTheme && (isLoading || (presets?.length ?? 0) > 0);
}

// The pick to send: only while it is still among the offered presets (a plan or type
// change can drop it), else no theme.
export function effectiveThemePresetId(presetId: string | null, presets: ThemePresetDto[] | undefined): string | null {
    return presetId && presets?.some((preset) => preset.id === presetId) ? presetId : null;
}
