# Partner Applications Review (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An **Applications** section in the admin console where an admin browses partner applications, opens one, and approves or declines it. Partners also get a founding badge and checkbox.

**Architecture:** A new admin tab `partnerApplications` with hash routing (`#applications`, `#applications/<id>`), built like Withdrawals (list → detail page with a back link). Data comes from a new `hooks/useAdminPartnerApplications.ts` (queries + mutations, exported key factory). Every bit of logic sits in focused hooks (`usePartnerApplicationsPanel`, `usePartnerApplicationApprove`, `usePartnerApplicationDecline`) and in `lib/adminPartnerApplications.ts`. Components under `components/admin/partnerApplications/` only render.

**Tech Stack:** Next.js App Router, React, TanStack Query, next-intl, Tailwind, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-10-partner-applications-admin-design.md](../specs/2026-10-10-partner-applications-admin-design.md)
**Backend plan (must be merged into Spring `staging` first):** [2026-10-30-partner-applications-review-backend.md](2026-10-30-partner-applications-review-backend.md)

---

## Decisions this plan makes (beyond the spec)

- **The public summary query.** The approve dialog needs "X of 20 spots left". It reads `GET /api/public/partner-program` with a client query (`partnerProgramKeys.summary`). The public page's own server fetch is cached for 5 minutes and isn't touched; after an approval only the client query is invalidated.
- **The filter survives the detail page** because `PartnerApplicationsSection` stays mounted across `#applications` ↔ `#applications/<id>`, and the filter and page live in its hook. Reloading the detail page resets the filter to Pending. Nothing goes in the URL.
- **The sidebar badge** is read by `AdminShellNav` itself through `usePendingApplicationsCount()` (a `size=1` PENDING list, reading `page.totalElements`). Only the `partnerApplications` item shows it.
- **No server prefetch.** The admin console is a client-only hash-routed screen; no other admin section prefetches, and the hash isn't visible to the server.
- **Admin copy in Greek** is written in this plan. Partner = "συνεργάτης".

## File structure

| File | Responsibility |
| --- | --- |
| Modify `lib/api/types.ts` | application DTOs; `founding` on collaborator DTOs |
| Modify `lib/api/endpoints.ts` | `admin.partnerApplications.*` |
| Modify `lib/api/errors.ts` | three error codes |
| Modify `lib/adminUtils.ts` | map the codes to admin message keys |
| Create `lib/adminPartnerApplicationsRouting.ts` (+ test) | hash parse/format |
| Create `lib/adminPartnerApplications.ts` (+ test) | link href, founding checkbox state, approve error kind, filter options |
| Create `hooks/useAdminPartnerApplications.ts` (+ test) | queries, mutations, keys |
| Create `hooks/usePartnerApplicationsPanel.ts` | filter, page, selected id, back |
| Create `hooks/usePartnerApplicationApprove.ts` | approve dialog state and submit |
| Create `hooks/usePartnerApplicationDecline.ts` | decline dialog state and submit |
| Create `components/admin/partnerApplications/*.tsx` | section, table, pill, detail, details, decision, actions, both dialogs |
| Modify `components/admin/AdminNavigationContext.tsx` | the new tab and its hash |
| Modify `components/admin/AdminShellNav.tsx` | Operations group + pending badge |
| Modify `components/admin/AdminConsole.tsx` | render the section |
| Create `components/admin/AdminNavigationContext.partnerApplications.test.tsx` | tab opens from both hashes |
| Modify `lib/adminCollaborations.ts`, `components/admin/CollaboratorDrawer.tsx`, `components/admin/collaborations/CollaboratorPaneHeader.tsx` | founding checkbox and badge |
| Modify `messages/en.json`, `messages/el.json` | all copy |

---

### Task 0: Branch

This worktree (`claude/partnership-apps-admin-panel-36db2d`) was reset to `origin/staging` on 2026-10-30.

- [ ] **Step 1: Bring it up to date**

```bash
git fetch origin
git status -sb
git log --oneline -1 origin/staging
```

If `origin/staging` moved and the branch has no commits of its own, `git reset --hard origin/staging`. Otherwise use the app's sync-with-base action.

- [ ] **Step 2: Make sure `node_modules` resolves**

```bash
npx tsc --version
```

If that fails, link `node_modules` to the main checkout's with a junction (memory: worktree-node-modules-junction).

---

### Task 1: Types, endpoints, error codes

**Files:**
- Modify: `lib/api/types.ts`
- Modify: `lib/api/endpoints.ts:481` (the `admin` block)
- Modify: `lib/api/errors.ts`
- Modify: `lib/adminUtils.ts`

- [ ] **Step 1: Add the DTOs**

After `PartnerApplicationRequestDto` in `lib/api/types.ts`:

```ts
export type PartnerApplicationStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

// GET /api/admin/partner-applications(/{id}). Newest first.
export interface AdminPartnerApplicationDto {
    id: string;
    status: PartnerApplicationStatus;
    createdAt: string;
    name: string;
    businessName: string;
    role: PartnerRole;
    email: string;
    // An https URL or an @handle.
    link: string;
    // ISO 3166-1 alpha-2.
    countryCode: string;
    phone: string | null;
    locale: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    decidedAt: string | null;
    decidedByEmail: string | null;
    declineReason: string | null;
    // Set once approved.
    collaboratorId: string | null;
}

// POST /api/admin/partner-applications/{id}/approve → 200 { collaboratorId }.
// 409 5189 not pending, 5190 no founding spots, 5191 email already a partner (details.collaboratorId).
export interface ApprovePartnerApplicationRequestDto {
    founding: boolean;
}

export interface ApprovePartnerApplicationResponseDto {
    collaboratorId: string;
}

// POST /api/admin/partner-applications/{id}/decline → 200 AdminPartnerApplicationDto. 409 5189.
export interface DeclinePartnerApplicationRequestDto {
    // Sent to the applicant as written. null sends a short generic line instead.
    reason: string | null;
}
```

In `CollaboratorRequestDto` add:

```ts
    // null = false on create, unchanged on update. 409 5190 when no founding spots are left.
    founding: boolean | null;
```

In `CollaboratorResponseDto` add `founding: boolean;` right after `status`.

- [ ] **Step 2: Add the endpoints**

Inside `admin: { … }` in `lib/api/endpoints.ts`, next to `collaborators`:

```ts
        partnerApplications: {
            list: ({ status, page, size }: { status: PartnerApplicationStatus | null; page: number; size: number }) => {
                const params = new URLSearchParams({ page: String(page), size: String(size) });
                if (status) params.set('status', status);
                return `/api/admin/partner-applications?${params.toString()}`;
            },
            byId: (id: string) => `/api/admin/partner-applications/${id}`,
            approve: (id: string) => `/api/admin/partner-applications/${id}/approve`,
            decline: (id: string) => `/api/admin/partner-applications/${id}/decline`,
        },
```

Import `PartnerApplicationStatus` as a type at the top of the file (check how the file already imports types; if it imports none, use `import type { PartnerApplicationStatus } from '@/lib/api/types';`).

- [ ] **Step 3: Add the error codes**

In `ERROR_CODES` (`lib/api/errors.ts`), after `PARTNER_APPLICATION_PENDING: 5180,`, keeping numeric order with the rest of the block:

```ts
    PARTNER_APPLICATION_NOT_PENDING: 5189,
    FOUNDING_SPOTS_FULL: 5190,
    COLLABORATOR_EMAIL_EXISTS: 5191,
```

Use the numbers the backend PR actually shipped with.

- [ ] **Step 4: Map them to admin messages**

In `lib/adminUtils.ts`, add `'applicationNotPending' | 'foundingSpotsFull' | 'collaboratorEmailExists'` to `AdminErrorMessageKey`, and in `adminErrorMessageKey` next to the withdrawal lines:

```ts
    // Another admin decided it first.
    if (code === ERROR_CODES.PARTNER_APPLICATION_NOT_PENDING) return 'applicationNotPending';
    if (code === ERROR_CODES.FOUNDING_SPOTS_FULL) return 'foundingSpotsFull';
    if (code === ERROR_CODES.COLLABORATOR_EMAIL_EXISTS) return 'collaboratorEmailExists';
```

Add to `AdminPage.errors` in `messages/en.json`:

```json
"applicationNotPending": "This application was already decided.",
"foundingSpotsFull": "No founding spots left.",
"collaboratorEmailExists": "A partner with this email already exists."
```

And in `messages/el.json`:

```json
"applicationNotPending": "Αυτή η αίτηση έχει ήδη αποφασιστεί.",
"foundingSpotsFull": "Δεν υπάρχουν άλλες ιδρυτικές θέσεις.",
"collaboratorEmailExists": "Υπάρχει ήδη συνεργάτης με αυτό το email."
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only where a `CollaboratorRequestDto` is built without `founding` (`lib/adminCollaborations.ts`). Those are fixed in Task 9; leave them for now, or add `founding: null` to both builders now so the tree stays green, and finish Task 9 later.

- [ ] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts lib/adminUtils.ts messages/en.json messages/el.json lib/adminCollaborations.ts
git commit -m "feat(admin): partner application types, endpoints and errors"
```

---

### Task 2: Hash routing

**Files:**
- Create: `lib/adminPartnerApplicationsRouting.ts`
- Test: `lib/adminPartnerApplicationsRouting.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import {
    formatPartnerApplicationsHash,
    isPartnerApplicationsHash,
    parsePartnerApplicationsHash,
    PARTNER_APPLICATIONS_HASH_ROOT,
} from '@/lib/adminPartnerApplicationsRouting';

describe('partner applications hash', () => {
    it('recognises the list and a detail page', () => {
        expect(isPartnerApplicationsHash('#applications')).toBe(true);
        expect(isPartnerApplicationsHash('#applications/a-1')).toBe(true);
        expect(isPartnerApplicationsHash('#applicationsx')).toBe(false);
        expect(isPartnerApplicationsHash('#collaborations')).toBe(false);
    });

    it('reads the id', () => {
        expect(parsePartnerApplicationsHash('#applications')).toBeNull();
        expect(parsePartnerApplicationsHash('#applications/')).toBeNull();
        expect(parsePartnerApplicationsHash('#applications/a%2F1')).toBe('a/1');
        expect(parsePartnerApplicationsHash('#applications/%E0%A4%A')).toBeNull();
        expect(parsePartnerApplicationsHash('#orders/o-1')).toBeNull();
    });

    it('writes the hash', () => {
        expect(formatPartnerApplicationsHash(null)).toBe(PARTNER_APPLICATIONS_HASH_ROOT);
        expect(formatPartnerApplicationsHash('a/1')).toBe('#applications/a%2F1');
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/adminPartnerApplicationsRouting.test.ts`
Expected: FAIL, cannot resolve `@/lib/adminPartnerApplicationsRouting`

- [ ] **Step 3: Implement**

```ts
export const PARTNER_APPLICATIONS_HASH_ROOT = '#applications';

export function isPartnerApplicationsHash(hash: string): boolean {
    return hash === PARTNER_APPLICATIONS_HASH_ROOT || hash.startsWith(`${PARTNER_APPLICATIONS_HASH_ROOT}/`);
}

// `#applications/<id>` opens that application's page; the bare root is the list.
export function parsePartnerApplicationsHash(hash: string): string | null {
    if (!isPartnerApplicationsHash(hash)) return null;
    const rest = hash.slice(PARTNER_APPLICATIONS_HASH_ROOT.length + 1);
    if (!rest) return null;
    try {
        return decodeURIComponent(rest);
    } catch {
        return null;
    }
}

export function formatPartnerApplicationsHash(applicationId: string | null): string {
    return applicationId ? `${PARTNER_APPLICATIONS_HASH_ROOT}/${encodeURIComponent(applicationId)}` : PARTNER_APPLICATIONS_HASH_ROOT;
}
```

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run lib/adminPartnerApplicationsRouting.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/adminPartnerApplicationsRouting.ts lib/adminPartnerApplicationsRouting.test.ts
git commit -m "feat(admin): hash routing for partner applications"
```

---

### Task 3: Domain helpers

**Files:**
- Create: `lib/adminPartnerApplications.ts`
- Test: `lib/adminPartnerApplications.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { approveErrorKind, applicationLinkHref, foundingCheckbox } from '@/lib/adminPartnerApplications';
import { ApiError } from '@/lib/api/client';

function conflict(errorCode: number, details?: Record<string, unknown>) {
    return new ApiError(409, { status: 409, errorCode, details });
}

describe('applicationLinkHref', () => {
    it('links a handle to Instagram', () => {
        expect(applicationLinkHref('@studio.m')).toBe('https://instagram.com/studio.m');
    });

    it('keeps an https URL', () => {
        expect(applicationLinkHref('https://studiom.gr')).toBe('https://studiom.gr');
    });
});

describe('foundingCheckbox', () => {
    it('is ticked while spots are left', () => {
        expect(foundingCheckbox(3)).toEqual({ defaultChecked: true, disabled: false });
    });

    it('is unticked and disabled at zero', () => {
        expect(foundingCheckbox(0)).toEqual({ defaultChecked: false, disabled: true });
    });

    it('is unticked and disabled while the count is unknown', () => {
        expect(foundingCheckbox(null)).toEqual({ defaultChecked: false, disabled: true });
    });
});

describe('approveErrorKind', () => {
    it('names each 409', () => {
        expect(approveErrorKind(conflict(5189))).toEqual({ kind: 'notPending' });
        expect(approveErrorKind(conflict(5190))).toEqual({ kind: 'foundingFull' });
        expect(approveErrorKind(conflict(5191, { collaboratorId: 'c-1' }))).toEqual({ kind: 'emailExists', collaboratorId: 'c-1' });
    });

    it('keeps an email clash without an id', () => {
        expect(approveErrorKind(conflict(5191))).toEqual({ kind: 'emailExists', collaboratorId: null });
    });

    it('falls back to other', () => {
        expect(approveErrorKind(new Error('boom'))).toEqual({ kind: 'other' });
        expect(approveErrorKind(null)).toBeNull();
    });
});
```

Check the ProblemDetail field name the client reads the code from (`getErrorCode` in `lib/api/errors.ts`) and use that key in `conflict(...)` instead of `errorCode` if it differs.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/adminPartnerApplications.test.ts`
Expected: FAIL, cannot resolve `@/lib/adminPartnerApplications`

- [ ] **Step 3: Implement**

```ts
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { PartnerApplicationStatus } from '@/lib/api/types';

export const PARTNER_APPLICATIONS_PAGE_SIZE = 25;

// The filter's options, in order. null is "All".
export const APPLICATION_STATUS_FILTERS: readonly (PartnerApplicationStatus | null)[] = ['PENDING', 'APPROVED', 'DECLINED', null];

// The public form only accepts an https URL or an @handle.
export function applicationLinkHref(link: string): string {
    return link.startsWith('@') ? `https://instagram.com/${link.slice(1)}` : link;
}

// Ticked by default while a spot is left; unknown counts as none, so nobody claims a spot blind.
export function foundingCheckbox(spotsLeft: number | null): { defaultChecked: boolean; disabled: boolean } {
    const room = spotsLeft !== null && spotsLeft > 0;
    return { defaultChecked: room, disabled: !room };
}

export type ApproveErrorKind =
    | { kind: 'notPending' }
    | { kind: 'foundingFull' }
    | { kind: 'emailExists'; collaboratorId: string | null }
    | { kind: 'other' };

export function approveErrorKind(error: unknown): ApproveErrorKind | null {
    if (!error) return null;
    const code = getErrorCode(error);
    if (code === ERROR_CODES.PARTNER_APPLICATION_NOT_PENDING) return { kind: 'notPending' };
    if (code === ERROR_CODES.FOUNDING_SPOTS_FULL) return { kind: 'foundingFull' };
    if (code === ERROR_CODES.COLLABORATOR_EMAIL_EXISTS) {
        const details = error instanceof ApiError ? (error.problem?.details as { collaboratorId?: unknown } | undefined) : undefined;
        return { kind: 'emailExists', collaboratorId: typeof details?.collaboratorId === 'string' ? details.collaboratorId : null };
    }
    return { kind: 'other' };
}
```

Check that `getErrorCode` is exported from `lib/api/errors.ts` (`grep -n "export function getErrorCode" lib/api/*.ts lib/*.ts`) and fix the import path if it lives elsewhere.

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run lib/adminPartnerApplications.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/adminPartnerApplications.ts lib/adminPartnerApplications.test.ts
git commit -m "feat(admin): partner application helpers"
```

---

### Task 4: Data hooks

**Files:**
- Create: `hooks/useAdminPartnerApplications.ts`
- Test: `hooks/useAdminPartnerApplications.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminKeys } from '@/hooks/useAdmin';
import {
    partnerApplicationKeys,
    partnerProgramKeys,
    useApprovePartnerApplication,
    useDeclinePartnerApplication,
    usePendingApplicationsCount,
} from '@/hooks/useAdminPartnerApplications';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
    },
}));

function makeClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function isInvalidated(client: QueryClient, key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated ?? false;
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
});

describe('usePendingApplicationsCount', () => {
    it('reads totalElements of a one-row pending page', async () => {
        mocks.get.mockResolvedValue({ content: [], page: { size: 1, number: 0, totalElements: 4, totalPages: 4 } });
        const { result } = renderHook(() => usePendingApplicationsCount(), { wrapper: wrapperFor(makeClient()) });

        await waitFor(() => expect(result.current).toBe(4));
        expect(mocks.get).toHaveBeenCalledWith('/api/admin/partner-applications?page=0&size=1&status=PENDING');
    });
});

describe('useApprovePartnerApplication', () => {
    it('invalidates the applications, the partners and the public summary', async () => {
        const client = makeClient();
        client.setQueryData(partnerApplicationKeys.list('PENDING', 0), {});
        client.setQueryData(partnerApplicationKeys.pendingCount, 1);
        client.setQueryData(adminKeys.collaborators, []);
        client.setQueryData(partnerProgramKeys.summary, { foundingSpotsTotal: 20, foundingSpotsLeft: 3 });
        mocks.post.mockResolvedValue({ collaboratorId: 'c-1' });

        const { result } = renderHook(() => useApprovePartnerApplication(), { wrapper: wrapperFor(client) });
        let response: unknown;
        await act(async () => {
            response = await result.current.mutateAsync({ id: 'a-1', founding: true });
        });

        expect(response).toEqual({ collaboratorId: 'c-1' });
        expect(mocks.post).toHaveBeenCalledWith('/api/admin/partner-applications/a-1/approve', { founding: true });
        expect(isInvalidated(client, partnerApplicationKeys.list('PENDING', 0))).toBe(true);
        expect(isInvalidated(client, partnerApplicationKeys.pendingCount)).toBe(true);
        expect(isInvalidated(client, adminKeys.collaborators)).toBe(true);
        expect(isInvalidated(client, partnerProgramKeys.summary)).toBe(true);
    });
});

describe('useDeclinePartnerApplication', () => {
    it('writes the decided application into its detail query', async () => {
        const client = makeClient();
        const declined = { id: 'a-1', status: 'DECLINED', declineReason: 'No' };
        mocks.post.mockResolvedValue(declined);

        const { result } = renderHook(() => useDeclinePartnerApplication(), { wrapper: wrapperFor(client) });
        await act(async () => {
            await result.current.mutateAsync({ id: 'a-1', reason: 'No' });
        });

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/partner-applications/a-1/decline', { reason: 'No' });
        expect(client.getQueryData(partnerApplicationKeys.detail('a-1'))).toEqual(declined);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useAdminPartnerApplications.test.tsx`
Expected: FAIL, cannot resolve `@/hooks/useAdminPartnerApplications`

- [ ] **Step 3: Implement**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from '@/hooks/useAdmin';
import { PARTNER_APPLICATIONS_PAGE_SIZE } from '@/lib/adminPartnerApplications';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type {
    AdminPartnerApplicationDto,
    ApprovePartnerApplicationResponseDto,
    PartnerApplicationStatus,
    PartnerProgramSummaryDto,
} from '@/lib/api/types';

export const partnerApplicationKeys = {
    all: ['admin', 'partnerApplications'] as const,
    list: (status: PartnerApplicationStatus | null, page: number) => ['admin', 'partnerApplications', 'list', status, page] as const,
    detail: (id: string) => ['admin', 'partnerApplications', 'detail', id] as const,
    pendingCount: ['admin', 'partnerApplications', 'pendingCount'] as const,
};

export const partnerProgramKeys = {
    summary: ['partnerProgram', 'summary'] as const,
};

export function usePartnerApplications(status: PartnerApplicationStatus | null, page: number) {
    return useQuery({
        queryKey: partnerApplicationKeys.list(status, page),
        queryFn: () =>
            api.get<Page<AdminPartnerApplicationDto>>(endpoints.admin.partnerApplications.list({ status, page, size: PARTNER_APPLICATIONS_PAGE_SIZE })),
        placeholderData: (previous) => previous,
    });
}

export function usePartnerApplication(id: string | null) {
    return useQuery({
        queryKey: partnerApplicationKeys.detail(id ?? ''),
        queryFn: () => api.get<AdminPartnerApplicationDto>(endpoints.admin.partnerApplications.byId(id!)),
        enabled: Boolean(id),
    });
}

// The sidebar badge: only the total is needed, so one row is fetched.
export function usePendingApplicationsCount(): number {
    const query = useQuery({
        queryKey: partnerApplicationKeys.pendingCount,
        queryFn: async () => {
            const page = await api.get<Page<AdminPartnerApplicationDto>>(
                endpoints.admin.partnerApplications.list({ status: 'PENDING', page: 0, size: 1 }),
            );
            return page.page.totalElements;
        },
    });
    return query.data ?? 0;
}

export function usePartnerProgramSummary(enabled: boolean) {
    return useQuery({
        queryKey: partnerProgramKeys.summary,
        queryFn: () => api.get<PartnerProgramSummaryDto>(endpoints.partnerProgram.summary),
        enabled,
    });
}

export function useApprovePartnerApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, founding }: { id: string; founding: boolean }) =>
            api.post<ApprovePartnerApplicationResponseDto>(endpoints.admin.partnerApplications.approve(id), { founding }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            queryClient.invalidateQueries({ queryKey: adminKeys.collaborators });
            queryClient.invalidateQueries({ queryKey: partnerProgramKeys.summary });
        },
    });
}

export function useDeclinePartnerApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string | null }) =>
            api.post<AdminPartnerApplicationDto>(endpoints.admin.partnerApplications.decline(id), { reason }),
        onSuccess: (declined) => {
            queryClient.setQueryData(partnerApplicationKeys.detail(declined.id), declined);
            queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
        },
    });
}
```

`invalidateQueries({ queryKey: partnerApplicationKeys.all })` in decline also marks the detail query stale, which refetches it; that's fine, since the data written just before is already the server's answer.

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run hooks/useAdminPartnerApplications.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdminPartnerApplications.ts hooks/useAdminPartnerApplications.test.tsx
git commit -m "feat(admin): partner application queries and mutations"
```

---

### Task 5: Navigation (tab, hash, sidebar badge, console)

**Files:**
- Modify: `components/admin/AdminNavigationContext.tsx`
- Modify: `components/admin/AdminShellNav.tsx`
- Modify: `components/admin/AdminConsole.tsx`
- Test: `components/admin/AdminNavigationContext.partnerApplications.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Applications tab', () => {
    it.each(['#applications', '#applications/a-1'])('opens from %s', (hash) => {
        window.history.replaceState(null, '', `/admin${hash}`);
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('partnerApplications:Applications')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/admin/AdminNavigationContext.partnerApplications.test.tsx`
Expected: FAIL, shows `metrics:…`

- [ ] **Step 3: Register the tab**

In `components/admin/AdminNavigationContext.tsx`:
- import `{ isPartnerApplicationsHash, PARTNER_APPLICATIONS_HASH_ROOT } from '@/lib/adminPartnerApplicationsRouting'` and `Inbox` from `lucide-react`;
- add `| 'partnerApplications'` to `AdminTab`, right before `| 'collaborations'`;
- add `partnerApplications: PARTNER_APPLICATIONS_HASH_ROOT,` to `TAB_TO_HASH`;
- in `currentHashTab()`, add `if (isPartnerApplicationsHash(hash)) return 'partnerApplications';` right before the collaborations line;
- in `tabs`, right before the collaborations item: `{ key: 'partnerApplications', label: t('partnerApplications'), icon: Inbox },`.

In `messages/en.json`, `AdminPage.tabs`: `"partnerApplications": "Applications"`. In `messages/el.json`: `"partnerApplications": "Αιτήσεις"`.

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run components/admin/AdminNavigationContext.partnerApplications.test.tsx`
Expected: PASS

- [ ] **Step 5: Sidebar group and badge**

In `components/admin/AdminShellNav.tsx`:
- add `partnerApplications: 'operations',` to `TAB_GROUP`, right before `collaborations`;
- import `usePendingApplicationsCount` from `@/hooks/useAdminPartnerApplications`;
- in the component body: `const pendingApplications = usePendingApplicationsCount();`;
- in the item, right after `<span className="truncate">{label}</span>`:

```tsx
                                        {/* Pending applications */}
                                        {key === 'partnerApplications' && pendingApplications > 0 && (
                                            <span className="ml-auto rounded-full bg-status-warn-wash px-1.5 font-mono text-[11px] font-bold text-status-warn tabular-nums">
                                                {pendingApplications}
                                            </span>
                                        )}
```

The badge uses the warn tone, the same one the Pending pill uses, so coral stays the accent for primary actions and the active item.

- [ ] **Step 6: Render the section**

In `components/admin/AdminConsole.tsx`, import `PartnerApplicationsSection` from `@/components/admin/partnerApplications/PartnerApplicationsSection` and add, before the collaborations line:

```tsx
    if (tab === 'partnerApplications') return <PartnerApplicationsSection />;
```

The section is created in Task 6; this file won't compile until then. Commit Task 5 and Task 6 together if you need a green tree in between.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminNavigationContext.tsx components/admin/AdminNavigationContext.partnerApplications.test.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx messages/en.json messages/el.json
git commit -m "feat(admin): Applications tab with a pending badge"
```

---

### Task 6: List (section, filter, table, pill)

**Files:**
- Create: `hooks/usePartnerApplicationsPanel.ts`
- Create: `components/admin/partnerApplications/PartnerApplicationsSection.tsx`
- Create: `components/admin/partnerApplications/PartnerApplicationsTable.tsx`
- Create: `components/admin/partnerApplications/PartnerApplicationStatusPill.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the copy**

Add `AdminPage.partnerApplications` to `messages/en.json`:

```json
"partnerApplications": {
    "title": "Applications",
    "loading": "Loading applications…",
    "empty": "No applications.",
    "filterLabel": "Status",
    "filter": { "PENDING": "Pending", "APPROVED": "Approved", "DECLINED": "Declined", "all": "All" },
    "status": { "PENDING": "Pending", "APPROVED": "Approved", "DECLINED": "Declined" },
    "columns": { "received": "Received", "business": "Business", "role": "Role", "country": "Country", "source": "Source", "status": "Status" },
    "count": "{count, plural, one {# application} other {# applications}}",
    "back": "All applications",
    "receivedAt": "Received {date}",
    "fields": {
        "name": "Name",
        "email": "Email",
        "phone": "Phone",
        "link": "Website or Instagram",
        "role": "Role",
        "country": "Country",
        "language": "Language",
        "source": "Source"
    },
    "languages": { "el": "Greek", "en": "English" },
    "decidedBy": "{status} by {email} · {date}",
    "decidedByUnknown": "{status} · {date}",
    "reasonSent": "Reason sent",
    "noReason": "No reason. The generic message was sent.",
    "openPartner": "Open partner",
    "approve": "Approve",
    "decline": "Decline",
    "cancel": "Cancel",
    "approveTitle": "Approve {name}?",
    "approveBody": "This creates the partner. You'll set their code and rates next.",
    "foundingLabel": "Founding partner ({left} of {total} spots left)",
    "foundingNone": "No founding spots left",
    "declineTitle": "Decline {name}?",
    "reasonLabel": "Reason (sent to the applicant)",
    "reasonHelp": "Leave empty to send a short generic message.",
    "openExistingPartner": "Open that partner"
}
```

And to `messages/el.json`:

```json
"partnerApplications": {
    "title": "Αιτήσεις",
    "loading": "Φόρτωση αιτήσεων…",
    "empty": "Δεν υπάρχουν αιτήσεις.",
    "filterLabel": "Κατάσταση",
    "filter": { "PENDING": "Σε αναμονή", "APPROVED": "Εγκρίθηκαν", "DECLINED": "Απορρίφθηκαν", "all": "Όλες" },
    "status": { "PENDING": "Σε αναμονή", "APPROVED": "Εγκρίθηκε", "DECLINED": "Απορρίφθηκε" },
    "columns": { "received": "Λήψη", "business": "Επιχείρηση", "role": "Ρόλος", "country": "Χώρα", "source": "Πηγή", "status": "Κατάσταση" },
    "count": "{count, plural, one {# αίτηση} other {# αιτήσεις}}",
    "back": "Όλες οι αιτήσεις",
    "receivedAt": "Λήψη {date}",
    "fields": {
        "name": "Όνομα",
        "email": "Email",
        "phone": "Τηλέφωνο",
        "link": "Ιστότοπος ή Instagram",
        "role": "Ρόλος",
        "country": "Χώρα",
        "language": "Γλώσσα",
        "source": "Πηγή"
    },
    "languages": { "el": "Ελληνικά", "en": "Αγγλικά" },
    "decidedBy": "{status} από {email} · {date}",
    "decidedByUnknown": "{status} · {date}",
    "reasonSent": "Αιτιολογία που στάλθηκε",
    "noReason": "Χωρίς αιτιολογία. Στάλθηκε το γενικό μήνυμα.",
    "openPartner": "Άνοιγμα συνεργάτη",
    "approve": "Έγκριση",
    "decline": "Απόρριψη",
    "cancel": "Άκυρο",
    "approveTitle": "Έγκριση {name};",
    "approveBody": "Θα δημιουργηθεί ο συνεργάτης. Μετά ορίζετε κωδικό και ποσοστά.",
    "foundingLabel": "Ιδρυτικός συνεργάτης ({left} από {total} θέσεις ελεύθερες)",
    "foundingNone": "Δεν υπάρχουν άλλες ιδρυτικές θέσεις",
    "declineTitle": "Απόρριψη {name};",
    "reasonLabel": "Αιτιολογία (στέλνεται στον αιτούντα)",
    "reasonHelp": "Αφήστε το κενό για να σταλεί ένα σύντομο γενικό μήνυμα.",
    "openExistingPartner": "Άνοιγμα αυτού του συνεργάτη"
}
```

Greek uses `;` as the question mark.

- [ ] **Step 2: The panel hook**

```ts
'use client';

import { type MouseEvent, useCallback, useEffect, useState } from 'react';

import { usePartnerApplications } from '@/hooks/useAdminPartnerApplications';
import { formatPartnerApplicationsHash, parsePartnerApplicationsHash } from '@/lib/adminPartnerApplicationsRouting';
import type { PartnerApplicationStatus } from '@/lib/api/types';
import { pushPageEntry } from '@/lib/overlayHistory';

function currentApplicationId(): string | null {
    return typeof window === 'undefined' ? null : parsePartnerApplicationsHash(window.location.hash);
}

// The list's filter and page live here, so they survive a trip to a detail page and back.
export function usePartnerApplicationsPanel() {
    const [status, setStatusState] = useState<PartnerApplicationStatus | null>('PENDING');
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(currentApplicationId);
    const query = usePartnerApplications(status, page);

    useEffect(() => {
        function syncFromHash() {
            setSelectedId(currentApplicationId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const setStatus = useCallback((next: PartnerApplicationStatus | null) => {
        setStatusState(next);
        setPage(0);
    }, []);

    // Next's Link sets the hash with pushState, which fires no hashchange.
    const handleBackClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        pushPageEntry(formatPartnerApplicationsHash(null));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    return {
        status,
        setStatus,
        page,
        setPage,
        selectedId,
        rows: query.data?.content ?? [],
        pageInfo: query.data?.page ?? null,
        isLoading: query.isLoading,
        error: query.error,
        handleBackClick,
    };
}
```

- [ ] **Step 3: The status pill**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { PartnerApplicationStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<PartnerApplicationStatus, string> = {
    PENDING: 'bg-status-warn-wash text-status-warn',
    APPROVED: 'bg-status-success-wash text-status-success',
    DECLINED: 'bg-surface-muted text-ink-muted',
};

export function PartnerApplicationStatusPill({ status }: { status: PartnerApplicationStatus }) {
    const t = useTranslations('AdminPage.partnerApplications.status');
    return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', TONE[status])}>{t(status)}</span>;
}
```

Check the success token names with `grep -n "status-success" app/globals.css | head -3` and match them (`CollaboratorStatusPill.tsx` uses the same set).

- [ ] **Step 4: The table**

```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { PartnerApplicationStatusPill } from '@/components/admin/partnerApplications/PartnerApplicationStatusPill';
import { formatPartnerApplicationsHash } from '@/lib/adminPartnerApplicationsRouting';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminPartnerApplicationDto } from '@/lib/api/types';
import { useCountryName } from '@/hooks/useCountryName';

export function PartnerApplicationsTable({ rows }: { rows: AdminPartnerApplicationDto[] }) {
    const t = useTranslations('AdminPage.partnerApplications');
    const tRoles = useTranslations('AdminPage.collaborations.feedCard.roles');
    const locale = useLocale();
    const countryName = useCountryName();

    return (
        <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                    <th className="px-4 py-2.5 font-bold">{t('columns.received')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.business')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.role')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.country')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.source')}</th>
                    <th className="px-3 py-2.5 font-bold">{t('columns.status')}</th>
                    <th className="px-3 py-2.5" />
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.id} className="relative border-b border-border last:border-b-0 hover:bg-canvas/60">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted">
                            {/* The link covers the whole row */}
                            <a href={formatPartnerApplicationsHash(row.id)} className="after:absolute after:inset-0">
                                {formatAdminDateTime(locale, row.createdAt)}
                            </a>
                        </td>
                        <td className="px-3 py-2.5">
                            <span className="block font-semibold text-ink">{row.businessName}</span>
                            <span className="block text-xs text-ink-muted">{row.name}</span>
                        </td>
                        <td className="px-3 py-2.5">
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{tRoles(row.role)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">
                            {countryName(row.countryCode)} <span className="font-mono text-[11px] text-ink-faint">{row.countryCode}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted">{row.utmSource ?? '—'}</td>
                        <td className="px-3 py-2.5">
                            <PartnerApplicationStatusPill status={row.status} />
                        </td>
                        <td className="px-3 py-2.5 text-ink-faint">
                            <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

Add the small `hooks/useCountryName.ts` it uses:

```ts
'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

// A country's name in the console's language, falling back to its code.
export function useCountryName() {
    const locale = useLocale();
    const names = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
    return useCallback((code: string) => names.of(code) ?? code, [names]);
}
```

`formatAdminDateTime` lives in `lib/adminWithdrawals.ts` today. If it would read more naturally from `lib/adminUtils.ts`, move it there in a separate commit and update the withdrawals imports; otherwise import it from where it is.

- [ ] **Step 5: The section**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { PartnerApplicationDetail } from '@/components/admin/partnerApplications/PartnerApplicationDetail';
import { PartnerApplicationsTable } from '@/components/admin/partnerApplications/PartnerApplicationsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePartnerApplicationsPanel } from '@/hooks/usePartnerApplicationsPanel';
import { APPLICATION_STATUS_FILTERS } from '@/lib/adminPartnerApplications';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PartnerApplicationsSection() {
    const t = useTranslations('AdminPage');
    const panel = usePartnerApplicationsPanel();
    const filterOptions = APPLICATION_STATUS_FILTERS.map((value) => ({
        value: value ?? 'all',
        label: t(`partnerApplications.filter.${value ?? 'all'}`),
    }));

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Detail */}
            {panel.selectedId && <PartnerApplicationDetail key={panel.selectedId} applicationId={panel.selectedId} onBackAction={panel.handleBackClick} />}

            {!panel.selectedId && (
                <>
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('partnerApplications.title')}</h1>
                        <FunnelSegmented
                            label={t('partnerApplications.filterLabel')}
                            options={filterOptions}
                            value={panel.status ?? 'all'}
                            onChangeAction={panel.handleStatusChange}
                        />
                    </header>

                    {panel.isLoading && <LoadingState label={t('partnerApplications.loading')} className="justify-start py-6" />}
                    {Boolean(panel.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(panel.error)}`)}</p>}
                    {!panel.isLoading && !panel.error && panel.rows.length === 0 && (
                        <p className="py-6 text-sm text-ink-muted">{t('partnerApplications.empty')}</p>
                    )}

                    {/* Table */}
                    {panel.rows.length > 0 && panel.pageInfo && (
                        <section className="overflow-x-auto rounded-xl border border-border bg-card">
                            <PartnerApplicationsTable rows={panel.rows} />
                            <AdminPagination
                                pageInfo={panel.pageInfo}
                                page={panel.page}
                                summary={t('partnerApplications.count', { count: panel.pageInfo.totalElements })}
                                onPageChangeAction={panel.setPage}
                            />
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
```

`FunnelSegmented` works on string values, so "All" is `'all'` in the control. Add the translation from control value to filter in the panel hook, so the component stays a render shell. In `usePartnerApplicationsPanel`, add:

```ts
    // The segmented control can't hold null, so "All" travels as 'all'.
    const handleStatusChange = useCallback((value: string) => setStatus(value === 'all' ? null : (value as PartnerApplicationStatus)), [setStatus]);
```

and return `handleStatusChange`.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: only the missing `PartnerApplicationDetail` (Task 7)

- [ ] **Step 7: Commit (after Task 7 if you want a green tree)**

```bash
git add hooks/usePartnerApplicationsPanel.ts hooks/useCountryName.ts components/admin/partnerApplications messages/en.json messages/el.json
git commit -m "feat(admin): partner applications table with a status filter"
```

---

### Task 7: Detail page (header, details, decision, actions)

**Files:**
- Create: `components/admin/partnerApplications/PartnerApplicationDetail.tsx`
- Create: `components/admin/partnerApplications/PartnerApplicationDetails.tsx`
- Create: `components/admin/partnerApplications/PartnerApplicationDecision.tsx`
- Create: `components/admin/partnerApplications/PartnerApplicationActions.tsx` (Task 8 fills the dialogs in)
- Create: `hooks/usePartnerApplicationDetail.ts`

- [ ] **Step 1: The detail hook**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { usePartnerApplication } from '@/hooks/useAdminPartnerApplications';
import { formatCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { applicationLinkHref } from '@/lib/adminPartnerApplications';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';

export function usePartnerApplicationDetail(applicationId: string) {
    const t = useTranslations('AdminPage.partnerApplications');
    const locale = useLocale();
    const query = usePartnerApplication(applicationId);
    const application = query.data ?? null;

    const decision =
        application && application.status !== 'PENDING' && application.decidedAt
            ? application.decidedByEmail
                ? t('decidedBy', { status: t(`status.${application.status}`), email: application.decidedByEmail, date: formatAdminDateTime(locale, application.decidedAt) })
                : t('decidedByUnknown', { status: t(`status.${application.status}`), date: formatAdminDateTime(locale, application.decidedAt) })
            : null;

    return {
        application,
        isLoading: query.isLoading,
        error: query.error,
        receivedAt: application ? formatAdminDateTime(locale, application.createdAt) : null,
        linkHref: application ? applicationLinkHref(application.link) : null,
        source: application ? [application.utmSource, application.utmMedium, application.utmCampaign].filter(Boolean).join(' / ') || null : null,
        decision,
        partnerHash: application?.collaboratorId ? formatCollaborationsHash(application.collaboratorId) : null,
    };
}
```

- [ ] **Step 2: The details block**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useCountryName } from '@/hooks/useCountryName';
import type { AdminPartnerApplicationDto } from '@/lib/api/types';

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="text-xs font-semibold text-ink-faint">{label}</dt>
            <dd className="min-w-0 text-sm break-words text-ink">{children}</dd>
        </div>
    );
}

export function PartnerApplicationDetails({
    application,
    linkHref,
    source,
}: {
    application: AdminPartnerApplicationDto;
    linkHref: string;
    source: string | null;
}) {
    const t = useTranslations('AdminPage.partnerApplications');
    const tRoles = useTranslations('AdminPage.collaborations.feedCard.roles');
    const countryName = useCountryName();

    return (
        <dl className="divide-y divide-border">
            <Row label={t('fields.name')}>{application.name}</Row>
            <Row label={t('fields.email')}>
                <a href={`mailto:${application.email}`} className="font-mono text-[13px] hover:underline">
                    {application.email}
                </a>
            </Row>
            <Row label={t('fields.phone')}>
                {application.phone ? (
                    <a href={`tel:${application.phone}`} className="font-mono text-[13px] hover:underline">
                        {application.phone}
                    </a>
                ) : (
                    '—'
                )}
            </Row>
            <Row label={t('fields.link')}>
                <a href={linkHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {application.link}
                </a>
            </Row>
            <Row label={t('fields.role')}>{tRoles(application.role)}</Row>
            <Row label={t('fields.country')}>
                {countryName(application.countryCode)} <span className="font-mono text-[11px] text-ink-faint">{application.countryCode}</span>
            </Row>
            <Row label={t('fields.language')}>{t(`languages.${application.locale === 'el' ? 'el' : 'en'}`)}</Row>
            <Row label={t('fields.source')}>
                <span className="font-mono text-[13px]">{source ?? '—'}</span>
            </Row>
        </dl>
    );
}
```

- [ ] **Step 3: The decision block**

```tsx
'use client';

import { Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationDecision({
    application,
    decision,
    partnerHash,
}: {
    application: AdminPartnerApplicationDto;
    decision: string;
    partnerHash: string | null;
}) {
    const t = useTranslations('AdminPage.partnerApplications');

    return (
        <section className="space-y-2 border-t border-border pt-5">
            <p className="text-sm text-ink-muted">{decision}</p>
            {application.status === 'DECLINED' && (
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold text-ink-faint">{t('reasonSent')}</p>
                    <p className="mt-1 text-sm whitespace-pre-line text-ink">{application.declineReason ?? t('noReason')}</p>
                </div>
            )}
            {partnerHash && (
                <a href={partnerHash} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
                    <Handshake className="h-4 w-4" />
                    {t('openPartner')}
                </a>
            )}
        </section>
    );
}
```

A plain `href` to `#collaborations/<id>` fires `hashchange`, which `AdminNavigationContext` already follows.

- [ ] **Step 4: The detail page**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { PartnerApplicationActions } from '@/components/admin/partnerApplications/PartnerApplicationActions';
import { PartnerApplicationDecision } from '@/components/admin/partnerApplications/PartnerApplicationDecision';
import { PartnerApplicationDetails } from '@/components/admin/partnerApplications/PartnerApplicationDetails';
import { PartnerApplicationStatusPill } from '@/components/admin/partnerApplications/PartnerApplicationStatusPill';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePartnerApplicationDetail } from '@/hooks/usePartnerApplicationDetail';
import { PARTNER_APPLICATIONS_HASH_ROOT } from '@/lib/adminPartnerApplicationsRouting';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PartnerApplicationDetail({
    applicationId,
    onBackAction,
}: {
    applicationId: string;
    onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
    const t = useTranslations('AdminPage');
    const detail = usePartnerApplicationDetail(applicationId);
    const { application } = detail;

    return (
        <div className="max-w-4xl space-y-8">
            {/* Back */}
            <BackButton href={PARTNER_APPLICATIONS_HASH_ROOT} label={t('partnerApplications.back')} onClick={onBackAction} />

            {detail.isLoading && <LoadingState label={t('partnerApplications.loading')} className="justify-start py-6" />}
            {Boolean(detail.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(detail.error)}`)}</p>}

            {application && detail.linkHref && (
                <>
                    {/* Header */}
                    <header className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{application.businessName}</h2>
                            <PartnerApplicationStatusPill status={application.status} />
                        </div>
                        <p className="text-sm text-ink-muted">{t('partnerApplications.receivedAt', { date: detail.receivedAt })}</p>
                    </header>

                    {/* Details */}
                    <PartnerApplicationDetails application={application} linkHref={detail.linkHref} source={detail.source} />

                    {/* Decision */}
                    {detail.decision && <PartnerApplicationDecision application={application} decision={detail.decision} partnerHash={detail.partnerHash} />}

                    {/* Actions */}
                    {application.status === 'PENDING' && <PartnerApplicationActions application={application} />}
                </>
            )}
        </div>
    );
}
```

A missing id surfaces as the 404 → `errors.notFound` line, through `adminErrorMessageKey`.

- [ ] **Step 5: A placeholder `PartnerApplicationActions` so the tree compiles**

```tsx
'use client';

import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationActions({ application }: { application: AdminPartnerApplicationDto }) {
    return <div data-application={application.id} />;
}
```

Task 8 replaces it.

- [ ] **Step 6: Type-check, lint, tests**

```bash
npx tsc --noEmit
npx eslint components/admin/partnerApplications hooks/usePartnerApplicationsPanel.ts hooks/usePartnerApplicationDetail.ts hooks/useCountryName.ts
npx vitest run lib/adminPartnerApplications hooks/useAdminPartnerApplications components/admin/AdminNavigationContext.partnerApplications
```

Expected: clean, all PASS

- [ ] **Step 7: Commit**

```bash
git add components/admin/partnerApplications hooks/usePartnerApplicationsPanel.ts hooks/usePartnerApplicationDetail.ts hooks/useCountryName.ts components/admin/AdminConsole.tsx messages/en.json messages/el.json
git commit -m "feat(admin): partner application detail page"
```

---

### Task 8: Approve and decline dialogs

**Files:**
- Create: `hooks/usePartnerApplicationApprove.ts`
- Create: `hooks/usePartnerApplicationApprove.test.tsx`
- Create: `hooks/usePartnerApplicationDecline.ts`
- Create: `components/admin/partnerApplications/ApprovePartnerApplicationModal.tsx`
- Create: `components/admin/partnerApplications/DeclinePartnerApplicationModal.tsx`
- Modify: `components/admin/partnerApplications/PartnerApplicationActions.tsx`

- [ ] **Step 1: Write the failing approve-hook test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePartnerApplicationApprove } from '@/hooks/usePartnerApplicationApprove';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        post: (...args: unknown[]) => mocks.post(...args),
    },
}));
vi.mock('@/lib/overlayHistory', () => ({ pushPageEntry: (...args: unknown[]) => mocks.push(...args) }));

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.push.mockReset();
    mocks.get.mockResolvedValue({ foundingSpotsTotal: 20, foundingSpotsLeft: 3 });
});

describe('usePartnerApplicationApprove', () => {
    it('ticks founding once the count shows a spot, and opens the new partner on success', async () => {
        mocks.post.mockResolvedValue({ collaboratorId: 'c-1' });
        const { result } = renderHook(() => usePartnerApplicationApprove('a-1'), { wrapper });

        act(() => result.current.open());
        await waitFor(() => expect(result.current.founding).toBe(true));
        expect(result.current.foundingDisabled).toBe(false);

        await act(async () => {
            await result.current.confirm();
        });

        expect(mocks.post).toHaveBeenCalledWith('/api/admin/partner-applications/a-1/approve', { founding: true });
        expect(mocks.push).toHaveBeenCalledWith('#collaborations/c-1');
    });

    it('unticks and disables founding when the spots ran out', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5190 }));
        const { result } = renderHook(() => usePartnerApplicationApprove('a-1'), { wrapper });

        act(() => result.current.open());
        await waitFor(() => expect(result.current.founding).toBe(true));
        mocks.get.mockResolvedValue({ foundingSpotsTotal: 20, foundingSpotsLeft: 0 });

        await act(async () => {
            await result.current.confirm();
        });

        await waitFor(() => expect(result.current.foundingDisabled).toBe(true));
        expect(result.current.founding).toBe(false);
        expect(result.current.error).toEqual({ kind: 'foundingFull' });
        expect(result.current.isOpen).toBe(true);
    });

    it('keeps the existing partner id when the email is taken', async () => {
        mocks.post.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5191, details: { collaboratorId: 'c-9' } }));
        const { result } = renderHook(() => usePartnerApplicationApprove('a-1'), { wrapper });

        act(() => result.current.open());
        await act(async () => {
            await result.current.confirm();
        });

        expect(result.current.error).toEqual({ kind: 'emailExists', collaboratorId: 'c-9' });
        expect(result.current.existingPartnerHash).toBe('#collaborations/c-9');
        expect(mocks.push).not.toHaveBeenCalled();
    });
});
```

Use the same ProblemDetail field for the code as in Task 3.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/usePartnerApplicationApprove.test.tsx`
Expected: FAIL, cannot resolve `@/hooks/usePartnerApplicationApprove`

- [ ] **Step 3: Implement the approve hook**

```ts
'use client';

import { type ChangeEvent, useCallback, useEffect, useState } from 'react';

import { partnerApplicationKeys, useApprovePartnerApplication, usePartnerProgramSummary } from '@/hooks/useAdminPartnerApplications';
import { formatCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { approveErrorKind, foundingCheckbox } from '@/lib/adminPartnerApplications';
import { pushPageEntry } from '@/lib/overlayHistory';
import { useQueryClient } from '@tanstack/react-query';

export function usePartnerApplicationApprove(applicationId: string) {
    const queryClient = useQueryClient();
    const approve = useApprovePartnerApplication();
    const [isOpen, setIsOpen] = useState(false);
    const summary = usePartnerProgramSummary(isOpen);
    const spotsLeft = summary.data?.foundingSpotsLeft ?? null;
    const checkbox = foundingCheckbox(spotsLeft);
    const [founding, setFounding] = useState(false);

    // Follows the count each time it loads: ticked while a spot is left, never ticked at 0.
    useEffect(() => {
        setFounding(checkbox.defaultChecked);
    }, [checkbox.defaultChecked]);

    const error = approveErrorKind(approve.error);

    const open = useCallback(() => {
        approve.reset();
        setIsOpen(true);
    }, [approve]);

    const close = useCallback(() => setIsOpen(false), []);

    const handleFoundingChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setFounding(event.target.checked), []);

    const confirm = useCallback(async () => {
        try {
            const { collaboratorId } = await approve.mutateAsync({ id: applicationId, founding: founding && !checkbox.disabled });
            setIsOpen(false);
            pushPageEntry(formatCollaborationsHash(collaboratorId));
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (caught) {
            const kind = approveErrorKind(caught);
            if (kind?.kind === 'foundingFull') await summary.refetch();
            // Someone else decided it: show the decision on the page instead of the dialog.
            if (kind?.kind === 'notPending') {
                setIsOpen(false);
                await queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            }
        }
    }, [applicationId, approve, checkbox.disabled, founding, queryClient, summary]);

    return {
        isOpen,
        open,
        close,
        confirm,
        founding,
        foundingDisabled: checkbox.disabled,
        spotsLeft,
        spotsTotal: summary.data?.foundingSpotsTotal ?? null,
        handleFoundingChange,
        isPending: approve.isPending,
        error,
        existingPartnerHash: error?.kind === 'emailExists' && error.collaboratorId ? formatCollaborationsHash(error.collaboratorId) : null,
    };
}
```

Sort the `@tanstack/react-query` import above the `@/` ones (the lint rule will say so).

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run hooks/usePartnerApplicationApprove.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: The decline hook**

```ts
'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { partnerApplicationKeys, useDeclinePartnerApplication } from '@/hooks/useAdminPartnerApplications';
import { approveErrorKind } from '@/lib/adminPartnerApplications';
import { useQueryClient } from '@tanstack/react-query';

export const DECLINE_REASON_MAX = 1000;

export function usePartnerApplicationDecline(applicationId: string) {
    const queryClient = useQueryClient();
    const decline = useDeclinePartnerApplication();
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState('');

    const open = useCallback(() => {
        decline.reset();
        setIsOpen(true);
    }, [decline]);

    const close = useCallback(() => setIsOpen(false), []);

    const handleReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value), []);

    // On success the page re-renders from the declined application and shows the decision.
    const confirm = useCallback(async () => {
        try {
            await decline.mutateAsync({ id: applicationId, reason: reason.trim() || null });
            setIsOpen(false);
        } catch (caught) {
            if (approveErrorKind(caught)?.kind === 'notPending') {
                setIsOpen(false);
                await queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            }
        }
    }, [applicationId, decline, queryClient, reason]);

    return { isOpen, open, close, confirm, reason, handleReasonChange, isPending: decline.isPending, error: decline.error };
}
```

`approveErrorKind` also names the not-pending case for decline. If that reads oddly, rename it to `applicationErrorKind` in Task 3 and update both callers.

- [ ] **Step 6: The approve modal**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { usePartnerApplicationApprove } from '@/hooks/usePartnerApplicationApprove';

export function ApprovePartnerApplicationModal({
    businessName,
    approve,
}: {
    businessName: string;
    approve: ReturnType<typeof usePartnerApplicationApprove>;
}) {
    const t = useTranslations('AdminPage');

    return (
        <ConfirmActionModal
            open={approve.isOpen}
            onCloseAction={approve.close}
            title={t('partnerApplications.approveTitle', { name: businessName })}
            body={
                <div className="space-y-4">
                    {/* Body */}
                    <p>{t('partnerApplications.approveBody')}</p>

                    {/* Founding */}
                    <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                        <input
                            type="checkbox"
                            checked={approve.founding}
                            disabled={approve.foundingDisabled}
                            onChange={approve.handleFoundingChange}
                            className="h-4 w-4 accent-primary"
                        />
                        {approve.spotsLeft && approve.spotsLeft > 0
                            ? t('partnerApplications.foundingLabel', { left: approve.spotsLeft, total: approve.spotsTotal ?? 0 })
                            : t('partnerApplications.foundingNone')}
                    </label>

                    {/* Error */}
                    {approve.error && approve.error.kind !== 'notPending' && (
                        <p className="text-sm text-status-danger">
                            {t(
                                `errors.${
                                    approve.error.kind === 'foundingFull'
                                        ? 'foundingSpotsFull'
                                        : approve.error.kind === 'emailExists'
                                          ? 'collaboratorEmailExists'
                                          : 'unknown'
                                }`,
                            )}{' '}
                            {approve.existingPartnerHash && (
                                <a href={approve.existingPartnerHash} className="font-semibold underline">
                                    {t('partnerApplications.openExistingPartner')}
                                </a>
                            )}
                        </p>
                    )}
                </div>
            }
            cancelLabel={t('partnerApplications.cancel')}
            confirmLabel={t('partnerApplications.approve')}
            isConfirming={approve.isPending}
            onConfirmAction={approve.confirm}
            tone="default"
            size="md"
        />
    );
}
```

The nested ternary picking the message key is logic in JSX. Move it into the hook as `errorMessageKey: AdminErrorMessageKey | null` (computed from `error`) and render `t(\`errors.${approve.errorMessageKey}\`)`. Check the generic key's real name (`unknown` or `generic`) in `AdminPage.errors`. While the count is loading (`spotsLeft === null`) the label reads "No founding spots left" for a moment; if that flickers visibly in the check, show `foundingLabel` with `…` until it loads instead.

- [ ] **Step 7: The decline modal**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DECLINE_REASON_MAX, type usePartnerApplicationDecline } from '@/hooks/usePartnerApplicationDecline';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function DeclinePartnerApplicationModal({
    applicationId,
    businessName,
    decline,
}: {
    applicationId: string;
    businessName: string;
    decline: ReturnType<typeof usePartnerApplicationDecline>;
}) {
    const t = useTranslations('AdminPage');
    const reasonId = `decline-reason-${applicationId}`;

    return (
        <ConfirmActionModal
            open={decline.isOpen}
            onCloseAction={decline.close}
            title={t('partnerApplications.declineTitle', { name: businessName })}
            body={
                <div className="space-y-1.5">
                    {/* Reason */}
                    <label htmlFor={reasonId} className="text-xs font-semibold text-ink">
                        {t('partnerApplications.reasonLabel')}
                    </label>
                    <textarea
                        id={reasonId}
                        value={decline.reason}
                        onChange={decline.handleReasonChange}
                        rows={4}
                        maxLength={DECLINE_REASON_MAX}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
                    />
                    <p className="text-xs text-ink-muted">{t('partnerApplications.reasonHelp')}</p>

                    {/* Error */}
                    {decline.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(decline.error)}`)}</p>}
                </div>
            }
            cancelLabel={t('partnerApplications.cancel')}
            confirmLabel={t('partnerApplications.decline')}
            isConfirming={decline.isPending}
            onConfirmAction={decline.confirm}
            tone="danger"
            size="md"
        />
    );
}
```

- [ ] **Step 8: The actions**

Replace the placeholder `PartnerApplicationActions.tsx`:

```tsx
'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ApprovePartnerApplicationModal } from '@/components/admin/partnerApplications/ApprovePartnerApplicationModal';
import { DeclinePartnerApplicationModal } from '@/components/admin/partnerApplications/DeclinePartnerApplicationModal';
import { usePartnerApplicationApprove } from '@/hooks/usePartnerApplicationApprove';
import { usePartnerApplicationDecline } from '@/hooks/usePartnerApplicationDecline';
import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationActions({ application }: { application: AdminPartnerApplicationDto }) {
    const t = useTranslations('AdminPage.partnerApplications');
    const approve = usePartnerApplicationApprove(application.id);
    const decline = usePartnerApplicationDecline(application.id);

    return (
        <section className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
            {/* Approve */}
            <button
                type="button"
                onClick={approve.open}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
                <Check className="h-4 w-4" />
                {t('approve')}
            </button>

            {/* Decline */}
            <button
                type="button"
                onClick={decline.open}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink-muted ring-1 ring-border hover:text-ink"
            >
                <X className="h-4 w-4" />
                {t('decline')}
            </button>

            <ApprovePartnerApplicationModal businessName={application.businessName} approve={approve} />
            <DeclinePartnerApplicationModal applicationId={application.id} businessName={application.businessName} decline={decline} />
        </section>
    );
}
```

- [ ] **Step 9: Type-check, lint, tests**

```bash
npx tsc --noEmit
npx eslint components/admin/partnerApplications hooks
npx vitest run hooks/usePartnerApplicationApprove hooks/useAdminPartnerApplications lib/adminPartnerApplications
```

Expected: clean, all PASS

- [ ] **Step 10: Commit**

```bash
git add hooks/usePartnerApplicationApprove.ts hooks/usePartnerApplicationApprove.test.tsx hooks/usePartnerApplicationDecline.ts components/admin/partnerApplications
git commit -m "feat(admin): approve and decline partner applications"
```

---

### Task 9: Founding on partners (Collaborations)

**Files:**
- Modify: `lib/adminCollaborations.ts:23-32,214-219`
- Modify: `components/admin/CollaboratorDrawer.tsx`
- Modify: `components/admin/collaborations/CollaboratorPaneHeader.tsx`
- Modify: `messages/en.json`, `messages/el.json` (`AdminPage.collaborations`)
- Test: `lib/adminCollaborations.test.ts` (create it if it doesn't exist)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { collaboratorRequestFromFormData, collaboratorRequestWithStatus } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

function form(entries: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
}

describe('collaborator founding', () => {
    it('reads the founding checkbox', () => {
        expect(collaboratorRequestFromFormData(form({ name: 'A', contactEmail: 'a@x.gr', founding: 'on' })).founding).toBe(true);
        expect(collaboratorRequestFromFormData(form({ name: 'A', contactEmail: 'a@x.gr' })).founding).toBe(false);
    });

    it('leaves founding alone when only the status changes', () => {
        const collaborator = { name: 'A', contactEmail: 'a@x.gr', notes: null, founding: true } as CollaboratorResponseDto;
        expect(collaboratorRequestWithStatus(collaborator, 'SUSPENDED').founding).toBeNull();
    });
});
```

If `lib/adminCollaborations.test.ts` exists, add the `describe` to it.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/adminCollaborations.test.ts`
Expected: FAIL, `founding` is `undefined`

- [ ] **Step 3: Implement**

In `collaboratorRequestFromFormData`, add:

```ts
        founding: formData.get('founding') === 'on',
```

In `collaboratorRequestWithStatus`, return `{ …, status, founding: null }`.

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run lib/adminCollaborations.test.ts`
Expected: PASS

- [ ] **Step 5: The drawer checkbox**

Add the copy to `AdminPage.collaborations` in `messages/en.json`:

```json
"founding": "Founding partner",
"foundingBadge": "Founding"
```

And in `messages/el.json`:

```json
"founding": "Ιδρυτικός συνεργάτης",
"foundingBadge": "Ιδρυτικός"
```

In `CollaboratorDrawer.tsx`, after the notes field and before the error line:

```tsx
                {/* Founding */}
                <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                    <input type="checkbox" name="founding" defaultChecked={collaborator?.founding ?? false} className="h-4 w-4 accent-primary" />
                    {t('founding')}
                </label>
```

Ticking it at 0 spots fails with 5190; the existing error line under the form already shows `errors.foundingSpotsFull` through `adminErrorMessageKey`, right below the checkbox.

- [ ] **Step 6: The pane badge**

In `CollaboratorPaneHeader.tsx`, right after `<CollaboratorStatusPill status={collaborator.status} />`:

```tsx
                    {collaborator.founding && (
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{t('foundingBadge')}</span>
                    )}
```

- [ ] **Step 7: Type-check, lint, tests**

```bash
npx tsc --noEmit
npm run lint
npx vitest run lib/adminCollaborations
```

Expected: clean, PASS

- [ ] **Step 8: Commit**

```bash
git add lib/adminCollaborations.ts lib/adminCollaborations.test.ts components/admin/CollaboratorDrawer.tsx components/admin/collaborations/CollaboratorPaneHeader.tsx messages/en.json messages/el.json
git commit -m "feat(admin): founding flag on partners"
```

---

### Task 10: Full checks and visual check

- [ ] **Step 1: Everything green**

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm test
```

Expected: no errors, all tests PASS. Fix any format issue with `npx prettier --write <files>`.

- [ ] **Step 2: Stale references and copy**

```bash
grep -rn "partnerApplications\." components hooks | grep -o "t('[^']*')" | sort -u
```

Every key it prints must exist in both `messages/en.json` and `messages/el.json`. Check there are no hard-coded visible strings in `components/admin/partnerApplications` other than `—`.

- [ ] **Step 3: Visual check, desktop first**

This needs the backend PR running locally (Spring on `:8080` from the backend worktree) and the dev server on `:3000` (local backend CORS allows only `:3000`). Use `preview_start {url: "http://localhost:3000/"}`, never `preview_start {name}` (memory: dev-server-shared-next-cache). The admin console needs a signed-in admin: ask the user for the local admin test login (memory: browser-pane-cant-check-signed-in-ui).

Seed two or three applications through the public form at `/for-business` (or `POST /api/public/partner-applications`), then check at desktop width:
- the sidebar shows Applications in Operations, before Collaborations, with the pending count;
- the table, the filter (Pending → All keeps working, the page resets to 0), an empty filter shows "No applications.";
- a detail page, back keeps the filter, browser back works;
- approve with founding ticked → lands on the new partner in Collaborations, "Founding" badge shows, the sidebar count drops;
- decline with and without a reason → the decision shows on the page;
- the email-exists case (approve a second application with the same email as an existing partner) shows the link to that partner.

Then a mobile pass (`resize_window` preset `mobile`) for overlap and cramped text, and reset to `desktop`.

- [ ] **Step 4: SEO check**

No public route changes. `docs/seo-guidelines.md` doesn't apply to `/admin`; state that in the PR description.

- [ ] **Step 5: Push and open the PR into `staging`**

Only once the user says so, and only after the backend PR is merged into Spring `staging`:

```bash
git push -u origin claude/partnership-apps-admin-panel-36db2d
gh pr create --base staging --title "Admin: review partner applications" --body "Applications section in admin (list, detail, approve, decline), founding flag on partners. Needs the Spring PR for partner application review. SEO: admin only, no public route changes."
```
