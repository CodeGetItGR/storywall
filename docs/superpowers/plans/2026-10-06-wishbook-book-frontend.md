# Wishbook Book (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wishbook's "Download as PDF" button with the keepsake book flow. Hosts can create the book, watch it build, download it, star wishes for it, edit its text, and admins can set role section titles.

**Architecture:** React Query hooks over the new backend endpoints. `GET …/wishbook/book` is polled every 3 s while a build is `QUEUED`/`RUNNING`. A new `WishbookBookPanel` replaces the export button, and a `WishbookBookTextsModal` edits the four book texts. Stars are an optimistic toggle on each entry.

**Tech Stack:** Next.js 16, React 19, TanStack Query 5, next-intl, vitest + Testing Library.

**Backend contract:** `event_social_media/docs/fe-guides/wishbook-book-fe-integration.md` (written by BE plan Task 18) and the spec `event_social_media/docs/superpowers/specs/2026-10-06-wishbook-book-design.md`. **Ship together with the BE**, since the old `/wishbook/export` endpoint is removed there.

---

## Ground rules

- Branch from local `staging` (`git switch -c feature/wishbook-book staging`). Worktrees default to `main`, which is far behind.
- Run tests with `npx vitest run <path>`. Before the final commit, run `npx tsc --noEmit` and `npm run lint`.
- Every user-facing string goes in `messages/en.json` and `messages/el.json`.

## File map

- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/notifications.ts`, `lib/notifications.test.ts`
- Modify: `hooks/useWishbook.ts`. Create: `hooks/useWishbookBook.ts`, `hooks/useWishbookBook.test.tsx`
- Create: `components/wishbook/WishbookBookPanel.tsx`, `components/wishbook/WishbookBookPanel.test.tsx`, `components/wishbook/WishbookBookTextsModal.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx`, `PageClient.report.test.tsx`
- Modify: `lib/memberRoles.ts`, `lib/memberRoles.test.ts`, `components/admin/memberRoles/MemberRoleDrawer.tsx`, `hooks/useMemberRoleDrawer.ts` (no code change expected; the draft spreads by `name`)
- Modify: `messages/en.json`, `messages/el.json`

---

### Task 1: Contract: types, endpoints, error codes, CTA route

- [ ] **Step 1: Failing test for the CTA route**

In `lib/notifications.test.ts`, inside `describe('notificationCtaRoute')`:

```ts
    it('sends the book-ready CTA to the wishbook', () => {
        expect(notificationCtaRoute(notification({ ctaTarget: 'EVENT_WISHBOOK', ctaParams: { eventId: 'event-1' } }))).toBe(
            '/events/event-1/tools/wishbook',
        );
    });
```

Run: `npx vitest run lib/notifications.test.ts`. Expected: FAIL (a type error on `'EVENT_WISHBOOK'`, or a null result).

- [ ] **Step 2: Types**

In `lib/api/types.ts`:

```ts
export type NotificationCtaTarget = 'EVENT_PLAN_SETTINGS' | 'EVENT_GALLERY' | 'EVENT_GUESTS' | 'EVENT_COVERAGE_EXTEND' | 'EVENT_WISHBOOK';
```

Add to `WishbookEntryResponseDto`:

```ts
    // Starred for the book (2026-10-06). Hosts get true/false; everyone else gets null.
    highlighted: boolean | null;
```

After `WishbookEntryResponseDto`:

```ts
// GET|POST /api/events/{eventId}/wishbook/book (wishbook-book-fe-integration.md).
// downloadUrl only when READY; it's presigned and expires, so fetch GET again right before downloading.
export type WishbookBookStatus = 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED';

export interface WishbookBookDto {
    status: WishbookBookStatus;
    requestedAt: string;
    finishedAt: string | null;
    // pageCount, entryCount, byteSize and downloadUrl are non-null only when READY; a rebuild hides the old figures.
    pageCount: number | null;
    entryCount: number | null;
    byteSize: number | null;
    // RENDERER_* | DB_UNAVAILABLE | STORAGE_FAILED | PROCESSING_STALLED | BUILD_ERROR | RENDERER_NOT_CONFIGURED:
    // all mean "try again"; show one generic line, never one per code.
    failureCode: string | null;
    downloadUrl: string | null;
}

// GET|PUT /api/events/{eventId}/wishbook/book-texts. null = the default (shown as placeholder).
export interface WishbookBookTextsRequestDto {
    subtitle: string | null;
    dedication: string | null;
    closingTitle: string | null;
    closingBody: string | null;
}

export interface WishbookBookTextsDto extends WishbookBookTextsRequestDto {
    defaults: { subtitle: string; dedication: string; closingTitle: string; closingBody: string };
}

export const WISHBOOK_BOOK_TEXT_LIMITS = { subtitle: 80, dedication: 400, closingTitle: 80, closingBody: 300 } as const;
// dedication and closingBody keep line breaks (BE caps them at 6 lines, blank separator lines included); the others are single-line.
export const WISHBOOK_BOOK_TEXT_MAX_LINES = 6;
```

On `MemberRoleCatalogDto` add `sectionLabel: { en: string; el: string } | null;`. On `MemberRoleCatalogRequestDto` add `sectionLabel?: { en: string; el: string };`. On `MemberRoleCatalogPatchDto` add `sectionLabel?: { en: string; el: string };` and `clearSectionLabel?: boolean;`.

- [ ] **Step 3: Endpoints, errors, route**

`lib/api/endpoints.ts`, under `events`: replace `wishbookExport` with

```ts
        wishbookBook: (eventId: string) => `/api/events/${eventId}/wishbook/book`,
        wishbookBookTexts: (eventId: string) => `/api/events/${eventId}/wishbook/book-texts`,
```

Under `wishbook`:

```ts
        highlight: (id: string) => `/api/wishbook/${id}/highlight`,
```

`lib/api/errors.ts`, after `THEME_FONT_CONVERSION_UNAVAILABLE: 5147,`:

```ts
    WISHBOOK_EMPTY: 5148,
    WISHBOOK_BOOK_RENDERER_UNAVAILABLE: 5149,
```

`lib/notifications.ts`, in `CTA_ROUTES`:

```ts
    EVENT_WISHBOOK: (p) => `/events/${p.eventId}/tools/wishbook`,
```

- [ ] **Step 4:** `npx vitest run lib/notifications.test.ts`. Expected: PASS. `npx tsc --noEmit` should flag only the remaining `wishbookExport` uses, which Task 2 removes.

- [ ] **Step 5: Commit**

```bash
git add lib && git commit -m "feat(wishbook): book API types, endpoints, error codes and CTA route"
```

---

### Task 2: Hooks

**Files:** Create `hooks/useWishbookBook.ts` and `hooks/useWishbookBook.test.tsx`; modify `hooks/useWishbook.ts`.

- [ ] **Step 1: Failing tests**

`hooks/useWishbookBook.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookRefetchInterval, useRequestWishbookBook, useSetWishHighlighted, useWishbookBook, wishbookBookKeys } from '@/hooks/useWishbookBook';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        put: (...a: unknown[]) => apiPut(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useWishbookBook', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiGet.mockReset();
        apiPost.mockReset();
        apiPut.mockReset();
        apiDel.mockReset();
    });

    it('reads a never-built book (404) as null', async () => {
        apiGet.mockRejectedValue(new ApiError(404, { errorCode: 2001 }));
        const { result } = renderHook(() => useWishbookBook('e1', true), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('polls only while a build is waiting or running', () => {
        expect(bookRefetchInterval({ status: 'QUEUED' } as never)).toBe(3000);
        expect(bookRefetchInterval({ status: 'RUNNING' } as never)).toBe(3000);
        expect(bookRefetchInterval({ status: 'READY' } as never)).toBe(false);
        expect(bookRefetchInterval(null)).toBe(false);
    });

    it('a request writes the returned build into the cache', async () => {
        apiPost.mockResolvedValue({ status: 'QUEUED', requestedAt: 'x' });
        const { result } = renderHook(() => useRequestWishbookBook('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync());
        expect(apiPost).toHaveBeenCalledWith(endpoints.events.wishbookBook('e1'));
        expect(client.getQueryData(wishbookBookKeys.book('e1'))).toEqual({ status: 'QUEUED', requestedAt: 'x' });
    });

    it('starring PUTs, unstarring DELETEs', async () => {
        apiPut.mockResolvedValue(undefined);
        apiDel.mockResolvedValue(undefined);
        const { result } = renderHook(() => useSetWishHighlighted('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ entryId: 'w1', highlighted: true }));
        await act(() => result.current.mutateAsync({ entryId: 'w1', highlighted: false }));
        expect(apiPut).toHaveBeenCalledWith(endpoints.wishbook.highlight('w1'));
        expect(apiDel).toHaveBeenCalledWith(endpoints.wishbook.highlight('w1'));
    });
});
```

Run: `npx vitest run hooks/useWishbookBook.test.tsx`. Expected: FAIL (module not found).

- [ ] **Step 2: Implement `hooks/useWishbookBook.ts`**

```ts
'use client';

import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { wishbookKeys } from '@/hooks/useWishbook';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isNotFoundError } from '@/lib/api/errors';
import type { Page } from '@/lib/api/pagination';
import type { WishbookBookDto, WishbookBookTextsDto, WishbookBookTextsRequestDto, WishbookEntryResponseDto } from '@/lib/api/types';

const POLL_MS = 3000;

export const wishbookBookKeys = {
    book: (eventId: string) => ['events', eventId, 'wishbook-book'] as const,
    texts: (eventId: string) => ['events', eventId, 'wishbook-book', 'texts'] as const,
};

export function bookRefetchInterval(book: WishbookBookDto | null | undefined): number | false {
    return book && (book.status === 'QUEUED' || book.status === 'RUNNING') ? POLL_MS : false;
}

// Host-only. null = never built (the backend answers 404).
export function useWishbookBook(eventId: string, isHost: boolean) {
    const { isAuthenticated } = useAuth();
    const readable = useModuleReadable(eventId, 'wishbook');
    return useQuery({
        queryKey: wishbookBookKeys.book(eventId),
        queryFn: async () => {
            try {
                return await api.get<WishbookBookDto>(endpoints.events.wishbookBook(eventId));
            } catch (error) {
                if (isNotFoundError(error)) return null;
                throw error;
            }
        },
        enabled: Boolean(eventId) && isAuthenticated && readable && isHost,
        refetchInterval: (query) => bookRefetchInterval(query.state.data),
    });
}

export function useRequestWishbookBook(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<WishbookBookDto>(endpoints.events.wishbookBook(eventId)),
        onSuccess: (book) => queryClient.setQueryData(wishbookBookKeys.book(eventId), book),
    });
}

// The presigned URL expires: ask for a fresh one at click time.
export function useFreshBookDownloadUrl(eventId: string) {
    const queryClient = useQueryClient();
    return async () => {
        const book = await api.get<WishbookBookDto>(endpoints.events.wishbookBook(eventId));
        queryClient.setQueryData(wishbookBookKeys.book(eventId), book);
        return book.downloadUrl;
    };
}

export function useWishbookBookTexts(eventId: string, enabled: boolean) {
    return useQuery({
        queryKey: wishbookBookKeys.texts(eventId),
        queryFn: () => api.get<WishbookBookTextsDto>(endpoints.events.wishbookBookTexts(eventId)),
        enabled: Boolean(eventId) && enabled,
    });
}

export function useSaveWishbookBookTexts(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: WishbookBookTextsRequestDto) => api.put<WishbookBookTextsDto>(endpoints.events.wishbookBookTexts(eventId), input),
        onSuccess: (texts) => queryClient.setQueryData(wishbookBookKeys.texts(eventId), texts),
    });
}

type EntryPages = InfiniteData<Page<WishbookEntryResponseDto>>;

export function useSetWishHighlighted(eventId: string) {
    const queryClient = useQueryClient();
    const key = wishbookKeys.list(eventId);
    return useMutation({
        mutationFn: ({ entryId, highlighted }: { entryId: string; highlighted: boolean }) =>
            highlighted ? api.put<void>(endpoints.wishbook.highlight(entryId)) : api.del<void>(endpoints.wishbook.highlight(entryId)),
        onMutate: async ({ entryId, highlighted }) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<EntryPages>(key);
            queryClient.setQueryData<EntryPages>(key, (data) =>
                data
                    ? {
                          ...data,
                          pages: data.pages.map((page) => ({
                              ...page,
                              content: page.content.map((entry) => (entry.id === entryId ? { ...entry, highlighted } : entry)),
                          })),
                      }
                    : data,
            );
            return { previous };
        },
        onError: (_error, _input, context) => {
            if (context?.previous) queryClient.setQueryData(key, context.previous);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
    });
}
```

If `api.put` lacks a no-body overload, pass `undefined` as the second argument and update the test expectation to `(endpoints.wishbook.highlight('w1'), undefined)`.

- [ ] **Step 3: Remove the export hook**

In `hooks/useWishbook.ts`, delete `useWishbookExportDownload`, then drop the imports it leaves unused (`useCallback`, `useState`, `useApiErrorMessage`, `downloadBlob`).

- [ ] **Step 4:** `npx vitest run hooks/useWishbookBook.test.tsx`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks && git commit -m "feat(wishbook): hooks for the book build, its text and wish stars"
```

---

### Task 3: Messages

- [ ] **Step 1:** In `messages/en.json` → `WishbookPage`, remove `exportPdf` and `exportFailed`, then add:

```json
        "book": {
            "title": "Your keepsake book",
            "body": "Every wish, laid out as a printable-quality PDF book. Star the wishes you love most and they get a page of their own.",
            "create": "Create the book",
            "building": "Building your book… you can leave this page; we'll notify you.",
            "ready": "Ready · {pages, plural, one {# page} other {# pages}} · {wishes, plural, one {# wish} other {# wishes}}",
            "download": "Download",
            "rebuild": "Rebuild with the latest wishes",
            "failed": "The book couldn't be built.",
            "retry": "Try again",
            "editTexts": "Edit the book's text",
            "downloadFailed": "Couldn't get the download link. Please try again."
        },
        "bookTexts": {
            "title": "The book's text",
            "hint": "Leave a field empty to use the text shown.",
            "subtitle": "Subtitle (cover)",
            "dedication": "Dedication",
            "closingTitle": "Closing title",
            "closingBody": "Closing message",
            "counter": "{current} / {max}",
            "save": "Save",
            "cancel": "Cancel"
        },
        "star": "Star for the book",
        "unstar": "Remove star",
```

In `messages/el.json` → `WishbookPage`, remove the same two keys and add:

```json
        "book": {
            "title": "Το βιβλίο ευχών σας",
            "body": "Όλες οι ευχές, σε ένα βιβλίο PDF. Βάλτε αστέρι στις ευχές που αγαπάτε περισσότερο και θα έχουν τη δική τους σελίδα.",
            "create": "Δημιουργία βιβλίου",
            "building": "Το βιβλίο ετοιμάζεται… μπορείτε να φύγετε από τη σελίδα, θα σας ειδοποιήσουμε.",
            "ready": "Έτοιμο · {pages, plural, one {# σελίδα} other {# σελίδες}} · {wishes, plural, one {# ευχή} other {# ευχές}}",
            "download": "Λήψη",
            "rebuild": "Νέα έκδοση με τις τελευταίες ευχές",
            "failed": "Δεν ήταν δυνατή η δημιουργία του βιβλίου.",
            "retry": "Δοκιμάστε ξανά",
            "editTexts": "Επεξεργασία κειμένων βιβλίου",
            "downloadFailed": "Δεν ήταν δυνατή η λήψη. Δοκιμάστε ξανά."
        },
        "bookTexts": {
            "title": "Τα κείμενα του βιβλίου",
            "hint": "Αφήστε ένα πεδίο κενό για να χρησιμοποιηθεί το κείμενο που φαίνεται.",
            "subtitle": "Υπότιτλος (εξώφυλλο)",
            "dedication": "Αφιέρωση",
            "closingTitle": "Τίτλος κλεισίματος",
            "closingBody": "Μήνυμα κλεισίματος",
            "counter": "{current} / {max}",
            "save": "Αποθήκευση",
            "cancel": "Ακύρωση"
        },
        "star": "Αστέρι για το βιβλίο",
        "unstar": "Αφαίρεση αστεριού",
```

In `AdminPage.memberRoles.drawer` (en), after `labelInvalid`:

```json
                "sectionEn": "Book section title (English)",
                "sectionEl": "Book section title (Greek)",
                "sectionHint": "Plural title for this role's section in the wishbook book, e.g. \"Our friends\". Roles with the same title share a section. Leave both empty to use the label.",
                "sectionInvalid": "Fill in both titles (1 to 40 characters) or leave both empty.",
```

(el):

```json
                "sectionEn": "Τίτλος ενότητας βιβλίου (Αγγλικά)",
                "sectionEl": "Τίτλος ενότητας βιβλίου (Ελληνικά)",
                "sectionHint": "Τίτλος στον πληθυντικό για την ενότητα του ρόλου στο βιβλίο ευχών, π.χ. «Οι φίλοι μας». Ρόλοι με τον ίδιο τίτλο μοιράζονται ενότητα. Αφήστε και τα δύο κενά για να χρησιμοποιηθεί η ετικέτα.",
                "sectionInvalid": "Συμπληρώστε και τους δύο τίτλους (1 έως 40 χαρακτήρες) ή αφήστε και τους δύο κενούς.",
```

- [ ] **Step 2:** Validate both files with `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/el.json','utf8'))"`. If there is a message-key parity test (`ls **/*messages*.test.ts`), run it.

- [ ] **Step 3: Commit:** `git add messages && git commit -m "feat(wishbook): copy for the keepsake book"`

---

### Task 4: `WishbookBookPanel` + texts modal

**Files:** Create `components/wishbook/WishbookBookPanel.tsx`, `components/wishbook/WishbookBookTextsModal.tsx`, `components/wishbook/WishbookBookPanel.test.tsx`.

- [ ] **Step 1: Failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WishbookBookDto } from '@/lib/api/types';

import { WishbookBookPanel } from './WishbookBookPanel';

let book: WishbookBookDto | null = null;
const request = vi.fn();
const freshUrl = vi.fn();
const downloadUrl = vi.fn();

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/lib/download', () => ({ downloadUrl: (...a: unknown[]) => downloadUrl(...a) }));
vi.mock('./WishbookBookTextsModal', () => ({ WishbookBookTextsModal: () => null }));
vi.mock('@/hooks/useWishbookBook', () => ({
    useWishbookBook: () => ({ data: book, isLoading: false }),
    useRequestWishbookBook: () => ({ mutate: request, isPending: false, error: null }),
    useFreshBookDownloadUrl: () => freshUrl,
}));

afterEach(cleanup);
beforeEach(() => {
    request.mockReset();
    freshUrl.mockReset();
    downloadUrl.mockReset();
});

const base = { requestedAt: '2026-10-06T10:00:00Z', finishedAt: null, pageCount: null, entryCount: null, byteSize: null, failureCode: null, downloadUrl: null };

describe('WishbookBookPanel', () => {
    it('offers to create a book that was never built', () => {
        book = null;
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.create'));
        expect(request).toHaveBeenCalled();
    });

    it('shows progress while building, with no buttons', () => {
        book = { ...base, status: 'RUNNING' };
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('book.building')).toBeTruthy();
        expect(screen.queryByText('book.create')).toBeNull();
        expect(screen.queryByText('book.download')).toBeNull();
    });

    it('downloads with a freshly signed URL', async () => {
        book = { ...base, status: 'READY', pageCount: 12, entryCount: 30, downloadUrl: 'https://old' };
        freshUrl.mockResolvedValue('https://fresh');
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        await vi.waitFor(() => expect(downloadUrl).toHaveBeenCalledWith('https://fresh', ''));
    });

    it('offers a retry after a failure', () => {
        book = { ...base, status: 'FAILED', failureCode: 'RENDERER_TIMEOUT' };
        render(<WishbookBookPanel eventId="e1" canEditTexts={false} />);
        fireEvent.click(screen.getByText('book.retry'));
        expect(request).toHaveBeenCalled();
        expect(screen.queryByText('book.editTexts')).toBeNull();
    });
});
```

Run: `npx vitest run components/wishbook/WishbookBookPanel.test.tsx`. Expected: FAIL (module not found).

- [ ] **Step 2: `WishbookBookPanel.tsx`**

```tsx
'use client';

import { BookOpen, Download, Loader2, PenLine, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useFreshBookDownloadUrl, useRequestWishbookBook, useWishbookBook } from '@/hooks/useWishbookBook';
import { downloadUrl } from '@/lib/download';

import { WishbookBookTextsModal } from './WishbookBookTextsModal';

const secondaryButton =
    'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60';
const primaryButton =
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white bg-gradient-brand disabled:cursor-not-allowed disabled:opacity-60';

// Hosts only. canEditTexts is false on a deleted event: the book can still be built, but its text is frozen.
export function WishbookBookPanel({ eventId, canEditTexts }: { eventId: string; canEditTexts: boolean }) {
    const t = useTranslations('WishbookPage');
    const toErrorMessage = useApiErrorMessage();
    const book = useWishbookBook(eventId, true);
    const request = useRequestWishbookBook(eventId);
    const freshUrl = useFreshBookDownloadUrl(eventId);
    const [textsOpen, setTextsOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const status = book.data?.status ?? null;
    const building = status === 'QUEUED' || status === 'RUNNING' || request.isPending;

    function create() {
        request.mutate();
    }
    async function download() {
        setDownloadError(null);
        setDownloading(true);
        try {
            const url = await freshUrl();
            if (url) downloadUrl(url, '');
            else setDownloadError(t('book.downloadFailed'));
        } catch {
            setDownloadError(t('book.downloadFailed'));
        } finally {
            setDownloading(false);
        }
    }
    function openTexts() {
        setTextsOpen(true);
    }
    function closeTexts() {
        setTextsOpen(false);
    }

    if (book.isLoading) return null;

    return (
        <section className="mt-8 rounded-[1.5rem] bg-amber-50/70 px-5 py-5">
            <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{t('book.title')}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{t('book.body')}</p>

                    {/* Status */}
                    {building ? (
                        <p className="mt-3 inline-flex items-center gap-2 text-xs text-ink-muted">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            {t('book.building')}
                        </p>
                    ) : status === 'READY' && book.data ? (
                        <p className="mt-3 text-xs text-ink-muted">
                            {t('book.ready', { pages: book.data.pageCount ?? 0, wishes: book.data.entryCount ?? 0 })}
                        </p>
                    ) : status === 'FAILED' ? (
                        <p className="mt-3 text-xs text-rose-600">{t('book.failed')}</p>
                    ) : null}

                    {/* Actions */}
                    {!building && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {status === 'READY' ? (
                                <>
                                    <button type="button" onClick={download} disabled={downloading} className={primaryButton}>
                                        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        {t('book.download')}
                                    </button>
                                    <button type="button" onClick={create} className={secondaryButton}>
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('book.rebuild')}
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={create} className={primaryButton}>
                                    {status === 'FAILED' ? t('book.retry') : t('book.create')}
                                </button>
                            )}
                            {canEditTexts && (
                                <button type="button" onClick={openTexts} className={secondaryButton}>
                                    <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                                    {t('book.editTexts')}
                                </button>
                            )}
                        </div>
                    )}
                    {request.error && <p className="mt-2 text-xs text-rose-600">{toErrorMessage(request.error)}</p>}
                    {downloadError && <p className="mt-2 text-xs text-rose-600">{downloadError}</p>}
                </div>
            </div>
            {canEditTexts && textsOpen && <WishbookBookTextsModal eventId={eventId} onCloseAction={closeTexts} />}
        </section>
    );
}
```

`downloadUrl(url, '')` makes the browser use the `Content-Disposition` filename (the event title) that the BE set at upload. Check `lib/download.ts`: an empty `link.download` keeps the server's name in Chrome and Firefox.

- [ ] **Step 3: `WishbookBookTextsModal.tsx`**

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useSaveWishbookBookTexts, useWishbookBookTexts } from '@/hooks/useWishbookBook';
import {
    WISHBOOK_BOOK_TEXT_LIMITS,
    WISHBOOK_BOOK_TEXT_MAX_LINES,
    type WishbookBookTextsDto,
    type WishbookBookTextsRequestDto,
} from '@/lib/api/types';

type Field = keyof WishbookBookTextsRequestDto;
const FIELDS: { name: Field; multiline: boolean }[] = [
    { name: 'subtitle', multiline: false },
    { name: 'dedication', multiline: true },
    { name: 'closingTitle', multiline: false },
    { name: 'closingBody', multiline: true },
];
const inputClass =
    'w-full rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20';

function toDraft(texts: WishbookBookTextsDto): Record<Field, string> {
    return {
        subtitle: texts.subtitle ?? '',
        dedication: texts.dedication ?? '',
        closingTitle: texts.closingTitle ?? '',
        closingBody: texts.closingBody ?? '',
    };
}

export function WishbookBookTextsModal({ eventId, onCloseAction }: { eventId: string; onCloseAction: () => void }) {
    const t = useTranslations('WishbookPage.bookTexts');
    const texts = useWishbookBookTexts(eventId, true);
    return (
        <Modal open onClose={onCloseAction} size="sm" ariaLabel={t('title')}>
            {texts.data ? (
                <TextsForm eventId={eventId} texts={texts.data} onCloseAction={onCloseAction} />
            ) : (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
                </div>
            )}
        </Modal>
    );
}

function TextsForm({ eventId, texts, onCloseAction }: { eventId: string; texts: WishbookBookTextsDto; onCloseAction: () => void }) {
    const t = useTranslations('WishbookPage.bookTexts');
    const toErrorMessage = useApiErrorMessage();
    const save = useSaveWishbookBookTexts(eventId);
    const [draft, setDraft] = useState(() => toDraft(texts));

    function change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const name = event.currentTarget.name as Field;
        let value = event.currentTarget.value.slice(0, WISHBOOK_BOOK_TEXT_LIMITS[name]);
        // Line breaks are kept by the BE in the multiline fields, up to 6 lines; drop any extra lines here.
        if (FIELDS.find((f) => f.name === name)?.multiline) {
            value = value.split('\n').slice(0, WISHBOOK_BOOK_TEXT_MAX_LINES).join('\n');
        }
        setDraft((current) => ({ ...current, [name]: value }));
    }
    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input: WishbookBookTextsRequestDto = {
            subtitle: draft.subtitle.trim() || null,
            dedication: draft.dedication.trim() || null,
            closingTitle: draft.closingTitle.trim() || null,
            closingBody: draft.closingBody.trim() || null,
        };
        await save.mutateAsync(input);
        onCloseAction();
    }

    return (
        <form onSubmit={submit} className="space-y-4 p-6">
            <div>
                <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                <p className="mt-1 text-xs text-ink-muted">{t('hint')}</p>
            </div>
            {FIELDS.map(({ name, multiline }) => (
                <label key={name} className="block space-y-1.5">
                    <span className="flex justify-between text-xs font-semibold text-ink">
                        {t(name)}
                        <span className="font-normal text-ink-faint">
                            {t('counter', { current: draft[name].length, max: WISHBOOK_BOOK_TEXT_LIMITS[name] })}
                        </span>
                    </span>
                    {multiline ? (
                        <textarea
                            name={name}
                            rows={4}
                            value={draft[name]}
                            onChange={change}
                            placeholder={texts.defaults[name]}
                            className={`${inputClass} resize-none`}
                        />
                    ) : (
                        <input name={name} value={draft[name]} onChange={change} placeholder={texts.defaults[name]} className={inputClass} />
                    )}
                </label>
            ))}
            {save.error && <p className="text-xs text-rose-600">{toErrorMessage(save.error)}</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCloseAction} className="h-10 rounded-full px-4 text-sm font-semibold text-ink-muted">
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={save.isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-60"
                >
                    {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('save')}
                </button>
            </div>
        </form>
    );
}
```

The FE counter measures raw length while the BE measures after collapsing whitespace, so the BE is never stricter than what the user sees. The BE's 6-line cap counts blank separator lines too, so the FE's split on `\n` matches it. A BE refusal comes back as 400 `3001` with a `detail` naming the field; show it via `toErrorMessage`.

**Contract changes since this plan was written** (BE built 2026-10-06; see `wishbook-book-fe-integration.md`):
- The highlight PUT/DELETE has its own rate-limit bucket of 120 per 60 s, so fast starring is fine. Book-texts PUT allows 30 per 60 s; the build POST allows 10 per 3600 s per user.
- A never-built `GET …/book` returns 404 `2001` (the hook test above already uses 2001).
- In the book itself, starred wishes appear last in their section, sized by length. No FE impact.

- [ ] **Step 4:** `npx vitest run components/wishbook/WishbookBookPanel.test.tsx`. Expected: PASS.

- [ ] **Step 5: Commit:** `git add components/wishbook && git commit -m "feat(wishbook): book panel (create, progress, download, retry) and text editor"`

---

### Task 5: Wishbook page: panel + stars

**Files:** Modify `PageClient.tsx` and `PageClient.report.test.tsx` in `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/`.

- [ ] **Step 1: Failing test**

In `PageClient.report.test.tsx`:
- Replace `useWishbookExportDownload: …` in the `@/hooks/useWishbook` mock with nothing; delete that line.
- Add the mocks:

```tsx
const setHighlighted = vi.fn();
vi.mock('@/hooks/useWishbookBook', () => ({ useSetWishHighlighted: () => ({ mutate: setHighlighted, isPending: false }) }));
vi.mock('@/components/wishbook/WishbookBookPanel', () => ({ WishbookBookPanel: () => <div data-testid="book-panel" /> }));
```

- Give mocked entries `highlighted: false` in the `content` map.
- Add tests:

```tsx
describe('WishbookPage book', () => {
    beforeEach(() => {
        entries = [{ id: 'w1', authorMemberId: 'other', canDelete: true }];
        setHighlighted.mockReset();
    });

    it('shows the book panel to hosts once there are wishes', () => {
        render(<WishbookPage />);
        expect(screen.getByTestId('book-panel')).toBeTruthy();
    });

    it('stars a wish', () => {
        render(<WishbookPage />);
        fireEvent.click(screen.getByLabelText('star'));
        expect(setHighlighted).toHaveBeenCalledWith({ entryId: 'w1', highlighted: true });
    });

    it('hides stars on a deleted event but keeps the panel', () => {
        deletedAt = '2026-10-01T00:00:00Z';
        render(<WishbookPage />);
        expect(screen.queryByLabelText('star')).toBeNull();
        expect(screen.getByTestId('book-panel')).toBeTruthy();
        deletedAt = null;
    });
});
```

`isEventDeleted` reads `deletedAt` (check `lib/eventLifecycle.ts`). If it reads a different field, set that field in the mocked event instead.

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`. Expected: FAIL.

- [ ] **Step 2: Edit `PageClient.tsx`**

- Imports: drop `Download` and `useWishbookExportDownload`; add `Star` from lucide-react, `WishbookBookPanel` from `@/components/wishbook/WishbookBookPanel`, and `useSetWishHighlighted` from `@/hooks/useWishbookBook`.
- Replace `const exportPdf = useWishbookExportDownload(eventId, t('exportFailed'));` with `const setHighlighted = useSetWishHighlighted(eventId);`.
- Replace `handleExportPdf` with:

```tsx
    function toggleStar(event_: React.MouseEvent<HTMLButtonElement>) {
        const entry = entries.find((item) => item.id === event_.currentTarget.dataset.entryId);
        if (entry) setHighlighted.mutate({ entryId: entry.id, highlighted: !entry.highlighted });
    }
```

- In the entries header, remove the export `<button>` and the `exportPdf.error` line. Keep the count `<p>`.
- Right before `{/* Entries */}`, add:

```tsx
            {/* Keepsake book */}
            {isHost && total > 0 && <WishbookBookPanel eventId={eventId} canEditTexts={!isDeleted} />}
```

- In each entry's action cluster, before the report button:

```tsx
                                    {entry.highlighted !== null && !isDeleted && (
                                        <button
                                            type="button"
                                            data-entry-id={entry.id}
                                            onClick={toggleStar}
                                            aria-label={entry.highlighted ? t('unstar') : t('star')}
                                            aria-pressed={Boolean(entry.highlighted)}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-amber-50 hover:text-amber-600"
                                        >
                                            <Star className={entry.highlighted ? 'h-4 w-4 fill-amber-400 text-amber-500' : 'h-4 w-4'} />
                                        </button>
                                    )}
```

- [ ] **Step 3:** Run the page tests. Expected: PASS. `npx tsc --noEmit` should now be clean.

- [ ] **Step 4: Commit:** `git add app && git commit -m "feat(wishbook): book panel on the wishbook page; hosts star wishes"`

---

### Task 6: Admin: role section titles

**Files:** `lib/memberRoles.ts`, `lib/memberRoles.test.ts`, `components/admin/memberRoles/MemberRoleDrawer.tsx`.

- [ ] **Step 1: Failing tests** in `lib/memberRoles.test.ts` (reuse the file's existing role fixture; it builds a `MemberRoleCatalogDto`. Add `sectionLabel: null` to that fixture first):

```ts
describe('section titles', () => {
    it('are optional, but both or neither', () => {
        const draft = { ...draftFromRole(null), roleKey: 'COUSIN', labelEn: 'Cousin', labelEl: 'Ξάδερφος' };
        expect(validateRoleDraft(draft, true).sectionEn).toBeUndefined();
        expect(validateRoleDraft({ ...draft, sectionEn: 'Our cousins' }, true).sectionEl).toBe(true);
        expect(buildCreatePayload({ ...draft, sectionEn: 'Our cousins', sectionEl: 'Τα ξαδέρφια μας' }, 'WEDDING', 9).sectionLabel).toEqual({
            en: 'Our cousins',
            el: 'Τα ξαδέρφια μας',
        });
        expect(buildCreatePayload(draft, 'WEDDING', 9).sectionLabel).toBeUndefined();
    });

    it('patch sends a change, or clearSectionLabel when both are emptied', () => {
        const role = { ...ROLE, sectionLabel: { en: 'Our friends', el: 'Οι φίλοι μας' } };
        expect(buildPatchPayload(role, { ...draftFromRole(role), sectionEn: '', sectionEl: '' })).toEqual({ clearSectionLabel: true });
        expect(buildPatchPayload(role, { ...draftFromRole(role), sectionEl: 'Φίλοι' }).sectionLabel).toEqual({ en: 'Our friends', el: 'Φίλοι' });
        expect(buildPatchPayload(role, draftFromRole(role))).toEqual({});
    });
});
```

`ROLE` is the test file's existing fixture name; use whatever it's called.

Run: `npx vitest run lib/memberRoles.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement in `lib/memberRoles.ts`**

- `MemberRoleDraft`: add `sectionEn: string; sectionEl: string;`.
- `MemberRoleDraftErrors` keys: add `'sectionEn' | 'sectionEl'`.
- `draftFromRole`: `sectionEn: role?.sectionLabel?.en ?? '', sectionEl: role?.sectionLabel?.el ?? '',`
- `validateRoleDraft`, before the `return`:

```ts
    const sectionEn = draft.sectionEn.trim();
    const sectionEl = draft.sectionEl.trim();
    if (sectionEn || sectionEl) {
        if (!isValidLabel(draft.sectionEn)) errors.sectionEn = true;
        if (!isValidLabel(draft.sectionEl)) errors.sectionEl = true;
    }
```

- `buildCreatePayload`, before the `return`:

```ts
    const sectionLabel = { en: draft.sectionEn.trim(), el: draft.sectionEl.trim() };
    if (sectionLabel.en && sectionLabel.el) payload.sectionLabel = sectionLabel;
```

- `buildPatchPayload`, before the `return`:

```ts
    const section = { en: draft.sectionEn.trim(), el: draft.sectionEl.trim() };
    if (!section.en && !section.el) {
        if (role.sectionLabel) patch.clearSectionLabel = true;
    } else if (section.en !== role.sectionLabel?.en || section.el !== role.sectionLabel?.el) {
        patch.sectionLabel = section;
    }
```

- [ ] **Step 3: Drawer fields.** In `MemberRoleDrawer.tsx`, after the Greek label field:

```tsx
                    {/* Book section */}
                    <AdminField label={t('sectionEn')} optional hint={form.errors.sectionEn ? t('sectionInvalid') : t('sectionHint')}>
                        <input
                            name="sectionEn"
                            value={form.draft.sectionEn}
                            onChange={form.handleFieldChange}
                            maxLength={40}
                            aria-invalid={Boolean(form.errors.sectionEn)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('sectionEl')} optional hint={form.errors.sectionEl ? t('sectionInvalid') : undefined}>
                        <input
                            name="sectionEl"
                            value={form.draft.sectionEl}
                            onChange={form.handleFieldChange}
                            maxLength={40}
                            aria-invalid={Boolean(form.errors.sectionEl)}
                            className={adminInputClass()}
                        />
                    </AdminField>
```

`handleFieldChange` already writes `draft[name]`, so the hook needs no change. Add `sectionLabel: null` to any `MemberRoleCatalogDto` fixtures that `tsc` flags (e.g. `MemberRoleDrawer.test.tsx`).

- [ ] **Step 4:** `npx vitest run lib/memberRoles.test.ts components/admin/memberRoles`. Expected: PASS.

- [ ] **Step 5: Commit:** `git add lib components messages && git commit -m "feat(member-roles): admins set a role's wishbook section title"`

---

### Task 7: Full check

- [ ] `npx tsc --noEmit`, `npm run lint`, `npx vitest run`: all green.
- [ ] Manual check against the local BE (with Gotenberg running):
  - As host: star two wishes, edit the dedication, create the book, and watch the spinner switch to Ready without a reload.
  - Download: the file is named after the event and the book shows the dedication and the starred pages.
  - Rebuild works.
  - As a guest: no panel and no stars.
  - On a soft-deleted event: the panel is shown, with no "Edit text" and no stars.
  - The notification's CTA opens the wishbook page.
- [ ] Commit any fixes, then report to the user. Deploy with the BE in the same window.
