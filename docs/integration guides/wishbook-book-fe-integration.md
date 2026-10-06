# FE integration guide: the wishbook book

**2026-10-06.** The wishbook's plain PDF export is gone. In its place a host can build a designed A5
keepsake book: cover, dedication, contents, one section per member role, a page of starred wishes,
and a closing page. It is built in the background (a Gotenberg service turns HTML into a PDF), stored
in R2, and handed out as a short-lived download link. The host is notified when it is ready.

Guests see nothing new. Everything here is **host-only** except the `highlighted` field's absence.

Related docs:
- [`frontend-api-types.ts`](../frontend-api-types.ts) — `WishbookBookStatus`, `WishbookBookDto`,
  `WishbookBookTextsDto`, `WishbookBookTextsRequestDto`, `WishbookEntryResponseDto.highlighted`,
  `MemberRoleCatalog*Dto.sectionLabel`
- [`soft-deleted-events-fe-integration.md`](soft-deleted-events-fe-integration.md) — a book can be
  built on a deleted event (§6 below)
- [`notification-cta-target-fe-integration.md`](notification-cta-target-fe-integration.md) — `EVENT_WISHBOOK`
- [`backend-localization-fe-integration.md`](backend-localization-fe-integration.md) — `Accept-Language`
- [`member-roles-fe-integration.md`](member-roles-fe-integration.md) — the role catalog the sections come from
- Design: [`../superpowers/specs/2026-10-06-wishbook-book-design.md`](../superpowers/specs/2026-10-06-wishbook-book-design.md)

## 1. Removed

`GET /api/events/{eventId}/wishbook/export` no longer exists (it answers 404/405 like any unmapped
path). Remove the "Download as PDF" button and the guide `wishbook-pdf-export-fe-integration.md` is
deleted with it. The Book panel below replaces both.

**Deploy order:** backend first, frontend in the same window. Between the two, the old button has
nothing to call.

## 2. Who may call what

Every endpoint in this guide is **host-only** (primary host or co-host), needs a signed-in account
(`ROLE_USER`; an invite-link guest token, `ROLE_GUEST`, gets 403), and needs the `wishbook` module to be
readable on the event.

| Caller | Response |
|---|---|
| Not signed in | `401` |
| Signed in, not a member, or a member who is not a host | `403` `4001` `FORBIDDEN` |
| Host of a StoryWall suspended by moderation | `403` `4015` `EVENT_SUSPENDED` |
| `wishbook` module not in the plan, switched off, or globally disabled | `409` `5012` `MODULE_NOT_AVAILABLE` |
| Unknown `eventId` | `404` `RESOURCE_NOT_FOUND` (`2001`) |
| Over a rate limit | `429` `3010` `RATE_LIMITED` |

Hide the whole panel for non-hosts; they would only ever get the 403.

## 3. Starring wishes

```
PUT    /api/wishbook/{entryId}/highlight   -> 204   (star)
DELETE /api/wishbook/{entryId}/highlight   -> 204   (unstar)
```

Both are idempotent: starring a starred wish, or unstarring a plain one, is a 204 and changes
nothing. Note the path is not nested under the event (like `DELETE /api/wishbook/{entryId}`).
Rate limit: **120 per 60 s per user, shared by PUT and DELETE**, so a host can flip stars quickly.
An optimistic toggle is fine; on any error, roll it back.

Errors (besides §2):

| Status | `errorCode` | When |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` (2001) | The wish does not exist or was already deleted. **Also: the event is soft-deleted** (starring is a write, and writes are closed there; see §6). |

Reading the flag: `WishbookEntryResponseDto.highlighted` is `true` / `false` **for hosts** and
`null` for everyone else (the field is always present, never omitted). Treat `null` as "you cannot
star this".

What starring does to the book:

- A starred wish is **featured**: it is drawn on a page of its own, sized to its length, and listed
  again in the closing "Everything that moved us" index (opening words, author, page number).
- Starred wishes come **last in their section**, after the ordinary ones. Within each group the
  order is oldest first.
- A starred wish over 450 characters is laid out like a long wish: it may break across pages instead
  of fitting one page. The FE does not need to do anything about this; it only matters if you show a
  "how will this look" hint.
- If nothing is starred, the book has no highlights section.

## 4. Book texts

Four pieces of fixed text in the book can be overridden by the host: the cover subtitle, the
dedication page, and the closing page's title and body. Each has a default per event type
(`WEDDING`, `BAPTISM` and `BIRTHDAY` have their own wording; everything else gets a generic one), in
English and Greek.

```
GET /api/events/{eventId}/wishbook/book-texts   -> WishbookBookTextsDto
PUT /api/events/{eventId}/wishbook/book-texts   -> WishbookBookTextsDto
```

```json
{
  "subtitle": null,
  "dedication": "Words from the people who were there.\nThank you.",
  "closingTitle": null,
  "closingBody": null,
  "defaults": {
    "subtitle": "Our wishes",
    "dedication": "Words, moments and wishes from the people who were there for us, and always will be.",
    "closingTitle": "Thank you, all of you!",
    "closingBody": "You made this day even more special."
  }
}
```

- The four top-level fields are the **host's overrides**; `null` means "not set, the default is
  used". `defaults` is always filled in, in the language of the request's `Accept-Language` (`el` or
  English): show it as the input placeholder. Nulls are sent, not omitted.
- **`PUT` replaces all four.** It is not a patch: a field you leave out, send as `null` or send
  blank **resets to the default**. Always send all four, with the current values for the ones the
  host did not touch.
- The response is the stored state, in the same shape as the `GET`. Show it, not what you sent: it
  is normalized (below).

Limits, checked **after normalization** (so a field padded with spaces still fits):

| Field | Max | Line breaks |
|---|---|---|
| `subtitle` | 80 | none, single line |
| `dedication` | 400 | kept, up to 6 lines |
| `closingTitle` | 80 | none, single line |
| `closingBody` | 300 | kept, up to 6 lines |

Normalization: Unicode NFC, control and invisible characters removed, runs of spaces collapsed,
text trimmed. In `subtitle` and `closingTitle` a line break is just whitespace and becomes a space.
In `dedication` and `closingBody`, `\r\n` and `\r` become `\n`, each line is normalized on its own,
leading and trailing blank lines are dropped, and several blank lines in a row become one; the
**6-line limit counts the blank separator lines** that remain, and the length limit counts the whole
joined text including its `\n`s. Text with no visible letter, digit or symbol (only punctuation or
whitespace) becomes `null`.

Lengths are counted in Java characters (UTF-16 units), not in what the user sees as characters:
an emoji or a mathematical-alphabet letter counts as 2. Do not hard-block at the limit in the UI;
use it as a soft counter and let the server decide.

Errors (besides §2):

| Status | `errorCode` | When |
|---|---|---|
| 400 | `3001` `VALIDATION_FAILED` | A field is longer than 1000 characters *before* normalization (the request-shape guard; `errors` names the field), **or** longer than its limit after normalization, **or** more than 6 lines. In the second and third case there is no `errors` map: `detail` names the field and the limit, e.g. `dedication must be at most 400 characters.` / `closingBody must be at most 6 lines.` |
| 404 | `RESOURCE_NOT_FOUND` (2001) | `PUT` on a soft-deleted event (host edits are closed there; `GET` still works). |

Rate limit: `PUT` is **30 per 60 s per user**. Save on blur or on a button, not on every keystroke.

Defaults are chosen by the request's `Accept-Language`. The book itself is built in the language of
the `POST` that started it (§5), so the placeholders and the book agree only if the FE sends the same
language on both calls, which it does as long as the language switcher sets the header globally.
The host's own override is printed as typed, in either language.

## 5. Building the book

### 5.1 Endpoints

```
POST /api/events/{eventId}/wishbook/book   (no body)  -> WishbookBookDto
GET  /api/events/{eventId}/wishbook/book              -> WishbookBookDto
```

```json
{
  "status": "READY",
  "requestedAt": "2026-10-06T10:00:00Z",
  "finishedAt": "2026-10-06T10:00:41Z",
  "pageCount": 24,
  "entryCount": 57,
  "byteSize": 1843200,
  "failureCode": null,
  "downloadUrl": "https://…"
}
```

`status` is `QUEUED | RUNNING | READY | FAILED`. Nulls are sent, not omitted:

| Field | Value |
|---|---|
| `requestedAt` | when the current build was requested; always set |
| `finishedAt` | `null` while `QUEUED`/`RUNNING`; set on `READY` and on `FAILED` |
| `pageCount`, `entryCount`, `byteSize`, `downloadUrl` | **non-null only when `status == READY`**, `null` in every other state |
| `failureCode` | non-null only when `FAILED` (§5.4) |

`entryCount` is the number of wishes that went into the book (it can be lower than the wishbook's
current count if wishes were added after the build). `byteSize` is in bytes.

**Rebuilding hides the old book.** `POST` on a `READY` book starts a new build; while it is
`QUEUED`/`RUNNING` the old file is **not** offered (`downloadUrl` is `null`), and if the rebuild
fails there is no download until a build succeeds. The previous file is deleted when the new one is
ready. Say so near the "Rebuild" button, or hide the old figures while a rebuild runs.

### 5.2 `POST` behaviour

- Never built, `READY` or `FAILED`: starts a new build and returns it as `QUEUED`. This resets the
  retry budget (§5.4).
- Already `QUEUED` or `RUNNING`: **returns that build** instead of starting another. The call is
  safe to repeat and safe from two co-hosts at once; there is nothing to de-duplicate on the client.
- The language of the book is fixed here, from the request's `Accept-Language`: Greek if it is `el`,
  English otherwise. A rebuild in another language is a new `POST`.

Errors (besides §2):

| Status | `errorCode` | When | UI |
|---|---|---|---|
| 409 | `5148` `WISHBOOK_EMPTY` | The event has no wishes. | "There are no wishes yet." Disable the button when the wish count is 0, but handle it anyway: a wish can be removed in between. |
| 503 | `5149` `WISHBOOK_BOOK_RENDERER_UNAVAILABLE` | This server has no renderer configured. No `retryAfterSeconds`. | Show `detail`, **do not retry or poll**. It will keep failing until an operator configures the renderer. |
| 429 | `3010` `RATE_LIMITED` | More than **10 calls in 3600 s per user** (every call counts, including the ones that return an existing build). | "Try again later". |

`GET` answers `404` `RESOURCE_NOT_FOUND` (`2001`) when the event's book was **never built**. That is
the normal first state, not an error: show "Create the book". It also answers 404 for an unknown
event. `GET` has no special rate limit beyond the default (300 per 60 s per user).

`4xx` and `5xx` here are request problems. A build that fails does **not** come back as an HTTP
error: it shows up as `status: "FAILED"` with a `failureCode` on a normal 200.

### 5.3 Polling and downloading

- Poll `GET …/book` **every 3 s** while `status` is `QUEUED` or `RUNNING`. Stop on `READY` or
  `FAILED`. A build usually takes seconds to a minute; there is no progress percentage.
- Stop polling when the panel unmounts, and do not poll in a background tab.
- The host also gets an in-app notification when it is ready (§7), so a host who navigates away
  does not have to wait on the page.
- `downloadUrl` is a presigned R2 link that **expires** (signing windows and TTL are in
  `presigned-url-windows-fe-integration.md`). **Never cache or store it.** Call `GET …/book` again
  immediately before the download and navigate to the fresh `downloadUrl`. A 403 from R2 means the
  link expired: fetch again.
- The file is served as an attachment named after the event title: `<title>.pdf` (control characters
  and `" \ / : * ? < > |` removed, at most 80 characters, `wishbook.pdf` if nothing is left). A plain
  `<a href={downloadUrl}>` or `window.location.assign` is enough; no `download` attribute is needed.
- Do not put the link in a notification, an email or a share sheet.

### 5.4 Failure codes

`status: "FAILED"` carries a `failureCode`. The set today:

| `failureCode` | Cause | Retried by the backend? |
|---|---|---|
| `RENDERER_TIMEOUT` | The renderer did not answer in time | yes |
| `RENDERER_UNREACHABLE` | The renderer could not be reached | yes |
| `RENDERER_INTERRUPTED` | The build was cut off (a deploy or shutdown) | yes |
| `RENDERER_HTTP_<n>` | The renderer answered with HTTP `n` (e.g. `RENDERER_HTTP_502`) | yes for `5xx` and `429`; **no** for any other `4xx` |
| `RENDERER_BAD_PDF` | The renderer returned something that is not a readable PDF | yes |
| `STORAGE_FAILED` | The PDF could not be stored | yes |
| `DB_UNAVAILABLE` | The database was briefly unavailable | yes |
| `PROCESSING_STALLED` | A build stopped making progress (for example the server restarted mid-build) | yes |
| `BUILD_ERROR` | Anything unexpected in assembling or rendering the book (a bug) | no |
| `RENDERER_NOT_CONFIGURED` | The renderer is not configured | no |
| `CONTENT_CHANGED` | Content in the book was removed after it was made (§5.5) | no |
| `MODULE_UNAVAILABLE` | The Wishbook module stopped being readable between the request and the build (plan change, host switched it off) | no |
| `EVENT_SUSPENDED` | The StoryWall was suspended by a moderation decision between the request and the build | no |

The set is open: a new code may appear, so do not branch on a closed union. **All of them mean "try
again".** Do not map each one to its own message. One generic line ("We couldn't create your book.
Please try again.") and a retry button is the whole UI; log `failureCode` to your own telemetry. For
the non-retryable ones, a retry may fail the same way, which is why the generic copy should not
promise success. `MODULE_UNAVAILABLE` and `EVENT_SUSPENDED` can only appear when the event's state
changed after the host pressed the button; the same `GET`/`POST` gates (5012, 4015) answer the next
request anyway, so the generic line is enough. `RENDERER_NOT_CONFIGURED` is not seen in practice, because `POST` answers 5149
before a build is ever queued.

**The one exception is `CONTENT_CHANGED`**: nothing went wrong, so the generic failure line would
mislead. Give it its own message, e.g. "A wish was removed since the book was made — create it
again." (el: "Μια ευχή αφαιρέθηκε μετά τη δημιουργία του βιβλίου — δημιουργήστε το ξανά."), with the
same build button. A rebuild succeeds normally.

The DTO does not say whether a failure will be retried. What happens behind a `FAILED`:

- A retryable failure is picked up again by a sweep that runs every 5 minutes, up to **3 attempts**
  in total per request. So a `FAILED` can turn back into `QUEUED` and then `READY` with nobody
  clicking anything. After the third failed attempt, or on a non-retryable code, it stays `FAILED`.
- A `POST` always starts over with a fresh budget of 3 attempts.
- A queued build that was lost (for example in a restart) is resubmitted the same way, without ever
  showing as failed.

So on `FAILED`: stop the 3 s polling, show the retry button, and optionally re-check once on a slow
timer (say every 60 s, for a few minutes) while the panel stays open, to catch a sweep recovery.
The notification (§7) fires only on success, so a failed build sends nothing.

### 5.5 Removing a wish takes the book down

A book holds copies of wishes, names and roles. When any of that is taken down, the stored book stops
being served **at once** and the host has to build it again:

- a wish is removed by its author, by a host, or by moderation (a report or DSA notice decided with
  content removal);
- the account of someone with a live wish in the book is deleted, once it is anonymized (the end of
  the account-deletion grace period);
- a moderator removes a member's custom role text (a report on a member decided with content
  removal), when that member has a live wish: the book prints that text beside their wishes. A
  catalog role, a host clearing the text, or the member changing it themselves do not do this;
- the event's cover image is removed (by moderation, a host or its uploader), because the book prints
  the cover.

The book then reads `status: "FAILED"`, `failureCode: "CONTENT_CHANGED"`, `downloadUrl: null` (with
`pageCount`/`entryCount`/`byteSize` null and `finishedAt` the time of the removal), and the PDF is
deleted from storage. This applies in every state: a `READY` book, and a build that is `QUEUED` or
`RUNNING` (it is stopped, its output is discarded, and no "ready" notification is sent). The backend
never rebuilds it by itself; `POST …/book` does, from the wishes left.

A guest changing their profile picture does **not** do this either, by product decision: the
previous picture can stay in an already-built book until the host rebuilds. Writing a wish, starring or unstarring one, and editing the book texts do **not** do this: the book
is simply out of date until the host rebuilds. Removing a member from the event doesn't either (their
wishes stay, §8).

There is no push for a removal made by someone else: the `GET` on mount and the 3 s polling while
building pick it up.

## 6. Soft-deleted events

The book is an **exception** to "hosts read everything, nobody writes" on a deleted event
(`soft-deleted-events-fe-integration.md`): during the soft-delete window a host can still
`POST …/book` to build it, `GET …/book`, and download. It is the host's last chance to keep it. The
build also runs to completion if the event is soft-deleted after the request.

Everything else in this guide stays closed there: `PUT …/highlight`, `DELETE …/highlight` and
`PUT …/book-texts` answer `404 RESOURCE_NOT_FOUND`; `GET …/book-texts` still works. So on a deleted
event, show the Book panel with Build/Download, and hide the star toggles and the text editor.

Once the event is **purged**, the stored book is deleted with it, and so is the event: every call
404s.

## 7. Notification

When a build finishes `READY`, the host who requested it gets:

- type `WISHBOOK_BOOK_READY`, category `SYSTEM`, severity `INFO`;
- title "Your wishbook is ready", body "The book for {event title} is ready to download.", CTA label
  "Open the wishbook" (localized by the backend from `Accept-Language` as for any notification);
- `ctaTarget: "EVENT_WISHBOOK"`, `ctaParams: { eventId }`.

Add the target to your route map (suggested route `/events/{eventId}/tools/wishbook`):

```ts
EVENT_WISHBOOK: (p) => `/events/${p.eventId}/tools/wishbook`,
```

The notification is sent **once per build request**, only to the requester (not to the other
co-hosts), and only on success; a rebuild after a success notifies again. Like other transactional
notifications it may also reach the host's email inbox, and its link opens the same wishbook page; it
never carries the download link. The wishbook page (`tools/wishbook`) is where the host downloads
it, so it must call `GET …/book` on load.

An older frontend that does not know `WISHBOOK_BOOK_READY` or `EVENT_WISHBOOK` should already be
rendering unknown types generically and hiding unknown CTAs (see the notification guides), so
nothing breaks.

## 8. Admin: section labels in the role catalog

A wish goes into the book section of its author's member role (catalog roles of the event type, in
`sortOrder`). Roles whose section title is the same share one section, placed at the lowest
`sortOrder` among them. Wishes with no role (custom role text, no role, roles hidden on the event, or
the author's membership was removed with nothing to fall back on) go into a final general section.
A removed member's role is kept on their wishes, so removing a guest does not move their wish.

`MemberRoleCatalogDto` (admin list and `/api/config` `memberRolesByEventType`) gains:

```ts
sectionLabel: Record<'en' | 'el', string> | null  // heading of this role's book section; null = use `label`
```

- `POST /api/admin/member-roles`: optional `sectionLabel`. When sent, **exactly** the keys `en` and
  `el`, each 1 to 40 characters after trimming (both are required when it is set).
- `PATCH /api/admin/member-roles/{id}`: `sectionLabel` replaces the whole map when sent (same
  rule). `clearSectionLabel: true` removes it and wins over `sectionLabel`.
- Failure is `400` `3001` with `detail` naming the problem (for example `section_label.el is
  required, 1 to 40 characters.`).

Seeded roles already have section labels (plural group titles, in both languages). Show the field in
the role editor under `label`, with the label as the placeholder.

## 9. Checklist

- [ ] Remove the "Download as PDF" button and any call to `…/wishbook/export`.
- [ ] Star toggle on each wish, host-only, driven by `highlighted` (`null` = not a host).
- [ ] Book texts editor: placeholders from `defaults`, `PUT` sends all four fields.
- [ ] Book panel: never built (404) / building (poll 3 s) / ready (download, rebuild, page count) /
      failed (generic message and retry; its own message for `CONTENT_CHANGED`, §5.5).
- [ ] Fetch `GET …/book` right before each download; never store `downloadUrl`.
- [ ] Handle 409 `5148` and 503 `5149` (the latter: show `detail`, no retry, no polling).
- [ ] `EVENT_WISHBOOK` in `CTA_ROUTES`; the wishbook page loads the book status on mount.
- [ ] Soft-deleted event: keep Build/Download, hide stars and the text editor.
- [ ] Admin role editor: `sectionLabel` en/el, and "clear".

## 10. Operator notes (not FE work)

- **Renderer:** the API needs a private [Gotenberg](https://gotenberg.dev) 8.12.0 service
  (`gotenberg/gotenberg:8.12.0`), reachable only from the API, **no public domain**. Start it with:
  ```
  gotenberg --chromium-allow-list=file:///tmp/.*
            --chromium-allow-file-access-from-files
            --api-timeout=180s
  ```
  Without `--chromium-allow-file-access-from-files`, the page cannot read its own stylesheet and
  every render hangs until the API timeout. The allow-list keeps Chromium off the network and off
  everything outside `/tmp`. With file access from files on, a page can read any file under `/tmp`, not
  only its own request's; that is harmless because no user content can run script.
- **Config:** set `WISHBOOK_GOTENBERG_URL` on the API (property `app.wishbook.book.gotenberg-url`),
  e.g. `http://gotenberg.railway.internal:3000`. With no URL, `POST …/book` answers 503 `5149`.
  Optional: `WISHBOOK_RENDER_TIMEOUT` (default `120s`; keep it below Gotenberg's `--api-timeout`) and
  `WISHBOOK_RETRY_SWEEP_CRON` (default every 5 minutes).
- **Local dev:** `docker compose up gotenberg` starts it on **host port 3001** (3000 is the frontend dev
  server); set `WISHBOOK_GOTENBERG_URL=http://localhost:3001`.
- **Migration:** V153 adds tables and columns (`wishbook_books`, `wishbook_book_texts`, the star
  and role-snapshot columns on `wishbook_entries`, `event_type_member_roles.section_label`) and
  backfills `section_label` for the catalog's existing roles with one `UPDATE`.
  V154 adds `wishbook_entries.author_user_id` (never exposed; lets account deletion scrub a wish
  after its author left the event) and backfills it from current memberships.
- **Storage:** PDFs live under `wishbook-books/` in R2 and are deleted when the event is purged.
- **One build at a time** per API instance (a single-lane executor), so a burst of requests queues.
