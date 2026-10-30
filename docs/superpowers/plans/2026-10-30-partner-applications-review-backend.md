# Partner Applications Review (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin list, read, approve and decline partner applications in Spring, with a founding-partner flag on collaborators, a public founding-spots count, and the three applicant emails.

**Architecture:** A new `PartnerApplicationAdminController` under `/api/admin/partner-applications` calls a new `PartnerApplicationReviewService`. Approve maps the application to a `Collaborator` through a pure static helper (`PartnerApplicationCollaboratorMapping`), so the mapping is unit-tested without Spring. `Collaborator` gets `founding`; a small `FoundingSpots` service owns the cap (20) and is used by approve, by collaborator create/update, and by the new public `GET /api/public/partner-program`. The emails are three new methods on `TransactionalMailService`, sent after commit like every other transactional email.

**Tech Stack:** Spring Boot, JPA/Hibernate, Flyway (Postgres), H2 for tests (`ddl-auto=create`, Flyway off), MockMvc + JUnit 5 + AssertJ, Mockito.

**Spec:** [docs/superpowers/specs/2026-10-10-partner-applications-admin-design.md](../specs/2026-10-10-partner-applications-admin-design.md) (in the frontend repo).

**Repo:** `C:\Users\User\IdeaProjects\event_social_media`. All paths below are relative to it. Package root `src/main/java/event_social_media` is written `…/` below.

---

## Decisions this plan makes (beyond the spec)

- **`founding` on `CollaboratorRequestDto` is a nullable `Boolean`.** `null` means `false` on create and "leave it alone" on update, the same rule `status` already follows. The suspend/reactivate flow sends the whole request, and a required boolean would make every caller resend it.
- **The founding count ignores soft-deleted partners** (`deleted_at IS NOT NULL`). Deleting a partner frees their spot. Suspended partners still hold theirs, as the spec says.
- **Concurrency:** approve locks the application row (`PESSIMISTIC_WRITE`), so two admins can't both decide the same application. Two admins approving *different* founding applications in the same instant could still go one over 20. That's accepted: there are one or two admins.
- **Phone normalization:** strip spaces, `-`, `(`, `)`, and turn a leading `00` into `+`. If the result matches E.164 (`\+[1-9]\d{6,14}`), it becomes `contactPhone`. Otherwise the raw value goes into notes as `Phone: <raw>`. A Greek number typed without `+30` goes to notes, because the country code can't be guessed safely.
- **Public summary cache:** the frontend caches `/api/public/partner-program` for 5 minutes (`SUMMARY_REVALIDATE_SECONDS`), so the public count can trail an approval by up to 5 minutes. No change is needed here.

## File structure

| File | Responsibility |
| --- | --- |
| Create `src/main/resources/db/migration/V189__partner_application_review.sql` | `collaborators.founding`; decision columns on `partner_applications`; list index |
| Modify `…/model/collaboration/Collaborator.java` | `founding` field |
| Modify `…/model/collaboration/PartnerApplication.java` | `decidedAt`, `decidedBy`, `declineReason`, `collaboratorId` |
| Modify `…/exception/ErrorCode.java` | `PARTNER_APPLICATION_NOT_PENDING`, `FOUNDING_SPOTS_FULL`, `COLLABORATOR_EMAIL_EXISTS` |
| Create `…/exception/CollaboratorEmailExistsException.java` | 409 with `details.collaboratorId` |
| Create `…/service/collaboration/FoundingSpots.java` | the cap, the count, the "is there room" check |
| Create `…/service/collaboration/PartnerApplicationCollaboratorMapping.java` | pure application → collaborator mapping |
| Create `…/service/collaboration/PartnerApplicationReviewService.java` | list, get, approve, decline |
| Create `…/controller/platform/PartnerApplicationAdminController.java` | admin endpoints |
| Create `…/controller/collaboration/PartnerProgramController.java` | `GET /api/public/partner-program` |
| Create DTOs in `…/dto/collaboration/` | `AdminPartnerApplicationDto`, `ApprovePartnerApplicationRequestDto`, `ApprovePartnerApplicationResponseDto`, `DeclinePartnerApplicationRequestDto`, `PartnerProgramSummaryDto` |
| Modify `…/repository/collaboration/PartnerApplicationRepository.java` | paged finders, locked finder |
| Modify `…/repository/collaboration/CollaboratorRepository.java` | founding count, find-by-email |
| Modify `…/dto/collaboration/CollaboratorRequestDto.java`, `CollaboratorResponseDto.java` | `founding` |
| Modify `…/service/collaboration/CollaboratorAdminService.java` | apply `founding` on create/update |
| Modify `…/service/mail/TransactionalMailService.java` | three applicant emails |
| Modify `src/main/resources/i18n/messages.properties`, `messages_el.properties` | email copy |
| Modify `…/service/collaboration/PartnerApplicationService.java` | send "received" on apply |
| Modify `…/config/SecurityConfig.java`, `…/config/WebMvcConfig.java` | make the summary public |
| Modify `docs/fe-guides/collaborations-fe-integration.md` | document the new contract |

---

### Task 0: Branch in a new worktree

- [ ] **Step 1: Create the worktree from the latest staging**

```bash
cd /c/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add ../event_social_media-partner-review -b feat/partner-application-review origin/staging
cd ../event_social_media-partner-review
```

The main checkout stays on `feat/campaign-chart-by-source`. Run every later command from `../event_social_media-partner-review`.

- [ ] **Step 2: Confirm the next free migration and error-code numbers**

```bash
ls src/main/resources/db/migration | sed 's/^V\([0-9]*\)__.*/\1/' | sort -n | tail -1
grep -oE "\(5[0-9]{3}\)" src/main/java/event_social_media/exception/ErrorCode.java | sort | tail -1
```

Expected: `188` and `(5188)`. If either is higher, use the next free number everywhere this plan says `V189` / `5189`–`5191`.

---

### Task 1: Migration and entity fields

**Files:**
- Create: `src/main/resources/db/migration/V189__partner_application_review.sql`
- Modify: `…/model/collaboration/Collaborator.java`
- Modify: `…/model/collaboration/PartnerApplication.java`

- [ ] **Step 1: Write the migration**

```sql
-- Founding partners hold one of the 20 spots the for-business page promises.
ALTER TABLE collaborators ADD COLUMN founding BOOLEAN NOT NULL DEFAULT FALSE;

-- Who decided an application, when, why (decline), and the partner it became (approve).
ALTER TABLE partner_applications ADD COLUMN decided_at TIMESTAMPTZ;
ALTER TABLE partner_applications ADD COLUMN decided_by UUID REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE partner_applications ADD COLUMN decline_reason VARCHAR(1000);
ALTER TABLE partner_applications ADD COLUMN collaborator_id UUID REFERENCES collaborators (id) ON DELETE SET NULL;

-- The admin list filters by status and shows newest first.
CREATE INDEX idx_partner_applications_status_created ON partner_applications (status, created_at DESC);
```

- [ ] **Step 2: Add `founding` to `Collaborator`**

Add next to `status` in `…/model/collaboration/Collaborator.java`:

```java
    /** Holds one of the founding spots. Suspended partners keep it; a deleted one frees it. */
    @Column(name = "founding", nullable = false)
    private boolean founding;
```

- [ ] **Step 3: Add the decision fields to `PartnerApplication`**

Add after `createdAt` in `…/model/collaboration/PartnerApplication.java` (add the `ManyToOne`, `FetchType`, `JoinColumn` and `event_social_media.model.user.User` imports):

```java
    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    /** Sent to the applicant as written. Null when declined without a reason, or not declined. */
    @Column(name = "decline_reason", length = 1000)
    private String declineReason;

    /** The partner the approval created. */
    @Column(name = "collaborator_id")
    private UUID collaboratorId;
```

Also update the enum's comment in `PartnerApplicationStatus.java` to `/** Review state of a partner application. */`, and the class comment in `PartnerApplicationService.java` to `/** Stores partner applications as {@code PENDING}. Review lives in {@link PartnerApplicationReviewService}. */`.

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V189__partner_application_review.sql src/main/java/event_social_media/model/collaboration
git add src/main/java/event_social_media/service/collaboration/PartnerApplicationService.java
git commit -m "feat(partners): founding flag and application decision columns"
```

---

### Task 2: Error codes and the email-exists exception

**Files:**
- Modify: `…/exception/ErrorCode.java`
- Create: `…/exception/CollaboratorEmailExistsException.java`

- [ ] **Step 1: Add the codes**

Add after `PARTNER_APPLICATION_PENDING(5180)`'s neighbours at the end of the 5xxx block (after `5188`), following the file's existing comment style:

```java
    /** Approve or decline on an application someone already decided. */
    PARTNER_APPLICATION_NOT_PENDING(5189),

    /** Founding was asked for with no founding spots left. */
    FOUNDING_SPOTS_FULL(5190),

    /** Approve would create a second partner with the same contact email. Details carry its id. */
    COLLABORATOR_EMAIL_EXISTS(5191),
```

- [ ] **Step 2: Create the exception**

```java
package event_social_media.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.UUID;

/** 409 {@link ErrorCode#COLLABORATOR_EMAIL_EXISTS}, naming the partner that already has the email. */
@Getter
public class CollaboratorEmailExistsException extends ApiException implements HasErrorDetails {

    private final Map<String, Object> details;

    public CollaboratorEmailExistsException(UUID collaboratorId) {
        super("A partner with this email already exists.", HttpStatus.CONFLICT, ErrorCode.COLLABORATOR_EMAIL_EXISTS,
                "error.collaborator.email_exists");
        this.details = Map.of("collaboratorId", collaboratorId.toString());
    }
}
```

- [ ] **Step 3: Add the message key**

Find where `error.landing_category.type_assigned` lives:

```bash
grep -rn "error.landing_category.type_assigned" src/main/resources/i18n
```

Add next to it in both files:

- `messages.properties`: `error.collaborator.email_exists=A partner with this email already exists.`
- `messages_el.properties`: `error.collaborator.email_exists=Υπάρχει ήδη συνεργάτης με αυτό το email.`

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/exception src/main/resources/i18n
git commit -m "feat(partners): error codes for reviewing applications"
```

---

### Task 3: Founding spots

**Files:**
- Modify: `…/repository/collaboration/CollaboratorRepository.java`
- Create: `…/service/collaboration/FoundingSpots.java`
- Test: `src/test/java/event_social_media/service/collaboration/FoundingSpotsTest.java`

- [ ] **Step 1: Add the repository queries**

In `CollaboratorRepository`:

```java
    long countByFoundingTrueAndDeletedAtIsNull();

    Optional<Collaborator> findFirstByContactEmailIgnoreCaseAndDeletedAtIsNull(String contactEmail);
```

- [ ] **Step 2: Write the failing test**

```java
package event_social_media.service.collaboration;

import event_social_media.exception.ApiException;
import event_social_media.exception.ErrorCode;
import event_social_media.repository.collaboration.CollaboratorRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FoundingSpotsTest {

    private final CollaboratorRepository repository = mock(CollaboratorRepository.class);
    private final FoundingSpots spots = new FoundingSpots(repository);

    @Test
    void leftIsTheCapMinusTheFoundingPartners() {
        when(repository.countByFoundingTrueAndDeletedAtIsNull()).thenReturn(7L);

        assertThat(spots.left()).isEqualTo(13);
    }

    @Test
    void leftNeverGoesBelowZero() {
        when(repository.countByFoundingTrueAndDeletedAtIsNull()).thenReturn(25L);

        assertThat(spots.left()).isZero();
    }

    @Test
    void requireRoomRefusesWhenFull() {
        when(repository.countByFoundingTrueAndDeletedAtIsNull()).thenReturn(20L);

        assertThatThrownBy(spots::requireRoom)
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.FOUNDING_SPOTS_FULL);
    }

    @Test
    void requireRoomPassesWithASpotLeft() {
        when(repository.countByFoundingTrueAndDeletedAtIsNull()).thenReturn(19L);

        spots.requireRoom();
    }
}
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `./gradlew test --tests "event_social_media.service.collaboration.FoundingSpotsTest"`
Expected: FAIL, compilation error `cannot find symbol: class FoundingSpots`

- [ ] **Step 4: Implement**

```java
package event_social_media.service.collaboration;

import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.repository.collaboration.CollaboratorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** The "first 20 partners" promise on the for-business page. */
@Service
@RequiredArgsConstructor
public class FoundingSpots {

    /** Must match {@code FOUNDING_SPOTS_FALLBACK_TOTAL} in the frontend's {@code lib/forBusiness.ts}. */
    public static final int TOTAL = 20;

    private final CollaboratorRepository collaboratorRepository;

    public int left() {
        long taken = collaboratorRepository.countByFoundingTrueAndDeletedAtIsNull();
        return (int) Math.max(0, TOTAL - taken);
    }

    /** 409 {@link ErrorCode#FOUNDING_SPOTS_FULL} when every spot is taken. */
    public void requireRoom() {
        if (left() == 0) {
            throw new ConflictException(ErrorCode.FOUNDING_SPOTS_FULL, "No founding spots are left.");
        }
    }
}
```

- [ ] **Step 5: Run it to make sure it passes**

Run: `./gradlew test --tests "event_social_media.service.collaboration.FoundingSpotsTest"`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/repository/collaboration/CollaboratorRepository.java src/main/java/event_social_media/service/collaboration/FoundingSpots.java src/test/java/event_social_media/service/collaboration/FoundingSpotsTest.java
git commit -m "feat(partners): founding spots count"
```

---

### Task 4: Public founding-spots summary

**Files:**
- Create: `…/dto/collaboration/PartnerProgramSummaryDto.java`
- Create: `…/controller/collaboration/PartnerProgramController.java`
- Modify: `…/config/SecurityConfig.java:119`
- Modify: `…/config/WebMvcConfig.java:53`
- Test: `src/test/java/event_social_media/controller/collaboration/PartnerProgramControllerTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.collaboration;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.CollaboratorStatus;
import event_social_media.repository.collaboration.CollaboratorRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PartnerProgramControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private CollaboratorRepository collaboratorRepository;

    private void partner(String email, boolean founding, OffsetDateTime deletedAt) {
        Collaborator collaborator = new Collaborator();
        collaborator.setName(email);
        collaborator.setContactEmail(email);
        collaborator.setStatus(CollaboratorStatus.ACTIVE);
        collaborator.setFounding(founding);
        collaborator.setDeletedAt(deletedAt);
        collaboratorRepository.save(collaborator);
    }

    @Test
    void countsFoundingPartnersWithoutASession() throws Exception {
        partner("a@example.com", true, null);
        partner("b@example.com", true, null);
        partner("c@example.com", false, null);
        partner("d@example.com", true, OffsetDateTime.now());

        mockMvc.perform(get("/api/public/partner-program"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.foundingSpotsTotal").value(20))
                .andExpect(jsonPath("$.foundingSpotsLeft").value(18));
    }
}
```

If `Collaborator` has other `@NotNull` columns the save complains about, set them the way `fixtures` does in `CollaborationAdminControllerTest` (grep `newCollaborator` in `src/test`) and reuse that fixture instead.

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.PartnerProgramControllerTest"`
Expected: FAIL, 401 or 404 instead of 200

- [ ] **Step 3: Implement the DTO and controller**

```java
package event_social_media.dto.collaboration;

/** {@code GET /api/public/partner-program}. {@code foundingSpotsLeft} is never negative. */
public record PartnerProgramSummaryDto(int foundingSpotsTotal, int foundingSpotsLeft) {
}
```

```java
package event_social_media.controller.collaboration;

import event_social_media.dto.collaboration.PartnerProgramSummaryDto;
import event_social_media.service.collaboration.FoundingSpots;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public: the for-business page's "X of 20 spots left". The frontend caches it for five minutes. */
@RestController
@RequiredArgsConstructor
public class PartnerProgramController {

    private final FoundingSpots foundingSpots;

    @GetMapping("/api/public/partner-program")
    public PartnerProgramSummaryDto summary() {
        return new PartnerProgramSummaryDto(FoundingSpots.TOTAL, foundingSpots.left());
    }
}
```

- [ ] **Step 4: Make it public**

In `SecurityConfig.java`, next to the `POST /api/public/partner-applications` line (around line 119):

```java
                        .requestMatchers(HttpMethod.GET, "/api/public/partner-program").permitAll()
```

In `WebMvcConfig.java`, add to the acceptance-exclusion list right after `"/api/public/partner-applications",`:

```java
                        "/api/public/partner-program",
```

- [ ] **Step 5: Run it to make sure it passes**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.PartnerProgramControllerTest"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/collaboration/PartnerProgramSummaryDto.java src/main/java/event_social_media/controller/collaboration/PartnerProgramController.java src/main/java/event_social_media/config src/test/java/event_social_media/controller/collaboration/PartnerProgramControllerTest.java
git commit -m "feat(partners): public founding spots summary"
```

---

### Task 5: `founding` on the collaborator admin API

**Files:**
- Modify: `…/dto/collaboration/CollaboratorRequestDto.java`
- Modify: `…/dto/collaboration/CollaboratorResponseDto.java`
- Modify: `…/service/collaboration/CollaboratorAdminService.java:96-128`
- Test: `src/test/java/event_social_media/controller/platform/CollaborationAdminControllerTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `CollaborationAdminControllerTest` (it already has `admin()`, `mockMvc` and `fixtures`; also autowire `CollaboratorRepository collaboratorRepository` if it isn't there):

```java
    @Test
    void createDefaultsToNotFoundingAndCanSetIt() throws Exception {
        mockMvc.perform(post("/api/admin/collaborators").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Plain\",\"contactEmail\":\"plain@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.founding").value(false));

        mockMvc.perform(post("/api/admin/collaborators").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"First\",\"contactEmail\":\"first@example.com\",\"founding\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.founding").value(true));
    }

    @Test
    void updateWithoutFoundingLeavesItAlone() throws Exception {
        String id = com.jayway.jsonpath.JsonPath.read(mockMvc.perform(post("/api/admin/collaborators").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"First\",\"contactEmail\":\"first@example.com\",\"founding\":true}"))
                .andReturn().getResponse().getContentAsString(), "$.id");

        mockMvc.perform(patch("/api/admin/collaborators/" + id).with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"First\",\"contactEmail\":\"first@example.com\",\"status\":\"SUSPENDED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.founding").value(true));
    }

    @Test
    void foundingIsRefusedWhenEverySpotIsTaken() throws Exception {
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/admin/collaborators").with(admin())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"P" + i + "\",\"contactEmail\":\"p" + i + "@example.com\",\"founding\":true}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/admin/collaborators").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Late\",\"contactEmail\":\"late@example.com\",\"founding\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5190));
    }
```

Check how other tests in this file read the error code (`$.errorCode` or `$.code`) with `grep -n "errorCode\|\\$.code" src/test/java/event_social_media/controller/platform/CollaborationAdminControllerTest.java` and match it. Add the `patch` static import if it's missing.

- [ ] **Step 2: Run them to make sure they fail**

Run: `./gradlew test --tests "event_social_media.controller.platform.CollaborationAdminControllerTest"`
Expected: the three new tests FAIL (`No value at JSON path "$.founding"`)

- [ ] **Step 3: Add the field to the request DTO**

```java
/**
 * Admin input for creating or updating a partner.
 *
 * @param status   null on create means ACTIVE, and null on update means "leave it alone" — suspending
 *                 a partner is the only reason this field exists
 * @param founding null on create means false, and null on update means "leave it alone"
 */
public record CollaboratorRequestDto(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Email @Size(max = 320) String contactEmail,
        @Size(max = 2000) String notes,
        CollaboratorStatus status,
        Boolean founding) {
}
```

Fix every other `new CollaboratorRequestDto(` caller the compiler reports by passing `null` as the last argument.

- [ ] **Step 4: Add it to the response DTO**

In `CollaboratorResponseDto`, add `boolean founding,` right after `CollaboratorStatus status,` in the record header, and `collaborator.isFounding(),` right after `collaborator.getStatus(),` in `from(...)`.

- [ ] **Step 5: Apply it in the service**

`CollaboratorAdminService` gets `private final FoundingSpots foundingSpots;`. In `createCollaborator`, before `save`:

```java
        if (Boolean.TRUE.equals(body.founding())) {
            foundingSpots.requireRoom();
            collaborator.setFounding(true);
        }
```

In `updateCollaborator`, before `save`:

```java
        if (body.founding() != null && body.founding() != collaborator.isFounding()) {
            if (body.founding()) {
                foundingSpots.requireRoom();
            }
            log.info("Collaborator {} founding set to {}", collaboratorId, body.founding());
            collaborator.setFounding(body.founding());
        }
```

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.platform.CollaborationAdminControllerTest"`
Expected: PASS, including the existing tests

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media src/test/java/event_social_media/controller/platform/CollaborationAdminControllerTest.java
git commit -m "feat(partners): founding flag on the collaborator admin API"
```

---

### Task 6: Application → collaborator mapping

**Files:**
- Create: `…/service/collaboration/PartnerApplicationCollaboratorMapping.java`
- Test: `src/test/java/event_social_media/service/collaboration/PartnerApplicationCollaboratorMappingTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.collaboration;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.CollaboratorStatus;
import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.model.collaboration.PartnerRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerApplicationCollaboratorMappingTest {

    private static PartnerApplication application() {
        PartnerApplication a = new PartnerApplication();
        a.setName("Maria P");
        a.setBusinessName("Studio M");
        a.setRole(PartnerRole.PHOTOGRAPHER);
        a.setEmail("Maria@Example.com");
        a.setLink("https://studiom.gr");
        a.setCountryCode("GR");
        a.setPhone("+30 691 234 5678");
        a.setLocale("el");
        return a;
    }

    @Test
    void mapsTheBasics() {
        Collaborator c = PartnerApplicationCollaboratorMapping.toCollaborator(application(), true);

        assertThat(c.getName()).isEqualTo("Studio M");
        assertThat(c.getContactEmail()).isEqualTo("maria@example.com");
        assertThat(c.getContactPersonName()).isEqualTo("Maria P");
        assertThat(c.getContactPhone()).isEqualTo("+306912345678");
        assertThat(c.getWebsiteUrl()).isEqualTo("https://studiom.gr");
        assertThat(c.getCountryCode()).isEqualTo("EL");
        assertThat(c.isFounding()).isTrue();
        assertThat(c.getStatus()).isEqualTo(CollaboratorStatus.ACTIVE);
        assertThat(c.getNotes()).isEqualTo("Role: PHOTOGRAPHER");
    }

    @Test
    void anInstagramHandleGoesToNotes() {
        PartnerApplication a = application();
        a.setLink("@studiom");

        Collaborator c = PartnerApplicationCollaboratorMapping.toCollaborator(a, false);

        assertThat(c.getWebsiteUrl()).isNull();
        assertThat(c.getNotes()).isEqualTo("Role: PHOTOGRAPHER\nInstagram: @studiom");
    }

    @Test
    void aDoubleZeroPrefixBecomesPlus() {
        PartnerApplication a = application();
        a.setPhone("0030 (691) 234-5678");

        assertThat(PartnerApplicationCollaboratorMapping.toCollaborator(a, false).getContactPhone())
                .isEqualTo("+306912345678");
    }

    @Test
    void aPhoneThatIsNotE164GoesToNotes() {
        PartnerApplication a = application();
        a.setPhone("691 234 5678");

        Collaborator c = PartnerApplicationCollaboratorMapping.toCollaborator(a, false);

        assertThat(c.getContactPhone()).isNull();
        assertThat(c.getNotes()).isEqualTo("Role: PHOTOGRAPHER\nPhone: 691 234 5678");
    }

    @Test
    void aCountryOutsideViesGoesToNotes() {
        PartnerApplication a = application();
        a.setCountryCode("US");

        Collaborator c = PartnerApplicationCollaboratorMapping.toCollaborator(a, false);

        assertThat(c.getCountryCode()).isNull();
        assertThat(c.getNotes()).isEqualTo("Role: PHOTOGRAPHER\nCountry: US");
    }

    @Test
    void anEuCountryOtherThanGreeceKeepsItsCode() {
        PartnerApplication a = application();
        a.setCountryCode("DE");

        assertThat(PartnerApplicationCollaboratorMapping.toCollaborator(a, false).getCountryCode()).isEqualTo("DE");
    }

    @Test
    void theSourceIsNoted() {
        PartnerApplication a = application();
        a.setUtmSource("instagram");

        assertThat(PartnerApplicationCollaboratorMapping.toCollaborator(a, false).getNotes())
                .isEqualTo("Role: PHOTOGRAPHER\nApplied via instagram");
    }

    @Test
    void noPhoneIsNotNoted() {
        PartnerApplication a = application();
        a.setPhone(null);

        Collaborator c = PartnerApplicationCollaboratorMapping.toCollaborator(a, false);

        assertThat(c.getContactPhone()).isNull();
        assertThat(c.getNotes()).isEqualTo("Role: PHOTOGRAPHER");
    }
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests "event_social_media.service.collaboration.PartnerApplicationCollaboratorMappingTest"`
Expected: FAIL, `cannot find symbol: class PartnerApplicationCollaboratorMapping`

- [ ] **Step 3: Implement**

```java
package event_social_media.service.collaboration;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.CollaboratorStatus;
import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.service.user.business.VatNumbers;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Fills a new partner from an approved application (admin spec, "How approve fills the collaborator").
 * Whatever has no column of its own goes into notes, one line each, so nothing the applicant sent is lost.
 */
final class PartnerApplicationCollaboratorMapping {

    private static final Pattern E164 = Pattern.compile("\\+[1-9]\\d{6,14}");
    private static final Pattern PHONE_SEPARATORS = Pattern.compile("[\\s()\\-]");

    private PartnerApplicationCollaboratorMapping() {
    }

    static Collaborator toCollaborator(PartnerApplication application, boolean founding) {
        List<String> notes = new ArrayList<>();
        notes.add("Role: " + application.getRole());

        Collaborator collaborator = new Collaborator();
        collaborator.setName(application.getBusinessName());
        collaborator.setContactEmail(application.getEmail().trim().toLowerCase(Locale.ROOT));
        collaborator.setContactPersonName(application.getName());
        collaborator.setStatus(CollaboratorStatus.ACTIVE);
        collaborator.setFounding(founding);

        // The public form only accepts an https URL or an @handle.
        String link = application.getLink();
        if (link.startsWith("https://")) {
            collaborator.setWebsiteUrl(link);
        } else {
            notes.add("Instagram: " + link);
        }

        String phone = application.getPhone();
        if (phone != null) {
            String e164 = e164(phone);
            if (e164 != null) {
                collaborator.setContactPhone(e164);
            } else {
                notes.add("Phone: " + phone);
            }
        }

        String vies = "GR".equals(application.getCountryCode()) ? "EL" : application.getCountryCode();
        if (VatNumbers.COUNTRIES.contains(vies)) {
            collaborator.setCountryCode(vies);
        } else {
            notes.add("Country: " + application.getCountryCode());
        }

        if (application.getUtmSource() != null) {
            notes.add("Applied via " + application.getUtmSource());
        }
        collaborator.setNotes(String.join("\n", notes));
        return collaborator;
    }

    /** The number as E.164, or null when it isn't one once separators are stripped. */
    private static String e164(String raw) {
        String digits = PHONE_SEPARATORS.matcher(raw).replaceAll("");
        if (digits.startsWith("00")) {
            digits = "+" + digits.substring(2);
        }
        return E164.matcher(digits).matches() ? digits : null;
    }
}
```

- [ ] **Step 4: Run it to make sure it passes**

Run: `./gradlew test --tests "event_social_media.service.collaboration.PartnerApplicationCollaboratorMappingTest"`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/collaboration/PartnerApplicationCollaboratorMapping.java src/test/java/event_social_media/service/collaboration/PartnerApplicationCollaboratorMappingTest.java
git commit -m "feat(partners): map an approved application to a partner"
```

---

### Task 7: Applicant emails

**Files:**
- Modify: `src/main/resources/i18n/messages.properties`
- Modify: `src/main/resources/i18n/messages_el.properties`
- Modify: `…/service/mail/TransactionalMailService.java`
- Test: `src/test/java/event_social_media/service/mail/TransactionalMailServiceTest.java`

- [ ] **Step 1: Add the copy**

Add after the `email.welcome.*` block in `messages.properties`:

```properties
email.partner_application.received.subject=We got your application
email.partner_application.received.body=Thanks for applying to partner with StoryWall. We'll review it and reply by email.
email.partner_application.approved.subject=You're a StoryWall partner
email.partner_application.approved.body=You're in. We'll email your code and partner page shortly.
email.partner_application.approved.founding=You're one of our founding partners.
email.partner_application.declined.subject=About your StoryWall application
email.partner_application.declined.body=Thanks for applying. We can't take your application forward right now.
```

And after `email.welcome.*` in `messages_el.properties`:

```properties
email.partner_application.received.subject=Λάβαμε την αίτησή σας
email.partner_application.received.body=Ευχαριστούμε για την αίτηση συνεργασίας με το StoryWall. Θα την εξετάσουμε και θα σας απαντήσουμε με email.
email.partner_application.approved.subject=Είστε συνεργάτης του StoryWall
email.partner_application.approved.body=Η αίτησή σας εγκρίθηκε. Θα σας στείλουμε σύντομα τον κωδικό και τη σελίδα συνεργάτη.
email.partner_application.approved.founding=Είστε ένας από τους ιδρυτικούς μας συνεργάτες.
email.partner_application.declined.subject=Σχετικά με την αίτησή σας στο StoryWall
email.partner_application.declined.body=Ευχαριστούμε για την αίτηση. Αυτή τη στιγμή δεν μπορούμε να προχωρήσουμε.
```

Check how the existing files escape an apostrophe in a value with `{...}` arguments (`MessageFormat` needs `''`). These keys are read with `plain(...)`, so first check what `MessageRenderer.plain` does with a single `'`:

```bash
grep -n "'" src/main/resources/i18n/messages.properties | head -5
```

If existing `plain` values use a single `'` (e.g. `You'll`), keep it as written above. If they use `''`, double them.

- [ ] **Step 2: Write the failing tests**

Add to `TransactionalMailServiceTest`:

```java
    private EmailMessage captureOne() {
        var captor = org.mockito.ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());
        return captor.getValue();
    }

    @Test
    void partnerApplicationReceived_followsTheApplicationsLanguage() {
        mailService.sendPartnerApplicationReceived("m@example.com", Locale.forLanguageTag("el"));

        EmailMessage message = captureOne();
        assertThat(message.subject()).isEqualTo("Λάβαμε την αίτησή σας");
    }

    @Test
    void partnerApplicationApproved_addsTheFoundingLineOnlyForFounders() {
        mailService.sendPartnerApplicationApproved("m@example.com", true, Locale.ENGLISH);

        EmailMessage message = captureOne();
        assertThat(message.subject()).isEqualTo("You're a StoryWall partner");
        assertThat(message.textBody()).contains("You're in.").contains("You're one of our founding partners.");
    }

    @Test
    void partnerApplicationApproved_withoutFounding() {
        mailService.sendPartnerApplicationApproved("m@example.com", false, Locale.ENGLISH);

        assertThat(captureOne().textBody()).doesNotContain("founding");
    }

    @Test
    void partnerApplicationDeclined_appendsTheReasonAsItsOwnParagraph() {
        mailService.sendPartnerApplicationDeclined("m@example.com", "We only work in Athens for now.", Locale.ENGLISH);

        assertThat(captureOne().textBody())
                .contains("We can't take your application forward right now.\n\nWe only work in Athens for now.");
    }

    @Test
    void partnerApplicationDeclined_withoutAReason() {
        mailService.sendPartnerApplicationDeclined("m@example.com", null, Locale.ENGLISH);

        assertThat(captureOne().textBody()).contains("We can't take your application forward right now.");
    }
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `./gradlew test --tests "event_social_media.service.mail.TransactionalMailServiceTest"`
Expected: FAIL, `cannot find symbol: method sendPartnerApplicationReceived`

- [ ] **Step 4: Implement**

Add after `sendWelcome` in `TransactionalMailService`:

```java
    /** Confirms a partner application arrived. No action: the reply comes after review. */
    public void sendPartnerApplicationReceived(String toAddress, Locale locale) {
        String subject = messageRenderer.plain("email.partner_application.received.subject", locale);
        deliver(layout.compose(toAddress, subject, subject,
                messageRenderer.plain("email.partner_application.received.body", locale),
                List.of(), null, null),
                "partner application received");
    }

    /** The code and the partner page follow separately, sent by an admin. */
    public void sendPartnerApplicationApproved(String toAddress, boolean founding, Locale locale) {
        String subject = messageRenderer.plain("email.partner_application.approved.subject", locale);
        String body = messageRenderer.plain("email.partner_application.approved.body", locale);
        if (founding) {
            body += "\n\n" + messageRenderer.plain("email.partner_application.approved.founding", locale);
        }
        deliver(layout.compose(toAddress, subject, subject, body, List.of(), null, null),
                "partner application approved");
    }

    /** {@code reason} is the admin's own words, sent as written; null sends the generic line alone. */
    public void sendPartnerApplicationDeclined(String toAddress, String reason, Locale locale) {
        String subject = messageRenderer.plain("email.partner_application.declined.subject", locale);
        String body = messageRenderer.plain("email.partner_application.declined.body", locale);
        if (reason != null) {
            body += "\n\n" + reason;
        }
        deliver(layout.compose(toAddress, subject, subject, body, List.of(), null, null),
                "partner application declined");
    }
```

`EmailLayout.compose` escapes the body and renders it with `white-space:pre-line`, so `\n\n` shows as a paragraph break in both the text and HTML parts.

- [ ] **Step 5: Run them to make sure they pass**

Run: `./gradlew test --tests "event_social_media.service.mail.TransactionalMailServiceTest"`
Expected: PASS

- [ ] **Step 6: Send "received" on apply**

In `PartnerApplicationService`, inject `private final TransactionalMailService transactionalMailService;` and, right after `log.info("Partner application {} stored ({})", ...)`:

```java
            transactionalMailService.sendPartnerApplicationReceived(saved.getEmail(),
                    Locale.forLanguageTag(saved.getLocale()));
```

The honeypot branch returns before this, so a bot gets no email.

Add to `PartnerApplicationControllerTest` (add `@MockitoBean private TransactionalMailService transactionalMailService;`, or `@MockBean` if that's what the other tests in the repo use; check with `grep -rln "MockitoBean" src/test | head -1`):

```java
    @Test
    void sendsTheReceivedEmailInTheApplicationsLanguage() throws Exception {
        submit(body("m@example.com", "")).andExpect(status().isCreated());

        org.mockito.Mockito.verify(transactionalMailService)
                .sendPartnerApplicationReceived("m@example.com", java.util.Locale.forLanguageTag("el"));
    }

    @Test
    void theHoneypotSendsNoEmail() throws Exception {
        submit(body("m@example.com", "spam")).andExpect(status().isCreated());

        org.mockito.Mockito.verifyNoInteractions(transactionalMailService);
    }
```

Run: `./gradlew test --tests "event_social_media.controller.collaboration.PartnerApplicationControllerTest"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/i18n src/main/java/event_social_media/service src/test/java/event_social_media
git commit -m "feat(partners): received, approved and declined emails"
```

---

### Task 8: Review service

**Files:**
- Modify: `…/repository/collaboration/PartnerApplicationRepository.java`
- Create: `…/dto/collaboration/AdminPartnerApplicationDto.java`
- Create: `…/service/collaboration/PartnerApplicationReviewService.java`

- [ ] **Step 1: Repository finders**

Add to `PartnerApplicationRepository` (imports: `Page`, `Pageable`, `EntityGraph`, `Lock`, `LockModeType`, `Optional`):

```java
    @EntityGraph(attributePaths = "decidedBy")
    Page<PartnerApplication> findByStatus(PartnerApplicationStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "decidedBy")
    Page<PartnerApplication> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = "decidedBy")
    Optional<PartnerApplication> findWithDecidedById(UUID id);

    /** Held for the decision, so two admins can't both decide one application. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from PartnerApplication a where a.id = :id")
    Optional<PartnerApplication> findForUpdate(@Param("id") UUID id);
```

- [ ] **Step 2: The DTO**

```java
package event_social_media.dto.collaboration;

import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.model.collaboration.PartnerRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One application as the admin console reads it (admin spec, "Spring contract"). */
public record AdminPartnerApplicationDto(
        UUID id,
        PartnerApplicationStatus status,
        OffsetDateTime createdAt,
        String name,
        String businessName,
        PartnerRole role,
        String email,
        String link,
        String countryCode,
        String phone,
        String locale,
        String utmSource,
        String utmMedium,
        String utmCampaign,
        OffsetDateTime decidedAt,
        String decidedByEmail,
        String declineReason,
        UUID collaboratorId) {

    public static AdminPartnerApplicationDto from(PartnerApplication a) {
        return new AdminPartnerApplicationDto(a.getId(), a.getStatus(), a.getCreatedAt(), a.getName(),
                a.getBusinessName(), a.getRole(), a.getEmail(), a.getLink(), a.getCountryCode(), a.getPhone(),
                a.getLocale(), a.getUtmSource(), a.getUtmMedium(), a.getUtmCampaign(), a.getDecidedAt(),
                a.getDecidedBy() == null ? null : a.getDecidedBy().getEmail(), a.getDeclineReason(),
                a.getCollaboratorId());
    }
}
```

- [ ] **Step 3: The service**

```java
package event_social_media.service.collaboration;

import event_social_media.dto.collaboration.AdminPartnerApplicationDto;
import event_social_media.exception.CollaboratorEmailExistsException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.collaboration.PartnerApplicationRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.service.mail.TransactionalMailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

/** Admin review of partner applications: approve creates the partner, decline tells the applicant why. */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerApplicationReviewService {

    private final PartnerApplicationRepository applicationRepository;
    private final CollaboratorRepository collaboratorRepository;
    private final UserRepository userRepository;
    private final FoundingSpots foundingSpots;
    private final TransactionalMailService transactionalMailService;

    /** Newest first; a null status lists every application. */
    @Transactional(readOnly = true)
    public Page<AdminPartnerApplicationDto> list(PartnerApplicationStatus status, int page, int size) {
        PageRequest request = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PartnerApplication> rows = status == null
                ? applicationRepository.findAllBy(request)
                : applicationRepository.findByStatus(status, request);
        return rows.map(AdminPartnerApplicationDto::from);
    }

    @Transactional(readOnly = true)
    public AdminPartnerApplicationDto get(UUID id) {
        return applicationRepository.findWithDecidedById(id)
                .map(AdminPartnerApplicationDto::from)
                .orElseThrow(() -> new ResourceNotFoundException("PartnerApplication", id));
    }

    /** Creates the partner and returns its id. The applicant is emailed once this commits. */
    @Transactional
    public UUID approve(UUID id, boolean founding, UUID adminId) {
        PartnerApplication application = requirePending(id);
        collaboratorRepository.findFirstByContactEmailIgnoreCaseAndDeletedAtIsNull(application.getEmail())
                .ifPresent(existing -> {
                    throw new CollaboratorEmailExistsException(existing.getId());
                });
        if (founding) {
            foundingSpots.requireRoom();
        }

        Collaborator collaborator = collaboratorRepository.save(
                PartnerApplicationCollaboratorMapping.toCollaborator(application, founding));
        application.setStatus(PartnerApplicationStatus.APPROVED);
        application.setCollaboratorId(collaborator.getId());
        decided(application, adminId);

        log.info("Partner application {} approved as collaborator {} (founding: {})", id, collaborator.getId(), founding);
        transactionalMailService.sendPartnerApplicationApproved(application.getEmail(), founding, locale(application));
        return collaborator.getId();
    }

    /** {@code reason} is sent to the applicant as written; blank means none. */
    @Transactional
    public AdminPartnerApplicationDto decline(UUID id, String reason, UUID adminId) {
        PartnerApplication application = requirePending(id);
        String trimmed = reason == null || reason.isBlank() ? null : reason.trim();
        application.setStatus(PartnerApplicationStatus.DECLINED);
        application.setDeclineReason(trimmed);
        decided(application, adminId);

        log.info("Partner application {} declined (reason given: {})", id, trimmed != null);
        transactionalMailService.sendPartnerApplicationDeclined(application.getEmail(), trimmed, locale(application));
        return AdminPartnerApplicationDto.from(application);
    }

    private PartnerApplication requirePending(UUID id) {
        PartnerApplication application = applicationRepository.findForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("PartnerApplication", id));
        if (application.getStatus() != PartnerApplicationStatus.PENDING) {
            throw new ConflictException(ErrorCode.PARTNER_APPLICATION_NOT_PENDING,
                    "This application was already decided.");
        }
        return application;
    }

    private void decided(PartnerApplication application, UUID adminId) {
        application.setDecidedAt(OffsetDateTime.now());
        application.setDecidedBy(userRepository.getReferenceById(adminId));
    }

    private static Locale locale(PartnerApplication application) {
        return Locale.forLanguageTag(application.getLocale());
    }
}
```

Check the real `UserRepository` package with `grep -rn "interface UserRepository" src/main/java` and fix the import if it differs. Check `ResourceNotFoundException`'s constructor the same way (`VendorService` uses `new ResourceNotFoundException("Event", eventId)`).

`decline` returns the DTO built from the entity, and the entity's `decidedBy` is the lazy reference. `getEmail()` on it loads the admin's row inside this transaction, which is what we want.

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/repository/collaboration/PartnerApplicationRepository.java src/main/java/event_social_media/dto/collaboration/AdminPartnerApplicationDto.java src/main/java/event_social_media/service/collaboration/PartnerApplicationReviewService.java
git commit -m "feat(partners): review service for partner applications"
```

---

### Task 9: Admin controller and its tests

**Files:**
- Create: `…/dto/collaboration/ApprovePartnerApplicationRequestDto.java`
- Create: `…/dto/collaboration/ApprovePartnerApplicationResponseDto.java`
- Create: `…/dto/collaboration/DeclinePartnerApplicationRequestDto.java`
- Create: `…/controller/platform/PartnerApplicationAdminController.java`
- Test: `src/test/java/event_social_media/controller/platform/PartnerApplicationAdminControllerTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.controller.platform;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.CollaboratorStatus;
import event_social_media.model.collaboration.PartnerApplication;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.user.User;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.collaboration.PartnerApplicationRepository;
import event_social_media.service.mail.TransactionalMailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PartnerApplicationAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PartnerApplicationRepository applicationRepository;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private event_social_media.TestFixtures fixtures;
    @MockitoBean
    private TransactionalMailService transactionalMailService;

    private User adminUser;

    private RequestPostProcessor admin() {
        adminUser = fixtures.newUser();
        return authentication(new UsernamePasswordAuthenticationToken(
                adminUser.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    private PartnerApplication application(String email, PartnerApplicationStatus status, OffsetDateTime createdAt) {
        PartnerApplication a = new PartnerApplication();
        a.setStatus(status);
        a.setName("Maria P");
        a.setBusinessName("Studio " + email);
        a.setRole(PartnerRole.PHOTOGRAPHER);
        a.setEmail(email);
        a.setLink("@studiom");
        a.setCountryCode("GR");
        a.setLocale("el");
        a.setCreatedAt(createdAt);
        return applicationRepository.save(a);
    }

    private PartnerApplication pending(String email) {
        return application(email, PartnerApplicationStatus.PENDING, OffsetDateTime.now());
    }

    @Test
    @WithMockUser(roles = "USER")
    void nonAdminsAreRefused() throws Exception {
        mockMvc.perform(get("/api/admin/partner-applications")).andExpect(status().isForbidden());
    }

    @Test
    void listsByStatusNewestFirst() throws Exception {
        application("old@example.com", PartnerApplicationStatus.PENDING, OffsetDateTime.now().minusDays(2));
        application("new@example.com", PartnerApplicationStatus.PENDING, OffsetDateTime.now());
        application("done@example.com", PartnerApplicationStatus.DECLINED, OffsetDateTime.now());

        mockMvc.perform(get("/api/admin/partner-applications").param("status", "PENDING").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].email").value("new@example.com"))
                .andExpect(jsonPath("$.page.totalElements").value(2));

        mockMvc.perform(get("/api/admin/partner-applications").with(admin()))
                .andExpect(jsonPath("$.page.totalElements").value(3));
    }

    @Test
    void readsOne() throws Exception {
        PartnerApplication a = pending("m@example.com");

        mockMvc.perform(get("/api/admin/partner-applications/" + a.getId()).with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.businessName").value("Studio m@example.com"))
                .andExpect(jsonPath("$.decidedByEmail").isEmpty());
    }

    @Test
    void approveCreatesThePartnerAndEmailsTheApplicant() throws Exception {
        PartnerApplication a = pending("m@example.com");

        String body = mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/approve").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"founding\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.collaboratorId").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        UUID collaboratorId = UUID.fromString(com.jayway.jsonpath.JsonPath.read(body, "$.collaboratorId"));
        Collaborator c = collaboratorRepository.findById(collaboratorId).orElseThrow();
        assertThat(c.isFounding()).isTrue();
        assertThat(c.getNotes()).contains("Instagram: @studiom");

        PartnerApplication saved = applicationRepository.findById(a.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(PartnerApplicationStatus.APPROVED);
        assertThat(saved.getCollaboratorId()).isEqualTo(collaboratorId);
        assertThat(saved.getDecidedBy().getId()).isEqualTo(adminUser.getId());
        verify(transactionalMailService).sendPartnerApplicationApproved("m@example.com", true, Locale.forLanguageTag("el"));
    }

    @Test
    void approveTwiceIsRefused() throws Exception {
        PartnerApplication a = pending("m@example.com");
        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/approve").with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"founding\":false}")).andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/approve").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"founding\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5189));
    }

    @Test
    void approveRefusesAnEmailThatIsAlreadyAPartner() throws Exception {
        Collaborator existing = new Collaborator();
        existing.setName("Studio M");
        existing.setContactEmail("m@example.com");
        existing.setStatus(CollaboratorStatus.ACTIVE);
        existing = collaboratorRepository.save(existing);
        PartnerApplication a = pending("M@example.com");

        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/approve").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"founding\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5191))
                .andExpect(jsonPath("$.details.collaboratorId").value(existing.getId().toString()));

        assertThat(applicationRepository.findById(a.getId()).orElseThrow().getStatus())
                .isEqualTo(PartnerApplicationStatus.PENDING);
    }

    @Test
    void approveFoundingWhenFullIsRefused() throws Exception {
        for (int i = 0; i < 20; i++) {
            Collaborator c = new Collaborator();
            c.setName("P" + i);
            c.setContactEmail("p" + i + "@example.com");
            c.setStatus(CollaboratorStatus.ACTIVE);
            c.setFounding(true);
            collaboratorRepository.save(c);
        }
        PartnerApplication a = pending("m@example.com");

        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/approve").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"founding\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5190));
    }

    @Test
    void declineStoresTheReasonAndEmailsIt() throws Exception {
        PartnerApplication a = pending("m@example.com");

        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/decline").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"  Only Athens for now.  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DECLINED"))
                .andExpect(jsonPath("$.declineReason").value("Only Athens for now."))
                .andExpect(jsonPath("$.decidedByEmail").value(adminUser.getEmail()));

        verify(transactionalMailService).sendPartnerApplicationDeclined("m@example.com", "Only Athens for now.",
                Locale.forLanguageTag("el"));
    }

    @Test
    void declineWithoutAReason() throws Exception {
        PartnerApplication a = pending("m@example.com");

        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/decline").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.declineReason").isEmpty());
    }

    @Test
    void declineRejectsAReasonOver1000Characters() throws Exception {
        PartnerApplication a = pending("m@example.com");

        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/decline").with(admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"" + "x".repeat(1001) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anApplicantCanApplyAgainOnceDeclined() throws Exception {
        PartnerApplication a = pending("m@example.com");
        mockMvc.perform(post("/api/admin/partner-applications/" + a.getId() + "/decline").with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":null}")).andExpect(status().isOk());

        pending("m@example.com");

        assertThat(applicationRepository.count()).isEqualTo(2);
    }
}
```

Before running, match the file to the repo's conventions:
- the fixtures class used by `CollaborationAdminControllerTest` (`grep -n "fixtures" src/test/java/event_social_media/controller/platform/CollaborationAdminControllerTest.java | head -3`), its import, and whether `newUser()` sets an email;
- `@MockitoBean` vs `@MockBean`;
- the error-code JSON field (`$.errorCode` or `$.code`) and the details field (`$.details`).

- [ ] **Step 2: Run them to make sure they fail**

Run: `./gradlew test --tests "event_social_media.controller.platform.PartnerApplicationAdminControllerTest"`
Expected: FAIL with 404s (no controller yet)

- [ ] **Step 3: The request/response DTOs**

```java
package event_social_media.dto.collaboration;

/** {@code POST /api/admin/partner-applications/{id}/approve}. */
public record ApprovePartnerApplicationRequestDto(boolean founding) {
}
```

```java
package event_social_media.dto.collaboration;

import java.util.UUID;

/** The partner the approval created, for the console to open next. */
public record ApprovePartnerApplicationResponseDto(UUID collaboratorId) {
}
```

```java
package event_social_media.dto.collaboration;

import jakarta.validation.constraints.Size;

/** {@code reason} is sent to the applicant as written; null or blank sends the generic line alone. */
public record DeclinePartnerApplicationRequestDto(@Size(max = 1000) String reason) {
}
```

- [ ] **Step 4: The controller**

```java
package event_social_media.controller.platform;

import event_social_media.dto.collaboration.AdminPartnerApplicationDto;
import event_social_media.dto.collaboration.ApprovePartnerApplicationRequestDto;
import event_social_media.dto.collaboration.ApprovePartnerApplicationResponseDto;
import event_social_media.dto.collaboration.DeclinePartnerApplicationRequestDto;
import event_social_media.model.collaboration.PartnerApplicationStatus;
import event_social_media.service.collaboration.PartnerApplicationReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Reviewing applications from the for-business page and the vendor "Become a partner" sheet. */
@Tag(name = "Billing", description = "Partner administration")
@RestController
@RequestMapping("/api/admin/partner-applications")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class PartnerApplicationAdminController {

    private final PartnerApplicationReviewService reviewService;

    @Operation(summary = "List partner applications, newest first")
    @GetMapping
    public Page<AdminPartnerApplicationDto> list(@RequestParam(required = false) PartnerApplicationStatus status,
                                                 @RequestParam(defaultValue = "0") @Min(0) int page,
                                                 @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return reviewService.list(status, page, size);
    }

    @Operation(summary = "Read one partner application")
    @GetMapping("/{id}")
    public AdminPartnerApplicationDto get(@PathVariable UUID id) {
        return reviewService.get(id);
    }

    @Operation(summary = "Approve an application, creating the partner")
    @PostMapping("/{id}/approve")
    public ApprovePartnerApplicationResponseDto approve(@PathVariable UUID id,
                                                        @RequestBody ApprovePartnerApplicationRequestDto body,
                                                        Authentication authentication) {
        return new ApprovePartnerApplicationResponseDto(
                reviewService.approve(id, body.founding(), adminId(authentication)));
    }

    @Operation(summary = "Decline an application, emailing the reason to the applicant")
    @PostMapping("/{id}/decline")
    public AdminPartnerApplicationDto decline(@PathVariable UUID id,
                                              @Valid @RequestBody DeclinePartnerApplicationRequestDto body,
                                              Authentication authentication) {
        return reviewService.decline(id, body.reason(), adminId(authentication));
    }

    private static UUID adminId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
```

Check how other paged admin endpoints take `page`/`size` (`grep -n "RequestParam.*size" src/main/java/event_social_media/controller/platform/*.java | head`) and match their bounds and validation style if they differ.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.platform.PartnerApplicationAdminControllerTest"`
Expected: PASS (11 tests)

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/collaboration src/main/java/event_social_media/controller/platform/PartnerApplicationAdminController.java src/test/java/event_social_media/controller/platform/PartnerApplicationAdminControllerTest.java
git commit -m "feat(partners): admin endpoints to review partner applications"
```

---

### Task 10: Account deletion still works

`UserAnonymizer` deletes the applications of a deleted user's email. It must also cope with an admin being deleted (`decided_by` is `ON DELETE SET NULL` in Postgres, but the H2 schema comes from JPA).

- [ ] **Step 1: Run the deletion and vendor tests**

Run: `./gradlew test --tests "*UserAnonymizer*" --tests "*VendorAccountDataTest*" --tests "*PartnerApplication*"`
Expected: PASS. If an anonymizer test fails on the new `decided_by` foreign key, null out `decided_by` for that admin in `UserAnonymizer` before the user row is removed, next to the existing `delete from PartnerApplication` query:

```java
            em.createQuery("update PartnerApplication a set a.decidedBy = null where a.decidedBy.id = :userId")
                    .setParameter("userId", userId)
                    .executeUpdate();
```

(match the parameter name and variable the surrounding code uses).

- [ ] **Step 2: Commit, if anything changed**

```bash
git add src/main/java/event_social_media/service/user/deletion/UserAnonymizer.java
git commit -m "fix(partners): deleting an admin keeps the applications they decided"
```

---

### Task 11: Frontend integration guide, full test run

**Files:**
- Modify: `docs/fe-guides/collaborations-fe-integration.md`

- [ ] **Step 1: Document the contract**

Append a "Partner applications (admin)" section to `docs/fe-guides/collaborations-fe-integration.md` with:
- the four admin endpoints, their request and response shapes (copy them from the spec's "Spring contract" section);
- the error codes `5189 PARTNER_APPLICATION_NOT_PENDING`, `5190 FOUNDING_SPOTS_FULL` (also returned by collaborator create/update), and `5191 COLLABORATOR_EMAIL_EXISTS` with `details.collaboratorId`;
- `founding: boolean` on `CollaboratorResponseDto`, and `founding: boolean | null` on `CollaboratorRequestDto` (null = false on create, unchanged on update);
- `GET /api/public/partner-program` → `{ foundingSpotsTotal, foundingSpotsLeft }`, public.

- [ ] **Step 2: Run the whole suite**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`, no failures

- [ ] **Step 3: Check the migration against Postgres**

The tests run on H2 with Flyway off, so they never run `V189`. Start the local Postgres and the app once so Flyway applies it:

```bash
docker compose up -d
./gradlew bootRun
```

Expected: the log shows `Successfully applied 1 migration to schema "public", now at version v189`. Stop the app afterwards.

- [ ] **Step 4: Commit and push, open the PR into `staging`**

```bash
git add docs/fe-guides/collaborations-fe-integration.md
git commit -m "docs(partners): admin review contract for the frontend"
git push -u origin feat/partner-application-review
gh pr create --base staging --title "Partner applications: admin review, founding flag, applicant emails" --body "Admin list/detail/approve/decline for partner applications, the founding flag on partners, GET /api/public/partner-program, and the received/approved/declined emails. Spec: storywall docs/superpowers/specs/2026-10-10-partner-applications-admin-design.md"
```

Only push and open the PR once the user says so.
