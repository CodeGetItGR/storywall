# QR card layout editor and A5 — backend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The frontend repo's CLAUDE.md forbids parallel subagents unless the user allows them for the task: run one task at a time.

**Goal:** QR card templates store an admin-made layout and their artwork's width, accept larger artwork (≥ 1748 px, ≤ 10 MB), and tell hosts which paper sizes (A6, A5) each template offers.

**Architecture:** One nullable JSONB column `layout` holds a `QrCardLayout` record (title, code and lines boxes in A6 millimetres), checked by a pure `QrCardLayoutValidator` on PATCH. A nullable `artwork_width` column is written on every artwork upload; the host DTO derives `sizes` from it. The artwork pipeline gets its own 10 MB cap through a new `ThemeIllustrationPipeline.validate(file, maxBytes)` overload.

**Tech Stack:** Spring Boot 3.3, JPA/Hibernate (JSON via `@JdbcTypeCode(SqlTypes.JSON)`, as `EventOrder.priceBreakdown`), Flyway (Postgres), MockMvc, JUnit 5, AssertJ.

**Spec:** [docs/superpowers/specs/2026-10-29-qr-card-layout-editor-design.md](../specs/2026-10-29-qr-card-layout-editor-design.md) in the frontend repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media`. Paths below are relative to it. `J = src/main/java/event_social_media`, `T = src/test/java/event_social_media`.

---

## File map

| File | Change |
| --- | --- |
| `src/main/resources/db/migration/V188__qr_card_layout.sql` | Create: `layout` and `artwork_width` columns. |
| `J/model/qrcard/QrCardLayout.java` | Create: the layout record and its three box records. |
| `J/model/qrcard/QrCardTemplate.java` | Modify: `layout`, `artworkWidth` fields. |
| `J/service/qrcard/QrCardLayoutValidator.java` | Create: rounding and every layout rule. |
| `J/exception/ErrorCode.java` | Modify: `QR_CARD_LAYOUT_INVALID(3113)`; update 3111's comment. |
| `src/main/resources/i18n/messages.properties`, `messages_el.properties` | Modify: layout messages, new artwork size text. |
| `J/service/theme/ThemeIllustrationPipeline.java` | Modify: `validate(file, maxBytes)` overload. |
| `J/service/qrcard/QrCardArtworkPipeline.java` | Modify: 1748 px, 10 MB, return the width. |
| `J/service/qrcard/QrCardTemplateAdminService.java` | Modify: PATCH `layout`; store `artworkWidth`; admin DTO fields. |
| `J/service/qrcard/QrCardTemplateService.java` | Modify: host DTO `layout` and `sizes`. |
| `J/dto/qrcard/QrCardTemplatePatchDto.java`, `QrCardTemplateAdminDto.java`, `QrCardTemplateDto.java` | Modify: new fields. |
| `docs/fe-guides/qr-card-templates-fe-integration.md` | Modify: the new contract. |
| Tests | `T/service/qrcard/QrCardLayoutValidatorTest.java` (create), `T/service/qrcard/QrCardArtworkPipelineTest.java` (create), `T/controller/qrcard/QrCardArtworkUploadTest.java`, `QrCardTemplateAdminControllerTest.java`, `QrCardTemplateControllerTest.java`, `T/exception/QrCardErrorCodesTest.java`, `T/migration/QrCardsMigrationTest.java` (modify). |

---

### Task 0: Worktree on the latest staging

The main checkout is on `staging` and other sessions use worktrees next to it. Work in a new worktree.

- [ ] **Step 1: Create the worktree**

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add ../event_social_media-qr-layout -b feat/qr-card-layout origin/staging
cd ../event_social_media-qr-layout
```

- [ ] **Step 2: Confirm the next free numbers**

```bash
git ls-tree -r --name-only HEAD src/main/resources/db/migration | sed 's/.*\/V\([0-9]*\)__.*/\1/' | sort -n | tail -1
grep -o -E "[A-Z_]+\(3[0-9]{3}\)" src/main/java/event_social_media/exception/ErrorCode.java | sort -t'(' -k2 -n | tail -1
```

Expected at plan time: `185` and `QR_CARD_ARTWORK_SIZE_INVALID(3111)`. If staging moved on, use the next free numbers everywhere this plan says `V188` and `3113`, including the FE guide (Task 8) and the frontend plan's `ERROR_CODES` entry.

- [ ] **Step 3: Baseline build**

Run: `./gradlew compileJava compileTestJava`
Expected: `BUILD SUCCESSFUL`.

---

### Task 1: Migration and entity fields

**Files:**
- Create: `src/main/resources/db/migration/V188__qr_card_layout.sql`
- Create: `J/model/qrcard/QrCardLayout.java`
- Modify: `J/model/qrcard/QrCardTemplate.java`
- Test: `T/migration/QrCardsMigrationTest.java`

- [ ] **Step 1: Write the failing migration test**

Add to `QrCardsMigrationTest` (it already runs Flyway against Postgres with `ddl-auto=validate`, so the entity mapping is checked too):

```java
    @Test
    void layoutAndArtworkWidthAreNullableColumns() {
        jdbc.update("insert into qr_card_templates (id, name, text_color, code_color) "
                + "values (gen_random_uuid(), '{\"en\":\"mig-test-layout\",\"el\":\"x\"}'::jsonb, '#241F1A', '#241F1A')");
        Map<String, Object> row = jdbc.queryForMap(
                "select layout, artwork_width from qr_card_templates where name ->> 'en' = 'mig-test-layout'");
        assertThat(row.get("layout")).isNull();
        assertThat(row.get("artwork_width")).isNull();
    }

    @Test
    void artworkWidthMustBePositive() {
        assertThatThrownBy(() -> jdbc.update("insert into qr_card_templates (id, name, text_color, code_color, artwork_width) "
                + "values (gen_random_uuid(), '{\"en\":\"mig-test-width\",\"el\":\"x\"}'::jsonb, '#241F1A', '#241F1A', 0)"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
```

Add imports if missing: `java.util.Map`, `static org.assertj.core.api.Assertions.assertThatThrownBy`, `org.springframework.dao.DataIntegrityViolationException`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.migration.QrCardsMigrationTest"`
Expected: FAIL, `column "layout" does not exist`.

- [ ] **Step 3: Write the migration**

`src/main/resources/db/migration/V188__qr_card_layout.sql`:

```sql
-- QR card layout editor and A5: see the frontend repo's docs/superpowers/specs/2026-10-29-qr-card-layout-editor-design.md.

-- The admin-made layout (title, code and lines boxes in A6 millimetres). Null = the default layout,
-- which the frontend owns. Checked by QrCardLayoutValidator, not by the database.
ALTER TABLE qr_card_templates ADD COLUMN layout JSONB;

-- The uploaded artwork's width in pixels, written on every upload. Null for artwork uploaded before
-- V188: such a template offers A6 only until new artwork is uploaded.
ALTER TABLE qr_card_templates ADD COLUMN artwork_width INTEGER;
ALTER TABLE qr_card_templates ADD CONSTRAINT qr_card_templates_artwork_width_check CHECK (artwork_width > 0);
```

- [ ] **Step 4: Write the layout record**

`J/model/qrcard/QrCardLayout.java`:

```java
package event_social_media.model.qrcard;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Where a QR card template puts its title, code and lines, in A6 millimetres from the card's top-left
 * corner. A5 is the same card drawn larger, so one layout serves both sizes. Stored as JSON on
 * {@code qr_card_templates.layout}; null there means the frontend's default layout. Checked by
 * {@code QrCardLayoutValidator}.
 *
 * <p>Stored for the life of the template, so the shape may only grow: an unknown field is ignored on read.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record QrCardLayout(TitleBox title, CodeBox code, LinesBox lines) {

    /** {@code maxSize}: the title's largest font size in mm. {@code align}: left, center or right. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TitleBox(double x, double y, double width, double height, double maxSize, String align) {
    }

    /** {@code size}: the square the code and its quiet zone fill. {@code radius}: the white panel's corners. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CodeBox(double x, double y, double size, boolean panel, double radius) {
    }

    /** {@code textSize}: the body line's largest font size in mm; the other tones keep their proportions to it. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LinesBox(double x, double y, double width, double height, double textSize, String align) {
    }
}
```

- [ ] **Step 5: Add the entity fields**

In `J/model/qrcard/QrCardTemplate.java`, after `centerLogo`:

```java
    /** Null means the default layout. Validated by {@code QrCardLayoutValidator} before it is set. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "layout")
    private QrCardLayout layout;

    /** The artwork's width in pixels, set on every upload; null for artwork uploaded before V188. */
    @Column(name = "artwork_width")
    private Integer artworkWidth;
```

Update the class Javadoc's first sentence to: "One printable QR card design: full-card artwork with the title, the code and the lines laid on top by the frontend, where {@link #layout} puts them."

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.migration.QrCardsMigrationTest"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V188__qr_card_layout.sql src/main/java/event_social_media/model/qrcard src/test/java/event_social_media/migration/QrCardsMigrationTest.java
git commit -m "feat(qr-cards): layout and artwork width columns"
```

---

### Task 2: Error code and messages

**Files:**
- Modify: `J/exception/ErrorCode.java`
- Modify: `src/main/resources/i18n/messages.properties`, `messages_el.properties`
- Test: `T/exception/QrCardErrorCodesTest.java`

- [ ] **Step 1: Write the failing tests**

In `QrCardErrorCodesTest`, extend `theCodesAreNumbered`:

```java
        assertThat(ErrorCode.QR_CARD_LAYOUT_INVALID.getCode()).isEqualTo(3113);
```

Add the six layout keys (all thrown without args) to the `@ValueSource` of `messagesWithoutArgs_haveEnglishAndGreek_andNoDoubledApostrophes`:

```java
    @ValueSource(strings = {"error.qr_card.not_found", "error.qr_card.load_failed",
            "error.qr_card.layout_missing", "error.qr_card.layout_outside", "error.qr_card.layout_too_small",
            "error.qr_card.layout_out_of_range", "error.qr_card.layout_align", "error.qr_card.layout_overlap"})
```

In `messagesWithArgs_formatInBothLanguages`, add:

```java
        assertThat(source.getMessage("error.qr_card.artwork_size", new Object[]{"1240", "1748"}, Locale.ENGLISH))
                .contains("1748 px wide").contains("1240 × 1748 px");
```

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.exception.QrCardErrorCodesTest"`
Expected: FAIL to compile, `QR_CARD_LAYOUT_INVALID` not found.

- [ ] **Step 3: Add the code**

In `ErrorCode.java`, change 3111's comment and add 3113 after it:

```java
    /** 3111 — A QR card template's artwork isn't A6 portrait (105:148 within 2%) or is under 1748 px wide. The detail is localized. {@code 400}. */
    QR_CARD_ARTWORK_SIZE_INVALID(3111),

    /** 3113 — A QR card template's layout breaks a rule (missing box, outside the safe area, too small, out of range, unknown alignment, overlap). The detail is localized. {@code 400}. */
    QR_CARD_LAYOUT_INVALID(3113),
```

- [ ] **Step 4: Add the messages**

`messages.properties`: replace the `error.qr_card.artwork_size` line and add the layout lines after `error.qr_card.load_failed`. Keys thrown without args use a single apostrophe; keys with args double it.

```properties
error.qr_card.artwork_size=The artwork must be an A6 portrait image (105 × 148) at least 1748 px wide. This one is {0} × {1} px. Export it again at that shape and size.
error.qr_card.layout_missing=The layout needs a title, a code and lines. Reset the layout and try again.
error.qr_card.layout_outside=Everything on the card must stay inside the 8 mm margin. Move it back inside.
error.qr_card.layout_too_small=A box on the card is too small. Make it bigger.
error.qr_card.layout_out_of_range=A size on the card is out of range. Reset the layout and try again.
error.qr_card.layout_align=Text alignment must be left, centre or right.
error.qr_card.layout_overlap=The title, the code and the lines can't overlap. Move them apart.
```

`messages_el.properties` (admin copy: formal plural):

```properties
error.qr_card.artwork_size=Το σχέδιο πρέπει να είναι κάθετη εικόνα A6 (105 × 148) με πλάτος τουλάχιστον 1748 px. Αυτό είναι {0} × {1} px. Εξαγάγετέ το ξανά σε αυτό το σχήμα και μέγεθος.
error.qr_card.layout_missing=Η διάταξη χρειάζεται τίτλο, κωδικό και γραμμές. Επαναφέρετε τη διάταξη και δοκιμάστε ξανά.
error.qr_card.layout_outside=Όλα τα στοιχεία της κάρτας πρέπει να μένουν μέσα στο περιθώριο των 8 mm. Μετακινήστε τα μέσα.
error.qr_card.layout_too_small=Ένα πλαίσιο της κάρτας είναι πολύ μικρό. Μεγαλώστε το.
error.qr_card.layout_out_of_range=Ένα μέγεθος της κάρτας είναι εκτός ορίων. Επαναφέρετε τη διάταξη και δοκιμάστε ξανά.
error.qr_card.layout_align=Η στοίχιση κειμένου πρέπει να είναι αριστερά, στο κέντρο ή δεξιά.
error.qr_card.layout_overlap=Ο τίτλος, ο κωδικός και οι γραμμές δεν μπορούν να επικαλύπτονται. Απομακρύνετέ τα.
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.exception.QrCardErrorCodesTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/exception/ErrorCode.java src/main/resources/i18n src/test/java/event_social_media/exception/QrCardErrorCodesTest.java
git commit -m "feat(qr-cards): layout error code and messages"
```

---

### Task 3: Layout validator

**Files:**
- Create: `J/service/qrcard/QrCardLayoutValidator.java`
- Test: `T/service/qrcard/QrCardLayoutValidatorTest.java`

The rules (spec, "Layout"): safe area x 8–97, y 8–140; title width ≥ 20, height ≥ 6, maxSize 5–16; code size 30–89, radius 0–8; lines width ≥ 20, height ≥ 8, textSize 3–10; align left/center/right; no two boxes overlap (touching edges is fine); numbers rounded to 0.1 mm first. A 0.001 mm tolerance absorbs floating-point noise on the edges.

- [ ] **Step 1: Write the failing test**

`T/service/qrcard/QrCardLayoutValidatorTest.java`:

```java
package event_social_media.service.qrcard;

import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.qrcard.QrCardLayout;
import event_social_media.model.qrcard.QrCardLayout.CodeBox;
import event_social_media.model.qrcard.QrCardLayout.LinesBox;
import event_social_media.model.qrcard.QrCardLayout.TitleBox;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QrCardLayoutValidatorTest {

    private static final UUID ACTOR = UUID.randomUUID();
    private static final TitleBox TITLE = new TitleBox(8, 10, 89, 26, 9, "center");
    private static final CodeBox CODE = new CodeBox(20.5, 40, 64, true, 4);
    private static final LinesBox LINES = new LinesBox(8, 107, 89, 33, 5, "center");
    /** The frontend's default layout: today's fixed spots. */
    private static final QrCardLayout DEFAULT = new QrCardLayout(TITLE, CODE, LINES);

    @Test
    void theDefaultLayoutIsValid_andComesBackUnchanged() {
        assertThat(QrCardLayoutValidator.validated(DEFAULT, ACTOR)).isEqualTo(DEFAULT);
    }

    @Test
    void roundsToATenthOfAMillimetre() {
        QrCardLayout layout = new QrCardLayout(new TitleBox(8.04, 10.06, 89, 26, 9.01, "left"), CODE, LINES);
        QrCardLayout validated = QrCardLayoutValidator.validated(layout, ACTOR);
        assertThat(validated.title().x()).isEqualTo(8.0);
        assertThat(validated.title().y()).isEqualTo(10.1);
        assertThat(validated.title().maxSize()).isEqualTo(9.0);
    }

    @Test
    void touchingEdgesIsNotAnOverlap() {
        // The code's bottom edge (40 + 64 = 104) meets the lines' top edge.
        QrCardLayout layout = new QrCardLayout(TITLE, CODE, new LinesBox(8, 104, 89, 36, 5, "center"));
        assertThat(QrCardLayoutValidator.validated(layout, ACTOR)).isNotNull();
    }

    @Test
    void aMissingBoxIsRejected() {
        assertRejected(new QrCardLayout(TITLE, null, LINES), "error.qr_card.layout_missing");
        assertRejected(null, "error.qr_card.layout_missing");
    }

    @Test
    void aBoxOutsideTheSafeAreaIsRejected() {
        assertRejected(new QrCardLayout(new TitleBox(7.9, 10, 89, 26, 9, "center"), CODE, LINES), "error.qr_card.layout_outside");
        assertRejected(new QrCardLayout(TITLE, new CodeBox(40, 40, 64, true, 4), LINES), "error.qr_card.layout_outside");
        assertRejected(new QrCardLayout(TITLE, CODE, new LinesBox(8, 107, 89, 34, 5, "center")), "error.qr_card.layout_outside");
        assertRejected(new QrCardLayout(new TitleBox(Double.NaN, 10, 89, 26, 9, "center"), CODE, LINES), "error.qr_card.layout_outside");
    }

    @Test
    void aBoxThatIsTooSmallIsRejected() {
        assertRejected(new QrCardLayout(new TitleBox(8, 10, 19.9, 26, 9, "center"), CODE, LINES), "error.qr_card.layout_too_small");
        assertRejected(new QrCardLayout(new TitleBox(8, 10, 89, 5.9, 9, "center"), CODE, LINES), "error.qr_card.layout_too_small");
        assertRejected(new QrCardLayout(TITLE, new CodeBox(20.5, 40, 29.9, true, 4), LINES), "error.qr_card.layout_too_small");
        assertRejected(new QrCardLayout(TITLE, CODE, new LinesBox(8, 107, 89, 7.9, 5, "center")), "error.qr_card.layout_too_small");
    }

    @Test
    void sizesOutOfRangeAreRejected() {
        assertRejected(new QrCardLayout(new TitleBox(8, 10, 89, 26, 16.1, "center"), CODE, LINES), "error.qr_card.layout_out_of_range");
        assertRejected(new QrCardLayout(new TitleBox(8, 10, 89, 26, 4.9, "center"), CODE, LINES), "error.qr_card.layout_out_of_range");
        assertRejected(new QrCardLayout(TITLE, new CodeBox(20.5, 40, 64, true, 8.1), LINES), "error.qr_card.layout_out_of_range");
        assertRejected(new QrCardLayout(TITLE, CODE, new LinesBox(8, 107, 89, 33, 10.1, "center")), "error.qr_card.layout_out_of_range");
        assertRejected(new QrCardLayout(TITLE, CODE, new LinesBox(8, 107, 89, 33, 2.9, "center")), "error.qr_card.layout_out_of_range");
    }

    @Test
    void anUnknownAlignmentIsRejected() {
        assertRejected(new QrCardLayout(new TitleBox(8, 10, 89, 26, 9, "justify"), CODE, LINES), "error.qr_card.layout_align");
        assertRejected(new QrCardLayout(TITLE, CODE, new LinesBox(8, 107, 89, 33, 5, null)), "error.qr_card.layout_align");
    }

    @Test
    void overlappingBoxesAreRejected() {
        assertRejected(new QrCardLayout(new TitleBox(8, 10, 89, 31, 9, "center"), CODE, LINES), "error.qr_card.layout_overlap");
        assertRejected(new QrCardLayout(TITLE, CODE, new LinesBox(8, 103.9, 89, 33, 5, "center")), "error.qr_card.layout_overlap");
    }

    private static void assertRejected(QrCardLayout layout, String messageKey) {
        assertThatThrownBy(() -> QrCardLayoutValidator.validated(layout, ACTOR))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> {
                    BadRequestException bad = (BadRequestException) ex;
                    assertThat(bad.getErrorCode()).isEqualTo(ErrorCode.QR_CARD_LAYOUT_INVALID);
                    assertThat(bad.getMessageKey()).isEqualTo(messageKey);
                });
    }
}
```

`getErrorCode()` and `getMessageKey()` come from `ApiException`'s Lombok `@Getter`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.qrcard.QrCardLayoutValidatorTest"`
Expected: FAIL to compile, `QrCardLayoutValidator` not found.

- [ ] **Step 3: Write the validator**

`J/service/qrcard/QrCardLayoutValidator.java`:

```java
package event_social_media.service.qrcard;

import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.qrcard.QrCardLayout;
import event_social_media.model.qrcard.QrCardLayout.CodeBox;
import event_social_media.model.qrcard.QrCardLayout.LinesBox;
import event_social_media.model.qrcard.QrCardLayout.TitleBox;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The QR card layout rules (layout editor spec, "Layout"), in A6 millimetres. The editor never lets an
 * admin break them; this is the authority. Rounds every number to 0.1 mm, then checks.
 */
@Slf4j
public final class QrCardLayoutValidator {

    static final double SAFE_LEFT = 8;
    static final double SAFE_TOP = 8;
    static final double SAFE_RIGHT = 97;
    static final double SAFE_BOTTOM = 140;
    static final double TEXT_MIN_WIDTH = 20;
    static final double TITLE_MIN_HEIGHT = 6;
    static final double LINES_MIN_HEIGHT = 8;
    static final double TITLE_MIN_SIZE = 5;
    static final double TITLE_MAX_SIZE = 16;
    static final double CODE_MIN_SIZE = 30;
    static final double CODE_MAX_SIZE = 89;
    static final double RADIUS_MAX = 8;
    static final double LINES_MIN_TEXT = 3;
    static final double LINES_MAX_TEXT = 10;
    private static final double EPSILON = 0.001;
    private static final Set<String> ALIGNMENTS = Set.of("left", "center", "right");

    private QrCardLayoutValidator() {
    }

    /** The layout rounded to 0.1 mm. @throws BadRequestException 3113 naming the first broken rule */
    public static QrCardLayout validated(QrCardLayout layout, UUID actorId) {
        if (layout == null || layout.title() == null || layout.code() == null || layout.lines() == null) {
            throw rejected("missing", actorId);
        }
        TitleBox t = layout.title();
        CodeBox c = layout.code();
        LinesBox l = layout.lines();
        TitleBox title = new TitleBox(round(t.x()), round(t.y()), round(t.width()), round(t.height()), round(t.maxSize()), t.align());
        CodeBox code = new CodeBox(round(c.x()), round(c.y()), round(c.size()), c.panel(), round(c.radius()));
        LinesBox lines = new LinesBox(round(l.x()), round(l.y()), round(l.width()), round(l.height()), round(l.textSize()), l.align());

        List<Rect> rects = List.of(
                new Rect(title.x(), title.y(), title.width(), title.height()),
                new Rect(code.x(), code.y(), code.size(), code.size()),
                new Rect(lines.x(), lines.y(), lines.width(), lines.height()));
        for (Rect rect : rects) {
            if (!rect.insideSafeArea()) throw rejected("outside", actorId);
        }
        if (title.width() < TEXT_MIN_WIDTH - EPSILON || title.height() < TITLE_MIN_HEIGHT - EPSILON
                || code.size() < CODE_MIN_SIZE - EPSILON
                || lines.width() < TEXT_MIN_WIDTH - EPSILON || lines.height() < LINES_MIN_HEIGHT - EPSILON) {
            throw rejected("too_small", actorId);
        }
        if (!within(title.maxSize(), TITLE_MIN_SIZE, TITLE_MAX_SIZE) || !within(code.size(), CODE_MIN_SIZE, CODE_MAX_SIZE)
                || !within(code.radius(), 0, RADIUS_MAX) || !within(lines.textSize(), LINES_MIN_TEXT, LINES_MAX_TEXT)) {
            throw rejected("out_of_range", actorId);
        }
        // Null first: Set.of(...).contains(null) throws.
        if (title.align() == null || lines.align() == null
                || !ALIGNMENTS.contains(title.align()) || !ALIGNMENTS.contains(lines.align())) {
            throw rejected("align", actorId);
        }
        for (int i = 0; i < rects.size(); i++) {
            for (int j = i + 1; j < rects.size(); j++) {
                if (rects.get(i).overlaps(rects.get(j))) throw rejected("overlap", actorId);
            }
        }
        return new QrCardLayout(title, code, lines);
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private static boolean within(double value, double min, double max) {
        return value >= min - EPSILON && value <= max + EPSILON;
    }

    private static BadRequestException rejected(String reason, UUID actorId) {
        log.warn("QR card template write rejected: reason=layout_{} actorId={}", reason, actorId);
        return new BadRequestException(ErrorCode.QR_CARD_LAYOUT_INVALID, "The card layout breaks a rule: " + reason + ".",
                "error.qr_card.layout_" + reason);
    }

    private record Rect(double x, double y, double width, double height) {
        /** NaN fails every comparison, so a NaN box lands here too. */
        boolean insideSafeArea() {
            return x >= SAFE_LEFT - EPSILON && y >= SAFE_TOP - EPSILON
                    && x + width <= SAFE_RIGHT + EPSILON && y + height <= SAFE_BOTTOM + EPSILON;
        }

        /** Strict: boxes that only touch don't overlap. */
        boolean overlaps(Rect other) {
            return x < other.x + other.width - EPSILON && other.x < x + width - EPSILON
                    && y < other.y + other.height - EPSILON && other.y < y + height - EPSILON;
        }
    }
}
```

`new BadRequestException(errorCode, message, messageKey)` with no args is the same constructor `QrCardTemplateAdminService.rejected` uses (varargs `messageArgs` empty), so Spring skips `MessageFormat` and the single apostrophes in Task 2 show as written.

- [ ] **Step 4: Run the test**

Run: `./gradlew test --tests "event_social_media.service.qrcard.QrCardLayoutValidatorTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/qrcard/QrCardLayoutValidator.java src/test/java/event_social_media/service/qrcard/QrCardLayoutValidatorTest.java
git commit -m "feat(qr-cards): layout validator"
```

---

### Task 4: PATCH `layout`, admin DTO fields

**Files:**
- Modify: `J/dto/qrcard/QrCardTemplatePatchDto.java`
- Modify: `J/dto/qrcard/QrCardTemplateAdminDto.java`
- Modify: `J/service/qrcard/QrCardTemplateAdminService.java`
- Test: `T/controller/qrcard/QrCardTemplateAdminControllerTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `QrCardTemplateAdminControllerTest`:

```java
    private static final String LAYOUT = "{\"title\":{\"x\":8,\"y\":10,\"width\":60,\"height\":20,\"maxSize\":12,\"align\":\"left\"},"
            + "\"code\":{\"x\":60,\"y\":96,\"size\":37,\"panel\":false,\"radius\":0},"
            + "\"lines\":{\"x\":8,\"y\":40,\"width\":89,\"height\":20,\"textSize\":6.04,\"align\":\"right\"}}";

    @Test
    void patch_savesALayout_roundedToATenth() throws Exception {
        QrCardTemplate template = template();
        mockMvc.perform(as(admin, "ROLE_ADMIN", patch(URL + "/" + template.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"layout\":" + LAYOUT + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.layout.title.align").value("left"))
                .andExpect(jsonPath("$.layout.code.panel").value(false))
                .andExpect(jsonPath("$.layout.lines.textSize").value(6.0))
                .andExpect(jsonPath("$.artworkWidth").value(nullValue()));
        QrCardTemplate stored = repository.findById(template.getId()).orElseThrow();
        assertEquals(37.0, stored.getLayout().code().size());
        assertEquals("right", stored.getLayout().lines().align());
    }

    @Test
    void patch_withoutLayout_keepsTheStoredOne() throws Exception {
        QrCardTemplate template = template();
        mockMvc.perform(as(admin, "ROLE_ADMIN", patch(URL + "/" + template.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"layout\":" + LAYOUT + "}"))
                .andExpect(status().isOk());
        mockMvc.perform(as(admin, "ROLE_ADMIN", patch(URL + "/" + template.getId())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"textColor\":\"#112233\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.layout.code.size").value(37.0));
    }

    @Test
    void patch_rejectsAnOverlappingLayout_inTheAdminsLanguage_andKeepsTheOldOne() throws Exception {
        QrCardTemplate template = template();
        String overlapping = LAYOUT.replace("\"y\":96", "\"y\":50");
        mockMvc.perform(as(admin, "ROLE_ADMIN", patch(URL + "/" + template.getId())).contentType(MediaType.APPLICATION_JSON)
                        .header("Accept-Language", "en").content("{\"layout\":" + overlapping + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(3113))
                .andExpect(jsonPath("$.detail").value(containsString("can't overlap")));
        assertNull(repository.findById(template.getId()).orElseThrow().getLayout());
    }

    @Test
    void findAll_showsANullLayoutForAnUntouchedTemplate() throws Exception {
        QrCardTemplate template = template();
        mockMvc.perform(as(admin, "ROLE_ADMIN", get(URL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + template.getId() + "')].layout").value(contains(nullValue())));
    }
```

Add `import static org.hamcrest.Matchers.contains;` if missing.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateAdminControllerTest"`
Expected: the new tests FAIL (no `layout` in the response; the overlapping layout is accepted as an unknown field).

- [ ] **Step 3: Add the DTO fields**

`QrCardTemplatePatchDto`, after `centerLogo`:

```java
    /** A full layout replaces the stored one; omitted, it stays. Checked by {@code QrCardLayoutValidator}. */
    private QrCardLayout layout;
```

`QrCardTemplateAdminDto`, after `centerLogo`:

```java
    /** Null means the default layout. */
    private QrCardLayout layout;
    /** The artwork's width in pixels; null without artwork, or for artwork uploaded before V188. */
    private Integer artworkWidth;
```

Import `event_social_media.model.qrcard.QrCardLayout` in both.

- [ ] **Step 4: Apply the layout in the service and map the DTO**

In `QrCardTemplateAdminService.patch`, after the `centerLogo` line:

```java
        if (dto.getLayout() != null) template.setLayout(QrCardLayoutValidator.validated(dto.getLayout(), actorId));
```

In the static `toDto(QrCardTemplate, Map<UUID, ThemeFont>)`, after `setCenterLogo`:

```java
        dto.setLayout(template.getLayout());
        dto.setArtworkWidth(template.getArtworkWidth());
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateAdminControllerTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/qrcard src/main/java/event_social_media/service/qrcard/QrCardTemplateAdminService.java src/test/java/event_social_media/controller/qrcard/QrCardTemplateAdminControllerTest.java
git commit -m "feat(qr-cards): save a template layout"
```

---

### Task 5: Artwork at 1748 px and 10 MB, width stored

**Files:**
- Modify: `J/service/theme/ThemeIllustrationPipeline.java`
- Modify: `J/service/qrcard/QrCardArtworkPipeline.java`
- Modify: `J/service/qrcard/QrCardTemplateAdminService.java`
- Create: `T/service/qrcard/QrCardArtworkPipelineTest.java`
- Modify: `T/controller/qrcard/QrCardArtworkUploadTest.java`

- [ ] **Step 1: Write the failing pipeline test**

`T/service/qrcard/QrCardArtworkPipelineTest.java`. Like `ThemeIllustrationPipelineTest`, it writes the size into the PNG header and pads the file, so no large image is ever drawn:

```java
package event_social_media.service.qrcard;

import event_social_media.exception.BadRequestException;
import event_social_media.exception.MediaRejectedException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
class QrCardArtworkPipelineTest {

    @Autowired private QrCardArtworkPipeline pipeline;

    @Test
    void acceptsA5Width_andReturnsIt() throws IOException {
        assertThat(pipeline.validate(png(1748, 2463, 0)).width()).isEqualTo(1748);
    }

    @Test
    void refusesUnder1748() throws IOException {
        assertThrows(BadRequestException.class, () -> pipeline.validate(png(1747, 2462, 0)));
        assertThrows(BadRequestException.class, () -> pipeline.validate(png(1240, 1748, 0)));
    }

    @Test
    void acceptsUpTo10Megabytes_andRefusesMore() throws IOException {
        assertThat(pipeline.validate(png(1748, 2463, 6 * 1024 * 1024)).width()).isEqualTo(1748);
        assertThrows(MediaRejectedException.class, () -> pipeline.validate(png(1748, 2463, 10 * 1024 * 1024 + 1)));
    }

    /** An 8 × 8 PNG whose header claims width × height, padded to totalBytes when that is larger. */
    private static MockMultipartFile png(int width, int height, int totalBytes) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_ARGB), "png", out);
        byte[] small = out.toByteArray();
        byte[] bytes = new byte[Math.max(small.length, totalBytes)];
        System.arraycopy(small, 0, bytes, 0, small.length);
        ByteBuffer.wrap(bytes).putInt(16, width).putInt(20, height);
        return new MockMultipartFile("file", "card.png", "image/png", bytes);
    }
}
```

1748 × 2463 is 105:148 to within 0.1%.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.qrcard.QrCardArtworkPipelineTest"`
Expected: FAIL to compile, `validate(...)` returns `DetectedMediaType`, which has no `width()`.

- [ ] **Step 3: Add the byte-limit overload**

In `ThemeIllustrationPipeline`, replace `validate(MultipartFile file)` with:

```java
    /**
     * Checks format (sniffed, not the declared content type), byte size and pixel size.
     *
     * @throws MediaRejectedException with the matching reason when any check fails
     */
    public DetectedMediaType validate(MultipartFile file) throws IOException {
        return validate(file, MAX_BYTES);
    }

    /** As {@link #validate(MultipartFile)}, with a caller's own byte cap (QR card artwork allows more). */
    public DetectedMediaType validate(MultipartFile file, long maxBytes) throws IOException {
        DetectedMediaType detected = mediaTypeDetector.detect(file);
        if (!ALLOWED_MIME_TYPES.contains(detected.mimeType())) {
            throw MediaRejectedException.unsupportedFormat(detected.mimeType(), ALLOWED_MIME_TYPES);
        }
        if (file.getSize() > maxBytes) {
            throw MediaRejectedException.tooLarge(detected.kind().name(), maxBytes, file.getSize());
        }
        Dimension size = dimensions(file.getBytes(), detected.mimeType());
        if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
            log.info("Rejected {} theme illustration: {}x{} exceeds the {} px per-side cap",
                    detected.mimeType(), size.width, size.height, MAX_SIDE);
            throw MediaRejectedException.sideTooLong(size.width, size.height, MAX_SIDE);
        }
        return detected;
    }
```

- [ ] **Step 4: Raise the QR card limits and return the width**

Replace the body of `QrCardArtworkPipeline` (keep the `store` method as it is):

```java
/**
 * A QR card template's artwork: the theme illustration checks (PNG or WebP, at most 4096 px a side)
 * with a 10 MB cap, plus the card's shape. It fills an A6 portrait card and also prints at A5, so it
 * must be 105:148 within 2% and at least 1748 px wide, which is 300 dpi at A5's 148 mm.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QrCardArtworkPipeline {

    /** 300 dpi at A5. The host list offers A5 only for artwork at least this wide. */
    public static final int MIN_WIDTH = 1748;
    static final long MAX_BYTES = 10L * 1024 * 1024;
    static final double A6_RATIO = 105.0 / 148.0;
    static final double RATIO_TOLERANCE = 0.02;

    private final ThemeIllustrationPipeline illustrationPipeline;

    /** What {@link #validate} learned: the sniffed type, and the width to store on the template. */
    public record ValidatedArtwork(DetectedMediaType detected, int width) {
    }

    /** @throws BadRequestException 3111 when the shape or width is wrong, after the illustration checks pass */
    public ValidatedArtwork validate(MultipartFile file) throws IOException {
        DetectedMediaType detected = illustrationPipeline.validate(file, MAX_BYTES);
        Dimension size = illustrationPipeline.dimensions(file.getBytes(), detected.mimeType());
        double ratio = (double) size.width / size.height;
        if (size.width < MIN_WIDTH || Math.abs(ratio - A6_RATIO) / A6_RATIO > RATIO_TOLERANCE) {
            log.info("Rejected QR card artwork: {}x{} is not A6 portrait at {} px or wider",
                    size.width, size.height, MIN_WIDTH);
            // Strings, not ints: MessageFormat would group 1748 as "1,748".
            throw new BadRequestException(ErrorCode.QR_CARD_ARTWORK_SIZE_INVALID,
                    "The artwork must be A6 portrait, at least " + MIN_WIDTH + " px wide.",
                    "error.qr_card.artwork_size", String.valueOf(size.width), String.valueOf(size.height));
        }
        return new ValidatedArtwork(detected, size.width);
    }
```

- [ ] **Step 5: Store the width on upload**

In `QrCardTemplateAdminService.uploadArtwork`:

```java
        String newKey;
        int width;
        try {
            QrCardArtworkPipeline.ValidatedArtwork artwork = artworkPipeline.validate(file);
            width = artwork.width();
            newKey = artworkPipeline.store(file, artwork.detected(),
                    (in, length, mime, ext) -> {
```

(the rest of the `try` is unchanged), then:

```java
            oldKey = writeArtworkKey(id, newKey, width);
```

and in `writeArtworkKey`, take the width and set it with the key:

```java
    /** Sets the key, its width and the next version on the locked row in its own committed transaction; returns the old key. */
    private String writeArtworkKey(UUID id, String newKey, int width) {
        ...
            template.setArtworkKey(newKey);
            template.setArtworkWidth(width);
            template.setArtworkVersion(template.getArtworkVersion() + 1);
```

- [ ] **Step 6: Update the upload test**

In `QrCardArtworkUploadTest`:

- Every `png(1240, 1748)` becomes `png(1748, 2463)`.
- In `upload_storesTheArtwork_bumpsTheVersion_andDeletesTheOldFile`, after the version assert, add `assertEquals(1748, saved.getArtworkWidth());` and add `.andExpect(jsonPath("$.artworkWidth").value(1748))` to the request.
- In `upload_rejectsArtworkThatIsTooNarrowOrNotA6`, the list becomes `List.of(png(1240, 1748), png(1747, 2462), png(1748, 1748), png(2463, 1748))`.

These tests draw real images; a blank 1748 × 2463 ARGB PNG compresses to a few kB, so they stay fast.

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.qrcard.QrCardArtworkPipelineTest" --tests "event_social_media.controller.qrcard.QrCardArtworkUploadTest" --tests "event_social_media.service.theme.ThemeIllustrationPipelineTest"`
Expected: PASS. `ThemeIllustrationPipelineTest.overFiveMegabytes_isRefused` still passes: theme illustrations keep 5 MB.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/service src/test/java/event_social_media/service/qrcard/QrCardArtworkPipelineTest.java src/test/java/event_social_media/controller/qrcard/QrCardArtworkUploadTest.java
git commit -m "feat(qr-cards): A5-ready artwork, up to 10 MB, width stored"
```

---

### Task 6: Host DTO `layout` and `sizes`

**Files:**
- Modify: `J/dto/qrcard/QrCardTemplateDto.java`
- Modify: `J/service/qrcard/QrCardTemplateService.java`
- Test: `T/controller/qrcard/QrCardTemplateControllerTest.java`

- [ ] **Step 1: Write the failing test**

Add to `QrCardTemplateControllerTest`:

```java
    @Test
    void sizesFollowTheArtworkWidth_andLayoutPassesThrough() throws Exception {
        User host = fixtures.newUser();
        Event event = eventWithModule(fixtures.newEventHostedBy(host));
        QrCardTemplate old = save(event.getEventType(), 0, "old.png", false);
        QrCardTemplate narrow = save(event.getEventType(), 1, "narrow.png", false);
        narrow.setArtworkWidth(1500);
        QrCardTemplate wide = save(event.getEventType(), 2, "wide.webp", false);
        wide.setArtworkWidth(1748);
        wide.setLayout(new QrCardLayout(new QrCardLayout.TitleBox(8, 10, 89, 26, 9, "left"),
                new QrCardLayout.CodeBox(20.5, 40, 64, false, 0), new QrCardLayout.LinesBox(8, 107, 89, 33, 5, "center")));
        repository.saveAll(List.of(narrow, wide));

        mockMvc.perform(as(host, get("/api/events/" + event.getId() + "/qr-card-templates")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templates[0].id").value(old.getId().toString()))
                .andExpect(jsonPath("$.templates[0].sizes", contains("A6")))
                .andExpect(jsonPath("$.templates[0].layout").value(nullValue()))
                .andExpect(jsonPath("$.templates[1].sizes", contains("A6")))
                .andExpect(jsonPath("$.templates[2].sizes", contains("A6", "A5")))
                .andExpect(jsonPath("$.templates[2].layout.title.align").value("left"))
                .andExpect(jsonPath("$.templates[2].layout.code.panel").value(false));
    }
```

Add imports if missing: `event_social_media.model.qrcard.QrCardLayout`, `java.util.List`, `static org.hamcrest.Matchers.contains`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.QrCardTemplateControllerTest"`
Expected: FAIL, no `sizes` in the response.

- [ ] **Step 3: Extend the host DTO**

`J/dto/qrcard/QrCardTemplateDto.java`:

```java
/**
 * One template in the host's print-card picker. {@code artworkUrl} is a frontend-origin path.
 * {@code layout} is null for the default layout. {@code sizes} lists the paper sizes it prints at,
 * smallest first: A6 always, A5 when the artwork is wide enough.
 */
public record QrCardTemplateDto(UUID id, Map<String, String> name, String artworkUrl, String textColor,
                                EventThemeFontDto headingFont, String codeColor,
                                boolean centerLogo, QrCardLayout layout, List<String> sizes) {
}
```

Import `event_social_media.model.qrcard.QrCardLayout` and `java.util.List`.

- [ ] **Step 4: Fill them in the service**

In `QrCardTemplateService`, add:

```java
    private static final List<String> A6_ONLY = List.of("A6");
    private static final List<String> A6_AND_A5 = List.of("A6", "A5");

    /** A5 needs 300 dpi at 148 mm. Artwork from before V188 has no recorded width: A6 only. */
    static List<String> sizesFor(QrCardTemplate template) {
        Integer width = template.getArtworkWidth();
        return width != null && width >= QrCardArtworkPipeline.MIN_WIDTH ? A6_AND_A5 : A6_ONLY;
    }
```

and end `toDto` with:

```java
        return new QrCardTemplateDto(template.getId(), template.getName(), artworkPath(template), template.getTextColor(),
                headingFont, template.getCodeColor(),
                Boolean.TRUE.equals(template.getCenterLogo()), template.getLayout(), sizesFor(template));
```

- [ ] **Step 5: Run every QR card test**

Run: `./gradlew test --tests "event_social_media.controller.qrcard.*" --tests "event_social_media.service.qrcard.*" --tests "event_social_media.repository.qrcard.*"`
Expected: PASS. Fix any other `new QrCardTemplateDto(...)` call the compiler reports (search: `grep -rn "new QrCardTemplateDto(" src`).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/qrcard/QrCardTemplateDto.java src/main/java/event_social_media/service/qrcard/QrCardTemplateService.java src/test/java/event_social_media/controller/qrcard/QrCardTemplateControllerTest.java
git commit -m "feat(qr-cards): host list carries layout and paper sizes"
```

---

### Task 7: Full test run

- [ ] **Step 1: Run the whole suite**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`. If an unrelated test fails, run it alone on `origin/staging` to confirm it already failed there, and say so in the PR rather than changing it.

---

### Task 8: FE guide

**Files:**
- Modify: `docs/fe-guides/qr-card-templates-fe-integration.md`

- [ ] **Step 1: Update the contract**

- "Host" section: add `layout` (nullable `QrCardLayout`, shape below; null = the default layout) and `sizes` (`["A6"]` or `["A6","A5"]`; A5 when the artwork is at least 1748 px wide; artwork from before V188 is A6 only) to the host DTO description.
- "Admin" section: the artwork row becomes "Multipart `file`. PNG or WebP, ≤ 10 MB, A6 portrait (105:148 ± 2%), ≥ 1748 px wide. Stores the width." Add `layout` to the PATCH row ("a full layout replaces the stored one; omitted, it stays") and `layout`, `artworkWidth` to the admin DTO.
- New "Layout" section with the JSON example and the rules table from the spec's "Layout" section, copied as they are.
- "Errors" table: 3111 says 1748 px; add `| 3113 | Layout breaks a rule. The localized detail names which. |`; the 413 row says 10 MB.

- [ ] **Step 2: Commit**

```bash
git add docs/fe-guides/qr-card-templates-fe-integration.md
git commit -m "docs(qr-cards): FE guide for layouts and A5"
```

---

### Task 9: Pull request

- [ ] **Step 1: Bring the branch up to date and re-run the checks**

```bash
git fetch origin
git rebase origin/staging
./gradlew test
```

Expected: `BUILD SUCCESSFUL`. If staging gained a migration numbered 187 or higher, renumber this one to the next free number and re-run.

- [ ] **Step 2: Ask the user before pushing**

Pushing and opening a PR are outward-facing: confirm with the user first.

- [ ] **Step 3: Push and open the PR into `staging`**

```bash
git push -u origin feat/qr-card-layout
gh pr create --base staging --title "QR card layouts and A5" --body "$(cat <<'EOF'
Layouts for QR card templates and A5 printing. Spec: storywall repo, docs/superpowers/specs/2026-10-29-qr-card-layout-editor-design.md.

- `qr_card_templates.layout` (JSONB) and `artwork_width` (V188).
- PATCH accepts `layout`, checked by `QrCardLayoutValidator` (new error 3113).
- Artwork: at least 1748 px wide, up to 10 MB (theme illustrations keep 5 MB). The width is stored on upload.
- Host list: `layout` and `sizes` (A5 when the artwork is at least 1748 px wide).
- FE guide updated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
