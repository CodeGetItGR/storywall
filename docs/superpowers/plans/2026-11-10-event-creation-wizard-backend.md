# Event Creation Wizard (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the create wizard show plans to visitors who aren't signed in, and confirm a new account's email with a 6-digit code typed inside the wizard.

**Architecture:** `GET /api/plan-tiers` joins the public routes. A new `email_verification_codes` table, `EmailCodeService` and `EmailCodeController` copy the account deletion code (`AccountDeletionOtpService`, V141): the code is stored hashed, lasts 10 minutes and locks after 5 wrong tries. Verifying by code goes through the same `markVerified` step as the mailed link, so the newsletter confirmation and the welcome email still happen. `POST /api/auth/register` gets an optional `emailVerification: "CODE"`.

**Tech Stack:** Spring Boot 3.3, Spring Security 6 (JWT), JPA/Hibernate, Flyway (Postgres), JUnit 5 + MockMvc on H2.

**Spec:** `docs/superpowers/specs/2026-11-10-event-creation-wizard-design.md` in the storywall repo, section 7. Jira epic: KAN-197.

---

## Before you start

- Repo: `C:\Users\User\IdeaProjects\event_social_media` (GitHub `CodeGetItGR/guestwall-be`). Its `CLAUDE.md` applies: branch from the latest `staging`, PR into `staging`.
- The main checkout's local `staging` was 187 commits behind `origin/staging` on 2026-11-10. Always branch from `origin/staging`, never the local branch:

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git worktree add .claude/worktrees/kan-197-email-code -b claude/kan-197-email-code origin/staging
cd .claude/worktrees/kan-197-email-code
```

- **Numbers to re-check right before using them.** On 2026-11-10, `origin/staging` ended at migration `V217`, error code `3122` and conflict code `5223`. The unmerged campaign branches (`claude/kan-188-campaign-writes`) take `V218`–`V220`, `3123` and up to `5226`. This plan uses **`V221`**, **`3124`–`3127`** and **`5227`**. Before Task 2 and Task 3, run:

```bash
git fetch origin
git ls-tree -r --name-only origin/staging -- src/main/resources/db/migration | grep -oE 'V[0-9]+' | sort -t V -k1.2 -n | tail -1
for b in origin/staging $(git for-each-ref --format='%(refname:short)' refs/heads/claude); do git show $b:src/main/java/event_social_media/exception/ErrorCode.java 2>/dev/null | grep -oE '\((3|5)[0-9]{3}\)' | sort | tail -2 | tr '\n' ' '; echo " $b"; done | sort | tail -5
```

If any number above is taken, use the next free one everywhere it appears in this plan (migration file name, `ErrorCode` values, test assertions).

- Run single tests with `./gradlew test --tests '<FullyQualifiedClass>'`. Tests run on H2 with `ddl-auto=create`; Flyway is off in tests, so the entity defines the test schema and the migration is checked only by `./gradlew build` against Postgres in CI/staging.
- Every commit message starts with `KAN-197:` and ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name.

## Files

| File | Change |
|---|---|
| `src/main/java/event_social_media/config/SecurityConfig.java` | `GET /api/plan-tiers` public; `/api/auth/email-code/**` requires a token |
| `src/main/java/event_social_media/controller/platform/PlanTierController.java` | Doc comment: now public |
| `src/main/java/event_social_media/exception/ErrorCode.java` | 5 new codes |
| `src/main/resources/db/migration/V221__email_verification_codes.sql` | New table |
| `src/main/java/event_social_media/model/user/EmailVerificationCode.java` | New entity |
| `src/main/java/event_social_media/repository/user/EmailVerificationCodeRepository.java` | New repository |
| `src/main/resources/i18n/messages.properties`, `messages_el.properties` | Code email subject and body |
| `src/main/java/event_social_media/service/mail/TransactionalMailService.java` | `sendEmailVerificationCode` |
| `src/main/java/event_social_media/service/auth/EmailVerificationService.java` | Extract `markVerified` |
| `src/main/java/event_social_media/service/auth/EmailCodeService.java` | New: send, verify, change email |
| `src/main/java/event_social_media/service/auth/EmailCodeAttemptRecorder.java` | New: counts a wrong guess in its own transaction |
| `src/main/java/event_social_media/dto/auth/EmailVerificationMethod.java` | New enum `LINK`, `CODE` |
| `src/main/java/event_social_media/dto/auth/RegisterRequestDto.java` | `emailVerification` field |
| `src/main/java/event_social_media/service/auth/AuthService.java` | Send a code instead of a link when asked |
| `src/main/java/event_social_media/dto/auth/EmailCodeVerifyRequestDto.java` | New |
| `src/main/java/event_social_media/dto/auth/EmailCodeChangeEmailRequestDto.java` | New |
| `src/main/java/event_social_media/controller/auth/EmailCodeController.java` | New: the three routes |
| Tests | `PlanTierControllerTest` (extend), `EmailCodeServiceTest`, `EmailCodeControllerTest`, `EmailCodeControllerRateLimitTest`, `AuthControllerRegisterEmailCodeTest` |

Changing the email reuses what the admin email change (`UserService.update` → `onEmailChanged`) already does: retire mailed links with `UserTokenService.retireOutstanding` and move the newsletter signup with `NewsletterSubscriptionService.followAccountEmailChange`, which already handles a taken address and keeps the reward on its row. No newsletter code changes.

---

### Task 1: Plans are public

**Files:**
- Modify: `src/main/java/event_social_media/config/SecurityConfig.java` (next to the `/api/theme-presets` rule)
- Modify: `src/main/java/event_social_media/controller/platform/PlanTierController.java` (class Javadoc)
- Test: `src/test/java/event_social_media/controller/platform/PlanTierControllerTest.java`

- [ ] **Step 1: Write the failing test**

Add to `PlanTierControllerTest` (no `@WithMockUser`, so the call has no session):

```java
    @Test
    void aVisitorWithNoAccount_canReadThePlans() throws Exception {
        // The create wizard shows plans before the visitor signs up.
        mockMvc.perform(get("/api/plan-tiers").param("eventType", "WEDDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code=='BASIC')]").exists());
    }
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests 'event_social_media.controller.platform.PlanTierControllerTest'`
Expected: `aVisitorWithNoAccount_canReadThePlans` FAILS with status 401.

- [ ] **Step 3: Make the route public**

In `SecurityConfig.filterChain`, right after the `/api/theme-presets` rule, add:

```java
                        // The plans a host picks from in the create wizard, which visitors start before
                        // signing up. Only the public catalog /api/config already serves, narrowed by type.
                        .requestMatchers(HttpMethod.GET, "/api/plan-tiers").permitAll()
```

In `PlanTierController`'s class Javadoc, replace the paragraph that starts `<p>Authenticated rather than {@code permitAll}` with:

```java
 * <p>Public ({@code permitAll} in SecurityConfig): the create wizard shows plans to visitors before
 * they sign up. It returns only public, assignable plans, the catalog {@code GET /api/config}
 * already exposes.
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `./gradlew test --tests 'event_social_media.controller.platform.PlanTierControllerTest'`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/config/SecurityConfig.java src/main/java/event_social_media/controller/platform/PlanTierController.java src/test/java/event_social_media/controller/platform/PlanTierControllerTest.java
git commit -m "KAN-197: make the plan list public for the create wizard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Error codes

**Files:**
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java`

- [ ] **Step 1: Add the 3xxx codes**

After `DISCOUNT_CAMPAIGN_INVALID(3122),` (and after any 3xxx code a newer branch added; see "Before you start"), add:

```java

    /** 3124 — No email code is waiting for this account. Send one with {@code POST /api/auth/email-code}. {@code 400}. */
    EMAIL_CODE_NOT_REQUESTED(3124),

    /** 3125 — The email code expired (10 minutes). Send a new one. {@code 400}. */
    EMAIL_CODE_EXPIRED(3125),

    /** 3126 — Five wrong guesses against the email code. Send a new one. {@code 400}. */
    EMAIL_CODE_TOO_MANY_ATTEMPTS(3126),

    /** 3127 — The email code is wrong. The caller may try again until 3126. {@code 400}. */
    EMAIL_CODE_INVALID(3127),
```

- [ ] **Step 2: Add the 5xxx code**

After the last `5xxx` constant (5223 on `origin/staging` today), add:

```java

    /**
     * 5227 — The account's email is already verified, so the create wizard can't change it.
     * {@code PUT /api/auth/email-code/email}. {@code 409}.
     */
    EMAIL_ALREADY_VERIFIED(5227),
```

Keep the separator punctuation of the surrounding constants (comma after every constant except the last one in the enum, which ends with `;`).

- [ ] **Step 3: Compile**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/event_social_media/exception/ErrorCode.java
git commit -m "KAN-197: error codes for the email code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The code table, entity and repository

**Files:**
- Create: `src/main/resources/db/migration/V221__email_verification_codes.sql`
- Create: `src/main/java/event_social_media/model/user/EmailVerificationCode.java`
- Create: `src/main/java/event_social_media/repository/user/EmailVerificationCodeRepository.java`

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================
-- EMAIL VERIFICATION CODES
--
-- The create wizard confirms a new account's address with a 6-digit code typed
-- back into the wizard, instead of a mailed link that opens a new tab and loses
-- the wizard's place. The link flow (user_tokens, V39) keeps working.
--
-- Same shape and limits as account_deletion_otps (V141): only the SHA-256 hash
-- of the code is stored, a code lives 10 minutes, and attempt_count caps
-- guesses at 5.
-- =====================================================

CREATE TABLE email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    code_hash VARCHAR(64) NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempt_count INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_codes_user ON email_verification_codes (user_id);

COMMENT ON COLUMN email_verification_codes.code_hash IS
    'Base64-encoded SHA-256 of the mailed 6-digit code. The raw value is never stored.';
COMMENT ON COLUMN email_verification_codes.attempt_count IS
    'Wrong guesses against this row. The fifth locks it, forcing a fresh code.';
```

- [ ] **Step 2: Write the entity**

```java
package event_social_media.model.user;

import event_social_media.model.base.Auditable;
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
 * A mailed 6-digit code confirming the account's own address inside the create wizard. Shaped like
 * {@link AccountDeletionOtp}; see V221.
 */
@Getter
@Setter
@Entity
@Table(name = "email_verification_codes",
        indexes = {@Index(name = "idx_email_verification_codes_user", columnList = "user_id")})
public class EmailVerificationCode extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Size(max = 64)
    @NotNull
    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @NotNull
    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "consumed_at")
    private OffsetDateTime consumedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;
}
```

- [ ] **Step 3: Write the repository**

```java
package event_social_media.repository.user;

import event_social_media.model.user.EmailVerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, UUID> {

    /** The one outstanding (not-yet-consumed) code for this user, if any. */
    Optional<EmailVerificationCode> findByUser_IdAndConsumedAtIsNull(UUID userId);

    /** Retires every outstanding code for one user. Called before issuing a new one. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EmailVerificationCode c set c.consumedAt = :now where c.user.id = :userId and c.consumedAt is null")
    int consumeOutstanding(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);

    /** One more failed attempt, as a single UPDATE; see {@code EmailCodeAttemptRecorder}. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EmailVerificationCode c set c.attemptCount = c.attemptCount + 1 where c.id = :id")
    int incrementAttemptCount(@Param("id") UUID id);
}
```

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V221__email_verification_codes.sql src/main/java/event_social_media/model/user/EmailVerificationCode.java src/main/java/event_social_media/repository/user/EmailVerificationCodeRepository.java
git commit -m "KAN-197: table for email verification codes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The code email

The wording is approved (rows 66 and 67 of the wording file). `{minutes}` renders as `10`, so the email reads exactly as approved.

**Files:**
- Modify: `src/main/resources/i18n/messages.properties` (after the `email.account_deletion_otp.*` lines)
- Modify: `src/main/resources/i18n/messages_el.properties` (same place)
- Modify: `src/main/java/event_social_media/service/mail/TransactionalMailService.java` (after `sendAccountDeletionOtp`)

- [ ] **Step 1: Add the English strings**

```properties
email.verification_code.subject=Your StoryWall code: {code}
email.verification_code.body=Your code is {code}. It expires in {minutes} minutes. If you didn't ask for it, you can ignore this email.
```

- [ ] **Step 2: Add the Greek strings**

```properties
email.verification_code.subject=Ο κωδικός σας για το StoryWall: {code}
email.verification_code.body=Ο κωδικός σας είναι {code}. Λήγει σε {minutes} λεπτά. Αν δεν τον ζητήσατε, αγνοήστε αυτό το email.
```

The file is UTF-8 (`spring.messages.encoding=UTF-8`); write the Greek as is, not as `\u` escapes.

- [ ] **Step 3: Add the send method**

```java
    /**
     * Carries the 6-digit code that confirms a new account's address inside the create wizard. No
     * CTA, like the deletion codes: the reader types the code back into the page they're on. No
     * greeting by name either, per the approved wording.
     */
    public void sendEmailVerificationCode(String toAddress, String code, int validMinutes, Locale locale) {
        Map<String, Object> args = new HashMap<>();
        args.put("code", code);
        args.put("minutes", validMinutes);
        String subject = messageRenderer.render("email.verification_code.subject", args, locale);
        deliver(layout.compose(
                toAddress,
                subject,
                subject,
                messageRenderer.render("email.verification_code.body", args, locale),
                List.of(),
                null,
                null),
                "email verification code");
    }
```

`HashMap`, `Map`, `List` and `Locale` are already imported in this file (`greetingArgs` uses `HashMap`). The email is checked end to end in Task 9.

- [ ] **Step 4: Compile and run the message tests**

Run: `./gradlew compileJava && ./gradlew test --tests '*Message*'`
Expected: BUILD SUCCESSFUL; any key-parity test between the two bundles PASSES.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/i18n/messages.properties src/main/resources/i18n/messages_el.properties src/main/java/event_social_media/service/mail/TransactionalMailService.java
git commit -m "KAN-197: email with the 6-digit verification code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: One "mark verified" step for link and code

**Files:**
- Modify: `src/main/java/event_social_media/service/auth/EmailVerificationService.java`
- Test: `src/test/java/event_social_media/service/auth/EmailVerificationServiceTest.java` (existing, unchanged)

- [ ] **Step 1: Run the existing tests first**

Run: `./gradlew test --tests 'event_social_media.service.auth.EmailVerificationServiceTest'`
Expected: PASS. This is the safety net for the refactor.

- [ ] **Step 2: Extract the method**

In `verify(...)`, replace everything from `user.setEmailVerifiedAt(OffsetDateTime.now());` to the end of the method with:

```java
        markVerified(user, consentIp, consentUserAgent);
        return true;
    }

    /**
     * Records that the account's address is proven, by a mailed link or by a code typed into the
     * create wizard, and does what follows from that: confirms a newsletter subscription taken at
     * registration and sends the welcome email. The caller has checked it isn't verified yet.
     *
     * <p>The IP and User-Agent are the consent record for a REGISTRATION newsletter signup: this is
     * the moment consent is given.
     */
    @Transactional
    public void markVerified(User user, String consentIp, String consentUserAgent) {
        user.setEmailVerifiedAt(OffsetDateTime.now());
        userRepository.save(user);
        log.info("Email verified for user {}", user.getId());

        // Isolated from the verification itself: a newsletter failure must never cost somebody
        // their account verification.
        try {
            newsletterSubscriptionService.confirmForUser(user, consentIp, consentUserAgent);
        } catch (RuntimeException e) {
            log.error("Could not confirm the newsletter subscription for user {}", user.getId(), e);
        }

        // The welcome lands here rather than at registration, so signing up produces one email
        // rather than two that arrive together and only one of which asks for anything.
        mailService.sendWelcome(user.getEmail(), user.getFirstName(), Locale.forLanguageTag(user.getLocale()));
    }
```

The early return for an already-verified user stays in `verify` above this call, unchanged.

- [ ] **Step 3: Run the tests again**

Run: `./gradlew test --tests 'event_social_media.service.auth.EmailVerificationServiceTest' --tests 'event_social_media.controller.auth.AuthControllerEmailFlowTest'`
Expected: PASS, no test changed.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/event_social_media/service/auth/EmailVerificationService.java
git commit -m "KAN-197: share the verified step between link and code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Send and check a code

**Files:**
- Create: `src/main/java/event_social_media/service/auth/EmailCodeAttemptRecorder.java`
- Create: `src/main/java/event_social_media/service/auth/EmailCodeService.java`
- Test: `src/test/java/event_social_media/service/auth/EmailCodeServiceTest.java`

- [ ] **Step 1: Write the failing tests**

Not `@Transactional`: a wrong guess is counted in its own transaction (`REQUIRES_NEW`), which can't see rows an open test transaction hasn't committed. Every test makes its own user, so they don't share state.

```java
package event_social_media.service.auth;

import event_social_media.exception.ApiException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.user.User;
import event_social_media.repository.user.EmailVerificationCodeRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.service.mail.TransactionalMailService;
import event_social_media.service.newsletter.NewsletterSubscriptionService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.time.OffsetDateTime;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * The create wizard's email code. The raw code exists only in the email, so these tests take it
 * from the mail mock, the same position a real user is in.
 */
@SpringBootTest
class EmailCodeServiceTest {

    @Autowired
    private EmailCodeService emailCodeService;
    @Autowired
    private EmailVerificationCodeRepository codeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TestFixtures fixtures;

    @MockBean
    private TransactionalMailService mailService;
    @MockBean
    private NewsletterSubscriptionService newsletterSubscriptionService;

    /** Sends a code and returns it as the email carried it. */
    private String sendAndReadCode(User user) {
        clearInvocations(mailService);
        emailCodeService.sendCode(user.getId());
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendEmailVerificationCode(eq(user.getEmail()), code.capture(),
                eq(EmailCodeService.VALID_MINUTES), any(Locale.class));
        return code.getValue();
    }

    private static String wrongCodeFor(String code) {
        return code.equals("000000") ? "111111" : "000000";
    }

    private static ErrorCode errorOf(Runnable call) {
        ApiException ex = assertThrows(ApiException.class, call::run);
        return ex.getErrorCode();
    }

    private User reload(User user) {
        return userRepository.findById(user.getId()).orElseThrow();
    }

    @Test
    void theRightCode_verifiesTheAddress_andSendsTheWelcome() {
        User user = fixtures.newUnverifiedUser();
        String code = sendAndReadCode(user);

        emailCodeService.verify(user.getId(), code, "203.0.113.7", "test-agent");

        assertTrue(reload(user).isEmailVerified());
        verify(mailService).sendWelcome(eq(user.getEmail()), any(), any(Locale.class));
        verify(newsletterSubscriptionService).confirmForUser(any(User.class), eq("203.0.113.7"), eq("test-agent"));
    }

    @Test
    void aCodeIsSixDigits() {
        User user = fixtures.newUnverifiedUser();
        assertTrue(sendAndReadCode(user).matches("\\d{6}"));
    }

    @Test
    void aWrongCode_isRefused_andLeavesTheAddressUnverified() {
        User user = fixtures.newUnverifiedUser();
        String code = sendAndReadCode(user);

        assertEquals(ErrorCode.EMAIL_CODE_INVALID,
                errorOf(() -> emailCodeService.verify(user.getId(), wrongCodeFor(code), null, null)));
        assertFalse(reload(user).isEmailVerified());
    }

    @Test
    void theFifthWrongCode_locksIt_evenAgainstTheRightOne() {
        User user = fixtures.newUnverifiedUser();
        String code = sendAndReadCode(user);
        String wrong = wrongCodeFor(code);

        for (int i = 1; i < EmailCodeService.MAX_ATTEMPTS; i++) {
            assertEquals(ErrorCode.EMAIL_CODE_INVALID,
                    errorOf(() -> emailCodeService.verify(user.getId(), wrong, null, null)));
        }
        assertEquals(ErrorCode.EMAIL_CODE_TOO_MANY_ATTEMPTS,
                errorOf(() -> emailCodeService.verify(user.getId(), wrong, null, null)));
        assertEquals(ErrorCode.EMAIL_CODE_TOO_MANY_ATTEMPTS,
                errorOf(() -> emailCodeService.verify(user.getId(), code, null, null)));
        assertFalse(reload(user).isEmailVerified());
    }

    @Test
    void anExpiredCode_isRefused() {
        User user = fixtures.newUnverifiedUser();
        String code = sendAndReadCode(user);
        codeRepository.findByUser_IdAndConsumedAtIsNull(user.getId()).ifPresent(row -> {
            row.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
            codeRepository.save(row);
        });

        assertEquals(ErrorCode.EMAIL_CODE_EXPIRED,
                errorOf(() -> emailCodeService.verify(user.getId(), code, null, null)));
    }

    @Test
    void aNewCode_retiresTheOldOne() {
        User user = fixtures.newUnverifiedUser();
        String first = sendAndReadCode(user);
        String second = sendAndReadCode(user);

        if (!first.equals(second)) {
            assertEquals(ErrorCode.EMAIL_CODE_INVALID,
                    errorOf(() -> emailCodeService.verify(user.getId(), first, null, null)));
        }
        emailCodeService.verify(user.getId(), second, null, null);
        assertTrue(reload(user).isEmailVerified());
    }

    @Test
    void checkingWithNoCodeSent_saysSo() {
        User user = fixtures.newUnverifiedUser();
        assertEquals(ErrorCode.EMAIL_CODE_NOT_REQUESTED,
                errorOf(() -> emailCodeService.verify(user.getId(), "123456", null, null)));
    }

    @Test
    void aVerifiedAccount_isSentNothing_andAnyCodeIsAccepted() {
        User user = fixtures.newUser();

        emailCodeService.sendCode(user.getId());
        emailCodeService.verify(user.getId(), "123456", null, null);

        verify(mailService, never()).sendEmailVerificationCode(any(), any(), anyInt(), any());
        verify(mailService, never()).sendWelcome(any(), any(), any());
    }
}
```

`ApiException` exposes `getErrorCode()` (Lombok `@Getter` on `errorCode`), checked on `origin/staging`.

- [ ] **Step 2: Run them to make sure they fail**

Run: `./gradlew test --tests 'event_social_media.service.auth.EmailCodeServiceTest'`
Expected: compilation FAILS (`EmailCodeService` not found).

- [ ] **Step 3: Write the attempt recorder**

```java
package event_social_media.service.auth;

import event_social_media.repository.user.EmailVerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Records a wrong email code in a transaction of its own, so the rollback that follows the wrong
 * guess doesn't take the count with it. A separate bean for the same reason as
 * {@link event_social_media.service.user.deletion.AccountDeletionOtpAttemptRecorder}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailCodeAttemptRecorder {

    private final EmailVerificationCodeRepository codeRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedAttempt(UUID codeId) {
        if (codeRepository.incrementAttemptCount(codeId) == 0) {
            log.warn("Failed email code attempt against {} could not be recorded (row gone)", codeId);
        }
    }
}
```

- [ ] **Step 4: Write the service**

```java
package event_social_media.service.auth;

import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.user.EmailVerificationCode;
import event_social_media.model.user.User;
import event_social_media.repository.user.EmailVerificationCodeRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.security.SecureTokens;
import event_social_media.service.mail.TransactionalMailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

/**
 * Confirms a signed-in account's own address with a 6-digit code typed into the create wizard.
 * The mailed link ({@link EmailVerificationService}) keeps working beside it; both end in
 * {@link EmailVerificationService#markVerified}.
 *
 * <p>Same limits as the account deletion code: stored hashed, valid 10 minutes, locked after five
 * wrong tries. How often a code may be sent is limited per account by {@code EmailCodeController}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailCodeService {

    public static final int CODE_DIGITS = 6;
    public static final int VALID_MINUTES = 10;
    public static final int MAX_ATTEMPTS = 5;

    private final EmailVerificationCodeRepository codeRepository;
    private final UserRepository userRepository;
    private final SecureTokens secureTokens;
    private final TransactionalMailService mailService;
    private final EmailCodeAttemptRecorder attemptRecorder;
    private final EmailVerificationService emailVerificationService;

    /** Sends a fresh code to the caller's own address. See {@link #sendCodeTo}. */
    @Transactional
    public void sendCode(UUID userId) {
        sendCodeTo(requireUser(userId));
    }

    /**
     * Retires any outstanding code and mails a new one. Does nothing for an account with no address
     * or one already verified: there is nothing left to prove.
     */
    @Transactional
    public void sendCodeTo(User user) {
        if (user.getEmail() == null || user.getEmail().isBlank() || user.isEmailVerified()) {
            log.info("No email code sent for user {}: nothing to verify", user.getId());
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        codeRepository.consumeOutstanding(user.getId(), now);

        String rawCode = secureTokens.generateNumericCode(CODE_DIGITS);
        EmailVerificationCode code = new EmailVerificationCode();
        code.setUser(user);
        code.setCodeHash(secureTokens.hash(rawCode));
        code.setExpiresAt(now.plusMinutes(VALID_MINUTES));
        code.setAttemptCount(0);
        codeRepository.save(code);

        mailService.sendEmailVerificationCode(user.getEmail(), rawCode, VALID_MINUTES,
                Locale.forLanguageTag(user.getLocale()));
        log.info("Issued email verification code for user {}, valid until {}", user.getId(), code.getExpiresAt());
    }

    /**
     * Checks a typed code and, when it's right, marks the address verified. An account that is
     * already verified (another tab got there first) passes without a check.
     *
     * <p>The fifth wrong code answers "too many tries" rather than "wrong", so the wizard can tell
     * the user to send a new one straight away instead of letting them type a sixth.
     */
    @Transactional
    public void verify(UUID userId, String rawCode, String consentIp, String consentUserAgent) {
        User user = requireUser(userId);
        if (user.isEmailVerified()) {
            return;
        }

        EmailVerificationCode code = codeRepository.findByUser_IdAndConsumedAtIsNull(userId)
                .orElseThrow(() -> new BadRequestException(ErrorCode.EMAIL_CODE_NOT_REQUESTED,
                        "No email code is waiting; send a new one."));

        OffsetDateTime now = OffsetDateTime.now();
        if (code.getExpiresAt().isBefore(now)) {
            throw new BadRequestException(ErrorCode.EMAIL_CODE_EXPIRED,
                    "The email code has expired; send a new one.");
        }
        if (code.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new BadRequestException(ErrorCode.EMAIL_CODE_TOO_MANY_ATTEMPTS,
                    "Too many incorrect attempts; send a new code.");
        }
        if (!secureTokens.hash(rawCode).equals(code.getCodeHash())) {
            // Committed separately: the exception below rolls this transaction back.
            attemptRecorder.recordFailedAttempt(code.getId());
            int attemptsUsed = code.getAttemptCount() + 1;
            log.warn("Incorrect email code for user {} (attempt {} of {})", userId, attemptsUsed, MAX_ATTEMPTS);
            if (attemptsUsed >= MAX_ATTEMPTS) {
                throw new BadRequestException(ErrorCode.EMAIL_CODE_TOO_MANY_ATTEMPTS,
                        "Too many incorrect attempts; send a new code.");
            }
            throw new BadRequestException(ErrorCode.EMAIL_CODE_INVALID, "Incorrect email code.");
        }

        code.setConsumedAt(now);
        codeRepository.save(code);
        emailVerificationService.markVerified(user, consentIp, consentUserAgent);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }
}
```

- [ ] **Step 5: Run the tests**

Run: `./gradlew test --tests 'event_social_media.service.auth.EmailCodeServiceTest'`
Expected: all 8 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/auth/EmailCodeAttemptRecorder.java src/main/java/event_social_media/service/auth/EmailCodeService.java src/test/java/event_social_media/service/auth/EmailCodeServiceTest.java
git commit -m "KAN-197: send and check the email code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Fix a mistyped email

A wizard user who typed the wrong address taps "Change email". The account isn't verified yet, so the address can be corrected; a verified one can't (that needs proof of the old address). This does what the admin email change already does (`UserService.onEmailChanged`): retire links mailed to the old address and move the newsletter signup with `followAccountEmailChange`. That method already handles a new address that has its own signup and keeps a reward on its row, and it is tested in `NewsletterSubscriptionServiceTest`.

**Files:**
- Modify: `src/main/java/event_social_media/service/auth/EmailCodeService.java`
- Test: `src/test/java/event_social_media/service/auth/EmailCodeServiceTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `EmailCodeServiceTest` (imports: `static org.junit.jupiter.api.Assertions.assertNotEquals`, `static org.mockito.Mockito.times`):

```java
    @Test
    void changingTheEmail_movesTheAccount_andSendsACodeToTheNewAddress() {
        User user = fixtures.newUnverifiedUser();
        String newEmail = "fixed-" + user.getId() + "@example.com";

        emailCodeService.changeEmail(user.getId(), newEmail);

        assertEquals(newEmail, reload(user).getEmail());
        verify(mailService, times(1)).sendEmailVerificationCode(eq(newEmail), any(), anyInt(), any(Locale.class));
        verify(newsletterSubscriptionService).followAccountEmailChange(user.getId(), newEmail);
    }

    @Test
    void afterAChange_theCodeSentToTheOldAddressNoLongerWorks() {
        User user = fixtures.newUnverifiedUser();
        String oldCode = sendAndReadCode(user);

        emailCodeService.changeEmail(user.getId(), "fixed-" + user.getId() + "@example.com");
        ArgumentCaptor<String> newCode = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendEmailVerificationCode(eq("fixed-" + user.getId() + "@example.com"),
                newCode.capture(), anyInt(), any(Locale.class));

        if (!oldCode.equals(newCode.getValue())) {
            assertEquals(ErrorCode.EMAIL_CODE_INVALID,
                    errorOf(() -> emailCodeService.verify(user.getId(), oldCode, null, null)));
        }
        emailCodeService.verify(user.getId(), newCode.getValue(), null, null);
        assertTrue(reload(user).isEmailVerified());
    }

    @Test
    void changingToAnAddressAnotherAccountHas_isRefused() {
        User user = fixtures.newUnverifiedUser();
        User other = fixtures.newUser();

        assertEquals(ErrorCode.EMAIL_ALREADY_EXISTS,
                errorOf(() -> emailCodeService.changeEmail(user.getId(), other.getEmail())));
        assertNotEquals(other.getEmail(), reload(user).getEmail());
    }

    @Test
    void aVerifiedAccount_cannotChangeItsEmailHere() {
        User user = fixtures.newUser();

        assertEquals(ErrorCode.EMAIL_ALREADY_VERIFIED,
                errorOf(() -> emailCodeService.changeEmail(user.getId(), "new-" + user.getId() + "@example.com")));
    }
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `./gradlew test --tests 'event_social_media.service.auth.EmailCodeServiceTest'`
Expected: compilation FAILS (`changeEmail` not found).

- [ ] **Step 3: Add the method**

Add these imports to `EmailCodeService`:

```java
import event_social_media.exception.ConflictException;
import event_social_media.exception.EmailAlreadyExistsException;
import event_social_media.model.user.UserTokenPurpose;
import event_social_media.service.newsletter.NewsletterSubscriptionService;
```

Add two fields after `emailVerificationService`:

```java
    private final UserTokenService userTokenService;
    private final NewsletterSubscriptionService newsletterSubscriptionService;
```

Add the method after `verify`:

```java
    /**
     * Corrects a mistyped address on an account that hasn't verified it yet, then sends a code to
     * the new one. A verified address can't be changed here: that needs proof of the old one.
     *
     * <p>Follows the admin email change ({@code UserService.onEmailChanged}): links mailed to the
     * old address are retired and the newsletter signup moves with the account.
     */
    @Transactional
    public void changeEmail(UUID userId, String newEmail) {
        User user = requireUser(userId);
        if (user.isEmailVerified()) {
            throw new ConflictException(ErrorCode.EMAIL_ALREADY_VERIFIED,
                    "This account's email is already verified.");
        }
        userRepository.findByEmail(newEmail)
                .filter(holder -> !holder.getId().equals(userId))
                .ifPresent(holder -> {
                    throw new EmailAlreadyExistsException(newEmail);
                });

        user.setEmail(newEmail);
        userRepository.save(user);
        log.info("Unverified user {} corrected their email in the create wizard", userId);

        userTokenService.retireOutstanding(user, UserTokenPurpose.EMAIL_VERIFICATION);
        userTokenService.retireOutstanding(user, UserTokenPurpose.PASSWORD_RESET);
        newsletterSubscriptionService.followAccountEmailChange(userId, newEmail);

        // Retiring tokens clears the persistence context (see UserService.onEmailChanged), so
        // load the account again before issuing the code. sendCodeTo retires the old code too.
        sendCodeTo(requireUser(userId));
    }
```

`UserTokenService` is in the same package (`service.auth`), so it needs no import.

- [ ] **Step 4: Run the tests**

Run: `./gradlew test --tests 'event_social_media.service.auth.EmailCodeServiceTest'`
Expected: all 12 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/auth/EmailCodeService.java src/test/java/event_social_media/service/auth/EmailCodeServiceTest.java
git commit -m "KAN-197: correct a mistyped email before it is verified" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Sign-up can ask for a code

**Files:**
- Create: `src/main/java/event_social_media/dto/auth/EmailVerificationMethod.java`
- Modify: `src/main/java/event_social_media/dto/auth/RegisterRequestDto.java`
- Modify: `src/main/java/event_social_media/service/auth/AuthService.java` (`createAccount`)
- Test: `src/test/java/event_social_media/controller/auth/AuthControllerRegisterEmailCodeTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.auth;

import event_social_media.service.notification.email.EmailMessage;
import event_social_media.service.notification.email.EmailSender;
import event_social_media.service.user.GuidelinesAcceptanceService;
import event_social_media.service.user.TermsAcceptanceService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Not {@code @Transactional}: mail goes out after commit (see AuthControllerEmailFlowTest). */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.rate-limit.enabled=false")
class AuthControllerRegisterEmailCodeTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private GuidelinesAcceptanceService guidelinesAcceptanceService;
    @Autowired
    private TermsAcceptanceService termsAcceptanceService;

    @MockBean
    private EmailSender emailSender;

    private EmailMessage registerAndReadMail(String extraJson) throws Exception {
        String email = "code-" + UUID.randomUUID() + "@example.com";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Sup3rSecret!\","
                                + "\"firstName\":\"Sarah\",\"lastName\":\"Bennett\","
                                + "\"acceptedGuidelinesVersion\":\"" + guidelinesAcceptanceService.currentVersion() + "\","
                                + "\"acceptedTermsVersion\":\"" + termsAcceptanceService.currentVersion() + "\","
                                + "\"adultConfirmed\":true" + extraJson + "}"))
                .andExpect(status().isCreated());
        ArgumentCaptor<EmailMessage> sent = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender, org.mockito.Mockito.atLeastOnce()).send(sent.capture());
        return sent.getAllValues().stream()
                .filter(m -> m.toAddress().equals(email))
                .findFirst().orElseThrow();
    }

    @Test
    void askingForACode_mailsSixDigits_andNoLink() throws Exception {
        EmailMessage mail = registerAndReadMail(",\"emailVerification\":\"CODE\"");
        assertTrue(mail.subject().matches(".*\\b\\d{6}\\b.*"), mail.subject());
        assertFalse(mail.textBody().contains("token="), mail.textBody());
    }

    @Test
    void withoutTheOption_theLinkStillGoesOut() throws Exception {
        EmailMessage mail = registerAndReadMail("");
        assertTrue(mail.textBody().contains("token="), mail.textBody());
    }

    @Test
    void anUnknownMethod_isRejected() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"x-" + UUID.randomUUID() + "@example.com\",\"password\":\"Sup3rSecret!\","
                                + "\"firstName\":\"S\",\"lastName\":\"B\","
                                + "\"acceptedGuidelinesVersion\":\"" + guidelinesAcceptanceService.currentVersion() + "\","
                                + "\"acceptedTermsVersion\":\"" + termsAcceptanceService.currentVersion() + "\","
                                + "\"adultConfirmed\":true,\"emailVerification\":\"SMS\"}"))
                .andExpect(status().isBadRequest());
    }
}
```

`currentVersion()` is what `TestFixtures` calls on both services. If either returns something other than a `String`, wrap it with `String.valueOf`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `./gradlew test --tests 'event_social_media.controller.auth.AuthControllerRegisterEmailCodeTest'`
Expected: `askingForACode_mailsSixDigits_andNoLink` FAILS with 400 (`fail-on-unknown-properties=true` rejects the unknown field).

- [ ] **Step 3: Add the enum**

```java
package event_social_media.dto.auth;

/**
 * How a new account confirms its address. {@code LINK} mails a link (the default); {@code CODE}
 * mails a 6-digit code the create wizard asks for. See {@code EmailCodeService}.
 */
public enum EmailVerificationMethod {
    LINK,
    CODE
}
```

- [ ] **Step 4: Add the field to `RegisterRequestDto`**

After `visitSource`:

```java

    /**
     * How the new account confirms its address. Optional; {@code LINK} when absent. The create
     * wizard sends {@code CODE} so the check happens inside the wizard.
     */
    private EmailVerificationMethod emailVerification;
```

- [ ] **Step 5: Use it in `AuthService.createAccount`**

Inject the service (add the field next to `emailVerificationService`):

```java
    private final EmailCodeService emailCodeService;
```

Replace the line `emailVerificationService.sendVerification(saved);` with:

```java
        if (dto.getEmailVerification() == EmailVerificationMethod.CODE) {
            emailCodeService.sendCodeTo(saved);
        } else {
            emailVerificationService.sendVerification(saved);
        }
```

Add `import event_social_media.dto.auth.EmailVerificationMethod;`. Update the comment above that line so it says "Verification is asked for in parallel (a link, or a code for the create wizard) rather than as a gate".

- [ ] **Step 6: Run the tests**

Run: `./gradlew test --tests 'event_social_media.controller.auth.*'`
Expected: PASS, including the existing auth controller tests.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/dto/auth/EmailVerificationMethod.java src/main/java/event_social_media/dto/auth/RegisterRequestDto.java src/main/java/event_social_media/service/auth/AuthService.java src/test/java/event_social_media/controller/auth/AuthControllerRegisterEmailCodeTest.java
git commit -m "KAN-197: sign-up can send a code instead of a link" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The routes

**Files:**
- Create: `src/main/java/event_social_media/dto/auth/EmailCodeVerifyRequestDto.java`
- Create: `src/main/java/event_social_media/dto/auth/EmailCodeChangeEmailRequestDto.java`
- Create: `src/main/java/event_social_media/controller/auth/EmailCodeController.java`
- Modify: `src/main/java/event_social_media/config/SecurityConfig.java`
- Test: `src/test/java/event_social_media/controller/auth/EmailCodeControllerTest.java`
- Test: `src/test/java/event_social_media/controller/auth/EmailCodeControllerRateLimitTest.java`

- [ ] **Step 1: Write the failing end-to-end test**

```java
package event_social_media.controller.auth;

import event_social_media.model.user.User;
import event_social_media.repository.user.UserRepository;
import event_social_media.security.JwtService;
import event_social_media.service.notification.email.EmailMessage;
import event_social_media.service.notification.email.EmailSender;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Not {@code @Transactional}: mail goes out after commit (see AuthControllerEmailFlowTest). */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.rate-limit.enabled=false")
class EmailCodeControllerTest {

    private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TestFixtures fixtures;

    @MockBean
    private EmailSender emailSender;

    private String bearer(User user) {
        return "Bearer " + jwtService.generateAccessToken(user.getId(), user.getEmail(), "USER");
    }

    /** The latest mail to this address, as a mail client would show it. */
    private EmailMessage lastMailTo(String address) {
        ArgumentCaptor<EmailMessage> sent = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender, atLeastOnce()).send(sent.capture());
        List<EmailMessage> mine = sent.getAllValues().stream().filter(m -> m.toAddress().equals(address)).toList();
        return mine.get(mine.size() - 1);
    }

    private static String codeIn(EmailMessage mail) {
        Matcher matcher = CODE.matcher(mail.subject());
        assertTrue(matcher.find(), "no code in: " + mail.subject());
        return matcher.group(1);
    }

    private String sendCode(User user) throws Exception {
        clearInvocations(emailSender);
        mockMvc.perform(post("/api/auth/email-code").header("Authorization", bearer(user)))
                .andExpect(status().isNoContent());
        EmailMessage mail = lastMailTo(user.getEmail());
        assertTrue(mail.textBody().contains("10"), mail.textBody());
        return codeIn(mail);
    }

    private org.springframework.test.web.servlet.ResultActions verifyCode(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/auth/email-code/verify")
                .header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\"}"));
    }

    @Test
    void signedOut_isRefused() throws Exception {
        mockMvc.perform(post("/api/auth/email-code")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/email-code/verify")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"123456\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/auth/email-code/email")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"a@example.com\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "GUEST")
    void anInviteLinkGuest_isRefused() throws Exception {
        mockMvc.perform(post("/api/auth/email-code")).andExpect(status().isForbidden());
    }

    @Test
    void theMailedCode_verifiesTheAccount() throws Exception {
        User user = fixtures.newUnverifiedUser();
        String code = sendCode(user);

        verifyCode(user, code).andExpect(status().isNoContent());

        assertTrue(userRepository.findById(user.getId()).orElseThrow().isEmailVerified());
    }

    @Test
    void aWrongCode_isA400WithItsOwnErrorCode() throws Exception {
        User user = fixtures.newUnverifiedUser();
        String code = sendCode(user);
        String wrong = code.equals("000000") ? "111111" : "000000";

        verifyCode(user, wrong)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(3127));
    }

    @Test
    void aCodeThatIsNotSixDigits_isRejected() throws Exception {
        User user = fixtures.newUnverifiedUser();
        verifyCode(user, "12ab").andExpect(status().isBadRequest());
    }

    @Test
    void changingTheEmail_sendsTheCodeToTheNewAddress() throws Exception {
        User user = fixtures.newUnverifiedUser();
        String newEmail = "fixed-" + user.getId() + "@example.com";
        clearInvocations(emailSender);

        mockMvc.perform(put("/api/auth/email-code/email")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + newEmail + "\"}"))
                .andExpect(status().isNoContent());

        assertEquals(newEmail, userRepository.findById(user.getId()).orElseThrow().getEmail());
        codeIn(lastMailTo(newEmail));
    }

    @Test
    void changingToATakenEmail_isA409() throws Exception {
        User user = fixtures.newUnverifiedUser();
        User other = fixtures.newUser();

        mockMvc.perform(put("/api/auth/email-code/email")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + other.getEmail() + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5002));
    }

    @Test
    void aVerifiedAccount_cannotChangeItsEmailHere() throws Exception {
        User user = fixtures.newUser();

        mockMvc.perform(put("/api/auth/email-code/email")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new-" + user.getId() + "@example.com\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5227));
    }
}
```

- [ ] **Step 2: Write the failing rate limit test**

```java
package event_social_media.controller.auth;

import event_social_media.config.RateLimitProperties;
import event_social_media.dto.auth.EmailCodeChangeEmailRequestDto;
import event_social_media.exception.RateLimitExceededException;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.auth.EmailCodeService;
import event_social_media.service.ratelimit.RateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

/**
 * Each code is an email from our domain, so one account gets five an hour, address changes
 * included. The one-a-minute limit is the {@code @RateLimit} on the routes.
 */
class EmailCodeControllerRateLimitTest {

    private EmailCodeController controller;

    @BeforeEach
    void setUp() {
        RateLimitProperties properties = new RateLimitProperties();
        controller = new EmailCodeController(mock(EmailCodeService.class), new RateLimiter(), properties,
                new ClientAddressResolver(properties));
    }

    private static Authentication account() {
        return new TestingAuthenticationToken(UUID.randomUUID().toString(), null, "ROLE_USER");
    }

    private static EmailCodeChangeEmailRequestDto newAddress() {
        EmailCodeChangeEmailRequestDto dto = new EmailCodeChangeEmailRequestDto();
        dto.setEmail("x@example.com");
        return dto;
    }

    @Test
    void sendingIsCappedAtFiveAnHourPerAccount() {
        Authentication account = account();
        for (int i = 0; i < EmailCodeController.SEND_HOURLY_LIMIT; i++) {
            assertDoesNotThrow(() -> controller.send(account));
        }
        assertThrows(RateLimitExceededException.class, () -> controller.send(account));
    }

    @Test
    void changingTheAddress_sharesTheSameBudget() {
        Authentication account = account();
        for (int i = 0; i < EmailCodeController.SEND_HOURLY_LIMIT; i++) {
            assertDoesNotThrow(() -> controller.send(account));
        }
        assertThrows(RateLimitExceededException.class, () -> controller.changeEmail(newAddress(), account));
    }

    @Test
    void anotherAccount_hasItsOwnBudget() {
        Authentication first = account();
        for (int i = 0; i < EmailCodeController.SEND_HOURLY_LIMIT; i++) {
            controller.send(first);
        }
        assertDoesNotThrow(() -> controller.send(account()));
    }
}
```

- [ ] **Step 3: Run both to make sure they fail**

Run: `./gradlew test --tests 'event_social_media.controller.auth.EmailCodeController*'`
Expected: compilation FAILS (`EmailCodeController`, DTOs not found).

- [ ] **Step 4: Write the DTOs**

```java
package event_social_media.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** Body of {@code POST /api/auth/email-code/verify}. */
@Data
public class EmailCodeVerifyRequestDto {

    /** The six digits from the email. */
    @NotBlank
    @Pattern(regexp = "\\d{6}")
    private String code;
}
```

```java
package event_social_media.dto.auth;

import event_social_media.constants.TextLimits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Body of {@code PUT /api/auth/email-code/email}: the corrected address. Same rules as sign-up. */
@Data
public class EmailCodeChangeEmailRequestDto {

    @NotBlank
    @Email
    @Size(max = TextLimits.EMAIL_MAX)
    private String email;
}
```

- [ ] **Step 5: Write the controller**

```java
package event_social_media.controller.auth;

import event_social_media.config.RateLimitProperties;
import event_social_media.dto.auth.EmailCodeChangeEmailRequestDto;
import event_social_media.dto.auth.EmailCodeVerifyRequestDto;
import event_social_media.exception.RateLimitExceededException;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.auth.EmailCodeService;
import event_social_media.service.ratelimit.RateLimit;
import event_social_media.service.ratelimit.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

/**
 * The create wizard's email check: a 6-digit code mailed to a signed-in account's own unverified
 * address and typed back in, instead of a link that opens a new tab.
 *
 * <p>Under {@code /api/auth} beside the link flow, but signed in: SecurityConfig requires a token
 * for these routes ahead of the {@code /api/auth/**} permitAll, and each route needs a registered
 * account (an invite-link guest has no address to verify).
 */
@Slf4j
@RestController
@RequestMapping("/api/auth/email-code")
@RequiredArgsConstructor
public class EmailCodeController {

    /** Codes one account may have mailed an hour, address changes included. */
    static final int SEND_HOURLY_LIMIT = 5;
    private static final Duration SEND_HOURLY_WINDOW = Duration.ofHours(1);

    private final EmailCodeService emailCodeService;
    private final RateLimiter rateLimiter;
    private final RateLimitProperties rateLimitProperties;
    private final ClientAddressResolver clientAddressResolver;

    /** Mails a fresh code to the caller's address. {@code 204}, also when it's already verified. */
    // Each call sends an email: one a minute here, five an hour below.
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @RateLimit(name = "auth.email-code.send", limit = 1, windowSeconds = 60)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void send(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        requireHourlySendBudget(userId);
        emailCodeService.sendCode(userId);
    }

    /**
     * Checks the typed code. {@code 204} when the address is now verified; {@code 400} with
     * 3124 (none sent), 3125 (expired), 3126 (too many tries) or 3127 (wrong).
     */
    // The code locks after five misses; this bounds the guess rate even if a miss can't be counted.
    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @RateLimit(name = "auth.email-code.verify", limit = 10, windowSeconds = 60)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody EmailCodeVerifyRequestDto dto, Authentication authentication,
                       HttpServletRequest request) {
        emailCodeService.verify(UUID.fromString(authentication.getName()), dto.getCode(),
                clientAddressResolver.resolve(request), request.getHeader("User-Agent"));
    }

    /**
     * Corrects the address of an account that hasn't verified it and mails a code there. {@code 409}
     * 5002 when another account has the address, 5227 when this one is already verified.
     */
    // Shares the send budget: changing the address sends a code too.
    @PutMapping("/email")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @RateLimit(name = "auth.email-code.send", limit = 1, windowSeconds = 60)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeEmail(@Valid @RequestBody EmailCodeChangeEmailRequestDto dto, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        requireHourlySendBudget(userId);
        emailCodeService.changeEmail(userId, dto.getEmail());
    }

    /** Counted here rather than by {@link RateLimit}, which takes one window per route. */
    private void requireHourlySendBudget(UUID userId) {
        if (!rateLimitProperties.isEnabled()) {
            return;
        }
        RateLimiter.Decision decision = rateLimiter.check("auth.email-code.send.hourly:user:" + userId,
                SEND_HOURLY_LIMIT, SEND_HOURLY_WINDOW);
        if (!decision.allowed()) {
            log.warn("Rate limit 'auth.email-code.send.hourly' exceeded by user:{}", userId);
            throw new RateLimitExceededException(decision.retryAfterSeconds());
        }
    }
}
```

`ClientAddressResolver` is unused by `send` and `changeEmail` but needed by `verify`; keep it as a field.

- [ ] **Step 6: Require a token for these routes**

In `SecurityConfig.filterChain`, add this rule **before** the `.requestMatchers("/api/auth/**", ...).permitAll()` block (rules match in order, so it must come first):

```java
                        // The create wizard's email code: under /api/auth beside the link flow, but for a
                        // signed-in account's own address, so it needs a token (EmailCodeController).
                        .requestMatchers("/api/auth/email-code", "/api/auth/email-code/**").authenticated()
```

Also update the class Javadoc bullet `{@code /api/auth/**} is public ...` to add: "except {@code /api/auth/email-code/**}, the create wizard's email code, which needs a signed-in account."

- [ ] **Step 7: Run the tests**

Run: `./gradlew test --tests 'event_social_media.controller.auth.*' --tests 'event_social_media.service.auth.*'`
Expected: PASS.

If `signedOut_isRefused` gets 403 instead of 401, the new rule is after the permitAll block; move it up.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/dto/auth/EmailCodeVerifyRequestDto.java src/main/java/event_social_media/dto/auth/EmailCodeChangeEmailRequestDto.java src/main/java/event_social_media/controller/auth/EmailCodeController.java src/main/java/event_social_media/config/SecurityConfig.java src/test/java/event_social_media/controller/auth/EmailCodeControllerTest.java src/test/java/event_social_media/controller/auth/EmailCodeControllerRateLimitTest.java
git commit -m "KAN-197: routes to send, check and correct the email code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Full checks and the pull request

- [ ] **Step 1: Run every test and the build**

Run: `./gradlew test` then `./gradlew build`
Expected: both BUILD SUCCESSFUL. Fix anything red before going on.

- [ ] **Step 2: Check the migration on Postgres**

Use the isolated local stack (memory note "Isolated local check stack": a throwaway Postgres on its own port) and start the app against it once, so Flyway runs `V221`. Expected log line: `Successfully applied 1 migration ... v221`. Stop the app and drop the throwaway database.

- [ ] **Step 3: Refresh the code graph**

Run: `graphify update .`
Commit `graphify-out/` only if the repo tracks it (`git status` shows it as modified, not untracked).

- [ ] **Step 4: Push and open the PR into `staging`**

Ask the user before pushing. Then:

```bash
git push -u origin claude/kan-197-email-code
gh pr create --base staging --title "KAN-197: email code for the create wizard and public plan list" --body-file <file>
```

The PR body has: a summary; the changes (public plan list, `email_verification_codes` + V221, the three `/api/auth/email-code` routes with their error codes 3124–3127 and 5227, `emailVerification: "CODE"` on register, the newsletter move); how it was tested; and "Deploy: nothing. Additive; the frontend uses it only behind `CREATE_WIZARD_LAUNCHED`." Name only KAN-197 in the body. End with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 5: After merge, check staging**

Once merged and deployed to staging:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://api.staging.storywall.gr/api/plan-tiers?eventType=WEDDING"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://api.staging.storywall.gr/api/auth/email-code"
```

Expected: `200`, then `401`.
