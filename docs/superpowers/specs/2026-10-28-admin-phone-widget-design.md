# Admin phone widget and push notifications

Date: 2026-10-28
Status: approved. Build step 1 is done; the exact JSON contract is `docs/fe-guides/admin-devices-fe-integration.md` in the Spring repo.

## Goal

Let the platform admin watch StoryWall from their Samsung Galaxy S25 Ultra without opening the website:
a home-screen widget with the key numbers, plus push notifications for important events and a daily digest.

## Decisions

| Topic | Decision |
|---|---|
| Form | A small native Android app with a home-screen widget. A web app can't add an Android home-screen widget. |
| Login | A read-only device key per phone, created and revoked in the admin console. The app never signs in as the admin, so the one-session rule never ends the browser session. |
| Pairing | QR code in the admin console, scanned by the app. |
| Widget | One resizable widget: the small size shows the headline row, a stretched widget shows every group. |
| Refresh | Every 15 minutes in the background (Android's minimum), plus a refresh button. |
| Push | Firebase Cloud Messaging, sent by Spring. |
| Instant alerts | Money problems, each paid order, reports and bug reports, error bursts. |
| Digest | Daily at 09:00 Greek time, recap of yesterday. |
| Costs | Latest provider bills, per currency, refreshed weekly as today. No change to how costs are fetched. |
| Code | A new GitHub repo for the app. Spring and website changes go in their existing repos. |

## Architecture

```
Admin console ──"Add phone"──► Spring creates a device key ──► QR code shown once
Phone app ──scans QR──► stores the key ──► GET /api/device/summary every 15 min ──► widget
Spring ──order paid / withdrawal held / report …──► Firebase ──► phone notification
```

Three repos:

- **Spring** (`event_social_media`): device keys, the summary endpoint, push sending, alert triggers, the error-burst check, the daily digest.
- **Website** (this repo): a "Phones" section in the admin console for pairing and removing phones.
- **Android app** (new repo `CodeGetItGR/storywall-admin-android`): pairing, the widget, notifications.

## Spring

### Device keys

New table `admin_devices`:

| Column | Notes |
|---|---|
| `id` | UUID |
| `owner_user_id` | The admin who paired the phone |
| `name` | Typed by the admin, e.g. "Galaxy S25 Ultra" |
| `key_hash` | `SecureTokens.hash` of the key; the key itself is never stored |
| `fcm_token` | Nullable; set by the app after pairing |
| `created_at`, `last_seen_at`, `revoked_at` | `last_seen_at` updates at most once a minute per device |

- The key is `SecureTokens.generate()` (256 bits). It is returned once, at creation, and never again.
- A new filter handles `/api/device/**` only. It reads `Authorization: Device <key>`, finds the row by hash, and accepts it only if the row is not revoked and the owner is still an active admin. It authenticates with a single `DEVICE` authority, never `ROLE_ADMIN`, so the key can't reach `/api/admin/**` or anything else.
- `/api/device/**` uses the existing rate limiting.
- Removing a phone sets `revoked_at` and clears `fcm_token`. The key stops working on its next request.
- Removing an admin's role, or suspending or deleting the account, revokes all their phones.

### Endpoints

Device key (`/api/device/**`):

- `GET /api/device/summary` returns the widget's numbers (below).
- `PUT /api/device/push-token` with `{ "token": "…" }` stores or replaces the phone's Firebase token.

Admin JWT (`/api/admin/**`, `ROLE_ADMIN`):

- `GET /api/admin/devices` lists every device of the calling admin that is not revoked.
- `POST /api/admin/devices` with `{ "name": "…" }` creates a device and returns it with its key, once. The website builds the pairing payload from the key.
- `DELETE /api/admin/devices/{id}` revokes it.
- `POST /api/admin/devices/{id}/test-notification` sends a test push (build step 3).

### Summary

All day boundaries use `Europe/Athens`. Each number comes from the service the admin console already uses, so the widget and the console always agree. Field paths below are as shipped; money is a list of `{ "currency", "amountMinor" }`, one per currency.

| Group | Field | Definition |
|---|---|---|
| Response | `generatedAt` | Server time of the response |
| Needs attention | `attention.heldWithdrawals` | Count of the list `GET /api/admin/withdrawals` returns |
| | `attention.unprocessedWebhooks` | Count of the list `GET /api/admin/webhooks/unprocessed` returns |
| | `attention.openReports` | Open moderation cases, the same count as the moderation queue |
| | `attention.bugReports24h` | Bug reports created in the last 24 hours |
| | `attention.errors24h` | Distinct errors seen in the last 24 hours, leaving out 4xx rejections; a repeat counts once, as on the Errors screen |
| Sales | `sales.todayOrders` | Paid orders since 00:00 today: every provider-paid order above 0 (`ordersByBuyerType`, added up), still counted if refunded later; the same orders the `ORDER_PAID` push reports |
| | `sales.today` | Net revenue per currency since 00:00 today, from the funnel service's revenue figures for that range |
| | `sales.week` | Net revenue per currency from Monday 00:00 to now, same source. Net revenue can be negative when refunds decided in the range outweigh its sales |
| Growth | `growth.signUpsToday` | The funnel's `signedUp` for today |
| | `growth.liveEvents` | `activeEvents` from the platform metrics |
| | `growth.visitorsToday` | Visitors from the visitor metrics service for today, cached. `null` when Google Analytics is not set up or fails |
| Costs and health | `costs.totals`, `costs.asOf` | The newest Monday run's readings only. `totals`, per currency: the sum of the readings with an amount from that run. `asOf`: when the run fetched them, which the widget shows as the date, e.g. "Costs · 26 Oct". A provider missing from that run, or never reconciled, is left out. The readings mix periods as fetched today: Vercel and Stripe report the last 7 days, Railway its month-to-date estimate, R2 an estimated monthly storage cost, so the widget shows a date, not a range |
| | `costs.storageUsedBytes` | `usedBytes` from the platform storage metrics |

- **No single cost total:** costs are never added across currencies. Vercel, Railway and R2 bill in dollars, so the widget shows e.g. "$38 + €6".
- **One slow source can't sink the rest:** if a source fails, its fields come back `null` and the rest of the summary still returns. Google Analytics, the only outside call, gets a 3-second budget; past it, `visitorsToday` is `null` and the call finishes in the background to fill the cache for the next poll.
- **Today and this week are phone-only views:** the console's funnel has no today or this-week preset, and its Errors screen has no "last 24 hours, no 4xx" filter. These figures use the console's sources, but the console can't show the same slice.
- **API up/down:** "API up" on the widget means the summary request succeeded. Outage alerts stay with the outside uptime monitor in [uptime-monitoring.md](../../uptime-monitoring.md), because Spring can't push about its own outage.

### Push

- **Firebase:** Spring sends over the FCM HTTP v1 API with the Google auth library it already has, not the Admin SDK. It sends to every device that has a token, is not revoked, and whose owner is still an admin.
- **Config:** the service-account JSON lives in Railway, Base64-encoded in `FIREBASE_SERVICE_ACCOUNT`. When the variable is unset, push is off and nothing is sent, which keeps local runs and tests quiet. This follows the off-by-default precedent of the metrics digest.
- **Message shape:** messages are data-only: a `type`, the numbers, and a `link` (the admin console section's hash, e.g. `#orders`; the app adds the site address). The app writes the text in the phone's language. Alerts are sent with high priority, the digest with normal priority.
- **Never blocks the action:** every trigger runs after the original transaction commits, on a background executor. A failed send is logged and never affects the action that caused it.
- **Dead tokens:** if Firebase reports a token as unregistered or invalid, that device's `fcm_token` is cleared.

| Type | Channel | Sent when | Data |
|---|---|---|---|
| `ORDER_PAID` | Sales | `OrderPaidEvent` for an order paid through a payment provider with an amount above 0. Orders an admin settled (bank transfer, €0) are skipped | amount, currency, plan name |
| `WITHDRAWAL_HELD` | Money | A withdrawal is held for review (the `WithdrawalNotifier` held path) | amount, currency |
| `WEBHOOK_UNPROCESSED` | Money | A payment webhook delivery is left unprocessed (the `PaymentWebhookController` failure path) | provider |
| `REPORT_CASE_OPENED` | Reports | When the report makes its item open (no `OPEN` report before it); a new report on an item under review alerts too. Further reports on an item that is already open send nothing | content type |
| `BUG_REPORT` | Reports | A bug report is created | none |
| `ERROR_BURST` | Errors | A job every 5 minutes counts error events in the last 60 minutes: every occurrence, 4xx rejections left out, in memory. At 10 or more, it sends one alert, then stays quiet for 60 minutes. Threshold, window and quiet time are properties | count |
| `DAILY_DIGEST` | Daily digest | 09:00 `Europe/Athens` | yesterday's paid orders and net revenue per currency, sign-ups, visitors; latest costs per currency; any needs-attention count above 0 |
| `TEST` | Sales | The admin console's "Send test notification" button | none |

The `TEST` type uses the Sales channel so it shows like a real alert; it sends to that one device only.

## Website (admin console)

New section **Phones** (`#phones`) in the sidebar's operations group, built with the admin design system (table, right-side drawer, status pill, confirmation modal).

- **Table:** name, paired on, last seen, and notifications (On when the device has a Firebase token, Off otherwise).
- **"Add phone":** opens a drawer with a name field. After creating, the drawer shows the QR code (`qrcode.react`, already installed) and says it is shown once.
  - The QR payload is JSON: `{ "v": 1, "api": "<Spring base URL>", "key": "<device key>" }`.
  - The drawer never shows the key again after it closes.
- **Row drawer:** the device's details, "Send test notification" (build step 3), and "Remove phone". Remove asks for confirmation in a modal that states the phone stops updating right away.
- **Copy and data:** all copy goes into `messages/en.json` and `messages/el.json`. The data comes from a hook in `hooks/` with an exported query key.

## Android app

Repo `CodeGetItGR/storywall-admin-android`. Name "StoryWall Admin", package `gr.storywall.admin`. Kotlin, Jetpack Compose, Jetpack Glance for the widget, WorkManager for the refresh, Firebase Messaging. `minSdk` 31.

### Screen

One screen:

- **Not paired:** a "Scan QR code" button. It uses Google's code scanner from Play services, so the app needs no camera permission.
- **Paired:**
  - the four groups with the same numbers as the widget, and pull to refresh;
  - on Android 13 and later, a prompt for the notification permission;
  - "Unpair", which forgets the key and token on the phone.
- **Key storage:** the key and API address are stored encrypted with the Android Keystore.
- **Theme and language:** follows the phone's light/dark mode and language. Strings live in `values/` (English) and `values-el/` (Greek).

### Widget

- **Small** (from about 4x2): a "needs you" total, today's revenue, sign-ups today, latest costs, API status.
- **Large** (from about 4x4): every group in full, and a footer with "Updated 10:45" and a refresh button.
- **Tap targets:** tapping a group opens the admin console in the browser at:

  | Group | Link |
  |---|---|
  | Needs attention | The first of `#withdrawals`, `#billing-ops`, `#reports`, `#bug-reports`, `#errors` whose count is above 0; `#metrics` when all are 0 |
  | Sales | `#orders` |
  | Growth | `#visitors` |
  | Costs | `#cost-tracking` |

  The site address comes from a build setting, so a staging build links to staging.
- **States:**
  - *Can't reach Spring:* keeps the last numbers and shows "Can't reach API" with the time of the last success.
  - *Spring answers 401 (key revoked):* shows "Pair again", and tapping opens the app.
  - *Never loaded:* shows a short loading line, never zeros.

### Notifications

- **Channels:** Money, Sales, Reports, Errors and Daily digest. Each channel can be turned off in Android's own notification settings, so there is no in-app settings screen.
- **Text and taps:** the app builds the text from the push's data, in the phone's language. Tapping a notification opens its `link`.
- **Token updates:** when Firebase gives the app a new token, the app sends it with `PUT /api/device/push-token`.

### Distribution

A release APK signed with a keystore kept outside the repo, installed over USB with `adb install`. Not published on the Play Store.

## Build order

Each step is its own PR into `staging` (Spring and website) or into the app repo's main branch.

1. **Keys and summary.** Spring: `admin_devices`, the device filter, the device and admin endpoints, the summary. Website: the Phones section with QR pairing.
2. **App and widget.** The new repo, pairing, the screen, the widget, the 15-minute refresh.
3. **Push.** Spring: Firebase sending, the triggers, the error-burst job, the daily digest, the test endpoint. Website: the test button. App: Firebase Messaging, channels, token upload. The app branch starts from step 2's branch.

Before step 3, the admin:

1. Creates a free Firebase project.
2. Adds two Android apps, `gr.storywall.admin` and `gr.storywall.admin.debug`.
3. Downloads `google-services.json` for the app repo (it stays out of git).
4. Creates a service-account key and sets it Base64-encoded as `FIREBASE_SERVICE_ACCOUNT` in Railway.

## Testing

- **Spring:**
  - Device filter: valid key, revoked key, owner no longer an admin, and that a device key gets 401 on `/api/admin/**` and other paths (the filter never reads it there).
  - Summary: each field against seeded data, and a failing source returns `null` while the rest still returns.
  - Each trigger sends exactly one push, and none when push is off.
  - Skipped cases: admin-settled orders, a second report on an open case.
  - The error-burst threshold and quiet time.
  - The digest's content and its `Europe/Athens` day boundaries.
- **Website:** tests for the Phones section in the style of the existing `AdminNavigationContext.*.test.tsx`, plus TypeScript, lint, and a visual check at desktop width.
- **App:**
  - Unit tests for parsing the summary, formatting money and bytes, and choosing the tap link.
  - A real run on the S25 Ultra against staging: pair, place and resize the widget, refresh, revoke from the console and see "Pair again", and receive a test notification.

## Out of scope

- iOS, the Play Store, and in-app notification settings.
- Charts or history in the widget.
- Alerts for Spring being down (the uptime monitor covers it).
- Fetching provider costs more often than weekly.
