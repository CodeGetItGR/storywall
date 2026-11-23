# Guest inquiries — backend implementation plan (KAN-20)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an event member ask an approved partner about a date. Store the inquiry, email the partner and serve the partner's list on My business.

**Architecture:**
- **Ownership:** the inquiry belongs to the partner record (`Collaborator`), reached either from an event vendor row (via `ApprovedPartners`) or from the event's showing feed card (`EventPartnerBranding`).
- **New code:** a `guest_inquiries` table, three services:
  - `GuestInquiryService`: send
  - `GuestInquiryInbox`: the partner's list
  - `GuestInquiryState`: what a caller may do on a card
- **Endpoints:** one controller.
- **Existing code changed:** vendor rows and the feed card carry an `inquiry` state; the mail service gains one email; the anonymizer and a nightly job delete rows.

**Tech stack:** Spring Boot, JPA/Hibernate, Flyway (Postgres), H2 for the main suite (schema from entities), JUnit 5 + MockMvc + AssertJ, Testcontainers Postgres for migration tests.

**Spec:** `storywall/docs/superpowers/specs/2026-11-23-guest-inquiries-design.md`

**Repo:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be).

---

## Before you start

- [ ] Create the branch from the latest staging:

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git status --short          # must be empty; stop and ask if not
git switch -c claude/kan-20-guest-inquiries origin/staging
```

- [ ] Find the next free numbers, because other branches may have taken the ones below:

```bash
git ls-tree --name-only origin/staging src/main/resources/db/migration/ | sort -V | tail -1   # expect V231 → use V232
grep -oE "\((3[0-9]{3})\)" src/main/java/event_social_media/exception/ErrorCode.java | sort | tail -1  # expect (3134) → use 3135..3137
grep -oE "\((5[0-9]{3})\)" src/main/java/event_social_media/exception/ErrorCode.java | sort | tail -1  # expect (5227) → use 5228
```

If any number is taken, use the next free one everywhere in this plan **and** in the frontend plan's `lib/api/errors.ts` task.

- [ ] Run the tests: `./gradlew test`. This is the baseline: note any test that already fails before you change anything.

## File map

| File | Responsibility |
|---|---|
| `src/main/resources/db/migration/V232__guest_inquiries.sql` | Table, checks, indexes |
| `model/vendor/GuestInquiry.java`, `GuestInquiryStatus.java`, `GuestInquirySource.java` | Entity and enums |
| `repository/vendor/GuestInquiryRepository.java` | Queries |
| `dto/vendor/GuestInquiryRequestDto.java`, `GuestInquirySentDto.java`, `GuestInquiryDto.java`, `GuestInquiryPatchDto.java`, `InquiryStateDto.java` | API shapes |
| `exception/ErrorCode.java` | 3135–3137, 5228 |
| `service/vendor/GuestInquiryState.java` | `inquiry` field for a caller |
| `service/vendor/GuestInquiryService.java` | Send: checks, save, audit, mail |
| `service/vendor/GuestInquiryInbox.java` | Partner's list and done flag |
| `service/vendor/GuestInquiryMailer.java` | Builds the mail facts |
| `service/mail/TransactionalMailService.java` | `composeGuestInquiry` / `sendGuestInquiry` |
| `service/vendor/GuestInquiryCleanupJob.java` | Nightly 12-month delete |
| `controller/vendor/GuestInquiryController.java` | 4 routes |
| `dto/vendor/VendorRowDto.java`, `service/vendor/VendorService.java` | `inquiry` on rows |
| `dto/collaboration/PartnerBrandingDto.java`, `service/collaboration/PartnerBrandingService.java`, `service/event/EventService.java` | `inquiry` on the feed card |
| `service/user/deletion/UserAnonymizer.java` | Delete the guest's rows |
| `src/main/resources/i18n/messages.properties`, `messages_el.properties` | Email wording |
| Tests under `src/test/java/event_social_media/...` | See each task |

All Java paths below are under `src/main/java/event_social_media/` or `src/test/java/event_social_media/`.

---

### Task 1: Migration and entity

**Files:**
- Create: `src/main/resources/db/migration/V232__guest_inquiries.sql`
- Create: `model/vendor/GuestInquiry.java`, `model/vendor/GuestInquiryStatus.java`, `model/vendor/GuestInquirySource.java`
- Create: `repository/vendor/GuestInquiryRepository.java`
- Test: `src/test/java/event_social_media/migration/GuestInquiriesMigrationTest.java`

- [ ] **Step 1: Write the failing migration test**

```java
package event_social_media.migration;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.model.vendor.GuestInquirySource;
import event_social_media.model.vendor.GuestInquiryStatus;
import event_social_media.repository.vendor.GuestInquiryRepository;
import event_social_media.support.PostgresTestBase;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** V232: guest_inquiries against real Postgres; ddl-auto=validate checks the entity against the table. */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class GuestInquiriesMigrationTest extends PostgresTestBase {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private GuestInquiryRepository inquiries;
    @Autowired private TestFixtures fixtures;

    /** The Postgres database is shared across test classes, so only this class's own rows are deleted. */
    private final List<UUID> inserted = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        inserted.forEach(id -> jdbc.update("delete from guest_inquiries where id = ?", id));
    }

    private GuestInquiry inquiry(Event event, Collaborator partner, User guest, String phone, String email) {
        GuestInquiry row = new GuestInquiry();
        row.setEventId(event.getId());
        row.setCollaboratorId(partner.getId());
        row.setGuestUserId(guest.getId());
        row.setSource(GuestInquirySource.VENDOR_LIST);
        row.setEventDate(LocalDate.now().plusMonths(6));
        row.setPhone(phone);
        row.setEmail(email);
        row.setConsentAt(OffsetDateTime.now());
        row.setCreatedAt(OffsetDateTime.now());
        return row;
    }

    @Test
    void aSavedInquiryStartsNew() {
        GuestInquiry saved = inquiries.saveAndFlush(inquiry(fixtures.newEvent(), fixtures.newCollaborator(),
                fixtures.newUser(), null, "guest@example.com"));
        inserted.add(saved.getId());

        assertEquals(GuestInquiryStatus.NEW, inquiries.findById(saved.getId()).orElseThrow().getStatus());
    }

    @Test
    void aRowNeedsAPhoneOrAnEmail() {
        assertThrows(DataIntegrityViolationException.class, () -> inquiries.saveAndFlush(
                inquiry(fixtures.newEvent(), fixtures.newCollaborator(), fixtures.newUser(), null, null)));
    }

    @Test
    void aGuestAsksAPartnerOncePerEvent() {
        Event event = fixtures.newEvent();
        Collaborator partner = fixtures.newCollaborator();
        User guest = fixtures.newUser();
        GuestInquiry first = inquiries.saveAndFlush(inquiry(event, partner, guest, "+30 210 1234567", null));
        inserted.add(first.getId());

        assertThrows(DataIntegrityViolationException.class,
                () -> inquiries.saveAndFlush(inquiry(event, partner, guest, "+30 210 1234567", null)));
    }
}
```

- [ ] **Step 2: Run it and confirm it fails to compile** (`GuestInquiry` missing)

Run: `./gradlew test --tests "event_social_media.migration.GuestInquiriesMigrationTest"`
Expected: compilation failure, `cannot find symbol GuestInquiry`.

- [ ] **Step 3: Write the migration**

`src/main/resources/db/migration/V232__guest_inquiries.sql`:

```sql
-- A guest's question to a partner about a date (KAN-20). Belongs to the partner (collaborators),
-- reached from an event's vendor list or its feed card. The guest's name and contact go to the partner
-- with the guest's consent (consent_at). Deleted after 12 months by GuestInquiryCleanupJob, and with the
-- guest's account by UserAnonymizer (accounts are scrubbed, not deleted, so the cascade below rarely fires).
CREATE TABLE guest_inquiries (
    id              UUID PRIMARY KEY,
    event_id        UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    collaborator_id UUID         NOT NULL REFERENCES collaborators (id) ON DELETE CASCADE,
    guest_user_id   UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    source          VARCHAR(16)  NOT NULL CHECK (source IN ('VENDOR_LIST', 'FEED_CARD')),
    event_date      DATE         NOT NULL,
    phone           VARCHAR(40),
    email           VARCHAR(254),
    note            VARCHAR(500),
    consent_at      TIMESTAMPTZ  NOT NULL,
    status          VARCHAR(8)   NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'DONE')),
    done_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT guest_inquiries_contact CHECK (phone IS NOT NULL OR email IS NOT NULL),
    CONSTRAINT uq_guest_inquiries_once UNIQUE (event_id, collaborator_id, guest_user_id)
);

-- The partner's list, newest first.
CREATE INDEX idx_guest_inquiries_inbox ON guest_inquiries (collaborator_id, created_at DESC, id DESC);
-- The nightly clean-up.
CREATE INDEX idx_guest_inquiries_created ON guest_inquiries (created_at);
-- Postgres doesn't index the referencing side of a foreign key; account deletion deletes by it.
CREATE INDEX idx_guest_inquiries_guest ON guest_inquiries (guest_user_id);
```

- [ ] **Step 4: Write the enums, entity and repository**

`model/vendor/GuestInquiryStatus.java`:

```java
package event_social_media.model.vendor;

/** Where the partner has got to with a guest inquiry; they set it themselves on My business. */
public enum GuestInquiryStatus {
    NEW, DONE
}
```

`model/vendor/GuestInquirySource.java`:

```java
package event_social_media.model.vendor;

/** Where the guest asked from. KAN-26 adds PARTNER_PAGE. */
public enum GuestInquirySource {
    VENDOR_LIST, FEED_CARD
}
```

`model/vendor/GuestInquiry.java`:

```java
package event_social_media.model.vendor;

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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A guest's question to a partner about a date (KAN-20, spec 2026-11-23). Ids only, no associations: the
 * rows are read in pages for one partner and never walk to the event, partner or guest. The unique
 * constraint is declared here too, so the H2 suite (schema from entities) enforces it like Postgres.
 */
@Getter
@Setter
@Entity
@Table(name = "guest_inquiries", uniqueConstraints = @UniqueConstraint(
        name = "uq_guest_inquiries_once", columnNames = {"event_id", "collaborator_id", "guest_user_id"}))
public class GuestInquiry {

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
    @Column(name = "guest_user_id", nullable = false)
    private UUID guestUserId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private GuestInquirySource source;

    @NotNull
    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "phone", length = 40)
    private String phone;

    @Column(name = "email", length = 254)
    private String email;

    @Column(name = "note", length = 500)
    private String note;

    @NotNull
    @Column(name = "consent_at", nullable = false)
    private OffsetDateTime consentAt;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 8)
    private GuestInquiryStatus status = GuestInquiryStatus.NEW;

    @Column(name = "done_at")
    private OffsetDateTime doneAt;

    @NotNull
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
```

`repository/vendor/GuestInquiryRepository.java`:

```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.GuestInquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface GuestInquiryRepository extends JpaRepository<GuestInquiry, UUID> {

    Optional<GuestInquiry> findByEventIdAndCollaboratorIdAndGuestUserId(UUID eventId, UUID collaboratorId, UUID guestUserId);

    boolean existsByEventIdAndCollaboratorIdAndGuestUserId(UUID eventId, UUID collaboratorId, UUID guestUserId);

    long countByCollaboratorIdAndCreatedAtAfter(UUID collaboratorId, OffsetDateTime after);

    Page<GuestInquiry> findByCollaboratorId(UUID collaboratorId, Pageable pageable);

    Optional<GuestInquiry> findByIdAndCollaboratorId(UUID id, UUID collaboratorId);

    @Modifying
    @Query("delete from GuestInquiry g where g.createdAt < :before")
    int deleteCreatedBefore(@Param("before") OffsetDateTime before);
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `./gradlew test --tests "event_social_media.migration.GuestInquiriesMigrationTest"`
Expected: 3 tests PASS. Docker must be running for Testcontainers; if it isn't, say so and stop, don't skip the test.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V232__guest_inquiries.sql src/main/java/event_social_media/model/vendor/GuestInquiry*.java src/main/java/event_social_media/repository/vendor/GuestInquiryRepository.java src/test/java/event_social_media/migration/GuestInquiriesMigrationTest.java
git commit -m "KAN-20: guest_inquiries table and entity"
```

---

### Task 2: Error codes and DTOs

**Files:**
- Modify: `exception/ErrorCode.java`
- Create: `dto/vendor/GuestInquiryRequestDto.java`, `GuestInquirySentDto.java`, `GuestInquiryDto.java`, `GuestInquiryPatchDto.java`, `InquiryStateDto.java`

No test of its own: Task 4 covers these through the API.

- [ ] **Step 1: Add the error codes**

At the end of the 3xxx block, right after `EVENT_START_BEFORE_PURCHASE(3134),`:

```java
    /** 3135 — A guest inquiry's date is before today (Athens) or more than three years ahead. {@code 400}. */
    INQUIRY_DATE_OUT_OF_RANGE(3135),

    /** 3136 — A guest inquiry needs a phone or an email for the partner to answer. {@code 400}. */
    INQUIRY_CONTACT_REQUIRED(3136),

    /** 3137 — A guest inquiry is sent only once the guest agrees to share their name and contact. {@code 400}. */
    INQUIRY_CONSENT_REQUIRED(3137),
```

At the end of the 5xxx block, right after `EMAIL_ALREADY_VERIFIED(5227),`:

```java
    /** 5228 — This guest already asked this partner from this event. {@code 409}. */
    INQUIRY_ALREADY_SENT(5228),
```

- [ ] **Step 2: Write the DTOs**

`dto/vendor/GuestInquiryRequestDto.java`:

```java
package event_social_media.dto.vendor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * A guest's inquiry. Phone and email as on a vendor card (VendorProfile); at least one, and consent,
 * are checked by GuestInquiryService so each gets its own code.
 */
public record GuestInquiryRequestDto(
        @NotNull LocalDate eventDate,
        @Size(max = 40) @Pattern(regexp = "^\\+?[0-9 ()-]{6,40}$") String phone,
        @Size(max = 254) @Email String email,
        @Size(max = 500) String note,
        Boolean consent) {
}
```

`dto/vendor/GuestInquirySentDto.java`:

```java
package event_social_media.dto.vendor;

import java.time.OffsetDateTime;

public record GuestInquirySentDto(OffsetDateTime sentAt) {
}
```

`dto/vendor/InquiryStateDto.java`:

```java
package event_social_media.dto.vendor;

import java.time.OffsetDateTime;

/** What the caller may do about asking this partner here: ask, or see when they already did. */
public record InquiryStateDto(boolean canAsk, OffsetDateTime sentAt) {

    public static InquiryStateDto open() {
        return new InquiryStateDto(true, null);
    }

    public static InquiryStateDto sent(OffsetDateTime at) {
        return new InquiryStateDto(false, at);
    }
}
```

`dto/vendor/GuestInquiryDto.java`:

```java
package event_social_media.dto.vendor;

import event_social_media.model.vendor.GuestInquiryStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One row of the partner's list on My business. */
public record GuestInquiryDto(UUID id, String guestName, String eventTitle, LocalDate eventDate, String phone,
                              String email, String note, GuestInquiryStatus status, OffsetDateTime createdAt) {
}
```

`dto/vendor/GuestInquiryPatchDto.java`:

```java
package event_social_media.dto.vendor;

import jakarta.validation.constraints.NotNull;

public record GuestInquiryPatchDto(@NotNull Boolean done) {
}
```

- [ ] **Step 3: Compile**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/event_social_media/exception/ErrorCode.java src/main/java/event_social_media/dto/vendor/GuestInquiry*.java src/main/java/event_social_media/dto/vendor/InquiryStateDto.java
git commit -m "KAN-20: guest inquiry error codes and DTOs"
```

---

### Task 3: Email wording approval (gate)

Per CLAUDE.md, no user-facing text is added without the owner's explicit yes.

- [ ] **Step 1:** Ask the owner in a popup (AskUserQuestion), showing this exact wording. The partner email is sent in Greek. The English keys are for the English locale fallback, as every email has both.

| Key | Greek | English |
|---|---|---|
| `email.guest_inquiry.subject` | `Νέα ερώτηση από {guestName}` | `New inquiry from {guestName}` |
| `email.guest_inquiry.heading` | `Ερώτηση για ημερομηνία` | `A date inquiry` |
| `email.guest_inquiry.body` | `Ο/Η {guestName} σας είδε στην εκδήλωση «{eventTitle}» και ρωτά αν είστε διαθέσιμοι στις {date}.` | `{guestName} saw you at {eventTitle} and asks if you're free on {date}.` |
| `email.guest_inquiry.date` | `Ημερομηνία` | `Date` |
| `email.guest_inquiry.phone` | `Τηλέφωνο` | `Phone` |
| `email.guest_inquiry.email` | `Email` | `Email` |
| `email.guest_inquiry.note` | `Μήνυμα` | `Message` |
| `email.guest_inquiry.cta` | `Η επιχείρησή μου` | `My business` |

- [ ] **Step 2:** If the owner changes any wording, use their wording in Task 6 exactly. If they say no, stop and ask how to proceed.

---

### Task 4: Sending from the vendor list

**Files:**
- Create: `service/vendor/GuestInquiryMailer.java` (empty sender for now, real mail in Task 6)
- Create: `service/vendor/GuestInquiryService.java`
- Create: `controller/vendor/GuestInquiryController.java`
- Test: `src/test/java/event_social_media/controller/vendor/GuestInquiryControllerTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.controller.vendor;

import event_social_media.model.audit.AuditLog;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.model.vendor.GuestInquirySource;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.vendor.GuestInquiryRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** KAN-20: a guest asks a partner vendor about a date from the Vendors page. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.rate-limit.enabled=false")
class GuestInquiryControllerTest {

    static final LocalDate SOON = LocalDate.now(ZoneId.of("Europe/Athens")).plusMonths(4);

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private VendorTestSupport support;
    @Autowired private CollaboratorRepository collaboratorRepository;
    @Autowired private GuestInquiryRepository inquiries;
    @Autowired private AuditLogRepository auditLogRepository;

    static String body(LocalDate date, String phone, String email, String note, Boolean consent) {
        StringBuilder json = new StringBuilder("{\"eventDate\":\"" + date + "\"");
        if (phone != null) json.append(",\"phone\":\"").append(phone).append('"');
        if (email != null) json.append(",\"email\":\"").append(email).append('"');
        if (note != null) json.append(",\"note\":\"").append(note).append('"');
        if (consent != null) json.append(",\"consent\":").append(consent);
        return json.append('}').toString();
    }

    static String valid() {
        return body(SOON, null, "maria@example.com", "Summer wedding", true);
    }

    /** Makes the vendor's account an approved partner: a verified email matching an active partner. */
    Collaborator makePartner(EventVendor vendor) {
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(vendor.getUser().getEmail());
        return collaboratorRepository.saveAndFlush(partner);
    }

    record Setup(Event event, User guest, EventVendor vendor) {}

    Setup setup() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        User guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        return new Setup(event, guest, support.vendor(event, PartnerRole.PHOTOGRAPHER));
    }

    ResultActions ask(User caller, Event event, EventVendor vendor, String json) throws Exception {
        return mockMvc.perform(as(caller, post("/api/events/{eventId}/vendors/{vendorId}/inquiries",
                event.getId(), vendor.getId())).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void aGuestAsksAPartnerAndTheInquiryIsStoredWithConsent() throws Exception {
        Setup s = setup();
        Collaborator partner = makePartner(s.vendor());

        ask(s.guest(), s.event(), s.vendor(), valid())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sentAt").exists());

        GuestInquiry row = inquiries.findByEventIdAndCollaboratorIdAndGuestUserId(
                s.event().getId(), partner.getId(), s.guest().getId()).orElseThrow();
        assertThat(row.getSource()).isEqualTo(GuestInquirySource.VENDOR_LIST);
        assertThat(row.getEmail()).isEqualTo("maria@example.com");
        assertThat(row.getNote()).isEqualTo("Summer wedding");
        assertThat(row.getConsentAt()).isNotNull();
    }

    @Test
    void theAuditEntryHoldsNoPersonalData() throws Exception {
        Setup s = setup();
        Collaborator partner = makePartner(s.vendor());
        ask(s.guest(), s.event(), s.vendor(), valid()).andExpect(status().isCreated());

        List<AuditLog> entries = auditLogRepository.findAll().stream()
                .filter(a -> "GUEST_INQUIRY_SENT".equals(a.getAction())).toList();
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getChanges()).containsOnlyKeys("collaboratorId", "source");
        assertThat(entries.get(0).getChanges()).containsEntry("collaboratorId", partner.getId().toString());
    }

    @Test
    void aVendorWhoIsNotAPartnerCannotBeAsked() throws Exception {
        Setup s = setup();
        ask(s.guest(), s.event(), s.vendor(), valid()).andExpect(status().isNotFound());
    }

    @Test
    void aPartnerCannotAskThemself() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        ask(s.vendor().getUser(), s.event(), s.vendor(), valid()).andExpect(status().isNotFound());
    }

    @Test
    void someoneOutsideTheEventCannotAsk() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        ask(fixtures.newUser(), s.event(), s.vendor(), valid()).andExpect(status().isForbidden());
    }

    @Test
    void theHostMayAskToo() throws Exception {
        User host = fixtures.newUser();
        Event event = support.vendorEventHostedBy(host);
        EventVendor vendor = support.vendor(event, PartnerRole.PLANNER);
        makePartner(vendor);
        ask(host, event, vendor, valid()).andExpect(status().isCreated());
    }

    @Test
    void aSecondInquiryToTheSamePartnerIsRefused() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        ask(s.guest(), s.event(), s.vendor(), valid()).andExpect(status().isCreated());
        ask(s.guest(), s.event(), s.vendor(), valid())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(5228));
    }

    @Test
    void refusesADateBeforeTodayOrMoreThanThreeYearsAhead() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        LocalDate today = LocalDate.now(ZoneId.of("Europe/Athens"));
        ask(s.guest(), s.event(), s.vendor(), body(today.minusDays(1), null, "a@b.gr", null, true))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(3135));
        ask(s.guest(), s.event(), s.vendor(), body(today.plusYears(3).plusDays(1), null, "a@b.gr", null, true))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(3135));
    }

    @Test
    void needsAPhoneOrAnEmail() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        ask(s.guest(), s.event(), s.vendor(), body(SOON, null, null, null, true))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(3136));
        ask(s.guest(), s.event(), s.vendor(), body(SOON, "  ", "", null, true))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(3136));
    }

    @Test
    void needsConsent() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        ask(s.guest(), s.event(), s.vendor(), body(SOON, null, "a@b.gr", null, false))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(3137));
        ask(s.guest(), s.event(), s.vendor(), body(SOON, null, "a@b.gr", null, null))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(3137));
    }

    @Test
    void refusesABadPhoneOrEmailOrALongNote() throws Exception {
        Setup s = setup();
        makePartner(s.vendor());
        ask(s.guest(), s.event(), s.vendor(), body(SOON, "call me", null, null, true)).andExpect(status().isBadRequest());
        ask(s.guest(), s.event(), s.vendor(), body(SOON, null, "not-an-email", null, true)).andExpect(status().isBadRequest());
        ask(s.guest(), s.event(), s.vendor(), body(SOON, null, "a@b.gr", "x".repeat(501), true)).andExpect(status().isBadRequest());
        assertThat(inquiries.count()).isZero();
    }

    @Test
    void aPartnerTakesFiftyInquiriesADay() throws Exception {
        Setup s = setup();
        Collaborator partner = makePartner(s.vendor());
        for (int i = 0; i < 50; i++) {
            GuestInquiry row = new GuestInquiry();
            row.setEventId(s.event().getId());
            row.setCollaboratorId(partner.getId());
            row.setGuestUserId(fixtures.newUser().getId());
            row.setSource(GuestInquirySource.VENDOR_LIST);
            row.setEventDate(SOON);
            row.setEmail("g" + i + "@example.com");
            row.setConsentAt(OffsetDateTime.now());
            row.setCreatedAt(OffsetDateTime.now().minusHours(1));
            inquiries.save(row);
        }
        inquiries.flush();

        ask(s.guest(), s.event(), s.vendor(), valid()).andExpect(status().isTooManyRequests());
    }
}
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryControllerTest"`
Expected: FAIL, 404 for every request: the route doesn't exist yet.

- [ ] **Step 3: Write the mailer stub**

`service/vendor/GuestInquiryMailer.java` (Task 6 fills it in):

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.vendor.GuestInquiry;
import org.springframework.stereotype.Component;

/** Emails the partner about a new guest inquiry. */
@Component
public class GuestInquiryMailer {

    public void send(GuestInquiry inquiry, Collaborator partner, String guestName, String eventTitle) {
    }
}
```

- [ ] **Step 4: Write the service**

`service/vendor/GuestInquiryService.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.GuestInquiryRequestDto;
import event_social_media.dto.vendor.GuestInquirySentDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.RateLimitExceededException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.event.Event;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.model.vendor.GuestInquirySource;
import event_social_media.repository.collaboration.EventPartnerBrandingRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.GuestInquiryRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.platform.ModuleAvailabilityService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * A guest asks a partner about a date (KAN-20, spec 2026-11-23). The inquiry belongs to the partner
 * (Collaborator): from a vendor row through ApprovedPartners, from the feed card through the showing
 * branding row. Anything not askable answers 404, the same as an unknown id. The email goes after commit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuestInquiryService {

    static final int PARTNER_DAILY_LIMIT = 50;
    static final int MAX_YEARS_AHEAD = 3;
    private static final ZoneId ATHENS = ZoneId.of("Europe/Athens");

    private final EventAuthorizationService eventAuthorizationService;
    private final ModuleAvailabilityService moduleAvailabilityService;
    private final EventVendorRepository eventVendorRepository;
    private final EventPartnerBrandingRepository brandingRepository;
    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final UserRepository userRepository;
    private final ApprovedPartners approvedPartners;
    private final GuestInquiryRepository repository;
    private final VendorAuditWriter auditWriter;
    private final GuestInquiryMailer mailer;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    /** From a row on the Vendors page. */
    @Transactional
    public GuestInquirySentDto askVendor(UUID eventId, UUID vendorId, UUID callerUserId, GuestInquiryRequestDto body) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        moduleAvailabilityService.requireReadable(eventId, ModuleKey.VENDORS);
        EventVendor vendor = eventVendorRepository.findById(vendorId)
                .filter(v -> v.getEvent().getId().equals(eventId))
                .filter(v -> v.getRemovedAt() == null && !v.isHiddenByHost() && !v.isOptedOut())
                .filter(v -> v.getUser() != null && !v.getUser().getId().equals(callerUserId))
                .orElseThrow(GuestInquiryService::notAskable);
        Collaborator partner = approvedPartners.collaborator(vendor.getUser()).orElseThrow(GuestInquiryService::notAskable);
        return save(eventId, partner, callerUserId, GuestInquirySource.VENDOR_LIST, body);
    }

    /** From the event's feed card, while it shows. */
    @Transactional
    public GuestInquirySentDto askFeedCardPartner(UUID eventId, UUID callerUserId, GuestInquiryRequestDto body) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        Collaborator partner = brandingRepository.findShowing(eventId)
                .map(row -> row.getCollaborator())
                .orElseThrow(GuestInquiryService::notAskable);
        if (isPartnerAccount(callerUserId, partner)) {
            throw notAskable();
        }
        return save(eventId, partner, callerUserId, GuestInquirySource.FEED_CARD, body);
    }

    private GuestInquirySentDto save(UUID eventId, Collaborator partner, UUID callerUserId, GuestInquirySource source,
                                     GuestInquiryRequestDto body) {
        LocalDate today = LocalDate.now(clock.withZone(ATHENS));
        if (body.eventDate().isBefore(today) || body.eventDate().isAfter(today.plusYears(MAX_YEARS_AHEAD))) {
            throw new BadRequestException(ErrorCode.INQUIRY_DATE_OUT_OF_RANGE, "Pick a date from today to three years ahead.");
        }
        String phone = blankToNull(body.phone());
        String email = blankToNull(body.email());
        if (phone == null && email == null) {
            throw new BadRequestException(ErrorCode.INQUIRY_CONTACT_REQUIRED, "Add a phone or an email.");
        }
        if (!Boolean.TRUE.equals(body.consent())) {
            throw new BadRequestException(ErrorCode.INQUIRY_CONSENT_REQUIRED, "Consent is required to send an inquiry.");
        }
        if (repository.existsByEventIdAndCollaboratorIdAndGuestUserId(eventId, partner.getId(), callerUserId)) {
            throw new ConflictException(ErrorCode.INQUIRY_ALREADY_SENT, "You already asked this partner.");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (repository.countByCollaboratorIdAndCreatedAtAfter(partner.getId(), now.minusHours(24)) >= PARTNER_DAILY_LIMIT) {
            throw new RateLimitExceededException(3600, ErrorCode.RATE_LIMITED, "This partner has had many inquiries today.");
        }

        GuestInquiry row = new GuestInquiry();
        row.setEventId(eventId);
        row.setCollaboratorId(partner.getId());
        row.setGuestUserId(callerUserId);
        row.setSource(source);
        row.setEventDate(body.eventDate());
        row.setPhone(phone);
        row.setEmail(email);
        // Postgres rejects NUL in text.
        String note = blankToNull(body.note());
        row.setNote(note == null ? null : note.replace("\0", ""));
        row.setConsentAt(now);
        row.setCreatedAt(now);
        GuestInquiry saved = repository.saveAndFlush(row);

        Event event = eventRepository.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        auditWriter.write(event, eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId).orElse(null),
                "GUEST_INQUIRY_SENT", "GuestInquiry", saved.getId(),
                Map.of("collaboratorId", partner.getId().toString(), "source", source.name()));
        User guest = userRepository.findById(callerUserId).orElseThrow(() -> new ResourceNotFoundException("User", callerUserId));
        mailer.send(saved, partner, displayName(guest), event.getTitle());
        log.info("Guest inquiry {} to partner {} from event {} ({})", saved.getId(), partner.getId(), eventId, source);
        return new GuestInquirySentDto(saved.getCreatedAt());
    }

    private boolean isPartnerAccount(UUID userId, Collaborator partner) {
        return userRepository.findById(userId)
                .flatMap(approvedPartners::collaboratorId)
                .filter(partner.getId()::equals)
                .isPresent();
    }

    /** The account's first and last name, as the partner will read it. */
    static String displayName(User user) {
        return Stream.of(user.getFirstName(), user.getLastName())
                .filter(part -> part != null && !part.isBlank())
                .map(String::strip)
                .collect(Collectors.joining(" "));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static ResourceNotFoundException notAskable() {
        return new ResourceNotFoundException("No partner to ask here");
    }
}
```

The `existsBy…` check does not cover two requests at the same moment; the unique constraint does. Add the catch in the controller step below.

- [ ] **Step 5: Write the controller**

`controller/vendor/GuestInquiryController.java`:

```java
package event_social_media.controller.vendor;

import event_social_media.dto.vendor.GuestInquiryRequestDto;
import event_social_media.dto.vendor.GuestInquirySentDto;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.service.ratelimit.RateLimit;
import event_social_media.service.vendor.GuestInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.function.Supplier;

/** Guest inquiries to partners (KAN-20). The two send routes share one budget: 10 a day per caller. */
@RestController
@RequiredArgsConstructor
public class GuestInquiryController {

    private final GuestInquiryService service;

    private static UUID callerId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }

    @PostMapping("/api/events/{eventId}/vendors/{vendorId}/inquiries")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimit(name = "inquiries.send", limit = 10, windowSeconds = 86400)
    public GuestInquirySentDto askVendor(@PathVariable UUID eventId, @PathVariable UUID vendorId,
                                         @Valid @RequestBody GuestInquiryRequestDto body, Authentication authentication) {
        return once(() -> service.askVendor(eventId, vendorId, callerId(authentication), body));
    }

    @PostMapping("/api/events/{eventId}/partner-branding/inquiries")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimit(name = "inquiries.send", limit = 10, windowSeconds = 86400)
    public GuestInquirySentDto askFeedCardPartner(@PathVariable UUID eventId,
                                                  @Valid @RequestBody GuestInquiryRequestDto body,
                                                  Authentication authentication) {
        return once(() -> service.askFeedCardPartner(eventId, callerId(authentication), body));
    }

    /** Two sends racing past the service's check meet the unique constraint: the loser gets the same 409. */
    private static GuestInquirySentDto once(Supplier<GuestInquirySentDto> send) {
        try {
            return send.get();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(ErrorCode.INQUIRY_ALREADY_SENT, "You already asked this partner.");
        }
    }
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryControllerTest"`
Expected: all PASS.

If `someoneOutsideTheEventCannotAsk` gets 404 instead of 403, check what `requireMember` throws for a non-member (`VendorCardDetailsTest` and `VendorControllerTest` show the list route's answer). Then change the expected status to match the list route. Both answers keep the partner hidden.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/service/vendor/GuestInquiryService.java src/main/java/event_social_media/service/vendor/GuestInquiryMailer.java src/main/java/event_social_media/controller/vendor/GuestInquiryController.java src/test/java/event_social_media/controller/vendor/GuestInquiryControllerTest.java
git commit -m "KAN-20: guests ask a partner vendor about a date"
```

---

### Task 5: Sending from the feed card, and the `inquiry` state on cards

**Files:**
- Create: `service/vendor/GuestInquiryState.java`
- Modify: `dto/vendor/VendorRowDto.java`, `service/vendor/VendorService.java`
- Modify: `dto/collaboration/PartnerBrandingDto.java`, `service/collaboration/PartnerBrandingService.java`, `service/event/EventService.java`
- Test: `src/test/java/event_social_media/controller/vendor/GuestInquiryCardStateTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.BrandingSource;
import event_social_media.model.collaboration.BrandingVariant;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.EventPartnerBranding;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.collaboration.EventPartnerBrandingRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static event_social_media.controller.vendor.GuestInquiryControllerTest.valid;
import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** KAN-20: the feed card's send route, and the inquiry state vendor rows and the feed card carry. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.rate-limit.enabled=false")
class GuestInquiryCardStateTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private VendorTestSupport support;
    @Autowired private CollaboratorRepository collaboratorRepository;
    @Autowired private EventPartnerBrandingRepository brandingRepository;

    private Collaborator showCard(Event event) {
        Collaborator partner = fixtures.newBrandedCollaborator();
        EventPartnerBranding row = new EventPartnerBranding();
        row.setEventId(event.getId());
        row.setCollaborator(partner);
        row.setSource(BrandingSource.ADMIN);
        row.setVariant(BrandingVariant.FEATURE_CARD);
        row.setAcceptedAt(OffsetDateTime.now());
        brandingRepository.saveAndFlush(row);
        return partner;
    }

    private User guestOf(Event event) {
        User guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        return guest;
    }

    private ResultActions askCard(User caller, Event event) throws Exception {
        return mockMvc.perform(as(caller, post("/api/events/{eventId}/partner-branding/inquiries", event.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(valid()));
    }

    private ResultActions eventPage(User caller, Event event) throws Exception {
        return mockMvc.perform(as(caller, get("/api/events/{eventId}", event.getId()))).andExpect(status().isOk());
    }

    private ResultActions vendorList(User caller, Event event) throws Exception {
        return mockMvc.perform(as(caller, get("/api/events/{eventId}/vendors", event.getId()))).andExpect(status().isOk());
    }

    @Test
    void aGuestAsksTheFeedCardPartnerAndTheCardThenShowsItWasSent() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        showCard(event);
        User guest = guestOf(event);

        eventPage(guest, event)
                .andExpect(jsonPath("$.partnerBranding.inquiry.canAsk").value(true))
                .andExpect(jsonPath("$.partnerBranding.inquiry.sentAt").doesNotExist());
        askCard(guest, event).andExpect(status().isCreated());
        eventPage(guest, event)
                .andExpect(jsonPath("$.partnerBranding.inquiry.canAsk").value(false))
                .andExpect(jsonPath("$.partnerBranding.inquiry.sentAt").exists());
    }

    @Test
    void noCardMeansNothingToAsk() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        askCard(guestOf(event), event).andExpect(status().isNotFound());
    }

    @Test
    void thePartnersOwnAccountSeesNoAskOnItsCard() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        Collaborator partner = showCard(event);
        User partnerAccount = fixtures.newUser();
        partner.setContactEmail(partnerAccount.getEmail());
        collaboratorRepository.saveAndFlush(partner);
        fixtures.newMember(event, partnerAccount, EventRole.ATTENDEE);

        eventPage(partnerAccount, event).andExpect(jsonPath("$.partnerBranding.inquiry").doesNotExist());
        askCard(partnerAccount, event).andExpect(status().isNotFound());
    }

    @Test
    void aVendorRowCarriesTheStateOnlyForAPartnerAndNotOnTheirOwnRow() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        User guest = guestOf(event);

        vendorList(guest, event).andExpect(jsonPath("$[0].inquiry").doesNotExist());

        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(vendor.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);

        vendorList(guest, event).andExpect(jsonPath("$[0].inquiry.canAsk").value(true));
        vendorList(vendor.getUser(), event).andExpect(jsonPath("$[0].inquiry").doesNotExist());

        mockMvc.perform(as(guest, post("/api/events/{eventId}/vendors/{vendorId}/inquiries", event.getId(), vendor.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(valid())).andExpect(status().isCreated());
        vendorList(guest, event)
                .andExpect(jsonPath("$[0].inquiry.canAsk").value(false))
                .andExpect(jsonPath("$[0].inquiry.sentAt").exists());
    }
}
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryCardStateTest"`
Expected: FAIL. `inquiry` doesn't exist yet, and the card route answers 404.

- [ ] **Step 3: Write `GuestInquiryState`**

`service/vendor/GuestInquiryState.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.InquiryStateDto;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.repository.vendor.GuestInquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Whether the caller may still ask a partner here, for the cards that offer "Ask about my date". */
@Component
@RequiredArgsConstructor
public class GuestInquiryState {

    private final GuestInquiryRepository repository;

    public InquiryStateDto of(UUID eventId, UUID collaboratorId, UUID callerUserId) {
        return repository.findByEventIdAndCollaboratorIdAndGuestUserId(eventId, collaboratorId, callerUserId)
                .map(GuestInquiry::getCreatedAt)
                .map(InquiryStateDto::sent)
                .orElseGet(InquiryStateDto::open);
    }
}
```

- [ ] **Step 4: Add `inquiry` to vendor rows**

In `dto/vendor/VendorRowDto.java`, add a last component and document it:

```java
/**
 * A vendor list row. The two flags are present only for hosts and for the vendor's own row. {@code phone} and
 * {@code email} only for an approved partner who chose to show them. {@code link} as in {@link VendorProfileDto}.
 * {@code inquiry} only on an approved partner's row, for anyone but that partner (KAN-20).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VendorRowDto(UUID id, UUID memberId, PartnerRole vendorType, String businessName, String description,
                           List<VendorServiceTag> serviceTags, String instagram, String website, String link,
                           String phone, String email, String logoUrl, String bannerUrl, OffsetDateTime joinedAt,
                           Boolean hiddenByHost, Boolean optedOut, InquiryStateDto inquiry) {
}
```

In `service/vendor/VendorService.java`:

1. Add the field `private final GuestInquiryState guestInquiryState;` to the injected fields.
2. Change `row(...)` to take the caller (null on admin reads and on a patch answer) and fill `inquiry`:

```java
    /** {@code callerUserId} null: no inquiry state (admin reads, the answer to a host's or vendor's patch). */
    private VendorRowDto row(EventVendor v, VendorProfile profile, boolean withFlags, UUID callerUserId) {
        // Asked only for a card offering a phone or an email: most cards don't, and each check is a query.
        boolean partner = profile != null && VendorProfileService.offersContact(profile)
                && approvedPartners.isApproved(v.getUser());
        return new VendorRowDto(v.getId(), v.getMember() == null ? null : v.getMember().getId(), v.getVendorType(),
                profile == null ? null : profile.getBusinessName(),
                profile == null ? null : profile.getDescription(),
                profile == null ? null : List.copyOf(profile.getServiceTags()),
                profile == null ? null : profile.getInstagram(),
                profile == null ? null : profile.getWebsite(),
                profile == null ? null : VendorProfileService.legacyLink(profile),
                profile == null ? null : VendorProfileService.shownPhone(profile, partner),
                profile == null ? null : VendorProfileService.shownEmail(profile, partner),
                profile == null ? null : vendorProfileService.logoUrl(profile),
                profile == null ? null : vendorProfileService.bannerUrl(profile),
                v.getJoinedAt(),
                withFlags ? v.isHiddenByHost() : null,
                withFlags ? v.isOptedOut() : null,
                inquiryFor(v, profile, callerUserId));
    }

    /** KAN-20: only a listed partner's row, and never for the partner themself. One partner lookup per row. */
    private InquiryStateDto inquiryFor(EventVendor v, VendorProfile profile, UUID callerUserId) {
        if (callerUserId == null || profile == null || v.getUser() == null || isSelf(v, callerUserId)
                || v.isHiddenByHost() || v.isOptedOut()) {
            return null;
        }
        return approvedPartners.collaboratorId(v.getUser())
                .map(collaboratorId -> guestInquiryState.of(v.getEvent().getId(), collaboratorId, callerUserId))
                .orElse(null);
    }
```

3. Update the three callers:
   - in `list(...)`: `.map(v -> row(v, profileOf(v, profiles), host || isSelf(v, callerUserId), callerUserId))`
   - in `patch(...)`: `return row(saved, profileOf(saved), true, null);`
   - in `listForAdmin(...)`: `.map(v -> row(v, profileOf(v, profiles), true, null))`
4. Add `import event_social_media.dto.vendor.InquiryStateDto;`.

- [ ] **Step 5: Add `inquiry` to the feed card**

In `dto/collaboration/PartnerBrandingDto.java`:
- Add `@param inquiry` to the Javadoc: "the caller's 'Ask about my date' state (KAN-20); null in previews and for the partner's own account".
- Add a last component `InquiryStateDto inquiry`.
- Add this method:

```java
    /** This card with the caller's inquiry state. */
    public PartnerBrandingDto withInquiry(InquiryStateDto state) {
        return new PartnerBrandingDto(variant, displayName, role, logoUrl, coverUrl, tagline, services, linkUrl,
                placement, state);
    }
```

Add `@JsonInclude(JsonInclude.Include.NON_NULL)` on the record only if it already has it. If it doesn't, leave it: a null `inquiry` then serialises as `"inquiry": null`. The frontend type accepts both.

Import: `import event_social_media.dto.vendor.InquiryStateDto;`

In `service/collaboration/PartnerBrandingService.java`:

1. Add the fields `private final GuestInquiryState guestInquiryState;`, `private final ApprovedPartners approvedPartners;`, `private final UserRepository userRepository;`.
2. Add `null` as the last argument to both `new PartnerBrandingDto(...)` calls (`previewFor` and `toCard`).
3. Change `forEventPage` to take the caller and add the state:

```java
    @Transactional(readOnly = true)
    public EventPageBranding forEventPage(UUID eventId, UUID callerUserId, BooleanSupplier callerIsHost) {
        Optional<EventPartnerBranding> found = brandingRepository.findWithCollaborator(eventId);
        if (found.isEmpty()) {
            return EventPageBranding.NONE;
        }
        EventPartnerBranding row = found.get();
        if (awaitingHost(row)) {
            return callerIsHost.getAsBoolean()
                    ? new EventPageBranding(null, notice(row.getCollaborator()))
                    : EventPageBranding.NONE;
        }
        if (row.getAcceptedAt() == null || !eligible(row.getCollaborator())) {
            return EventPageBranding.NONE;
        }
        PartnerBrandingDto card = cardFor(eventId);
        return new EventPageBranding(card == null ? null : withInquiry(card, eventId, row.getCollaborator(), callerUserId), null);
    }

    /** KAN-20: the caller's "Ask about my date" state; none for the partner's own account. */
    private PartnerBrandingDto withInquiry(PartnerBrandingDto card, UUID eventId, Collaborator partner, UUID callerUserId) {
        boolean ownCard = userRepository.findById(callerUserId)
                .flatMap(approvedPartners::collaboratorId)
                .filter(partner.getId()::equals)
                .isPresent();
        return ownCard ? card : card.withInquiry(guestInquiryState.of(eventId, partner.getId(), callerUserId));
    }
```

Imports: `event_social_media.service.vendor.ApprovedPartners`, `event_social_media.service.vendor.GuestInquiryState`, `event_social_media.repository.user.UserRepository`.

**Watch for a dependency cycle at startup:** `ApprovedPartners` → `CollaboratorRepository` only, and `GuestInquiryState` → `GuestInquiryRepository` only, so there should be none. If Spring still reports a cycle, show the cycle to the user before changing anything.

In `service/event/EventService.java`, change the one call:

```java
            PartnerBrandingService.EventPageBranding branding =
                    partnerBrandingService.forEventPage(id, callerId, () -> eventAuthorizationService.isHost(id, callerId));
```

- [ ] **Step 6: Add the card route to the service** — already written in Task 4 (`askFeedCardPartner`); the controller route exists too.

- [ ] **Step 7: Run the new tests and the suites they touch**

Run:

```bash
./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryCardStateTest" --tests "event_social_media.controller.vendor.*" --tests "event_social_media.service.collaboration.*" --tests "event_social_media.controller.event.*"
```

Expected: all PASS. A failure in an existing test that compared whole `PartnerBrandingDto` or `VendorRowDto` values needs the extra `null` argument. Fix the test's constructor call only, never its expectation.

- [ ] **Step 8: Commit**

```bash
git add -A src/main/java src/test/java
git commit -m "KAN-20: inquiry state on vendor rows and the feed card; ask from the feed card"
```

---

### Task 6: The partner's email

**Files:**
- Modify: `service/mail/TransactionalMailService.java`
- Modify: `service/vendor/GuestInquiryMailer.java`
- Modify: `src/main/resources/i18n/messages.properties`, `src/main/resources/i18n/messages_el.properties`
- Test: `src/test/java/event_social_media/service/vendor/GuestInquiryMailTest.java`

Use the wording the owner approved in Task 3.

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.vendor;

import event_social_media.service.mail.TransactionalMailService;
import event_social_media.service.notification.email.EmailMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** KAN-20: the partner's email, in Greek, with only the contact details the guest gave. */
@SpringBootTest
class GuestInquiryMailTest {

    @Autowired private TransactionalMailService mailService;

    @Test
    void namesTheGuestTheEventAndTheDateAndLinksToMyBusiness() {
        EmailMessage mail = mailService.composeGuestInquiry("studio@example.com",
                new TransactionalMailService.GuestInquiryMail("Maria P", "Anna & Nikos", "12/06/2027",
                        "+30 690 0000000", null, "Summer wedding"));

        assertThat(mail.toAddress()).isEqualTo("studio@example.com");
        assertThat(mail.subject()).contains("Maria P");
        assertThat(mail.textBody()).contains("Anna & Nikos").contains("12/06/2027")
                .contains("+30 690 0000000").contains("Summer wedding").contains("/business");
        assertThat(mail.textBody()).doesNotContain("null");
    }

    @Test
    void leavesOutTheLinesTheGuestDidNotFill() {
        EmailMessage mail = mailService.composeGuestInquiry("studio@example.com",
                new TransactionalMailService.GuestInquiryMail("Maria P", "Anna & Nikos", "12/06/2027",
                        null, "maria@example.com", null));

        assertThat(mail.textBody()).contains("maria@example.com").doesNotContain("Τηλέφωνο").doesNotContain("Μήνυμα");
    }
}
```

- [ ] **Step 2: Run it and confirm it fails** (`composeGuestInquiry` missing)

Run: `./gradlew test --tests "event_social_media.service.vendor.GuestInquiryMailTest"`

- [ ] **Step 3: Add the messages**

Append to `src/main/resources/i18n/messages_el.properties`, using the wording approved in Task 3:

```properties
email.guest_inquiry.subject=Νέα ερώτηση από {guestName}
email.guest_inquiry.heading=Ερώτηση για ημερομηνία
email.guest_inquiry.body=Ο/Η {guestName} σας είδε στην εκδήλωση «{eventTitle}» και ρωτά αν είστε διαθέσιμοι στις {date}.
email.guest_inquiry.date=Ημερομηνία
email.guest_inquiry.phone=Τηλέφωνο
email.guest_inquiry.email=Email
email.guest_inquiry.note=Μήνυμα
email.guest_inquiry.cta=Η επιχείρησή μου
```

Append to `src/main/resources/i18n/messages.properties`:

```properties
email.guest_inquiry.subject=New inquiry from {guestName}
email.guest_inquiry.heading=A date inquiry
email.guest_inquiry.body={guestName} saw you at {eventTitle} and asks if you're free on {date}.
email.guest_inquiry.date=Date
email.guest_inquiry.phone=Phone
email.guest_inquiry.email=Email
email.guest_inquiry.note=Message
email.guest_inquiry.cta=My business
```

Check how an apostrophe renders: if the renderer uses `MessageFormat`, `you're` must be written `you''re`. Look for an existing English value with an apostrophe in `messages.properties`, and copy how it's written.

- [ ] **Step 4: Add the mail to `TransactionalMailService`**

Add next to the other `send…` methods:

```java
    /** The facts of a guest inquiry, already formatted for the partner. Null lines are left out. */
    public record GuestInquiryMail(String guestName, String eventTitle, String date, String phone, String email,
                                   String note) {
    }

    /** KAN-20: a guest asked a partner about a date. Greek, like the other partner emails. */
    public void sendGuestInquiry(String toAddress, GuestInquiryMail mail) {
        deliver(composeGuestInquiry(toAddress, mail), "guest inquiry");
    }

    public EmailMessage composeGuestInquiry(String toAddress, GuestInquiryMail mail) {
        Locale locale = Locale.forLanguageTag("el");
        Map<String, Object> args = Map.of("guestName", mail.guestName(), "eventTitle", mail.eventTitle(), "date", mail.date());
        List<EmailLayout.InfoLine> lines = new ArrayList<>();
        lines.add(new EmailLayout.InfoLine(messageRenderer.plain("email.guest_inquiry.date", locale), mail.date()));
        if (mail.phone() != null) {
            lines.add(new EmailLayout.InfoLine(messageRenderer.plain("email.guest_inquiry.phone", locale), mail.phone()));
        }
        if (mail.email() != null) {
            lines.add(new EmailLayout.InfoLine(messageRenderer.plain("email.guest_inquiry.email", locale), mail.email()));
        }
        if (mail.note() != null) {
            lines.add(new EmailLayout.InfoLine(messageRenderer.plain("email.guest_inquiry.note", locale), mail.note()));
        }
        return layout.compose(
                toAddress,
                messageRenderer.render("email.guest_inquiry.subject", args, locale),
                messageRenderer.plain("email.guest_inquiry.heading", locale),
                messageRenderer.render("email.guest_inquiry.body", args, locale),
                lines,
                messageRenderer.plain("email.guest_inquiry.cta", locale),
                absolute("/business"));
    }
```

Add `java.util.ArrayList` and `java.util.Map` imports if missing. If `messageRenderer.render` is typed `Map<String, String>`, change `args` to `Map<String, String>`.

- [ ] **Step 5: Fill in the mailer**

`service/vendor/GuestInquiryMailer.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.service.mail.TransactionalMailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

/**
 * Emails the partner's contact address about a new guest inquiry. Delivery waits for the commit and a
 * failure is only logged (TransactionalMailService): the inquiry stays on My business either way.
 */
@Component
@RequiredArgsConstructor
public class GuestInquiryMailer {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TransactionalMailService mailService;

    public void send(GuestInquiry inquiry, Collaborator partner, String guestName, String eventTitle) {
        mailService.sendGuestInquiry(partner.getContactEmail(), new TransactionalMailService.GuestInquiryMail(
                guestName, eventTitle, DATE.format(inquiry.getEventDate()),
                inquiry.getPhone(), inquiry.getEmail(), inquiry.getNote()));
    }
}
```

- [ ] **Step 6: Run the mail test and Task 4's tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.GuestInquiryMailTest" --tests "event_social_media.controller.vendor.GuestInquiry*"`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/service/mail/TransactionalMailService.java src/main/java/event_social_media/service/vendor/GuestInquiryMailer.java src/main/resources/i18n/messages.properties src/main/resources/i18n/messages_el.properties src/test/java/event_social_media/service/vendor/GuestInquiryMailTest.java
git commit -m "KAN-20: email the partner about a guest inquiry"
```

---

### Task 7: The partner's list on My business

**Files:**
- Create: `service/vendor/GuestInquiryInbox.java`
- Modify: `controller/vendor/GuestInquiryController.java`
- Test: `src/test/java/event_social_media/controller/vendor/GuestInquiryInboxTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.controller.vendor.GuestInquiryControllerTest.valid;
import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** KAN-20: the partner's list of guest inquiries on My business. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.rate-limit.enabled=false")
class GuestInquiryInboxTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private VendorTestSupport support;
    @Autowired private CollaboratorRepository collaboratorRepository;

    record Partner(User account, Event event, EventVendor vendor) {}

    private Partner partner() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        Collaborator collaborator = fixtures.newCollaborator();
        collaborator.setContactEmail(vendor.getUser().getEmail());
        collaboratorRepository.saveAndFlush(collaborator);
        return new Partner(vendor.getUser(), event, vendor);
    }

    private User askAs(Partner p, String firstName) throws Exception {
        User guest = fixtures.newUser();
        guest.setFirstName(firstName);
        fixtures.newMember(p.event(), guest, EventRole.ATTENDEE);
        mockMvc.perform(as(guest, post("/api/events/{eventId}/vendors/{vendorId}/inquiries", p.event().getId(), p.vendor().getId()))
                .contentType(MediaType.APPLICATION_JSON).content(valid())).andExpect(status().isCreated());
        return guest;
    }

    private ResultActions list(User caller) throws Exception {
        return mockMvc.perform(as(caller, get("/api/me/business/inquiries")));
    }

    @Test
    void thePartnerSeesTheirInquiriesNewestFirst() throws Exception {
        Partner p = partner();
        askAs(p, "Older");
        askAs(p, "Newer");

        list(p.account())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].guestName").value(org.hamcrest.Matchers.startsWith("Newer")))
                .andExpect(jsonPath("$.content[0].eventTitle").value(p.event().getTitle()))
                .andExpect(jsonPath("$.content[0].email").value("maria@example.com"))
                .andExpect(jsonPath("$.content[0].status").value("NEW"));
    }

    @Test
    void anotherPartnerSeesNoneOfThem() throws Exception {
        Partner p = partner();
        askAs(p, "Maria");
        Partner other = partner();

        list(other.account()).andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    void anAccountThatIsNotAPartnerGets404() throws Exception {
        list(fixtures.newUser()).andExpect(status().isNotFound());
    }

    @Test
    void thePartnerMarksOneDoneAndBackToNew() throws Exception {
        Partner p = partner();
        askAs(p, "Maria");
        String id = com.jayway.jsonpath.JsonPath.read(
                list(p.account()).andReturn().getResponse().getContentAsString(), "$.content[0].id");

        mockMvc.perform(as(p.account(), patch("/api/me/business/inquiries/{id}", id))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));
        mockMvc.perform(as(p.account(), patch("/api/me/business/inquiries/{id}", id))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"done\":false}"))
                .andExpect(jsonPath("$.status").value("NEW"));
    }

    @Test
    void anotherPartnerCannotMarkIt() throws Exception {
        Partner p = partner();
        askAs(p, "Maria");
        String id = com.jayway.jsonpath.JsonPath.read(
                list(p.account()).andReturn().getResponse().getContentAsString(), "$.content[0].id");

        mockMvc.perform(as(partner().account(), patch("/api/me/business/inquiries/{id}", id))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}"))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run them and confirm they fail** (routes missing → 404/405)

Run: `./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryInboxTest"`

- [ ] **Step 3: Write the inbox service**

`service/vendor/GuestInquiryInbox.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.GuestInquiryDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.model.vendor.GuestInquiryStatus;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.repository.vendor.GuestInquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** A partner's guest inquiries on My business (KAN-20). The partner is the caller's account, never a parameter. */
@Service
@RequiredArgsConstructor
public class GuestInquiryInbox {

    private static final int MAX_PAGE_SIZE = 50;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final ApprovedPartners approvedPartners;
    private final GuestInquiryRepository repository;

    @Transactional(readOnly = true)
    public Page<GuestInquiryDto> list(UUID callerUserId, Pageable pageable) {
        Collaborator partner = partnerOf(callerUserId);
        Page<GuestInquiry> rows = repository.findByCollaboratorId(partner.getId(), PageRequest.of(
                pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE), NEWEST_FIRST));
        Set<UUID> guestIds = rows.stream().map(GuestInquiry::getGuestUserId).collect(Collectors.toSet());
        Set<UUID> eventIds = rows.stream().map(GuestInquiry::getEventId).collect(Collectors.toSet());
        Map<UUID, User> guests = userRepository.findAllById(guestIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, Event> events = eventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(Event::getId, Function.identity()));
        return rows.map(row -> toDto(row, guests.get(row.getGuestUserId()), events.get(row.getEventId())));
    }

    @Transactional
    public GuestInquiryDto setDone(UUID callerUserId, UUID id, boolean done) {
        Collaborator partner = partnerOf(callerUserId);
        GuestInquiry row = repository.findByIdAndCollaboratorId(id, partner.getId())
                .orElseThrow(() -> new ResourceNotFoundException("GuestInquiry", id));
        row.setStatus(done ? GuestInquiryStatus.DONE : GuestInquiryStatus.NEW);
        row.setDoneAt(done ? OffsetDateTime.now() : null);
        GuestInquiry saved = repository.saveAndFlush(row);
        return toDto(saved, userRepository.findById(saved.getGuestUserId()).orElse(null),
                eventRepository.findById(saved.getEventId()).orElse(null));
    }

    private Collaborator partnerOf(UUID userId) {
        return userRepository.findById(userId)
                .flatMap(approvedPartners::collaborator)
                .orElseThrow(() -> new ResourceNotFoundException("You are not a partner"));
    }

    private static GuestInquiryDto toDto(GuestInquiry row, User guest, Event event) {
        return new GuestInquiryDto(row.getId(), guest == null ? "" : GuestInquiryService.displayName(guest),
                event == null ? "" : event.getTitle(), row.getEventDate(), row.getPhone(), row.getEmail(),
                row.getNote(), row.getStatus(), row.getCreatedAt());
    }
}
```

- [ ] **Step 4: Add the routes to the controller**

Add to `GuestInquiryController`. Inject `private final GuestInquiryInbox inbox;` and add the imports `GuestInquiryDto`, `GuestInquiryPatchDto`, `Page`, `Pageable`, `PageableDefault`, `GetMapping`, `PatchMapping`.

```java
    @GetMapping("/api/me/business/inquiries")
    @PreAuthorize("hasRole('USER')")
    @RateLimit(name = "business.read", limit = 60, windowSeconds = 60)
    public Page<GuestInquiryDto> list(@PageableDefault(size = 20) Pageable pageable, Authentication authentication) {
        return inbox.list(callerId(authentication), pageable);
    }

    @PatchMapping("/api/me/business/inquiries/{id}")
    @PreAuthorize("hasRole('USER')")
    public GuestInquiryDto setDone(@PathVariable UUID id, @Valid @RequestBody GuestInquiryPatchDto body,
                                   Authentication authentication) {
        return inbox.setDone(callerId(authentication), id, body.done());
    }
```

Check how `BusinessController` serialises `Page` (`$.content` vs `$.page`). The frontend's `Page<T>` type (`lib/api/pagination`) expects `{ content, page: { number, totalPages, … } }`. If `BusinessController#events` returns `Page` the same way, this matches. If it wraps it, wrap it the same way.

- [ ] **Step 5: Run and confirm they pass**

Run: `./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryInboxTest"`

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/vendor/GuestInquiryInbox.java src/main/java/event_social_media/controller/vendor/GuestInquiryController.java src/test/java/event_social_media/controller/vendor/GuestInquiryInboxTest.java
git commit -m "KAN-20: partner's guest inquiries on My business"
```

---

### Task 8: Per-guest daily limit

**Files:**
- Test: `src/test/java/event_social_media/controller/vendor/GuestInquiryRateLimitTest.java`

- [ ] **Step 1: Write the test** (it should already pass because of the `@RateLimit` in Task 4; this proves it)

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.controller.vendor.GuestInquiryControllerTest.valid;
import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** A guest sends 10 inquiries a day across both routes. Its own class because it needs rate limiting on. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.rate-limit.enabled=true")
class GuestInquiryRateLimitTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private VendorTestSupport support;
    @Autowired private CollaboratorRepository collaboratorRepository;

    @Test
    void the11thInquiryInADayIsRefusedAndAnotherGuestIsUnaffected() throws Exception {
        User guest = fixtures.newUser();
        for (int i = 0; i < 10; i++) {
            ask(guest).andExpect(status().isCreated());
        }
        ask(guest).andExpect(status().isTooManyRequests());
        ask(fixtures.newUser()).andExpect(status().isCreated());
    }

    /** Each ask goes to a fresh partner on a fresh event, so only the daily budget can refuse it. */
    private ResultActions ask(User guest) throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        EventVendor vendor = support.vendor(event, PartnerRole.MUSIC);
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(vendor.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);
        return mockMvc.perform(as(guest, post("/api/events/{eventId}/vendors/{vendorId}/inquiries", event.getId(), vendor.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(valid()));
    }
}
```

- [ ] **Step 2: Run it**

Run: `./gradlew test --tests "event_social_media.controller.vendor.GuestInquiryRateLimitTest"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/test/java/event_social_media/controller/vendor/GuestInquiryRateLimitTest.java
git commit -m "KAN-20: test the per-guest daily inquiry limit"
```

---

### Task 9: Clean-up job and account deletion

**Files:**
- Create: `service/vendor/GuestInquiryCleanupJob.java`
- Modify: `service/user/deletion/UserAnonymizer.java`
- Test: `src/test/java/event_social_media/service/vendor/GuestInquiryCleanupTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.vendor.GuestInquiry;
import event_social_media.model.vendor.GuestInquirySource;
import event_social_media.repository.vendor.GuestInquiryRepository;
import event_social_media.service.user.deletion.UserAnonymizer;
import event_social_media.support.TestFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** KAN-20: inquiries go after 12 months, and with the guest's account. */
@SpringBootTest
@Transactional
class GuestInquiryCleanupTest {

    @Autowired private TestFixtures fixtures;
    @Autowired private GuestInquiryRepository inquiries;
    @Autowired private GuestInquiryCleanupJob job;
    @Autowired private UserAnonymizer anonymizer;
    @Autowired private EntityManager em;

    private GuestInquiry saved(User guest, OffsetDateTime createdAt) {
        Event event = fixtures.newEvent();
        Collaborator partner = fixtures.newCollaborator();
        GuestInquiry row = new GuestInquiry();
        row.setEventId(event.getId());
        row.setCollaboratorId(partner.getId());
        row.setGuestUserId(guest.getId());
        row.setSource(GuestInquirySource.FEED_CARD);
        row.setEventDate(LocalDate.now().plusMonths(2));
        row.setEmail("guest@example.com");
        row.setConsentAt(createdAt);
        row.setCreatedAt(createdAt);
        return inquiries.saveAndFlush(row);
    }

    @Test
    void theNightlyJobDeletesOnlyRowsOlderThan12Months() {
        GuestInquiry old = saved(fixtures.newUser(), OffsetDateTime.now().minusMonths(12).minusDays(1));
        GuestInquiry recent = saved(fixtures.newUser(), OffsetDateTime.now().minusMonths(11));

        assertThat(job.run()).isEqualTo(1);
        assertThat(inquiries.findById(old.getId())).isEmpty();
        assertThat(inquiries.findById(recent.getId())).isPresent();
    }

    @Test
    void deletingTheGuestsAccountDeletesTheirInquiries() {
        User guest = fixtures.newUser();
        GuestInquiry mine = saved(guest, OffsetDateTime.now());
        GuestInquiry someoneElses = saved(fixtures.newUser(), OffsetDateTime.now());
        em.createNativeQuery("update users set status = 'DELETED' where id = :id").setParameter("id", guest.getId()).executeUpdate();
        em.clear();

        anonymizer.anonymize(guest.getId());

        assertThat(inquiries.findById(mine.getId())).isEmpty();
        assertThat(inquiries.findById(someoneElses.getId())).isPresent();
    }
}
```

- [ ] **Step 2: Run them and confirm they fail** (`GuestInquiryCleanupJob` missing)

Run: `./gradlew test --tests "event_social_media.service.vendor.GuestInquiryCleanupTest"`

- [ ] **Step 3: Write the job**

`service/vendor/GuestInquiryCleanupJob.java`:

```java
package event_social_media.service.vendor;

import event_social_media.repository.vendor.GuestInquiryRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;

/** Deletes guest inquiries 12 months after they were sent (KAN-20). A missed run only delays the delete. */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuestInquiryCleanupJob {

    static final int KEEP_MONTHS = 12;

    private final GuestInquiryRepository repository;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    // run() is called on this, which skips the proxy and its @Transactional, so the transaction opens here.
    @Transactional
    @Scheduled(cron = "${app.guest-inquiries.cleanup.cron:0 20 3 * * *}", zone = "Europe/Athens")
    public void runScheduled() {
        log.info("Guest inquiry cleanup deleted {} row(s)", run());
    }

    /** @return how many inquiries were deleted */
    @Transactional
    public int run() {
        return repository.deleteCreatedBefore(OffsetDateTime.now(clock).minusMonths(KEEP_MONTHS));
    }
}
```

- [ ] **Step 4: Delete the guest's rows in `UserAnonymizer.anonymize`**

Next to the other `delete from …` statements, for example right after `delete from app_reviews`:

```java
        // KAN-20: the guest's inquiries hold their contact details and note; the partner's copy is the email.
        em.createNativeQuery("delete from guest_inquiries where guest_user_id = :id")
                .setParameter("id", userId).executeUpdate();
```

- [ ] **Step 5: Run and confirm they pass**

Run: `./gradlew test --tests "event_social_media.service.vendor.GuestInquiryCleanupTest"`

If `anonymize` returns early because the account isn't one to scrub, compare with an existing `UserAnonymizer` test (`git grep -l "anonymize(" src/test`) and set the account up the same way. Don't change `UserAnonymizer`'s guard.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/vendor/GuestInquiryCleanupJob.java src/main/java/event_social_media/service/user/deletion/UserAnonymizer.java src/test/java/event_social_media/service/vendor/GuestInquiryCleanupTest.java
git commit -m "KAN-20: delete guest inquiries after 12 months and with the guest's account"
```

---

### Task 10: The endpoint parity test

`security/VendorEndpointParityTest` sends every event endpoint as a vendor and as an attendee. It fails when the host can't get past validation, which here means a 400, or a 404 because nobody is a partner.

**Files:**
- Modify: `src/test/java/event_social_media/security/VendorEndpointParityTest.java`

- [ ] **Step 1: Run it to see the failure**

Run: `./gradlew test --tests "event_social_media.security.VendorEndpointParityTest"`
Expected: `everyMutatingEndpointReachesItsAuthorizationCheck` fails for `GuestInquiryController#askVendor` and `#askFeedCardPartner`.

- [ ] **Step 2: Add bodies, needs and fixtures**

In `BODIES`, add:

```java
            entry("GuestInquiryController#askVendor",
                    "{\"eventDate\":\"<futureDate>\",\"email\":\"guest@example.com\",\"consent\":true}"),
            entry("GuestInquiryController#askFeedCardPartner",
                    "{\"eventDate\":\"<futureDate>\",\"email\":\"guest@example.com\",\"consent\":true}"),
```

In `NEEDS`, add (it is a `Map.of`, which holds at most 10 entries; there are 7 now):

```java
            "GuestInquiryController#askVendor", List.of("partnerOtherVendor"),
            "GuestInquiryController#askFeedCardPartner", List.of("showingPartnerBranding"),
```

In `Scenario.create`'s `switch`, add:

```java
                case "futureDate" -> LocalDate.now(java.time.ZoneId.of("Europe/Athens")).plusDays(60).toString();
                // KAN-20: the vendor the /vendors/{vendorId} path names, made an approved partner.
                case "partnerOtherVendor" -> {
                    EventVendor other = entityManager.find(EventVendor.class, UUID.fromString(value("otherVendor")));
                    Collaborator partner = fixtures.newCollaborator();
                    partner.setContactEmail(other.getUser().getEmail());
                    entityManager.persist(partner);
                    entityManager.flush();
                    yield "ok";
                }
                // KAN-20: a feed card that shows, so a guest can ask its partner.
                case "showingPartnerBranding" -> {
                    EventPartnerBranding branding = new EventPartnerBranding();
                    branding.setEventId(eventId);
                    branding.setCollaborator(fixtures.newBrandedCollaborator());
                    branding.setSource(BrandingSource.ADMIN);
                    branding.setVariant(BrandingVariant.FEATURE_CARD);
                    branding.setAcceptedAt(OffsetDateTime.now());
                    brandingRepository.saveAndFlush(branding);
                    yield "ok";
                }
```

Add imports that are missing: `java.time.LocalDate`, `event_social_media.model.vendor.EventVendor`, `event_social_media.model.collaboration.Collaborator`. `fixtures.newCollaborator()` already saves the partner, so `entityManager.persist` merges a managed entity. If the test complains, replace the two lines with `collaboratorRepository.saveAndFlush(partner)` and autowire `CollaboratorRepository`.

- [ ] **Step 3: Run it**

Run: `./gradlew test --tests "event_social_media.security.VendorEndpointParityTest"`
Expected: PASS. A vendor and an attendee both get 201 from each route, since neither is the partner.

If a vendor caller and an attendee answer differently, stop. Show the mismatch to the user instead of adding the routes to an `OPENED_…` set: the spec says a vendor guest may ask like anyone else.

- [ ] **Step 4: Commit**

```bash
git add src/test/java/event_social_media/security/VendorEndpointParityTest.java
git commit -m "KAN-20: cover the inquiry routes in the vendor parity test"
```

---

### Task 11: Full suite and PR

- [ ] **Step 1:** Run everything: `./gradlew test`
Expected: everything passes, except tests that already failed in the baseline before Task 1. List any of those in the PR.

- [ ] **Step 2:** Merge the latest staging and re-run:

```bash
git fetch origin && git merge origin/staging && ./gradlew test
```

- [ ] **Step 3:** Push and open the PR into `staging` **only after the user says so**. Title `KAN-20: guest inquiries to partners (backend)`. In the body:
  - the new routes and DTO fields
  - the migration number
  - the release order: this first, then storywall
  - the email wording, as approved
  - name only KAN-20, so no other ticket moves
  - end with the attribution line

---

## Self-review notes

- **Spec coverage:**
  - table: Task 1
  - codes and DTOs: Task 2
  - email wording gate: Task 3
  - vendor-list send, consent, limits, audit: Task 4
  - feed-card send and card state: Task 5
  - email: Task 6
  - My business list and done: Task 7
  - per-guest limit: Task 8
  - retention and account deletion: Task 9
  - parity guard: Task 10
- **Out of scope here:** the frontend and the privacy policy lines; see the frontend plan.
