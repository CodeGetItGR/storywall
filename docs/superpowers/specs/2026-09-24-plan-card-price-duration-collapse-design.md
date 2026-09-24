# Plan card: price layout, duration label, mobile collapse

## Problem

`MarketingPlanCard` is shared by the create-event plan step (`EventPlanSelector`) and the landing
pricing section (`LandingPricing`). Three issues:

1. **The price overlaps the text.** The price is absolutely positioned top-right. The text
   reserves `pr-24` (96px), but a price like "179€" at `clamp(48px,4vw,64px)` is wider than that,
   so it runs over "25 GB Αποθηκευτικός χώρος".
2. **The duration switch has no label.** "3μ | 6μ | 9μ" gives no hint of what it is.
3. **Stacked cards are long on mobile.** Below 761px the three cards stack. Each one shows its full
   feature list, so comparing plans means a lot of scrolling.

## What the duration means

The months count from the **event date**. When they run out, the event is unpublished and guests
lose access. The host then has 30 days to download wishes, photos and videos, and after that
everything is deleted. The card only needs to say what's being bought: how long the event stays
online after the event date. The 30-day host window isn't mentioned on the card.

## Design

Applies to both the create-event plan step and the landing pricing section.

### Card layout (all widths)

The same order top to bottom, whether the card is open or closed:

1. Plan name + "most popular" (featured card only)
2. Guests line (`plan.audience`) and storage line, as today
3. **Price, top right, in normal flow.** Same gradient serif style and size. Rows 1–3 form a
   wrapping flex row: the text column sits left and wraps beside the price, and the price sits right.
   When the name can't fit next to the price (narrow three-column widths, roughly 761–1000px on the
   landing page), the price drops below the text instead of overlapping it. Nothing is positioned
   absolutely any more, so it can't overlap at any width or price length.
4. **Label: "Online μετά την εκδήλωση" / "Online after your event"**
5. Duration switch (`DurationPicker`, marketing variant), unchanged. A plan sold at a single
   length shows "9 μήνες" as text under the same label.
6. Feature list
7. Selection text (ΕΠΙΛΕΞΕ ΠΑΚΕΤΟ / ΕΠΙΛΕΓΜΕΝΟ) in the create flow, or the per-card CTA footer on the
   landing page

The `min-h-26.5 pr-24` on the identity block goes away, since it only existed to make room for the
absolute price.

### Mobile collapse (below 761px, when the cards stack)

- A collapsed card shows rows 1–5 and 7. Only the feature list (row 6) is hidden.
- An arrow button at the bottom right of the card toggles the feature list. It uses `aria-expanded`
  and `aria-controls` (pointing at the list), and a localized accessible name ("Show features" /
  "Hide features"). The chevron rotates when open.
- **The first card in order starts open. The others start closed.** Each card toggles on its own,
  so several can be open at once.
- Tapping the card body still selects the plan in the create flow (stretched select button, as
  today). The arrow and the duration switch sit above that button (`relative z-10`), so they don't
  select the plan.
- On the landing page, the per-card CTA footer stays visible while the card is collapsed.
- At 761px and up there's no arrow and the feature list always shows, whatever the open state
  (e.g. `hidden min-[761px]:block` on the list when collapsed; the arrow is `min-[761px]:hidden`).

## Code changes

- **`components/plan/MarketingPlanCard.tsx`**
  - Restructure the identity block: name → audience → storage → price (in flow) → label →
    `DurationPicker`.
  - New props: `durationLabel: string`, `defaultExpanded?: boolean`, `expandLabel: string`,
    `collapseLabel: string`. The labels come from the parent, the same way `storageLabel` and
    `popularLabel` do today.
  - Mark it `'use client'`, since it now holds state. It is only used from client components.
  - Keep the JSX section comments (Plan identity, Price, Duration, Plan features, Expand, Selection
    and footer).
- **New `hooks/useDisclosure.ts`** (no existing open/toggle hook in `hooks/`): `useDisclosure(defaultOpen)`
  → `{ open, toggle }`. Keeps the card free of state logic.
- **New `components/plan/PlanCardExpandToggle.tsx`**: the arrow button (chevron icon, `aria-expanded`,
  `aria-controls`, accessible name, mobile-only, `relative z-10`).
- **`components/plan/DurationPicker.tsx`**: add an optional `labelledBy` prop. When set, the
  radiogroup uses `aria-labelledby` instead of the generic `aria-label={t('label')}`, so screen
  readers announce the visible label. The single-duration text case is unaffected.
- **`components/plan/EventPlanSelector.tsx`** and **`components/landing/LandingPricing.tsx`**: pass
  `durationLabel`, `expandLabel`, `collapseLabel`, and `defaultExpanded={index === 0}`.
- **`messages/el.json`, `messages/en.json`** under `LandingPage.pricing`:
  - `durationLabel`: "Online μετά την εκδήλωση" / "Online after your event"
  - `showFeatures`: "Δείτε τα χαρακτηριστικά" / "Show features"
  - `hideFeatures`: "Απόκρυψη χαρακτηριστικών" / "Hide features"

## Out of scope

- Checkout and billing "Photos kept until…" copy, which skips the unpublish + 30-day download
  window. Tracked as a separate task.
- The uncommitted change in `components/event/create/EventTypeStep.tsx`.

## Verification

- `tsc` and lint pass.
- Screenshots of the create-event plan step and the landing pricing section at mobile (375px) and
  desktop widths, plus a narrow 3-column width (~780px), to check that:
  - the price never overlaps and the label and switch fit;
  - on mobile the first card is open, the others are closed, and the arrow toggles each one;
  - tapping the card selects it, while tapping the arrow or the switch doesn't;
  - there is no arrow on desktop and all features show.
- Use `preview_start` with `{url: "http://localhost:3000/"}` only (never by name; see memory).
