# Host Pages Redesign Roadmap (KAN-222)

**Goal:** rebuild the host's event dashboard (the `/manage` pages) from the agreed mockups, so every page is easier to find and use with no information removed.

**Mockups:** the "Host Overview redesign" design canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`). Decisions are recorded in memory `host-pages-redesign-decisions.md`.

**Rules for every piece:**

- One piece = one Jira ticket = one PR into `staging`. Branch from the latest `staging` as `claude/kan-<n>-<slug>`. Put the key in the PR title and every commit, and name only that piece's key in the PR body.
- Before changing any visible text (English or Greek, labels, alt text, screen-reader labels), show the exact old → new wording in a popup and wait for a yes. Every piece below lists the wording it needs.
- Mobile first: build and check at 375px, then at 1280px.
- Each piece ships stories for its new components (see `docs/storybook.md`). Never tick the visual check's approve box.
- Run `npx tsc --noEmit`, `npx eslint .` and `npx vitest run` before opening the PR.

## Build order

| # | Ticket | Piece | Mockup | Depends on | Plan |
|---|---|---|---|---|---|
| 1 | KAN-223 | Navigation: grouped sidebar, Overview is the mobile menu, header B, Help folded into Overview, Share links and Vendors inside the dashboard | N1, MN1, header B | — | [2026-11-16-host-dashboard-navigation.md](2026-11-16-host-dashboard-navigation.md) |
| 2 | KAN-224 | Overview: the event journey (before, all done, on the day, after) | C1 | 1 (takes over the setup steps) | [2026-11-16-host-overview-journey.md](2026-11-16-host-overview-journey.md) |
| 3 | KAN-225 | Invitations & QR codes as one section | Q5 | 1 (merges the Invitation and Share links entries); backend KAN-239 | [2026-11-16-invitations-qr-codes.md](2026-11-16-invitations-qr-codes.md) |
| 4 | KAN-226 | Members on one page | M1 | 1 | [2026-11-17-members-one-page.md](2026-11-17-members-one-page.md) |
| 5 | KAN-227 | RSVP on one page; Tools > RSVP redirects to it | R1a | 1 | [2026-11-17-rsvp-one-page.md](2026-11-17-rsvp-one-page.md) |
| 6 | KAN-228 | Settings edited on the invite preview | S2 | 1 | not written yet |
| 7 | KAN-229 | Billing with everything open | Billing | 1 | not written yet |
| 8 | KAN-230 | Theme grid with the title in each theme | T1 | 1 | not written yet |
| 9 | KAN-231 | Vendors list and "What vendors can do" | V1 | 1 (the page sits in the dashboard) | not written yet |
| 10 | KAN-232 | Announcement as a mode in the feed composer | AC1 | 2 (the Overview's Announcement tool opens the composer) | not written yet |
| 11 | KAN-233 | Danger zone says what deleting does | D2 | 1 | not written yet |

Pieces 3–9 and 11 only need piece 1. They can be built in any order once it is merged, but no two at the same time if they touch the same files (`ManageScreen.tsx`, `messages/*.json`).

## What each piece leaves for later

- **1 Navigation**
  - Invitation and Share links stay two entries under People until piece 3 merges them into "Invitations & QR codes".
  - The Announcement entry stays in the event menu until piece 10.
  - The setup steps sit on the Overview in their current look until piece 2 turns them into the journey.
- **2 Overview**
  - The Announcement quick tool and stop link to the current announcement page until piece 10 points them at the composer.
  - Built 2026-11-16. Changes from the plan: Playlist uses the lucide `Music` icon, because `public/icons/music.svg` is the bottom bar's plain dark icon, not a gradient one. The current stop shows its action once: as a coral line on the path, with the button in its card.
  - The floating Overview button above "+" with a steps-left badge is its own ticket, KAN-236. Plan: [2026-11-17-floating-overview-button.md](2026-11-17-floating-overview-button.md) (round 36px mint `#6EE7B7` button, checklist icon, no new wording).
- **3 Invitations & QR codes**
  - The scan page gets a live invitation as one more choice. The scan page's own design is out of scope.
  - The scan answer lacks the invitation: guestwall-be ticket KAN-239 adds `invitationSlug`, merged to backend staging before the frontend PR.
  - Built 2026-11-16 (storywall #365, backend guestwall-be #166). Changes from the plan: the "QR code" heading over the code was dropped (owner approved). The scan page with a live invitation was not checked live; tests and the `WithInvitation` story cover it.
- **4 Members**
  - Built 2026-11-17 (storywall #369). A pending co-host invitation row was not checked live, since that sends a real email; tests and the `PendingInvitationRow` stories cover it.
- **11 Danger zone**
  - Decide what "Download all" opens (the gallery download, or a new export) before building it.

## Wording still waiting for approval

| Piece | Words |
|---|---|
| 1 | Group headings "Event" and "People" (English agreed; Greek to approve). The removals listed in that plan's Task 1. |
| 2 | Approved 2026-11-16 (see that plan's Wording section) |
| 3 | Approved 2026-11-16 (see that plan's Wording section) |
| 4 | Approved 2026-11-17 (see that plan's Wording section) |
| 5 | Approved 2026-11-17 (see that plan's Wording section) |
| 6 | Pencil button labels ("Edit" + field name) |
| 9 | Seats bar label "4 of 5 vendor seats used". "What vendors can do" is approved in English; Greek to approve. |
| 11 | The two new lines are approved in English; Greek to approve. |
