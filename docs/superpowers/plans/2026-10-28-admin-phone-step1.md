# Admin phone, step 1: device keys, summary, Phones section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin pair a phone from the admin console and let that phone read a one-call summary of the platform with a read-only device key.

**Architecture:** Spring gets an `admin_devices` table, a filter that turns `Authorization: Device <key>` into a `DEVICE`-only authentication on `/api/device/**` (and nowhere else), admin endpoints to pair and remove phones, and `GET /api/device/summary`, which reuses the metric services the admin console already reads. The website gets a "Phones" section that lists phones, shows a one-time QR code when pairing, and removes phones behind a confirmation.

**Tech Stack:** Spring Boot 3, JPA/Hibernate, Flyway, Spring Security, JUnit 5 + MockMvc + Mockito (H2 for most tests, Testcontainers Postgres for the migration test). Next.js App Router, React Query, next-intl, Vitest + Testing Library, `qrcode.react`.

**Spec:** [docs/superpowers/specs/2026-10-28-admin-phone-widget-design.md](../specs/2026-10-28-admin-phone-widget-design.md)

**Decisions made while planning (all within the spec):**
- `errors24h` counts distinct errors whose `lastSeenAt` falls in the last 24 hours, leaving out 4xx rejections (the admin chose this on 2026-10-28).
- `todayOrders` is the sum of the funnel's `revenue.ordersByBuyerType`: provider-paid orders above 0 paid in the range, the same population the order alert will use in step 3.
- The website builds the QR payload `{ "v": 1, "api": NEXT_PUBLIC_API_BASE_URL, "key": key }` itself. The browser already talks to Spring at that address, so Spring does not need to know its own public URL. `POST /api/admin/devices` returns the device and its key; the spec is updated to match.
- A device key on any path outside `/api/device/` is never read, so it gets 401 there (anonymous), not 403. The spec's testing line is updated to match.
- The device principal is a `DevicePrincipal` record, deliberately **not** a `java.security.Principal` and not a `String`. That keeps it out of the user-id paths: `GuidelinesAcceptanceInterceptor` skips it (its name is not a UUID) and `RateLimitInterceptor` counts it by IP.
- The admin console's sections are chosen by the URL hash, which the server never sees, so the Phones section is client-fetched like every other admin section (no server prefetch possible).

---

## Repos and branches

| Part | Repo | Worktree | Branch |
|---|---|---|---|
| A (Spring) | `C:\Users\User\IdeaProjects\event_social_media` | `C:\Users\User\IdeaProjects\event_social_media\.claude\worktrees\admin-phone-keys` | `claude/admin-phone-keys` from `origin/staging` |
| B (website) | `C:\Users\User\WebstormProjects\storywall` | this session's worktree | `claude/samsung-widget-monitoring-9d61a2` (already on `staging` + the spec commit) |

Never edit the Spring main checkout: it holds other work and lags `origin/staging`. Commit as you go; push and open PRs only when the user says so.

## File map

**Spring (Part A)**

| File | Responsibility |
|---|---|
| Create `src/main/resources/db/migration/V184__admin_devices.sql` | The table |
| Create `src/main/java/event_social_media/model/device/AdminDevice.java` | Entity |
| Create `src/main/java/event_social_media/repository/device/AdminDeviceRepository.java` | Queries |
| Create `src/main/java/event_social_media/security/DevicePrincipal.java` | Who a device request is |
| Create `src/main/java/event_social_media/security/DeviceKeyAuthenticationFilter.java` | Key → authentication, `/api/device/**` only |
| Modify `src/main/java/event_social_media/config/SecurityConfig.java` | Register the filter and the `/api/device/**` rule |
| Modify `src/main/java/event_social_media/model/audit/AdminAuditAction.java` | Two audit actions |
| Create `src/main/java/event_social_media/dto/device/AdminDeviceDto.java` | A device as the console sees it |
| Create `src/main/java/event_social_media/dto/device/AdminDeviceCreatedDto.java` | Device + its key, once |
| Create `src/main/java/event_social_media/dto/device/AdminDeviceRequestDto.java` | Pairing request |
| Create `src/main/java/event_social_media/dto/device/PushTokenRequestDto.java` | Firebase token upload |
| Create `src/main/java/event_social_media/dto/device/DeviceSummaryDto.java` | The summary |
| Create `src/main/java/event_social_media/service/device/AdminDeviceService.java` | Pair, list, revoke, authenticate, push token |
| Create `src/main/java/event_social_media/service/device/DeviceSummaryService.java` | Builds the summary |
| Create `src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java` | `/api/admin/devices` |
| Create `src/main/java/event_social_media/controller/device/DeviceController.java` | `/api/device` |
| Modify `src/main/java/event_social_media/repository/billing/RefundRequestRepository.java` | `countByStatus` |
| Modify `src/main/java/event_social_media/repository/feedback/BugReportRepository.java` | `countByCreatedAtGreaterThanEqual` |
| Modify `src/main/java/event_social_media/repository/feedback/ErrorEventRepository.java` | `countSeenSinceWithoutRejections` |
| Tests under `src/test/java/event_social_media/{migration,service/device,controller/device}/` | See each task |

**Website (Part B)**

| File | Responsibility |
|---|---|
| Modify `lib/api/types.ts` | `AdminDeviceDto`, `AdminDeviceCreatedDto` |
| Modify `lib/api/endpoints.ts` | `admin.devices` |
| Create `lib/adminDevices.ts` + `lib/adminDevices.test.ts` | Name limit, date format, QR payload |
| Create `hooks/useAdminDevices.ts` | Query + mutations, exported key |
| Create `hooks/usePhonesPanel.ts` | Which drawer is open |
| Create `hooks/usePhoneCreateForm.ts` | Name field, create, the one-time result |
| Create `hooks/usePhoneRemoval.ts` | Remove confirmation and call |
| Create `components/admin/phones/PhonesPanel.tsx` | Section shell |
| Create `components/admin/phones/PhonesTable.tsx` | Rows |
| Create `components/admin/phones/PhonePushPill.tsx` | Notifications On/Off pill |
| Create `components/admin/phones/PhonePairingCode.tsx` | The QR code |
| Create `components/admin/phones/PhoneCreateDrawer.tsx` + test | Name → QR |
| Create `components/admin/phones/PhoneDetailDrawer.tsx` + test | Details + remove |
| Modify `components/admin/AdminNavigationContext.tsx` + new `AdminNavigationContext.phones.test.tsx` | `phones` tab, `#phones` |
| Modify `components/admin/AdminShellNav.tsx` | Tab group |
| Modify `components/admin/AdminConsole.tsx` | Render the panel |
| Modify `messages/en.json`, `messages/el.json` | Copy |

---

## Task 0: Workspaces

- [ ] **Step 1: Create the Spring worktree from the latest staging**

```bash
git -C "C:/Users/User/IdeaProjects/event_social_media" fetch origin staging
git -C "C:/Users/User/IdeaProjects/event_social_media" worktree add .claude/worktrees/admin-phone-keys -b claude/admin-phone-keys origin/staging
```

Expected: `Preparing worktree (new branch 'claude/admin-phone-keys')`. Every Part A command below runs from `C:/Users/User/IdeaProjects/event_social_media/.claude/worktrees/admin-phone-keys`.

- [ ] **Step 2: Check the next free migration number**

```bash
ls src/main/resources/db/migration | sort -V | tail -1
```

Expected: `V183__campaign_visits.sql`. If a higher number exists, use the next one instead of `V184` everywhere below (file name and the migration test's class name).

- [ ] **Step 3: Confirm the Spring build runs**

```bash
./gradlew compileJava -q
```

Expected: no output, exit 0.

- [ ] **Step 4: Give the website worktree its node_modules**

From the website worktree, compare lockfiles and link the main checkout's `node_modules` when they match (PowerShell):

```powershell
if ((Get-FileHash package-lock.json).Hash -eq (Get-FileHash ..\..\..\package-lock.json).Hash) { New-Item -ItemType Junction -Path node_modules -Target C:\Users\User\WebstormProjects\storywall\node_modules } else { npm ci }
```

Expected: a `node_modules` junction (or a fresh install). Then `npx vitest --version` prints a version.

---

# Part A — Spring

## Task A1: `admin_devices` table, entity, repository

**Files:**
- Create: `src/main/resources/db/migration/V184__admin_devices.sql`
- Create: `src/main/java/event_social_media/model/device/AdminDevice.java`
- Create: `src/main/java/event_social_media/repository/device/AdminDeviceRepository.java`
- Test: `src/test/java/event_social_media/migration/V184AdminDevicesMigrationTest.java`

- [ ] **Step 1: Write the failing migration test**

```java
package event_social_media.migration;

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

/**
 * V184's admin_devices table: defaults, the unique key hash, and the cascade from users.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class V184AdminDevicesMigrationTest extends PostgresTestBase {

    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void removeInsertedRows() {
        jdbc.update("delete from admin_devices");
        jdbc.update("delete from users where email like 'v184-%'");
    }

    @Test
    void createsTheTableWithAUniqueKeyHashAndCascadesFromUsers() {
        UUID userId = seedUser();
        jdbc.update("insert into admin_devices (owner_user_id, name, key_hash) values (?, 'Galaxy', 'hash-1')", userId);

        assertThat(jdbc.queryForObject("select count(*) from admin_devices where created_at is not null "
                + "and last_seen_at is null and revoked_at is null and fcm_token is null", Integer.class)).isEqualTo(1);

        assertThatThrownBy(() -> jdbc.update(
                "insert into admin_devices (owner_user_id, name, key_hash) values (?, 'Other', 'hash-1')", userId))
                .isInstanceOf(DataIntegrityViolationException.class);

        jdbc.update("delete from users where id = ?", userId);
        assertThat(jdbc.queryForObject("select count(*) from admin_devices", Integer.class)).isZero();
    }

    // Same as WithdrawalMigrationTest#seedUser: users needs a name and the default account plan.
    private UUID seedUser() {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into users (id, email, first_name, last_name, plan_tier_id) "
                        + "select ?, ?, 'Migration', 'Test', id from plan_tiers "
                        + "where scope = 'ACCOUNT' and is_default = true limit 1",
                id, "v184-" + id.toString().substring(0, 8) + "@host.test");
        return id;
    }
}
```

- [ ] **Step 2: Run it and see it fail**

Needs Docker running (Testcontainers). If Docker is not available, say so, skip only this test, and continue.

```bash
./gradlew test --tests "event_social_media.migration.V184AdminDevicesMigrationTest"
```

Expected: FAIL, `relation "admin_devices" does not exist`.

- [ ] **Step 3: Write the migration**

`src/main/resources/db/migration/V184__admin_devices.sql`:

```sql
-- =====================================================
-- ADMIN DEVICES (spec 2026-10-28-admin-phone-widget-design, storywall repo)
--
-- A phone an admin paired with the StoryWall Admin app. The phone presents a key; only its
-- SHA-256 hash is stored (SecureTokens). Removing a phone sets revoked_at and keeps the row.
-- fcm_token is the phone's Firebase token, set by the app (push arrives in build step 3).
-- =====================================================

CREATE TABLE admin_devices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          VARCHAR(60) NOT NULL,
    key_hash      VARCHAR(64) NOT NULL,
    fcm_token     TEXT        NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at  TIMESTAMPTZ NULL,
    revoked_at    TIMESTAMPTZ NULL,
    CONSTRAINT admin_devices_key_hash_unique UNIQUE (key_hash)
);

-- The console lists an admin's live phones; the table stays tiny, so this is the one extra index.
CREATE INDEX admin_devices_owner_idx ON admin_devices (owner_user_id) WHERE revoked_at IS NULL;
```

- [ ] **Step 4: Write the entity**

`src/main/java/event_social_media/model/device/AdminDevice.java`:

```java
package event_social_media.model.device;

import event_social_media.model.base.Auditable;
import event_social_media.model.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A phone an admin paired with the StoryWall Admin app (spec 2026-10-28-admin-phone-widget-design,
 * storywall repo). The phone authenticates with a key whose hash is {@link #keyHash}; the key itself
 * is shown once, at pairing, and never stored. A device with {@link #revokedAt} set is dead for good.
 */
@Getter
@Setter
@Entity
@Table(name = "admin_devices")
public class AdminDevice extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    /** The admin who paired it. The key only works while this user is an active admin. */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @NotNull
    @Size(max = 60)
    @Column(name = "name", nullable = false, length = 60)
    private String name;

    /** {@code SecureTokens.hash} of the key. */
    @NotNull
    @Column(name = "key_hash", nullable = false, length = 64, unique = true)
    private String keyHash;

    /** The phone's Firebase token; null until the app sends one, and cleared on revoke. */
    @Column(name = "fcm_token", length = Integer.MAX_VALUE)
    private String fcmToken;

    /** Stamped by authentication, at most once a minute. */
    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;
}
```

- [ ] **Step 5: Write the repository**

`src/main/java/event_social_media/repository/device/AdminDeviceRepository.java`:

```java
package event_social_media.repository.device;

import event_social_media.model.device.AdminDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AdminDeviceRepository extends JpaRepository<AdminDevice, UUID> {

    /** The live device behind a key, with its owner loaded for the per-request admin check. */
    @Query("select d from AdminDevice d join fetch d.owner where d.keyHash = :keyHash and d.revokedAt is null")
    Optional<AdminDevice> findLiveByKeyHash(@Param("keyHash") String keyHash);

    List<AdminDevice> findByOwner_IdAndRevokedAtIsNullOrderByCreatedAtDesc(UUID ownerId);

    Optional<AdminDevice> findByIdAndOwner_IdAndRevokedAtIsNull(UUID id, UUID ownerId);

    Optional<AdminDevice> findByIdAndRevokedAtIsNull(UUID id);
}
```

- [ ] **Step 6: Run the migration test and see it pass**

```bash
./gradlew test --tests "event_social_media.migration.V184AdminDevicesMigrationTest"
```

Expected: PASS. (`ddl-auto=validate` also proves the entity matches the table.)

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V184__admin_devices.sql src/main/java/event_social_media/model/device src/main/java/event_social_media/repository/device src/test/java/event_social_media/migration/V184AdminDevicesMigrationTest.java
git commit -m "feat(devices): admin_devices table for paired admin phones"
```

## Task A2: Pair, list, revoke, authenticate

**Files:**
- Modify: `src/main/java/event_social_media/model/audit/AdminAuditAction.java` (end of the enum)
- Create: `src/main/java/event_social_media/security/DevicePrincipal.java`
- Create: `src/main/java/event_social_media/dto/device/AdminDeviceDto.java`
- Create: `src/main/java/event_social_media/dto/device/AdminDeviceCreatedDto.java`
- Create: `src/main/java/event_social_media/dto/device/AdminDeviceRequestDto.java`
- Create: `src/main/java/event_social_media/dto/device/PushTokenRequestDto.java`
- Create: `src/main/java/event_social_media/service/device/AdminDeviceService.java`
- Test: `src/test/java/event_social_media/service/device/AdminDeviceServiceTest.java`

- [ ] **Step 1: Write the failing service test**

```java
package event_social_media.service.device;

import event_social_media.dto.device.AdminDeviceCreatedDto;
import event_social_media.dto.device.AdminDeviceRequestDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.device.AdminDevice;
import event_social_media.model.user.AccountStatus;
import event_social_media.model.user.PlatformRole;
import event_social_media.model.user.User;
import event_social_media.repository.device.AdminDeviceRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.security.DevicePrincipal;
import event_social_media.security.SecureTokens;
import event_social_media.service.audit.AdminActor;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class AdminDeviceServiceTest {

    @Autowired private AdminDeviceService service;
    @Autowired private AdminDeviceRepository repository;
    @Autowired private UserRepository userRepository;
    @Autowired private SecureTokens secureTokens;
    @Autowired private TestFixtures fixtures;

    private static AdminActor actor(User user) {
        return new AdminActor(user.getId(), "127.0.0.1");
    }

    @Test
    void pairingReturnsTheKeyOnceAndStoresOnlyItsHash() {
        User admin = fixtures.newAdmin();

        AdminDeviceCreatedDto created = service.create(new AdminDeviceRequestDto("  Galaxy S25 Ultra "), actor(admin));

        assertThat(created.key()).hasSize(43);
        assertThat(created.device().name()).isEqualTo("Galaxy S25 Ultra");
        assertThat(created.device().pushEnabled()).isFalse();
        AdminDevice row = repository.findById(created.device().id()).orElseThrow();
        assertThat(row.getKeyHash()).isEqualTo(secureTokens.hash(created.key())).isNotEqualTo(created.key());
    }

    @Test
    void authenticatesALiveKeyAndStampsLastSeen() {
        User admin = fixtures.newAdmin();
        AdminDeviceCreatedDto created = service.create(new AdminDeviceRequestDto("Galaxy"), actor(admin));

        DevicePrincipal principal = service.authenticate(created.key()).orElseThrow();

        assertThat(principal.deviceId()).isEqualTo(created.device().id());
        assertThat(principal.ownerUserId()).isEqualTo(admin.getId());
        assertThat(repository.findById(created.device().id()).orElseThrow().getLastSeenAt()).isNotNull();
    }

    @Test
    void refusesUnknownRevokedAndOrphanedKeys() {
        User admin = fixtures.newAdmin();
        String revokedKey = service.create(new AdminDeviceRequestDto("Old"), actor(admin)).key();
        UUID revokedId = service.authenticate(revokedKey).orElseThrow().deviceId();
        service.revoke(revokedId, actor(admin));

        User demoted = fixtures.newAdmin();
        String demotedKey = service.create(new AdminDeviceRequestDto("Demoted"), actor(demoted)).key();
        demoted.setPlatformRole(PlatformRole.USER);
        userRepository.save(demoted);

        User suspended = fixtures.newAdmin();
        String suspendedKey = service.create(new AdminDeviceRequestDto("Suspended"), actor(suspended)).key();
        suspended.setStatus(AccountStatus.SUSPENDED);
        userRepository.save(suspended);

        assertThat(service.authenticate("not-a-key")).isEmpty();
        assertThat(service.authenticate("")).isEmpty();
        assertThat(service.authenticate(revokedKey)).isEmpty();
        assertThat(service.authenticate(demotedKey)).isEmpty();
        assertThat(service.authenticate(suspendedKey)).isEmpty();
    }

    @Test
    void listsOnlyTheCallersLivePhonesNewestFirst() {
        User admin = fixtures.newAdmin();
        User other = fixtures.newAdmin();
        service.create(new AdminDeviceRequestDto("First"), actor(admin));
        UUID removed = service.create(new AdminDeviceRequestDto("Removed"), actor(admin)).device().id();
        service.create(new AdminDeviceRequestDto("Theirs"), actor(other));
        service.revoke(removed, actor(admin));

        assertThat(service.findMine(admin.getId())).extracting("name").containsExactly("First");
    }

    @Test
    void cannotRevokeAnotherAdminsPhone() {
        User owner = fixtures.newAdmin();
        User other = fixtures.newAdmin();
        UUID id = service.create(new AdminDeviceRequestDto("Theirs"), actor(owner)).device().id();

        assertThatThrownBy(() -> service.revoke(id, actor(other))).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void revokingClearsThePushToken() {
        User admin = fixtures.newAdmin();
        AdminDeviceCreatedDto created = service.create(new AdminDeviceRequestDto("Galaxy"), actor(admin));
        DevicePrincipal principal = service.authenticate(created.key()).orElseThrow();
        service.updatePushToken(principal, " fcm-token ");
        assertThat(service.findMine(admin.getId()).get(0).pushEnabled()).isTrue();
        assertThat(repository.findById(principal.deviceId()).orElseThrow().getFcmToken()).isEqualTo("fcm-token");

        service.revoke(principal.deviceId(), actor(admin));

        assertThat(repository.findById(principal.deviceId()).orElseThrow().getFcmToken()).isNull();
    }
}
```

`User#setStatus` exists (the `status` field is `@Enumerated` with Lombok setters, as `fixtures.newAdmin()` uses `setPlatformRole`). If `setStatus` is missing, find the setter name with `git grep -n "private AccountStatus status" -B3 src/main/java/event_social_media/model/user/User.java`.

- [ ] **Step 2: Run it and see it fail**

```bash
./gradlew test --tests "event_social_media.service.device.AdminDeviceServiceTest"
```

Expected: FAIL at compile time: `AdminDeviceService`, `AdminDeviceRequestDto`, `DevicePrincipal` cannot be found.

- [ ] **Step 3: Add the audit actions**

In `src/main/java/event_social_media/model/audit/AdminAuditAction.java`, change the last constant and append two:

```java
    /** A campaign link was deleted; its sign-ups still count. No details. Target type CAMPAIGN_LINK. */
    CAMPAIGN_LINK_DELETED,
    /** A phone was paired with the StoryWall Admin app; no details. Target type ADMIN_DEVICE. */
    ADMIN_DEVICE_PAIRED,
    /** A paired phone was removed; its key stops working. No details. Target type ADMIN_DEVICE. */
    ADMIN_DEVICE_REVOKED
}
```

- [ ] **Step 4: Write the principal and DTOs**

`src/main/java/event_social_media/security/DevicePrincipal.java`:

```java
package event_social_media.security;

import java.util.UUID;

/**
 * Who a {@code /api/device/**} request is: a paired admin phone, never a user. Deliberately not a
 * {@link java.security.Principal} and not a {@code String}: code that reads the principal as a user
 * id (the guidelines check, the rate limiter's per-user bucket) must not mistake a phone for its owner.
 */
public record DevicePrincipal(UUID deviceId, UUID ownerUserId) {
}
```

`src/main/java/event_social_media/dto/device/AdminDeviceDto.java`:

```java
package event_social_media.dto.device;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A paired phone as the admin console sees it. pushEnabled: the phone has sent a Firebase token. */
public record AdminDeviceDto(UUID id, String name, OffsetDateTime createdAt, OffsetDateTime lastSeenAt,
                             boolean pushEnabled) {
}
```

`src/main/java/event_social_media/dto/device/AdminDeviceCreatedDto.java`:

```java
package event_social_media.dto.device;

/** The answer to pairing: the device and its key. The only time the key leaves the server. */
public record AdminDeviceCreatedDto(AdminDeviceDto device, String key) {
}
```

`src/main/java/event_social_media/dto/device/AdminDeviceRequestDto.java`:

```java
package event_social_media.dto.device;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminDeviceRequestDto(@NotBlank @Size(max = 60) String name) {
}
```

`src/main/java/event_social_media/dto/device/PushTokenRequestDto.java`:

```java
package event_social_media.dto.device;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PushTokenRequestDto(@NotBlank @Size(max = 4096) String token) {
}
```

- [ ] **Step 5: Write the service**

`src/main/java/event_social_media/service/device/AdminDeviceService.java`:

```java
package event_social_media.service.device;

import event_social_media.dto.device.AdminDeviceCreatedDto;
import event_social_media.dto.device.AdminDeviceDto;
import event_social_media.dto.device.AdminDeviceRequestDto;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.device.AdminDevice;
import event_social_media.model.user.AccountStatus;
import event_social_media.model.user.PlatformRole;
import event_social_media.model.user.User;
import event_social_media.repository.device.AdminDeviceRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.security.DevicePrincipal;
import event_social_media.security.SecureTokens;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.audit.AdminAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Paired admin phones (spec 2026-10-28-admin-phone-widget-design, storywall repo). A key is checked
 * on every request against its owner's current role and status, so demoting or suspending an admin
 * stops their phones at once, without anyone having to remember to revoke them.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDeviceService {

    private static final String TARGET_TYPE = "ADMIN_DEVICE";
    private static final Duration TOUCH_INTERVAL = Duration.ofMinutes(1);

    private final AdminDeviceRepository repository;
    private final UserRepository userRepository;
    private final SecureTokens secureTokens;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<AdminDeviceDto> findMine(UUID ownerId) {
        return repository.findByOwner_IdAndRevokedAtIsNullOrderByCreatedAtDesc(ownerId).stream()
                .map(AdminDeviceService::toDto)
                .toList();
    }

    @Transactional
    public AdminDeviceCreatedDto create(AdminDeviceRequestDto dto, AdminActor actor) {
        User owner = userRepository.findById(actor.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User", actor.userId()));
        String key = secureTokens.generate();
        AdminDevice device = new AdminDevice();
        device.setOwner(owner);
        device.setName(dto.name().trim());
        device.setKeyHash(secureTokens.hash(key));
        AdminDevice saved = repository.saveAndFlush(device);
        adminAuditService.record(actor, AdminAuditAction.ADMIN_DEVICE_PAIRED, TARGET_TYPE, saved.getId(), null, Map.of());
        log.info("Admin device {} paired (actorId={})", saved.getId(), actor.userId());
        return new AdminDeviceCreatedDto(toDto(saved), key);
    }

    @Transactional
    public void revoke(UUID id, AdminActor actor) {
        AdminDevice device = repository.findByIdAndOwner_IdAndRevokedAtIsNull(id, actor.userId())
                .orElseThrow(() -> new ResourceNotFoundException("AdminDevice", id));
        device.setRevokedAt(now());
        device.setFcmToken(null);
        adminAuditService.record(actor, AdminAuditAction.ADMIN_DEVICE_REVOKED, TARGET_TYPE, id, null, Map.of());
        log.info("Admin device {} revoked (actorId={})", id, actor.userId());
    }

    /**
     * For {@link event_social_media.security.DeviceKeyAuthenticationFilter}: the phone behind a
     * presented key, while it is live and its owner is an active admin. Stamps last use at most once
     * a minute, so a phone polling every 15 minutes writes once per poll.
     */
    @Transactional
    public Optional<DevicePrincipal> authenticate(String key) {
        if (key == null || key.isBlank()) return Optional.empty();
        return repository.findLiveByKeyHash(secureTokens.hash(key.trim()))
                .filter(device -> isActiveAdmin(device.getOwner()))
                .map(device -> {
                    OffsetDateTime now = now();
                    if (device.getLastSeenAt() == null || device.getLastSeenAt().isBefore(now.minus(TOUCH_INTERVAL))) {
                        device.setLastSeenAt(now);
                    }
                    return new DevicePrincipal(device.getId(), device.getOwner().getId());
                });
    }

    @Transactional
    public void updatePushToken(DevicePrincipal principal, String token) {
        AdminDevice device = repository.findByIdAndRevokedAtIsNull(principal.deviceId())
                .orElseThrow(() -> new ResourceNotFoundException("AdminDevice", principal.deviceId()));
        device.setFcmToken(token.trim());
    }

    // ---------------------------------------------------------------------------------------------

    private static boolean isActiveAdmin(User owner) {
        return owner.getPlatformRole() == PlatformRole.ADMIN && owner.getStatus() == AccountStatus.ACTIVE;
    }

    private static AdminDeviceDto toDto(AdminDevice device) {
        return new AdminDeviceDto(device.getId(), device.getName(), device.getCreatedAt(), device.getLastSeenAt(),
                device.getFcmToken() != null);
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}
```

- [ ] **Step 6: Run the test and see it pass**

```bash
./gradlew test --tests "event_social_media.service.device.AdminDeviceServiceTest"
```

Expected: PASS (6 tests). If `created.device().createdAt()` is needed anywhere and comes back null, that is why `create` uses `saveAndFlush`: auditing fills `createdAt` on flush.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/model/audit/AdminAuditAction.java src/main/java/event_social_media/security/DevicePrincipal.java src/main/java/event_social_media/dto/device src/main/java/event_social_media/service/device/AdminDeviceService.java src/test/java/event_social_media/service/device/AdminDeviceServiceTest.java
git commit -m "feat(devices): pair, list, revoke and authenticate admin phones"
```

## Task A3: Admin endpoints `/api/admin/devices`

**Files:**
- Create: `src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java`
- Test: `src/test/java/event_social_media/controller/device/AdminDeviceAdminControllerTest.java`
- Test: `src/test/java/event_social_media/controller/device/AdminDeviceAdminControllerSecurityTest.java`

- [ ] **Step 1: Write the failing controller tests**

`AdminDeviceAdminControllerTest.java`:

```java
package event_social_media.controller.device;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminDeviceAdminControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private ObjectMapper objectMapper;

    private UsernamePasswordAuthenticationToken admin;

    @BeforeEach
    void setUp() {
        admin = new UsernamePasswordAuthenticationToken(fixtures.newAdmin().getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    @Test
    void pairListAndRemove() throws Exception {
        String created = mockMvc.perform(post("/api/admin/devices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Galaxy S25 Ultra\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").isString())
                .andExpect(jsonPath("$.device.name").value("Galaxy S25 Ultra"))
                .andExpect(jsonPath("$.device.pushEnabled").value(false))
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("device").get("id").asText();

        mockMvc.perform(get("/api/admin/devices").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].key").doesNotExist());

        mockMvc.perform(delete("/api/admin/devices/{id}", id).with(authentication(admin)))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/admin/devices/{id}", id).with(authentication(admin)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/admin/devices").with(authentication(admin)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void refusesABlankOrLongName() throws Exception {
        mockMvc.perform(post("/api/admin/devices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"   \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/devices").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + "a".repeat(61) + "\"}"))
                .andExpect(status().isBadRequest());
    }
}
```

`AdminDeviceAdminControllerSecurityTest.java`:

```java
package event_social_media.controller.device;

import event_social_media.model.user.User;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
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
import java.util.stream.Stream;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminDeviceAdminControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;

    static Stream<MockHttpServletRequestBuilder> adminRoutes() {
        return Stream.of(
                get("/api/admin/devices"),
                post("/api/admin/devices").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Galaxy\"}"),
                delete("/api/admin/devices/{id}", UUID.randomUUID()));
    }

    private static UsernamePasswordAuthenticationToken token(User u, String role) {
        return new UsernamePasswordAuthenticationToken(u.getId().toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }

    @ParameterizedTest
    @MethodSource("adminRoutes")
    void anonymousCallersAreRefused(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @MethodSource("adminRoutes")
    void ordinaryUsersAreForbidden(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request.with(authentication(token(fixtures.newUser(), "ROLE_USER"))))
                .andExpect(status().isForbidden());
    }
}
```

- [ ] **Step 2: Run them and see them fail**

```bash
./gradlew test --tests "event_social_media.controller.device.AdminDeviceAdminController*"
```

Expected: `pairListAndRemove` and `refusesABlankOrLongName` FAIL with 404 (no handler). The security tests may already pass (the `/api/admin/**` rule refuses them before routing); that is fine.

- [ ] **Step 3: Write the controller**

`src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java`:

```java
package event_social_media.controller.device;

import event_social_media.dto.device.AdminDeviceCreatedDto;
import event_social_media.dto.device.AdminDeviceDto;
import event_social_media.dto.device.AdminDeviceRequestDto;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.device.AdminDeviceService;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** The admin's paired phones. See spec 2026-10-28-admin-phone-widget-design (storywall repo). */
@RestController
@RequestMapping("/api/admin/devices")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDeviceAdminController {

    private final AdminDeviceService adminDeviceService;
    private final ClientAddressResolver clientAddressResolver;

    @GetMapping
    public List<AdminDeviceDto> findMine(Authentication authentication) {
        return adminDeviceService.findMine(userId(authentication));
    }

    /** The response carries the key; it is never shown again. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimit(name = "admin.devices.create", limit = 10, windowSeconds = 3600)
    public AdminDeviceCreatedDto create(@Valid @RequestBody AdminDeviceRequestDto dto,
                                        Authentication authentication, HttpServletRequest request) {
        return adminDeviceService.create(dto, actor(authentication, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id, Authentication authentication, HttpServletRequest request) {
        adminDeviceService.revoke(id, actor(authentication, request));
    }

    private static UUID userId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }

    private AdminActor actor(Authentication authentication, HttpServletRequest request) {
        return new AdminActor(userId(authentication), clientAddressResolver.resolve(request));
    }
}
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
./gradlew test --tests "event_social_media.controller.device.AdminDeviceAdminController*"
```

Expected: PASS (2 + 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/controller/device/AdminDeviceAdminController.java src/test/java/event_social_media/controller/device/AdminDeviceAdminController*.java
git commit -m "feat(devices): admin endpoints to pair, list and remove phones"
```

## Task A4: Device key authentication and `PUT /api/device/push-token`

**Files:**
- Create: `src/main/java/event_social_media/security/DeviceKeyAuthenticationFilter.java`
- Modify: `src/main/java/event_social_media/config/SecurityConfig.java` (constructor fields, the `authorizeHttpRequests` block, the filter registration)
- Create: `src/main/java/event_social_media/controller/device/DeviceController.java`
- Test: `src/test/java/event_social_media/controller/device/DeviceControllerTest.java`

- [ ] **Step 1: Write the failing endpoint test**

```java
package event_social_media.controller.device;

import event_social_media.dto.device.AdminDeviceCreatedDto;
import event_social_media.dto.device.AdminDeviceRequestDto;
import event_social_media.model.user.PlatformRole;
import event_social_media.model.user.User;
import event_social_media.repository.device.AdminDeviceRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.device.AdminDeviceService;
import event_social_media.support.TestFixtures;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DeviceControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private AdminDeviceService adminDeviceService;
    @Autowired private AdminDeviceRepository repository;
    @Autowired private UserRepository userRepository;

    private AdminDeviceCreatedDto pair(User admin) {
        return adminDeviceService.create(new AdminDeviceRequestDto("Galaxy"), new AdminActor(admin.getId(), "127.0.0.1"));
    }

    private static MockHttpServletRequestBuilder pushToken(String authorization) {
        MockHttpServletRequestBuilder request = put("/api/device/push-token")
                .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"fcm-1\"}");
        return authorization == null ? request : request.header("Authorization", authorization);
    }

    @Test
    void storesThePushTokenForALiveKey() throws Exception {
        AdminDeviceCreatedDto created = pair(fixtures.newAdmin());

        mockMvc.perform(pushToken("Device " + created.key())).andExpect(status().isNoContent());

        assertThat(repository.findById(created.device().id()).orElseThrow().getFcmToken()).isEqualTo("fcm-1");
    }

    @Test
    void refusesAMissingUnknownOrRevokedKey() throws Exception {
        User admin = fixtures.newAdmin();
        AdminDeviceCreatedDto created = pair(admin);
        adminDeviceService.revoke(created.device().id(), new AdminActor(admin.getId(), "127.0.0.1"));

        mockMvc.perform(pushToken(null)).andExpect(status().isUnauthorized());
        mockMvc.perform(pushToken("Device not-a-key")).andExpect(status().isUnauthorized());
        mockMvc.perform(pushToken("Device " + created.key())).andExpect(status().isUnauthorized());
    }

    @Test
    void refusesAKeyWhoseOwnerIsNoLongerAnAdmin() throws Exception {
        User admin = fixtures.newAdmin();
        AdminDeviceCreatedDto created = pair(admin);
        admin.setPlatformRole(PlatformRole.USER);
        userRepository.save(admin);

        mockMvc.perform(pushToken("Device " + created.key())).andExpect(status().isUnauthorized());
    }

    @Test
    void aDeviceKeyOpensNothingOutsideTheDeviceApi() throws Exception {
        String key = pair(fixtures.newAdmin()).key();

        mockMvc.perform(get("/api/admin/devices").header("Authorization", "Device " + key))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users").header("Authorization", "Device " + key))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anAdminSessionCannotUseTheDeviceApi() throws Exception {
        User admin = fixtures.newAdmin();
        UsernamePasswordAuthenticationToken session = new UsernamePasswordAuthenticationToken(admin.getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        mockMvc.perform(pushToken(null).with(authentication(session))).andExpect(status().isForbidden());
    }

    @Test
    void refusesABlankToken() throws Exception {
        String key = pair(fixtures.newAdmin()).key();

        mockMvc.perform(put("/api/device/push-token").header("Authorization", "Device " + key)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\" \"}"))
                .andExpect(status().isBadRequest());
    }
}
```

`storesThePushTokenForALiveKey` is also the guard for the guidelines check: a `PUT` is a write, and `GuidelinesAcceptanceInterceptor` must skip a phone instead of refusing it.

- [ ] **Step 2: Run it and see it fail**

```bash
./gradlew test --tests "event_social_media.controller.device.DeviceControllerTest"
```

Expected: FAIL. `storesThePushTokenForALiveKey` gets 401 (nothing reads the `Device` scheme yet).

- [ ] **Step 3: Write the filter**

`src/main/java/event_social_media/security/DeviceKeyAuthenticationFilter.java`:

```java
package event_social_media.security;

import event_social_media.service.device.AdminDeviceService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates a paired admin phone from {@code Authorization: Device <key>} (spec
 * 2026-10-28-admin-phone-widget-design, storywall repo).
 *
 * <p>Runs only under {@code /api/device/}: everywhere else a device key is ignored and the request
 * stays anonymous, so a phone can never reach an endpoint that only asks for "authenticated". The
 * only authority it grants is {@link #AUTHORITY}, never a role. A missing, unknown or revoked key,
 * or one whose owner is no longer an active admin, leaves the request anonymous and the security
 * chain answers 401.
 */
@Component
@RequiredArgsConstructor
public class DeviceKeyAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTHORITY = "DEVICE";
    static final String PATH_PREFIX = "/api/device/";
    private static final String SCHEME = "Device ";

    private final AdminDeviceService adminDeviceService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(SCHEME)) {
            adminDeviceService.authenticate(header.substring(SCHEME.length())).ifPresent(principal ->
                    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                            principal, null, List.of(new SimpleGrantedAuthority(AUTHORITY)))));
        }
        filterChain.doFilter(request, response);
    }
}
```

- [ ] **Step 4: Wire it into the security chain**

In `src/main/java/event_social_media/config/SecurityConfig.java`:

1. Add the field next to `jwtAuthenticationFilter` (and its import `event_social_media.security.DeviceKeyAuthenticationFilter`):

```java
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final DeviceKeyAuthenticationFilter deviceKeyAuthenticationFilter;
```

2. Add the rule right after the `/api/admin/**` line, before `.anyRequest().authenticated()`:

```java
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Paired admin phones, by device key only (DeviceKeyAuthenticationFilter). An
                        // admin's own session is not a phone and gets 403 here.
                        .requestMatchers("/api/device/**").hasAuthority(DeviceKeyAuthenticationFilter.AUTHORITY)
                        .anyRequest().authenticated()
```

3. Register the filter next to the JWT one:

```java
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(deviceKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
```

4. Add one bullet to the class Javadoc's list of rules, after the `/api/admin/**` bullet:

```java
 *   <li>{@code /api/device/**} requires the {@code DEVICE} authority, which only
 *       {@link event_social_media.security.DeviceKeyAuthenticationFilter} grants.</li>
```

- [ ] **Step 5: Write the device controller (push token only for now)**

`src/main/java/event_social_media/controller/device/DeviceController.java`:

```java
package event_social_media.controller.device;

import event_social_media.dto.device.PushTokenRequestDto;
import event_social_media.security.DevicePrincipal;
import event_social_media.service.device.AdminDeviceService;
import event_social_media.service.ratelimit.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** What a paired admin phone calls. See spec 2026-10-28-admin-phone-widget-design (storywall repo). */
@RestController
@RequestMapping("/api/device")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('DEVICE')")
public class DeviceController {

    private final AdminDeviceService adminDeviceService;

    @PutMapping("/push-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RateLimit(name = "device.push-token", limit = 10, windowSeconds = 60)
    public void pushToken(@AuthenticationPrincipal DevicePrincipal device, @Valid @RequestBody PushTokenRequestDto dto) {
        adminDeviceService.updatePushToken(device, dto.token());
    }
}
```

- [ ] **Step 6: Run the test and see it pass**

```bash
./gradlew test --tests "event_social_media.controller.device.DeviceControllerTest"
```

Expected: PASS (6 tests).

- [ ] **Step 7: Run the security-sensitive suites that touch the chain**

```bash
./gradlew test --tests "*Security*" --tests "event_social_media.security.*"
```

Expected: PASS. A failure here means the new rule or filter changed another route's behaviour; fix that before going on.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/security/DeviceKeyAuthenticationFilter.java src/main/java/event_social_media/config/SecurityConfig.java src/main/java/event_social_media/controller/device/DeviceController.java src/test/java/event_social_media/controller/device/DeviceControllerTest.java
git commit -m "feat(devices): device key authentication on /api/device and push token upload"
```

## Task A5: The summary

**Files:**
- Modify: `src/main/java/event_social_media/repository/billing/RefundRequestRepository.java`
- Modify: `src/main/java/event_social_media/repository/feedback/BugReportRepository.java`
- Modify: `src/main/java/event_social_media/repository/feedback/ErrorEventRepository.java`
- Create: `src/main/java/event_social_media/dto/device/DeviceSummaryDto.java`
- Create: `src/main/java/event_social_media/service/device/DeviceSummaryService.java`
- Modify: `src/main/java/event_social_media/controller/device/DeviceController.java`
- Test: `src/test/java/event_social_media/service/device/DeviceSummaryServiceTest.java`
- Test: `src/test/java/event_social_media/controller/device/DeviceControllerTest.java` (one more test)

- [ ] **Step 1: Write the failing unit test**

`src/test/java/event_social_media/service/device/DeviceSummaryServiceTest.java`:

```java
package event_social_media.service.device;

import event_social_media.dto.device.DeviceSummaryDto;
import event_social_media.dto.platform.FunnelMetricsResponseDto;
import event_social_media.dto.platform.PlatformMetricsResponseDto;
import event_social_media.dto.platform.VisitorMetricsDto;
import event_social_media.model.billing.RefundRequestStatus;
import event_social_media.model.platform.ProviderCostSnapshot;
import event_social_media.repository.audit.ModerationCaseRow;
import event_social_media.repository.audit.ReportRepository;
import event_social_media.repository.billing.ProviderWebhookEventRepository;
import event_social_media.repository.billing.RefundRequestRepository;
import event_social_media.repository.feedback.BugReportRepository;
import event_social_media.repository.feedback.ErrorEventRepository;
import event_social_media.repository.platform.ProviderCostSnapshotRepository;
import event_social_media.service.platform.FunnelMetricsService;
import event_social_media.service.platform.PlatformMetricsService;
import event_social_media.service.platform.VisitorMetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeviceSummaryServiceTest {

    // Wednesday 2026-10-28 12:00 in Athens (UTC+2 after the 25 October clock change).
    private static final Instant NOW = Instant.parse("2026-10-28T10:00:00Z");
    private static final OffsetDateTime TODAY_START = OffsetDateTime.parse("2026-10-28T00:00+02:00");
    private static final OffsetDateTime MONDAY_START = OffsetDateTime.parse("2026-10-26T00:00+02:00");
    private static final OffsetDateTime DAY_AGO = OffsetDateTime.parse("2026-10-27T10:00Z");

    @Mock private RefundRequestRepository refundRequestRepository;
    @Mock private ProviderWebhookEventRepository providerWebhookEventRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private BugReportRepository bugReportRepository;
    @Mock private ErrorEventRepository errorEventRepository;
    @Mock private FunnelMetricsService funnelMetricsService;
    @Mock private PlatformMetricsService platformMetricsService;
    @Mock private VisitorMetricsService visitorMetricsService;
    @Mock private ProviderCostSnapshotRepository providerCostSnapshotRepository;

    @InjectMocks private DeviceSummaryService service;

    @BeforeEach
    void fixTheClock() {
        service.setClock(Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void buildsEveryGroupFromTheConsolesOwnSources() {
        stubEverything(false);

        DeviceSummaryDto summary = service.summary();

        assertThat(summary.generatedAt()).isEqualTo(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
        assertThat(summary.attention()).isEqualTo(new DeviceSummaryDto.Attention(1L, 2L, 1L, 4L, 5L));
        assertThat(summary.sales()).isEqualTo(new DeviceSummaryDto.Sales(3L,
                List.of(new DeviceSummaryDto.Money("EUR", 14_800)),
                List.of(new DeviceSummaryDto.Money("EUR", 61_000))));
        assertThat(summary.growth()).isEqualTo(new DeviceSummaryDto.Growth(6L, 14L, 92L));
        assertThat(summary.costs()).isEqualTo(new DeviceSummaryDto.Costs(
                List.of(new DeviceSummaryDto.Money("EUR", 600), new DeviceSummaryDto.Money("USD", 3_800)),
                OffsetDateTime.parse("2026-10-26T08:20Z"),
                1_200_000_000L));
    }

    @Test
    void aFailingSourceBlanksOnlyItsOwnNumbers() {
        stubEverything(true);

        DeviceSummaryDto summary = service.summary();

        assertThat(summary.growth().visitorsToday()).isNull();
        assertThat(summary.growth().signUpsToday()).isEqualTo(6L);
        assertThat(summary.attention().heldWithdrawals()).isEqualTo(1L);
    }

    private void stubEverything(boolean visitorsFail) {
        when(refundRequestRepository.countByStatus(RefundRequestStatus.HELD)).thenReturn(1L);
        when(providerWebhookEventRepository.countUnprocessed(OffsetDateTime.parse("2026-10-28T09:55Z"))).thenReturn(2L);
        when(reportRepository.findActiveCases()).thenReturn(List.of(caseRow(2), caseRow(0)));
        when(bugReportRepository.countByCreatedAtGreaterThanEqual(DAY_AGO)).thenReturn(4L);
        when(errorEventRepository.countSeenSinceWithoutRejections(DAY_AGO)).thenReturn(5L);
        when(funnelMetricsService.funnel(TODAY_START, null, null)).thenReturn(funnel(6, 14_800, Map.of("CONSUMER", 2L, "BUSINESS", 1L)));
        when(funnelMetricsService.funnel(MONDAY_START, null, null)).thenReturn(funnel(20, 61_000, Map.of("CONSUMER", 9L)));
        when(platformMetricsService.snapshot()).thenReturn(platform());
        if (visitorsFail) {
            when(visitorMetricsService.visitors(TODAY_START, null, false)).thenThrow(new IllegalStateException("GA down"));
        } else {
            VisitorMetricsDto visitors = new VisitorMetricsDto();
            visitors.setConfigured(true);
            visitors.setVisitors(92);
            when(visitorMetricsService.visitors(TODAY_START, null, false)).thenReturn(visitors);
        }
        when(providerCostSnapshotRepository.findLatestPerProvider()).thenReturn(List.of(
                cost("railway", 3_000L, "USD", "2026-10-26T08:15Z"),
                cost("vercel", 800L, "USD", "2026-10-26T08:20Z"),
                cost("stripe", 600L, "EUR", "2026-10-26T08:16Z"),
                cost("r2", null, "USD", "2026-10-26T08:17Z")));
    }

    private static ModerationCaseRow caseRow(long openCount) {
        return new ModerationCaseRow(null, UUID.randomUUID(), UUID.randomUUID(), "Wedding", 2, null, null, openCount, 0);
    }

    private static FunnelMetricsResponseDto funnel(long signedUp, long netMinor, Map<String, Long> ordersByBuyerType) {
        FunnelMetricsResponseDto dto = new FunnelMetricsResponseDto();
        FunnelMetricsResponseDto.Funnel funnel = new FunnelMetricsResponseDto.Funnel();
        funnel.setSignedUp(signedUp);
        dto.setFunnel(funnel);
        FunnelMetricsResponseDto.CurrencyTotals totals = new FunnelMetricsResponseDto.CurrencyTotals();
        totals.setCurrency("EUR");
        totals.setNetMinor(netMinor);
        FunnelMetricsResponseDto.Revenue revenue = new FunnelMetricsResponseDto.Revenue();
        revenue.setTotals(List.of(totals));
        revenue.setOrdersByBuyerType(ordersByBuyerType);
        dto.setRevenue(revenue);
        return dto;
    }

    private static PlatformMetricsResponseDto platform() {
        PlatformMetricsResponseDto dto = new PlatformMetricsResponseDto();
        dto.setActiveEvents(14);
        PlatformMetricsResponseDto.Storage storage = new PlatformMetricsResponseDto.Storage();
        storage.setUsedBytes(1_200_000_000L);
        dto.setStorage(storage);
        return dto;
    }

    private static ProviderCostSnapshot cost(String provider, Long amountMinor, String currency, String fetchedAt) {
        ProviderCostSnapshot snapshot = new ProviderCostSnapshot();
        snapshot.setProvider(provider);
        snapshot.setAmountMinor(amountMinor);
        snapshot.setCurrency(currency);
        snapshot.setFetchedAt(OffsetDateTime.parse(fetchedAt));
        return snapshot;
    }
}
```

Notes for the implementer:
- `ModerationCaseRow`'s first argument is a `ReportTargetType`; `null` is fine for this test.
- `VisitorMetricsDto` is `@Data`, so `setConfigured`/`setVisitors` exist. `FunnelMetricsResponseDto` and its nested classes are `@Data` with no-arg constructors.
- The newest `fetchedAt` is Vercel's (08:20), so `asOf` is 08:20 even though R2 has no amount.

- [ ] **Step 2: Run it and see it fail**

```bash
./gradlew test --tests "event_social_media.service.device.DeviceSummaryServiceTest"
```

Expected: FAIL at compile time: `DeviceSummaryService`, `DeviceSummaryDto`, `countByStatus`, `countByCreatedAtGreaterThanEqual`, `countSeenSinceWithoutRejections` cannot be found.

- [ ] **Step 3: Add the three repository counts**

`RefundRequestRepository.java`, inside the interface (import `event_social_media.model.billing.RefundRequestStatus` if it is not imported yet):

```java
    /** How many requests wait in one status; the admin phone summary counts HELD ones. */
    long countByStatus(RefundRequestStatus status);
```

`BugReportRepository.java`, inside the interface:

```java
    /** Bug reports filed since then, for the admin phone summary. */
    long countByCreatedAtGreaterThanEqual(OffsetDateTime since);
```

`ErrorEventRepository.java`, inside the interface:

```java
    /**
     * Distinct errors seen since then, leaving out 4xx rejections (a wrong password, an expired
     * link): the admin phone summary's "errors" figure. A repeat counts once, as on the Errors screen.
     */
    @Query("""
            select count(e) from ErrorEvent e
            where e.lastSeenAt >= :since
              and (e.httpStatus is null or e.httpStatus not between 400 and 499)""")
    long countSeenSinceWithoutRejections(@Param("since") OffsetDateTime since);
```

- [ ] **Step 4: Write the DTO**

`src/main/java/event_social_media/dto/device/DeviceSummaryDto.java`:

```java
package event_social_media.dto.device;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * {@code GET /api/device/summary}: the admin phone widget's numbers. Every number is nullable: a
 * source that fails comes back null and the rest still answer. Money is never added across
 * currencies. Day boundaries are Europe/Athens.
 */
public record DeviceSummaryDto(OffsetDateTime generatedAt, Attention attention, Sales sales, Growth growth,
                               Costs costs) {

    /** Things waiting on an admin. bugReports24h and errors24h cover the last 24 hours. */
    public record Attention(Long heldWithdrawals, Long unprocessedWebhooks, Long openReports, Long bugReports24h,
                            Long errors24h) {
    }

    public record Money(String currency, long amountMinor) {
    }

    /** todayOrders: provider-paid orders above 0 since 00:00. today/week: net revenue per currency. */
    public record Sales(Long todayOrders, List<Money> today, List<Money> week) {
    }

    public record Growth(Long signUpsToday, Long liveEvents, Long visitorsToday) {
    }

    /** totals: each provider's latest reading, summed per currency. asOf: the newest reading. */
    public record Costs(List<Money> totals, OffsetDateTime asOf, Long storageUsedBytes) {
    }
}
```

- [ ] **Step 5: Write the service**

`src/main/java/event_social_media/service/device/DeviceSummaryService.java`:

```java
package event_social_media.service.device;

import event_social_media.dto.device.DeviceSummaryDto;
import event_social_media.dto.device.DeviceSummaryDto.Attention;
import event_social_media.dto.device.DeviceSummaryDto.Costs;
import event_social_media.dto.device.DeviceSummaryDto.Growth;
import event_social_media.dto.device.DeviceSummaryDto.Money;
import event_social_media.dto.device.DeviceSummaryDto.Sales;
import event_social_media.dto.platform.FunnelMetricsResponseDto;
import event_social_media.dto.platform.PlatformMetricsResponseDto;
import event_social_media.dto.platform.VisitorMetricsDto;
import event_social_media.model.billing.RefundRequestStatus;
import event_social_media.model.platform.ProviderCostSnapshot;
import event_social_media.repository.audit.ReportRepository;
import event_social_media.repository.billing.ProviderWebhookEventRepository;
import event_social_media.repository.billing.RefundRequestRepository;
import event_social_media.repository.feedback.BugReportRepository;
import event_social_media.repository.feedback.ErrorEventRepository;
import event_social_media.repository.platform.ProviderCostSnapshotRepository;
import event_social_media.service.platform.FunnelMetricsService;
import event_social_media.service.platform.PlatformMetricsService;
import event_social_media.service.platform.VisitorMetricsService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Supplier;

/**
 * The admin phone widget's summary (spec 2026-10-28-admin-phone-widget-design, storywall repo). Every
 * figure comes from the source the admin console reads for the same thing, so the phone and the
 * console never disagree.
 *
 * <p>Deliberately not {@code @Transactional}: each source runs on its own, and one that fails is
 * logged and comes back null instead of taking the whole summary down with it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceSummaryService {

    static final ZoneId ZONE = ZoneId.of("Europe/Athens");
    /** The same floor the admin webhooks list uses, so a delivery still being handled isn't counted. */
    private static final Duration WEBHOOK_FLOOR = Duration.ofMinutes(5);
    private static final Duration RECENT = Duration.ofHours(24);

    private final RefundRequestRepository refundRequestRepository;
    private final ProviderWebhookEventRepository providerWebhookEventRepository;
    private final ReportRepository reportRepository;
    private final BugReportRepository bugReportRepository;
    private final ErrorEventRepository errorEventRepository;
    private final FunnelMetricsService funnelMetricsService;
    private final PlatformMetricsService platformMetricsService;
    private final VisitorMetricsService visitorMetricsService;
    private final ProviderCostSnapshotRepository providerCostSnapshotRepository;

    @Setter(AccessLevel.PACKAGE)
    private Clock clock = Clock.systemUTC();

    public DeviceSummaryDto summary() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        LocalDate today = now.atZoneSameInstant(ZONE).toLocalDate();
        OffsetDateTime todayStart = today.atStartOfDay(ZONE).toOffsetDateTime();
        OffsetDateTime weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(ZONE).toOffsetDateTime();
        OffsetDateTime dayAgo = now.minus(RECENT);

        FunnelMetricsResponseDto todayFunnel = read("funnel today", () -> funnelMetricsService.funnel(todayStart, null, null));
        FunnelMetricsResponseDto weekFunnel = read("funnel week", () -> funnelMetricsService.funnel(weekStart, null, null));
        PlatformMetricsResponseDto platform = read("platform metrics", platformMetricsService::snapshot);

        Attention attention = new Attention(
                read("held withdrawals", () -> refundRequestRepository.countByStatus(RefundRequestStatus.HELD)),
                read("unprocessed webhooks", () -> providerWebhookEventRepository.countUnprocessed(now.minus(WEBHOOK_FLOOR))),
                read("open reports", () -> reportRepository.findActiveCases().stream().filter(c -> c.openCount() > 0).count()),
                read("bug reports", () -> bugReportRepository.countByCreatedAtGreaterThanEqual(dayAgo)),
                read("errors", () -> errorEventRepository.countSeenSinceWithoutRejections(dayAgo)));
        Sales sales = new Sales(
                todayFunnel == null ? null : paidOrders(todayFunnel),
                todayFunnel == null ? null : netRevenue(todayFunnel),
                weekFunnel == null ? null : netRevenue(weekFunnel));
        Growth growth = new Growth(
                todayFunnel == null ? null : todayFunnel.getFunnel().getSignedUp(),
                platform == null ? null : platform.getActiveEvents(),
                read("visitors", () -> visitorsToday(todayStart)));
        return new DeviceSummaryDto(now, attention, sales, growth, costs(platform));
    }

    // ---------------------------------------------------------------------------------------------

    /** Provider-paid orders above 0 in the range: the funnel's per-buyer-type counts, added up. */
    private static long paidOrders(FunnelMetricsResponseDto funnel) {
        Map<String, Long> byBuyerType = funnel.getRevenue().getOrdersByBuyerType();
        return byBuyerType == null ? 0 : byBuyerType.values().stream().mapToLong(Long::longValue).sum();
    }

    private static List<Money> netRevenue(FunnelMetricsResponseDto funnel) {
        return funnel.getRevenue().getTotals().stream()
                .map(totals -> new Money(totals.getCurrency(), totals.getNetMinor()))
                .sorted(Comparator.comparing(Money::currency))
                .toList();
    }

    /** Null when Google Analytics is not set up, so the phone shows a blank rather than a zero. */
    private Long visitorsToday(OffsetDateTime todayStart) {
        VisitorMetricsDto visitors = visitorMetricsService.visitors(todayStart, null, false);
        return visitors.isConfigured() ? visitors.getVisitors() : null;
    }

    private Costs costs(PlatformMetricsResponseDto platform) {
        Long storageUsedBytes = platform == null ? null : platform.getStorage().getUsedBytes();
        List<ProviderCostSnapshot> snapshots = read("provider costs", providerCostSnapshotRepository::findLatestPerProvider);
        if (snapshots == null) return new Costs(null, null, storageUsedBytes);

        Map<String, Long> byCurrency = new TreeMap<>();
        OffsetDateTime asOf = null;
        for (ProviderCostSnapshot snapshot : snapshots) {
            if (asOf == null || snapshot.getFetchedAt().isAfter(asOf)) asOf = snapshot.getFetchedAt();
            if (snapshot.getAmountMinor() != null) {
                byCurrency.merge(snapshot.getCurrency(), snapshot.getAmountMinor(), Long::sum);
            }
        }
        List<Money> totals = byCurrency.entrySet().stream().map(e -> new Money(e.getKey(), e.getValue())).toList();
        return new Costs(totals, asOf, storageUsedBytes);
    }

    private static <T> T read(String what, Supplier<T> source) {
        try {
            return source.get();
        } catch (RuntimeException e) {
            log.warn("Device summary: {} unavailable", what, e);
            return null;
        }
    }
}
```

- [ ] **Step 6: Run the unit test and see it pass**

```bash
./gradlew test --tests "event_social_media.service.device.DeviceSummaryServiceTest"
```

Expected: PASS (2 tests).

- [ ] **Step 7: Add the endpoint test**

Append to `DeviceControllerTest` (add `import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;`):

```java
    @Test
    void servesTheSummaryToALiveKey() throws Exception {
        String key = pair(fixtures.newAdmin()).key();

        // isNumber() proves each count query ran on the database: a failed source would be null.
        mockMvc.perform(get("/api/device/summary").header("Authorization", "Device " + key))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generatedAt").isString())
                .andExpect(jsonPath("$.attention.heldWithdrawals").isNumber())
                .andExpect(jsonPath("$.attention.unprocessedWebhooks").isNumber())
                .andExpect(jsonPath("$.attention.openReports").isNumber())
                .andExpect(jsonPath("$.attention.bugReports24h").isNumber())
                .andExpect(jsonPath("$.attention.errors24h").isNumber())
                .andExpect(jsonPath("$.costs.totals").isArray());

        mockMvc.perform(get("/api/device/summary")).andExpect(status().isUnauthorized());
    }
```

Sales and growth are not asserted here: the funnel's native queries are Postgres-only and the test database is H2, so they come back null in this test by design (the unit test covers them).

- [ ] **Step 8: Run it and see it fail**

```bash
./gradlew test --tests "event_social_media.controller.device.DeviceControllerTest.servesTheSummaryToALiveKey"
```

Expected: FAIL with 404 (no `/summary` handler yet).

- [ ] **Step 9: Add the endpoint**

In `DeviceController.java`, add the field and method (and imports `event_social_media.dto.device.DeviceSummaryDto`, `event_social_media.service.device.DeviceSummaryService`):

```java
    private final AdminDeviceService adminDeviceService;
    private final DeviceSummaryService deviceSummaryService;

    /** The widget's numbers. The phone polls every 15 minutes; the limit leaves room for manual refreshes. */
    @GetMapping("/summary")
    @RateLimit(name = "device.summary", limit = 30, windowSeconds = 60)
    public DeviceSummaryDto summary() {
        return deviceSummaryService.summary();
    }
```

- [ ] **Step 10: Run the device tests and see them pass**

```bash
./gradlew test --tests "event_social_media.controller.device.*" --tests "event_social_media.service.device.*"
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/main/java/event_social_media/repository/billing/RefundRequestRepository.java src/main/java/event_social_media/repository/feedback/BugReportRepository.java src/main/java/event_social_media/repository/feedback/ErrorEventRepository.java src/main/java/event_social_media/dto/device/DeviceSummaryDto.java src/main/java/event_social_media/service/device/DeviceSummaryService.java src/main/java/event_social_media/controller/device/DeviceController.java src/test/java/event_social_media/service/device/DeviceSummaryServiceTest.java src/test/java/event_social_media/controller/device/DeviceControllerTest.java
git commit -m "feat(devices): GET /api/device/summary for the admin phone widget"
```

## Task A6: Full Spring check

- [ ] **Step 1: Run the whole suite**

```bash
./gradlew test
```

Expected: BUILD SUCCESSFUL. Docker must be running for the Postgres tests; if it isn't, say which tests were skipped and why. Fix any failure before moving on; do not mark it done on a partial run.

- [ ] **Step 2: Write the integration note for the website**

Create `docs/fe-guides/admin-devices-fe-integration.md` in the Spring worktree (the repo keeps FE guides there; check `ls docs/fe-guides` and match the neighbours' format), covering: the three admin endpoints with request/response JSON, that the key appears only in the `POST` answer, the QR payload `{ "v": 1, "api": "<API base URL>", "key": "<key>" }`, and `GET /api/device/summary`'s JSON (copy `DeviceSummaryDto`'s shape). Commit it:

```bash
git add docs/fe-guides/admin-devices-fe-integration.md
git commit -m "docs(devices): FE integration guide for admin phones"
```

---

# Part B — Website (this worktree)

## Task B1: Types, endpoints, pairing payload

**Files:**
- Modify: `lib/api/types.ts` (next to `AdminSiteNoticeDto`)
- Modify: `lib/api/endpoints.ts` (inside `admin`, next to `siteNotices`)
- Create: `lib/adminDevices.ts`
- Test: `lib/adminDevices.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/adminDevices.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import { devicePairingPayload } from '@/lib/adminDevices';

const original = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = original;
});

describe('devicePairingPayload', () => {
    it('carries the version, the API address and the key', () => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';

        expect(JSON.parse(devicePairingPayload('k123'))).toEqual({ v: 1, api: 'https://api.example.test', key: 'k123' });
    });
});
```

- [ ] **Step 2: Run it and see it fail**

```bash
npx vitest run lib/adminDevices.test.ts
```

Expected: FAIL, cannot resolve `@/lib/adminDevices`.

- [ ] **Step 3: Write the helper**

`lib/adminDevices.ts`:

```ts
// Paired admin phones (spec 2026-10-28-admin-phone-widget-design).

export const ADMIN_DEVICE_NAME_MAX = 60;

export const ADMIN_DEVICE_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

// What the QR code holds. The phone talks to Spring at the same address the browser does.
export function devicePairingPayload(key: string): string {
    return JSON.stringify({ v: 1, api: process.env.NEXT_PUBLIC_API_BASE_URL ?? '', key });
}
```

- [ ] **Step 4: Add the types and endpoints**

`lib/api/types.ts`, after the `AdminSiteNoticeDto` block:

```ts
/** GET /api/admin/devices: the calling admin's paired phones. pushEnabled: the phone sent a Firebase token. */
export interface AdminDeviceDto {
    id: string;
    name: string;
    createdAt: string;
    lastSeenAt: string | null;
    pushEnabled: boolean;
}

/** POST /api/admin/devices: the only response that carries the key. */
export interface AdminDeviceCreatedDto {
    device: AdminDeviceDto;
    key: string;
}
```

`lib/api/endpoints.ts`, inside `admin` next to `siteNotices`:

```ts
        devices: {
            list: '/api/admin/devices',
            byId: (id: string) => `/api/admin/devices/${id}`,
        },
```

- [ ] **Step 5: Run the test and see it pass**

```bash
npx vitest run lib/adminDevices.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/adminDevices.ts lib/adminDevices.test.ts lib/api/types.ts lib/api/endpoints.ts
git commit -m "feat(admin-phones): device types, endpoints and QR payload"
```

## Task B2: Hooks

**Files:**
- Create: `hooks/useAdminDevices.ts`
- Create: `hooks/usePhonesPanel.ts`
- Create: `hooks/usePhoneCreateForm.ts`
- Create: `hooks/usePhoneRemoval.ts`

These are covered by the drawer tests in B4 and B5 (which mock only `useAdminDevices`), so this task has no test of its own.

- [ ] **Step 1: Data hook**

`hooks/useAdminDevices.ts`:

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDeviceCreatedDto, AdminDeviceDto } from '@/lib/api/types';

// The admin's paired phones (/api/admin/devices). Every write refetches the list.

export const adminDeviceKeys = {
    all: ['admin', 'devices'] as const,
};

export function useAdminDevices() {
    return useQuery({
        queryKey: adminDeviceKeys.all,
        queryFn: () => api.get<AdminDeviceDto[]>(endpoints.admin.devices.list),
    });
}

function useRefreshDevices() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminDeviceKeys.all });
    }, [queryClient]);
}

export function useCreateAdminDevice() {
    const refresh = useRefreshDevices();
    return useMutation({
        mutationFn: (input: { name: string }) => api.post<AdminDeviceCreatedDto>(endpoints.admin.devices.list, input),
        onSuccess: refresh,
    });
}

export function useRevokeAdminDevice() {
    const refresh = useRefreshDevices();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.devices.byId(id)),
        onSuccess: refresh,
    });
}
```

- [ ] **Step 2: Panel hook**

`hooks/usePhonesPanel.ts`:

```ts
'use client';

import { type MouseEvent, useCallback, useState } from 'react';

import { useAdminDevices } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

// token: which opening this is. Each drawer is keyed on it, so every opening starts clean and a
// pairing code never survives a close.
type CreateState = { open: boolean; token: number };
type DetailState = { open: boolean; device: AdminDeviceDto | null; token: number };

const NO_DEVICES: AdminDeviceDto[] = [];

export function usePhonesPanel() {
    const query = useAdminDevices();
    const devices = query.data ?? NO_DEVICES;
    const [create, setCreate] = useState<CreateState>({ open: false, token: 0 });
    const [detail, setDetail] = useState<DetailState>({ open: false, device: null, token: 0 });

    const handleAddClick = useCallback(() => setCreate((current) => ({ open: true, token: current.token + 1 })), []);
    const closeCreate = useCallback(() => setCreate((current) => ({ ...current, open: false })), []);

    const handleOpenClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = devices.find((device) => device.id === event.currentTarget.dataset.deviceId);
            if (found) setDetail((current) => ({ open: true, device: found, token: current.token + 1 }));
        },
        [devices],
    );
    const closeDetail = useCallback(() => setDetail((current) => ({ ...current, open: false })), []);

    return { query, devices, create, detail, handleAddClick, closeCreate, handleOpenClick, closeDetail };
}
```

- [ ] **Step 3: Create-form hook**

`hooks/usePhoneCreateForm.ts`:

```ts
'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateAdminDevice } from '@/hooks/useAdminDevices';
import { devicePairingPayload } from '@/lib/adminDevices';
import type { AdminDeviceCreatedDto } from '@/lib/api/types';

type Problem = 'name';

// Name → pair → the one-time QR payload. The key lives only in this state; the drawer remounts on
// every opening, so closing it drops the key for good.
export function usePhoneCreateForm() {
    const create = useCreateAdminDevice();
    const [name, setName] = useState('');
    const [showProblem, setShowProblem] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [created, setCreated] = useState<AdminDeviceCreatedDto | null>(null);

    const trimmed = name.trim();
    const problem: Problem | null = trimmed.length === 0 ? 'name' : null;

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        setName(event.target.value);
    }

    async function save() {
        if (problem) {
            setShowProblem(true);
            return;
        }
        setError(null);
        try {
            setCreated(await create.mutateAsync({ name: trimmed }));
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (create.isPending) return;
        void save();
    }

    return {
        name,
        handleNameChange,
        handleSubmit,
        busy: create.isPending,
        problem: showProblem ? problem : null,
        error,
        created,
        pairingPayload: created ? devicePairingPayload(created.key) : null,
    };
}
```

- [ ] **Step 4: Removal hook**

`hooks/usePhoneRemoval.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';

import { useRevokeAdminDevice } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

export function usePhoneRemoval(device: AdminDeviceDto | null, onDone: () => void) {
    const revoke = useRevokeAdminDevice();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const openConfirmation = useCallback(() => setConfirmOpen(true), []);
    const closeConfirmation = useCallback(() => setConfirmOpen(false), []);

    const confirmRemoval = useCallback(async () => {
        if (!device) return;
        setError(null);
        try {
            await revoke.mutateAsync(device.id);
            setConfirmOpen(false);
            onDone();
        } catch (caught) {
            setConfirmOpen(false);
            setError(caught);
        }
    }, [device, onDone, revoke]);

    return { confirmOpen, openConfirmation, closeConfirmation, confirmRemoval, removing: revoke.isPending, error };
}
```

- [ ] **Step 5: Type-check**

```bash
npm run type:check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAdminDevices.ts hooks/usePhonesPanel.ts hooks/usePhoneCreateForm.ts hooks/usePhoneRemoval.ts
git commit -m "feat(admin-phones): hooks for listing, pairing and removing phones"
```

## Task B3: Copy

**Files:**
- Modify: `messages/en.json` (`AdminPage.tabs` and a new `AdminPage.phones`)
- Modify: `messages/el.json` (same keys)

- [ ] **Step 1: English**

In `messages/en.json`, add `"phones": "Phones"` to `AdminPage.tabs`, and add this block inside `AdminPage` next to `siteNotices`:

```json
"phones": {
    "add": "Add phone",
    "empty": "No phones paired.",
    "createTitle": "Add phone",
    "create": "Create code",
    "done": "Done",
    "close": "Close",
    "open": "Open",
    "never": "Never",
    "scan": "Scan it with the StoryWall Admin app.",
    "shownOnce": "This code is shown only once.",
    "qrLabel": "Pairing code for {name}",
    "remove": "Remove phone",
    "removeTitle": "Remove this phone?",
    "removeBody": "It stops updating right away.",
    "removeConfirm": "Remove",
    "fields": { "name": "Name" },
    "columns": { "name": "Name", "paired": "Paired", "lastSeen": "Last seen", "notifications": "Notifications" },
    "push": { "on": "On", "off": "Off" },
    "problems": { "name": "Enter a name." }
}
```

- [ ] **Step 2: Greek**

In `messages/el.json`, add `"phones": "Κινητά"` to `AdminPage.tabs`, and the same block in Greek (polite plural, as the rest of the admin copy):

```json
"phones": {
    "add": "Προσθήκη κινητού",
    "empty": "Δεν υπάρχουν συνδεδεμένα κινητά.",
    "createTitle": "Προσθήκη κινητού",
    "create": "Δημιουργία κωδικού",
    "done": "Τέλος",
    "close": "Κλείσιμο",
    "open": "Άνοιγμα",
    "never": "Ποτέ",
    "scan": "Σαρώστε τον με την εφαρμογή StoryWall Admin.",
    "shownOnce": "Ο κωδικός εμφανίζεται μόνο μία φορά.",
    "qrLabel": "Κωδικός σύνδεσης για {name}",
    "remove": "Αφαίρεση κινητού",
    "removeTitle": "Αφαίρεση αυτού του κινητού;",
    "removeBody": "Σταματά να ενημερώνεται αμέσως.",
    "removeConfirm": "Αφαίρεση",
    "fields": { "name": "Όνομα" },
    "columns": { "name": "Όνομα", "paired": "Σύνδεση", "lastSeen": "Τελευταία χρήση", "notifications": "Ειδοποιήσεις" },
    "push": { "on": "Ενεργές", "off": "Ανενεργές" },
    "problems": { "name": "Γράψτε ένα όνομα." }
}
```

- [ ] **Step 3: Check both files parse and match**

```bash
node -e "const en=require('./messages/en.json').AdminPage.phones, el=require('./messages/el.json').AdminPage.phones; const keys=o=>JSON.stringify(Object.keys(o).sort()); if(keys(en)!==keys(el)) throw new Error('key mismatch'); console.log('ok')"
```

Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat(admin-phones): English and Greek copy for the Phones section"
```

## Task B4: Pairing drawer

**Files:**
- Create: `components/admin/phones/PhonePairingCode.tsx`
- Create: `components/admin/phones/PhoneCreateDrawer.tsx`
- Test: `components/admin/phones/PhoneCreateDrawer.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/admin/phones/PhoneCreateDrawer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneCreateDrawer } from '@/components/admin/phones/PhoneCreateDrawer';

const hooks = vi.hoisted(() => ({ create: vi.fn() }));

// Keys come back as-is, with any values after a colon.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children: ReactNode; footer: ReactNode }) =>
        open ? (
            <div data-testid="admin-drawer">
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminDevices', () => ({
    useCreateAdminDevice: () => ({ mutateAsync: hooks.create, isPending: false }),
}));

beforeEach(() => {
    hooks.create.mockReset().mockResolvedValue({
        device: { id: 'd1', name: 'Galaxy', createdAt: '2026-10-28T08:00:00Z', lastSeenAt: null, pushEnabled: false },
        key: 'secret-key',
    });
});
afterEach(cleanup);

describe('PhoneCreateDrawer', () => {
    it('does not pair without a name', () => {
        render(<PhoneCreateDrawer open onCloseAction={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('phones.fields.name'), { target: { value: '   ' } });
        fireEvent.click(screen.getByRole('button', { name: 'phones.create' }));

        expect(screen.getByText('phones.problems.name')).toBeInTheDocument();
        expect(hooks.create).not.toHaveBeenCalled();
    });

    it('pairs with the trimmed name and shows the code without printing the key', async () => {
        const onClose = vi.fn();
        render(<PhoneCreateDrawer open onCloseAction={onClose} />);
        fireEvent.change(screen.getByLabelText('phones.fields.name'), { target: { value: ' Galaxy ' } });
        fireEvent.click(screen.getByRole('button', { name: 'phones.create' }));

        await waitFor(() => expect(screen.getByRole('img', { name: 'qrLabel:Galaxy' })).toBeInTheDocument());
        expect(hooks.create).toHaveBeenCalledWith({ name: 'Galaxy' });
        expect(screen.queryByText('secret-key')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'phones.done' }));
        expect(onClose).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it and see it fail**

```bash
npx vitest run components/admin/phones/PhoneCreateDrawer.test.tsx
```

Expected: FAIL, cannot resolve `@/components/admin/phones/PhoneCreateDrawer`.

- [ ] **Step 3: Write the QR block**

`components/admin/phones/PhonePairingCode.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

// The one-time pairing code. The key stays inside the QR image and is never printed as text.
export function PhonePairingCode({ name, payload }: { name: string; payload: string }) {
    const t = useTranslations('AdminPage.phones');

    return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
            {/* Code */}
            <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={payload} size={224} marginSize={1} role="img" aria-label={t('qrLabel', { name })} />
            </div>

            {/* Instructions */}
            <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">{t('scan')}</p>
                <p className="text-sm text-ink-muted">{t('shownOnce')}</p>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Write the drawer**

`components/admin/phones/PhoneCreateDrawer.tsx`:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { PhonePairingCode } from '@/components/admin/phones/PhonePairingCode';
import { usePhoneCreateForm } from '@/hooks/usePhoneCreateForm';
import { ADMIN_DEVICE_NAME_MAX } from '@/lib/adminDevices';
import { adminErrorMessageKey } from '@/lib/adminUtils';

const FORM_ID = 'phone-create-form';

// Name the phone, then show its pairing code once. The panel remounts it (key) on every opening.
export function PhoneCreateDrawer({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = usePhoneCreateForm();

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={t('cancel')}
            closeDisabled={f.busy}
            title={t('phones.createTitle')}
            footer={
                <>
                    <div />

                    {/* Actions */}
                    {f.created ? (
                        <button type="button" onClick={onCloseAction} className="min-h-9 rounded-md bg-ink px-3.5 text-sm font-semibold text-white">
                            {t('phones.done')}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={f.busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form={FORM_ID}
                                disabled={f.busy}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {f.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('phones.create')}
                            </button>
                        </div>
                    )}
                </>
            }
        >
            {f.created && f.pairingPayload ? (
                <PhonePairingCode name={f.created.device.name} payload={f.pairingPayload} />
            ) : (
                <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Name */}
                    <AdminField label={t('phones.fields.name')} required>
                        <input
                            name="name"
                            aria-label={t('phones.fields.name')}
                            autoComplete="off"
                            className={adminInputClass()}
                            maxLength={ADMIN_DEVICE_NAME_MAX}
                            value={f.name}
                            onChange={f.handleNameChange}
                        />
                    </AdminField>

                    {/* Errors */}
                    {f.problem && <p className="text-sm text-status-danger">{t(`phones.problems.${f.problem}`)}</p>}
                    {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
                </form>
            )}
        </AdminDrawer>
    );
}
```

- [ ] **Step 5: Run the test and see it pass**

```bash
npx vitest run components/admin/phones/PhoneCreateDrawer.test.tsx
```

Expected: PASS (2 tests). If `getByRole('img', …)` misses the QR, check `qrcode.react` passes `role`/`aria-label` through to the `<svg>` (it spreads extra props in v4); do not drop the label.

- [ ] **Step 6: Commit**

```bash
git add components/admin/phones/PhonePairingCode.tsx components/admin/phones/PhoneCreateDrawer.tsx components/admin/phones/PhoneCreateDrawer.test.tsx
git commit -m "feat(admin-phones): pairing drawer with a one-time QR code"
```

## Task B5: List, details, removal

**Files:**
- Create: `components/admin/phones/PhonePushPill.tsx`
- Create: `components/admin/phones/PhonesTable.tsx`
- Create: `components/admin/phones/PhoneDetailDrawer.tsx`
- Create: `components/admin/phones/PhonesPanel.tsx`
- Test: `components/admin/phones/PhoneDetailDrawer.test.tsx`

- [ ] **Step 1: Write the failing removal test**

`components/admin/phones/PhoneDetailDrawer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneDetailDrawer } from '@/components/admin/phones/PhoneDetailDrawer';
import type { AdminDeviceDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ revoke: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children: ReactNode; footer: ReactNode }) =>
        open ? (
            <div data-testid="admin-drawer">
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({ open, title, confirmLabel, onConfirmAction }: { open: boolean; title: string; confirmLabel: string; onConfirmAction: () => void }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminDevices', () => ({
    useRevokeAdminDevice: () => ({ mutateAsync: hooks.revoke, isPending: false }),
}));

const device: AdminDeviceDto = { id: 'd1', name: 'Galaxy', createdAt: '2026-10-28T08:00:00Z', lastSeenAt: null, pushEnabled: true };

beforeEach(() => {
    hooks.revoke.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('PhoneDetailDrawer', () => {
    it('removes the phone only after confirmation', async () => {
        const onClose = vi.fn();
        render(<PhoneDetailDrawer open device={device} onCloseAction={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'phones.remove' }));
        expect(hooks.revoke).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'phones.removeConfirm' }));

        await waitFor(() => expect(hooks.revoke).toHaveBeenCalledWith('d1'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('shows when the phone was never used', () => {
        render(<PhoneDetailDrawer open device={device} onCloseAction={vi.fn()} />);

        expect(screen.getByText('phones.never')).toBeInTheDocument();
        expect(screen.getByText('on')).toBeInTheDocument();
    });
});
```

(`on` is the pill's key: `PhonePushPill` uses the `AdminPage.phones.push` namespace, and this mock returns bare keys.)

- [ ] **Step 2: Run it and see it fail**

```bash
npx vitest run components/admin/phones/PhoneDetailDrawer.test.tsx
```

Expected: FAIL, cannot resolve `@/components/admin/phones/PhoneDetailDrawer`.

- [ ] **Step 3: Write the pill**

`components/admin/phones/PhonePushPill.tsx`:

```tsx
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function PhonePushPill({ enabled }: { enabled: boolean }) {
    const t = useTranslations('AdminPage.phones.push');
    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold',
                enabled ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral',
            )}
        >
            {t(enabled ? 'on' : 'off')}
        </span>
    );
}
```

- [ ] **Step 4: Write the detail drawer**

`components/admin/phones/PhoneDetailDrawer.tsx`:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { PhonePushPill } from '@/components/admin/phones/PhonePushPill';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePhoneRemoval } from '@/hooks/usePhoneRemoval';
import { ADMIN_DEVICE_DATE_FORMAT } from '@/lib/adminDevices';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDeviceDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// One paired phone. Removing it lives here, behind a confirmation. The panel remounts it (key) on every opening.
export function PhoneDetailDrawer({ open, device, onCloseAction }: { open: boolean; device: AdminDeviceDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const r = usePhoneRemoval(device, onCloseAction);

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={r.removing}
                title={device?.name ?? ''}
                footer={
                    <>
                        {/* Danger */}
                        <div>
                            <button
                                type="button"
                                onClick={r.openConfirmation}
                                disabled={r.removing}
                                className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                            >
                                {t('phones.remove')}
                            </button>
                        </div>

                        {/* Actions */}
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={r.removing}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {t('phones.close')}
                        </button>
                    </>
                }
            >
                {/* Details */}
                {device && (
                    <dl className="divide-y divide-border rounded-lg border border-border text-sm">
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.paired')}</dt>
                            <dd className="font-mono text-xs text-ink">{formatDate(locale, device.createdAt, ADMIN_DEVICE_DATE_FORMAT)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.lastSeen')}</dt>
                            <dd className="font-mono text-xs text-ink">
                                {device.lastSeenAt ? formatDate(locale, device.lastSeenAt, ADMIN_DEVICE_DATE_FORMAT) : t('phones.never')}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.notifications')}</dt>
                            <dd>
                                <PhonePushPill enabled={device.pushEnabled} />
                            </dd>
                        </div>
                    </dl>
                )}

                {/* Errors */}
                {r.error !== null && <p className="mt-4 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(r.error)}`)}</p>}
            </AdminDrawer>

            <ConfirmActionModal
                open={r.confirmOpen}
                title={t('phones.removeTitle')}
                body={t('phones.removeBody')}
                confirmLabel={t('phones.removeConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={r.removing}
                onCloseAction={r.closeConfirmation}
                onConfirmAction={r.confirmRemoval}
                icon={r.removing ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
```

- [ ] **Step 5: Run the test and see it pass**

```bash
npx vitest run components/admin/phones/PhoneDetailDrawer.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 6: Write the table**

`components/admin/phones/PhonesTable.tsx`:

```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { PhonePushPill } from '@/components/admin/phones/PhonePushPill';
import { ADMIN_DEVICE_DATE_FORMAT } from '@/lib/adminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function PhonesTable({ devices, onOpenAction }: { devices: AdminDeviceDto[]; onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void }) {
    const t = useTranslations('AdminPage.phones');
    const locale = useLocale();

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-3 font-bold">{t('columns.name')}</th>
                        <th className="hidden px-3 py-3 font-bold md:table-cell">{t('columns.paired')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.lastSeen')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.notifications')}</th>
                        <th className="w-10 px-2 py-3" />
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {devices.map((device) => (
                        <tr key={device.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="w-full max-w-0 px-4 py-3">
                                <span className="block truncate font-semibold text-ink">{device.name}</span>
                            </td>
                            <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted md:table-cell">
                                {formatDate(locale, device.createdAt, ADMIN_DEVICE_DATE_FORMAT)}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted">
                                {device.lastSeenAt ? formatDate(locale, device.lastSeenAt, ADMIN_DEVICE_DATE_FORMAT) : t('never')}
                            </td>
                            <td className="px-3 py-3">
                                <PhonePushPill enabled={device.pushEnabled} />
                            </td>
                            <td className="px-2 py-3">
                                <button
                                    type="button"
                                    data-device-id={device.id}
                                    onClick={onOpenAction}
                                    aria-label={`${t('open')} ${device.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                >
                                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 7: Write the panel**

`components/admin/phones/PhonesPanel.tsx`:

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhoneCreateDrawer } from '@/components/admin/phones/PhoneCreateDrawer';
import { PhoneDetailDrawer } from '@/components/admin/phones/PhoneDetailDrawer';
import { PhonesTable } from '@/components/admin/phones/PhonesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePhonesPanel } from '@/hooks/usePhonesPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// The admin's paired phones (spec 2026-10-28-admin-phone-widget-design).
export function PhonesPanel() {
    const t = useTranslations('AdminPage');
    const { query, devices, create, detail, handleAddClick, closeCreate, handleOpenClick, closeDetail } = usePhonesPanel();

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleAddClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('phones.add')}
                </button>
            </div>

            {/* List */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {query.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {!query.isLoading && !query.error && devices.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('phones.empty')}</p>}
                {devices.length > 0 && <PhonesTable devices={devices} onOpenAction={handleOpenClick} />}
            </section>

            {/* Drawers */}
            <PhoneCreateDrawer key={`create-${create.token}`} open={create.open} onCloseAction={closeCreate} />
            <PhoneDetailDrawer key={`detail-${detail.token}`} open={detail.open} device={detail.device} onCloseAction={closeDetail} />
        </section>
    );
}
```

- [ ] **Step 8: Type-check**

```bash
npm run type:check
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add components/admin/phones
git commit -m "feat(admin-phones): phones table, details and removal"
```

## Task B6: The Phones tab

**Files:**
- Modify: `components/admin/AdminNavigationContext.tsx`
- Modify: `components/admin/AdminShellNav.tsx`
- Modify: `components/admin/AdminConsole.tsx`
- Test: `components/admin/AdminNavigationContext.phones.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/admin/AdminNavigationContext.phones.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Phones tab', () => {
    it('opens from #phones', () => {
        window.history.replaceState(null, '', '/admin#phones');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('phones:Phones:#phones')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it and see it fail**

```bash
npx vitest run components/admin/AdminNavigationContext.phones.test.tsx
```

Expected: FAIL. `#phones` falls back to `metrics`.

- [ ] **Step 3: Add the tab**

In `components/admin/AdminNavigationContext.tsx`:

1. Add `Smartphone` to the `lucide-react` import list (alphabetical, so just before `Smile`).
2. Add `| 'phones'` to the `AdminTab` union, after `| 'siteNotices'`.
3. Add `'#phones': 'phones',` to `HASH_TO_TAB`, after `'#site-notices': 'siteNotices',`.
4. Add `phones: '#phones',` to `TAB_TO_HASH`, after `siteNotices: '#site-notices',`.
5. Add the entry at the end of the `tabs` list, after `errorEvents`:

```ts
            { key: 'errorEvents', label: t('errorEvents'), icon: OctagonAlert },
            { key: 'phones', label: t('phones'), icon: Smartphone },
```

In `components/admin/AdminShellNav.tsx`, add to `TAB_GROUP` after `siteNotices: 'operations',`:

```ts
    phones: 'operations',
```

In `components/admin/AdminConsole.tsx`, import `PhonesPanel` (`import { PhonesPanel } from '@/components/admin/phones/PhonesPanel';`, keeping the import list sorted) and add after the `siteNotices` branch:

```tsx
    if (tab === 'phones') {
        return (
            <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                <PhonesPanel />
            </div>
        );
    }
```

- [ ] **Step 4: Run the tab test and the other navigation tests**

```bash
npx vitest run components/admin/AdminNavigationContext
```

Expected: PASS, the new test and every existing `AdminNavigationContext.*.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx components/admin/AdminNavigationContext.phones.test.tsx
git commit -m "feat(admin-phones): Phones section in the admin console"
```

## Task B7: Website checks

- [ ] **Step 1: Types, lint, tests**

```bash
npm run type:check
npm run lint
npm test
```

Expected: all clean. Fix every lint error before going on (project rule).

- [ ] **Step 2: Formatting**

```bash
npx prettier --check components/admin/phones hooks/useAdminDevices.ts hooks/usePhonesPanel.ts hooks/usePhoneCreateForm.ts hooks/usePhoneRemoval.ts lib/adminDevices.ts lib/adminDevices.test.ts messages/en.json messages/el.json
```

Expected: all files formatted. If not, run `npx prettier --write` on the same list and commit `style: prettier`.

- [ ] **Step 3: SEO check**

`docs/seo-guidelines.md` applies to routes. This adds no route (the Phones section lives behind `/admin#phones`, which is not indexed). Confirm that `/admin` is still `noindex` (`git grep -n "noindex\|robots" "app/(main)/(admin)"`) and record "no SEO blockers" in the PR description.

## Task C: See it working end to end

- [ ] **Step 1: Run Spring locally from the Spring worktree**

Start the Spring worktree's app the way the user runs it locally (see the project's `.run/` configs; `bootRun` does not load `.env`). It must listen on `:8080`, and its CORS only allows `:3000`.

- [ ] **Step 2: Run the website from this worktree on :3000**

Make sure nothing else is on `:3000`, then start this worktree's dev server there, and open it with `preview_start {url: "http://localhost:3000/"}`. Never `preview_start {name}` (it breaks the shared `.next`).

- [ ] **Step 3: Ask the user for the local admin test login, then check signed in**

At desktop width: Phones appears under Operations; Add phone → name → Create code shows the QR and no key text; Done closes it; the row shows Never / Off; open the row → Remove → confirmation → the row disappears. Then at mobile width (375px): the table keeps name, last seen and notifications readable with no overlap. Screenshot both.

- [ ] **Step 4: Prove the key works against the summary**

Pair once more, and from the QR payload (read it in the browser with the page's React state or by decoding the QR screenshot) call:

```bash
curl -s -H "Authorization: Device <key>" http://localhost:8080/api/device/summary
```

Expected: JSON with `attention`, `sales`, `growth`, `costs`. Then remove the phone in the console and repeat: expected `401`.

## Task D: Hand back

- [ ] **Step 1: Report** what was built, the test runs (with counts), the screenshots, and anything skipped (for example Docker-only tests). Do not push.
- [ ] **Step 2: Ask** whether to push both branches and open the two PRs into `staging` (Spring first, then the website). The website PR description lists "SEO: no blockers" and links the Spring PR.
