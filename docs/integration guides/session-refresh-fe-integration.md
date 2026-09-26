# Session refresh — Frontend Integration Guide

How `POST /api/auth/refresh` is budgeted, what each failure status means, and what the frontend
must (and must not) do about each. Written after users were being logged out at random mid-session;
the chain that caused it is spelled out so nobody re-introduces a link of it.

## The contract

```
POST /api/auth/refresh
{ "refreshToken": "<raw token from login/register/oauth>" }
```

| Status | Meaning | What the frontend should do |
|---|---|---|
| `200` | New access token issued. The refresh token is **not** rotated — the same one stays valid until it expires (30 days) or is revoked. | Store the access token. Keep the refresh token you already had. |
| `401` (`INVALID_REFRESH_TOKEN`) | The token is unknown, expired, or revoked. This is the **only** status that means "the session is gone". | Clear the session and send the user to login. |
| `429` (`RATE_LIMITED`) | This refresh token has been presented more than 30 times in the last minute. `Retry-After` is set. | Keep the session. Retry after `Retry-After`. **Do not** treat as a logout. |
| anything else / no response | Spring couldn't answer. | Keep the session. Retry later. **Do not** treat as a logout. |

The rule in one line: **only a `401` from this endpoint is a logout signal.** Every other failure
leaves the refresh token valid and must leave the user's cookies alone.

## How the budget is counted, and why it matters

`auth.refresh` is counted per **refresh token** (SHA-256 of the presented token), not per caller IP
like the other anonymous auth endpoints. The distinction exists because of how the web frontend
calls this endpoint:

- Its Next middleware calls Spring server-side before rendering any protected route — and Next runs
  middleware for every `<Link>` prefetch as well as every navigation.
- Its `/api/auth/session` route (the browser's only way to refresh, since the refresh token lives in
  an httpOnly cookie) also calls Spring server-side.

Neither call carries the user's IP; both reach Spring from the frontend server's egress address. An
IP-keyed budget on this endpoint is therefore a budget for the *entire user base*, and 30/min was
exhausted by a handful of people browsing at once. Per-token, 30/min is generous for any legitimate
client and still stops a stuck retry loop.

### The same caveat applies to login and register

`auth.login` (10/min, shared with `oauth/{provider}`) and `auth.register` (5/hour) are still
IP-keyed, and the frontend calls both server-side too. Under real concurrent sign-in traffic these
will 429 across users. Not changed here because they're deliberately tight for credential-stuffing
reasons; if it becomes a problem the fix is for the frontend to forward the browser's IP in
`X-Forwarded-For` and for Spring to list the frontend's egress range in
`app.rate-limit.trusted-proxies` — not to raise the limits.

## What the frontend must do (checklist)

- [ ] Only refresh when the access token has actually expired. The access-token cookie's `maxAge`
      is the JWT's lifetime; if the browser still sends it, reuse it. Refreshing on every request
      multiplies traffic by the number of prefetches per page for no security gain — a revoked
      session lingers at most one JWT lifetime either way.
- [ ] On `401`: clear the session, delete the auth cookies, redirect to login.
- [ ] On `429`, `5xx`, or a network error: keep the cookies and the in-memory session. Middleware
      should render the page without its server-side prefetch and let the client bootstrap; the
      client's own reauthenticate path should return "no token right now" rather than clearing the
      session.
- [ ] Never delete the refresh cookie from a `catch` block that doesn't check the status.

## What is *not* a bug

- **Signing in on a second device logs the first one out** on its next refresh. Only one session
  is permitted per user; a new login, register, or OAuth sign-in revokes every other session
  (`AuthService#revokeExistingSessions`). This is by design.
- **Closing the browser does not end the session.** The refresh cookie's `maxAge` matches the
  refresh token's 30-day lifetime. Logging out deletes the cookie and revokes the token.
