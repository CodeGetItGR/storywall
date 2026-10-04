# Member roles A: contract, admin catalog, plan config UI, plan card line — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the frontend half of member roles that must land with the backend release: contract types, the breaking member payload change, the admin role catalog editor, a JSON-free plan module settings popover, the plan card role line and role labels on the home cards.

**Architecture:** Pure logic (label resolution, drafts, payloads, reorder planning) lives in `lib/memberRoles.ts` and `lib/planModuleConfig.ts` and is unit tested. React Query hooks in `hooks/` own server calls and screen state. Components under `components/admin/memberRoles/` and `components/admin/plans/` are render shells.

**Tech Stack:** Next.js App Router, React 19, TanStack Query, next-intl, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-03-member-roles-a-contract-admin-design.md`
**Backend contract:** `C:\Users\User\IdeaProjects\event_social_media\docs\fe-guides\member-roles-fe-integration.md`

**One deliberate change from the spec:** on a 404 while saving, the drawer stays open with "This role no longer exists." and the list refetches, instead of closing. The admin has no toast system, so closing would hide the message.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `lib/api/types.ts` | modify | `member_roles` key, catalog DTOs, config field, breaking DTO removal |
| `lib/api/endpoints.ts` | modify | `admin.memberRoles` paths |
| `lib/planModules.tsx` | modify | icon and fallback copy for `member_roles` |
| `lib/demo/mockHandlers.ts` | modify | stop reading removed body fields |
| `lib/memberRoles.ts` | create | label resolution, counts, drafts, validation, payloads, filter, reorder plan |
| `lib/memberRoles.test.ts` | create | tests for the above |
| `hooks/useAppConfig.ts` | modify | `useMemberRoleCatalog()` selector |
| `hooks/useMemberRoleLabel.ts` | create | a member's role label for one event |
| `components/home/EventsQuickRow.tsx`, `components/home/HomeNextEventCard.tsx` | modify | use the label hook |
| `lib/landingPricing.ts` (+ test) | modify | `member_roles` card line |
| `hooks/usePlanMarketingCopy.ts`, `hooks/useLandingPricingPlans.ts`, `hooks/useMarketingPlanOptions.ts` | modify | copy and catalog wiring |
| `lib/planModuleConfig.ts` (+ test) | modify | field labels, `allowCustom`, limited keys, readable change list |
| `components/admin/AdminLimitControl.tsx` | create | shared Unlimited / Up to N control |
| `hooks/usePlanModuleCellDraft.ts` | modify | limit mode, switch changes, readable changes |
| `components/admin/plans/PlanModuleConfigFields.tsx`, `PlanModuleConfigField.tsx` (create), `PlanModuleConfigAdvanced.tsx` (create), `PlanModuleConfigPopover.tsx`, `PlanModuleChangeList.tsx` | modify/create | JSON-free popover |
| `hooks/useAdminMemberRoles.ts` | create | admin catalog queries and mutations |
| `hooks/useMemberRolesCatalog.ts` | create | panel state |
| `hooks/useMemberRoleDrawer.ts` | create | drawer form state |
| `components/admin/memberRoles/*` | create | panel, table, row, drawer |
| `lib/adminPlansRouting.ts` (+ test), `hooks/usePlansSection.ts`, `components/admin/plans/PlansRail.tsx`, `components/admin/plans/PlansSection.tsx`, `components/admin/plans/PlansSettingsMemberRoles.tsx` (create) | modify/create | Settings → Member roles navigation |
| `messages/en.json`, `messages/el.json` | modify | all copy |

Commands used throughout:

- single test file: `npx vitest run <path>`
- types: `npx tsc --noEmit`
- lint: `npm run lint`

---

### Task 0: Branch

- [ ] **Step 1: Create the feature branch from staging**

```bash
git checkout staging
git pull
git checkout -b feat/member-roles-a
```

---

### Task 1: Contract types and the breaking change

**Files:**
- Modify: `lib/api/types.ts` (line 22 `EVENT_MODULE_KEYS`, `AppConfigResponseDto` ~line 341, `EventMemberRequestDto` ~1833, `EventMemberPatchDto` ~1865)
- Modify: `lib/api/endpoints.ts` (inside `admin: {`, next to `reactionTypes`)
- Modify: `lib/planModules.tsx`
- Modify: `lib/demo/mockHandlers.ts:327-328`

- [ ] **Step 1: Add the module key**

In `lib/api/types.ts` replace line 22:

```ts
export const EVENT_MODULE_KEYS = ['posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook', 'co_hosts', 'schedule', 'member_roles'] as const;
```

- [ ] **Step 2: Add the catalog DTOs**

In `lib/api/types.ts`, directly above `export interface AppConfigResponseDto {`, add:

```ts
// member-roles-fe-integration.md §5.1 and §9. One role in an event type's
// admin-managed catalog. Retired roles stay listed because members may hold them.
export interface MemberRoleCatalogDto {
    id: string;
    eventTypeKey: string;
    roleKey: string;
    label: { en: string; el: string };
    emoji: string | null;
    maxHolders: number | null;
    sortOrder: number;
    retired: boolean;
}

// POST /api/admin/member-roles. roleKey and eventTypeKey can't change later.
export interface MemberRoleCatalogRequestDto {
    eventTypeKey: string;
    roleKey: string;
    label: { en: string; el: string };
    emoji?: string | null;
    maxHolders?: number | null;
    sortOrder: number;
}

// PATCH /api/admin/member-roles/{id}. Omitted fields stay as they are;
// emoji "" clears it; clearMaxHolders wins over maxHolders.
export interface MemberRoleCatalogPatchDto {
    label?: { en: string; el: string };
    emoji?: string;
    maxHolders?: number;
    clearMaxHolders?: boolean;
    sortOrder?: number;
}
```

In `AppConfigResponseDto`, after `reactionTypesByEventType: Record<string, ReactionTypeResponseDto[]>;` add:

```ts
    memberRolesByEventType: Record<string, MemberRoleCatalogDto[]>;
```

- [ ] **Step 3: Remove the role fields from the member request bodies**

In `EventMemberRequestDto` delete these two lines:

```ts
    relationshipRole?: string;
    customRelationshipRole?: string;
```

In `EventMemberPatchDto` delete the same two lines. Leave `EventMemberResponseDto` as it is, and add this comment above its `relationshipRole` line:

```ts
    // A catalog roleKey (resolve with lib/memberRoles.ts) and free text. Both
    // null when the member_roles module is off. Set only with PUT …/role.
```

- [ ] **Step 4: Endpoints**

In `lib/api/endpoints.ts`, inside `admin: {`, after the `reactionTypes` block add:

```ts
        memberRoles: {
            collection: '/api/admin/member-roles',
            list: (eventTypeKey: string) => `/api/admin/member-roles?eventTypeKey=${encodeURIComponent(eventTypeKey)}`,
            byId: (id: string) => `/api/admin/member-roles/${id}`,
            retire: (id: string) => `/api/admin/member-roles/${id}/retire`,
            unretire: (id: string) => `/api/admin/member-roles/${id}/unretire`,
        },
```

- [ ] **Step 5: Module meta**

In `lib/planModules.tsx` change the lucide import to add `Tags`:

```ts
import { BookHeart, CalendarCheck, Gift, HelpCircle, Images, MessageSquareText, Music, Tags } from 'lucide-react';
```

Add to `moduleIcons`:

```ts
    member_roles: Tags,
```

Add to `moduleFallbacks`:

```ts
    member_roles: {
        name: 'Member roles',
        description: 'Guests pick a role, like best man, shown next to their name.',
    },
```

- [ ] **Step 6: Demo handler**

In `lib/demo/mockHandlers.ts` replace lines 327-328:

```ts
            relationshipRole: null,
            customRelationshipRole: null,
```

- [ ] **Step 7: Type-check and fix fallout**

Run: `npx tsc --noEmit`

Expected errors and fixes:
- Any object literal typed `AppConfigResponseDto` (test fixtures, demo config) is missing `memberRolesByEventType`: add `memberRolesByEventType: {},` to each.
- Any `Record<ModuleKeyConvention, …>` is missing `member_roles`: add an entry matching that record's neighbours (for copy records, use the `Modules.member_roles` wording from Task 9).
- Any code still sending `relationshipRole` / `customRelationshipRole` in a request: delete those properties.

Re-run until it prints nothing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(member-roles): contract types, admin endpoints, drop role fields from member bodies"
```

---

### Task 2: `lib/memberRoles.ts` — labels and counts

**Files:**
- Create: `lib/memberRoles.ts`
- Test: `lib/memberRoles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/memberRoles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { MemberRoleCatalogDto } from '@/lib/api/types';
import { activeRoleCount, memberRoleLabel } from '@/lib/memberRoles';

function makeRole(overrides: Partial<MemberRoleCatalogDto> = {}): MemberRoleCatalogDto {
    return {
        id: 'r1',
        eventTypeKey: 'WEDDING',
        roleKey: 'BEST_MAN',
        label: { en: 'Best man', el: 'Κουμπάρος' },
        emoji: null,
        maxHolders: null,
        sortOrder: 0,
        retired: false,
        ...overrides,
    };
}

const CATALOG = {
    WEDDING: [
        makeRole(),
        makeRole({ id: 'r2', roleKey: 'MAID', label: { en: 'Maid of honour', el: '' }, emoji: '💐', sortOrder: 1 }),
        makeRole({ id: 'r3', roleKey: 'OLD', label: { en: 'Old', el: 'Παλιός' }, retired: true, sortOrder: 2 }),
    ],
};

describe('memberRoleLabel', () => {
    it('returns custom text as is', () => {
        expect(memberRoleLabel({ roleKey: null, customRole: 'Uncle from Melbourne', eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'el' })).toBe(
            'Uncle from Melbourne',
        );
    });

    it('resolves a catalog key in the current locale', () => {
        expect(memberRoleLabel({ roleKey: 'BEST_MAN', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'el' })).toBe('Κουμπάρος');
    });

    it('falls back to English and prefixes the emoji', () => {
        expect(memberRoleLabel({ roleKey: 'MAID', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'el' })).toBe('💐 Maid of honour');
    });

    it('still resolves a retired role', () => {
        expect(memberRoleLabel({ roleKey: 'OLD', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'en' })).toBe('Old');
    });

    it('returns null for an unknown key, a missing event type or no role', () => {
        expect(memberRoleLabel({ roleKey: 'NOPE', customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'en' })).toBeNull();
        expect(memberRoleLabel({ roleKey: 'BEST_MAN', customRole: null, eventTypeKey: null, catalog: CATALOG, locale: 'en' })).toBeNull();
        expect(memberRoleLabel({ roleKey: null, customRole: null, eventTypeKey: 'WEDDING', catalog: CATALOG, locale: 'en' })).toBeNull();
    });
});

describe('activeRoleCount', () => {
    it('counts roles that are not retired', () => {
        expect(activeRoleCount(CATALOG, 'WEDDING')).toBe(2);
    });

    it('is 0 for an unknown or missing event type', () => {
        expect(activeRoleCount(CATALOG, 'BIRTHDAY')).toBe(0);
        expect(activeRoleCount(CATALOG, null)).toBe(0);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/memberRoles.test.ts`
Expected: FAIL, cannot resolve `@/lib/memberRoles`.

- [ ] **Step 3: Implement**

Create `lib/memberRoles.ts`:

```ts
import type { Locale } from '@/i18n/config';
import type { MemberRoleCatalogDto } from '@/lib/api/types';

// /api/config memberRolesByEventType: each event type's role catalog,
// retired roles included (member-roles-fe-integration.md §5.1).
export type MemberRoleCatalog = Record<string, MemberRoleCatalogDto[]>;

// A member's role as display text: custom text as typed, or the catalog
// label in the locale (English fallback) with its emoji. Null when there's
// nothing to show — an unknown key renders nothing rather than the raw key.
export function memberRoleLabel({
    roleKey,
    customRole,
    eventTypeKey,
    catalog,
    locale,
}: {
    roleKey: string | null;
    customRole: string | null;
    eventTypeKey: string | null | undefined;
    catalog: MemberRoleCatalog;
    locale: Locale;
}): string | null {
    if (customRole) return customRole;
    if (!roleKey || !eventTypeKey) return null;
    const role = catalog[eventTypeKey]?.find((item) => item.roleKey === roleKey);
    if (!role) return null;
    const label = role.label[locale] || role.label.en;
    return role.emoji ? `${role.emoji} ${label}` : label;
}

export function activeRoleCount(catalog: MemberRoleCatalog, eventTypeKey: string | null): number {
    if (!eventTypeKey) return 0;
    return (catalog[eventTypeKey] ?? []).filter((role) => !role.retired).length;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/memberRoles.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/memberRoles.ts lib/memberRoles.test.ts
git commit -m "feat(member-roles): resolve role labels and count active roles"
```

---

### Task 3: `lib/memberRoles.ts` — admin drafts, validation, payloads, filter, reorder

**Files:**
- Modify: `lib/memberRoles.ts`
- Test: `lib/memberRoles.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/memberRoles.test.ts` (and extend the import from `@/lib/memberRoles` with `buildCreatePayload, buildPatchPayload, draftFromRole, filterRoles, isValidRoleKey, nextSortOrder, normalizeRoleKeyInput, planRoleMove, sortRoles, validateRoleDraft`):

```ts
describe('role keys', () => {
    it('uppercases input and turns spaces into underscores', () => {
        expect(normalizeRoleKeyInput('best man')).toBe('BEST_MAN');
    });

    it('accepts the backend pattern only', () => {
        expect(isValidRoleKey('BEST_MAN')).toBe(true);
        expect(isValidRoleKey('B')).toBe(false);
        expect(isValidRoleKey('1ST')).toBe(false);
        expect(isValidRoleKey(`A${'B'.repeat(50)}`)).toBe(false);
    });
});

describe('validateRoleDraft', () => {
    it('flags every bad field on create', () => {
        const draft = { roleKey: 'x', labelEn: ' ', labelEl: 'a'.repeat(41), emoji: 'e'.repeat(17), limited: true, maxHolders: '0' };
        expect(validateRoleDraft(draft, true)).toEqual({ roleKey: true, labelEn: true, labelEl: true, emoji: true, maxHolders: true });
    });

    it('skips the key on edit and ignores the number when unlimited', () => {
        const draft = { roleKey: '', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '', limited: false, maxHolders: '' };
        expect(validateRoleDraft(draft, false)).toEqual({});
    });
});

describe('buildCreatePayload', () => {
    it('trims, omits a blank emoji and an unlimited cap', () => {
        const draft = { roleKey: 'BEST_MAN', labelEn: ' Best man ', labelEl: 'Κουμπάρος', emoji: ' ', limited: false, maxHolders: '' };
        expect(buildCreatePayload(draft, 'WEDDING', 3)).toEqual({
            eventTypeKey: 'WEDDING',
            roleKey: 'BEST_MAN',
            label: { en: 'Best man', el: 'Κουμπάρος' },
            sortOrder: 3,
        });
    });

    it('sends emoji and cap when set', () => {
        const draft = { roleKey: 'BEST_MAN', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '🤵', limited: true, maxHolders: '2' };
        expect(buildCreatePayload(draft, 'WEDDING', 0)).toMatchObject({ emoji: '🤵', maxHolders: 2 });
    });
});

describe('buildPatchPayload', () => {
    it('sends nothing when nothing changed', () => {
        const role = makeRole({ emoji: '🤵', maxHolders: 2 });
        expect(buildPatchPayload(role, draftFromRole(role))).toEqual({});
    });

    it('clears emoji with "" and the cap with clearMaxHolders', () => {
        const role = makeRole({ emoji: '🤵', maxHolders: 2 });
        const draft = { ...draftFromRole(role), emoji: '', limited: false, maxHolders: '' };
        expect(buildPatchPayload(role, draft)).toEqual({ emoji: '', clearMaxHolders: true });
    });

    it('sends both labels when one changed, and a new cap', () => {
        const role = makeRole();
        const draft = { ...draftFromRole(role), labelEl: 'Κουμπάρος γάμου', limited: true, maxHolders: '3' };
        expect(buildPatchPayload(role, draft)).toEqual({ label: { en: 'Best man', el: 'Κουμπάρος γάμου' }, maxHolders: 3 });
    });
});

describe('sortRoles and nextSortOrder', () => {
    it('sorts by sortOrder then key, and puts new roles last', () => {
        const roles = [makeRole({ id: 'b', roleKey: 'B', sortOrder: 1 }), makeRole({ id: 'a', roleKey: 'A', sortOrder: 1 }), makeRole({ id: 'c', sortOrder: 0 })];
        expect(sortRoles(roles).map((role) => role.id)).toEqual(['c', 'a', 'b']);
        expect(nextSortOrder(roles)).toBe(2);
        expect(nextSortOrder([])).toBe(0);
    });
});

describe('filterRoles', () => {
    const roles = [makeRole(), makeRole({ id: 'r2', roleKey: 'OLD', label: { en: 'Old friend', el: 'Παλιός φίλος' }, retired: true })];

    it('filters by status', () => {
        expect(filterRoles(roles, '', 'RETIRED', 'en').map((role) => role.id)).toEqual(['r2']);
        expect(filterRoles(roles, '', 'ACTIVE', 'en').map((role) => role.id)).toEqual(['r1']);
    });

    it('matches either label or the key, ignoring case', () => {
        expect(filterRoles(roles, 'κουμπ', 'ALL', 'en').map((role) => role.id)).toEqual(['r1']);
        expect(filterRoles(roles, 'old', 'ALL', 'en').map((role) => role.id)).toEqual(['r2']);
    });
});

describe('planRoleMove', () => {
    const roles = [makeRole({ id: 'a', sortOrder: 0 }), makeRole({ id: 'b', sortOrder: 5 }), makeRole({ id: 'c', sortOrder: 9 })];

    it('swaps sortOrder with the neighbour', () => {
        expect(planRoleMove(roles, 'b', 'up')).toEqual([
            { id: 'a', sortOrder: 5 },
            { id: 'b', sortOrder: 0 },
        ]);
    });

    it('does nothing at the ends', () => {
        expect(planRoleMove(roles, 'a', 'up')).toEqual([]);
        expect(planRoleMove(roles, 'c', 'down')).toEqual([]);
    });

    it('renumbers first when two roles share a sortOrder', () => {
        const tied = [makeRole({ id: 'a', roleKey: 'A', sortOrder: 0 }), makeRole({ id: 'b', roleKey: 'B', sortOrder: 0 }), makeRole({ id: 'c', roleKey: 'C', sortOrder: 0 })];
        expect(planRoleMove(tied, 'c', 'up')).toEqual([
            { id: 'b', sortOrder: 2 },
            { id: 'c', sortOrder: 1 },
        ]);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/memberRoles.test.ts`
Expected: FAIL, the new imports are not exported.

- [ ] **Step 3: Implement**

Append to `lib/memberRoles.ts` (and change the type import to `import type { MemberRoleCatalogDto, MemberRoleCatalogPatchDto, MemberRoleCatalogRequestDto } from '@/lib/api/types';`):

```ts
// Admin catalog rules (member-roles-fe-integration.md §9).
const ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;
const ROLE_LABEL_MAX = 40;
const ROLE_EMOJI_MAX = 16;

export type RoleStatusFilter = 'ALL' | 'ACTIVE' | 'RETIRED';
export const ROLE_STATUS_FILTERS: RoleStatusFilter[] = ['ALL', 'ACTIVE', 'RETIRED'];

export type MemberRoleDraft = {
    roleKey: string;
    labelEn: string;
    labelEl: string;
    emoji: string;
    limited: boolean;
    maxHolders: string;
};

export type MemberRoleDraftErrors = Partial<Record<'roleKey' | 'labelEn' | 'labelEl' | 'emoji' | 'maxHolders', true>>;

export function normalizeRoleKeyInput(value: string): string {
    return value.toUpperCase().replace(/\s+/g, '_');
}

export function isValidRoleKey(roleKey: string): boolean {
    return ROLE_KEY_PATTERN.test(roleKey);
}

function isValidLabel(label: string): boolean {
    const trimmed = label.trim();
    return trimmed.length >= 1 && trimmed.length <= ROLE_LABEL_MAX;
}

function isValidCap(text: string): boolean {
    const value = Number(text.trim());
    return text.trim() !== '' && Number.isInteger(value) && value >= 1;
}

export function draftFromRole(role: MemberRoleCatalogDto | null): MemberRoleDraft {
    return {
        roleKey: role?.roleKey ?? '',
        labelEn: role?.label.en ?? '',
        labelEl: role?.label.el ?? '',
        emoji: role?.emoji ?? '',
        limited: role?.maxHolders != null,
        maxHolders: role?.maxHolders != null ? String(role.maxHolders) : '',
    };
}

export function validateRoleDraft(draft: MemberRoleDraft, isCreate: boolean): MemberRoleDraftErrors {
    const errors: MemberRoleDraftErrors = {};
    if (isCreate && !isValidRoleKey(draft.roleKey)) errors.roleKey = true;
    if (!isValidLabel(draft.labelEn)) errors.labelEn = true;
    if (!isValidLabel(draft.labelEl)) errors.labelEl = true;
    if (draft.emoji.trim().length > ROLE_EMOJI_MAX) errors.emoji = true;
    if (draft.limited && !isValidCap(draft.maxHolders)) errors.maxHolders = true;
    return errors;
}

export function buildCreatePayload(draft: MemberRoleDraft, eventTypeKey: string, sortOrder: number): MemberRoleCatalogRequestDto {
    const payload: MemberRoleCatalogRequestDto = {
        eventTypeKey,
        roleKey: draft.roleKey,
        label: { en: draft.labelEn.trim(), el: draft.labelEl.trim() },
        sortOrder,
    };
    const emoji = draft.emoji.trim();
    if (emoji) payload.emoji = emoji;
    if (draft.limited) payload.maxHolders = Number(draft.maxHolders.trim());
    return payload;
}

// Only what changed, so the server never revalidates untouched fields.
export function buildPatchPayload(role: MemberRoleCatalogDto, draft: MemberRoleDraft): MemberRoleCatalogPatchDto {
    const patch: MemberRoleCatalogPatchDto = {};
    const label = { en: draft.labelEn.trim(), el: draft.labelEl.trim() };
    if (label.en !== role.label.en || label.el !== role.label.el) patch.label = label;
    const emoji = draft.emoji.trim();
    if (emoji !== (role.emoji ?? '')) patch.emoji = emoji;
    if (!draft.limited) {
        if (role.maxHolders !== null) patch.clearMaxHolders = true;
    } else {
        const maxHolders = Number(draft.maxHolders.trim());
        if (maxHolders !== role.maxHolders) patch.maxHolders = maxHolders;
    }
    return patch;
}

export function sortRoles(roles: MemberRoleCatalogDto[]): MemberRoleCatalogDto[] {
    return [...roles].sort((left, right) => left.sortOrder - right.sortOrder || left.roleKey.localeCompare(right.roleKey));
}

export function nextSortOrder(roles: MemberRoleCatalogDto[]): number {
    return roles.length === 0 ? 0 : Math.max(...roles.map((role) => role.sortOrder)) + 1;
}

export function filterRoles(roles: MemberRoleCatalogDto[], search: string, status: RoleStatusFilter, locale: Locale): MemberRoleCatalogDto[] {
    const needle = search.trim().toLocaleLowerCase(locale);
    return roles.filter((role) => {
        if (status === 'ACTIVE' && role.retired) return false;
        if (status === 'RETIRED' && !role.retired) return false;
        if (!needle) return true;
        return [role.roleKey, role.label.en, role.label.el].some((text) => text.toLocaleLowerCase(locale).includes(needle));
    });
}

export type SortOrderUpdate = { id: string; sortOrder: number };

// The PATCHes that move one role a step up or down. Swaps sortOrder with the
// neighbour; if any two roles tie, renumbers the list 0..n-1 first so the swap
// actually changes the order. Returns only the roles whose value changes.
export function planRoleMove(roles: MemberRoleCatalogDto[], roleId: string, direction: 'up' | 'down'): SortOrderUpdate[] {
    const sorted = sortRoles(roles);
    const index = sorted.findIndex((role) => role.id === roleId);
    const neighbour = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || neighbour < 0 || neighbour >= sorted.length) return [];

    const hasTies = new Set(sorted.map((role) => role.sortOrder)).size !== sorted.length;
    const orders = sorted.map((role, position) => (hasTies ? position : role.sortOrder));
    [orders[index], orders[neighbour]] = [orders[neighbour], orders[index]];

    return sorted.flatMap((role, position) => (orders[position] === role.sortOrder ? [] : [{ id: role.id, sortOrder: orders[position] }]));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/memberRoles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/memberRoles.ts lib/memberRoles.test.ts
git commit -m "feat(member-roles): admin role drafts, payloads, filtering and reorder planning"
```

---

### Task 4: Catalog selector and the home card role label

**Files:**
- Modify: `hooks/useAppConfig.ts`
- Create: `hooks/useMemberRoleLabel.ts`
- Modify: `components/home/EventsQuickRow.tsx:20-24`, `components/home/HomeNextEventCard.tsx:28-31`
- Modify: `components/home/EventsQuickRow.test.tsx`

- [ ] **Step 1: Catalog selector**

Append to `hooks/useAppConfig.ts` (add `MemberRoleCatalog` import from `@/lib/memberRoles`):

```ts
const EMPTY_MEMBER_ROLE_CATALOG: MemberRoleCatalog = {};

export function useMemberRoleCatalog(): MemberRoleCatalog {
    const { data } = useAppConfig();
    return data?.memberRolesByEventType ?? EMPTY_MEMBER_ROLE_CATALOG;
}
```

- [ ] **Step 2: Label hook**

Create `hooks/useMemberRoleLabel.ts`:

```ts
'use client';

import { useLocale } from 'next-intl';

import { useMemberRoleCatalog } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { memberRoleLabel } from '@/lib/memberRoles';

// A member's role in one event as display text, or null when they have none.
export function useMemberRoleLabel(
    member: Pick<EventMemberResponseDto, 'relationshipRole' | 'customRelationshipRole'>,
    eventTypeKey: string | null | undefined,
): string | null {
    const catalog = useMemberRoleCatalog();
    const locale = useLocale() as Locale;

    return memberRoleLabel({
        roleKey: member.relationshipRole,
        customRole: member.customRelationshipRole,
        eventTypeKey,
        catalog,
        locale,
    });
}
```

- [ ] **Step 3: Use it in the home cards**

In `components/home/EventsQuickRow.tsx` add `import { useMemberRoleLabel } from '@/hooks/useMemberRoleLabel';` and replace the `roleLabel` declaration:

```ts
    const memberRole = useMemberRoleLabel(member, event?.eventType);
    const roleLabel = memberRole ?? (member.role === 'HOST' ? tEvents('roleFallback.host') : tEvents('roleFallback.attendee'));
```

In `components/home/HomeNextEventCard.tsx`, the hook can't sit after the early `return null`. Add the import, and directly after `const [next] = useRecentEventItems(liveItems, 1);` add:

```ts
    const memberRole = useMemberRoleLabel(next?.member ?? { relationshipRole: null, customRelationshipRole: null }, next?.event?.eventType);
```

Then replace its `roleLabel` declaration:

```ts
    const roleLabel = memberRole ?? (member.role === 'HOST' ? tEvents('roleFallback.host') : tEvents('roleFallback.attendee'));
```

- [ ] **Step 4: Keep the existing card test isolated from React Query**

In `components/home/EventsQuickRow.test.tsx`, after the other `vi.mock` calls, add:

```ts
vi.mock('@/hooks/useMemberRoleLabel', () => ({ useMemberRoleLabel: () => null }));
```

- [ ] **Step 5: Run tests and types**

Run: `npx vitest run components/home && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAppConfig.ts hooks/useMemberRoleLabel.ts components/home
git commit -m "feat(member-roles): home cards show the role label, not the raw key"
```

---

### Task 5: Plan card line

**Files:**
- Modify: `lib/landingPricing.ts`
- Modify: `lib/landingPricing.test.ts`
- Modify: `hooks/usePlanMarketingCopy.ts`, `hooks/useLandingPricingPlans.ts`, `hooks/useMarketingPlanOptions.ts`

- [ ] **Step 1: Write the failing tests**

In `lib/landingPricing.test.ts`:

Add to `MODULES`:

```ts
    { id: 'm-member-roles', moduleKey: 'member_roles', name: 'Member roles', description: null, isEnabled: true, sortOrder: 6 },
```

Add to `COPY`:

```ts
    memberRoles: (count, custom) => `${count} member roles${custom ? ' + your own' : ''}`,
    memberRolesCustomOnly: 'Custom member roles',
```

Add a catalog fixture under `COPY` (import `MemberRoleCatalogDto` type from `@/lib/api/types`):

```ts
function role(id: string, retired = false): MemberRoleCatalogDto {
    return { id, eventTypeKey: 'WEDDING', roleKey: id.toUpperCase(), label: { en: id, el: id }, emoji: null, maxHolders: null, sortOrder: 0, retired };
}

const ROLES = { WEDDING: [role('a'), role('b'), role('c'), role('old', true)] };
```

Add a new `describe` at the end of the file:

```ts
describe('buildLandingPlan member roles line', () => {
    function card(allowCustom: boolean | undefined, catalog: Record<string, MemberRoleCatalogDto[]> = ROLES) {
        const plan = makePlan({ moduleKeys: ['member_roles'], moduleConfigs: { member_roles: allowCustom === undefined ? {} : { allowCustom } } });
        return buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY, undefined, catalog);
    }

    it('counts active roles only', () => {
        expect(card(false)?.features).toEqual(['3 member roles']);
    });

    it('adds "your own" when the plan allows custom roles', () => {
        expect(card(true)?.features).toEqual(['3 member roles + your own']);
    });

    it('shows the custom-only line when the type has no roles', () => {
        expect(card(true, {})?.features).toEqual(['Custom member roles']);
    });

    it('hides the line with no roles and no custom roles', () => {
        expect(card(undefined, {})?.features).toEqual([]);
    });

    it('falls back to the module name without moduleConfigs', () => {
        const plan = makePlan({ moduleKeys: ['member_roles'], moduleConfigs: null });
        expect(buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY, undefined, ROLES)?.features).toEqual(['Member roles']);
    });

    it('lists the line on a higher tier that turns on custom roles', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['member_roles'], moduleConfigs: { member_roles: { allowCustom: false } } });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['member_roles'], moduleConfigs: { member_roles: { allowCustom: true } } });

        const result = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY, undefined, ROLES);

        expect(result?.features).toEqual(['Everything in START', '3 member roles + your own']);
        expect(result?.includedFeatures).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/landingPricing.test.ts`
Expected: FAIL (type errors on `COPY`, wrong features).

- [ ] **Step 3: Implement in `lib/landingPricing.ts`**

Add the import:

```ts
import { activeRoleCount, type MemberRoleCatalog } from '@/lib/memberRoles';
```

Extend `LandingPlanCopy`:

```ts
    memberRoles: (count: number, custom: boolean) => string;
    memberRolesCustomOnly: string;
```

Change `moduleFeatureLabel`'s signature and add the case:

```ts
function moduleFeatureLabel(
    moduleKey: string,
    plan: PlanTierResponseDto,
    moduleName: (moduleKey: string) => string,
    copy: LandingPlanCopy,
    memberRoles: MemberRoleCatalog,
): string | null {
```

```ts
        case 'member_roles': {
            // Plans don't cap roles: the count is the event type's catalog, and
            // the plan only decides whether members may type their own.
            const count = activeRoleCount(memberRoles, plan.eventTypeKey);
            const custom = config?.allowCustom === true;
            if (count === 0) return custom ? copy.memberRolesCustomOnly : null;
            return copy.memberRoles(count, custom);
        }
```

Add a trailing parameter to `buildLandingPlan` and pass it through:

```ts
    inheritedModuleKeys?: string[],
    memberRoles: MemberRoleCatalog = {},
): LandingPlan | null {
```

```ts
    const labelFor = (moduleKey: string, tier: PlanTierResponseDto) => moduleFeatureLabel(moduleKey, tier, moduleName, copy, memberRoles);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/landingPricing.test.ts`
Expected: PASS (all existing tests too).

- [ ] **Step 5: Wire copy and catalog**

In `hooks/usePlanMarketingCopy.ts`, add to the `copy` object:

```ts
            memberRoles: (count, custom) => t(custom ? 'memberRolesWithCustom' : 'memberRoles', { count }),
            memberRolesCustomOnly: t('memberRolesCustomOnly'),
```

In `hooks/useLandingPricingPlans.ts`, after `const { copy, moduleName } = usePlanMarketingCopy();` there's already `data`; pass `data.memberRolesByEventType` as the last `buildLandingPlan` argument:

```ts
                    plans.slice(0, index).flatMap((previousPlan) => previousPlan.moduleKeys),
                    data.memberRolesByEventType,
```

In `hooks/useMarketingPlanOptions.ts`, add `import { useMemberRoleCatalog } from '@/hooks/useAppConfig';`, then `const memberRoles = useMemberRoleCatalog();` under the copy hook, pass it as the last argument, and add `memberRoles` to the `useMemo` deps:

```ts
                plans.slice(0, index).flatMap((previousPlan) => previousPlan.moduleKeys),
                memberRoles,
            );
```

```ts
    }, [copy, media, memberRoles, moduleName, modules, plans]);
```

- [ ] **Step 6: Types**

Run: `npx tsc --noEmit`
Expected: no errors. (The `LandingPage.pricing` keys are added in Task 9; next-intl key checks are runtime only.)

- [ ] **Step 7: Commit**

```bash
git add lib/landingPricing.ts lib/landingPricing.test.ts hooks/usePlanMarketingCopy.ts hooks/useLandingPricingPlans.ts hooks/useMarketingPlanOptions.ts
git commit -m "feat(member-roles): plan card shows the role count and custom roles"
```

---

### Task 6: `lib/planModuleConfig.ts` — labels, `allowCustom`, readable changes

**Files:**
- Modify: `lib/planModuleConfig.ts`
- Modify: `lib/planModuleConfig.test.ts`

- [ ] **Step 1: Write the failing tests**

In `lib/planModuleConfig.test.ts`, replace the first test in `knownConfigFields` and add new describes (extend the import with `limitedKeysFromDraft, readableConfigChanges`):

```ts
    it('returns typed fields for documented modules', () => {
        expect(knownConfigFields('schedule')).toEqual([{ key: 'maxSections', type: 'number', min: 1 }]);
        expect(knownConfigFields('gallery')).toEqual([{ key: 'qrUploadEnabled', type: 'boolean' }]);
        expect(knownConfigFields('member_roles')).toEqual([{ key: 'allowCustom', type: 'boolean', hint: true }]);
    });
```

```ts
describe('mergeConfigDraft switches', () => {
    it('leaves an untouched missing switch out of the config', () => {
        expect(mergeConfigDraft('member_roles', { allowCustom: '' }, {})).toEqual({});
    });

    it('writes a touched switch', () => {
        expect(mergeConfigDraft('member_roles', { allowCustom: 'false' }, {})).toEqual({ allowCustom: false });
    });
});

describe('limitedKeysFromDraft', () => {
    it('lists count fields that hold a value', () => {
        expect(limitedKeysFromDraft('co_hosts', { maxCoHosts: '0' })).toEqual(['maxCoHosts']);
        expect(limitedKeysFromDraft('co_hosts', { maxCoHosts: '' })).toEqual([]);
    });
});

describe('readableConfigChanges', () => {
    const labels = {
        field: (key: string) => `field:${key}`,
        unlimited: 'Unlimited',
        upTo: (count: number) => `Up to ${count}`,
        on: 'On',
        off: 'Off',
        none: 'None',
    };

    it('describes counts and switches in words', () => {
        const changes = readableConfigChanges('co_hosts', { maxCoHosts: 3 }, {}, labels);
        expect(changes).toEqual([{ key: 'field:maxCoHosts', before: 'Up to 3', after: 'Unlimited' }]);
        expect(readableConfigChanges('member_roles', {}, { allowCustom: true }, labels)).toEqual([
            { key: 'field:allowCustom', before: 'Off', after: 'On' },
        ]);
    });

    it('keeps raw keys and JSON for unknown settings', () => {
        expect(readableConfigChanges('posts', {}, { theme: 'dark' }, labels)).toEqual([{ key: 'theme', before: 'None', after: '"dark"' }]);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/planModuleConfig.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `lib/planModuleConfig.ts` replace the top comment, type and `KNOWN_CONFIG_FIELDS`:

```ts
// The per-plan module config keys the backend documents. Each gets a labelled
// control in the plan grid (AdminPage.plans.grid.cell.fields.<key>); anything
// else stays editable through the collapsed Advanced JSON field, so a new key
// works before it gets a control here. `hint` adds fieldHints.<key> under it.
export type KnownConfigField = { key: string; type: 'number'; min?: number } | { key: string; type: 'boolean'; hint?: boolean };

const KNOWN_CONFIG_FIELDS: Record<string, KnownConfigField[]> = {
    schedule: [{ key: 'maxSections', type: 'number', min: 1 }],
    gallery: [{ key: 'qrUploadEnabled', type: 'boolean' }],
    co_hosts: [{ key: 'maxCoHosts', type: 'number', min: 0 }],
    member_roles: [{ key: 'allowCustom', type: 'boolean', hint: true }],
};
```

Append:

```ts
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
    upTo: (count: number) => string;
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
            return typeof value === 'number' ? labels.upTo(value) : labels.unlimited;
        };
        return { key: labels.field(field.key), before: describe(before[field.key]), after: describe(after[field.key]) };
    });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/planModuleConfig.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/planModuleConfig.ts lib/planModuleConfig.test.ts
git commit -m "feat(admin): labelled plan module settings, allowCustom, readable change list"
```

---

### Task 7: Shared limit control

**Files:**
- Create: `components/admin/AdminLimitControl.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import type { ChangeEvent, MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { cn } from '@/lib/utils';

// "Unlimited" or "Up to N" as one segmented choice, so a blank number field
// never has to mean "no limit".
export function AdminLimitControl({
    label,
    limited,
    value,
    min,
    error,
    unlimitedLabel,
    upToLabel,
    onModeChangeAction,
    onValueChangeAction,
}: {
    label: string;
    limited: boolean;
    value: string;
    min: number;
    error?: string;
    unlimitedLabel: string;
    upToLabel: string;
    onModeChangeAction: (limited: boolean) => void;
    onValueChangeAction: (value: string) => void;
}) {
    function handleModeClick(event: MouseEvent<HTMLButtonElement>) {
        onModeChangeAction(event.currentTarget.dataset.limited === 'true');
    }

    function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
        onValueChangeAction(event.currentTarget.value);
    }

    return (
        <AdminField label={label} hint={error}>
            <div className="flex items-center gap-2">
                {/* Mode */}
                <div className="flex gap-1 rounded-lg bg-canvas p-1">
                    {[false, true].map((option) => (
                        <button
                            key={String(option)}
                            type="button"
                            data-limited={String(option)}
                            onClick={handleModeClick}
                            aria-pressed={limited === option}
                            className={cn(
                                'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                limited === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                            )}
                        >
                            {option ? upToLabel : unlimitedLabel}
                        </button>
                    ))}
                </div>

                {/* Value */}
                {limited && (
                    <input
                        type="number"
                        min={min}
                        step={1}
                        value={value}
                        onChange={handleValueChange}
                        aria-label={label}
                        aria-invalid={Boolean(error)}
                        className={adminInputClass('w-20 font-mono')}
                    />
                )}
            </div>
        </AdminField>
    );
}
```

- [ ] **Step 2: Types and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/AdminLimitControl.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminLimitControl.tsx
git commit -m "feat(admin): shared Unlimited / Up to N control"
```

---

### Task 8: JSON-free plan module popover

**Files:**
- Modify: `hooks/usePlanModuleCellDraft.ts`
- Create: `components/admin/plans/PlanModuleConfigField.tsx`, `components/admin/plans/PlanModuleConfigAdvanced.tsx`
- Modify: `components/admin/plans/PlanModuleConfigFields.tsx`, `components/admin/plans/PlanModuleConfigPopover.tsx`, `components/admin/plans/PlanModuleChangeList.tsx`

- [ ] **Step 1: Hook — limit mode, switches, readable changes**

In `hooks/usePlanModuleCellDraft.ts`:

Extend the `@/lib/planModuleConfig` import with `limitedKeysFromDraft` and `readableConfigChanges`, and drop `configChangeSummary` from it.

After the `knownDraft` state add:

```ts
    const [limitedKeys, setLimitedKeys] = useState<string[]>(() => limitedKeysFromDraft(cell.moduleKey, knownDraftFromConfig(cell.moduleKey, cell.config)));
```

In `fieldErrors`, replace the loop body so a limited blank count is an error:

```ts
        for (const field of fields) {
            if (field.type !== 'number') continue;
            const text = (knownDraft[field.key] ?? '').trim();
            const limited = limitedKeys.includes(field.key);
            if (!limited) continue;
            const value = Number(text);
            if (!text || !Number.isInteger(value) || (field.min !== undefined && value < field.min)) {
                errors[field.key] = t('plans.grid.cell.invalidNumber', { min: field.min ?? 0 });
            }
        }
        return errors;
    }, [fields, knownDraft, limitedKeys, t]);
```

Replace the `changes` memo:

```ts
    const changes = useMemo(
        () =>
            readableConfigChanges(cell.moduleKey, cell.config, configAfter, {
                field: (key) => t(`plans.grid.cell.fields.${key}`),
                unlimited: t('plans.grid.cell.unlimited'),
                upTo: (count) => t('plans.grid.cell.upToValue', { count }),
                on: t('plans.grid.cell.on'),
                off: t('plans.grid.cell.off'),
                none: t('none'),
            }),
        [cell.config, cell.moduleKey, configAfter, t],
    );
```

Replace `handleKnownChange` with these three handlers:

```ts
    const handleLimitModeChange = useCallback(
        (key: string, limited: boolean) => {
            const field = fields.find((item) => item.key === key);
            const min = field?.type === 'number' ? (field.min ?? 0) : 0;
            setLimitedKeys((current) => (limited ? [...new Set([...current, key])] : current.filter((item) => item !== key)));
            setKnownDraft((current) => ({ ...current, [key]: limited ? current[key] || String(Math.max(min, 1)) : '' }));
        },
        [fields],
    );
    const handleLimitValueChange = useCallback((key: string, value: string) => setKnownDraft((current) => ({ ...current, [key]: value })), []);
    const handleSwitchChange = useCallback((key: string, checked: boolean) => setKnownDraft((current) => ({ ...current, [key]: String(checked) })), []);
```

In `resetToSeed`, also reset the limit modes:

```ts
        const seedDraft = knownDraftFromConfig(cell.moduleKey, cell.seedConfig);
        setKnownDraft(seedDraft);
        setLimitedKeys(limitedKeysFromDraft(cell.moduleKey, seedDraft));
```

(remove the old `setKnownDraft(knownDraftFromConfig(...))` line there).

In the returned object replace `handleKnownChange,` with:

```ts
        limitedKeys,
        handleLimitModeChange,
        handleLimitValueChange,
        handleSwitchChange,
```

and remove the now-unused `ChangeEvent` union for `HTMLSelectElement` from the import if lint flags it.

- [ ] **Step 2: One field**

Create `components/admin/plans/PlanModuleConfigField.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { AdminLimitControl } from '@/components/admin/AdminLimitControl';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigField({
    field,
    value,
    limited,
    error,
    onLimitModeChangeAction,
    onLimitValueChangeAction,
    onSwitchChangeAction,
}: {
    field: KnownConfigField;
    value: string;
    limited: boolean;
    error?: string;
    onLimitModeChangeAction: (key: string, limited: boolean) => void;
    onLimitValueChangeAction: (key: string, value: string) => void;
    onSwitchChangeAction: (key: string, checked: boolean) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    function handleModeChange(next: boolean) {
        onLimitModeChangeAction(field.key, next);
    }

    function handleValueChange(next: string) {
        onLimitValueChangeAction(field.key, next);
    }

    function handleSwitchChange(next: boolean) {
        onSwitchChangeAction(field.key, next);
    }

    if (field.type === 'boolean') {
        return (
            <div className="rounded-lg border border-border">
                <AdminSwitch
                    label={t(`fields.${field.key}`)}
                    description={field.hint ? t(`fieldHints.${field.key}`) : undefined}
                    checked={value === 'true'}
                    onCheckedChangeAction={handleSwitchChange}
                />
            </div>
        );
    }

    return (
        <AdminLimitControl
            label={t(`fields.${field.key}`)}
            limited={limited}
            value={value}
            min={field.min ?? 0}
            error={error}
            unlimitedLabel={t('unlimited')}
            upToLabel={t('upTo')}
            onModeChangeAction={handleModeChange}
            onValueChangeAction={handleValueChange}
        />
    );
}
```

- [ ] **Step 3: Field list**

Replace the whole of `components/admin/plans/PlanModuleConfigFields.tsx`:

```tsx
'use client';

import { PlanModuleConfigField } from '@/components/admin/plans/PlanModuleConfigField';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigFields({
    fields,
    draft,
    limitedKeys,
    errors,
    onLimitModeChangeAction,
    onLimitValueChangeAction,
    onSwitchChangeAction,
}: {
    fields: KnownConfigField[];
    draft: Record<string, string>;
    limitedKeys: string[];
    errors: Record<string, string>;
    onLimitModeChangeAction: (key: string, limited: boolean) => void;
    onLimitValueChangeAction: (key: string, value: string) => void;
    onSwitchChangeAction: (key: string, checked: boolean) => void;
}) {
    if (fields.length === 0) return null;

    return (
        <div className="space-y-3">
            {fields.map((field) => (
                <PlanModuleConfigField
                    key={field.key}
                    field={field}
                    value={draft[field.key] ?? ''}
                    limited={limitedKeys.includes(field.key)}
                    error={errors[field.key]}
                    onLimitModeChangeAction={onLimitModeChangeAction}
                    onLimitValueChangeAction={onLimitValueChangeAction}
                    onSwitchChangeAction={onSwitchChangeAction}
                />
            ))}
        </div>
    );
}
```

- [ ] **Step 4: Advanced disclosure**

Create `components/admin/plans/PlanModuleConfigAdvanced.tsx`:

```tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { PlanModuleConfigJsonField } from '@/components/admin/plans/PlanModuleConfigJsonField';
import { useDisclosure } from '@/hooks/useDisclosure';
import { cn } from '@/lib/utils';

// Settings the FE has no control for yet, as raw JSON, kept out of the way.
// Opens by itself when the JSON is invalid so the error is never hidden.
export function PlanModuleConfigAdvanced({
    value,
    error,
    onChangeAction,
}: {
    value: string;
    error: string | null;
    onChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');
    const { open, toggle } = useDisclosure(false);
    const panelId = useId();
    const expanded = open || Boolean(error);

    return (
        <div>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls={panelId}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
            >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
                {t('advanced')}
            </button>
            {expanded && (
                <div id={panelId} className="mt-2">
                    <PlanModuleConfigJsonField value={value} error={error} onChangeAction={onChangeAction} />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 5: Popover**

In `components/admin/plans/PlanModuleConfigPopover.tsx` replace the `PlanModuleConfigJsonField` import with `import { PlanModuleConfigAdvanced } from '@/components/admin/plans/PlanModuleConfigAdvanced';` and replace the `{/* Config */}` block:

```tsx
                            {/* Settings */}
                            <div className="mt-4 space-y-3">
                                <PlanModuleConfigFields
                                    fields={draft.fields}
                                    draft={draft.knownDraft}
                                    limitedKeys={draft.limitedKeys}
                                    errors={draft.fieldErrors}
                                    onLimitModeChangeAction={draft.handleLimitModeChange}
                                    onLimitValueChangeAction={draft.handleLimitValueChange}
                                    onSwitchChangeAction={draft.handleSwitchChange}
                                />

                                {/* Advanced */}
                                <PlanModuleConfigAdvanced value={draft.jsonText} error={draft.jsonError} onChangeAction={draft.handleJsonChange} />

                                {/* Reset */}
                                <button
                                    type="button"
                                    onClick={draft.resetToSeed}
                                    className="text-xs font-semibold text-ink-muted underline-offset-2 hover:underline"
                                >
                                    {t('plans.grid.cell.resetToDefault')}
                                </button>
                            </div>
```

- [ ] **Step 6: Change list without monospace for words**

In `components/admin/plans/PlanModuleChangeList.tsx`, the before/after spans keep `font-mono` only for raw JSON. Replace the two value spans:

```tsx
                    <span className="text-xs text-ink-faint line-through">{row.before}</span>
                    <span className="text-xs text-ink">{row.after}</span>
```

- [ ] **Step 7: Types, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run lib/planModuleConfig.test.ts`
Expected: clean. If any existing test renders `PlanModuleConfigPopover` or `PlanModuleConfigFields` with the old props, update it to the new props.

- [ ] **Step 8: Commit**

```bash
git add hooks/usePlanModuleCellDraft.ts components/admin/plans
git commit -m "feat(admin): plan module settings as labelled controls, JSON under Advanced"
```

---

### Task 9: Copy (en and el)

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: `Modules`** — after `"schedule": {…}` in the top-level `Modules` object:

en:
```json
        "member_roles": {
            "name": "Member roles",
            "description": "Guests pick a role, like best man, shown next to their name."
        }
```
el:
```json
        "member_roles": {
            "name": "Ρόλοι καλεσμένων",
            "description": "Οι καλεσμένοι διαλέγουν ρόλο, όπως κουμπάρος, που φαίνεται δίπλα στο όνομά τους."
        }
```

- [ ] **Step 2: `LandingPage.pricing`** — after `"galleryWithQrUpload"`:

en:
```json
            "memberRoles": "{count, plural, one {# member role} other {# member roles}}",
            "memberRolesWithCustom": "{count, plural, one {# member role + your own} other {# member roles + your own}}",
            "memberRolesCustomOnly": "Custom member roles"
```
el:
```json
            "memberRoles": "{count, plural, one {# ρόλος καλεσμένων} other {# ρόλοι καλεσμένων}}",
            "memberRolesWithCustom": "{count, plural, one {# ρόλος καλεσμένων + δικός σας} other {# ρόλοι καλεσμένων + δικός σας}}",
            "memberRolesCustomOnly": "Δικοί σας ρόλοι καλεσμένων"
```

- [ ] **Step 3: `AdminPage.plans.grid.cell`** — add after `"noChanges"`:

en:
```json
                    "fields": {
                        "maxSections": "Schedule sections",
                        "maxCoHosts": "Co-hosts",
                        "qrUploadEnabled": "Guest QR upload",
                        "allowCustom": "Custom roles"
                    },
                    "fieldHints": {
                        "allowCustom": "Members can type their own role."
                    },
                    "unlimited": "Unlimited",
                    "upTo": "Up to",
                    "upToValue": "Up to {count}",
                    "on": "On",
                    "off": "Off",
                    "advanced": "Advanced"
```
el:
```json
                    "fields": {
                        "maxSections": "Ενότητες προγράμματος",
                        "maxCoHosts": "Συνδιοργανωτές",
                        "qrUploadEnabled": "Ανέβασμα με QR",
                        "allowCustom": "Δικοί τους ρόλοι"
                    },
                    "fieldHints": {
                        "allowCustom": "Τα μέλη μπορούν να γράψουν τον δικό τους ρόλο."
                    },
                    "unlimited": "Απεριόριστα",
                    "upTo": "Έως",
                    "upToValue": "Έως {count}",
                    "on": "Ναι",
                    "off": "Όχι",
                    "advanced": "Για προχωρημένους"
```

Check `el.json`'s existing Greek wording for "co-hosts" and "schedule" in `LandingPage.pricing` and reuse the same nouns if they differ from the above.

- [ ] **Step 4: `AdminPage.plans.rail` and `AdminPage.plans.settings`**

en — `rail`: `"memberRoles": "Member roles"`; `settings`: `"memberRolesTitle": "Member roles"`.
el — `rail`: `"memberRoles": "Ρόλοι καλεσμένων"`; `settings`: `"memberRolesTitle": "Ρόλοι καλεσμένων"`.

- [ ] **Step 5: `AdminPage.memberRoles`** — a new object inside `AdminPage` (next to `reactionTypes`):

en:
```json
        "memberRoles": {
            "create": "New role",
            "eventType": "Event type",
            "search": "Search by label or key",
            "filters": { "ALL": "All", "ACTIVE": "Active", "RETIRED": "Retired" },
            "columns": { "role": "Role", "key": "Key", "limit": "Limit", "status": "Status", "order": "Order" },
            "limitMax": "Max {count}",
            "unlimited": "Unlimited",
            "status": { "ACTIVE": "Active", "RETIRED": "Retired" },
            "empty": "No roles for this event type yet.",
            "noMatches": "No roles match.",
            "loading": "Loading roles…",
            "moveUp": "Move {role} up",
            "moveDown": "Move {role} down",
            "edit": "Edit {role}",
            "drawer": {
                "createTitle": "New role",
                "close": "Close",
                "eventType": "Event type",
                "key": "Key",
                "keyInvalid": "Use 2 to 50 capital letters, digits or underscores, starting with a letter.",
                "keyTaken": "A role with this key already exists.",
                "labelEn": "English label",
                "labelEl": "Greek label",
                "labelInvalid": "Enter 1 to 40 characters.",
                "emoji": "Emoji",
                "emojiInvalid": "Use up to 16 characters.",
                "limit": "Limit",
                "unlimited": "Unlimited",
                "upTo": "Up to",
                "limitInvalid": "Enter a whole number of at least 1.",
                "save": "Save",
                "cancel": "Cancel",
                "retire": "Retire",
                "restore": "Restore",
                "retireTitle": "Retire {role}?",
                "retireBody": "Members who have this role keep it. No one new can pick it.",
                "retireConfirm": "Retire role",
                "notFound": "This role no longer exists."
            }
        }
```
el:
```json
        "memberRoles": {
            "create": "Νέος ρόλος",
            "eventType": "Τύπος εκδήλωσης",
            "search": "Αναζήτηση με όνομα ή κλειδί",
            "filters": { "ALL": "Όλοι", "ACTIVE": "Ενεργοί", "RETIRED": "Αποσυρμένοι" },
            "columns": { "role": "Ρόλος", "key": "Κλειδί", "limit": "Όριο", "status": "Κατάσταση", "order": "Σειρά" },
            "limitMax": "Έως {count}",
            "unlimited": "Απεριόριστο",
            "status": { "ACTIVE": "Ενεργός", "RETIRED": "Αποσυρμένος" },
            "empty": "Δεν υπάρχουν ακόμα ρόλοι για αυτόν τον τύπο.",
            "noMatches": "Δεν βρέθηκαν ρόλοι.",
            "loading": "Φόρτωση ρόλων…",
            "moveUp": "Μετακίνηση του {role} πάνω",
            "moveDown": "Μετακίνηση του {role} κάτω",
            "edit": "Επεξεργασία του {role}",
            "drawer": {
                "createTitle": "Νέος ρόλος",
                "close": "Κλείσιμο",
                "eventType": "Τύπος εκδήλωσης",
                "key": "Κλειδί",
                "keyInvalid": "Χρησιμοποιήστε 2 έως 50 κεφαλαία λατινικά, ψηφία ή κάτω παύλες, με γράμμα στην αρχή.",
                "keyTaken": "Υπάρχει ήδη ρόλος με αυτό το κλειδί.",
                "labelEn": "Όνομα στα αγγλικά",
                "labelEl": "Όνομα στα ελληνικά",
                "labelInvalid": "Γράψτε 1 έως 40 χαρακτήρες.",
                "emoji": "Emoji",
                "emojiInvalid": "Έως 16 χαρακτήρες.",
                "limit": "Όριο",
                "unlimited": "Απεριόριστο",
                "upTo": "Έως",
                "limitInvalid": "Γράψτε ακέραιο αριθμό τουλάχιστον 1.",
                "save": "Αποθήκευση",
                "cancel": "Ακύρωση",
                "retire": "Απόσυρση",
                "restore": "Επαναφορά",
                "retireTitle": "Απόσυρση του {role};",
                "retireBody": "Όσοι έχουν ήδη αυτόν τον ρόλο τον κρατούν. Κανείς νέος δεν μπορεί να τον διαλέξει.",
                "retireConfirm": "Απόσυρση ρόλου",
                "notFound": "Αυτός ο ρόλος δεν υπάρχει πια."
            }
        }
```

- [ ] **Step 6: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/el.json','utf8'));console.log('ok')"`
Expected: `ok`. If the repo has a message-key parity test, run `npx vitest run` on it too.

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat(member-roles): copy for roles, plan card line and labelled plan settings"
```

---

### Task 10: Admin catalog data hooks

**Files:**
- Create: `hooks/useAdminMemberRoles.ts`

- [ ] **Step 1: Create the hooks**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MemberRoleCatalogDto, MemberRoleCatalogPatchDto, MemberRoleCatalogRequestDto } from '@/lib/api/types';
import type { SortOrderUpdate } from '@/lib/memberRoles';

// Admin role catalog (member-roles-fe-integration.md §9). Every write also
// refreshes /api/config, which carries the catalog to plan cards and labels.

export const adminMemberRoleKeys = {
    all: ['admin', 'member-roles'] as const,
    list: (eventTypeKey: string) => ['admin', 'member-roles', eventTypeKey] as const,
};

export function useAdminMemberRoles(eventTypeKey: string | null) {
    return useQuery({
        enabled: Boolean(eventTypeKey),
        queryKey: adminMemberRoleKeys.list(eventTypeKey ?? ''),
        queryFn: () => api.get<MemberRoleCatalogDto[]>(endpoints.admin.memberRoles.list(eventTypeKey ?? '')),
    });
}

function useRefreshMemberRoles() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminMemberRoleKeys.all });
        invalidatePublicConfig(queryClient);
    }, [queryClient]);
}

export function useCreateMemberRole() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: (input: MemberRoleCatalogRequestDto) => api.post<MemberRoleCatalogDto>(endpoints.admin.memberRoles.collection, input),
        onSuccess: refresh,
    });
}

export function usePatchMemberRole() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: MemberRoleCatalogPatchDto }) =>
            api.patch<MemberRoleCatalogDto>(endpoints.admin.memberRoles.byId(id), input),
        onSuccess: refresh,
    });
}

export function useSetMemberRoleRetired() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: ({ id, retired }: { id: string; retired: boolean }) =>
            api.post<MemberRoleCatalogDto>(retired ? endpoints.admin.memberRoles.retire(id) : endpoints.admin.memberRoles.unretire(id)),
        onSuccess: refresh,
    });
}

// One move is two PATCHes (more after a renumber), sent in order. The list
// refetches either way, so a half-applied move shows as it really is.
export function useMoveMemberRole() {
    const refresh = useRefreshMemberRoles();
    return useMutation({
        mutationFn: async (updates: SortOrderUpdate[]) => {
            for (const update of updates) {
                await api.patch<MemberRoleCatalogDto>(endpoints.admin.memberRoles.byId(update.id), { sortOrder: update.sortOrder });
            }
        },
        onSettled: refresh,
    });
}
```

- [ ] **Step 2: Types**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add hooks/useAdminMemberRoles.ts
git commit -m "feat(admin): member role catalog queries and mutations"
```

---

### Task 11: Panel and drawer state hooks

**Files:**
- Create: `hooks/useMemberRolesCatalog.ts`, `hooks/useMemberRoleDrawer.ts`

- [ ] **Step 1: Panel state**

Create `hooks/useMemberRolesCatalog.ts`:

```ts
'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminMemberRoles, useMoveMemberRole } from '@/hooks/useAdminMemberRoles';
import type { Locale } from '@/i18n/config';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import { filterRoles, nextSortOrder, planRoleMove, type RoleStatusFilter, sortRoles } from '@/lib/memberRoles';

export type MemberRoleDrawerState = { open: false } | { open: true; role: MemberRoleCatalogDto | null };

export function useMemberRolesCatalog() {
    const locale = useLocale() as Locale;
    const eventTypesQuery = useAdminPlatformEventTypes();
    const eventTypes = useMemo(() => [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypesQuery.data]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const eventTypeKey = selectedKey ?? eventTypes[0]?.eventTypeKey ?? null;

    const rolesQuery = useAdminMemberRoles(eventTypeKey);
    const roles = useMemo(() => sortRoles(rolesQuery.data ?? []), [rolesQuery.data]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<RoleStatusFilter>('ALL');
    const visibleRoles = useMemo(() => filterRoles(roles, search, status, locale), [locale, roles, search, status]);

    const move = useMoveMemberRole();
    const canReorder = !search.trim() && status === 'ALL' && !move.isPending;
    const [drawer, setDrawer] = useState<MemberRoleDrawerState>({ open: false });

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedKey(event.currentTarget.value);
        setDrawer({ open: false });
    }, []);
    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value), []);
    const openCreate = useCallback(() => setDrawer({ open: true, role: null }), []);
    const openEdit = useCallback((roleId: string) => {
        const role = roles.find((item) => item.id === roleId);
        if (role) setDrawer({ open: true, role });
    }, [roles]);
    const closeDrawer = useCallback(() => setDrawer({ open: false }), []);
    const moveRole = useCallback(
        (roleId: string, direction: 'up' | 'down') => {
            const updates = planRoleMove(roles, roleId, direction);
            if (updates.length > 0) move.mutate(updates);
        },
        [move, roles],
    );

    return {
        eventTypes,
        eventTypeKey,
        roles,
        visibleRoles,
        search,
        status,
        setStatus,
        canReorder,
        moveError: move.error,
        drawer,
        createSortOrder: nextSortOrder(roles),
        isLoading: eventTypesQuery.isLoading || rolesQuery.isLoading,
        error: eventTypesQuery.error ?? rolesQuery.error ?? null,
        handleEventTypeChange,
        handleSearchChange,
        openCreate,
        openEdit,
        closeDrawer,
        moveRole,
    };
}
```

- [ ] **Step 2: Drawer state**

Create `hooks/useMemberRoleDrawer.ts`:

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { adminMemberRoleKeys, useCreateMemberRole, usePatchMemberRole, useSetMemberRoleRetired } from '@/hooks/useAdminMemberRoles';
import { ApiError } from '@/lib/api/client';
import { isNotFoundError } from '@/lib/api/errors';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import {
    buildCreatePayload,
    buildPatchPayload,
    draftFromRole,
    type MemberRoleDraft,
    normalizeRoleKeyInput,
    validateRoleDraft,
} from '@/lib/memberRoles';

export type MemberRoleDrawerError = { kind: 'keyTaken' } | { kind: 'notFound' } | { kind: 'other'; error: unknown };

function classifyError(error: unknown, isCreate: boolean): MemberRoleDrawerError {
    if (isCreate && error instanceof ApiError && error.status === 409) return { kind: 'keyTaken' };
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

export function useMemberRoleDrawer({
    role,
    eventTypeKey,
    sortOrder,
    onDoneAction,
}: {
    role: MemberRoleCatalogDto | null;
    eventTypeKey: string;
    sortOrder: number;
    onDoneAction: () => void;
}) {
    const isCreate = role === null;
    const queryClient = useQueryClient();
    const create = useCreateMemberRole();
    const patch = usePatchMemberRole();
    const retire = useSetMemberRoleRetired();

    const [draft, setDraft] = useState<MemberRoleDraft>(() => draftFromRole(role));
    const [submitted, setSubmitted] = useState(false);
    const [confirmingRetire, setConfirmingRetire] = useState(false);
    const [failure, setFailure] = useState<MemberRoleDrawerError | null>(null);

    const errors = useMemo(() => validateRoleDraft(draft, isCreate), [draft, isCreate]);
    const shownErrors = submitted ? errors : {};

    const fail = useCallback(
        (error: unknown) => {
            const classified = classifyError(error, isCreate);
            if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminMemberRoleKeys.all });
            setFailure(classified);
        },
        [isCreate, queryClient],
    );

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: name === 'roleKey' ? normalizeRoleKeyInput(value) : value }));
    }, []);
    const handleLimitModeChange = useCallback(
        (limited: boolean) => setDraft((current) => ({ ...current, limited, maxHolders: limited ? current.maxHolders || '1' : '' })),
        [],
    );
    const handleLimitValueChange = useCallback((maxHolders: string) => setDraft((current) => ({ ...current, maxHolders })), []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0) return;
            try {
                if (role === null) {
                    await create.mutateAsync(buildCreatePayload(draft, eventTypeKey, sortOrder));
                } else {
                    const input = buildPatchPayload(role, draft);
                    if (Object.keys(input).length > 0) await patch.mutateAsync({ id: role.id, input });
                }
                onDoneAction();
            } catch (error) {
                fail(error);
            }
        },
        [create, draft, errors, eventTypeKey, fail, onDoneAction, patch, role, sortOrder],
    );

    const requestRetire = useCallback(() => setConfirmingRetire(true), []);
    const cancelRetire = useCallback(() => setConfirmingRetire(false), []);
    const setRetired = useCallback(
        async (retired: boolean) => {
            if (!role) return;
            setFailure(null);
            try {
                await retire.mutateAsync({ id: role.id, retired });
                setConfirmingRetire(false);
                onDoneAction();
            } catch (error) {
                setConfirmingRetire(false);
                fail(error);
            }
        },
        [fail, onDoneAction, retire, role],
    );
    const confirmRetire = useCallback(() => setRetired(true), [setRetired]);
    const restore = useCallback(() => setRetired(false), [setRetired]);

    return {
        isCreate,
        draft,
        errors: shownErrors,
        failure,
        confirmingRetire,
        isSaving: create.isPending || patch.isPending,
        isRetiring: retire.isPending,
        handleFieldChange,
        handleLimitModeChange,
        handleLimitValueChange,
        handleSubmit,
        requestRetire,
        cancelRetire,
        confirmRetire,
        restore,
    };
}
```

- [ ] **Step 3: Types and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useMemberRolesCatalog.ts hooks/useMemberRoleDrawer.ts`
Expected: clean. (`ApiError` is exported from `lib/api/client.ts`; if it is re-exported from `lib/api/errors.ts` in this repo, either import works.)

- [ ] **Step 4: Commit**

```bash
git add hooks/useMemberRolesCatalog.ts hooks/useMemberRoleDrawer.ts
git commit -m "feat(admin): member roles panel and drawer state"
```

---

### Task 12: Panel, table, row and drawer components

**Files:**
- Create: `components/admin/memberRoles/MemberRolesPanel.tsx`, `MemberRolesTable.tsx`, `MemberRoleRow.tsx`, `MemberRoleDrawer.tsx`
- Test: `components/admin/memberRoles/MemberRoleDrawer.test.tsx`

- [ ] **Step 1: Row**

Create `components/admin/memberRoles/MemberRoleRow.tsx`:

```tsx
'use client';

import { ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { Locale } from '@/i18n/config';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function MemberRoleRow({
    role,
    isFirst,
    isLast,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    role: MemberRoleCatalogDto;
    isFirst: boolean;
    isLast: boolean;
    canReorder: boolean;
    onMoveAction: (roleId: string, direction: 'up' | 'down') => void;
    onEditAction: (roleId: string) => void;
}) {
    const t = useTranslations('AdminPage.memberRoles');
    const locale = useLocale() as Locale;
    const label = role.label[locale] || role.label.en;
    const status = role.retired ? 'RETIRED' : 'ACTIVE';

    function handleUp() {
        onMoveAction(role.id, 'up');
    }

    function handleDown() {
        onMoveAction(role.id, 'down');
    }

    function handleEdit() {
        onEditAction(role.id);
    }

    return (
        <tr className="border-b border-border/70 last:border-b-0">
            {/* Role */}
            <td className="px-3 py-2.5 text-sm font-semibold text-ink">
                {role.emoji && <span className="mr-1.5">{role.emoji}</span>}
                {label}
            </td>
            {/* Key */}
            <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{role.roleKey}</td>
            {/* Limit */}
            <td className="px-3 py-2.5">
                <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-[11px] font-bold text-ink-muted">
                    {role.maxHolders === null ? t('unlimited') : t('limitMax', { count: role.maxHolders })}
                </span>
            </td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        role.retired ? 'bg-status-neutral-wash text-status-neutral' : 'bg-status-good-wash text-status-good',
                    )}
                >
                    {t(`status.${status}`)}
                </span>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5">
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={handleUp}
                        disabled={!canReorder || isFirst}
                        aria-label={t('moveUp', { role: label })}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleDown}
                        disabled={!canReorder || isLast}
                        aria-label={t('moveDown', { role: label })}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </button>
                </div>
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={t('edit', { role: label })}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
}
```

- [ ] **Step 2: Table**

Create `components/admin/memberRoles/MemberRolesTable.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { MemberRoleRow } from '@/components/admin/memberRoles/MemberRoleRow';
import type { MemberRoleCatalogDto } from '@/lib/api/types';

export function MemberRolesTable({
    roles,
    hasAnyRoles,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    roles: MemberRoleCatalogDto[];
    hasAnyRoles: boolean;
    canReorder: boolean;
    onMoveAction: (roleId: string, direction: 'up' | 'down') => void;
    onEditAction: (roleId: string) => void;
}) {
    const t = useTranslations('AdminPage.memberRoles');

    if (roles.length === 0) {
        return <p className="px-3 py-8 text-center text-sm text-ink-muted">{hasAnyRoles ? t('noMatches') : t('empty')}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{t('columns.role')}</th>
                        <th className="px-3 py-2">{t('columns.key')}</th>
                        <th className="px-3 py-2">{t('columns.limit')}</th>
                        <th className="px-3 py-2">{t('columns.status')}</th>
                        <th className="px-3 py-2">{t('columns.order')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {roles.map((role, index) => (
                        <MemberRoleRow
                            key={role.id}
                            role={role}
                            isFirst={index === 0}
                            isLast={index === roles.length - 1}
                            canReorder={canReorder}
                            onMoveAction={onMoveAction}
                            onEditAction={onEditAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 3: Drawer**

Create `components/admin/memberRoles/MemberRoleDrawer.tsx`:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminLimitControl } from '@/components/admin/AdminLimitControl';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useMemberRoleDrawer } from '@/hooks/useMemberRoleDrawer';
import type { Locale } from '@/i18n/config';
import { getErrorMessage } from '@/lib/api/errors';
import type { MemberRoleCatalogDto } from '@/lib/api/types';

export function MemberRoleDrawer({
    role,
    eventTypeKey,
    eventTypeName,
    sortOrder,
    onCloseAction,
}: {
    role: MemberRoleCatalogDto | null;
    eventTypeKey: string;
    eventTypeName: string;
    sortOrder: number;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.memberRoles.drawer');
    const locale = useLocale() as Locale;
    const form = useMemberRoleDrawer({ role, eventTypeKey, sortOrder, onDoneAction: onCloseAction });
    const roleName = role ? role.label[locale] || role.label.en : '';
    const formId = 'member-role-form';

    const footer = (
        <div className="flex items-center justify-between gap-2">
            {/* Retire or restore */}
            <div>
                {role && !role.retired && (
                    <button type="button" onClick={form.requestRetire} className="h-9 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-canvas">
                        {t('retire')}
                    </button>
                )}
                {role?.retired && (
                    <button
                        type="button"
                        onClick={form.restore}
                        disabled={form.isRetiring}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                    >
                        {t('restore')}
                    </button>
                )}
            </div>
            {/* Save */}
            <div className="flex gap-2">
                <button type="button" onClick={onCloseAction} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    form={formId}
                    disabled={form.isSaving || form.failure?.kind === 'notFound'}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('save')}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <AdminDrawer open onClose={onCloseAction} title={role ? roleName : t('createTitle')} closeLabel={t('close')} footer={footer}>
                <form id={formId} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure?.kind === 'notFound' && <p className="text-sm text-status-danger">{t('notFound')}</p>}
                    {form.failure?.kind === 'other' && <p className="text-sm text-status-danger">{getErrorMessage(form.failure.error)}</p>}

                    {/* Identity */}
                    <AdminField label={t('eventType')}>
                        <p className="text-sm text-ink">{eventTypeName}</p>
                    </AdminField>
                    <AdminField
                        label={t('key')}
                        required={form.isCreate}
                        hint={form.failure?.kind === 'keyTaken' ? t('keyTaken') : form.errors.roleKey ? t('keyInvalid') : undefined}
                    >
                        {form.isCreate ? (
                            <input
                                name="roleKey"
                                value={form.draft.roleKey}
                                onChange={form.handleFieldChange}
                                maxLength={50}
                                autoComplete="off"
                                aria-invalid={Boolean(form.errors.roleKey) || form.failure?.kind === 'keyTaken'}
                                className={adminInputClass('font-mono')}
                            />
                        ) : (
                            <p className="font-mono text-sm text-ink">{form.draft.roleKey}</p>
                        )}
                    </AdminField>

                    {/* Labels */}
                    <AdminField label={t('labelEn')} required hint={form.errors.labelEn ? t('labelInvalid') : undefined}>
                        <input
                            name="labelEn"
                            value={form.draft.labelEn}
                            onChange={form.handleFieldChange}
                            maxLength={40}
                            aria-invalid={Boolean(form.errors.labelEn)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('labelEl')} required hint={form.errors.labelEl ? t('labelInvalid') : undefined}>
                        <input
                            name="labelEl"
                            value={form.draft.labelEl}
                            onChange={form.handleFieldChange}
                            maxLength={40}
                            aria-invalid={Boolean(form.errors.labelEl)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('emoji')} optional hint={form.errors.emoji ? t('emojiInvalid') : undefined}>
                        <input
                            name="emoji"
                            value={form.draft.emoji}
                            onChange={form.handleFieldChange}
                            aria-invalid={Boolean(form.errors.emoji)}
                            className={adminInputClass('w-24')}
                        />
                    </AdminField>

                    {/* Limit */}
                    <AdminLimitControl
                        label={t('limit')}
                        limited={form.draft.limited}
                        value={form.draft.maxHolders}
                        min={1}
                        error={form.errors.maxHolders ? t('limitInvalid') : undefined}
                        unlimitedLabel={t('unlimited')}
                        upToLabel={t('upTo')}
                        onModeChangeAction={form.handleLimitModeChange}
                        onValueChangeAction={form.handleLimitValueChange}
                    />
                </form>
            </AdminDrawer>

            {/* Retire confirmation */}
            <ConfirmActionModal
                open={form.confirmingRetire}
                onCloseAction={form.cancelRetire}
                title={t('retireTitle', { role: roleName })}
                body={<p className="text-sm text-ink-muted">{t('retireBody')}</p>}
                cancelLabel={t('cancel')}
                confirmLabel={t('retireConfirm')}
                isConfirming={form.isRetiring}
                onConfirmAction={form.confirmRetire}
            />
        </>
    );
}
```

Check `ConfirmActionModal`'s `body` prop type before using a `<p>`; if it takes a string, pass `t('retireBody')` directly.

- [ ] **Step 4: Panel**

Create `components/admin/memberRoles/MemberRolesPanel.tsx`:

```tsx
'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { MemberRoleDrawer } from '@/components/admin/memberRoles/MemberRoleDrawer';
import { MemberRolesTable } from '@/components/admin/memberRoles/MemberRolesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useMemberRolesCatalog } from '@/hooks/useMemberRolesCatalog';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { ROLE_STATUS_FILTERS, type RoleStatusFilter } from '@/lib/memberRoles';
import { cn } from '@/lib/utils';

export function MemberRolesPanel() {
    const t = useTranslations('AdminPage.memberRoles');
    const tAdmin = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const catalog = useMemberRolesCatalog();
    const eventType = catalog.eventTypes.find((item) => item.eventTypeKey === catalog.eventTypeKey);

    function handleStatusClick(event: MouseEvent<HTMLButtonElement>) {
        catalog.setStatus(event.currentTarget.dataset.status as RoleStatusFilter);
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
                <AdminField label={t('eventType')} className="min-w-48">
                    <select value={catalog.eventTypeKey ?? ''} onChange={catalog.handleEventTypeChange} className={adminInputClass()}>
                        {catalog.eventTypes.map((item) => (
                            <option key={item.eventTypeKey} value={item.eventTypeKey}>
                                {localizedText(item.name, item.eventTypeKey)}
                            </option>
                        ))}
                    </select>
                </AdminField>
                <button
                    type="button"
                    onClick={catalog.openCreate}
                    disabled={!catalog.eventTypeKey}
                    className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </div>

            {/* Roles */}
            <section className="rounded-xl border border-border bg-card">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input
                            value={catalog.search}
                            onChange={catalog.handleSearchChange}
                            placeholder={t('search')}
                            aria-label={t('search')}
                            className={adminInputClass('w-full pl-8')}
                        />
                    </div>
                    <div className="flex gap-1 rounded-lg bg-canvas p-1">
                        {ROLE_STATUS_FILTERS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                data-status={status}
                                onClick={handleStatusClick}
                                aria-pressed={catalog.status === status}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    catalog.status === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                                )}
                            >
                                {t(`filters.${status}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {catalog.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {catalog.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.error)}`)}</p>}
                {catalog.moveError && <p className="px-3 pt-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.moveError)}`)}</p>}
                {!catalog.isLoading && !catalog.error && (
                    <MemberRolesTable
                        roles={catalog.visibleRoles}
                        hasAnyRoles={catalog.roles.length > 0}
                        canReorder={catalog.canReorder}
                        onMoveAction={catalog.moveRole}
                        onEditAction={catalog.openEdit}
                    />
                )}
            </section>

            {/* Drawer */}
            {catalog.drawer.open && catalog.eventTypeKey && (
                <MemberRoleDrawer
                    key={catalog.drawer.role?.id ?? 'new'}
                    role={catalog.drawer.role}
                    eventTypeKey={catalog.eventTypeKey}
                    eventTypeName={eventType ? localizedText(eventType.name, eventType.eventTypeKey) : catalog.eventTypeKey}
                    sortOrder={catalog.createSortOrder}
                    onCloseAction={catalog.closeDrawer}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 5: Drawer test**

Create `components/admin/memberRoles/MemberRoleDrawer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemberRoleDrawer } from '@/components/admin/memberRoles/MemberRoleDrawer';
import type { MemberRoleCatalogDto } from '@/lib/api/types';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) => (
        <div>
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({ open, title, confirmLabel, onConfirmAction }: { open: boolean; title: string; confirmLabel: string; onConfirmAction: () => void }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useMemberRoleDrawer', () => ({ useMemberRoleDrawer: () => drawerState.current }));

afterEach(cleanup);

const ROLE: MemberRoleCatalogDto = {
    id: 'r1',
    eventTypeKey: 'WEDDING',
    roleKey: 'BEST_MAN',
    label: { en: 'Best man', el: 'Κουμπάρος' },
    emoji: null,
    maxHolders: null,
    sortOrder: 0,
    retired: false,
};

function state(overrides: Record<string, unknown> = {}) {
    drawerState.current = {
        isCreate: false,
        draft: { roleKey: 'BEST_MAN', labelEn: 'Best man', labelEl: 'Κουμπάρος', emoji: '', limited: false, maxHolders: '' },
        errors: {},
        failure: null,
        confirmingRetire: false,
        isSaving: false,
        isRetiring: false,
        handleFieldChange: vi.fn(),
        handleLimitModeChange: vi.fn(),
        handleLimitValueChange: vi.fn(),
        handleSubmit: vi.fn(),
        requestRetire: vi.fn(),
        cancelRetire: vi.fn(),
        confirmRetire: vi.fn(),
        restore: vi.fn(),
        ...overrides,
    };
}

function renderDrawer(role: MemberRoleCatalogDto | null = ROLE) {
    render(<MemberRoleDrawer role={role} eventTypeKey="WEDDING" eventTypeName="Wedding" sortOrder={0} onCloseAction={vi.fn()} />);
}

describe('MemberRoleDrawer', () => {
    it('shows the key read-only when editing', () => {
        state();
        renderDrawer();
        expect(screen.getByText('BEST_MAN')).toBeTruthy();
        expect(screen.queryByRole('textbox', { name: 'key' })).toBeNull();
    });

    it('asks before retiring', () => {
        const requestRetire = vi.fn();
        state({ requestRetire });
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'retire' }));
        expect(requestRetire).toHaveBeenCalled();
    });

    it('retires from the confirmation', () => {
        const confirmRetire = vi.fn();
        state({ confirmingRetire: true, confirmRetire });
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'retireConfirm' }));
        expect(confirmRetire).toHaveBeenCalled();
    });

    it('offers restore for a retired role', () => {
        state();
        renderDrawer({ ...ROLE, retired: true });
        expect(screen.getByRole('button', { name: 'restore' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'retire' })).toBeNull();
    });

    it('shows key taken on the key field', () => {
        state({ isCreate: true, failure: { kind: 'keyTaken' } });
        renderDrawer(null);
        expect(screen.getByText('keyTaken')).toBeTruthy();
    });

    it('shows not found and disables save', () => {
        state({ failure: { kind: 'notFound' } });
        renderDrawer();
        expect(screen.getByText('notFound')).toBeTruthy();
        expect((screen.getByRole('button', { name: 'save' }) as HTMLButtonElement).disabled).toBe(true);
    });
});
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run components/admin/memberRoles`
Expected: PASS (6 tests).

- [ ] **Step 7: Types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add components/admin/memberRoles
git commit -m "feat(admin): member roles table and drawer"
```

---

### Task 13: Settings → Member roles navigation

**Files:**
- Modify: `lib/adminPlansRouting.ts`, `lib/adminPlansRouting.test.ts`
- Modify: `hooks/usePlansSection.ts`
- Modify: `components/admin/plans/PlansRail.tsx`, `components/admin/plans/PlansSection.tsx`
- Create: `components/admin/plans/PlansSettingsMemberRoles.tsx`

- [ ] **Step 1: Failing routing test**

In `lib/adminPlansRouting.test.ts`, in `reads the settings views` add:

```ts
        expect(parsePlansHash('#plans/settings/member-roles')).toEqual({ view: 'settingsMemberRoles', key: null });
```

and in the `formatPlansHash` describe add:

```ts
    it('formats the member roles view', () => {
        expect(formatPlansHash({ view: 'settingsMemberRoles', key: null })).toBe('#plans/settings/member-roles');
    });
```

Run: `npx vitest run lib/adminPlansRouting.test.ts`
Expected: FAIL.

- [ ] **Step 2: Routing**

In `lib/adminPlansRouting.ts`:

```ts
export type PlansView =
    | { view: 'eventType'; key: string | null }
    | { view: 'settingsModules'; key: null }
    | { view: 'settingsEventTypes'; key: null }
    | { view: 'settingsMemberRoles'; key: null };
```

In `parsePlansHash`, after the `settings/event-types` line:

```ts
    if (rest === 'settings/member-roles') return { view: 'settingsMemberRoles', key: null };
```

In `formatPlansHash`, after the `settingsEventTypes` line:

```ts
    if (view.view === 'settingsMemberRoles') return `${PLANS_HASH_ROOT}/settings/member-roles`;
```

Run: `npx vitest run lib/adminPlansRouting.test.ts`
Expected: PASS.

- [ ] **Step 3: Section hook**

In `hooks/usePlansSection.ts`, after `openSettingsEventTypes`:

```ts
    const openSettingsMemberRoles = useCallback(() => setView({ view: 'settingsMemberRoles', key: null }), [setView]);
```

and add `openSettingsMemberRoles,` to the returned object after `openSettingsEventTypes,`.

- [ ] **Step 4: Rail item**

In `components/admin/plans/PlansRail.tsx` add the prop `onOpenSettingsMemberRolesAction: () => void;` (destructure it too) and, after the Event types `AdminRailItem`:

```tsx
                    <AdminRailItem active={view.view === 'settingsMemberRoles'} onClick={onOpenSettingsMemberRolesAction}>
                        {t('rail.memberRoles')}
                    </AdminRailItem>
```

- [ ] **Step 5: Settings pane**

Create `components/admin/plans/PlansSettingsMemberRoles.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { MemberRolesPanel } from '@/components/admin/memberRoles/MemberRolesPanel';

export function PlansSettingsMemberRoles() {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('settings.memberRolesTitle')}</h2>
            </header>
            <MemberRolesPanel />
        </div>
    );
}
```

- [ ] **Step 6: Wire into the section**

In `components/admin/plans/PlansSection.tsx` import `PlansSettingsMemberRoles`, pass `onOpenSettingsMemberRolesAction={section.openSettingsMemberRoles}` to `PlansRail`, and after the event types pane line add:

```tsx
                {section.view.view === 'settingsMemberRoles' && <PlansSettingsMemberRoles />}
```

- [ ] **Step 7: Types, lint, full tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all clean and passing.

- [ ] **Step 8: Commit**

```bash
git add lib/adminPlansRouting.ts lib/adminPlansRouting.test.ts hooks/usePlansSection.ts components/admin/plans
git commit -m "feat(admin): Plans → Settings → Member roles"
```

---

### Task 14: Visual check

The dev server shares `.next`. Do **not** start one with `preview_start {name}`; if `http://localhost:3000` isn't already running, ask the user to start it.

- [ ] **Step 1: Admin, desktop.** Open `http://localhost:3000` in the browser pane (`preview_start {url: "http://localhost:3000/"}`), go to the admin console `#plans/settings/member-roles`. Check: rail item active, event-type select, filters, table columns, pills, arrows disabled at the ends and while searching, drawer create/edit, retire confirmation.
- [ ] **Step 2: Plan grid popover.** Plans → an event type → a `co_hosts`, `gallery` and `member_roles` cell. Check labelled controls, Advanced collapsed, confirm step wording.
- [ ] **Step 3: Mobile width.** Resize to the mobile preset and check the admin screen for overlap and horizontal scroll inside the table only. Reset to desktop afterwards.
- [ ] **Step 4: Plan cards.** Landing pricing and the create-event plan step: the member roles line reads "N member roles" / "+ your own" (needs the backend's `memberRolesByEventType`; if the local backend predates it, the line falls back or hides — note which).
- [ ] **Step 5: Report** anything off to the user with screenshots before fixing.

---

## Self-review notes

- Spec §1 (catalog): Tasks 3, 10, 11, 12, 13. §2 (popover): Tasks 6, 7, 8, 9. §3 (contract, breaking, labels, card): Tasks 1, 2, 4, 5, 9. §4 (testing): tests in Tasks 2, 3, 5, 6, 12, 13 plus Task 14.
- Deviation: 404 keeps the drawer open (see header).
- Edit-mode position: not in the drawer, per the spec.
