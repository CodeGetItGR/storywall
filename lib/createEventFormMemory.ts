import type { EventTypeConvention } from '@/lib/api/types';
import type { GiftDetailsInput } from '@/lib/gift';

// What a host filled in on the create form, kept per wizard run so a reload doesn't lose it. In
// sessionStorage: it leaves with the tab, and is cleared when the run goes to checkout. The consent
// boxes are left out on purpose, so they are always ticked on the page that is showing. Every access
// is guarded, since storage can be blocked.

const VERSION = 1;

export type SavedCreateEventForm = {
    eventType: EventTypeConvention | null;
    selectedPlanCode: string;
    durationPicks: Record<string, string>;
    title: string;
    startAt: string;
    timezone: string;
    locationName: string;
    locationAddress: string;
    mapsUrl: string;
    themePresetId: string | null;
    checkoutCode: string;
    // The draft this run already created, so a reload doesn't create a second one.
    draftEventId: string | null;
    draftSelection: { planCode: string; optionId: string; startAt: string; themePresetId: string | null } | null;
    gift: { isGift: boolean; details: GiftDetailsInput };
};

function storageKey(run: string): string {
    return `storywall.createEventForm.${run}`;
}

export function readSavedCreateEventForm(run: string | null): SavedCreateEventForm | null {
    if (!run) return null;
    try {
        const saved = JSON.parse(window.sessionStorage.getItem(storageKey(run)) ?? 'null') as { version?: unknown; form?: SavedCreateEventForm } | null;
        return saved?.version === VERSION && saved.form ? saved.form : null;
    } catch {
        return null;
    }
}

export function saveCreateEventForm(run: string, form: SavedCreateEventForm): void {
    try {
        window.sessionStorage.setItem(storageKey(run), JSON.stringify({ version: VERSION, form }));
    } catch {
        // Storage blocked or full: a reload starts the form again.
    }
}

export function clearSavedCreateEventForm(run: string): void {
    try {
        window.sessionStorage.removeItem(storageKey(run));
    } catch {
        // Nothing to clear.
    }
}
