# FE integration guide: backend localization

Covers the localization pass that lets the backend generate errors, notifications, transactional
emails, and RSVP PDF reports in the user's language. Two locales ship today: `en` (default) and
`el` (Greek). Nothing else changes shape — this is additive, and every endpoint keeps working
exactly as before if you send nothing.

---

## 1. How to ask for a language

Send the standard HTTP header on every request:

```
Accept-Language: el
```

- Omit it (or send anything else, e.g. `fr`) and you get English — there is no error for an
  unsupported locale, it just silently resolves to the default bundle.
- Most HTTP clients set this automatically from the browser's language. If yours doesn't, set it
  explicitly from whatever language switcher the product ends up with.
- This governs everything rendered **synchronously**, in the same request: error messages,
  validation messages, the notification feed, and RSVP PDF exports. It has no effect on anything
  generated later by a background job — see §4.

There is nothing to opt into and no version bump. A client that never sends the header keeps
getting English, unchanged from before this work shipped.

---

## 2. Errors (`ProblemDetail`)

`GET/POST/PATCH/...` error responses are still RFC 7807 `ProblemDetail` bodies, unchanged in shape:

```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Μη έγκυρο email ή κωδικός πρόσβασης",
  "instance": "/api/auth/login",
  "errorCode": 1002
}
```

Only `detail` changes with `Accept-Language`. `errorCode` (the numeric code your error-handling
already switches on) and `status` are unaffected — **keep branching on `errorCode`, never on the
text of `detail`.** That was already the rule; this just makes it matter more, since `detail` can
now legitimately be Greek.

Bean Validation errors (`400` with an `errors` map keyed by field) localize the same way — each
field's message follows `Accept-Language` too:

```json
{
  "title": "Validation Failed",
  "status": 400,
  "errors": { "email": "must be a well-formed email address" }
}
```

**Coverage so far — not every error is migrated yet.** Three exception types render a localized
`detail` today: invalid login credentials, "email already exists", and "resource not found"
(`404`s). Every other error still returns its original English message regardless of
`Accept-Language`, and will keep doing so until it's migrated. This is safe to build against now:
an unmigrated error just doesn't change — nothing breaks, it simply isn't translated yet.

---

## 3. Notifications (in-app feed)

`GET /api/notifications`, `GET /api/notifications/{id}`, and `PATCH /api/notifications/{id}/read`
all render `title`/`body` in `Accept-Language` at read time — same request, same rule as errors.
The DTO shape is unchanged:

```json
{ "id": "...", "title": "Το Sarah's Birthday πλησιάζει", "body": "...", "readAt": null }
```

Nothing to change on your side beyond sending the header. A couple of things worth knowing:

- **Re-fetch to change language.** A notification's rendered text is not cached against the row —
  switching the app's language and re-requesting the same notification re-renders it in the new
  language immediately. There's no stale-locale state to worry about.
- **Old rows still work.** Notifications created before this shipped have no message key stored,
  so they keep rendering their original English `title`/`body` verbatim regardless of
  `Accept-Language`. This is permanent for those rows, not a startup transient — there's no
  backfill planned.

---

## 4. Notification emails and transactional emails — different rule

This is the one place `Accept-Language` **does not apply**, and it's worth understanding why:

- **Notification emails** (quota warnings, event reminders, etc.) are sent by an hourly background
  sweep with no HTTP request in flight — there is no `Accept-Language` to read at send time. They
  render in the recipient's **stored locale preference** instead (see §5).
- **Transactional emails** — verification, password reset/changed, welcome — render in the
  *caller's* `Accept-Language` at the moment the triggering request is made (e.g. `Accept-Language`
  on the `POST /api/auth/register` call decides the verification email's language). This one *is*
  synchronous, so send the header on these requests same as any other.
- **Invitation emails** (event invite, co-host invite) are the one exception within transactional
  email: they render in the **inviting host's stored locale**, not the invitee's `Accept-Language`
  or anything read from the invitation itself. The invitee usually has no account yet, so there is
  no locale of theirs to read. If a host wants invitations to go out in Greek, they set their own
  account's locale (§5) — there's no per-invitation language override.

## 5. Stored locale preference (`User.locale`)

Both `GET /api/me` and `PATCH /api/me` now carry a `locale` field:

```json
{ "id": "...", "email": "...", "locale": "en" }
```

```http
PATCH /api/me
Content-Type: application/json

{ "locale": "el" }
```

- Defaults to `"en"` for every existing and new account — no migration action needed on your side.
- Accepts only `"en"` or `"el"`; anything else is a `400` validation error on the `locale` field.
- This is what a **language switcher in account settings** should write to. It is the only signal
  used for anything rendered outside a request (notification emails, today; anything else async
  that gets localized later will follow the same rule).
- Setting it does **not** change `Accept-Language` behavior — the two are independent. A user can
  browse the app in Greek (`Accept-Language: el` sent by the client) while their stored preference
  is still `en` if they haven't touched the setting; their notification emails would keep arriving
  in English until they do.

**What to do:** add a language control to account settings backed by this field, and default any
language-switcher UI's initial value to it (not just to `Accept-Language`) — they can and will
drift apart for a user who reads the app in a language they don't want their emails in.

---

## 6. RSVP PDF export

`GET /api/events/{eventId}/rsvps/export?reportType=...` renders every label, header, and the
generated-at date in `Accept-Language`, same as errors and notifications. No response shape change
— still a `application/pdf` byte stream with the same `Content-Disposition` filename pattern as
before (filenames themselves stay English; only the document content localizes).

```
GET /api/events/{eventId}/rsvps/export?reportType=STATISTICS
Accept-Language: el
```

produces a PDF with Greek headings, column labels, and status text. If the client that requests
the export is a browser navigating directly to the URL (rather than fetch/XHR), make sure whatever
triggers the download also sets `Accept-Language` — a plain link click uses the browser's own
header, which is usually already what you want, but confirm this if the export is wired through an
iframe or a proxied download.

---

## 7. Test checklist

- [ ] `Accept-Language: el` on a login failure renders `detail` in Greek; a header-less request
      still gets English.
- [ ] `errorCode`-based branching in the FE error handler is unaffected by locale (spot-check one
      migrated error and one not-yet-migrated error).
- [ ] Notification feed re-renders in the new language after switching `Accept-Language` and
      re-fetching, without needing to wait for anything server-side.
- [ ] `PATCH /api/me` with `locale: "el"` persists and comes back on the next `GET /api/me`;
      `locale: "fr"` (or any other value) is rejected with a `400` on the `locale` field.
- [ ] A password-reset request emails a Greek email body when the request carries
      `Accept-Language: el`; an event invitation instead follows the inviting **host's** stored
      `locale`, not the request's header or the invitee's anything.
- [ ] RSVP PDF export with `Accept-Language: el` renders Greek text throughout the document
      (not just the labels you'd naturally test — check headers, the legend, and the generated-at
      line, which have separately been known to get missed).
