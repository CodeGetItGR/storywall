# App Reviews — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store one star rating per user after an event they took part in has ended, let admins approve and feature reviews, and expose featured reviews in `GET /api/config` for the landing page.

**Architecture:** A new `app_reviews` table in the existing `feedback` domain. `AppReviewService` owns the prompt rule (which ended event to ask about, if any), submit/dismiss, the admin list/patch, and the featured list. `AppConfigService` adds `landingReviews` to the cached config; admin patches publish `PlatformConfigChangedEvent` so the cache drops at once.

**Tech Stack:** Spring Boot, Spring Data JPA, Flyway (Postgres), H2 + `@SpringBootTest` for tests, Lombok.

**Spec:** `storywall/docs/superpowers/specs/2026-10-16-app-reviews-design.md`. Plan-time decisions that refine it:
- Featured reviews go out inside `GET /api/config` as `landingReviews` (not a separate public endpoint), each with its `locale` so the landing page shows only reviews in its own language.
- `app_reviews.event_id` has **no FK** and the row keeps `event_type` and `event_end_at`, so a featured review and the dismissal rule survive the event's purge (same reasoning as `bug_reports.event_id`). `user_id` cascades: deleting an account deletes its reviews.
- Admins are never prompted.
- Guest accounts no longer exist in production, so no guest filter.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be). Work in a worktree or branch cut from the latest `origin/staging`; open the PR into `staging`.

---

## File Structure

Create:
- `src/main/resources/db/migration/V173__app_reviews.sql` — table, constraints, indexes.
- `src/main/java/event_social_media/model/feedback/AppReview.java` — entity.
- `src/main/java/event_social_media/model/feedback/AppReviewRole.java` — `HOST` / `GUEST`.
- `src/main/java/event_social_media/model/feedback/AppReviewStatus.java` — `PENDING` / `APPROVED` / `HIDDEN`.
- `src/main/java/event_social_media/repository/feedback/AppReviewRepository.java`
- `src/main/java/event_social_media/dto/feedback/AppReviewPromptDto.java` — record.
- `src/main/java/event_social_media/dto/feedback/AppReviewRequestDto.java` — submit body.
- `src/main/java/event_social_media/dto/feedback/AppReviewDismissDto.java` — dismiss body.
- `src/main/java/event_social_media/dto/feedback/AdminAppReviewDto.java` — record.
- `src/main/java/event_social_media/dto/feedback/AppReviewPatchDto.java` — admin patch body.
- `src/main/java/event_social_media/dto/platform/AppLandingReviewDto.java` — record in config.
- `src/main/java/event_social_media/service/feedback/AppReviewService.java`
- `src/main/java/event_social_media/controller/feedback/AppReviewController.java` — `/api/me/...`.
- `src/main/java/event_social_media/controller/feedback/AppReviewAdminController.java` — `/api/admin/app-reviews`.
- `src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java`
- `src/test/java/event_social_media/controller/feedback/AppReviewControllerTest.java`

Modify:
- `src/main/java/event_social_media/repository/event/EventMemberRepository.java` — one query.
- `src/main/java/event_social_media/exception/ErrorCode.java` — two codes.
- `src/main/java/event_social_media/model/audit/AdminAuditAction.java` — one action.
- `src/main/java/event_social_media/dto/platform/AppConfigResponseDto.java` — `landingReviews`.
- `src/main/java/event_social_media/service/platform/AppConfigService.java` — fill it.

---

### Task 1: Migration, enums, entity, repository

**Files:**
- Create: `src/main/resources/db/migration/V173__app_reviews.sql`
- Create: `src/main/java/event_social_media/model/feedback/AppReviewRole.java`
- Create: `src/main/java/event_social_media/model/feedback/AppReviewStatus.java`
- Create: `src/main/java/event_social_media/model/feedback/AppReview.java`
- Create: `src/main/java/event_social_media/repository/feedback/AppReviewRepository.java`

- [ ] **Step 1: Confirm V173 is free**

Run: `git fetch origin staging && git ls-tree -r --name-only origin/staging src/main/resources/db/migration | sed 's#.*/V##' | sort -n | tail -2`
Expected: highest is `172__error_event_http_status.sql`. If something newer exists, use the next free number everywhere this plan says `V173`.

- [ ] **Step 2: Write the migration**

```sql
-- App reviews: one star rating per user per ended event, or a dismissal (stars null).
-- No FK on event_id on purpose: a featured review and the dismissal rule must outlive the
-- event's purge, so the row keeps the event's type and end time itself.

CREATE TABLE app_reviews (
    id             UUID PRIMARY KEY,
    user_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id       UUID         NOT NULL,
    event_type     VARCHAR(50)  NOT NULL,
    event_end_at   TIMESTAMPTZ  NOT NULL,
    role           VARCHAR(16)  NOT NULL CHECK (role IN ('HOST', 'GUEST')),
    stars          SMALLINT CHECK (stars BETWEEN 1 AND 5),
    comment        VARCHAR(500),
    public_consent BOOLEAN      NOT NULL DEFAULT false,
    locale         VARCHAR(10)  NOT NULL,
    status         VARCHAR(16)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'HIDDEN')),
    featured       BOOLEAN      NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_app_reviews_user_event UNIQUE (user_id, event_id),
    CONSTRAINT app_reviews_featured_allowed
        CHECK (NOT featured OR (status = 'APPROVED' AND public_consent AND stars IS NOT NULL))
);

CREATE INDEX idx_app_reviews_user_id ON app_reviews (user_id);
CREATE INDEX idx_app_reviews_created_at ON app_reviews (created_at);
CREATE INDEX idx_app_reviews_featured ON app_reviews (created_at) WHERE featured;
```

- [ ] **Step 3: Write the enums**

`AppReviewRole.java`:

```java
package event_social_media.model.feedback;

/** The reviewer's part in the event the review is about. ATTENDEE members review as GUEST. */
public enum AppReviewRole {
    HOST,
    GUEST
}
```

`AppReviewStatus.java`:

```java
package event_social_media.model.feedback;

/** Admin moderation state. Only APPROVED reviews with public consent can be featured. */
public enum AppReviewStatus {
    PENDING,
    APPROVED,
    HIDDEN
}
```

- [ ] **Step 4: Write the entity**

```java
package event_social_media.model.feedback;

import event_social_media.model.base.Auditable;
import event_social_media.model.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One user's answer to the "How was Storywall?" prompt for one ended event: a 1–5 rating, or a
 * dismissal ({@code stars} null). {@code eventId} has no FK and the event's type and end time are
 * copied in, so the row outlives the event's purge.
 */
@Getter
@Setter
@Entity
@Table(name = "app_reviews",
        uniqueConstraints = @UniqueConstraint(name = "uq_app_reviews_user_event", columnNames = {"user_id", "event_id"}),
        indexes = {
                @Index(name = "idx_app_reviews_user_id", columnList = "user_id"),
                @Index(name = "idx_app_reviews_created_at", columnList = "created_at")})
public class AppReview extends Auditable {

    public static final int COMMENT_MAX = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "event_end_at", nullable = false)
    private OffsetDateTime eventEndAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 16)
    private AppReviewRole role;

    @Column(name = "stars")
    private Short stars;

    @Column(name = "comment", length = COMMENT_MAX)
    private String comment;

    @Column(name = "public_consent", nullable = false)
    private Boolean publicConsent = false;

    @Column(name = "locale", nullable = false, length = 10)
    private String locale;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private AppReviewStatus status = AppReviewStatus.PENDING;

    @Column(name = "featured", nullable = false)
    private Boolean featured = false;

    public boolean isDismissal() {
        return stars == null;
    }
}
```

- [ ] **Step 5: Write the repository**

```java
package event_social_media.repository.feedback;

import event_social_media.model.feedback.AppReview;
import event_social_media.model.feedback.AppReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface AppReviewRepository extends JpaRepository<AppReview, UUID> {

    List<AppReview> findByUser_Id(UUID userId);

    /** Ratings only: dismissals never reach the admin list. */
    @EntityGraph(attributePaths = "user")
    Page<AppReview> findByStarsIsNotNull(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<AppReview> findByStarsIsNotNullAndStatus(AppReviewStatus status, Pageable pageable);

    @Query("select r from AppReview r join fetch r.user where r.featured = true order by r.createdAt desc, r.id desc")
    List<AppReview> findFeatured(Pageable limit);
}
```

- [ ] **Step 6: Compile**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V173__app_reviews.sql src/main/java/event_social_media/model/feedback/AppReview*.java src/main/java/event_social_media/repository/feedback/AppReviewRepository.java
git commit -m "Add the app_reviews table and entity"
```

---

### Task 2: Prompt rule

**Files:**
- Modify: `src/main/java/event_social_media/repository/event/EventMemberRepository.java`
- Create: `src/main/java/event_social_media/dto/feedback/AppReviewPromptDto.java`
- Create: `src/main/java/event_social_media/service/feedback/AppReviewService.java`
- Test: `src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java`

- [ ] **Step 1: Write the failing tests**

```java
package event_social_media.service.feedback;

import event_social_media.dto.feedback.AppReviewPromptDto;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.feedback.AppReview;
import event_social_media.model.feedback.AppReviewRole;
import event_social_media.model.user.PlatformRole;
import event_social_media.model.user.User;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.feedback.AppReviewRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AppReviewServiceTest {

    @Autowired private AppReviewService service;
    @Autowired private AppReviewRepository reviewRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private TestFixtures fixtures;

    private User user;

    @BeforeEach
    void setUp() {
        user = fixtures.newUser();
    }

    /** An event the user hosts, ended {@code hoursAgo} hours ago. */
    private Event hostedEndedHoursAgo(long hoursAgo) {
        return endedHoursAgo(fixtures.newEventHostedBy(user), hoursAgo);
    }

    /** An event the user attends, ended {@code hoursAgo} hours ago. */
    private Event attendedEndedHoursAgo(long hoursAgo) {
        Event event = fixtures.newEvent();
        fixtures.newMember(event, user, EventRole.ATTENDEE);
        return endedHoursAgo(event, hoursAgo);
    }

    private Event endedHoursAgo(Event event, long hoursAgo) {
        OffsetDateTime end = OffsetDateTime.now().minusHours(hoursAgo);
        event.setStartAt(end.minusHours(6));
        event.setEndAt(end);
        return eventRepository.save(event);
    }

    private Optional<AppReviewPromptDto> prompt() {
        return service.findPrompt(user.getId(), PlatformRole.USER);
    }

    @Test
    void noEndedEventMeansNoPrompt() {
        fixtures.newEventHostedBy(user); // ends in 31 days
        assertThat(prompt()).isEmpty();
    }

    @Test
    void anEventThatEndedUnderTwelveHoursAgoIsNotAskedAboutYet() {
        hostedEndedHoursAgo(11);
        assertThat(prompt()).isEmpty();
    }

    @Test
    void asksAboutAHostedEventAsHost() {
        Event event = hostedEndedHoursAgo(13);
        AppReviewPromptDto dto = prompt().orElseThrow();
        assertThat(dto.eventId()).isEqualTo(event.getId());
        assertThat(dto.eventTitle()).isEqualTo(event.getTitle());
        assertThat(dto.role()).isEqualTo(AppReviewRole.HOST);
        assertThat(dto.eventType()).isEqualTo("WEDDING");
    }

    @Test
    void asksAboutAnAttendedEventAsGuest() {
        attendedEndedHoursAgo(30);
        assertThat(prompt().orElseThrow().role()).isEqualTo(AppReviewRole.GUEST);
    }

    @Test
    void picksTheMostRecentlyEndedEvent() {
        hostedEndedHoursAgo(100);
        Event latest = attendedEndedHoursAgo(20);
        assertThat(prompt().orElseThrow().eventId()).isEqualTo(latest.getId());
    }

    @Test
    void neverAsksAdmins() {
        hostedEndedHoursAgo(20);
        assertThat(service.findPrompt(user.getId(), PlatformRole.ADMIN)).isEmpty();
    }

    @Test
    void aDeletedEventIsNotAskedAbout() {
        Event deleted = hostedEndedHoursAgo(20);
        deleted.setDeletedAt(OffsetDateTime.now());
        eventRepository.save(deleted);
        assertThat(prompt()).isEmpty();
    }
}
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `./gradlew test --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: compilation FAILS — `AppReviewService` and `AppReviewPromptDto` don't exist.

- [ ] **Step 3: Add the member query**

In `EventMemberRepository.java`, add next to the other `@Query` methods (imports `OffsetDateTime`, `List`, `UUID`, `@Param` are already there):

```java
    /**
     * The user's live memberships in active, unsuspended, undeleted events that ended at or before
     * {@code endedBefore}, most recently ended first. Feeds the app-review prompt.
     */
    @Query("select m from EventMember m join fetch m.event e"
            + " where m.user.id = :userId and m.deletedAt is null"
            + " and e.deletedAt is null and e.suspendedAt is null"
            + " and e.status = event_social_media.model.event.EventStatus.ACTIVE"
            + " and e.endAt <= :endedBefore"
            + " order by e.endAt desc")
    List<EventMember> findEndedMembershipsForReview(@Param("userId") UUID userId,
                                                    @Param("endedBefore") OffsetDateTime endedBefore);
```

- [ ] **Step 4: Write the prompt DTO**

```java
package event_social_media.dto.feedback;

import event_social_media.model.feedback.AppReviewRole;

import java.util.UUID;

/** GET /api/me/review-prompt: the ended event to ask about. */
public record AppReviewPromptDto(UUID eventId, String eventTitle, String eventType, AppReviewRole role) {
}
```

- [ ] **Step 5: Write the service with the prompt rule**

```java
package event_social_media.service.feedback;

import event_social_media.dto.feedback.AppReviewPromptDto;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.feedback.AppReview;
import event_social_media.model.feedback.AppReviewRole;
import event_social_media.model.user.PlatformRole;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.feedback.AppReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The "How was Storywall?" prompt and its answers. Rules (spec 2026-10-16-app-reviews-design):
 * someone who rated is never asked again; someone who dismissed once may be asked once more, about
 * an event that ended after the dismissed one; two dismissals end it. Only events that ended at
 * least {@link #ASK_AFTER} ago count, and the most recently ended one is asked about.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppReviewService {

    static final Duration ASK_AFTER = Duration.ofHours(12);
    static final int MAX_DISMISSALS = 2;

    private final AppReviewRepository repository;
    private final EventMemberRepository memberRepository;

    @Transactional(readOnly = true)
    public Optional<AppReviewPromptDto> findPrompt(UUID userId, PlatformRole platformRole) {
        return findCandidate(userId, platformRole).map(member -> {
            Event event = member.getEvent();
            return new AppReviewPromptDto(event.getId(), event.getTitle(), event.getEventType(), roleOf(member));
        });
    }

    private Optional<EventMember> findCandidate(UUID userId, PlatformRole platformRole) {
        if (platformRole == PlatformRole.ADMIN) {
            return Optional.empty();
        }
        List<AppReview> answers = repository.findByUser_Id(userId);
        if (answers.stream().anyMatch(review -> !review.isDismissal())) {
            return Optional.empty();
        }
        List<AppReview> dismissals = answers.stream().filter(AppReview::isDismissal).toList();
        if (dismissals.size() >= MAX_DISMISSALS) {
            return Optional.empty();
        }
        OffsetDateTime mustEndAfter = dismissals.isEmpty() ? null : dismissals.getFirst().getEventEndAt();
        Set<UUID> answered = answers.stream().map(AppReview::getEventId).collect(Collectors.toSet());
        return memberRepository.findEndedMembershipsForReview(userId, OffsetDateTime.now().minus(ASK_AFTER)).stream()
                .filter(member -> !answered.contains(member.getEvent().getId()))
                .filter(member -> mustEndAfter == null || member.getEvent().getEndAt().isAfter(mustEndAfter))
                .findFirst();
    }

    private static AppReviewRole roleOf(EventMember member) {
        return member.getRole() == EventRole.HOST ? AppReviewRole.HOST : AppReviewRole.GUEST;
    }
}
```

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/repository/event/EventMemberRepository.java src/main/java/event_social_media/dto/feedback/AppReviewPromptDto.java src/main/java/event_social_media/service/feedback/AppReviewService.java src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java
git commit -m "Pick the ended event to ask for an app review"
```

---

### Task 3: Submit and dismiss

**Files:**
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java`
- Create: `src/main/java/event_social_media/dto/feedback/AppReviewRequestDto.java`
- Modify: `src/main/java/event_social_media/service/feedback/AppReviewService.java`
- Test: `src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java`

- [ ] **Step 1: Add the failing tests**

Append to `AppReviewServiceTest` (add imports `event_social_media.dto.feedback.AppReviewRequestDto`, `event_social_media.exception.BadRequestException`, `event_social_media.model.feedback.AppReviewStatus`, and `static org.assertj.core.api.Assertions.assertThatThrownBy`):

```java
    private AppReviewRequestDto request(Event event, int stars, String comment, boolean consent) {
        AppReviewRequestDto dto = new AppReviewRequestDto();
        dto.setEventId(event.getId());
        dto.setStars(stars);
        dto.setComment(comment);
        dto.setPublicConsent(consent);
        return dto;
    }

    @Test
    void aRatingIsStoredAndEndsThePromptForGood() {
        Event event = hostedEndedHoursAgo(20);
        service.submit(user.getId(), PlatformRole.USER, request(event, 5, "  Loved it  ", true));

        AppReview saved = reviewRepository.findByUser_Id(user.getId()).getFirst();
        assertThat(saved.getStars()).isEqualTo((short) 5);
        assertThat(saved.getComment()).isEqualTo("Loved it");
        assertThat(saved.getPublicConsent()).isTrue();
        assertThat(saved.getRole()).isEqualTo(AppReviewRole.HOST);
        assertThat(saved.getEventType()).isEqualTo("WEDDING");
        assertThat(saved.getLocale()).isEqualTo(user.getLocale());
        assertThat(saved.getStatus()).isEqualTo(AppReviewStatus.PENDING);

        attendedEndedHoursAgo(13); // a later event
        assertThat(prompt()).isEmpty();
    }

    @Test
    void consentNeedsFourStarsAndAComment() {
        Event first = hostedEndedHoursAgo(20);
        service.submit(user.getId(), PlatformRole.USER, request(first, 3, "Okay", true));
        assertThat(reviewRepository.findByUser_Id(user.getId()).getFirst().getPublicConsent()).isFalse();
    }

    @Test
    void consentWithABlankCommentIsDropped() {
        Event event = hostedEndedHoursAgo(20);
        service.submit(user.getId(), PlatformRole.USER, request(event, 5, "   ", true));
        AppReview saved = reviewRepository.findByUser_Id(user.getId()).getFirst();
        assertThat(saved.getComment()).isNull();
        assertThat(saved.getPublicConsent()).isFalse();
    }

    @Test
    void onlyTheEventBeingAskedAboutCanBeRated() {
        hostedEndedHoursAgo(20);
        Event older = hostedEndedHoursAgo(200);
        assertThatThrownBy(() -> service.submit(user.getId(), PlatformRole.USER, request(older, 5, null, false)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void oneDismissalAllowsOneMoreAskAboutALaterEvent() {
        Event first = hostedEndedHoursAgo(100);
        service.dismiss(user.getId(), PlatformRole.USER, first.getId());
        assertThat(prompt()).isEmpty();

        Event later = attendedEndedHoursAgo(20);
        assertThat(prompt().orElseThrow().eventId()).isEqualTo(later.getId());

        service.dismiss(user.getId(), PlatformRole.USER, later.getId());
        attendedEndedHoursAgo(13);
        assertThat(prompt()).isEmpty();
    }

    @Test
    void anEventThatEndedBeforeTheDismissedOneIsNotAskedAbout() {
        Event recent = hostedEndedHoursAgo(20);
        hostedEndedHoursAgo(200); // older, never answered
        service.dismiss(user.getId(), PlatformRole.USER, recent.getId());
        assertThat(prompt()).isEmpty();
    }
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `./gradlew test --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: compilation FAILS — `AppReviewRequestDto`, `submit`, `dismiss` don't exist.

- [ ] **Step 3: Add the error codes**

In `ErrorCode.java`, after `EMAIL_MESSAGE_REQUIRED(3104),` (check 3105/3106 are still free with `grep -n "(310[5-9])" src/main/java/event_social_media/exception/ErrorCode.java`):

```java
    /** 3105 — The app review names an event the caller is not being asked about. {@code 400}. */
    APP_REVIEW_NOT_ELIGIBLE(3105),

    /** 3106 — Only an approved review with public consent can be shown on the landing page. {@code 400}. */
    APP_REVIEW_FEATURE_NOT_ALLOWED(3106),
```

- [ ] **Step 4: Write the request DTO**

```java
package event_social_media.dto.feedback;

import event_social_media.model.feedback.AppReview;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/** POST /api/me/reviews. */
@Data
public class AppReviewRequestDto {

    @NotNull
    private UUID eventId;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer stars;

    @Size(max = AppReview.COMMENT_MAX)
    private String comment;

    private Boolean publicConsent;
}
```

- [ ] **Step 5: Add submit and dismiss to the service**

Add fields and imports to `AppReviewService` (`event_social_media.dto.feedback.AppReviewRequestDto`, `event_social_media.exception.BadRequestException`, `event_social_media.exception.ErrorCode`, `event_social_media.model.user.User`, `event_social_media.repository.user.UserRepository`, `static event_social_media.service.feedback.FeedbackText.stripNulCharacters`):

```java
    static final int CONSENT_MIN_STARS = 4;

    private final UserRepository userRepository;
```

Methods:

```java
    @Transactional
    public void submit(UUID userId, PlatformRole platformRole, AppReviewRequestDto dto) {
        EventMember member = requireCandidate(userId, platformRole, dto.getEventId());
        String comment = dto.getComment() == null ? null : stripNulCharacters(dto.getComment()).strip();
        if (comment != null && comment.isEmpty()) {
            comment = null;
        }
        AppReview review = newAnswer(userId, member);
        review.setStars(dto.getStars().shortValue());
        review.setComment(comment);
        review.setPublicConsent(Boolean.TRUE.equals(dto.getPublicConsent())
                && dto.getStars() >= CONSENT_MIN_STARS && comment != null);
        repository.save(review);
        log.info("App review {} stars by {} for event {} (consent={})",
                dto.getStars(), userId, member.getEvent().getId(), review.getPublicConsent());
    }

    @Transactional
    public void dismiss(UUID userId, PlatformRole platformRole, UUID eventId) {
        EventMember member = requireCandidate(userId, platformRole, eventId);
        repository.save(newAnswer(userId, member));
        log.info("App review prompt dismissed by {} for event {}", userId, eventId);
    }

    private EventMember requireCandidate(UUID userId, PlatformRole platformRole, UUID eventId) {
        return findCandidate(userId, platformRole)
                .filter(member -> member.getEvent().getId().equals(eventId))
                .orElseThrow(() -> {
                    log.info("App review rejected: event {} is not the one {} is asked about", eventId, userId);
                    return new BadRequestException(ErrorCode.APP_REVIEW_NOT_ELIGIBLE,
                            "This event is not open for a review");
                });
    }

    private AppReview newAnswer(UUID userId, EventMember member) {
        User user = userRepository.getReferenceById(userId);
        Event event = member.getEvent();
        AppReview review = new AppReview();
        review.setUser(user);
        review.setEventId(event.getId());
        review.setEventType(event.getEventType());
        review.setEventEndAt(event.getEndAt());
        review.setRole(roleOf(member));
        review.setLocale(user.getLocale());
        return review;
    }
```

Check the import path first: `grep -rn "interface UserRepository" src/main/java`.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: PASS, 13 tests.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/exception/ErrorCode.java src/main/java/event_social_media/dto/feedback/AppReviewRequestDto.java src/main/java/event_social_media/service/feedback/AppReviewService.java src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java
git commit -m "Save app reviews and dismissals"
```

---

### Task 4: Admin list and patch, featured list

**Files:**
- Modify: `src/main/java/event_social_media/model/audit/AdminAuditAction.java`
- Create: `src/main/java/event_social_media/dto/feedback/AdminAppReviewDto.java`
- Create: `src/main/java/event_social_media/dto/feedback/AppReviewPatchDto.java`
- Create: `src/main/java/event_social_media/dto/platform/AppLandingReviewDto.java`
- Modify: `src/main/java/event_social_media/service/feedback/AppReviewService.java`
- Test: `src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java`

- [ ] **Step 1: Add the failing tests**

Append to `AppReviewServiceTest` (imports: `event_social_media.dto.feedback.AdminAppReviewDto`, `event_social_media.dto.feedback.AppReviewPatchDto`, `event_social_media.dto.platform.AppLandingReviewDto`, `event_social_media.model.audit.AdminAuditAction`, `event_social_media.repository.audit.AdminAuditLogRepository`, `event_social_media.service.audit.AdminActor`, `event_social_media.service.platform.PlatformConfigChangedEvent`, `org.springframework.data.domain.PageRequest`, `org.springframework.test.context.event.ApplicationEvents`, `org.springframework.test.context.event.RecordApplicationEvents`, `java.util.List`, `java.util.UUID`). Add `@RecordApplicationEvents` to the class and these fields:

```java
    @Autowired private AdminAuditLogRepository auditRepository;
    @Autowired private ApplicationEvents events;
```

Tests:

```java
    private UUID rated(int stars, String comment, boolean consent) {
        Event event = hostedEndedHoursAgo(20);
        service.submit(user.getId(), PlatformRole.USER, request(event, stars, comment, consent));
        return reviewRepository.findByUser_Id(user.getId()).getFirst().getId();
    }

    private AdminActor admin() {
        return new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7");
    }

    private AppReviewPatchDto patch(AppReviewStatus status, Boolean featured) {
        AppReviewPatchDto dto = new AppReviewPatchDto();
        dto.setStatus(status);
        dto.setFeatured(featured);
        return dto;
    }

    @Test
    void theAdminListShowsRatingsNotDismissals() {
        Event dismissed = hostedEndedHoursAgo(100);
        service.dismiss(user.getId(), PlatformRole.USER, dismissed.getId());
        Event rated = attendedEndedHoursAgo(20);
        service.submit(user.getId(), PlatformRole.USER, request(rated, 4, "Nice", false));

        List<AdminAppReviewDto> rows = service.findAll(null, PageRequest.of(0, 50)).getContent();
        assertThat(rows).extracting(AdminAppReviewDto::eventId).containsExactly(rated.getId());
        assertThat(rows.getFirst().firstName()).isEqualTo(user.getFirstName());
    }

    @Test
    void approvingAndFeaturingIsAuditedAndRefreshesConfig() {
        UUID id = rated(5, "Loved it", true);
        AdminAppReviewDto row = service.patch(id, patch(AppReviewStatus.APPROVED, true), admin());

        assertThat(row.status()).isEqualTo(AppReviewStatus.APPROVED);
        assertThat(row.featured()).isTrue();
        assertThat(auditRepository.findAll()).anySatisfy(log -> {
            assertThat(log.getAction()).isEqualTo(AdminAuditAction.APP_REVIEW_UPDATED);
            assertThat(log.getTargetId()).isEqualTo(id);
        });
        assertThat(events.stream(PlatformConfigChangedEvent.class)).isNotEmpty();
    }

    @Test
    void aReviewWithoutConsentCannotBeFeatured() {
        UUID id = rated(5, "Loved it", false);
        assertThatThrownBy(() -> service.patch(id, patch(AppReviewStatus.APPROVED, true), admin()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void aPendingReviewCannotBeFeatured() {
        UUID id = rated(5, "Loved it", true);
        assertThatThrownBy(() -> service.patch(id, patch(null, true), admin()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void hidingAFeaturedReviewUnfeaturesIt() {
        UUID id = rated(5, "Loved it", true);
        AdminActor actor = admin();
        service.patch(id, patch(AppReviewStatus.APPROVED, true), actor);
        AdminAppReviewDto row = service.patch(id, patch(AppReviewStatus.HIDDEN, null), actor);
        assertThat(row.featured()).isFalse();
    }

    @Test
    void theLandingListHasFeaturedReviewsOnly() {
        UUID id = rated(5, "Loved it", true);
        assertThat(service.findLandingReviews()).isEmpty();

        service.patch(id, patch(AppReviewStatus.APPROVED, true), admin());
        List<AppLandingReviewDto> landing = service.findLandingReviews();
        assertThat(landing).singleElement().satisfies(review -> {
            assertThat(review.comment()).isEqualTo("Loved it");
            assertThat(review.firstName()).isEqualTo(user.getFirstName());
            assertThat(review.role()).isEqualTo(AppReviewRole.HOST);
            assertThat(review.eventType()).isEqualTo("WEDDING");
            assertThat(review.locale()).isEqualTo(user.getLocale());
        });
    }
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `./gradlew test --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: compilation FAILS — DTOs, `findAll`, `patch`, `findLandingReviews`, `APP_REVIEW_UPDATED` don't exist.

- [ ] **Step 3: Add the audit action**

At the end of `AdminAuditAction.java`, change `EMAIL_SENT` to `EMAIL_SENT,` and add:

```java
    /** An admin changed an app review's status or landing placement; details: fields, status, featured. Target type APP_REVIEW. */
    APP_REVIEW_UPDATED
```

- [ ] **Step 4: Write the DTOs**

`AdminAppReviewDto.java`:

```java
package event_social_media.dto.feedback;

import event_social_media.model.feedback.AppReviewRole;
import event_social_media.model.feedback.AppReviewStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

/** GET/PATCH /api/admin/app-reviews. */
public record AdminAppReviewDto(UUID id, int stars, String comment, AppReviewRole role, String eventType,
                                UUID eventId, UUID userId, String firstName, String locale,
                                boolean publicConsent, AppReviewStatus status, boolean featured,
                                OffsetDateTime createdAt) {
}
```

`AppReviewPatchDto.java`:

```java
package event_social_media.dto.feedback;

import event_social_media.model.feedback.AppReviewStatus;
import lombok.Data;

/** PATCH /api/admin/app-reviews/{id}. Null fields are left as they are. */
@Data
public class AppReviewPatchDto {

    private AppReviewStatus status;

    private Boolean featured;
}
```

`AppLandingReviewDto.java`:

```java
package event_social_media.dto.platform;

import event_social_media.model.feedback.AppReviewRole;

import java.util.UUID;

/** GET /api/config → landingReviews: featured reviews, newest first. The page shows its own locale's. */
public record AppLandingReviewDto(UUID id, int stars, String comment, String firstName, AppReviewRole role,
                                  String eventType, String locale) {
}
```

- [ ] **Step 5: Add the admin and landing methods**

Add to `AppReviewService` (imports: the three DTOs, `event_social_media.model.audit.AdminAuditAction`, `event_social_media.model.feedback.AppReviewStatus`, `event_social_media.exception.ResourceNotFoundException`, `event_social_media.service.audit.AdminActor`, `event_social_media.service.audit.AdminAuditService`, `event_social_media.service.platform.PlatformConfigChangedEvent`, `org.springframework.context.ApplicationEventPublisher`, `org.springframework.data.domain.Page`, `org.springframework.data.domain.PageRequest`, `org.springframework.data.domain.Pageable`, `java.util.ArrayList`, `java.util.Map`):

```java
    static final int LANDING_LIMIT = 24;
    private static final String TARGET_TYPE = "APP_REVIEW";

    private final AdminAuditService adminAuditService;
    private final ApplicationEventPublisher eventPublisher;
```

```java
    @Transactional(readOnly = true)
    public Page<AdminAppReviewDto> findAll(AppReviewStatus status, Pageable pageable) {
        Page<AppReview> page = status == null
                ? repository.findByStarsIsNotNull(pageable)
                : repository.findByStarsIsNotNullAndStatus(status, pageable);
        return page.map(AppReviewService::toAdminDto);
    }

    @Transactional
    public AdminAppReviewDto patch(UUID id, AppReviewPatchDto dto, AdminActor actor) {
        AppReview review = repository.findById(id)
                .filter(found -> !found.isDismissal())
                .orElseThrow(() -> new ResourceNotFoundException("AppReview", id));
        List<String> fields = new ArrayList<>();
        if (dto.getStatus() != null) {
            review.setStatus(dto.getStatus());
            fields.add("status");
        }
        if (dto.getFeatured() != null) {
            fields.add("featured");
        }
        boolean wantFeatured = dto.getFeatured() != null ? dto.getFeatured() : review.getFeatured();
        if (review.getStatus() != AppReviewStatus.APPROVED && dto.getFeatured() == null) {
            wantFeatured = false; // leaving APPROVED takes it off the landing page
        }
        if (wantFeatured && (review.getStatus() != AppReviewStatus.APPROVED || !review.getPublicConsent())) {
            log.warn("App review {} feature rejected: status={} consent={} actorId={}",
                    id, review.getStatus(), review.getPublicConsent(), actor.userId());
            throw new BadRequestException(ErrorCode.APP_REVIEW_FEATURE_NOT_ALLOWED,
                    "Only an approved review with public consent can be shown on the landing page");
        }
        review.setFeatured(wantFeatured);
        AppReview saved = repository.save(review);
        adminAuditService.record(actor, AdminAuditAction.APP_REVIEW_UPDATED, TARGET_TYPE, id, null,
                Map.of("fields", fields, "status", saved.getStatus().name(), "featured", saved.getFeatured()));
        eventPublisher.publishEvent(new PlatformConfigChangedEvent());
        log.info("App review {} updated: status={} featured={} (actorId={})",
                id, saved.getStatus(), saved.getFeatured(), actor.userId());
        return toAdminDto(saved);
    }

    /** For GET /api/config. */
    @Transactional(readOnly = true)
    public List<AppLandingReviewDto> findLandingReviews() {
        return repository.findFeatured(PageRequest.of(0, LANDING_LIMIT)).stream()
                .map(review -> new AppLandingReviewDto(review.getId(), review.getStars(), review.getComment(),
                        review.getUser().getFirstName(), review.getRole(), review.getEventType(), review.getLocale()))
                .toList();
    }

    private static AdminAppReviewDto toAdminDto(AppReview review) {
        return new AdminAppReviewDto(review.getId(), review.getStars(), review.getComment(), review.getRole(),
                review.getEventType(), review.getEventId(), review.getUser().getId(), review.getUser().getFirstName(),
                review.getLocale(), review.getPublicConsent(), review.getStatus(), review.getFeatured(),
                review.getCreatedAt());
    }
```

Check `PlatformConfigChangedEvent`'s package with `grep -rn "class PlatformConfigChangedEvent" src/main/java` and fix the import if it is not `service.platform`.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: PASS, 19 tests.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/model/audit/AdminAuditAction.java src/main/java/event_social_media/dto/feedback/AdminAppReviewDto.java src/main/java/event_social_media/dto/feedback/AppReviewPatchDto.java src/main/java/event_social_media/dto/platform/AppLandingReviewDto.java src/main/java/event_social_media/service/feedback/AppReviewService.java src/test/java/event_social_media/service/feedback/AppReviewServiceTest.java
git commit -m "Let admins approve and feature app reviews"
```

---

### Task 5: Controllers and config

**Files:**
- Create: `src/main/java/event_social_media/dto/feedback/AppReviewDismissDto.java`
- Create: `src/main/java/event_social_media/controller/feedback/AppReviewController.java`
- Create: `src/main/java/event_social_media/controller/feedback/AppReviewAdminController.java`
- Modify: `src/main/java/event_social_media/dto/platform/AppConfigResponseDto.java`
- Modify: `src/main/java/event_social_media/service/platform/AppConfigService.java`
- Test: `src/test/java/event_social_media/controller/feedback/AppReviewControllerTest.java`

- [ ] **Step 1: Write the failing controller test**

```java
package event_social_media.controller.feedback;

import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.feedback.AppReviewRepository;
import event_social_media.service.platform.AppConfigService;
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

import java.time.OffsetDateTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AppReviewControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private EventRepository eventRepository;
    @Autowired private AppReviewRepository reviewRepository;
    @Autowired private AppConfigService appConfigService;
    @Autowired private ObjectMapper objectMapper;

    private User user;
    private UsernamePasswordAuthenticationToken asUser;
    private UsernamePasswordAuthenticationToken asAdmin;

    @BeforeEach
    void setUp() {
        user = fixtures.newUser();
        asUser = new UsernamePasswordAuthenticationToken(user.getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        asAdmin = new UsernamePasswordAuthenticationToken(fixtures.newAdmin().getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        appConfigService.invalidateCache();
    }

    private Event endedEvent() {
        Event event = fixtures.newEventHostedBy(user);
        event.setStartAt(OffsetDateTime.now().minusDays(2));
        event.setEndAt(OffsetDateTime.now().minusDays(1));
        return eventRepository.save(event);
    }

    @Test
    void noPromptIs204() throws Exception {
        mockMvc.perform(get("/api/me/review-prompt").with(authentication(asUser)))
                .andExpect(status().isNoContent());
    }

    @Test
    void promptThenRateThenNoPrompt() throws Exception {
        Event event = endedEvent();
        mockMvc.perform(get("/api/me/review-prompt").with(authentication(asUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventId").value(event.getId().toString()))
                .andExpect(jsonPath("$.role").value("HOST"));

        mockMvc.perform(post("/api/me/reviews").with(authentication(asUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + event.getId() + "\",\"stars\":5,\"comment\":\"Great\",\"publicConsent\":true}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me/review-prompt").with(authentication(asUser)))
                .andExpect(status().isNoContent());
    }

    @Test
    void starsOutsideOneToFiveIs400() throws Exception {
        Event event = endedEvent();
        mockMvc.perform(post("/api/me/reviews").with(authentication(asUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + event.getId() + "\",\"stars\":6}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dismissIs204() throws Exception {
        Event event = endedEvent();
        mockMvc.perform(post("/api/me/reviews/dismiss").with(authentication(asUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + event.getId() + "\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void theAdminListIsAdminOnly() throws Exception {
        mockMvc.perform(get("/api/admin/app-reviews").with(authentication(asUser)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/app-reviews").with(authentication(asAdmin)))
                .andExpect(status().isOk());
    }

    @Test
    void aFeaturedReviewShowsUpInConfig() throws Exception {
        Event event = endedEvent();
        mockMvc.perform(post("/api/me/reviews").with(authentication(asUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + event.getId() + "\",\"stars\":5,\"comment\":\"Great\",\"publicConsent\":true}"))
                .andExpect(status().isNoContent());
        String id = reviewRepository.findByUser_Id(user.getId()).getFirst().getId().toString();

        mockMvc.perform(patch("/api/admin/app-reviews/{id}", id).with(authentication(asAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\",\"featured\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured").value(true));

        mockMvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.landingReviews[0].comment").value("Great"))
                .andExpect(jsonPath("$.landingReviews[0].firstName").value(user.getFirstName()));
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.feedback.AppReviewControllerTest"`
Expected: FAIL — 404s for the new routes, and no `landingReviews` in config.

- [ ] **Step 3: Write the dismiss DTO**

```java
package event_social_media.dto.feedback;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/** POST /api/me/reviews/dismiss. */
@Data
public class AppReviewDismissDto {

    @NotNull
    private UUID eventId;
}
```

- [ ] **Step 4: Write the user controller**

```java
package event_social_media.controller.feedback;

import event_social_media.dto.feedback.AppReviewDismissDto;
import event_social_media.dto.feedback.AppReviewPromptDto;
import event_social_media.dto.feedback.AppReviewRequestDto;
import event_social_media.service.feedback.AppReviewService;
import event_social_media.service.feedback.FeedbackCaller;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** The signed-in caller's "How was Storywall?" prompt. 204 from the prompt means nothing to ask. */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class AppReviewController {

    private final AppReviewService appReviewService;

    @GetMapping("/review-prompt")
    public ResponseEntity<AppReviewPromptDto> prompt(Authentication authentication) {
        return appReviewService.findPrompt(userId(authentication), FeedbackCaller.roleOf(authentication))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @RateLimit(name = "app-reviews.answer", limit = 10, windowSeconds = 3600)
    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void submit(@Valid @RequestBody AppReviewRequestDto dto, Authentication authentication) {
        appReviewService.submit(userId(authentication), FeedbackCaller.roleOf(authentication), dto);
    }

    @RateLimit(name = "app-reviews.answer", limit = 10, windowSeconds = 3600)
    @PostMapping("/reviews/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismiss(@Valid @RequestBody AppReviewDismissDto dto, Authentication authentication) {
        appReviewService.dismiss(userId(authentication), FeedbackCaller.roleOf(authentication), dto.getEventId());
    }

    private static UUID userId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
```

Check `@RateLimit` lives at `event_social_media.service.ratelimit.RateLimit` (it does in `BugReportController`).

- [ ] **Step 5: Write the admin controller**

```java
package event_social_media.controller.feedback;

import event_social_media.dto.feedback.AdminAppReviewDto;
import event_social_media.dto.feedback.AppReviewPatchDto;
import event_social_media.model.feedback.AppReviewStatus;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.feedback.AppReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Admin moderation of app reviews. Dismissals are never listed. */
@RestController
@RequestMapping("/api/admin/app-reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AppReviewAdminController {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final AppReviewService appReviewService;
    private final ClientAddressResolver clientAddressResolver;

    /** Client-supplied sort is ignored, as in BugReportController. */
    @GetMapping
    public Page<AdminAppReviewDto> findAll(@RequestParam(required = false) AppReviewStatus status,
                                           @PageableDefault(size = 50) Pageable pageable) {
        return appReviewService.findAll(status,
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), NEWEST_FIRST));
    }

    @PatchMapping("/{id}")
    public AdminAppReviewDto patch(@PathVariable UUID id, @Valid @RequestBody AppReviewPatchDto dto,
                                   Authentication authentication, HttpServletRequest request) {
        AdminActor actor = new AdminActor(UUID.fromString((String) authentication.getPrincipal()),
                clientAddressResolver.resolve(request));
        return appReviewService.patch(id, dto, actor);
    }
}
```

- [ ] **Step 6: Add `landingReviews` to the config**

In `AppConfigResponseDto.java`, after `private List<AppLandingCategoryDto> landingCategories;`:

```java

        private List<AppLandingReviewDto> landingReviews;
```

In `AppConfigService.java`, add the field next to `landingCategoryService` (import `event_social_media.service.feedback.AppReviewService`):

```java
    private final AppReviewService appReviewService;
```

and after `dto.setLandingCategories(landingCategoryService.findPublic());`:

```java
        dto.setLandingReviews(appReviewService.findLandingReviews());
```

- [ ] **Step 7: Run the controller and service tests**

Run: `./gradlew test --tests "event_social_media.controller.feedback.AppReviewControllerTest" --tests "event_social_media.service.feedback.AppReviewServiceTest"`
Expected: PASS.

- [ ] **Step 8: Run the full suite**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`. If a config snapshot test lists every `AppConfigResponseDto` field, add `landingReviews` to it.

- [ ] **Step 9: Commit and update the graph**

```bash
git add src/main/java/event_social_media/dto src/main/java/event_social_media/controller/feedback src/main/java/event_social_media/service/platform/AppConfigService.java src/test/java/event_social_media/controller/feedback/AppReviewControllerTest.java
git commit -m "Expose app review routes and featured reviews in config"
graphify update .
```

---

### Task 6: Manual check against Postgres

- [ ] **Step 1: Run the app locally** (`bootRun` doesn't load `.env`; use the usual local setup) and confirm Flyway applies `V173` cleanly.

- [ ] **Step 2: Hit the routes with a local user that has an ended event**

`GET /api/me/review-prompt` → 200 with the event; `POST /api/me/reviews` → 204; prompt again → 204; as admin `PATCH /api/admin/app-reviews/{id}` `{"status":"APPROVED","featured":true}` → 200; `GET /api/config` → `landingReviews` has it.

- [ ] **Step 3: Confirm the DB constraint holds**

In psql: `UPDATE app_reviews SET featured = true WHERE public_consent = false;` → fails on `app_reviews_featured_allowed`.

- [ ] **Step 4: Open the PR into `staging`.**
