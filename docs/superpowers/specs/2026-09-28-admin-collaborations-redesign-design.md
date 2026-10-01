# Admin Collaborations redesign — design

Date: 2026-09-28

## Problem

The admin Collaborations section (`#collaborations`) is a stat-tile header over a partners table, and every partner action happens in drawers:

- One narrow **operations drawer** holds the whole partner: portal link, codes, earnings totals, mark-paid form and ledger. The codes table (`min-w-[820px]`) and ledger (`min-w-[900px]`) scroll sideways inside it.
- Every action inside it opens **another drawer on top**: new code, edit code, link existing code, earning details. Editing the partner closes the operations drawer and opens a separate edit drawer.
- The layout does not match the Plans section (rail + pane, full width, hash-routed selection). Selecting a partner does not change the URL.

Functional gaps:

1. The codes table shows only `ACTIVE` codes — a disabled code disappears and cannot be found or re-enabled.
2. Ledger rows carry no context about which event or code earned them.
3. Nothing shows who is owed money without opening each partner.
4. The payout-reference input is always visible, detached from row selection.
5. The portal button reads "Issue portal link" even when a link exists; clicking it rotates the token and dead-links the old URL with no specific warning.
6. Form limits drift from the contract: partner name and code label are capped at 140 (contract: 200), void reason at 500 (contract: 1000), contact email has no cap (contract: 320).

## Decisions (agreed)

- Switch to the **Plans layout**: partner rail on the left, selected partner's pane on the right.
- The pane is **stacked sections** (header → portal link → codes → earnings), no sub-tabs.
- Marking paid is **row selection → action bar**; the payout reference is entered in the confirmation modal.
- Ledger rows show **event title + code**.
- Owed amounts come from `earningsTotals` on the collaborator responses and ledger event names from `eventTitle` — both already in the contract (`collaborations-fe-integration.md`, 2026-09-28 changelog entry). No per-partner totals call.
- Drawers are used only for single-record editing and never stack.

## Backend contract used

Per `docs/integration guides/collaborations-fe-integration.md` §3 and `frontend-api-types.ts`:

- `CollaboratorResponseDto.earningsTotals: { currency, accruedMinor, paidMinor }[]` — on list and detail responses, always an array, `[]` when never earned. `accruedMinor` is what is owed. Never summed across currencies.
- `EarningResponseDto.eventTitle: string | null` — null once the event is purged; show a short `eventId` instead.
- `PATCH /collaborators/{id}` is a full replace; `status: null` leaves status unchanged.
- `POST /collaboration-earnings/mark-paid` is all-or-nothing; any non-`ACCRUED` row fails the batch with `5062 COLLABORATION_EARNING_NOT_PAYABLE`.

No backend change is needed. The locally running backend did not yet return either new field when checked; it needs a rebuild/restart before visual verification.

## 1. Layout

`CollaborationsSection` replaces `CollaborationsPanel`, using the same outer container, header and two-column flex layout as `PlansSection` (`flex-col` stacked on small screens, `lg:flex-row` with a ~208px rail).

### Rail (left)

- Search input at top (filters by name or email).
- One row per partner, sorted by name: name on the left; owed amount on the right in mono, one figure per currency with `accruedMinor > 0` joined by ` · ` (e.g. `€30.43 · $12.00`). Nothing shown when nothing is owed.
- Suspended partners render muted (`opacity-60`), same as disabled event types in the Plans rail, and stay selectable.
- "No matches" line when search filters everything out.
- A **New partner** item below a divider opens the partner drawer in create mode. After create, the new partner is selected.
- The four stat tiles are removed.

### Routing

- Hash scheme: `#collaborations` (no selection) and `#collaborations/<collaboratorId>`.
- `lib/adminCollaborationsRouting.ts` exports `COLLABORATIONS_HASH_ROOT`, `isCollaborationsHash`, `parseCollaborationsHash`, `formatCollaborationsHash`, mirroring `lib/adminPlansRouting.ts`.
- `AdminNavigationContext` recognises `isCollaborationsHash` the way it recognises `isPlansHash`, so the sidebar keeps Collaborations active on sub-hashes.
- With no id in the hash, the first partner in the (unfiltered, sorted) list is selected and the hash is replaced. An id that no longer exists falls back the same way.
- With zero partners, the pane shows an empty state with a New partner action.

## 2. Partner pane (right)

### Header

- Name (`h2`), contact email in mono, `CollaboratorStatusPill`.
- Actions: **Edit** (opens partner drawer: name, email, notes) and **Suspend** / **Reactivate**.
- Suspend and Reactivate each open a `ConfirmActionModal`. Suspend's body states that the partner page and all their codes stop working; tone is destructive. Reactivate states they work again. Confirming sends a PATCH with the current name/email/notes and the new status.
- Notes, when present, render as one muted paragraph under the header.

### Portal link

One row:

- Not issued: "No portal link yet" + **Create link**.
- Issued: "Link created {date}" (from `portalTokenIssuedAt`, locale-formatted) + **Replace link**.
- Replace opens a `ConfirmActionModal` stating the old link stops working. Create issues directly (nothing to break).
- After create/replace the returned `portalUrl` shows inline once, with a warning that it will not be shown again and a **Copy** button. It is held in component state only, cleared when switching partners, never persisted.

### Codes

- Section heading with **New code** and **Link existing code** actions.
- Full-width table, all codes for the partner: active first, then disabled (disabled rows muted). Columns: Code (mono), Label, Discount / Commission (e.g. `15% / 20%`), Uses (`liveRedemptions` or `liveRedemptions / maxRedemptions`, mono), Restrictions (`CodeRestrictionPills`), Status (`AdminCodeStatusPill`), Edit icon.
- Edit opens `CollaborationCodeDrawer` (which already has the status select), so disabled codes can be re-enabled.
- Loading, error and empty states are explicit and tied to the codes query.

### Earnings

- **Owed**: one compact figure per currency from `collaborator.earningsTotals` — owed (`accruedMinor`) large, paid (`paidMinor`) small beneath. Hidden when `earningsTotals` is empty; the ledger's own empty state covers that case.
- **Ledger** filter: Open (default, excludes `REVERSED`) / Accrued / Paid / Reversed / All.
- Ledger table columns: select checkbox (enabled only for `ACCRUED`), Date, Event (`eventTitle`, or short mono `eventId` when null), Code (resolved from the partner's codes by `codeId`, mono; short id if not found), Commission (`{commissionPercent}% of {basis}`), Amount (signed, mono; clawbacks show negative), Status pill, Reference (mono, or "—"), Void icon (disabled when `REVERSED`).
- A header checkbox selects/clears all `ACCRUED` rows in the current filter.
- **Selection bar**: appears when ≥1 row is selected, pinned to the bottom of the ledger section: "{count} selected · {total}" + **Clear** + **Mark paid**. When the selection spans currencies the total is replaced with a per-currency list (never summed across currencies).
- **Mark paid modal**: `ConfirmActionModal` whose body shows the count and total and contains a required payout-reference input (max 200). Confirm is disabled until the reference is non-blank. On success: clear selection, close modal. On `5062`: show the mapped error in the modal and refetch the ledger.
- **Void modal**: `ConfirmActionModal` stating the commission is removed and the host's order is unchanged, with a required reason textarea (max 1000). On success: refetch ledger.
- The earning detail drawer is removed; every field it showed is now in the row.

### Drawers

Three remain, each opened from the page, never from another drawer:

- `CollaboratorDrawer` (create/edit) — status select removed; sends `status: null` on edit, omits it on create. Name max 200, email max 320.
- `CollaborationCodeDrawer` (create/edit) — label max 200.
- `LinkPartnerDiscountCodeDrawer`.

### Cache invalidation

Any mutation that changes owed amounts (mark paid, void) also invalidates the collaborators list so the rail and header totals refresh. Partner save and suspend/reactivate invalidate the list (already the case).

## 3. Code structure

### Lib

- `lib/adminCollaborationsRouting.ts` — hash helpers (above).
- `lib/adminCollaborations.ts` — add pure helpers: owed-by-currency formatting input, ledger filtering, code lookup by id, short id, selection totals grouped by currency. Remove `collaboratorStats`, `balanceMinor` and `owedMinor` if unused after the change.

### Types

- `lib/api/types.ts`: add `earningsTotals: CollaborationEarningsTotalDto[]` to `CollaboratorResponseDto`; add `eventTitle: string | null` to `CollaborationEarningResponseDto`.

### Hooks

- `hooks/useCollaborationsSection.ts` — collaborators query, search, sorted/filtered rail items, selected id from hash, select action, create-drawer state.
- `hooks/useCollaboratorPane.ts` — codes query, edit-partner / code / link-code drawer state, suspend/reactivate confirm.
- `hooks/useCollaboratorPortalLink.ts` — issue mutation, replace confirm, one-time URL state, copy.
- `hooks/useCollaboratorLedger.ts` — earnings query, filter, selection, selection totals, mark-paid modal + reference, void target + reason.
- `hooks/useAdmin.ts` — remove `useCollaboratorEarningsTotals` and its query key; mark-paid and void invalidate `adminKeys.collaborators`.

### Components (`components/admin/collaborations/`)

`CollaborationsSection`, `CollaboratorsRail`, `CollaboratorsPaneEmpty`, `CollaboratorPane`, `CollaboratorPaneHeader`, `CollaboratorPortalLink`, `CollaboratorCodesTable`, `CollaboratorCodeRow`, `CollaboratorOwedTotals`, `CollaboratorLedger`, `CollaboratorLedgerRow`, `LedgerSelectionBar`, `MarkPaidModal`, `VoidEarningModal`, `CollaboratorStatusConfirm`.

Every meaningful visual section gets a JSX section comment. All visible copy goes through `AdminPage.collaborations` translations (en + el).

### Shared rail pieces

Extract from `PlansRail` / `PlansRailSearch` into `components/admin/AdminRailItem.tsx` and `components/admin/AdminRailSearch.tsx` (item classes, active/idle styles, search input with placeholder prop). `PlansRail` and `CollaboratorsRail` both use them; Plans behaviour and visuals unchanged.

### Removed

`CollaborationsPanel`, `CollaboratorsCatalogTable`, `CollaboratorOperationsDrawer`, `CollaborationEarningsPanel`, `CollaborationVoidRedemptionForm` (already unused), `hooks/useCollaborationsAdmin.ts`, and translation keys used only by them (`stats.*`, `subtitle`, `rowCount`, `selectPrompt`, earning-detail keys, etc.). `AdminStatTile` stays (used by other panels). `AdminConsole` renders `CollaborationsSection`.

## 4. Verification

- `tsc` and lint clean.
- Screenshots at 1440px of Plans and Collaborations side by side for layout parity; a phone-width check for overlap or broken stacking.
- Against the local backend (after it serves the new fields): create partner; create and replace portal link; new code; link existing code; disable and re-enable a code; select rows and mark paid; void; suspend and reactivate; refresh on `#collaborations/<id>` keeps the selection.

## Out of scope

- Unlinking a code (no endpoint; linking is permanent by contract).
- House discount codes section (`#discount-codes`) — unchanged.
- Server prefetch — the admin console is a client-side, hash-routed shell with no server prefetch today.
