# FE integration guide: editing a post

Covers a change shipped 2026-09-03: posts can now be edited after creation. See
`frontend-integration-guide.md` §0 for base setup (auth header, the RFC 7807 error envelope).

## Why

There was no way to fix a typo or unpin/pin a post short of deleting and recreating it (which loses
comments and reactions). This adds a partial-update endpoint for the two fields that actually change
after publish.

## What's new

### `PATCH /api/posts/{id}`

```http
PATCH /api/posts/{id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "content": "corrected text", "isPinned": true }
```

**Only `content` and `isPinned` are editable.** Both are optional in the request body and PATCH
semantics apply: a field you omit (or send as `null`) is left unchanged, not cleared. There's no way
to blank out `content` on a post that already has text via this endpoint.

**`type` and the post's media attachments are not editable here.** `type` is fixed at creation.
Media stays managed the way it already is post-creation — via `POST`/`DELETE /api/post-medias`
(`PostMediaController`) — not through this endpoint. Don't add an image picker to an "edit post"
form; keep add/remove-photo actions wired to the existing post-media calls.

**Authorization: the post's author, or any host of the event, may edit it** — the same rule that
already gates `DELETE /api/posts/{id}`. A plain attendee editing someone else's post gets `403
FORBIDDEN`. Gate the edit UI (pencil icon / "Edit post") on `isAuthor || isHost`, the same check you
already use to show the delete control.

```jsonc
// 200 — PostResponse, same shape as GET /api/posts/{id} and POST /api/posts
{
  "id": "…",
  "eventId": "…",
  "type": "TEXT",
  "content": "corrected text",
  "isPinned": true,
  "media": [ /* unchanged */ ],
  "commentCount": 4,
  "reactionCount": 12,
  …
}
```

No new error codes — a missing post is the same `404 RESOURCE_NOT_FOUND` (2001) as `GET
/api/posts/{id}`, and `content` over the existing 500-char limit is `400 VALIDATION_FAILED` (3001)
with `errors.content` set, same as on create.

## Error codes

| code | HTTP | when | what to show |
|---|---|---|---|
| `2001` `RESOURCE_NOT_FOUND` | 404 | post doesn't exist (or was deleted) | refetch the feed / navigate away |
| `4001` `FORBIDDEN` | 403 | caller is neither the author nor a host | shouldn't be reachable from correctly-gated UI |
| `3001` `VALIDATION_FAILED` | 400 | `content` exceeds 500 chars | inline field error, same as the create form |

## TypeScript types

```ts
export interface PostPatchRequest {
  content?: string | null;
  isPinned?: boolean | null;
}
```
