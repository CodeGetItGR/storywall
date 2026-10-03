# FE integration: Community Guidelines and acceptance

Shipped 2026-09-30. The Community Guidelines (Greek and English) are served by the backend, every new
account accepts them at registration, and every account must accept the version in force before it can
write anything. **Breaking for clients:** `POST /api/auth/register` fails without the new field, and
every existing account gets a 403 on its first write until the gate is shown. Migration: **V128**.

Types are in `frontend-api-types.ts` (`CommunityGuidelinesDto`, `GuidelinesAcceptanceRequestDto`, and the
new fields on `RegisterRequestDto` and `UserResponseDto`).

## 1. Reading the text

```http
GET /api/legal/community-guidelines?locale=el      -> the version in force
GET /api/legal/community-guidelines/2026-09-30     -> one specific version
```

Public, no auth. Response: `{ "version": "2026-09-30", "locale": "el", "markdown": "..." }`. `locale` is
`el` or `en`; anything else, or nothing, is served as `en` and `locale` says so. A version that does not
exist (or is not a `YYYY-MM-DD` date) is 404. The `version` of the first call is what you send back to
accept. Render the markdown with the existing `MarkdownDocument` component.

## 2. Registration

`POST /api/auth/register` takes a new required string, `acceptedGuidelinesVersion`: the `version` the
user saw when they ticked the box. Two failures, which look different:

- **Missing or blank** (or longer than 10 characters) is an ordinary validation 400. Nothing in the
  checkbox flow should produce it.
- **Present but not the version in force** is 400 `3037 GUIDELINES_VERSION_MISMATCH`. The page was open
  across a version bump. Fetch the guidelines again and ask the user to tick again.

Either way no account is created, so it is safe to retry. The acceptance is stored in the same
transaction as the account.

## 3. `/api/me` and the gate

`GET /api/me` returns two new fields: `guidelinesAcceptanceRequired` (boolean, true until the account
has accepted the version in force) and `currentGuidelinesVersion`. Both are `null` on the admin user
endpoints (`/api/users/...`), which do not compute them.

When `guidelinesAcceptanceRequired` is true, show a blocking screen with the text and one button.

```http
POST /api/me/guidelines-acceptance
{ "version": "2026-09-30" }          -> 204, no body
```

Allowed for USER, GUEST and ADMIN. Idempotent. Send back the `currentGuidelinesVersion` you showed; any
other version is 400 3037. `version` is required, max 10 characters. After a 204, refetch `me`.

Who meets the gate: every account that existed before this shipped, accounts created by OAuth sign-up
(the register checkbox never appeared), and accounts an admin provisioned. They are not treated
differently; they accept on first write, or on first load if you read `me` first.

## 4. Every write can return 403 4013

While the gate is up the backend refuses **every authenticated POST, PUT, PATCH and DELETE** with 403
`4013 GUIDELINES_ACCEPTANCE_REQUIRED`. Reads always work. Handle 4013 globally (the query client's
error path): invalidate `me`, which flips `guidelinesAcceptanceRequired` and reopens the gate, and let
the user retry after accepting. A version bump applies on the next write, not the next token refresh, so
a tab that was fine a minute ago can hit 4013; do not rely on the last `me` you fetched.

Security-hygiene writes are gated too, for example `DELETE /api/sessions/{id}` and
`POST /api/me/change-password`. That is a deliberate trade-off: acceptance is one click, and a carve-out
list would need maintaining for every new endpoint.

Demo mode: requests sent with `X-Demo-Act-As-Member` are checked against the **admin's** acceptance, not
the persona's.

## 5. Not gated

These paths never return 4013:

- `/api/auth/**` (sign-in, refresh, logout, OAuth, register, verification, password reset, and the
  invite join that happens inside sign-in),
- `POST /api/me/guidelines-acceptance`,
- `/api/bug-reports/**` and `/api/error-events/**`: crash reports must never fail,
- `/api/newsletter/**`: the links are token-authorised, and an unsubscribe must never depend on the
  guidelines,
- `/api/events/*/stream-token`: it only mints a credential for a GET, and the feed client treats a 403
  there as permanent.

Anonymous requests (the QR upload) are not checked at all, because there is no account to check.

## 6. The QR upload notice

No API. The anonymous QR upload form shows a notice with a link to the public guidelines page instead of
asking for acceptance. Nothing is recorded for the uploader.

## Deploying

The text lives on the classpath under `legal/{version}/{locale}/community-guidelines.md`. The reports
address in §28 comes from `LEGAL_REPORTS_EMAIL` (see `deployment-checklist.md`); until it is set the
page shows the trader email, or nothing.

## Changing the text

Add a new dated folder with `scripts/build-served-guidelines.py <date>` and bump
`app.legal.community-guidelines.current-version` (env `LEGAL_GUIDELINES_VERSION`); never edit a version
anyone has accepted, since the script refuses to overwrite one. The backend tests hardcode
`"2026-09-30"`, so a bump means updating them too. Every account then accepts again on its next write;
the old rows stay as the record of what each user agreed to.
