# Print picks — backend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let approved-partner photographers list print sizes with prices, let the host (phase 1) and guests (phase 2) build print lists of gallery photos addressed to one photographer, and let that photographer read the lists and download the files as zips with an order sheet.

**Architecture:** A new `print` domain next to `vendor`. Prices are `vendor_service_items` rows on the account-level vendor profile (kind `PRINT` today, `OTHER` reserved). A pick list is a `print_lists` row (one live host list per photographer, guest lists that are `OPEN` until sent and then frozen) with `print_list_items` pointing at `media`. Access reuses `EventAuthorizationService.requireHostOrVendor`/`requireVendor` with a new `PRINT_PICKS` capability. Downloads reuse `MediaArchiveService`'s packing, limits and zip writer through one new entry point for a caller-authorized item list.

**Tech Stack:** Spring Boot 3, JPA/Hibernate, Flyway (Postgres), H2 test suite (`ddl-auto=create-drop`, Flyway off), Testcontainers (`PostgresTestBase`) for migration tests, MockMvc, JUnit 5, AssertJ, Gradle.

**Spec:** [2026-10-23-print-picks-design.md](../specs/2026-10-23-print-picks-design.md). Frontend plan: [2026-10-23-print-picks-frontend.md](2026-10-23-print-picks-frontend.md). Part A of this plan unblocks frontend Part A; Part B unblocks frontend Part B.

---

## Where and how

- Repository: `C:\Users\User\IdeaProjects\event_social_media` (Spring, "guestwall-be"). Paths below are relative to it. Main package `src/main/java/event_social_media` is written `MAIN/`, tests `src/test/java/event_social_media` are written `TEST/`, resources `src/main/resources` are written `RES/`.
- The main checkout is shared with other sessions. Work in a worktree cut from the latest `staging` (long paths on: the repo has deep Postman folders):
  ```bash
  cd C:/Users/User/IdeaProjects/event_social_media
  git fetch origin
  git -c core.longpaths=true worktree add .claude/worktrees/print-picks -b feat/print-picks origin/staging
  cd .claude/worktrees/print-picks
  ```
- Run one test class: `./gradlew test --tests "event_social_media.service.print.VendorServiceItemServiceTest"`. Run the suite: `./gradlew test`. Postgres tests self-skip without Docker; start Docker Desktop before Task A1 Step 6 and Task B1 Step 5.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push or open a PR until the user says so. PRs go into `staging`: one PR for Part A, one for Part B.
- Backend `CLAUDE.md` rules apply: surgical changes, match the style around you, after code changes run `graphify update .`.

## Numbers to re-check before you start

Other branches claim migration and error numbers. On 2026-10-23 `staging` ends at `V176__vendors.sql`, `SITE_NOTICE`-free `3106`, `VENDOR_CANNOT_RSVP(4034)` and `PARTNER_APPLICATION_PENDING(5180)`. Open branches hold `V177` (`fix/quiz-polls-off-at-release`), `V178` and `3107` (`feature/site-notices`). This plan uses the numbers below. If `staging` has moved, take the next free numbers, use them everywhere this plan names them, and update the frontend plan's `lib/api/errors.ts` task to match.

| Name | Number | HTTP | Part |
| --- | --- | --- | --- |
| `V179__print_picks.sql` | migration | | A |
| `V180__guest_print_picks.sql` | migration | | B |
| `PRINT_ITEM_INVALID` | 3108 | 400 | A |
| `PARTNER_REQUIRED` | 4035 | 403 | A |
| `PRINT_PICKS_UNAVAILABLE` | 4036 | 403 | B |
| `PRINT_PRICES_MISSING` | 5181 | 409 | B |
| `PRINT_LIST_LOCKED` | 5182 | 409 | B |
| `PRINT_LIST_FULL` | 5183 | 409 | A |
| `VENDOR_SERVICE_LIMIT_REACHED` | 5184 | 409 | A |
| `PRINT_LIST_EMPTY` | 5185 | 409 | B |

## Decisions this plan settles

The spec left names and some mechanics to the plan. Settled here (items 1–4 change spec wording; the spec already reflects them):

1. The services table is `vendor_service_items` (entity `VendorServiceItem`, enum `VendorServiceKind`), keyed to `vendor_profiles.user_id`. `VendorService` is already the name of the vendor service class.
2. "Photo removed" is computed at read time from `media.deleted_at`, not a `removed_at` column on items. Every delete path (host, uploader, moderation, storage trim) soft-deletes media, so one read rule covers them all. Items point at media `ON DELETE CASCADE` for the final purge.
3. The host's guest-picks setting lives in its own table `event_print_settings`, not a column on the large `events` row. The event detail gains a computed `guestPrintScope` (the host's choice capped by the plan) so the frontend can gate the gallery page synchronously.
4. Downloads always ask for the `ORIGINAL` variant. `EventAddonService.hasOriginalsAddon` returns true for every event today, and `MediaArchiveService` already falls back to the stored copy per item when no original was kept, which is exactly "best available".
5. A host list belongs to the event, not to the host who made it: every host and co-host edits the same list. `owner_member_id` is null on host lists.
6. Prices are read live on the host list (it is never sent). A guest list copies `size_label`, `unit_price_cents` and `total_cents` at send.
7. A "PRINT" service may be created by an approved partner whose profile type is `PHOTOGRAPHER` or who has ever been a `PHOTOGRAPHER` vendor. "Approved partner" is an active, not-deleted `Collaborator` with the account's email (case-insensitive) — the same match `VendorService.showPartnerPrompt` uses, plus `status = ACTIVE`.
8. One context endpoint, `GET /api/events/{eventId}/print-picks`, tells any member which photographers can receive picks, their sizes, and the guest scope. The gallery and vendor screens read it instead of extending `VendorRowDto`.
9. The order sheet in each zip is `prints.txt` in part 1 only, rendered in the photographer's account locale (`en`/`el`).
10. The reminder is sent once per photographer and event through `NotificationEmitter`'s dedupe key `print.ending:vendor:{eventVendorId}`; no extra column.
11. `guestPrintPicks` is an optional key of the vendors module config (missing reads `OFF`), so admin edits that do not send it keep working.
12. Deleting an account clears the contact fields and the owner name of that user's sent guest lists, deletes their open lists, and deletes the `PRINT_LIST_SENT` notifications that carry their name. Their services go with the profile (`ON DELETE CASCADE`).
13. Guests never see, or send to, a photographer the host hid (`hiddenByHost`) or who opted out of the vendor list (`optedOut`); hosts still pick for every open photographer (user decision 2026-10-24). Part B applies it in the context endpoint's guest branch and in every guest list endpoint's photographer check (`PrintPicksAccess`).
14. After review of Task A5: `PrintListMapper.toDto(list, items, withContact, livePrices)` takes a fourth argument. Open lists show live sizes and prices only when the photographer is an approved partner (`ApprovedPartners.isApproved`); sent lists use their copied values either way. A non-partner's sizes are never applied (no default size, a `sizeId` is refused). Every later `mapper.toDto(…)` call in this plan passes that flag.
15. Locks (Task A5 review): writes that create a list or change its item count take the event row lock, then `PrintListRepository.lockById`; PATCH/DELETE of one item resolve the list id with `PrintListItemRepository.findListIdByIdAndEventId`, take only the list lock, then load the item. Never take the list lock before the event lock. Guest list writes (B3, including send) follow the same order.
16. Reminder copy (user decision 2026-10-24, Task A7 review): the reminder shows the close date and time instead of "in 3 days", because it can go out later than 3 days before. Title `Print picks close on {closesDate} (Athens time)`, body keys `notification.print.ending.body.one` / `.body.many`; payload `count`, `closesDate` (Athens, `yyyy-MM-dd HH:mm`, like `StorageTrimNotifier`), `closesAt` (ISO instant). The Task A7 copy below is superseded by this.
17. Greek host word (user decision 2026-10-24): Greek copy says διοργανωτής (pl. διοργανωτές), never οικοδεσπότης. `print.sheet.host=Διοργανωτής`; reminder bodies end "…που επέλεξε ο διοργανωτής." Older Greek strings in the tasks below are superseded.
18. Count wording (2026-10-24): every notification body with a count uses one/many keys (`.body.one` / `.body.many`, chosen by `count == 1`), as the reminder does. `PRINT_LIST_SENT` therefore stores `notification.print.sent.body.one` or `.many`; update its notifier and test to pick the key.

## File structure

New (under `MAIN/` unless noted):

| File | Responsibility | Part |
| --- | --- | --- |
| `RES/db/migration/V179__print_picks.sql` | Services, lists, items, `host_prints_included` | A |
| `RES/db/migration/V180__guest_print_picks.sql` | `event_print_settings`, plan config key | B |
| `model/print/VendorServiceKind.java` | `PRINT`, `OTHER` | A |
| `model/print/VendorServiceItem.java` | One priced service of a vendor profile | A |
| `model/print/PrintListOwnerKind.java` | `HOST`, `GUEST` | A |
| `model/print/PrintListStatus.java` | `OPEN`, `SENT` | A |
| `model/print/PrintList.java` | A pick list for one photographer | A |
| `model/print/PrintListItem.java` | One picked photo with size and copies | A |
| `model/print/GuestPrintScope.java` | `OFF`, `OWN`, `ANY` and the cap rule | B |
| `model/print/EventPrintSettings.java` | The host's guest scope | B |
| `repository/print/VendorServiceItemRepository.java` | | A |
| `repository/print/PrintListRepository.java` | | A |
| `repository/print/PrintListItemRepository.java` | | A |
| `repository/print/EventPrintSettingsRepository.java` | | B |
| `service/vendor/ApprovedPartners.java` | "Is this account an approved partner" | A |
| `service/print/VendorServiceItemService.java` | Services CRUD with the partner gate | A |
| `service/print/PrintPicksAccess.java` | Which photographers can receive picks now | A |
| `service/print/PrintListMapper.java` | Entity → DTO, live prices, removed count | A |
| `service/print/PrintPicksContextService.java` | `GET …/print-picks` | A |
| `service/print/HostPrintListService.java` | Host list read and edits, prints included | A |
| `service/print/PrintListArchiveService.java` | Manifest and zip of one list | A |
| `service/print/PrintSheetWriter.java` | `prints.txt` | A |
| `service/print/PrintPicksReminderJob.java` | 3-days-before reminder | A |
| `service/print/PrintSettingsService.java` | Host guest scope, effective scope | B |
| `service/print/GuestPrintListService.java` | Guest lists, send, photographer guest view | B |
| `service/print/PrintListSentEvent.java`, `PrintListSentListener.java`, `PrintListSentNotifier.java` | After-commit notice | B |
| `controller/print/VendorServiceItemController.java` | `/api/me/vendor-profile/services` | A |
| `controller/print/PrintPicksController.java` | Event-scoped print endpoints | A (+B) |
| `dto/print/*.java` | Request and response records | A (+B) |

Changed:

| File | Change | Part |
| --- | --- | --- |
| `exception/ErrorCode.java` | New codes | A, B |
| `service/vendor/VendorCapability.java` | `PRINT_PICKS(PHOTOGRAPHER)` | A |
| `model/vendor/EventVendor.java` | `hostPrintsIncluded` | A |
| `dto/vendor/VendorMeDto.java`, `service/vendor/VendorService.java` | `approvedPartner` | A |
| `service/vendor/VendorAuditWriter.java` | Allowlist keys `itemCount`, `part` | A |
| `service/media/MediaArchiveService.java` | `planItemParts`, `prepareItems`, `writeArchive(…, extra)`, public `safeEntryName` | A |
| `model/user/NotificationType.java`, `NotificationCtaTarget.java` | `PRINT_PICKS_ENDING`, `PRINT_LIST_SENT`, `EVENT_VENDOR_PAGE` | A, B |
| `RES/i18n/messages.properties`, `messages_el.properties` | Notification and order-sheet text | A, B |
| `service/vendor/VendorsConfig.java` | Optional `guestPrintPicks` | B |
| `dto/event/EventDetailResponseDto.java`, `service/event/EventService.java` | `guestPrintScope` | B |
| `service/user/deletion/UserAnonymizer.java` | Print list contact cleanup | B |
| `dto/user/export/UserDataExportDto.java`, `service/user/export/MeDataExportService.java` | Services and own print lists | A, B |

---

# Part A — services and host picks

### Task A0: Mirror the plan's naming back into the spec (done)

Done while writing the plans: the spec on `claude/print-picks-spec` already uses `vendor_service_items`, the `media.deleted_at` removed rule, `event_print_settings` with `guestPrintScope`, the `print-picks` context endpoint and `PATCH …/print-picks/guest-scope`. Nothing to do.

### Task A1: Schema, entities and repositories

**Files:**
- Create: `RES/db/migration/V179__print_picks.sql`
- Create: `MAIN/model/print/VendorServiceKind.java`, `VendorServiceItem.java`, `PrintListOwnerKind.java`, `PrintListStatus.java`, `PrintList.java`, `PrintListItem.java`
- Create: `MAIN/repository/print/VendorServiceItemRepository.java`, `PrintListRepository.java`, `PrintListItemRepository.java`
- Modify: `MAIN/model/vendor/EventVendor.java`
- Test: `TEST/migration/PrintPicksMigrationTest.java`, `TEST/repository/print/PrintListRepositoryTest.java`

- [ ] **Step 1: Write the migration**

`RES/db/migration/V179__print_picks.sql`:

```sql
-- Print picks, part A: see the frontend repo's docs/superpowers/specs/2026-10-23-print-picks-design.md
-- and docs/superpowers/plans/2026-10-23-print-picks-backend.md.
-- V179, not V177/V178: fix/quiz-polls-off-at-release and feature/site-notices hold those.

-- 1. What each photographer includes in the host's package, per event.
ALTER TABLE event_vendors ADD COLUMN host_prints_included INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_vendors ADD CONSTRAINT chk_event_vendors_host_prints_included
    CHECK (host_prints_included BETWEEN 0 AND 9999);

-- 2. A vendor profile's priced services. PRINT rows are print sizes; OTHER is reserved for later phases.
CREATE TABLE vendor_service_items (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES vendor_profiles (user_id) ON DELETE CASCADE,
    kind        VARCHAR(10) NOT NULL,
    label       VARCHAR(40) NOT NULL,
    price_cents INTEGER     NOT NULL,
    currency    VARCHAR(3)  NOT NULL DEFAULT 'EUR',
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vendor_service_items_kind CHECK (kind IN ('PRINT', 'OTHER')),
    CONSTRAINT chk_vendor_service_items_price CHECK (price_cents BETWEEN 0 AND 100000),
    CONSTRAINT chk_vendor_service_items_currency CHECK (currency = 'EUR')
);
CREATE INDEX idx_vendor_service_items_user ON vendor_service_items (user_id, kind, sort_order);

-- 3. Pick lists. A host list is one per photographer and is never sent; a guest has one OPEN list per
--    photographer and any number of SENT ones. owner_member_id is null on host lists.
CREATE TABLE print_lists (
    id              UUID PRIMARY KEY,
    event_id        UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    event_vendor_id UUID         NOT NULL REFERENCES event_vendors (id) ON DELETE CASCADE,
    owner_kind      VARCHAR(10)  NOT NULL,
    owner_member_id UUID         REFERENCES event_members (id) ON DELETE SET NULL,
    owner_name      VARCHAR(100),
    status          VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
    sent_at         TIMESTAMPTZ,
    contact_email   VARCHAR(320),
    contact_phone   VARCHAR(30),
    total_cents     INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_print_lists_owner_kind CHECK (owner_kind IN ('HOST', 'GUEST')),
    CONSTRAINT chk_print_lists_status CHECK (status IN ('OPEN', 'SENT')),
    CONSTRAINT chk_print_lists_host_open CHECK (owner_kind = 'GUEST' OR status = 'OPEN')
);
CREATE UNIQUE INDEX uq_print_lists_host ON print_lists (event_vendor_id) WHERE owner_kind = 'HOST';
CREATE UNIQUE INDEX uq_print_lists_guest_open ON print_lists (event_vendor_id, owner_member_id)
    WHERE owner_kind = 'GUEST' AND status = 'OPEN';
CREATE INDEX idx_print_lists_event ON print_lists (event_id);
-- ON DELETE SET NULL from event_members would otherwise scan all of print_lists.
CREATE INDEX idx_print_lists_owner_member ON print_lists (owner_member_id) WHERE owner_member_id IS NOT NULL;

-- 4. One picked photo. A soft-deleted photo stays and reads as "removed"; the purge cascades.
CREATE TABLE print_list_items (
    id               UUID PRIMARY KEY,
    print_list_id    UUID        NOT NULL REFERENCES print_lists (id) ON DELETE CASCADE,
    media_id         UUID        NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    service_item_id  UUID        REFERENCES vendor_service_items (id) ON DELETE SET NULL,
    copies           INTEGER     NOT NULL DEFAULT 1,
    size_label       VARCHAR(40),
    unit_price_cents INTEGER,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_print_list_items_copies CHECK (copies BETWEEN 1 AND 99)
);
CREATE UNIQUE INDEX uq_print_list_items_media ON print_list_items (print_list_id, media_id);
CREATE INDEX idx_print_list_items_media ON print_list_items (media_id);
CREATE INDEX idx_print_list_items_service ON print_list_items (service_item_id) WHERE service_item_id IS NOT NULL;
```

- [ ] **Step 2: Write the enums**

`MAIN/model/print/VendorServiceKind.java`:

```java
package event_social_media.model.print;

/** What a vendor service is. {@code PRINT} is a print size; {@code OTHER} is reserved for later phases. */
public enum VendorServiceKind {
    PRINT,
    OTHER
}
```

`MAIN/model/print/PrintListOwnerKind.java`:

```java
package event_social_media.model.print;

/** Whose list it is: the event's hosts together, or one guest. */
public enum PrintListOwnerKind {
    HOST,
    GUEST
}
```

`MAIN/model/print/PrintListStatus.java`:

```java
package event_social_media.model.print;

/** A host list is always {@code OPEN}. A guest list is {@code OPEN} until the guest sends it. */
public enum PrintListStatus {
    OPEN,
    SENT
}
```

- [ ] **Step 3: Write the entities**

`MAIN/model/print/VendorServiceItem.java`:

```java
package event_social_media.model.print;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One priced service of a vendor profile (spec 2026-10-23, "Vendor services"). Account-level, like the profile. */
@Getter
@Setter
@Entity
@DynamicUpdate
@Table(name = "vendor_service_items")
public class VendorServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    /** The profile's key ({@code vendor_profiles.user_id}). */
    @NotNull
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 10)
    private VendorServiceKind kind;

    @NotNull
    @Size(max = 40)
    @Column(name = "label", nullable = false, length = 40)
    private String label;

    @Column(name = "price_cents", nullable = false)
    private int priceCents;

    @NotNull
    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "EUR";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

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

`MAIN/model/print/PrintList.java`:

```java
package event_social_media.model.print;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.vendor.EventVendor;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A print list addressed to one photographer. The host list is shared by every host of the event and
 * is never sent; a guest list is frozen once sent, with its prices, total and contact copied in.
 */
@Getter
@Setter
@Entity
@DynamicUpdate
@Table(name = "print_lists")
public class PrintList {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /** The photographer the list is for. */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "event_vendor_id", nullable = false)
    private EventVendor eventVendor;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "owner_kind", nullable = false, length = 10)
    private PrintListOwnerKind ownerKind;

    /** The guest; null on host lists, and once the guest's membership is removed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "owner_member_id")
    private EventMember ownerMember;

    /** Copied at send, so the photographer still sees who it was after the membership goes. */
    @Column(name = "owner_name", length = 100)
    private String ownerName;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private PrintListStatus status = PrintListStatus.OPEN;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "contact_email", length = 320)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    /** Copied at send. */
    @Column(name = "total_cents")
    private Integer totalCents;

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

`MAIN/model/print/PrintListItem.java`:

```java
package event_social_media.model.print;

import event_social_media.model.media.Media;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One photo on a print list. A photo deleted from the gallery stays here and reads as removed. */
@Getter
@Setter
@Entity
@DynamicUpdate
@Table(name = "print_list_items")
public class PrintListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "print_list_id", nullable = false)
    private PrintList printList;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "media_id", nullable = false)
    private Media media;

    /** The size; null when the photographer has no sizes, or the size was deleted. */
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "service_item_id")
    private VendorServiceItem serviceItem;

    @Column(name = "copies", nullable = false)
    private int copies = 1;

    /** Copied at send (guest lists only). */
    @Column(name = "size_label", length = 40)
    private String sizeLabel;

    /** Copied at send (guest lists only). */
    @Column(name = "unit_price_cents")
    private Integer unitPriceCents;

    @Column(name = "added_at", nullable = false)
    private OffsetDateTime addedAt;

    @PrePersist
    void onCreate() {
        addedAt = OffsetDateTime.now();
    }
}
```

In `MAIN/model/vendor/EventVendor.java`, after `accessEndedAt`, add:

```java
    /** Prints this photographer includes in the host's package for this event (print picks). */
    @Column(name = "host_prints_included", nullable = false)
    private int hostPrintsIncluded;
```

- [ ] **Step 4: Write the repositories**

`MAIN/repository/print/VendorServiceItemRepository.java`:

```java
package event_social_media.repository.print;

import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorServiceItemRepository extends JpaRepository<VendorServiceItem, UUID> {

    /** One profile's services in display order. */
    List<VendorServiceItem> findByUserIdOrderByKindAscSortOrderAscCreatedAtAsc(UUID userId);

    /** One profile's services of one kind in display order; the first is the default print size. */
    List<VendorServiceItem> findByUserIdAndKindOrderBySortOrderAscCreatedAtAsc(UUID userId, VendorServiceKind kind);

    /** Several profiles' services of one kind, for the context endpoint. */
    List<VendorServiceItem> findByUserIdInAndKindOrderBySortOrderAscCreatedAtAsc(Collection<UUID> userIds,
                                                                                VendorServiceKind kind);

    Optional<VendorServiceItem> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndKind(UUID userId, VendorServiceKind kind);
}
```

`MAIN/repository/print/PrintListRepository.java`:

```java
package event_social_media.repository.print;

import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.print.PrintListStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrintListRepository extends JpaRepository<PrintList, UUID> {

    Optional<PrintList> findByEventVendor_IdAndOwnerKind(UUID eventVendorId, PrintListOwnerKind ownerKind);

    Optional<PrintList> findByIdAndEvent_Id(UUID id, UUID eventId);

    Optional<PrintList> findByEventVendor_IdAndOwnerKindAndOwnerMember_IdAndStatus(
            UUID eventVendorId, PrintListOwnerKind ownerKind, UUID ownerMemberId, PrintListStatus status);

    List<PrintList> findByEventVendor_IdAndOwnerMember_IdAndStatusOrderBySentAtDesc(
            UUID eventVendorId, UUID ownerMemberId, PrintListStatus status);

    List<PrintList> findByEventVendor_IdAndOwnerKindAndStatusOrderBySentAtDesc(
            UUID eventVendorId, PrintListOwnerKind ownerKind, PrintListStatus status);

    /**
     * Host lists that hold at least one live photo, of active photographers whose access has not been
     * recorded as ended, in live events: the reminder's candidates. Ids only; the window is checked in Java.
     */
    @Query("""
            select l.eventVendor.id as vendorId, l.event.id as eventId from PrintList l
            where l.ownerKind = event_social_media.model.print.PrintListOwnerKind.HOST
              and l.eventVendor.removedAt is null and l.eventVendor.member is not null
              and l.eventVendor.accessEndedAt is null and l.event.deletedAt is null
              and exists (select 1 from PrintListItem i where i.printList = l and i.media.deletedAt is null)
            order by l.eventVendor.id""")
    List<ReminderCandidate> findReminderCandidates();

    /** Projection for {@link #findReminderCandidates}. */
    interface ReminderCandidate {
        UUID getVendorId();

        UUID getEventId();
    }

    /** Every list a user owned as a guest, for the data export and account deletion. */
    @Query("select l from PrintList l where l.ownerMember.user.id = :userId order by l.createdAt")
    List<PrintList> findByOwnerUserId(@Param("userId") UUID userId);
}
```

`MAIN/repository/print/PrintListItemRepository.java`:

```java
package event_social_media.repository.print;

import event_social_media.model.print.PrintListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrintListItemRepository extends JpaRepository<PrintListItem, UUID> {

    /** A list's items, oldest first, with media and size loaded for the mapper. */
    @Query("""
            select i from PrintListItem i join fetch i.media left join fetch i.serviceItem
            where i.printList.id = :listId order by i.addedAt asc, i.id asc""")
    List<PrintListItem> findByListWithMedia(@Param("listId") UUID listId);

    /** Items of several lists at once (the photographer's guest view). */
    @Query("""
            select i from PrintListItem i join fetch i.media left join fetch i.serviceItem
            where i.printList.id in :listIds order by i.addedAt asc, i.id asc""")
    List<PrintListItem> findByListsWithMedia(@Param("listIds") Collection<UUID> listIds);

    Optional<PrintListItem> findByIdAndPrintList_Event_Id(UUID id, UUID eventId);

    long countByPrintList_Id(UUID listId);

    @Query("select i.media.id from PrintListItem i where i.printList.id = :listId")
    List<UUID> findMediaIdsByListId(@Param("listId") UUID listId);
}
```

- [ ] **Step 5: Write the repository test (H2)**

`TEST/repository/print/PrintListRepositoryTest.java`:

```java
package event_social_media.repository.print;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.media.Media;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.media.MediaRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class PrintListRepositoryTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private PrintListRepository listRepository;
    @Autowired
    private PrintListItemRepository itemRepository;
    @Autowired
    private MediaRepository mediaRepository;

    @Test
    void aHostListWithALivePhotoIsAReminderCandidate() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        PrintList list = hostList(event, photographer);
        Media photo = fixtures.newMedia(event, 10);
        item(list, photo);

        assertThat(listRepository.findReminderCandidates())
                .anySatisfy(row -> assertThat(row.getVendorId()).isEqualTo(photographer.getId()));
    }

    @Test
    void aHostListOfOnlyDeletedPhotosIsNot() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        PrintList list = hostList(event, photographer);
        Media photo = fixtures.newMedia(event, 10);
        photo.setDeletedAt(OffsetDateTime.now());
        mediaRepository.saveAndFlush(photo);
        item(list, photo);

        assertThat(listRepository.findReminderCandidates())
                .noneSatisfy(row -> assertThat(row.getVendorId()).isEqualTo(photographer.getId()));
    }

    @Test
    void itemsComeBackWithTheirMedia() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        PrintList list = hostList(event, photographer);
        item(list, fixtures.newMedia(event, 10));
        item(list, fixtures.newMedia(event, 20));

        assertThat(itemRepository.findByListWithMedia(list.getId())).hasSize(2)
                .allSatisfy(i -> assertThat(i.getMedia().getFileSize()).isPositive());
    }

    private PrintList hostList(Event event, EventVendor photographer) {
        PrintList list = new PrintList();
        list.setEvent(event);
        list.setEventVendor(photographer);
        list.setOwnerKind(PrintListOwnerKind.HOST);
        return listRepository.saveAndFlush(list);
    }

    private void item(PrintList list, Media media) {
        PrintListItem item = new PrintListItem();
        item.setPrintList(list);
        item.setMedia(media);
        itemRepository.saveAndFlush(item);
    }
}
```

Run: `./gradlew test --tests "event_social_media.repository.print.PrintListRepositoryTest"`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the migration test (Postgres)**

`TEST/migration/PrintPicksMigrationTest.java`:

```java
package event_social_media.migration;

import event_social_media.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V179 on a real Postgres: the partial unique indexes and the CHECKs. Booting with
 * {@code ddl-auto=validate} is the entity/migration drift check.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class PrintPicksMigrationTest extends PostgresTestBase {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void oneHostListPerPhotographer() {
        assertThat(indexDef("uq_print_lists_host")).contains("UNIQUE").contains("'HOST'");
    }

    @Test
    void oneOpenGuestListPerPhotographerAndGuest() {
        assertThat(indexDef("uq_print_lists_guest_open")).contains("UNIQUE").contains("'OPEN'");
    }

    @Test
    void aPhotoIsOnAListOnce() {
        assertThat(indexDef("uq_print_list_items_media")).contains("UNIQUE");
    }

    @Test
    void hostListsAreNeverSent() {
        assertThat(checkDef("chk_print_lists_host_open")).contains("GUEST").contains("OPEN");
    }

    @Test
    void copiesAreOneToNinetyNine() {
        assertThat(checkDef("chk_print_list_items_copies")).contains("1").contains("99");
    }

    @Test
    void hostPrintsIncludedDefaultsToZero() {
        String columnDefault = jdbc.queryForObject("""
                select column_default from information_schema.columns
                where table_name = 'event_vendors' and column_name = 'host_prints_included'""", String.class);
        assertThat(columnDefault).isEqualTo("0");
    }

    private String indexDef(String name) {
        return jdbc.queryForObject("select indexdef from pg_indexes where indexname = ?", String.class, name);
    }

    private String checkDef(String name) {
        return jdbc.queryForObject(
                "select pg_get_constraintdef(oid) from pg_constraint where conname = ?", String.class, name);
    }
}
```

Run (Docker running): `./gradlew test --tests "event_social_media.migration.PrintPicksMigrationTest"`
Expected: PASS (6 tests). A failure to boot with "Schema-validation" means an entity column does not match the SQL: fix the entity.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V179__print_picks.sql src/main/java/event_social_media/model/print src/main/java/event_social_media/repository/print src/main/java/event_social_media/model/vendor/EventVendor.java src/test/java/event_social_media/repository/print src/test/java/event_social_media/migration/PrintPicksMigrationTest.java
git commit -m "feat(print-picks): schema for services, print lists and items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A2: Error codes, capability, approved partners, `approvedPartner` on `/vendors/me`

**Files:**
- Modify: `MAIN/exception/ErrorCode.java`
- Modify: `MAIN/service/vendor/VendorCapability.java`
- Create: `MAIN/service/vendor/ApprovedPartners.java`
- Modify: `MAIN/repository/collaboration/CollaboratorRepository.java`
- Modify: `MAIN/dto/vendor/VendorMeDto.java`, `MAIN/service/vendor/VendorService.java`
- Test: `TEST/service/vendor/ApprovedPartnersTest.java`, `TEST/controller/vendor/VendorControllerTest.java` (one new test)

- [ ] **Step 1: Write the failing test**

`TEST/service/vendor/ApprovedPartnersTest.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.CollaboratorStatus;
import event_social_media.model.user.User;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ApprovedPartnersTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private ApprovedPartners approvedPartners;
    @Autowired
    private CollaboratorRepository collaboratorRepository;

    @Test
    void anActivePartnerWithTheAccountsEmailIsApproved() {
        User user = fixtures.newUser();
        partnerWithEmail(user.getEmail().toUpperCase(), CollaboratorStatus.ACTIVE, false);
        assertThat(approvedPartners.isApproved(user)).isTrue();
    }

    @Test
    void aSuspendedPartnerIsNot() {
        User user = fixtures.newUser();
        partnerWithEmail(user.getEmail(), CollaboratorStatus.SUSPENDED, false);
        assertThat(approvedPartners.isApproved(user)).isFalse();
    }

    @Test
    void aDeletedPartnerIsNot() {
        User user = fixtures.newUser();
        partnerWithEmail(user.getEmail(), CollaboratorStatus.ACTIVE, true);
        assertThat(approvedPartners.isApproved(user)).isFalse();
    }

    @Test
    void anAccountWithNoPartnerIsNot() {
        assertThat(approvedPartners.isApproved(fixtures.newUser())).isFalse();
    }

    private void partnerWithEmail(String email, CollaboratorStatus status, boolean deleted) {
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(email);
        partner.setStatus(status);
        if (deleted) {
            partner.setDeletedAt(OffsetDateTime.now());
        }
        collaboratorRepository.saveAndFlush(partner);
    }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.vendor.ApprovedPartnersTest"`
Expected: compilation failure, `ApprovedPartners` does not exist.

- [ ] **Step 3: Add the error codes**

In `MAIN/exception/ErrorCode.java`:
- After the highest 3xxx code (`3106` today; after `3107` if `feature/site-notices` has merged), add:
  ```java
      /** 3108 — Print picks: a picked item is not a ready photo of this event (a video, another event's, deleted). {@code 400}. */
      PRINT_ITEM_INVALID(3108),
  ```
- After `VENDOR_CANNOT_RSVP(4034)`, add:
  ```java
      /** 4035 — Only approved partners (an active partner with the account's email) list priced services. {@code 403}. */
      PARTNER_REQUIRED(4035),

      /** 4036 — Print picks are off for the caller: guest picks off, the photo outside the guest scope, or the plan's limit. {@code 403}. */
      PRINT_PICKS_UNAVAILABLE(4036),
  ```
- After `PARTNER_APPLICATION_PENDING(5180)`, add:
  ```java
      /** 5181 — The photographer has no print sizes, or is not an approved partner, so guests can't send lists to them. {@code 409}. */
      PRINT_PRICES_MISSING(5181),

      /** 5182 — The print list was already sent and can't change. {@code 409}. */
      PRINT_LIST_LOCKED(5182),

      /** 5183 — The print list already holds {@code print-picks.max-list-items} photos. {@code 409}. */
      PRINT_LIST_FULL(5183),

      /** 5184 — The profile already has the most services of this kind ({@code print-picks.max-print-sizes}). {@code 409}. */
      VENDOR_SERVICE_LIMIT_REACHED(5184),

      /** 5185 — A print list with no live photos can't be sent. {@code 409}. */
      PRINT_LIST_EMPTY(5185),
  ```

All five phase-2 codes are added now so the frontend can map them once.

- [ ] **Step 4: Add the capability**

In `MAIN/service/vendor/VendorCapability.java`, add after `SONG_REQUESTS(EnumSet.of(MUSIC))` (turn its `;` into `,`):

```java
    SONG_REQUESTS(EnumSet.of(MUSIC)),
    PRINT_PICKS(EnumSet.of(PHOTOGRAPHER));
```

Update the class Javadoc's spec reference to `(spec 2026-10-19, "Vendor types and tools"; PRINT_PICKS: spec 2026-10-23)`.

- [ ] **Step 5: Write `ApprovedPartners`**

In `MAIN/repository/collaboration/CollaboratorRepository.java`, next to `existsByContactEmailIgnoreCaseAndDeletedAtIsNull`, add:

```java
    boolean existsByContactEmailIgnoreCaseAndStatusAndDeletedAtIsNull(String contactEmail, CollaboratorStatus status);
```

(import `event_social_media.model.collaboration.CollaboratorStatus`).

`MAIN/service/vendor/ApprovedPartners.java`:

```java
package event_social_media.service.vendor;

import event_social_media.model.collaboration.CollaboratorStatus;
import event_social_media.model.user.User;
import event_social_media.repository.collaboration.CollaboratorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Whether an account is an approved partner: an active, not-deleted partner with the account's email
 * (case-insensitive), the match {@code VendorService#showPartnerPrompt} uses. Approved partners can list
 * priced services (spec 2026-10-23).
 */
@Service
@RequiredArgsConstructor
public class ApprovedPartners {

    private final CollaboratorRepository collaboratorRepository;

    @Transactional(readOnly = true)
    public boolean isApproved(User user) {
        String email = user == null ? null : user.getEmail();
        return email != null && collaboratorRepository
                .existsByContactEmailIgnoreCaseAndStatusAndDeletedAtIsNull(email, CollaboratorStatus.ACTIVE);
    }
}
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.service.vendor.ApprovedPartnersTest"`
Expected: PASS (4 tests).

- [ ] **Step 7: Add `approvedPartner` to `/vendors/me` — failing test first**

In `TEST/controller/vendor/VendorControllerTest.java`, add (reuse the class's existing fields and helpers; if it has no `collaboratorRepository` field, autowire `CollaboratorRepository`):

```java
    @Test
    void meSaysWhetherTheVendorIsAnApprovedPartner() throws Exception {
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(photographer.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);

        mockMvc.perform(as(photographer.getUser(), get("/api/events/{eventId}/vendors/me", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedPartner").value(true))
                .andExpect(jsonPath("$.capabilities", hasItem("PRINT_PICKS")));
    }
```

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorControllerTest"`
Expected: FAIL on `$.approvedPartner` (no such field).

- [ ] **Step 8: Implement**

In `MAIN/dto/vendor/VendorMeDto.java`, add the component `boolean approvedPartner` at the end of the record (after `toolsOff`), with a Javadoc line: "An approved partner, who can list priced services (spec 2026-10-23)."

In `MAIN/service/vendor/VendorService.java`:
- Inject `private final ApprovedPartners approvedPartners;`.
- In `me(...)`, pass `approvedPartners.isApproved(member.getUser())` as the last constructor argument after `toolsOff`.

Fix every other `new VendorMeDto(` call the compiler reports (tests included) by adding `false` as the last argument.

Run: `./gradlew test --tests "event_social_media.controller.vendor.VendorControllerTest" --tests "event_social_media.service.vendor.*"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A src/main/java/event_social_media/exception/ErrorCode.java src/main/java/event_social_media/service/vendor src/main/java/event_social_media/repository/collaboration/CollaboratorRepository.java src/main/java/event_social_media/dto/vendor/VendorMeDto.java src/test/java/event_social_media
git commit -m "feat(print-picks): PRINT_PICKS capability, approved-partner check, error codes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A3: Vendor services (print sizes) CRUD

**Files:**
- Create: `MAIN/dto/print/VendorServiceItemDto.java`, `VendorServiceItemRequestDto.java`
- Create: `MAIN/service/print/VendorServiceItemService.java`
- Create: `MAIN/controller/print/VendorServiceItemController.java`
- Modify: `RES/application.properties`
- Test: `TEST/controller/print/VendorServiceItemControllerTest.java`

- [ ] **Step 1: Write the DTOs**

`MAIN/dto/print/VendorServiceItemDto.java`:

```java
package event_social_media.dto.print;

import event_social_media.model.print.VendorServiceKind;

import java.util.UUID;

/** One service of the caller's vendor profile. */
public record VendorServiceItemDto(UUID id, VendorServiceKind kind, String label, int priceCents, String currency,
                                   int sortOrder) {
}
```

`MAIN/dto/print/VendorServiceItemRequestDto.java`:

```java
package event_social_media.dto.print;

import event_social_media.model.print.VendorServiceKind;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Create or replace one service. {@code sortOrder} is optional on create (appended last). */
public record VendorServiceItemRequestDto(
        @NotNull VendorServiceKind kind,
        @NotBlank @Size(max = 40) String label,
        @NotNull @Min(0) @Max(100_000) Integer priceCents,
        @Min(0) @Max(999) Integer sortOrder) {
}
```

- [ ] **Step 2: Write the failing controller test**

`TEST/controller/print/VendorServiceItemControllerTest.java`:

```java
package event_social_media.controller.print;

import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VendorServiceItemControllerTest {

    private static final String SIZE_13X18 = """
            {"kind": "PRINT", "label": "13x18", "priceCents": 300}""";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private CollaboratorRepository collaboratorRepository;

    private User photographer;

    @BeforeEach
    void setUp() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        photographer = vendor.getUser();
    }

    private void approve(User user) {
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(user.getEmail());
        collaboratorRepository.saveAndFlush(partner);
    }

    private org.springframework.test.web.servlet.ResultActions create(User user, String body) throws Exception {
        return mockMvc.perform(as(user, post("/api/me/vendor-profile/services")
                .contentType(MediaType.APPLICATION_JSON).content(body)));
    }

    @Test
    void anApprovedPhotographerAddsListsChangesAndDeletesASize() throws Exception {
        approve(photographer);
        String id = com.jayway.jsonpath.JsonPath.read(create(photographer, SIZE_13X18)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("13x18"))
                .andExpect(jsonPath("$.currency").value("EUR"))
                .andReturn().getResponse().getContentAsString(), "$.id");

        mockMvc.perform(as(photographer, put("/api/me/vendor-profile/services/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"kind": "PRINT", "label": "13x18 matte", "priceCents": 350, "sortOrder": 0}""")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceCents").value(350));

        mockMvc.perform(as(photographer, get("/api/me/vendor-profile/services")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].label").value("13x18 matte"));

        mockMvc.perform(as(photographer, delete("/api/me/vendor-profile/services/{id}", id)))
                .andExpect(status().isNoContent());
        mockMvc.perform(as(photographer, get("/api/me/vendor-profile/services")))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void aVendorWhoIsNotAnApprovedPartnerIsRefused() throws Exception {
        create(photographer, SIZE_13X18)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PARTNER_REQUIRED.getCode()));
    }

    @Test
    void anApprovedPartnerWhoIsNotAPhotographerCannotAddPrintSizes() throws Exception {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        User planner = support.vendor(event, PartnerRole.PLANNER).getUser();
        approve(planner);
        create(planner, SIZE_13X18)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.VENDOR_CAPABILITY_MISSING.getCode()));
    }

    @Test
    void otherServicesAreNotOpenYet() throws Exception {
        approve(photographer);
        create(photographer, """
                {"kind": "OTHER", "label": "Album", "priceCents": 20000}""")
                .andExpect(status().isBadRequest());
    }

    @Test
    void theNinthSizeIsRefused() throws Exception {
        approve(photographer);
        for (int i = 0; i < 8; i++) {
            create(photographer, SIZE_13X18).andExpect(status().isCreated());
        }
        create(photographer, SIZE_13X18)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.VENDOR_SERVICE_LIMIT_REACHED.getCode()));
    }

    @Test
    void someoneElsesSizeIsNotFound() throws Exception {
        approve(photographer);
        String id = com.jayway.jsonpath.JsonPath.read(create(photographer, SIZE_13X18)
                .andReturn().getResponse().getContentAsString(), "$.id");
        User other = fixtures.newUser();
        mockMvc.perform(as(other, delete("/api/me/vendor-profile/services/{id}", id)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aNegativePriceIsRefused() throws Exception {
        approve(photographer);
        create(photographer, """
                {"kind": "PRINT", "label": "13x18", "priceCents": -1}""")
                .andExpect(status().isBadRequest());
    }
}
```

Check how existing tests read the error code (`$.errorCode` vs `$.code`): open `TEST/controller/vendor/VendorControllerTest.java`, find an assertion on `VENDOR_` codes, and use the same JSON path and getter (`getCode()` or `code()`) everywhere in this plan.

Run: `./gradlew test --tests "event_social_media.controller.print.VendorServiceItemControllerTest"`
Expected: FAIL (404s; no controller).

- [ ] **Step 3: Add the limits to `application.properties`**

In `RES/application.properties`, near the `media.archive.*` keys, add:

```properties
# Print picks (spec 2026-10-23). A list holds up to max-list-items photos, the selected-download cap.
print-picks.max-list-items=${PRINT_PICKS_MAX_LIST_ITEMS:100}
print-picks.max-print-sizes=${PRINT_PICKS_MAX_PRINT_SIZES:8}
```

- [ ] **Step 4: Write the service**

`MAIN/service/print/VendorServiceItemService.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.print.VendorServiceItemDto;
import event_social_media.dto.print.VendorServiceItemRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.vendor.ApprovedPartners;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * A vendor profile's priced services (spec 2026-10-23, "Vendor services"). Approved partners only.
 * {@code PRINT} services are print sizes, for photographers; {@code OTHER} is not open yet.
 */
@Service
@RequiredArgsConstructor
public class VendorServiceItemService {

    private final VendorServiceItemRepository repository;
    private final VendorProfileRepository vendorProfileRepository;
    private final EventVendorRepository eventVendorRepository;
    private final UserRepository userRepository;
    private final ApprovedPartners approvedPartners;

    @Value("${print-picks.max-print-sizes:8}")
    private int maxPrintSizes;

    /** Anyone with a profile reads their own list; it is empty for non-partners. */
    @Transactional(readOnly = true)
    public List<VendorServiceItemDto> list(UUID userId) {
        return repository.findByUserIdOrderByKindAscSortOrderAscCreatedAtAsc(userId).stream()
                .map(VendorServiceItemService::toDto)
                .toList();
    }

    @Transactional
    public VendorServiceItemDto create(UUID userId, VendorServiceItemRequestDto dto) {
        requireAllowed(userId, dto.kind());
        if (repository.countByUserIdAndKind(userId, dto.kind()) >= maxPrintSizes) {
            throw new ConflictException(ErrorCode.VENDOR_SERVICE_LIMIT_REACHED,
                    "A profile holds up to " + maxPrintSizes + " print sizes.");
        }
        VendorServiceItem item = new VendorServiceItem();
        item.setUserId(userId);
        item.setKind(dto.kind());
        apply(item, dto);
        if (dto.sortOrder() == null) {
            item.setSortOrder((int) repository.countByUserIdAndKind(userId, dto.kind()));
        }
        return toDto(repository.save(item));
    }

    @Transactional
    public VendorServiceItemDto update(UUID userId, UUID id, VendorServiceItemRequestDto dto) {
        VendorServiceItem item = own(userId, id);
        if (item.getKind() != dto.kind()) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "A service's kind can't change.");
        }
        requireAllowed(userId, dto.kind());
        apply(item, dto);
        return toDto(repository.save(item));
    }

    /** Deleting needs no partner check: a former partner can still clear their list. */
    @Transactional
    public void delete(UUID userId, UUID id) {
        repository.delete(own(userId, id));
    }

    private void requireAllowed(UUID userId, VendorServiceKind kind) {
        if (kind != VendorServiceKind.PRINT) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Only print sizes can be listed for now.");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        VendorProfile profile = vendorProfileRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Fill in your vendor profile first"));
        if (!approvedPartners.isApproved(user)) {
            throw new ForbiddenException(ErrorCode.PARTNER_REQUIRED, "Only approved partners can list prices.");
        }
        boolean photographer = profile.getVendorType() == PartnerRole.PHOTOGRAPHER
                || eventVendorRepository.findByUser_Id(userId).stream()
                        .anyMatch(v -> v.getVendorType() == PartnerRole.PHOTOGRAPHER);
        if (!photographer) {
            throw new ForbiddenException(ErrorCode.VENDOR_CAPABILITY_MISSING, "Print sizes are for photographers.");
        }
    }

    private VendorServiceItem own(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("VendorServiceItem", id));
    }

    private static void apply(VendorServiceItem item, VendorServiceItemRequestDto dto) {
        item.setLabel(dto.label().strip());
        item.setPriceCents(dto.priceCents());
        if (dto.sortOrder() != null) {
            item.setSortOrder(dto.sortOrder());
        }
    }

    static VendorServiceItemDto toDto(VendorServiceItem item) {
        return new VendorServiceItemDto(item.getId(), item.getKind(), item.getLabel(), item.getPriceCents(),
                item.getCurrency(), item.getSortOrder());
    }
}
```

Check `UserRepository`'s package (`grep -rn "interface UserRepository" src/main/java`) and fix the import if it differs.

- [ ] **Step 5: Write the controller**

`MAIN/controller/print/VendorServiceItemController.java`:

```java
package event_social_media.controller.print;

import event_social_media.dto.print.VendorServiceItemDto;
import event_social_media.dto.print.VendorServiceItemRequestDto;
import event_social_media.service.print.VendorServiceItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** The caller's priced services, next to the vendor profile (spec 2026-10-23). */
@RestController
@RequiredArgsConstructor
public class VendorServiceItemController {

    private final VendorServiceItemService service;

    private static UUID callerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    @GetMapping("/api/me/vendor-profile/services")
    @PreAuthorize("hasRole('USER')")
    public List<VendorServiceItemDto> list(Authentication authentication) {
        return service.list(callerId(authentication));
    }

    @PostMapping("/api/me/vendor-profile/services")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.CREATED)
    public VendorServiceItemDto create(@Valid @RequestBody VendorServiceItemRequestDto dto,
                                       Authentication authentication) {
        return service.create(callerId(authentication), dto);
    }

    @PutMapping("/api/me/vendor-profile/services/{id}")
    @PreAuthorize("hasRole('USER')")
    public VendorServiceItemDto update(@PathVariable UUID id, @Valid @RequestBody VendorServiceItemRequestDto dto,
                                       Authentication authentication) {
        return service.update(callerId(authentication), id, dto);
    }

    @DeleteMapping("/api/me/vendor-profile/services/{id}")
    @PreAuthorize("hasRole('USER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        service.delete(callerId(authentication), id);
    }
}
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.controller.print.VendorServiceItemControllerTest"`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/dto/print src/main/java/event_social_media/service/print src/main/java/event_social_media/controller/print src/main/resources/application.properties src/test/java/event_social_media/controller/print
git commit -m "feat(print-picks): vendor print sizes for approved partners

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A4: Print picks access and the context endpoint

**Files:**
- Create: `MAIN/service/print/PrintPicksAccess.java`
- Create: `MAIN/dto/print/PrintPicksContextDto.java`
- Create: `MAIN/service/print/PrintPicksContextService.java`
- Create: `MAIN/controller/print/PrintPicksController.java`
- Test: `TEST/controller/print/PrintPicksContextTest.java`

- [ ] **Step 1: Write the DTO**

`MAIN/dto/print/PrintPicksContextDto.java`:

```java
package event_social_media.dto.print;

import event_social_media.model.print.GuestPrintScope;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * {@code GET /api/events/{eventId}/print-picks}: who can receive picks right now and on what terms.
 *
 * @param guestScope    what guests may pick (always {@code OFF} until part B)
 * @param photographers the event's photographers whose tools are open, oldest first. Hosts and the
 *                      photographer themself see every one; guests see only priced ones, and only
 *                      while {@code guestScope} is not {@code OFF}
 */
public record PrintPicksContextDto(GuestPrintScope guestScope, List<Photographer> photographers) {

    /**
     * @param hostPrintsIncluded set for hosts and for the photographer themself; null for guests
     * @param sizes              the photographer's print sizes, empty when they have none or are not an approved partner
     */
    public record Photographer(UUID vendorId, String businessName, String logoUrl, OffsetDateTime accessEndsAt,
                               Integer hostPrintsIncluded, List<PrintSize> sizes) {
    }

    public record PrintSize(UUID id, String label, int priceCents, String currency) {
    }
}
```

Part A needs `GuestPrintScope` for this record. Create it now (Part B adds the cap rule to it):

`MAIN/model/print/GuestPrintScope.java`:

```java
package event_social_media.model.print;

/** What guests may pick for print: nothing, their own uploads, or any photo they can see. */
public enum GuestPrintScope {
    OFF,
    OWN,
    ANY
}
```

- [ ] **Step 2: Write the failing test**

`TEST/controller/print/PrintPicksContextTest.java`:

```java
package event_social_media.controller.print;

import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PrintPicksContextTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private VendorServiceItemRepository serviceItemRepository;

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
        support.vendor(event, PartnerRole.PLANNER);
    }

    private void priced(EventVendor vendor) {
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(vendor.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);
        VendorServiceItem size = new VendorServiceItem();
        size.setUserId(vendor.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel("13x18");
        size.setPriceCents(300);
        serviceItemRepository.saveAndFlush(size);
    }

    @Test
    void theHostSeesThePhotographersWithSizesAndIncludedCount() throws Exception {
        priced(photographer);
        mockMvc.perform(as(host, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guestScope").value("OFF"))
                .andExpect(jsonPath("$.photographers", hasSize(1)))
                .andExpect(jsonPath("$.photographers[0].vendorId").value(photographer.getId().toString()))
                .andExpect(jsonPath("$.photographers[0].hostPrintsIncluded").value(0))
                .andExpect(jsonPath("$.photographers[0].sizes[0].label").value("13x18"))
                .andExpect(jsonPath("$.photographers[0].sizes[0].priceCents").value(300));
    }

    @Test
    void aPhotographerWhoIsNotAnApprovedPartnerHasNoSizes() throws Exception {
        VendorServiceItem size = new VendorServiceItem();
        size.setUserId(photographer.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel("13x18");
        size.setPriceCents(300);
        serviceItemRepository.saveAndFlush(size);

        mockMvc.perform(as(host, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(jsonPath("$.photographers[0].sizes", hasSize(0)));
    }

    @Test
    void aPhotographerPastTheirAccessWindowIsNotListed() throws Exception {
        support.endedDaysAgo(event, 31);
        mockMvc.perform(as(host, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(jsonPath("$.photographers", hasSize(0)));
    }

    @Test
    void aGuestSeesNoPhotographersWhileGuestPicksAreOff() throws Exception {
        priced(photographer);
        mockMvc.perform(as(guest, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photographers", hasSize(0)));
    }

    @Test
    void thePhotographerSeesThemselfWithTheIncludedCount() throws Exception {
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(jsonPath("$.photographers", hasSize(1)))
                .andExpect(jsonPath("$.photographers[0].hostPrintsIncluded").value(0));
    }

    @Test
    void aNonMemberIsRefused() throws Exception {
        mockMvc.perform(as(fixtures.newUser(), get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void theGuestViewHidesTheIncludedCount() throws Exception {
        // Guarded already by the empty list above; kept so part B's guest test starts from it.
        mockMvc.perform(as(guest, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(jsonPath("$.photographers[0].hostPrintsIncluded").doesNotExist());
    }
}
```

`aNonMemberIsRefused`: check what `requireMember` answers a non-member today (403 or 404) in `VendorControllerTest`, and match it.

Run: `./gradlew test --tests "event_social_media.controller.print.PrintPicksContextTest"`
Expected: FAIL (404, no endpoint).

- [ ] **Step 3: Write `PrintPicksAccess`**

`MAIN/service/print/PrintPicksAccess.java`:

```java
package event_social_media.service.print;

import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.platform.ModuleAvailabilityService;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.service.vendor.VendorsConfigReader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Which photographers can receive print picks now: active {@code PHOTOGRAPHER} vendors of an event
 * whose vendors module works and whose access window is open (spec 2026-10-23, "Deadline").
 */
@Service
@RequiredArgsConstructor
public class PrintPicksAccess {

    private final EventRepository eventRepository;
    private final EventVendorRepository eventVendorRepository;
    private final VendorsConfigReader vendorsConfigReader;
    private final ModuleAvailabilityService moduleAvailabilityService;

    @Transactional(readOnly = true)
    public Event event(UUID eventId) {
        return eventRepository.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
    }

    /** The open photographers, oldest first; empty when the module is off or every window has closed. */
    @Transactional(readOnly = true)
    public List<EventVendor> openPhotographers(Event event) {
        Optional<VendorsConfig> config = openConfig(event);
        if (config.isEmpty()) {
            return List.of();
        }
        return eventVendorRepository.findActiveByEventId(event.getId()).stream()
                .filter(v -> v.getVendorType() == PartnerRole.PHOTOGRAPHER)
                .toList();
    }

    /**
     * One open photographer of the event, for a write or a read of their lists.
     *
     * @throws ResourceNotFoundException if no active photographer has this id in this event
     * @throws ForbiddenException        {@code VENDOR_ACCESS_ENDED} once the window has closed
     */
    @Transactional(readOnly = true)
    public EventVendor openPhotographer(Event event, UUID vendorId) {
        moduleAvailabilityService.requireReadable(event.getId(), ModuleKey.VENDORS);
        EventVendor vendor = eventVendorRepository.findByIdAndEvent_Id(vendorId, event.getId())
                .filter(v -> v.getRemovedAt() == null && v.getMember() != null)
                .filter(v -> v.getVendorType() == PartnerRole.PHOTOGRAPHER)
                .orElseThrow(() -> new ResourceNotFoundException("EventVendor", vendorId));
        if (openConfig(event).isEmpty()) {
            throw new ForbiddenException(ErrorCode.VENDOR_ACCESS_ENDED, "Print picks for this event have closed.");
        }
        return vendor;
    }

    /** When the photographers' tools stop; null when the vendors module is off. */
    @Transactional(readOnly = true)
    public OffsetDateTime accessEndsAt(Event event) {
        return vendorsConfigReader.forEvent(event).map(c -> c.accessEndsAt(event)).orElse(null);
    }

    private Optional<VendorsConfig> openConfig(Event event) {
        return vendorsConfigReader.forEvent(event)
                .filter(c -> c.allows(PartnerRole.PHOTOGRAPHER))
                .filter(c -> c.accessOpen(event, OffsetDateTime.now()));
    }
}
```

Check `ModuleAvailabilityService`'s package (`grep -rn "class ModuleAvailabilityService" src/main/java`) and fix the import.

- [ ] **Step 4: Write `PrintPicksContextService`**

`MAIN/service/print/PrintPicksContextService.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.print.PrintPicksContextDto;
import event_social_media.model.event.Event;
import event_social_media.model.event.ModuleKey;
import event_social_media.model.print.GuestPrintScope;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.model.vendor.VendorProfile;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.repository.vendor.VendorProfileRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.platform.ModuleAvailabilityService;
import event_social_media.service.vendor.ApprovedPartners;
import event_social_media.service.vendor.VendorProfileService;
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

/** {@code GET /api/events/{eventId}/print-picks} (spec 2026-10-23). */
@Service
@RequiredArgsConstructor
public class PrintPicksContextService {

    private final EventAuthorizationService eventAuthorizationService;
    private final ModuleAvailabilityService moduleAvailabilityService;
    private final PrintPicksAccess access;
    private final VendorServiceItemRepository serviceItemRepository;
    private final VendorProfileRepository vendorProfileRepository;
    private final VendorProfileService vendorProfileService;
    private final ApprovedPartners approvedPartners;
    private final GuestScopeReader guestScopeReader;

    @Transactional(readOnly = true)
    public PrintPicksContextDto context(UUID eventId, UUID callerUserId) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        moduleAvailabilityService.requireReadable(eventId, ModuleKey.VENDORS);
        Event event = access.event(eventId);
        boolean host = eventAuthorizationService.isHost(eventId, callerUserId);
        GuestPrintScope scope = guestScopeReader.effective(event);
        List<EventVendor> photographers = access.openPhotographers(event);
        OffsetDateTime endsAt = access.accessEndsAt(event);

        Set<UUID> userIds = photographers.stream().map(EventVendor::getUser).filter(Objects::nonNull)
                .map(User::getId).collect(Collectors.toSet());
        Map<UUID, VendorProfile> profiles = userIds.isEmpty() ? Map.of()
                : vendorProfileRepository.findByUserIdIn(userIds).stream()
                        .collect(Collectors.toMap(VendorProfile::getUserId, Function.identity()));
        Map<UUID, List<VendorServiceItem>> sizes = userIds.isEmpty() ? Map.of()
                : serviceItemRepository.findByUserIdInAndKindOrderBySortOrderAscCreatedAtAsc(userIds, VendorServiceKind.PRINT)
                        .stream().collect(Collectors.groupingBy(VendorServiceItem::getUserId));

        List<PrintPicksContextDto.Photographer> rows = photographers.stream()
                .map(v -> {
                    boolean self = v.getUser() != null && v.getUser().getId().equals(callerUserId);
                    VendorProfile profile = v.getUser() == null ? null : profiles.get(v.getUser().getId());
                    List<PrintPicksContextDto.PrintSize> priced = v.getUser() != null && approvedPartners.isApproved(v.getUser())
                            ? sizes.getOrDefault(v.getUser().getId(), List.of()).stream()
                                    .map(s -> new PrintPicksContextDto.PrintSize(s.getId(), s.getLabel(), s.getPriceCents(), s.getCurrency()))
                                    .toList()
                            : List.of();
                    return new PrintPicksContextDto.Photographer(
                            v.getId(),
                            profile == null ? v.getMember().getDisplayName() : profile.getBusinessName(),
                            profile == null ? null : vendorProfileService.logoUrl(profile),
                            endsAt,
                            host || self ? v.getHostPrintsIncluded() : null,
                            priced);
                })
                // A guest sees priced photographers only, and only while guest picks are on; a photographer sees themself.
                .filter(row -> host || isSelf(row, photographers, callerUserId)
                        || (scope != GuestPrintScope.OFF && !row.sizes().isEmpty()))
                .toList();
        return new PrintPicksContextDto(scope, rows);
    }

    private static boolean isSelf(PrintPicksContextDto.Photographer row, List<EventVendor> photographers, UUID callerUserId) {
        return photographers.stream().anyMatch(v -> v.getId().equals(row.vendorId())
                && v.getUser() != null && v.getUser().getId().equals(callerUserId));
    }
}
```

A photographer who calls this sees only themself (the filter drops other photographers for them unless guest picks are on and those are priced — acceptable: they never act on another photographer's lists).

`GuestScopeReader` is Part B's effective-scope reader. In Part A, create the stub that always says `OFF`:

`MAIN/service/print/GuestScopeReader.java`:

```java
package event_social_media.service.print;

import event_social_media.model.event.Event;
import event_social_media.model.print.GuestPrintScope;
import org.springframework.stereotype.Service;

/** What guests may pick in an event. Guest picks arrive in part B; until then nobody may. */
@Service
public class GuestScopeReader {

    public GuestPrintScope effective(Event event) {
        return GuestPrintScope.OFF;
    }
}
```

- [ ] **Step 5: Write the controller (context endpoint only for now)**

`MAIN/controller/print/PrintPicksController.java`:

```java
package event_social_media.controller.print;

import event_social_media.dto.print.PrintPicksContextDto;
import event_social_media.service.print.PrintPicksContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Event-scoped print picks endpoints (spec 2026-10-23). */
@RestController
@RequiredArgsConstructor
public class PrintPicksController {

    private final PrintPicksContextService contextService;

    private static UUID callerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    @GetMapping("/api/events/{eventId}/print-picks")
    @PreAuthorize("isAuthenticated()")
    public PrintPicksContextDto context(@PathVariable UUID eventId, Authentication authentication) {
        return contextService.context(eventId, callerId(authentication));
    }
}
```

- [ ] **Step 6: Run the test**

Run: `./gradlew test --tests "event_social_media.controller.print.PrintPicksContextTest"`
Expected: PASS (7 tests). `theGuestViewHidesTheIncludedCount` passes because `$.photographers[0]` does not exist; it becomes meaningful in Part B Task B4.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/model/print/GuestPrintScope.java src/main/java/event_social_media/dto/print src/main/java/event_social_media/service/print src/main/java/event_social_media/controller/print src/test/java/event_social_media/controller/print/PrintPicksContextTest.java
git commit -m "feat(print-picks): context endpoint with open photographers and sizes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A5: The host list (read, add, change, remove) and prints included

**Files:**
- Create: `MAIN/dto/print/PrintListDto.java`, `PrintListItemDto.java`, `AddPrintItemsRequestDto.java`, `PatchPrintItemRequestDto.java`, `PrintsIncludedRequestDto.java`
- Create: `MAIN/service/print/PrintListMapper.java`, `MAIN/service/print/HostPrintListService.java`
- Modify: `MAIN/controller/print/PrintPicksController.java`
- Modify: `MAIN/service/vendor/VendorAuditWriter.java`
- Test: `TEST/controller/print/HostPrintListTest.java`

- [ ] **Step 1: Write the DTOs**

`MAIN/dto/print/PrintListItemDto.java`:

```java
package event_social_media.dto.print;

import event_social_media.dto.media.MediaResponseDto;

import java.util.UUID;

/**
 * One picked photo.
 *
 * @param media          the photo with fresh URLs; null when it was deleted from the gallery
 * @param removed        the photo was deleted from the gallery after it was picked
 * @param sizeId         the chosen size; null without sizes, or when the size was deleted
 * @param sizeLabel      the size's label: live on open lists, copied on sent ones
 * @param unitPriceCents the price per copy: live on open lists, copied on sent ones; null without a size
 */
public record PrintListItemDto(UUID id, UUID mediaId, MediaResponseDto media, boolean removed, UUID sizeId,
                               String sizeLabel, Integer unitPriceCents, int copies) {
}
```

`MAIN/dto/print/PrintListDto.java`:

```java
package event_social_media.dto.print;

import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.print.PrintListStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * A print list. A host list that was never written has a null {@code id} and no items.
 *
 * @param ownerName    a guest list's guest, copied at send; null on host lists and open guest lists
 * @param contactEmail sent guest lists, for the photographer only; null everywhere else
 * @param contactPhone as {@code contactEmail}, when the guest gave one
 * @param totalCents   copied at send; null on open lists (the client adds them up)
 * @param removedCount items whose photo was deleted from the gallery
 */
public record PrintListDto(UUID id, UUID vendorId, PrintListOwnerKind ownerKind, PrintListStatus status,
                           OffsetDateTime sentAt, String ownerName, String contactEmail, String contactPhone,
                           Integer totalCents, int removedCount, List<PrintListItemDto> items) {
}
```

`MAIN/dto/print/AddPrintItemsRequestDto.java`:

```java
package event_social_media.dto.print;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Adds photos to the caller's list for one photographer; photos already on it are kept as they are. */
public record AddPrintItemsRequestDto(@NotNull UUID vendorId, @NotEmpty @Size(max = 100) List<@NotNull UUID> mediaIds) {
}
```

`MAIN/dto/print/PatchPrintItemRequestDto.java`:

```java
package event_social_media.dto.print;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.UUID;

/** Changes one item: send the fields to change. {@code sizeId} must be one of the list's photographer's sizes. */
public record PatchPrintItemRequestDto(UUID sizeId, @Min(1) @Max(99) Integer copies) {
}
```

`MAIN/dto/print/PrintsIncludedRequestDto.java`:

```java
package event_social_media.dto.print;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** How many prints the photographer includes for the host in this event. */
public record PrintsIncludedRequestDto(@NotNull @Min(0) @Max(9999) Integer count) {
}
```

- [ ] **Step 2: Write the failing test**

`TEST/controller/print/HostPrintListTest.java`:

```java
package event_social_media.controller.print;

import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaStatus;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.audit.AuditLogRepository;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

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
class HostPrintListTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private VendorServiceItemRepository serviceItemRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;

    private User host;
    private User guest;
    private Event event;
    private EventVendor photographer;
    private Media photo;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        photo = fixtures.newMedia(event, 10);
    }

    private VendorServiceItem size(String label, int cents, int order) {
        VendorServiceItem size = new VendorServiceItem();
        size.setUserId(photographer.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel(label);
        size.setPriceCents(cents);
        size.setSortOrder(order);
        return serviceItemRepository.saveAndFlush(size);
    }

    private void approvePhotographer() {
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(photographer.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);
    }

    private ResultActions add(User user, UUID... mediaIds) throws Exception {
        StringBuilder ids = new StringBuilder();
        for (UUID id : mediaIds) {
            ids.append(ids.isEmpty() ? "" : ",").append('"').append(id).append('"');
        }
        return mockMvc.perform(as(user, post("/api/events/{eventId}/print-lists/host/items", event.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"vendorId\": \"" + photographer.getId() + "\", \"mediaIds\": [" + ids + "]}")));
    }

    private ResultActions read(User user) throws Exception {
        return mockMvc.perform(as(user, get("/api/events/{eventId}/print-lists/host", event.getId())
                .param("vendorId", photographer.getId().toString())));
    }

    @Test
    void anUnwrittenListIsEmpty() throws Exception {
        read(host).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.ownerKind").value("HOST"))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void theHostAddsAPhotoAtTheFirstSize() throws Exception {
        approvePhotographer();
        VendorServiceItem small = size("10x15", 200, 0);
        size("13x18", 300, 1);
        add(host, photo.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].mediaId").value(photo.getId().toString()))
                .andExpect(jsonPath("$.items[0].sizeId").value(small.getId().toString()))
                .andExpect(jsonPath("$.items[0].sizeLabel").value("10x15"))
                .andExpect(jsonPath("$.items[0].unitPriceCents").value(200))
                .andExpect(jsonPath("$.items[0].copies").value(1));
    }

    @Test
    void withoutSizesAPickHasCopiesOnly() throws Exception {
        add(host, photo.getId())
                .andExpect(jsonPath("$.items[0].sizeId").doesNotExist())
                .andExpect(jsonPath("$.items[0].unitPriceCents").doesNotExist());
    }

    @Test
    void addingTheSamePhotoTwiceKeepsOneItem() throws Exception {
        add(host, photo.getId());
        add(host, photo.getId(), photo.getId()).andExpect(jsonPath("$.items", hasSize(1)));
    }

    @Test
    void aVideoIsRefused() throws Exception {
        Media video = fixtures.newMedia(event, 10);
        video.setMediaType("VIDEO");
        mediaRepository.saveAndFlush(video);
        add(host, video.getId())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_ITEM_INVALID.getCode()));
    }

    @Test
    void aPhotoStillProcessingIsRefused() throws Exception {
        photo.setStatus(MediaStatus.PROCESSING);
        mediaRepository.saveAndFlush(photo);
        add(host, photo.getId()).andExpect(status().isBadRequest());
    }

    @Test
    void anotherEventsPhotoIsRefused() throws Exception {
        Media elsewhere = fixtures.newMedia(support.vendorEventHostedBy(fixtures.newUser()), 10);
        add(host, elsewhere.getId()).andExpect(status().isBadRequest());
    }

    @Test
    void theHundredAndFirstPhotoIsRefused() throws Exception {
        UUID[] hundred = new UUID[100];
        for (int i = 0; i < 100; i++) {
            hundred[i] = fixtures.newMedia(event, 1).getId();
        }
        add(host, hundred).andExpect(status().isOk());
        add(host, photo.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_LIST_FULL.getCode()));
    }

    @Test
    void theHostChangesSizeAndCopiesAndRemovesAnItem() throws Exception {
        approvePhotographer();
        size("10x15", 200, 0);
        VendorServiceItem big = size("20x30", 900, 1);
        String itemId = JsonPath.read(add(host, photo.getId()).andReturn().getResponse().getContentAsString(), "$.items[0].id");

        mockMvc.perform(as(host, patch("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sizeId\": \"" + big.getId() + "\", \"copies\": 3}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sizeLabel").value("20x30"))
                .andExpect(jsonPath("$.items[0].copies").value(3));

        mockMvc.perform(as(host, delete("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void anotherPhotographersSizeIsRefused() throws Exception {
        String itemId = JsonPath.read(add(host, photo.getId()).andReturn().getResponse().getContentAsString(), "$.items[0].id");
        VendorServiceItem foreign = new VendorServiceItem();
        foreign.setUserId(fixtures.newUser().getId());
        foreign.setKind(VendorServiceKind.PRINT);
        foreign.setLabel("x");
        foreign.setPriceCents(1);
        // vendor_service_items.user_id references vendor_profiles: give the stranger a profile.
        support.profile(userRepositoryFind(foreign.getUserId()), "Other", PartnerRole.PHOTOGRAPHER);
        serviceItemRepository.saveAndFlush(foreign);
        mockMvc.perform(as(host, patch("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sizeId\": \"" + foreign.getId() + "\"}")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aDeletedPhotoStaysAsRemoved() throws Exception {
        add(host, photo.getId());
        photo.setDeletedAt(OffsetDateTime.now());
        mediaRepository.saveAndFlush(photo);
        read(host)
                .andExpect(jsonPath("$.removedCount").value(1))
                .andExpect(jsonPath("$.items[0].removed").value(true))
                .andExpect(jsonPath("$.items[0].media").doesNotExist());
    }

    @Test
    void thePhotographerReadsTheHostListButCannotWriteIt() throws Exception {
        add(host, photo.getId());
        read(photographer.getUser()).andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(1)));
        add(photographer.getUser(), photo.getId()).andExpect(status().isForbidden());
    }

    @Test
    void aGuestCannotReadOrWriteTheHostList() throws Exception {
        read(guest).andExpect(status().isForbidden());
        add(guest, photo.getId()).andExpect(status().isForbidden());
    }

    @Test
    void anotherPhotographerCannotReadThisOne() throws Exception {
        EventVendor other = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        read(other.getUser()).andExpect(status().isForbidden());
    }

    @Test
    void afterTheAccessWindowNothingChanges() throws Exception {
        support.endedDaysAgo(event, 31);
        add(host, photo.getId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.VENDOR_ACCESS_ENDED.getCode()));
    }

    @Test
    void thePhotographerSetsPrintsIncluded() throws Exception {
        mockMvc.perform(as(photographer.getUser(), patch("/api/events/{eventId}/vendors/me/prints-included", event.getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"count\": 40}")))
                .andExpect(status().isNoContent());
        mockMvc.perform(as(host, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(jsonPath("$.photographers[0].hostPrintsIncluded").value(40));
    }

    @Test
    void theHostCannotSetPrintsIncluded() throws Exception {
        mockMvc.perform(as(host, patch("/api/events/{eventId}/vendors/me/prints-included", event.getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"count\": 40}")))
                .andExpect(status().isForbidden());
    }

    @Test
    void addingWritesAnAuditRowWithoutPersonalData() throws Exception {
        add(host, photo.getId());
        assertThat(auditLogRepository.findAll()).anySatisfy(row -> {
            assertThat(row.getAction()).isEqualTo("PRINT_LIST_HOST_ITEMS_ADDED");
            assertThat(row.getChanges()).containsOnlyKeys("itemCount");
        });
    }

    @Autowired
    private event_social_media.repository.user.UserRepository userRepository;

    private User userRepositoryFind(UUID id) {
        return userRepository.findById(id).orElseThrow();
    }
}
```

Run: `./gradlew test --tests "event_social_media.controller.print.HostPrintListTest"`
Expected: FAIL (404s).

- [ ] **Step 3: Extend the audit allowlist**

In `MAIN/service/vendor/VendorAuditWriter.java`, add `"itemCount"` and `"part"` to `ALLOWED_KEYS`.

- [ ] **Step 4: Write the mapper**

`MAIN/service/print/PrintListMapper.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.media.MediaResponseDto;
import event_social_media.dto.print.PrintListDto;
import event_social_media.dto.print.PrintListItemDto;
import event_social_media.model.media.Media;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.print.PrintListStatus;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.service.media.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Lists to DTOs: live prices on open lists, copied ones on sent lists, deleted photos as removed. */
@Component
@RequiredArgsConstructor
public class PrintListMapper {

    private final MediaService mediaService;

    /** The empty host list a photographer has before anyone picks. */
    public static PrintListDto emptyHostList(UUID vendorId) {
        return new PrintListDto(null, vendorId, PrintListOwnerKind.HOST, PrintListStatus.OPEN, null, null, null,
                null, null, 0, List.of());
    }

    /**
     * @param withContact the photographer's view of a sent guest list; contact fields are null otherwise
     */
    public PrintListDto toDto(PrintList list, List<PrintListItem> items, boolean withContact) {
        List<Media> live = items.stream().map(PrintListItem::getMedia).filter(m -> m.getDeletedAt() == null).toList();
        Map<UUID, MediaResponseDto> media = mediaService.toResponseDtosWithUrl(live).stream()
                .collect(Collectors.toMap(MediaResponseDto::getId, Function.identity()));
        boolean sent = list.getStatus() == PrintListStatus.SENT;
        List<PrintListItemDto> rows = items.stream().map(item -> {
            Media m = item.getMedia();
            boolean removed = m.getDeletedAt() != null;
            VendorServiceItem size = item.getServiceItem();
            return new PrintListItemDto(item.getId(), m.getId(), removed ? null : media.get(m.getId()), removed,
                    size == null ? null : size.getId(),
                    sent ? item.getSizeLabel() : size == null ? null : size.getLabel(),
                    sent ? item.getUnitPriceCents() : size == null ? null : size.getPriceCents(),
                    item.getCopies());
        }).toList();
        int removedCount = (int) rows.stream().filter(PrintListItemDto::removed).count();
        return new PrintListDto(list.getId(), list.getEventVendor().getId(), list.getOwnerKind(), list.getStatus(),
                list.getSentAt(), list.getOwnerName(),
                withContact ? list.getContactEmail() : null,
                withContact ? list.getContactPhone() : null,
                list.getTotalCents(), removedCount, rows);
    }
}
```

Check `MediaResponseDto`'s id getter (`getId()` for a Lombok class, `id()` for a record) and adjust.

- [ ] **Step 5: Write `HostPrintListService`**

`MAIN/service/print/HostPrintListService.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.print.AddPrintItemsRequestDto;
import event_social_media.dto.print.PatchPrintItemRequestDto;
import event_social_media.dto.print.PrintListDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaKind;
import event_social_media.model.media.MediaStatus;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.print.PrintListStatus;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.vendor.VendorAuditWriter;
import event_social_media.service.vendor.VendorCapability;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The host's print list for one photographer (spec 2026-10-23, phase 1). Every host edits the same
 * list; the photographer reads it. Writes take the event row lock, like the vendor writes, so two
 * hosts adding at once can't create two lists.
 */
@Service
@RequiredArgsConstructor
public class HostPrintListService {

    private final EventAuthorizationService eventAuthorizationService;
    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final EventVendorRepository eventVendorRepository;
    private final MediaRepository mediaRepository;
    private final PrintListRepository listRepository;
    private final PrintListItemRepository itemRepository;
    private final VendorServiceItemRepository serviceItemRepository;
    private final PrintPicksAccess access;
    private final PrintListMapper mapper;
    private final VendorAuditWriter auditWriter;

    @Value("${print-picks.max-list-items:100}")
    private int maxListItems;

    /** Hosts, and the photographer the list is for. */
    @Transactional(readOnly = true)
    public PrintListDto read(UUID eventId, UUID vendorId, UUID callerUserId) {
        Optional<EventVendor> callerVendor = eventAuthorizationService
                .requireHostOrVendor(eventId, callerUserId, VendorCapability.PRINT_PICKS);
        if (callerVendor.isPresent() && !callerVendor.get().getId().equals(vendorId)) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN, "This list is for another photographer.");
        }
        EventVendor photographer = access.openPhotographer(access.event(eventId), vendorId);
        return listRepository.findByEventVendor_IdAndOwnerKind(photographer.getId(), PrintListOwnerKind.HOST)
                .map(list -> mapper.toDto(list, itemRepository.findByListWithMedia(list.getId()), false))
                .orElseGet(() -> PrintListMapper.emptyHostList(vendorId));
    }

    @Transactional
    public PrintListDto add(UUID eventId, AddPrintItemsRequestDto dto, UUID callerUserId) {
        eventAuthorizationService.requireHost(eventId, callerUserId);
        Event event = lock(eventId);
        EventVendor photographer = access.openPhotographer(event, dto.vendorId());
        PrintList list = listRepository.findByEventVendor_IdAndOwnerKind(photographer.getId(), PrintListOwnerKind.HOST)
                .orElseGet(() -> listRepository.save(newHostList(event, photographer)));
        int added = addItems(list, event, dto.mediaIds(), defaultSize(photographer));
        if (added > 0) {
            auditWriter.write(event, actor(eventId, callerUserId), "PRINT_LIST_HOST_ITEMS_ADDED", "PrintList",
                    list.getId(), Map.of("itemCount", added));
        }
        return mapper.toDto(list, itemRepository.findByListWithMedia(list.getId()), false);
    }

    /** Hosts change host-list items; Part B lets a guest change their own open list's items here too. */
    @Transactional
    public PrintListDto patch(UUID eventId, UUID itemId, PatchPrintItemRequestDto dto, UUID callerUserId) {
        PrintListItem item = writableItem(eventId, itemId, callerUserId);
        if (dto.sizeId() != null) {
            UUID photographerUserId = item.getPrintList().getEventVendor().getUser() == null ? null
                    : item.getPrintList().getEventVendor().getUser().getId();
            VendorServiceItem size = serviceItemRepository.findById(dto.sizeId())
                    .filter(s -> s.getKind() == VendorServiceKind.PRINT && s.getUserId().equals(photographerUserId))
                    .orElseThrow(() -> new BadRequestException(ErrorCode.VALIDATION_FAILED,
                            "That size isn't one of this photographer's sizes."));
            item.setServiceItem(size);
        }
        if (dto.copies() != null) {
            item.setCopies(dto.copies());
        }
        itemRepository.save(item);
        PrintList list = item.getPrintList();
        return mapper.toDto(list, itemRepository.findByListWithMedia(list.getId()), false);
    }

    @Transactional
    public PrintListDto remove(UUID eventId, UUID itemId, UUID callerUserId) {
        PrintListItem item = writableItem(eventId, itemId, callerUserId);
        PrintList list = item.getPrintList();
        itemRepository.delete(item);
        itemRepository.flush();
        return mapper.toDto(list, itemRepository.findByListWithMedia(list.getId()), false);
    }

    /** The photographer sets how many prints their package includes for the host. */
    @Transactional
    public void setPrintsIncluded(UUID eventId, int count, UUID callerUserId) {
        EventVendor vendor = eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.PRINT_PICKS);
        EventVendor managed = eventVendorRepository.findById(vendor.getId()).orElseThrow();
        managed.setHostPrintsIncluded(count);
        eventVendorRepository.save(managed);
    }

    /**
     * Adds what is not on the list yet, in the caller's order. Shared with Part B's guest lists.
     *
     * @return how many items were added
     */
    int addItems(PrintList list, Event event, List<UUID> mediaIds, VendorServiceItem defaultSize) {
        Set<UUID> wanted = new LinkedHashSet<>(mediaIds);
        Set<UUID> present = new HashSet<>(itemRepository.findMediaIdsByListId(list.getId() == null ? UUID.randomUUID() : list.getId()));
        wanted.removeAll(present);
        if (wanted.isEmpty()) {
            return 0;
        }
        if (present.size() + wanted.size() > maxListItems) {
            throw new ConflictException(ErrorCode.PRINT_LIST_FULL,
                    "A print list holds up to " + maxListItems + " photos.");
        }
        List<Media> found = mediaRepository.findByEvent_IdAndIdInAndDeletedAtIsNull(event.getId(), wanted);
        boolean allPrintable = found.size() == wanted.size() && found.stream().allMatch(HostPrintListService::printable);
        if (!allPrintable) {
            throw new BadRequestException(ErrorCode.PRINT_ITEM_INVALID,
                    "Only ready photos of this event can be picked for print.");
        }
        for (UUID id : wanted) {
            Media media = found.stream().filter(m -> m.getId().equals(id)).findFirst().orElseThrow();
            PrintListItem item = new PrintListItem();
            item.setPrintList(list);
            item.setMedia(media);
            item.setServiceItem(defaultSize);
            itemRepository.save(item);
        }
        itemRepository.flush();
        return wanted.size();
    }

    static boolean printable(Media media) {
        return MediaKind.IMAGE.name().equals(media.getMediaType()) && media.getStatus() == MediaStatus.READY;
    }

    /** The photographer's first print size, or null without sizes. */
    VendorServiceItem defaultSize(EventVendor photographer) {
        if (photographer.getUser() == null) {
            return null;
        }
        return serviceItemRepository.findByUserIdAndKindOrderBySortOrderAscCreatedAtAsc(
                photographer.getUser().getId(), VendorServiceKind.PRINT).stream().findFirst().orElse(null);
    }

    private PrintListItem writableItem(UUID eventId, UUID itemId, UUID callerUserId) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        Event event = lock(eventId);
        PrintListItem item = itemRepository.findByIdAndPrintList_Event_Id(itemId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("PrintListItem", itemId));
        PrintList list = item.getPrintList();
        if (list.getOwnerKind() == PrintListOwnerKind.HOST) {
            eventAuthorizationService.requireHost(eventId, callerUserId);
        } else {
            requireGuestOwner(list, eventId, callerUserId);
        }
        access.openPhotographer(event, list.getEventVendor().getId());
        return item;
    }

    /** Part B opens guest items to their owner; until then a guest list item is never writable. */
    void requireGuestOwner(PrintList list, UUID eventId, UUID callerUserId) {
        EventMember member = eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId)
                .orElseThrow(() -> new ForbiddenException(ErrorCode.FORBIDDEN, "Not your list."));
        if (list.getOwnerMember() == null || !list.getOwnerMember().getId().equals(member.getId())) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN, "Not your list.");
        }
        if (list.getStatus() == PrintListStatus.SENT) {
            throw new ConflictException(ErrorCode.PRINT_LIST_LOCKED, "This list was sent and can't change.");
        }
    }

    private Event lock(UUID eventId) {
        return eventRepository.lockById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
    }

    private EventMember actor(UUID eventId, UUID callerUserId) {
        return eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId).orElse(null);
    }

    private static PrintList newHostList(Event event, EventVendor photographer) {
        PrintList list = new PrintList();
        list.setEvent(event);
        list.setEventVendor(photographer);
        list.setOwnerKind(PrintListOwnerKind.HOST);
        return list;
    }
}
```

Notes for the implementer:
- `findMediaIdsByListId` with a not-yet-saved list: the list is saved before `addItems` is called (`orElseGet(... save ...)`), so `list.getId()` is set; the `UUID.randomUUID()` guard only protects a misuse. Remove the guard if your reviewer prefers an assertion.
- `MediaKind` and `MediaStatus` live in `model.media`; check with `grep -rn "enum MediaKind\|enum MediaStatus" src/main/java`.
- `mediaRepository.findByEvent_IdAndIdInAndDeletedAtIsNull(UUID, Collection<UUID>)` already exists (used by `MediaArchiveService.prepareSelected`).

- [ ] **Step 6: Add the endpoints**

In `MAIN/controller/print/PrintPicksController.java`, inject `private final HostPrintListService hostPrintListService;` and add:

```java
    @GetMapping("/api/events/{eventId}/print-lists/host")
    @PreAuthorize("isAuthenticated()")
    public PrintListDto hostList(@PathVariable UUID eventId, @RequestParam("vendorId") UUID vendorId,
                                 Authentication authentication) {
        return hostPrintListService.read(eventId, vendorId, callerId(authentication));
    }

    @PostMapping("/api/events/{eventId}/print-lists/host/items")
    @PreAuthorize("isAuthenticated()")
    public PrintListDto addHostItems(@PathVariable UUID eventId, @Valid @RequestBody AddPrintItemsRequestDto dto,
                                     Authentication authentication) {
        return hostPrintListService.add(eventId, dto, callerId(authentication));
    }

    @PatchMapping("/api/events/{eventId}/print-lists/items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public PrintListDto patchItem(@PathVariable UUID eventId, @PathVariable UUID itemId,
                                  @Valid @RequestBody PatchPrintItemRequestDto dto, Authentication authentication) {
        return hostPrintListService.patch(eventId, itemId, dto, callerId(authentication));
    }

    @DeleteMapping("/api/events/{eventId}/print-lists/items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public PrintListDto removeItem(@PathVariable UUID eventId, @PathVariable UUID itemId,
                                   Authentication authentication) {
        return hostPrintListService.remove(eventId, itemId, callerId(authentication));
    }

    @PatchMapping("/api/events/{eventId}/vendors/me/prints-included")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setPrintsIncluded(@PathVariable UUID eventId, @Valid @RequestBody PrintsIncludedRequestDto dto,
                                  Authentication authentication) {
        hostPrintListService.setPrintsIncluded(eventId, dto.count(), callerId(authentication));
    }
```

Add the imports (`PrintListDto`, the request DTOs, `HostPrintListService`, `Valid`, `HttpStatus`, `PostMapping`, `PatchMapping`, `DeleteMapping`, `RequestBody`, `RequestParam`, `ResponseStatus`).

`/vendors/me/prints-included` must not clash with `VendorController`'s `/vendors/{vendorId}` PATCH: Spring prefers the literal `me` segment, and `vendorId` is a UUID, so `me` would not bind anyway. If the existing `/vendors/me` GET lives in `VendorController`, that's fine.

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.print.HostPrintListTest"`
Expected: PASS (18 tests). If `aNonMember`-style status codes differ (403 vs 404), check `requireHostOrVendor`'s behavior for a plain attendee: it throws `NOT_EVENT_HOST` (403), which is what `aGuestCannotReadOrWriteTheHostList` expects.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/dto/print src/main/java/event_social_media/service/print src/main/java/event_social_media/controller/print src/main/java/event_social_media/service/vendor/VendorAuditWriter.java src/test/java/event_social_media/controller/print/HostPrintListTest.java
git commit -m "feat(print-picks): host print list and prints included

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A6: Zip download of a list with the order sheet

**Files:**
- Modify: `MAIN/service/media/MediaArchiveService.java`
- Create: `MAIN/service/print/PrintSheetWriter.java`, `MAIN/service/print/PrintListArchiveService.java`
- Create: `MAIN/dto/print/PrintListArchiveManifestDto.java`
- Modify: `MAIN/controller/print/PrintPicksController.java`
- Modify: `RES/i18n/messages.properties`, `RES/i18n/messages_el.properties`
- Test: `TEST/service/print/PrintSheetWriterTest.java`, `TEST/controller/print/PrintListArchiveTest.java`

- [ ] **Step 1: Write the order-sheet test**

`TEST/service/print/PrintSheetWriterTest.java`:

```java
package event_social_media.service.print;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PrintSheetWriterTest {

    @Autowired
    private PrintSheetWriter writer;

    @Test
    void listsEveryFileWithSizeAndCopiesAndATotal() {
        byte[] sheet = writer.write("Anna & Nikos", "Host", List.of(
                new PrintSheetWriter.Line("0001_photo.jpg", "13x18", 2),
                new PrintSheetWriter.Line("0002_photo.jpg", null, 1)), Locale.ENGLISH);
        String text = new String(sheet, StandardCharsets.UTF_8);
        assertThat(text)
                .contains("Anna & Nikos")
                .contains("0001_photo.jpg\t13x18\t2")
                .contains("0002_photo.jpg\t-\t1")
                .contains("3");
    }

    @Test
    void writesGreekForAGreekPhotographer() {
        String text = new String(writer.write("Γάμος", "Host",
                List.of(new PrintSheetWriter.Line("0001_photo.jpg", "13x18", 1)), Locale.forLanguageTag("el")),
                StandardCharsets.UTF_8);
        assertThat(text).contains("Γάμος").doesNotContain("Prints:");
    }
}
```

Run: `./gradlew test --tests "event_social_media.service.print.PrintSheetWriterTest"`
Expected: compilation failure.

- [ ] **Step 2: Add the message keys**

In `RES/i18n/messages.properties`, next to the `notification.vendor.*` keys, add:

```properties
print.sheet.title=StoryWall print list
print.sheet.event=Event: {event}
print.sheet.list=List: {owner}
print.sheet.host=Host
print.sheet.columns=File\tSize\tCopies
print.sheet.total=Prints: {count}
```

In `RES/i18n/messages_el.properties`:

```properties
print.sheet.title=Λίστα εκτυπώσεων StoryWall
print.sheet.event=Εκδήλωση: {event}
print.sheet.list=Λίστα: {owner}
print.sheet.host=Οικοδεσπότες
print.sheet.columns=Αρχείο\tΜέγεθος\tΑντίτυπα
print.sheet.total=Εκτυπώσεις: {count}
```

Check how `MessageRenderer.render` formats arguments (named `{event}` as in `notification.vendor.joined.title`): it uses named placeholders, so keep them named.

- [ ] **Step 3: Write `PrintSheetWriter`**

`MAIN/service/print/PrintSheetWriter.java`:

```java
package event_social_media.service.print;

import event_social_media.service.i18n.MessageRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** {@code prints.txt}: the order sheet in a print list's first zip part, for the print lab. */
@Component
@RequiredArgsConstructor
public class PrintSheetWriter {

    public static final String FILE_NAME = "prints.txt";

    private final MessageRenderer messageRenderer;

    /** @param size null without a size; written as "-" */
    public record Line(String entryName, String size, int copies) {
    }

    public byte[] write(String eventTitle, String owner, List<Line> lines, Locale locale) {
        StringBuilder text = new StringBuilder();
        text.append(messageRenderer.plain("print.sheet.title", locale)).append('\n');
        text.append(messageRenderer.render("print.sheet.event", Map.of("event", eventTitle), locale)).append('\n');
        text.append(messageRenderer.render("print.sheet.list", Map.of("owner", owner), locale)).append("\n\n");
        text.append(messageRenderer.plain("print.sheet.columns", locale)).append('\n');
        int total = 0;
        for (Line line : lines) {
            text.append(line.entryName()).append('\t')
                    .append(line.size() == null ? "-" : line.size()).append('\t')
                    .append(line.copies()).append('\n');
            total += line.copies();
        }
        text.append('\n').append(messageRenderer.render("print.sheet.total", Map.of("count", total), locale)).append('\n');
        return text.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** The host list's owner label in the photographer's locale. */
    public String hostLabel(Locale locale) {
        return messageRenderer.plain("print.sheet.host", locale);
    }
}
```

Run: `./gradlew test --tests "event_social_media.service.print.PrintSheetWriterTest"`
Expected: PASS. If `render` escapes `\t` or treats `{count}` as a number format, adjust to `String.valueOf(total)`.

- [ ] **Step 4: Open the archive service to item lists**

In `MAIN/service/media/MediaArchiveService.java`:

1. Make `safeEntryName` public and static (it uses no fields), with a Javadoc note that print lists name entries with it so `prints.txt` matches the zip:
   ```java
   public static String safeEntryName(Media media, int index) {
   ```
   (`MAX_ENTRY_NAME_LENGTH` and `UNNAMED_ENTRY` are already `static final`.)

2. Add, after `writeSelectedArchive`:

```java
    /**
     * The parts a caller-authorized item list (a print list) packs into, as {@link #planParts} packs the
     * gallery, at {@link MediaArchiveVariant#ORIGINAL} (the stored copy where no original was kept).
     */
    public List<List<Media>> planItemParts(List<Media> items) {
        return planParts(items, MediaArchiveVariant.ORIGINAL);
    }

    /** The stored size {@link #planItemParts} counts for one item. */
    public long itemBytes(Media media) {
        return sizeOf(media, MediaArchiveVariant.ORIGINAL);
    }

    /**
     * One part of a caller-authorized item list, ready to stream. No caller check: the print list
     * service has authorized the caller and resolved the items. The download limits apply as for the
     * gallery archive.
     *
     * @param part 1-based
     * @throws BadRequestException        if {@code part} is not in the plan
     * @throws RateLimitExceededException as {@link #prepare}
     */
    public PreparedArchive prepareItems(UUID eventId, UUID callerUserId, List<Media> items, int part) {
        List<List<Media>> parts = planItemParts(items);
        if (part < 1 || part > parts.size()) {
            throw new BadRequestException(ErrorCode.MEDIA_ARCHIVE_PART_NOT_FOUND,
                    "Archive part " + part + " does not exist; this list has " + parts.size() + " part(s).");
        }
        List<Media> partItems = parts.get(part - 1);
        int startIndex = parts.subList(0, part - 1).stream().mapToInt(List::size).sum();
        long bytes = partItems.stream().mapToLong(this::itemBytes).sum();
        ArchiveDownloadLimits.Download download = archiveDownloadLimits.start(
                callerUserId, eventId, bytes, mediaRepository.sumActiveStorageBytesByEvent(eventId));
        log.info("User {} is downloading print list part {}/{} of event {}: {} items, {} bytes",
                callerUserId, part, parts.size(), eventId, partItems.size(), bytes);
        return new PreparedArchive(eventId, MediaArchiveVariant.ORIGINAL, part, parts.size(), startIndex,
                partItems, download);
    }

    /**
     * {@link #writeArchive} with one extra text entry first (a print list's {@code prints.txt}).
     *
     * @param extraName  the entry's name; null for none
     * @param extraBytes the entry's content
     */
    public void writeArchive(PreparedArchive prepared, OutputStream out, String extraName, byte[] extraBytes)
            throws IOException {
        try (ArchiveDownloadLimits.Download ignored = prepared.download()) {
            writeZip(prepared.eventId(), prepared.variant(), prepared.items(), prepared.startIndex(), out,
                    extraName, extraBytes);
        }
    }
```

3. Change `writeZip` to take the extra entry, and make the existing three callers pass `null, null`:

```java
    private void writeZip(UUID eventId, MediaArchiveVariant variant, List<Media> items, int startIndex,
            OutputStream out, String extraName, byte[] extraBytes) throws IOException {
        int index = startIndex;

        ZipOutputStream zip = new ZipOutputStream(out);
        // DEFLATED at NO_COMPRESSION rather than STORED: … (keep the existing comment)
        zip.setMethod(ZipOutputStream.DEFLATED);
        zip.setLevel(Deflater.NO_COMPRESSION);
        if (extraName != null) {
            zip.putNextEntry(new ZipEntry(extraName));
            zip.write(extraBytes);
            zip.closeEntry();
        }
        for (Media media : items) {
            … (unchanged)
        }
        zip.finish();
    }
```

Existing callers: `writeArchive(prepared, out)` → `writeZip(..., out, null, null)`, `writeSelectedArchive` → same, `writeMemberZip` → same.

Run: `./gradlew test --tests "event_social_media.service.media.*Archive*" --tests "event_social_media.controller.media.*Archive*"`
Expected: PASS, unchanged.

- [ ] **Step 5: Write the list archive test**

`TEST/controller/print/PrintListArchiveTest.java`:

```java
package event_social_media.controller.print;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.media.Media;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.service.storage.StorageService;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PrintListArchiveTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private PrintListRepository listRepository;
    @Autowired
    private PrintListItemRepository itemRepository;
    @MockitoBean
    private StorageService storageService;

    private User host;
    private Event event;
    private EventVendor photographer;
    private PrintList list;
    private Media original;

    @BeforeEach
    void setUp() throws Exception {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        list = new PrintList();
        list.setEvent(event);
        list.setEventVendor(photographer);
        list.setOwnerKind(PrintListOwnerKind.HOST);
        listRepository.saveAndFlush(list);
        original = fixtures.newMedia(event, 10);
        original.setOriginalStorageKey("events/" + event.getId() + "/original.jpg");
        original.setOriginalFileSize(20L);
        Media displayOnly = fixtures.newMedia(event, 10);
        for (Media m : List.of(original, displayOnly)) {
            PrintListItem item = new PrintListItem();
            item.setPrintList(list);
            item.setMedia(m);
            item.setCopies(2);
            itemRepository.saveAndFlush(item);
        }
        when(storageService.openObject(anyString())).thenAnswer(inv -> new ByteArrayInputStream(
                inv.getArgument(0, String.class).getBytes()));
    }

    @Test
    void theManifestHasOnePart() throws Exception {
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{eventId}/print-lists/{listId}/archive/manifest",
                        event.getId(), list.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parts.length()").value(1))
                .andExpect(jsonPath("$.parts[0].itemCount").value(2));
    }

    @Test
    void theZipHoldsTheOrderSheetAndTheBestFiles() throws Exception {
        MvcResult started = mockMvc.perform(as(photographer.getUser(),
                        get("/api/events/{eventId}/print-lists/{listId}/archive", event.getId(), list.getId())
                                .param("part", "1")))
                .andExpect(request().asyncStarted())
                .andReturn();
        byte[] zip = mockMvc.perform(asyncDispatch(started)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        List<String> names = new ArrayList<>();
        List<String> bodies = new ArrayList<>();
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            for (ZipEntry entry = in.getNextEntry(); entry != null; entry = in.getNextEntry()) {
                names.add(entry.getName());
                bodies.add(new String(in.readAllBytes()));
            }
        }
        assertThat(names).first().isEqualTo("prints.txt");
        assertThat(names).hasSize(3);
        assertThat(bodies.get(0)).contains("0001_photo.jpg").contains("0002_photo.jpg");
        assertThat(bodies).contains("events/" + event.getId() + "/original.jpg");
    }

    @Test
    void theHostCannotDownloadThePhotographersZip() throws Exception {
        mockMvc.perform(as(host, get("/api/events/{eventId}/print-lists/{listId}/archive/manifest",
                        event.getId(), list.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void anotherPhotographerCannotDownloadIt() throws Exception {
        EventVendor other = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        mockMvc.perform(as(other.getUser(), get("/api/events/{eventId}/print-lists/{listId}/archive/manifest",
                        event.getId(), list.getId())))
                .andExpect(status().isForbidden());
    }
}
```

Check `StorageService`'s package, whether `openObject` throws a checked exception (then `when(...)` needs the test method to declare `throws Exception`, already done in `setUp`), and how the archive controller tests in `TEST/controller/media` drive `StreamingResponseBody` (async dispatch as above, or a direct call). Copy their pattern if it differs. Spring Boot 3.4+ uses `@MockitoBean`; older uses `@MockBean` — match the repo.

Run: `./gradlew test --tests "event_social_media.controller.print.PrintListArchiveTest"`
Expected: FAIL (404).

- [ ] **Step 6: Write the manifest DTO and the service**

`MAIN/dto/print/PrintListArchiveManifestDto.java`:

```java
package event_social_media.dto.print;

import java.util.List;

/** The zip parts of one print list. Part 1 also holds {@code prints.txt}. */
public record PrintListArchiveManifestDto(List<Part> parts) {

    public record Part(int part, int itemCount, long bytes) {
    }
}
```

`MAIN/service/print/PrintListArchiveService.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.print.PrintListArchiveManifestDto;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.Event;
import event_social_media.model.media.Media;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.print.PrintListStatus;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.media.MediaArchiveService;
import event_social_media.service.vendor.VendorAuditWriter;
import event_social_media.service.vendor.VendorCapability;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * The photographer's download of one list: the host list, or (part B) a sent guest list. Live photos
 * only, best available file, packed in parts like the gallery archive; part 1 starts with {@code prints.txt}.
 */
@Service
@RequiredArgsConstructor
public class PrintListArchiveService {

    private final EventAuthorizationService eventAuthorizationService;
    private final PrintListRepository listRepository;
    private final PrintListItemRepository itemRepository;
    private final MediaArchiveService mediaArchiveService;
    private final PrintSheetWriter sheetWriter;
    private final VendorAuditWriter auditWriter;

    /** A part, resolved and authorized, with its order sheet when it is part 1. */
    public record PreparedListPart(MediaArchiveService.PreparedArchive archive, String fileName, byte[] sheet) {
    }

    @Transactional(readOnly = true)
    public PrintListArchiveManifestDto manifest(UUID eventId, UUID listId, UUID callerUserId) {
        Resolved resolved = resolve(eventId, listId, callerUserId);
        List<PrintListArchiveManifestDto.Part> parts = new ArrayList<>();
        int number = 0;
        for (List<Media> part : mediaArchiveService.planItemParts(resolved.media())) {
            parts.add(new PrintListArchiveManifestDto.Part(++number, part.size(),
                    part.stream().mapToLong(mediaArchiveService::itemBytes).sum()));
        }
        return new PrintListArchiveManifestDto(parts);
    }

    @Transactional
    public PreparedListPart prepare(UUID eventId, UUID listId, int part, UUID callerUserId) {
        Resolved resolved = resolve(eventId, listId, callerUserId);
        MediaArchiveService.PreparedArchive archive =
                mediaArchiveService.prepareItems(eventId, callerUserId, resolved.media(), part);
        byte[] sheet = part == 1 ? sheet(resolved) : null;
        auditWriter.write(resolved.list().getEvent(), resolved.vendor().getMember(), "PRINT_LIST_DOWNLOADED",
                "PrintList", listId, Map.of("part", part, "itemCount", archive.items().size()));
        String owner = resolved.list().getOwnerKind() == PrintListOwnerKind.HOST ? "host" : "guest";
        return new PreparedListPart(archive, "prints-" + owner + "-" + part + ".zip", sheet);
    }

    public void write(PreparedListPart prepared, OutputStream out) throws IOException {
        mediaArchiveService.writeArchive(prepared.archive(), out,
                prepared.sheet() == null ? null : PrintSheetWriter.FILE_NAME, prepared.sheet());
    }

    private record Resolved(PrintList list, EventVendor vendor, List<PrintListItem> liveItems, List<Media> media) {
    }

    private Resolved resolve(UUID eventId, UUID listId, UUID callerUserId) {
        EventVendor vendor = eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.PRINT_PICKS);
        PrintList list = listRepository.findByIdAndEvent_Id(listId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("PrintList", listId));
        if (!list.getEventVendor().getId().equals(vendor.getId())) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN, "This list is for another photographer.");
        }
        if (list.getOwnerKind() == PrintListOwnerKind.GUEST && list.getStatus() != PrintListStatus.SENT) {
            throw new ResourceNotFoundException("PrintList", listId);
        }
        List<PrintListItem> live = itemRepository.findByListWithMedia(listId).stream()
                .filter(i -> i.getMedia().getDeletedAt() == null)
                .toList();
        return new Resolved(list, vendor, live, live.stream().map(PrintListItem::getMedia).toList());
    }

    private byte[] sheet(Resolved resolved) {
        PrintList list = resolved.list();
        User user = resolved.vendor().getUser();
        Locale locale = Locale.forLanguageTag(user == null || user.getLocale() == null ? "en" : user.getLocale());
        boolean sent = list.getStatus() == PrintListStatus.SENT;
        List<PrintSheetWriter.Line> lines = new ArrayList<>();
        int index = 0;
        for (PrintListItem item : resolved.liveItems()) {
            String size = sent ? item.getSizeLabel() : item.getServiceItem() == null ? null : item.getServiceItem().getLabel();
            lines.add(new PrintSheetWriter.Line(MediaArchiveService.safeEntryName(item.getMedia(), ++index), size,
                    item.getCopies()));
        }
        Event event = list.getEvent();
        String owner = list.getOwnerKind() == PrintListOwnerKind.HOST ? sheetWriter.hostLabel(locale) : list.getOwnerName();
        return sheetWriter.write(event.getTitle(), owner == null ? "-" : owner, lines, locale);
    }
}
```

Check the `Event` title getter (`getTitle()`) and `User.getLocale()` exist (both are used elsewhere in the codebase).

The audit row is written inside `prepare` (a write transaction), which runs before the stream starts. That mirrors `MediaArchiveService.prepare` being transactional but keeps the stream outside any transaction.

- [ ] **Step 7: Add the endpoints**

In `MAIN/controller/print/PrintPicksController.java`, inject `private final PrintListArchiveService archiveService;` and add:

```java
    @GetMapping("/api/events/{eventId}/print-lists/{listId}/archive/manifest")
    @PreAuthorize("isAuthenticated()")
    public PrintListArchiveManifestDto archiveManifest(@PathVariable UUID eventId, @PathVariable UUID listId,
                                                       Authentication authentication) {
        return archiveService.manifest(eventId, listId, callerId(authentication));
    }

    /** Same streaming and rate-limit budget as {@code MediaController#archiveSelected}. */
    @NoOpenSessionInView
    @GetMapping("/api/events/{eventId}/print-lists/{listId}/archive")
    @RateLimit(name = "media.archive.download", limit = 60, windowSeconds = 3600)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StreamingResponseBody> archive(@PathVariable UUID eventId, @PathVariable UUID listId,
                                                         @RequestParam(value = "part", defaultValue = "1") int part,
                                                         Authentication authentication) {
        PrintListArchiveService.PreparedListPart prepared =
                archiveService.prepare(eventId, listId, part, callerId(authentication));
        StreamingResponseBody body = out -> archiveService.write(prepared, out);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + prepared.fileName() + "\"")
                .body(body);
    }
```

Imports: `NoOpenSessionInView` (`event_social_media.config`), `RateLimit` (`event_social_media.service.ratelimit`), `ResponseEntity`, `StreamingResponseBody`, `MediaType`, `HttpHeaders`, `PrintListArchiveManifestDto`, `PrintListArchiveService`.

- [ ] **Step 8: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.print.PrintListArchiveTest" --tests "event_social_media.service.print.*"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/event_social_media/service/media/MediaArchiveService.java src/main/java/event_social_media/service/print src/main/java/event_social_media/dto/print src/main/java/event_social_media/controller/print src/main/resources/i18n src/test/java/event_social_media
git commit -m "feat(print-picks): photographer zip download with prints.txt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A7: Reminder 3 days before access ends

**Files:**
- Modify: `MAIN/model/user/NotificationType.java`, `MAIN/model/user/NotificationCtaTarget.java`
- Create: `MAIN/service/print/PrintPicksReminderJob.java`
- Modify: `RES/i18n/messages.properties`, `messages_el.properties`, `RES/application.properties`
- Test: `TEST/service/print/PrintPicksReminderJobTest.java`

- [ ] **Step 1: Add the types and the CTA**

In `MAIN/model/user/NotificationType.java`, after `VENDOR_JOINED`, add `PRINT_PICKS_ENDING` (and `PRINT_LIST_SENT`, used in Part B — adding both now keeps the frontend type in one change). Keep the enum's comma/semicolon style.

In `MAIN/model/user/NotificationCtaTarget.java`, after `EVENT_VENDORS(...)`:

```java
    /** The vendor's own page in the event, where the photographer's print lists are (added 2026-10-23). */
    EVENT_VENDOR_PAGE("/events/{eventId}/tools/vendors/me");
```

(turn the previous `;` into `,`).

- [ ] **Step 2: Add the text**

`RES/i18n/messages.properties`:

```properties
notification.print.ending.title=Print picks close in 3 days
notification.print.ending.body=The host picked {count} photos for print. Download them before your access ends.
notification.cta.view_prints=View prints
```

`RES/i18n/messages_el.properties`:

```properties
notification.print.ending.title=Οι επιλογές για εκτύπωση κλείνουν σε 3 ημέρες
notification.print.ending.body=Οι οικοδεσπότες επέλεξαν {count} φωτογραφίες για εκτύπωση. Κατεβάστε τες πριν λήξει η πρόσβασή σας.
notification.cta.view_prints=Δείτε τις εκτυπώσεις
```

`RES/application.properties`, next to `app.vendors.access-sweep.cron` (or the nearest `app.*cron`):

```properties
app.print-picks.reminder.cron=${PRINT_PICKS_REMINDER_CRON:0 40 9 * * *}
```

- [ ] **Step 3: Write the failing test**

`TEST/service/print/PrintPicksReminderJobTest.java`:

```java
package event_social_media.service.print;

import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.user.NotificationType;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.notification.NotificationRepository;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class PrintPicksReminderJobTest {

    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private PrintListRepository listRepository;
    @Autowired
    private PrintListItemRepository itemRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private PrintPicksReminderJob job;

    /** The default window is 30 days after the end: ended 28 days ago leaves 2 days. */
    @Test
    void remindsThePhotographerOnceWhenTheWindowEndsWithinThreeDays() {
        EventVendor photographer = withHostPicks(28);
        job.run();
        job.run();
        assertThat(remindersFor(photographer)).isEqualTo(1);
    }

    @Test
    void noReminderWithMoreThanThreeDaysLeft() {
        EventVendor photographer = withHostPicks(10);
        job.run();
        assertThat(remindersFor(photographer)).isZero();
    }

    @Test
    void noReminderAfterTheWindowClosed() {
        EventVendor photographer = withHostPicks(31);
        job.run();
        assertThat(remindersFor(photographer)).isZero();
    }

    private EventVendor withHostPicks(int endedDaysAgo) {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        support.endedDaysAgo(event, endedDaysAgo);
        PrintList list = new PrintList();
        list.setEvent(event);
        list.setEventVendor(photographer);
        list.setOwnerKind(PrintListOwnerKind.HOST);
        listRepository.saveAndFlush(list);
        PrintListItem item = new PrintListItem();
        item.setPrintList(list);
        item.setMedia(fixtures.newMedia(event, 10));
        itemRepository.saveAndFlush(item);
        return photographer;
    }

    private long remindersFor(EventVendor photographer) {
        return notificationRepository.findAll().stream()
                .filter(n -> n.getType() == NotificationType.PRINT_PICKS_ENDING)
                .filter(n -> n.getRecipientUser().getId().equals(photographer.getUser().getId()))
                .count();
    }
}
```

`NotificationEmitter.emit` runs in its own transaction (`REQUIRES_NEW`), so inside a `@Transactional` test it may not see the uncommitted event rows, or its rows may not roll back. Check `VendorJoinedNotifierTest` for how that suite handles it (it probably isn't `@Transactional`, or mocks the emitter) and follow the same pattern: either drop `@Transactional` and clean up in `@AfterEach`, or `@MockitoBean NotificationEmitter` and verify `emit` was called once with `PRINT_PICKS_ENDING` (and returns `true` then `false` for the dedupe). Prefer the mock; it tests the job's own logic, and the emitter's dedupe already has tests.

Run: `./gradlew test --tests "event_social_media.service.print.PrintPicksReminderJobTest"`
Expected: compilation failure.

- [ ] **Step 4: Write the job**

`MAIN/service/print/PrintPicksReminderJob.java`:

```java
package event_social_media.service.print;

import event_social_media.model.event.Event;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.user.NotificationCategory;
import event_social_media.model.user.NotificationCtaTarget;
import event_social_media.model.user.NotificationSeverity;
import event_social_media.model.user.NotificationType;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.repository.vendor.EventVendorRepository;
import event_social_media.service.i18n.MessageRenderer;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.service.vendor.VendorsConfigReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Tells a photographer once, 3 days before their access ends, that the host has picks waiting
 * (spec 2026-10-23, "Notifications"). Sent once through the emitter's dedupe key.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PrintPicksReminderJob {

    static final int DAYS_BEFORE = 3;
    private static final String TITLE_KEY = "notification.print.ending.title";
    private static final String BODY_KEY = "notification.print.ending.body";
    private static final String CTA_KEY = "notification.cta.view_prints";

    private final PrintListRepository listRepository;
    private final PrintListItemRepository itemRepository;
    private final EventRepository eventRepository;
    private final EventVendorRepository eventVendorRepository;
    private final VendorsConfigReader vendorsConfigReader;
    private final NotificationEmitter notificationEmitter;
    private final MessageRenderer messageRenderer;
    private final PlatformTransactionManager transactionManager;

    public static String dedupeKey(java.util.UUID eventVendorId) {
        return "print.ending:vendor:" + eventVendorId;
    }

    @Scheduled(cron = "${app.print-picks.reminder.cron:0 40 9 * * *}", zone = "UTC")
    public void run() {
        OffsetDateTime now = OffsetDateTime.now();
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setReadOnly(true);
        int told = 0;
        for (PrintListRepository.ReminderCandidate candidate : listRepository.findReminderCandidates()) {
            try {
                Boolean emitted = transaction.execute(status -> remind(candidate, now));
                if (Boolean.TRUE.equals(emitted)) {
                    told++;
                }
            } catch (RuntimeException e) {
                log.error("Print picks reminder failed for vendor {} of event {}",
                        candidate.getVendorId(), candidate.getEventId(), e);
            }
        }
        log.info("Print picks reminder told {} photographer(s)", told);
    }

    private boolean remind(PrintListRepository.ReminderCandidate candidate, OffsetDateTime now) {
        Event event = eventRepository.findById(candidate.getEventId()).orElse(null);
        EventVendor vendor = eventVendorRepository.findById(candidate.getVendorId()).orElse(null);
        if (event == null || vendor == null || vendor.getUser() == null || vendor.getMember() == null) {
            return false;
        }
        Optional<VendorsConfig> config = vendorsConfigReader.forEvent(event);
        if (config.isEmpty()) {
            return false;
        }
        OffsetDateTime endsAt = config.get().accessEndsAt(event);
        if (!now.isBefore(endsAt) || endsAt.isAfter(now.plusDays(DAYS_BEFORE))) {
            return false;
        }
        PrintList list = listRepository.findByEventVendor_IdAndOwnerKind(vendor.getId(), PrintListOwnerKind.HOST)
                .orElse(null);
        if (list == null) {
            return false;
        }
        long count = itemRepository.findByListWithMedia(list.getId()).stream()
                .filter(i -> i.getMedia().getDeletedAt() == null).count();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("count", count);
        return notificationEmitter.emit(new NotificationDraft(
                vendor.getUser().getId(),
                vendor.getMember().getId(),
                NotificationType.PRINT_PICKS_ENDING,
                NotificationCategory.SYSTEM,
                NotificationSeverity.INFO,
                messageRenderer.render(TITLE_KEY, payload, Locale.ENGLISH),
                messageRenderer.render(BODY_KEY, payload, Locale.ENGLISH),
                messageRenderer.render(CTA_KEY, payload, Locale.ENGLISH),
                NotificationCtaTarget.EVENT_VENDOR_PAGE,
                Map.of("eventId", event.getId().toString()),
                null,
                dedupeKey(vendor.getId()),
                payload,
                TITLE_KEY,
                BODY_KEY,
                CTA_KEY));
    }
}
```

Match the `NotificationDraft` constructor exactly as `VendorJoinedNotifier` calls it (argument order above is copied from it). Check the packages of `NotificationCategory`, `NotificationSeverity` (`model.user` alongside `NotificationType`?) with grep.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.print.PrintPicksReminderJobTest" --tests "event_social_media.service.notification.*"`
Expected: PASS. The email dispatcher emails `PRINT_PICKS_ENDING` (it is not in `IN_APP_ONLY`), which is what the spec wants.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/model/user src/main/java/event_social_media/service/print/PrintPicksReminderJob.java src/main/resources src/test/java/event_social_media/service/print/PrintPicksReminderJobTest.java
git commit -m "feat(print-picks): remind photographers 3 days before access ends

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A8: Data export, regression sweep, docs

**Files:**
- Modify: `MAIN/dto/user/export/UserDataExportDto.java`, `MAIN/service/user/export/MeDataExportService.java`
- Modify: `TEST/service/vendor/VendorAccountDataTest.java`
- Modify: whichever authorization differential test exists (the vendors plan item 15)

- [ ] **Step 1: Write the failing export test**

In `TEST/service/vendor/VendorAccountDataTest.java`, add (reuse its setup style, `support`, `fixtures`, and the export call the existing `theExportCarriesTheProfileAndVendorRoles` uses):

```java
    @Test
    void theExportCarriesTheVendorsServices() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        VendorServiceItem size = new VendorServiceItem();
        size.setUserId(vendor.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel("13x18");
        size.setPriceCents(300);
        serviceItemRepository.saveAndFlush(size);

        UserDataExportDto export = exportService.export(vendor.getUser().getId());

        assertThat(export.vendorServices()).singleElement()
                .satisfies(s -> {
                    assertThat(s.label()).isEqualTo("13x18");
                    assertThat(s.priceCents()).isEqualTo(300);
                });
    }

    @Test
    void deletingTheAccountRemovesTheServices() {
        Event event = support.vendorEventHostedBy(fixtures.newUser());
        EventVendor vendor = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        VendorServiceItem size = new VendorServiceItem();
        size.setUserId(vendor.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel("13x18");
        size.setPriceCents(300);
        serviceItemRepository.saveAndFlush(size);

        // the same account deletion call the class's deletingTheAccountRemovesTheProfileAndKeepsTheEventsRows uses
        deleteAccount(vendor.getUser());

        assertThat(serviceItemRepository.findById(size.getId())).isEmpty();
    }
```

Name the export service field and deletion helper as the existing tests in that class do (`exportService`, a deletion helper or service call); autowire `VendorServiceItemRepository serviceItemRepository`.

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccountDataTest"`
Expected: FAIL to compile (`vendorServices()` does not exist).

- [ ] **Step 2: Implement the export**

In `MAIN/dto/user/export/UserDataExportDto.java`, add the component `List<VendorService> vendorServices` after `vendorRoles`, and the record:

```java
    public record VendorService(String kind, String label, int priceCents, String currency) {
    }
```

In `MAIN/service/user/export/MeDataExportService.java`, inject `VendorServiceItemRepository` and pass, after the vendor roles list:

```java
                serviceItemRepository.findByUserIdOrderByKindAscSortOrderAscCreatedAtAsc(userId).stream()
                        .map(s -> new UserDataExportDto.VendorService(name(s.getKind()), s.getLabel(),
                                s.getPriceCents(), s.getCurrency()))
                        .toList()
```

Fix every other `new UserDataExportDto(` the compiler reports (tests) by adding `List.of()`.

Account deletion needs no code: `vendor_service_items.user_id` cascades from `vendor_profiles`, which the deletion already removes. If the H2 test still finds the row, the deletion removes the profile through JPA without a DB cascade in H2: add, in `UserAnonymizer` right before the profile is deleted, `em.createQuery("delete from VendorServiceItem s where s.userId = :id").setParameter("id", userId).executeUpdate();`.

Run: `./gradlew test --tests "event_social_media.service.vendor.VendorAccountDataTest" --tests "event_social_media.service.user.*"`
Expected: PASS.

- [ ] **Step 3: Add the new endpoints to the authorization differential test**

The vendors work added a test where a vendor of each type must get the same status as a plain attendee on every endpoint, except listed exceptions (vendors backend plan, decision 15). Find it: `grep -rln "differential\|sameStatusAsAnAttendee\|OPENED_ON_PURPOSE" src/test/java`. Add the Part A endpoints that a photographer may use on purpose to its exceptions list:
- `GET /api/events/{eventId}/print-lists/host`
- `PATCH /api/events/{eventId}/vendors/me/prints-included`
- `GET /api/events/{eventId}/print-lists/{listId}/archive/manifest`
- `GET /api/events/{eventId}/print-lists/{listId}/archive`

Run that test class. Expected: PASS. A failure naming another print endpoint means a non-photographer vendor got a different status than an attendee there: fix the service, not the test.

- [ ] **Step 4: Full suite and graph**

Run: `./gradlew test`
Expected: all green. Then `graphify update .`.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(print-picks): export services; cover print endpoints in the vendor auth test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Hand over**

Tell the user Part A is ready for a PR into `staging` and list the endpoints and error codes for the frontend plan. Do not push until they say so.

---

# Part B — guest picks

Start Part B from a branch cut from `staging` after Part A has merged (`feat/guest-print-picks`).

### Task B1: Scope enum, vendors config key, host setting table

**Files:**
- Modify: `MAIN/model/print/GuestPrintScope.java`
- Create: `RES/db/migration/V180__guest_print_picks.sql`
- Create: `MAIN/model/print/EventPrintSettings.java`, `MAIN/repository/print/EventPrintSettingsRepository.java`
- Modify: `MAIN/service/vendor/VendorsConfig.java`
- Test: `TEST/model/print/GuestPrintScopeTest.java`, `TEST/service/vendor/VendorsConfigTest.java`, `TEST/migration/GuestPrintPicksMigrationTest.java`

- [ ] **Step 1: Write the failing tests**

`TEST/model/print/GuestPrintScopeTest.java`:

```java
package event_social_media.model.print;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GuestPrintScopeTest {

    @Test
    void theHostsChoiceIsCappedByThePlan() {
        assertThat(GuestPrintScope.ANY.cappedBy(GuestPrintScope.OWN)).isEqualTo(GuestPrintScope.OWN);
        assertThat(GuestPrintScope.OWN.cappedBy(GuestPrintScope.ANY)).isEqualTo(GuestPrintScope.OWN);
        assertThat(GuestPrintScope.ANY.cappedBy(GuestPrintScope.OFF)).isEqualTo(GuestPrintScope.OFF);
    }

    @Test
    void parsesOnlyKnownNames() {
        assertThat(GuestPrintScope.parse("OWN")).isEqualTo(GuestPrintScope.OWN);
        assertThat(GuestPrintScope.parse("nope")).isEqualTo(GuestPrintScope.OFF);
        assertThat(GuestPrintScope.parse(null)).isEqualTo(GuestPrintScope.OFF);
    }
}
```

In `TEST/service/vendor/VendorsConfigTest.java`, add:

```java
    @Test
    void guestPrintPicksIsOptionalAndReadsOffWhenMissing() {
        assertThat(VendorsConfig.from(VendorsConfig.DEFAULTS).guestPrintPicks()).isEqualTo(GuestPrintScope.OFF);
        Map<String, Object> withKey = new HashMap<>(VendorsConfig.DEFAULTS);
        withKey.put(VendorsConfig.GUEST_PRINT_PICKS, "ANY");
        assertThat(VendorsConfig.from(withKey).guestPrintPicks()).isEqualTo(GuestPrintScope.ANY);
    }

    @Test
    void validateAcceptsTheConfigWithOrWithoutGuestPrintPicks() {
        Map<String, Object> without = new HashMap<>(VendorsConfig.DEFAULTS);
        without.remove(VendorsConfig.GUEST_PRINT_PICKS);
        VendorsConfig.validate(without);
        Map<String, Object> with = new HashMap<>(without);
        with.put(VendorsConfig.GUEST_PRINT_PICKS, "OWN");
        VendorsConfig.validate(with);
    }

    @Test
    void validateRefusesAnUnknownGuestPrintPicksValue() {
        Map<String, Object> config = new HashMap<>(VendorsConfig.DEFAULTS);
        config.put(VendorsConfig.GUEST_PRINT_PICKS, "SOME");
        assertThatThrownBy(() -> VendorsConfig.validate(config)).isInstanceOf(BadRequestException.class);
    }
```

Run: `./gradlew test --tests "event_social_media.model.print.GuestPrintScopeTest" --tests "event_social_media.service.vendor.VendorsConfigTest"`
Expected: compilation failure.

- [ ] **Step 2: Implement the enum**

`MAIN/model/print/GuestPrintScope.java`:

```java
package event_social_media.model.print;

import java.util.Arrays;

/** What guests may pick for print: nothing, their own uploads, or any photo they can see. Ordered narrow to wide. */
public enum GuestPrintScope {
    OFF,
    OWN,
    ANY;

    /** The narrower of this (the host's choice) and {@code ceiling} (the plan's). */
    public GuestPrintScope cappedBy(GuestPrintScope ceiling) {
        return ordinal() <= ceiling.ordinal() ? this : ceiling;
    }

    /** Unknown or missing reads {@code OFF}: config fails closed. */
    public static GuestPrintScope parse(Object value) {
        return Arrays.stream(values()).filter(scope -> scope.name().equals(value)).findFirst().orElse(OFF);
    }
}
```

- [ ] **Step 3: Implement the config key**

In `MAIN/service/vendor/VendorsConfig.java`:
- Add the component `GuestPrintScope guestPrintPicks` at the end of the record.
- Add `public static final String GUEST_PRINT_PICKS = "guestPrintPicks";`.
- `DEFAULTS`: keep the four keys and add `GUEST_PRINT_PICKS, "OFF"` (`Map.of` takes up to 10 pairs).
- `from(...)`: pass `GuestPrintScope.parse(config.get(GUEST_PRINT_PICKS))` as the last argument.
- `validate(...)`: replace the exact-keys check with "the four required keys are present, and the only other key allowed is `guestPrintPicks`":

```java
    private static final Set<String> OPTIONAL_KEYS = Set.of(GUEST_PRINT_PICKS);

    public static void validate(Map<String, Object> config) {
        if (config == null || !config.keySet().containsAll(KEYS)
                || !KEYS_AND_OPTIONAL.containsAll(config.keySet())) {
            throw new BadRequestException(ErrorCode.MODULE_CONFIG_VALUE_INVALID,
                    "vendors config must have " + MAX_VENDORS + ", " + ACCESS_DAYS + ", " + PRO_STORAGE_BYTES
                            + " and " + ALLOWED_TYPES + ", and may have " + GUEST_PRINT_PICKS + ".");
        }
        … (the existing number and type checks, unchanged)
        if (config.containsKey(GUEST_PRINT_PICKS)
                && Arrays.stream(GuestPrintScope.values()).noneMatch(s -> s.name().equals(config.get(GUEST_PRINT_PICKS)))) {
            throw new BadRequestException(ErrorCode.MODULE_CONFIG_VALUE_INVALID,
                    "vendors.guestPrintPicks must be OFF, OWN or ANY.");
        }
    }
```

with `private static final Set<String> KEYS_AND_OPTIONAL = union of KEYS and OPTIONAL_KEYS` (build it in a static initializer or with `Stream.concat`). Update the Javadoc of `validate` ("all four keys are required; `guestPrintPicks` is optional; no other key is allowed").

Fix every `new VendorsConfig(` the compiler reports (tests) by adding `GuestPrintScope.OFF`. Existing tests that assert the old "exactly four keys" message: update the expected message only.

- [ ] **Step 4: Write the migration and the entity**

`RES/db/migration/V180__guest_print_picks.sql`:

```sql
-- Print picks, part B (guest picks): see docs/superpowers/plans/2026-10-23-print-picks-backend.md, Task B1.

-- 1. The host's choice for guests. No row reads OFF.
CREATE TABLE event_print_settings (
    event_id    UUID PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
    guest_scope VARCHAR(10) NOT NULL DEFAULT 'OFF',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_event_print_settings_scope CHECK (guest_scope IN ('OFF', 'OWN', 'ANY'))
);

-- 2. The plan's ceiling, per the spec's defaults: Basic off, Plus own photos, Pro any photo. Other
--    plans get OFF; admins change it per plan. Rows that already have the key are left alone.
UPDATE plan_tier_module_configs c
SET default_config = c.default_config || jsonb_build_object('guestPrintPicks',
        CASE pt.code WHEN 'PLUS' THEN 'OWN' WHEN 'PRO' THEN 'ANY' ELSE 'OFF' END),
    updated_at = NOW()
FROM plan_tiers pt
WHERE c.plan_tier_id = pt.id
  AND c.module_key = 'vendors'
  AND pt.scope = 'EVENT'
  AND NOT (c.default_config ? 'guestPrintPicks');
```

`MAIN/model/print/EventPrintSettings.java`:

```java
package event_social_media.model.print;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** The host's guest print picks choice for one event. No row means {@code OFF}. */
@Getter
@Setter
@Entity
@Table(name = "event_print_settings")
public class EventPrintSettings {

    @Id
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "guest_scope", nullable = false, length = 10)
    private GuestPrintScope guestScope = GuestPrintScope.OFF;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
```

`MAIN/repository/print/EventPrintSettingsRepository.java`:

```java
package event_social_media.repository.print;

import event_social_media.model.print.EventPrintSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EventPrintSettingsRepository extends JpaRepository<EventPrintSettings, UUID> {
}
```

`TEST/migration/GuestPrintPicksMigrationTest.java` (same annotations as `PrintPicksMigrationTest`):

```java
    @Test
    void plansGetTheSpecsDefaults() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select pt.code, c.default_config ->> 'guestPrintPicks' as scope
                from plan_tier_module_configs c join plan_tiers pt on pt.id = c.plan_tier_id
                where c.module_key = 'vendors' and pt.scope = 'EVENT'""");
        assertThat(rows).allSatisfy(row -> {
            String expected = switch ((String) row.get("code")) {
                case "PLUS" -> "OWN";
                case "PRO" -> "ANY";
                default -> "OFF";
            };
            assertThat(row.get("scope")).isEqualTo(expected);
        });
    }

    @Test
    void theHostSettingRefusesAnUnknownScope() {
        assertThat(jdbc.queryForObject("select pg_get_constraintdef(oid) from pg_constraint where conname = ?",
                String.class, "chk_event_print_settings_scope")).contains("OWN").contains("ANY");
    }
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.model.print.*" --tests "event_social_media.service.vendor.*" --tests "event_social_media.service.platform.*"` and, with Docker, `--tests "event_social_media.migration.GuestPrintPicksMigrationTest"`.
Expected: PASS. `PlanCatalogBootstrap` seeds `VendorsConfig.DEFAULTS` (now with `guestPrintPicks: OFF`) for H2.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat(print-picks): guest scope config key and host setting table

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B2: Effective scope, host setting endpoint, event detail field

**Files:**
- Modify: `MAIN/service/print/GuestScopeReader.java`
- Create: `MAIN/service/print/PrintSettingsService.java`, `MAIN/dto/print/GuestPrintScopeRequestDto.java`
- Modify: `MAIN/controller/print/PrintPicksController.java`
- Modify: `MAIN/dto/event/EventDetailResponseDto.java`, `MAIN/service/event/EventService.java`
- Test: `TEST/controller/print/GuestPrintSettingsTest.java`

- [ ] **Step 1: Write the failing test**

`TEST/controller/print/GuestPrintSettingsTest.java`:

```java
package event_social_media.controller.print;

import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static event_social_media.service.vendor.VendorTestSupport.as;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GuestPrintSettingsTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private VendorServiceItemRepository serviceItemRepository;

    private User host;
    private User guest;
    private Event event;
    private EventVendor photographer;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        support.setConfig(event, VendorsConfig.GUEST_PRINT_PICKS, "ANY");
        guest = fixtures.newUser();
        fixtures.newMember(event, guest, EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
    }

    private void pricePhotographer() {
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(photographer.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);
        VendorServiceItem size = new VendorServiceItem();
        size.setUserId(photographer.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel("13x18");
        size.setPriceCents(300);
        serviceItemRepository.saveAndFlush(size);
    }

    private ResultActions set(User user, String scope) throws Exception {
        return mockMvc.perform(as(user, patch("/api/events/{eventId}/print-picks/guest-scope", event.getId())
                .contentType(MediaType.APPLICATION_JSON).content("{\"scope\": \"" + scope + "\"}")));
    }

    @Test
    void theHostTurnsGuestPicksOnAndTheEventDetailShowsIt() throws Exception {
        pricePhotographer();
        set(host, "OWN").andExpect(status().isOk()).andExpect(jsonPath("$.guestScope").value("OWN"));
        mockMvc.perform(as(guest, get("/api/events/{eventId}", event.getId())))
                .andExpect(jsonPath("$.guestPrintScope").value("OWN"));
        mockMvc.perform(as(guest, get("/api/events/{eventId}/print-picks", event.getId())))
                .andExpect(jsonPath("$.guestScope").value("OWN"))
                .andExpect(jsonPath("$.photographers[0].sizes[0].label").value("13x18"))
                .andExpect(jsonPath("$.photographers[0].hostPrintsIncluded").doesNotExist());
    }

    @Test
    void notBeyondThePlan() throws Exception {
        pricePhotographer();
        support.setConfig(event, VendorsConfig.GUEST_PRINT_PICKS, "OWN");
        set(host, "ANY")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_PICKS_UNAVAILABLE.getCode()));
    }

    @Test
    void notWithoutAPricedPhotographer() throws Exception {
        set(host, "ANY")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_PRICES_MISSING.getCode()));
    }

    @Test
    void offIsAlwaysAllowed() throws Exception {
        set(host, "OFF").andExpect(status().isOk());
    }

    @Test
    void aGuestCannotChangeIt() throws Exception {
        set(guest, "OFF").andExpect(status().isForbidden());
    }

    @Test
    void aPlanCutLowersTheEffectiveScope() throws Exception {
        pricePhotographer();
        set(host, "ANY");
        support.setConfig(event, VendorsConfig.GUEST_PRINT_PICKS, "OWN");
        mockMvc.perform(as(guest, get("/api/events/{eventId}", event.getId())))
                .andExpect(jsonPath("$.guestPrintScope").value("OWN"));
    }
}
```

Check the event detail endpoint path (`/api/events/{id}`) in `EventController`.

Run: `./gradlew test --tests "event_social_media.controller.print.GuestPrintSettingsTest"`
Expected: FAIL.

- [ ] **Step 2: Implement the reader**

Replace `MAIN/service/print/GuestScopeReader.java`:

```java
package event_social_media.service.print;

import event_social_media.model.event.Event;
import event_social_media.model.print.EventPrintSettings;
import event_social_media.model.print.GuestPrintScope;
import event_social_media.repository.print.EventPrintSettingsRepository;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.service.vendor.VendorsConfigReader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * What guests may pick in an event right now: the host's choice capped by the plan, and {@code OFF}
 * while the vendors module does not work for the event.
 */
@Service
@RequiredArgsConstructor
public class GuestScopeReader {

    private final EventPrintSettingsRepository settingsRepository;
    private final VendorsConfigReader vendorsConfigReader;

    @Transactional(readOnly = true)
    public GuestPrintScope effective(Event event) {
        return vendorsConfigReader.forEvent(event)
                .map(VendorsConfig::guestPrintPicks)
                .map(ceiling -> hostChoice(event).cappedBy(ceiling))
                .orElse(GuestPrintScope.OFF);
    }

    /** The plan's ceiling; {@code OFF} while the module does not work. */
    @Transactional(readOnly = true)
    public GuestPrintScope ceiling(Event event) {
        return vendorsConfigReader.forEvent(event).map(VendorsConfig::guestPrintPicks).orElse(GuestPrintScope.OFF);
    }

    @Transactional(readOnly = true)
    public GuestPrintScope hostChoice(Event event) {
        return settingsRepository.findById(event.getId()).map(EventPrintSettings::getGuestScope)
                .orElse(GuestPrintScope.OFF);
    }
}
```

- [ ] **Step 3: Implement the setting**

`MAIN/dto/print/GuestPrintScopeRequestDto.java`:

```java
package event_social_media.dto.print;

import event_social_media.model.print.GuestPrintScope;
import jakarta.validation.constraints.NotNull;

public record GuestPrintScopeRequestDto(@NotNull GuestPrintScope scope) {
}
```

`MAIN/service/print/PrintSettingsService.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.print.PrintPicksContextDto;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.model.event.Event;
import event_social_media.model.print.EventPrintSettings;
import event_social_media.model.print.GuestPrintScope;
import event_social_media.repository.print.EventPrintSettingsRepository;
import event_social_media.service.event.EventAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** The host's guest print picks choice (spec 2026-10-23, phase 2 "Host setting"). */
@Service
@RequiredArgsConstructor
public class PrintSettingsService {

    private final EventAuthorizationService eventAuthorizationService;
    private final EventPrintSettingsRepository settingsRepository;
    private final GuestScopeReader guestScopeReader;
    private final PrintPicksAccess access;
    private final PrintPicksContextService contextService;

    /** @return the context as the host now sees it */
    @Transactional
    public PrintPicksContextDto setGuestScope(UUID eventId, GuestPrintScope scope, UUID callerUserId) {
        eventAuthorizationService.requireHost(eventId, callerUserId);
        Event event = access.event(eventId);
        if (scope != GuestPrintScope.OFF) {
            GuestPrintScope ceiling = guestScopeReader.ceiling(event);
            if (scope.cappedBy(ceiling) != scope) {
                throw new ForbiddenException(ErrorCode.PRINT_PICKS_UNAVAILABLE,
                        "This event's plan allows guest picks up to " + ceiling + ".");
            }
            boolean priced = contextService.context(eventId, callerUserId).photographers().stream()
                    .anyMatch(p -> !p.sizes().isEmpty());
            if (!priced) {
                throw new ConflictException(ErrorCode.PRINT_PRICES_MISSING,
                        "Guest picks need a photographer with print prices.");
            }
        }
        EventPrintSettings settings = settingsRepository.findById(eventId).orElseGet(() -> {
            EventPrintSettings created = new EventPrintSettings();
            created.setEventId(eventId);
            return created;
        });
        settings.setGuestScope(scope);
        settingsRepository.saveAndFlush(settings);
        return contextService.context(eventId, callerUserId);
    }
}
```

In `PrintPicksController`, inject `PrintSettingsService printSettingsService` and add:

```java
    @PatchMapping("/api/events/{eventId}/print-picks/guest-scope")
    @PreAuthorize("isAuthenticated()")
    public PrintPicksContextDto setGuestScope(@PathVariable UUID eventId,
                                              @Valid @RequestBody GuestPrintScopeRequestDto dto,
                                              Authentication authentication) {
        return printSettingsService.setGuestScope(eventId, dto.scope(), callerId(authentication));
    }
```

(The spec proposed `…/settings/guest-print-picks`; the plan keeps every print endpoint under `/print-picks`. The frontend plan uses this path.)

- [ ] **Step 4: Add `guestPrintScope` to the event detail**

In `MAIN/dto/event/EventDetailResponseDto.java`, add next to `suspended`:

```java
    /** What guests may pick for print now (print picks, spec 2026-10-23); OFF while the vendors module can't be read. */
    private GuestPrintScope guestPrintScope = GuestPrintScope.OFF;
```

In `MAIN/service/event/EventService.java`'s detail method, after `dto.setModules(...)`:

```java
        if (modules.isReadable(ModuleKey.VENDORS)) {
            dto.setGuestPrintScope(guestScopeReader.effective(event));
        }
```

Inject `GuestScopeReader`. If this creates a circular dependency (unlikely: `GuestScopeReader` depends only on a repository and `VendorsConfigReader`), annotate the field `@Lazy`.

If `DemoSnapshotService` or any snapshot test serializes `EventDetailResponseDto` field by field, it now carries `"guestPrintScope": "OFF"`: update expected snapshots only.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.print.*" --tests "event_social_media.service.event.*" --tests "event_social_media.controller.event.*"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat(print-picks): host guest scope setting and effective scope on the event

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B3: Guest lists — read, add, edit, send

**Files:**
- Create: `MAIN/dto/print/MyPrintListsDto.java`, `SendPrintListRequestDto.java`
- Create: `MAIN/service/print/GuestPrintListService.java`, `PrintListSentEvent.java`
- Modify: `MAIN/service/print/HostPrintListService.java` (no behavior change: `addItems`, `defaultSize`, `requireGuestOwner` are already package-private)
- Modify: `MAIN/controller/print/PrintPicksController.java`
- Modify: `MAIN/service/vendor/VendorAuditWriter.java`
- Test: `TEST/controller/print/GuestPrintListTest.java`

Visibility (decision 13): the guest gate refuses a photographer with `hiddenByHost` or `optedOut` (`PRINT_PICKS_UNAVAILABLE`), and the context endpoint's guest branch drops them. Add a test for each.

- [ ] **Step 1: Write the DTOs**

`MAIN/dto/print/MyPrintListsDto.java`:

```java
package event_social_media.dto.print;

import java.util.List;

/**
 * A guest's lists for one photographer.
 *
 * @param open the list being built; an empty open list (null id) before the first pick
 * @param sent sent lists, newest first
 */
public record MyPrintListsDto(PrintListDto open, List<PrintListDto> sent) {
}
```

`MAIN/dto/print/SendPrintListRequestDto.java`:

```java
package event_social_media.dto.print;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

/** Sends the caller's open list to the photographer. The email comes from the account. */
public record SendPrintListRequestDto(@NotNull UUID vendorId,
                                      @Pattern(regexp = "^[+0-9 ()-]{6,30}$") String phone) {
}
```

- [ ] **Step 2: Write the failing test**

`TEST/controller/print/GuestPrintListTest.java`:

```java
package event_social_media.controller.print;

import com.jayway.jsonpath.JsonPath;
import event_social_media.exception.ErrorCode;
import event_social_media.model.collaboration.Collaborator;
import event_social_media.model.collaboration.PartnerRole;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.event.EventRole;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.print.EventPrintSettings;
import event_social_media.model.print.GuestPrintScope;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.print.VendorServiceKind;
import event_social_media.model.user.User;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.collaboration.CollaboratorRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.print.EventPrintSettingsRepository;
import event_social_media.repository.print.VendorServiceItemRepository;
import event_social_media.service.vendor.VendorTestSupport;
import event_social_media.service.vendor.VendorsConfig;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static event_social_media.service.vendor.VendorTestSupport.as;
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
class GuestPrintListTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fixtures;
    @Autowired
    private VendorTestSupport support;
    @Autowired
    private MediaRepository mediaRepository;
    @Autowired
    private CollaboratorRepository collaboratorRepository;
    @Autowired
    private VendorServiceItemRepository serviceItemRepository;
    @Autowired
    private EventPrintSettingsRepository settingsRepository;

    private User host;
    private User guest;
    private EventMember guestMember;
    private Event event;
    private EventVendor photographer;
    private VendorServiceItem size;
    private Media ownPhoto;
    private Media othersPhoto;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        event = support.vendorEventHostedBy(host);
        support.setConfig(event, VendorsConfig.GUEST_PRINT_PICKS, "ANY");
        guest = fixtures.newUser();
        guestMember = fixtures.newMember(event, guest, EventRole.ATTENDEE);
        photographer = support.vendor(event, PartnerRole.PHOTOGRAPHER);
        Collaborator partner = fixtures.newCollaborator();
        partner.setContactEmail(photographer.getUser().getEmail());
        collaboratorRepository.saveAndFlush(partner);
        size = new VendorServiceItem();
        size.setUserId(photographer.getUser().getId());
        size.setKind(VendorServiceKind.PRINT);
        size.setLabel("13x18");
        size.setPriceCents(300);
        serviceItemRepository.saveAndFlush(size);
        ownPhoto = fixtures.newMedia(event, 10);
        ownPhoto.setUploaderMember(guestMember);
        mediaRepository.saveAndFlush(ownPhoto);
        othersPhoto = fixtures.newMedia(event, 10);
        scope(GuestPrintScope.ANY);
    }

    private void scope(GuestPrintScope scope) {
        EventPrintSettings settings = settingsRepository.findById(event.getId()).orElseGet(EventPrintSettings::new);
        settings.setEventId(event.getId());
        settings.setGuestScope(scope);
        settingsRepository.saveAndFlush(settings);
    }

    private ResultActions add(User user, UUID mediaId) throws Exception {
        return mockMvc.perform(as(user, post("/api/events/{eventId}/print-lists/mine/items", event.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"vendorId\": \"" + photographer.getId() + "\", \"mediaIds\": [\"" + mediaId + "\"]}")));
    }

    private ResultActions mine(User user) throws Exception {
        return mockMvc.perform(as(user, get("/api/events/{eventId}/print-lists/mine", event.getId())
                .param("vendorId", photographer.getId().toString())));
    }

    private ResultActions send(User user, String phone) throws Exception {
        String body = phone == null
                ? "{\"vendorId\": \"" + photographer.getId() + "\"}"
                : "{\"vendorId\": \"" + photographer.getId() + "\", \"phone\": \"" + phone + "\"}";
        return mockMvc.perform(as(user, post("/api/events/{eventId}/print-lists/mine/send", event.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body)));
    }

    @Test
    void aGuestPicksAndSendsAndTheListLocks() throws Exception {
        add(guest, ownPhoto.getId()).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].unitPriceCents").value(300));
        String itemId = JsonPath.read(mine(guest).andReturn().getResponse().getContentAsString(), "$.open.items[0].id");
        mockMvc.perform(as(guest, patch("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"copies\": 2}")))
                .andExpect(status().isOk());

        send(guest, "+30 690 000 0000").andExpect(status().isOk())
                .andExpect(jsonPath("$.sent", hasSize(1)))
                .andExpect(jsonPath("$.sent[0].status").value("SENT"))
                .andExpect(jsonPath("$.sent[0].totalCents").value(600))
                .andExpect(jsonPath("$.sent[0].items[0].sizeLabel").value("13x18"))
                .andExpect(jsonPath("$.sent[0].contactEmail").doesNotExist())
                .andExpect(jsonPath("$.open.items", hasSize(0)));

        mockMvc.perform(as(guest, patch("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"copies\": 3}")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_LIST_LOCKED.getCode()));
    }

    @Test
    void sentPricesDontFollowLaterPriceChanges() throws Exception {
        add(guest, ownPhoto.getId());
        send(guest, null);
        size.setPriceCents(999);
        serviceItemRepository.saveAndFlush(size);
        mine(guest).andExpect(jsonPath("$.sent[0].items[0].unitPriceCents").value(300));
    }

    @Test
    void aGuestCanStartANewListAfterSending() throws Exception {
        add(guest, ownPhoto.getId());
        send(guest, null);
        add(guest, othersPhoto.getId()).andExpect(status().isOk());
        send(guest, null);
        mine(guest).andExpect(jsonPath("$.sent", hasSize(2)));
    }

    @Test
    void ownOnlyRefusesOthersPhotos() throws Exception {
        scope(GuestPrintScope.OWN);
        add(guest, ownPhoto.getId()).andExpect(status().isOk());
        add(guest, othersPhoto.getId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_PICKS_UNAVAILABLE.getCode()));
    }

    @Test
    void offRefusesEverything() throws Exception {
        scope(GuestPrintScope.OFF);
        add(guest, ownPhoto.getId()).andExpect(status().isForbidden());
        mine(guest).andExpect(status().isForbidden());
    }

    @Test
    void proPhotosCanBePickedWithAny() throws Exception {
        Media pro = fixtures.newMedia(event, 10);
        pro.setCollection(MediaCollection.PRO);
        pro.setEventVendor(photographer);
        mediaRepository.saveAndFlush(pro);
        add(guest, pro.getId()).andExpect(status().isOk());
    }

    @Test
    void anEmptyListCantBeSent() throws Exception {
        send(guest, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_LIST_EMPTY.getCode()));
    }

    @Test
    void aListOfOnlyDeletedPhotosCantBeSent() throws Exception {
        add(guest, ownPhoto.getId());
        ownPhoto.setDeletedAt(OffsetDateTime.now());
        mediaRepository.saveAndFlush(ownPhoto);
        send(guest, null).andExpect(status().isConflict());
    }

    @Test
    void cantSendWhenThePhotographerLostTheirPrices() throws Exception {
        add(guest, ownPhoto.getId());
        serviceItemRepository.delete(size);
        serviceItemRepository.flush();
        send(guest, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(ErrorCode.PRINT_PRICES_MISSING.getCode()));
    }

    @Test
    void aBadPhoneIsRefused() throws Exception {
        add(guest, ownPhoto.getId());
        send(guest, "call me maybe").andExpect(status().isBadRequest());
    }

    @Test
    void anotherGuestCantChangeMyItems() throws Exception {
        add(guest, ownPhoto.getId());
        String itemId = JsonPath.read(mine(guest).andReturn().getResponse().getContentAsString(), "$.open.items[0].id");
        User other = fixtures.newUser();
        fixtures.newMember(event, other, EventRole.ATTENDEE);
        mockMvc.perform(as(other, delete("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void theHostCantRemoveAGuestsPick() throws Exception {
        add(guest, ownPhoto.getId());
        String itemId = JsonPath.read(mine(guest).andReturn().getResponse().getContentAsString(), "$.open.items[0].id");
        mockMvc.perform(as(host, delete("/api/events/{eventId}/print-lists/items/{itemId}", event.getId(), itemId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void thePhotographerSeesSentListsWithContactAndTheHostDoesNot() throws Exception {
        add(guest, ownPhoto.getId());
        send(guest, "+30 690 000 0000");
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{eventId}/print-lists/guests", event.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].contactEmail").value(guest.getEmail()))
                .andExpect(jsonPath("$[0].contactPhone").value("+30 690 000 0000"))
                .andExpect(jsonPath("$[0].ownerName").isNotEmpty());
        mockMvc.perform(as(host, get("/api/events/{eventId}/print-lists/guests", event.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void openListsAreNotShownToThePhotographer() throws Exception {
        add(guest, ownPhoto.getId());
        mockMvc.perform(as(photographer.getUser(), get("/api/events/{eventId}/print-lists/guests", event.getId())))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void afterTheAccessWindowAGuestCantSend() throws Exception {
        add(guest, ownPhoto.getId());
        support.endedDaysAgo(event, 31);
        send(guest, null).andExpect(status().isForbidden());
    }
}
```

`ownPhoto.setUploaderMember(...)`, `setCollection`, `setEventVendor` exist on `Media` (Lombok setters).

Run: `./gradlew test --tests "event_social_media.controller.print.GuestPrintListTest"`
Expected: FAIL.

- [ ] **Step 3: Extend the audit allowlist**

Already has `itemCount` from Task A5. Nothing to add.

- [ ] **Step 4: Write the service**

`MAIN/service/print/PrintListSentEvent.java`:

```java
package event_social_media.service.print;

import java.util.UUID;

/** Published when a guest sends a list; the photographer is told after commit. */
public record PrintListSentEvent(UUID printListId) {
}
```

`MAIN/service/print/GuestPrintListService.java`:

```java
package event_social_media.service.print;

import event_social_media.dto.print.AddPrintItemsRequestDto;
import event_social_media.dto.print.MyPrintListsDto;
import event_social_media.dto.print.PrintListDto;
import event_social_media.dto.print.PrintListItemDto;
import event_social_media.dto.print.SendPrintListRequestDto;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ForbiddenException;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.event.Event;
import event_social_media.model.event.EventMember;
import event_social_media.model.media.Media;
import event_social_media.model.media.MediaCollection;
import event_social_media.model.print.GuestPrintScope;
import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListOwnerKind;
import event_social_media.model.print.PrintListStatus;
import event_social_media.model.print.VendorServiceItem;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.event.EventMemberRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.media.MediaRepository;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.service.event.EventAuthorizationService;
import event_social_media.service.vendor.ApprovedPartners;
import event_social_media.service.vendor.VendorAuditWriter;
import event_social_media.service.vendor.VendorCapability;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/** Guest print lists (spec 2026-10-23, phase 2). */
@Service
@RequiredArgsConstructor
public class GuestPrintListService {

    private final EventAuthorizationService eventAuthorizationService;
    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final MediaRepository mediaRepository;
    private final PrintListRepository listRepository;
    private final PrintListItemRepository itemRepository;
    private final PrintPicksAccess access;
    private final GuestScopeReader guestScopeReader;
    private final HostPrintListService hostPrintListService;
    private final ApprovedPartners approvedPartners;
    private final PrintListMapper mapper;
    private final VendorAuditWriter auditWriter;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public MyPrintListsDto mine(UUID eventId, UUID vendorId, UUID callerUserId) {
        Gate gate = gate(eventId, vendorId, callerUserId, false);
        return lists(gate);
    }

    @Transactional
    public PrintListDto add(UUID eventId, AddPrintItemsRequestDto dto, UUID callerUserId) {
        Gate gate = gate(eventId, dto.vendorId(), callerUserId, true);
        List<Media> media = mediaRepository.findByEvent_IdAndIdInAndDeletedAtIsNull(eventId, dto.mediaIds());
        boolean allowed = media.stream().allMatch(m -> inScope(m, gate.scope(), gate.member()));
        if (!allowed) {
            throw new ForbiddenException(ErrorCode.PRINT_PICKS_UNAVAILABLE, "You can pick only your own photos here.");
        }
        PrintList open = openList(gate).orElseGet(() -> listRepository.save(newGuestList(gate)));
        hostPrintListService.addItems(open, gate.event(), dto.mediaIds(), hostPrintListService.defaultSize(gate.photographer()));
        return mapper.toDto(open, itemRepository.findByListWithMedia(open.getId()), false);
    }

    @Transactional
    public MyPrintListsDto send(UUID eventId, SendPrintListRequestDto dto, UUID callerUserId) {
        Gate gate = gate(eventId, dto.vendorId(), callerUserId, true);
        PrintList open = openList(gate)
                .orElseThrow(() -> new ConflictException(ErrorCode.PRINT_LIST_EMPTY, "Pick at least one photo first."));
        List<PrintListItem> items = itemRepository.findByListWithMedia(open.getId());
        List<PrintListItem> live = items.stream().filter(i -> i.getMedia().getDeletedAt() == null).toList();
        if (live.isEmpty()) {
            throw new ConflictException(ErrorCode.PRINT_LIST_EMPTY, "Pick at least one photo first.");
        }
        VendorServiceItem fallback = hostPrintListService.defaultSize(gate.photographer());
        if (fallback == null || !approvedPartners.isApproved(gate.photographer().getUser())) {
            throw new ConflictException(ErrorCode.PRINT_PRICES_MISSING, "This photographer has no print prices.");
        }
        // Deleted photos leave the list at send: the guest pays only for what the photographer can print.
        items.stream().filter(i -> i.getMedia().getDeletedAt() != null).forEach(itemRepository::delete);
        int total = 0;
        for (PrintListItem item : live) {
            VendorServiceItem size = item.getServiceItem() == null ? fallback : item.getServiceItem();
            item.setServiceItem(size);
            item.setSizeLabel(size.getLabel());
            item.setUnitPriceCents(size.getPriceCents());
            total = Math.addExact(total, Math.multiplyExact(size.getPriceCents(), item.getCopies()));
            itemRepository.save(item);
        }
        open.setStatus(PrintListStatus.SENT);
        open.setSentAt(OffsetDateTime.now());
        open.setOwnerName(gate.member().getDisplayName());
        open.setContactEmail(gate.member().getUser().getEmail());
        open.setContactPhone(dto.phone() == null || dto.phone().isBlank() ? null : dto.phone().strip());
        open.setTotalCents(total);
        listRepository.saveAndFlush(open);
        auditWriter.write(gate.event(), gate.member(), "PRINT_LIST_SENT", "PrintList", open.getId(),
                Map.of("itemCount", live.size()));
        events.publishEvent(new PrintListSentEvent(open.getId()));
        return lists(gate);
    }

    /** The photographer's sent guest lists, newest first, with contact details. */
    @Transactional(readOnly = true)
    public List<PrintListDto> sentToMe(UUID eventId, UUID callerUserId) {
        EventVendor vendor = eventAuthorizationService.requireVendor(eventId, callerUserId, VendorCapability.PRINT_PICKS);
        List<PrintList> sent = listRepository.findByEventVendor_IdAndOwnerKindAndStatusOrderBySentAtDesc(
                vendor.getId(), PrintListOwnerKind.GUEST, PrintListStatus.SENT);
        Map<UUID, List<PrintListItem>> itemsByList = sent.isEmpty() ? Map.of()
                : itemRepository.findByListsWithMedia(sent.stream().map(PrintList::getId).toList()).stream()
                        .collect(Collectors.groupingBy(i -> i.getPrintList().getId()));
        return sent.stream().map(l -> mapper.toDto(l, itemsByList.getOrDefault(l.getId(), List.of()), true)).toList();
    }

    private record Gate(Event event, EventMember member, EventVendor photographer, GuestPrintScope scope) {
    }

    /** A member, guest picks on, the photographer open and priced. Writes take the event lock. */
    private Gate gate(UUID eventId, UUID vendorId, UUID callerUserId, boolean write) {
        eventAuthorizationService.requireMember(eventId, callerUserId);
        Event event = write
                ? eventRepository.lockById(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId))
                : access.event(eventId);
        GuestPrintScope scope = guestScopeReader.effective(event);
        if (scope == GuestPrintScope.OFF) {
            throw new ForbiddenException(ErrorCode.PRINT_PICKS_UNAVAILABLE, "Guest print picks are off for this event.");
        }
        EventMember member = eventMemberRepository.findByEvent_IdAndUser_Id(eventId, callerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("You are not a member of this event"));
        EventVendor photographer = access.openPhotographer(event, vendorId);
        return new Gate(event, member, photographer, scope);
    }

    private static boolean inScope(Media media, GuestPrintScope scope, EventMember member) {
        if (scope == GuestPrintScope.OWN) {
            return media.getUploaderMember() != null && media.getUploaderMember().getId().equals(member.getId());
        }
        return media.getCollection() == MediaCollection.GUEST || media.getCollection() == MediaCollection.PRO;
    }

    private java.util.Optional<PrintList> openList(Gate gate) {
        return listRepository.findByEventVendor_IdAndOwnerKindAndOwnerMember_IdAndStatus(
                gate.photographer().getId(), PrintListOwnerKind.GUEST, gate.member().getId(), PrintListStatus.OPEN);
    }

    private MyPrintListsDto lists(Gate gate) {
        PrintListDto open = openList(gate)
                .map(l -> mapper.toDto(l, itemRepository.findByListWithMedia(l.getId()), false))
                .orElseGet(() -> new PrintListDto(null, gate.photographer().getId(), PrintListOwnerKind.GUEST,
                        PrintListStatus.OPEN, null, null, null, null, null, 0, List.of()));
        List<PrintListDto> sent = listRepository.findByEventVendor_IdAndOwnerMember_IdAndStatusOrderBySentAtDesc(
                        gate.photographer().getId(), gate.member().getId(), PrintListStatus.SENT).stream()
                .map(l -> mapper.toDto(l, itemRepository.findByListWithMedia(l.getId()), false))
                .toList();
        return new MyPrintListsDto(open, sent);
    }

    private static PrintList newGuestList(Gate gate) {
        PrintList list = new PrintList();
        list.setEvent(gate.event());
        list.setEventVendor(gate.photographer());
        list.setOwnerKind(PrintListOwnerKind.GUEST);
        list.setOwnerMember(gate.member());
        list.setOwnerUser(gate.member().getUser());
        return list;
    }
}
```

Remove unused imports (`PrintListItemDto`, `Objects`) if the compiler warns. `EventMember.getDisplayName()` exists. The guest's own view never carries contact fields (`mapper.toDto(…, false)`), as the test asserts.

Sent guest lists stay readable by the guest after the access window closes for 30 days (spec). `gate()` refuses after the window through `openPhotographer`. Add that read path now: in `mine`, when `openPhotographer` throws `VENDOR_ACCESS_ENDED` and `access.accessEndsAt(event)` is within the last 30 days, return `new MyPrintListsDto(emptyOpen, sent)` read without the gate. Write it as a separate private method `sentAfterWindow(eventId, vendorId, callerUserId)` and a test `sentListsStayVisibleForThirtyDaysAfterTheWindow` (ended 35 days ago with a 30-day window → 5 days after → still visible; ended 61 days ago → 404/403). Keep the guest scope check off for this read: the guest is reading their own history.

- [ ] **Step 5: Add the endpoints**

In `PrintPicksController`, inject `GuestPrintListService guestPrintListService` and add:

```java
    @GetMapping("/api/events/{eventId}/print-lists/mine")
    @PreAuthorize("isAuthenticated()")
    public MyPrintListsDto myLists(@PathVariable UUID eventId, @RequestParam("vendorId") UUID vendorId,
                                   Authentication authentication) {
        return guestPrintListService.mine(eventId, vendorId, callerId(authentication));
    }

    @PostMapping("/api/events/{eventId}/print-lists/mine/items")
    @PreAuthorize("isAuthenticated()")
    public PrintListDto addMyItems(@PathVariable UUID eventId, @Valid @RequestBody AddPrintItemsRequestDto dto,
                                   Authentication authentication) {
        return guestPrintListService.add(eventId, dto, callerId(authentication));
    }

    /** Ten sends a day per guest, so nobody floods a photographer's inbox. */
    @PostMapping("/api/events/{eventId}/print-lists/mine/send")
    @RateLimit(name = "print-lists.send", limit = 10, windowSeconds = 86400)
    @PreAuthorize("isAuthenticated()")
    public MyPrintListsDto sendMyList(@PathVariable UUID eventId, @Valid @RequestBody SendPrintListRequestDto dto,
                                      Authentication authentication) {
        return guestPrintListService.send(eventId, dto, callerId(authentication));
    }

    @GetMapping("/api/events/{eventId}/print-lists/guests")
    @PreAuthorize("isAuthenticated()")
    public List<PrintListDto> guestLists(@PathVariable UUID eventId, Authentication authentication) {
        return guestPrintListService.sentToMe(eventId, callerId(authentication));
    }
```

`HostPrintListService.patch`/`remove` already route guest-list items to `requireGuestOwner`, which checks the owner and the `SENT` lock. It does not check the guest scope: add, in `writableItem`'s guest branch, `if (guestScopeReader.effective(event) == GuestPrintScope.OFF) throw new ForbiddenException(PRINT_PICKS_UNAVAILABLE, …)` (inject `GuestScopeReader` into `HostPrintListService`).

Check the `@RateLimit` key semantics in `service/ratelimit` (per user or per IP). If per IP, that's acceptable; note it in the PR.

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests "event_social_media.controller.print.*"`
Expected: PASS (Part A tests still pass).

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "feat(print-picks): guest print lists with send and photographer view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B4: Tell the photographer when a guest sends

**Files:**
- Create: `MAIN/service/print/PrintListSentListener.java`, `MAIN/service/print/PrintListSentNotifier.java`
- Modify: `RES/i18n/messages.properties`, `messages_el.properties`
- Test: `TEST/service/print/PrintListSentNotifierTest.java`

- [ ] **Step 1: Add the text**

`messages.properties`:

```properties
notification.print.sent.title={guestName} sent a print list
notification.print.sent.body.one=1 print, {total}.
notification.print.sent.body.many={count} prints, {total}.
```

`messages_el.properties`:

```properties
notification.print.sent.title=Ο/Η {guestName} έστειλε λίστα εκτυπώσεων
notification.print.sent.body.one=1 εκτύπωση, {total}.
notification.print.sent.body.many={count} εκτυπώσεις, {total}.
```

- [ ] **Step 2: Write the failing test**

`TEST/service/print/PrintListSentNotifierTest.java` — follow `VendorJoinedNotifierTest`'s setup (it decides whether the emitter is mocked). The assertions:

```java
    @Test
    void tellsThePhotographerWithNameCountAndTotal() {
        PrintList sent = sentGuestList(/* 2 items: 1 copy at 300, 2 copies at 300 */);
        notifier.notifyPhotographer(sent.getId());
        // with a mocked emitter:
        verify(emitter).emit(argThat(draft ->
                draft.type() == NotificationType.PRINT_LIST_SENT
                        && draft.recipientUserId().equals(photographer.getUser().getId())
                        && draft.ctaTarget() == NotificationCtaTarget.EVENT_VENDOR_PAGE
                        && draft.payload().get("count").equals(3)
                        && draft.payload().get("total").equals("€9.00")
                        && draft.dedupeKey().equals(PrintListSentNotifier.dedupeKey(sent.getId()))));
    }

    @Test
    void anOpenListIsIgnored() {
        PrintList open = openGuestList();
        notifier.notifyPhotographer(open.getId());
        verifyNoInteractions(emitter);
    }
```

Use `NotificationDraft`'s real accessor names (record components or getters).

- [ ] **Step 3: Write the notifier and listener**

`MAIN/service/print/PrintListSentNotifier.java`:

```java
package event_social_media.service.print;

import event_social_media.model.print.PrintList;
import event_social_media.model.print.PrintListItem;
import event_social_media.model.print.PrintListStatus;
import event_social_media.model.user.NotificationCategory;
import event_social_media.model.user.NotificationCtaTarget;
import event_social_media.model.user.NotificationSeverity;
import event_social_media.model.user.NotificationType;
import event_social_media.model.vendor.EventVendor;
import event_social_media.repository.print.PrintListItemRepository;
import event_social_media.repository.print.PrintListRepository;
import event_social_media.service.i18n.MessageRenderer;
import event_social_media.service.notification.NotificationDraft;
import event_social_media.service.notification.NotificationEmitter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Tells the photographer, in the app and by email, that a guest sent a list (spec 2026-10-23). */
@Slf4j
@Component
@RequiredArgsConstructor
public class PrintListSentNotifier {

    private static final String TITLE_KEY = "notification.print.sent.title";
    private static final String BODY_KEY = "notification.print.sent.body";
    private static final String CTA_KEY = "notification.cta.view_prints";

    private final PrintListRepository listRepository;
    private final PrintListItemRepository itemRepository;
    private final NotificationEmitter notificationEmitter;
    private final MessageRenderer messageRenderer;

    /** The dedupe key of one list's notice; account deletion finds the notices by it. */
    public static String dedupeKey(UUID printListId) {
        return "print.sent:list:" + printListId;
    }

    @Transactional(readOnly = true)
    public void notifyPhotographer(UUID printListId) {
        PrintList list = listRepository.findById(printListId).orElse(null);
        if (list == null || list.getStatus() != PrintListStatus.SENT) {
            return;
        }
        EventVendor vendor = list.getEventVendor();
        if (vendor.getUser() == null || vendor.getMember() == null || vendor.getRemovedAt() != null) {
            return;
        }
        List<PrintListItem> items = itemRepository.findByListWithMedia(printListId);
        int count = items.stream().mapToInt(PrintListItem::getCopies).sum();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("guestName", list.getOwnerName());
        payload.put("count", count);
        payload.put("total", String.format(Locale.ROOT, "€%.2f", list.getTotalCents() / 100.0));
        boolean emitted = notificationEmitter.emit(new NotificationDraft(
                vendor.getUser().getId(),
                vendor.getMember().getId(),
                NotificationType.PRINT_LIST_SENT,
                NotificationCategory.SYSTEM,
                NotificationSeverity.INFO,
                messageRenderer.render(TITLE_KEY, payload, Locale.ENGLISH),
                messageRenderer.render(BODY_KEY, payload, Locale.ENGLISH),
                messageRenderer.render(CTA_KEY, payload, Locale.ENGLISH),
                NotificationCtaTarget.EVENT_VENDOR_PAGE,
                Map.of("eventId", list.getEvent().getId().toString()),
                null,
                dedupeKey(printListId),
                payload,
                TITLE_KEY,
                BODY_KEY,
                CTA_KEY));
        log.info("Event {}: told photographer {} about print list {} ({})", list.getEvent().getId(),
                vendor.getId(), printListId, emitted ? "sent" : "already told");
    }
}
```

`MAIN/service/print/PrintListSentListener.java`:

```java
package event_social_media.service.print;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class PrintListSentListener {

    private final PrintListSentNotifier notifier;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onSent(PrintListSentEvent sent) {
        try {
            notifier.notifyPhotographer(sent.printListId());
        } catch (RuntimeException ex) {
            log.error("Telling the photographer about print list {} failed", sent.printListId(), ex);
        }
    }
}
```

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.print.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(print-picks): notify the photographer when a guest sends a list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B5: Account deletion, export, regression sweep

**Files:**
- Modify: `MAIN/service/user/deletion/UserAnonymizer.java`
- Modify: `MAIN/dto/user/export/UserDataExportDto.java`, `MAIN/service/user/export/MeDataExportService.java`
- Modify: `MAIN/service/event/EventMemberService.java` (member removal, see below)
- Test: `TEST/service/print/PrintPicksAccountDataTest.java`

Lists find their owner through `print_lists.owner_user_id` (added in Task A1 after review), not through the membership, because `EventMemberService` hard-deletes members and `owner_member_id` then goes to NULL. Also, when a member is removed from an event, delete their `OPEN` guest lists in the same transaction, before the member row is deleted (`printListRepository.deleteByOwnerMember_IdAndStatus(memberId, PrintListStatus.OPEN)`), so no unreachable open list is left behind; their `SENT` lists stay with the photographer. Add test cases `removingAMemberDeletesTheirOpenListAndKeepsSentOnes` and `aSentListIsStillFoundByAccountAfterTheMemberIsDeleted` (delete the member, then `findByOwnerUserId` still returns the list and account deletion clears its contact fields).

- [ ] **Step 1: Write the failing test**

`TEST/service/print/PrintPicksAccountDataTest.java` — set up like `VendorAccountDataTest`. Cases:

```java
    @Test
    void theExportCarriesTheGuestsOwnLists() {
        PrintList sent = sentListOf(guest);
        UserDataExportDto export = exportService.export(guest.getId());
        assertThat(export.printLists()).singleElement().satisfies(l -> {
            assertThat(l.status()).isEqualTo("SENT");
            assertThat(l.itemCount()).isEqualTo(1);
            assertThat(l.totalCents()).isEqualTo(300);
        });
    }

    @Test
    void deletingTheGuestsAccountClearsContactAndNameAndDropsOpenLists() {
        PrintList sent = sentListOf(guest);
        PrintList open = openListOf(guest);
        deleteAccount(guest);
        PrintList after = listRepository.findById(sent.getId()).orElseThrow();
        assertThat(after.getContactEmail()).isNull();
        assertThat(after.getContactPhone()).isNull();
        assertThat(after.getOwnerName()).isNull();
        assertThat(listRepository.findById(open.getId())).isEmpty();
    }

    @Test
    void deletingTheGuestsAccountDeletesTheNoticesThatNameThem() {
        PrintList sent = sentListOf(guest);
        notifier.notifyPhotographer(sent.getId());
        deleteAccount(guest);
        assertThat(notificationRepository.findAll()).noneMatch(n ->
                PrintListSentNotifier.dedupeKey(sent.getId()).equals(n.getDedupeKey()));
    }
```

- [ ] **Step 2: Implement**

In `UserAnonymizer`, in the method that handles the user's memberships (next to the vendor cleanup shown in the vendors work), before memberships are anonymized or removed:

```java
        // Print picks (spec 2026-10-23): a guest's sent lists keep their items for the photographer, but not
        // the guest's name or contact; open lists go; the photographer's notices that name the guest go too.
        List<UUID> sentListIds = em.createQuery("select l.id from PrintList l where l.ownerMember.user.id = :id "
                        + "and l.status = event_social_media.model.print.PrintListStatus.SENT", UUID.class)
                .setParameter("id", userId).getResultList();
        if (!sentListIds.isEmpty()) {
            em.createQuery("delete from Notification n where n.type = :type and n.dedupeKey in :keys")
                    .setParameter("type", NotificationType.PRINT_LIST_SENT)
                    .setParameter("keys", sentListIds.stream().map(PrintListSentNotifier::dedupeKey).toList())
                    .executeUpdate();
        }
        em.createNativeQuery("update print_lists set owner_name = null, contact_email = null, contact_phone = null "
                        + "where owner_member_id in (select id from event_members where user_id = :id)")
                .setParameter("id", userId).executeUpdate();
        em.createNativeQuery("delete from print_lists where status = 'OPEN' and owner_kind = 'GUEST' "
                        + "and owner_member_id in (select id from event_members where user_id = :id)")
                .setParameter("id", userId).executeUpdate();
```

Place it where the membership rows still exist (before any membership delete/anonymize in that class).

In `UserDataExportDto`, add `List<PrintListExport> printLists` after `vendorServices`, and:

```java
    public record PrintListExport(UUID eventId, String status, OffsetDateTime sentAt, int itemCount,
                                  Integer totalCents, String contactPhone) {
    }
```

In `MeDataExportService`, pass:

```java
                printListRepository.findByOwnerUserId(userId).stream()
                        .map(l -> new UserDataExportDto.PrintListExport(l.getEvent().getId(), name(l.getStatus()),
                                l.getSentAt(), (int) printListItemRepository.countByPrintList_Id(l.getId()),
                                l.getTotalCents(), l.getContactPhone()))
                        .toList()
```

Fix the other `new UserDataExportDto(` calls with `List.of()`.

- [ ] **Step 3: Differential auth test**

Add the Part B endpoints to the vendor-authorization differential test's exceptions: `GET /api/events/{eventId}/print-lists/guests` (photographer on purpose). The guest endpoints (`/print-lists/mine…`) answer a vendor the same as an attendee, so they need no exception.

- [ ] **Step 4: Full suite, graph, commit**

Run: `./gradlew test`, then `graphify update .`.

```bash
git add -A src
git commit -m "feat(print-picks): guest data in export and account deletion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand over**

Tell the user Part B is ready for a PR into `staging`. Do not push until they say so.

---

## Self-review (done while writing)

- Spec coverage: services (A3), approved partners (A2), `PRINT_PICKS` (A2), photos only and READY (A5), best available file (A6), deadline (A4 `openPhotographer`, A5/B3 writes), two photographers (A4 context, lists per `event_vendor_id`), host live list (A5), host package count (A5), reminder (A7), zip + `prints.txt` (A6), limits 100/8/1–99 (A1, A3, A5), guest scope + plan defaults (B1, B2), send/lock/new list/price copy (B3), contact consent (frontend; backend stores what is sent), photographer-only guest view (B3), host can't remove guest picks (B3 test), notify on send (B4), 30-day read-only history (B3 step 4), rate limit 10/day (B3), export and deletion (A8, B5), audit without personal data (A5, A6, B3).
- Not in this plan on purpose: admin UI for the config key (frontend plan), legal copy (frontend plan, reviewed before Part B ships).
