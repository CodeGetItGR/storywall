# Member Roles B: Picker and Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members pick their own role per event, hosts manage roles in Manage → Members, and roles show as chips next to author names.

**Architecture:** Pure role logic (drafts, requests, error kinds, cache patchers, gating) lives in `lib/memberRoles.ts`. Hooks wrap the three role endpoints and patch every cached copy of the member after a 204. One `MyRoleSheetHost` in the event layout opens the member's sheet from a one-shot `?sheet=role` trigger (stripped with `router.replace` before the sheet opens) or from the one-time prompt; the shared `Modal` already closes on Back through `useOverlayHistory`, so no history code is added. The host sheet in Manage → Members reuses the same form hook and picker list.

**Tech Stack:** Next.js App Router, React 19, TanStack Query, next-intl, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-03-member-roles-b-picker-display-design.md`

**Deviation from the spec (mechanism only, behavior unchanged):** the spec had `open()` push the param and `close()` call `router.back()`. While planning we found `components/ui/modal.tsx` already registers every open modal with `useOverlayHistory`, which pushes its own history entry so Back closes the sheet. Pushing a second entry would double it. So the param is only a trigger: it is removed with `replace`, then the sheet opens and the Modal handles Back. `useMyRoleSheet.test.tsx` from the spec is replaced by tests of the pure URL helpers.

**Not prefetched server-side:** the picker options (`GET member-roles`) load only when a user opens a sheet, so they are not route-derivable page data; no server prefetch is added.

**Error copy:** Task 1 also gives each new code a generic `ApiErrors.memberRole*` message (codebase convention: every `ERROR_CODES` entry is mapped in `lib/api/errorMessageKeys.ts`). `MemberRoles.errors` only holds the two messages with numbers (`length`, `full`).

**Branch:** `feat/member-roles-b` (already created from `staging`, spec committed).

---

## File structure

| File | Responsibility |
|---|---|
| `lib/api/types.ts` (modify) | `AuthorDto.roleKey/customRole`, `MemberRoleOptionsDto`, `MemberRoleOptionDto`, `MemberRoleRequestDto` |
| `lib/api/endpoints.ts` (modify) | `events.memberRoles`, `eventMembers.role`, `eventMembers.roleLock` |
| `lib/api/errors.ts` (modify) | member role error codes |
| `lib/routes.ts` (modify) | `sheet` param on `routes.events.feed` |
| `lib/memberRoles.ts` (modify) | drafts, requests, error kinds, cache patchers, gating, URL helpers |
| `hooks/useMemberRoleOptions.ts` (create) | `GET member-roles` query |
| `hooks/useMemberRoleMutations.ts` (create) | set / clear / unlock + cache patching |
| `hooks/useRoleErrorMessage.ts` (create) | error → localized copy |
| `hooks/useRoleForm.ts` (create) | draft + save/clear state shared by both sheets |
| `hooks/useMemberRoleUnlock.ts` (create) | host unlock action state |
| `hooks/useAuthorRole.ts` (create) | chip label + "is mine" for an author |
| `hooks/useOpenMyRoleSheet.ts` (create) | adds the `?sheet=role` trigger |
| `hooks/useRolePromptOnce.ts` (create) | one-time prompt |
| `hooks/useMyRoleSheet.ts` (create) | sheet open state in the event layout |
| `hooks/useMemberRoleSheet.ts` (create) | host's selected member |
| `components/memberRoles/RoleChip.tsx` (create) | the pill |
| `components/memberRoles/AuthorRoleChip.tsx` (create) | chip for an `AuthorDto` |
| `components/memberRoles/RolePickerList.tsx` (create) | radio list + Other |
| `components/memberRoles/RoleSheet.tsx` (create) | sheet frame |
| `components/memberRoles/RoleFormBody.tsx` (create) | form, loading, list, error |
| `components/memberRoles/RoleSheetFooter.tsx` (create) | Clear + Save |
| `components/memberRoles/MyRoleSheet.tsx` (create) | member sheet |
| `components/memberRoles/MyRoleSheetHost.tsx` (create) | layout mount |
| `components/manage/members/MemberRoleSheet.tsx` (create) | host sheet |
| `components/manage/members/MemberRow.tsx`, `MembersPanel.tsx` (modify) | row chip, open sheet |
| `components/feed/post/PostAuthorAvatar.tsx`, `components/feed/PostCard.tsx`, `CommentThreadItem.tsx`, `ReplyItem.tsx`, `components/story/StoryHeader.tsx`, `StoryModal.tsx` (modify) | chips |
| `hooks/useToolsMenuItems.ts` (modify) | "My role" item |
| `app/(main)/(app)/(event)/layout.tsx` (modify) | mount `MyRoleSheetHost` |
| `messages/en.json`, `messages/el.json` (modify) | `MemberRoles` namespace, `ToolsMenu.items.myRole` |

---

### Task 1: Contract

**Files:**
- Modify: `lib/api/types.ts` (AuthorDto near line 2241; add new DTOs right after `MemberRoleCatalogPatchDto`)
- Modify: `lib/api/endpoints.ts` (`events` block near line 87, `eventMembers` block near line 173)
- Modify: `lib/api/errors.ts` (`ERROR_CODES`)
- Modify: `lib/routes.ts` (line 69)

- [ ] **Step 1: Extend `AuthorDto`**

Replace the interface body in `lib/api/types.ts`:

```ts
export interface AuthorDto {
    memberId: string;
    displayName: string;
    nickname: string | null;
    role: EventRole;
    avatarUrl: string | null;
    // member-roles-fe-integration.md §3.1. At most one is set; both null when
    // the member_roles module is off for the event.
    roleKey: string | null;
    customRole: string | null;
}
```

- [ ] **Step 2: Add picker DTOs** after `MemberRoleCatalogPatchDto`:

```ts
// GET /api/events/{eventId}/member-roles (member-roles-fe-integration.md §2.1).
export interface MemberRoleOptionDto {
    roleKey: string;
    label: { en: string; el: string };
    emoji: string | null;
    maxHolders: number | null;
    holders: number;
    available: boolean;
}

export interface MemberRoleOptionsDto {
    allowCustom: boolean;
    // The caller's own custom text is locked.
    customLocked: boolean;
    roles: MemberRoleOptionDto[];
}

// PUT /api/event-members/{id}/role: exactly one field.
export type MemberRoleRequestDto = { roleKey: string; customRole?: never } | { customRole: string; roleKey?: never };
```

- [ ] **Step 3: Endpoints.** In `events` add after `modules`:

```ts
        memberRoles: (eventId: string) => `/api/events/${eventId}/member-roles`,
```

In `eventMembers` add after `demoAvatar`:

```ts
        role: (id: string) => `/api/event-members/${id}/role`,
        roleLock: (id: string) => `/api/event-members/${id}/role-lock`,
```

- [ ] **Step 4: Error codes.** Add to `ERROR_CODES` (keep numeric order where the file groups them):

```ts
    MEMBER_ROLE_INVALID_REQUEST: 3040,
    MEMBER_ROLE_UNKNOWN: 3041,
    MEMBER_ROLE_CUSTOM_BLOCKED: 3042,
    MEMBER_ROLE_CUSTOM_NOT_ALLOWED: 4016,
    MEMBER_ROLE_CUSTOM_LOCKED: 4017,
    MEMBER_ROLE_FEATURED_MEMBER: 5113,
    MEMBER_ROLE_CAP_REACHED: 5114,
```

- [ ] **Step 5: Feed route param.** In `lib/routes.ts` replace the `feed` line:

```ts
        feed: (eventId: string, params: { post?: string | null; sheet?: 'role' | null } = {}) => withQuery(`${eventBasePath(eventId)}/feed`, params),
```

- [ ] **Step 6: Fix fixtures that build `AuthorDto`.** Run `npx tsc --noEmit -p .`. Every object literal typed `AuthorDto` that now misses the two fields fails; add `roleKey: null, customRole: null` to each (expected in `lib/demo/*`, test fixtures). Re-run until clean.

Expected: `tsc` exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A lib/ hooks/ components/ app/
git commit -m "feat(member-roles): picker contract types, endpoints and error codes"
```

---

### Task 2: Pure role logic

**Files:**
- Modify: `lib/memberRoles.ts`
- Test: `lib/memberRoles.test.ts`

- [ ] **Step 1: Write failing tests.** Append to `lib/memberRoles.test.ts` (keep existing imports; add the new names to the import from `@/lib/memberRoles`, plus `ApiError` from `@/lib/api/client`):

```ts
import { ApiError } from '@/lib/api/client';
import {
    buildRoleRequest,
    canEditOwnRole,
    canManageMemberRoles,
    canSaveDraft,
    draftFromMember,
    isOptionDisabled,
    memberHasRole,
    optionLabel,
    OTHER_CHOICE,
    roleErrorKind,
    withAuthorRole,
    withMemberRole,
    withoutRoleSheetParam,
    withRoleSheetParam,
} from '@/lib/memberRoles';

const NO_ROLE = { relationshipRole: null, customRelationshipRole: null };

describe('draftFromMember', () => {
    it('starts from the catalog role', () => {
        expect(draftFromMember({ relationshipRole: 'BEST_MAN', customRelationshipRole: null })).toEqual({ choice: 'BEST_MAN', customText: '' });
    });
    it('starts on Other with the custom text', () => {
        expect(draftFromMember({ relationshipRole: null, customRelationshipRole: 'Uncle' })).toEqual({ choice: OTHER_CHOICE, customText: 'Uncle' });
    });
    it('starts empty', () => {
        expect(draftFromMember(NO_ROLE)).toEqual({ choice: null, customText: '' });
    });
});

describe('buildRoleRequest', () => {
    it('sends the catalog key', () => {
        expect(buildRoleRequest({ choice: 'BRIDE', customText: 'x' })).toEqual({ roleKey: 'BRIDE' });
    });
    it('sends normalized custom text', () => {
        expect(buildRoleRequest({ choice: OTHER_CHOICE, customText: '  Uncle   from  Melbourne ' })).toEqual({ customRole: 'Uncle from Melbourne' });
    });
    it('sends nothing for blank Other or no choice', () => {
        expect(buildRoleRequest({ choice: OTHER_CHOICE, customText: '   ' })).toBeNull();
        expect(buildRoleRequest({ choice: null, customText: '' })).toBeNull();
    });
});

describe('canSaveDraft', () => {
    it('needs a change', () => {
        expect(canSaveDraft({ choice: 'BRIDE', customText: '' }, { relationshipRole: 'BRIDE', customRelationshipRole: null }, 40)).toBe(false);
        expect(canSaveDraft({ choice: 'GROOM', customText: '' }, { relationshipRole: 'BRIDE', customRelationshipRole: null }, 40)).toBe(true);
        expect(canSaveDraft({ choice: OTHER_CHOICE, customText: 'Uncle' }, { relationshipRole: null, customRelationshipRole: 'Uncle' }, 40)).toBe(false);
    });
    it('rejects custom text over the limit', () => {
        expect(canSaveDraft({ choice: OTHER_CHOICE, customText: 'x'.repeat(41) }, NO_ROLE, 40)).toBe(false);
    });
    it('switching from custom text to a catalog role is a change', () => {
        expect(canSaveDraft({ choice: 'BRIDE', customText: '' }, { relationshipRole: null, customRelationshipRole: 'Uncle' }, 40)).toBe(true);
    });
});

describe('memberHasRole', () => {
    it('is true for either kind', () => {
        expect(memberHasRole(NO_ROLE)).toBe(false);
        expect(memberHasRole({ relationshipRole: 'BRIDE', customRelationshipRole: null })).toBe(true);
        expect(memberHasRole({ relationshipRole: null, customRelationshipRole: 'x' })).toBe(true);
    });
});

const OPTION = { roleKey: 'BEST_MAN', label: { en: 'Best man', el: 'Κουμπάρος' }, emoji: '🥂', maxHolders: 2, holders: 2, available: false };

describe('options', () => {
    it('labels in the locale with the emoji', () => {
        expect(optionLabel(OPTION, 'el')).toBe('🥂 Κουμπάρος');
        expect(optionLabel({ ...OPTION, emoji: null, label: { en: 'Best man', el: '' } }, 'el')).toBe('Best man');
    });
    it('disables a full role unless it is the current one', () => {
        expect(isOptionDisabled(OPTION, null)).toBe(true);
        expect(isOptionDisabled(OPTION, 'BEST_MAN')).toBe(false);
        expect(isOptionDisabled({ ...OPTION, available: true }, null)).toBe(false);
    });
});

describe('roleErrorKind', () => {
    const error = (status: number, errorCode: number) => new ApiError(status, { errorCode });
    it('maps every role code', () => {
        expect(roleErrorKind(error(400, 3040))).toBe('length');
        expect(roleErrorKind(error(400, 3042))).toBe('blocked');
        expect(roleErrorKind(error(400, 3041))).toBe('stale');
        expect(roleErrorKind(error(403, 4016))).toBe('stale');
        expect(roleErrorKind(error(403, 4017))).toBe('locked');
        expect(roleErrorKind(error(409, 5114))).toBe('full');
        expect(roleErrorKind(error(409, 5113))).toBe('featured');
        expect(roleErrorKind(error(409, 5012))).toBe('moduleOff');
        expect(roleErrorKind(error(409, 5014))).toBe('other');
        expect(roleErrorKind(new Error('x'))).toBe('other');
    });
});

const ROLE = { roleKey: 'BRIDE', customRole: null };
const author = (memberId: string) => ({ memberId, displayName: 'A', nickname: null, role: 'MEMBER' as const, avatarUrl: null, roleKey: null, customRole: null });

describe('withAuthorRole', () => {
    it('patches a single item', () => {
        expect(withAuthorRole({ id: 'p1', author: author('m1') }, 'm1', ROLE).author.roleKey).toBe('BRIDE');
    });
    it('leaves other authors and authorless items alone', () => {
        const item = { id: 'p1', author: author('m2') };
        expect(withAuthorRole(item, 'm1', ROLE)).toBe(item);
        const media = { id: 'x' };
        expect(withAuthorRole(media, 'm1', ROLE)).toBe(media);
    });
    it('patches arrays and infinite pages', () => {
        expect(withAuthorRole([{ author: author('m1') }], 'm1', ROLE)[0].author.roleKey).toBe('BRIDE');
        const infinite = { pages: [{ content: [{ author: author('m1') }, { author: author('m2') }] }], pageParams: [0] };
        const patched = withAuthorRole(infinite, 'm1', ROLE);
        expect(patched.pages[0].content[0].author.roleKey).toBe('BRIDE');
        expect(patched.pages[0].content[1].author.roleKey).toBeNull();
        expect(patched.pageParams).toEqual([0]);
    });
    it('passes undefined through', () => {
        expect(withAuthorRole(undefined, 'm1', ROLE)).toBeUndefined();
    });
});

describe('withMemberRole', () => {
    it('updates only that member', () => {
        const members = [
            { id: 'm1', ...NO_ROLE },
            { id: 'm2', ...NO_ROLE },
        ];
        const result = withMemberRole(members, 'm1', { roleKey: null, customRole: 'Uncle' });
        expect(result[0]).toEqual({ id: 'm1', relationshipRole: null, customRelationshipRole: 'Uncle' });
        expect(result[1]).toBe(members[1]);
    });
});

const liveEvent = {
    status: 'ACTIVE' as const,
    deletedAt: null,
    suspended: false,
    modules: [{ moduleKey: 'member_roles', isEnabled: true, isAvailable: true }],
};

describe('gating', () => {
    it('lets a non-featured member of a live event with the module edit their role', () => {
        expect(canEditOwnRole(liveEvent, { isFeatured: false })).toBe(true);
    });
    it('blocks featured members, drafts, deleted, suspended and module-off events', () => {
        expect(canEditOwnRole(liveEvent, { isFeatured: true })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, status: 'DRAFT' }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, deletedAt: '2026-01-01T00:00:00Z' }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, suspended: true }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole({ ...liveEvent, modules: [] }, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole(null, { isFeatured: false })).toBe(false);
        expect(canEditOwnRole(liveEvent, null)).toBe(false);
    });
    it('lets moderators of a live event manage roles', () => {
        expect(canManageMemberRoles(liveEvent, true)).toBe(true);
        expect(canManageMemberRoles(liveEvent, false)).toBe(false);
        expect(canManageMemberRoles({ ...liveEvent, modules: [] }, true)).toBe(false);
    });
});

describe('role sheet URL', () => {
    it('adds and removes the trigger, keeping other params', () => {
        expect(withRoleSheetParam('/events/e1/feed', 'post=p1')).toBe('/events/e1/feed?post=p1&sheet=role');
        expect(withoutRoleSheetParam('/events/e1/feed', 'post=p1&sheet=role')).toBe('/events/e1/feed?post=p1');
        expect(withoutRoleSheetParam('/events/e1/feed', 'sheet=role')).toBe('/events/e1/feed');
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/memberRoles.test.ts`
Expected: FAIL (new exports missing).

- [ ] **Step 3: Implement.** Add to `lib/memberRoles.ts`. Update the imports at the top:

```ts
import type { Locale } from '@/i18n/config';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type {
    AuthorDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventStatus,
    MemberRoleCatalogDto,
    MemberRoleCatalogPatchDto,
    MemberRoleCatalogRequestDto,
    MemberRoleOptionDto,
    MemberRoleRequestDto,
} from '@/lib/api/types';
import { isEventDeleted, isModuleAvailable } from '@/lib/eventLifecycle';
```

Append at the end of the file:

```ts
// ── Member picker (member-roles-fe-integration.md §2) ──

export const OTHER_CHOICE = '__other__';
// /api/config memberCustomRelationshipRoleMaxLength, used until config loads.
export const DEFAULT_CUSTOM_ROLE_MAX = 40;

type MemberRoleFields = Pick<EventMemberResponseDto, 'relationshipRole' | 'customRelationshipRole'>;
export type RoleValue = { roleKey: string | null; customRole: string | null };

// choice is a catalog roleKey, OTHER_CHOICE, or null when nothing is picked.
export type RolePickerDraft = { choice: string | null; customText: string };

export function memberHasRole(member: MemberRoleFields): boolean {
    return Boolean(member.relationshipRole || member.customRelationshipRole);
}

export function draftFromMember(member: MemberRoleFields): RolePickerDraft {
    if (member.customRelationshipRole) return { choice: OTHER_CHOICE, customText: member.customRelationshipRole };
    return { choice: member.relationshipRole, customText: '' };
}

// Mirrors the server's whitespace normalization so the cached copy matches.
function normalizeCustomRole(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function buildRoleRequest(draft: RolePickerDraft): MemberRoleRequestDto | null {
    if (draft.choice === null) return null;
    if (draft.choice !== OTHER_CHOICE) return { roleKey: draft.choice };
    const customRole = normalizeCustomRole(draft.customText);
    return customRole ? { customRole } : null;
}

export function canSaveDraft(draft: RolePickerDraft, member: MemberRoleFields, maxLength: number): boolean {
    const request = buildRoleRequest(draft);
    if (!request) return false;
    if (request.customRole !== undefined) {
        return request.customRole.length <= maxLength && request.customRole !== member.customRelationshipRole;
    }
    return request.roleKey !== member.relationshipRole;
}

export function roleValueFromRequest(request: MemberRoleRequestDto): RoleValue {
    return { roleKey: request.roleKey ?? null, customRole: request.customRole ?? null };
}

export function optionLabel(option: MemberRoleOptionDto, locale: Locale): string {
    const label = option.label[locale] || option.label.en;
    return option.emoji ? `${option.emoji} ${label}` : label;
}

// A full role stays pickable for the member who already holds it.
export function isOptionDisabled(option: MemberRoleOptionDto, currentRoleKey: string | null): boolean {
    return !option.available && option.roleKey !== currentRoleKey;
}

export type RoleErrorKind = 'length' | 'blocked' | 'stale' | 'locked' | 'full' | 'featured' | 'moduleOff' | 'other';

export function roleErrorKind(error: unknown): RoleErrorKind {
    switch (getErrorCode(error)) {
        case ERROR_CODES.MEMBER_ROLE_INVALID_REQUEST:
            return 'length';
        case ERROR_CODES.MEMBER_ROLE_CUSTOM_BLOCKED:
            return 'blocked';
        case ERROR_CODES.MEMBER_ROLE_UNKNOWN:
        case ERROR_CODES.MEMBER_ROLE_CUSTOM_NOT_ALLOWED:
            return 'stale';
        case ERROR_CODES.MEMBER_ROLE_CUSTOM_LOCKED:
            return 'locked';
        case ERROR_CODES.MEMBER_ROLE_CAP_REACHED:
            return 'full';
        case ERROR_CODES.MEMBER_ROLE_FEATURED_MEMBER:
            return 'featured';
        case ERROR_CODES.MODULE_NOT_AVAILABLE:
            return 'moduleOff';
        default:
            return 'other';
    }
}

// ── Cache patching (guide §8: PUT/DELETE return 204, the client updates itself) ──

function patchAuthored(item: unknown, memberId: string, role: RoleValue): unknown {
    if (!item || typeof item !== 'object' || !('author' in item)) return item;
    const author = (item as { author: AuthorDto | null }).author;
    if (!author || author.memberId !== memberId) return item;
    return { ...item, author: { ...author, roleKey: role.roleKey, customRole: role.customRole } };
}

// Updates the author's role on a post, comment or story, on an array of them,
// or on an infinite query's pages. Anything else passes through unchanged.
export function withAuthorRole<T>(data: T, memberId: string, role: RoleValue): T {
    if (Array.isArray(data)) return data.map((item) => patchAuthored(item, memberId, role)) as T;
    if (data && typeof data === 'object' && 'pages' in data && Array.isArray((data as { pages: unknown }).pages)) {
        const infinite = data as unknown as { pages: unknown[] };
        return {
            ...infinite,
            pages: infinite.pages.map((page) => {
                const content = page && typeof page === 'object' ? (page as { content?: unknown }).content : undefined;
                return Array.isArray(content) ? { ...(page as object), content: content.map((item) => patchAuthored(item, memberId, role)) } : page;
            }),
        } as T;
    }
    return patchAuthored(data, memberId, role) as T;
}

export function withMemberRole<T extends { id: string } & MemberRoleFields>(members: T[], memberId: string, role: RoleValue): T[] {
    return members.map((member) =>
        member.id === memberId ? { ...member, relationshipRole: role.roleKey, customRelationshipRole: role.customRole } : member,
    );
}

// ── Gating ──

type RoleEvent = {
    status: EventStatus;
    deletedAt: string | null;
    suspended?: boolean;
    modules: Pick<EventModuleResponseDto, 'moduleKey' | 'isAvailable'>[];
};

function rolesWritable(event: RoleEvent | null | undefined): event is RoleEvent {
    return Boolean(event) && !event!.suspended && !isEventDeleted(event!) && event!.status === 'ACTIVE' && isModuleAvailable(event!.modules as EventModuleResponseDto[], 'member_roles');
}

export function canEditOwnRole(event: RoleEvent | null | undefined, member: Pick<EventMemberResponseDto, 'isFeatured'> | null | undefined): boolean {
    return rolesWritable(event) && Boolean(member) && !member!.isFeatured;
}

export function canManageMemberRoles(event: RoleEvent | null | undefined, canModerate: boolean): boolean {
    return canModerate && rolesWritable(event);
}

// ── Sheet trigger ──

export const ROLE_SHEET_PARAM = 'sheet';
export const ROLE_SHEET_VALUE = 'role';

export function withRoleSheetParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.set(ROLE_SHEET_PARAM, ROLE_SHEET_VALUE);
    return `${pathname}?${params.toString()}`;
}

export function withoutRoleSheetParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.delete(ROLE_SHEET_PARAM);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}

export function rolePromptStorageKey(memberId: string): string {
    return `sw.rolePrompt.${memberId}`;
}
```

If lint flags the non-null assertions in `rolesWritable`, rewrite it as:

```ts
function rolesWritable(event: RoleEvent | null | undefined): event is RoleEvent {
    if (!event || event.suspended || isEventDeleted(event) || event.status !== 'ACTIVE') return false;
    return isModuleAvailable(event.modules as EventModuleResponseDto[], 'member_roles');
}
```

and `canEditOwnRole` as `return rolesWritable(event) && member != null` → use `member !== null && member !== undefined && !member.isFeatured`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/memberRoles.test.ts`
Expected: PASS (existing 22 + new).

- [ ] **Step 5: Commit**

```bash
git add lib/memberRoles.ts lib/memberRoles.test.ts
git commit -m "feat(member-roles): picker drafts, error kinds, cache patchers and gating"
```

---

### Task 3: Options query and mutations

**Files:**
- Create: `hooks/useMemberRoleOptions.ts`
- Create: `hooks/useMemberRoleMutations.ts`
- Test: `hooks/useMemberRoleMutations.test.tsx`

- [ ] **Step 1: Create `hooks/useMemberRoleOptions.ts`**

```ts
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MemberRoleOptionsDto } from '@/lib/api/types';

export const memberRoleOptionKeys = {
    list: (eventId: string) => ['events', eventId, 'member-roles'] as const,
};

// GET /api/events/{eventId}/member-roles — any member. Loaded only while a
// role sheet is open; holders/available are a snapshot, so always refetch.
export function useMemberRoleOptions(eventId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: memberRoleOptionKeys.list(eventId ?? ''),
        queryFn: () => api.get<MemberRoleOptionsDto>(endpoints.events.memberRoles(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated && enabled,
        staleTime: 0,
    });
}
```

- [ ] **Step 2: Write the failing test** `hooks/useMemberRoleMutations.test.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { memberRoleOptionKeys } from '@/hooks/useMemberRoleOptions';
import { useClearMemberRole, useSetMemberRole } from '@/hooks/useMemberRoleMutations';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { storyKeys } from '@/hooks/useStories';
import { postKeys } from '@/lib/postQueries';

const apiPut = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { put: (...a: unknown[]) => apiPut(...a), del: (...a: unknown[]) => apiDel(...a), get: vi.fn() },
    ApiError: class ApiError extends Error {
        status: number;
        problem: unknown;
        constructor(status: number, body: unknown) {
            super('api');
            this.status = status;
            this.problem = body;
        }
    },
}));

const EVENT_ID = 'event-1';
const author = (memberId: string) => ({ memberId, displayName: 'A', nickname: null, role: 'MEMBER', avatarUrl: null, roleKey: null, customRole: null });
const member = (id: string) => ({ id, eventId: EVENT_ID, relationshipRole: null, customRelationshipRole: null });

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(postKeys.list(EVENT_ID), { pages: [{ content: [{ id: 'p1', author: author('m1') }] }], pageParams: [0] });
    client.setQueryData(postKeys.detail('p1'), { id: 'p1', author: author('m1') });
    client.setQueryData(['posts', 'p1', 'comments'], { pages: [{ content: [{ id: 'c1', author: author('m1') }] }], pageParams: [0] });
    client.setQueryData(storyKeys.list(EVENT_ID), [{ id: 's1', author: author('m1') }]);
    client.setQueryData(eventMemberKeys.list(EVENT_ID), [member('m1'), member('m2')]);
    client.setQueryData(myEventsKeys.all, [member('m1')]);
    client.setQueryData(memberRoleOptionKeys.list(EVENT_ID), { allowCustom: true, customLocked: false, roles: [] });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, wrapper };
}

beforeEach(() => {
    apiPut.mockReset();
    apiDel.mockReset();
});

describe('useSetMemberRole', () => {
    it('patches every cached copy of the member after a 204', async () => {
        apiPut.mockResolvedValue(undefined);
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useSetMemberRole(EVENT_ID), { wrapper });

        await act(() => result.current.mutateAsync({ memberId: 'm1', request: { roleKey: 'BRIDE' } }));

        expect(apiPut).toHaveBeenCalledWith('/api/event-members/m1/role', { roleKey: 'BRIDE' });
        const feed = client.getQueryData<{ pages: { content: { author: { roleKey: string } }[] }[] }>(postKeys.list(EVENT_ID));
        expect(feed?.pages[0].content[0].author.roleKey).toBe('BRIDE');
        expect(client.getQueryData<{ author: { roleKey: string } }>(postKeys.detail('p1'))?.author.roleKey).toBe('BRIDE');
        const comments = client.getQueryData<{ pages: { content: { author: { roleKey: string } }[] }[] }>(['posts', 'p1', 'comments']);
        expect(comments?.pages[0].content[0].author.roleKey).toBe('BRIDE');
        expect(client.getQueryData<{ author: { roleKey: string } }[]>(storyKeys.list(EVENT_ID))?.[0].author.roleKey).toBe('BRIDE');
        const members = client.getQueryData<{ relationshipRole: string | null }[]>(eventMemberKeys.list(EVENT_ID));
        expect(members?.[0].relationshipRole).toBe('BRIDE');
        expect(members?.[1].relationshipRole).toBeNull();
        expect(client.getQueryData<{ relationshipRole: string }[]>(myEventsKeys.all)?.[0].relationshipRole).toBe('BRIDE');
        expect(client.getQueryState(memberRoleOptionKeys.list(EVENT_ID))?.isInvalidated).toBe(true);
    });

    it('refetches the options when the role is full', async () => {
        const { ApiError } = await import('@/lib/api/client');
        apiPut.mockRejectedValue(new ApiError(409, { errorCode: 5114 }));
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useSetMemberRole(EVENT_ID), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ memberId: 'm1', request: { roleKey: 'BEST_MAN' } }).catch(() => undefined);
        });

        await waitFor(() => expect(client.getQueryState(memberRoleOptionKeys.list(EVENT_ID))?.isInvalidated).toBe(true));
        expect(client.getQueryData<{ relationshipRole: string | null }[]>(eventMemberKeys.list(EVENT_ID))?.[0].relationshipRole).toBeNull();
    });
});

describe('useClearMemberRole', () => {
    it('clears the role in the caches', async () => {
        apiDel.mockResolvedValue(undefined);
        const { client, wrapper } = setup();
        client.setQueryData(eventMemberKeys.list(EVENT_ID), [{ ...member('m1'), customRelationshipRole: 'Uncle' }]);
        const { result } = renderHook(() => useClearMemberRole(EVENT_ID), { wrapper });

        await act(() => result.current.mutateAsync('m1'));

        expect(apiDel).toHaveBeenCalledWith('/api/event-members/m1/role');
        expect(client.getQueryData<{ customRelationshipRole: string | null }[]>(eventMemberKeys.list(EVENT_ID))?.[0].customRelationshipRole).toBeNull();
    });
});
```

The mocked `ApiError` stores the body as `problem`, which is what `getErrorCode` reads.

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run hooks/useMemberRoleMutations.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Create `hooks/useMemberRoleMutations.ts`**

```ts
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { memberRoleOptionKeys } from '@/hooks/useMemberRoleOptions';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { storyKeys } from '@/hooks/useStories';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventMemberResponseDto, MemberRoleRequestDto } from '@/lib/api/types';
import { roleErrorKind, roleValueFromRequest, type RoleValue, withAuthorRole, withMemberRole } from '@/lib/memberRoles';
import { postKeys } from '@/lib/postQueries';

const NO_ROLE: RoleValue = { roleKey: null, customRole: null };

// PUT/DELETE …/role answer 204 with no body and don't bump the feed ETag, so
// every cached copy of the member is patched here (guide §8). Comment lists
// and post details sit under ['posts', …]; story details under ['stories', …].
function patchMemberRoleCaches(queryClient: QueryClient, eventId: string, memberId: string, role: RoleValue) {
    const patchAuthors = (data: unknown) => withAuthorRole(data, memberId, role);
    queryClient.setQueriesData({ queryKey: ['posts'] }, patchAuthors);
    queryClient.setQueriesData({ queryKey: ['stories'] }, patchAuthors);
    queryClient.setQueryData(postKeys.list(eventId), patchAuthors);
    queryClient.setQueryData(storyKeys.list(eventId), patchAuthors);

    const patchMembers = (members: EventMemberResponseDto[] | undefined) => members && withMemberRole(members, memberId, role);
    queryClient.setQueryData(eventMemberKeys.list(eventId), patchMembers);
    queryClient.setQueryData(myEventsKeys.all, patchMembers);
    queryClient.setQueryData<EventMemberResponseDto>(eventMemberKeys.detail(memberId), (member) => member && withMemberRole([member], memberId, role)[0]);

    queryClient.invalidateQueries({ queryKey: memberRoleOptionKeys.list(eventId) });
}

function refreshAfterRoleError(queryClient: QueryClient, eventId: string, error: unknown) {
    const kind = roleErrorKind(error);
    if (kind === 'stale' || kind === 'full' || kind === 'moduleOff') {
        queryClient.invalidateQueries({ queryKey: memberRoleOptionKeys.list(eventId) });
    }
    if (kind === 'moduleOff') queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
}

// PUT /api/event-members/{id}/role — the member themselves, or a host.
export function useSetMemberRole(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ memberId, request }: { memberId: string; request: MemberRoleRequestDto }) =>
            api.put<void>(endpoints.eventMembers.role(memberId), request),
        onSuccess: (_data, { memberId, request }) => patchMemberRoleCaches(queryClient, eventId, memberId, roleValueFromRequest(request)),
        onError: (error) => refreshAfterRoleError(queryClient, eventId, error),
    });
}

// DELETE /api/event-members/{id}/role — the member themselves, or a host.
export function useClearMemberRole(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => api.del<void>(endpoints.eventMembers.role(memberId)),
        onSuccess: (_data, memberId) => patchMemberRoleCaches(queryClient, eventId, memberId, NO_ROLE),
        onError: (error) => refreshAfterRoleError(queryClient, eventId, error),
    });
}

// DELETE /api/event-members/{id}/role-lock — host or co-host only.
export function useUnlockMemberRole() {
    return useMutation({
        mutationFn: (memberId: string) => api.del<void>(endpoints.eventMembers.roleLock(memberId)),
    });
}
```

Check `eventKeys.detail` exists in `hooks/useEvent.ts` (it is used by the event layout) before running.

- [ ] **Step 5: Run tests**

Run: `npx vitest run hooks/useMemberRoleMutations.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/useMemberRoleOptions.ts hooks/useMemberRoleMutations.ts hooks/useMemberRoleMutations.test.tsx
git commit -m "feat(member-roles): role options query and set/clear/unlock mutations"
```

---

### Task 4: Copy

**Files:**
- Modify: `messages/en.json`, `messages/el.json`
- Create (scratchpad, not committed): `add_role_copy.mjs`

Text insertion keeps the files' existing formatting (a JSON round-trip reformats compact lines).

- [ ] **Step 1: Write the script** in the scratchpad directory as `add_role_copy.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';

const COPY = {
    en: {
        myRole: { label: 'My role', description: 'Pick your role at this event' },
        namespace: {
            myRole: 'My role',
            editMyRole: 'Change my role',
            close: 'Close',
            loading: 'Loading roles…',
            loadFailed: "Couldn't load roles. Try again.",
            full: 'Full',
            other: 'Other',
            otherPlaceholder: 'Type your role',
            lockedNote: 'Your custom role was removed. You can still pick one from the list.',
            save: 'Save',
            clear: 'Clear role',
            errors: {
                length: 'A role must be 1 to {max} characters.',
                full: 'All {count} places for this role are taken.',
            },
            host: {
                edit: 'Edit role for {name}',
                unlock: 'Unlock custom role',
                unlocked: 'Custom role unlocked.',
                clearTitle: "Clear {name}'s role?",
                clearBody: "They can't type a custom role again until you unlock it.",
                clearConfirm: 'Clear role',
                cancel: 'Cancel',
            },
        },
    },
    el: {
        myRole: { label: 'Ο ρόλος μου', description: 'Επιλέξτε τον ρόλο σας στην εκδήλωση' },
        namespace: {
            myRole: 'Ο ρόλος μου',
            editMyRole: 'Αλλαγή ρόλου',
            close: 'Κλείσιμο',
            loading: 'Φόρτωση ρόλων…',
            loadFailed: 'Δεν φορτώθηκαν οι ρόλοι. Δοκιμάστε ξανά.',
            full: 'Πλήρες',
            other: 'Άλλο',
            otherPlaceholder: 'Γράψτε τον ρόλο σας',
            lockedNote: 'Ο δικός σας ρόλος αφαιρέθηκε. Μπορείτε ακόμα να επιλέξετε από τη λίστα.',
            save: 'Αποθήκευση',
            clear: 'Αφαίρεση ρόλου',
            errors: {
                length: 'Ο ρόλος πρέπει να έχει 1 έως {max} χαρακτήρες.',
                full: 'Και οι {count} θέσεις για αυτόν τον ρόλο έχουν πιαστεί.',
            },
            host: {
                edit: 'Αλλαγή ρόλου για {name}',
                unlock: 'Ξεκλείδωμα δικού ρόλου',
                unlocked: 'Ο δικός ρόλος ξεκλειδώθηκε.',
                clearTitle: 'Αφαίρεση ρόλου για {name};',
                clearBody: 'Δεν θα μπορεί να γράψει δικό του ρόλο μέχρι να τον ξεκλειδώσετε.',
                clearConfirm: 'Αφαίρεση ρόλου',
                cancel: 'Ακύρωση',
            },
        },
    },
};

function indentJson(value, depth) {
    const pad = ' '.repeat(4 * depth);
    return JSON.stringify(value, null, 4).split('\n').map((line, i) => (i === 0 ? line : pad + line)).join('\n');
}

// Finds the index of the brace that closes the object opened at openIndex.
function closingBrace(text, openIndex) {
    let depth = 0;
    let inString = false;
    for (let i = openIndex; i < text.length; i += 1) {
        const ch = text[i];
        if (inString) {
            if (ch === '\\') i += 1;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === '{') depth += 1;
        else if (ch === '}') {
            depth -= 1;
            if (depth === 0) return i;
        }
    }
    throw new Error('unbalanced');
}

for (const [locale, copy] of Object.entries(COPY)) {
    const path = `messages/${locale}.json`;
    let text = readFileSync(path, 'utf8');

    // ToolsMenu.items.myRole, appended as the last item.
    const tools = text.indexOf('"ToolsMenu": {');
    const itemsOpen = text.indexOf('"items": {', tools) + '"items": '.length;
    const itemsClose = closingBrace(text, itemsOpen);
    const beforeItemsClose = text.slice(0, itemsClose).replace(/\s*$/, '');
    text = `${beforeItemsClose},\n            "myRole": ${indentJson(copy.myRole, 3)}\n        ${text.slice(itemsClose)}`;

    // Top-level MemberRoles namespace, appended last.
    const rootClose = text.lastIndexOf('}');
    const beforeRootClose = text.slice(0, rootClose).replace(/\s*$/, '');
    text = `${beforeRootClose},\n    "MemberRoles": ${indentJson(copy.namespace, 1)}\n}\n`;

    JSON.parse(text);
    writeFileSync(path, text, 'utf8');
}
```

- [ ] **Step 2: Run it from the repo root and format**

```bash
node "<scratchpad>/add_role_copy.mjs"
npx prettier --write messages/en.json messages/el.json
git diff --stat messages/
```

Expected: only additions in both files (roughly +45 lines each), no reformatted lines.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat(member-roles): picker and host sheet copy"
```

---

### Task 5: Role chips in the feed, comments and stories

**Files:**
- Create: `hooks/useOpenMyRoleSheet.ts`, `hooks/useAuthorRole.ts`
- Create: `components/memberRoles/RoleChip.tsx`, `components/memberRoles/AuthorRoleChip.tsx`
- Modify: `components/feed/post/PostAuthorAvatar.tsx`, `components/feed/PostCard.tsx`, `components/feed/post/CommentThreadItem.tsx`, `components/feed/post/ReplyItem.tsx`, `components/story/StoryHeader.tsx`, `components/story/StoryModal.tsx`

- [ ] **Step 1: `hooks/useOpenMyRoleSheet.ts`**

```ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { withRoleSheetParam } from '@/lib/memberRoles';

// Adds the one-shot ?sheet=role trigger that MyRoleSheetHost consumes.
// replace, not push: the sheet's Modal adds its own history entry for Back.
export function useOpenMyRoleSheet() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return useCallback(() => {
        router.replace(withRoleSheetParam(pathname, searchParams.toString()), { scroll: false });
    }, [pathname, router, searchParams]);
}
```

- [ ] **Step 2: `hooks/useAuthorRole.ts`**

```ts
'use client';

import { useLocale } from 'next-intl';

import { useMemberRoleCatalog } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import type { AuthorDto } from '@/lib/api/types';
import { canEditOwnRole, memberRoleLabel } from '@/lib/memberRoles';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

// The role chip text for an author, and whether it's the viewer's own
// (editable) role. Both fields are null when the module is off.
export function useAuthorRole(author: AuthorDto | null | undefined) {
    const catalog = useMemberRoleCatalog();
    const locale = useLocale() as Locale;
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();

    const label = author
        ? memberRoleLabel({ roleKey: author.roleKey ?? null, customRole: author.customRole ?? null, eventTypeKey: activeEvent?.eventType, catalog, locale })
        : null;
    const isMine = Boolean(author && activeMember && author.memberId === activeMember.id && canEditOwnRole(activeEvent, activeMember));

    return { label, isMine };
}
```

- [ ] **Step 3: `components/memberRoles/RoleChip.tsx`**

```tsx
import { cn } from '@/lib/utils';

const toneClass = {
    default: 'bg-surface-muted text-ink-muted',
    onDark: 'bg-white/15 text-white',
} as const;

export function RoleChip({
    label,
    tone = 'default',
    onClick,
    ariaLabel,
}: {
    label: string;
    tone?: keyof typeof toneClass;
    onClick?: () => void;
    ariaLabel?: string;
}) {
    const className = cn('inline-block max-w-[16ch] shrink-0 truncate rounded-full px-2 py-0.5 align-middle text-[11px] leading-4 font-semibold', toneClass[tone]);

    if (onClick) {
        return (
            <button type="button" onClick={onClick} aria-label={ariaLabel} title={label} className={cn(className, 'transition-colors hover:text-ink')}>
                {label}
            </button>
        );
    }

    return (
        <span title={label} className={className}>
            {label}
        </span>
    );
}
```

- [ ] **Step 4: `components/memberRoles/AuthorRoleChip.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RoleChip } from '@/components/memberRoles/RoleChip';
import { useAuthorRole } from '@/hooks/useAuthorRole';
import { useOpenMyRoleSheet } from '@/hooks/useOpenMyRoleSheet';
import type { AuthorDto } from '@/lib/api/types';

// The viewer's own chip opens the role sheet; everyone else's is plain text.
export function AuthorRoleChip({
    author,
    tone = 'default',
    interactive = true,
}: {
    author: AuthorDto | null | undefined;
    tone?: 'default' | 'onDark';
    interactive?: boolean;
}) {
    const t = useTranslations('MemberRoles');
    const { label, isMine } = useAuthorRole(author);
    const openMyRoleSheet = useOpenMyRoleSheet();

    if (!label) return null;

    return <RoleChip label={label} tone={tone} onClick={interactive && isMine ? openMyRoleSheet : undefined} ariaLabel={isMine ? t('editMyRole') : undefined} />;
}
```

- [ ] **Step 5: `PostAuthorAvatar` gets a `roleChip` slot.** Add `roleChip?: ReactNode` to the props (import `type ReactNode` from `react`) and replace the name paragraph:

```tsx
            {/* Author details */}
            <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5 text-sm leading-tight font-semibold text-ink">
                    <span className="truncate">{name}</span>
                    {roleChip}
                </p>
```

(The rest of the block stays.)

- [ ] **Step 6: `PostCard` passes the chip.** Import `AuthorRoleChip` and add to the `<PostAuthorAvatar …>` props:

```tsx
                    roleChip={<AuthorRoleChip author={post.author} />}
```

- [ ] **Step 7: Comments.** In `CommentThreadItem.tsx` replace the name span in `{/* Comment header */}`:

```tsx
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                <span className="min-w-0 text-sm leading-tight font-semibold wrap-break-word text-ink">{name}</span>
                                <AuthorRoleChip author={comment.author} />
                            </span>
```

In `ReplyItem.tsx` replace the name span (line ~45):

```tsx
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="min-w-0 text-xs leading-tight font-semibold wrap-break-word text-ink">{name}</span>
                            <AuthorRoleChip author={reply.author} />
                        </span>
```

Add `import { AuthorRoleChip } from '@/components/memberRoles/AuthorRoleChip';` to both.

- [ ] **Step 8: Story header.** In `StoryHeader.tsx` add prop `roleChip?: ReactNode` (destructure it) and replace the name paragraph:

```tsx
                        <p className={cn('flex items-center gap-1.5 text-sm leading-tight font-semibold', isLight ? 'text-ink' : 'text-white')}>
                            <span className="truncate">{authorName}</span>
                            {roleChip}
                        </p>
```

In `StoryModal.tsx` pass to `<StoryHeader …>` (non-interactive: a sheet would open under the full-screen story):

```tsx
                            roleChip={<AuthorRoleChip author={author} tone="onDark" interactive={false} />}
```

- [ ] **Step 9: Typecheck, lint, tests**

```bash
npx tsc --noEmit -p .
npx eslint components/memberRoles hooks/useAuthorRole.ts hooks/useOpenMyRoleSheet.ts components/feed components/story
npx vitest run components/feed components/story
```

Expected: all clean / PASS. If a story or feed test renders these components without an `EventProvider`, add `vi.mock('@/components/memberRoles/AuthorRoleChip', () => ({ AuthorRoleChip: () => null }))` to that test file.

- [ ] **Step 10: Commit**

```bash
git add components/memberRoles hooks/useAuthorRole.ts hooks/useOpenMyRoleSheet.ts components/feed components/story
git commit -m "feat(member-roles): role chips on posts, comments and stories"
```

---

### Task 6: Picker list

**Files:**
- Create: `components/memberRoles/RolePickerList.tsx`
- Test: `components/memberRoles/RolePickerList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RolePickerList } from '@/components/memberRoles/RolePickerList';
import { OTHER_CHOICE } from '@/lib/memberRoles';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

const OPTIONS = [
    { roleKey: 'BRIDE', label: { en: 'Bride', el: 'Νύφη' }, emoji: '💍', maxHolders: 1, holders: 0, available: true },
    { roleKey: 'BEST_MAN', label: { en: 'Best man', el: 'Κουμπάρος' }, emoji: '🥂', maxHolders: 2, holders: 2, available: false },
];

function renderList(overrides: Partial<Parameters<typeof RolePickerList>[0]> = {}) {
    const props = {
        options: OPTIONS,
        allowCustom: true,
        customLocked: false,
        currentRoleKey: null,
        draft: { choice: null, customText: '' },
        customMaxLength: 40,
        onChoiceChangeAction: vi.fn(),
        onCustomTextChangeAction: vi.fn(),
        ...overrides,
    };
    render(<RolePickerList {...props} />);
    return props;
}

describe('RolePickerList', () => {
    it('disables a full role and marks it', () => {
        renderList();
        expect(screen.getByRole('radio', { name: /Best man/ })).toBeDisabled();
        expect(screen.getByText('full')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Bride/ })).toBeEnabled();
    });

    it('keeps a full role pickable for its holder', () => {
        renderList({ currentRoleKey: 'BEST_MAN' });
        expect(screen.getByRole('radio', { name: /Best man/ })).toBeEnabled();
    });

    it('reports the picked role', () => {
        const props = renderList();
        fireEvent.click(screen.getByRole('radio', { name: /Bride/ }));
        expect(props.onChoiceChangeAction).toHaveBeenCalledWith('BRIDE');
    });

    it('hides Other when custom roles are off', () => {
        renderList({ allowCustom: false });
        expect(screen.queryByRole('radio', { name: 'other' })).not.toBeInTheDocument();
    });

    it('shows the text field when Other is picked', () => {
        const props = renderList({ draft: { choice: OTHER_CHOICE, customText: 'Uncle' } });
        const input = screen.getByRole('textbox', { name: 'other' });
        expect(input).toHaveValue('Uncle');
        expect(input).toHaveAttribute('maxLength', '40');
        fireEvent.change(input, { target: { value: 'Aunt' } });
        expect(props.onCustomTextChangeAction).toHaveBeenCalledWith('Aunt');
    });

    it('locks Other with a note', () => {
        renderList({ customLocked: true });
        expect(screen.getByRole('radio', { name: 'other' })).toBeDisabled();
        expect(screen.getByText('lockedNote')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/memberRoles/RolePickerList.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `components/memberRoles/RolePickerList.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import type { Locale } from '@/i18n/config';
import type { MemberRoleOptionDto } from '@/lib/api/types';
import { isOptionDisabled, optionLabel, OTHER_CHOICE, type RolePickerDraft } from '@/lib/memberRoles';
import { cn } from '@/lib/utils';

export function RolePickerList({
    options,
    allowCustom,
    customLocked,
    currentRoleKey,
    draft,
    customMaxLength,
    onChoiceChangeAction,
    onCustomTextChangeAction,
}: {
    options: MemberRoleOptionDto[];
    allowCustom: boolean;
    customLocked: boolean;
    currentRoleKey: string | null;
    draft: RolePickerDraft;
    customMaxLength: number;
    onChoiceChangeAction: (choice: string) => void;
    onCustomTextChangeAction: (text: string) => void;
}) {
    const t = useTranslations('MemberRoles');
    const locale = useLocale() as Locale;
    const otherSelected = draft.choice === OTHER_CHOICE;

    function handleChoiceChange(event: ChangeEvent<HTMLInputElement>) {
        onChoiceChangeAction(event.currentTarget.value);
    }

    function handleCustomTextChange(event: ChangeEvent<HTMLInputElement>) {
        onCustomTextChangeAction(event.currentTarget.value);
    }

    return (
        <fieldset className="flex flex-col">
            <legend className="sr-only">{t('myRole')}</legend>

            {/* Roles */}
            {options.map((option) => {
                const disabled = isOptionDisabled(option, currentRoleKey);
                return (
                    <label
                        key={option.roleKey}
                        className={cn('flex min-h-12 items-center gap-3 border-b border-border/60 px-1', disabled ? 'opacity-50' : 'cursor-pointer')}
                    >
                        <input
                            type="radio"
                            name="member-role"
                            value={option.roleKey}
                            checked={draft.choice === option.roleKey}
                            disabled={disabled}
                            onChange={handleChoiceChange}
                            className="h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{optionLabel(option, locale)}</span>
                        {disabled && <span className="text-xs font-semibold text-ink-faint">{t('full')}</span>}
                    </label>
                );
            })}

            {/* Other */}
            {allowCustom && (
                <>
                    <label className={cn('flex min-h-12 items-center gap-3 px-1', customLocked ? 'opacity-50' : 'cursor-pointer')}>
                        <input
                            type="radio"
                            name="member-role"
                            value={OTHER_CHOICE}
                            checked={otherSelected}
                            disabled={customLocked}
                            onChange={handleChoiceChange}
                            className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-ink">{t('other')}</span>
                    </label>
                    {otherSelected && !customLocked && (
                        <input
                            value={draft.customText}
                            onChange={handleCustomTextChange}
                            maxLength={customMaxLength}
                            aria-label={t('other')}
                            placeholder={t('otherPlaceholder')}
                            className="mx-1 h-11 rounded-xl border border-border bg-background px-3 text-sm text-ink outline-none focus:border-primary"
                        />
                    )}
                    {customLocked && <p className="px-1 pt-1 text-xs text-ink-muted">{t('lockedNote')}</p>}
                </>
            )}
        </fieldset>
    );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/memberRoles/RolePickerList.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add components/memberRoles/RolePickerList.tsx components/memberRoles/RolePickerList.test.tsx
git commit -m "feat(member-roles): role picker list"
```

---

### Task 7: Shared form hook and sheet parts

**Files:**
- Create: `hooks/useRoleErrorMessage.ts`, `hooks/useRoleForm.ts`
- Create: `components/memberRoles/RoleSheet.tsx`, `components/memberRoles/RoleFormBody.tsx`, `components/memberRoles/RoleSheetFooter.tsx`

- [ ] **Step 1: `hooks/useRoleErrorMessage.ts`**

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { MemberRoleOptionDto } from '@/lib/api/types';
import { roleErrorKind } from '@/lib/memberRoles';

// Role errors as copy (guide §4). Length and cap messages carry numbers;
// 'locked' shows the picker's locked note instead. Every other code (blocked,
// stale, 5014, 3010…) has generic ApiErrors copy via useApiErrorMessage.
export function useRoleErrorMessage() {
    const t = useTranslations('MemberRoles.errors');
    const describe = useApiErrorMessage();

    return useCallback(
        (error: unknown, context: { maxLength: number; option: MemberRoleOptionDto | null }): string | null => {
            switch (roleErrorKind(error)) {
                case 'length':
                    return t('length', { max: context.maxLength });
                case 'full':
                    return context.option?.maxHolders ? t('full', { count: context.option.maxHolders }) : describe(error);
                case 'locked':
                    return null;
                default:
                    return describe(error);
            }
        },
        [describe, t],
    );
}
```

- [ ] **Step 2: `hooks/useRoleForm.ts`**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useMemberRoleOptions } from '@/hooks/useMemberRoleOptions';
import { useClearMemberRole, useSetMemberRole } from '@/hooks/useMemberRoleMutations';
import type { EventMemberResponseDto } from '@/lib/api/types';
import {
    buildRoleRequest,
    canSaveDraft,
    DEFAULT_CUSTOM_ROLE_MAX,
    draftFromMember,
    memberHasRole,
    OTHER_CHOICE,
    roleErrorKind,
    type RolePickerDraft,
} from '@/lib/memberRoles';

// 'self': the member's own sheet (custom text can be locked).
// 'host': a host editing someone (never locked; clearing custom text asks first).
export type RoleFormMode = 'self' | 'host';

export function useRoleForm({
    eventId,
    member,
    mode,
    onDoneAction,
}: {
    eventId: string;
    member: EventMemberResponseDto;
    mode: RoleFormMode;
    onDoneAction: () => void;
}) {
    const options = useMemberRoleOptions(eventId, true);
    const { data: appConfig } = useAppConfig();
    const maxLength = appConfig?.memberCustomRelationshipRoleMaxLength ?? DEFAULT_CUSTOM_ROLE_MAX;
    const setRole = useSetMemberRole(eventId);
    const clearRole = useClearMemberRole(eventId);

    const [draft, setDraft] = useState<RolePickerDraft>(() => draftFromMember(member));
    const [error, setError] = useState<unknown>(null);
    const [lockedByError, setLockedByError] = useState(false);
    const [confirmingClear, setConfirmingClear] = useState(false);

    const customLocked = mode === 'self' && (Boolean(options.data?.customLocked) || lockedByError);
    const blockedByLock = customLocked && draft.choice === OTHER_CHOICE;
    const canSave = canSaveDraft(draft, member, maxLength) && !blockedByLock && !setRole.isPending;
    const chosenOption = options.data?.roles.find((option) => option.roleKey === draft.choice) ?? null;

    const handleFailure = useCallback(
        (failure: unknown) => {
            const kind = roleErrorKind(failure);
            if (kind === 'featured' || kind === 'moduleOff') {
                onDoneAction();
                return;
            }
            if (kind === 'locked') setLockedByError(true);
            setError(failure);
        },
        [onDoneAction],
    );

    const handleChoiceChange = useCallback((choice: string) => {
        setError(null);
        setDraft((current) => ({ ...current, choice }));
    }, []);

    const handleCustomTextChange = useCallback((customText: string) => {
        setError(null);
        setDraft((current) => ({ ...current, customText }));
    }, []);

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const request = buildRoleRequest(draft);
        if (!request || !canSave) return;
        setError(null);
        setRole.mutate({ memberId: member.id, request }, { onSuccess: onDoneAction, onError: handleFailure });
    }

    function confirmClear() {
        setError(null);
        clearRole.mutate(member.id, {
            onSuccess: () => {
                setConfirmingClear(false);
                onDoneAction();
            },
            onError: (failure) => {
                setConfirmingClear(false);
                handleFailure(failure);
            },
        });
    }

    function requestClear() {
        if (mode === 'host' && member.customRelationshipRole) {
            setConfirmingClear(true);
            return;
        }
        confirmClear();
    }

    function cancelClear() {
        setConfirmingClear(false);
    }

    return {
        isLoading: options.isLoading,
        loadFailed: Boolean(options.error),
        options: options.data?.roles ?? null,
        allowCustom: Boolean(options.data?.allowCustom),
        customLocked,
        currentRoleKey: member.relationshipRole,
        draft,
        maxLength,
        chosenOption,
        error,
        canSave,
        isSaving: setRole.isPending,
        hasRole: memberHasRole(member),
        isClearing: clearRole.isPending,
        confirmingClear,
        handleChoiceChange,
        handleCustomTextChange,
        handleSubmit,
        requestClear,
        confirmClear,
        cancelClear,
    };
}

export type RoleForm = ReturnType<typeof useRoleForm>;
```

- [ ] **Step 3: `components/memberRoles/RoleSheet.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';

import { Modal } from '@/components/ui/modal';

// Bottom sheet frame for both role sheets. Back closes it (Modal's overlay history).
export function RoleSheet({
    title,
    closeLabel,
    onCloseAction,
    footer,
    children,
}: {
    title: string;
    closeLabel: string;
    onCloseAction: () => void;
    footer: ReactNode;
    children: ReactNode;
}) {
    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="md" closeLabel={closeLabel} ariaLabel={title}>
            {/* Header */}
            <h2 className="px-5 pt-6 pb-2 pr-12 text-lg font-semibold text-ink">{title}</h2>

            {/* Body */}
            <Modal.Body className="px-5 pb-4">{children}</Modal.Body>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>
        </Modal>
    );
}
```

- [ ] **Step 4: `components/memberRoles/RoleFormBody.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RolePickerList } from '@/components/memberRoles/RolePickerList';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRoleErrorMessage } from '@/hooks/useRoleErrorMessage';
import type { RoleForm } from '@/hooks/useRoleForm';

export function RoleFormBody({ formId, form }: { formId: string; form: RoleForm }) {
    const t = useTranslations('MemberRoles');
    const roleErrorMessage = useRoleErrorMessage();
    const errorMessage = form.error ? roleErrorMessage(form.error, { maxLength: form.maxLength, option: form.chosenOption }) : null;

    return (
        <form id={formId} onSubmit={form.handleSubmit} noValidate>
            {/* Loading */}
            {form.isLoading && <LoadingState label={t('loading')} className="justify-start py-4" />}
            {form.loadFailed && <p className="py-4 text-sm text-destructive">{t('loadFailed')}</p>}

            {/* Roles */}
            {form.options && (
                <RolePickerList
                    options={form.options}
                    allowCustom={form.allowCustom}
                    customLocked={form.customLocked}
                    currentRoleKey={form.currentRoleKey}
                    draft={form.draft}
                    customMaxLength={form.maxLength}
                    onChoiceChangeAction={form.handleChoiceChange}
                    onCustomTextChangeAction={form.handleCustomTextChange}
                />
            )}

            {/* Error */}
            {errorMessage && (
                <p role="alert" className="pt-3 text-sm text-destructive">
                    {errorMessage}
                </p>
            )}
        </form>
    );
}
```

- [ ] **Step 5: `components/memberRoles/RoleSheetFooter.tsx`**

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { RoleForm } from '@/hooks/useRoleForm';

export function RoleSheetFooter({ formId, form }: { formId: string; form: RoleForm }) {
    const t = useTranslations('MemberRoles');

    return (
        <>
            {/* Clear */}
            <div>
                {form.hasRole && (
                    <button
                        type="button"
                        onClick={form.requestClear}
                        disabled={form.isClearing}
                        className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                        {t('clear')}
                    </button>
                )}
            </div>

            {/* Save */}
            <button
                type="submit"
                form={formId}
                disabled={!form.canSave}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
            >
                {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('save')}
            </button>
        </>
    );
}
```

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit -p .
npx eslint hooks/useRoleErrorMessage.ts hooks/useRoleForm.ts components/memberRoles
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add hooks/useRoleErrorMessage.ts hooks/useRoleForm.ts components/memberRoles
git commit -m "feat(member-roles): shared role form hook and sheet parts"
```

---

### Task 8: Member's own sheet, trigger and one-time prompt

**Files:**
- Create: `hooks/useRolePromptOnce.ts`, `hooks/useMyRoleSheet.ts`
- Create: `components/memberRoles/MyRoleSheet.tsx`, `components/memberRoles/MyRoleSheetHost.tsx`
- Modify: `app/(main)/(app)/(event)/layout.tsx`
- Test: `hooks/useRolePromptOnce.test.tsx`

- [ ] **Step 1: Write the failing prompt test** `hooks/useRolePromptOnce.test.tsx`

```tsx
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRolePromptOnce } from '@/hooks/useRolePromptOnce';

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useRolePromptOnce', () => {
    it('prompts once per member and remembers it', () => {
        const onPrompt = vi.fn();
        const { rerender } = renderHook((props) => useRolePromptOnce(props), { initialProps: { active: true, memberId: 'm1', onPromptAction: onPrompt } });
        rerender({ active: true, memberId: 'm1', onPromptAction: onPrompt });
        renderHook(() => useRolePromptOnce({ active: true, memberId: 'm1', onPromptAction: onPrompt }));

        expect(onPrompt).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem('sw.rolePrompt.m1')).toBe('1');
    });

    it('does nothing while inactive', () => {
        const onPrompt = vi.fn();
        renderHook(() => useRolePromptOnce({ active: false, memberId: 'm1', onPromptAction: onPrompt }));
        expect(onPrompt).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('sw.rolePrompt.m1')).toBeNull();
    });

    it('skips the prompt when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const onPrompt = vi.fn();
        renderHook(() => useRolePromptOnce({ active: true, memberId: 'm1', onPromptAction: onPrompt }));
        expect(onPrompt).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run hooks/useRolePromptOnce.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: `hooks/useRolePromptOnce.ts`**

```ts
'use client';

import { useEffect } from 'react';

import { rolePromptStorageKey } from '@/lib/memberRoles';

// Opens the role sheet once per member on this device. The key is set before
// the prompt shows, so skipping and saving both count. No storage → no prompt.
export function useRolePromptOnce({ active, memberId, onPromptAction }: { active: boolean; memberId: string | null; onPromptAction: () => void }) {
    useEffect(() => {
        if (!active || !memberId) return;
        const key = rolePromptStorageKey(memberId);
        try {
            if (window.localStorage.getItem(key)) return;
            window.localStorage.setItem(key, '1');
        } catch {
            return;
        }
        onPromptAction();
    }, [active, memberId, onPromptAction]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run hooks/useRolePromptOnce.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: `hooks/useMyRoleSheet.ts`**

```ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useRolePromptOnce } from '@/hooks/useRolePromptOnce';
import { canEditOwnRole, memberHasRole, ROLE_SHEET_PARAM, ROLE_SHEET_VALUE, withoutRoleSheetParam } from '@/lib/memberRoles';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useEventContextLoading } from '@/providers/EventProvider';

// The member's own role sheet. ?sheet=role is a one-shot trigger: it is
// replaced away first and the sheet opens only once it's gone, so Back (which
// the sheet's Modal handles) never lands on a URL that reopens it.
export function useMyRoleSheet() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeEvent = useActiveEvent();
    const member = useActiveMember();
    const isLoading = useEventContextLoading();

    const enabled = canEditOwnRole(activeEvent, member);
    const requested = searchParams.get(ROLE_SHEET_PARAM) === ROLE_SHEET_VALUE;
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!requested || isLoading) return;
        router.replace(withoutRoleSheetParam(pathname, searchParams.toString()), { scroll: false });
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The trigger param is consumed once; open after it leaves the URL.
        if (enabled) setPending(true);
    }, [enabled, isLoading, pathname, requested, router, searchParams]);

    useEffect(() => {
        if (!pending || requested) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Opens only once the trigger param is gone.
        setPending(false);
        setOpen(true);
    }, [pending, requested]);

    const openSheet = useCallback(() => setOpen(true), []);
    const close = useCallback(() => setOpen(false), []);

    const isFeed = Boolean(activeEvent) && pathname === routes.events.feed(activeEvent!.id);
    useRolePromptOnce({
        active: enabled && isFeed && !open && !pending && Boolean(member) && !memberHasRole(member!),
        memberId: member?.id ?? null,
        onPromptAction: openSheet,
    });

    return { open: open && enabled, close, eventId: activeEvent?.id ?? null, member };
}
```

If lint flags the non-null assertions, compute `const feedPath = activeEvent ? routes.events.feed(activeEvent.id) : null;` and `const noRole = member ? !memberHasRole(member) : false;` and use those.

- [ ] **Step 6: `components/memberRoles/MyRoleSheet.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RoleFormBody } from '@/components/memberRoles/RoleFormBody';
import { RoleSheet } from '@/components/memberRoles/RoleSheet';
import { RoleSheetFooter } from '@/components/memberRoles/RoleSheetFooter';
import { useRoleForm } from '@/hooks/useRoleForm';
import type { EventMemberResponseDto } from '@/lib/api/types';

const FORM_ID = 'my-role-form';

export function MyRoleSheet({ eventId, member, onCloseAction }: { eventId: string; member: EventMemberResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('MemberRoles');
    const form = useRoleForm({ eventId, member, mode: 'self', onDoneAction: onCloseAction });

    return (
        <RoleSheet title={t('myRole')} closeLabel={t('close')} onCloseAction={onCloseAction} footer={<RoleSheetFooter formId={FORM_ID} form={form} />}>
            <RoleFormBody formId={FORM_ID} form={form} />
        </RoleSheet>
    );
}
```

- [ ] **Step 7: `components/memberRoles/MyRoleSheetHost.tsx`**

```tsx
'use client';

import { MyRoleSheet } from '@/components/memberRoles/MyRoleSheet';
import { useMyRoleSheet } from '@/hooks/useMyRoleSheet';

// Mounted once in the event layout: chips, the tools menu and the one-time
// prompt all open the same sheet.
export function MyRoleSheetHost() {
    const sheet = useMyRoleSheet();

    if (!sheet.open || !sheet.eventId || !sheet.member) return null;
    return <MyRoleSheet eventId={sheet.eventId} member={sheet.member} onCloseAction={sheet.close} />;
}
```

- [ ] **Step 8: Mount in the event layout.** In `app/(main)/(app)/(event)/layout.tsx` add imports `import { Suspense } from 'react';` (merge with the existing `react` import) and `import { MyRoleSheetHost } from '@/components/memberRoles/MyRoleSheetHost';`, then inside `<DeletedEventRouteGuard>`:

```tsx
                        <DeletedEventRouteGuard>
                            <div className="lg:max-w-none">{children}</div>
                            {/* Role sheet */}
                            <Suspense fallback={null}>
                                <MyRoleSheetHost />
                            </Suspense>
                        </DeletedEventRouteGuard>
```

- [ ] **Step 9: Typecheck, lint, tests**

```bash
npx tsc --noEmit -p .
npx eslint hooks/useMyRoleSheet.ts hooks/useRolePromptOnce.ts components/memberRoles "app/(main)/(app)/(event)/layout.tsx"
npx vitest run hooks/useRolePromptOnce.test.tsx
```

Expected: clean / PASS.

- [ ] **Step 10: Commit**

```bash
git add hooks/useMyRoleSheet.ts hooks/useRolePromptOnce.ts hooks/useRolePromptOnce.test.tsx components/memberRoles "app/(main)/(app)/(event)/layout.tsx"
git commit -m "feat(member-roles): member role sheet, URL trigger and one-time prompt"
```

---

### Task 9: "My role" in the tools menu

**Files:**
- Modify: `hooks/useToolsMenuItems.ts`
- Test: `hooks/useToolsMenuItems.test.tsx`

- [ ] **Step 1: Write failing tests.** In `hooks/useToolsMenuItems.test.tsx`, add `activeMember` to the hoisted mocks and the provider mock:

```ts
const mocks = vi.hoisted(() => ({
    activeEvent: null as Record<string, unknown> | null,
    activeMember: { id: 'm1', isFeatured: false } as Record<string, unknown> | null,
    isHost: true,
}));
```

```ts
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => mocks.activeEvent,
    useActiveMember: () => mocks.activeMember,
    useIsHost: () => mocks.isHost,
    useRouteEventId: () => 'event-1',
}));
```

In `beforeEach` add `mocks.activeMember = { id: 'm1', isFeatured: false };`. Append inside `describe('useToolsMenuItems', …)`:

```ts
    const withRoles = (overrides: Record<string, unknown> = {}) =>
        event({
            modules: [{ moduleKey: 'member_roles', isEnabled: true, isAvailable: true, configuration: {} }],
            ...overrides,
        });

    it('adds My role when the member can set a role', () => {
        mocks.activeEvent = withRoles();
        const { result } = renderHook(() => useToolsMenuItems());
        const item = result.current.find((tool) => tool.key === 'myRole');
        expect(item?.href).toBe('/events/event-1/feed?sheet=role');
    });

    it('hides My role for featured members and draft events', () => {
        mocks.activeEvent = withRoles();
        mocks.activeMember = { id: 'm1', isFeatured: true };
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');

        mocks.activeMember = { id: 'm1', isFeatured: false };
        mocks.activeEvent = withRoles({ status: 'DRAFT' });
        expect(renderHook(() => useToolsMenuItems()).result.current.map((tool) => tool.key)).not.toContain('myRole');
    });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run hooks/useToolsMenuItems.test.tsx`
Expected: the two new tests FAIL; the existing ones still pass.

- [ ] **Step 3: Implement.** In `hooks/useToolsMenuItems.ts`:

- add `UserRound` to the `lucide-react` import;
- import `canEditOwnRole` from `@/lib/memberRoles`;
- add `useActiveMember` to the `@/providers/EventProvider` import and `const activeMember = useActiveMember();` next to `activeEvent`;
- append to `toolDefinitions`:

```ts
        { key: 'myRole', href: routes.events.feed(activeEvent.id, { sheet: 'role' }), icon: UserRound, moduleKey: 'member_roles' },
```

- add after the gifts filter:

```ts
        .filter((tool) => tool.key !== 'myRole' || canEditOwnRole(activeEvent, activeMember))
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run hooks/useToolsMenuItems.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useToolsMenuItems.ts hooks/useToolsMenuItems.test.tsx
git commit -m "feat(member-roles): My role in the tools menu"
```

---

### Task 10: Host role sheet in Manage → Members

**Files:**
- Create: `hooks/useMemberRoleUnlock.ts`, `hooks/useMemberRoleSheet.ts`
- Create: `components/manage/members/MemberRoleSheet.tsx`
- Modify: `components/manage/members/MemberRow.tsx`, `components/manage/members/MembersPanel.tsx`

- [ ] **Step 1: `hooks/useMemberRoleUnlock.ts`**

```ts
'use client';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUnlockMemberRole } from '@/hooks/useMemberRoleMutations';

// Lifts a member's custom-role lock. Hosts can't see the lock state (the API
// doesn't expose it), so the action is always offered and is harmless.
export function useMemberRoleUnlock(memberId: string) {
    const mutation = useUnlockMemberRole();
    const describe = useApiErrorMessage();

    function unlock() {
        mutation.mutate(memberId);
    }

    return {
        unlock,
        isPending: mutation.isPending,
        done: mutation.isSuccess,
        errorMessage: mutation.error ? describe(mutation.error) : null,
    };
}
```

- [ ] **Step 2: `hooks/useMemberRoleSheet.ts`**

```ts
'use client';

import { useCallback, useState } from 'react';

import type { EventMemberResponseDto } from '@/lib/api/types';

// The member whose role the host is editing. Reads the member from the live
// list so the sheet follows cache patches.
export function useMemberRoleSheet(members: EventMemberResponseDto[]) {
    const [memberId, setMemberId] = useState<string | null>(null);
    const member = memberId ? (members.find((item) => item.id === memberId) ?? null) : null;

    const open = useCallback((target: EventMemberResponseDto) => setMemberId(target.id), []);
    const close = useCallback(() => setMemberId(null), []);

    return { member, open, close };
}
```

- [ ] **Step 3: `components/manage/members/MemberRoleSheet.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RoleFormBody } from '@/components/memberRoles/RoleFormBody';
import { RoleSheet } from '@/components/memberRoles/RoleSheet';
import { RoleSheetFooter } from '@/components/memberRoles/RoleSheetFooter';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useMemberRoleUnlock } from '@/hooks/useMemberRoleUnlock';
import { useRoleForm } from '@/hooks/useRoleForm';
import type { EventMemberResponseDto } from '@/lib/api/types';

const FORM_ID = 'member-role-form';

export function MemberRoleSheet({ eventId, member, onCloseAction }: { eventId: string; member: EventMemberResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('MemberRoles');
    const form = useRoleForm({ eventId, member, mode: 'host', onDoneAction: onCloseAction });
    const unlock = useMemberRoleUnlock(member.id);

    return (
        <>
            <RoleSheet title={member.displayName} closeLabel={t('close')} onCloseAction={onCloseAction} footer={<RoleSheetFooter formId={FORM_ID} form={form} />}>
                <RoleFormBody formId={FORM_ID} form={form} />

                {/* Unlock */}
                {form.allowCustom && (
                    <div className="pt-4">
                        {unlock.done ? (
                            <p className="text-sm text-ink-muted">{t('host.unlocked')}</p>
                        ) : (
                            <button
                                type="button"
                                onClick={unlock.unlock}
                                disabled={unlock.isPending}
                                className="min-h-10 text-sm font-semibold text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-50"
                            >
                                {t('host.unlock')}
                            </button>
                        )}
                        {unlock.errorMessage && <p className="pt-1 text-sm text-destructive">{unlock.errorMessage}</p>}
                    </div>
                )}
            </RoleSheet>

            {/* Clear confirmation */}
            <ConfirmActionModal
                open={form.confirmingClear}
                onCloseAction={form.cancelClear}
                title={t('host.clearTitle', { name: member.displayName })}
                body={t('host.clearBody')}
                cancelLabel={t('host.cancel')}
                confirmLabel={t('host.clearConfirm')}
                isConfirming={form.isClearing}
                onConfirmAction={form.confirmClear}
            />
        </>
    );
}
```

- [ ] **Step 4: `MemberRow` shows the role and opens the sheet.** In `components/manage/members/MemberRow.tsx`:

Add imports:

```tsx
import { RoleChip } from '@/components/memberRoles/RoleChip';
import { useMemberRoleLabel } from '@/hooks/useMemberRoleLabel';
```

Add props `eventTypeKey: string | null;`, `editRoleLabel: string;`, `onEditRoleAction?: (member: EventMemberResponseDto) => void;` to `MemberRowProps` and the destructuring. In the body:

```tsx
    const memberRole = useMemberRoleLabel(member, eventTypeKey);
    const handleEditRole = useCallback(() => onEditRoleAction?.(member), [member, onEditRoleAction]);
```

Replace the `<Avatar …/>` + `<div className="min-w-0 flex-1">…</div>` pair with:

```tsx
            {/* Identity */}
            <MemberIdentity onClick={onEditRoleAction ? handleEditRole : undefined} label={editRoleLabel}>
                <Avatar
                    src={memberAvatarUrl(member.id, member.avatarUrl)}
                    initials={initialsFromName(member.displayName)}
                    color={avatarColorFromId(member.id)}
                    alt={member.displayName}
                    size="sm"
                />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                        <span className="truncate">{member.displayName}</span>
                        {roleLabel && (
                            <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-faint uppercase">
                                {roleLabel}
                            </span>
                        )}
                        {memberRole && <RoleChip label={memberRole} />}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">{joinedLabel}</p>
                </div>
            </MemberIdentity>
```

Add at the bottom of the file (import `type ReactNode` from `react`):

```tsx
// The avatar + name block: a button when the host can edit this member's role.
function MemberIdentity({ onClick, label, children }: { onClick?: () => void; label: string; children: ReactNode }) {
    if (!onClick) return <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>;

    return (
        <button type="button" onClick={onClick} aria-label={label} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-colors hover:bg-surface-muted/60">
            {children}
        </button>
    );
}
```

- [ ] **Step 5: `MembersPanel` wires it.** In `components/manage/members/MembersPanel.tsx`:

Add imports:

```tsx
import { MemberRoleSheet } from '@/components/manage/members/MemberRoleSheet';
import { useMemberRoleSheet } from '@/hooks/useMemberRoleSheet';
import { canManageMemberRoles } from '@/lib/memberRoles';
```

Add `useActiveEvent` to the existing `@/providers/EventProvider` import (it already imports `useActiveMember`), and `useTranslations('MemberRoles')` as `tRoles`. After `const moderation = …`:

```tsx
    const activeEvent = useActiveEvent();
    const roleSheet = useMemberRoleSheet(members);
    const canManageRoles = canManageMemberRoles(activeEvent, canModerate);
```

On `<MemberRow …>` add:

```tsx
                                    eventTypeKey={activeEvent?.eventType ?? null}
                                    editRoleLabel={tRoles('host.edit', { name: member.displayName })}
                                    onEditRoleAction={canManageRoles && !member.isFeatured ? roleSheet.open : undefined}
```

After the `ConfirmActionModal` for removal, add:

```tsx
            {/* Role sheet */}
            {roleSheet.member && <MemberRoleSheet eventId={eventId} member={roleSheet.member} onCloseAction={roleSheet.close} />}
```

- [ ] **Step 6: Typecheck, lint, tests**

```bash
npx tsc --noEmit -p .
npx eslint components/manage/members hooks/useMemberRoleSheet.ts hooks/useMemberRoleUnlock.ts
npx vitest run components/manage
```

Expected: clean / PASS. If an existing `MembersPanel`/`MemberRow` test renders without the new props or providers, pass `eventTypeKey={null}` / `editRoleLabel="edit"` and mock `useMemberRoleLabel` (`vi.mock('@/hooks/useMemberRoleLabel', () => ({ useMemberRoleLabel: () => null }))`).

- [ ] **Step 7: Commit**

```bash
git add components/manage/members hooks/useMemberRoleSheet.ts hooks/useMemberRoleUnlock.ts
git commit -m "feat(member-roles): host role sheet in Manage → Members"
```

---

### Task 11: Verification

- [ ] **Step 1: Full checks**

```bash
npx tsc --noEmit -p .
npm run lint
npx vitest run
```

Expected: tsc clean, 0 lint errors, all tests pass. Fix anything new before moving on.

- [ ] **Step 2: Visual check (mobile first).** Do not use `preview_start {name}` (it shares `.next` with the running dev server). Open `preview_start {url: "http://localhost:3000/"}`; the user signs in themselves. On an ACTIVE wedding event with `member_roles` available, at mobile width (375×812):

1. Open the feed with no role: the sheet opens once; close with X; reload: it does not open again.
2. Tools menu → My role: sheet opens; Back closes it and stays on the feed.
3. Pick a role, Save: chip appears on your posts and comments right away; tap it: sheet reopens on that role.
4. A full role shows "Full" and is disabled; "Other" shows the text field; save custom text.
5. Manage → Members: rows show chips; tap a row: host sheet with Unlock; clear a custom role: confirmation modal.
6. Open a story by a member with a role: chip in the header.

Then repeat 2, 3 and 5 at desktop width and check for overlap or cramped rows.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(member-roles): visual pass fixes"
```

(Skip if nothing changed.)
