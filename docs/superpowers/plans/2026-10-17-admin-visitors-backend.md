# Admin Visitors Section — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/admin/metrics/visitors`, which reads the GA4 Data API with a service account and answers visitors, visits, sign-ups per channel, landing pages, language, device and landing page events for a date range, cached for an hour.

**Architecture:** A small `GoogleAnalyticsClient` posts `batchRunReports` over `java.net.http.HttpClient` (same style as `BrevoContactsClient`) with a token from `google-auth-library-oauth2-http`. `GaSourceMapping` turns GA's source/medium into the `VisitSourceDto` that `SignupSourceRules` already classifies, so visitors and sign-ups share one set of channel rules. `VisitorReports` holds the report definitions and turns rows into `VisitorMetricsDto` (pure, unit-tested). `VisitorMetricsService` handles configuration, dates, the Caffeine cache and the sign-up counts from `FunnelMetricsService.channels`.

**Tech Stack:** Spring Boot 3.3, Java 21, Jackson, Caffeine, JUnit 5, Mockito, `com.sun.net.httpserver.HttpServer` for the client test.

**Spec:** `docs/superpowers/specs/2026-10-17-admin-visitors-section-design.md` in the storywall repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be). Run every command there.

---

## File structure

| File | Responsibility |
|---|---|
| `build.gradle` | add `google-auth-library-oauth2-http` |
| `src/main/resources/application.properties` | `app.analytics.ga.*` from env |
| `src/main/java/event_social_media/config/GoogleAnalyticsProperties.java` | settings + `isConfigured()` |
| `src/main/java/event_social_media/config/CacheConfig.java` | new `gaVisitors` cache |
| `src/main/java/event_social_media/exception/ErrorCode.java` | `GOOGLE_ANALYTICS_UNAVAILABLE(9002)` |
| `src/main/java/event_social_media/exception/GoogleAnalyticsUnavailableException.java` | 503, carries GA's status |
| `src/main/java/event_social_media/service/platform/ga/GaReportRequest.java` | one report's dimensions/metrics/filter |
| `src/main/java/event_social_media/service/platform/ga/GaRow.java` | one answer row |
| `src/main/java/event_social_media/service/platform/ga/ServiceAccountToken.java` | access token from the key JSON |
| `src/main/java/event_social_media/service/platform/ga/GoogleAnalyticsClient.java` | HTTP call + parsing |
| `src/main/java/event_social_media/service/platform/ga/GaSourceMapping.java` | GA source/medium → `SignupChannel` |
| `src/main/java/event_social_media/dto/platform/VisitorMetricsDto.java` | the endpoint's answer |
| `src/main/java/event_social_media/service/platform/VisitorReports.java` | report definitions + rows → DTO |
| `src/main/java/event_social_media/service/platform/VisitorMetricsService.java` | config, dates, cache, sign-ups |
| `src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java` | `GET /visitors` |
| Tests next to each under `src/test/java/...` | see each task |

---

### Task 1: Branch, dependency and settings

**Files:**
- Modify: `build.gradle`
- Modify: `src/main/resources/application.properties`
- Create: `src/main/java/event_social_media/config/GoogleAnalyticsProperties.java`
- Test: `src/test/java/event_social_media/config/GoogleAnalyticsPropertiesTest.java`

- [ ] **Step 1: Branch from the latest staging**

```bash
git fetch origin
git switch -c feat/admin-visitors origin/staging
```

- [ ] **Step 2: Add the dependency** — in `build.gradle`, under the `nimbus-jose-jwt` line:

```gradle
    // Service-account access tokens for the GA4 Data API (admin Visitors section). Only
    // ServiceAccountToken may import it. See GoogleAnalyticsClient.
    implementation 'com.google.auth:google-auth-library-oauth2-http:1.30.0'
```

Run: `./gradlew dependencyInsight --dependency google-auth-library-oauth2-http --configuration runtimeClasspath`
Expected: the dependency resolves at `1.30.0`. If Maven Central has a newer `1.x`, use the newest and note it in the PR.

- [ ] **Step 3: Write the failing test**

```java
package event_social_media.config;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleAnalyticsPropertiesTest {

    private static GoogleAnalyticsProperties props(String propertyId, String credentials, String startDate) {
        GoogleAnalyticsProperties properties = new GoogleAnalyticsProperties();
        properties.setPropertyId(propertyId);
        properties.setCredentials(credentials);
        properties.setStartDate(startDate);
        return properties;
    }

    @Test
    void isConfigured_needsAllThree() {
        assertThat(props("123", "{}", "2026-09-01").isConfigured()).isTrue();
        assertThat(props("", "{}", "2026-09-01").isConfigured()).isFalse();
        assertThat(props("123", "", "2026-09-01").isConfigured()).isFalse();
        assertThat(props("123", "{}", "").isConfigured()).isFalse();
    }

    @Test
    void isConfigured_rejectsANonNumericPropertyOrABadDate() {
        assertThat(props("properties/123", "{}", "2026-09-01").isConfigured()).isFalse();
        assertThat(props("123", "{}", "September").isConfigured()).isFalse();
    }

    @Test
    void startDateOrNull_parsesTheIsoDate() {
        assertThat(props("123", "{}", "2026-09-01").startDateOrNull()).isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(props("123", "{}", "").startDateOrNull()).isNull();
    }
}
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `./gradlew test --tests GoogleAnalyticsPropertiesTest`
Expected: FAIL, `GoogleAnalyticsProperties` does not exist.

- [ ] **Step 5: Write the class**

```java
package event_social_media.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

/**
 * Where the admin Visitors section reads Google Analytics from. Only production sets these; anywhere
 * else the section answers "not connected" and never calls Google. The start date is a string so an
 * unset env var binds as empty instead of failing startup.
 */
@Component
@ConfigurationProperties("app.analytics.ga")
@Getter
@Setter
public class GoogleAnalyticsProperties {

    private static final Pattern NUMERIC = Pattern.compile("\\d{1,20}");

    /** The numeric GA4 property id (not {@code properties/…}, not the {@code G-…} measurement id). */
    private String propertyId = "";

    /** The service account's JSON key. */
    private String credentials = "";

    /** The day GA went live, ISO {@code yyyy-MM-dd}. "All time" starts here. */
    private String startDate = "";

    /** The property's reporting time zone; GA's dates are days in this zone. */
    private ZoneId timeZone = ZoneId.of("Europe/Athens");

    /** Overridden only by tests, which point it at a local server. */
    private String apiBaseUrl = "https://analyticsdata.googleapis.com";

    public boolean isConfigured() {
        return NUMERIC.matcher(propertyId).matches() && !credentials.isBlank() && startDateOrNull() != null;
    }

    public LocalDate startDateOrNull() {
        if (startDate == null || startDate.isBlank()) return null;
        try {
            return LocalDate.parse(startDate.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
```

- [ ] **Step 6: Wire the env vars** — append to `src/main/resources/application.properties`:

```properties
# Admin Visitors section: GA4 Data API, read with a service account that has Viewer access on the
# property. Production only; anywhere else the section answers "not connected". See
# GoogleAnalyticsProperties.
app.analytics.ga.property-id=${GA_PROPERTY_ID:}
app.analytics.ga.credentials=${GA_SERVICE_ACCOUNT_JSON:}
app.analytics.ga.start-date=${GA_START_DATE:}
app.analytics.ga.time-zone=${GA_TIME_ZONE:Europe/Athens}
```

- [ ] **Step 7: Run the test**

Run: `./gradlew test --tests GoogleAnalyticsPropertiesTest`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add build.gradle src/main/resources/application.properties src/main/java/event_social_media/config/GoogleAnalyticsProperties.java src/test/java/event_social_media/config/GoogleAnalyticsPropertiesTest.java
git commit -m "feat(visitors): add the Google Analytics settings"
```

---

### Task 2: Error code, exception and cache

**Files:**
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java` (the end of the enum)
- Create: `src/main/java/event_social_media/exception/GoogleAnalyticsUnavailableException.java`
- Modify: `src/main/java/event_social_media/config/CacheConfig.java`

- [ ] **Step 1: Add the error code** — replace the end of the enum:

```java
    INTERNAL_ERROR(9001),

    /**
     * 9002 — Google Analytics could not be reached or refused the report request. Only
     * {@code GET /api/admin/metrics/visitors}. {@code 503}.
     */
    GOOGLE_ANALYTICS_UNAVAILABLE(9002);
```

Then check whether error codes are listed anywhere else that must stay in step:

Run: `git grep -n "EMAIL_TEMPLATE_UNAVAILABLE\|5175" -- . ':!src/main/java/event_social_media/exception/ErrorCode.java'`
Expected: if a list (docs or a test) names every code, add `GOOGLE_ANALYTICS_UNAVAILABLE` / `9002` there the same way.

- [ ] **Step 2: Add the exception**

```java
package event_social_media.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Google Analytics did not answer a report request: unreachable, timed out, or answered with an
 * error. A 503: the admin page says it could not load the numbers and offers Retry.
 */
@Getter
public class GoogleAnalyticsUnavailableException extends ApiException {

    /** GA's HTTP status, or 0 when no answer came back. A 400 means the request named a field GA does not know. */
    private final int upstreamStatus;

    public GoogleAnalyticsUnavailableException(int upstreamStatus) {
        super("Google Analytics did not answer", HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.GOOGLE_ANALYTICS_UNAVAILABLE);
        this.upstreamStatus = upstreamStatus;
    }

    public GoogleAnalyticsUnavailableException(Throwable cause) {
        this(0);
        initCause(cause);
    }
}
```

- [ ] **Step 3: Declare the cache** — in `CacheConfig`, add the constant under `EVENT_MODULE_CAPS`:

```java
    /** The admin Visitors section's GA answer per date range. See {@code VisitorMetricsService}. */
    public static final String GA_VISITORS = "gaVisitors";
```

and register it before `return manager;`:

```java
        // An hour: GA itself is hours behind, and each miss spends Data API quota. The page's
        // Refresh evicts its own range.
        manager.registerCustomCache(GA_VISITORS, Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofHours(1))
                .maximumSize(50)
                .recordStats()
                .build());
```

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/exception src/main/java/event_social_media/config/CacheConfig.java
git commit -m "feat(visitors): add the GA error code, exception and cache"
```

---

### Task 3: `GaSourceMapping`

**Files:**
- Create: `src/main/java/event_social_media/service/platform/ga/GaSourceMapping.java`
- Test: `src/test/java/event_social_media/service/platform/ga/GaSourceMappingTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.platform.ga;

import event_social_media.model.user.SignupChannel;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class GaSourceMappingTest {

    @ParameterizedTest(name = "{0} / {1} -> {2}")
    @CsvSource({
            "(direct), (none), DIRECT",
            "google, organic, SEARCH",
            "bing, organic, SEARCH",
            "www.google.gr, organic, SEARCH",
            "l.instagram.com, referral, SOCIAL",
            "instagram, referral, SOCIAL",
            "m.facebook.com, referral, SOCIAL",
            "example.org, referral, OTHER_SITE",
            "google, cpc, ADS",
            "facebook, paid_social, ADS",
            "newsletter, email, EMAIL",
            "instagram, social, SOCIAL",
            "acme, partner, PARTNER",
            "(not set), (not set), UNKNOWN",
            "'', '', UNKNOWN",
    })
    void channel(String source, String medium, SignupChannel expected) {
        assertThat(GaSourceMapping.channel(source, medium)).isEqualTo(expected);
    }
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests GaSourceMappingTest`
Expected: FAIL, `GaSourceMapping` does not exist.

- [ ] **Step 3: Write the class**

```java
package event_social_media.service.platform.ga;

import event_social_media.dto.auth.VisitSourceDto;
import event_social_media.model.user.SignupChannel;
import event_social_media.service.auth.SignupSourceRules;

import java.util.Locale;

/**
 * Sorts a GA session's source/medium into our {@link SignupChannel} with the same
 * {@link SignupSourceRules} that sort sign-ups, so the Visitors page and the Funnel use one set of
 * channels. GA's organic and referral sources are sites, so they become the referrer host; anything
 * else is a campaign source and medium.
 */
public final class GaSourceMapping {

    private static final String DIRECT = "(direct)";

    private GaSourceMapping() {
    }

    public static SignupChannel channel(String gaSource, String gaMedium) {
        String source = clean(gaSource);
        String medium = clean(gaMedium);
        if (source == null && medium == null) return SignupChannel.UNKNOWN;
        if (DIRECT.equals(source)) return SignupChannel.DIRECT;

        VisitSourceDto visit = new VisitSourceDto();
        visit.setLandingPage("/");
        visit.setUtmSource(source);
        if ("organic".equals(medium) || "referral".equals(medium)) {
            // GA names search engines without a domain ("google"); the rules expect a host.
            visit.setReferrerHost(source == null ? null : source.contains(".") ? source : source + ".com");
        } else {
            visit.setUtmMedium(medium);
        }
        SignupChannel channel = SignupSourceRules.classify(visit, false);
        return channel == null ? SignupChannel.UNKNOWN : channel;
    }

    /** GA's placeholders mean "nothing". */
    private static String clean(String value) {
        if (value == null || value.isBlank()) return null;
        String lower = value.trim().toLowerCase(Locale.ROOT);
        return "(not set)".equals(lower) || "(none)".equals(lower) ? null : lower;
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests GaSourceMappingTest`
Expected: PASS (15 cases).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/platform/ga/GaSourceMapping.java src/test/java/event_social_media/service/platform/ga/GaSourceMappingTest.java
git commit -m "feat(visitors): sort GA sources with the sign-up channel rules"
```

---

### Task 4: `GoogleAnalyticsClient`

**Files:**
- Create: `src/main/java/event_social_media/service/platform/ga/GaReportRequest.java`
- Create: `src/main/java/event_social_media/service/platform/ga/GaRow.java`
- Create: `src/main/java/event_social_media/service/platform/ga/ServiceAccountToken.java`
- Create: `src/main/java/event_social_media/service/platform/ga/GoogleAnalyticsClient.java`
- Test: `src/test/java/event_social_media/service/platform/ga/GoogleAnalyticsClientTest.java`

- [ ] **Step 1: Write the two records**

```java
package event_social_media.service.platform.ga;

import java.util.List;

/**
 * One report in a {@code batchRunReports} call. {@code eventNamePrefix}, when set, keeps only events
 * whose name begins with it.
 */
public record GaReportRequest(List<String> dimensions, List<String> metrics, String eventNamePrefix) {

    public static GaReportRequest of(List<String> dimensions, List<String> metrics) {
        return new GaReportRequest(dimensions, metrics, null);
    }
}
```

```java
package event_social_media.service.platform.ga;

import java.util.List;

/** One row of a GA report: dimension values, then metric values, as GA sent them. */
public record GaRow(List<String> dimensions, List<String> metrics) {

    public String dimension(int index) {
        return index < dimensions.size() ? dimensions.get(index) : "";
    }

    /** A metric as a whole number; GA sends counts as strings. Anything unreadable is 0. */
    public long metric(int index) {
        if (index >= metrics.size()) return 0;
        try {
            return Long.parseLong(metrics.get(index));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
```

- [ ] **Step 2: Write the failing client test**

```java
package event_social_media.service.platform.ga;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import event_social_media.config.GoogleAnalyticsProperties;
import event_social_media.exception.GoogleAnalyticsUnavailableException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleAnalyticsClientTest {

    private static final LocalDate START = LocalDate.of(2026, 9, 1);
    private static final LocalDate END = LocalDate.of(2026, 9, 30);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<String> path = new AtomicReference<>();
    private final AtomicReference<String> authorization = new AtomicReference<>();
    private final AtomicReference<String> body = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String answer = "{}";
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

    private GoogleAnalyticsClient client() {
        GoogleAnalyticsProperties properties = new GoogleAnalyticsProperties();
        properties.setPropertyId("123");
        properties.setCredentials("{}");
        properties.setStartDate("2026-09-01");
        properties.setApiBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        return new GoogleAnalyticsClient(properties, objectMapper, HttpClient.newHttpClient(), () -> "token-1");
    }

    @Test
    void batchRunReports_postsEveryReportWithTheRangeAndToken() throws Exception {
        answer = "{\"reports\":[{},{}]}";

        client().batchRunReports(START, END, List.of(
                GaReportRequest.of(List.of("date"), List.of("totalUsers", "sessions")),
                new GaReportRequest(List.of("eventName"), List.of("eventCount"), "landing_")));

        assertThat(path.get()).isEqualTo("/v1beta/properties/123:batchRunReports");
        assertThat(authorization.get()).isEqualTo("Bearer token-1");
        JsonNode requests = objectMapper.readTree(body.get()).path("requests");
        assertThat(requests).hasSize(2);
        assertThat(requests.get(0).path("dateRanges").get(0).path("startDate").asText()).isEqualTo("2026-09-01");
        assertThat(requests.get(0).path("dateRanges").get(0).path("endDate").asText()).isEqualTo("2026-09-30");
        assertThat(requests.get(0).path("dimensions").get(0).path("name").asText()).isEqualTo("date");
        assertThat(requests.get(0).path("metrics").get(1).path("name").asText()).isEqualTo("sessions");
        assertThat(requests.get(0).path("limit").asInt()).isEqualTo(GoogleAnalyticsClient.ROW_LIMIT);
        assertThat(requests.get(0).has("dimensionFilter")).isFalse();
        JsonNode filter = requests.get(1).path("dimensionFilter").path("filter");
        assertThat(filter.path("fieldName").asText()).isEqualTo("eventName");
        assertThat(filter.path("stringFilter").path("matchType").asText()).isEqualTo("BEGINS_WITH");
        assertThat(filter.path("stringFilter").path("value").asText()).isEqualTo("landing_");
    }

    @Test
    void batchRunReports_leavesOutDimensionsForATotalsReport() throws Exception {
        answer = "{\"reports\":[{}]}";

        client().batchRunReports(START, END, List.of(GaReportRequest.of(List.of(), List.of("totalUsers"))));

        assertThat(objectMapper.readTree(body.get()).path("requests").get(0).has("dimensions")).isFalse();
    }

    @Test
    void batchRunReports_readsRowsPerReport() {
        answer = """
                {"reports":[
                  {"rows":[{"dimensionValues":[{"value":"20260901"}],"metricValues":[{"value":"7"},{"value":"9"}]}]},
                  {}
                ]}""";

        List<List<GaRow>> reports = client().batchRunReports(START, END, List.of(
                GaReportRequest.of(List.of("date"), List.of("totalUsers", "sessions")),
                GaReportRequest.of(List.of(), List.of("totalUsers"))));

        assertThat(reports).hasSize(2);
        assertThat(reports.get(0)).containsExactly(new GaRow(List.of("20260901"), List.of("7", "9")));
        assertThat(reports.get(1)).isEmpty();
    }

    @Test
    void batchRunReports_onAnErrorAnswer_throwsWithGasStatus() {
        status = 400;
        answer = "{\"error\":{\"message\":\"Field customEvent:section is not a valid dimension.\"}}";

        assertThatThrownBy(() -> client().batchRunReports(START, END, List.of(GaReportRequest.of(List.of("date"), List.of("sessions")))))
                .isInstanceOfSatisfying(GoogleAnalyticsUnavailableException.class, e -> assertThat(e.getUpstreamStatus()).isEqualTo(400));
    }

    @Test
    void batchRunReports_whenGaIsUnreachable_throwsWithoutAStatus() {
        GoogleAnalyticsClient client = client();
        server.stop(0);

        assertThatThrownBy(() -> client.batchRunReports(START, END, List.of(GaReportRequest.of(List.of("date"), List.of("sessions")))))
                .isInstanceOfSatisfying(GoogleAnalyticsUnavailableException.class, e -> assertThat(e.getUpstreamStatus()).isZero());
    }
}
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `./gradlew test --tests GoogleAnalyticsClientTest`
Expected: FAIL, `GoogleAnalyticsClient` does not exist.

- [ ] **Step 4: Write `ServiceAccountToken`**

```java
package event_social_media.service.platform.ga;

import com.google.auth.oauth2.ServiceAccountCredentials;
import event_social_media.config.GoogleAnalyticsProperties;
import event_social_media.exception.GoogleAnalyticsUnavailableException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Supplier;

/**
 * A read-only GA access token for the configured service account. The key is parsed on first use,
 * so an unconfigured environment never touches it; the library refreshes the token before it expires.
 * {@link ServiceAccountCredentials} rather than {@code GoogleCredentials.fromStream}: only a service
 * account key is accepted, never another credential type that could make the library call elsewhere.
 */
final class ServiceAccountToken implements Supplier<String> {

    static final String SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

    private final GoogleAnalyticsProperties properties;
    private ServiceAccountCredentials credentials;

    ServiceAccountToken(GoogleAnalyticsProperties properties) {
        this.properties = properties;
    }

    @Override
    public synchronized String get() {
        try {
            if (credentials == null) {
                byte[] key = properties.getCredentials().getBytes(StandardCharsets.UTF_8);
                credentials = (ServiceAccountCredentials) ServiceAccountCredentials
                        .fromStream(new ByteArrayInputStream(key))
                        .createScoped(List.of(SCOPE));
            }
            credentials.refreshIfExpired();
            return credentials.getAccessToken().getTokenValue();
        } catch (IOException | RuntimeException e) {
            throw new GoogleAnalyticsUnavailableException(e);
        }
    }
}
```

- [ ] **Step 5: Write the client**

```java
package event_social_media.service.platform.ga;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.config.GoogleAnalyticsProperties;
import event_social_media.exception.GoogleAnalyticsUnavailableException;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Runs reports on the GA4 Data API ({@code batchRunReports}, at most 5 per call) for the admin
 * Visitors section. Over HTTP with {@link HttpClient}, like {@code BrevoContactsClient}, so no gRPC
 * client is pulled in. Every failure is a {@link GoogleAnalyticsUnavailableException}; nothing is
 * retried here.
 */
@Component
public class GoogleAnalyticsClient {

    static final int ROW_LIMIT = 1000;
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(15);
    private static final int LOGGED_BODY_CHARS = 500;
    private static final Logger log = LoggerFactory.getLogger(GoogleAnalyticsClient.class);

    private final GoogleAnalyticsProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Supplier<String> accessToken;

    @Autowired
    public GoogleAnalyticsClient(GoogleAnalyticsProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build(),
                new ServiceAccountToken(properties));
    }

    GoogleAnalyticsClient(GoogleAnalyticsProperties properties, ObjectMapper objectMapper, HttpClient httpClient,
                          Supplier<String> accessToken) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.accessToken = accessToken;
    }

    /** The rows of each report, in the order asked. {@code start} and {@code end} are inclusive. */
    public List<List<GaRow>> batchRunReports(LocalDate start, LocalDate end, List<GaReportRequest> requests) {
        URI uri = URI.create(properties.getApiBaseUrl() + "/v1beta/properties/" + properties.getPropertyId()
                + ":batchRunReports");
        Map<String, Object> payload = Map.of("requests",
                requests.stream().map(request -> requestBody(start, end, request)).toList());
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(READ_TIMEOUT)
                    .header("Authorization", "Bearer " + accessToken.get())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                // GA's error body names the field or quota at fault and never echoes the token.
                log.warn("Google Analytics answered HTTP {}: {}", response.statusCode(), abbreviate(response.body()));
                throw new GoogleAnalyticsUnavailableException(response.statusCode());
            }
            return parse(objectMapper.readTree(response.body()));
        } catch (IOException e) {
            log.warn("Could not reach Google Analytics: {}", e.toString());
            throw new GoogleAnalyticsUnavailableException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GoogleAnalyticsUnavailableException(e);
        }
    }

    private static Map<String, Object> requestBody(LocalDate start, LocalDate end, GaReportRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("dateRanges", List.of(Map.of("startDate", start.toString(), "endDate", end.toString())));
        if (!request.dimensions().isEmpty()) {
            body.put("dimensions", request.dimensions().stream().map(name -> Map.of("name", name)).toList());
        }
        body.put("metrics", request.metrics().stream().map(name -> Map.of("name", name)).toList());
        body.put("limit", ROW_LIMIT);
        if (request.eventNamePrefix() != null) {
            body.put("dimensionFilter", Map.of("filter", Map.of(
                    "fieldName", "eventName",
                    "stringFilter", Map.of("matchType", "BEGINS_WITH", "value", request.eventNamePrefix()))));
        }
        return body;
    }

    private static List<List<GaRow>> parse(JsonNode root) {
        List<List<GaRow>> reports = new ArrayList<>();
        for (JsonNode report : root.path("reports")) {
            List<GaRow> rows = new ArrayList<>();
            for (JsonNode row : report.path("rows")) {
                rows.add(new GaRow(values(row.path("dimensionValues")), values(row.path("metricValues"))));
            }
            reports.add(rows);
        }
        return reports;
    }

    private static List<String> values(JsonNode cells) {
        List<String> values = new ArrayList<>();
        for (JsonNode cell : cells) values.add(cell.path("value").asText(""));
        return values;
    }

    private static String abbreviate(String body) {
        if (body == null) return "";
        return body.length() <= LOGGED_BODY_CHARS ? body : body.substring(0, LOGGED_BODY_CHARS) + "…";
    }
}
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests GoogleAnalyticsClientTest`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/service/platform/ga src/test/java/event_social_media/service/platform/ga/GoogleAnalyticsClientTest.java
git commit -m "feat(visitors): call the GA4 Data API with a service account"
```

---

### Task 5: `VisitorMetricsDto`

**Files:**
- Create: `src/main/java/event_social_media/dto/platform/VisitorMetricsDto.java`

- [ ] **Step 1: Write the DTO**

```java
package event_social_media.dto.platform;

import event_social_media.model.user.SignupChannel;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * {@code GET /api/admin/metrics/visitors}: Google Analytics numbers for the public pages over a
 * range, with the range's sign-ups per channel next to them. GA sees only visitors who allowed
 * analytics cookies. Channels carry visits (sessions), never visitors: one visitor can come through
 * two channels, so per-channel visitors would add up to more than the total.
 */
@Data
public class VisitorMetricsDto {

    /** False when GA is not set up here; every other field is then empty. */
    private boolean configured;
    /** The GA days actually used, inclusive. */
    private LocalDate since;
    private LocalDate until;
    /** When GA was asked; a cached answer keeps it. */
    private Instant updatedAt;
    private long visitors;
    private long visits;
    private long signups;
    private List<Day> daily = new ArrayList<>();
    private List<ChannelRow> channels = new ArrayList<>();
    /** The top landing pages by visits; a null page is all the others together. */
    private List<PageRow> pages = new ArrayList<>();
    private List<LanguageRow> languages = new ArrayList<>();
    private List<DeviceRow> devices = new ArrayList<>();
    private Landing landing = new Landing();

    public record Day(LocalDate date, long visitors, long visits) {
    }

    public record ChannelRow(SignupChannel channel, long visits, long signups) {
    }

    public record PageRow(String page, long visits) {
    }

    /** {@code el} or {@code en}. */
    public record LanguageRow(String language, long visits) {
    }

    /** {@code PHONE}, {@code DESKTOP} or {@code TABLET}. */
    public record DeviceRow(String device, long visits) {
    }

    public record SectionRow(String section, long visitors) {
    }

    /** {@code event} is {@code create}, {@code plans}, {@code demo}, {@code login} or {@code nav}. */
    public record ClickRow(String event, String placement, long count) {
    }

    public record PlanRow(String plan, long count) {
    }

    public record FaqRow(int question, long count) {
    }

    /** The landing page events. Empty until their GA custom dimensions are registered. */
    @Data
    public static class Landing {
        private List<SectionRow> sections = new ArrayList<>();
        private List<ClickRow> clicks = new ArrayList<>();
        private List<PlanRow> plans = new ArrayList<>();
        private List<FaqRow> faq = new ArrayList<>();
    }

    public static VisitorMetricsDto notConfigured() {
        return new VisitorMetricsDto();
    }
}
```

- [ ] **Step 2: Compile and commit**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

```bash
git add src/main/java/event_social_media/dto/platform/VisitorMetricsDto.java
git commit -m "feat(visitors): add the visitors DTO"
```

---

### Task 6: `VisitorReports`

The report definitions, and the pure step from GA rows plus sign-up rows to the DTO.

**Files:**
- Create: `src/main/java/event_social_media/service/platform/VisitorReports.java`
- Test: `src/test/java/event_social_media/service/platform/VisitorReportsTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.platform;

import event_social_media.dto.platform.FunnelChannelRowDto;
import event_social_media.dto.platform.VisitorMetricsDto;
import event_social_media.model.user.SignupChannel;
import event_social_media.service.platform.ga.GaRow;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VisitorReportsTest {

    private static final LocalDate START = LocalDate.of(2026, 9, 1);
    private static final LocalDate END = LocalDate.of(2026, 9, 30);
    private static final Instant NOW = Instant.parse("2026-10-01T08:00:00Z");

    private static GaRow row(List<String> dimensions, String... metrics) {
        return new GaRow(dimensions, List.of(metrics));
    }

    private static FunnelChannelRowDto signups(SignupChannel channel, long signedUp) {
        FunnelChannelRowDto row = new FunnelChannelRowDto();
        row.setChannel(channel);
        row.setSignedUp(signedUp);
        return row;
    }

    private static List<List<GaRow>> main(List<GaRow> daily, List<GaRow> totals, List<GaRow> sources, List<GaRow> pages) {
        return List.of(daily, totals, sources, pages);
    }

    @Test
    void assemble_readsTotalsAndTheDailyLineInDateOrder() {
        VisitorMetricsDto dto = VisitorReports.assemble(START, END, NOW, main(
                List.of(row(List.of("20260902"), "4", "5"), row(List.of("20260901"), "3", "3")),
                List.of(row(List.of(), "6", "8")),
                List.of(), List.of()), List.of(), List.of());

        assertThat(dto.isConfigured()).isTrue();
        assertThat(dto.getSince()).isEqualTo(START);
        assertThat(dto.getUntil()).isEqualTo(END);
        assertThat(dto.getUpdatedAt()).isEqualTo(NOW);
        assertThat(dto.getVisitors()).isEqualTo(6);
        assertThat(dto.getVisits()).isEqualTo(8);
        assertThat(dto.getDaily()).containsExactly(
                new VisitorMetricsDto.Day(LocalDate.of(2026, 9, 1), 3, 3),
                new VisitorMetricsDto.Day(LocalDate.of(2026, 9, 2), 4, 5));
    }

    @Test
    void assemble_sumsVisitsPerChannelAndAddsTheRangesSignups() {
        VisitorMetricsDto dto = VisitorReports.assemble(START, END, NOW, main(List.of(), List.of(),
                List.of(
                        row(List.of("google", "organic"), "10"),
                        row(List.of("bing", "organic"), "2"),
                        row(List.of("l.instagram.com", "referral"), "5"),
                        row(List.of("(direct)", "(none)"), "7")),
                List.of()), List.of(), List.of(signups(SignupChannel.SEARCH, 3), signups(SignupChannel.INVITE, 4)));

        assertThat(dto.getChannels()).containsExactly(
                new VisitorMetricsDto.ChannelRow(SignupChannel.SEARCH, 12, 3),
                new VisitorMetricsDto.ChannelRow(SignupChannel.DIRECT, 7, 0),
                new VisitorMetricsDto.ChannelRow(SignupChannel.SOCIAL, 5, 0),
                new VisitorMetricsDto.ChannelRow(SignupChannel.INVITE, 0, 4));
        assertThat(dto.getSignups()).isEqualTo(7);
    }

    @Test
    void assemble_keepsTheTopTenPagesAndFoldsTheRestIntoOther() {
        List<GaRow> pages = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            pages.add(row(List.of("/page-" + i, "desktop"), String.valueOf(100 - i)));
        }
        pages.add(row(List.of("(not set)", "desktop"), "1"));

        VisitorMetricsDto dto = VisitorReports.assemble(START, END, NOW, main(List.of(), List.of(), List.of(), pages),
                List.of(), List.of());

        assertThat(dto.getPages()).hasSize(11);
        assertThat(dto.getPages().get(0)).isEqualTo(new VisitorMetricsDto.PageRow("/page-1", 99));
        assertThat(dto.getPages().get(10)).isEqualTo(new VisitorMetricsDto.PageRow(null, 89 + 88 + 1));
    }

    @Test
    void assemble_splitsVisitsByLanguageAndDevice() {
        VisitorMetricsDto dto = VisitorReports.assemble(START, END, NOW, main(List.of(), List.of(), List.of(), List.of(
                row(List.of("/el", "mobile"), "6"),
                row(List.of("/el/gamos", "desktop"), "2"),
                row(List.of("/elsewhere", "tablet"), "1"),
                row(List.of("/", "mobile"), "3"),
                row(List.of("/weddings", "smart tv"), "4"))), List.of(), List.of());

        assertThat(dto.getLanguages()).containsExactly(
                new VisitorMetricsDto.LanguageRow("el", 8),
                new VisitorMetricsDto.LanguageRow("en", 8));
        assertThat(dto.getDevices()).containsExactly(
                new VisitorMetricsDto.DeviceRow("PHONE", 9),
                new VisitorMetricsDto.DeviceRow("DESKTOP", 2),
                new VisitorMetricsDto.DeviceRow("TABLET", 1));
    }

    @Test
    void assemble_groupsTheLandingEvents() {
        // eventName, section, placement, plan, question | eventCount, totalUsers
        List<GaRow> landing = List.of(
                row(List.of("landing_section", "pricing", "(not set)", "(not set)", "(not set)"), "9", "6"),
                row(List.of("landing_section", "how_it_works", "(not set)", "(not set)", "(not set)"), "20", "15"),
                row(List.of("landing_create", "(not set)", "hero", "(not set)", "(not set)"), "8", "7"),
                row(List.of("landing_nav", "(not set)", "header", "(not set)", "(not set)"), "3", "3"),
                row(List.of("landing_plan", "(not set)", "(not set)", "PRO", "(not set)"), "4", "4"),
                row(List.of("landing_faq", "(not set)", "(not set)", "(not set)", "2"), "5", "5"),
                row(List.of("landing_faq", "(not set)", "(not set)", "(not set)", "oops"), "1", "1"),
                row(List.of("landing_language", "(not set)", "(not set)", "(not set)", "(not set)"), "2", "2"));

        VisitorMetricsDto.Landing dto = VisitorReports.assemble(START, END, NOW, main(List.of(), List.of(), List.of(), List.of()),
                landing, List.of()).getLanding();

        assertThat(dto.getSections()).containsExactly(
                new VisitorMetricsDto.SectionRow("how_it_works", 15),
                new VisitorMetricsDto.SectionRow("pricing", 6));
        assertThat(dto.getClicks()).containsExactly(
                new VisitorMetricsDto.ClickRow("create", "hero", 8),
                new VisitorMetricsDto.ClickRow("nav", "header", 3));
        assertThat(dto.getPlans()).containsExactly(new VisitorMetricsDto.PlanRow("PRO", 4));
        assertThat(dto.getFaq()).containsExactly(new VisitorMetricsDto.FaqRow(2, 5));
    }

    @Test
    void assemble_withNoReportsAnswersZeros() {
        VisitorMetricsDto dto = VisitorReports.assemble(START, END, NOW, List.of(), List.of(), List.of());

        assertThat(dto.isConfigured()).isTrue();
        assertThat(dto.getVisitors()).isZero();
        assertThat(dto.getDaily()).isEmpty();
        assertThat(dto.getLanguages()).extracting(VisitorMetricsDto.LanguageRow::visits).containsOnly(0L);
    }
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests VisitorReportsTest`
Expected: FAIL, `VisitorReports` does not exist.

- [ ] **Step 3: Write the class**

```java
package event_social_media.service.platform;

import event_social_media.dto.platform.FunnelChannelRowDto;
import event_social_media.dto.platform.VisitorMetricsDto;
import event_social_media.model.user.SignupChannel;
import event_social_media.service.platform.ga.GaReportRequest;
import event_social_media.service.platform.ga.GaRow;
import event_social_media.service.platform.ga.GaSourceMapping;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The GA reports behind the admin Visitors section, and the pure step that turns their rows into
 * {@link VisitorMetricsDto}. No I/O: {@link VisitorMetricsService} fetches, this assembles.
 */
final class VisitorReports {

    /** Daily line, totals, sources, landing pages by device — one {@code batchRunReports} call. */
    static final List<GaReportRequest> MAIN = List.of(
            GaReportRequest.of(List.of("date"), List.of("totalUsers", "sessions")),
            GaReportRequest.of(List.of(), List.of("totalUsers", "sessions")),
            GaReportRequest.of(List.of("sessionSource", "sessionMedium"), List.of("sessions")),
            GaReportRequest.of(List.of("landingPage", "deviceCategory"), List.of("sessions")));

    /**
     * The landing page events (see {@code lib/landingTracking.ts} in storywall). A call of its own:
     * GA refuses the whole call with a 400 until these custom dimensions are registered.
     */
    static final GaReportRequest LANDING = new GaReportRequest(
            List.of("eventName", "customEvent:section", "customEvent:placement", "customEvent:plan", "customEvent:question"),
            List.of("eventCount", "totalUsers"),
            "landing_");

    static final int TOP_PAGES = 10;

    /** The landing page's sections, top to bottom. */
    static final List<String> SECTION_ORDER = List.of("how_it_works", "stories", "demo", "social_host", "features",
            "feature_details", "reviews", "pricing", "faq", "final_cta", "footer");

    private static final Set<String> CLICK_EVENTS = Set.of("create", "plans", "demo", "login", "nav");
    private static final String NOT_SET = "(not set)";
    private static final String GREEK = "/el";

    private VisitorReports() {
    }

    static VisitorMetricsDto assemble(LocalDate since, LocalDate until, Instant updatedAt, List<List<GaRow>> main,
                                      List<GaRow> landing, List<FunnelChannelRowDto> signups) {
        VisitorMetricsDto dto = new VisitorMetricsDto();
        dto.setConfigured(true);
        dto.setSince(since);
        dto.setUntil(until);
        dto.setUpdatedAt(updatedAt);

        dto.setDaily(daily(report(main, 0)));
        List<GaRow> totals = report(main, 1);
        if (!totals.isEmpty()) {
            dto.setVisitors(totals.get(0).metric(0));
            dto.setVisits(totals.get(0).metric(1));
        }
        dto.setChannels(channels(report(main, 2), signups));
        dto.setSignups(signups.stream().mapToLong(FunnelChannelRowDto::getSignedUp).sum());

        List<GaRow> pages = report(main, 3);
        dto.setPages(pages(pages));
        dto.setLanguages(languages(pages));
        dto.setDevices(devices(pages));
        dto.setLanding(landing(landing));
        return dto;
    }

    private static List<GaRow> report(List<List<GaRow>> reports, int index) {
        return index < reports.size() ? reports.get(index) : List.of();
    }

    private static List<VisitorMetricsDto.Day> daily(List<GaRow> rows) {
        List<VisitorMetricsDto.Day> days = new ArrayList<>();
        for (GaRow row : rows) {
            try {
                LocalDate date = LocalDate.parse(row.dimension(0), DateTimeFormatter.BASIC_ISO_DATE);
                days.add(new VisitorMetricsDto.Day(date, row.metric(0), row.metric(1)));
            } catch (DateTimeParseException ignored) {
                // GA sends only yyyyMMdd here; a row without a day has nowhere to go on the line.
            }
        }
        days.sort(Comparator.comparing(VisitorMetricsDto.Day::date));
        return days;
    }

    private static List<VisitorMetricsDto.ChannelRow> channels(List<GaRow> sources, List<FunnelChannelRowDto> signups) {
        Map<SignupChannel, long[]> byChannel = new EnumMap<>(SignupChannel.class);
        for (GaRow row : sources) {
            SignupChannel channel = GaSourceMapping.channel(row.dimension(0), row.dimension(1));
            byChannel.computeIfAbsent(channel, key -> new long[2])[0] += row.metric(0);
        }
        for (FunnelChannelRowDto row : signups) {
            SignupChannel channel = row.getChannel() == null ? SignupChannel.UNKNOWN : row.getChannel();
            byChannel.computeIfAbsent(channel, key -> new long[2])[1] += row.getSignedUp();
        }
        return byChannel.entrySet().stream()
                .filter(entry -> entry.getValue()[0] > 0 || entry.getValue()[1] > 0)
                .map(entry -> new VisitorMetricsDto.ChannelRow(entry.getKey(), entry.getValue()[0], entry.getValue()[1]))
                .sorted(Comparator.comparingLong(VisitorMetricsDto.ChannelRow::visits).reversed()
                        .thenComparing(Comparator.comparingLong(VisitorMetricsDto.ChannelRow::signups).reversed())
                        .thenComparing(VisitorMetricsDto.ChannelRow::channel))
                .toList();
    }

    private static List<VisitorMetricsDto.PageRow> pages(List<GaRow> rows) {
        Map<String, Long> byPage = new LinkedHashMap<>();
        long notSet = 0;
        for (GaRow row : rows) {
            String page = row.dimension(0);
            if (page.isBlank() || NOT_SET.equals(page)) notSet += row.metric(0);
            else byPage.merge(page, row.metric(0), Long::sum);
        }
        List<Map.Entry<String, Long>> sorted = byPage.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .toList();
        List<VisitorMetricsDto.PageRow> pages = new ArrayList<>();
        long other = notSet;
        for (int i = 0; i < sorted.size(); i++) {
            if (i < TOP_PAGES) pages.add(new VisitorMetricsDto.PageRow(sorted.get(i).getKey(), sorted.get(i).getValue()));
            else other += sorted.get(i).getValue();
        }
        if (other > 0) pages.add(new VisitorMetricsDto.PageRow(null, other));
        return pages;
    }

    /** Landing pages under {@code /el} are Greek; every other page is English. */
    private static List<VisitorMetricsDto.LanguageRow> languages(List<GaRow> rows) {
        long greek = 0;
        long english = 0;
        for (GaRow row : rows) {
            String page = row.dimension(0);
            if (page.equals(GREEK) || page.startsWith(GREEK + "/")) greek += row.metric(0);
            else english += row.metric(0);
        }
        return List.of(new VisitorMetricsDto.LanguageRow("el", greek), new VisitorMetricsDto.LanguageRow("en", english));
    }

    /** GA's other device categories (smart TVs) are too rare to list. */
    private static List<VisitorMetricsDto.DeviceRow> devices(List<GaRow> rows) {
        Map<String, Long> byDevice = new LinkedHashMap<>();
        byDevice.put("PHONE", 0L);
        byDevice.put("DESKTOP", 0L);
        byDevice.put("TABLET", 0L);
        for (GaRow row : rows) {
            String device = switch (row.dimension(1)) {
                case "mobile" -> "PHONE";
                case "desktop" -> "DESKTOP";
                case "tablet" -> "TABLET";
                default -> null;
            };
            if (device != null) byDevice.merge(device, row.metric(0), Long::sum);
        }
        return byDevice.entrySet().stream().map(entry -> new VisitorMetricsDto.DeviceRow(entry.getKey(), entry.getValue())).toList();
    }

    private static VisitorMetricsDto.Landing landing(List<GaRow> rows) {
        Map<String, Long> sections = new LinkedHashMap<>();
        Map<String, Long> clicks = new LinkedHashMap<>();
        Map<String, Long> plans = new LinkedHashMap<>();
        Map<Integer, Long> faq = new LinkedHashMap<>();
        for (GaRow row : rows) {
            String event = row.dimension(0).replaceFirst("^landing_", "");
            long count = row.metric(0);
            if ("section".equals(event) && isSet(row.dimension(1))) {
                sections.merge(row.dimension(1), row.metric(1), Long::sum);
            } else if (CLICK_EVENTS.contains(event) && isSet(row.dimension(2))) {
                clicks.merge(event + "\u0000" + row.dimension(2), count, Long::sum);
            } else if ("plan".equals(event) && isSet(row.dimension(3))) {
                plans.merge(row.dimension(3), count, Long::sum);
            } else if ("faq".equals(event)) {
                Integer question = question(row.dimension(4));
                if (question != null) faq.merge(question, count, Long::sum);
            }
        }

        VisitorMetricsDto.Landing landing = new VisitorMetricsDto.Landing();
        landing.setSections(sections.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, Long> entry) -> sectionPosition(entry.getKey()))
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> new VisitorMetricsDto.SectionRow(entry.getKey(), entry.getValue()))
                .toList());
        landing.setClicks(clicks.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> {
                    String[] parts = entry.getKey().split("\u0000", 2);
                    return new VisitorMetricsDto.ClickRow(parts[0], parts[1], entry.getValue());
                })
                .toList());
        landing.setPlans(plans.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> new VisitorMetricsDto.PlanRow(entry.getKey(), entry.getValue()))
                .toList());
        landing.setFaq(faq.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new VisitorMetricsDto.FaqRow(entry.getKey(), entry.getValue()))
                .toList());
        return landing;
    }

    private static boolean isSet(String value) {
        return value != null && !value.isBlank() && !NOT_SET.equals(value);
    }

    private static int sectionPosition(String section) {
        int index = SECTION_ORDER.indexOf(section);
        return index < 0 ? SECTION_ORDER.size() : index;
    }

    private static Integer question(String value) {
        try {
            int question = Integer.parseInt(value);
            return question > 0 ? question : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests VisitorReportsTest`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/platform/VisitorReports.java src/test/java/event_social_media/service/platform/VisitorReportsTest.java
git commit -m "feat(visitors): turn GA reports into the visitors answer"
```

---

### Task 7: `VisitorMetricsService`

**Files:**
- Create: `src/main/java/event_social_media/service/platform/VisitorMetricsService.java`
- Test: `src/test/java/event_social_media/service/platform/VisitorMetricsServiceTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.platform;

import event_social_media.config.CacheConfig;
import event_social_media.config.GoogleAnalyticsProperties;
import event_social_media.dto.platform.VisitorMetricsDto;
import event_social_media.exception.GoogleAnalyticsUnavailableException;
import event_social_media.service.platform.ga.GaRow;
import event_social_media.service.platform.ga.GoogleAnalyticsClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisitorMetricsServiceTest {

    private static final ZoneId ATHENS = ZoneId.of("Europe/Athens");
    private static final Instant NOW = Instant.parse("2026-10-17T09:00:00Z");

    private final GoogleAnalyticsProperties properties = new GoogleAnalyticsProperties();
    private final GoogleAnalyticsClient client = mock(GoogleAnalyticsClient.class);
    private final FunnelMetricsService funnel = mock(FunnelMetricsService.class);
    private VisitorMetricsService service;

    @BeforeEach
    void setUp() {
        properties.setPropertyId("123");
        properties.setCredentials("{}");
        properties.setStartDate("2026-09-01");
        service = new VisitorMetricsService(properties, client, funnel, new CacheConfig().cacheManager());
        service.setClock(Clock.fixed(NOW, ATHENS));
        when(client.batchRunReports(any(), any(), eq(VisitorReports.MAIN)))
                .thenReturn(List.of(List.of(), List.of(new GaRow(List.of(), List.of("5", "6"))), List.of(), List.of()));
        when(client.batchRunReports(any(), any(), eq(List.of(VisitorReports.LANDING)))).thenReturn(List.of(List.of()));
        when(funnel.channels(any(), any())).thenReturn(List.of());
    }

    @Test
    void visitors_whenNotConfigured_neverCallsGa() {
        properties.setCredentials("");

        VisitorMetricsDto dto = service.visitors(null, null, false);

        assertThat(dto.isConfigured()).isFalse();
        verify(client, never()).batchRunReports(any(), any(), any());
        verify(funnel, never()).channels(any(), any());
    }

    @Test
    void visitors_allTime_startsOnTheGoLiveDayAndEndsToday() {
        VisitorMetricsDto dto = service.visitors(null, null, false);

        assertThat(dto.getSince()).isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(dto.getUntil()).isEqualTo(LocalDate.of(2026, 10, 17));
        assertThat(dto.getVisitors()).isEqualTo(5);
        verify(client).batchRunReports(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 17), VisitorReports.MAIN);
        verify(funnel).channels(OffsetDateTime.parse("2026-09-01T00:00+03:00"), null);
    }

    @Test
    void visitors_turnsAnExclusiveUntilIntoTheLastIncludedDay() {
        OffsetDateTime since = OffsetDateTime.parse("2026-10-01T00:00+03:00");
        OffsetDateTime until = OffsetDateTime.parse("2026-10-08T00:00+03:00");

        VisitorMetricsDto dto = service.visitors(since, until, false);

        assertThat(dto.getSince()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(dto.getUntil()).isEqualTo(LocalDate.of(2026, 10, 7));
        verify(funnel).channels(since, until);
    }

    @Test
    void visitors_beforeTheGoLiveDay_countsSignupsFromThatDayToo() {
        OffsetDateTime since = OffsetDateTime.parse("2026-01-01T00:00+02:00");

        VisitorMetricsDto dto = service.visitors(since, null, false);

        assertThat(dto.getSince()).isEqualTo(LocalDate.of(2026, 9, 1));
        verify(funnel).channels(OffsetDateTime.parse("2026-09-01T00:00+03:00"), null);
    }

    @Test
    void visitors_aRangeThatEndsBeforeTheGoLiveDay_answersZerosWithoutCallingGa() {
        VisitorMetricsDto dto = service.visitors(OffsetDateTime.parse("2026-01-01T00:00+02:00"),
                OffsetDateTime.parse("2026-02-01T00:00+02:00"), false);

        assertThat(dto.isConfigured()).isTrue();
        assertThat(dto.getVisitors()).isZero();
        verify(client, never()).batchRunReports(any(), any(), any());
    }

    @Test
    void visitors_isCachedPerRangeAndFreshAsksAgain() {
        service.visitors(null, null, false);
        service.visitors(null, null, false);
        verify(client, times(1)).batchRunReports(any(), any(), eq(VisitorReports.MAIN));

        service.visitors(null, null, true);
        verify(client, times(2)).batchRunReports(any(), any(), eq(VisitorReports.MAIN));
    }

    @Test
    void visitors_whenGaFails_throwsAndCachesNothing() {
        when(client.batchRunReports(any(), any(), eq(VisitorReports.MAIN))).thenThrow(new GoogleAnalyticsUnavailableException(503));

        assertThatThrownBy(() -> service.visitors(null, null, false)).isInstanceOf(GoogleAnalyticsUnavailableException.class);
        assertThatThrownBy(() -> service.visitors(null, null, false)).isInstanceOf(GoogleAnalyticsUnavailableException.class);
        verify(client, times(2)).batchRunReports(any(), any(), eq(VisitorReports.MAIN));
    }

    @Test
    void visitors_whenTheLandingDimensionsAreNotRegistered_answersWithoutLandingEvents() {
        when(client.batchRunReports(any(), any(), eq(List.of(VisitorReports.LANDING)))).thenThrow(new GoogleAnalyticsUnavailableException(400));

        VisitorMetricsDto dto = service.visitors(null, null, false);

        assertThat(dto.getVisitors()).isEqualTo(5);
        assertThat(dto.getLanding().getSections()).isEmpty();
    }

    @Test
    void visitors_whenTheLandingCallFailsOtherwise_throws() {
        when(client.batchRunReports(any(), any(), eq(List.of(VisitorReports.LANDING)))).thenThrow(new GoogleAnalyticsUnavailableException(500));

        assertThatThrownBy(() -> service.visitors(null, null, false)).isInstanceOf(GoogleAnalyticsUnavailableException.class);
    }
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests VisitorMetricsServiceTest`
Expected: FAIL, `VisitorMetricsService` does not exist.

- [ ] **Step 3: Write the service**

```java
package event_social_media.service.platform;

import event_social_media.config.CacheConfig;
import event_social_media.config.GoogleAnalyticsProperties;
import event_social_media.dto.platform.FunnelChannelRowDto;
import event_social_media.dto.platform.VisitorMetricsDto;
import event_social_media.exception.GoogleAnalyticsUnavailableException;
import event_social_media.service.platform.ga.GaRow;
import event_social_media.service.platform.ga.GoogleAnalyticsClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

/**
 * The admin Visitors section: GA numbers for a range next to that range's sign-ups. Asks GA at most
 * once an hour per range ({@link CacheConfig#GA_VISITORS}); {@code fresh} asks again. Failures are
 * not cached. {@code since} is inclusive and {@code until} exclusive, as on {@code /funnel}.
 */
@Service
@RequiredArgsConstructor
public class VisitorMetricsService {

    private static final int BAD_REQUEST = 400;
    private static final Logger log = LoggerFactory.getLogger(VisitorMetricsService.class);

    private final GoogleAnalyticsProperties properties;
    private final GoogleAnalyticsClient client;
    private final FunnelMetricsService funnelMetricsService;
    private final CacheManager cacheManager;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    public VisitorMetricsDto visitors(OffsetDateTime since, OffsetDateTime until, boolean fresh) {
        if (!properties.isConfigured()) return VisitorMetricsDto.notConfigured();

        Cache cache = Objects.requireNonNull(cacheManager.getCache(CacheConfig.GA_VISITORS));
        String key = since + "|" + until;
        if (fresh) {
            cache.evict(key);
        } else {
            VisitorMetricsDto cached = cache.get(key, VisitorMetricsDto.class);
            if (cached != null) return cached;
        }
        VisitorMetricsDto result = load(since, until);
        cache.put(key, result);
        return result;
    }

    private VisitorMetricsDto load(OffsetDateTime since, OffsetDateTime until) {
        ZoneId zone = properties.getTimeZone();
        LocalDate goLive = properties.startDateOrNull();
        LocalDate sinceDay = since == null ? goLive : since.atZoneSameInstant(zone).toLocalDate();
        LocalDate start = sinceDay.isBefore(goLive) ? goLive : sinceDay;
        LocalDate end = until == null
                ? LocalDate.now(clock.withZone(zone))
                : until.minusNanos(1).atZoneSameInstant(zone).toLocalDate();
        if (end.isBefore(start)) {
            return VisitorReports.assemble(start, end, clock.instant(), List.of(), List.of(), List.of());
        }

        // Sign-ups over the same days GA can see, so the rate compares like with like.
        OffsetDateTime signupSince = since != null && !sinceDay.isBefore(goLive)
                ? since
                : goLive.atStartOfDay(zone).toOffsetDateTime();

        List<List<GaRow>> main = client.batchRunReports(start, end, VisitorReports.MAIN);
        List<GaRow> landing = landingRows(start, end);
        List<FunnelChannelRowDto> signups = funnelMetricsService.channels(signupSince, until);
        return VisitorReports.assemble(start, end, clock.instant(), main, landing, signups);
    }

    /** GA answers 400 until the landing event parameters are registered as custom dimensions. */
    private List<GaRow> landingRows(LocalDate start, LocalDate end) {
        try {
            List<List<GaRow>> reports = client.batchRunReports(start, end, List.of(VisitorReports.LANDING));
            return reports.isEmpty() ? List.of() : reports.get(0);
        } catch (GoogleAnalyticsUnavailableException e) {
            if (e.getUpstreamStatus() != BAD_REQUEST) throw e;
            log.warn("Landing event dimensions are not registered in Google Analytics; showing the page without them");
            return List.of();
        }
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests VisitorMetricsServiceTest`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/platform/VisitorMetricsService.java src/test/java/event_social_media/service/platform/VisitorMetricsServiceTest.java
git commit -m "feat(visitors): read, cache and date the visitors answer"
```

---

### Task 8: The endpoint

**Files:**
- Modify: `src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java`
- Modify: `src/test/java/event_social_media/controller/platform/PlatformMetricsAdminControllerTest.java`
- Create: `src/test/java/event_social_media/controller/platform/VisitorMetricsUnavailableTest.java`

- [ ] **Step 1: Write the failing tests** — add to `PlatformMetricsAdminControllerTest` (the test context has no GA settings, so the endpoint answers "not configured"):

```java
    @Test
    @WithMockUser(roles = "USER")
    void visitors_asANonAdmin_isForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/metrics/visitors"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void visitors_withoutGaSetUp_saysSo() throws Exception {
        mockMvc.perform(get("/api/admin/metrics/visitors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void visitors_withUntilBeforeSince_isABadRequest() throws Exception {
        mockMvc.perform(get("/api/admin/metrics/visitors")
                        .param("since", "2026-02-01T00:00:00Z")
                        .param("until", "2026-01-01T00:00:00Z"))
                .andExpect(status().isBadRequest());
    }
```

And the 503 path in its own class (it replaces the service with a mock, which needs its own context):

```java
package event_social_media.controller.platform;

import event_social_media.exception.ErrorCode;
import event_social_media.exception.GoogleAnalyticsUnavailableException;
import event_social_media.service.platform.VisitorMetricsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VisitorMetricsUnavailableTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VisitorMetricsService visitorMetricsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void visitors_whenGaFails_isA503WithItsCode() throws Exception {
        when(visitorMetricsService.visitors(any(), any(), eq(false))).thenThrow(new GoogleAnalyticsUnavailableException(503));

        mockMvc.perform(get("/api/admin/metrics/visitors"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.GOOGLE_ANALYTICS_UNAVAILABLE.getCode()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void visitors_passesTheRangeAndFresh() throws Exception {
        mockMvc.perform(get("/api/admin/metrics/visitors")
                        .param("since", "2026-10-01T00:00:00+03:00")
                        .param("until", "2026-10-08T00:00:00+03:00")
                        .param("fresh", "true"))
                .andExpect(status().isOk());

        verify(visitorMetricsService).visitors(OffsetDateTime.parse("2026-10-01T00:00:00+03:00"),
                OffsetDateTime.parse("2026-10-08T00:00:00+03:00"), true);
    }
}
```

The error body carries the numeric code as `errorCode` (see the `GlobalExceptionHandler` Javadoc).

- [ ] **Step 2: Run them to make sure they fail**

Run: `./gradlew test --tests PlatformMetricsAdminControllerTest --tests VisitorMetricsUnavailableTest`
Expected: the new tests FAIL with 404 (no `/visitors` mapping).

- [ ] **Step 3: Add the endpoint** — in `PlatformMetricsAdminController`, import `VisitorMetricsDto` and `VisitorMetricsService`, add the field after `moduleUsageService`:

```java
    private final VisitorMetricsService visitorMetricsService;
```

and the method after `funnelChannels`:

```java
    /**
     * Google Analytics numbers for the public pages over {@code [since, until)} (both optional, as on
     * {@code /funnel}; leaving out {@code since} means since GA went live), with the range's sign-ups
     * per channel next to them. Cached for an hour per range; {@code fresh=true} asks GA again.
     * {@code configured: false} when GA is not set up here. 503
     * {@link ErrorCode#GOOGLE_ANALYTICS_UNAVAILABLE} when GA does not answer.
     */
    @GetMapping("/visitors")
    public VisitorMetricsDto visitors(
            @RequestParam(required = false) OffsetDateTime since,
            @RequestParam(required = false) OffsetDateTime until,
            @RequestParam(defaultValue = "false") boolean fresh) {
        if (since != null && until != null && until.isBefore(since)) {
            throw new BadRequestException(ErrorCode.DATE_RANGE_INVALID, "'until' must not be before 'since'");
        }
        return visitorMetricsService.visitors(since, until, fresh);
    }
```

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests PlatformMetricsAdminControllerTest --tests VisitorMetricsUnavailableTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java src/test/java/event_social_media/controller/platform
git commit -m "feat(visitors): add GET /api/admin/metrics/visitors"
```

---

### Task 9: Full suite and PR

- [ ] **Step 1: Run everything** (Docker running, so the Postgres tests run too)

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL, no failures.

- [ ] **Step 2: Update the code graph**

Run: `graphify update .`

- [ ] **Step 3: Push and open the PR into staging**

```bash
git push -u origin HEAD
gh pr create --base staging --title "Admin Visitors section: GA4 numbers per range" --body "$(cat <<'EOF'
Adds `GET /api/admin/metrics/visitors`: Google Analytics visitors, visits, landing pages, language, device and landing page events for a range, with the range's sign-ups per channel next to them. GA sources are sorted with the sign-up channel rules, so both pages use one set of channels. Cached for an hour per range; `fresh=true` asks again.

Off unless `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON` and `GA_START_DATE` are set (`GA_TIME_ZONE` defaults to Europe/Athens). Setup: a service account with Viewer access on the GA4 property, the Data API enabled, and four event-scoped custom dimensions (`section`, `placement`, `plan`, `question`). Until those dimensions exist the page shows everything except the landing events.

Front end: the storywall PR for the Visitors section.

Spec: `docs/superpowers/specs/2026-10-17-admin-visitors-section-design.md` (storywall).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
