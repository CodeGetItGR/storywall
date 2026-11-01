# My business page — backend (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the web app's new `/business` page its data: an overview across the vendor's events, a paged list of those events, the partner's feed card for a preview, a "vendor" flag on `/api/me`, and a contact form that lands in an admin inbox with a push to admin phones.

**Architecture:** New read endpoints under `/api/me/business` built from the same repositories `PartnerReachService` uses, keyed by the caller's user id (their own vendor rows) instead of a partner's contact email. Contact messages are a new table, a write endpoint for vendors and two admin endpoints, modelled on bug reports. The push uses the existing `AdminAlert` pipeline with a new type.

**Tech Stack:** Spring Boot, JPA/Hibernate, Flyway, PostgreSQL, JUnit 5 + MockMvc (`@SpringBootTest @AutoConfigureMockMvc @Transactional`).

**Spec:** `docs/superpowers/specs/2026-11-01-my-business-page-design.md` in the storywall repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be). PRs go into `staging`.

---

## Decisions this plan locks in

- **Vendor account** = has a `VendorProfile` (id = user id) **or** has at least one `EventVendor` row with `user = me` and `removedAt is null`.
- **Rows counted** = the caller's `EventVendor` rows with `removedAt is null` in events with `deletedAt is null`. A user who left and rejoined has one live row per event, so no double count.
- **Partner** = `ApprovedPartners.isApproved(user)` (verified email matching an active partner). Partner-only numbers are absent (not 0) for others, like `VendorReachDto`.
- **Trend** = Pro views + post views per calendar month in `Europe/Athens`, the current month and the 5 before it, oldest first, months with no views as 0. Partners only.
- **Content** = present only when the profile's type, or any row's type, has `VendorCapability.PRO_ALBUM`.
- **Event rows** carry titles and ids: they are the caller's own events, unlike the partner page's reach rows (which stay title-free). `open` is `accessEndedAt == null`.
- The `/api/me` flag is a `Boolean vendor` field (JSON `"vendor"`), next to `partner`.
- New error code `NOT_A_VENDOR(4039)`, 403, for every `/api/me/business` endpoint when the caller is not a vendor account.

## File structure

| File | Responsibility |
|---|---|
| `src/main/java/event_social_media/exception/ErrorCode.java` (modify) | add `NOT_A_VENDOR(4039)` |
| `src/main/java/event_social_media/service/vendor/VendorAccounts.java` (create) | "is this account a vendor", one place |
| `src/main/java/event_social_media/dto/user/UserResponseDto.java` (modify) | `Boolean vendor` |
| `src/main/java/event_social_media/service/user/MeService.java` (modify) | fill `vendor` |
| `src/main/java/event_social_media/repository/vendor/EventVendorRepository.java` (modify) | rows for the business page, exists-by-user |
| `src/main/java/event_social_media/repository/media/MediaRepository.java` (modify) | Pro item count and bytes over vendor rows |
| `src/main/java/event_social_media/repository/vendor/SneakPeekRepository.java` (modify) | posted sneak peek count |
| `src/main/java/event_social_media/repository/media/ContentViewRepository.java` (modify) | monthly views over vendor rows |
| `src/main/java/event_social_media/dto/vendor/BusinessOverviewDto.java` (create) | overview payload |
| `src/main/java/event_social_media/dto/vendor/BusinessEventDto.java` (create) | one event row |
| `src/main/java/event_social_media/service/vendor/BusinessService.java` (create) | builds overview and event rows |
| `src/main/java/event_social_media/controller/vendor/BusinessController.java` (create) | `/api/me/business`, `/events`, `/messages` |
| `src/main/java/event_social_media/service/collaboration/PartnerBrandingService.java` (modify) | `previewFor(Collaborator)` |
| `src/main/java/event_social_media/dto/collaboration/PartnerPageDto.java` (modify) | `cardPreview` |
| `src/main/java/event_social_media/service/collaboration/CollaborationPortalService.java` (modify) | fill `cardPreview` |
| `src/main/resources/db/migration/V198__vendor_contact_messages.sql` (create) | table |
| `src/main/java/event_social_media/model/vendor/VendorContactMessage.java`, `VendorContactTopic.java`, `VendorContactStatus.java` (create) | entity + enums |
| `src/main/java/event_social_media/repository/vendor/VendorContactMessageRepository.java` (create) | queries |
| `src/main/java/event_social_media/dto/vendor/VendorContactRequestDto.java`, `VendorContactCreatedDto.java`, `VendorContactMessageDto.java`, `VendorContactStatusRequestDto.java` (create) | DTOs |
| `src/main/java/event_social_media/service/vendor/VendorContactService.java` (create) | send, list, mark |
| `src/main/java/event_social_media/controller/vendor/VendorContactAdminController.java` (create) | `/api/admin/vendor-messages` |
| `src/main/java/event_social_media/service/push/AdminAlertType.java`, `AdminAlert.java` (modify) | `VENDOR_MESSAGE` |
| `src/test/java/event_social_media/controller/vendor/BusinessControllerTest.java` (create) | overview, events, me flag, messages |
| `src/test/java/event_social_media/controller/vendor/VendorContactAdminControllerTest.java` (create) | admin inbox |
| `src/test/java/event_social_media/controller/collaboration/CollaborationPortalControllerTest.java` (modify) | card preview |
| `CHANGELOG.md`, `docs/fe-guides/my-business-fe-integration.md` (modify/create) | docs for the web app |

---

### Task 0: Branch

- [ ] **Step 1: Make a worktree from the latest staging**

```bash
cd /c/Users/User/IdeaProjects/event_social_media
git fetch origin staging
git worktree add .claude/worktrees/my-business -b feat/my-business-page origin/staging
cd .claude/worktrees/my-business
```

- [ ] **Step 2: Check the next free migration number**

```bash
git ls-tree -r --name-only origin/staging src/main/resources/db/migration | sort -V | tail -1
git branch -r --list "origin/feat/*" | xargs -I{} sh -c 'git ls-tree -r --name-only {} src/main/resources/db/migration | sort -V | tail -1'
```

Expected: staging ends at `V197__…`. If any open branch already uses `V198`, take the next number and use it everywhere this plan says `V198`.

---

### Task 1: `NOT_A_VENDOR` and `VendorAccounts`

**Files:**
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java` (after `PARTNER_NOT_LINKED(4038)`)
- Modify: `src/main/java/event_social_media/repository/vendor/EventVendorRepository.java`
- Create: `src/main/java/event_social_media/service/vendor/VendorAccounts.java`

- [ ] **Step 1: Add the error code**

```java
    /** 4038 — The account's verified email matches no active partner, so it has no partner page. {@code 403}. */
    PARTNER_NOT_LINKED(4038),

    /** 4039 — The account has no vendor profile and has never joined an event as a vendor, so it has no business page. {@code 403}. */
    NOT_A_VENDOR(4039),
```

- [ ] **Step 2: Add the repository methods** (in `EventVendorRepository`, after `findForPartnerReach`)

```java
    boolean existsByUser_IdAndRemovedAtIsNull(UUID userId);

    /**
     * The caller's live vendor rows in events that were not deleted, newest event first: the business
     * page's totals (spec 2026-11-01).
     */
    @Query("select v from EventVendor v join fetch v.event e "
            + "where v.user.id = :userId and v.removedAt is null and e.deletedAt is null "
            + "order by e.startAt desc, v.id desc")
    List<EventVendor> findAllForBusiness(@Param("userId") UUID userId);

    /** Like {@link #findAllForBusiness}, one page at a time, for the business page's event list. */
    @Query(value = "select v from EventVendor v join fetch v.event e "
            + "where v.user.id = :userId and v.removedAt is null and e.deletedAt is null "
            + "order by e.startAt desc, v.id desc",
            countQuery = "select count(v) from EventVendor v join v.event e "
                    + "where v.user.id = :userId and v.removedAt is null and e.deletedAt is null")
    Page<EventVendor> pageForBusiness(@Param("userId") UUID userId, Pageable pageable);
```

Add imports `org.springframework.data.domain.Page` and `org.springframework.data.domain.Pageable`.

- [ ] **Step 3: Create `VendorAccounts`**

```java
package event_social_media.service.vendor;

import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Whether an account is a vendor: it has a vendor profile, or it is a vendor in at least one event.
 * The business page (spec 2026-11-01) and its menu entry open for these accounts only.
 */
@Service
@RequiredArgsConstructor
public class VendorAccounts {

    private final VendorProfileRepository vendorProfileRepository;
    private final EventVendorRepository eventVendorRepository;

    @Transactional(readOnly = true)
    public boolean isVendor(UUID userId) {
        return vendorProfileRepository.existsById(userId) || eventVendorRepository.existsByUser_IdAndRemovedAtIsNull(userId);
    }

    public void requireVendor(UUID userId) {
        if (!isVendor(userId)) {
            throw new ForbiddenException(ErrorCode.NOT_A_VENDOR, "This account has no business page.");
        }
    }
}
```

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava -q`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(vendors): NOT_A_VENDOR and VendorAccounts for the business page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `vendor` flag on `/api/me`

**Files:**
- Modify: `src/main/java/event_social_media/dto/user/UserResponseDto.java` (after the `partner` field)
- Modify: `src/main/java/event_social_media/service/user/MeService.java` (`toResponseDtoWithUrl`)
- Test: `src/test/java/event_social_media/controller/vendor/BusinessControllerTest.java` (create)

- [ ] **Step 1: Write the failing test** — create the test class with its shared setup; later tasks add tests to it.

```java
package event_social_media.controller.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.ContentView;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BusinessControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private EventVendorRepository eventVendorRepository;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private ContentViewRepository contentViewRepository;

    @Test
    void meSaysWhetherTheAccountIsAVendor() throws Exception {
        User vendor = fixtures.newUser();
        support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.MUSIC);

        mockMvc.perform(as(vendor, get("/api/me")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vendor").value(true));
        mockMvc.perform(as(fixtures.newUser(), get("/api/me")))
                .andExpect(jsonPath("$.vendor").value(false));
    }

    /** A verified account whose email is the partner's contact email. */
    private User partnerAccount() {
        Collaborator collaborator = fixtures.newCollaborator();
        User user = fixtures.newUser();
        collaborator.setContactEmail(user.getEmail());
        collaboratorRepository.saveAndFlush(collaborator);
        return user;
    }

    /** One Pro item by {@code vendor}, viewed once by a new guest of its event. */
    private void proItemViewedOnce(EventVendor vendor) {
        EventMember guest = fixtures.newMember(vendor.getEvent(), fixtures.newUser(), EventRole.ATTENDEE);
        Media item = fixtures.newMedia(vendor.getEvent(), 10);
        item.setCollection(MediaCollection.PRO);
        item.setEventVendor(vendor);
        item.setUploaderMember(vendor.getMember());
        mediaRepository.saveAndFlush(item);
        contentViewRepository.saveAndFlush(ContentView.ofMedia(vendor.getEvent().getId(), guest.getId(), item.getId()));
    }

    private ResultActions overview(User user) throws Exception {
        return mockMvc.perform(as(user, get("/api/me/business")));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: FAIL — `No value at JSON path "$.vendor"`.

- [ ] **Step 3: Add the field** (in `UserResponseDto`, after `partner`)

```java
        /**
         * Whether this account opens the business page: it has a vendor profile or is a vendor in an
         * event ({@code VendorAccounts}). Filled only on {@code /api/me} responses: null on the admin user
         * endpoints.
         */
        private Boolean vendor;
```

- [ ] **Step 4: Fill it** (in `MeService`: inject `private final VendorAccounts vendorAccounts;` and, in `toResponseDtoWithUrl`, after `dto.setPartner(...)`)

```java
        dto.setVendor(vendorAccounts.isVendor(user.getId()));
```

- [ ] **Step 5: Run the test**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(me): say whether the account is a vendor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content and trend queries

**Files:**
- Modify: `src/main/java/event_social_media/repository/media/MediaRepository.java`
- Modify: `src/main/java/event_social_media/repository/vendor/SneakPeekRepository.java`
- Modify: `src/main/java/event_social_media/repository/media/ContentViewRepository.java`

These are exercised by Task 4's controller tests.

- [ ] **Step 1: `MediaRepository`** — add:

```java
    /** Live Pro items uploaded under these vendor rows: the business page's content count. */
    @Query("select count(m) from Media m where m.eventVendor.id in :vendorIds and m.collection = :pro "
            + "and m.deletedAt is null")
    long countLiveProItems(@Param("vendorIds") Collection<UUID> vendorIds, @Param("pro") MediaCollection pro);

    /** Bytes of those items. */
    @Query("select coalesce(sum(m.fileSize), 0) from Media m where m.eventVendor.id in :vendorIds "
            + "and m.collection = :pro and m.deletedAt is null")
    long sumLiveProBytes(@Param("vendorIds") Collection<UUID> vendorIds, @Param("pro") MediaCollection pro);
```

- [ ] **Step 2: `SneakPeekRepository`** — add:

```java
    /** Sneak peeks these vendor rows posted (a row without a post was never sent). */
    long countByEventVendorIdInAndPostIdIsNotNull(Collection<UUID> eventVendorIds);
```

Add `import java.util.Collection;`.

- [ ] **Step 3: `ContentViewRepository`** — add under `// ---- Reach`:

```java
    /**
     * Views per month in Athens time since {@code since}, of Pro items under these vendor rows and of
     * posts by these members. Months with no views are missing; the caller fills them.
     */
    @Query(value = """
            select to_char(date_trunc('month', v.viewed_at at time zone 'Europe/Athens'), 'YYYY-MM') as month,
                   count(*) as views
            from content_views v
            left join media m on m.id = v.media_id
            left join posts p on p.id = v.post_id
            where v.viewed_at >= :since
              and (m.event_vendor_id in (:vendorIds) or p.author_member_id in (:memberIds))
            group by 1""", nativeQuery = true)
    List<MonthViews> countViewsByMonth(@Param("vendorIds") Collection<UUID> vendorIds,
                                       @Param("memberIds") Collection<UUID> memberIds,
                                       @Param("since") OffsetDateTime since);

    /** Projection for {@link #countViewsByMonth}. */
    interface MonthViews {
        String getMonth();

        long getViews();
    }
```

Add `import java.time.OffsetDateTime;` if missing.

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava -q`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(vendors): content and monthly view queries for the business page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `GET /api/me/business`

**Files:**
- Create: `src/main/java/event_social_media/dto/vendor/BusinessOverviewDto.java`
- Create: `src/main/java/event_social_media/service/vendor/BusinessService.java`
- Create: `src/main/java/event_social_media/controller/vendor/BusinessController.java`
- Test: `src/test/java/event_social_media/controller/vendor/BusinessControllerTest.java`

- [ ] **Step 1: Write the failing tests** (add to `BusinessControllerTest`; add the static imports `org.hamcrest.Matchers.hasSize` and `org.springframework.test.web.servlet.result.MockMvcResultMatchers.content`, and `org.hamcrest.Matchers.containsString`)

```java
    @Test
    void signedOutIsRefused() throws Exception {
        mockMvc.perform(get("/api/me/business")).andExpect(status().isUnauthorized());
    }

    @Test
    void anAccountThatIsNoVendorIsRefused() throws Exception {
        overview(fixtures.newUser())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorKey").value("NOT_A_VENDOR"));
    }

    @Test
    void aVendorSeesTheShortVersion() throws Exception {
        User vendor = fixtures.newUser();
        EventVendor row = support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.PHOTOGRAPHER);
        fixtures.newMember(row.getEvent(), fixtures.newUser(), EventRole.ATTENDEE);
        proItemViewedOnce(row);

        overview(vendor)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner").value(false))
                .andExpect(jsonPath("$.totals.events").value(1))
                .andExpect(jsonPath("$.totals.guests").value(2))
                .andExpect(jsonPath("$.totals.listTaps").value(0))
                .andExpect(jsonPath("$.totals.proViews").doesNotExist())
                .andExpect(jsonPath("$.totals.cardTaps").doesNotExist())
                .andExpect(jsonPath("$.trend").doesNotExist())
                .andExpect(jsonPath("$.content.proItems").value(1))
                .andExpect(jsonPath("$.content.proUsedBytes").value(10))
                .andExpect(jsonPath("$.content.sneakPeeks").value(0));
    }

    @Test
    void aPartnerSeesEverythingWithSixMonthsOfTrend() throws Exception {
        User partner = partnerAccount();
        EventVendor row = support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), partner, PartnerRole.PHOTOGRAPHER);
        proItemViewedOnce(row);

        overview(partner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner").value(true))
                .andExpect(jsonPath("$.totals.proViews").value(1))
                .andExpect(jsonPath("$.totals.postViewers").value(0))
                .andExpect(jsonPath("$.totals.cardTaps").value(0))
                .andExpect(jsonPath("$.trend", hasSize(6)))
                .andExpect(jsonPath("$.trend[5].views").value(1))
                .andExpect(jsonPath("$.trend[0].views").value(0));
    }

    @Test
    void deletedEventsAndRemovedRowsDoNotCount() throws Exception {
        User vendor = fixtures.newUser();
        Event deleted = support.vendorEventHostedBy(fixtures.newUser());
        support.vendorFor(deleted, vendor, PartnerRole.PHOTOGRAPHER);
        deleted.setDeletedAt(OffsetDateTime.now());
        eventRepository.saveAndFlush(deleted);
        EventVendor removed = support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.PHOTOGRAPHER);
        removed.setRemovedAt(OffsetDateTime.now());
        eventVendorRepository.saveAndFlush(removed);
        support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.PHOTOGRAPHER);

        overview(vendor).andExpect(jsonPath("$.totals.events").value(1));
    }

    @Test
    void aTypeWithoutAProAlbumHasNoContentBlock() throws Exception {
        User vendor = fixtures.newUser();
        support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.MUSIC);

        overview(vendor).andExpect(status().isOk()).andExpect(jsonPath("$.content").doesNotExist());
    }
```

`$.totals.guests` is 2 in the short-version test: one guest added directly and one by `proItemViewedOnce`. If `countLiveGuestMembers` also counts the vendor's own membership, adjust the expected numbers to what `PartnerReachService` reports for the same setup (it uses the same query) and note it in the commit.

- [ ] **Step 2: Run to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: FAIL — 404 on `/api/me/business`.

- [ ] **Step 3: Create the DTO**

```java
package event_social_media.dto.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;
import event_social_media.model.collaboration.PartnerRole;

import java.util.List;

/**
 * The business page's overview (spec 2026-11-01): totals across the caller's own events as a vendor.
 * Every vendor gets {@code events}, {@code guests} and {@code listTaps}; the rest of {@code totals}
 * and {@code trend} are for approved partners and absent otherwise. {@code content} is absent for
 * types without a Pro album. {@code vendorType} is the profile's, else the newest row's; null if neither.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BusinessOverviewDto(
        boolean partner,
        PartnerRole vendorType,
        Totals totals,
        List<MonthViews> trend,
        Content content) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Totals(long events, long guests, long listTaps, Long proViews, Long postViewers, Long cardTaps) {
    }

    /** {@code month} is {@code YYYY-MM} in Athens time. */
    public record MonthViews(String month, long views) {
    }

    public record Content(long proItems, long sneakPeeks, long proUsedBytes) {
    }
}
```

- [ ] **Step 4: Create the service**

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.BusinessOverviewDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.repository.collaboration.PartnerBrandingClickRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.repository.vendor.VendorListClickRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The business page's numbers (spec 2026-11-01), over the caller's own live vendor rows. A vendor has a
 * few dozen events at most, so the per-row counts are plain queries, as in {@code PartnerReachService}.
 */
@Service
@RequiredArgsConstructor
public class BusinessService {

    static final ZoneId ATHENS = ZoneId.of("Europe/Athens");
    static final int TREND_MONTHS = 6;
    /** Stands in for an empty id list: Postgres rejects {@code in ()}. */
    private static final List<UUID> NONE = List.of(new UUID(0, 0));

    private final VendorAccounts vendorAccounts;
    private final ApprovedPartners approvedPartners;
    private final UserRepository userRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final EventVendorRepository eventVendorRepository;
    private final EventMemberRepository eventMemberRepository;
    private final ContentViewRepository contentViewRepository;
    private final VendorListClickRepository listClickRepository;
    private final PartnerBrandingClickRepository brandingClickRepository;
    private final MediaRepository mediaRepository;
    private final SneakPeekRepository sneakPeekRepository;

    @Transactional(readOnly = true)
    public BusinessOverviewDto overview(UUID userId) {
        vendorAccounts.requireVendor(userId);
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        boolean partner = approvedPartners.isApproved(user);
        List<EventVendor> rows = eventVendorRepository.findAllForBusiness(userId);
        VendorProfile profile = vendorProfileRepository.findById(userId).orElse(null);
        PartnerRole type = profile != null ? profile.getVendorType() : rows.isEmpty() ? null : rows.get(0).getVendorType();

        List<UUID> vendorIds = rows.stream().map(EventVendor::getId).toList();
        List<UUID> memberIds = rows.stream().map(v -> v.getMember() == null ? null : v.getMember().getId())
                .filter(Objects::nonNull).toList();

        long guests = 0;
        long listTaps = 0;
        long proViews = 0;
        long postViewers = 0;
        for (EventVendor row : rows) {
            guests += eventMemberRepository.countLiveGuestMembers(row.getEvent().getId(), EventRole.HOST);
            listTaps += listClickRepository.countByEventVendorId(row.getId());
            if (partner) {
                proViews += contentViewRepository.countProViews(row.getId());
                postViewers += row.getMember() == null ? 0 : contentViewRepository.countPostViewers(row.getMember().getId());
            }
        }
        Long cardTaps = partner ? approvedPartners.collaboratorId(user).map(brandingClickRepository::countByCollaboratorId).orElse(0L) : null;
        BusinessOverviewDto.Totals totals = new BusinessOverviewDto.Totals(rows.size(), guests, listTaps,
                partner ? proViews : null, partner ? postViewers : null, cardTaps);

        return new BusinessOverviewDto(partner, type, totals,
                partner ? trend(vendorIds, memberIds) : null,
                hasProAlbum(type, rows) ? content(vendorIds) : null);
    }

    private List<BusinessOverviewDto.MonthViews> trend(List<UUID> vendorIds, List<UUID> memberIds) {
        YearMonth now = YearMonth.now(ATHENS);
        YearMonth first = now.minusMonths(TREND_MONTHS - 1);
        Map<String, Long> counted = vendorIds.isEmpty() ? Map.of()
                : contentViewRepository.countViewsByMonth(vendorIds, orNone(memberIds),
                                first.atDay(1).atStartOfDay(ATHENS).toOffsetDateTime())
                        .stream().collect(Collectors.toMap(ContentViewRepository.MonthViews::getMonth,
                                ContentViewRepository.MonthViews::getViews));
        List<BusinessOverviewDto.MonthViews> months = new ArrayList<>(TREND_MONTHS);
        for (YearMonth month = first; !month.isAfter(now); month = month.plusMonths(1)) {
            String key = month.toString();
            months.add(new BusinessOverviewDto.MonthViews(key, counted.getOrDefault(key, 0L)));
        }
        return months;
    }

    private BusinessOverviewDto.Content content(List<UUID> vendorIds) {
        if (vendorIds.isEmpty()) {
            return new BusinessOverviewDto.Content(0, 0, 0);
        }
        return new BusinessOverviewDto.Content(
                mediaRepository.countLiveProItems(vendorIds, MediaCollection.PRO),
                sneakPeekRepository.countByEventVendorIdInAndPostIdIsNotNull(vendorIds),
                mediaRepository.sumLiveProBytes(vendorIds, MediaCollection.PRO));
    }

    private static boolean hasProAlbum(PartnerRole type, List<EventVendor> rows) {
        return (type != null && VendorCapability.of(type).contains(VendorCapability.PRO_ALBUM))
                || rows.stream().anyMatch(v -> VendorCapability.of(v.getVendorType()).contains(VendorCapability.PRO_ALBUM));
    }

    private static Collection<UUID> orNone(List<UUID> ids) {
        return ids.isEmpty() ? NONE : ids;
    }
}
```

- [ ] **Step 5: Create the controller**

```java
package event_social_media.controller.vendor;

import event_social_media.dto.vendor.BusinessOverviewDto;
import event_social_media.service.ratelimit.RateLimit;
import event_social_media.service.vendor.BusinessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** The signed-in vendor's business page (spec 2026-11-01): their numbers, their events, a note to us. */
@Tag(name = "Vendors", description = "Business page")
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class BusinessController {

    private final BusinessService businessService;

    @Operation(summary = "Read the signed-in vendor's totals across their events")
    @GetMapping("/api/me/business")
    @RateLimit(name = "business.read", limit = 60, windowSeconds = 60)
    public BusinessOverviewDto overview(Authentication authentication) {
        return businessService.overview(callerId(authentication));
    }

    static UUID callerId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
```

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: PASS (all tests so far).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(vendors): GET /api/me/business overview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `GET /api/me/business/events`

**Files:**
- Create: `src/main/java/event_social_media/dto/vendor/BusinessEventDto.java`
- Modify: `BusinessService.java`, `BusinessController.java`
- Test: `BusinessControllerTest.java`

- [ ] **Step 1: Write the failing tests**

```java
    @Test
    void eventsAreListedNewestFirstWithTheirTitles() throws Exception {
        User vendor = fixtures.newUser();
        Event older = support.vendorEventHostedBy(fixtures.newUser());
        older.setTitle("Older wedding");
        older.setStartAt(OffsetDateTime.now().minusMonths(2));
        eventRepository.saveAndFlush(older);
        Event newer = support.vendorEventHostedBy(fixtures.newUser());
        newer.setTitle("Newer baptism");
        newer.setStartAt(OffsetDateTime.now().minusDays(3));
        eventRepository.saveAndFlush(newer);
        support.vendorFor(older, vendor, PartnerRole.PHOTOGRAPHER);
        EventVendor inNewer = support.vendorFor(newer, vendor, PartnerRole.PHOTOGRAPHER);
        inNewer.setAccessEndedAt(OffsetDateTime.now());
        eventVendorRepository.saveAndFlush(inNewer);

        mockMvc.perform(as(vendor, get("/api/me/business/events")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].title").value("Newer baptism"))
                .andExpect(jsonPath("$.content[0].eventId").value(newer.getId().toString()))
                .andExpect(jsonPath("$.content[0].open").value(false))
                .andExpect(jsonPath("$.content[0].views").doesNotExist())
                .andExpect(jsonPath("$.content[1].title").value("Older wedding"))
                .andExpect(jsonPath("$.content[1].open").value(true));
    }

    @Test
    void aPartnerSeesViewsPerEvent() throws Exception {
        User partner = partnerAccount();
        EventVendor row = support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), partner, PartnerRole.PHOTOGRAPHER);
        proItemViewedOnce(row);

        mockMvc.perform(as(partner, get("/api/me/business/events")))
                .andExpect(jsonPath("$.content[0].views").value(1))
                .andExpect(jsonPath("$.content[0].guests").value(1));
    }

    @Test
    void eventsAreRefusedToAnAccountThatIsNoVendor() throws Exception {
        mockMvc.perform(as(fixtures.newUser(), get("/api/me/business/events")))
                .andExpect(status().isForbidden());
    }
```

- [ ] **Step 2: Run to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: FAIL — 404.

- [ ] **Step 3: Create the DTO**

```java
package event_social_media.dto.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;
import event_social_media.model.collaboration.PartnerRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One of the caller's own events on the business page. {@code views} (Pro views plus post views) is for
 * approved partners only. {@code open} is false once the vendor's access ended; the page then shows the
 * row without a link.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BusinessEventDto(UUID eventId, String title, OffsetDateTime startAt, PartnerRole vendorType,
                               long guests, Long views, boolean open) {
}
```

- [ ] **Step 4: Add the service method** (in `BusinessService`)

```java
    @Transactional(readOnly = true)
    public Page<BusinessEventDto> events(UUID userId, Pageable pageable) {
        vendorAccounts.requireVendor(userId);
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        boolean partner = approvedPartners.isApproved(user);
        return eventVendorRepository.pageForBusiness(userId, pageable).map(row -> {
            Long views = null;
            if (partner) {
                views = contentViewRepository.countProViews(row.getId())
                        + (row.getMember() == null ? 0 : contentViewRepository.countPostViews(row.getMember().getId()));
            }
            return new BusinessEventDto(row.getEvent().getId(), row.getEvent().getTitle(), row.getEvent().getStartAt(),
                    row.getVendorType(),
                    eventMemberRepository.countLiveGuestMembers(row.getEvent().getId(), EventRole.HOST),
                    views, row.getAccessEndedAt() == null);
        });
    }
```

Add imports `event_social_media.dto.vendor.BusinessEventDto`, `org.springframework.data.domain.Page`, `org.springframework.data.domain.Pageable`.

- [ ] **Step 5: Add the endpoint** (in `BusinessController`)

```java
    /** Client sort is ignored (the order is fixed: newest event first); size is capped at 50. */
    @Operation(summary = "List the signed-in vendor's events, newest first")
    @GetMapping("/api/me/business/events")
    @RateLimit(name = "business.read", limit = 60, windowSeconds = 60)
    public Page<BusinessEventDto> events(@PageableDefault(size = 20) Pageable pageable, Authentication authentication) {
        return businessService.events(callerId(authentication),
                PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 50)));
    }
```

Imports: `org.springframework.data.domain.Page`, `PageRequest`, `Pageable`, `org.springframework.data.web.PageableDefault`, `event_social_media.dto.vendor.BusinessEventDto`.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(vendors): GET /api/me/business/events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Feed card preview on the partner page

**Files:**
- Modify: `src/main/java/event_social_media/service/collaboration/PartnerBrandingService.java`
- Modify: `src/main/java/event_social_media/dto/collaboration/PartnerPageDto.java`
- Modify: `src/main/java/event_social_media/service/collaboration/CollaborationPortalService.java`
- Test: `src/test/java/event_social_media/controller/collaboration/CollaborationPortalControllerTest.java`

- [ ] **Step 1: Write the failing tests** (add to `CollaborationPortalControllerTest`; inject `CollaboratorBrandingService brandingService` is not needed — set the fields directly)

```java
    @Test
    void aPartnerWithoutBrandingHasNoCardPreview() throws Exception {
        User partner = partnerAccount(fixtures.newCollaborator());

        me(partner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cardPreview").value(nullValue()));
    }

    @Test
    void aPartnerWithBrandingOnSeesTheirCardWithoutALink() throws Exception {
        Collaborator collaborator = fixtures.newCollaborator();
        collaborator.setBrandingEnabled(true);
        collaborator.setBrandingDisplayName("Studio Light");
        collaborator.setBrandingTaglineEl("Φωτογραφία γάμου");
        collaborator.setBrandingTaglineEn("Wedding photography");
        collaboratorRepository.saveAndFlush(collaborator);
        User partner = partnerAccount(collaborator);

        me(partner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cardPreview.displayName").value("Studio Light"))
                .andExpect(jsonPath("$.cardPreview.tagline.en").value("Wedding photography"))
                .andExpect(jsonPath("$.cardPreview.variant").value("FEATURE_CARD"))
                .andExpect(jsonPath("$.cardPreview.linkUrl").value(nullValue()));
    }
```

- [ ] **Step 2: Run to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.CollaborationPortalControllerTest" -q`
Expected: FAIL — no `cardPreview`.

- [ ] **Step 3: Add `previewFor`** (in `PartnerBrandingService`, next to `toCard`)

```java
    /**
     * The partner's own card as it shows in feeds, for the preview on their business page. Null while
     * branding is off. No link (a tap must not count) and no placement (it sits in no feed).
     */
    public PartnerBrandingDto previewFor(Collaborator c) {
        if (!c.isBrandingEnabled()) {
            return null;
        }
        return new PartnerBrandingDto(
                BrandingVariant.FEATURE_CARD,
                c.getBrandingDisplayName(),
                c.getBrandingRole(),
                c.getBrandingLogoKey() == null ? null : storageService.generatePresignedUrl(c.getBrandingLogoKey()),
                c.getBrandingCoverKey() == null ? null : storageService.generatePresignedUrl(c.getBrandingCoverKey()),
                new PartnerBrandingDto.LocalizedText(c.getBrandingTaglineEl(), c.getBrandingTaglineEn()),
                new PartnerBrandingDto.LocalizedText(c.getBrandingServicesEl(), c.getBrandingServicesEn()),
                null,
                null);
    }
```

- [ ] **Step 4: Add the field** (last component of `PartnerPageDto`, and a line in its Javadoc: "`cardPreview` is the partner's feed card for their preview, null while branding is off.")

```java
        PartnerReachDto reach,
        PartnerBrandingDto cardPreview) {
```

- [ ] **Step 5: Fill it** (in `CollaborationPortalService`: inject `private final PartnerBrandingService partnerBrandingService;` and pass `partnerBrandingService.previewFor(collaborator)` as the last constructor argument of `PartnerPageDto`)

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.CollaborationPortalControllerTest" -q`
Expected: PASS, including the existing `thePageCarriesNoHostPii`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(partners): the partner's feed card for a preview on their page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Contact messages — table, entity, push type

**Files:**
- Create: `src/main/resources/db/migration/V198__vendor_contact_messages.sql`
- Create: `src/main/java/event_social_media/model/vendor/VendorContactTopic.java`, `VendorContactStatus.java`, `VendorContactMessage.java`
- Create: `src/main/java/event_social_media/repository/vendor/VendorContactMessageRepository.java`
- Modify: `src/main/java/event_social_media/service/push/AdminAlertType.java`, `AdminAlert.java`

- [ ] **Step 1: Migration**

```sql
-- Notes vendors send us from their business page (spec 2026-11-01). The name and email are copied at
-- send time, so an admin can still reply after the account is gone.

CREATE TABLE vendor_contact_messages (
    id                  UUID PRIMARY KEY,
    user_id             UUID REFERENCES users (id) ON DELETE SET NULL,
    business_name       VARCHAR(80),
    reply_email         VARCHAR(254) NOT NULL,
    topic               VARCHAR(20)  NOT NULL CHECK (topic IN ('QUESTION', 'PROBLEM', 'PARTNERSHIP', 'OTHER')),
    message             TEXT         NOT NULL,
    status              VARCHAR(10)  NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ANSWERED')),
    answered_at         TIMESTAMPTZ,
    answered_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_contact_messages_status_created ON vendor_contact_messages (status, created_at DESC);
```

- [ ] **Step 2: Enums**

```java
package event_social_media.model.vendor;

/** What a vendor's note to us is about; the admin inbox shows it as a pill. */
public enum VendorContactTopic {
    QUESTION, PROBLEM, PARTNERSHIP, OTHER
}
```

```java
package event_social_media.model.vendor;

public enum VendorContactStatus {
    NEW, ANSWERED
}
```

- [ ] **Step 3: Entity**

```java
package event_social_media.model.vendor;

import event_social_media.model.base.Auditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A vendor's note to us from their business page. Admins read it in the console and reply by email. */
@Getter
@Setter
@Entity
@Table(name = "vendor_contact_messages")
public class VendorContactMessage extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "business_name", length = 80)
    private String businessName;

    @Column(name = "reply_email", nullable = false, length = 254)
    private String replyEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "topic", nullable = false, length = 20)
    private VendorContactTopic topic;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private VendorContactStatus status = VendorContactStatus.NEW;

    @Column(name = "answered_at")
    private OffsetDateTime answeredAt;

    @Column(name = "answered_by_user_id")
    private UUID answeredByUserId;
}
```

Check `Auditable` maps `created_at` (as `BugReport` relies on); if it maps other columns too, add them to the migration.

- [ ] **Step 4: Repository**

```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.VendorContactMessage;
import event_social_media.model.vendor.VendorContactStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VendorContactMessageRepository extends JpaRepository<VendorContactMessage, UUID> {

    Page<VendorContactMessage> findByStatus(VendorContactStatus status, Pageable pageable);

    long countByStatus(VendorContactStatus status);
}
```

- [ ] **Step 5: Push type** — in `AdminAlertType`, after `OUTREACH_REQUEST`:

```java
    /** A vendor wrote to us from their business page; only admins answer, so only their phones. */
    VENDOR_MESSAGE("#vendor-messages", false, false);
```

(and change the `;` after `OUTREACH_REQUEST(...)` to `,`). In `AdminAlert`, after `outreachRequest`:

```java
    /** {@code topic} is a {@code VendorContactTopic} name; {@code name} is the business's, or empty when unknown. */
    public static AdminAlert vendorMessage(String topic, String name, UUID messageId) {
        return new AdminAlert(AdminAlertType.VENDOR_MESSAGE,
                Map.of("topic", topic, "name", name == null ? "" : name, "messageId", messageId.toString()));
    }
```

- [ ] **Step 6: Compile and run the migration tests**

Run: `./gradlew compileJava -q && ./gradlew test --tests "event_social_media.migration.*" -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(vendors): vendor contact messages table and VENDOR_MESSAGE push

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `POST /api/me/business/messages`

**Files:**
- Create: `src/main/java/event_social_media/dto/vendor/VendorContactRequestDto.java`, `VendorContactCreatedDto.java`
- Create: `src/main/java/event_social_media/service/vendor/VendorContactService.java`
- Modify: `BusinessController.java`
- Test: `BusinessControllerTest.java`

- [ ] **Step 1: Write the failing tests** — add `@RecordApplicationEvents` to the class and these members (imports: `org.springframework.test.context.event.ApplicationEvents`, `org.springframework.test.context.event.RecordApplicationEvents`, `event_social_media.service.push.AdminAlert`, `event_social_media.service.push.AdminAlertType`, `event_social_media.repository.vendor.VendorContactMessageRepository`, `org.springframework.http.MediaType`, static `MockMvcRequestBuilders.post`, static `org.junit.jupiter.api.Assertions.assertEquals`)

```java
    @Autowired
    private ApplicationEvents events;
    @Autowired
    private VendorContactMessageRepository contactRepository;

    @Test
    void aVendorCanWriteToUs() throws Exception {
        User vendor = fixtures.newUser();
        support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.PHOTOGRAPHER);

        mockMvc.perform(as(vendor, post("/api/me/business/messages"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"topic\":\"PROBLEM\",\"message\":\"  The upload stops at 80%.  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists());

        var saved = contactRepository.findAll().get(0);
        assertEquals("The upload stops at 80%.", saved.getMessage());
        assertEquals(vendor.getEmail(), saved.getReplyEmail());
        assertEquals(1, events.stream(AdminAlert.class)
                .filter(a -> a.type() == AdminAlertType.VENDOR_MESSAGE).count());
    }

    @Test
    void anAccountThatIsNoVendorCannotWrite() throws Exception {
        mockMvc.perform(as(fixtures.newUser(), post("/api/me/business/messages"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"topic\":\"QUESTION\",\"message\":\"Hello there\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anEmptyOrTooLongMessageIsRefused() throws Exception {
        User vendor = fixtures.newUser();
        support.vendorFor(support.vendorEventHostedBy(fixtures.newUser()), vendor, PartnerRole.PHOTOGRAPHER);

        mockMvc.perform(as(vendor, post("/api/me/business/messages"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"topic\":\"QUESTION\",\"message\":\"   \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(as(vendor, post("/api/me/business/messages"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"topic\":\"QUESTION\",\"message\":\"" + "a".repeat(2001) + "\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(as(vendor, post("/api/me/business/messages"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"No topic given\"}"))
                .andExpect(status().isBadRequest());
    }
```

- [ ] **Step 2: Run to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: FAIL — 404/405 on the POST.

- [ ] **Step 3: DTOs**

```java
package event_social_media.dto.vendor;

import event_social_media.model.vendor.VendorContactTopic;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** {@code POST /api/me/business/messages}. The message is trimmed server-side. */
public record VendorContactRequestDto(@NotNull VendorContactTopic topic, @NotBlank @Size(max = 2000) String message) {
}
```

```java
package event_social_media.dto.vendor;

import java.time.OffsetDateTime;
import java.util.UUID;

public record VendorContactCreatedDto(UUID id, OffsetDateTime createdAt) {
}
```

- [ ] **Step 4: Service (send part)**

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.VendorContactCreatedDto;
import event_social_media.dto.vendor.VendorContactRequestDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.user.User;
import event_social_media.model.vendor.VendorContactMessage;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.repository.user.UserRepository;
import event_social_media.repository.vendor.VendorContactMessageRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.push.AdminAlert;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Notes vendors send us from their business page, and the admin inbox that reads them. The sender is
 * bound from auth, never from the body. The push goes after commit ({@code AdminAlertListener}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VendorContactService {

    private final VendorAccounts vendorAccounts;
    private final UserRepository userRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final VendorContactMessageRepository repository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public VendorContactCreatedDto send(UUID userId, VendorContactRequestDto body) {
        vendorAccounts.requireVendor(userId);
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        String businessName = vendorProfileRepository.findById(userId).map(VendorProfile::getBusinessName).orElse(null);

        VendorContactMessage message = new VendorContactMessage();
        message.setUserId(userId);
        message.setBusinessName(businessName);
        message.setReplyEmail(user.getEmail());
        message.setTopic(body.topic());
        // Postgres rejects NUL in text.
        message.setMessage(body.message().replace("\u0000", "").strip());
        VendorContactMessage saved = repository.saveAndFlush(message);

        log.info("Vendor message {} ({}) from {}", saved.getId(), saved.getTopic(), userId);
        eventPublisher.publishEvent(AdminAlert.vendorMessage(saved.getTopic().name(), businessName, saved.getId()));
        return new VendorContactCreatedDto(saved.getId(), saved.getCreatedAt());
    }
}
```

`@NotBlank` already refuses an all-space message, so no extra check after `strip()`.

- [ ] **Step 5: Endpoint** (in `BusinessController`; inject `private final VendorContactService vendorContactService;`)

```java
    @Operation(summary = "Send us a note from the business page")
    @PostMapping("/api/me/business/messages")
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimit(name = "business.messages", limit = 5, windowSeconds = 86400)
    public VendorContactCreatedDto sendMessage(@Valid @RequestBody VendorContactRequestDto body,
                                               Authentication authentication) {
        return vendorContactService.send(callerId(authentication), body);
    }
```

Imports: `jakarta.validation.Valid`, `org.springframework.http.HttpStatus`, `org.springframework.web.bind.annotation.PostMapping`, `RequestBody`, `ResponseStatus`, `event_social_media.dto.vendor.VendorContactCreatedDto`, `VendorContactRequestDto`, `event_social_media.service.vendor.VendorContactService`.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.BusinessControllerTest" -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(vendors): vendors can write to us from the business page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Admin inbox endpoints

**Files:**
- Create: `src/main/java/event_social_media/dto/vendor/VendorContactMessageDto.java`, `VendorContactStatusRequestDto.java`
- Modify: `VendorContactService.java`
- Create: `src/main/java/event_social_media/controller/vendor/VendorContactAdminController.java`
- Test: `src/test/java/event_social_media/controller/vendor/VendorContactAdminControllerTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.controller.vendor;

import event_social_media.model.vendor.VendorContactMessage;
import event_social_media.model.vendor.VendorContactStatus;
import event_social_media.model.vendor.VendorContactTopic;
import event_social_media.repository.vendor.VendorContactMessageRepository;
import org.junit.jupiter.api.Test;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorContactAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private VendorContactMessageRepository repository;

    @Test
    void adminsListNewMessagesNewestFirst() throws Exception {
        message("First", VendorContactStatus.NEW);
        message("Second", VendorContactStatus.NEW);
        message("Done", VendorContactStatus.ANSWERED);

        mockMvc.perform(as("ADMIN", get("/api/admin/vendor-messages").param("status", "NEW")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].message").value("Second"))
                .andExpect(jsonPath("$.content[0].topic").value("QUESTION"))
                .andExpect(jsonPath("$.content[0].replyEmail").value("vendor@example.com"));
        mockMvc.perform(as("ADMIN", get("/api/admin/vendor-messages")))
                .andExpect(jsonPath("$.content.length()").value(3));
    }

    @Test
    void anAdminMarksOneAnswered() throws Exception {
        VendorContactMessage m = message("Help", VendorContactStatus.NEW);

        mockMvc.perform(as("ADMIN", patch("/api/admin/vendor-messages/" + m.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ANSWERED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ANSWERED"))
                .andExpect(jsonPath("$.answeredAt").exists());

        VendorContactMessage saved = repository.findById(m.getId()).orElseThrow();
        assertEquals(VendorContactStatus.ANSWERED, saved.getStatus());
        assertNotNull(saved.getAnsweredByUserId());
    }

    @Test
    void reopeningClearsTheAnswer() throws Exception {
        VendorContactMessage m = message("Help", VendorContactStatus.ANSWERED);

        mockMvc.perform(as("ADMIN", patch("/api/admin/vendor-messages/" + m.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"NEW\"}"))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.answeredAt").doesNotExist());
    }

    @Test
    void usersAndMarketingCannotRead() throws Exception {
        mockMvc.perform(as("USER", get("/api/admin/vendor-messages"))).andExpect(status().isForbidden());
        mockMvc.perform(as("MARKETING", get("/api/admin/vendor-messages"))).andExpect(status().isForbidden());
    }

    private VendorContactMessage message(String text, VendorContactStatus status) {
        VendorContactMessage m = new VendorContactMessage();
        m.setReplyEmail("vendor@example.com");
        m.setBusinessName("Studio Light");
        m.setTopic(VendorContactTopic.QUESTION);
        m.setMessage(text);
        m.setStatus(status);
        return repository.saveAndFlush(m);
    }

    private static MockHttpServletRequestBuilder as(String role, MockHttpServletRequestBuilder request) {
        return request.with(authentication(new UsernamePasswordAuthenticationToken(
                UUID.randomUUID().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_" + role)))));
    }
}
```

If `answered_by_user_id`'s foreign key rejects the random admin id, create the admin with `fixtures.newUser()` instead and pass its id.

"Newest first" relies on `created_at` differing between two inserts in one transaction; if both get the same `now()`, the secondary sort on id makes order random. In that case set `createdAt` explicitly in `message(...)` (one minute apart) if `Auditable` exposes a setter, otherwise drop the order assertion and keep the count.

- [ ] **Step 2: Run to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorContactAdminControllerTest" -q`
Expected: FAIL — 404.

- [ ] **Step 3: DTOs**

```java
package event_social_media.dto.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;
import event_social_media.model.vendor.VendorContactStatus;
import event_social_media.model.vendor.VendorContactTopic;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Admin view of a vendor's note. {@code userId} is null once the account is deleted. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VendorContactMessageDto(UUID id, UUID userId, String businessName, String replyEmail,
                                      VendorContactTopic topic, String message, VendorContactStatus status,
                                      OffsetDateTime createdAt, OffsetDateTime answeredAt) {
}
```

```java
package event_social_media.dto.vendor;

import event_social_media.model.vendor.VendorContactStatus;
import jakarta.validation.constraints.NotNull;

public record VendorContactStatusRequestDto(@NotNull VendorContactStatus status) {
}
```

- [ ] **Step 4: Service methods** (add to `VendorContactService`; imports `Page`, `Pageable`, `PageRequest`, `Sort`, `OffsetDateTime`, the two DTOs, `VendorContactStatus`)

```java
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    @Transactional(readOnly = true)
    public Page<VendorContactMessageDto> list(VendorContactStatus status, Pageable pageable) {
        Pageable page = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100), NEWEST_FIRST);
        Page<VendorContactMessage> rows = status == null ? repository.findAll(page) : repository.findByStatus(status, page);
        return rows.map(VendorContactService::toDto);
    }

    @Transactional
    public VendorContactMessageDto setStatus(UUID id, VendorContactStatus status, UUID adminId) {
        VendorContactMessage message = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("VendorContactMessage", id));
        message.setStatus(status);
        boolean answered = status == VendorContactStatus.ANSWERED;
        message.setAnsweredAt(answered ? OffsetDateTime.now() : null);
        message.setAnsweredByUserId(answered ? adminId : null);
        return toDto(repository.saveAndFlush(message));
    }

    private static VendorContactMessageDto toDto(VendorContactMessage m) {
        return new VendorContactMessageDto(m.getId(), m.getUserId(), m.getBusinessName(), m.getReplyEmail(),
                m.getTopic(), m.getMessage(), m.getStatus(), m.getCreatedAt(), m.getAnsweredAt());
    }
```

- [ ] **Step 5: Controller**

```java
package event_social_media.controller.vendor;

import event_social_media.dto.vendor.VendorContactMessageDto;
import event_social_media.dto.vendor.VendorContactStatusRequestDto;
import event_social_media.model.vendor.VendorContactStatus;
import event_social_media.service.vendor.VendorContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** The admin console's inbox of vendor notes (spec 2026-11-01). Replies go by email, outside the app. */
@Tag(name = "Admin", description = "Vendor messages")
@RestController
@RequestMapping("/api/admin/vendor-messages")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class VendorContactAdminController {

    private final VendorContactService vendorContactService;

    @Operation(summary = "List vendor messages, newest first, optionally by status")
    @GetMapping
    public Page<VendorContactMessageDto> list(@RequestParam(required = false) VendorContactStatus status,
                                              @PageableDefault(size = 50) Pageable pageable) {
        return vendorContactService.list(status, pageable);
    }

    @Operation(summary = "Mark a vendor message answered, or new again")
    @PatchMapping("/{id}")
    public VendorContactMessageDto setStatus(@PathVariable UUID id, @Valid @RequestBody VendorContactStatusRequestDto body,
                                             Authentication authentication) {
        return vendorContactService.setStatus(id, body.status(), UUID.fromString((String) authentication.getPrincipal()));
    }
}
```

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.*" -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(admin): vendor messages inbox endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Docs, full suite, PR

**Files:**
- Modify: `CHANGELOG.md`
- Create: `docs/fe-guides/my-business-fe-integration.md`

- [ ] **Step 1: CHANGELOG** — add under the unreleased section, matching its existing style:

```markdown
- Business page (spec 2026-11-01): `GET /api/me/business`, `GET /api/me/business/events`, `POST /api/me/business/messages` (403 `NOT_A_VENDOR` 4039 for non-vendors, 5 messages a day). `/api/me` has `vendor`. `/api/partners/me` has `cardPreview`. Admin: `GET/PATCH /api/admin/vendor-messages`. New admin push `VENDOR_MESSAGE` (`#vendor-messages`). Migration V198.
```

- [ ] **Step 2: FE guide** — write `docs/fe-guides/my-business-fe-integration.md` with: each endpoint, request and response JSON examples taken from the tests above, which fields are partner-only, the 4039 code, the rate limits, and that `trend` is 6 entries oldest first with `month` as `YYYY-MM` (Athens).

- [ ] **Step 3: Full suite**

Run: `./gradlew test -q`
Expected: PASS. A failure in a test that lists every `AdminAlertType` (parity or listener tests) means the new type must be added there too.

- [ ] **Step 4: Commit and push (after the user's OK)**

```bash
git add -A && git commit -m "docs: business page endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/my-business-page
```

- [ ] **Step 5: Open the PR into `staging`** titled `feat: business page endpoints and vendor messages` with the CHANGELOG line as summary, ending with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
