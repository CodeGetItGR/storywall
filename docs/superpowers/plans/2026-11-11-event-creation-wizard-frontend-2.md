# Event Creation Wizard (Frontend, part 2: type and plan steps) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inside the wizard (flag on), replace the type and plan steps with the approved designs: a big photo with photo chips and what the type includes, then a guest-count question that suggests one plan, with a "Compare all plans" sheet.

**Architecture:** New components under `components/event/create/wizard/` render only inside `CreateEventWizard`; the old flow (`CreateEventBoundary`, flag off) keeps today's `EventTypeStep`, `EventPlanSelector` and `EventCreateFooter` untouched. The pure rules (which features show, guest chips, highlight tiles, compare lines, type photos) live in `lib/` with unit tests; small hooks turn form state into plain values for declarative components. The compare sheet's open state is a URL param (`sheet=plans`) pushed as its own wizard history entry, so Back closes it and the wizard's close-depth stays right. Each wizard entry now records whether it was a step or the sheet, so the new top-left Back button can go back one entry instead of stacking new ones.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, TanStack Query 5, Base UI dialog (`components/ui/modal.tsx`), Vitest + Testing Library, Storybook 10.

**Spec:** `docs/superpowers/specs/2026-11-10-event-creation-wizard-design.md` sections 5.1–5.4, 6, 8, 10 (type and plan parts), work order items 4 and 5. Wording: `...-copy.md` rows 3–21, 25–41, 81–84 (approved 2026-11-10). Mockups: canvas boards "1 · Type, wedding picked", "1 · Type, gender reveal picked", "2 · Plan, suggested from guest count", "2 · Compare all plans (sheet)". Jira epic KAN-197.

**Not in this part:** details (live preview), theme wording, account and code screens, review restyle, celebration (part 3). Until part 3, the details, theme and overview steps keep today's footer (its own Back beside Continue) under the new top-left Back.

---

## Before you start

- Work in this worktree on `claude/kan-197-event-creation-wizard`. Part 1 is in PR #299; if it has merged, start a new branch `claude/kan-197-wizard-type-plan-steps` from the latest `staging`. If it has not merged, branch from `claude/kan-197-event-creation-wizard` and open the PR into it, then retarget to `staging` after #299 merges.
- If `node_modules` is missing, link it to the main checkout's (memory note "Worktree node_modules junction") when the lockfiles match.
- One test file: `npx vitest run <path>`. Whole suite: `npx vitest run`. Types: `npx tsc --noEmit`. Lint: `npx eslint .`. Format check: `npx prettier --check <files>`.
- Commit messages start with `KAN-197:` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name. A local `next dev` run edits `AGENTS.md`: revert it, never commit it.
- Never change user-facing wording beyond what Task 2 lists. Every string there is approved (copy rows named per key) or reused verbatim.
- Every new visual section gets the repo's JSX section comment (`{/* Photo */}`, `{/* Types */}`, ...).

## Decisions taken while planning

1. **New keys for the wizard, old keys untouched.** Rows 3, 26 and 34 change text that the old flow still shows on production (flag off). The wizard reads new keys under `CreateEventPage.wizard`; the old keys (`steps.typeSubtitle`, `steps.planSubtitle`, `continueTo*`) stay until the cleanup PR after launch.
2. **The guest chip follows the plan; nothing new is saved.** Each chip stands for one full plan, so picking a chip picks its plan, and the chip shown as picked is the selected plan's. The saved answers already keep the plan code, so "guest choice" needs no field of its own. A lite plan (from a link or the sheet) leaves no chip picked.
3. **The four missing icons are the mockup's line icons** (QR cards, Co-hosts, Theme, Boy or Girl?), inline SVG stroked with the same gradient. The other seven use the landing's mask icons (`public/landing/wedding/icons/*.webp`) through the existing `GradientIcon`.
4. **Approved by the user 2026-11-11:**
   - The type step's photo scrolls away with the page (it is part of the scroll area); close, progress and counter sit on it.
   - The compare sheet is a bottom sheet on phones and the app's existing sheet card on desktop, narrowed to the wizard's width. No new right-side panel.
   - From the plan step on, the top-left button is Back (reused "Back" / "Πίσω") and the bottom bar is one full-width button. The type step keeps Close.
5. **Back goes back one history entry when it can.** A step entry pushed by the wizard is left with `history.back()`; an entry the page was loaded on (a shared link) is replaced with the previous step instead, so Back never leaves the site.
6. **Feature lines:** rows 9–13 and 15 are new keys; rows 14, 16, 81, 82 and 83 are the existing `Modules.<key>.description` strings, read from there. Feature and tile names come from `useModuleCopy`, as everywhere else (so an admin's per-type module name wins, as today).
7. **The plan note** counts a feature as "in a plan" only when the plan includes it (`moduleKeys`); a feature sold only as an add-on shows the note.
8. **Compare rows:** the first full plan lists up to three of its own feature names, with row 37 ("… and more") only when it has more than three. Later plans use row 38 with up to three added features, or row 39 when they add none. Names are joined with ", " (no new string).

## Files

| File | Change |
|---|---|
| `lib/createEventWizardUrl.ts` (+ test) | `sheet` param (`CREATE_EVENT_SHEET_PARAM`, `PLANS_SHEET`) |
| `lib/createEventWizardHistory.ts` (+ test) | Entries record their kind; `leaveWizardEntry` |
| `hooks/useCreateEventStepNavigation.ts` (+ test) | Step entries are marked; `back(previous)` |
| `hooks/useCreateEventFormController.ts`, `providers/createEvent/CreateEventFormContext.tsx` | `goBack` |
| `messages/en.json`, `messages/el.json` | New `CreateEventPage.wizard.*` keys |
| `lib/createEventFeatures.ts` (+ test) | New: features per type, plan note, priority |
| `lib/createEventCatalog.ts` (+ test) | Type photos for the wizard |
| `components/event/create/wizard/CreateEventFeatureIcon.tsx` (+ test) | New: mask or line icon per feature |
| `components/event/create/wizard/CreateEventWizardProgress.tsx` | `tone="onPhoto"` |
| `hooks/useCreateEventWizardTypeStep.ts` | New: photo, chips, features as plain values |
| `components/event/create/wizard/type/*` (+ test) | New: `TypeStep`, `TypePhoto`, `TypeChips`, `TypeFeatures` |
| `lib/createEventPlanChoice.ts` (+ test) | New: guest chips, highlight tiles, compare lines |
| `components/plan/DurationPicker.tsx` (+ test) | `segmented` variant |
| `hooks/useCreateEventWizardPlanStep.ts` | New: chips, card, durations as plain values |
| `components/event/create/wizard/plan/*` (+ test) | New: `PlanStep`, `PlanGuestChips`, `PlanCard`, `PlanHighlights` |
| `hooks/useCreateEventPlansSheet.ts` | New: open state from the URL, pending pick, rows |
| `components/event/create/wizard/plan/PlansSheet.tsx` (+ test) | New: the compare sheet |
| `components/event/create/wizard/CreateEventWizardBackButton.tsx` | New: top-left Back |
| `components/event/create/wizard/CreateEventWizardFooter.tsx` | New: full-width button on type and plan, old footer after |
| `components/event/create/wizard/CreateEventWizard.tsx` | Wires the new steps, Back and footer |
| `.storybook/fixtures.ts`, wizard stories | Plans, modules and stories for every new screen |

---

### Task 1: History entries know what they are, and Back goes back

**Files:**
- Modify: `lib/createEventWizardUrl.ts`, `lib/createEventWizardHistory.ts`, `hooks/useCreateEventStepNavigation.ts`, `hooks/useCreateEventFormController.ts`, `providers/createEvent/CreateEventFormContext.tsx`
- Test: `lib/createEventWizardUrl.test.ts`, `lib/createEventWizardHistory.test.ts`, `hooks/useCreateEventStepNavigation.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/createEventWizardHistory.test.ts` (inside the existing `describe`), and add `leaveWizardEntry` to its import:

```ts
    it('leaves a pushed step entry by going back one entry', () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        pushWizardEntry('/?create=1');
        pushWizardEntry('/?create=1&step=plan', 'step');
        leaveWizardEntry('step', '/?create=1&step=type');
        expect(back).toHaveBeenCalledTimes(1);
    });

    it('replaces an entry the page was loaded on instead of leaving the site', () => {
        window.history.replaceState(null, '', '/el?create=1&step=plan');
        const back = vi.spyOn(window.history, 'back');
        leaveWizardEntry('step', '/el?create=1&step=type');
        expect(back).not.toHaveBeenCalled();
        expect(window.location.search).toBe('?create=1&step=type');
    });

    it('does not go back from a step entry when asked to leave the sheet', () => {
        const back = vi.spyOn(window.history, 'back');
        pushWizardEntry('/?create=1&step=plan', 'step');
        leaveWizardEntry('sheet', '/?create=1&step=plan');
        expect(back).not.toHaveBeenCalled();
    });

    it('keeps the kind when an entry is replaced', () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        pushWizardEntry('/?create=1&step=plan&sheet=plans', 'sheet');
        replaceWizardEntry('/?create=1&step=plan&sheet=plans&run=r1');
        leaveWizardEntry('sheet', '/?create=1&step=plan&run=r1');
        expect(back).toHaveBeenCalledTimes(1);
    });
```

Append to `lib/createEventWizardUrl.test.ts` (add `CREATE_EVENT_SHEET_PARAM`, `PLANS_SHEET` to the import):

```ts
describe('the sheet param', () => {
    it('is a wizard param, so closing the pop-up removes it', () => {
        const url = new URL('https://storywall.gr/el?src=ig&create=1&step=plan&sheet=plans');
        expect(withoutWizardParams(url)).toBe('/el?src=ig');
    });

    it('is set and removed like the others', () => {
        const url = new URL('https://storywall.gr/el?create=1&step=plan');
        expect(withWizardParams(url, { [CREATE_EVENT_SHEET_PARAM]: PLANS_SHEET })).toBe('/el?create=1&step=plan&sheet=plans');
    });
});
```

Append to `hooks/useCreateEventStepNavigation.test.ts` (inside the `describe`):

```ts
    it('goes back one entry from a step the wizard pushed', () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        window.history.replaceState(null, '', '/el?create=1');
        const { result } = renderHook(() => useCreateEventStepNavigation('wizard', 'r1'));
        result.current.push('plan');
        result.current.back('type');
        expect(back).toHaveBeenCalledTimes(1);
        back.mockRestore();
    });

    it('replaces the step when the page was loaded on it', () => {
        window.history.replaceState(null, '', '/el?create=1&step=plan&run=r1');
        const { result } = renderHook(() => useCreateEventStepNavigation('wizard', 'r1'));
        result.current.back('type');
        expect(window.location.search).toBe('?create=1&step=type&run=r1');
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/createEventWizardHistory.test.ts lib/createEventWizardUrl.test.ts hooks/useCreateEventStepNavigation.test.ts`
Expected: FAIL (`leaveWizardEntry`, `CREATE_EVENT_SHEET_PARAM` and `back` don't exist).

- [ ] **Step 3: Add the sheet param**

In `lib/createEventWizardUrl.ts`, below `CREATE_EVENT_STEP_PARAM`:

```ts
// The compare-plans sheet on the plan step. Its own history entry, so Back closes it.
export const CREATE_EVENT_SHEET_PARAM = 'sheet';
export const PLANS_SHEET = 'plans';
```

and add `CREATE_EVENT_SHEET_PARAM` to `WIZARD_PARAMS`, after `CREATE_EVENT_STEP_PARAM`.

- [ ] **Step 4: Record each entry's kind**

Replace `pushWizardEntry` in `lib/createEventWizardHistory.ts` and add `leaveWizardEntry`:

```ts
// What pushed the entry: opening the pop-up, a step change, or the compare sheet.
export type WizardEntryKind = 'open' | 'step' | 'sheet';
const WIZARD_ENTRY_KIND_KEY = '__storywallCreateWizardEntry';

function currentEntryKind(): WizardEntryKind | null {
    const state = window.history.state as Record<string, unknown> | null;
    const kind = state?.[WIZARD_ENTRY_KIND_KEY];
    return kind === 'open' || kind === 'step' || kind === 'sheet' ? kind : null;
}

// Opening the pop-up, each step and the sheet are their own Back step.
export function pushWizardEntry(url: string, kind: WizardEntryKind = 'open'): void {
    pushPageEntry(url, { [WIZARD_DEPTH_KEY]: wizardDepth() + 1, [WIZARD_ENTRY_KIND_KEY]: kind });
}

// Leave the current step or sheet: back one entry when the wizard pushed it, else (the page was loaded
// on it) replace it with `fallbackUrl`, so Back never leaves the site.
export function leaveWizardEntry(kind: Exclude<WizardEntryKind, 'open'>, fallbackUrl: string): void {
    if (currentEntryKind() === kind) {
        window.history.back();
        return;
    }
    replaceWizardEntry(fallbackUrl);
}
```

`replaceWizardEntry` already keeps the entry's state (`replacePageUrl` copies it), so the kind survives a replace.

- [ ] **Step 5: Mark step entries and add `back`**

In `hooks/useCreateEventStepNavigation.ts`, import `leaveWizardEntry` and change both branches:

```ts
        if (mode === 'legacy') {
            return {
                push: (step: CreateEventStep) => router.push(routes.events.new({ step, run }), { scroll: false }),
                replace: (step: CreateEventStep) => router.replace(routes.events.new({ step, run })),
                // The old flow has its own Back buttons in the footer; this is never called there.
                back: (previous: CreateEventStep) => router.push(routes.events.new({ step: previous, run }), { scroll: false }),
            };
        }
        const urlFor = (step: CreateEventStep) => withWizardParams(new URL(window.location.href), { step, run });
        return {
            push: (step: CreateEventStep) => pushWizardEntry(urlFor(step), 'step'),
            replace: (step: CreateEventStep) => replaceWizardEntry(urlFor(step)),
            back: (previous: CreateEventStep) => leaveWizardEntry('step', urlFor(previous)),
        };
```

- [ ] **Step 6: Expose `goBack` from the controller**

In `hooks/useCreateEventFormController.ts`, after `goToOverview`:

```ts
    // The top-left Back: the step before this one among the steps shown.
    const goBack = useCallback(() => {
        const previous = steps[steps.indexOf(step) - 1];
        if (previous) navigation.back(previous);
    }, [navigation, step, steps]);
```

Add `goBack,` to the returned object after `goToOverview,`. In `providers/createEvent/CreateEventFormContext.tsx`, add to `CreateEventFormValue` after `goToOverview`:

```ts
    // Back one step (the wizard's top-left button). One history entry back when the wizard pushed it.
    goBack: () => void;
```

- [ ] **Step 7: Run the tests and types**

Run: `npx vitest run lib/createEventWizardHistory.test.ts lib/createEventWizardUrl.test.ts hooks/useCreateEventStepNavigation.test.ts hooks/useCreateEventDialogHost.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors. (Test mocks of `useCreateEventForm` that build a full value elsewhere may need `goBack: vi.fn()`; add it where tsc asks.)

- [ ] **Step 8: Commit**

```bash
git add lib/createEventWizardUrl.ts lib/createEventWizardUrl.test.ts lib/createEventWizardHistory.ts lib/createEventWizardHistory.test.ts hooks/useCreateEventStepNavigation.ts hooks/useCreateEventStepNavigation.test.ts hooks/useCreateEventFormController.ts providers/createEvent/CreateEventFormContext.tsx
git commit -m "KAN-197: wizard entries know whether they are a step or the sheet, and Back goes back one

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The wording

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

Only the strings below. Each is approved (copy row in brackets). Do not touch any other key.

- [ ] **Step 1: Add the English keys**

In `messages/en.json`, inside `CreateEventPage.wizard` (which already has `stepCounter` and `close`), add:

```json
"type": {
    "heading": "What are we celebrating?",
    "continue": {
        "wedding": "Let's plan your wedding",
        "baptism": "Let's plan the baptism",
        "reveal": "Let's plan your reveal",
        "reunion": "Let's plan your reunion",
        "other": "Let's plan your event"
    }
},
"features": {
    "heading": "What's included",
    "planNote": "Some features depend on the plan you pick.",
    "lines": {
        "posts": "Photos and wishes from guests.",
        "qr_cards": "Scan at the table, no app.",
        "playlist": "Guests request the songs.",
        "schedule": "The day, hour by hour.",
        "stories": "Short moments from the day.",
        "wishbook": "Guests' wishes in one book."
    }
},
"plan": {
    "heading": "How many guests are you inviting?",
    "upTo": "Up to {count}",
    "moreThan": "More than {count}",
    "bestFit": "Best fit for you",
    "everythingInPlus": "Everything in {plan}, plus",
    "compare": "Compare all plans",
    "continue": "Continue"
},
"plans": {
    "title": "All plans",
    "andMore": "{features} and more",
    "everythingInPlus": "Everything in {plan}, plus {features}",
    "choose": "Choose {plan}"
}
```

Rows: `type.heading` 3, `type.continue.*` 17–21, `features.heading` 4, `features.planNote` 84, `features.lines.posts` 9, `qr_cards` 10, `playlist` 11, `schedule` 12, `stories` 13, `wishbook` 15, `plan.heading` 26, `upTo` 27, `moreThan` 28, `bestFit` 29, `everythingInPlus` 31, `compare` 33, `continue` 34, `plans.title` 35, `andMore` 37, `plans.everythingInPlus` 38, `choose` 41.

- [ ] **Step 2: Add the Greek keys**

Same place in `messages/el.json`:

```json
"type": {
    "heading": "Τι γιορτάζουμε;",
    "continue": {
        "wedding": "Πάμε να οργανώσουμε τον γάμο σας",
        "baptism": "Πάμε να οργανώσουμε τη βάπτιση",
        "reveal": "Πάμε να οργανώσουμε την αποκάλυψη",
        "reunion": "Πάμε να οργανώσουμε το reunion σας",
        "other": "Πάμε να οργανώσουμε την εκδήλωσή σας"
    }
},
"features": {
    "heading": "Τι περιλαμβάνεται",
    "planNote": "Κάποιες λειτουργίες εξαρτώνται από το πλάνο που θα επιλέξετε.",
    "lines": {
        "posts": "Φωτογραφίες και ευχές από τους καλεσμένους.",
        "qr_cards": "Σκανάρουν στο τραπέζι, χωρίς εφαρμογή.",
        "playlist": "Οι καλεσμένοι ζητούν τα τραγούδια.",
        "schedule": "Η μέρα, ώρα με την ώρα.",
        "stories": "Μικρές στιγμές από τη μέρα.",
        "wishbook": "Οι ευχές των καλεσμένων σε ένα βιβλίο."
    }
},
"plan": {
    "heading": "Πόσους καλεσμένους θα έχετε;",
    "upTo": "Έως {count}",
    "moreThan": "Πάνω από {count}",
    "bestFit": "Ιδανικό για εσάς",
    "everythingInPlus": "Όλα όσα περιλαμβάνει το {plan}, και επιπλέον",
    "compare": "Σύγκριση όλων των πλάνων",
    "continue": "Συνέχεια"
},
"plans": {
    "title": "Όλα τα πλάνα",
    "andMore": "{features} και άλλα",
    "everythingInPlus": "Όλα όσα περιλαμβάνει το {plan}, και {features}",
    "choose": "Επιλογή {plan}"
}
```

- [ ] **Step 3: Check the files are valid and the key sets match**

Run: `node -e "const en=require('./messages/en.json').CreateEventPage.wizard, el=require('./messages/el.json').CreateEventPage.wizard; const keys=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v).map(s=>k+'.'+s):[k]); console.log(JSON.stringify(keys(en))===JSON.stringify(keys(el)))"`
Expected: `true`. Then `npx vitest run i18n` — PASS (any existing messages parity test stays green).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-197: wording for the wizard's type and plan steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: What each type includes

**Files:**
- Create: `lib/createEventFeatures.ts`
- Test: `lib/createEventFeatures.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { createEventFeatures, featureLineSource, featurePriority } from '@/lib/createEventFeatures';

function plan(code: string, eventTypeKey: string, moduleKeys: string[], extra: Partial<PlanTierResponseDto> = {}) {
    return { id: code, code, scope: 'EVENT', isPublic: true, isAssignable: true, eventTypeKey, moduleKeys, paidModules: [], ...extra } as unknown as PlanTierResponseDto;
}

const ALL = ['gallery', 'qr_cards', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'co_hosts', 'theme', 'he_or_she', 'posts'];

function config(plans: PlanTierResponseDto[], disabled: string[] = []) {
    return {
        planTiers: plans,
        modules: ALL.map((moduleKey, sortOrder) => ({ moduleKey, isEnabled: !disabled.includes(moduleKey), sortOrder })),
    } as unknown as AppConfigResponseDto;
}

describe('createEventFeatures', () => {
    it('shows the wedding list in order: four big, then the small row', () => {
        const result = createEventFeatures(config([plan('STORY', 'WEDDING', ALL)]), 'WEDDING');
        expect(result.big).toEqual(['gallery', 'qr_cards', 'wishbook', 'rsvp']);
        expect(result.small).toEqual(['stories', 'playlist', 'schedule', 'co_hosts']);
        expect(result.showPlanNote).toBe(false);
    });

    it('moves the next feature up when no plan offers one (production weddings have no QR cards)', () => {
        const keys = ALL.filter((key) => key !== 'qr_cards');
        const result = createEventFeatures(config([plan('STORY', 'WEDDING', keys)]), 'WEDDING');
        expect(result.big).toEqual(['gallery', 'wishbook', 'rsvp', 'stories']);
        expect(result.small).toEqual(['playlist', 'schedule', 'co_hosts']);
    });

    it('counts add-ons as offered, and leaves out disabled modules', () => {
        const addOn = { grantsModuleKey: 'qr_cards' };
        const keys = ALL.filter((key) => key !== 'qr_cards');
        const withAddOn = createEventFeatures(config([plan('STORY', 'WEDDING', keys, { paidModules: [addOn] } as never)]), 'WEDDING');
        expect(withAddOn.big).toContain('qr_cards');
        expect(withAddOn.showPlanNote).toBe(true);

        const disabled = createEventFeatures(config([plan('STORY', 'WEDDING', ALL)], ['gallery']), 'WEDDING');
        expect(disabled.big[0]).toBe('qr_cards');
    });

    it('shows the note only when a shown feature is missing from some public plan of the type', () => {
        const plans = [plan('START', 'BAPTISM', ['gallery', 'wishbook', 'rsvp']), plan('STORY', 'BAPTISM', ALL)];
        expect(createEventFeatures(config(plans), 'BAPTISM').showPlanNote).toBe(true);
        const other = [plan('ONE', 'GENDER_REVEAL', ALL.filter((key) => key !== 'playlist'))];
        const reveal = createEventFeatures(config(other), 'GENDER_REVEAL');
        expect(reveal.big).toEqual(['he_or_she', 'gallery', 'wishbook', 'rsvp']);
        expect(reveal.small).toEqual(['stories', 'schedule', 'theme']);
        expect(reveal.showPlanNote).toBe(false);
    });

    it('ignores other types, hidden plans and account plans', () => {
        const plans = [
            plan('W', 'WEDDING', ALL),
            plan('HIDDEN', 'REUNION', ALL, { isPublic: false }),
            plan('R', 'REUNION', ['gallery', 'rsvp']),
        ];
        const result = createEventFeatures(config(plans), 'REUNION');
        expect(result.big).toEqual(['gallery', 'rsvp']);
        expect(result.small).toEqual([]);
    });

    it('uses the default list for a type without its own', () => {
        expect(featurePriority('BIRTHDAY')).toEqual(['gallery', 'rsvp', 'wishbook', 'stories', 'playlist', 'schedule', 'co_hosts', 'theme', 'posts']);
        const result = createEventFeatures(config([plan('B', 'BIRTHDAY', ALL)]), 'BIRTHDAY');
        expect(result.big).toEqual(['gallery', 'rsvp', 'wishbook', 'stories']);
        expect(result.small).toEqual(['playlist', 'schedule', 'co_hosts', 'theme']);
    });

    it('shows nothing before the config loads', () => {
        expect(createEventFeatures(null, 'WEDDING')).toEqual({ big: [], small: [], showPlanNote: false });
    });

    it('reads approved new lines from the wizard and reused ones from Modules', () => {
        expect(featureLineSource('qr_cards')).toBe('wizard');
        expect(featureLineSource('rsvp')).toBe('module');
        expect(featureLineSource('gallery')).toBe('module');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/createEventFeatures.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `lib/createEventFeatures.ts`**

```ts
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { occasionModuleKeys } from '@/lib/occasions/occasionFeatures';
import { publicAssignablePlans } from '@/lib/planTiers';

// The modules the wizard's type step and plan card can show, each with an icon.
export const CREATE_EVENT_FEATURE_KEYS = [
    'gallery',
    'qr_cards',
    'wishbook',
    'rsvp',
    'stories',
    'playlist',
    'schedule',
    'co_hosts',
    'theme',
    'he_or_she',
    'posts',
] as const;
export type CreateEventFeatureKey = (typeof CREATE_EVENT_FEATURE_KEYS)[number];

const BIG_COUNT = 4;
const SMALL_MAX = 4;

// Approved per type (spec 5.2): the first four are the big ones, the rest fill the small row.
const PRIORITY: Partial<Record<EventTypeConvention, CreateEventFeatureKey[]>> = {
    WEDDING: ['gallery', 'qr_cards', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'co_hosts'],
    BAPTISM: ['gallery', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'theme', 'co_hosts'],
    GENDER_REVEAL: ['he_or_she', 'gallery', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'theme'],
    REUNION: ['gallery', 'rsvp', 'stories', 'co_hosts', 'playlist', 'schedule', 'posts'],
};
const DEFAULT_PRIORITY: CreateEventFeatureKey[] = ['gallery', 'rsvp', 'wishbook', 'stories', 'playlist', 'schedule', 'co_hosts', 'theme', 'posts'];

export function featurePriority(eventType: EventTypeConvention): CreateEventFeatureKey[] {
    return PRIORITY[eventType] ?? DEFAULT_PRIORITY;
}

export function isCreateEventFeatureKey(key: string): key is CreateEventFeatureKey {
    return (CREATE_EVENT_FEATURE_KEYS as readonly string[]).includes(key);
}

export type CreateEventFeatures = { big: CreateEventFeatureKey[]; small: CreateEventFeatureKey[]; showPlanNote: boolean };

// What the type step shows: the type's list, keeping only what some public plan of that type
// includes or sells as an add-on, so a missing feature lets the next one move up.
export function createEventFeatures(config: AppConfigResponseDto | null | undefined, eventType: EventTypeConvention): CreateEventFeatures {
    if (!config) return { big: [], small: [], showPlanNote: false };

    const offered = occasionModuleKeys(config, eventType);
    const shown = featurePriority(eventType).filter((key) => offered.has(key));
    const big = shown.slice(0, BIG_COUNT);
    const small = shown.slice(BIG_COUNT, BIG_COUNT + SMALL_MAX);

    // The note: some feature on show isn't included in every public plan of this type.
    const plans = publicAssignablePlans(config.planTiers, 'EVENT').filter((plan) => plan.eventTypeKey === eventType);
    const showPlanNote = [...big, ...small].some((key) => plans.some((plan) => !plan.moduleKeys.includes(key)));

    return { big, small, showPlanNote };
}

// Where a big feature's one-line description comes from: new approved lines (copy rows 9–13, 15) live
// under CreateEventPage.wizard.features.lines; the rest reuse the module's own description.
const WIZARD_LINES: ReadonlySet<CreateEventFeatureKey> = new Set(['posts', 'qr_cards', 'playlist', 'schedule', 'stories', 'wishbook']);

export function featureLineSource(key: CreateEventFeatureKey): 'wizard' | 'module' {
    return WIZARD_LINES.has(key) ? 'wizard' : 'module';
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/createEventFeatures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/createEventFeatures.ts lib/createEventFeatures.test.ts
git commit -m "KAN-197: what each event type includes, following the real plans

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A photo per type

**Files:**
- Modify: `lib/createEventCatalog.ts`
- Test: `lib/createEventCatalog.test.ts` (create if missing)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { createEventTypePhoto } from '@/lib/createEventCatalog';

describe('createEventTypePhoto', () => {
    it('prefers the photo an admin uploaded', () => {
        expect(createEventTypePhoto('WEDDING', 'https://r2.test/w.jpg')).toBe('https://r2.test/w.jpg');
    });

    it('falls back to a landing photo of that type', () => {
        expect(createEventTypePhoto('WEDDING', null)).toBe('/landing/03-wedding-ceremony-santorini.webp');
        expect(createEventTypePhoto('GENDER_REVEAL', null)).toBe('/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp');
    });

    it('has a photo for every type', () => {
        for (const type of ['WEDDING', 'BAPTISM', 'SOCIAL_EVENT', 'BIRTHDAY', 'PRIVATE_PARTY', 'GENDER_REVEAL', 'BABY_SHOWER', 'REUNION'] as const) {
            expect(createEventTypePhoto(type, null)).toMatch(/^\/landing\/.+\.webp$/);
        }
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/createEventCatalog.test.ts` — FAIL (`createEventTypePhoto` missing).

- [ ] **Step 3: Add the map**

Append to `lib/createEventCatalog.ts`:

```ts
// The wizard's type photos (spec 5.1), used while a type has no admin-uploaded image. The old flow keeps
// backgroundImageSrc above.
const CREATE_EVENT_TYPE_PHOTOS: Record<EventTypeConvention, string> = {
    WEDDING: '/landing/03-wedding-ceremony-santorini.webp',
    BAPTISM: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp',
    SOCIAL_EVENT: '/landing/guests-mingling-with-champagne-at-an-elegant-vip-social-party.webp',
    BIRTHDAY: '/landing/woman-in-black-dress-holding-birthday-cake.webp',
    PRIVATE_PARTY: '/landing/guests-dancing-at-an-elegant-vip-social-party-at-night.webp',
    GENDER_REVEAL: '/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp',
    BABY_SHOWER: '/landing/pregnant-woman-and-friends-with-pink-and-blue-balloons.webp',
    REUNION: '/landing/friends-and-family-celebrating-at-sunset.webp',
};

export function createEventTypePhoto(eventType: EventTypeConvention, imageUrl: string | null): string {
    return imageUrl ?? CREATE_EVENT_TYPE_PHOTOS[eventType];
}
```

Check each file exists: `ls public/landing/03-wedding-ceremony-santorini.webp public/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp public/landing/guests-mingling-with-champagne-at-an-elegant-vip-social-party.webp public/landing/woman-in-black-dress-holding-birthday-cake.webp public/landing/guests-dancing-at-an-elegant-vip-social-party-at-night.webp public/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp public/landing/pregnant-woman-and-friends-with-pink-and-blue-balloons.webp public/landing/friends-and-family-celebrating-at-sunset.webp`

- [ ] **Step 4: Run the test** — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/createEventCatalog.ts lib/createEventCatalog.test.ts
git commit -m "KAN-197: a landing photo for each event type in the wizard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Feature icons

**Files:**
- Create: `components/event/create/wizard/CreateEventFeatureIcon.tsx`
- Test: `components/event/create/wizard/CreateEventFeatureIcon.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CreateEventFeatureIcon } from '@/components/event/create/wizard/CreateEventFeatureIcon';

afterEach(cleanup);

describe('CreateEventFeatureIcon', () => {
    it('masks the landing icon for features that have one', () => {
        const { container } = render(<CreateEventFeatureIcon featureKey="gallery" size="big" />);
        const icon = container.firstElementChild as HTMLElement;
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(icon.style.getPropertyValue('--icon')).toContain('/landing/wedding/icons/gallery.webp');
    });

    it('draws a line icon for QR cards, co-hosts, theme and boy or girl', () => {
        for (const featureKey of ['qr_cards', 'co_hosts', 'theme', 'he_or_she'] as const) {
            const { container, unmount } = render(<CreateEventFeatureIcon featureKey={featureKey} size="small" />);
            const svg = container.querySelector('svg');
            expect(svg?.getAttribute('aria-hidden')).toBe('true');
            expect(svg?.querySelector('linearGradient')).not.toBeNull();
            unmount();
        }
    });
});
```

- [ ] **Step 2: Run it to see it fail** — FAIL (module not found).

- [ ] **Step 3: Write the component**

```tsx
'use client';

import { useId } from 'react';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import type { CreateEventFeatureKey } from '@/lib/createEventFeatures';
import { cn } from '@/lib/utils';

// 36px for the big four, 26px for the small row, 30px for the plan card's tiles.
const SIZE_CLASS = { big: 'size-9', small: 'size-6.5', tile: 'size-7.5' } as const;

const MASK_ICONS: Partial<Record<CreateEventFeatureKey, string>> = {
    gallery: '/landing/wedding/icons/gallery.webp',
    wishbook: '/landing/wedding/icons/wishbook.webp',
    rsvp: '/landing/wedding/icons/rsvp.webp',
    stories: '/landing/wedding/icons/stories.webp',
    playlist: '/landing/wedding/icons/playlist.webp',
    schedule: '/landing/wedding/icons/schedule.webp',
    posts: '/landing/wedding/icons/posts.webp',
};

// The mockup's line icons for the features the landing has no icon for.
const LINE_ICONS: Partial<Record<CreateEventFeatureKey, React.ReactNode>> = {
    qr_cards: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </>
    ),
    co_hosts: (
        <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17" cy="9" r="2.6" />
            <path d="M16 14.2c2.9.4 5 2.8 5 5.8" />
        </>
    ),
    theme: (
        <>
            <path d="M12 3a9 9 0 1 0 0 18c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" />
            <circle cx="7.5" cy="11.5" r="1" />
            <circle cx="10" cy="7.5" r="1" />
            <circle cx="15" cy="7.5" r="1" />
        </>
    ),
    he_or_she: (
        <>
            <ellipse cx="8" cy="8" rx="4.5" ry="5.5" />
            <path d="M8 13.5c0 2.5-1.5 3.5-1.5 7.5" />
            <ellipse cx="16.5" cy="7" rx="4" ry="5" />
            <path d="M16.5 12c0 2.5 1.2 4 1.2 9" />
        </>
    ),
};

// A feature's icon in the brand gradient. Decorative: its name is always written next to it.
export function CreateEventFeatureIcon({ featureKey, size }: { featureKey: CreateEventFeatureKey; size: keyof typeof SIZE_CLASS }) {
    const gradientId = useId();
    const mask = MASK_ICONS[featureKey];
    if (mask) return <GradientIcon src={mask} className={SIZE_CLASS[size]} />;

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('shrink-0', SIZE_CLASS[size])}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f89ab0" />
                    <stop offset="0.34" stopColor="#f6a18f" />
                    <stop offset="0.68" stopColor="#f4b37b" />
                    <stop offset="1" stopColor="#f3cf8a" />
                </linearGradient>
            </defs>
            {LINE_ICONS[featureKey]}
        </svg>
    );
}
```

`GradientIcon` already sets `aria-hidden` and the `--icon` custom property. If tsc rejects `size-6.5`/`size-7.5`, use `size-[26px]`/`size-[30px]`.

- [ ] **Step 4: Run the test** — PASS.

- [ ] **Step 5: Commit**

```bash
git add components/event/create/wizard/CreateEventFeatureIcon.tsx components/event/create/wizard/CreateEventFeatureIcon.test.tsx
git commit -m "KAN-197: gradient icons for the wizard's features

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The type step

**Files:**
- Modify: `components/event/create/wizard/CreateEventWizardProgress.tsx`
- Create: `hooks/useCreateEventWizardTypeStep.ts`, `components/event/create/wizard/type/TypeStep.tsx`, `TypePhoto.tsx`, `TypeChips.tsx`, `TypeFeatures.tsx`
- Test: `components/event/create/wizard/type/TypeStep.test.tsx`

- [ ] **Step 1: A progress row that sits on the photo**

In `CreateEventWizardProgress.tsx`, add a `tone` prop (default `'default'`) and switch the bar, fill and counter classes:

```tsx
const TONES = {
    default: { track: 'bg-[#f3e7dc]', fill: 'bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)]', counter: 'text-ink' },
    onPhoto: { track: 'bg-white/40', fill: 'bg-white', counter: 'text-white' },
} as const;

export function CreateEventWizardProgress({ leading, tone = 'default' }: { leading: ReactNode; tone?: keyof typeof TONES }) {
```

and use `TONES[tone].track` on the bar's track div (replacing `bg-[#f3e7dc]`), `TONES[tone].fill` on the inner div (replacing the gradient class), `TONES[tone].counter` on the counter span (replacing `text-ink`).

- [ ] **Step 2: Write the failing component test**

`components/event/create/wizard/type/TypeStep.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypeStep } from '@/components/event/create/wizard/type/TypeStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const config = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: config.current }) }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({
    useLocalizedAppEventTypeCopy: () => (key: string) => ({ name: key === 'WEDDING' ? 'Wedding' : 'Baptism', tagline: '' }),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `name:${key}` }) }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const TYPES = [
    { id: 'w', eventTypeKey: 'WEDDING', imageUrl: null, sortOrder: 1 },
    { id: 'b', eventTypeKey: 'BAPTISM', imageUrl: null, sortOrder: 2 },
];
const MODULES = ['gallery', 'qr_cards', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'co_hosts'].map((moduleKey, sortOrder) => ({
    moduleKey,
    isEnabled: true,
    sortOrder,
}));

function setup(selected = 'WEDDING', planModules = MODULES.map((m) => m.moduleKey)) {
    const onSelectEventType = vi.fn();
    form.current = { eventTypes: TYPES, selectedEventType: selected, onSelectEventType };
    config.current = {
        modules: MODULES,
        planTiers: [{ code: 'P', scope: 'EVENT', isPublic: true, isAssignable: true, eventTypeKey: selected, moduleKeys: planModules, paidModules: [] }],
    };
    render(<TypeStep progress={<span>progress</span>} />);
    return { onSelectEventType };
}

afterEach(cleanup);

describe('TypeStep', () => {
    it('shows the picked type photo, the heading and the types as radios', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.type.heading');
        const radios = screen.getAllByRole('radio');
        expect(radios.map((radio) => radio.textContent)).toEqual(['Wedding', 'Baptism']);
        expect(radios[0]).toHaveAttribute('aria-checked', 'true');
        expect(screen.getAllByAltText('Wedding')[0]).toHaveAttribute('src', '/landing/03-wedding-ceremony-santorini.webp');
    });

    it('moves the pick with the arrow keys', () => {
        const { onSelectEventType } = setup();
        fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
        expect(onSelectEventType).toHaveBeenCalledWith('BAPTISM');
    });

    it('lists the big four with their lines and the small row by name', () => {
        setup();
        expect(screen.getByText('name:gallery')).toBeInTheDocument();
        expect(screen.getByText('Modules.gallery.description')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.wizard.features.lines.qr_cards')).toBeInTheDocument();
        expect(screen.getByText('name:co_hosts')).toBeInTheDocument();
        expect(screen.queryByText('CreateEventPage.wizard.features.planNote')).toBeNull();
    });

    it('shows the plan note when a feature is not in every plan', () => {
        form.current = { eventTypes: TYPES, selectedEventType: 'WEDDING', onSelectEventType: vi.fn() };
        config.current = {
            modules: MODULES,
            planTiers: [
                { code: 'A', scope: 'EVENT', isPublic: true, isAssignable: true, eventTypeKey: 'WEDDING', moduleKeys: ['gallery'], paidModules: [] },
                { code: 'B', scope: 'EVENT', isPublic: true, isAssignable: true, eventTypeKey: 'WEDDING', moduleKeys: MODULES.map((m) => m.moduleKey), paidModules: [] },
            ],
        };
        render(<TypeStep progress={null} />);
        expect(screen.getByText('CreateEventPage.wizard.features.planNote')).toBeInTheDocument();
    });
});
```

(`publicAssignablePlans` reads `scope`, `isPublic`, `isAssignable`; check `scopedPlans` in `lib/planTiers.ts` reads only those and add any field it also needs to the test plans.)

- [ ] **Step 3: Run it to see it fail** — FAIL (module not found).

- [ ] **Step 4: The hook**

`hooks/useCreateEventWizardTypeStep.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import type { EventTypeConvention } from '@/lib/api/types';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { type CreateEventFeatureKey, createEventFeatures, featureLineSource } from '@/lib/createEventFeatures';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export type TypeChip = { key: EventTypeConvention; name: string; photoSrc: string; selected: boolean };
export type BigFeature = { key: CreateEventFeatureKey; name: string; line: string };
export type SmallFeature = { key: CreateEventFeatureKey; name: string };

// The type step as plain values: the picked type's photo, the chips, and what the type includes.
export function useCreateEventWizardTypeStep() {
    const t = useTranslations('CreateEventPage.wizard');
    const tModules = useTranslations('Modules');
    const { data: appConfig } = useAppConfig();
    const { eventTypes, selectedEventType, onSelectEventType } = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const moduleCopy = useModuleCopy(selectedEventType);

    const chips: TypeChip[] = useMemo(
        () =>
            eventTypes.map((type) => ({
                key: type.eventTypeKey,
                name: typeCopy(type.eventTypeKey).name,
                photoSrc: createEventTypePhoto(type.eventTypeKey, type.imageUrl),
                selected: type.eventTypeKey === selectedEventType,
            })),
        [eventTypes, selectedEventType, typeCopy],
    );
    const picked = chips.find((chip) => chip.selected) ?? chips[0];

    const features = useMemo(() => {
        const { big, small, showPlanNote } = createEventFeatures(appConfig, selectedEventType);
        const line = (key: CreateEventFeatureKey) => (featureLineSource(key) === 'wizard' ? t(`features.lines.${key}`) : tModules(`${key}.description`));
        return {
            big: big.map((key): BigFeature => ({ key, name: moduleCopy(key).name, line: line(key) })),
            small: small.map((key): SmallFeature => ({ key, name: moduleCopy(key).name })),
            showPlanNote,
        };
    }, [appConfig, moduleCopy, selectedEventType, t, tModules]);

    const onKeyDown = useRadioGroupKeys(
        chips.map((chip) => chip.key),
        selectedEventType,
        (key) => onSelectEventType(key as EventTypeConvention),
    );

    return { chips, picked, features, onSelect: onSelectEventType, onKeyDown };
}
```

- [ ] **Step 5: The components**

`components/event/create/wizard/type/TypePhoto.tsx`:

```tsx
import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';

// The picked type's photo, 230px with rounded bottom corners. The wizard's top row (close, bar,
// counter) sits on it, over a soft dark fade so it stays readable. It scrolls away with the step.
export function TypePhoto({ src, alt, progress }: { src: string; alt: string; progress: ReactNode }) {
    return (
        <div className="relative h-57.5 shrink-0 overflow-hidden rounded-b-[34px]">
            <ProtectedImage src={src} alt={alt} fill priority sizes="(min-width: 768px) 440px, 100vw" className="object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-[rgba(20,14,10,0.35)] to-transparent to-40%" />
            <div className="absolute inset-x-4 top-3">{progress}</div>
        </div>
    );
}
```

`components/event/create/wizard/type/TypeChips.tsx`:

```tsx
import type { KeyboardEvent, MouseEvent } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { TypeChip } from '@/hooks/useCreateEventWizardTypeStep';
import type { EventTypeConvention } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Every enabled type as a photo chip, two per row; the picked one is dark.
export function TypeChips({
    chips,
    labelledBy,
    onSelect,
    onKeyDown,
}: {
    chips: TypeChip[];
    labelledBy: string;
    onSelect: (key: EventTypeConvention) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) onSelect(radioId as EventTypeConvention);
    }

    return (
        <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown} className="grid grid-cols-2 gap-2.5">
            {chips.map((chip) => (
                <button
                    key={chip.key}
                    type="button"
                    role="radio"
                    aria-checked={chip.selected}
                    tabIndex={chip.selected ? 0 : -1}
                    data-radio-id={chip.key}
                    onClick={handleClick}
                    className={cn(
                        'focus-ring flex h-13 items-center gap-2 rounded-full border-[1.5px] pr-2.5 pl-1.25 text-left text-[15px] transition-transform active:scale-[0.97] motion-reduce:active:scale-100',
                        chip.selected ? 'border-ink bg-ink font-bold text-white' : 'border-[#e4d3c0] bg-white font-semibold text-ink',
                    )}
                >
                    <span className="relative size-9.5 shrink-0 overflow-hidden rounded-full">
                        <ProtectedImage src={chip.photoSrc} alt={chip.name} fill sizes="38px" className="object-cover" />
                    </span>
                    <span className="truncate">{chip.name}</span>
                </button>
            ))}
        </div>
    );
}
```

Note: the chip's accessible name is the image alt plus the text, which reads the name twice. Give the image `alt={chip.name}` (required: every image has real alt text) and set `aria-label={chip.name}` on the button so the radio is named once. Update the test's `radios.map(...textContent)` expectation only if needed (textContent is still the visible name).

`components/event/create/wizard/type/TypeFeatures.tsx`:

```tsx
import { useTranslations } from 'next-intl';

import { CreateEventFeatureIcon } from '@/components/event/create/wizard/CreateEventFeatureIcon';
import type { BigFeature, SmallFeature } from '@/hooks/useCreateEventWizardTypeStep';

// What the picked type includes: four big features with a line each, a small row, and the plan note.
export function TypeFeatures({ big, small, showPlanNote }: { big: BigFeature[]; small: SmallFeature[]; showPlanNote: boolean }) {
    const t = useTranslations('CreateEventPage.wizard.features');
    if (big.length === 0) return null;

    return (
        <section className="flex flex-col gap-4">
            {/* Heading */}
            <h2 className="text-[15px] font-bold text-[#5a4e44]">{t('heading')}</h2>

            {/* Big four */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5">
                {big.map((feature) => (
                    <li key={feature.key} className="flex flex-col gap-1.5">
                        <CreateEventFeatureIcon featureKey={feature.key} size="big" />
                        <span className="text-[15px] leading-tight font-bold text-ink">{feature.name}</span>
                        <span className="text-[13px] leading-snug text-[#6f6257]">{feature.line}</span>
                    </li>
                ))}
            </ul>

            {/* Small row */}
            {small.length > 0 && (
                <ul className="grid grid-flow-col auto-cols-fr gap-1.5 rounded-[20px] bg-[#fff6f2] px-1.5 py-3.5">
                    {small.map((feature) => (
                        <li key={feature.key} className="flex flex-col items-center gap-1.5 text-center">
                            <CreateEventFeatureIcon featureKey={feature.key} size="small" />
                            <span className="text-xs font-semibold text-[#3d342d]">{feature.name}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Plan note */}
            {showPlanNote && <p className="text-[13px] leading-snug text-[#6f6257]">{t('planNote')}</p>}
        </section>
    );
}
```

`components/event/create/wizard/type/TypeStep.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { TypeChips } from '@/components/event/create/wizard/type/TypeChips';
import { TypeFeatures } from '@/components/event/create/wizard/type/TypeFeatures';
import { TypePhoto } from '@/components/event/create/wizard/type/TypePhoto';
import { useCreateEventWizardTypeStep } from '@/hooks/useCreateEventWizardTypeStep';

// Step 1: a big photo of the picked type, "What are we celebrating?", the types as photo chips, then
// what the type includes. `progress` is the wizard's top row, drawn on the photo.
export function TypeStep({ progress }: { progress: ReactNode }) {
    const t = useTranslations('CreateEventPage.wizard.type');
    const { chips, picked, features, onSelect, onKeyDown } = useCreateEventWizardTypeStep();

    return (
        <div className="flex flex-col pb-6">
            {/* Photo */}
            {picked && <TypePhoto src={picked.photoSrc} alt={picked.name} progress={progress} />}

            {/* Types */}
            <div className="flex flex-col gap-3.5 px-5 pt-5">
                <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-serif text-[21px] leading-tight tracking-[-0.01em] text-ink">
                    {t('heading')}
                </h1>
                <TypeChips chips={chips} labelledBy={CREATE_EVENT_WIZARD_HEADING_ID} onSelect={onSelect} onKeyDown={onKeyDown} />
            </div>

            {/* Features */}
            <div className="px-5 pt-7.5">
                <TypeFeatures {...features} />
            </div>
        </div>
    );
}
```

`CREATE_EVENT_WIZARD_HEADING_ID` is exported today from `CreateEventWizard.tsx`, which will import `TypeStep` in Task 11. To avoid a circular import, move the constant to `components/event/create/wizard/createEventWizardIds.ts` (`export const CREATE_EVENT_WIZARD_HEADING_ID = 'create-event-wizard-heading';`) and import it from there in `CreateEventWizard.tsx`, `CreateEventDialog.tsx` and the new steps. Check the serif utility the app uses for headings (`grep -rn "font-serif\|font-display" components | head`) and use that class.

- [ ] **Step 6: Run the test, types and lint**

Run: `npx vitest run components/event/create/wizard/type && npx tsc --noEmit && npx eslint components/event/create/wizard hooks/useCreateEventWizardTypeStep.ts`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add components/event/create/wizard/CreateEventWizardProgress.tsx components/event/create/wizard/createEventWizardIds.ts components/event/create/wizard/CreateEventWizard.tsx components/event/create/wizard/CreateEventDialog.tsx components/event/create/wizard/type hooks/useCreateEventWizardTypeStep.ts
git commit -m "KAN-197: the wizard's type step: photo, photo chips and what's included

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Guest chips, highlight tiles and compare lines

**Files:**
- Create: `lib/createEventPlanChoice.ts`
- Test: `lib/createEventPlanChoice.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { compareLine, guestChips, planHighlights } from '@/lib/createEventPlanChoice';

function plan(code: string, sortOrder: number, maxMembers: number | null, moduleKeys: string[]) {
    return { code, name: code, sortOrder, maxMembers, moduleKeys } as unknown as PlanTierResponseDto;
}

const START = plan('START', 1, 150, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule']);
const STORY = plan('STORY', 2, 300, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook', 'member_roles']);
const SIGNATURE = plan('SIGNATURE', 3, 2500, STORY.moduleKeys);

describe('guestChips', () => {
    it('gives "up to" for every plan but the largest, which gets "more than" the one before', () => {
        expect(guestChips([STORY, SIGNATURE, START])).toEqual([
            { planCode: 'START', kind: 'upTo', count: 150 },
            { planCode: 'STORY', kind: 'upTo', count: 300 },
            { planCode: 'SIGNATURE', kind: 'moreThan', count: 300 },
        ]);
    });

    it('skips a plan with no guest limit, and the largest when the one before has none', () => {
        const open = plan('OPEN', 2, null, []);
        expect(guestChips([START, open])).toEqual([{ planCode: 'START', kind: 'upTo', count: 150 }]);
    });

    it('gives no chips for a single plan', () => {
        expect(guestChips([START])).toEqual([]);
    });
});

describe('planHighlights', () => {
    it('shows up to three modules the plan adds over the previous one, in the type order', () => {
        expect(planHighlights(STORY, START, 'WEDDING')).toEqual(['wishbook', 'rsvp', 'stories']);
    });

    it('shows the first plan its own top three', () => {
        expect(planHighlights(START, undefined, 'WEDDING')).toEqual(['gallery', 'qr_cards', 'playlist']);
    });

    it('is empty when nothing is added', () => {
        expect(planHighlights(SIGNATURE, STORY, 'WEDDING')).toEqual([]);
    });
});

describe('compareLine', () => {
    it('lists the first plan features, with "and more" past three', () => {
        expect(compareLine(START, undefined, 'WEDDING')).toEqual({ kind: 'own', keys: ['gallery', 'qr_cards', 'playlist'], more: true });
    });

    it('says what a later plan adds, or that it adds nothing', () => {
        expect(compareLine(STORY, START, 'WEDDING')).toEqual({ kind: 'plus', previousName: 'START', keys: ['wishbook', 'rsvp', 'stories'] });
        expect(compareLine(SIGNATURE, STORY, 'WEDDING')).toEqual({ kind: 'same', previousName: 'STORY' });
    });
});
```

- [ ] **Step 2: Run it to see it fail** — FAIL (module not found).

- [ ] **Step 3: Write `lib/createEventPlanChoice.ts`**

```ts
import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { CREATE_EVENT_FEATURE_KEYS, type CreateEventFeatureKey, featurePriority, isCreateEventFeatureKey } from '@/lib/createEventFeatures';
import { bySortOrder } from '@/lib/sortOrder';

const HIGHLIGHT_COUNT = 3;

export type GuestChip = { planCode: string; kind: 'upTo' | 'moreThan'; count: number };

// One chip per full plan, in sortOrder (spec 5.3): "Up to {maxMembers}", the largest "More than
// {previous maxMembers}". A plan with no guest limit gets none; one plan alone needs no chips.
export function guestChips(fullPlans: PlanTierResponseDto[]): GuestChip[] {
    const sorted = [...fullPlans].sort(bySortOrder);
    if (sorted.length < 2) return [];

    return sorted.flatMap((plan, index): GuestChip[] => {
        if (index === sorted.length - 1) {
            const previousMax = sorted[index - 1].maxMembers;
            return previousMax === null ? [] : [{ planCode: plan.code, kind: 'moreThan', count: previousMax }];
        }
        return plan.maxMembers === null ? [] : [{ planCode: plan.code, kind: 'upTo', count: plan.maxMembers }];
    });
}

// A plan's feature modules in the type's order, then any others the wizard has icons for.
function orderedFeatures(moduleKeys: string[], eventType: EventTypeConvention): CreateEventFeatureKey[] {
    const order = [...featurePriority(eventType), ...CREATE_EVENT_FEATURE_KEYS.filter((key) => !featurePriority(eventType).includes(key))];
    return order.filter((key) => moduleKeys.includes(key) && isCreateEventFeatureKey(key));
}

function addedFeatures(plan: PlanTierResponseDto, previous: PlanTierResponseDto | undefined, eventType: EventTypeConvention): CreateEventFeatureKey[] {
    const own = orderedFeatures(plan.moduleKeys, eventType);
    return previous ? own.filter((key) => !previous.moduleKeys.includes(key)) : own;
}

// The plan card's tiles: up to three modules this plan adds over the previous one, or the first
// plan's own top three.
export function planHighlights(plan: PlanTierResponseDto, previous: PlanTierResponseDto | undefined, eventType: EventTypeConvention): CreateEventFeatureKey[] {
    return addedFeatures(plan, previous, eventType).slice(0, HIGHLIGHT_COUNT);
}

export type CompareLine =
    | { kind: 'own'; keys: CreateEventFeatureKey[]; more: boolean }
    | { kind: 'plus'; previousName: string; keys: CreateEventFeatureKey[] }
    | { kind: 'same'; previousName: string };

// A compare-sheet row's feature line (copy rows 37–39).
export function compareLine(plan: PlanTierResponseDto, previous: PlanTierResponseDto | undefined, eventType: EventTypeConvention): CompareLine {
    const added = addedFeatures(plan, previous, eventType);
    if (!previous) return { kind: 'own', keys: added.slice(0, HIGHLIGHT_COUNT), more: added.length > HIGHLIGHT_COUNT };
    if (added.length === 0) return { kind: 'same', previousName: previous.name };
    return { kind: 'plus', previousName: previous.name, keys: added.slice(0, HIGHLIGHT_COUNT) };
}
```

Check `bySortOrder` in `lib/sortOrder.ts` sorts ascending by `sortOrder`; adjust the call if its signature differs.

- [ ] **Step 4: Run the test** — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/createEventPlanChoice.ts lib/createEventPlanChoice.test.ts
git commit -m "KAN-197: guest chips, plan highlights and compare lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: A segmented duration picker

**Files:**
- Modify: `components/plan/DurationPicker.tsx`
- Test: `components/plan/DurationPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/plan/DurationPicker.test.tsx` (inside its top `describe`, reusing its existing mocks and option fixtures; adapt names to that file):

```tsx
    it('spells the months out and fills the width in the segmented variant', () => {
        render(<DurationPicker variant="segmented" options={[{ id: 'a', months: 6 }, { id: 'b', months: 12 }]} value="a" onChangeAction={vi.fn()} />);
        const group = screen.getByRole('radiogroup');
        expect(group.className).toContain('w-full');
        expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['months:6', 'months:12']);
    });
```

(Match the test file's `useTranslations` mock: if it renders keys as `months`, assert those strings instead.)

- [ ] **Step 2: Run it to see it fail** — FAIL (unknown variant).

- [ ] **Step 3: Add the variant**

In `VARIANT_CLASSES` add:

```ts
    // The wizard's plan card: a full-width segmented control with the months spelled out.
    segmented: {
        group: 'flex w-full gap-1.5 rounded-[22px] bg-[#f6f1ec] p-1',
        option: 'h-10 flex-1 rounded-[18px] text-sm',
        selected: 'bg-white font-bold text-ink shadow-[0_1px_3px_rgba(36,31,26,0.14)]',
        idle: 'font-semibold text-[#5a4e44] hover:text-ink',
        text: 'text-[#6f6257]',
    },
```

and in `OPTION_TEXT_KEY` add `segmented: 'months'`. The component spreads `inline-flex` before `classes.group`; `flex` in the group class wins as it comes later in `cn`.

- [ ] **Step 4: Run the test** — PASS (`npx vitest run components/plan/DurationPicker.test.tsx`).

- [ ] **Step 5: Commit**

```bash
git add components/plan/DurationPicker.tsx components/plan/DurationPicker.test.tsx
git commit -m "KAN-197: a segmented duration picker for the wizard's plan card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The plan step

**Files:**
- Create: `hooks/useCreateEventWizardPlanStep.ts`, `components/event/create/wizard/plan/PlanStep.tsx`, `PlanGuestChips.tsx`, `PlanCard.tsx`, `PlanHighlights.tsx`
- Test: `components/event/create/wizard/plan/PlanStep.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlanStep } from '@/components/event/create/wizard/plan/PlanStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => `${ns}.${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `name:${key}` }) }));
vi.mock('@/components/event/create/wizard/plan/PlansSheet', () => ({ PlansSheet: () => null }));
vi.mock('@/hooks/useCreateEventPlansSheet', () => ({ useCreateEventPlansSheet: () => ({ open: vi.fn() }) }));

function option(code: string, months = 6, price = '€99') {
    return { id: `${code}-${months}`, months, price, listPrice: null };
}
function entry(code: string, sortOrder: number, maxMembers: number | null, moduleKeys: string[]) {
    return {
        config: { code, name: code, sortOrder, maxMembers, moduleKeys },
        featured: false,
        presentation: { code, name: code, audience: `Up to ${maxMembers} guests`, storage: '25 GB', durations: [option(code), option(code, 12, '€119')], defaultDurationId: `${code}-6` },
    };
}
const marketing = vi.hoisted(() => ({ current: { full: [] as unknown[], lite: [] as unknown[] } }));
vi.mock('@/hooks/useMarketingPlanOptions', () => ({ useMarketingPlanOptions: () => marketing.current }));

function setup(selectedCode = 'STORY') {
    const onSelectPlan = vi.fn();
    const onSelectPlanDuration = vi.fn();
    marketing.current = {
        full: [entry('START', 1, 150, ['gallery', 'posts']), entry('STORY', 2, 300, ['gallery', 'posts', 'stories', 'rsvp']), entry('SIGNATURE', 3, 2500, ['gallery', 'posts', 'stories', 'rsvp'])],
        lite: [],
    };
    form.current = {
        eventPlans: [],
        modules: [],
        media: {},
        selectedCode,
        durationPicks: {},
        onSelectPlan,
        onSelectPlanDuration,
        isPlansLoading: false,
        selectedEventType: 'WEDDING',
    };
    render(<PlanStep />);
    return { onSelectPlan, onSelectPlanDuration };
}

afterEach(cleanup);

describe('PlanStep', () => {
    it('asks the guest count with one chip per plan, the picked plan chip checked', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.plan.heading');
        const chips = screen.getAllByRole('radio', { name: /CreateEventPage.wizard.plan/ });
        expect(chips.map((chip) => chip.textContent)).toEqual([
            'CreateEventPage.wizard.plan.upTo{"count":150}',
            'CreateEventPage.wizard.plan.upTo{"count":300}',
            'CreateEventPage.wizard.plan.moreThan{"count":300}',
        ]);
        expect(chips[1]).toHaveAttribute('aria-checked', 'true');
    });

    it('picks the plan of the tapped chip', () => {
        const { onSelectPlan } = setup();
        fireEvent.click(screen.getAllByRole('radio', { name: /CreateEventPage.wizard.plan/ })[0]);
        expect(onSelectPlan).toHaveBeenCalledWith('START');
    });

    it('shows the suggested plan card with its badge, price and what it adds', () => {
        setup();
        expect(screen.getByText('CreateEventPage.wizard.plan.bestFit')).toBeInTheDocument();
        expect(screen.getByText('STORY')).toBeInTheDocument();
        expect(screen.getByText('€99')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.wizard.plan.everythingInPlus{"plan":"START"}')).toBeInTheDocument();
        expect(screen.getByText('name:rsvp')).toBeInTheDocument();
    });

    it('changes the duration on the card', () => {
        const { onSelectPlanDuration } = setup();
        fireEvent.click(screen.getByRole('radio', { name: 'Durations.months{"count":12}' }));
        expect(onSelectPlanDuration).toHaveBeenCalledWith('STORY', 'STORY-12');
    });
});
```

- [ ] **Step 2: Run it to see it fail** — FAIL (module not found).

- [ ] **Step 3: The hook**

`hooks/useCreateEventWizardPlanStep.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { type MarketingPlanOption, useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import { guestChips, planHighlights } from '@/lib/createEventPlanChoice';
import type { CreateEventFeatureKey } from '@/lib/createEventFeatures';
import { pickedLandingDuration } from '@/lib/landingPricing';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export type PlanChipView = { planCode: string; label: string; selected: boolean };
export type PlanCardView = {
    code: string;
    name: string;
    summary: string;
    price: string;
    listPrice: string | null;
    isFull: boolean;
    previousName: string | null;
    highlights: { key: CreateEventFeatureKey; name: string }[];
    durations: { id: string; months: number }[];
    durationId: string;
};

// The plan step as plain values: guest chips, the card of the selected plan, and its durations.
export function useCreateEventWizardPlanStep() {
    const t = useTranslations('CreateEventPage.wizard.plan');
    const form = useCreateEventForm();
    const { eventPlans, modules, media, selectedCode, durationPicks, onSelectPlan, onSelectPlanDuration, isPlansLoading, selectedEventType } = form;
    const { full, lite } = useMarketingPlanOptions({ plans: eventPlans, modules, media });
    const moduleCopy = useModuleCopy(selectedEventType);

    const chips: PlanChipView[] = useMemo(
        () =>
            guestChips(full.map((option) => option.config)).map((chip) => ({
                planCode: chip.planCode,
                label: t(chip.kind, { count: chip.count }),
                selected: chip.planCode === selectedCode,
            })),
        [full, selectedCode, t],
    );

    const card: PlanCardView | null = useMemo(() => {
        const fullIndex = full.findIndex((option) => option.config.code === selectedCode);
        const option: MarketingPlanOption | undefined = fullIndex >= 0 ? full[fullIndex] : lite.find((entry) => entry.config.code === selectedCode);
        if (!option) return null;
        const previous = fullIndex > 0 ? full[fullIndex - 1].config : undefined;
        const duration = pickedLandingDuration(option.presentation, durationPicks[option.config.code]);
        return {
            code: option.config.code,
            name: option.presentation.name,
            summary: `${option.presentation.audience} · ${option.presentation.storage}`,
            price: duration.price,
            listPrice: duration.listPrice,
            isFull: fullIndex >= 0,
            previousName: previous?.name ?? null,
            highlights: planHighlights(option.config, previous, selectedEventType).map((key) => ({ key, name: moduleCopy(key).name })),
            durations: option.presentation.durations.map(({ id, months }) => ({ id, months })),
            durationId: duration.id,
        };
    }, [durationPicks, full, lite, moduleCopy, selectedCode, selectedEventType]);

    const onChipKeyDown = useRadioGroupKeys(
        chips.map((chip) => chip.planCode),
        chips.some((chip) => chip.selected) ? selectedCode : null,
        onSelectPlan,
    );

    return {
        isLoading: isPlansLoading || !media,
        isEmpty: full.length === 0 && lite.length === 0,
        chips,
        card,
        onSelectPlan,
        onChipKeyDown,
        onDurationChange: (optionId: string) => card && onSelectPlanDuration(card.code, optionId),
    };
}
```

Check `pickedLandingDuration` returns `{ id, months, price, listPrice }` (it returns a `LandingPlanDuration`).

- [ ] **Step 4: The components**

`components/event/create/wizard/plan/PlanGuestChips.tsx`:

```tsx
import type { KeyboardEvent, MouseEvent } from 'react';

import type { PlanChipView } from '@/hooks/useCreateEventWizardPlanStep';
import { cn } from '@/lib/utils';

// "How many guests?": one chip per full plan; the picked plan's chip is dark.
export function PlanGuestChips({
    chips,
    labelledBy,
    onSelect,
    onKeyDown,
}: {
    chips: PlanChipView[];
    labelledBy: string;
    onSelect: (planCode: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
    if (chips.length === 0) return null;
    const tabStop = chips.find((chip) => chip.selected)?.planCode ?? chips[0].planCode;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) onSelect(radioId);
    }

    return (
        <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown} className="flex gap-2">
            {chips.map((chip) => (
                <button
                    key={chip.planCode}
                    type="button"
                    role="radio"
                    aria-checked={chip.selected}
                    tabIndex={chip.planCode === tabStop ? 0 : -1}
                    data-radio-id={chip.planCode}
                    onClick={handleClick}
                    className={cn(
                        'focus-ring h-13 flex-1 rounded-full text-[15px] transition-transform active:scale-[0.97] motion-reduce:active:scale-100',
                        chip.selected ? 'bg-ink font-bold text-white' : 'border-[1.5px] border-[#e4d3c0] bg-white font-semibold text-ink',
                    )}
                >
                    {chip.label}
                </button>
            ))}
        </div>
    );
}
```

`components/event/create/wizard/plan/PlanHighlights.tsx`:

```tsx
import { CreateEventFeatureIcon } from '@/components/event/create/wizard/CreateEventFeatureIcon';
import type { PlanCardView } from '@/hooks/useCreateEventWizardPlanStep';

// Up to three tiles for what the plan adds.
export function PlanHighlights({ highlights }: { highlights: PlanCardView['highlights'] }) {
    if (highlights.length === 0) return null;
    return (
        <ul className="grid grid-cols-3 gap-2.5">
            {highlights.map((highlight) => (
                <li key={highlight.key} className="flex flex-col items-center gap-2 rounded-[18px] bg-[#fff6f2] px-1.5 py-3 text-center">
                    <CreateEventFeatureIcon featureKey={highlight.key} size="tile" />
                    <span className="text-[13px] font-bold text-ink">{highlight.name}</span>
                </li>
            ))}
        </ul>
    );
}
```

`components/event/create/wizard/plan/PlanCard.tsx`:

```tsx
import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { PlanHighlights } from '@/components/event/create/wizard/plan/PlanHighlights';
import { DurationPicker } from '@/components/plan/DurationPicker';
import type { PlanCardView } from '@/hooks/useCreateEventWizardPlanStep';

// The selected plan: badge, name and price, what it adds, and how long it stays online.
export function PlanCard({ card, onDurationChange }: { card: PlanCardView; onDurationChange: (optionId: string) => void }) {
    const t = useTranslations('CreateEventPage.wizard.plan');
    const tPricing = useTranslations('LandingPage.pricing');
    const durationLabelId = useId();

    return (
        <div className="relative flex flex-col gap-4.5 rounded-[28px] bg-white px-5 pt-5.5 pb-5 shadow-[0_0_0_2px_#241f1a,0_16px_36px_rgba(36,31,26,0.10)]">
            {/* Badge */}
            {card.isFull && (
                <span className="absolute -top-3.25 left-5 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] px-3 py-1.25 text-xs font-extrabold text-ink">
                    {t('bestFit')}
                </span>
            )}

            {/* Name and price */}
            <div className="flex items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-[26px] font-extrabold tracking-[0.08em] text-ink">{card.name}</span>
                    <span className="text-sm text-[#6f6257]">{card.summary}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                    <span className="font-serif text-[44px] leading-none tracking-[-0.04em] text-[#c4472b]">{card.price}</span>
                    {card.listPrice && (
                        <s className="text-sm text-[#6f6257]">
                            <span className="sr-only">{tPricing('listPrice')} </span>
                            {card.listPrice}
                        </s>
                    )}
                </div>
            </div>

            {/* Highlights */}
            {card.highlights.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {card.previousName && <span className="text-[13px] font-semibold text-[#6f6257]">{t('everythingInPlus', { plan: card.previousName })}</span>}
                    <PlanHighlights highlights={card.highlights} />
                </div>
            )}

            {/* Duration */}
            <div className="flex flex-col gap-2">
                <span id={durationLabelId} className="text-[13px] font-semibold text-[#6f6257]">
                    {tPricing('durationLabel')}
                </span>
                <DurationPicker variant="segmented" options={card.durations} value={card.durationId} onChangeAction={onDurationChange} labelledBy={durationLabelId} />
            </div>
        </div>
    );
}
```

`components/event/create/wizard/plan/PlanStep.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { PlanCard } from '@/components/event/create/wizard/plan/PlanCard';
import { PlanGuestChips } from '@/components/event/create/wizard/plan/PlanGuestChips';
import { PlansSheet } from '@/components/event/create/wizard/plan/PlansSheet';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCreateEventPlansSheet } from '@/hooks/useCreateEventPlansSheet';
import { useCreateEventWizardPlanStep } from '@/hooks/useCreateEventWizardPlanStep';

// Step 2: how many guests, the plan that fits, and a way to see every plan.
export function PlanStep() {
    const t = useTranslations('CreateEventPage.wizard.plan');
    const tPage = useTranslations('CreateEventPage');
    const { isLoading, isEmpty, chips, card, onSelectPlan, onChipKeyDown, onDurationChange } = useCreateEventWizardPlanStep();
    const sheet = useCreateEventPlansSheet();

    return (
        <div className="flex flex-col gap-6.5 pt-2">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-serif text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {isLoading && <LoadingState label={tPage('loadingPlans')} className="rounded-xl bg-white p-6" />}
            {!isLoading && isEmpty && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{tPage('noPlans')}</p>}

            {!isLoading && !isEmpty && (
                <>
                    {/* Guests */}
                    <PlanGuestChips chips={chips} labelledBy={CREATE_EVENT_WIZARD_HEADING_ID} onSelect={onSelectPlan} onKeyDown={onChipKeyDown} />

                    {/* Plan */}
                    {card && <PlanCard card={card} onDurationChange={onDurationChange} />}

                    {/* Compare */}
                    <button type="button" onClick={sheet.open} className="focus-ring mx-auto h-11 px-4 text-[15px] font-bold text-ink underline underline-offset-[3px]">
                        {t('compare')}
                    </button>
                    <PlansSheet />
                </>
            )}
        </div>
    );
}
```

`PlansSheet` and `useCreateEventPlansSheet` come in Task 10; until then create both as minimal stubs so this task compiles: `export function PlansSheet() { return null; }` and `export function useCreateEventPlansSheet() { return { open: () => {} }; }`. Task 10 replaces them.

- [ ] **Step 5: Run the test, types and lint**

Run: `npx vitest run components/event/create/wizard/plan && npx tsc --noEmit && npx eslint components/event/create/wizard hooks/useCreateEventWizardPlanStep.ts`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add hooks/useCreateEventWizardPlanStep.ts hooks/useCreateEventPlansSheet.ts components/event/create/wizard/plan
git commit -m "KAN-197: the wizard's plan step: guest count and the plan that fits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Compare all plans

**Files:**
- Modify: `hooks/useCreateEventPlansSheet.ts`, `components/event/create/wizard/plan/PlansSheet.tsx` (replace the stubs)
- Test: `components/event/create/wizard/plan/PlansSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlansSheet } from '@/components/event/create/wizard/plan/PlansSheet';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const history = vi.hoisted(() => ({ leaveWizardEntry: vi.fn(), pushWizardEntry: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => params.current }));
vi.mock('next-intl', () => ({
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) => `${ns}.${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `name:${key}` }) }));
vi.mock('@/lib/createEventWizardHistory', () => history);
vi.mock('@/components/ui/modal', () => ({
    Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
}));

function entry(code: string, sortOrder: number, moduleKeys: string[]) {
    return {
        config: { code, name: code, sortOrder, maxMembers: 100 * sortOrder, moduleKeys },
        featured: false,
        presentation: { code, name: code, audience: `Up to ${100 * sortOrder} guests`, storage: '25 GB', durations: [{ id: `${code}-3`, months: 3, price: `€${sortOrder}9`, listPrice: null }], defaultDurationId: `${code}-3` },
    };
}
vi.mock('@/hooks/useMarketingPlanOptions', () => ({
    useMarketingPlanOptions: () => ({
        full: [entry('START', 1, ['gallery', 'qr_cards', 'playlist', 'schedule']), entry('STORY', 2, ['gallery', 'qr_cards', 'playlist', 'schedule', 'rsvp'])],
        lite: [entry('QR', 5, ['gallery'])],
    }),
}));

beforeEach(() => {
    params.current = new URLSearchParams('create=1&step=plan&sheet=plans');
    form.current = { eventPlans: [], modules: [], media: {}, selectedCode: 'START', durationPicks: {}, onSelectPlan: vi.fn(), selectedEventType: 'WEDDING' };
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PlansSheet', () => {
    it('stays shut without the sheet param', () => {
        params.current = new URLSearchParams('create=1&step=plan');
        render(<PlansSheet />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('lists the full plans with their lines and prices, then the lite ones', () => {
        render(<PlansSheet />);
        expect(screen.getByText('CreateEventPage.wizard.plans.andMore{"features":"name:gallery, name:qr_cards, name:playlist"}')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.wizard.plans.everythingInPlus{"plan":"START","features":"name:rsvp"}')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.typeStartingPrice{"price":"€19"}')).toBeInTheDocument();
        expect(screen.getByText('LandingPage.pricing.liteHeading')).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('picks the chosen row and closes', () => {
        render(<PlansSheet />);
        fireEvent.click(screen.getByRole('radio', { name: /STORY/ }));
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.wizard.plans.choose{"plan":"STORY"}' }));
        expect(form.current.onSelectPlan).toHaveBeenCalledWith('STORY');
        expect(history.leaveWizardEntry).toHaveBeenCalledWith('sheet', expect.not.stringContaining('sheet='));
    });
});
```

- [ ] **Step 2: Run it to see it fail** — FAIL (stubs render nothing).

- [ ] **Step 3: The hook**

Replace `hooks/useCreateEventPlansSheet.ts`:

```ts
'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type CompareLine, compareLine } from '@/lib/createEventPlanChoice';
import { leaveWizardEntry, pushWizardEntry } from '@/lib/createEventWizardHistory';
import { CREATE_EVENT_SHEET_PARAM, PLANS_SHEET, withWizardParams } from '@/lib/createEventWizardUrl';
import { pickedLandingDuration } from '@/lib/landingPricing';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// line: the feature line for a full plan, null for a lite one.
export type PlansSheetRow = { code: string; name: string; summary: string; line: string | null; price: string; months: number };

const FEATURE_SEPARATOR = ', ';

// The compare sheet: open while the URL has sheet=plans (its own history entry, so Back closes it),
// a pick that only counts once "Choose" is tapped, and its rows as plain values.
export function useCreateEventPlansSheet() {
    const t = useTranslations('CreateEventPage.wizard.plans');
    const tPage = useTranslations('CreateEventPage');
    const tPricing = useTranslations('LandingPage.pricing');
    const searchParams = useSearchParams();
    const { eventPlans, modules, media, selectedCode, durationPicks, onSelectPlan, selectedEventType } = useCreateEventForm();
    const { full, lite } = useMarketingPlanOptions({ plans: eventPlans, modules, media });
    const moduleCopy = useModuleCopy(selectedEventType);
    const isOpen = searchParams.get(CREATE_EVENT_SHEET_PARAM) === PLANS_SHEET;
    const [pending, setPending] = useState(selectedCode);

    // Each opening starts on the plan picked on the step.
    useEffect(() => {
        if (isOpen) setPending(selectedCode);
    }, [isOpen, selectedCode]);

    // Copy rows 37-39: "{features}", "{features} and more", "Everything in {plan}, plus {features}",
    // and the reused "Everything in {plan}".
    const lineText = useCallback(
        (line: CompareLine): string => {
            const names = (keys: string[]) => keys.map((key) => moduleCopy(key).name).join(FEATURE_SEPARATOR);
            if (line.kind === 'own') return line.more ? t('andMore', { features: names(line.keys) }) : names(line.keys);
            if (line.kind === 'plus') return t('everythingInPlus', { plan: line.previousName, features: names(line.keys) });
            return tPricing('everythingIn', { plan: line.previousName });
        },
        [moduleCopy, t, tPricing],
    );

    const fullRows: PlansSheetRow[] = useMemo(
        () =>
            full.map((option, index) => {
                const duration = pickedLandingDuration(option.presentation, option.presentation.defaultDurationId);
                return {
                    code: option.config.code,
                    name: option.presentation.name,
                    summary: `${option.presentation.audience} · ${option.presentation.storage}`,
                    line: lineText(compareLine(option.config, full[index - 1]?.config, selectedEventType)),
                    price: tPage('typeStartingPrice', { price: duration.price }),
                    months: duration.months,
                };
            }),
        [full, lineText, selectedEventType, tPage],
    );

    const liteRows: PlansSheetRow[] = useMemo(
        () =>
            lite.map((option) => {
                const duration = pickedLandingDuration(option.presentation, durationPicks[option.config.code]);
                return { code: option.config.code, name: option.presentation.name, summary: '', line: null, price: duration.price, months: duration.months };
            }),
        [durationPicks, lite],
    );

    const open = useCallback(() => {
        pushWizardEntry(withWizardParams(new URL(window.location.href), { [CREATE_EVENT_SHEET_PARAM]: PLANS_SHEET }), 'sheet');
    }, []);
    const close = useCallback(() => {
        leaveWizardEntry('sheet', withWizardParams(new URL(window.location.href), { [CREATE_EVENT_SHEET_PARAM]: null }));
    }, []);
    const choose = useCallback(() => {
        onSelectPlan(pending);
        close();
    }, [close, onSelectPlan, pending]);

    const pendingName = [...full, ...lite].find((option) => option.config.code === pending)?.presentation.name ?? '';
    return { isOpen, open, close, choose, pending, setPending, pendingName, fullRows, liteRows };
}
```

`withWizardParams` drops a param given `null`. The `{ open }` callers from Task 9 keep working.

- [ ] **Step 4: The sheet**

Replace `components/event/create/wizard/plan/PlansSheet.tsx`:

```tsx
'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useId } from 'react';

import { Modal } from '@/components/ui/modal';
import { type PlansSheetRow, useCreateEventPlansSheet } from '@/hooks/useCreateEventPlansSheet';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import { cn } from '@/lib/utils';

// "All plans": every full plan with what it adds and its starting price, then the lite ones.
// A bottom sheet on phones, the app's sheet card (narrowed to the wizard) on desktop.
export function PlansSheet() {
    const t = useTranslations('CreateEventPage.wizard');
    const tPricing = useTranslations('LandingPage.pricing');
    const tDurations = useTranslations('Durations');
    const titleId = useId();
    const sheet = useCreateEventPlansSheet();
    const codes = [...sheet.fullRows, ...sheet.liteRows].map((row) => row.code);
    const onKeyDown = useRadioGroupKeys(codes, sheet.pending, sheet.setPending);

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) sheet.setPending(radioId);
    }

    const row = (plan: PlansSheetRow, lite: boolean) => {
        const selected = plan.code === sheet.pending;
        return (
            <button
                key={plan.code}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-radio-id={plan.code}
                onClick={handleClick}
                className={cn(
                    'focus-ring flex items-center gap-3.5 text-left text-ink',
                    lite ? 'h-15 px-4' : 'rounded-[22px] p-4',
                    !lite && (selected ? 'border-2 border-ink' : 'border-[1.5px] border-[#ece3da]'),
                )}
            >
                {/* Radio */}
                <span
                    aria-hidden="true"
                    className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', selected ? 'bg-ink' : 'border-2 border-[#cdb9a4]')}
                >
                    {selected && <Check className="size-3.5 text-white" strokeWidth={3.2} />}
                </span>
                {/* Plan */}
                <span className="flex min-w-0 grow flex-col gap-0.75">
                    <span className={cn('font-extrabold', lite ? 'text-[15px]' : 'text-[17px] tracking-[0.06em]')}>{plan.name}</span>
                    {plan.summary && <span className="text-[13px] text-[#6f6257]">{plan.summary}</span>}
                    {plan.line && <span className="text-[13px] text-[#6f6257]">{plan.line}</span>}
                    {lite && <span className="text-xs text-[#6f6257]">{tDurations('months', { count: plan.months })}</span>}
                </span>
                {/* Price */}
                <span className={cn('shrink-0', lite ? 'text-[15px] font-bold' : 'font-serif text-[22px]')}>{plan.price}</span>
            </button>
        );
    };

    return (
        <Modal
            open={sheet.isOpen}
            onClose={sheet.close}
            variant="sheet"
            dismissOnBack={false}
            showCloseButton={false}
            labelledBy={titleId}
            className="bg-white sm:max-w-104"
        >
            <div className="flex max-h-full flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pt-3 pr-4 pl-5">
                    <h2 id={titleId} className="font-serif text-2xl text-ink">
                        {t('plans.title')}
                    </h2>
                    <button type="button" aria-label={t('close')} onClick={sheet.close} className="focus-ring flex size-11 items-center justify-center rounded-full bg-[#fbf1e6]">
                        <X className="size-4.5 text-ink" aria-hidden="true" />
                    </button>
                </div>

                {/* Plans */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-2" role="radiogroup" aria-labelledby={titleId} onKeyDown={onKeyDown}>
                    <div className="flex flex-col gap-2.5">{sheet.fullRows.map((plan) => row(plan, false))}</div>

                    {/* Lite plans */}
                    {sheet.liteRows.length > 0 && (
                        <div className="flex flex-col gap-2.5 pt-6">
                            <span className="text-[15px] font-bold text-ink">{tPricing('liteHeading')}</span>
                            <div className="flex flex-col divide-y divide-[#f0e7de] overflow-hidden rounded-[22px] border-[1.5px] border-[#ece3da]">
                                {sheet.liteRows.map((plan) => row(plan, true))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Choose */}
                <div className="px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={sheet.choose}
                        className="focus-ring h-14 w-full rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink"
                    >
                        {t('plans.choose', { plan: sheet.pendingName })}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
```

The radios' accessible name is their whole text, so the test's `{ name: /STORY/ }` finds the row.

- [ ] **Step 5: Run the tests, types and lint**

Run: `npx vitest run components/event/create/wizard/plan && npx tsc --noEmit && npx eslint components/event/create/wizard hooks/useCreateEventPlansSheet.ts`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add hooks/useCreateEventPlansSheet.ts components/event/create/wizard/plan/PlansSheet.tsx components/event/create/wizard/plan/PlansSheet.test.tsx
git commit -m "KAN-197: compare all plans, as a sheet Back closes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Wire the steps into the wizard

**Files:**
- Create: `components/event/create/wizard/CreateEventWizardBackButton.tsx`, `components/event/create/wizard/CreateEventWizardFooter.tsx`, `hooks/useCreateEventWizardFooter.ts`
- Modify: `components/event/create/wizard/CreateEventWizard.tsx`
- Test: `components/event/create/wizard/CreateEventWizardFooter.test.tsx`

- [ ] **Step 1: Write the failing footer test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateEventWizardFooter } from '@/components/event/create/wizard/CreateEventWizardFooter';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/components/event/create/EventCreateFooter', () => ({ EventCreateFooter: () => <footer>old footer</footer> }));

afterEach(cleanup);

describe('CreateEventWizardFooter', () => {
    it('names the type on the type step and moves to the plan', () => {
        const goToPlan = vi.fn();
        form.current = { step: 'type', selectedEventType: 'BAPTISM', canContinueType: true, goToPlan };
        render(<CreateEventWizardFooter />);
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.wizard.type.continue.baptism' }));
        expect(goToPlan).toHaveBeenCalled();
    });

    it('says "other" for a type without its own button', () => {
        form.current = { step: 'type', selectedEventType: 'BIRTHDAY', canContinueType: true, goToPlan: vi.fn() };
        render(<CreateEventWizardFooter />);
        expect(screen.getByRole('button')).toHaveTextContent('CreateEventPage.wizard.type.continue.other');
    });

    it('continues to details from the plan step, once a plan can be bought', () => {
        form.current = { step: 'plan', canContinuePlan: false, goToDetails: vi.fn() };
        render(<CreateEventWizardFooter />);
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.continue' })).toBeDisabled();
    });

    it('keeps the old footer on later steps until part 3', () => {
        form.current = { step: 'details' };
        render(<CreateEventWizardFooter />);
        expect(screen.getByText('old footer')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to see it fail** — FAIL (module not found).

- [ ] **Step 3: The footer and its hook**

`hooks/useCreateEventWizardFooter.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';

import type { EventTypeConvention } from '@/lib/api/types';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Copy rows 17–21: the type step's button names the type; any other type gets "your event".
const TYPE_CONTINUE_KEY: Partial<Record<EventTypeConvention, string>> = {
    WEDDING: 'wedding',
    BAPTISM: 'baptism',
    GENDER_REVEAL: 'reveal',
    REUNION: 'reunion',
};

// The wizard's one full-width button on the type and plan steps; null on later steps (old footer).
export function useCreateEventWizardFooter(): { label: string; disabled: boolean; onClick: () => void } | null {
    const t = useTranslations('CreateEventPage.wizard');
    const form = useCreateEventForm();

    if (form.step === 'type') {
        const key = TYPE_CONTINUE_KEY[form.selectedEventType] ?? 'other';
        return { label: t(`type.continue.${key}`), disabled: !form.canContinueType, onClick: form.goToPlan };
    }
    if (form.step === 'plan') {
        return { label: t('plan.continue'), disabled: !form.canContinuePlan, onClick: form.goToDetails };
    }
    return null;
}
```

`components/event/create/wizard/CreateEventWizardFooter.tsx`:

```tsx
'use client';

import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { useCreateEventWizardFooter } from '@/hooks/useCreateEventWizardFooter';

// Type and plan: one full-width gradient button with an ink label (6.3:1 and up; white fails).
// Details, theme and overview keep today's footer until part 3.
export function CreateEventWizardFooter() {
    const action = useCreateEventWizardFooter();
    if (!action) return <EventCreateFooter />;

    return (
        <footer className="shrink-0 bg-linear-to-b from-white/0 to-white to-30% px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            <button
                type="button"
                disabled={action.disabled}
                onClick={action.onClick}
                className="focus-ring h-14 w-full rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
            >
                {action.label}
            </button>
        </footer>
    );
}
```

- [ ] **Step 4: The Back button**

`components/event/create/wizard/CreateEventWizardBackButton.tsx`:

```tsx
'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Top-left from the plan step on: back one step (one history entry when the wizard pushed it).
export function CreateEventWizardBackButton() {
    const t = useTranslations('CreateEventPage.actions');
    const { goBack } = useCreateEventForm();
    return (
        <button type="button" aria-label={t('back')} onClick={goBack} className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1e6] text-ink">
            <ArrowLeft className="size-4.5" aria-hidden="true" />
        </button>
    );
}
```

- [ ] **Step 5: The wizard body**

Replace the body of `CreateEventWizard.tsx` (keep its props; import the heading id from `createEventWizardIds.ts`):

```tsx
export function CreateEventWizard({ leading }: { leading: ReactNode }) {
    const t = useTranslations('CreateEventPage');
    const { step, formId, handleSubmit } = useCreateEventForm();
    const scrollRef = useRef<HTMLDivElement>(null);
    useScrollTopOnChange(scrollRef, step);
    const isType = step === 'type';

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            {/* Progress (on the photo on the type step, so it scrolls away with it there) */}
            {!isType && (
                <div className="shrink-0 px-4 pt-3 pb-3">
                    <CreateEventWizardProgress leading={<CreateEventWizardBackButton />} />
                </div>
            )}

            {/* Step */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                {isType && <TypeStep progress={<CreateEventWizardProgress leading={leading} tone="onPhoto" />} />}
                {step === 'plan' && (
                    <div className="px-5 pb-6">
                        <PlanStep />
                    </div>
                )}
                {!isType && step !== 'plan' && (
                    <form id={formId} onSubmit={handleSubmit} className="px-5 pb-6">
                        {/* Earlier picks */}
                        <EventCreateSelectionSummary />

                        {/* Heading */}
                        <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="mb-5 text-lg font-bold text-ink">
                            {step === 'details' && t('subtitle')}
                            {step === 'theme' && t('steps.themeSubtitle')}
                            {step === 'overview' && t('steps.overviewSubtitle')}
                        </h1>

                        {step === 'details' && <EventDetailsStep />}
                        {step === 'theme' && <EventThemeStep />}
                        {step === 'overview' && <EventOverviewStep />}
                    </form>
                )}
            </div>

            {/* Footer */}
            <CreateEventWizardFooter />
        </div>
    );
}
```

The close button passed as `leading` by the pop-up sits on the photo now: in `CreateEventDialog.tsx`, give it a white circle so it reads on a photo: `className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/90 text-ink"`. The page shell's `BackButton` (leading on the page) works on the photo as it is; if it doesn't read, wrap it the same way.

Remove the now unused imports (`EventTypeStep`, `EventPlanSelector`, `EventCreateFooter`). `EventDetailsStep` keeps its form: the details footer submits with `form={formId}`, which still exists on those steps.

- [ ] **Step 6: Run everything touched**

Run: `npx vitest run components/event/create hooks i18n && npx tsc --noEmit && npx eslint .`
Expected: PASS, clean. `i18n/createWizardMessages.test.ts` walks the pop-up's imports: every namespace used (`CreateEventPage...`, `Modules`, `LandingPage.pricing`, `Durations`) is already listed.

- [ ] **Step 7: Commit**

```bash
git add components/event/create/wizard/CreateEventWizard.tsx components/event/create/wizard/CreateEventDialog.tsx components/event/create/wizard/CreateEventWizardBackButton.tsx components/event/create/wizard/CreateEventWizardFooter.tsx components/event/create/wizard/CreateEventWizardFooter.test.tsx hooks/useCreateEventWizardFooter.ts
git commit -m "KAN-197: the wizard shows the new type and plan steps, with Back on top and one button below

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Stories

**Files:**
- Modify: `.storybook/fixtures.ts`, `components/event/create/wizard/CreateEventWizard.stories.tsx`, `components/event/create/wizard/CreateEventDialog.stories.tsx`

- [ ] **Step 1: Give the wizard fixture real modules and plans**

In `.storybook/fixtures.ts`, add above `storyWizardAppConfig`:

```ts
const WIZARD_MODULE_KEYS = ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook', 'co_hosts', 'theme', 'he_or_she'];

function storyWizardPlan(code: string, sortOrder: number, maxMembers: number, storageGb: number, moduleKeys: string[], prices: [number, number][]) {
    return {
        id: `plan-${code}`,
        code,
        scope: 'EVENT',
        name: code,
        description: null,
        sortOrder,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: false,
        storageBytes: storageGb * 1024 ** 3,
        maxMembers,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys,
        paidModules: [],
        moduleConfigs: {},
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: prices.map(([months, amount], index) => ({
            id: `${code}-${months}`,
            kind: 'INITIAL',
            months,
            priceAmountMinor: amount,
            promoPriceAmountMinor: null,
            sortOrder: index,
            active: true,
        })),
        extensionOptions: [],
    } as unknown as PlanTierResponseDto;
}

// Wedding plans shaped like staging's: three full plans and one lite plan.
export const storyWizardPlans: PlanTierResponseDto[] = [
    storyWizardPlan('START', 1, 150, 15, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule'], [[6, 7900], [12, 9900]]),
    storyWizardPlan('STORY', 2, 300, 25, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook'], [[6, 9900], [9, 10900], [12, 11900]]),
    storyWizardPlan('SIGNATURE', 3, 2500, 50, ['posts', 'gallery', 'qr_cards', 'playlist', 'schedule', 'stories', 'rsvp', 'wishbook', 'co_hosts'], [[6, 17900], [12, 19900]]),
    storyWizardPlan('QR', 4, 300, 10, ['gallery'], [[3, 4900]]),
];
```

and in `storyWizardAppConfig` add:

```ts
    modules: WIZARD_MODULE_KEYS.map((moduleKey, sortOrder) => ({ id: `module-${moduleKey}`, moduleKey, name: moduleKey, description: null, isEnabled: true, sortOrder })),
    planTiers: storyWizardPlans,
```

Import `PlanTierResponseDto` in the fixtures file if it isn't already. Check `media` in `storyAppConfig` has what `mediaEstimate` needs (add estimate fields from `AppMediaConfigDto` if the card's storage line reads "unlimited").

- [ ] **Step 2: Stories for every screen**

In `CreateEventWizard.stories.tsx`, make the MSW stub return the plans and add stories:

```tsx
import { storyWizardAppConfig, storyWizardPlans } from '@/.storybook/fixtures';
// ...
    beforeEach({ msw }) {
        msw.use(http.get(PLANS_URL, () => HttpResponse.json(storyWizardPlans)));
    },
// ...
export const TypeStep: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'type' } } } },
};

export const TypeStepBaptism: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'type', type: 'baptism' } } } },
};

export const PlanStep: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'plan', type: 'wedding', plan: 'STORY' } } } },
};

export const PlanStepLitePlan: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'plan', type: 'wedding', plan: 'QR' } } } },
};

export const ComparePlans: Story = {
    parameters: { nextjs: { navigation: { pathname: '/', query: { create: '1', run: 'story', step: 'plan', type: 'wedding', plan: 'STORY', sheet: 'plans' } } } },
};
```

Check the param names: `CREATE_EVENT_PLAN_PARAM` in `lib/createEventSteps.ts` (use its value, likely `plan`). The baptism story needs a baptism plan list for its features; it is enough that the type step renders (features follow `storyWizardAppConfig.planTiers`, which are wedding plans, so baptism shows none: add one baptism plan to `storyWizardPlans` with `eventTypeKey: 'BAPTISM'` and the baptism modules if the empty features section looks broken). Keep `CreateEventDialog.stories.tsx` as is (it uses `storyWizardAppConfig`).

- [ ] **Step 3: Build Storybook and check each story renders at 375 and 1280**

Run: `npx storybook build -o <scratchpad>/sb --quiet`, serve it, and load `iframe.html?id=event-createeventwizard--<story>&viewMode=story&globals=locale:el` for every story above plus `event-createeventdialog--open`, at 375×812 and 1280×800 (headless Chrome via playwright-core, as in part 1's check). For each: no page error, Storybook's error panel hidden (check `getComputedStyle(...).display`, not `innerText`), and a screenshot. Look at every screenshot against the mockup boards.

- [ ] **Step 4: Commit**

```bash
git add .storybook/fixtures.ts components/event/create/wizard/CreateEventWizard.stories.tsx
git commit -m "KAN-197: stories for the new type and plan steps and the compare sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Full checks and a look in the app

- [ ] **Step 1: Run every check**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
npx next build
```

Expected: all clean. Revert `AGENTS.md` if `next build` or `next dev` touched it.

- [ ] **Step 2: Look at it in the app**

With a dev server on this worktree (memory: the CORS shim to staging and `next dev` on :3101, or the user's :3000 setup; never `preview_start {name}`), open `/el?create=1` at 375×812 and 1280×800:

- Type step: photo with close, bar and "1/5" on it; Greek heading; chips two per row; picked chip dark; features for wedding and baptism; button "Πάμε να οργανώσουμε τον γάμο σας" with ink text.
- Arrow keys move the type; the photo and button label follow.
- Plan step: Back top-left; Greek heading; guest chips; the card with "Ιδανικό για εσάς", price and tiles; switching durations changes the price; a chip picks its plan.
- "Σύγκριση όλων των πλάνων" opens the sheet; phone Back closes it and stays on the plan step; "Επιλογή {plan}" picks and closes; the chip follows.
- Top-left Back from plan returns to type; Close from type then closes the wizard in one step (history depth still right).
- Reload on the plan step keeps the plan and duration.
- Flag off (`/events/new` on a production-like env, or the old flow's tests): nothing changed.

- [ ] **Step 3: Note anything not checked** in the PR description (for example signed-in plans on staging, if the backend PR isn't deployed yet).

---

## Self-review notes

- Spec 5.1: photo (Task 6), fallback map (Task 4), alt = type name (Task 6), heading `h1` (Task 6), chips radiogroup with arrows in `sortOrder` (Task 6, order from `eventTypes`), features (Tasks 3, 5, 6), per-type button (Task 11), scroll with pinned button (Task 11).
- Spec 5.2: priority lists, filtering, promotion, big four and small row, note rule, icons (Tasks 3, 5).
- Spec 5.3: heading, chips, suggestion, card with badge, name, guests and storage, price with discount, "Everything in … plus" and tiles, duration control, compare link, Continue, lite link opens on its card with no chip (Tasks 7–9, 11).
- Spec 5.4: sheet title, full rows with lines and "From", lite rows with months, Choose picks and closes and moves the chip (Task 10).
- Spec 8: one `h1` per step, radiogroups with arrows, icons hidden next to names, images with alt (Tasks 6, 9, 10).
- Spec 10: unit tests for features and chips (Tasks 3, 7), component tests for type and plan steps and the sheet (Tasks 6, 9, 10), stories (Task 12).
