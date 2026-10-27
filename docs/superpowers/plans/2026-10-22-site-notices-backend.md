# Site Notices — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store platform-wide site notices in Spring, let platform admins manage them, and serve the live ones on a public endpoint.

**Architecture:** One `site_notices` table, one JPA entity, one service that owns validation, version bumps, status and the "live" filter, one admin controller under `/api/admin/site-notices` and one public controller at `/api/public/site-notices`. The design follows the landing-categories feature (`LandingCategory*`), which is the closest existing admin CRUD.

**Tech Stack:** Spring Boot, JPA/Hibernate (JSON columns via `@JdbcTypeCode(SqlTypes.JSON)`), Flyway (Postgres), JUnit 5 + AssertJ + MockMvc. Tests run on H2 with `ddl-auto=create` and Flyway off. A Postgres migration test runs through `PostgresTestBase`.

**Spec:** `docs/superpowers/specs/2026-10-22-site-notices-design.md` in the storywall repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media`. Read its `CLAUDE.md` first.

---

## Deviations from the spec (repo conventions win)

- Localized text is stored as JSON maps `{ "en": …, "el": … }` (columns `message` and `link_label`), not as `message_en`/`message_el` columns. This is the convention `LandingCategory.name` uses.
- Paths carry the `/api` prefix like every other controller: `/api/admin/site-notices` and `GET /api/public/site-notices`.
- Updates are `PUT /api/admin/site-notices/{id}` with the full notice. The drawer always sends every field, and a full replace keeps the version-bump rule simple.

## File map

Create (all paths under `src/main/java/event_social_media/`):
- `model/sitenotice/SiteNotice.java`: the entity
- `model/sitenotice/SiteNoticeTone.java`: `INFO, OFFER, WARNING, CRITICAL`
- `model/sitenotice/SiteNoticeArea.java`: `EVERYWHERE, PUBLIC, HOST, GUEST, ADMIN`
- `model/sitenotice/SiteNoticeStatus.java`: `LIVE, SCHEDULED, ENDED, OFF`
- `repository/sitenotice/SiteNoticeRepository.java`
- `dto/sitenotice/SiteNoticeRequestDto.java`: create/update body
- `dto/sitenotice/SiteNoticeAdminDto.java`: admin list row
- `dto/sitenotice/SiteNoticeLiveDto.java`: public payload
- `service/sitenotice/SiteNoticeService.java`
- `controller/sitenotice/SiteNoticeAdminController.java`
- `controller/sitenotice/SiteNoticePublicController.java`
- `src/main/resources/db/migration/V177__site_notices.sql`

Modify:
- `model/audit/AdminAuditAction.java`: add `SITE_NOTICE_CREATED`, `SITE_NOTICE_UPDATED`, `SITE_NOTICE_DELETED`
- `exception/ErrorCode.java`: add `SITE_NOTICE_INVALID(3107)`
- `config/SecurityConfig.java`: permit `GET /api/public/site-notices`
- `config/WebMvcConfig.java`: exclude `/api/public/site-notices` from the guidelines-acceptance interceptor

Tests (under `src/test/java/event_social_media/`):
- `service/sitenotice/SiteNoticeServiceTest.java`
- `controller/sitenotice/SiteNoticeAdminControllerTest.java`
- `controller/sitenotice/SiteNoticeAdminControllerSecurityTest.java`
- `controller/sitenotice/SiteNoticePublicControllerTest.java`
- `migration/V177SiteNoticesMigrationTest.java`

Run a single test class with:
```bash
./gradlew test --tests 'event_social_media.service.sitenotice.SiteNoticeServiceTest'
```

---

### Task 0: Branch

- [ ] **Step 1: Branch from the latest staging**

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git switch -c feature/site-notices origin/staging
ls src/main/resources/db/migration | sort -V | tail -1
```
Expected: the last migration is `V176__vendors.sql`. If a higher number exists, use the next free one in place of `V177` everywhere in this plan.

---

### Task 1: Enums, error code, audit actions

**Files:**
- Create: `model/sitenotice/SiteNoticeTone.java`, `SiteNoticeArea.java`, `SiteNoticeStatus.java`
- Modify: `model/audit/AdminAuditAction.java`, `exception/ErrorCode.java`

- [ ] **Step 1: Create the enums**

```java
package event_social_media.model.sitenotice;

/** How a site notice looks and how it ranks: when several match a page, the highest tone shows. */
public enum SiteNoticeTone {
    INFO, OFFER, WARNING, CRITICAL
}
```

```java
package event_social_media.model.sitenotice;

/**
 * Where a site notice shows. EVERYWHERE stands alone; the others combine. HOST and GUEST describe the
 * viewer on an event page, not the URL (see spec 2026-10-22-site-notices-design §2).
 */
public enum SiteNoticeArea {
    EVERYWHERE, PUBLIC, HOST, GUEST, ADMIN
}
```

```java
package event_social_media.model.sitenotice;

/** A notice's state as the admin list shows it; derived, never stored. */
public enum SiteNoticeStatus {
    LIVE, SCHEDULED, ENDED, OFF
}
```

- [ ] **Step 2: Add the audit actions** at the end of `AdminAuditAction` (put a comma after `APP_REVIEW_UPDATED`):

```java
    APP_REVIEW_UPDATED,
    /** A site notice was created; no details. Target type SITE_NOTICE. */
    SITE_NOTICE_CREATED,
    /** A site notice was edited; details: fields (the names of the changed fields), version. Target type SITE_NOTICE. */
    SITE_NOTICE_UPDATED,
    /** A site notice was deleted; no details. Target type SITE_NOTICE. */
    SITE_NOTICE_DELETED
```

- [ ] **Step 3: Add the error code** right after `APP_REVIEW_FEATURE_NOT_ALLOWED(3106),` in `ErrorCode.java`:

```java

    /** 3107 — A site notice's link, areas or schedule is invalid (a label without a URL, EVERYWHERE mixed with other areas, an end before the start). {@code 400}. */
    SITE_NOTICE_INVALID(3107),
```

- [ ] **Step 4: Compile and run the error-code guard test**

```bash
./gradlew compileJava && ./gradlew test --tests 'event_social_media.exception.ErrorCodeTest'
```
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add -A src/main/java/event_social_media/model/sitenotice src/main/java/event_social_media/model/audit/AdminAuditAction.java src/main/java/event_social_media/exception/ErrorCode.java
git commit -m "Add site notice enums, audit actions and error code"
```

---

### Task 2: Migration, entity, repository

**Files:**
- Create: `src/main/resources/db/migration/V177__site_notices.sql`, `model/sitenotice/SiteNotice.java`, `repository/sitenotice/SiteNoticeRepository.java`
- Test: `src/test/java/event_social_media/migration/V177SiteNoticesMigrationTest.java`

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================
-- SITE NOTICES (spec 2026-10-22-site-notices-design, storywall repo)
--
-- Platform-wide notices shown in a bar at the top of the page: outages, offers, anything admins
-- need to tell people. A notice is live when active, started (or no start) and not ended (or no
-- end). version goes up when the text or link changes, so a visitor who closed the old text sees
-- the new one.
-- =====================================================

CREATE TABLE site_notices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tone        VARCHAR(16) NOT NULL,
    message     JSONB       NOT NULL,
    link_url    VARCHAR(500) NULL,
    link_label  JSONB       NOT NULL DEFAULT '{}'::jsonb,
    areas       JSONB       NOT NULL,
    dismissible BOOLEAN     NOT NULL DEFAULT TRUE,
    starts_at   TIMESTAMPTZ NULL,
    ends_at     TIMESTAMPTZ NULL,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    version     INT         NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT site_notices_tone_check CHECK (tone IN ('INFO', 'OFFER', 'WARNING', 'CRITICAL')),
    CONSTRAINT site_notices_schedule_check CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT site_notices_version_check CHECK (version >= 1)
);

-- The public endpoint reads active rows only; the table stays tiny, so this is the one index.
CREATE INDEX site_notices_active_idx ON site_notices (active) WHERE active;
```

- [ ] **Step 2: Write the entity**

```java
package event_social_media.model.sitenotice;

import event_social_media.model.base.MutableAuditable;
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
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A platform-wide notice shown in a bar at the top of the page. See spec
 * 2026-10-22-site-notices-design (storywall repo). {@link SiteNoticeService} enforces every rule;
 * H2 has none of the migration's CHECKs.
 */
@Getter
@Setter
@Entity
@Table(name = "site_notices")
public class SiteNotice extends MutableAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tone", nullable = false, length = 16)
    private SiteNoticeTone tone;

    /** Exactly {@code en} and {@code el}. */
    @NotNull
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "message", nullable = false)
    private Map<String, String> message = new LinkedHashMap<>();

    /** An {@code https://} URL or a path starting with {@code /}; null for no link. */
    @Column(name = "link_url", length = 500)
    private String linkUrl;

    /** Exactly {@code en} and {@code el} when there is a link; empty otherwise. */
    @NotNull
    @ColumnDefault("'{}'")
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "link_label", nullable = false)
    private Map<String, String> linkLabel = new LinkedHashMap<>();

    /** [EVERYWHERE] alone, or one or more of the other areas. */
    @NotNull
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "areas", nullable = false)
    private List<SiteNoticeArea> areas = new ArrayList<>();

    @NotNull
    @ColumnDefault("true")
    @Column(name = "dismissible", nullable = false)
    private Boolean dismissible = true;

    @Column(name = "starts_at")
    private OffsetDateTime startsAt;

    @Column(name = "ends_at")
    private OffsetDateTime endsAt;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    /** Goes up when the message or link changes; see {@link SiteNoticeService}. */
    @NotNull
    @ColumnDefault("1")
    @Column(name = "version", nullable = false)
    private Integer version = 1;
}
```

- [ ] **Step 3: Write the repository**

```java
package event_social_media.repository.sitenotice;

import event_social_media.model.sitenotice.SiteNotice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SiteNoticeRepository extends JpaRepository<SiteNotice, UUID> {

    List<SiteNotice> findAllByOrderByCreatedAtDesc();

    /** Active rows only; the schedule is checked in Java against one clock reading. */
    List<SiteNotice> findByActiveTrue();
}
```

- [ ] **Step 4: Write the migration test.** Copy the setup of `V174AppReviewsMigrationTest` (same annotations, `PostgresTestBase`, scratch schema, `Flyway.configure()...` block). Open that file and mirror its Flyway configuration lines exactly. Assertions:

```java
    @Test
    void createsTheTableAndRejectsAnEndBeforeTheStart() {
        // (run Flyway against SCHEMA exactly as V174AppReviewsMigrationTest does)
        jdbc.execute("set search_path to " + SCHEMA);
        jdbc.update("""
                insert into site_notices (tone, message, areas)
                values ('INFO', '{"en":"a","el":"b"}'::jsonb, '["EVERYWHERE"]'::jsonb)""");
        assertThat(jdbc.queryForObject("select version from site_notices", Integer.class)).isEqualTo(1);

        assertThatThrownBy(() -> jdbc.update("""
                insert into site_notices (tone, message, areas, starts_at, ends_at)
                values ('INFO', '{"en":"a","el":"b"}'::jsonb, '["EVERYWHERE"]'::jsonb,
                        now(), now() - interval '1 hour')"""))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbc.update("""
                insert into site_notices (tone, message, areas)
                values ('LOUD', '{"en":"a","el":"b"}'::jsonb, '["EVERYWHERE"]'::jsonb)"""))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
```
The class is `V177SiteNoticesMigrationTest` with `SCHEMA = "v177_site_notices"`. Imports added on top of V174's: `org.springframework.dao.DataIntegrityViolationException`, `static org.assertj.core.api.Assertions.assertThatThrownBy`.

- [ ] **Step 5: Run it**

```bash
./gradlew test --tests 'event_social_media.migration.V177SiteNoticesMigrationTest'
```
Expected: PASS. It needs Docker for `PostgresTestBase`; if Docker isn't running, start it, or note it as unverified and move on.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V177__site_notices.sql src/main/java/event_social_media/model/sitenotice/SiteNotice.java src/main/java/event_social_media/repository/sitenotice src/test/java/event_social_media/migration/V177SiteNoticesMigrationTest.java
git commit -m "Add site_notices table, entity and repository"
```

---

### Task 3: DTOs

**Files:**
- Create: `dto/sitenotice/SiteNoticeRequestDto.java`, `SiteNoticeAdminDto.java`, `SiteNoticeLiveDto.java`

- [ ] **Step 1: Write them**

```java
package event_social_media.dto.sitenotice;

import event_social_media.model.sitenotice.SiteNoticeArea;
import event_social_media.model.sitenotice.SiteNoticeTone;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** Create and full-replace body for a site notice. The service checks everything beyond presence. */
@Data
public class SiteNoticeRequestDto {
    @NotNull private SiteNoticeTone tone;
    @NotNull private Map<String, String> message;
    @Size(max = 500) private String linkUrl;
    private Map<String, String> linkLabel;
    @NotNull @Size(min = 1, max = 5) private List<SiteNoticeArea> areas;
    @NotNull private Boolean dismissible;
    private OffsetDateTime startsAt;
    private OffsetDateTime endsAt;
    @NotNull private Boolean active;
}
```

```java
package event_social_media.dto.sitenotice;

import event_social_media.model.sitenotice.SiteNoticeArea;
import event_social_media.model.sitenotice.SiteNoticeStatus;
import event_social_media.model.sitenotice.SiteNoticeTone;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A site notice as the admin console sees it; status is derived at read time. */
public record SiteNoticeAdminDto(UUID id, SiteNoticeTone tone, Map<String, String> message, String linkUrl,
                                 Map<String, String> linkLabel, List<SiteNoticeArea> areas, boolean dismissible,
                                 OffsetDateTime startsAt, OffsetDateTime endsAt, boolean active, int version,
                                 SiteNoticeStatus status, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}
```

```java
package event_social_media.dto.sitenotice;

import event_social_media.model.sitenotice.SiteNoticeArea;
import event_social_media.model.sitenotice.SiteNoticeTone;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** What the public bar needs: no admin fields. Both locales are sent; the client picks one. */
public record SiteNoticeLiveDto(UUID id, int version, SiteNoticeTone tone, Map<String, String> message,
                                String linkUrl, Map<String, String> linkLabel, List<SiteNoticeArea> areas,
                                boolean dismissible, OffsetDateTime startsAt, OffsetDateTime createdAt) {}
```

- [ ] **Step 2: Compile**

```bash
./gradlew compileJava
```
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/event_social_media/dto/sitenotice
git commit -m "Add site notice DTOs"
```

---

### Task 4: Service (TDD)

**Files:**
- Create: `service/sitenotice/SiteNoticeService.java`
- Test: `src/test/java/event_social_media/service/sitenotice/SiteNoticeServiceTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.service.sitenotice;

import event_social_media.dto.sitenotice.SiteNoticeAdminDto;
import event_social_media.dto.sitenotice.SiteNoticeLiveDto;
import event_social_media.dto.sitenotice.SiteNoticeRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.sitenotice.SiteNoticeArea;
import event_social_media.model.sitenotice.SiteNoticeStatus;
import event_social_media.model.sitenotice.SiteNoticeTone;
import event_social_media.repository.audit.AdminAuditLogRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class SiteNoticeServiceTest {

    @Autowired private SiteNoticeService service;
    @Autowired private AdminAuditLogRepository auditRepository;
    @Autowired private TestFixtures fixtures;

    private AdminActor actor;

    @BeforeEach
    void setUp() {
        actor = new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7");
    }

    private static OffsetDateTime hoursFromNow(int hours) {
        return OffsetDateTime.now(ZoneOffset.UTC).plusHours(hours);
    }

    private static SiteNoticeRequestDto request() {
        SiteNoticeRequestDto dto = new SiteNoticeRequestDto();
        dto.setTone(SiteNoticeTone.WARNING);
        dto.setMessage(Map.of("en", "Railway outage", "el", "Διακοπή Railway"));
        dto.setAreas(List.of(SiteNoticeArea.EVERYWHERE));
        dto.setDismissible(true);
        dto.setActive(true);
        return dto;
    }

    @Test
    void createsWithVersionOneLiveStatusAndAudits() {
        SiteNoticeAdminDto created = service.create(request(), actor);

        assertThat(created.version()).isEqualTo(1);
        assertThat(created.status()).isEqualTo(SiteNoticeStatus.LIVE);
        assertThat(created.linkLabel()).isEmpty();
        assertThat(auditRepository.findAll()).anySatisfy(row -> {
            assertThat(row.getAction()).isEqualTo(AdminAuditAction.SITE_NOTICE_CREATED);
            assertThat(row.getTargetId()).isEqualTo(created.id());
        });
    }

    @Test
    void messageNeedsExactlyEnAndElWithinTwoHundredCharacters() {
        SiteNoticeRequestDto onlyEn = request();
        onlyEn.setMessage(Map.of("en", "x"));
        assertThatThrownBy(() -> service.create(onlyEn, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto tooLong = request();
        tooLong.setMessage(Map.of("en", "x".repeat(201), "el", "y"));
        assertThatThrownBy(() -> service.create(tooLong, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto blank = request();
        blank.setMessage(Map.of("en", "  ", "el", "y"));
        assertThatThrownBy(() -> service.create(blank, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto control = request();
        control.setMessage(Map.of("en", "a\u202Eb", "el", "y"));
        assertThatThrownBy(() -> service.create(control, actor)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void aLinkNeedsBothLabelsAndAnHttpsUrlOrAPath() {
        SiteNoticeRequestDto noLabels = request();
        noLabels.setLinkUrl("https://status.railway.com");
        assertThatThrownBy(() -> service.create(noLabels, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto http = request();
        http.setLinkUrl("http://status.railway.com");
        http.setLinkLabel(Map.of("en", "View details", "el", "Λεπτομέρειες"));
        assertThatThrownBy(() -> service.create(http, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto protocolRelative = request();
        protocolRelative.setLinkUrl("//evil.example");
        protocolRelative.setLinkLabel(Map.of("en", "View details", "el", "Λεπτομέρειες"));
        assertThatThrownBy(() -> service.create(protocolRelative, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto labelsWithoutUrl = request();
        labelsWithoutUrl.setLinkLabel(Map.of("en", "View details", "el", "Λεπτομέρειες"));
        assertThatThrownBy(() -> service.create(labelsWithoutUrl, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto path = request();
        path.setLinkUrl("/pricing");
        path.setLinkLabel(Map.of("en", "See plans", "el", "Δείτε τα πακέτα"));
        assertThat(service.create(path, actor).linkUrl()).isEqualTo("/pricing");
    }

    @Test
    void everywhereStandsAloneAndAreasDontRepeat() {
        SiteNoticeRequestDto mixed = request();
        mixed.setAreas(List.of(SiteNoticeArea.EVERYWHERE, SiteNoticeArea.HOST));
        assertThatThrownBy(() -> service.create(mixed, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto repeated = request();
        repeated.setAreas(List.of(SiteNoticeArea.HOST, SiteNoticeArea.HOST));
        assertThatThrownBy(() -> service.create(repeated, actor)).isInstanceOf(BadRequestException.class);

        SiteNoticeRequestDto offer = request();
        offer.setAreas(List.of(SiteNoticeArea.PUBLIC, SiteNoticeArea.HOST));
        assertThat(service.create(offer, actor).areas()).containsExactly(SiteNoticeArea.PUBLIC, SiteNoticeArea.HOST);
    }

    @Test
    void theEndMustBeAfterTheStart() {
        SiteNoticeRequestDto dto = request();
        dto.setStartsAt(hoursFromNow(2));
        dto.setEndsAt(hoursFromNow(1));
        assertThatThrownBy(() -> service.create(dto, actor)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void statusFollowsActiveAndTheSchedule() {
        SiteNoticeRequestDto off = request();
        off.setActive(false);
        assertThat(service.create(off, actor).status()).isEqualTo(SiteNoticeStatus.OFF);

        SiteNoticeRequestDto scheduled = request();
        scheduled.setStartsAt(hoursFromNow(1));
        assertThat(service.create(scheduled, actor).status()).isEqualTo(SiteNoticeStatus.SCHEDULED);

        SiteNoticeRequestDto ended = request();
        ended.setStartsAt(hoursFromNow(-2));
        ended.setEndsAt(hoursFromNow(-1));
        assertThat(service.create(ended, actor).status()).isEqualTo(SiteNoticeStatus.ENDED);
    }

    @Test
    void liveListsOnlyActiveStartedUnendedNotices() {
        UUID open = service.create(request(), actor).id();
        SiteNoticeRequestDto window = request();
        window.setStartsAt(hoursFromNow(-1));
        window.setEndsAt(hoursFromNow(1));
        UUID inWindow = service.create(window, actor).id();
        SiteNoticeRequestDto off = request();
        off.setActive(false);
        service.create(off, actor);
        SiteNoticeRequestDto future = request();
        future.setStartsAt(hoursFromNow(1));
        service.create(future, actor);
        SiteNoticeRequestDto past = request();
        past.setEndsAt(hoursFromNow(-1));
        service.create(past, actor);

        assertThat(service.findLive()).extracting(SiteNoticeLiveDto::id).containsExactlyInAnyOrder(open, inWindow);
    }

    @Test
    void editingTheTextOrLinkBumpsTheVersionButOtherFieldsDont() {
        SiteNoticeAdminDto created = service.create(request(), actor);

        SiteNoticeRequestDto toneOnly = request();
        toneOnly.setTone(SiteNoticeTone.CRITICAL);
        toneOnly.setAreas(List.of(SiteNoticeArea.HOST));
        toneOnly.setActive(false);
        assertThat(service.update(created.id(), toneOnly, actor).version()).isEqualTo(1);

        SiteNoticeRequestDto newText = request();
        newText.setMessage(Map.of("en", "Fixed soon", "el", "Σύντομα"));
        assertThat(service.update(created.id(), newText, actor).version()).isEqualTo(2);

        SiteNoticeRequestDto newLink = request();
        newLink.setMessage(Map.of("en", "Fixed soon", "el", "Σύντομα"));
        newLink.setLinkUrl("/status");
        newLink.setLinkLabel(Map.of("en", "Status", "el", "Κατάσταση"));
        assertThat(service.update(created.id(), newLink, actor).version()).isEqualTo(3);

        assertThat(auditRepository.findAll()).anySatisfy(row ->
                assertThat(row.getAction()).isEqualTo(AdminAuditAction.SITE_NOTICE_UPDATED));
    }

    @Test
    void deletesAndAuditsAndUnknownIdsAreNotFound() {
        UUID id = service.create(request(), actor).id();
        service.delete(id, actor);

        assertThat(service.findAll()).noneMatch(notice -> notice.id().equals(id));
        assertThat(auditRepository.findAll()).anySatisfy(row ->
                assertThat(row.getAction()).isEqualTo(AdminAuditAction.SITE_NOTICE_DELETED));
        assertThatThrownBy(() -> service.delete(id, actor)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.update(id, request(), actor)).isInstanceOf(ResourceNotFoundException.class);
    }
}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
./gradlew test --tests 'event_social_media.service.sitenotice.SiteNoticeServiceTest'
```
Expected: compilation FAILS (`SiteNoticeService` doesn't exist).

- [ ] **Step 3: Write the service**

```java
package event_social_media.service.sitenotice;

import event_social_media.dto.sitenotice.SiteNoticeAdminDto;
import event_social_media.dto.sitenotice.SiteNoticeLiveDto;
import event_social_media.dto.sitenotice.SiteNoticeRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.sitenotice.SiteNotice;
import event_social_media.model.sitenotice.SiteNoticeArea;
import event_social_media.model.sitenotice.SiteNoticeStatus;
import event_social_media.repository.sitenotice.SiteNoticeRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.audit.AdminAuditService;
import event_social_media.service.moderation.TextNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Platform-wide site notices (spec 2026-10-22-site-notices-design, storywall repo). Holds every
 * rule the Postgres schema can't (H2 has no CHECKs) and every one it can't express: locales, link
 * shape, EVERYWHERE standing alone, and the version bump on text or link changes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SiteNoticeService {

    static final int MESSAGE_MAX = 200;
    static final int LINK_LABEL_MAX = 40;
    private static final List<String> LOCALES = List.of("en", "el");
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}\\p{Cf}]");
    private static final String TARGET_TYPE = "SITE_NOTICE";

    private final SiteNoticeRepository repository;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<SiteNoticeAdminDto> findAll() {
        OffsetDateTime now = now();
        return repository.findAllByOrderByCreatedAtDesc().stream().map(n -> toAdminDto(n, now)).toList();
    }

    /** For GET /api/public/site-notices: active, started (or no start), not ended (or no end). Unsorted. */
    @Transactional(readOnly = true)
    public List<SiteNoticeLiveDto> findLive() {
        OffsetDateTime now = now();
        return repository.findByActiveTrue().stream()
                .filter(n -> statusOf(n, now) == SiteNoticeStatus.LIVE)
                .map(SiteNoticeService::toLiveDto)
                .toList();
    }

    @Transactional
    public SiteNoticeAdminDto create(SiteNoticeRequestDto dto, AdminActor actor) {
        SiteNotice notice = new SiteNotice();
        apply(notice, dto, actor);
        SiteNotice saved = repository.save(notice);
        adminAuditService.record(actor, AdminAuditAction.SITE_NOTICE_CREATED, TARGET_TYPE, saved.getId(), null, Map.of());
        log.info("Site notice {} created: tone={} areas={} (actorId={})", saved.getId(), saved.getTone(), saved.getAreas(), actor.userId());
        return toAdminDto(saved, now());
    }

    @Transactional
    public SiteNoticeAdminDto update(UUID id, SiteNoticeRequestDto dto, AdminActor actor) {
        SiteNotice notice = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("SiteNotice", id));
        Map<String, String> oldMessage = Map.copyOf(notice.getMessage());
        String oldLinkUrl = notice.getLinkUrl();
        Map<String, String> oldLinkLabel = Map.copyOf(notice.getLinkLabel());
        List<String> fields = changedFields(notice, dto);
        apply(notice, dto, actor);
        boolean contentChanged = !oldMessage.equals(notice.getMessage())
                || !Objects.equals(oldLinkUrl, notice.getLinkUrl())
                || !oldLinkLabel.equals(notice.getLinkLabel());
        if (contentChanged) notice.setVersion(notice.getVersion() + 1);
        SiteNotice saved = repository.save(notice);
        adminAuditService.record(actor, AdminAuditAction.SITE_NOTICE_UPDATED, TARGET_TYPE, id, null,
                Map.of("fields", fields, "version", saved.getVersion()));
        log.info("Site notice {} updated: fields={} version={} (actorId={})", id, fields, saved.getVersion(), actor.userId());
        return toAdminDto(saved, now());
    }

    @Transactional
    public void delete(UUID id, AdminActor actor) {
        SiteNotice notice = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("SiteNotice", id));
        repository.delete(notice);
        adminAuditService.record(actor, AdminAuditAction.SITE_NOTICE_DELETED, TARGET_TYPE, id, null, Map.of());
        log.info("Site notice {} deleted (actorId={})", id, actor.userId());
    }

    // ---------------------------------------------------------------------------------------------

    private void apply(SiteNotice notice, SiteNoticeRequestDto dto, AdminActor actor) {
        notice.setTone(dto.getTone());
        notice.setMessage(localized(dto.getMessage(), MESSAGE_MAX, "message", actor));
        String linkUrl = linkUrl(dto.getLinkUrl(), actor);
        boolean hasLabels = dto.getLinkLabel() != null && !dto.getLinkLabel().isEmpty();
        if (linkUrl == null && hasLabels) {
            throw rejected(ErrorCode.SITE_NOTICE_INVALID, actor, "label_without_url", "linkLabel needs a linkUrl");
        }
        notice.setLinkUrl(linkUrl);
        notice.setLinkLabel(linkUrl == null ? new LinkedHashMap<>() : localized(dto.getLinkLabel(), LINK_LABEL_MAX, "linkLabel", actor));
        notice.setAreas(areas(dto.getAreas(), actor));
        notice.setDismissible(dto.getDismissible());
        if (dto.getStartsAt() != null && dto.getEndsAt() != null && !dto.getEndsAt().isAfter(dto.getStartsAt())) {
            throw rejected(ErrorCode.SITE_NOTICE_INVALID, actor, "ends_before_start", "endsAt must be after startsAt");
        }
        notice.setStartsAt(dto.getStartsAt());
        notice.setEndsAt(dto.getEndsAt());
        notice.setActive(dto.getActive());
    }

    /** Exactly en and el, each 1..max characters after normalizing, no control characters. */
    private Map<String, String> localized(Map<String, String> text, int max, String field, AdminActor actor) {
        if (text == null || !text.keySet().equals(Set.copyOf(LOCALES))) {
            throw rejected(ErrorCode.LOCALIZED_TEXT_INVALID, actor, field + "_locales", field + " must contain exactly the locales " + LOCALES);
        }
        Map<String, String> normalized = new LinkedHashMap<>();
        for (String locale : LOCALES) {
            String raw = text.get(locale);
            if (raw != null && CONTROL.matcher(raw).find()) {
                throw rejected(ErrorCode.LOCALIZED_TEXT_INVALID, actor, field + "_" + locale + "_control",
                        field + "." + locale + " must not contain control characters");
            }
            String cleaned = raw == null ? "" : Objects.requireNonNullElse(TextNormalizer.forStorage(raw), "");
            if (cleaned.isEmpty() || cleaned.length() > max) {
                throw rejected(ErrorCode.LOCALIZED_TEXT_INVALID, actor, field + "_" + locale + "_length",
                        field + "." + locale + " must be 1 to " + max + " characters");
            }
            normalized.put(locale, cleaned);
        }
        return normalized;
    }

    /** Null or blank means no link. Otherwise an absolute https URL with a host, or a site path ("/x", never "//x"). */
    private String linkUrl(String raw, AdminActor actor) {
        if (raw == null || raw.isBlank()) return null;
        String url = raw.trim();
        if (url.startsWith("/") && !url.startsWith("//") && !CONTROL.matcher(url).find() && !url.contains("\\")) return url;
        try {
            URI uri = new URI(url);
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null) return url;
        } catch (URISyntaxException ignored) {
            // falls through to the rejection
        }
        throw rejected(ErrorCode.SITE_NOTICE_INVALID, actor, "link_url", "linkUrl must be an https:// URL or a path starting with /");
    }

    private List<SiteNoticeArea> areas(List<SiteNoticeArea> areas, AdminActor actor) {
        if (areas == null || areas.isEmpty() || areas.contains(null)) {
            throw rejected(ErrorCode.SITE_NOTICE_INVALID, actor, "areas_empty", "areas must not be empty");
        }
        if (new HashSet<>(areas).size() != areas.size()) {
            throw rejected(ErrorCode.SITE_NOTICE_INVALID, actor, "areas_repeated", "areas must not repeat");
        }
        if (areas.contains(SiteNoticeArea.EVERYWHERE) && areas.size() > 1) {
            throw rejected(ErrorCode.SITE_NOTICE_INVALID, actor, "areas_everywhere_mixed", "EVERYWHERE can't be combined with other areas");
        }
        return new ArrayList<>(areas);
    }

    private static List<String> changedFields(SiteNotice notice, SiteNoticeRequestDto dto) {
        List<String> fields = new ArrayList<>();
        if (notice.getTone() != dto.getTone()) fields.add("tone");
        if (!notice.getMessage().equals(dto.getMessage())) fields.add("message");
        if (!Objects.equals(notice.getLinkUrl(), dto.getLinkUrl())) fields.add("linkUrl");
        if (!notice.getLinkLabel().equals(Objects.requireNonNullElse(dto.getLinkLabel(), Map.of()))) fields.add("linkLabel");
        if (!notice.getAreas().equals(dto.getAreas())) fields.add("areas");
        if (!notice.getDismissible().equals(dto.getDismissible())) fields.add("dismissible");
        if (!Objects.equals(notice.getStartsAt(), dto.getStartsAt())) fields.add("startsAt");
        if (!Objects.equals(notice.getEndsAt(), dto.getEndsAt())) fields.add("endsAt");
        if (!notice.getActive().equals(dto.getActive())) fields.add("active");
        return fields;
    }

    static SiteNoticeStatus statusOf(SiteNotice notice, OffsetDateTime now) {
        if (!notice.getActive()) return SiteNoticeStatus.OFF;
        if (notice.getEndsAt() != null && !notice.getEndsAt().isAfter(now)) return SiteNoticeStatus.ENDED;
        if (notice.getStartsAt() != null && notice.getStartsAt().isAfter(now)) return SiteNoticeStatus.SCHEDULED;
        return SiteNoticeStatus.LIVE;
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    /** An unmodifiable copy that keeps the locale order ({@code Map.copyOf} doesn't). */
    private static Map<String, String> ordered(Map<String, String> map) {
        return Collections.unmodifiableMap(new LinkedHashMap<>(map));
    }

    private static SiteNoticeAdminDto toAdminDto(SiteNotice n, OffsetDateTime now) {
        return new SiteNoticeAdminDto(n.getId(), n.getTone(), ordered(n.getMessage()), n.getLinkUrl(), ordered(n.getLinkLabel()),
                List.copyOf(n.getAreas()), n.getDismissible(), n.getStartsAt(), n.getEndsAt(), n.getActive(), n.getVersion(),
                statusOf(n, now), n.getCreatedAt(), n.getUpdatedAt());
    }

    private static SiteNoticeLiveDto toLiveDto(SiteNotice n) {
        return new SiteNoticeLiveDto(n.getId(), n.getVersion(), n.getTone(), ordered(n.getMessage()), n.getLinkUrl(),
                ordered(n.getLinkLabel()), List.copyOf(n.getAreas()), n.getDismissible(), n.getStartsAt(), n.getCreatedAt());
    }

    private static BadRequestException rejected(ErrorCode errorCode, AdminActor actor, String reason, String message) {
        log.warn("Site notice write rejected: reason={} actorId={}", reason, actor.userId());
        return new BadRequestException(errorCode, message);
    }
}
```

- [ ] **Step 4: Run the tests**

```bash
./gradlew test --tests 'event_social_media.service.sitenotice.SiteNoticeServiceTest'
```
Expected: all PASS. If `createdAt` is null in the returned DTO on H2 (auditing fills it on flush), use `repository.saveAndFlush(notice)` in `create` and `update` instead of `save`.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/sitenotice src/test/java/event_social_media/service/sitenotice
git commit -m "Add site notice service with validation, status and version rules"
```

---

### Task 5: Admin controller (TDD)

**Files:**
- Create: `controller/sitenotice/SiteNoticeAdminController.java`
- Test: `controller/sitenotice/SiteNoticeAdminControllerTest.java`, `controller/sitenotice/SiteNoticeAdminControllerSecurityTest.java`

- [ ] **Step 1: Write the failing security test**

```java
package event_social_media.controller.sitenotice;

import event_social_media.model.user.User;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SiteNoticeAdminControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;

    static Stream<MockHttpServletRequestBuilder> adminRoutes() {
        UUID id = UUID.randomUUID();
        String body = "{\"tone\":\"INFO\",\"message\":{\"en\":\"a\",\"el\":\"b\"},\"areas\":[\"EVERYWHERE\"],\"dismissible\":true,\"active\":true}";
        return Stream.of(
                get("/api/admin/site-notices"),
                post("/api/admin/site-notices").contentType(MediaType.APPLICATION_JSON).content(body),
                put("/api/admin/site-notices/{id}", id).contentType(MediaType.APPLICATION_JSON).content(body),
                delete("/api/admin/site-notices/{id}", id));
    }

    private static UsernamePasswordAuthenticationToken token(User u, String role) {
        return new UsernamePasswordAuthenticationToken(u.getId().toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }

    @ParameterizedTest
    @MethodSource("adminRoutes")
    void anonymousCallersAreRefused(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @MethodSource("adminRoutes")
    void ordinaryUsersAreForbidden(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request.with(authentication(token(fixtures.newUser(), "ROLE_USER"))))
                .andExpect(status().isForbidden());
    }
}
```

- [ ] **Step 2: Write the failing behaviour test**

```java
package event_social_media.controller.sitenotice;

import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SiteNoticeAdminControllerTest {

    private static final String BODY = """
            {"tone":"WARNING","message":{"en":"Railway outage","el":"Διακοπή"},
             "linkUrl":"https://status.railway.com","linkLabel":{"en":"View details","el":"Λεπτομέρειες"},
             "areas":["EVERYWHERE"],"dismissible":false,"active":true}""";

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private ObjectMapper objectMapper;

    private UsernamePasswordAuthenticationToken admin;

    @BeforeEach
    void setUp() {
        admin = new UsernamePasswordAuthenticationToken(fixtures.newAdmin().getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    @Test
    void createListUpdateAndDelete() throws Exception {
        String created = mockMvc.perform(post("/api/admin/site-notices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("LIVE"))
                .andExpect(jsonPath("$.version").value(1))
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();

        mockMvc.perform(get("/api/admin/site-notices").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].linkLabel.el").value("Λεπτομέρειες"));

        mockMvc.perform(put("/api/admin/site-notices/{id}", id).with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("Railway outage", "Fixed soon")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        mockMvc.perform(delete("/api/admin/site-notices/{id}", id).with(authentication(admin)))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/admin/site-notices/{id}", id).with(authentication(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void refusesAnUnknownToneAndMissingFields() throws Exception {
        mockMvc.perform(post("/api/admin/site-notices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("WARNING", "LOUD")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/site-notices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"tone\":\"INFO\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refusesEverywhereMixedWithAnotherArea() throws Exception {
        mockMvc.perform(post("/api/admin/site-notices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("[\"EVERYWHERE\"]", "[\"EVERYWHERE\",\"HOST\"]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").exists());
    }
}
```
Before running, open `LandingCategoryAdminControllerTest` and check what the error body field is called (`errorCode`, `code`, …). Adjust the last `jsonPath` to match.

- [ ] **Step 3: Run both to confirm they fail**

```bash
./gradlew test --tests 'event_social_media.controller.sitenotice.*'
```
Expected: FAIL (404s: no controller yet).

- [ ] **Step 4: Write the controller**

```java
package event_social_media.controller.sitenotice;

import event_social_media.dto.sitenotice.SiteNoticeAdminDto;
import event_social_media.dto.sitenotice.SiteNoticeRequestDto;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.sitenotice.SiteNoticeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Administers the platform-wide notice bar. See spec 2026-10-22-site-notices-design (storywall repo). */
@RestController
@RequestMapping("/api/admin/site-notices")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SiteNoticeAdminController {

    private final SiteNoticeService siteNoticeService;
    private final ClientAddressResolver clientAddressResolver;

    @GetMapping
    public List<SiteNoticeAdminDto> findAll() {
        return siteNoticeService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SiteNoticeAdminDto create(@Valid @RequestBody SiteNoticeRequestDto dto,
                                     Authentication authentication, HttpServletRequest request) {
        return siteNoticeService.create(dto, actor(authentication, request));
    }

    @PutMapping("/{id}")
    public SiteNoticeAdminDto update(@PathVariable UUID id, @Valid @RequestBody SiteNoticeRequestDto dto,
                                     Authentication authentication, HttpServletRequest request) {
        return siteNoticeService.update(id, dto, actor(authentication, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication, HttpServletRequest request) {
        siteNoticeService.delete(id, actor(authentication, request));
    }

    private AdminActor actor(Authentication authentication, HttpServletRequest request) {
        return new AdminActor(UUID.fromString((String) authentication.getPrincipal()), clientAddressResolver.resolve(request));
    }
}
```

- [ ] **Step 5: Run the tests**

```bash
./gradlew test --tests 'event_social_media.controller.sitenotice.*'
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/controller/sitenotice/SiteNoticeAdminController.java src/test/java/event_social_media/controller/sitenotice
git commit -m "Add site notice admin endpoints"
```

---

### Task 6: Public endpoint (TDD)

**Files:**
- Create: `controller/sitenotice/SiteNoticePublicController.java`
- Modify: `config/SecurityConfig.java`, `config/WebMvcConfig.java`
- Test: `controller/sitenotice/SiteNoticePublicControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.sitenotice;

import event_social_media.dto.sitenotice.SiteNoticeRequestDto;
import event_social_media.model.sitenotice.SiteNoticeArea;
import event_social_media.model.sitenotice.SiteNoticeTone;
import event_social_media.model.user.User;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.sitenotice.SiteNoticeService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SiteNoticePublicControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private SiteNoticeService service;

    private void createNotice(boolean active) {
        SiteNoticeRequestDto dto = new SiteNoticeRequestDto();
        dto.setTone(SiteNoticeTone.OFFER);
        dto.setMessage(Map.of("en", "20% off", "el", "20% έκπτωση"));
        dto.setAreas(List.of(SiteNoticeArea.PUBLIC, SiteNoticeArea.HOST));
        dto.setDismissible(true);
        dto.setActive(active);
        service.create(dto, new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7"));
    }

    @Test
    void anyoneCanReadTheLiveNoticesWithoutAdminFields() throws Exception {
        createNotice(true);
        createNotice(false);

        mockMvc.perform(get("/api/public/site-notices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].message.el").value("20% έκπτωση"))
                .andExpect(jsonPath("$[0].areas[1]").value("HOST"))
                .andExpect(jsonPath("$[0].active").doesNotExist())
                .andExpect(jsonPath("$[0].status").doesNotExist());
    }

    @Test
    void aSignedInUserWhoHasNotAcceptedTheGuidelinesCanStillReadThem() throws Exception {
        User user = fixtures.newUser();
        var token = new UsernamePasswordAuthenticationToken(user.getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        mockMvc.perform(get("/api/public/site-notices").with(authentication(token)))
                .andExpect(status().isOk());
    }
}
```
If `TestFixtures.newUser()` creates a user who has already accepted the guidelines, the second test passes either way. Keep it anyway, since it guards the interceptor exclusion if fixtures change.

- [ ] **Step 2: Run to confirm it fails**

```bash
./gradlew test --tests 'event_social_media.controller.sitenotice.SiteNoticePublicControllerTest'
```
Expected: FAIL (401 or 404).

- [ ] **Step 3: Write the controller**

```java
package event_social_media.controller.sitenotice;

import event_social_media.dto.sitenotice.SiteNoticeLiveDto;
import event_social_media.service.sitenotice.SiteNoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The live site notices, for anyone. The Next.js app reads this through its own cached route
 * (/api/site-notices), so Spring sees about one call per minute per server instance, not one per visitor.
 */
@RestController
@RequestMapping("/api/public/site-notices")
@RequiredArgsConstructor
public class SiteNoticePublicController {

    private final SiteNoticeService siteNoticeService;

    @GetMapping
    public List<SiteNoticeLiveDto> findLive() {
        return siteNoticeService.findLive();
    }
}
```

- [ ] **Step 4: Open the endpoint in `SecurityConfig`.** Add this right after the `/api/theme-presets` matcher:

```java
                        // The site notice bar: outages and offers shown to everyone, before and after sign-in.
                        // Read-only; the Next.js app caches it, so visitors don't reach Spring for it directly.
                        .requestMatchers(HttpMethod.GET, "/api/public/site-notices").permitAll()
```

- [ ] **Step 5: Exclude it from the guidelines gate in `WebMvcConfig`.** Add this after the `"/api/public/partner-applications",` entry:

```java
                        // The notice bar shows on every page, the acceptance screen included.
                        "/api/public/site-notices",
```

- [ ] **Step 6: Run the test**

```bash
./gradlew test --tests 'event_social_media.controller.sitenotice.*'
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/controller/sitenotice/SiteNoticePublicController.java src/main/java/event_social_media/config/SecurityConfig.java src/main/java/event_social_media/config/WebMvcConfig.java src/test/java/event_social_media/controller/sitenotice/SiteNoticePublicControllerTest.java
git commit -m "Serve live site notices publicly"
```

---

### Task 7: Full check and PR

- [ ] **Step 1: Run the whole suite**

```bash
./gradlew test
```
Expected: BUILD SUCCESSFUL. If unrelated tests fail, run them on `origin/staging` to confirm they were already failing, and say so in the PR.

- [ ] **Step 2: Update the graph** (repo rule)

```bash
graphify update .
```

- [ ] **Step 3: Smoke-test locally.** Run `./gradlew bootRun` with the local env, as the repo's own docs describe. bootRun doesn't load `.env`, so export the variables first. Then:

```bash
curl -s http://localhost:8080/api/public/site-notices
```
Expected: `[]`.

- [ ] **Step 4: Push and open the PR into staging**

```bash
git push -u origin feature/site-notices
gh pr create --base staging --title "Site notices: storage, admin endpoints, public feed" --body "$(cat <<'EOF'
Adds platform-wide site notices (spec 2026-10-22-site-notices-design in the storywall repo).

- V177 `site_notices` table, entity, repository
- Admin CRUD at `/api/admin/site-notices` (admin only, audited)
- Public `GET /api/public/site-notices`: live notices only, open to everyone and outside the guidelines gate
- Version goes up when the text or link changes, so a closed notice shows again after an edit

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
