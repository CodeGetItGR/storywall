import type { EventTypeConvention } from '@/lib/api/types';
import { parseCreateEventStep } from '@/lib/createEventSteps';
import { EMPTY_GIFT_DETAILS, type GiftDetailsInput } from '@/lib/gift';
import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// The wizard's answers, kept so a reload, a sign-in on another page, the email code or closing the
// pop-up by accident doesn't lose them. localStorage, because Google sign-in leaves the tab.
export const CREATE_WIZARD_DRAFT_KEY = 'storywall.createEventWizard';
export const CREATE_WIZARD_DRAFT_VERSION = 1;
export const CREATE_WIZARD_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateEventWizardDraft = {
    run: string | null;
    step: CreateEventStep;
    eventType: EventTypeConvention | null;
    planCode: string;
    durationPicks: Record<string, string>;
    title: string;
    startAt: string;
    timezone: string;
    locationName: string;
    locationAddress: string;
    mapsUrl: string;
    themePresetId: string | null;
    gift: { isGift: boolean; details: GiftDetailsInput };
    checkoutCode: string;
};

type Stored = CreateEventWizardDraft & { version: number; savedAt: number };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const textOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

function parsePicks(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function parseGiftDetails(value: unknown): GiftDetailsInput {
    const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(Object.keys(EMPTY_GIFT_DETAILS).map((key) => [key, text(source[key])])) as GiftDetailsInput;
}

// Only the shape is checked here. The form checks the values against the live config (an event type
// or plan no longer on sale falls back, as a link's would).
function parse(raw: Record<string, unknown>): CreateEventWizardDraft {
    const gift = raw.gift && typeof raw.gift === 'object' ? (raw.gift as Record<string, unknown>) : {};
    return {
        run: textOrNull(raw.run),
        step: parseCreateEventStep(typeof raw.step === 'string' ? raw.step : null),
        eventType: textOrNull(raw.eventType) as EventTypeConvention | null,
        planCode: text(raw.planCode),
        durationPicks: parsePicks(raw.durationPicks),
        title: text(raw.title),
        startAt: text(raw.startAt),
        timezone: text(raw.timezone),
        locationName: text(raw.locationName),
        locationAddress: text(raw.locationAddress),
        mapsUrl: text(raw.mapsUrl),
        themePresetId: textOrNull(raw.themePresetId),
        gift: { isGift: gift.isGift === true, details: parseGiftDetails(gift.details) },
        checkoutCode: text(raw.checkoutCode),
    };
}

export function readCreateEventWizardDraft(): CreateEventWizardDraft | null {
    try {
        const raw = JSON.parse(window.localStorage.getItem(CREATE_WIZARD_DRAFT_KEY) ?? 'null') as Partial<Stored> | null;
        if (!raw || typeof raw !== 'object') return null;
        if (raw.version !== CREATE_WIZARD_DRAFT_VERSION || typeof raw.savedAt !== 'number') return null;
        if (Date.now() - raw.savedAt > CREATE_WIZARD_DRAFT_MAX_AGE_MS) return null;
        return parse(raw as Record<string, unknown>);
    } catch {
        return null;
    }
}

export function writeCreateEventWizardDraft(draft: CreateEventWizardDraft): void {
    try {
        const stored: Stored = { ...draft, version: CREATE_WIZARD_DRAFT_VERSION, savedAt: Date.now() };
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, JSON.stringify(stored));
    } catch {
        // Storage blocked: the wizard still works, and a reload starts over.
    }
}

export function clearCreateEventWizardDraft(): void {
    try {
        window.localStorage.removeItem(CREATE_WIZARD_DRAFT_KEY);
    } catch {
        // Nothing to clear.
    }
}

// Nothing typed yet: closing the pop-up from the type step then forgets the run.
export function isCreateEventWizardDraftEmpty(draft: CreateEventWizardDraft): boolean {
    const giftTyped = Object.values(draft.gift.details).some(Boolean);
    return !draft.title && !draft.startAt && !draft.locationName && !draft.locationAddress && !draft.mapsUrl && !draft.checkoutCode && !giftTyped;
}
