# Plan Card Price, Duration Label and Mobile Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the plan price from overlapping the card text, label the duration switch, and let stacked plan cards collapse their feature list on mobile.

**Architecture:** All changes live in the shared `MarketingPlanCard`, used by the create-event plan step (`EventPlanSelector`) and the landing pricing section (`LandingPricing`). The price moves into normal flow above a new visible duration label. A small `useDisclosure` hook holds each card's open state, and a mobile-only `PlanCardExpandToggle` shows and hides the feature list below 761px. Both parents pass the new copy and open the first card by default.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, next-intl, lucide-react, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-24-plan-card-price-duration-collapse-design.md`

**Repo rules that apply (from `CLAUDE.md`):**
- JSX comment above every visual section boundary.
- All visible copy and aria labels are localized (el + en).
- Keep state logic in hooks, and keep components as render shells.
- Run TypeScript and lint before handing back, and fix every lint error.
- Visual check at mobile (primary for this audience) and desktop.
- **Never** `preview_start` by name, and never run `npm run dev` yourself. `dev` wipes the shared `.next`. Only use `preview_start {url: "http://localhost:3000/"}` against the user's running server.
- Don't commit or push unless the user asks. The working tree has an unrelated change in `components/event/create/EventTypeStep.tsx`. Never stage it.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `hooks/useDisclosure.ts` | Create | Open/closed flag + toggle for a show/hide section |
| `hooks/useDisclosure.test.ts` | Create | Hook tests |
| `components/plan/DurationPicker.tsx` | Modify | Optional `labelledBy`, so the radiogroup is named by a visible label |
| `components/plan/DurationPicker.test.tsx` | Create | Accessible-name tests |
| `components/plan/PlanCardExpandToggle.tsx` | Create | Mobile-only chevron button that shows and hides a card's features |
| `components/plan/MarketingPlanCard.tsx` | Modify | Price in flow, duration label, collapsible feature list |
| `components/plan/MarketingPlanCard.test.tsx` | Create | Label, collapse and selection behavior |
| `components/plan/EventPlanSelector.tsx` | Modify | Pass new labels + `defaultExpanded={index === 0}` |
| `components/landing/LandingPricing.tsx` | Modify | Same as above |
| `messages/en.json`, `messages/el.json` | Modify | `LandingPage.pricing.durationLabel`, `showFeatures`, `hideFeatures` |

---

### Task 0: Load the UI skill

- [ ] **Step 1:** `CLAUDE.md` requires a UI/UX skill before UI work on an existing product surface. Invoke `design:design-system` and skim it for anything that conflicts with this plan. The marketing card has its own fixed ink (`#151313`) and doesn't use app theme tokens. Keep that as is.

---

### Task 1: `useDisclosure` hook

**Files:**
- Create: `hooks/useDisclosure.ts`
- Test: `hooks/useDisclosure.test.ts`

- [ ] **Step 1: Write the failing test**

`hooks/useDisclosure.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDisclosure } from '@/hooks/useDisclosure';

describe('useDisclosure', () => {
    it('starts closed by default', () => {
        const { result } = renderHook(() => useDisclosure());
        expect(result.current.open).toBe(false);
    });

    it('starts open when asked', () => {
        const { result } = renderHook(() => useDisclosure(true));
        expect(result.current.open).toBe(true);
    });

    it('flips on each toggle', () => {
        const { result } = renderHook(() => useDisclosure());

        act(() => result.current.toggle());
        expect(result.current.open).toBe(true);

        act(() => result.current.toggle());
        expect(result.current.open).toBe(false);
    });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run hooks/useDisclosure.test.ts`
Expected: FAIL. The import of `@/hooks/useDisclosure` can't be resolved.

- [ ] **Step 3: Implement**

`hooks/useDisclosure.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';

// An open/closed flag for a section the user can show and hide, such as a
// plan card's feature list on mobile.
export function useDisclosure(defaultOpen = false) {
    const [open, setOpen] = useState(defaultOpen);
    const toggle = useCallback(() => setOpen((current) => !current), []);

    return { open, toggle };
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run hooks/useDisclosure.test.ts`
Expected: 3 passed.

---

### Task 2: `DurationPicker` takes a visible label

**Files:**
- Modify: `components/plan/DurationPicker.tsx` (props at lines 30-44, radiogroup at lines 67-74)
- Test: `components/plan/DurationPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/plan/DurationPicker.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DurationPicker } from '@/components/plan/DurationPicker';

const messages = {
    Durations: {
        label: 'Duration',
        short: '{count}m',
        months: '{count, plural, one {# month} other {# months}}',
    },
};

const options = [
    { id: 'd6', months: 6 },
    { id: 'd9', months: 9 },
];

function renderPicker(labelledBy?: string) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <p id="duration-label">Online after your event</p>
            <DurationPicker options={options} value="d6" onChangeAction={vi.fn()} labelledBy={labelledBy} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('DurationPicker', () => {
    it('is named by the visible label it is linked to', () => {
        renderPicker('duration-label');
        expect(screen.getByRole('radiogroup', { name: 'Online after your event' })).toBeInTheDocument();
    });

    it('falls back to the generic label when none is linked', () => {
        renderPicker();
        expect(screen.getByRole('radiogroup', { name: 'Duration' })).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run components/plan/DurationPicker.test.tsx`
Expected: The first test FAILS (no radiogroup named "Online after your event"). The second passes.

- [ ] **Step 3: Implement**

In `components/plan/DurationPicker.tsx`, add the prop to the destructuring and the type:

```tsx
export function DurationPicker({
    options,
    value,
    onChangeAction,
    variant = 'app',
    disabled = false,
    labelledBy,
    className,
}: {
    options: DurationPickerOption[];
    value: string | null;
    onChangeAction: (optionId: string) => void;
    variant?: keyof typeof VARIANT_CLASSES;
    disabled?: boolean;
    // Id of a visible label that names the switch; falls back to a generic one.
    labelledBy?: string;
    className?: string;
}) {
```

Then replace the radiogroup's `aria-label={t('label')}` line with:

```tsx
            aria-label={labelledBy ? undefined : t('label')}
            aria-labelledby={labelledBy}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run components/plan/DurationPicker.test.tsx`
Expected: 2 passed.

---

### Task 3: `PlanCardExpandToggle` component

**Files:**
- Create: `components/plan/PlanCardExpandToggle.tsx`

This is covered by the card tests in Task 5. It has no logic of its own.

- [ ] **Step 1: Create the component**

`components/plan/PlanCardExpandToggle.tsx`:

```tsx
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

// Mobile-only arrow that shows and hides a plan card's feature list. It sits
// above the card's stretched select button, so tapping it doesn't pick the plan.
export function PlanCardExpandToggle({
    open,
    controlsId,
    expandLabel,
    collapseLabel,
    onToggleAction,
}: {
    open: boolean;
    controlsId: string;
    expandLabel: string;
    collapseLabel: string;
    onToggleAction: () => void;
}) {
    return (
        <div className="flex justify-end min-[761px]:hidden">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={controlsId}
                aria-label={open ? collapseLabel : expandLabel}
                onClick={onToggleAction}
                className="relative z-10 inline-flex size-11 items-center justify-center rounded-full text-[#151313]/70 focus-ring transition-colors hover:text-[#151313]"
            >
                <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
        </div>
    );
}
```

---

### Task 4: Copy

**Files:**
- Modify: `messages/en.json` (`LandingPage.pricing`, around line 3681)
- Modify: `messages/el.json` (`LandingPage.pricing`, around line 3801)

- [ ] **Step 1: English.** In `messages/en.json`, inside `LandingPage.pricing`, replace

```json
            "categoryLabel": "Event category",
            "storageLabel": "Storage",
```

with

```json
            "categoryLabel": "Event category",
            "storageLabel": "Storage",
            "durationLabel": "Online after your event",
            "showFeatures": "Show features",
            "hideFeatures": "Hide features",
```

- [ ] **Step 2: Greek.** In `messages/el.json`, inside `LandingPage.pricing`, replace

```json
            "categoryLabel": "Κατηγορία event",
            "storageLabel": "Αποθηκευτικός χώρος",
```

with

```json
            "categoryLabel": "Κατηγορία event",
            "storageLabel": "Αποθηκευτικός χώρος",
            "durationLabel": "Online μετά την εκδήλωση",
            "showFeatures": "Δείτε τα χαρακτηριστικά",
            "hideFeatures": "Απόκρυψη χαρακτηριστικών",
```

- [ ] **Step 3: Check both files still parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/el.json','utf8'));console.log('ok')"`
Expected: `ok`

---

### Task 5: Restructure `MarketingPlanCard`

**Files:**
- Modify: `components/plan/MarketingPlanCard.tsx` (whole file)
- Test: `components/plan/MarketingPlanCard.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/plan/MarketingPlanCard.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import type { LandingPlan } from '@/lib/landingPricing';

const messages = {
    Durations: {
        label: 'Duration',
        short: '{count}m',
        months: '{count, plural, one {# month} other {# months}}',
    },
};

const plan: LandingPlan = {
    code: 'STORY',
    name: 'STORY',
    audience: 'Up to 300 guests',
    storage: '25 GB',
    photos: '',
    videos: '',
    features: ['Everything in START', 'RSVP'],
    durations: [
        { id: 'd6', months: 6, price: '99€' },
        { id: 'd9', months: 9, price: '109€' },
    ],
    defaultDurationId: 'd9',
};

function renderCard({ defaultExpanded, onSelectAction }: { defaultExpanded?: boolean; onSelectAction?: (code: string) => void } = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <MarketingPlanCard
                featured={false}
                plan={plan}
                popularLabel="most popular"
                storageLabel="Storage"
                durationLabel="Online after your event"
                expandLabel="Show features"
                collapseLabel="Hide features"
                defaultExpanded={defaultExpanded}
                selectionLabel="CHOOSE PLAN"
                onSelectAction={onSelectAction}
            />
        </NextIntlClientProvider>,
    );
}

function featureListOf(toggle: HTMLElement) {
    return document.getElementById(toggle.getAttribute('aria-controls') ?? '');
}

afterEach(cleanup);

describe('MarketingPlanCard', () => {
    it('names the duration switch with its visible label', () => {
        renderCard();
        expect(screen.getByText('Online after your event')).toBeInTheDocument();
        expect(screen.getByRole('radiogroup', { name: 'Online after your event' })).toBeInTheDocument();
    });

    it('starts with the feature list collapsed on mobile', () => {
        renderCard();
        const toggle = screen.getByRole('button', { name: 'Show features' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(featureListOf(toggle)).toHaveClass('hidden');
    });

    it('starts open when defaultExpanded is set', () => {
        renderCard({ defaultExpanded: true });
        const toggle = screen.getByRole('button', { name: 'Hide features' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(featureListOf(toggle)).not.toHaveClass('hidden');
    });

    it('opens the feature list without selecting the plan', () => {
        const onSelectAction = vi.fn();
        renderCard({ onSelectAction });

        fireEvent.click(screen.getByRole('button', { name: 'Show features' }));

        const toggle = screen.getByRole('button', { name: 'Hide features' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(featureListOf(toggle)).not.toHaveClass('hidden');
        expect(onSelectAction).not.toHaveBeenCalled();
    });

    it('selects the plan when the card is tapped', () => {
        const onSelectAction = vi.fn();
        renderCard({ onSelectAction });

        fireEvent.click(screen.getByRole('button', { name: 'STORY' }));

        expect(onSelectAction).toHaveBeenCalledWith('STORY');
    });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run components/plan/MarketingPlanCard.test.tsx`
Expected: The label and toggle tests FAIL (no "Online after your event" text, no "Show features" button). "selects the plan when the card is tapped" passes.

- [ ] **Step 3: Implement.** Replace the whole of `components/plan/MarketingPlanCard.tsx` with:

```tsx
'use client';

import { type ReactNode, useId } from 'react';

import { DurationPicker } from '@/components/plan/DurationPicker';
import { PlanCardExpandToggle } from '@/components/plan/PlanCardExpandToggle';
import { useDisclosure } from '@/hooks/useDisclosure';
import { type LandingPlan, pickedLandingDuration } from '@/lib/landingPricing';
import { cn } from '@/lib/utils';

type MarketingPlanCardProps = {
    featured: boolean;
    plan: LandingPlan;
    popularLabel: string;
    storageLabel: string;
    durationLabel: string;
    expandLabel: string;
    collapseLabel: string;
    // Whether the feature list starts open on mobile. Desktop always shows it.
    defaultExpanded?: boolean;
    // The duration picked on this card; the plan's default until one is.
    durationId?: string | null;
    onDurationChangeAction?: (planCode: string, optionId: string) => void;
    selected?: boolean;
    selectionLabel?: string;
    onSelectAction?: (planCode: string) => void;
    footer?: ReactNode;
};

export function MarketingPlanCard({
    featured,
    plan,
    popularLabel,
    storageLabel,
    durationLabel,
    expandLabel,
    collapseLabel,
    defaultExpanded = false,
    durationId,
    onDurationChangeAction,
    selected = false,
    selectionLabel,
    onSelectAction,
    footer,
}: MarketingPlanCardProps) {
    const duration = pickedLandingDuration(plan, durationId);
    const { open, toggle } = useDisclosure(defaultExpanded);
    const durationLabelId = useId();
    const featuresId = useId();

    function handleSelect() {
        onSelectAction?.(plan.code);
    }

    function handleDurationChange(optionId: string) {
        onDurationChangeAction?.(plan.code, optionId);
    }

    const cardClassName = cn(
        'relative flex h-full w-full flex-col justify-between rounded-[22px] border px-5 pt-5 pb-4 text-left text-[#151313] transition-colors min-[761px]:px-5',
        onSelectAction && !selected && 'hover:border-[#151313]/25',
        {
            'border-transparent': !featured && !selected,
            'border-[#f29380]': featured && !selected,
            'border-[#151313]/25 bg-[#fff9f6]': selected,
        },
    );

    const content = (
        <>
            {/* Select plan: stretched over the whole card; only the duration picker, expand arrow and footer sit above it */}
            {onSelectAction && (
                <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={plan.name}
                    onClick={handleSelect}
                    className="absolute inset-0 z-[1] rounded-[22px] focus-ring focus-visible:outline-offset-2"
                />
            )}

            <div>
                {/* Plan identity */}
                <div>
                    <h3 className="text-[clamp(20px,1.65vw,27px)] leading-[1.05] font-black tracking-[.09em]">
                        {plan.name}
                        <span className="ml-2 inline-block align-middle text-[9px] leading-none font-bold tracking-widest normal-case">
                            {featured ? popularLabel : null}
                        </span>
                    </h3>
                    <p className="mt-1 text-sm text-[#151313]/65">{plan.audience}</p>
                    <p className="mt-1 text-sm text-[#151313]/65">
                        {plan.storage} {storageLabel}
                    </p>
                </div>

                {/* Price */}
                <p className="mt-3 w-fit bg-[linear-gradient(110deg,#d889a0,#e98778_28%,#f39a63_58%,#f5b967)] bg-clip-text font-[Baskerville,Georgia,serif] text-[clamp(48px,4vw,64px)] leading-[1.1] tracking-[-.06em] text-transparent">
                    {duration.price}
                </p>

                {/* Duration */}
                <p id={durationLabelId} className="mt-2 text-[13px] text-[#151313]/65">
                    {durationLabel}
                </p>
                <DurationPicker
                    options={plan.durations}
                    value={duration.id}
                    onChangeAction={handleDurationChange}
                    variant="marketing"
                    labelledBy={durationLabelId}
                    className="relative z-10 mt-1.5 mb-2"
                />

                {/* Plan features: collapsible on mobile, always shown on desktop */}
                <ul id={featuresId} className={cn('mb-0 list-none p-0', !open && 'hidden min-[761px]:block')}>
                    {plan.features.map((feature, index) => (
                        <li
                            className="relative border-b border-[#151313]/10 py-2.75 pr-1 pl-6 text-[13px] leading-[1.4] before:absolute before:top-2.75 before:left-0 before:content-['✓'] min-[761px]:text-sm"
                            key={`${plan.name}-${feature}`}
                        >
                            <span
                                className={cn(
                                    index === 0 && plan.includedFeatures ? 'font-bold' : '',
                                    featured && index > 0 && index < plan.features.length - 1 ? 'font-bold' : '',
                                )}
                            >
                                {feature}
                            </span>
                            {index === 0 && plan.includedFeatures && (
                                <span className="mt-1 block text-[12px] leading-[1.55] text-[#151313]/70">({plan.includedFeatures.join(' · ')})</span>
                            )}
                        </li>
                    ))}
                </ul>

                {/* Expand (mobile only) */}
                <PlanCardExpandToggle
                    open={open}
                    controlsId={featuresId}
                    expandLabel={expandLabel}
                    collapseLabel={collapseLabel}
                    onToggleAction={toggle}
                />
            </div>

            {/* Selection and footer */}
            <div>
                {selectionLabel && (
                    <p className={cn('mt-4 text-center text-[12px] font-black tracking-[.12em]', selected ? 'text-[#151313]' : 'text-[#151313]/70')}>
                        {selectionLabel}
                    </p>
                )}
                {footer && <div className="relative z-10">{footer}</div>}
            </div>
        </>
    );

    if (onSelectAction) return <div className={cardClassName}>{content}</div>;

    return <article className={cardClassName}>{content}</article>;
}
```

> **Revised after review:** the user preferred the price top right. In the shipped version, the identity block and price share a `flex flex-wrap items-start justify-between gap-x-3` row. The text column is `flex-1 basis-36` and the price is `shrink-0`, so the price drops below the text only when the name can't fit beside it. See the spec's Card layout section.

The only changes from the current file:
- `'use client'`, plus new imports (`useId`, `PlanCardExpandToggle`, `useDisclosure`) and the four new props.
- The identity block loses `relative min-h-26.5 pr-24`.
- The price is a normal-flow `<p>` with `mt-3 w-fit leading-[1.1]`. It is no longer `absolute top-0 right-0`. `w-fit` keeps the gradient spanning just the price, as before.
- A new visible duration label is added, linked to the switch through `labelledBy`.
- The feature list gets an `id` and `hidden min-[761px]:block` while collapsed.
- `PlanCardExpandToggle` is added after the list.

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run components/plan/MarketingPlanCard.test.tsx`
Expected: 5 passed.

---

### Task 6: Wire both parents

**Files:**
- Modify: `components/plan/EventPlanSelector.tsx:44-57`
- Modify: `components/landing/LandingPricing.tsx:88-99`

- [ ] **Step 1: Create-event plan step.** In `components/plan/EventPlanSelector.tsx`, replace the `options.map(...)` block with:

```tsx
                        {options.map(({ config, featured, presentation }, index) => (
                            <MarketingPlanCard
                                key={config.id}
                                plan={presentation}
                                durationId={durationPicks[config.code]}
                                onDurationChangeAction={onSelectDurationAction}
                                featured={featured}
                                popularLabel={tPricing('popular')}
                                storageLabel={tPricing('storageLabel')}
                                durationLabel={tPricing('durationLabel')}
                                expandLabel={tPricing('showFeatures')}
                                collapseLabel={tPricing('hideFeatures')}
                                defaultExpanded={index === 0}
                                selected={selectedCode === config.code}
                                selectionLabel={selectedCode === config.code ? t('planSelected') : tPricing('choose')}
                                onSelectAction={onSelectAction}
                            />
                        ))}
```

- [ ] **Step 2: Landing pricing.** In `components/landing/LandingPricing.tsx`, replace the `<MarketingPlanCard ... />` element inside `categories[category].plans.map((plan, index) => (...))` with:

```tsx
                        <MarketingPlanCard
                            featured={index === 1}
                            footer={<LandingPricingCta className="mt-5 flex w-full min-[761px]:hidden" label={t('cta')} />}
                            key={`${category}-${plan.code}`}
                            plan={plan}
                            durationId={picks[plan.code]}
                            onDurationChangeAction={pickDuration}
                            popularLabel={t('popular')}
                            storageLabel={t('storageLabel')}
                            durationLabel={t('durationLabel')}
                            expandLabel={t('showFeatures')}
                            collapseLabel={t('hideFeatures')}
                            defaultExpanded={index === 0}
                        />
```

The cards are keyed by `${category}-${plan.code}`, so switching category remounts them and the first card opens again. That is intended.

---

### Task 7: Types, lint, tests

- [ ] **Step 1: TypeScript**

Run: `npm run type:check`
Expected: exits 0 with no errors. If an error mentions `durationLabel`, `expandLabel` or `collapseLabel` missing on `MarketingPlanCard`, there is another call site. Find it with `grep -rn "MarketingPlanCard" --include=*.tsx components app` (ignore `.claude/worktrees`) and pass the same three labels there.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. Fix any that appear in the touched files.

- [ ] **Step 3: Prettier on touched files**

Run: `npx prettier --check hooks/useDisclosure.ts hooks/useDisclosure.test.ts components/plan/DurationPicker.tsx components/plan/DurationPicker.test.tsx components/plan/PlanCardExpandToggle.tsx components/plan/MarketingPlanCard.tsx components/plan/MarketingPlanCard.test.tsx components/plan/EventPlanSelector.tsx components/landing/LandingPricing.tsx messages/en.json messages/el.json`
Expected: all files pass. If not, run the same command with `--write` in place of `--check`.

- [ ] **Step 4: Full test suite**

Run: `npm test`
Expected: all tests pass, including the 10 new ones. `hooks/useLandingPricingPlans.test.tsx` must still pass.

---

### Task 8: Visual check

- [ ] **Step 1: Confirm the user's dev server is up**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200`. If it isn't, **stop and ask the user to start their dev server**. Don't start it yourself.

- [ ] **Step 2: Open the browser pane**

`preview_start` with `{url: "http://localhost:3000/"}` (never by name).

- [ ] **Step 3: Landing pricing, mobile.** `resize_window` preset `mobile`, reload, then scroll to `#pricing` and screenshot. Check that:
  - START is open and STORY and SIGNATURE are collapsed, showing name, guests, storage, price, "Online μετά την εκδήλωση", the switch, the arrow and the CTA;
  - tapping an arrow opens and closes that card only, and the chevron flips;
  - the price doesn't overlap anything.

- [ ] **Step 4: Create-event plan step, mobile.** Go to `http://localhost:3000/events/new`, pick a type, then continue to the Plan step (this needs the user's signed-in session in the pane; if it's missing, ask the user). Screenshot and check that:
  - the same open/closed defaults apply;
  - tapping the card body selects it (ΕΠΙΛΕΓΜΕΝΟ + tinted card);
  - tapping the arrow or a duration button doesn't change the selection.

- [ ] **Step 5: Desktop.** `resize_window` preset `desktop`, then screenshot both pages. Check that:
  - there's no arrow and every feature list shows;
  - the prices sit on their own row with no overlap;
  - the switches line up reasonably across the three cards.

- [ ] **Step 6: Narrow three-column.** `resize_window` to `780 x 900`. Screenshot the landing pricing (its cards are the narrowest) and check that the label and switch fit without horizontal overflow. If "50 GB Αποθηκευτικός χώρος" wraps and throws the switches out of line across cards, report it to the user rather than adding alignment hacks.

- [ ] **Step 7: Reset.** `resize_window` preset `desktop`.

---

### Task 9: Hand-off

- [ ] **Step 1:** Report to the user:
  - what changed;
  - screenshots taken (mobile + desktop);
  - test, type and lint results;
  - anything that looked off in Task 8.
- [ ] **Step 2:** Ask whether to commit. If yes, confirm the branch (the repo is on `main`, so create a branch first). Stage only the files in the File Structure table plus the spec and this plan. **Do not stage `components/event/create/EventTypeStep.tsx`.** End the commit message with the attribution line from the session instructions.
