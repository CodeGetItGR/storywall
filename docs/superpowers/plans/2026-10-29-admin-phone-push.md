# Admin phone push (build step 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase push notifications to every paired StoryWall Admin phone: instant alerts (money problems, each paid order, reports and bug reports, error bursts), a 09:00 daily digest, and a test push from the admin console's Phones drawer.

**Architecture:** Spring sends data-only FCM messages over the FCM HTTP v1 API, using the Google auth library it already has for Analytics. Every trigger publishes an `AdminAlert` application event; one `@Async` `@TransactionalEventListener` sends it after the publisher's transaction commits, once per token, to live phones of active admins. The website adds a "Send test notification" button. The Android app gets a token from Firebase, uploads it with `PUT /api/device/push-token`, builds the text in the phone's language, and opens the console section on tap.

**Tech Stack:** Spring Boot 3.3.13, Java 21, `java.net.http.HttpClient`, `com.google.auth:google-auth-library-oauth2-http` 1.54.0 (already in the build), JUnit 5, Mockito, H2 test suite. Next.js website with next-intl, React Query, Vitest. Android: Kotlin 2.4.21, AGP 9.5.0, Firebase Cloud Messaging (Firebase BoM), WorkManager 2.12.0, DataStore, OkHttp 5.5.1, JUnit 4, MockWebServer.

**Sources:** spec `docs/superpowers/specs/2026-10-28-admin-phone-widget-design.md` (this repo), device contract `docs/fe-guides/admin-devices-fe-integration.md` (Spring repo, staging), the app at `C:\Users\User\IdeaProjects\storywall-admin-android` (branch `claude/app-and-widget`).

---

## Decisions

Answered by the user on 2026-10-29, plus the smaller calls this plan makes.

| Topic | Decision |
|---|---|
| Sender | FCM HTTP v1 over `HttpClient`, with `ServiceAccountCredentials` from the Google auth library, like `GoogleAnalyticsClient`. Not the Firebase Admin SDK. The spec is updated (Task D1). |
| Firebase projects | One project with two Android apps: `gr.storywall.admin` (release) and `gr.storywall.admin.debug` (debug). One `google-services.json`. The same service-account key goes in staging and, later, production Railway. |
| Error burst | Every occurrence counts, 4xx rejections left out, counted in memory by Spring. A restart starts the count again. |
| Report alert | Sent when the report makes its item open: the item had no `OPEN` report before it. A new report on an item under review alerts too. |
| Removing phones | Any change that ends active admin (role removed, suspended, soft-deleted by an admin) revokes all their phones for good. Admins can't delete their own account (`ACCOUNT_DELETE_ADMIN`), and a hard delete cascades. |
| App branch | `claude/app-push` from `claude/app-and-widget`. Step 2 merges into the app's `main` first. |
| Testing | No key on the PC. Spring and the app are tested with mocks locally. The first real push is on staging, after the Spring and website PRs merge into staging with the user's yes. |
| Push off | `FIREBASE_SERVICE_ACCOUNT` unset means push is off: no sends, no Firebase calls. Local runs and the test suite stay quiet. |
| Delivery | Data-only messages. Alerts at `HIGH` priority, the digest at `NORMAL`. A one-day TTL: Firebase drops an alert it couldn't deliver within a day. |
| Dead tokens | `UNREGISTERED`, `SENDER_ID_MISMATCH`, or `INVALID_ARGUMENT` on `message.token` clear that token on every row. `INVALID_ARGUMENT` on another field is our bug and clears nothing. |
| Retries | None. A failed send is logged. |
| One send per token | The same token can sit on two live rows (a phone paired twice). The sender selects distinct tokens. |
| Test endpoint errors | `404` unknown or another admin's phone; `409 PUSH_NOT_ENABLED` (5186) no token, or Firebase says the token is dead (the token is then cleared); `503 PUSH_UNAVAILABLE` (9003) push is off on the server; `502 PUSH_SEND_FAILED` (9004) Firebase didn't accept it. Rate limit 10 per minute. |
| Test button | Disabled while the phone's Notifications pill is Off. Shows "Sent." after a success. The list refetches after every try, so a dead token turns the pill Off. |
| Digest | Yesterday in `Europe/Athens`: paid orders, net revenue per currency, sign-ups, visitors (GA, left out when unknown); the newest cost run's totals per currency; each needs-attention count above 0, as of 09:00. Sent even when everything is 0. |
| Order alert data | `amountMinor` (the amount charged), `currency`, `kind` (`ACTIVATION`, `UPGRADE`, `STORAGE_PACK`, `EXTENSION`), `plan` (the plan tier's name). Same orders as the summary's `todayOrders`: provider-paid, not settled by an admin, above 0. |
| Withdrawal alert data | `amountMinor` and `currency`, each left out when unknown. |
| Unpair on the phone | Deletes the Firebase token, so Firebase stops delivering; the next send finds it dead and clears it on the server. The app also drops any push that arrives while it is not paired. |
| Links | Spring sends the section hash. The app opens it only if it matches `^#[a-z][a-z-]{0,39}$`, so a push can never open an arbitrary URL. |
| Firebase in the app | No google-services Gradle plugin (its AGP 9 support is unproven). The build reads `app/google-services.json` and writes the same string resources the plugin would. Without the file, the app builds and runs with push off and no notifications row. |
| Notification permission | Android 13+ only (`minSdk` 31). A "Notifications are off." row with "Turn on" on the app screen while not allowed. "Turn on" asks; once Android stops showing its dialog, it opens the app's notification settings. |
| Phone checks | No `adb screencap` on the user's phone. The user looks; I read the app's own logs with filtered `logcat`. |
| Not in scope | iOS, in-app notification settings, retries, production rollout (setting the key in production Railway and installing a release build), alerts for Spring being down. |

## Push messages

What Spring sends in the FCM `data` map. Every value is a string. Every message has `type` and `link`. An unknown figure is left out, never sent as `0`.

| `type` | Fields | `link` | Channel | Priority |
|---|---|---|---|---|
| `ORDER_PAID` | `amountMinor`, `currency`, `kind`, `plan` | `#orders` | Sales | high |
| `WITHDRAWAL_HELD` | `amountMinor`, `currency` (both optional) | `#withdrawals` | Money | high |
| `WEBHOOK_UNPROCESSED` | `provider` (e.g. `STRIPE`) | `#billing-ops` | Money | high |
| `REPORT_CASE_OPENED` | `targetType` (`POST`, `COMMENT`, `MEMBER`, `STORY`, `MEDIA`, `WISHBOOK_ENTRY`, `PLAYLIST_SUGGESTION`) | `#reports` | Reports | high |
| `BUG_REPORT` | none | `#bug-reports` | Reports | high |
| `ERROR_BURST` | `count`, `windowMinutes` | `#errors` | Errors | high |
| `DAILY_DIGEST` | `day` (`2026-10-28`), `orders`, `revenue`, `signUps`, `visitors`, `costs`, and `heldWithdrawals`, `unprocessedWebhooks`, `openReports`, `bugReports24h`, `errors24h` when above 0. `revenue` and `costs` are JSON arrays of `{ "currency", "amountMinor" }` | `#metrics` | Daily digest | normal |
| `TEST` | none | `#phones` | Sales | high |

## Notification copy

English (`values/`) and Greek (`values-el/`). Amounts use the app's `Formats.money`; counts use `Formats.count`.

| Type | Title | Body |
|---|---|---|
| `ORDER_PAID` | New order: €189 / Νέα παραγγελία: €189 | `ACTIVATION`: the plan name. `UPGRADE`: Upgrade to {plan} / Αναβάθμιση σε {plan}. `STORAGE_PACK`: Storage pack / Πακέτο χώρου. `EXTENSION`: Extension / Παράταση |
| `WITHDRAWAL_HELD` | Withdrawal held for review / Απόσυρση σε έλεγχο | the amount, when known |
| `WEBHOOK_UNPROCESSED` | Payment webhook not processed / Webhook πληρωμής χωρίς επεξεργασία | the provider, e.g. Stripe |
| `REPORT_CASE_OPENED` | New report / Νέα αναφορά | the console's label: Post / Ανάρτηση, Comment / Σχόλιο, Member / Μέλος, Story / Ιστορία, Photo or video / Φωτογραφία ή βίντεο, Wish / Ευχή, Song suggestion / Πρόταση τραγουδιού |
| `BUG_REPORT` | New bug report / Νέα αναφορά προβλήματος | none |
| `ERROR_BURST` | Many errors / Πολλά σφάλματα | 42 in the last 60 minutes / 42 τα τελευταία 60 λεπτά |
| `DAILY_DIGEST` | Recap · 28 Oct / Σύνοψη · 28 Οκτ | Orders 4 · Revenue €189 / Παραγγελίες 4 · Έσοδα €189. Expanded, also: Sign-ups 7 · Visitors 312 / Εγγραφές 7 · Επισκέπτες 312; Costs €6 + $38 / Κόστη €6 + $38 (sorted by currency code, as on the widget); and, when any is above 0, Withdrawals 1 · Reports 2 / Αποσύρσεις 1 · Αναφορές 2 |
| `TEST` | Test notification / Δοκιμαστική ειδοποίηση | Notifications work. / Οι ειδοποιήσεις λειτουργούν. |

Channels: Money / Χρήματα, Sales / Πωλήσεις, Reports / Αναφορές, Errors / Σφάλματα, Daily digest / Ημερήσια σύνοψη.

App screen: "Notifications are off." / "Οι ειδοποιήσεις είναι ανενεργές." with "Turn on" / "Ενεργοποίηση".

Console (Phones drawer): "Send test notification" / "Αποστολή δοκιμαστικής ειδοποίησης"; "Sent." / "Στάλθηκε."; errors: "This phone's notifications are off. Open the app on the phone." / "Οι ειδοποιήσεις αυτού του κινητού είναι ανενεργές. Ανοίξτε την εφαρμογή στο κινητό."; "Notifications aren't set up on the server." / "Οι ειδοποιήσεις δεν έχουν ρυθμιστεί στον διακομιστή."; "Couldn't send. Try again." / "Η αποστολή απέτυχε. Δοκιμάστε ξανά."

## Firebase setup (the user does this; no secret ever goes in chat)

Needed before Task E1 (the staging check). The app builds without it.

1. In the Firebase console, create a project, e.g. "StoryWall Admin". Google Analytics: off.
2. Add an Android app with package `gr.storywall.admin`, then a second with `gr.storywall.admin.debug`. No SHA-1 needed.
3. Download `google-services.json` (the one downloaded after adding the second app lists both). Save it as `C:\Users\User\IdeaProjects\storywall-admin-android\app\google-services.json`. It is already in the app's `.gitignore`.
4. Project settings → Service accounts → Generate new private key. Keep the JSON file outside every repo.
5. Copy it Base64-encoded to the clipboard without showing it, in PowerShell:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("<path to the key file>")) | Set-Clipboard`
6. In Railway, staging service: add the variable `FIREBASE_SERVICE_ACCOUNT` and paste. Railway redeploys.
7. Delete the key file from Downloads once it is in Railway. A new key can be generated any time.

## Branches

- **Spring:** worktree `C:\Users\User\IdeaProjects\event_social_media\.claude\worktrees\admin-phone-push`, branch `claude/admin-phone-push` from `origin/staging`, with `--no-track`.
- **Website:** this worktree, branch `claude/admin-phone-push` from `origin/staging` (created 2026-10-29).
- **App:** `C:\Users\User\IdeaProjects\storywall-admin-android`, branch `claude/app-push` from `claude/app-and-widget`.

Nothing is pushed and no PR is opened without the user's yes. PRs go into `staging` (Spring, website) and the app's `main` (after step 2's).

## File structure

```
Spring (event_social_media)
  src/main/java/event_social_media/config/PushProperties.java                 new: app.push.* settings, isEnabled()
  src/main/java/event_social_media/service/push/FcmClient.java                new: one FCM v1 send, never throws
  src/main/java/event_social_media/service/push/FcmCredentials.java           new: project id + access token
  src/main/java/event_social_media/service/push/ServiceAccountFcmCredentials.java  new: from the Base64 key
  src/main/java/event_social_media/service/push/FcmResult.java                new: SENT, DEAD_TOKEN, FAILED
  src/main/java/event_social_media/service/push/AdminAlertType.java           new: link + urgency per type
  src/main/java/event_social_media/service/push/AdminAlert.java               new: the event; data per type
  src/main/java/event_social_media/service/push/AdminPushService.java         new: send to all, send test
  src/main/java/event_social_media/service/push/AdminAlertListener.java       new: after commit, async
  src/main/java/event_social_media/service/push/OrderPaidAlerts.java          new: OrderPaidEvent → ORDER_PAID
  src/main/java/event_social_media/service/push/ErrorBurstCounter.java        new: per-minute counts, 24 h
  src/main/java/event_social_media/service/push/ErrorBurstJob.java            new: every 5 min
  src/main/java/event_social_media/service/push/DailyDigestJob.java           new: 09:00 Athens
  src/main/java/event_social_media/service/device/DailyDigest.java            new: the digest's figures
  src/main/java/event_social_media/exception/PushUnavailableException.java    new: 503
  src/main/java/event_social_media/exception/ErrorCode.java                   +3 codes
  src/main/java/event_social_media/repository/device/AdminDeviceRepository.java  +3 queries
  src/main/java/event_social_media/repository/audit/ReportRepository.java     +1 finder
  src/main/java/event_social_media/service/device/AdminDeviceService.java     +revokeAllOwnedBy
  src/main/java/event_social_media/service/device/DeviceSummaryService.java   +digest(), shared attention()
  src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java  +test-notification
  src/main/java/event_social_media/service/billing/withdrawal/WithdrawalNotifier.java  +WITHDRAWAL_HELD
  src/main/java/event_social_media/controller/billing/PaymentWebhookController.java   +WEBHOOK_UNPROCESSED
  src/main/java/event_social_media/service/audit/ReportService.java           +REPORT_CASE_OPENED
  src/main/java/event_social_media/service/feedback/BugReportService.java     +BUG_REPORT
  src/main/java/event_social_media/service/feedback/ErrorEventRecorder.java   counts each non-4xx occurrence
  src/main/java/event_social_media/service/user/UserService.java              revokes phones on leaving active admin
  src/main/resources/application.properties                                   app.push.*
  .env.example                                                                FIREBASE_SERVICE_ACCOUNT
  docs/fe-guides/admin-devices-fe-integration.md                              test endpoint + push messages
  docs/CHANGELOG.md                                                           entry

Website (storywall)
  lib/api/endpoints.ts, lib/api/errors.ts, lib/api/errorMessageKeys.ts, lib/adminUtils.ts
  hooks/useAdminDevices.ts                                                    +useSendTestNotification
  hooks/usePhoneTestNotification.ts                                           new
  components/admin/phones/PhoneDetailDrawer.tsx                               +Test section
  messages/en.json, messages/el.json
  docs/superpowers/specs/2026-10-28-admin-phone-widget-design.md              decisions of 2026-10-29

App (storywall-admin-android)
  gradle/libs.versions.toml, app/build.gradle.kts                             Firebase, google-services.json
  app/src/main/AndroidManifest.xml                                            permission, service
  app/src/main/java/gr/storywall/admin/push/PushMessage.kt                    parse FCM data
  app/src/main/java/gr/storywall/admin/push/PushTexts.kt                      title/body in the phone's language
  app/src/main/java/gr/storywall/admin/push/Channels.kt                       5 channels
  app/src/main/java/gr/storywall/admin/push/Notifications.kt                  show one, tap opens the console
  app/src/main/java/gr/storywall/admin/push/AdminMessagingService.kt          Firebase entry point
  app/src/main/java/gr/storywall/admin/push/PushTokenClient.kt                PUT /api/device/push-token
  app/src/main/java/gr/storywall/admin/push/PushTokenStore.kt                 uploaded token, asked flag
  app/src/main/java/gr/storywall/admin/push/PushTokenSync.kt                  upload when needed
  app/src/main/java/gr/storywall/admin/push/PushTokenWorker.kt                WorkManager wrapper
  app/src/main/java/gr/storywall/admin/push/PushTokens.kt                     sync / forget / available
  app/src/main/java/gr/storywall/admin/ui/NotificationPrompt.kt               permission row + launcher
  app/src/main/java/gr/storywall/admin/AdminApp.kt, AppGraph.kt, pairing/PhonePairing.kt,
    ui/HomeViewModel.kt, ui/HomeRoute.kt, ui/SummaryScreen.kt, format/Formats.kt
  app/src/main/res/drawable/ic_notification.xml, values/strings.xml, values-el/strings.xml
  app/src/test/java/gr/storywall/admin/TestStrings.kt                         English strings for tests
  app/src/test/java/gr/storywall/admin/push/*Test.kt
  README.md
```

---

## Part A: Spring

Run every Gradle command from the Spring worktree with the Bash tool. The suite runs on H2; a test class runs with `./gradlew test --tests "<class>"`.

### Task A0: Worktree

- [ ] **Step 1: Create the worktree from the latest staging**

```bash
cd /c/Users/User/IdeaProjects/event_social_media
git fetch origin -q
git worktree add .claude/worktrees/admin-phone-push -b claude/admin-phone-push --no-track origin/staging
cd .claude/worktrees/admin-phone-push && git log --oneline -1
```

Expected: the head is `ca43dc4c` or newer (step 1's merge).

### Task A1: Push settings

**Files:**
- Create: `src/main/java/event_social_media/config/PushProperties.java`
- Modify: `src/main/resources/application.properties` (after the `app.metrics.digest.*` block)
- Modify: `.env.example`
- Test: `src/test/java/event_social_media/config/PushPropertiesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class PushPropertiesTest {

    @Test
    void pushIsOffUntilTheServiceAccountIsSet() {
        PushProperties properties = new PushProperties();
        assertThat(properties.isEnabled()).isFalse();

        properties.setServiceAccount("  ");
        assertThat(properties.isEnabled()).isFalse();

        properties.setServiceAccount("eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0=");
        assertThat(properties.isEnabled()).isTrue();
    }

    @Test
    void theErrorBurstDefaultsAreTenInAnHourThenAnHourQuiet() {
        PushProperties.ErrorBurst burst = new PushProperties().getErrorBurst();
        assertThat(burst.getThreshold()).isEqualTo(10);
        assertThat(burst.getWindow()).isEqualTo(Duration.ofMinutes(60));
        assertThat(burst.getQuiet()).isEqualTo(Duration.ofMinutes(60));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.config.PushPropertiesTest"`
Expected: compilation fails, `PushProperties` not found.

- [ ] **Step 3: Write `PushProperties`**

```java
package event_social_media.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Push notifications to paired admin phones (spec 2026-10-28-admin-phone-widget-design, storywall
 * repo). Off unless {@code serviceAccount} is set, the same off-by-default precedent as the metrics
 * digest, so local runs and tests never call Firebase.
 */
@Component
@ConfigurationProperties("app.push")
@Getter
@Setter
public class PushProperties {

    /** The Firebase service-account JSON, Base64-encoded ({@code FIREBASE_SERVICE_ACCOUNT}). Blank means push is off. */
    private String serviceAccount = "";

    /** Overridden by tests to point at a local server. */
    private String fcmBaseUrl = "https://fcm.googleapis.com";

    private ErrorBurst errorBurst = new ErrorBurst();

    private Digest digest = new Digest();

    public boolean isEnabled() {
        return serviceAccount != null && !serviceAccount.isBlank();
    }

    @Getter
    @Setter
    public static class ErrorBurst {

        /** Errors within {@link #window} that send one alert. */
        private int threshold = 10;

        /** At most 24 hours: {@code ErrorBurstCounter} keeps one day of minutes. */
        private Duration window = Duration.ofMinutes(60);

        /** How long the check stays quiet after an alert. */
        private Duration quiet = Duration.ofMinutes(60);

        private String cron = "0 */5 * * * *";
    }

    @Getter
    @Setter
    public static class Digest {

        /** In Europe/Athens. */
        private String cron = "0 0 9 * * *";
    }
}
```

- [ ] **Step 4: Add the properties**

In `src/main/resources/application.properties`, after the line `app.metrics.digest.recipients=${METRICS_DIGEST_RECIPIENTS:}`:

```properties

# Push to paired admin phones through Firebase (spec 2026-10-28-admin-phone-widget-design, storywall
# repo). Off while FIREBASE_SERVICE_ACCOUNT (the service-account JSON, Base64) is unset.
app.push.service-account=${FIREBASE_SERVICE_ACCOUNT:}
app.push.error-burst.threshold=${PUSH_ERROR_BURST_THRESHOLD:10}
app.push.error-burst.window=${PUSH_ERROR_BURST_WINDOW:60m}
app.push.error-burst.quiet=${PUSH_ERROR_BURST_QUIET:60m}
app.push.error-burst.cron=${PUSH_ERROR_BURST_CRON:0 */5 * * * *}
app.push.digest.cron=${PUSH_DIGEST_CRON:0 0 9 * * *}
```

In `.env.example`, next to the other optional integrations (find `METRICS_DIGEST_ENABLED`):

```properties
# Push to paired admin phones: the Firebase service-account JSON, Base64-encoded. Unset = push off.
FIREBASE_SERVICE_ACCOUNT=
```

- [ ] **Step 5: Run the test**

Run: `./gradlew test --tests "event_social_media.config.PushPropertiesTest"`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/config/PushProperties.java src/main/resources/application.properties .env.example src/test/java/event_social_media/config/PushPropertiesTest.java
git commit -m "feat(push): settings for admin phone push, off by default"
```

### Task A2: FCM client

**Files:**
- Create: `src/main/java/event_social_media/service/push/FcmResult.java`
- Create: `src/main/java/event_social_media/service/push/FcmCredentials.java`
- Create: `src/main/java/event_social_media/service/push/ServiceAccountFcmCredentials.java`
- Create: `src/main/java/event_social_media/service/push/FcmClient.java`
- Test: `src/test/java/event_social_media/service/push/FcmClientTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import event_social_media.config.PushProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class FcmClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<String> path = new AtomicReference<>();
    private final AtomicReference<String> authorization = new AtomicReference<>();
    private final AtomicReference<String> body = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String answer = "{\"name\":\"projects/storywall-admin/messages/1\"}";
    private HttpServer server;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            path.set(exchange.getRequestURI().getPath());
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] out = answer.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, out.length);
            exchange.getResponseBody().write(out);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private static final FcmCredentials CREDENTIALS = new FcmCredentials() {
        @Override
        public String projectId() {
            return "storywall-admin";
        }

        @Override
        public String accessToken() {
            return "token-1";
        }
    };

    private FcmClient client(String baseUrl, FcmCredentials credentials) {
        PushProperties properties = new PushProperties();
        properties.setFcmBaseUrl(baseUrl);
        return new FcmClient(properties, objectMapper, HttpClient.newHttpClient(), credentials);
    }

    private FcmClient client() {
        return client("http://127.0.0.1:" + server.getAddress().getPort(), CREDENTIALS);
    }

    private static String error(int code, String fcmCode, String field) {
        String violations = field == null ? ""
                : ",{\"@type\":\"type.googleapis.com/google.rpc.BadRequest\",\"fieldViolations\":[{\"field\":\"" + field + "\"}]}";
        return "{\"error\":{\"code\":" + code + ",\"details\":[{\"@type\":\"type.googleapis.com/google.firebase.fcm.v1.FcmError\","
                + "\"errorCode\":\"" + fcmCode + "\"}" + violations + "]}}";
    }

    @Test
    void sendsOneDataMessageToTheProjectAtHighPriority() throws Exception {
        FcmResult result = client().send("phone-token", Map.of("type", "TEST", "link", "#phones"), true);

        assertThat(result).isEqualTo(FcmResult.SENT);
        assertThat(path.get()).isEqualTo("/v1/projects/storywall-admin/messages:send");
        assertThat(authorization.get()).isEqualTo("Bearer token-1");
        JsonNode message = objectMapper.readTree(body.get()).path("message");
        assertThat(message.path("token").asText()).isEqualTo("phone-token");
        assertThat(message.path("data").path("type").asText()).isEqualTo("TEST");
        assertThat(message.path("data").path("link").asText()).isEqualTo("#phones");
        assertThat(message.path("android").path("priority").asText()).isEqualTo("HIGH");
        assertThat(message.path("android").path("ttl").asText()).isEqualTo("86400s");
        // Data only: the app writes the text in the phone's language.
        assertThat(message.has("notification")).isFalse();
    }

    @Test
    void aNotUrgentMessageGoesAtNormalPriority() throws Exception {
        client().send("phone-token", Map.of("type", "DAILY_DIGEST"), false);

        assertThat(objectMapper.readTree(body.get()).path("message").path("android").path("priority").asText())
                .isEqualTo("NORMAL");
    }

    @ParameterizedTest
    @CsvSource({"404,UNREGISTERED,", "403,SENDER_ID_MISMATCH,", "400,INVALID_ARGUMENT,message.token"})
    void aTokenFirebaseNoLongerAcceptsIsDead(int code, String fcmCode, String field) {
        status = code;
        answer = error(code, fcmCode, field);

        assertThat(client().send("phone-token", Map.of(), true)).isEqualTo(FcmResult.DEAD_TOKEN);
    }

    @Test
    void aBadFieldOtherThanTheTokenIsOurBugNotADeadToken() {
        status = 400;
        answer = error(400, "INVALID_ARGUMENT", "message.data");

        assertThat(client().send("phone-token", Map.of(), true)).isEqualTo(FcmResult.FAILED);
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 429, 500, 503})
    void anyOtherAnswerIsAFailure(int code) {
        status = code;
        answer = "{\"error\":{\"code\":" + code + "}}";

        assertThat(client().send("phone-token", Map.of(), true)).isEqualTo(FcmResult.FAILED);
    }

    @Test
    void aBodyThatIsNotJsonIsAFailure() {
        status = 502;
        answer = "<html>Bad gateway</html>";

        assertThat(client().send("phone-token", Map.of(), true)).isEqualTo(FcmResult.FAILED);
    }

    @Test
    void noAnswerIsAFailure() {
        // Port 1 refuses connections.
        assertThat(client("http://127.0.0.1:1", CREDENTIALS).send("phone-token", Map.of(), true))
                .isEqualTo(FcmResult.FAILED);
    }

    @Test
    void credentialsThatCannotBeReadAreAFailure() {
        FcmCredentials broken = new FcmCredentials() {
            @Override
            public String projectId() {
                throw new IllegalArgumentException("Illegal base64 character 2d");
            }

            @Override
            public String accessToken() {
                return "token-1";
            }
        };

        assertThat(client("http://127.0.0.1:" + server.getAddress().getPort(), broken)
                .send("phone-token", Map.of(), true)).isEqualTo(FcmResult.FAILED);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.push.FcmClientTest"`
Expected: compilation fails, `FcmClient` not found.

- [ ] **Step 3: Write the four classes**

`FcmResult.java`:

```java
package event_social_media.service.push;

/** What Firebase said about one send. */
public enum FcmResult {
    SENT,
    /** Firebase no longer delivers to this token: the app was uninstalled, unpaired, or the token is from another project. */
    DEAD_TOKEN,
    /** Anything else: no answer, a timeout, bad credentials, a quota, a 5xx. Logged; never retried. */
    FAILED
}
```

`FcmCredentials.java`:

```java
package event_social_media.service.push;

/** The Firebase project and a current access token for its messaging API. */
interface FcmCredentials {

    String projectId();

    String accessToken();
}
```

`ServiceAccountFcmCredentials.java`:

```java
package event_social_media.service.push;

import com.google.auth.oauth2.ServiceAccountCredentials;
import event_social_media.config.PushProperties;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Base64;
import java.util.List;

/**
 * The Firebase service account from {@code app.push.service-account}, parsed on first use so an
 * environment with push off never touches it. As in Analytics' {@code ServiceAccountToken}: only a
 * service-account key is accepted, and the library refreshes the token before it expires.
 */
final class ServiceAccountFcmCredentials implements FcmCredentials {

    static final String SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

    private final PushProperties properties;
    private ServiceAccountCredentials credentials;

    ServiceAccountFcmCredentials(PushProperties properties) {
        this.properties = properties;
    }

    @Override
    public synchronized String projectId() {
        return load().getProjectId();
    }

    @Override
    public synchronized String accessToken() {
        try {
            ServiceAccountCredentials loaded = load();
            loaded.refreshIfExpired();
            return loaded.getAccessToken().getTokenValue();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private ServiceAccountCredentials load() {
        if (credentials == null) {
            byte[] json = Base64.getDecoder().decode(properties.getServiceAccount().strip());
            try {
                credentials = (ServiceAccountCredentials) ServiceAccountCredentials
                        .fromStream(new ByteArrayInputStream(json))
                        .createScoped(List.of(SCOPE));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
        return credentials;
    }
}
```

`FcmClient.java`:

```java
package event_social_media.service.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.config.PushProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Sends one data message to one phone through the FCM HTTP v1 API. Over {@link HttpClient} with the
 * Google auth library Spring already uses for Analytics, so the Firebase Admin SDK (and the Firestore
 * and gRPC clients it brings) is not pulled in. Never retries and never throws: the caller gets a
 * {@link FcmResult}. The token is never logged.
 */
@Component
public class FcmClient {

    private static final Logger log = LoggerFactory.getLogger(FcmClient.class);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);
    /** An alert a day late is noise: Firebase drops what it couldn't deliver by then. */
    private static final String TTL = "86400s";
    private static final int LOGGED_BODY_CHARS = 300;

    private final PushProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final FcmCredentials credentials;

    @Autowired
    public FcmClient(PushProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build(),
                new ServiceAccountFcmCredentials(properties));
    }

    FcmClient(PushProperties properties, ObjectMapper objectMapper, HttpClient httpClient, FcmCredentials credentials) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.credentials = credentials;
    }

    /** @param urgent high priority, which wakes a phone in Doze; the digest is not urgent */
    public FcmResult send(String token, Map<String, String> data, boolean urgent) {
        try {
            URI uri = URI.create(properties.getFcmBaseUrl() + "/v1/projects/" + credentials.projectId() + "/messages:send");
            Map<String, Object> message = Map.of("message", Map.of(
                    "token", token,
                    "data", data,
                    "android", Map.of("priority", urgent ? "HIGH" : "NORMAL", "ttl", TTL)));
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(READ_TIMEOUT)
                    .header("Authorization", "Bearer " + credentials.accessToken())
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(message)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 == 2) {
                return FcmResult.SENT;
            }
            if (isDeadToken(response.body())) {
                return FcmResult.DEAD_TOKEN;
            }
            // Firebase's error body names the problem; it never echoes the token or the credentials.
            log.warn("Firebase answered HTTP {}: {}", response.statusCode(), abbreviate(response.body()));
            return FcmResult.FAILED;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return FcmResult.FAILED;
        } catch (IOException | RuntimeException e) {
            log.warn("Could not send to Firebase: {}: {}", e.getClass().getSimpleName(), e.getMessage());
            return FcmResult.FAILED;
        }
    }

    /**
     * UNREGISTERED (the app deleted its token or was uninstalled), SENDER_ID_MISMATCH (a token from
     * another Firebase project), or INVALID_ARGUMENT on the token field itself. INVALID_ARGUMENT on any
     * other field is our bug, not the phone's, so it never clears a token.
     */
    private boolean isDeadToken(String body) {
        JsonNode error;
        try {
            error = objectMapper.readTree(body).path("error");
        } catch (IOException e) {
            return false;
        }
        String fcmCode = null;
        boolean onTheToken = false;
        for (JsonNode detail : error.path("details")) {
            if (detail.has("errorCode")) {
                fcmCode = detail.path("errorCode").asText();
            }
            for (JsonNode violation : detail.path("fieldViolations")) {
                if ("message.token".equals(violation.path("field").asText())) {
                    onTheToken = true;
                }
            }
        }
        return "UNREGISTERED".equals(fcmCode) || "SENDER_ID_MISMATCH".equals(fcmCode)
                || ("INVALID_ARGUMENT".equals(fcmCode) && onTheToken);
    }

    private static String abbreviate(String body) {
        if (body == null) return "";
        return body.length() <= LOGGED_BODY_CHARS ? body : body.substring(0, LOGGED_BODY_CHARS) + "…";
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.push.FcmClientTest"`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/push src/test/java/event_social_media/service/push/FcmClientTest.java
git commit -m "feat(push): send one FCM data message over the HTTP v1 API"
```

### Task A3: The alert event

**Files:**
- Create: `src/main/java/event_social_media/service/push/AdminAlertType.java`
- Create: `src/main/java/event_social_media/service/push/AdminAlert.java`
- Test: `src/test/java/event_social_media/service/push/AdminAlertTest.java`

The digest factory comes in Task A13, once `DailyDigest` exists.

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.push;

import event_social_media.model.audit.ReportTargetType;
import event_social_media.model.billing.OrderKind;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AdminAlertTest {

    @Test
    void thePayloadCarriesTheTypeAndTheConsoleSection() {
        assertThat(AdminAlert.orderPaid(18_900, "EUR", OrderKind.ACTIVATION, "Premium").payload()).isEqualTo(Map.of(
                "type", "ORDER_PAID", "link", "#orders",
                "amountMinor", "18900", "currency", "EUR", "kind", "ACTIVATION", "plan", "Premium"));
        assertThat(AdminAlert.bugReport().payload()).isEqualTo(Map.of("type", "BUG_REPORT", "link", "#bug-reports"));
        assertThat(AdminAlert.test().payload()).isEqualTo(Map.of("type", "TEST", "link", "#phones"));
    }

    @Test
    void anUnknownWithdrawalAmountIsLeftOutNotSentAsZero() {
        assertThat(AdminAlert.withdrawalHeld(null, "").payload())
                .isEqualTo(Map.of("type", "WITHDRAWAL_HELD", "link", "#withdrawals"));
        assertThat(AdminAlert.withdrawalHeld(4_500L, "EUR").payload())
                .containsEntry("amountMinor", "4500").containsEntry("currency", "EUR");
    }

    @Test
    void eachAlertNamesWhatItIsAbout() {
        assertThat(AdminAlert.webhookUnprocessed("STRIPE").payload())
                .containsEntry("provider", "STRIPE").containsEntry("link", "#billing-ops");
        assertThat(AdminAlert.reportCaseOpened(ReportTargetType.COMMENT).payload())
                .containsEntry("targetType", "COMMENT").containsEntry("link", "#reports");
        assertThat(AdminAlert.errorBurst(42, Duration.ofMinutes(60)).payload())
                .containsEntry("count", "42").containsEntry("windowMinutes", "60").containsEntry("link", "#errors");
    }

    @Test
    void onlyTheDigestIsNotUrgent() {
        for (AdminAlertType type : AdminAlertType.values()) {
            assertThat(type.urgent()).isEqualTo(type != AdminAlertType.DAILY_DIGEST);
        }
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.push.AdminAlertTest"`
Expected: compilation fails, `AdminAlert` not found.

- [ ] **Step 3: Write the two types**

`AdminAlertType.java`:

```java
package event_social_media.service.push;

/** Each push's admin console section and whether it goes at high priority. The app picks the channel from the type. */
public enum AdminAlertType {
    ORDER_PAID("#orders", true),
    WITHDRAWAL_HELD("#withdrawals", true),
    WEBHOOK_UNPROCESSED("#billing-ops", true),
    REPORT_CASE_OPENED("#reports", true),
    BUG_REPORT("#bug-reports", true),
    ERROR_BURST("#errors", true),
    DAILY_DIGEST("#metrics", false),
    TEST("#phones", true);

    private final String link;
    private final boolean urgent;

    AdminAlertType(String link, boolean urgent) {
        this.link = link;
        this.urgent = urgent;
    }

    public String link() {
        return link;
    }

    public boolean urgent() {
        return urgent;
    }
}
```

`AdminAlert.java`:

```java
package event_social_media.service.push;

import event_social_media.model.audit.ReportTargetType;
import event_social_media.model.billing.OrderKind;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One push to every paired admin phone. Published as an application event and sent by
 * {@link AdminAlertListener} after the publisher's transaction commits, on a background thread.
 * FCM data carries only strings; an unknown figure is left out, never sent as 0.
 */
public record AdminAlert(AdminAlertType type, Map<String, String> data) {

    public AdminAlert {
        data = Map.copyOf(data);
    }

    public static AdminAlert orderPaid(long amountMinor, String currency, OrderKind kind, String plan) {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("amountMinor", Long.toString(amountMinor));
        data.put("currency", currency);
        data.put("kind", kind.name());
        if (plan != null) data.put("plan", plan);
        return new AdminAlert(AdminAlertType.ORDER_PAID, data);
    }

    /** An event withdrawal with no single order has no currency to show; both fields are then left out. */
    public static AdminAlert withdrawalHeld(Long amountMinor, String currency) {
        Map<String, String> data = new LinkedHashMap<>();
        if (amountMinor != null && currency != null && !currency.isBlank()) {
            data.put("amountMinor", Long.toString(amountMinor));
            data.put("currency", currency);
        }
        return new AdminAlert(AdminAlertType.WITHDRAWAL_HELD, data);
    }

    public static AdminAlert webhookUnprocessed(String provider) {
        return new AdminAlert(AdminAlertType.WEBHOOK_UNPROCESSED, Map.of("provider", provider));
    }

    public static AdminAlert reportCaseOpened(ReportTargetType targetType) {
        return new AdminAlert(AdminAlertType.REPORT_CASE_OPENED, Map.of("targetType", targetType.name()));
    }

    public static AdminAlert bugReport() {
        return new AdminAlert(AdminAlertType.BUG_REPORT, Map.of());
    }

    public static AdminAlert errorBurst(long count, Duration window) {
        return new AdminAlert(AdminAlertType.ERROR_BURST,
                Map.of("count", Long.toString(count), "windowMinutes", Long.toString(window.toMinutes())));
    }

    public static AdminAlert test() {
        return new AdminAlert(AdminAlertType.TEST, Map.of());
    }

    /** The FCM data: the figures plus the type and the console section to open. */
    public Map<String, String> payload() {
        Map<String, String> payload = new LinkedHashMap<>(data);
        payload.put("type", type.name());
        payload.put("link", type.link());
        return payload;
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.push.AdminAlertTest"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/push/AdminAlertType.java src/main/java/event_social_media/service/push/AdminAlert.java src/test/java/event_social_media/service/push/AdminAlertTest.java
git commit -m "feat(push): the admin alert event and its FCM data"
```

### Task A4: Who gets pushes, and sending

**Files:**
- Modify: `src/main/java/event_social_media/repository/device/AdminDeviceRepository.java`
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java`
- Create: `src/main/java/event_social_media/exception/PushUnavailableException.java`
- Create: `src/main/java/event_social_media/service/push/AdminPushService.java`
- Test: `src/test/java/event_social_media/service/push/AdminPushServiceTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import event_social_media.dto.device.AdminDeviceRequestDto;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ProviderUnavailableException;
import event_social_media.exception.PushUnavailableException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.device.AdminDevice;
import event_social_media.model.user.AccountStatus;
import event_social_media.model.user.PlatformRole;
import event_social_media.model.user.User;
import event_social_media.repository.device.AdminDeviceRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.security.DevicePrincipal;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.device.AdminDeviceService;
import event_social_media.support.TestFixtures;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
class AdminPushServiceTest {

    @Autowired private AdminPushService service;
    @Autowired private AdminDeviceService deviceService;
    @Autowired private AdminDeviceRepository deviceRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PushProperties properties;
    @Autowired private TestFixtures fixtures;
    @PersistenceContext private EntityManager entityManager;
    @MockBean private FcmClient fcmClient;

    @BeforeEach
    void pushOn() {
        properties.setServiceAccount("on");
        when(fcmClient.send(anyString(), anyMap(), anyBoolean())).thenReturn(FcmResult.SENT);
    }

    @AfterEach
    void pushOff() {
        properties.setServiceAccount("");
    }

    /** A paired phone of {@code owner} that has sent {@code token}. */
    private UUID phone(User owner, String token) {
        UUID id = deviceService.create(new AdminDeviceRequestDto("Phone"), new AdminActor(owner.getId(), "127.0.0.1"))
                .device().id();
        if (token != null) deviceService.updatePushToken(new DevicePrincipal(id, owner.getId()), token);
        entityManager.flush();
        return id;
    }

    private String storedToken(UUID deviceId) {
        entityManager.flush();
        entityManager.clear();
        return deviceRepository.findById(deviceId).map(AdminDevice::getFcmToken).orElseThrow();
    }

    @Test
    void sendsOncePerTokenToLivePhonesOfActiveAdminsOnly() {
        User admin = fixtures.newAdmin();
        phone(admin, "t-twice");
        phone(admin, "t-twice");
        phone(fixtures.newAdmin(), "t-other-admin");
        phone(admin, null);

        UUID removed = phone(admin, "t-removed");
        deviceRepository.findById(removed).orElseThrow().setRevokedAt(OffsetDateTime.now());

        User demoted = fixtures.newAdmin();
        phone(demoted, "t-demoted");
        demoted.setPlatformRole(PlatformRole.USER);

        User suspended = fixtures.newAdmin();
        phone(suspended, "t-suspended");
        suspended.setStatus(AccountStatus.SUSPENDED);
        userRepository.saveAll(java.util.List.of(demoted, suspended));
        entityManager.flush();

        service.send(AdminAlert.bugReport());

        verify(fcmClient, times(1)).send(eq("t-twice"), eq(AdminAlert.bugReport().payload()), eq(true));
        verify(fcmClient, times(1)).send(eq("t-other-admin"), anyMap(), anyBoolean());
        verify(fcmClient, never()).send(eq("t-removed"), anyMap(), anyBoolean());
        verify(fcmClient, never()).send(eq("t-demoted"), anyMap(), anyBoolean());
        verify(fcmClient, never()).send(eq("t-suspended"), anyMap(), anyBoolean());
    }

    @Test
    void aDeadTokenIsClearedOnEveryRowThatHoldsIt() {
        User admin = fixtures.newAdmin();
        UUID first = phone(admin, "t-dead");
        UUID second = phone(admin, "t-dead");
        when(fcmClient.send(eq("t-dead"), anyMap(), anyBoolean())).thenReturn(FcmResult.DEAD_TOKEN);

        service.send(AdminAlert.bugReport());

        assertThat(storedToken(first)).isNull();
        assertThat(storedToken(second)).isNull();
    }

    @Test
    void nothingIsSentWhilePushIsOff() {
        phone(fixtures.newAdmin(), "t-1");
        properties.setServiceAccount("");

        service.send(AdminAlert.bugReport());

        verify(fcmClient, never()).send(anyString(), anyMap(), anyBoolean());
    }

    @Test
    void theTestGoesToThatOnePhoneOnly() {
        User admin = fixtures.newAdmin();
        UUID mine = phone(admin, "t-mine");
        phone(admin, "t-another");

        service.sendTest(mine, admin.getId());

        verify(fcmClient).send("t-mine", AdminAlert.test().payload(), true);
        verify(fcmClient, never()).send(eq("t-another"), anyMap(), anyBoolean());
    }

    @Test
    void anotherAdminsPhoneIsNotFound() {
        UUID theirs = phone(fixtures.newAdmin(), "t-theirs");

        assertThatThrownBy(() -> service.sendTest(theirs, fixtures.newAdmin().getId()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(fcmClient, never()).send(anyString(), anyMap(), anyBoolean());
    }

    @Test
    void aPhoneWithoutATokenHasNotificationsOff() {
        User admin = fixtures.newAdmin();
        UUID silent = phone(admin, null);

        assertThatThrownBy(() -> service.sendTest(silent, admin.getId()))
                .isInstanceOfSatisfying(ConflictException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PUSH_NOT_ENABLED));
    }

    @Test
    void aDeadTokenOnTheTestIsClearedAndReportedAsOff() {
        User admin = fixtures.newAdmin();
        UUID id = phone(admin, "t-dead");
        when(fcmClient.send(eq("t-dead"), anyMap(), anyBoolean())).thenReturn(FcmResult.DEAD_TOKEN);

        assertThatThrownBy(() -> service.sendTest(id, admin.getId()))
                .isInstanceOfSatisfying(ConflictException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PUSH_NOT_ENABLED));
        assertThat(storedToken(id)).isNull();
    }

    @Test
    void aFailedTestSaysFirebaseDidNotTakeIt() {
        User admin = fixtures.newAdmin();
        UUID id = phone(admin, "t-1");
        when(fcmClient.send(eq("t-1"), anyMap(), anyBoolean())).thenReturn(FcmResult.FAILED);

        assertThatThrownBy(() -> service.sendTest(id, admin.getId()))
                .isInstanceOfSatisfying(ProviderUnavailableException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PUSH_SEND_FAILED));
    }

    @Test
    void theTestSaysWhenPushIsOffOnTheServer() {
        User admin = fixtures.newAdmin();
        UUID id = phone(admin, "t-1");
        properties.setServiceAccount("");

        assertThatThrownBy(() -> service.sendTest(id, admin.getId())).isInstanceOf(PushUnavailableException.class);
    }
}
```

Check `ApiException`'s getter for the code before running (the step-1 tests read it as `getErrorCode()`); use the existing name if it differs.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.push.AdminPushServiceTest"`
Expected: compilation fails, `AdminPushService` not found.

- [ ] **Step 3: Add the error codes**

In `ErrorCode.java`, after `PRINT_LIST_EMPTY(5185),` (use the next free 5xxx number if staging has moved past 5185, and change it in Part B too):

```java
    /**
     * 5186 — {@code POST /api/admin/devices/{id}/test-notification}: the phone has no Firebase token,
     * so its notifications are off. Also when Firebase said the token is dead (it is then cleared).
     * {@code 409}.
     */
    PUSH_NOT_ENABLED(5186),
```

After `GOOGLE_ANALYTICS_UNAVAILABLE(9002);` change the `;` to `,` and add:

```java
    /** 9003 — Push notifications are not set up on this server ({@code FIREBASE_SERVICE_ACCOUNT} unset). {@code 503}. */
    PUSH_UNAVAILABLE(9003),

    /** 9004 — Firebase did not accept a test notification: unreachable, a quota, or bad credentials. {@code 502}. */
    PUSH_SEND_FAILED(9004);
```

`PushUnavailableException.java`:

```java
package event_social_media.exception;

import org.springframework.http.HttpStatus;

/** Push is off on this server: {@code FIREBASE_SERVICE_ACCOUNT} is not set. A {@code 503}. */
public class PushUnavailableException extends ApiException {

    public PushUnavailableException() {
        super("Push notifications are not set up on this server.", HttpStatus.SERVICE_UNAVAILABLE,
                ErrorCode.PUSH_UNAVAILABLE);
    }
}
```

- [ ] **Step 4: Add the repository queries**

In `AdminDeviceRepository.java` add these imports: `org.springframework.data.jpa.repository.Modifying`, `org.springframework.transaction.annotation.Transactional`, `java.time.OffsetDateTime`. Then the methods:

```java
    /**
     * Where pushes go: every token on a live phone whose owner is still an active admin, once. The same
     * token sits on two rows when a phone was paired again without removing the old pairing.
     */
    @Query("""
            select distinct d.fcmToken from AdminDevice d join d.owner o
            where d.revokedAt is null and d.fcmToken is not null
              and o.platformRole = event_social_media.model.user.PlatformRole.ADMIN
              and o.status = event_social_media.model.user.AccountStatus.ACTIVE""")
    List<String> findPushTokens();

    /** Firebase said this token is dead: off on every row that holds it. */
    @Modifying
    @Transactional
    @Query("update AdminDevice d set d.fcmToken = null where d.fcmToken = :token")
    int clearToken(@Param("token") String token);

    /**
     * Revokes every live phone of an account. Flushes first and keeps the persistence context: the
     * callers still hold the user they just changed.
     */
    @Modifying(flushAutomatically = true)
    @Query("update AdminDevice d set d.revokedAt = :now, d.fcmToken = null where d.owner.id = :ownerId and d.revokedAt is null")
    int revokeAllOwnedBy(@Param("ownerId") UUID ownerId, @Param("now") OffsetDateTime now);
```

- [ ] **Step 5: Write `AdminPushService`**

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ProviderUnavailableException;
import event_social_media.exception.PushUnavailableException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.device.AdminDevice;
import event_social_media.repository.device.AdminDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Pushes to paired admin phones (spec 2026-10-28-admin-phone-widget-design, storywall repo). Sends to
 * every phone that has a token, isn't removed, and whose owner is still an active admin, once per
 * token. Nothing at all while {@link PushProperties#isEnabled()} is false. Synchronous: triggers
 * reach it through {@link AdminAlertListener}, after commit and off the request thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPushService {

    private final PushProperties properties;
    private final AdminDeviceRepository deviceRepository;
    private final FcmClient fcmClient;

    public void send(AdminAlert alert) {
        if (!properties.isEnabled()) return;
        List<String> tokens;
        try {
            tokens = deviceRepository.findPushTokens();
        } catch (RuntimeException e) {
            log.error("Admin push {}: could not load the phones", alert.type(), e);
            return;
        }
        int sent = 0;
        for (String token : tokens) {
            if (deliver(token, alert) == FcmResult.SENT) sent++;
        }
        log.info("Admin push {} sent to {} of {} phone(s)", alert.type(), sent, tokens.size());
    }

    /**
     * The console's test button: one push to one of the caller's own phones, right away, so the console
     * can say whether it went.
     *
     * @throws ResourceNotFoundException    unknown, removed, or another admin's phone
     * @throws PushUnavailableException     push is off on this server
     * @throws ConflictException            {@link ErrorCode#PUSH_NOT_ENABLED}: no token, or Firebase says it is dead
     * @throws ProviderUnavailableException {@link ErrorCode#PUSH_SEND_FAILED}: Firebase didn't accept it
     */
    public void sendTest(UUID deviceId, UUID ownerId) {
        AdminDevice device = deviceRepository.findByIdAndOwner_IdAndRevokedAtIsNull(deviceId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("AdminDevice", deviceId));
        if (!properties.isEnabled()) throw new PushUnavailableException();
        if (device.getFcmToken() == null) throw pushNotEnabled();
        switch (deliver(device.getFcmToken(), AdminAlert.test())) {
            case SENT -> log.info("Admin push TEST sent to device {}", deviceId);
            case DEAD_TOKEN -> throw pushNotEnabled();
            case FAILED -> throw new ProviderUnavailableException(ErrorCode.PUSH_SEND_FAILED,
                    "Firebase did not accept the notification.");
        }
    }

    /** One send. A dead token is cleared on every row that holds it, which turns the console's Notifications to Off. */
    private FcmResult deliver(String token, AdminAlert alert) {
        FcmResult result = fcmClient.send(token, alert.payload(), alert.type().urgent());
        if (result == FcmResult.DEAD_TOKEN) {
            int cleared = deviceRepository.clearToken(token);
            log.info("Admin push {}: Firebase no longer accepts a phone's token; cleared on {} device(s)",
                    alert.type(), cleared);
        }
        return result;
    }

    private static ConflictException pushNotEnabled() {
        return new ConflictException(ErrorCode.PUSH_NOT_ENABLED, "This phone's notifications are off.");
    }
}
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.service.push.AdminPushServiceTest"`
Expected: PASS, 9 tests.

- [ ] **Step 7: Commit**

```bash
git add -A src/main/java/event_social_media src/test/java/event_social_media/service/push/AdminPushServiceTest.java
git commit -m "feat(push): send to live phones of active admins, once per token"
```

### Task A5: Sending after commit, off the request thread

**Files:**
- Create: `src/main/java/event_social_media/service/push/AdminAlertListener.java`
- Test: `src/test/java/event_social_media/service/push/AdminAlertListenerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.push;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.support.TransactionTemplate;

import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

/** Not {@code @Transactional}: it needs real commits and rollbacks. It writes nothing to the database. */
@SpringBootTest
class AdminAlertListenerTest {

    @Autowired private ApplicationEventPublisher publisher;
    @Autowired private TransactionTemplate transactionTemplate;
    @MockBean private AdminPushService pushService;

    @Test
    void anAlertOutsideATransactionIsSentRightAway() {
        AdminAlert alert = AdminAlert.bugReport();

        publisher.publishEvent(alert);

        verify(pushService, timeout(2_000)).send(alert);
    }

    @Test
    void anAlertIsSentOnlyOnceItsTransactionCommits() {
        AdminAlert alert = AdminAlert.webhookUnprocessed("STRIPE");

        transactionTemplate.executeWithoutResult(status -> publisher.publishEvent(alert));

        verify(pushService, timeout(2_000)).send(alert);
    }

    @Test
    void anAlertWhoseTransactionRollsBackIsNeverSent() {
        AdminAlert alert = AdminAlert.errorBurst(10, java.time.Duration.ofMinutes(60));

        transactionTemplate.executeWithoutResult(status -> {
            publisher.publishEvent(alert);
            status.setRollbackOnly();
        });

        verify(pushService, after(500).never()).send(alert);
    }
}
```

If no `TransactionTemplate` bean exists, build one in the test from the autowired `PlatformTransactionManager`: `new TransactionTemplate(transactionManager)`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.push.AdminAlertListenerTest"`
Expected: FAIL, `Wanted but not invoked: pushService.send(...)` in the first two tests.

- [ ] **Step 3: Write the listener**

```java
package event_social_media.service.push;

import event_social_media.config.AsyncConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends each {@link AdminAlert} once the transaction that published it commits, on the shared async
 * executor, so a slow or failing Firebase never holds up or rolls back the action that caused it. An
 * alert published outside any transaction (a controller, a scheduled job) is sent right away.
 */
@Component
@RequiredArgsConstructor
public class AdminAlertListener {

    private final AdminPushService pushService;

    @Async(AsyncConfig.ASYNC_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAlert(AdminAlert alert) {
        pushService.send(alert);
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.push.AdminAlertListenerTest"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/push/AdminAlertListener.java src/test/java/event_social_media/service/push/AdminAlertListenerTest.java
git commit -m "feat(push): send alerts after commit on the async executor"
```

### Task A6: Test notification endpoint

**Files:**
- Modify: `src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java`
- Test: `src/test/java/event_social_media/controller/device/AdminDeviceTestNotificationTest.java`

- [ ] **Step 1: Write the failing test**

Same `@MockBean AdminPushService` as Task A5, so both share one Spring context.

```java
package event_social_media.controller.device;

import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ProviderUnavailableException;
import event_social_media.exception.PushUnavailableException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.service.push.AdminPushService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminDeviceTestNotificationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @MockBean private AdminPushService pushService;

    private UUID adminId;
    private UsernamePasswordAuthenticationToken admin;
    private final UUID deviceId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        adminId = fixtures.newAdmin().getId();
        admin = new UsernamePasswordAuthenticationToken(adminId.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private org.springframework.test.web.servlet.ResultActions sendTest() throws Exception {
        return mockMvc.perform(post("/api/admin/devices/{id}/test-notification", deviceId).with(authentication(admin)));
    }

    @Test
    void sendsTheTestToTheCallersPhone() throws Exception {
        sendTest().andExpect(status().isNoContent());
        verify(pushService).sendTest(deviceId, adminId);
    }

    @Test
    void eachRefusalHasItsOwnStatusAndCode() throws Exception {
        doThrow(new ResourceNotFoundException("AdminDevice", deviceId)).when(pushService).sendTest(deviceId, adminId);
        sendTest().andExpect(status().isNotFound());

        doThrow(new ConflictException(ErrorCode.PUSH_NOT_ENABLED, "off")).when(pushService).sendTest(deviceId, adminId);
        sendTest().andExpect(status().isConflict()).andExpect(jsonPath("$.errorCode").value(5186));

        doThrow(new PushUnavailableException()).when(pushService).sendTest(deviceId, adminId);
        sendTest().andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.errorCode").value(9003));

        doThrow(new ProviderUnavailableException(ErrorCode.PUSH_SEND_FAILED, "x")).when(pushService).sendTest(deviceId, adminId);
        sendTest().andExpect(status().isBadGateway()).andExpect(jsonPath("$.errorCode").value(9004));
    }

    @Test
    void aNonAdminIsRefused() throws Exception {
        UsernamePasswordAuthenticationToken user = new UsernamePasswordAuthenticationToken(
                fixtures.newUser().getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(post("/api/admin/devices/{id}/test-notification", deviceId).with(authentication(user)))
                .andExpect(status().isForbidden());
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.device.AdminDeviceTestNotificationTest"`
Expected: FAIL, the first test gets 404 or 405 instead of 204.

- [ ] **Step 3: Add the endpoint**

In `AdminDeviceAdminController.java`, add the field `private final AdminPushService adminPushService;` (import `event_social_media.service.push.AdminPushService`) and, after `revoke`:

```java
    /** One test push to this phone only. 409 when its notifications are off, 503 when push is off here. */
    @PostMapping("/{id}/test-notification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RateLimit(name = "admin.devices.test-notification", limit = 10, windowSeconds = 60)
    public void sendTestNotification(@PathVariable UUID id, Authentication authentication) {
        adminPushService.sendTest(id, userId(authentication));
    }
```

- [ ] **Step 4: Run the test and the step-1 controller tests**

Run: `./gradlew test --tests "event_social_media.controller.device.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java src/test/java/event_social_media/controller/device/AdminDeviceTestNotificationTest.java
git commit -m "feat(push): POST /api/admin/devices/{id}/test-notification"
```

### Task A7: ORDER_PAID

**Files:**
- Create: `src/main/java/event_social_media/service/push/OrderPaidAlerts.java`
- Test: `src/test/java/event_social_media/service/push/OrderPaidAlertsTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import event_social_media.model.billing.EventOrder;
import event_social_media.model.billing.OrderKind;
import event_social_media.model.platform.PlanTier;
import event_social_media.model.user.User;
import event_social_media.repository.billing.EventOrderRepository;
import event_social_media.service.billing.OrderPaidEvent;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OrderPaidAlertsTest {

    private final PushProperties properties = new PushProperties();
    private final EventOrderRepository orders = mock(EventOrderRepository.class);
    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    private final OrderPaidAlerts alerts = new OrderPaidAlerts(properties, orders, publisher);

    private static EventOrder order(long amountMinor, User settledBy) {
        PlanTier plan = new PlanTier();
        plan.setName("Premium");
        EventOrder order = new EventOrder();
        order.setId(UUID.randomUUID());
        order.setAmountMinor(amountMinor);
        order.setCurrency("EUR");
        order.setKind(OrderKind.ACTIVATION);
        order.setPlanTier(plan);
        order.setSettledBy(settledBy);
        return order;
    }

    @Test
    void aProviderPaidOrderAboveZeroIsAnAlert() {
        assertThat(OrderPaidAlerts.alertFor(order(18_900, null)))
                .contains(AdminAlert.orderPaid(18_900, "EUR", OrderKind.ACTIVATION, "Premium"));
    }

    @Test
    void anAdminSettledOrFreeOrderIsNot() {
        assertThat(OrderPaidAlerts.alertFor(order(18_900, new User()))).isEmpty();
        assertThat(OrderPaidAlerts.alertFor(order(0, null))).isEmpty();
    }

    @Test
    void theOrderIsLoadedAndPublishedWhilePushIsOn() {
        properties.setServiceAccount("on");
        EventOrder paid = order(18_900, null);
        when(orders.findById(paid.getId())).thenReturn(Optional.of(paid));

        alerts.onOrderPaid(new OrderPaidEvent(paid.getId()));

        verify(publisher).publishEvent(AdminAlert.orderPaid(18_900, "EUR", OrderKind.ACTIVATION, "Premium"));
    }

    @Test
    void pushOffReadsNothing() {
        alerts.onOrderPaid(new OrderPaidEvent(UUID.randomUUID()));

        verifyNoInteractions(orders);
        verify(publisher, never()).publishEvent(any());
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.push.OrderPaidAlertsTest"`
Expected: compilation fails, `OrderPaidAlerts` not found.

- [ ] **Step 3: Write the listener**

```java
package event_social_media.service.push;

import event_social_media.config.AsyncConfig;
import event_social_media.config.PushProperties;
import event_social_media.model.billing.EventOrder;
import event_social_media.repository.billing.EventOrderRepository;
import event_social_media.service.billing.OrderPaidEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Optional;

/**
 * ORDER_PAID for the orders the phone summary counts: paid through a provider (only those publish
 * {@link OrderPaidEvent}), not settled by an admin, above 0. After the settlement commits, on the async
 * executor; the read-only transaction is for the order's plan.
 */
@Component
@RequiredArgsConstructor
public class OrderPaidAlerts {

    private final PushProperties properties;
    private final EventOrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Async(AsyncConfig.ASYNC_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onOrderPaid(OrderPaidEvent event) {
        if (!properties.isEnabled()) return;
        orderRepository.findById(event.orderId())
                .flatMap(OrderPaidAlerts::alertFor)
                .ifPresent(eventPublisher::publishEvent);
    }

    static Optional<AdminAlert> alertFor(EventOrder order) {
        if (order.getSettledBy() != null || order.getAmountMinor() == null || order.getAmountMinor() <= 0) {
            return Optional.empty();
        }
        return Optional.of(AdminAlert.orderPaid(order.getAmountMinor(), order.getCurrency(), order.getKind(),
                order.getPlanTier().getName()));
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.push.OrderPaidAlertsTest"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/push/OrderPaidAlerts.java src/test/java/event_social_media/service/push/OrderPaidAlertsTest.java
git commit -m "feat(push): ORDER_PAID for provider-paid orders above 0"
```

### Task A8: WITHDRAWAL_HELD

**Files:**
- Modify: `src/main/java/event_social_media/service/billing/withdrawal/WithdrawalNotifier.java`
- Modify: `src/test/java/event_social_media/service/billing/withdrawal/WithdrawalNotifierTest.java`

- [ ] **Step 1: Update the test's constructor and add the test**

In `WithdrawalNotifierTest.java`, add a field and change the notifier:

```java
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final WithdrawalNotifier notifier = new WithdrawalNotifier(emitter, new BillingProperties(), eventPublisher);
```

Add the test, building the held request the way the file's existing `held` test does (copy its request setup; it sets the event, `holdUntil`, the order and `totalRefundMinor`):

```java
    @Test
    void aHeldWithdrawalAlertsTheAdmins() {
        RefundRequest request = heldRequest();   // the existing held test's setup, extracted into a helper

        notifier.held(request);

        verify(eventPublisher).publishEvent(AdminAlert.withdrawalHeld(request.getTotalRefundMinor(),
                request.getOrder().getCurrency()));
    }

    @Test
    void aRefundedWithdrawalDoesNot() {
        notifier.refunded(heldRequest());

        verify(eventPublisher, never()).publishEvent(any(AdminAlert.class));
    }
```

When extracting `heldRequest()`, move the existing held test's request-building lines into it unchanged and call it from that test too.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.billing.withdrawal.WithdrawalNotifierTest"`
Expected: compilation fails on the three-argument constructor.

- [ ] **Step 3: Publish the alert**

In `WithdrawalNotifier.java` add `private final ApplicationEventPublisher eventPublisher;` after `billingProperties` (import `org.springframework.context.ApplicationEventPublisher` and `event_social_media.service.push.AdminAlert`). At the end of `held(...)`, after `emit(...)`:

```java
        // The admins' phones, after commit like the host's notice (AdminAlertListener).
        eventPublisher.publishEvent(AdminAlert.withdrawalHeld(request.getTotalRefundMinor(), currency(request)));
```

- [ ] **Step 4: Run the withdrawal tests**

Run: `./gradlew test --tests "event_social_media.service.billing.withdrawal.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/billing/withdrawal/WithdrawalNotifier.java src/test/java/event_social_media/service/billing/withdrawal/WithdrawalNotifierTest.java
git commit -m "feat(push): WITHDRAWAL_HELD when a withdrawal is held for review"
```

### Task A9: WEBHOOK_UNPROCESSED

**Files:**
- Modify: `src/main/java/event_social_media/controller/billing/PaymentWebhookController.java`
- Test: `src/test/java/event_social_media/controller/billing/PaymentWebhookControllerAlertTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.billing;

import event_social_media.service.billing.PaymentProvider;
import event_social_media.service.billing.PaymentProviderRegistry;
import event_social_media.service.billing.ProviderEvent;
import event_social_media.service.billing.ProviderEventType;
import event_social_media.service.billing.WebhookDispatcher;
import event_social_media.service.billing.WebhookLedger;
import event_social_media.service.push.AdminAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentWebhookControllerAlertTest {

    private final PaymentProviderRegistry registry = mock(PaymentProviderRegistry.class);
    private final WebhookLedger ledger = mock(WebhookLedger.class);
    private final WebhookDispatcher dispatcher = mock(WebhookDispatcher.class);
    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    private final PaymentProvider provider = mock(PaymentProvider.class);
    private final PaymentWebhookController controller =
            new PaymentWebhookController(registry, ledger, dispatcher, publisher);
    private final ProviderEvent event = new ProviderEvent("evt_1", ProviderEventType.PAYMENT_SUCCEEDED,
            "payment.succeeded", UUID.randomUUID(), "pi_1");

    @BeforeEach
    void setUp() {
        when(registry.require("stripe")).thenReturn(provider);
        when(provider.providerKey()).thenReturn("STRIPE");
        when(provider.signatureHeader()).thenReturn("Stripe-Signature");
        when(provider.verifyAndParse(anyString(), any())).thenReturn(event);
        when(ledger.claim(anyString(), anyString(), anyString(), anyString(), any())).thenReturn(true);
    }

    @Test
    void aDeliveryLeftUnprocessedAlertsTheAdmins() {
        doThrow(new IllegalStateException("handler bug")).when(dispatcher).dispatch(provider, event);

        assertThat(controller.receive("stripe", "{}", new MockHttpServletRequest()).getStatusCode().value()).isEqualTo(200);

        verify(publisher).publishEvent(AdminAlert.webhookUnprocessed("STRIPE"));
    }

    @Test
    void aProcessedDeliveryDoesNot() {
        controller.receive("stripe", "{}", new MockHttpServletRequest());

        verify(publisher, never()).publishEvent(any(AdminAlert.class));
    }
}
```

Match the mocks to the real signatures of `PaymentProvider.signatureHeader()` and `WebhookLedger.claim(...)` if they differ (five arguments: provider key, event id, raw type, body, signature).

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.billing.PaymentWebhookControllerAlertTest"`
Expected: compilation fails on the four-argument constructor.

- [ ] **Step 3: Publish the alert**

In `PaymentWebhookController.java` add `private final ApplicationEventPublisher eventPublisher;` after `webhookDispatcher` (imports `org.springframework.context.ApplicationEventPublisher`, `event_social_media.service.push.AdminAlert`). In `receive`, right after the `log.error("Webhook {}/{} ({}) failed to process", ...)` call and before `return ResponseEntity.ok().build();`:

```java
            // The webhooks screen shows it as unprocessed; the admins' phones hear about it now.
            eventPublisher.publishEvent(AdminAlert.webhookUnprocessed(provider.providerKey()));
```

- [ ] **Step 4: Run the webhook tests**

Run: `./gradlew test --tests "event_social_media.controller.billing.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/controller/billing/PaymentWebhookController.java src/test/java/event_social_media/controller/billing/PaymentWebhookControllerAlertTest.java
git commit -m "feat(push): WEBHOOK_UNPROCESSED when a delivery is left unprocessed"
```

### Task A10: REPORT_CASE_OPENED

**Files:**
- Modify: `src/main/java/event_social_media/repository/audit/ReportRepository.java`
- Modify: `src/main/java/event_social_media/service/audit/ReportService.java`
- Modify: `src/test/java/event_social_media/service/audit/ReportServiceTest.java`

- [ ] **Step 1: Write the failing tests**

In `ReportServiceTest.java` add `@Mock private ApplicationEventPublisher eventPublisher;` next to the other mocks (import `org.springframework.context.ApplicationEventPublisher`, `event_social_media.service.push.AdminAlert`), and:

```java
    @Test
    void theReportThatOpensAnItemAlertsTheAdmins() {
        UUID targetId = UUID.randomUUID();
        targetExists(ReportTargetType.COMMENT, targetId, UUID.randomUUID());
        when(reportRepository.existsByTargetTypeAndTargetIdAndStatus(ReportTargetType.COMMENT, targetId, "OPEN"))
                .thenReturn(false);

        reportService.create(dto(ReportTargetType.COMMENT, targetId), callerUserId);

        verify(eventPublisher).publishEvent(AdminAlert.reportCaseOpened(ReportTargetType.COMMENT));
    }

    @Test
    void anotherReportOnAnItemAlreadyOpenSendsNothing() {
        UUID targetId = UUID.randomUUID();
        targetExists(ReportTargetType.POST, targetId, UUID.randomUUID());
        when(reportRepository.existsByTargetTypeAndTargetIdAndStatus(ReportTargetType.POST, targetId, "OPEN"))
                .thenReturn(true);

        reportService.create(dto(ReportTargetType.POST, targetId), callerUserId);

        verify(eventPublisher, never()).publishEvent(any(AdminAlert.class));
    }

    @Test
    void aRepeatThatJoinsTheCallersOwnReportSendsNothing() {
        UUID targetId = UUID.randomUUID();
        targetExists(ReportTargetType.POST, targetId, UUID.randomUUID());
        when(reportRepository.findFirstByReporterMember_IdAndTargetTypeAndTargetIdAndStatusIn(any(), any(), any(), anyCollection()))
                .thenReturn(Optional.of(new Report()));

        reportService.create(dto(ReportTargetType.POST, targetId), callerUserId);

        verify(eventPublisher, never()).publishEvent(any(AdminAlert.class));
    }
```

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.audit.ReportServiceTest"`
Expected: compilation fails, `existsByTargetTypeAndTargetIdAndStatus` not found.

- [ ] **Step 3: Add the finder**

In `ReportRepository.java`:

```java
    /** Whether the item already has an open report: the phone's "open reports" counts it already. */
    boolean existsByTargetTypeAndTargetIdAndStatus(ReportTargetType targetType, UUID targetId, String status);
```

- [ ] **Step 4: Publish the alert**

In `ReportService.java` add `private final ApplicationEventPublisher eventPublisher;` after `demoEventGuard` (imports as above). In `create`, right after the `findOpen(...)` early return and before `Report report = new Report();`:

```java
        // Checked before the insert: two first reports racing can both alert, which beats neither.
        boolean opensTheItem = !reportRepository.existsByTargetTypeAndTargetIdAndStatus(
                dto.getTargetType(), dto.getTargetId(), "OPEN");
```

And right after `log.info("Report filed. ...")`, before the last `return`:

```java
        if (opensTheItem) {
            eventPublisher.publishEvent(AdminAlert.reportCaseOpened(dto.getTargetType()));
        }
```

- [ ] **Step 5: Run the report tests**

Run: `./gradlew test --tests "event_social_media.service.audit.*"`
Expected: PASS, including `ReportServiceIntegrationTest`.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/repository/audit/ReportRepository.java src/main/java/event_social_media/service/audit/ReportService.java src/test/java/event_social_media/service/audit/ReportServiceTest.java
git commit -m "feat(push): REPORT_CASE_OPENED when a report opens its item"
```

### Task A11: BUG_REPORT

**Files:**
- Modify: `src/main/java/event_social_media/service/feedback/BugReportService.java`
- Modify: `src/test/java/event_social_media/service/feedback/BugReportServiceTest.java`

- [ ] **Step 1: Update the test**

In `BugReportServiceTest.java` add the field `private ApplicationEventPublisher eventPublisher;`, set it in `setUp` with `eventPublisher = mock(ApplicationEventPublisher.class);`, and pass it last: `new BugReportService(repository, store, mock(StorageService.class), properties, new ObjectMapper().findAndRegisterModules(), eventPublisher)`. Add:

```java
    @Test
    void aSavedBugReportAlertsTheAdmins() throws Exception {
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0, BugReport.class));

        service.create(dto(), null, UUID.randomUUID(), PlatformRole.USER, null);

        verify(eventPublisher).publishEvent(AdminAlert.bugReport());
    }

    @Test
    void aBugReportThatFailsToSaveDoesNot() {
        when(repository.saveAndFlush(any())).thenThrow(new IllegalStateException("db down"));

        assertThrows(IllegalStateException.class,
                () -> service.create(dto(), null, UUID.randomUUID(), PlatformRole.USER, null));
        verify(eventPublisher, never()).publishEvent(any(AdminAlert.class));
    }
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.feedback.BugReportServiceTest"`
Expected: compilation fails on the six-argument constructor.

- [ ] **Step 3: Publish the alert**

In `BugReportService.java` add `private final ApplicationEventPublisher eventPublisher;` after `objectMapper`. After the `log.info("Bug report {} submitted by ...")` line:

```java
        // create() runs outside any transaction, so the listener sends this right away, off this thread.
        eventPublisher.publishEvent(AdminAlert.bugReport());
```

- [ ] **Step 4: Run the feedback tests**

Run: `./gradlew test --tests "event_social_media.service.feedback.*" --tests "event_social_media.controller.feedback.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/feedback/BugReportService.java src/test/java/event_social_media/service/feedback/BugReportServiceTest.java
git commit -m "feat(push): BUG_REPORT for each new bug report"
```

### Task A12: ERROR_BURST

**Files:**
- Create: `src/main/java/event_social_media/service/push/ErrorBurstCounter.java`
- Create: `src/main/java/event_social_media/service/push/ErrorBurstJob.java`
- Modify: `src/main/java/event_social_media/service/feedback/ErrorEventRecorder.java`
- Modify: `src/test/java/event_social_media/service/feedback/ErrorEventRecorderFailureTest.java` (constructor only)
- Test: `src/test/java/event_social_media/service/push/ErrorBurstCounterTest.java`
- Test: `src/test/java/event_social_media/service/push/ErrorBurstJobTest.java`
- Test: `src/test/java/event_social_media/service/feedback/ErrorEventRecorderBurstTest.java`

- [ ] **Step 1: Write the counter test**

```java
package event_social_media.service.push;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorBurstCounterTest {

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-29T10:00:30Z"));
    private final ErrorBurstCounter counter = new ErrorBurstCounter(new Clock() {
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    });

    @Test
    void countsEveryOccurrenceWithinTheWindow() {
        for (int i = 0; i < 7; i++) counter.record();
        now.set(now.get().plus(Duration.ofMinutes(30)));
        for (int i = 0; i < 3; i++) counter.record();

        assertThat(counter.countWithin(Duration.ofMinutes(60))).isEqualTo(10);
        assertThat(counter.countWithin(Duration.ofMinutes(10))).isEqualTo(3);
    }

    @Test
    void anOccurrenceOlderThanTheWindowNoLongerCounts() {
        counter.record();
        now.set(now.get().plus(Duration.ofMinutes(60)));

        assertThat(counter.countWithin(Duration.ofMinutes(60))).isZero();
    }

    @Test
    void aSlotReusedADayLaterStartsAgain() {
        counter.record();
        now.set(now.get().plus(Duration.ofDays(1)));
        counter.record();

        assertThat(counter.countWithin(Duration.ofMinutes(60))).isEqualTo(1);
    }
}
```

- [ ] **Step 2: Write the job test**

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ErrorBurstJobTest {

    private static final Instant NOON = Instant.parse("2026-10-29T12:00:00Z");

    private final PushProperties properties = new PushProperties();
    private final ErrorBurstCounter counter = mock(ErrorBurstCounter.class);
    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    private final ErrorBurstJob job = new ErrorBurstJob(properties, counter, publisher);

    @BeforeEach
    void setUp() {
        properties.setServiceAccount("on");
        job.setClock(Clock.fixed(NOON, ZoneOffset.UTC));
    }

    @Test
    void tenInTheHourSendsOneAlert() {
        when(counter.countWithin(Duration.ofMinutes(60))).thenReturn(10L);

        job.check();

        verify(publisher).publishEvent(AdminAlert.errorBurst(10, Duration.ofMinutes(60)));
    }

    @Test
    void nineSendsNothing() {
        when(counter.countWithin(Duration.ofMinutes(60))).thenReturn(9L);

        job.check();

        verify(publisher, never()).publishEvent(any());
    }

    @Test
    void afterAnAlertItStaysQuietForTheQuietTime() {
        when(counter.countWithin(Duration.ofMinutes(60))).thenReturn(50L);
        job.check();

        job.setClock(Clock.fixed(NOON.plus(Duration.ofMinutes(55)), ZoneOffset.UTC));
        job.check();
        verify(publisher, times(1)).publishEvent(any());

        job.setClock(Clock.fixed(NOON.plus(Duration.ofMinutes(60)), ZoneOffset.UTC));
        job.check();
        verify(publisher, times(2)).publishEvent(any());
    }

    @Test
    void pushOffChecksNothing() {
        properties.setServiceAccount("");

        job.check();

        verify(counter, never()).countWithin(any());
    }
}
```

- [ ] **Step 3: Write the recorder test**

```java
package event_social_media.service.feedback;

import event_social_media.config.ErrorTrackingProperties;
import event_social_media.repository.feedback.ErrorEventRepository;
import event_social_media.service.push.ErrorBurstCounter;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ErrorEventRecorderBurstTest {

    private final ErrorBurstCounter counter = new ErrorBurstCounter();

    private ErrorEventRecorder recorder(ErrorEventRepository repository) {
        PlatformTransactionManager tx = mock(PlatformTransactionManager.class);
        when(tx.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        ErrorTrackingProperties properties = new ErrorTrackingProperties();
        properties.setEnabled(true);
        return new ErrorEventRecorder(repository, properties, tx, mock(EntityManagerFactory.class), counter);
    }

    @Test
    void everyFailureCountsAndA4xxRejectionDoesNot() {
        ErrorEventRepository repository = mock(ErrorEventRepository.class);
        when(repository.recordRepeat(any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(1);
        ErrorEventRecorder recorder = recorder(repository);

        recorder.recordRequestFailure(new RuntimeException("x"), 500, "GET", "/a", null);
        recorder.recordRequestFailure(new RuntimeException("x"), 500, "GET", "/a", null);
        recorder.recordRequestRejection(503, "RESOURCE_BUSY", "busy", "GET", "/a", null);
        recorder.recordRequestRejection(400, "VALIDATION_FAILED", "bad", "POST", "/b", null);
        recorder.recordBackgroundFailure(new IllegalStateException("job"), "SCHEDULED", "Job.run");

        assertThat(counter.countWithin(Duration.ofMinutes(60))).isEqualTo(4);
    }

    @Test
    void aFailureCountsEvenWhenItsRowCannotBeWritten() {
        ErrorEventRepository repository = mock(ErrorEventRepository.class);
        when(repository.recordRepeat(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new IllegalStateException("db down"));

        recorder(repository).recordRequestFailure(new RuntimeException("x"), 500, "GET", "/a", null);

        assertThat(counter.countWithin(Duration.ofMinutes(60))).isEqualTo(1);
    }
}
```

- [ ] **Step 4: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.push.ErrorBurst*" --tests "event_social_media.service.feedback.ErrorEventRecorderBurstTest"`
Expected: compilation fails, `ErrorBurstCounter` not found.

- [ ] **Step 5: Write the counter**

```java
package event_social_media.service.push;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;

/**
 * Error occurrences per minute, in memory, for the ERROR_BURST push. Every repeat counts, unlike the
 * Errors screen, which counts each distinct error once; 4xx rejections are never counted (the
 * recorder leaves them out). A restart starts from zero. Keeps one day of minutes, the longest window
 * {@code app.push.error-burst.window} may be.
 */
@Component
public class ErrorBurstCounter {

    static final int MINUTES = 24 * 60;

    private final long[] minuteOf = new long[MINUTES];
    private final long[] counts = new long[MINUTES];
    private final Clock clock;

    public ErrorBurstCounter() {
        this(Clock.systemUTC());
    }

    ErrorBurstCounter(Clock clock) {
        this.clock = clock;
        Arrays.fill(minuteOf, -1);
    }

    public synchronized void record() {
        long minute = currentMinute();
        int slot = (int) (minute % MINUTES);
        if (minuteOf[slot] != minute) {
            minuteOf[slot] = minute;
            counts[slot] = 0;
        }
        counts[slot]++;
    }

    /** Occurrences in the last {@code window}, the current minute included. */
    public synchronized long countWithin(Duration window) {
        long minutes = Math.min(Math.max(window.toMinutes(), 1), MINUTES);
        long oldest = currentMinute() - minutes;
        long total = 0;
        for (int slot = 0; slot < MINUTES; slot++) {
            if (minuteOf[slot] > oldest) total += counts[slot];
        }
        return total;
    }

    private long currentMinute() {
        return clock.millis() / 60_000;
    }
}
```

- [ ] **Step 6: Count in the recorder**

In `ErrorEventRecorder.java`: add the field `private final ErrorBurstCounter burstCounter;`, add `ErrorBurstCounter burstCounter` as the constructor's last parameter and assign it (import `event_social_media.service.push.ErrorBurstCounter`). At the top of `private void record(Occurrence o)`:

```java
        // Counted before a write can be skipped or dropped: a burst is exactly when writes get dropped.
        if (o.httpStatus() == null || o.httpStatus() < 400 || o.httpStatus() > 499) {
            burstCounter.record();
        }
```

In `ErrorEventRecorderFailureTest.java`, every constructor call is on one line; add the counter to each:

```bash
sed -i 's/mock(EntityManagerFactory.class));/mock(EntityManagerFactory.class), new ErrorBurstCounter());/' src/test/java/event_social_media/service/feedback/ErrorEventRecorderFailureTest.java
```

and add `import event_social_media.service.push.ErrorBurstCounter;`. Then `grep -rn "new ErrorEventRecorder(" src/test` must show only calls with five arguments.

- [ ] **Step 7: Write the job**

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/**
 * Every 5 minutes: at {@code threshold} or more errors in the last {@code window}, one ERROR_BURST push,
 * then quiet for {@code quiet}. The quiet time lives in memory, like the counts.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ErrorBurstJob {

    private final PushProperties properties;
    private final ErrorBurstCounter counter;
    private final ApplicationEventPublisher eventPublisher;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    private Instant quietUntil = Instant.MIN;

    @Scheduled(cron = "${app.push.error-burst.cron:0 */5 * * * *}")
    public synchronized void check() {
        if (!properties.isEnabled()) return;
        PushProperties.ErrorBurst burst = properties.getErrorBurst();
        Instant now = clock.instant();
        if (now.isBefore(quietUntil)) return;
        long count = counter.countWithin(burst.getWindow());
        if (count < burst.getThreshold()) return;
        quietUntil = now.plus(burst.getQuiet());
        log.info("Error burst: {} errors in the last {} minutes; alerting the admins", count, burst.getWindow().toMinutes());
        eventPublisher.publishEvent(AdminAlert.errorBurst(count, burst.getWindow()));
    }
}
```

- [ ] **Step 8: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.push.ErrorBurst*" --tests "event_social_media.service.feedback.*"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A src/main/java/event_social_media/service src/test/java/event_social_media/service
git commit -m "feat(push): ERROR_BURST at 10 errors in an hour, then an hour quiet"
```

### Task A13: Daily digest

**Files:**
- Create: `src/main/java/event_social_media/service/device/DailyDigest.java`
- Modify: `src/main/java/event_social_media/service/device/DeviceSummaryService.java`
- Modify: `src/main/java/event_social_media/service/push/AdminAlert.java`
- Create: `src/main/java/event_social_media/service/push/DailyDigestJob.java`
- Modify: `src/test/java/event_social_media/service/device/DeviceSummaryServiceTest.java`
- Modify: `src/test/java/event_social_media/service/push/AdminAlertTest.java`
- Test: `src/test/java/event_social_media/service/push/DailyDigestJobTest.java`

- [ ] **Step 1: Write the failing summary tests**

In `DeviceSummaryServiceTest.java`, next to the other constants:

```java
    private static final OffsetDateTime YESTERDAY_START = OffsetDateTime.parse("2026-10-27T00:00+02:00");
```

And the tests:

```java
    @Test
    void theDigestIsYesterdayInAthensWithTodaysNeedsAttentionAndTheLatestCosts() {
        stubAttention();
        stubCosts();
        when(funnelMetricsService.funnel(YESTERDAY_START, TODAY_START, null))
                .thenReturn(funnel(7, 18_900, Map.of("CONSUMER", 3L, "BUSINESS", 1L)));
        when(visitorMetricsService.visitors(YESTERDAY_START, TODAY_START, false)).thenReturn(configured(312));

        DailyDigest digest = service.digest();

        assertThat(digest.day()).isEqualTo(LocalDate.parse("2026-10-27"));
        assertThat(digest.orders()).isEqualTo(4);
        assertThat(digest.revenue()).containsExactly(new Money("EUR", 18_900));
        assertThat(digest.signUps()).isEqualTo(7);
        assertThat(digest.visitors()).isEqualTo(312);
        assertThat(digest.costs()).containsExactly(new Money("EUR", 600), new Money("USD", 3_800));
        assertThat(digest.attention()).isEqualTo(new Attention(1L, 2L, 1L, 4L, 5L));
    }

    @Test
    void aFailingDigestSourceBlanksOnlyItsOwnFigures() {
        stubAttention();
        stubCosts();
        when(funnelMetricsService.funnel(YESTERDAY_START, TODAY_START, null)).thenThrow(new IllegalStateException("boom"));
        when(visitorMetricsService.visitors(YESTERDAY_START, TODAY_START, false)).thenReturn(VisitorMetricsDto.notConfigured());

        DailyDigest digest = service.digest();

        assertThat(digest.orders()).isNull();
        assertThat(digest.revenue()).isNull();
        assertThat(digest.signUps()).isNull();
        assertThat(digest.visitors()).isNull();
        assertThat(digest.costs()).isNotNull();
    }
```

Imports: `event_social_media.dto.device.DeviceSummaryDto.Attention`, `...DeviceSummaryDto.Money` (the file may import them already), `java.time.LocalDate`. The expected attention mirrors `stubAttention()`: held 1, webhooks 2, open reports 1 (one case with open reports), bug reports 4, errors 5; adjust if the existing `buildsEveryGroupFromTheConsolesOwnSources` asserts other values for the same stubs.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.device.DeviceSummaryServiceTest"`
Expected: compilation fails, `DailyDigest` not found.

- [ ] **Step 3: Write `DailyDigest`**

```java
package event_social_media.service.device;

import event_social_media.dto.device.DeviceSummaryDto.Attention;
import event_social_media.dto.device.DeviceSummaryDto.Money;

import java.time.LocalDate;
import java.util.List;

/**
 * What the 09:00 push says: {@code day} (yesterday in Europe/Athens) from the same sources as the
 * summary, the newest cost run's totals, and the needs-attention counts as of now. A null figure's
 * source failed or, for visitors, Google Analytics is not set up.
 */
public record DailyDigest(LocalDate day, Long orders, List<Money> revenue, Long signUps, Long visitors,
                          List<Money> costs, Attention attention) {
}
```

- [ ] **Step 4: Add `digest()` to `DeviceSummaryService`**

Three small refactors, then the method. Rename the private record `TodayFigures` to `DayFigures` and `todayFigures(...)` to `dayFigures(...)` (every use in the file). Move the `Attention attention = new Attention(...)` block from `summary()` into:

```java
    private Attention attention(OffsetDateTime now) {
        OffsetDateTime dayAgo = now.minus(RECENT);
        return new Attention(
                read("held withdrawals", () -> refundRequestRepository.countByStatus(RefundRequestStatus.HELD)),
                read("unprocessed webhooks", () -> providerWebhookEventRepository.countUnprocessed(now.minus(WEBHOOK_FLOOR))),
                read("open reports", () -> reportRepository.findActiveCases().stream().filter(c -> c.openCount() > 0).count()),
                read("bug reports", () -> bugReportRepository.countByCreatedAtGreaterThanEqual(dayAgo)),
                read("errors", () -> errorEventRepository.countSeenSinceWithoutRejections(dayAgo)));
    }
```

and call `Attention attention = attention(now);` in `summary()` (drop its now-unused `dayAgo` local if nothing else uses it). Replace `visitorsToday(OffsetDateTime todayStart)` with:

```java
    /** Null when Google Analytics is not set up, so the phone shows a blank rather than a zero. */
    private Long visitors(OffsetDateTime since, OffsetDateTime until) {
        VisitorMetricsDto visitors = visitorMetricsService.visitors(since, until, false);
        return visitors.isConfigured() ? visitors.getVisitors() : null;
    }
```

and in `startVisitors` call `visitors(todayStart, null)`. Then add after `summary()`:

```java
    /**
     * The daily digest. Runs on the scheduler, not a phone's request, so the visitors read gets no
     * budget beyond Google Analytics' own timeouts.
     */
    public DailyDigest digest() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        LocalDate today = now.atZoneSameInstant(ZONE).toLocalDate();
        LocalDate yesterday = today.minusDays(1);
        OffsetDateTime from = yesterday.atStartOfDay(ZONE).toOffsetDateTime();
        OffsetDateTime until = today.atStartOfDay(ZONE).toOffsetDateTime();

        DayFigures day = read("funnel yesterday", () -> dayFigures(funnelMetricsService.funnel(from, until, null)));
        Long visitors = read("visitors yesterday", () -> visitors(from, until));
        CostFigures costs = read("provider costs", () -> costFigures(providerCostSnapshotRepository.findLatestPerProvider()));
        return new DailyDigest(yesterday,
                day == null ? null : day.paidOrders(),
                day == null ? null : day.netRevenue(),
                day == null ? null : day.signUps(),
                visitors,
                costs == null ? null : costs.totals(),
                attention(now));
    }
```

- [ ] **Step 5: Run the summary tests**

Run: `./gradlew test --tests "event_social_media.service.device.DeviceSummaryServiceTest"`
Expected: PASS, every existing test plus the two new ones.

- [ ] **Step 6: Write the digest alert test**

In `AdminAlertTest.java`:

```java
    @Test
    void theDigestSendsKnownFiguresAndOnlyTheCountsAboveZero() {
        DailyDigest digest = new DailyDigest(LocalDate.parse("2026-10-28"), 4L,
                List.of(new Money("EUR", 18_900)), 7L, null,
                List.of(new Money("EUR", 600), new Money("USD", 3_800)),
                new Attention(1L, 0L, 2L, null, 0L));

        assertThat(AdminAlert.dailyDigest(digest).payload()).isEqualTo(Map.of(
                "type", "DAILY_DIGEST", "link", "#metrics", "day", "2026-10-28",
                "orders", "4", "revenue", "[{\"currency\":\"EUR\",\"amountMinor\":18900}]", "signUps", "7",
                "costs", "[{\"currency\":\"EUR\",\"amountMinor\":600},{\"currency\":\"USD\",\"amountMinor\":3800}]",
                "heldWithdrawals", "1", "openReports", "2"));
    }
```

Imports: `event_social_media.service.device.DailyDigest`, `event_social_media.dto.device.DeviceSummaryDto.Attention`, `event_social_media.dto.device.DeviceSummaryDto.Money`, `java.time.LocalDate`, `java.util.List`.

- [ ] **Step 7: Add `AdminAlert.dailyDigest`**

In `AdminAlert.java` (imports: `com.fasterxml.jackson.core.JsonProcessingException`, `com.fasterxml.jackson.databind.ObjectMapper`, `event_social_media.dto.device.DeviceSummaryDto.Attention`, `event_social_media.service.device.DailyDigest`, `java.util.List`):

```java
    private static final ObjectMapper JSON = new ObjectMapper();

    /** Money lists go as JSON arrays of {@code {currency, amountMinor}}, like the summary's. */
    public static AdminAlert dailyDigest(DailyDigest digest) {
        Map<String, String> data = new LinkedHashMap<>();
        data.put("day", digest.day().toString());
        if (digest.orders() != null) data.put("orders", digest.orders().toString());
        if (digest.revenue() != null) data.put("revenue", json(digest.revenue()));
        if (digest.signUps() != null) data.put("signUps", digest.signUps().toString());
        if (digest.visitors() != null) data.put("visitors", digest.visitors().toString());
        if (digest.costs() != null) data.put("costs", json(digest.costs()));
        Attention attention = digest.attention();
        putAboveZero(data, "heldWithdrawals", attention.heldWithdrawals());
        putAboveZero(data, "unprocessedWebhooks", attention.unprocessedWebhooks());
        putAboveZero(data, "openReports", attention.openReports());
        putAboveZero(data, "bugReports24h", attention.bugReports24h());
        putAboveZero(data, "errors24h", attention.errors24h());
        return new AdminAlert(AdminAlertType.DAILY_DIGEST, data);
    }

    private static void putAboveZero(Map<String, String> data, String key, Long count) {
        if (count != null && count > 0) data.put(key, count.toString());
    }

    private static String json(List<?> value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
```

- [ ] **Step 8: Write the job and its test**

`DailyDigestJobTest.java`:

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import event_social_media.dto.device.DeviceSummaryDto.Attention;
import event_social_media.service.device.DailyDigest;
import event_social_media.service.device.DeviceSummaryService;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DailyDigestJobTest {

    private final PushProperties properties = new PushProperties();
    private final DeviceSummaryService summaryService = mock(DeviceSummaryService.class);
    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    private final DailyDigestJob job = new DailyDigestJob(properties, summaryService, publisher);

    @Test
    void sendsTheDigest() {
        properties.setServiceAccount("on");
        DailyDigest digest = new DailyDigest(LocalDate.parse("2026-10-28"), 0L, List.of(), 0L, null, List.of(),
                new Attention(0L, 0L, 0L, 0L, 0L));
        when(summaryService.digest()).thenReturn(digest);

        job.send();

        verify(publisher).publishEvent(AdminAlert.dailyDigest(digest));
    }

    @Test
    void pushOffReadsNothing() {
        job.send();

        verifyNoInteractions(summaryService);
        verify(publisher, never()).publishEvent(any());
    }
}
```

`DailyDigestJob.java`:

```java
package event_social_media.service.push;

import event_social_media.config.PushProperties;
import event_social_media.service.device.DeviceSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** The 09:00 recap of yesterday to every paired admin phone, sent even when every figure is 0. */
@Component
@RequiredArgsConstructor
public class DailyDigestJob {

    private final PushProperties properties;
    private final DeviceSummaryService summaryService;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(cron = "${app.push.digest.cron:0 0 9 * * *}", zone = "Europe/Athens")
    public void send() {
        if (!properties.isEnabled()) return;
        eventPublisher.publishEvent(AdminAlert.dailyDigest(summaryService.digest()));
    }
}
```

- [ ] **Step 9: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.push.*" --tests "event_social_media.service.device.*"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A src/main/java/event_social_media/service src/test/java/event_social_media/service
git commit -m "feat(push): DAILY_DIGEST of yesterday at 09:00 Athens"
```

### Task A14: Remove phones when an admin stops being an active admin

**Files:**
- Modify: `src/main/java/event_social_media/service/device/AdminDeviceService.java`
- Modify: `src/main/java/event_social_media/service/user/UserService.java`
- Modify: `src/test/java/event_social_media/service/user/UserServiceTest.java`

- [ ] **Step 1: Write the failing tests**

In `UserServiceTest.java` add `@Autowired private TestFixtures fixtures;`, `@Autowired private AdminDeviceService adminDeviceService;`, `@Autowired private AdminDeviceRepository adminDeviceRepository;`, `@PersistenceContext private EntityManager entityManager;` and:

```java
    private UUID phoneOf(User admin) {
        UUID id = adminDeviceService.create(new AdminDeviceRequestDto("Phone"), new AdminActor(admin.getId(), null))
                .device().id();
        adminDeviceService.updatePushToken(new DevicePrincipal(id, admin.getId()), "t-" + id);
        return id;
    }

    private AdminDevice storedDevice(UUID id) {
        entityManager.flush();
        entityManager.clear();
        return adminDeviceRepository.findById(id).orElseThrow();
    }

    @Test
    void removingTheAdminRoleRemovesTheirPhones() {
        User admin = fixtures.newAdmin();
        UUID phone = phoneOf(admin);
        UserRequestDto dto = new UserRequestDto();
        dto.setPlatformRole(PlatformRole.USER);

        userService.update(admin.getId(), dto, new AdminActor(UUID.randomUUID(), null));

        AdminDevice device = storedDevice(phone);
        assertNotNull(device.getRevokedAt());
        assertNull(device.getFcmToken());
    }

    @Test
    void suspendingAnAdminRemovesTheirPhones() {
        User admin = fixtures.newAdmin();
        UUID phone = phoneOf(admin);
        UserRequestDto dto = new UserRequestDto();
        dto.setStatus(AccountStatus.SUSPENDED);

        userService.update(admin.getId(), dto, new AdminActor(UUID.randomUUID(), null));

        assertNotNull(storedDevice(phone).getRevokedAt());
    }

    @Test
    void aSuspensionByAModerationDecisionRemovesTheirPhonesToo() {
        User admin = fixtures.newAdmin();
        UUID phone = phoneOf(admin);

        userService.suspendAsModerator(admin.getId());

        assertNotNull(storedDevice(phone).getRevokedAt());
    }

    @Test
    void otherChangesKeepTheirPhones() {
        User admin = fixtures.newAdmin();
        UUID phone = phoneOf(admin);
        UserRequestDto dto = new UserRequestDto();
        dto.setEventCreationLocked(true);

        userService.update(admin.getId(), dto, new AdminActor(UUID.randomUUID(), null));

        assertNull(storedDevice(phone).getRevokedAt());
    }
```

Imports: `TestFixtures`, `AdminDeviceService`, `AdminDeviceRepository`, `AdminDeviceRequestDto`, `AdminDevice`, `DevicePrincipal`, `UserRequestDto`, `jakarta.persistence.EntityManager`, `jakarta.persistence.PersistenceContext`, `assertNull`.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.user.UserServiceTest"`
Expected: FAIL in the first three, `revokedAt` is null.

- [ ] **Step 3: Add `revokeAllOwnedBy`**

In `AdminDeviceService.java`, after `revoke`:

```java
    /**
     * Removes every phone of an account that is no longer an active admin: its role was removed, or it
     * was suspended or deleted. For good, like Remove phone; a restored admin pairs again.
     */
    @Transactional
    public void revokeAllOwnedBy(UUID ownerId) {
        int revoked = repository.revokeAllOwnedBy(ownerId, now());
        if (revoked > 0) {
            log.info("Revoked {} admin device(s) of user {}: no longer an active admin", revoked, ownerId);
        }
    }
```

- [ ] **Step 4: Call it from `UserService`**

Add `private final AdminDeviceService adminDeviceService;` to `UserService` (import `event_social_media.service.device.AdminDeviceService`). In `update(...)`, after the `if (wasActive && saved.getStatus() != AccountStatus.ACTIVE) { ... }` block:

```java
        boolean changed = saved.getStatus() != statusBefore || saved.getPlatformRole() != roleBefore;
        if (changed && !(saved.getPlatformRole() == PlatformRole.ADMIN && saved.getStatus() == AccountStatus.ACTIVE)) {
            adminDeviceService.revokeAllOwnedBy(id);
        }
```

In `suspendAsModerator(...)`, inside the `if`, after `sessionRepository.revokeAllForUserKeepingContext(...)`:

```java
            adminDeviceService.revokeAllOwnedBy(userId);
```

If Spring reports a circular dependency at startup, inject `AdminDeviceRepository` into `UserService` instead and call `revokeAllOwnedBy(id, OffsetDateTime.now(ZoneOffset.UTC))` on it directly.

- [ ] **Step 5: Run the user and device tests**

Run: `./gradlew test --tests "event_social_media.service.user.*" --tests "event_social_media.service.device.*"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/device/AdminDeviceService.java src/main/java/event_social_media/service/user/UserService.java src/test/java/event_social_media/service/user/UserServiceTest.java
git commit -m "feat(devices): remove an admin's phones when they stop being an active admin"
```

### Task A15: Contract docs and changelog

**Files:**
- Modify: `docs/fe-guides/admin-devices-fe-integration.md`
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 1: Update the FE guide**

1. In the endpoint table, add the row:
   `| POST | /api/admin/devices/{id}/test-notification | admin JWT | 10 per minute | 204 |`
2. In `AdminDeviceDto`, change the `pushEnabled` comment to `// the phone has sent a Firebase token, and Firebase still accepts it`.
3. Under section 1, add `### POST /api/admin/devices/{id}/test-notification`: no body; `204` when Firebase accepted it; then this table:

   | Status | `errorKey` | When |
   |---|---|---|
   | 404 | `RESOURCE_NOT_FOUND` (2001) | Unknown, removed, or another admin's phone. |
   | 409 | `PUSH_NOT_ENABLED` (5186) | The phone has no Firebase token, or Firebase said the token is dead (it is cleared, so `pushEnabled` turns false). |
   | 502 | `PUSH_SEND_FAILED` (9004) | Firebase didn't accept it. Try again. |
   | 503 | `PUSH_UNAVAILABLE` (9003) | Push is not set up on this server. |
   | 429 | `RATE_LIMITED` (3010) | More than 10 in a minute. |

   Refetch `GET /api/admin/devices` after every try.
4. Replace "For the Firebase step (build step 3). It exists now so the app can send its token as soon as it has one." under `PUT /api/device/push-token` with: "The app sends its Firebase token after pairing and whenever Firebase gives it a new one."
5. Add `## 5. Push messages (Android app)`: data-only FCM messages, every value a string, every message has `type` and `link` (a console hash; the app adds the site address and opens only `^#[a-z][a-z-]{0,39}$`), unknown figures left out. Then the "Push messages" table from this plan, and: "Alerts go at high priority, the digest at normal. Each lives one day; Firebase drops what it couldn't deliver by then. A phone gets them only while it is paired, its owner is an active admin, and its token is live. Removing a phone, or the owner losing admin, stops them at once."
6. In section 4's last bullets add: "Removing an admin's role, or suspending or deleting the account, also removes all their phones for good."

- [ ] **Step 2: Add the changelog entry**

At the top of `docs/CHANGELOG.md`, under the `---`:

```markdown
## 2026-10-29 — Push notifications to paired admin phones

- **What:** Spring sends Firebase data messages to every paired admin phone: `ORDER_PAID`,
  `WITHDRAWAL_HELD`, `WEBHOOK_UNPROCESSED`, `REPORT_CASE_OPENED`, `BUG_REPORT`, `ERROR_BURST` (10 or
  more errors in 60 minutes, counted in memory, then 60 minutes quiet) and `DAILY_DIGEST` (09:00
  Europe/Athens, yesterday's figures). Sent after commit on the async executor, once per token, to live
  phones of active admins. Dead tokens are cleared. Over the FCM HTTP v1 API with the Google auth
  library already in the build; no Firebase SDK.
- **Endpoint:** `POST /api/admin/devices/{id}/test-notification` (new error codes `PUSH_NOT_ENABLED`
  5186, `PUSH_UNAVAILABLE` 9003, `PUSH_SEND_FAILED` 9004).
- **Devices:** removing an admin's role, or suspending or soft-deleting the account, now revokes all
  their phones.
- **Deploy:** set `FIREBASE_SERVICE_ACCOUNT` (the service-account JSON, Base64) to turn push on.
  Unset, nothing is sent. Optional: `PUSH_ERROR_BURST_THRESHOLD`, `PUSH_ERROR_BURST_WINDOW`,
  `PUSH_ERROR_BURST_QUIET`, `PUSH_ERROR_BURST_CRON`, `PUSH_DIGEST_CRON`.
- **FE contract:** `docs/fe-guides/admin-devices-fe-integration.md` (test endpoint, §5 push messages).
```

- [ ] **Step 3: Commit**

```bash
git add docs/fe-guides/admin-devices-fe-integration.md docs/CHANGELOG.md
git commit -m "docs(push): test endpoint, push messages, changelog"
```

### Task A16: Full Spring check

- [ ] **Step 1: Run the whole suite in the background**

Run: `./gradlew test` (in the background; it takes several minutes)
Expected: BUILD SUCCESSFUL. Any failure: fix it in its task's files, rerun that class, then the suite.

- [ ] **Step 2: Refresh the knowledge graph**

Run: `graphify update .` (the Spring repo's CLAUDE.md asks for it after code changes). Commit `graphify-out/` only if it is tracked.

- [ ] **Step 3: Self-review the diff**

Run: `git diff origin/staging --stat` and read the full diff once: no token or key in any log line, every trigger after commit, no unrelated edits.

---

## Part B: Website

From this worktree. If `node_modules` is missing, link it to the main checkout's (see the worktree memory) when the lockfiles match, else `npm ci`.

### Task B1: Error codes and copy

**Files:**
- Modify: `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/adminUtils.ts`, `lib/adminUtils.test.ts`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing test**

In `lib/adminUtils.test.ts`:

```ts
    it('names each test notification refusal (5186, 9003, 9004)', () => {
        expect(adminErrorMessageKey(new ApiError(409, { errorCode: 5186 }))).toBe('pushNotEnabled');
        expect(adminErrorMessageKey(new ApiError(503, { errorCode: 9003 }))).toBe('pushUnavailable');
        expect(adminErrorMessageKey(new ApiError(502, { errorCode: 9004 }))).toBe('pushSendFailed');
    });
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/adminUtils.test.ts`
Expected: FAIL, `'generic'` instead of `'pushNotEnabled'`.

- [ ] **Step 3: Add the codes and keys**

`lib/api/errors.ts`, after `PRINT_LIST_EMPTY: 5185,`:

```ts
    PUSH_NOT_ENABLED: 5186,
    PUSH_UNAVAILABLE: 9003,
    PUSH_SEND_FAILED: 9004,
```

`lib/api/errorMessageKeys.ts`: add `| 'pushNotEnabled' | 'pushSendFailed' | 'pushUnavailable'` to `ApiErrorMessageKey` (alphabetical), and after `[ERROR_CODES.PRINT_LIST_EMPTY]: 'printListEmpty',`:

```ts
    [ERROR_CODES.PUSH_NOT_ENABLED]: 'pushNotEnabled',
    [ERROR_CODES.PUSH_UNAVAILABLE]: 'pushUnavailable',
    [ERROR_CODES.PUSH_SEND_FAILED]: 'pushSendFailed',
```

`lib/adminUtils.ts`: add `| 'pushNotEnabled' | 'pushUnavailable' | 'pushSendFailed'` to `AdminErrorMessageKey` before `| 'generic'`, and in `adminErrorMessageKey` before the final fallback:

```ts
    // The Phones drawer's test notification.
    if (code === ERROR_CODES.PUSH_NOT_ENABLED) return 'pushNotEnabled';
    if (code === ERROR_CODES.PUSH_UNAVAILABLE) return 'pushUnavailable';
    if (code === ERROR_CODES.PUSH_SEND_FAILED) return 'pushSendFailed';
```

- [ ] **Step 4: Add the copy**

In both `ApiErrors` and `AdminPage.errors`, `messages/en.json`:

```json
"pushNotEnabled": "This phone's notifications are off. Open the app on the phone.",
"pushUnavailable": "Notifications aren't set up on the server.",
"pushSendFailed": "Couldn't send. Try again."
```

`messages/el.json`:

```json
"pushNotEnabled": "Οι ειδοποιήσεις αυτού του κινητού είναι ανενεργές. Ανοίξτε την εφαρμογή στο κινητό.",
"pushUnavailable": "Οι ειδοποιήσεις δεν έχουν ρυθμιστεί στον διακομιστή.",
"pushSendFailed": "Η αποστολή απέτυχε. Δοκιμάστε ξανά."
```

In `AdminPage.phones`, en: `"sendTest": "Send test notification", "testSent": "Sent."`; el: `"sendTest": "Αποστολή δοκιμαστικής ειδοποίησης", "testSent": "Στάλθηκε."`.

- [ ] **Step 5: Run the test and the type check**

Run: `npx vitest run lib/adminUtils.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors (the `satisfies Record<KnownApiErrorCode, ...>` check passes with the three new entries).

- [ ] **Step 6: Commit**

```bash
git add lib/api/errors.ts lib/api/errorMessageKeys.ts lib/adminUtils.ts lib/adminUtils.test.ts messages/en.json messages/el.json
git commit -m "feat(admin-phones): error codes and copy for the test notification"
```

### Task B2: The "Send test notification" button

**Files:**
- Modify: `lib/api/endpoints.ts`
- Modify: `hooks/useAdminDevices.ts`
- Create: `hooks/usePhoneTestNotification.ts`
- Modify: `components/admin/phones/PhoneDetailDrawer.tsx`
- Modify: `components/admin/phones/PhoneDetailDrawer.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `PhoneDetailDrawer.test.tsx`, extend the hoisted hooks and the mock:

```tsx
const hooks = vi.hoisted(() => ({ revoke: vi.fn(), sendTest: vi.fn() }));
// …
vi.mock('@/hooks/useAdminDevices', () => ({
    useRevokeAdminDevice: () => ({ mutateAsync: hooks.revoke, isPending: false }),
    useSendTestNotification: () => ({ mutateAsync: hooks.sendTest, isPending: false }),
}));
```

In `beforeEach` add `hooks.sendTest.mockReset().mockResolvedValue(undefined);`. Then:

```tsx
    it('sends a test notification to this phone and says it was sent', async () => {
        render(<PhoneDetailDrawer open device={device} onCloseAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'phones.sendTest' }));

        await waitFor(() => expect(hooks.sendTest).toHaveBeenCalledWith('d1'));
        expect(await screen.findByText('phones.testSent')).toBeInTheDocument();
    });

    it('cannot send a test while the phone has notifications off', () => {
        render(<PhoneDetailDrawer open device={{ ...device, pushEnabled: false }} onCloseAction={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'phones.sendTest' })).toBeDisabled();
    });

    it('shows why a test could not be sent', async () => {
        hooks.sendTest.mockRejectedValue(new ApiError(409, { errorCode: 5186 }));
        render(<PhoneDetailDrawer open device={device} onCloseAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'phones.sendTest' }));

        expect(await screen.findByText('errors.pushNotEnabled')).toBeInTheDocument();
        expect(screen.queryByText('phones.testSent')).not.toBeInTheDocument();
    });
```

Add `import { ApiError } from '@/lib/api/client';`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/admin/phones/PhoneDetailDrawer.test.tsx`
Expected: FAIL, no button named `phones.sendTest`.

- [ ] **Step 3: Add the endpoint and the mutation**

`lib/api/endpoints.ts`, in `admin.devices`:

```ts
            testNotification: (id: string) => `/api/admin/devices/${id}/test-notification`,
```

`hooks/useAdminDevices.ts`, after `useRevokeAdminDevice`:

```ts
export function useSendTestNotification() {
    const refresh = useRefreshAdminDevices();
    return useMutation({
        mutationFn: (id: string) => api.post<void>(endpoints.admin.devices.testNotification(id)),
        // A dead token is cleared on the server, which turns the phone's Notifications to Off.
        onSettled: refresh,
    });
}
```

`hooks/usePhoneTestNotification.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';

import { useSendTestNotification } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

// The drawer's test notification. The drawer is remounted on every opening, so each opening starts blank.
export function usePhoneTestNotification(device: AdminDeviceDto | null) {
    const { mutateAsync: sendTest, isPending: sending } = useSendTestNotification();
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const send = useCallback(async () => {
        if (!device) return;
        setSent(false);
        setError(null);
        try {
            await sendTest(device.id);
            setSent(true);
        } catch (caught) {
            setError(caught);
        }
    }, [device, sendTest]);

    return { send, sending, sent, error };
}
```

- [ ] **Step 4: Add the Test section to the drawer**

In `PhoneDetailDrawer.tsx`: import `usePhoneTestNotification`, call `const test = usePhoneTestNotification(device);` under `usePhoneRemoval`, and add between the Details `</dl>` block and the Errors block:

```tsx
                {/* Test */}
                {shown && (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={test.send}
                            disabled={!shown.pushEnabled || test.sending || r.removing}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink disabled:opacity-50"
                        >
                            {test.sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('phones.sendTest')}
                        </button>
                        {test.sent && (
                            <p role="status" className="text-sm text-status-good">
                                {t('phones.testSent')}
                            </p>
                        )}
                    </div>
                )}
```

Change the Errors line to show either error:

```tsx
                {/* Errors */}
                {(r.error ?? test.error) !== null && (
                    <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(r.error ?? test.error)}`)}</p>
                )}
```

- [ ] **Step 5: Run the tests, types and lint**

Run: `npx vitest run components/admin/phones && npx tsc --noEmit && npx eslint components/admin/phones hooks/usePhoneTestNotification.ts hooks/useAdminDevices.ts lib/adminUtils.ts lib/api`
Expected: PASS, no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/api/endpoints.ts hooks/useAdminDevices.ts hooks/usePhoneTestNotification.ts components/admin/phones/PhoneDetailDrawer.tsx components/admin/phones/PhoneDetailDrawer.test.tsx
git commit -m "feat(admin-phones): send a test notification from the phone's drawer"
```

### Task B3: Look at it

- [ ] **Step 1: Run the console locally**

Local Spring on `:8080` (from the Spring worktree, push off) and this worktree's dev server on `:3000`. Open only `preview_start {url: "http://localhost:3000/"}` (never by name). Ask the user for the local test login and sign in as the admin.

- [ ] **Step 2: Check the drawer**

At desktop width: Phones → a phone → the Test section sits under the details with clear spacing; disabled with the Off pill. On a phone whose token was set locally (`PUT /api/device/push-token` with its key), the button sends and shows "Notifications aren't set up on the server." (push is off locally). Then a 375 px width: nothing overlaps. Greek: the longer label wraps cleanly.

### Task B4: Spec update

**Files:**
- Modify: `docs/superpowers/specs/2026-10-28-admin-phone-widget-design.md`

- [ ] **Step 1: Record the 2026-10-29 decisions**

- Push → Firebase: "Spring sends over the FCM HTTP v1 API with the Google auth library it already has, not the Admin SDK."
- `ERROR_BURST` row: "counts every occurrence, 4xx rejections left out, in memory".
- `REPORT_CASE_OPENED` row: "when the report makes its item open (no `OPEN` report before it); a new report on an item under review alerts too".
- Device keys: "Removing an admin's role, or suspending or deleting the account, revokes all their phones."
- Build order step 3: the app branch starts from step 2's branch.
- Before step 3: "Add two Android apps, `gr.storywall.admin` and `gr.storywall.admin.debug`."

- [ ] **Step 2: Commit the plan and the spec**

```bash
git add docs/superpowers/specs/2026-10-28-admin-phone-widget-design.md docs/superpowers/plans/2026-10-29-admin-phone-push.md
git commit -m "docs(admin-phones): step 3 plan and its decisions"
```

SEO: no route, metadata or public page changes, so `docs/seo-guidelines.md` raises no blocker.

---

## Part C: Android app

From `C:\Users\User\IdeaProjects\storywall-admin-android`. JDK 17. Unit tests: `./gradlew :app:testDebugUnitTest`.

### Task C0: Branch

- [ ] **Step 1:**

```bash
cd /c/Users/User/IdeaProjects/storywall-admin-android
git status --short && git switch claude/app-and-widget && git switch -c claude/app-push
```

Expected: a clean tree, then a new branch at `4b77a29` or newer.

### Task C1: Firebase in the build

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `app/build.gradle.kts`
- Modify: `app/src/main/AndroidManifest.xml`
- Modify: `README.md`

- [ ] **Step 1: Pick the versions**

```bash
curl -s https://dl.google.com/dl/android/maven2/com/google/firebase/firebase-bom/maven-metadata.xml | grep -o "<release>[^<]*"
```

Use that release for `firebaseBom`.

- [ ] **Step 2: Add the libraries**

`gradle/libs.versions.toml`, `[versions]`: `firebaseBom = "<the release>"`. `[libraries]`:

```toml
firebase-bom = { module = "com.google.firebase:firebase-bom", version.ref = "firebaseBom" }
firebase-messaging = { module = "com.google.firebase:firebase-messaging" }
kotlinx-coroutines-play-services = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-play-services", version.ref = "coroutines" }
```

`app/build.gradle.kts`, in `dependencies`:

```kotlin
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.kotlinx.coroutines.play.services)
```

- [ ] **Step 3: Read `google-services.json` in the build**

In `app/build.gradle.kts`, after the `signing` lines:

```kotlin
// Firebase reads these string resources at startup: the ones the google-services plugin would write.
// The file stays out of git. Without it, or without an entry for a build's package, that build has no
// push: it still builds and runs, and the app hides its notifications row.
val firebaseFile = file("google-services.json")

@Suppress("UNCHECKED_CAST")
fun firebaseValues(packageName: String): Map<String, String> {
    if (!firebaseFile.exists()) return emptyMap()
    val json = groovy.json.JsonSlurper().parse(firebaseFile) as Map<String, Any?>
    val project = json["project_info"] as Map<String, Any?>
    val client = (json["client"] as List<Map<String, Any?>>).firstOrNull {
        val info = it["client_info"] as Map<String, Any?>
        (info["android_client_info"] as Map<String, Any?>)["package_name"] == packageName
    } ?: return emptyMap<String, String>().also { logger.warn("google-services.json has no app $packageName: push off") }
    val info = client["client_info"] as Map<String, Any?>
    val apiKey = (client["api_key"] as List<Map<String, Any?>>).first()["current_key"] as String
    return mapOf(
        "google_app_id" to info["mobilesdk_app_id"] as String,
        "google_api_key" to apiKey,
        "gcm_defaultSenderId" to project["project_number"] as String,
        "project_id" to project["project_id"] as String,
    )
}
```

In `buildTypes.debug`, after its `buildConfigField`:

```kotlin
            firebaseValues("gr.storywall.admin.debug").forEach { (name, value) -> resValue("string", name, value) }
```

In `buildTypes.release`, after its `buildConfigField`:

```kotlin
            firebaseValues("gr.storywall.admin").forEach { (name, value) -> resValue("string", name, value) }
```

- [ ] **Step 4: Manifest**

In `AndroidManifest.xml`, under the `INTERNET` permission:

```xml
    <!-- Android 13+ asks the user first; the app screen offers it. -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Inside `<application>`, after the widget receiver:

```xml
        <service
            android:name=".push.AdminMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
```

- [ ] **Step 5: Build without the file**

Run: `./gradlew :app:assembleDebug` (with no `app/google-services.json`)
Expected: BUILD FAILED only because `AdminMessagingService` doesn't exist yet. Leave the manifest service in place; Task C6 adds the class. If something else fails (a resValue or a dependency), fix it here.

- [ ] **Step 6: README**

Under "Build", add:

```markdown
Push needs `app/google-services.json` from the StoryWall Admin Firebase project (apps `gr.storywall.admin` and
`gr.storywall.admin.debug`). Keep it out of git. Without it the app builds with push off.
```

- [ ] **Step 7: Commit**

```bash
git add gradle/libs.versions.toml app/build.gradle.kts app/src/main/AndroidManifest.xml README.md
git commit -m "build: Firebase Messaging, read from google-services.json when present"
```

### Task C2: Reading a push

**Files:**
- Create: `app/src/main/java/gr/storywall/admin/push/PushMessage.kt`
- Test: `app/src/test/java/gr/storywall/admin/push/PushMessageTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.summary.Attention
import gr.storywall.admin.summary.Money
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class PushMessageTest {

    @Test
    fun readsEachType() {
        assertEquals(
            PushMessage.OrderPaid(Money("EUR", 18_900), "ACTIVATION", "Premium", "#orders"),
            parsePush(mapOf("type" to "ORDER_PAID", "link" to "#orders", "amountMinor" to "18900", "currency" to "EUR",
                "kind" to "ACTIVATION", "plan" to "Premium")),
        )
        assertEquals(PushMessage.WithdrawalHeld(null, "#withdrawals"), parsePush(mapOf("type" to "WITHDRAWAL_HELD", "link" to "#withdrawals")))
        assertEquals(PushMessage.WebhookUnprocessed("STRIPE", "#billing-ops"),
            parsePush(mapOf("type" to "WEBHOOK_UNPROCESSED", "link" to "#billing-ops", "provider" to "STRIPE")))
        assertEquals(PushMessage.ReportCaseOpened("COMMENT", "#reports"),
            parsePush(mapOf("type" to "REPORT_CASE_OPENED", "link" to "#reports", "targetType" to "COMMENT")))
        assertEquals(PushMessage.BugReport("#bug-reports"), parsePush(mapOf("type" to "BUG_REPORT", "link" to "#bug-reports")))
        assertEquals(PushMessage.ErrorBurst(42, 60, "#errors"),
            parsePush(mapOf("type" to "ERROR_BURST", "link" to "#errors", "count" to "42", "windowMinutes" to "60")))
        assertEquals(PushMessage.Test("#phones"), parsePush(mapOf("type" to "TEST", "link" to "#phones")))
    }

    @Test
    fun readsTheDigestLeavingUnknownFiguresNull() {
        val digest = parsePush(mapOf(
            "type" to "DAILY_DIGEST", "link" to "#metrics", "day" to "2026-10-28", "orders" to "4",
            "revenue" to """[{"currency":"EUR","amountMinor":18900}]""", "signUps" to "7",
            "costs" to """[{"currency":"EUR","amountMinor":600},{"currency":"USD","amountMinor":3800}]""",
            "heldWithdrawals" to "1", "openReports" to "2",
        ))

        assertEquals(
            PushMessage.DailyDigest(
                day = LocalDate.parse("2026-10-28"), orders = 4, revenue = listOf(Money("EUR", 18_900)), signUps = 7,
                visitors = null, costs = listOf(Money("EUR", 600), Money("USD", 3_800)),
                attention = Attention(1, null, 2, null, null), link = "#metrics",
            ),
            digest,
        )
    }

    @Test
    fun dropsWhatItCannotRead() {
        assertNull(parsePush(mapOf("type" to "SOMETHING_NEW", "link" to "#orders")))
        assertNull(parsePush(mapOf("type" to "TEST")))
        assertNull(parsePush(mapOf("type" to "TEST", "link" to "https://evil.example")))
        assertNull(parsePush(mapOf("type" to "TEST", "link" to "#ORDERS")))
        assertNull(parsePush(mapOf("type" to "ORDER_PAID", "link" to "#orders", "amountMinor" to "x", "currency" to "EUR", "kind" to "ACTIVATION")))
        assertNull(parsePush(mapOf("type" to "ERROR_BURST", "link" to "#errors", "count" to "42")))
        assertNull(parsePush(mapOf("type" to "DAILY_DIGEST", "link" to "#metrics")))
    }

    @Test
    fun aMoneyListThatDoesNotParseIsUnknown() {
        val digest = parsePush(mapOf("type" to "DAILY_DIGEST", "link" to "#metrics", "day" to "2026-10-28", "revenue" to "[{"))
            as PushMessage.DailyDigest
        assertNull(digest.revenue)
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushMessageTest"`
Expected: compilation fails, `parsePush` not found.

- [ ] **Step 3: Write `PushMessage.kt`**

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.summary.Attention
import gr.storywall.admin.summary.Money
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.time.LocalDate
import java.time.format.DateTimeParseException

/** One push from Spring, read from its FCM data (the device contract's §5). [link] is a console section hash. */
sealed interface PushMessage {
    val link: String

    data class OrderPaid(val amount: Money, val kind: String, val plan: String?, override val link: String) : PushMessage
    data class WithdrawalHeld(val amount: Money?, override val link: String) : PushMessage
    data class WebhookUnprocessed(val provider: String, override val link: String) : PushMessage
    data class ReportCaseOpened(val targetType: String, override val link: String) : PushMessage
    data class BugReport(override val link: String) : PushMessage
    data class ErrorBurst(val count: Long, val windowMinutes: Long, override val link: String) : PushMessage
    data class DailyDigest(
        val day: LocalDate,
        val orders: Long?,
        val revenue: List<Money>?,
        val signUps: Long?,
        val visitors: Long?,
        val costs: List<Money>?,
        val attention: Attention,
        override val link: String,
    ) : PushMessage
    data class Test(override val link: String) : PushMessage
}

// A section hash only, so a push can never open an arbitrary address.
private val linkPattern = Regex("^#[a-z][a-z-]{0,39}$")
private val moneyJson = Json { ignoreUnknownKeys = true }

/** Null for a type this app doesn't know or a field it can't read: the push is dropped. */
fun parsePush(data: Map<String, String>): PushMessage? {
    val link = data["link"]?.takeIf(linkPattern::matches) ?: return null
    return when (data["type"]) {
        "ORDER_PAID" -> PushMessage.OrderPaid(money(data) ?: return null, data["kind"] ?: return null, data["plan"], link)
        "WITHDRAWAL_HELD" -> PushMessage.WithdrawalHeld(money(data), link)
        "WEBHOOK_UNPROCESSED" -> PushMessage.WebhookUnprocessed(data["provider"] ?: return null, link)
        "REPORT_CASE_OPENED" -> PushMessage.ReportCaseOpened(data["targetType"] ?: return null, link)
        "BUG_REPORT" -> PushMessage.BugReport(link)
        "ERROR_BURST" -> PushMessage.ErrorBurst(
            data["count"]?.toLongOrNull() ?: return null,
            data["windowMinutes"]?.toLongOrNull() ?: return null,
            link,
        )
        "DAILY_DIGEST" -> PushMessage.DailyDigest(
            day = data["day"]?.let(::day) ?: return null,
            orders = data["orders"]?.toLongOrNull(),
            revenue = moneyList(data["revenue"]),
            signUps = data["signUps"]?.toLongOrNull(),
            visitors = data["visitors"]?.toLongOrNull(),
            costs = moneyList(data["costs"]),
            attention = Attention(
                heldWithdrawals = data["heldWithdrawals"]?.toLongOrNull(),
                unprocessedWebhooks = data["unprocessedWebhooks"]?.toLongOrNull(),
                openReports = data["openReports"]?.toLongOrNull(),
                bugReports24h = data["bugReports24h"]?.toLongOrNull(),
                errors24h = data["errors24h"]?.toLongOrNull(),
            ),
            link = link,
        )
        "TEST" -> PushMessage.Test(link)
        else -> null
    }
}

private fun money(data: Map<String, String>): Money? {
    val minor = data["amountMinor"]?.toLongOrNull() ?: return null
    val currency = data["currency"]?.takeIf { it.isNotBlank() } ?: return null
    return Money(currency, minor)
}

private fun moneyList(raw: String?): List<Money>? = raw?.let {
    try {
        moneyJson.decodeFromString(ListSerializer(Money.serializer()), it)
    } catch (e: IllegalArgumentException) {
        // SerializationException is a subclass.
        null
    }
}

private fun day(raw: String): LocalDate? = try {
    LocalDate.parse(raw)
} catch (e: DateTimeParseException) {
    null
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushMessageTest"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/gr/storywall/admin/push/PushMessage.kt app/src/test/java/gr/storywall/admin/push/PushMessageTest.kt
git commit -m "feat(push): read Spring's push data"
```

### Task C3: Notification text and channels

**Files:**
- Modify: `app/src/main/res/values/strings.xml`, `app/src/main/res/values-el/strings.xml`
- Modify: `app/src/main/java/gr/storywall/admin/format/Formats.kt`
- Create: `app/src/main/java/gr/storywall/admin/push/Channels.kt`
- Create: `app/src/main/java/gr/storywall/admin/push/PushTexts.kt`
- Create: `app/src/test/java/gr/storywall/admin/TestStrings.kt`
- Test: `app/src/test/java/gr/storywall/admin/push/PushTextsTest.kt`

- [ ] **Step 1: Add the strings**

`values/strings.xml`, before `<!-- Unpair -->`:

```xml
    <!-- Notifications -->
    <string name="channel_money">Money</string>
    <string name="channel_sales">Sales</string>
    <string name="channel_reports">Reports</string>
    <string name="channel_errors">Errors</string>
    <string name="channel_digest">Daily digest</string>
    <string name="notifications_off">Notifications are off.</string>
    <string name="notifications_turn_on">Turn on</string>
    <string name="push_order_title">New order: %1$s</string>
    <string name="push_order_upgrade">Upgrade to %1$s</string>
    <string name="push_order_storage">Storage pack</string>
    <string name="push_order_extension">Extension</string>
    <string name="push_withdrawal_title">Withdrawal held for review</string>
    <string name="push_webhook_title">Payment webhook not processed</string>
    <string name="push_report_title">New report</string>
    <string name="push_report_post">Post</string>
    <string name="push_report_comment">Comment</string>
    <string name="push_report_member">Member</string>
    <string name="push_report_story">Story</string>
    <string name="push_report_media">Photo or video</string>
    <string name="push_report_wish">Wish</string>
    <string name="push_report_song">Song suggestion</string>
    <string name="push_bug_title">New bug report</string>
    <string name="push_errors_title">Many errors</string>
    <string name="push_errors_body">%1$s in the last %2$s minutes</string>
    <string name="push_digest_title">Recap · %1$s</string>
    <string name="push_digest_sales">Orders %1$s · Revenue %2$s</string>
    <string name="push_digest_growth">Sign-ups %1$s · Visitors %2$s</string>
    <string name="push_digest_costs">Costs %1$s</string>
    <string name="push_test_title">Test notification</string>
    <string name="push_test_body">Notifications work.</string>
```

`values-el/strings.xml`, same place:

```xml
    <!-- Notifications -->
    <string name="channel_money">Χρήματα</string>
    <string name="channel_sales">Πωλήσεις</string>
    <string name="channel_reports">Αναφορές</string>
    <string name="channel_errors">Σφάλματα</string>
    <string name="channel_digest">Ημερήσια σύνοψη</string>
    <string name="notifications_off">Οι ειδοποιήσεις είναι ανενεργές.</string>
    <string name="notifications_turn_on">Ενεργοποίηση</string>
    <string name="push_order_title">Νέα παραγγελία: %1$s</string>
    <string name="push_order_upgrade">Αναβάθμιση σε %1$s</string>
    <string name="push_order_storage">Πακέτο χώρου</string>
    <string name="push_order_extension">Παράταση</string>
    <string name="push_withdrawal_title">Απόσυρση σε έλεγχο</string>
    <string name="push_webhook_title">Webhook πληρωμής χωρίς επεξεργασία</string>
    <string name="push_report_title">Νέα αναφορά</string>
    <string name="push_report_post">Ανάρτηση</string>
    <string name="push_report_comment">Σχόλιο</string>
    <string name="push_report_member">Μέλος</string>
    <string name="push_report_story">Ιστορία</string>
    <string name="push_report_media">Φωτογραφία ή βίντεο</string>
    <string name="push_report_wish">Ευχή</string>
    <string name="push_report_song">Πρόταση τραγουδιού</string>
    <string name="push_bug_title">Νέα αναφορά προβλήματος</string>
    <string name="push_errors_title">Πολλά σφάλματα</string>
    <string name="push_errors_body">%1$s τα τελευταία %2$s λεπτά</string>
    <string name="push_digest_title">Σύνοψη · %1$s</string>
    <string name="push_digest_sales">Παραγγελίες %1$s · Έσοδα %2$s</string>
    <string name="push_digest_growth">Εγγραφές %1$s · Επισκέπτες %2$s</string>
    <string name="push_digest_costs">Κόστη %1$s</string>
    <string name="push_test_title">Δοκιμαστική ειδοποίηση</string>
    <string name="push_test_body">Οι ειδοποιήσεις λειτουργούν.</string>
```

- [ ] **Step 2: Add a day format to `Formats`**

In `Formats.kt`, after `shortDate` (import `java.time.LocalDate`):

```kotlin
    fun day(day: LocalDate, locale: Locale): String = DateTimeFormatter.ofPattern("d MMM", locale).format(day)
```

- [ ] **Step 3: Write the test helper and the failing test**

`app/src/test/java/gr/storywall/admin/TestStrings.kt`:

```kotlin
package gr.storywall.admin

import org.w3c.dom.Element
import java.io.File
import java.util.Locale
import javax.xml.parsers.DocumentBuilderFactory

/** The app's English strings, looked up by resource id, so text tests read what the phone shows. */
object TestStrings {
    private val byName: Map<String, String> by lazy {
        val file = File("src/main/res/values/strings.xml")
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).getElementsByTagName("string")
        (0 until nodes.length).map { nodes.item(it) as Element }
            .associate { it.getAttribute("name") to it.textContent.replace("\\'", "'") }
    }
    private val names: Map<Int, String> by lazy {
        R.string::class.java.fields.associate { it.getInt(null) to it.name }
    }

    fun get(id: Int, vararg args: Any): String = String.format(Locale.ENGLISH, byName.getValue(names.getValue(id)), *args)
}
```

`PushTextsTest.kt`:

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.TestStrings
import gr.storywall.admin.summary.Attention
import gr.storywall.admin.summary.Money
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.util.Locale

class PushTextsTest {

    private val texts = PushTexts(TestStrings::get, Locale.UK)

    @Test
    fun anOrderNamesItsAmountAndWhatWasBought() {
        assertEquals(PushText("New order: €189", "Premium"),
            texts.of(PushMessage.OrderPaid(Money("EUR", 18_900), "ACTIVATION", "Premium", "#orders")))
        assertEquals(PushText("New order: €20", "Upgrade to Premium"),
            texts.of(PushMessage.OrderPaid(Money("EUR", 2_000), "UPGRADE", "Premium", "#orders")))
        assertEquals(PushText("New order: €12.50", "Storage pack"),
            texts.of(PushMessage.OrderPaid(Money("EUR", 1_250), "STORAGE_PACK", "Premium", "#orders")))
        assertEquals(PushText("New order: €30", "Extension"),
            texts.of(PushMessage.OrderPaid(Money("EUR", 3_000), "EXTENSION", null, "#orders")))
        assertEquals(PushText("New order: €30", null),
            texts.of(PushMessage.OrderPaid(Money("EUR", 3_000), "SOMETHING_NEW", "Premium", "#orders")))
    }

    @Test
    fun moneyAndReportsSayWhatHappened() {
        assertEquals(PushText("Withdrawal held for review", "€45"),
            texts.of(PushMessage.WithdrawalHeld(Money("EUR", 4_500), "#withdrawals")))
        assertEquals(PushText("Withdrawal held for review", null), texts.of(PushMessage.WithdrawalHeld(null, "#withdrawals")))
        assertEquals(PushText("Payment webhook not processed", "Stripe"),
            texts.of(PushMessage.WebhookUnprocessed("STRIPE", "#billing-ops")))
        assertEquals(PushText("New report", "Photo or video"), texts.of(PushMessage.ReportCaseOpened("MEDIA", "#reports")))
        assertEquals(PushText("New report", null), texts.of(PushMessage.ReportCaseOpened("SOMETHING_NEW", "#reports")))
        assertEquals(PushText("New bug report", null), texts.of(PushMessage.BugReport("#bug-reports")))
        assertEquals(PushText("Many errors", "42 in the last 60 minutes"), texts.of(PushMessage.ErrorBurst(42, 60, "#errors")))
        assertEquals(PushText("Test notification", "Notifications work."), texts.of(PushMessage.Test("#phones")))
    }

    @Test
    fun theDigestShowsSalesFirstAndEverythingWhenExpanded() {
        val text = texts.of(PushMessage.DailyDigest(
            day = LocalDate.parse("2026-10-28"), orders = 4, revenue = listOf(Money("EUR", 18_900)), signUps = 7,
            visitors = null, costs = listOf(Money("EUR", 600), Money("USD", 3_800)),
            attention = Attention(1, null, 2, null, null), link = "#metrics",
        ))

        assertEquals("Recap · 28 Oct", text.title)
        assertEquals("Orders 4 · Revenue €189", text.body)
        assertEquals(
            "Orders 4 · Revenue €189\nSign-ups 7 · Visitors –\nCosts €6 + US\$38\nWithdrawals 1 · Reports 2",
            text.expanded,
        )
    }

    @Test
    fun aQuietDayHasNoNeedsYouLine() {
        val text = texts.of(PushMessage.DailyDigest(LocalDate.parse("2026-10-28"), 0, emptyList(), 0, 0, emptyList(),
            Attention(null, null, null, null, null), "#metrics"))

        assertEquals("Orders 0 · Revenue 0\nSign-ups 0 · Visitors 0\nCosts 0", text.expanded)
    }
}
```

The USD symbol in `Locale.UK` is `US$`; if `FormatsTest` shows the JVM formats it differently, use what `FormatsTest` asserts.

- [ ] **Step 4: Run it to see it fail**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushTextsTest"`
Expected: compilation fails, `PushTexts` not found.

- [ ] **Step 5: Write `PushTexts.kt` and `Channels.kt`**

`PushTexts.kt`:

```kotlin
package gr.storywall.admin.push

import androidx.annotation.StringRes
import gr.storywall.admin.R
import gr.storywall.admin.format.Formats
import java.util.Locale

/** A notification's text. [expanded] is the long form, when there is one. */
data class PushText(val title: String, val body: String?, val expanded: String? = null)

/** Writes each push in the phone's language. [string] is `Context.getString`. */
class PushTexts(private val string: (Int, Array<out Any>) -> String, private val locale: Locale) {

    private fun s(@StringRes id: Int, vararg args: Any) = string(id, args)

    fun of(message: PushMessage): PushText = when (message) {
        is PushMessage.OrderPaid -> PushText(
            s(R.string.push_order_title, Formats.money(listOf(message.amount), locale)),
            when (message.kind) {
                "ACTIVATION" -> message.plan
                "UPGRADE" -> message.plan?.let { s(R.string.push_order_upgrade, it) }
                "STORAGE_PACK" -> s(R.string.push_order_storage)
                "EXTENSION" -> s(R.string.push_order_extension)
                else -> null
            },
        )
        is PushMessage.WithdrawalHeld -> PushText(
            s(R.string.push_withdrawal_title),
            message.amount?.let { Formats.money(listOf(it), locale) },
        )
        is PushMessage.WebhookUnprocessed -> PushText(
            s(R.string.push_webhook_title),
            message.provider.lowercase(locale).replaceFirstChar { it.titlecase(locale) },
        )
        is PushMessage.ReportCaseOpened -> PushText(s(R.string.push_report_title), reportLabel(message.targetType))
        is PushMessage.BugReport -> PushText(s(R.string.push_bug_title), null)
        is PushMessage.ErrorBurst -> PushText(
            s(R.string.push_errors_title),
            s(R.string.push_errors_body, Formats.count(message.count, locale), Formats.count(message.windowMinutes, locale)),
        )
        is PushMessage.DailyDigest -> digest(message)
        is PushMessage.Test -> PushText(s(R.string.push_test_title), s(R.string.push_test_body))
    }

    private fun reportLabel(targetType: String): String? = when (targetType) {
        "POST" -> s(R.string.push_report_post)
        "COMMENT" -> s(R.string.push_report_comment)
        "MEMBER" -> s(R.string.push_report_member)
        "STORY" -> s(R.string.push_report_story)
        "MEDIA" -> s(R.string.push_report_media)
        "WISHBOOK_ENTRY" -> s(R.string.push_report_wish)
        "PLAYLIST_SUGGESTION" -> s(R.string.push_report_song)
        else -> null
    }

    private fun digest(message: PushMessage.DailyDigest): PushText {
        val sales = s(R.string.push_digest_sales, Formats.count(message.orders, locale), Formats.money(message.revenue, locale))
        val growth = s(R.string.push_digest_growth, Formats.count(message.signUps, locale), Formats.count(message.visitors, locale))
        val costs = s(R.string.push_digest_costs, Formats.money(message.costs, locale))
        val attention = message.attention
        val needsYou = listOf(
            R.string.widget_withdrawals to attention.heldWithdrawals,
            R.string.widget_webhooks to attention.unprocessedWebhooks,
            R.string.widget_reports to attention.openReports,
            R.string.widget_bug_reports to attention.bugReports24h,
            R.string.widget_errors to attention.errors24h,
        ).filter { (_, count) -> count != null && count > 0 }
            .joinToString(" · ") { (label, count) -> "${s(label)} ${Formats.count(count, locale)}" }
        val lines = listOf(sales, growth, costs) + listOfNotNull(needsYou.ifEmpty { null })
        return PushText(s(R.string.push_digest_title, Formats.day(message.day, locale)), sales, lines.joinToString("\n"))
    }
}
```

`Channels.kt`:

```kotlin
package gr.storywall.admin.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import gr.storywall.admin.R

/** The five channels. Each can be turned off in Android's settings, so the app has no settings screen. */
enum class Channel(val id: String, val title: Int, val importance: Int) {
    MONEY("money", R.string.channel_money, NotificationManager.IMPORTANCE_HIGH),
    SALES("sales", R.string.channel_sales, NotificationManager.IMPORTANCE_HIGH),
    REPORTS("reports", R.string.channel_reports, NotificationManager.IMPORTANCE_HIGH),
    ERRORS("errors", R.string.channel_errors, NotificationManager.IMPORTANCE_HIGH),
    DIGEST("digest", R.string.channel_digest, NotificationManager.IMPORTANCE_DEFAULT);

    companion object {
        fun of(message: PushMessage): Channel = when (message) {
            is PushMessage.OrderPaid, is PushMessage.Test -> SALES
            is PushMessage.WithdrawalHeld, is PushMessage.WebhookUnprocessed -> MONEY
            is PushMessage.ReportCaseOpened, is PushMessage.BugReport -> REPORTS
            is PushMessage.ErrorBurst -> ERRORS
            is PushMessage.DailyDigest -> DIGEST
        }

        /** Safe to call on every start: it also renames the channels after a language change. */
        fun createAll(context: Context) {
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannels(entries.map { NotificationChannel(it.id, context.getString(it.title), it.importance) })
        }
    }
}
```

- [ ] **Step 6: Run the tests and lint**

Run: `./gradlew :app:testDebugUnitTest :app:lintDebug`
Expected: PASS; lint shows no missing translations.

- [ ] **Step 7: Commit**

```bash
git add app/src/main/res app/src/main/java/gr/storywall/admin/format/Formats.kt app/src/main/java/gr/storywall/admin/push app/src/test/java/gr/storywall/admin
git commit -m "feat(push): notification text in English and Greek, five channels"
```

### Task C4: Uploading the token

**Files:**
- Create: `app/src/main/java/gr/storywall/admin/push/PushTokenClient.kt`
- Create: `app/src/main/java/gr/storywall/admin/push/PushTokenStore.kt`
- Create: `app/src/main/java/gr/storywall/admin/push/PushTokenSync.kt`
- Test: `app/src/test/java/gr/storywall/admin/push/PushTokenClientTest.kt`
- Test: `app/src/test/java/gr/storywall/admin/push/PushTokenSyncTest.kt`

- [ ] **Step 1: Write the client test**

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.pairing.Pairing
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class PushTokenClientTest {

    private val server = MockWebServer()
    private val client = PushTokenClient(OkHttpClient())

    @Before
    fun start() = server.start()

    @After
    fun stop() = server.close()

    private fun pairing() = Pairing(server.url("/").toString().trimEnd('/'), "k3Jx0mQ2bZ8pYw5uT1vN7aR4sD6fG9hLcE-oIiXyUeA")

    @Test
    fun putsTheTokenWithTheDeviceKey() = runTest {
        server.enqueue(MockResponse.Builder().code(204).build())

        assertEquals(UploadResult.Uploaded, client.upload(pairing(), "fcm-token"))

        val request = server.takeRequest()
        assertEquals("PUT", request.method)
        assertEquals("/api/device/push-token", request.url.encodedPath)
        assertEquals("Device k3Jx0mQ2bZ8pYw5uT1vN7aR4sD6fG9hLcE-oIiXyUeA", request.headers["Authorization"])
        assertEquals("""{"token":"fcm-token"}""", request.body?.utf8())
    }

    @Test
    fun eachAnswerHasItsOutcome() = runTest {
        server.enqueue(MockResponse.Builder().code(401).build())
        server.enqueue(MockResponse.Builder().code(400).build())
        server.enqueue(MockResponse.Builder().code(429).build())
        server.enqueue(MockResponse.Builder().code(503).build())

        assertEquals(UploadResult.Revoked, client.upload(pairing(), "t"))
        assertEquals(UploadResult.Rejected, client.upload(pairing(), "t"))
        assertEquals(UploadResult.Unavailable, client.upload(pairing(), "t"))
        assertEquals(UploadResult.Unavailable, client.upload(pairing(), "t"))
    }
}
```

Match `request.url`/`request.body` to the MockWebServer 3 API that `SummaryClientTest` uses, if it differs.

- [ ] **Step 2: Write the sync test**

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.MemoryDataStore
import gr.storywall.admin.pairing.Pairing
import gr.storywall.admin.pairing.PairingStore
import gr.storywall.admin.pairing.SecretBox
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PushTokenSyncTest {

    private val plainBox = object : SecretBox {
        override fun seal(plain: ByteArray) = plain
        override fun open(sealed: ByteArray) = sealed
    }
    private val pairings = PairingStore(MemoryDataStore(), plainBox)
    private val store = PushTokenStore(MemoryDataStore())
    private val uploads = mutableListOf<String>()
    private var answer: UploadResult = UploadResult.Uploaded
    private var revoked = 0
    private var token: suspend () -> String = { "t-1" }
    private val sync = PushTokenSync(pairings, store, { _, t -> uploads += t; answer }, { token() }, { revoked++ })
    private val pairing = Pairing("https://api.example.com", "k3Jx0mQ2bZ8pYw5uT1vN7aR4sD6fG9hLcE-oIiXyUeA")

    @Test
    fun uploadsOncePerPairing() = runTest {
        pairings.save(pairing)

        assertEquals(SyncOutcome.Done, sync.run())
        assertEquals(SyncOutcome.Done, sync.run())

        assertEquals(listOf("t-1"), uploads)
        assertEquals("t-1", store.uploaded())
    }

    @Test
    fun aNewTokenIsUploadedAgain() = runTest {
        pairings.save(pairing)
        sync.run()
        token = { "t-2" }

        sync.run()

        assertEquals(listOf("t-1", "t-2"), uploads)
    }

    @Test
    fun notPairedUploadsNothing() = runTest {
        assertEquals(SyncOutcome.Done, sync.run())
        assertEquals(emptyList<String>(), uploads)
    }

    @Test
    fun anUnreachableApiOrFirebaseRetries() = runTest {
        pairings.save(pairing)
        answer = UploadResult.Unavailable
        assertEquals(SyncOutcome.Retry, sync.run())
        assertNull(store.uploaded())

        token = { throw java.io.IOException("SERVICE_NOT_AVAILABLE") }
        assertEquals(SyncOutcome.Retry, sync.run())
    }

    @Test
    fun aRemovedPhoneHandsOverToTheSummaryRefresh() = runTest {
        pairings.save(pairing)
        answer = UploadResult.Revoked

        assertEquals(SyncOutcome.Done, sync.run())
        assertEquals(1, revoked)
        assertNull(store.uploaded())
    }
}
```

Match `SecretBox`'s method names to the interface in `pairing/SecretBox.kt` (the step-2 `PairingStoreTest` has a fake to copy).

- [ ] **Step 3: Run them to see them fail**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushToken*"`
Expected: compilation fails, `PushTokenClient` not found.

- [ ] **Step 4: Write the three files**

`PushTokenClient.kt`:

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.pairing.Pairing
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

sealed interface UploadResult {
    data object Uploaded : UploadResult

    /** 401: the phone was removed. The summary refresh handles it. */
    data object Revoked : UploadResult

    /** Another 4xx: Spring won't take this token, and asking again won't change that. */
    data object Rejected : UploadResult

    /** 429, 5xx, a timeout, no network. Try again later. */
    data object Unavailable : UploadResult
}

fun interface PushTokenUploader {
    suspend fun upload(pairing: Pairing, token: String): UploadResult
}

@Serializable
private data class TokenBody(val token: String)

/** `PUT /api/device/push-token`. [onProblem] gets an HTTP code or exception class, never the key or token. */
class PushTokenClient(
    private val http: OkHttpClient,
    private val onProblem: (String) -> Unit = {},
) : PushTokenUploader {
    override suspend fun upload(pairing: Pairing, token: String): UploadResult = withContext(Dispatchers.IO) {
        val body = Json.encodeToString(TokenBody.serializer(), TokenBody(token)).toRequestBody(JSON)
        val request = Request.Builder()
            .url("${pairing.api}/api/device/push-token")
            .header("Authorization", "Device ${pairing.key}")
            .put(body)
            .build()
        try {
            http.newCall(request).execute().use { response ->
                when {
                    response.isSuccessful -> UploadResult.Uploaded
                    response.code == 401 -> UploadResult.Revoked
                    response.code == 429 || response.code >= 500 -> problem("HTTP ${response.code}", UploadResult.Unavailable)
                    else -> problem("HTTP ${response.code}", UploadResult.Rejected)
                }
            }
        } catch (e: IOException) {
            problem(e.javaClass.simpleName, UploadResult.Unavailable)
        }
    }

    private fun problem(reason: String, result: UploadResult): UploadResult {
        onProblem(reason)
        return result
    }

    private companion object {
        val JSON = "application/json".toMediaType()
    }
}
```

`PushTokenStore.kt`:

```kotlin
package gr.storywall.admin.push

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Which Firebase token this pairing already has on Spring, and whether the app has asked for notifications. */
class PushTokenStore(private val store: DataStore<Preferences>) {

    suspend fun uploaded(): String? = store.data.first()[UPLOADED]

    suspend fun saveUploaded(token: String) {
        store.edit { it[UPLOADED] = token }
    }

    /** On pairing and unpairing: the next pairing must upload again. */
    suspend fun clearUploaded() {
        store.edit { it.remove(UPLOADED) }
    }

    val askedForNotifications: Flow<Boolean> = store.data.map { it[ASKED] == true }

    suspend fun markAskedForNotifications() {
        store.edit { it[ASKED] = true }
    }

    private companion object {
        val UPLOADED = stringPreferencesKey("uploaded_token")
        val ASKED = booleanPreferencesKey("asked_for_notifications")
    }
}
```

`PushTokenSync.kt`:

```kotlin
package gr.storywall.admin.push

import gr.storywall.admin.pairing.PairingStore
import kotlinx.coroutines.CancellationException

enum class SyncOutcome { Done, Retry }

/** Uploads the phone's Firebase token when this pairing doesn't have it yet. */
class PushTokenSync(
    private val pairings: PairingStore,
    private val store: PushTokenStore,
    private val uploader: PushTokenUploader,
    private val token: suspend () -> String,
    private val onRevoked: suspend () -> Unit,
) {
    suspend fun run(): SyncOutcome {
        val pairing = pairings.current() ?: return SyncOutcome.Done
        val current = try {
            token()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Firebase couldn't give a token yet (no Play services connection, for one).
            return SyncOutcome.Retry
        }
        if (store.uploaded() == current) return SyncOutcome.Done
        return when (uploader.upload(pairing, current)) {
            UploadResult.Uploaded -> {
                // An unpair or a new pairing while the request ran wins over its answer.
                if (pairings.current() == pairing) store.saveUploaded(current)
                SyncOutcome.Done
            }
            UploadResult.Revoked -> {
                onRevoked()
                SyncOutcome.Done
            }
            UploadResult.Rejected -> SyncOutcome.Done
            UploadResult.Unavailable -> SyncOutcome.Retry
        }
    }
}
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew :app:testDebugUnitTest --tests "gr.storywall.admin.push.PushToken*"`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/gr/storywall/admin/push app/src/test/java/gr/storywall/admin/push
git commit -m "feat(push): upload the Firebase token once per pairing"
```

### Task C5: Wiring the token into the app

**Files:**
- Create: `app/src/main/java/gr/storywall/admin/push/PushTokenWorker.kt`
- Create: `app/src/main/java/gr/storywall/admin/push/PushTokens.kt`
- Modify: `app/src/main/java/gr/storywall/admin/AppGraph.kt`
- Modify: `app/src/main/java/gr/storywall/admin/AdminApp.kt`
- Modify: `app/src/main/java/gr/storywall/admin/pairing/PhonePairing.kt`
- Modify: `app/src/main/java/gr/storywall/admin/ui/HomeViewModel.kt`

- [ ] **Step 1: The worker and the entry points**

`PushTokenWorker.kt`:

```kotlin
package gr.storywall.admin.push

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import gr.storywall.admin.graph

class PushTokenWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = when (applicationContext.graph.pushTokenSync.run()) {
        SyncOutcome.Done -> Result.success()
        SyncOutcome.Retry -> Result.retry()
    }
}
```

`PushTokens.kt`:

```kotlin
package gr.storywall.admin.push

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import gr.storywall.admin.graph
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit

object PushTokens {
    private const val SYNC = "push-token"
    private const val TAG = "StoryWallAdmin"

    /** Whether this build has Firebase: `google-services.json` listed its package at build time. */
    fun available(context: Context) = FirebaseApp.getApps(context).isNotEmpty()

    /** Uploads the token if this pairing doesn't have it. Backs off from a minute while Spring can't be reached. */
    fun sync(context: Context) {
        if (!available(context)) return
        val request = OneTimeWorkRequestBuilder<PushTokenWorker>()
            .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(SYNC, ExistingWorkPolicy.REPLACE, request)
    }

    /** The current token, for [PushTokenSync]. */
    suspend fun current(): String = FirebaseMessaging.getInstance().token.await()

    /** On unpair: Firebase stops delivering to this phone, and the next pairing uploads a fresh token. */
    suspend fun forget(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(SYNC)
        context.graph.pushTokenStore.clearUploaded()
        if (!available(context)) return
        try {
            FirebaseMessaging.getInstance().deleteToken().await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't delete the push token: ${e.javaClass.simpleName}")
        }
    }
}
```

- [ ] **Step 2: AppGraph**

Replace the body of `AppGraph` so the pairing store is shared:

```kotlin
private val Context.pairingData by preferencesDataStore(name = "pairing")
private val Context.snapshotData by preferencesDataStore(name = "snapshot")
private val Context.pushData by preferencesDataStore(name = "push")

/** The app's singletons. */
class AppGraph(context: Context) {
    private val pairings = PairingStore(context.pairingData, KeystoreBox())

    val repository = SummaryRepository(
        pairings = pairings,
        snapshots = SnapshotStore(context.snapshotData),
        source = SummaryClient(SummaryClient.defaultHttp()) { Log.w("StoryWallAdmin", "Summary unavailable: $it") },
    )

    val pushTokenStore = PushTokenStore(context.pushData)

    val pushTokenSync = PushTokenSync(
        pairings = pairings,
        store = pushTokenStore,
        uploader = PushTokenClient(SummaryClient.defaultHttp()) { Log.w("StoryWallAdmin", "Push token not uploaded: $it") },
        token = PushTokens::current,
        // Spring said 401: the summary refresh sees the same 401 and shows "Pair again".
        onRevoked = { RefreshScheduler.refreshNow(context) },
    )
}
```

Imports: `gr.storywall.admin.push.PushTokenClient`, `PushTokenStore`, `PushTokenSync`, `PushTokens`, `gr.storywall.admin.refresh.RefreshScheduler`. `context` here is the application context (`AdminApp` passes `this`).

- [ ] **Step 3: Start, pair, unpair**

`AdminApp.kt`:

```kotlin
class AdminApp : Application() {
    val graph by lazy { AppGraph(this) }

    override fun onCreate() {
        super.onCreate()
        Channel.createAll(this)
    }
}
```

(import `gr.storywall.admin.push.Channel`). In `PhonePairing.kt`, `pairPhone` after `repository.pair(pairing)`:

```kotlin
    context.graph.pushTokenStore.clearUploaded()
    PushTokens.sync(context)
```

and `unpairPhone`, first line:

```kotlin
    PushTokens.forget(context)
```

In `HomeViewModel.init`, inside `if (repository.isPaired())`, add `PushTokens.sync(app)` (a no-op once uploaded).

- [ ] **Step 4: Build and test**

Run: `./gradlew :app:testDebugUnitTest :app:assembleDebug`
Expected: tests PASS; the build still fails only on the missing `AdminMessagingService` (Task C6).

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/gr/storywall/admin
git commit -m "feat(push): sync the token on pairing and start, forget it on unpair"
```

### Task C6: Showing notifications

**Files:**
- Create: `app/src/main/res/drawable/ic_notification.xml`
- Create: `app/src/main/java/gr/storywall/admin/push/Notifications.kt`
- Create: `app/src/main/java/gr/storywall/admin/push/AdminMessagingService.kt`

- [ ] **Step 1: The small icon**

`ic_notification.xml` (a bell, white on transparent as Android requires):

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32L13.5,4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z" />
</vector>
```

- [ ] **Step 2: `Notifications.kt`**

```kotlin
package gr.storywall.admin.push

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import gr.storywall.admin.BuildConfig
import gr.storywall.admin.R
import gr.storywall.admin.format.ConsoleLinks
import java.util.concurrent.atomic.AtomicInteger

object Notifications {
    // The digest and the test replace their previous copy; every alert is its own notification.
    private const val DIGEST_ID = 1
    private const val TEST_ID = 2
    private val nextId = AtomicInteger((System.currentTimeMillis() and 0xFFFFFF).toInt() + 100)

    /** Posts [message] in the phone's language; a tap opens its console section in the browser. */
    @SuppressLint("MissingPermission") // areNotificationsEnabled() is the check on every Android version.
    fun show(context: Context, message: PushMessage) {
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        val text = PushTexts({ id, args -> context.getString(id, *args) }, context.resources.configuration.locales[0]).of(message)
        val id = when (message) {
            is PushMessage.DailyDigest -> DIGEST_ID
            is PushMessage.Test -> TEST_ID
            else -> nextId.getAndIncrement()
        }
        val open = PendingIntent.getActivity(
            context,
            id,
            Intent(Intent.ACTION_VIEW, Uri.parse(ConsoleLinks.url(BuildConfig.SITE_URL, message.link))),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, Channel.of(message).id)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(text.title)
            .setContentText(text.body)
            .setStyle(text.expanded?.let { NotificationCompat.BigTextStyle().bigText(it) })
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        manager.notify(id, notification)
    }
}
```

- [ ] **Step 3: `AdminMessagingService.kt`**

```kotlin
package gr.storywall.admin.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import gr.storywall.admin.graph
import kotlinx.coroutines.runBlocking

/** Firebase's entry point. Runs on Firebase's own background thread. */
class AdminMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        PushTokens.sync(applicationContext)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val push = parsePush(message.data)
        if (push == null) {
            Log.w("StoryWallAdmin", "Push dropped: unknown type ${message.data["type"]}")
            return
        }
        // A push already on its way when the phone was unpaired.
        if (!runBlocking { applicationContext.graph.repository.isPaired() }) return
        Notifications.show(applicationContext, push)
    }
}
```

- [ ] **Step 4: Build, test, lint**

Run: `./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`
Expected: all PASS, lint 0 issues, an APK.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/res/drawable/ic_notification.xml app/src/main/java/gr/storywall/admin/push
git commit -m "feat(push): show each push and open its console section on tap"
```

### Task C7: The notification permission

**Files:**
- Create: `app/src/main/java/gr/storywall/admin/ui/NotificationPrompt.kt`
- Modify: `app/src/main/java/gr/storywall/admin/ui/HomeViewModel.kt`
- Modify: `app/src/main/java/gr/storywall/admin/ui/HomeRoute.kt`
- Modify: `app/src/main/java/gr/storywall/admin/ui/SummaryScreen.kt`

- [ ] **Step 1: ViewModel state**

In `HomeViewModel`:

```kotlin
    private val pushTokenStore = app.graph.pushTokenStore

    /** False when this build has no Firebase; the app then shows no notifications row. */
    val pushAvailable: Boolean = PushTokens.available(app)

    val askedForNotifications: StateFlow<Boolean> =
        pushTokenStore.askedForNotifications.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    fun markAskedForNotifications() {
        viewModelScope.launch { pushTokenStore.markAskedForNotifications() }
    }
```

- [ ] **Step 2: `NotificationPrompt.kt`**

```kotlin
package gr.storywall.admin.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.LocalActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import gr.storywall.admin.R

/**
 * What "Turn on" does, or null when there is nothing to ask: Android 12 (no permission needed),
 * already allowed, or no push in this build. Once Android stops showing its own dialog, "Turn on"
 * opens the app's notification settings instead.
 */
@Composable
fun rememberNotificationPrompt(viewModel: HomeViewModel): (() -> Unit)? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || !viewModel.pushAvailable) return null
    val context = LocalContext.current
    val activity = LocalActivity.current ?: return null
    var allowed by remember { mutableStateOf(notificationsAllowed(context)) }
    // Re-read on return: the user may have turned it on in Android's settings.
    LifecycleResumeEffect(Unit) {
        allowed = notificationsAllowed(context)
        onPauseOrDispose { }
    }
    val asked by viewModel.askedForNotifications.collectAsStateWithLifecycle()
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed = it }
    if (allowed) return null
    return {
        if (asked && !activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
            context.startActivity(
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
            )
        } else {
            viewModel.markAskedForNotifications()
            launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}

private fun notificationsAllowed(context: Context) =
    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

@Composable
fun NotificationsRow(onTurnOn: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(stringResource(R.string.notifications_off), style = MaterialTheme.typography.bodyMedium)
        TextButton(onClick = onTurnOn) { Text(stringResource(R.string.notifications_turn_on)) }
    }
}
```

- [ ] **Step 3: Show it**

In `HomeRoute`, in the `is AdminState.Paired ->` branch, pass `onTurnOnNotifications = rememberNotificationPrompt(viewModel)`. Call `rememberNotificationPrompt` unconditionally at the top of `HomeRoute` (composables must not be called inside a `when` branch that can change), and pass the value down.

In `SummaryScreen`, add the parameter `onTurnOnNotifications: (() -> Unit)?` and, right after `item { Header(status) }`:

```kotlin
                // Notifications
                if (onTurnOnNotifications != null) {
                    item { NotificationsRow(onTurnOnNotifications) }
                }
```

- [ ] **Step 4: Build and lint**

Run: `./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`
Expected: PASS, lint 0 issues.

- [ ] **Step 5: Check on the emulator (API 36), without Firebase**

Install the debug APK on the emulator, pair from adb (README). Expected: no notifications row (no `google-services.json` in this build), the summary as before, Unpair still works.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/gr/storywall/admin/ui
git commit -m "feat(push): ask for the notification permission on the app screen"
```

### Task C8: Notes

- [ ] **Step 1: Update the app's README**

Add a "Notifications" section: the five channels, that each can be turned off in Android's settings, that Unpair stops notifications, and the logcat filter used for checks: `adb logcat -s StoryWallAdmin FirebaseMessaging`.

- [ ] **Step 2: Note changes in the step-2 plan's style**

Add `## Changes made while building` to this plan (Part C) for anything that differed.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: notifications"
```

---

## Part D: Before staging

- [ ] **Step 1: Ask the user** (AskUserQuestion) whether to push the Spring and website branches and open PRs into `staging`. Only on a yes: push, open the PRs with `🤖 Generated with [Claude Code](https://claude.com/claude-code)` at the end of each description, bind them with the ccd_pr tools, and wait for CI. Before merging: bring each branch up to date with `staging` and rerun the checks.
- [ ] **Step 2: Ask** whether the user has done the Firebase setup (the section above) and set `FIREBASE_SERVICE_ACCOUNT` on staging Railway.
- [ ] **Step 3: Merge** only when the user says so, then check staging's API health and that the Phones drawer shows the new button.

## Part E: On the S25 against staging

The user watches the phone. I read only filtered logcat (`adb logcat -s StoryWallAdmin FirebaseMessaging`) and the staging console. No `adb screencap`.

### Task E1: Test push

- [ ] Build the debug APK with `app/google-services.json` in place; `adb install -r app/build/outputs/apk/debug/app-debug.apk`.
- [ ] In the staging console (staging.storywall.gr/admin#phones): Add phone; scan with the app.
- [ ] On the phone: "Turn on" → Allow. In the console, the phone's Notifications shows On.
- [ ] "Send test notification" → "Sent." and the phone shows "Test notification". Tap: the browser opens `#phones`.

### Task E2: Each alert

- [ ] **ORDER_PAID:** the user pays for a staging event with Stripe's test card (I can't make payments on a hosted site). The phone shows "New order: …".
- [ ] **REPORT_CASE_OPENED:** report a post on a staging event from another member account. A second report on the same post sends nothing.
- [ ] **BUG_REPORT:** send a bug report from the staging site.
- [ ] **WITHDRAWAL_HELD:** request a withdrawal that the staging hold rules hold (or a staging event with the manual hold), if the user wants it covered live; otherwise covered by tests.
- [ ] **WEBHOOK_UNPROCESSED:** covered by tests only; it can't be caused on purpose without breaking a real delivery.
- [ ] **ERROR_BURST:** with the user's OK, set `PUSH_ERROR_BURST_THRESHOLD=1` on staging, cause one error (a client error report from the staging site), wait for the 5-minute check, then remove the variable.
- [ ] **DAILY_DIGEST:** the next morning at 09:00, or with the user's OK set `PUSH_DIGEST_CRON` on staging to a few minutes ahead, then remove it.

### Task E3: Unpair and remove

- [ ] Unpair in the app, then "Send test notification" for that phone in the console: 409 "notifications are off" and the pill turns Off (the token was dead).
- [ ] Pair again, then Remove phone in the console: no further alerts arrive on that phone.

---

## Self-review

- **Spec coverage:** instant alerts (A7–A12), digest (A13), test endpoint and button (A6, B2), Firebase sending with the off switch and dead tokens (A1–A5), app token upload (C4–C5), channels and text (C3), taps (C6), permission (C7), revoking on role loss (A14), the step-1 constraints (A4: revoked rows, active admins, once per token). Distribution and the Play Store stay out of scope.
- **Names checked across tasks:** `AdminAlert.payload()`, `AdminPushService.send/sendTest`, `FcmClient.send(token, data, urgent)`, `FcmResult`, `ErrorBurstCounter.record/countWithin`, `DailyDigest`, `PushTokenSync.run`, `SyncOutcome`, `UploadResult`, `PushTokens.sync/forget/current/available`, `Channel.of/createAll`, `PushTexts.of`, `PushText`.
- **Verify while building (step-1 code that may differ from what this plan assumes):** `ApiException.getErrorCode()`, `PaymentProvider.signatureHeader()`, `WebhookLedger.claim(...)`'s arguments, `SecretBox`'s method names, the MockWebServer 3 request API, the `US$` symbol in `FormatsTest`.
