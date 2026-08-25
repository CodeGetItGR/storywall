# FE integration guide: gallery archive download

Host-only bulk download of an event's gallery as a zip. New feature — there was previously no way
to get more than one file at a time; the only existing paths were the per-item feed URL and
[`GET /api/medias/{id}/original`](billing-fe-guide.md#retrieving-the-original) (§7a of the billing
guide). This adds three endpoints on top of those, doesn't change any of them.

**2026-08-25:** Added §7, a third endpoint for downloading a host-picked subset of the gallery
(e.g. a multi-select "download these 12 photos" UI) as one zip, instead of the whole gallery split
into server-planned parts.

Related docs:
- [`billing-fe-guide.md`](billing-fe-guide.md) §7a — the "keep originals" add-on this feature reads
  the entitlement from
- [`frontend-api-types.ts`](../frontend-api-types.ts) — `MediaArchiveManifestDto` /
  `MediaArchivePartDto`, the wire shapes below
- [`frontend-integration-guide.md`](frontend-integration-guide.md) §0 — auth header, error shape

## 1. The calls

```http
GET /api/events/{eventId}/media/archive/manifest?variant=DISPLAY|ORIGINAL
GET /api/events/{eventId}/media/archive?variant=DISPLAY|ORIGINAL&part=1
GET /api/events/{eventId}/media/archive/selected?variant=DISPLAY|ORIGINAL&mediaIds=id1,id2,...
```

All three host-only (`403` for anyone else, including the member who uploaded the most photos). All
`404` if the event doesn't exist. `variant` defaults to `DISPLAY` on all three if omitted. The third
is for a multi-select "download these" flow rather than the whole gallery — see §7.

**Always call the manifest first.** It's not just a preview — the download endpoint plans its
parts by re-walking the gallery the same way the manifest does, so the manifest is how you learn
how many parts exist and how big each one is before you start pulling zip bytes.

## 2. The manifest

```jsonc
GET /api/events/{eventId}/media/archive/manifest?variant=ORIGINAL

{
  "variant": "ORIGINAL",
  "originalsAvailable": true,
  "photoCount": 412,
  "videoCount": 18,
  "displayTotalBytes": 4180000000,     // ~4.1 GB — always the DISPLAY total, whichever variant you asked for
  "originalTotalBytes": 38900000000,   // ~38.9 GB — always the ORIGINAL total, same reason
  "itemsWithoutOriginal": 31,
  "parts": [
    { "part": 1, "itemCount": 210, "sizeBytes": 1998000000 },
    { "part": 2, "itemCount": 220, "sizeBytes": 2001000000 }
  ]
}
```

**Both totals are always returned, regardless of which `variant` you asked for.** That's
deliberate — render the DISPLAY-vs-ORIGINAL size comparison from one call instead of firing the
manifest twice. `parts` describes the plan for the `variant` you actually requested.

### Build the picker from this response, not from `keepOriginals` alone

- Show the toggle only when `originalsAvailable` is `true`. If it's `false`, don't render the
  choice at all — asking for `ORIGINAL` on an event without the add-on is a `403` (§4), and the
  event's `keepOriginals`/billing state can theoretically be stale relative to this call, so treat
  `originalsAvailable` as the source of truth for whether to show the toggle, not a cached copy of
  the event.
- **Pre-select `ORIGINAL` when it's available, but show both numbers before the host commits.**
  They're paying for the originals, so default to giving them the originals — but originals
  routinely run 5–10× the display size, and a host about to pull 38 GB on hotel wifi should see
  that number, not discover it mid-download. Render something like *"38.9 GB (originals) · 4.1 GB
  (compressed)"* with the originals option pre-checked.
- **Surface `itemsWithoutOriginal` when it's nonzero and `variant=ORIGINAL`.** It counts items
  that have no archival original on file and will silently fall back to their compressed copy in
  the zip — every video (videos are never re-encoded, so there's nothing to keep an original
  *of*), plus any photo uploaded before the add-on was switched on. A host who paid for originals
  and gets a zip with some files smaller than expected should have been told why. One line is
  enough: *"18 videos and 13 older photos will use the compressed copy — no original was kept for
  those."*
- `photoCount` / `videoCount` are of **live** media only — soft-deleted items are excluded, same
  as the feed.

### `parts` — always fetch it, even for a small gallery

An empty gallery returns `parts: []` — treat that as "nothing to download," don't call the archive
endpoint with `part=1` in that case, it'll `400`.

Otherwise, drive the download UI off this array directly: one row/button per part, labelled from
`itemCount` and `sizeBytes` (e.g. *"Part 1 of 2 — 210 items, 2.0 GB"*). Don't try to infer part
count or sizes from `displayTotalBytes`/`originalTotalBytes` divided by some assumed cap — the
packing isn't uniform (see §3.1) and the cap itself is a config value you don't have visibility
into from the frontend.

## 3. Downloading a part

```http
GET /api/events/{eventId}/media/archive?variant=ORIGINAL&part=1
Authorization: Bearer {accessToken}

200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="gallery-part1-of-2.zip"
Transfer-Encoding: chunked
```

This is a **direct binary response**, not JSON — treat it like any other file download (trigger a
`<a download>`/browser save, or for a native client stream it straight to disk). There's no
wrapper object to unwrap.

**No `Content-Length`.** The exact zipped size isn't known until the last file is written into the
zip, so the response is chunked. Use the part's `sizeBytes` from the manifest for any progress bar
or "estimated size" display — the actual download will land within a few KB of it, since the zip
is written uncompressed (photos and videos are already compressed; re-compressing them buys
nothing and only costs CPU).

**This is a slow, heavy request — build the UI like a large download, not like an API call:**
- Don't block on it with a spinner-and-timeout pattern the way you would a normal fetch. Use a
  native download (browser `<a href>` navigation, or a background download task on native) so the
  OS/browser owns the progress and retry, rather than holding the response in JS memory.
- Expect requests that run from several seconds to several minutes depending on part size and the
  host's connection. This is exactly why the gallery is split into parts in the first place — a
  part failing partway through only costs that part, not the whole gallery.
- **A part can fail partway through** (dropped connection, network change) with no clean error
  response — the 200 and the zip header are already sent by the time a mid-stream read failure can
  happen server-side, so a broken connection is how that failure reaches you. Just let the host
  retry the same part; nothing server-side needs resetting.

### 3.1 What's inside the zip

- Entries are named `NNNN_<sanitized-original-filename>`, e.g. `0001_IMG_4821.jpg`,
  `0002_IMG_4821.jpg` for two files that both happened to be named identically by different
  phones (common — don't be surprised by it). The index is padded to 4 digits and is **continuous
  across parts**: part 2 picks up numbering where part 1 left off, so a host who downloads every
  part and unzips them into one folder gets one ordered sequence with no collisions, not several
  overlapping ones.
- Filenames are sanitized server-side — only letters, digits, spaces, `.`, `-`, `_` survive;
  everything else (including path separators) becomes `_`. Don't re-derive a "clean" filename
  client-side from `originalFilename` for a manifest-adjacent display; if you want to show a
  per-item name in the UI use the media list you already have from
  `GET /api/events/{eventId}/media`.
- At `variant=ORIGINAL`, an item with no archival original (see `itemsWithoutOriginal` above) is
  packed as its compressed display copy instead — the zip is always complete, every live item is
  in it, just not always at full resolution. There's no way to tell which entries fell back to the
  display copy from inside the zip itself; if that distinction matters to your UI, surface
  `itemsWithoutOriginal` up front (§2) rather than trying to detect it post-download.
- Parts are packed in upload order (oldest first) and split by a server-side size cap — an item
  bigger than the cap gets a part entirely to itself. Don't assume a fixed item-count-per-part;
  it's size-driven, not count-driven, and the cap is a server config value, not a documented
  frontend constant.

## 4. Errors

| Code | HTTP | When | FE handling |
|---|---|---|---|
| `ORIGINALS_ADDON_NOT_ACTIVE` (5054) | 403 | `variant=ORIGINAL` requested on an event without the "keep originals" add-on | Shouldn't be reachable if you gate the toggle on `originalsAvailable` (§2) — treat as a bug in your gating if it happens, not a state to design a message for |
| `MEDIA_ARCHIVE_PART_NOT_FOUND` (3019) | 400 | `part` isn't in the current plan — either out of range, or the gallery is empty | Re-fetch the manifest and rebuild the part list. Reachable without any client bug: parts are recomputed per request rather than stored, so an upload or delete between your manifest call and the download can shift the plan. If you see this, silently re-fetch the manifest once before surfacing anything to the host |
| Plain `403` (no specific code) | 403 | Caller is a member but not a host of this event | Don't show the bulk-download entry point to non-hosts at all — same rule as every other host-only action in this app |
| Plain `404` | 404 | Event doesn't exist | Shouldn't be reachable from a live event page |

Both manifest and download share the host/existence checks — a `403`/`404` on the manifest means
the download would fail the same way, so there's no need to call the download endpoint just to
confirm it.

## 5. Rate limits

- Manifest: 30 requests/minute per caller.
- Download: **10 requests/hour per caller.** This is deliberately tight — each request reads every
  object in a part out of object storage and streams it through the server, the single most
  expensive read the API serves. Don't poll the download endpoint, don't build a "preview" that
  calls it speculatively, and don't retry-loop faster than a human clicking a stuck download would.
  A `429` here means show a wait message, not switch to a shorter retry interval.

## 6. Suggested flow

1. Host opens "Download gallery" from the event dashboard (host-only entry point).
2. Fetch the manifest at your best-guess default variant (`ORIGINAL` if you already know
   `keepOriginals` is true from the event, `DISPLAY` otherwise — either is fine as a first guess
   since the response tells you the truth either way).
3. Render both totals and the item counts; if `originalsAvailable`, show the toggle (pre-selected
   to `ORIGINAL`) and re-fetch the manifest when it's flipped, since `parts` is variant-specific.
4. If `itemsWithoutOriginal > 0` and the host is on `ORIGINAL`, show the one-line caveat from §2.
5. List `parts` as separate downloads. Let the host start them one at a time or all at once,
   whichever your download-manager pattern already supports for other file downloads in the app —
   there's nothing archive-specific about how the browser/OS should queue them.
6. On `MEDIA_ARCHIVE_PART_NOT_FOUND`, silently re-fetch the manifest once and rebuild the list
   before telling the host anything went wrong.

## 7. Downloading a selection

For a multi-select UI — the host checks a handful of photos in the gallery grid and hits
"download selected" — use this instead of the part-based flow. There's no manifest call for it:
you already have `fileSize` for every item from the gallery feed the grid is rendering, so there's
nothing to preview that you don't already have.

```http
GET /api/events/{eventId}/media/archive/selected?variant=ORIGINAL&mediaIds=3fa8...,9c21...,...
Authorization: Bearer {accessToken}

200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="gallery-selected-12.zip"
```

Same direct-binary, chunked, no-`Content-Length` response as §3 — same download-UI guidance
applies (native `<a href>` navigation, not a JS-held fetch). `mediaIds` is a comma-separated list
of media ids, in the order they should appear in the zip; the `NNNN_` entry-numbering in the zip
follows that order, starting at `0001` (there's no cross-part continuation here — a selection is
always one zip).

Duplicate ids in the list are silently collapsed to one entry rather than rejected — harmless if
your selection state can produce one.

**Shares the same 10-requests/hour budget as §3** (`media.archive.download`) — it's the same
expensive per-object read through the server, just at a caller-chosen scope instead of a
server-planned one. Don't build a workaround that re-requests the whole gallery as a series of
small selections to dodge the part-based rate limit; it's the same bucket either way.

### 7.1 Limits and errors

| Code | HTTP | When | FE handling |
|---|---|---|---|
| `MEDIA_ARCHIVE_SELECTION_EMPTY` (3021) | 400 | `mediaIds` was empty | Don't show the download action until at least one item is selected |
| `MEDIA_ARCHIVE_SELECTION_TOO_LARGE` (3022) | 400 | More items selected than `GET /api/config` → `media.maxArchiveSelectedItems`, or their combined size is over `media.maxArchivePartBytes` (the same cap §3's parts use) | Split the selection and download it in batches. Cap the multi-select UI at `maxArchiveSelectedItems` (see [`app-config-fe-integration.md`](app-config-fe-integration.md)) rather than surfacing the error after the fact. There's no client-visible size for the `ORIGINAL` copy of an item (`MediaResponseDto.fileSize` is always the `DISPLAY` size), so a pre-flight byte-cap check is only reliable at `variant=DISPLAY` — at `ORIGINAL` you can't predict this error client-side and should just handle the `400` |
| `MEDIA_ARCHIVE_SELECTION_INVALID` (3023) | 400 | One or more `mediaIds` don't resolve to a live item of this event — wrong event, already deleted, or never existed | Reachable without a client bug: an item can be deleted between the grid being rendered and the download being triggered. Drop the missing ids from your selection state and let the host retry |

`ORIGINALS_ADDON_NOT_ACTIVE` and the plain `403`/`404` cases behave exactly as in §4.
