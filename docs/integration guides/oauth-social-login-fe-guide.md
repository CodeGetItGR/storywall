# Google & Apple Sign-In — Frontend Integration Guide

## What the backend now supports

`POST /api/auth/oauth/{provider}` — `{provider}` is exactly `GOOGLE` or `APPLE` (uppercase,
case-sensitive; anything else is rejected with `400`).

Request body:

```json
{ "idToken": "<the raw ID token from Google's/Apple's own SDK>" }
```

Response body is **identical** to `/api/auth/login` and `/api/auth/register` — same
`AuthResponseDto` shape (`accessToken`, `refreshToken`, `userId`, `email`, `displayName`,
`profilePictureUrl`, `authProvider`, `status`, `role`, etc.). Store and use the tokens exactly
the way you already do after a password login — no branching needed based on how the user signed in.

## How to get the ID token

This backend does **not** issue its own OAuth client secret exchange or redirect flow — it only
verifies an ID token you already obtained client-side from the provider's own SDK. That token is
short-lived and single-use for this purpose; get a fresh one from the SDK on every sign-in attempt.

### Google

Use [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
(the current recommended library — not the deprecated `gapi.auth2`).

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

(No `integrity` hash here — Google serves this file unversioned and rotates it without notice,
so a pinned SRI hash would break the login button the next time they update it. This is Google's
own documented loading method.)

```js
google.accounts.id.initialize({
  client_id: 'YOUR_GOOGLE_CLIENT_ID', // same value the backend has as OAUTH_GOOGLE_CLIENT_ID
  callback: async (response) => {
    const idToken = response.credential;
    const res = await fetch('/api/auth/oauth/GOOGLE', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const auth = await res.json();
    // store auth.accessToken / auth.refreshToken exactly as you do after /login
  },
});
google.accounts.id.renderButton(document.getElementById('google-signin'), { theme: 'outline', size: 'large' });
```

Get `YOUR_GOOGLE_CLIENT_ID` from the Google Cloud Console (OAuth client of type "Web
application"). It must match `OAUTH_GOOGLE_CLIENT_ID` configured on the backend, or every token
will be rejected with a 401 (wrong audience).

### Apple

Use [Sign in with Apple JS](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js).

```html
<script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
```

(Same note as the Google script above — Apple serves this unversioned too, so no SRI hash.)

```js
AppleID.auth.init({
  clientId: 'YOUR_APPLE_SERVICES_ID', // same value the backend has as OAUTH_APPLE_CLIENT_ID
  scope: 'name email',
  redirectURI: 'https://yourapp.example.com/auth/apple/callback',
  usePopup: true,
});

document.getElementById('apple-signin').addEventListener('click', async () => {
  const result = await AppleID.auth.signIn();
  const idToken = result.authorization.id_token;
  const res = await fetch('/api/auth/oauth/APPLE', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const auth = await res.json();
  // store auth.accessToken / auth.refreshToken exactly as you do after /login
});
```

**Apple-specific gotcha:** Apple only ever sends the user's name and email in the very first
`result.authorization` response, the first time a given user ever authorizes your app — it is
silently omitted on every subsequent sign-in from the same person, even in a different browser or
after clearing cookies. The backend already accounts for this (it recognizes returning Apple
users by their token's internal id, not by email), but if you want to show the user's name
*during* their very first Apple sign-in before the page reloads, read it from
`result.user.name` / `result.user.email` on that first response only — don't rely on it being
present on later sign-ins, and don't treat its absence as an error.

## Error handling

| HTTP status | `errorCode` | Meaning | Suggested UI |
|---|---|---|---|
| 401 | 1004 (`OAUTH_TOKEN_INVALID`) | Token failed verification (expired, wrong app, tampered) | "Something went wrong signing you in — please try again." Retry with a fresh token; don't retry with the same one. |
| 400 | 3027 (`OAUTH_EMAIL_REQUIRED`) | Only reachable in an edge case (a returning Apple user whose identity was somehow lost server-side) | "Please try signing in again." Should not occur in normal use. |
| 403 | 1003 (`ACCOUNT_NOT_ACTIVE`) | The matched account is suspended | Same handling as a suspended password-login account. |
| 400 | — (path validation) | `{provider}` in the URL wasn't exactly `GOOGLE` or `APPLE` | Frontend bug — check the URL is built correctly. |

## What happens on the backend (for context, not something you need to implement)

- **First-ever sign-in with a given Google/Apple identity, no existing account with that
  email:** a brand-new account is created, already treated as email-verified (the provider
  already proved it), and — if the provider shared a profile picture — the backend downloads and
  stores it the same way a manual profile-picture upload would, on your existing avatar field.
- **First-ever sign-in with a given identity, but an account with that email already exists**
  (e.g. someone who originally registered with a password): the two are linked automatically.
  They can keep logging in either way. Their password (if they had one) is untouched.
- **Every later sign-in with the same identity:** logs into the same account, same as before.

## Configuration required before this works end-to-end

Two environment variables must be set in every environment (they default to empty, which makes
the feature fail closed rather than silently accept tokens for the wrong app):

- `OAUTH_GOOGLE_CLIENT_ID` — from Google Cloud Console (OAuth client, type "Web application")
- `OAUTH_APPLE_CLIENT_ID` — the Apple Services ID configured for "Sign in with Apple"

Neither requires a client secret or team/key id — this is ID-token verification only, not the
server-to-server Apple token exchange.
