# Invitations & QR Codes as One Section (KAN-225) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** merge the dashboard's Invitation tab and Share links page into one page, "Invitations & QR codes", built from the Q5 mockups: one code and link for the event, and a "What guests see" list of the scan page's choices, with the online invitation as one of them.

**Architecture:** the merged page is today's `/manage/qr` route (`routes.events.invitationsQr`), so planners with `QR_READ` keep their link. The `invitation` dashboard section goes, and `?tab=invitation` redirects to the page. The scan page (`/q/[token]`) gets one more choice, "See the invitation", from a new `invitationSlug` on the scan answer (backend ticket KAN-239). Logic sits in `lib/` and hooks; components only render.

**Tech Stack:** Next.js App Router, React 19, next-intl, TanStack Query, Tailwind v4, Vitest + Testing Library, Storybook.

**Mockups:** "Host Overview redesign" canvas, boards Q5 mobile and Q5 desktop.

---

## Decisions (owner, 2026-11-16)

- **One code.** The page shows the event's join code (`EVENT_JOIN`) only, as today. The invitation's own link and QR code (`InvitationShareLink`) go: guests reach the invitation through the scan page.
- **Invitation row is always shown** in "What guests see" when the event type offers online invitations (`offersOnlineInvitation`). It carries today's status and actions:
  - none: "No invitation yet." + Choose a theme;
  - draft: "Not published" + Edit;
  - live: "Live until {date}" (or "Live") + Edit + Extend (when `canExtend`);
  - offline: "Offline" + Edit + Extend;
  - plan missing (`locked`): today's `InvitationPlanPrompt` under the row;
  - published but plan missing: today's plan line under the row.
- **Copy link stays** next to Share and Stats, although Q5 leaves it out. Most desktop browsers can't Share, so without Copy a desktop host would have no way to take the link.
- **Kept from today:**
  - revoke and its confirm modal;
  - the low-slots warning;
  - the demo's invitation preview;
  - the read-only note on an ended event;
  - the empty state;
  - the capacity panel with its upgrade.
- **Planners** (`QR_READ`) keep the standalone page titled "Share links". They see the code, the link and "What guests see", but not the invitation row (it needs the host's drafts), capacity or stats.
- **Backend first:** KAN-239 adds `invitationSlug` to `GET /api/qr/{token}`. It must be merged to backend staging before this PR is merged. Until the field arrives, the scan page simply has no invitation choice.

## Wording (approved 2026-11-16)

| Key | English | Greek |
|---|---|---|
| `ManagePage.sections.invitationsQr` (new) | Invitations & QR codes | Προσκλήσεις & QR codes |
| `MobileTabBar.hostMenu.invitationsQr.label` (changed; also the Overview's quick tool) | Share links → Invitations & QR codes | Σύνδεσμοι κοινοποίησης → Προσκλήσεις & QR codes |
| `ManagePage.invitationsQr.guestsSee` (new) | What guests see | Τι βλέπουν οι καλεσμένοι |
| `QrCodePage.choices.invitation` (new) | See the invitation | Δείτε την πρόσκληση |
| `ManagePage.qr.codeAlt` (new) | QR code for {event} | Κωδικός QR για {event} |

**Removed:**
- `ManagePage.sections.invitation`.
- `InvitationsQrPage.subtitle` and `InvitationsQrPage.subtitleWithUpload`. They go from both the host page and the planner page.
- `ManagePage.invitation.qrAlt` (only `InvitationShareLink` used it).

**Unchanged:** `InvitationsQrPage.title` ("Share links") stays for the planner page, along with `ToolsMenu.items.vendorQr.label`, `Vendors.quickActions.qr` and `Vendors.me.tools.qr`.

**Reused without change:**
- Join the event / See what guests share (`QrCodePage.choices.join`, `choices.eventHint`).
- Upload photos / The hosts get them in their photo album (`guestCode.uploadButton`, `choices.uploadLine`).
- Leave a wish / A message for the wishbook (`guestCode.wishButton`, `choices.wishLine`).
- Guest capacity, Link, Share this link…, Print card, Print, Download file, Copy link, Share, Stats, and Links you share open in….

Any other visible text that turns up while building needs a popup first.

## Layout (Q5)

- **Phone (375px)**, top to bottom:
  1. header B ("< Overview" + page title);
  2. Guest capacity;
  3. QR code with Print card (or Print) and Download file under it;
  4. Link: heading, note, the link in mono, then Copy link, Share and Stats, then the language note;
  5. What guests see.
- **Desktop (≥ `lg`):** a two-column grid, `grid-cols-[minmax(0,1fr)_340px] gap-8 items-start`.
  - Left: capacity, then a row with the QR code (230px column) beside the Link block.
  - Right: What guests see.
  - The page needs a wider frame than the dashboard's `max-w-2xl`.
- **What guests see rows:**
  - A 38px rounded-square icon tile (`rounded-xl bg-primary-light text-primary-dark`) holds a lucide icon: join `Users`, invitation `Mail`, upload `Camera`, wish `PenLine`.
  - Next to it: the title (15px bold) and the line (13px muted).
  - Rows are split by thin top borders (`border-t border-border`), as in Q5.
  - The invitation row's status and actions sit on a second line inside the same row.
- **Rows shown, in order:**
  - join: always;
  - invitation: hosts only, when `offersOnlineInvitation(event.eventType)`;
  - upload: when `isGalleryQrFeatureEnabled(event.modules)`;
  - wish: when `isModuleAvailable(event.modules, 'wishbook')`.

## Files

**Create:**
- `lib/invitationsQr.ts`: `guestChoiceRows()`, the rows of "What guests see".
- `lib/invitationsQr.test.ts`
- `lib/api/prefetchOnlineInvitation.ts`: moved from the manage root page.
- `hooks/useInvitationsQrScreen.ts`: everything `InvitationsQrScreen` computes today, plus the invitation and the rows.
- `components/manage/invitations/GuestChoicesList.tsx` (+ `.stories.tsx`, `.test.tsx`): the "What guests see" section.
- `components/manage/invitations/InvitationChoiceStatus.tsx`: the invitation row's second line (status, actions, plan prompt).

**Modify:**
- `lib/api/types.ts`: `QrLinkResolutionDto.invitationSlug`.
- `lib/qrLanding.ts`, `lib/qrLanding.test.ts`: the `invitation` choice.
- `components/qrLanding/QrLandingChoices.tsx` (+ test, stories): the row and its icon.
- `lib/manageSections.ts`, `lib/manageSections.test.ts`: drop `invitation`; rename the page key `shareLinks` → `invitationsQr`.
- `hooks/useManageNav.ts` (+ test), `hooks/useManageSectionLabel.ts`, `components/manage/nav/manageNavIcons.ts`, `ManageSidebar.stories.tsx`, `ManageSectionList.stories.tsx`, `ManageSectionList.test.tsx`.
- `components/manage/nav/ManagePageFrame.tsx`: a `wide` option.
- `components/manage/ManageScreen.tsx`: drop the Invitation tab.
- `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`: redirect `?tab=invitation`; drop the invitation prefetch.
- `app/(main)/(app)/(event)/events/[eventId]/manage/qr/page.tsx` (+ test): prefetch the invitation for hosts.
- `components/manage/invitations/InvitationsQrScreen.tsx` (+ test), `ShareLinkPanel.tsx`, `ShareLinkSection.tsx`, `QrCodeCard.tsx` (+ test): the Q5 layout.
- `messages/en.json`, `messages/el.json`.

**Delete:**
- `components/manage/invitation/InvitationTab.tsx`, `.stories.tsx` and `.test.tsx`;
- `components/manage/invitation/InvitationShareLink.tsx` and `.stories.tsx`.

Keep `InvitationStatusRow` and `InvitationPlanPrompt` only if `InvitationChoiceStatus` reuses them (Task 5 says how).

---

### Task 1: The scan answer's invitation, as a scan-page choice

**Files:** `lib/api/types.ts`, `lib/qrLanding.ts`, `lib/qrLanding.test.ts`, `components/qrLanding/QrLandingChoices.tsx`, `components/qrLanding/QrLandingChoices.test.tsx`, `components/qrLanding/QrLandingChoices.stories.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Type.** In `QrLinkResolutionDto` (lib/api/types.ts), after `wishToken`, add:

```ts
    // The event's online invitation while guests can open it (KAN-239): same rule as the event's own
    // invitationSlug. Missing when there is none, and from a backend older than this field.
    invitationSlug?: string | null;
```

- [ ] **Step 2: Failing tests** in `lib/qrLanding.test.ts`, inside `describe('qrLandingPlan')`. Reuse the file's existing resolution helper; read the top of the file for its name and shape.

```ts
    it('offers the invitation after joining when the event has a live one', () => {
        const plan = qrLandingPlan({ ...joinResolution, uploadToken: 'up', invitationSlug: 'maria-nikos' }, guest);
        expect(plan.choices).toEqual(['join', 'invitation', 'upload']);
        expect(plan.invitationSlug).toBe('maria-nikos');
    });

    it('offers no invitation without a slug', () => {
        expect(qrLandingPlan({ ...joinResolution, invitationSlug: null }, guest).choices).not.toContain('invitation');
    });

    it('offers the invitation to a member too, after Open', () => {
        expect(qrLandingPlan({ ...joinResolution, invitationSlug: 'maria-nikos' }, member).choices.slice(0, 2)).toEqual(['open', 'invitation']);
    });
```

In `describe('qrLandingChoiceHref')` (create it if missing):

```ts
    it('opens the published invitation', () => {
        const plan: QrLandingPlan = { choices: ['invitation'], joinInviteToken: null, uploadToken: null, wishToken: null, invitationSlug: 'maria-nikos' };
        expect(qrLandingChoiceHref('invitation', plan, 'e1')).toBe(invitationPublicUrl(SITE_URL, 'maria-nikos'));
    });
```

Use `joinResolution`, `guest` and `member` if the file has them. Otherwise define them at the top of the file:

```ts
const joinResolution = { status: 'ACTIVE', targetType: 'EVENT_JOIN', inviteToken: 'inv', eventId: 'e1' } as QrLinkResolutionDto;
const guest = { isMember: false, hasWishbook: false };
const member = { isMember: true, hasWishbook: false };
```

- [ ] **Step 3:** Run `npx vitest run lib/qrLanding.test.ts`. Expected: the new tests FAIL.

- [ ] **Step 4: Implement** in `lib/qrLanding.ts`:
  - Imports: `import { invitationPublicUrl } from '@/lib/invitation/publication';` and `import { SITE_URL } from '@/lib/seo';`.
  - `export type QrLandingChoice = 'join' | 'open' | 'invitation' | 'upload' | 'wish' | 'wishbook';`
  - Add `invitationSlug: string | null;` to `QrLandingPlan`, and `invitationSlug: null` to `NO_PLAN`.
  - In `qrLandingPlan`, after the join/open push:

```ts
    const invitationSlug = resolution.invitationSlug ?? null;
    if (invitationSlug) choices.push('invitation');
```

  and return `{ choices, joinInviteToken, uploadToken, wishToken, invitationSlug }`.

  - In `qrLandingChoiceHref`, before the final `return null`:

```ts
    if (choice === 'invitation') return plan.invitationSlug ? invitationPublicUrl(SITE_URL, plan.invitationSlug) : null;
```

  - Update the comment above `QrLandingChoice` to mention the invitation (KAN-225).

- [ ] **Step 5:** Run `npx vitest run lib/qrLanding.test.ts`. Expected: PASS.

- [ ] **Step 6: Messages.** Add `"invitation": "See the invitation"` to `QrCodePage.choices` in en.json, and `"invitation": "Δείτε την πρόσκληση"` in el.json.

- [ ] **Step 7: Row.** In `QrLandingChoices.tsx`:
  - Add `invitation: '/landing/wedding/icons/invitation.webp'` to `ICONS`. There is no invitation icon in `public/icons`; flag this image in the PR's visual notes.
  - In `label`, add `if (choice === 'invitation') return t('choices.invitation');` before the upload line.
  - `line` returns null for it.
  - The href is absolute (invite host). `AppLink` must open it in the same tab. If `AppLink` rejects absolute URLs, render a plain `<a href>` for this choice and add a one-line comment saying why.

- [ ] **Step 8: Test.** In `QrLandingChoices.test.tsx`, add: with a plan whose choices are `['join', 'invitation']` and `invitationSlug: 'maria-nikos'`, the link named "See the invitation" has the href `invitationPublicUrl(SITE_URL, 'maria-nikos')`. Add `invitationSlug: null` to every existing plan literal in the file and in `QrLandingChoices.stories.tsx`. Add a story `WithInvitation` (`visual-mobile-only`).

- [ ] **Step 9:** Run `npx vitest run lib/qrLanding.test.ts components/qrLanding` and `npx tsc --noEmit`. Expected: PASS and no errors. Fix the other places that build a `QrLandingPlan` literal; `grep -rn "wishToken: null" components hooks lib app` finds them.

- [ ] **Step 10: Commit.**

```bash
git add lib/api/types.ts lib/qrLanding.ts lib/qrLanding.test.ts components/qrLanding messages/en.json messages/el.json
git commit -m "KAN-225: Offer the live invitation on the scan page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: One dashboard entry

**Files:** `lib/manageSections.ts`, `lib/manageSections.test.ts`, `hooks/useManageNav.ts`, `hooks/useManageNav.test.tsx`, `hooks/useManageSectionLabel.ts`, `components/manage/nav/manageNavIcons.ts`, `components/manage/nav/ManageSidebar.stories.tsx`, `components/manage/nav/ManageSectionList.stories.tsx`, `components/manage/nav/ManageSectionList.test.tsx`, `components/manage/ManageScreen.tsx`, `components/manage/invitations/InvitationsQrScreen.tsx`, `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`, `lib/api/prefetchOnlineInvitation.ts`, `messages/*.json`

- [ ] **Step 1: Failing tests** in `lib/manageSections.test.ts`. Update the expectations:
  - `manageNavGroups` people group → `['rsvp', 'invitationsQr', 'members', 'vendors']`;
  - `manageNavHref('e1', 'invitationsQr')` → `routes.events.invitationsQr('e1')`;
  - `visibleManageNav(..., { invitationsQr: false, vendors: false })`;
  - drop `'invitation'` from every `manageSections` / `visibleManageSections` array;
  - delete any test about `invitationAvailable`.

  Add:

```ts
    it('no longer accepts the old invitation tab', () => {
        expect(parseManageSection('invitation')).toBe('overview');
    });
```

- [ ] **Step 2:** Run `npx vitest run lib/manageSections.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `lib/manageSections.ts`:
  - `ManageSection` loses `'invitation'`.
  - `ManagePage = 'invitationsQr' | 'vendors'`.
  - The people group becomes `['rsvp', 'invitationsQr', 'members', 'vendors']`.
  - `manageSections` loses `'invitation'`.
  - `isManagePage` and `manageNavHref` use `'invitationsQr'`.
  - `visibleManageSections` loses the `invitationAvailable` option, its filter line and its comment line.
  - Update the header comment: "a page (Invitations & QR codes, Vendors)".

- [ ] **Step 4: Callers.**
  - `hooks/useManageNav.ts`: drop `invitationAvailable` and the `offersOnlineInvitation` import, and rename the `shareLinks:` page flag to `invitationsQr:`.
  - `manageNavIcons.ts`: rename `shareLinks` to `invitationsQr` (keep `Ticket`) and remove the `invitation` entry.
  - `useManageSectionLabel.ts`: `if (key === 'invitationsQr') return t('sections.invitationsQr');`. Drop the `InvitationsQrPage` translator.
  - Stories and tests listed above: `'shareLinks'` → `'invitationsQr'`, drop `'invitation'`.
  - `InvitationsQrScreen.tsx`: `active="invitationsQr"`.

- [ ] **Step 5: Drop the tab.**
  - `ManageScreen.tsx`: remove the `useEventOnlineInvitation` call, its import, the `InvitationTab` import and the `{section === 'invitation' && …}` line.
  - Move `prefetchOnlineInvitation` out of the manage root `page.tsx` into `lib/api/prefetchOnlineInvitation.ts`, exported with the same body and its comment ("the host's drafts, and the published copy of the one on this event (see useEventOnlineInvitation)").
  - Remove its call and now-unused imports from the root page.

- [ ] **Step 6: Redirect.** At the top of the root page's `Page`, after reading `searchParams`:

```ts
    // The Invitation tab moved into Invitations & QR codes (KAN-225); old links land there.
    if (tab === 'invitation') redirect(routes.events.invitationsQr(eventId));
```

with `import { redirect } from 'next/navigation';` and `routes` imported if not already. Add a case to that page's test if it has one (`page.test.tsx` next to it): `redirect` is called with `/events/e1/manage/qr`.

- [ ] **Step 7: Messages.**
  - Add `ManagePage.sections.invitationsQr`: "Invitations & QR codes" / "Προσκλήσεις & QR codes".
  - Remove `ManagePage.sections.invitation`.
  - Change `MobileTabBar.hostMenu.invitationsQr.label` to "Invitations & QR codes" / "Προσκλήσεις & QR codes".

- [ ] **Step 8: Run** `npx vitest run lib/manageSections.test.ts hooks/useManageNav.test.tsx components/manage "app/(main)/(app)/(event)/events/[eventId]/manage"`, then `npx tsc --noEmit`. Expected: PASS and clean. `InvitationTab` files are now unused; they are deleted in Task 6.

- [ ] **Step 9: Commit:** `KAN-225: Merge the Invitation tab into Invitations & QR codes`

### Task 3: The rows of "What guests see"

**Files:** `lib/invitationsQr.ts`, `lib/invitationsQr.test.ts`

- [ ] **Step 1: Failing test.**

```ts
import { describe, expect, it } from 'vitest';

import { guestChoiceRows } from '@/lib/invitationsQr';

describe('guestChoiceRows', () => {
    it('lists join, invitation, upload and wish in scan-page order', () => {
        expect(guestChoiceRows({ showInvitation: true, uploads: true, wishes: true })).toEqual(['join', 'invitation', 'upload', 'wish']);
    });

    it('always lists join, and only what the event offers', () => {
        expect(guestChoiceRows({ showInvitation: false, uploads: false, wishes: true })).toEqual(['join', 'wish']);
    });
});
```

- [ ] **Step 2:** Run `npx vitest run lib/invitationsQr.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement.**

```ts
// The rows of "What guests see" on Invitations & QR codes (KAN-225): what scanning the event's
// code offers a guest, in the scan page's order (see qrLandingPlan).
export type GuestChoiceRow = 'join' | 'invitation' | 'upload' | 'wish';

export function guestChoiceRows({ showInvitation, uploads, wishes }: { showInvitation: boolean; uploads: boolean; wishes: boolean }): GuestChoiceRow[] {
    const rows: GuestChoiceRow[] = ['join'];
    if (showInvitation) rows.push('invitation');
    if (uploads) rows.push('upload');
    if (wishes) rows.push('wish');
    return rows;
}
```

- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5: Commit:** `KAN-225: Add the rows of What guests see`

### Task 4: `useInvitationsQrScreen`

**Files:** `hooks/useInvitationsQrScreen.ts`, `components/manage/invitations/InvitationsQrScreen.tsx`

- [ ] **Step 1: Move the logic.** Move every line that computes values from `InvitationsQrScreen` (from `useEventRouteContext()` down to `shareQrLinks`) into `useInvitationsQrScreen()`. Drop `subtitle`, and add:

```ts
    const showInvitation = isHost && offersOnlineInvitation(activeEvent.eventType);
    const invitation = useEventOnlineInvitation(activeEvent, { enabled: showInvitation });
    const rows = guestChoiceRows({
        showInvitation,
        uploads: isGalleryQrFeatureEnabled(activeEvent.modules),
        wishes: isModuleAvailable(activeEvent.modules, 'wishbook'),
    });
```

  Return the plain values the screen needs:
  - `{ eventId, isHost, isWritable, canWrite, isLoading, eventUsage, memberCount, memberLimit, currentPlanName, nextPlanName, upgradeHref, qrLinkStats, shareQrLinks, invitation, rows, eventTitle: activeEvent.title }`;
  - `nextPlanName` is `isFull ? nextUpgradeOption?.planTierName : undefined`, as today.

  `isLoading` also includes `showInvitation && invitation.isLoading`. Keep the existing comments with the lines they explain.

- [ ] **Step 2:** `InvitationsQrScreen` calls the hook and keeps only JSX. Its layout changes in Task 5. Run `npx vitest run components/manage/invitations/InvitationsQrScreen.test.tsx`. Expected: PASS apart from subtitle assertions. Delete those: the subtitle is removed.
- [ ] **Step 3: Commit:** `KAN-225: Move the share page's logic into a hook`

### Task 5: Q5 layout

**Files:**
- `components/manage/invitations/GuestChoicesList.tsx` (+ stories, test);
- `components/manage/invitations/InvitationChoiceStatus.tsx`;
- `ShareLinkPanel.tsx`, `ShareLinkSection.tsx`, `QrCodeCard.tsx` (+ test), `InvitationsQrScreen.tsx` (+ test);
- `components/manage/nav/ManagePageFrame.tsx`;
- `messages/*.json`.

- [ ] **Step 1: Messages.** Add `ManagePage.invitationsQr.guestsSee` ("What guests see" / "Τι βλέπουν οι καλεσμένοι") and `ManagePage.qr.codeAlt` ("QR code for {event}" / "Κωδικός QR για {event}"). Remove `InvitationsQrPage.subtitle` and `subtitleWithUpload`.

- [ ] **Step 2: QR label (TDD).**
  - Write a failing test in `QrCodeCard.test.tsx`: with `label="QR code for Maria & Nikos"`, `getByRole('img', { name: 'QR code for Maria & Nikos' })` exists.
  - Implement: a new optional prop `label?: string`. When it is set, pass `role="img"` and `aria-label={label}` to `QRCodeSVG` instead of `title`.
  - Run the test. Expected: PASS.

- [ ] **Step 3: Link block.** In `ShareLinkSection`:
  - Under the note, print the shared link: `<p className="mt-3 font-mono text-[13px] break-all text-ink">{shareLink}</p>`.
  - Add an optional `extra?: ReactNode` rendered as a second action row (`mt-2 flex flex-wrap gap-2`). The panel passes Stats there.
  - Move `<ShareLanguageNote className="mt-3" />` inside the section, at the end, and remove it from `InvitationsQrScreen`.
  - Add a JSX section comment for each block.

- [ ] **Step 4: Panel (Q5 row).** `ShareLinkPanel` becomes:
  - status pill (unchanged);
  - then `<div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-7">`:
    - QR column `md:w-[230px] md:shrink-0` with `QrCodeCard` (`linkActions={false}`, `label={tQr('codeAlt', { event: eventTitle })}`, `size={200}`);
    - `ShareLinkSection` (`flex-1 min-w-0`) with `extra` = the Stats button and the low-slots warning (today's markup, moved).
  - The demo preview and Revoke stay in the "More actions" row under it.
  - The "QR code" heading (`qr.sections.qr`) is dropped: Q5 has none, and the QR's label names it.
  - Add the `eventTitle` prop.
  - Print card / Print and Download file stay as `QrCodeCard` renders them. Q5 also has them under the code.

- [ ] **Step 5: `InvitationChoiceStatus`.** It renders, from `EventOnlineInvitation`:
  - loading: a `h-8 w-40 animate-pulse rounded-full bg-surface-muted`;
  - error: `InvitationEditor.loadFailed` in `text-sm text-rose-700` with `role="alert"`;
  - `locked`: `<InvitationPlanPrompt invitation={invitation} />`;
  - `status === 'none'`: `ManagePage.invitation.empty` in muted text and the "Choose a theme" link (today's classes and `onClick={invitation.chooseTheme}`);
  - otherwise: `<InvitationStatusRow invitation={invitation} />`, which already shows status, Extend, Edit and the plan line.

  No new words.

- [ ] **Step 6: `GuestChoicesList` (TDD).** Write `GuestChoicesList.test.tsx` first:
  - rows `['join', 'invitation', 'upload', 'wish']` with a live invitation fixture (copy the one in `InvitationStatusRow.stories.tsx`) show:
    - the heading "What guests see";
    - "Join the event" and "See what guests share";
    - "See the invitation" with "Live until 12 Mar 2027";
    - "Upload photos" and "Leave a wish";
  - rows `['join']` show no "See the invitation".

  Then implement:

```tsx
// "What guests see": what scanning the event's code offers, with the invitation's status and actions on its row.
export function GuestChoicesList({ rows, invitation }: { rows: GuestChoiceRow[]; invitation: EventOnlineInvitation | null }) {
    const t = useTranslations('ManagePage.invitationsQr');
    const tScan = useTranslations('QrCodePage');
    // ...one <li> per row: icon tile, title, line; the invitation row adds <InvitationChoiceStatus>.
}
```

  - Map the titles and lines from `QrCodePage` as in "Reused without change" above, and the icons from the Layout section.
  - The icons are decorative next to their text: `aria-hidden="true"`.
  - Use a `<section aria-labelledby>` with an `h2` (`text-[17px] font-bold`) and a `<ul>`.
  - The invitation row renders only when `invitation` is non-null.

- [ ] **Step 7: Frame.** `ManagePageFrame` gets `wide?: boolean`. When it is set, the wrapper is `max-w-5xl` instead of `max-w-2xl`. Update its doc comment.

- [ ] **Step 8: Screen.** `InvitationsQrScreen` content:
  - `<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">`;
  - left column: capacity (UsagePanel, unchanged), the read-only note, the panels and the empty state;
  - right column: `<GuestChoicesList rows={rows} invitation={isHost ? invitation : null} />`;
  - hosts: `<ManagePageFrame active="invitationsQr" wide>`;
  - planners: `ModulePageShell` without `subtitle`, `maxWidth="5xl"` if the shell supports it (check its prop type; otherwise keep `2xl` and the grid stays one column);
  - a JSX comment above each section: Capacity, Read only, Link and QR code, Empty, What guests see.

- [ ] **Step 9: Stories.**
  - `GuestChoicesList.stories.tsx`: `AllChoices` (live invitation), `NoInvitationYet`, `Draft`, `Offline`, `PlanMissing`, `JoinOnly`. Each at both widths (default tags).
  - Update `ShareLinkPanel`/screen stories if they exist (`ls components/manage/invitations/*.stories.tsx`).

- [ ] **Step 10: Run** `npx vitest run components/manage/invitations` and `npx tsc --noEmit`. Expected: PASS and clean.

- [ ] **Step 11: Commit:** `KAN-225: Lay out Invitations & QR codes as in Q5`

### Task 6: Server prefetch and cleanup

**Files:** `app/(main)/(app)/(event)/events/[eventId]/manage/qr/page.tsx` (+ `page.test.tsx`), the deleted files, `messages/*.json`

- [ ] **Step 1: Failing test** in `manage/qr/page.test.tsx`: for a host on a wedding event, `serverGet` is called with `endpoints.invitationDrafts.root`; for a planner it is not; for a lite or non-invitation event type it is not. Mock `resolveServerEventDetail` the way the root page's test does.

- [ ] **Step 2: Implement.** In `prefetchHostData`'s caller:

```ts
        if (context.isHost) {
            const event = await resolveServerEventDetail(eventId);
            await Promise.all([
                prefetchHostData(queryClient, eventId, context.accessToken),
                prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
                // Mirrors useInvitationsQrScreen: the invitation row only where the event type offers one.
                event && offersOnlineInvitation(event.eventType) ? prefetchOnlineInvitation(queryClient, eventId, context.accessToken) : null,
            ]);
        }
```

  `prefetchOnlineInvitation` must not throw. Wrap its body in try/catch if Task 2 kept it throwing on the drafts call. Next dedupes the event detail fetch with the layout's.

- [ ] **Step 3:** Run `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/qr"`. Expected: PASS.

- [ ] **Step 4: Delete:**
  - `components/manage/invitation/InvitationTab.tsx`, `.stories.tsx` and `.test.tsx`;
  - `components/manage/invitation/InvitationShareLink.tsx` and `.stories.tsx`;
  - the `ManagePage.invitation.qrAlt` key (both locales).

  Then check for leftovers: `grep -rn "InvitationTab\|InvitationShareLink\|invitation.qrAlt\|subtitleWithUpload\|sections.invitation'" app components hooks lib messages` must print nothing.

- [ ] **Step 5: Run** `npx tsc --noEmit`, `npx eslint .` and `npx vitest run`. Expected: clean. Only the known flaky files (save-my-date editor `PageClient*.test.tsx`, `lib/overlayHistory.test.ts`, `hooks/useCampaignsPage.test.tsx`) may fail under load; re-run them alone.

- [ ] **Step 6: Commit:** `KAN-225: Prefetch the invitation and remove the old Invitation tab`

### Task 7: Check and PR

- [ ] **Step 1: Local signed-in check** at 375px and 1280px. Use bob's "Nick and Maria" and alice's lite event; use the headless Chrome scripts in the scratchpad if the browser pane is hidden. Check:
  - the dashboard shows one "Invitations & QR codes" entry (sidebar and phone list), with no Invitation entry;
  - `/manage?tab=invitation` lands on `/manage/qr`;
  - capacity, QR (Print card, Download file), Link with the URL, Copy link, Share (phone), Stats and the language note;
  - What guests see with each row the event offers, and the invitation row's state with its actions;
  - a planner's page still works, titled "Share links";
  - the scan page `/q/<token>` shows "See the invitation" when the backend sends `invitationSlug`. Use a local backend on the KAN-239 branch, or mock the field in the story.
- [ ] **Step 2: SEO.** `/events/` pages are private, and `/q/` is already handled in `app/robots.ts`. No new route, no metadata change. State "No blockers" in the PR.
- [ ] **Step 3: Merge staging in** (`KAN-225: merge staging`) and re-run the checks.
- [ ] **Step 4: Open the PR** `KAN-225: Invitations & QR codes as one section` into `staging`.
  - Body: summary, what changes, the removed keys, visual notes (the invitation icon on the scan page, the wider dashboard frame on this page, the expected diffs in the nav stories), a Backend line naming KAN-239 by its guestwall-be PR link only (do not write its key in the body), the checks, and the attribution line.
  - Do not merge before KAN-239's backend PR is on backend staging.
- [ ] **Step 5:** Update the roadmap row and memory (`host-pages-redesign-decisions.md`).
