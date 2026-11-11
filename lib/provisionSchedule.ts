import type { AdminProvisionScheduleItem } from '@/lib/api/types';
import { datetimeLocalValueToIso, isDatetimeLocalBefore } from '@/lib/datetime';

// One schedule item as the provisioning form edits it: datetime-local strings, untrimmed text.
export type ProvisionScheduleDraft = {
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    locationName: string;
    mapsUrl: string;
    isSecondary: boolean;
};

export const PROVISION_SCHEDULE_MAX = 20;

export const EMPTY_SCHEDULE_DRAFT: ProvisionScheduleDraft = {
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    locationName: '',
    mapsUrl: '',
    isSecondary: false,
};

export function isScheduleEndBeforeStart(draft: ProvisionScheduleDraft): boolean {
    return Boolean(draft.startAt && draft.endAt && !isDatetimeLocalBefore(draft.startAt, draft.endAt));
}

export function canSaveScheduleDraft(draft: ProvisionScheduleDraft): boolean {
    return Boolean(draft.title.trim()) && !isScheduleEndBeforeStart(draft);
}

// Saves `draft` at `index` (null adds it). Only one item can be the venue, so marking this one
// unmarks the rest.
export function upsertScheduleItem(items: ProvisionScheduleDraft[], index: number | null, draft: ProvisionScheduleDraft): ProvisionScheduleDraft[] {
    const next = index === null ? [...items, draft] : items.map((item, at) => (at === index ? draft : item));
    if (!draft.isSecondary) return next;
    const savedAt = index ?? next.length - 1;
    return next.map((item, at) => (at === savedAt || !item.isSecondary ? item : { ...item, isSecondary: false }));
}

function optional(value: string): string | undefined {
    return value.trim() || undefined;
}

export function scheduleItemToRequest(draft: ProvisionScheduleDraft, allowsVenue: boolean): AdminProvisionScheduleItem {
    return {
        title: draft.title.trim(),
        description: optional(draft.description),
        startAt: datetimeLocalValueToIso(draft.startAt) ?? undefined,
        endAt: datetimeLocalValueToIso(draft.endAt) ?? undefined,
        locationName: optional(draft.locationName),
        mapsUrl: optional(draft.mapsUrl),
        ...(allowsVenue && draft.isSecondary ? { isSecondary: true } : {}),
    };
}
