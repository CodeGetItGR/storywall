# FE integration guide: App config, module keys, RSVP bounds

Covers three related changes shipped 2026-08-05: a new **`GET /api/config`** endpoint, a
**canonical `ModuleKey` enum now enforced server-side**, and **RSVP guest-count validation**
that previously didn't exist. See `frontend-integration-guide.md` §0 for base setup (auth
header, error shape) — this doc only covers what's new.

**2026-08-13:** `media` gained per-kind upload caps (`maxImageBytes`/`maxVideoBytes`) now that
uploads are validated against the file's real, server-detected type rather than a client-claimed
one, and the config response gained a `paidServices` array (the "keep originals" add-on and
storage packs). See `billing-fe-guide.md` §5–§7b for the full purchase flows and
`multi-image-post-upload-fe-integration.md` for the new upload error codes.

**2026-08-16:** `eventModuleKeys` grew from five keys to **seven** — `wishlist` and `wishbook` are
now real modules — and `paidServices` gained a third `kind`, `MODULE_UNLOCK`, which sells a single
module to a single event. See
[`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md).

**2026-08-18:** each entry in `planTiers` gained `paidModules` — the full `MODULE_UNLOCK`
`PaidServiceResponseDto` rows (price, currency, billing period, etc.) for modules that plan doesn't
include for free but sells as an add-on. Previously the only way to know this was to filter
`paidServices` by `kind === 'MODULE_UNLOCK'` and cross-reference `grantsModuleKey` / `planTierIds`
against each plan by hand; that reconstruction, including the price/billing detail, is now done
server-side.

**2026-08-21:** `paidModules` is no longer exclusive to this endpoint — `GET
/api/plan-tiers?eventType=X` (see
[`plan-tiers-by-event-type-fe-integration.md`](plan-tiers-by-event-type-fe-integration.md)) now
populates it the same way, so the wizard's step-2 plan picker can render upsells without also
fetching the full config catalog.

**2026-08-23:** two new sections, both closing gaps where a limit was enforced server-side but
never surfaced anywhere the FE could read it. `contentLimits` gives you every free-text
`@Size(max=...)` bound (post/comment/story/wishbook/etc.) so counters and submit-disabling can be
driven from data instead of hardcoded numbers. `rateLimits` gives you the per-endpoint request
budgets for the guest content/interaction endpoints (posts, comments, reactions, RSVPs, etc.) —
these were previously invisible; only the _global_ default and the billing/auth limits were
documented (see `frontend-integration-guide.md` §0 for generic `429` handling, which still
applies unchanged). See §"New: content character limits" and §"New: per-endpoint rate limits"
below.

## GET /api/config

Public — no `Authorization` header needed, safe to call before login (e.g. to gate the login
screen itself behind a feature flag). Read-only, no side effects, nothing sensitive in the
payload.

```ts
interface AppConfigResponseDto {
    featureFlags: PlatformFeatureFlagResponseDto[];
    media: {
        maxFileSizeBytes: number; // outer container-level guard, not the real per-file limit — see below
        maxRequestSizeBytes: number;
        maxImageBytes: number; // per-kind cap, enforced after server-side format detection
        maxVideoBytes: number; // per-kind cap, enforced after server-side format detection
        maxBatchUploadFiles: number;
        maxMediaPerPost: number;
        presignedUrlTtlMinutes: number;
        publicHost: string | null; // hostname media URLs are served from
    };
    pagination: { defaultPageSize: number; maxPageSize: number };
    planTiers: PlanTierResponseDto[]; // was Record<'FREE'|'PLUS'|'PRO', {...}> — see plan-tiers-fe-integration.md
    paidServices: PaidServiceResponseDto[]; // "keep originals" add-on, storage packs, module unlocks — see billing-fe-guide.md §5
    eventModuleKeys: ('posts' | 'rsvp' | 'playlist' | 'stories' | 'gallery' | 'wishlist' | 'wishbook')[];
    rsvp: { minAdults: number; maxAdults: number; minChildren: number; maxChildren: number };
    contentLimits: AppContentLimitsDto; // added 2026-08-23 — see below
    rateLimits: AppRateLimitConfigDto[]; // added 2026-08-23 — see below
    defaultRateLimit: number; // added 2026-08-23
    defaultRateLimitWindowSeconds: number; // added 2026-08-23
}
```

Full type breakdown (`AppMediaConfigDto`, `PlanTierResponseDto`, etc.) is in
[`frontend-api-types.ts`](../frontend-api-types.ts) under "App config". See
[`billing-fe-guide.md`](billing-fe-guide.md) for everything about the
`planTiers` array specifically — the admin CRUD/assignment endpoints, scope semantics, and the
`null`-means-unlimited convention.

**Fetch once, cache it.** This isn't per-request data — none of it changes except when an
operator flips a feature flag or a deploy changes a limit. Fetch it once at app boot (or via a
long-`staleTime` query) and read from that cache everywhere you'd otherwise hardcode a limit.

### What to actually do with each field

- **`featureFlags`** — same shape as the existing `GET /api/platform-feature-flags` response,
  just bundled in here too so you don't need a second round-trip at boot. Both endpoints stay
  live; use whichever fits (this one for the initial app-shell fetch, the dedicated one if you
  need to re-check a single flag later without refetching everything).
- **`media.publicHost`** — the Cloudflare R2 hostname media URLs resolve to. If you're using
  `next/image`, add this to `images.remotePatterns` in `next.config.js` instead of hardcoding
  the R2 account hostname. Can be `null` in an environment where R2 isn't configured (e.g. some
  local dev setups) — handle that rather than assuming it's always a string.
- **`media.maxFileSizeBytes` / `maxRequestSizeBytes`** — the outer, container-level guard
  (200MB/file, 260MB/request as of 2026-08-13). This exists to protect the server, not to
  express a real per-kind limit — don't show these to users as "the" size limit.
- **`media.maxImageBytes` / `maxVideoBytes`** — the limits that actually matter to a user
  (25MB/200MB as of 2026-08-13), enforced _after_ the server detects the file's real type from
  its bytes. Validate the file picker against whichever of these applies to the file's kind,
  instead of hardcoding `25MB`/`200MB` — an admin can change these via config. See
  [`multi-image-post-upload-fe-integration.md`](multi-image-post-upload-fe-integration.md) for
  the resulting error codes. Client-side rejection is still just UX — the server enforces the
  real limit regardless. Note there is a second, _dimensional_ image limit (50 megapixels) that is
  deliberately not surfaced here — it only fires on synthetic or extreme-panorama input and is
  reported as `MEDIA_IMAGE_TOO_MANY_PIXELS` (3016) at upload time.
- **`media.maxMediaPerPost`** — same idea for the post composer's "max 10 images" guard.
- **`paidServices`** — the public catalog for the "keep originals" add-on, storage packs, and
  module unlocks, filtered to `isPublic && isAssignable` the same way `planTiers` is. Filter by
  `kind` (`RECURRING_ADDON` / `STORAGE_PACK` / `MODULE_UNLOCK`) to build the three different
  purchase UIs — the kind decides which endpoint will accept the code, so it is not cosmetic.
  A `MODULE_UNLOCK` entry carries `grantsModuleKey`; match it against `eventModuleKeys` to label
  the offer, or read `paidModules` on the relevant plan tier to get the same rows pre-filtered to
  that plan. See [`billing-fe-guide.md`](billing-fe-guide.md) §5–§7b for the full opt-in/checkout
  flows and the admin CRUD endpoints.
- **`pagination`** — matches `Page<T>`'s actual `size` behavior on `GET
/api/events/{eventId}/posts` (currently the only paginated endpoint). Useful if you want a
  page-size selector instead of a hardcoded `20`.
- **`planTiers`** — the public pricing catalog: every assignable, public plan in both scopes,
  ordered by scope then `sortOrder`. Filter by `scope` to build a pricing table — `EVENT` plans
  are what a host buys for one event, `ACCOUNT` plans govern how many events they may run at once.
  This is now admin-editable at runtime, so treat it as data and never hardcode a tier name.
  Each plan's `moduleKeys` are included for free; `paidModules` (added 2026-08-18) is the list of
  `MODULE_UNLOCK` paid services that plan sells instead, each with full price/billing detail — use
  it to render a pricing table's "included" vs. "available as add-on, $X/mo" module rows without
  cross-referencing `paidServices` yourself. `paidModules[].grantsModuleKey` is the module it
  unlocks. Also populated (as of 2026-08-21) on `GET /api/plan-tiers?eventType=X`'s response —
  null only from the admin catalog endpoints, which don't cross-reference it.
- **`eventModuleKeys`** — the single source of truth for valid module keys, replacing whatever
  hardcoded list (e.g. `ModuleKeyConvention`) the FE currently maintains. See below — this is
  now also enforced server-side, so drift here means requests start failing, not silently
  no-op'ing.
- **`rsvp`** — see "RSVP guest-count bounds" below.
- **`contentLimits`** / **`rateLimits`** — see the two new sections below.

## Module keys are now a closed, server-validated set

`EventModuleRequestDto.moduleKey` used to accept literally any string up to 50 characters and
just store it. It no longer does.

```ts
// POST /api/event-modules
{ "eventId": "...", "moduleKey": "schedule", "isEnabled": true, "configuration": {} }
```

now returns **`400`** with `errorCode: 3006` / `errorKey: "INVALID_MODULE_KEY"` for anything
outside the canonical keys — as of 2026-08-16 those are
`posts | rsvp | playlist | stories | gallery | wishlist | wishbook`. This only
affects **creating** a module (`POST /api/event-modules`) — `PATCH` doesn't take `moduleKey` at
all (never did), so existing modules can't be renamed into an invalid state.

**Action:** if `ModuleKeyConvention` (or equivalent) is currently a separately-maintained
TypeScript union, consider sourcing it from `eventModuleKeys` in the config response instead —
that removes the one remaining place the two lists could drift. This was previously flagged as
low-risk _because_ nothing enforced it either side; that's no longer true on the backend, so a
typo in a hardcoded FE list now produces a real `400` instead of a silently-accepted junk row.

No change to reading modules — `GET /api/events/{eventId}/modules` and the module-gating pattern
(`modules.find(m => m.moduleKey === 'posts')?.isEnabled`) work exactly as before.

## RSVP guest-count bounds are now enforced server-side

`RsvpRequestDto`/`RsvpPatchDto`'s `adultCount`/`childCount` previously had **zero** backend
validation — this was called out as a known gap in `fe-be-open-questions.md` §10. It's now
enforced:

| Field        | Min | Max |
| ------------ | --- | --- |
| `adultCount` | 1   | 5   |
| `childCount` | 0   | 4   |

These match the bounds already used by the FE's guest-submission steppers, so **no currently
working flow should change behavior** — this closes the gap between "the UI happens to prevent
it" and "the server actually rejects it," it doesn't tighten anything the FE wasn't already
assuming.

Out-of-range values now return **`400`** with `errorCode: 3001` / `errorKey:
"VALIDATION_FAILED"` and an `errors.adultCount` / `errors.childCount` message, on both
`POST /api/rsvps` and `PATCH /api/rsvps/{id}`. On the patch endpoint, omitting the field entirely
still works as a no-op (unrelated fields can still be patched without also resending guest
counts) — only an explicit out-of-bounds value is rejected.

**Action:** the values `1`/`5`/`0`/`4` are now also available from `GET /api/config` →
`rsvp.{minAdults,maxAdults,minChildren,maxChildren}`. If a host-side RSVP-count edit form gets
built (flagged as not-yet-existing in `fe-be-open-questions.md` §10), source its bounds from
there instead of re-hardcoding the same four numbers a third place.

## New: content character limits (2026-08-23)

Every free-text field across the app now has a server-enforced `@Size(max=...)`. Most of these
were previously **unbounded on the backend** — a post, for example, could be any length; the FE
just never sent anything long because nothing prompted it to. That gap is closed:

```ts
interface AppContentLimitsDto {
    postContentMaxLength: number; // 500
    commentContentMaxLength: number; // 300
    storyCaptionMaxLength: number; // 300
    wishbookMessageMaxLength: number; // 2000
    playlistSuggestionCommentMaxLength: number; // 300
    rsvpNotesMaxLength: number; // 500
    eventDescriptionMaxLength: number; // 2000
    eventSessionDescriptionMaxLength: number; // 1000
    moderationReasonMaxLength: number; // 500
    reportDescriptionMaxLength: number; // 1000
    reportResolutionNotesMaxLength: number; // 1000
    catalogDescriptionMaxLength: number; // 1000
}
```

| field                                | maps to                                                          | endpoint                              |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------- |
| `postContentMaxLength`               | `PostRequestDto.content`                                         | `POST /api/posts`                     |
| `commentContentMaxLength`            | `CommentRequestDto.content`                                      | `POST /api/comments`                  |
| `storyCaptionMaxLength`              | `StoryRequestDto.caption`                                        | `POST /api/stories`                   |
| `wishbookMessageMaxLength`           | `WishbookEntryRequestDto.message`                                | `POST /api/events/{eventId}/wishbook` |
| `playlistSuggestionCommentMaxLength` | `PlaylistSuggestionRequestDto.comment`                           | `POST /api/playlist-suggestions`      |
| `rsvpNotesMaxLength`                 | `RsvpRequestDto`/`RsvpPatchDto.notes`                            | `POST`/`PATCH /api/rsvps`             |
| `eventDescriptionMaxLength`          | `EventRequestDto`/`EventPatchDto.description`                    | `POST`/`PATCH /api/events`            |
| `eventSessionDescriptionMaxLength`   | `EventSessionRequestDto`/`Patch.description`                     | `POST`/`PATCH /api/event-sessions`    |
| `moderationReasonMaxLength`          | `ModerationActionRequestDto.reason`                              | `POST /api/moderation-actions`        |
| `reportDescriptionMaxLength`         | `ReportRequestDto.description`                                   | `POST /api/reports`                   |
| `reportResolutionNotesMaxLength`     | `ReportRequestDto.resolutionNotes`                               | `PATCH /api/reports/{id}` (admin)     |
| `catalogDescriptionMaxLength`        | `description` on plan tiers, paid services, event types, modules | admin catalog CRUD                    |

Exceeding a limit returns **`400`** with `errorCode: 3001` / `errorKey: "VALIDATION_FAILED"`, same
shape as any other field-validation error. Nothing that was previously accepted has been
retroactively invalidated — this only rejects _new_ writes over the limit.

**Action:** wire each textarea/input's `maxLength` and any live character counter to the matching
field here instead of a hardcoded number, the same way you'd source `rsvp` bounds. This is the
only place these numbers exist — the backend constants (`TextLimits.java`) have no other public
surface, so a mismatched hardcoded FE limit is now a genuine correctness bug, not just staleness.

Not included here: a handful of short fixed-width fields (names, emails, phone numbers, URLs,
enum-like strings) also gained limits as part of the same pass, but those mirror pre-existing
sibling-DTO conventions (e.g. `title`/`name` at 255) rather than being new judgment calls — treat
`255` chars as the safe default for any single-line text input the FE doesn't already constrain.

## New: per-endpoint rate limits (2026-08-23)

Global `429` handling already applies to every `/api/**` endpoint (see
`frontend-integration-guide.md` §0) — nothing changes about _how_ you handle a `429`. What's new is
that the guest content/interaction endpoints (posts, comments, reactions, stories, playlist
suggestions/votes, wishbook, RSVPs, media, invites) previously had **no endpoint-specific limit at
all** and silently fell back to the generous global default (300 req/min). They now have tighter,
purpose-fit budgets to prevent spam/abuse:

```ts
interface AppRateLimitConfigDto {
    name: string;
    limit: number;
    windowSeconds: number;
}
```

`GET /api/config` → `rateLimits` is the live list (sorted by `name`) — treat the table below as a
reference, not the source of truth; read `rateLimits` at runtime if you want to build any
client-side pre-throttling (e.g. disabling a submit button before the request even goes out).

| bucket (`name`)               | limit | window | endpoint(s)                                                             |
| ----------------------------- | ----- | ------ | ----------------------------------------------------------------------- |
| `post.write`                  | 20    | 60s    | `POST`/`DELETE /api/posts`                                              |
| `comment.write`               | 40    | 60s    | `POST`/`DELETE /api/comments`                                           |
| `reaction.write`              | 80    | 60s    | `POST`/`DELETE /api/reactions`                                          |
| `story.write`                 | 20    | 60s    | `POST`/`DELETE /api/stories`                                            |
| `story.view`                  | 120   | 60s    | `POST /api/stories/{id}/views`                                          |
| `playlist.suggestion.write`   | 20    | 60s    | `POST`/`DELETE /api/playlist-suggestions`                               |
| `playlist.vote.write`         | 80    | 60s    | `POST`/`DELETE /api/playlist-votes`                                     |
| `wishbook.write`              | 20    | 60s    | `POST /api/events/{eventId}/wishbook`, `DELETE /api/wishbook/{entryId}` |
| `post-media.write`            | 60    | 60s    | `POST`/`DELETE /api/post-medias`                                        |
| `rsvp.write`                  | 20    | 60s    | `POST`/`PATCH`/`DELETE /api/rsvps`                                      |
| `rsvp.session-response.write` | 30    | 60s    | `POST`/`DELETE /api/rsvp-session-responses`                             |
| `event-member.claim`          | 10    | 1 hour | `POST /api/event-members/{id}/claim`                                    |
| `event-invitation.accept`     | 20    | 60s    | `POST /api/event-invitations/{inviteToken}/accept`                      |
| `admin.user-delete`           | 5     | 1 hour | `DELETE /api/users/{id}` (admin)                                        |
| `admin.event-purge`           | 5     | 1 hour | `POST /api/admin/events/{id}/purge` (admin)                             |

Notes:

- Each bucket is counted **per caller** (per authenticated user id), same as every other rate
  limit in the app — not shared across users.
- A pair of endpoints sharing a bucket (e.g. `post.write` covering both create and delete) share
  one budget between them, not one each.
- `event-member.claim` and `admin.*` use a **1-hour** window, not 60 seconds — don't assume every
  bucket resets every minute when building a "try again in..." countdown; read `windowSeconds`.
- The two admin buckets are deliberately tight "safety brake" limits on destructive, irreversible
  actions (permanent user deletion, permanent media purge) — hitting one is expected to be rare
  and is not something to build UI reassurance around beyond the standard `429` message.
- `defaultRateLimit`/`defaultRateLimitWindowSeconds` (300/60 as of this writing) is what still
  applies to every other endpoint not in this table — most GETs, admin CRUD, etc.

**Action:** nothing is required — the existing global `429` handler already covers these. This
table exists so you can, if useful, pre-emptively disable a "post" button after N rapid submits
client-side, or explain a `429` on the composer with more specific copy than the generic message
(e.g. "You're posting too quickly — wait a moment.").
