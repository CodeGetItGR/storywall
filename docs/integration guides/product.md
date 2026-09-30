# Product overview

What this backend is *for*, in plain terms. Not an API reference — see
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
- **Wishlist** — one bank account per event that guests can send a monetary gift to.
  Deliberately minimal: an IBAN, an account holder, and a note. No product registry, no
  per-item claiming, no record of who gave what. Host-configurable from the setup wizard
  onwards; the IBAN is encrypted at rest and never appears on any anonymously-reachable
  response.
- **Wishbook** — a guestbook of written wishes tied to the event. Every member can read every
  wish; authors and hosts can delete.
- **Event modules** — posts/RSVP/playlist/stories/gallery/wishlist/wishbook are individually
  toggleable per event via a fixed `ModuleKey` enum — a host can turn off, say, the playlist
  for a corporate event.
- **Invitations** — hosts generate invite links/tokens with a guest cap (`maxGuests`) and
  optional expiry; the invite preview page is the public entry point before anyone logs in.
  A second kind invites somebody to **co-host** by email, and unlike a guest link it is bound
  to the address it names on a verified account — a forwarded co-host link confers nothing.
- **Notifications** — host-facing only (not a guest activity feed). Tells hosts about
  approaching storage/member/event-count limits, upgrade offers, and pre-event tips. Produced
  exclusively by a backend scheduled sweep, never by user actions.
- **Co-hosting** — an event can have multiple hosts with ordered display; any host can manage
  settings, invites, and moderation. Two ways in: promote a registered user immediately, or
  send a pending invitation to an email address (see **Invitations** above).

## 4. Commercial model

Two independent subscription axes — conflating them is the most common mistake in this
product:

- **Event plan tier** — governs that event's storage quota and member cap. This is what a
  host actually pays for, per event, because a bigger wedding needs more storage/guests. Since
  2026-09-23 each plan is sold at several durations (e.g. 3, 6 or 9 months of coverage), each priced
  separately; the host picks one. Since 2026-09-24 a live event's host can also buy more months (a
  coverage extension) at the plan's extension prices.
- **User plan tier** — governs how many *active* events a user may host simultaneously. This
  is the "how many parties can you run at once" axis.

Upgrading one does not touch the other. Event plan tiers today: `BASIC` / `PLUS` / `PRO`, at
2GB / 20GB / 100GB of storage respectively; account plan tiers are `FREE` / `PLUS` / `PRO`,
governing 1 / 5 / 25 simultaneous active events. Storage, member, and active-event limits are
sourced from backend-managed plan catalog config (not hardcoded on either side) — see
[`plan-tiers-fe-integration.md`](plan-tiers-fe-integration.md). **Account plans are currently
soft-disabled** — new assignment/creation is blocked and the default `FREE` account plan no
longer enforces an active-event limit — see
[`account-plans-disabled-and-platform-metrics-fe-integration.md`](account-plans-disabled-and-platform-metrics-fe-integration.md).

On top of the plan an event can buy **extras**, each folded into the same monthly figure: keeping
full-resolution originals, additional storage, and — since 2026-08-16 — **individual modules**. The
last of these is what lets a module ship free on the higher tiers and à la carte on the lower ones
without a second catalog: an admin strips the key from the cheaper plans and publishes an unlock
for it. Which modules a plan includes, and what an unlock costs, are both admin-editable at runtime.

Since 2026-08-31 an event's activation can also carry a **discount code** — either a **collaboration
code** tied to a B2B partner (a wedding venue or planner who sent the host to us), or a **house
code** the platform issues itself with no partner attached. Both look identical to a host at
checkout: the code discounts the host's plan price (stacked with any plan promotion, capped at a
configured ceiling), the code binds to the event so later upgrades inherit it, and a failed code
gives the same generic refusal either way. Only a partner code accrues commission — a house code is
a plain discount and nothing more. Partners have no account: they read their totals from a
tokenised, aggregate-only page.
See [`collaborations-fe-integration.md`](collaborations-fe-integration.md).

**Billing lifecycle**: checkout → payment (Stripe or a manual/admin-settled path) → the event is
`ACTIVE`, permanently — a one-time charge, with nothing left to lapse. There is no dunning
window, no freeze, no purge-for-non-payment. Refunds are available in a bounded window and only
if the event hasn't actually been used (no members joined, no posts, hasn't started); approving
one is the only thing that ever moves an event backwards, to `DRAFT`. See
[`billing-fe-guide.md`](billing-fe-guide.md) and
[`refunds-rate-limits-fe-integration.md`](refunds-rate-limits-fe-integration.md).

### Gift mode

Since 2026-09-27 an event can be **bought as a gift**. The buyer is someone other than the
honorees: the koumbaros at a wedding, the nonos at a baptism, a friend for a 40th. The giver
creates the event, pays the normal plan price and sets the wall up in secret. They hand it over
with a printed **claim card**: a QR code plus a 6-digit PIN. Whoever claims the card becomes the
owner (primary host), and the giver stays on as a co-host. If the giver named the recipient's
email address, an account with that verified address claims without the PIN. Anyone else needs
it, and five PIN attempts lock the card until the giver reissues it.

**The handover is delayed while money can still come back.** Ownership can't move while a consumer
purchase on the event is inside its 14-day withdrawal window. Otherwise the new owner could
withdraw, and get refunded to the giver's card, something they didn't pay for. A claim made inside
the window makes the recipient a co-host at once, and an hourly sweep makes them the owner when
the last window closes.

**Hidden prices.** On a gift event, an order's amounts are shown only to the host who paid it. The
recipient sees "a gift", not its price, and a host can withdraw only what they paid for. This is
etiquette, not secrecy, since catalog prices are public. **Per-plan switch:** each event plan
carries an admin-editable `isGiftable` flag (on by default). A plan also needs the `co_hosts`
module to be gifted. No emails, no split payments, no vouchers and no server-rendered cards in v1.
See the spec
[`2026-09-27-gift-mode-design.md`](superpowers/specs/2026-09-27-gift-mode-design.md) and
[`gift-mode-fe-integration.md`](gift-mode-fe-integration.md).

## 5. What's explicitly out of scope today

Checked against the actual codebase — no backend support exists for any of these, so don't
design FE screens assuming they're one endpoint away:

- A gift **registry** — named products, per-item claiming, "who gave what". The wishlist
  module (§3) is one IBAN per event and is not a step towards this.
- Quiz
- Seating charts
- Rich "venue" content beyond a name/address/map link (photos, embeds)
- A standalone multi-day itinerary beyond the simple `EventSession` agenda list
- Scheduled/future messages ("send this post later") — including the "wish for the future"
  time capsule, which is deferred to a later version rather than dropped

See [`frontend-integration-guide.md`](frontend-integration-guide.md) §2 for the up-to-date
version of this list, since it's the one that gets checked against source on each pass.

## 6. Deferred ideas — not started, revisit later

Not on the roadmap, not scoped, not estimated. Recorded here so the idea survives even though the
one-time-only commercial model above (§4) doesn't need either of them.

- **B2B / professional-account plans.** A recurring subscription tier for professional users
  (photographers, planners, venues) who manage many events on behalf of clients, distinct from
  the one-time per-event activation every host pays today. Would need its own pricing, its own
  billing cadence (this is the one place a genuinely recurring charge might belong), and a
  multi-event ownership model this codebase doesn't have. Revisit only if there's evidenced
  demand from repeat professional hosts, not speculatively.

  **Not** the same thing as the collaboration codes shipped in §4: those leave the host as the
  payer and owner and introduce no recurring billing, which is exactly why they were buildable
  and this still isn't.
- **GDPR-driven retention.** Auto-deleting an event's media/data some fixed period after the
  event date, independent of payment — payment status hasn't driven deletion at all since the
  freeze/purge lifecycle was removed (§4), so this would be a new, separate retention policy, not
  a revival of the old one. Would need a defined retention period, a legal basis review, and a
  decision on whether it's opt-out-able by the host before any implementation.

## 7. Where to go next

- API surface, wire shapes, what's wireable vs. not: [`frontend-integration-guide.md`](frontend-integration-guide.md)
- System architecture, request flow, infra: [`design.md`](design.md)
- Feature-specific FE guides: see the links at the top of `fe-guides/frontend-integration-guide.md`
