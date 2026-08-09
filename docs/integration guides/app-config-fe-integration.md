# FE integration guide: App config, module keys, RSVP bounds

Covers three related changes shipped 2026-08-05: a new **`GET /api/config`** endpoint, a
**canonical `ModuleKey` enum now enforced server-side**, and **RSVP guest-count validation**
that previously didn't exist. See `frontend-integration-guide.md` §0 for base setup (auth
header, error shape) — this doc only covers what's new.

## GET /api/config

Public — no `Authorization` header needed, safe to call before login (e.g. to gate the login
screen itself behind a feature flag). Read-only, no side effects, nothing sensitive in the
payload.

```ts
interface AppConfigResponseDto {
  featureFlags: PlatformFeatureFlagResponseDto[];
  media: {
    maxFileSizeBytes: number;
    maxRequestSizeBytes: number;
    maxBatchUploadFiles: number;
    maxMediaPerPost: number;
    presignedUrlTtlMinutes: number;
    publicHost: string | null; // hostname media URLs are served from
  };
  pagination: { defaultPageSize: number; maxPageSize: number };
  planTiers: PlanTierResponseDto[];   // was Record<'FREE'|'PLUS'|'PRO', {...}> — see plan-tiers-fe-integration.md
  eventModuleKeys: ('posts' | 'rsvp' | 'playlist' | 'stories' | 'gallery')[];
  rsvp: { minAdults: number; maxAdults: number; minChildren: number; maxChildren: number };
}
```

Full type breakdown (`AppMediaConfigDto`, `PlanTierResponseDto`, etc.) is in
[`frontend-api-types.ts`](frontend-api-types.ts) under "App config". See
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
- **`media.maxFileSizeBytes` / `maxRequestSizeBytes` / `maxBatchUploadFiles`** — validate the
  file picker against these instead of the hardcoded `20MB`/`220MB`/`10` currently baked into
  the multi-image upload flow (see
  [`multi-image-post-upload-fe-integration.md`](multi-image-post-upload-fe-integration.md)).
  Client-side rejection is still just UX — the server enforces the real limit regardless.
- **`media.maxMediaPerPost`** — same idea for the post composer's "max 10 images" guard.
- **`pagination`** — matches `Page<T>`'s actual `size` behavior on `GET
  /api/events/{eventId}/posts` (currently the only paginated endpoint). Useful if you want a
  page-size selector instead of a hardcoded `20`.
- **`planTiers`** — the public pricing catalog: every assignable, public plan in both scopes,
  ordered by scope then `sortOrder`. Filter by `scope` to build a pricing table — `EVENT` plans
  are what a host buys for one event, `ACCOUNT` plans govern how many events they may run at once.
  This is now admin-editable at runtime, so treat it as data and never hardcode a tier name.
- **`eventModuleKeys`** — the single source of truth for valid module keys, replacing whatever
  hardcoded list (e.g. `ModuleKeyConvention`) the FE currently maintains. See below — this is
  now also enforced server-side, so drift here means requests start failing, not silently
  no-op'ing.
- **`rsvp`** — see "RSVP guest-count bounds" below.

## Module keys are now a closed, server-validated set

`EventModuleRequestDto.moduleKey` used to accept literally any string up to 50 characters and
just store it. It no longer does.

```ts
// POST /api/event-modules
{ "eventId": "...", "moduleKey": "schedule", "isEnabled": true, "configuration": {} }
```

now returns **`400`** with `errorCode: 3006` / `errorKey: "INVALID_MODULE_KEY"` for anything
outside the five canonical keys: `posts | rsvp | playlist | stories | gallery`. This only
affects **creating** a module (`POST /api/event-modules`) — `PATCH` doesn't take `moduleKey` at
all (never did), so existing modules can't be renamed into an invalid state.

**Action:** if `ModuleKeyConvention` (or equivalent) is currently a separately-maintained
TypeScript union, consider sourcing it from `eventModuleKeys` in the config response instead —
that removes the one remaining place the two lists could drift. This was previously flagged as
low-risk *because* nothing enforced it either side; that's no longer true on the backend, so a
typo in a hardcoded FE list now produces a real `400` instead of a silently-accepted junk row.

No change to reading modules — `GET /api/events/{eventId}/modules` and the module-gating pattern
(`modules.find(m => m.moduleKey === 'posts')?.isEnabled`) work exactly as before.

## RSVP guest-count bounds are now enforced server-side

`RsvpRequestDto`/`RsvpPatchDto`'s `adultCount`/`childCount` previously had **zero** backend
validation — this was called out as a known gap in `fe-be-open-questions.md` §10. It's now
enforced:

| Field | Min | Max |
|---|---|---|
| `adultCount` | 1 | 5 |
| `childCount` | 0 | 4 |

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
