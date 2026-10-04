# Product overview

What this backend is _for_, in plain terms. Not an API reference — see
[`frontend-integration-guide.md`](<docs/integration guides/frontend-integration-guide.md>) for endpoints and wire
shapes. This doc is for onboarding, product discussions, and roadmap conversations.

## 1. What StoryWall is

A shared social wall for a single event — a wedding, a party, a conference — that the host
sets up and guests join with an account via an invite link or QR code.
Think "private Instagram feed + RSVP + song requests, scoped to one occasion."

The unit of the product is the **event**, not the user. Everything (posts, stories, RSVPs,
playlist, membership) hangs off an event. A user can be a member of many events, but never
sees another event's content unless they're a member of it too.

## 2. Who uses it

- **Host** — creates and pays for the event, configures it, invites guests, moderates. Can have
  co-hosts. Sees usage/billing/plan screens the way an admin of a Slack workspace does.
- **Guest** — joins via an invite link or QR code by registering, logging in, or using a social
  login, with the invite token attached. There is no account-less guest join any more. A gallery
  upload QR code is the one exception: anyone can upload photos through it without an account.
- **Platform admin** — internal role, manages plans, event types, the module catalog, and billing
  operations (orders, held withdrawals) across all events. Not a role any customer has.

## 3. Core features

- **Posts** — text, media (up to 10 images/videos), announcements, and playlist-suggestion
  posts on the event feed. Pinnable, likeable, commentable.
- **Stories** — ephemeral (24h default expiry) media, viewed once, view-list visible to
  author/host. No comments/reactions — deliberately lighter-weight than posts.
- **RSVP** — guests declare attendance (+ adult/child counts, notes) per event and optionally
  per session/agenda item. Host gets an aggregate dashboard plus full attendee contact list.
- **Playlist / song requests** — guests suggest songs, upvote/downvote each other's
  suggestions (one stance per member, upvotes only affect ranking). Host gets a ranked
  leaderboard. A scheduled digest periodically posts new suggestions to the feed.
- **Gallery** — the event's shared photos and videos, with anonymous uploads via QR code.
- **Wishlist and wishbook** — a gift IBAN for the event, and a book of written wishes.
- **Member roles** — a label each member picks for themselves ("Best man", "Friend of the bride").
  Labels only; no permission reads them.
- **Event modules** — posts, RSVP, playlist, stories, gallery, wishlist, wishbook, co-hosts,
  schedule, and member roles. Which ones an event has is decided by its plan plus any module
  unlocks bought for it; hosts cannot switch them on or off.
- **Invitations** — hosts generate invite links/QR codes with a guest cap (`maxGuests`) and
  optional expiry; the invite preview page is the public entry point before anyone logs in.
- **Notifications** — host-facing only (not a guest activity feed). Tells hosts about
  usage limits, coverage ending, withdrawals and storage trims, upgrade offers, and pre-event
  tips. Produced exclusively by the backend, never by user actions.
- **Co-hosting** — an event can have multiple hosts with ordered display; any host can manage
  settings, invites, and moderation.

## 4. Commercial model

**Plans are per event.** An event plan sets that event's storage, guest cap, and modules. Each
plan belongs to one event type (wedding, birthday, …) and is sold at several coverage durations.
Plans are created by admins at runtime, so plan codes are not a fixed list. Account plans still
exist but grant nothing — there is no cap on how many events a user can host. See
[`billing-fe-guide.md`](<docs/integration guides/billing-fe-guide.md>).

**Every purchase is one-time.** No subscription, no recurring charge, no card on file, no free
plan. A new event is a `DRAFT` that only its hosts can see; paying for its activation makes it
`ACTIVE`. After that the host can buy an upgrade to a higher plan, storage packs, or a coverage
extension, each as its own checkout.

**Coverage**: the duration the host picks runs to the event's `coverageEndsAt`. When it passes,
the event is soft-deleted, then purged after a retention period. Hosts get warning notifications
7 days and 1 day before. There is no dunning, freeze, or read-only state.

**Withdrawal**: consumers can withdraw from a purchase within the legal window. The server
computes the refund per item and either refunds it at once or holds it for an admin. Withdrawing
from the activation soft-deletes the event; withdrawing from one upgrade or storage pack keeps it.
Business buyers (a verified EU VAT number) have no right of withdrawal. See
[`billing-fe-guide.md`](<docs/integration guides/billing-fe-guide.md>) §9.

## 5. What's explicitly out of scope today

Checked against the actual codebase — no backend support exists for any of these, so don't
design FE screens assuming they're one endpoint away:

- Quiz
- Seating charts
- Gift registries beyond the one IBAN per event (no per-item gifts or claiming)
- Rich "venue" content beyond a name/address/map link (photos, embeds)
- A standalone multi-day itinerary beyond the simple `EventSession` agenda list
- Scheduled/future messages ("send this post later")

See [`frontend-integration-guide.md`](<docs/integration guides/frontend-integration-guide.md>) §2 for the up-to-date
version of this list, since it's the one that gets checked against source on each pass.

## 6. Where to go next

- API surface, wire shapes, what's wireable vs. not: [`frontend-integration-guide.md`](<docs/integration guides/frontend-integration-guide.md>)
- System architecture, request flow, infra: [`design.md`](<docs/integration guides/design.md>)
- Feature-specific FE guides: see the links at the top of `frontend-integration-guide.md`
