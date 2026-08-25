# FE integration guide: admin list endpoint pagination

Covers a **breaking change** to five `ROLE_ADMIN`-only list endpoints, all of which used to
return their entire table in one response:

- `GET /api/users`
- `GET /api/audit-logs`
- `GET /api/moderation-actions`
- `GET /api/reports`
- `GET /api/telemetry-events`

Every one of these grows unboundedly with platform usage — `telemetry-events` and
`audit-logs` in particular are append-only logs with no retention cap — so `findAll()` was
doing a full unfiltered table scan on every load of an admin panel screen. All five now
follow the same `Page<T>` pattern already used by `GET /api/events/{eventId}/posts`. No
other endpoint on any of these five controllers is affected — `GET .../{id}`, `POST`
(where it exists), and `DELETE .../{id}` all keep their current shapes.

## What changed

| | Before | After |
|---|---|---|
| Response shape | `T[]` (whole table) | `Page<T>` |
| Page size | unbounded | 50/page by default, max 100 |
| Order | database default (usually insertion order) | newest first (`createdAt desc`, `id` tiebreaker) |

## Fetching a page

Identical query params across all five endpoints:

```
GET /api/audit-logs?page=0&size=50
Authorization: Bearer {accessToken}
```

- `page` — 0-indexed, defaults to `0`.
- `size` — defaults to `50`, capped server-side at `100`.
- Sort is fixed server-side (newest first) — there's no `sort` param to pass.

**200 response** (shape shown for `/api/audit-logs`; the other four wrap their own DTO the
same way — see [`frontend-api-types.ts`](../frontend-api-types.ts) for each `T`):

```json
{
  "content": [
    {
      "id": "d5f6...uuid",
      "eventId": "a1c2...uuid",
      "actorMemberId": "b3f1...uuid",
      "action": "EVENT_UPDATED",
      "entityType": "Event",
      "entityId": "a1c2...uuid",
      "changes": { "title": ["Old title", "New title"] },
      "ipAddress": "203.0.113.4",
      "createdAt": "2026-08-24T09:15:00Z"
    }
  ],
  "totalElements": 48213,
  "totalPages": 965,
  "number": 0,
  "size": 50
}
```

Same `Page<T>` envelope as the post feed — see
[`post-feed-fe-integration.md`](post-feed-fe-integration.md#pagination-ui) for the
`interface Page<T>` shape and an infinite-scroll/paged-table loop you can reuse as-is (swap
the endpoint and item type).

## Migration checklist

- [ ] For each of the five admin screens (users, audit logs, moderation actions, reports,
      telemetry events), read `response.content` instead of treating the response as an
      array directly.
- [ ] Add paging controls to whatever table/list component renders these — `page`,
      `totalPages`, `totalElements` are all present in the envelope for a page-number
      footer or "load more" button.
- [ ] If any admin screen relied on fetching the whole table client-side to filter/search
      in-browser (e.g. searching audit logs by actor), that no longer works past the first
      page — filtering needs to move server-side or be scoped down before these changes are
      adopted. None of these five endpoints currently accept filter query params beyond
      `page`/`size`; flag to backend if server-side filtering is needed.
