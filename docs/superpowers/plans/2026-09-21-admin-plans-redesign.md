# Admin Plans Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four plan-related admin nav items with one `Plans` section grouped by event type, add the missing per-plan module config grid and event-type module matrix editing, and flatten the plan editor drawer into a single scrollable form — with every write behind a confirmation modal.

**Architecture:** A new `components/admin/plans/` tree renders an inner rail (event types + Settings) and a pane (header, plans table, module grid). Data comes from thin TanStack Query hooks in `hooks/` over endpoints in `lib/api/endpoints.ts`; pure logic (config registry, JSON validation, change summaries, hash routing, grid join) lives in `lib/` and is unit-tested with Vitest. Existing `PlanEditorCard`, `PlanCreateForm`, `ModuleRegistryPanel`, and `EventTypeRegistryPanel` are reused with minimal changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Query, Refine (`useList`/`useUpdate` for plan-tiers), `@base-ui/react` (Dialog/Popover), next-intl, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-plans-redesign-design.md`

**Conventions that apply to every task**
- Run type check with `npx tsc --noEmit` and lint with `npm run lint` before each commit.
- Every user-visible string goes in `messages/en.json` **and** `messages/el.json` under `AdminPage.plans.*` (or `AdminPage.tabs.*` for nav). Never leave a literal in JSX.
- Add a short JSX comment above every meaningful visual section (`{/* Header */}` etc.).
- Components are render shells; state and handlers live in hooks under `hooks/`.
- Use `React.SubmitEvent` for form submit handlers.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File map

**Create**
- `lib/planModuleConfig.ts`, `lib/planModuleConfig.test.ts` — known-key registry, JSON parse/validate, change summary.
- `lib/adminPlansRouting.ts`, `lib/adminPlansRouting.test.ts` — `#plans/...` hash ⇄ view state, legacy redirects.
- `lib/planModuleGrid.ts`, `lib/planModuleGrid.test.ts` — pure join of matrix + plan configs + unlocks into grid rows.
- `hooks/useEventTypeModuleMatrix.ts` — GET/PATCH admin event-type module matrix.
- `hooks/usePlanModuleConfigs.ts` — `useQueries` per plan + PATCH one module config.
- `hooks/usePlansSection.ts` — selected view, search, status filter, hash sync.
- `hooks/usePlanModuleGrid.ts` — wires the three data sources into `buildPlanModuleGrid`.
- `hooks/usePlanModuleCellDraft.ts` — popover draft, validation, pending confirmation, save.
- `hooks/useModuleApplicabilityChange.ts` — pending applicability change + confirm.
- `hooks/useScrollSpy.ts` — active anchor for the drawer.
- `components/admin/plans/PlansSection.tsx`, `PlansRail.tsx`, `PlansRailSearch.tsx`, `EventTypePlansHeader.tsx`, `EventTypePlansTable.tsx`, `PlanRow.tsx`, `PlanSharedGroupChip.tsx`, `PlanStatusFilter.tsx`, `PlanModuleGrid.tsx`, `PlanModuleGridRow.tsx`, `PlanModuleGridCell.tsx`, `ModuleApplicabilityPill.tsx`, `PlanModuleConfigPopover.tsx`, `PlanModuleConfigFields.tsx`, `PlanModuleConfigJsonField.tsx`, `PlanModuleChangeList.tsx`, `PlansSettingsModules.tsx`, `PlansSettingsEventTypes.tsx`, `PlansPaneEmpty.tsx`.
- `components/admin/PlanEditorAnchors.tsx`, `PlanEditorModulesSummary.tsx`, `PlanEditorDetailsSection.tsx`, `PlanEditorAvailabilitySection.tsx`, `PlanEditorLimitsSection.tsx`, `PlanEditorPricingSection.tsx`, `PlanEditorAddonsSection.tsx`, `PlanEditorDangerSection.tsx`.

**Modify**
- `lib/api/types.ts`, `lib/api/endpoints.ts`, `hooks/useAdmin.ts` (keys only).
- `components/admin/AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx`.
- `components/admin/PlanEditorCard.tsx`, `PlanEditorHeader.tsx`, `hooks/usePlanEditorState.ts`, `hooks/usePlanEditorCard.ts`.
- `components/admin/PlanCreateForm.tsx`, `hooks/usePlanCreateAssignments.ts`, `components/admin/PlanCreateAssignments.tsx`.
- `messages/en.json`, `messages/el.json`.

**Delete**
- `components/admin/PlanCatalogPanel.tsx`, `PlanEditorCoverageTab.tsx`, `PlanEditorDetailsTab.tsx`, `PlanEditorLimitsTab.tsx`, `PlanEditorPricingTab.tsx`, `PlanEditorAddonsTab.tsx`, `PlanEditorDangerTab.tsx`, `components/admin/AdminTabs.tsx` (no remaining consumers after this plan).

---

### Task 1: API types and endpoints

**Files:**
- Modify: `lib/api/types.ts` (after `EventTypeModuleResponseDto`, ~line 1241)
- Modify: `lib/api/endpoints.ts` (`admin.planTiers`, add `admin.eventTypes`)
- Modify: `hooks/useAdmin.ts:51-72` (`adminKeys`)

- [ ] **Step 1: Add DTOs**

In `lib/api/types.ts`, directly after the `EventTypeModuleResponseDto` interface, add:

```ts
// PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey} — every field
// optional. `defaultConfig` here is only the seed template for new per-plan
// rows; a plan's live value is PlanTierModuleConfigDto below. See
// event-lifecycle-locks-and-event-types-fe-integration.md "Admin: editing the matrix".
export interface EventTypeModulePatchDto {
    applicability?: EventTypeModuleApplicability;
    defaultConfig?: Record<string, unknown>;
    sortOrder?: number;
}

// GET /api/admin/plan-tiers/{planTierId}/modules — one row per module the
// plan's event type supports. Runtime source of truth for per-plan module
// config (plan-tiers-by-event-type-fe-integration.md §6).
export interface PlanTierModuleConfigDto {
    moduleKey: ModuleKey;
    defaultConfig: Record<string, unknown>;
}

// PATCH /api/admin/plan-tiers/{planTierId}/modules/{moduleKey}
export interface PlanTierModuleConfigPatchDto {
    defaultConfig: Record<string, unknown>;
}
```

- [ ] **Step 2: Add endpoints**

In `lib/api/endpoints.ts`, replace the `planTiers` block inside `admin` with:

```ts
        planTiers: {
            list: '/api/admin/plan-tiers',
            byId: (id: string) => `/api/admin/plan-tiers/${id}`,
            modules: (id: string) => `/api/admin/plan-tiers/${id}/modules`,
            moduleConfig: (id: string, moduleKey: string) => `/api/admin/plan-tiers/${id}/modules/${encodeURIComponent(moduleKey)}`,
            duplicate: (id: string) => `/api/admin/plan-tiers/${id}/duplicate`,
        },
        eventTypes: {
            modules: (eventTypeKey: string) => `/api/admin/event-types/${encodeURIComponent(eventTypeKey)}/modules`,
            module: (eventTypeKey: string, moduleKey: string) =>
                `/api/admin/event-types/${encodeURIComponent(eventTypeKey)}/modules/${encodeURIComponent(moduleKey)}`,
        },
```

- [ ] **Step 3: Add query keys**

In `hooks/useAdmin.ts`, inside `adminKeys`, after `platformEventTypes`, add:

```ts
    eventTypeModules: (eventTypeKey: string) => ['admin', 'event-types', eventTypeKey, 'modules'] as const,
    planTierModuleConfigs: (planId: string) => ['admin', 'plan-tiers', planId, 'module-configs'] as const,
```

- [ ] **Step 4: Type check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add lib/api/types.ts lib/api/endpoints.ts hooks/useAdmin.ts
git commit -m "Add admin plan module config and event-type matrix API types.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `lib/planModuleConfig.ts` — known keys, JSON validation, change summary

**Files:**
- Create: `lib/planModuleConfig.ts`
- Test: `lib/planModuleConfig.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import {
    configChangeSummary,
    formatConfigValue,
    knownConfigFields,
    mergeConfigDraft,
    parseConfigJson,
    splitConfig,
} from '@/lib/planModuleConfig';

describe('knownConfigFields', () => {
    it('returns typed fields for documented modules', () => {
        expect(knownConfigFields('schedule')).toEqual([{ key: 'maxSections', type: 'number', min: 1 }]);
        expect(knownConfigFields('gallery')).toEqual([{ key: 'qrUploadEnabled', type: 'boolean' }]);
    });

    it('returns nothing for an unknown module', () => {
        expect(knownConfigFields('posts')).toEqual([]);
    });
});

describe('splitConfig', () => {
    it('separates known keys from the rest', () => {
        const result = splitConfig('schedule', { maxSections: 3, theme: 'dark' });
        expect(result.known).toEqual({ maxSections: 3 });
        expect(result.unknown).toEqual({ theme: 'dark' });
    });
});

describe('parseConfigJson', () => {
    it('accepts an empty string as an empty object', () => {
        expect(parseConfigJson('')).toEqual({ ok: true, value: {} });
    });

    it('accepts a JSON object', () => {
        expect(parseConfigJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    });

    it('rejects non-objects and invalid JSON', () => {
        expect(parseConfigJson('[1]')).toEqual({ ok: false });
        expect(parseConfigJson('nope')).toEqual({ ok: false });
        expect(parseConfigJson('null')).toEqual({ ok: false });
    });
});

describe('mergeConfigDraft', () => {
    it('drops blank known numbers and keeps booleans and unknown keys', () => {
        const merged = mergeConfigDraft('schedule', { maxSections: '' }, { theme: 'dark' });
        expect(merged).toEqual({ theme: 'dark' });
        const merged2 = mergeConfigDraft('schedule', { maxSections: '5' }, {});
        expect(merged2).toEqual({ maxSections: 5 });
        const merged3 = mergeConfigDraft('gallery', { qrUploadEnabled: 'false' }, {});
        expect(merged3).toEqual({ qrUploadEnabled: false });
    });
});

describe('configChangeSummary', () => {
    it('lists changed, added and removed keys with before/after', () => {
        const changes = configChangeSummary({ maxSections: 3, old: true }, { maxSections: 5, fresh: 'x' }, 'None');
        expect(changes).toEqual([
            { key: 'maxSections', before: '3', after: '5' },
            { key: 'old', before: 'true', after: 'None' },
            { key: 'fresh', before: 'None', after: '"x"' },
        ]);
    });

    it('returns an empty list when nothing changed', () => {
        expect(configChangeSummary({ a: 1 }, { a: 1 }, 'None')).toEqual([]);
    });
});

describe('formatConfigValue', () => {
    it('formats primitives compactly and objects as JSON', () => {
        expect(formatConfigValue(3)).toBe('3');
        expect(formatConfigValue(true)).toBe('true');
        expect(formatConfigValue('x')).toBe('"x"');
        expect(formatConfigValue({ a: 1 })).toBe('{"a":1}');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/planModuleConfig.test.ts`
Expected: FAIL — cannot resolve `@/lib/planModuleConfig`.

- [ ] **Step 3: Implement**

Create `lib/planModuleConfig.ts`:

```ts
import type { ModuleKey } from '@/lib/api/types';

// The only per-plan module config keys the backend documents today. Anything
// else in `defaultConfig` is still editable through the raw JSON field, so a
// new key works before it gets a typed input here.
export type KnownConfigField = { key: string; type: 'number'; min?: number } | { key: string; type: 'boolean' };

const KNOWN_CONFIG_FIELDS: Record<string, KnownConfigField[]> = {
    schedule: [{ key: 'maxSections', type: 'number', min: 1 }],
    gallery: [{ key: 'qrUploadEnabled', type: 'boolean' }],
};

export type ConfigObject = Record<string, unknown>;

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/planModuleConfig.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/planModuleConfig.ts lib/planModuleConfig.test.ts
git commit -m "Add plan module config registry and helpers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `lib/adminPlansRouting.ts` — hash ⇄ view

**Files:**
- Create: `lib/adminPlansRouting.ts`
- Test: `lib/adminPlansRouting.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { formatPlansHash, isPlansHash, parsePlansHash } from '@/lib/adminPlansRouting';

describe('parsePlansHash', () => {
    it('defaults to no event type when only #plans is given', () => {
        expect(parsePlansHash('#plans')).toEqual({ view: 'eventType', key: null });
    });

    it('reads an event type key', () => {
        expect(parsePlansHash('#plans/WEDDING')).toEqual({ view: 'eventType', key: 'WEDDING' });
    });

    it('reads the settings views', () => {
        expect(parsePlansHash('#plans/settings/modules')).toEqual({ view: 'settingsModules', key: null });
        expect(parsePlansHash('#plans/settings/event-types')).toEqual({ view: 'settingsEventTypes', key: null });
    });

    it('maps legacy hashes', () => {
        expect(parsePlansHash('#event-plans')).toEqual({ view: 'eventType', key: null });
        expect(parsePlansHash('#modules')).toEqual({ view: 'settingsModules', key: null });
        expect(parsePlansHash('#event-types')).toEqual({ view: 'settingsEventTypes', key: null });
    });

    it('falls back for junk', () => {
        expect(parsePlansHash('#plans/settings/whatever')).toEqual({ view: 'eventType', key: null });
    });
});

describe('formatPlansHash', () => {
    it('round-trips every view', () => {
        expect(formatPlansHash({ view: 'eventType', key: null })).toBe('#plans');
        expect(formatPlansHash({ view: 'eventType', key: 'BAPTISM' })).toBe('#plans/BAPTISM');
        expect(formatPlansHash({ view: 'settingsModules', key: null })).toBe('#plans/settings/modules');
        expect(formatPlansHash({ view: 'settingsEventTypes', key: null })).toBe('#plans/settings/event-types');
    });
});

describe('isPlansHash', () => {
    it('recognises new and legacy hashes', () => {
        expect(isPlansHash('#plans')).toBe(true);
        expect(isPlansHash('#plans/WEDDING')).toBe(true);
        expect(isPlansHash('#modules')).toBe(true);
        expect(isPlansHash('#event-types')).toBe(true);
        expect(isPlansHash('#event-plans')).toBe(true);
        expect(isPlansHash('#metrics')).toBe(false);
        expect(isPlansHash('#plansx')).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/adminPlansRouting.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/adminPlansRouting.ts`:

```ts
export type PlansView =
    | { view: 'eventType'; key: string | null }
    | { view: 'settingsModules'; key: null }
    | { view: 'settingsEventTypes'; key: null };

export const PLANS_HASH_ROOT = '#plans';

const LEGACY_HASHES: Record<string, PlansView> = {
    '#event-plans': { view: 'eventType', key: null },
    '#modules': { view: 'settingsModules', key: null },
    '#event-types': { view: 'settingsEventTypes', key: null },
};

export function isPlansHash(hash: string): boolean {
    return hash === PLANS_HASH_ROOT || hash.startsWith(`${PLANS_HASH_ROOT}/`) || hash in LEGACY_HASHES;
}

export function parsePlansHash(hash: string): PlansView {
    const legacy = LEGACY_HASHES[hash];
    if (legacy) return legacy;
    if (!hash.startsWith(PLANS_HASH_ROOT)) return { view: 'eventType', key: null };
    const rest = hash.slice(PLANS_HASH_ROOT.length).replace(/^\//, '');
    if (!rest) return { view: 'eventType', key: null };
    if (rest === 'settings/modules') return { view: 'settingsModules', key: null };
    if (rest === 'settings/event-types') return { view: 'settingsEventTypes', key: null };
    if (rest.startsWith('settings/')) return { view: 'eventType', key: null };
    return { view: 'eventType', key: decodeURIComponent(rest) };
}

export function formatPlansHash(view: PlansView): string {
    if (view.view === 'settingsModules') return `${PLANS_HASH_ROOT}/settings/modules`;
    if (view.view === 'settingsEventTypes') return `${PLANS_HASH_ROOT}/settings/event-types`;
    return view.key ? `${PLANS_HASH_ROOT}/${encodeURIComponent(view.key)}` : PLANS_HASH_ROOT;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/adminPlansRouting.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/adminPlansRouting.ts lib/adminPlansRouting.test.ts
git commit -m "Add admin plans hash routing helpers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `lib/planModuleGrid.ts` — pure grid join

**Files:**
- Create: `lib/planModuleGrid.ts`
- Test: `lib/planModuleGrid.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type {
    EventTypeModuleResponseDto,
    PaidServiceResponseDto,
    PlanTierModuleConfigDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { buildPlanModuleGrid } from '@/lib/planModuleGrid';

function plan(overrides: Partial<PlanTierResponseDto>): PlanTierResponseDto {
    return {
        id: 'p1',
        code: 'P1',
        scope: 'EVENT',
        name: 'Basic',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        storageBytes: null,
        maxMembers: null,
        autoDeleteMonths: null,
        priceAmountMinor: null,
        priceCurrency: null,
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        ...overrides,
    };
}

const modules: PlatformModuleResponseDto[] = [
    { id: 'm2', moduleKey: 'schedule', name: 'Schedule', description: null, isEnabled: true, sortOrder: 1 },
    { id: 'm1', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 },
    { id: 'm3', moduleKey: 'wishlist', name: 'Wishlist', description: null, isEnabled: true, sortOrder: 2 },
];

const matrix: EventTypeModuleResponseDto[] = [
    { eventTypeKey: 'WEDDING', moduleKey: 'gallery', applicability: 'DEFAULT_ON', defaultConfig: { qrUploadEnabled: true }, sortOrder: 0, includedInPlan: null },
    { eventTypeKey: 'WEDDING', moduleKey: 'schedule', applicability: 'DEFAULT_OFF', defaultConfig: { maxSections: 3 }, sortOrder: 1, includedInPlan: null },
    { eventTypeKey: 'WEDDING', moduleKey: 'wishlist', applicability: 'UNSUPPORTED', defaultConfig: {}, sortOrder: 2, includedInPlan: null },
];

const basic = plan({ id: 'p1', code: 'BASIC', name: 'Basic', sortOrder: 0, moduleKeys: ['gallery'] });
const plus = plan({ id: 'p2', code: 'PLUS', name: 'Plus', sortOrder: 1, moduleKeys: ['gallery', 'schedule'] });

const configs = new Map<string, PlanTierModuleConfigDto[]>([
    ['p1', [{ moduleKey: 'gallery', defaultConfig: { qrUploadEnabled: false } }, { moduleKey: 'schedule', defaultConfig: { maxSections: 3 } }]],
    ['p2', [{ moduleKey: 'gallery', defaultConfig: { qrUploadEnabled: true } }, { moduleKey: 'schedule', defaultConfig: { maxSections: 10 } }]],
]);

const unlocks: PaidServiceResponseDto[] = [
    {
        id: 's1',
        code: 'SCHEDULE_UNLOCK',
        kind: 'MODULE_UNLOCK',
        name: 'Schedule unlock',
        description: null,
        sortOrder: 0,
        isAssignable: true,
        isPublic: true,
        priceAmountMinor: 1900,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        grantsStorageBytes: null,
        grantsModuleKey: 'schedule',
        planTierIds: [],
    },
];

describe('buildPlanModuleGrid', () => {
    it('orders rows by module sortOrder and columns by plan sortOrder', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [plus, basic], configsByPlanId: configs, unlocks });
        expect(grid.columns.map((column) => column.plan.code)).toEqual(['BASIC', 'PLUS']);
        expect(grid.rows.map((row) => row.moduleKey)).toEqual(['gallery', 'schedule', 'wishlist']);
    });

    it('marks unsupported rows and gives them no cells content', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: configs, unlocks });
        const wishlist = grid.rows.find((row) => row.moduleKey === 'wishlist')!;
        expect(wishlist.applicability).toBe('UNSUPPORTED');
        expect(wishlist.cells[0]).toEqual({ planId: 'p1', moduleKey: 'wishlist', kind: 'unsupported' });
    });

    it('builds included cells with the plan config', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic, plus], configsByPlanId: configs, unlocks });
        const gallery = grid.rows.find((row) => row.moduleKey === 'gallery')!;
        expect(gallery.cells[0]).toEqual({
            planId: 'p1',
            moduleKey: 'gallery',
            kind: 'included',
            config: { qrUploadEnabled: false },
            seedConfig: { qrUploadEnabled: true },
        });
    });

    it('prices an excluded module when an unlock covers the plan', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: configs, unlocks });
        const schedule = grid.rows.find((row) => row.moduleKey === 'schedule')!;
        expect(schedule.cells[0]).toEqual({
            planId: 'p1',
            moduleKey: 'schedule',
            kind: 'excluded',
            config: { maxSections: 3 },
            seedConfig: { maxSections: 3 },
            unlock: unlocks[0],
        });
    });

    it('uses the seed config when the plan has no config row yet', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: new Map(), unlocks: [] });
        const gallery = grid.rows.find((row) => row.moduleKey === 'gallery')!;
        expect(gallery.cells[0]).toMatchObject({ kind: 'included', config: { qrUploadEnabled: true } });
    });

    it('counts supported and unsupported modules', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: configs, unlocks });
        expect(grid.supportedCount).toBe(2);
        expect(grid.unsupportedCount).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/planModuleGrid.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/planModuleGrid.ts`:

```ts
import type {
    EventTypeModuleApplicability,
    EventTypeModuleResponseDto,
    PaidServiceResponseDto,
    PlanTierModuleConfigDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import type { ConfigObject } from '@/lib/planModuleConfig';

export type PlanModuleCell =
    | { planId: string; moduleKey: string; kind: 'unsupported' }
    | { planId: string; moduleKey: string; kind: 'included'; config: ConfigObject; seedConfig: ConfigObject }
    | { planId: string; moduleKey: string; kind: 'excluded'; config: ConfigObject; seedConfig: ConfigObject; unlock: PaidServiceResponseDto | null };

export type PlanModuleGridRow = {
    moduleKey: string;
    module: PlatformModuleResponseDto;
    applicability: EventTypeModuleApplicability;
    seedConfig: ConfigObject;
    cells: PlanModuleCell[];
};

export type PlanModuleGridColumn = { plan: PlanTierResponseDto };

export type PlanModuleGrid = {
    columns: PlanModuleGridColumn[];
    rows: PlanModuleGridRow[];
    supportedCount: number;
    unsupportedCount: number;
};

function unlockFor(unlocks: PaidServiceResponseDto[], planId: string, moduleKey: string): PaidServiceResponseDto | null {
    return (
        unlocks.find(
            (service) =>
                service.kind === 'MODULE_UNLOCK' &&
                service.isAssignable &&
                service.grantsModuleKey === moduleKey &&
                (service.planTierIds.length === 0 || service.planTierIds.includes(planId))
        ) ?? null
    );
}

// Modules missing from the matrix are treated as unsupported: the type has no
// row for them, so no event of that type can ever get one.
export function buildPlanModuleGrid({
    modules,
    matrix,
    plans,
    configsByPlanId,
    unlocks,
}: {
    modules: PlatformModuleResponseDto[];
    matrix: EventTypeModuleResponseDto[];
    plans: PlanTierResponseDto[];
    configsByPlanId: Map<string, PlanTierModuleConfigDto[]>;
    unlocks: PaidServiceResponseDto[];
}): PlanModuleGrid {
    const orderedPlans = [...plans].sort((left, right) => left.sortOrder - right.sortOrder);
    const orderedModules = [...modules].sort((left, right) => left.sortOrder - right.sortOrder);
    const matrixByKey = new Map(matrix.map((row) => [row.moduleKey, row]));

    let supportedCount = 0;
    let unsupportedCount = 0;

    const rows: PlanModuleGridRow[] = orderedModules.map((module) => {
        const matrixRow = matrixByKey.get(module.moduleKey);
        const applicability = matrixRow?.applicability ?? 'UNSUPPORTED';
        const seedConfig = matrixRow?.defaultConfig ?? {};
        if (applicability === 'UNSUPPORTED') unsupportedCount += 1;
        else supportedCount += 1;

        const cells: PlanModuleCell[] = orderedPlans.map((plan) => {
            if (applicability === 'UNSUPPORTED') return { planId: plan.id, moduleKey: module.moduleKey, kind: 'unsupported' };
            const configRow = configsByPlanId.get(plan.id)?.find((row) => row.moduleKey === module.moduleKey);
            const config = configRow?.defaultConfig ?? seedConfig;
            if (plan.moduleKeys.includes(module.moduleKey)) {
                return { planId: plan.id, moduleKey: module.moduleKey, kind: 'included', config, seedConfig };
            }
            return {
                planId: plan.id,
                moduleKey: module.moduleKey,
                kind: 'excluded',
                config,
                seedConfig,
                unlock: unlockFor(unlocks, plan.id, module.moduleKey),
            };
        });

        return { moduleKey: module.moduleKey, module, applicability, seedConfig, cells };
    });

    return { columns: orderedPlans.map((plan) => ({ plan })), rows, supportedCount, unsupportedCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/planModuleGrid.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/planModuleGrid.ts lib/planModuleGrid.test.ts
git commit -m "Add plan module grid join.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Data hooks — matrix and plan configs

**Files:**
- Create: `hooks/useEventTypeModuleMatrix.ts`
- Create: `hooks/usePlanModuleConfigs.ts`

- [ ] **Step 1: Create `hooks/useEventTypeModuleMatrix.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { eventTypeModuleKeys } from '@/hooks/useEventTypeModules';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeModulePatchDto, EventTypeModuleResponseDto } from '@/lib/api/types';

// GET /api/admin/event-types/{key}/modules — every row including UNSUPPORTED.
export function useEventTypeModuleMatrix(eventTypeKey: string | null) {
    return useQuery({
        queryKey: adminKeys.eventTypeModules(eventTypeKey ?? ''),
        queryFn: () => api.get<EventTypeModuleResponseDto[]>(endpoints.admin.eventTypes.modules(eventTypeKey!)),
        enabled: Boolean(eventTypeKey),
    });
}

export function useUpdateEventTypeModule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventTypeKey, moduleKey, input }: { eventTypeKey: string; moduleKey: string; input: EventTypeModulePatchDto }) =>
            api.patch<EventTypeModuleResponseDto>(endpoints.admin.eventTypes.module(eventTypeKey, moduleKey), input),
        onSuccess: (_result, { eventTypeKey }) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.eventTypeModules(eventTypeKey) });
            queryClient.invalidateQueries({ queryKey: eventTypeModuleKeys.list(eventTypeKey) });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}
```

- [ ] **Step 2: Create `hooks/usePlanModuleConfigs.ts`**

```ts
'use client';

import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PlanTierModuleConfigDto, PlanTierModuleConfigPatchDto } from '@/lib/api/types';

// One GET /api/admin/plan-tiers/{id}/modules per plan column, in parallel. A
// failed column is reported on its own so the rest of the grid stays usable.
export function usePlanModuleConfigs(planIds: string[]) {
    const results = useQueries({
        queries: planIds.map((planId) => ({
            queryKey: adminKeys.planTierModuleConfigs(planId),
            queryFn: () => api.get<PlanTierModuleConfigDto[]>(endpoints.admin.planTiers.modules(planId)),
        })),
    });

    const configsByPlanId = useMemo(() => {
        const map = new Map<string, PlanTierModuleConfigDto[]>();
        results.forEach((result, index) => {
            if (result.data) map.set(planIds[index], result.data);
        });
        return map;
    }, [planIds, results]);

    const failedPlanIds = useMemo(
        () => planIds.filter((_planId, index) => Boolean(results[index]?.error)),
        [planIds, results]
    );

    return {
        configsByPlanId,
        failedPlanIds,
        isLoading: results.some((result) => result.isLoading),
    };
}

export function useUpdatePlanModuleConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ planId, moduleKey, input }: { planId: string; moduleKey: string; input: PlanTierModuleConfigPatchDto }) =>
            api.patch<PlanTierModuleConfigDto>(endpoints.admin.planTiers.moduleConfig(planId, moduleKey), input),
        onSuccess: (_result, { planId }) => {
            queryClient.invalidateQueries({ queryKey: adminKeys.planTierModuleConfigs(planId) });
            queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        },
    });
}
```

Note: `useQueries` returns a new array each render; `useMemo` on `results` still recomputes each render, which is acceptable here (small maps). Do not add extra memo tricks.

- [ ] **Step 3: Type check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add hooks/useEventTypeModuleMatrix.ts hooks/usePlanModuleConfigs.ts
git commit -m "Add admin hooks for event-type module matrix and per-plan module config.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Navigation — one `plans` tab, legacy redirects

**Files:**
- Modify: `components/admin/AdminNavigationContext.tsx`
- Modify: `components/admin/AdminShellNav.tsx:10-24`
- Modify: `components/admin/AdminConsole.tsx`
- Modify: `messages/en.json` (`AdminPage.tabs`), `messages/el.json` (`AdminPage.tabs`)

- [ ] **Step 1: Update `AdminNavigationContext.tsx`**

Replace the `AdminTab` union, `HASH_TO_TAB`, `TAB_TO_HASH`, `currentHashTab`, and the `tabs` memo as follows (leave everything else as is):

```ts
export type AdminTab =
    | 'metrics'
    | 'costTracking'
    | 'plans'
    | 'paidServices'
    | 'discountCodes'
    | 'collaborations'
    | 'reactionTypes'
    | 'assignments'
    | 'billingOps'
    | 'withdrawals'
    | 'accounts';
```

```ts
const HASH_TO_TAB: Record<string, AdminTab> = {
    '#metrics': 'metrics',
    '#cost-tracking': 'costTracking',
    '#paid-services': 'paidServices',
    '#discount-codes': 'discountCodes',
    '#collaborations': 'collaborations',
    '#reaction-types': 'reactionTypes',
    '#assignments': 'assignments',
    '#billing-ops': 'billingOps',
    '#withdrawals': 'withdrawals',
    '#accounts': 'accounts',
};

const TAB_TO_HASH: Record<AdminTab, string> = {
    metrics: '#metrics',
    costTracking: '#cost-tracking',
    plans: PLANS_HASH_ROOT,
    paidServices: '#paid-services',
    discountCodes: '#discount-codes',
    collaborations: '#collaborations',
    reactionTypes: '#reaction-types',
    assignments: '#assignments',
    billingOps: '#billing-ops',
    withdrawals: '#withdrawals',
    accounts: '#accounts',
};
```

```ts
// `#plans/...` carries its own sub-route (event type or settings view), parsed
// by the Plans section itself; legacy `#event-plans`, `#modules`, `#event-types`
// land there too so old links keep working.
function currentHashTab(): AdminTab {
    if (typeof window === 'undefined') return 'metrics';
    const hash = window.location.hash;
    if (isPlansHash(hash)) return 'plans';
    return HASH_TO_TAB[hash] ?? 'metrics';
}
```

Add the import at the top: `import { isPlansHash, PLANS_HASH_ROOT } from '@/lib/adminPlansRouting';`

Replace the `tabs` memo body:

```ts
        () => [
            { key: 'metrics', label: t('metrics'), icon: BarChart3 },
            { key: 'costTracking', label: t('costTracking'), icon: ChartNoAxesCombined },
            { key: 'plans', label: t('plans'), icon: CalendarDays },
            { key: 'paidServices', label: t('paidServices'), icon: PackagePlus },
            { key: 'discountCodes', label: t('discountCodes'), icon: TicketPercent },
            { key: 'collaborations', label: t('collaborations'), icon: Handshake },
            { key: 'reactionTypes', label: t('reactionTypes'), icon: Smile },
            { key: 'accounts', label: t('accounts'), icon: Users },
            { key: 'assignments', label: t('assignments'), icon: Layers3 },
            { key: 'billingOps', label: t('billingOps'), icon: Receipt },
            { key: 'withdrawals', label: t('withdrawals'), icon: Undo2 },
        ],
```

Remove the now-unused `Shield` and `Tag` imports from lucide.

In `setTab`, keep writing `TAB_TO_HASH[nextTab]` — for `plans` that is `#plans`, which the section resolves to the first enabled type.

- [ ] **Step 2: Update `AdminShellNav.tsx` `TAB_GROUP`**

```ts
const TAB_GROUP: Record<AdminTab, 'overview' | 'catalog' | 'marketing' | 'operations'> = {
    metrics: 'overview',
    costTracking: 'overview',
    plans: 'catalog',
    paidServices: 'catalog',
    discountCodes: 'marketing',
    collaborations: 'operations',
    reactionTypes: 'catalog',
    assignments: 'operations',
    billingOps: 'operations',
    withdrawals: 'operations',
    accounts: 'operations',
};
```

- [ ] **Step 3: Update `AdminConsole.tsx`**

Replace the imports of `EventTypeRegistryPanel`, `ModuleRegistryPanel`, `PlanCatalogPanel` with `import { PlansSection } from '@/components/admin/plans/PlansSection';`, add `if (tab === 'plans') return <PlansSection />;` next to the `paidServices` early return, and delete the three lines `{tab === 'eventPlans' && …}`, `{tab === 'modules' && …}`, `{tab === 'eventTypes' && …}`.

`PlansSection` does not exist yet — Task 7 creates it. Until then create a placeholder so the build passes:

`components/admin/plans/PlansSection.tsx`
```tsx
'use client';

export function PlansSection() {
    return null;
}
```

- [ ] **Step 4: Translations**

In `messages/en.json` under `AdminPage.tabs`, add `"plans": "Plans"` and remove `"eventPlans"`, `"modules"`, `"eventTypes"`, `"planAvailability"`, `"planModules"`. In `messages/el.json` under `AdminPage.tabs`, add `"plans": "Πλάνα"` and remove the same keys.

Then grep for leftovers: `grep -rn "tabs.eventPlans\|tabs.modules\|tabs.eventTypes\|t('eventPlans')\|t('modules')\|t('eventTypes')" components hooks app lib` — only `AdminPage.tabs` consumers should have matched, and they are gone now. (`components/plan/PlanCard.tsx` uses a different namespace; leave it.)

- [ ] **Step 5: Type check, lint, commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (`PlanCatalogPanel`, `ModuleRegistryPanel`, `EventTypeRegistryPanel` are now unimported but still compile.)

```bash
git add components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx components/admin/plans/PlansSection.tsx messages/en.json messages/el.json
git commit -m "Collapse admin plan nav items into one Plans tab.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `usePlansSection` + rail + section shell + Settings views

**Files:**
- Create: `hooks/usePlansSection.ts`
- Create: `components/admin/plans/PlansRail.tsx`, `PlansRailSearch.tsx`, `PlansSettingsModules.tsx`, `PlansSettingsEventTypes.tsx`, `PlansPaneEmpty.tsx`
- Modify: `components/admin/plans/PlansSection.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Create `hooks/usePlansSection.ts`**

```ts
'use client';

import { useList } from '@refinedev/core';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminPaidServices, useAdminPlatformEventTypes, useAdminPlatformModules } from '@/hooks/useAdmin';
import { formatPlansHash, parsePlansHash, type PlansView } from '@/lib/adminPlansRouting';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';

export type PlanStatusFilterValue = Visibility | 'ALL';

function currentView(): PlansView {
    if (typeof window === 'undefined') return { view: 'eventType', key: null };
    return parsePlansHash(window.location.hash);
}

export function usePlansSection() {
    const [view, setViewState] = useState<PlansView>(currentView);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<PlanStatusFilterValue>('ALL');

    const eventTypesQuery = useAdminPlatformEventTypes();
    const modulesQuery = useAdminPlatformModules();
    const unlocksQuery = useAdminPaidServices('MODULE_UNLOCK', true);
    const { result: plansResult, query: plansQuery } = useList<PlanTierResponseDto>({
        resource: 'plan-tiers',
        dataProviderName: 'plan-tiers',
        filters: [
            { field: 'scope', operator: 'eq', value: 'EVENT' },
            { field: 'includeArchived', operator: 'eq', value: true },
        ],
        pagination: { mode: 'off' },
    });

    useEffect(() => {
        function syncFromHash() {
            setViewState(currentView());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const setView = useCallback((next: PlansView) => {
        setViewState(next);
        window.history.replaceState(null, '', formatPlansHash(next));
    }, []);

    const orderedEventTypes = useMemo(
        () => [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data]
    );
    const allPlans = useMemo(() => [...plansResult.data].sort((left, right) => left.sortOrder - right.sortOrder), [plansResult.data]);

    // `#plans` with no key resolves to the first enabled type once types load.
    const selectedEventTypeKey = useMemo(() => {
        if (view.view !== 'eventType') return null;
        if (view.key) return view.key;
        return orderedEventTypes.find((type) => type.isEnabled)?.eventTypeKey ?? orderedEventTypes[0]?.eventTypeKey ?? null;
    }, [orderedEventTypes, view]);

    const selectedEventType = useMemo(
        () => orderedEventTypes.find((type) => type.eventTypeKey === selectedEventTypeKey) ?? null,
        [orderedEventTypes, selectedEventTypeKey]
    );

    const needle = search.trim().toLowerCase();

    const plansForType = useMemo(
        () => allPlans.filter((plan) => plan.eventTypeKey === selectedEventTypeKey),
        [allPlans, selectedEventTypeKey]
    );

    const visiblePlans = useMemo(
        () =>
            plansForType.filter((plan) => {
                if (statusFilter !== 'ALL' && visibilityOf(plan) !== statusFilter) return false;
                if (!needle) return true;
                return plan.name.toLowerCase().includes(needle) || plan.code.toLowerCase().includes(needle);
            }),
        [needle, plansForType, statusFilter]
    );

    const statusCounts = useMemo(() => {
        const counts: Record<PlanStatusFilterValue, number> = { ALL: plansForType.length, LIVE: 0, HIDDEN: 0, ARCHIVED: 0 };
        for (const plan of plansForType) counts[visibilityOf(plan)] += 1;
        return counts;
    }, [plansForType]);

    // The rail filters types by name/key and by whether any of their plans match.
    const railEventTypes = useMemo(
        () =>
            orderedEventTypes
                .map((type) => {
                    const typePlans = allPlans.filter((plan) => plan.eventTypeKey === type.eventTypeKey);
                    return { type, liveCount: typePlans.filter((plan) => visibilityOf(plan) === 'LIVE').length, plans: typePlans };
                })
                .filter(({ type, plans }) => {
                    if (!needle) return true;
                    if (type.eventTypeKey.toLowerCase().includes(needle)) return true;
                    return plans.some((plan) => plan.name.toLowerCase().includes(needle) || plan.code.toLowerCase().includes(needle));
                }),
        [allPlans, needle, orderedEventTypes]
    );

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const selectEventType = useCallback((key: string) => setView({ view: 'eventType', key }), [setView]);
    const openSettingsModules = useCallback(() => setView({ view: 'settingsModules', key: null }), [setView]);
    const openSettingsEventTypes = useCallback(() => setView({ view: 'settingsEventTypes', key: null }), [setView]);

    return {
        view,
        selectedEventTypeKey,
        selectedEventType,
        orderedEventTypes,
        railEventTypes,
        allPlans,
        plansForType,
        visiblePlans,
        statusFilter,
        setStatusFilter,
        statusCounts,
        search,
        handleSearchChange,
        selectEventType,
        openSettingsModules,
        openSettingsEventTypes,
        modules: modulesQuery.data ?? [],
        unlocks: unlocksQuery.data ?? [],
        plansQuery,
        eventTypesQuery,
        isLoading: plansQuery.isLoading || eventTypesQuery.isLoading,
        error: plansQuery.error ?? eventTypesQuery.error ?? null,
    };
}
```

- [ ] **Step 2: Create `components/admin/plans/PlansRailSearch.tsx`**

```tsx
'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';

export function PlansRailSearch({ value, onChangeAction }: { value: string; onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void }) {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={value} onChange={onChangeAction} placeholder={t('search.placeholder')} className={adminInputClass('w-full pl-8')} />
        </div>
    );
}
```

- [ ] **Step 3: Create `components/admin/plans/PlansRail.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { PlansRailSearch } from '@/components/admin/plans/PlansRailSearch';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlansView } from '@/lib/adminPlansRouting';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export type PlansRailEventType = { type: PlatformEventTypeResponseDto; liveCount: number };

const ITEM_CLASS = 'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors';

export function PlansRail({
    view,
    selectedEventTypeKey,
    eventTypes,
    search,
    onSearchChangeAction,
    onSelectEventTypeAction,
    onOpenSettingsModulesAction,
    onOpenSettingsEventTypesAction,
}: {
    view: PlansView;
    selectedEventTypeKey: string | null;
    eventTypes: PlansRailEventType[];
    search: string;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
    onOpenSettingsModulesAction: () => void;
    onOpenSettingsEventTypesAction: () => void;
}) {
    const t = useTranslations('AdminPage.plans');
    const localizedText = useLocalizedText();

    function handleTypeClick(event: MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.eventTypeKey;
        if (key) onSelectEventTypeAction(key);
    }

    return (
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-52">
            {/* Search */}
            <PlansRailSearch value={search} onChangeAction={onSearchChangeAction} />

            {/* Event types */}
            <nav aria-label={t('rail.eventTypes')} className="space-y-px">
                {eventTypes.map(({ type, liveCount }) => {
                    const active = view.view === 'eventType' && type.eventTypeKey === selectedEventTypeKey;
                    return (
                        <button
                            key={type.eventTypeKey}
                            type="button"
                            data-event-type-key={type.eventTypeKey}
                            aria-current={active ? 'page' : undefined}
                            onClick={handleTypeClick}
                            className={cn(
                                ITEM_CLASS,
                                active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                                !type.isEnabled && 'opacity-60'
                            )}
                        >
                            <span className="truncate">{localizedText(type.name, type.eventTypeKey)}</span>
                            <span className="shrink-0 font-mono text-[11px] text-ink-faint">{liveCount}</span>
                        </button>
                    );
                })}
                {eventTypes.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-faint">{t('rail.noMatches')}</p>}
            </nav>

            {/* Settings */}
            <nav aria-label={t('rail.settings')} className="border-t border-border pt-3">
                <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">{t('rail.settings')}</p>
                <div className="space-y-px">
                    <button
                        type="button"
                        aria-current={view.view === 'settingsModules' ? 'page' : undefined}
                        onClick={onOpenSettingsModulesAction}
                        className={cn(ITEM_CLASS, view.view === 'settingsModules' ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink')}
                    >
                        {t('rail.modules')}
                    </button>
                    <button
                        type="button"
                        aria-current={view.view === 'settingsEventTypes' ? 'page' : undefined}
                        onClick={onOpenSettingsEventTypesAction}
                        className={cn(ITEM_CLASS, view.view === 'settingsEventTypes' ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink')}
                    >
                        {t('rail.eventTypesSettings')}
                    </button>
                </div>
            </nav>
        </aside>
    );
}
```

- [ ] **Step 4: Create the Settings wrappers and the empty pane**

`components/admin/plans/PlansSettingsModules.tsx`
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ModuleRegistryPanel } from '@/components/admin/ModuleRegistryPanel';

export function PlansSettingsModules() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.modulesTitle')}</h2>
            </header>
            <ModuleRegistryPanel />
        </div>
    );
}
```

`components/admin/plans/PlansSettingsEventTypes.tsx`
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { EventTypeRegistryPanel } from '@/components/admin/EventTypeRegistryPanel';

export function PlansSettingsEventTypes() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.eventTypesTitle')}</h2>
            </header>
            <EventTypeRegistryPanel />
        </div>
    );
}
```

`components/admin/plans/PlansPaneEmpty.tsx`
```tsx
'use client';

import { useTranslations } from 'next-intl';

export function PlansPaneEmpty() {
    const t = useTranslations('AdminPage.plans');

    return <p className="px-1 py-6 text-sm text-ink-muted">{t('noEventTypes')}</p>;
}
```

- [ ] **Step 5: Write the `PlansSection` shell**

Replace `components/admin/plans/PlansSection.tsx` with:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { PlansPaneEmpty } from '@/components/admin/plans/PlansPaneEmpty';
import { PlansRail } from '@/components/admin/plans/PlansRail';
import { PlansSettingsEventTypes } from '@/components/admin/plans/PlansSettingsEventTypes';
import { PlansSettingsModules } from '@/components/admin/plans/PlansSettingsModules';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePlansSection } from '@/hooks/usePlansSection';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PlansSection() {
    const t = useTranslations('AdminPage');
    const section = usePlansSection();

    return (
        <div className="mx-auto px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            {/* Header */}
            <header className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('plans.sectionTitle')}</h1>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                {/* Rail */}
                <PlansRail
                    view={section.view}
                    selectedEventTypeKey={section.selectedEventTypeKey}
                    eventTypes={section.railEventTypes}
                    search={section.search}
                    onSearchChangeAction={section.handleSearchChange}
                    onSelectEventTypeAction={section.selectEventType}
                    onOpenSettingsModulesAction={section.openSettingsModules}
                    onOpenSettingsEventTypesAction={section.openSettingsEventTypes}
                />

                {/* Pane */}
                {section.view.view === 'settingsModules' && <PlansSettingsModules />}
                {section.view.view === 'settingsEventTypes' && <PlansSettingsEventTypes />}
                {section.view.view === 'eventType' && section.isLoading && <LoadingState label={t('plans.loading')} className="justify-start py-6" />}
                {section.view.view === 'eventType' && section.error && (
                    <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(section.error)}`)}</p>
                )}
                {section.view.view === 'eventType' && !section.isLoading && !section.error && !section.selectedEventType && <PlansPaneEmpty />}
                {/* Event type pane is added in Task 8 */}
            </div>
        </div>
    );
}
```

- [ ] **Step 6: Translations**

Add under `AdminPage.plans` in `messages/en.json`:

```json
"sectionTitle": "Plans",
"noEventTypes": "No event types yet.",
"rail": {
    "eventTypes": "Event types",
    "noMatches": "No matches.",
    "settings": "Settings",
    "modules": "Modules",
    "eventTypesSettings": "Event types"
},
"settings": {
    "modulesTitle": "Modules",
    "eventTypesTitle": "Event types"
}
```

And in `messages/el.json`:

```json
"sectionTitle": "Πλάνα",
"noEventTypes": "Δεν υπάρχουν τύποι εκδηλώσεων.",
"rail": {
    "eventTypes": "Τύποι εκδηλώσεων",
    "noMatches": "Δεν βρέθηκαν αποτελέσματα.",
    "settings": "Ρυθμίσεις",
    "modules": "Ενότητες",
    "eventTypesSettings": "Τύποι εκδηλώσεων"
},
"settings": {
    "modulesTitle": "Ενότητες",
    "eventTypesTitle": "Τύποι εκδηλώσεων"
}
```

`search.placeholder` already exists under `AdminPage.plans` — reuse it.

- [ ] **Step 7: Type check, lint, commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add hooks/usePlansSection.ts components/admin/plans messages/en.json messages/el.json
git commit -m "Add Plans section shell with event-type rail and settings views.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Event type pane — header, status filter, plans table, shared-group chip, create/duplicate/edit wiring

**Files:**
- Create: `hooks/useEventTypePlansPane.ts`
- Create: `components/admin/plans/EventTypePlansPane.tsx`, `EventTypePlansHeader.tsx`, `PlanStatusFilter.tsx`, `EventTypePlansTable.tsx`, `PlanRow.tsx`, `PlanSharedGroupChip.tsx`
- Modify: `components/admin/plans/PlansSection.tsx`
- Delete: `components/admin/PlanCatalogPanel.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Create `hooks/useEventTypePlansPane.ts`**

Owns drawer/create/duplicate state and the saved banner — ported from `PlanCatalogPanel`.

```ts
'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';

export function useEventTypePlansPane(plans: PlanTierResponseDto[]) {
    const t = useTranslations('AdminPage.plans');
    const [createOpen, setCreateOpen] = useState(false);
    const [duplicatePlanId, setDuplicatePlanId] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);
    const duplicatePlan = useMemo(() => plans.find((plan) => plan.id === duplicatePlanId) ?? null, [plans, duplicatePlanId]);

    const openCreate = useCallback(() => {
        setDuplicatePlanId(null);
        setCreateOpen(true);
    }, []);
    const closeCreate = useCallback(() => {
        setCreateOpen(false);
        setDuplicatePlanId(null);
    }, []);
    const openEdit = useCallback((planId: string) => setSelectedPlanId(planId), []);
    const closeEditor = useCallback(() => setSelectedPlanId(null), []);

    const handleEditClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const planId = event.currentTarget.dataset.planId;
        if (planId) setSelectedPlanId(planId);
    }, []);
    const handleDuplicateClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const planId = event.currentTarget.dataset.planId;
        if (!planId) return;
        setDuplicatePlanId(planId);
        setCreateOpen(true);
    }, []);

    const handleCreated = useCallback(
        (name: string) => {
            setCreateOpen(false);
            setDuplicatePlanId(null);
            setSavedMessage(t('create.createSuccess', { plan: name }));
        },
        [t]
    );
    const handleSaved = useCallback(
        (name: string) => {
            setSelectedPlanId(null);
            setSavedMessage(t('saveSuccess', { plan: name }));
        },
        [t]
    );

    useEffect(() => {
        if (!savedMessage) return;
        const timeoutId = setTimeout(() => setSavedMessage(null), 4000);
        return () => clearTimeout(timeoutId);
    }, [savedMessage]);

    return {
        createOpen,
        duplicatePlan,
        selectedPlan,
        savedMessage,
        openCreate,
        closeCreate,
        openEdit,
        closeEditor,
        handleEditClick,
        handleDuplicateClick,
        handleCreated,
        handleSaved,
    };
}
```

- [ ] **Step 2: Create `components/admin/plans/PlanStatusFilter.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { PlanStatusFilterValue } from '@/hooks/usePlansSection';
import { cn } from '@/lib/utils';

const FILTERS: PlanStatusFilterValue[] = ['ALL', 'LIVE', 'HIDDEN', 'ARCHIVED'];

export function PlanStatusFilter({
    value,
    counts,
    onChangeAction,
}: {
    value: PlanStatusFilterValue;
    counts: Record<PlanStatusFilterValue, number>;
    onChangeAction: (next: PlanStatusFilterValue) => void;
}) {
    const t = useTranslations('AdminPage.plans');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.status as PlanStatusFilterValue);
    }

    return (
        <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
            {FILTERS.map((status) => (
                <button
                    key={status}
                    type="button"
                    data-status={status}
                    onClick={handleClick}
                    aria-pressed={value === status}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                        value === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                    )}
                >
                    {t(`status.${status}`)}
                    <span className="font-mono text-[11px] font-semibold text-ink-faint">{counts[status]}</span>
                </button>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Create `components/admin/plans/PlanSharedGroupChip.tsx`**

```tsx
'use client';

import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

// Plans created together by "Duplicate" share a key; the chip lists the other
// event types in that group and jumps to them.
export function PlanSharedGroupChip({
    plan,
    allPlans,
    eventTypes,
    onSelectEventTypeAction,
}: {
    plan: PlanTierResponseDto;
    allPlans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onSelectEventTypeAction: (key: string) => void;
}) {
    const t = useTranslations('AdminPage.plans');
    const localizedText = useLocalizedText();

    if (!plan.sharedGroupKey) return null;
    const siblings = allPlans.filter((other) => other.sharedGroupKey === plan.sharedGroupKey && other.id !== plan.id && other.eventTypeKey);
    if (siblings.length === 0) return null;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.eventTypeKey;
        if (key) onSelectEventTypeAction(key);
    }

    return (
        <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-ink-faint">
            <Link2 className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{t('sharedGroup.label')}</span>
            {siblings.map((sibling) => {
                const type = eventTypes.find((item) => item.eventTypeKey === sibling.eventTypeKey);
                return (
                    <button
                        key={sibling.id}
                        type="button"
                        data-event-type-key={sibling.eventTypeKey ?? ''}
                        onClick={handleClick}
                        className="rounded-full bg-status-neutral-wash px-1.5 py-0.5 font-bold text-status-neutral hover:text-ink"
                    >
                        {type ? localizedText(type.name, type.eventTypeKey) : sibling.eventTypeKey}
                    </button>
                );
            })}
        </span>
    );
}
```

- [ ] **Step 4: Create `components/admin/plans/PlanRow.tsx`**

```tsx
'use client';

import { CopyPlus, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { PlanSharedGroupChip } from '@/components/admin/plans/PlanSharedGroupChip';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

const STATUS_DOT: Record<Visibility, string> = { LIVE: 'bg-status-good', HIDDEN: 'bg-status-warn', ARCHIVED: 'bg-status-neutral' };
const STATUS_PILL: Record<Visibility, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
};

const ICON_BUTTON = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink';

export function PlanRow({
    plan,
    allPlans,
    eventTypes,
    onEditClickAction,
    onDuplicateClickAction,
    onSelectEventTypeAction,
}: {
    plan: PlanTierResponseDto;
    allPlans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onEditClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onDuplicateClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const status = visibilityOf(plan);

    return (
        <tr className="border-b border-border last:border-b-0 hover:bg-canvas/60">
            <td className="max-w-64 px-3 py-2">
                <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{plan.name}</p>
                    {plan.isDefault && (
                        <span className="shrink-0 rounded-full bg-primary-light px-1.5 py-0.5 text-[9.5px] font-bold text-primary-dark">{t('plans.default')}</span>
                    )}
                </div>
                <p className="truncate font-mono text-[11px] text-ink-faint">{plan.code}</p>
            </td>
            <td className="px-2.5 py-2 font-mono text-ink">{formatPlanMoney(plan, locale) ?? t('plans.noPrice')}</td>
            <td className="px-2.5 py-2 font-mono text-ink-muted">{formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')}</td>
            <td className="px-2.5 py-2 font-mono text-ink-muted">{formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')}</td>
            <td className="px-2.5 py-2 font-mono text-ink-muted">
                {plan.autoDeleteMonths === null ? t('plans.columns.never') : t('plans.columns.months', { count: plan.autoDeleteMonths })}
            </td>
            <td className="px-2.5 py-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_PILL[status])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
                    {t(`plans.status.${status}`)}
                </span>
            </td>
            <td className="px-2.5 py-2">
                <PlanSharedGroupChip plan={plan} allPlans={allPlans} eventTypes={eventTypes} onSelectEventTypeAction={onSelectEventTypeAction} />
            </td>
            <td className="px-2.5 py-2 text-right">
                <div className="flex items-center justify-end gap-0.5">
                    <button
                        type="button"
                        data-plan-id={plan.id}
                        onClick={onDuplicateClickAction}
                        aria-label={t('plans.duplicate.action', { plan: plan.name })}
                        title={t('plans.duplicate.label')}
                        className={ICON_BUTTON}
                    >
                        <CopyPlus className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" data-plan-id={plan.id} onClick={onEditClickAction} aria-label={t('plans.edit')} className={ICON_BUTTON}>
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
```

- [ ] **Step 5: Create `components/admin/plans/EventTypePlansTable.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { PlanRow } from '@/components/admin/plans/PlanRow';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

export function EventTypePlansTable({
    plans,
    allPlans,
    eventTypes,
    onEditClickAction,
    onDuplicateClickAction,
    onSelectEventTypeAction,
}: {
    plans: PlanTierResponseDto[];
    allPlans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onEditClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onDuplicateClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
}) {
    const t = useTranslations('AdminPage.plans');

    if (plans.length === 0) return <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                        <th className="px-3 py-2 font-bold">{t('columns.plan')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.price')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.storage')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.members')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.autoDelete')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.status')}</th>
                        <th className="px-2.5 py-2 font-bold">{t('columns.sharedGroup')}</th>
                        <th className="px-2.5 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {plans.map((plan) => (
                        <PlanRow
                            key={plan.id}
                            plan={plan}
                            allPlans={allPlans}
                            eventTypes={eventTypes}
                            onEditClickAction={onEditClickAction}
                            onDuplicateClickAction={onDuplicateClickAction}
                            onSelectEventTypeAction={onSelectEventTypeAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 6: Create `components/admin/plans/EventTypePlansHeader.tsx`**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function EventTypePlansHeader({ eventType, onCreateAction }: { eventType: PlatformEventTypeResponseDto; onCreateAction: () => void }) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    return (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="truncate text-xl font-semibold tracking-tight text-ink">{localizedText(eventType.name, eventType.eventTypeKey)}</h2>
                <span className="font-mono text-[11px] text-ink-faint">{eventType.eventTypeKey}</span>
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        eventType.isEnabled ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral'
                    )}
                >
                    {eventType.isEnabled ? t('eventTypes.enabled') : t('eventTypes.disabled')}
                </span>
            </div>
            <button
                type="button"
                onClick={onCreateAction}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
            >
                <Plus className="h-4 w-4" />
                {t('plans.create.open')}
            </button>
        </header>
    );
}
```

- [ ] **Step 7: Create `components/admin/plans/EventTypePlansPane.tsx`**

The module grid slot is filled in Task 11; leave the comment in place now.

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { PlanCreateForm } from '@/components/admin/PlanCreateForm';
import { PlanEditorCard } from '@/components/admin/PlanEditorCard';
import { EventTypePlansHeader } from '@/components/admin/plans/EventTypePlansHeader';
import { EventTypePlansTable } from '@/components/admin/plans/EventTypePlansTable';
import { PlanStatusFilter } from '@/components/admin/plans/PlanStatusFilter';
import { useEventTypePlansPane } from '@/hooks/useEventTypePlansPane';
import type { usePlansSection } from '@/hooks/usePlansSection';

export function EventTypePlansPane({ section }: { section: ReturnType<typeof usePlansSection> }) {
    const t = useTranslations('AdminPage');
    const eventType = section.selectedEventType!;
    const pane = useEventTypePlansPane(section.allPlans);

    return (
        <div className="min-w-0 flex-1 space-y-5">
            {/* Header */}
            <EventTypePlansHeader eventType={eventType} onCreateAction={pane.openCreate} />

            {/* Save/create confirmation */}
            {pane.savedMessage && (
                <p role="status" className="rounded-lg bg-status-good-wash px-4 py-2.5 text-sm font-semibold text-status-good">
                    {pane.savedMessage}
                </p>
            )}

            {/* Plans */}
            <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <PlanStatusFilter value={section.statusFilter} counts={section.statusCounts} onChangeAction={section.setStatusFilter} />
                </div>
                <EventTypePlansTable
                    plans={section.visiblePlans}
                    allPlans={section.allPlans}
                    eventTypes={section.orderedEventTypes}
                    onEditClickAction={pane.handleEditClick}
                    onDuplicateClickAction={pane.handleDuplicateClick}
                    onSelectEventTypeAction={section.selectEventType}
                />
            </section>

            {/* Modules — added in Task 11 */}

            <PlanCreateForm
                key={pane.duplicatePlan?.id ?? `new-plan-${eventType.eventTypeKey}`}
                open={pane.createOpen}
                onCloseAction={pane.closeCreate}
                onCreatedAction={pane.handleCreated}
                plans={section.allPlans}
                eventTypes={section.orderedEventTypes}
                modules={section.modules}
                scope="EVENT"
                sourcePlan={pane.duplicatePlan}
            />

            <AdminDrawer
                open={Boolean(pane.selectedPlan)}
                onClose={pane.closeEditor}
                closeLabel={t('cancel')}
                title={pane.selectedPlan?.name ?? ''}
                subtitle={pane.selectedPlan?.code}
            >
                {pane.selectedPlan && (
                    <PlanEditorCard
                        key={`${pane.selectedPlan.id}:${pane.selectedPlan.moduleKeys.join(',')}`}
                        plan={pane.selectedPlan}
                        modules={section.modules}
                        eventTypes={section.orderedEventTypes}
                        paidServices={section.unlocks}
                        eventPlans={section.allPlans}
                        scope="EVENT"
                        onSavedAction={pane.handleSaved}
                    />
                )}
            </AdminDrawer>
        </div>
    );
}
```

- [ ] **Step 8: Mount the pane in `PlansSection.tsx`**

Replace the line `{/* Event type pane is added in Task 8 */}` with:

```tsx
                {section.view.view === 'eventType' && !section.isLoading && !section.error && section.selectedEventType && (
                    <EventTypePlansPane key={section.selectedEventType.eventTypeKey} section={section} />
                )}
```

and import `EventTypePlansPane`.

- [ ] **Step 9: Delete `PlanCatalogPanel.tsx` and add translations**

```bash
git rm components/admin/PlanCatalogPanel.tsx
```

Add under `AdminPage.plans.columns` in `en.json`: `"storage": "Storage"`, `"members": "Members"`, `"autoDelete": "Auto-delete"`, `"sharedGroup": "Shared with"`, `"never": "Never"`, `"months": "{count, plural, one {# month} other {# months}}"`. Add `"sharedGroup": { "label": "Also offered for" }` under `AdminPage.plans`.

`el.json` equivalents: `"storage": "Αποθήκευση"`, `"members": "Μέλη"`, `"autoDelete": "Αυτόματη διαγραφή"`, `"sharedGroup": "Κοινό με"`, `"never": "Ποτέ"`, `"months": "{count, plural, one {# μήνας} other {# μήνες}}"`, `"sharedGroup": { "label": "Διατίθεται και για" }`.

Remove `AdminPage.plans.stats`, `AdminPage.plans.columns.eventTypes`, `AdminPage.plans.columns.limits`, `AdminPage.plans.columns.modules`, `AdminPage.plans.rowCount`, and `AdminPage.plans.panel` from both files if nothing else references them (`grep -rn "plans.stats\|plans.panel\|plans.rowCount" components hooks app lib`).

- [ ] **Step 10: Type check, lint, commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add -A components/admin/plans hooks/useEventTypePlansPane.ts messages
git commit -m "Add per-event-type plans pane and remove the flat plan catalog.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Applicability pill with confirmation

**Files:**
- Create: `hooks/useModuleApplicabilityChange.ts`
- Create: `components/admin/plans/ModuleApplicabilityPill.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Create `hooks/useModuleApplicabilityChange.ts`**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useUpdateEventTypeModule } from '@/hooks/useEventTypeModuleMatrix';
import type { EventTypeModuleApplicability } from '@/lib/api/types';

export type PendingApplicabilityChange = {
    moduleKey: string;
    moduleName: string;
    before: EventTypeModuleApplicability;
    after: EventTypeModuleApplicability;
};

// The pill never writes on click: the choice is parked here until the admin
// confirms it in the modal.
export function useModuleApplicabilityChange(eventTypeKey: string) {
    const update = useUpdateEventTypeModule();
    const [pending, setPending] = useState<PendingApplicabilityChange | null>(null);

    const request = useCallback((change: PendingApplicabilityChange) => {
        if (change.before === change.after) return;
        setPending(change);
    }, []);

    const cancel = useCallback(() => {
        update.reset();
        setPending(null);
    }, [update]);

    const confirm = useCallback(async () => {
        if (!pending) return;
        await update.mutateAsync({ eventTypeKey, moduleKey: pending.moduleKey, input: { applicability: pending.after } });
        setPending(null);
    }, [eventTypeKey, pending, update]);

    return { pending, request, cancel, confirm, isSaving: update.isPending, error: update.error };
}
```

- [ ] **Step 2: Create `components/admin/plans/ModuleApplicabilityPill.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { EventTypeModuleApplicability } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const OPTIONS: EventTypeModuleApplicability[] = ['UNSUPPORTED', 'DEFAULT_OFF', 'DEFAULT_ON'];

export function ModuleApplicabilityPill({
    moduleKey,
    value,
    onRequestChangeAction,
}: {
    moduleKey: string;
    value: EventTypeModuleApplicability;
    onRequestChangeAction: (moduleKey: string, next: EventTypeModuleApplicability) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.applicability');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onRequestChangeAction(moduleKey, event.currentTarget.dataset.value as EventTypeModuleApplicability);
    }

    return (
        <div role="group" aria-label={t('label')} className="inline-flex gap-0.5 rounded-md bg-canvas p-0.5">
            {OPTIONS.map((option) => (
                <button
                    key={option}
                    type="button"
                    data-value={option}
                    onClick={handleClick}
                    aria-pressed={value === option}
                    className={cn(
                        'rounded px-1.5 py-0.5 text-[10.5px] font-bold transition-colors',
                        value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                    )}
                >
                    {t(option)}
                </button>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Translations**

`en.json` under `AdminPage.plans`, add:

```json
"grid": {
    "title": "Modules",
    "count": "{supported} supported · {unsupported} unsupported",
    "showHidden": "Show hidden plans",
    "noPlans": "No plans yet.",
    "columnError": "Could not load this plan's module settings.",
    "included": "Included",
    "notIncluded": "Not included",
    "unlockOnce": "+{price} once",
    "unlockMonthly": "+{price}/mo",
    "applicability": {
        "label": "Availability for this event type",
        "UNSUPPORTED": "Unsupported",
        "DEFAULT_OFF": "Off",
        "DEFAULT_ON": "On",
        "confirmTitle": "Change {module} for {eventType}?",
        "confirmBody": "{before} → {after}",
        "unsupportedWarning": "The module is removed from every event of this type.",
        "confirm": "Apply"
    },
    "cell": {
        "title": "{module} · {plan}",
        "includedSwitch": "Included in plan",
        "resetToDefault": "Reset to type default",
        "otherKeys": "Other settings (JSON)",
        "invalidJson": "Enter a JSON object.",
        "invalidNumber": "Enter a whole number of at least {min}.",
        "confirmTitle": "Save changes to {module} for {plan}?",
        "included": "Included",
        "yes": "Yes",
        "no": "No",
        "noChanges": "No changes yet."
    }
}
```

`el.json`:

```json
"grid": {
    "title": "Ενότητες",
    "count": "{supported} υποστηρίζονται · {unsupported} δεν υποστηρίζονται",
    "showHidden": "Εμφάνιση κρυφών πλάνων",
    "noPlans": "Δεν υπάρχουν πλάνα.",
    "columnError": "Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων ενοτήτων του πλάνου.",
    "included": "Περιλαμβάνεται",
    "notIncluded": "Δεν περιλαμβάνεται",
    "unlockOnce": "+{price} εφάπαξ",
    "unlockMonthly": "+{price}/μήνα",
    "applicability": {
        "label": "Διαθεσιμότητα για αυτόν τον τύπο",
        "UNSUPPORTED": "Μη διαθέσιμη",
        "DEFAULT_OFF": "Ανενεργή",
        "DEFAULT_ON": "Ενεργή",
        "confirmTitle": "Αλλαγή της ενότητας {module} για {eventType};",
        "confirmBody": "{before} → {after}",
        "unsupportedWarning": "Η ενότητα αφαιρείται από κάθε εκδήλωση αυτού του τύπου.",
        "confirm": "Εφαρμογή"
    },
    "cell": {
        "title": "{module} · {plan}",
        "includedSwitch": "Περιλαμβάνεται στο πλάνο",
        "resetToDefault": "Επαναφορά στην προεπιλογή τύπου",
        "otherKeys": "Άλλες ρυθμίσεις (JSON)",
        "invalidJson": "Εισάγετε ένα αντικείμενο JSON.",
        "invalidNumber": "Εισάγετε ακέραιο αριθμό τουλάχιστον {min}.",
        "confirmTitle": "Αποθήκευση αλλαγών στην ενότητα {module} για το πλάνο {plan};",
        "included": "Περιλαμβάνεται",
        "yes": "Ναι",
        "no": "Όχι",
        "noChanges": "Δεν υπάρχουν αλλαγές."
    }
}
```

- [ ] **Step 4: Type check, commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add hooks/useModuleApplicabilityChange.ts components/admin/plans/ModuleApplicabilityPill.tsx messages
git commit -m "Add module applicability pill with confirmed change flow.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Cell draft hook + config popover

**Files:**
- Create: `hooks/usePlanModuleCellDraft.ts`
- Create: `components/admin/plans/PlanModuleConfigFields.tsx`, `PlanModuleConfigJsonField.tsx`, `PlanModuleChangeList.tsx`, `PlanModuleConfigPopover.tsx`

- [ ] **Step 1: Create `hooks/usePlanModuleCellDraft.ts`**

```ts
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useSetPlanModules } from '@/hooks/useAdmin';
import { useUpdatePlanModuleConfig } from '@/hooks/usePlanModuleConfigs';
import type { PlanTierResponseDto } from '@/lib/api/types';
import {
    type ConfigChange,
    type ConfigObject,
    configChangeSummary,
    knownConfigFields,
    knownDraftFromConfig,
    mergeConfigDraft,
    parseConfigJson,
    splitConfig,
} from '@/lib/planModuleConfig';
import type { PlanModuleCell } from '@/lib/planModuleGrid';

export type EditableCell = Extract<PlanModuleCell, { kind: 'included' | 'excluded' }>;

export type PendingCellSave = {
    includedBefore: boolean;
    includedAfter: boolean;
    configBefore: ConfigObject;
    configAfter: ConfigObject;
    changes: ConfigChange[];
};

export function usePlanModuleCellDraft({ cell, plan, onSavedAction }: { cell: EditableCell; plan: PlanTierResponseDto; onSavedAction: () => void }) {
    const t = useTranslations('AdminPage');
    const updateConfig = useUpdatePlanModuleConfig();
    const setPlanModules = useSetPlanModules();

    const initialSplit = useMemo(() => splitConfig(cell.moduleKey, cell.config), [cell.config, cell.moduleKey]);
    const [included, setIncluded] = useState(cell.kind === 'included');
    const [knownDraft, setKnownDraft] = useState<Record<string, string>>(() => knownDraftFromConfig(cell.moduleKey, cell.config));
    const [jsonText, setJsonText] = useState(() => (Object.keys(initialSplit.unknown).length ? JSON.stringify(initialSplit.unknown, null, 2) : ''));
    const [pending, setPending] = useState<PendingCellSave | null>(null);

    const fields = knownConfigFields(cell.moduleKey);
    const parsedJson = parseConfigJson(jsonText);

    const fieldErrors = useMemo(() => {
        const errors: Record<string, string> = {};
        for (const field of fields) {
            if (field.type !== 'number') continue;
            const text = (knownDraft[field.key] ?? '').trim();
            if (!text) continue;
            const value = Number(text);
            if (!Number.isInteger(value) || (field.min !== undefined && value < field.min)) {
                errors[field.key] = t('plans.grid.cell.invalidNumber', { min: field.min ?? 0 });
            }
        }
        return errors;
    }, [fields, knownDraft, t]);

    const jsonError = parsedJson.ok ? null : t('plans.grid.cell.invalidJson');

    const configAfter = useMemo(
        () => mergeConfigDraft(cell.moduleKey, knownDraft, parsedJson.ok ? parsedJson.value : initialSplit.unknown),
        [cell.moduleKey, initialSplit.unknown, knownDraft, parsedJson]
    );
    const changes = useMemo(() => configChangeSummary(cell.config, configAfter, t('none')), [cell.config, configAfter, t]);
    const includedChanged = included !== (cell.kind === 'included');
    const canSave = !jsonError && Object.keys(fieldErrors).length === 0 && (changes.length > 0 || includedChanged);

    const handleKnownChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.currentTarget;
        setKnownDraft((current) => ({ ...current, [name]: value }));
    }, []);
    const handleJsonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setJsonText(event.currentTarget.value), []);
    const handleIncludedChange = useCallback((next: boolean) => setIncluded(next), []);

    const resetToSeed = useCallback(() => {
        const seedSplit = splitConfig(cell.moduleKey, cell.seedConfig);
        setKnownDraft(knownDraftFromConfig(cell.moduleKey, cell.seedConfig));
        setJsonText(Object.keys(seedSplit.unknown).length ? JSON.stringify(seedSplit.unknown, null, 2) : '');
    }, [cell.moduleKey, cell.seedConfig]);

    const requestSave = useCallback(() => {
        if (!canSave) return;
        setPending({
            includedBefore: cell.kind === 'included',
            includedAfter: included,
            configBefore: cell.config,
            configAfter,
            changes,
        });
    }, [canSave, cell.config, cell.kind, changes, configAfter, included]);

    const cancelSave = useCallback(() => setPending(null), []);

    const confirmSave = useCallback(async () => {
        if (!pending) return;
        if (pending.changes.length > 0) {
            await updateConfig.mutateAsync({ planId: plan.id, moduleKey: cell.moduleKey, input: { defaultConfig: pending.configAfter } });
        }
        if (pending.includedBefore !== pending.includedAfter) {
            const moduleKeys = pending.includedAfter
                ? [...plan.moduleKeys, cell.moduleKey]
                : plan.moduleKeys.filter((key) => key !== cell.moduleKey);
            await setPlanModules.mutateAsync({ planId: plan.id, moduleKeys });
        }
        setPending(null);
        onSavedAction();
    }, [cell.moduleKey, onSavedAction, pending, plan.id, plan.moduleKeys, setPlanModules, updateConfig]);

    return {
        fields,
        included,
        knownDraft,
        jsonText,
        fieldErrors,
        jsonError,
        canSave,
        pending,
        isSaving: updateConfig.isPending || setPlanModules.isPending,
        error: updateConfig.error ?? setPlanModules.error ?? null,
        handleKnownChange,
        handleJsonChange,
        handleIncludedChange,
        resetToSeed,
        requestSave,
        cancelSave,
        confirmSave,
    };
}
```

- [ ] **Step 2: Create `components/admin/plans/PlanModuleConfigFields.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigFields({
    fields,
    draft,
    errors,
    onChangeAction,
}: {
    fields: KnownConfigField[];
    draft: Record<string, string>;
    errors: Record<string, string>;
    onChangeAction: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    if (fields.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
                <AdminField key={field.key} label={field.key} hint={errors[field.key]}>
                    {field.type === 'boolean' ? (
                        <select name={field.key} value={draft[field.key] ?? ''} onChange={onChangeAction} className={adminInputClass('font-mono')}>
                            <option value="">—</option>
                            <option value="true">{t('yes')}</option>
                            <option value="false">{t('no')}</option>
                        </select>
                    ) : (
                        <input
                            name={field.key}
                            type="number"
                            min={field.min}
                            step={1}
                            value={draft[field.key] ?? ''}
                            onChange={onChangeAction}
                            aria-invalid={Boolean(errors[field.key])}
                            className={adminInputClass('font-mono')}
                        />
                    )}
                </AdminField>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Create `components/admin/plans/PlanModuleConfigJsonField.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';

export function PlanModuleConfigJsonField({
    value,
    error,
    onChangeAction,
}: {
    value: string;
    error: string | null;
    onChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    return (
        <AdminField label={t('otherKeys')} optional hint={error ?? undefined}>
            <textarea
                value={value}
                onChange={onChangeAction}
                rows={4}
                spellCheck={false}
                aria-invalid={Boolean(error)}
                placeholder="{}"
                className={adminInputClass('min-h-24 resize-y font-mono text-xs')}
            />
        </AdminField>
    );
}
```

- [ ] **Step 4: Create `components/admin/plans/PlanModuleChangeList.tsx`**

Used as the confirmation modal body.

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { PendingCellSave } from '@/hooks/usePlanModuleCellDraft';

export function PlanModuleChangeList({ pending }: { pending: PendingCellSave | null }) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    if (!pending) return null;
    const rows = [
        ...(pending.includedBefore !== pending.includedAfter
            ? [{ key: t('included'), before: pending.includedBefore ? t('yes') : t('no'), after: pending.includedAfter ? t('yes') : t('no') }]
            : []),
        ...pending.changes,
    ];

    return (
        <ul className="space-y-1.5 text-sm">
            {rows.map((row) => (
                <li key={row.key} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-ink">{row.key}</span>
                    <span className="font-mono text-xs text-ink-faint line-through">{row.before}</span>
                    <span className="font-mono text-xs text-ink">{row.after}</span>
                </li>
            ))}
        </ul>
    );
}
```

- [ ] **Step 5: Create `components/admin/plans/PlanModuleConfigPopover.tsx`**

Uses `@base-ui/react/popover`, anchored to the cell button.

```tsx
'use client';

import { Popover } from '@base-ui/react/popover';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { PlanModuleChangeList } from '@/components/admin/plans/PlanModuleChangeList';
import { PlanModuleConfigFields } from '@/components/admin/plans/PlanModuleConfigFields';
import { PlanModuleConfigJsonField } from '@/components/admin/plans/PlanModuleConfigJsonField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type EditableCell, usePlanModuleCellDraft } from '@/hooks/usePlanModuleCellDraft';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanModuleConfigPopover({
    cell,
    plan,
    moduleName,
    anchor,
    onCloseAction,
}: {
    cell: EditableCell;
    plan: PlanTierResponseDto;
    moduleName: string;
    anchor: HTMLElement;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const draft = usePlanModuleCellDraft({ cell, plan, onSavedAction: onCloseAction });

    function handleOpenChange(open: boolean) {
        if (!open && !draft.pending) onCloseAction();
    }

    return (
        <>
            <Popover.Root open onOpenChange={handleOpenChange}>
                <Popover.Portal>
                    <Popover.Positioner anchor={anchor} side="bottom" align="start" sideOffset={6} className="z-40">
                        <Popover.Popup className="w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-card p-4 text-ink shadow-[0_20px_50px_-20px_rgba(18,20,28,0.4)] outline-none">
                            {/* Title */}
                            <Popover.Title className="text-sm font-bold text-ink">{t('plans.grid.cell.title', { module: moduleName, plan: plan.name })}</Popover.Title>

                            {/* Included */}
                            <div className="mt-3 rounded-lg border border-border">
                                <AdminSwitch label={t('plans.grid.cell.includedSwitch')} checked={draft.included} onCheckedChangeAction={draft.handleIncludedChange} />
                            </div>

                            {/* Config */}
                            <div className="mt-4 space-y-3">
                                <PlanModuleConfigFields fields={draft.fields} draft={draft.knownDraft} errors={draft.fieldErrors} onChangeAction={draft.handleKnownChange} />
                                <PlanModuleConfigJsonField value={draft.jsonText} error={draft.jsonError} onChangeAction={draft.handleJsonChange} />
                                <button type="button" onClick={draft.resetToSeed} className="text-xs font-semibold text-ink-muted underline-offset-2 hover:underline">
                                    {t('plans.grid.cell.resetToDefault')}
                                </button>
                            </div>

                            {/* Error */}
                            {draft.error && <p className="mt-3 text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(draft.error)}`)}</p>}

                            {/* Footer */}
                            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                                <button type="button" onClick={onCloseAction} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                                    {t('cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={draft.requestSave}
                                    disabled={!draft.canSave || draft.isSaving}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {draft.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t('save')}
                                </button>
                            </div>
                        </Popover.Popup>
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>

            <ConfirmActionModal
                open={Boolean(draft.pending)}
                onCloseAction={draft.cancelSave}
                title={t('plans.grid.cell.confirmTitle', { module: moduleName, plan: plan.name })}
                body={<PlanModuleChangeList pending={draft.pending} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={draft.isSaving}
                onConfirmAction={draft.confirmSave}
                tone="default"
                size="md"
            />
        </>
    );
}
```

If `Popover.Positioner` does not accept `anchor` as an `HTMLElement` in the installed `@base-ui/react` version, check `node_modules/@base-ui/react/popover/positioner/PopoverPositioner.d.ts` and pass `anchor={anchor}` in the accepted form (it accepts `Element | null | (() => Element | null) | React.RefObject<Element>` in 1.x).

- [ ] **Step 6: Type check, lint, commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add hooks/usePlanModuleCellDraft.ts components/admin/plans/PlanModuleConfigFields.tsx components/admin/plans/PlanModuleConfigJsonField.tsx components/admin/plans/PlanModuleChangeList.tsx components/admin/plans/PlanModuleConfigPopover.tsx
git commit -m "Add per-plan module config popover with confirmed save.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: The module grid

**Files:**
- Create: `hooks/usePlanModuleGrid.ts`
- Create: `components/admin/plans/PlanModuleGridCell.tsx`, `PlanModuleGridRow.tsx`, `PlanModuleGrid.tsx`
- Modify: `components/admin/plans/EventTypePlansPane.tsx`

- [ ] **Step 1: Create `hooks/usePlanModuleGrid.ts`**

```ts
'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useEventTypeModuleMatrix } from '@/hooks/useEventTypeModuleMatrix';
import { useModuleApplicabilityChange } from '@/hooks/useModuleApplicabilityChange';
import { usePlanModuleConfigs } from '@/hooks/usePlanModuleConfigs';
import { visibilityOf } from '@/lib/adminVisibility';
import type { EventTypeModuleApplicability, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { buildPlanModuleGrid, type PlanModuleCell } from '@/lib/planModuleGrid';

export type OpenCell = { cell: Extract<PlanModuleCell, { kind: 'included' | 'excluded' }>; anchor: HTMLElement };

export function usePlanModuleGrid({
    eventTypeKey,
    plans,
    modules,
    unlocks,
    moduleName,
}: {
    eventTypeKey: string;
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    unlocks: PaidServiceResponseDto[];
    moduleName: (moduleKey: string) => string;
}) {
    const [showHidden, setShowHidden] = useState(false);
    const [openCell, setOpenCell] = useState<OpenCell | null>(null);

    const columnPlans = useMemo(
        () => plans.filter((plan) => plan.eventTypeKey === eventTypeKey && (showHidden || visibilityOf(plan) === 'LIVE')),
        [eventTypeKey, plans, showHidden]
    );
    const planIds = useMemo(() => columnPlans.map((plan) => plan.id), [columnPlans]);

    const matrixQuery = useEventTypeModuleMatrix(eventTypeKey);
    const configs = usePlanModuleConfigs(planIds);
    const applicability = useModuleApplicabilityChange(eventTypeKey);

    const grid = useMemo(
        () =>
            buildPlanModuleGrid({
                modules,
                matrix: matrixQuery.data ?? [],
                plans: columnPlans,
                configsByPlanId: configs.configsByPlanId,
                unlocks,
            }),
        [columnPlans, configs.configsByPlanId, matrixQuery.data, modules, unlocks]
    );

    const toggleShowHidden = useCallback(() => setShowHidden((current) => !current), []);

    const requestApplicability = useCallback(
        (moduleKey: string, next: EventTypeModuleApplicability) => {
            const row = grid.rows.find((item) => item.moduleKey === moduleKey);
            if (!row) return;
            applicability.request({ moduleKey, moduleName: moduleName(moduleKey), before: row.applicability, after: next });
        },
        [applicability, grid.rows, moduleName]
    );

    const handleCellClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const { planId, moduleKey } = event.currentTarget.dataset;
            const row = grid.rows.find((item) => item.moduleKey === moduleKey);
            const cell = row?.cells.find((item) => item.planId === planId);
            if (!cell || cell.kind === 'unsupported') return;
            setOpenCell({ cell, anchor: event.currentTarget });
        },
        [grid.rows]
    );
    const closeCell = useCallback(() => setOpenCell(null), []);

    const openCellPlan = useMemo(() => (openCell ? columnPlans.find((plan) => plan.id === openCell.cell.planId) ?? null : null), [columnPlans, openCell]);

    return {
        grid,
        showHidden,
        toggleShowHidden,
        isLoading: matrixQuery.isLoading || configs.isLoading,
        error: matrixQuery.error ?? null,
        failedPlanIds: configs.failedPlanIds,
        applicability,
        requestApplicability,
        openCell,
        openCellPlan,
        handleCellClick,
        closeCell,
    };
}
```

- [ ] **Step 2: Create `components/admin/plans/PlanModuleGridCell.tsx`**

```tsx
'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { formatMoney } from '@/lib/billing';
import { formatConfigValue } from '@/lib/planModuleConfig';
import type { PlanModuleCell } from '@/lib/planModuleGrid';
import { cn } from '@/lib/utils';

export function PlanModuleGridCell({
    cell,
    failed,
    onClickAction,
}: {
    cell: PlanModuleCell;
    failed: boolean;
    onClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid');
    const locale = useLocale();

    if (cell.kind === 'unsupported') return <td className="px-2.5 py-2" />;
    if (failed) return <td className="px-2.5 py-2 text-[11px] text-status-danger">{t('columnError')}</td>;

    const tokens = Object.entries(cell.config).map(([key, value]) => `${key} ${formatConfigValue(value)}`);
    const unlockLabel =
        cell.kind === 'excluded' && cell.unlock
            ? cell.unlock.billingPeriod === 'ONE_TIME'
                ? t('unlockOnce', { price: formatMoney(cell.unlock.priceAmountMinor, cell.unlock.priceCurrency, locale) })
                : t('unlockMonthly', { price: formatMoney(cell.unlock.priceAmountMinor, cell.unlock.priceCurrency, locale) })
            : null;

    return (
        <td className="px-1 py-1 align-top">
            <button
                type="button"
                data-plan-id={cell.planId}
                data-module-key={cell.moduleKey}
                onClick={onClickAction}
                aria-label={cell.kind === 'included' ? t('included') : t('notIncluded')}
                className={cn(
                    'flex min-h-11 w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-canvas',
                    cell.kind === 'excluded' && 'text-ink-faint'
                )}
            >
                <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                    {cell.kind === 'included' ? <Check className="h-3.5 w-3.5 text-status-good" aria-hidden="true" /> : <span aria-hidden="true">—</span>}
                    {cell.kind === 'included' ? t('included') : unlockLabel ?? t('notIncluded')}
                </span>
                {cell.kind === 'included' && tokens.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                        {tokens.map((token) => (
                            <span key={token} className="rounded bg-canvas px-1 font-mono text-[10.5px] text-ink-muted">
                                {token}
                            </span>
                        ))}
                    </span>
                )}
            </button>
        </td>
    );
}
```

Check `formatMoney`'s signature in `lib/billing.ts` and match its parameter order; the existing `PlanEditorAddonsTab` calls it — copy that call form.

- [ ] **Step 3: Create `components/admin/plans/PlanModuleGridRow.tsx`**

```tsx
'use client';

import type { MouseEvent } from 'react';

import { ModuleApplicabilityPill } from '@/components/admin/plans/ModuleApplicabilityPill';
import { PlanModuleGridCell } from '@/components/admin/plans/PlanModuleGridCell';
import type { EventTypeModuleApplicability } from '@/lib/api/types';
import type { PlanModuleGridRow as GridRow } from '@/lib/planModuleGrid';
import { cn } from '@/lib/utils';

export function PlanModuleGridRow({
    row,
    moduleName,
    failedPlanIds,
    onRequestApplicabilityAction,
    onCellClickAction,
}: {
    row: GridRow;
    moduleName: string;
    failedPlanIds: string[];
    onRequestApplicabilityAction: (moduleKey: string, next: EventTypeModuleApplicability) => void;
    onCellClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const unsupported = row.applicability === 'UNSUPPORTED';

    return (
        <tr className={cn('border-b border-border last:border-b-0', unsupported && 'opacity-55')}>
            {/* Module */}
            <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left align-top">
                <p className="text-[13px] font-semibold text-ink">{moduleName}</p>
                <div className="mt-1">
                    <ModuleApplicabilityPill moduleKey={row.moduleKey} value={row.applicability} onRequestChangeAction={onRequestApplicabilityAction} />
                </div>
            </th>
            {/* Plan cells */}
            {row.cells.map((cell) => (
                <PlanModuleGridCell key={cell.planId} cell={cell} failed={failedPlanIds.includes(cell.planId)} onClickAction={onCellClickAction} />
            ))}
        </tr>
    );
}
```

- [ ] **Step 4: Create `components/admin/plans/PlanModuleGrid.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { PlanModuleConfigPopover } from '@/components/admin/plans/PlanModuleConfigPopover';
import { PlanModuleGridRow } from '@/components/admin/plans/PlanModuleGridRow';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanModuleGrid } from '@/hooks/usePlanModuleGrid';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanModuleGrid({
    eventType,
    plans,
    modules,
    unlocks,
}: {
    eventType: PlatformEventTypeResponseDto;
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    unlocks: PaidServiceResponseDto[];
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const moduleLabel = useLocalizedModuleLabel(modules);
    const moduleName = (moduleKey: string) => moduleLabel(moduleKey).name;
    const grid = usePlanModuleGrid({ eventTypeKey: eventType.eventTypeKey, plans, modules, unlocks, moduleName });
    const eventTypeName = localizedText(eventType.name, eventType.eventTypeKey);
    const pending = grid.applicability.pending;

    return (
        <section>
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h3 className="text-base font-semibold text-ink">{t('plans.grid.title')}</h3>
                    <p className="text-xs font-semibold text-ink-faint">
                        {t('plans.grid.count', { supported: grid.grid.supportedCount, unsupported: grid.grid.unsupportedCount })}
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-muted">
                    <input type="checkbox" checked={grid.showHidden} onChange={grid.toggleShowHidden} className="h-3.5 w-3.5 accent-primary" />
                    {t('plans.grid.showHidden')}
                </label>
            </div>

            {/* Grid */}
            <div className="rounded-xl border border-border bg-card">
                {grid.isLoading && <LoadingState label={t('plans.loading')} className="justify-start px-4 py-6" />}
                {grid.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(grid.error)}`)}</p>}
                {!grid.isLoading && !grid.error && grid.grid.columns.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('plans.grid.noPlans')}</p>}
                {!grid.isLoading && !grid.error && grid.grid.columns.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="sticky left-0 z-10 bg-card px-3 py-2 font-bold">{t('plans.grid.title')}</th>
                                    {grid.grid.columns.map(({ plan }) => (
                                        <th key={plan.id} className={cn('min-w-40 px-2.5 py-2 font-bold', !plan.isPublic && 'text-ink-faint/70')}>
                                            <span className="block truncate normal-case text-ink">{plan.name}</span>
                                            <span className="font-mono text-[10px] font-semibold normal-case text-ink-faint">{plan.code}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {grid.grid.rows.map((row) => (
                                    <PlanModuleGridRow
                                        key={row.moduleKey}
                                        row={row}
                                        moduleName={moduleName(row.moduleKey)}
                                        failedPlanIds={grid.failedPlanIds}
                                        onRequestApplicabilityAction={grid.requestApplicability}
                                        onCellClickAction={grid.handleCellClick}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Cell editor */}
            {grid.openCell && grid.openCellPlan && (
                <PlanModuleConfigPopover
                    key={`${grid.openCell.cell.planId}:${grid.openCell.cell.moduleKey}`}
                    cell={grid.openCell.cell}
                    plan={grid.openCellPlan}
                    moduleName={moduleName(grid.openCell.cell.moduleKey)}
                    anchor={grid.openCell.anchor}
                    onCloseAction={grid.closeCell}
                />
            )}

            {/* Applicability confirmation */}
            <ConfirmActionModal
                open={Boolean(pending)}
                onCloseAction={grid.applicability.cancel}
                title={pending ? t('plans.grid.applicability.confirmTitle', { module: pending.moduleName, eventType: eventTypeName }) : ''}
                body={
                    pending && (
                        <>
                            <p className="font-mono text-sm">
                                {t('plans.grid.applicability.confirmBody', {
                                    before: t(`plans.grid.applicability.${pending.before}`),
                                    after: t(`plans.grid.applicability.${pending.after}`),
                                })}
                            </p>
                            {pending.after === 'UNSUPPORTED' && <p className="mt-2 text-sm text-status-danger">{t('plans.grid.applicability.unsupportedWarning')}</p>}
                            {grid.applicability.error && (
                                <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(grid.applicability.error)}`)}</p>
                            )}
                        </>
                    )
                }
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.grid.applicability.confirm')}
                isConfirming={grid.applicability.isSaving}
                onConfirmAction={grid.applicability.confirm}
                tone={pending?.after === 'UNSUPPORTED' ? 'danger' : 'default'}
            />
        </section>
    );
}
```

- [ ] **Step 5: Mount it in `EventTypePlansPane.tsx`**

Replace `{/* Modules — added in Task 11 */}` with:

```tsx
            {/* Modules */}
            <PlanModuleGrid eventType={eventType} plans={section.plansForType} modules={section.modules} unlocks={section.unlocks} />
```

and import `PlanModuleGrid`.

- [ ] **Step 6: Type check, lint, commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add hooks/usePlanModuleGrid.ts components/admin/plans
git commit -m "Add per-event-type plan module grid.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Plan editor drawer — sections, anchors, scroll spy

**Files:**
- Create: `hooks/useScrollSpy.ts`, `components/admin/PlanEditorAnchors.tsx`, `PlanEditorModulesSummary.tsx`, `PlanEditorDetailsSection.tsx`, `PlanEditorAvailabilitySection.tsx`, `PlanEditorLimitsSection.tsx`, `PlanEditorPricingSection.tsx`, `PlanEditorAddonsSection.tsx`, `PlanEditorDangerSection.tsx`
- Modify: `components/admin/PlanEditorCard.tsx`, `PlanEditorHeader.tsx`, `hooks/usePlanEditorState.ts`, `hooks/usePlanEditorCard.ts`, `lib/adminPlanEditor.ts`
- Delete: `PlanEditorDetailsTab.tsx`, `PlanEditorLimitsTab.tsx`, `PlanEditorPricingTab.tsx`, `PlanEditorCoverageTab.tsx`, `PlanEditorAddonsTab.tsx`, `PlanEditorDangerTab.tsx`, `AdminTabs.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Create `hooks/useScrollSpy.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';

// Reports which of the given section ids is nearest the top of its scroll
// container. The container is found by walking up from the first section.
export function useScrollSpy(sectionIds: string[]) {
    const [active, setActive] = useState(sectionIds[0] ?? '');

    useEffect(() => {
        const first = sectionIds[0] ? document.getElementById(sectionIds[0]) : null;
        if (!first) return;
        let container: HTMLElement | null = first.parentElement;
        while (container && getComputedStyle(container).overflowY !== 'auto' && getComputedStyle(container).overflowY !== 'scroll') {
            container = container.parentElement;
        }
        if (!container) return;

        const target = container;
        function update() {
            const top = target.getBoundingClientRect().top + 80;
            let current = sectionIds[0] ?? '';
            for (const id of sectionIds) {
                const element = document.getElementById(id);
                if (element && element.getBoundingClientRect().top <= top) current = id;
            }
            setActive(current);
        }

        update();
        target.addEventListener('scroll', update, { passive: true });
        return () => target.removeEventListener('scroll', update);
    }, [sectionIds]);

    return active;
}
```

- [ ] **Step 2: Create `components/admin/PlanEditorAnchors.tsx`**

```tsx
'use client';

import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type PlanEditorAnchor = { id: string; label: string; tone?: 'default' | 'danger' };

export function PlanEditorAnchors({ anchors, active }: { anchors: PlanEditorAnchor[]; active: string }) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.anchorId;
        if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <nav className="sticky top-0 z-10 -mx-5 flex gap-1 overflow-x-auto border-b border-border bg-card px-5 py-2">
            {anchors.map((anchor) => (
                <button
                    key={anchor.id}
                    type="button"
                    data-anchor-id={anchor.id}
                    onClick={handleClick}
                    aria-current={active === anchor.id ? 'location' : undefined}
                    className={cn(
                        'shrink-0 rounded-md px-2.5 py-1 text-[12px] font-bold transition-colors',
                        active === anchor.id ? 'bg-primary-light text-primary-dark' : 'text-ink-faint hover:text-ink',
                        anchor.tone === 'danger' && active !== anchor.id && 'text-status-danger/70'
                    )}
                >
                    {anchor.label}
                </button>
            ))}
        </nav>
    );
}
```

- [ ] **Step 3: Create the section components**

Each section is `<section id={`${editorId}-<key>`} className="scroll-mt-14 pt-6 first:pt-4">` with a heading and the fields ported from the corresponding tab file. Port exactly the inputs (same `name` attributes) so `planPatchFromFormData` keeps working.

`components/admin/PlanEditorDetailsSection.tsx`
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

export function PlanEditorDetailsSection({
    id,
    plan,
    eventTypes,
    siblings,
    onOpenSiblingAction,
}: {
    id: string;
    plan: PlanTierResponseDto;
    eventTypes: PlatformEventTypeResponseDto[];
    siblings: PlanTierResponseDto[];
    onOpenSiblingAction?: (plan: PlanTierResponseDto) => void;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const eventType = eventTypes.find((item) => item.eventTypeKey === plan.eventTypeKey);

    return (
        <section id={id} className="scroll-mt-14 pt-4">
            {/* Details */}
            <h4 className="mb-3 text-sm font-bold text-ink">{t('plans.sections.details')}</h4>
            <div className="grid grid-cols-2 gap-3">
                <AdminField label={t('fields.name')} required className="col-span-2">
                    <input name="name" defaultValue={plan.name} required maxLength={100} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.description')} optional className="col-span-2">
                    <input name="description" defaultValue={plan.description ?? ''} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.sort')} optional>
                    <input name="sortOrder" type="number" min={0} defaultValue={plan.sortOrder} className={adminInputClass('max-w-24')} />
                </AdminField>
            </div>

            {/* Read-only identifiers */}
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="font-bold uppercase tracking-wide text-ink-muted">{t('fields.code')}</dt>
                <dd className="font-mono text-ink">{plan.code}</dd>
                {eventType && (
                    <>
                        <dt className="font-bold uppercase tracking-wide text-ink-muted">{t('plans.coverage.eventTypeLabel')}</dt>
                        <dd className="text-ink">{localizedText(eventType.name, eventType.eventTypeKey)}</dd>
                    </>
                )}
                {siblings.length > 0 && (
                    <>
                        <dt className="font-bold uppercase tracking-wide text-ink-muted">{t('plans.sharedGroup.label')}</dt>
                        <dd className="flex flex-wrap gap-1">
                            {siblings.map((sibling) => {
                                const siblingType = eventTypes.find((item) => item.eventTypeKey === sibling.eventTypeKey);
                                const label = siblingType ? localizedText(siblingType.name, siblingType.eventTypeKey) : sibling.code;
                                return onOpenSiblingAction ? (
                                    <button
                                        key={sibling.id}
                                        type="button"
                                        onClick={() => onOpenSiblingAction(sibling)}
                                        className="rounded-full bg-status-neutral-wash px-1.5 py-0.5 font-bold text-status-neutral hover:text-ink"
                                    >
                                        {label}
                                    </button>
                                ) : (
                                    <span key={sibling.id} className="rounded-full bg-status-neutral-wash px-1.5 py-0.5 font-bold text-status-neutral">
                                        {label}
                                    </span>
                                );
                            })}
                        </dd>
                    </>
                )}
            </dl>
        </section>
    );
}
```

`components/admin/PlanEditorAvailabilitySection.tsx`
```tsx
'use client';

import { useTranslations } from 'next-intl';

import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import type { Visibility } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanEditorAvailabilitySection({
    id,
    plan,
    visibility,
    isMakingDefault,
    onVisibilityChangeAction,
    onMakeDefaultAction,
}: {
    id: string;
    plan: PlanTierResponseDto;
    visibility: Visibility;
    isMakingDefault: boolean;
    onVisibilityChangeAction: (next: Visibility) => void;
    onMakeDefaultAction: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Availability */}
            <h4 className="mb-3 text-sm font-bold text-ink">{t('plans.sections.availability')}</h4>
            <VisibilitySegmentedControl
                title={t('fields.visibility')}
                value={visibility}
                onChangeAction={onVisibilityChangeAction}
                labels={{ LIVE: t('fields.visibilityLive'), HIDDEN: t('fields.visibilityHidden'), ARCHIVED: t('fields.visibilityArchived') }}
                hints={{ LIVE: t('fields.visibilityLiveHint'), HIDDEN: t('fields.visibilityHiddenHint'), ARCHIVED: t('fields.visibilityArchivedHint') }}
            />

            {/* Default */}
            {!plan.isDefault && (
                <button
                    type="button"
                    onClick={onMakeDefaultAction}
                    disabled={isMakingDefault}
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-primary/40 bg-primary-light px-3 text-sm font-bold text-primary-dark transition hover:border-primary disabled:opacity-50"
                >
                    {t('plans.makeDefault')}
                </button>
            )}
        </section>
    );
}
```

`components/admin/PlanEditorLimitsSection.tsx` — same fields as `PlanEditorLimitsTab` (storageAmount, storageUnit, maxMembers, autoDeleteMonths), wrapped in `<section id={id} className="scroll-mt-14 pt-6">` with `<h4 className="mb-1 text-sm font-bold text-ink">{t('plans.sections.limits')}</h4>` and the existing `limitsHint` paragraph. Props: `{ id: string; plan: PlanTierResponseDto }` (scope is always EVENT now; drop the `isEvent` branch and the account-quotas message).

`components/admin/PlanEditorPricingSection.tsx` — same fields as `PlanEditorPricingTab`, wrapped in `<section id={id} className="scroll-mt-14 pt-6">` with heading `t('plans.sections.pricing')`; keep the nested `AdminSection` for Promotion. Props: `{ id: string; plan: PlanTierResponseDto }`.

`components/admin/PlanEditorAddonsSection.tsx` — copy `PlanEditorAddonsTab.tsx` verbatim, rename the component, replace the outer `<AdminTabPanel …>` with `<section id={id} className="scroll-mt-14 pt-6">` plus `<h4 className="mb-3 text-sm font-bold text-ink">{t('plans.sections.addons')}</h4>`, and replace the `editorId`/`activeTab` props with `id: string`.

`components/admin/PlanEditorDangerSection.tsx` — same as `PlanEditorDangerTab` body, wrapped in `<section id={id} className="scroll-mt-14 pt-6 pb-2">` with heading `t('plans.sections.danger')`; props `{ id: string; isDeleting: boolean; onDeleteOpenAction: () => void }`. Change the hint paragraph to `t('plans.archiveInsteadHint')`.

`components/admin/PlanEditorModulesSummary.tsx`
```tsx
'use client';

import { useTranslations } from 'next-intl';

export function PlanEditorModulesSummary({ id, included, total, onOpenGridAction }: { id: string; included: number; total: number; onOpenGridAction: () => void }) {
    const t = useTranslations('AdminPage.plans');

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Modules */}
            <h4 className="mb-2 text-sm font-bold text-ink">{t('sections.modules')}</h4>
            <p className="text-sm text-ink-muted">
                {t('coverage.modulesCount', { count: included, total })}{' '}
                <button type="button" onClick={onOpenGridAction} className="font-semibold text-primary-dark underline-offset-2 hover:underline">
                    {t('editInGrid')}
                </button>
            </p>
        </section>
    );
}
```

- [ ] **Step 4: Update `hooks/usePlanEditorState.ts`**

Remove `tab`, `setTab`, `tabs`, the `AdminTabDefinition` import, `moduleKeysDraft`, `setModuleKeysDraft`, `modulesDirty`, `toggleModule`, and `sameMembers`. `changeCount` becomes `planChangeCount`. The hook now returns:

```ts
    return {
        formRef,
        visibility,
        setVisibility,
        planChangeCount,
        setPlanChangeCount,
        unlockDraft,
        setUnlockDraft,
        orderedModules,
        orderedEventTypes,
        changeCount: planChangeCount,
        canSave: planChangeCount > 0,
        isEvent,
        handleFormChange,
        handleVisibilityChange,
    };
```

- [ ] **Step 5: Update `hooks/usePlanEditorCard.ts`**

- Remove `useSetPlanModules`, `membershipDelta`, `PlanMembershipChange`, `moduleLabel` usage in `handleSubmit`, and the `moduleKeys` handling in `handleSaveConfirm`. `pendingSave` is now `{ patch, changes, memberships: [], moduleKeys: null }` (keep the `PendingPlanSave` shape so `PlanSaveSummary` is untouched).
- Add `onOpenGridAction?: () => void` and `onOpenSiblingAction?: (plan: PlanTierResponseDto) => void` to `UsePlanEditorCardArgs` and pass them through in the return.
- Add `siblings`: `eventPlans.filter((other) => other.sharedGroupKey && other.sharedGroupKey === plan.sharedGroupKey && other.id !== plan.id)`.
- Add `anchors` built with `t`:

```ts
    const editorId = `plan-editor-${plan.id}`;
    const anchors = [
        { id: `${editorId}-details`, label: t('plans.sections.details') },
        { id: `${editorId}-availability`, label: t('plans.sections.availability') },
        { id: `${editorId}-limits`, label: t('plans.sections.limits') },
        { id: `${editorId}-pricing`, label: t('plans.sections.pricing') },
        { id: `${editorId}-modules`, label: t('plans.sections.modules') },
        { id: `${editorId}-addons`, label: t('plans.sections.addons') },
        { id: `${editorId}-danger`, label: t('plans.sections.danger'), tone: 'danger' as const },
    ];
    const anchorIds = useMemo(() => anchors.map((anchor) => anchor.id), [plan.id]); // eslint-disable-line react-hooks/exhaustive-deps
    const activeAnchor = useScrollSpy(anchorIds);
```

(Compute `anchorIds` from `editorId` and the fixed suffix list inside `useMemo` rather than from `anchors` so the dependency is honest: `useMemo(() => SECTION_KEYS.map((key) => \`${editorId}-${key}\`), [editorId])` with `const SECTION_KEYS = ['details','availability','limits','pricing','modules','addons','danger'] as const;` at module scope — do that instead of the eslint-disable.)

- Return `anchors`, `activeAnchor`, `siblings`, `onOpenGridAction`, `onOpenSiblingAction`, and drop `tabs`, `tab`, `setTab`, `moduleKeysDraft`, `modulesDirty`, `toggleModule`.

- [ ] **Step 6: Rewrite `PlanEditorCard.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { PlanEditorAddonsSection } from '@/components/admin/PlanEditorAddonsSection';
import { PlanEditorAnchors } from '@/components/admin/PlanEditorAnchors';
import { PlanEditorAvailabilitySection } from '@/components/admin/PlanEditorAvailabilitySection';
import { PlanEditorDangerSection } from '@/components/admin/PlanEditorDangerSection';
import { PlanEditorDetailsSection } from '@/components/admin/PlanEditorDetailsSection';
import { PlanEditorFooter } from '@/components/admin/PlanEditorFooter';
import { PlanEditorHeader } from '@/components/admin/PlanEditorHeader';
import { PlanEditorLimitsSection } from '@/components/admin/PlanEditorLimitsSection';
import { PlanEditorModulesSummary } from '@/components/admin/PlanEditorModulesSummary';
import { PlanEditorPricingSection } from '@/components/admin/PlanEditorPricingSection';
import { PlanSaveSummary } from '@/components/admin/PlanSaveSummary';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePlanEditorCard, type UsePlanEditorCardArgs } from '@/hooks/usePlanEditorCard';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PlanEditorCard(props: UsePlanEditorCardArgs) {
    const t = useTranslations('AdminPage');
    const editor = usePlanEditorCard(props);
    const { plan } = props;
    const editorId = editor.editorId;

    return (
        <article className="min-w-0">
            {/* Header */}
            <PlanEditorHeader plan={plan} />

            {/* Anchors */}
            <PlanEditorAnchors anchors={editor.anchors} active={editor.activeAnchor} />

            {/* Form */}
            <form ref={editor.formRef} id={`${editorId}-form`} onSubmit={editor.handleSubmit} onChange={editor.handleFormChange}>
                <PlanEditorDetailsSection
                    id={`${editorId}-details`}
                    plan={plan}
                    eventTypes={editor.orderedEventTypes}
                    siblings={editor.siblings}
                    onOpenSiblingAction={editor.onOpenSiblingAction}
                />
                <PlanEditorAvailabilitySection
                    id={`${editorId}-availability`}
                    plan={plan}
                    visibility={editor.visibility}
                    isMakingDefault={editor.updatePlan.mutation.isPending}
                    onVisibilityChangeAction={editor.handleVisibilityChange}
                    onMakeDefaultAction={editor.handleMakeDefaultClick}
                />
                <PlanEditorLimitsSection id={`${editorId}-limits`} plan={plan} />
                <PlanEditorPricingSection id={`${editorId}-pricing`} plan={plan} />
                <PlanEditorModulesSummary
                    id={`${editorId}-modules`}
                    included={plan.moduleKeys.length}
                    total={editor.orderedModules.length}
                    onOpenGridAction={editor.onOpenGridAction ?? (() => undefined)}
                />
                <PlanEditorAddonsSection
                    id={`${editorId}-addons`}
                    plan={plan}
                    orderedModules={editor.orderedModules}
                    moduleUnlocks={editor.moduleUnlocks}
                    unlockDraft={editor.unlockDraft}
                    onOpenUnlockEditorAction={editor.openUnlockEditor}
                    onCloseUnlockEditorAction={editor.closeUnlockEditor}
                    onUpdateUnlockDraftAction={editor.updateUnlockDraft}
                    onCreateUnlockAction={editor.handleCreateUnlockClick}
                    canCreateUnlock={editor.canCreateUnlock}
                    isCreatingUnlock={editor.createPaidService.mutation.isPending}
                    onUnlockAction={editor.handleUnlockAction}
                    isUpdatingUnlocks={editor.updatePaidService.mutation.isPending}
                />
                <PlanEditorDangerSection id={`${editorId}-danger`} isDeleting={editor.deletePlan.mutation.isPending} onDeleteOpenAction={editor.handleDeleteOpenClick} />
            </form>

            {/* Footer */}
            <PlanEditorFooter footerSlot={editor.footerSlot} formId={`${editorId}-form`} canSave={editor.canSave} isSaving={editor.isSaving} changeCount={editor.changeCount} />

            {/* Error */}
            {editor.error && <p className="mt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(editor.error)}`)}</p>}

            {/* Confirmations */}
            <ConfirmActionModal
                open={editor.makeDefaultOpen}
                onCloseAction={editor.handleMakeDefaultClose}
                title={t('plans.makeDefaultConfirmTitle', { plan: plan.name })}
                body={t('plans.makeDefaultConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.makeDefault')}
                isConfirming={editor.updatePlan.mutation.isPending}
                onConfirmAction={editor.handleMakeDefaultConfirm}
                tone="default"
            />
            <ConfirmActionModal
                open={Boolean(editor.pendingSave)}
                onCloseAction={editor.handleSaveClose}
                title={t('plans.saveConfirmTitle', { plan: plan.name })}
                body={<PlanSaveSummary pendingSave={editor.pendingSave} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={editor.isSaving}
                onConfirmAction={editor.handleSaveConfirm}
                tone="default"
                size="md"
            />
            <ConfirmActionModal
                open={editor.deleteOpen}
                onCloseAction={editor.handleDeleteClose}
                title={t('plans.deleteConfirmTitle', { plan: plan.name })}
                body={t('plans.deleteConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.delete')}
                isConfirming={editor.deletePlan.mutation.isPending}
                onConfirmAction={editor.handleDeleteConfirm}
            />
        </article>
    );
}
```

- [ ] **Step 7: Simplify `PlanEditorHeader.tsx`**

Props become `{ plan: PlanTierResponseDto }`. Remove the `Make default` button and the summary pill row (price/members/storage — they are visible in the table and edited below). Keep name, `code` (render with `font-mono`), Default pill, Archived pill.

- [ ] **Step 8: Wire `onOpenGridAction` and `onOpenSiblingAction` in `EventTypePlansPane.tsx`**

- Give the module grid section an id: in `PlanModuleGrid.tsx` add `id="plan-module-grid"` to the outer `<section>`.
- In `useEventTypePlansPane`, add:

```ts
    const openGridFromEditor = useCallback(() => {
        setSelectedPlanId(null);
        requestAnimationFrame(() => document.getElementById('plan-module-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, []);
```

and return it. In the pane, pass `onOpenGridAction={pane.openGridFromEditor}` and `onOpenSiblingAction={(sibling) => { if (sibling.eventTypeKey) section.selectEventType(sibling.eventTypeKey); }}` — move that lambda into the hook as `openSibling` taking `(sibling: PlanTierResponseDto)` and receiving `selectEventType` as a hook argument: `useEventTypePlansPane(plans, selectEventType)`.

- [ ] **Step 9: Delete the tab files and `AdminTabs`, clean `lib/adminPlanEditor.ts`**

```bash
git rm components/admin/PlanEditorDetailsTab.tsx components/admin/PlanEditorLimitsTab.tsx components/admin/PlanEditorPricingTab.tsx components/admin/PlanEditorCoverageTab.tsx components/admin/PlanEditorAddonsTab.tsx components/admin/PlanEditorDangerTab.tsx components/admin/AdminTabs.tsx
```

Run `grep -rn "AdminTabs\|UnderlineTabs" components hooks app` — if `UnderlineTabs` has no remaining consumer, also `git rm components/ui/UnderlineTabs.tsx`; otherwise leave it.

In `lib/adminPlanEditor.ts`, `membershipDelta` and `PlanMembershipChange` are now unused unless `PlanSaveSummary` renders `memberships`; keep the type (it does) and remove `membershipDelta` only if `grep -rn membershipDelta` finds no callers.

- [ ] **Step 10: Translations**

Add under `AdminPage.plans` in `en.json`: `"editInGrid": "Edit in the modules grid"`, `"archiveInsteadHint": "To retire a plan that is in use, set it to Archived under Availability."`; under `AdminPage.plans.sections`: `"details": "Details"`, `"addons": "Add-ons"`, `"danger": "Danger zone"`, `"modules": "Modules"`. Remove `AdminPage.plans.tabs` and `AdminPage.plans.coverage.changed`, `AdminPage.plans.coverage.sharedGroupLabel`, `AdminPage.plans.sections.modulesHint`, `AdminPage.plans.sections.eventTypesHint` after grepping that nothing else uses them. Add `AdminPage.fields.code: "Code"` if not present.

`el.json`: `"editInGrid": "Επεξεργασία στον πίνακα ενοτήτων"`, `"archiveInsteadHint": "Για να αποσύρετε ένα πλάνο που χρησιμοποιείται, ορίστε το ως Αρχειοθετημένο στη Διαθεσιμότητα."`, sections `"details": "Στοιχεία"`, `"addons": "Πρόσθετα"`, `"danger": "Επικίνδυνη ζώνη"`, `"modules": "Ενότητες"`; `fields.code: "Κωδικός"` if missing.

- [ ] **Step 11: Type check, lint, tests, commit**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`

```bash
git add -A components/admin hooks lib/adminPlanEditor.ts messages
git commit -m "Flatten the plan editor drawer into anchored sections.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Create form — preselected, locked event type

**Files:**
- Modify: `components/admin/PlanCreateForm.tsx`
- Modify: `components/admin/PlanCreateAssignments.tsx`
- Modify: `components/admin/plans/EventTypePlansPane.tsx`

- [ ] **Step 1: Add `initialEventTypeKey` to `PlanCreateForm`**

Add prop `initialEventTypeKey?: EventTypeConvention | null` to `PlanCreateForm` and `PlanCreateNewForm`, and call `usePlanCreateAssignments(eventTypes, modules, initialEventTypeKey ?? null)`.

- [ ] **Step 2: Lock the select in `PlanCreateAssignments`**

Add prop `eventTypeLocked?: boolean`. When true, render the select `disabled` and add a hidden `<input type="hidden" name="eventTypeKey" value={eventTypeKey ?? ''} />` is **not** needed — the create payload reads `assignments.eventTypeKey` from state, not FormData. Just pass `disabled={eventTypeLocked}` to the select.

- [ ] **Step 3: Wire it in `EventTypePlansPane.tsx`**

Pass `initialEventTypeKey={eventType.eventTypeKey}` to `PlanCreateForm`, and in `PlanCreateNewForm` forward `eventTypeLocked={Boolean(initialEventTypeKey)}` to `PlanCreateAssignments`.

- [ ] **Step 4: Duplicate defaults**

In `PlanDuplicateForm`, `makeCloneRow()` currently starts empty. Leave it; the available-types filter already excludes the source type and types used by other rows. (Preselecting types without a sibling in the shared group is a nicety; skip — YAGNI.) Update the spec line if you skip it: note in the PR description.

- [ ] **Step 5: Type check, lint, commit**

```bash
git add components/admin/PlanCreateForm.tsx components/admin/PlanCreateAssignments.tsx components/admin/plans/EventTypePlansPane.tsx
git commit -m "Preselect and lock the event type when creating a plan from its pane.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Cleanup, stale keys, visual verification

**Files:**
- Modify: `messages/en.json`, `messages/el.json`
- Verify: everything

- [ ] **Step 1: Stale references**

Run each and fix anything found:

```bash
grep -rn "PlanCatalogPanel\|PlanEditorCoverageTab\|PlanEditor[A-Za-z]*Tab\b\|AdminTabPanel\|'eventPlans'\|'modules' as AdminTab" components hooks app lib
grep -rn "plans.tabs\.\|plans.stats\.\|plans.panel\.\|plans.rowCount" components hooks app lib
```

- [ ] **Step 2: Translation parity**

Run a quick key diff between `en.json` and `el.json` for `AdminPage.plans` and `AdminPage.tabs` (a small node one-liner in the scratchpad that loads both and prints keys present in one but not the other). Fix until both match.

- [ ] **Step 3: Full checks**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all clean.

- [ ] **Step 4: Visual verification**

Start the dev server (`preview_start` with `storywall-dev`), sign in as an admin in the browser pane (the user must enter credentials), and open `/admin#plans`. Confirm at desktop width:
- rail lists event types with live counts; Settings group below a divider;
- selecting a type updates the hash to `#plans/<KEY>` and shows header, status filter with counts, plans table, module grid;
- clicking an applicability pill opens the confirmation modal and nothing is sent until Confirm (check `read_network_requests` for the PATCH only after confirm);
- clicking a grid cell opens the popover; Save opens the confirmation; Cancel sends nothing;
- editing a plan opens the drawer with anchors; scrolling updates the active anchor; Save opens the summary modal;
- `#modules` and `#event-types` legacy hashes land on the Settings views.
Then check a narrow width (`resize_window` mobile) for horizontal overflow beyond the intended `overflow-x-auto` tables and for the rail stacking above the pane. Take screenshots of both and share them.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Finish admin plans redesign cleanup.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
