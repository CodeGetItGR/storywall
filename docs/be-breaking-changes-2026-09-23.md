# Backend breaking changes (2026-09-23) — frontend migration notes

Tracks the frontend work for the backend changes to pricing, coverage, plans, refunds and
purchases. Update the checklist as items land.

## Source

The updated integration guides are uncommitted changes in the main checkout
(`storywall/docs/integration guides`), not in this branch. The two new ones carry most of it:

- `coverage-options-and-extensions-fe-integration.md` — plans sold at several durations
- `withdrawal-compliance-phase1-fe-integration.md` — `galleryOpensAt` removed, primary-host-only purchases, host-transfer lock, withdrawal window

Also changed: `billing-fe-guide.md` (§7a "keep originals" retired), `collaborations-fe-integration.md`
(§1, §1b, §1c), `event-coverage-window-fe-integration.md`, `app-config-fe-integration.md`,
`frontend-api-types.ts`, `gallery-archive-download-fe-integration.md`,
`promoter-account-provisioning-fe-integration.md`.

## Decisions

- **Order of work:** admin plans first (plan saves are broken), then event creation and pricing,
  then the rest.
- **Create plan:** at least one duration is required in the create drawer, so a new plan is on
  sale immediately.
- **Plan table:** Price column shows "from" the cheapest live duration; the Auto-delete column
  becomes Durations.
- **Extensions:** hidden in admin until phase 2 sells them.
- **Admin event tools:** plan assignment and promoter provisioning both get a duration picker,
  pre-selected to the server's default.
- **Duration picker on plan cards:** every plan card (create flow and landing) gets a compact
  `3m | 6m | 9m` picker below the members/storage row, and the card's price follows it. Tapping a
  duration on an unselected card also selects that plan.
- **Default duration:** the shortest. On the landing page the picker only changes the price shown;
  the landing buttons stay generic "Create event" links (they never passed a plan), so the create
  flow starts on the shortest. Carrying the pick over is a possible follow-up.
- **"Access for N months" bullet:** dropped from marketing cards, since the picker now shows the
  length (one home per fact).
- **One duration only:** no picker, just the length as plain text in the same spot.
- **Draft:** the host can still change the duration on the draft overview, with the same compact
  picker next to the price.
- **Co-hosts:** purchase actions (pay, storage packs, draft duration) stay visible but disabled,
  with one line: "Only the event's main host can make purchases." Upgrades are the exception: the
  server won't list upgrade options to a co-host (4006), so Billing shows them no upgrade section,
  just that line once at the top of the tab.
- **Upgrade duration:** each plan row in Billing gets the same compact picker (the durations the
  server offers for that plan), starting on the shortest; the button price follows it. The review
  page shows the chosen duration, fixed.
- **Added coverage:** "+6 months of coverage" shows under the picker only when the pick adds
  months; the review page's line item names the duration ("Upgrade to Plus · 12 months").
- **Old plan comparison screen:** deleted (`EventPlanComparison`, `PlanCard`, `PlanPriceLabel`,
  `PlanUpgradeButton`, `PlanMoreInfoSheet`, `usePlansPageData` were imported nowhere).
- **"Upgrade to X" hint on the storage-limit error:** X is the next on-sale plan of the same event
  type in catalog (sort) order.
- **Original download in the photo viewer:** host only (the server would also allow the uploader),
  photos only (videos have no separate original).
- **Gallery zip download:** starts on Originals; both sizes show next to the switch.
- **Withdrawal deadline:** the Danger tab says "You can withdraw until {date, time} for a refund of
  {amount}.", one second before `windowClosesAt`, in the viewer's own timezone.

## Checklist

Legend: `[x]` done · `[ ]` not started · `[~]` in progress / partial

### 1. Admin — plan catalog (done, not yet checked in a browser)

- [x] Types: `CoverageOptionResponseDto`, `initialOptions` / `extensionOptions` on plans, request/patch DTOs, drop `autoDeleteMonths`
- [x] Endpoints + mutations for `POST/PATCH /api/admin/plan-tiers/{id}/coverage-options` (`hooks/useAdminCoverageOptions.ts`). No GET: admin plan responses already carry every option, retired ones included
- [x] Plan editor: drop the price field and `autoDeleteMonths` for EVENT plans (both are now a 400). Currency is required for EVENT plans ("Used for every duration.")
- [x] Plan editor: new Durations section (add, edit price/order, retire, reactivate), one duration edited at a time (`PlanEditorDurationsSection`, `usePlanDurationsEditor`, `lib/adminPlanDurations.ts`)
- [x] Create plan: drop price and `autoDeleteMonths`; required Durations list, created one by one after the plan; a retry skips the ones already created (`PlanCreateDurations`, `usePlanCreateDurations`)
- [x] Plan table: "from" price and Durations column ("3 · 6 · 12 mo", or "None on sale")
- [x] Error codes 5077–5080 mapped to admin copy; 3007 copy covers the new cases
- [x] Plan assignment panel: duration picker, default "Same length if available" (sends no `coverageOptionId`)
- [x] Promoter provisioning form: duration picker, preselects the shortest; shown on the review step
- [x] Plans with no duration on sale are left out of assignment and provisioning (the server would 409)
- [x] Duplicate plan: no change, the backend copies durations
- [ ] Extensions (`extensionOptions`): hidden in admin until phase 2 sells them

### 2. Event creation and pricing (done, not yet checked in a browser)

- [x] Shared `DurationPicker` (`components/plan/DurationPicker.tsx`): `3m | 6m | 9m` radiogroup with arrow keys (`useRadioGroupKeys`), plain text for a single duration, still a switch when the saved duration is off sale
- [x] Plan cards (`MarketingPlanCard`): picker under members/storage, price follows the pick, picking a duration also picks the plan (stretched select button, so no button inside a button). "Access for N months" bullet removed
- [x] Create flow plan step: picks per plan (`useDurationPicks`), defaults to the shortest; plans with no duration on sale are left out
- [x] `POST /api/events` sends `coverageOptionId`
- [x] `POST /api/checkout/preview-code` sends `coverageOptionId`; changing plan or duration clears an applied code preview (the typed code stays)
- [x] Create flow overview step prices the picked duration ("Plan activation · 6 months")
- [x] Projected coverage in the create form uses the picked duration's months
- [x] Create flow: a duration changed after the draft was created is PATCHed onto the draft before checkout
- [x] 5078 at checkout: the create flow reloads the plans; the draft overview reloads plans + billing and shows "This duration is no longer available. Choose another one." with pay disabled until a live one is picked
- [x] Landing pricing: same picker, price only (CTAs unchanged)
- [x] Draft overview: picker next to the plan price, saved straight away via `PATCH /api/events/{id}` `{ coverageOptionId }` (`useDraftDuration`); the draft's duration comes from the billing view. A new pick resets the collaboration code
- [x] Draft activation total uses the draft's duration (plus module unlocks); `ORIGINALS` dropped
- [x] Plan price helpers in `lib/planTiers.ts`: `liveInitialOptions` (sort order, then months), `shortestInitialOption`, `resolveInitialOption`, `getOptionPriceDetails`; `getPlanPriceDetails` gives an EVENT plan's cheapest live duration
- [x] `Durations` namespace added to the public (landing) message whitelist
- [ ] Carry the landing pick into the create flow (possible follow-up, not planned)
- [ ] Known gap (older than this work): switching to a different *plan* after the draft exists in the create flow isn't saved to the draft

### 3. Upgrades (done, not yet checked in a browser)

- [x] `UpgradeOptionResponseDto` reshaped: one entry per plan with `options[]` (`UpgradeCoverageOptionDto`: `coverageOptionId`, `months`, `monthsAdded`, `gapAmountMinor`, `payableAmountMinor`)
- [x] Billing upgrade rows: the compact duration picker per plan (shortest first, starts on the shortest, picks per plan via `useDurationPicks`); button price, strike-through and aria label follow the pick; "+6 months of coverage" only when the pick adds months (`useBillingUpgradeRows`, `BillingUpgradeRow`, `lib/upgradeOptions.ts`)
- [x] Checkout review link carries the duration (`routes.events.checkoutReview(eventId, intent, { code, option })`). The review page line reads "Upgrade to Plus · 12 months"; a link to a duration no longer offered shows the page's "no longer available" state instead of silently repricing; a link without one starts on the shortest
- [x] `upgrade-checkout` sends `coverageOptionId`; 5077 / 5029 (`PLAN_TIER_NOT_AN_UPGRADE`) reload the offers
- [x] `CollaborationCodePreviewRequestDto.targetCoverageOptionId` added (type only: no screen previews a code on an upgrade)
- [x] `findNextPlan`: an EVENT plan's next plan is the next on-sale plan of the same event type in catalog order (ACCOUNT keeps the dearer-price rule). The storage-limit "Upgrade to X" hint works again. The unused `nextPlan` on `useEventOverviewPlan` was removed
- [x] `planUpgradeDiff` comment and test updated (coverage is no longer a plan fact)
- [x] Old plan comparison screen deleted, with the pieces only it used: `EventPlanComparison`, `PlanCard`, `PlanPriceLabel`, `PlanUpgradeButton`, `PlanMoreInfoSheet`, `usePlansPageData`, `PlanComparisonMatrix`, `PlanComparisonBadges`, `PlanModuleGuideButton`, `PlanModuleGuideModal`, `PlanModuleIcons`, `useLocalizedPlanDescription`, `formatPlanDiscount`; messages `PlanCard`, `PlanDescriptions`, `EventPlanSettingsPage.billingPeriod` and 18 `EventPlanSettingsPage.compare.*` keys
- [ ] Orders list could show each order's months (`coverageMonths` / `coverageMonthsAdded`); not planned

### 4. Gallery gate removed (done, not yet checked in a browser)

- [x] Types: `galleryOpensAt` off `EventResponseDto`, `EventScheduleDto` and `ProjectedCoverageDto`; `maxPreEventDays` and `defaultHostingMonths` off `AppCoverageConfigDto`
- [x] `lib/eventCoverage.ts`: `getCoverageStatus` reads `coverageEndsAt` only (phases `open`, `closing`, `ended`; no `beforeOpen`). `projectCoverage` is start + the picked duration's months, never before now, and null without a duration (no platform default any more). `getGalleryLeadDays` removed
- [x] Coverage status strip: "Gallery opens in N days" removed
- [x] Checkout disclosures (create flow and draft overview): "Gallery opens" line removed, the unused `startAt` prop dropped. "Your dates are fixed at payment" now says the date change "won't move when the gallery closes"
- [x] Create form and settings tab hint: "Photos kept until {date}" (the "Gallery opens" half removed)
- [x] Billing plan summary: "Gallery opens" fact removed
- [x] Messages removed: `ManagePage.coverage.opensIn`, `CheckoutReviewPage.activation.galleryOpensTitle` / `galleryOpensBody`, `EventPlanSettingsPage.coverage.galleryOpens`
- [x] Demo data and test fixtures updated

### 5. "Keep originals" retired (done, not yet checked in a browser)

- [x] Drop `keepOriginals` from the event patch type
- [x] Draft total stops adding `ORIGINALS`
- [x] Photo viewer offers the original download on every event (host, photos only); the gallery no longer fetches billing just to check for the add-on (`useGalleryScreen` `canDownloadOriginal`)
- [x] Gallery zip download starts on Originals on every event (`preferOriginals` prop removed)
- [x] 5054 `ORIGINALS_ADDON_NOT_ACTIVE` removed (no longer returned), with its `ApiErrors.originalsAddonNotActive` copy
- [x] Billing add-ons list: an old `ORIGINALS` row renders as history from the server's name; nothing gates on it (no change needed)

### 6. Primary-host-only purchases and host transfer

- [x] Disable purchase actions for co-hosts, with "Only the event's main host can make purchases." (`Common.primaryHostOnly`, `useIsPrimaryHost`): draft overview (pay, duration, collaboration code), checkout review page (upgrade and storage), add-ons page (storage packs visible, buy disabled)
- [x] `GET /upgrade-options` is only called for the main host (Billing tab, review page, members panel, invitations QR screen, right context panel). Before this, a co-host's Billing tab showed its error state
- [x] Billing tab: the co-host note moved to the top of the tab; the upgrade section is hidden for co-hosts, so `BillingUpgradeRow`'s disabled state was removed. The review page shows co-hosts only the note, not "no longer available"
- [x] Map 4006 `PURCHASE_NOT_PRIMARY_HOST` (code + `ApiErrors` copy)
- [x] Map 5081 `HOST_TRANSFER_WITHDRAWAL_OPEN`: "You can hand this event over from {date and time}." from `details.unlocksAt` (`getHostTransferUnlocksAt`, `useApiErrorMessage`); the old generic line stays as the fallback

### 7. Withdrawal preview (done, not yet checked in a browser)

- [x] `currency` nullable (`formatMoney` takes a null currency and shows the bare amount); `windowClosesAt` documented as the exact first closed instant; `scheduleMovedAfterPayment` required
- [x] The withdrawal line now shows the deadline (`lastWithdrawalMoment`, `useEventWithdrawalFlow` `withdrawalDeadlineLabel`); without `windowClosesAt` it falls back to the old line
- [x] "Reviewed by a person" line in the confirmation when `scheduleMovedAfterPayment` is true: already in place
- [x] Billing view types: `coverageOptionId`, `coverageMonths`, order `coverageMonths` / `coverageMonthsAdded` (only the draft overview reads them so far)

### 8. Demo data and tests

- [x] `lib/demo/seedData.ts`: demo plan has one 12-month free duration and no plan price; demo billing carries it. `lib/demo/mockHandlers.ts` needs nothing (it doesn't mock create, patch or checkout)
- [x] Unit tests: fixtures updated, `adminPlanDurations.test.ts` and `upgradeOptions.test.ts` added, `landingPricing.test.ts` rewritten for durations, duration-helper and next-plan tests in `planTiers.test.ts`

## Type-check status

`tsc` is clean. ESLint and Prettier are clean on every changed file. All 49 vitest files
(273 tests) pass.

This worktree has its own `node_modules` (`npm install`, 2026-09-24). Run the tools from it
(`node_modules/.bin/vitest`); mixing in the main checkout's vitest breaks the jest-dom matchers.

## Open questions

None right now. Earlier ones are answered under Decisions.

## Guide inconsistencies noticed

- `event-coverage-window-fe-integration.md` still lists `maxPreEventDays` beside `maxLeadDays` in
  two places, though its banner says it was removed.
- A missing `coverageOptionId` is 5077 on event create but 3001 on the new-event preview and on
  upgrade checkout; handle both.
