# FE integration guide: media ingest hardening, compression, and paid storage

Everything shipped from the 2026-08-14 security/billing review of the media pipeline, in one
place. Most of the individual pieces already have their own doc — this is the map between them,
plus the handful of behaviours that are genuinely new. If you only read one section, read
[§1](#1-what-changed-and-whether-it-touches-you) — most of this is transparent to the frontend.

Related docs, referenced throughout rather than duplicated:
- [`multi-image-post-upload-fe-integration.md`](multi-image-post-upload-fe-integration.md) — the
  upload/batch-upload endpoints and their error codes
- [`billing-fe-guide.md`](billing-fe-guide.md) — plans, checkout, the "keep originals" add-on,
  storage packs
- [`app-config-fe-integration.md`](app-config-fe-integration.md) — `GET /api/config`, the source
  of truth for every limit mentioned below
- [`frontend-integration-guide.md`](frontend-integration-guide.md) — base setup, auth, error shape

## 1. What changed, and whether it touches you

| Change | FE-visible? | Where |
|---|---|---|
| Upload storage key/content-type derived from file bytes, not the client's filename/MIME | No — same request/response shape | [§2](#2-upload-hardening-nothing-to-change) |
| Stored objects served `Content-Disposition: attachment` | **Only for direct navigation to a presigned URL** | [§2](#2-upload-hardening-nothing-to-change) |
| Decompression-bomb pixel cap now covers GIF/WEBP too (previously only JPEG/PNG) | No — same error code, wider coverage | [§3](#3-compression-pipeline) |
| New `503 MEDIA_PROCESSING_BUSY` under load | **Yes — new error code to handle** | [§3](#3-compression-pipeline) |
| Deleted media is purged from storage in ~1 day instead of ~30 | No — nothing to undo a deletion today either way | [§4](#4-retention-nothing-to-build-context-only) |
| Storage quota check is now exact (was racy under concurrent uploads) | No — same `409` you already handle | [§4](#4-retention-nothing-to-build-context-only) |
| Add-ons can be restricted to specific plan tiers | **Yes — new field, new error code** | [§5](#5-paid-storage-and-add-on-changes) |
| Admin can remove an add-on entitlement | **Yes — new admin-only endpoint** | [§5](#5-paid-storage-and-add-on-changes) |
| Add-on/plan currency mismatch is now caught server-side | No — this is a catalog-misconfiguration guard, unreachable from a correct catalog | [§5](#5-paid-storage-and-add-on-changes) |

## 2. Upload hardening — nothing to change

Uploads used to trust the browser's `Content-Type` header and the client-supplied filename to
decide how a file was stored and served. Both are now derived entirely server-side from the
file's magic bytes: the request/response shapes are identical, and this needs no client change.
See `multi-image-post-upload-fe-integration.md` §"mediaType is no longer a request param" for the
detection behaviour itself (that part shipped earlier; the extension/storage-key derivation is
the part that shipped in this review).

**One thing that does change what you see:** stored objects are now served with
`Content-Disposition: attachment`. `<img src>`, `<video src>`, and `fetch()` are unaffected —
this only changes what happens when a user **navigates directly** to a presigned media URL
(e.g. an "open image in new tab" link), which now downloads the file instead of rendering it
inline. If you have that affordance anywhere, render the media in your own viewer instead of
linking straight to the presigned URL. This is a deliberate second line of defence — belt to the
content-type fix's braces — against a file ever being interpreted as something executable on the
bucket's own origin.

## 3. Compression pipeline

The feed derivative pipeline (resize, re-encode, EXIF strip) is unchanged in shape. Two things
moved:

**The pixel-count cap (decompression-bomb guard) now applies uniformly to every image kind**,
including GIF and WEBP, which previously skipped it entirely — WEBP has no `ImageIO` reader in
the JVM, so its dimensions are now read straight out of the container header instead. Same error
code as before, `413 MEDIA_IMAGE_TOO_MANY_PIXELS` (3016), just no longer bypassable by uploading
a bomb in one specific format. Default cap is **50 megapixels** — see
`multi-image-post-upload-fe-integration.md` for the full error shape (`width`/`height`/`pixels`/
`limitPixels` in `details`).

**New: `503 MEDIA_PROCESSING_BUSY` (3017).** Image re-encoding is now bounded to a small number
of concurrent decodes rather than unbounded — under a burst of large uploads, a request can be
told to back off instead of competing for heap with everything else in flight. This is always
transient:

```jsonc
{ "errorCode": 3017, "message": "The server is busy processing images right now. Please try again in a moment." }
```

Handle it like any other retryable failure — show the message, retry the single affected file
after a short delay. In a batch upload it appears per-file in `failed[]`, so the rest of the
batch is unaffected and doesn't need retrying.

## 4. Retention — nothing to build, context only

Two numbers changed, neither is FE-facing:

- A **deleted photo**'s storage object is now destroyed in ~1 day (was ~30). There has never been
  an undo/restore path in the app, so this doesn't remove anything you could previously build —
  it closes a cost/abuse gap where quota was freed instantly on delete while the bytes kept
  being billed for a month.
- A **deleted event**'s row now survives ~30 days before hard-delete (previously tied to the same
  1-day clock as the photo purge above). Still nothing to build — an event delete was already
  irreversible from the UI's perspective.

Separately, the storage-quota check that gates uploads (`409 EVENT_STORAGE_LIMIT_EXCEEDED`) is
now exact under concurrent uploads instead of approximate — you may see slightly more consistent
rejections right at the edge of a plan's ceiling during a burst of simultaneous uploads to the
same event. The error code and response shape are unchanged.

## 5. Paid storage and add-on changes

Everything about plans, checkout, and the "keep originals" add-on is in `billing-fe-guide.md`
§5–§7b — this section only covers what's new since that doc was last current.

### Add-ons can now be restricted to specific plans

`PaidServiceResponseDto` (part of `GET /api/config`'s `paidServices` array, and the admin catalog
endpoints) gained:

```ts
planTierIds: string[];   // EVENT-scope plan tier ids this service is offered on. EMPTY = every plan.
```

**Empty/omitted means unrestricted** — this is the state of every service in the catalog today
(the "keep originals" add-on and all three storage packs), so nothing changes for the current
purchase UI. If an admin does restrict a service to specific tiers, buying it from an event on a
different plan now returns `409 PAID_SERVICE_NOT_ON_PLAN` (5040) instead of silently succeeding.
Filter the purchase UI (opt-in toggle / storage-pack list) against the event's own `planTier` and
each service's `planTierIds` so this becomes unreachable rather than a runtime error a host has
to see.

### Admin can remove an add-on

```http
DELETE /api/admin/events/{eventId}/addons/{paidServiceCode}
```

Admin-only — **there is still no host-facing way to opt out** of an add-on once opted in; that
invariant hasn't changed. This is a support-panel tool for unwinding an entitlement (typically
alongside a refund), not something to surface to hosts. Takes effect at the event's next
renewal; already-stored originals are left untouched — deciding what happens to those is part of
whatever decision brought an admin here in the first place. `409 ADDON_NOT_ACTIVE` (5041) if the
event has no such add-on active.

### Currency mismatch guard (informational)

Checkout now refuses to combine a plan amount and an add-on amount priced in different
currencies (`409 PAID_SERVICE_CURRENCY_MISMATCH`, 5039) rather than silently charging the wrong
number. This is a catalog-consistency guard — reachable only if an admin reprices a service into
a different currency than the plans it's sold alongside — and should be treated as "checkout is
broken, contact support" if a host ever sees it, the same as any other 409 in the "admin-facing"
column of the billing guide's error table.

## 6. Error code reference (this review only)

| Code | HTTP | Meaning | FE handling |
|---|---|---|---|
| `3016` `MEDIA_IMAGE_TOO_MANY_PIXELS` | 413 | Image exceeds the 50MP decode cap — now enforced for every format including GIF/WEBP | Unchanged: show message, offer resize |
| `3017` `MEDIA_PROCESSING_BUSY` | 503 | Server is at its concurrent-decode limit | New: retry the affected file after a short delay |
| `5039` `PAID_SERVICE_CURRENCY_MISMATCH` | 409 | Catalog misconfiguration — add-on and plan priced in different currencies | Admin-facing; host sees a generic failure |
| `5040` `PAID_SERVICE_NOT_ON_PLAN` | 409 | Service is restricted to plan tiers this event isn't on | Filter the purchase UI by `planTierIds` so this is unreachable |
| `5041` `ADDON_NOT_ACTIVE` | 409 | Admin removing an add-on the event doesn't have | Admin panel only |
