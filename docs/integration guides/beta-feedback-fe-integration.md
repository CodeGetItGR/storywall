# FE integration: beta bug reports and crash capture

Backend change dated 2026-09-27, branch `feature/beta-feedback`. Types are in
`docs/frontend-api-types.ts` under "Beta feedback". Everything below was checked against the
controllers, DTOs and controller tests, not against the plan.

## 1. What it is

Two features behind one switch:

1. **Bug reports.** A tester types what went wrong and can attach one screenshot. The frontend
   attaches the context (page, viewport, locale, recent failed API calls).
2. **Crash capture.** The frontend reports its own uncaught errors. The backend already records
   its own 500s and background-job failures, and every 500 response now carries an `errorRef` that
   points at the recorded row.

Read `GET /api/config` → `betaFeedback`:

```ts
interface AppBetaFeedbackConfigDto {
  enabled: boolean;
  screenshotMaxBytes: number;    // 10MB by default
  screenshotMimeTypes: string[]; // ["image/jpeg", "image/png", "image/webp"]
}
```

When `enabled` is `false`, hide the report button and don't install the crash reporter. Both POST
routes answer **409 / 5100 `BETA_FEEDBACK_DISABLED`** while switched off, and nothing is recorded.
The admin reads keep working either way.

Both POST routes need a signed-in caller (user, guest or admin). A crash on the login page, or on
any page without a token, can't be reported: skip the send when there is no access token.

## 2. Submitting a report

`POST /api/bug-reports`, `multipart/form-data`, two parts:

| part | required | what |
|---|---|---|
| `report` | yes | the `BugReportRequestDto` JSON, appended as a **Blob** (a file part) |
| `screenshot` | no | the image file the user picked |

Rules the request must follow:

- **`report` must be a file part.** Append a `Blob`, never a string. A plain string form field is not
  a file part, and the server answers 400 `Required request part 'report' is missing`. The Blob's
  Content-Type doesn't matter (`application/json`, `text/plain` and none all work).
- **The request must carry `Content-Length`.** Browsers send it for a `FormData` body. Without it
  the server answers **411** (errorCode 3001). If your call goes through a server-side proxy or
  route handler, make sure it forwards the length and doesn't re-stream the body chunked.
- **Don't set the `Content-Type` header yourself.** The browser has to add the multipart boundary.
- **Size.** A body larger than `screenshotMaxBytes + 80KB` is refused with **413 / 3005
  `REQUEST_TOO_LARGE`** before it is parsed. A `report` part over 64KB gets the same 413 / 3005.

Response: **201** with `{ id, createdAt }` and nothing else. The reporter is never echoed back.

Rate limit: **5 per hour per user** (bucket `bug-reports.create` in `config.rateLimits`). Every
request that reaches the controller counts, including ones rejected with 400, 413 for the `report`
part or a screenshot error, and 5100. Only the 411 and the up-front 413 happen before the counter.
So validate on the client first, and don't auto-retry a failed submit.

```ts
async function submitBugReport(
  description: string,
  screenshot: File | null,
  eventId: string | null,
): Promise<BugReportCreatedDto> {
  const report: BugReportRequestDto = {
    description: description.trim(),
    pageUrl: location.origin + currentRouteTemplate(),  // see §4
    eventId,                                             // the route's event id, or null
    appVersion: process.env.NEXT_PUBLIC_BUILD_ID ?? null, // your build hash env var
    locale: navigator.language || null,                  // "el-GR"; see the rule below
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    viewportWidth: window.innerWidth || null,
    viewportHeight: window.innerHeight || null,
    displayMode: currentDisplayMode(),
    recentErrors: recentErrors.slice(),                  // see §5
  };

  const form = new FormData();
  form.append("report", new Blob([JSON.stringify(report)], { type: "application/json" }), "report.json");
  if (screenshot) form.append("screenshot", screenshot, screenshot.name);

  const res = await fetch(`${API_BASE}/api/bug-reports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken()}` }, // no Content-Type: the browser sets it
    body: form,
  });
  if (res.status !== 201) throw await toApiError(res); // your client's ProblemDetail parser
  return res.json();
}

const DISPLAY_MODES = ["window-controls-overlay", "fullscreen", "standalone", "minimal-ui"] as const;
function currentDisplayMode(): BugReportRequestDto["displayMode"] {
  return DISPLAY_MODES.find((m) => matchMedia(`(display-mode: ${m})`).matches) ?? "browser";
}
```

### Field rules

The only thing the user types is the description. Every other field is optional: send `null` or
leave it out when you don't have a value. Anything invalid is a 400, so a bad value costs the tester
their report (and one of their 5 per hour).

| field | rule | source |
|---|---|---|
| `description` | 10–4000 characters, and still ≥ 10 after trimming | a textarea; disable submit until `trim().length >= 10` |
| `pageUrl` | absolute `http`/`https` URL, ≤ 2048. The server lowercases the scheme and drops userinfo, `?query` and `#fragment` | `location.origin` + the route template (§4) |
| `eventId` | a UUID | the current route's event id |
| `appVersion` | ≤ 64 | the build hash env var |
| `locale` | BCP-47 tag, ≤ 16: `el`, `el-GR`, `en-US`. **`en_US` is rejected** | `navigator.language` or `i18n.language`; replace `_` with `-` if your i18n lib uses underscores |
| `timeZone` | an IANA id, ≤ 64. **An empty string is rejected**: send `null` or omit | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| `viewportWidth` / `viewportHeight` | 1–20000 | `innerWidth` / `innerHeight` |
| `displayMode` | exactly one of `browser`, `standalone`, `minimal-ui`, `fullscreen`, `window-controls-overlay` (lower case) | `currentDisplayMode()` above |
| `recentErrors` | ≤ 10 entries, no `null` entries | the ring buffer (§5) |

Unknown fields are rejected (400 / 3002), so don't add extras to the JSON.

## 3. Screenshot

- A file input with `accept={config.betaFeedback.screenshotMimeTypes.join(",")}`.
- Pre-check `file.size <= config.betaFeedback.screenshotMaxBytes` and say so before uploading.
- The server reads the type from the bytes and ignores what the file claims. Only JPEG, PNG and WebP
  pass. It re-encodes the image, which drops EXIF and GPS data.
- Show a short note next to the picker: the screenshot may show personal information, and only the
  team sees it.
- **Don't capture the page in the app** (html2canvas and similar). Media are presigned cross-origin
  URLs and taint the canvas, and video can't be captured. Testers attach an OS screenshot.

Screenshot errors. **Treat 3013 and 3005 the same way ("the image is too large")**:

| status / code | when |
|---|---|
| 413 / 3013 `MEDIA_FILE_TOO_LARGE` | the screenshot is over `screenshotMaxBytes`, but the whole body is within the cap + 80KB |
| 413 / 3005 `REQUEST_TOO_LARGE` | the whole body is over `screenshotMaxBytes + 80KB`, refused before parsing |
| 413 / 3016 `MEDIA_IMAGE_TOO_MANY_PIXELS` | too many pixels (see `config.media.maxImagePixels`) |
| 400 / 3012 `UNSUPPORTED_MEDIA_FORMAT` | not JPEG/PNG/WebP by its bytes (HEIC included) |
| 400 / 3014 `MEDIA_FILE_CORRUPT` | recognised but undecodable |
| 503 / 3017 `MEDIA_PROCESSING_BUSY` | the server is busy decoding; retryable, but it costs a report |

Reuse the profile-picture messages for these.

## 4. Tokens in paths

Some routes carry a live capability token **in the path**, not the query:

- `GET /api/qr/{token}`, `POST /api/qr/{token}/media`, `POST /api/qr/{token}/media/batch`
- `GET /api/event-invitations/{inviteToken}/preview`, `POST /api/event-invitations/{inviteToken}/accept`
- `GET /api/partners/{token}`
- and every frontend page whose URL contains one of those tokens (QR landing, invitation accept,
  partner portal).

The server strips query strings and fragments from `pageUrl` and `recentErrors[].path`, but it can't
know which path segment is a secret. Admins browse these rows, so **the frontend must not send a
resolved token URL**:

- **`pageUrl`:** send `location.origin` + the router's matched **route template**, with `:param`
  placeholders, e.g. `https://app.example/qr/:token`. Sending the template for every route is the
  safe default. It's mandatory for the token routes.
  - Don't use `{token}` or `[token]` placeholders: braces and brackets are not valid URL characters.
    A bug report with one gets a 400, and a crash report's `pageUrl` is stored as `null`. If your
    router's pattern uses `[param]` (Next.js) or `{param}`, rewrite it to `:param`.
- **`recentErrors[].path`:** send the API route template. `path` is not parsed as a URL, so
  `/api/qr/{token}` is fine there. The API client usually built the path from a template, so
  record that. Otherwise redact:

```ts
const TOKEN_ROUTES: Array<[RegExp, string]> = [
  [/^\/api\/qr\/[^/]+/, "/api/qr/{token}"],
  [/^\/api\/event-invitations\/[^/]+\/(preview|accept)$/, "/api/event-invitations/{inviteToken}/$1"],
  [/^\/api\/partners\/[^/]+/, "/api/partners/{token}"],
];
function redactApiPath(pathname: string): string {
  for (const [re, template] of TOKEN_ROUTES) if (re.test(pathname)) return pathname.replace(re, template);
  return pathname;
}
```

The backend follows the same rule for its own 500s: `error_events.last_request_path` holds the
matched route template, or `(unmapped)` when no handler matched.

## 5. `recentErrors`: capturing failed API calls

In the API client wrapper, keep a ring buffer of the last 10 non-2xx responses and attach it to the
report:

```ts
const recentErrors: RecentErrorDto[] = [];
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

async function noteFailure(method: string, url: URL, res: Response): Promise<void> {
  let body: Partial<ApiError> = {};
  try { body = await res.clone().json(); } catch { /* not a ProblemDetail */ }
  const m = method.toUpperCase();
  recentErrors.push({
    method: HTTP_METHODS.has(m) ? m : null,          // anything else is a 400
    path: redactApiPath(url.pathname),               // no query; token routes as templates (§4)
    status: res.status,
    errorCode: typeof body.errorCode === "number" ? body.errorCode : null, // 401/403 entrypoints send a string
    errorRef: /^[0-9a-f]{12}$/.test(body.errorRef ?? "") ? body.errorRef! : null,
    at: new Date().toISOString(),
  });
  if (recentErrors.length > 10) recentErrors.shift();
}
```

- `errorRef` only appears on 500s (errorCode 9001). It is exactly 12 lowercase hex characters. It is
  sent as `null`, not omitted, when the server couldn't compute it. Anything other than 12 lowercase
  hex characters or `null` is a 400, hence the check.
- `method` may be any case (the server upper-cases it), but only the seven methods above are allowed.
- `status` must be 100–599 and `errorCode` 0–99999. Network failures have no status: skip them, or
  keep them out of this buffer.
- Don't record the calls to `/api/bug-reports` and `/api/error-events/client` themselves.

## 6. Crash capture

`POST /api/error-events/client`, JSON body, **204** with an empty body.

```ts
interface ClientErrorRequestDto {
  name: string;          // required, not blank, <= 256
  message?: string | null; // <= 1024
  stack?: string | null;   // <= 8192
  pageUrl?: string | null; // <= 2048
  appVersion?: string | null; // <= 64
}
```

What the server does with it:

- **`name`** is normalized, not rejected. Characters outside `[A-Za-z0-9_$.]` become `_`
  (`"My Error: x"` → `My_Error__x`). A name with nothing else left, such as a non-Latin one, becomes
  `Error`. Still send `error.name` as is.
- **`appVersion`** is normalized too: characters outside `[A-Za-z0-9._+-]` become `_`, and blank
  becomes null.
- **`pageUrl`** gets the same cleanup as a bug report's. An invalid one is stored as `null`, not
  refused. The §4 rule still applies.
- The only 400s are a blank or missing `name`, a field over its cap, an unknown field, and invalid
  JSON. Truncate before sending.
- **Body cap 32KB**: over it is **413 / 3005**, and a missing `Content-Length` is **411**. A string
  body sent with `fetch` always has a length.
- **Rate limit: 20 per hour per user** (bucket `error-events.client`), counted before validation.
- Switched off: 409 / 5100, and nothing is recorded.

**Fire and forget.** Never show the user a failure of this call, never retry it, and never report
a failure to report. Use `fetch(..., { keepalive: true })` so a crash right before navigation still
gets out. `navigator.sendBeacon` can't carry the `Authorization` header, so it won't work here.

### Global hook with dedupe and throttle

One render loop can fire hundreds of identical errors, and a tester who hits 20 in an hour loses
crash capture for the rest of that hour. So:

- Drop a crash identical (same name, message and first stack line) to one sent in the last 60s.
- Send at most 5 per page load.
- Keep at most 15 per rolling hour across reloads, which leaves headroom under the server's 20.
- Stop for the rest of the page load after a 429 or a 5100.

```ts
const DEDUPE_MS = 60_000;
const MAX_PER_PAGE = 5;
const MAX_PER_HOUR = 15;
const HOUR_KEY = "crash-report-times";

const lastSent = new Map<string, number>();
let sentThisPage = 0;
let stopped = false;

function clip(s: string | undefined | null, max: number): string | null {
  return s ? s.slice(0, max) : null;
}

function hourBudgetOk(): boolean {
  const now = Date.now();
  let times: number[] = [];
  try { times = JSON.parse(localStorage.getItem(HOUR_KEY) ?? "[]"); } catch { /* storage blocked */ }
  times = times.filter((t) => now - t < 3_600_000);
  if (times.length >= MAX_PER_HOUR) return false;
  times.push(now);
  try { localStorage.setItem(HOUR_KEY, JSON.stringify(times)); } catch { /* ignore */ }
  return true;
}

export function reportCrash(error: unknown, componentStack?: string): void {
  if (stopped || !config.betaFeedback.enabled) return;
  const token = getAccessToken();
  if (!token) return;

  const err = error instanceof Error ? error : null;
  const name = (err?.name || (err ? "Error" : "UnhandledRejection")).trim() || "Error";
  const message = err ? err.message : String(error);
  const stack = [err?.stack, componentStack].filter(Boolean).join("\n");

  const key = `${name}|${message}|${stack.split("\n")[1] ?? ""}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < DEDUPE_MS) return;
  if (sentThisPage >= MAX_PER_PAGE || !hourBudgetOk()) return;
  lastSent.set(key, now);
  sentThisPage++;

  const body: ClientErrorRequestDto = {
    name: name.slice(0, 256),
    message: clip(message, 1024),
    stack: clip(stack, 8192),
    pageUrl: location.origin + currentRouteTemplate(), // §4
    appVersion: clip(process.env.NEXT_PUBLIC_BUILD_ID, 64),
  };
  fetch(`${API_BASE}/api/error-events/client`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
    .then((res) => { if (res.status === 429 || res.status === 409) stopped = true; })
    .catch(() => { /* never report a failure to report */ });
}

export function installCrashReporter(): void {
  window.addEventListener("error", (e) => reportCrash(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => reportCrash(e.reason));
}
```

In the error boundary:

```tsx
componentDidCatch(error: Error, info: React.ErrorInfo) {
  reportCrash(error, info.componentStack ?? undefined);
}
```

Call `installCrashReporter()` once, after `/api/config` has loaded and only if
`betaFeedback.enabled`. Keeping `recentErrors` doesn't depend on the switch; it's only memory.

## 7. Error codes

| status / code | where | what to do |
|---|---|---|
| 201 | bug report | show "Thanks, the team will look at it" |
| 204 | crash | nothing |
| 400 / 3001 `VALIDATION_FAILED` | both | a field broke a rule in §2 or §6. For a bug report, `errors` names the field when bean validation caught it. Two later checks answer with `detail` only: a description under 10 characters after trimming, and a `pageUrl` that starts with `http(s)://` but still isn't a valid URL (a space in the host, a brace in the path) |
| 400 / 3002 `MALFORMED_REQUEST_BODY` | both | invalid JSON or an unknown field: a frontend bug |
| 400 / 3012, 3014; 413 / 3013, 3016; 503 / 3017 | screenshot | §3 |
| 409 / 5100 `BETA_FEEDBACK_DISABLED` | both | switched off since the config was read: hide the button, stop the reporter |
| 411 / 3001 | both | no `Content-Length`: check the proxy |
| 413 / 3005 `REQUEST_TOO_LARGE` | both | body over the cap, or a `report` part over 64KB. For a report with a screenshot, show "the image is too large" |
| 429 / 3010 `RATE_LIMITED` | both | bug report: "You've sent several reports recently, try again later", using `Retry-After` (seconds). Crash: stop sending |
| 401 | both | not signed in |

When the feature is switched off, a request that fails field validation (invalid JSON, a field
error listed under `errors`, a `report` part over 64KB) still gets that 400 or 413 rather than the
5100. That applies to both routes.

## 8. Wording

Tell testers **their name isn't shown to the team that reads reports**. Don't say reports are
anonymous: the account is stored so an admin can follow up, and only admins can see it.

## 9. Admin screens (admin only; 403 for users and guests)

- `GET /api/bug-reports` → `Page<BugReportResponseDto>`, always newest `createdAt` first.
- `GET /api/bug-reports/{id}` → `BugReportResponseDto`. `screenshotUrl` is a presigned GET URL, or
  `null` when the report has no screenshot. `reporterUserId` becomes `null` once the account is
  deleted.
- `GET /api/error-events?source=&ref=` → `Page<ErrorEventResponseDto>`, always newest `lastSeenAt`
  first. `source` is `BACKEND`, `BACKGROUND` or `CLIENT`; anything else is 400 / 3001. `ref` is the
  12-character `errorRef`; a blank `ref` means no filter, and a malformed one is 400 / 3001.
- `GET /api/error-events/{id}` → `ErrorEventResponseDto`.

All four:

- `?sort=` is ignored.
- `size` defaults to 50 and is capped at 100.
- Pages use the shared `Page<T>` shape: `{ content, page: { size, number, totalElements, totalPages } }`.
- They work while the feature is switched off.

To go from a bug report to the matching error, take `recentErrors[i].errorRef` and query
`/api/error-events?ref=<it>`. A ref with no row is expected: nothing is recorded while switched
off or past the daily cap of new errors, but the ref is still returned.

## 10. End of beta

- Set `BETA_FEEDBACK_ENABLED=false` and redeploy. `betaFeedback.enabled` turns false, and the
  frontend hides everything from §1.
- The data stays. Screenshot cleanup is manual: delete the `bug-reports/` prefix in the bucket
  (the orphan sweep only covers `events/`), then `delete from bug_reports`.
