# Vendor reach report and sneak peek — backend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let photographers and videographers post one pinned "sneak peek" of up to 20 Pro items that every guest is told about, record one view per guest of vendor work, and give each vendor a reach report (short for everyone, full for approved partners) on their page, in an email when their access ends, and as totals in the partner portal.

**Architecture:** A sneak peek is an ordinary `posts` row of type `SNEAK_PEEK` (pinned, authored by the vendor's member, Pro media attached through `post_media`) plus one `sneak_peeks` row per vendor that records it was used. Its own service path validates Pro items and the window; `PostService` keeps its rules and gains a refusal and one removal entry point. Views are `content_views` rows (one per member per Pro item or vendor post) written by a batched endpoint. A reach service counts views, list taps, reactions, comments and partner card taps per vendor row; the vendor page, the access-end notifier and the partner portal all read it.

**Tech Stack:** Spring Boot 3, JPA/Hibernate, Flyway (Postgres), H2 test suite (`ddl-auto=create-drop`, Flyway off), Testcontainers (`PostgresTestBase`) for migration tests, MockMvc, JUnit 5, AssertJ, Mockito, Gradle.

**Spec:** the frontend repo's [2026-10-29-vendor-reach-and-sneak-peek-design.md](../specs/2026-10-29-vendor-reach-and-sneak-peek-design.md). Frontend plan: [2026-10-29-vendor-reach-and-sneak-peek-frontend.md](2026-10-29-vendor-reach-and-sneak-peek-frontend.md). This plan must be merged to `staging` before the frontend plan's API tasks can be checked against a real server.

---

## Where and how

- Repository: `C:\Users\User\IdeaProjects\event_social_media` (Spring, "guestwall-be"). Paths below are relative to it. Main package `src/main/java/event_social_media` is written `MAIN/`, tests `src/test/java/event_social_media` are written `TEST/`, resources `src/main/resources` are written `RES/`.
- The main checkout is shared with other sessions. Work in a worktree cut from the latest `staging` (long paths on: the repo has deep Postman folders):
  ```bash
  cd C:/Users/User/IdeaProjects/event_social_media
  git fetch origin
  git -c core.longpaths=true worktree add .claude/worktrees/vendor-reach -b feat/vendor-reach-and-sneak-peek origin/staging
  cd .claude/worktrees/vendor-reach
  ```
- Run one test class: `./gradlew test --tests "event_social_media.controller.vendor.SneakPeekControllerTest"`. Run the suite: `./gradlew test`. Postgres tests self-skip without Docker; start Docker Desktop before Task 1 Step 6.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or open a PR until the user says so. The PR goes into `staging`.
- Backend `CLAUDE.md` rules apply: surgical changes, match the style around you, after code changes run `graphify update .`.
- Error responses carry the numeric code at `$.errorCode` (`ErrorCode.X.getCode()`); tests assert that, as `ProAlbumControllerTest` does.

## Numbers to re-check before you start

On 2026-10-29 `staging` (a8438dbd) ends at `V185__qr_card_templates.sql`, `QR_CARD_ARTWORK_SIZE_INVALID(3111)`, `PRINT_PICKS_UNAVAILABLE(4036)` and `PUSH_NOT_ENABLED(5186)`, and no open branch claims the numbers below. If `staging` has moved, take the next free numbers, use them everywhere this plan names them, and update the frontend plan's `lib/api/errors.ts` task to match.

| Name | Number | HTTP |
| --- | --- | --- |
| `V186__vendor_reach_and_sneak_peek.sql` | migration | |
| `SNEAK_PEEK_MEDIA_INVALID` | 3112 | 400 |
| `SNEAK_PEEK_NOT_OPEN` | 5187 | 409 |
| `SNEAK_PEEK_USED` | 5188 | 409 |

## Decisions this plan settles

The spec left names and some mechanics to the plan. Settled here:

1. **Posts are hard-deleted.** `PostService.remove` calls `deleteById`; the spec's "soft-deleted" wording means "removed through the normal post delete". Pro items survive it because `MediaService.removeUploadsLeftBehind` only removes media uploaded with context `POST`, and a Pro item's context is `PRO`.
2. **The sneak peek allows 20 items** through its own validation. The normal post limit `MediaLimits.MAX_MEDIA_PER_POST` (10) is unchanged and still applies to `POST /api/posts`.
3. **`sneak_peeks`** keeps one row per vendor row (`event_vendor_id` unique). Its `post_id` is set to null when the post goes (in code, before the delete, because the H2 test schema has no foreign keys; the Postgres `ON DELETE SET NULL` is the backstop). The row staying is what "used" means, so a vendor never posts a second one, even after a delete (spec decision "no re-post").
4. **`content_views`** uses plain UUID columns, a check that exactly one of `media_id`/`post_id` is set, and partial unique indexes per member+media and member+post. Inserts are "read the ids already viewed, then `saveAndFlush` each new row in its own repository transaction, skipping a `DataIntegrityViolationException`". No `ON CONFLICT`: the H2 suite would not run it.
5. **No bean cycles.** `MediaService.remove` publishes `ProMediaRemovedEvent`; a synchronous `SneakPeekCleanup` listener removes a sneak peek whose last item is gone, through a new public `PostService.removeSneakPeekPost`. `SneakPeekAudit` is its own component so `PostService` can audit a sneak peek delete without depending on `SneakPeekService`. `VendorMembership.end` calls `SneakPeekCleanup.vendorRemoved`.
6. **`posts.type` has a CHECK constraint** (V2 declared it inline, so Postgres named it `posts_type_check`); the spec's "no constraint change" was wrong. V186 recreates it with `SNEAK_PEEK` added. **`PostRequestDto`'s `@Pattern(regexp = "TEXT|MEDIA|ANNOUNCEMENT|PLAYLIST")` stays as it is**, so `POST /api/posts` already refuses `type=SNEAK_PEEK` with a 400: a sneak peek is only made through its own endpoint, and `PostService.create` needs no new check. The generic `DELETE /api/posts/{id}` still works on one (the host's "remove"; the vendor's own delete through either endpoint), and audits `SNEAK_PEEK_DELETE` with `deletedBy` `HOST` or `VENDOR`. The host unpins through the generic `PATCH /api/posts/{id}` (`isPinned=false`), which already needs a host. A caption edit through the generic patch stays allowed for the author, like any post.
7. **The window.** `EventAuthorizationService.requireVendor(…, SNEAK_PEEK)` already refuses after access ends (`VENDOR_ACCESS_ENDED`) and when the type or module is off. `SNEAK_PEEK_NOT_OPEN` covers only "before `event.startAt`". So after access ends the vendor can no longer edit or delete through the sneak-peek endpoints; the host still can through the post endpoints.
8. **Reach access.** `GET …/vendors/me/reach` needs an active vendor row for the caller (not removed), ignores the access window (the report is read after the event), and ignores the vendors module (like `GET …/vendors/me`). Hosts, guests and removed vendors get `VENDOR_CAPABILITY_MISSING` (403).
9. **Reach fields.** Pro fields (`proViewers`, `proViews`) are null for types without the Pro album, for partners too. For non-partners every partner field is null. `partnerCardTaps` is the count of `partner_branding_clicks` for this event and the partner's collaborator, 0 when their card never ran or never got a tap; the frontend hides that tile at 0. The partner's collaborator is found by `ApprovedPartners.collaboratorId(User)`, the same email match `isApproved` uses.
10. **Reach summary.** `VendorAccessSweepJob.recordIfEnded` publishes `VendorAccessEndedEvent` inside its transaction; an `@Async` after-commit listener calls `VendorReachSummaryNotifier`. The body key is `notification.vendor.reach.body.basic` (non-partner), `.body.full` (partner with a Pro album) or `.body.full_no_pro` (partner without). The non-partner body ends with a line pointing at the vendor page, where the existing "Become a partner" action is, and the notification's button opens that page. This replaces the spec's "link to the partner page": the email gets no second link, and the apply flow stays where it already is.
11. **The real portal DTO is `PartnerPageDto`** (the spec called it `PartnerPortalResponseDto`), served at `GET /api/partners/{token}` (the spec wrote `/api/public/partners/{token}/portal`). It gains `reach`. Rows carry `startAt`, `vendorType`, `guests`, `views`, never an event title or id (user decision 2026-10-29: the portal opens with the link alone; sign-in is KAN-28). The portal counts vendor rows that are not removed, of events not deleted, whose account email matches the partner's contact email.
12. **Notification copy and recipients.** Server copy uses `{businessName}`, the placeholder `notification.vendor.joined.*` already uses; the frontend fallback maps the payload's `businessName` to `{business}` as `NotificationRow` does today. The body does not name the event: the in-app list already shows the event title, and the email subject carries the title line. `SNEAK_PEEK_POSTED` goes to every live member with an account except the posting vendor's own member; hosts and other vendors included. It is SYSTEM, so `NotificationEmailDispatcher` emails it (it is not in `IN_APP_ONLY`).
13. **Audit keys.** `VendorAuditWriter.ALLOWED_KEYS` gains `deletedBy` (`HOST`, `VENDOR`, `REMOVED`, `EMPTY`), `memberCount` and `partner`. All are enum names, numbers or booleans, so `VendorAuditPiiScanTest` stays green.
14. **Rate limit.** `POST …/views` is `@RateLimit(name = "content.views", limit = 240, windowSeconds = 3600)`: a client flushes at most every 10 s, so an hour of open feed is 360 flushes at worst, and most flushes are empty and never sent.

## File structure

New (under `MAIN/` unless noted):

| File | Responsibility |
| --- | --- |
| `RES/db/migration/V186__vendor_reach_and_sneak_peek.sql` | `posts.type` check gains `SNEAK_PEEK`; `sneak_peeks`, `content_views` |
| `model/vendor/SneakPeek.java` | "This vendor row used its sneak peek", and which post it is |
| `model/media/ContentView.java` | One member saw one Pro item or one vendor post |
| `repository/vendor/SneakPeekRepository.java` | |
| `repository/media/ContentViewRepository.java` | Inserts' look-ups, countable ids, reach counts |
| `dto/vendor/SneakPeekRequestDto.java` | POST body |
| `dto/vendor/SneakPeekPatchDto.java` | PATCH body |
| `dto/vendor/SneakPeekSummaryDto.java` | `VendorMeDto.sneakPeek` |
| `dto/vendor/VendorReachDto.java` | The reach report |
| `dto/media/ContentViewsRequestDto.java` | POST views body |
| `dto/collaboration/PartnerReachDto.java` | Portal totals and rows |
| `service/vendor/SneakPeekService.java` | Create, update, delete, summary |
| `service/vendor/SneakPeekAudit.java` | Sneak peek audit rows, shared with `PostService` |
| `service/vendor/SneakPeekCleanup.java` | Removes a sneak peek when its last item or its vendor goes |
| `service/vendor/SneakPeekPostedEvent.java` | After-commit trigger for the notifier |
| `service/vendor/SneakPeekPostedListener.java` | `@Async` after-commit listener |
| `service/vendor/SneakPeekNotifier.java` | Tells every member |
| `service/media/ProMediaRemovedEvent.java` | A Pro item was soft-deleted |
| `service/media/ContentViewService.java` | Records views |
| `service/vendor/VendorReachService.java` | Counts per vendor row |
| `service/vendor/VendorAccessEndedEvent.java` | Published by the sweep |
| `service/vendor/VendorAccessEndedListener.java` | `@Async` after-commit listener |
| `service/vendor/VendorReachSummaryNotifier.java` | The end-of-access notification and email |
| `service/collaboration/PartnerReachService.java` | Portal totals |
| `controller/vendor/SneakPeekController.java` | POST/PATCH/DELETE `…/vendors/me/sneak-peek` |
| `controller/vendor/VendorReachController.java` | GET `…/vendors/me/reach` |
| `controller/media/ContentViewController.java` | POST `…/views` |

Modified:

| File | Change |
| --- | --- |
| `exception/ErrorCode.java` | Three codes |
| `service/vendor/VendorCapability.java` | `SNEAK_PEEK` |
| `model/user/NotificationType.java` | `SNEAK_PEEK_POSTED`, `VENDOR_REACH_SUMMARY` |
| `model/user/NotificationCtaTarget.java` | `EVENT_POST` |
| `service/vendor/VendorAuditWriter.java` | Three allowed keys |
| `service/vendor/ApprovedPartners.java` | `collaboratorId(User)` |
| `repository/collaboration/CollaboratorRepository.java` | `findFirstByContactEmailIgnoreCaseAndStatusAndDeletedAtIsNull` |
| `repository/collaboration/PartnerBrandingClickRepository.java` | `countByEventIdAndCollaboratorId` |
| `repository/media/ReactionRepository.java`, `CommentRepository.java` | Counts on one author's posts |
| `repository/vendor/EventVendorRepository.java` | `findForPartnerReach` |
| `service/media/PostService.java` | Audit a sneak peek delete, `removeSneakPeekPost` |
| `service/media/MediaService.java` | Publish `ProMediaRemovedEvent` |
| `service/vendor/VendorMembership.java` | Remove the sneak peek with the vendor |
| `service/vendor/VendorService.java`, `dto/vendor/VendorMeDto.java` | `sneakPeek` |
| `service/vendor/VendorAccessSweepJob.java` | Publish `VendorAccessEndedEvent` |
| `service/collaboration/CollaborationPortalService.java`, `dto/collaboration/PartnerPageDto.java` | `reach` |
| `service/user/export/MeDataExportService.java`, `dto/user/export/UserDataExportDto.java` | `contentViews` |
| `RES/i18n/messages.properties`, `messages_el.properties` | Notification copy |
| `TEST/security/VendorEndpointParityTest.java` | New endpoints |

---

### Task 1: Schema, entities and repositories

**Files:**
- Create: `RES/db/migration/V186__vendor_reach_and_sneak_peek.sql`
- Create: `MAIN/model/vendor/SneakPeek.java`, `MAIN/model/media/ContentView.java`
- Create: `MAIN/repository/vendor/SneakPeekRepository.java`, `MAIN/repository/media/ContentViewRepository.java`
- Test: `TEST/migration/VendorReachMigrationTest.java`, `TEST/repository/media/ContentViewRepositoryTest.java`

- [ ] **Step 1: Write the migration**

`RES/db/migration/V186__vendor_reach_and_sneak_peek.sql`:

```sql
-- Vendor reach report and sneak peek: see the frontend repo's
-- docs/superpowers/specs/2026-10-29-vendor-reach-and-sneak-peek-design.md and
-- docs/superpowers/plans/2026-10-29-vendor-reach-and-sneak-peek-backend.md.

-- 0. posts.type gains SNEAK_PEEK. V2 declared the CHECK inline, so Postgres named it posts_type_check.
--    PostRequestDto's @Pattern still refuses SNEAK_PEEK on POST /api/posts: only SneakPeekService writes it.
ALTER TABLE posts DROP CONSTRAINT posts_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_type_check
    CHECK (type IN ('TEXT', 'MEDIA', 'ANNOUNCEMENT', 'PLAYLIST', 'SNEAK_PEEK'));

-- 1. One sneak peek per vendor row. The row stays when the post goes (post_id becomes null), so a
--    vendor never posts a second one.
CREATE TABLE sneak_peeks (
    id              UUID PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    event_vendor_id UUID        NOT NULL REFERENCES event_vendors (id) ON DELETE CASCADE,
    post_id         UUID        REFERENCES posts (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at     TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_sneak_peeks_vendor ON sneak_peeks (event_vendor_id);
CREATE INDEX idx_sneak_peeks_event ON sneak_peeks (event_id);
-- ON DELETE SET NULL from posts would otherwise scan all of sneak_peeks.
CREATE INDEX idx_sneak_peeks_post ON sneak_peeks (post_id) WHERE post_id IS NOT NULL;

-- 2. One member saw one Pro item or one vendor post. One row per member and target, forever.
CREATE TABLE content_views (
    id        UUID PRIMARY KEY,
    event_id  UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    member_id UUID        NOT NULL REFERENCES event_members (id) ON DELETE CASCADE,
    media_id  UUID        REFERENCES media (id) ON DELETE CASCADE,
    post_id   UUID        REFERENCES posts (id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_content_views_one_target CHECK ((media_id IS NULL) <> (post_id IS NULL))
);
CREATE UNIQUE INDEX uq_content_views_media ON content_views (member_id, media_id) WHERE media_id IS NOT NULL;
CREATE UNIQUE INDEX uq_content_views_post ON content_views (member_id, post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_content_views_media ON content_views (media_id) WHERE media_id IS NOT NULL;
CREATE INDEX idx_content_views_post ON content_views (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_content_views_event ON content_views (event_id);
```

- [ ] **Step 2: Write the entities**

`MAIN/model/vendor/SneakPeek.java`:

```java
package event_social_media.model.vendor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A vendor row used its one sneak peek (spec 2026-10-29). Plain ids, like {@code VendorListClick}: nothing
 * here is read through a relation. {@code postId} is null once the post is gone; the row stays, so the
 * vendor cannot post another.
 */
@Getter
@Setter
@Entity
@Table(name = "sneak_peeks")
public class SneakPeek {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "event_vendor_id", nullable = false, unique = true)
    private UUID eventVendorId;

    @Column(name = "post_id")
    private UUID postId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    /** When the members were told; null until the after-commit notifier ran. */
    @Column(name = "notified_at")
    private OffsetDateTime notifiedAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
```

`MAIN/model/media/ContentView.java`:

```java
package event_social_media.model.media;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One member saw one Pro item ({@code mediaId}) or one vendor post ({@code postId}); exactly one is set.
 * One row per member and target, ever: the reach report counts people, not opens.
 */
@Getter
@Setter
@Entity
@Table(name = "content_views")
public class ContentView {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "media_id")
    private UUID mediaId;

    @Column(name = "post_id")
    private UUID postId;

    @Column(name = "viewed_at", nullable = false)
    private OffsetDateTime viewedAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (viewedAt == null) {
            viewedAt = OffsetDateTime.now();
        }
    }

    public static ContentView ofMedia(UUID eventId, UUID memberId, UUID mediaId) {
        ContentView view = new ContentView();
        view.setEventId(eventId);
        view.setMemberId(memberId);
        view.setMediaId(mediaId);
        return view;
    }

    public static ContentView ofPost(UUID eventId, UUID memberId, UUID postId) {
        ContentView view = new ContentView();
        view.setEventId(eventId);
        view.setMemberId(memberId);
        view.setPostId(postId);
        return view;
    }
}
```

- [ ] **Step 3: Write the repositories**

`MAIN/repository/vendor/SneakPeekRepository.java`:

```java
package event_social_media.repository.vendor;

import event_social_media.model.vendor.SneakPeek;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SneakPeekRepository extends JpaRepository<SneakPeek, UUID> {

    boolean existsByEventVendorId(UUID eventVendorId);

    Optional<SneakPeek> findByEventVendorId(UUID eventVendorId);

    Optional<SneakPeek> findByPostId(UUID postId);

    /** Live sneak peek posts that show this media item, for {@code SneakPeekCleanup}. */
    @Query("select s.postId from SneakPeek s where s.postId is not null and exists ("
            + "select 1 from PostMedia pm where pm.post.id = s.postId and pm.media.id = :mediaId)")
    List<UUID> findPostIdsShowingMedia(@Param("mediaId") UUID mediaId);
}
```

`MAIN/repository/media/ContentViewRepository.java`:

```java
package event_social_media.repository.media;

import event_social_media.model.media.ContentView;
import event_social_media.model.media.MediaCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ContentViewRepository extends JpaRepository<ContentView, UUID> {

    // ---- Recording --------------------------------------------------------------------------------

    @Query("select v.mediaId from ContentView v where v.memberId = :memberId and v.mediaId in :mediaIds")
    List<UUID> findViewedMediaIds(@Param("memberId") UUID memberId, @Param("mediaIds") Collection<UUID> mediaIds);

    @Query("select v.postId from ContentView v where v.memberId = :memberId and v.postId in :postIds")
    List<UUID> findViewedPostIds(@Param("memberId") UUID memberId, @Param("postIds") Collection<UUID> postIds);

    /**
     * Of these ids, the live Pro items of this event that someone other than {@code memberId} uploaded:
     * the only media a view counts on. Anything else in the request is dropped silently.
     */
    @Query("select m.id from Media m where m.event.id = :eventId and m.id in :ids and m.deletedAt is null "
            + "and m.collection = :pro and m.eventVendor is not null "
            + "and (m.uploaderMember is null or m.uploaderMember.id <> :memberId)")
    List<UUID> findCountableMediaIds(@Param("eventId") UUID eventId, @Param("ids") Collection<UUID> ids,
                                     @Param("memberId") UUID memberId, @Param("pro") MediaCollection pro);

    /** Of these ids, the posts of this event written by an active vendor other than {@code memberId}. */
    @Query("select p.id from Post p where p.event.id = :eventId and p.id in :ids and p.deletedAt is null "
            + "and p.authorMember is not null and p.authorMember.id <> :memberId and exists ("
            + "select 1 from EventVendor v where v.member = p.authorMember and v.removedAt is null)")
    List<UUID> findCountablePostIds(@Param("eventId") UUID eventId, @Param("ids") Collection<UUID> ids,
                                    @Param("memberId") UUID memberId);

    // ---- Reach ------------------------------------------------------------------------------------

    @Query("select count(distinct v.memberId) from ContentView v join Media m on m.id = v.mediaId "
            + "where m.eventVendor.id = :eventVendorId")
    long countProViewers(@Param("eventVendorId") UUID eventVendorId);

    @Query("select count(v) from ContentView v join Media m on m.id = v.mediaId "
            + "where m.eventVendor.id = :eventVendorId")
    long countProViews(@Param("eventVendorId") UUID eventVendorId);

    @Query("select count(distinct v.memberId) from ContentView v join Post p on p.id = v.postId "
            + "where p.authorMember.id = :authorMemberId")
    long countPostViewers(@Param("authorMemberId") UUID authorMemberId);

    @Query("select count(v) from ContentView v join Post p on p.id = v.postId "
            + "where p.authorMember.id = :authorMemberId")
    long countPostViews(@Param("authorMemberId") UUID authorMemberId);
}
```

- [ ] **Step 4: Write the failing repository test**

`TEST/repository/media/ContentViewRepositoryTest.java`:

```java
package event_social_media.repository.media;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.ContentView;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.media.Post;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ContentViewRepositoryTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private ContentViewRepository views;
    @Autowired
    private MediaRepository mediaRepository;

    private Event event;
    private EventMember guest;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        User host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        guest = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
    }

    private Media pro() {
        Media media = fixtures.newMedia(event, 10);
        media.setCollection(MediaCollection.PRO);
        media.setEventVendor(photographer);
        media.setUploaderMember(photographer.getMember());
        return mediaRepository.saveAndFlush(media);
    }

    @Test
    void onlyLiveProItemsOfOthersAreCountable() {
        Media pro = pro();
        Media deleted = pro();
        deleted.setDeletedAt(OffsetDateTime.now());
        Media guestPhoto = fixtures.newMedia(event, 10);

        assertThat(views.findCountableMediaIds(event.getId(), List.of(pro.getId(), deleted.getId(), guestPhoto.getId()),
                guest.getId(), MediaCollection.PRO)).containsExactly(pro.getId());
        // The vendor's own items are not countable for the vendor.
        assertThat(views.findCountableMediaIds(event.getId(), List.of(pro.getId()), photographer.getMember().getId(),
                MediaCollection.PRO)).isEmpty();
    }

    @Test
    void onlyActiveVendorsPostsAreCountable() {
        Post vendorPost = fixtures.newPost(event, photographer.getMember());
        Post guestPost = fixtures.newPost(event, guest);

        assertThat(views.findCountablePostIds(event.getId(), List.of(vendorPost.getId(), guestPost.getId()), guest.getId()))
                .containsExactly(vendorPost.getId());
    }

    @Test
    void reachCountsPeopleAndViews() {
        Media one = pro();
        Media two = pro();
        EventMember other = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        views.saveAndFlush(ContentView.ofMedia(event.getId(), guest.getId(), one.getId()));
        views.saveAndFlush(ContentView.ofMedia(event.getId(), guest.getId(), two.getId()));
        views.saveAndFlush(ContentView.ofMedia(event.getId(), other.getId(), one.getId()));
        Post post = fixtures.newPost(event, photographer.getMember());
        views.saveAndFlush(ContentView.ofPost(event.getId(), guest.getId(), post.getId()));

        assertThat(views.countProViewers(photographer.getId())).isEqualTo(2);
        assertThat(views.countProViews(photographer.getId())).isEqualTo(3);
        assertThat(views.countPostViewers(photographer.getMember().getId())).isEqualTo(1);
        assertThat(views.countPostViews(photographer.getMember().getId())).isEqualTo(1);
    }
}
```

- [ ] **Step 5: Run it**

Run: `./gradlew test --tests "event_social_media.repository.media.ContentViewRepositoryTest"`
Expected: PASS (the H2 schema is built from the entities). If it fails to compile, fix the imports against the names in `TestFixtures` (`event_social_media.support.TestFixtures`).

- [ ] **Step 6: Write the Postgres migration test**

`TEST/migration/VendorReachMigrationTest.java`:

```java
package event_social_media.migration;

import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V186 on a real Postgres: the partial unique indexes and the one-target CHECK. Booting with
 * {@code ddl-auto=validate} is the entity/migration drift check.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class VendorReachMigrationTest extends PostgresTestBase {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void oneSneakPeekPerVendorRow() {
        assertThat(indexDef("uq_sneak_peeks_vendor")).contains("UNIQUE").contains("event_vendor_id");
    }

    @Test
    void oneViewPerMemberAndTarget() {
        assertThat(indexDef("uq_content_views_media")).contains("UNIQUE").contains("media_id IS NOT NULL");
        assertThat(indexDef("uq_content_views_post")).contains("UNIQUE").contains("post_id IS NOT NULL");
    }

    @Test
    void postsAcceptTheSneakPeekType() {
        String check = jdbc.queryForObject(
                "select pg_get_constraintdef(oid) from pg_constraint where conname = 'posts_type_check'", String.class);
        assertThat(check).contains("SNEAK_PEEK").contains("ANNOUNCEMENT");
    }

    @Test
    void aViewHasExactlyOneTarget() {
        String check = jdbc.queryForObject(
                "select pg_get_constraintdef(oid) from pg_constraint where conname = 'chk_content_views_one_target'",
                String.class);
        assertThat(check).contains("media_id IS NULL").contains("post_id IS NULL");
    }

    private String indexDef(String name) {
        return jdbc.queryForObject("select indexdef from pg_indexes where indexname = ?", String.class, name);
    }
}
```

Run: `./gradlew test --tests "event_social_media.migration.VendorReachMigrationTest"` (Docker running)
Expected: PASS. A failure saying a column is missing or of the wrong type is entity/migration drift: make the entity match the SQL. If Flyway fails on `DROP CONSTRAINT posts_type_check` (no such constraint), look the name up with `select conname from pg_constraint where conrelid = 'posts'::regclass and contype = 'c';` against a local database migrated to V185 and use that name in the migration and the test.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V186__vendor_reach_and_sneak_peek.sql \
  src/main/java/event_social_media/model/vendor/SneakPeek.java \
  src/main/java/event_social_media/model/media/ContentView.java \
  src/main/java/event_social_media/repository/vendor/SneakPeekRepository.java \
  src/main/java/event_social_media/repository/media/ContentViewRepository.java \
  src/test/java/event_social_media/migration/VendorReachMigrationTest.java \
  src/test/java/event_social_media/repository/media/ContentViewRepositoryTest.java
git commit -m "feat(vendors): sneak_peeks and content_views tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Error codes, capability, notification types, CTA target, audit keys

**Files:**
- Modify: `MAIN/exception/ErrorCode.java`, `MAIN/service/vendor/VendorCapability.java`, `MAIN/model/user/NotificationType.java`, `MAIN/model/user/NotificationCtaTarget.java`, `MAIN/service/vendor/VendorAuditWriter.java`
- Test: `TEST/service/vendor/VendorCapabilityTest.java` (create), `TEST/model/user/NotificationCtaTargetTest.java` (create)

- [ ] **Step 1: Write the failing tests**

`TEST/service/vendor/VendorCapabilityTest.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VendorCapabilityTest {

    @Test
    void sneakPeekIsForPhotographersAndVideographers() {
        assertThat(VendorCapability.SNEAK_PEEK.types())
                .containsExactlyInAnyOrder(PartnerRole.PHOTOGRAPHER, PartnerRole.VIDEOGRAPHER);
        assertThat(VendorCapability.of(PartnerRole.PLANNER)).doesNotContain(VendorCapability.SNEAK_PEEK);
    }
}
```

`TEST/model/user/NotificationCtaTargetTest.java`:

```java
package event_social_media.model.user;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationCtaTargetTest {

    @Test
    void eventPostOpensThePostOnTheFeed() {
        assertThat(NotificationCtaTarget.EVENT_POST.buildPath(Map.of("eventId", "e1", "postId", "p1")))
                .isEqualTo("/events/e1/feed?post=p1");
    }
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorCapabilityTest" --tests "event_social_media.model.user.NotificationCtaTargetTest"`
Expected: compilation FAIL (`SNEAK_PEEK`, `EVENT_POST` not defined).

- [ ] **Step 3: Add the codes and enum values**

`MAIN/exception/ErrorCode.java`, after `QR_CARD_ARTWORK_SIZE_INVALID(3111),`:

```java

    /** 3112 — A sneak peek item isn't one of the caller's own live, ready Pro items, or there are more than 20. {@code 400}. */
    SNEAK_PEEK_MEDIA_INVALID(3112),
```

After `PUSH_NOT_ENABLED(5186),` (keep the javadoc format of its neighbours):

```java

    /** 5187 — The sneak peek opens when the event starts. {@code 409}. */
    SNEAK_PEEK_NOT_OPEN(5187),

    /** 5188 — This vendor already posted their sneak peek for the event; deleting it does not give it back. {@code 409}. */
    SNEAK_PEEK_USED(5188),
```

If the enum's last constant ends with `;` rather than `,`, keep the `;` on the new last constant.

`MAIN/service/vendor/VendorCapability.java`: change the javadoc's first line to also cite the new spec, and add the constant after `PRINT_PICKS`:

```java
/** A vendor tool and the types that get it (spec 2026-10-19, "Vendor types and tools"; PRINT_PICKS: spec 2026-10-23; SNEAK_PEEK: spec 2026-10-29). Fixed presets. */
public enum VendorCapability {
    PRO_ALBUM(EnumSet.of(PHOTOGRAPHER, VIDEOGRAPHER)),
    SCHEDULE_EDIT(EnumSet.of(PLANNER)),
    ANNOUNCE(EnumSet.of(PLANNER)),
    RSVP_REPORT(EnumSet.of(PLANNER)),
    QR_READ(EnumSet.of(PLANNER)),
    SONG_REQUESTS(EnumSet.of(MUSIC)),
    PRINT_PICKS(EnumSet.of(PHOTOGRAPHER)),
    SNEAK_PEEK(EnumSet.of(PHOTOGRAPHER, VIDEOGRAPHER));
```

`MAIN/model/user/NotificationType.java`, after `PRINT_LIST_SENT`:

```java
    PRINT_LIST_SENT,

    /** A photographer or videographer posted their sneak peek. Sent to every member with an account but them. */
    SNEAK_PEEK_POSTED,

    /** A vendor's access ended: the reach they got in the event. Sent once to that vendor. */
    VENDOR_REACH_SUMMARY
}
```

`MAIN/model/user/NotificationCtaTarget.java`, after `EVENT_VENDOR_PAGE(...)` (change its `;` to `,`):

```java
    EVENT_VENDOR_PAGE("/events/{eventId}/tools/vendors/me"),

    /** One post, opened over the event's feed (added 2026-10-29, for the sneak peek). */
    EVENT_POST("/events/{eventId}/feed?post={postId}");
```

`MAIN/service/vendor/VendorAuditWriter.java`:

```java
    static final Set<String> ALLOWED_KEYS = Set.of(
            "vendorType", "source", "fieldNames", "postId", "bytes", "reportType", "rowCount",
            "collaboratorId", "suggestionId", "hiddenByHost", "optedOut", "itemCount", "part",
            "deletedBy", "memberCount", "partner");
```

- [ ] **Step 4: Check every switch over these enums still compiles**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL. If a `switch` over `NotificationType` or `NotificationCtaTarget` without a `default` fails (for example in `NotificationEmailRenderer` or an icon mapper), add the new constants to the branch their nearest neighbour uses (`PRINT_LIST_SENT` / `EVENT_VENDOR_PAGE`).

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorCapabilityTest" --tests "event_social_media.model.user.NotificationCtaTargetTest" --tests "event_social_media.service.vendor.VendorAuditWriterTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/main/java/event_social_media/exception/ErrorCode.java \
  src/main/java/event_social_media/service/vendor/VendorCapability.java \
  src/main/java/event_social_media/model/user/NotificationType.java \
  src/main/java/event_social_media/model/user/NotificationCtaTarget.java \
  src/main/java/event_social_media/service/vendor/VendorAuditWriter.java \
  src/test/java/event_social_media/service/vendor/VendorCapabilityTest.java \
  src/test/java/event_social_media/model/user/NotificationCtaTargetTest.java
git commit -m "feat(vendors): sneak peek capability, error codes, notification types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Create a sneak peek

**Files:**
- Create: `MAIN/dto/vendor/SneakPeekRequestDto.java`, `MAIN/service/vendor/SneakPeekService.java`, `MAIN/service/vendor/SneakPeekAudit.java`, `MAIN/service/vendor/SneakPeekPostedEvent.java`, `MAIN/controller/vendor/SneakPeekController.java`
- Modify: `MAIN/service/media/PostService.java` (constant only, `SNEAK_PEEK_TYPE`)
- Test: `TEST/controller/vendor/SneakPeekControllerTest.java`

- [ ] **Step 1: Write the failing controller test**

`TEST/controller/vendor/SneakPeekControllerTest.java`:

```java
package event_social_media.controller.vendor;

import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.media.MediaStatus;
import event_social_media.model.media.Post;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.media.PostMediaRepository;
import event_social_media.repository.media.PostRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.service.vendor.SneakPeekPostedListener;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SneakPeekControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private PostMediaRepository postMediaRepository;
    @Autowired
    private SneakPeekRepository sneakPeekRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    /** The notifier has its own test; here it must not run (it is async and after commit anyway). */
    @MockBean
    private SneakPeekPostedListener postedListener;

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
        started();
    }

    /** The event started two hours ago and runs for four more: the sneak peek is open. */
    private void started() {
        event.setStartAt(OffsetDateTime.now().minusHours(2));
        event.setEndAt(OffsetDateTime.now().plusHours(4));
        eventRepository.saveAndFlush(event);
    }

    private Media proItemBy(EventVendor vendor) {
        Media pro = fixtures.newMedia(event, 10);
        pro.setCollection(MediaCollection.PRO);
        pro.setEventVendor(vendor);
        pro.setUploaderMember(vendor.getMember());
        return mediaRepository.saveAndFlush(pro);
    }

    private ResultActions create(User caller, List<UUID> mediaIds, String content) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("mediaIds", mediaIds);
        if (content != null) {
            body.put("content", content);
        }
        return mockMvc.perform(as(caller, post("/api/events/{e}/vendors/me/sneak-peek", event.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))));
    }

    @Test
    void aPhotographerPostsAPinnedSneakPeekOfTheirProItems() throws Exception {
        Media one = proItemBy(photographer);
        Media two = proItemBy(photographer);

        create(photographer.getUser(), List.of(two.getId(), one.getId()), "First look!")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("SNEAK_PEEK"))
                .andExpect(jsonPath("$.isPinned").value(true))
                .andExpect(jsonPath("$.content").value("First look!"))
                .andExpect(jsonPath("$.media[0].id").value(two.getId().toString()))
                .andExpect(jsonPath("$.media[1].id").value(one.getId().toString()));

        Post post = postRepository.findByEvent_Id(event.getId()).get(0);
        assertThat(post.getAuthorMember().getId()).isEqualTo(photographer.getMember().getId());
        assertThat(sneakPeekRepository.findByEventVendorId(photographer.getId()))
                .hasValueSatisfying(row -> assertThat(row.getPostId()).isEqualTo(post.getId()));
        assertThat(auditLogRepository.findAll()).anySatisfy(row -> assertThat(row.getAction()).isEqualTo("SNEAK_PEEK_CREATE"));
    }

    @Test
    void aVideographerCanPostOneToo() throws Exception {
        EventVendor videographer = support.vendor(event, PartnerRole.VIDEOGRAPHER);
        create(videographer.getUser(), List.of(proItemBy(videographer).getId()), null).andExpect(status().isCreated());
    }

    @Test
    void otherTypesHostsAndGuestsAreRefused() throws Exception {
        Media item = proItemBy(photographer);
        User planner = support.vendor(event, PartnerRole.PLANNER).getUser();
        for (User refused : new User[]{planner, host, guest}) {
            create(refused, List.of(item.getId()), null)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value(ErrorCode.VENDOR_CAPABILITY_MISSING.getCode()));
        }
    }

    @Test
    void itOpensWhenTheEventStarts() throws Exception {
        event.setStartAt(OffsetDateTime.now().plusHours(1));
        event.setEndAt(OffsetDateTime.now().plusHours(6));
        eventRepository.saveAndFlush(event);

        create(photographer.getUser(), List.of(proItemBy(photographer).getId()), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.SNEAK_PEEK_NOT_OPEN.getCode()));
    }

    @Test
    void itClosesWhenAccessEnds() throws Exception {
        Media item = proItemBy(photographer);
        support.endedDaysAgo(event, 31);

        create(photographer.getUser(), List.of(item.getId()), null)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.VENDOR_ACCESS_ENDED.getCode()));
    }

    @Test
    void oneSneakPeekPerVendorEvenAfterADelete() throws Exception {
        Media item = proItemBy(photographer);
        create(photographer.getUser(), List.of(item.getId()), null).andExpect(status().isCreated());
        create(photographer.getUser(), List.of(item.getId()), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.SNEAK_PEEK_USED.getCode()));

        sneakPeekRepository.findByEventVendorId(photographer.getId()).ifPresent(row -> {
            postRepository.deleteById(row.getPostId());
            row.setPostId(null);
            sneakPeekRepository.saveAndFlush(row);
        });
        create(photographer.getUser(), List.of(item.getId()), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.SNEAK_PEEK_USED.getCode()));
    }

    @Test
    void onlyTheCallersOwnLiveReadyProItems() throws Exception {
        EventVendor otherPhotographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        Media someoneElses = proItemBy(otherPhotographer);
        Media guestPhoto = fixtures.newMedia(event, 10);
        Media deleted = proItemBy(photographer);
        deleted.setDeletedAt(OffsetDateTime.now());
        Media processing = proItemBy(photographer);
        processing.setStatus(MediaStatus.PROCESSING);
        mediaRepository.saveAllAndFlush(List.of(deleted, processing));

        for (Media invalid : List.of(someoneElses, guestPhoto, deleted, processing)) {
            create(photographer.getUser(), List.of(invalid.getId()), null)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value(ErrorCode.SNEAK_PEEK_MEDIA_INVALID.getCode()));
        }
        create(photographer.getUser(), List.of(UUID.randomUUID()), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.SNEAK_PEEK_MEDIA_INVALID.getCode()));
        assertThat(sneakPeekRepository.existsByEventVendorId(photographer.getId())).isFalse();
    }

    @Test
    void oneToTwentyItemsWithoutDuplicates() throws Exception {
        List<UUID> twentyOne = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            twentyOne.add(proItemBy(photographer).getId());
        }
        create(photographer.getUser(), twentyOne, null).andExpect(status().isBadRequest());
        create(photographer.getUser(), List.of(), null).andExpect(status().isBadRequest());
        UUID one = twentyOne.get(0);
        create(photographer.getUser(), List.of(one, one), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.DUPLICATE_MEDIA_ID_IN_REQUEST.getCode()));

        create(photographer.getUser(), twentyOne.subList(0, 20), null).andExpect(status().isCreated());
        Post post = postRepository.findByEvent_Id(event.getId()).get(0);
        assertThat(postMediaRepository.countByPost_Id(post.getId())).isEqualTo(20);
    }

    @Test
    void theCaptionKeepsThePostLimit() throws Exception {
        create(photographer.getUser(), List.of(proItemBy(photographer).getId()), "x".repeat(501))
                .andExpect(status().isBadRequest());
    }
}
```

`MediaStatus.PROCESSING`: use whichever non-`READY` constant `MediaStatus` has (check the enum); the point is "not ready". `AuditLogRepository` and the audit row's `getAction()`: use the names `ProAlbumControllerTest` already imports for its PRO_MEDIA_DELETE assertion.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.SneakPeekControllerTest"`
Expected: compilation FAIL (`SneakPeekPostedListener` and the endpoint don't exist).

- [ ] **Step 3: Write the request DTO and the event**

`MAIN/dto/vendor/SneakPeekRequestDto.java`:

```java
package event_social_media.dto.vendor;

import event_social_media.constants.TextLimits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** {@code POST …/vendors/me/sneak-peek}: 1–20 of the caller's own Pro items, in display order, and an optional caption. */
public record SneakPeekRequestDto(
        @NotNull @Size(min = 1, max = SneakPeekRequestDto.MAX_ITEMS) List<@NotNull UUID> mediaIds,
        @Size(max = TextLimits.POST_CONTENT_MAX) String content) {

    public static final int MAX_ITEMS = 20;
}
```

`MAIN/service/vendor/SneakPeekPostedEvent.java`:

```java
package event_social_media.service.vendor;

import java.util.UUID;

/** A sneak peek was posted; {@link SneakPeekPostedListener} tells the members once it commits. */
public record SneakPeekPostedEvent(UUID sneakPeekId) {
}
```

- [ ] **Step 4: Write the listener as a stub the test can mock**

`MAIN/service/vendor/SneakPeekPostedListener.java` (Task 6 fills in the notifier call):

```java
package event_social_media.service.vendor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** After the post commits, tells the members. A failure is logged: the post stands either way. */
@Slf4j
@Component
@RequiredArgsConstructor
public class SneakPeekPostedListener {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPosted(SneakPeekPostedEvent event) {
        log.debug("Sneak peek {} posted", event.sneakPeekId());
    }
}
```

- [ ] **Step 5: Write `SneakPeekAudit`**

`MAIN/service/vendor/SneakPeekAudit.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The sneak peek's audit rows. Its own component so {@code PostService} can audit a delete through the
 * post endpoints without depending on {@link SneakPeekService} (which depends on it).
 */
@Component
@RequiredArgsConstructor
public class SneakPeekAudit {

    /** Who removed it: the host, the vendor, the vendor's removal, or the last item going. */
    public enum DeletedBy { HOST, VENDOR, REMOVED, EMPTY }

    private final VendorAuditWriter auditWriter;

    public void created(Event event, EventMember actor, UUID postId, int itemCount) {
        auditWriter.write(event, actor, "SNEAK_PEEK_CREATE", "Post", postId,
                Map.of("postId", postId.toString(), "itemCount", itemCount));
    }

    public void updated(Event event, EventMember actor, UUID postId, Integer itemCount) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("postId", postId.toString());
        if (itemCount != null) {
            changes.put("itemCount", itemCount);
        }
        auditWriter.write(event, actor, "SNEAK_PEEK_UPDATE", "Post", postId, changes);
    }

    public void deleted(Event event, EventMember actor, UUID postId, DeletedBy deletedBy) {
        auditWriter.write(event, actor, "SNEAK_PEEK_DELETE", "Post", postId,
                Map.of("postId", postId.toString(), "deletedBy", deletedBy.name()));
    }

    public void notified(Event event, UUID postId, int memberCount) {
        auditWriter.write(event, null, "SNEAK_PEEK_NOTIFIED", "Post", postId,
                Map.of("postId", postId.toString(), "memberCount", memberCount));
    }
}
```

- [ ] **Step 6: Write `SneakPeekService.create`**

In `MAIN/service/media/PostService.java`, next to `ANNOUNCEMENT_TYPE`:

```java
    /** The {@code posts.type} of a vendor's sneak peek: made only through {@code SneakPeekService}. */
    public static final String SNEAK_PEEK_TYPE = "SNEAK_PEEK";
```

`MAIN/service/vendor/SneakPeekService.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.media.PostResponseDto;
import event_social_media.dto.vendor.SneakPeekRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.Event;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.media.MediaStatus;
import event_social_media.model.media.Post;
import event_social_media.model.media.PostMedia;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.SneakPeek;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.media.PostMediaRepository;
import event_social_media.repository.media.PostRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.media.EventContentVersionService;
import event_social_media.service.media.FeedChangedEvent;
import event_social_media.service.media.PostService;
import event_social_media.service.platform.ModuleAvailabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * A photographer's or videographer's one sneak peek per event (spec 2026-10-29): a pinned post of 1–20 of
 * their own Pro items, open from the event's start until their access ends, never approved by the host
 * (who can unpin or delete it like any post).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SneakPeekService {

    private final EventAuthorizationService eventAuthorizationService;
    private final ModuleAvailabilityService moduleAvailabilityService;
    private final EventRepository eventRepository;
    private final MediaRepository mediaRepository;
    private final PostRepository postRepository;
    private final PostMediaRepository postMediaRepository;
    private final SneakPeekRepository sneakPeekRepository;
    private final PostService postService;
    private final SneakPeekAudit audit;
    private final EventContentVersionService eventContentVersionService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public PostResponseDto create(UUID eventId, SneakPeekRequestDto dto, UUID callerUserId) {
        EventVendor vendor = eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.SNEAK_PEEK);
        moduleAvailabilityService.requireAvailable(eventId, ModuleKey.POSTS);
        // The event row lock: two taps of "Share" can't both pass the "used" check below.
        Event event = eventRepository.lockById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        if (OffsetDateTime.now().isBefore(event.getStartAt())) {
            throw new ConflictException(ErrorCode.SNEAK_PEEK_NOT_OPEN, "The sneak peek opens when the event starts.");
        }
        if (sneakPeekRepository.existsByEventVendorId(vendor.getId())) {
            throw new ConflictException(ErrorCode.SNEAK_PEEK_USED, "You already shared your sneak peek for this event.");
        }
        List<Media> items = requireOwnReadyPro(eventId, vendor, dto.mediaIds());

        Post post = new Post();
        post.setEvent(event);
        post.setAuthorMember(vendor.getMember());
        post.setType(PostService.SNEAK_PEEK_TYPE);
        post.setContent(blankToNull(dto.content()));
        post.setIsPinned(true);
        Post saved = postRepository.save(post);
        attach(saved, items);

        SneakPeek row = new SneakPeek();
        row.setEventId(eventId);
        row.setEventVendorId(vendor.getId());
        row.setPostId(saved.getId());
        sneakPeekRepository.save(row);
        audit.created(event, vendor.getMember(), saved.getId(), items.size());

        PostResponseDto response = postService.findById(saved.getId(), callerUserId);
        // Last, as in PostService.create: the version row is locked from here to the commit only.
        eventContentVersionService.bump(eventId);
        eventPublisher.publishEvent(new FeedChangedEvent(eventId));
        eventPublisher.publishEvent(new SneakPeekPostedEvent(row.getId()));
        log.info("Vendor {} posted sneak peek {} in event {} with {} item(s)", vendor.getId(), saved.getId(), eventId,
                items.size());
        return response;
    }

    /**
     * The items in request order. Each must be one of this vendor's live, ready Pro items in this event;
     * anything else (another vendor's item, a guest photo, a deleted or processing item, an unknown id) is
     * {@link ErrorCode#SNEAK_PEEK_MEDIA_INVALID}, without saying which.
     */
    List<Media> requireOwnReadyPro(UUID eventId, EventVendor vendor, List<UUID> mediaIds) {
        if (new LinkedHashSet<>(mediaIds).size() != mediaIds.size()) {
            throw new BadRequestException(ErrorCode.DUPLICATE_MEDIA_ID_IN_REQUEST,
                    "mediaIds contains one or more duplicate values");
        }
        Map<UUID, Media> found = mediaRepository.findByEvent_IdAndIdInAndDeletedAtIsNull(eventId, mediaIds).stream()
                .collect(Collectors.toMap(Media::getId, Function.identity()));
        List<Media> ordered = new ArrayList<>(mediaIds.size());
        for (UUID id : mediaIds) {
            Media media = found.get(id);
            boolean own = media != null && media.getCollection() == MediaCollection.PRO
                    && media.getStatus() == MediaStatus.READY
                    && media.getEventVendor() != null && media.getEventVendor().getId().equals(vendor.getId());
            if (!own) {
                throw new BadRequestException(ErrorCode.SNEAK_PEEK_MEDIA_INVALID,
                        "Pick from your own Pro photos and videos.");
            }
            ordered.add(media);
        }
        return ordered;
    }

    void attach(Post post, List<Media> items) {
        List<PostMedia> rows = new ArrayList<>(items.size());
        for (int i = 0; i < items.size(); i++) {
            PostMedia row = new PostMedia();
            row.setPost(post);
            row.setMedia(items.get(i));
            row.setDisplayOrder(i);
            rows.add(row);
        }
        postMediaRepository.saveAll(rows);
    }

    static String blankToNull(String content) {
        return content == null || content.isBlank() ? null : content.strip();
    }
}
```

If `FeedChangedEvent` or `EventContentVersionService` live in another package than `service.media`, use the imports `PostService` has for them. `postService.findById` already returns the assembled DTO with `media[]` and `proCredit`.

- [ ] **Step 7: Write the controller**

`MAIN/controller/vendor/SneakPeekController.java`:

```java
package event_social_media.controller.vendor;

import event_social_media.dto.media.PostResponseDto;
import event_social_media.dto.vendor.SneakPeekRequestDto;
import event_social_media.service.vendor.SneakPeekService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** A photographer's or videographer's sneak peek (spec 2026-10-29). */
@RestController
@RequestMapping("/api/events/{eventId}/vendors/me/sneak-peek")
@RequiredArgsConstructor
public class SneakPeekController {

    private final SneakPeekService sneakPeekService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponseDto create(@PathVariable UUID eventId, @Valid @RequestBody SneakPeekRequestDto dto,
                                  Authentication authentication) {
        return sneakPeekService.create(eventId, dto, callerId(authentication));
    }

    private static UUID callerId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
```

- [ ] **Step 8: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.SneakPeekControllerTest"`
Expected: PASS. If `itClosesWhenAccessEnds` gets `SNEAK_PEEK_NOT_OPEN` instead, `requireVendor` ran after the start check: keep `requireVendor` first.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/event_social_media/dto/vendor/SneakPeekRequestDto.java \
  src/main/java/event_social_media/service/vendor/SneakPeek*.java \
  src/main/java/event_social_media/controller/vendor/SneakPeekController.java \
  src/main/java/event_social_media/service/media/PostService.java \
  src/test/java/event_social_media/controller/vendor/SneakPeekControllerTest.java
git commit -m "feat(vendors): post a sneak peek of Pro items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Edit and delete a sneak peek, and `VendorMeDto.sneakPeek`

**Files:**
- Create: `MAIN/dto/vendor/SneakPeekPatchDto.java`, `MAIN/dto/vendor/SneakPeekSummaryDto.java`
- Modify: `MAIN/service/vendor/SneakPeekService.java`, `MAIN/controller/vendor/SneakPeekController.java`, `MAIN/service/media/PostService.java`, `MAIN/dto/vendor/VendorMeDto.java`, `MAIN/service/vendor/VendorService.java`
- Test: `TEST/controller/vendor/SneakPeekControllerTest.java`, `TEST/controller/vendor/VendorControllerTest.java`

- [ ] **Step 1: Add the failing tests**

Append to `SneakPeekControllerTest` (add imports `patch`, `delete` from `MockMvcRequestBuilders`, and `get`):

```java
    private UUID postedWith(Media... items) throws Exception {
        create(photographer.getUser(), java.util.Arrays.stream(items).map(Media::getId).toList(), "Hi")
                .andExpect(status().isCreated());
        return sneakPeekRepository.findByEventVendorId(photographer.getId()).orElseThrow().getPostId();
    }

    private ResultActions patchSneakPeek(User caller, String json) throws Exception {
        return mockMvc.perform(as(caller, patch("/api/events/{e}/vendors/me/sneak-peek", event.getId())
                .contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    @Test
    void theVendorChangesItemsAndCaption() throws Exception {
        Media one = proItemBy(photographer);
        Media two = proItemBy(photographer);
        UUID postId = postedWith(one);

        patchSneakPeek(photographer.getUser(), "{\"mediaIds\":[\"" + two.getId() + "\",\"" + one.getId() + "\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(postId.toString()))
                .andExpect(jsonPath("$.content").value("Hi"))
                .andExpect(jsonPath("$.media.length()").value(2))
                .andExpect(jsonPath("$.media[0].id").value(two.getId().toString()));
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(jsonPath("$.sneakPeek.postId").value(postId.toString()))
                .andExpect(jsonPath("$.sneakPeek.content").value("Hi"))
                .andExpect(jsonPath("$.sneakPeek.mediaIds[0]").value(two.getId().toString()))
                .andExpect(jsonPath("$.sneakPeek.used").value(true));
        patchSneakPeek(photographer.getUser(), "{\"content\":\"  \"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").doesNotExist());
        assertThat(auditLogRepository.findAll()).anySatisfy(row -> assertThat(row.getAction()).isEqualTo("SNEAK_PEEK_UPDATE"));
    }

    @Test
    void editingNeedsASneakPeekAndValidItems() throws Exception {
        patchSneakPeek(photographer.getUser(), "{\"content\":\"x\"}").andExpect(status().isNotFound());
        postedWith(proItemBy(photographer));
        patchSneakPeek(photographer.getUser(), "{\"mediaIds\":[\"" + fixtures.newMedia(event, 10).getId() + "\"]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.SNEAK_PEEK_MEDIA_INVALID.getCode()));
        patchSneakPeek(photographer.getUser(), "{\"mediaIds\":[]}").andExpect(status().isBadRequest());
    }

    @Test
    void theVendorDeletesItAndTheProItemsStay() throws Exception {
        Media item = proItemBy(photographer);
        UUID postId = postedWith(item);

        mockMvc.perform(as(photographer.getUser(), delete("/api/events/{e}/vendors/me/sneak-peek", event.getId())))
                .andExpect(status().isNoContent());

        assertThat(postRepository.findById(postId)).isEmpty();
        assertThat(mediaRepository.findById(item.getId())).hasValueSatisfying(m -> assertThat(m.getDeletedAt()).isNull());
        assertThat(sneakPeekRepository.findByEventVendorId(photographer.getId()))
                .hasValueSatisfying(row -> assertThat(row.getPostId()).isNull());
    }

    @Test
    void theHostRemovesItThroughThePostEndpoints() throws Exception {
        Media item = proItemBy(photographer);
        UUID postId = postedWith(item);

        mockMvc.perform(as(host, patch("/api/posts/{id}", postId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isPinned\":false}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPinned").value(false));
        mockMvc.perform(as(host, delete("/api/posts/{id}", postId))).andExpect(status().isNoContent());

        assertThat(mediaRepository.findById(item.getId())).hasValueSatisfying(m -> assertThat(m.getDeletedAt()).isNull());
        assertThat(sneakPeekRepository.findByEventVendorId(photographer.getId()))
                .hasValueSatisfying(row -> assertThat(row.getPostId()).isNull());
        assertThat(auditLogRepository.findAll()).anySatisfy(row -> {
            assertThat(row.getAction()).isEqualTo("SNEAK_PEEK_DELETE");
            assertThat(row.getChanges()).containsEntry("deletedBy", "HOST");
        });
    }

    @Test
    void theNormalPostCreateRefusesTheType() throws Exception {
        mockMvc.perform(as(photographer.getUser(), post("/api/posts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + event.getId() + "\",\"type\":\"SNEAK_PEEK\",\"content\":\"x\","
                                + "\"isPinned\":false}")))
                .andExpect(status().isBadRequest());
    }
```

If `PostController`'s routes are not `/api/posts` and `/api/posts/{id}`, use the routes `PostControllerTest` calls. Use the audit row's change map getter that `ProAlbumControllerTest` reads (`getChanges()` above).

Append to `TEST/controller/vendor/VendorControllerTest.java` (reuse its fixtures; give the event a past start the way `SneakPeekControllerTest.started()` does):

```java
    @Test
    void vendorsMeShowsTheSneakPeekToPhotographersOnly() throws Exception {
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);

        mockMvc.perform(as(photographer.getUser(), get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sneakPeek.used").value(false))
                .andExpect(jsonPath("$.sneakPeek.postId").doesNotExist())
                .andExpect(jsonPath("$.sneakPeek.content").doesNotExist())
                .andExpect(jsonPath("$.sneakPeek.mediaIds.length()").value(0));
        mockMvc.perform(as(planner.getUser(), get("/api/events/{e}/vendors/me", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sneakPeek").doesNotExist());
    }
```

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.SneakPeekControllerTest" --tests "event_social_media.controller.vendor.VendorControllerTest"`
Expected: FAIL (no PATCH/DELETE, no `sneakPeek`). `theNormalPostCreateRefusesTheType` already passes through `PostRequestDto`'s `@Pattern`; it is there so nobody widens the pattern later.

- [ ] **Step 3: Write the DTOs**

`MAIN/dto/vendor/SneakPeekPatchDto.java`:

```java
package event_social_media.dto.vendor;

import event_social_media.constants.TextLimits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** {@code PATCH …/vendors/me/sneak-peek}: a null field is unchanged. A blank caption clears it. No new notification. */
public record SneakPeekPatchDto(
        @Size(min = 1, max = SneakPeekRequestDto.MAX_ITEMS) List<@NotNull UUID> mediaIds,
        @Size(max = TextLimits.POST_CONTENT_MAX) String content) {
}
```

`MAIN/dto/vendor/SneakPeekSummaryDto.java`:

```java
package event_social_media.dto.vendor;

import java.util.List;
import java.util.UUID;

/**
 * {@code VendorMeDto.sneakPeek}, for types with the sneak peek. {@code content} is the caption, so the vendor
 * page can open the edit sheet without reading the post. {@code used} stays true after the post is deleted
 * ({@code postId} and {@code content} null, {@code mediaIds} empty): a vendor gets one per event.
 */
public record SneakPeekSummaryDto(UUID postId, List<UUID> mediaIds, String content, boolean used) {
}
```

- [ ] **Step 4: Add `update`, `delete` and `summary` to `SneakPeekService`**

Add the imports `event_social_media.dto.vendor.SneakPeekPatchDto`, `event_social_media.dto.vendor.SneakPeekSummaryDto`, `event_social_media.model.event.EventMember`, then:

```java
    @Transactional
    public PostResponseDto update(UUID eventId, SneakPeekPatchDto dto, UUID callerUserId) {
        EventVendor vendor = eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.SNEAK_PEEK);
        moduleAvailabilityService.requireAvailable(eventId, ModuleKey.POSTS);
        Event event = eventRepository.lockById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        Post post = livePost(vendor);
        Integer itemCount = null;
        if (dto.mediaIds() != null) {
            List<Media> items = requireOwnReadyPro(eventId, vendor, dto.mediaIds());
            postMediaRepository.deleteAll(postMediaRepository.findByPost_Id(post.getId()));
            // The old rows go before the new ones go in: (post_id, media_id) is unique.
            postMediaRepository.flush();
            attach(post, items);
            itemCount = items.size();
        }
        if (dto.content() != null) {
            post.setContent(blankToNull(dto.content()));
            postRepository.save(post);
        }
        audit.updated(event, vendor.getMember(), post.getId(), itemCount);
        PostResponseDto response = postService.findById(post.getId(), callerUserId);
        eventContentVersionService.bump(eventId);
        eventPublisher.publishEvent(new FeedChangedEvent(eventId));
        return response;
    }

    @Transactional
    public void delete(UUID eventId, UUID callerUserId) {
        EventVendor vendor = eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.SNEAK_PEEK);
        Event event = eventRepository.lockById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        Post post = livePost(vendor);
        postService.removeSneakPeekPost(post.getId());
        audit.deleted(event, vendor.getMember(), post.getId(), SneakPeekAudit.DeletedBy.VENDOR);
    }

    /** For {@code VendorMeDto}: null for a type without the sneak peek. */
    @Transactional(readOnly = true)
    public SneakPeekSummaryDto summary(EventVendor vendor) {
        if (!VendorCapability.SNEAK_PEEK.types().contains(vendor.getVendorType())) {
            return null;
        }
        return sneakPeekRepository.findByEventVendorId(vendor.getId())
                .map(row -> row.getPostId() == null
                        ? new SneakPeekSummaryDto(null, List.of(), null, true)
                        : new SneakPeekSummaryDto(row.getPostId(),
                                postMediaRepository.findByPostIdsWithMedia(List.of(row.getPostId())).stream()
                                        .map(pm -> pm.getMedia().getId()).toList(),
                                postRepository.findById(row.getPostId()).map(Post::getContent).orElse(null),
                                true))
                .orElse(new SneakPeekSummaryDto(null, List.of(), null, false));
    }

    private Post livePost(EventVendor vendor) {
        return sneakPeekRepository.findByEventVendorId(vendor.getId())
                .filter(row -> row.getPostId() != null)
                .flatMap(row -> postRepository.findById(row.getPostId()))
                .orElseThrow(() -> new ResourceNotFoundException("You have no sneak peek in this event."));
    }
```

If `ResourceNotFoundException` has no single-`String` constructor, use the `("Post", id)` form with the vendor id.

- [ ] **Step 5: Add the controller endpoints**

In `SneakPeekController` add imports (`PatchMapping`, `DeleteMapping`, `SneakPeekPatchDto`) and:

```java
    @PatchMapping
    @PreAuthorize("hasRole('USER')")
    public PostResponseDto update(@PathVariable UUID eventId, @Valid @RequestBody SneakPeekPatchDto dto,
                                  Authentication authentication) {
        return sneakPeekService.update(eventId, dto, callerId(authentication));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID eventId, Authentication authentication) {
        sneakPeekService.delete(eventId, callerId(authentication));
    }
```

- [ ] **Step 6: Change `PostService`**

Add fields (Lombok constructor picks them up):

```java
    private final SneakPeekRepository sneakPeekRepository;
    private final SneakPeekAudit sneakPeekAudit;
```

with imports `event_social_media.repository.vendor.SneakPeekRepository`, `event_social_media.service.vendor.SneakPeekAudit`.

`create` does not change (decision 6). Replace `delete` with:

```java
    @Transactional
    public void delete(UUID id, UUID callerUserId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post", id));
        requireAuthorOrHost(post, callerUserId);
        refuseSuspendedForAuthor(post, callerUserId);
        Optional<EventVendor> vendor = requireAnnouncementRights(post, callerUserId);
        boolean sneakPeek = SNEAK_PEEK_TYPE.equals(post.getType());
        remove(post);
        vendor.ifPresent(v -> vendorAuditWriter.write(post.getEvent(), v.getMember(), "ANNOUNCEMENT_DELETE",
                "Post", id, Map.of("postId", id.toString())));
        if (sneakPeek) {
            EventMember actor = eventMemberRepository.findByEvent_IdAndUser_Id(post.getEvent().getId(), callerUserId)
                    .orElse(null);
            boolean byAuthor = post.getAuthorMember() != null && actor != null
                    && post.getAuthorMember().getId().equals(actor.getId());
            sneakPeekAudit.deleted(post.getEvent(), actor, id,
                    byAuthor ? SneakPeekAudit.DeletedBy.VENDOR : SneakPeekAudit.DeletedBy.HOST);
        }
    }

    /**
     * Removes a sneak peek's post for {@code SneakPeekService} and {@code SneakPeekCleanup}, which have
     * done their own checks. Its Pro items stay: they were not uploaded with the post.
     */
    @Transactional
    public void removeSneakPeekPost(UUID postId) {
        postRepository.findById(postId).ifPresent(this::remove);
    }
```

In the private `remove(Post post)`, first lines (before `deleteById`), so the in-memory row and the H2 schema agree with Postgres' `ON DELETE SET NULL`:

```java
        if (SNEAK_PEEK_TYPE.equals(post.getType())) {
            sneakPeekRepository.findByPostId(post.getId()).ifPresent(row -> {
                row.setPostId(null);
                sneakPeekRepository.save(row);
            });
        }
```

`removeAsModerator` goes through `remove` too, so a moderated sneak peek also frees its row's post id (and the row still counts as used).

- [ ] **Step 7: Add `sneakPeek` to `VendorMeDto`**

`MAIN/dto/vendor/VendorMeDto.java`: append `SneakPeekSummaryDto sneakPeek` as the last component and add to the javadoc: "{@code sneakPeek} is null for types without the sneak peek (spec 2026-10-29)."

`MAIN/service/vendor/VendorService.java`: add the field `private final SneakPeekService sneakPeekService;` and pass `sneakPeekService.summary(vendor)` as the last argument of `new VendorMeDto(...)` in `me()`. Then:

Run: `grep -rn "new VendorMeDto(" src/` — fix every other call (tests included) by appending `null`.

If Spring reports a circular reference (`VendorService` → `SneakPeekService` → `PostService` → … → `VendorService`), annotate the `SneakPeekService` field with `@org.springframework.context.annotation.Lazy` and replace `@RequiredArgsConstructor` there with an explicit constructor carrying the same annotation on that parameter.

- [ ] **Step 8: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.*" --tests "event_social_media.service.media.PostServiceTest"`
Expected: PASS. If a `PostServiceTest` builds `PostService` by hand, add the two new constructor arguments as mocks.

- [ ] **Step 9: Commit**

```bash
git add -A src/main/java/event_social_media/dto/vendor src/main/java/event_social_media/service/vendor \
  src/main/java/event_social_media/controller/vendor/SneakPeekController.java \
  src/main/java/event_social_media/service/media/PostService.java src/test
git commit -m "feat(vendors): edit and delete the sneak peek; vendors/me shows it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Remove the sneak peek with its last item and with its vendor

**Files:**
- Create: `MAIN/service/media/ProMediaRemovedEvent.java`, `MAIN/service/vendor/SneakPeekCleanup.java`
- Modify: `MAIN/service/media/MediaService.java`, `MAIN/service/vendor/VendorMembership.java`
- Test: `TEST/service/vendor/SneakPeekCleanupTest.java`

- [ ] **Step 1: Write the failing test**

`TEST/service/vendor/SneakPeekCleanupTest.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.SneakPeekRequestDto;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.media.PostRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.service.media.MediaService;
import event_social_media.service.event.EventMemberService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class SneakPeekCleanupTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private EventRepository eventRepository;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private SneakPeekRepository sneakPeekRepository;
    @Autowired
    private SneakPeekService sneakPeekService;
    @Autowired
    private MediaService mediaService;
    @Autowired
    private EventMemberService eventMemberService;
    @MockBean
    private SneakPeekPostedListener postedListener;

    private User host;
    private Event event;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        event.setStartAt(OffsetDateTime.now().minusHours(2));
        event.setEndAt(OffsetDateTime.now().plusHours(4));
        eventRepository.saveAndFlush(event);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
    }

    private Media pro() {
        Media media = fixtures.newMedia(event, 10);
        media.setCollection(MediaCollection.PRO);
        media.setEventVendor(photographer);
        media.setUploaderMember(photographer.getMember());
        return mediaRepository.saveAndFlush(media);
    }

    private UUID post(Media... items) {
        return sneakPeekService.create(event.getId(),
                new SneakPeekRequestDto(java.util.Arrays.stream(items).map(Media::getId).toList(), null),
                photographer.getUser().getId()).getId();
    }

    @Test
    void thePostStaysWhileAnItemIsLeft() {
        Media one = pro();
        Media two = pro();
        UUID postId = post(one, two);

        mediaService.delete(one.getId(), photographer.getUser().getId());

        assertThat(postRepository.findById(postId)).isPresent();
    }

    @Test
    void thePostGoesWithItsLastItem() {
        Media one = pro();
        UUID postId = post(one);

        mediaService.delete(one.getId(), photographer.getUser().getId());

        assertThat(postRepository.findById(postId)).isEmpty();
        assertThat(sneakPeekRepository.findByEventVendorId(photographer.getId()))
                .hasValueSatisfying(row -> assertThat(row.getPostId()).isNull());
    }

    @Test
    void thePostGoesWithItsVendor() {
        Media one = pro();
        UUID postId = post(one);

        eventMemberService.delete(event.getId(), photographer.getMember().getId(), host.getId());

        assertThat(postRepository.findById(postId)).isEmpty();
        assertThat(mediaRepository.findById(one.getId())).isPresent();
    }
}
```

`EventMemberService.delete(eventId, memberId, callerUserId)`: use whatever host-side member removal `VendorPromotionTest` or the vendor removal tests call; it must end in `VendorMembership.memberRemoving`.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.SneakPeekCleanupTest"`
Expected: `thePostGoesWithItsLastItem` and `thePostGoesWithItsVendor` FAIL.

- [ ] **Step 3: Publish the event from `MediaService`**

`MAIN/service/media/ProMediaRemovedEvent.java`:

```java
package event_social_media.service.media;

import java.util.UUID;

/** A Pro item was soft-deleted; listened to in the same transaction by {@code SneakPeekCleanup}. */
public record ProMediaRemovedEvent(UUID eventId, UUID mediaId) {
}
```

In `MediaService.remove(Media media)`, at the end of the method:

```java
        if (media.getCollection() == MediaCollection.PRO) {
            eventPublisher.publishEvent(new ProMediaRemovedEvent(eventId, media.getId()));
        }
```

- [ ] **Step 4: Write `SneakPeekCleanup`**

`MAIN/service/vendor/SneakPeekCleanup.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.media.PostMediaRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.service.media.PostService;
import event_social_media.service.media.ProMediaRemovedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Takes a sneak peek down when nothing is left to show: its last item was deleted (by anyone), or its vendor
 * was removed from the event (spec 2026-10-29). Runs in the caller's transaction.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SneakPeekCleanup {

    private final SneakPeekRepository sneakPeekRepository;
    private final PostMediaRepository postMediaRepository;
    private final PostService postService;
    private final SneakPeekAudit audit;

    @EventListener
    public void onProMediaRemoved(ProMediaRemovedEvent removed) {
        for (UUID postId : sneakPeekRepository.findPostIdsShowingMedia(removed.mediaId())) {
            if (postMediaRepository.findByPost_IdAndMedia_DeletedAtIsNull(postId).isEmpty()) {
                sneakPeekRepository.findByPostId(postId).ifPresent(row -> {
                    postService.removeSneakPeekPost(postId);
                    log.info("Sneak peek {} removed: its last item {} was deleted", postId, removed.mediaId());
                });
            }
        }
    }

    /** Called by {@code VendorMembership} while it ends the vendor row, before the member link is cleared. */
    public void vendorRemoved(EventVendor vendor) {
        sneakPeekRepository.findByEventVendorId(vendor.getId())
                .filter(row -> row.getPostId() != null)
                .ifPresent(row -> {
                    UUID postId = row.getPostId();
                    postService.removeSneakPeekPost(postId);
                    audit.deleted(vendor.getEvent(), null, postId, SneakPeekAudit.DeletedBy.REMOVED);
                });
    }
}
```

The "last item" removal is not audited with an actor: the media delete that caused it is already audited (`PRO_MEDIA_DELETE`). Audit it with `DeletedBy.EMPTY` and a null actor only if a reviewer asks; the plan keeps it out.

- [ ] **Step 5: Call it from `VendorMembership.end`**

Add the field `private final SneakPeekCleanup sneakPeekCleanup;` and, in the private `end(vendor, member, actor)`, as the first line (the post's author is still the vendor's member here):

```java
        sneakPeekCleanup.vendorRemoved(vendor);
```

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.SneakPeekCleanupTest" --tests "event_social_media.service.vendor.VendorPromotionTest" --tests "event_social_media.controller.vendor.ProAlbumControllerTest"`
Expected: PASS. A circular-reference failure at startup: put `@Lazy` on the `PostService` dependency of `SneakPeekCleanup` (explicit constructor, as in Task 4 Step 7).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/service/media/ProMediaRemovedEvent.java \
  src/main/java/event_social_media/service/media/MediaService.java \
  src/main/java/event_social_media/service/vendor/SneakPeekCleanup.java \
  src/main/java/event_social_media/service/vendor/VendorMembership.java \
  src/test/java/event_social_media/service/vendor/SneakPeekCleanupTest.java
git commit -m "feat(vendors): a sneak peek goes with its last item or its vendor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Tell every member about the sneak peek

**Files:**
- Create: `MAIN/service/vendor/SneakPeekNotifier.java`
- Modify: `MAIN/service/vendor/SneakPeekPostedListener.java`, `RES/i18n/messages.properties`, `RES/i18n/messages_el.properties`
- Test: `TEST/service/vendor/SneakPeekNotifierTest.java`, `TEST/service/vendor/SneakPeekPostedListenerTest.java`

- [ ] **Step 1: Write the failing notifier test**

`TEST/service/vendor/SneakPeekNotifierTest.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Post;
import event_social_media.model.user.NotificationCategory;
import event_social_media.model.user.NotificationCtaTarget;
import event_social_media.model.user.NotificationType;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.SneakPeek;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The emitter is mocked, as in {@code VendorJoinedNotifierTest}: it writes in its own transaction. */
@SpringBootTest
@Transactional
class SneakPeekNotifierTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private SneakPeekNotifier notifier;
    @Autowired
    private SneakPeekRepository sneakPeekRepository;
    @Autowired
    private EventMemberRepository memberRepository;
    @MockBean
    private NotificationEmitter notificationEmitter;

    private User host;
    private Event event;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        when(notificationEmitter.emit(any())).thenReturn(true);
    }

    private SneakPeek posted() {
        Post post = fixtures.newPost(event, photographer.getMember());
        SneakPeek row = new SneakPeek();
        row.setEventId(event.getId());
        row.setEventVendorId(photographer.getId());
        row.setPostId(post.getId());
        return sneakPeekRepository.saveAndFlush(row);
    }

    @Test
    void everyMemberButTheVendorIsTold() {
        User guest = fixtures.newUser();
        EventMember guestMember = fixtures.newMember(event, guest, EventRole.ATTENDEE);
        User planner = support.vendor(event, PartnerRole.PLANNER).getUser();
        EventMember left = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        left.setDeletedAt(OffsetDateTime.now());
        memberRepository.saveAndFlush(left);
        SneakPeek row = posted();

        notifier.notifyMembers(row.getId());

        ArgumentCaptor<NotificationDraft> captor = ArgumentCaptor.forClass(NotificationDraft.class);
        verify(notificationEmitter, times(3)).emit(captor.capture());
        List<NotificationDraft> drafts = captor.getAllValues();
        assertThat(drafts).extracting(NotificationDraft::recipientUserId)
                .containsExactlyInAnyOrder(host.getId(), guest.getId(), planner.getId());
        assertThat(drafts).extracting(NotificationDraft::recipientMemberId).contains(guestMember.getId());
        NotificationDraft one = drafts.get(0);
        assertThat(one.type()).isEqualTo(NotificationType.SNEAK_PEEK_POSTED);
        assertThat(one.category()).isEqualTo(NotificationCategory.SYSTEM);
        assertThat(one.ctaTarget()).isEqualTo(NotificationCtaTarget.EVENT_POST);
        assertThat(one.ctaParams()).containsEntry("eventId", event.getId().toString())
                .containsEntry("postId", row.getPostId().toString());
        assertThat(one.dedupeKey()).isEqualTo("sneak-peek:vendor:" + photographer.getId());
        assertThat(one.payload()).containsEntry("businessName", "Studio PHOTOGRAPHER")
                .containsEntry("vendorType", "PHOTOGRAPHER");
        assertThat(one.title()).isEqualTo("Studio PHOTOGRAPHER shared a sneak peek");
        assertThat(one.body()).isEqualTo("See the first moments from the event.");
        assertThat(one.ctaLabel()).isEqualTo("See the sneak peek");
        assertThat(sneakPeekRepository.findById(row.getId()).orElseThrow().getNotifiedAt()).isNotNull();
    }

    @Test
    void nothingIsSentWhenThePostIsGone() {
        SneakPeek gone = posted();
        gone.setPostId(null);
        sneakPeekRepository.saveAndFlush(gone);
        notifier.notifyMembers(gone.getId());

        verify(notificationEmitter, never()).emit(any());
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.SneakPeekNotifierTest"`
Expected: compilation FAIL (`SneakPeekNotifier` missing).

- [ ] **Step 3: Add the copy**

`RES/i18n/messages.properties`, after the `notification.vendor.joined.*` lines:

```properties
notification.sneak_peek.posted.title={businessName} shared a sneak peek
notification.sneak_peek.posted.body=See the first moments from the event.
notification.cta.view_sneak_peek=See the sneak peek
```

`RES/i18n/messages_el.properties`, at the same place:

```properties
notification.sneak_peek.posted.title=Ο/Η {businessName} μοιράστηκε μια πρώτη ματιά
notification.sneak_peek.posted.body=Δείτε τις πρώτες στιγμές της εκδήλωσης.
notification.cta.view_sneak_peek=Δείτε την πρώτη ματιά
```

If the properties files are not UTF-8 (look for `\u03..` escapes in the existing Greek lines), write the Greek with the same escaping.

- [ ] **Step 4: Write the notifier**

`MAIN/service/vendor/SneakPeekNotifier.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.user.NotificationCategory;
import event_social_media.model.user.NotificationCtaTarget;
import event_social_media.model.user.NotificationSeverity;
import event_social_media.model.user.NotificationType;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.SneakPeek;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.PostRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.SneakPeekRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.i18n.MessageRenderer;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Tells every member with an account, hosts included, that a vendor shared their sneak peek (spec
 * 2026-10-29): in-app, and by email through {@code NotificationEmailDispatcher} (SYSTEM, not in-app only).
 * Called by {@link SneakPeekPostedListener} after the post commits; runs once per sneak peek.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SneakPeekNotifier {

    private static final String TITLE_KEY = "notification.sneak_peek.posted.title";
    private static final String BODY_KEY = "notification.sneak_peek.posted.body";
    private static final String CTA_KEY = "notification.cta.view_sneak_peek";

    private final SneakPeekRepository sneakPeekRepository;
    private final EventVendorRepository eventVendorRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final EventMemberRepository eventMemberRepository;
    private final EventRepository eventRepository;
    private final PostRepository postRepository;
    private final NotificationEmitter notificationEmitter;
    private final MessageRenderer messageRenderer;
    private final SneakPeekAudit audit;

    /** The dedupe key of the notifications about one vendor's sneak peek; account deletion finds them by it. */
    public static String dedupeKey(UUID eventVendorId) {
        return "sneak-peek:vendor:" + eventVendorId;
    }

    @Transactional
    public void notifyMembers(UUID sneakPeekId) {
        SneakPeek row = sneakPeekRepository.findById(sneakPeekId).orElse(null);
        // Deleted before we got here, or already announced: nothing to say.
        if (row == null || row.getPostId() == null || row.getNotifiedAt() != null
                || !postRepository.existsById(row.getPostId())) {
            return;
        }
        EventVendor vendor = eventVendorRepository.findById(row.getEventVendorId()).orElse(null);
        if (vendor == null || vendor.getRemovedAt() != null || vendor.getMember() == null) {
            return;
        }
        UUID vendorMemberId = vendor.getMember().getId();
        String type = vendor.getVendorType().name();
        String businessName = vendor.getUser() == null ? vendor.getMember().getDisplayName()
                : vendorProfileRepository.findById(vendor.getUser().getId())
                        .map(profile -> profile.getBusinessName())
                        .orElse(vendor.getMember().getDisplayName());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("businessName", businessName);
        payload.put("vendorType", type);

        int told = 0;
        for (EventMember member : eventMemberRepository.findByEvent_Id(row.getEventId())) {
            if (member.getDeletedAt() != null || member.getUser() == null || member.getId().equals(vendorMemberId)) {
                continue;
            }
            boolean emitted = notificationEmitter.emit(new NotificationDraft(
                    member.getUser().getId(),
                    member.getId(),
                    NotificationType.SNEAK_PEEK_POSTED,
                    NotificationCategory.SYSTEM,
                    NotificationSeverity.INFO,
                    messageRenderer.render(TITLE_KEY, payload, Locale.ENGLISH),
                    messageRenderer.render(BODY_KEY, payload, Locale.ENGLISH),
                    messageRenderer.render(CTA_KEY, payload, Locale.ENGLISH),
                    NotificationCtaTarget.EVENT_POST,
                    Map.of("eventId", row.getEventId().toString(), "postId", row.getPostId().toString()),
                    null,
                    dedupeKey(vendor.getId()),
                    payload,
                    TITLE_KEY,
                    BODY_KEY,
                    CTA_KEY));
            if (emitted) {
                told++;
            }
        }
        row.setNotifiedAt(OffsetDateTime.now());
        sneakPeekRepository.save(row);
        Event event = eventRepository.getReferenceById(row.getEventId());
        audit.notified(event, row.getPostId(), told);
        log.info("Event {}: told {} member(s) about sneak peek {}", row.getEventId(), told, row.getPostId());
    }
}
```

Use the `MessageRenderer` and `NotificationDraft` packages `VendorJoinedNotifier` imports.

- [ ] **Step 5: Wire the listener**

Replace the body of `SneakPeekPostedListener`:

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class SneakPeekPostedListener {

    private final SneakPeekNotifier notifier;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPosted(SneakPeekPostedEvent event) {
        try {
            notifier.notifyMembers(event.sneakPeekId());
        } catch (RuntimeException ex) {
            log.error("Sneak peek {}: telling the members failed", event.sneakPeekId(), ex);
        }
    }
}
```

`TEST/service/vendor/SneakPeekPostedListenerTest.java`, modelled on `VendorJoinedListenerTest` (open it and copy its setup, swapping the types): assert that publishing `SneakPeekPostedEvent` in a committed transaction calls `SneakPeekNotifier.notifyMembers` with the id, and that a notifier exception is swallowed.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.SneakPeek*"`
Expected: PASS.

- [ ] **Step 7: Account deletion**

Run: `grep -rn "VendorJoinedNotifier.dedupeKey\|PrintListSentNotifier.dedupeKey\|dedupeKey(" src/main/java/event_social_media/service/user/deletion`
If account deletion deletes notifications that name the deleted user by dedupe key (it does for `PRINT_LIST_SENT`, decision 12 of the print-picks plan), do the same for the deleted user's vendor rows: for each of their `EventVendor` rows, delete notifications with `SneakPeekNotifier.dedupeKey(vendor.getId())`, in the same place and the same way. Add a case to that deletion test asserting the copies are gone. If nothing there deletes by dedupe key, skip this step: the business name is not personal data of a guest.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/service/vendor/SneakPeekNotifier.java \
  src/main/java/event_social_media/service/vendor/SneakPeekPostedListener.java \
  src/main/resources/i18n/messages.properties src/main/resources/i18n/messages_el.properties src/test
git commit -m "feat(vendors): tell every member about a sneak peek

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Record views

**Files:**
- Create: `MAIN/dto/media/ContentViewsRequestDto.java`, `MAIN/service/media/ContentViewService.java`, `MAIN/controller/media/ContentViewController.java`
- Test: `TEST/controller/media/ContentViewControllerTest.java`

- [ ] **Step 1: Write the failing test**

`TEST/controller/media/ContentViewControllerTest.java`:

```java
package event_social_media.controller.media;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.media.Post;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Not {@code @Transactional}: each insert commits on its own (decision 4), so the test cleans up by
 * building a fresh event per test and never asserting on counts across events.
 */
@SpringBootTest(properties = "app.rate-limit.enabled=false")
@AutoConfigureMockMvc
class ContentViewControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private ContentViewRepository views;
    @Autowired
    private org.springframework.transaction.support.TransactionTemplate tx;

    private User host;
    private User guest;
    private EventMember guestMember;
    private Event event;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        tx.executeWithoutResult(status -> {
            host = fixtures.newUser();
            event = support.vendorEventHostedBy(host);
            guest = fixtures.newUser();
            guestMember = fixtures.newMember(event, guest, EventRole.ATTENDEE);
            photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        });
    }

    private Media pro() {
        return tx.execute(status -> {
            Media media = fixtures.newMedia(event, 10);
            media.setCollection(MediaCollection.PRO);
            media.setEventVendor(photographer);
            media.setUploaderMember(photographer.getMember());
            return mediaRepository.saveAndFlush(media);
        });
    }

    private ResultActions send(User caller, List<UUID> mediaIds, List<UUID> postIds) throws Exception {
        String json = "{\"mediaIds\":" + ids(mediaIds) + ",\"postIds\":" + ids(postIds) + "}";
        return mockMvc.perform(as(caller, post("/api/events/{e}/views", event.getId())
                .contentType(MediaType.APPLICATION_JSON).content(json)));
    }

    private static String ids(List<UUID> ids) {
        return ids.stream().map(id -> "\"" + id + "\"").collect(Collectors.joining(",", "[", "]"));
    }

    @Test
    void aGuestsViewIsRecordedOnce() throws Exception {
        Media item = pro();
        Post vendorPost = tx.execute(status -> fixtures.newPost(event, photographer.getMember()));

        send(guest, List.of(item.getId()), List.of(vendorPost.getId())).andExpect(status().isNoContent());
        send(guest, List.of(item.getId()), List.of(vendorPost.getId())).andExpect(status().isNoContent());

        assertThat(views.findViewedMediaIds(guestMember.getId(), List.of(item.getId()))).hasSize(1);
        assertThat(views.findViewedPostIds(guestMember.getId(), List.of(vendorPost.getId()))).hasSize(1);
    }

    @Test
    void hostsTheVendorAndOtherContentAreIgnored() throws Exception {
        Media item = pro();
        Media guestPhoto = tx.execute(status -> fixtures.newMedia(event, 10));
        Post guestPost = tx.execute(status -> fixtures.newPost(event, guestMember));

        send(host, List.of(item.getId()), List.of()).andExpect(status().isNoContent());
        send(photographer.getUser(), List.of(item.getId()), List.of()).andExpect(status().isNoContent());
        send(guest, List.of(guestPhoto.getId()), List.of(guestPost.getId())).andExpect(status().isNoContent());

        assertThat(views.countProViews(photographer.getId())).isZero();
        assertThat(views.findViewedPostIds(guestMember.getId(), List.of(guestPost.getId()))).isEmpty();
    }

    @Test
    void nonMembersAreRefusedAndBatchesAreCapped() throws Exception {
        send(fixtures.newUser(), List.of(pro().getId()), List.of()).andExpect(status().isForbidden());
        List<UUID> fiftyOne = new ArrayList<>();
        for (int i = 0; i < 51; i++) {
            fiftyOne.add(UUID.randomUUID());
        }
        send(guest, fiftyOne, List.of()).andExpect(status().isBadRequest());
    }
}
```

If `TestFixtures` writes need an open transaction outside a `@Transactional` test, the `tx` wrapper above provides one. If the suite has a cleanup extension for non-transactional tests (look at another test without `@Transactional`), use it.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.media.ContentViewControllerTest"`
Expected: FAIL with 404 (no endpoint).

- [ ] **Step 3: Write the DTO, service and controller**

`MAIN/dto/media/ContentViewsRequestDto.java`:

```java
package event_social_media.dto.media;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** {@code POST /api/events/{eventId}/views}: what the client saw since its last flush. Either list may be empty or absent. */
public record ContentViewsRequestDto(
        @Size(max = 50) List<@NotNull UUID> mediaIds,
        @Size(max = 50) List<@NotNull UUID> postIds) {
}
```

`MAIN/service/media/ContentViewService.java`:

```java
package event_social_media.service.media;

import event_social_media.dto.media.ContentViewsRequestDto;
import event_social_media.model.event.EventMember;
import event_social_media.model.media.ContentView;
import event_social_media.model.media.MediaCollection;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.service.event.EventAuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/**
 * Records that a member saw vendor work (spec 2026-10-29, "Views"): a Pro item opened in the viewer, or a
 * vendor's post on screen. One row per member and target, ever. Hosts and the vendor themself are not
 * counted, and ids that are neither are dropped without an error, so a stale client never fails a flush.
 *
 * <p>Deliberately not one transaction: each new row is its own insert, and a duplicate from a concurrent
 * flush (the unique index) is skipped instead of failing the rest.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentViewService {

    private final EventAuthorizationService eventAuthorizationService;
    private final EventMemberRepository eventMemberRepository;
    private final ContentViewRepository contentViewRepository;

    public void record(UUID eventId, ContentViewsRequestDto dto, UUID callerUserId) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        if (eventAuthorizationService.isHost(eventId, callerUserId)) {
            return;
        }
        EventMember member = eventMemberRepository.findByEvent_IdAndUser_IdAndDeletedAtIsNull(eventId, callerUserId)
                .orElse(null);
        if (member == null) {
            return;
        }
        List<UUID> mediaIds = dto.mediaIds() == null ? List.of() : dto.mediaIds();
        List<UUID> postIds = dto.postIds() == null ? List.of() : dto.postIds();
        if (!mediaIds.isEmpty()) {
            List<UUID> countable = contentViewRepository.findCountableMediaIds(eventId, mediaIds, member.getId(),
                    MediaCollection.PRO);
            insertNew(countable, contentViewRepository.findViewedMediaIds(member.getId(), countable),
                    id -> ContentView.ofMedia(eventId, member.getId(), id));
        }
        if (!postIds.isEmpty()) {
            List<UUID> countable = contentViewRepository.findCountablePostIds(eventId, postIds, member.getId());
            insertNew(countable, contentViewRepository.findViewedPostIds(member.getId(), countable),
                    id -> ContentView.ofPost(eventId, member.getId(), id));
        }
    }

    private void insertNew(List<UUID> countable, List<UUID> alreadyViewed, Function<UUID, ContentView> view) {
        if (countable.isEmpty()) {
            return;
        }
        Set<UUID> seen = new HashSet<>(alreadyViewed);
        for (UUID id : countable) {
            if (!seen.add(id)) {
                continue;
            }
            try {
                contentViewRepository.saveAndFlush(view.apply(id));
            } catch (DataIntegrityViolationException duplicate) {
                log.debug("View of {} was recorded by a concurrent flush", id);
            }
        }
    }
}
```

The two `find…` reads run outside a transaction, and `findCountable…` with an empty list is never called (an `in ()` with no values fails on some databases).

`MAIN/controller/media/ContentViewController.java`:

```java
package event_social_media.controller.media;

import event_social_media.dto.media.ContentViewsRequestDto;
import event_social_media.service.media.ContentViewService;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Views of vendor work, batched by the client every 10 seconds and when the page hides. */
@RestController
@RequiredArgsConstructor
public class ContentViewController {

    private final ContentViewService contentViewService;

    @PostMapping("/api/events/{eventId}/views")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RateLimit(name = "content.views", limit = 240, windowSeconds = 3600)
    public void record(@PathVariable UUID eventId, @Valid @RequestBody ContentViewsRequestDto dto,
                       Authentication authentication) {
        contentViewService.record(eventId, dto, UUID.fromString((String) authentication.getPrincipal()));
    }
}
```

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.media.ContentViewControllerTest" --tests "event_social_media.repository.media.ContentViewRepositoryTest"`
Expected: PASS.

- [ ] **Step 5: Add a rate-limit test**

Copy `TEST/controller/vendor/VendorClickRateLimitTest.java` to `TEST/controller/media/ContentViewRateLimitTest.java`, point it at `POST /api/events/{e}/views` with body `{"mediaIds":[],"postIds":[]}` from a guest, and assert request 241 in the window gets 429. Run it: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/media/ContentViewsRequestDto.java \
  src/main/java/event_social_media/service/media/ContentViewService.java \
  src/main/java/event_social_media/controller/media/ContentViewController.java \
  src/test/java/event_social_media/controller/media
git commit -m "feat(media): record one view per guest of vendor work

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The reach report

**Files:**
- Create: `MAIN/dto/vendor/VendorReachDto.java`, `MAIN/service/vendor/VendorReachService.java`, `MAIN/controller/vendor/VendorReachController.java`
- Modify: `MAIN/repository/media/ReactionRepository.java`, `MAIN/repository/media/CommentRepository.java`, `MAIN/repository/collaboration/PartnerBrandingClickRepository.java`, `MAIN/repository/collaboration/CollaboratorRepository.java`, `MAIN/service/vendor/ApprovedPartners.java`
- Test: `TEST/controller/vendor/VendorReachControllerTest.java`, `TEST/service/vendor/ApprovedPartnersTest.java`

- [ ] **Step 1: Write the failing test**

`TEST/controller/vendor/VendorReachControllerTest.java`:

```java
package event_social_media.controller.vendor;

import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.BrandingVariant;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerBrandingClick;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.ContentView;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.media.Post;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorListClick;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.collaboration.PartnerBrandingClickRepository;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.vendor.VendorListClickRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorReachControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private ContentViewRepository views;
    @Autowired
    private VendorListClickRepository listClicks;
    @Autowired
    private PartnerBrandingClickRepository brandingClicks;
    @Autowired
    private CollaboratorRepository collaboratorRepository;

    private User host;
    private Event event;
    private EventMember guestA;
    private EventMember guestB;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        guestA = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        guestB = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        seed();
    }

    /** Two guests; 3 Pro views by 2 people; 1 post seen by 1; 1 reaction, 1 comment by guests; 2 list taps. */
    private void seed() {
        Media one = pro();
        Media two = pro();
        views.saveAndFlush(ContentView.ofMedia(event.getId(), guestA.getId(), one.getId()));
        views.saveAndFlush(ContentView.ofMedia(event.getId(), guestA.getId(), two.getId()));
        views.saveAndFlush(ContentView.ofMedia(event.getId(), guestB.getId(), one.getId()));
        Post post = fixtures.newPost(event, photographer.getMember());
        views.saveAndFlush(ContentView.ofPost(event.getId(), guestA.getId(), post.getId()));
        fixtures.newComment(post, guestB);
        fixtures.newReaction(post, guestA);
        for (int i = 0; i < 2; i++) {
            VendorListClick click = new VendorListClick();
            click.setEventVendorId(photographer.getId());
            click.setEventId(event.getId());
            listClicks.saveAndFlush(click);
        }
    }

    private Media pro() {
        Media media = fixtures.newMedia(event, 10);
        media.setCollection(MediaCollection.PRO);
        media.setEventVendor(photographer);
        media.setUploaderMember(photographer.getMember());
        return mediaRepository.saveAndFlush(media);
    }

    private ResultActions reach(User caller) throws Exception {
        return mockMvc.perform(as(caller, get("/api/events/{e}/vendors/me/reach", event.getId())));
    }

    /** Makes the vendor's account an approved partner and returns the partner. */
    private Collaborator partner(User user) {
        Collaborator collaborator = fixtures.newCollaborator();
        collaborator.setContactEmail(user.getEmail().toUpperCase());
        return collaboratorRepository.saveAndFlush(collaborator);
    }

    @Test
    void aNonPartnerSeesGuestsAndListTapsOnly() throws Exception {
        reach(photographer.getUser())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guests").value(2))
                .andExpect(jsonPath("$.listTaps").value(2))
                .andExpect(jsonPath("$.partner").value(false))
                .andExpect(jsonPath("$.proViewers").doesNotExist())
                .andExpect(jsonPath("$.proViews").doesNotExist())
                .andExpect(jsonPath("$.postViewers").doesNotExist())
                .andExpect(jsonPath("$.reactions").doesNotExist())
                .andExpect(jsonPath("$.comments").doesNotExist())
                .andExpect(jsonPath("$.partnerCardTaps").doesNotExist());
    }

    @Test
    void aPartnerSeesEverything() throws Exception {
        Collaborator collaborator = partner(photographer.getUser());
        PartnerBrandingClick tap = new PartnerBrandingClick();
        tap.setEventId(event.getId());
        tap.setCollaboratorId(collaborator.getId());
        tap.setVariant(BrandingVariant.values()[0]);
        brandingClicks.saveAndFlush(tap);

        reach(photographer.getUser())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner").value(true))
                .andExpect(jsonPath("$.guests").value(2))
                .andExpect(jsonPath("$.listTaps").value(2))
                .andExpect(jsonPath("$.proViewers").value(2))
                .andExpect(jsonPath("$.proViews").value(3))
                .andExpect(jsonPath("$.postViewers").value(1))
                .andExpect(jsonPath("$.reactions").value(1))
                .andExpect(jsonPath("$.comments").value(1))
                .andExpect(jsonPath("$.partnerCardTaps").value(1));
    }

    @Test
    void aPartnerWithoutAProAlbumHasNoProNumbers() throws Exception {
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        partner(planner.getUser());

        reach(planner.getUser())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.partner").value(true))
                .andExpect(jsonPath("$.proViewers").doesNotExist())
                .andExpect(jsonPath("$.proViews").doesNotExist())
                .andExpect(jsonPath("$.postViewers").value(0))
                .andExpect(jsonPath("$.partnerCardTaps").value(0));
    }

    @Test
    void readableAfterAccessEnds() throws Exception {
        support.endedDaysAgo(event, 31);
        reach(photographer.getUser()).andExpect(status().isOk()).andExpect(jsonPath("$.guests").value(2));
    }

    @Test
    void hostsGuestsAndRemovedVendorsAreRefused() throws Exception {
        EventVendor removed = support.vendor(event, PartnerRole.PLANNER);
        removed.setRemovedAt(java.time.OffsetDateTime.now());
        for (User refused : new User[]{host, guestA.getUser(), removed.getUser()}) {
            reach(refused)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value(ErrorCode.VENDOR_CAPABILITY_MISSING.getCode()));
        }
    }
}
```

`fixtures.newReaction(post, member)`: if `TestFixtures` has no such helper, add one next to `newComment` that saves a `Reaction` with the first `ReactionType` (`reactionTypeRepository.findAll().get(0)`), the way `ReactionControllerTest` builds one. `VendorListClick` setters: use the field names the entity has (it is the row `VendorClickRecorder` writes). The removed vendor in the last test: `VendorTestSupport.vendor` returns a managed entity inside the test transaction, so the flag reaches the query; call `eventVendorRepository.saveAndFlush(removed)` if it does not.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorReachControllerTest"`
Expected: compilation FAIL, or 404 once it compiles.

- [ ] **Step 3: Add the counts**

`MAIN/repository/media/ReactionRepository.java`:

```java
    /** Reactions by others on the posts this member wrote, for the vendor reach report. */
    @Query("select count(r) from Reaction r where r.post.authorMember.id = :authorMemberId "
            + "and (r.member is null or r.member.id <> :authorMemberId)")
    long countOnPostsOfAuthor(@Param("authorMemberId") UUID authorMemberId);
```

`MAIN/repository/media/CommentRepository.java`:

```java
    /** Live comments by others on the posts this member wrote, for the vendor reach report. */
    @Query("select count(c) from Comment c where c.post.authorMember.id = :authorMemberId and c.deletedAt is null "
            + "and (c.authorMember is null or c.authorMember.id <> :authorMemberId)")
    long countOnPostsOfAuthor(@Param("authorMemberId") UUID authorMemberId);
```

`MAIN/repository/collaboration/PartnerBrandingClickRepository.java`:

```java
    long countByEventIdAndCollaboratorId(UUID eventId, UUID collaboratorId);
```

`MAIN/repository/collaboration/CollaboratorRepository.java`, next to `existsByContactEmailIgnoreCaseAndStatusAndDeletedAtIsNull`:

```java
    Optional<Collaborator> findFirstByContactEmailIgnoreCaseAndStatusAndDeletedAtIsNull(String contactEmail,
                                                                                       CollaboratorStatus status);
```

`MAIN/service/vendor/ApprovedPartners.java`, after `isApproved` (add imports `java.util.Optional`, `java.util.UUID`, `event_social_media.model.collaboration.Collaborator`):

```java
    /** The approved partner this account is, by the same email match as {@link #isApproved}. */
    @Transactional(readOnly = true)
    public Optional<UUID> collaboratorId(User user) {
        String email = user == null ? null : user.getEmail();
        if (email == null) {
            return Optional.empty();
        }
        return collaboratorRepository
                .findFirstByContactEmailIgnoreCaseAndStatusAndDeletedAtIsNull(email, CollaboratorStatus.ACTIVE)
                .map(Collaborator::getId);
    }
```

Append to `TEST/service/vendor/ApprovedPartnersTest.java` (reuse its setup):

```java
    @Test
    void collaboratorIdFollowsTheSameMatch() {
        User user = fixtures.newUser();
        assertThat(approvedPartners.collaboratorId(user)).isEmpty();
        Collaborator collaborator = fixtures.newCollaborator();
        collaborator.setContactEmail(user.getEmail().toUpperCase());
        collaboratorRepository.saveAndFlush(collaborator);
        assertThat(approvedPartners.collaboratorId(user)).contains(collaborator.getId());
    }
```

- [ ] **Step 4: Write the DTO, service and controller**

`MAIN/dto/vendor/VendorReachDto.java`:

```java
package event_social_media.dto.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One vendor's reach in one event (spec 2026-10-29). Every vendor sees {@code guests} and {@code listTaps}.
 * The rest is for approved partners and absent otherwise; the Pro numbers are absent too for types
 * without a Pro album. {@code partnerCardTaps} is 0 when the partner's card never ran here.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VendorReachDto(
        long guests,
        long listTaps,
        Long proViewers,
        Long proViews,
        Long postViewers,
        Long reactions,
        Long comments,
        Long partnerCardTaps,
        boolean partner) {
}
```

`MAIN/service/vendor/VendorReachService.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.VendorReachDto;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.model.event.EventRole;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.PartnerBrandingClickRepository;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.media.CommentRepository;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.repository.media.ReactionRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorListClickRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * The numbers of the vendor reach report (spec 2026-10-29), shared by the vendor page, the end-of-access
 * notification and (per event) the partner portal. Counts only: nothing here says who viewed what.
 */
@Service
@RequiredArgsConstructor
public class VendorReachService {

    private final EventVendorRepository eventVendorRepository;
    private final EventMemberRepository eventMemberRepository;
    private final VendorListClickRepository listClickRepository;
    private final ContentViewRepository contentViewRepository;
    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;
    private final PartnerBrandingClickRepository brandingClickRepository;
    private final ApprovedPartners approvedPartners;

    /**
     * The caller's own report. Any vendor row that was not removed may read it, after access ends and
     * with the module off too (decision 8); everyone else gets {@link ErrorCode#VENDOR_CAPABILITY_MISSING}.
     */
    @Transactional(readOnly = true)
    public VendorReachDto me(UUID eventId, UUID callerUserId) {
        EventVendor vendor = eventVendorRepository.findByEvent_IdAndUser_Id(eventId, callerUserId)
                .filter(row -> row.getRemovedAt() == null)
                .orElseThrow(() -> new ForbiddenException(ErrorCode.VENDOR_CAPABILITY_MISSING,
                        "Only the event's vendors have a reach report."));
        return forVendor(vendor);
    }

    @Transactional(readOnly = true)
    public VendorReachDto forVendor(EventVendor vendor) {
        UUID eventId = vendor.getEvent().getId();
        long guests = eventMemberRepository.countLiveGuestMembers(eventId, EventRole.HOST);
        long listTaps = listClickRepository.countByEventVendorId(vendor.getId());
        Optional<UUID> collaboratorId = approvedPartners.collaboratorId(vendor.getUser());
        if (collaboratorId.isEmpty()) {
            return new VendorReachDto(guests, listTaps, null, null, null, null, null, null, false);
        }
        boolean pro = VendorCapability.PRO_ALBUM.types().contains(vendor.getVendorType());
        UUID authorId = vendor.getMember() == null ? null : vendor.getMember().getId();
        return new VendorReachDto(guests, listTaps,
                pro ? contentViewRepository.countProViewers(vendor.getId()) : null,
                pro ? contentViewRepository.countProViews(vendor.getId()) : null,
                authorId == null ? 0L : contentViewRepository.countPostViewers(authorId),
                authorId == null ? 0L : reactionRepository.countOnPostsOfAuthor(authorId),
                authorId == null ? 0L : commentRepository.countOnPostsOfAuthor(authorId),
                brandingClickRepository.countByEventIdAndCollaboratorId(eventId, collaboratorId.get()),
                true);
    }
}
```

`EventVendorRepository.findByEvent_IdAndUser_Id`: if it does not exist, add `Optional<EventVendor> findFirstByEvent_IdAndUser_IdOrderByJoinedAtDesc(UUID eventId, UUID userId);` (a user who left and came back has two rows; the newest one counts) and use that name.

`MAIN/controller/vendor/VendorReachController.java`:

```java
package event_social_media.controller.vendor;

import event_social_media.dto.vendor.VendorReachDto;
import event_social_media.service.vendor.VendorReachService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** The vendor reach report (spec 2026-10-29). */
@RestController
@RequiredArgsConstructor
public class VendorReachController {

    private final VendorReachService vendorReachService;

    @GetMapping("/api/events/{eventId}/vendors/me/reach")
    @PreAuthorize("hasRole('USER')")
    public VendorReachDto me(@PathVariable UUID eventId, Authentication authentication) {
        return vendorReachService.me(eventId, UUID.fromString((String) authentication.getPrincipal()));
    }
}
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorReachControllerTest" --tests "event_social_media.service.vendor.ApprovedPartnersTest"`
Expected: PASS. If `$.guests` is 3 rather than 2, `countLiveGuestMembers` counts the vendor: check it excludes active vendor rows, as its javadoc says, before changing the test.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/vendor/VendorReachDto.java \
  src/main/java/event_social_media/service/vendor/VendorReachService.java \
  src/main/java/event_social_media/service/vendor/ApprovedPartners.java \
  src/main/java/event_social_media/controller/vendor/VendorReachController.java \
  src/main/java/event_social_media/repository src/test
git commit -m "feat(vendors): reach report for every vendor, full for partners

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The reach summary when access ends

**Files:**
- Create: `MAIN/service/vendor/VendorAccessEndedEvent.java`, `MAIN/service/vendor/VendorAccessEndedListener.java`, `MAIN/service/vendor/VendorReachSummaryNotifier.java`
- Modify: `MAIN/service/vendor/VendorAccessSweepJob.java`, `RES/i18n/messages.properties`, `RES/i18n/messages_el.properties`
- Test: `TEST/service/vendor/VendorReachSummaryNotifierTest.java`, `TEST/service/vendor/VendorAccessSweepJobTest.java`

- [ ] **Step 1: Write the failing notifier test**

`TEST/service/vendor/VendorReachSummaryNotifierTest.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.NotificationCategory;
import event_social_media.model.user.NotificationCtaTarget;
import event_social_media.model.user.NotificationType;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
class VendorReachSummaryNotifierTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private VendorReachSummaryNotifier notifier;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private EventRepository eventRepository;
    @MockBean
    private NotificationEmitter notificationEmitter;

    private Event event;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        User host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        event.setTitle("Anna & Nikos");
        eventRepository.saveAndFlush(event);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        when(notificationEmitter.emit(any())).thenReturn(true);
    }

    private NotificationDraft sent() {
        ArgumentCaptor<NotificationDraft> captor = ArgumentCaptor.forClass(NotificationDraft.class);
        verify(notificationEmitter).emit(captor.capture());
        return captor.getValue();
    }

    @Test
    void aNonPartnerGetsTheShortReport() {
        notifier.send(photographer.getId());

        NotificationDraft draft = sent();
        assertThat(draft.recipientUserId()).isEqualTo(photographer.getUser().getId());
        assertThat(draft.recipientMemberId()).isEqualTo(photographer.getMember().getId());
        assertThat(draft.type()).isEqualTo(NotificationType.VENDOR_REACH_SUMMARY);
        assertThat(draft.category()).isEqualTo(NotificationCategory.SYSTEM);
        assertThat(draft.ctaTarget()).isEqualTo(NotificationCtaTarget.EVENT_VENDOR_PAGE);
        assertThat(draft.ctaParams()).containsEntry("eventId", event.getId().toString());
        assertThat(draft.dedupeKey()).isEqualTo("vendor-reach:vendor:" + photographer.getId());
        assertThat(draft.title()).isEqualTo("Your reach at Anna & Nikos");
        assertThat(draft.bodyKey()).isEqualTo("notification.vendor.reach.body.basic");
        assertThat(draft.payload()).containsEntry("guests", 0L).containsEntry("listTaps", 0L)
                .doesNotContainKey("proViews");
    }

    @Test
    void aPartnerGetsTheFullReport() {
        Collaborator collaborator = fixtures.newCollaborator();
        collaborator.setContactEmail(photographer.getUser().getEmail());
        collaboratorRepository.saveAndFlush(collaborator);

        notifier.send(photographer.getId());

        NotificationDraft draft = sent();
        assertThat(draft.bodyKey()).isEqualTo("notification.vendor.reach.body.full");
        assertThat(draft.payload()).containsKeys("proViewers", "postViewers", "reactions", "comments");
    }

    @Test
    void aPartnerWithoutAProAlbumGetsTheFullReportWithoutPro() {
        EventVendor planner = support.vendor(event, PartnerRole.PLANNER);
        Collaborator collaborator = fixtures.newCollaborator();
        collaborator.setContactEmail(planner.getUser().getEmail());
        collaboratorRepository.saveAndFlush(collaborator);

        notifier.send(planner.getId());

        assertThat(sent().bodyKey()).isEqualTo("notification.vendor.reach.body.full_no_pro");
    }

    @Test
    void nothingForARemovedVendorOrADeletedEvent() {
        photographer.setRemovedAt(OffsetDateTime.now());
        notifier.send(photographer.getId());
        EventVendor other = support.vendor(event, PartnerRole.VIDEOGRAPHER);
        event.setDeletedAt(OffsetDateTime.now());
        eventRepository.saveAndFlush(event);
        notifier.send(other.getId());

        verify(notificationEmitter, never()).emit(any());
    }
}
```

`NotificationDraft` component names (`recipientUserId`, `bodyKey`, …): use the names the record has; `VendorJoinedNotifierTest` reads the same ones.

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorReachSummaryNotifierTest"`
Expected: compilation FAIL.

- [ ] **Step 3: Add the copy**

`RES/i18n/messages.properties`:

```properties
notification.vendor.reach.title=Your reach at {eventTitle}
notification.vendor.reach.body.basic={guests} guests were at the event and {listTaps} opened your details. Partners also see who viewed their work: you can apply from your vendor page.
notification.vendor.reach.body.full={guests} guests. {proViewers} opened your Pro photos and videos ({proViews} views). {postViewers} saw your posts, with {reactions} reactions and {comments} comments. {listTaps} opened your details.
notification.vendor.reach.body.full_no_pro={guests} guests. {postViewers} saw your posts, with {reactions} reactions and {comments} comments. {listTaps} opened your details.
notification.cta.view_reach=See your reach
```

`RES/i18n/messages_el.properties`:

```properties
notification.vendor.reach.title=Η απήχησή σας: {eventTitle}
notification.vendor.reach.body.basic=Στην εκδήλωση ήταν {guests} καλεσμένοι και {listTaps} άνοιξαν τα στοιχεία σας. Οι συνεργάτες βλέπουν και ποιοι είδαν τη δουλειά τους: μπορείτε να κάνετε αίτηση από τη σελίδα σας.
notification.vendor.reach.body.full={guests} καλεσμένοι. {proViewers} άνοιξαν τις φωτογραφίες και τα βίντεό σας ({proViews} προβολές). {postViewers} είδαν τις αναρτήσεις σας, με {reactions} αντιδράσεις και {comments} σχόλια. {listTaps} άνοιξαν τα στοιχεία σας.
notification.vendor.reach.body.full_no_pro={guests} καλεσμένοι. {postViewers} είδαν τις αναρτήσεις σας, με {reactions} αντιδράσεις και {comments} σχόλια. {listTaps} άνοιξαν τα στοιχεία σας.
notification.cta.view_reach=Δείτε την απήχηση
```

This copy goes through `design:ux-copy` with the frontend copy before release (spec "Legal"); keep the keys and placeholders, change only the words.

- [ ] **Step 4: Write the notifier**

`MAIN/service/vendor/VendorReachSummaryNotifier.java`:

```java
package event_social_media.service.vendor;

import event_social_media.dto.vendor.VendorReachDto;
import event_social_media.model.event.Event;
import event_social_media.model.user.NotificationCategory;
import event_social_media.model.user.NotificationCtaTarget;
import event_social_media.model.user.NotificationSeverity;
import event_social_media.model.user.NotificationType;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.i18n.MessageRenderer;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Sends a vendor the reach they got, once, when their access ends (spec 2026-10-29). In-app and email
 * (SYSTEM). The body has only the numbers this vendor may see; a non-partner's ends with a line about the
 * full report and where to apply.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorReachSummaryNotifier {

    private static final String TITLE_KEY = "notification.vendor.reach.title";
    private static final String BODY_BASIC = "notification.vendor.reach.body.basic";
    private static final String BODY_FULL = "notification.vendor.reach.body.full";
    private static final String BODY_FULL_NO_PRO = "notification.vendor.reach.body.full_no_pro";
    private static final String CTA_KEY = "notification.cta.view_reach";

    private final EventVendorRepository eventVendorRepository;
    private final VendorReachService vendorReachService;
    private final NotificationEmitter notificationEmitter;
    private final MessageRenderer messageRenderer;
    private final VendorAuditWriter auditWriter;

    public static String dedupeKey(UUID eventVendorId) {
        return "vendor-reach:vendor:" + eventVendorId;
    }

    @Transactional
    public void send(UUID eventVendorId) {
        EventVendor vendor = eventVendorRepository.findById(eventVendorId).orElse(null);
        if (vendor == null || vendor.getRemovedAt() != null || vendor.getMember() == null || vendor.getUser() == null) {
            return;
        }
        Event event = vendor.getEvent();
        if (event.getDeletedAt() != null) {
            return;
        }
        VendorReachDto reach = vendorReachService.forVendor(vendor);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventTitle", event.getTitle());
        payload.put("guests", reach.guests());
        payload.put("listTaps", reach.listTaps());
        String bodyKey = BODY_BASIC;
        if (reach.partner()) {
            payload.put("postViewers", reach.postViewers());
            payload.put("reactions", reach.reactions());
            payload.put("comments", reach.comments());
            if (reach.proViewers() != null) {
                payload.put("proViewers", reach.proViewers());
                payload.put("proViews", reach.proViews());
                bodyKey = BODY_FULL;
            } else {
                bodyKey = BODY_FULL_NO_PRO;
            }
        }
        boolean emitted = notificationEmitter.emit(new NotificationDraft(
                vendor.getUser().getId(),
                vendor.getMember().getId(),
                NotificationType.VENDOR_REACH_SUMMARY,
                NotificationCategory.SYSTEM,
                NotificationSeverity.INFO,
                messageRenderer.render(TITLE_KEY, payload, Locale.ENGLISH),
                messageRenderer.render(bodyKey, payload, Locale.ENGLISH),
                messageRenderer.render(CTA_KEY, payload, Locale.ENGLISH),
                NotificationCtaTarget.EVENT_VENDOR_PAGE,
                Map.of("eventId", event.getId().toString()),
                null,
                dedupeKey(vendor.getId()),
                payload,
                TITLE_KEY,
                bodyKey,
                CTA_KEY));
        if (emitted) {
            auditWriter.write(event, null, "VENDOR_REACH_SUMMARY_SENT", "EventVendor", vendor.getId(),
                    Map.of("partner", reach.partner()));
            log.info("Sent the reach summary to vendor {} of event {}", vendor.getId(), event.getId());
        }
    }
}
```

The event title in the payload is the vendor's own event's title, shown only to that vendor, as in `PRINT_LIST_SENT`. It is not an audit value.

- [ ] **Step 5: Publish from the sweep and listen after commit**

`MAIN/service/vendor/VendorAccessEndedEvent.java`:

```java
package event_social_media.service.vendor;

import java.util.UUID;

/** {@link VendorAccessSweepJob} recorded that this vendor's access ended. */
public record VendorAccessEndedEvent(UUID eventVendorId) {
}
```

`MAIN/service/vendor/VendorAccessEndedListener.java`:

```java
package event_social_media.service.vendor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends the reach summary once the sweep's row for this vendor commits. A failure is logged, never retried. */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorAccessEndedListener {

    private final VendorReachSummaryNotifier notifier;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccessEnded(VendorAccessEndedEvent event) {
        try {
            notifier.send(event.eventVendorId());
        } catch (RuntimeException ex) {
            log.error("Reach summary for vendor {} failed", event.eventVendorId(), ex);
        }
    }
}
```

No `fallbackExecution`: the sweep always publishes inside its `TransactionTemplate`, and a summary for a row that never committed would be wrong.

`MAIN/service/vendor/VendorAccessSweepJob.java`: add the field `private final ApplicationEventPublisher eventPublisher;` (import `org.springframework.context.ApplicationEventPublisher`) and, in `recordIfEnded`, after the `auditWriter.write(...)` line:

```java
        eventPublisher.publishEvent(new VendorAccessEndedEvent(vendor.getId()));
```

Add to the class javadoc: "Each recorded end also publishes {@link VendorAccessEndedEvent}, which sends the vendor their reach summary after the commit (spec 2026-10-29)."

If `VendorAccessSweepJobFailureTest` builds the job by hand, add a mock `ApplicationEventPublisher` argument.

- [ ] **Step 6: Assert the sweep publishes once**

Append to `TEST/service/vendor/VendorAccessSweepJobTest.java` (add `@MockBean VendorAccessEndedListener listener;` and `@Autowired EventVendorRepository`-free code; reuse the class's fixtures):

```java
    @Test
    void sendsTheReachSummaryOncePerEndedVendor() {
        Event ended = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(ended, PartnerRole.PHOTOGRAPHER);
        support.endedDaysAgo(ended, 31);

        job.sweep();
        job.sweep();

        verify(listener, times(1)).onAccessEnded(new VendorAccessEndedEvent(vendor.getId()));
    }
```

If the class is `@Transactional`, `AFTER_COMMIT` never fires inside it: then assert on a `@MockBean VendorReachSummaryNotifier` through a test without `@Transactional` that copies `recordsEachEndedVendorOnce`'s setup into a `TransactionTemplate`, the way `VendorAccessSweepJobFailureTest` does.

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorReachSummaryNotifierTest" --tests "event_social_media.service.vendor.VendorAccessSweepJob*"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/service/vendor/VendorAccess*.java \
  src/main/java/event_social_media/service/vendor/VendorReachSummaryNotifier.java \
  src/main/resources/i18n/messages.properties src/main/resources/i18n/messages_el.properties src/test
git commit -m "feat(vendors): send each vendor their reach when access ends

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Reach in the partner portal

**Files:**
- Create: `MAIN/dto/collaboration/PartnerReachDto.java`, `MAIN/service/collaboration/PartnerReachService.java`
- Modify: `MAIN/dto/collaboration/PartnerPageDto.java`, `MAIN/service/collaboration/CollaborationPortalService.java`, `MAIN/repository/vendor/EventVendorRepository.java`
- Test: `TEST/controller/collaboration/CollaborationPortalControllerTest.java`

- [ ] **Step 1: Write the failing test**

Append to `CollaborationPortalControllerTest` (it already has `fixtures`, `adminService` and `mockMvc`; add `VendorTestSupport support`, `MediaRepository`, `ContentViewRepository`, `EventRepository`, `CollaboratorRepository` autowires and the imports):

```java
    @Test
    void reachTotalsAcrossTheirEventsWithoutTitlesOrIds() throws Exception {
        Collaborator collaborator = fixtures.newCollaborator();
        User partnerUser = fixtures.newUser();
        collaborator.setContactEmail(partnerUser.getEmail());
        collaboratorRepository.saveAndFlush(collaborator);
        String token = adminService.rotatePortalToken(collaborator.getId()).token();

        Event first = support.vendorEventHostedBy(fixtures.newUser());
        first.setTitle("Secret wedding");
        eventRepository.saveAndFlush(first);
        EventMember guest = fixtures.newMember(first, fixtures.newUser(), EventRole.ATTENDEE);
        EventVendor inFirst = support.vendorFor(first, partnerUser, PartnerRole.PHOTOGRAPHER);
        Media item = fixtures.newMedia(first, 10);
        item.setCollection(MediaCollection.PRO);
        item.setEventVendor(inFirst);
        item.setUploaderMember(inFirst.getMember());
        mediaRepository.saveAndFlush(item);
        contentViewRepository.saveAndFlush(ContentView.ofMedia(first.getId(), guest.getId(), item.getId()));

        Event deleted = support.vendorEventHostedBy(fixtures.newUser());
        support.vendorFor(deleted, partnerUser, PartnerRole.PHOTOGRAPHER);
        deleted.setDeletedAt(OffsetDateTime.now());
        eventRepository.saveAndFlush(deleted);

        mockMvc.perform(get("/api/partners/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reach.events").value(1))
                .andExpect(jsonPath("$.reach.guests").value(1))
                .andExpect(jsonPath("$.reach.proViews").value(1))
                .andExpect(jsonPath("$.reach.postViewers").value(0))
                .andExpect(jsonPath("$.reach.listTaps").value(0))
                .andExpect(jsonPath("$.reach.recent.length()").value(1))
                .andExpect(jsonPath("$.reach.recent[0].vendorType").value("PHOTOGRAPHER"))
                .andExpect(jsonPath("$.reach.recent[0].guests").value(1))
                .andExpect(jsonPath("$.reach.recent[0].views").value(1))
                .andExpect(jsonPath("$.reach.recent[0].startAt").exists())
                .andExpect(jsonPath("$.reach.recent[0].eventId").doesNotExist())
                .andExpect(jsonPath("$.reach.recent[0].title").doesNotExist())
                .andExpect(content().string(not(containsString("Secret wedding"))))
                .andExpect(content().string(not(containsString(first.getId().toString()))));
    }

    @Test
    void aPartnerWhoWasNeverAVendorHasZeroReach() throws Exception {
        Collaborator collaborator = fixtures.newCollaborator();
        String token = adminService.rotatePortalToken(collaborator.getId()).token();

        mockMvc.perform(get("/api/partners/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reach.events").value(0))
                .andExpect(jsonPath("$.reach.recent.length()").value(0));
    }
```

`support.vendorFor(event, user, type)`: `VendorTestSupport.vendor(event, type)` makes a new account each time. Add this overload to `VendorTestSupport`, built exactly like `vendor` but with the given user (its body is the same steps with `fixtures.newUser()` replaced by `user`).

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.CollaborationPortalControllerTest"`
Expected: FAIL (`$.reach` missing).

- [ ] **Step 3: Write the DTO**

`MAIN/dto/collaboration/PartnerReachDto.java`:

```java
package event_social_media.dto.collaboration;

import event_social_media.model.collaboration.PartnerRole;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * A partner's reach across every event where their account was a vendor (spec 2026-10-29). Like the rest
 * of {@link PartnerPageDto}, aggregate-only: rows carry a date, a vendor type and two counts, never an
 * event title, id or host (user decision 2026-10-29; sign-in for the portal is KAN-28).
 * {@code proViews} counts Pro item views; {@code views} in a row is Pro item views plus post views.
 */
public record PartnerReachDto(
        long events,
        long guests,
        long proViews,
        long postViewers,
        long listTaps,
        List<Event> recent) {

    public static final int RECENT_LIMIT = 10;

    public record Event(OffsetDateTime startAt, PartnerRole vendorType, long guests, long views) {
    }
}
```

`MAIN/dto/collaboration/PartnerPageDto.java`: append `PartnerReachDto reach` as the last component, and add to its javadoc: "{@code reach} is never null; a partner who was never a vendor has zeros and no rows."

- [ ] **Step 4: Find the partner's vendor rows**

`MAIN/repository/vendor/EventVendorRepository.java`:

```java
    /**
     * The vendor rows of accounts with this email (case-insensitive) that were not removed, in events that
     * were not deleted, newest event first: the partner portal's reach (spec 2026-10-29).
     */
    @Query("select v from EventVendor v join fetch v.event e join v.user u "
            + "where lower(u.email) = lower(:email) and v.removedAt is null and e.deletedAt is null "
            + "order by e.startAt desc")
    List<EventVendor> findForPartnerReach(@Param("email") String email);
```

- [ ] **Step 5: Write the service**

`MAIN/service/collaboration/PartnerReachService.java`:

```java
package event_social_media.service.collaboration;

import event_social_media.dto.collaboration.PartnerReachDto;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.event.EventRole;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.media.ContentViewRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorListClickRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Sums a partner's reach across the events where their account (matched by the partner's contact email,
 * as {@code ApprovedPartners} does) was a vendor. A partner has a few dozen events at most, so the per-row
 * counts are plain queries.
 */
@Service
@RequiredArgsConstructor
public class PartnerReachService {

    private final EventVendorRepository eventVendorRepository;
    private final EventMemberRepository eventMemberRepository;
    private final ContentViewRepository contentViewRepository;
    private final VendorListClickRepository listClickRepository;

    @Transactional(readOnly = true)
    public PartnerReachDto forCollaborator(Collaborator collaborator) {
        String email = collaborator.getContactEmail();
        List<EventVendor> rows = email == null ? List.of() : eventVendorRepository.findForPartnerReach(email);
        long guests = 0;
        long proViews = 0;
        long postViewers = 0;
        long listTaps = 0;
        List<PartnerReachDto.Event> recent = new ArrayList<>();
        for (EventVendor vendor : rows) {
            long eventGuests = eventMemberRepository.countLiveGuestMembers(vendor.getEvent().getId(), EventRole.HOST);
            long eventProViews = contentViewRepository.countProViews(vendor.getId());
            long eventPostViews = vendor.getMember() == null ? 0
                    : contentViewRepository.countPostViews(vendor.getMember().getId());
            long eventPostViewers = vendor.getMember() == null ? 0
                    : contentViewRepository.countPostViewers(vendor.getMember().getId());
            guests += eventGuests;
            proViews += eventProViews;
            postViewers += eventPostViewers;
            listTaps += listClickRepository.countByEventVendorId(vendor.getId());
            if (recent.size() < PartnerReachDto.RECENT_LIMIT) {
                recent.add(new PartnerReachDto.Event(vendor.getEvent().getStartAt(), vendor.getVendorType(),
                        eventGuests, eventProViews + eventPostViews));
            }
        }
        return new PartnerReachDto(rows.size(), guests, proViews, postViewers, listTaps, recent);
    }
}
```

`CollaborationPortalService`: add the field `private final PartnerReachService partnerReachService;` and pass `partnerReachService.forCollaborator(collaborator)` as the last argument of `new PartnerPageDto(...)`. Then:

Run: `grep -rn "new PartnerPageDto(" src/` — append `null` (tests) or a real value to every other call.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.collaboration.CollaborationPortalControllerTest"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/dto/collaboration src/main/java/event_social_media/service/collaboration \
  src/main/java/event_social_media/repository/vendor/EventVendorRepository.java src/test
git commit -m "feat(partners): reach totals in the partner portal, without event titles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Data export, guard tests, full suite

**Files:**
- Modify: `MAIN/dto/user/export/UserDataExportDto.java`, `MAIN/service/user/export/MeDataExportService.java`, `TEST/security/VendorEndpointParityTest.java`
- Test: `TEST/service/vendor/VendorAccountDataTest.java`, `TEST/service/vendor/VendorAuditPiiScanTest.java`

- [ ] **Step 1: Write the failing export test**

Append to `TEST/service/vendor/VendorAccountDataTest.java` (it already exports an account; reuse its helpers for "export as this user" and parsing):

```java
    @Test
    void theExportHasTheMembersOwnViews() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        User guest = fixtures.newUser();
        EventMember member = fixtures.newMember(event, guest, EventRole.ATTENDEE);
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        Media item = fixtures.newMedia(event, 10);
        item.setCollection(MediaCollection.PRO);
        item.setEventVendor(photographer);
        mediaRepository.saveAndFlush(item);
        contentViewRepository.saveAndFlush(ContentView.ofMedia(event.getId(), member.getId(), item.getId()));

        UserDataExportDto export = meDataExportService.export(guest.getId());

        assertThat(export.events()).singleElement().satisfies(membership ->
                assertThat(membership.contentViews()).singleElement().satisfies(view -> {
                    assertThat(view.mediaId()).isEqualTo(item.getId());
                    assertThat(view.postId()).isNull();
                    assertThat(view.viewedAt()).isNotNull();
                }));
    }
```

Use the export entry point and the `events()` accessor name `UserDataExportDto` has (open it: the list of `EventMembership`).

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccountDataTest"`
Expected: compilation FAIL (`contentViews` missing).

- [ ] **Step 3: Add `contentViews` to the export**

`UserDataExportDto.java`: add, next to the other nested records,

```java
    /** One Pro item or vendor post the member saw (spec 2026-10-29); exactly one id is set. */
    public record ContentView(UUID mediaId, UUID postId, OffsetDateTime viewedAt) {
    }
```

and in `EventMembership` put `List<ContentView> contentViews` right after `List<UUID> storiesViewed`.

`MeDataExportService.java`: after the `storyViews` map,

```java
        Map<UUID, List<UserDataExportDto.ContentView>> contentViews = byMember(
                listIn("select v from ContentView v where v.memberId in :ids order by v.viewedAt", memberIds,
                        event_social_media.model.media.ContentView.class),
                event_social_media.model.media.ContentView::getMemberId,
                v -> new UserDataExportDto.ContentView(v.getMediaId(), v.getPostId(), v.getViewedAt()));
```

and in the `new EventMembership(` call, after `storyViews.getOrDefault(m.getId(), List.of()),`:

```java
                contentViews.getOrDefault(m.getId(), List.of()),
```

Run: `grep -rn "new EventMembership(\|new UserDataExportDto.EventMembership(" src/` — add `List.of()` in the same position in every other call.

- [ ] **Step 4: Run it**

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccountDataTest" --tests "event_social_media.service.user.export.*"`
Expected: PASS. A JSON snapshot test of the export (if one exists) needs `"contentViews":[]` added where `storiesViewed` is.

- [ ] **Step 5: Open the new endpoints in the parity test**

`TEST/security/VendorEndpointParityTest.java`, after `OPENED_BY_PRINT_PICKS`:

```java
    /** The sneak peek (spec 2026-10-29): post, edit and delete their own; and every vendor's reach report. */
    private static final Set<String> OPENED_BY_SNEAK_PEEK_AND_REACH = Set.of(
            "SneakPeekController#create", "SneakPeekController#update", "SneakPeekController#delete",
            "VendorReachController#me");
```

Add `OPENED_BY_SNEAK_PEEK_AND_REACH` to the `union(...)` of `OPENED`. In `BODIES`:

```java
            entry("SneakPeekController#create", "{\"mediaIds\":[\"<media>\"],\"content\":\"First look\"}"),
            entry("SneakPeekController#update", "{\"content\":\"First look\"}"),
            entry("ContentViewController#record", "{\"mediaIds\":[\"<media>\"],\"postIds\":[\"<post>\"]}"),
```

`ContentViewController#record` is not opened: a vendor and an attendee both get 204. The host gets 403 on the sneak peek endpoints (`requireVendor` runs first), which is past validation, so `everyMutatingEndpointReachesItsAuthorizationCheck` holds.

- [ ] **Step 6: Run the guard tests**

Run: `./gradlew test --tests "event_social_media.security.VendorEndpointParityTest" --tests "event_social_media.service.vendor.VendorAuditPiiScanTest" --tests "event_social_media.service.vendor.VendorAuditWriterTest"`
Expected: PASS. If the PII scan seeds one row per audit action, add `SNEAK_PEEK_CREATE`, `SNEAK_PEEK_UPDATE`, `SNEAK_PEEK_DELETE`, `SNEAK_PEEK_NOTIFIED` and `VENDOR_REACH_SUMMARY_SENT` the way it seeds `PRINT_LIST_SEND`.

- [ ] **Step 7: Run the whole suite**

Run: `./gradlew test` (Docker running, so the Postgres tests run too)
Expected: BUILD SUCCESSFUL. Fix any failure before going on; a test that also fails on `staging` without these commits is not this plan's to fix, but say so in the PR.

- [ ] **Step 8: Update the graph and commit**

```bash
graphify update .
git add -A src
git commit -m "feat(vendors): views in the data export; parity and audit guards cover the new endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Hand back**

Do not push. Tell the user the branch `feat/vendor-reach-and-sneak-peek` is ready, list the new endpoints and the migration number, and ask whether to push and open the PR into `staging`. The frontend plan's tasks that call these endpoints can run against `next dev` with this branch's `bootRun` on `:8080` before it merges.
