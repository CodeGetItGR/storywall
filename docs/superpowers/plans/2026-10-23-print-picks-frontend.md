# Print picks — frontend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts (phase 1) and guests (phase 2) pick gallery photos for print for one of the event's photographers, and give the photographer a Prints section on their vendor page to set prices, read the lists and download the files.

**Architecture:** One data hook file, `hooks/usePrintLists.ts`, owns every print query and mutation and exports its key factory for the server prefetches. `lib/printPicks.ts` holds the pure rules (totals, default size, printable media, euro input). The gallery gets a focused `useGalleryPrint` hook and small components under `components/gallery/print/`; the large `useGalleryScreen` hook only learns one new flag. The vendor page gets `PrintsSection` and `ServicesSection`, each driven by its own hook.

**Tech Stack:** Next.js App Router, React Query (server prefetch + `HydrationBoundary`), next-intl (`messages/en.json`, `messages/el.json`), Tailwind, Vitest + Testing Library.

**Spec:** [2026-10-23-print-picks-design.md](../specs/2026-10-23-print-picks-design.md). Backend plan: [2026-10-23-print-picks-backend.md](2026-10-23-print-picks-backend.md). Part A needs backend Part A on the API you run against; Part B needs backend Part B.

---

## Where and how

- Repository: `C:\Users\User\WebstormProjects\storywall`. Work in a worktree cut from the latest `staging`, one branch per part (`feat/print-picks`, then `feat/guest-print-picks` from `staging` after Part A merged). PRs go into `staging`.
- `node_modules`: link the worktree's to the main checkout's with a junction when the lockfiles match (`cmd /c mklink /J node_modules ..\..\..\node_modules` from the worktree root, after `fc package-lock.json ..\..\..\package-lock.json` reports no differences).
- Checks: `npx vitest run <path>` for one file, `npm test` for all, `npm run lint`, `npx tsc --noEmit`.
- Visual checks: never start a dev server with `preview_start {name}` (it breaks the shared `.next`); run `npm run dev` from the worktree on port 3000 in a terminal and open `preview_start {url: "http://localhost:3000/"}`. The local Spring backend only allows CORS from :3000. Signed-in screens need the user's local test login: ask for it.
- Commit after every task. Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or open a PR until the user says so.
- Repo `CLAUDE.md` rules that bite here: hooks own logic and components stay declarative; a JSX comment above every visual section; every visible string localized in en and el (Greek vendor word: συντελεστής); `React.SubmitEvent` for form submits; one home per fact on a page; creation and edit forms in a sheet, not inline; destructive actions behind `ConfirmActionModal`; mobile-first for host, guest and vendor screens; admin uses a segmented control for multi-value config.

## Numbers that come from the backend

Error numbers are the backend plan's; if the backend took other numbers, use those. `PRINT_ITEM_INVALID` 3108, `PARTNER_REQUIRED` 4035, `PRINT_PICKS_UNAVAILABLE` 4036, `PRINT_PRICES_MISSING` 5181, `PRINT_LIST_LOCKED` 5182, `PRINT_LIST_FULL` 5183, `VENDOR_SERVICE_LIMIT_REACHED` 5184, `PRINT_LIST_EMPTY` 5185.

## Decisions this plan settles

1. File names follow the spec, except `GuestPrintPicksControl` lives in `components/vendors/manage/` next to the other Manage → Vendors files (the spec said `components/manage/vendors/`, which does not exist).
2. The active photographer (when there are two) is component state in the gallery, defaulting to the first one the context lists. The server prefetch seeds that first photographer's list, so the default matches.
3. **Included prints are counted in the order photos were added.** "12 of 40 included · 3 more · €9.00": the first 40 copies on the list are included, the price is for the copies after them at their own sizes. Flagged to the user; change `printTotals` if they want "cheapest copies included first".
4. In the Pro album, a host can select photos to print while print picks are available; Download stays hidden there (Pro downloads are the photographer's).
5. Host and guest lists use the same sheet; the guest variant hides the included count and adds Send. Rows edit in place (size select, copies stepper) because a row has two small fields and no other edit flow — the spec asks for this in the sheet.
6. Prices are entered in euros (`3.50`) and stored in cents; `lib/printPicks.ts` converts.
7. When guest picks are on, the gallery opens to guests (Part B) even without the member archive; the archive button still shows only when the archive is on.

## File structure

New:

| File | Responsibility | Part |
| --- | --- | --- |
| `lib/printPicks.ts` (+ `.test.ts`) | Totals, default size, printable filter, euro/cents | A |
| `hooks/usePrintLists.ts` (+ `.test.tsx`) | Keys, context, host list, item edits, prints included, download; Part B guest lists | A, B |
| `hooks/useVendorServices.ts` (+ `.test.tsx`) | The profile's print sizes | A |
| `hooks/useGalleryPrint.ts` | The gallery's print state: active photographer, picks, sheet, actions | A, B |
| `hooks/useVendorPrintsSection.ts` | The vendor page's Prints section | A, B |
| `hooks/useVendorServicesSection.ts` | The vendor page's Services section | A |
| `components/gallery/print/PrintPill.tsx` | "Prints · 12" header pill | A |
| `components/gallery/print/PrintBadge.tsx` | Grid badge on picked photos | A |
| `components/gallery/print/PrintToggleButton.tsx` | Viewer toggle | A |
| `components/gallery/print/PhotographerSwitch.tsx` | Two-photographer switch | A |
| `components/gallery/print/PrintRow.tsx` | One editable pick | A |
| `components/gallery/print/PrintTotal.tsx` | Total line | A |
| `components/gallery/print/PrintSheet.tsx` (+ `.test.tsx`) | The list sheet | A, B |
| `components/gallery/print/PrintSendSheet.tsx` | Guest confirm step | B |
| `components/gallery/print/SentListRow.tsx` | A guest's sent list, read-only | B |
| `components/vendors/me/PrintsSection.tsx` (+ `.test.tsx`) | Photographer's Prints section | A, B |
| `components/vendors/me/PrintListReadRow.tsx` | Read-only pick row | A |
| `components/vendors/me/PrintsIncludedSheet.tsx` | "Prints included" number sheet | A |
| `components/vendors/me/ServicesSection.tsx` (+ `.test.tsx`) | Print sizes list | A |
| `components/vendors/me/ServiceSheet.tsx` | Add/edit one size | A |
| `components/vendors/me/GuestPrintLists.tsx`, `GuestPrintListRow.tsx` | Photographer's guest lists | B |
| `components/vendors/manage/GuestPrintPicksControl.tsx` | Host guest-scope control | B |
| `components/admin/plans/PlanModuleChoiceField.tsx` | Admin segmented control for `choice` fields | B |

Changed: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/vendors.ts`, `lib/notifications.ts`, `lib/qrLinks.ts` (B), `lib/planModuleConfig.ts` (B), `hooks/useGalleryScreen.ts`, `hooks/usePlanModuleCellDraft.ts` (B), `components/gallery/GalleryScreen.tsx`, `GallerySelectionActions.tsx`, `GallerySelectionBar.tsx`, `GalleryViewer.tsx`, `GalleryMediaGrid.tsx`, `components/vendors/me/VendorMeScreen.tsx`, `components/vendors/manage/ManageVendorsScreen.tsx` (B), `components/admin/plans/PlanModuleConfigField.tsx` (B), the gallery and vendor-me `page.tsx` files, `messages/en.json`, `messages/el.json`, the privacy and terms pages (B).

---

# Part A — services and host picks

### Task A1: Types, endpoints, error codes

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the types**

In `lib/api/types.ts`:
- `VendorCapability` (line ~1086): add `| 'PRINT_PICKS'`.
- `VendorMeDto` (line ~1113): add `approvedPartner: boolean;` with the comment `// An approved partner, who can list priced services (print picks spec 2026-10-23).`
- `NotificationCtaTarget` (line ~734): add `| 'EVENT_VENDOR_PAGE'`.
- After `VendorMeDto`, add:

```ts
// Print picks (spec 2026-10-23). Prices are euro cents.
export type VendorServiceKind = 'PRINT' | 'OTHER';

export interface VendorServiceItemDto {
    id: string;
    kind: VendorServiceKind;
    label: string;
    priceCents: number;
    currency: string;
    sortOrder: number;
}

export interface VendorServiceItemRequestDto {
    kind: VendorServiceKind;
    label: string;
    priceCents: number;
    sortOrder?: number;
}

export type GuestPrintScope = 'OFF' | 'OWN' | 'ANY';

export interface PrintSizeDto {
    id: string;
    label: string;
    priceCents: number;
    currency: string;
}

export interface PrintPhotographerDto {
    vendorId: string;
    businessName: string | null;
    logoUrl: string | null;
    accessEndsAt: string | null;
    // Hosts and the photographer themself; null for guests.
    hostPrintsIncluded: number | null;
    // Empty when the photographer has no sizes or is not an approved partner.
    sizes: PrintSizeDto[];
}

export interface PrintPicksContextDto {
    guestScope: GuestPrintScope;
    photographers: PrintPhotographerDto[];
}

export type PrintListOwnerKind = 'HOST' | 'GUEST';
export type PrintListStatus = 'OPEN' | 'SENT';

export interface PrintListItemDto {
    id: string;
    mediaId: string;
    // Null once the photo was deleted from the gallery (removed is then true).
    media: MediaResponseDto | null;
    removed: boolean;
    sizeId: string | null;
    sizeLabel: string | null;
    unitPriceCents: number | null;
    copies: number;
}

export interface PrintListDto {
    // Null for a host list nobody has written to yet.
    id: string | null;
    vendorId: string;
    ownerKind: PrintListOwnerKind;
    status: PrintListStatus;
    sentAt: string | null;
    ownerName: string | null;
    // Sent guest lists, photographer's view only.
    contactEmail: string | null;
    contactPhone: string | null;
    // Copied at send; null on open lists.
    totalCents: number | null;
    removedCount: number;
    items: PrintListItemDto[];
}

export interface PrintListArchiveManifestDto {
    parts: { part: number; itemCount: number; bytes: number }[];
}
```

- [ ] **Step 2: Add the endpoints**

In `lib/api/endpoints.ts`, in the `me` group next to `vendorProfile`:

```ts
        vendorServices: '/api/me/vendor-profile/services',
        vendorService: (serviceId: string) => `/api/me/vendor-profile/services/${serviceId}`,
```

In the `events` group next to `vendorMe`:

```ts
        printPicks: (eventId: string) => `/api/events/${eventId}/print-picks`,
        hostPrintList: (eventId: string, vendorId: string) => `/api/events/${eventId}/print-lists/host?vendorId=${encodeURIComponent(vendorId)}`,
        hostPrintItems: (eventId: string) => `/api/events/${eventId}/print-lists/host/items`,
        printItem: (eventId: string, itemId: string) => `/api/events/${eventId}/print-lists/items/${itemId}`,
        vendorPrintsIncluded: (eventId: string) => `/api/events/${eventId}/vendors/me/prints-included`,
        printListArchiveManifest: (eventId: string, listId: string) => `/api/events/${eventId}/print-lists/${listId}/archive/manifest`,
        printListArchive: (eventId: string, listId: string, part: number) => `/api/events/${eventId}/print-lists/${listId}/archive?part=${part}`,
```

- [ ] **Step 3: Add the error codes and messages**

`lib/api/errors.ts`, in `ERROR_CODES` next to the codes of the same range:

```ts
    PRINT_ITEM_INVALID: 3108,
    PARTNER_REQUIRED: 4035,
    PRINT_PICKS_UNAVAILABLE: 4036,
    PRINT_PRICES_MISSING: 5181,
    PRINT_LIST_LOCKED: 5182,
    PRINT_LIST_FULL: 5183,
    VENDOR_SERVICE_LIMIT_REACHED: 5184,
    PRINT_LIST_EMPTY: 5185,
```

`lib/api/errorMessageKeys.ts`: add to the `ApiErrorMessageKey` union `| 'printItemInvalid' | 'partnerRequired' | 'printPicksUnavailable' | 'printPricesMissing' | 'printListLocked' | 'printListFull' | 'vendorServiceLimitReached' | 'printListEmpty'`, and to `API_ERROR_MESSAGE_KEYS`:

```ts
    [ERROR_CODES.PRINT_ITEM_INVALID]: 'printItemInvalid',
    [ERROR_CODES.PARTNER_REQUIRED]: 'partnerRequired',
    [ERROR_CODES.PRINT_PICKS_UNAVAILABLE]: 'printPicksUnavailable',
    [ERROR_CODES.PRINT_PRICES_MISSING]: 'printPricesMissing',
    [ERROR_CODES.PRINT_LIST_LOCKED]: 'printListLocked',
    [ERROR_CODES.PRINT_LIST_FULL]: 'printListFull',
    [ERROR_CODES.VENDOR_SERVICE_LIMIT_REACHED]: 'vendorServiceLimitReached',
    [ERROR_CODES.PRINT_LIST_EMPTY]: 'printListEmpty',
```

`messages/en.json`, under `ApiErrors` next to `vendorCannotRsvp`:

```json
        "printItemInvalid": "Only photos can be printed.",
        "partnerRequired": "Only approved partners can list prices.",
        "printPicksUnavailable": "You can't pick this photo for print.",
        "printPricesMissing": "The photographer hasn't set print prices yet.",
        "printListLocked": "This list was sent and can't change.",
        "printListFull": "A list holds up to 100 photos.",
        "vendorServiceLimitReached": "You can list up to 8 sizes.",
        "printListEmpty": "Pick at least one photo first.",
```

`messages/el.json`, same place:

```json
        "printItemInvalid": "Μόνο φωτογραφίες εκτυπώνονται.",
        "partnerRequired": "Μόνο οι εγκεκριμένοι συνεργάτες ορίζουν τιμές.",
        "printPicksUnavailable": "Δεν μπορείτε να επιλέξετε αυτή τη φωτογραφία για εκτύπωση.",
        "printPricesMissing": "Ο φωτογράφος δεν έχει ορίσει ακόμη τιμές εκτύπωσης.",
        "printListLocked": "Η λίστα στάλθηκε και δεν αλλάζει.",
        "printListFull": "Μια λίστα χωράει έως 100 φωτογραφίες.",
        "vendorServiceLimitReached": "Μπορείτε να ορίσετε έως 8 μεγέθη.",
        "printListEmpty": "Επιλέξτε πρώτα τουλάχιστον μία φωτογραφία.",
```

If a test asserts that every error code has a message key (`grep -rln "API_ERROR_MESSAGE_KEYS" lib --include=*.test.ts`), it now covers the new ones.

- [ ] **Step 4: Fix the fixtures and check**

Every `VendorMeDto` fixture now needs `approvedPartner`: run `npx tsc --noEmit`, and add `approvedPartner: false` where it reports a missing property.

Run: `npx tsc --noEmit` and `npx vitest run lib/api`
Expected: no errors; tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/api messages hooks components
git commit -m "feat(print-picks): API types, endpoints and error messages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A2: Print rules in `lib/printPicks.ts`

**Files:**
- Create: `lib/printPicks.ts`, `lib/printPicks.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/printPicks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { MediaResponseDto, PrintListItemDto } from '@/lib/api/types';
import { centsToEuroInput, euroInputToCents, isPrintable, pickedMediaIds, printableIds, printTotals } from '@/lib/printPicks';

function item(overrides: Partial<PrintListItemDto> = {}): PrintListItemDto {
    return {
        id: overrides.id ?? 'i1',
        mediaId: overrides.mediaId ?? 'm1',
        media: null,
        removed: false,
        sizeId: 's1',
        sizeLabel: '13x18',
        unitPriceCents: 300,
        copies: 1,
        ...overrides,
    };
}

describe('printTotals', () => {
    it('counts copies and prices the ones beyond the included count, in list order', () => {
        const items = [item({ copies: 2 }), item({ id: 'i2', unitPriceCents: 500, copies: 2 })];
        expect(printTotals(items, 3)).toEqual({ prints: 4, included: 3, beyond: 1, priceCents: 500, hasPrices: true });
    });

    it('prices every copy for a guest (no included count)', () => {
        expect(printTotals([item({ copies: 3 })], null)).toEqual({ prints: 3, included: null, beyond: 3, priceCents: 900, hasPrices: true });
    });

    it('has no price without sizes', () => {
        expect(printTotals([item({ sizeId: null, sizeLabel: null, unitPriceCents: null, copies: 2 })], 0)).toEqual({
            prints: 2,
            included: 0,
            beyond: 2,
            priceCents: null,
            hasPrices: false,
        });
    });

    it('skips removed photos', () => {
        expect(printTotals([item({ removed: true }), item({ id: 'i2' })], null).prints).toBe(1);
    });

    it('is free while everything is included', () => {
        expect(printTotals([item({ copies: 2 })], 40)).toMatchObject({ beyond: 0, priceCents: 0 });
    });
});

describe('printable media', () => {
    const photo = { id: 'p', mediaType: 'IMAGE' } as MediaResponseDto;
    const video = { id: 'v', mediaType: 'VIDEO' } as MediaResponseDto;

    it('accepts ready photos and refuses everything else', () => {
        expect(isPrintable(photo)).toBe(true);
        expect(isPrintable(video)).toBe(false);
        expect(printableIds([photo, video], new Set(['p', 'v']))).toEqual({ ids: ['p'], skipped: 1 });
    });
});

describe('pickedMediaIds', () => {
    it('lists the live picks', () => {
        expect(pickedMediaIds([item({ mediaId: 'a' }), item({ id: 'i2', mediaId: 'b', removed: true })])).toEqual(new Set(['a']));
    });
});

describe('euro input', () => {
    it('round-trips cents', () => {
        expect(centsToEuroInput(350)).toBe('3.50');
        expect(euroInputToCents('3.5')).toBe(350);
        expect(euroInputToCents('3,50')).toBe(350);
        expect(euroInputToCents('0')).toBe(0);
    });

    it('refuses what is not a price', () => {
        expect(euroInputToCents('')).toBeNull();
        expect(euroInputToCents('-1')).toBeNull();
        expect(euroInputToCents('3.555')).toBeNull();
        expect(euroInputToCents('1000.01')).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/printPicks.test.ts`
Expected: FAIL, cannot resolve `@/lib/printPicks`.

- [ ] **Step 3: Implement**

`lib/printPicks.ts`:

```ts
import type { MediaResponseDto, PrintListItemDto } from '@/lib/api/types';

// The backend's limits (print-picks.max-list-items, max-print-sizes, copies 1–99).
export const PRINT_LIST_MAX_ITEMS = 100;
export const PRINT_SIZES_MAX = 8;
export const PRINT_COPIES_MAX = 99;
const PRICE_MAX_CENTS = 100_000;

export type PrintTotals = {
    prints: number;
    // The host's package; null for a guest list.
    included: number | null;
    // Copies the host or guest pays for.
    beyond: number;
    // Null when the photographer has no sizes.
    priceCents: number | null;
    hasPrices: boolean;
};

// "12 of 40 included · 3 more · €9.00". The included copies are the first ones on the list,
// in the order they were added; the rest are priced at their own size.
export function printTotals(items: readonly PrintListItemDto[], included: number | null): PrintTotals {
    const live = items.filter((item) => !item.removed);
    const prints = live.reduce((sum, item) => sum + item.copies, 0);
    const hasPrices = live.some((item) => item.unitPriceCents !== null);
    let free = included ?? 0;
    let priceCents = 0;
    for (const item of live) {
        const covered = Math.min(free, item.copies);
        free -= covered;
        priceCents += (item.copies - covered) * (item.unitPriceCents ?? 0);
    }
    return { prints, included, beyond: Math.max(0, prints - (included ?? 0)), priceCents: hasPrices ? priceCents : null, hasPrices };
}

export function isPrintable(media: Pick<MediaResponseDto, 'mediaType' | 'status'>): boolean {
    return media.mediaType === 'IMAGE' && media.status === 'READY';
}

// The selected photos that can go on a print list, and how many other items were left out.
export function printableIds(media: readonly MediaResponseDto[], selected: ReadonlySet<string>): { ids: string[]; skipped: number } {
    const chosen = media.filter((item) => selected.has(item.id));
    const ids = chosen.filter(isPrintable).map((item) => item.id);
    return { ids, skipped: chosen.length - ids.length };
}

export function pickedMediaIds(items: readonly PrintListItemDto[]): Set<string> {
    return new Set(items.filter((item) => !item.removed).map((item) => item.mediaId));
}

export function centsToEuroInput(cents: number): string {
    return (cents / 100).toFixed(2);
}

// "3.5", "3,50" → 350. Null for anything that is not a price of 0 to 1,000 euros with up to 2 decimals.
export function euroInputToCents(text: string): number | null {
    const normalized = text.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const cents = Math.round(Number(normalized) * 100);
    return cents <= PRICE_MAX_CENTS ? cents : null;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/printPicks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/printPicks.ts lib/printPicks.test.ts
git commit -m "feat(print-picks): totals and printable rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A3: `hooks/usePrintLists.ts`

**Files:**
- Create: `hooks/usePrintLists.ts`, `hooks/usePrintLists.test.tsx`

- [ ] **Step 1: Write the failing test**

`hooks/usePrintLists.test.tsx` (mock setup copied from `hooks/useVendors.test.tsx`; check its exact mock shape for `@/lib/api/client`, `@/hooks/useAuth` and `@/hooks/useModuleReadable` and match it):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrintListDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));

import { printListKeys, useAddHostPrintItems, useHostPrintList, usePatchPrintItem, useRemovePrintItem } from '@/hooks/usePrintLists';

const list: PrintListDto = {
    id: 'l1',
    vendorId: 'v1',
    ownerKind: 'HOST',
    status: 'OPEN',
    sentAt: null,
    ownerName: null,
    contactEmail: null,
    contactPhone: null,
    totalCents: null,
    removedCount: 0,
    items: [{ id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: null, sizeLabel: null, unitPriceCents: null, copies: 1 }],
};

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

describe('usePrintLists', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the host list for one photographer', async () => {
        api.get.mockResolvedValue(list);
        const { wrapper } = setup();
        const { result } = renderHook(() => useHostPrintList('e1', 'v1', true), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual(list));
        expect(api.get).toHaveBeenCalledWith('/api/events/e1/print-lists/host?vendorId=v1');
    });

    it('puts the server list in the cache after adding', async () => {
        api.post.mockResolvedValue(list);
        const { queryClient, wrapper } = setup();
        const { result } = renderHook(() => useAddHostPrintItems('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m1'] }));
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/print-lists/host/items', { vendorId: 'v1', mediaIds: ['m1'] });
        expect(queryClient.getQueryData(printListKeys.host('e1', 'v1'))).toEqual(list);
    });

    it('changes copies at once and rolls back on failure', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(printListKeys.host('e1', 'v1'), list);
        api.patch.mockRejectedValue(new Error('nope'));
        const { result } = renderHook(() => usePatchPrintItem('e1', printListKeys.host('e1', 'v1')), { wrapper });
        const pending = result.current.mutateAsync({ itemId: 'i1', patch: { copies: 3 } }).catch(() => undefined);
        await waitFor(() => expect(queryClient.getQueryData<PrintListDto>(printListKeys.host('e1', 'v1'))?.items[0].copies).toBe(3));
        await pending;
        expect(queryClient.getQueryData<PrintListDto>(printListKeys.host('e1', 'v1'))?.items[0].copies).toBe(1);
    });

    it('removes a pick at once', async () => {
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(printListKeys.host('e1', 'v1'), list);
        api.del.mockResolvedValue({ ...list, items: [] });
        const { result } = renderHook(() => useRemovePrintItem('e1', printListKeys.host('e1', 'v1')), { wrapper });
        await act(() => result.current.mutateAsync('i1'));
        expect(queryClient.getQueryData<PrintListDto>(printListKeys.host('e1', 'v1'))?.items).toEqual([]);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/usePrintLists.test.tsx`
Expected: FAIL, cannot resolve `@/hooks/usePrintLists`.

- [ ] **Step 3: Implement**

`hooks/usePrintLists.ts` is the reference: read it in the repo; this plan no longer copies it. It exports:

- `printListKeys` (`context`, `host`, `mine`, `guests`, `archive`), `PrintItemPatch`
- `usePrintPicksContext`, `useHostPrintList` (stale time `LIVE_CONTENT_STALE_TIME`), `useAddHostPrintItems`
- `usePatchPrintItem(eventId, listKey)` and `useRemovePrintItem(eventId, listKey)`: they share the mutation key `[...listKey, 'item']`, change the cache at once, undo only their own item on failure (a 404 on remove keeps the removal), write the server list only as the last item mutation running, and invalidate the list when settled
- `useSetPrintsIncluded`
- `usePrintListManifest(eventId, listId)` (`data.parts` is empty when there is nothing to download) and `useDownloadPrintListPart(eventId)` (`{ listId, part, fileStem }`, one part per call, server file name)

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/usePrintLists.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/usePrintLists.ts hooks/usePrintLists.test.tsx
git commit -m "feat(print-picks): print list queries and mutations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A4: `hooks/useVendorServices.ts`

**Files:**
- Create: `hooks/useVendorServices.ts`, `hooks/useVendorServices.test.tsx`

- [ ] **Step 1: Write the failing test**

`hooks/useVendorServices.test.tsx` (same mocks as Task A3):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

import { useCreateVendorService, useDeleteVendorService, useVendorServices, vendorServiceKeys } from '@/hooks/useVendorServices';

const size = { id: 's1', kind: 'PRINT', label: '13x18', priceCents: 300, currency: 'EUR', sortOrder: 0 };

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, wrapper };
}

describe('useVendorServices', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads the profile services only when enabled', async () => {
        api.get.mockResolvedValue([size]);
        const { wrapper } = setup();
        const off = renderHook(() => useVendorServices(false), { wrapper });
        expect(off.result.current.fetchStatus).toBe('idle');
        const on = renderHook(() => useVendorServices(true), { wrapper });
        await waitFor(() => expect(on.result.current.data).toEqual([size]));
    });

    it('refreshes the list and every print context after a change', async () => {
        api.post.mockResolvedValue(size);
        api.del.mockResolvedValue(undefined);
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(vendorServiceKeys.mine, []);
        queryClient.setQueryData(['events', 'e1', 'print-picks'], { guestScope: 'OFF', photographers: [] });
        const create = renderHook(() => useCreateVendorService(), { wrapper });
        await act(() => create.result.current.mutateAsync({ kind: 'PRINT', label: '13x18', priceCents: 300 }));
        expect(queryClient.getQueryState(vendorServiceKeys.mine)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(['events', 'e1', 'print-picks'])?.isInvalidated).toBe(true);
        const remove = renderHook(() => useDeleteVendorService(), { wrapper });
        await act(() => remove.result.current.mutateAsync('s1'));
        expect(api.del).toHaveBeenCalledWith('/api/me/vendor-profile/services/s1');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useVendorServices.test.tsx`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Implement**

`hooks/useVendorServices.ts`:

```ts
'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorServiceItemDto, VendorServiceItemRequestDto } from '@/lib/api/types';

export const vendorServiceKeys = {
    mine: ['me', 'vendor-profile', 'services'] as const,
};

// Prices show in every event's print context, so a change refreshes all of them.
function refresh(queryClient: QueryClient) {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: vendorServiceKeys.mine }),
        queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'events' && query.queryKey[2] === 'print-picks' }),
    ]);
}

// The caller's priced services. Enabled for approved partners only (the list is empty for others).
export function useVendorServices(enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: vendorServiceKeys.mine,
        queryFn: () => api.get<VendorServiceItemDto[]>(endpoints.me.vendorServices),
        enabled: enabled && isAuthenticated,
    });
}

export function useCreateVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: VendorServiceItemRequestDto) => api.post<VendorServiceItemDto>(endpoints.me.vendorServices, body),
        onSuccess: () => refresh(queryClient),
    });
}

export function useUpdateVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: VendorServiceItemRequestDto }) => api.put<VendorServiceItemDto>(endpoints.me.vendorService(id), body),
        onSuccess: () => refresh(queryClient),
    });
}

export function useDeleteVendorService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.me.vendorService(id)),
        onSuccess: () => refresh(queryClient),
    });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useVendorServices.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useVendorServices.ts hooks/useVendorServices.test.tsx
git commit -m "feat(print-picks): vendor services hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A5: Capability, notification links and fallback copy

**Files:**
- Modify: `lib/vendors.ts`, `lib/notifications.ts`, `lib/notifications.test.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing tests**

In `lib/notifications.test.ts`, next to the `VENDOR_JOINED` test:

```ts
    it('sends the print notices to the vendor page', () => {
        for (const type of ['PRINT_PICKS_ENDING', 'PRINT_LIST_SENT']) {
            expect(notificationCtaRoute(notification({ type, ctaTarget: 'EVENT_VENDOR_PAGE', ctaParams: { eventId: 'e1' } }))).toBe(
                routes.events.tools.vendorMe('e1'),
            );
        }
    });
```

In the `lib/vendors` test file (`lib/vendors.test.ts`; create it with this one test if it does not exist):

```ts
import { describe, expect, it } from 'vitest';

import { capabilitiesOfType } from '@/lib/vendors';

describe('capabilitiesOfType', () => {
    it('gives photographers print picks and nobody else', () => {
        expect(capabilitiesOfType('PHOTOGRAPHER')).toContain('PRINT_PICKS');
        expect(capabilitiesOfType('VIDEOGRAPHER')).not.toContain('PRINT_PICKS');
    });
});
```

Run: `npx vitest run lib/notifications.test.ts lib/vendors.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

`lib/vendors.ts`, in `CAPABILITY_TYPES`:

```ts
    SONG_REQUESTS: ['MUSIC'],
    PRINT_PICKS: ['PHOTOGRAPHER'],
```

`vendorToolLinks` lists tool pages; print picks is a section of the vendor page, not a tool page. Read `vendorToolLinks` and confirm it maps only named capabilities to links (so `PRINT_PICKS` adds no link). If it iterates every capability, skip `PRINT_PICKS` there.

`lib/notifications.ts`, in the CTA route map:

```ts
    EVENT_VENDOR_PAGE: (p) => routes.events.tools.vendorMe(p.eventId),
```

`messages/en.json`, under `Notifications.types` next to `VENDOR_JOINED`:

```json
            "PRINT_PICKS_ENDING": {
                "title": "Print picks close on {closesDate} (Athens time)",
                "body": "{count, plural, one {Download the photo the host picked.} other {Download the # photos the host picked.}}"
            },
            "PRINT_LIST_SENT": {
                "title": "{guestName} sent a print list",
                "body": "{count, plural, one {# print} other {# prints}}, {total}."
            },
```

`messages/el.json`:

```json
            "PRINT_PICKS_ENDING": {
                "title": "Οι επιλογές για εκτύπωση κλείνουν στις {closesDate} (ώρα Αθήνας)",
                "body": "{count, plural, one {Κατεβάστε τη φωτογραφία που επέλεξε ο διοργανωτής.} other {Κατεβάστε τις # φωτογραφίες που επέλεξε ο διοργανωτής.}}"
            },
            "PRINT_LIST_SENT": {
                "title": "Ο/Η {guestName} έστειλε λίστα εκτυπώσεων",
                "body": "{count, plural, one {# εκτύπωση} other {# εκτυπώσεις}}, {total}."
            },
```

Check in `components/notifications/NotificationRow.tsx` how a type's fallback reads its payload (the `VENDOR_JOINED` test fills `{business}` and `{type}`); the backend payload keys are `count`, `closesDate` (already formatted, Athens time) and `closesAt` (ISO instant) for `PRINT_PICKS_ENDING`, and `count`, `guestName` and `total` for `PRINT_LIST_SENT`. The fallback's `copyValues` is a fixed list (`business`, `type`, `over`, `dueDate`): add `count`, `closesDate`, `guestName` and `total` to it so these placeholders render, and add a `NotificationRow` test that a `PRINT_PICKS_ENDING` with null title/body renders the date and the singular and plural bodies. The backend copy matches these strings (keys `notification.print.ending.title`, `.body.one`, `.body.many`).

- [ ] **Step 3: Run the tests**

Run: `npx vitest run lib/notifications.test.ts lib/vendors.test.ts components/notifications`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/vendors.ts lib/vendors.test.ts lib/notifications.ts lib/notifications.test.ts messages
git commit -m "feat(print-picks): PRINT_PICKS capability and print notices

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A6: Gallery print state — `useGalleryPrint` and the `useGalleryScreen` flag

**Files:**
- Create: `hooks/useGalleryPrint.ts`
- Modify: `hooks/useGalleryScreen.ts`

- [ ] **Step 1: Give `useGalleryScreen` one flag**

`useGalleryScreen` keeps owning the selection; print only changes who may select and whether Download shows.

- Signature: `export function useGalleryScreen({ printAvailable = false }: { printAvailable?: boolean } = {})`.
- After `const album = …`, add:

```ts
    // Hosts select guest photos to download; anyone who can pick for print selects in either album (print picks spec 2026-10-23).
    const canSelect = (isHost && album === 'GUEST') || printAvailable;
    const canDownloadSelection = isHost && album === 'GUEST';
```

- In the media click handler (line ~286), `if (isHost && gallerySelection.selectionMode)` → `if (canSelect && gallerySelection.selectionMode)`; add `canSelect` to its dependency list in place of `isHost`.
- In the long-press handler (line ~297), `if (!isHost || album !== 'GUEST') return;` → `if (!canSelect) return;`; dependencies `[canSelect, gallerySelection]`.
- In the returned object: `showGalleryActions: galleryEnabled && canSelect,` and add `canSelect, canDownloadSelection,`.
- `canDownloadSelected` (the existing size check) stays as it is; the components show Download only when `canDownloadSelection`.

Run: `npx tsc --noEmit` and `npx vitest run components/gallery hooks/useGalleryScreen`
Expected: no errors; existing tests pass (hosts in the guest album behave as before).

- [ ] **Step 2: Write `useGalleryPrint`**

`hooks/useGalleryPrint.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { printListKeys, useAddHostPrintItems, useHostPrintList, usePatchPrintItem, usePrintPicksContext, useRemovePrintItem } from '@/hooks/usePrintLists';
import type { MediaResponseDto, PrintItemPatch, PrintListItemDto } from '@/lib/api/types';
import { isPrintable, pickedMediaIds, printableIds, printTotals } from '@/lib/printPicks';

// Whether the gallery offers print picks to the caller, read before useGalleryScreen
// so the screen knows who may select. Part A: hosts with an open photographer.
export function usePrintAvailability(eventId: string | null, isHost: boolean) {
    const context = usePrintPicksContext(eventId);
    const photographers = context.data?.photographers ?? [];
    return { available: isHost && photographers.length > 0, photographers };
}

type GalleryPrintInput = {
    eventId: string;
    isHost: boolean;
    available: boolean;
    photographers: ReturnType<typeof usePrintAvailability>['photographers'];
    media: MediaResponseDto[];
    selectedIds: Set<string>;
    viewerMedia: MediaResponseDto | null;
    onAdded: () => void;
};

// The gallery's print list: whose list, what is on it, and the actions on it.
export function useGalleryPrint({ eventId, isHost, available, photographers, media, selectedIds, viewerMedia, onAdded }: GalleryPrintInput) {
    const t = useTranslations('GalleryPage.print');
    const toErrorMessage = useApiErrorMessage();
    const [chosenVendorId, setChosenVendorId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // The first photographer unless the caller switched; a photographer who left falls back to the first.
    const photographer = photographers.find((p) => p.vendorId === chosenVendorId) ?? photographers[0] ?? null;
    const vendorId = photographer?.vendorId ?? null;
    const listKey = printListKeys.host(eventId, vendorId ?? '');
    const list = useHostPrintList(eventId, vendorId, available && isHost);
    const addItems = useAddHostPrintItems(eventId);
    const patchItem = usePatchPrintItem(eventId, listKey);
    const removeItem = useRemovePrintItem(eventId, listKey);

    const items = useMemo(() => list.data?.items ?? [], [list.data?.items]);
    const pickedIds = useMemo(() => pickedMediaIds(items), [items]);
    const totals = useMemo(() => printTotals(items, isHost ? (photographer?.hostPrintsIncluded ?? 0) : null), [items, isHost, photographer?.hostPrintsIncluded]);
    const viewerItem: PrintListItemDto | undefined = viewerMedia ? items.find((item) => item.mediaId === viewerMedia.id && !item.removed) : undefined;

    const add = useCallback(
        async (mediaIds: string[], skipped: number) => {
            if (!vendorId) return;
            setError(null);
            setNotice(null);
            try {
                if (mediaIds.length) await addItems.mutateAsync({ vendorId, mediaIds });
                setNotice(skipped ? t('skippedNotPrintable') : t('added', { count: mediaIds.length }));
                onAdded();
            } catch (addError) {
                setError(toErrorMessage(addError));
            }
        },
        [addItems, onAdded, t, toErrorMessage, vendorId],
    );

    const addSelected = useCallback(() => {
        const { ids, skipped } = printableIds(media, selectedIds);
        return add(ids, skipped);
    }, [add, media, selectedIds]);

    const toggleViewer = useCallback(async () => {
        if (!viewerMedia) return;
        if (viewerItem) {
            setError(null);
            try {
                await removeItem.mutateAsync(viewerItem.id);
            } catch (removeError) {
                setError(toErrorMessage(removeError));
            }
            return;
        }
        await add([viewerMedia.id], 0);
    }, [add, removeItem, toErrorMessage, viewerItem, viewerMedia]);

    const updateItem = useCallback(
        async (itemId: string, patch: PrintItemPatch) => {
            setError(null);
            try {
                await patchItem.mutateAsync({ itemId, patch });
            } catch (patchError) {
                setError(toErrorMessage(patchError));
            }
        },
        [patchItem, toErrorMessage],
    );

    const deleteItem = useCallback(
        async (itemId: string) => {
            setError(null);
            try {
                await removeItem.mutateAsync(itemId);
            } catch (removeError) {
                setError(toErrorMessage(removeError));
            }
        },
        [removeItem, toErrorMessage],
    );

    return {
        available,
        photographers,
        photographer,
        selectPhotographer: setChosenVendorId,
        items,
        pickedIds,
        totals,
        pickCount: totals.prints,
        sheetOpen,
        openSheet: useCallback(() => setSheetOpen(true), []),
        closeSheet: useCallback(() => setSheetOpen(false), []),
        addSelected,
        isAdding: addItems.isPending,
        // The viewer toggle: only on photos, while print picks are available.
        viewerToggle: available && viewerMedia && isPrintable(viewerMedia) ? { picked: Boolean(viewerItem), pending: addItems.isPending || removeItem.isPending, onToggle: toggleViewer } : null,
        updateItem,
        deleteItem,
        notice,
        error,
    };
}
```

Move `PrintItemPatch` into `lib/api/types.ts` (export it there and import it in `hooks/usePrintLists.ts` too) so both files share one definition; delete the copy from `usePrintLists.ts`.

- [ ] **Step 3: Check**

Run: `npx tsc --noEmit`
Expected: no errors. (The hook is tested through `PrintSheet` and `GalleryScreen` in Task A7; its rules are in `lib/printPicks.ts`, tested in Task A2.)

- [ ] **Step 4: Commit**

```bash
git add hooks/useGalleryPrint.ts hooks/useGalleryScreen.ts hooks/usePrintLists.ts lib/api/types.ts
git commit -m "feat(print-picks): gallery print state

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A7: Gallery print UI

Load the `design:design-system` skill before this task (existing product surface).

**Files:**
- Create: `components/gallery/print/PrintPill.tsx`, `PrintBadge.tsx`, `PrintToggleButton.tsx`, `PhotographerSwitch.tsx`, `PrintRow.tsx`, `PrintTotal.tsx`, `PrintSheet.tsx`, `PrintSheet.test.tsx`
- Modify: `components/gallery/GalleryScreen.tsx`, `GallerySelectionActions.tsx`, `GallerySelectionBar.tsx`, `GalleryViewer.tsx`, `GalleryMediaGrid.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the copy**

`messages/en.json`, under `GalleryPage`:

```json
        "print": {
            "action": "Print",
            "picked": "Picked for print",
            "pill": "Prints · {count}",
            "added": "{count, plural, one {# photo added to prints} other {# photos added to prints}}",
            "skippedNotPrintable": "Some items can't be printed, so they were left out.",
            "sheetTitle": "Prints",
            "for": "For {name}",
            "empty": "No photos picked yet.",
            "size": "Size",
            "copies": "Copies",
            "fewer": "One copy fewer",
            "more": "One copy more",
            "remove": "Remove",
            "removed": "Photo removed",
            "included": "{used} of {included} included",
            "beyond": "{count} more",
            "noPrice": "Your photographer sets the price",
            "photographerUnnamed": "Photographer",
            "close": "Close"
        },
```

`messages/el.json`:

```json
        "print": {
            "action": "Εκτύπωση",
            "picked": "Επιλεγμένη για εκτύπωση",
            "pill": "Εκτυπώσεις · {count}",
            "added": "{count, plural, one {Προστέθηκε # φωτογραφία στις εκτυπώσεις} other {Προστέθηκαν # φωτογραφίες στις εκτυπώσεις}}",
            "skippedNotPrintable": "Κάποια αρχεία δεν εκτυπώνονται, γι' αυτό παραλείφθηκαν.",
            "sheetTitle": "Εκτυπώσεις",
            "for": "Για {name}",
            "empty": "Δεν έχετε επιλέξει ακόμη φωτογραφίες.",
            "size": "Μέγεθος",
            "copies": "Αντίτυπα",
            "fewer": "Ένα αντίτυπο λιγότερο",
            "more": "Ένα αντίτυπο περισσότερο",
            "remove": "Αφαίρεση",
            "removed": "Η φωτογραφία αφαιρέθηκε",
            "included": "{used} από {included} περιλαμβάνονται",
            "beyond": "{count} επιπλέον",
            "noPrice": "Την τιμή ορίζει ο φωτογράφος σας",
            "photographerUnnamed": "Φωτογράφος",
            "close": "Κλείσιμο"
        },
```

- [ ] **Step 2: Write the sheet test**

`components/gallery/print/PrintSheet.test.tsx` (wrap with the repo's next-intl test helper; find it with `grep -rln "NextIntlClientProvider" test components --include=*.tsx | head -3` and use the same wrapper):

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrintSheet } from '@/components/gallery/print/PrintSheet';
import type { PrintListItemDto, PrintPhotographerDto } from '@/lib/api/types';
import { printTotals } from '@/lib/printPicks';
import { renderWithIntl } from '@/test/renderWithIntl';

const photographers: PrintPhotographerDto[] = [
    { vendorId: 'v1', businessName: 'Lens & Light', logoUrl: null, accessEndsAt: null, hostPrintsIncluded: 1, sizes: [{ id: 's1', label: '13x18', priceCents: 300, currency: 'EUR' }] },
    { vendorId: 'v2', businessName: 'Studio Two', logoUrl: null, accessEndsAt: null, hostPrintsIncluded: 0, sizes: [] },
];
const items: PrintListItemDto[] = [
    { id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 2 },
    { id: 'i2', mediaId: 'm2', media: null, removed: true, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 1 },
];

function renderSheet(overrides: Partial<Parameters<typeof PrintSheet>[0]> = {}) {
    const props = {
        open: true,
        photographers,
        photographer: photographers[0],
        items,
        totals: printTotals(items, 1),
        error: null,
        onSelectPhotographerAction: vi.fn(),
        onUpdateItemAction: vi.fn(),
        onRemoveItemAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    renderWithIntl(<PrintSheet {...props} />);
    return props;
}

describe('PrintSheet', () => {
    it('shows the rows, a removed photo and the total line', () => {
        renderSheet();
        expect(screen.getByText('Photo removed')).toBeInTheDocument();
        expect(screen.getByText('1 of 1 included · 1 more · €3.00')).toBeInTheDocument();
    });

    it('changes copies and removes a pick', () => {
        const props = renderSheet();
        fireEvent.click(screen.getAllByRole('button', { name: 'One copy more' })[0]);
        expect(props.onUpdateItemAction).toHaveBeenCalledWith('i1', { copies: 3 });
        fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
        expect(props.onRemoveItemAction).toHaveBeenCalledWith('i1');
    });

    it('switches photographer when there are two', () => {
        const props = renderSheet();
        fireEvent.click(screen.getByRole('button', { name: 'Studio Two' }));
        expect(props.onSelectPhotographerAction).toHaveBeenCalledWith('v2');
    });

    it('says the photographer sets the price without sizes', () => {
        const unpriced = [{ ...items[0], sizeId: null, sizeLabel: null, unitPriceCents: null }];
        renderSheet({ photographers: [photographers[1]], photographer: photographers[1], items: unpriced, totals: printTotals(unpriced, 0) });
        expect(screen.getByText(/Your photographer sets the price/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Lens & Light' })).not.toBeInTheDocument();
    });
});
```

If the repo has no `renderWithIntl`, use `render(<NextIntlClientProvider locale="en" messages={en}>…</NextIntlClientProvider>)` with `import en from '@/messages/en.json'`, as other component tests do.

Run: `npx vitest run components/gallery/print`
Expected: FAIL, cannot resolve `PrintSheet`.

- [ ] **Step 3: Write the small components**

`components/gallery/print/PrintTotal.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/lib/billing';
import type { PrintTotals } from '@/lib/printPicks';

// "12 of 40 included · 3 more · €9.00" for a host, "3 more · €9.00" for a guest.
export function PrintTotal({ totals }: { totals: PrintTotals }) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();
    const parts = [
        totals.included !== null && t('included', { used: Math.min(totals.prints, totals.included), included: totals.included }),
        totals.beyond > 0 && t('beyond', { count: totals.beyond }),
        totals.beyond > 0 && (totals.priceCents === null ? t('noPrice') : formatMoney(locale, totals.priceCents, 'EUR')),
    ].filter(Boolean);

    return <p className="text-sm font-semibold text-ink">{parts.join(' · ')}</p>;
}
```

For a guest list (`included === null`) every copy is "beyond", so the line is "3 more · €9.00". If the reviewer prefers "3 prints · €9.00" for guests, add a `prints` message and branch here.

`components/gallery/print/PrintPill.tsx`:

```tsx
'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function PrintPill({ count, onOpenAction }: { count: number; onOpenAction: () => void }) {
    const t = useTranslations('GalleryPage.print');

    return (
        <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenAction}
            className="inline-flex rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink"
        >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pill', { count })}
        </Button>
    );
}
```

`components/gallery/print/PrintBadge.tsx`:

```tsx
'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

// A picked photo's mark in the grid.
export function PrintBadge() {
    const t = useTranslations('GalleryPage.print');

    return (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex size-6 items-center justify-center rounded-full bg-ink/80 text-white" title={t('picked')}>
            <Printer className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{t('picked')}</span>
        </span>
    );
}
```

`components/gallery/print/PrintToggleButton.tsx` (match the viewer's existing action button classes; read `GalleryViewer.tsx` around line 313 and copy the class string of the download button):

```tsx
'use client';

import { Loader2, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export type PrintToggle = { picked: boolean; pending: boolean; onToggle: () => void };

export function PrintToggleButton({ toggle, className }: { toggle: PrintToggle; className?: string }) {
    const t = useTranslations('GalleryPage.print');

    return (
        <Button type="button" size="sm" variant={toggle.picked ? 'default' : 'outline'} onClick={toggle.onToggle} disabled={toggle.pending} aria-pressed={toggle.picked} className={className}>
            {toggle.pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
            {toggle.picked ? t('picked') : t('action')}
        </Button>
    );
}
```

`components/gallery/print/PhotographerSwitch.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { PrintPhotographerDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Shown only with two or more photographers: whose list the sheet shows.
export function PhotographerSwitch({ photographers, activeId, onSelectAction }: { photographers: PrintPhotographerDto[]; activeId: string; onSelectAction: (vendorId: string) => void }) {
    const t = useTranslations('GalleryPage.print');
    if (photographers.length < 2) return null;

    return (
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
            {photographers.map((photographer) => (
                <button
                    key={photographer.vendorId}
                    type="button"
                    aria-pressed={photographer.vendorId === activeId}
                    onClick={() => onSelectAction(photographer.vendorId)}
                    className={cn(
                        'min-h-10 flex-1 truncate rounded-full px-3 text-sm font-semibold transition-colors',
                        photographer.vendorId === activeId ? 'bg-background text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                    )}
                >
                    {photographer.businessName ?? t('photographerUnnamed')}
                </button>
            ))}
        </div>
    );
}
```

The inline arrow in `onClick` is a closure over the row's id, which is how the repo's other list buttons pass ids when there is no `data-` attribute pattern; if lint (`react/jsx-no-bind` or similar) refuses it, switch to `data-vendor-id` and one handler like `VisibilitySegmentedControl` does.

`components/gallery/print/PrintRow.tsx`:

```tsx
'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import type { PrintItemPatch, PrintListItemDto, PrintSizeDto } from '@/lib/api/types';
import { PRINT_COPIES_MAX } from '@/lib/printPicks';

// One pick: thumbnail, size, copies, remove. A photo deleted from the gallery shows as removed.
export function PrintRow({
    item,
    sizes,
    disabled,
    onUpdateAction,
    onRemoveAction,
}: {
    item: PrintListItemDto;
    sizes: PrintSizeDto[];
    disabled?: boolean;
    onUpdateAction: (itemId: string, patch: PrintItemPatch) => void;
    onRemoveAction: (itemId: string) => void;
}) {
    const t = useTranslations('GalleryPage.print');
    const thumbnail = item.media?.thumbnailUrl ?? item.media?.url ?? null;

    function handleSizeChange(event: ChangeEvent<HTMLSelectElement>) {
        onUpdateAction(item.id, { sizeId: event.currentTarget.value });
    }

    return (
        <li className="flex items-center gap-3 py-2">
            {/* Photo */}
            {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- presigned media URL, same as the gallery grid
                <img src={thumbnail} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
            ) : (
                <span className="size-14 shrink-0 rounded-lg bg-surface-muted" aria-hidden="true" />
            )}

            {/* Size and copies */}
            <div className="min-w-0 flex-1">
                {item.removed ? (
                    <p className="text-sm text-ink-muted">{t('removed')}</p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        {sizes.length > 0 && (
                            <select aria-label={t('size')} value={item.sizeId ?? ''} onChange={handleSizeChange} disabled={disabled} className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm">
                                {sizes.map((size) => (
                                    <option key={size.id} value={size.id}>
                                        {size.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="flex items-center gap-1" role="group" aria-label={t('copies')}>
                            <Button type="button" size="icon" variant="outline" aria-label={t('fewer')} disabled={disabled || item.copies <= 1} onClick={() => onUpdateAction(item.id, { copies: item.copies - 1 })}>
                                <Minus aria-hidden="true" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.copies}</span>
                            <Button type="button" size="icon" variant="outline" aria-label={t('more')} disabled={disabled || item.copies >= PRINT_COPIES_MAX} onClick={() => onUpdateAction(item.id, { copies: item.copies + 1 })}>
                                <Plus aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Remove */}
            <Button type="button" size="icon" variant="ghost" aria-label={t('remove')} disabled={disabled} onClick={() => onRemoveAction(item.id)}>
                <Trash2 aria-hidden="true" />
            </Button>
        </li>
    );
}
```

Check `MediaResponseDto`'s thumbnail field name (`thumbnailUrl`, `previewUrl`…) in `lib/api/types.ts` and what `GalleryMediaGrid` renders, and use the same field. Check the `Button` `size="icon"` variant exists in `components/ui/button.tsx`.

- [ ] **Step 4: Write the sheet**

`components/gallery/print/PrintSheet.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { PhotographerSwitch } from '@/components/gallery/print/PhotographerSwitch';
import { PrintRow } from '@/components/gallery/print/PrintRow';
import { PrintTotal } from '@/components/gallery/print/PrintTotal';
import { Modal } from '@/components/ui/modal';
import type { PrintItemPatch, PrintListItemDto, PrintPhotographerDto } from '@/lib/api/types';
import type { PrintTotals } from '@/lib/printPicks';

// The list being built for one photographer. footer: the guest's Send and sent lists (Part B).
export function PrintSheet({
    open,
    photographers,
    photographer,
    items,
    totals,
    error,
    readOnly,
    footer,
    onSelectPhotographerAction,
    onUpdateItemAction,
    onRemoveItemAction,
    onCloseAction,
}: {
    open: boolean;
    photographers: PrintPhotographerDto[];
    photographer: PrintPhotographerDto | null;
    items: PrintListItemDto[];
    totals: PrintTotals;
    error: string | null;
    readOnly?: boolean;
    footer?: ReactNode;
    onSelectPhotographerAction: (vendorId: string) => void;
    onUpdateItemAction: (itemId: string, patch: PrintItemPatch) => void;
    onRemoveItemAction: (itemId: string) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('GalleryPage.print');

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle')}</h2>
                {photographer && photographers.length < 2 && <p className="text-sm text-ink-muted">{t('for', { name: photographer.businessName ?? t('photographerUnnamed') })}</p>}

                {/* Photographer */}
                {photographer && (
                    <div className="mt-3">
                        <PhotographerSwitch photographers={photographers} activeId={photographer.vendorId} onSelectAction={onSelectPhotographerAction} />
                    </div>
                )}

                {/* Picks */}
                {items.length === 0 ? (
                    <p className="mt-4 text-sm text-ink-muted">{t('empty')}</p>
                ) : (
                    <ul className="mt-3 divide-y divide-border">
                        {items.map((item) => (
                            <PrintRow key={item.id} item={item} sizes={photographer?.sizes ?? []} disabled={readOnly} onUpdateAction={onUpdateItemAction} onRemoveAction={onRemoveItemAction} />
                        ))}
                    </ul>
                )}

                {/* Total */}
                {totals.prints > 0 && (
                    <div className="mt-4">
                        <PrintTotal totals={totals} />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p role="alert" className="mt-3 text-sm text-rose-600">
                        {error}
                    </p>
                )}

                {footer}
            </Modal.Body>
        </Modal>
    );
}
```

The test expects "1 of 1 included · 1 more · €3.00": 2 copies of the live item, 1 included, 1 more at €3.00. Check `formatMoney('en', 300, 'EUR')` gives `€3.00`; adjust the expected string to its real output if it differs (e.g. a narrow no-break space).

Run: `npx vitest run components/gallery/print`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the selection actions**

`GallerySelectionActions.tsx` and `GallerySelectionBar.tsx` get two optional props:

```ts
    /** Download shows for hosts in the guest album only. */
    canDownload?: boolean;
    /** Adds the selection to the print list; absent while print picks are unavailable. */
    onPrintSelected?: () => void;
    isPrinting?: boolean;
```

Default `canDownload = true`. Render the existing Download button only when `canDownload`. Next to it (before it in DOM order, so on mobile the primary print action sits beside Download), render when `onPrintSelected` is set:

```tsx
            {onPrintSelected && (
                <Button
                    type="button"
                    size={floating ? 'lg' : 'lg'}
                    variant={canDownload ? 'outline' : 'default'}
                    onClick={onPrintSelected}
                    disabled={!selectedCount || isPrinting}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-6 text-sm font-semibold"
                >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {tPrint('action')}
                </Button>
            )}
```

with `const tPrint = useTranslations('GalleryPage.print');` and `Printer` from `lucide-react`. In `GallerySelectionBar` use that file's own button size and classes (it is the compact mobile bar) and its spinner pattern for `isPrinting`.

- [ ] **Step 6: Wire the grid and the viewer**

`GalleryMediaGrid.tsx`: add the prop `printedIds?: Set<string>` and, inside each tile's relatively positioned button, `{printedIds?.has(item.id) && <PrintBadge />}` (import from `@/components/gallery/print/PrintBadge`). Check the tile wrapper has `relative`; add it if not.

`GalleryViewer.tsx`: add the prop `printToggle?: PrintToggle | null` (type from `PrintToggleButton.tsx`) and, in the actions row (line ~313), first in the row: `{printToggle && <PrintToggleButton toggle={printToggle} className={…the row's button classes…} />}`.

- [ ] **Step 7: Compose in `GalleryScreen`**

In `components/gallery/GalleryScreen.tsx`:

```tsx
    const printAvailability = usePrintAvailability(eventId, isHost);
    const screen = useGalleryScreen({ printAvailable: printAvailability.available });
    const print = useGalleryPrint({
        eventId,
        isHost,
        available: printAvailability.available,
        photographers: printAvailability.photographers,
        media: screen.media,
        selectedIds: screen.gallerySelection.selectedIds,
        viewerMedia: screen.selectedMedia,
        onAdded: screen.exitSelectionMode,
    });
```

`useGalleryScreen` reads `eventId`/`isHost` from `useEventRouteContext()`; get them in the screen the same way (`const { eventId, isHost } = useEventRouteContext();`) before calling the hooks, and keep destructuring `screen` as today. Then:

- Header (`{/* Header actions */}`): in the non-selection branch, add `{print.pickCount > 0 && <PrintPill count={print.pickCount} onOpenAction={print.openSheet} />}` next to the Download gallery button (inside the right-hand group: wrap Download and the pill in `<div className="flex gap-2">`).
- `GallerySelectionActions` and `GallerySelectionBar`: pass `canDownload={canDownloadSelection}`, `onPrintSelected={print.available ? print.addSelected : undefined}`, `isPrinting={print.isAdding}`. The bar's guard `{isHost && (` becomes `{canSelect && (`.
- Under the selection bar, a notice line: `{(print.notice || print.error) && <p role="status" className={cn('mb-3 text-xs', print.error ? 'text-rose-600' : 'text-ink-muted')}>{print.error ?? print.notice}</p>}` — when the sheet is open its own error line shows instead, so render this only while `!print.sheetOpen`.
- `GalleryMediaGrid`: `printedIds={print.available ? print.pickedIds : undefined}`.
- `GalleryViewer`: `printToggle={print.viewerToggle}`.
- After `{/* Viewer */}`, add:

```tsx
            {/* Prints */}
            {print.available && (
                <PrintSheet
                    open={print.sheetOpen}
                    photographers={print.photographers}
                    photographer={print.photographer}
                    items={print.items}
                    totals={print.totals}
                    error={print.error}
                    onSelectPhotographerAction={print.selectPhotographer}
                    onUpdateItemAction={print.updateItem}
                    onRemoveItemAction={print.deleteItem}
                    onCloseAction={print.closeSheet}
                />
            )}
```

- [ ] **Step 8: Check**

Run: `npx tsc --noEmit`, `npm run lint`, `npx vitest run components/gallery hooks`
Expected: clean; all pass.

- [ ] **Step 9: Commit**

```bash
git add components/gallery hooks messages
git commit -m "feat(print-picks): host print picks in the gallery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A8: Vendor page — Prints and Services sections

Load the `design:design-system` skill before this task.

**Files:**
- Create: `hooks/useVendorPrintsSection.ts`, `hooks/useVendorServicesSection.ts`
- Create: `components/vendors/me/PrintsSection.tsx`, `PrintListReadRow.tsx`, `PrintsIncludedSheet.tsx`, `ServicesSection.tsx`, `ServiceSheet.tsx`, `PrintsSection.test.tsx`, `ServicesSection.test.tsx`
- Modify: `components/vendors/me/VendorMeScreen.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the copy**

`messages/en.json`, under `Vendors`:

```json
        "prints": {
            "title": "Prints",
            "included": "Prints included for the host",
            "includedValue": "{count}",
            "includedEdit": "Change",
            "includedSheetTitle": "Prints included for the host",
            "includedLabel": "Number of prints",
            "save": "Save",
            "cancel": "Cancel",
            "hostEmpty": "The host hasn't picked photos yet.",
            "download": "Download",
            "downloadPart": "Part {part} of {total}",
            "downloading": "Downloading…",
            "removedCount": "{count, plural, one {# photo removed} other {# photos removed}}",
            "noSize": "No size",
            "copies": "{count, plural, one {# copy} other {# copies}}"
        },
        "services": {
            "title": "Print sizes",
            "partnerOnly": "Approved partners can list prices.",
            "empty": "No sizes yet.",
            "add": "Add size",
            "sheetAdd": "Add size",
            "sheetEdit": "Edit size",
            "label": "Size",
            "labelPlaceholder": "13x18",
            "price": "Price per copy (€)",
            "priceInvalid": "Enter a price like 3.50.",
            "labelRequired": "Enter a size.",
            "save": "Save",
            "cancel": "Cancel",
            "delete": "Delete size",
            "deleteTitle": "Delete this size?",
            "deleteBody": "Picks at this size keep their place, without a size.",
            "deleteConfirm": "Delete",
            "limit": "You can list up to 8 sizes."
        },
```

`messages/el.json`:

```json
        "prints": {
            "title": "Εκτυπώσεις",
            "included": "Εκτυπώσεις που περιλαμβάνονται για τους διοργανωτές",
            "includedValue": "{count}",
            "includedEdit": "Αλλαγή",
            "includedSheetTitle": "Εκτυπώσεις που περιλαμβάνονται για τους διοργανωτές",
            "includedLabel": "Αριθμός εκτυπώσεων",
            "save": "Αποθήκευση",
            "cancel": "Ακύρωση",
            "hostEmpty": "Οι διοργανωτές δεν έχουν επιλέξει ακόμη φωτογραφίες.",
            "download": "Λήψη",
            "downloadPart": "Κομμάτι {part} από {total}",
            "downloading": "Λήψη…",
            "removedCount": "{count, plural, one {Αφαιρέθηκε # φωτογραφία} other {Αφαιρέθηκαν # φωτογραφίες}}",
            "noSize": "Χωρίς μέγεθος",
            "copies": "{count, plural, one {# αντίτυπο} other {# αντίτυπα}}"
        },
        "services": {
            "title": "Μεγέθη εκτύπωσης",
            "partnerOnly": "Μόνο οι εγκεκριμένοι συνεργάτες ορίζουν τιμές.",
            "empty": "Δεν υπάρχουν ακόμη μεγέθη.",
            "add": "Προσθήκη μεγέθους",
            "sheetAdd": "Προσθήκη μεγέθους",
            "sheetEdit": "Επεξεργασία μεγέθους",
            "label": "Μέγεθος",
            "labelPlaceholder": "13x18",
            "price": "Τιμή ανά αντίτυπο (€)",
            "priceInvalid": "Γράψτε μια τιμή όπως 3.50.",
            "labelRequired": "Γράψτε ένα μέγεθος.",
            "save": "Αποθήκευση",
            "cancel": "Ακύρωση",
            "delete": "Διαγραφή μεγέθους",
            "deleteTitle": "Διαγραφή αυτού του μεγέθους;",
            "deleteBody": "Οι επιλογές σε αυτό το μέγεθος μένουν στη λίστα, χωρίς μέγεθος.",
            "deleteConfirm": "Διαγραφή",
            "limit": "Μπορείτε να ορίσετε έως 8 μεγέθη."
        },
```

- [ ] **Step 2: Write `useVendorPrintsSection`**

`hooks/useVendorPrintsSection.ts`:

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { printListKeys, useDownloadPrintListPart, useHostPrintList, usePrintListManifest, usePrintPicksContext, useSetPrintsIncluded } from '@/hooks/usePrintLists';
import type { VendorMeDto } from '@/lib/api/types';
import { printTotals } from '@/lib/printPicks';
import { hasVendorCapability } from '@/lib/vendors';

// The photographer's Prints section: the host list, what the package includes, and the download.
export function useVendorPrintsSection(eventId: string, me: VendorMeDto | null) {
    const toErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const open = hasVendorCapability(me, 'PRINT_PICKS');
    const context = usePrintPicksContext(open ? eventId : null);
    const vendorId = me?.vendorId ?? null;
    const hostList = useHostPrintList(eventId, vendorId, open);
    const setIncluded = useSetPrintsIncluded(eventId);
    const listId = hostList.data?.id ?? null;
    const manifest = usePrintListManifest(open ? eventId : null, listId);
    const download = useDownloadPrintListPart(eventId);
    const listUpdatedAt = hostList.dataUpdatedAt;
    // The parts depend on the list: a pick added past a part boundary must not be left out of the download.
    useEffect(() => {
        if (listId) void queryClient.invalidateQueries({ queryKey: printListKeys.archive(eventId, listId), exact: true });
    }, [queryClient, eventId, listId, listUpdatedAt]);
    const [includedOpen, setIncludedOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const self = context.data?.photographers.find((p) => p.vendorId === vendorId) ?? null;
    const included = self?.hostPrintsIncluded ?? 0;
    const items = useMemo(() => hostList.data?.items ?? [], [hostList.data?.items]);
    const totals = useMemo(() => printTotals(items, included), [items, included]);

    const saveIncluded = useCallback(
        async (count: number) => {
            setError(null);
            try {
                await setIncluded.mutateAsync(count);
                setIncludedOpen(false);
            } catch (saveError) {
                setError(toErrorMessage(saveError));
            }
        },
        [setIncluded, toErrorMessage],
    );

    const downloadHostPart = useCallback(
        async (part: number) => {
            if (!listId) return;
            setError(null);
            try {
                await download.mutateAsync({ listId, part, fileStem: 'prints-host' });
            } catch (downloadError) {
                setError(toErrorMessage(downloadError));
            }
        },
        [download, listId, toErrorMessage],
    );

    return {
        open,
        isLoading: hostList.isLoading || context.isLoading,
        included,
        sizes: self?.sizes ?? [],
        items,
        removedCount: hostList.data?.removedCount ?? 0,
        totals,
        // 0 when nothing is ready to download; 1 shows a single Download button, more show one button per part.
        partCount: manifest.data?.parts.length ?? 0,
        isLoadingParts: manifest.isLoading,
        downloadingPart: download.isPending ? (download.variables?.part ?? null) : null,
        downloadHostPart,
        includedOpen,
        openIncluded: useCallback(() => setIncludedOpen(true), []),
        closeIncluded: useCallback(() => setIncludedOpen(false), []),
        saveIncluded,
        isSavingIncluded: setIncluded.isPending,
        // A failed manifest shows here too, so the photographer is never left with no button and no message.
        error: error ?? (manifest.error ? toErrorMessage(manifest.error) : null),
    };
}
```

- [ ] **Step 3: Write `useVendorServicesSection`**

`hooks/useVendorServicesSection.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateVendorService, useDeleteVendorService, useUpdateVendorService, useVendorServices } from '@/hooks/useVendorServices';
import type { VendorMeDto, VendorServiceItemDto } from '@/lib/api/types';
import { PRINT_SIZES_MAX } from '@/lib/printPicks';

// The Services section: print sizes for approved-partner photographers, one line for other photographers.
export function useVendorServicesSection(me: VendorMeDto | null) {
    const toErrorMessage = useApiErrorMessage();
    const isPhotographer = me?.vendorType === 'PHOTOGRAPHER';
    const approved = Boolean(me?.approvedPartner);
    const services = useVendorServices(isPhotographer && approved);
    const create = useCreateVendorService();
    const update = useUpdateVendorService();
    const remove = useDeleteVendorService();
    // null: closed; 'new': adding; an item: editing it.
    const [editing, setEditing] = useState<VendorServiceItemDto | 'new' | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sizes = (services.data ?? []).filter((item) => item.kind === 'PRINT');

    const save = useCallback(
        async (label: string, priceCents: number) => {
            setError(null);
            try {
                if (editing === 'new') await create.mutateAsync({ kind: 'PRINT', label, priceCents });
                else if (editing) await update.mutateAsync({ id: editing.id, body: { kind: 'PRINT', label, priceCents, sortOrder: editing.sortOrder } });
                setEditing(null);
            } catch (saveError) {
                setError(toErrorMessage(saveError));
            }
        },
        [create, editing, toErrorMessage, update],
    );

    const confirmRemove = useCallback(async () => {
        if (!editing || editing === 'new') return;
        setError(null);
        try {
            await remove.mutateAsync(editing.id);
            setConfirmDelete(false);
            setEditing(null);
        } catch (removeError) {
            setConfirmDelete(false);
            setError(toErrorMessage(removeError));
        }
    }, [editing, remove, toErrorMessage]);

    return {
        visible: isPhotographer,
        approved,
        isLoading: services.isLoading,
        sizes,
        canAdd: sizes.length < PRINT_SIZES_MAX,
        editing,
        openNew: useCallback(() => {
            setError(null);
            setEditing('new');
        }, []),
        openEdit: useCallback((item: VendorServiceItemDto) => {
            setError(null);
            setEditing(item);
        }, []),
        close: useCallback(() => setEditing(null), []),
        save,
        isSaving: create.isPending || update.isPending,
        confirmDelete,
        requestDelete: useCallback(() => setConfirmDelete(true), []),
        cancelDelete: useCallback(() => setConfirmDelete(false), []),
        confirmRemove,
        isDeleting: remove.isPending,
        error,
    };
}
```

- [ ] **Step 4: Write the section tests**

`components/vendors/me/ServicesSection.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServicesSection } from '@/components/vendors/me/ServicesSection';
import { renderWithIntl } from '@/test/renderWithIntl';

const size = { id: 's1', kind: 'PRINT' as const, label: '13x18', priceCents: 350, currency: 'EUR', sortOrder: 0 };

describe('ServicesSection', () => {
    it('lists sizes with prices and opens one to edit', () => {
        const onEditAction = vi.fn();
        renderWithIntl(<ServicesSection approved sizes={[size]} canAdd isLoading={false} error={null} onAddAction={vi.fn()} onEditAction={onEditAction} />);
        fireEvent.click(screen.getByRole('button', { name: /13x18/ }));
        expect(onEditAction).toHaveBeenCalledWith(size);
        expect(screen.getByText('€3.50')).toBeInTheDocument();
    });

    it('shows one line to vendors who are not approved partners', () => {
        renderWithIntl(<ServicesSection approved={false} sizes={[]} canAdd isLoading={false} error={null} onAddAction={vi.fn()} onEditAction={vi.fn()} />);
        expect(screen.getByText('Approved partners can list prices.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Add size' })).not.toBeInTheDocument();
    });
});
```

`components/vendors/me/PrintsSection.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrintsSection } from '@/components/vendors/me/PrintsSection';
import { printTotals } from '@/lib/printPicks';
import { renderWithIntl } from '@/test/renderWithIntl';

const items = [{ id: 'i1', mediaId: 'm1', media: null, removed: false, sizeId: 's1', sizeLabel: '13x18', unitPriceCents: 300, copies: 2 }];

describe('PrintsSection', () => {
    it('shows the included count, the host picks, the total and the download', () => {
        const onDownloadPartAction = vi.fn();
        renderWithIntl(
            <PrintsSection
                included={1}
                items={items}
                removedCount={1}
                totals={printTotals(items, 1)}
                partCount={1}
                downloadingPart={null} isLoadingParts={false}
                isLoading={false}
                error={null}
                onEditIncludedAction={vi.fn()}
                onDownloadPartAction={onDownloadPartAction}
            />,
        );
        expect(screen.getByText('Prints included for the host')).toBeInTheDocument();
        expect(screen.getByText('13x18 · 2 copies')).toBeInTheDocument();
        expect(screen.getByText('1 photo removed')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Download' }));
        expect(onDownloadPartAction).toHaveBeenCalledWith(1);
    });

    it('shows a disabled Download while the parts load', () => {
        renderWithIntl(
            <PrintsSection included={1} items={items} removedCount={0} totals={printTotals(items, 1)} partCount={0} downloadingPart={null} isLoadingParts isLoading={false} error={null} onEditIncludedAction={vi.fn()} onDownloadPartAction={vi.fn()} />,
        );
        expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    });

    it('offers one button per part when the zip has several', () => {
        const onDownloadPartAction = vi.fn();
        renderWithIntl(
            <PrintsSection included={1} items={items} removedCount={0} totals={printTotals(items, 1)} partCount={2} downloadingPart={null} isLoadingParts={false} isLoading={false} error={null} onEditIncludedAction={vi.fn()} onDownloadPartAction={onDownloadPartAction} />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Part 2 of 2' }));
        expect(onDownloadPartAction).toHaveBeenCalledWith(2);
    });

    it('says when the host has picked nothing', () => {
        renderWithIntl(
            <PrintsSection included={0} items={[]} removedCount={0} totals={printTotals([], 0)} partCount={0} downloadingPart={null} isLoadingParts={false} isLoading={false} error={null} onEditIncludedAction={vi.fn()} onDownloadPartAction={vi.fn()} />,
        );
        expect(screen.getByText("The host hasn't picked photos yet.")).toBeInTheDocument();
    });
});
```

Run: `npx vitest run components/vendors/me`
Expected: FAIL (components missing).

- [ ] **Step 5: Write the components**

`components/vendors/me/PrintListReadRow.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { PrintListItemDto } from '@/lib/api/types';

// A pick as the photographer sees it: thumbnail, size and copies.
export function PrintListReadRow({ item }: { item: PrintListItemDto }) {
    const t = useTranslations('Vendors.prints');
    const thumbnail = item.media?.thumbnailUrl ?? item.media?.url ?? null;

    return (
        <li className="flex items-center gap-3 py-2">
            {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- presigned media URL, same as the gallery grid
                <img src={thumbnail} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
            ) : (
                <span className="size-12 shrink-0 rounded-lg bg-surface-muted" aria-hidden="true" />
            )}
            <p className="min-w-0 truncate text-sm text-ink">
                {item.sizeLabel ?? t('noSize')} · {t('copies', { count: item.copies })}
            </p>
        </li>
    );
}
```

(Use the same thumbnail field as `PrintRow`.)

`components/vendors/me/PrintsSection.tsx`:

```tsx
'use client';

import { Download, Loader2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { PrintTotal } from '@/components/gallery/print/PrintTotal';
import { Button } from '@/components/ui/button';
import { PrintListReadRow } from '@/components/vendors/me/PrintListReadRow';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { PrintListItemDto } from '@/lib/api/types';
import type { PrintTotals } from '@/lib/printPicks';

// The photographer's Prints section. tabs: Part B's Host/Guests switch; guests: the Guests tab's content.
export function PrintsSection({
    included,
    items,
    removedCount,
    totals,
    partCount,
    downloadingPart,
    isLoadingParts,
    isLoading,
    error,
    tabs,
    onEditIncludedAction,
    onDownloadPartAction,
}: {
    included: number;
    items: PrintListItemDto[];
    removedCount: number;
    totals: PrintTotals;
    partCount: number;
    downloadingPart: number | null;
    isLoadingParts: boolean;
    isLoading: boolean;
    error: string | null;
    tabs?: ReactNode;
    onEditIncludedAction: () => void;
    onDownloadPartAction: (part: number) => void;
}) {
    const t = useTranslations('Vendors.prints');
    const live = items.filter((item) => !item.removed);

    return (
        <section aria-labelledby="vendor-prints-title" className="flex flex-col gap-4">
            {/* Header */}
            <h2 id="vendor-prints-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h2>

            {tabs}

            {/* Included */}
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-muted">{t('included')}</p>
                <Button type="button" variant="outline" size="lg" onClick={onEditIncludedAction}>
                    <span className="font-mono">{t('includedValue', { count: included })}</span>
                    <Pencil aria-hidden="true" />
                    <span className="sr-only">{t('includedEdit')}</span>
                </Button>
            </div>

            {/* Host picks */}
            {isLoading ? (
                <VendorRowsSkeleton rows={3} />
            ) : live.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('hostEmpty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {live.map((item) => (
                        <PrintListReadRow key={item.id} item={item} />
                    ))}
                </ul>
            )}
            {removedCount > 0 && <p className="text-xs text-ink-muted">{t('removedCount', { count: removedCount })}</p>}

            {/* Total and download */}
            {totals.prints > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <PrintTotal totals={totals} />
                    <div className="flex flex-wrap gap-2">
                        {isLoadingParts && (
                            <Button type="button" size="lg" disabled>
                                <Download aria-hidden="true" />
                                {t('download')}
                            </Button>
                        )}
                        {Array.from({ length: partCount }, (_, index) => index + 1).map((part) => (
                            <Button key={part} type="button" size="lg" onClick={() => onDownloadPartAction(part)} disabled={downloadingPart !== null}>
                                {downloadingPart === part ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                                {downloadingPart === part ? t('downloading') : partCount === 1 ? t('download') : t('downloadPart', { part, total: partCount })}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
```

The `includedValue` key exists so the number is a translated string in the button; the visible "Prints included for the host" label sits beside it. The included count shows once here and is part of the total line ("12 of 40 included") only when there are picks: the label row is the setting, the total line is the use. If the reviewer reads that as the same fact twice, drop the number from the button and keep "Change" as its label.

`components/vendors/me/PrintsIncludedSheet.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function PrintsIncludedSheet({
    open,
    initial,
    isSaving,
    error,
    onSaveAction,
    onCloseAction,
}: {
    open: boolean;
    initial: number;
    isSaving: boolean;
    error: string | null;
    onSaveAction: (count: number) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.prints');
    const [value, setValue] = useState(String(initial));
    const count = Number(value);
    const valid = /^\d{1,4}$/.test(value.trim());

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        setValue(event.currentTarget.value);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (valid) onSaveAction(count);
    }

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{t('includedSheetTitle')}</h2>

                    {/* Count */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('includedLabel')}
                        <input type="number" inputMode="numeric" min={0} max={9999} step={1} value={value} onChange={handleChange} className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono" />
                    </label>
                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" size="lg" disabled={!valid || isSaving}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
```

Mount it keyed on `open` (`key={open ? 'open' : 'closed'}`) in the screen so each opening starts from the saved value, like `MemberArchiveModal`. The small form state (`value`) stays in the component: it is one input's draft, the kind of trivial wiring `CLAUDE.md` allows; validation is one regex.

`components/vendors/me/ServicesSection.tsx`:

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { VendorServiceItemDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// Print sizes as compact rows; a row opens the edit sheet. Non-partners get one line.
export function ServicesSection({
    approved,
    sizes,
    canAdd,
    isLoading,
    error,
    onAddAction,
    onEditAction,
}: {
    approved: boolean;
    sizes: VendorServiceItemDto[];
    canAdd: boolean;
    isLoading: boolean;
    error: string | null;
    onAddAction: () => void;
    onEditAction: (item: VendorServiceItemDto) => void;
}) {
    const t = useTranslations('Vendors.services');
    const locale = useLocale();

    return (
        <section aria-labelledby="vendor-services-title" className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h2 id="vendor-services-title" className="text-sm font-semibold text-ink">
                    {t('title')}
                </h2>
                {approved && (
                    <Button type="button" variant="outline" size="lg" onClick={onAddAction} disabled={!canAdd}>
                        <Plus aria-hidden="true" />
                        {t('add')}
                    </Button>
                )}
            </div>

            {/* Sizes */}
            {!approved ? (
                <p className="text-sm text-ink-muted">{t('partnerOnly')}</p>
            ) : isLoading ? (
                <VendorRowsSkeleton rows={2} />
            ) : sizes.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {sizes.map((size) => (
                        <li key={size.id}>
                            <button type="button" onClick={() => onEditAction(size)} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-sm">
                                <span className="truncate text-ink">{size.label}</span>
                                <span className="font-mono text-ink-muted">{formatMoney(locale, size.priceCents, size.currency)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {approved && !canAdd && <p className="text-xs text-ink-muted">{t('limit')}</p>}

            {/* Error */}
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
```

The spec asks for the "Become a partner" sheet next to the non-partner line. The page already shows `PartnerPromptCard` when `showPartnerPrompt` is on, so the sheet is one tap away; adding a second "Become a partner" button here would repeat it. Keep the one line only.

`components/vendors/me/ServiceSheet.tsx`:

```tsx
'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { VendorServiceItemDto } from '@/lib/api/types';
import { centsToEuroInput, euroInputToCents } from '@/lib/printPicks';

// Add or edit one print size. Delete lives here, behind the screen's confirmation modal.
export function ServiceSheet({
    item,
    isSaving,
    error,
    onSaveAction,
    onDeleteAction,
    onCloseAction,
}: {
    item: VendorServiceItemDto | 'new';
    isSaving: boolean;
    error: string | null;
    onSaveAction: (label: string, priceCents: number) => void;
    onDeleteAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.services');
    const editing = item === 'new' ? null : item;
    const [label, setLabel] = useState(editing?.label ?? '');
    const [price, setPrice] = useState(editing ? centsToEuroInput(editing.priceCents) : '');
    const [touched, setTouched] = useState(false);
    const cents = euroInputToCents(price);
    const labelOk = label.trim().length > 0 && label.trim().length <= 40;

    function handleLabel(event: ChangeEvent<HTMLInputElement>) {
        setLabel(event.currentTarget.value);
    }

    function handlePrice(event: ChangeEvent<HTMLInputElement>) {
        setPrice(event.currentTarget.value);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched(true);
        if (labelOk && cents !== null) onSaveAction(label.trim(), cents);
    }

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{editing ? t('sheetEdit') : t('sheetAdd')}</h2>

                    {/* Size */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('label')}
                        <input value={label} onChange={handleLabel} maxLength={40} placeholder={t('labelPlaceholder')} className="min-h-11 rounded-lg border border-border bg-background px-3" />
                        {touched && !labelOk && <span className="text-xs text-rose-600">{t('labelRequired')}</span>}
                    </label>

                    {/* Price */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('price')}
                        <input value={price} onChange={handlePrice} inputMode="decimal" className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono" />
                        {touched && cents === null && <span className="text-xs text-rose-600">{t('priceInvalid')}</span>}
                    </label>

                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {editing ? (
                            <Button type="button" variant="ghost" size="lg" onClick={onDeleteAction} className="text-destructive">
                                <Trash2 aria-hidden="true" />
                                {t('delete')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button type="submit" size="lg" disabled={isSaving}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 6: Compose in `VendorMeScreen`**

In `components/vendors/me/VendorMeScreen.tsx`:

```tsx
    const prints = useVendorPrintsSection(eventId, me);
    const services = useVendorServicesSection(me);
```

After `{/* Tools */}` and before `{/* Pro album */}`:

```tsx
                    {/* Prints */}
                    {prints.open && (
                        <PrintsSection
                            included={prints.included}
                            items={prints.items}
                            removedCount={prints.removedCount}
                            totals={prints.totals}
                            partCount={prints.partCount}
                            isLoadingParts={prints.isLoadingParts}
                            downloadingPart={prints.downloadingPart}
                            isLoading={prints.isLoading}
                            error={prints.error}
                            onEditIncludedAction={prints.openIncluded}
                            onDownloadPartAction={prints.downloadHostPart}
                        />
                    )}
```

After `{/* Details */}` and before `{/* Partner */}`:

```tsx
                    {/* Services */}
                    {services.visible && (
                        <ServicesSection
                            approved={services.approved}
                            sizes={services.sizes}
                            canAdd={services.canAdd}
                            isLoading={services.isLoading}
                            error={services.editing ? null : services.error}
                            onAddAction={services.openNew}
                            onEditAction={services.openEdit}
                        />
                    )}
```

After `{/* Details sheet */}`:

```tsx
            {/* Prints included sheet */}
            <PrintsIncludedSheet
                key={prints.includedOpen ? 'open' : 'closed'}
                open={prints.includedOpen}
                initial={prints.included}
                isSaving={prints.isSavingIncluded}
                error={prints.error}
                onSaveAction={prints.saveIncluded}
                onCloseAction={prints.closeIncluded}
            />

            {/* Service sheet */}
            {services.editing && (
                <ServiceSheet
                    key={services.editing === 'new' ? 'new' : services.editing.id}
                    item={services.editing}
                    isSaving={services.isSaving}
                    error={services.error}
                    onSaveAction={services.save}
                    onDeleteAction={services.requestDelete}
                    onCloseAction={services.close}
                />
            )}

            {/* Service delete confirmation */}
            <ConfirmActionModal
                open={services.confirmDelete}
                onCloseAction={services.cancelDelete}
                onConfirmAction={services.confirmRemove}
                title={tServices('deleteTitle')}
                body={tServices('deleteBody')}
                confirmLabel={tServices('deleteConfirm')}
                cancelLabel={tServices('cancel')}
                isConfirming={services.isDeleting}
            />
```

with `const tServices = useTranslations('Vendors.services');` and the imports. Services sits on the vendor page of every event the photographer is in, because the sizes belong to the account; that matches the spec ("a Services section on the vendor page").

- [ ] **Step 7: Check**

Run: `npx vitest run components/vendors hooks`, `npx tsc --noEmit`, `npm run lint`
Expected: PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add hooks components/vendors messages
git commit -m "feat(print-picks): vendor page prints and print sizes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A9: Server prefetch

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/gallery/(root)/page.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/vendors/me/page.tsx`

- [ ] **Step 1: Gallery page**

Inside the existing `try`, after the media pages are seeded, for hosts with the vendors module readable (the same gate as `usePrintAvailability` + `usePrintPicksContext`):

```ts
            if (context.isHost && withPro) {
                // Print picks: the context, and the first photographer's host list (the list useGalleryPrint opens first).
                const printContext = await serverGet<PrintPicksContextDto>(endpoints.events.printPicks(eventId), context.accessToken).catch(() => null);
                if (printContext) {
                    queryClient.setQueryData(printListKeys.context(eventId), printContext);
                    const first = printContext.photographers[0];
                    if (first) {
                        const hostList = await serverGet<PrintListDto>(endpoints.events.hostPrintList(eventId, first.vendorId), context.accessToken).catch(() => null);
                        if (hostList) queryClient.setQueryData(printListKeys.host(eventId, first.vendorId), hostList);
                    }
                }
            }
```

(`withPro` is the existing `readableModuleKeys(event).has('vendors')`.) Run the print requests after `Promise.all` so a print failure never drops the media pages; each `.catch(() => null)` keeps the prefetch best-effort. Update the page comment to mention the print prefetch.

- [ ] **Step 2: Vendor page**

Inside the existing `if (me)` block, alongside the profile and Pro page:

```ts
                // Print picks: the same gate as useVendorPrintsSection (PRINT_PICKS open) and useVendorServicesSection.
                const withPrints = hasVendorCapability(me, 'PRINT_PICKS');
                const withServices = me.vendorType === 'PHOTOGRAPHER' && me.approvedPartner;
                const [printContext, hostList, services] = await Promise.all([
                    withPrints ? serverGet<PrintPicksContextDto>(endpoints.events.printPicks(eventId), context.accessToken).catch(() => null) : null,
                    withPrints ? serverGet<PrintListDto>(endpoints.events.hostPrintList(eventId, me.vendorId), context.accessToken).catch(() => null) : null,
                    withServices ? serverGet<VendorServiceItemDto[]>(endpoints.me.vendorServices, context.accessToken).catch(() => null) : null,
                ]);
                if (printContext) queryClient.setQueryData(printListKeys.context(eventId), printContext);
                if (hostList) queryClient.setQueryData(printListKeys.host(eventId, me.vendorId), hostList);
                if (services) queryClient.setQueryData(vendorServiceKeys.mine, services);
```

`usePrintPicksContext` is enabled only while the vendors module is readable; `PRINT_PICKS` is in `capabilities` only while it is, so the gates agree.

- [ ] **Step 3: Check**

Run: `npx tsc --noEmit`, `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/tools"
git commit -m "feat(print-picks): prefetch print lists on the gallery and vendor pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A10: Verify and hand over

- [ ] **Step 1: Full checks**

Run: `npm test`, `npm run lint`, `npx tsc --noEmit`
Expected: all green.

- [ ] **Step 2: Look at it**

With the backend Part A running locally and the user's local test login (ask for it), on :3000:
- Host on mobile (375 px): select photos → Print; viewer toggle; grid badges; the Prints pill and sheet; two photographers (add a second photographer vendor through a vendor link) and the switch.
- Photographer on mobile and desktop: the Prints section, the included sheet, the Print sizes section and its sheet with delete confirmation, Download (one button per part; part 1 holds `prints.txt`).
- Check that nothing overlaps the mobile selection bar and the floating desktop bar with the extra Print button.

- [ ] **Step 3: SEO**

No new routes. The gallery and vendor pages change content only. Check them against `docs/seo-guidelines.md` anyway and note "no SEO blockers" in the PR description.

- [ ] **Step 4: Hand over**

Tell the user Part A is ready for a PR into `staging`. Do not push until they say so.

---

# Part B — guest picks

### Task B1: Types, endpoints and the gallery gate

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/qrLinks.ts`, its test file
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/gallery/(root)/page.tsx` (only if it reads `isGalleryOpenToGuests`; it does)

- [ ] **Step 1: Types and endpoints**

`lib/api/types.ts`:
- `EventDetailResponseDto`: add `// What guests may pick for print now (print picks spec 2026-10-23).\n    guestPrintScope?: GuestPrintScope;` (optional: older cached details and fixtures lack it).
- Add:

```ts
export interface MyPrintListsDto {
    // The list being built; an empty list (id null) before the first pick.
    open: PrintListDto;
    // Newest first.
    sent: PrintListDto[];
}
```

`lib/api/endpoints.ts`, next to the Part A print endpoints:

```ts
        printPicksGuestScope: (eventId: string) => `/api/events/${eventId}/print-picks/guest-scope`,
        myPrintLists: (eventId: string, vendorId: string) => `/api/events/${eventId}/print-lists/mine?vendorId=${encodeURIComponent(vendorId)}`,
        myPrintItems: (eventId: string) => `/api/events/${eventId}/print-lists/mine/items`,
        sendMyPrintList: (eventId: string) => `/api/events/${eventId}/print-lists/mine/send`,
        guestPrintLists: (eventId: string) => `/api/events/${eventId}/print-lists/guests`,
```

- [ ] **Step 2: Write the failing gate test**

In the `lib/qrLinks` test file (`lib/qrLinks.test.ts`), add:

```ts
describe('isGalleryOpenToGuests with guest print picks', () => {
    const galleryOn = { moduleKey: 'gallery', enabled: true, readable: true, configuration: {} } as EventModuleResponseDto;

    it('opens the gallery when guests can pick for print, even without the member archive', () => {
        expect(isGalleryOpenToGuests({ deletedAt: null, modules: [galleryOn], guestPrintScope: 'OWN' })).toBe(true);
    });

    it('stays closed with print picks off and no archive', () => {
        expect(isGalleryOpenToGuests({ deletedAt: null, modules: [galleryOn], guestPrintScope: 'OFF' })).toBe(false);
    });
});
```

Build `galleryOn` the way the file's existing tests build a readable gallery module (copy their helper if they have one).

Run: `npx vitest run lib/qrLinks.test.ts`
Expected: FAIL (type error on `guestPrintScope`, then `false`).

- [ ] **Step 3: Implement**

`lib/qrLinks.ts`:

```ts
// Guests open the gallery when the member archive is on, or when they can pick photos for print.
export function isGalleryOpenToGuests(
    event: { deletedAt: string | null; suspended?: boolean; modules: EventModuleResponseDto[]; guestPrintScope?: GuestPrintScope } | null | undefined,
): boolean {
    return readableModuleKeys(event).has('gallery') && (isMemberArchiveEnabled(event?.modules) || (event?.guestPrintScope ?? 'OFF') !== 'OFF');
}
```

The gallery `page.tsx` and `PageClient.tsx` already use `isGalleryOpenToGuests`, so both the server prefetch and the client gate follow.

- [ ] **Step 4: Check and commit**

Run: `npx vitest run lib`, `npx tsc --noEmit`
Expected: PASS.

```bash
git add lib
git commit -m "feat(print-picks): open the gallery to guests with guest print picks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B2: Guest list hooks

**Files:**
- Modify: `hooks/usePrintLists.ts`, `hooks/usePrintLists.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `hooks/usePrintLists.test.tsx` (import the new hooks; `MyPrintListsDto` from types):

```tsx
    it('reads and sends a guest list, then refreshes the photographer view', async () => {
        const mine: MyPrintListsDto = { open: { ...list, ownerKind: 'GUEST' }, sent: [] };
        const after: MyPrintListsDto = { open: { ...list, id: null, ownerKind: 'GUEST', items: [] }, sent: [{ ...list, ownerKind: 'GUEST', status: 'SENT' }] };
        api.get.mockResolvedValue(mine);
        api.post.mockResolvedValue(after);
        const { queryClient, wrapper } = setup();
        const read = renderHook(() => useMyPrintLists('e1', 'v1', true), { wrapper });
        await waitFor(() => expect(read.result.current.data).toEqual(mine));
        const send = renderHook(() => useSendPrintList('e1'), { wrapper });
        await act(() => send.result.current.mutateAsync({ vendorId: 'v1', phone: '+30 690 000 0000' }));
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/print-lists/mine/send', { vendorId: 'v1', phone: '+30 690 000 0000' });
        expect(queryClient.getQueryData(printListKeys.mine('e1', 'v1'))).toEqual(after);
    });

    it('adds to the guest open list', async () => {
        api.post.mockResolvedValue({ ...list, ownerKind: 'GUEST' });
        const { queryClient, wrapper } = setup();
        queryClient.setQueryData(printListKeys.mine('e1', 'v1'), { open: { ...list, ownerKind: 'GUEST', items: [] }, sent: [] });
        const { result } = renderHook(() => useAddMyPrintItems('e1'), { wrapper });
        await act(() => result.current.mutateAsync({ vendorId: 'v1', mediaIds: ['m1'] }));
        expect(queryClient.getQueryData<MyPrintListsDto>(printListKeys.mine('e1', 'v1'))?.open.items).toHaveLength(1);
    });
```

Run: `npx vitest run hooks/usePrintLists.test.tsx`
Expected: FAIL (hooks missing).

- [ ] **Step 2: Implement**

Add to `hooks/usePrintLists.ts`:

```ts
// A guest's lists for one photographer: the open one and the sent ones.
export function useMyPrintLists(eventId: string | null, vendorId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: printListKeys.mine(eventId ?? '', vendorId ?? ''),
        queryFn: () => api.get<MyPrintListsDto>(endpoints.events.myPrintLists(eventId!, vendorId!)),
        enabled: Boolean(eventId && vendorId) && enabled && isAuthenticated,
    });
}

export function useAddMyPrintItems(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: { vendorId: string; mediaIds: string[] }) => api.post<PrintListDto>(endpoints.events.myPrintItems(eventId), body),
        onSuccess: (open, body) =>
            queryClient.setQueryData<MyPrintListsDto>(printListKeys.mine(eventId, body.vendorId), (before) => ({ open, sent: before?.sent ?? [] })),
    });
}

export function useSendPrintList(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: { vendorId: string; phone?: string }) => api.post<MyPrintListsDto>(endpoints.events.sendMyPrintList(eventId), body),
        onSuccess: (lists, body) => queryClient.setQueryData(printListKeys.mine(eventId, body.vendorId), lists),
    });
}

// The photographer's sent guest lists, newest first.
export function useGuestPrintLists(eventId: string | null, enabled: boolean) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: printListKeys.guests(eventId ?? ''),
        queryFn: () => api.get<PrintListDto[]>(endpoints.events.guestPrintLists(eventId!)),
        enabled: Boolean(eventId) && enabled && isAuthenticated,
    });
}

// The host's choice of what guests may pick. The server answers with the host's context.
export function useSetGuestPrintScope(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (scope: GuestPrintScope) => api.patch<PrintPicksContextDto>(endpoints.events.printPicksGuestScope(eventId), { scope }),
        onSuccess: (context) => {
            queryClient.setQueryData(printListKeys.context(eventId), context);
            // The event detail carries guestPrintScope; refresh it so the gallery gate follows.
            return queryClient.invalidateQueries({ queryKey: ['events', eventId], exact: true });
        },
    });
}
```

Find the event detail query key (`grep -rn "queryKey:.*eventId" hooks/useEvent*.ts | head`) and invalidate that exact key instead of `['events', eventId]` if it differs.

For a guest, `usePatchPrintItem` and `useRemovePrintItem` take a list key; a guest's items live inside `MyPrintListsDto.open`, not at a list key. Add a `select`-style adapter: give both hooks an optional third argument `shape: 'list' | 'mine' = 'list'`. With `'mine'`, read and write `data.open` instead of `data` everywhere the hooks touch the cache: the `updateItem` helper (patch `onMutate`/`onError`), the optimistic filter in remove's `onMutate`, the splice that puts the item back in remove's `onError` (same index, same 404 rule), and the `setQueryData` in both `onSuccess` handlers (still only when `isLast()`, then `onSettled` invalidates `listKey` the same way). Add tests mirroring the host ones with `printListKeys.mine('e1', 'v1')` and `'mine'`: "changes copies on a guest's open list", the overlapping-patch test (the later value wins), and the remove rollback.

- [ ] **Step 3: Run and commit**

Run: `npx vitest run hooks/usePrintLists.test.tsx`
Expected: PASS.

```bash
git add hooks/usePrintLists.ts hooks/usePrintLists.test.tsx
git commit -m "feat(print-picks): guest print list hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B3: Guest picks in the gallery

Load the `design:ux-copy` skill for the send step's wording before this task.

**Files:**
- Modify: `hooks/useGalleryPrint.ts`, `components/gallery/GalleryScreen.tsx`, `messages/en.json`, `messages/el.json`
- Create: `components/gallery/print/PrintSendSheet.tsx`, `SentListRow.tsx`, `PrintSendSheet.test.tsx`

- [ ] **Step 1: Add the copy**

`messages/en.json`, `GalleryPage.print`:

```json
            "send": "Send to photographer",
            "sendTitle": "Send your print list",
            "sendTotal": "{prints, plural, one {# print} other {# prints}} · {total}",
            "email": "Email",
            "phone": "Phone (optional)",
            "phoneInvalid": "Enter a phone number, or leave it empty.",
            "consent": "Your email and phone go to {photographer}, who will bill you and deliver the prints.",
            "sendConfirm": "Send",
            "sendCancel": "Back",
            "sent": "Sent",
            "sentRow": "{date} · {prints, plural, one {# print} other {# prints}} · {total}",
            "sentDone": "Sent to {photographer}.",
            "newList": "New list",
            "ownOnly": "You can pick only your own photos."
```

`messages/el.json`:

```json
            "send": "Αποστολή στον φωτογράφο",
            "sendTitle": "Αποστολή της λίστας σας",
            "sendTotal": "{prints, plural, one {# εκτύπωση} other {# εκτυπώσεις}} · {total}",
            "email": "Email",
            "phone": "Τηλέφωνο (προαιρετικό)",
            "phoneInvalid": "Γράψτε ένα τηλέφωνο ή αφήστε το κενό.",
            "consent": "Το email και το τηλέφωνό σας πηγαίνουν στον/στην {photographer}, που θα σας χρεώσει και θα παραδώσει τις εκτυπώσεις.",
            "sendConfirm": "Αποστολή",
            "sendCancel": "Πίσω",
            "sent": "Στάλθηκαν",
            "sentRow": "{date} · {prints, plural, one {# εκτύπωση} other {# εκτυπώσεις}} · {total}",
            "sentDone": "Στάλθηκε στον/στην {photographer}.",
            "newList": "Νέα λίστα",
            "ownOnly": "Μπορείτε να επιλέξετε μόνο τις δικές σας φωτογραφίες."
```

"New list" needs no action of its own: after a send, the open list is empty and the next pick starts it. Show `newList` as the empty-state hint under the sent rows instead of a button ("New list: pick photos in the gallery." is more copy than needed; use the plain `empty` line). Drop the `newList` key if the sheet ends up not using it.

- [ ] **Step 2: Write the send sheet test**

`components/gallery/print/PrintSendSheet.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrintSendSheet } from '@/components/gallery/print/PrintSendSheet';
import { renderWithIntl } from '@/test/renderWithIntl';

describe('PrintSendSheet', () => {
    it('shows the total, the read-only email and the consent line, then sends with the phone', () => {
        const onSendAction = vi.fn();
        renderWithIntl(<PrintSendSheet open prints={3} totalCents={900} email="guest@example.com" photographer="Lens & Light" isSending={false} error={null} onSendAction={onSendAction} onCloseAction={vi.fn()} />);
        expect(screen.getByText('3 prints · €9.00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('guest@example.com')).toHaveAttribute('readonly');
        expect(screen.getByText(/go to Lens & Light/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Phone (optional)'), { target: { value: '+30 690 000 0000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(onSendAction).toHaveBeenCalledWith('+30 690 000 0000');
    });

    it('refuses a phone that is not one', () => {
        const onSendAction = vi.fn();
        renderWithIntl(<PrintSendSheet open prints={1} totalCents={300} email="g@e.com" photographer="P" isSending={false} error={null} onSendAction={onSendAction} onCloseAction={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Phone (optional)'), { target: { value: 'call me' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(onSendAction).not.toHaveBeenCalled();
        expect(screen.getByText('Enter a phone number, or leave it empty.')).toBeInTheDocument();
    });
});
```

Run: `npx vitest run components/gallery/print`
Expected: FAIL.

- [ ] **Step 3: Write the components**

Add to `lib/printPicks.ts` (and a test case in `lib/printPicks.test.ts`: `'+30 690 000 0000'` valid, `''` valid, `'call me'` invalid):

```ts
// The backend's phone rule: 6–30 of digits, spaces, +, (, ), -. Empty is fine (the phone is optional).
export function isValidPrintPhone(text: string): boolean {
    const trimmed = text.trim();
    return trimmed === '' || /^[+0-9 ()-]{6,30}$/.test(trimmed);
}
```

`components/gallery/print/PrintSendSheet.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatMoney } from '@/lib/billing';
import { isValidPrintPhone } from '@/lib/printPicks';

// The guest's confirm step: total, email, optional phone, and what is shared with whom.
export function PrintSendSheet({
    open,
    prints,
    totalCents,
    email,
    photographer,
    isSending,
    error,
    onSendAction,
    onCloseAction,
}: {
    open: boolean;
    prints: number;
    totalCents: number;
    email: string;
    photographer: string;
    isSending: boolean;
    error: string | null;
    onSendAction: (phone: string) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();
    const [phone, setPhone] = useState('');
    const [touched, setTouched] = useState(false);
    const phoneOk = isValidPrintPhone(phone);

    function handlePhone(event: ChangeEvent<HTMLInputElement>) {
        setPhone(event.currentTarget.value);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched(true);
        if (phoneOk) onSendAction(phone.trim());
    }

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('sendCancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    {/* Header */}
                    <div className="pr-8">
                        <h2 className="text-base font-bold text-ink">{t('sendTitle')}</h2>
                        <p className="text-sm font-semibold text-ink">{t('sendTotal', { prints, total: formatMoney(locale, totalCents, 'EUR') })}</p>
                    </div>

                    {/* Contact */}
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('email')}
                        <input value={email} readOnly className="min-h-11 rounded-lg border border-border bg-surface-muted px-3 text-ink-muted" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-ink">
                        {t('phone')}
                        <input value={phone} onChange={handlePhone} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} className="min-h-11 rounded-lg border border-border bg-background px-3" />
                        {touched && !phoneOk && <span className="text-xs text-rose-600">{t('phoneInvalid')}</span>}
                    </label>

                    {/* Consent */}
                    <p className="text-sm text-ink-muted">{t('consent', { photographer })}</p>

                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction}>
                            {t('sendCancel')}
                        </Button>
                        <Button type="submit" size="lg" disabled={isSending}>
                            {t('sendConfirm')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
```

`components/gallery/print/SentListRow.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { PrintListDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';

// A guest's sent list: read-only, with the copied total.
export function SentListRow({ list }: { list: PrintListDto }) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();
    const prints = list.items.reduce((sum, item) => sum + item.copies, 0);

    return (
        <li className="py-2 text-sm text-ink">
            {t('sentRow', {
                date: list.sentAt ? formatDate(locale, list.sentAt, { dateStyle: 'medium' }) : '',
                prints,
                total: formatMoney(locale, list.totalCents ?? 0, 'EUR'),
            })}
        </li>
    );
}
```

Run: `npx vitest run components/gallery/print lib/printPicks.test.ts`
Expected: PASS.

- [ ] **Step 4: Guest mode in `useGalleryPrint`**

Change `usePrintAvailability`:

```ts
export function usePrintAvailability(eventId: string | null, isHost: boolean) {
    const context = usePrintPicksContext(eventId);
    const photographers = context.data?.photographers ?? [];
    const guestScope = context.data?.guestScope ?? 'OFF';
    // Hosts pick for any open photographer; guests need guest picks on (the server lists only priced photographers to them).
    return { available: photographers.length > 0 && (isHost || guestScope !== 'OFF'), photographers, guestScope };
}
```

In `useGalleryPrint`, add the inputs `guestScope: GuestPrintScope`, `memberId: string | null` (the caller's member id: `useActiveMember()?.id`) and `email: string | null` (`useAuth().user?.email`), and branch the data source on `isHost`:

```ts
    const hostList = useHostPrintList(eventId, vendorId, available && isHost);
    const myLists = useMyPrintLists(eventId, vendorId, available && !isHost);
    const listKey = isHost ? printListKeys.host(eventId, vendorId ?? '') : printListKeys.mine(eventId, vendorId ?? '');
    const shape = isHost ? 'list' : 'mine';
    const addHost = useAddHostPrintItems(eventId);
    const addMine = useAddMyPrintItems(eventId);
    const addItems = isHost ? addHost : addMine;
    const patchItem = usePatchPrintItem(eventId, listKey, shape);
    const removeItem = useRemovePrintItem(eventId, listKey, shape);
    const send = useSendPrintList(eventId);
    const [sendOpen, setSendOpen] = useState(false);

    const openList = isHost ? hostList.data : myLists.data?.open;
    const sentLists = isHost ? [] : (myLists.data?.sent ?? []);
    const items = useMemo(() => openList?.items ?? [], [openList?.items]);
```

Calling both add hooks and picking one keeps the hook order fixed (no conditional hooks).

Scope filter for `OWN`: in `addSelected`, keep only the caller's uploads before sending, and count the rest as skipped with the `ownOnly` notice:

```ts
    const allowed = useCallback(
        (item: MediaResponseDto) => isHost || guestScope === 'ANY' || item.uploaderMemberId === memberId,
        [guestScope, isHost, memberId],
    );
```

Check the uploader field name on `MediaResponseDto` (`uploaderMemberId` or `uploader.memberId`) and use it. `printableIds` gets an optional filter: change its signature to `printableIds(media, selected, allow: (item) => boolean = () => true)` and count refused photos in `skipped` (update its test with one `allow` case). The notice: `skipped ? (guestScope === 'OWN' && !isHost ? t('ownOnly') : t('skippedNotPrintable')) : t('added', …)`.

The viewer toggle: `available && viewerMedia && isPrintable(viewerMedia) && allowed(viewerMedia)`.

Send:

```ts
    const sendList = useCallback(
        async (phone: string) => {
            if (!vendorId) return;
            setError(null);
            try {
                await send.mutateAsync({ vendorId, ...(phone && { phone }) });
                setSendOpen(false);
                setNotice(t('sentDone', { photographer: photographer?.businessName ?? t('photographerUnnamed') }));
            } catch (sendError) {
                setError(toErrorMessage(sendError));
            }
        },
        [photographer?.businessName, send, t, toErrorMessage, vendorId],
    );
```

Return, in addition: `isGuest: !isHost`, `sentLists`, `canSend: !isHost && totals.prints > 0 && totals.hasPrices`, `email: email ?? ''`, `sendOpen`, `openSend`, `closeSend`, `sendList`, `isSending: send.isPending`.

- [ ] **Step 5: Wire the guest flow in `GalleryScreen`**

- Pass `guestScope`, `memberId` and `email` into `useGalleryPrint`.
- Header: today the ternary shows either the host actions (`showGalleryActions`) or the member archive button. Guests with print picks now get `showGalleryActions` too, so put the archive button inside the actions row: in the non-selection branch's right-hand group, render `{showArchiveDownload && …Download gallery…}` (host) and `{showMemberArchive && …Download gallery (member archive)…}` (guest) next to the Print pill, and drop the separate `showMemberArchive` branch of the ternary. Keep one Download button per audience.
- `PrintSheet`'s `footer` for guests:

```tsx
                    footer={
                        print.isGuest && (
                            <>
                                {/* Send */}
                                {print.canSend && (
                                    <Button type="button" size="lg" className="mt-4 w-full" onClick={print.openSend}>
                                        {tPrint('send')}
                                    </Button>
                                )}

                                {/* Sent lists */}
                                {print.sentLists.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-semibold text-ink">{tPrint('sent')}</h3>
                                        <ul className="mt-1 divide-y divide-border">
                                            {print.sentLists.map((list) => (
                                                <SentListRow key={list.id} list={list} />
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )
                    }
```

- After the sheet:

```tsx
            {/* Send */}
            {print.isGuest && print.photographer && (
                <PrintSendSheet
                    key={print.sendOpen ? 'open' : 'closed'}
                    open={print.sendOpen}
                    prints={print.totals.prints}
                    totalCents={print.totals.priceCents ?? 0}
                    email={print.email}
                    photographer={print.photographer.businessName ?? tPrint('photographerUnnamed')}
                    isSending={print.isSending}
                    error={print.error}
                    onSendAction={print.sendList}
                    onCloseAction={print.closeSend}
                />
            )}
```

The Prints pill for a guest also shows when they only have sent lists (`print.pickCount > 0 || print.sentLists.length > 0`), so they can read them: pass `count={print.pickCount}`; with zero open picks the pill reads "Prints · 0", which is acceptable for the read-only history. 30 days after access ends the backend still answers `mine` with the sent lists, but the context lists no photographer, so `available` is false and the pill is gone. To keep the history reachable for those 30 days, the sent lists need a place without the context: **leave this for review** — say so in the PR, since the spec asks for it. (Simplest follow-up: the backend context also returns photographers whose window closed in the last 30 days with an `open: false` flag; the gallery then shows the pill and sheet read-only.)

- [ ] **Step 6: Prefetch the guest's lists**

In the gallery `page.tsx` print block, for a non-host whose event has `guestPrintScope !== 'OFF'`: fetch the context and, for the first photographer, `myPrintLists`, seeding `printListKeys.mine(eventId, first.vendorId)`. Same best-effort `.catch(() => null)`.

- [ ] **Step 7: Check and commit**

Run: `npx vitest run components/gallery hooks lib`, `npx tsc --noEmit`, `npm run lint`
Expected: PASS, clean.

```bash
git add components/gallery hooks lib messages "app/(main)/(app)/(event)/events/[eventId]/tools/gallery"
git commit -m "feat(print-picks): guest print lists in the gallery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B4: Host setting in Manage → Vendors

**Files:**
- Create: `components/vendors/manage/GuestPrintPicksControl.tsx`, `hooks/useGuestPrintPicksSetting.ts`
- Modify: `components/vendors/manage/ManageVendorsScreen.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Copy**

`messages/en.json`, `Vendors.manage`:

```json
            "guestPrints": {
                "title": "Guest prints",
                "OFF": "Off",
                "OWN": "Their own photos",
                "ANY": "Any photo",
                "hint": "Guests order and pay the photographer directly.",
                "planLimit": "Your plan allows up to: {scope}."
            },
```

`messages/el.json`:

```json
            "guestPrints": {
                "title": "Εκτυπώσεις καλεσμένων",
                "OFF": "Ανενεργό",
                "OWN": "Τις δικές τους φωτογραφίες",
                "ANY": "Οποιαδήποτε φωτογραφία",
                "hint": "Οι καλεσμένοι παραγγέλνουν και πληρώνουν απευθείας τον φωτογράφο.",
                "planLimit": "Το πακέτο σας επιτρέπει έως: {scope}."
            },
```

The plan limit is not in the context today. Read the event's vendors module `configuration.guestPrintPicks` (the event detail's modules carry each module's config; see `eventModuleCount` in `lib/planModuleConfig.ts`) and disable the options above it. Drop the `planLimit` line if disabled options read clearly on their own (check the screenshot).

- [ ] **Step 2: Hook**

`hooks/useGuestPrintPicksSetting.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { usePrintPicksContext, useSetGuestPrintScope } from '@/hooks/usePrintLists';
import type { GuestPrintScope } from '@/lib/api/types';
import { useActiveEvent } from '@/providers/EventProvider';

const ORDER: GuestPrintScope[] = ['OFF', 'OWN', 'ANY'];

// The host's guest prints control: shown once a photographer has print prices, options above the plan's limit off.
export function useGuestPrintPicksSetting(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const activeEvent = useActiveEvent();
    const context = usePrintPicksContext(eventId);
    const setScope = useSetGuestPrintScope(eventId);
    const [error, setError] = useState<string | null>(null);
    const vendorsConfig = activeEvent?.modules.find((module) => module.moduleKey === 'vendors')?.configuration;
    const ceiling = (vendorsConfig?.guestPrintPicks as GuestPrintScope | undefined) ?? 'OFF';

    const choose = useCallback(
        async (scope: GuestPrintScope) => {
            setError(null);
            try {
                await setScope.mutateAsync(scope);
            } catch (setError_) {
                setError(toErrorMessage(setError_));
            }
        },
        [setScope, toErrorMessage],
    );

    return {
        visible: ceiling !== 'OFF' && (context.data?.photographers ?? []).some((p) => p.sizes.length > 0),
        value: context.data?.guestScope ?? 'OFF',
        options: ORDER.map((scope) => ({ scope, disabled: ORDER.indexOf(scope) > ORDER.indexOf(ceiling) })),
        choose,
        isSaving: setScope.isPending,
        error,
    };
}
```

Rename `setError_` to `chooseError` to keep lint's naming rules happy. The host's context `guestScope` is the effective value (host choice capped by the plan), which is what the control should show.

- [ ] **Step 3: Component**

`components/vendors/manage/GuestPrintPicksControl.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { GuestPrintScope } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function GuestPrintPicksControl({
    value,
    options,
    isSaving,
    error,
    onChooseAction,
}: {
    value: GuestPrintScope;
    options: { scope: GuestPrintScope; disabled: boolean }[];
    isSaving: boolean;
    error: string | null;
    onChooseAction: (scope: GuestPrintScope) => void;
}) {
    const t = useTranslations('Vendors.manage.guestPrints');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChooseAction(event.currentTarget.dataset.scope as GuestPrintScope);
    }

    return (
        <section aria-labelledby="guest-prints-title" className="flex flex-col gap-2">
            {/* Header */}
            <h2 id="guest-prints-title" className="text-sm font-semibold text-ink">
                {t('title')}
            </h2>

            {/* Choice */}
            <div className="flex gap-1 rounded-full bg-surface-muted p-1">
                {options.map(({ scope, disabled }) => (
                    <button
                        key={scope}
                        type="button"
                        data-scope={scope}
                        onClick={handleClick}
                        disabled={disabled || isSaving}
                        aria-pressed={value === scope}
                        className={cn(
                            'min-h-10 flex-1 rounded-full px-2 text-sm font-semibold transition-colors disabled:opacity-40',
                            value === scope ? 'bg-background text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        {t(scope)}
                    </button>
                ))}
            </div>
            <p className="text-xs text-ink-muted">{t('hint')}</p>

            {/* Error */}
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
```

"Their own photos" is long in Greek on a 375 px screen; check the screenshot and let the buttons wrap to two lines (`leading-tight`, drop `min-h` to fit) rather than truncating.

- [ ] **Step 4: Compose**

In `ManageVendorsScreen.tsx`, `const guestPrints = useGuestPrintPicksSetting(eventId);` and, after the `{/* Joined */}` section:

```tsx
                    {/* Guest prints */}
                    {guestPrints.visible && (
                        <GuestPrintPicksControl value={guestPrints.value} options={guestPrints.options} isSaving={guestPrints.isSaving} error={guestPrints.error} onChooseAction={guestPrints.choose} />
                    )}
```

Add the Manage → Vendors page's prefetch of `printListKeys.context(eventId)` for hosts in its `page.tsx`, with the same best-effort pattern (find the page: `app/(main)/(app)/(event)/events/[eventId]/manage/vendors/page.tsx`).

- [ ] **Step 5: Check and commit**

Run: `npx tsc --noEmit`, `npm run lint`, `npx vitest run components/vendors`
Expected: clean.

```bash
git add hooks components/vendors messages app
git commit -m "feat(print-picks): host guest prints setting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B5: Photographer's Guests tab

**Files:**
- Create: `components/vendors/me/GuestPrintLists.tsx`, `GuestPrintListRow.tsx`
- Modify: `hooks/useVendorPrintsSection.ts`, `components/vendors/me/PrintsSection.tsx`, `components/vendors/me/PrintsSection.test.tsx`, `components/vendors/me/VendorMeScreen.tsx`, the vendor-me `page.tsx`, messages

- [ ] **Step 1: Copy**

`Vendors.prints` in en:

```json
            "tabHost": "Host",
            "tabGuests": "Guests",
            "guestsEmpty": "No guest has sent a list yet.",
            "guestRow": "{date} · {prints, plural, one {# print} other {# prints}} · {total}",
            "download": "Download"
```

el:

```json
            "tabHost": "Διοργανωτές",
            "tabGuests": "Καλεσμένοι",
            "guestsEmpty": "Κανένας καλεσμένος δεν έχει στείλει ακόμη λίστα.",
            "guestRow": "{date} · {prints, plural, one {# εκτύπωση} other {# εκτυπώσεις}} · {total}",
            "download": "Λήψη"
```

- [ ] **Step 2: Hook**

In `useVendorPrintsSection`: `const [tab, setTab] = useState<'HOST' | 'GUEST'>('HOST');`, `const guests = useGuestPrintLists(eventId, open);`, and

```ts
    const loadGuestParts = useGuestPrintListParts(eventId);
    const [loadingGuestId, setLoadingGuestId] = useState<string | null>(null);
    const [guestParts, setGuestParts] = useState<{ listId: string; count: number } | null>(null);
    const guestFileStem = (listId: string) => `prints-guest-${listId.slice(0, 8)}`;

    // One Download per guest list. One part downloads at once; more show a "Part n of N" button each.
    const startGuestDownload = useCallback(
        async (listId: string) => {
            setError(null);
            setLoadingGuestId(listId);
            try {
                const count = await loadGuestParts(listId);
                if (count === 1) await download.mutateAsync({ listId, part: 1, fileStem: guestFileStem(listId) });
                else if (count > 1) setGuestParts({ listId, count });
            } catch (downloadError) {
                setError(toErrorMessage(downloadError));
            } finally {
                setLoadingGuestId(null);
            }
        },
        [download, loadGuestParts, toErrorMessage],
    );

    const downloadGuestPart = useCallback(
        async (listId: string, part: number) => {
            setError(null);
            try {
                await download.mutateAsync({ listId, part, fileStem: guestFileStem(listId) });
            } catch (downloadError) {
                setError(toErrorMessage(downloadError));
            }
        },
        [download, toErrorMessage],
    );
```

Return `tab`, `selectTab: setTab`, `guestLists: guests.data ?? []`, `isLoadingGuests: guests.isLoading`, `startGuestDownload`, `downloadGuestPart`, `guestParts`, and the busy state: `isGuestBusy: loadingGuestId !== null || download.isPending`, `activeGuestId: loadingGuestId ?? (download.isPending ? download.variables?.listId : null) ?? null`, `activeGuestPart: download.isPending ? (download.variables?.part ?? null) : null`. Add to `hooks/usePrintLists.ts` the on-demand loader (no query runs until a guest's Download is clicked):

```ts
// Loads one guest list's manifest when asked and answers its part count (0: nothing to download).
export function useGuestPrintListParts(eventId: string) {
    const queryClient = useQueryClient();

    return useCallback(
        async (listId: string) => {
            const manifest = await queryClient.fetchQuery({
                queryKey: printListKeys.archive(eventId, listId),
                queryFn: () => api.get<PrintListArchiveManifestDto>(endpoints.events.printListArchiveManifest(eventId, listId)),
                staleTime: 0,
            });
            return manifest.parts.length;
        },
        [eventId, queryClient],
    );
}
```

The rows stay presentational: `GuestPrintLists` maps `guestParts`, `activeGuestId`, `activeGuestPart` and `isGuestBusy` onto each row. While any guest download is loading or pending, every download button is disabled, and only the active row shows "Downloading…" (the host button's logic). Reuse the copy keys `download`, `downloading` and `downloadPart`.
```tsx
'use client';

import { Download, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { PrintListDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';

// One sent guest list: who, how to reach them, what and how much.
export function GuestPrintListRow({
    list,
    partCount,
    isActive,
    activePart,
    isBusy,
    onStartAction,
    onDownloadPartAction,
}: {
    list: PrintListDto;
    // 0 until the guest's Download has loaded the parts.
    partCount: number;
    isActive: boolean;
    activePart: number | null;
    isBusy: boolean;
    onStartAction: (listId: string) => void;
    onDownloadPartAction: (listId: string, part: number) => void;
}) {
    const t = useTranslations('Vendors.prints');
    const locale = useLocale();
    const prints = list.items.filter((item) => !item.removed).reduce((sum, item) => sum + item.copies, 0);

    return (
        <li className="flex flex-col gap-1 py-3 text-sm">
            {/* Guest */}
            <p className="font-semibold text-ink">{list.ownerName}</p>
            <p className="text-ink-muted">
                <a href={`mailto:${list.contactEmail}`} className="underline-offset-2 hover:underline">
                    {list.contactEmail}
                </a>
                {list.contactPhone && (
                    <>
                        {' · '}
                        <a href={`tel:${list.contactPhone.replace(/\s/g, '')}`} className="underline-offset-2 hover:underline">
                            {list.contactPhone}
                        </a>
                    </>
                )}
            </p>

            {/* Order */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink">
                    {t('guestRow', {
                        date: list.sentAt ? formatDate(locale, list.sentAt, { dateStyle: 'medium' }) : '',
                        prints,
                        total: formatMoney(locale, list.totalCents ?? 0, 'EUR'),
                    })}
                </p>
                <div className="flex flex-wrap gap-2">
                    {partCount > 1 ? (
                        Array.from({ length: partCount }, (_, index) => index + 1).map((part) => (
                            <Button key={part} type="button" variant="outline" size="lg" onClick={() => list.id && onDownloadPartAction(list.id, part)} disabled={isBusy}>
                                {activePart === part ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                                {activePart === part ? t('downloading') : t('downloadPart', { part, total: partCount })}
                            </Button>
                        ))
                    ) : (
                        <Button type="button" variant="outline" size="lg" onClick={() => list.id && onStartAction(list.id)} disabled={isBusy}>
                            {isActive ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                            {isActive ? t('downloading') : t('download')}
                        </Button>
                    )}
                </div>
            </div>
            {list.removedCount > 0 && <p className="text-xs text-ink-muted">{t('removedCount', { count: list.removedCount })}</p>}
        </li>
    );
}
```

`components/vendors/me/GuestPrintLists.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { GuestPrintListRow } from '@/components/vendors/me/GuestPrintListRow';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { PrintListDto } from '@/lib/api/types';

// Sent guest lists, newest first. The spec groups by guest; one row per list already carries the guest's name,
// and a guest with two lists gets two rows next to each other only if they sent them back to back.
export function GuestPrintLists({ lists, isLoading, guestParts, activeGuestId, activeGuestPart, isBusy, onStartAction, onDownloadPartAction }: { lists: PrintListDto[]; isLoading: boolean; guestParts: { listId: string; count: number } | null; activeGuestId: string | null; activeGuestPart: number | null; isBusy: boolean; onStartAction: (listId: string) => void; onDownloadPartAction: (listId: string, part: number) => void }) {
    const t = useTranslations('Vendors.prints');

    if (isLoading) return <VendorRowsSkeleton rows={3} />;
    if (lists.length === 0) return <p className="text-sm text-ink-muted">{t('guestsEmpty')}</p>;

    return (
        <ul className="divide-y divide-border">
            {lists.map((list) => (
                <GuestPrintListRow key={list.id} list={list} partCount={guestParts?.listId === list.id ? guestParts.count : 0} isActive={activeGuestId === list.id} activePart={activeGuestId === list.id ? activeGuestPart : null} isBusy={isBusy} onStartAction={onStartAction} onDownloadPartAction={onDownloadPartAction} />
            ))}
        </ul>
    );
}
```

The spec says "grouped by guest". Sort `lists` by `ownerName` then `sentAt desc` in `useVendorPrintsSection` (a stable `toSorted`), so a guest's lists sit together; then remove the hedging comment above and write "Sent guest lists, grouped by guest, newest first."

`PrintsSection`: when `tabs` is set, render the existing Host content only for the Host tab and `guests` (a new `ReactNode` prop) for the Guests tab. Simplest: replace the `tabs?: ReactNode` prop with:

```ts
    tab?: 'HOST' | 'GUEST';
    showTabs?: boolean;
    onSelectTabAction?: (tab: 'HOST' | 'GUEST') => void;
    guests?: ReactNode;
```

render `SubTabs` (from `@/components/ui/SubTabs`, as the gallery album tabs do) when `showTabs`, and `{tab === 'GUEST' ? guests : <>…Included, Host picks, Total…</>}`. Add a test case: with `showTabs` and `tab="GUEST"`, the guests node shows and "Prints included for the host" does not.

- [ ] **Step 4: Prefetch**

In the vendor-me `page.tsx`, add `useGuestPrintLists`'s request to the `withPrints` `Promise.all` and seed `printListKeys.guests(eventId)`.

- [ ] **Step 5: Check and commit**

Run: `npx vitest run components/vendors hooks`, `npx tsc --noEmit`, `npm run lint`
Expected: PASS, clean.

```bash
git add hooks components/vendors messages app
git commit -m "feat(print-picks): photographer's guest lists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B6: Admin plan config — `guestPrintPicks` as a segmented control

**Files:**
- Modify: `lib/planModuleConfig.ts`, its test (`lib/planModuleConfig.test.ts`), `components/admin/plans/PlanModuleConfigField.tsx`, `hooks/usePlanModuleCellDraft.ts`, messages
- Create: `components/admin/plans/PlanModuleChoiceField.tsx`

- [ ] **Step 1: Write the failing tests**

In `lib/planModuleConfig.test.ts`:

```ts
describe('choice fields', () => {
    it('drafts, merges and describes guestPrintPicks', () => {
        const draft = knownDraftFromConfig('vendors', { maxVendors: 5, accessDaysAfterEvent: 30, proStorageBytes: 0, guestPrintPicks: 'OWN' });
        expect(draft.guestPrintPicks).toBe('OWN');
        const merged = mergeConfigDraft('vendors', { ...draft, guestPrintPicks: 'ANY' }, { allowedTypes: [] });
        expect(merged.guestPrintPicks).toBe('ANY');
        const changes = readableConfigChanges('vendors', { guestPrintPicks: 'OWN' }, { guestPrintPicks: 'ANY' }, {
            field: (key) => key,
            unlimited: 'Unlimited',
            upTo: (n) => `Up to ${n}`,
            on: 'On',
            off: 'Off',
            none: '—',
            choice: (key, value) => `${key}:${value}`,
        });
        expect(changes).toEqual([{ key: 'guestPrintPicks', before: 'guestPrintPicks:OWN', after: 'guestPrintPicks:ANY' }]);
    });

    it('drops a value that is not an option', () => {
        expect(mergeConfigDraft('vendors', { guestPrintPicks: 'SOME' }, {}).guestPrintPicks).toBeUndefined();
    });
});
```

Run: `npx vitest run lib/planModuleConfig.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement in `lib/planModuleConfig.ts`**

- `KnownConfigField` gains `| { key: string; type: 'choice'; options: readonly string[]; hint?: boolean }`; update the comment above it: "A `choice` is one of a few strings, shown as a segmented control with a caption (fieldHints.<key>)."
- `vendors` gains `{ key: 'guestPrintPicks', type: 'choice', options: ['OFF', 'OWN', 'ANY'], hint: true },` and the comment "guestPrintPicks: what guests may pick for print (print picks spec 2026-10-23); missing reads OFF on the server."
- `mergeConfigDraft`: after the boolean branch,

```ts
        if (field.type === 'choice') {
            if (raw !== undefined && field.options.includes(raw)) merged[field.key] = raw;
            continue;
        }
```

- `knownDraftFromConfig` already turns strings into drafts (`String(value)`); no change.
- `ConfigValueLabels` gains `choice: (key: string, value: string) => string;`, and `readableConfigChanges`'s `describe` gains, first: `if (field.type === 'choice') return typeof value === 'string' ? labels.choice(field.key, value) : labels.none;`.
- `limitedKeysFromDraft` filters `type === 'number'`, so choices are not counted as limits; no change.

Run: `npx vitest run lib/planModuleConfig.test.ts`
Expected: PASS. Then `npx tsc --noEmit` and fix every `ConfigValueLabels` builder (`hooks/usePlanModuleCellDraft.ts` line ~80) by adding:

```ts
                choice: (key, value) => t(`plans.grid.cell.choices.${key}.${value}`),
```

- [ ] **Step 3: The control**

Messages under `AdminPage.plans.grid.cell` (en):

```json
                "choices": {
                    "guestPrintPicks": {
                        "OFF": "Off",
                        "OWN": "Own photos",
                        "ANY": "Any photo"
                    }
                },
```

and in `fields`: `"guestPrintPicks": "Guest prints"`, in `fieldHints`: `"guestPrintPicks": "What guests may pick for print. Hosts choose up to this."`. el: `"OFF": "Ανενεργό"`, `"OWN": "Δικές τους φωτογραφίες"`, `"ANY": "Οποιαδήποτε φωτογραφία"`, field `"Εκτυπώσεις καλεσμένων"`, hint `"Τι μπορούν να επιλέξουν οι καλεσμένοι για εκτύπωση. Οι διοργανωτές επιλέγουν έως αυτό."`.

`components/admin/plans/PlanModuleChoiceField.tsx` — the console's segmented control, styled like `VisibilitySegmentedControl` (same token classes, so it matches the admin reference design):

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export function PlanModuleChoiceField({ fieldKey, options, value, hint, onChangeAction }: { fieldKey: string; options: readonly string[]; value: string; hint?: boolean; onChangeAction: (key: string, value: string) => void }) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(fieldKey, event.currentTarget.dataset.option as string);
    }

    return (
        <div>
            <p className="mb-2 text-sm font-bold text-ink">{t(`fields.${fieldKey}`)}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-option={option}
                        onClick={handleClick}
                        aria-pressed={value === option}
                        className={cn('flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors', value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted')}
                    >
                        {t(`choices.${fieldKey}.${option}`)}
                    </button>
                ))}
            </div>
            {hint && <p className="mt-1.5 text-xs text-ink-muted">{t(`fieldHints.${fieldKey}`)}</p>}
        </div>
    );
}
```

In `PlanModuleConfigField.tsx`, add the prop `onChoiceChangeAction: (key: string, value: string) => void` and, before the boolean branch:

```tsx
    if (field.type === 'choice') {
        return <PlanModuleChoiceField fieldKey={field.key} options={field.options} value={value} hint={field.hint} onChangeAction={onChoiceChangeAction} />;
    }
```

Wire `onChoiceChangeAction` from wherever `PlanModuleConfigField` is rendered: it sets the draft value the same way `onLimitValueChangeAction` does (`grep -rn "PlanModuleConfigField" components hooks` to find the caller and the draft setter; pass the same setter).

A plan whose stored config lacks the key drafts `''`, which shows no option pressed; the server reads it as `OFF`. Show `OFF` pressed for an empty draft: in `PlanModuleChoiceField`, `const current = value || options[0];` and compare against `current`.

- [ ] **Step 4: Check and commit**

Run: `npx vitest run lib components/admin hooks`, `npx tsc --noEmit`, `npm run lint`
Expected: PASS, clean. Look at the plan grid's vendors cell on desktop.

```bash
git add lib components/admin hooks messages
git commit -m "feat(print-picks): guest prints plan setting in admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B7: Legal copy, verify, hand over

**Files:**
- Modify: the privacy and terms pages' messages (find them: `grep -rln "\"Privacy\|\"Terms" messages/en.json` and the matching `app/(marketing)` or `app/(legal)` routes)

- [ ] **Step 1: Legal lines**

Add, in en and el, to the privacy notice's "who we share data with" part:
- en: "If you send a print list, we share your name, email and phone (if you give one) with the event's photographer you sent it to."
- el: "Αν στείλετε λίστα εκτυπώσεων, μοιραζόμαστε το όνομα, το email και το τηλέφωνό σας (αν το δώσετε) με τον φωτογράφο της εκδήλωσης στον οποίο τη στείλατε."

To the terms, near the vendor terms:
- en: "Prints are ordered from and paid to the photographer. StoryWall is not a party to that order."
- el: "Οι εκτυπώσεις παραγγέλνονται και πληρώνονται απευθείας στον φωτογράφο. Το StoryWall δεν είναι μέρος αυτής της παραγγελίας."

If the legal pages carry a "last updated" date, update it. The spec says this copy is reviewed before Part B ships: ask the user to review it in the PR.

- [ ] **Step 2: Full checks and screenshots**

Run: `npm test`, `npm run lint`, `npx tsc --noEmit`. Then, with backend Part B running, check on mobile: a guest with scope `OWN` (others' photos refused with the notice), `ANY`, the send sheet, a sent list in the sheet, a new list after sending; the host's Guest prints control; the photographer's Guests tab and download; the admin plan grid on desktop.

- [ ] **Step 3: SEO**

Legal pages changed content only; no new routes. Check against `docs/seo-guidelines.md` and note the result in the PR.

- [ ] **Step 4: Hand over**

Tell the user Part B is ready for a PR into `staging`, with the open item from Task B3 Step 5 (sent lists after the access window) called out. Do not push until they say so.

---

## Self-review (done while writing)

- Spec coverage: services UI partner-only (A8), PRINT_PICKS (A5), photos only (A2, A7), Print in selection bar and actions (A7), viewer toggle and grid badge (A7), Prints pill and sheet with total line (A7), two photographers (A6, A7), no-price wording (A2, A7), vendor Prints section with included sheet and per-part Download (A8), prefetch (A9, B3, B4, B5), notices (A5), gallery opens to guests (B1), guest scope filter (B3), send step with consent and phone (B3), sent lists and new list (B3), host control (B4), Guests tab with contact and removed count (B5), admin segmented control (B6), legal (B7).
- Gap kept open on purpose and flagged: sent lists visible for 30 days after access ends (B3 Step 5) needs a small backend addition.
- Decision flagged to the user: included prints counted in list order (Decision 3).
