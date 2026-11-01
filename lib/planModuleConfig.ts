import { PARTNER_ROLES } from '@/lib/adminPartnerBranding';
import { STORAGE_UNITS, storageBytesToInput, storageInputToBytes, type StorageUnit } from '@/lib/adminPlanForm';
import type { EventModuleResponseDto, ModuleKey, PartnerRole, PlanTierResponseDto } from '@/lib/api/types';

// The per-plan module config keys the backend documents. Each gets a labelled
// control in the plan grid (AdminPage.plans.grid.cell.fields.<key>); any other
// key the server sends is kept as it is on save. `hint` adds fieldHints.<key> under it.
// A `required` number has no "Unlimited": the server wants the key with a value
// (a blank would drop it), so the grid shows a plain number input. `max` mirrors
// the server's upper bound. A `storage` number is bytes on the wire but edited as
// an amount and an MB/GB/TB unit; its draft holds both ("5 GB"). A `types` field is
// a list of vendor types, edited as checkboxes; its draft is the types joined by commas.
export type KnownConfigField =
    | { key: string; type: 'number'; min?: number; max?: number; required?: boolean; storage?: boolean }
    | { key: string; type: 'boolean'; hint?: boolean }
    | { key: string; type: 'types' };

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
    vendors: [
        { key: 'maxVendors', type: 'number', min: 0, max: INT32_MAX, required: true },
        { key: 'allowedTypes', type: 'types' },
        { key: 'accessDaysAfterEvent', type: 'number', min: 0, max: INT32_MAX, required: true },
        { key: 'proStorageBytes', type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER, required: true, storage: true },
    ],
};

// A types draft is the picked types in PARTNER_ROLES order, joined by commas ("" = none).
export function typesDraft(value: unknown): string {
    const picked: unknown[] = Array.isArray(value) ? value : [];
    return PARTNER_ROLES.filter((role) => picked.includes(role)).join(',');
}

export function typesFromDraft(text: string): PartnerRole[] {
    const picked = text.split(',');
    return PARTNER_ROLES.filter((role) => picked.includes(role));
}

export function toggleTypeDraft(text: string, role: PartnerRole, checked: boolean): string {
    const picked = new Set(typesFromDraft(text));
    if (checked) picked.add(role);
    else picked.delete(role);
    return typesDraft([...picked]);
}

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

// One known field's draft back to its typed value; undefined drops the key (a blank
// number, an untouched switch). An untouched draft keeps `before`'s exact value: a storage
// amount is rounded, and a types list may be in another order.
export function fieldValueFromDraft(field: KnownConfigField, raw: string | undefined, before?: unknown): unknown {
    if (field.type === 'boolean') {
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        return undefined;
    }
    if (field.type === 'types') {
        if (raw === undefined) return undefined;
        return Array.isArray(before) && raw === typesDraft(before) ? before : typesFromDraft(raw);
    }
    if (field.storage) {
        const bytes = raw === storageDraftFromBytes(before) ? before : storageDraftToBytes(raw ?? '');
        return typeof bytes === 'number' ? bytes : undefined;
    }
    const text = (raw ?? '').trim();
    if (!text) return undefined;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? undefined : parsed;
}

export function fieldDraftFromValue(field: KnownConfigField, value: unknown): string {
    if (field.type === 'types') return typesDraft(value);
    if (field.type === 'number' && field.storage) return storageDraftFromBytes(value);
    return value === undefined || value === null ? '' : String(value);
}

// Known fields are edited as strings (input values); this turns them back into
// typed values and merges the untouched unknown keys.
export function mergeConfigDraft(
    moduleKey: ModuleKey,
    knownDraft: Record<string, string>,
    unknown: ConfigObject,
    before: ConfigObject = {},
): ConfigObject {
    const merged: ConfigObject = { ...unknown };
    for (const field of knownConfigFields(moduleKey)) {
        const value = fieldValueFromDraft(field, knownDraft[field.key], before[field.key]);
        if (value !== undefined) merged[field.key] = value;
    }
    return merged;
}

export function knownDraftFromConfig(moduleKey: ModuleKey, config: ConfigObject): Record<string, string> {
    const draft: Record<string, string> = {};
    for (const field of knownConfigFields(moduleKey)) draft[field.key] = fieldDraftFromValue(field, config[field.key]);
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
    type: (role: PartnerRole) => string;
    allTypes: string;
    typeCount: (count: number, total: number) => string;
};

// More types than this read as a count in a plan grid cell; the full list stays in the popover.
const SHORT_TYPES_MAX = 2;

// A known setting's value in words: On/Off, "Up to 3" or Unlimited for a cap, the plain
// number (or size) for a required one, and the vendor types by name (All when every type).
export function describeConfigValue(field: KnownConfigField, value: unknown, labels: ConfigValueLabels): string {
    if (field.type === 'boolean') return value === true ? labels.on : labels.off;
    if (field.type === 'types') {
        const types = typesFromDraft(typesDraft(value));
        if (types.length === 0) return labels.none;
        if (types.length === PARTNER_ROLES.length) return labels.allTypes;
        return types.map(labels.type).join(', ');
    }
    if (typeof value !== 'number') return field.required ? labels.none : labels.unlimited;
    const amount = field.storage ? storageDraftFromBytes(value) : value;
    return field.required ? String(amount) : labels.upTo(amount);
}

// The confirm step's change list in words for known settings
// ("Co-hosts: Up to 3 → Unlimited"); unknown keys keep the raw key and JSON.
export function readableConfigChanges(moduleKey: ModuleKey, before: ConfigObject, after: ConfigObject, labels: ConfigValueLabels): ConfigChange[] {
    const fields = new Map(knownConfigFields(moduleKey).map((field) => [field.key, field]));
    return configChangeSummary(before, after, labels.none).flatMap((change) => {
        const field = fields.get(change.key);
        if (!field) return [change];
        const left = describeConfigValue(field, before[field.key], labels);
        const right = describeConfigValue(field, after[field.key], labels);
        // The same types in another order is no change.
        return left === right ? [] : [{ key: labels.field(field.key), before: left, after: right }];
    });
}

export type ConfigSummaryItem = { key: string; label: string; value: string };

// A plan grid cell's settings in words, known settings first in field order; any other key
// shows its raw key and JSON. A long list of types reads as a count ("6 of 8 types").
export function configSummary(moduleKey: ModuleKey, config: ConfigObject, labels: ConfigValueLabels): ConfigSummaryItem[] {
    const fields = knownConfigFields(moduleKey);
    const known = fields
        .filter((field) => field.key in config)
        .map((field) => ({ key: field.key, label: labels.field(field.key), value: summaryValue(field, config[field.key], labels) }));
    const { unknown } = splitConfig(moduleKey, config);
    const rest = Object.entries(unknown).map(([key, value]) => ({ key, label: key, value: formatConfigValue(value) }));
    return [...known, ...rest];
}

function summaryValue(field: KnownConfigField, value: unknown, labels: ConfigValueLabels): string {
    if (field.type !== 'types') return describeConfigValue(field, value, labels);
    const count = typesFromDraft(typesDraft(value)).length;
    return count > SHORT_TYPES_MAX && count < PARTNER_ROLES.length
        ? labels.typeCount(count, PARTNER_ROLES.length)
        : describeConfigValue(field, value, labels);
}
