# Admin Collaborations Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin Collaborations section as a Plans-style rail + pane (partner rail left, selected partner's stacked page right) and close the functional gaps listed in the spec.

**Architecture:** A hash-routed section (`#collaborations/<id>`) composed of small components under `components/admin/collaborations/`, each fed by focused hooks (`useCollaborationsSection`, `useCollaboratorPane`, `useCollaboratorPortalLink`, `useCollaboratorLedger`). Pure logic lives in `lib/adminCollaborations.ts` and `lib/adminCollaborationsRouting.ts` with vitest coverage. Owed totals come from `CollaboratorResponseDto.earningsTotals`; ledger event names from `EarningResponseDto.eventTitle` (both already in the backend contract).

**Tech Stack:** Next.js App Router (client components), TanStack Query v5, next-intl v4 (en + el), Tailwind, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-admin-collaborations-redesign-design.md`

**Conventions to follow (from `CLAUDE.md` + eslint):**
- No inline arrow functions in JSX props (`react/jsx-no-bind`) — use handlers from hooks or named `function` declarations.
- Imports sorted (`simple-import-sort`); `npx eslint --fix <files>` fixes ordering.
- A JSX comment above every meaningful visual section (`{/* Header */}` etc.).
- All visible copy through `useTranslations`.
- Callback props are named `on…Action`.

**Commands:**
- Tests: `npx vitest run <path>`
- Types: `npx tsc --noEmit`
- Lint: `npx eslint <paths>`

---

## File map

**Create**
- `lib/adminCollaborationsRouting.ts` (+ `lib/adminCollaborationsRouting.test.ts`) — `#collaborations/<id>` helpers.
- `lib/adminCollaborations.test.ts` — tests for new pure helpers.
- `components/admin/AdminRailItem.tsx`, `components/admin/AdminRailSearch.tsx` — shared rail pieces (Plans + Collaborations).
- `hooks/useCollaborationsSection.ts`, `hooks/useCollaboratorPane.ts`, `hooks/useCollaboratorPortalLink.ts`, `hooks/useCollaboratorLedger.ts`.
- `components/admin/collaborations/`: `CollaborationsSection.tsx`, `CollaboratorsRail.tsx`, `CollaboratorsPaneEmpty.tsx`, `CollaboratorPane.tsx`, `CollaboratorPaneHeader.tsx`, `CollaboratorStatusConfirm.tsx`, `CollaboratorPortalLink.tsx`, `CollaboratorCodesTable.tsx`, `CollaboratorCodeRow.tsx`, `CollaboratorOwedTotals.tsx`, `CollaboratorLedger.tsx`, `CollaboratorLedgerRow.tsx`, `LedgerSelectionBar.tsx`, `MarkPaidModal.tsx`, `VoidEarningModal.tsx`.

**Modify**
- `lib/api/types.ts` — `earningsTotals`, `eventTitle`.
- `lib/adminCollaborations.ts` — new helpers; `collaboratorRequestFromFormData` sends `status: null`; remove stats/owed/balance helpers.
- `hooks/useAdmin.ts` — upsert on collaborator save; mark-paid invalidation; remove totals hook.
- `components/admin/AdminNavigationContext.tsx` — sub-hash recognition.
- `components/admin/plans/PlansRail.tsx` — use shared rail pieces.
- `components/admin/CollaboratorDrawer.tsx`, `components/admin/CollaborationCodeDrawer.tsx` — limits, no status field, `onSavedAction`.
- `components/admin/AdminConsole.tsx` — render `CollaborationsSection`.
- `messages/en.json`, `messages/el.json` — `AdminPage.collaborations` block.

**Delete**
- `components/admin/CollaborationsPanel.tsx`, `CollaboratorsCatalogTable.tsx`, `CollaboratorOperationsDrawer.tsx`, `CollaborationEarningsPanel.tsx`, `CollaborationVoidRedemptionForm.tsx`, `components/admin/plans/PlansRailSearch.tsx`, `hooks/useCollaborationsAdmin.ts`.

Task order keeps `tsc` green after every task: new code is added alongside the old panel, the swap happens in Task 10, and old code/keys are removed in Task 11.

---

### Task 1: Hash routing for `#collaborations/<id>`

**Files:**
- Create: `lib/adminCollaborationsRouting.ts`
- Create: `lib/adminCollaborationsRouting.test.ts`
- Modify: `components/admin/AdminNavigationContext.tsx`

- [ ] **Step 1: Write the failing test**

`lib/adminCollaborationsRouting.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { formatCollaborationsHash, isCollaborationsHash, parseCollaborationsHash } from '@/lib/adminCollaborationsRouting';

describe('isCollaborationsHash', () => {
    it('matches the root and sub-routes only', () => {
        expect(isCollaborationsHash('#collaborations')).toBe(true);
        expect(isCollaborationsHash('#collaborations/abc')).toBe(true);
        expect(isCollaborationsHash('#collaborationsX')).toBe(false);
        expect(isCollaborationsHash('#plans')).toBe(false);
    });
});

describe('parseCollaborationsHash', () => {
    it('returns null without an id', () => {
        expect(parseCollaborationsHash('#collaborations')).toBeNull();
        expect(parseCollaborationsHash('#collaborations/')).toBeNull();
    });

    it('reads and decodes the id', () => {
        expect(parseCollaborationsHash('#collaborations/3fa4-9c1e')).toBe('3fa4-9c1e');
        expect(parseCollaborationsHash('#collaborations/a%20b')).toBe('a b');
    });

    it('ignores other sections', () => {
        expect(parseCollaborationsHash('#plans/WEDDING')).toBeNull();
    });
});

describe('formatCollaborationsHash', () => {
    it('formats the root and an id', () => {
        expect(formatCollaborationsHash(null)).toBe('#collaborations');
        expect(formatCollaborationsHash('3fa4')).toBe('#collaborations/3fa4');
    });

    it('round-trips through parse', () => {
        expect(parseCollaborationsHash(formatCollaborationsHash('a b'))).toBe('a b');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/adminCollaborationsRouting.test.ts`
Expected: FAIL — cannot resolve `@/lib/adminCollaborationsRouting`.

- [ ] **Step 3: Write the implementation**

`lib/adminCollaborationsRouting.ts`:

```ts
export const COLLABORATIONS_HASH_ROOT = '#collaborations';

export function isCollaborationsHash(hash: string): boolean {
    return hash === COLLABORATIONS_HASH_ROOT || hash.startsWith(`${COLLABORATIONS_HASH_ROOT}/`);
}

// `#collaborations/<id>` selects a partner; the bare root selects none.
export function parseCollaborationsHash(hash: string): string | null {
    if (!isCollaborationsHash(hash)) return null;
    const rest = hash.slice(COLLABORATIONS_HASH_ROOT.length + 1);
    return rest ? decodeURIComponent(rest) : null;
}

export function formatCollaborationsHash(collaboratorId: string | null): string {
    return collaboratorId ? `${COLLABORATIONS_HASH_ROOT}/${encodeURIComponent(collaboratorId)}` : COLLABORATIONS_HASH_ROOT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/adminCollaborationsRouting.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Wire the navigation context**

In `components/admin/AdminNavigationContext.tsx`:

1. Add the import below the plans routing import:
```ts
import { COLLABORATIONS_HASH_ROOT, isCollaborationsHash } from '@/lib/adminCollaborationsRouting';
```
2. In `HASH_TO_TAB`, delete the line `'#collaborations': 'collaborations',`.
3. In `TAB_TO_HASH`, change `collaborations: '#collaborations',` to `collaborations: COLLABORATIONS_HASH_ROOT,`.
4. Replace the `currentHashTab` comment and function with:
```ts
// `#plans/...` and `#collaborations/...` carry their own sub-route, parsed by
// the section itself; legacy `#event-plans`, `#modules`, `#event-types` land
// on Plans too so old links keep working.
function currentHashTab(): AdminTab {
    if (typeof window === 'undefined') return 'metrics';
    const hash = window.location.hash;
    if (isPlansHash(hash)) return 'plans';
    if (isCollaborationsHash(hash)) return 'collaborations';
    return HASH_TO_TAB[hash] ?? 'metrics';
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint lib/adminCollaborationsRouting.ts lib/adminCollaborationsRouting.test.ts components/admin/AdminNavigationContext.tsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/adminCollaborationsRouting.ts lib/adminCollaborationsRouting.test.ts components/admin/AdminNavigationContext.tsx
git commit -m "Add #collaborations/<id> hash routing"
```

---

### Task 2: Contract types and pure helpers

**Files:**
- Modify: `lib/api/types.ts` (`CollaboratorResponseDto`, `CollaborationEarningResponseDto`)
- Modify: `lib/adminCollaborations.ts`
- Create: `lib/adminCollaborations.test.ts`

- [ ] **Step 1: Add the contract fields**

In `lib/api/types.ts`, `CollaboratorResponseDto` gains (after `notes`):
```ts
    // Same rows as GET …/earnings/totals, on list and detail. [] when never earned.
    earningsTotals: CollaborationEarningsTotalDto[];
```
`CollaborationEarningResponseDto` gains (after `eventId`):
```ts
    // Null once the event is purged; eventId survives it.
    eventTitle: string | null;
```

- [ ] **Step 2: Write the failing tests**

`lib/adminCollaborations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
    collaboratorRequestWithStatus,
    earningCodeText,
    filterCollaborators,
    filterEarnings,
    formatCurrencyAmounts,
    owedAmounts,
    shortId,
    sortCodesActiveFirst,
    sortCollaboratorsByName,
    sumByCurrency,
} from '@/lib/adminCollaborations';
import type { CollaborationCodeResponseDto, CollaborationEarningResponseDto, CollaboratorResponseDto } from '@/lib/api/types';

function collaborator(overrides: Partial<CollaboratorResponseDto> = {}): CollaboratorResponseDto {
    return {
        id: 'c1',
        name: 'Barn Venue',
        contactEmail: 'hello@barn.test',
        status: 'ACTIVE',
        portalTokenIssued: false,
        portalTokenIssuedAt: null,
        notes: null,
        earningsTotals: [],
        ...overrides,
    };
}

function earning(overrides: Partial<CollaborationEarningResponseDto> = {}): CollaborationEarningResponseDto {
    return {
        id: 'e1',
        eventId: 'ev1',
        eventTitle: 'Anna & Nikos',
        orderId: 'o1',
        codeId: 'k1',
        entryType: 'ACCRUAL',
        amountMinor: 1800,
        currency: 'EUR',
        commissionPercent: 15,
        basisAmountMinor: 12000,
        status: 'ACCRUED',
        accruedAt: '2026-08-31T10:15:00Z',
        paidAt: null,
        payoutReference: null,
        ...overrides,
    };
}

function code(overrides: Partial<CollaborationCodeResponseDto> = {}): CollaborationCodeResponseDto {
    return {
        id: 'k1',
        collaboratorId: 'c1',
        code: 'BARN-2026',
        label: 'Barn rate',
        discountPercent: 10,
        commissionPercent: 15,
        status: 'ACTIVE',
        startsAt: null,
        endsAt: null,
        maxRedemptions: null,
        liveRedemptions: 0,
        eventTypeKeys: [],
        planTierCodes: [],
        ...overrides,
    };
}

describe('sortCollaboratorsByName', () => {
    it('sorts by name without mutating the input', () => {
        const input = [collaborator({ id: 'z', name: 'Zeta' }), collaborator({ id: 'a', name: 'alpha' }), collaborator({ id: 'm', name: 'Mid' })];
        expect(sortCollaboratorsByName(input).map((item) => item.id)).toEqual(['a', 'm', 'z']);
        expect(input[0].id).toBe('z');
    });
});

describe('filterCollaborators', () => {
    const list = [collaborator({ id: 'a', name: 'Barn Venue' }), collaborator({ id: 'b', name: 'Lake House', contactEmail: 'info@lake.test' })];

    it('returns everything for a blank search', () => {
        expect(filterCollaborators(list, '  ')).toHaveLength(2);
    });

    it('matches name and email case-insensitively', () => {
        expect(filterCollaborators(list, 'barn').map((item) => item.id)).toEqual(['a']);
        expect(filterCollaborators(list, 'LAKE.TEST').map((item) => item.id)).toEqual(['b']);
    });
});

describe('owedAmounts', () => {
    it('keeps only currencies with something owed', () => {
        expect(
            owedAmounts([
                { currency: 'EUR', accruedMinor: 3043, paidMinor: 0 },
                { currency: 'USD', accruedMinor: 0, paidMinor: 500 },
            ]),
        ).toEqual([{ currency: 'EUR', amountMinor: 3043 }]);
    });
});

describe('sortCodesActiveFirst', () => {
    it('puts disabled codes last and keeps order within groups', () => {
        const input = [code({ id: 'a', status: 'DISABLED' }), code({ id: 'b' }), code({ id: 'c' })];
        expect(sortCodesActiveFirst(input).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    });
});

describe('filterEarnings', () => {
    const rows = [earning({ id: 'a' }), earning({ id: 'p', status: 'PAID' }), earning({ id: 'r', status: 'REVERSED' })];

    it('OPEN hides reversed rows', () => {
        expect(filterEarnings(rows, 'OPEN').map((row) => row.id)).toEqual(['a', 'p']);
    });

    it('a status filter keeps only that status', () => {
        expect(filterEarnings(rows, 'PAID').map((row) => row.id)).toEqual(['p']);
    });

    it('ALL keeps everything', () => {
        expect(filterEarnings(rows, 'ALL')).toHaveLength(3);
    });
});

describe('shortId / earningCodeText', () => {
    it('shortens an id to 8 characters', () => {
        expect(shortId('9c1e4f2a-1111-2222')).toBe('9c1e4f2a');
    });

    it('resolves a code string, falling back to a short id', () => {
        expect(earningCodeText([code()], 'k1')).toBe('BARN-2026');
        expect(earningCodeText([code()], 'deadbeef-0000')).toBe('deadbeef');
    });
});

describe('sumByCurrency', () => {
    it('sums signed amounts per currency, never across', () => {
        expect(
            sumByCurrency([
                earning({ amountMinor: 1800 }),
                earning({ id: 'c', entryType: 'CLAWBACK', amountMinor: -300 }),
                earning({ id: 'u', currency: 'USD', amountMinor: 500 }),
            ]),
        ).toEqual([
            { currency: 'EUR', amountMinor: 1500 },
            { currency: 'USD', amountMinor: 500 },
        ]);
    });
});

describe('formatCurrencyAmounts', () => {
    it('joins one formatted figure per currency', () => {
        const text = formatCurrencyAmounts('en', [
            { currency: 'EUR', amountMinor: 3043 },
            { currency: 'USD', amountMinor: 1200 },
        ]);
        expect(text.split(' · ')).toHaveLength(2);
        expect(text).toContain('30.43');
        expect(text).toContain('12.00');
    });
});

describe('collaboratorRequestWithStatus', () => {
    it('sends the current details back with the new status', () => {
        expect(collaboratorRequestWithStatus(collaborator({ notes: 'Renewed' }), 'SUSPENDED')).toEqual({
            name: 'Barn Venue',
            contactEmail: 'hello@barn.test',
            notes: 'Renewed',
            status: 'SUSPENDED',
        });
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/adminCollaborations.test.ts`
Expected: FAIL — the new exports do not exist.

- [ ] **Step 4: Implement the helpers**

In `lib/adminCollaborations.ts`:

1. Add `CollaborationEarningStatus` to the `@/lib/api/types` type import, and add `import { formatMoney } from '@/lib/billing';` below it.
2. Append:

```ts
export type EarningFilter = 'OPEN' | 'ALL' | CollaborationEarningStatus;
export const EARNING_FILTERS: EarningFilter[] = ['OPEN', 'ACCRUED', 'PAID', 'REVERSED', 'ALL'];

export type CurrencyAmount = { currency: string; amountMinor: number };

export function sortCollaboratorsByName(collaborators: CollaboratorResponseDto[]): CollaboratorResponseDto[] {
    return [...collaborators].sort((left, right) => left.name.localeCompare(right.name));
}

export function filterCollaborators(collaborators: CollaboratorResponseDto[], search: string): CollaboratorResponseDto[] {
    const needle = search.trim().toLowerCase();
    if (!needle) return collaborators;
    return collaborators.filter(
        (collaborator) => collaborator.name.toLowerCase().includes(needle) || collaborator.contactEmail.toLowerCase().includes(needle),
    );
}

// Only currencies with something outstanding. Never summed across currencies.
export function owedAmounts(totals: CollaborationEarningsTotalDto[]): CurrencyAmount[] {
    return totals.filter((total) => total.accruedMinor > 0).map((total) => ({ currency: total.currency, amountMinor: total.accruedMinor }));
}

export function sortCodesActiveFirst(codes: CollaborationCodeResponseDto[]): CollaborationCodeResponseDto[] {
    return [...codes].sort((left, right) => Number(left.status !== 'ACTIVE') - Number(right.status !== 'ACTIVE'));
}

export function filterEarnings(earnings: CollaborationEarningResponseDto[], filter: EarningFilter): CollaborationEarningResponseDto[] {
    if (filter === 'ALL') return earnings;
    if (filter === 'OPEN') return earnings.filter((earning) => earning.status !== 'REVERSED');
    return earnings.filter((earning) => earning.status === filter);
}

export function shortId(id: string): string {
    return id.slice(0, 8);
}

export function earningCodeText(codes: CollaborationCodeResponseDto[], codeId: string): string {
    return codes.find((code) => code.id === codeId)?.code ?? shortId(codeId);
}

// Amounts are signed (a clawback is negative), so a plain sum is the payout.
export function sumByCurrency(earnings: CollaborationEarningResponseDto[]): CurrencyAmount[] {
    const sums = new Map<string, number>();
    for (const earning of earnings) sums.set(earning.currency, (sums.get(earning.currency) ?? 0) + earning.amountMinor);
    return [...sums]
        .map(([currency, amountMinor]) => ({ currency, amountMinor }))
        .sort((left, right) => left.currency.localeCompare(right.currency));
}

export function formatCurrencyAmounts(locale: string, amounts: CurrencyAmount[]): string {
    return amounts.map((amount) => formatMoney(locale, amount.amountMinor, amount.currency)).join(' · ');
}

// PATCH is a full replace, so a status change sends the current details back.
export function collaboratorRequestWithStatus(
    collaborator: CollaboratorResponseDto,
    status: CollaboratorResponseDto['status'],
): CollaboratorRequestDto {
    return { name: collaborator.name, contactEmail: collaborator.contactEmail, notes: collaborator.notes, status };
}
```

Leave `collaboratorRequestFromFormData`, `collaboratorStats`, `owedMinor`, `balanceMinor` untouched for now (the old panel still uses them; Tasks 10–11 change/remove them).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/adminCollaborations.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint lib/adminCollaborations.ts lib/adminCollaborations.test.ts lib/api/types.ts`
Expected: no errors. (If `tsc` flags an object literal typed as `CollaboratorResponseDto`/`CollaborationEarningResponseDto` elsewhere in the repo missing the new fields, add `earningsTotals: []` / `eventTitle: null` there.)

- [ ] **Step 7: Commit**

```bash
git add lib/api/types.ts lib/adminCollaborations.ts lib/adminCollaborations.test.ts
git commit -m "Add collaboration earnings contract fields and ledger helpers"
```

---

### Task 3: Shared rail item and search

**Files:**
- Create: `components/admin/AdminRailItem.tsx`
- Create: `components/admin/AdminRailSearch.tsx`
- Modify: `components/admin/plans/PlansRail.tsx`
- Delete: `components/admin/plans/PlansRailSearch.tsx`

- [ ] **Step 1: Create `AdminRailItem`**

```tsx
'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type AdminRailItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className' | 'aria-current'> & {
    active: boolean;
    muted?: boolean;
};

export function AdminRailItem({ active, muted = false, children, ...props }: AdminRailItemProps) {
    return (
        <button
            type="button"
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors',
                active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                muted && 'opacity-60',
            )}
            {...props}
        >
            {children}
        </button>
    );
}
```

- [ ] **Step 2: Create `AdminRailSearch`**

```tsx
'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';

export function AdminRailSearch({
    value,
    placeholder,
    onChangeAction,
}: {
    value: string;
    placeholder: string;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={value} onChange={onChangeAction} placeholder={placeholder} className={adminInputClass('w-full pl-8')} />
        </div>
    );
}
```

- [ ] **Step 3: Rewrite `PlansRail` to use them**

Replace the whole of `components/admin/plans/PlansRail.tsx` with:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { AdminRailItem } from '@/components/admin/AdminRailItem';
import { AdminRailSearch } from '@/components/admin/AdminRailSearch';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlansView } from '@/lib/adminPlansRouting';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export type PlansRailEventType = { type: PlatformEventTypeResponseDto; liveCount: number };

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
            <AdminRailSearch value={search} placeholder={t('search.placeholder')} onChangeAction={onSearchChangeAction} />

            {/* Event types */}
            <nav aria-label={t('rail.eventTypes')} className="space-y-px">
                {eventTypes.map(({ type, liveCount }) => (
                    <AdminRailItem
                        key={type.eventTypeKey}
                        data-event-type-key={type.eventTypeKey}
                        active={view.view === 'eventType' && type.eventTypeKey === selectedEventTypeKey}
                        muted={!type.isEnabled}
                        onClick={handleTypeClick}
                    >
                        <span className="truncate">{localizedText(type.name, type.eventTypeKey)}</span>
                        <span className="shrink-0 font-mono text-[11px] text-ink-faint">{liveCount}</span>
                    </AdminRailItem>
                ))}
                {eventTypes.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-faint">{t('rail.noMatches')}</p>}
            </nav>

            {/* Settings */}
            <nav aria-label={t('rail.settings')} className="border-t border-border pt-3">
                <p className="mb-1.5 px-2.5 text-[10.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">{t('rail.settings')}</p>
                <div className="space-y-px">
                    <AdminRailItem active={view.view === 'settingsModules'} onClick={onOpenSettingsModulesAction}>
                        {t('rail.modules')}
                    </AdminRailItem>
                    <AdminRailItem active={view.view === 'settingsEventTypes'} onClick={onOpenSettingsEventTypesAction}>
                        {t('rail.eventTypesSettings')}
                    </AdminRailItem>
                </div>
            </nav>
        </aside>
    );
}
```

- [ ] **Step 4: Delete `PlansRailSearch` and check for stragglers**

```bash
git rm components/admin/plans/PlansRailSearch.tsx
```
Run: `grep -rn "PlansRailSearch" components hooks lib app`
Expected: no output.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/AdminRailItem.tsx components/admin/AdminRailSearch.tsx components/admin/plans/PlansRail.tsx`
Expected: no errors.

- [ ] **Step 6: Visual check Plans is unchanged**

Open `http://localhost:3000/admin#plans` in the browser pane (never `preview_start {name}` — see memory; use `preview_start {url: "http://localhost:3000/admin#plans"}`), emulate 1440×900, screenshot. Rail must look identical to before: active item coral wash, disabled types muted, counts in mono, Settings group under a divider.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminRailItem.tsx components/admin/AdminRailSearch.tsx components/admin/plans/PlansRail.tsx
git commit -m "Extract shared admin rail item and search from Plans"
```

---

### Task 4: Data hooks — upsert on save, mark-paid invalidation

**Files:**
- Modify: `hooks/useAdmin.ts`
- Modify: `components/admin/CollaborationEarningsPanel.tsx:36` (one-line call-site update; file is deleted in Task 11)

- [ ] **Step 1: Upsert on collaborator save**

Replace `useSaveCollaborator` in `hooks/useAdmin.ts` with:

```ts
export function useSaveCollaborator() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id?: string; input: CollaboratorRequestDto }) =>
            id
                ? api.patch<CollaboratorResponseDto>(endpoints.admin.collaborators.byId(id), input)
                : api.post<CollaboratorResponseDto>(endpoints.admin.collaborators.list, input),
        onSuccess: (saved) => {
            // Upsert before the refetch so a just-created partner can be selected right away.
            queryClient.setQueryData<CollaboratorResponseDto[]>(adminKeys.collaborators, (current) =>
                current ? [...current.filter((item) => item.id !== saved.id), saved] : current,
            );
            queryClient.invalidateQueries({ queryKey: adminKeys.collaborators });
        },
    });
}
```

- [ ] **Step 2: Mark-paid refreshes the ledger and the rail totals, success or not**

Replace `useMarkCollaborationEarningsPaid` with:

```ts
export function useMarkCollaborationEarningsPaid() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: MarkCollaborationEarningsPaidRequestDto) => api.post<void>(endpoints.admin.collaborationEarnings.markPaid, input),
        // Settled, not success: a 5062 refusal means the ledger on screen is stale.
        // The collaborators prefix covers the list (rail totals) and every ledger.
        onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.collaborators }),
    });
}
```

- [ ] **Step 3: Update the old call site**

In `components/admin/CollaborationEarningsPanel.tsx`, change
`const markPaid = useMarkCollaborationEarningsPaid(collaborator?.id ?? null);`
to
`const markPaid = useMarkCollaborationEarningsPaid();`

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useAdmin.ts components/admin/CollaborationEarningsPanel.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdmin.ts components/admin/CollaborationEarningsPanel.tsx
git commit -m "Upsert saved partners and refresh totals after mark-paid"
```

---

### Task 5: Translations (add new keys)

**Files:**
- Modify: `messages/en.json`, `messages/el.json` (only the `AdminPage.collaborations` block)
- Temporary: `scripts/tmp-collaborations-i18n.mjs` (deleted in this task)

The message files do not round-trip through `JSON.stringify` byte-for-byte, so the script rewrites only the `AdminPage.collaborations` block, located by brace matching.

- [ ] **Step 1: Write the script**

`scripts/tmp-collaborations-i18n.mjs`:

```js
import fs from 'node:fs';

const MARKER = '        "collaborations": {';

function blockRange(text) {
    const start = text.indexOf(MARKER);
    if (start < 0 || text.indexOf(MARKER, start + 1) >= 0) throw new Error('expected exactly one collaborations block');
    let index = text.indexOf('{', start);
    let depth = 0;
    let inString = false;
    for (; index < text.length; index += 1) {
        const char = text[index];
        if (inString) {
            if (char === '\\') index += 1;
            else if (char === '"') inString = false;
        } else if (char === '"') inString = true;
        else if (char === '{') depth += 1;
        else if (char === '}') {
            depth -= 1;
            if (depth === 0) break;
        }
    }
    return { start: start + '        "collaborations": '.length, end: index + 1 };
}

function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, patch) {
    const out = { ...base };
    for (const [key, value] of Object.entries(patch)) out[key] = isObject(value) && isObject(base[key]) ? deepMerge(base[key], value) : value;
    return out;
}

function removePath(object, path) {
    const keys = path.split('.');
    const last = keys.pop();
    const parent = keys.reduce((node, key) => node?.[key], object);
    if (parent) delete parent[last];
}

export function rewrite(locale, transform) {
    const path = `messages/${locale}.json`;
    const raw = fs.readFileSync(path, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const text = raw.replace(/\r\n/g, '\n');
    const { start, end } = blockRange(text);
    const block = transform(JSON.parse(text.slice(start, end)));
    const serialized = JSON.stringify(block, null, 4).replace(/\n/g, '\n        ');
    fs.writeFileSync(path, (text.slice(0, start) + serialized + text.slice(end)).replace(/\n/g, eol));
}

const ADD = {
    en: {
        loading: 'Loading partners...',
        empty: 'No partners yet.',
        noMatches: 'No matches.',
        drawer: { createTitle: 'New partner' },
        suspend: { action: 'Suspend', title: 'Suspend {name}?', body: 'Their partner page and all their codes stop working.' },
        reactivate: { action: 'Reactivate', title: 'Reactivate {name}?', body: 'Their partner page and active codes work again.' },
        portal: {
            title: 'Portal link',
            notIssued: 'No portal link yet',
            issuedAt: 'Link created {date}',
            create: 'Create link',
            replace: 'Replace link',
            confirmTitle: 'Replace the portal link?',
            confirmBody: 'The current link stops working right away.',
            once: "Copy this now. It won't be shown again.",
            copy: 'Copy link',
        },
        linkCode: { open: 'Link existing code', title: 'Link existing code' },
        earnings: {
            owed: 'Owed · {currency}',
            paid: '{amount} paid',
            loading: 'Loading earnings...',
            empty: 'No earnings to show.',
            filters: { OPEN: 'Open', ACCRUED: 'Accrued', PAID: 'Paid', REVERSED: 'Reversed', ALL: 'All' },
            basis: '{percent}% of {amount}',
            noReference: '—',
            select: 'Select row',
            selectAll: 'Select all accrued rows',
            selected: '{count} selected',
            clear: 'Clear',
            confirmTitle: 'Mark earnings paid?',
            confirmBody: '{count, plural, one {# row} other {# rows}} · {amount}',
            columns: { date: 'Date', event: 'Event', code: 'Code', commission: 'Commission', amount: 'Amount', status: 'Status', reference: 'Reference' },
        },
    },
    el: {
        loading: 'Φόρτωση συνεργατών...',
        empty: 'Δεν υπάρχουν συνεργάτες ακόμα.',
        noMatches: 'Δεν βρέθηκαν αποτελέσματα.',
        drawer: { createTitle: 'Νέος συνεργάτης' },
        suspend: { action: 'Αναστολή', title: 'Αναστολή του {name};', body: 'Η σελίδα συνεργάτη και όλοι οι κωδικοί του σταματούν να λειτουργούν.' },
        reactivate: { action: 'Επανενεργοποίηση', title: 'Επανενεργοποίηση του {name};', body: 'Η σελίδα συνεργάτη και οι ενεργοί κωδικοί του λειτουργούν ξανά.' },
        portal: {
            title: 'Σύνδεσμος συνεργάτη',
            notIssued: 'Δεν υπάρχει σύνδεσμος ακόμα',
            issuedAt: 'Ο σύνδεσμος δημιουργήθηκε {date}',
            create: 'Δημιουργία συνδέσμου',
            replace: 'Αντικατάσταση συνδέσμου',
            confirmTitle: 'Αντικατάσταση του συνδέσμου;',
            confirmBody: 'Ο τρέχων σύνδεσμος σταματά να λειτουργεί αμέσως.',
            copy: 'Αντιγραφή συνδέσμου',
        },
        linkCode: { open: 'Σύνδεση υπάρχοντος κωδικού', title: 'Σύνδεση υπάρχοντος κωδικού' },
        earnings: {
            owed: 'Οφειλόμενα · {currency}',
            paid: '{amount} πληρωμένα',
            loading: 'Φόρτωση αμοιβών...',
            empty: 'Δεν υπάρχουν αμοιβές για εμφάνιση.',
            filters: { OPEN: 'Ανοιχτά', ACCRUED: 'Δεδουλευμένα', PAID: 'Πληρωμένα', REVERSED: 'Αντιστραμμένα', ALL: 'Όλα' },
            basis: '{percent}% επί {amount}',
            noReference: '—',
            select: 'Επιλογή γραμμής',
            selectAll: 'Επιλογή όλων των δεδουλευμένων',
            selected: '{count} επιλεγμένα',
            clear: 'Καθαρισμός',
            confirmTitle: 'Σήμανση αμοιβών ως πληρωμένων;',
            confirmBody: '{count, plural, one {# γραμμή} other {# γραμμές}} · {amount}',
            columns: {
                date: 'Ημερομηνία',
                event: 'Εκδήλωση',
                code: 'Κωδικός',
                commission: 'Προμήθεια',
                amount: 'Ποσό',
                status: 'Κατάσταση',
                reference: 'Αναφορά',
            },
        },
    },
};

// Keys only the old panel used; removed once it is gone (Task 11).
const REMOVE = [
    'subtitle',
    'manage',
    'rowCount',
    'selectPrompt',
    'columns',
    'stats',
    'status.ALL',
    'drawer.createSubtitle',
    'drawer.editSubtitle',
    'portal.description',
    'portal.issue',
    'portal.issued',
    'codes.subtitle',
    'earnings.loadingTotals',
    'earnings.emptyTotals',
    'earnings.paidBalance',
    'earnings.markPaidTitle',
    'earnings.ledger',
    'earnings.details',
    'earnings.detailTitle',
    'earnings.amount',
    'earnings.entryType',
    'earnings.paidAt',
    'earnings.selectAccrued',
    'earnings.on',
    'earnings.confirmBodyMixed',
    'earnings.columns.select',
    'earnings.columns.basis',
    'earnings.filters.open',
    'earnings.filters.all',
    'void.title',
    'void.success',
];

const phase = process.argv[2];
for (const locale of ['en', 'el']) {
    if (phase === 'add') rewrite(locale, (block) => deepMerge(block, ADD[locale]));
    else if (phase === 'remove')
        rewrite(locale, (block) => {
            for (const path of REMOVE) removePath(block, path);
            return block;
        });
    else throw new Error('usage: node scripts/tmp-collaborations-i18n.mjs add|remove');
}
```

Note: the old `earnings.columns.*` and new `earnings.columns.*` share the object; `columns.select`/`columns.basis` are the only old ones removed later, and the new `columns.status`/`columns.amount`/`columns.reference`/`columns.date` overwrite the old ones with new labels.

- [ ] **Step 2: Run the add phase**

Run: `node scripts/tmp-collaborations-i18n.mjs add`
Then: `git diff --stat messages/`
Expected: only `messages/en.json` and `messages/el.json` change, and `git diff messages/en.json` shows changes only inside the `"collaborations": {` block under `AdminPage` (other lines untouched).

- [ ] **Step 3: Validate JSON and that existing keys survived**

Run:
```bash
node -e "for (const l of ['en','el']) { const c = require('./messages/'+l+'.json').AdminPage.collaborations; if (!c.codes.restrictions || !c.fields.status || !c.linkCode.choose || !c.earnings.filters.OPEN || !c.suspend.action) throw new Error(l); } console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Keep the script for Task 11**

Do not delete `scripts/tmp-collaborations-i18n.mjs` yet — Task 11 runs its `remove` phase and then deletes it. Do not commit it.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "Add copy for the collaborations rail and partner pane"
```

---

### Task 6: Section, pane, portal-link and ledger hooks

**Files:**
- Create: `hooks/useCollaborationsSection.ts`
- Create: `hooks/useCollaboratorPane.ts`
- Create: `hooks/useCollaboratorPortalLink.ts`
- Create: `hooks/useCollaboratorLedger.ts`

These are verified by `tsc`/lint here and end-to-end in Task 12 (the repo tests pure `lib/` logic, which Task 2 covered).

- [ ] **Step 1: `useCollaborationsSection`**

```ts
'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminCollaborators } from '@/hooks/useAdmin';
import { filterCollaborators, sortCollaboratorsByName } from '@/lib/adminCollaborations';
import { formatCollaborationsHash, parseCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import type { CollaboratorResponseDto } from '@/lib/api/types';

const EMPTY_COLLABORATORS: CollaboratorResponseDto[] = [];

function currentCollaboratorId(): string | null {
    if (typeof window === 'undefined') return null;
    return parseCollaborationsHash(window.location.hash);
}

export function useCollaborationsSection() {
    const collaboratorsQuery = useAdminCollaborators();
    const [hashId, setHashId] = useState<string | null>(currentCollaboratorId);
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        function syncFromHash() {
            setHashId(currentCollaboratorId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const collaborators = useMemo(() => sortCollaboratorsByName(collaboratorsQuery.data ?? EMPTY_COLLABORATORS), [collaboratorsQuery.data]);
    const railCollaborators = useMemo(() => filterCollaborators(collaborators, search), [collaborators, search]);

    // No id, or one that no longer exists, falls back to the first partner.
    const selectedCollaborator = useMemo(
        () => collaborators.find((collaborator) => collaborator.id === hashId) ?? collaborators[0] ?? null,
        [collaborators, hashId],
    );
    const selectedId = selectedCollaborator?.id ?? null;

    // Keep the URL on the partner actually shown, so a refresh or a shared link lands there.
    useEffect(() => {
        if (!collaboratorsQuery.data || selectedId === hashId) return;
        window.history.replaceState(null, '', formatCollaborationsHash(selectedId));
    }, [collaboratorsQuery.data, hashId, selectedId]);

    const selectCollaborator = useCallback((id: string) => {
        setHashId(id);
        window.history.replaceState(null, '', formatCollaborationsHash(id));
    }, []);

    const handleRailClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const id = event.currentTarget.dataset.collaboratorId;
            if (id) selectCollaborator(id);
        },
        [selectCollaborator],
    );

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const openCreate = useCallback(() => setCreateOpen(true), []);
    const closeCreate = useCallback(() => setCreateOpen(false), []);
    const handleCreated = useCallback((collaborator: CollaboratorResponseDto) => selectCollaborator(collaborator.id), [selectCollaborator]);

    return {
        railCollaborators,
        selectedCollaborator,
        search,
        handleSearchChange,
        handleRailClick,
        createOpen,
        openCreate,
        closeCreate,
        handleCreated,
        isLoading: collaboratorsQuery.isLoading,
        error: collaboratorsQuery.error,
    };
}
```

- [ ] **Step 2: `useCollaboratorPane`**

```ts
'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useCollaboratorCodes, useSaveCollaborator } from '@/hooks/useAdmin';
import { collaboratorRequestWithStatus, sortCodesActiveFirst } from '@/lib/adminCollaborations';
import type { CollaborationCodeResponseDto, CollaboratorResponseDto } from '@/lib/api/types';

const EMPTY_CODES: CollaborationCodeResponseDto[] = [];

export function useCollaboratorPane(collaborator: CollaboratorResponseDto) {
    const codesQuery = useCollaboratorCodes(collaborator.id);
    const saveStatus = useSaveCollaborator();
    const [editOpen, setEditOpen] = useState(false);
    const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<CollaborationCodeResponseDto | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

    const codes = useMemo(() => sortCodesActiveFirst(codesQuery.data ?? EMPTY_CODES), [codesQuery.data]);
    const nextStatus: CollaboratorResponseDto['status'] = collaborator.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    const openEdit = useCallback(() => setEditOpen(true), []);
    const closeEdit = useCallback(() => setEditOpen(false), []);

    const openCreateCode = useCallback(() => {
        setEditingCode(null);
        setCodeDrawerOpen(true);
    }, []);

    const handleEditCodeClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const code = codes.find((item) => item.id === event.currentTarget.dataset.codeId);
            if (!code) return;
            setEditingCode(code);
            setCodeDrawerOpen(true);
        },
        [codes],
    );

    const closeCodeDrawer = useCallback(() => setCodeDrawerOpen(false), []);
    const openLink = useCallback(() => setLinkOpen(true), []);
    const closeLink = useCallback(() => setLinkOpen(false), []);

    const openStatusConfirm = useCallback(() => {
        saveStatus.reset();
        setStatusConfirmOpen(true);
    }, [saveStatus]);

    const closeStatusConfirm = useCallback(() => setStatusConfirmOpen(false), []);

    const confirmStatusChange = useCallback(async () => {
        try {
            await saveStatus.mutateAsync({ id: collaborator.id, input: collaboratorRequestWithStatus(collaborator, nextStatus) });
            setStatusConfirmOpen(false);
        } catch {
            // Shown in the modal through statusError.
        }
    }, [collaborator, nextStatus, saveStatus]);

    return {
        codes,
        codesLoading: codesQuery.isLoading,
        codesError: codesQuery.error,
        editOpen,
        openEdit,
        closeEdit,
        codeDrawerOpen,
        editingCode,
        openCreateCode,
        handleEditCodeClick,
        closeCodeDrawer,
        linkOpen,
        openLink,
        closeLink,
        nextStatus,
        statusConfirmOpen,
        openStatusConfirm,
        closeStatusConfirm,
        confirmStatusChange,
        statusSaving: saveStatus.isPending,
        statusError: saveStatus.error,
    };
}
```

- [ ] **Step 3: `useCollaboratorPortalLink`**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useIssueCollaboratorPortalToken } from '@/hooks/useAdmin';
import { useCopyText } from '@/hooks/useCopyText';
import type { CollaboratorResponseDto } from '@/lib/api/types';

// The URL is readable exactly once; it lives in state only and is never persisted.
export function useCollaboratorPortalLink(collaborator: CollaboratorResponseDto) {
    const issueToken = useIssueCollaboratorPortalToken();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
    const { copied, copy } = useCopyText(issuedUrl ?? '');

    const issue = useCallback(async () => {
        try {
            const result = await issueToken.mutateAsync(collaborator.id);
            setIssuedUrl(result.portalUrl);
            setConfirmOpen(false);
        } catch {
            // Shown through error.
        }
    }, [collaborator.id, issueToken]);

    // Replacing dead-links the current URL, so only that path asks first.
    const requestIssue = useCallback(() => {
        if (collaborator.portalTokenIssued) setConfirmOpen(true);
        else void issue();
    }, [collaborator.portalTokenIssued, issue]);

    const closeConfirm = useCallback(() => setConfirmOpen(false), []);

    return {
        issuedUrl,
        confirmOpen,
        requestIssue,
        closeConfirm,
        issue,
        isIssuing: issueToken.isPending,
        error: issueToken.error,
        copied,
        copy,
    };
}
```

- [ ] **Step 4: `useCollaboratorLedger`**

```ts
'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useCollaboratorEarnings, useMarkCollaborationEarningsPaid, useVoidCollaborationRedemption } from '@/hooks/useAdmin';
import { type EarningFilter, filterEarnings, sortEarningsNewestFirst, sumByCurrency } from '@/lib/adminCollaborations';
import type { CollaborationEarningResponseDto } from '@/lib/api/types';

const EMPTY_EARNINGS: CollaborationEarningResponseDto[] = [];

export function useCollaboratorLedger(collaboratorId: string) {
    const earningsQuery = useCollaboratorEarnings(collaboratorId);
    const markPaid = useMarkCollaborationEarningsPaid();
    const voidRedemption = useVoidCollaborationRedemption();
    const [filter, setFilter] = useState<EarningFilter>('OPEN');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [markPaidOpen, setMarkPaidOpen] = useState(false);
    const [reference, setReference] = useState('');
    const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState('');

    const earnings = useMemo(() => sortEarningsNewestFirst(earningsQuery.data ?? EMPTY_EARNINGS), [earningsQuery.data]);
    const visibleEarnings = useMemo(() => filterEarnings(earnings, filter), [earnings, filter]);
    const selectableIds = useMemo(
        () => visibleEarnings.filter((earning) => earning.status === 'ACCRUED').map((earning) => earning.id),
        [visibleEarnings],
    );
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
    const selectionTotals = useMemo(() => sumByCurrency(earnings.filter((earning) => selectedIds.includes(earning.id))), [earnings, selectedIds]);
    const voidTarget = earnings.find((earning) => earning.id === voidTargetId) ?? null;

    // A filter change hides rows, so it drops the selection instead of paying rows no longer on screen.
    const handleFilterClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        setFilter(event.currentTarget.dataset.filter as EarningFilter);
        setSelectedIds([]);
    }, []);

    const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { value: id, checked } = event.currentTarget;
        setSelectedIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
    }, []);

    const handleToggleAll = useCallback(() => setSelectedIds(allSelected ? [] : selectableIds), [allSelected, selectableIds]);
    const clearSelection = useCallback(() => setSelectedIds([]), []);

    const openMarkPaid = useCallback(() => {
        markPaid.reset();
        setMarkPaidOpen(true);
    }, [markPaid]);

    const closeMarkPaid = useCallback(() => {
        setMarkPaidOpen(false);
        setReference('');
    }, []);

    const handleReferenceChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setReference(event.target.value), []);

    const confirmMarkPaid = useCallback(async () => {
        try {
            await markPaid.mutateAsync({ earningIds: selectedIds, payoutReference: reference.trim() });
            setSelectedIds([]);
            closeMarkPaid();
        } catch {
            // Shown in the modal; the settled invalidation refetches the ledger.
        }
    }, [closeMarkPaid, markPaid, reference, selectedIds]);

    const handleVoidClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            voidRedemption.reset();
            setVoidTargetId(event.currentTarget.dataset.earningId ?? null);
        },
        [voidRedemption],
    );

    const closeVoid = useCallback(() => {
        setVoidTargetId(null);
        setVoidReason('');
    }, []);

    const handleVoidReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setVoidReason(event.target.value), []);

    // Voiding reverses every row of that event, so the whole selection is dropped.
    const confirmVoid = useCallback(async () => {
        if (!voidTarget) return;
        try {
            await voidRedemption.mutateAsync({ eventId: voidTarget.eventId, input: { reason: voidReason.trim() } });
            setSelectedIds([]);
            closeVoid();
        } catch {
            // Shown in the modal.
        }
    }, [closeVoid, voidReason, voidRedemption, voidTarget]);

    return {
        isLoading: earningsQuery.isLoading,
        error: earningsQuery.error,
        filter,
        handleFilterClick,
        visibleEarnings,
        selectedIds,
        selectableCount: selectableIds.length,
        allSelected,
        handleToggle,
        handleToggleAll,
        clearSelection,
        selectionTotals,
        markPaidOpen,
        openMarkPaid,
        closeMarkPaid,
        reference,
        handleReferenceChange,
        confirmMarkPaid,
        canMarkPaid: reference.trim().length > 0,
        markPaidPending: markPaid.isPending,
        markPaidError: markPaid.error,
        voidOpen: Boolean(voidTarget),
        closeVoid,
        handleVoidClick,
        voidReason,
        handleVoidReasonChange,
        confirmVoid,
        canVoid: voidReason.trim().length > 0,
        voidPending: voidRedemption.isPending,
        voidError: voidRedemption.error,
    };
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useCollaborationsSection.ts hooks/useCollaboratorPane.ts hooks/useCollaboratorPortalLink.ts hooks/useCollaboratorLedger.ts`
Expected: no errors. If `react-hooks` flags `saveStatus`/`markPaid`/`voidRedemption` object deps, keep them — the existing admin hooks use the same pattern.

- [ ] **Step 6: Commit**

```bash
git add hooks/useCollaborationsSection.ts hooks/useCollaboratorPane.ts hooks/useCollaboratorPortalLink.ts hooks/useCollaboratorLedger.ts
git commit -m "Add hooks for the collaborations section and partner pane"
```

---

### Task 7: Rail, empty pane, header, status confirm, portal link

**Files (all under `components/admin/collaborations/`):**
- Create: `CollaboratorsRail.tsx`, `CollaboratorsPaneEmpty.tsx`, `CollaboratorPaneHeader.tsx`, `CollaboratorStatusConfirm.tsx`, `CollaboratorPortalLink.tsx`

Shared button classes used below (inline them per file; they match the existing admin buttons):
- Secondary: `'inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50'`
- Primary: `'inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50'`

- [ ] **Step 1: `CollaboratorsRail.tsx`**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { AdminRailItem } from '@/components/admin/AdminRailItem';
import { AdminRailSearch } from '@/components/admin/AdminRailSearch';
import { formatCurrencyAmounts, owedAmounts } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorsRail({
    collaborators,
    selectedId,
    search,
    onSearchChangeAction,
    onSelectAction,
    onCreateAction,
}: {
    collaborators: CollaboratorResponseDto[];
    selectedId: string | null;
    search: string;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onSelectAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onCreateAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const locale = useLocale();

    return (
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-52">
            {/* Search */}
            <AdminRailSearch value={search} placeholder={t('search')} onChangeAction={onSearchChangeAction} />

            {/* Partners */}
            <nav aria-label={t('title')} className="space-y-px">
                {collaborators.map((collaborator) => (
                    <AdminRailItem
                        key={collaborator.id}
                        data-collaborator-id={collaborator.id}
                        active={collaborator.id === selectedId}
                        muted={collaborator.status === 'SUSPENDED'}
                        onClick={onSelectAction}
                    >
                        <span className="truncate">{collaborator.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                            {formatCurrencyAmounts(locale, owedAmounts(collaborator.earningsTotals))}
                        </span>
                    </AdminRailItem>
                ))}
                {collaborators.length === 0 && search.trim() && <p className="px-2.5 py-2 text-xs text-ink-faint">{t('noMatches')}</p>}
            </nav>

            {/* Create */}
            <div className="border-t border-border pt-3">
                <AdminRailItem active={false} onClick={onCreateAction}>
                    <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('create')}
                    </span>
                </AdminRailItem>
            </div>
        </aside>
    );
}
```

- [ ] **Step 2: `CollaboratorsPaneEmpty.tsx`**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CollaboratorsPaneEmpty({ onCreateAction }: { onCreateAction: () => void }) {
    const t = useTranslations('AdminPage.collaborations');

    return (
        <div className="min-w-0 flex-1 space-y-3 py-6">
            {/* Empty */}
            <p className="text-sm text-ink-muted">{t('empty')}</p>
            <button
                type="button"
                onClick={onCreateAction}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
            >
                <Plus className="h-4 w-4" />
                {t('create')}
            </button>
        </div>
    );
}
```

- [ ] **Step 3: `CollaboratorPaneHeader.tsx`**

```tsx
'use client';

import { CirclePause, CirclePlay, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CollaboratorStatusPill } from '@/components/admin/CollaboratorStatusPill';
import type { CollaboratorResponseDto } from '@/lib/api/types';

const SECONDARY_BUTTON =
    'inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink';

export function CollaboratorPaneHeader({
    collaborator,
    onEditAction,
    onStatusAction,
}: {
    collaborator: CollaboratorResponseDto;
    onEditAction: () => void;
    onStatusAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const suspended = collaborator.status === 'SUSPENDED';

    return (
        <header className="space-y-2 border-b border-border pb-4">
            {/* Identity + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <h2 className="truncate text-xl font-semibold tracking-tight text-ink">{collaborator.name}</h2>
                    <span className="font-mono text-[11px] text-ink-faint">{collaborator.contactEmail}</span>
                    <CollaboratorStatusPill status={collaborator.status} />
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onStatusAction} className={SECONDARY_BUTTON}>
                        {suspended ? <CirclePlay className="h-4 w-4" /> : <CirclePause className="h-4 w-4" />}
                        {suspended ? t('reactivate.action') : t('suspend.action')}
                    </button>
                    <button type="button" onClick={onEditAction} className={SECONDARY_BUTTON}>
                        <Pencil className="h-4 w-4" />
                        {t('edit')}
                    </button>
                </div>
            </div>

            {/* Notes */}
            {collaborator.notes && <p className="max-w-3xl text-sm whitespace-pre-line text-ink-muted">{collaborator.notes}</p>}
        </header>
    );
}
```

- [ ] **Step 4: `CollaboratorStatusConfirm.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorStatusConfirm({
    open,
    collaborator,
    nextStatus,
    isConfirming,
    error,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto;
    nextStatus: CollaboratorResponseDto['status'];
    isConfirming: boolean;
    error: unknown;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const copy = nextStatus === 'SUSPENDED' ? 'suspend' : 'reactivate';

    return (
        <ConfirmActionModal
            open={open}
            onCloseAction={onCloseAction}
            title={t(`${copy}.title`, { name: collaborator.name })}
            body={
                <div className="space-y-2">
                    <p>{t(`${copy}.body`)}</p>
                    {Boolean(error) && <p className="text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            }
            cancelLabel={tAdmin('cancel')}
            confirmLabel={t(`${copy}.action`)}
            isConfirming={isConfirming}
            onConfirmAction={onConfirmAction}
            tone={nextStatus === 'SUSPENDED' ? 'danger' : 'default'}
        />
    );
}
```

- [ ] **Step 5: `CollaboratorPortalLink.tsx`**

```tsx
'use client';

import { Copy, KeyRound, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCollaboratorPortalLink } from '@/hooks/useCollaboratorPortalLink';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function CollaboratorPortalLink({ collaborator }: { collaborator: CollaboratorResponseDto }) {
    const t = useTranslations('AdminPage.collaborations.portal');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const portal = useCollaboratorPortalLink(collaborator);

    return (
        <section className="space-y-3">
            {/* Link status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        {collaborator.portalTokenIssuedAt
                            ? t('issuedAt', { date: formatDate(locale, collaborator.portalTokenIssuedAt, { dateStyle: 'medium' }) })
                            : t('notIssued')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={portal.requestIssue}
                    disabled={portal.isIssuing}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                    {portal.isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {collaborator.portalTokenIssued ? t('replace') : t('create')}
                </button>
            </div>

            {/* One-time link */}
            {portal.issuedUrl && (
                <div className="rounded-lg bg-status-warn-wash p-3 text-sm text-status-warn">
                    <p className="font-semibold">{t('once')}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-md bg-card px-2.5 py-2 font-mono text-xs text-ink">{portal.issuedUrl}</code>
                        <button
                            type="button"
                            onClick={portal.copy}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-card px-3 text-sm font-semibold text-ink"
                        >
                            <Copy className="h-4 w-4" />
                            {portal.copied ? t('copied') : t('copy')}
                        </button>
                    </div>
                </div>
            )}
            {Boolean(portal.error) && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(portal.error)}`)}</p>}

            <ConfirmActionModal
                open={portal.confirmOpen}
                onCloseAction={portal.closeConfirm}
                title={t('confirmTitle')}
                body={t('confirmBody')}
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('replace')}
                isConfirming={portal.isIssuing}
                onConfirmAction={portal.issue}
            />
        </section>
    );
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/collaborations`
Expected: no errors. If lucide-react does not export `CirclePause`/`CirclePlay`, use `PauseCircle`/`PlayCircle` instead.

- [ ] **Step 7: Commit**

```bash
git add components/admin/collaborations
git commit -m "Add collaborations rail, pane header and portal link"
```

---

### Task 8: Codes table

**Files:**
- Create: `components/admin/collaborations/CollaboratorCodesTable.tsx`
- Create: `components/admin/collaborations/CollaboratorCodeRow.tsx`

- [ ] **Step 1: `CollaboratorCodeRow.tsx`**

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminCodeStatusPill } from '@/components/admin/AdminCodeStatusPill';
import { CodeRestrictionPills } from '@/components/admin/CodeRestrictionPills';
import type { CollaborationCodeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function CollaboratorCodeRow({
    code,
    onEditAction,
}: {
    code: CollaborationCodeResponseDto;
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations.codes');

    return (
        <tr className={cn('border-b border-border last:border-b-0 hover:bg-canvas/60', code.status !== 'ACTIVE' && 'opacity-60')}>
            <td className="max-w-64 px-3 py-2">
                <p className="font-mono text-xs font-bold text-ink">{code.code}</p>
                <p className="truncate text-xs text-ink-muted">{code.label}</p>
            </td>
            <td className="px-2.5 py-2 text-ink-muted">{t('ratePair', { discount: code.discountPercent, commission: code.commissionPercent })}</td>
            <td className="px-2.5 py-2 font-mono text-ink">
                {code.maxRedemptions === null ? code.liveRedemptions : `${code.liveRedemptions} / ${code.maxRedemptions}`}
            </td>
            <td className="px-2.5 py-2">
                <CodeRestrictionPills restrictions={code} />
            </td>
            <td className="px-2.5 py-2">
                <AdminCodeStatusPill status={code.status} />
            </td>
            <td className="px-2.5 py-2 text-right">
                <button
                    type="button"
                    data-code-id={code.id}
                    onClick={onEditAction}
                    aria-label={t('edit')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            </td>
        </tr>
    );
}
```

- [ ] **Step 2: `CollaboratorCodesTable.tsx`**

```tsx
'use client';

import { Link2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { CollaboratorCodeRow } from '@/components/admin/collaborations/CollaboratorCodeRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto } from '@/lib/api/types';

export function CollaboratorCodesTable({
    codes,
    isLoading,
    error,
    onCreateAction,
    onLinkAction,
    onEditAction,
}: {
    codes: CollaborationCodeResponseDto[];
    isLoading: boolean;
    error: unknown;
    onCreateAction: () => void;
    onLinkAction: () => void;
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');

    return (
        <section className="space-y-3">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{t('codes.title')}</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onLinkAction}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                    >
                        <Link2 className="h-4 w-4" />
                        {t('linkCode.open')}
                    </button>
                    <button
                        type="button"
                        onClick={onCreateAction}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                        <Plus className="h-4 w-4" />
                        {t('codes.create')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card">
                {isLoading && <LoadingState label={t('codes.loading')} className="justify-start px-4 py-6" />}
                {Boolean(error) && <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                {!isLoading && !error && codes.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('codes.empty')}</p>}
                {codes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-[13px]">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="px-3 py-2 font-bold">{t('codes.columns.code')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.rates')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.redemptions')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.appliesTo')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('codes.columns.status')}</th>
                                    <th className="px-2.5 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map((code) => (
                                    <CollaboratorCodeRow key={code.id} code={code} onEditAction={onEditAction} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/collaborations`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/collaborations/CollaboratorCodesTable.tsx components/admin/collaborations/CollaboratorCodeRow.tsx
git commit -m "Add partner codes table including disabled codes"
```

---

### Task 9: Earnings — owed totals, ledger, selection bar, modals

**Files (all under `components/admin/collaborations/`):**
- Create: `CollaboratorOwedTotals.tsx`, `CollaboratorLedgerRow.tsx`, `LedgerSelectionBar.tsx`, `MarkPaidModal.tsx`, `VoidEarningModal.tsx`, `CollaboratorLedger.tsx`

- [ ] **Step 1: `CollaboratorOwedTotals.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { CollaborationEarningsTotalDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

export function CollaboratorOwedTotals({ totals }: { totals: CollaborationEarningsTotalDto[] }) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const locale = useLocale();

    if (totals.length === 0) return null;

    return (
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {totals.map((total) => (
                <div key={total.currency}>
                    <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('owed', { currency: total.currency })}</dt>
                    <dd className="mt-0.5 font-mono text-xl font-bold text-ink tabular-nums">{formatMoney(locale, total.accruedMinor, total.currency)}</dd>
                    <dd className="font-mono text-xs text-ink-muted">{t('paid', { amount: formatMoney(locale, total.paidMinor, total.currency) })}</dd>
                </div>
            ))}
        </dl>
    );
}
```

- [ ] **Step 2: `CollaboratorLedgerRow.tsx`**

```tsx
'use client';

import { Unlink2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { earningCodeText, shortId } from '@/lib/adminCollaborations';
import type { CollaborationCodeResponseDto, CollaborationEarningResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const STATUS_PILL: Record<CollaborationEarningResponseDto['status'], string> = {
    ACCRUED: 'bg-status-warn-wash text-status-warn',
    PAID: 'bg-status-good-wash text-status-good',
    REVERSED: 'bg-status-neutral-wash text-status-neutral',
};

export function CollaboratorLedgerRow({
    earning,
    codes,
    selected,
    onToggleAction,
    onVoidAction,
}: {
    earning: CollaborationEarningResponseDto;
    codes: CollaborationCodeResponseDto[];
    selected: boolean;
    onToggleAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onVoidAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const locale = useLocale();
    // A clawback row already is the reversal; voiding applies to the original accrual.
    const voidable = earning.status !== 'REVERSED' && earning.entryType === 'ACCRUAL';

    return (
        <tr className="border-b border-border last:border-b-0 hover:bg-canvas/60">
            <td className="px-3 py-2">
                <input
                    type="checkbox"
                    value={earning.id}
                    checked={selected}
                    onChange={onToggleAction}
                    disabled={earning.status !== 'ACCRUED'}
                    aria-label={t('earnings.select')}
                    className="h-4 w-4 accent-primary disabled:opacity-30"
                />
            </td>
            <td className="px-2.5 py-2 whitespace-nowrap text-ink-muted">{formatDate(locale, earning.accruedAt, { dateStyle: 'medium' })}</td>
            <td className="max-w-56 px-2.5 py-2">
                {earning.eventTitle ? (
                    <span className="block truncate text-ink">{earning.eventTitle}</span>
                ) : (
                    <span className="font-mono text-xs text-ink-faint">{shortId(earning.eventId)}</span>
                )}
            </td>
            <td className="px-2.5 py-2 font-mono text-xs font-bold text-ink">{earningCodeText(codes, earning.codeId)}</td>
            <td className="px-2.5 py-2 text-ink-muted">
                {t('earnings.basis', { percent: earning.commissionPercent, amount: formatMoney(locale, earning.basisAmountMinor, earning.currency) })}
            </td>
            <td className="px-2.5 py-2 whitespace-nowrap">
                <span className="font-mono font-semibold text-ink">{formatMoney(locale, earning.amountMinor, earning.currency)}</span>
                {earning.entryType === 'CLAWBACK' && (
                    <span className="ml-1.5 text-[10px] font-bold text-status-neutral">{t('earnings.entryTypes.CLAWBACK')}</span>
                )}
            </td>
            <td className="px-2.5 py-2">
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_PILL[earning.status])}>
                    {t(`earnings.status.${earning.status}`)}
                </span>
            </td>
            <td className="px-2.5 py-2">
                <p className="font-mono text-[11px] text-ink-faint">{earning.payoutReference ?? t('earnings.noReference')}</p>
                {earning.paidAt && <p className="text-[10.5px] text-ink-faint">{formatDate(locale, earning.paidAt, { dateStyle: 'medium' })}</p>}
            </td>
            <td className="px-2.5 py-2 text-right">
                <button
                    type="button"
                    data-earning-id={earning.id}
                    onClick={onVoidAction}
                    disabled={!voidable}
                    aria-label={t('void.action')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-status-danger transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <Unlink2 className="h-3.5 w-3.5" />
                </button>
            </td>
        </tr>
    );
}
```

- [ ] **Step 3: `LedgerSelectionBar.tsx`**

```tsx
'use client';

import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { type CurrencyAmount, formatCurrencyAmounts } from '@/lib/adminCollaborations';

export function LedgerSelectionBar({
    count,
    totals,
    onClearAction,
    onMarkPaidAction,
}: {
    count: number;
    totals: CurrencyAmount[];
    onClearAction: () => void;
    onMarkPaidAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const locale = useLocale();

    return (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-border bg-card px-4 py-3 shadow-[0_-8px_20px_-16px_rgba(18,20,28,0.35)]">
            {/* Selection summary */}
            <p className="text-sm font-semibold text-ink">
                {t('selected', { count })}
                <span className="ml-2 font-mono text-ink-muted">{formatCurrencyAmounts(locale, totals)}</span>
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onClearAction}
                    className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    {t('clear')}
                </button>
                <button
                    type="button"
                    onClick={onMarkPaidAction}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('markPaid')}
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: `MarkPaidModal.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type CurrencyAmount, formatCurrencyAmounts } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function MarkPaidModal({
    open,
    count,
    totals,
    reference,
    canConfirm,
    isConfirming,
    error,
    onReferenceChangeAction,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    count: number;
    totals: CurrencyAmount[];
    reference: string;
    canConfirm: boolean;
    isConfirming: boolean;
    error: unknown;
    onReferenceChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();

    return (
        <ConfirmActionModal
            open={open}
            onCloseAction={onCloseAction}
            title={t('confirmTitle')}
            body={
                <div className="space-y-3">
                    <p>{t('confirmBody', { count, amount: formatCurrencyAmounts(locale, totals) })}</p>
                    <AdminField label={t('payoutReference')} required>
                        <input value={reference} onChange={onReferenceChangeAction} maxLength={200} className={adminInputClass()} />
                    </AdminField>
                    {Boolean(error) && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            }
            cancelLabel={tAdmin('cancel')}
            confirmLabel={t('markPaid')}
            confirmDisabled={!canConfirm}
            isConfirming={isConfirming}
            onConfirmAction={onConfirmAction}
            tone="default"
        />
    );
}
```

- [ ] **Step 5: `VoidEarningModal.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function VoidEarningModal({
    open,
    reason,
    canConfirm,
    isConfirming,
    error,
    onReasonChangeAction,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    reason: string;
    canConfirm: boolean;
    isConfirming: boolean;
    error: unknown;
    onReasonChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage.collaborations.void');
    const tAdmin = useTranslations('AdminPage');

    return (
        <ConfirmActionModal
            open={open}
            onCloseAction={onCloseAction}
            title={t('confirmTitle')}
            body={
                <div className="space-y-3">
                    <p>{t('confirmBody')}</p>
                    <AdminField label={t('reason')} required>
                        <textarea value={reason} onChange={onReasonChangeAction} maxLength={1000} className={adminInputClass('min-h-24 resize-y')} />
                    </AdminField>
                    {Boolean(error) && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            }
            cancelLabel={tAdmin('cancel')}
            confirmLabel={t('action')}
            confirmDisabled={!canConfirm}
            isConfirming={isConfirming}
            onConfirmAction={onConfirmAction}
        />
    );
}
```

- [ ] **Step 6: `CollaboratorLedger.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CollaboratorLedgerRow } from '@/components/admin/collaborations/CollaboratorLedgerRow';
import { LedgerSelectionBar } from '@/components/admin/collaborations/LedgerSelectionBar';
import { MarkPaidModal } from '@/components/admin/collaborations/MarkPaidModal';
import { VoidEarningModal } from '@/components/admin/collaborations/VoidEarningModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaboratorLedger } from '@/hooks/useCollaboratorLedger';
import { EARNING_FILTERS } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function CollaboratorLedger({ collaboratorId, codes }: { collaboratorId: string; codes: CollaborationCodeResponseDto[] }) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const tAdmin = useTranslations('AdminPage');
    const ledger = useCollaboratorLedger(collaboratorId);

    return (
        <div className="rounded-xl border border-border bg-card">
            {/* Filter */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                    {EARNING_FILTERS.map((filter) => (
                        <button
                            key={filter}
                            type="button"
                            data-filter={filter}
                            onClick={ledger.handleFilterClick}
                            aria-pressed={ledger.filter === filter}
                            className={cn(
                                'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                ledger.filter === filter ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                            )}
                        >
                            {t(`filters.${filter}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rows */}
            {ledger.isLoading && <LoadingState label={t('loading')} className="justify-start px-4 py-6" />}
            {Boolean(ledger.error) && <p className="px-4 py-6 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(ledger.error)}`)}</p>}
            {!ledger.isLoading && !ledger.error && ledger.visibleEarnings.length === 0 && (
                <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
            )}
            {ledger.visibleEarnings.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse text-[13px]">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="w-10 px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={ledger.allSelected}
                                        onChange={ledger.handleToggleAll}
                                        disabled={ledger.selectableCount === 0}
                                        aria-label={t('selectAll')}
                                        className="h-4 w-4 accent-primary disabled:opacity-30"
                                    />
                                </th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.date')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.event')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.code')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.commission')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.amount')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.status')}</th>
                                <th className="px-2.5 py-2 font-bold">{t('columns.reference')}</th>
                                <th className="px-2.5 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.visibleEarnings.map((earning) => (
                                <CollaboratorLedgerRow
                                    key={earning.id}
                                    earning={earning}
                                    codes={codes}
                                    selected={ledger.selectedIds.includes(earning.id)}
                                    onToggleAction={ledger.handleToggle}
                                    onVoidAction={ledger.handleVoidClick}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selection */}
            {ledger.selectedIds.length > 0 && (
                <LedgerSelectionBar
                    count={ledger.selectedIds.length}
                    totals={ledger.selectionTotals}
                    onClearAction={ledger.clearSelection}
                    onMarkPaidAction={ledger.openMarkPaid}
                />
            )}

            <MarkPaidModal
                open={ledger.markPaidOpen}
                count={ledger.selectedIds.length}
                totals={ledger.selectionTotals}
                reference={ledger.reference}
                canConfirm={ledger.canMarkPaid}
                isConfirming={ledger.markPaidPending}
                error={ledger.markPaidError}
                onReferenceChangeAction={ledger.handleReferenceChange}
                onCloseAction={ledger.closeMarkPaid}
                onConfirmAction={ledger.confirmMarkPaid}
            />
            <VoidEarningModal
                open={ledger.voidOpen}
                reason={ledger.voidReason}
                canConfirm={ledger.canVoid}
                isConfirming={ledger.voidPending}
                error={ledger.voidError}
                onReasonChangeAction={ledger.handleVoidReasonChange}
                onCloseAction={ledger.closeVoid}
                onConfirmAction={ledger.confirmVoid}
            />
        </div>
    );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/collaborations`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/admin/collaborations
git commit -m "Add partner earnings ledger with selection-based mark paid"
```

---

### Task 10: Pane, section, drawer updates, and the swap

**Files:**
- Create: `components/admin/collaborations/CollaboratorPane.tsx`
- Create: `components/admin/collaborations/CollaborationsSection.tsx`
- Modify: `components/admin/CollaboratorDrawer.tsx`
- Modify: `components/admin/CollaborationCodeDrawer.tsx`
- Modify: `lib/adminCollaborations.ts` (`collaboratorRequestFromFormData`)
- Modify: `components/admin/AdminConsole.tsx`

- [ ] **Step 1: `collaboratorRequestFromFormData` no longer carries status**

In `lib/adminCollaborations.ts` replace the function with:

```ts
// Status changes go through Suspend/Reactivate. null leaves it alone on edit and means ACTIVE on create.
export function collaboratorRequestFromFormData(formData: FormData): CollaboratorRequestDto {
    return {
        name: String(formData.get('name') ?? '').trim(),
        contactEmail: String(formData.get('contactEmail') ?? '')
            .trim()
            .toLowerCase(),
        notes: String(formData.get('notes') ?? '').trim() || null,
        status: null,
    };
}
```

Add to `lib/adminCollaborations.test.ts` (and add `collaboratorRequestFromFormData` to its import list):

```ts
describe('collaboratorRequestFromFormData', () => {
    it('trims, lowercases the email, and never sends a status', () => {
        const formData = new FormData();
        formData.set('name', '  Barn Venue ');
        formData.set('contactEmail', ' Hello@Barn.TEST ');
        formData.set('notes', '   ');
        expect(collaboratorRequestFromFormData(formData)).toEqual({
            name: 'Barn Venue',
            contactEmail: 'hello@barn.test',
            notes: null,
            status: null,
        });
    });
});
```

Run: `npx vitest run lib/adminCollaborations.test.ts`
Expected: PASS.

- [ ] **Step 2: Update `CollaboratorDrawer`**

Replace the whole of `components/admin/CollaboratorDrawer.tsx` with:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useSaveCollaborator } from '@/hooks/useAdmin';
import { collaboratorRequestFromFormData } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorDrawer({
    open,
    collaborator,
    onCloseAction,
    onSavedAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto | null;
    onCloseAction: () => void;
    onSavedAction?: (collaborator: CollaboratorResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const saveCollaborator = useSaveCollaborator();

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = collaboratorRequestFromFormData(new FormData(event.currentTarget));
        const saved = await saveCollaborator.mutateAsync({ id: collaborator?.id, input });
        onSavedAction?.(saved);
        onCloseAction();
    }

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={tAdmin('cancel')}
            title={collaborator ? t('drawer.editTitle', { name: collaborator.name }) : t('drawer.createTitle')}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCloseAction}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="collaborator-form"
                        disabled={saveCollaborator.isPending}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saveCollaborator.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <form id="collaborator-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Identity */}
                <AdminField label={t('fields.name')} required>
                    <input name="name" required maxLength={200} defaultValue={collaborator?.name} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.contactEmail')} required>
                    <input
                        name="contactEmail"
                        required
                        type="email"
                        maxLength={320}
                        defaultValue={collaborator?.contactEmail}
                        className={adminInputClass()}
                    />
                </AdminField>

                {/* Notes */}
                <AdminField label={t('fields.notes')} optional>
                    <textarea
                        name="notes"
                        maxLength={2000}
                        defaultValue={collaborator?.notes ?? ''}
                        className={adminInputClass('min-h-28 resize-y')}
                    />
                </AdminField>
                {saveCollaborator.error && (
                    <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(saveCollaborator.error)}`)}</p>
                )}
            </form>
        </AdminDrawer>
    );
}
```

(`AdminDrawer`'s `subtitle` is already optional, so dropping it needs no other change.)

- [ ] **Step 3: Label limit in `CollaborationCodeDrawer`**

In `components/admin/CollaborationCodeDrawer.tsx`, change the label input's `maxLength={140}` to `maxLength={200}`.

- [ ] **Step 4: `CollaboratorPane.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CollaborationCodeDrawer } from '@/components/admin/CollaborationCodeDrawer';
import { CollaboratorCodesTable } from '@/components/admin/collaborations/CollaboratorCodesTable';
import { CollaboratorLedger } from '@/components/admin/collaborations/CollaboratorLedger';
import { CollaboratorOwedTotals } from '@/components/admin/collaborations/CollaboratorOwedTotals';
import { CollaboratorPaneHeader } from '@/components/admin/collaborations/CollaboratorPaneHeader';
import { CollaboratorPortalLink } from '@/components/admin/collaborations/CollaboratorPortalLink';
import { CollaboratorStatusConfirm } from '@/components/admin/collaborations/CollaboratorStatusConfirm';
import { CollaboratorDrawer } from '@/components/admin/CollaboratorDrawer';
import { LinkPartnerDiscountCodeDrawer } from '@/components/admin/LinkPartnerDiscountCodeDrawer';
import { useCollaboratorPane } from '@/hooks/useCollaboratorPane';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorPane({ collaborator }: { collaborator: CollaboratorResponseDto }) {
    const t = useTranslations('AdminPage.collaborations');
    const pane = useCollaboratorPane(collaborator);

    return (
        <div className="min-w-0 flex-1 space-y-8">
            {/* Header */}
            <CollaboratorPaneHeader collaborator={collaborator} onEditAction={pane.openEdit} onStatusAction={pane.openStatusConfirm} />

            {/* Portal link */}
            <CollaboratorPortalLink collaborator={collaborator} />

            {/* Codes */}
            <CollaboratorCodesTable
                codes={pane.codes}
                isLoading={pane.codesLoading}
                error={pane.codesError}
                onCreateAction={pane.openCreateCode}
                onLinkAction={pane.openLink}
                onEditAction={pane.handleEditCodeClick}
            />

            {/* Earnings */}
            <section className="space-y-3">
                <h3 className="text-base font-semibold text-ink">{t('earnings.title')}</h3>
                <CollaboratorOwedTotals totals={collaborator.earningsTotals} />
                <CollaboratorLedger collaboratorId={collaborator.id} codes={pane.codes} />
            </section>

            <CollaboratorDrawer open={pane.editOpen} collaborator={collaborator} onCloseAction={pane.closeEdit} />
            <CollaborationCodeDrawer
                key={pane.editingCode?.id ?? 'new-code'}
                open={pane.codeDrawerOpen}
                collaborator={collaborator}
                code={pane.editingCode}
                onCloseAction={pane.closeCodeDrawer}
            />
            <LinkPartnerDiscountCodeDrawer open={pane.linkOpen} collaborator={collaborator} onCloseAction={pane.closeLink} />
            <CollaboratorStatusConfirm
                open={pane.statusConfirmOpen}
                collaborator={collaborator}
                nextStatus={pane.nextStatus}
                isConfirming={pane.statusSaving}
                error={pane.statusError}
                onCloseAction={pane.closeStatusConfirm}
                onConfirmAction={pane.confirmStatusChange}
            />
        </div>
    );
}
```

- [ ] **Step 5: `CollaborationsSection.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CollaboratorPane } from '@/components/admin/collaborations/CollaboratorPane';
import { CollaboratorsPaneEmpty } from '@/components/admin/collaborations/CollaboratorsPaneEmpty';
import { CollaboratorsRail } from '@/components/admin/collaborations/CollaboratorsRail';
import { CollaboratorDrawer } from '@/components/admin/CollaboratorDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaborationsSection } from '@/hooks/useCollaborationsSection';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function CollaborationsSection() {
    const t = useTranslations('AdminPage');
    const section = useCollaborationsSection();
    const ready = !section.isLoading && !section.error;

    return (
        <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-dark uppercase">{t('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('collaborations.title')}</h1>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                {/* Rail */}
                <CollaboratorsRail
                    collaborators={section.railCollaborators}
                    selectedId={section.selectedCollaborator?.id ?? null}
                    search={section.search}
                    onSearchChangeAction={section.handleSearchChange}
                    onSelectAction={section.handleRailClick}
                    onCreateAction={section.openCreate}
                />

                {/* Pane */}
                {section.isLoading && <LoadingState label={t('collaborations.loading')} className="justify-start py-6" />}
                {Boolean(section.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(section.error)}`)}</p>}
                {ready && !section.selectedCollaborator && <CollaboratorsPaneEmpty onCreateAction={section.openCreate} />}
                {ready && section.selectedCollaborator && (
                    <CollaboratorPane key={section.selectedCollaborator.id} collaborator={section.selectedCollaborator} />
                )}
            </div>

            <CollaboratorDrawer
                open={section.createOpen}
                collaborator={null}
                onCloseAction={section.closeCreate}
                onSavedAction={section.handleCreated}
            />
        </div>
    );
}
```

- [ ] **Step 6: Swap in `AdminConsole`**

In `components/admin/AdminConsole.tsx`:
- Replace `import { CollaborationsPanel } from '@/components/admin/CollaborationsPanel';` with `import { CollaborationsSection } from '@/components/admin/collaborations/CollaborationsSection';`
- Replace `if (tab === 'collaborations') return <CollaborationsPanel />;` with `if (tab === 'collaborations') return <CollaborationsSection />;`

The old `CollaborationsPanel` is now unrendered but still compiles (`onSavedAction` is optional); it is deleted in Task 11.

- [ ] **Step 7: Typecheck, lint, tests**

Run: `npx tsc --noEmit && npx eslint components/admin lib/adminCollaborations.ts && npx vitest run lib/adminCollaborations.test.ts lib/adminCollaborationsRouting.test.ts`
Expected: no errors; tests PASS. (`npx eslint --fix` resolves any import-order complaint.)

- [ ] **Step 8: Commit**

```bash
git add components/admin lib/adminCollaborations.ts lib/adminCollaborations.test.ts
git commit -m "Switch Collaborations to the rail and partner pane layout"
```

---

### Task 11: Remove the old panel, dead helpers and unused copy

**Files:**
- Delete: `components/admin/CollaborationsPanel.tsx`, `components/admin/CollaboratorsCatalogTable.tsx`, `components/admin/CollaboratorOperationsDrawer.tsx`, `components/admin/CollaborationEarningsPanel.tsx`, `components/admin/CollaborationVoidRedemptionForm.tsx`, `hooks/useCollaborationsAdmin.ts`
- Modify: `hooks/useAdmin.ts`, `lib/adminCollaborations.ts`, `messages/en.json`, `messages/el.json`
- Delete: `scripts/tmp-collaborations-i18n.mjs`

- [ ] **Step 1: Delete the old files**

```bash
git rm components/admin/CollaborationsPanel.tsx components/admin/CollaboratorsCatalogTable.tsx components/admin/CollaboratorOperationsDrawer.tsx components/admin/CollaborationEarningsPanel.tsx components/admin/CollaborationVoidRedemptionForm.tsx hooks/useCollaborationsAdmin.ts
```

- [ ] **Step 2: Remove the totals hook and dead helpers**

- `hooks/useAdmin.ts`: delete `useCollaboratorEarningsTotals`, delete the `collaboratorEarningsTotals` entry in `adminKeys`, and drop `CollaborationEarningsTotalDto` from the type import if nothing else in the file uses it.
- `lib/adminCollaborations.ts`: delete `collaboratorStats`, `owedMinor`, `balanceMinor`.

Leave `endpoints.admin.collaborators.earningsTotals` in `lib/api/endpoints.ts` (the endpoint still exists server-side) only if something references it; otherwise delete that line too.

Run: `grep -rn "useCollaboratorEarningsTotals\|collaboratorEarningsTotals\|collaboratorStats\|owedMinor\|balanceMinor\|CollaborationsPanel\|CollaboratorOperationsDrawer\|CollaborationEarningsPanel\|CollaboratorsCatalogTable\|CollaborationVoidRedemptionForm\|useCollaborationsAdmin\|earnings.earningsTotals\|collaborators.earningsTotals" components hooks lib app`
Expected: no output (or only the endpoint line, if you kept it because something uses it).

- [ ] **Step 3: Remove unused copy**

Run: `node scripts/tmp-collaborations-i18n.mjs remove`
Then: `git diff --stat messages/`
Expected: only the two message files change, inside the collaborations block.

Check no remaining code references a removed key:
```bash
grep -rn "collaborations\.\(subtitle\|manage\|rowCount\|selectPrompt\|stats\)\|t('columns\.\(partner\|contact\|portal\)')\|portal\.\(description\|issue\b\|issued\b\)\|earnings\.\(loadingTotals\|emptyTotals\|paidBalance\|markPaidTitle\|ledger\|details\|detailTitle\|entryType\b\|paidAt\|selectAccrued\|on\b\|confirmBodyMixed\)" components hooks lib app
```
Expected: no output.

- [ ] **Step 4: Delete the temporary script**

```bash
rm scripts/tmp-collaborations-i18n.mjs
```
(`scripts/` already existed — it holds `install-git-hooks.mjs` — so keep the directory.)

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: tsc clean; lint 0 errors (fix any before continuing); all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A components/admin hooks lib messages
git commit -m "Remove the old collaborations panel, drawers and unused copy"
```

---

### Task 12: Visual and flow verification

Prerequisite: the local backend on :8080 must be rebuilt/restarted so `GET /api/admin/collaborators` returns `earningsTotals` and the earnings rows return `eventTitle`. Check in the browser pane's network log (`read_network_requests` with `urlPattern: "collaborators"`) before judging the UI. If the fields are missing, stop and ask the user to restart the backend.

Use the in-app browser only via `preview_start {url: "http://localhost:3000/admin#collaborations"}` (never `preview_start {name}`). Log in with the admin test account the user provided in chat if the session has expired.

- [ ] **Step 1: Desktop layout parity (1440×900)**

Screenshot `#plans` and `#collaborations`. Confirm: same header block, same rail width/position/item style, pane fills remaining width, no stat tiles, codes and ledger tables do not scroll horizontally at this width.

- [ ] **Step 2: Phone width (375×812)**

Confirm the rail stacks above the pane, header actions wrap without overlap, tables scroll horizontally inside their card and the page itself does not.

- [ ] **Step 3: Flows**

Run each and confirm the result on screen:
1. New partner (rail) → saved partner is selected and the URL is `#collaborations/<its id>`.
2. Refresh → same partner stays selected. Visit `#collaborations/does-not-exist` → first partner selected, URL corrected.
3. Portal link: a partner without a link shows "Create link" and issues without a modal; the URL shows once with Copy. "Replace link" asks first.
4. New code → appears in the table. Edit it to Disabled → stays in the table, muted, at the bottom. Edit back to Active.
5. Link existing code → drawer opens alone (no drawer underneath).
6. Ledger: tick accrued rows → selection bar shows count and total; Mark paid → modal requires a reference; confirm → rows turn Paid, rail and owed figure update.
7. Void a row → modal requires a reason; confirm → row Reversed, totals update.
8. Suspend → confirm → pill Suspended, rail item muted. Reactivate → back to Active.

- [ ] **Step 4: Reset the viewport**

Call `resize_window` with `preset: "desktop"`.

- [ ] **Step 5: Report**

Summarise what was verified, with the screenshots, and anything that could not be verified (for example, no clawback rows in local data).
