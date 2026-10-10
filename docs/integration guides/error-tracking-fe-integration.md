# FE integration: error tracking split from beta feedback, and 4xx recording

Backend change dated 2026-10-10, branch `feat/record-4xx-error-events`. Types are in
`docs/frontend-api-types.ts` under "Beta feedback". Builds on `beta-feedback-fe-integration.md`.

## 1. Two switches instead of one

`GET /api/config` has a new `errorTracking` object, and `betaFeedback.enabled` now covers bug reports only:

```ts
interface AppErrorTrackingConfigDto {
  enabled: boolean;
}
```

| Switch | Env var | Default | Gates |
|---|---|---|---|
| `betaFeedback.enabled` | `BETA_FEEDBACK_ENABLED` | off | the "Report a problem" button, `POST /api/bug-reports` (409 / 5100) |
| `errorTracking.enabled` | `ERROR_TRACKING_ENABLED` | **on** | the crash reporter, `POST /api/error-events/client` (409 / 5170), and all backend recording |

Install the crash reporter on `errorTracking.enabled`, not `betaFeedback.enabled`. Nothing else
about `POST /api/error-events/client` changed. It still stops for the page load on any 409.

## 2. Backend 4xx responses are recorded

Before this change only 500s, background failures and frontend crashes were recorded. Now every error
response the backend sends becomes a `BACKEND` row, except:

- an unknown URL (no route: the 404 `The requested endpoint does not exist`)
- a missing or expired access token (the 401 `AUTHENTICATION_REQUIRED` entry point)
- a refresh with an expired or revoked refresh token (401 / 1002)
- `POST /api/error-events/client` itself

A 4xx row is grouped by status + `errorKey` + method + route template, so every
`400 VALIDATION_FAILED` on `POST /api/events/{eventId}/posts` counts against one row. Its
`errorType` is the `errorKey` (`HTTP_<status>` when the response has none), its `message` is the
latest `detail` with any field errors appended, and `stackTrace` is null. 4xx rows have their own daily
cap of new rows, so they can't push 500s out.

4xx responses still carry no `errorRef`. Only 500s do.

## 3. Admin list changes

- `ErrorEventResponseDto.httpStatus: number | null`: the response status of a `BACKEND` row (4xx
  or 5xx), null for `BACKGROUND` and `CLIENT`. Rows recorded before this change are all 500.
- `GET /api/error-events?statusClass=CLIENT_ERROR|SERVER_ERROR` keeps rows whose `httpStatus` is
  4xx or 5xx. It combines with `source` and `ref`. Rows with no status match neither. An unknown
  value is 400 / 3001.
