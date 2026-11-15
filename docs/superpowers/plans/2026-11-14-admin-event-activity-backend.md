# Admin event Activity: backend plan (KAN-214, guestwall-be)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/admin/events/{eventId}/activity`, which returns anonymous counts and hour-by-hour activity for one event.

**Architecture:** A native-Postgres Spring Data repository, `EventActivityRepository`, follows the `FunnelMetricsRepository` pattern: SQL fragments shared as `String` constants, and interface projections. `EventActivityService` resolves the event's time zone and decides which module counts are shown. It also assembles one `AdminEventActivityDto`. `AdminEventController` exposes the result. The queries use `FILTER`, `date_trunc` and `AT TIME ZONE`, so they are tested on real Postgres (`PostgresTestBase`) and never on the H2 suite.

**Tech stack:** Java 21, Spring Boot, Spring Data JPA (native queries), Postgres 16, JUnit 5, AssertJ, MockMvc.

**Spec:** `storywall/docs/superpowers/specs/2026-11-14-admin-event-activity-design.md`

---

## Setup

Repo: `C:\Users\User\IdeaProjects\event_social_media`. The local `staging` there is far behind, so work in a fresh worktree:

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add ../event_social_media-kan-214 -b claude/kan-214-admin-event-activity origin/staging
cd ../event_social_media-kan-214
```

Run every command below from that worktree. Commit messages start with `KAN-214:` and end with the `Co-Authored-By` line.

## Files

| File | Responsibility |
|---|---|
| Create `src/main/java/event_social_media/dto/event/admin/AdminEventActivityDto.java` | The response record and its nested records |
| Create `src/main/java/event_social_media/repository/event/EventActivityRepository.java` | All native count queries; counts only, no ids or names |
| Create `src/main/java/event_social_media/service/event/EventActivityService.java` | Time zone, module rules, assembly |
| Modify `src/main/java/event_social_media/controller/event/AdminEventController.java` | `GET /{eventId}/activity` |
| Create `src/test/java/event_social_media/service/event/EventActivityPostgresTest.java` | Counts, removal, gallery rule, hours, time zones, modules |
| Create `src/test/java/event_social_media/service/event/EventActivityServiceZoneTest.java` | Pure unit test for zone fallback |
| Modify `src/test/java/event_social_media/controller/event/AdminEventControllerActivityTest.java` (create) | 403 for non-admins, 404 for an unknown event |

## Definitions used by every query

These are the spec's definitions, written as SQL:

- **Live member**: `event_members.deleted_at is null and reply_only = false`. Reply-only guests only answered the RSVP form, and the funnel already treats them as non-members.
- **Live post**: `posts.deleted_at is null`.
- **Gallery upload**: a `media` row of the event with `collection = 'GUEST'` and `status <> 'FAILED'` that is referenced by no `post_media` row and no `stories` row. `FAILED` uploads are left out because they never showed in the gallery.
- **Via QR**: a gallery upload with `uploader_member_id is null`.
- **Professional upload**: the same rule with `collection = 'PRO'`.
- **Hours**: `created_at` is `TIMESTAMPTZ` (see `V2__media_and_social.sql`). `created_at at time zone :tz` gives the local wall-clock time, and `date_trunc('hour', ...)` buckets it.

---

### Task 1: Response DTO

**Files:** Create `src/main/java/event_social_media/dto/event/admin/AdminEventActivityDto.java`

- [ ] **Step 1: Write the record**

```java
package event_social_media.dto.event.admin;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * One event's activity for the admin Activity tab. Anonymous counts only: no ids, names, captions
 * or media. Removed content is left out of every count except {@link Removed}. {@link Hour#hour()}
 * is a local wall-clock hour in {@link #timezone()}, formatted {@code yyyy-MM-ddTHH:00}, and only
 * hours with activity are listed.
 *
 * <p>A module's value ({@code wishes}, {@code playlist}, {@code quizAnswers}, {@code rsvp}) is null
 * when the event never had that module on and has no data for it.
 */
public record AdminEventActivityDto(
        String timezone,
        OffsetDateTime eventStartAt,
        OffsetDateTime eventEndAt,
        Instant generatedAt,
        Members members,
        Totals totals,
        Removed removed,
        List<Hour> hours) {

    public record Members(long total, long contributed) {}

    public record Totals(
            long posts,
            long postMedia,
            long stories,
            long storyViews,
            long galleryUploads,
            long galleryViaQr,
            long proUploads,
            long comments,
            long reactions,
            List<ReactionCount> reactionsByType,
            Long wishes,
            Playlist playlist,
            Long quizAnswers,
            Rsvp rsvp) {}

    public record ReactionCount(String code, String emoji, long count) {}

    public record Playlist(long suggestions, long votes) {}

    public record Rsvp(long attending, long declined) {}

    public record Removed(long posts, long stories, long galleryUploads, long comments, long wishes) {

        public long total() {
            return posts + stories + galleryUploads + comments + wishes;
        }
    }

    public record Hour(String hour, long posts, long stories, long gallery, long wishes) {}
}
```

`Removed.total()` is a method, not a component, so Jackson does not serialize it. The frontend adds the parts itself.

- [ ] **Step 2: Compile**

Run: `./gradlew compileJava -q`
Expected: BUILD SUCCESSFUL, no output.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/event_social_media/dto/event/admin/AdminEventActivityDto.java
git commit -m "KAN-214: Add the admin event activity response

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Totals query (TDD on Postgres)

**Files:**
- Create: `src/main/java/event_social_media/repository/event/EventActivityRepository.java`
- Create: `src/test/java/event_social_media/service/event/EventActivityPostgresTest.java`

- [ ] **Step 1: Write the failing test**

Before writing it, check the exact signatures of `TestFixtures.newMedia/newPost/newComment/newStory/newWishbookEntry/newMember/newEvent/newUser` in `src/test/java/event_social_media/support/TestFixtures.java`. The test assumes `newStory` creates its own media. If it doesn't, call `newMedia` and set it on the story.

```java
package event_social_media.service.event;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.media.Post;
import event_social_media.model.media.PostMedia;
import event_social_media.repository.event.EventActivityRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.media.PostMediaRepository;
import event_social_media.support.PostgresTestBase;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link EventActivityRepository} and {@link EventActivityService} against real Postgres: the
 * queries use {@code FILTER}, {@code date_trunc} and {@code AT TIME ZONE}, which the H2 suite cannot
 * run. Every row belongs to one fresh event, so the counts are immune to other classes' data.
 * {@code @Transactional} rolls them back.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.seed.enabled=false",
        "app.notifications.sweep.enabled=false"
})
@Transactional
class EventActivityPostgresTest extends PostgresTestBase {

    @Autowired private EventActivityRepository repository;
    @Autowired private TestFixtures fixtures;
    @Autowired private MediaRepository mediaRepository;
    @Autowired private PostMediaRepository postMediaRepository;
    @Autowired private JdbcTemplate jdbc;

    private Event event;
    private EventMember alice;
    private EventMember bob;

    @BeforeEach
    void setUp() {
        event = fixtures.newEvent();
        alice = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        bob = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
    }

    @Test
    void totals_countLiveContentAndRemovedSeparately() {
        Post live = fixtures.newPost(event, alice);
        Post removed = fixtures.newPost(event, bob);
        softDelete("posts", removed.getId());
        attach(live, fixtures.newMedia(event, 10));
        attach(live, fixtures.newMedia(event, 10));
        fixtures.newComment(live, bob);
        softDelete("comments", fixtures.newComment(live, alice).getId());

        var row = repository.totals(event.getId());

        assertThat(row.getPosts()).isEqualTo(1);
        assertThat(row.getRemovedPosts()).isEqualTo(1);
        assertThat(row.getPostMedia()).isEqualTo(2);
        assertThat(row.getComments()).isEqualTo(1);
        assertThat(row.getRemovedComments()).isEqualTo(1);
        assertThat(row.getMembers()).isEqualTo(2);
    }

    @Test
    void gallery_leavesOutPostAndStoryMediaAndSplitsQrAndPro() {
        attach(fixtures.newPost(event, alice), fixtures.newMedia(event, 10)); // post media
        fixtures.newStory(event, alice);                                        // story media
        Media memberUpload = fixtures.newMedia(event, 10);
        memberUpload.setUploaderMember(alice);
        mediaRepository.saveAndFlush(memberUpload);
        fixtures.newMedia(event, 10);                                           // QR: no uploader
        Media pro = fixtures.newMedia(event, 10);
        pro.setCollection(MediaCollection.PRO);
        mediaRepository.saveAndFlush(pro);
        Media failed = fixtures.newMedia(event, 10);
        jdbc.update("update media set status = 'FAILED' where id = ?", failed.getId());
        softDelete("media", fixtures.newMedia(event, 10).getId());

        var row = repository.totals(event.getId());

        assertThat(row.getGalleryUploads()).isEqualTo(2);
        assertThat(row.getGalleryViaQr()).isEqualTo(1);
        assertThat(row.getProUploads()).isEqualTo(1);
        assertThat(row.getRemovedGallery()).isEqualTo(1);
        assertThat(row.getStories()).isEqualTo(1);
    }

    private void attach(Post post, Media media) {
        PostMedia link = new PostMedia();
        link.setPost(post);
        link.setMedia(media);
        link.setDisplayOrder(0);
        postMediaRepository.saveAndFlush(link);
    }

    private void softDelete(String table, UUID id) {
        jdbc.update("update " + table + " set deleted_at = now() where id = ?", id);
    }
}
```

If `PostMediaRepository` lives in another package, fix the import. Find it with `git grep -l "interface PostMediaRepository"`.

- [ ] **Step 2: Run it and check it fails**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivityPostgresTest"`
Expected: a compilation failure, because `EventActivityRepository` does not exist yet.

- [ ] **Step 3: Write the repository with the totals query**

```java
package event_social_media.repository.event;

import event_social_media.model.event.Event;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * The counts behind {@code GET /api/admin/events/{eventId}/activity}. All native Postgres, tested in
 * {@code EventActivityPostgresTest}, never on the H2 suite. Counts only: no query returns an id,
 * a name or any content.
 *
 * <p>Shared definitions: a <b>live member</b> is not deleted and not reply-only. A <b>gallery
 * upload</b> ({@link #GALLERY}) is media in the given collection that is in no post and no story
 * and did not fail processing.
 */
public interface EventActivityRepository extends Repository<Event, UUID> {

    /** For {@code media md}: the event and gallery rule; each query adds its own collection and deleted check. */
    String GALLERY = """
            md.event_id = :eventId and md.status <> 'FAILED'
              and not exists (select 1 from post_media pm where pm.media_id = md.id)
              and not exists (select 1 from stories st where st.media_id = md.id)""";

    @Query(value = """
            select
              (select count(*) from event_members m
                 where m.event_id = :eventId and m.deleted_at is null and m.reply_only = false) as "members",
              (select count(*) from posts p where p.event_id = :eventId and p.deleted_at is null) as "posts",
              (select count(*) from posts p where p.event_id = :eventId and p.deleted_at is not null) as "removedPosts",
              (select count(*) from post_media pm
                 join posts p on p.id = pm.post_id join media md on md.id = pm.media_id
                 where p.event_id = :eventId and p.deleted_at is null and md.deleted_at is null) as "postMedia",
              (select count(*) from stories s where s.event_id = :eventId and s.deleted_at is null) as "stories",
              (select count(*) from stories s where s.event_id = :eventId and s.deleted_at is not null) as "removedStories",
              (select count(*) from story_views v join stories s on s.id = v.story_id
                 where s.event_id = :eventId and s.deleted_at is null) as "storyViews",
              (select count(*) from media md where """ + GALLERY + """
                 and md.collection = 'GUEST' and md.deleted_at is null) as "galleryUploads",
              (select count(*) from media md where """ + GALLERY + """
                 and md.collection = 'GUEST' and md.deleted_at is null and md.uploader_member_id is null) as "galleryViaQr",
              (select count(*) from media md where """ + GALLERY + """
                 and md.collection = 'GUEST' and md.deleted_at is not null) as "removedGallery",
              (select count(*) from media md where """ + GALLERY + """
                 and md.collection = 'PRO' and md.deleted_at is null) as "proUploads",
              (select count(*) from comments c join posts p on p.id = c.post_id
                 where p.event_id = :eventId and p.deleted_at is null and c.deleted_at is null) as "comments",
              (select count(*) from comments c join posts p on p.id = c.post_id
                 where p.event_id = :eventId and c.deleted_at is not null) as "removedComments",
              (select count(*) from reactions r join posts p on p.id = r.post_id
                 where p.event_id = :eventId and p.deleted_at is null) as "reactions",
              (select count(*) from wishbook_entries w
                 where w.event_id = :eventId and w.deleted_at is null) as "wishes",
              (select count(*) from wishbook_entries w
                 where w.event_id = :eventId and w.deleted_at is not null) as "removedWishes",
              (select count(*) from playlist_suggestions ps
                 where ps.event_id = :eventId and ps.deleted_at is null) as "playlistSuggestions",
              (select count(*) from playlist_votes pv join playlist_suggestions ps on ps.id = pv.playlist_suggestion_id
                 where ps.event_id = :eventId and ps.deleted_at is null) as "playlistVotes",
              (select count(*) from quiz_answers a join quiz_questions q on q.id = a.question_id
                 join quizzes z on z.id = q.quiz_id where z.event_id = :eventId) as "quizAnswers",
              (select count(*) from rsvps r join event_members m on m.id = r.event_member_id
                 where m.event_id = :eventId and r.attendance_status = 'ATTENDING') as "rsvpAttending",
              (select count(*) from rsvps r join event_members m on m.id = r.event_member_id
                 where m.event_id = :eventId and r.attendance_status = 'DECLINED') as "rsvpDeclined"
            """, nativeQuery = true)
    TotalsRow totals(@Param("eventId") UUID eventId);

    interface TotalsRow {
        long getMembers();
        long getPosts();
        long getRemovedPosts();
        long getPostMedia();
        long getStories();
        long getRemovedStories();
        long getStoryViews();
        long getGalleryUploads();
        long getGalleryViaQr();
        long getRemovedGallery();
        long getProUploads();
        long getComments();
        long getRemovedComments();
        long getReactions();
        long getWishes();
        long getRemovedWishes();
        long getPlaylistSuggestions();
        long getPlaylistVotes();
        long getQuizAnswers();
        long getRsvpAttending();
        long getRsvpDeclined();
    }
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivityPostgresTest"`
Expected: PASS, 2 tests. If a projection getter fails with a type conversion error, change the `long` getters to `Long`.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/repository/event/EventActivityRepository.java src/test/java/event_social_media/service/event/EventActivityPostgresTest.java
git commit -m "KAN-214: Count an event's live and removed content

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Reactions by type, contributors, enabled modules

**Files:** Modify `EventActivityRepository.java` and `EventActivityPostgresTest.java`

- [ ] **Step 1: Add the failing tests to `EventActivityPostgresTest`**

```java
    @Test
    void contributed_countsDistinctLiveMembersWhoCreatedSomething() {
        Post post = fixtures.newPost(event, alice);
        fixtures.newComment(post, alice);
        fixtures.newWishbookEntry(event, alice);
        EventMember carol = fixtures.newMember(event, fixtures.newUser(), EventRole.ATTENDEE);
        softDelete("posts", fixtures.newPost(event, carol).getId());   // only removed content

        assertThat(repository.contributed(event.getId())).isEqualTo(1);
    }

    @Test
    void reactionsByType_groupsLiveReactionsByCode() {
        Post post = fixtures.newPost(event, alice);
        jdbc.update("""
                insert into reactions (id, post_id, member_id, reaction_type_id, created_at, updated_at)
                select gen_random_uuid(), ?, ?, rt.id, now(), now()
                from reaction_types rt where rt.event_type_key = ? order by rt.sort_order limit 1""",
                post.getId(), bob.getId(), event.getEventType());

        var rows = repository.reactionsByType(event.getId());

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getTotal()).isEqualTo(1);
        assertThat(rows.get(0).getCode()).isNotBlank();
    }

    @Test
    void enabledModuleKeys_listsOnlyEnabledRows() {
        jdbc.update("update event_modules set is_enabled = false where event_id = ?", event.getId());
        jdbc.update("update event_modules set is_enabled = true where event_id = ? and module_key = 'wishbook'",
                event.getId());

        var keys = repository.enabledModuleKeys(event.getId());

        assertThat(keys).allMatch("wishbook"::equals);
    }
```

Before running, check the `reactions` columns in the migrations with `git grep -n "CREATE TABLE reactions" -A12 src/main/resources/db/migration`. If `updated_at` is absent, drop it from the insert. Also check `Event.getEventType()`'s return type: if it is an enum, pass `.name()`. If `fixtures.newEvent()` creates no `event_modules` rows, the module test still passes, because `allMatch` on an empty list is true. In that case insert a `wishbook` row first:

```java
jdbc.update("insert into event_modules (id, event_id, module_key, is_enabled, configuration, created_at, updated_at) "
        + "values (gen_random_uuid(), ?, 'wishbook', true, '{}'::jsonb, now(), now())", event.getId());
```

Then assert `containsExactly("wishbook")`. Check the `event_modules` columns first.

- [ ] **Step 2: Run them and check they fail**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivityPostgresTest"`
Expected: compilation failure, because `contributed`, `reactionsByType` and `enabledModuleKeys` are missing.

- [ ] **Step 3: Add the queries to `EventActivityRepository`**

```java
    /** Distinct live members with at least one live post, story, gallery upload, comment, reaction or wish. */
    @Query(value = """
            select count(distinct x.member_id) from (
              select p.author_member_id as member_id from posts p
                where p.event_id = :eventId and p.deleted_at is null
              union all
              select s.author_member_id from stories s
                where s.event_id = :eventId and s.deleted_at is null
              union all
              select md.uploader_member_id from media md
                where """ + GALLERY + """
                 and md.collection = 'GUEST' and md.deleted_at is null
              union all
              select c.author_member_id from comments c join posts p on p.id = c.post_id
                where p.event_id = :eventId and p.deleted_at is null and c.deleted_at is null
              union all
              select r.member_id from reactions r join posts p on p.id = r.post_id
                where p.event_id = :eventId and p.deleted_at is null
              union all
              select w.author_member_id from wishbook_entries w
                where w.event_id = :eventId and w.deleted_at is null
            ) x
            join event_members m on m.id = x.member_id
            where m.deleted_at is null and m.reply_only = false
            """, nativeQuery = true)
    long contributed(@Param("eventId") UUID eventId);

    @Query(value = """
            select rt.code as "code", rt.emoji as "emoji", count(*) as "total"
            from reactions r
            join posts p on p.id = r.post_id
            join reaction_types rt on rt.id = r.reaction_type_id
            where p.event_id = :eventId and p.deleted_at is null
            group by rt.code, rt.emoji, rt.sort_order
            order by rt.sort_order, rt.code
            """, nativeQuery = true)
    List<ReactionRow> reactionsByType(@Param("eventId") UUID eventId);

    @Query(value = """
            select em.module_key from event_modules em
            where em.event_id = :eventId and em.is_enabled = true
            """, nativeQuery = true)
    List<String> enabledModuleKeys(@Param("eventId") UUID eventId);

    interface ReactionRow {
        String getCode();
        String getEmoji();
        long getTotal();
    }
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivityPostgresTest"`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "KAN-214: Count contributors, reactions by type and enabled modules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Hour buckets in the event's time zone

**Files:** Modify `EventActivityRepository.java` and `EventActivityPostgresTest.java`

- [ ] **Step 1: Add the failing tests**

```java
    @Test
    void hours_bucketByLocalHourAcrossMidnight() {
        // 20:30Z and 21:10Z on 14 June are 23:30 and 00:10 in Athens (UTC+3, summer time).
        setCreated("posts", fixtures.newPost(event, alice).getId(), "2026-06-14T20:30:00Z");
        setCreated("posts", fixtures.newPost(event, alice).getId(), "2026-06-14T20:45:00Z");
        setCreated("wishbook_entries", fixtures.newWishbookEntry(event, bob).getId(), "2026-06-14T21:10:00Z");
        Post removed = fixtures.newPost(event, bob);
        setCreated("posts", removed.getId(), "2026-06-14T20:50:00Z");
        softDelete("posts", removed.getId());

        var rows = repository.hours(event.getId(), "Europe/Athens");

        assertThat(rows).extracting(EventActivityRepository.HourRow::getHour)
                .containsExactly("2026-06-14T23", "2026-06-15T00");
        assertThat(rows.get(0).getPosts()).isEqualTo(2);
        assertThat(rows.get(0).getWishes()).isZero();
        assertThat(rows.get(1).getWishes()).isEqualTo(1);
    }

    @Test
    void hours_followTheDaylightSavingChange() {
        // Athens leaves summer time at 04:00 local on 25 Oct 2026, so 00:30Z and 01:30Z are both 03:30 local.
        setCreated("posts", fixtures.newPost(event, alice).getId(), "2026-10-25T00:30:00Z");
        setCreated("posts", fixtures.newPost(event, alice).getId(), "2026-10-25T01:30:00Z");

        var rows = repository.hours(event.getId(), "Europe/Athens");

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getHour()).isEqualTo("2026-10-25T03");
        assertThat(rows.get(0).getPosts()).isEqualTo(2);
    }

    private void setCreated(String table, UUID id, String instant) {
        jdbc.update("update " + table + " set created_at = ?::timestamptz where id = ?", instant, id);
    }
```

The DST case shows the known limit: two different hours fold into one wall-clock bucket. That is the right behavior for a local-time chart.

- [ ] **Step 2: Run them and check they fail**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivityPostgresTest"`
Expected: compilation failure, because `hours` is missing.

- [ ] **Step 3: Add the query**

```java
    /**
     * Posts, stories, gallery uploads and wishes per local hour in {@code :tz} (an IANA zone id),
     * oldest first, only hours with activity. {@code hour} is {@code yyyy-MM-ddTHH}; the service
     * appends {@code :00}. The format avoids a {@code :00} literal that the query parser could read as
     * a parameter.
     */
    @Query(value = """
            with items as (
              select 'posts' as kind, p.created_at from posts p
                where p.event_id = :eventId and p.deleted_at is null
              union all
              select 'stories', s.created_at from stories s
                where s.event_id = :eventId and s.deleted_at is null
              union all
              select 'gallery', md.created_at from media md
                where """ + GALLERY + """
                 and md.collection = 'GUEST' and md.deleted_at is null
              union all
              select 'wishes', w.created_at from wishbook_entries w
                where w.event_id = :eventId and w.deleted_at is null
            )
            select to_char(date_trunc('hour', created_at at time zone :tz), 'YYYY-MM-DD"T"HH24') as "hour",
                   count(*) filter (where kind = 'posts') as "posts",
                   count(*) filter (where kind = 'stories') as "stories",
                   count(*) filter (where kind = 'gallery') as "gallery",
                   count(*) filter (where kind = 'wishes') as "wishes"
            from items
            group by 1
            order by 1
            """, nativeQuery = true)
    List<HourRow> hours(@Param("eventId") UUID eventId, @Param("tz") String tz);

    interface HourRow {
        String getHour();
        long getPosts();
        long getStories();
        long getGallery();
        long getWishes();
    }
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivityPostgresTest"`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "KAN-214: Bucket an event's activity by local hour

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Service, with the time zone and module rules

**Files:**
- Create: `src/main/java/event_social_media/service/event/EventActivityService.java`
- Create: `src/test/java/event_social_media/service/event/EventActivityServiceZoneTest.java`
- Modify: `EventActivityPostgresTest.java`

- [ ] **Step 1: Write the failing unit test for the zone fallback**

```java
package event_social_media.service.event;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EventActivityServiceZoneTest {

    @Test
    void usesTheEventZone() {
        assertThat(EventActivityService.zoneOf("Europe/London").getId()).isEqualTo("Europe/London");
    }

    @Test
    void fallsBackToAthensWhenMissingOrInvalid() {
        assertThat(EventActivityService.zoneOf(null).getId()).isEqualTo("Europe/Athens");
        assertThat(EventActivityService.zoneOf(" ").getId()).isEqualTo("Europe/Athens");
        assertThat(EventActivityService.zoneOf("Mars/Olympus").getId()).isEqualTo("Europe/Athens");
    }
}
```

- [ ] **Step 2: Add the failing service tests to `EventActivityPostgresTest`**

```java
    @Autowired private EventActivityService service;

    @Test
    void activity_hidesModulesTheEventNeverHadAndShowsOnesWithData() {
        jdbc.update("update event_modules set is_enabled = false where event_id = ?", event.getId());
        fixtures.newWishbookEntry(event, alice);   // data without the module on: still shown

        var dto = service.activity(event.getId());

        assertThat(dto.totals().wishes()).isEqualTo(1L);
        assertThat(dto.totals().playlist()).isNull();
        assertThat(dto.totals().quizAnswers()).isNull();
        assertThat(dto.totals().rsvp()).isNull();
        assertThat(dto.members().total()).isEqualTo(2);
        assertThat(dto.members().contributed()).isEqualTo(1);
    }

    @Test
    void activity_formatsHoursWithMinutes() {
        jdbc.update("update events set timezone = 'Europe/Athens' where id = ?", event.getId());
        setCreated("posts", fixtures.newPost(event, alice).getId(), "2026-06-14T20:30:00Z");

        var dto = service.activity(event.getId());

        assertThat(dto.timezone()).isEqualTo("Europe/Athens");
        assertThat(dto.hours()).extracting(h -> h.hour()).containsExactly("2026-06-14T23:00");
    }
```

- [ ] **Step 3: Run them and check they fail**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivity*"`
Expected: compilation failure, because `EventActivityService` is missing.

- [ ] **Step 4: Write the service**

```java
package event_social_media.service.event;

import event_social_media.dto.event.admin.AdminEventActivityDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.Event;
import event_social_media.repository.event.EventActivityRepository;
import event_social_media.repository.event.EventRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The admin Activity tab for one event: anonymous counts and local-hour activity, counted live on
 * each request. A module's count is shown when the module is on for the event or already has data,
 * so turning a module off later does not hide what guests made with it.
 */
@Service
@RequiredArgsConstructor
public class EventActivityService {

    static final String DEFAULT_ZONE = "Europe/Athens";
    private static final Set<String> QUIZ_MODULES = Set.of("quiz_polls", "he_or_she");

    private final EventRepository eventRepository;
    private final EventActivityRepository repository;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    @Transactional(readOnly = true)
    public AdminEventActivityDto activity(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        ZoneId zone = zoneOf(event.getTimezone());

        EventActivityRepository.TotalsRow t = repository.totals(eventId);
        Set<String> modules = Set.copyOf(repository.enabledModuleKeys(eventId));

        List<AdminEventActivityDto.ReactionCount> reactions = repository.reactionsByType(eventId).stream()
                .map(r -> new AdminEventActivityDto.ReactionCount(r.getCode(), r.getEmoji(), r.getTotal()))
                .toList();
        List<AdminEventActivityDto.Hour> hours = repository.hours(eventId, zone.getId()).stream()
                .map(h -> new AdminEventActivityDto.Hour(h.getHour() + ":00",
                        h.getPosts(), h.getStories(), h.getGallery(), h.getWishes()))
                .toList();

        boolean wishbook = modules.contains("wishbook") || t.getWishes() + t.getRemovedWishes() > 0;
        boolean playlist = modules.contains("playlist") || t.getPlaylistSuggestions() > 0;
        boolean quiz = modules.stream().anyMatch(QUIZ_MODULES::contains) || t.getQuizAnswers() > 0;
        boolean rsvp = modules.contains("rsvp") || t.getRsvpAttending() + t.getRsvpDeclined() > 0;

        var totals = new AdminEventActivityDto.Totals(
                t.getPosts(), t.getPostMedia(), t.getStories(), t.getStoryViews(),
                t.getGalleryUploads(), t.getGalleryViaQr(), t.getProUploads(),
                t.getComments(), t.getReactions(), reactions,
                wishbook ? t.getWishes() : null,
                playlist ? new AdminEventActivityDto.Playlist(t.getPlaylistSuggestions(), t.getPlaylistVotes()) : null,
                quiz ? t.getQuizAnswers() : null,
                rsvp ? new AdminEventActivityDto.Rsvp(t.getRsvpAttending(), t.getRsvpDeclined()) : null);
        var removed = new AdminEventActivityDto.Removed(t.getRemovedPosts(), t.getRemovedStories(),
                t.getRemovedGallery(), t.getRemovedComments(), t.getRemovedWishes());

        return new AdminEventActivityDto(zone.getId(), event.getStartAt(), event.getEndAt(), clock.instant(),
                new AdminEventActivityDto.Members(t.getMembers(), repository.contributed(eventId)),
                totals, removed, hours);
    }

    static ZoneId zoneOf(String timezone) {
        if (timezone == null || timezone.isBlank()) return ZoneId.of(DEFAULT_ZONE);
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException e) {
            return ZoneId.of(DEFAULT_ZONE);
        }
    }
}
```

Check that `ResourceNotFoundException` has a `(String, UUID)` constructor. `AdminEventService.detail` uses exactly that, so it does.

- [ ] **Step 5: Run the tests and check they pass**

Run: `./gradlew test --tests "event_social_media.service.event.EventActivity*"`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "KAN-214: Assemble an event's activity in its own time zone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Controller endpoint

**Files:**
- Modify: `src/main/java/event_social_media/controller/event/AdminEventController.java`
- Create: `src/test/java/event_social_media/controller/event/AdminEventControllerActivityTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.event;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Access and lookup for {@code /activity}. The 200 path runs native Postgres SQL and is covered by
 * {@code EventActivityPostgresTest}; neither check here reaches the query.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminEventControllerActivityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "USER")
    void activity_asANonAdmin_isForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/events/{id}/activity", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void activity_ofAnUnknownEvent_isNotFound() throws Exception {
        mockMvc.perform(get("/api/admin/events/{id}/activity", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run it and check it fails**

Run: `./gradlew test --tests "event_social_media.controller.event.AdminEventControllerActivityTest"`
Expected: `activity_ofAnUnknownEvent_isNotFound` FAILS (404 from no handler is possible, so if it passes by accident, confirm after Step 3 that a known event returns 200 in the Postgres test). `activity_asANonAdmin_isForbidden` may already pass thanks to the class-level `@PreAuthorize`.

- [ ] **Step 3: Add the endpoint**

In `AdminEventController.java`:
- Add `import event_social_media.dto.event.admin.AdminEventActivityDto;` and `import event_social_media.service.event.EventActivityService;`.
- Add the field `private final EventActivityService eventActivityService;` after `vendorService`.
- Add the method after `vendors`:

```java
    @Operation(summary = "The event's activity: anonymous counts and local-hour buckets, counted live")
    @GetMapping("/{eventId}/activity")
    public AdminEventActivityDto activity(@PathVariable UUID eventId) {
        return eventActivityService.activity(eventId);
    }
```

Update the class Javadoc line "Nothing posted to an event is exposed here." to: "Nothing posted to an event is exposed here; `/activity` returns counts of it only."

- [ ] **Step 4: Add a 200 check to `EventActivityPostgresTest` through MockMvc**

Native SQL needs Postgres, so the 200 path lives here. Add `@AutoConfigureMockMvc` to the class, plus:

```java
    @Autowired private org.springframework.test.web.servlet.MockMvc mockMvc;

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ADMIN")
    void endpoint_returnsTheActivity() throws Exception {
        fixtures.newPost(event, alice);
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/events/{id}/activity", event.getId()))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.totals.posts").value(1))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.removed.total").doesNotExist());
    }
```

Turn the fully qualified names into imports.

- [ ] **Step 5: Run the tests and check they pass**

Run: `./gradlew test --tests "event_social_media.controller.event.AdminEventControllerActivityTest" --tests "event_social_media.service.event.EventActivity*"`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "KAN-214: Serve an event's activity to admins

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Full suite and query plan check

- [ ] **Step 1: Run the whole suite**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL. Read the summary rather than assuming it passed.

- [ ] **Step 2: Check the query cost on staging-sized data**

On a local Postgres loaded with seed data (`app.seed.enabled=true`), run `EXPLAIN ANALYZE` on the `totals` and `hours` SQL for the largest seeded event. Every subquery should use an `event_id` index:
- `idx_media_event_collection_live`
- the `posts (event_id, …)` index from V10
- `stories (event_id, expires_at)`
- `wishbook_entries (event_id, created_at)`
- `playlist_suggestions (event_id)`

The `not exists` checks are covered by `idx_post_media_media_id` and `idx_stories_media_id` (both in V118), so no migration is needed. If the plan shows a sequential scan on a large table, stop and report it rather than adding an index on your own.

- [ ] **Step 3: Push and open the PR into `staging`**

```bash
git push -u origin claude/kan-214-admin-event-activity
gh pr create --base staging --title "KAN-214: Admin event activity endpoint" --body "..."
```

The body states the endpoint, its definitions (live vs removed, gallery rule, module rule, time zone) and the tests, and ends with the Claude Code attribution line. Name only KAN-214.
