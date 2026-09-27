import type { ModuleKey, PlanTierResponseDto } from '@/lib/api/types';

// The only per-plan module config keys the backend documents today. Anything
// else in `defaultConfig` is still editable through the raw JSON field, so a
// new key works before it gets a typed input here.
export type KnownConfigField = { key: string; type: 'number'; min?: number } | { key: string; type: 'boolean' };

const KNOWN_CONFIG_FIELDS: Record<string, KnownConfigField[]> = {
    schedule: [{ key: 'maxSections', type: 'number', min: 1 }],
    gallery: [{ key: 'qrUploadEnabled', type: 'boolean' }],
    co_hosts: [{ key: 'maxCoHosts', type: 'number', min: 0 }],
};

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

export type CoHostCapacity = { used: number; limit: number | null; isFull: boolean };

// Co-hosts against the plan's co_hosts.maxCoHosts. The primary host
// (displayOrder 0) is not counted. See wishlist-wishbook-cohost-fe-integration.md §1.
export function coHostCapacity(hosts: { displayOrder: number }[], plan: PlanTierResponseDto | undefined): CoHostCapacity {
    const used = hosts.filter((host) => host.displayOrder > 0).length;
    const limit = planModuleCount(plan, 'co_hosts', 'maxCoHosts');
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
export function mergeConfigDraft(moduleKey: ModuleKey, knownDraft: Record<string, string>, unknown: ConfigObject): ConfigObject {
    const merged: ConfigObject = { ...unknown };
    for (const field of knownConfigFields(moduleKey)) {
        const raw = knownDraft[field.key];
        if (field.type === 'boolean') {
            if (raw === 'true') merged[field.key] = true;
            else if (raw === 'false') merged[field.key] = false;
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
        draft[field.key] = value === undefined || value === null ? '' : String(value);
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
