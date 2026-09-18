# FE integration guide: paginated response shape change

## What changed

The backend now enables `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)`
([EventSocialMediaApplication.java](../src/main/java/event_social_media/EventSocialMediaApplication.java)).
This replaces Spring's raw `PageImpl` JSON serialization with a stable `PagedModel` DTO for
every controller endpoint that returns `Page<T>`. It fixes this startup warning:

```
Serializing PageImpl instances as-is is not supported, meaning that there is no
guarantee about the stability of the resulting JSON structure!
```

This is a **breaking response shape change** — no URLs, query params, or status codes changed,
only the JSON body shape of paginated responses.

## Shape diff

Old (`PageImpl`, flat):

```json
{
  "content": [ /* items */ ],
  "totalElements": 137,
  "totalPages": 5,
  "number": 0,
  "size": 30,
  "pageable": { "...": "..." },
  "sort": { "...": "..." },
  "first": true,
  "last": false,
  "numberOfElements": 30,
  "empty": false
}
```

New (`PagedModel`, nested):

```json
{
  "content": [ /* items */ ],
  "page": {
    "size": 30,
    "number": 0,
    "totalElements": 137,
    "totalPages": 5
  }
}
```

Key points:
- `content` stays at the top level, unchanged.
- `totalElements`, `totalPages`, `number`, `size` move under a new `page` object.
- `pageable`, `sort`, `first`, `last`, `numberOfElements`, `empty` are **gone**. If any FE
  code reads these, it needs replacing (see below — all are derivable from `page`).
- No `_links`/HATEOAS wrapper is added (Spring HATEOAS isn't on the classpath here).

## Affected endpoints

All of these now return the new shape instead of a raw array or the old `Page` shape:

- `GET /api/users`
- `GET /api/notifications`
- `GET /api/events/{eventId}/media`
- `GET /api/events/{eventId}/posts`
- `GET /api/posts/{postId}/comments`
- `GET /api/audit-logs`
- `GET /api/moderation-actions`
- `GET /api/reports`
- `GET /api/telemetry-events`
- `GET /api/telemetry-events` (admin)
- `GET /api/events/{eventId}/wishbook`
- Platform metrics admin: events / calendar-day-events listing endpoints

## What FE needs to change

1. **Update the shared `Page<T>` type** to the new nested shape (already updated in
   [docs/frontend-api-types.ts](frontend-api-types.ts) — pull the new interface into the FE repo).
2. **Update every call site reading pagination fields** — replace:
   - `page.totalElements` → `page.page.totalElements`
   - `page.totalPages` → `page.page.totalPages`
   - `page.number` → `page.page.number`
   - `page.size` → `page.page.size`
3. **Replace any usage of removed fields:**
   - `first` → `page.page.number === 0`
   - `last` → `page.page.number >= page.page.totalPages - 1`
   - `numberOfElements` → `page.content.length`
   - `empty` → `page.content.length === 0`
4. **`pageable`/`sort` echo is gone** — if any FE code relied on the server echoing back the
   requested page/sort (e.g. to sync UI state), it must now track that from the request it
   made, not the response.
5. No change needed to request-side query params (`?page=`, `?size=`, `?sort=`, `?unreadOnly=`
   etc.) — those are untouched.

## Suggested rollout

Since this is a single global flag flip, it applies atomically to all paginated endpoints at
once — there's no per-endpoint opt-in/out. Coordinate the FE deploy with this backend deploy;
a FE build still reading the old flat shape will silently read `undefined` for
`totalElements`/`totalPages`/etc. after this ships (fields simply won't exist under the new
shape — no error, just broken pagination UI).
