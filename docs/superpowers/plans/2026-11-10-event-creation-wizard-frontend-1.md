# Event Creation Wizard (Frontend, part 1: foundations, pop-up and buttons) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behind a launch flag, let anyone open the create wizard as a pop-up over any page (or full-page at `/events/new`), keep their answers across reloads and closes, and add the create buttons to the site header, the app rail, phones and the signed-in home.

**Architecture:** A server-read flag (`showsCreateWizard()`) reaches client code through a small context set in both root layouts. The existing `useCreateEventFormController` gains a `wizard` mode: step changes go through `pushPageEntry`/`replacePageUrl` on the current URL, and answers are saved to localStorage. One `CreateEventWizard` body renders in two shells: the `/events/new` page and a lazy-loaded pop-up opened by `?create=1`. A host mounted in the public and app layouts opens the pop-up when any link to `/events/new` is clicked, so existing buttons need no changes. The steps themselves keep today's look in this part; parts 2 and 3 restyle them.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, TanStack Query 5, Base UI dialog (`components/ui/modal.tsx`), Vitest + Testing Library, Storybook 10.

**Spec:** `docs/superpowers/specs/2026-11-10-event-creation-wizard-design.md` (sections 3, 4, 8, 9, 11; work order items 2 and 3). Wording: `...-copy.md` rows 1 and 2. Jira epic KAN-197.

**Not in this part:** the new type, plan, details, account, code, review and celebration screens (parts 2 and 3). Until part 3 lands, a signed-out visitor on staging can walk the wizard to review but can't pay; an unverified account can't pay either. Production is unchanged because the flag is off.

---

## Before you start

- Work in this worktree on `claude/kan-197-event-creation-wizard`. Bring it up to date with `staging` first: `git fetch origin && git rebase origin/staging`.
- If `node_modules` is missing, link it to the main checkout's (memory note "Worktree node_modules junction") when the lockfiles match.
- The backend plan (`2026-11-10-event-creation-wizard-backend.md`) must be merged and deployed to staging before Task 8's signed-out plan list can be checked on staging. Tests here mock the API, so the work itself doesn't wait for it.
- Run one test file with `npx vitest run <path>`. Whole suite: `npx vitest run`. Types: `npx tsc --noEmit`. Lint: `npx eslint .`.
- Commit messages start with `KAN-197:` and end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name. A local `next dev` run edits `AGENTS.md`: revert that, never commit it.
- Never change user-facing wording beyond what this plan lists. The only new strings are wording row 2 and the reused "Close" / "Κλείσιμο" (approved 2026-11-10).

## Decisions taken while planning (differ from the spec text, approved or technical)

1. **Links open the pop-up through one click listener**, not a `CreateEventLink` component (approved by the user 2026-11-10). The host catches clicks on any same-origin link to `/events/new` and opens the pop-up with that link's params. Landing, occasion, QR wedding and home links stay as they are.
2. **The pop-up doesn't use `registerOverlayHistory`.** Its open state is the URL (`?create=1`), and each step is its own history entry. `registerOverlayHistory` treats a Back onto an entry that still carries its id as a stale entry and steps back once more, which would close the wizard on every step Back. Instead, every wizard entry records how deep into the wizard it is, and closing goes back that many entries (or replaces the URL when the page was loaded with `?create=1`). What the user sees is what the spec describes.
3. **The flag reaches the browser through `CreateWizardFlagProvider`.** `showsCreateWizard()` reads `VERCEL_ENV`, which the browser never sees, so client code can't call it directly. The provider also carries the "Create an event" label, because public pages don't ship the `CreateEventPage` messages and the landing hero that renders the header is a client component.

## Files

| File | Change |
|---|---|
| `lib/unreleasedPages.ts` (+ test) | `CREATE_WIZARD_LAUNCHED`, `showsCreateWizard()` |
| `providers/CreateWizardFlagProvider.tsx` (+ test) | New: context with the flag |
| `app/(landing)/layout.tsx`, `app/(main)/layout.tsx` | Provide the flag; landing mounts the pop-up host and the phone button |
| `app/(main)/(app)/layout.tsx` | Mounts the pop-up host |
| `lib/overlayHistory.ts` (+ test) | `pushPageEntry(url, extraState)` |
| `lib/createEventWizardUrl.ts` (+ test) | New: wizard params on the current URL, link → pop-up URL |
| `lib/createEventWizardHistory.ts` (+ test) | New: wizard entries with a depth, close |
| `lib/createEventWizardDraft.ts` (+ test) | New: saved answers in localStorage |
| `hooks/useCreateEventWizardDraft.ts` | New: read once, save, clear |
| `hooks/useCreateEventGift.ts` | Optional starting values; exposes `isGift` |
| `hooks/useCreateEventStepNavigation.ts` (+ test) | New: step push/replace for router or history |
| `hooks/useCreateEventFormController.ts` | `mode` option: history navigation, saved answers, plans signed out |
| `providers/CreateEventFormProvider.tsx` | Passes `mode` |
| `hooks/useCreateEventRun.ts` (+ test) | `mode` option: run on the current URL, resumes the saved run |
| `hooks/usePlanTiersForEventType.ts` | `allowSignedOut` |
| `providers/AuthProvider.tsx` | Sign-out clears saved answers |
| `proxy.ts` (+ test) | `/events/new` open to visitors when the flag is on |
| `lib/createEventWizardProgress.ts` (+ test) | New: step n of N |
| `components/event/create/wizard/CreateEventWizard.tsx` (+ story) | New: shared body |
| `components/event/create/wizard/CreateEventWizardProgress.tsx` | New: bar and counter |
| `hooks/useCreateEventWizardAccess.ts` (+ test) | New: admin redirect, loading |
| `components/event/create/wizard/CreateEventWizardPage.tsx` | New: page shell |
| `app/(main)/events/new/page.tsx` | Picks the shell by flag; plans without a token; `noindex` |
| `i18n/publicMessages.ts` | Export `pickNamespaces` |
| `i18n/createWizardMessages.ts` (+ test) | New: the wizard's namespaces |
| `lib/createEventWizardMessages.ts` | New: server action returning them |
| `components/event/create/wizard/CreateEventWizardMessages.tsx` | New: nested messages provider on public pages |
| `components/event/create/wizard/CreateEventDialog.tsx` (+ story) | New: pop-up shell, lazy-loaded |
| `hooks/useCreateEventDialogHost.ts` (+ test) | New: open state, link clicks, preload, close, focus |
| `components/event/create/wizard/CreateEventDialogHost.tsx` | New: always-mounted host |
| `i18n/publicMessages.test.ts` | The pop-up is a lazy boundary |
| `components/landing/LandingHeader.tsx` | Header button |
| `components/layout/DesktopNavRail.tsx` | Rail button |
| `hooks/useCreateEventFabVisible.ts` (+ test), `components/event/create/wizard/CreateEventFab.tsx` | New: phone button on public pages |
| `components/home/HomeCreateEventButton.tsx`, `components/home/HomeContent.tsx`, `hooks/useHomeContent.ts` (+ `.test.tsx`) | Home button; unverified accounts can start |
| `messages/en.json`, `messages/el.json` | `CreateEventPage.wizard.stepCounter`, `CreateEventPage.wizard.close` |

---

### Task 1: The launch flag

**Files:**
- Modify: `lib/unreleasedPages.ts`
- Test: `lib/unreleasedPages.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/unreleasedPages.test.ts` (and add `showsCreateWizard` to its import):

```ts
describe('showsCreateWizard', () => {
    it('keeps the old create flow on the production site', () => {
        expect(showsCreateWizard({ VERCEL_ENV: 'production' }, false)).toBe(false);
    });

    it('shows the wizard on staging, previews and locally', () => {
        expect(showsCreateWizard({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' }, false)).toBe(true);
        expect(showsCreateWizard({ VERCEL_ENV: 'preview' }, false)).toBe(true);
        expect(showsCreateWizard({}, false)).toBe(true);
    });

    it('shows it on the production site once launched', () => {
        expect(showsCreateWizard({ VERCEL_ENV: 'production' }, true)).toBe(true);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/unreleasedPages.test.ts`
Expected: FAIL, `showsCreateWizard` is not exported.

- [ ] **Step 3: Add the flag**

Append to `lib/unreleasedPages.ts`:

```ts
// The pop-up create wizard (KAN-197). While this is false the production site keeps the old create
// flow: sign-in first, /events/new protected, no header, rail, phone or home create buttons.
export const CREATE_WIZARD_LAUNCHED = false;

// Server only: VERCEL_ENV never reaches the browser. Client code reads useCreateWizardEnabled().
export function showsCreateWizard(env: DeploymentEnv = currentEnv(), launched = CREATE_WIZARD_LAUNCHED): boolean {
    return showsUnreleasedPages(env, launched);
}
```

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run lib/unreleasedPages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/unreleasedPages.ts lib/unreleasedPages.test.ts
git commit -m "KAN-197: launch flag for the create wizard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The flag (and the button label) reach the browser

The provider also carries the "Create an event" label (wording row 1, the existing `CreateEventPage.title`). Public pages don't ship the `CreateEventPage` messages, and the landing hero that renders the header is a client component, so the server layouts read the label once and every new button (header, phone button) takes it from here.

**Files:**
- Create: `providers/CreateWizardFlagProvider.tsx`
- Test: `providers/CreateWizardFlagProvider.test.tsx`
- Modify: `app/(landing)/layout.tsx`, `app/(main)/layout.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CreateWizardFlagProvider, useCreateEventButtonLabel, useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

function Probe() {
    return (
        <span>
            {useCreateWizardEnabled() ? 'on' : 'off'}:{useCreateEventButtonLabel()}
        </span>
    );
}

afterEach(cleanup);

describe('CreateWizardFlagProvider', () => {
    it('is off, with no label, outside the provider', () => {
        render(<Probe />);
        expect(screen.getByText('off:')).toBeTruthy();
    });

    it('reads the values the server passed', () => {
        render(
            <CreateWizardFlagProvider enabled createLabel="Create an event">
                <Probe />
            </CreateWizardFlagProvider>,
        );
        expect(screen.getByText('on:Create an event')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run providers/CreateWizardFlagProvider.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the provider**

```tsx
'use client';

import { createContext, type ReactNode, useContext } from 'react';

// showsCreateWizard() reads VERCEL_ENV, which the browser never sees, so the root layouts read it on
// the server and hand it down here, with the create buttons' label (public pages don't ship the
// CreateEventPage messages). Off by default: anything outside the provider keeps the old flow.
type CreateWizardFlag = { enabled: boolean; createLabel: string };

const CreateWizardFlagContext = createContext<CreateWizardFlag>({ enabled: false, createLabel: '' });

export function CreateWizardFlagProvider({ enabled, createLabel, children }: CreateWizardFlag & { children: ReactNode }) {
    return <CreateWizardFlagContext.Provider value={{ enabled, createLabel }}>{children}</CreateWizardFlagContext.Provider>;
}

export function useCreateWizardEnabled(): boolean {
    return useContext(CreateWizardFlagContext).enabled;
}

// "Create an event", for the header and the phone button.
export function useCreateEventButtonLabel(): string {
    return useContext(CreateWizardFlagContext).createLabel;
}
```

If the `react/jsx-no-constructed-context-values` lint rule flags the inline value, wrap it in `useMemo(() => ({ enabled, createLabel }), [enabled, createLabel])`.

- [ ] **Step 4: Provide it in both root layouts**

In `app/(landing)/layout.tsx`, import `CreateWizardFlagProvider`, `showsCreateWizard` and `getTranslations` (add it to the existing `next-intl/server` import), read the label before the `return`:

```tsx
    const createLabel = (await getTranslations('CreateEventPage'))('title');
```

and wrap the `HydrationBoundary` inside `PublicProviders`:

```tsx
            <PublicProviders>
                <CreateWizardFlagProvider enabled={showsCreateWizard()} createLabel={createLabel}>
                    <HydrationBoundary state={dehydrate(queryClient)}>
                        {/* Notice */}
                        <SiteNoticeStickyBar initialDismissed={dismissed} />
                        {children}
                    </HydrationBoundary>
                </CreateWizardFlagProvider>
                <LinkClickTracker />
            </PublicProviders>
```

In `app/(main)/layout.tsx`, the same: the same imports, the same `createLabel` line before its `return`, and around its `HydrationBoundary` inside `AppProviders`:

```tsx
            <AppProviders handoff={handoff}>
                <CreateWizardFlagProvider enabled={showsCreateWizard()} createLabel={createLabel}>
                    <HydrationBoundary state={dehydrate(queryClient)}>
                        <SiteNoticeFrame initialDismissed={dismissed}>{children}</SiteNoticeFrame>
                    </HydrationBoundary>
                </CreateWizardFlagProvider>
            </AppProviders>
```

- [ ] **Step 5: Run the test and the type check**

Run: `npx vitest run providers/CreateWizardFlagProvider.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add providers/CreateWizardFlagProvider.tsx providers/CreateWizardFlagProvider.test.tsx "app/(landing)/layout.tsx" "app/(main)/layout.tsx"
git commit -m "KAN-197: hand the create wizard flag to the browser" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Wizard URLs and history entries

**Files:**
- Modify: `lib/overlayHistory.ts`
- Create: `lib/createEventWizardUrl.ts`, `lib/createEventWizardHistory.ts`
- Test: `lib/overlayHistory.test.ts` (extend), `lib/createEventWizardUrl.test.ts`, `lib/createEventWizardHistory.test.ts`

- [ ] **Step 1: Write the failing URL tests**

```ts
import { describe, expect, it } from 'vitest';

import {
    CREATE_WIZARD_PARAM,
    isCreateEventHref,
    isWizardOpen,
    withoutWizardParams,
    withWizardParams,
    wizardUrlForLink,
} from '@/lib/createEventWizardUrl';

const ORIGIN = 'https://www.storywall.gr';
const at = (path: string) => new URL(path, ORIGIN);

describe('isCreateEventHref', () => {
    it('matches the create page with or without params', () => {
        expect(isCreateEventHref('/events/new', ORIGIN)).toBe(true);
        expect(isCreateEventHref('/events/new?type=wedding&code=SPRING', ORIGIN)).toBe(true);
        expect(isCreateEventHref(`${ORIGIN}/events/new`, ORIGIN)).toBe(true);
    });

    it('ignores other pages and other sites', () => {
        expect(isCreateEventHref('/events/new/extra', ORIGIN)).toBe(false);
        expect(isCreateEventHref('/home', ORIGIN)).toBe(false);
        expect(isCreateEventHref('https://example.com/events/new', ORIGIN)).toBe(false);
        expect(isCreateEventHref('#pricing', ORIGIN)).toBe(false);
    });
});

describe('wizardUrlForLink', () => {
    it("opens the pop-up on the current page with the link's params", () => {
        expect(wizardUrlForLink('/events/new?type=baptism&code=SPRING', at('/el/vaptisi?src=ig#faq'))).toBe(
            `/el/vaptisi?src=ig&${CREATE_WIZARD_PARAM}=1&type=baptism&code=SPRING#faq`,
        );
    });

    it('drops wizard params left from an earlier run', () => {
        expect(wizardUrlForLink('/events/new', at('/?create=1&step=details&run=abc'))).toBe('/?create=1');
    });
});

describe('withWizardParams', () => {
    it('sets and removes params, keeping the rest', () => {
        expect(withWizardParams(at('/?create=1&type=wedding&step=type'), { step: 'plan', run: 'r1' })).toBe(
            '/?create=1&type=wedding&step=plan&run=r1',
        );
        expect(withWizardParams(at('/events/new?step=plan'), { step: null })).toBe('/events/new');
    });
});

describe('withoutWizardParams', () => {
    it('removes every wizard param and keeps the page', () => {
        expect(withoutWizardParams(at('/el?src=ig&create=1&step=plan&run=r&type=wedding&plan=BASIC&option=o&code=C#top'))).toBe('/el?src=ig#top');
    });
});

describe('isWizardOpen', () => {
    it('is open only on create=1', () => {
        expect(isWizardOpen(new URLSearchParams('create=1'))).toBe(true);
        expect(isWizardOpen(new URLSearchParams('create=0'))).toBe(false);
        expect(isWizardOpen(new URLSearchParams(''))).toBe(false);
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/createEventWizardUrl.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the URL helpers**

```ts
import {
    CREATE_EVENT_CODE_PARAM,
    CREATE_EVENT_OPTION_PARAM,
    CREATE_EVENT_PLAN_PARAM,
    CREATE_EVENT_RUN_PARAM,
    CREATE_EVENT_TYPE_PARAM,
} from '@/lib/createEventSteps';
import { routes } from '@/lib/routes';

// `?create=1` opens the create wizard as a pop-up over the page in the URL.
export const CREATE_WIZARD_PARAM = 'create';
export const CREATE_EVENT_STEP_PARAM = 'step';

// Every param the wizard reads or writes. Closing the pop-up removes them all.
const WIZARD_PARAMS = [
    CREATE_WIZARD_PARAM,
    CREATE_EVENT_STEP_PARAM,
    CREATE_EVENT_RUN_PARAM,
    CREATE_EVENT_TYPE_PARAM,
    CREATE_EVENT_PLAN_PARAM,
    CREATE_EVENT_OPTION_PARAM,
    CREATE_EVENT_CODE_PARAM,
] as const;

function relative(url: URL): string {
    return `${url.pathname}${url.search}${url.hash}`;
}

export function isWizardOpen(searchParams: URLSearchParams): boolean {
    return searchParams.get(CREATE_WIZARD_PARAM) === '1';
}

// A link (as written in an href) to the create page on this site.
export function isCreateEventHref(href: string, origin: string): boolean {
    try {
        const url = new URL(href, origin);
        return url.origin === origin && url.pathname === routes.events.new();
    } catch {
        return false;
    }
}

// The URL that opens the pop-up over the current page, carrying the clicked link's own params
// (type, plan, option, code), so it opens where the link would have.
export function wizardUrlForLink(createHref: string, current: URL): string {
    const target = new URL(withoutWizardParams(current), current.origin);
    target.searchParams.set(CREATE_WIZARD_PARAM, '1');
    new URL(createHref, current.origin).searchParams.forEach((value, key) => target.searchParams.set(key, value));
    return relative(target);
}

// The current URL with these params set (a string) or removed (null), everything else kept.
export function withWizardParams(current: URL, params: Partial<Record<(typeof WIZARD_PARAMS)[number], string | null>>): string {
    const next = new URL(current.href);
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') next.searchParams.delete(key);
        else next.searchParams.set(key, value);
    }
    return relative(next);
}

export function withoutWizardParams(current: URL): string {
    const next = new URL(current.href);
    for (const key of WIZARD_PARAMS) next.searchParams.delete(key);
    return relative(next);
}
```

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run lib/createEventWizardUrl.test.ts`
Expected: PASS.

- [ ] **Step 5: Let `pushPageEntry` carry extra state (test first)**

Add to `lib/overlayHistory.test.ts` (it already exercises `pushPageEntry` in jsdom; follow its setup):

```ts
    it('pushPageEntry stores extra state on the new entry', () => {
        pushPageEntry('/?step=plan', { depthMarker: 2 });
        expect(window.location.search).toBe('?step=plan');
        expect((window.history.state as Record<string, unknown>).depthMarker).toBe(2);
    });
```

Run: `npx vitest run lib/overlayHistory.test.ts` — Expected: FAIL (`depthMarker` undefined).

Change the signature and both writes at the end of `pushPageEntry` in `lib/overlayHistory.ts`:

```ts
export function pushPageEntry(url: string, extraState: Record<string, unknown> = {}) {
```

```ts
    if (isLeftoverOverlayEntry) window.history.replaceState({ ...pageState, ...extraState }, '', url);
    else window.history.pushState({ ...pageState, ...extraState }, '', url);
```

Run: `npx vitest run lib/overlayHistory.test.ts` — Expected: PASS.

- [ ] **Step 6: Write the failing history tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeWizard, pushWizardEntry, replaceWizardEntry, wizardDepth } from '@/lib/createEventWizardHistory';

afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
});

describe('wizard history', () => {
    it('counts how deep into the wizard each entry is', () => {
        expect(wizardDepth()).toBe(0);
        pushWizardEntry('/?create=1');
        expect(wizardDepth()).toBe(1);
        pushWizardEntry('/?create=1&step=plan');
        expect(wizardDepth()).toBe(2);
    });

    it('keeps the depth when an entry is replaced', () => {
        pushWizardEntry('/?create=1');
        replaceWizardEntry('/?create=1&run=r1');
        expect(window.location.search).toBe('?create=1&run=r1');
        expect(wizardDepth()).toBe(1);
    });

    it('closes by going back past every wizard entry', () => {
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
        pushWizardEntry('/?create=1');
        pushWizardEntry('/?create=1&step=plan');
        closeWizard();
        expect(go).toHaveBeenCalledWith(-2);
    });

    it('closes a page loaded with the wizard open by removing its params', () => {
        window.history.replaceState(null, '', '/el?src=ig&create=1&step=plan');
        const go = vi.spyOn(window.history, 'go');
        closeWizard();
        expect(go).not.toHaveBeenCalled();
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el?src=ig');
    });
});
```

- [ ] **Step 7: Run them to make sure they fail**

Run: `npx vitest run lib/createEventWizardHistory.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 8: Write the history helpers**

```ts
import { withoutWizardParams } from '@/lib/createEventWizardUrl';
import { pushPageEntry, replacePageUrl } from '@/lib/overlayHistory';

// How many wizard entries lie between this one and the page the pop-up opened over. Stored on each
// history entry, so closing can go back past all of them in one step, and a reload keeps it.
const WIZARD_DEPTH_KEY = '__storywallCreateWizardDepth';

export function wizardDepth(): number {
    const state = window.history.state as Record<string, unknown> | null;
    const depth = state?.[WIZARD_DEPTH_KEY];
    return typeof depth === 'number' && depth > 0 ? depth : 0;
}

// Opening the pop-up and each step are their own Back step.
export function pushWizardEntry(url: string): void {
    pushPageEntry(url, { [WIZARD_DEPTH_KEY]: wizardDepth() + 1 });
}

// Same entry, new URL (the run id, a step the wizard skipped); the depth stays.
export function replaceWizardEntry(url: string): void {
    replacePageUrl(url);
}

// Back to the page under the pop-up. A page loaded with ?create=1 already in the URL (a shared link)
// has no wizard entry to go back to, so its params are removed instead.
export function closeWizard(): void {
    const depth = wizardDepth();
    if (depth > 0) {
        window.history.go(-depth);
        return;
    }
    replacePageUrl(withoutWizardParams(new URL(window.location.href)));
}
```

`replacePageUrl` keeps the current state (minus Next's markers), so the depth survives it.

- [ ] **Step 9: Run them to make sure they pass**

Run: `npx vitest run lib/createEventWizardHistory.test.ts lib/createEventWizardUrl.test.ts lib/overlayHistory.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/overlayHistory.ts lib/overlayHistory.test.ts lib/createEventWizardUrl.ts lib/createEventWizardUrl.test.ts lib/createEventWizardHistory.ts lib/createEventWizardHistory.test.ts
git commit -m "KAN-197: wizard URLs and history entries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Saved answers

**Files:**
- Create: `lib/createEventWizardDraft.ts`
- Test: `lib/createEventWizardDraft.test.ts`

What is saved follows spec 4.3, limited to what the form has today. Parts 2 and 3 add `guestChoice` and `accountStepShown` as optional fields (no version change needed for optional fields). Never saved: passwords, the email code, the withdrawal and partner checkboxes.

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    clearCreateEventWizardDraft,
    CREATE_WIZARD_DRAFT_KEY,
    CREATE_WIZARD_DRAFT_MAX_AGE_MS,
    type CreateEventWizardDraft,
    isCreateEventWizardDraftEmpty,
    readCreateEventWizardDraft,
    writeCreateEventWizardDraft,
} from '@/lib/createEventWizardDraft';

const DRAFT: CreateEventWizardDraft = {
    run: 'r1',
    step: 'details',
    eventType: 'BAPTISM',
    planCode: 'BASIC',
    durationPicks: { BASIC: 'opt-12' },
    title: 'Eleni',
    startAt: '2027-05-01T12:00',
    timezone: 'Europe/Athens',
    locationName: 'Agios Nikolaos',
    locationAddress: 'Athens',
    mapsUrl: '',
    themePresetId: null,
    gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } },
    checkoutCode: '',
};

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('createEventWizardDraft', () => {
    it('reads back what it saved', () => {
        writeCreateEventWizardDraft(DRAFT);
        expect(readCreateEventWizardDraft()).toEqual(DRAFT);
    });

    it('forgets answers older than 7 days', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-01T10:00:00Z'));
        writeCreateEventWizardDraft(DRAFT);
        vi.setSystemTime(new Date(Date.parse('2026-11-01T10:00:00Z') + CREATE_WIZARD_DRAFT_MAX_AGE_MS + 1));
        expect(readCreateEventWizardDraft()).toBeNull();
    });

    it('ignores answers saved by another version', () => {
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, JSON.stringify({ ...DRAFT, version: 999, savedAt: Date.now() }));
        expect(readCreateEventWizardDraft()).toBeNull();
    });

    it('ignores broken or tampered values', () => {
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, '{not json');
        expect(readCreateEventWizardDraft()).toBeNull();
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), step: 'hack', title: 5 }));
        expect(readCreateEventWizardDraft()).toMatchObject({ step: 'type', title: '' });
    });

    it('works when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(() => writeCreateEventWizardDraft(DRAFT)).not.toThrow();
        expect(readCreateEventWizardDraft()).toBeNull();
        expect(() => clearCreateEventWizardDraft()).not.toThrow();
    });

    it('clears', () => {
        writeCreateEventWizardDraft(DRAFT);
        clearCreateEventWizardDraft();
        expect(readCreateEventWizardDraft()).toBeNull();
    });

    it('tells a draft with nothing typed from one with answers', () => {
        expect(isCreateEventWizardDraftEmpty({ ...DRAFT, title: '', startAt: '', locationName: '', locationAddress: '' })).toBe(true);
        expect(isCreateEventWizardDraftEmpty(DRAFT)).toBe(false);
    });
});
```

`GiftDetailsInput` in `lib/gift.ts` is `{ recipientLabel, giverDisplayName, recipientEmail }`, all strings.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/createEventWizardDraft.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
import type { EventTypeConvention } from '@/lib/api/types';
import { parseCreateEventStep } from '@/lib/createEventSteps';
import { EMPTY_GIFT_DETAILS, type GiftDetailsInput } from '@/lib/gift';
import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// The wizard's answers, kept so a reload, a sign-in on another page, the email code or closing the
// pop-up by accident doesn't lose them. localStorage, because Google sign-in leaves the tab.
export const CREATE_WIZARD_DRAFT_KEY = 'storywall.createEventWizard';
export const CREATE_WIZARD_DRAFT_VERSION = 1;
export const CREATE_WIZARD_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateEventWizardDraft = {
    run: string | null;
    step: CreateEventStep;
    eventType: EventTypeConvention | null;
    planCode: string;
    durationPicks: Record<string, string>;
    title: string;
    startAt: string;
    timezone: string;
    locationName: string;
    locationAddress: string;
    mapsUrl: string;
    themePresetId: string | null;
    gift: { isGift: boolean; details: GiftDetailsInput };
    checkoutCode: string;
};

type Stored = CreateEventWizardDraft & { version: number; savedAt: number };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const textOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

function parsePicks(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function parseGiftDetails(value: unknown): GiftDetailsInput {
    const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(Object.keys(EMPTY_GIFT_DETAILS).map((key) => [key, text(source[key])])) as GiftDetailsInput;
}

// Only the shape is checked here. The form checks the values against the live config (an event type
// or plan no longer on sale falls back, as a link's would).
function parse(raw: Record<string, unknown>): CreateEventWizardDraft {
    const gift = raw.gift && typeof raw.gift === 'object' ? (raw.gift as Record<string, unknown>) : {};
    return {
        run: textOrNull(raw.run),
        step: parseCreateEventStep(typeof raw.step === 'string' ? raw.step : null),
        eventType: textOrNull(raw.eventType) as EventTypeConvention | null,
        planCode: text(raw.planCode),
        durationPicks: parsePicks(raw.durationPicks),
        title: text(raw.title),
        startAt: text(raw.startAt),
        timezone: text(raw.timezone),
        locationName: text(raw.locationName),
        locationAddress: text(raw.locationAddress),
        mapsUrl: text(raw.mapsUrl),
        themePresetId: textOrNull(raw.themePresetId),
        gift: { isGift: gift.isGift === true, details: parseGiftDetails(gift.details) },
        checkoutCode: text(raw.checkoutCode),
    };
}

export function readCreateEventWizardDraft(): CreateEventWizardDraft | null {
    try {
        const raw = JSON.parse(window.localStorage.getItem(CREATE_WIZARD_DRAFT_KEY) ?? 'null') as Partial<Stored> | null;
        if (!raw || typeof raw !== 'object') return null;
        if (raw.version !== CREATE_WIZARD_DRAFT_VERSION || typeof raw.savedAt !== 'number') return null;
        if (Date.now() - raw.savedAt > CREATE_WIZARD_DRAFT_MAX_AGE_MS) return null;
        return parse(raw as Record<string, unknown>);
    } catch {
        return null;
    }
}

export function writeCreateEventWizardDraft(draft: CreateEventWizardDraft): void {
    try {
        const stored: Stored = { ...draft, version: CREATE_WIZARD_DRAFT_VERSION, savedAt: Date.now() };
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, JSON.stringify(stored));
    } catch {
        // Storage blocked: the wizard still works, and a reload starts over.
    }
}

export function clearCreateEventWizardDraft(): void {
    try {
        window.localStorage.removeItem(CREATE_WIZARD_DRAFT_KEY);
    } catch {
        // Nothing to clear.
    }
}

// Nothing typed yet: closing the pop-up from the type step then forgets the run.
export function isCreateEventWizardDraftEmpty(draft: CreateEventWizardDraft): boolean {
    const giftTyped = Object.values(draft.gift.details).some(Boolean);
    return !draft.title && !draft.startAt && !draft.locationName && !draft.locationAddress && !draft.mapsUrl && !draft.checkoutCode && !giftTyped;
}
```

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run lib/createEventWizardDraft.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/createEventWizardDraft.ts lib/createEventWizardDraft.test.ts
git commit -m "KAN-197: save the wizard's answers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Step navigation for router or history

**Files:**
- Create: `hooks/useCreateEventStepNavigation.ts`
- Test: `hooks/useCreateEventStepNavigation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventStepNavigation } from '@/hooks/useCreateEventStepNavigation';
import { wizardDepth } from '@/lib/createEventWizardHistory';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
});

describe('useCreateEventStepNavigation', () => {
    it('keeps the old flow on the router and /events/new', () => {
        const { result } = renderHook(() => useCreateEventStepNavigation('legacy', 'r1'));
        result.current.push('plan');
        result.current.replace('details');
        expect(router.push).toHaveBeenCalledWith('/events/new?step=plan&run=r1', { scroll: false });
        expect(router.replace).toHaveBeenCalledWith('/events/new?step=details&run=r1');
    });

    it('moves the wizard on the current URL without the router', () => {
        window.history.replaceState(null, '', '/el?create=1&type=baptism');
        const { result } = renderHook(() => useCreateEventStepNavigation('wizard', 'r1'));
        result.current.push('plan');
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el?create=1&type=baptism&step=plan&run=r1');
        expect(wizardDepth()).toBe(1);
        result.current.replace('details');
        expect(window.location.search).toBe('?create=1&type=baptism&step=details&run=r1');
        expect(wizardDepth()).toBe(1);
        expect(router.push).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useCreateEventStepNavigation.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { pushWizardEntry, replaceWizardEntry } from '@/lib/createEventWizardHistory';
import { withWizardParams } from '@/lib/createEventWizardUrl';
import { routes } from '@/lib/routes';
import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// 'legacy': today's /events/new, one server render per step. 'wizard': the pop-up or the new page,
// where a step is a search param changed on the client (repo rule for UI state in the URL).
export type CreateEventFlowMode = 'legacy' | 'wizard';

export function useCreateEventStepNavigation(mode: CreateEventFlowMode, run: string | null) {
    const router = useRouter();

    return useMemo(() => {
        if (mode === 'legacy') {
            return {
                push: (step: CreateEventStep) => router.push(routes.events.new({ step, run }), { scroll: false }),
                replace: (step: CreateEventStep) => router.replace(routes.events.new({ step, run })),
            };
        }
        const urlFor = (step: CreateEventStep) => withWizardParams(new URL(window.location.href), { step, run });
        return {
            push: (step: CreateEventStep) => pushWizardEntry(urlFor(step)),
            replace: (step: CreateEventStep) => replaceWizardEntry(urlFor(step)),
        };
    }, [mode, router, run]);
}
```

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run hooks/useCreateEventStepNavigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useCreateEventStepNavigation.ts hooks/useCreateEventStepNavigation.test.ts
git commit -m "KAN-197: step navigation for the wizard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The form controller in wizard mode

**Files:**
- Create: `hooks/useCreateEventWizardDraft.ts`
- Modify: `hooks/useCreateEventGift.ts`, `hooks/usePlanTiersForEventType.ts`, `hooks/useCreateEventFormController.ts`, `providers/CreateEventFormProvider.tsx`
- Test: `hooks/useCreateEventFormController.wizard.test.tsx`

- [ ] **Step 1: Write the saved-answers hook**

```ts
'use client';

import { useCallback, useRef, useState } from 'react';

import {
    clearCreateEventWizardDraft,
    type CreateEventWizardDraft,
    readCreateEventWizardDraft,
    writeCreateEventWizardDraft,
} from '@/lib/createEventWizardDraft';
import { eventTypeSlug } from '@/lib/eventTypeSlug';

/**
 * The wizard's saved answers: read once when the form mounts, written as the host types, cleared
 * when checkout opens. A link to another event type starts fresh: those answers belong to a
 * different event, as when the host changes the type by hand.
 */
export function useCreateEventWizardDraft(enabled: boolean, linkTypeSlug: string | null) {
    const [initial] = useState(() => {
        if (!enabled) return null;
        const draft = readCreateEventWizardDraft();
        if (!draft) return null;
        if (linkTypeSlug && draft.eventType && eventTypeSlug(draft.eventType) !== linkTypeSlug) return null;
        return draft;
    });
    const cleared = useRef(false);

    const save = useCallback(
        (draft: CreateEventWizardDraft) => {
            if (enabled && !cleared.current) writeCreateEventWizardDraft(draft);
        },
        [enabled],
    );

    // After this, nothing is saved again by this form (checkout is opening).
    const clear = useCallback(() => {
        cleared.current = true;
        clearCreateEventWizardDraft();
    }, []);

    return { initial, save, clear };
}
```

- [ ] **Step 2: Let the gift start from saved values**

In `hooks/useCreateEventGift.ts`, change the signature and the two state lines, and expose `isGift`:

```ts
export function useCreateEventGift(
    selectedPlan: PlanTierResponseDto | undefined,
    initial: { isGift: boolean; details: GiftDetailsInput } | null = null,
) {
    const details = useGiftDetailsInput(initial?.details);
    const saveGift = useSaveGift(null);
    const [isGift, setIsGift] = useState(initial?.isGift ?? false);
```

Add `isGift,` to the returned object (next to `enabled`). Add `GiftDetailsInput` to the file's existing `@/lib/gift` import as a type import: `import { type GiftDetailsInput, isPlanGiftable, sameGiftRequest } from '@/lib/gift';` (keep whatever else that line already imports).

Run: `npx vitest run hooks/useCreateEventGift.test.tsx` — Expected: PASS (existing callers pass one argument).

- [ ] **Step 3: Let the plan list load signed out**

In `hooks/usePlanTiersForEventType.ts`:

```ts
// GET /api/plan-tiers?eventType=X — the EVENT-scope, assignable, public plans (paidModules
// included) available for that type. Public since KAN-197, so the create wizard can show plans
// before sign-up; other callers still wait for a session (allowSignedOut false).
export function usePlanTiersForEventType(eventType: EventTypeConvention | undefined, enabled = true, allowSignedOut = false) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: planTiersByEventTypeKeys.all(eventType ?? ''),
        queryFn: () => api.get<PlanTierResponseDto[]>(endpoints.planTiers.byEventType(eventType!)),
        enabled: Boolean(eventType) && enabled && (isAuthenticated || allowSignedOut),
        select: (plans) => [...plans].sort((left, right) => left.sortOrder - right.sortOrder),
        staleTime: 60 * 1000,
    });
}
```

Replace the whole old comment block above the function with the one shown.

- [ ] **Step 4: Write the failing controller test**

This test covers only what wizard mode adds. It mocks the data hooks so the controller runs on its own.

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import { readCreateEventWizardDraft, writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const auth = vi.hoisted(() => ({ current: { isAuthenticated: false, user: null as null | { emailVerified: boolean } } }));
const plansEnabled = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => params.current }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }), useLocale: () => 'en' }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({}) }));
vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({
        data: { eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }, { eventTypeKey: 'BAPTISM', isEnabled: true }], modules: [], media: null, coverage: {} },
        refetch: vi.fn(),
    }),
}));
vi.mock('@/hooks/usePlanTiersForEventType', () => ({
    usePlanTiersForEventType: (...args: unknown[]) => {
        plansEnabled.calls.push(args);
        return { data: [], isLoading: false, refetch: vi.fn() };
    },
}));
vi.mock('@/hooks/useEventTheme', () => ({ useThemePresetsForType: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useEvent', () => ({
    useCreateEvent: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
    useUpdateEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useBilling', () => ({ usePreviewCreateEventCode: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useGift', () => ({ useSaveGift: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useWithdrawalConsent', () => ({
    useWithdrawalConsent: () => ({ consentSatisfied: false, handleCheckoutError: () => false }),
}));
vi.mock('@/hooks/usePartnerBrandingConsent', () => ({ usePartnerBrandingConsent: () => ({ satisfied: true, requestFields: {} }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));

beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/?create=1&run=r1');
    params.current = new URLSearchParams('create=1&run=r1');
    plansEnabled.calls = [];
});

afterEach(() => vi.clearAllMocks());

describe('useCreateEventFormController in wizard mode', () => {
    it('starts from the saved answers', () => {
        writeCreateEventWizardDraft({
            run: 'r1', step: 'details', eventType: 'BAPTISM', planCode: 'BASIC', durationPicks: {}, title: 'Eleni', startAt: '',
            timezone: 'Europe/Athens', locationName: 'Church', locationAddress: '', mapsUrl: '', themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } }, checkoutCode: '',
        });
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.title).toBe('Eleni');
        expect(result.current.locationName).toBe('Church');
        expect(result.current.selectedEventType).toBe('BAPTISM');
    });

    it("lets a link's type win, dropping answers for another type", () => {
        writeCreateEventWizardDraft({
            run: 'r1', step: 'details', eventType: 'BAPTISM', planCode: 'BASIC', durationPicks: {}, title: 'Eleni', startAt: '',
            timezone: 'Europe/Athens', locationName: '', locationAddress: '', mapsUrl: '', themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } }, checkoutCode: '',
        });
        params.current = new URLSearchParams('create=1&run=r1&type=wedding');
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.selectedEventType).toBe('WEDDING');
        expect(result.current.title).toBe('');
    });

    it('saves what the host types', () => {
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        act(() => result.current.onTitleChange({ target: { value: 'Our wedding' } } as React.ChangeEvent<HTMLInputElement>));
        expect(readCreateEventWizardDraft()?.title).toBe('Our wedding');
    });

    it('asks for plans while signed out', () => {
        renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(plansEnabled.calls.at(-1)).toEqual(['WEDDING', true, true]);
    });

    it('moves between steps without the router', () => {
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        act(() => result.current.goToPlan());
        expect(router.push).not.toHaveBeenCalled();
        expect(window.location.search).toContain('step=plan');
    });

    it('saves nothing in the old flow', () => {
        const { result } = renderHook(() => useCreateEventFormController());
        act(() => result.current.onTitleChange({ target: { value: 'Our wedding' } } as React.ChangeEvent<HTMLInputElement>));
        expect(readCreateEventWizardDraft()).toBeNull();
        expect(plansEnabled.calls.at(-1)).toEqual(['WEDDING', false, false]);
    });
});
```

Add `import type React from 'react';` at the top if the `React.ChangeEvent` type isn't otherwise in scope.

- [ ] **Step 5: Run it to make sure it fails**

Run: `npx vitest run hooks/useCreateEventFormController.wizard.test.tsx`
Expected: FAIL (the controller takes no options; nothing is saved).

- [ ] **Step 6: Change the controller**

In `hooks/useCreateEventFormController.ts`:

1. Imports: add

```ts
import { type CreateEventFlowMode, useCreateEventStepNavigation } from '@/hooks/useCreateEventStepNavigation';
import { useCreateEventWizardDraft } from '@/hooks/useCreateEventWizardDraft';
```

and remove `routes` from the imports if nothing else uses it after step 5 below.

2. Signature and the first lines (replace from the function line to the `durationPicks` line):

```ts
export function useCreateEventFormController({ mode = 'legacy' }: { mode?: CreateEventFlowMode } = {}): CreateEventFormValue {
    const isWizard = mode === 'wizard';
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    useMe();
    // Fail closed: submission stays blocked until we positively know the
    // account is verified. `user.emailVerified` is `null` until /api/me
    // resolves, so an in-flight or failed fetch must not read as "verified".
    const isEmailVerified = user?.emailVerified === true;
    const createEvent = useCreateEvent();
    const [requestedTypeSlug] = useState(() => normalizeEventTypeSlug(searchParams.get(CREATE_EVENT_TYPE_PARAM)));
    // The wizard picks up where the host left off; a link's own type, plan, duration or code wins.
    const draft = useCreateEventWizardDraft(isWizard, requestedTypeSlug);
    const saved = draft.initial;
    // A link may pick the plan and its duration (?plan=, ?option=); a code or id not on sale falls back.
    const [linkedPlanCode] = useState(() => searchParams.get(CREATE_EVENT_PLAN_PARAM) ?? saved?.planCode ?? '');
    const [linkedOptionId] = useState(() => searchParams.get(CREATE_EVENT_OPTION_PARAM));
    const durationPicks = useDurationPicks(
        linkedPlanCode && linkedOptionId ? { [linkedPlanCode]: linkedOptionId } : (saved?.durationPicks ?? {}),
    );
```

(The `useRouter` import and `const router` go away: navigation moves to step 5.)

3. The state initialisers that follow, from the saved answers:

```ts
    const [title, setTitle] = useState(() => saved?.title ?? '');
    // The type picked here; until then, the one the link asked for (see resolveCreateEventType).
    const [eventType, setEventType] = useState<EventTypeConvention | null>(() => (requestedTypeSlug ? null : (saved?.eventType ?? null)));
    const [startAt, setStartAt] = useState(() => saved?.startAt ?? '');
    const [timezone, setTimezone] = useState(() => saved?.timezone || getCurrentTimezone());
    const [locationName, setLocationName] = useState(() => saved?.locationName ?? '');
    const [locationAddress, setLocationAddress] = useState(() => saved?.locationAddress ?? '');
    const [mapsUrl, setMapsUrl] = useState(() => saved?.mapsUrl ?? '');
    const [error, setError] = useState<string | null>(null);
    const [selectedPlanCode, setSelectedPlanCode] = useState(linkedPlanCode);
    const [themePresetId, setThemePresetId] = useState<string | null>(() => saved?.themePresetId ?? null);
```

The old `const [requestedTypeSlug] = ...` line further down is now above: delete the duplicate. The `checkoutCode` state becomes:

```ts
    const [checkoutCode, setCheckoutCode] = useState(() => searchParams.get(CREATE_EVENT_CODE_PARAM)?.trim() ?? saved?.checkoutCode ?? '');
```

4. Step, plans and gift:

```ts
    const step = resolveCreateEventStep(
        searchParams.get('step') ?? (isWizard ? (saved?.step ?? null) : null),
        eventTypes.map((type) => type.eventTypeKey),
        requestedTypeSlug,
    );
```

```ts
    // Not before the config: the type isn't known until then, and WEDDING's plans would be fetched for nothing.
    // The wizard shows plans before sign-up; the old flow only ever runs signed in.
    const planTiersQuery = usePlanTiersForEventType(selectedEventType, (isAuthenticated || isWizard) && Boolean(appConfig), isWizard);
```

```ts
    const gift = useCreateEventGift(selectedPlan, saved?.gift ?? null);
```

5. Navigation (replace `goToStep` and the two `router.replace` calls in the reachability effect):

```ts
    const navigation = useCreateEventStepNavigation(mode, run);
    const goToStep = useCallback((nextStep: CreateEventStep) => navigation.push(nextStep), [navigation]);
```

```ts
    useEffect(() => {
        // Until the config and the type's plans load, no step past the type (or plan) one looks
        // reachable: a link straight to a later step (a landing plan card opens on details) must not
        // be sent back meanwhile.
        if (!appConfig || planTiersQuery.isLoading) return;
        if (CREATE_EVENT_STEPS.indexOf(step) > CREATE_EVENT_STEPS.indexOf(reachableStep)) {
            navigation.replace(reachableStep);
        } else if (step === 'theme' && !themeStepAvailable) {
            // Nothing to pick for this plan or type, or the list failed: skip ahead.
            navigation.replace('overview');
        }
    }, [appConfig, navigation, planTiersQuery.isLoading, reachableStep, step, themeStepAvailable]);
```

`goToStep` must be declared after `run` (it already is: `run` is read right after `useResetOnBfcacheRestore`).

6. Save as the host types (after `onSelectThemePreset`):

```ts
    const { save: saveDraft, clear: clearDraft } = draft;
    useEffect(() => {
        if (!isWizard) return;
        saveDraft({
            run,
            step,
            eventType: eventType ?? (requestedTypeSlug ? selectedEventType : null),
            planCode: selectedPlanCode,
            durationPicks: durationPicks.picks,
            title,
            startAt,
            timezone,
            locationName,
            locationAddress,
            mapsUrl,
            themePresetId,
            gift: { isGift: gift.isGift, details: gift.details.value },
            checkoutCode,
        });
    }, [
        checkoutCode, durationPicks.picks, eventType, gift.details.value, gift.isGift, isWizard, locationAddress, locationName,
        mapsUrl, requestedTypeSlug, run, saveDraft, selectedEventType, selectedPlanCode, startAt, step, themePresetId, timezone, title,
    ]);
```

Format the dependency list one per line if Prettier asks.

7. Clear when checkout opens. In `handleSubmit`, right after `if (run) rememberCreateEventCheckout(run, eventId);`:

```ts
                // The run is done: the next wizard starts fresh, and Back from checkout opens the draft.
                if (isWizard) clearDraft();
```

and add `clearDraft` and `isWizard` to `handleSubmit`'s dependency list.

- [ ] **Step 7: Pass the mode through the provider**

`providers/CreateEventFormProvider.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import type { CreateEventFlowMode } from '@/hooks/useCreateEventStepNavigation';
import { CreateEventFormContext } from '@/providers/createEvent/CreateEventFormContext';

export function CreateEventFormProvider({ children, mode = 'legacy' }: { children: ReactNode; mode?: CreateEventFlowMode }) {
    const value = useCreateEventFormController({ mode });

    return <CreateEventFormContext.Provider value={value}>{children}</CreateEventFormContext.Provider>;
}

export { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run hooks/useCreateEventFormController.wizard.test.tsx hooks/useCreateEventFormController.attribution.test.tsx hooks/useCreateEventGift.test.tsx "app/(main)/events/new"`
Expected: PASS. The attribution test and `CreateEventBoundary.test.tsx` cover the old flow; if one mocked `useRouter` only for step pushes, it still passes because legacy mode uses the router as before.

- [ ] **Step 9: Type check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add hooks/useCreateEventWizardDraft.ts hooks/useCreateEventGift.ts hooks/usePlanTiersForEventType.ts hooks/useCreateEventFormController.ts hooks/useCreateEventFormController.wizard.test.tsx providers/CreateEventFormProvider.tsx
git commit -m "KAN-197: wizard mode for the create form" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The run on the current URL

**Files:**
- Modify: `hooks/useCreateEventRun.ts`
- Test: `hooks/useCreateEventRun.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

The file already mocks `next/navigation` with `useSearchParams: () => new URLSearchParams(nav.search)` and turns on fake timers in `beforeEach`. Add `import { writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';`, add `window.localStorage.clear();` to its `afterEach`, and add these cases inside the `describe`:

```ts
    it('in the wizard, adds the run to the current URL and keeps the page', () => {
        nav.search = 'create=1&type=baptism';
        window.history.replaceState(null, '', `/el?${nav.search}`);

        renderHook(() => useCreateEventRun('wizard'));
        act(() => vi.runAllTimers());

        const params = new URLSearchParams(window.location.search);
        expect(window.location.pathname).toBe('/el');
        expect(params.get('create')).toBe('1');
        expect(params.get('type')).toBe('baptism');
        expect(params.get('run')).toMatch(/\w+/);
    });

    it('in the wizard, resumes the saved run', () => {
        writeCreateEventWizardDraft({
            run: 'saved1', step: 'details', eventType: 'WEDDING', planCode: '', durationPicks: {}, title: 'Our wedding', startAt: '',
            timezone: '', locationName: '', locationAddress: '', mapsUrl: '', themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } }, checkoutCode: '',
        });
        nav.search = 'create=1';
        window.history.replaceState(null, '', '/?create=1');

        renderHook(() => useCreateEventRun('wizard'));
        act(() => vi.runAllTimers());

        expect(new URLSearchParams(window.location.search).get('run')).toBe('saved1');
    });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run hooks/useCreateEventRun.test.ts`
Expected: the two new tests FAIL (the hook takes no mode and writes `/events/new`).

- [ ] **Step 3: Add the mode**

In `hooks/useCreateEventRun.ts`, add imports:

```ts
import type { CreateEventFlowMode } from '@/hooks/useCreateEventStepNavigation';
import { readCreateEventWizardDraft } from '@/lib/createEventWizardDraft';
import { replaceWizardEntry } from '@/lib/createEventWizardHistory';
import { withWizardParams } from '@/lib/createEventWizardUrl';
```

Change the signature to `export function useCreateEventRun(mode: CreateEventFlowMode = 'legacy'): { isReady: boolean } {` and the `if (!run)` branch to:

```ts
        if (!run) {
            // Deferred a task: on a full page load this effect runs before the Next router's own
            // (a parent's) has wrapped history.replaceState, and an unwrapped write never reaches
            // useSearchParams, which would leave the run, and the form, waiting forever.
            const write = window.setTimeout(() => {
                if (mode === 'wizard') {
                    // The wizard lives on whatever page it opened over; a saved run carries on.
                    const nextRun = readCreateEventWizardDraft()?.run ?? newCreateEventRunId();
                    replaceWizardEntry(withWizardParams(new URL(window.location.href), { run: nextRun }));
                    return;
                }
                replacePageUrl(routes.events.new({ step, run: newCreateEventRunId(), type, plan, option, code }));
            });
            return () => window.clearTimeout(write);
        }
```

Add `mode` to the effect's dependency list.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run hooks/useCreateEventRun.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useCreateEventRun.ts hooks/useCreateEventRun.test.ts
git commit -m "KAN-197: keep the wizard's run on the page it opened over" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Sign-out forgets the answers

**Files:**
- Modify: `providers/AuthProvider.tsx`

- [ ] **Step 1: Clear on sign-out**

In `logout` in `providers/AuthProvider.tsx`, after `resetSessionCaches();`:

```ts
        // The next person on this device must not find this account's half-made event.
        clearCreateEventWizardDraft();
```

Import `clearCreateEventWizardDraft` from `@/lib/createEventWizardDraft`.

- [ ] **Step 2: Test it**

Add to the `describe('AuthProvider')` block in `providers/AuthProvider.test.tsx`, next to "drops the router's cached pages on logout" (it uses the file's `renderAuth()` helper):

```ts
    it("forgets the create wizard's answers on logout", async () => {
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, '{"version":1}');
        const { result } = await renderAuth();

        await act(() => result.current.logout());

        expect(window.localStorage.getItem(CREATE_WIZARD_DRAFT_KEY)).toBeNull();
    });
```

and `import { CREATE_WIZARD_DRAFT_KEY } from '@/lib/createEventWizardDraft';` at the top.

Run: `npx vitest run providers/AuthProvider.test.tsx` — Expected: PASS (it fails if Step 1 is skipped).

- [ ] **Step 3: Commit**

```bash
git add providers/AuthProvider.tsx providers/AuthProvider.test.tsx
git commit -m "KAN-197: sign-out forgets the wizard's answers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Visitors can open /events/new

**Files:**
- Modify: `proxy.ts`
- Test: `proxy.test.ts`

With the flag on, `/events/new` no longer sends visitors to sign in. A signed-in visitor still gets their token passed on, so the page's server prefetch works. Every other `/events/...` route stays protected.

- [ ] **Step 1: Write the failing tests**

At the top of `proxy.test.ts`, mock the flag so each test can pick it:

```ts
const createWizard = vi.hoisted(() => ({ on: false }));
vi.mock('@/lib/unreleasedPages', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/unreleasedPages')>()),
    showsCreateWizard: () => createWizard.on,
}));
```

Add `createWizard.on = false;` to the existing top-level `beforeEach` (next to `refresh.mockReset();`), so the two existing `/events/new` redirect tests keep testing the old flow. Then add, inside `describe('proxy')` (the file's `request(cookies, url)` helper takes `{ accessToken, refreshToken }`):

```ts
    describe('with the create wizard on', () => {
        beforeEach(() => {
            createWizard.on = true;
        });

        it('lets a signed-out visitor open /events/new', async () => {
            const res = await proxy(request({}, 'http://localhost/events/new?step=plan'));
            expect(res.headers.get('location')).toBeNull();
            expect(res.status).toBe(200);
        });

        it('still passes a signed-in visitor their token', async () => {
            const res = await proxy(request({ accessToken: 'jwt' }, 'http://localhost/events/new'));
            expect(res.headers.get('x-middleware-request-x-storywall-access-token')).toBe('jwt');
        });

        it('keeps every other events page behind sign-in', async () => {
            const res = await proxy(request({}, 'http://localhost/events/abc/manage'));
            expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
        });
    });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run proxy.test.ts`
Expected: the signed-out `/events/new` test FAILS (redirects to login).

- [ ] **Step 3: Make the change**

In `proxy.ts`, import `showsCreateWizard` from `@/lib/unreleasedPages` and add, below `isProtectedPath`:

```ts
// The create wizard starts without an account (KAN-197): its page opens for everyone, and a session,
// if there is one, is still passed on for the page's prefetch.
function isOpenToVisitors(pathname: string): boolean {
    return pathname === routes.events.new() && showsCreateWizard();
}
```

and in `isProtectedPath`, before the final `return`:

```ts
    if (isOpenToVisitors(pathname)) return false;
```

Then replace `if (!isProtectedPath(pathname)) return NextResponse.next();` and the signed-out block with:

```ts
    const openToVisitors = isOpenToVisitors(pathname);
    if (!openToVisitors && !isProtectedPath(pathname)) return NextResponse.next();

    const session = await resolveSession(request);

    if (session.kind === 'signed-out') {
        if (openToVisitors) {
            const response = NextResponse.next();
            // A refresh token Spring refused is dead: drop it, as the login redirect below does.
            response.cookies.delete(AUTH_COOKIES.accessToken);
            response.cookies.delete(AUTH_COOKIES.refreshToken);
            return response;
        }
        const loginUrl = new URL(routes.login, request.url);
```

(the rest of the signed-out block and everything after it stays as it is).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run proxy.test.ts`
Expected: PASS, old and new.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts proxy.test.ts
git commit -m "KAN-197: open /events/new to visitors behind the wizard flag" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The shared wizard body

**Files:**
- Create: `lib/createEventWizardProgress.ts` (+ test), `components/event/create/wizard/CreateEventWizardProgress.tsx`, `components/event/create/wizard/CreateEventWizard.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the two approved strings**

In both catalogs, inside `CreateEventPage`, add a `wizard` object. English:

```json
        "wizard": {
            "stepCounter": "Step {current} of {total}",
            "close": "Close"
        },
```

Greek:

```json
        "wizard": {
            "stepCounter": "Βήμα {current} από {total}",
            "close": "Κλείσιμο"
        },
```

`stepCounter` is wording row 2; `close` reuses the app's close wording (approved 2026-11-10). Run `npx vitest run i18n` to confirm the catalog parity tests still pass.

- [ ] **Step 2: Write the failing progress test**

```ts
import { describe, expect, it } from 'vitest';

import { wizardProgress } from '@/lib/createEventWizardProgress';

describe('wizardProgress', () => {
    it('counts only the steps that apply', () => {
        expect(wizardProgress('plan', ['type', 'plan', 'details', 'overview'])).toEqual({ current: 2, total: 4, percent: 50 });
    });

    it('starts the bar part-filled on the first step', () => {
        expect(wizardProgress('type', ['type', 'plan', 'details', 'theme', 'overview'])).toEqual({ current: 1, total: 5, percent: 20 });
    });

    it('treats an unknown step as the first', () => {
        expect(wizardProgress('theme', ['type', 'plan'])).toEqual({ current: 1, total: 2, percent: 50 });
    });
});
```

Run: `npx vitest run lib/createEventWizardProgress.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Write it**

```ts
import type { CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

// "2/5" and the bar's fill. The total counts only the steps this run will show.
export function wizardProgress(step: CreateEventStep, steps: readonly CreateEventStep[]) {
    const total = Math.max(steps.length, 1);
    const current = Math.max(steps.indexOf(step), 0) + 1;
    return { current, total, percent: Math.round((current / total) * 100) };
}
```

Run the test again — Expected: PASS.

- [ ] **Step 4: Write the progress bar and counter**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { wizardProgress } from '@/lib/createEventWizardProgress';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The wizard's top row: the shell's own button (close or back), a brand-gradient bar and "n/N".
// The bar is decoration; screen readers get "Step n of N".
export function CreateEventWizardProgress({ leading }: { leading: ReactNode }) {
    const t = useTranslations('CreateEventPage.wizard');
    const { step, steps } = useCreateEventForm();
    const { current, total, percent } = wizardProgress(step, steps);

    return (
        <div className="flex items-center gap-3">
            {leading}
            {/* Bar */}
            <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3e7dc]">
                <div
                    className="h-full rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                />
            </div>
            {/* Counter */}
            <span className="min-w-8 text-right text-[13px] font-bold text-ink">
                <span aria-hidden="true">
                    {current}/{total}
                </span>
                <span className="sr-only">{t('stepCounter', { current, total })}</span>
            </span>
        </div>
    );
}
```

- [ ] **Step 5: Write the body**

The body is today's form body (`CreateEventFormBody` in `CreateEventBoundary.tsx`) on a white surface, with the progress row instead of the title and breadcrumb, and the step heading as the one `h1`. The steps keep their current look until parts 2 and 3.

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useRef } from 'react';

import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { EventCreateSelectionSummary } from '@/components/event/create/EventCreateSelectionSummary';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventThemeStep } from '@/components/event/create/EventThemeStep';
import { EventTypeStep } from '@/components/event/create/EventTypeStep';
import { CreateEventWizardProgress } from '@/components/event/create/wizard/CreateEventWizardProgress';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { useScrollTopOnChange } from '@/hooks/useScrollTopOnChange';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The step heading's id; the pop-up takes its accessible name from it.
export const CREATE_EVENT_WIZARD_HEADING_ID = 'create-event-wizard-heading';

// One wizard, two shells: the pop-up (CreateEventDialog) and the page (CreateEventWizardPage).
// `leading` is the shell's own button: close in the pop-up, back on the page.
export function CreateEventWizard({ leading }: { leading: ReactNode }) {
    const t = useTranslations('CreateEventPage');
    const { step, formId, handleSubmit, eventPlans, modules, media, selectedCode, durationPicks, onSelectPlan, onSelectPlanDuration, isPlansLoading } =
        useCreateEventForm();
    const scrollRef = useRef<HTMLDivElement>(null);
    useScrollTopOnChange(scrollRef, step);

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            {/* Progress */}
            <div className="shrink-0 px-5 pt-4 pb-3">
                <CreateEventWizardProgress leading={leading} />
            </div>

            {/* Step */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
                <form id={formId} onSubmit={handleSubmit}>
                    {/* Earlier picks */}
                    <EventCreateSelectionSummary />

                    {/* Heading */}
                    <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="mb-5 text-lg font-bold text-ink">
                        {step === 'type' && t('steps.typeSubtitle')}
                        {step === 'plan' && t('steps.planSubtitle')}
                        {step === 'details' && t('subtitle')}
                        {step === 'theme' && t('steps.themeSubtitle')}
                        {step === 'overview' && t('steps.overviewSubtitle')}
                    </h1>

                    {step === 'type' && <EventTypeStep />}
                    {step === 'plan' && (
                        <EventPlanSelector
                            plans={eventPlans}
                            modules={modules}
                            media={media}
                            selectedCode={selectedCode}
                            durationPicks={durationPicks}
                            onSelectAction={onSelectPlan}
                            onSelectDurationAction={onSelectPlanDuration}
                            isLoading={isPlansLoading}
                        />
                    )}
                    {step === 'details' && <EventDetailsStep />}
                    {step === 'theme' && <EventThemeStep />}
                    {step === 'overview' && <EventOverviewStep />}
                </form>
            </div>

            {/* Footer */}
            <EventCreateFooter />
        </div>
    );
}
```

- [ ] **Step 6: Type check and commit**

Run: `npx tsc --noEmit && npx vitest run lib/createEventWizardProgress.test.ts`
Expected: clean, PASS.

```bash
git add lib/createEventWizardProgress.ts lib/createEventWizardProgress.test.ts components/event/create/wizard/CreateEventWizardProgress.tsx components/event/create/wizard/CreateEventWizard.tsx messages/en.json messages/el.json
git commit -m "KAN-197: shared wizard body with progress and counter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The page shell

**Files:**
- Create: `hooks/useCreateEventWizardAccess.ts` (+ test), `components/event/create/wizard/CreateEventWizardPage.tsx`
- Modify: `app/(main)/events/new/page.tsx`

- [ ] **Step 1: Write the failing access test**

```ts
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventWizardAccess } from '@/hooks/useCreateEventWizardAccess';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const auth = vi.hoisted(() => ({ current: { isBootstrapping: false, user: null as null | { role: string } } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));

afterEach(() => vi.clearAllMocks());

describe('useCreateEventWizardAccess', () => {
    it('lets a signed-out visitor in', () => {
        auth.current = { isBootstrapping: false, user: null };
        expect(renderHook(() => useCreateEventWizardAccess()).result.current.isBlocked).toBe(false);
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('waits while the session is being read', () => {
        auth.current = { isBootstrapping: true, user: null };
        expect(renderHook(() => useCreateEventWizardAccess()).result.current.isBlocked).toBe(true);
    });

    it('sends an admin to the console', () => {
        auth.current = { isBootstrapping: false, user: { role: 'ADMIN' } };
        expect(renderHook(() => useCreateEventWizardAccess()).result.current.isBlocked).toBe(true);
        expect(router.replace).toHaveBeenCalledWith('/admin');
    });
});
```

Run: `npx vitest run hooks/useCreateEventWizardAccess.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 2: Write the hook**

```ts
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

// Who may use the wizard page: everyone but admins, who go to their console as before. Signed-out
// visitors and unverified accounts are let in; the account step deals with them before payment.
export function useCreateEventWizardAccess(): { isBlocked: boolean } {
    const router = useRouter();
    const { user, isBootstrapping } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (!isBootstrapping && isAdmin) router.replace(routes.admin);
    }, [isAdmin, isBootstrapping, router]);

    return { isBlocked: isBootstrapping || isAdmin };
}
```

Run the test — Expected: PASS.

- [ ] **Step 3: Write the page shell**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CreateEventRouteState } from '@/components/event/create/CreateEventRouteState';
import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { BackButton } from '@/components/ui/BackButton';
import { useCreateEventRun } from '@/hooks/useCreateEventRun';
import { useCreateEventWizardAccess } from '@/hooks/useCreateEventWizardAccess';
import { routes } from '@/lib/routes';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

// /events/new with the wizard on: the same body as the pop-up, full page. Old links, bookmarks and
// the return from checkout land here.
export function CreateEventWizardPage() {
    const t = useTranslations('CreateEventPage');
    const access = useCreateEventWizardAccess();
    const run = useCreateEventRun('wizard');

    return (
        <CreateEventRouteState
            isBlocked={access.isBlocked || !run.isReady}
            content={
                <main className="h-full bg-white">
                    <div className="mx-auto flex h-full max-w-2xl flex-col">
                        <CreateEventFormProvider mode="wizard">
                            <CreateEventWizard leading={<BackButton variant="icon" href={routes.home} label={t('goBack')} />} />
                        </CreateEventFormProvider>
                    </div>
                </main>
            }
        />
    );
}
```

- [ ] **Step 4: Pick the shell by flag, prefetch plans without a token, keep it out of search**

Replace `app/(main)/events/new/page.tsx` with:

```tsx
import { dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { CreateEventWizardPage } from '@/components/event/create/wizard/CreateEventWizardPage';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { planTiersByEventTypeKeys } from '@/hooks/usePlanTiersForEventType';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverPublicConfigGet, serverPublicGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { CREATE_EVENT_TYPE_PARAM, resolveCreateEventType } from '@/lib/createEventSteps';
import { normalizeEventTypeSlug } from '@/lib/eventTypeSlug';
import { makeQueryClient } from '@/lib/queryClient';
import { NO_INDEX } from '@/lib/seo';
import { showsCreateWizard } from '@/lib/unreleasedPages';
import { PageHydrationBoundary } from '@/providers/PageHydrationBoundary';

import CreateEventPage from './PageClient';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// A utility page: visitors can reach it once the wizard is on, so it says noindex itself.
export const metadata: Metadata = { robots: NO_INDEX };

// Prefetches the config and the opening event type's plans, so a link straight to a later step (a
// landing plan card opens on details) shows its form without waiting on either. With the wizard on
// the plan list is public, so it is fetched for visitors too.
export default async function Page({ searchParams }: PageProps) {
    const wizard = showsCreateWizard();
    const queryClient = makeQueryClient();
    const accessToken = await prefetchAccessToken();

    try {
        const config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);

        if (accessToken || wizard) {
            const typeParam = (await searchParams)[CREATE_EVENT_TYPE_PARAM];
            const enabledTypes = config.eventTypes.filter((type) => type.isEnabled).map((type) => type.eventTypeKey);
            const eventType = resolveCreateEventType(enabledTypes, null, normalizeEventTypeSlug(typeof typeParam === 'string' ? typeParam : null));
            const path = endpoints.planTiers.byEventType(eventType);
            const plans = accessToken
                ? await serverGet<PlanTierResponseDto[]>(path, accessToken)
                : await serverPublicGet<PlanTierResponseDto[]>(path);
            queryClient.setQueryData(planTiersByEventTypeKeys.all(eventType), plans);
        }
    } catch {
        // Best-effort — the client hooks fetch normally if this fails.
    }

    return <PageHydrationBoundary state={dehydrate(queryClient)}>{wizard ? <CreateEventWizardPage /> : <CreateEventPage />}</PageHydrationBoundary>;
}
```

`NO_INDEX` (`lib/seo.ts`) is `{ index: false, follow: true }`. `serverPublicGet` sends no `Authorization` header and is not cached, like `serverGet`.

- [ ] **Step 5: Leave the old boundary alone**

`CreateEventBoundary.tsx` is the flag-off flow and stays exactly as it is. The spec's "drop the sign-in and unverified redirects with the flag on" is met by the page rendering `CreateEventWizardPage` instead. No change to `lib/pendingCreateEvent.ts` (cleanup PR after launch).

- [ ] **Step 6: Run tests and type check**

Run: `npx vitest run hooks/useCreateEventWizardAccess.test.ts "app/(main)/events/new" && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add hooks/useCreateEventWizardAccess.ts hooks/useCreateEventWizardAccess.test.ts components/event/create/wizard/CreateEventWizardPage.tsx "app/(main)/events/new/page.tsx"
git commit -m "KAN-197: /events/new on the wizard body behind the flag" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The wizard's messages on public pages

Public pages ship only `PUBLIC_CLIENT_NAMESPACES`. The pop-up fetches its own namespaces through a server action when it first opens there. In the app, the full messages are already loaded.

**Files:**
- Modify: `i18n/publicMessages.ts`
- Create: `i18n/createWizardMessages.ts` (+ test), `lib/createEventWizardMessages.ts`, `components/event/create/wizard/CreateEventWizardMessages.tsx`

- [ ] **Step 1: Share the picker**

In `i18n/publicMessages.ts`, export a general picker and use it:

```ts
// Only these namespaces (dotted paths allowed) out of a full catalog.
export function pickNamespaces(messages: AbstractIntlMessages, namespaces: readonly string[]): AbstractIntlMessages {
    const picked: AbstractIntlMessages = {};
    for (const namespace of namespaces) {
        const segments = namespace.split('.');
        const value = readPath(messages, segments);
        if (value !== undefined) writePath(picked, segments, value);
    }
    return picked;
}

export function pickPublicMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
    return pickNamespaces(messages, PUBLIC_CLIENT_NAMESPACES);
}
```

Run: `npx vitest run i18n/publicMessages.test.ts` — Expected: PASS.

- [ ] **Step 2: Write the failing namespace test**

```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CREATE_WIZARD_NAMESPACES } from '@/i18n/createWizardMessages';

const ROOT = process.cwd();
const ENTRY = 'components/event/create/wizard/CreateEventDialog.tsx';

function resolveImport(specifier: string): string | null {
    if (!specifier.startsWith('@/')) return null;
    const base = path.join(ROOT, specifier.slice(2));
    for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts']) if (existsSync(base + suffix)) return base + suffix;
    return null;
}

// Every namespace read with useTranslations() in the pop-up's import graph.
function collect(): Set<string> {
    const seen = new Set<string>();
    const namespaces = new Set<string>();
    const walk = (file: string) => {
        if (seen.has(file)) return;
        seen.add(file);
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(/useTranslations\('([^']+)'\)/g)) namespaces.add(match[1]);
        for (const match of source.matchAll(/(?:from|import\()\s*'(@\/[^']+)'/g)) {
            const resolved = resolveImport(match[1]);
            if (resolved) walk(resolved);
        }
    };
    walk(path.join(ROOT, ENTRY));
    return namespaces;
}

describe('CREATE_WIZARD_NAMESPACES', () => {
    it('covers every namespace the pop-up reads', () => {
        const covered = (namespace: string) => CREATE_WIZARD_NAMESPACES.some((listed) => namespace === listed || namespace.startsWith(`${listed}.`));
        expect([...collect()].filter((namespace) => !covered(namespace))).toEqual([]);
    });
});
```

This test needs `CreateEventDialog.tsx` (Task 13). Write the namespaces now; the test runs green at the end of Task 13.

- [ ] **Step 3: List the namespaces**

`i18n/createWizardMessages.ts`:

```ts
// Every namespace the create wizard pop-up reads (i18n/createWizardMessages.test.ts keeps this true).
// Public pages don't ship them; the pop-up fetches them when it first opens there.
export const CREATE_WIZARD_NAMESPACES = [
    'ApiErrors',
    'CheckoutReviewPage',
    'Common',
    'CreateEventPage',
    'Durations',
    'EventVoiceFallback',
    'GiftMode.form',
    'Incident',
    'LandingPage.pricing',
    'ManagePage.settings.theme',
    'Modules',
    'ProfilePage.business',
    'SessionUnavailable',
] as const;
```

This is what today's create flow reads (walked from `CreateEventBoundary.tsx` on 2026-11-10). If the Task 13 test reports more, add them here.

- [ ] **Step 4: The server action**

`lib/createEventWizardMessages.ts`:

```ts
'use server';

import type { AbstractIntlMessages } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { CREATE_WIZARD_NAMESPACES } from '@/i18n/createWizardMessages';
import { pickNamespaces } from '@/i18n/publicMessages';

// The wizard's wording for the visitor's language, for the pop-up on public pages (see
// CreateEventWizardMessages). Public text only; no session is read.
export async function loadCreateWizardMessages(): Promise<AbstractIntlMessages> {
    return pickNamespaces(await getMessages(), CREATE_WIZARD_NAMESPACES);
}
```

`getMessages()` resolves the request's locale through `i18n/request.ts`; on a public page that is the page's locale (the proxy's `PUBLIC_LOCALE_HEADER` is on the action's POST too, because it goes to the same path). Check on staging in Task 16 that the Greek landing shows the Greek wizard; if it doesn't, pass `useLocale()` from the client as an argument and call `getMessages({ locale })`.

- [ ] **Step 5: The nested provider**

`components/event/create/wizard/CreateEventWizardMessages.tsx`:

```tsx
'use client';

import { type AbstractIntlMessages, NextIntlClientProvider, useLocale, useMessages, useTimeZone } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';

import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { loadCreateWizardMessages } from '@/lib/createEventWizardMessages';

// The app already has every namespace; public pages fetch the wizard's on first open.
export function CreateEventWizardMessages({ children }: { children: ReactNode }) {
    const messages = useMessages();
    const locale = useLocale();
    const timeZone = useTimeZone();
    const hasWizardMessages = 'CreateEventPage' in messages;
    const [fetched, setFetched] = useState<AbstractIntlMessages | null>(null);

    useEffect(() => {
        if (hasWizardMessages) return;
        let live = true;
        void loadCreateWizardMessages().then((loaded) => {
            if (live) setFetched(loaded);
        });
        return () => {
            live = false;
        };
    }, [hasWizardMessages]);

    if (hasWizardMessages) return children;
    if (!fetched) return <AuthLoadingState />;
    return (
        <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={{ ...messages, ...fetched }}>
            {children}
        </NextIntlClientProvider>
    );
}
```

A failed fetch leaves the spinner; the visitor can close the pop-up. (Rare: a deploy mid-session. The next open retries.)

- [ ] **Step 6: Commit**

```bash
git add i18n/publicMessages.ts i18n/createWizardMessages.ts i18n/createWizardMessages.test.ts lib/createEventWizardMessages.ts components/event/create/wizard/CreateEventWizardMessages.tsx
git commit -m "KAN-197: load the wizard's wording on public pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The pop-up and its host

**Files:**
- Create: `components/event/create/wizard/CreateEventDialog.tsx`, `hooks/useCreateEventDialogHost.ts` (+ test), `components/event/create/wizard/CreateEventDialogHost.tsx`
- Modify: `app/(landing)/layout.tsx`, `app/(main)/(app)/layout.tsx`, `i18n/publicMessages.test.ts`

- [ ] **Step 1: Write the pop-up**

`components/event/create/wizard/CreateEventDialog.tsx` (the default export is what `next/dynamic` loads):

```tsx
'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { CREATE_EVENT_WIZARD_HEADING_ID, CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { CreateEventWizardMessages } from '@/components/event/create/wizard/CreateEventWizardMessages';
import { Modal } from '@/components/ui/modal';
import { useCreateEventRun } from '@/hooks/useCreateEventRun';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

// The wizard over the current page: full screen on phones, a centred window from md up. Its open
// state is the URL (?create=1), so Back steps through the wizard and out of it; Esc, the X and the
// backdrop call onClose. dismissOnBack is off: the URL already does that job.
export default function CreateEventDialog({ onClose }: { onClose: () => void }) {
    return (
        <Modal
            open
            onClose={onClose}
            size="full"
            dismissOnBack={false}
            showCloseButton={false}
            labelledBy={CREATE_EVENT_WIZARD_HEADING_ID}
            className="bg-white md:top-1/2 md:left-1/2 md:h-[min(90vh,52rem)] md:max-h-[90vh] md:w-110 md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-3xl"
        >
            <CreateEventWizardMessages>
                <CreateEventDialogBody onClose={onClose} />
            </CreateEventWizardMessages>
        </Modal>
    );
}

function CreateEventDialogBody({ onClose }: { onClose: () => void }) {
    const t = useTranslations('CreateEventPage.wizard');
    const run = useCreateEventRun('wizard');

    if (!run.isReady) return <AuthLoadingState />;
    return (
        <CreateEventFormProvider mode="wizard">
            <CreateEventWizard
                leading={
                    <button
                        type="button"
                        aria-label={t('close')}
                        onClick={onClose}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-muted"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                }
            />
        </CreateEventFormProvider>
    );
}
```

The dialog takes its name from the step heading. `Modal` only has `ariaLabel` today, so add a `labelledBy` prop in `components/ui/modal.tsx`:

```tsx
    // The id of a heading inside the dialog that names it (instead of ariaLabel).
    labelledBy?: string;
```

in its props type next to `ariaLabel?: string;`, destructure `labelledBy` next to `ariaLabel`, and on `<Dialog.Popup>` next to `aria-label={ariaLabel}`:

```tsx
                    aria-labelledby={labelledBy}
```

Then pass `labelledBy={CREATE_EVENT_WIZARD_HEADING_ID}` to the `Modal` above, importing the constant from `CreateEventWizard.tsx` (Task 10 gives its `h1` that id).

- [ ] **Step 2: Write the failing host test**

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventDialogHost } from '@/hooks/useCreateEventDialogHost';
import { writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const auth = vi.hoisted(() => ({ current: { user: null as null | { role: string } } }));
const flag = vi.hoisted(() => ({ on: true }));
vi.mock('next/navigation', () => ({ useSearchParams: () => params.current }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/providers/CreateWizardFlagProvider', () => ({ useCreateWizardEnabled: () => flag.on }));

function link(href: string) {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = 'Create an event';
    document.body.append(anchor);
    return anchor;
}

beforeEach(() => {
    window.history.replaceState(null, '', '/el');
    params.current = new URLSearchParams();
    auth.current = { user: null };
    flag.on = true;
});

afterEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
});

describe('useCreateEventDialogHost', () => {
    it('opens on create=1', () => {
        params.current = new URLSearchParams('create=1');
        expect(renderHook(() => useCreateEventDialogHost()).result.current.isOpen).toBe(true);
    });

    it('turns a click on a create link into the pop-up over this page', () => {
        renderHook(() => useCreateEventDialogHost());
        const anchor = link('/events/new?type=baptism');
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        anchor.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el?create=1&type=baptism');
    });

    it('leaves new-tab clicks and other links alone', () => {
        renderHook(() => useCreateEventDialogHost());
        const create = link('/events/new');
        const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
        create.dispatchEvent(ctrl);
        expect(ctrl.defaultPrevented).toBe(false);
        const other = link('/pricing');
        const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        other.dispatchEvent(plain);
        expect(plain.defaultPrevented).toBe(false);
    });

    it('does nothing with the flag off or for an admin', () => {
        flag.on = false;
        const { unmount } = renderHook(() => useCreateEventDialogHost());
        const first = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link('/events/new').dispatchEvent(first);
        expect(first.defaultPrevented).toBe(false);
        unmount();

        flag.on = true;
        auth.current = { user: { role: 'ADMIN' } };
        params.current = new URLSearchParams('create=1');
        const { result } = renderHook(() => useCreateEventDialogHost());
        expect(result.current.isOpen).toBe(false);
    });

    it('closing from the type step with nothing typed forgets the run', () => {
        writeCreateEventWizardDraft({
            run: 'r1', step: 'type', eventType: null, planCode: '', durationPicks: {}, title: '', startAt: '', timezone: '',
            locationName: '', locationAddress: '', mapsUrl: '', themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } }, checkoutCode: '',
        });
        params.current = new URLSearchParams('create=1&step=type');
        const { result } = renderHook(() => useCreateEventDialogHost());
        act(() => result.current.close());
        expect(window.localStorage.getItem('storywall.createEventWizard')).toBeNull();
    });
});
```


Run: `npx vitest run hooks/useCreateEventDialogHost.test.tsx` — Expected: FAIL, module not found.

- [ ] **Step 3: Write the host hook**

```ts
'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import {
    clearCreateEventWizardDraft,
    isCreateEventWizardDraftEmpty,
    readCreateEventWizardDraft,
} from '@/lib/createEventWizardDraft';
import { closeWizard, pushWizardEntry } from '@/lib/createEventWizardHistory';
import { CREATE_EVENT_STEP_PARAM, isCreateEventHref, isWizardOpen, wizardUrlForLink } from '@/lib/createEventWizardUrl';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

function createLinkFrom(target: EventTarget | null): HTMLAnchorElement | null {
    const anchor = target instanceof Element ? target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return null;
    return isCreateEventHref(anchor.getAttribute('href') ?? '', window.location.origin) ? anchor : null;
}

/**
 * Opens the create wizard over the current page. Any link to /events/new on the page opens it in
 * place (a plain left click; a new tab or window still follows the link), so no button needs to
 * know about the pop-up. Hovering, focusing or touching such a link starts loading the pop-up's code.
 *
 * Runs in the capture phase on the document, before React's own handlers: preventDefault there
 * also stops next/link's navigation, and click tracking further down still sees the click.
 */
export function useCreateEventDialogHost({ preload }: { preload?: () => void } = {}) {
    const enabled = useCreateWizardEnabled();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const active = enabled && user?.role !== 'ADMIN';
    const isOpen = active && isWizardOpen(searchParams);
    const opener = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!active) return;
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const anchor = createLinkFrom(event.target);
            if (!anchor) return;
            event.preventDefault();
            opener.current = anchor;
            pushWizardEntry(wizardUrlForLink(anchor.getAttribute('href')!, new URL(window.location.href)));
        };
        const onIntent = (event: Event) => {
            if (createLinkFrom(event.target)) preload?.();
        };
        document.addEventListener('click', onClick, true);
        document.addEventListener('pointerover', onIntent, { passive: true });
        document.addEventListener('focusin', onIntent);
        document.addEventListener('touchstart', onIntent, { passive: true });
        return () => {
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('pointerover', onIntent);
            document.removeEventListener('focusin', onIntent);
            document.removeEventListener('touchstart', onIntent);
        };
    }, [active, preload]);

    // Focus goes back to the button that opened it.
    useEffect(() => {
        if (isOpen || !opener.current) return;
        if (opener.current.isConnected) opener.current.focus();
        opener.current = null;
    }, [isOpen]);

    const close = useCallback(() => {
        // Closed on the type step with nothing typed: the run is forgotten. Anything else is kept,
        // and opening the wizard again resumes it.
        const saved = readCreateEventWizardDraft();
        const onTypeStep = (searchParams.get(CREATE_EVENT_STEP_PARAM) ?? 'type') === 'type';
        if (onTypeStep && (!saved || isCreateEventWizardDraftEmpty(saved))) clearCreateEventWizardDraft();
        closeWizard();
    }, [searchParams]);

    return { isOpen, close };
}
```

Run the test — Expected: PASS.

- [ ] **Step 4: Write the host component**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { useCreateEventDialogHost } from '@/hooks/useCreateEventDialogHost';

const loadDialog = () => import('@/components/event/create/wizard/CreateEventDialog');
// Nothing of the wizard ships with the page; it loads on the first hover, focus or touch of a
// create link, or when the URL already asks for it.
const CreateEventDialog = dynamic(loadDialog, { ssr: false });
const preload = () => void loadDialog();

function Host() {
    const { isOpen, close } = useCreateEventDialogHost({ preload });
    return isOpen ? <CreateEventDialog onClose={close} /> : null;
}

// Mounted once per layout. useSearchParams needs the Suspense boundary on statically rendered pages.
export function CreateEventDialogHost() {
    return (
        <Suspense fallback={null}>
            <Host />
        </Suspense>
    );
}
```

- [ ] **Step 5: Mount it**

`app/(landing)/layout.tsx`: inside `CreateWizardFlagProvider`, after the `HydrationBoundary`:

```tsx
                    {/* Create wizard */}
                    <CreateEventDialogHost />
```

`app/(main)/(app)/layout.tsx`:

```tsx
import { ReactNode } from 'react';

import { CreateEventDialogHost } from '@/components/event/create/wizard/CreateEventDialogHost';
import { AppShell } from '@/components/layout/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell>
            {children}
            {/* Create wizard */}
            <CreateEventDialogHost />
        </AppShell>
    );
}
```

(The commented-out `LanguageSwitcher` lines in that file stay as they are; keep them above `{children}`.)

- [ ] **Step 6: Make the pop-up a boundary for the public message check**

In `i18n/publicMessages.test.ts`, add after `ENTRY_FILES`:

```ts
// Loaded on demand with its own messages (see CreateEventWizardMessages); its namespaces are not
// shipped with public pages, and i18n/createWizardMessages.test.ts checks them instead.
const LAZY_BOUNDARIES = new Set([path.join(ROOT, 'components/event/create/wizard/CreateEventDialog.tsx')]);
```

and at the top of `walk`: `if (seen.has(file) || LAZY_BOUNDARIES.has(file)) return;`

- [ ] **Step 7: Run the message checks and the host test**

Run: `npx vitest run i18n hooks/useCreateEventDialogHost.test.tsx`
Expected: PASS, including `createWizardMessages.test.ts` from Task 12. If it lists missing namespaces, add them to `CREATE_WIZARD_NAMESPACES` and run again.

- [ ] **Step 8: Type check, lint and commit**

Run: `npx tsc --noEmit && npx eslint components/event/create/wizard hooks lib i18n "app/(landing)/layout.tsx" "app/(main)/(app)/layout.tsx" components/ui/modal.tsx`
Expected: clean.

```bash
git add components/event/create/wizard/CreateEventDialog.tsx components/event/create/wizard/CreateEventDialogHost.tsx components/event/create/wizard/CreateEventWizard.tsx hooks/useCreateEventDialogHost.ts hooks/useCreateEventDialogHost.test.tsx components/ui/modal.tsx "app/(landing)/layout.tsx" "app/(main)/(app)/layout.tsx" i18n/publicMessages.test.ts
git commit -m "KAN-197: create wizard pop-up over any page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Header and rail buttons

Wording row 1: the reused "Create an event" / "Δημιουργία εκδήλωσης" (`CreateEventPage.title`). Both links point at `/events/new`; the host turns the click into the pop-up.

**Files:**
- Modify: `components/landing/LandingHeader.tsx`, `components/layout/DesktopNavRail.tsx`

- [ ] **Step 1: Header**

`LandingHeader` is a client component on public pages, which don't ship `CreateEventPage`, so it takes the label from `useCreateEventButtonLabel()` (Task 2). Add `useAuth` (`@/hooks/useAuth`) and `useCreateEventButtonLabel`, `useCreateWizardEnabled` (`@/providers/CreateWizardFlagProvider`) to its imports, and near the top of the component:

```ts
    const createLabel = useCreateEventButtonLabel();
    const { user } = useAuth();
    // Admins never get create buttons; the wizard sends them to their console.
    const showCreate = useCreateWizardEnabled() && Boolean(createLabel) && user?.role !== 'ADMIN';
```

In the desktop `<nav>`, after the `links.map(...)` and before the `isSignedIn ? ... : <a ... login>` part:

```tsx
                    {showCreate ? (
                        <a
                            className="rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] px-4 py-2.5 font-bold text-ink"
                            href={routes.events.new()}
                            {...landingClickAttributes({ event: 'create', placement: 'header' })}
                        >
                            {createLabel}
                        </a>
                    ) : null}
```

and in the mobile `<nav>` (`#landing-mobile-menu`), before its `links.map(...)`:

```tsx
                {showCreate ? (
                    <a className="font-bold" href={routes.events.new()} onClick={close} {...landingClickAttributes({ event: 'create', placement: 'mobile_menu' })}>
                        {createLabel}
                    </a>
                ) : null}
```

`close` is the menu's own close function, already used by its sign-in link. The document listener opens the pop-up from the same click. No change to the three heroes that render the header.

- [ ] **Step 2: Rail**

In `DesktopNavRail.tsx`, add `Plus` to the `lucide-react` import, `const tCreate = useTranslations('CreateEventPage');` and `const showCreate = useCreateWizardEnabled() && authUser?.role !== 'ADMIN';`. At the top of the `{!isDemoRoute && (<> ... </>)}` block, before the events link:

```tsx
                        {showCreate && (
                            <DesktopAccountNavLink
                                href={routes.events.new()}
                                icon={Plus}
                                label={tCreate('title')}
                                active={false}
                                expanded={expanded}
                            />
                        )}
```

- [ ] **Step 3: Check, then commit**

Run: `npx tsc --noEmit && npx vitest run components/landing components/occasions components/layout`
Expected: clean, PASS. Header stories outside the provider show no create button (the flag defaults to off).

```bash
git add components/landing/LandingHeader.tsx components/layout/DesktopNavRail.tsx
git commit -m "KAN-197: create buttons in the site header and the app rail" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: The phone button on public pages

Below 761px only. It shows once every hero button has scrolled out of view, and hides while the final call to action is in view, while the mobile menu is open, and while the wizard is open. Pages without a hero button (for-business) don't show it.

**Files:**
- Create: `hooks/useCreateEventFabVisible.ts` (+ test), `components/event/create/wizard/CreateEventFab.tsx`
- Modify: `app/(landing)/layout.tsx`

- [ ] **Step 1: Write the failing visibility test**

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventFabVisible } from '@/hooks/useCreateEventFabVisible';

type Entry = { target: Element; isIntersecting: boolean };
let observerCallback: ((entries: Entry[]) => void) | null = null;

beforeEach(() => {
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: (entries: Entry[]) => void) {
                observerCallback = callback;
            }
            observe() {}
            disconnect() {}
        },
    );
    document.body.innerHTML = `
        <a data-landing-click='{"event":"plans","placement":"hero"}' href="#pricing">Plans</a>
        <section data-landing-section="final_cta"></section>`;
});

afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});

const hero = () => document.querySelector('[data-landing-click]')!;
const finalCta = () => document.querySelector('[data-landing-section="final_cta"]')!;

describe('useCreateEventFabVisible', () => {
    it('hides while the hero button shows', () => {
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() => observerCallback!([{ target: hero(), isIntersecting: true }]));
        expect(result.current).toBe(false);
    });

    it('shows once the hero button has scrolled away', () => {
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() => observerCallback!([{ target: hero(), isIntersecting: false }, { target: finalCta(), isIntersecting: false }]));
        expect(result.current).toBe(true);
    });

    it('hides at the final call to action', () => {
        const { result } = renderHook(() => useCreateEventFabVisible(true));
        act(() => observerCallback!([{ target: hero(), isIntersecting: false }, { target: finalCta(), isIntersecting: true }]));
        expect(result.current).toBe(false);
    });

    it('stays hidden on a page with no hero button, or when disabled', () => {
        document.body.innerHTML = '';
        expect(renderHook(() => useCreateEventFabVisible(true)).result.current).toBe(false);
        expect(renderHook(() => useCreateEventFabVisible(false)).result.current).toBe(false);
    });
});
```

Run: `npx vitest run hooks/useCreateEventFabVisible.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 2: Write the hook**

```ts
'use client';

import { useEffect, useState } from 'react';

const HERO_BUTTONS = '[data-landing-click*=\'"placement":"hero"\']';
const FINAL_CTA = '[data-landing-section="final_cta"]';

// Whether the phone create button should show: after the hero's own buttons have scrolled out of
// view, and not while the final call to action (which has its own button) is on screen.
export function useCreateEventFabVisible(enabled: boolean): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        const heroes = [...document.querySelectorAll(HERO_BUTTONS)];
        if (heroes.length === 0) return;
        const finals = [...document.querySelectorAll(FINAL_CTA)];
        const inView = new Map<Element, boolean>();

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
            const heroShowing = heroes.some((element) => inView.get(element) !== false);
            const finalShowing = finals.some((element) => inView.get(element) === true);
            setVisible(!heroShowing && !finalShowing);
        });
        for (const element of [...heroes, ...finals]) observer.observe(element);
        return () => {
            observer.disconnect();
            setVisible(false);
        };
    }, [enabled]);

    return enabled && visible;
}
```

Run the test — Expected: PASS.

- [ ] **Step 3: Write the button**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useCreateEventFabVisible } from '@/hooks/useCreateEventFabVisible';
import { isWizardOpen } from '@/lib/createEventWizardUrl';
import { routes } from '@/lib/routes';
import { useCreateEventButtonLabel, useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

// The phone create button on public pages: pinned to the bottom, above the safe area. Hidden while
// the mobile menu is open (the menu's own panel has the class `flex` only while open).
function Fab() {
    const enabled = useCreateWizardEnabled();
    const label = useCreateEventButtonLabel();
    const { user } = useAuth();
    const wizardOpen = isWizardOpen(useSearchParams());
    const visible = useCreateEventFabVisible(enabled && user?.role !== 'ADMIN' && !wizardOpen);

    if (!visible) return null;
    return (
        <a
            href={routes.events.new()}
            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-40 flex h-14 items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink shadow-[0_12px_30px_rgba(255,122,89,0.35)] min-[761px]:hidden [body:has(#landing-mobile-menu.flex)_&]:hidden"
        >
            <Plus className="size-5" aria-hidden="true" />
            {label}
        </a>
    );
}

export function CreateEventFab() {
    return (
        <Suspense fallback={null}>
            <Fab />
        </Suspense>
    );
}
```

- [ ] **Step 4: Mount it on public pages**

In `app/(landing)/layout.tsx`, next to `<CreateEventDialogHost />`:

```tsx
                    {/* Phone create button */}
                    <CreateEventFab />
```

Import `CreateEventFab` from `@/components/event/create/wizard/CreateEventFab`.

- [ ] **Step 5: Check, then commit**

Run: `npx vitest run hooks/useCreateEventFabVisible.test.ts i18n && npx tsc --noEmit`
Expected: PASS, clean. (The label comes from the provider, so the public message check needs nothing new.)

```bash
git add hooks/useCreateEventFabVisible.ts hooks/useCreateEventFabVisible.test.ts components/event/create/wizard/CreateEventFab.tsx "app/(landing)/layout.tsx"
git commit -m "KAN-197: create button for phones on public pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The home button, and unverified accounts can start

With the flag on, an unverified account starts the wizard like anyone else and verifies inside it (part 3). The home screen stops disabling create and stops showing its "verify to create" state and banner, which only existed to explain the block.

**Files:**
- Create: `components/home/HomeCreateEventButton.tsx`
- Modify: `hooks/useHomeContent.ts` (+ `.test.tsx`), `components/home/HomeContent.tsx`

- [ ] **Step 1: Write the failing test**

`hooks/useHomeContent.test.tsx` mocks `useAuth` from a hoisted `state`. Extend it: add `wizard: false` to `state`, add `state.wizard = false;` to its `afterEach`, and add this mock beside the others:

```ts
vi.mock('@/providers/CreateWizardFlagProvider', () => ({ useCreateWizardEnabled: () => state.wizard }));
```

Then add these cases inside the `describe` (the mocked user has no role, so it isn't an admin):

```ts
    it('lets an unverified account create once the wizard is on', () => {
        state.wizard = true;
        state.emailVerified = false;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.canCreateEvent).toBe(true);
        expect(result.current.emptyState).toBe('noEvents');
        expect(result.current.showVerifyBanner).toBe(false);
        expect(result.current.showCreateButton).toBe(true);
    });

    it('keeps the old block with the wizard off', () => {
        state.emailVerified = false;
        const { result } = renderHook(() => useHomeContent());
        expect(result.current.canCreateEvent).toBe(false);
        expect(result.current.showCreateButton).toBe(false);
    });
```

Run: `npx vitest run hooks/useHomeContent.test.tsx` — Expected: the two new cases FAIL.

- [ ] **Step 2: Change the hook**

In `hooks/useHomeContent.ts`, import `useCreateWizardEnabled` and replace the `canCreateEvent` line:

```ts
    const wizard = useCreateWizardEnabled();
    // With the wizard on, an unverified account verifies inside it, so nothing blocks the start.
    const canCreateEvent = wizard || user?.emailVerified !== false;
    const showCreateButton = wizard && user?.role !== 'ADMIN';
```

Add `showCreateButton` to the returned object.

- [ ] **Step 3: Write the button**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { routes } from '@/lib/routes';

// The home screen's main action while the create wizard is on. Opens the pop-up (the layout's host
// catches the link).
export function HomeCreateEventButton() {
    const t = useTranslations('CreateEventPage');

    return (
        <AppLink
            href={routes.events.new()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink shadow-[0_10px_28px_rgba(255,122,89,0.28)]"
        >
            <Plus className="size-5" aria-hidden="true" />
            {t('title')}
        </AppLink>
    );
}
```

- [ ] **Step 4: Put it at the top of home**

In `components/home/HomeContent.tsx`, take `showCreateButton` from `useHomeContent()` and add after the Header section:

```tsx
                {/* Create */}
                {showCreateButton && (
                    <section className={feedSectionClassName}>
                        <HomeCreateEventButton />
                    </section>
                )}
```

- [ ] **Step 5: Check, then commit**

Run: `npx vitest run hooks/useHomeContent.test.tsx components/home && npx tsc --noEmit`
Expected: PASS, clean.

```bash
git add components/home/HomeCreateEventButton.tsx components/home/HomeContent.tsx hooks/useHomeContent.ts hooks/useHomeContent.test.tsx
git commit -m "KAN-197: create button on the signed-in home" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Stories, full checks and a look on both widths

**Files:**
- Create: `components/event/create/wizard/CreateEventWizard.stories.tsx`, `components/event/create/wizard/CreateEventDialog.stories.tsx`

- [ ] **Step 1: Stories**

The stories run the real form (`CreateEventFormProvider mode="wizard"`) signed out, with the app config from `withAppContext` and an empty plan list from MSW, so nothing needs a hand-built form context. The visual check captures each at 375px and 1280px in both languages (`docs/storybook.md`).

`components/event/create/wizard/CreateEventWizard.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';

import { withAppContext } from '@/.storybook/appContext';
import { CreateEventWizard } from '@/components/event/create/wizard/CreateEventWizard';
import { CreateEventFormProvider } from '@/providers/CreateEventFormProvider';

const PLANS_URL = '*/api/plan-tiers';

function WizardStory() {
    return (
        <div className="h-[44rem]">
            <CreateEventFormProvider mode="wizard">
                <CreateEventWizard leading={<span className="size-11" aria-hidden="true" />} />
            </CreateEventFormProvider>
        </div>
    );
}

const meta = {
    title: 'Event/CreateEventWizard',
    component: WizardStory,
    decorators: [withAppContext],
    parameters: { app: { user: null } },
    beforeEach({ msw }) {
        msw.use(http.get(PLANS_URL, () => HttpResponse.json([])));
    },
} satisfies Meta<typeof WizardStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeStep: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'type' } } } },
};

export const PlanStep: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'plan', type: 'wedding' } } } },
};
```

`components/event/create/wizard/CreateEventDialog.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import CreateEventDialog from '@/components/event/create/wizard/CreateEventDialog';

const meta = {
    title: 'Event/CreateEventDialog',
    component: CreateEventDialog,
    decorators: [withAppContext],
    args: { onClose: fn() },
    parameters: {
        app: { user: null },
        nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'type' } } },
    },
    beforeEach({ msw }) {
        msw.use(http.get('*/api/plan-tiers', () => HttpResponse.json([])));
    },
} satisfies Meta<typeof CreateEventDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
```

Storybook's preview loads the full catalog, so `CreateEventWizardMessages` passes straight through. If the plan step's story shows a loading state instead of the empty list, the plans request is going somewhere else: check the request URL in the browser's network tab and change `PLANS_URL` to match.

Run: `npm run build-storybook` — Expected: builds without errors. Then open both stories with `npm run storybook` at mobile and desktop width and check the pop-up is full screen on the phone and a centred window on desktop.

- [ ] **Step 2: Every check**

Run, in order: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`.
Expected: all clean. Fix anything red before going on. Revert any `AGENTS.md` change `next build`/`next dev` made.

- [ ] **Step 3: Look at it**

Start the dev server per the memory notes (never `preview_start {name}`; use the existing :3000 server or the isolated stack), then check with the built-in browser at 375px and desktop width:

1. Landing (`/` and `/el`), signed out: header has "Create an event" / "Δημιουργία εκδήλωσης"; tap it → pop-up over the landing, URL `/?create=1&run=…`; Back closes it; the phone button appears after scrolling past the hero, hides at the final call to action and while the menu is open.
2. In the pop-up: pick a type, Continue → `step=plan` in the URL, counter "2/4" (wedding) or "2/5" (baptism with a themed plan), Back returns to the type step.
3. Type a title on details, reload → the pop-up reopens on details with the title.
4. Close with X from details, open again → resumes. Close from the type step with nothing typed → next open starts fresh.
5. A pricing card ("Choose") on the landing opens the pop-up on details with that plan.
6. `/events/new` signed out: the full-page wizard, no redirect to sign-in; page source has `noindex`.
7. Signed in (local test login, memory "Browser pane and signed-in UI"): home shows the create button at the top; the rail shows "Create an event"; each opens the pop-up.
8. Greek landing: the pop-up's wording is Greek.
9. Landing LCP and JS size: compare the landing page's JS sent and LCP before and after on a phone profile (spec 9); the wizard code must not load until a create link is hovered, focused or touched.

Note anything off and fix it in this branch before the PR.

- [ ] **Step 4: SEO check**

Go through `docs/seo-guidelines.md` for `/events/new` and the pages with the new header button. List any broken rule as a BLOCKER in the PR description.

- [ ] **Step 5: Commit the stories**

```bash
git add components/event/create/wizard/CreateEventWizard.stories.tsx components/event/create/wizard/CreateEventDialog.stories.tsx
git commit -m "KAN-197: stories for the wizard and its pop-up" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Pull request**

Ask the user before pushing. Then push and open a PR into `staging` titled `KAN-197: create wizard foundations, pop-up and buttons (behind a flag)`. The body names only KAN-197 among Jira keys, lists what's in it, says production is unchanged (flag off), lists the checks run, and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. The `visual-regression` check runs on it; never tick its approve box.
