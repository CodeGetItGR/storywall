# Private Wishbook (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ticket:** KAN-218 (epic KAN-216). Spec: `docs/superpowers/specs/2026-11-16-voice-wishes-design.md`, Part 1. Backend: KAN-217 (`docs/superpowers/plans/2026-11-16-private-wishbook-backend.md`), which must be on staging before this is tested there.

**Goal:** Guests stop fetching everyone's wishes; a signed-in guest sees "Your messages" under the form and can edit or delete each one.

**Architecture:** `hooks/useWishbook.ts` gains `useMyWishes` (`GET /wishbook/mine`) and `useEditWishbookEntry` (`PUT /api/wishbook/{id}`). The page only runs `useWishbook` for hosts. A `useWishEditor` hook owns the edit sheet's state; `MyWishesSection` and `WishEditSheet` under `components/wishbook/` are render shells. The server `page.tsx` prefetches the hosts' list for hosts and the own list for guests.

**Tech Stack:** Next.js App Router, TanStack Query v5, next-intl, Vitest + Testing Library, Storybook (feeds the visual check).

**Branch:** this worktree (`C:\Users\User\WebstormProjects\storywall\.claude\worktrees\voice-wishes-feature-347ceb`) already sits on `origin/staging` with the spec committed. Rename the branch before pushing:

```bash
git branch -m claude/kan-218-private-wishbook
```

PR into `staging`, title `KAN-218: Guests stop fetching all wishes; Your messages list with edit and delete`.

**Approved copy (owner said yes on 2026-11-16 — add exactly this, nothing else):**

| Key (`WishbookPage.`) | en | el |
| --- | --- | --- |
| `myWishesTitle` | Your messages | Τα μηνύματά σας |
| `edit` | Edit | Επεξεργασία |
| `editTitle` | Edit message | Επεξεργασία μηνύματος |
| `save` | Save | Αποθήκευση |

Reused as they are: `delete`, `cancel`, `deleteTitle`, `deleteBody`, `charactersLeft`, `messageAriaLabel`, `loadMore`, `loading`. Any other new visible text needs the owner's yes first.

---

## File map

- Modify `lib/api/types.ts` — `WishbookEntryEditDto`.
- Modify `lib/api/endpoints.ts` — `events.wishbookMine`.
- Modify `lib/api/errors.ts` — `WISHBOOK_EDIT_NOT_AUTHOR: 4041` (no message key: the generic error covers it; the UI only offers edit on your own wishes).
- Modify `hooks/useWishbook.ts` — `wishbookKeys.mine`, `useMyWishes`, `useEditWishbookEntry`; create/delete also refresh the own list.
- Create `hooks/useWishbook.test.tsx`.
- Create `hooks/useWishEditor.ts` + `hooks/useWishEditor.test.tsx` — edit sheet state.
- Create `components/wishbook/MyWishesSection.tsx` + `.test.tsx` + `.stories.tsx`.
- Create `components/wishbook/WishEditSheet.tsx` + `.test.tsx` + `.stories.tsx`.
- Modify `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx` — gate the hosts' list, render the new section and sheet.
- Modify `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/page.tsx` — prefetch per role.
- Modify both `PageClient.*.test.tsx` mocks; add `PageClient.myWishes.test.tsx`.
- Modify `lib/demo/mockHandlers.ts` — `/wishbook/mine` and `PUT /wishbook/:id` for the public demo.
- Modify `messages/en.json`, `messages/el.json` — the four approved keys.
- No change: `hooks/useRightContextPanel.ts` already calls `useWishbook` only for a live host (`showWishbookSummary`), so the right-panel `WishbookSummarySection` never asks as a guest.

Run checks with `npx vitest run <path>`, `npx tsc --noEmit`, `npx eslint <paths>`.

---

### Task 1: API types, endpoint, error code

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`

- [ ] **Step 1: Add the edit DTO**

In `lib/api/types.ts`, right after `WishbookEntryRequestDto`:

```ts
// PUT /api/wishbook/{entryId} — the author only, while the event is ACTIVE (KAN-217).
export interface WishbookEntryEditDto {
    message: string;
}
```

- [ ] **Step 2: Add the endpoint**

In `lib/api/endpoints.ts`, after `wishbookCount`:

```ts
        wishbookMine: (eventId: string) => `/api/events/${eventId}/wishbook/mine`,
```

- [ ] **Step 3: Add the error code**

In `lib/api/errors.ts` `ERROR_CODES`, after `CAMPAIGN_DISCOUNT_ADMIN_ONLY: 4040,`:

```ts
    WISHBOOK_EDIT_NOT_AUTHOR: 4041,
```

Don't add it to `lib/api/errorMessageKeys.ts`: no test requires every code to have a message, and adding one would mean new copy the owner hasn't approved. The generic error message covers it; the UI only ever offers edit on the guest's own wishes.

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: no errors.

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts
git commit -m "KAN-218: Types and endpoint for own wishes and editing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Hooks for own wishes and editing

**Files:**
- Modify: `hooks/useWishbook.ts`
- Create: `hooks/useWishbook.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `hooks/useWishbook.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditWishbookEntry, useMyWishes, useWishbook, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
const apiPut = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...a: unknown[]) => apiGet(...a), put: (...a: unknown[]) => apiPut(...a), post: vi.fn(), del: vi.fn() },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

const emptyPage = { content: [], page: { number: 0, totalPages: 1, totalElements: 0, size: 20 } };

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useWishbook hooks', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiGet.mockReset();
        apiPut.mockReset();
    });

    it('asks for nothing without an event, so a guest never requests the hosts list', () => {
        renderHook(() => useWishbook(null), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('reads the caller’s own wishes', async () => {
        apiGet.mockResolvedValue(emptyPage);
        const { result } = renderHook(() => useMyWishes('e1'), { wrapper: wrapperFor(client) });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiGet).toHaveBeenCalledWith(`${endpoints.events.wishbookMine('e1')}?page=0&size=20`);
    });

    it('keeps the own list under the wishbook key, so writes refresh it', () => {
        expect(wishbookKeys.mine('e1').slice(0, 3)).toEqual(wishbookKeys.list('e1'));
    });

    it('saves an edit and refreshes the own list', async () => {
        apiPut.mockResolvedValue({ id: 'w1', message: 'New' });
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ entryId: 'w1', message: 'New' }));

        expect(apiPut).toHaveBeenCalledWith(endpoints.wishbook.byId('w1'), { message: 'New' });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: wishbookKeys.mine('e1') });
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useWishbook.test.tsx`
Expected: FAIL — `useMyWishes`, `useEditWishbookEntry` and `wishbookKeys.mine` are not exported.

- [ ] **Step 3: Implement**

In `hooks/useWishbook.ts`:

Change the import to `import type { Page } from '@/lib/api/pagination';` (unchanged) and
`import type { WishbookEntryEditDto, WishbookEntryRequestDto, WishbookEntryResponseDto } from '@/lib/api/types';`.

Replace `wishbookKeys` with:

```ts
export const wishbookKeys = {
    list: (eventId: string) => ['events', eventId, 'wishbook'] as const,
    count: (eventId: string) => ['events', eventId, 'wishbook', 'count'] as const,
    // Under the list key on purpose: invalidating the list (a write, a delete) refreshes this too.
    mine: (eventId: string) => ['events', eventId, 'wishbook', 'mine'] as const,
};
```

Add a comment above `useWishbook`: `// Hosts and co-hosts only: the API answers 403 to anyone else. Pass null for a guest.`

After `useWishbookCount`, add:

```ts
// The caller's own wishes (GET /wishbook/mine), for the "Your messages" list guests see.
export function useMyWishes(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const wishbookReadable = useModuleReadable(eventId, 'wishbook');

    return useInfiniteQuery({
        queryKey: wishbookKeys.mine(eventId ?? ''),
        queryFn: ({ pageParam }) =>
            api.get<Page<WishbookEntryResponseDto>>(`${endpoints.events.wishbookMine(eventId!)}?page=${pageParam}&size=${WISHBOOK_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (page) => (page.page.number + 1 < page.page.totalPages ? page.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated && wishbookReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
    });
}
```

After `useCreateWishbookEntry`, add:

```ts
export function useEditWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, message }: { entryId: string } & WishbookEntryEditDto) =>
            api.put<WishbookEntryResponseDto>(endpoints.wishbook.byId(entryId), { message }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishbookKeys.mine(eventId) });
        },
    });
}
```

`useCreateWishbookEntry` and `useDeleteWishbookEntry` already invalidate `wishbookKeys.list(eventId)`, which is a prefix of `mine`, so they refresh the own list without changes.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run hooks/useWishbook.test.tsx hooks/useWishbookBook.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useWishbook.ts hooks/useWishbook.test.tsx
git commit -m "KAN-218: Hooks for own wishes and editing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Edit sheet state

**Files:**
- Create: `hooks/useWishEditor.ts`, `hooks/useWishEditor.test.tsx`

The sheet and the delete confirmation are never open together: confirming hides the sheet, and cancelling the confirmation brings the sheet back with the draft intact.

- [ ] **Step 1: Write the failing tests**

Create `hooks/useWishEditor.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWishEditor } from '@/hooks/useWishEditor';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

const editMutate = vi.fn();
const deleteMutate = vi.fn();
const editReset = vi.fn();
vi.mock('@/hooks/useWishbook', () => ({
    useEditWishbookEntry: () => ({ mutateAsync: editMutate, isPending: false, error: null, reset: editReset }),
    useDeleteWishbookEntry: () => ({ mutateAsync: deleteMutate, isPending: false, error: null, reset: vi.fn() }),
}));

const entry: WishbookEntryResponseDto = {
    id: 'w1',
    eventId: 'e1',
    authorMemberId: 'm1',
    guestName: 'Me',
    message: 'Hello',
    createdAt: '2026-11-16T10:00:00Z',
    canDelete: true,
    highlighted: null,
};

describe('useWishEditor', () => {
    beforeEach(() => {
        editMutate.mockReset().mockResolvedValue({});
        deleteMutate.mockReset().mockResolvedValue(undefined);
        editReset.mockReset();
    });

    it('opens on a wish with its text as the draft', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));

        expect(result.current.isSheetOpen).toBe(true);
        expect(result.current.draft).toBe('Hello');
        expect(editReset).toHaveBeenCalled();
    });

    it('saves the trimmed draft and closes', async () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.changeDraft('  Hello again  '));

        await act(() => result.current.save());

        expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: 'Hello again' });
        expect(result.current.isSheetOpen).toBe(false);
    });

    it('keeps the sheet open when saving fails', async () => {
        editMutate.mockRejectedValue(new Error('nope'));
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));

        await act(() => result.current.save());

        expect(result.current.isSheetOpen).toBe(true);
    });

    it('cannot save an empty or unchanged draft', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.changeDraft('   '));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.changeDraft('Changed'));
        expect(result.current.canSave).toBe(true);
    });

    it('swaps the sheet for the delete confirmation and back', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.changeDraft('Draft kept'));

        act(() => result.current.askDelete());
        expect(result.current.isSheetOpen).toBe(false);
        expect(result.current.isConfirmingDelete).toBe(true);

        act(() => result.current.cancelDelete());
        expect(result.current.isSheetOpen).toBe(true);
        expect(result.current.draft).toBe('Draft kept');
    });

    it('deletes the wish and closes everything', async () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.askDelete());

        await act(() => result.current.confirmDelete());

        expect(deleteMutate).toHaveBeenCalledWith('w1');
        expect(result.current.isSheetOpen).toBe(false);
        expect(result.current.isConfirmingDelete).toBe(false);
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useWishEditor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `hooks/useWishEditor.ts`:

```ts
'use client';

import { useState } from 'react';

import { useDeleteWishbookEntry, useEditWishbookEntry } from '@/hooks/useWishbook';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

// State for the sheet a guest opens on one of their own wishes: edit its text, or delete it.
// The delete confirmation replaces the sheet while it is open; cancelling brings the sheet back.
export function useWishEditor(eventId: string) {
    const [selected, setSelected] = useState<WishbookEntryResponseDto | null>(null);
    const [draft, setDraft] = useState('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const edit = useEditWishbookEntry(eventId);
    const remove = useDeleteWishbookEntry(eventId);

    const trimmed = draft.trim();
    const canSave = Boolean(selected) && trimmed.length > 0 && trimmed !== selected?.message && !edit.isPending;

    function open(entry: WishbookEntryResponseDto) {
        edit.reset();
        setSelected(entry);
        setDraft(entry.message);
        setIsConfirmingDelete(false);
    }
    function close() {
        setSelected(null);
        setIsConfirmingDelete(false);
    }
    async function save() {
        if (!selected || !canSave) return;
        try {
            await edit.mutateAsync({ entryId: selected.id, message: trimmed });
        } catch {
            return; // edit.error shows in the sheet; keep what was typed
        }
        close();
    }
    async function confirmDelete() {
        if (!selected) return;
        await remove.mutateAsync(selected.id);
        close();
    }

    return {
        draft,
        changeDraft: setDraft,
        canSave,
        isSaving: edit.isPending,
        saveError: edit.error,
        isSheetOpen: Boolean(selected) && !isConfirmingDelete,
        isConfirmingDelete,
        isDeleting: remove.isPending,
        open,
        close,
        save,
        askDelete: () => setIsConfirmingDelete(true),
        cancelDelete: () => setIsConfirmingDelete(false),
        confirmDelete,
    };
}

export type WishEditor = ReturnType<typeof useWishEditor>;
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run hooks/useWishEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useWishEditor.ts hooks/useWishEditor.test.tsx
git commit -m "KAN-218: Edit sheet state for a guest's own wish

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Copy

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the four approved keys**

In `messages/en.json`, inside `"WishbookPage"`, after `"cancel": "Cancel",`:

```json
        "myWishesTitle": "Your messages",
        "edit": "Edit",
        "editTitle": "Edit message",
        "save": "Save",
```

In `messages/el.json`, inside `"WishbookPage"`, after `"cancel": "Ακύρωση",`:

```json
        "myWishesTitle": "Τα μηνύματά σας",
        "edit": "Επεξεργασία",
        "editTitle": "Επεξεργασία μηνύματος",
        "save": "Αποθήκευση",
```

Keep the files' existing indentation. Don't touch any other string.

- [ ] **Step 2: Check the files still parse and the locales match**

Run: `node -e "for (const l of ['en','el']) { const m = require('./messages/' + l + '.json').WishbookPage; console.log(l, m.myWishesTitle, m.edit, m.editTitle, m.save); }"`
Expected: both lines print four values. If the repo has a locale-parity test (`npx vitest run i18n messages` — run whatever matches), it passes.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-218: Copy for Your messages and the edit sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Your messages list

**Files:**
- Create: `components/wishbook/MyWishesSection.tsx`, `components/wishbook/MyWishesSection.test.tsx`, `components/wishbook/MyWishesSection.stories.tsx`

Compact read-only rows. Each row is one button when editing is allowed; otherwise plain text. No borders: a muted surface groups the rows, like the hosts' list.

- [ ] **Step 1: Write the failing test**

Create `components/wishbook/MyWishesSection.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MyWishesSection } from '@/components/wishbook/MyWishesSection';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const entry: WishbookEntryResponseDto = {
    id: 'w1',
    eventId: 'e1',
    authorMemberId: 'm1',
    guestName: 'Me',
    message: 'Wishing you every happiness',
    createdAt: '2026-11-16T10:00:00Z',
    canDelete: true,
    highlighted: null,
};

const base = { entries: [entry], isLoading: false, hasNextPage: false, isFetchingNextPage: false, onLoadMore: vi.fn(), canEdit: true };

afterEach(cleanup);

describe('MyWishesSection', () => {
    it('lists the guest’s own wishes under its title', () => {
        render(<MyWishesSection {...base} onSelect={vi.fn()} />);

        expect(screen.getByRole('heading', { name: 'myWishesTitle' })).toBeTruthy();
        expect(screen.getByText('Wishing you every happiness')).toBeTruthy();
    });

    it('opens a wish for editing', () => {
        const onSelect = vi.fn();
        render(<MyWishesSection {...base} onSelect={onSelect} />);

        fireEvent.click(screen.getByRole('button', { name: /edit/ }));

        expect(onSelect).toHaveBeenCalledWith(entry);
    });

    it('shows the wishes without an edit button when the event no longer takes changes', () => {
        render(<MyWishesSection {...base} canEdit={false} onSelect={vi.fn()} />);

        expect(screen.getByText('Wishing you every happiness')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /edit/ })).toBeNull();
    });

    it('renders nothing when the guest has no wishes', () => {
        const { container } = render(<MyWishesSection {...base} entries={[]} onSelect={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });

    it('loads more', () => {
        const onLoadMore = vi.fn();
        render(<MyWishesSection {...base} hasNextPage onLoadMore={onLoadMore} onSelect={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'loadMore' }));

        expect(onLoadMore).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/wishbook/MyWishesSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `components/wishbook/MyWishesSection.tsx`:

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { WishbookEntriesSkeleton } from '@/components/wishbook/WishbookSkeletons';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { dateTimeFormat } from '@/lib/format';

type Props = {
    entries: WishbookEntryResponseDto[];
    isLoading: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    // False once the event stops taking writes: the rows stay, read-only.
    canEdit: boolean;
    onSelect: (entry: WishbookEntryResponseDto) => void;
};

// The wishes the signed-in guest wrote themselves. Nobody else's are ever shown to a guest.
export function MyWishesSection({ entries, isLoading, hasNextPage, isFetchingNextPage, onLoadMore, canEdit, onSelect }: Props) {
    const t = useTranslations('WishbookPage');
    if (!isLoading && entries.length === 0) return null;

    return (
        <section className="mt-10" aria-labelledby="my-wishes-title">
            {/* Header */}
            <h2 id="my-wishes-title" className="mb-3 text-sm font-semibold text-ink">
                {t('myWishesTitle')}
            </h2>

            {/* Rows */}
            {isLoading ? (
                <WishbookEntriesSkeleton />
            ) : (
                <ul className="space-y-2">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            {canEdit ? (
                                <button
                                    type="button"
                                    onClick={() => onSelect(entry)}
                                    className="flex min-h-14 w-full items-start gap-3 rounded-2xl bg-surface-muted/70 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                                >
                                    <MyWishRowText entry={entry} />
                                    <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                                    <span className="sr-only">{t('edit')}</span>
                                </button>
                            ) : (
                                <div className="flex w-full items-start gap-3 rounded-2xl bg-surface-muted/70 px-4 py-3">
                                    <MyWishRowText entry={entry} />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Footer */}
            {hasNextPage && (
                <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={isFetchingNextPage}
                    className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                >
                    {isFetchingNextPage ? t('loading') : t('loadMore')}
                </button>
            )}
        </section>
    );
}

function MyWishRowText({ entry }: { entry: WishbookEntryResponseDto }) {
    return (
        <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-ink">{entry.message}</span>
            <time dateTime={entry.createdAt} className="mt-1 block text-xs text-ink-faint">
                {dateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
            </time>
        </span>
    );
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/wishbook/MyWishesSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add stories**

Create `components/wishbook/MyWishesSection.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { MyWishesSection } from '@/components/wishbook/MyWishesSection';

const entries = [
    {
        id: 'wish-1',
        eventId: 'evt-story',
        authorMemberId: 'mem-me',
        guestName: 'Nikos Alexiou',
        message: 'Wishing you a lifetime of love, laughter and long summer evenings together. We cannot wait to celebrate with you both.',
        createdAt: '2026-06-14T18:00:00Z',
        canDelete: true,
        highlighted: null,
    },
    {
        id: 'wish-2',
        eventId: 'evt-story',
        authorMemberId: 'mem-me',
        guestName: 'Nikos Alexiou',
        message: 'Να ζήσετε!',
        createdAt: '2026-06-13T10:00:00Z',
        canDelete: true,
        highlighted: null,
    },
];

const meta = {
    title: 'Wishbook/MyWishesSection',
    component: MyWishesSection,
    args: { entries, isLoading: false, hasNextPage: false, isFetchingNextPage: false, onLoadMore: fn(), canEdit: true, onSelect: fn() },
    decorators: [
        (Story) => (
            <div className="max-w-md p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MyWishesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = {};
export const ReadOnly: Story = { args: { canEdit: false } };
export const WithMore: Story = { args: { hasNextPage: true } };
export const Loading: Story = { args: { isLoading: true, entries: [] } };
```
- [ ] **Step 6: Commit**

```bash
git add components/wishbook/MyWishesSection.tsx components/wishbook/MyWishesSection.test.tsx components/wishbook/MyWishesSection.stories.tsx
git commit -m "KAN-218: Your messages list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Edit sheet

**Files:**
- Create: `components/wishbook/WishEditSheet.tsx`, `components/wishbook/WishEditSheet.test.tsx`, `components/wishbook/WishEditSheet.stories.tsx`

A bottom sheet (`Modal variant="sheet"`) with the textarea, the character counter, Save, and Delete. Delete opens the existing `ConfirmActionModal` (danger tone) with the page's existing delete copy.

- [ ] **Step 1: Write the failing test**

Create `components/wishbook/WishEditSheet.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WishEditSheet } from '@/components/wishbook/WishEditSheet';
import type { WishEditor } from '@/hooks/useWishEditor';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));

function editor(overrides: Partial<WishEditor> = {}): WishEditor {
    return {
        draft: 'Hello',
        changeDraft: vi.fn(),
        canSave: true,
        isSaving: false,
        saveError: null,
        isSheetOpen: true,
        isConfirmingDelete: false,
        isDeleting: false,
        open: vi.fn(),
        close: vi.fn(),
        save: vi.fn(),
        askDelete: vi.fn(),
        cancelDelete: vi.fn(),
        confirmDelete: vi.fn(),
        ...overrides,
    };
}

afterEach(cleanup);

describe('WishEditSheet', () => {
    it('edits the draft and saves', () => {
        const e = editor();
        render(<WishEditSheet editor={e} maxLength={2000} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'messageAriaLabel' }), { target: { value: 'Hello there' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(e.changeDraft).toHaveBeenCalledWith('Hello there');
        expect(e.save).toHaveBeenCalled();
    });

    it('cuts the draft at the limit', () => {
        const e = editor();
        render(<WishEditSheet editor={e} maxLength={5} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'messageAriaLabel' }), { target: { value: 'Hello there' } });

        expect(e.changeDraft).toHaveBeenCalledWith('Hello');
    });

    it('disables Save when there is nothing to save', () => {
        render(<WishEditSheet editor={editor({ canSave: false })} maxLength={2000} />);
        expect((screen.getByRole('button', { name: 'save' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('asks before deleting', () => {
        const e = editor();
        render(<WishEditSheet editor={e} maxLength={2000} />);

        fireEvent.click(screen.getByRole('button', { name: 'delete' }));

        expect(e.askDelete).toHaveBeenCalled();
    });

    it('shows the delete confirmation instead of the sheet', () => {
        const e = editor({ isSheetOpen: false, isConfirmingDelete: true });
        render(<WishEditSheet editor={e} maxLength={2000} />);

        expect(screen.queryByRole('textbox', { name: 'messageAriaLabel' })).toBeNull();
        expect(screen.getByText('deleteTitle')).toBeTruthy();
    });

    it('shows a save error', () => {
        render(<WishEditSheet editor={editor({ saveError: new Error('x') })} maxLength={2000} />);
        expect(screen.getByRole('alert').textContent).toBe('error');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/wishbook/WishEditSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `components/wishbook/WishEditSheet.tsx`:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { WishEditor } from '@/hooks/useWishEditor';

// One of the guest's own wishes, opened from "Your messages": change the text, or delete it.
export function WishEditSheet({ editor, maxLength }: { editor: WishEditor; maxLength: number }) {
    const t = useTranslations('WishbookPage');
    const toErrorMessage = useApiErrorMessage();

    function change(event: ChangeEvent<HTMLTextAreaElement>) {
        editor.changeDraft(event.target.value.slice(0, maxLength));
    }
    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        void editor.save();
    }

    return (
        <>
            <Modal open={editor.isSheetOpen} onClose={editor.close} variant="sheet" size="sm" ariaLabel={t('editTitle')} closeLabel={t('cancel')}>
                <form onSubmit={submit} className="space-y-4 p-5">
                    {/* Header */}
                    <h2 className="text-base font-semibold text-ink">{t('editTitle')}</h2>

                    {/* Message */}
                    <textarea
                        value={editor.draft}
                        onChange={change}
                        maxLength={maxLength}
                        rows={6}
                        disabled={editor.isSaving}
                        aria-label={t('messageAriaLabel')}
                        className="min-h-40 w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 text-base leading-7 text-ink outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                    <p className="text-xs text-ink-faint">{t('charactersLeft', { current: editor.draft.length, max: maxLength })}</p>
                    {editor.saveError ? (
                        <p role="alert" className="text-xs text-rose-600">
                            {toErrorMessage(editor.saveError)}
                        </p>
                    ) : null}

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <button
                            type="button"
                            onClick={editor.askDelete}
                            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                            {t('delete')}
                        </button>
                        <button
                            type="submit"
                            disabled={!editor.canSave}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            {editor.isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                            {t('save')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={editor.isConfirmingDelete}
                onCloseAction={editor.cancelDelete}
                onConfirmAction={editor.confirmDelete}
                title={t('deleteTitle')}
                body={t('deleteBody')}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                isConfirming={editor.isDeleting}
                tone="danger"
            />
        </>
    );
}
```

Look at `components/business/BusinessContactSheet.tsx` for how a `variant="sheet"` Modal pads its content and whether it already renders a title; match it (drop the `<h2>` if the sheet renders `ariaLabel` as a visible heading). If `Modal`'s `onClose` type rejects `() => void` returned from the hook, wrap it: `onClose={() => editor.close()}`.

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/wishbook/WishEditSheet.test.tsx`
Expected: PASS. If `ConfirmActionModal`/`Modal` render nothing in jsdom when closed but the portal needs a root, copy the setup from `components/ui/modal.test.tsx`.

- [ ] **Step 5: Add stories**

Create `components/wishbook/WishEditSheet.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { WishEditSheet } from '@/components/wishbook/WishEditSheet';
import type { WishEditor } from '@/hooks/useWishEditor';

const editor: WishEditor = {
    draft: 'Wishing you a lifetime of love, laughter and long summer evenings together.',
    changeDraft: fn(),
    canSave: true,
    isSaving: false,
    saveError: null,
    isSheetOpen: true,
    isConfirmingDelete: false,
    isDeleting: false,
    open: fn(),
    close: fn(),
    save: fn(),
    askDelete: fn(),
    cancelDelete: fn(),
    confirmDelete: fn(),
};

const meta = {
    title: 'Wishbook/WishEditSheet',
    component: WishEditSheet,
    args: { editor, maxLength: 2000 },
} satisfies Meta<typeof WishEditSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editing: Story = {};
export const Saving: Story = { args: { editor: { ...editor, isSaving: true, canSave: false } } };
export const ConfirmDelete: Story = { args: { editor: { ...editor, isSheetOpen: false, isConfirmingDelete: true } } };
```


- [ ] **Step 6: Commit**

```bash
git add components/wishbook/WishEditSheet.tsx components/wishbook/WishEditSheet.test.tsx components/wishbook/WishEditSheet.stories.tsx
git commit -m "KAN-218: Edit sheet for a guest's own wish

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Wire it into the wishbook page

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.report.test.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.liteHome.test.tsx`
- Create: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.myWishes.test.tsx`

- [ ] **Step 1: Update the existing test mocks**

In both `PageClient.report.test.tsx` and `PageClient.liteHome.test.tsx`, add to the `vi.mock('@/hooks/useWishbook', ...)` factory:

```tsx
    useMyWishes: () => ({ data: undefined, isLoading: false, error: null, hasNextPage: false, isFetchingNextPage: false }),
    useEditWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null, reset: vi.fn() }),
```

- [ ] **Step 2: Write the failing page test**

Create `PageClient.myWishes.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WishbookPage from './PageClient';

let isHost = false;
let eventStatus = 'ACTIVE';
const useWishbookArgs: Array<string | null> = [];
const useMyWishesArgs: Array<string | null> = [];
const mine = [
    {
        id: 'w1',
        eventId: 'event-1',
        authorMemberId: 'm1',
        guestName: 'Me',
        message: 'My own wish',
        createdAt: '2026-11-16T10:00:00Z',
        canDelete: true,
        highlighted: null,
    },
];

vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => () => ({ name: 'wishbook', description: 'd', cardLabel: 'w', Icon: () => null }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/events/event-1', useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { reportTargetTypes: [], modules: [], contentLimits: {} } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => '/upgrade' }));
vi.mock('@/hooks/useWishbook', () => ({
    useWishbook: (eventId: string | null) => {
        useWishbookArgs.push(eventId);
        return { data: undefined, isLoading: false, error: null, hasNextPage: false };
    },
    useMyWishes: (eventId: string | null) => {
        useMyWishesArgs.push(eventId);
        return { data: { pages: [{ content: mine, page: { totalElements: 1 } }] }, isLoading: false, error: null, hasNextPage: false, isFetchingNextPage: false };
    },
    useCreateWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null }),
    useDeleteWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useEditWishbookEntry: () => ({ isPending: false, mutateAsync: vi.fn(), error: null, reset: vi.fn() }),
}));
vi.mock('@/hooks/useWishbookBook', () => ({ useSetWishHighlighted: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('@/components/wishbook/WishbookBookPanel', () => ({ WISHBOOK_BOOK_ID: 'wishbook-book', WishbookBookPanel: () => null }));
vi.mock('@/hooks/useLiteHome', () => ({ useLiteHome: () => ({ isHome: false }) }));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: false, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'event-1', status: eventStatus, deletedAt: null, deletionScheduledFor: null }),
    useActiveMember: () => ({ id: 'm1', displayName: 'Me' }),
    useIsHost: () => isHost,
    useContentAccessMode: () => 'standard',
}));

afterEach(cleanup);
beforeEach(() => {
    isHost = false;
    eventStatus = 'ACTIVE';
    useWishbookArgs.length = 0;
    useMyWishesArgs.length = 0;
});

describe('Wishbook for a guest', () => {
    it('never asks for the hosts’ list', () => {
        render(<WishbookPage />);
        expect(useWishbookArgs.every((arg) => arg === null)).toBe(true);
    });

    it('shows the guest’s own wishes and opens one for editing', () => {
        render(<WishbookPage />);

        expect(screen.getByRole('heading', { name: 'myWishesTitle' })).toBeTruthy();
        // Before: only the composer's textarea. After: the edit sheet's too (same label).
        expect(screen.getAllByRole('textbox', { name: 'messageAriaLabel' })).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: /edit/ }));

        expect(screen.getAllByRole('textbox', { name: 'messageAriaLabel' })).toHaveLength(2);
    });

    it('keeps the wishes read-only once the event stops taking changes', () => {
        eventStatus = 'DRAFT';
        render(<WishbookPage />);

        expect(screen.getByText('My own wish')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /edit/ })).toBeNull();
    });
});

describe('Wishbook for a host', () => {
    it('reads the hosts’ list and not an own list', () => {
        isHost = true;
        render(<WishbookPage />);

        expect(useWishbookArgs).toContain('event-1');
        expect(useMyWishesArgs.every((arg) => arg === null)).toBe(true);
        expect(screen.queryByRole('heading', { name: 'myWishesTitle' })).toBeNull();
    });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`
Expected: the new file FAILS (the page still calls `useWishbook('event-1')` for a guest and renders no own list). The two existing files PASS.

- [ ] **Step 4: Change the page**

In `PageClient.tsx`:

Imports — add:

```tsx
import { MyWishesSection } from '@/components/wishbook/MyWishesSection';
import { WishEditSheet } from '@/components/wishbook/WishEditSheet';
import { useWishEditor } from '@/hooks/useWishEditor';
```

and change the `useWishbook` import to `import { useCreateWishbookEntry, useDeleteWishbookEntry, useMyWishes, useWishbook } from '@/hooks/useWishbook';`.

Replace `const wishbook = useWishbook(event?.id ?? null);` with:

```tsx
    // Only hosts and co-hosts read everyone's wishes; a guest reads their own.
    const wishbook = useWishbook(isHost ? (event?.id ?? null) : null);
    const myWishes = useMyWishes(!isHost && member ? (event?.id ?? null) : null);
    const wishEditor = useWishEditor(eventId);
    const myEntries = myWishes.data?.pages.flatMap((page) => page.content) ?? [];
    const canEditOwn = event?.status === 'ACTIVE' && !isDeleted;
```

Change `showEmptyState` so it only applies to the hosts' list:

```tsx
    const showEmptyState = isHost && !wishbook.isLoading && !wishbook.error && entries.length === 0;
```

Add a handler next to `loadMore`:

```tsx
    function loadMoreMine() {
        void myWishes.fetchNextPage();
    }
```

In the JSX, after the composer block (`) : null}` that closes `canWrite ? ... : null`) and before `{/* Keepsake book */}`, add:

```tsx
            {/* Your messages */}
            {!isHost && (
                <MyWishesSection
                    entries={myEntries}
                    isLoading={myWishes.isLoading}
                    hasNextPage={Boolean(myWishes.hasNextPage)}
                    isFetchingNextPage={myWishes.isFetchingNextPage}
                    onLoadMore={loadMoreMine}
                    canEdit={canEditOwn}
                    onSelect={wishEditor.open}
                />
            )}
```

Replace `<section className="mt-8" hidden={!isHost}>` with `{isHost && (` + `<section className="mt-8">`, and close it with `</section>` + `)}` where the section ends (just before the `{reportEntry && (` line).

Before `</ModulePageShell>`, after the existing `ConfirmActionModal`, add:

```tsx
            {/* Edit own wish */}
            <WishEditSheet editor={wishEditor} maxLength={maxMessageLength} />
```

- [ ] **Step 5: Run the page tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`
Expected: PASS. In `PageClient.report.test.tsx`, `shows no book panel to a guest` still passes (the panel needs `isHost`).

- [ ] **Step 6: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/"
git commit -m "KAN-218: Guests see only their own wishes and can edit them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Server prefetch per role

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { WISHBOOK_PAGE_SIZE, wishbookKeys } from '@/hooks/useWishbook';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import WishbookPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// Prefetches what the client asks for: the hosts' list and count for a host,
// the caller's own wishes for a guest. Guests never get the hosts' list.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const context = await resolveServerEventContext(eventId);
    const queryClient = makeQueryClient();

    if (context?.activeEventId === eventId) {
        const { accessToken } = context;
        try {
            if (!(await serverModuleReadable(eventId, 'wishbook', accessToken))) throw new Error('wishbook unavailable');
            if (context.isHost) {
                const [firstPage, count] = await Promise.all([
                    serverGet<Page<WishbookEntryResponseDto>>(`${endpoints.events.wishbook(eventId)}?page=0&size=${WISHBOOK_PAGE_SIZE}`, accessToken),
                    serverGet<number>(endpoints.events.wishbookCount(eventId), accessToken),
                ]);
                queryClient.setQueryData(wishbookKeys.list(eventId), { pages: [firstPage], pageParams: [0] });
                queryClient.setQueryData(wishbookKeys.count(eventId), count);
            } else {
                const mine = await serverGet<Page<WishbookEntryResponseDto>>(
                    `${endpoints.events.wishbookMine(eventId)}?page=0&size=${WISHBOOK_PAGE_SIZE}`,
                    accessToken,
                );
                queryClient.setQueryData(wishbookKeys.mine(eventId), { pages: [mine], pageParams: [0] });
            }
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <WishbookPage />
        </HydrationBoundary>
    );
}
```

`resolveServerEventContext(eventId)` reports `isHost` for this event (role `HOST`, which co-hosts also have). A guest with no membership in this event gets `activeEventId: null` and no prefetch.

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: no errors.

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/page.tsx"
git commit -m "KAN-218: Prefetch the hosts' list for hosts and own wishes for guests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Public demo mock

**Files:**
- Modify: `lib/demo/mockHandlers.ts`

The public demo runs on a local mock backend. Without these, a demo visitor who is a guest would get network errors.

- [ ] **Step 1: Add the handlers**

In the `// --- Wishbook ---` block, before `...buildPageHandlers(db, 'wishbook', ...)`:

```ts
        // A visitor's own wishes are the ones written in this browser (the create handler's ids).
        http.get(`${API_BASE_URL}/api/events/:eventId/wishbook/mine`, ({ request }) => {
            const page = Number(new URL(request.url).searchParams.get('page') ?? '0');
            const items = db
                .list('wishbook')
                .filter((wish) => wish.id.startsWith('demo-wishbook'))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            return HttpResponse.json(toPage(items, page, 20));
        }),
        http.put(`${API_BASE_URL}/api/wishbook/:id`, async ({ params, request }) => {
            const body = (await request.json()) as { message?: string };
            const updated = db.update('wishbook', params.id as string, (wish) => ({ ...wish, message: String(body.message ?? wish.message) }));
            return updated ? HttpResponse.json(updated) : new HttpResponse(null, { status: 404 });
        }),
```

`newId('demo-wishbook')` returns `demo-wishbook-<time>-<n>`, so the prefix filter matches every wish created in the browser and none from the snapshot.

- [ ] **Step 2: Cover them in the network guard test**

In `lib/demo/demoNetworkGuard.test.ts`, add `'/api/events/evt-demo/wishbook/mine?page=0',` to the `reads` list in `serves reads from the local store`, and in `keeps writes local and visible to later reads`, after the wishbook POST, add:

```ts
        const wishes = (await (await send('GET', '/api/events/evt-demo/wishbook/mine?page=0')).json()) as { content: { id: string }[] };
        await send('PUT', `/api/wishbook/${wishes.content[0].id}`, { message: 'Edited' });
```

The test's final `expect(left).toEqual([])` then also proves neither call leaves the browser.

- [ ] **Step 3: Run the demo tests**

Run: `npx vitest run lib/demo`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/demo/
git commit -m "KAN-218: Demo mock for own wishes and editing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Checks and visual confirmation

- [ ] **Step 1: Full automated checks**

Run each and expect it clean:

```bash
npx tsc --noEmit
```

```bash
npx eslint .
```

```bash
npx vitest run
```

Fix every lint error. If an unrelated test fails, check it fails on `origin/staging` too and say so in the PR (memory: save-my-date vitest timeouts are known).

- [ ] **Step 2: Look at it**

Needs the KAN-217 backend running locally on :8080 (see memory notes: the local backend's CORS allows only :3000; a signed-in check needs the worktree dev server on :3000, and the user's local test login). Never start the dev server with `preview_start {name}` here; open `http://localhost:3000/` by URL only.

As a guest (mobile width 375, then desktop): open an event's wishbook, write a message, see it under "Your messages" after the sent confirmation, tap it, edit and save, then delete it through the confirmation. As a host: the list, stars and book panel look the same as before, with no "Your messages". In dev tools, confirm the guest page makes no request to `/wishbook?page=` or `/wishbook/count`.

- [ ] **Step 3: SEO check**

No new route. Confirm against `docs/seo-guidelines.md` that nothing on this private page changes; note "no SEO impact" in the PR.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin claude/kan-218-private-wishbook
```

PR into `staging`, title `KAN-218: Guests stop fetching all wishes; Your messages list with edit and delete`. Name only KAN-218 in the body. State that it needs the KAN-217 backend PR on staging first. The visual check will run on the new stories; send the owner the report link if it is red and wait.
