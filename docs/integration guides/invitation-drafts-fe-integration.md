# Invitation drafts: frontend integration

Save my date's editor saves here. A draft is a host's own copy of a theme's `InvitationDocument`
(storywall `lib/invitation`): starting one copies the theme's document, and the theme is never touched.
The design is not copied: every load answers the theme's design as it is now.

## The three states

| State | How it gets there | Who may read and write |
| --- | --- | --- |
| Anonymous | Started with no sign-in | Whoever sends its token, until it expires |
| Owned | Started signed in, or claimed | Its owner |
| Attached | Attached to an event | The event's current hosts (primary and co-hosts) |

- **Anyone else gets 404**, as if it did not exist. That includes a co-host taken off the event, even if
  they started the draft: once attached, the owner has no rights of their own.
- An anonymous draft expires **7 days after its last save**. Every save moves the expiry out. Claiming
  removes it. Expired means 404, and a nightly job deletes it.
- A draft stays on one event. An event has at most one draft; delete it to start over from another theme.
- A suspended event's draft answers 403 `4015` to its hosts. A soft-deleted event's draft can be read by
  its hosts but not written or deleted (404).

## An expired sign-in

A visitor sends no `Authorization` header. A signed-in user who sends an expired token gets 401 on every
route here, including the ones open to visitors, so the usual refresh and retry works; they are never
treated as a visitor.

## The token

Send it as `X-Invitation-Draft-Token` on every call for an anonymous draft. It is answered once, by the
`POST` that started the draft, and can't be fetched again, so keep it (with the draft id) in the
browser. Once a draft has an owner, the token opens nothing.

## Endpoints

All under `/api/invitation-drafts`.

| Method and path | Who | Rate limit |
| --- | --- | --- |
| `POST /` | Anyone | Visitor: 20 per hour per address. Signed in: 60 per hour |
| `GET /` | Signed in | |
| `GET /{id}` | Anyone with access | |
| `PUT /{id}` | Anyone with access | 120 per minute |
| `DELETE /{id}` | Anyone with access | |
| `POST /{id}/claim` | Signed in, plus the token | 30 per 10 minutes |
| `POST /{id}/images` | Signed in, with access | 60 per hour per user |
| `DELETE /{id}/images/{mediaId}` | Signed in, with access | |
| `PUT /{id}/event` | Signed in | |

### Start: `POST /`

```json
{ "themeSlug": "kyknos", "eventId": null }
```

`themeSlug` is required and must name an active theme, otherwise 404. `eventId` is optional, needs a
signed-in caller who hosts that event, and attaches the draft at once. Answers **201** with a `Draft`.

### `Draft`: answered by start, load, claim and attach

```json
{
  "id": "uuid",
  "themeSlug": "kyknos",
  "themeName": "Κύκνος",
  "eventType": "WEDDING",
  "themeRevision": 3,
  "eventId": null,
  "revision": 0,
  "document": { "schemaVersion": 1, "themeId": "…", "overrides": {}, "sections": [] },
  "design": { },
  "imageUrls": { "m-baby": "https://…" },
  "expiresAt": "2026-11-14T10:00:00Z",
  "updatedAt": "2026-11-07T10:00:00Z",
  "token": "only-in-the-answer-that-started-it"
}
```

- `imageUrls` maps a `mediaId` to a URL, for the images the design and document point at. The URLs can
  be presigned and expire, so reload instead of storing them.
- `eventId`, `expiresAt` and `token` are `null` when they don't apply. Nulls are sent, not left out.

### Autosave: `PUT /{id}`

```json
{ "revision": 4, "document": { } }
```

Both are required, and the body is capped at 2 MB. Answers **200**:

```json
{ "id": "uuid", "revision": 5, "expiresAt": null, "updatedAt": "2026-11-07T10:00:00Z" }
```

Send the `revision` you loaded or were last answered. If the draft was saved since, the answer is 409
`5208` and nothing changes: reload rather than overwrite. The document is checked on every save (`3120`
with `details.problems`):

- The format's JSON Schema and its cross-field rules. Images are references only
  (`{source: 'media', mediaId}` or `{source: 'theme', assetId}`), so a URL or data URI in an image fails.
- `themeId` can't change.
- A `mediaId` must be one of the theme's images, or one the draft already points at (a theme image an
  admin has since deleted must not lock a host out).

Theme assets (`source: 'theme'`) are **not** checked here: drafts follow the theme live, so an admin
removing one must not stop a save. Publishing must check them.

### Claim: `POST /{id}/claim`

Body optional: `{ "eventId": "uuid" }` also attaches it. Send the token header. Answers **200** with a
`Draft`. Repeating a claim from the same account changes nothing and needs no token, so a retry after a
lost answer is safe. If the event part fails, the claim is undone too.

### Attach: `PUT /{id}/event`

```json
{ "eventId": "uuid" }
```

Answers **200** with a `Draft`. Naming the event it already has changes nothing.

### List: `GET /`

The caller's unattached drafts and the drafts of events they host, newest first, at most 100, without
their documents:

```json
[{ "id": "uuid", "themeSlug": "kyknos", "themeName": "Κύκνος", "eventType": "WEDDING",
   "eventId": null, "revision": 4, "updatedAt": "2026-11-07T10:00:00Z" }]
```

### Delete: `DELETE /{id}`

Answers **204**.

## Photos

A visitor signs in and claims the draft first; there are no uploads to an anonymous draft.

`POST /{id}/images`, multipart, with the file in the part named `file`:

- JPEG, PNG or WebP, judged by the bytes and not by the name or the declared type.
- At most 5 MB and 4096 px a side. Bigger than that is refused, so compress in the browser first.
- At most 100 images in a draft, used or not, and 300 across all the drafts an account owns. Deleting
  photos or an old draft frees room.

It answers 201 with `{ mediaId, url, contentType, width, height, byteSize }`. `width` and `height` are the
stored file's: a JPEG or PNG is re-encoded, which applies its rotation, drops its metadata and scales it
down past 2560 px.

Put the `mediaId` in the document as `{ "source": "media", "mediaId": "img-..." }`. The `url` is only for
showing the photo now, because it expires. On later loads, `imageUrls` has a fresh URL for each of the
draft's photos, used or not, so the editor can offer them again.

**A document never holds a URL.** An image position takes only `{ source: "media", mediaId }` or
`{ source: "theme", assetId }`, and a `mediaId` must be one of this draft's photos or its theme's images.
Anything else, such as a URL, a `data:` URI or another draft's photo, fails the save with 400 `3120`.

`DELETE /{id}/images/{mediaId}` frees a place and removes the file. Save a document that no longer uses
the photo first, or it answers 409 `5214`. Deleting the draft deletes its photos.

## Publishing

Guests open a published invitation at `invite.storywall.gr/<slug>`. What they see is a copy taken when
the host published: the draft's document and its theme's design as they stood then. Later edits to the
draft, or an admin changing the theme, reach guests only when the host publishes again.

Only a draft on an event can be published, and only while:

- the event's plan includes the **Save my date** module (`save_my_date`). It is on no plan yet: an admin
  adds it to a plan or grants it to an event. It is offered to weddings, baptisms, birthdays, baby
  showers and gender reveals.
- the event's coverage runs (`coverageEndsAt` in the future).

The event pays for the page and says how long it stays up; nothing else of the event reaches the page.

### Publish: `POST /{id}/publish`

Signed in, a host of the draft's event. 30 per hour per user.

```json
{ "revision": 4, "slug": "maria-and-nikos-2026" }
```

- `revision` is the draft revision the host is looking at, as for autosave. A newer one answers 409
  `5208`, so what goes live is what the host saw. Publish after the last autosave has answered.
- `slug` is needed the first time only. It is trimmed and lowercased, then must be 3 to 60 lowercase
  Latin letters, digits and single hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`), and not a reserved word such as
  `admin`, `api`, `storywall` or `invite`. Once published, the link can't change: leave `slug` out, send
  it blank, or send the same one, to publish again.

Publishing runs every check the theme editor runs, the theme's images included, so a draft naming a
theme image an admin has since deleted fails with 400 `3120` until the host replaces it.

It answers 200 with a `Publication`:

```json
{
  "draftId": "…",
  "slug": "maria-and-nikos-2026",
  "draftRevision": 4,
  "themeRevision": 2,
  "publishedAt": "2026-11-07T10:00:00Z",
  "updatedAt": "2026-11-07T10:00:00Z",
  "onlineUntil": "2027-05-07T21:00:00Z",
  "online": true
}
```

- `draftRevision` older than the draft's own `revision` means there are changes to publish.
- `publishedAt` is the first publish, `updatedAt` the latest.
- `onlineUntil` is the event's coverage end. Extending the event moves it.

### Status: `GET /{id}/publication`

Signed in, with read access to the draft. Answers the same `Publication`, or 404 if the draft was never
published.

### Check a link: `GET /api/invitation-slugs/availability?slug=…`

Signed in. 60 per minute per user, for the link field as the host types. Answers
`{ "slug": "our-day", "available": true, "reason": null }`, with `reason` one of `INVALID`, `RESERVED`
or `TAKEN` when it isn't. `slug` is the link as it would be stored. A link can still be taken between
the check and the publish, which then answers 409 `5218`.

### The guests' page: `GET /api/public/invitations/{slug}`

No account. 300 per minute per address. Answers 200:

```json
{
  "slug": "maria-and-nikos-2026",
  "eventType": "WEDDING",
  "themeName": "Olive grove",
  "themeRevision": 2,
  "design": { },
  "document": { },
  "imageUrls": { "m-baby": "https://…", "img-0f3a…": "https://…" },
  "updatedAt": "2026-11-07T10:00:00Z"
}
```

Render `document` with `design` exactly as the editor's preview does. `imageUrls` has a URL for each
image the copy uses, theme images and the host's photos; they expire, so load the page afresh rather
than caching it. Nothing names the draft, the event or an account.

- **404** for a link that isn't an invitation's, or whose event is suspended or deleted. Deleting the
  draft takes the page down and frees the link.
- **410 `5221`** once the event's coverage has ended, or its plan no longer includes the page. The body
  has nothing of the invitation. Show the expired page, with its illustration and a short message, not
  the invitation. The copy is kept: extending the event brings the same link back at once.

If storywall's server fetches this page rather than the browser, every guest shares the server's
address and so one budget of 300 per minute. Send the guest's address with `X-Storywall-Client-Ip` and
`X-Storywall-Client-Ip-Secret`, as `springAuth.ts` does, so each guest counts alone.

### RSVP from the guests' page: `POST /api/public/invitations/{slug}/rsvp`

KAN-50. A guest answers the invitation's RSVP form with no account. Storywall owns the RSVP: the reply
is an ordinary RSVP on the invitation's event, so the host sees it in Manage → RSVP, the reports and the
PDF export with every other reply. There is no separate invitation RSVP list.

```json
{
  "guestName": "Maria Papadopoulou",
  "attendanceStatus": "ATTENDING",
  "phone": "694 123 4567",
  "email": "maria@example.com",
  "adultCount": 2,
  "childCount": 1,
  "notes": "Vegetarian menu",
  "website": ""
}
```

| Field | Rule |
| --- | --- |
| `guestName` | Required, up to 150 characters. Control characters are taken out. |
| `attendanceStatus` | Required: `ATTENDING` or `DECLINED`. |
| `phone` | Required, up to 50 characters: digits, spaces, `+ ( ) . / -`, with 7 to 15 digits. |
| `email` | Optional, up to 255 characters. Blank means none. |
| `adultCount` | Attending: required, 1 to 5. Declined: may be left out, and is saved as 0 whatever is sent (but still at most 5). |
| `childCount` | 0 to 4; left out means 0. Saved as 0 when declined. |
| `notes` | Optional, up to 500 characters. Line breaks and tabs kept. |
| `website` | The honeypot. Render it hidden from people (off-screen, `tabindex="-1"`, `autocomplete="off"`) and send it empty. |

The form's `RsvpReply` maps as `guestName` → `guestName`, `attending` → `attendanceStatus`
(`true` → `ATTENDING`), `adultsCount` → `adultCount`, `childrenCount` → `childCount`, `note` → `notes`.

Answers:

- **204**, no body, for every saved reply. Also for a filled honeypot (nothing saved), and for a reply
  whose phone an RSVP on the event already has: it is saved and marked as a possible duplicate for the
  host. The answer never says which, so it doesn't tell anyone whether a number has replied. The form
  never changes an existing reply: sending again adds another.
- **400** a field breaks a rule above.
- **404** no such invitation, or its event is suspended or deleted (the same as the page).
- **410 `5221`** the page is offline (the same as the page): show the expired page.
- **409 `5012`** the event's plan has no RSVP, or the host switched it off.
- **409 `5222`** the event's RSVP deadline has passed.
- **409 `5223`** the event holds as many replies from its invitation as it may: twice its guest limit
  (admin-granted guest slots included), or 2,000 when its plan has no guest limit. Replies the host
  removed don't count, so a place can open again. Show the `detail` ("This event can't take more
  replies through its invitation. Please contact the hosts." / "Αυτή η εκδήλωση δεν μπορεί να δεχτεί
  άλλες απαντήσεις μέσω της πρόσκλησης. Παρακαλούμε επικοινωνήστε με τους διοργανωτές.").
- **429 `3010`** more than 30 replies an hour from one address, or 300 an hour to one invitation. See
  `Retry-After`.

As with the page, if storywall's server sends the reply rather than the browser, forward the guest's
address with `X-Storywall-Client-Ip` and `X-Storywall-Client-Ip-Secret`, or every guest shares one
budget of 30 an hour.

#### On the host's side

The guest behind such a reply is a **reply-only guest**: a member with a name and an RSVP and nothing
else. They can't sign in, are left out of `GET /api/events/{eventId}/members` (and the notice item
picker), and take no seat in the plan's guest limit; replies are never refused because a plan is full.
Their reply counts in `rsvpSummary`, the reports and the export like anyone's.

Because they aren't in the member list, the RSVP list carries what Manage → RSVP needs to show them.
`RsvpResponseDto` (`GET /api/events/{eventId}/rsvps`, `GET /api/rsvps/{id}`, and the other RSVP
answers) gains four fields:

| Field | Meaning |
| --- | --- |
| `guestName` | The member's name, for every RSVP. The only place a reply-only guest's name appears. |
| `replyOnly` | `true` for a reply from a published invitation. |
| `email` | Typed on the invitation form; `null` for replies made in the app. |
| `possibleDuplicate` | The reply's phone matched an RSVP already on the event, comparing the last ten digits (so `+30 694 123 4567` matches `6941234567`). |

So the roster is the member list's guests plus every RSVP with `replyOnly: true`.

- **Keep** a reply marked as a possible duplicate: `DELETE /api/rsvps/{id}/duplicate-mark`, host only.
  Answers 200 with the RSVP, `possibleDuplicate: false`; the reply is otherwise untouched. 403 for anyone
  but a host, 404 for no such RSVP, 409 `5012` when RSVP is off.
- **Remove** it: `DELETE /api/rsvps/{id}`, as for any RSVP. For a reply-only guest it removes the guest
  too, so they don't linger as a guest with no response.
- A host edits a reply-only guest's reply with `PATCH /api/rsvps/{id}` like any other.

### Photos and theme images a page uses

A host can't delete a photo the published copy uses: `DELETE /{id}/images/{mediaId}` answers 409 `5214`
until they publish a version without it. An admin can't delete a theme image a published copy uses
either (409 `5202`).

## Errors

| Status | `errorCode` | When |
| --- | --- | --- |
| 400 | `3120` | The document is not valid; `details.problems` lists why |
| 400 | | A missing or malformed field |
| 401 | | Claim, attach or list without signing in, or any call with an expired or invalid `Authorization: Bearer` token: refresh and retry |
| 403 | `4024`, `4025` | Attach or start naming an event the caller isn't a member (`4024`) or host (`4025`) of |
| 403 | `4015` | The event is suspended |
| 404 | `2001` | Not found, no access, wrong token, expired, or the event is soft-deleted (writes); a draft never published (status); no such page |
| 409 | `5208` | Stale `revision`: reload |
| 409 | `5209` | Another account already claimed it |
| 409 | `5210` | The theme is for another event type |
| 409 | `5211` | It already belongs to another event |
| 409 | `5212` | The event already has a draft |
| 409 | `5213` | The draft already has 100 images |
| 409 | `5214` | The saved document still uses this image |
| 409 | `5215` | The account's drafts already hold 300 images |
| 409 | `5012` | Publish: the event's plan doesn't include Save my date, or the event isn't active |
| 409 | `5216` | Publish: the draft is on no event |
| 409 | `5217` | Publish: the event's coverage has ended |
| 409 | `5218` | Publish: another invitation has this link |
| 400 | `5219` | Publish: the link isn't allowed, or the first publish has none |
| 409 | `5220` | Publish: the invitation is already at another link, which can't change |
| 410 | `5221` | The guests' page is offline: the event's coverage has ended, or its plan no longer includes the page |
| 409 | `5222` | RSVP from the guests' page: the event's RSVP deadline has passed |
| 409 | `5223` | RSVP from the guests' page: the event holds its cap of replies (2× its guest limit, or 2,000 without one) |
| 400 | `3012` | An upload that isn't JPEG, PNG or WebP, or can't be read |
| 413 | `3005` | The save is over 2 MB |
| 413 | `3013` | An image over 5 MB or over 4096 px a side |
| 502 | `5004` | The image could not be stored: try again |
| 429 | `3010` | Rate limited; see `Retry-After` |

## Not here yet

- Buying Save my date on its own, without an event plan.
- Moving a published invitation to another event.
