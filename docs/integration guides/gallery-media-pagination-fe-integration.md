# FE integration guide: gallery media pagination

Covers a **breaking change** to `GET /api/events/{eventId}/media` — the gallery listing
used to return the event's entire media history in one response; it's now paginated the
same way `GET /api/events/{eventId}/posts` already is. No other media endpoint is
affected: `GET /api/medias/{id}`, `POST /api/events/{eventId}/media`,
`POST /api/events/{eventId}/media/batch`, `GET /api/medias/{id}/original`, and the
archive endpoints all keep their current shapes.

## What changed

| | Before | After |
|---|---|---|
| Response shape | `MediaResponseDto[]` | `Page<MediaResponseDto>` |
| Page size | unbounded (whole gallery) | 30/page by default, max 100 |
| Order | undefined | newest first (`createdAt desc`, `id` tiebreaker) |

The old endpoint fetched and presigned every photo/video an event had ever had, on every
gallery load — for a long-running event with thousands of items, that's an increasingly
slow request and a growing response payload for no benefit, since nobody scrolls that far
in one sitting. It now costs the same regardless of how much history the event has.

## Fetching a page

```
GET /api/events/{eventId}/media?page=0&size=30
Authorization: Bearer {accessToken}
```

- `page` — 0-indexed, defaults to `0`.
- `size` — defaults to `30`, capped server-side at `100`.
- Sort is fixed server-side (newest first) — there's no other meaningful order for a
  gallery grid yet, so `sort` isn't worth passing.

**200 response:**

```json
{
  "content": [
    {
      "id": "d5f6...uuid",
      "eventId": "a1c2...uuid",
      "uploaderMemberId": "b3f1...uuid",
      "storageKey": "events/.../photo.jpg",
      "mediaUrl": "https://...presigned...",
      "originalFilename": "photo.jpg",
      "mimeType": "image/jpeg",
      "mediaType": "IMAGE",
      "fileSize": 204800,
      "width": 1600,
      "height": 1200,
      "durationSeconds": null,
      "metadata": {},
      "createdAt": "2026-08-20T18:02:00Z",
      "deletedAt": null
    }
  ],
  "totalElements": 812,
  "totalPages": 28,
  "number": 0,
  "size": 30
}
```

Same `Page<T>` envelope as the post feed — see
[`post-feed-fe-integration.md`](post-feed-fe-integration.md#pagination-ui) for the
`interface Page<T>` shape and an infinite-scroll loop you can reuse as-is (swap the
endpoint and item type).

## Migration checklist

- [ ] Update the gallery fetch to read `response.content` instead of treating the
      response as an array directly.
- [ ] Add pagination/infinite-scroll state (`page`, `totalPages`) to the gallery grid,
      the same way it already exists for the post feed.
- [ ] If the gallery pre-fetched everything up front (e.g. to power a "N photos" count
      or a lightbox that pages through all items client-side), switch that count to
      `totalElements` and load additional pages lazily as the lightbox advances, rather
      than fetching the whole gallery eagerly.
