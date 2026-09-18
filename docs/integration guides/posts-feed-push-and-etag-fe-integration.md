# FE integration guide: per-event feed push + ETag

Covers two additive changes for the post feed and comment list:

1. `GET /api/events/{eventId}/posts` and `GET /api/posts/{postId}/comments` now return an
   `ETag` header, and accept `If-None-Match` for a conditional GET.
2. A new endpoint, `GET /api/events/{eventId}/stream`, pushes a bare "something changed"
   signal over Server-Sent Events whenever a post or comment is created, edited, or deleted
   for that event.

Neither is a breaking change — both endpoints work exactly as before if you ignore the new
header and never open the stream. This is meant to replace a fixed-interval poll (e.g. every
10–15s) with something that only re-fetches when there's actually something new, without
losing polling as a fallback.

## The recommended pattern

1. On mount, mint a stream token and open one SSE connection per viewed event (see
   [Opening the stream](#opening-the-stream) below).
2. On the feed/comments request, save the `ETag` response header.
3. On every subsequent request to that same endpoint, send `If-None-Match: <saved ETag>`.
   Most responses will be `304 Not Modified` with an empty body — treat that as "nothing to
   render, keep what you have."
4. When the SSE stream delivers a `changed` event, re-issue step 2/3 immediately.
5. Independently of the stream, still poll on a long interval (60s+) as a fallback — see
   [Fallback polling](#fallback-polling-still-recommended) below.

## Opening the stream

This app has no session cookies anywhere — auth is pure `Authorization: Bearer` — but the
browser's native `EventSource` can't set custom headers, so it can't carry that token
directly. Opening the stream is therefore a two-step handshake:

**Step 1 — mint a short-lived stream token**, using your normal access token as usual:

```
POST /api/events/{eventId}/stream-token
Authorization: Bearer {accessToken}
```

```json
{ "token": "eyJhbGciOi...", "expiresInMs": 60000 }
```

- Same authorization as the stream itself — `403` if you're not a member of the event,
  `401` if unauthenticated.
- The returned `token` is single-purpose and short-lived (60s by default). It is **only**
  ever accepted as the `token` query parameter on that exact event's stream URL below —
  never as a header, never on any other endpoint, and it expires quickly even if it leaks
  into browser history or a proxy log. Call this endpoint immediately before opening the
  stream; don't cache the token or reuse it for a later reconnect — mint a fresh one instead.

**Step 2 — open the stream with that token in the URL:**

```
GET /api/events/{eventId}/stream?token={streamToken}
```

- Requires membership in the event (checked again here, independently of step 1) — `403`
  if the caller isn't a member, `401` if the token is missing, expired, or was minted for a
  different event.
- The connection is `text/event-stream` and stays open for up to 30 minutes, then closes;
  reconnect from step 1 (mint a new token — the old one is long expired by then) and resume
  the pattern above.
- It carries **no payload data** — it's a signal to re-fetch, not a copy of what changed.
  One stream per event covers both posts and comments for that event; you don't need a
  separate stream per post to watch its comments.

```ts
async function openEventStream(eventId: string, accessToken: string) {
  const res = await fetch(`/api/events/${eventId}/stream-token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const { token } = await res.json();

  const stream = new EventSource(`/api/events/${eventId}/stream?token=${token}`);
  stream.addEventListener("changed", () => {
    refetchFeed();
    refetchOpenCommentLists();
  });
  return stream;
}
```

- `EventSource` reconnects automatically on a dropped connection, but it reuses the same
  URL — and therefore the same, by-then-expired token — so an auto-reconnect attempt will
  fail with `401` once the token's 60s window has passed. Listen for `EventSource`'s
  `error` event and, on it, close the stream and call `openEventStream` again from
  scratch (fresh token, new `EventSource`) rather than relying on its built-in retry:

```ts
stream.addEventListener("error", () => {
  stream.close();
  setTimeout(() => openEventStream(eventId, accessToken), 1000);
});
```

- The retry above covers a dropped *stream*. If the `stream-token` mint itself fails, look at
  the status before retrying: `401`, `403` (no longer a member) and `404` (event gone) will
  keep failing, so stop; anything else (`429` — honour `Retry-After` — `5xx`, network) is
  transient, so retry with exponential backoff (1s, 2s, 4s… capped) rather than a fixed 1s.
  Without that, a tab left open on an event the user was removed from hammers
  `/stream-token` once a second indefinitely.

- The server also sends a periodic **comment-only** line (an SSE heartbeat, no `event:`
  name) roughly every 20s to keep the connection alive through proxies. `EventSource`
  ignores comment lines on its own — you don't need to handle these.
- If your API client doesn't expose `EventSource` (e.g. React Native), any SSE-compatible
  client that dispatches on the `changed` event name works the same way; the heartbeat
  comment lines are still safe to ignore.

## Conditional GET on the feed and comments endpoints

Both endpoints behave exactly as before, plus:

```
GET /api/events/{eventId}/posts?page=0&size=20
Authorization: Bearer {accessToken}
```

**200 response** — unchanged body, plus:

```
ETag: "a1c2...-14-8f3b2e1c"
Cache-Control: no-cache
```

Send it back on the next request to the same URL (same `eventId`/`postId`, same
page/size/sort — the ETag is scoped to the exact query, not just the resource):

```
GET /api/events/{eventId}/posts?page=0&size=20
Authorization: Bearer {accessToken}
If-None-Match: "a1c2...-14-8f3b2e1c"
```

**304 response:** empty body, no `content`/`totalElements` — nothing changed since that
ETag was issued. Keep whatever you last rendered.

**200 response:** something changed — parse the body as usual and save the new `ETag`
header for the next round.

```ts
async function fetchFeed(eventId: string, page: number, lastETag?: string) {
  const res = await fetch(`/api/events/${eventId}/posts?page=${page}&size=20`, {
    headers: lastETag ? { "If-None-Match": lastETag } : {},
  });
  if (res.status === 304) {
    return null; // no change — keep current state
  }
  const etag = res.headers.get("ETag") ?? undefined;
  const page_ = await res.json();
  return { page: page_, etag };
}
```

The same applies to `GET /api/posts/{postId}/comments` — identical `ETag`/`If-None-Match`
mechanics, scoped per post.

### Why the ETag can change even when *your* page of results didn't

The ETag is derived from a single version counter on the *event* (any post or comment
change bumps it), not from the specific page/resource you requested. A comment added to a
different post in the same event will still invalidate your feed's ETag and your other open
comment lists for that event — expect an occasional `200` where the returned page looks
identical to what you already had. This is intentional (a coarser, cheaper invalidation) and
not a bug; just re-render with the fresh data as usual.

## Fallback polling (still recommended)

The stream is an optimization, not a delivery guarantee — treat a dropped or silently
stalled connection as a normal, expected case rather than an error to handle specially.
Keep a low-frequency poll (60s or slower) running independently of the stream, using the
same conditional-GET pattern above. In steady state this costs one extra `304` per
interval; if the stream is working, you'll almost always see the real update land via
`changed` first.

## Migration checklist

- [ ] `POST /api/events/{eventId}/stream-token`, then open one `GET
      /api/events/{eventId}/stream?token=...` `EventSource` per viewed event; close it on
      unmount.
- [ ] Handle the `EventSource` `error` event by closing the stream and re-minting a fresh
      token before reconnecting — don't rely on `EventSource`'s built-in retry, since it
      would replay the same, by-then-expired token.
- [ ] On `changed`, re-fetch the feed and any open comment lists for that event.
- [ ] Save the `ETag` response header from feed/comments responses and send it back as
      `If-None-Match` on the next request to the same endpoint+query.
- [ ] Treat `304` as "no change" — don't clear existing state or show a loading flash.
- [ ] Keep a 60s+ fallback poll running independently of the stream.
- [ ] If you had a tighter fixed-interval poll (e.g. every 10–15s) as the sole update
      mechanism, it's safe to remove now that the stream + fallback poll cover it.
