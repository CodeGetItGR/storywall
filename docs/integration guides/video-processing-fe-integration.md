# FE integration: async video processing (thumbnail + playable rendition)

Shipped 2026-08-30. Affects `POST /api/events/{eventId}/media`, `.../media/batch`,
`GET /api/medias/{id}`, `GET /api/events/{eventId}/media`, `POST /api/stories`, `POST
/api/stories/batch`, and `GET /api/config`. Read this if your FE uploads video anywhere
(gallery, feed, or stories).

## What changed

A video upload used to be stored and served as-is — whatever codec/container the guest's phone
produced, with no thumbnail. That's no longer true:

1. The upload request returns **immediately** once the raw file is stored — it does not wait for
   processing. The returned `MediaResponseDto` has `status: "PROCESSING"` and `thumbnailUrl: null`.
2. In the background, the server extracts a poster-frame thumbnail and re-encodes the video to a
   single H.264 MP4 rendition (capped dimension, everything downstream can assume one consistent
   format instead of "whatever the phone recorded").
3. On success, the row flips to `status: "READY"` with both `mediaUrl` and `thumbnailUrl`
   pointing at playable/viewable presigned URLs. On failure it flips to `status: "FAILED"`.

Images are unaffected — an image upload is still `status: "READY"` in the same response that
creates it, and `thumbnailUrl` is always `null` for images.

```jsonc
// Immediately after POST /api/events/{eventId}/media (video, context: "GALLERY")
{
  "id": "d4e5...uuid",
  "status": "PROCESSING",
  "thumbnailUrl": null,
  "mediaUrl": "https://...presigned-raw-upload...", // playable eventually, but not yet re-encoded
  "mimeType": "video/quicktime",
  // ...
}

// A few seconds later, GET /api/medias/{id}
{
  "id": "d4e5...uuid",
  "status": "READY",
  "thumbnailUrl": "https://...presigned-thumbnail.jpg",
  "mediaUrl": "https://...presigned-transcoded.mp4",
  "mimeType": "video/mp4", // now normalized, regardless of what was uploaded
  // ...
}
```

**Do this:**

- **Poll or re-fetch** `GET /api/medias/{id}` (or re-fetch the gallery page) after a video upload
  until `status` leaves `"PROCESSING"`. A short clip typically finishes in single-digit seconds;
  don't assume it's instant, and don't hardcode a specific delay — poll every couple of seconds.
- **Show a processing state** in the gallery/feed grid for any item with `status: "PROCESSING"` —
  a spinner or skeleton tile instead of trying to render `thumbnailUrl` (which is `null`) or play
  `mediaUrl` (which is the raw, not-yet-normalized upload).
- **On `status: "FAILED"`**, show a clear "this video couldn't be processed" state. This is
  permanent — nothing server-side will retry a `FAILED` row back to life if it failed for a
  reason that will never resolve (e.g. a story video over the duration cap); transient
  infrastructure failures *are* retried automatically server-side, but that's invisible to the
  FE — you only ever see the outcome (`READY` or terminal `FAILED`), never a retry-in-progress
  state.

## Story-specific video caps

A video uploaded with `context: "STORY"` is checked against a **tighter** cap than gallery/feed
video — both a smaller byte limit and a duration limit that doesn't apply anywhere else:

```ts
media.maxStoryVideoBytes;           // added 2026-08-30 — 50MB default, vs. maxVideoBytes' 200MB
media.maxStoryVideoDurationSeconds; // added 2026-08-30 — 60s default, no equivalent for gallery/feed
```

Both are on `GET /api/config` → `media` (see
[`app-config-fe-integration.md`](app-config-fe-integration.md)) — read them live rather than
hardcoding `50MB`/`60s`, same as every other admin-tunable limit in this API.

- Exceeding `maxStoryVideoBytes` is rejected **before any processing starts**, the same way
  `maxVideoBytes` always has been: `413`, `errorCode: 3013` (`MEDIA_FILE_TOO_LARGE`).
- Exceeding `maxStoryVideoDurationSeconds` is **not** caught at upload time — duration isn't known
  until the file is actually probed, which happens asynchronously. The upload still returns
  `202`-equivalent `status: "PROCESSING"` immediately; the row then flips straight to a
  **terminal** `status: "FAILED"` once the async job measures the real duration. There is no
  separate error response for this — poll and treat `FAILED` as the signal.
- The same long video uploaded with `context: "GALLERY"` (the default) is **not** subject to the
  duration cap at all — only `maxVideoBytes` applies. If your "add to story" flow reuses a
  generic upload component, make sure it passes `context: "STORY"` so the right cap is enforced
  server-side; passing the wrong context doesn't fail loudly, it just silently applies the wrong
  limit.

**Client-side UX suggestion:** since the duration cap only surfaces after upload (not as an
immediate error), consider reading the video's duration client-side (e.g. via an `HTMLVideoElement`
loaded from the local file) before uploading to a story, and warn the guest up front — the server
check is still the real enforcement, this is purely to avoid a "why did my story upload fail" surprise
after the file has already been sent.

## Attaching media to a story requires `status: "READY"`

`POST /api/stories` and `POST /api/stories/batch` now reject a `mediaId` that isn't fully
processed:

- Single-create (`POST /api/stories`): `400`, `errorCode: 3026` (`MEDIA_NOT_READY`) for the whole
  request if `mediaId` resolves to `Media` with `status` still `"PROCESSING"` or permanently
  `"FAILED"`.
- Batch (`POST /api/stories/batch`): isolated per item — a not-ready `mediaId` lands in
  `failed[]` with `errorCode: "MEDIA_NOT_READY"`, same as an unresolvable `mediaId`; the rest of
  the batch still succeeds. See
  [`stories-fe-integration-guide.md`](stories-fe-integration-guide.md) §Batch create for the
  general batch shape.

**Do this:** in a "select an uploaded video to post as a story" picker, filter out (or visibly
disable) any item whose `status` isn't `"READY"` — don't let the guest attempt it and then
surface a `3026`. This is exactly the same reason `MediaResponseDto.status` was added to the
gallery listing response in the first place: so a picker built on `GET
/api/events/{eventId}/media` can make this filtering decision without a second round-trip per
item.

## What did not change

- No new endpoint. Upload is still the same two endpoints, just with an added `context` field
  (default `"GALLERY"`, so existing calls that don't pass it are unaffected).
- Image upload behavior, caps, and response timing are completely unchanged.
- `maxVideoBytes` (the general, non-story video cap) is unchanged — `200MB` default, enforced at
  upload time exactly as before.
- Existing video rows uploaded before this shipped were not backfilled with a `status` —
  historical data written before this migration defaults to `status: "READY"` (the migration's
  default), so old videos won't retroactively show as `PROCESSING` or gain a `thumbnailUrl`.

## Checklist

- [ ] Handle `status: "PROCESSING"` on any `MediaResponseDto` for `mediaType: "VIDEO"` — show a
      loading/processing tile instead of the (null) thumbnail or the (not-yet-normalized) `mediaUrl`.
- [ ] Poll `GET /api/medias/{id}` (or re-fetch the containing list) until `status` leaves
      `"PROCESSING"`.
- [ ] Handle terminal `status: "FAILED"` with a clear, non-retryable-looking UI state.
- [ ] Pass `context: "STORY"` on any upload destined for a story, and read
      `maxStoryVideoBytes` / `maxStoryVideoDurationSeconds` from `GET /api/config` instead of
      hardcoding `50MB`/`60s`.
- [ ] Filter "post as story" media pickers to `status === "READY"` items only, to avoid a
      `3026 MEDIA_NOT_READY` the picker could have prevented.
