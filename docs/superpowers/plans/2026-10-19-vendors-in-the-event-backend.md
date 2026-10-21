# Vendors in the event — backend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the professionals a couple hires (photographer, planner, DJ, …) a vendor role in the event with fixed tools per type, a vendor list for guests, a Pro album with its own storage allowance, an automatic partner offer email, and a partner application endpoint — all audited without personal data.

**Architecture:** A vendor is an ordinary `EventMember` plus one `event_vendors` row that names its type. Vendor links are shared `EventInvitation` rows with a new `vendor_type` column, created by Spring. Tools open through one new check, `EventAuthorizationService.requireHostOrVendor(eventId, userId, VendorCapability)`; every other host check stays as it is. Everything is gated by a new `vendors` module whose per-plan config (`maxVendors`, `accessDaysAfterEvent`, `allowedTypes`, `proStorageBytes`) lives in `plan_tier_module_configs`.

**Tech Stack:** Spring Boot 3, JPA/Hibernate, Flyway (Postgres), H2 test suite (`ddl-auto=create-drop`, Flyway off), Testcontainers (`PostgresTestBase`) for migration tests, MockMvc, JUnit 5, Gradle.

**Spec:** [2026-10-19-vendors-in-the-event-design.md](../specs/2026-10-19-vendors-in-the-event-design.md). Frontend plan: [2026-10-19-vendors-in-the-event-frontend.md](2026-10-19-vendors-in-the-event-frontend.md) (starts after this plan's endpoints are merged into `staging`).

---

## Where and how

- Repository: `C:\Users\User\IdeaProjects\event_social_media` (Spring, "guestwall-be"). All paths below are relative to it. Main package: `src/main/java/event_social_media` (written `MAIN/` below), tests: `src/test/java/event_social_media` (written `TEST/`).
- The main checkout is shared with other sessions. Work in a worktree cut from the latest `staging`:
  ```bash
  cd C:/Users/User/IdeaProjects/event_social_media
  git fetch origin
  git worktree add .claude/worktrees/vendors -b feat/vendors origin/staging
  cd .claude/worktrees/vendors
  ```
- Run one test class: `./gradlew test --tests "event_social_media.service.vendor.VendorsConfigTest"`. Run the suite: `./gradlew test`. Postgres tests self-skip without Docker; start Docker Desktop before the migration tasks.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or open the PR until the user says so. The PR goes into `staging`.
- Backend `CLAUDE.md` rules apply: surgical changes, match the style around you, after code changes run `graphify update .`.

## Numbers to re-check before you start

Other branches claim migration and error numbers. Today `staging` ends at `V174__app_reviews.sql`, `SESSION_NOT_YOURS(4031)` and `EMAIL_TEMPLATE_UNAVAILABLE(5175)`, and `origin/feat/quiz-polls` holds `V175` and `5176`. This plan uses **V176** and the codes below. If `staging` has moved, take the next free numbers and use them everywhere this plan names them (and tell the frontend plan).

| Code | Number | HTTP |
| --- | --- | --- |
| `VENDOR_CAPABILITY_MISSING` | 4032 | 403 |
| `VENDOR_ACCESS_ENDED` | 4033 | 403 |
| `VENDOR_LIMIT_REACHED` | 5177 | 409 |
| `VENDOR_IS_HOST` | 5178 | 409 |
| `ALREADY_A_VENDOR` | 5179 | 409 |
| `PARTNER_APPLICATION_PENDING` | 5180 | 409 |

`ModuleKey` also changes on `feat/quiz-polls`; rebase conflicts in `ModuleKey`, `PlanCatalogBootstrap` and `EventTypeModuleDefaults` are expected and resolved by keeping both sides.

## Decisions this plan settles

The spec left final names to this plan. These choices were made while mapping the code (items 9, 12 and 13 were confirmed by the user on 2026-10-19):

1. `GET …/vendors/links` returns `inviteToken`, not a full URL. The frontend builds the URL with the same helper it uses for other invitations. Emails build the absolute URL in Spring as they do today.
2. Resetting a link rotates `inviteToken` and `inviteCode` on the same invitation row. Members who joined keep their `invitation_id`.
3. Links are provisioned (idempotently) after activation, after a plan change, and whenever a host opens the links list. The last one covers module unlocks and admin grants without hooking every grant path.
4. A vendor link's `maxGuests` is `Integer.MAX_VALUE`; the real limit is `maxVendors`, checked under the event row lock.
5. A link whose type is no longer allowed, or whose event lost the module, reads as an unknown link (`InvitationNotFoundException`) in preview and accept.
6. Removing a vendor removes the membership through `EventMemberService` (a hard delete, as for guests). The `event_vendors` row stays with `member_id = null` and `removed_at` set, for history.
7. `event_vendors.user_id` and `media.event_vendor_id` exist so the Pro credit and the vendor profile still resolve.
8. `VENDOR_ACCESS_ENDED` is written once by a daily sweep (`event_vendors.access_ended_at`).
9. An existing guest who opens a vendor link becomes the vendor: the membership stays, a vendor row is added, the guest seat is freed.
10. The played mark lives at `PATCH /api/events/{eventId}/playlist-suggestions/{id}/played`, next to the existing leaderboard route.
11. The gallery list gains `?collection=GUEST|PRO` (default `GUEST`), so today's gallery is unchanged. A Pro upload is `context=PRO` on the existing upload endpoints.
12. The `vendors` module is on no plan at deploy. Config rows are seeded for every event plan with `maxVendors 5`, `accessDaysAfterEvent 30`, all 8 types, `proStorageBytes 5 GB`. The H2 bootstrap also leaves it off plans, so existing tests see no vendor links or emails.
13. The partner application endpoint (`POST /api/public/partner-applications`) does not exist yet and is built here (Task 13), to the contract in `docs/superpowers/specs/2026-10-10-business-partner-landing-design.md` in the frontend repo.
14. The audit PII guard is two things: `VendorAuditWriter` refuses any `changes` key outside an allowlist, and a scenario test runs every vendor action with seeded personal data and scans the rows.
15. The authorization regression test is a differential test: for every mapped endpoint, a vendor of each type must get the same HTTP status as a plain attendee, except the endpoints this feature opens on purpose.
16. The planner RSVP variant is the JSON report with `phone` set to null. The PDF export stays host-only.

## File structure

New (all under `MAIN/` unless noted):

| File | Responsibility |
| --- | --- |
| `src/main/resources/db/migration/V176__vendors.sql` | All schema and module seed rows |
| `model/vendor/EventVendor.java`, `VendorSource.java` | A member's vendor role in one event |
| `model/vendor/VendorProfile.java` | Account-level business card |
| `model/vendor/VendorListClick.java` | Anonymous tap on a vendor list row |
| `model/vendor/PartnerVendorEmail.java` | "Partner offer sent" marker, one per event + collaborator |
| `model/collaboration/PartnerApplication.java`, `PartnerApplicationStatus.java` | Stored partner application |
| `model/media/MediaCollection.java` | `GUEST` / `PRO` |
| `repository/vendor/*Repository.java` | One per entity above |
| `repository/collaboration/PartnerApplicationRepository.java` | |
| `service/vendor/VendorsConfig.java` | Parsed module config + validation |
| `service/vendor/VendorsConfigReader.java` | The event's config when the module is available |
| `service/vendor/VendorCapability.java` | Tool rights per type |
| `service/vendor/VendorAuditWriter.java` | PII-safe audit rows |
| `service/vendor/VendorLinkService.java` | Provision, list, reset links |
| `service/vendor/VendorEventListener.java` | After-commit hooks on activation and plan change |
| `service/vendor/VendorJoinService.java` | The vendor branch of invite acceptance |
| `service/vendor/VendorJoinedEvent.java`, `VendorJoinedNotifier.java` | Host notification |
| `service/vendor/VendorService.java` | List, me, patch, remove, clicks |
| `service/vendor/VendorClickRecorder.java` | Async click insert |
| `service/vendor/VendorMembership.java` | Hook called when a member row is removed |
| `service/vendor/VendorBadges.java` | Vendor type on post and comment authors |
| `service/vendor/VendorProfileService.java` | Profile CRUD, logo, prompt dismissal |
| `service/vendor/PartnerVendorOfferService.java` | Partner auto-offer email |
| `service/vendor/VendorAccessSweepJob.java` | Writes `VENDOR_ACCESS_ENDED` |
| `service/platform/StorageCharge.java` | Guest + Pro overflow arithmetic |
| `service/collaboration/PartnerApplicationService.java` | Apply endpoint logic |
| `controller/vendor/VendorController.java`, `VendorProfileController.java` | HTTP |
| `controller/collaboration/PartnerApplicationController.java` | HTTP |
| `dto/vendor/*.java` | `VendorLinkDto`, `VendorRowDto`, `VendorMeDto`, `VendorPatchDto`, `VendorProfileDto`, `VendorProfileRequestDto`, `PlayedRequestDto` |
| `dto/collaboration/PartnerApplicationRequestDto.java`, `PartnerApplicationCreatedDto.java` | |
| `TEST/service/vendor/VendorTestSupport.java` | Shared fixtures for vendor tests |

Modified: `ErrorCode`, `ModuleKey`, `PlanCatalogBootstrap`, `PlanTierModuleConfigService`, `EventAuthorizationService`, `EventInvitation`, `EventInvitationRepository`, `EventInvitationService`, `EventInvitationPreviewDto`, `EventMemberRepository`, `EventMemberService`, `QuotaGuard`, `UsageService`, `EventUsage`, `EventUsageResponseDto`, `Media`, `MediaRepository`, `MediaUploadContext`, `MediaService`, `MediaFileUploadTransaction`, `MediaController`, `MediaResponseDto`, `StorageTrimService`, `WithdrawalService`, `EventSessionService`, `PostService`, `CommentService`, `AuthorDto`, `RsvpReportService`, `QrLinkService`, `PlaylistSuggestion`, `PlaylistSuggestionService`, `PlaylistSuggestionController`, `PlaylistSuggestionLeaderboardDto`, `NotificationType`, `NotificationCtaTarget`, `TransactionalMailService`, `CollaboratorRepository`, `SecurityConfig`, `MeDataExportService`, `UserDataExportDto`, `UserAnonymizer`, `messages.properties`, `messages_el.properties`, `TestFixtures`.

---

### Task 1: Worktree and baseline

**Files:** none

- [ ] **Step 1: Create the worktree** (commands in "Where and how").
- [ ] **Step 2: Run the full suite once and keep the result**

Run: `./gradlew test > ../vendors-baseline.txt 2>&1; tail -20 ../vendors-baseline.txt`
Expected: `BUILD SUCCESSFUL`. If anything already fails on `staging`, write the failing test names down; those are not yours to fix, and the final task compares against this list.

---

### Task 2: Error codes

**Files:**
- Modify: `MAIN/exception/ErrorCode.java` (after `SESSION_NOT_YOURS(4031)` and after the last 5xxx code)

- [ ] **Step 1: Add the codes**, using the file's javadoc style:

```java
    /** 4032 — The caller is a vendor of this event, but their type has no access to this tool. {@code 403}. */
    VENDOR_CAPABILITY_MISSING(4032),
    /** 4033 — The vendor's tools stopped working after the event ({@code vendors.accessDaysAfterEvent}). {@code 403}. */
    VENDOR_ACCESS_ENDED(4033),
```

```java
    /** 5177 — The event already has {@code vendors.maxVendors} active vendors. {@code 409}. */
    VENDOR_LIMIT_REACHED(5177),
    /** 5178 — A host or co-host opened a vendor link; one person never holds both roles. {@code 409}. */
    VENDOR_IS_HOST(5178),
    /** 5179 — The caller is already this event's vendor of another type. {@code 409}. */
    ALREADY_A_VENDOR(5179),
    /** 5180 — A pending partner application already exists for this email. {@code 409}. */
    PARTNER_APPLICATION_PENDING(5180),
```

- [ ] **Step 2: Compile and run the error code test**

Run: `./gradlew compileJava && ./gradlew test --tests "*ErrorCode*"`
Expected: PASS (any uniqueness test over the enum still passes).

- [ ] **Step 3: Commit**

```bash
git add src/main/java/event_social_media/exception/ErrorCode.java
git commit -m "feat(vendors): add vendor and partner application error codes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Migration

**Files:**
- Create: `src/main/resources/db/migration/V176__vendors.sql`
- Test: `TEST/migration/VendorsMigrationTest.java`

- [ ] **Step 1: Write the failing migration test**

```java
package event_social_media.migration;

import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V176 on a real Postgres: defaults on existing rows, the partial unique indexes, the CHECKs and the
 * module seed rows. Booting with {@code ddl-auto=validate} is the entity/migration drift check.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class VendorsMigrationTest extends PostgresTestBase {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void mediaDefaultsToTheGuestCollection() {
        String columnDefault = jdbc.queryForObject("""
                select column_default from information_schema.columns
                where table_name = 'media' and column_name = 'collection'""", String.class);
        assertThat(columnDefault).contains("GUEST");
    }

    @Test
    void mediaRefusesAnUnknownCollection() {
        String check = jdbc.queryForObject("""
                select pg_get_constraintdef(oid) from pg_constraint
                where conname = 'chk_media_collection'""", String.class);
        assertThat(check).contains("GUEST").contains("PRO");
    }

    @Test
    void invitationsHaveANullableVendorType() {
        String nullable = jdbc.queryForObject("""
                select is_nullable from information_schema.columns
                where table_name = 'event_invitations' and column_name = 'vendor_type'""", String.class);
        assertThat(nullable).isEqualTo("YES");
    }

    @Test
    void oneVendorLinkPerEventAndType() {
        String index = jdbc.queryForObject(
                "select indexdef from pg_indexes where indexname = 'uq_event_invitations_vendor_link'", String.class);
        assertThat(index).contains("UNIQUE").contains("vendor_type IS NOT NULL");
    }

    @Test
    void onePendingApplicationPerEmail() {
        insertApplication("Same@Example.com");
        assertThatThrownBy(() -> insertApplication("same@example.com"))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update("delete from partner_applications where lower(email) = 'same@example.com'");
    }

    @Test
    void theModuleIsSeededOffEveryPlanWithItsDefaults() {
        assertThat(jdbc.queryForObject(
                "select count(*) from platform_modules where module_key = 'vendors'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from plan_tier_modules where module_key = 'vendors'", Integer.class)).isZero();
        List<Map<String, Object>> configs = jdbc.queryForList(
                "select default_config::text as config from plan_tier_module_configs where module_key = 'vendors'");
        Integer eventPlans = jdbc.queryForObject(
                "select count(*) from plan_tiers where scope = 'EVENT'", Integer.class);
        assertThat(configs).hasSize(eventPlans);
        assertThat(configs).allSatisfy(row -> assertThat((String) row.get("config"))
                .contains("\"maxVendors\": 5")
                .contains("\"accessDaysAfterEvent\": 30")
                .contains("\"proStorageBytes\": 5368709120")
                .contains("PHOTOGRAPHER"));
    }

    private void insertApplication(String email) {
        jdbc.update("""
                insert into partner_applications (id, status, name, business_name, role, email, link,
                    country_code, locale, created_at)
                values (?, 'PENDING', 'N', 'B', 'PLANNER', ?, '@b', 'GR', 'el', now())""",
                UUID.randomUUID(), email);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.migration.VendorsMigrationTest"`
Expected: FAIL (column `collection` does not exist / context fails to boot).

- [ ] **Step 3: Write the migration**

```sql
-- Vendors in the event: see the frontend repo's docs/superpowers/specs/2026-10-19-vendors-in-the-event-design.md
-- and docs/superpowers/plans/2026-10-19-vendors-in-the-event-backend.md.

-- 1. Vendor links are shared invitations with a type.
ALTER TABLE event_invitations ADD COLUMN vendor_type VARCHAR(30);
CREATE UNIQUE INDEX uq_event_invitations_vendor_link
    ON event_invitations (event_id, vendor_type) WHERE vendor_type IS NOT NULL;

-- 2. A member's vendor role in one event. member_id goes NULL when the membership is removed; the
--    row stays for history with removed_at set.
CREATE TABLE event_vendors (
    id              UUID PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    member_id       UUID        REFERENCES event_members (id) ON DELETE SET NULL,
    user_id         UUID        REFERENCES users (id) ON DELETE SET NULL,
    vendor_type     VARCHAR(30) NOT NULL,
    source          VARCHAR(20) NOT NULL,
    collaborator_id UUID        REFERENCES collaborators (id) ON DELETE SET NULL,
    hidden_by_host  BOOLEAN     NOT NULL DEFAULT FALSE,
    opted_out       BOOLEAN     NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at      TIMESTAMPTZ,
    access_ended_at TIMESTAMPTZ,
    CONSTRAINT chk_event_vendors_source CHECK (source IN ('LINK', 'PARTNER_EMAIL'))
);
CREATE UNIQUE INDEX uq_event_vendors_member ON event_vendors (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_event_vendors_event ON event_vendors (event_id) WHERE removed_at IS NULL;

-- 3. The account-level vendor card.
CREATE TABLE vendor_profiles (
    user_id                     UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    business_name               VARCHAR(80)  NOT NULL,
    vendor_type                 VARCHAR(30)  NOT NULL,
    link                        VARCHAR(500) NOT NULL,
    logo_key                    VARCHAR(512),
    partner_prompt_dismissed_at TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. Pro album.
ALTER TABLE media ADD COLUMN collection VARCHAR(10) NOT NULL DEFAULT 'GUEST';
ALTER TABLE media ADD CONSTRAINT chk_media_collection CHECK (collection IN ('GUEST', 'PRO'));
ALTER TABLE media ADD COLUMN event_vendor_id UUID REFERENCES event_vendors (id) ON DELETE SET NULL;
CREATE INDEX idx_media_event_collection ON media (event_id, collection) WHERE deleted_at IS NULL;

-- 5. DJ played mark.
ALTER TABLE playlist_suggestions ADD COLUMN played_at TIMESTAMPTZ;

-- 6. Anonymous vendor list taps (no IP, user or device).
CREATE TABLE vendor_list_clicks (
    id              UUID PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    event_vendor_id UUID        NOT NULL REFERENCES event_vendors (id) ON DELETE CASCADE,
    clicked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vendor_list_clicks_vendor ON vendor_list_clicks (event_vendor_id);

-- 7. Partner auto-offer, once per event and collaborator.
CREATE TABLE partner_vendor_emails (
    id              UUID PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    collaborator_id UUID        NOT NULL REFERENCES collaborators (id) ON DELETE CASCADE,
    vendor_type     VARCHAR(30) NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_partner_vendor_emails UNIQUE (event_id, collaborator_id)
);

-- 8. Partner applications (contract: frontend spec 2026-10-10-business-partner-landing-design.md).
CREATE TABLE partner_applications (
    id            UUID PRIMARY KEY,
    status        VARCHAR(20)  NOT NULL,
    name          VARCHAR(100) NOT NULL,
    business_name VARCHAR(80)  NOT NULL,
    role          VARCHAR(30)  NOT NULL,
    email         VARCHAR(254) NOT NULL,
    link          VARCHAR(500) NOT NULL,
    country_code  VARCHAR(2)   NOT NULL,
    phone         VARCHAR(40),
    locale        VARCHAR(10)  NOT NULL,
    utm_source    VARCHAR(100),
    utm_medium    VARCHAR(100),
    utm_campaign  VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_partner_applications_status CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED'))
);
CREATE UNIQUE INDEX uq_partner_applications_pending_email
    ON partner_applications (LOWER(email)) WHERE status = 'PENDING';

-- 9. The module. On no plan at deploy (an admin turns it on per plan); config rows for every event
--    plan so PlanTierModuleConfigService#resolveConfig never fails closed on it. The JSON must match
--    PlanCatalogBootstrap#defaultMatrixConfig for "vendors".
INSERT INTO platform_modules (id, module_key, name, is_enabled, sort_order)
VALUES (gen_random_uuid(), 'vendors', 'Vendors', TRUE, 13)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO platform_event_type_modules (id, event_type_key, module_key, applicability, default_config, sort_order)
SELECT gen_random_uuid(), t.event_type_key, 'vendors', 'DEFAULT_ON',
       '{"maxVendors": 5, "accessDaysAfterEvent": 30, "proStorageBytes": 5368709120,
         "allowedTypes": ["PLANNER", "VENUE", "PHOTOGRAPHER", "VIDEOGRAPHER", "DECORATION", "CATERING", "MUSIC", "OTHER"]}'::jsonb,
       13
FROM platform_event_types t
ON CONFLICT (event_type_key, module_key) DO NOTHING;

INSERT INTO plan_tier_module_configs (id, plan_tier_id, module_key, default_config, created_at, updated_at)
SELECT gen_random_uuid(), pt.id, 'vendors',
       '{"maxVendors": 5, "accessDaysAfterEvent": 30, "proStorageBytes": 5368709120,
         "allowedTypes": ["PLANNER", "VENUE", "PHOTOGRAPHER", "VIDEOGRAPHER", "DECORATION", "CATERING", "MUSIC", "OTHER"]}'::jsonb,
       NOW(), NOW()
FROM plan_tiers pt
WHERE pt.scope = 'EVENT'
ON CONFLICT (plan_tier_id, module_key) DO NOTHING;

-- Existing events get the module row, enabled, so turning the module on for their plan (or
-- unlocking it) works without a sync. Availability still needs the plan or an unlock.
INSERT INTO event_modules (id, event_id, module_key, is_enabled, configuration)
SELECT gen_random_uuid(), e.id, 'vendors', TRUE, '{}'::jsonb
FROM events e
ON CONFLICT (event_id, module_key) DO NOTHING;
```

Before running, open `V170__he_or_she_quiz.sql` and `V146` and check: the `sort_order` of the last module (use the next number), and whether `platform_event_types` rows exist for every `EventTypeKey`. If `PlatformEventTypeModuleMigrationSeedTest` compares `default_config`, the JSON above and Task 5's Java map must be equal as maps.

- [ ] **Step 4: Run the test (entities come in Task 4, so expect a `validate` failure naming the missing entity columns — that is fine here only if every other assertion passes once Task 4 lands)**

Run: `./gradlew test --tests "event_social_media.migration.VendorsMigrationTest"`
Expected now: FAIL on schema validation (`media.collection` not mapped is fine for `validate`; a missing table for an entity is not, and there are no entities yet). Leave it red, continue to Task 4, and re-run there.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V176__vendors.sql src/test/java/event_social_media/migration/VendorsMigrationTest.java
git commit -m "feat(vendors): add V176 vendors migration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Entities and repositories

**Files:**
- Create: `MAIN/model/vendor/EventVendor.java`, `VendorSource.java`, `VendorProfile.java`, `VendorListClick.java`, `PartnerVendorEmail.java`
- Create: `MAIN/model/collaboration/PartnerApplication.java`, `PartnerApplicationStatus.java`
- Create: `MAIN/model/media/MediaCollection.java`
- Create: `MAIN/repository/vendor/EventVendorRepository.java`, `VendorProfileRepository.java`, `VendorListClickRepository.java`, `PartnerVendorEmailRepository.java`
- Create: `MAIN/repository/collaboration/PartnerApplicationRepository.java`
- Modify: `MAIN/model/event/EventInvitation.java` (after `role`), `MAIN/model/media/Media.java`, `MAIN/model/media/PlaylistSuggestion.java`
- Modify: `MAIN/repository/event/EventInvitationRepository.java`, `MAIN/repository/collaboration/CollaboratorRepository.java`
- Test: `TEST/repository/vendor/EventVendorRepositoryTest.java`

- [ ] **Step 1: Write the failing repository test**

```java
package event_social_media.repository.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorSource;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class EventVendorRepositoryTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private EventVendorRepository repository;

    @Test
    void countsOnlyActiveVendorsOfTheEvent() {
        Event event = fixtures.newEventHostedBy(fixtures.newUser());
        EventVendor active = vendor(event, PartnerRole.PHOTOGRAPHER);
        EventVendor removed = vendor(event, PartnerRole.MUSIC);
        removed.setRemovedAt(OffsetDateTime.now());
        repository.saveAndFlush(removed);
        vendor(fixtures.newEventHostedBy(fixtures.newUser()), PartnerRole.PLANNER);

        assertThat(repository.countByEvent_IdAndRemovedAtIsNull(event.getId())).isEqualTo(1);
        assertThat(repository.findByMember_IdAndRemovedAtIsNull(active.getMember().getId())).contains(active);
        assertThat(repository.findByMember_IdAndRemovedAtIsNull(removed.getMember().getId())).isEmpty();
    }

    private EventVendor vendor(Event event, PartnerRole type) {
        User user = fixtures.newUser();
        EventMember member = fixtures.newMember(event, user, EventRole.ATTENDEE);
        EventVendor vendor = new EventVendor();
        vendor.setEvent(event);
        vendor.setMember(member);
        vendor.setUser(user);
        vendor.setVendorType(type);
        vendor.setSource(VendorSource.LINK);
        vendor.setJoinedAt(OffsetDateTime.now());
        return repository.saveAndFlush(vendor);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.repository.vendor.EventVendorRepositoryTest"`
Expected: FAIL to compile (`EventVendor` missing).

- [ ] **Step 3: Write the enums and entities**

`MAIN/model/vendor/VendorSource.java`:
```java
package event_social_media.model.vendor;

/** How a vendor reached the event: the host sent the link, or Spring emailed it to a partner. */
public enum VendorSource {
    LINK,
    PARTNER_EMAIL
}
```

`MAIN/model/media/MediaCollection.java`:
```java
package event_social_media.model.media;

/** Which album a media row belongs to. {@link #PRO} is a vendor's Pro album, with its own storage allowance. */
public enum MediaCollection {
    GUEST,
    PRO
}
```

`MAIN/model/collaboration/PartnerApplicationStatus.java`:
```java
package event_social_media.model.collaboration;

/** Review state of a partner application. Approve and decline belong to the admin review spec. */
public enum PartnerApplicationStatus {
    PENDING,
    APPROVED,
    DECLINED
}
```

`MAIN/model/vendor/EventVendor.java`:
```java
package event_social_media.model.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A member's vendor role in one event (spec 2026-10-19). Active while {@link #removedAt} is null.
 * The membership is an ordinary {@link EventMember}; this row only names the type, which decides the
 * tools ({@code VendorCapability}). Kept after removal, with {@link #member} null, for history.
 */
@Getter
@Setter
@Entity
@Table(name = "event_vendors")
public class EventVendor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /** Null once the membership is removed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "member_id")
    private EventMember member;

    /** The vendor's account, kept after the membership goes so the profile and Pro credit still resolve. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "user_id")
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_type", nullable = false, length = 30)
    private PartnerRole vendorType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private VendorSource source;

    /** The partner whose offer email brought them, when {@link #source} is {@code PARTNER_EMAIL}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "collaborator_id")
    private Collaborator collaborator;

    @Column(name = "hidden_by_host", nullable = false)
    private boolean hiddenByHost;

    @Column(name = "opted_out", nullable = false)
    private boolean optedOut;

    @NotNull
    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Column(name = "removed_at")
    private OffsetDateTime removedAt;

    /** When the sweep recorded that the tools stopped. Null while they work. */
    @Column(name = "access_ended_at")
    private OffsetDateTime accessEndedAt;
}
```

`MAIN/model/vendor/VendorProfile.java`:
```java
package event_social_media.model.vendor;

import event_social_media.model.collaboration.PartnerRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A vendor's business card, one per account, shown on every event's vendor list. */
@Getter
@Setter
@Entity
@Table(name = "vendor_profiles")
public class VendorProfile {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @NotNull
    @Size(max = 80)
    @Column(name = "business_name", nullable = false, length = 80)
    private String businessName;

    /** The type the profile sheet preselects. Each event's type comes from its link, not from here. */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_type", nullable = false, length = 30)
    private PartnerRole vendorType;

    /** An https URL or an {@code @handle}. */
    @NotNull
    @Size(max = 500)
    @Column(name = "link", nullable = false, length = 500)
    private String link;

    @Column(name = "logo_key", length = 512)
    private String logoKey;

    @Column(name = "partner_prompt_dismissed_at")
    private OffsetDateTime partnerPromptDismissedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
```

`MAIN/model/vendor/VendorListClick.java`:
```java
package event_social_media.model.vendor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One tap on a vendor list row. Anonymous like {@code PartnerBrandingClick}: no IP, user or device. */
@Getter
@Setter
@Entity
@Table(name = "vendor_list_clicks")
public class VendorListClick {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @NotNull
    @Column(name = "event_vendor_id", nullable = false)
    private UUID eventVendorId;

    @NotNull
    @Column(name = "clicked_at", nullable = false)
    private OffsetDateTime clickedAt;
}
```

`MAIN/model/vendor/PartnerVendorEmail.java`:
```java
package event_social_media.model.vendor;

import event_social_media.model.collaboration.PartnerRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** The partner auto-offer was sent for this event. Inserted before sending, so a retry never sends twice. */
@Getter
@Setter
@Entity
@Table(name = "partner_vendor_emails",
        uniqueConstraints = @UniqueConstraint(name = "uq_partner_vendor_emails", columnNames = {"event_id", "collaborator_id"}))
public class PartnerVendorEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @NotNull
    @Column(name = "collaborator_id", nullable = false)
    private UUID collaboratorId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_type", nullable = false, length = 30)
    private PartnerRole vendorType;

    @NotNull
    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt;
}
```

`MAIN/model/collaboration/PartnerApplication.java`:
```java
package event_social_media.model.collaboration;

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

/** A business that asked to become a partner, from the for-business page or a vendor prompt. */
@Getter
@Setter
@Entity
@Table(name = "partner_applications")
public class PartnerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PartnerApplicationStatus status;

    @NotNull
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @NotNull
    @Column(name = "business_name", nullable = false, length = 80)
    private String businessName;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private PartnerRole role;

    @NotNull
    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @NotNull
    @Column(name = "link", nullable = false, length = 500)
    private String link;

    @NotNull
    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    @Column(name = "phone", length = 40)
    private String phone;

    @NotNull
    @Column(name = "locale", nullable = false, length = 10)
    private String locale;

    @Column(name = "utm_source", length = 100)
    private String utmSource;

    @Column(name = "utm_medium", length = 100)
    private String utmMedium;

    @Column(name = "utm_campaign", length = 100)
    private String utmCampaign;

    @NotNull
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
```

- [ ] **Step 4: Add the new columns to existing entities**

`EventInvitation.java`, after the `role` field:
```java
    /**
     * Set on a vendor link (spec 2026-10-19): a shared ATTENDEE invitation that makes whoever joins
     * through it this event's vendor of this type. Null on every other invitation.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_type", length = 30)
    private PartnerRole vendorType;
```

`Media.java`, next to `uploaderMember`:
```java
    /** {@code PRO} for a vendor's Pro album, which has its own storage allowance. */
    @NotNull
    @Enumerated(EnumType.STRING)
    @ColumnDefault("'GUEST'")
    @Column(name = "collection", nullable = false, length = 10)
    private MediaCollection collection = MediaCollection.GUEST;

    /** The vendor row behind a Pro item, for its credit. Null on guest media. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "event_vendor_id")
    private EventVendor eventVendor;
```

`PlaylistSuggestion.java`, after `comment`:
```java
    /** When the DJ (or a host) marked it played. Display only: it never changes the ranking. */
    @Column(name = "played_at")
    private OffsetDateTime playedAt;
```

Add the missing imports in each file (`PartnerRole`, `EnumType`, `Enumerated`, `MediaCollection`, `EventVendor`, `OnDelete`, `OnDeleteAction`, `ColumnDefault`).

- [ ] **Step 5: Write the repositories**

`MAIN/repository/vendor/EventVendorRepository.java`:
```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.EventVendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventVendorRepository extends JpaRepository<EventVendor, UUID> {

    long countByEvent_IdAndRemovedAtIsNull(UUID eventId);

    Optional<EventVendor> findByMember_IdAndRemovedAtIsNull(UUID memberId);

    /** Active vendors, oldest first, with their member and account loaded for the list. */
    @Query("""
            select v from EventVendor v
            left join fetch v.member left join fetch v.user
            where v.event.id = :eventId and v.removedAt is null
            order by v.joinedAt asc, v.id asc""")
    List<EventVendor> findActiveByEventId(@Param("eventId") UUID eventId);

    Optional<EventVendor> findByIdAndEvent_Id(UUID id, UUID eventId);

    /** Active vendors of active events whose access has not been recorded as ended, for the sweep. */
    @Query("""
            select v from EventVendor v join fetch v.event e
            where v.removedAt is null and v.accessEndedAt is null
              and e.deletedAt is null and coalesce(e.endAt, e.startAt) < :before""")
    List<EventVendor> findAccessEndCandidates(@Param("before") OffsetDateTime before);

    List<EventVendor> findByUser_Id(UUID userId);
}
```

`VendorProfileRepository.java`:
```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.VendorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VendorProfileRepository extends JpaRepository<VendorProfile, UUID> {

    List<VendorProfile> findByUserIdIn(Collection<UUID> userIds);
}
```

`VendorListClickRepository.java`:
```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.VendorListClick;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VendorListClickRepository extends JpaRepository<VendorListClick, UUID> {

    long countByEventVendorId(UUID eventVendorId);
}
```

`PartnerVendorEmailRepository.java`:
```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.PartnerVendorEmail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PartnerVendorEmailRepository extends JpaRepository<PartnerVendorEmail, UUID> {

    boolean existsByEventIdAndCollaboratorId(UUID eventId, UUID collaboratorId);

    List<PartnerVendorEmail> findByEventId(UUID eventId);
}
```

`MAIN/repository/collaboration/PartnerApplicationRepository.java`:
```java
package event_social_media.repository.collaboration;

import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PartnerApplicationRepository extends JpaRepository<PartnerApplication, UUID> {

    boolean existsByEmailIgnoreCaseAndStatus(String email, PartnerApplicationStatus status);
}
```

`EventInvitationRepository.java`, add:
```java
    List<EventInvitation> findByEvent_IdAndVendorTypeIsNotNull(UUID eventId);

    Optional<EventInvitation> findByEvent_IdAndVendorType(UUID eventId, PartnerRole vendorType);
```

`CollaboratorRepository.java`, add:
```java
    boolean existsByContactEmailIgnoreCaseAndDeletedAtIsNull(String contactEmail);
```

- [ ] **Step 6: Run the repository and migration tests**

Run: `./gradlew test --tests "event_social_media.repository.vendor.EventVendorRepositoryTest" --tests "event_social_media.migration.VendorsMigrationTest"`
Expected: both PASS (the migration test needs Docker; it self-skips without it — run it with Docker before you commit).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/model src/main/java/event_social_media/repository src/test/java/event_social_media/repository/vendor
git commit -m "feat(vendors): add vendor, profile, click, offer and application entities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The `vendors` module and its config

**Files:**
- Modify: `MAIN/model/event/ModuleKey.java`, `MAIN/config/PlanCatalogBootstrap.java`, `MAIN/service/platform/PlanTierModuleConfigService.java`
- Create: `MAIN/service/vendor/VendorsConfig.java`
- Test: `TEST/service/vendor/VendorsConfigTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.exception.BadRequestException;
import event_social_media.model.collaboration.PartnerRole;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorsConfigTest {

    @Test
    void parsesTheSeededDefaults() {
        VendorsConfig config = VendorsConfig.from(VendorsConfig.DEFAULTS);

        assertThat(config.maxVendors()).isEqualTo(5);
        assertThat(config.accessDaysAfterEvent()).isEqualTo(30);
        assertThat(config.proStorageBytes()).isEqualTo(5L * 1024 * 1024 * 1024);
        assertThat(config.allowedTypes()).containsExactlyInAnyOrder(PartnerRole.values());
    }

    @Test
    void missingKeysFailClosed() {
        VendorsConfig config = VendorsConfig.from(Map.of());

        assertThat(config.maxVendors()).isZero();
        assertThat(config.accessDaysAfterEvent()).isZero();
        assertThat(config.proStorageBytes()).isZero();
        assertThat(config.allowedTypes()).isEmpty();
    }

    @Test
    void ignoresUnknownTypeNames() {
        VendorsConfig config = VendorsConfig.from(Map.of("allowedTypes", List.of("MUSIC", "JUGGLER")));

        assertThat(config.allows(PartnerRole.MUSIC)).isTrue();
        assertThat(config.allowedTypes()).containsExactly(PartnerRole.MUSIC);
    }

    @Test
    void validationRefusesBadValues() {
        assertThatThrownBy(() -> VendorsConfig.validate(Map.of("maxVendors", -1)))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> VendorsConfig.validate(Map.of("proStorageBytes", "5GB")))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> VendorsConfig.validate(Map.of("allowedTypes", List.of("JUGGLER"))))
                .isInstanceOf(BadRequestException.class);
        VendorsConfig.validate(VendorsConfig.DEFAULTS);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorsConfigTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write `VendorsConfig`**

```java
package event_social_media.service.vendor;

import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.PartnerRole;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The {@code vendors} module config of one plan (spec 2026-10-19). Missing keys read as zero or
 * empty: a plan with no config row values gets no vendors, never unlimited ones.
 */
public record VendorsConfig(int maxVendors, int accessDaysAfterEvent, Set<PartnerRole> allowedTypes,
                            long proStorageBytes) {

    public static final String MAX_VENDORS = "maxVendors";
    public static final String ACCESS_DAYS = "accessDaysAfterEvent";
    public static final String ALLOWED_TYPES = "allowedTypes";
    public static final String PRO_STORAGE_BYTES = "proStorageBytes";

    /** What V176 seeds. {@code PlanCatalogBootstrap} seeds the same for H2 and new plans. */
    public static final Map<String, Object> DEFAULTS = Map.of(
            MAX_VENDORS, 5,
            ACCESS_DAYS, 30,
            PRO_STORAGE_BYTES, 5_368_709_120L,
            ALLOWED_TYPES, Arrays.stream(PartnerRole.values()).map(Enum::name).toList());

    public boolean allows(PartnerRole type) {
        return allowedTypes.contains(type);
    }

    public static VendorsConfig from(Map<String, Object> config) {
        Set<PartnerRole> types = EnumSet.noneOf(PartnerRole.class);
        if (config.get(ALLOWED_TYPES) instanceof Collection<?> names) {
            for (Object name : names) {
                Arrays.stream(PartnerRole.values())
                        .filter(role -> role.name().equals(name))
                        .findFirst()
                        .ifPresent(types::add);
            }
        }
        return new VendorsConfig(
                (int) longOf(config.get(MAX_VENDORS)),
                (int) longOf(config.get(ACCESS_DAYS)),
                Set.copyOf(types),
                longOf(config.get(PRO_STORAGE_BYTES)));
    }

    /** For an admin edit of a plan's vendors config. Every present key must have its type and be 0 or more. */
    public static void validate(Map<String, Object> config) {
        if (config == null) {
            return;
        }
        for (String key : List.of(MAX_VENDORS, ACCESS_DAYS, PRO_STORAGE_BYTES)) {
            if (!config.containsKey(key)) {
                continue;
            }
            Object value = config.get(key);
            boolean whole = value instanceof Integer || value instanceof Long;
            long max = key.equals(PRO_STORAGE_BYTES) ? Long.MAX_VALUE : Integer.MAX_VALUE;
            if (!whole || ((Number) value).longValue() < 0 || ((Number) value).longValue() > max) {
                throw new BadRequestException(ErrorCode.MODULE_CONFIG_VALUE_INVALID,
                        "vendors." + key + " must be a whole number of 0 or more.");
            }
        }
        if (config.containsKey(ALLOWED_TYPES)) {
            if (!(config.get(ALLOWED_TYPES) instanceof Collection<?> names)
                    || !names.stream().allMatch(name -> Arrays.stream(PartnerRole.values())
                            .anyMatch(role -> role.name().equals(name)))) {
                throw new BadRequestException(ErrorCode.MODULE_CONFIG_VALUE_INVALID,
                        "vendors.allowedTypes must list vendor types such as PHOTOGRAPHER.");
            }
        }
    }

    private static long longOf(Object value) {
        return value instanceof Number number && number.longValue() > 0 ? number.longValue() : 0L;
    }
}
```

- [ ] **Step 4: Register the module**

`ModuleKey.java`: add `VENDORS("vendors")` after `HE_OR_SHE("he_or_she")` (change the `;` placement accordingly).

`PlanCatalogBootstrap.java`:
- `DEFAULT_MODULE_NAMES` is a `Map.of` with 10 pairs, the most `Map.of` takes. Change it to `Map.ofEntries(Map.entry("posts", "Posts"), …, Map.entry("he_or_she", "Boy or Girl?"), Map.entry("vendors", "Vendors"))`.
- In the plan seeding loop (around line 100), leave vendors off seeded plans:
```java
                    // Vendors is on no plan until an admin turns it on (spec 2026-10-19, V176).
                    if (key != ModuleKey.VENDORS && EventTypeModuleDefaults.supports(definition.eventTypeKey(), key)) {
                        plan.getModuleKeys().add(key.getKey());
                    }
```
- In `defaultMatrixConfig`, before the final `return Map.of();`:
```java
        if (ModuleKey.VENDORS.getKey().equals(definition.moduleKey())) {
            return VendorsConfig.DEFAULTS;
        }
```

`EventTypeModuleDefaults` needs no change: every type gets `DEFAULT_ON` for a new module, which matches V176.

`PlanTierModuleConfigService.patch`, after `requireValidBooleanKey(moduleKey, defaultConfig);`:
```java
        if (ModuleKey.VENDORS.getKey().equals(moduleKey)) {
            VendorsConfig.validate(defaultConfig);
        }
```
Also call it in the type × module matrix PATCH, next to its `requireValidBooleanKey` call (search for `requireValidBooleanKey(` to find it).

- [ ] **Step 5: Run the config test and the module seed tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorsConfigTest" --tests "*PlatformEventTypeModule*" --tests "*PlanCatalog*" --tests "*ModuleKey*"`
Expected: PASS. If a test asserts every `ModuleKey` is on every seeded plan, change it to exclude `VENDORS` with a comment pointing at decision 12.

- [ ] **Step 6: Commit**

```bash
git add -A src/main/java/event_social_media src/test/java/event_social_media/service/vendor
git commit -m "feat(vendors): register the vendors module and its plan config

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Test support and the config reader

**Files:**
- Create: `MAIN/service/vendor/VendorsConfigReader.java`
- Create: `TEST/service/vendor/VendorTestSupport.java`
- Test: `TEST/service/vendor/VendorsConfigReaderTest.java`

- [ ] **Step 1: Write the shared test support** (used by every later task)

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventInvitation;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.platform.PlanTierModuleConfig;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.model.vendor.VendorSource;
import event_social_media.repository.event.EventInvitationRepository;
import event_social_media.repository.event.EventModuleRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.platform.PlanTierModuleConfigRepository;
import event_social_media.repository.platform.PlanTierRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.support.TestFixtures;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

/** Shared setup for vendor tests. Everything it writes is rolled back with the test's transaction. */
@Component
public class VendorTestSupport {

    private final TestFixtures fixtures;
    private final EventRepository eventRepository;
    private final EventModuleRepository eventModuleRepository;
    private final PlanTierRepository planTierRepository;
    private final PlanTierModuleConfigRepository planTierModuleConfigRepository;
    private final EventVendorRepository eventVendorRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final EventInvitationRepository eventInvitationRepository;

    public VendorTestSupport(TestFixtures fixtures, EventRepository eventRepository,
                             EventModuleRepository eventModuleRepository, PlanTierRepository planTierRepository,
                             PlanTierModuleConfigRepository planTierModuleConfigRepository,
                             EventVendorRepository eventVendorRepository,
                             VendorProfileRepository vendorProfileRepository,
                             EventInvitationRepository eventInvitationRepository) {
        this.fixtures = fixtures;
        this.eventRepository = eventRepository;
        this.eventModuleRepository = eventModuleRepository;
        this.planTierRepository = planTierRepository;
        this.planTierModuleConfigRepository = planTierModuleConfigRepository;
        this.eventVendorRepository = eventVendorRepository;
        this.vendorProfileRepository = vendorProfileRepository;
        this.eventInvitationRepository = eventInvitationRepository;
    }

    /** An ACTIVE event hosted by {@code host} whose plan includes vendors with the seeded defaults. */
    public Event vendorEventHostedBy(User host) {
        Event event = fixtures.newEventHostedBy(host);
        event.getPlanTier().getModuleKeys().add(ModuleKey.VENDORS.getKey());
        planTierRepository.save(event.getPlanTier());
        fixtures.seedModules(event, eventModuleRepository);
        return event;
    }

    /** Overwrites one key of the event plan's vendors config. */
    public void setConfig(Event event, String key, Object value) {
        PlanTierModuleConfig row = planTierModuleConfigRepository
                .findByPlanTier_IdAndModuleKey(event.getPlanTier().getId(), ModuleKey.VENDORS.getKey())
                .orElseThrow();
        Map<String, Object> config = new HashMap<>(row.getDefaultConfig());
        config.put(key, value);
        row.setDefaultConfig(config);
        planTierModuleConfigRepository.saveAndFlush(row);
    }

    /** A joined vendor of {@code type}, with a profile, as the join flow leaves one. */
    public EventVendor vendor(Event event, PartnerRole type) {
        User user = fixtures.newUser();
        EventMember member = fixtures.newMember(event, user, EventRole.ATTENDEE);
        EventVendor vendor = new EventVendor();
        vendor.setEvent(event);
        vendor.setMember(member);
        vendor.setUser(user);
        vendor.setVendorType(type);
        vendor.setSource(VendorSource.LINK);
        vendor.setJoinedAt(OffsetDateTime.now());
        eventVendorRepository.saveAndFlush(vendor);
        profile(user, "Studio " + type, type);
        return vendor;
    }

    public VendorProfile profile(User user, String businessName, PartnerRole type) {
        VendorProfile profile = new VendorProfile();
        profile.setUserId(user.getId());
        profile.setBusinessName(businessName);
        profile.setVendorType(type);
        profile.setLink("https://example.com/" + UUID.randomUUID());
        return vendorProfileRepository.saveAndFlush(profile);
    }

    /** Moves the event so that it ended {@code daysAgo} days ago. */
    public void endedDaysAgo(Event event, int daysAgo) {
        event.setStartAt(OffsetDateTime.now().minusDays(daysAgo).minusHours(6));
        event.setEndAt(OffsetDateTime.now().minusDays(daysAgo));
        eventRepository.saveAndFlush(event);
    }

    public EventInvitation link(Event event, PartnerRole type) {
        return eventInvitationRepository.findByEvent_IdAndVendorType(event.getId(), type).orElseThrow();
    }

    public static MockHttpServletRequestBuilder as(User user, MockHttpServletRequestBuilder request) {
        return request.with(authentication(new UsernamePasswordAuthenticationToken(
                user.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")))));
    }
}
```

Check the repository and entity package names (`PlanTierModuleConfig`, `PlanTierModuleConfigRepository`, `EventModuleRepository`) against `HeOrSheTestSupport` and `PlanTierModuleConfigService` imports, and fix the imports if they differ.

- [ ] **Step 2: Write the failing reader test**

```java
package event_social_media.service.vendor;

import event_social_media.model.event.Event;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class VendorsConfigReaderTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorsConfigReader reader;

    @Test
    void emptyWhenThePlanLacksTheModule() {
        Event event = fixtures.newEventHostedBy(fixtures.newUser());

        assertThat(reader.forEvent(event)).isEmpty();
        assertThat(reader.proAllowanceBytes(event)).isZero();
    }

    @Test
    void thePlanConfigWhenAvailable() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        support.setConfig(event, VendorsConfig.MAX_VENDORS, 2);

        assertThat(reader.forEvent(event)).get().extracting(VendorsConfig::maxVendors).isEqualTo(2);
        assertThat(reader.proAllowanceBytes(event)).isEqualTo(5_368_709_120L);
    }
}
```

- [ ] **Step 3: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorsConfigReaderTest"`
Expected: FAIL to compile.

- [ ] **Step 4: Write the reader**

```java
package event_social_media.service.vendor;

import event_social_media.model.event.Event;
import event_social_media.model.event.ModuleKey;
import event_social_media.service.platform.EventModuleConfigResolver;
import event_social_media.service.platform.ModuleAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** The event's vendors config, or empty when the module is not available to it right now. */
@Service
@RequiredArgsConstructor
public class VendorsConfigReader {

    private final ModuleAvailabilityService moduleAvailabilityService;
    private final EventModuleConfigResolver eventModuleConfigResolver;

    @Transactional(readOnly = true)
    public Optional<VendorsConfig> forEvent(Event event) {
        if (!moduleAvailabilityService.isAvailable(event.getId(), ModuleKey.VENDORS.getKey())) {
            return Optional.empty();
        }
        return Optional.of(VendorsConfig.from(
                eventModuleConfigResolver.effectiveConfig(event, ModuleKey.VENDORS.getKey())));
    }

    /** The Pro allowance, zero when the module is unavailable: Pro items then count in full. */
    @Transactional(readOnly = true)
    public long proAllowanceBytes(Event event) {
        return forEvent(event).map(VendorsConfig::proStorageBytes).orElse(0L);
    }
}
```

- [ ] **Step 5: Run the test**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorsConfigReaderTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/vendor src/test/java/event_social_media/service/vendor
git commit -m "feat(vendors): read the event's vendors config

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: PII-safe audit writer

**Files:**
- Create: `MAIN/service/vendor/VendorAuditWriter.java`
- Test: `TEST/service/vendor/VendorAuditWriterTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.model.audit.AuditLog;
import event_social_media.model.event.Event;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class VendorAuditWriterTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorAuditWriter writer;
    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void writesOneRowWithoutAnIp() {
        Event event = fixtures.newEventHostedBy(fixtures.newUser());
        UUID entityId = UUID.randomUUID();

        writer.write(event, null, "VENDOR_LINK_CREATED", "EventInvitation", entityId,
                Map.of("vendorType", "PLANNER"));

        AuditLog row = auditLogRepository.findAll().stream()
                .filter(log -> entityId.equals(log.getEntityId())).findFirst().orElseThrow();
        assertThat(row.getAction()).isEqualTo("VENDOR_LINK_CREATED");
        assertThat(row.getActorMember()).isNull();
        assertThat(row.getIpAddress()).isNull();
        assertThat(row.getChanges()).containsExactly(Map.entry("vendorType", "PLANNER"));
    }

    @Test
    void refusesKeysOutsideTheAllowlist() {
        Event event = fixtures.newEventHostedBy(fixtures.newUser());

        assertThatThrownBy(() -> writer.write(event, null, "VENDOR_JOINED", "EventVendor", UUID.randomUUID(),
                Map.of("email", "a@b.c")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void refusesAnythingButFieldNamesInFieldNames() {
        Event event = fixtures.newEventHostedBy(fixtures.newUser());

        assertThatThrownBy(() -> writer.write(event, null, "SESSION_UPDATE", "EventSession", UUID.randomUUID(),
                Map.of("fieldNames", "title")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

Check `AuditLogRepository`'s package (`grep -rn "interface AuditLogRepository" src/main`) and fix the import.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAuditWriterTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write the writer**

```java
package event_social_media.service.vendor;

import event_social_media.model.audit.AuditLog;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.repository.audit.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Event audit rows for vendor actions (spec 2026-10-19, "Audit log"). The only way vendor code writes
 * {@code audit_logs}, so the rule "no personal data" is enforced in one place: {@code changes} may
 * hold only the keys below, {@code fieldNames} only a collection of field names, and the IP address
 * is never set.
 */
@Service
@RequiredArgsConstructor
public class VendorAuditWriter {

    static final Set<String> ALLOWED_KEYS = Set.of(
            "vendorType", "source", "fieldNames", "postId", "bytes", "reportType", "rowCount",
            "collaboratorId", "suggestionId", "hiddenByHost", "optedOut");

    private final AuditLogRepository auditLogRepository;

    /**
     * @param actor the acting member, or null for a system action (a listener, a sweep)
     */
    @Transactional
    public void write(Event event, EventMember actor, String action, String entityType, UUID entityId,
                      Map<String, Object> changes) {
        for (Map.Entry<String, Object> entry : changes.entrySet()) {
            if (!ALLOWED_KEYS.contains(entry.getKey())) {
                throw new IllegalArgumentException("Vendor audit key not allowed: " + entry.getKey());
            }
            if (entry.getKey().equals("fieldNames") && !(entry.getValue() instanceof Collection<?>)) {
                throw new IllegalArgumentException("fieldNames must be a collection of field names");
            }
        }
        AuditLog entry = new AuditLog();
        entry.setEvent(event);
        entry.setActorMember(actor);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setChanges(new HashMap<>(changes));
        entry.setIpAddress(null);
        auditLogRepository.save(entry);
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAuditWriterTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/vendor/VendorAuditWriter.java src/test/java/event_social_media/service/vendor/VendorAuditWriterTest.java
git commit -m "feat(vendors): add a PII-safe audit writer for vendor actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Capabilities, the access window and `requireHostOrVendor`

**Files:**
- Create: `MAIN/service/vendor/VendorCapability.java`
- Modify: `MAIN/service/event/EventAuthorizationService.java`
- Test: `TEST/service/event/EventAuthorizationVendorTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.event;

import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventRepository;
import event_social_media.service.vendor.VendorCapability;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class EventAuthorizationVendorTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private EventAuthorizationService authorization;
    @Autowired
    private EventRepository eventRepository;

    @Test
    void aHostPassesAsNoVendor() {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);

        assertThat(authorization.requireHostOrVendor(event.getId(), host.getId(), VendorCapability.SCHEDULE_EDIT))
                .isEmpty();
    }

    @Test
    void aPlainAttendeeKeepsTodaysRefusal() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        User guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);

        assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), guest.getId(),
                VendorCapability.SCHEDULE_EDIT))
                .isInstanceOf(ForbiddenException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.NOT_EVENT_HOST);
        assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), guest.getId(),
                VendorCapability.ANNOUNCE, ErrorCode.ANNOUNCEMENT_NOT_HOST))
                .extracting("errorCode").isEqualTo(ErrorCode.ANNOUNCEMENT_NOT_HOST);
    }

    @ParameterizedTest
    @EnumSource(VendorCapability.class)
    void eachCapabilityOpensOnlyForItsTypes(VendorCapability capability) {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        for (PartnerRole type : PartnerRole.values()) {
            EventVendor vendor = support.vendor(event, type);
            UUID userId = vendor.getUser().getId();
            if (capability.types().contains(type)) {
                assertThat(authorization.requireHostOrVendor(event.getId(), userId, capability)).contains(vendor);
            } else {
                assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), userId, capability))
                        .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_CAPABILITY_MISSING);
            }
        }
    }

    @Test
    void theWindowClosesAccessDaysAfterTheEnd() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        UUID userId = planner.getUser().getId();

        support.endedDaysAgo(event, 29);
        assertThat(authorization.requireHostOrVendor(event.getId(), userId, VendorCapability.SCHEDULE_EDIT))
                .isPresent();

        support.endedDaysAgo(event, 31);
        assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), userId,
                VendorCapability.SCHEDULE_EDIT))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_ACCESS_ENDED);
    }

    @Test
    void zeroDaysClosesAtTheEndAndNoEndUsesTheStart() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        support.setConfig(event, VendorsConfig.ACCESS_DAYS, 0);
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        event.setEndAt(null);
        event.setStartAt(OffsetDateTime.now().minusMinutes(1));
        eventRepository.saveAndFlush(event);

        assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), planner.getUser().getId(),
                VendorCapability.SCHEDULE_EDIT))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_ACCESS_ENDED);
    }

    @Test
    void theWindowIsMeasuredOnInstantsNotLocalDates() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        support.setConfig(event, VendorsConfig.ACCESS_DAYS, 1);
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        // Ended 23h ago at +14:00: one day after that instant is still in the future everywhere.
        event.setEndAt(OffsetDateTime.now().minusHours(23).withOffsetSameInstant(java.time.ZoneOffset.ofHours(14)));
        event.setStartAt(event.getEndAt().minusHours(5));
        eventRepository.saveAndFlush(event);

        assertThat(authorization.requireHostOrVendor(event.getId(), planner.getUser().getId(),
                VendorCapability.SCHEDULE_EDIT)).isPresent();
    }

    @Test
    void aSuspendedEventRefusesVendorsLikeGuests() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        fixtures.suspend(event);

        assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), planner.getUser().getId(),
                VendorCapability.SCHEDULE_EDIT))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void theModuleGoingAwayTakesTheTools() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        event.getPlanTier().getModuleKeys().remove("vendors");

        assertThatThrownBy(() -> authorization.requireHostOrVendor(event.getId(), planner.getUser().getId(),
                VendorCapability.SCHEDULE_EDIT))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_CAPABILITY_MISSING);
    }

    @Test
    void requireVendorRefusesHosts() {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);

        assertThatThrownBy(() -> authorization.requireVendor(event.getId(), host.getId(), VendorCapability.PRO_ALBUM))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_CAPABILITY_MISSING);
    }
}
```

Add `import java.util.UUID;`. `ApiException` is Lombok `@Getter` with an `errorCode` field, so `extracting("errorCode")` works on every API exception in this plan.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.event.EventAuthorizationVendorTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write `VendorCapability`**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;

import java.util.EnumSet;
import java.util.Set;

import static event_social_media.model.collaboration.PartnerRole.MUSIC;
import static event_social_media.model.collaboration.PartnerRole.PHOTOGRAPHER;
import static event_social_media.model.collaboration.PartnerRole.PLANNER;
import static event_social_media.model.collaboration.PartnerRole.VIDEOGRAPHER;

/** A vendor tool and the types that get it (spec 2026-10-19, "Vendor types and tools"). Fixed presets. */
public enum VendorCapability {
    PRO_ALBUM(EnumSet.of(PHOTOGRAPHER, VIDEOGRAPHER)),
    SCHEDULE_EDIT(EnumSet.of(PLANNER)),
    ANNOUNCE(EnumSet.of(PLANNER)),
    RSVP_REPORT(EnumSet.of(PLANNER)),
    QR_READ(EnumSet.of(PLANNER)),
    SONG_REQUESTS(EnumSet.of(MUSIC));

    private final Set<PartnerRole> types;

    VendorCapability(Set<PartnerRole> types) {
        this.types = types;
    }

    public Set<PartnerRole> types() {
        return types;
    }

    public static Set<VendorCapability> of(PartnerRole type) {
        Set<VendorCapability> capabilities = EnumSet.noneOf(VendorCapability.class);
        for (VendorCapability capability : values()) {
            if (capability.types.contains(type)) {
                capabilities.add(capability);
            }
        }
        return capabilities;
    }
}
```

- [ ] **Step 4: Add the checks to `EventAuthorizationService`**

New fields (constructor injection is via `@RequiredArgsConstructor`):
```java
    private final EventVendorRepository eventVendorRepository;
    private final EventRepository eventRepository;
    private final VendorsConfigReader vendorsConfigReader;
```

New methods, after `requireHostOrSelf`:
```java
    /**
     * Passes for a host (empty) or for a vendor whose type has {@code capability} while the module is
     * available, the type is allowed and the access window is open (the vendor). A plain attendee gets
     * the same refusal as {@link #requireHost}. Every other host check stays {@link #requireHost}.
     */
    public Optional<EventVendor> requireHostOrVendor(UUID eventId, UUID callerUserId, VendorCapability capability) {
        return requireHostOrVendor(eventId, callerUserId, capability, ErrorCode.NOT_EVENT_HOST);
    }

    /** @param notHost the refusal a plain attendee gets today at this call site */
    public Optional<EventVendor> requireHostOrVendor(UUID eventId, UUID callerUserId, VendorCapability capability,
                                                     ErrorCode notHost) {
        EventMember callerMember = member(eventId, callerUserId);
        refuseIfHidden(eventId, callerMember);
        if (eventHostRepository.existsByEvent_IdAndMember_Id(eventId, callerMember.getId())) {
            return Optional.empty();
        }
        EventVendor vendor = eventVendorRepository.findByMember_IdAndRemovedAtIsNull(callerMember.getId())
                .orElseThrow(() -> new ForbiddenException(notHost, "Only event hosts can perform this action"));
        return Optional.of(requireCapability(eventId, vendor, capability, callerUserId));
    }

    /** {@link #requireHostOrVendor} for a tool only vendors have (the Pro album): hosts are refused too. */
    public EventVendor requireVendor(UUID eventId, UUID callerUserId, VendorCapability capability) {
        EventMember callerMember = member(eventId, callerUserId);
        refuseIfHidden(eventId, callerMember);
        EventVendor vendor = eventVendorRepository.findByMember_IdAndRemovedAtIsNull(callerMember.getId())
                .orElseThrow(() -> new ForbiddenException(ErrorCode.VENDOR_CAPABILITY_MISSING,
                        "Only the event's vendors can use this tool"));
        return requireCapability(eventId, vendor, capability, callerUserId);
    }

    /** When the vendor's tools stop: the event's end (or start) plus the plan's days. Null when undated. */
    public static OffsetDateTime accessEndsAt(Event event, VendorsConfig config) {
        OffsetDateTime anchor = event.getEndAt() != null ? event.getEndAt() : event.getStartAt();
        return anchor == null ? null : anchor.plusDays(config.accessDaysAfterEvent());
    }

    private EventVendor requireCapability(UUID eventId, EventVendor vendor, VendorCapability capability,
                                          UUID callerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        VendorsConfig config = vendorsConfigReader.forEvent(event).orElse(null);
        if (config == null || !config.allows(vendor.getVendorType())
                || !capability.types().contains(vendor.getVendorType())) {
            log.info("Refused {} on event {}: vendor {} ({}) lacks it", capability, eventId, callerUserId,
                    vendor.getVendorType());
            throw new ForbiddenException(ErrorCode.VENDOR_CAPABILITY_MISSING,
                    "Your vendor role does not include this tool");
        }
        OffsetDateTime endsAt = accessEndsAt(event, config);
        if (endsAt != null && !OffsetDateTime.now().isBefore(endsAt)) {
            log.info("Refused {} on event {}: vendor {} access ended at {}", capability, eventId, callerUserId, endsAt);
            throw new ForbiddenException(ErrorCode.VENDOR_ACCESS_ENDED, "Your vendor tools for this event have ended");
        }
        return vendor;
    }
```

Imports: `EventVendor`, `EventVendorRepository`, `EventRepository`, `Event`, `VendorCapability`, `VendorsConfig`, `VendorsConfigReader`, `ResourceNotFoundException`, `Optional`, `OffsetDateTime`. If Spring reports a circular dependency on startup (`VendorsConfigReader` → `ModuleAvailabilityService` → … → `EventAuthorizationService`), inject `VendorsConfigReader` with `@Lazy` on a hand-written constructor parameter and say so in the commit message.

- [ ] **Step 5: Run the test and the existing authorization tests**

Run: `./gradlew test --tests "event_social_media.service.event.EventAuthorizationVendorTest" --tests "*EventAuthorization*" --tests "*ControllerSecurityTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service src/test/java/event_social_media/service/event/EventAuthorizationVendorTest.java
git commit -m "feat(vendors): add vendor capabilities and requireHostOrVendor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Vendor links

**Files:**
- Create: `MAIN/service/vendor/VendorLinkService.java`, `VendorEventListener.java`
- Create: `MAIN/dto/vendor/VendorLinkDto.java`
- Create: `MAIN/controller/vendor/VendorController.java` (links endpoints now; more in Task 15)
- Modify: `MAIN/service/event/EventInvitationService.java` (`findByEventId`, `findById`, `patch`, `delete`)
- Test: `TEST/service/vendor/VendorLinkServiceTest.java`, `TEST/controller/vendor/VendorLinksControllerTest.java`

- [ ] **Step 1: Write the failing service test**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventInvitation;
import event_social_media.model.event.EventRole;
import event_social_media.model.event.EventStatus;
import event_social_media.model.user.User;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.event.EventInvitationRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class VendorLinkServiceTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorLinkService linkService;
    @Autowired
    private EventInvitationRepository invitationRepository;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void createsOneSharedAttendeeLinkPerAllowedType() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        support.setConfig(event, VendorsConfig.ALLOWED_TYPES, List.of("PLANNER", "MUSIC"));

        linkService.ensureLinks(event.getId());

        List<EventInvitation> links = invitationRepository.findByEvent_IdAndVendorTypeIsNotNull(event.getId());
        assertThat(links).extracting(EventInvitation::getVendorType)
                .containsExactlyInAnyOrder(PartnerRole.PLANNER, PartnerRole.MUSIC);
        assertThat(links).allSatisfy(link -> {
            assertThat(link.getShared()).isTrue();
            assertThat(link.getRole()).isEqualTo(EventRole.ATTENDEE);
            assertThat(link.getMaxGuests()).isEqualTo(Integer.MAX_VALUE);
            assertThat(link.getEmail()).isNull();
        });
        assertThat(auditLogRepository.findAll()).filteredOn(log -> "VENDOR_LINK_CREATED".equals(log.getAction()))
                .hasSize(2);
    }

    @Test
    void isIdempotent() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());

        linkService.ensureLinks(event.getId());
        linkService.ensureLinks(event.getId());

        assertThat(invitationRepository.findByEvent_IdAndVendorTypeIsNotNull(event.getId()))
                .hasSize(PartnerRole.values().length);
    }

    @Test
    void noLinksForADraftOrWithoutTheModule() {
        Event draft = support.vendorEventHostedBy(fixtures.newUser());
        draft.setStatus(EventStatus.DRAFT);
        eventRepository.saveAndFlush(draft);
        Event plain = fixtures.newEventHostedBy(fixtures.newUser());

        linkService.ensureLinks(draft.getId());
        linkService.ensureLinks(plain.getId());

        assertThat(invitationRepository.findByEvent_IdAndVendorTypeIsNotNull(draft.getId())).isEmpty();
        assertThat(invitationRepository.findByEvent_IdAndVendorTypeIsNotNull(plain.getId())).isEmpty();
    }

    @Test
    void resetRotatesTheTokenOnTheSameRow() {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        linkService.ensureLinks(event.getId());
        EventInvitation before = support.link(event, PartnerRole.PLANNER);
        UUID oldToken = before.getInviteToken();

        linkService.reset(event.getId(), PartnerRole.PLANNER, host.getId());

        EventInvitation after = support.link(event, PartnerRole.PLANNER);
        assertThat(after.getId()).isEqualTo(before.getId());
        assertThat(after.getInviteToken()).isNotEqualTo(oldToken);
        assertThat(invitationRepository.findByInviteToken(oldToken)).isEmpty();
        assertThat(auditLogRepository.findAll()).filteredOn(log -> "VENDOR_LINK_RESET".equals(log.getAction()))
                .singleElement().satisfies(log -> assertThat(log.getActorMember()).isNotNull());
    }

    @Test
    void theListShowsOnlyAllowedTypes() {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        linkService.ensureLinks(event.getId());
        support.setConfig(event, VendorsConfig.ALLOWED_TYPES, List.of("MUSIC"));

        assertThat(linkService.links(event.getId(), host.getId()))
                .extracting(VendorLinkDto::vendorType).containsExactly(PartnerRole.MUSIC);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorLinkServiceTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write the DTO and the service**

`MAIN/dto/vendor/VendorLinkDto.java`:
```java
package event_social_media.dto.vendor;

import event_social_media.model.collaboration.PartnerRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One type's vendor link. The frontend builds the invite URL from the token, as for other invitations. */
public record VendorLinkDto(PartnerRole vendorType, UUID inviteToken, OffsetDateTime createdAt) {
}
```

Check `EventInvitation` for a `createdAt` field. If there is none, drop `createdAt` from the record (and from the frontend plan's type) rather than adding a column.

`MAIN/service/vendor/VendorLinkService.java`:
```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.VendorLinkDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventInvitation;
import event_social_media.model.event.EventRole;
import event_social_media.model.event.EventStatus;
import event_social_media.repository.event.EventInvitationRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.service.event.EventAuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Vendor links (spec 2026-10-19, "Links"): one shared ATTENDEE invitation per allowed type, created by
 * Spring so the host only copies one. Idempotent; serialized on the event row.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VendorLinkService {

    static final int VENDOR_LINK_MAX_GUESTS = Integer.MAX_VALUE;

    private final EventRepository eventRepository;
    private final EventInvitationRepository invitationRepository;
    private final EventMemberRepository eventMemberRepository;
    private final EventAuthorizationService eventAuthorizationService;
    private final VendorsConfigReader vendorsConfigReader;
    private final VendorAuditWriter auditWriter;

    /** Creates any missing link for the event's allowed types. A no-op for drafts and without the module. */
    @Transactional
    public void ensureLinks(UUID eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event == null || event.getStatus() != EventStatus.ACTIVE) {
            return;
        }
        Optional<VendorsConfig> config = vendorsConfigReader.forEvent(event);
        if (config.isEmpty() || missingTypes(eventId, config.get().allowedTypes()).isEmpty()) {
            return;
        }
        // Lock, then re-read: two listeners (activation and a host opening the tab) may race here.
        eventRepository.lockById(eventId);
        for (PartnerRole type : missingTypes(eventId, config.get().allowedTypes())) {
            EventInvitation link = new EventInvitation();
            link.setEvent(event);
            link.setInviteCode(newCode(type));
            link.setInviteToken(UUID.randomUUID());
            link.setShared(true);
            link.setRole(EventRole.ATTENDEE);
            link.setMaxGuests(VENDOR_LINK_MAX_GUESTS);
            link.setVendorType(type);
            EventInvitation saved = invitationRepository.save(link);
            auditWriter.write(event, null, "VENDOR_LINK_CREATED", "EventInvitation", saved.getId(),
                    Map.of("vendorType", type.name()));
            log.info("Vendor link {} created for event {}", type, eventId);
        }
    }

    /** Host only. Provisions first, so a module unlocked a minute ago already shows its links. */
    @Transactional
    public List<VendorLinkDto> links(UUID eventId, UUID callerUserId) {
        eventAuthorizationService.requireHost(eventId, callerUserId);
        ensureLinks(eventId);
        Event event = eventRepository.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        Set<PartnerRole> allowed = vendorsConfigReader.forEvent(event)
                .map(VendorsConfig::allowedTypes).orElse(Set.of());
        return invitationRepository.findByEvent_IdAndVendorTypeIsNotNull(eventId).stream()
                .filter(link -> allowed.contains(link.getVendorType()))
                .sorted(Comparator.comparing(EventInvitation::getVendorType))
                .map(link -> new VendorLinkDto(link.getVendorType(), link.getInviteToken(), link.getCreatedAt()))
                .toList();
    }

    /** Host only. The old token stops working at once; members who joined stay. */
    @Transactional
    public VendorLinkDto reset(UUID eventId, PartnerRole type, UUID callerUserId) {
        eventAuthorizationService.requireHost(eventId, callerUserId);
        EventInvitation link = invitationRepository.findByEvent_IdAndVendorType(eventId, type)
                .orElseThrow(() -> new ResourceNotFoundException("VendorLink", eventId));
        link.setInviteToken(UUID.randomUUID());
        link.setInviteCode(newCode(type));
        EventInvitation saved = invitationRepository.save(link);
        auditWriter.write(saved.getEvent(),
                eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId).orElse(null),
                "VENDOR_LINK_RESET", "EventInvitation", saved.getId(), Map.of("vendorType", type.name()));
        log.info("Vendor link {} of event {} reset by user {}", type, eventId, callerUserId);
        return new VendorLinkDto(type, saved.getInviteToken(), saved.getCreatedAt());
    }

    private Set<PartnerRole> missingTypes(UUID eventId, Set<PartnerRole> allowed) {
        Set<PartnerRole> existing = invitationRepository.findByEvent_IdAndVendorTypeIsNotNull(eventId).stream()
                .map(EventInvitation::getVendorType)
                .collect(Collectors.toSet());
        return allowed.stream().filter(type -> !existing.contains(type)).collect(Collectors.toSet());
    }

    private static String newCode(PartnerRole type) {
        return "VENDOR-" + type.name() + "-" + UUID.randomUUID();
    }
}
```

`MAIN/service/vendor/VendorEventListener.java`:
```java
package event_social_media.service.vendor;

import event_social_media.service.event.EventActivatedEvent;
import event_social_media.service.event.EventPlanChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Vendor work that follows a commit, like {@code QrLinkDefaultsListener}: failures are logged and
 * swallowed, since the links are also provisioned when a host opens them.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorEventListener {

    private final VendorLinkService vendorLinkService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onActivated(EventActivatedEvent activated) {
        try {
            vendorLinkService.ensureLinks(activated.eventId());
        } catch (RuntimeException ex) {
            log.error("Vendor links for activated event {} failed", activated.eventId(), ex);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPlanChanged(EventPlanChangedEvent changed) {
        try {
            vendorLinkService.ensureLinks(changed.eventId());
        } catch (RuntimeException ex) {
            log.error("Vendor links for event {} after a plan change failed", changed.eventId(), ex);
        }
    }
}
```

Task 22 adds the partner offer to `onActivated`.

- [ ] **Step 4: Keep vendor links out of the host's invitation screens**

In `EventInvitationService.findByEventId`, add a filter before `.map(...)`:
```java
                .filter(invitation -> invitation.getVendorType() == null)
```
In `findById`, `patch` and `delete`, right after loading the invitation:
```java
        if (invitation.getVendorType() != null) {
            // Managed from the Vendors tab (VendorLinkService), never as a guest link.
            throw new ResourceNotFoundException("EventInvitation", id);
        }
```

- [ ] **Step 5: Add the links endpoints**

`MAIN/controller/vendor/VendorController.java`:
```java
package event_social_media.controller.vendor;

import event_social_media.dto.vendor.VendorLinkDto;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.service.vendor.VendorLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class VendorController {

    private final VendorLinkService vendorLinkService;

    private static UUID callerId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }

    @GetMapping("/api/events/{eventId}/vendors/links")
    @PreAuthorize("hasRole('USER')")
    public List<VendorLinkDto> links(@PathVariable UUID eventId, Authentication authentication) {
        return vendorLinkService.links(eventId, callerId(authentication));
    }

    @PostMapping("/api/events/{eventId}/vendors/links/{vendorType}/reset")
    @PreAuthorize("hasRole('USER')")
    public VendorLinkDto reset(@PathVariable UUID eventId, @PathVariable PartnerRole vendorType,
                               Authentication authentication) {
        return vendorLinkService.reset(eventId, vendorType, callerId(authentication));
    }
}
```

- [ ] **Step 6: Write the controller security test**

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorLinksControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;

    @Test
    void theHostGetsEveryTypesLink() throws Exception {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);

        mockMvc.perform(as(host, get("/api/events/{eventId}/vendors/links", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(PartnerRole.values().length)))
                .andExpect(jsonPath("$[0].inviteToken").isNotEmpty());
    }

    @Test
    void guestsAndVendorsAreRefused() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        User guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        User planner = support.vendor(event, PartnerRole.PLANNER).getUser();

        for (User caller : new User[]{guest, planner}) {
            mockMvc.perform(as(caller, get("/api/events/{eventId}/vendors/links", event.getId())))
                    .andExpect(status().isForbidden());
            mockMvc.perform(as(caller, post("/api/events/{eventId}/vendors/links/PLANNER/reset", event.getId())))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void vendorLinksStayOutOfTheInvitationList() throws Exception {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        mockMvc.perform(as(host, get("/api/events/{eventId}/vendors/links", event.getId())));

        mockMvc.perform(as(host, get("/api/events/{eventId}/invitations", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.vendorType)]").doesNotExist());
    }
}
```

Find the real invitation list route with `grep -n "findByEventId" src/main/java/event_social_media/controller/event/EventInvitationController.java` and use it in the last test.

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorLinkServiceTest" --tests "event_social_media.controller.vendor.VendorLinksControllerTest" --tests "*EventInvitation*" --tests "*QrOwnedInvitation*"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A src/main/java/event_social_media src/test/java/event_social_media
git commit -m "feat(vendors): provision, list and reset vendor links

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Joining through a vendor link

**Files:**
- Create: `MAIN/service/vendor/VendorJoinService.java`, `VendorJoinedEvent.java`
- Modify: `MAIN/service/event/EventInvitationService.java` (`getPreview`, `isOpenForSignup`, `acceptInvite`)
- Modify: `MAIN/dto/event/EventInvitationPreviewDto.java`
- Test: `TEST/service/vendor/VendorJoinTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.InvitationNotFoundException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventInvitation;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorSource;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.event.EventInvitationService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class VendorJoinTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorLinkService linkService;
    @Autowired
    private EventInvitationService invitationService;
    @Autowired
    private EventVendorRepository vendorRepository;
    @Autowired
    private EventMemberRepository memberRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

    private User host;
    private Event event;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        linkService.ensureLinks(event.getId());
    }

    @Test
    void eachTypeJoinsAsAnAttendeeWithAVendorRow() {
        for (PartnerRole type : PartnerRole.values()) {
            if (type.ordinal() >= 5) {
                break; // the default maxVendors is 5; the limit has its own test
            }
            User user = fixtures.newUser();
            invitationService.acceptInvite(support.link(event, type).getInviteToken(), user.getId());

            EventMember member = memberRepository.findByEvent_IdAndUser_Id(event.getId(), user.getId()).orElseThrow();
            assertThat(member.getRole()).isEqualTo(EventRole.ATTENDEE);
            EventVendor vendor = vendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId()).orElseThrow();
            assertThat(vendor.getVendorType()).isEqualTo(type);
            assertThat(vendor.getSource()).isEqualTo(VendorSource.LINK);
            assertThat(vendor.getUser().getId()).isEqualTo(user.getId());
        }
        assertThat(auditLogRepository.findAll()).filteredOn(log -> "VENDOR_JOINED".equals(log.getAction()))
                .hasSize(5);
    }

    @Test
    void joiningTwiceThroughTheSameLinkIsANoOp() {
        User user = fixtures.newUser();
        var token = support.link(event, PartnerRole.MUSIC).getInviteToken();

        invitationService.acceptInvite(token, user.getId());
        invitationService.acceptInvite(token, user.getId());

        assertThat(vendorRepository.countByEvent_IdAndRemovedAtIsNull(event.getId())).isEqualTo(1);
    }

    @Test
    void aSecondTypeIsRefused() {
        User user = fixtures.newUser();
        invitationService.acceptInvite(support.link(event, PartnerRole.MUSIC).getInviteToken(), user.getId());

        assertThatThrownBy(() -> invitationService.acceptInvite(
                support.link(event, PartnerRole.PLANNER).getInviteToken(), user.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ALREADY_A_VENDOR);
    }

    @Test
    void aHostIsRefusedAndKeepsTheHostRole() {
        assertThatThrownBy(() -> invitationService.acceptInvite(
                support.link(event, PartnerRole.PLANNER).getInviteToken(), host.getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_IS_HOST);
        assertThat(vendorRepository.countByEvent_IdAndRemovedAtIsNull(event.getId())).isZero();
    }

    @Test
    void anExistingGuestBecomesTheVendor() {
        User guest = fixtures.newUser();
        EventMember member = fixtures.newMember(event, guest, EventRole.ATTENDEE);

        invitationService.acceptInvite(support.link(event, PartnerRole.PHOTOGRAPHER).getInviteToken(), guest.getId());

        assertThat(vendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId())).isPresent();
        assertThat(memberRepository.findByEvent_IdAndUser_Id(event.getId(), guest.getId()))
                .get().extracting(EventMember::getId).isEqualTo(member.getId());
    }

    @Test
    void theLimitIsEnforced() {
        support.setConfig(event, VendorsConfig.MAX_VENDORS, 1);
        invitationService.acceptInvite(support.link(event, PartnerRole.MUSIC).getInviteToken(), fixtures.newUser().getId());

        assertThatThrownBy(() -> invitationService.acceptInvite(
                support.link(event, PartnerRole.PLANNER).getInviteToken(), fixtures.newUser().getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_LIMIT_REACHED);
    }

    @Test
    void aDisallowedTypesLinkReadsAsUnknown() {
        EventInvitation link = support.link(event, PartnerRole.MUSIC);
        support.setConfig(event, VendorsConfig.ALLOWED_TYPES, List.of("PLANNER"));

        assertThatThrownBy(() -> invitationService.acceptInvite(link.getInviteToken(), fixtures.newUser().getId()))
                .isInstanceOf(InvitationNotFoundException.class);
        assertThatThrownBy(() -> invitationService.getPreview(link.getInviteToken()))
                .isInstanceOf(InvitationNotFoundException.class);
        assertThat(invitationService.isOpenForSignup(link.getInviteToken())).isFalse();
    }

    @Test
    void thePreviewNamesTheTypeAndCountsVendors() {
        support.setConfig(event, VendorsConfig.MAX_VENDORS, 1);
        EventInvitation link = support.link(event, PartnerRole.PHOTOGRAPHER);

        assertThat(invitationService.getPreview(link.getInviteToken()).getVendorType())
                .isEqualTo(PartnerRole.PHOTOGRAPHER);
        assertThat(invitationService.getPreview(link.getInviteToken()).getAlreadyUsed()).isFalse();

        invitationService.acceptInvite(support.link(event, PartnerRole.MUSIC).getInviteToken(), fixtures.newUser().getId());
        assertThat(invitationService.getPreview(link.getInviteToken()).getAlreadyUsed()).isTrue();
        assertThat(invitationService.isOpenForSignup(link.getInviteToken())).isFalse();
    }

    @Test
    void rejoinAfterRemovalWorks() {
        User user = fixtures.newUser();
        invitationService.acceptInvite(support.link(event, PartnerRole.MUSIC).getInviteToken(), user.getId());
        EventMember member = memberRepository.findByEvent_IdAndUser_Id(event.getId(), user.getId()).orElseThrow();
        EventVendor vendor = vendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId()).orElseThrow();
        vendor.setRemovedAt(OffsetDateTime.now());
        vendor.setMember(null);
        vendorRepository.saveAndFlush(vendor);
        memberRepository.delete(member);
        memberRepository.flush();

        invitationService.acceptInvite(support.link(event, PartnerRole.PLANNER).getInviteToken(), user.getId());

        assertThat(vendorRepository.countByEvent_IdAndRemovedAtIsNull(event.getId())).isEqualTo(1);
    }

    @Test
    void guestLinksAreUnchanged() {
        EventInvitation guestLink = fixtures.newInvitation(event, null);
        guestLink.setShared(true);

        invitationService.acceptInvite(guestLink.getInviteToken(), fixtures.newUser().getId());

        assertThat(vendorRepository.countByEvent_IdAndRemovedAtIsNull(event.getId())).isZero();
    }
}
```

`getAlreadyUsed()` follows the Lombok getter of `alreadyUsed` on `EventInvitationPreviewDto`; if the field is a primitive `boolean`, the getter is `isAlreadyUsed()`. `fixtures.newInvitation` must set an `inviteToken`; if it does not, set one in the test.

Concurrency ("two joins racing for the last slot") is covered by the event row lock `acceptInvite` already takes; Task 26 adds the threaded Postgres test, since H2 in one test transaction cannot race.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorJoinTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write the event record and the join service**

`MAIN/service/vendor/VendorJoinedEvent.java`:
```java
package event_social_media.service.vendor;

import java.util.UUID;

/** Published when a vendor row is created; the host notification follows the commit. */
public record VendorJoinedEvent(UUID eventVendorId) {
}
```

`MAIN/service/vendor/VendorJoinService.java`:
```java
package event_social_media.service.vendor;

import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.InvitationNotFoundException;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventInvitation;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.PartnerVendorEmail;
import event_social_media.model.vendor.VendorSource;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.event.EventHostRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.PartnerVendorEmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * The vendor branch of invite acceptance (spec 2026-10-19, "Joining"). Called by
 * {@code EventInvitationService#acceptInvite} with the event row already locked, after the suspension,
 * expiry, writable, demo and ban checks. Vendors never take a guest seat or a link place.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VendorJoinService {

    private final EventMemberRepository eventMemberRepository;
    private final EventHostRepository eventHostRepository;
    private final EventVendorRepository eventVendorRepository;
    private final PartnerVendorEmailRepository partnerVendorEmailRepository;
    private final CollaboratorRepository collaboratorRepository;
    private final VendorsConfigReader vendorsConfigReader;
    private final VendorAuditWriter auditWriter;
    private final ApplicationEventPublisher eventPublisher;

    /** The config if this link works right now: the module is available and its type allowed. */
    @Transactional(readOnly = true)
    public Optional<VendorsConfig> liveConfig(EventInvitation link) {
        return vendorsConfigReader.forEvent(link.getEvent()).filter(config -> config.allows(link.getVendorType()));
    }

    /** Whether the event already holds {@code maxVendors} active vendors. */
    @Transactional(readOnly = true)
    public boolean isFull(UUID eventId, VendorsConfig config) {
        return eventVendorRepository.countByEvent_IdAndRemovedAtIsNull(eventId) >= config.maxVendors();
    }

    @Transactional
    public EventMember join(EventInvitation link, Event event, User caller) {
        VendorsConfig config = liveConfig(link)
                .orElseThrow(() -> new InvitationNotFoundException(link.getInviteToken()));
        Optional<EventMember> existing = eventMemberRepository.findByEvent_IdAndUser_Id(event.getId(), caller.getId());
        if (existing.isPresent()) {
            EventMember member = existing.get();
            if (eventHostRepository.existsByEvent_IdAndMember_Id(event.getId(), member.getId())) {
                throw new ConflictException(ErrorCode.VENDOR_IS_HOST,
                        "Hosts keep their host role and cannot also be a vendor of the event.");
            }
            Optional<EventVendor> vendor = eventVendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId());
            if (vendor.isPresent()) {
                if (vendor.get().getVendorType() == link.getVendorType()) {
                    return member;
                }
                throw new ConflictException(ErrorCode.ALREADY_A_VENDOR,
                        "You are already this event's vendor of another type.");
            }
            requireHeadroom(event.getId(), config);
            createVendor(event, member, caller, link);
            return member;
        }
        requireHeadroom(event.getId(), config);
        EventMember member = new EventMember();
        member.setEvent(event);
        member.setUser(caller);
        member.setInvitation(link);
        member.setRole(EventRole.ATTENDEE);
        member.setDisplayName(EventMember.displayNameFor(caller));
        member.setIsFeatured(false);
        member.setJoinedAt(OffsetDateTime.now());
        EventMember saved = eventMemberRepository.save(member);
        createVendor(event, saved, caller, link);
        return saved;
    }

    private void requireHeadroom(UUID eventId, VendorsConfig config) {
        if (isFull(eventId, config)) {
            throw new ConflictException(ErrorCode.VENDOR_LIMIT_REACHED,
                    "This event has reached the number of vendors its plan allows.");
        }
    }

    private void createVendor(Event event, EventMember member, User caller, EventInvitation link) {
        EventVendor vendor = new EventVendor();
        vendor.setEvent(event);
        vendor.setMember(member);
        vendor.setUser(caller);
        vendor.setVendorType(link.getVendorType());
        vendor.setJoinedAt(OffsetDateTime.now());
        Optional<Collaborator> partner = emailedPartner(event.getId(), caller, link);
        vendor.setSource(partner.isPresent() ? VendorSource.PARTNER_EMAIL : VendorSource.LINK);
        vendor.setCollaborator(partner.orElse(null));
        EventVendor saved = eventVendorRepository.save(vendor);

        Map<String, Object> changes = new HashMap<>();
        changes.put("vendorType", saved.getVendorType().name());
        changes.put("source", saved.getSource().name());
        auditWriter.write(event, member, "VENDOR_JOINED", "EventVendor", saved.getId(), changes);
        eventPublisher.publishEvent(new VendorJoinedEvent(saved.getId()));
        log.info("User {} joined event {} as vendor {} ({})", caller.getId(), event.getId(),
                saved.getVendorType(), saved.getSource());
    }

    /** The partner this event's offer email went to, when the caller signs in with that partner's address. */
    private Optional<Collaborator> emailedPartner(UUID eventId, User caller, EventInvitation link) {
        if (caller.getEmail() == null) {
            return Optional.empty();
        }
        for (PartnerVendorEmail sent : partnerVendorEmailRepository.findByEventId(eventId)) {
            if (sent.getVendorType() != link.getVendorType()) {
                continue;
            }
            Optional<Collaborator> partner = collaboratorRepository.findById(sent.getCollaboratorId())
                    .filter(c -> c.getContactEmail() != null && c.getContactEmail().equalsIgnoreCase(caller.getEmail()));
            if (partner.isPresent()) {
                return partner;
            }
        }
        return Optional.empty();
    }
}
```

- [ ] **Step 4: Wire it into `EventInvitationService`**

Inject `private final VendorJoinService vendorJoinService;`.

`EventInvitationPreviewDto`: add, with a javadoc in the file's style:
```java
    /** Set on a vendor link: the role the opener joins as. Null on guest and co-host links. */
    private PartnerRole vendorType;
```

`getPreview`, replace the `preview.setAlreadyUsed(...)` statement with:
```java
        if (invitation.getVendorType() != null) {
            VendorsConfig config = vendorJoinService.liveConfig(invitation)
                    .orElseThrow(() -> new InvitationNotFoundException(inviteToken));
            preview.setVendorType(invitation.getVendorType());
            preview.setAlreadyUsed(vendorJoinService.isFull(invitation.getEvent().getId(), config));
        } else {
            // "No places left", by the same count acceptInvite enforces — not usedAt, which the first
            // guest stamps and which would close a shared link for everyone after them.
            preview.setAlreadyUsed(eventMemberRepository.countByInvitation_IdAndDeletedAtIsNull(
                    invitation.getId()) >= invitation.getMaxGuests());
        }
```
Move the `liveConfig` check so it runs before any other field is set (a dead vendor link must not leak the event title): put the `if (invitation.getVendorType() != null && vendorJoinService.liveConfig(invitation).isEmpty()) throw new InvitationNotFoundException(inviteToken);` right after the `.orElseThrow(...)` that loads the invitation, and keep the block above for the count.

`isOpenForSignup`, add before `.isPresent()`:
```java
                .filter(invitation -> invitation.getVendorType() == null
                        || vendorJoinService.liveConfig(invitation)
                                .map(config -> !vendorJoinService.isFull(invitation.getEvent().getId(), config))
                                .orElse(false))
```

`acceptInvite`, right after `eventBanService.requireNotBanned(eventId, callerUserId);`:
```java
        if (invitation.getVendorType() != null) {
            // Vendors take no guest seat and no link place (spec 2026-10-19); VendorJoinService has
            // their own limit and the host/duplicate rules.
            return eventMemberMapper.toResponseDto(vendorJoinService.join(invitation, event, caller));
        }
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorJoinTest" --tests "*EventInvitation*" --tests "*Invite*"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/main/java/event_social_media src/test/java/event_social_media
git commit -m "feat(vendors): join an event through a vendor link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Vendors take no guest seat

**Files:**
- Modify: `MAIN/repository/event/EventMemberRepository.java`, `MAIN/service/platform/QuotaGuard.java:115-135`, `MAIN/service/platform/UsageService.java:67-110`
- Test: `TEST/service/platform/VendorSeatTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.platform;

import event_social_media.exception.QuotaExceededException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.repository.event.EventRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class VendorSeatTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private UsageService usageService;
    @Autowired
    private QuotaGuard quotaGuard;
    @Autowired
    private EventRepository eventRepository;

    @Test
    void vendorsAreLeftOutOfTheMemberCount() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        support.vendor(event, PartnerRole.PHOTOGRAPHER);
        support.vendor(event, PartnerRole.MUSIC);

        // host + one guest
        assertThat(usageService.forEvent(event.getId()).memberCount()).isEqualTo(2);
        assertThat(usageService.forEvents(List.of(event))).singleElement()
                .extracting(EventUsage::memberCount).isEqualTo(2L);
    }

    @Test
    void aFullEventStillAdmitsGuestsWhenTheOccupantsAreVendors() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        event.getPlanTier().setMaxMembers(2);
        event.setExtraMemberSlots(0);
        eventRepository.saveAndFlush(event);
        support.vendor(event, PartnerRole.PHOTOGRAPHER);
        support.vendor(event, PartnerRole.PLANNER);

        assertThatCode(() -> quotaGuard.requireMemberHeadroom(event.getId())).doesNotThrowAnyException();
        fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        assertThatThrownBy(() -> quotaGuard.requireMemberHeadroom(event.getId()))
                .isInstanceOf(QuotaExceededException.class);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.platform.VendorSeatTest"`
Expected: FAIL (count is 4).

- [ ] **Step 3: Add the queries**

`EventMemberRepository.java`, next to `countByEvent_IdAndDeletedAtIsNull`:
```java
    /**
     * {@link #countByEvent_IdAndDeletedAtIsNull} without the event's active vendors, who never take a
     * guest seat (spec 2026-10-19). What the member quota and usage read.
     */
    @Query("select count(m) from EventMember m where m.event.id = :eventId and m.deletedAt is null "
            + "and not exists (select v.id from EventVendor v where v.member = m and v.removedAt is null)")
    long countSeatedMembersByEvent(@Param("eventId") UUID eventId);

    /** {@link #countActiveMembersGroupedByEvent} without active vendors. */
    @Query("select m.event.id as eventId, count(m) as total from EventMember m where m.deletedAt is null "
            + "and not exists (select v.id from EventVendor v where v.member = m and v.removedAt is null) "
            + "group by m.event.id")
    List<EventMemberCountRow> countSeatedMembersGroupedByEvent();
```

- [ ] **Step 4: Use them**

`QuotaGuard.requireMemberHeadroom`: `eventMemberRepository.countByEvent_IdAndDeletedAtIsNull(eventId)` → `eventMemberRepository.countSeatedMembersByEvent(eventId)`.
`UsageService.forEvent`: same replacement. `UsageService.forEvents`: `countActiveMembersGroupedByEvent()` → `countSeatedMembersGroupedByEvent()`.
Leave every other caller of the old methods alone.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.platform.VendorSeatTest" --tests "*QuotaGuard*" --tests "*Usage*" --tests "*MemberThreshold*"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/main/java/event_social_media src/test/java/event_social_media/service/platform/VendorSeatTest.java
git commit -m "feat(vendors): leave vendors out of guest and member counts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: `VENDOR_JOINED` notification

**Files:**
- Modify: `MAIN/model/user/NotificationType.java` (find it with `find src/main -name NotificationType.java`), `NotificationCtaTarget.java`
- Create: `MAIN/service/vendor/VendorJoinedNotifier.java`
- Modify: `src/main/resources/i18n/messages.properties`, `messages_el.properties`
- Test: `TEST/service/vendor/VendorJoinedNotifierTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.Notification;
import event_social_media.model.user.NotificationType;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.user.NotificationRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class VendorJoinedNotifierTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorJoinedNotifier notifier;
    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void everyHostIsToldWhoJoinedAndAsWhat() {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        User coHost = fixtures.newUser();
        fixtures.newCoHost(event, coHost);
        EventVendor vendor = support.vendor(event, PartnerRole.PHOTOGRAPHER);

        notifier.onJoined(new VendorJoinedEvent(vendor.getId()));

        assertThat(notificationRepository.findAll())
                .filteredOn(n -> n.getType() == NotificationType.VENDOR_JOINED)
                .extracting(n -> n.getRecipientUser().getId())
                .containsExactlyInAnyOrder(host.getId(), coHost.getId());
        Notification one = notificationRepository.findAll().stream()
                .filter(n -> n.getType() == NotificationType.VENDOR_JOINED).findFirst().orElseThrow();
        assertThat(one.getPayload()).containsEntry("businessName", "Studio PHOTOGRAPHER")
                .containsEntry("vendorType", "PHOTOGRAPHER");
        assertThat(one.getPayload()).doesNotContainKey("email");
    }
}
```

Fix the `Notification`/`NotificationRepository` imports to the real packages (`grep -rn "interface NotificationRepository" src/main`). If `Notification` stores the payload under another name, assert on that field.

The vendor has no profile at join time in production (the sheet comes after). The notifier runs after commit, so it reads whatever profile exists then; without one it falls back to the member's display name.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorJoinedNotifierTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Add the type, the CTA target and the copy**

`NotificationType.java`, at the end:
```java
    ,

    /** A vendor joined the event through a vendor link. Sent to every host. */
    VENDOR_JOINED
```
(adjust the punctuation so the enum stays valid: put a comma after `WISHBOOK_BOOK_READY`).

`NotificationCtaTarget.java`: add `EVENT_VENDORS("/events/{eventId}/manage/vendors"),` in the style of `EVENT_GUESTS("/events/{eventId}/manage/qr")`.

`messages.properties`:
```properties
notification.vendor.joined.title={businessName} joined as {vendorTypeLabel}
notification.vendor.joined.body=They can now use their tools in your event.
notification.cta.view_vendors=View vendors
vendor.type.PLANNER=planner
vendor.type.VENUE=venue
vendor.type.PHOTOGRAPHER=photographer
vendor.type.VIDEOGRAPHER=videographer
vendor.type.DECORATION=decorator
vendor.type.CATERING=caterer
vendor.type.MUSIC=DJ or band
vendor.type.OTHER=vendor
```

`messages_el.properties`:
```properties
notification.vendor.joined.title=Ο/Η {businessName} μπήκε ως {vendorTypeLabel}
notification.vendor.joined.body=Μπορεί πλέον να χρησιμοποιεί τα εργαλεία του/της στην εκδήλωσή σας.
notification.cta.view_vendors=Προβολή επαγγελματιών
vendor.type.PLANNER=διοργανωτής γάμου
vendor.type.VENUE=χώρος εκδηλώσεων
vendor.type.PHOTOGRAPHER=φωτογράφος
vendor.type.VIDEOGRAPHER=βιντεογράφος
vendor.type.DECORATION=διακοσμητής
vendor.type.CATERING=catering
vendor.type.MUSIC=DJ ή μπάντα
vendor.type.OTHER=επαγγελματίας
```
Show both files' new lines to the user before release; this copy is user-facing.

- [ ] **Step 4: Write the notifier**

```java
package event_social_media.service.vendor;

import event_social_media.model.event.EventHost;
import event_social_media.model.notification.NotificationCategory;
import event_social_media.model.notification.NotificationCtaTarget;
import event_social_media.model.notification.NotificationSeverity;
import event_social_media.model.user.NotificationType;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventHostRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;
import java.util.UUID;

/** Tells every host a vendor joined (spec 2026-10-19, "Notifications"). Business name and type only. */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorJoinedNotifier {

    private final EventVendorRepository eventVendorRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final EventHostRepository eventHostRepository;
    private final NotificationEmitter notificationEmitter;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onJoined(VendorJoinedEvent joined) {
        EventVendor vendor = eventVendorRepository.findById(joined.eventVendorId()).orElse(null);
        if (vendor == null || vendor.getRemovedAt() != null || vendor.getMember() == null) {
            return;
        }
        UUID eventId = vendor.getEvent().getId();
        String businessName = vendor.getUser() == null ? vendor.getMember().getDisplayName()
                : vendorProfileRepository.findById(vendor.getUser().getId())
                        .map(p -> p.getBusinessName())
                        .orElse(vendor.getMember().getDisplayName());
        String type = vendor.getVendorType().name();
        for (EventHost host : eventHostRepository.findByEvent_Id(eventId)) {
            if (host.getMember().getUser() == null) {
                continue;
            }
            notificationEmitter.emit(new NotificationDraft(
                    host.getMember().getUser().getId(),
                    host.getMember().getId(),
                    NotificationType.VENDOR_JOINED,
                    NotificationCategory.SYSTEM,
                    NotificationSeverity.INFO,
                    businessName + " joined as " + type.toLowerCase(),
                    "They can now use their tools in your event.",
                    "View vendors",
                    NotificationCtaTarget.EVENT_VENDORS,
                    Map.of("eventId", eventId.toString()),
                    null,
                    "vendor.joined:" + vendor.getId() + ":host:" + host.getMember().getId(),
                    Map.of("businessName", businessName, "vendorType", type,
                            "vendorTypeLabel", "vendor.type." + type),
                    "notification.vendor.joined.title",
                    "notification.vendor.joined.body",
                    "notification.cta.view_vendors"));
        }
        log.info("Hosts of event {} told vendor {} joined as {}", eventId, vendor.getId(), type);
    }
}
```

Fix imports for `NotificationCategory`, `NotificationSeverity`, `NotificationCtaTarget`, `NotificationDraft`, `NotificationEmitter` from `MemberArchiveNotifier`'s import list. Check how other notifications pass a translatable argument (`vendorTypeLabel` here): if the renderer does not resolve nested keys, pass the English label in `payload` and let the frontend localize `vendorType` itself; the frontend plan reads `vendorType`.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorJoinedNotifierTest" --tests "*Notification*"`
Expected: PASS. Also confirm co-host acceptance and guest joins emit no `VENDOR_JOINED`: the `guestLinksAreUnchanged` case in `VendorJoinTest` plus `assertThat(notificationRepository.findAll()).noneMatch(n -> n.getType() == NotificationType.VENDOR_JOINED)` there.

- [ ] **Step 6: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): notify hosts when a vendor joins

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Partner applications endpoint

**Files:**
- Create: `MAIN/dto/collaboration/PartnerApplicationRequestDto.java`, `PartnerApplicationCreatedDto.java`
- Create: `MAIN/service/collaboration/PartnerApplicationService.java`
- Create: `MAIN/controller/collaboration/PartnerApplicationController.java`
- Modify: `MAIN/config/SecurityConfig.java` (permitAll list)
- Test: `TEST/controller/collaboration/PartnerApplicationControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.collaboration;

import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.repository.collaboration.PartnerApplicationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PartnerApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PartnerApplicationRepository repository;

    private static String body(String email, String website) {
        return """
                {"name":"Maria P","businessName":"Studio M","role":"PHOTOGRAPHER","email":"%s",
                 "link":"@studiom","countryCode":"GR","phone":null,"locale":"el","consent":true,
                 "utmSource":"storywall-vendor","utmMedium":"PHOTOGRAPHER","utmCampaign":null,"website":"%s"}"""
                .formatted(email, website);
    }

    @Test
    void storesAPendingApplicationWithoutASession() throws Exception {
        mockMvc.perform(post("/api/public/partner-applications")
                        .contentType(MediaType.APPLICATION_JSON).content(body("m@example.com", "")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty());

        assertThat(repository.findAll()).singleElement().satisfies(app -> {
            assertThat(app.getStatus()).isEqualTo(PartnerApplicationStatus.PENDING);
            assertThat(app.getUtmSource()).isEqualTo("storywall-vendor");
            assertThat(app.getUtmMedium()).isEqualTo("PHOTOGRAPHER");
        });
    }

    @Test
    void aSecondPendingApplicationForTheEmailIs409() throws Exception {
        mockMvc.perform(post("/api/public/partner-applications")
                .contentType(MediaType.APPLICATION_JSON).content(body("dup@example.com", "")));

        mockMvc.perform(post("/api/public/partner-applications")
                        .contentType(MediaType.APPLICATION_JSON).content(body("DUP@example.com", "")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(5180));
    }

    @Test
    void theHoneypotIsDroppedSilently() throws Exception {
        mockMvc.perform(post("/api/public/partner-applications")
                        .contentType(MediaType.APPLICATION_JSON).content(body("bot@example.com", "http://spam")))
                .andExpect(status().isCreated());

        assertThat(repository.findAll()).isEmpty();
    }

    @Test
    void invalidFieldsAre400() throws Exception {
        mockMvc.perform(post("/api/public/partner-applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("not-an-email", "").replace("\"consent\":true", "\"consent\":false")))
                .andExpect(status().isBadRequest());
    }
}
```

Check the error body's code property name (`code`, `errorCode`) in an existing 409 test and use it.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.PartnerApplicationControllerTest"`
Expected: FAIL (404 / 401).

- [ ] **Step 3: Write the DTOs**

```java
package event_social_media.dto.collaboration;

import event_social_media.model.collaboration.PartnerRole;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** {@code POST /api/public/partner-applications} (frontend spec 2026-10-10, "Spring contract"). */
@Data
public class PartnerApplicationRequestDto {

    /** An https URL or an {@code @handle}. Shared with the vendor profile. */
    public static final String LINK_PATTERN = "^(https://\\S{1,492}|@[A-Za-z0-9._]{1,60})$";

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotBlank
    @Size(max = 80)
    private String businessName;

    @NotNull
    private PartnerRole role;

    @NotBlank
    @Email
    @Size(max = 254)
    private String email;

    @NotBlank
    @Size(max = 500)
    @Pattern(regexp = LINK_PATTERN)
    private String link;

    @NotBlank
    @Pattern(regexp = "^[A-Z]{2}$")
    private String countryCode;

    @Size(max = 40)
    @Pattern(regexp = "^\\+?[0-9 ()-]{6,40}$")
    private String phone;

    @NotBlank
    @Pattern(regexp = "^(el|en)$")
    private String locale;

    @AssertTrue
    private boolean consent;

    @Size(max = 100)
    private String utmSource;

    @Size(max = 100)
    private String utmMedium;

    @Size(max = 100)
    private String utmCampaign;

    /** Honeypot: hidden from people. A non-empty value is a bot, answered 201 and dropped. */
    @Size(max = 500)
    private String website;
}
```

```java
package event_social_media.dto.collaboration;

import java.util.UUID;

public record PartnerApplicationCreatedDto(UUID id) {
}
```

- [ ] **Step 4: Write the service and controller**

```java
package event_social_media.service.collaboration;

import event_social_media.dto.collaboration.PartnerApplicationRequestDto;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.repository.collaboration.PartnerApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Stores partner applications as {@code PENDING}. Review is the admin spec's job. */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerApplicationService {

    private final PartnerApplicationRepository repository;

    @Transactional
    public UUID create(PartnerApplicationRequestDto dto) {
        if (dto.getWebsite() != null && !dto.getWebsite().isBlank()) {
            log.info("Partner application dropped: honeypot filled");
            return UUID.randomUUID();
        }
        String email = dto.getEmail().trim();
        if (repository.existsByEmailIgnoreCaseAndStatus(email, PartnerApplicationStatus.PENDING)) {
            throw pending();
        }
        PartnerApplication application = new PartnerApplication();
        application.setStatus(PartnerApplicationStatus.PENDING);
        application.setName(dto.getName().trim());
        application.setBusinessName(dto.getBusinessName().trim());
        application.setRole(dto.getRole());
        application.setEmail(email);
        application.setLink(dto.getLink().trim());
        application.setCountryCode(dto.getCountryCode());
        application.setPhone(dto.getPhone() == null || dto.getPhone().isBlank() ? null : dto.getPhone().trim());
        application.setLocale(dto.getLocale());
        application.setUtmSource(dto.getUtmSource());
        application.setUtmMedium(dto.getUtmMedium());
        application.setUtmCampaign(dto.getUtmCampaign());
        application.setCreatedAt(OffsetDateTime.now());
        try {
            PartnerApplication saved = repository.saveAndFlush(application);
            log.info("Partner application {} stored ({}, source {})", saved.getId(), saved.getRole(), saved.getUtmSource());
            return saved.getId();
        } catch (DataIntegrityViolationException ex) {
            // Two submissions raced past the check; the partial unique index kept one.
            throw pending();
        }
    }

    private static ConflictException pending() {
        return new ConflictException(ErrorCode.PARTNER_APPLICATION_PENDING,
                "An application with this email is already being reviewed.");
    }
}
```

```java
package event_social_media.controller.collaboration;

import event_social_media.dto.collaboration.PartnerApplicationCreatedDto;
import event_social_media.dto.collaboration.PartnerApplicationRequestDto;
import event_social_media.service.collaboration.PartnerApplicationService;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public: the for-business form and the vendor "Become a partner" sheet post here without a session. */
@RestController
@RequiredArgsConstructor
public class PartnerApplicationController {

    private final PartnerApplicationService partnerApplicationService;

    @PostMapping("/api/public/partner-applications")
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimit(name = "partner-applications.create", limit = 5, windowSeconds = 3600)
    public PartnerApplicationCreatedDto create(@Valid @RequestBody PartnerApplicationRequestDto dto) {
        return new PartnerApplicationCreatedDto(partnerApplicationService.create(dto));
    }
}
```

`SecurityConfig`: next to the other single-method public matchers (around line 113):
```java
                        // The partner application form, from the for-business page or a vendor's prompt.
                        .requestMatchers(HttpMethod.POST, "/api/public/partner-applications").permitAll()
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.PartnerApplicationControllerTest" --tests "*Security*"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(partners): accept partner applications at /api/public/partner-applications

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Vendor profile

**Files:**
- Create: `MAIN/dto/vendor/VendorProfileDto.java`, `VendorProfileRequestDto.java`
- Create: `MAIN/service/vendor/VendorProfileService.java`
- Create: `MAIN/controller/vendor/VendorProfileController.java`
- Test: `TEST/controller/vendor/VendorProfileControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.vendor;

import event_social_media.model.user.User;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorProfileRepository repository;

    @Test
    void noProfileIs404() throws Exception {
        mockMvc.perform(as(fixtures.newUser(), get("/api/me/vendor-profile"))).andExpect(status().isNotFound());
    }

    @Test
    void putCreatesThenUpdates() throws Exception {
        User user = fixtures.newUser();
        mockMvc.perform(as(user, put("/api/me/vendor-profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessName\":\"Studio M\",\"vendorType\":\"PHOTOGRAPHER\",\"link\":\"@studiom\"}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Studio M"))
                .andExpect(jsonPath("$.logoUrl").doesNotExist());

        mockMvc.perform(as(user, put("/api/me/vendor-profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessName\":\"Studio N\",\"vendorType\":\"PHOTOGRAPHER\",\"link\":\"https://n.gr\"}")))
                .andExpect(jsonPath("$.businessName").value("Studio N"));
        assertThat(repository.findById(user.getId())).get().extracting("link").isEqualTo("https://n.gr");
    }

    @Test
    void refusesABadLinkOrALongName() throws Exception {
        User user = fixtures.newUser();
        mockMvc.perform(as(user, put("/api/me/vendor-profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessName\":\"S\",\"vendorType\":\"MUSIC\",\"link\":\"javascript:alert(1)\"}")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(as(user, put("/api/me/vendor-profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessName\":\"" + "x".repeat(81) + "\",\"vendorType\":\"MUSIC\",\"link\":\"@a\"}")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dismissingThePromptSticks() throws Exception {
        User user = fixtures.newUser();
        mockMvc.perform(as(user, put("/api/me/vendor-profile").contentType(MediaType.APPLICATION_JSON)
                .content("{\"businessName\":\"S\",\"vendorType\":\"MUSIC\",\"link\":\"@a\"}")));

        mockMvc.perform(as(user, post("/api/me/vendor-profile/dismiss-partner-prompt"))).andExpect(status().isNoContent());

        mockMvc.perform(as(user, get("/api/me/vendor-profile")))
                .andExpect(jsonPath("$.partnerPromptDismissed").value(true));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorProfileControllerTest"`
Expected: FAIL (404 on PUT).

- [ ] **Step 3: Write DTOs, service and controller**

```java
package event_social_media.dto.vendor;

import event_social_media.dto.collaboration.PartnerApplicationRequestDto;
import event_social_media.model.collaboration.PartnerRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VendorProfileRequestDto {

    @NotBlank
    @Size(max = 80)
    private String businessName;

    @NotNull
    private PartnerRole vendorType;

    @NotBlank
    @Size(max = 500)
    @Pattern(regexp = PartnerApplicationRequestDto.LINK_PATTERN)
    private String link;
}
```

```java
package event_social_media.dto.vendor;

import event_social_media.model.collaboration.PartnerRole;

public record VendorProfileDto(String businessName, PartnerRole vendorType, String link, String logoUrl,
                               boolean partnerPromptDismissed) {
}
```

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.VendorProfileDto;
import event_social_media.dto.vendor.VendorProfileRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ProviderUnavailableException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.media.DetectedMediaType;
import event_social_media.service.storage.StorageService;
import event_social_media.service.user.AvatarImagePipeline;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.UUID;

/** The vendor's account-level card (spec 2026-10-19, "Vendor profile"). */
@Slf4j
@Service
@RequiredArgsConstructor
public class VendorProfileService {

    private final VendorProfileRepository repository;
    private final StorageService storageService;
    private final AvatarImagePipeline imagePipeline;

    @Transactional(readOnly = true)
    public VendorProfileDto get(UUID userId) {
        return toDto(require(userId));
    }

    @Transactional
    public VendorProfileDto put(UUID userId, VendorProfileRequestDto dto) {
        VendorProfile profile = repository.findById(userId).orElseGet(() -> {
            VendorProfile created = new VendorProfile();
            created.setUserId(userId);
            return created;
        });
        profile.setBusinessName(dto.getBusinessName().trim());
        profile.setVendorType(dto.getVendorType());
        profile.setLink(dto.getLink().trim());
        return toDto(repository.save(profile));
    }

    /** Same image rules as partner logos ({@link AvatarImagePipeline}). Replaces any earlier logo. */
    @Transactional
    public VendorProfileDto uploadLogo(UUID userId, MultipartFile file) {
        VendorProfile profile = require(userId);
        String newKey;
        try {
            DetectedMediaType detected = imagePipeline.validate(file);
            newKey = imagePipeline.store(file, detected,
                    (in, length, mime, ext) -> storageService.uploadUserFile(userId, in, length, mime, ext));
        } catch (IOException ex) {
            log.warn("Vendor logo of user {} could not be stored", userId, ex);
            throw new ProviderUnavailableException(ErrorCode.STORAGE_UPLOAD_FAILED, "The image could not be stored. Try again.");
        }
        String oldKey = profile.getLogoKey();
        profile.setLogoKey(newKey);
        repository.save(profile);
        if (oldKey != null) {
            storageService.deleteFile(oldKey);
        }
        return toDto(profile);
    }

    @Transactional
    public VendorProfileDto deleteLogo(UUID userId) {
        VendorProfile profile = require(userId);
        if (profile.getLogoKey() != null) {
            storageService.deleteFile(profile.getLogoKey());
            profile.setLogoKey(null);
            repository.save(profile);
        }
        return toDto(profile);
    }

    @Transactional
    public void dismissPartnerPrompt(UUID userId) {
        VendorProfile profile = require(userId);
        if (profile.getPartnerPromptDismissedAt() == null) {
            profile.setPartnerPromptDismissedAt(OffsetDateTime.now());
            repository.save(profile);
        }
    }

    public String logoUrl(VendorProfile profile) {
        return profile.getLogoKey() == null ? null : storageService.generatePresignedUrl(profile.getLogoKey());
    }

    private VendorProfile require(UUID userId) {
        return repository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("VendorProfile", userId));
    }

    private VendorProfileDto toDto(VendorProfile profile) {
        return new VendorProfileDto(profile.getBusinessName(), profile.getVendorType(), profile.getLink(),
                logoUrl(profile), profile.getPartnerPromptDismissedAt() != null);
    }
}
```

Copy the exact `imagePipeline.store` lambda shape (and its `StorageTransferException` wrapping of `IOException`) from `CollaboratorBrandingService.uploadImage`, and fix the imports of `AvatarImagePipeline`, `DetectedMediaType` and `ProviderUnavailableException` to their real packages. If `ResourceNotFoundException` turns `null` messages into 500s, pass a fixed string.

```java
package event_social_media.controller.vendor;

import event_social_media.dto.vendor.VendorProfileDto;
import event_social_media.dto.vendor.VendorProfileRequestDto;
import event_social_media.service.ratelimit.RateLimit;
import event_social_media.service.vendor.VendorProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class VendorProfileController {

    private final VendorProfileService vendorProfileService;

    private static UUID callerId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }

    @GetMapping("/api/me/vendor-profile")
    @PreAuthorize("hasRole('USER')")
    public VendorProfileDto get(Authentication authentication) {
        return vendorProfileService.get(callerId(authentication));
    }

    @PutMapping("/api/me/vendor-profile")
    @PreAuthorize("hasRole('USER')")
    public VendorProfileDto put(@Valid @RequestBody VendorProfileRequestDto dto, Authentication authentication) {
        return vendorProfileService.put(callerId(authentication), dto);
    }

    @PostMapping("/api/me/vendor-profile/logo")
    @PreAuthorize("hasRole('USER')")
    @RateLimit(name = "vendor-profile.logo", limit = 20, windowSeconds = 3600)
    public VendorProfileDto uploadLogo(@RequestParam("file") MultipartFile file, Authentication authentication) {
        return vendorProfileService.uploadLogo(callerId(authentication), file);
    }

    @DeleteMapping("/api/me/vendor-profile/logo")
    @PreAuthorize("hasRole('USER')")
    public VendorProfileDto deleteLogo(Authentication authentication) {
        return vendorProfileService.deleteLogo(callerId(authentication));
    }

    @PostMapping("/api/me/vendor-profile/dismiss-partner-prompt")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismissPartnerPrompt(Authentication authentication) {
        vendorProfileService.dismissPartnerPrompt(callerId(authentication));
    }
}
```

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorProfileControllerTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): add the vendor profile endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Vendor list, my role, hide, opt out, remove, clicks

**Files:**
- Create: `MAIN/dto/vendor/VendorRowDto.java`, `VendorMeDto.java`, `VendorPatchDto.java`
- Create: `MAIN/service/vendor/VendorService.java`, `VendorClickRecorder.java`, `VendorMembership.java`
- Modify: `MAIN/controller/vendor/VendorController.java`, `MAIN/service/event/EventMemberService.java` (`remove`), `MAIN/controller/event/AdminEventController.java`, `MAIN/repository/media/MediaRepository.java`
- Test: `TEST/controller/vendor/VendorControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private EventVendorRepository vendorRepository;
    @Autowired
    private EventMemberRepository memberRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

    private User host;
    private User guest;
    private Event event;
    private EventVendor photographer;
    private EventVendor dj;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        dj = support.vendor(event, PartnerRole.MUSIC);
    }

    @Test
    void guestsSeeListedVendorsWithoutFlags() throws Exception {
        dj.setOptedOut(true);
        vendorRepository.saveAndFlush(dj);

        mockMvc.perform(as(guest, get("/api/events/{eventId}/vendors", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].businessName").value("Studio PHOTOGRAPHER"))
                .andExpect(jsonPath("$[0].hiddenByHost").doesNotExist())
                .andExpect(jsonPath("$[0].optedOut").doesNotExist());
    }

    @Test
    void hostsSeeHiddenAndOptedOutRows() throws Exception {
        dj.setOptedOut(true);
        photographer.setHiddenByHost(true);
        vendorRepository.saveAllAndFlush(java.util.List.of(dj, photographer));

        mockMvc.perform(as(host, get("/api/events/{eventId}/vendors", event.getId())))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.optedOut == true)]", hasSize(1)))
                .andExpect(jsonPath("$[?(@.hiddenByHost == true)]", hasSize(1)));
    }

    @Test
    void onlyTheHostHidesAndOnlyTheVendorOptsOut() throws Exception {
        String hide = "{\"hiddenByHost\":true}";
        String optOut = "{\"optedOut\":true}";

        mockMvc.perform(as(guest, patch("/api/events/{e}/vendors/{v}", event.getId(), dj.getId())
                .contentType(MediaType.APPLICATION_JSON).content(hide))).andExpect(status().isForbidden());
        mockMvc.perform(as(host, patch("/api/events/{e}/vendors/{v}", event.getId(), dj.getId())
                .contentType(MediaType.APPLICATION_JSON).content(optOut))).andExpect(status().isForbidden());
        mockMvc.perform(as(photographer.getUser(), patch("/api/events/{e}/vendors/{v}", event.getId(), dj.getId())
                .contentType(MediaType.APPLICATION_JSON).content(optOut))).andExpect(status().isForbidden());

        mockMvc.perform(as(host, patch("/api/events/{e}/vendors/{v}", event.getId(), dj.getId())
                .contentType(MediaType.APPLICATION_JSON).content(hide))).andExpect(status().isOk());
        mockMvc.perform(as(dj.getUser(), patch("/api/events/{e}/vendors/{v}", event.getId(), dj.getId())
                .contentType(MediaType.APPLICATION_JSON).content(optOut))).andExpect(status().isOk());

        EventVendor saved = vendorRepository.findById(dj.getId()).orElseThrow();
        assertThat(saved.isHiddenByHost()).isTrue();
        assertThat(saved.isOptedOut()).isTrue();
        assertThat(auditLogRepository.findAll()).extracting("action")
                .contains("VENDOR_LIST_HIDDEN", "VENDOR_OPTED_OUT");
    }

    @Test
    void removingAVendorRemovesTheMembershipAndKeepsTheRow() throws Exception {
        var memberId = dj.getMember().getId();

        mockMvc.perform(as(host, delete("/api/events/{e}/vendors/{v}", event.getId(), dj.getId())))
                .andExpect(status().isNoContent());

        assertThat(memberRepository.findById(memberId)).isEmpty();
        EventVendor saved = vendorRepository.findById(dj.getId()).orElseThrow();
        assertThat(saved.getRemovedAt()).isNotNull();
        assertThat(saved.getMember()).isNull();
        assertThat(auditLogRepository.findAll()).extracting("action").contains("VENDOR_REMOVED");
    }

    @Test
    void aVendorLeavingThemselvesIsRecordedToo() throws Exception {
        mockMvc.perform(as(dj.getUser(), delete("/api/event-members/{id}", dj.getMember().getId())))
                .andExpect(status().is2xxSuccessful());

        assertThat(vendorRepository.findById(dj.getId()).orElseThrow().getRemovedAt()).isNotNull();
    }

    @Test
    void meDescribesTheCallersRole() throws Exception {
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vendorType").value("PHOTOGRAPHER"))
                .andExpect(jsonPath("$.capabilities[0]").value("PRO_ALBUM"))
                .andExpect(jsonPath("$.accessOpen").value(true))
                .andExpect(jsonPath("$.profileComplete").value(true))
                .andExpect(jsonPath("$.showPartnerPrompt").value(true))
                .andExpect(jsonPath("$.proStorageBytes").value(5368709120L))
                .andExpect(jsonPath("$.proUsedBytes").value(0))
                .andExpect(jsonPath("$.optedOut").value(false))
                .andExpect(jsonPath("$.hiddenByHost").value(false));
        mockMvc.perform(as(guest, get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(status().isNotFound());

        photographer.setOptedOut(true);
        photographer.setHiddenByHost(true);
        vendorRepository.saveAndFlush(photographer);
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(jsonPath("$.optedOut").value(true))
                .andExpect(jsonPath("$.hiddenByHost").value(true));
    }

    @Test
    void thePartnerPromptHidesForPartnersAndApplicants() throws Exception {
        var partner = fixtures.newCollaborator();
        partner.setContactEmail(dj.getUser().getEmail());

        mockMvc.perform(as(dj.getUser(), get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(jsonPath("$.showPartnerPrompt").value(false));
    }

    @Test
    void clicksAreCountedForListedVendors() throws Exception {
        mockMvc.perform(as(guest, post("/api/events/{e}/vendors/{v}/clicks", event.getId(), dj.getId())))
                .andExpect(status().isAccepted());
    }
}
```

The collaborator in `thePartnerPromptHidesForPartnersAndApplicants` must be saved after the email change; use the collaborator repository's `saveAndFlush`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorControllerTest"`
Expected: FAIL (404s).

- [ ] **Step 3: Write the DTOs**

```java
package event_social_media.dto.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;
import event_social_media.model.collaboration.PartnerRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A vendor list row. The two flags are present only for hosts and for the vendor's own row. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VendorRowDto(UUID id, UUID memberId, PartnerRole vendorType, String businessName, String link,
                           String logoUrl, OffsetDateTime joinedAt, Boolean hiddenByHost, Boolean optedOut) {
}
```

```java
package event_social_media.dto.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.service.vendor.VendorCapability;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The caller's vendor role in one event. The Pro figures are set only for types with the Pro album.
 * The two list flags are here because a hidden vendor's own row is not in the guest list.
 */
public record VendorMeDto(UUID vendorId, PartnerRole vendorType, List<VendorCapability> capabilities,
                          OffsetDateTime accessEndsAt, boolean accessOpen, boolean profileComplete,
                          boolean showPartnerPrompt, Long proStorageBytes, Long proUsedBytes,
                          boolean optedOut, boolean hiddenByHost) {
}
```

```java
package event_social_media.dto.vendor;

import lombok.Data;

/** Exactly one field: a host sends {@code hiddenByHost}, the vendor themself sends {@code optedOut}. */
@Data
public class VendorPatchDto {
    private Boolean hiddenByHost;
    private Boolean optedOut;
}
```

- [ ] **Step 4: Write the membership hook and wire it into `EventMemberService.remove`**

```java
package event_social_media.service.vendor;

import event_social_media.model.event.EventMember;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** Keeps the vendor row in step when its membership is removed, by a host or by the vendor leaving. */
@Service
@RequiredArgsConstructor
public class VendorMembership {

    private final EventVendorRepository eventVendorRepository;
    private final EventMemberRepository eventMemberRepository;
    private final VendorAuditWriter auditWriter;

    /** Call before the member row is deleted. A no-op for members who are not vendors. */
    @Transactional
    public void memberRemoving(EventMember member, UUID callerUserId) {
        eventVendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId()).ifPresent(vendor -> {
            vendor.setRemovedAt(OffsetDateTime.now());
            vendor.setMember(null);
            eventVendorRepository.save(vendor);
            EventMember actor = callerUserId == null ? null
                    : eventMemberRepository.findByEvent_IdAndUser_Id(member.getEvent().getId(), callerUserId)
                            .filter(m -> !m.getId().equals(member.getId()))
                            .orElse(null);
            auditWriter.write(member.getEvent(), actor, "VENDOR_REMOVED", "EventVendor", vendor.getId(),
                    Map.of("vendorType", vendor.getVendorType().name(), "source", vendor.getSource().name()));
        });
    }
}
```

The actor is null when the vendor removes themself: their own member row is about to be deleted, and the audit FK would null it anyway.

`EventMemberService`: inject `private final VendorMembership vendorMembership;` and in `remove(...)`, right before `eventMemberRepository.delete(member);`:
```java
        vendorMembership.memberRemoving(member, callerUserId);
```

- [ ] **Step 5: Write the click recorder and `VendorService`**

```java
package event_social_media.service.vendor;

import event_social_media.model.vendor.VendorListClick;
import event_social_media.repository.vendor.VendorListClickRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Async like {@code PartnerBrandingClickRecorder}: a tap never waits on the insert. */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorClickRecorder {

    private final VendorListClickRepository repository;

    @Async
    public void record(UUID eventId, UUID eventVendorId) {
        try {
            VendorListClick click = new VendorListClick();
            click.setEventId(eventId);
            click.setEventVendorId(eventVendorId);
            click.setClickedAt(OffsetDateTime.now());
            repository.save(click);
        } catch (RuntimeException ex) {
            log.warn("Vendor list click on {} not recorded", eventVendorId, ex);
        }
    }
}
```

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.VendorMeDto;
import event_social_media.dto.vendor.VendorPatchDto;
import event_social_media.dto.vendor.VendorRowDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.collaboration.PartnerApplicationRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.event.EventMemberService;
import event_social_media.service.platform.ModuleAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** The vendor list and each vendor's own controls (spec 2026-10-19, "Vendor list for guests"). */
@Service
@RequiredArgsConstructor
public class VendorService {

    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final EventVendorRepository eventVendorRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final CollaboratorRepository collaboratorRepository;
    private final PartnerApplicationRepository partnerApplicationRepository;
    private final MediaRepository mediaRepository;
    private final EventAuthorizationService eventAuthorizationService;
    private final EventMemberService eventMemberService;
    private final ModuleAvailabilityService moduleAvailabilityService;
    private final VendorsConfigReader vendorsConfigReader;
    private final VendorProfileService vendorProfileService;
    private final VendorAuditWriter auditWriter;
    private final VendorClickRecorder clickRecorder;

    @Transactional(readOnly = true)
    public List<VendorRowDto> list(UUID eventId, UUID callerUserId) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        moduleAvailabilityService.requireReadable(eventId, ModuleKey.VENDORS);
        boolean host = eventAuthorizationService.isHost(eventId, callerUserId);
        List<EventVendor> vendors = eventVendorRepository.findActiveByEventId(eventId);
        Map<UUID, VendorProfile> profiles = profilesOf(vendors);
        return vendors.stream()
                .filter(v -> v.getMember() != null)
                .filter(v -> host || (!v.isHiddenByHost() && !v.isOptedOut() && profileOf(v, profiles) != null))
                .map(v -> row(v, profileOf(v, profiles),
                        host || isSelf(v, callerUserId)))
                .toList();
    }

    @Transactional(readOnly = true)
    public VendorMeDto me(UUID eventId, UUID callerUserId) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        EventMember member = eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId).orElseThrow();
        EventVendor vendor = eventVendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId())
                .orElseThrow(() -> new ResourceNotFoundException("EventVendor", eventId));
        Event event = eventRepository.findById(eventId).orElseThrow();
        VendorsConfig config = vendorsConfigReader.forEvent(event).orElse(null);
        boolean allowed = config != null && config.allows(vendor.getVendorType());
        OffsetDateTime endsAt = config == null ? null : EventAuthorizationService.accessEndsAt(event, config);
        boolean open = allowed && (endsAt == null || OffsetDateTime.now().isBefore(endsAt));
        Set<VendorCapability> capabilities = allowed ? VendorCapability.of(vendor.getVendorType()) : Set.of();
        VendorProfile profile = vendorProfileRepository.findById(callerUserId).orElse(null);
        boolean pro = capabilities.contains(VendorCapability.PRO_ALBUM);
        return new VendorMeDto(
                vendor.getId(),
                vendor.getVendorType(),
                capabilities.stream().sorted().toList(),
                endsAt,
                open,
                profile != null,
                showPartnerPrompt(member, profile),
                pro ? config.proStorageBytes() : null,
                pro ? mediaRepository.sumActiveStorageBytesByEventAndCollection(eventId, MediaCollection.PRO) : null,
                vendor.isOptedOut(),
                vendor.isHiddenByHost());
    }

    @Transactional
    public VendorRowDto patch(UUID eventId, UUID vendorId, VendorPatchDto dto, UUID callerUserId) {
        if ((dto.getHiddenByHost() == null) == (dto.getOptedOut() == null)) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Send exactly one of hiddenByHost or optedOut.");
        }
        EventVendor vendor = active(eventId, vendorId);
        EventMember actor;
        if (dto.getHiddenByHost() != null) {
            eventAuthorizationService.requireHost(eventId, callerUserId);
            actor = eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId).orElseThrow();
            vendor.setHiddenByHost(dto.getHiddenByHost());
            auditWriter.write(vendor.getEvent(), actor, dto.getHiddenByHost() ? "VENDOR_LIST_HIDDEN" : "VENDOR_LIST_SHOWN",
                    "EventVendor", vendor.getId(), Map.of("hiddenByHost", dto.getHiddenByHost()));
        } else {
            eventAuthorizationService.requireMember(eventId, callerUserId);
            if (!isSelf(vendor, callerUserId)) {
                throw new ForbiddenException(ErrorCode.VENDOR_CAPABILITY_MISSING,
                        "Only the vendor can change their own listing.");
            }
            actor = vendor.getMember();
            vendor.setOptedOut(dto.getOptedOut());
            auditWriter.write(vendor.getEvent(), actor, dto.getOptedOut() ? "VENDOR_OPTED_OUT" : "VENDOR_OPTED_IN",
                    "EventVendor", vendor.getId(), Map.of("optedOut", dto.getOptedOut()));
        }
        EventVendor saved = eventVendorRepository.save(vendor);
        return row(saved, saved.getUser() == null ? null : vendorProfileRepository.findById(saved.getUser().getId()).orElse(null), true);
    }

    /** Host only: removes the vendor role and the membership ({@link VendorMembership} records it). */
    @Transactional
    public void remove(UUID eventId, UUID vendorId, UUID callerUserId) {
        eventAuthorizationService.requireHost(eventId, callerUserId);
        EventVendor vendor = active(eventId, vendorId);
        eventMemberService.delete(vendor.getMember().getId(), callerUserId);
    }

    @Transactional(readOnly = true)
    public void click(UUID eventId, UUID vendorId, UUID callerUserId) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        EventVendor vendor = active(eventId, vendorId);
        if (!vendor.isHiddenByHost() && !vendor.isOptedOut()) {
            clickRecorder.record(eventId, vendor.getId());
        }
    }

    private boolean showPartnerPrompt(EventMember member, VendorProfile profile) {
        if (profile == null || profile.getPartnerPromptDismissedAt() != null || member.getUser() == null) {
            return false;
        }
        String email = member.getUser().getEmail();
        return email != null
                && !collaboratorRepository.existsByContactEmailIgnoreCaseAndDeletedAtIsNull(email)
                && !partnerApplicationRepository.existsByEmailIgnoreCaseAndStatus(email, PartnerApplicationStatus.PENDING);
    }

    private EventVendor active(UUID eventId, UUID vendorId) {
        return eventVendorRepository.findByIdAndEvent_Id(vendorId, eventId)
                .filter(v -> v.getRemovedAt() == null && v.getMember() != null)
                .orElseThrow(() -> new ResourceNotFoundException("EventVendor", vendorId));
    }

    private static boolean isSelf(EventVendor vendor, UUID callerUserId) {
        return vendor.getUser() != null && vendor.getUser().getId().equals(callerUserId);
    }

    private Map<UUID, VendorProfile> profilesOf(List<EventVendor> vendors) {
        Set<UUID> userIds = vendors.stream().map(EventVendor::getUser).filter(Objects::nonNull)
                .map(u -> u.getId()).collect(Collectors.toSet());
        return vendorProfileRepository.findByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(VendorProfile::getUserId, Function.identity()));
    }

    private static VendorProfile profileOf(EventVendor vendor, Map<UUID, VendorProfile> profiles) {
        return vendor.getUser() == null ? null : profiles.get(vendor.getUser().getId());
    }

    private VendorRowDto row(EventVendor v, VendorProfile profile, boolean withFlags) {
        return new VendorRowDto(v.getId(), v.getMember() == null ? null : v.getMember().getId(), v.getVendorType(),
                profile == null ? null : profile.getBusinessName(),
                profile == null ? null : profile.getLink(),
                profile == null ? null : vendorProfileService.logoUrl(profile),
                v.getJoinedAt(),
                withFlags ? v.isHiddenByHost() : null,
                withFlags ? v.isOptedOut() : null);
    }
}
```

Add the per-album sum to `MediaRepository` now, in its storage accounting section (Task 20 uses it too):
```java
    /** {@link #sumActiveStorageBytesByEvent} for one album. */
    @Query("select coalesce(sum(m.fileSize), 0) + coalesce(sum(m.originalFileSize), 0) from Media m "
            + "where m.event.id = :eventId and m.deletedAt is null and m.collection = :collection")
    long sumActiveStorageBytesByEventAndCollection(@Param("eventId") UUID eventId,
                                                   @Param("collection") MediaCollection collection);
```

Admins are not members of the events they inspect, so the admin event detail (spec, "Admin") gets its own read. Add to `VendorService`:
```java
    /** Admin event detail: every active vendor, read-only, flags included. The controller is ADMIN-only. */
    @Transactional(readOnly = true)
    public List<VendorRowDto> listForAdmin(UUID eventId) {
        List<EventVendor> vendors = eventVendorRepository.findActiveByEventId(eventId);
        Map<UUID, VendorProfile> profiles = profilesOf(vendors);
        return vendors.stream()
                .filter(v -> v.getMember() != null)
                .map(v -> row(v, profileOf(v, profiles), true))
                .toList();
    }
```
and to `AdminEventController` (already `@PreAuthorize("hasRole('ADMIN')")` under `/api/admin/events`), injecting `VendorService`:
```java
    @Operation(summary = "The event's vendors, read-only")
    @GetMapping("/{eventId}/vendors")
    public List<VendorRowDto> vendors(@PathVariable UUID eventId) {
        return vendorService.listForAdmin(eventId);
    }
```
Add to `VendorControllerTest`:
```java
    @Test
    void adminsReadTheListAndOthersCannot() throws Exception {
        User admin = fixtures.newUser();
        mockMvc.perform(get("/api/admin/events/{e}/vendors", event.getId())
                        .with(authentication(new UsernamePasswordAuthenticationToken(admin.getId().toString(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
        mockMvc.perform(as(host, get("/api/admin/events/{e}/vendors", event.getId())))
                .andExpect(status().isForbidden());
    }
```
(imports: `UsernamePasswordAuthenticationToken`, `SimpleGrantedAuthority`, `List`, and `SecurityMockMvcRequestPostProcessors.authentication`, as `AdminRoleHierarchyTest` uses).

- [ ] **Step 6: Add the endpoints to `VendorController`**

Inject `private final VendorService vendorService;` and add:
```java
    @GetMapping("/api/events/{eventId}/vendors")
    @PreAuthorize("hasRole('USER')")
    public List<VendorRowDto> list(@PathVariable UUID eventId, Authentication authentication) {
        return vendorService.list(eventId, callerId(authentication));
    }

    @GetMapping("/api/events/{eventId}/vendors/me")
    @PreAuthorize("hasRole('USER')")
    public VendorMeDto me(@PathVariable UUID eventId, Authentication authentication) {
        return vendorService.me(eventId, callerId(authentication));
    }

    @PatchMapping("/api/events/{eventId}/vendors/{vendorId}")
    @PreAuthorize("hasRole('USER')")
    public VendorRowDto patch(@PathVariable UUID eventId, @PathVariable UUID vendorId,
                              @RequestBody VendorPatchDto dto, Authentication authentication) {
        return vendorService.patch(eventId, vendorId, dto, callerId(authentication));
    }

    @DeleteMapping("/api/events/{eventId}/vendors/{vendorId}")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID eventId, @PathVariable UUID vendorId, Authentication authentication) {
        vendorService.remove(eventId, vendorId, callerId(authentication));
    }

    @PostMapping("/api/events/{eventId}/vendors/{vendorId}/clicks")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @RateLimit(name = "vendors.click", limit = 60, windowSeconds = 3600)
    public void click(@PathVariable UUID eventId, @PathVariable UUID vendorId, Authentication authentication) {
        vendorService.click(eventId, vendorId, callerId(authentication));
    }
```
Add the imports (`PatchMapping`, `DeleteMapping`, `RequestBody`, `ResponseStatus`, `HttpStatus`, `RateLimit`, the DTOs).

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorControllerTest" --tests "*EventMember*"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): add the vendor list, my role, hide, opt out, remove and clicks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15b: Vendor badge on post and comment authors

The frontend shows a vendor badge on posts and comments by vendors (spec, "Frontend"). Today `AuthorDto` carries no vendor field, so this task adds `vendorType`. It is set while the vendor row is active (`removedAt` is null), whatever the list visibility, and is null for everyone else. One query per response, never one per author.

**Files:**
- Create: `MAIN/service/vendor/VendorBadges.java`
- Modify: `MAIN/dto/media/AuthorDto.java`, `MAIN/repository/vendor/EventVendorRepository.java`, `MAIN/service/media/PostService.java:146-157,211,283,349-450`, `MAIN/service/media/CommentService.java:56-93,185-195`
- Test: `TEST/service/vendor/VendorBadgesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.dto.media.CommentRequestDto;
import event_social_media.dto.media.PostRequestDto;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.media.CommentService;
import event_social_media.service.media.PostService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class VendorBadgesTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private PostService postService;
    @Autowired
    private CommentService commentService;
    @Autowired
    private EventVendorRepository eventVendorRepository;

    private Event event;
    private User host;
    private EventVendor photographer;
    private User guest;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
    }

    @Test
    void aVendorsPostAndCommentCarryTheirType() {
        UUID postId = post(photographer.getUser()).getId();
        comment(postId, photographer.getUser());

        assertThat(postService.findById(postId, host.getId()).getAuthor().getVendorType())
                .isEqualTo(PartnerRole.PHOTOGRAPHER);
        assertThat(postService.findByEventId(event.getId(), PageRequest.of(0, 10), guest.getId())
                .getContent().get(0).getRecentComments().get(0).getAuthor().getVendorType())
                .isEqualTo(PartnerRole.PHOTOGRAPHER);
        assertThat(commentService.findByPostId(postId, PageRequest.of(0, 10), guest.getId())
                .getContent().get(0).getAuthor().getVendorType())
                .isEqualTo(PartnerRole.PHOTOGRAPHER);
    }

    @Test
    void theResponseToTheVendorsOwnWriteCarriesTheType() {
        var created = post(photographer.getUser());
        assertThat(created.getAuthor().getVendorType()).isEqualTo(PartnerRole.PHOTOGRAPHER);
        assertThat(comment(created.getId(), photographer.getUser()).getAuthor().getVendorType())
                .isEqualTo(PartnerRole.PHOTOGRAPHER);
    }

    @Test
    void guestsAndHostsHaveNoType() {
        UUID guestPost = post(guest).getId();
        UUID hostPost = post(host).getId();
        assertThat(postService.findById(guestPost, host.getId()).getAuthor().getVendorType()).isNull();
        assertThat(postService.findById(hostPost, guest.getId()).getAuthor().getVendorType()).isNull();
    }

    @Test
    void theBadgeStaysWhenTheVendorIsHiddenFromTheList() {
        UUID postId = post(photographer.getUser()).getId();
        photographer.setHiddenByHost(true);
        photographer.setOptedOut(true);
        eventVendorRepository.saveAndFlush(photographer);

        assertThat(postService.findById(postId, guest.getId()).getAuthor().getVendorType())
                .isEqualTo(PartnerRole.PHOTOGRAPHER);
    }

    @Test
    void aRemovedVendorRowGivesNoBadge() {
        UUID postId = post(photographer.getUser()).getId();
        photographer.setRemovedAt(OffsetDateTime.now());
        eventVendorRepository.saveAndFlush(photographer);

        assertThat(postService.findById(postId, guest.getId()).getAuthor().getVendorType()).isNull();
    }

    private event_social_media.dto.media.PostResponseDto post(User author) {
        PostRequestDto dto = new PostRequestDto();
        dto.setEventId(event.getId());
        dto.setType("TEXT");
        dto.setContent("Hello");
        dto.setIsPinned(false);
        return postService.create(dto, author.getId());
    }

    private event_social_media.dto.media.CommentResponseDto comment(UUID postId, User author) {
        CommentRequestDto dto = new CommentRequestDto();
        dto.setPostId(postId);
        dto.setContent("Nice");
        return commentService.create(dto, author.getId());
    }
}
```

`aRemovedVendorRowGivesNoBadge` sets `removedAt` without deleting the membership, so the post keeps its author. In the product the membership goes too (Task 15), and the post shows no author row at all.

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorBadgesTest"`
Expected: compilation FAIL, `cannot find symbol: method getVendorType()`.

- [ ] **Step 3: Add the field, the query and `VendorBadges`**

`AuthorDto`, after `customRole`:
```java
        /** The author's vendor type while they are a vendor of this event; null for everyone else. */
        private PartnerRole vendorType;
```
with `import event_social_media.model.collaboration.PartnerRole;`.

`EventVendorRepository`, next to `findByMember_IdAndRemovedAtIsNull`:
```java
    List<EventVendor> findByMember_IdInAndRemovedAtIsNull(Collection<UUID> memberIds);
```
with `import java.util.Collection;`.

`MAIN/service/vendor/VendorBadges.java`:
```java
package event_social_media.service.vendor;

import event_social_media.dto.media.AuthorDto;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.vendor.EventVendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Sets {@link AuthorDto#getVendorType()} on a batch of authors with one query. */
@Service
@RequiredArgsConstructor
public class VendorBadges {

    private final EventVendorRepository eventVendorRepository;

    public void apply(Stream<AuthorDto> authors) {
        List<AuthorDto> present = authors.filter(Objects::nonNull).toList();
        List<UUID> memberIds = present.stream().map(AuthorDto::getMemberId).filter(Objects::nonNull)
                .distinct().toList();
        if (memberIds.isEmpty()) {
            return;
        }
        Map<UUID, PartnerRole> typeByMember = eventVendorRepository.findByMember_IdInAndRemovedAtIsNull(memberIds)
                .stream()
                .collect(Collectors.toMap(vendor -> vendor.getMember().getId(), EventVendor::getVendorType,
                        (first, second) -> first));
        present.forEach(author -> author.setVendorType(typeByMember.get(author.getMemberId())));
    }
}
```

- [ ] **Step 4: Call it from the two services**

`PostService`: inject `private final VendorBadges vendorBadges;` (the class uses `@RequiredArgsConstructor`; check and match). In `assemble`, replace the final `return posts.stream().map(post -> { … }).toList();` with:
```java
        List<PostResponseDto> assembled = posts.stream().map(post -> {
            // … the existing body, unchanged …
        }).toList();
        vendorBadges.apply(assembled.stream().flatMap(dto -> Stream.concat(
                Stream.of(dto.getAuthor()),
                dto.getRecentComments() == null ? Stream.empty()
                        : dto.getRecentComments().stream().map(CommentResponseDto::getAuthor))));
        return assembled;
```
`findByEventId`, `findById`, `create` and `patch` all go through `assemble` (lines 146, 157, 211, 283), so nothing else changes in this file.

`CommentService`: inject `VendorBadges` the same way. In `findByPostId`:
```java
        Page<CommentResponseDto> page = comments.map(
                comment -> toResponseDto(comment, membersById, avatarUrlsByUserId, rolesVisible));
        vendorBadges.apply(page.getContent().stream().map(CommentResponseDto::getAuthor));
        return page;
```
In `findById` and `create`, after the `toResponseDto(...)` call that builds the single response:
```java
        vendorBadges.apply(Stream.of(response.getAuthor()));
```
(name the local `response` in `findById` if it is returned inline today; add `import java.util.stream.Stream;` if missing).

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorBadgesTest" --tests "*PostService*" --tests "*CommentService*" --tests "*PostController*" --tests "*CommentController*"`
Expected: PASS. Existing tests see `vendorType` absent from JSON only if `AuthorDto` serialization skips nulls; if a JSON snapshot test now sees `"vendorType":null`, update that snapshot on purpose and say so in the commit.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(vendors): vendor type on post and comment authors for the badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 16: Planner tools — schedule, announcements, QR links

**Files:**
- Modify: `MAIN/service/event/EventSessionService.java:67-160`, `MAIN/service/media/PostService.java:169-190`, `MAIN/service/event/QrLinkService.java:405-410`
- Test: `TEST/service/vendor/PlannerToolsTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.dto.event.EventSessionPatchDto;
import event_social_media.dto.event.EventSessionRequestDto;
import event_social_media.dto.media.PostRequestDto;
import event_social_media.exception.ErrorCode;
import event_social_media.model.audit.AuditLog;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.service.event.EventSessionService;
import event_social_media.service.event.QrLinkService;
import event_social_media.service.media.PostService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class PlannerToolsTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private EventSessionService sessionService;
    @Autowired
    private PostService postService;
    @Autowired
    private QrLinkService qrLinkService;
    @Autowired
    private AuditLogRepository auditLogRepository;

    private Event event;
    private User planner;
    private User dj;

    @BeforeEach
    void setUp() {
        event = support.vendorEventHostedBy(fixtures.newUser());
        planner = support.vendor(event, PartnerRole.PLANNER).getUser();
        dj = support.vendor(event, PartnerRole.MUSIC).getUser();
    }

    @Test
    void aPlannerEditsTheScheduleAndOnlyFieldNamesAreAudited() {
        EventSessionRequestDto create = new EventSessionRequestDto();
        create.setEventId(event.getId());
        create.setTitle("Church — private note 0690000000");
        create.setStartAt(OffsetDateTime.now().plusDays(30));
        var session = sessionService.create(create, planner.getId());

        EventSessionPatchDto patch = new EventSessionPatchDto();
        patch.setTitle("Reception");
        sessionService.patch(session.getId(), patch, planner.getId());
        sessionService.delete(session.getId(), planner.getId());

        List<AuditLog> rows = auditLogRepository.findAll().stream()
                .filter(log -> log.getAction().startsWith("SESSION_")).toList();
        assertThat(rows).extracting(AuditLog::getAction)
                .containsExactly("SESSION_CREATE", "SESSION_UPDATE", "SESSION_DELETE");
        assertThat(rows.get(1).getChanges()).containsEntry("fieldNames", List.of("title"));
        assertThat(rows).allSatisfy(row -> assertThat(String.valueOf(row.getChanges())).doesNotContain("0690000000"));
    }

    @Test
    void otherTypesCannotEditTheSchedule() {
        EventSessionRequestDto create = new EventSessionRequestDto();
        create.setEventId(event.getId());
        create.setTitle("X");
        create.setStartAt(OffsetDateTime.now().plusDays(30));

        assertThatThrownBy(() -> sessionService.create(create, dj.getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_CAPABILITY_MISSING);
    }

    @Test
    void aPlannerPostsAnAnnouncement() {
        PostRequestDto dto = new PostRequestDto();
        dto.setEventId(event.getId());
        dto.setType("ANNOUNCEMENT");
        dto.setContent("Buses leave at 18:00");

        var post = postService.create(dto, planner.getId());

        assertThat(auditLogRepository.findAll()).filteredOn(log -> "ANNOUNCEMENT_CREATE".equals(log.getAction()))
                .singleElement().satisfies(log -> assertThat(log.getChanges()).containsEntry("postId", post.getId().toString()));
        assertThatThrownBy(() -> postService.create(dto, dj.getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_CAPABILITY_MISSING);
    }

    @Test
    void aPlannerReadsTheQrLinksButCannotChangeThem() {
        assertThat(qrLinkService.findByEventId(event.getId(), planner.getId())).isNotNull();
        assertThatThrownBy(() -> qrLinkService.findStatsByEventId(event.getId(), planner.getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.NOT_EVENT_HOST);
    }
}
```

Check `EventSessionRequestDto`/`PostRequestDto` setter and field names (`title`, `content`, `type`) and adjust. A schedule may need `requireAvailableForSetup(SCHEDULE)` to pass: `seedModules` enables it.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.PlannerToolsTest"`
Expected: FAIL (`NOT_EVENT_HOST` for the planner).

- [ ] **Step 3: Open the schedule**

`EventSessionService`: inject `private final VendorAuditWriter vendorAuditWriter;`.

In `create`, replace `eventAuthorizationService.requireHost(eventId, callerUserId);` with:
```java
        Optional<EventVendor> vendor =
                eventAuthorizationService.requireHostOrVendor(eventId, callerUserId, VendorCapability.SCHEDULE_EDIT);
```
and before `return eventSessionMapper.toResponseDto(saved);`:
```java
        vendor.ifPresent(v -> vendorAuditWriter.write(event, v.getMember(), "SESSION_CREATE", "EventSession",
                saved.getId(), Map.of("fieldNames", setFieldNames(dto))));
```

In `delete`, replace the `requireHost` line with:
```java
        Optional<EventVendor> vendor = eventAuthorizationService.requireHostOrVendor(event.getId(), callerUserId,
                VendorCapability.SCHEDULE_EDIT);
```
and after `eventSessionRepository.delete(session);`:
```java
        vendor.ifPresent(v -> vendorAuditWriter.write(event, v.getMember(), "SESSION_DELETE", "EventSession",
                id, Map.of()));
```

In `patch`, replace the `requireHost` line with the same `Optional<EventVendor> vendor = …(session.getEvent().getId(), …)` and, just before the method returns its DTO:
```java
        vendor.ifPresent(v -> vendorAuditWriter.write(session.getEvent(), v.getMember(), "SESSION_UPDATE",
                "EventSession", id, Map.of("fieldNames", setFieldNames(dto))));
```

Add the helper at the bottom of the class:
```java
    /** The names of the fields a request sets, for a vendor audit row: never their values. */
    private static List<String> setFieldNames(Object dto) {
        List<String> names = new ArrayList<>();
        for (java.lang.reflect.Field field : dto.getClass().getDeclaredFields()) {
            if (java.lang.reflect.Modifier.isStatic(field.getModifiers())) {
                continue;
            }
            field.setAccessible(true);
            try {
                if (field.get(dto) != null) {
                    names.add(field.getName());
                }
            } catch (IllegalAccessException ex) {
                throw new IllegalStateException(ex);
            }
        }
        Collections.sort(names);
        return names;
    }
```
`eventId` is excluded for create by removing it: `names.remove("eventId");` before sorting.

- [ ] **Step 4: Open announcements**

`PostService.create`, replace the announcement check with:
```java
        Optional<EventVendor> announcingVendor = Optional.empty();
        if (ANNOUNCEMENT_TYPE.equals(dto.getType())) {
            announcingVendor = eventAuthorizationService.requireHostOrVendor(eventId, callerUserId,
                    VendorCapability.ANNOUNCE, ErrorCode.ANNOUNCEMENT_NOT_HOST);
        }
```
Pinning stays `requireHostFor(... POST_PIN_NOT_HOST ...)`. After the post is saved (find the `postRepository.save(` in `create`; call the saved entity `saved` in your code):
```java
        announcingVendor.ifPresent(v -> vendorAuditWriter.write(saved.getEvent(), v.getMember(),
                "ANNOUNCEMENT_CREATE", "Post", saved.getId(), Map.of("postId", saved.getId().toString())));
```
Inject `VendorAuditWriter`. The lambda needs an effectively final local; assign the `Optional` to a final variable before the lambda if the compiler asks.

- [ ] **Step 5: Open QR link reading**

`QrLinkService.findByEventId`: replace `eventAuthorizationService.requireHost(eventId, callerUserId);` with
```java
        eventAuthorizationService.requireHostOrVendor(eventId, callerUserId, VendorCapability.QR_READ);
```
Stats, create, patch, revoke and delete stay host-only.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.PlannerToolsTest" --tests "*EventSession*" --tests "*Post*" --tests "*QrLink*"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): open schedule, announcements and QR reading to planners

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Planner RSVP report without contact data

**Files:**
- Modify: `MAIN/service/event/RsvpReportService.java:74-99`
- Test: `TEST/service/vendor/PlannerRsvpReportTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.dto.event.RsvpReportDto;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.event.Rsvp;
import event_social_media.model.event.RsvpReportType;
import event_social_media.model.user.User;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.event.RsvpRepository;
import event_social_media.service.event.RsvpReportService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class PlannerRsvpReportTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private RsvpReportService reportService;
    @Autowired
    private RsvpRepository rsvpRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void thePlannersReportHasNamesAndNotesButNoPhones() throws Exception {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        User planner = support.vendor(event, PartnerRole.PLANNER).getUser();
        EventMember guest = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        Rsvp rsvp = new Rsvp();
        rsvp.setEventMember(guest);
        rsvp.setPhone("+30 690 000 0000");
        rsvp.setNotes("Vegetarian");
        rsvp.setAdults(2);
        rsvpRepository.saveAndFlush(rsvp);

        RsvpReportDto plannerReport = reportService.build(event.getId(), planner.getId(), RsvpReportType.FULL_LIST, Locale.ENGLISH);
        RsvpReportDto hostReport = reportService.build(event.getId(), host.getId(), RsvpReportType.FULL_LIST, Locale.ENGLISH);

        String plannerJson = objectMapper.writeValueAsString(plannerReport);
        assertThat(plannerJson).contains("Vegetarian").doesNotContain("690").doesNotContain("@");
        assertThat(objectMapper.writeValueAsString(hostReport)).contains("690");
        assertThat(auditLogRepository.findAll()).filteredOn(log -> "RSVP_REPORT_VIEW".equals(log.getAction()))
                .singleElement().satisfies(log -> assertThat(log.getChanges())
                        .containsEntry("reportType", "FULL_LIST").containsEntry("rowCount", 1));
    }
}
```

Fill the `Rsvp` fields the entity requires (look at an RSVP test such as `RsvpReportServiceTest` for a complete fixture, and copy its builder). The `@` check guards against an email slipping in; if a guest's display name in the fixture contains `@`, drop that assertion.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.PlannerRsvpReportTest"`
Expected: FAIL (`NOT_EVENT_HOST`).

- [ ] **Step 3: Implement**

In `build`, replace `eventAuthorizationService.requireHost(eventId, callerUserId);` with:
```java
        Optional<EventVendor> vendor =
                eventAuthorizationService.requireHostOrVendor(eventId, callerUserId, VendorCapability.RSVP_REPORT);
```
Before `log.info("Built RSVP report …")`:
```java
        if (vendor.isPresent()) {
            // A planner sees names, party sizes and notes, never contact details (spec 2026-10-19).
            if (report.getGroups() != null) {
                report.getGroups().forEach(group -> group.getRows().forEach(row -> row.setPhone(null)));
            }
            vendorAuditWriter.write(event, vendor.get().getMember(), "RSVP_REPORT_VIEW", "Event", eventId,
                    Map.of("reportType", reportType.name(), "rowCount", rsvps.size()));
        }
```
If `RsvpReportRowDto` or any other nested DTO gains a contact field later, the JSON assertion above catches it. Inject `VendorAuditWriter`. The PDF export endpoint keeps calling its own host-only path; do not route it through `build`'s vendor branch.

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.PlannerRsvpReportTest" --tests "*Rsvp*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): give planners the RSVP report without phone numbers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: DJ — live requests and the played mark

**Files:**
- Create: `MAIN/dto/vendor/PlayedRequestDto.java`
- Modify: `MAIN/service/media/PlaylistSuggestionService.java:199-215` and `toLeaderboardDto`, `MAIN/dto/media/PlaylistSuggestionLeaderboardDto.java`, `MAIN/controller/media/PlaylistSuggestionController.java`
- Test: `TEST/service/vendor/DjToolsTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.dto.media.PlaylistSuggestionLeaderboardDto;
import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.PlaylistSuggestion;
import event_social_media.model.user.User;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.service.media.PlaylistSuggestionService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class DjToolsTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private PlaylistSuggestionService playlistService;
    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void theDjReadsTheBoardAndMarksPlayedWithoutReordering() {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        User dj = support.vendor(event, PartnerRole.MUSIC).getUser();
        EventMember guest = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        PlaylistSuggestion first = fixtures.newPlaylistSuggestion(event, guest);
        fixtures.newPlaylistSuggestion(event, guest);

        List<Integer> ranksBefore = playlistService.leaderboard(event.getId(), dj.getId()).stream()
                .map(PlaylistSuggestionLeaderboardDto::getRank).toList();

        playlistService.markPlayed(event.getId(), first.getId(), true, dj.getId());
        playlistService.markPlayed(event.getId(), first.getId(), true, dj.getId());

        List<PlaylistSuggestionLeaderboardDto> board = playlistService.leaderboard(event.getId(), dj.getId());
        assertThat(board).extracting(PlaylistSuggestionLeaderboardDto::getRank).isEqualTo(ranksBefore);
        assertThat(board).filteredOn(row -> row.getId().equals(first.getId()))
                .singleElement().satisfies(row -> assertThat(row.getPlayedAt()).isNotNull());

        playlistService.markPlayed(event.getId(), first.getId(), false, host.getId());
        assertThat(auditLogRepository.findAll()).extracting("action")
                .contains("SONG_PLAYED", "SONG_UNPLAYED");
    }

    @Test
    void otherTypesAndGuestsAreRefused() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        User planner = support.vendor(event, PartnerRole.PLANNER).getUser();
        EventMember guest = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        PlaylistSuggestion song = fixtures.newPlaylistSuggestion(event, guest);

        assertThatThrownBy(() -> playlistService.leaderboard(event.getId(), planner.getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_CAPABILITY_MISSING);
        assertThatThrownBy(() -> playlistService.markPlayed(event.getId(), song.getId(), true, guest.getUser().getId()))
                .extracting("errorCode").isEqualTo(ErrorCode.NOT_EVENT_HOST);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.DjToolsTest"`
Expected: FAIL to compile (`markPlayed`).

- [ ] **Step 3: Implement**

`PlaylistSuggestionLeaderboardDto`: add after `downvoteCount`:
```java
        /** When the DJ or a host marked it played. Display only; ranking ignores it. */
        private OffsetDateTime playedAt;
```
In `toLeaderboardDto`, set it: `dto.setPlayedAt(suggestion.getPlayedAt());`.

`leaderboard`: replace `eventAuthorizationService.requireHost(eventId, callerUserId);` with
```java
        eventAuthorizationService.requireHostOrVendor(eventId, callerUserId, VendorCapability.SONG_REQUESTS);
```

New method in `PlaylistSuggestionService`:
```java
    /** Host or music vendor. Idempotent; never changes the ranking. */
    @Transactional
    public PlaylistSuggestionLeaderboardDto markPlayed(UUID eventId, UUID suggestionId, boolean played, UUID callerUserId) {
        Optional<EventVendor> vendor =
                eventAuthorizationService.requireHostOrVendor(eventId, callerUserId, VendorCapability.SONG_REQUESTS);
        moduleAvailabilityService.requireReadable(eventId, ModuleKey.PLAYLIST);
        PlaylistSuggestion suggestion = playlistSuggestionRepository.findById(suggestionId)
                .filter(s -> s.getEvent().getId().equals(eventId) && s.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("PlaylistSuggestion", suggestionId));
        boolean changed = played != (suggestion.getPlayedAt() != null);
        if (changed) {
            suggestion.setPlayedAt(played ? OffsetDateTime.now() : null);
            playlistSuggestionRepository.save(suggestion);
            EventMember actor = vendor.map(EventVendor::getMember)
                    .orElseGet(() -> eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId).orElse(null));
            vendorAuditWriter.write(suggestion.getEvent(), actor, played ? "SONG_PLAYED" : "SONG_UNPLAYED",
                    "PlaylistSuggestion", suggestionId, Map.of("suggestionId", suggestionId.toString()));
        }
        return toLeaderboardDto(suggestion, talliesByEvent(eventId).getOrDefault(suggestionId, Map.of()));
    }
```
The returned DTO's `rank` is left at 0; the client refetches the board. Inject `EventMemberRepository` (if not there) and `VendorAuditWriter`.

`PlayedRequestDto`:
```java
package event_social_media.dto.vendor;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlayedRequestDto {
    @NotNull
    private Boolean played;
}
```

`PlaylistSuggestionController`, next to the leaderboard route:
```java
    @PatchMapping("/api/events/{eventId}/playlist-suggestions/{id}/played")
    @PreAuthorize("hasRole('USER')")
    public PlaylistSuggestionLeaderboardDto markPlayed(@PathVariable UUID eventId, @PathVariable UUID id,
                                                       @Valid @RequestBody PlayedRequestDto dto,
                                                       Authentication authentication) {
        return playlistSuggestionService.markPlayed(eventId, id, dto.getPlayed(), callerId(authentication));
    }
```

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.DjToolsTest" --tests "*Playlist*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): give DJs the live request list and a played mark

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Pro storage arithmetic

**Files:**
- Create: `MAIN/service/platform/StorageCharge.java`
- Test: `TEST/service/platform/StorageChargeTest.java`

- [ ] **Step 1: Write the failing unit test**

```java
package event_social_media.service.platform;

import event_social_media.model.media.MediaCollection;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StorageChargeTest {

    private static final long GB = 1024L * 1024 * 1024;

    @Test
    void proBelowTheAllowanceCostsTheEventNothing() {
        StorageCharge charge = new StorageCharge(10 * GB, 3 * GB, 5 * GB);

        assertThat(charge.chargedBytes()).isEqualTo(10 * GB);
        assertThat(charge.increaseFor(MediaCollection.PRO, GB)).isZero();
    }

    @Test
    void exactlyAtTheAllowanceStillCostsNothing() {
        StorageCharge charge = new StorageCharge(0, 4 * GB, 5 * GB);

        assertThat(charge.increaseFor(MediaCollection.PRO, GB)).isZero();
        assertThat(new StorageCharge(0, 5 * GB, 5 * GB).chargedBytes()).isZero();
    }

    @Test
    void onlyTheOverflowJoinsTheEventPool() {
        StorageCharge charge = new StorageCharge(10 * GB, 4 * GB, 5 * GB);

        assertThat(charge.increaseFor(MediaCollection.PRO, 3 * GB)).isEqualTo(2 * GB);
        assertThat(new StorageCharge(10 * GB, 7 * GB, 5 * GB).chargedBytes()).isEqualTo(12 * GB);
    }

    @Test
    void guestsNeverUseTheAllowance() {
        StorageCharge charge = new StorageCharge(10 * GB, 0, 5 * GB);

        assertThat(charge.increaseFor(MediaCollection.GUEST, GB)).isEqualTo(GB);
    }

    @Test
    void noAllowanceMeansProCountsInFull() {
        StorageCharge charge = new StorageCharge(GB, 2 * GB, 0);

        assertThat(charge.chargedBytes()).isEqualTo(3 * GB);
        assertThat(charge.proOverflowBytes()).isEqualTo(2 * GB);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.platform.StorageChargeTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write the record**

```java
package event_social_media.service.platform;

import event_social_media.model.media.MediaCollection;

/**
 * An event's stored bytes as its storage limit sees them (spec 2026-10-19, "Pro storage"): guest
 * bytes, plus only the part of the Pro album above the plan's Pro allowance.
 */
public record StorageCharge(long guestBytes, long proUsedBytes, long proAllowanceBytes) {

    public long proOverflowBytes() {
        return Math.max(0, proUsedBytes - proAllowanceBytes);
    }

    public long chargedBytes() {
        return guestBytes + proOverflowBytes();
    }

    /** How much {@link #chargedBytes()} grows when a file of {@code incomingBytes} joins {@code collection}. */
    public long increaseFor(MediaCollection collection, long incomingBytes) {
        if (collection == MediaCollection.GUEST) {
            return incomingBytes;
        }
        return Math.max(0, proUsedBytes + incomingBytes - proAllowanceBytes) - proOverflowBytes();
    }
}
```

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.platform.StorageChargeTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/platform/StorageCharge.java src/test/java/event_social_media/service/platform/StorageChargeTest.java
git commit -m "feat(vendors): add the Pro storage arithmetic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Pro storage in usage, quota and withdrawal

**Files:**
- Modify: `MAIN/repository/media/MediaRepository.java` (storage accounting section, ~L170-205)
- Modify: `MAIN/service/platform/UsageService.java`, `EventUsage.java`, `QuotaGuard.java:60-112`
- Modify: `MAIN/dto/platform/EventUsageResponseDto.java`, `MAIN/service/billing/withdrawal/WithdrawalService.java:787`
- Test: `TEST/service/platform/ProStorageQuotaTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.platform;

import event_social_media.exception.QuotaExceededException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ProStorageQuotaTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private UsageService usageService;
    @Autowired
    private QuotaGuard quotaGuard;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private EventRepository eventRepository;

    private Event event;

    @BeforeEach
    void setUp() {
        event = support.vendorEventHostedBy(fixtures.newUser());
        event.getPlanTier().setStorageBytes(1_000L);
        event.setExtraStorageBytes(0L);
        eventRepository.saveAndFlush(event);
        support.setConfig(event, VendorsConfig.PRO_STORAGE_BYTES, 500L);
    }

    private Media media(long bytes, MediaCollection collection) {
        Media media = fixtures.newMedia(event, bytes);
        media.setCollection(collection);
        return mediaRepository.saveAndFlush(media);
    }

    @Test
    void usageCountsGuestsAndOnlyTheProOverflow() {
        media(600, MediaCollection.GUEST);
        media(700, MediaCollection.PRO);

        EventUsage usage = usageService.forEvent(event.getId());
        assertThat(usage.storageBytes()).isEqualTo(800);
        assertThat(usage.proStorageBytes()).isEqualTo(500);
        assertThat(usage.proUsedBytes()).isEqualTo(700);
        assertThat(usageService.forEvents(List.of(event))).singleElement()
                .extracting(EventUsage::storageBytes).isEqualTo(800L);
    }

    @Test
    void aFullEventRefusesGuestsButNotProWithinTheAllowance() {
        media(1_000, MediaCollection.GUEST);

        assertThatThrownBy(() -> quotaGuard.requireStorageHeadroom(event.getId(), 1, MediaCollection.GUEST))
                .isInstanceOf(QuotaExceededException.class);
        assertThatCode(() -> quotaGuard.requireStorageHeadroom(event.getId(), 500, MediaCollection.PRO))
                .doesNotThrowAnyException();
        media(500, MediaCollection.PRO);
        assertThatThrownBy(() -> quotaGuard.requireStorageHeadroom(event.getId(), 1, MediaCollection.PRO))
                .isInstanceOf(QuotaExceededException.class);
    }

    @Test
    void proOverflowFitsInWhatTheEventHasLeft() {
        media(700, MediaCollection.GUEST);
        media(500, MediaCollection.PRO);

        assertThatCode(() -> quotaGuard.requireStorageHeadroom(event.getId(), 300, MediaCollection.PRO))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> quotaGuard.requireStorageHeadroom(event.getId(), 301, MediaCollection.PRO))
                .isInstanceOf(QuotaExceededException.class);
    }

    @Test
    void withoutTheModuleProCountsInFullAndNothingChangesForGuests() {
        Event plain = fixtures.newEventHostedBy(fixtures.newUser());
        plain.getPlanTier().setStorageBytes(1_000L);
        eventRepository.saveAndFlush(plain);
        fixtures.newMedia(plain, 900);

        assertThatThrownBy(() -> quotaGuard.requireStorageHeadroom(plain.getId(), 101, MediaCollection.GUEST))
                .isInstanceOf(QuotaExceededException.class);
        assertThatCode(() -> quotaGuard.requireStorageHeadroom(plain.getId(), 100))
                .doesNotThrowAnyException();
    }

    @Test
    void deletingProLowersTheOverflowFirst() {
        media(400, MediaCollection.GUEST);
        Media pro = media(700, MediaCollection.PRO);
        assertThat(usageService.forEvent(event.getId()).storageBytes()).isEqualTo(600);

        pro.setDeletedAt(java.time.OffsetDateTime.now());
        mediaRepository.saveAndFlush(pro);

        assertThat(usageService.forEvent(event.getId()).storageBytes()).isEqualTo(400);
    }
}
```

`setStorageBytes` on a shared plan row mutates the H2 plan for this transaction only; it is rolled back.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.platform.ProStorageQuotaTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Repository sums**

`MediaRepository` already has `sumActiveStorageBytesByEventAndCollection` (Task 15). Add, next to it:
```java
    /** Pro bytes of every event that holds any, for the quota sweep. */
    @Query("select m.event.id as eventId, "
            + "coalesce(sum(m.fileSize), 0) + coalesce(sum(m.originalFileSize), 0) as bytes from Media m "
            + "where m.deletedAt is null and m.collection = event_social_media.model.media.MediaCollection.PRO "
            + "group by m.event.id")
    List<EventStorageRow> sumActiveProStorageBytesGroupedByEvent();
```

- [ ] **Step 4: `EventUsage` and the DTO**

`EventUsage`: add two components at the end and keep `storageBytes` meaning "charged bytes":
```java
        long storageBytes,
        long memberCount,
        long proStorageBytes,
        long proUsedBytes
```
Update the 2 constructions in `UsageService` (below) and the 2 test files that build `EventUsage` directly (`grep -rln "new EventUsage(" src/test`), passing `0L, 0L`.

`EventUsageResponseDto`: add
```java
    /** The plan's Pro album allowance (vendors module). 0 without the module. */
    private long proStorageBytes;

    /** Bytes in the Pro album; only what exceeds {@link #proStorageBytes} is in {@link #storageBytes}. */
    private long proUsedBytes;
```
MapStruct maps them by name. Run `./gradlew compileJava` and fix any "unmapped target" warning the build treats as error.

- [ ] **Step 5: `UsageService`**

Inject `private final VendorsConfigReader vendorsConfigReader;` (if it creates a cycle, use `@Lazy` and note it). Add:
```java
    /** The event's guest and Pro bytes against its Pro allowance. Every storage limit check reads this. */
    @Transactional(readOnly = true)
    public StorageCharge storageCharge(Event event) {
        long guest = mediaRepository.sumActiveStorageBytesByEventAndCollection(event.getId(), MediaCollection.GUEST);
        long pro = mediaRepository.sumActiveStorageBytesByEventAndCollection(event.getId(), MediaCollection.PRO);
        return new StorageCharge(guest, pro, pro == 0 ? 0 : vendorsConfigReader.proAllowanceBytes(event));
    }
```

`limitedStorageForEvent`: return the charge too.
```java
        StorageCharge charge = storageCharge(event);
        return Optional.of(new StorageUsage(plan.getCode(), charge.chargedBytes(), limit, charge));
```
```java
    public record StorageUsage(String planCode, long storageBytes, long storageLimitBytes, StorageCharge charge) {
    }
```

`forEvent`:
```java
        StorageCharge charge = storageCharge(event);
        return new EventUsage(
                event.getId(),
                plan.getCode(),
                plan.getStorageBytes(),
                extraStorageBytes(event),
                EventUsage.memberLimit(plan.getMaxMembers(), event.getExtraMemberSlots()),
                charge.chargedBytes(),
                eventMemberRepository.countSeatedMembersByEvent(eventId),
                vendorsConfigReader.proAllowanceBytes(event),
                charge.proUsedBytes());
```

`forEvents`: keep the all-collections sum, subtract each event's Pro bytes, then add the overflow:
```java
        Map<UUID, Long> proByEvent = mediaRepository.sumActiveProStorageBytesGroupedByEvent().stream()
                .collect(Collectors.toMap(MediaRepository.EventStorageRow::getEventId,
                        MediaRepository.EventStorageRow::getBytes));
```
and inside the `map`:
```java
                    long all = storageByEvent.getOrDefault(event.getId(), 0L);
                    long pro = proByEvent.getOrDefault(event.getId(), 0L);
                    // Only events holding Pro media pay for the config lookup.
                    long allowance = pro == 0 ? 0 : vendorsConfigReader.proAllowanceBytes(event);
                    StorageCharge charge = new StorageCharge(all - pro, pro, allowance);
                    return new EventUsage(
                            event.getId(),
                            plan.getCode(),
                            plan.getStorageBytes(),
                            extraStorageBytes(event),
                            EventUsage.memberLimit(plan.getMaxMembers(), event.getExtraMemberSlots()),
                            charge.chargedBytes(),
                            membersByEvent.getOrDefault(event.getId(), 0L),
                            allowance,
                            pro);
```
`forEvent` reports `proStorageBytes` from the config even with no Pro media yet (the meter shows the full allowance); `forEvents` (sweep only) may report 0 there, which the sweep never reads.

- [ ] **Step 6: `QuotaGuard`**

Keep the two existing signatures (they mean "a guest file") and add collection-aware overloads:
```java
    @Transactional
    public void requireStorageHeadroom(UUID eventId, long incomingBytes) {
        requireStorageHeadroom(eventId, incomingBytes, MediaCollection.GUEST);
    }

    /** {@link #requireStorageHeadroom(UUID, long)} for a file joining {@code collection}. */
    @Transactional
    public void requireStorageHeadroom(UUID eventId, long incomingBytes, MediaCollection collection) {
        if (incomingBytes > 0) {
            eventRepository.lockById(eventId)
                    .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        }
        rejectIfOverStorageLimit(eventId, incomingBytes, collection);
    }

    @Transactional(readOnly = true)
    public void precheckStorageHeadroom(UUID eventId, long incomingBytes) {
        precheckStorageHeadroom(eventId, incomingBytes, MediaCollection.GUEST);
    }

    @Transactional(readOnly = true)
    public void precheckStorageHeadroom(UUID eventId, long incomingBytes, MediaCollection collection) {
        rejectIfOverStorageLimit(eventId, incomingBytes, collection);
    }
```
Move the existing comments onto the new bodies. In `rejectIfOverStorageLimit(UUID eventId, long incomingBytes, MediaCollection collection)`:
```java
        UsageService.StorageUsage usage = limited.get();
        long limit = usage.storageLimitBytes();
        long increase = usage.charge().increaseFor(collection, incomingBytes);
        // A Pro file inside the Pro allowance adds nothing to the event pool, so a full event takes it.
        if (collection == MediaCollection.PRO && increase == 0) {
            return;
        }
        long projected = usage.storageBytes() + increase;
        if (projected > limit) {
            // unchanged logging and exception, with details.put("incomingBytes", incomingBytes)
        }
```
For a guest file `increase == incomingBytes`, so the rule is unchanged.

- [ ] **Step 7: Withdrawal preview**

`WithdrawalService` (~L787): replace `long usage = mediaRepository.sumActiveStorageBytesByEvent(event.getId());` with
```java
        long usage = usageService.storageCharge(event).chargedBytes();
```
injecting `UsageService` if it is not there yet.

`PlatformMetricsService` and `MediaArchiveService` keep the raw sums: they report bytes on disk, not the limit view.

- [ ] **Step 8: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.platform.ProStorageQuotaTest" --tests "*Usage*" --tests "*Quota*" --tests "*StorageThreshold*" --tests "*Withdrawal*"`
Expected: PASS. A test that asserted `storageBytes` of an event with no Pro media is unaffected; update only tests that break because of the new record components.

- [ ] **Step 9: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): count Pro media against its own allowance first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Pro album upload, list, credit, delete

**Files:**
- Modify: `MAIN/service/media/MediaUploadContext.java`, `MediaService.java` (`requireUploadable`, `findByEventId`, `delete`, DTO mapping), `MediaFileUploadTransaction.java` (`upload`, `persist`)
- Modify: `MAIN/controller/media/MediaController.java:56-63`, `MAIN/repository/media/MediaRepository.java`, `MAIN/dto/media/MediaResponseDto.java`
- Test: `TEST/controller/vendor/ProAlbumControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProAlbumControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

    private User host;
    private User guest;
    private Event event;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
    }

    /** A real 4×4 JPEG: ImageNormalizer decodes uploads, so magic bytes alone are refused. */
    private static MockMultipartFile jpeg() throws Exception {
        java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(4, 4, java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, "jpg", out);
        return new MockMultipartFile("file", "a.jpg", "image/jpeg", out.toByteArray());
    }

    @Test
    void onlyPhotoAndVideoVendorsUploadPro() throws Exception {
        User dj = support.vendor(event, PartnerRole.MUSIC).getUser();

        for (User refused : new User[]{guest, host, dj}) {
            mockMvc.perform(as(refused, multipart("/api/events/{e}/media", event.getId()).file(jpeg()).param("context", "PRO")))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(as(photographer.getUser(), multipart("/api/events/{e}/media", event.getId())
                        .file(jpeg()).param("context", "PRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.collection").value("PRO"))
                .andExpect(jsonPath("$.proCredit.businessName").value("Studio PHOTOGRAPHER"));

        assertThat(mediaRepository.findAll()).filteredOn(m -> m.getCollection() == MediaCollection.PRO)
                .singleElement().satisfies(m -> assertThat(m.getEventVendor().getId()).isEqualTo(photographer.getId()));
        assertThat(auditLogRepository.findAll()).extracting("action").contains("PRO_MEDIA_UPLOAD");
    }

    @Test
    void theGalleryListsTheCollectionAskedFor() throws Exception {
        Media guestPhoto = fixtures.newMedia(event, 10);
        Media pro = fixtures.newMedia(event, 10);
        pro.setCollection(MediaCollection.PRO);
        pro.setEventVendor(photographer);
        mediaRepository.saveAndFlush(pro);

        mockMvc.perform(as(guest, get("/api/events/{e}/media", event.getId())))
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(guestPhoto.getId().toString()));
        mockMvc.perform(as(guest, get("/api/events/{e}/media", event.getId()).param("collection", "PRO")))
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].proCredit.vendorType").value("PHOTOGRAPHER"));
    }

    @Test
    void aHostDeletesProItemsAndItIsAudited() throws Exception {
        Media pro = fixtures.newMedia(event, 10);
        pro.setCollection(MediaCollection.PRO);
        pro.setEventVendor(photographer);
        pro.setUploaderMember(photographer.getMember());
        mediaRepository.saveAndFlush(pro);

        mockMvc.perform(as(host, delete("/api/medias/{id}", pro.getId()))).andExpect(status().is2xxSuccessful());

        assertThat(auditLogRepository.findAll()).filteredOn(log -> "PRO_MEDIA_DELETE".equals(log.getAction()))
                .singleElement().satisfies(log -> assertThat(log.getChanges()).containsEntry("bytes", 10L));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.ProAlbumControllerTest"`
Expected: FAIL (400 on `context=PRO`).

- [ ] **Step 3: Add the upload context**

`MediaUploadContext`: add `PRO(ModuleKey.VENDORS),` after `POST(ModuleKey.POSTS),` and extend the javadoc: "{@link #PRO} is a vendor's Pro album: photographer and videographer vendors only, with its own storage allowance."

- [ ] **Step 4: Gate Pro uploads**

`MediaService.requireUploadable`, add a branch before `if (context == MediaUploadContext.COVER)`:
```java
        if (context == MediaUploadContext.PRO) {
            // Vendors only: a host or guest sending PRO is refused, never silently stored as a guest file.
            eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.PRO_ALBUM);
        }
```
The existing `else` branch then runs `moduleAvailabilityService.requireAvailable(eventId, context.module())`, which is `VENDORS` for `PRO`.

- [ ] **Step 5: Store the collection and charge the right pool**

`MediaFileUploadTransaction.upload`: the cheap checks use the collection:
```java
        MediaCollection collection = context == MediaUploadContext.PRO ? MediaCollection.PRO : MediaCollection.GUEST;
        if (detected.kind() == MediaKind.IMAGE) {
            quotaGuard.requireStorageHeadroom(eventId, 0, collection);
        } else {
            quotaGuard.precheckStorageHeadroom(eventId, file.getSize(), collection);
        }
```
After `media.getMetadata().put("uploadContext", context.name());`:
```java
        media.setCollection(collection);
```
`persist`: replace `quotaGuard.requireStorageHeadroom(eventId, chargedBytes);` with
```java
            quotaGuard.requireStorageHeadroom(eventId, chargedBytes, media.getCollection());
```
and after the uploader is set:
```java
            if (media.getCollection() == MediaCollection.PRO && uploaderMemberId != null) {
                media.setEventVendor(eventVendorRepository.findByMember_IdAndRemovedAtIsNull(uploaderMemberId)
                        .orElseThrow());
            }
```
and after `mediaRepository.save(media)`:
```java
            if (saved.getCollection() == MediaCollection.PRO) {
                vendorAuditWriter.write(saved.getEvent(), saved.getUploaderMember(), "PRO_MEDIA_UPLOAD", "Media",
                        saved.getId(), Map.of("bytes", chargedBytes));
            }
```
Inject `EventVendorRepository` and `VendorAuditWriter`.

Videos change their stored size when processing finishes. Find where the processing job updates `fileSize` (`grep -rn "setFileSize" src/main/java/event_social_media/service/media`) and, if it calls `quotaGuard.requireStorageHeadroom`, pass `media.getCollection()` there too.

- [ ] **Step 6: List by collection**

`MediaRepository`:
```java
    Page<Media> findByEvent_IdAndCollectionAndDeletedAtIsNull(UUID eventId, MediaCollection collection, Pageable pageable);
```
`MediaService.findByEventId(UUID eventId, MediaCollection collection, Pageable pageable, UUID callerUserId)`: use it; for `PRO`, also `moduleAvailabilityService.requireReadable(eventId, ModuleKey.VENDORS)` after the gallery check. Update other callers of `findByEventId` to pass `MediaCollection.GUEST`.

`MediaController.findByEvent`: add `@RequestParam(defaultValue = "GUEST") MediaCollection collection` and pass it.

- [ ] **Step 7: Credit in the DTO**

`MediaResponseDto`: add
```java
        private MediaCollection collection;

        /** Set on Pro items: whose work it is, from the vendor profile. */
        private ProCredit proCredit;

        @Data
        public static class ProCredit {
                private String businessName;
                private PartnerRole vendorType;
        }
```
In `MediaService.toResponseDtoWithUrl` (and the moderation variant), after mapping:
```java
        dto.setCollection(media.getCollection());
        if (media.getCollection() == MediaCollection.PRO && media.getEventVendor() != null) {
            MediaResponseDto.ProCredit credit = new MediaResponseDto.ProCredit();
            credit.setVendorType(media.getEventVendor().getVendorType());
            if (media.getEventVendor().getUser() != null) {
                vendorProfileRepository.findById(media.getEventVendor().getUser().getId())
                        .ifPresent(profile -> credit.setBusinessName(profile.getBusinessName()));
            }
            dto.setProCredit(credit);
        }
```
For list pages, load profiles once per page instead of per item: collect the vendor user ids of the page, `findByUserIdIn`, and look them up from a map (do this in `toResponseDtosWithUrl`).

- [ ] **Step 8: Audit Pro deletes**

In `MediaService.delete` and `removeAsModerator`, before the soft delete, when `media.getCollection() == MediaCollection.PRO`:
```java
            vendorAuditWriter.write(media.getEvent(),
                    callerUserId == null ? null
                            : eventMemberRepository.findByEvent_IdAndUser_Id(media.getEvent().getId(), callerUserId).orElse(null),
                    "PRO_MEDIA_DELETE", "Media", media.getId(),
                    Map.of("bytes", media.getFileSize() + (media.getOriginalFileSize() == null ? 0 : media.getOriginalFileSize())));
```
(`removeAsModerator` has no caller: pass `null`.)

- [ ] **Step 9: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.ProAlbumControllerTest" --tests "*Media*" --tests "*Gallery*" --tests "*Upload*"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): add the Pro album for photographers and videographers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Storage trim keeps Pro items inside the allowance

**Files:**
- Modify: `MAIN/service/billing/StorageTrimService.java` (`trim`), `MAIN/repository/media/MediaRepository.java`
- Test: `TEST/service/billing/StorageTrimProTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.billing;

import event_social_media.model.event.Event;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class StorageTrimProTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private StorageTrimService trimService;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private EventRepository eventRepository;

    @Test
    void trimSkipsProInsideTheAllowanceAndTakesOverflowNewestFirst() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        support.setConfig(event, VendorsConfig.PRO_STORAGE_BYTES, 500L);
        Media oldGuest = media(event, 400, MediaCollection.GUEST);
        Thread.sleep(5);
        Media proA = media(event, 500, MediaCollection.PRO);
        Thread.sleep(5);
        Media proB = media(event, 300, MediaCollection.PRO);
        Thread.sleep(5);
        Media newGuest = media(event, 200, MediaCollection.GUEST);
        // charged = 600 guest + 300 overflow = 900; limit 500 → 400 over
        event.getPlanTier().setStorageBytes(500L);
        event.setExtraStorageBytes(0L);
        event.setStorageTrimDueAt(OffsetDateTime.now().minusMinutes(1));
        eventRepository.saveAndFlush(event);

        assertThat(trimService.process(event.getId())).isEqualTo(StorageTrimService.Outcome.TRIMMED);

        assertThat(deleted(newGuest)).isTrue();   // 200 freed
        assertThat(deleted(proB)).isTrue();       // 300 overflow freed → 500 ≥ 400
        assertThat(deleted(proA)).isFalse();      // inside the allowance
        assertThat(deleted(oldGuest)).isFalse();
    }

    private Media media(Event event, long bytes, MediaCollection collection) {
        Media media = fixtures.newMedia(event, bytes);
        media.setCollection(collection);
        return mediaRepository.saveAndFlush(media);
    }

    private boolean deleted(Media media) {
        return mediaRepository.findById(media.getId()).orElseThrow().getDeletedAt() != null;
    }
}
```

Only `proB`'s overflow share counts: the newest Pro item is the overflow (the allowance is filled oldest first). When the walk reaches `proB`, the overflow left is 300, so freeing it frees 300.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.billing.StorageTrimProTest"`
Expected: FAIL (`proA` deleted, or wrong outcome).

- [ ] **Step 3: Add the lightweight row query**

`MediaRepository`:
```java
    /** Live media of the event, newest first, as (id, collection, bytes): the trim walks this. */
    @Query("select m.id as id, m.collection as collection, "
            + "m.fileSize + coalesce(m.originalFileSize, 0) as bytes from Media m "
            + "where m.event.id = :eventId and m.deletedAt is null order by m.createdAt desc, m.id desc")
    List<TrimRow> findTrimRowsNewestFirst(@Param("eventId") UUID eventId);

    interface TrimRow {
        UUID getId();
        MediaCollection getCollection();
        long getBytes();
    }
```

- [ ] **Step 4: Rewrite `trim`**

```java
    private void trim(Event event, long overBytes, OffsetDateTime now) {
        StorageCharge charge = usageService.storageCharge(event);
        long proOverflow = charge.proOverflowBytes();
        long freed = 0;
        List<UUID> chosen = new ArrayList<>();
        // Newest first. A guest item frees its size; a Pro item frees only the overflow it carries,
        // and items inside the Pro allowance are never taken (spec 2026-10-19).
        for (MediaRepository.TrimRow row : mediaRepository.findTrimRowsNewestFirst(event.getId())) {
            if (freed >= overBytes) {
                break;
            }
            if (row.getCollection() == MediaCollection.PRO) {
                if (proOverflow <= 0) {
                    continue;
                }
                long share = Math.min(row.getBytes(), proOverflow);
                proOverflow -= share;
                freed += share;
            } else {
                freed += row.getBytes();
            }
            chosen.add(row.getId());
        }
        for (int from = 0; from < chosen.size(); from += TRIM_BATCH) {
            List<Media> batch = mediaRepository.findAllById(chosen.subList(from, Math.min(chosen.size(), from + TRIM_BATCH)));
            batch.forEach(media -> media.setDeletedAt(now));
            mediaRepository.saveAllAndFlush(batch);
        }
        if (!chosen.isEmpty()) {
            memberArchiveMarker.mediaRemoved(event.getId());
        }
        log.info("Storage trim on event {}: {} media soft-deleted newest first, {} bytes freed ({} were over the limit)",
                event.getId(), chosen.size(), freed, overBytes);
    }
```
`process`, `scheduleIfOverLimit` and `clearIfWithinLimit` already read `usageService.forEvent(...).storageBytes()`, which is now the charged figure, so they need no change. `StorageThresholdRule` reads `EventUsage` from the sweep, also charged now.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.billing.StorageTrimProTest" --tests "*StorageTrim*" --tests "*StorageThreshold*"`
Expected: PASS, including the unchanged `StorageTrimServiceTest` and `StorageTrimNotifierTest`.

- [ ] **Step 6: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): never trim Pro media inside the Pro allowance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Partner auto-offer email

**Files:**
- Create: `MAIN/service/vendor/PartnerVendorOfferService.java`
- Modify: `MAIN/service/vendor/VendorEventListener.java`, `MAIN/service/mail/TransactionalMailService.java`
- Modify: `messages.properties`, `messages_el.properties`
- Test: `TEST/service/vendor/PartnerVendorOfferTest.java`

- [ ] **Step 1: Write the failing test**

Look at `CheckoutCollaborationTest` for how it creates a live collaboration redemption on an event and how it captures sent mail (a `@MockitoBean`/`@MockBean` mail sender, or a recording `MailSender` bean in tests). Use the same two mechanisms here. The test:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.vendor.PartnerVendorEmailRepository;
import event_social_media.service.mail.TransactionalMailService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@Transactional
class PartnerVendorOfferTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private PartnerVendorOfferService offerService;
    @Autowired
    private VendorLinkService linkService;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private PartnerVendorEmailRepository sentRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @MockitoSpyBean
    private TransactionalMailService mailService;

    private Event eventWithLivePartnerCode(Collaborator partner) {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        // Same helper CheckoutCollaborationTest uses to put a PENDING/ACTIVE redemption on the event.
        redemptions.live(event, partner);
        linkService.ensureLinks(event.getId());
        return event;
    }

    private Collaborator partner(PartnerRole role) {
        Collaborator partner = fixtures.newBrandedCollaborator();
        partner.setBrandingRole(role);
        partner.setContactEmail("studio@example.com");
        return collaboratorRepository.saveAndFlush(partner);
    }

    @Test
    void sendsOnceWithThatTypesLink() {
        Collaborator partner = partner(PartnerRole.PHOTOGRAPHER);
        Event event = eventWithLivePartnerCode(partner);

        offerService.sendIfDue(event.getId());
        offerService.sendIfDue(event.getId());

        verify(mailService, times(1)).sendPartnerVendorOffer(eq("studio@example.com"), any(), eq(event.getTitle()),
                any(), any(), eq(PartnerRole.PHOTOGRAPHER), eq(support.link(event, PartnerRole.PHOTOGRAPHER).getInviteToken()),
                any(Locale.class));
        assertThat(sentRepository.existsByEventIdAndCollaboratorId(event.getId(), partner.getId())).isTrue();
        assertThat(auditLogRepository.findAll()).filteredOn(log -> "PARTNER_VENDOR_EMAIL_SENT".equals(log.getAction()))
                .hasSize(1);
    }

    @Test
    void noEmailWithoutARoleOrForADisallowedTypeOrWithoutTheModule() {
        Event noRole = eventWithLivePartnerCode(partner(null));
        Event disallowed = eventWithLivePartnerCode(partner(PartnerRole.CATERING));
        support.setConfig(disallowed, VendorsConfig.ALLOWED_TYPES, List.of("PHOTOGRAPHER"));
        Event plain = fixtures.newEventHostedBy(fixtures.newUser());
        redemptions.live(plain, partner(PartnerRole.PHOTOGRAPHER));

        offerService.sendIfDue(noRole.getId());
        offerService.sendIfDue(disallowed.getId());
        offerService.sendIfDue(plain.getId());

        verify(mailService, never()).sendPartnerVendorOffer(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aVoidedRedemptionSendsNothing() {
        Collaborator partner = partner(PartnerRole.PHOTOGRAPHER);
        Event event = eventWithLivePartnerCode(partner);
        redemptions.voidFor(event);

        offerService.sendIfDue(event.getId());

        verify(mailService, never()).sendPartnerVendorOffer(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void theLanguageFollowsThePrimaryHost() {
        User host = fixtures.newUser();
        host.setLocale("el");
        Collaborator partner = partner(PartnerRole.PHOTOGRAPHER);
        Event event = support.vendorEventHostedBy(host);
        redemptions.live(event, partner);
        linkService.ensureLinks(event.getId());

        offerService.sendIfDue(event.getId());

        verify(mailService).sendPartnerVendorOffer(any(), any(), any(), any(), any(), any(), any(),
                eq(Locale.forLanguageTag("el")));
    }
}
```

Add `@Autowired private PartnerTestRedemptions redemptions;` to the test, and create the helper `TEST/service/vendor/PartnerTestRedemptions.java`. It redeems a real partner code the way `CheckoutCollaborationTest` does (`DiscountRedemptionService#redeem` on a draft leaves a `PENDING` redemption, which `findLiveByEventId` counts as live), then puts the event back to `ACTIVE`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.CollaborationCode;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.discount.DiscountRedemption;
import event_social_media.model.discount.RedemptionStatus;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventStatus;
import event_social_media.model.user.User;
import event_social_media.repository.discount.DiscountRedemptionRepository;
import event_social_media.repository.event.EventHostRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.service.discount.DiscountRedemptionService;
import event_social_media.support.TestFixtures;
import org.springframework.stereotype.Component;

/** A live partner redemption on an event, for the partner auto-offer tests. */
@Component
public class PartnerTestRedemptions {

    private final TestFixtures fixtures;
    private final DiscountRedemptionService discountRedemptionService;
    private final DiscountRedemptionRepository discountRedemptionRepository;
    private final EventRepository eventRepository;
    private final EventHostRepository eventHostRepository;

    public PartnerTestRedemptions(TestFixtures fixtures, DiscountRedemptionService discountRedemptionService,
                                  DiscountRedemptionRepository discountRedemptionRepository,
                                  EventRepository eventRepository, EventHostRepository eventHostRepository) {
        this.fixtures = fixtures;
        this.discountRedemptionService = discountRedemptionService;
        this.discountRedemptionRepository = discountRedemptionRepository;
        this.eventRepository = eventRepository;
        this.eventHostRepository = eventHostRepository;
    }

    public void live(Event event, Collaborator partner) {
        CollaborationCode code = fixtures.newCode(partner, (short) 10, (short) 15);
        User host = eventHostRepository.findByEvent_Id(event.getId()).getFirst().getMember().getUser();
        event.setStatus(EventStatus.DRAFT);
        eventRepository.saveAndFlush(event);
        discountRedemptionService.redeem(event, code.getDiscountCode().getCode(), host);
        event.setStatus(EventStatus.ACTIVE);
        eventRepository.saveAndFlush(event);
    }

    public void voidFor(Event event) {
        DiscountRedemption redemption = discountRedemptionService.liveFor(event.getId()).orElseThrow();
        redemption.setStatus(RedemptionStatus.VOID);
        discountRedemptionRepository.saveAndFlush(redemption);
    }
}
```

If `redeem` refuses because the draft has no dates or price, apply the same `dated(...)` setup `CheckoutCollaborationTest` uses before redeeming. Fix the repository package names from that test's imports. Save the host's locale through `userRepository` if `newUser()` returns a detached entity.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.PartnerVendorOfferTest"`
Expected: FAIL to compile.

- [ ] **Step 3: The email**

`TransactionalMailService`, next to `sendCoHostInvitation`:
```java
    /**
     * Tells a partner whose code the couple used that they can join the event as its vendor (spec
     * 2026-10-19, "Partner auto-offer"). Event title and date only: no guest data.
     */
    public void sendPartnerVendorOffer(String toAddress, String partnerName, String eventTitle,
                                       OffsetDateTime startAt, String timezone, PartnerRole vendorType,
                                       UUID inviteToken, Locale locale) {
        Map<String, Object> args = greetingArgs(partnerName, locale);
        args.put("eventTitle", eventTitle);
        args.put("vendorType", messageRenderer.plain("vendor.type." + vendorType.name(), locale));
        deliver(layout.compose(
                toAddress,
                messageRenderer.render("email.partner_vendor_offer.subject", args, locale),
                messageRenderer.render("email.partner_vendor_offer.subject", args, locale),
                messageRenderer.render("email.partner_vendor_offer.body", args, locale),
                eventInfoLines(startAt, timezone, null, null, null, locale),
                messageRenderer.plain("email.partner_vendor_offer.cta", locale),
                absolute(INVITE_PATH + inviteToken)),
                "partner vendor offer");
    }
```

`messages.properties`:
```properties
email.partner_vendor_offer.subject=Join {eventTitle} on StoryWall
email.partner_vendor_offer.body={greeting}the couple used your StoryWall code for {eventTitle}. Join the event as their {vendorType} to get your tools and appear in the event's vendor list.
email.partner_vendor_offer.cta=Join the event
```
`messages_el.properties`:
```properties
email.partner_vendor_offer.subject=Μπείτε στο {eventTitle} στο StoryWall
email.partner_vendor_offer.body={greeting}το ζευγάρι χρησιμοποίησε τον κωδικό σας StoryWall για το {eventTitle}. Μπείτε στην εκδήλωση ως {vendorType} για να έχετε τα εργαλεία σας και να εμφανίζεστε στη λίστα επαγγελματιών της εκδήλωσης.
email.partner_vendor_offer.cta=Είσοδος στην εκδήλωση
```
If `eventInfoLines` does not accept nulls for location, pass the event's location fields instead. Show this copy to the user before release.

- [ ] **Step 4: The service**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.CollaborationRedemption;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventHost;
import event_social_media.model.event.EventInvitation;
import event_social_media.model.user.User;
import event_social_media.model.vendor.PartnerVendorEmail;
import event_social_media.repository.collaboration.CollaborationRedemptionRepository;
import event_social_media.repository.event.EventHostRepository;
import event_social_media.repository.event.EventInvitationRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.vendor.PartnerVendorEmailRepository;
import event_social_media.service.mail.TransactionalMailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Emails the partner behind the event's code its vendor link, once (spec 2026-10-19, "Partner auto-offer"). */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerVendorOfferService {

    private final EventRepository eventRepository;
    private final EventHostRepository eventHostRepository;
    private final EventInvitationRepository invitationRepository;
    private final CollaborationRedemptionRepository redemptionRepository;
    private final PartnerVendorEmailRepository sentRepository;
    private final VendorsConfigReader vendorsConfigReader;
    private final TransactionalMailService mailService;
    private final VendorAuditWriter auditWriter;

    @Transactional
    public void sendIfDue(UUID eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event == null) {
            return;
        }
        Optional<CollaborationRedemption> redemption = redemptionRepository.findLiveByEventId(eventId);
        if (redemption.isEmpty()) {
            return;
        }
        Collaborator partner = redemption.get().getCollaborator();
        PartnerRole type = partner.getBrandingRole();
        Optional<VendorsConfig> config = vendorsConfigReader.forEvent(event);
        if (type == null || config.isEmpty() || !config.get().allows(type) || partner.getContactEmail() == null
                || sentRepository.existsByEventIdAndCollaboratorId(eventId, partner.getId())) {
            log.info("No partner vendor offer for event {} (type {}, module {})", eventId, type, config.isPresent());
            return;
        }
        Optional<EventInvitation> link = invitationRepository.findByEvent_IdAndVendorType(eventId, type);
        if (link.isEmpty()) {
            log.warn("No {} vendor link on event {} for the partner offer", type, eventId);
            return;
        }
        PartnerVendorEmail sent = new PartnerVendorEmail();
        sent.setEventId(eventId);
        sent.setCollaboratorId(partner.getId());
        sent.setVendorType(type);
        sent.setSentAt(OffsetDateTime.now());
        try {
            sentRepository.saveAndFlush(sent);
        } catch (DataIntegrityViolationException ex) {
            return; // another run marked it first
        }
        mailService.sendPartnerVendorOffer(partner.getContactEmail(), partner.getName(), event.getTitle(),
                event.getStartAt(), event.getTimezone(), type, link.get().getInviteToken(), primaryHostLocale(eventId));
        auditWriter.write(event, null, "PARTNER_VENDOR_EMAIL_SENT", "Collaborator", partner.getId(),
                Map.of("collaboratorId", partner.getId().toString(), "vendorType", type.name()));
        log.info("Partner vendor offer for event {} sent to collaborator {}", eventId, partner.getId());
    }

    private Locale primaryHostLocale(UUID eventId) {
        return eventHostRepository.findByEvent_Id(eventId).stream()
                .filter(host -> host.getDisplayOrder() == 0)
                .map(EventHost::getMember)
                .map(member -> member.getUser())
                .filter(user -> user != null && user.getLocale() != null)
                .map(User::getLocale)
                .map(Locale::forLanguageTag)
                .findFirst()
                .orElse(Locale.ENGLISH);
    }
}
```

If the mail send throws, the transaction rolls back and the marker goes with it, so the next activation hook (or a manual retry) can send again; `deliver` may already be async and swallow failures, in which case the marker stays — check `deliver` and note which in the javadoc.

- [ ] **Step 5: Hook it to activation**

`VendorEventListener.onActivated`: inject `PartnerVendorOfferService` and, after `ensureLinks`, inside the same `try`:
```java
            partnerVendorOfferService.sendIfDue(activated.eventId());
```

- [ ] **Step 6: Checkout notice data**

The frontend's checkout notice shows the auto-offer line "only when a partner code is applied and the plan has the module". Find the DTO that carries the partner branding notice to checkout (`grep -rn "partnerBranding\|PartnerBranding" src/main/java/event_social_media/dto/billing`). Add `boolean vendorOffer` set to `partner.getBrandingRole() != null && plan includes vendors && VendorsConfig.from(plan config).allows(role)`. Use `planTierModuleConfigService.resolveConfig(planId, "vendors")` and `plan.getModuleKeys().contains("vendors")` (the event is a draft at checkout, so `VendorsConfigReader` would say unavailable). Add an assertion for it to `CheckoutCollaborationTest`'s existing branding-notice test.

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.PartnerVendorOfferTest" --tests "*CheckoutCollaboration*" --tests "*BillingRefundCollaboration*" --tests "*CollaborationEarning*"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): email the partner its vendor link after activation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: Access-ended sweep

**Files:**
- Create: `MAIN/service/vendor/VendorAccessSweepJob.java`
- Test: `TEST/service/vendor/VendorAccessSweepJobTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class VendorAccessSweepJobTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorAccessSweepJob job;
    @Autowired
    private EventVendorRepository vendorRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void recordsEachEndedVendorOnce() {
        Event ended = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor endedVendor = support.vendor(ended, PartnerRole.PLANNER);
        support.endedDaysAgo(ended, 31);
        Event running = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor runningVendor = support.vendor(running, PartnerRole.PLANNER);
        support.endedDaysAgo(running, 2);

        job.sweep();
        job.sweep();

        assertThat(vendorRepository.findById(endedVendor.getId()).orElseThrow().getAccessEndedAt()).isNotNull();
        assertThat(vendorRepository.findById(runningVendor.getId()).orElseThrow().getAccessEndedAt()).isNull();
        assertThat(auditLogRepository.findAll()).filteredOn(log -> "VENDOR_ACCESS_ENDED".equals(log.getAction()))
                .hasSize(1);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccessSweepJobTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Write the job**

```java
package event_social_media.service.vendor;

import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.event.EventAuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Writes {@code VENDOR_ACCESS_ENDED} once per vendor whose tools stopped. The window itself is
 * computed live by {@link EventAuthorizationService}; this only records that it closed.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorAccessSweepJob {

    private final EventVendorRepository eventVendorRepository;
    private final VendorsConfigReader vendorsConfigReader;
    private final VendorAuditWriter auditWriter;

    @Scheduled(cron = "${app.vendors.access-sweep.cron:0 20 3 * * *}", zone = "UTC")
    @Transactional
    public void sweep() {
        OffsetDateTime now = OffsetDateTime.now();
        int recorded = 0;
        for (EventVendor vendor : eventVendorRepository.findAccessEndCandidates(now)) {
            OffsetDateTime endsAt = vendorsConfigReader.forEvent(vendor.getEvent())
                    .map(config -> EventAuthorizationService.accessEndsAt(vendor.getEvent(), config))
                    .orElse(null);
            if (endsAt == null || now.isBefore(endsAt)) {
                continue;
            }
            vendor.setAccessEndedAt(now);
            eventVendorRepository.save(vendor);
            auditWriter.write(vendor.getEvent(), null, "VENDOR_ACCESS_ENDED", "EventVendor", vendor.getId(),
                    Map.of("vendorType", vendor.getVendorType().name(), "source", vendor.getSource().name()));
            recorded++;
        }
        log.info("Vendor access sweep recorded {} ended vendor(s)", recorded);
    }
}
```
If other scheduled jobs use ShedLock (`grep -rn "SchedulerLock" src/main`), add the same annotation with a name `vendor-access-sweep`.

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccessSweepJobTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): record when a vendor's tools stop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25: Data export and account deletion

**Files:**
- Modify: `MAIN/service/user/export/MeDataExportService.java`, `UserDataExportDto` (find it with `grep -rln "record UserDataExportDto\|class UserDataExportDto" src/main`), `MAIN/service/user/deletion/UserAnonymizer.java:94`
- Test: `TEST/service/vendor/VendorAccountDataTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.user.deletion.UserAnonymizer;
import event_social_media.service.user.export.MeDataExportService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class VendorAccountDataTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private MeDataExportService exportService;
    @Autowired
    private UserAnonymizer anonymizer;
    @Autowired
    private VendorProfileRepository profileRepository;
    @Autowired
    private EventVendorRepository vendorRepository;

    @Test
    void theExportCarriesTheProfileAndVendorRoles() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.MUSIC);

        var export = exportService.export(vendor.getUser().getId());

        assertThat(export.vendorProfile().businessName()).isEqualTo("Studio MUSIC");
        assertThat(export.vendorRoles()).singleElement()
                .satisfies(role -> assertThat(role.vendorType()).isEqualTo("MUSIC"));
    }

    @Test
    void deletingTheAccountRemovesTheProfileAndKeepsTheEventsRows() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.MUSIC);
        User user = vendor.getUser();

        anonymizer.anonymize(user.getId());

        assertThat(profileRepository.findById(user.getId())).isEmpty();
        assertThat(vendorRepository.findById(vendor.getId())).get()
                .satisfies(row -> assertThat(row.getUser()).isNull());
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccountDataTest"`
Expected: FAIL to compile.

- [ ] **Step 3: Implement**

`UserDataExportDto`: add two components at the end, with nested records in its style:
```java
        VendorProfile vendorProfile,
        List<VendorRole> vendorRoles
```
```java
    public record VendorProfile(String businessName, String vendorType, String link, boolean hasLogo,
                                OffsetDateTime partnerPromptDismissedAt) {
    }

    public record VendorRole(UUID eventId, String vendorType, String source, boolean hiddenByHost,
                             boolean optedOut, OffsetDateTime joinedAt, OffsetDateTime removedAt) {
    }
```
`MeDataExportService.export`: pass, as the last two arguments,
```java
                vendorProfileRepository.findById(userId)
                        .map(p -> new UserDataExportDto.VendorProfile(p.getBusinessName(), name(p.getVendorType()),
                                p.getLink(), p.getLogoKey() != null, p.getPartnerPromptDismissedAt()))
                        .orElse(null),
                eventVendorRepository.findByUser_Id(userId).stream()
                        .map(v -> new UserDataExportDto.VendorRole(v.getEvent().getId(), name(v.getVendorType()),
                                name(v.getSource()), v.isHiddenByHost(), v.isOptedOut(), v.getJoinedAt(),
                                v.getRemovedAt()))
                        .toList()
```
Update the other constructions of `UserDataExportDto` in tests.

`UserAnonymizer.anonymize`, after the `user_business_profiles` delete:
```java
        em.createNativeQuery("delete from vendor_profiles where user_id = :id")
                .setParameter("id", userId).executeUpdate();
        // The event keeps its vendor history and audit rows; the account link goes.
        em.createNativeQuery("update event_vendors set user_id = null where user_id = :id")
                .setParameter("id", userId).executeUpdate();
```
Delete the profile's logo object too: read `logo_key` first and add it to the keys the anonymizer already hands back for deletion, or call `storageService.deleteFile` after commit the way the avatar is handled.

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccountDataTest" --tests "*DataExport*" --tests "*Anonymiz*" --tests "*AccountDeletion*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/main src/test
git commit -m "feat(vendors): include vendor data in exports and account deletion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: Regression — vendors get exactly what attendees get

**Files:**
- Test: `TEST/security/VendorEndpointParityTest.java`
- Test: `TEST/migration/VendorJoinRaceTest.java`

- [ ] **Step 1: Write the parity test**

```java
package event_social_media.security;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The main guard against a vendor gaining host powers (spec 2026-10-19, "Authorization stays closed").
 * For every mapped endpoint, a vendor of each type must get the same HTTP status as a plain attendee
 * of an identically built event — except the endpoints this feature opens on purpose, whose vendor
 * behaviour the feature tests assert. New endpoints are covered automatically.
 */
@SpringBootTest(properties = "app.rate-limit.enabled=false")
@AutoConfigureMockMvc
@Transactional
class VendorEndpointParityTest {

    /** Controller#method of the endpoints opened to some vendors, plus the vendor feature's own. */
    private static final Set<String> OPENED = Set.of(
            "EventSessionController#create", "EventSessionController#patch", "EventSessionController#delete",
            "PostController#create",
            "RsvpController#report",
            "QrLinkController#findByEvent",
            "PlaylistSuggestionController#leaderboard", "PlaylistSuggestionController#markPlayed",
            "MediaController#uploadAndCreate", "MediaController#uploadBatch", "MediaController#findByEvent",
            "VendorController#list", "VendorController#me", "VendorController#patch", "VendorController#click",
            "EventMemberController#delete");

    /** Paths with no event in them: user-, admin- or token-scoped, where the two callers are not comparable. */
    private static final List<String> SKIPPED_PREFIXES = List.of(
            "/api/admin", "/api/me", "/api/auth", "/api/public", "/api/qr/", "/api/partners/", "/api/webhooks",
            "/api/demo", "/api/config", "/actuator", "/v3/api-docs", "/swagger-ui");

    private static final Pattern VARIABLE = Pattern.compile("\\{([^}]+)}");

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;

    @Autowired
    private RequestMappingHandlerMapping handlerMapping;

    /** A rename must not silently shrink coverage: every opened name has to match a real handler. */
    @org.junit.jupiter.api.Test
    void everyOpenedEndpointExists() {
        Set<String> handlers = new java.util.HashSet<>();
        handlerMapping.getHandlerMethods().values().forEach(h ->
                handlers.add(h.getBeanType().getSimpleName() + "#" + h.getMethod().getName()));
        assertThat(handlers).containsAll(OPENED);
    }

    // The endpoint loop runs inside one test per type: @MethodSource is static and cannot reach the
    // Spring context that knows the handler mappings.
    @ParameterizedTest(name = "as a {0}")
    @MethodSource("types")
    void everyEndpointAnswersAVendorLikeAnAttendee(PartnerRole type) throws Exception {
        List<String> mismatches = new ArrayList<>();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMapping.getHandlerMethods().entrySet()) {
            HandlerMethod handler = entry.getValue();
            String name = handler.getBeanType().getSimpleName() + "#" + handler.getMethod().getName();
            if (OPENED.contains(name)) {
                continue;
            }
            for (String pattern : entry.getKey().getPatternValues()) {
                if (SKIPPED_PREFIXES.stream().anyMatch(pattern::startsWith)) {
                    continue;
                }
                for (var method : entry.getKey().getMethodsCondition().getMethods()) {
                    int attendee = call(HttpMethod.valueOf(method.name()), pattern, false, type);
                    int vendor = call(HttpMethod.valueOf(method.name()), pattern, true, type);
                    if (attendee != vendor) {
                        mismatches.add(method + " " + pattern + " (" + name + "): attendee " + attendee + ", vendor " + vendor);
                    }
                }
            }
        }
        assertThat(mismatches).as("endpoints answering a %s vendor differently from an attendee", type).isEmpty();
    }

    static Stream<Arguments> types() {
        return Stream.of(PartnerRole.values()).map(Arguments::of);
    }

    /** Builds a fresh, identical event per call so the two callers never share state. */
    private int call(HttpMethod method, String pattern, boolean asVendor, PartnerRole type) throws Exception {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        EventMember hostMember = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        Map<String, UUID> ids = Map.of(
                "eventId", event.getId(),
                "post", fixtures.newPost(event, hostMember).getId(),
                "media", fixtures.newMedia(event, 10).getId(),
                "playlist", fixtures.newPlaylistSuggestion(event, hostMember).getId());
        User caller;
        if (asVendor) {
            caller = support.vendor(event, type).getUser();
        } else {
            caller = fixtures.newUser();
            fixtures.newMember(event, caller, EventRole.ATTENDEE);
        }
        String path = fill(pattern, ids);
        var request = MockMvcRequestBuilders.request(method, path)
                .contentType(MediaType.APPLICATION_JSON).content("{}");
        return mockMvc.perform(as(caller, request)).andReturn().getResponse().getStatus();
    }

    /** {eventId} is the event; {id}-style variables pick a fixture by the path segment before them. */
    private static String fill(String pattern, Map<String, UUID> ids) {
        Matcher matcher = VARIABLE.matcher(pattern);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String variable = matcher.group(1);
            String before = pattern.substring(0, matcher.start());
            UUID value;
            if (variable.equals("eventId")) {
                value = ids.get("eventId");
            } else if (before.contains("/posts/")) {
                value = ids.get("post");
            } else if (before.contains("/medias/") || before.contains("/media/")) {
                value = ids.get("media");
            } else if (before.contains("playlist-suggestions/")) {
                value = ids.get("playlist");
            } else {
                value = UUID.randomUUID();
            }
            matcher.appendReplacement(out, value.toString());
        }
        matcher.appendTail(out);
        return out.toString();
    }
}
```

Check that `app.rate-limit.enabled` is the property `RateLimitProperties` binds (`@ConfigurationProperties("app.rate-limit")` with `enabled`), so the many calls are not throttled.

The `OPENED` list names `EventMemberController#delete` because a vendor deleting their own membership also stamps the vendor row; check the real class/method names with `grep -rn "eventMemberService.delete" src/main/java/event_social_media/controller`. `everyOpenedEndpointExists` fails if any `OPENED` name is wrong.

- [ ] **Step 2: Run it**

Run: `./gradlew test --tests "event_social_media.security.VendorEndpointParityTest"`
Expected: PASS for all 8 types. A mismatch is either a real leak (fix the service so the vendor gets the attendee's answer) or an endpoint this feature opens and `OPENED` misses (add it only if the spec opens it). It runs a few minutes; that is accepted for this guard.

- [ ] **Step 3: Write the race test on Postgres**

```java
package event_social_media.migration;

import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.service.event.EventInvitationService;
import event_social_media.service.vendor.VendorLinkService;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.support.PostgresTestBase;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Two users accepting vendor links for the event's last vendor place at the same moment: exactly one
 * joins and the other gets VENDOR_LIMIT_REACHED. Real Postgres, real transactions, two threads.
 * Not @Transactional: each accept must commit on its own, so the rows are removed in @AfterEach.
 */
@SpringBootTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "app.seed.enabled=false"})
class VendorJoinRaceTest extends PostgresTestBase {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorLinkService linkService;
    @Autowired
    private EventInvitationService invitationService;
    @Autowired
    private TransactionTemplate transactionTemplate;
    @Autowired
    private JdbcTemplate jdbc;

    private final List<UUID> eventIds = new ArrayList<>();
    private final List<UUID> userIds = new ArrayList<>();

    @Test
    void theLastPlaceGoesToOne() throws Exception {
        record Setup(UUID eventId, UUID plannerToken, UUID djToken, UUID first, UUID second) { }
        Setup setup = transactionTemplate.execute(status -> {
            User host = fixtures.newUser();
            Event event = support.vendorEventHostedBy(host);
            support.setConfig(event, VendorsConfig.MAX_VENDORS, 1);
            linkService.ensureLinks(event.getId());
            User first = fixtures.newUser();
            User second = fixtures.newUser();
            eventIds.add(event.getId());
            userIds.addAll(List.of(host.getId(), first.getId(), second.getId()));
            return new Setup(event.getId(), support.link(event, PartnerRole.PLANNER).getInviteToken(),
                    support.link(event, PartnerRole.MUSIC).getInviteToken(), first.getId(), second.getId());
        });

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<Object> a = pool.submit(() -> accept(start, setup.plannerToken(), setup.first()));
        Future<Object> b = pool.submit(() -> accept(start, setup.djToken(), setup.second()));
        start.countDown();
        List<Object> outcomes = List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
        pool.shutdown();

        assertThat(outcomes).filteredOn(o -> o instanceof ConflictException).singleElement()
                .extracting("errorCode").isEqualTo(ErrorCode.VENDOR_LIMIT_REACHED);
        assertThat(outcomes).filteredOn(o -> o == Boolean.TRUE).hasSize(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from event_vendors where event_id = ? and removed_at is null",
                Integer.class, setup.eventId())).isEqualTo(1);
    }

    private Object accept(CountDownLatch start, UUID token, UUID userId) throws InterruptedException {
        start.await();
        try {
            invitationService.acceptInvite(token, userId);
            return Boolean.TRUE;
        } catch (ConflictException ex) {
            return ex;
        }
    }

    @AfterEach
    void cleanUp() {
        // events cascade to vendors, invitations, members and module rows; users go last.
        eventIds.forEach(id -> jdbc.update("delete from events where id = ?", id));
        userIds.forEach(id -> jdbc.update("delete from users where id = ?", id));
    }
}
```

If the event delete fails on a foreign key that does not cascade (the error names the table), delete that table's rows for the event first, in the order `CollaborationMigrationTest`'s cleanup uses.

- [ ] **Step 4: Run it with Docker up**

Run: `./gradlew test --tests "event_social_media.migration.VendorJoinRaceTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/test
git commit -m "test(vendors): vendors get exactly what attendees get, and the last place is not shared

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 27: Audit rows carry no personal data

**Files:**
- Test: `TEST/service/vendor/VendorAuditPiiScanTest.java`, `TEST/service/vendor/VendorScenario.java`

- [ ] **Step 1: Write the scan**

```java
package event_social_media.service.vendor;

import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.model.audit.AuditLog;
import event_social_media.repository.audit.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs every vendor action with personal data planted in the inputs, then scans the audit rows it
 * wrote (spec 2026-10-19, "Audit"). {@link VendorAuditWriter} already refuses unknown keys; this
 * catches a value that smuggles data through an allowed key.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorAuditPiiScanTest {

    static final Set<String> VENDOR_ACTIONS = Set.of(
            "VENDOR_LINK_CREATED", "VENDOR_LINK_RESET", "VENDOR_JOINED", "VENDOR_REMOVED", "VENDOR_ACCESS_ENDED",
            "VENDOR_LIST_HIDDEN", "VENDOR_LIST_SHOWN", "VENDOR_OPTED_OUT", "VENDOR_OPTED_IN",
            "SESSION_CREATE", "SESSION_UPDATE", "SESSION_DELETE", "ANNOUNCEMENT_CREATE",
            "PRO_MEDIA_UPLOAD", "PRO_MEDIA_DELETE", "RSVP_REPORT_VIEW", "SONG_PLAYED", "SONG_UNPLAYED",
            "PARTNER_VENDOR_EMAIL_SENT");

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.]+");
    private static final Pattern PHONE = Pattern.compile("\\+?\\d[\\d ()-]{7,}\\d");
    static final String PLANTED_NOTE = "PLANTED-NOTE-7731";
    static final String PLANTED_NAME = "Planted Guestname";

    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private VendorScenario scenario;

    @Test
    void noVendorAuditRowHoldsPersonalData() throws Exception {
        scenario.runEveryVendorAction(PLANTED_NOTE, PLANTED_NAME);

        List<AuditLog> rows = auditLogRepository.findAll().stream()
                .filter(row -> VENDOR_ACTIONS.contains(row.getAction())).toList();
        assertThat(rows).extracting(AuditLog::getAction).containsAll(VENDOR_ACTIONS);
        for (AuditLog row : rows) {
            String changes = objectMapper.writeValueAsString(row.getChanges());
            assertThat(row.getIpAddress()).as(row.getAction()).isNull();
            assertThat(EMAIL.matcher(changes).find()).as(row.getAction() + " " + changes).isFalse();
            assertThat(PHONE.matcher(changes.replaceAll("\"bytes\":\\d+", "").replaceAll("\"rowCount\":\\d+", ""))
                    .find()).as(row.getAction() + " " + changes).isFalse();
            assertThat(changes).doesNotContain(PLANTED_NOTE).doesNotContain(PLANTED_NAME);
        }
    }
}
```

- [ ] **Step 2: Write `VendorScenario`** (`TEST/service/vendor/VendorScenario.java`, a `@Component`)

One of each action in `VENDOR_ACTIONS`, through the same service calls the earlier tasks test, with personal data planted wherever an input takes text:

```java
package event_social_media.service.vendor;

import event_social_media.dto.event.EventSessionPatchDto;
import event_social_media.dto.event.EventSessionRequestDto;
import event_social_media.dto.media.MediaResponseDto;
import event_social_media.dto.media.PostRequestDto;
import event_social_media.dto.vendor.VendorPatchDto;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.event.Rsvp;
import event_social_media.model.event.RsvpReportType;
import event_social_media.model.media.PlaylistSuggestion;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.RsvpRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.event.EventInvitationService;
import event_social_media.service.event.EventSessionService;
import event_social_media.service.event.RsvpReportService;
import event_social_media.service.media.MediaService;
import event_social_media.service.media.MediaUploadContext;
import event_social_media.service.media.PlaylistSuggestionService;
import event_social_media.service.media.PostService;
import event_social_media.support.TestFixtures;
import lombok.RequiredArgsConstructor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

/** Drives every audited vendor action once, with personal data in every free-text input. */
@Component
@RequiredArgsConstructor
public class VendorScenario {

    private final TestFixtures fixtures;
    private final VendorTestSupport support;
    private final PartnerTestRedemptions redemptions;
    private final VendorLinkService linkService;
    private final EventInvitationService invitationService;
    private final EventSessionService sessionService;
    private final PostService postService;
    private final RsvpReportService reportService;
    private final MediaService mediaService;
    private final PlaylistSuggestionService playlistService;
    private final VendorService vendorService;
    private final PartnerVendorOfferService offerService;
    private final VendorAccessSweepJob sweepJob;
    private final CollaboratorRepository collaboratorRepository;
    private final EventMemberRepository memberRepository;
    private final EventVendorRepository vendorRepository;
    private final RsvpRepository rsvpRepository;

    public void runEveryVendorAction(String plantedNote, String plantedName) throws Exception {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        UUID eventId = event.getId();

        // A guest with planted contact data and notes.
        EventMember guest = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        guest.setDisplayName(plantedName);
        memberRepository.saveAndFlush(guest);
        Rsvp rsvp = new Rsvp();
        rsvp.setEventMember(guest);
        rsvp.setPhone("+30 690 123 4567");
        rsvp.setNotes(plantedNote);
        rsvp.setAdults(2);
        rsvpRepository.saveAndFlush(rsvp);

        // Partner offer (needs the links): VENDOR_LINK_CREATED, PARTNER_VENDOR_EMAIL_SENT.
        Collaborator partner = fixtures.newBrandedCollaborator();
        partner.setBrandingRole(PartnerRole.PHOTOGRAPHER);
        partner.setContactEmail("partner@example.com");
        collaboratorRepository.saveAndFlush(partner);
        redemptions.live(event, partner);
        linkService.ensureLinks(eventId);
        offerService.sendIfDue(eventId);

        // VENDOR_LINK_RESET, then three joins: VENDOR_JOINED.
        linkService.reset(eventId, PartnerRole.MUSIC, host.getId());
        User planner = fixtures.newUser();
        User photographer = fixtures.newUser();
        User dj = fixtures.newUser();
        invitationService.acceptInvite(support.link(event, PartnerRole.PLANNER).getInviteToken(), planner.getId());
        invitationService.acceptInvite(support.link(event, PartnerRole.PHOTOGRAPHER).getInviteToken(), photographer.getId());
        invitationService.acceptInvite(support.link(event, PartnerRole.MUSIC).getInviteToken(), dj.getId());
        support.profile(photographer, plantedName, PartnerRole.PHOTOGRAPHER);

        // Planner: SESSION_CREATE/UPDATE/DELETE, ANNOUNCEMENT_CREATE, RSVP_REPORT_VIEW.
        EventSessionRequestDto create = new EventSessionRequestDto();
        create.setEventId(eventId);
        create.setTitle(plantedNote);
        create.setStartAt(OffsetDateTime.now().plusDays(30));
        var session = sessionService.create(create, planner.getId());
        EventSessionPatchDto patch = new EventSessionPatchDto();
        patch.setTitle(plantedName + " planner@example.com");
        sessionService.patch(session.getId(), patch, planner.getId());
        sessionService.delete(session.getId(), planner.getId());
        PostRequestDto announcement = new PostRequestDto();
        announcement.setEventId(eventId);
        announcement.setType("ANNOUNCEMENT");
        announcement.setContent(plantedNote + " +30 690 123 4567");
        postService.create(announcement, planner.getId());
        reportService.build(eventId, planner.getId(), RsvpReportType.FULL_LIST, Locale.ENGLISH);

        // Photographer: PRO_MEDIA_UPLOAD; the host deletes it: PRO_MEDIA_DELETE.
        java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(4, 4, java.awt.image.BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream jpeg = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, "jpg", jpeg);
        MediaResponseDto pro = mediaService.uploadAndCreate(eventId,
                new MockMultipartFile("file", plantedName + ".jpg", "image/jpeg", jpeg.toByteArray()),
                photographer.getId(), MediaUploadContext.PRO);
        mediaService.delete(pro.getId(), host.getId());

        // DJ: SONG_PLAYED, SONG_UNPLAYED.
        PlaylistSuggestion song = fixtures.newPlaylistSuggestion(event, guest);
        playlistService.markPlayed(eventId, song.getId(), true, dj.getId());
        playlistService.markPlayed(eventId, song.getId(), false, dj.getId());

        // List controls: VENDOR_LIST_HIDDEN/SHOWN, VENDOR_OPTED_OUT/IN, VENDOR_REMOVED.
        EventVendor djVendor = vendorOf(eventId, dj);
        vendorService.patch(eventId, djVendor.getId(), hidden(true), host.getId());
        vendorService.patch(eventId, djVendor.getId(), hidden(false), host.getId());
        vendorService.patch(eventId, djVendor.getId(), optedOut(true), dj.getId());
        vendorService.patch(eventId, djVendor.getId(), optedOut(false), dj.getId());
        vendorService.remove(eventId, vendorOf(eventId, photographer).getId(), host.getId());

        // VENDOR_ACCESS_ENDED.
        support.endedDaysAgo(event, 31);
        sweepJob.sweep();
    }

    private EventVendor vendorOf(UUID eventId, User user) {
        EventMember member = memberRepository.findByEvent_IdAndUser_Id(eventId, user.getId()).orElseThrow();
        return vendorRepository.findByMember_IdAndRemovedAtIsNull(member.getId()).orElseThrow();
    }

    private static VendorPatchDto hidden(boolean value) {
        VendorPatchDto dto = new VendorPatchDto();
        dto.setHiddenByHost(value);
        return dto;
    }

    private static VendorPatchDto optedOut(boolean value) {
        VendorPatchDto dto = new VendorPatchDto();
        dto.setOptedOut(value);
        return dto;
    }
}
```

Use the same DTO field names and `Rsvp` fixture fields you settled on in Tasks 16 and 17. The upload runs inside the test transaction; if the storage client is a real one in tests, the existing media upload tests show the mock bean to add here.

- [ ] **Step 3: Run it**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAuditPiiScanTest"`
Expected: PASS. A failure names the action and its JSON; fix the writer call, not the test.

- [ ] **Step 4: Commit**

```bash
git add -A src/test
git commit -m "test(vendors): scan vendor audit rows for personal data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 28: Full suite and hand-off

- [ ] **Step 1: Bring the branch up to date with `staging`**

```bash
git fetch origin
git rebase origin/staging
```
Resolve conflicts in `ModuleKey`, `PlanCatalogBootstrap`, `EventTypeModuleDefaults`, `ErrorCode` and the migration number by keeping both sides and renumbering ours if `staging` took V176 or a code.

- [ ] **Step 2: Run everything**

Run: `./gradlew test > ../vendors-final.txt 2>&1; tail -30 ../vendors-final.txt`
Expected: `BUILD SUCCESSFUL`, with Docker running so the Postgres tests run. Compare failures with `../vendors-baseline.txt`: anything new is ours to fix.

- [ ] **Step 3: Update the graph**

Run: `graphify update .`

- [ ] **Step 4: Report to the user**

List: the final migration number and error codes (the frontend plan needs them), the new endpoints, the copy added to `messages*.properties` for review, and any spot where this plan's assumption about a class name was wrong. Ask before pushing or opening the PR into `staging`.

---

## Spec coverage

| Spec section | Task |
| --- | --- |
| Vendor types and tools, rules, access window | 8, 16, 17, 18, 21 |
| Links (creation, limits, reset, disallowed, drafts) | 9, 10 |
| Joining (preview line, notification, duplicates, rejoin) | 10, 12, 15 |
| Partner auto-offer + checkout line data | 23 |
| Vendor profile | 14 |
| Vendor list, hidden rows, clicks | 15 |
| Vendor badge on posts and comments | 15b |
| Become a partner (prompt rule, apply endpoint) | 13, 15 |
| Pro album and Pro storage | 19, 20, 21, 22 |
| Notifications | 12 |
| Admin (module, config) | 5, 6 |
| Admin event detail shows vendors read-only | 15 (`GET /api/admin/events/{eventId}/vendors`) |
| Audit log | 7 and every task that writes, 24, 27 |
| Testing — backend regression and new features | each task's tests, 26, 27, 28 |
| Data export and account deletion | 25 |
| Migrations | 3 |
