# Campaign Visits (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spring counts visits, unique visitors and landing page clicks for saved campaign links without cookies, and serves them in the Campaigns report and a new overview endpoint.

**Architecture:** A public `POST /api/public/campaign-visits` endpoint hands each request to `CampaignVisitRecorder`. The recorder matches a saved link, builds a daily visitor key (SHA-256 of a daily salt, IP, user agent and link id), applies the 30-minute and once-a-day rules through `campaign_visitor_days`, and writes identifier-free rows to `campaign_visit_events`. A nightly job deletes earlier days' salts and keys. `CampaignReportService` adds the counts to each row; a new `CampaignOverviewService` adds totals, a daily series and device/language splits.

**Tech Stack:** Spring Boot, Spring Data JPA (native Postgres queries), Flyway, JUnit 5, Testcontainers (`PostgresTestBase`), MockMvc.

**Spec:** `docs/superpowers/specs/2026-10-28-campaign-visits-design.md` in the storywall repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be). Start a branch from the latest `origin/staging`, e.g. `git switch -c feat/campaign-visits origin/staging`. The local `staging` checkout is behind `origin/staging`, so don't branch from it.

**Run tests with:** `./gradlew test --tests "<fully.qualified.TestClass>"`. Postgres tests skip themselves without Docker. Docker must be running, and the report must show them as passed, not skipped.

---

## File structure

| File | Responsibility |
|---|---|
| `src/main/resources/db/migration/V183__campaign_visits.sql` | The three tables |
| `model/campaign/CampaignVisitKind.java`, `CampaignVisitDevice.java` | Enums |
| `model/campaign/CampaignVisitEvent.java` | A counted visit or click, no identifier |
| `model/campaign/CampaignVisitorDay.java`, `CampaignVisitorDayId.java` | Today's per-visitor state |
| `model/campaign/CampaignVisitSalt.java` | Today's salt |
| `repository/campaign/CampaignVisitEventRepository.java` | Insert + report/overview queries |
| `repository/campaign/CampaignVisitorDayRepository.java` | Upserts and flag updates |
| `repository/campaign/CampaignVisitSaltRepository.java` | Salt upsert and cleanup |
| `service/campaign/CampaignVisitRules.java` | Pure rules: bots, device, key, cleaning, Athens zone |
| `service/campaign/CampaignVisitSalts.java` | The day's salt |
| `service/campaign/CampaignVisitRecorder.java` | One request → maybe one event |
| `service/campaign/CampaignVisitCleanupJob.java` | Deletes earlier days |
| `dto/campaign/CampaignVisitRequestDto.java` | Request body |
| `controller/campaign/CampaignVisitController.java` | Public endpoint |
| `config/SecurityConfig.java` | `permitAll` for the endpoint |
| `dto/platform/CampaignRowDto.java`, `service/platform/CampaignReportService.java` | Report columns and sort |
| `dto/platform/CampaignOverviewDto.java`, `service/platform/CampaignOverviewService.java` | Overview |
| `controller/platform/PlatformMetricsAdminController.java` | `GET /campaigns/overview` |

All Java paths are under `src/main/java/event_social_media/` (tests under `src/test/java/event_social_media/`).

---

### Task 1: Migration, entities and repositories

**Files:**
- Create: `src/main/resources/db/migration/V183__campaign_visits.sql`
- Create: `model/campaign/CampaignVisitKind.java`, `CampaignVisitDevice.java`, `CampaignVisitEvent.java`, `CampaignVisitorDay.java`, `CampaignVisitorDayId.java`, `CampaignVisitSalt.java`
- Create: `repository/campaign/CampaignVisitEventRepository.java`, `CampaignVisitorDayRepository.java`, `CampaignVisitSaltRepository.java`
- Modify: `repository/campaign/CampaignLinkRepository.java`
- Test: `src/test/java/event_social_media/repository/campaign/CampaignVisitTablesPostgresTest.java`

- [ ] **Step 1: Check the migration number**

Run: `ls src/main/resources/db/migration | sed 's/^V\([0-9]*\)__.*/\1/' | sort -n | tail -1`
Expected: `182`. If it's higher, use the next number instead of 183 everywhere in this plan.

- [ ] **Step 2: Write the failing test**

```java
package event_social_media.repository.campaign;

import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

/** The campaign visit tables against real Postgres: the upserts the recorder relies on. */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.seed.enabled=false"
})
@Transactional
class CampaignVisitTablesPostgresTest extends PostgresTestBase {

    private static final LocalDate DAY = LocalDate.of(2007, 1, 3);
    private static final OffsetDateTime NOW = OffsetDateTime.of(2007, 1, 3, 10, 0, 0, 0, ZoneOffset.UTC);

    @Autowired private CampaignVisitSaltRepository salts;
    @Autowired private CampaignVisitorDayRepository visitorDays;

    @Test
    void aSecondSaltForTheSameDayIsIgnored() {
        assertEquals(1, salts.insertIfAbsent(DAY, new byte[] {1}));
        assertEquals(0, salts.insertIfAbsent(DAY, new byte[] {2}));
        assertArrayEquals(new byte[] {1}, salts.findById(DAY).orElseThrow().getSalt());
    }

    @Test
    void aVisitorDayIsInsertedOnceAndEachFlagIsSetOnce() {
        UUID link = UUID.randomUUID();
        String key = "a".repeat(64);
        assertEquals(1, visitorDays.insertIfAbsent(DAY, key, link, NOW));
        assertEquals(0, visitorDays.insertIfAbsent(DAY, key, link, NOW));
        assertEquals(1, visitorDays.markCreate(DAY, key, link));
        assertEquals(0, visitorDays.markCreate(DAY, key, link));
        assertEquals(1, visitorDays.markPlans(DAY, key, link));
        assertEquals(1, visitorDays.markPlan(DAY, key, link));
    }

    @Test
    void anArrivalCountsAgainOnlyAfterTheCutoff() {
        UUID link = UUID.randomUUID();
        String key = "b".repeat(64);
        visitorDays.insertIfAbsent(DAY, key, link, NOW);
        assertEquals(0, visitorDays.markRepeatArrival(DAY, key, link, NOW.plusMinutes(10), NOW.minusMinutes(20)));
        assertEquals(1, visitorDays.markRepeatArrival(DAY, key, link, NOW.plusMinutes(31), NOW.plusMinutes(1)));
    }

    @Test
    void earlierDaysAreDeleted() {
        salts.insertIfAbsent(DAY.minusDays(1), new byte[] {1});
        salts.insertIfAbsent(DAY, new byte[] {2});
        visitorDays.insertIfAbsent(DAY.minusDays(1), "c".repeat(64), UUID.randomUUID(), NOW.minusDays(1));
        visitorDays.insertIfAbsent(DAY, "c".repeat(64), UUID.randomUUID(), NOW);

        assertEquals(1, salts.deleteBefore(DAY));
        assertEquals(1, visitorDays.deleteBefore(DAY));
        assertEquals(1, salts.count());
    }
}
```

`salts.count()` assumes no other test leaves salts behind. Every Postgres test here is `@Transactional` and rolls back, so that holds.

- [ ] **Step 3: Run the test and check that it fails**

Run: `./gradlew test --tests "event_social_media.repository.campaign.CampaignVisitTablesPostgresTest"`
Expected: compile failure, because `CampaignVisitSaltRepository` doesn't exist yet.

- [ ] **Step 4: Write the migration**

`src/main/resources/db/migration/V183__campaign_visits.sql`:

```sql
-- =====================================================
-- CAMPAIGN VISITS
--
-- Visits and landing page clicks from saved campaign links, counted without cookies.
-- campaign_visit_salts and campaign_visitor_days hold only today's rows (Athens time); a nightly
-- job deletes earlier days, so a visitor key can't be rebuilt or matched across days.
-- campaign_visit_events keeps the counts and holds no identifier. It stores the utm values, not
-- the link id, so a deleted link keeps its numbers, like users.signup_utm_*.
-- =====================================================

CREATE TABLE campaign_visit_salts (
    day  DATE PRIMARY KEY,
    salt BYTEA NOT NULL
);

CREATE TABLE campaign_visitor_days (
    day             DATE        NOT NULL,
    visitor_key     CHAR(64)    NOT NULL,
    link_id         UUID        NOT NULL,
    last_arrival_at TIMESTAMPTZ NOT NULL,
    clicked_create  BOOLEAN     NOT NULL DEFAULT FALSE,
    clicked_plans   BOOLEAN     NOT NULL DEFAULT FALSE,
    clicked_plan    BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (day, visitor_key, link_id)
);

CREATE TABLE campaign_visit_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         VARCHAR(10)  NOT NULL,
    utm_source   VARCHAR(100) NOT NULL,
    utm_medium   VARCHAR(100) NOT NULL,
    utm_campaign VARCHAR(100) NOT NULL,
    new_visitor  BOOLEAN      NOT NULL,
    device       VARCHAR(10)  NOT NULL,
    language     VARCHAR(2)   NOT NULL,
    occurred_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT campaign_visit_events_kind_check CHECK (kind IN ('VISIT', 'CREATE', 'PLANS', 'PLAN')),
    CONSTRAINT campaign_visit_events_device_check CHECK (device IN ('PHONE', 'TABLET', 'DESKTOP')),
    CONSTRAINT campaign_visit_events_language_check CHECK (language IN ('el', 'en'))
);

CREATE INDEX campaign_visit_events_occurred_at_idx ON campaign_visit_events (occurred_at);
CREATE INDEX campaign_visit_events_campaign_idx
    ON campaign_visit_events (utm_source, utm_medium, utm_campaign, occurred_at);
```

- [ ] **Step 5: Write the enums and entities**

`model/campaign/CampaignVisitKind.java`:

```java
package event_social_media.model.campaign;

/** What a campaign visit event counts: an arrival, or a landing page click after one. */
public enum CampaignVisitKind {
    VISIT,
    /** "Landing Create". */
    CREATE,
    /** "Landing Plans": the See plans button. */
    PLANS,
    /** "Landing Plan": a specific plan picked. */
    PLAN
}
```

`model/campaign/CampaignVisitDevice.java`:

```java
package event_social_media.model.campaign;

/** Worked out from the User-Agent; only this is kept. */
public enum CampaignVisitDevice {
    PHONE,
    TABLET,
    DESKTOP
}
```

`model/campaign/CampaignVisitEvent.java`:

```java
package event_social_media.model.campaign;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One counted visit or click from a saved campaign link. Anonymous: no IP, user agent, visitor key
 * or link id, only the campaign's values, so the row outlives the link.
 */
@Getter
@Setter
@Entity
@Table(name = "campaign_visit_events")
public class CampaignVisitEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 10)
    private CampaignVisitKind kind;

    @NotNull
    @Column(name = "utm_source", nullable = false, length = 100)
    private String utmSource;

    @NotNull
    @Column(name = "utm_medium", nullable = false, length = 100)
    private String utmMedium;

    @NotNull
    @Column(name = "utm_campaign", nullable = false, length = 100)
    private String utmCampaign;

    /** True on a visitor's first visit of the day on this link; false on repeat visits and clicks. */
    @Column(name = "new_visitor", nullable = false)
    private boolean newVisitor;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "device", nullable = false, length = 10)
    private CampaignVisitDevice device;

    /** {@code el} or {@code en}. */
    @NotNull
    @Column(name = "language", nullable = false, length = 2)
    private String language;

    @NotNull
    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;
}
```

`model/campaign/CampaignVisitorDayId.java`:

```java
package event_social_media.model.campaign;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CampaignVisitorDayId implements Serializable {
    private LocalDate day;
    private String visitorKey;
    private UUID linkId;
}
```

`model/campaign/CampaignVisitorDay.java`:

```java
package event_social_media.model.campaign;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Today's state for one visitor key on one link (Athens day). Written only through the native
 * upserts in {@code CampaignVisitorDayRepository}; rows from earlier days are deleted nightly.
 */
@Getter
@Setter
@Entity
@IdClass(CampaignVisitorDayId.class)
@Table(name = "campaign_visitor_days")
public class CampaignVisitorDay {

    @Id
    @Column(name = "day", nullable = false)
    private LocalDate day;

    @Id
    @Column(name = "visitor_key", nullable = false, length = 64)
    private String visitorKey;

    @Id
    @Column(name = "link_id", nullable = false)
    private UUID linkId;

    @Column(name = "last_arrival_at", nullable = false)
    private OffsetDateTime lastArrivalAt;

    @Column(name = "clicked_create", nullable = false)
    private boolean clickedCreate;

    @Column(name = "clicked_plans", nullable = false)
    private boolean clickedPlans;

    @Column(name = "clicked_plan", nullable = false)
    private boolean clickedPlan;
}
```

`model/campaign/CampaignVisitSalt.java`:

```java
package event_social_media.model.campaign;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/** The random salt for one Athens day's visitor keys. Earlier days' salts are deleted nightly. */
@Getter
@Setter
@Entity
@Table(name = "campaign_visit_salts")
public class CampaignVisitSalt {

    @Id
    @Column(name = "day", nullable = false)
    private LocalDate day;

    @Column(name = "salt", nullable = false)
    private byte[] salt;
}
```

- [ ] **Step 6: Write the repositories**

`repository/campaign/CampaignVisitSaltRepository.java`:

```java
package event_social_media.repository.campaign;

import event_social_media.model.campaign.CampaignVisitSalt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface CampaignVisitSaltRepository extends JpaRepository<CampaignVisitSalt, LocalDate> {

    /** 1 if this salt became the day's, 0 if another request made one first. */
    @Modifying
    @Query(value = "insert into campaign_visit_salts (day, salt) values (:day, :salt) on conflict (day) do nothing",
            nativeQuery = true)
    int insertIfAbsent(@Param("day") LocalDate day, @Param("salt") byte[] salt);

    @Modifying
    @Query("delete from CampaignVisitSalt s where s.day < :day")
    int deleteBefore(@Param("day") LocalDate day);
}
```

`repository/campaign/CampaignVisitorDayRepository.java`:

```java
package event_social_media.repository.campaign;

import event_social_media.model.campaign.CampaignVisitorDay;
import event_social_media.model.campaign.CampaignVisitorDayId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Every write is one atomic statement that reports whether it changed a row, so two tabs arriving
 * at once can't both count as the day's first visit or both count the same click.
 */
public interface CampaignVisitorDayRepository extends JpaRepository<CampaignVisitorDay, CampaignVisitorDayId> {

    String KEY = "day = :day and visitor_key = :key and link_id = :linkId";

    /** 1 for the visitor's first arrival of the day on this link. */
    @Modifying
    @Query(value = """
            insert into campaign_visitor_days (day, visitor_key, link_id, last_arrival_at,
                                               clicked_create, clicked_plans, clicked_plan)
            values (:day, :key, :linkId, :now, false, false, false)
            on conflict (day, visitor_key, link_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("day") LocalDate day, @Param("key") String key,
                       @Param("linkId") UUID linkId, @Param("now") OffsetDateTime now);

    /** 1 when the last arrival was at or before {@code cutoff}: a new visit. Moves the arrival to now. */
    @Modifying
    @Query(value = "update campaign_visitor_days set last_arrival_at = :now where " + KEY
            + " and last_arrival_at <= :cutoff", nativeQuery = true)
    int markRepeatArrival(@Param("day") LocalDate day, @Param("key") String key, @Param("linkId") UUID linkId,
                          @Param("now") OffsetDateTime now, @Param("cutoff") OffsetDateTime cutoff);

    /** Moves the arrival to now without counting a visit: the 30-minute window slides. */
    @Modifying
    @Query(value = "update campaign_visitor_days set last_arrival_at = :now where " + KEY, nativeQuery = true)
    int slideArrival(@Param("day") LocalDate day, @Param("key") String key, @Param("linkId") UUID linkId,
                     @Param("now") OffsetDateTime now);

    @Modifying
    @Query(value = "update campaign_visitor_days set clicked_create = true where " + KEY
            + " and clicked_create = false", nativeQuery = true)
    int markCreate(@Param("day") LocalDate day, @Param("key") String key, @Param("linkId") UUID linkId);

    @Modifying
    @Query(value = "update campaign_visitor_days set clicked_plans = true where " + KEY
            + " and clicked_plans = false", nativeQuery = true)
    int markPlans(@Param("day") LocalDate day, @Param("key") String key, @Param("linkId") UUID linkId);

    @Modifying
    @Query(value = "update campaign_visitor_days set clicked_plan = true where " + KEY
            + " and clicked_plan = false", nativeQuery = true)
    int markPlan(@Param("day") LocalDate day, @Param("key") String key, @Param("linkId") UUID linkId);

    @Modifying
    @Query("delete from CampaignVisitorDay d where d.day < :day")
    int deleteBefore(@Param("day") LocalDate day);
}
```

`repository/campaign/CampaignVisitEventRepository.java` (Task 7 and Task 8 add the read queries):

```java
package event_social_media.repository.campaign;

import event_social_media.model.campaign.CampaignVisitEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CampaignVisitEventRepository extends JpaRepository<CampaignVisitEvent, UUID> {
}
```

Add to `repository/campaign/CampaignLinkRepository.java` (and its `java.util.Optional` import):

```java
    Optional<CampaignLink> findByUtmSourceAndUtmMediumAndUtmCampaign(String utmSource, String utmMedium, String utmCampaign);
```

- [ ] **Step 7: Run the test and check that it passes**

Run: `./gradlew test --tests "event_social_media.repository.campaign.CampaignVisitTablesPostgresTest"`
Expected: PASS, 4 tests (not skipped).

- [ ] **Step 8: Commit**

```bash
git add src/main/resources/db/migration/V183__campaign_visits.sql src/main/java/event_social_media/model/campaign src/main/java/event_social_media/repository/campaign src/test/java/event_social_media/repository/campaign
git commit -m "feat(campaign-visits): add the campaign visit tables"
```

---

### Task 2: Pure rules (bots, device, key, cleaning)

**Files:**
- Create: `service/campaign/CampaignVisitRules.java`
- Test: `src/test/java/event_social_media/service/campaign/CampaignVisitRulesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.campaign;

import event_social_media.model.campaign.CampaignVisitDevice;
import event_social_media.model.campaign.CampaignVisitKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CampaignVisitRulesTest {

    private static final String IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
    private static final String ANDROID_PHONE = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
    private static final String ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";
    private static final String IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
    private static final String MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";

    @ParameterizedTest
    @ValueSource(strings = {
            "Googlebot/2.1 (+http://www.google.com/bot.html)",
            "facebookexternalhit/1.1",
            "Mozilla/5.0 (compatible; bingbot/2.0)",
            "Mozilla/5.0 HeadlessChrome/126.0",
            "Mozilla/5.0 (Linux) Chrome-Lighthouse",
            "Mozilla/5.0 (compatible; Yahoo! Slurp)",
            "WhatsApp/2.23 link preview",
            "Twitterbot/1.0",
            "Mozilla/5.0 (compatible; AhrefsBot/7.0) crawler",
            "python-requests/2.31",
            "curl/8.4.0"
    })
    void botsAndToolsAreBots(String userAgent) {
        assertTrue(CampaignVisitRules.isBot(userAgent));
    }

    @Test
    void aMissingOrBlankUserAgentIsABot() {
        assertTrue(CampaignVisitRules.isBot(null));
        assertTrue(CampaignVisitRules.isBot("  "));
    }

    @Test
    void browsersAreNotBots() {
        assertFalse(CampaignVisitRules.isBot(IPHONE));
        assertFalse(CampaignVisitRules.isBot(MAC));
    }

    @Test
    void devices() {
        assertEquals(CampaignVisitDevice.PHONE, CampaignVisitRules.device(IPHONE));
        assertEquals(CampaignVisitDevice.PHONE, CampaignVisitRules.device(ANDROID_PHONE));
        assertEquals(CampaignVisitDevice.TABLET, CampaignVisitRules.device(ANDROID_TABLET));
        assertEquals(CampaignVisitDevice.TABLET, CampaignVisitRules.device(IPAD));
        assertEquals(CampaignVisitDevice.DESKTOP, CampaignVisitRules.device(MAC));
    }

    @Test
    void theVisitorKeyDependsOnEveryInput() {
        UUID link = UUID.randomUUID();
        byte[] salt = {1, 2, 3};
        String key = CampaignVisitRules.visitorKey(salt, "203.0.113.7", IPHONE, link);

        assertEquals(64, key.length());
        assertEquals(key, CampaignVisitRules.visitorKey(salt, "203.0.113.7", IPHONE, link));
        assertNotEquals(key, CampaignVisitRules.visitorKey(new byte[] {9}, "203.0.113.7", IPHONE, link));
        assertNotEquals(key, CampaignVisitRules.visitorKey(salt, "203.0.113.8", IPHONE, link));
        assertNotEquals(key, CampaignVisitRules.visitorKey(salt, "203.0.113.7", MAC, link));
        assertNotEquals(key, CampaignVisitRules.visitorKey(salt, "203.0.113.7", IPHONE, UUID.randomUUID()));
    }

    @Test
    void utmValuesAreTrimmedAndLowercased() {
        assertEquals("instagram", CampaignVisitRules.utm(" Instagram "));
        assertNull(CampaignVisitRules.utm("   "));
        assertNull(CampaignVisitRules.utm(null));
        assertNull(CampaignVisitRules.utm("x".repeat(101)));
    }

    @Test
    void kindsAndLanguages() {
        assertEquals(CampaignVisitKind.PLAN, CampaignVisitRules.kind("PLAN"));
        assertNull(CampaignVisitRules.kind("plan"));
        assertNull(CampaignVisitRules.kind(null));
        assertEquals("el", CampaignVisitRules.language("el"));
        assertEquals("en", CampaignVisitRules.language("en"));
        assertNull(CampaignVisitRules.language("de"));
        assertNull(CampaignVisitRules.language(null));
    }
}
```

- [ ] **Step 2: Run the test and check that it fails**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignVisitRulesTest"`
Expected: compile failure, because `CampaignVisitRules` doesn't exist.

- [ ] **Step 3: Write the implementation**

```java
package event_social_media.service.campaign;

import event_social_media.model.campaign.CampaignVisitDevice;
import event_social_media.model.campaign.CampaignVisitKind;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** The rules for counting a campaign visit that need no database. */
public final class CampaignVisitRules {

    /** Days, salts and the daily chart run on Athens time. */
    public static final ZoneId ZONE = ZoneId.of("Europe/Athens");

    /** The cap on utm values, as on {@code CampaignLink} and {@code VisitSourceDto}. */
    private static final int UTM_MAX = 100;

    private static final Set<String> LANGUAGES = Set.of("el", "en");

    /** Lowercase pieces of User-Agents that are crawlers, link previews, test tools or scripts. */
    private static final List<String> BOT_MARKERS = List.of(
            "bot", "crawler", "spider", "slurp", "headless", "lighthouse", "preview",
            "facebookexternalhit", "python-requests", "curl/", "wget/", "httpclient", "okhttp");

    private CampaignVisitRules() {}

    /** Missing, blank or bot-like. */
    public static boolean isBot(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return true;
        String lower = userAgent.toLowerCase(Locale.ROOT);
        return BOT_MARKERS.stream().anyMatch(lower::contains);
    }

    public static CampaignVisitDevice device(String userAgent) {
        String agent = userAgent == null ? "" : userAgent;
        boolean android = agent.contains("Android");
        if (agent.contains("iPad") || agent.contains("Tablet") || (android && !agent.contains("Mobile"))) {
            return CampaignVisitDevice.TABLET;
        }
        if (agent.contains("Mobi") || agent.contains("iPhone") || android) return CampaignVisitDevice.PHONE;
        return CampaignVisitDevice.DESKTOP;
    }

    /** SHA-256 of the day's salt, the IP, the User-Agent and the link, as 64 hex characters. */
    public static String visitorKey(byte[] salt, String clientIp, String userAgent, UUID linkId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt);
            digest.update((clientIp + "\n" + userAgent + "\n" + linkId).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is missing", e);
        }
    }

    /** Trimmed and lowercased, as saved links store them; null when empty or too long. */
    public static String utm(String value) {
        if (value == null) return null;
        String cleaned = value.trim().toLowerCase(Locale.ROOT);
        return cleaned.isEmpty() || cleaned.length() > UTM_MAX ? null : cleaned;
    }

    public static CampaignVisitKind kind(String value) {
        if (value == null) return null;
        try {
            return CampaignVisitKind.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public static String language(String value) {
        return value != null && LANGUAGES.contains(value) ? value : null;
    }
}
```

- [ ] **Step 4: Run the test and check that it passes**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignVisitRulesTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/campaign/CampaignVisitRules.java src/test/java/event_social_media/service/campaign/CampaignVisitRulesTest.java
git commit -m "feat(campaign-visits): add the visit counting rules"
```

---

### Task 3: The day's salt and the recorder

**Files:**
- Create: `dto/campaign/CampaignVisitRequestDto.java`
- Create: `service/campaign/CampaignVisitSalts.java`
- Create: `service/campaign/CampaignVisitRecorder.java`
- Test: `src/test/java/event_social_media/service/campaign/CampaignVisitRecorderPostgresTest.java`

- [ ] **Step 1: Write the request DTO**

```java
package event_social_media.dto.campaign;

/**
 * {@code POST /api/public/campaign-visits}. Plain strings, checked by {@code CampaignVisitRecorder},
 * so a bad value is ignored instead of answered with an error that tells the caller anything.
 */
public record CampaignVisitRequestDto(
        String kind,
        String utmSource,
        String utmMedium,
        String utmCampaign,
        String language) {
}
```

- [ ] **Step 2: Write the failing test**

```java
package event_social_media.service.campaign;

import event_social_media.dto.campaign.CampaignVisitRequestDto;
import event_social_media.model.campaign.CampaignLink;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The recorder against real Postgres. Every test uses its own campaign value (t2007-…), so counts
 * only see this class's rows.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.seed.enabled=false"
})
@Transactional
class CampaignVisitRecorderPostgresTest extends PostgresTestBase {

    /** 12:00 in Athens (UTC+2 in March before DST). */
    private static final Instant NOON = Instant.parse("2007-03-01T10:00:00Z");
    private static final String IP = "203.0.113.7";
    private static final String IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

    @Autowired private CampaignVisitRecorder recorder;
    @Autowired private CampaignLinkRepository linkRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @AfterEach
    void resetClock() {
        recorder.setClock(Clock.systemUTC());
    }

    private void at(Instant instant) {
        recorder.setClock(Clock.fixed(instant, ZoneOffset.UTC));
    }

    private void link(String campaign) {
        CampaignLink link = new CampaignLink();
        link.setName(campaign);
        link.setDestinationPath("/");
        link.setUtmSource("instagram");
        link.setUtmMedium("social");
        link.setUtmCampaign(campaign);
        linkRepository.saveAndFlush(link);
    }

    private static CampaignVisitRequestDto request(String kind, String campaign) {
        return new CampaignVisitRequestDto(kind, "Instagram", "social", campaign, "el");
    }

    private boolean record(String kind, String campaign) {
        return recorder.record(request(kind, campaign), IP, IPHONE);
    }

    private long events(String campaign, String kind, boolean newVisitor) {
        return jdbcTemplate.queryForObject("select count(*) from campaign_visit_events "
                + "where utm_campaign = ? and kind = ? and new_visitor = ?", Long.class, campaign, kind, newVisitor);
    }

    @Test
    void aFirstVisitIsANewVisitorWithDeviceAndLanguage() {
        link("t2007-first");
        at(NOON);

        assertTrue(record("VISIT", "t2007-first"));

        assertEquals(1, events("t2007-first", "VISIT", true));
        assertEquals("PHONE", jdbcTemplate.queryForObject(
                "select device from campaign_visit_events where utm_campaign = 't2007-first'", String.class));
        assertEquals("el", jdbcTemplate.queryForObject(
                "select language from campaign_visit_events where utm_campaign = 't2007-first'", String.class));
    }

    @Test
    void anUnsavedCampaignIsIgnored() {
        at(NOON);
        assertFalse(record("VISIT", "t2007-unsaved"));
        assertEquals(0, events("t2007-unsaved", "VISIT", true));
    }

    @Test
    void botsAndBadValuesAreIgnored() {
        link("t2007-bots");
        at(NOON);

        assertFalse(recorder.record(request("VISIT", "t2007-bots"), IP, "Googlebot/2.1"));
        assertFalse(recorder.record(request("VISIT", "t2007-bots"), IP, null));
        assertFalse(recorder.record(request("visit", "t2007-bots"), IP, IPHONE));
        assertFalse(recorder.record(new CampaignVisitRequestDto("VISIT", "instagram", "social", "t2007-bots", "de"), IP, IPHONE));
        assertFalse(recorder.record(request("VISIT", "t2007-bots"), null, IPHONE));
        assertEquals(0, events("t2007-bots", "VISIT", true));
    }

    @Test
    void theThirtyMinuteWindowSlides() {
        link("t2007-window");
        at(NOON);
        assertTrue(record("VISIT", "t2007-window"));

        at(NOON.plus(Duration.ofMinutes(20)));
        assertFalse(record("VISIT", "t2007-window"));

        // 40 minutes after the first arrival but 20 after the last one: still inside the window.
        at(NOON.plus(Duration.ofMinutes(40)));
        assertFalse(record("VISIT", "t2007-window"));

        at(NOON.plus(Duration.ofMinutes(71)));
        assertTrue(record("VISIT", "t2007-window"));

        assertEquals(1, events("t2007-window", "VISIT", true));
        assertEquals(1, events("t2007-window", "VISIT", false));
    }

    @Test
    void theNextAthensDayIsANewVisitor() {
        link("t2007-days");
        // 23:50 and 00:10 Athens time.
        at(Instant.parse("2007-03-01T21:50:00Z"));
        assertTrue(record("VISIT", "t2007-days"));
        at(Instant.parse("2007-03-01T22:10:00Z"));
        assertTrue(record("VISIT", "t2007-days"));

        assertEquals(2, events("t2007-days", "VISIT", true));
    }

    @Test
    void eachClickCountsOncePerVisitorAndDay() {
        link("t2007-clicks");
        at(NOON);
        record("VISIT", "t2007-clicks");

        assertTrue(record("CREATE", "t2007-clicks"));
        assertFalse(record("CREATE", "t2007-clicks"));
        assertTrue(record("PLANS", "t2007-clicks"));
        assertTrue(record("PLAN", "t2007-clicks"));
        assertFalse(record("PLAN", "t2007-clicks"));

        assertEquals(1, events("t2007-clicks", "CREATE", false));
        assertEquals(1, events("t2007-clicks", "PLANS", false));
        assertEquals(1, events("t2007-clicks", "PLAN", false));
    }

    @Test
    void aClickWithoutAVisitThatDayIsIgnored() {
        link("t2007-orphan");
        at(NOON);
        assertFalse(record("CREATE", "t2007-orphan"));
        assertEquals(0, events("t2007-orphan", "CREATE", false));
    }

    @Test
    void anotherBrowserIsAnotherVisitor() {
        link("t2007-two");
        at(NOON);
        record("VISIT", "t2007-two");
        recorder.record(request("VISIT", "t2007-two"), IP, "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15");

        assertEquals(2, events("t2007-two", "VISIT", true));
    }
}
```

- [ ] **Step 3: Run the test and check that it fails**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignVisitRecorderPostgresTest"`
Expected: compile failure, because `CampaignVisitRecorder` doesn't exist.

- [ ] **Step 4: Write the salt service**

```java
package event_social_media.service.campaign;

import event_social_media.repository.campaign.CampaignVisitSaltRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDate;

/** One random salt per Athens day, shared by every instance through the database. */
@Service
@RequiredArgsConstructor
public class CampaignVisitSalts {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final CampaignVisitSaltRepository repository;

    /** The day's salt, made by whichever request needs it first. Runs in the caller's transaction. */
    public byte[] forDay(LocalDate day) {
        byte[] fresh = new byte[32];
        RANDOM.nextBytes(fresh);
        repository.insertIfAbsent(day, fresh);
        return repository.findById(day).orElseThrow().getSalt();
    }
}
```

- [ ] **Step 5: Write the recorder**

```java
package event_social_media.service.campaign;

import event_social_media.dto.campaign.CampaignVisitRequestDto;
import event_social_media.model.campaign.CampaignLink;
import event_social_media.model.campaign.CampaignVisitEvent;
import event_social_media.model.campaign.CampaignVisitKind;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.repository.campaign.CampaignVisitEventRepository;
import event_social_media.repository.campaign.CampaignVisitorDayRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Turns one {@code POST /api/public/campaign-visits} into at most one {@link CampaignVisitEvent}.
 * Only saved links count. A visit counts unless the same visitor arrived on the same link in the
 * last 30 minutes; each click counts once per visitor, link and Athens day, and only after a visit
 * that day. The IP and User-Agent only go into the visitor key and are never stored.
 */
@Service
@RequiredArgsConstructor
public class CampaignVisitRecorder {

    static final Duration VISIT_WINDOW = Duration.ofMinutes(30);

    private final CampaignLinkRepository linkRepository;
    private final CampaignVisitSalts salts;
    private final CampaignVisitorDayRepository visitorDays;
    private final CampaignVisitEventRepository events;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    /** @return whether an event was written */
    @Transactional
    public boolean record(CampaignVisitRequestDto request, String clientIp, String userAgent) {
        CampaignVisitKind kind = CampaignVisitRules.kind(request.kind());
        String language = CampaignVisitRules.language(request.language());
        if (kind == null || language == null || clientIp == null || CampaignVisitRules.isBot(userAgent)) {
            return false;
        }
        String source = CampaignVisitRules.utm(request.utmSource());
        String medium = CampaignVisitRules.utm(request.utmMedium());
        String campaign = CampaignVisitRules.utm(request.utmCampaign());
        if (source == null || medium == null || campaign == null) return false;
        CampaignLink link = linkRepository.findByUtmSourceAndUtmMediumAndUtmCampaign(source, medium, campaign).orElse(null);
        if (link == null) return false;

        OffsetDateTime now = OffsetDateTime.now(clock);
        LocalDate day = now.atZoneSameInstant(CampaignVisitRules.ZONE).toLocalDate();
        String key = CampaignVisitRules.visitorKey(salts.forDay(day), clientIp, userAgent, link.getId());

        Boolean newVisitor = kind == CampaignVisitKind.VISIT
                ? visit(day, key, link.getId(), now)
                : click(kind, day, key, link.getId());
        if (newVisitor == null) return false;

        CampaignVisitEvent event = new CampaignVisitEvent();
        event.setKind(kind);
        event.setUtmSource(link.getUtmSource());
        event.setUtmMedium(link.getUtmMedium());
        event.setUtmCampaign(link.getUtmCampaign());
        event.setNewVisitor(newVisitor);
        event.setDevice(CampaignVisitRules.device(userAgent));
        event.setLanguage(language);
        event.setOccurredAt(now);
        events.save(event);
        return true;
    }

    /** True for the day's first visit, false for a visit after the window, null inside the window. */
    private Boolean visit(LocalDate day, String key, UUID linkId, OffsetDateTime now) {
        if (visitorDays.insertIfAbsent(day, key, linkId, now) == 1) return true;
        if (visitorDays.markRepeatArrival(day, key, linkId, now, now.minus(VISIT_WINDOW)) == 1) return false;
        visitorDays.slideArrival(day, key, linkId, now);
        return null;
    }

    /** False when this is the visitor's first such click today after a visit, otherwise null. */
    private Boolean click(CampaignVisitKind kind, LocalDate day, String key, UUID linkId) {
        int marked = switch (kind) {
            case CREATE -> visitorDays.markCreate(day, key, linkId);
            case PLANS -> visitorDays.markPlans(day, key, linkId);
            case PLAN -> visitorDays.markPlan(day, key, linkId);
            case VISIT -> 0;
        };
        return marked == 1 ? Boolean.FALSE : null;
    }
}
```

- [ ] **Step 6: Run the test and check that it passes**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignVisitRecorderPostgresTest"`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/dto/campaign/CampaignVisitRequestDto.java src/main/java/event_social_media/service/campaign src/test/java/event_social_media/service/campaign/CampaignVisitRecorderPostgresTest.java
git commit -m "feat(campaign-visits): record visits and clicks for saved links"
```

---

### Task 4: Public endpoint and security

**Files:**
- Create: `controller/campaign/CampaignVisitController.java`
- Modify: `config/SecurityConfig.java` (the `permitAll` list near `/api/public/partner-applications`)
- Test: `src/test/java/event_social_media/controller/campaign/CampaignVisitControllerTest.java`
- Test: `src/test/java/event_social_media/controller/campaign/CampaignVisitControllerRateLimitTest.java`

- [ ] **Step 1: Write the failing tests**

`CampaignVisitControllerTest.java`:

```java
package event_social_media.controller.campaign;

import event_social_media.dto.campaign.CampaignVisitRequestDto;
import event_social_media.service.campaign.CampaignVisitRecorder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignVisitControllerTest {

    private static final String BODY = """
            {"kind":"VISIT","utmSource":"instagram","utmMedium":"social","utmCampaign":"spring","language":"el"}""";

    @Autowired private MockMvc mockMvc;
    @MockBean private CampaignVisitRecorder recorder;

    @Test
    void anonymousCallersGet204AndTheRecorderGetsTheAddressAndBrowser() throws Exception {
        when(recorder.record(any(), any(), any())).thenReturn(true);

        mockMvc.perform(post("/api/public/campaign-visits")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY)
                        .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (iPhone)")
                        .with(request -> {
                            request.setRemoteAddr("203.0.113.7");
                            return request;
                        }))
                .andExpect(status().isNoContent());

        verify(recorder).record(
                eq(new CampaignVisitRequestDto("VISIT", "instagram", "social", "spring", "el")),
                eq("203.0.113.7"),
                eq("Mozilla/5.0 (iPhone)"));
    }

    @Test
    void anIgnoredRequestAlsoGets204() throws Exception {
        when(recorder.record(any(), any(), any())).thenReturn(false);
        mockMvc.perform(post("/api/public/campaign-visits").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNoContent());
    }

    @Test
    void aFailureAlsoGets204() throws Exception {
        when(recorder.record(any(), any(), any())).thenThrow(new IllegalStateException("boom"));
        mockMvc.perform(post("/api/public/campaign-visits").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNoContent());
    }
}
```

`CampaignVisitControllerRateLimitTest.java`:

```java
package event_social_media.controller.campaign;

import event_social_media.service.campaign.CampaignVisitRecorder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Campaign visits are budgeted at 120 a minute per address. Its own class because it needs rate limiting on. */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.rate-limit.enabled=true")
class CampaignVisitControllerRateLimitTest {

    private static final String BODY = """
            {"kind":"VISIT","utmSource":"instagram","utmMedium":"social","utmCampaign":"spring","language":"el"}""";

    @Autowired private MockMvc mockMvc;
    @MockBean private CampaignVisitRecorder recorder;

    private ResultActions sendFrom(String ip) throws Exception {
        return mockMvc.perform(post("/api/public/campaign-visits")
                .contentType(MediaType.APPLICATION_JSON).content(BODY)
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                }));
    }

    @Test
    void the121stRequestInAMinuteIsRefusedAndAnotherAddressIsUnaffected() throws Exception {
        for (int i = 0; i < 120; i++) {
            sendFrom("10.0.9.11").andExpect(status().isNoContent());
        }
        sendFrom("10.0.9.11").andExpect(status().isTooManyRequests());

        sendFrom("10.0.9.12").andExpect(status().isNoContent());
    }
}
```

- [ ] **Step 2: Run the tests and check that they fail**

Run: `./gradlew test --tests "event_social_media.controller.campaign.CampaignVisitController*"`
Expected: FAIL. You get either a 401/403 (the endpoint isn't public) or a 404 (no handler).

- [ ] **Step 3: Write the controller**

Check `security/ClientAddressResolver.java` first: it must be a Spring bean (`@Component`). If it isn't, look at how `AuthController` gets it and do the same.

```java
package event_social_media.controller.campaign;

import event_social_media.dto.campaign.CampaignVisitRequestDto;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.campaign.CampaignVisitRecorder;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public: the landing pages report a campaign arrival or click here, without a session or cookie.
 * Always 204, counted or not, so it says nothing about which links exist.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class CampaignVisitController {

    private final CampaignVisitRecorder recorder;
    private final ClientAddressResolver clientAddressResolver;

    @PostMapping("/api/public/campaign-visits")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RateLimit(name = "campaign-visits.record", limit = 120, windowSeconds = 60)
    public void record(@RequestBody CampaignVisitRequestDto dto, HttpServletRequest request) {
        try {
            recorder.record(dto, clientAddressResolver.resolve(request), request.getHeader(HttpHeaders.USER_AGENT));
        } catch (RuntimeException ex) {
            log.warn("Campaign visit was not recorded", ex);
        }
    }
}
```

- [ ] **Step 4: Open the endpoint in `SecurityConfig`**

Add this right after the `/api/public/partner-applications` matcher:

```java
                        // Campaign arrivals and landing page clicks: anonymous visitors, no cookie. Always
                        // 204, rate-limited per IP, and only saved campaign links are counted.
                        .requestMatchers(HttpMethod.POST, "/api/public/campaign-visits").permitAll()
```

- [ ] **Step 5: Run the tests and check that they pass**

Run: `./gradlew test --tests "event_social_media.controller.campaign.CampaignVisitController*"`
Expected: PASS, 4 tests.

- [ ] **Step 6: Check CORS for the browser's preflight**

The browser sends `Content-Type: application/json` from the site origin, so it makes a preflight first. Find the CORS setup with `git grep -n "allowedHeaders\|CorsConfiguration" src/main/java`. Confirm that `POST` and `Content-Type` are allowed for every path, not just a list. If they're only allowed for a list of paths, add `/api/public/campaign-visits` to it.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/controller/campaign/CampaignVisitController.java src/main/java/event_social_media/config/SecurityConfig.java src/test/java/event_social_media/controller/campaign
git commit -m "feat(campaign-visits): add the public campaign visit endpoint"
```

---

### Task 5: Nightly cleanup

**Files:**
- Create: `service/campaign/CampaignVisitCleanupJob.java`
- Test: `src/test/java/event_social_media/service/campaign/CampaignVisitCleanupJobPostgresTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.campaign;

import event_social_media.repository.campaign.CampaignVisitSaltRepository;
import event_social_media.repository.campaign.CampaignVisitorDayRepository;
import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.seed.enabled=false"
})
@Transactional
class CampaignVisitCleanupJobPostgresTest extends PostgresTestBase {

    @Autowired private CampaignVisitCleanupJob job;
    @Autowired private CampaignVisitSaltRepository salts;
    @Autowired private CampaignVisitorDayRepository visitorDays;

    @AfterEach
    void resetClock() {
        job.setClock(Clock.systemUTC());
    }

    @Test
    void deletesEveryEarlierAthensDayAndKeepsToday() {
        // 00:05 on 2008-01-03 in Athens.
        job.setClock(Clock.fixed(Instant.parse("2008-01-02T22:05:00Z"), ZoneOffset.UTC));
        LocalDate today = LocalDate.of(2008, 1, 3);
        salts.insertIfAbsent(today.minusDays(1), new byte[] {1});
        salts.insertIfAbsent(today, new byte[] {2});
        visitorDays.insertIfAbsent(today.minusDays(1), "d".repeat(64), UUID.randomUUID(), OffsetDateTime.now());
        visitorDays.insertIfAbsent(today, "d".repeat(64), UUID.randomUUID(), OffsetDateTime.now());

        assertEquals(2, job.run());

        assertTrue(salts.findById(today).isPresent());
        assertEquals(1, visitorDays.count());
    }
}
```

- [ ] **Step 2: Run the test and check that it fails**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignVisitCleanupJobPostgresTest"`
Expected: compile failure, because `CampaignVisitCleanupJob` doesn't exist.

- [ ] **Step 3: Write the job**

```java
package event_social_media.service.campaign;

import event_social_media.repository.campaign.CampaignVisitSaltRepository;
import event_social_media.repository.campaign.CampaignVisitorDayRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Deletes earlier days' salts and visitor keys after Athens midnight, so a key can't be rebuilt.
 * Recording only reads today's rows, so a missed run changes no counts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignVisitCleanupJob {

    private final CampaignVisitSaltRepository salts;
    private final CampaignVisitorDayRepository visitorDays;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    @Scheduled(cron = "${app.campaign-visits.cleanup.cron:0 5 0 * * *}", zone = "Europe/Athens")
    public void runScheduled() {
        log.info("Campaign visit cleanup deleted {} row(s)", run());
    }

    /** @return how many salt and visitor rows were deleted */
    @Transactional
    public int run() {
        LocalDate today = LocalDate.now(clock.withZone(CampaignVisitRules.ZONE));
        return salts.deleteBefore(today) + visitorDays.deleteBefore(today);
    }
}
```

- [ ] **Step 4: Run the test and check that it passes**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignVisitCleanupJobPostgresTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/campaign/CampaignVisitCleanupJob.java src/test/java/event_social_media/service/campaign/CampaignVisitCleanupJobPostgresTest.java
git commit -m "feat(campaign-visits): delete earlier days' salts and visitor keys nightly"
```

---

### Task 6: Visit columns in the Campaigns report

**Files:**
- Modify: `repository/campaign/CampaignVisitEventRepository.java`
- Modify: `dto/platform/CampaignRowDto.java`
- Modify: `service/platform/CampaignReportService.java`
- Test: `src/test/java/event_social_media/service/platform/CampaignReportPostgresTest.java`

- [ ] **Step 1: Write the failing test**

Add to `CampaignReportPostgresTest` (and add `import java.util.Comparator;` only if it's needed):

```java
    private void visitEvent(String campaign, String kind, boolean newVisitor, OffsetDateTime at) {
        jdbcTemplate.update("insert into campaign_visit_events (kind, utm_source, utm_medium, utm_campaign, "
                + "new_visitor, device, language, occurred_at) values (?, 'instagram', 'social', ?, ?, 'PHONE', 'el', ?)",
                kind, campaign, newVisitor, at);
    }

    @Test
    void addsVisitsAndClicksInTheRange_andSortsByVisits() {
        link("Story", "instagram", "social", "t2005-story");
        link("Reel", "instagram", "social", "t2005-reel");
        signedUp("instagram", "social", "t2005-reel", SINCE.plusHours(1));
        visitEvent("t2005-story", "VISIT", true, SINCE.plusHours(1));
        visitEvent("t2005-story", "VISIT", false, SINCE.plusHours(2));
        visitEvent("t2005-story", "VISIT", true, SINCE.plusHours(3));
        visitEvent("t2005-story", "CREATE", false, SINCE.plusHours(3));
        visitEvent("t2005-story", "PLANS", false, SINCE.plusHours(3));
        visitEvent("t2005-story", "PLAN", false, SINCE.plusHours(3));
        visitEvent("t2005-story", "VISIT", true, UNTIL.plusHours(1));
        visitEvent("t2005-reel", "VISIT", true, SINCE.plusHours(1));

        List<CampaignRowDto> rows = campaignReportService.campaigns(SINCE, UNTIL);

        CampaignRowDto story = rowFor(rows, "t2005-story");
        assertEquals(3, story.getVisits());
        assertEquals(2, story.getVisitors());
        assertEquals(1, story.getCreateClicks());
        assertEquals(1, story.getPlansClicks());
        assertEquals(1, story.getPlanPicks());
        assertEquals(0, story.getSignedUp());

        List<String> order = rows.stream().map(CampaignRowDto::getUtmCampaign)
                .filter(c -> "t2005-story".equals(c) || "t2005-reel".equals(c)).toList();
        assertEquals(List.of("t2005-story", "t2005-reel"), order);
    }
```

The class's existing test still expects bio → launch → unused. None of them has visits, so the sign-up tie-breaker keeps that order.

- [ ] **Step 2: Run the test and check that it fails**

Run: `./gradlew test --tests "event_social_media.service.platform.CampaignReportPostgresTest"`
Expected: compile failure, because `getVisits()` doesn't exist.

- [ ] **Step 3: Add the report query**

Replace `CampaignVisitEventRepository` with:

```java
package event_social_media.repository.campaign;

import event_social_media.model.campaign.CampaignVisitEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CampaignVisitEventRepository extends JpaRepository<CampaignVisitEvent, UUID> {

    /** Visits, visitors and clicks in {@code [:since, :until)} per (source, medium, campaign). */
    @Query(value = """
            select utm_source as "utmSource", utm_medium as "utmMedium", utm_campaign as "utmCampaign",
                   count(*) filter (where kind = 'VISIT') as "visits",
                   count(*) filter (where kind = 'VISIT' and new_visitor) as "visitors",
                   count(*) filter (where kind = 'CREATE') as "createClicks",
                   count(*) filter (where kind = 'PLANS') as "plansClicks",
                   count(*) filter (where kind = 'PLAN') as "planPicks"
            from campaign_visit_events
            where occurred_at >= :since and occurred_at < :until
            group by 1, 2, 3
            """, nativeQuery = true)
    List<CampaignVisitRow> campaigns(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until);

    interface CampaignVisitRow {
        String getUtmSource();
        String getUtmMedium();
        String getUtmCampaign();
        long getVisits();
        long getVisitors();
        long getCreateClicks();
        long getPlansClicks();
        long getPlanPicks();
    }
}
```

- [ ] **Step 4: Add the columns to `CampaignRowDto`**

Replace the Javadoc and add the fields after `link`:

```java
/**
 * One row of {@code GET /api/admin/metrics/campaigns}: for one (source, medium, campaign), the
 * visits, visitors and landing page clicks counted in the range (saved links only), and the accounts
 * that signed up in the range, counted as on {@link FunnelChannelRowDto}. {@code link} is the saved
 * campaign link with the same values, or null. A saved link with nothing in the range is a row of
 * zeros.
 */
@Data
public class CampaignRowDto {
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private CampaignLinkDto link;
    private long visits;
    private long visitors;
    private long createClicks;
    private long plansClicks;
    private long planPicks;
    private long signedUp;
    private long createdEvent;
    private long paidHost;
    private Map<String, Long> revenueMinorByCurrency = new TreeMap<>();
}
```

- [ ] **Step 5: Merge visits into the report and sort by visits**

In `CampaignReportService`:
- add `private final CampaignVisitEventRepository visitRepository;` after `linkRepository`, and import `event_social_media.repository.campaign.CampaignVisitEventRepository`;
- make `BEGINNING` and `END` package-private (`static final`, without `private`), because Task 7 reuses them;
- update the class Javadoc's first sentence to: "Assembles {@code GET /api/admin/metrics/campaigns}: visits from {@link CampaignVisitEventRepository} and sign-ups from {@link FunnelMetricsRepository} per (source, medium, campaign), each matched to the saved campaign link with the same values."

Then add this loop after the revenue loop:

```java
        for (CampaignVisitEventRepository.CampaignVisitRow row : visitRepository.campaigns(from, to)) {
            CampaignRowDto dto = row(new Key(row.getUtmSource(), row.getUtmMedium(), row.getUtmCampaign()), byKey);
            dto.setVisits(row.getVisits());
            dto.setVisitors(row.getVisitors());
            dto.setCreateClicks(row.getCreateClicks());
            dto.setPlansClicks(row.getPlansClicks());
            dto.setPlanPicks(row.getPlanPicks());
        }
```

Then replace the start of the sort and update the method Javadoc to "Most visits first, then most sign-ups; on a tie…":

```java
        rows.sort(Comparator.comparingLong(CampaignRowDto::getVisits).reversed()
                .thenComparing(Comparator.comparingLong(CampaignRowDto::getSignedUp).reversed())
                .thenComparing(row -> row.getLink() == null)
```

The rest of the chain stays as it is.

- [ ] **Step 6: Run the tests and check that they pass**

Run: `./gradlew test --tests "event_social_media.service.platform.CampaignReportPostgresTest"`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/repository/campaign/CampaignVisitEventRepository.java src/main/java/event_social_media/dto/platform/CampaignRowDto.java src/main/java/event_social_media/service/platform/CampaignReportService.java src/test/java/event_social_media/service/platform/CampaignReportPostgresTest.java
git commit -m "feat(campaign-visits): add visits and clicks to the campaigns report"
```

---

### Task 7: The overview endpoint

**Files:**
- Modify: `repository/campaign/CampaignVisitEventRepository.java`
- Create: `dto/platform/CampaignOverviewDto.java`
- Create: `service/platform/CampaignOverviewService.java`
- Modify: `controller/platform/PlatformMetricsAdminController.java`
- Test: `src/test/java/event_social_media/service/platform/CampaignOverviewPostgresTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.platform;

import event_social_media.dto.platform.CampaignOverviewDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.campaign.CampaignLink;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.support.PostgresTestBase;
import event_social_media.support.TestFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * {@code /metrics/campaigns/overview} against real Postgres. Everything sits in January 2006,
 * a window no other test uses, so the all-links totals only see this class's rows.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.seed.enabled=false"
})
@Transactional
class CampaignOverviewPostgresTest extends PostgresTestBase {

    /** Midnight on 2006-01-03 in Athens (UTC+2). */
    private static final OffsetDateTime SINCE = OffsetDateTime.of(2006, 1, 2, 22, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime UNTIL = SINCE.plusDays(3);

    @Autowired private CampaignOverviewService overviewService;
    @Autowired private CampaignLinkRepository campaignLinkRepository;
    @Autowired private TestFixtures fixtures;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    private CampaignLink link(String campaign) {
        CampaignLink link = new CampaignLink();
        link.setName(campaign);
        link.setDestinationPath("/");
        link.setUtmSource("instagram");
        link.setUtmMedium("social");
        link.setUtmCampaign(campaign);
        return campaignLinkRepository.saveAndFlush(link);
    }

    private void event(String campaign, String kind, boolean newVisitor, String device, String language, OffsetDateTime at) {
        jdbcTemplate.update("insert into campaign_visit_events (kind, utm_source, utm_medium, utm_campaign, "
                + "new_visitor, device, language, occurred_at) values (?, 'instagram', 'social', ?, ?, ?, ?, ?)",
                kind, campaign, newVisitor, device, language, at);
    }

    private void signedUp(String campaign, OffsetDateTime at) {
        UUID id = fixtures.newUser().getId();
        entityManager.flush();
        jdbcTemplate.update("update users set created_at = ?, signup_utm_source = 'instagram', "
                + "signup_utm_medium = 'social', signup_utm_campaign = ? where id = ?", at, campaign, id);
    }

    @Test
    void totalsDailyAndSplitsForEveryLink() {
        link("t2006-a");
        link("t2006-b");
        // 00:30 Athens on Jan 3, then Jan 5.
        event("t2006-a", "VISIT", true, "PHONE", "el", SINCE.plusMinutes(30));
        event("t2006-a", "VISIT", false, "PHONE", "el", SINCE.plusHours(2));
        event("t2006-a", "CREATE", false, "PHONE", "el", SINCE.plusHours(2));
        event("t2006-b", "VISIT", true, "DESKTOP", "en", SINCE.plusDays(2));
        event("t2006-b", "PLAN", false, "DESKTOP", "en", SINCE.plusDays(2));
        // 23:30 Athens on Jan 2: before the range.
        event("t2006-a", "VISIT", true, "PHONE", "el", SINCE.minusMinutes(30));
        signedUp("t2006-a", SINCE.plusHours(3));

        CampaignOverviewDto overview = overviewService.overview(SINCE, UNTIL, null);

        assertEquals(3, overview.getVisits());
        assertEquals(2, overview.getVisitors());
        assertEquals(1, overview.getCreateClicks());
        assertEquals(0, overview.getPlansClicks());
        assertEquals(1, overview.getPlanPicks());
        assertEquals(1, overview.getSignedUp());
        assertEquals(List.of(
                new CampaignOverviewDto.Day("2006-01-03", 2, 1),
                new CampaignOverviewDto.Day("2006-01-04", 0, 0),
                new CampaignOverviewDto.Day("2006-01-05", 1, 1)), overview.getDaily());
        assertEquals(List.of(new CampaignOverviewDto.Device("PHONE", 2), new CampaignOverviewDto.Device("DESKTOP", 1)),
                overview.getDevices());
        assertEquals(List.of(new CampaignOverviewDto.Language("el", 2), new CampaignOverviewDto.Language("en", 1)),
                overview.getLanguages());
    }

    @Test
    void oneLinkOnly() {
        CampaignLink a = link("t2006-c");
        link("t2006-d");
        event("t2006-c", "VISIT", true, "PHONE", "el", SINCE.plusHours(1));
        event("t2006-d", "VISIT", true, "PHONE", "el", SINCE.plusHours(1));

        CampaignOverviewDto overview = overviewService.overview(SINCE, UNTIL, a.getId());

        assertEquals(1, overview.getVisits());
        assertEquals(3, overview.getDaily().size());
    }

    @Test
    void anOpenStartBeginsAtTheFirstVisitAndNoVisitsMeansNoDays() {
        CampaignLink quiet = link("t2006-quiet");
        assertEquals(List.of(), overviewService.overview(null, UNTIL, quiet.getId()).getDaily());

        CampaignLink e = link("t2006-e");
        event("t2006-e", "VISIT", true, "PHONE", "el", SINCE.plusDays(1));
        assertEquals("2006-01-04", overviewService.overview(null, UNTIL, e.getId()).getDaily().getFirst().date());
    }

    @Test
    void anUnknownLinkIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> overviewService.overview(SINCE, UNTIL, UUID.randomUUID()));
    }
}
```

- [ ] **Step 2: Run the test and check that it fails**

Run: `./gradlew test --tests "event_social_media.service.platform.CampaignOverviewPostgresTest"`
Expected: compile failure, because `CampaignOverviewService` doesn't exist.

- [ ] **Step 3: Add the overview queries**

Add these to `CampaignVisitEventRepository`. With `all = true` the triple is ignored (pass empty strings); otherwise only that link's values count.

```java
    String ONE_OR_ALL = "(:all = true or (utm_source = :source and utm_medium = :medium and utm_campaign = :campaign))";

    /** Visits and visitors per Athens day in {@code [:since, :until)}, only days with a visit. */
    @Query(value = """
            select to_char(occurred_at at time zone 'Europe/Athens', 'YYYY-MM-DD') as "day",
                   count(*) as "visits",
                   count(*) filter (where new_visitor) as "visitors"
            from campaign_visit_events
            where kind = 'VISIT' and occurred_at >= :since and occurred_at < :until and """ + ONE_OR_ALL + """

            group by 1
            """, nativeQuery = true)
    List<DayRow> daily(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until,
                       @Param("all") boolean all, @Param("source") String source,
                       @Param("medium") String medium, @Param("campaign") String campaign);

    @Query(value = """
            select device as "key", count(*) as "total"
            from campaign_visit_events
            where kind = 'VISIT' and occurred_at >= :since and occurred_at < :until and """ + ONE_OR_ALL + """

            group by 1
            order by 2 desc, 1
            """, nativeQuery = true)
    List<KeyCountRow> devices(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until,
                              @Param("all") boolean all, @Param("source") String source,
                              @Param("medium") String medium, @Param("campaign") String campaign);

    @Query(value = """
            select language as "key", count(*) as "total"
            from campaign_visit_events
            where kind = 'VISIT' and occurred_at >= :since and occurred_at < :until and """ + ONE_OR_ALL + """

            group by 1
            order by 2 desc, 1
            """, nativeQuery = true)
    List<KeyCountRow> languages(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until,
                                @Param("all") boolean all, @Param("source") String source,
                                @Param("medium") String medium, @Param("campaign") String campaign);

    /** The Athens day of the first visit, or null when there's none. */
    @Query(value = """
            select to_char(min(occurred_at at time zone 'Europe/Athens'), 'YYYY-MM-DD')
            from campaign_visit_events
            where kind = 'VISIT' and """ + ONE_OR_ALL, nativeQuery = true)
    String firstVisitDay(@Param("all") boolean all, @Param("source") String source,
                         @Param("medium") String medium, @Param("campaign") String campaign);

    interface DayRow {
        String getDay();
        long getVisits();
        long getVisitors();
    }

    interface KeyCountRow {
        String getKey();
        long getTotal();
    }
```

The blank line after each `ONE_OR_ALL + """` is on purpose: it keeps `group by` on its own line, as in `FunnelMetricsRepository`.

- [ ] **Step 4: Write the DTO**

```java
package event_social_media.dto.platform;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * {@code GET /api/admin/metrics/campaigns/overview}: every campaign row with a saved link or a visit
 * in the range, or one link's row, added up, plus visits per Athens day and by device and language.
 */
@Data
public class CampaignOverviewDto {
    private long visits;
    private long visitors;
    private long createClicks;
    private long plansClicks;
    private long planPicks;
    private long signedUp;
    private long paidHost;
    private Map<String, Long> revenueMinorByCurrency = new TreeMap<>();
    /** Every day in the range, with zeros where nothing happened; empty when there's no visit at all. */
    private List<Day> daily = new ArrayList<>();
    private List<Device> devices = new ArrayList<>();
    private List<Language> languages = new ArrayList<>();

    public record Day(String date, long visits, long visitors) {}

    public record Device(String device, long visits) {}

    public record Language(String language, long visits) {}
}
```

- [ ] **Step 5: Write the service**

```java
package event_social_media.service.platform;

import event_social_media.dto.platform.CampaignOverviewDto;
import event_social_media.dto.platform.CampaignRowDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.campaign.CampaignLink;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.repository.campaign.CampaignVisitEventRepository;
import event_social_media.service.campaign.CampaignVisitRules;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * Assembles {@code GET /api/admin/metrics/campaigns/overview}. The totals add up the same rows
 * {@link CampaignReportService} returns, so the overview and the table always agree.
 */
@Service
@RequiredArgsConstructor
public class CampaignOverviewService {

    private final CampaignReportService reportService;
    private final CampaignLinkRepository linkRepository;
    private final CampaignVisitEventRepository visitRepository;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    /** {@code linkId} null means every saved link and every campaign with visits. */
    @Transactional(readOnly = true)
    public CampaignOverviewDto overview(OffsetDateTime since, OffsetDateTime until, UUID linkId) {
        CampaignLink link = linkId == null ? null
                : linkRepository.findById(linkId).orElseThrow(() -> new ResourceNotFoundException("CampaignLink", linkId));
        Predicate<CampaignRowDto> included = link == null
                ? row -> row.getLink() != null || row.getVisits() > 0
                : row -> row.getLink() != null && row.getLink().id().equals(link.getId());

        CampaignOverviewDto dto = new CampaignOverviewDto();
        for (CampaignRowDto row : reportService.campaigns(since, until)) {
            if (!included.test(row)) continue;
            dto.setVisits(dto.getVisits() + row.getVisits());
            dto.setVisitors(dto.getVisitors() + row.getVisitors());
            dto.setCreateClicks(dto.getCreateClicks() + row.getCreateClicks());
            dto.setPlansClicks(dto.getPlansClicks() + row.getPlansClicks());
            dto.setPlanPicks(dto.getPlanPicks() + row.getPlanPicks());
            dto.setSignedUp(dto.getSignedUp() + row.getSignedUp());
            dto.setPaidHost(dto.getPaidHost() + row.getPaidHost());
            row.getRevenueMinorByCurrency().forEach((currency, minor) ->
                    dto.getRevenueMinorByCurrency().merge(currency, minor, Long::sum));
        }

        boolean all = link == null;
        String source = all ? "" : link.getUtmSource();
        String medium = all ? "" : link.getUtmMedium();
        String campaign = all ? "" : link.getUtmCampaign();
        OffsetDateTime from = since != null ? since : CampaignReportService.BEGINNING;
        OffsetDateTime to = until != null ? until : CampaignReportService.END;

        dto.setDaily(daily(since, until, visitRepository.daily(from, to, all, source, medium, campaign),
                () -> visitRepository.firstVisitDay(all, source, medium, campaign)));
        dto.setDevices(visitRepository.devices(from, to, all, source, medium, campaign).stream()
                .map(row -> new CampaignOverviewDto.Device(row.getKey(), row.getTotal())).toList());
        dto.setLanguages(visitRepository.languages(from, to, all, source, medium, campaign).stream()
                .map(row -> new CampaignOverviewDto.Language(row.getKey(), row.getTotal())).toList());
        return dto;
    }

    /** Every Athens day from the range's start (or the first visit) to its end (or today). */
    private List<CampaignOverviewDto.Day> daily(OffsetDateTime since, OffsetDateTime until,
                                                List<CampaignVisitEventRepository.DayRow> rows,
                                                Supplier<String> firstVisitDay) {
        LocalDate first;
        if (since != null) {
            first = since.atZoneSameInstant(CampaignVisitRules.ZONE).toLocalDate();
        } else {
            String day = firstVisitDay.get();
            if (day == null) return List.of();
            first = LocalDate.parse(day);
        }
        LocalDate last = until != null
                ? until.minusNanos(1).atZoneSameInstant(CampaignVisitRules.ZONE).toLocalDate()
                : LocalDate.now(clock.withZone(CampaignVisitRules.ZONE));

        Map<String, CampaignVisitEventRepository.DayRow> byDay = new HashMap<>();
        rows.forEach(row -> byDay.put(row.getDay(), row));
        return first.datesUntil(last.plusDays(1)).map(date -> {
            CampaignVisitEventRepository.DayRow row = byDay.get(date.toString());
            return new CampaignOverviewDto.Day(date.toString(), row == null ? 0 : row.getVisits(),
                    row == null ? 0 : row.getVisitors());
        }).toList();
    }
}
```

Check the "quiet link" case in Step 1: with `since = null` and no visit, `firstVisitDay` is null, so `daily` is empty. With `since` set and no visit, the range still gets its zero days, which is right for a chart over a chosen range.

- [ ] **Step 6: Add the endpoint**

In `PlatformMetricsAdminController`, inject `private final CampaignOverviewService campaignOverviewService;` next to `campaignReportService`. Then add this after the `/campaigns` method (import `CampaignOverviewDto` and `java.util.UUID`):

```java
    /**
     * Visits, visitors, clicks, sign-ups, paid hosts and revenue over {@code [since, until)} (both
     * optional) for every saved link and every campaign with visits, or for one saved link with
     * {@code link}; plus visits per Athens day and by device and language. 404 for an unknown link.
     */
    @GetMapping("/campaigns/overview")
    public CampaignOverviewDto campaignOverview(
            @RequestParam(required = false) OffsetDateTime since,
            @RequestParam(required = false) OffsetDateTime until,
            @RequestParam(required = false) UUID link) {
        if (since != null && until != null && until.isBefore(since)) {
            throw new BadRequestException(ErrorCode.DATE_RANGE_INVALID, "'until' must not be before 'since'");
        }
        return campaignOverviewService.overview(since, until, link);
    }
```

- [ ] **Step 7: Run the tests and check that they pass**

Run: `./gradlew test --tests "event_social_media.service.platform.CampaignOverviewPostgresTest" --tests "event_social_media.service.platform.CampaignReportPostgresTest"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/repository/campaign/CampaignVisitEventRepository.java src/main/java/event_social_media/dto/platform/CampaignOverviewDto.java src/main/java/event_social_media/service/platform/CampaignOverviewService.java src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java src/test/java/event_social_media/service/platform/CampaignOverviewPostgresTest.java
git commit -m "feat(campaign-visits): add the campaign overview endpoint"
```

---

### Task 8: Full check and PR

- [ ] **Step 1: Run the whole suite**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL. Pay attention to admin controller tests that build `PlatformMetricsAdminController`. If any of them construct it by hand, add the new `CampaignOverviewService` argument.

- [ ] **Step 2: Try it by hand against local Postgres**

Start the app (`./gradlew bootRun` with the local `.env` loaded the way this repo's README says). Make a saved link in the admin console, then run:

```bash
curl -i -X POST http://localhost:8080/api/public/campaign-visits -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0 (iPhone) Mobile" -d '{"kind":"VISIT","utmSource":"instagram","utmMedium":"social","utmCampaign":"<your link campaign>","language":"el"}'
```

Expected: `HTTP/1.1 204`, and one row in `campaign_visit_events`. Send it again right away: still 204, and still one row.

- [ ] **Step 3: Update the knowledge graph**

Run: `graphify update .`

- [ ] **Step 4: Push and open a PR into `staging`**

```bash
git push -u origin feat/campaign-visits
gh pr create --base staging --title "Count campaign visits and clicks without cookies" --body "<summary of the tables, endpoint, privacy rules and the two report changes; end with the Claude Code line>"
```
