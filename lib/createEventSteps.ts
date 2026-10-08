import type { EventTypeConvention, ThemePresetDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
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

// Every wizard entry carries the id of the run it belongs to, so a run that went
// to checkout can be told apart from a fresh one started later in the same tab.
export const CREATE_EVENT_RUN_PARAM = 'run';

// The event type a link opens the wizard on, as an event type slug (see lib/eventTypeSlug.ts).
export const CREATE_EVENT_TYPE_PARAM = 'type';
// The plan (its code) and duration (its coverage option id) a link opens the wizard with.
export const CREATE_EVENT_PLAN_PARAM = 'plan';
export const CREATE_EVENT_OPTION_PARAM = 'option';

// The wizard's event type among the enabled ones: the one picked, else the one the link asked for,
// else WEDDING, else the first. WEDDING while the enabled types haven't loaded.
export function resolveCreateEventType(
    enabledTypes: readonly EventTypeConvention[],
    picked: EventTypeConvention | null,
    requestedSlug: string | null,
): EventTypeConvention {
    return (
        enabledTypes.find((type) => type === picked) ??
        enabledTypes.find((type) => eventTypeSlug(type) === requestedSlug) ??
        enabledTypes.find((type) => type === 'WEDDING') ??
        enabledTypes[0] ??
        'WEDDING'
    );
}

export function newCreateEventRunId(): string {
    return Math.random().toString(36).slice(2, 10);
}

// The draft a run went to checkout with. `returned` is set once the host has
// come back from checkout and been sent to the draft.
type CreateEventCheckout = {
    eventId: string;
    returned: boolean;
};

function createEventCheckoutKey(run: string): string {
    return `storywall.createEventCheckout.${run}`;
}

export function rememberCreateEventCheckout(run: string, eventId: string, returned = false): void {
    try {
        const value: CreateEventCheckout = { eventId, returned };
        window.sessionStorage.setItem(createEventCheckoutKey(run), JSON.stringify(value));
    } catch {
        // Storage blocked: Back from checkout falls back to the wizard's own start.
    }
}

export function readCreateEventCheckout(run: string): CreateEventCheckout | null {
    try {
        const value = window.sessionStorage.getItem(createEventCheckoutKey(run));
        if (!value) return null;
        const parsed = JSON.parse(value) as Partial<CreateEventCheckout>;
        return typeof parsed.eventId === 'string' ? { eventId: parsed.eventId, returned: parsed.returned === true } : null;
    } catch {
        return null;
    }
}
