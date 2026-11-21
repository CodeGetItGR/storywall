# Release test cases (draft, staging → main)

All of #390, #385, #383, #304 and #391 are merged into staging. #386 is not in this release.

Run on https://staging.storywall.gr. M = phone width (390px), D = desktop (1280px).
Results: commit 39b869aa (frontend) / bddc55ae (backend), run 2026-11-21 in the staging browser pane and headless Chrome. Empty = not run yet.
"Host" = a host test account on a live full wedding event; "Lite host" = host of a QR/Wishbook/Bundle event.

Backend release first: guestwall-be staging → main (be#101, 127, 128, 153, 161–163, 165–168). Migrations V227–V230.

## A. Host dashboard (KAN-222 redesign)

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| A1 | #359 | Host opens the event dashboard | D: sidebar grouped Event / People, Danger zone last. M: Overview is the menu, other pages have an "Overview" back button. Old `?tab=help` opens Overview | pass | pass |
| A2 | #363 | Open Overview, tap Before / On the day / After | Each phase shows its path of stops; current stop has a card with its action; plan line with storage bar on Before and On the day | pass | pass |
| A3 | #381 | M: Overview → tap Menu in header; open RSVP from the menu | Menu scrolls to the section list; RSVP opens at the top of the page | pass | n/a |
| A4 | #370 | M: on feed and on a section page (not Overview) | Mint round button with step badge; above "+" on feed; opens Overview; not shown on drafts or lite events | pass | n/a |
| A5 | #380 | Settings: tap the pencil on cover, title, date, location, description | Each opens its own editor (sheet on M, panel on D); save updates the preview. Wedding without venue shows "Add venue details" | pass (sheet opens) | pass (opened, not saved) |
| A6 | #373 | Theme page | Each card shows the event title in that theme's font and colour, name under it; tap applies | pass (pane, QA throwaway baptism: each card shows the title in its font and colour, tap applies Κύκνος). Finding: only Κύκνος is listed for baptism | pass (same) |
| A7 | #376 | Billing page; also open an old `?tab=orders` link | One page: plan, upgrade cards, extend coverage, add-ons, order history (right column on D). Old link lands on Billing | pass | pass |
| A8 | #369 | Members page | Usage tiles side by side; hosts list with Invite co-host (opens sheet); pending invites with ⋯ Copy / Revoke; members list with ⋯ menu | pass | pass |
| A9 | #372 | RSVP page; edit deadline | One page: countdown, 4 numbers, report cards (swipe on M, 2×2 on D), filter chips with counts. Pencil edits deadline in a sheet. Tools > RSVP sends here | pass | pass (note: 6 days vs Overview 5 days) |
| A10 | #365, be#166 | Invitations & QR codes section; old `/manage?tab=invitation` link | One section: capacity, QR (Print card, Download), link (Copy, Share), "What guests see" rows, invitation row in its current state. Old link redirects | pass | pass |
| A11 | #381 | Invitations & QR: QR performance panel → See more | Panel shows Joined and Uploads by joined guests; See more opens the stats sheet | pass (390px headless: Joined 2, Uploads 0; See more opens the sheet. Note: a sheet row shows "Last joined" twice) | pass |
| A12 | #378 | Vendors page, with and without vendors | Joined bar "x / y", rows with ⋯ Hide/Show and Remove, "What vendors can do" per allowed type; empty state scene when none | pass (empty state) | pass (empty state) |
| A13 | #375 | Danger zone → Delete event (use a throwaway event) | Three lines with icons, Download all and Wishbook link; Delete sends the code straight away; code step is a sheet on M. Draft keeps warning → code | pass (pane, 728px, QA throwaway lite: three lines with icons and the Wishbook link; no Download all because the plan has no gallery, as intended; Delete sends the code at once and the code step is a bottom sheet; cancelled. QA draft addons draft: warning first, then Send code; cancelled) |  |
| A14 | #379 | Host: feed composer → Announcement chip, post; open old `/tools/announcement` | Text-only announcement posts; old link redirects to feed composer. Guest does not see the chip | pass (pane, QA throwaway full: old /tools/announcement link opens the feed composer in Announcement mode, text only; "QA test announcement" posted. Guest without the chip: not checked in the pane, covered by ComposerModal.test.tsx "shows no Announcement chip to a guest") |  |

## B. Guest QR page and QR card

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| B1 | #384, #362 | Scan / open an event QR link signed out | Short intro shows, then the actions list at the top; logo on one row | pass | pass |
| B2 | #368 | Switch EN ↔ EL on the QR page | Language changes without a page reload; slim top bar (logo left, EN/EL right) | pass (no reload; URL keeps ?lang=el) | pass |
| B3 | #355, #360 | Choose Upload photos, then back; choose Leave a wish, then back | Form opens at the top; back returns to the same spot; short cover strip, dashed picker tile | pass (phone Back leaves the page) | pass |
| B4 | #365, be#166 | Scan the QR of an event with a live online invitation | "See the invitation" choice shows and opens it; not shown when no live invitation | pass (QA throwaway full, published invitation: "See the invitation" shows on the QR page). Staging gap: it opens invite.staging.storywall.gr, which has no DNS record; the invitation itself opens at staging.storywall.gr/save-my-date/i/<slug>. invite.storywall.gr resolves on production | pass (same) |
| B5 | #354, #356 | Invitations & QR → Print card | Card shows up to 5 tilted tiles under the code; backup tiles (Games, Gifts, Schedule) fill free spots | pass (390px headless: 5 tiles under the code) | pass |
| B6 | #342, be#153 | Admin → QR template editor: add the full logo element, save, print a card on that template | Logo shows in editor and on the printed card | n/a | pass (on an archived copy "QA logo check", made available only for the print) |

## C. Wishbook

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| C1 | #358, be#163 | Signed-in guest opens Wishbook | Sees only "Your messages" with edit and delete; cannot see other guests' wishes |  | pass (only composer and record button) |
| C2 | #358 | Host opens Wishbook | Sees all wishes; edit by guest keeps the star |  | pass |
| C3 | #364, #367, #384, be#165 | Guest (signed in and via QR) records a voice wish, plays it back, sends | Larger gradient mic; recording up to 60 s; host can play it | pass (owner, real iPhone + Android) | n/a |

## D. Feed

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| D1 | #377 | Phone: guest uploads a post | Share sheet opens; Share hands files to the phone share menu. After two "Not now", sheet stops and Posted card shows Share | pass (owner, real phone) | n/a |

## E. Lite plans (QR / Wishbook / Bundle)

Lite plans don't exist on production yet (owner, 2026-11-21): run these on staging only. Production users won't see them until the plans are created there.

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| E1 | #214, be#101 | Create a Wishbook or Bundle event | Only the title is asked; Pay disabled until title filled | pass with note (pane, Wishbook: only the title is asked. Pay is not disabled; tapping it with no title focuses the title field, like E5) |  |
| E2 | #213 | D: open the lite event home | Host tools panel (manage, help, plan) beside the home | n/a | pass |
| E3 | #216, be#101 | Lite event → upgrade to a full plan | Details step (date, place) before the review; "Change date" goes back; QR → Bundle skips it | pass (pane, QA throwaway lite, Wishbook → STORY: "When and where" step before the review; Change date goes back with values kept; QR → Bundle goes straight to the review) |  |
| E4 | #211 | Lite event Settings and help | Date and place hidden; no schedule in help |  | pass |
| E6 | #383 | D: full create page, pick Wishbook or QR + Wishbook | Wide banner shows five wish cards (3 written, 2 voice) at the same height | n/a | pass (headless 1280: Wishbook and QR + Wishbook details step shows 5 wish cards, 3 written + 2 voice, same height) |
| E5 | #256 | Full plan create wizard, tap Continue with a field missing | Button always tappable, goes to the first missing field | pass (pane, phone width: Continue jumps to the empty date field) |  |

## F. Add-ons and Save my date

Save my date stays hidden on production (`SAVE_MY_DATE_LAUNCHED = false`). Staging-only cases are marked.

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| F1 | #371, be#167 | Live event → Billing → Manage add-ons; tick an add-on | Server total, withdrawal consent, "Pay {amount}" | pass (pane, QA throwaway full: ticked add-ons show the server total and Pay; a business account sees the business notice instead of the withdrawal consent). Finding: the Theme add-on is offered on a wedding but the server refuses it (409, moduleUnavailable) |  |
| F2 | #371 | Draft event → Add-ons | Add/Remove per add-on, nothing pre-ticked | not reachable: a draft redirects /settings/addons to /manage (DraftEventRouteGuard). On a draft, add-ons are offered only in the invitation publish step (F3) | same |
| F3 | #374 (staging only) | Save my date editor → publish on an event without the invitation | Add-on step offered before publishing | pass (pane, QA draft addons, a START wedding draft: Publish → pick event → "Add the invitation to your plan" lists plan + invitation add-on 50 €, total 129 €; cancelled, not paid) |  |
| F4 | #326, be#162 (staging only) | Change event date/place, open its invitation | Invitation shows the new details | pass (changed the place to "QA venue changed"; the published invitation and its link preview show it) |  |
| F5 | #329, #361 (staging only) | Editor: add gallery photos; add, delete, reorder FAQ / godparents / places to stay | Changes show in the preview and survive reload | pass for FAQ (add, reorder by drag, delete) and places to stay (add, delete): preview updates, survives reload. Gallery photos not run (needs a file upload). Godparents in this design is one text block, no list |  |
| F6 | #324 (staging only) | Started invitation → switch theme | New design, content kept | pass (draft invitation: Γάμος 002 → Γάμος 005, confirm says texts stay; texts kept after reload. The old design's sample cover photo is not carried over) |  |
| F7 | #308, #311, #315, #319 (staging only) | Admin → Save my date: fonts, pairings, texts; drag-order themes; edit a theme's design and images | Saves and order persist after reload | n/a | pass: theme order persists after reload (restored after); fonts list loads; a test pairing (hidden) and a test text were created and kept after reload; the text was deleted with a confirm. Pairings have no delete, so "QA test pairing" stays on staging, hidden. Γάμος 001 design: cover frame animation Float → Fade In saved, kept after reload, then set back to Float. Theme image upload not run |
| F8 | #320 (staging only) | M: editor phone sheet | Light-coloured controls | pass (pane, phone width: editor sheets are white with light controls) | n/a |
| F10 | #304 (staging only) | Share a published invitation link in WhatsApp / Viber / Messenger | Preview shows the invitation's title, date, place and picture in its own language; page stays noindex | pass on the page tags (headless): Greek og:title, date, time and place in og:description, 1200×630 share image, noindex. Not checked inside WhatsApp / Viber / Messenger |  |
| F9 | prod | On production: Manage → Invitation, admin Save my date link, sitemap | Save my date stays hidden everywhere | | |

## G. Admin

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| G1 | #244 | Admin plan editor: empty a limit and a promotion field, save, reload | Values are really cleared | n/a | pass (START: guest limit + promotion emptied, still empty after reload; restored to 150, no promotion) |
| G2 | #387, #384 | M: admin plan editor and plans table | Section bar flush under the header; page not wider than the phone | pass (375px, no sideways scroll) | n/a |
| G3 | #384 | Admin campaigns | Each link shows short and full link | n/a | pass |

## H. Demo

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| H1 | #388, #389, be#168 | Demo wedding: QR card themes, gift card print, live playlist, wishbook book | Each opens and works in the demo | pass (headless: QR card designs Plain / Alex & Alice, gift card print page, live playlist opens with no requests, wishbook book Ready with Download; no page errors) | pass |
| H2 | #390 | Demo: open either demo QR code | Real QR choice page full screen; upload and wish work; join card shows See plans and Back to the demo | pass |  |

## I. Tracking and legal

| ID | PR | Steps | Expected | M | D |
|---|---|---|---|---|---|
| I1 | #255, be#127 | Privacy policy (EN and EL) | Mentions counting steps of sign-up etc. (approved wording) | pass EN + EL | pass |
| I2 | #255 | Go through sign-up / create; watch network | Vercel Analytics step events fire; no visible change | pass (pane: 6 POSTs to /_vercel/insights/event during create and checkout; nothing visible) | pass |

## J. Covered by automated checks only

- #357 SEO link fixes: hreflang links on Greek pages, demo announcement 404 (quick manual look too).
- #366 visual check waits for fonts: CI only.
- #385 trimmed visual check pipeline: CI only; the release commit's visual check must run green on it.
- #382 Vercel deploys only main and staging: check after merge that a main deploy runs.
- be#128 webhook ignores unknown order: backend unit test.
