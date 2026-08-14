# Product overview

What this backend is _for_, in plain terms. Not an API reference — see
[`frontend-integration-guide.md`](frontend-integration-guide.md) for endpoints and wire
shapes. This doc is for onboarding, product discussions, and roadmap conversations.

## 1. What GuestWall is

A shared social wall for a single event — a wedding, a party, a conference — that the host
sets up and guests join, either as a full account or as a scoped guest via an invite link.
Think "private Instagram feed + RSVP + song requests, scoped to one occasion."

The unit of the product is the **event**, not the user. Everything (posts, stories, RSVPs,
playlist, membership) hangs off an event. A user can be a member of many events, but never
sees another event's content unless they're a member of it too.

## 2. Who uses it

- **Host** — creates the event, configures it, invites guests, moderates. Can have co-hosts.
  Sees usage/billing/plan screens the way an admin of a Slack workspace does.
- **Guest** — joins via an invite link. Two flavors:
    - **Registered guest** — has a full account (email+password), can belong to multiple events.
    - **Scoped guest** — joined via `guest-login` against a single invite token, no password, no
      account beyond that one event's membership. Lower-friction join, intentionally limited.
- **Platform admin** — internal role, manages plan tiers, feature flags, and billing
  reconciliation across all events. Not a role any customer has.

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
- **Event modules** — posts/RSVP/playlist/stories/gallery are individually toggleable per
  event via a fixed `ModuleKey` enum — a host can turn off, say, the playlist for a corporate
  event.
- **Invitations** — hosts generate invite links/tokens with a guest cap (`maxGuests`) and
  optional expiry; the invite preview page is the public entry point before anyone logs in.
- **Notifications** — host-facing only (not a guest activity feed). Tells hosts about
  approaching storage/member/event-count limits, upgrade offers, and pre-event tips. Produced
  exclusively by a backend scheduled sweep, never by user actions.
- **Co-hosting** — an event can have multiple hosts with ordered display; any host can manage
  settings, invites, and moderation.

## 4. Commercial model

Two independent subscription axes — conflating them is the most common mistake in this
product:

- **Event plan tier** — governs that event's storage quota and member cap. This is what a
  host actually pays for, per event, because a bigger wedding needs more storage/guests.
- **User plan tier** — governs how many _active_ events a user may host simultaneously. This
  is the "how many parties can you run at once" axis.

Upgrading one does not touch the other. Tiers today: `FREE` / `PLUS` / `PRO`, with storage,
member, and active-event limits sourced from backend-managed plan catalog config (not
hardcoded on either side) — see [`plan-tiers-fe-integration.md`](plan-tiers-fe-integration.md).

**Billing lifecycle**: checkout → payment (Stripe or a manual/admin-settled path) → an event
is "covered" for a billing period → if payment lapses, a dunning window, then the event
freezes (read-only), then after a grace period its media is purged. Refunds are available in a
bounded window and only if the event hasn't actually been used (no members joined, no posts,
hasn't started). All of this is off by default in a given environment
(`BILLING_SWEEP_ENABLED`) and every pre-existing event is treated as grandfathered/free until
explicitly turned on — see [`billing-payments-fe-integration.md`](billing-payments-fe-integration.md)
and [`refunds-rate-limits-fe-integration.md`](refunds-rate-limits-fe-integration.md).

## 5. What's explicitly out of scope today

Checked against the actual codebase — no backend support exists for any of these, so don't
design FE screens assuming they're one endpoint away:

- Gifts / wishlist / wishbook
- Quiz
- Seating charts
- Rich "venue" content beyond a name/address/map link (photos, embeds)
- A standalone multi-day itinerary beyond the simple `EventSession` agenda list
- Scheduled/future messages ("send this post later")

See [`frontend-integration-guide.md`](frontend-integration-guide.md) §2 for the up-to-date
version of this list, since it's the one that gets checked against source on each pass.

## 6. Where to go next

- API surface, wire shapes, what's wireable vs. not: [`frontend-integration-guide.md`](frontend-integration-guide.md)
- System architecture, request flow, infra: [`design.md`](design.md)
- Feature-specific FE guides: see the links at the top of `frontend-integration-guide.md`
