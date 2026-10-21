import { STORAGE_UNITS, storageBytesToInput, storageInputToBytes, type StorageUnit } from '@/lib/adminPlanForm';
import type { EventModuleResponseDto, ModuleKey, PlanTierResponseDto } from '@/lib/api/types';

// The per-plan module config keys the backend documents. Each gets a labelled
// control in the plan grid (AdminPage.plans.grid.cell.fields.<key>); anything
// else stays editable through the collapsed Advanced JSON field, so a new key
// works before it gets a control here. `hint` adds fieldHints.<key> under it.
// A `required` number has no "Unlimited": the server wants the key with a value
// (a blank would drop it), so the grid shows a plain number input. `max` mirrors
// the server's upper bound. A `storage` number is bytes on the wire but edited as
// an amount and an MB/GB/TB unit; its draft holds both ("5 GB").
export type KnownConfigField =
    | { key: string; type: 'number'; min?: number; max?: number; required?: boolean; storage?: boolean }
    | { key: string; type: 'boolean'; hint?: boolean };

// The vendors config PATCH replaces the whole map and refuses anything else:
// whole numbers of 0 to 2^31-1 (bytes: 0 to the largest exact JS integer, the server allows more).
const INT32_MAX = 2_147_483_647;

const KNOWN_CONFIG_FIELDS: Record<string, KnownConfigField[]> = {
    schedule: [{ key: 'maxSections', type: 'number', min: 1 }],
    gallery: [
        { key: 'qrUploadEnabled', type: 'boolean' },
        { key: 'memberArchiveAfterEnd', type: 'boolean', hint: true },
    ],
    co_hosts: [{ key: 'maxCoHosts', type: 'number', min: 0 }],
    member_roles: [{ key: 'allowCustom', type: 'boolean', hint: true }],
    // allowedTypes (a list of vendor types) stays in the Advanced JSON; it rides along as an unknown key.
    vendors: [
        { key: 'maxVendors', type: 'number', min: 0, max: INT32_MAX, required: true },
        { key: 'accessDaysAfterEvent', type: 'number', min: 0, max: INT32_MAX, required: true },
        { key: 'proStorageBytes', type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER, required: true, storage: true },
    ],
};

// A storage field's draft: the amount and unit the admin sees, e.g. "5 GB".
export function storageDraft(amount: string, unit: StorageUnit): string {
    return `${amount.trim()} ${unit}`;
}

export function splitStorageDraft(text: string): { amount: string; unit: StorageUnit } {
    // Split on the last space: a cleared amount leaves " GB".
    const index = text.lastIndexOf(' ');
    if (index < 0) return { amount: text.trim(), unit: 'GB' };
    const unit = text.slice(index + 1);
    return { amount: text.slice(0, index).trim(), unit: STORAGE_UNITS.includes(unit as StorageUnit) ? (unit as StorageUnit) : 'GB' };
}

function storageDraftFromBytes(value: unknown): string {
    if (typeof value !== 'number') return '';
    const { amount, unit } = storageBytesToInput(value);
    return storageDraft(amount, unit);
}

function storageDraftToBytes(text: string): number | null {
    const { amount, unit } = splitStorageDraft(text);
    const bytes = storageInputToBytes(amount, unit);
    return bytes === null || Number.isNaN(bytes) ? null : bytes;
}

// Whether a number draft is a whole number inside the field's range. A storage
// amount may have decimals; the bytes it comes to must fit the range.
export function isValidNumberDraft(field: Extract<KnownConfigField, { type: 'number' }>, text: string): boolean {
    if (field.storage) {
        const bytes = storageDraftToBytes(text);
        return bytes !== null && (field.min === undefined || bytes >= field.min) && (field.max === undefined || bytes <= field.max);
    }
    const trimmed = text.trim();
    if (!trimmed) return false;
    const value = Number(trimmed);
    return Number.isInteger(value) && (field.min === undefined || value >= field.min) && (field.max === undefined || value <= field.max);
}

export type ConfigObject = Record<string, unknown>;

// A count cap from one module's config (e.g. maxCoHosts). Null means no cap:
// the server treats an absent count key as unlimited, never zero.
export function configCount(config: ConfigObject | undefined, key: string): number | null {
    const value = config?.[key];
    return typeof value === 'number' ? value : null;
}

// A plan's count cap for one module, from GET /api/config's planTiers. Null
// when the plan sets no cap, or when the plan isn't in the list (archived or
// not public) — the server's 409 still applies there.
export function planModuleCount(plan: PlanTierResponseDto | undefined, moduleKey: ModuleKey, key: string): number | null {
    return configCount(plan?.moduleConfigs?.[moduleKey], key);
}

// The event's own count cap for one module. Its module row carries the cap the server enforces,
// an admin's extra included; the plan's is the fallback while the event's modules aren't loaded.
export function eventModuleCount(
    modules: Pick<EventModuleResponseDto, 'moduleKey' | 'configuration'>[] | undefined,
    plan: PlanTierResponseDto | undefined,
    moduleKey: ModuleKey,
    key: string,
): number | null {
    const configuration = modules?.find((module) => module.moduleKey === moduleKey)?.configuration;
    return configuration ? configCount(configuration, key) : planModuleCount(plan, moduleKey, key);
}

export type CoHostCapacity = { used: number; limit: number | null; isFull: boolean };

// Co-hosts against the event's co_hosts.maxCoHosts (see eventModuleCount). The primary host
// (displayOrder 0) is not counted. See wishlist-wishbook-cohost-fe-integration.md §1.
export function coHostCapacity(
    hosts: { displayOrder: number }[],
    plan: PlanTierResponseDto | undefined,
    modules?: Pick<EventModuleResponseDto, 'moduleKey' | 'configuration'>[],
): CoHostCapacity {
    const used = hosts.filter((host) => host.displayOrder > 0).length;
    const limit = eventModuleCount(modules, plan, 'co_hosts', 'maxCoHosts');
    return { used, limit, isFull: limit !== null && used >= limit };
}

export function knownConfigFields(moduleKey: ModuleKey): KnownConfigField[] {
    return KNOWN_CONFIG_FIELDS[moduleKey] ?? [];
}

export function splitConfig(moduleKey: ModuleKey, config: ConfigObject): { known: ConfigObject; unknown: ConfigObject } {
    const knownKeys = new Set(knownConfigFields(moduleKey).map((field) => field.key));
    const known: ConfigObject = {};
    const unknown: ConfigObject = {};
    for (const [key, value] of Object.entries(config)) {
        if (knownKeys.has(key)) known[key] = value;
        else unknown[key] = value;
    }
    return { known, unknown };
}

export type ParsedConfigJson = { ok: true; value: ConfigObject } | { ok: false };

export function parseConfigJson(text: string): ParsedConfigJson {
    const trimmed = text.trim();
    if (!trimmed) return { ok: true, value: {} };
    try {
        const value: unknown = JSON.parse(trimmed);
        if (value === null || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
        return { ok: true, value: value as ConfigObject };
    } catch {
        return { ok: false };
    }
}

// Known fields are edited as strings (input values); this turns them back into
// typed values and merges the untouched unknown keys. A blank number means "unset".
// An untouched storage draft keeps `before`'s exact bytes, which its rounded amount may not.
export function mergeConfigDraft(
    moduleKey: ModuleKey,
    knownDraft: Record<string, string>,
    unknown: ConfigObject,
    before: ConfigObject = {},
): ConfigObject {
    const merged: ConfigObject = { ...unknown };
    for (const field of knownConfigFields(moduleKey)) {
        const raw = knownDraft[field.key];
        if (field.type === 'boolean') {
            if (raw === 'true') merged[field.key] = true;
            else if (raw === 'false') merged[field.key] = false;
            continue;
        }
        if (field.storage) {
            const bytes = raw === storageDraftFromBytes(before[field.key]) ? before[field.key] : storageDraftToBytes(raw ?? '');
            if (typeof bytes === 'number') merged[field.key] = bytes;
            continue;
        }
        const text = (raw ?? '').trim();
        if (!text) continue;
        const parsed = Number(text);
        if (!Number.isNaN(parsed)) merged[field.key] = parsed;
    }
    return merged;
}

export function knownDraftFromConfig(moduleKey: ModuleKey, config: ConfigObject): Record<string, string> {
    const draft: Record<string, string> = {};
    for (const field of knownConfigFields(moduleKey)) {
        const value = config[field.key];
        if (field.type === 'number' && field.storage) draft[field.key] = storageDraftFromBytes(value);
        else draft[field.key] = value === undefined || value === null ? '' : String(value);
    }
    return draft;
}

export function formatConfigValue(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
}

export type ConfigChange = { key: string; before: string; after: string };

export function configChangeSummary(before: ConfigObject, after: ConfigObject, noneLabel: string): ConfigChange[] {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const changes: ConfigChange[] = [];
    for (const key of keys) {
        const left = key in before ? JSON.stringify(before[key]) : undefined;
        const right = key in after ? JSON.stringify(after[key]) : undefined;
        if (left === right) continue;
        changes.push({
            key,
            before: left === undefined ? noneLabel : formatConfigValue(before[key]),
            after: right === undefined ? noneLabel : formatConfigValue(after[key]),
        });
    }
    return changes;
}

// Count fields shown as "Up to N": the ones whose draft holds a value. A blank
// count means Unlimited (the key is dropped on save).
export function limitedKeysFromDraft(moduleKey: ModuleKey, draft: Record<string, string>): string[] {
    return knownConfigFields(moduleKey)
        .filter((field) => field.type === 'number' && (draft[field.key] ?? '').trim() !== '')
        .map((field) => field.key);
}

export type ConfigValueLabels = {
    field: (key: string) => string;
    unlimited: string;
    upTo: (count: number | string) => string;
    on: string;
    off: string;
    none: string;
};

// The confirm step's change list in words for known settings
// ("Co-hosts: Up to 3 → Unlimited"); unknown keys keep the raw key and JSON.
export function readableConfigChanges(moduleKey: ModuleKey, before: ConfigObject, after: ConfigObject, labels: ConfigValueLabels): ConfigChange[] {
    const fields = new Map(knownConfigFields(moduleKey).map((field) => [field.key, field]));
    return configChangeSummary(before, after, labels.none).map((change) => {
        const field = fields.get(change.key);
        if (!field) return change;
        const describe = (value: unknown) => {
            if (field.type === 'boolean') return value === true ? labels.on : labels.off;
            if (typeof value !== 'number') return labels.unlimited;
            return labels.upTo(field.storage ? storageDraftFromBytes(value) : value);
        };
        return { key: labels.field(field.key), before: describe(before[field.key]), after: describe(after[field.key]) };
    });
}
