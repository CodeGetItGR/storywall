# Billing with Everything Open Implementation Plan (KAN-229)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the host's Billing page from the approved mockup: one page, no tabs or per-action sheets, in this order: Your plan, Upgrade options, Extend coverage, Paid add-ons, Order history (right column on desktop). Today's blocks and wording, laid out like the mockup.

**Architecture:** `BillingTab` stays a thin composition shell: a main column and a 320px side column on `lg`, one column on phones. Each block is a presentational component under `components/manage/billing/`; the logic lives in hooks (`useBillingPlanCard`, `useCoverageExtensionSection` with a picked option, `useBillingUpgradeRows`). The manage page prefetches the billing reads on a full page load of `?tab=billing`. Old `?tab=plan|orders|coverage` links land on Billing. No backend change.

**Tech Stack:** Next.js App Router, React 19, next-intl, TanStack Query, Tailwind v4, Vitest + Testing Library, Storybook.

**Mockups:** `project/Billing-mobile.dc.html` and `project/Billing-desktop.dc.html` on the "Host Overview redesign" canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`).

---

## Decisions (owner, 2026-11-17)

- **Your plan:** a soft gradient card: "Your plan" label, plan name, the discount line and draft note as today, then "Photos kept until", Storage and Members. Storage and Members show `used / limit` with a bar, like the Members page; "Unlimited" when there is no limit.
- **Upgrade options:** one bordered card per plan, like the mockup: name and `{amount} now`; with a discount code, the crossed-out price and the code's label in small grey before it; the length picker; `+N months of coverage`; a "What changes" label over today's ✓ lines; when the upgrade drops features, today's red "No longer included" list; Upgrade button. The feature descriptions ("New modules") leave Billing.
- **Extend coverage:** the lengths as tiles to pick from (shortest picked first), then today's "New end date: {date} (estimate)" for the pick and one "Extend · {price}" button.
- **Paid add-ons:** each owned add-on as a soft row with an icon; today's button ("Manage add-ons" / "Add storage") under them, outlined.
- **Order history:** rows on every screen size (no desktop table): icon, type, status pill, date, amount, coverage line, and inside the window "Withdraw from contract here", which opens today's withdrawal window. No › arrow and nothing else opens. Total paid and "Show N older orders" as today. Withdrawals list under it in the same column.
- **Desktop:** main column (plan card; Upgrade options and Extend coverage side by side; Paid add-ons) and a right column holding Order history and Withdrawals.
- **Old links:** `?tab=plan`, `?tab=orders`, `?tab=coverage` open Billing (today they fall back to the Overview); `?section=extend-coverage` still scrolls to Extend coverage.

## Wording (approved 2026-11-17)

No new keys. Reused: `EventPlanSettingsPage.yourPlan.*`, `coverage.keptUntil`, `compare.storage`, `compare.members`, `compare.upgradeOptions`, `compare.upgradeDueNow`, `compare.removedModules`, `upgrade.*`, `extension.*`, `addons.*`, `orders.*`, `orderStatus.*`, `orderWithdrawal.*`, `withdrawalHistory.*`, `PlanUsage.unlimited`.

Removed, and their keys deleted from `messages/en.json` and `messages/el.json`:

- `EventPlanSettingsPage.orders.columns` ("Type / Status / Coverage / Date / Amount", "Τύπος / Κατάσταση / Κάλυψη / Ημερομηνία / Ποσό"): the desktop table goes.
- `EventPlanSettingsPage.compare.moduleChanges` ("New modules" / "Νέα modules"): the feature descriptions leave the upgrade card.

## File map

Create:
- `hooks/useBillingPlanCard.ts` (+ test): kept-until label and the storage/members meters (replaces `useBillingPlanFacts`' facts; keeps `useBillingDiscountLine`).
- `components/manage/billing/BillingUsageMeter.tsx`: label, `used / limit`, bar.
- `components/manage/billing/BillingPlanCard.tsx` (+ test, + stories): replaces `BillingPlanSummary`.
- `components/manage/billing/BillingOrderRow.tsx` (+ stories): one order row.
- `components/manage/billing/PlanRemovedModules.tsx`: the red list (replaces `PlanUpgradeModules`).
- Stories: `BillingUpgradeRow.stories.tsx`, `BillingExtensionSection.stories.tsx`, `BillingAddonsSection.stories.tsx`.

Modify:
- `lib/manageSections.ts` (+ test): `parseManageSection` maps `plan`, `orders`, `coverage` to `billing`.
- `hooks/useCoverageExtensionSection.ts`: `priceLabel` per row, `selectedId`/`select`, `selected`.
- `components/manage/billing/BillingExtensionSection.tsx` (+ test): tiles + one button.
- `components/manage/billing/BillingUpgradeRow.tsx`, `BillingUpgradeSection.tsx`: card look.
- `hooks/useBillingUpgradeRows.ts`: `priceLabel` as `{amount} now`; drop `addedModuleKeys`.
- `components/manage/billing/BillingAddonsSection.tsx`: soft rows.
- `components/manage/billing/BillingOrdersPanel.tsx` (+ test): rows only.
- `app/(main)/(app)/(event)/events/[eventId]/manage/BillingTab.tsx` (+ test): the layout.
- `components/manage/ManageSkeletons.tsx`: `BillingTabSkeleton` in the new shape.
- `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`: prefetch billing, and for the main host upgrade and extension options, on `?tab=billing` (and its aliases).
- `messages/en.json`, `messages/el.json`.

Delete:
- `components/manage/billing/BillingPlanSummary.tsx`, `components/manage/billing/PlanUpgradeModules.tsx`, `hooks/useBillingPlanFacts.ts` (discount line moves to `useBillingPlanCard.ts`).

## Tasks

- [ ] 1. Old links: `parseManageSection` aliases + test; prefetch on the manage page.
- [ ] 2. Your plan card: hook + meter + card + stories/test; delete the old summary.
- [ ] 3. Upgrade card: row hook, card, removed-modules list, stories; delete `compare.moduleChanges`.
- [ ] 4. Extend coverage tiles: hook selection, component, test, stories.
- [ ] 5. Paid add-ons rows + stories.
- [ ] 6. Order rows: row component, panel, test, stories; delete `orders.columns`.
- [ ] 7. `BillingTab` two-column layout, skeleton, test.
- [ ] 8. `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`; signed-in check at 375 and 1280, English and Greek.

## Commands

- One test file: `npx vitest run <path>`
- Types: `npx tsc --noEmit`
- Lint: `npx eslint . --fix` then `npx eslint .`
