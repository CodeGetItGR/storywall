# FE integration guide: multi-image post upload

Covers uploading multiple images in one go and attaching them to a post — the "pick 5
photos from your camera roll and post them" flow. Two steps, always in this order:

1. **Batch-upload the files** → get back a `mediaId` per file.
2. **Create the post** (or attach to an existing one) referencing those `mediaId`s.

There is no single endpoint that does both at once — media upload and post creation are
deliberately separate resources (a `Media` row can be reused across posts/stories), so the
frontend owns stitching these two calls together.

## 1. Batch-upload the files

```
POST /api/events/{eventId}/media/batch
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

files:            <binary>[]   required — repeat the "files" part once per file, 1..10 files
mediaType:        "IMAGE"      required — shared by every file in this batch
uploaderMemberId: uuid         optional
```

- Caller must be a member of the event (`ROLE_USER` or a guest whose invite covers this
  event) — a non-member gets `403`.
- **Max 10 files per request.** Sending 11+ returns `400`, `errorCode: 3003`
  (`TOO_MANY_FILES`), before any file is uploaded — check the count client-side first so
  you don't burn an upload attempt on a request that's rejected outright.
- **20MB per file, 220MB per request.** Exceeding either returns `413`, `errorCode: 3005`
  (`REQUEST_TOO_LARGE`).

**200 response** (`MediaBatchUploadResponseDto`) — always `200`, even if every file failed.
Don't treat a non-200 as "some files failed"; check the body instead:

```json
{
  "created": [
    { "id": "d4e5...uuid", "eventId": "a1c2...uuid", "mediaUrl": "https://...", "originalFilename": "img1.jpg", "mediaType": "IMAGE", "...": "…rest of MediaResponseDto" }
  ],
  "failed": [
    { "filename": "img2.jpg", "errorCode": "STORAGE_UPLOAD_FAILED", "message": "This file couldn't be uploaded. Please try again." }
  ]
}
```

- `created[]` — one `MediaResponseDto` per file that succeeded, in upload order (**not**
  necessarily the order you selected them in if you fire this as a single multipart
  request — but since it's one request, order is preserved as submitted).
- `failed[].message` is **clean, user-facing text** — safe to show directly next to the
  failed thumbnail (e.g. "This file couldn't be uploaded. Please try again."). Don't build
  your own copy from `errorCode` unless you want custom wording; `errorCode` is there if
  you do.
- Every file is processed independently — one bad file (corrupt, R2 hiccup) does not block
  or roll back the others. If `failed` is non-empty, let the user retry just those files
  (re-submit a new batch with only the failed ones) rather than re-uploading everything.

## 2. Create the post with the uploaded media

```
POST /api/posts
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "eventId": "a1c2...uuid",
  "type": "MEDIA",
  "isPinned": false,
  "mediaIds": ["d4e5...uuid", "f6a7...uuid"]
}
```

- `mediaIds` is **ordered** — the array index becomes each image's `displayOrder` in the
  post's carousel. Build this array in the order you want images shown, using the `id`s
  from step 1's `created[]` (only include ones that actually succeeded).
- **Max 10 items.** Exceeding it returns `400`, `errorCode: 3001` (`VALIDATION_FAILED`),
  with `errors.mediaIds` set.
- **No duplicates.** Returns `400`, `errorCode: 3004` (`DUPLICATE_MEDIA_ID_IN_REQUEST`) —
  shouldn't happen if `mediaIds` is built from step 1's response, but guard against
  double-submission bugs.
- **Every id must belong to this same `eventId`.** A stale/mismatched id returns `404`.

**200 response** — `PostResponseDto` for the created post. Fetch
`GET /api/posts/{postId}/media` afterward to render the carousel with resolved
`mediaUrl`s (the post-create response itself doesn't embed them).

## Attaching more images to an existing post later

If the user adds images to a post *after* it's already created (rather than at
creation time), upload via step 1 as usual, then attach each one individually:

```
POST /api/post-medias
Authorization: Bearer {accessToken}
Content-Type: application/json

{ "postId": "...", "mediaId": "...", "displayOrder": 3 }
```

- One call per media item — there's no batch version of this endpoint.
- Caller must be the post's author or a HOST of the event.
- Same 10-item cap applies here, counted against what's already attached: attaching an
  11th item returns `409`, `errorCode: 5007` (`POST_MEDIA_LIMIT_EXCEEDED`). Check the
  post's current media count (`GET /api/posts/{postId}/media`) before showing an "add more
  photos" control if you want to disable it proactively instead of relying on the 409.

## Error summary for this feature

| Step | Code | HTTP | Meaning | Suggested handling |
|---|---|---|---|---|
| Batch upload | `TOO_MANY_FILES` (3003) | 400 | >10 files in one batch request | Split into multiple batches, or block selection past 10 client-side |
| Batch upload | `REQUEST_TOO_LARGE` (3005) | 413 | File(s) too big (20MB/file, 220MB/request) | Show per-file size limit before upload |
| Batch upload (per file) | `STORAGE_UPLOAD_FAILED` | — (in `failed[]`, not HTTP status) | That one file failed to upload | Offer retry for just that file |
| Post create | `VALIDATION_FAILED` (3001) | 400 | >10 `mediaIds`, or other field validation | Cap selection at 10 before allowing "Post" |
| Post create | `DUPLICATE_MEDIA_ID_IN_REQUEST` (3004) | 400 | Same media id twice in `mediaIds` | Shouldn't happen from normal UI flow — dedupe defensively |
| Post create / attach | `RESOURCE_NOT_FOUND` (2001) | 404 | A `mediaId` doesn't belong to this event | Drop stale ids and retry, or surface a generic error |
| Standalone attach | `POST_MEDIA_LIMIT_EXCEEDED` (5007) | 409 | Post already has 10 media items | Disable "add more" once the post hits 10 |

## Suggested page flow

```
1. User selects up to 10 images (enforce the 10-image cap in the picker UI itself)
2. POST /api/events/{eventId}/media/batch with all selected files
   - created[] → keep these mediaIds, in order
   - failed[]  → show per-file error inline, offer "retry" per failed thumbnail
3. Once satisfied with the created[] set (retries done or user proceeds anyway):
   POST /api/posts { eventId, type: "MEDIA", isPinned, mediaIds: [...created ids, in display order] }
4. GET /api/posts/{postId}/media to render the finished post's image carousel
```

If the user cancels mid-flow after step 2 but before step 3, the uploaded `Media` rows
still exist server-side but are attached to nothing — that's expected (they can be reused
later or left orphaned; there's no cleanup expected from the frontend).
