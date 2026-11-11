# Event Creation Wizard (Frontend, part 3: details, theme, review, celebration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inside the wizard (flag on), finish the steps after the plan: a details step with a live preview card and a one-line time zone, the theme step's new heading, a review step with a summary card and a "Pay {amount}" button, and a celebration screen after a draft's first payment.

**Architecture:** New wizard-only components under `components/event/create/wizard/{details,theme,review}` and `components/checkout/CheckoutCelebration*`. They reuse today's step bodies (`EventDetailsStep`, `EventThemeStep`, `EventOverviewStep`) through small optional props whose defaults keep the old flow (flag off) exactly as it is. Pure rules (amount due, preview lines, plan row lines, when to celebrate) live in `lib/` with unit tests; hooks turn form state into plain values; components stay declarative. The wizard footer becomes one full-width button on every step, so the old `EventCreateFooter` is no longer used inside the wizard.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, TanStack Query 5, canvas-confetti, Vitest + Testing Library, Storybook 10 with MSW.

**Spec:** `docs/superpowers/specs/2026-11-10-event-creation-wizard-design.md` sections 5.5, 5.6, 5.10, 5.11, 6, 8, 10 (those parts), work order items 6 and 8. Wording: `...-copy.md` rows 42–48 and 68–80 (approved 2026-11-10). Mockups: canvas boards `D1-details`, `TH-theme`, `D5-review`, `D6-celebrate` (stickers left out, spec section 6). Jira epic KAN-197.

**Not in this part:** account step, sign-up and sign-in screens, the 6-digit email code (spec 5.7–5.9). They come in part 4, after guestwall-be#133 is on staging. Until then the review step behaves as today for signed-in users (unverified accounts still see today's verify notice).

---

## Before you start

- Branch `claude/kan-197-wizard-details-review` from `claude/kan-197-wizard-type-plan-steps` (PR #300). Open the PR into that branch and retarget it as the earlier PRs merge (#299 → staging, then #300 → staging).
- If `node_modules` is missing, link it to the main checkout's (memory note "Worktree node_modules junction") when the lockfiles match.
- One test file: `npx vitest run <path>`. Whole suite: `npx vitest run`. Types: `npx tsc --noEmit`. Lint: `npx eslint .`. Format: `npx prettier --check <files>`.
- Commit messages start with `KAN-197:` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name. A local `next dev` run edits `AGENTS.md`: revert it, never commit it.
- Never change user-facing wording beyond what Task 1 lists. Every string there is an approved row or reused verbatim.
- Every new visual section gets the repo's JSX section comment.
- Vitest runs without globals: import `afterEach, describe, expect, it, vi` and call `cleanup` in `afterEach`.

## Decisions taken while planning

1. **New keys for the wizard, old keys untouched** (as in part 2). Rows 42, 46, 47, 68 and 71 change text the old flow still shows. The wizard reads new keys; `subtitle`, `placeholders.locationAddress`, `steps.themeSubtitle`, `steps.overviewSubtitle` and `submitAndPay` stay until the cleanup PR.
2. **Rows 76–80 are removals inside the wizard only:** the wizard's details step hides the coverage line and "Photos kept until…" under the date (prop `showScheduleHint={false}`), the theme step hides its description (prop `showHint={false}`). The breadcrumb (79) and plan cards (80) were already gone in part 2. `detailsHint` ("You can add or edit more details after creation.") is not in those rows, so it stays.
3. **Reused strings:** "Change" is `CreateEventPage.selection.change` (rows 45, 70); "Continue" is `CreateEventPage.wizard.plan.continue`; the plan row reuses `Durations.months`, `LandingPage.pricing.guestsUpTo`, `guestsUnlimited`, `storageUnlimited`; the preview title falls back to the type's existing title placeholder (`useEventTypeVoice().titlePlaceholder`) until a title is typed.
4. **Approved by the user 2026-11-11:**
   - The pay button always says "Pay {amount}" with the total due, also "Pay €0.00" when a code covers everything.
   - The "Wedding · STORY · Change" line above the heading is dropped on details and theme in the wizard.
   - The review plan row has two lines: "STORY · 6 months", then "Up to 300 guests · 25 GB".
   - The celebration has no Close button, only "Open event" and "Invite guests".
5. **"A draft's first activation" = the paid order's `kind === 'ACTIVATION'`.** The event refetches as ACTIVE right after payment, so its status can't tell; the order kind can. Upgrades, storage packs and extensions keep today's page and its 5-second redirect, as do the processing and timed-out states.
6. **The celebration is behind the launch flag** (`useCreateWizardEnabled()`); with the flag off the success page is unchanged. Its wording lives under `CheckoutSuccessPage.celebration`, a namespace that page already ships.
7. **Time zone line** shows the zone as stored (e.g. "Europe/Athens"). "Change" swaps the line for today's `EventTimezoneField`; a time zone error opens it on its own.
8. **Confetti:** canvas-confetti with the brand colours, three bursts, fired once when the celebration shows. With reduced motion it does not fire at all (spec 6, 10).

## Files

**Create**
- `lib/createEventWizardReview.ts` (+ `.test.ts`): amount due, preview "when" line, joined lines, plan row detail.
- `lib/checkoutCelebration.ts` (+ `.test.ts`): when to celebrate.
- `lib/celebrationConfetti.ts` (+ `.test.ts`): the confetti bursts, skipped with reduced motion.
- `hooks/useCreateEventWizardDetails.ts`: preview card values and the time zone line state.
- `hooks/useCreateEventWizardReview.ts`: the summary card rows.
- `hooks/useCheckoutCelebration.ts`: whether to celebrate, the card, the links, the confetti.
- `components/event/create/wizard/details/{DetailsPreview,DetailsTimeZone,DetailsStep}.tsx` (+ `DetailsStep.test.tsx`).
- `components/event/create/wizard/theme/ThemeStep.tsx`.
- `components/event/create/wizard/review/{ReviewSummaryCard,ReviewStep}.tsx` (+ `ReviewStep.test.tsx`).
- `components/checkout/CheckoutCelebration.tsx` (+ `.test.tsx`, `.stories.tsx`).

**Modify**
- `messages/en.json`, `messages/el.json`: new keys (Task 1).
- `components/event/create/EventDetailsStep.tsx`: optional `timezoneField`, `showScheduleHint`, `addressPlaceholder` props.
- `components/event/create/EventThemeStep.tsx`: optional `showHint` prop.
- `components/event/create/EventOverviewStep.tsx`: optional `showEventSummary` prop.
- `hooks/useCreateEventWizardFooter.ts`, `components/event/create/wizard/CreateEventWizardFooter.tsx` (+ test): one button on every step.
- `components/event/create/wizard/CreateEventWizard.tsx`: the new steps, no selection line, no shared heading.
- `app/(main)/(app)/(event)/events/[eventId]/checkout/success/page.tsx`: the celebration.
- `components/event/create/wizard/CreateEventWizard.stories.tsx`: details, theme and review stories.

---

### Task 1: The wording

**Files:** Modify `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the wizard keys.** Inside `CreateEventPage.wizard` (next to `type`, `features`, `plan`, `plans`), add in `messages/en.json`:

```json
"details": {
    "heading": "Tell us about the big day",
    "preview": "Preview",
    "timeZone": "Time zone: {zone}",
    "addressPlaceholder": "e.g. 123 Kifisias Ave, Athens"
},
"theme": {
    "heading": "Choose a look",
    "line": "You can change it later."
},
"review": {
    "heading": "One last look",
    "edit": "Edit",
    "pay": "Pay {amount}"
}
```

and in `messages/el.json`:

```json
"details": {
    "heading": "Πείτε μας για τη μεγάλη μέρα",
    "preview": "Προεπισκόπηση",
    "timeZone": "Ζώνη ώρας: {zone}",
    "addressPlaceholder": "π.χ. Λεωφ. Κηφισίας 123, Αθήνα"
},
"theme": {
    "heading": "Επιλέξτε εμφάνιση",
    "line": "Μπορείτε να το αλλάξετε αργότερα."
},
"review": {
    "heading": "Μια τελευταία ματιά",
    "edit": "Επεξεργασία",
    "pay": "Πληρωμή {amount}"
}
```

(Rows 42, 43, 44, 46, 47, 48, 68, 69, 71. Row 46's Greek is today's text, unchanged.)

- [ ] **Step 2: Add the celebration keys.** Inside `CheckoutSuccessPage`, add in `messages/en.json`:

```json
"celebration": {
    "heading": "Your event is live",
    "line": "Share it with your guests so they can start posting.",
    "openEvent": "Open event",
    "inviteGuests": "Invite guests"
}
```

and in `messages/el.json`:

```json
"celebration": {
    "heading": "Η εκδήλωσή σας είναι ενεργή",
    "line": "Μοιραστείτε την με τους καλεσμένους σας για να αρχίσουν να ανεβάζουν.",
    "openEvent": "Άνοιγμα εκδήλωσης",
    "inviteGuests": "Πρόσκληση καλεσμένων"
}
```

(Rows 72–75.)

- [ ] **Step 3: Check both files parse and the wizard namespaces test still passes.**

Run: `node -e "require('./messages/en.json');require('./messages/el.json')" && npx vitest run i18n`
Expected: no output from node; vitest PASS (the key parity and `createWizardMessages` tests).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-197: wording for the wizard's details, theme and review steps and the celebration"
```

---

### Task 2: Review and preview rules

**Files:** Create `lib/createEventWizardReview.ts`, `lib/createEventWizardReview.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { dueAtActivation, joinLine, planRowDetail, previewWhen } from '@/lib/createEventWizardReview';

const copy = {
    guestsUpTo: (count: number) => `Up to ${count} guests`,
    guestsUnlimited: 'Unlimited guests',
    storageUnlimited: 'Unlimited storage',
};

describe('dueAtActivation', () => {
    it('uses the code preview when a code is applied', () => {
        expect(
            dueAtActivation({ amountMinor: 9900, currency: 'EUR' }, { payableAmountMinor: 4950, currency: 'EUR' }, 'EUR'),
        ).toEqual({ amountMinor: 4950, currency: 'EUR' });
    });

    it('uses the plan price without a code', () => {
        expect(dueAtActivation({ amountMinor: 9900, currency: 'EUR' }, null, 'EUR')).toEqual({ amountMinor: 9900, currency: 'EUR' });
    });

    it('is zero in the plan currency when nothing is charged', () => {
        expect(dueAtActivation(null, null, 'EUR')).toEqual({ amountMinor: 0, currency: 'EUR' });
    });
});

describe('previewWhen', () => {
    it('is empty without a start', () => {
        expect(previewWhen('en', '')).toBe('');
    });

    it('shows the date and time as typed', () => {
        const line = previewWhen('en', '2027-06-12T18:00');
        expect(line).toContain('2027');
        expect(line).toContain(' · ');
        expect(line).toMatch(/6:00|18:00/);
    });
});

describe('joinLine', () => {
    it('joins the parts that have text with a middle dot', () => {
        expect(joinLine(['Sat 12 June 2027', '', null, 'Agios Nikolaos'])).toBe('Sat 12 June 2027 · Agios Nikolaos');
    });
});

describe('planRowDetail', () => {
    it('names the guests and the storage', () => {
        expect(planRowDetail({ maxMembers: 300, storageBytes: 25 * 1024 ** 3 }, copy)).toMatch(/^Up to 300 guests · 25/);
    });

    it('says unlimited when a limit is null', () => {
        expect(planRowDetail({ maxMembers: null, storageBytes: null }, copy)).toBe('Unlimited guests · Unlimited storage');
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/createEventWizardReview.test.ts`
Expected: FAIL, cannot resolve `@/lib/createEventWizardReview`.

- [ ] **Step 3: Implement**

```ts
import { formatEventDateParts } from '@/lib/datetime';
import { formatBytes } from '@/lib/format';

type Money = { amountMinor: number; currency: string | null };

// What the host pays at activation: the code's price when one is applied, else the plan's, else nothing.
export function dueAtActivation(
    activation: { amountMinor: number; currency: string | null } | null,
    codePreview: { payableAmountMinor: number; currency: string } | null,
    planCurrency: string | null,
): Money {
    if (codePreview) return { amountMinor: codePreview.payableAmountMinor, currency: codePreview.currency };
    if (activation) return { amountMinor: activation.amountMinor, currency: activation.currency };
    return { amountMinor: 0, currency: planCurrency };
}

// The details form keeps the start as typed ("2027-06-12T18:00", the event's wall clock), so it is
// shown without converting time zones.
export function previewWhen(locale: string, startAt: string): string {
    if (!startAt) return '';
    const parts = formatEventDateParts(locale, startAt, null);
    return parts ? joinLine([parts.date, parts.time]) : '';
}

export function joinLine(parts: (string | null | undefined)[]): string {
    return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

type PlanRowCopy = { guestsUpTo: (count: number) => string; guestsUnlimited: string; storageUnlimited: string };

// The review's plan row, second line: "Up to 300 guests · 25 GB".
export function planRowDetail(plan: { maxMembers: number | null; storageBytes: number | null }, copy: PlanRowCopy): string {
    const guests = plan.maxMembers === null ? copy.guestsUnlimited : copy.guestsUpTo(plan.maxMembers);
    const storage = plan.storageBytes === null ? copy.storageUnlimited : formatBytes(plan.storageBytes);
    return joinLine([guests, storage]);
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npx vitest run lib/createEventWizardReview.test.ts`
Expected: PASS. If `formatBytes` prints "25.0 GB" or similar, the `/^Up to 300 guests · 25/` match still holds; don't change `formatBytes`.

- [ ] **Step 5: Commit**

```bash
git add lib/createEventWizardReview.ts lib/createEventWizardReview.test.ts
git commit -m "KAN-197: rules for the amount due, the preview line and the review's plan row"
```

---

### Task 3: Optional props on today's step bodies

The old flow passes none of these props, so it renders exactly as today.

**Files:** Modify `components/event/create/EventDetailsStep.tsx`, `components/event/create/EventThemeStep.tsx`, `components/event/create/EventOverviewStep.tsx`

- [ ] **Step 1: `EventDetailsStep`.** Change the signature and the three spots:

```tsx
import type { ReactNode } from 'react';

type EventDetailsStepProps = {
    // Replaces today's time zone field (the wizard shows a one-line summary instead).
    timezoneField?: ReactNode;
    // The coverage hint under the date ("Coverage starts…", "Photos kept until…"). Errors always show.
    showScheduleHint?: boolean;
    addressPlaceholder?: string;
};

export function EventDetailsStep({ timezoneField, showScheduleHint = true, addressPlaceholder }: EventDetailsStepProps = {}) {
```

Under the date field, replace the hint ternary with:

```tsx
                    {scheduleError ? (
                        <span className="text-xs text-rose-500">{scheduleError}</span>
                    ) : !showScheduleHint ? null : projectedCoverage ? (
                        <span className="text-xs text-ink-muted">
                            {t('coverageProjection', { endsAt: formatDate(locale, projectedCoverage.coverageEndsAt, { dateStyle: 'medium' }) })}
                        </span>
                    ) : (
                        <span className="text-xs text-ink-muted">{t('startAtHint')}</span>
                    )}
```

Replace the timezone block with:

```tsx
                {/* Timezone */}
                {timezoneField ?? (
                    <EventTimezoneField
                        label={t('fields.timezone')}
                        value={timezone}
                        options={timezoneOptions}
                        error={timezoneError}
                        onChangeAction={onTimezoneChange}
                    />
                )}
```

and the address input's placeholder with `placeholder={addressPlaceholder ?? t('placeholders.locationAddress')}`.

- [ ] **Step 2: `EventThemeStep`.** `export function EventThemeStep({ showHint = true }: { showHint?: boolean } = {})`, and render the hint as `{showHint && <p className="text-sm text-ink-muted">{tSteps('themeHint')}</p>}`. When the hint is hidden the loading/error/grid keep their `mt-4`; nothing else changes.

- [ ] **Step 3: `EventOverviewStep`.** `export function EventOverviewStep({ showEventSummary = true }: { showEventSummary?: boolean } = {})`, and wrap the event summary:

```tsx
            {/* Event Summary */}
            {showEventSummary && (
                <div className="border-b border-border/70 pb-5">
                    <ActivationEventSummary eventTitle={title} eventTypeName={eventTypeName} startAt={startAt} />
                </div>
            )}
```

With the summary hidden the pricing section's `py-5` top padding sits right under the wizard's summary card; that's intended.

- [ ] **Step 4: Run today's tests for these files**

Run: `npx vitest run components/event/create && npx tsc --noEmit`
Expected: PASS, no type errors (the old flow's tests are untouched by default props).

- [ ] **Step 5: Commit**

```bash
git add components/event/create/EventDetailsStep.tsx components/event/create/EventThemeStep.tsx components/event/create/EventOverviewStep.tsx
git commit -m "KAN-197: optional props so the wizard can reuse the details, theme and overview bodies"
```

---

### Task 4: The details step

**Files:** Create `hooks/useCreateEventWizardDetails.ts`, `components/event/create/wizard/details/DetailsPreview.tsx`, `DetailsTimeZone.tsx`, `DetailsStep.tsx`, `DetailsStep.test.tsx`

- [ ] **Step 1: Write the failing component test** (`components/event/create/wizard/details/DetailsStep.test.tsx`)

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DetailsStep } from '@/components/event/create/wizard/details/DetailsStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (ns: string) => (key: string, values?: Record<string, string>) =>
        values ? `${ns}.${key}:${Object.values(values).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding', tagline: '' }) }));
vi.mock('@/hooks/useEventTypeVoice', () => ({ useEventTypeVoice: () => ({ titlePlaceholder: 'Maria & Nikos' }) }));
vi.mock('@/components/event/create/EventDetailsStep', () => ({
    EventDetailsStep: ({ timezoneField, showScheduleHint, addressPlaceholder }: Record<string, unknown>) => (
        <div data-testid="fields" data-hint={String(showScheduleHint)} data-placeholder={String(addressPlaceholder)}>
            {timezoneField as ReactNode}
        </div>
    ),
}));
vi.mock('@/components/event/create/EventTimezoneField', () => ({ EventTimezoneField: () => <input aria-label="tz-field" /> }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

function setup(overrides: Record<string, unknown> = {}) {
    form.current = {
        eventTypes: [{ eventTypeKey: 'WEDDING', imageUrl: null }],
        selectedEventType: 'WEDDING',
        title: 'Anna & Kostas',
        startAt: '2027-06-12T18:00',
        locationName: 'Agios Nikolaos',
        timezone: 'Europe/Athens',
        timezoneOptions: ['Europe/Athens'],
        timezoneError: null,
        onTimezoneChange: vi.fn(),
        ...overrides,
    };
    render(<DetailsStep />);
}

afterEach(cleanup);

describe('DetailsStep (wizard)', () => {
    it('shows the heading and a preview of what is typed', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.details.heading');
        expect(screen.getByText('CreateEventPage.wizard.details.preview')).toBeInTheDocument();
        expect(screen.getByText('Anna & Kostas')).toBeInTheDocument();
        expect(screen.getByText(/2027 · .* · Agios Nikolaos/)).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
    });

    it('shows the type placeholder until a title is typed', () => {
        setup({ title: '  ' });
        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
    });

    it('hides the schedule hint and uses the wizard address placeholder', () => {
        setup();
        const fields = screen.getByTestId('fields');
        expect(fields).toHaveAttribute('data-hint', 'false');
        expect(fields).toHaveAttribute('data-placeholder', 'CreateEventPage.wizard.details.addressPlaceholder');
    });

    it('shows the time zone as one line until Change is tapped', () => {
        setup();
        expect(screen.getByText(/CreateEventPage.wizard.details.timeZone:Europe\/Athens/)).toBeInTheDocument();
        expect(screen.queryByLabelText('tz-field')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.selection.change' }));
        expect(screen.getByLabelText('tz-field')).toBeInTheDocument();
    });

    it('opens the time zone field when it has an error', () => {
        setup({ timezoneError: 'Pick a time zone' });
        expect(screen.getByLabelText('tz-field')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/event/create/wizard/details`
Expected: FAIL, cannot resolve `DetailsStep`.

- [ ] **Step 3: The hook** (`hooks/useCreateEventWizardDetails.ts`)

```ts
'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';

import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { joinLine, previewWhen } from '@/lib/createEventWizardReview';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The details step as plain values: the live preview card and the one-line time zone.
export function useCreateEventWizardDetails() {
    const locale = useLocale();
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const voice = useEventTypeVoice(form.selectedEventType);
    const [timeZoneOpen, setTimeZoneOpen] = useState(false);

    const type = form.eventTypes.find((entry) => entry.eventTypeKey === form.selectedEventType);
    const typedTitle = form.title.trim();

    return {
        preview: {
            photoSrc: createEventTypePhoto(form.selectedEventType, type?.imageUrl ?? null),
            alt: typeCopy(form.selectedEventType).name,
            title: typedTitle || voice.titlePlaceholder,
            titleIsPlaceholder: !typedTitle,
            line: joinLine([previewWhen(locale, form.startAt), form.locationName]),
        },
        timeZone: {
            zone: form.timezone,
            // An error keeps the field open so it can be fixed.
            open: timeZoneOpen || Boolean(form.timezoneError),
            onOpen: () => setTimeZoneOpen(true),
            options: form.timezoneOptions,
            error: form.timezoneError,
            onChange: form.onTimezoneChange,
        },
    };
}
```

- [ ] **Step 4: The preview card** (`components/event/create/wizard/details/DetailsPreview.tsx`)

```tsx
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { cn } from '@/lib/utils';

type DetailsPreviewProps = { photoSrc: string; alt: string; title: string; titleIsPlaceholder: boolean; line: string };

// The event as guests will first see it, updating as the host types.
export function DetailsPreview({ photoSrc, alt, title, titleIsPlaceholder, line }: DetailsPreviewProps) {
    const t = useTranslations('CreateEventPage.wizard.details');

    return (
        <div className="relative h-42 overflow-hidden rounded-3xl shadow-[0_10px_24px_rgba(36,31,26,0.16)]">
            {/* Photo */}
            <ProtectedImage src={photoSrc} alt={alt} fill sizes="(min-width: 768px) 400px, 100vw" className="object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-[rgba(20,14,10,0.1)] to-[rgba(20,14,10,0.78)]" />

            {/* Tag */}
            <span className="absolute top-3 left-3 rounded-xl bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">{t('preview')}</span>

            {/* Title and when */}
            <div className="absolute inset-x-4.5 bottom-4 flex flex-col gap-1 text-white">
                <span className={cn('line-clamp-2 font-editorial text-[26px] leading-[1.1]', titleIsPlaceholder && 'opacity-70')}>{title}</span>
                {line && <span className="text-sm text-[#f6ece4]">{line}</span>}
            </div>
        </div>
    );
}
```

`cn` comes from `@/lib/utils`, as in the part 2 components.

- [ ] **Step 5: The time zone line** (`components/event/create/wizard/details/DetailsTimeZone.tsx`)

```tsx
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { EventTimezoneField } from '@/components/event/create/EventTimezoneField';

type DetailsTimeZoneProps = {
    zone: string;
    open: boolean;
    onOpen: () => void;
    options: string[];
    error: string | null;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

// "Time zone: Europe/Athens · Change"; Change swaps in today's time zone field.
export function DetailsTimeZone({ zone, open, onOpen, options, error, onChange }: DetailsTimeZoneProps) {
    const t = useTranslations('CreateEventPage');

    if (open) {
        return <EventTimezoneField label={t('fields.timezone')} value={zone} options={options} error={error} onChangeAction={onChange} />;
    }

    return (
        <p className="-mt-2 text-[13px] text-[#6f6257]">
            {t('wizard.details.timeZone', { zone })}
            {' · '}
            <button
                type="button"
                onClick={onOpen}
                className="min-h-11 font-semibold text-ink underline underline-offset-2 focus-ring"
            >
                {t('selection.change')}
            </button>
        </p>
    );
}
```

- [ ] **Step 6: The step** (`components/event/create/wizard/details/DetailsStep.tsx`)

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { DetailsPreview } from '@/components/event/create/wizard/details/DetailsPreview';
import { DetailsTimeZone } from '@/components/event/create/wizard/details/DetailsTimeZone';
import { useCreateEventWizardDetails } from '@/hooks/useCreateEventWizardDetails';

export function DetailsStep() {
    const t = useTranslations('CreateEventPage.wizard.details');
    const { preview, timeZone } = useCreateEventWizardDetails();

    return (
        <div className="flex flex-col gap-5">
            {/* Preview */}
            <DetailsPreview {...preview} />

            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {/* Fields */}
            <EventDetailsStep
                showScheduleHint={false}
                addressPlaceholder={t('addressPlaceholder')}
                timezoneField={<DetailsTimeZone {...timeZone} />}
            />
        </div>
    );
}
```

- [ ] **Step 7: Run to see it pass**

Run: `npx vitest run components/event/create/wizard/details`
Expected: PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add hooks/useCreateEventWizardDetails.ts components/event/create/wizard/details
git commit -m "KAN-197: wizard details step with a live preview and a one-line time zone"
```

---

### Task 5: The theme step

**Files:** Create `components/event/create/wizard/theme/ThemeStep.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { EventThemeStep } from '@/components/event/create/EventThemeStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';

export function ThemeStep() {
    const t = useTranslations('CreateEventPage.wizard.theme');

    return (
        <div className="flex flex-col gap-2">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>
            <p className="text-[15px] text-[#6f6257]">{t('line')}</p>

            {/* Themes */}
            <EventThemeStep showHint={false} />
        </div>
    );
}
```

- [ ] **Step 2: Types**

Run: `npx tsc --noEmit`
Expected: no errors. (The theme step is covered by `EventThemeStep.test.tsx` and the story in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add components/event/create/wizard/theme/ThemeStep.tsx
git commit -m "KAN-197: wizard theme step heading"
```

---

### Task 6: The review step

**Files:** Create `hooks/useCreateEventWizardReview.ts`, `components/event/create/wizard/review/ReviewSummaryCard.tsx`, `ReviewStep.tsx`, `ReviewStep.test.tsx`

- [ ] **Step 1: Write the failing test** (`components/event/create/wizard/review/ReviewStep.test.tsx`)

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewStep } from '@/components/event/create/wizard/review/ReviewStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
        values ? `${ns}.${key}:${Object.values(values).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding', tagline: '' }) }));
vi.mock('@/components/event/create/EventOverviewStep', () => ({
    EventOverviewStep: ({ showEventSummary }: { showEventSummary?: boolean }) => <div data-testid="overview" data-summary={String(showEventSummary)} />,
}));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

function setup() {
    const goToDetails = vi.fn();
    const goToPlan = vi.fn();
    form.current = {
        eventTypes: [{ eventTypeKey: 'WEDDING', imageUrl: null }],
        selectedEventType: 'WEDDING',
        trimmedTitle: 'Anna & Kostas',
        startAt: '2027-06-12T18:00',
        locationName: 'Agios Nikolaos',
        selectedPlan: { name: 'STORY', maxMembers: 300, storageBytes: null },
        selectedOption: { months: 6 },
        goToDetails,
        goToPlan,
    };
    render(<ReviewStep />);
    return { goToDetails, goToPlan };
}

afterEach(cleanup);

describe('ReviewStep (wizard)', () => {
    it('shows the heading, the event row and the plan row', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.review.heading');
        expect(screen.getByText('Anna & Kostas')).toBeInTheDocument();
        expect(screen.getByText(/2027 · Agios Nikolaos/)).toBeInTheDocument();
        expect(screen.getByText('STORY · Durations.months:6')).toBeInTheDocument();
        expect(screen.getByText('LandingPage.pricing.guestsUpTo:300 · LandingPage.pricing.storageUnlimited')).toBeInTheDocument();
    });

    it('goes to details from Edit and to the plan from Change', () => {
        const { goToDetails, goToPlan } = setup();
        fireEvent.click(screen.getByRole('button', { name: /CreateEventPage.wizard.review.edit/ }));
        fireEvent.click(screen.getByRole('button', { name: /CreateEventPage.selection.change/ }));
        expect(goToDetails).toHaveBeenCalled();
        expect(goToPlan).toHaveBeenCalled();
    });

    it("keeps today's price lines and notices without the old event summary", () => {
        setup();
        expect(screen.getByTestId('overview')).toHaveAttribute('data-summary', 'false');
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/event/create/wizard/review`
Expected: FAIL, cannot resolve `ReviewStep`.

- [ ] **Step 3: The hook** (`hooks/useCreateEventWizardReview.ts`)

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { joinLine, planRowDetail } from '@/lib/createEventWizardReview';
import { formatEventDateParts } from '@/lib/datetime';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The review's summary card: the event (Edit → details) and the plan (Change → plan).
export function useCreateEventWizardReview() {
    const locale = useLocale();
    const tDurations = useTranslations('Durations');
    const tPricing = useTranslations('LandingPage.pricing');
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();

    const type = form.eventTypes.find((entry) => entry.eventTypeKey === form.selectedEventType);
    const plan = form.selectedPlan;
    const option = form.selectedOption;

    return {
        event: {
            photoSrc: createEventTypePhoto(form.selectedEventType, type?.imageUrl ?? null),
            alt: typeCopy(form.selectedEventType).name,
            title: form.trimmedTitle,
            line: joinLine([formatEventDateParts(locale, form.startAt, null)?.date, form.locationName]),
            onEdit: form.goToDetails,
        },
        plan:
            plan && option
                ? {
                      title: joinLine([plan.name, tDurations('months', { count: option.months })]),
                      detail: planRowDetail(plan, {
                          guestsUpTo: (count) => tPricing('guestsUpTo', { count }),
                          guestsUnlimited: tPricing('guestsUnlimited'),
                          storageUnlimited: tPricing('storageUnlimited'),
                      }),
                      onChange: form.goToPlan,
                  }
                : null,
    };
}
```

- [ ] **Step 4: The card** (`components/event/create/wizard/review/ReviewSummaryCard.tsx`)

```tsx
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { useCreateEventWizardReview } from '@/hooks/useCreateEventWizardReview';

type Review = ReturnType<typeof useCreateEventWizardReview>;

const linkClass = 'min-h-11 shrink-0 px-1 text-sm font-bold text-ink underline underline-offset-3 focus-ring';

export function ReviewSummaryCard({ event, plan }: Review) {
    const t = useTranslations('CreateEventPage');
    const eventId = useId();
    const planId = useId();

    return (
        <div className="overflow-hidden rounded-[22px] border border-[#f0e2d2]">
            {/* Event */}
            <div className="flex items-center gap-3.5 p-3.5">
                <span className="relative size-15 shrink-0 overflow-hidden rounded-2xl">
                    <ProtectedImage src={event.photoSrc} alt={event.alt} fill sizes="60px" className="object-cover" />
                </span>
                <div id={eventId} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-editorial text-lg text-ink">{event.title}</span>
                    {event.line && <span className="text-[13px] text-[#6f6257]">{event.line}</span>}
                </div>
                <button type="button" onClick={event.onEdit} aria-describedby={eventId} className={linkClass}>
                    {t('wizard.review.edit')}
                </button>
            </div>

            {/* Plan */}
            {plan && (
                <>
                    <div aria-hidden="true" className="mx-3.5 h-px bg-[#f0e2d2]" />
                    <div className="flex items-center gap-3.5 px-3.5 pt-3 pb-3.5">
                        <div id={planId} className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[15px] font-bold text-ink">{plan.title}</span>
                            <span className="text-[13px] text-[#6f6257]">{plan.detail}</span>
                        </div>
                        <button type="button" onClick={plan.onChange} aria-describedby={planId} className={linkClass}>
                            {t('selection.change')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 5: The step** (`components/event/create/wizard/review/ReviewStep.tsx`)

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { ReviewSummaryCard } from '@/components/event/create/wizard/review/ReviewSummaryCard';
import { useCreateEventWizardReview } from '@/hooks/useCreateEventWizardReview';

export function ReviewStep() {
    const t = useTranslations('CreateEventPage.wizard.review');
    const review = useCreateEventWizardReview();

    return (
        <div className="flex flex-col gap-4.5">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[28px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('heading')}
            </h1>

            {/* Summary */}
            <ReviewSummaryCard {...review} />

            {/* Prices, code, notices and withdrawal, as today */}
            <EventOverviewStep showEventSummary={false} />
        </div>
    );
}
```

- [ ] **Step 6: Run to see it pass**

Run: `npx vitest run components/event/create/wizard/review`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add hooks/useCreateEventWizardReview.ts components/event/create/wizard/review
git commit -m "KAN-197: wizard review step with a summary card"
```

---

### Task 7: One button on every step

**Files:** Modify `hooks/useCreateEventWizardFooter.ts`, `components/event/create/wizard/CreateEventWizardFooter.tsx`, `components/event/create/wizard/CreateEventWizardFooter.test.tsx`

- [ ] **Step 1: Replace the test file** (`CreateEventWizardFooter.test.tsx`)

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateEventWizardFooter } from '@/components/event/create/wizard/CreateEventWizardFooter';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
        values ? `${ns}.${key}:${Object.values(values).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useCampaignPriceClock', () => ({ useCampaignPriceClock: () => undefined }));
vi.mock('@/lib/incident', () => ({ INCIDENT_MODE: false }));
vi.mock('@/components/event/create/EventOverviewError', () => ({ EventOverviewError: () => <p>overview error</p> }));
vi.mock('@/components/event/create/EventOverviewConsentHint', () => ({ EventOverviewConsentHint: () => <p>consent hint</p> }));
vi.mock('@/components/incident/IncidentPausedNote', () => ({ IncidentPausedNote: () => null }));

const PLAN = { code: 'STORY', name: 'STORY', priceCurrency: 'EUR', scope: 'EVENT' };

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

    it('submits the details form with Continue', () => {
        form.current = { step: 'details', formId: 'create-form', canSubmitDetails: true };
        render(<CreateEventWizardFooter />);
        const button = screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.continue' });
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).toHaveAttribute('form', 'create-form');
    });

    it('moves from theme to review with Continue', () => {
        const goToOverview = vi.fn();
        form.current = { step: 'theme', goToOverview };
        render(<CreateEventWizardFooter />);
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.wizard.plan.continue' }));
        expect(goToOverview).toHaveBeenCalled();
    });

    it('says Pay with the amount due on review, with the notes above it', () => {
        form.current = {
            step: 'overview',
            formId: 'create-form',
            eventPlans: [PLAN],
            selectedPlan: PLAN,
            selectedOption: { id: 'o6', months: 6, priceAmountMinor: 9900 },
            checkoutCodePreview: { payableAmountMinor: 0, currency: 'EUR' },
            isSubmitPending: false,
            isEmailVerified: true,
            consentSatisfied: true,
        };
        render(<CreateEventWizardFooter />);
        const button = screen.getByRole('button', { name: /CreateEventPage.wizard.review.pay:.*0\.00/ });
        expect(button).toHaveAttribute('type', 'submit');
        expect(button).toBeEnabled();
        expect(screen.getByText('consent hint')).toBeInTheDocument();
    });

    it('waits for the consent boxes before paying', () => {
        form.current = {
            step: 'overview',
            formId: 'create-form',
            eventPlans: [PLAN],
            selectedPlan: PLAN,
            selectedOption: { id: 'o6', months: 6, priceAmountMinor: 9900 },
            checkoutCodePreview: null,
            isSubmitPending: false,
            isEmailVerified: true,
            consentSatisfied: false,
        };
        render(<CreateEventWizardFooter />);
        expect(screen.getByRole('button', { name: /CreateEventPage.wizard.review.pay/ })).toBeDisabled();
    });
});
```

If `getOptionPriceDetails` needs more fields on the option than `priceAmountMinor` (check `optionPriceDetails` in `lib/planTiers.ts`), add them to the fixture; don't mock the price rules.

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/event/create/wizard/CreateEventWizardFooter.test.tsx`
Expected: FAIL on the details, theme and overview cases (the old footer is still returned).

- [ ] **Step 3: The hook** (`hooks/useCreateEventWizardFooter.ts`, replace the file)

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useCampaignPriceClock } from '@/hooks/useCampaignPriceClock';
import type { EventTypeConvention } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { dueAtActivation } from '@/lib/createEventWizardReview';
import { INCIDENT_MODE } from '@/lib/incident';
import { getOptionPriceDetails } from '@/lib/planTiers';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// Copy rows 17-21: the type step's button names the type; any other type gets "your event".
const TYPE_CONTINUE_KEY: Partial<Record<EventTypeConvention, string>> = {
    WEDDING: 'wedding',
    BAPTISM: 'baptism',
    GENDER_REVEAL: 'reveal',
    REUNION: 'reunion',
};

export type WizardFooterAction = {
    label: string;
    disabled: boolean;
    pending: boolean;
    lock: boolean;
    // The review's error, consent hint and incident note go above the button.
    showReviewNotes: boolean;
} & ({ submitsForm: string; onClick?: never } | { submitsForm?: never; onClick: () => void });

// The wizard's one full-width button, on every step.
export function useCreateEventWizardFooter(): WizardFooterAction {
    const t = useTranslations('CreateEventPage.wizard');
    const locale = useLocale();
    const form = useCreateEventForm();
    // The pay label is worked out as it renders; this redraws it when a campaign starts or ends.
    useCampaignPriceClock(form.eventPlans);

    const base = { pending: false, lock: false, showReviewNotes: false };

    if (form.step === 'type') {
        const key = TYPE_CONTINUE_KEY[form.selectedEventType] ?? 'other';
        return { ...base, label: t(`type.continue.${key}`), disabled: !form.canContinueType, onClick: form.goToPlan };
    }
    if (form.step === 'plan') {
        return { ...base, label: t('plan.continue'), disabled: !form.canContinuePlan, onClick: form.goToDetails };
    }
    if (form.step === 'details') {
        return { ...base, label: t('plan.continue'), disabled: !form.canSubmitDetails, submitsForm: form.formId };
    }
    if (form.step === 'theme') {
        return { ...base, label: t('plan.continue'), disabled: false, onClick: form.goToOverview };
    }

    const activation = form.selectedPlan && form.selectedOption ? getOptionPriceDetails(form.selectedPlan, form.selectedOption) : null;
    const due = dueAtActivation(activation, form.checkoutCodePreview, form.selectedPlan?.priceCurrency ?? null);
    return {
        label: t('review.pay', { amount: formatMoney(locale, due.amountMinor, due.currency) }),
        disabled: INCIDENT_MODE || form.isSubmitPending || !form.isEmailVerified || !form.consentSatisfied,
        pending: form.isSubmitPending,
        lock: true,
        showReviewNotes: true,
        submitsForm: form.formId,
    };
}
```

- [ ] **Step 4: The footer** (`CreateEventWizardFooter.tsx`, replace the file)

```tsx
'use client';

import { Loader2, Lock } from 'lucide-react';

import { EventOverviewConsentHint } from '@/components/event/create/EventOverviewConsentHint';
import { EventOverviewError } from '@/components/event/create/EventOverviewError';
import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { useCreateEventWizardFooter } from '@/hooks/useCreateEventWizardFooter';

// One full-width gradient button with an ink label (6.3:1 and up; white fails) on every step.
export function CreateEventWizardFooter() {
    const action = useCreateEventWizardFooter();

    return (
        <footer className="shrink-0 bg-linear-to-b from-white/0 to-white to-30% px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            {/* Review notes */}
            {action.showReviewNotes && (
                <>
                    <EventOverviewError />
                    <EventOverviewConsentHint />
                    <IncidentPausedNote className="mb-2 text-center" />
                </>
            )}

            {/* Button */}
            <button
                type={action.submitsForm ? 'submit' : 'button'}
                form={action.submitsForm}
                disabled={action.disabled}
                onClick={action.onClick}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[15px] font-bold text-ink focus-ring transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
            >
                {action.pending ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                    action.lock && <Lock aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
                )}
                {action.label}
            </button>
        </footer>
    );
}
```

The label stays in the button while pending (today's footer swaps it for the spinner alone), so the button keeps its name for screen readers.

- [ ] **Step 5: Run to see it pass**

Run: `npx vitest run components/event/create/wizard/CreateEventWizardFooter.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/useCreateEventWizardFooter.ts components/event/create/wizard/CreateEventWizardFooter.tsx components/event/create/wizard/CreateEventWizardFooter.test.tsx
git commit -m "KAN-197: one wizard button on every step, Pay with the amount on review"
```

---

### Task 8: Wire the steps into the wizard

**Files:** Modify `components/event/create/wizard/CreateEventWizard.tsx`

- [ ] **Step 1: Replace the form block and drop what it no longer uses**

Remove the imports of `useTranslations`, `EventCreateSelectionSummary`, `EventDetailsStep`, `EventOverviewStep`, `EventThemeStep` and `CREATE_EVENT_WIZARD_HEADING_ID`, and the `const t = ...` line. Import `DetailsStep`, `ThemeStep`, `ReviewStep` from their new paths. Replace the `{!isType && step !== 'plan' && (...)}` block with:

```tsx
                {!isType && step !== 'plan' && (
                    <form id={formId} onSubmit={handleSubmit} className="px-5 pb-6">
                        {step === 'details' && <DetailsStep />}
                        {step === 'theme' && <ThemeStep />}
                        {step === 'overview' && <ReviewStep />}
                    </form>
                )}
```

Each step now renders its own `h1` with `CREATE_EVENT_WIZARD_HEADING_ID`, so the dialog keeps its label.

- [ ] **Step 2: Check nothing else in the wizard still imports the old footer**

Run: `grep -rn "EventCreateFooter\|EventCreateSelectionSummary" components/event/create/wizard`
Expected: no output. (Both stay in use by the old flow; don't delete them.)

- [ ] **Step 3: Run the wizard tests and types**

Run: `npx vitest run components/event/create hooks && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add components/event/create/wizard/CreateEventWizard.tsx
git commit -m "KAN-197: the wizard shows the new details, theme and review steps"
```

---

### Task 9: Stories for details, theme and review

**Files:** Modify `components/event/create/wizard/CreateEventWizard.stories.tsx`

- [ ] **Step 1: Seed saved answers per story.** Add below `nav`:

```tsx
import { writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';
import { EMPTY_GIFT_DETAILS } from '@/lib/gift';

const ANSWERS = {
    run: 'story',
    durationPicks: {},
    title: 'Maria & Nikos',
    startAt: '2027-06-12T18:00',
    timezone: 'Europe/Athens',
    locationName: 'Agios Nikolaos',
    locationAddress: 'Kifisias 123, Athens',
    mapsUrl: '',
    themePresetId: null,
    gift: { isGift: false, details: EMPTY_GIFT_DETAILS },
    checkoutCode: '',
};

const seed = (step: 'details' | 'theme' | 'overview', eventType: 'WEDDING' | 'BAPTISM', planCode: string) => () => {
    writeCreateEventWizardDraft({ ...ANSWERS, step, eventType, planCode });
};
```

(Check the field list against `CreateEventWizardDraft` in `lib/createEventWizardDraft.ts`; `tsc` will flag a mismatch.)

- [ ] **Step 2: Theme presets for the theme story.** In `meta.beforeEach`, next to the plans handler, add:

```tsx
            http.get('*/api/theme-presets', () =>
                HttpResponse.json([
                    { id: 'swan', key: 'swan', name: { en: 'Swan', el: 'Κύκνος' }, backgroundColor: '#FFF0F1', illustrationUrl: '/landing/03-wedding-ceremony-santorini.webp', titleColor: null, headingFont: null },
                    { id: 'stars', key: 'stars', name: { en: 'Stars', el: 'Αστέρια' }, backgroundColor: '#EEF3FF', illustrationUrl: '/landing/03-wedding-ceremony-santorini.webp', titleColor: null, headingFont: null },
                ]),
            ),
```

The theme step shows only when the plan lists `theme`, and the fixture's `BAPTISM` plan doesn't. Add it for the theme story only, without changing the shared fixture: change the plans handler in `meta.beforeEach` to

```tsx
    beforeEach({ msw, parameters }) {
        // The theme story's baptism plan includes themes; the shared fixture's doesn't.
        const plans = parameters.themePlan
            ? storyWizardPlans.map((plan) => (plan.code === 'BAPTISM' ? { ...plan, moduleKeys: [...plan.moduleKeys, 'theme'] } : plan))
            : storyWizardPlans;
        msw.use(
            http.get(PLANS_URL, ({ request }) => {
                const eventType = new URL(request.url).searchParams.get('eventType');
                return HttpResponse.json(plans.filter((plan) => !eventType || plan.eventTypeKey === eventType));
            }),
            // ...the theme presets handler above
        );
    },
```

If `themeStepAvailable` reads the plan from `appConfig.planTiers` instead of the fetched list (check `hooks/useCreateEventFormController.ts`), also pass a matching `app.appConfig` in the theme story's parameters.

- [ ] **Step 3: Add the stories**

```tsx
export const DetailsStep: Story = {
    parameters: nav({ step: 'details', type: 'wedding', plan: 'STORY' }),
    beforeEach: seed('details', 'WEDDING', 'STORY'),
};

export const DetailsStepEmpty: Story = { parameters: nav({ step: 'details', type: 'wedding', plan: 'STORY' }) };

export const ThemeStep: Story = {
    parameters: { ...nav({ step: 'theme', type: 'baptism', plan: 'BAPTISM' }), themePlan: true },
    beforeEach: seed('theme', 'BAPTISM', 'BAPTISM'),
};

export const ReviewStep: Story = {
    parameters: nav({ step: 'overview', type: 'wedding', plan: 'STORY' }),
    beforeEach: seed('overview', 'WEDDING', 'STORY'),
};
```

The stories use the default signed-in `storyUser` (no `app.user` override), as the review needs a signed-in host until part 4.

- [ ] **Step 4: Build and look at them.** Build Storybook and capture the four new stories at 375 and 1280 with the scratchpad `shots3.mjs` approach (static server, playwright-core, system Chrome). Check: preview card fills as seeded, time zone line, theme grid with heading and line, review card rows and the Pay button with the lock and amount. Watch the console for unhandled MSW requests on the review story (withdrawal terms, partner notice); add a handler returning an empty result in the shape `lib/api/types.ts` gives for any that show up.

Run: `npx storybook build -o storybook-static --quiet`
Expected: build succeeds; screenshots show the four screens with no console errors.

- [ ] **Step 5: Commit**

```bash
git add components/event/create/wizard/CreateEventWizard.stories.tsx
git commit -m "KAN-197: stories for the wizard's details, theme and review steps"
```

---

### Task 10: When to celebrate, and the confetti

**Files:** Create `lib/checkoutCelebration.ts`, `lib/checkoutCelebration.test.ts`, `lib/celebrationConfetti.ts`, `lib/celebrationConfetti.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/checkoutCelebration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { showsCheckoutCelebration } from '@/lib/checkoutCelebration';

describe('showsCheckoutCelebration', () => {
    it("celebrates a paid draft's activation when the wizard is on", () => {
        expect(showsCheckoutCelebration(true, { kind: 'ACTIVATION' })).toBe(true);
    });

    it('keeps today\'s page for upgrades, extensions and storage packs', () => {
        expect(showsCheckoutCelebration(true, { kind: 'UPGRADE' })).toBe(false);
        expect(showsCheckoutCelebration(true, { kind: 'EXTENSION' })).toBe(false);
        expect(showsCheckoutCelebration(true, { kind: 'STORAGE_PACK' })).toBe(false);
    });

    it('waits for the payment', () => {
        expect(showsCheckoutCelebration(true, null)).toBe(false);
    });

    it('stays off with the flag off', () => {
        expect(showsCheckoutCelebration(false, { kind: 'ACTIVATION' })).toBe(false);
    });
});
```

`lib/celebrationConfetti.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const confetti = vi.hoisted(() => Object.assign(vi.fn(), { reset: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: confetti }));

import { fireCelebrationConfetti } from '@/lib/celebrationConfetti';

function motion(reduce: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce') }));
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    confetti.mockClear();
    confetti.reset.mockClear();
});

describe('fireCelebrationConfetti', () => {
    it('fires bursts and clears them on cleanup', () => {
        vi.useFakeTimers();
        motion(false);
        const stop = fireCelebrationConfetti();
        vi.runAllTimers();
        expect(confetti).toHaveBeenCalledTimes(3);
        stop();
        expect(confetti.reset).toHaveBeenCalled();
    });

    it('fires nothing with reduced motion', () => {
        motion(true);
        fireCelebrationConfetti();
        expect(confetti).not.toHaveBeenCalled();
    });
});
```

`window.matchMedia` is what the code reads; `vi.stubGlobal('matchMedia', ...)` sets it on the jsdom window.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run lib/checkoutCelebration.test.ts lib/celebrationConfetti.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/checkoutCelebration.ts`:

```ts
import type { OrderKind } from '@/lib/api/types';

// The celebration replaces the success page only for a draft's first payment (its activation
// order); the event itself is already ACTIVE by then, so its status can't tell.
export function showsCheckoutCelebration(wizardEnabled: boolean, paidOrder: { kind: OrderKind } | null): boolean {
    return wizardEnabled && paidOrder?.kind === 'ACTIVATION';
}
```

`lib/celebrationConfetti.ts`:

```ts
import confetti from 'canvas-confetti';

const COLORS = ['#ff6fa0', '#ff7a59', '#ffb259', '#f3cf8a'];

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Three bursts from the top after a draft goes live. Returns a cleanup that stops and clears them.
export function fireCelebrationConfetti(): () => void {
    if (prefersReducedMotion()) return () => {};

    const bursts = [
        { origin: { x: 0.5, y: 0.25 }, spread: 90, particleCount: 80 },
        { origin: { x: 0.15, y: 0.3 }, spread: 70, angle: 60, particleCount: 45 },
        { origin: { x: 0.85, y: 0.3 }, spread: 70, angle: 120, particleCount: 45 },
    ];
    const timers = bursts.map((burst, index) =>
        window.setTimeout(() => void confetti({ ...burst, startVelocity: 38, gravity: 0.8, ticks: 220, colors: COLORS }), index * 250),
    );

    return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
        confetti.reset();
    };
}
```

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run lib/checkoutCelebration.test.ts lib/celebrationConfetti.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/checkoutCelebration.ts lib/checkoutCelebration.test.ts lib/celebrationConfetti.ts lib/celebrationConfetti.test.ts
git commit -m "KAN-197: when to celebrate after payment, and the confetti"
```

---

### Task 11: The celebration screen

**Files:** Create `hooks/useCheckoutCelebration.ts`, `components/checkout/CheckoutCelebration.tsx`, `components/checkout/CheckoutCelebration.test.tsx`, `components/checkout/CheckoutCelebration.stories.tsx`; Modify `app/(main)/(app)/(event)/events/[eventId]/checkout/success/page.tsx`

- [ ] **Step 1: Write the failing component test** (`components/checkout/CheckoutCelebration.test.tsx`)

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckoutCelebration } from '@/components/checkout/CheckoutCelebration';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const CARD = { photoSrc: '/landing/03-wedding-ceremony-santorini.webp', alt: 'Wedding', title: 'Maria & Nikos', date: 'Sat, 12 June 2027' };

afterEach(cleanup);

describe('CheckoutCelebration', () => {
    it('shows the event card, the heading and both buttons', () => {
        render(<CheckoutCelebration card={CARD} feedHref="/events/e1/feed" inviteHref="/events/e1/manage/qr" />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CheckoutSuccessPage.celebration.heading');
        expect(screen.getByText('CheckoutSuccessPage.celebration.line')).toBeInTheDocument();
        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'CheckoutSuccessPage.celebration.openEvent' })).toHaveAttribute('href', '/events/e1/feed');
        expect(screen.getByRole('link', { name: 'CheckoutSuccessPage.celebration.inviteGuests' })).toHaveAttribute('href', '/events/e1/manage/qr');
    });

    it('shows the heading and buttons before the event has loaded', () => {
        render(<CheckoutCelebration card={null} feedHref="/f" inviteHref="/q" />);
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
```

The reduced-motion rule is covered by `lib/celebrationConfetti.test.ts` (Task 10), which is where the confetti decision lives.

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/checkout/CheckoutCelebration.test.tsx`
Expected: FAIL, cannot resolve `CheckoutCelebration`.

- [ ] **Step 3: The component** (`components/checkout/CheckoutCelebration.tsx`)

```tsx
import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { AppLink } from '@/components/ui/AppLink';

export type CelebrationCard = { photoSrc: string; alt: string; title: string; date: string };

type CheckoutCelebrationProps = { card: CelebrationCard | null; feedHref: string; inviteHref: string };

// After a draft's first payment: the event card, "Your event is live", and where to go next.
export function CheckoutCelebration({ card, feedHref, inviteHref }: CheckoutCelebrationProps) {
    const t = useTranslations('CheckoutSuccessPage.celebration');

    return (
        <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-white px-5 pt-12 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center">
            {/* Event card */}
            {card && (
                <div className="mx-auto w-67.5 -rotate-3 rounded-[28px] bg-white p-2.5 pb-4 shadow-[0_18px_40px_rgba(36,31,26,0.22)] motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in">
                    <span className="relative block h-60 overflow-hidden rounded-[20px]">
                        <ProtectedImage src={card.photoSrc} alt={card.alt} fill sizes="250px" className="object-cover" />
                    </span>
                    <span className="mt-3.5 block truncate px-1.5 font-editorial text-xl text-ink">{card.title}</span>
                    <span className="mt-1 block text-[13px] text-[#6f6257]">{card.date}</span>
                </div>
            )}

            {/* Heading */}
            <h1 className="mt-9 font-editorial text-[30px] leading-[1.15] tracking-[-0.02em] text-ink">{t('heading')}</h1>
            <p className="mt-2.5 text-[15px] leading-[1.45] text-[#5a4e44]">{t('line')}</p>

            <div className="min-h-8 flex-1" />

            {/* Actions */}
            <div className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
                <AppLink
                    href={feedHref}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[15px] font-bold text-ink focus-ring"
                >
                    {t('openEvent')}
                </AppLink>
                <AppLink
                    href={inviteHref}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-[#e4d3c0] bg-white text-[15px] font-semibold text-ink focus-ring"
                >
                    <QrCode aria-hidden="true" className="size-5" />
                    {t('inviteGuests')}
                </AppLink>
            </div>
        </div>
    );
}
```

The `animate-in` utilities are already used in `components/composer/FilterNameOverlay.tsx`; if they don't apply here, drop those three classes.

- [ ] **Step 4: The hook** (`hooks/useCheckoutCelebration.ts`)

```ts
'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

import type { CelebrationCard } from '@/components/checkout/CheckoutCelebration';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEvent } from '@/hooks/useEvent';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { OrderSummaryDto } from '@/lib/api/types';
import { fireCelebrationConfetti } from '@/lib/celebrationConfetti';
import { showsCheckoutCelebration } from '@/lib/checkoutCelebration';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { formatEventDateParts } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

export function useCheckoutCelebration(eventId: string, paidOrder: OrderSummaryDto | null) {
    const locale = useLocale();
    const show = showsCheckoutCelebration(useCreateWizardEnabled(), paidOrder);
    const { data: event } = useEvent(show ? eventId : null);
    const { data: appConfig } = useAppConfig();
    const typeCopy = useLocalizedAppEventTypeCopy();

    // Once, when the screen appears. Nothing fires with reduced motion.
    useEffect(() => (show ? fireCelebrationConfetti() : undefined), [show]);

    const imageUrl = event ? (appConfig?.eventTypes.find((type) => type.eventTypeKey === event.eventType)?.imageUrl ?? null) : null;
    const card: CelebrationCard | null = event
        ? {
              photoSrc: createEventTypePhoto(event.eventType, imageUrl),
              alt: typeCopy(event.eventType).name,
              title: event.title,
              date: formatEventDateParts(locale, event.schedule.startAt, null, event.schedule.timezone)?.date ?? '',
          }
        : null;

    return { show, card, feedHref: routes.events.feed(eventId), inviteHref: routes.events.invitationsQr(eventId) };
}
```

- [ ] **Step 5: The page.** In `checkout/success/page.tsx`:

  - Import `CheckoutCelebration` and `useCheckoutCelebration`.
  - After `paidOrder`, add `const celebration = useCheckoutCelebration(eventId, paidOrder);`.
  - In the redirect effect, change the guard to `if (!paid || celebration.show) return;` and add `celebration.show` to its dependency list.
  - After all hooks, before today's `return`, add:

```tsx
    if (celebration.show) {
        return (
            <main>
                {/* Celebration */}
                <CheckoutCelebration card={celebration.card} feedHref={celebration.feedHref} inviteHref={celebration.inviteHref} />
                {/* Ad conversion tags, only with the visitor's consent */}
                <CheckoutConversionTags purchase={paidOrder} />
            </main>
        );
    }
```

Everything else on the page (processing, timed out, upgrades, the 5-second redirect) stays as it is.

- [ ] **Step 6: Story** (`components/checkout/CheckoutCelebration.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CheckoutCelebration } from '@/components/checkout/CheckoutCelebration';

const meta = {
    title: 'Checkout/CheckoutCelebration',
    component: CheckoutCelebration,
    parameters: { layout: 'fullscreen' },
    args: {
        card: { photoSrc: '/landing/03-wedding-ceremony-santorini.webp', alt: 'Wedding', title: 'Maria & Nikos', date: 'Sat, 12 June 2027' },
        feedHref: '/events/evt-story/feed',
        inviteHref: '/events/evt-story/manage/qr',
    },
} satisfies Meta<typeof CheckoutCelebration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongTitle: Story = {
    args: { card: { photoSrc: '/landing/03-wedding-ceremony-santorini.webp', alt: 'Wedding', title: 'Alexandra & Konstantinos Papadopoulos', date: 'Sat, 12 June 2027' } },
};
```

If the repo's stories need `withAppContext` for `AppLink`, add `decorators: [withAppContext]` as the wizard stories do.

- [ ] **Step 7: Run tests and types**

Run: `npx vitest run components/checkout lib && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add hooks/useCheckoutCelebration.ts components/checkout/CheckoutCelebration.tsx components/checkout/CheckoutCelebration.test.tsx components/checkout/CheckoutCelebration.stories.tsx "app/(main)/(app)/(event)/events/[eventId]/checkout/success/page.tsx"
git commit -m "KAN-197: celebration after a draft's first payment"
```

---

### Task 12: Full checks and a look in the app

- [ ] **Step 1: Automated checks**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run && npx next build`
Expected: all clean (0 lint errors). Revert `AGENTS.md` if the build touched it.

- [ ] **Step 2: Click through in the real app.** With the local recipe (`.env.local`, scratchpad `cors-shim2.mjs` on :8080, `next dev --webpack -p 3101` against staging data), extend the scratchpad `flow2.mjs` from the plan step on, at 375 and 1280:
  - Details: the preview card updates while typing the title, date and place; "Change" opens the time zone field; Continue is off until the form is valid, then goes on.
  - Theme (pick baptism with a plan that has themes): heading and line, picking a theme, Continue to review.
  - Review: card rows, Edit goes to details, Change goes to the plan, Back returns to review's previous step; the Pay button shows the amount with a lock and stays off until both boxes are ticked. Don't press Pay against staging.
  - Phone Back across the steps; reload on each step keeps the answers.
  - No page errors.
  Signed-out runs stop at review until part 4 adds the account step; check review signed in (memory note "Browser pane and signed-in UI": ask the user for the local test login).

- [ ] **Step 3: Celebration.** It needs a paid activation, so check it in Storybook (Task 11 story at 375 and 1280, and with reduced motion emulated: no confetti) and on staging after merge with a test payment, per the release checklist.

- [ ] **Step 4: SEO.** No new routes or metadata; the checkout success page is not indexed. Note "no SEO blockers" in the PR.

---

## Self-review notes

- **Spec 5.5:** preview card (Task 4), today's fields and gift toggle via `EventDetailsStep` (Task 3), time zone line with Change (Task 4), Continue (Task 7). Rows 42–46 in Task 1; rows 76–77 removed in the wizard by `showScheduleHint={false}`.
- **Spec 5.6:** `ThemePresetRadioGroup` unchanged inside `EventThemeStep`; new heading and line (Task 5); shown only when it applies (unchanged step list). Row 78 removed by `showHint={false}`.
- **Spec 5.10:** heading, summary card with Edit and Change (Task 6); today's price lines, discount, notices and withdrawal boxes via `EventOverviewStep` (Task 6); "Pay {amount}" with a lock and today's submit logic through the same form submit (Task 7).
- **Spec 5.11:** confetti, tilted card, heading and line, two buttons, no redirect on this screen, other states unchanged (Tasks 10–11). Stickers left out (spec 6).
- **Spec 6 / 8:** ink label on gradient buttons; reduced motion skips confetti; one `h1` per step; alt text on every photo is the type name.
- **User decisions 2026-11-11** are listed under "Decisions taken while planning" item 4.
