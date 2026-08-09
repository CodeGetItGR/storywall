# System design

Architecture overview for engineers working on the backend. For product concepts see
[`product.md`](product.md); for API contracts see
[`frontend-integration-guide.md`](frontend-integration-guide.md).

## 1. Stack

- **Spring Boot** (Java), layered `controller → service → repository` per domain area.
- **PostgreSQL** via Spring Data JPA, migrations managed with **Flyway**.
- **Cloudflare R2** (S3-compatible) for media storage, accessed via the AWS S3 SDK, URLs
  presigned with a short TTL (default 15 min) rather than served directly.
- **JWT** auth (`io.jsonwebtoken`), stateless — access + refresh tokens, plus a separate
  guest-token flow.
- **Stripe** as the primary payment provider, with a `MANUAL` provider as a no-op fallback for
  environments without billing wired up (`app.billing.provider`).
- **MapStruct** for entity↔DTO mapping.
- **springdoc-openapi** for OpenAPI/Swagger generation.
- Scheduled jobs (notification sweep, playlist digest, billing sweep, mail dispatch) run via
  Spring's `@Scheduled`, each independently feature-flagged and off by default in a fresh
  environment.

## 2. Package layout

Grouped by domain, each domain repeating the same internal shape:

```
event_social_media/
  controller/{auth,event,media,user,billing,platform,audit}/
  service/{auth,event,media,user,billing,platform,notification,ratelimit,storage,audit}/
  model/{event,media,user,billing,platform,audit,base}/
  dto/{...same groupings...}
  mapper/{...}
  repository/{...}
  security/
  config/
  exception/
```

`model/base` holds `Auditable`/`MutableAuditable` — the shared created/updated/deleted-at
base classes nearly every entity inherits from (soft-delete is the default pattern, not hard
delete).

## 3. Request flow

```
HTTP request
  → RequestCorrelationFilter (assigns a correlation id for log tracing)
  → JwtAuthenticationFilter (validates bearer token, populates Authentication)
  → Spring Security filter chain (SecurityConfig: per-path auth rules, @PreAuthorize on
    controller methods for role/ownership checks)
  → RateLimit interceptor (per-endpoint, in-memory, only where @RateLimit is declared or the
    default catch-all applies)
  → Controller (thin — binds/validates request DTOs, delegates to service)
  → Service (business logic, authorization *content* checks like "is this caller the host",
    transaction boundaries)
  → Repository (Spring Data JPA)
  → Mapper (entity → response DTO at the boundary back out)
  → GlobalExceptionHandler turns any thrown ApiException/framework exception into an RFC 7807
    ApiError response
```

Controllers do not talk to repositories directly. Authorization has two layers: **who you
are** (role — `ROLE_USER`, `ROLE_ADMIN`, guest) enforced declaratively via
`@PreAuthorize`/Security config, and **what you own** (e.g. "are you a host of *this* event")
enforced imperatively inside services, since that requires loading the resource.

## 4. Auth model

Three identities, one token scheme:

- **Registered user** — email+password, full `/api/auth/register` → `/api/auth/login` flow,
  refresh tokens persisted server-side (revocable on logout).
- **Guest** — `/api/auth/guest-login` against an invite token; idempotent per token; issues an
  access token scoped to that one event, no refresh token (guests re-run guest-login instead
  of refreshing).
- **Admin** — a `ROLE_ADMIN` registered user; no separate auth path, just a role check.

`ScopeChecker` + service-level ownership checks are what actually stop a guest of event A from
touching event B's resources — the JWT alone only proves *who*, not *what they can reach*.

## 5. Media pipeline

1. Client uploads via multipart to `MediaController` (single or `/media/batch`, up to 10 files
   / 20MB each / 220MB per request).
2. Backend streams the file to R2, records a `Media` row (owner, event, size, content type).
3. Every read path returns a **presigned GET URL**, not a permanent one — expires per
   `r2.presigned-url-ttl-minutes`. Clients must not cache these beyond the session; re-fetch
   the parent resource for a fresh URL.
4. Deletion is soft (`deletedAt`) first; actual byte destruction happens later via
   `MediaPurgeService`, driven by the billing sweep's retention window
   (`app.billing.media-retention-days`), not immediately on delete.

## 6. Billing subsystem

The most structurally complex part of the backend — `service/billing/` and `model/billing/`.
Key pieces:

- **`PaymentProvider`** — interface implemented by `StripePaymentProvider` and
  `ManualPaymentProvider`; `PaymentProviderRegistry` picks one at startup per
  `app.billing.provider`. Stripe refuses to start without both its secret and webhook secret
  configured — same "fail loud, don't silently degrade" pattern as the mail sender.
- **`CheckoutService`** → creates a `CheckoutSession`/`CheckoutIntent`, hands the host a
  provider-hosted checkout URL.
- **Webhooks** (`PaymentWebhookController` → `WebhookDispatcher` → `WebhookLedger`) — every
  inbound provider event is recorded (`ProviderWebhookEvent`) before processing, so replay
  (`WebhookReplayService`) and idempotency are possible if a handler failed partway.
- **`BillingSweepJob`** — the scheduled reconciler. Settles orders whose webhook never
  arrived, then walks `EventCoverageService`'s notion of "is this event currently paid for"
  and drives the freeze → purge lifecycle (`EventLifecycleService`,
  `MediaDestroyTransaction`). Off by default; enabling it is a deliberate, environment-by-
  environment decision because it's the only thing in the codebase that destroys data as a
  matter of course.
- **`RefundService`** — refund eligibility is a hard gate (unused event, inside the refund
  window), not a judgment call left to an admin UI.

Two subscription axes are modeled separately and never merged: `EventSubscription` (event's
plan, storage/member quota) vs. the user's own plan tier (active-event cap). See
[`product.md`](product.md) §4 for the product-level explanation.

## 7. Notifications & scheduled jobs

All scheduled work lives behind `SchedulingConfig` (`@EnableScheduling`) and is individually
flag-gated in `application.properties`:

| Job | Flag | Purpose |
|---|---|---|
| Notification sweep | `NOTIFICATIONS_SWEEP_ENABLED` | Evaluates `NotificationRule`s (storage/member/event-cap thresholds, upgrade offers, pre-event tips) hourly, writes `Notification` rows. Rule set lives in `service/notification/` as one class per rule. |
| Playlist digest | shares the sweep flag | Rolls up new song suggestions into one feed post per event per run. |
| Billing sweep | `BILLING_SWEEP_ENABLED` | Reconciliation, dunning, freeze, purge — see §6. |
| Mail dispatch | `APP_MAIL_ENABLED` | Sends queued notification emails via Brevo SMTP; with it off, emails are logged, not sent, and nothing else changes. |

A host is only ever told about a given threshold crossing once — dismissing a notification
doesn't reset it, crossing a *further* threshold produces a new one. This is enforced at
write-time in the rule, not filtered client-side.

## 8. Rate limiting

In-memory, per-instance token counters via a `RateLimit` interceptor/annotation
(`service/ratelimit/`). A global default (`app.rate-limit.default-limit`,
`...default-window-seconds`) applies to any endpoint without its own `@RateLimit`; auth,
checkout, refund, and admin money endpoints declare tighter limits inline. Explicitly a brake
on runaway clients, not a distributed edge defence — N instances mean N independent windows.

## 9. Deployment

- `docker-compose.yaml` — local Postgres + app for development.
- `railway.json` / `nixpacks.toml` — Railway is the target deploy platform; build via
  Nixpacks, no Dockerfile-based deploy path currently maintained separately from Compose.
- Flyway runs migrations automatically on boot; there's no separate manual-migration step in
  the deploy flow.
- Actuator exposes `health` publicly (for LB probes) and `metrics`/`prometheus` admin-only —
  configured in `SecurityConfig`, not just `application.properties`.

## 10. Where to go next

- Full endpoint list and DTO shapes: [`frontend-integration-guide.md`](frontend-integration-guide.md)
  and [`frontend-api-types.ts`](frontend-api-types.ts)
- Billing specifics: [`billing-payments-fe-integration.md`](billing-payments-fe-integration.md),
  [`billing-hardening-2026-08.md`](billing-hardening-2026-08.md)
- Knowledge graph (community/dependency structure) for deep dives: `graphify-out/` — run
  `graphify query "<question>"` rather than grepping source cold.
