# FE integration: Terms of Use acceptance and the 18+ confirmation

Shipped 2026-10-04. Every new account (email, Google or Apple) records the Terms of Use version it
accepted and confirms being 18 or over. An existing account whose acceptance is too old, or which never
confirmed its age, cannot write until it does. **Breaking for clients:** `POST /api/auth/register` fails
without the two new fields, a first Google/Apple sign-in fails without them (3044), and every existing
account gets a 403 on its first write until the gate is shown. **Deploy the backend and the frontend
together.** Migration: **V140**.

Types are in `frontend-api-types.ts` (`TermsAcceptanceRequestDto`, `SignupAcceptanceRequiredDetails`, and
the new fields on `RegisterRequestDto`, `OAuthLoginRequestDto` and `UserResponseDto`). This mirrors the
Community Guidelines acceptance ([community-guidelines-fe-integration.md](community-guidelines-fe-integration.md)).

## 1. Where the version comes from

```http
GET /api/legal/documents/terms?locale=el      -> the version in force
GET /api/legal/documents/terms/2026-10-04     -> one specific version
```

Public, no auth. Response: `{ "document": "terms", "version": "2026-10-04", "locale": "el", "markdown": "..." }`.
The `version` of the first call is what you send back to accept. It is the policies version, shared by
the Terms, Privacy Policy and Cookie Policy. A signed-in user can read it from `GET /api/me`
(`currentTermsVersion`) instead.

## 2. Registration

`POST /api/auth/register` takes two new required fields:

```json
{
  "email": "a@example.com", "password": "...", "firstName": "A", "lastName": "B",
  "acceptedGuidelinesVersion": "2026-09-30",
  "acceptedTermsVersion": "2026-10-04",
  "adultConfirmed": true
}
```

- `acceptedTermsVersion`: the `version` the user saw when they ticked the box. Max 10 characters.
- `adultConfirmed`: must be `true`. The checkbox text is the 18+ confirmation (Terms §3).

Failures:

- **Missing field, `adultConfirmed: false`, or an over-long version:** 400 `3001 VALIDATION_FAILED`, with
  the field named under `errors`. Nothing in the checkbox flow should produce it; disable the submit
  button until both boxes are ticked.
- **A version that is not the one in force:** 400 `3043 TERMS_VERSION_MISMATCH`. The page was open
  across a version bump. Reload the terms and ask the user to tick again.

Either way no account is created, so it is safe to retry. The acceptance is stored in the same
transaction as the account.

## 3. Google and Apple sign-in

`POST /api/auth/oauth/{provider}` takes three new optional fields: `acceptedTermsVersion`,
`acceptedGuidelinesVersion` and `adultConfirmed`. They are read **only when the sign-in would create a
new account**. A linked identity, or an account auto-linked by verified email, ignores them and never
gets 3044.

- **Register page:** show both checkboxes before the provider button and send the three fields with
  every call.
- **Login page:** send none. If the identity matches no account, the response is 400
  `3044 SIGNUP_ACCEPTANCE_REQUIRED` with `details: { currentTermsVersion, currentGuidelinesVersion }`
  and nothing is created. Show the Terms and Guidelines checkboxes (and the 18+ confirmation) in a modal,
  then resend **the same ID token** with the three fields.
- Any one of the three missing, or `adultConfirmed` not `true`, is also 3044.
- **Stale versions** give `3043` (Terms) or `3037` (Guidelines). Refetch both texts and ask again.
- **Apple tokens last about 10 minutes.** If the resend after the modal fails with an invalid-token
  error, the right response is "start Apple sign-in again", not a retry.
- A value longer than 10 characters is a 400 validation error on every sign-in, new account or not.

## 4. `/api/me` and the gate

`GET /api/me` returns two new fields: `termsAcceptanceRequired` (boolean) and `currentTermsVersion`.
Both are `null` on the admin user endpoints (`/api/users/...`), which do not compute them, like the
Guidelines pair. `termsAcceptanceRequired` is true when the account has not accepted the required Terms
version or a later one, **or** has never confirmed being 18+.

When it is true, show a blocking screen with the text, the 18+ checkbox and one button.

```http
POST /api/me/terms-acceptance
{ "version": "2026-10-04", "adultConfirmed": true }      -> 204, no body
```

Idempotent. Send back the `currentTermsVersion` you showed; a stale version is 400 `3043`.
`adultConfirmed` must be `true`. After a 204, refetch `me`.

**Both gates at once.** An account can owe the Guidelines and the Terms. Read both flags from `/me` and
show one screen that posts both acceptances (`/api/me/guidelines-acceptance`, then
`/api/me/terms-acceptance`). The backend checks the Guidelines first, so a write answers 4013 before
4020; do not rely on the order to drive the UI.

## 5. Every write can return 403 4020

While the gate is up the backend refuses **every authenticated POST, PUT, PATCH and DELETE** with 403
`4020 TERMS_ACCEPTANCE_REQUIRED`. Reads always work. Handle 4020 globally, next to 4013: invalidate `me`,
reopen the gate, and let the user retry after accepting.

Not gated: the same paths as the Guidelines gate (`/api/auth/**`, `/api/bug-reports/**`,
`/api/error-events/**`, `/api/newsletter/**`, `/api/content-notices`, `/api/events/*/stream-token`,
and anonymous requests such as the QR upload), plus `POST /api/me/guidelines-acceptance` and `POST /api/me/terms-acceptance`.

## 6. Error codes

| Code | Name | HTTP | When |
|---|---|---|---|
| 3043 | `TERMS_VERSION_MISMATCH` | 400 | Register, OAuth sign-up or `POST /api/me/terms-acceptance` with a version that is not the one in force. Reload the terms and ask again. |
| 3044 | `SIGNUP_ACCEPTANCE_REQUIRED` | 400 | First Google/Apple sign-in for a new account without all three acceptance fields. `details` carries both current versions. Resend the same ID token. |
| 4020 | `TERMS_ACCEPTANCE_REQUIRED` | 403 | Any authenticated write while `termsAcceptanceRequired` is true. |

## 7. Re-acceptance and config

Whether an account must accept again follows `app.legal.terms.required-version` (env
`LEGAL_TERMS_REQUIRED_VERSION`, default `2026-10-04`), **not** the policies version. A policies bump that
leaves the substance of the Terms alone therefore does not set `termsAcceptanceRequired`; raise the
required version only when the Terms change in a way users must agree to again. The app refuses to start
if the value is malformed or later than the policies version. Acceptances are append-only
(`terms_acceptances`); old rows stay as the record of what each user agreed to.
