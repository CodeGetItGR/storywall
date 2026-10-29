# QR card templates — backend implementation plan

2026-10-28: dot and corner shapes were dropped after implementation (backend commit cc4c5d10). The spec is current; shape mentions below are historical.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin-curated catalog of A6 QR card templates per event type, served to hosts behind a new opt-in `qr_cards` plan module, with versioned public artwork files.

**Architecture:** A new `qr_card_templates` catalog mirrors the theme-preset catalog (`ThemePreset*`): admin CRUD plus a multipart artwork upload, a host list scoped to one event, and a public, immutable artwork file route like `ThemeFontFileController`. The `qr_cards` module is seeded on no plan, exactly like `vendors`.

**Tech Stack:** Spring Boot, JPA/Hibernate, Flyway (Postgres), H2 for unit tests, MockMvc, Testcontainers Postgres (`PostgresTestBase`) for the migration test.

**Spec:** [docs/superpowers/specs/2026-10-28-qr-card-templates-design.md](../specs/2026-10-28-qr-card-templates-design.md) in the frontend repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media`. All paths below are relative to it. Abbreviation: `J = src/main/java/event_social_media`, `T = src/test/java/event_social_media`.

---

## File map

| File | Responsibility |
| --- | --- |
| `J/model/event/ModuleKey.java` | Add `QR_CARDS`, plus `isOptInPerPlan(String)` shared by the three "not on a plan by default" checks. |
| `J/config/PlanCatalogBootstrap.java` | Module name; leave `qr_cards` off seeded plans. |
| `J/service/platform/PlanTierService.java` | Leave `qr_cards` off new and cloned plans. |
| `src/main/resources/db/migration/V185__qr_card_templates.sql` | Tables and module rows. |
| `J/model/qrcard/QrDotShape.java`, `QrCornerShape.java`, `QrCardTemplate.java` | Entity and shape enums. |
| `J/repository/qrcard/QrCardTemplateRepository.java` | Queries. |
| `J/exception/ErrorCode.java`, `J/exception/QrCardCodeContrastException.java` | New codes 3110, 3111. |
| `src/main/resources/i18n/messages.properties`, `messages_el.properties` | Error texts. |
| `J/service/theme/ThemeIllustrationPipeline.java` | Make `dimensions` public (one-word change). |
| `J/service/qrcard/QrCardArtworkPipeline.java` | Illustration checks plus A6 shape and width. |
| `J/service/storage/StorageService.java`, `R2StorageService.java` | `uploadQrCardTemplateFile`. |
| `J/dto/qrcard/*.java` | Request, patch, admin and host DTOs. |
| `J/service/qrcard/QrCardTemplateAdminService.java` | Admin CRUD and artwork upload. |
| `J/service/qrcard/QrCardTemplateService.java` | Host list and artwork read. |
| `J/controller/qrcard/QrCardTemplateAdminController.java` | `/api/admin/qr-card-templates`. |
| `J/controller/qrcard/QrCardTemplateController.java` | `GET /api/events/{eventId}/qr-card-templates`. |
| `J/controller/qrcard/QrCardArtworkController.java` | Public `GET /api/qr-card-templates/{id}/artwork/{version}`. |
| `J/config/SecurityConfig.java` | Permit the artwork route. |
| `docs/fe-guides/qr-card-templates-fe-integration.md` | The frontend contract. |
| Tests under `T/...` | One per behaviour group, listed in each task. |

---

### Task 0: Worktree on the latest staging

The main checkout is on `staging` with local, unpushed commits. Leave it alone and work in a new worktree.

- [ ] **Step 1: Create the worktree**

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add ../event_social_media-qr-cards -b feat/qr-card-templates origin/staging
cd ../event_social_media-qr-cards
```

- [ ] **Step 2: Confirm the next free numbers**

```bash
git ls-tree -r --name-only HEAD src/main/resources/db/migration | sed 's/.*\/V\([0-9]*\)__.*/\1/' | sort -n | tail -1
grep -o -E "[A-Z_]+\(3[0-9]{3}\)" src/main/java/event_social_media/exception/ErrorCode.java | sort -t'(' -k2 -n | tail -1
```

Expected at plan time: `183` and `CAMPAIGN_LINK_INVALID(3109)`. If staging has moved on, use the next free migration number and error codes everywhere this plan says `V184`, `3110` and `3111`, including the FE guide in Task 12.

- [ ] **Step 3: Baseline build**

Run: `./gradlew compileJava compileTestJava`
Expected: `BUILD SUCCESSFUL`.

---

### Task 1: `qr_cards` module key, off every plan by default

**Files:**
- Modify: `J/model/event/ModuleKey.java`
- Modify: `J/config/PlanCatalogBootstrap.java` (names map near line 44, plan loop near line 106)
- Modify: `J/service/platform/PlanTierService.java` (near lines 126 and 618)
- Test: `T/service/qrcard/QrCardsModuleSeedingTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.qrcard;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventTypeKey;
import event_social_media.model.platform.ModuleApplicability;
import event_social_media.model.platform.PlatformModule;
import event_social_media.repository.event.EventModuleRepository;
import event_social_media.repository.platform.PlanTierRepository;
import event_social_media.repository.platform.PlatformEventTypeModuleRepository;
import event_social_media.repository.platform.PlatformModuleRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.event.AdminEventService;
import event_social_media.service.platform.ModuleAvailabilityService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The {@code qr_cards} module is offered to every event type and is on no plan until an admin adds it. */
@SpringBootTest
@Transactional
class QrCardsModuleSeedingTest {

    @Autowired private PlatformEventTypeModuleRepository platformEventTypeModuleRepository;
    @Autowired private PlatformModuleRepository platformModuleRepository;
    @Autowired private PlanTierRepository planTierRepository;
    @Autowired private EventModuleRepository eventModuleRepository;
    @Autowired private ModuleAvailabilityService moduleAvailabilityService;
    @Autowired private AdminEventService adminEventService;
    @Autowired private TestFixtures fixtures;

    @Test
    void matrix_offersQrCardsToEveryType() {
        for (EventTypeKey type : EventTypeKey.values()) {
            assertEquals(ModuleApplicability.DEFAULT_ON, platformEventTypeModuleRepository
                    .findByEventTypeKeyAndModuleKey(type.getKey(), "qr_cards").orElseThrow().getApplicability(),
                    type.getKey());
        }
    }

    @Test
    void registry_hasAnEnabledQrCardsModule() {
        PlatformModule module = platformModuleRepository.findByModuleKey("qr_cards").orElseThrow();
        assertTrue(module.getIsEnabled());
        assertEquals("QR cards", module.getName());
    }

    @Test
    void noSeededPlanListsIt() {
        assertTrue(planTierRepository.findAll().stream().noneMatch(plan -> plan.getModuleKeys().contains("qr_cards")));
    }

    @Test
    void anEventDoesNotGetItFromItsPlan_butAnAdminCanGrantIt() {
        Event event = fixtures.newEventHostedBy(fixtures.newUser());
        fixtures.seedModules(event, eventModuleRepository);
        assertFalse(moduleAvailabilityService.isAvailable(event.getId(), "qr_cards"));

        adminEventService.grantModule(event.getId(), "qr_cards", "Testing QR cards",
                new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7"));

        assertTrue(moduleAvailabilityService.isAvailable(event.getId(), "qr_cards"));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.qrcard.QrCardsModuleSeedingTest"`
Expected: FAIL. `findByModuleKey("qr_cards")` is empty and the matrix has no row.

- [ ] **Step 3: Add the key and the shared opt-in check**

In `J/model/event/ModuleKey.java`, change the last constant and add a method after `fromKey`:

```java
    VENDORS("vendors"),
    QR_CARDS("qr_cards");
```

```java
    /**
     * Whether a seeded, new or cloned plan leaves this module off until an admin adds it: vendors
     * carries Pro storage and partner emails (2026-10-19); QR cards are sold per plan (2026-10-28).
     */
    public static boolean isOptInPerPlan(String key) {
        return VENDORS.key.equals(key) || QR_CARDS.key.equals(key);
    }
```

- [ ] **Step 4: Use it in `PlanCatalogBootstrap`**

Add the name after `Map.entry("vendors", "Vendors")`:

```java
            Map.entry("vendors", "Vendors"),
            Map.entry("qr_cards", "QR cards"));
```

Replace the plan loop's condition and comment:

```java
                for (ModuleKey key : ModuleKey.values()) {
                    // A plan lists only what its event type supports (theme is UNSUPPORTED for most).
                    // Vendors and QR cards are on no plan until an admin turns them on (V176, V185), and
                    // Quiz & Polls is on none until it is ready (V181).
                    if (!ModuleKey.isOptInPerPlan(key.getKey()) && key != ModuleKey.QUIZ_POLLS
                            && EventTypeModuleDefaults.supports(definition.eventTypeKey(), key)) {
                        plan.getModuleKeys().add(key.getKey());
                    }
                }
```

- [ ] **Step 5: Use it in `PlanTierService`**

Near line 126 (plan create):

```java
                    // Vendors and QR cards are opt-in per plan (user decisions, 2026-10-19 and 2026-10-28).
                    .filter(key -> !ModuleKey.isOptInPerPlan(key))
```

Near line 618 (`cloneModuleKeys`):

```java
            // An opt-in module (vendors, QR cards) is never gained by a clone on its own.
            if (!targetUnsupported.contains(key) && !ModuleKey.isOptInPerPlan(key)) {
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.service.qrcard.QrCardsModuleSeedingTest"`
Expected: PASS. `EventTypeModuleDefaults` gives every module `DEFAULT_ON` unless excluded, so the matrix row needs no change there.

- [ ] **Step 7: Run the module and plan tests that enumerate `ModuleKey`**

Run: `./gradlew test --tests "*Module*" --tests "*PlanTier*" --tests "*PlanCatalog*"`
Expected: PASS. If a test asserts the exact module list or count, add `qr_cards` to its expectation. Don't loosen the assertion.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/model/event/ModuleKey.java src/main/java/event_social_media/config/PlanCatalogBootstrap.java src/main/java/event_social_media/service/platform/PlanTierService.java src/test/java/event_social_media/service/qrcard/QrCardsModuleSeedingTest.java
git commit -m "feat(qr-cards): add the qr_cards module, off every plan by default"
```

---

### Task 2: Flyway migration

**Files:**
- Create: `src/main/resources/db/migration/V185__qr_card_templates.sql`
- Test: `T/migration/QrCardsMigrationTest.java`

- [ ] **Step 1: Write the migration**

```sql
-- QR card templates: see the frontend repo's docs/superpowers/specs/2026-10-28-qr-card-templates-design.md.

-- 1. Catalog. Templates are archived, never deleted, through the API. No slug: the id is the only key.
--    Colours are VARCHAR(7), not CHAR(7): Hibernate validates a String as varchar.
CREATE TABLE qr_card_templates (
    id               UUID         PRIMARY KEY,
    name             JSONB        NOT NULL,
    artwork_key      VARCHAR(512),
    artwork_version  INTEGER      NOT NULL DEFAULT 0,
    text_color       VARCHAR(7)   NOT NULL,
    heading_font_id  UUID         REFERENCES theme_fonts (id) ON DELETE RESTRICT,
    code_color       VARCHAR(7)   NOT NULL,
    dot_shape        VARCHAR(10)  NOT NULL,
    corner_shape     VARCHAR(10)  NOT NULL,
    center_logo      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order       INTEGER      NOT NULL DEFAULT 0,
    archived         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT qr_card_templates_text_color_check CHECK (text_color ~ '^#[0-9A-F]{6}$'),
    CONSTRAINT qr_card_templates_code_color_check CHECK (code_color ~ '^#[0-9A-F]{6}$'),
    CONSTRAINT qr_card_templates_dot_shape_check CHECK (dot_shape IN ('SQUARE', 'ROUNDED', 'DOT')),
    CONSTRAINT qr_card_templates_corner_shape_check CHECK (corner_shape IN ('SQUARE', 'ROUNDED', 'CIRCLE')),
    CONSTRAINT qr_card_templates_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT qr_card_templates_artwork_version_check CHECK (artwork_version >= 0)
);

CREATE INDEX idx_qr_card_templates_heading_font_id ON qr_card_templates (heading_font_id);

-- No CHECK on event_type: the service validates it against EventTypeKey, so a new event type
-- (REUNION came after V88's list) needs no migration here.
CREATE TABLE qr_card_template_event_types (
    template_id UUID        NOT NULL REFERENCES qr_card_templates (id) ON DELETE CASCADE,
    event_type  VARCHAR(50) NOT NULL,
    PRIMARY KEY (template_id, event_type)
);

-- The host list filters by event type.
CREATE INDEX idx_qr_card_template_event_types_event_type ON qr_card_template_event_types (event_type);

-- 2. The module. On no plan at deploy (an admin turns it on per plan), as V176 does for vendors.
--    Config rows for every event plan so PlanTierModuleConfigService#resolveConfig never fails closed on it.
INSERT INTO platform_modules (id, module_key, name, is_enabled, sort_order)
VALUES (gen_random_uuid(), 'qr_cards', 'QR cards', TRUE, 15)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO platform_event_type_modules (id, event_type_key, module_key, applicability, default_config, sort_order)
SELECT gen_random_uuid(), t.event_type_key, 'qr_cards', 'DEFAULT_ON', '{}'::jsonb, 15
FROM platform_event_types t
ON CONFLICT (event_type_key, module_key) DO NOTHING;

INSERT INTO plan_tier_module_configs (id, plan_tier_id, module_key, default_config, created_at, updated_at)
SELECT gen_random_uuid(), pt.id, 'qr_cards', '{}'::jsonb, NOW(), NOW()
FROM plan_tiers pt
WHERE pt.scope = 'EVENT'
ON CONFLICT (plan_tier_id, module_key) DO NOTHING;

-- Existing events get the module row, enabled, so adding the module to their plan (or unlocking
-- it) works without a sync. Availability still needs the plan or an unlock.
INSERT INTO event_modules (id, event_id, module_key, is_enabled, configuration)
SELECT gen_random_uuid(), e.id, 'qr_cards', TRUE, '{}'::jsonb
FROM events e
ON CONFLICT (event_id, module_key) DO NOTHING;
```

- [ ] **Step 2: Write the migration test**

```java
package event_social_media.migration;

import event_social_media.model.event.EventTypeKey;
import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class QrCardsMigrationTest extends PostgresTestBase {

    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void cleanUp() {
        // Shared database: remove what this class inserted. The event-type rows go with the cascade.
        jdbc.update("delete from qr_card_templates where name ->> 'en' like 'mig-test-%'");
    }

    @Test
    void registryRowIsEnabled() {
        Boolean enabled = jdbc.queryForObject(
                "select is_enabled from platform_modules where module_key = 'qr_cards'", Boolean.class);
        assertThat(enabled).isTrue();
    }

    @Test
    void matrixOffersItToEveryType() {
        for (EventTypeKey type : EventTypeKey.values()) {
            String applicability = jdbc.queryForObject(
                    "select applicability from platform_event_type_modules where event_type_key = ? and module_key = 'qr_cards'",
                    String.class, type.getKey());
            assertThat(applicability).as(type.getKey()).isEqualTo("DEFAULT_ON");
        }
    }

    @Test
    void noPlanListsIt_butEveryEventPlanHasAConfig() {
        Integer listing = jdbc.queryForObject(
                "select count(*) from plan_tier_modules where module_key = 'qr_cards'", Integer.class);
        Integer withoutConfig = jdbc.queryForObject(
                "select count(*) from plan_tiers pt where pt.scope = 'EVENT' and not exists ("
                        + "select 1 from plan_tier_module_configs c where c.plan_tier_id = pt.id and c.module_key = 'qr_cards')",
                Integer.class);
        assertThat(listing).isZero();
        assertThat(withoutConfig).isZero();
    }

    @Test
    void theTableRejectsLowerCaseColoursAndUnknownShapes() {
        assertThatThrownBy(() -> insert("#bfe6e2", "SQUARE")).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert("#BFE6E2", "STAR")).isInstanceOf(DataIntegrityViolationException.class);
        insert("#BFE6E2", "DOT");
    }

    private void insert(String color, String dotShape) {
        jdbc.update("insert into qr_card_templates (id, name, text_color, code_color, dot_shape, corner_shape) "
                        + "values (?, cast(? as jsonb), ?, '#241F1A', ?, 'ROUNDED')",
                UUID.randomUUID(), "{\"en\":\"mig-test-" + UUID.randomUUID() + "\",\"el\":\"x\"}", color, dotShape);
    }
}
```

- [ ] **Step 3: Run it** (needs Docker for Testcontainers)

Run: `./gradlew test --tests "event_social_media.migration.QrCardsMigrationTest"`
Expected: FAIL with `ddl-auto=validate` complaining that `qr_card_templates` has no entity. The test passes once Task 3 adds the entity. If Docker isn't running, start it first; don't skip the test.

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/migration/V185__qr_card_templates.sql src/test/java/event_social_media/migration/QrCardsMigrationTest.java
git commit -m "feat(qr-cards): add the qr_card_templates tables and seed the module"
```

---

### Task 3: Entity, shapes and repository

**Files:**
- Create: `J/model/qrcard/QrDotShape.java`, `J/model/qrcard/QrCornerShape.java`, `J/model/qrcard/QrCardTemplate.java`
- Create: `J/repository/qrcard/QrCardTemplateRepository.java`
- Test: `T/repository/qrcard/QrCardTemplateRepositoryTest.java`

- [ ] **Step 1: Write the failing repository test**

```java
package event_social_media.repository.qrcard;

import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class QrCardTemplateRepositoryTest {

    @Autowired private QrCardTemplateRepository repository;

    @Test
    void findOfferedFor_listsLiveTemplatesWithArtworkForTheType_inSortOrder() {
        QrCardTemplate second = save(Set.of("WEDDING"), 2, "a.png", false);
        QrCardTemplate first = save(Set.of("WEDDING", "BAPTISM"), 1, "b.png", false);
        save(Set.of("WEDDING"), 0, null, false);          // no artwork yet
        save(Set.of("WEDDING"), 0, "c.png", true);        // archived
        save(Set.of("BAPTISM"), 0, "d.png", false);       // another type

        List<QrCardTemplate> offered = repository.findOfferedFor("WEDDING");

        assertThat(offered).extracting(QrCardTemplate::getId).containsExactly(first.getId(), second.getId());
    }

    static QrCardTemplate template(Set<String> eventTypes, int sortOrder, String artwork, boolean archived) {
        QrCardTemplate template = new QrCardTemplate();
        template.setName(Map.of("en", "Linen " + UUID.randomUUID(), "el", "Λινό"));
        template.setEventTypes(new HashSet<>(eventTypes));
        template.setSortOrder(sortOrder);
        template.setArtworkKey(artwork == null ? null : "qr-card-templates/x/" + artwork);
        template.setArchived(archived);
        template.setTextColor("#5A3E2B");
        template.setCodeColor("#241F1A");
        template.setDotShape(QrDotShape.ROUNDED);
        template.setCornerShape(QrCornerShape.ROUNDED);
        template.setCenterLogo(true);
        return template;
    }

    private QrCardTemplate save(Set<String> eventTypes, int sortOrder, String artwork, boolean archived) {
        return repository.save(template(eventTypes, sortOrder, artwork, archived));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.repository.qrcard.QrCardTemplateRepositoryTest"`
Expected: FAIL to compile (`QrCardTemplate` does not exist).

- [ ] **Step 3: Add the shapes**

```java
package event_social_media.model.qrcard;

/** How a QR card template draws the code's single modules. */
public enum QrDotShape {
    SQUARE,
    ROUNDED,
    DOT
}
```

```java
package event_social_media.model.qrcard;

/** How a QR card template draws the code's three corner markers. */
public enum QrCornerShape {
    SQUARE,
    ROUNDED,
    CIRCLE
}
```

- [ ] **Step 4: Add the entity**

```java
package event_social_media.model.qrcard;

import event_social_media.model.base.MutableAuditable;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * One printable A6 QR card design: full-card artwork with the title, the code on a white panel and
 * the lines laid on top by the frontend. Offered to the event types in {@link #eventTypes}. Archived,
 * never deleted. See the frontend repo's QR card templates design spec (2026-10-28).
 */
@Getter
@Setter
@Entity
@DynamicUpdate
@Table(name = "qr_card_templates")
public class QrCardTemplate extends MutableAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    /** Keyed by locale; exactly {@code en} and {@code el}. */
    @NotNull
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "name", nullable = false)
    private Map<String, String> name;

    /** R2 key under {@code qr-card-templates/}; null until an admin uploads one. */
    @Size(max = 512)
    @Column(name = "artwork_key", length = 512)
    private String artworkKey;

    /** Bumped on every upload; part of the public URL, so the bytes behind a URL never change. */
    @NotNull
    @ColumnDefault("0")
    @Column(name = "artwork_version", nullable = false)
    private Integer artworkVersion = 0;

    /** {@code #RRGGBB}, upper-case. Title and lines. */
    @Size(max = 7)
    @NotNull
    @Column(name = "text_color", nullable = false, length = 7)
    private String textColor;

    /** {@code ThemeFont} for the title; null means the app's font. */
    @Column(name = "heading_font_id")
    private UUID headingFontId;

    /** {@code #RRGGBB}, upper-case. At least 4.5:1 against white, the panel the code sits on. */
    @Size(max = 7)
    @NotNull
    @Column(name = "code_color", nullable = false, length = 7)
    private String codeColor;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "dot_shape", nullable = false, length = 10)
    private QrDotShape dotShape;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "corner_shape", nullable = false, length = 10)
    private QrCornerShape cornerShape;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "center_logo", nullable = false)
    private Boolean centerLogo = true;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "archived", nullable = false)
    private Boolean archived = false;

    /** {@code EventTypeKey} keys this template is offered to. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "qr_card_template_event_types", joinColumns = @JoinColumn(name = "template_id"))
    @Column(name = "event_type", nullable = false, length = 50)
    private Set<String> eventTypes = new HashSet<>();
}
```

- [ ] **Step 5: Add the repository**

```java
package event_social_media.repository.qrcard;

import event_social_media.model.qrcard.QrCardTemplate;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QrCardTemplateRepository extends JpaRepository<QrCardTemplate, UUID> {

    List<QrCardTemplate> findAllByOrderBySortOrderAscIdAsc();

    /** What a host may print with for an event of {@code eventType}: live, with artwork, offered for it. */
    @Query("select t from QrCardTemplate t join t.eventTypes e"
            + " where e = :eventType and t.archived = false and t.artworkKey is not null"
            + " order by t.sortOrder asc, t.id asc")
    List<QrCardTemplate> findOfferedFor(@Param("eventType") String eventType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from QrCardTemplate t where t.id = :id")
    Optional<QrCardTemplate> lockById(@Param("id") UUID id);
}
```

- [ ] **Step 6: Run the repository and migration tests**

Run: `./gradlew test --tests "event_social_media.repository.qrcard.QrCardTemplateRepositoryTest" --tests "event_social_media.migration.QrCardsMigrationTest"`
Expected: PASS. The ids are random UUIDs, so the repository test relies on the sort orders (1 then 2), not on id order.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/model/qrcard src/main/java/event_social_media/repository/qrcard src/test/java/event_social_media/repository/qrcard
git commit -m "feat(qr-cards): add the QR card template entity and repository"
```

---

### Task 4: Error codes, contrast exception and messages

**Files:**
- Modify: `J/exception/ErrorCode.java` (after `CAMPAIGN_LINK_INVALID(3109)`)
- Create: `J/exception/QrCardCodeContrastException.java`
- Modify: `src/main/resources/i18n/messages.properties`, `src/main/resources/i18n/messages_el.properties`
- Test: `T/exception/QrCardErrorCodesTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.exception;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class QrCardErrorCodesTest {

    private static ResourceBundleMessageSource messages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @Test
    void theCodesAreNumbered() {
        assertThat(ErrorCode.QR_CARD_CODE_COLOR_LOW_CONTRAST.getCode()).isEqualTo(3110);
        assertThat(ErrorCode.QR_CARD_ARTWORK_SIZE_INVALID.getCode()).isEqualTo(3111);
    }

    /** Thrown without args: Spring skips MessageFormat, so a doubled apostrophe would show literally. */
    @ParameterizedTest
    @ValueSource(strings = {"error.qr_card.not_found", "error.qr_card.load_failed"})
    void messagesWithoutArgs_haveEnglishAndGreek_andNoDoubledApostrophes(String key) {
        ResourceBundleMessageSource source = messages();
        String english = source.getMessage(key, new Object[0], Locale.ENGLISH);
        String greek = source.getMessage(key, new Object[0], Locale.forLanguageTag("el"));
        assertThat(greek).as(key).isNotEqualTo(english);
        assertThat(english).doesNotContain("''");
    }

    /** Thrown with args: MessageFormat runs, so an apostrophe must be doubled in the file to show once. */
    @Test
    void messagesWithArgs_formatInBothLanguages() {
        ResourceBundleMessageSource source = messages();
        Object[] args = {"WEDDINGS"};
        String english = source.getMessage("error.qr_card.event_type_unknown", args, Locale.ENGLISH);
        String greek = source.getMessage("error.qr_card.event_type_unknown", args, Locale.forLanguageTag("el"));
        assertThat(english).contains("WEDDINGS").contains("doesn't").doesNotContain("''");
        assertThat(greek).contains("WEDDINGS");
        assertThat(source.getMessage("error.qr_card.artwork_size", new Object[]{"1000", "1000"}, Locale.ENGLISH))
                .contains("1000 × 1000 px");
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.exception.QrCardErrorCodesTest"`
Expected: FAIL to compile (`QR_CARD_CODE_COLOR_LOW_CONTRAST` missing).

- [ ] **Step 3: Add the codes** after `CAMPAIGN_LINK_INVALID(3109),`

```java
    /** 3110 — A QR card template's code colour has under 4.5:1 contrast against white; {@code details} carries {@code ratio} and {@code minimum}. The detail is localized. {@code 400}. */
    QR_CARD_CODE_COLOR_LOW_CONTRAST(3110),

    /** 3111 — A QR card template's artwork isn't A6 portrait (105:148 within 2%) or is under 1240 px wide. The detail is localized. {@code 400}. */
    QR_CARD_ARTWORK_SIZE_INVALID(3111),
```

- [ ] **Step 4: Add the exception**

```java
package event_social_media.exception;

/** 3110: a QR card template's code colour is under the minimum against the white panel the code sits on. */
public class QrCardCodeContrastException extends ThemeContrastException {

    public QrCardCodeContrastException(double ratio, double minimum) {
        super("codeColor contrast against white is under the minimum.", ErrorCode.QR_CARD_CODE_COLOR_LOW_CONTRAST,
                "error.qr_card.code_color_low_contrast", ratio, minimum);
    }
}
```

- [ ] **Step 5: Add the messages**

Append to `messages.properties` next to the `error.theme_*` block:

```properties
error.qr_card.code_color_low_contrast=The code colour is too light to scan on the white panel: contrast {0}:1, but the code needs at least {1}:1. Choose a darker code colour.
error.qr_card.artwork_size=The artwork must be an A6 portrait image (105 × 148) at least 1240 px wide. This one is {0} × {1} px. Export it again at that shape and size.
error.qr_card.name_locales=The template name must be given in exactly these languages: {0}. Add any that are missing and remove any others.
error.qr_card.name_invalid=The template name for language "{0}" must be 1 to {1} characters. Enter a name of that length.
error.qr_card.event_type_unknown=Event type "{0}" doesn''t exist. Choose one from the list.
error.qr_card.not_found=This artwork doesn't exist. It may have been replaced by a newer version.
error.qr_card.load_failed=The artwork couldn't be loaded because file storage didn't respond. Try again.
```

Append to `messages_el.properties` in the same place:

```properties
error.qr_card.code_color_low_contrast=Το χρώμα του κωδικού είναι πολύ ανοιχτό για να σκανάρεται πάνω στο λευκό πλαίσιο: αντίθεση {0}:1, ενώ ο κωδικός χρειάζεται τουλάχιστον {1}:1. Επιλέξτε πιο σκούρο χρώμα κωδικού.
error.qr_card.artwork_size=Το σχέδιο πρέπει να είναι κάθετη εικόνα A6 (105 × 148) με πλάτος τουλάχιστον 1240 px. Αυτό είναι {0} × {1} px. Εξαγάγετέ το ξανά σε αυτό το σχήμα και μέγεθος.
error.qr_card.name_locales=Το όνομα του προτύπου πρέπει να δίνεται ακριβώς σε αυτές τις γλώσσες: {0}. Προσθέστε όσες λείπουν και αφαιρέστε τις υπόλοιπες.
error.qr_card.name_invalid=Το όνομα του προτύπου για τη γλώσσα «{0}» πρέπει να έχει από 1 έως {1} χαρακτήρες. Εισαγάγετε όνομα με αυτό το μήκος.
error.qr_card.event_type_unknown=Ο τύπος εκδήλωσης «{0}» δεν υπάρχει. Επιλέξτε έναν από τη λίστα.
error.qr_card.not_found=Αυτό το σχέδιο δεν υπάρχει. Μπορεί να έχει αντικατασταθεί από νεότερη έκδοση.
error.qr_card.load_failed=Το σχέδιο δεν φορτώθηκε γιατί ο χώρος αποθήκευσης αρχείων δεν απάντησε. Δοκιμάστε ξανά.
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.exception.QrCardErrorCodesTest"`
Expected: PASS.

- [ ] **Step 7: Run the error-code uniqueness tests**

Run: `./gradlew test --tests "*ErrorCode*"`
Expected: PASS. A clash with another branch's 3110 or 3111 shows up here.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/exception src/main/resources/i18n src/test/java/event_social_media/exception/QrCardErrorCodesTest.java
git commit -m "feat(qr-cards): add error codes 3110 and 3111 with their messages"
```

---

### Task 5: Artwork pipeline and storage

**Files:**
- Modify: `J/service/theme/ThemeIllustrationPipeline.java` (`dimensions` becomes public)
- Create: `J/service/qrcard/QrCardArtworkPipeline.java`
- Modify: `J/service/storage/StorageService.java`, `J/service/storage/R2StorageService.java`

The pipeline is tested through the upload endpoint in Task 8, as the theme illustration upload is.

- [ ] **Step 1: Open up `dimensions`**

In `ThemeIllustrationPipeline.java`, change only the signature line:

```java
    /** Width and height read from the header, without decoding. Call {@link #validate} first. */
    public Dimension dimensions(byte[] bytes, String mimeType) {
```

- [ ] **Step 2: Add the pipeline**

```java
package event_social_media.service.qrcard;

import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.service.media.AvatarImagePipeline;
import event_social_media.service.media.DetectedMediaType;
import event_social_media.service.theme.ThemeIllustrationPipeline;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.awt.Dimension;
import java.io.IOException;

/**
 * A QR card template's artwork: the theme illustration checks (PNG or WebP, at most 5 MB and 4096 px
 * a side), plus the card's shape. It fills an A6 portrait card, so it must be 105:148 within 2% and at
 * least 1240 px wide, which is 300 dpi at 105 mm.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QrCardArtworkPipeline {

    static final int MIN_WIDTH = 1240;
    static final double A6_RATIO = 105.0 / 148.0;
    static final double RATIO_TOLERANCE = 0.02;

    private final ThemeIllustrationPipeline illustrationPipeline;

    /** @throws BadRequestException 3111 when the shape or width is wrong, after the illustration checks pass */
    public DetectedMediaType validate(MultipartFile file) throws IOException {
        DetectedMediaType detected = illustrationPipeline.validate(file);
        Dimension size = illustrationPipeline.dimensions(file.getBytes(), detected.mimeType());
        double ratio = (double) size.width / size.height;
        if (size.width < MIN_WIDTH || Math.abs(ratio - A6_RATIO) / A6_RATIO > RATIO_TOLERANCE) {
            log.info("Rejected QR card artwork: {}x{} is not A6 portrait at {} px or wider",
                    size.width, size.height, MIN_WIDTH);
            // Strings, not ints: MessageFormat would group 1240 as "1,240".
            throw new BadRequestException(ErrorCode.QR_CARD_ARTWORK_SIZE_INVALID,
                    "The artwork must be A6 portrait, at least " + MIN_WIDTH + " px wide.",
                    "error.qr_card.artwork_size", String.valueOf(size.width), String.valueOf(size.height));
        }
        return detected;
    }

    /** Only clean bytes reach {@code uploader}. Call {@link #validate} first. */
    public String store(MultipartFile file, DetectedMediaType detected, AvatarImagePipeline.Uploader uploader)
            throws IOException {
        return illustrationPipeline.store(file, detected, uploader);
    }
}
```

- [ ] **Step 3: Add the storage method**

In `StorageService.java`, after `uploadThemePresetFile`:

```java
    /**
     * Uploads a QR card template's artwork under {@code qr-card-templates/{templateId}/{uuid}.{extension}}.
     * Outside the orphan sweep's {@code events/}, for the same reason as {@link #uploadDemoPersonaFile}.
     * A caller whose row never commits must delete the object itself.
     *
     * @return the storage key
     */
    String uploadQrCardTemplateFile(UUID templateId, InputStream content, long contentLength, String contentType,
                                    String extension) throws IOException;
```

In `R2StorageService.java`, after `uploadThemePresetFile`:

```java
    /** {@inheritDoc} */
    @Override
    public String uploadQrCardTemplateFile(UUID templateId, InputStream content, long contentLength, String contentType,
                                           String extension) throws IOException {
        requireSafeExtension(extension);
        requireAllowedContentType(contentType);
        String storageKey = String.format("qr-card-templates/%s/%s.%s", templateId, UUID.randomUUID(), extension);
        return putObject(storageKey, content, contentLength, contentType);
    }
```

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava compileTestJava`
Expected: `BUILD SUCCESSFUL`. If a test double implements `StorageService` directly (the grep at plan time found only `R2StorageService`), add the method there too.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service
git commit -m "feat(qr-cards): add the artwork pipeline and storage upload"
```

---

### Task 6: DTOs

**Files:**
- Create: `J/dto/qrcard/QrCardTemplateRequestDto.java`, `QrCardTemplatePatchDto.java`, `QrCardTemplateAdminDto.java`, `QrCardTemplateDto.java`, `QrCardTemplateListDto.java`

- [ ] **Step 1: Request DTO**

```java
package event_social_media.dto.qrcard;

import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class QrCardTemplateRequestDto {
    /** Exactly {@code en} and {@code el}; checked in the service. */
    @NotNull
    private Map<String, String> name;
    @NotEmpty
    @Size(max = 20)
    private List<String> eventTypes;
    /** Null means 0. */
    @Min(0)
    private Integer sortOrder;
    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String textColor;
    /** Optional; must be a live font with a file. */
    private UUID headingFontId;
    /** At least 4.5:1 against white; checked in the service. */
    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String codeColor;
    @NotNull
    private QrDotShape dotShape;
    @NotNull
    private QrCornerShape cornerShape;
    @NotNull
    private Boolean centerLogo;
}
```

- [ ] **Step 2: Patch DTO**

```java
package event_social_media.dto.qrcard;

import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A null field is left unchanged. */
@Data
public class QrCardTemplatePatchDto {
    private Map<String, String> name;
    @Size(max = 20)
    private List<String> eventTypes;
    @Min(0)
    private Integer sortOrder;
    private Boolean archived;
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String textColor;
    private UUID headingFontId;
    /** True removes the heading font (back to the app font). Wins over {@code headingFontId}. */
    private Boolean clearHeadingFont;
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String codeColor;
    private QrDotShape dotShape;
    private QrCornerShape cornerShape;
    private Boolean centerLogo;
}
```

- [ ] **Step 3: Admin DTO**

```java
package event_social_media.dto.qrcard;

import event_social_media.dto.theme.ThemePresetAdminDto;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A template as the admin screens see it, archived and without artwork included. */
@Data
public class QrCardTemplateAdminDto {
    private UUID id;
    private Map<String, String> name;
    /** Sorted. */
    private List<String> eventTypes;
    private int sortOrder;
    private boolean archived;
    /** Frontend-origin path {@code /api/qr-card-artwork/<id>/<version>}; null until artwork is uploaded. */
    private String artworkUrl;
    private String textColor;
    /** Null when the template uses the app font. Same shape as a theme preset's. */
    private ThemePresetAdminDto.ThemeFontSummary headingFont;
    private String codeColor;
    private QrDotShape dotShape;
    private QrCornerShape cornerShape;
    private boolean centerLogo;
}
```

- [ ] **Step 4: Host DTO**

```java
package event_social_media.dto.qrcard;

import event_social_media.dto.theme.EventThemeFontDto;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;

import java.util.Map;
import java.util.UUID;

/** One template in the host's print-card picker. {@code artworkUrl} is a frontend-origin path. */
public record QrCardTemplateDto(UUID id, Map<String, String> name, String artworkUrl, String textColor,
                                EventThemeFontDto headingFont, String codeColor, QrDotShape dotShape,
                                QrCornerShape cornerShape, boolean centerLogo) {
}
```

- [ ] **Step 5: Host list DTO**

The event payload carries no plan, and every event's `qr_cards` row is enabled, so the frontend can't tell from the event whether the module is paid for (a DRAFT's `isAvailable` is always false). The list says so itself (user decision, 2026-10-28).

```java
package event_social_media.dto.qrcard;

import java.util.List;

/**
 * The host's print-card picker. {@code available} is whether {@code qr_cards} is readable for the
 * event; the frontend shows the card designer only when it is. {@code templates} is empty when it isn't.
 */
public record QrCardTemplateListDto(boolean available, List<QrCardTemplateDto> templates) {

    public static QrCardTemplateListDto unavailable() {
        return new QrCardTemplateListDto(false, List.of());
    }
}
```

- [ ] **Step 6: Compile and commit**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`.

```bash
git add src/main/java/event_social_media/dto/qrcard
git commit -m "feat(qr-cards): add the QR card template DTOs"
```

---

### Task 7: Admin create, patch and list

**Files:**
- Create: `J/service/qrcard/QrCardTemplateAdminService.java`
- Create: `J/controller/qrcard/QrCardTemplateAdminController.java`
- Test: `T/controller/qrcard/QrCardTemplateAdminControllerTest.java`

- [ ] **Step 1: Write the failing controller test**

```java
package event_social_media.controller.qrcard;

import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import event_social_media.model.theme.ThemeFont;
import event_social_media.model.user.User;
import event_social_media.repository.qrcard.QrCardTemplateRepository;
import event_social_media.repository.theme.ThemeFontRepository;
import event_social_media.service.storage.StorageService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QrCardTemplateAdminControllerTest {

    private static final String URL = "/api/admin/qr-card-templates";

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private QrCardTemplateRepository repository;
    @Autowired private ThemeFontRepository fontRepository;
    @MockBean private StorageService storageService;

    private User admin;

    @BeforeEach
    void setUp() {
        admin = fixtures.newAdmin();
    }

    @Test
    void create_storesANormalisedTemplate() throws Exception {
        mockMvc.perform(as(admin, "ROLE_ADMIN", post(URL)).contentType(MediaType.APPLICATION_JSON)
                        .content(body("{\"en\":\"  Linen  \",\"el\":\"Λινό\"}", "[\"WEDDING\",\"BAPTISM\"]", "#5a3e2b", "#241f1a")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name.en").value("Linen"))
                .andExpect(jsonPath("$.eventTypes", containsInAnyOrder("WEDDING", "BAPTISM")))
                .andExpect(jsonPath("$.textColor").value("#5A3E2B"))
                .andExpect(jsonPath("$.codeColor").value("#241F1A"))
                .andExpect(jsonPath("$.dotShape").value("ROUNDED"))
                .andExpect(jsonPath("$.cornerShape").value("CIRCLE"))
                .andExpect(jsonPath("$.centerLogo").value(true))
                .andExpect(jsonPath("$.sortOrder").value(2))
                .andExpect(jsonPath("$.archived").value(false))
                .andExpect(jsonPath("$.artworkUrl").value(nullValue()))
                .andExpect(jsonPath("$.headingFont").value(nullValue()));
    }

    @Test
    void create_rejectsALightCodeColour_inTheAdminsLanguage() throws Exception {
        String body = body("{\"en\":\"Linen\",\"el\":\"Λινό\"}", "[\"WEDDING\"]", "#5A3E2B", "#CCCCCC");
        mockMvc.perform(as(admin, "ROLE_ADMIN", post(URL)).contentType(MediaType.APPLICATION_JSON)
                        .header("Accept-Language", "en").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(3110))
                .andExpect(jsonPath("$.details.minimum").value(4.5))
                .andExpect(jsonPath("$.detail").value(containsString("too light to scan")));
        mockMvc.perform(as(admin, "ROLE_ADMIN", post(URL)).contentType(MediaType.APPLICATION_JSON)
                        .header("Accept-Language", "el").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("4,5:1")));
    }

    @Test
    void create_rejectsBadInput() throws Exception {
        Map<String, Integer> cases = Map.of(
                body("{\"en\":\"Linen\",\"el\":\"Λ\"}", "[\"WEDDING\"]", "5A3E2B", "#241F1A"), 3001,
                body("{\"en\":\"Linen\"}", "[\"WEDDING\"]", "#5A3E2B", "#241F1A"), 3091,
                body("{\"en\":\"" + "x".repeat(61) + "\",\"el\":\"Λ\"}", "[\"WEDDING\"]", "#5A3E2B", "#241F1A"), 3091,
                body("{\"en\":\"Linen\",\"el\":\"Λ\"}", "[\"WEDDINGS\"]", "#5A3E2B", "#241F1A"), 3018,
                body("{\"en\":\"Linen\",\"el\":\"Λ\"}", "[]", "#5A3E2B", "#241F1A"), 3001);
        for (Map.Entry<String, Integer> entry : cases.entrySet()) {
            mockMvc.perform(as(admin, "ROLE_ADMIN", post(URL)).contentType(MediaType.APPLICATION_JSON).content(entry.getKey()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value(entry.getValue()));
        }
        mockMvc.perform(as(admin, "ROLE_ADMIN", post(URL)).contentType(MediaType.APPLICATION_JSON)
                        .content(body("{\"en\":\"Linen\",\"el\":\"Λ\"}", "[\"WEDDING\"]", "#5A3E2B", "#241F1A")
                                .replace("\"ROUNDED\"", "\"STAR\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_rejectsAnArchivedFont() throws Exception {
        ThemeFont font = font(true);
        String body = body("{\"en\":\"Linen\",\"el\":\"Λ\"}", "[\"WEDDING\"]", "#5A3E2B", "#241F1A")
                .replace("}", ",\"headingFontId\":\"" + font.getId() + "\"}");
        mockMvc.perform(as(admin, "ROLE_ADMIN", post(URL)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5145));
    }

    @Test
    void patch_archives_clearsTheFont_andRechecksTheCodeColour() throws Exception {
        QrCardTemplate template = template();
        template.setHeadingFontId(font(false).getId());
        repository.saveAndFlush(template);

        mockMvc.perform(as(admin, "ROLE_ADMIN", patch(URL + "/" + template.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"archived\":true,\"clearHeadingFont\":true,\"dotShape\":\"DOT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archived").value(true))
                .andExpect(jsonPath("$.dotShape").value("DOT"))
                .andExpect(jsonPath("$.headingFont").value(nullValue()));
        assertNull(repository.findById(template.getId()).orElseThrow().getHeadingFontId());

        mockMvc.perform(as(admin, "ROLE_ADMIN", patch(URL + "/" + template.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codeColor\":\"#EEEEEE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(3110));
        assertEquals("#241F1A", repository.findById(template.getId()).orElseThrow().getCodeColor());
    }

    @Test
    void findAll_includesArchivedTemplates() throws Exception {
        QrCardTemplate template = template();
        template.setArchived(true);
        repository.saveAndFlush(template);
        mockMvc.perform(as(admin, "ROLE_ADMIN", get(URL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(template.getId().toString())));
    }

    @Test
    void aNonAdminIsForbidden() throws Exception {
        mockMvc.perform(as(fixtures.newUser(), "ROLE_USER", get(URL))).andExpect(status().isForbidden());
    }

    private static String body(String name, String eventTypes, String textColor, String codeColor) {
        return "{\"name\":" + name + ",\"eventTypes\":" + eventTypes + ",\"sortOrder\":2,\"textColor\":\"" + textColor
                + "\",\"codeColor\":\"" + codeColor + "\",\"dotShape\":\"ROUNDED\",\"cornerShape\":\"CIRCLE\",\"centerLogo\":true}";
    }

    private QrCardTemplate template() {
        QrCardTemplate template = new QrCardTemplate();
        template.setName(Map.of("en", "Linen", "el", "Λινό"));
        template.setEventTypes(new HashSet<>(Set.of("WEDDING")));
        template.setTextColor("#5A3E2B");
        template.setCodeColor("#241F1A");
        template.setDotShape(QrDotShape.SQUARE);
        template.setCornerShape(QrCornerShape.SQUARE);
        template.setCenterLogo(true);
        return repository.saveAndFlush(template);
    }

    private ThemeFont font(boolean archived) {
        ThemeFont font = new ThemeFont();
        font.setFontKey("qr-font-" + UUID.randomUUID().toString().substring(0, 8));
        font.setFamilyName("QR test");
        font.setFallback("serif");
        font.setFileKey("theme-fonts/x/a.woff2");
        font.setFileVersion(1);
        font.setArchived(archived);
        return fontRepository.saveAndFlush(font);
    }

    private static MockHttpServletRequestBuilder as(User user, String role, MockHttpServletRequestBuilder request) {
        return request.with(authentication(new UsernamePasswordAuthenticationToken(
                user.getId().toString(), null, List.of(new SimpleGrantedAuthority(role)))));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateAdminControllerTest"`
Expected: FAIL. Every request returns 404 because no controller exists.

- [ ] **Step 3: Add the admin service** (the artwork upload is added in Task 8)

```java
package event_social_media.service.qrcard;

import event_social_media.dto.qrcard.QrCardTemplateAdminDto;
import event_social_media.dto.qrcard.QrCardTemplatePatchDto;
import event_social_media.dto.qrcard.QrCardTemplateRequestDto;
import event_social_media.dto.theme.ThemePresetAdminDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.QrCardCodeContrastException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.EventTypeKey;
import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.theme.ThemeFont;
import event_social_media.repository.qrcard.QrCardTemplateRepository;
import event_social_media.repository.theme.ThemeFontRepository;
import event_social_media.service.moderation.TextNormalizer;
import event_social_media.service.theme.ThemeContrast;
import event_social_media.service.theme.ThemeFontAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Admin CRUD over {@link QrCardTemplate}. Mirrors {@code ThemePresetAdminService}: templates are
 * archived, never deleted, and every write is logged with the admin's id.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QrCardTemplateAdminService {

    static final int NAME_MAX = 60;
    private static final Set<String> REQUIRED_LOCALES = Set.of("en", "el");
    private static final String WHITE = "#FFFFFF";

    private final QrCardTemplateRepository repository;
    private final ThemeFontRepository themeFontRepository;

    @Transactional(readOnly = true)
    public List<QrCardTemplateAdminDto> findAll() {
        List<QrCardTemplate> templates = repository.findAllByOrderBySortOrderAscIdAsc();
        Set<UUID> fontIds = templates.stream().map(QrCardTemplate::getHeadingFontId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, ThemeFont> fonts = fontIds.isEmpty() ? Map.of() : themeFontRepository.findAllById(fontIds).stream()
                .collect(Collectors.toMap(ThemeFont::getId, Function.identity()));
        return templates.stream().map(template -> toDto(template, fonts)).toList();
    }

    @Transactional
    public QrCardTemplateAdminDto create(QrCardTemplateRequestDto dto, UUID actorId) {
        QrCardTemplate template = new QrCardTemplate();
        template.setName(normalizedName(dto.getName(), actorId));
        template.setEventTypes(knownEventTypes(dto.getEventTypes(), actorId));
        template.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        template.setArchived(false);
        template.setTextColor(upper(dto.getTextColor()));
        if (dto.getHeadingFontId() != null) requireAssignableFont(dto.getHeadingFontId(), actorId);
        template.setHeadingFontId(dto.getHeadingFontId());
        template.setCodeColor(scannableCodeColor(dto.getCodeColor(), actorId));
        template.setDotShape(dto.getDotShape());
        template.setCornerShape(dto.getCornerShape());
        template.setCenterLogo(dto.getCenterLogo());
        return saved(template, "created", actorId);
    }

    @Transactional
    public QrCardTemplateAdminDto patch(UUID id, QrCardTemplatePatchDto dto, UUID actorId) {
        // Locked: an artwork upload racing this PATCH must not have its key overwritten.
        QrCardTemplate template = repository.lockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QrCardTemplate", id));
        if (dto.getName() != null) template.setName(normalizedName(dto.getName(), actorId));
        if (dto.getEventTypes() != null) template.setEventTypes(knownEventTypes(dto.getEventTypes(), actorId));
        if (dto.getSortOrder() != null) template.setSortOrder(dto.getSortOrder());
        if (dto.getTextColor() != null) template.setTextColor(upper(dto.getTextColor()));
        if (Boolean.TRUE.equals(dto.getClearHeadingFont())) {
            template.setHeadingFontId(null);
        } else if (dto.getHeadingFontId() != null && !dto.getHeadingFontId().equals(template.getHeadingFontId())) {
            // Re-sending the current font is a no-op, even if it has since been archived.
            requireAssignableFont(dto.getHeadingFontId(), actorId);
            template.setHeadingFontId(dto.getHeadingFontId());
        }
        if (dto.getCodeColor() != null) template.setCodeColor(scannableCodeColor(dto.getCodeColor(), actorId));
        if (dto.getDotShape() != null) template.setDotShape(dto.getDotShape());
        if (dto.getCornerShape() != null) template.setCornerShape(dto.getCornerShape());
        if (dto.getCenterLogo() != null) template.setCenterLogo(dto.getCenterLogo());
        String action = "updated";
        if (dto.getArchived() != null && !dto.getArchived().equals(template.getArchived())) {
            template.setArchived(dto.getArchived());
            action = dto.getArchived() ? "archived" : "unarchived";
        }
        return saved(template, action, actorId);
    }

    QrCardTemplateAdminDto saved(QrCardTemplate template, String action, UUID actorId) {
        QrCardTemplate saved = repository.save(template);
        log.info("QR card template: {} (id={}, actorId={})", action, saved.getId(), actorId);
        return toDto(saved);
    }

    /** Exactly {@code en} and {@code el}, each 1 to 60 characters after normalization. */
    private static Map<String, String> normalizedName(Map<String, String> name, UUID actorId) {
        if (name == null || !name.keySet().equals(REQUIRED_LOCALES)) {
            throw rejected(ErrorCode.LOCALIZED_TEXT_INVALID, actorId, "name_locales",
                    "name must contain exactly the locales " + REQUIRED_LOCALES, "error.qr_card.name_locales", "en, el");
        }
        Map<String, String> normalized = new LinkedHashMap<>();
        for (String locale : List.of("en", "el")) {
            String text = TextNormalizer.forStorage(name.get(locale));
            if (text == null || text.isEmpty() || text.length() > NAME_MAX) {
                throw rejected(ErrorCode.LOCALIZED_TEXT_INVALID, actorId, "name_" + locale + "_invalid",
                        "name." + locale + " is required, 1 to " + NAME_MAX + " characters.",
                        "error.qr_card.name_invalid", locale, NAME_MAX);
            }
            normalized.put(locale, text);
        }
        return Map.copyOf(normalized);
    }

    /** Each a known {@code EventTypeKey}. Every type supports {@code qr_cards}, so nothing else to check. */
    private static Set<String> knownEventTypes(List<String> eventTypes, UUID actorId) {
        Set<String> result = new HashSet<>();
        for (String type : eventTypes) {
            if (!EventTypeKey.isValid(type)) {
                throw rejected(ErrorCode.INVALID_EVENT_TYPE, actorId, "event_type_unknown",
                        "Event type " + type + " does not exist.", "error.qr_card.event_type_unknown", type);
            }
            result.add(type);
        }
        return result;
    }

    /** The code always sits on a white panel, so the code colour must give WCAG AA contrast against white. */
    private static String scannableCodeColor(String codeColor, UUID actorId) {
        String upper = upper(codeColor);
        double ratio = ThemeContrast.ratio(upper, WHITE);
        if (ratio < ThemeContrast.MIN_CONTRAST_RATIO) {
            log.warn("QR card template write rejected: reason=code_low_contrast actorId={} ratio={}", actorId, ratio);
            throw new QrCardCodeContrastException(ratio, ThemeContrast.MIN_CONTRAST_RATIO);
        }
        return upper;
    }

    /** An unknown id is "not assignable" too: a 404 would confirm which font ids exist. */
    private void requireAssignableFont(UUID fontId, UUID actorId) {
        boolean assignable = themeFontRepository.findById(fontId)
                .map(font -> !Boolean.TRUE.equals(font.getArchived()) && font.getFileKey() != null)
                .orElse(false);
        if (!assignable) {
            log.warn("QR card template write rejected: reason=font_not_assignable actorId={} fontId={}", actorId, fontId);
            throw new ConflictException(ErrorCode.THEME_FONT_NOT_ASSIGNABLE,
                    "This font is archived or has no file.", "error.theme_font.not_assignable");
        }
    }

    private static String upper(String hex) {
        return hex == null ? null : hex.toUpperCase(Locale.ROOT);
    }

    /** {@code message} is the English fallback; the detail is {@code messageKey} in the request's locale. */
    private static BadRequestException rejected(ErrorCode errorCode, UUID actorId, String reason, String message,
                                                String messageKey, Object... messageArgs) {
        log.warn("QR card template write rejected: reason={} actorId={}", reason, actorId);
        return new BadRequestException(errorCode, message, messageKey, messageArgs);
    }

    QrCardTemplateAdminDto toDto(QrCardTemplate template) {
        UUID fontId = template.getHeadingFontId();
        Map<UUID, ThemeFont> fonts = fontId == null ? Map.of()
                : themeFontRepository.findById(fontId).map(font -> Map.of(fontId, font)).orElse(Map.of());
        return toDto(template, fonts);
    }

    private static QrCardTemplateAdminDto toDto(QrCardTemplate template, Map<UUID, ThemeFont> fonts) {
        QrCardTemplateAdminDto dto = new QrCardTemplateAdminDto();
        dto.setId(template.getId());
        dto.setName(template.getName());
        dto.setEventTypes(template.getEventTypes().stream().sorted().toList());
        dto.setSortOrder(template.getSortOrder());
        dto.setArchived(Boolean.TRUE.equals(template.getArchived()));
        dto.setArtworkUrl(QrCardTemplateService.artworkPath(template));
        dto.setTextColor(template.getTextColor());
        ThemeFont font = template.getHeadingFontId() == null ? null : fonts.get(template.getHeadingFontId());
        dto.setHeadingFont(font == null ? null : new ThemePresetAdminDto.ThemeFontSummary(font.getId(), font.getFontKey(),
                font.getFamilyName(), font.getFallback(), Boolean.TRUE.equals(font.getArchived()),
                ThemeFontAdminService.publicPath(font)));
        dto.setCodeColor(template.getCodeColor());
        dto.setDotShape(template.getDotShape());
        dto.setCornerShape(template.getCornerShape());
        dto.setCenterLogo(Boolean.TRUE.equals(template.getCenterLogo()));
        return dto;
    }
}
```

`QrCardTemplateService.artworkPath` arrives in Task 9. Until then, add this stub in `J/service/qrcard/QrCardTemplateService.java` so the build compiles:

```java
package event_social_media.service.qrcard;

import event_social_media.model.qrcard.QrCardTemplate;

/** The host-facing side of QR card templates. */
public class QrCardTemplateService {

    /** The frontend-origin path the FE proxies, or null when the template has no artwork yet. */
    public static String artworkPath(QrCardTemplate template) {
        if (template.getArtworkKey() == null) return null;
        return "/api/qr-card-artwork/" + template.getId() + "/" + template.getArtworkVersion();
    }
}
```

- [ ] **Step 4: Add the admin controller**

```java
package event_social_media.controller.qrcard;

import event_social_media.config.NoOpenSessionInView;
import event_social_media.dto.qrcard.QrCardTemplateAdminDto;
import event_social_media.dto.qrcard.QrCardTemplatePatchDto;
import event_social_media.dto.qrcard.QrCardTemplateRequestDto;
import event_social_media.service.qrcard.QrCardTemplateAdminService;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/** Administers the QR card template catalog. Mirrors {@code ThemePresetAdminController}. */
@RestController
@RequestMapping("/api/admin/qr-card-templates")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class QrCardTemplateAdminController {

    private final QrCardTemplateAdminService service;

    @GetMapping
    public List<QrCardTemplateAdminDto> findAll() {
        return service.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QrCardTemplateAdminDto create(@Valid @RequestBody QrCardTemplateRequestDto dto, Authentication authentication) {
        return service.create(dto, actor(authentication));
    }

    @PatchMapping("/{id}")
    public QrCardTemplateAdminDto patch(@PathVariable UUID id, @Valid @RequestBody QrCardTemplatePatchDto dto,
                                        Authentication authentication) {
        return service.patch(id, dto, actor(authentication));
    }

    private static UUID actor(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
```

Leave the unused `NoOpenSessionInView`, `RateLimit` and `MultipartFile` imports out for now. Task 8 adds them with the upload method.

- [ ] **Step 5: Run the test**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateAdminControllerTest"`
Expected: PASS. If `ThemeFont` has required fields this test doesn't set, copy them from `ThemeFontFileControllerTest.setUp`.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/qrcard src/main/java/event_social_media/controller/qrcard src/test/java/event_social_media/controller/qrcard
git commit -m "feat(qr-cards): add admin create, patch and list for QR card templates"
```

---

### Task 8: Artwork upload

**Files:**
- Modify: `J/service/qrcard/QrCardTemplateAdminService.java`
- Modify: `J/controller/qrcard/QrCardTemplateAdminController.java`
- Test: `T/controller/qrcard/QrCardArtworkUploadTest.java`

- [ ] **Step 1: Write the failing test**

Not `@Transactional`: the upload writes in its own committed transaction, as `ThemePresetIllustrationUploadTest` explains, so rows are cleaned up by hand.

```java
package event_social_media.controller.qrcard;

import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import event_social_media.model.user.User;
import event_social_media.repository.qrcard.QrCardTemplateRepository;
import event_social_media.service.storage.StorageService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class QrCardArtworkUploadTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private QrCardTemplateRepository repository;
    @Autowired private JdbcTemplate jdbc;
    @MockBean private StorageService storageService;

    private final List<UUID> templateIds = new ArrayList<>();
    private final List<UUID> userIds = new ArrayList<>();
    private User admin;

    @BeforeEach
    void setUp() throws IOException {
        when(storageService.uploadQrCardTemplateFile(any(UUID.class), any(InputStream.class), anyLong(), anyString(), anyString()))
                .thenAnswer(inv -> "qr-card-templates/" + inv.getArgument(0) + "/" + UUID.randomUUID() + "." + inv.getArgument(4));
        admin = fixtures.newAdmin();
        userIds.add(admin.getId());
    }

    @AfterEach
    void cleanUp() {
        templateIds.forEach(repository::deleteById);
        userIds.forEach(userId -> jdbc.update("delete from users where id = ?", userId));
    }

    @Test
    void upload_storesTheArtwork_bumpsTheVersion_andDeletesTheOldFile() throws Exception {
        QrCardTemplate template = template("qr-card-templates/old/old.png", 3);

        mockMvc.perform(as(admin, multipart("/api/admin/qr-card-templates/" + template.getId() + "/artwork")
                        .file(png(1240, 1748))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.artworkUrl").value("/api/qr-card-artwork/" + template.getId() + "/4"));

        QrCardTemplate saved = repository.findById(template.getId()).orElseThrow();
        assertEquals(4, saved.getArtworkVersion());
        assertTrue(saved.getArtworkKey().startsWith("qr-card-templates/" + template.getId() + "/"));
        verify(storageService).uploadQrCardTemplateFile(eq(template.getId()), any(InputStream.class), anyLong(),
                eq("image/png"), eq("png"));
        verify(storageService).deleteFile("qr-card-templates/old/old.png");
    }

    @Test
    void upload_rejectsArtworkThatIsTooNarrowOrNotA6() throws Exception {
        QrCardTemplate template = template(null, 0);
        for (MockMultipartFile file : List.of(png(1000, 1410), png(1240, 1240), png(1748, 1240))) {
            mockMvc.perform(as(admin, multipart("/api/admin/qr-card-templates/" + template.getId() + "/artwork")
                            .file(file)).header("Accept-Language", "en"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value(3111));
        }
        verify(storageService, never()).uploadQrCardTemplateFile(any(), any(), anyLong(), anyString(), anyString());
        assertEquals(0, repository.findById(template.getId()).orElseThrow().getArtworkVersion());
    }

    @Test
    void upload_toAnUnknownTemplateIs404() throws Exception {
        mockMvc.perform(as(admin, multipart("/api/admin/qr-card-templates/" + UUID.randomUUID() + "/artwork")
                        .file(png(1240, 1748))))
                .andExpect(status().isNotFound());
    }

    private QrCardTemplate template(String artworkKey, int version) {
        QrCardTemplate template = new QrCardTemplate();
        template.setName(Map.of("en", "Linen", "el", "Λινό"));
        template.setEventTypes(new HashSet<>(Set.of("WEDDING")));
        template.setTextColor("#5A3E2B");
        template.setCodeColor("#241F1A");
        template.setDotShape(QrDotShape.SQUARE);
        template.setCornerShape(QrCornerShape.SQUARE);
        template.setArtworkKey(artworkKey);
        template.setArtworkVersion(version);
        QrCardTemplate saved = repository.save(template);
        templateIds.add(saved.getId());
        return saved;
    }

    private static MockMultipartFile png(int width, int height) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB), "png", out);
        return new MockMultipartFile("file", "card.png", "image/png", out.toByteArray());
    }

    private static MockHttpServletRequestBuilder as(User user, MockHttpServletRequestBuilder request) {
        return request.with(authentication(new UsernamePasswordAuthenticationToken(
                user.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardArtworkUploadTest"`
Expected: FAIL. There is no upload route, so the requests get a 404 or 405.

- [ ] **Step 3: Add the upload to the service**

Add these fields to `QrCardTemplateAdminService` (constructor injection via `@RequiredArgsConstructor`):

```java
    private final StorageService storageService;
    private final QrCardArtworkPipeline artworkPipeline;
    private final PlatformTransactionManager transactionManager;
```

Add these imports:

```java
import event_social_media.exception.ProviderUnavailableException;
import event_social_media.service.media.DetectedMediaType;
import event_social_media.service.storage.StorageService;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
```

Add the methods (same ordering and failure handling as `ThemePresetAdminService.uploadIllustration`, without the public-bucket copy, since artwork is served through `QrCardArtworkController`):

```java
    /**
     * Replaces the template's artwork. Upload first, then write the key and the next version on the
     * locked row in its own committed transaction, and only then delete the old object. If the write
     * fails, the new object is deleted and the old one is kept. Not transactional itself: no
     * connection is held during the transfer.
     *
     * @throws ProviderUnavailableException with {@link ErrorCode#STORAGE_UPLOAD_FAILED} (502) if the
     *                                      transfer to storage fails; the row is unchanged
     */
    public QrCardTemplateAdminDto uploadArtwork(UUID id, MultipartFile file, UUID actorId) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("QrCardTemplate", id);
        }
        String newKey;
        try {
            DetectedMediaType detected = artworkPipeline.validate(file);
            newKey = artworkPipeline.store(file, detected,
                    (in, length, mime, ext) -> {
                        try {
                            return storageService.uploadQrCardTemplateFile(id, in, length, mime, ext);
                        } catch (IOException ex) {
                            throw new StorageTransferException(ex);
                        }
                    });
        } catch (StorageTransferException ex) {
            log.error("QR card template {} artwork upload by admin {} failed in storage", id, actorId, ex.getCause());
            throw new ProviderUnavailableException(ErrorCode.STORAGE_UPLOAD_FAILED,
                    "The artwork could not be stored. Try again.");
        } catch (IOException ex) {
            log.warn("QR card template {} artwork from admin {} could not be read", id, actorId, ex);
            throw new BadRequestException(ErrorCode.MALFORMED_REQUEST_BODY, "The uploaded file could not be read.");
        }

        String oldKey;
        try {
            oldKey = writeArtworkKey(id, newKey);
        } catch (RuntimeException ex) {
            log.warn("QR card template {} artwork did not commit; removing orphaned object {}", id, newKey);
            deleteQuietly(newKey);
            throw ex;
        }
        if (oldKey != null) deleteQuietly(oldKey);
        log.info("QR card template: artwork uploaded (id={}, key={}, actorId={})", id, newKey, actorId);
        return toDto(repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("QrCardTemplate", id)));
    }

    /** Marks an IOException from the R2 transfer, as opposed to reading the uploaded part. */
    private static final class StorageTransferException extends RuntimeException {
        StorageTransferException(IOException cause) {
            super(cause);
        }
    }

    /** Sets the key and the next version on the locked row in its own committed transaction; returns the old key. */
    private String writeArtworkKey(UUID id, String newKey) {
        TransactionTemplate requiresNew = new TransactionTemplate(transactionManager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return requiresNew.execute(status -> {
            QrCardTemplate template = repository.lockById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("QrCardTemplate", id));
            String oldKey = template.getArtworkKey();
            template.setArtworkKey(newKey);
            template.setArtworkVersion(template.getArtworkVersion() + 1);
            repository.save(template);
            return oldKey;
        });
    }

    private void deleteQuietly(String storageKey) {
        try {
            storageService.deleteFile(storageKey);
        } catch (IOException | RuntimeException ex) {
            log.error("QR card artwork {} could not be removed; it is stored with no row "
                    + "referencing it and must be deleted by hand", storageKey, ex);
        }
    }
```

- [ ] **Step 4: Add the route**

In `QrCardTemplateAdminController`, add the imports `event_social_media.config.NoOpenSessionInView`, `event_social_media.service.ratelimit.RateLimit` and `org.springframework.web.multipart.MultipartFile`, then:

```java
    @PostMapping("/{id}/artwork")
    @RateLimit(name = "admin.qr-card-template.artwork", limit = 60, windowSeconds = 3600)
    @NoOpenSessionInView
    public QrCardTemplateAdminDto uploadArtwork(@PathVariable UUID id, @RequestParam("file") MultipartFile file,
                                                Authentication authentication) {
        return service.uploadArtwork(id, file, actor(authentication));
    }
```

- [ ] **Step 5: Run both admin tests**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.*"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/qrcard src/main/java/event_social_media/controller/qrcard src/test/java/event_social_media/controller/qrcard/QrCardArtworkUploadTest.java
git commit -m "feat(qr-cards): add the artwork upload"
```

---

### Task 9: Host list endpoint

**Files:**
- Replace: `J/service/qrcard/QrCardTemplateService.java` (the Task 7 stub)
- Create: `J/controller/qrcard/QrCardTemplateController.java`
- Test: `T/controller/qrcard/QrCardTemplateControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.qrcard;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import event_social_media.model.user.User;
import event_social_media.repository.event.EventModuleRepository;
import event_social_media.repository.qrcard.QrCardTemplateRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.event.AdminEventService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QrCardTemplateControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private QrCardTemplateRepository repository;
    @Autowired private EventModuleRepository eventModuleRepository;
    @Autowired private AdminEventService adminEventService;

    @Test
    void aHostGetsTheOfferedTemplatesForTheEventsType_inOrder() throws Exception {
        User host = fixtures.newUser();
        Event event = eventWithModule(fixtures.newEventHostedBy(host));
        QrCardTemplate second = save(event.getEventType(), 2, "b.png", false);
        QrCardTemplate first = save(event.getEventType(), 1, "a.webp", false);
        save(event.getEventType(), 0, null, false);
        save(event.getEventType(), 0, "c.png", true);
        save(otherType(event.getEventType()), 0, "d.png", false);

        mockMvc.perform(as(host, get("/api/events/" + event.getId() + "/qr-card-templates")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.templates", hasSize(2)))
                .andExpect(jsonPath("$.templates[0].id").value(first.getId().toString()))
                .andExpect(jsonPath("$.templates[0].artworkUrl").value("/api/qr-card-artwork/" + first.getId() + "/1"))
                .andExpect(jsonPath("$.templates[0].codeColor").value("#241F1A"))
                .andExpect(jsonPath("$.templates[0].dotShape").value("ROUNDED"))
                .andExpect(jsonPath("$.templates[0].centerLogo").value(true))
                .andExpect(jsonPath("$.templates[1].id").value(second.getId().toString()));
    }

    @Test
    void withTheModuleButNoTemplatesForTheType_itIsAvailableAndEmpty() throws Exception {
        User host = fixtures.newUser();
        Event event = eventWithModule(fixtures.newEventHostedBy(host));
        save(otherType(event.getEventType()), 0, "a.png", false);

        mockMvc.perform(as(host, get("/api/events/" + event.getId() + "/qr-card-templates")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.templates", hasSize(0)));
    }

    @Test
    void withoutTheModule_itIsUnavailableAndEmpty() throws Exception {
        User host = fixtures.newUser();
        Event event = fixtures.newEventHostedBy(host);
        fixtures.seedModules(event, eventModuleRepository);
        save(event.getEventType(), 0, "a.png", false);

        mockMvc.perform(as(host, get("/api/events/" + event.getId() + "/qr-card-templates")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.templates", hasSize(0)));
    }

    @Test
    void aDraftEventWithTheModule_getsTheTemplates() throws Exception {
        User host = fixtures.newUser();
        Event event = eventWithModule(fixtures.newDraftEventHostedBy(host));
        save(event.getEventType(), 0, "a.png", false);

        mockMvc.perform(as(host, get("/api/events/" + event.getId() + "/qr-card-templates")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.templates", hasSize(1)));
    }

    @Test
    void aGuestIsForbidden() throws Exception {
        Event event = eventWithModule(fixtures.newEventHostedBy(fixtures.newUser()));
        User guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);

        mockMvc.perform(as(guest, get("/api/events/" + event.getId() + "/qr-card-templates")))
                .andExpect(status().isForbidden());
    }

    private Event eventWithModule(Event event) {
        fixtures.seedModules(event, eventModuleRepository);
        adminEventService.grantModule(event.getId(), "qr_cards", "Testing QR cards",
                new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7"));
        return event;
    }

    private QrCardTemplate save(String eventType, int sortOrder, String artwork, boolean archived) {
        QrCardTemplate template = new QrCardTemplate();
        template.setName(Map.of("en", "Linen", "el", "Λινό"));
        template.setEventTypes(new HashSet<>(Set.of(eventType)));
        template.setSortOrder(sortOrder);
        template.setArtworkKey(artwork == null ? null : "qr-card-templates/x/" + artwork);
        template.setArtworkVersion(artwork == null ? 0 : 1);
        template.setArchived(archived);
        template.setTextColor("#5A3E2B");
        template.setCodeColor("#241F1A");
        template.setDotShape(QrDotShape.ROUNDED);
        template.setCornerShape(QrCornerShape.CIRCLE);
        template.setCenterLogo(true);
        return repository.save(template);
    }

    private static String otherType(String type) {
        return "BAPTISM".equals(type) ? "WEDDING" : "BAPTISM";
    }

    private static MockHttpServletRequestBuilder as(User user, MockHttpServletRequestBuilder request) {
        return request.with(authentication(new UsernamePasswordAuthenticationToken(
                user.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")))));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateControllerTest"`
Expected: FAIL with a 404 (no route).

- [ ] **Step 3: Replace the service stub**

```java
package event_social_media.service.qrcard;

import event_social_media.dto.qrcard.QrCardTemplateDto;
import event_social_media.dto.qrcard.QrCardTemplateListDto;
import event_social_media.dto.theme.EventThemeFontDto;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ProviderUnavailableException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.Event;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.theme.ThemeFont;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.qrcard.QrCardTemplateRepository;
import event_social_media.repository.theme.ThemeFontRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.platform.ModuleAvailabilityService;
import event_social_media.service.storage.StorageService;
import event_social_media.service.theme.ThemeFontAdminService;
import event_social_media.service.vendor.VendorCapability;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** The host-facing side of QR card templates: the print-card picker and the artwork files. */
@Slf4j
@Service
@RequiredArgsConstructor
public class QrCardTemplateService {

    private final QrCardTemplateRepository repository;
    private final ThemeFontRepository themeFontRepository;
    private final EventRepository eventRepository;
    private final EventAuthorizationService eventAuthorizationService;
    private final ModuleAvailabilityService moduleAvailabilityService;
    private final StorageService storageService;

    /** The frontend-origin path the FE proxies, or null when the template has no artwork yet. */
    public static String artworkPath(QrCardTemplate template) {
        if (template.getArtworkKey() == null) return null;
        return "/api/qr-card-artwork/" + template.getId() + "/" + template.getArtworkVersion();
    }

    /**
     * What a host (or a planner who can read the event's QR links) may print with: live templates
     * with artwork, offered for the event's type, in sort order. Same access as the QR link list.
     * Unavailable and empty when {@code qr_cards} isn't readable for the event (not on its plan or
     * unlocked, the kill switch, or the event's own switch). A DRAFT event reads it, so a gift giver
     * can print before the handover.
     */
    @Transactional(readOnly = true)
    public QrCardTemplateListDto listForEvent(UUID eventId, UUID callerUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        eventAuthorizationService.requireHostOrVendor(eventId, callerUserId, VendorCapability.QR_READ);
        if (!moduleAvailabilityService.isReadable(eventId, ModuleKey.QR_CARDS)) {
            return QrCardTemplateListDto.unavailable();
        }
        List<QrCardTemplate> templates = repository.findOfferedFor(event.getEventType());
        Set<UUID> fontIds = templates.stream().map(QrCardTemplate::getHeadingFontId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, ThemeFont> fonts = fontIds.isEmpty() ? Map.of() : themeFontRepository.findAllById(fontIds).stream()
                .collect(Collectors.toMap(ThemeFont::getId, Function.identity()));
        return new QrCardTemplateListDto(true, templates.stream().map(template -> toDto(template, fonts)).toList());
    }

    /**
     * The artwork bytes for a template and version. Archived templates are still served: a host who
     * opened the picker before the archive can still print.
     *
     * @throws ResourceNotFoundException    unknown id, no artwork, a version other than the current one,
     *                                      or an object storage reports as missing
     * @throws ProviderUnavailableException storage could not be reached or failed to answer (502)
     */
    public Artwork readArtwork(UUID templateId, int version) {
        QrCardTemplate template = repository.findById(templateId)
                .filter(found -> found.getArtworkKey() != null && found.getArtworkVersion() == version)
                .orElseThrow(QrCardTemplateService::notFound);
        String key = template.getArtworkKey();
        try (InputStream in = storageService.openObject(key)) {
            return new Artwork(in.readAllBytes(), key.endsWith(".webp") ? "image/webp" : "image/png");
        } catch (IOException | UncheckedIOException | SdkClientException ex) {
            if (ex.getCause() instanceof S3Exception s3 && s3.statusCode() == 404) {
                log.warn("QR card template {} v{} points at storage key {}, which does not exist", templateId, version, key);
                throw notFound();
            }
            log.error("QR card template {} v{} could not be read from storage key {}", templateId, version, key, ex);
            throw new ProviderUnavailableException(ErrorCode.STORAGE_UPLOAD_FAILED,
                    "The artwork could not be loaded because file storage did not respond.", "error.qr_card.load_failed");
        }
    }

    /** The one 404 of the public artwork endpoint: it names nothing, and says what to do. */
    public static ResourceNotFoundException notFound() {
        return ResourceNotFoundException.withMessageKey(
                "This artwork does not exist. It may have been replaced by a newer version.", "error.qr_card.not_found");
    }

    public record Artwork(byte[] bytes, String contentType) {
    }

    private static QrCardTemplateDto toDto(QrCardTemplate template, Map<UUID, ThemeFont> fonts) {
        ThemeFont font = template.getHeadingFontId() == null ? null : fonts.get(template.getHeadingFontId());
        // A font with no file can't render: the card falls back to the app font, as a theme does.
        EventThemeFontDto headingFont = font == null || font.getFileKey() == null ? null
                : new EventThemeFontDto(font.getFontKey(), font.getFallback(), ThemeFontAdminService.publicPath(font));
        return new QrCardTemplateDto(template.getId(), template.getName(), artworkPath(template), template.getTextColor(),
                headingFont, template.getCodeColor(), template.getDotShape(), template.getCornerShape(),
                Boolean.TRUE.equals(template.getCenterLogo()));
    }
}
```

`ProviderUnavailableException` needs a constructor taking `(ErrorCode, String, String)`. `ThemeFontFileService` already calls one with a message key, so it exists.

- [ ] **Step 4: Add the controller**

```java
package event_social_media.controller.qrcard;

import event_social_media.dto.qrcard.QrCardTemplateListDto;
import event_social_media.service.qrcard.QrCardTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** The host's print-card picker. See the QR card templates spec (2026-10-28). */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class QrCardTemplateController {

    private final QrCardTemplateService service;

    @GetMapping("/api/events/{eventId}/qr-card-templates")
    public QrCardTemplateListDto templates(@PathVariable UUID eventId, Authentication authentication) {
        return service.listForEvent(eventId, UUID.fromString((String) authentication.getPrincipal()));
    }
}
```

- [ ] **Step 5: Run the test**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateControllerTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/qrcard src/main/java/event_social_media/controller/qrcard src/test/java/event_social_media/controller/qrcard/QrCardTemplateControllerTest.java
git commit -m "feat(qr-cards): list an event's QR card templates for its hosts"
```

---

### Task 10: Public artwork file

**Files:**
- Create: `J/controller/qrcard/QrCardArtworkController.java`
- Modify: `J/config/SecurityConfig.java` (next to the `/api/theme-fonts/*/*` matchers near line 120)
- Test: `T/controller/qrcard/QrCardArtworkControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.qrcard;

import event_social_media.model.qrcard.QrCardTemplate;
import event_social_media.model.qrcard.QrCornerShape;
import event_social_media.model.qrcard.QrDotShape;
import event_social_media.repository.qrcard.QrCardTemplateRepository;
import event_social_media.service.storage.StorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Every request here is anonymous: the endpoint is public, and these tests send no credentials. */
@SpringBootTest
@AutoConfigureMockMvc
class QrCardArtworkControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private QrCardTemplateRepository repository;
    @MockBean private StorageService storageService;

    private QrCardTemplate template;

    @BeforeEach
    void setUp() {
        QrCardTemplate row = new QrCardTemplate();
        row.setName(Map.of("en", "Linen", "el", "Λινό"));
        row.setEventTypes(new HashSet<>(Set.of("WEDDING")));
        row.setTextColor("#5A3E2B");
        row.setCodeColor("#241F1A");
        row.setDotShape(QrDotShape.SQUARE);
        row.setCornerShape(QrCornerShape.SQUARE);
        row.setArtworkKey("qr-card-templates/x/" + UUID.randomUUID() + ".webp");
        row.setArtworkVersion(3);
        template = repository.saveAndFlush(row);
    }

    @AfterEach
    void cleanUp() {
        repository.deleteById(template.getId());
    }

    @Test
    void anonymousGet_returnsTheBytes_immutable() throws Exception {
        byte[] bytes = {1, 2, 3};
        when(storageService.openObject(template.getArtworkKey())).thenReturn(new ByteArrayInputStream(bytes));

        mockMvc.perform(get("/api/qr-card-templates/" + template.getId() + "/artwork/3"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/webp"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(bytes));
    }

    @Test
    void aStaleVersionOrMalformedPathIs404() throws Exception {
        mockMvc.perform(get("/api/qr-card-templates/" + template.getId() + "/artwork/2")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/qr-card-templates/" + template.getId() + "/artwork/03")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/qr-card-templates/not-a-uuid/artwork/3")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/qr-card-templates/" + UUID.randomUUID() + "/artwork/3")).andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardArtworkControllerTest"`
Expected: FAIL with a 401 or 403 (the route is neither public nor present).

- [ ] **Step 3: Add the controller**

```java
package event_social_media.controller.qrcard;

import event_social_media.config.NoOpenSessionInView;
import event_social_media.service.qrcard.QrCardTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Public, immutable QR card artwork. The frontend proxies it through its own origin so the print-card
 * canvas can export without tainting. Not secret: it is the catalog's design, not event content.
 */
@RestController
@RequiredArgsConstructor
public class QrCardArtworkController {

    private static final Pattern VERSION = Pattern.compile("^(0|[1-9][0-9]{0,8})$");
    private static final Pattern ID = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");

    private final QrCardTemplateService service;

    @GetMapping("/api/qr-card-templates/{templateId}/artwork/{version}")
    @NoOpenSessionInView
    public ResponseEntity<byte[]> artwork(@PathVariable String templateId, @PathVariable String version) {
        // Checked before any lookup: a malformed id or version is the same 404 as an unknown one.
        if (!ID.matcher(templateId).matches() || !VERSION.matcher(version).matches()) {
            throw QrCardTemplateService.notFound();
        }
        QrCardTemplateService.Artwork artwork = service.readArtwork(UUID.fromString(templateId), Integer.parseInt(version));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(artwork.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(artwork.bytes());
    }
}
```

- [ ] **Step 4: Permit it in `SecurityConfig`**, right after the two theme-font matchers:

```java
                        // QR card artwork: immutable catalog images the FE proxies for the print-card canvas.
                        .requestMatchers(HttpMethod.GET, "/api/qr-card-templates/*/artwork/*").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/api/qr-card-templates/*/artwork/*").permitAll()
```

- [ ] **Step 5: Run the test**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardArtworkControllerTest"`
Expected: PASS. If `Cache-Control` comes back as `no-cache`, the security headers writer is overriding it. Check how the theme-font route is excluded in `SecurityConfig` and do the same for this path.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/controller/qrcard/QrCardArtworkController.java src/main/java/event_social_media/config/SecurityConfig.java src/test/java/event_social_media/controller/qrcard/QrCardArtworkControllerTest.java
git commit -m "feat(qr-cards): serve QR card artwork publicly by version"
```

---

### Task 11: Full suite

- [ ] **Step 1: Run every test**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`. A failure in a test that lists modules, error codes or public paths means that test's expectation needs `qr_cards`, 3110/3111 or the artwork path. Fix the expectation, not the feature.

- [ ] **Step 2: Refresh the knowledge graph** (repo rule)

Run: `graphify update .`

- [ ] **Step 3: Commit anything the fixes touched**

```bash
git add -A
git commit -m "test(qr-cards): update module and error-code expectations"
```

Skip the commit if nothing changed.

---

### Task 12: FE integration guide

**Files:**
- Create: `docs/fe-guides/qr-card-templates-fe-integration.md`

- [ ] **Step 1: Write the guide**

````markdown
# FE integration: QR card templates

Admins curate A6 card designs; hosts pick one when they print a QR. Design spec: the frontend repo's
`docs/superpowers/specs/2026-10-28-qr-card-templates-design.md`.

## Module

`qr_cards`. Offered to every event type, on **no plan** until an admin adds it (like `vendors`).
Every event's module row reads `isEnabled: true` whatever its plan, and a DRAFT's `isAvailable` is
always false, so neither flag says whether the event has QR cards. Gate on the host list's
`available` instead: it is true when the module is readable, drafts included.

## Host

`GET /api/events/{eventId}/qr-card-templates` (`ROLE_USER`; hosts and planners with QR read).

```json
{
  "available": true,
  "templates": [
    {
      "id": "0d6f…",
      "name": { "en": "Linen", "el": "Λινό" },
      "artworkUrl": "/api/qr-card-artwork/0d6f…/4",
      "textColor": "#5A3E2B",
      "headingFont": { "key": "playfair", "fallback": "serif", "url": "/api/theme-fonts/playfair/2.woff2" },
      "codeColor": "#241F1A",
      "dotShape": "ROUNDED",
      "cornerShape": "CIRCLE",
      "centerLogo": true
    }
  ]
}
```

`available: false` with `templates: []` when the module isn't readable. `available: true` with an empty
list when no template is offered for the event's type. `templates` is sorted, live, with artwork, for
the event's type. `headingFont` null = app font. 404 unknown event, 403 not a host/planner.

## Artwork file

`artworkUrl` is a frontend-origin path. Proxy it to
`GET {API}/api/qr-card-templates/{id}/artwork/{version}`: public, `image/png` or `image/webp`,
`Cache-Control: max-age=31536000, public, immutable`. Any other version, an unknown id or a malformed
path is 404.

## Admin

All `ROLE_ADMIN`.

| Call | Body / result |
| --- | --- |
| `GET /api/admin/qr-card-templates` | All templates, archived and without artwork included. |
| `POST /api/admin/qr-card-templates` | `{ name: {en, el}, eventTypes: [...], sortOrder?, textColor, headingFontId?, codeColor, dotShape, cornerShape, centerLogo }` → 201 |
| `PATCH /api/admin/qr-card-templates/{id}` | Any of the above plus `archived`, `clearHeadingFont`. Omitted fields stay. |
| `POST /api/admin/qr-card-templates/{id}/artwork` | Multipart `file`. PNG or WebP, ≤ 5 MB, A6 portrait (105:148 ± 2%), ≥ 1240 px wide. |

Admin shape adds `eventTypes` (sorted), `sortOrder`, `archived`, nullable `artworkUrl`, and `headingFont`
as `{ id, key, familyName, fallback, archived, url }`.

## Errors

| Code | When |
| --- | --- |
| 3001 | Bad hex colour, empty `eventTypes`, missing required field. An unknown shape is a 400 too. |
| 3018 | Unknown event type. |
| 3091 | Name not exactly `en` + `el`, or a name over 60 characters. |
| 3110 | `codeColor` under 4.5:1 against white. `details: { ratio, minimum }`. |
| 3111 | Artwork not A6 portrait or under 1240 px wide. |
| 5145 | Heading font archived, without a file, or unknown. |
| 413 / media codes | Artwork over 5 MB, wrong format or corrupt, as for theme illustrations. |

Every 4xx carries a localized `detail`.
````

- [ ] **Step 2: Commit**

```bash
git add docs/fe-guides/qr-card-templates-fe-integration.md
git commit -m "docs(qr-cards): add the FE integration guide"
```

---

### Task 13: Pull request into `staging`

- [ ] **Step 1: Bring the branch up to date and re-run the suite**

```bash
git fetch origin
git merge origin/staging
./gradlew test
```

Expected: `BUILD SUCCESSFUL`. If another branch has taken V184, 3110 or 3111 in the meantime, rename the migration and codes to the next free ones (the file isn't applied anywhere yet). Update the tests and the guide to match.

- [ ] **Step 2: Push and open the PR** (only once the user says to)

```bash
git push -u origin feat/qr-card-templates
gh pr create --base staging --title "feat: QR card templates" --body-file - <<'EOF'
Admin-curated A6 QR card templates per event type, behind a new opt-in `qr_cards` plan module.

- `qr_card_templates` catalog with artwork upload (A6 portrait, ≥ 1240 px wide)
- `GET /api/events/{eventId}/qr-card-templates` for hosts and planners: `{ available, templates }`
- Public, versioned artwork files for the frontend proxy
- Errors 3110 (code colour contrast) and 3111 (artwork size)
- FE guide: `docs/fe-guides/qr-card-templates-fe-integration.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```
