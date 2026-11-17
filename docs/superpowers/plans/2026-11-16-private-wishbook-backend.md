# Private Wishbook (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ticket:** KAN-217 (epic KAN-216). Spec: storywall `docs/superpowers/specs/2026-11-16-voice-wishes-design.md`, Part 1.

**Goal:** Only hosts and co-hosts can list and count an event's wishes; a member can list, edit and delete their own.

**Architecture:** All changes sit in `WishbookService` / `WishbookController` / `WishbookEntryRepository` in guestwall-be. Reads switch from `requireMember` to `requireHost` (which covers co-hosts, since they are `EventHost` rows). A new `/mine` read and a new `PUT` edit reuse the existing membership, availability and book-invalidation helpers. No migration.

**Tech Stack:** Spring Boot, Spring Data JPA, JUnit 5 (`@SpringBootTest @Transactional` with `TestFixtures`), MockMvc.

**Repo and branch:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be). Its main checkout is far behind and may be shared with other sessions — work in a new worktree:

```bash
cd /c/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add ../event_social_media-kan-217 -b claude/kan-217-private-wishbook origin/staging
cd ../event_social_media-kan-217
```

Copy this plan into the worktree as `docs/superpowers/plans/2026-11-16-private-wishbook-backend.md` and commit it with the first task. PR into `staging`, title `KAN-217: Wishbook readable by hosts only; guests list, edit and delete their own`.

Run tests with the project's Gradle wrapper (`./gradlew test --tests <Class>`). Tests need the local test Postgres the suite already uses.

---

## File map

- Modify `src/main/java/event_social_media/service/wishbook/WishbookService.java` — host-only reads, `findMine`, `edit`, class comment.
- Modify `src/main/java/event_social_media/controller/wishbook/WishbookController.java` — `GET /mine`, `PUT /api/wishbook/{entryId}`.
- Modify `src/main/java/event_social_media/repository/wishbook/WishbookEntryRepository.java` — `findMine` query.
- Create `src/main/java/event_social_media/dto/wishbook/WishbookEntryEditDto.java` — edit body.
- Modify `src/main/java/event_social_media/exception/ErrorCode.java` — `WISHBOOK_EDIT_NOT_AUTHOR(4041)`.
- Modify `src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java` — read rules flip, new tests.
- Create `src/test/java/event_social_media/controller/wishbook/WishbookControllerSecurityTest.java` — HTTP status checks.
- Modify `docs/fe-guides/wishlist-wishbook-cohost-fe-integration.md` — new endpoints and the 403.

Before Task 1, confirm 4041 is still free: `grep -n "(4041)" src/main/java/event_social_media/exception/ErrorCode.java` must print nothing. If taken, use the next free 40xx and use that number everywhere below.

---

### Task 1: Reading the list and the count is host-only

**Files:**
- Modify: `src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java`
- Modify: `src/main/java/event_social_media/service/wishbook/WishbookService.java`

- [ ] **Step 1: Flip the read tests**

In `WishbookServiceTest`, replace `everyMemberSeesEveryWish` with:

```java
    @Test
    void aGuestCannotReadTheWishbook() {
        // Wishes are for the hosts. A guest reading the list would see every other guest's words.
        wishbookService.create(event.getId(), wish("From the guest"), guest.getId());

        ForbiddenException ex = assertThrows(ForbiddenException.class, () -> read(guest.getId()));
        assertEquals(ErrorCode.NOT_EVENT_HOST, ex.getErrorCode());
    }

    @Test
    void aGuestCannotCountTheWishbook() {
        wishbookService.create(event.getId(), wish("From the guest"), guest.getId());

        assertThrows(ForbiddenException.class, () -> wishbookService.count(event.getId(), guest.getId()));
    }

    @Test
    void theHostSeesEveryWish() {
        wishbookService.create(event.getId(), wish("One"), guest.getId());
        User other = fixtures.newUser();
        fixtures.newMember(event, other, EventRole.ATTENDEE);
        wishbookService.create(event.getId(), wish("Two"), other.getId());

        assertEquals(2, read(host.getId()).getTotalElements());
        assertEquals(2, wishbookService.count(event.getId(), host.getId()));
    }

    @Test
    void aCoHostSeesEveryWish() {
        User coHost = fixtures.newUser();
        fixtures.newCoHost(event, coHost);
        wishbookService.create(event.getId(), wish("One"), guest.getId());

        assertEquals(1, read(coHost.getId()).getTotalElements());
    }
```

Add `import event_social_media.exception.ErrorCode;`. `TestFixtures.newCoHost(Event, User)` already exists.

Update the tests that read as a guest:
- `wishesComeBackNewestFirst`: change both `read(guest.getId())` calls to `read(host.getId())`.
- `canDeleteFlagsWhatTheCallerMayActuallyRemove`: delete it. It exists to check guests' `canDelete` on other guests' wishes, which they can no longer see. Task 2's `/mine` test covers the guest side.
- `aGuestCanReadButNotRemoveAWishWrittenByQr`: rename to `aGuestCannotRemoveAWishWrittenByQr` and drop the `read(...)` lines, keeping only the `assertThrows(ForbiddenException.class, () -> wishbookService.delete(id, guest.getId()))`.
- `highlighted_isShownToHostsOnly`: delete the second `assertEquals` (the one reading `findByEvent` as `guest`). Task 2 adds it back through `findMine`.

Update the class Javadoc at the top of the test to: `The wishbook — written wishes for the hosts. Only hosts and co-hosts read them; a guest sees their own.`

- [ ] **Step 2: Run them to see the new ones fail**

Run: `./gradlew test --tests "event_social_media.service.wishbook.WishbookServiceTest"`
Expected: `aGuestCannotReadTheWishbook` and `aGuestCannotCountTheWishbook` FAIL (no exception thrown). Everything else passes.

- [ ] **Step 3: Make reads host-only**

In `WishbookService.findByEvent`, replace the body after the `existsById` check with:

```java
        eventAuthorizationService.requireHost(eventId, callerUserId);
        moduleAvailabilityService.requireReadable(eventId, ModuleKey.WISHBOOK);
        EventMember caller = requireMember(eventId, callerUserId);

        return wishbookEntryRepository
                .findByEvent_IdAndDeletedAtIsNullOrderByCreatedAtDesc(eventId, pageable)
                .map(entry -> toResponseDto(entry, caller.getId(), true));
```

In `count`, replace `eventAuthorizationService.requireMember(eventId, callerUserId);` with `eventAuthorizationService.requireHost(eventId, callerUserId);`.

`requireHost` already throws `NOT_EVENT_MEMBER` for a non-member and `NOT_EVENT_HOST` for a plain member, and runs `refuseIfHidden`. `DemoSnapshotService` calls `findByEvent` with the demo's host user id, so it keeps working.

Replace the class Javadoc paragraph that starts `Everything here is visible to every member` with:

```java
 * <p>Wishes are for the hosts. Only hosts and co-hosts read the list and the count; a member reads
 * their own through {@link #findMine}, and may edit or delete those. A guest never sees another
 * guest's wish — the screen hid the list long before the API did, and the API is what counts.
```

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.wishbook.*" --tests "event_social_media.service.demo.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/wishbook/WishbookService.java src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java docs/superpowers/plans/2026-11-16-private-wishbook-backend.md
git commit -m "KAN-217: Only hosts and co-hosts read the wishbook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A member lists their own wishes

**Files:**
- Modify: `src/main/java/event_social_media/repository/wishbook/WishbookEntryRepository.java`
- Modify: `src/main/java/event_social_media/service/wishbook/WishbookService.java`
- Modify: `src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `WishbookServiceTest`, in the reading section:

```java
    private Page<WishbookEntryResponseDto> readMine(UUID callerId) {
        return wishbookService.findMine(event.getId(), PageRequest.of(0, 20), callerId);
    }

    @Test
    void aGuestSeesOnlyTheirOwnWishes() {
        UUID mine = wishbookService.create(event.getId(), wish("Mine"), guest.getId()).getId();
        User other = fixtures.newUser();
        fixtures.newMember(event, other, EventRole.ATTENDEE);
        wishbookService.create(event.getId(), wish("Theirs"), other.getId());
        anonymousWish("Maria", "By QR");

        List<WishbookEntryResponseDto> content = readMine(guest.getId()).getContent();

        assertEquals(1, content.size());
        assertEquals(mine, content.getFirst().getId());
        assertTrue(content.getFirst().getCanDelete());
        assertNull(content.getFirst().getHighlighted(), "the star is the hosts' business");
    }

    @Test
    void ownWishesComeBackNewestFirst() {
        UUID older = wishbookService.create(event.getId(), wish("Older"), guest.getId()).getId();
        backdateCreatedAt(older, OffsetDateTime.now().minusHours(1));
        wishbookService.create(event.getId(), wish("Newer"), guest.getId());

        List<String> messages = readMine(guest.getId()).getContent().stream()
                .map(WishbookEntryResponseDto::getMessage).toList();

        assertEquals(List.of("Newer", "Older"), messages);
    }

    @Test
    void aRemovedWishIsNotListedAsYourOwn() {
        UUID id = wishbookService.create(event.getId(), wish("Gone"), guest.getId()).getId();
        wishbookService.delete(id, guest.getId());

        assertEquals(0, readMine(guest.getId()).getTotalElements());
    }

    @Test
    void aNonMemberHasNoOwnWishes() {
        assertThrows(ForbiddenException.class, () -> readMine(fixtures.newUser().getId()));
    }
```

In `highlighted_isShownToHostsOnly`, add back the guest's side after the host assertion (the guest is the author, so the wish is in their own list):

```java
        assertEquals(null, readMine(guest.getId()).getContent().get(0).getHighlighted());
```
- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.wishbook.WishbookServiceTest"`
Expected: compile error, `findMine` does not exist.

- [ ] **Step 3: Add the repository query**

In `WishbookEntryRepository`, add:

```java
    /**
     * One member's own live wishes, newest first. Matched on the membership, or on the account the
     * wish remembers ({@code author_user_id}) so a wish written before the account was attached
     * still counts as theirs.
     */
    @Query(value = "select w from WishbookEntry w where w.event.id = :eventId and w.deletedAt is null"
            + " and (w.authorMember.id = :memberId or w.authorUserId = :userId)"
            + " order by w.createdAt desc, w.id desc",
            countQuery = "select count(w) from WishbookEntry w where w.event.id = :eventId and w.deletedAt is null"
                    + " and (w.authorMember.id = :memberId or w.authorUserId = :userId)")
    Page<WishbookEntry> findMine(@Param("eventId") UUID eventId, @Param("memberId") UUID memberId,
                                 @Param("userId") UUID userId, Pageable pageable);
```

- [ ] **Step 4: Add the service method**

In `WishbookService`, after `count`:

```java
    /**
     * The caller's own wishes, for the "Your messages" list a guest sees under the form. Readable
     * while the module is readable, like the hosts' list.
     */
    @Transactional(readOnly = true)
    public Page<WishbookEntryResponseDto> findMine(UUID eventId, Pageable pageable, UUID callerUserId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event", eventId);
        }
        EventMember caller = actingMemberResolver.actingMember(eventId, callerUserId)
                .orElseGet(() -> requireMember(eventId, callerUserId));
        moduleAvailabilityService.requireReadable(eventId, ModuleKey.WISHBOOK);
        boolean callerIsHost = eventHostRepository.existsByEvent_IdAndMember_Id(eventId, caller.getId());

        return wishbookEntryRepository.findMine(eventId, caller.getId(), callerUserId, pageable)
                .map(entry -> toResponseDto(entry, caller.getId(), callerIsHost));
    }
```

`actingMemberResolver` is used the same way `create` uses it, so a demo builder writing as a persona sees that persona's wishes.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.wishbook.WishbookServiceTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/repository/wishbook/WishbookEntryRepository.java src/main/java/event_social_media/service/wishbook/WishbookService.java src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java
git commit -m "KAN-217: A member lists their own wishes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The author edits their wish

**Files:**
- Create: `src/main/java/event_social_media/dto/wishbook/WishbookEntryEditDto.java`
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java`
- Modify: `src/main/java/event_social_media/service/wishbook/WishbookService.java`
- Modify: `src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `WishbookServiceTest`:

```java
    // ---------------------------------------------------------------- editing

    private WishbookEntryEditDto edit(String message) {
        WishbookEntryEditDto dto = new WishbookEntryEditDto();
        dto.setMessage(message);
        return dto;
    }

    @Test
    void anAuthorCanEditTheirWish() {
        UUID id = wishbookService.create(event.getId(), wish("Frist draft"), guest.getId()).getId();

        WishbookEntryResponseDto edited = wishbookService.edit(id, edit("  First draft  "), guest.getId());

        assertEquals("First draft", edited.getMessage());
        reloadFromDatabase();
        assertEquals("First draft", wishbookEntryRepository.findById(id).orElseThrow().getMessage());
    }

    @Test
    void anotherGuestCannotEditAWish() {
        UUID id = wishbookService.create(event.getId(), wish("Mine"), guest.getId()).getId();
        User other = fixtures.newUser();
        fixtures.newMember(event, other, EventRole.ATTENDEE);

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> wishbookService.edit(id, edit("Hijacked"), other.getId()));
        assertEquals(ErrorCode.WISHBOOK_EDIT_NOT_AUTHOR, ex.getErrorCode());
    }

    @Test
    void aHostCannotEditAGuestsWords() {
        UUID id = wishbookService.create(event.getId(), wish("Mine"), guest.getId()).getId();

        assertThrows(ForbiddenException.class, () -> wishbookService.edit(id, edit("Tidied"), host.getId()));
    }

    @Test
    void nobodyCanEditAWishWrittenByQr() {
        UUID id = anonymousWish("Maria", "Hello");

        assertThrows(ForbiddenException.class, () -> wishbookService.edit(id, edit("Hi"), host.getId()));
        assertThrows(ForbiddenException.class, () -> wishbookService.edit(id, edit("Hi"), guest.getId()));
    }

    @Test
    void editingIsRefusedWhenTheEventIsNotActive() {
        UUID id = wishbookService.create(event.getId(), wish("Mine"), guest.getId()).getId();
        event.setStatus(EventStatus.DRAFT);
        eventRepository.saveAndFlush(event);

        assertThrows(RuntimeException.class, () -> wishbookService.edit(id, edit("Later"), guest.getId()));
    }

    @Test
    void aRemovedWishCannotBeEdited() {
        UUID id = wishbookService.create(event.getId(), wish("Gone"), guest.getId()).getId();
        wishbookService.delete(id, guest.getId());

        assertThrows(ResourceNotFoundException.class, () -> wishbookService.edit(id, edit("Back"), guest.getId()));
    }

    @Test
    void editingKeepsTheStar_andFailsTheBook() {
        UUID id = wishbookService.create(event.getId(), wish("Lovely"), guest.getId()).getId();
        wishbookService.setHighlighted(id, host.getId(), true);
        readyBook();

        wishbookService.edit(id, edit("Lovelier"), guest.getId());

        assertBookInvalidated();
        assertNotNull(wishbookEntryRepository.findById(id).orElseThrow().getHighlightedAt());
    }

    @Test
    void anEditThatChangesNothing_leavesTheBookAlone() {
        UUID id = wishbookService.create(event.getId(), wish("Same"), guest.getId()).getId();
        readyBook();

        wishbookService.edit(id, edit("Same"), guest.getId());

        reloadFromDatabase();
        assertEquals(WishbookBookStatus.READY, bookRepository.findByEventId(event.getId()).orElseThrow().getStatus());
    }
```

The `DRAFT` + `RuntimeException` pattern matches the existing `writingIsRefusedWhenTheEventIsNotActive`. Add `import event_social_media.dto.wishbook.WishbookEntryEditDto;`.

- [ ] **Step 2: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.wishbook.WishbookServiceTest"`
Expected: compile error, `WishbookEntryEditDto` and `edit` do not exist.

- [ ] **Step 3: Add the DTO and the error code**

Create `src/main/java/event_social_media/dto/wishbook/WishbookEntryEditDto.java`:

```java
package event_social_media.dto.wishbook;

import event_social_media.constants.TextLimits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The author changing what their wish says. Only the message: the signature was settled when it
 * was written, and the event is in the path.
 */
@Getter
@Setter
public class WishbookEntryEditDto {

    @NotBlank
    @Size(max = TextLimits.WISHBOOK_MESSAGE_MAX)
    private String message;
}
```
In `ErrorCode.java`, after the highest 40xx entry:

```java
    /**
     * 4041 — Only a wish's author may change its text ({@code PUT /api/wishbook/{id}}). Hosts can
     * still star or delete it. {@code 403}.
     */
    WISHBOOK_EDIT_NOT_AUTHOR(4041),
```

- [ ] **Step 4: Add the service method**

In `WishbookService`, after `createAnonymous`:

```java
    /**
     * The author changes their wish's text. Only the author — a host can delete a guest's words but
     * not rewrite them — and only while the wishbook takes writes, like writing does.
     *
     * <p>The star stays. A stored book holds the old text, so a real change fails it, as a removal
     * does; an edit that changes nothing leaves it alone.
     */
    @Transactional
    public WishbookEntryResponseDto edit(UUID entryId, WishbookEntryEditDto dto, UUID callerUserId) {
        WishbookEntry entry = wishbookEntryRepository.findByIdAndDeletedAtIsNull(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("WishbookEntry", entryId));
        UUID eventId = entry.getEvent().getId();
        EventMember member = actingMemberResolver.actingMember(eventId, callerUserId)
                .orElseGet(() -> requireMember(eventId, callerUserId));
        if (!isAuthoredBy(entry, member.getId())) {
            log.warn("Refused edit of wish {} on event {}: caller {} is not its author", entryId, eventId, callerUserId);
            throw new ForbiddenException(ErrorCode.WISHBOOK_EDIT_NOT_AUTHOR, "Only the author can edit this wish");
        }
        moduleAvailabilityService.requireAvailable(eventId, ModuleKey.WISHBOOK);

        String message = dto.getMessage().trim();
        if (!message.equals(entry.getMessage())) {
            bookInvalidator.invalidate(eventId);
            entry.setMessage(message);
            entry = wishbookEntryRepository.save(entry);
            log.info("Member {} edited wish {} on event {}", member.getId(), entryId, eventId);
        }
        return toResponseDto(entry, member.getId(),
                eventHostRepository.existsByEvent_IdAndMember_Id(eventId, member.getId()));
    }
```

Invalidate before saving, as `remove` does, so the event row is locked before the wish row is written.

`isAuthoredBy` compares membership ids. A wish whose author was matched only by `authorUserId` (in `findMine`) but has a null `authorMember` can't be edited; that case only arises after the membership is gone, when the caller would fail `requireMember` anyway.

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests "event_social_media.service.wishbook.WishbookServiceTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/wishbook/WishbookEntryEditDto.java src/main/java/event_social_media/exception/ErrorCode.java src/main/java/event_social_media/service/wishbook/WishbookService.java src/test/java/event_social_media/service/wishbook/WishbookServiceTest.java
git commit -m "KAN-217: The author edits their wish

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Endpoints

**Files:**
- Modify: `src/main/java/event_social_media/controller/wishbook/WishbookController.java`
- Create: `src/test/java/event_social_media/controller/wishbook/WishbookControllerSecurityTest.java`

- [ ] **Step 1: Write the failing controller test**

Create `WishbookControllerSecurityTest.java`:

```java
package event_social_media.controller.wishbook;

import event_social_media.model.event.Event;
import event_social_media.model.event.EventRole;
import event_social_media.model.user.User;
import event_social_media.repository.event.EventModuleRepository;
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
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Who may read and change wishes, over HTTP. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WishbookControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private EventModuleRepository eventModuleRepository;
    @Autowired
    private TestFixtures fixtures;

    private User host;
    private User guest;
    private User otherGuest;
    private Event event;
    private UUID guestWishId;

    private static UsernamePasswordAuthenticationToken userToken(UUID userId) {
        return new UsernamePasswordAuthenticationToken(
                userId.toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        guest = fixtures.newUser();
        otherGuest = fixtures.newUser();
        event = fixtures.newEventHostedBy(host);
        fixtures.seedModules(event, eventModuleRepository);
        guestWishId = fixtures.newWishbookEntry(event, fixtures.newMember(event, guest, EventRole.ATTENDEE)).getId();
        fixtures.newMember(event, otherGuest, EventRole.ATTENDEE);
    }

    @Test
    void list_guest_403() throws Exception {
        mockMvc.perform(get("/api/events/{id}/wishbook", event.getId()).with(authentication(userToken(guest.getId()))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(4025));
    }

    @Test
    void count_guest_403() throws Exception {
        mockMvc.perform(get("/api/events/{id}/wishbook/count", event.getId()).with(authentication(userToken(guest.getId()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void list_host_200() throws Exception {
        mockMvc.perform(get("/api/events/{id}/wishbook", event.getId()).with(authentication(userToken(host.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void mine_guest_seesOwn() throws Exception {
        mockMvc.perform(get("/api/events/{id}/wishbook/mine", event.getId()).with(authentication(userToken(guest.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(guestWishId.toString()));
    }

    @Test
    void mine_otherGuest_seesNothing() throws Exception {
        mockMvc.perform(get("/api/events/{id}/wishbook/mine", event.getId()).with(authentication(userToken(otherGuest.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    void mine_unauthenticated_401() throws Exception {
        mockMvc.perform(get("/api/events/{id}/wishbook/mine", event.getId())).andExpect(status().isUnauthorized());
    }

    @Test
    void edit_author_200() throws Exception {
        mockMvc.perform(put("/api/wishbook/{id}", guestWishId)
                        .with(authentication(userToken(guest.getId())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Updated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Updated"));
    }

    @Test
    void edit_otherGuest_403() throws Exception {
        mockMvc.perform(put("/api/wishbook/{id}", guestWishId)
                        .with(authentication(userToken(otherGuest.getId())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Mine now\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value(4041));
    }

    @Test
    void edit_blank_400() throws Exception {
        mockMvc.perform(put("/api/wishbook/{id}", guestWishId)
                        .with(authentication(userToken(guest.getId())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void edit_unauthenticated_401() throws Exception {
        mockMvc.perform(put("/api/wishbook/{id}", guestWishId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run it to see the new endpoints fail**

Run: `./gradlew test --tests "event_social_media.controller.wishbook.WishbookControllerSecurityTest"`
Expected: `list_guest_403`, `count_guest_403` and `list_host_200` PASS (Task 1). The `mine_*` and `edit_*` tests FAIL with 404/405.

- [ ] **Step 3: Add the endpoints**

In `WishbookController`, add `import event_social_media.dto.wishbook.WishbookEntryEditDto;` and, after `count`:

```java
    /** The caller's own wishes. Hosts and co-hosts read everyone's through {@link #findByEvent}. */
    @GetMapping("/api/events/{eventId}/wishbook/mine")
    @PreAuthorize("isAuthenticated()")
    public Page<WishbookEntryResponseDto> findMine(
            @PathVariable UUID eventId,
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {
        return wishbookService.findMine(eventId, pageable, callerId(authentication));
    }
```

and, after `delete`:

```java
    @PutMapping("/api/wishbook/{entryId}")
    @PreAuthorize("isAuthenticated()")
    @RateLimit(name = "wishbook.write", limit = 20, windowSeconds = 60)
    public WishbookEntryResponseDto edit(@PathVariable UUID entryId,
                                         @Valid @RequestBody WishbookEntryEditDto dto,
                                         Authentication authentication) {
        return wishbookService.edit(entryId, dto, callerId(authentication));
    }
```

Spring matches the literal `/wishbook/mine` and `/wishbook/count` before any pattern, and there is no `/wishbook/{x}` GET under events, so there is no route clash. `PUT /api/wishbook/{entryId}` and `PUT /api/wishbook/{entryId}/highlight` are different paths.

Update the controller Javadoc's first line to `Written wishes guests leave for the hosts. Hosts and co-hosts read them all; a guest reads, edits and deletes their own.`

- [ ] **Step 4: Run the controller tests and the wishbook suite**

Run: `./gradlew test --tests "event_social_media.controller.wishbook.*" --tests "event_social_media.service.wishbook.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/controller/wishbook/WishbookController.java src/test/java/event_social_media/controller/wishbook/WishbookControllerSecurityTest.java
git commit -m "KAN-217: Endpoints for own wishes and editing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Guide for the frontend, full suite

**Files:**
- Modify: `docs/fe-guides/wishlist-wishbook-cohost-fe-integration.md`

- [ ] **Step 1: Update the guide**

In the wishbook section of `docs/fe-guides/wishlist-wishbook-cohost-fe-integration.md`, replace any statement that members read all wishes, and add:

````markdown
### Who reads what (2026-11-16, KAN-217)

- `GET /api/events/{eventId}/wishbook` and `GET /api/events/{eventId}/wishbook/count` — hosts and co-hosts only.
  Anyone else gets `403` (`4025 NOT_EVENT_HOST`, or `4024 NOT_EVENT_MEMBER` for a non-member). Don't call them for guests.
- `GET /api/events/{eventId}/wishbook/mine?page=0&size=20` — the caller's own live wishes, newest first.
  `Page<WishbookEntryResponseDto>`, same shape as the hosts' list. `canDelete` is `true`; `highlighted` is `null` for guests.
- `PUT /api/wishbook/{entryId}` with `{ "message": string }` (1–2000 chars after trimming) — the author only, while the
  event is `ACTIVE`. Returns the updated `WishbookEntryResponseDto`. Not the author → `403` `4041 WISHBOOK_EDIT_NOT_AUTHOR`.
  Keeps the host's star. A real change marks a built book `FAILED` with `CONTENT_CHANGED`.

```ts
interface WishbookEntryEditDto {
    message: string;
}
```
````

- [ ] **Step 2: Run the full backend suite**

Run: `./gradlew test`
Expected: PASS. If an unrelated test fails, re-run it alone to check whether it fails on `origin/staging` too, and say so in the PR rather than changing it here.

- [ ] **Step 3: Commit and open the PR**

```bash
git add docs/fe-guides/wishlist-wishbook-cohost-fe-integration.md
git commit -m "KAN-217: FE guide for host-only reads, own wishes and editing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin claude/kan-217-private-wishbook
```

Open the PR into `staging` titled `KAN-217: Wishbook readable by hosts only; guests list, edit and delete their own`. Name only KAN-217 in the body. Note in the body that the frontend PR (KAN-218) must ship right after: until it does, the current frontend's guest view gets a 403 from the list call it makes in the background (the list is already hidden from guests, so they see no change, but the request fails).
