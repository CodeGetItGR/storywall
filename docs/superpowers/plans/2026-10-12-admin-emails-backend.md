# Admin Emails — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins preview and send four predefined transactional emails to one account, and email a host when an admin provisions an event for them.

**Architecture:** `TransactionalMailService` gains public `composeX` methods that return the finished `EmailMessage`. Its `sendX` methods become `deliver(composeX(...))`. A new `AdminEmailService` picks a template, checks availability, and either returns the composed message (preview, with a placeholder token) or issues a real token, delivers after commit and audits (send). Provisioning calls the same service to send the welcome email.

**Tech Stack:** Spring Boot, JPA, JUnit 5, AssertJ, Mockito, MockMvc. Repo: `C:\Users\User\IdeaProjects\event_social_media`.

**Spec:** `C:\Users\User\WebstormProjects\storywall\docs\superpowers\specs\2026-10-12-admin-emails-design.md`

---

## Setup

- [ ] **Create the branch from the latest `staging`**

```bash
cd /c/Users/User/IdeaProjects/event_social_media
git fetch origin
git switch -c feat/admin-emails origin/staging
```

Test command used throughout: `./gradlew test --tests '<FQCN or pattern>'` from the repo root.

## File map

| File | Change |
|---|---|
| `src/main/java/event_social_media/service/mail/TransactionalMailService.java` | Add `composePasswordReset`, `composeEmailVerification`, `composeProvisionedHostWelcome`, `composeCustom`, public `send(EmailMessage, String)` |
| `src/main/resources/i18n/messages.properties`, `messages_el.properties` | `email.provisioned_welcome.*` |
| `src/main/java/event_social_media/model/audit/AdminAuditAction.java` | `EMAIL_SENT` |
| `src/main/java/event_social_media/exception/ErrorCode.java` | `EMAIL_EVENT_NOT_HOSTED(3103)`, `EMAIL_MESSAGE_REQUIRED(3104)`, `EMAIL_TEMPLATE_UNAVAILABLE(5175)` |
| `src/main/java/event_social_media/repository/event/EventHostRepository.java` | `existsByMember_User_Id`, `existsByEvent_IdAndMember_User_Id` |
| `src/main/java/event_social_media/service/mail/admin/AdminEmailTemplate.java` | new enum |
| `src/main/java/event_social_media/service/mail/admin/AdminEmailUnavailableReason.java` | new enum |
| `src/main/java/event_social_media/service/mail/admin/AdminEmailAvailability.java` | new, pure rules |
| `src/main/java/event_social_media/service/mail/admin/AdminEmailService.java` | new |
| `src/main/java/event_social_media/dto/mail/AdminEmailRequestDto.java` | new |
| `src/main/java/event_social_media/dto/mail/AdminEmailTemplateDto.java` | new record |
| `src/main/java/event_social_media/dto/mail/AdminEmailPreviewDto.java` | new record |
| `src/main/java/event_social_media/dto/mail/AdminWelcomePreviewRequestDto.java` | new |
| `src/main/java/event_social_media/controller/user/AdminUserEmailController.java` | new |
| `src/main/java/event_social_media/dto/event/AdminEventProvisionRequestDto.java` | `notifyHost` |
| `src/main/java/event_social_media/controller/event/AdminEventProvisioningController.java` | send on provision, `welcome-preview` |
| `docs/` FE integration guide (wherever `promoter-account-provisioning-fe-integration.md` lives in this repo) | new section |

---

### Task 1: Compose methods for the existing reset and verification emails

**Files:**
- Modify: `src/main/java/event_social_media/service/mail/TransactionalMailService.java:110-121` and `:227-239`
- Test: `src/test/java/event_social_media/service/mail/TransactionalMailServiceTest.java`

- [ ] **Step 1: Write the failing tests** (append to `TransactionalMailServiceTest`)

```java
    @Test
    void composePasswordReset_buildsTheSameMessageSendDelivers() {
        EmailMessage composed = mailService.composePasswordReset("host@example.com", "raw-token", 30, Locale.ENGLISH);
        mailService.sendPasswordReset("host@example.com", "raw-token", 30, Locale.ENGLISH);
        var captor = org.mockito.ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());

        assertThat(composed).isEqualTo(captor.getValue());
        assertThat(composed.textBody()).contains("/reset-password?token=raw-token");
    }

    @Test
    void composeEmailVerification_buildsTheSameMessageSendDelivers() {
        EmailMessage composed = mailService.composeEmailVerification("host@example.com", "Sam", "raw-token", Locale.ENGLISH);
        mailService.sendEmailVerification("host@example.com", "Sam", "raw-token", Locale.ENGLISH);
        var captor = org.mockito.ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());

        assertThat(composed).isEqualTo(captor.getValue());
        assertThat(composed.textBody()).contains("/verify-email?token=raw-token");
    }
```

Note: `EmailLayout` stamps `Year.now()`, so the two messages are equal unless the test runs across New Year's midnight.

- [ ] **Step 2: Run them, expect a compile failure**

Run: `./gradlew test --tests 'event_social_media.service.mail.TransactionalMailServiceTest'`
Expected: FAIL, `cannot find symbol composePasswordReset`.

- [ ] **Step 3: Split compose from send**

Replace `sendEmailVerification` with:

```java
    public void sendEmailVerification(String toAddress, String firstName, String rawToken, Locale locale) {
        deliver(composeEmailVerification(toAddress, firstName, rawToken, locale), "email verification");
    }

    /** The verification email, unsent. Admin previews pass a placeholder token. */
    public EmailMessage composeEmailVerification(String toAddress, String firstName, String rawToken, Locale locale) {
        String subject = messageRenderer.plain("email.verification.subject", locale);
        return layout.compose(
                toAddress,
                subject,
                subject,
                messageRenderer.render("email.verification.body", greetingArgs(firstName, locale), locale),
                List.of(),
                messageRenderer.plain("email.verification.cta", locale),
                absolute(VERIFY_PATH + rawToken));
    }
```

Replace `sendPasswordReset` with:

```java
    public void sendPasswordReset(String toAddress, String rawToken, int validMinutes, Locale locale) {
        deliver(composePasswordReset(toAddress, rawToken, validMinutes, locale), "password reset");
    }

    /** The reset email, unsent. Admin previews pass a placeholder token. */
    public EmailMessage composePasswordReset(String toAddress, String rawToken, int validMinutes, Locale locale) {
        String subject = messageRenderer.plain("email.password_reset.subject", locale);
        return layout.compose(
                toAddress,
                subject,
                subject,
                messageRenderer.render("email.password_reset.body", Map.of("minutes", validMinutes), locale),
                List.of(),
                messageRenderer.plain("email.password_reset.cta", locale),
                absolute(RESET_PATH + rawToken));
    }
```

Keep the existing Javadoc above each `send` method. Also remove the stray orphan Javadoc block at lines 123-128 ("Welcomes an account once its address is confirmed…") and move it to sit directly above `sendWelcome`, where it belongs.

Add a public entry point beside the private `deliver`:

```java
    /**
     * Delivers a message composed by one of the {@code composeX} methods, after the caller's
     * transaction commits. For callers that compose first so they can also preview.
     *
     * @param context what was sent, for the log line; never the message itself
     */
    public void send(EmailMessage message, String context) {
        deliver(message, context);
    }
```

- [ ] **Step 4: Run the tests, expect a pass**

Run: `./gradlew test --tests 'event_social_media.service.mail.*'`
Expected: PASS (all mail tests, old and new).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/mail/TransactionalMailService.java src/test/java/event_social_media/service/mail/TransactionalMailServiceTest.java
git commit -m "refactor(mail): compose reset and verification emails separately from sending"
```

---

### Task 2: Welcome and custom email composition

**Files:**
- Modify: `src/main/java/event_social_media/service/mail/TransactionalMailService.java`
- Modify: `src/main/resources/i18n/messages.properties` (after `email.welcome.cta`, line 91)
- Modify: `src/main/resources/i18n/messages_el.properties` (after `email.welcome.cta`, line 89)
- Test: `src/test/java/event_social_media/service/mail/TransactionalMailServiceTest.java`

- [ ] **Step 1: Write the failing tests**

```java
    @Test
    void provisionedHostWelcome_namesTheEventAndLinksToIt() {
        UUID eventId = UUID.fromString("11111111-2222-3333-4444-555555555555");
        EmailMessage message = mailService.composeProvisionedHostWelcome("host@example.com", "Sam",
                "Summer Party", eventId, OffsetDateTime.parse("2027-06-01T15:00:00Z"), "Europe/Athens",
                "Villa Rosa", "Main St 1", Locale.ENGLISH);

        assertThat(message.subject()).isEqualTo("Your event Summer Party is ready");
        assertThat(message.textBody()).contains("Hi Sam —");
        assertThat(message.textBody()).contains("Villa Rosa");
        assertThat(message.textBody()).contains("/events/" + eventId);
        assertThat(message.textBody()).doesNotContain("token=");
    }

    @Test
    void provisionedHostWelcome_rendersInGreek() {
        EmailMessage message = mailService.composeProvisionedHostWelcome("host@example.com", "Sam",
                "Summer Party", UUID.randomUUID(), OffsetDateTime.parse("2027-06-01T15:00:00Z"), "Europe/Athens",
                null, null, Locale.forLanguageTag("el"));

        assertThat(message.subject()).isEqualTo("Η εκδήλωσή σας Summer Party είναι έτοιμη");
    }

    @Test
    void customEmail_usesTheAdminTextAsIsAndEscapesIt() {
        EmailMessage message = mailService.composeCustom("host@example.com", "About your event",
                "Line one\n<b>Line two</b>");

        assertThat(message.subject()).isEqualTo("About your event");
        assertThat(message.textBody()).contains("Line one\n<b>Line two</b>");
        assertThat(message.htmlBody()).contains("&lt;b&gt;Line two&lt;/b&gt;");
        assertThat(message.htmlBody()).doesNotContain("Unsubscribe");
    }
```

- [ ] **Step 2: Run them, expect a compile failure**

Run: `./gradlew test --tests 'event_social_media.service.mail.TransactionalMailServiceTest'`
Expected: FAIL, `cannot find symbol composeProvisionedHostWelcome`.

- [ ] **Step 3: Add the copy**

`messages.properties`:

```properties
email.provisioned_welcome.subject=Your event {eventTitle} is ready
email.provisioned_welcome.body={greeting}we set up {eventTitle} for you. Open it to invite guests and get your QR codes.
email.provisioned_welcome.cta=Open your event
```

`messages_el.properties`:

```properties
email.provisioned_welcome.subject=Η εκδήλωσή σας {eventTitle} είναι έτοιμη
email.provisioned_welcome.body={greeting}δημιουργήσαμε την εκδήλωση {eventTitle} για εσάς. Ανοίξτε την για να προσκαλέσετε καλεσμένους και να βρείτε τους κωδικούς QR σας.
email.provisioned_welcome.cta=Άνοιγμα εκδήλωσης
```

(The subject doubles as the heading, like most emails here, so there is no `.heading` key.)

- [ ] **Step 4: Add the compose methods** (in `TransactionalMailService`, after `sendCoHostInvitation`)

```java
    /**
     * Tells a host an admin set up an event for them. Carries no token: a provisioned host already
     * has the set-password email from account creation, and this one must not replace that link.
     *
     * @param eventId the event the button opens; previews before the event exists pass a placeholder
     */
    public EmailMessage composeProvisionedHostWelcome(String toAddress, String firstName, String eventTitle,
                                                      UUID eventId, OffsetDateTime startAt, String timezone,
                                                      String locationName, String locationAddress,
                                                      Locale locale) {
        Map<String, Object> args = greetingArgs(firstName, locale);
        args.put("eventTitle", eventTitle);
        String subject = messageRenderer.render("email.provisioned_welcome.subject", args, locale);
        return layout.compose(
                toAddress,
                subject,
                subject,
                messageRenderer.render("email.provisioned_welcome.body", args, locale),
                eventInfoLines(startAt, timezone, locationName, locationAddress, null, locale),
                messageRenderer.plain("email.provisioned_welcome.cta", locale),
                absolute("/events/" + eventId));
    }

    /**
     * A message an admin wrote for one account. Plain text, escaped by the layout like every body;
     * the subject doubles as the heading. No greeting is added: the admin writes the whole text.
     */
    public EmailMessage composeCustom(String toAddress, String subject, String body) {
        return layout.compose(toAddress, subject, subject, body, List.of(), null, null);
    }
```

- [ ] **Step 5: Run the tests, expect a pass**

Run: `./gradlew test --tests 'event_social_media.service.mail.TransactionalMailServiceTest'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/mail/TransactionalMailService.java src/main/resources/i18n/messages.properties src/main/resources/i18n/messages_el.properties src/test/java/event_social_media/service/mail/TransactionalMailServiceTest.java
git commit -m "feat(mail): provisioned-host welcome and admin custom email composition"
```

---

### Task 3: Templates, reasons and availability rules

**Files:**
- Create: `src/main/java/event_social_media/service/mail/admin/AdminEmailTemplate.java`
- Create: `src/main/java/event_social_media/service/mail/admin/AdminEmailUnavailableReason.java`
- Create: `src/main/java/event_social_media/service/mail/admin/AdminEmailAvailability.java`
- Test: `src/test/java/event_social_media/service/mail/admin/AdminEmailAvailabilityTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.mail.admin;

import event_social_media.model.user.AccountStatus;
import event_social_media.model.user.AuthProvider;
import event_social_media.model.user.User;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static event_social_media.service.mail.admin.AdminEmailTemplate.CUSTOM;
import static event_social_media.service.mail.admin.AdminEmailTemplate.EMAIL_VERIFICATION;
import static event_social_media.service.mail.admin.AdminEmailTemplate.PASSWORD_RESET;
import static event_social_media.service.mail.admin.AdminEmailTemplate.PROVISIONED_HOST_WELCOME;
import static org.assertj.core.api.Assertions.assertThat;

class AdminEmailAvailabilityTest {

    private static User user() {
        User user = new User();
        user.setEmail("host@example.com");
        user.setStatus(AccountStatus.ACTIVE);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setPasswordHash("hash");
        user.setIsGuestAccount(false);
        user.setEmailVerifiedAt(OffsetDateTime.now());
        return user;
    }

    @Test
    void everyTemplateIsAvailableForAnOrdinaryVerifiedHost_exceptVerification() {
        User user = user();
        assertThat(AdminEmailAvailability.check(user, PASSWORD_RESET, true)).isNull();
        assertThat(AdminEmailAvailability.check(user, PROVISIONED_HOST_WELCOME, true)).isNull();
        assertThat(AdminEmailAvailability.check(user, CUSTOM, true)).isNull();
        assertThat(AdminEmailAvailability.check(user, EMAIL_VERIFICATION, true))
                .isEqualTo(AdminEmailUnavailableReason.ALREADY_VERIFIED);
    }

    @Test
    void aDeletedAccountGetsNothing() {
        User user = user();
        user.setStatus(AccountStatus.DELETED);
        for (AdminEmailTemplate template : AdminEmailTemplate.values()) {
            assertThat(AdminEmailAvailability.check(user, template, true))
                    .isEqualTo(AdminEmailUnavailableReason.ACCOUNT_DELETED);
        }
    }

    @Test
    void anAccountWithNoEmailGetsNothing() {
        User user = user();
        user.setEmail(" ");
        assertThat(AdminEmailAvailability.check(user, CUSTOM, true)).isEqualTo(AdminEmailUnavailableReason.NO_EMAIL);
    }

    @Test
    void passwordResetNeedsAnActivePasswordAccount() {
        User oauth = user();
        oauth.setAuthProvider(AuthProvider.GOOGLE);
        assertThat(AdminEmailAvailability.check(oauth, PASSWORD_RESET, true))
                .isEqualTo(AdminEmailUnavailableReason.NOT_PASSWORD_ACCOUNT);

        User suspended = user();
        suspended.setStatus(AccountStatus.SUSPENDED);
        assertThat(AdminEmailAvailability.check(suspended, PASSWORD_RESET, true))
                .isEqualTo(AdminEmailUnavailableReason.NOT_ACTIVE);
    }

    @Test
    void verificationNeedsAnUnverifiedAddress() {
        User user = user();
        user.setEmailVerifiedAt(null);
        assertThat(AdminEmailAvailability.check(user, EMAIL_VERIFICATION, true)).isNull();
    }

    @Test
    void welcomeNeedsAHostedEvent() {
        assertThat(AdminEmailAvailability.check(user(), PROVISIONED_HOST_WELCOME, false))
                .isEqualTo(AdminEmailUnavailableReason.NO_HOSTED_EVENTS);
    }
}
```

If `AuthProvider` has no `GOOGLE` constant, use whichever non-`LOCAL` constant it declares (`grep -n "^\s*[A-Z]" src/main/java/event_social_media/model/user/AuthProvider.java`).

- [ ] **Step 2: Run it, expect a compile failure**

Run: `./gradlew test --tests 'event_social_media.service.mail.admin.AdminEmailAvailabilityTest'`
Expected: FAIL, `package event_social_media.service.mail.admin does not exist`.

- [ ] **Step 3: Implement**

`AdminEmailTemplate.java`:

```java
package event_social_media.service.mail.admin;

/** The emails an admin can send one account on demand. Fixed in code; none is editable. */
public enum AdminEmailTemplate {
    PASSWORD_RESET,
    PROVISIONED_HOST_WELCOME,
    EMAIL_VERIFICATION,
    CUSTOM
}
```

`AdminEmailUnavailableReason.java`:

```java
package event_social_media.service.mail.admin;

/** Why a template cannot go to an account right now. Sent to the admin panel as is. */
public enum AdminEmailUnavailableReason {
    ACCOUNT_DELETED,
    NO_EMAIL,
    NOT_ACTIVE,
    NOT_PASSWORD_ACCOUNT,
    ALREADY_VERIFIED,
    NO_HOSTED_EVENTS
}
```

`AdminEmailAvailability.java`:

```java
package event_social_media.service.mail.admin;

import event_social_media.model.user.AccountStatus;
import event_social_media.model.user.AuthProvider;
import event_social_media.model.user.User;

/**
 * Whether a template may go to an account. Pure, so the rules are tested without a database; the
 * one fact that needs a query (does the account host any event) is passed in.
 */
public final class AdminEmailAvailability {

    private AdminEmailAvailability() {
    }

    /** @return null when the template may be sent, otherwise why not */
    public static AdminEmailUnavailableReason check(User user, AdminEmailTemplate template, boolean hostsEvents) {
        if (user.getStatus() == AccountStatus.DELETED || user.getDeletedAt() != null) {
            return AdminEmailUnavailableReason.ACCOUNT_DELETED;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return AdminEmailUnavailableReason.NO_EMAIL;
        }
        return switch (template) {
            case PASSWORD_RESET -> {
                // The same accounts Forgot password would mail; anything else gets a link to a form
                // that cannot help it.
                if (Boolean.TRUE.equals(user.getIsGuestAccount()) || user.getAuthProvider() != AuthProvider.LOCAL
                        || user.getPasswordHash() == null) {
                    yield AdminEmailUnavailableReason.NOT_PASSWORD_ACCOUNT;
                }
                yield user.getStatus() == AccountStatus.ACTIVE ? null : AdminEmailUnavailableReason.NOT_ACTIVE;
            }
            case EMAIL_VERIFICATION -> user.isEmailVerified() ? AdminEmailUnavailableReason.ALREADY_VERIFIED : null;
            case PROVISIONED_HOST_WELCOME -> hostsEvents ? null : AdminEmailUnavailableReason.NO_HOSTED_EVENTS;
            case CUSTOM -> null;
        };
    }
}
```

- [ ] **Step 4: Run it, expect a pass**

Run: `./gradlew test --tests 'event_social_media.service.mail.admin.AdminEmailAvailabilityTest'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/mail/admin src/test/java/event_social_media/service/mail/admin
git commit -m "feat(admin-email): templates and availability rules"
```

---

### Task 4: Error codes, audit action, repository queries, DTOs

No behaviour on its own; the next task's tests cover it.

**Files:**
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java`
- Modify: `src/main/java/event_social_media/model/audit/AdminAuditAction.java`
- Modify: `src/main/java/event_social_media/repository/event/EventHostRepository.java`
- Create: `src/main/java/event_social_media/dto/mail/AdminEmailRequestDto.java`, `AdminEmailTemplateDto.java`, `AdminEmailPreviewDto.java`, `AdminWelcomePreviewRequestDto.java`

- [ ] **Step 1: Error codes**

In `ErrorCode`, after `QUIZ_CLOSES_AT_INVALID(3102),` (end of the 3xxx block):

```java
    /** 3103 — The event named for an admin welcome email is not hosted by that account. {@code 400}. */
    EMAIL_EVENT_NOT_HOSTED(3103),

    /** 3104 — A custom admin email needs both a subject and a body. {@code 400}. */
    EMAIL_MESSAGE_REQUIRED(3104),
```

After `ERROR_TRACKING_DISABLED(5174),` (end of the 5xxx block):

```java
    /**
     * 5175 — The admin email template cannot go to this account now (deleted, no address, already
     * verified, …). {@code GET /api/admin/users/{id}/emails/templates} gives the reason. {@code 409}.
     */
    EMAIL_TEMPLATE_UNAVAILABLE(5175),
```

Before committing, check those numbers are still free: `grep -n "(3103)\|(3104)\|(5175)" src/main/java/event_social_media/exception/ErrorCode.java` must show only the new lines. If `staging` has taken them since, use the next free ones and update the frontend plan's `ERROR_CODES` task to match.

- [ ] **Step 2: Audit action** (append to `AdminAuditAction`, after `EVENT_MODULE_CONFIG_RESET`, adding the comma)

```java
    /** An admin sent one account a predefined email; details: template, locale, eventId (welcome only). Never the text. Target type USER. */
    EMAIL_SENT
```

The `action` column is `varchar(50)` with no check constraint, so no migration is needed.

- [ ] **Step 3: Repository queries** (add to `EventHostRepository`)

```java
    /** Whether the user hosts any event, co-hosting included. */
    boolean existsByMember_User_Id(UUID userId);

    boolean existsByEvent_IdAndMember_User_Id(UUID eventId, UUID userId);
```

- [ ] **Step 4: DTOs**

`AdminEmailRequestDto.java`:

```java
package event_social_media.dto.mail;

import event_social_media.service.mail.admin.AdminEmailTemplate;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/** Body of the admin email preview and send endpoints. Both take exactly the same body. */
@Data
public class AdminEmailRequestDto {

    @NotNull
    private AdminEmailTemplate template;

    /** {@code en} or {@code el}; null means the account's saved language. */
    @Pattern(regexp = "en|el")
    private String locale;

    /** Required for {@code PROVISIONED_HOST_WELCOME}: an event the account hosts. */
    private UUID eventId;

    /** {@code CUSTOM} only. */
    @Size(max = 150)
    private String subject;

    /** {@code CUSTOM} only. Plain text; line breaks are kept. */
    @Size(max = 5000)
    private String body;
}
```

`AdminEmailTemplateDto.java`:

```java
package event_social_media.dto.mail;

import event_social_media.service.mail.admin.AdminEmailTemplate;
import event_social_media.service.mail.admin.AdminEmailUnavailableReason;

/** One template as offered for one account; {@code unavailableReason} is null when available. */
public record AdminEmailTemplateDto(AdminEmailTemplate key, boolean available,
                                    AdminEmailUnavailableReason unavailableReason) {
}
```

`AdminEmailPreviewDto.java`:

```java
package event_social_media.dto.mail;

/** The email exactly as composed for delivery, except that any token link holds a placeholder. */
public record AdminEmailPreviewDto(String to, String subject, String html, String text) {
}
```

`AdminWelcomePreviewRequestDto.java`:

```java
package event_social_media.dto.mail;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Body of {@code POST /api/admin/events/welcome-preview}: only what the welcome email shows, so
 * the provision form can preview it before the event exists.
 */
@Data
public class AdminWelcomePreviewRequestDto {

    @NotNull
    private UUID hostUserId;

    @NotBlank
    private String title;

    private OffsetDateTime startAt;

    private String timezone;

    private String locationName;

    private String locationAddress;

    @Pattern(regexp = "en|el")
    private String locale;
}
```

- [ ] **Step 5: Compile**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/exception/ErrorCode.java src/main/java/event_social_media/model/audit/AdminAuditAction.java src/main/java/event_social_media/repository/event/EventHostRepository.java src/main/java/event_social_media/dto/mail
git commit -m "feat(admin-email): error codes, audit action, DTOs"
```

---

### Task 5: `AdminEmailService`

**Files:**
- Create: `src/main/java/event_social_media/service/mail/admin/AdminEmailService.java`

- [ ] **Step 1: Implement** (it is covered end to end by Task 6's controller tests, which need real tokens, transactions and commits)

```java
package event_social_media.service.mail.admin;

import event_social_media.config.AuthTokenProperties;
import event_social_media.dto.mail.AdminEmailPreviewDto;
import event_social_media.dto.mail.AdminEmailRequestDto;
import event_social_media.dto.mail.AdminEmailTemplateDto;
import event_social_media.dto.mail.AdminWelcomePreviewRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.model.user.UserTokenPurpose;
import event_social_media.repository.event.EventHostRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.audit.AdminAuditService;
import event_social_media.service.auth.UserTokenService;
import event_social_media.service.mail.TransactionalMailService;
import event_social_media.service.notification.email.EmailMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * The predefined emails an admin sends one account from the Accounts panel, and the welcome email
 * provisioning sends.
 *
 * <p>Preview and send compose through the same {@code TransactionalMailService} methods, so the
 * preview is the delivered email. The one difference: a template that carries a single-use link
 * gets {@link #PREVIEW_TOKEN} in preview, because a real token is a credential and minting one to
 * look at it would also retire the account's live link.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminEmailService {

    static final String PREVIEW_TOKEN = "preview";
    /** Stands in for the event id when the welcome email is previewed before the event exists. */
    private static final UUID PREVIEW_EVENT_ID = new UUID(0L, 0L);

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final EventHostRepository eventHostRepository;
    private final UserTokenService userTokenService;
    private final TransactionalMailService mailService;
    private final AuthTokenProperties tokenProperties;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<AdminEmailTemplateDto> templatesFor(UUID userId) {
        User user = requireUser(userId);
        boolean hostsEvents = eventHostRepository.existsByMember_User_Id(userId);
        return Arrays.stream(AdminEmailTemplate.values())
                .map(template -> {
                    AdminEmailUnavailableReason reason = AdminEmailAvailability.check(user, template, hostsEvents);
                    return new AdminEmailTemplateDto(template, reason == null, reason);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminEmailPreviewDto preview(UUID userId, AdminEmailRequestDto request) {
        User user = requireUser(userId);
        requireAvailable(user, request.getTemplate());
        return toPreview(compose(user, request, () -> PREVIEW_TOKEN));
    }

    @Transactional
    public void send(UUID userId, AdminEmailRequestDto request, AdminActor actor) {
        User user = requireUser(userId);
        requireAvailable(user, request.getTemplate());
        EmailMessage message = compose(user, request, () -> issueToken(user, request.getTemplate()));
        mailService.send(message, "admin " + request.getTemplate().name().toLowerCase(Locale.ROOT));

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("template", request.getTemplate().name());
        details.put("locale", locale(user, request.getLocale()).toLanguageTag());
        if (request.getTemplate() == AdminEmailTemplate.PROVISIONED_HOST_WELCOME) {
            details.put("eventId", request.getEventId().toString());
        }
        adminAuditService.record(actor, AdminAuditAction.EMAIL_SENT, "USER", user.getId(),
                request.getEventId(), details);
    }

    /** The welcome email provisioning would send, before the event exists. */
    @Transactional(readOnly = true)
    public AdminEmailPreviewDto previewWelcome(AdminWelcomePreviewRequestDto request) {
        User host = requireUser(request.getHostUserId());
        requireEmail(host);
        return toPreview(mailService.composeProvisionedHostWelcome(host.getEmail(), host.getFirstName(),
                request.getTitle(), PREVIEW_EVENT_ID, request.getStartAt(), request.getTimezone(),
                request.getLocationName(), request.getLocationAddress(), locale(host, request.getLocale())));
    }

    /**
     * Sends the welcome email for a just-provisioned event, in the host's saved language. Quietly
     * skips a host with no usable address: provisioning has already succeeded and must not fail
     * over an email.
     */
    @Transactional(readOnly = true)
    public void sendProvisionedWelcome(UUID hostUserId, UUID eventId) {
        User host = requireUser(hostUserId);
        if (AdminEmailAvailability.check(host, AdminEmailTemplate.CUSTOM, true) != null) {
            log.info("Skipping the provisioned-event welcome for host {}: no usable address", hostUserId);
            return;
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
        mailService.send(welcome(host, event, locale(host, null)), "provisioned host welcome");
    }

    private EmailMessage compose(User user, AdminEmailRequestDto request, Supplier<String> token) {
        Locale locale = locale(user, request.getLocale());
        return switch (request.getTemplate()) {
            case PASSWORD_RESET -> mailService.composePasswordReset(user.getEmail(), token.get(),
                    tokenProperties.getResetValidMinutes(), locale);
            case EMAIL_VERIFICATION -> mailService.composeEmailVerification(user.getEmail(), user.getFirstName(),
                    token.get(), locale);
            case PROVISIONED_HOST_WELCOME -> welcome(user, requireHostedEvent(user, request.getEventId()), locale);
            case CUSTOM -> {
                if (isBlank(request.getSubject()) || isBlank(request.getBody())) {
                    throw new BadRequestException(ErrorCode.EMAIL_MESSAGE_REQUIRED,
                            "A custom email needs a subject and a body.");
                }
                yield mailService.composeCustom(user.getEmail(), request.getSubject().trim(), request.getBody().trim());
            }
        };
    }

    private EmailMessage welcome(User host, Event event, Locale locale) {
        return mailService.composeProvisionedHostWelcome(host.getEmail(), host.getFirstName(), event.getTitle(),
                event.getId(), event.getStartAt(), event.getTimezone(), event.getLocationName(),
                event.getLocationAddress(), locale);
    }

    /** Retires the account's earlier link of the same kind, exactly as the self-service flows do. */
    private String issueToken(User user, AdminEmailTemplate template) {
        return switch (template) {
            case PASSWORD_RESET -> userTokenService.issue(user, UserTokenPurpose.PASSWORD_RESET,
                    tokenProperties.getResetValidMinutes(), ChronoUnit.MINUTES);
            case EMAIL_VERIFICATION -> userTokenService.issue(user, UserTokenPurpose.EMAIL_VERIFICATION,
                    tokenProperties.getVerificationValidHours(), ChronoUnit.HOURS);
            default -> throw new IllegalStateException(template + " carries no token");
        };
    }

    private Event requireHostedEvent(User user, UUID eventId) {
        if (eventId == null || !eventHostRepository.existsByEvent_IdAndMember_User_Id(eventId, user.getId())) {
            throw new BadRequestException(ErrorCode.EMAIL_EVENT_NOT_HOSTED,
                    "The welcome email needs an event this account hosts.");
        }
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
    }

    private void requireAvailable(User user, AdminEmailTemplate template) {
        boolean hostsEvents = template != AdminEmailTemplate.PROVISIONED_HOST_WELCOME
                || eventHostRepository.existsByMember_User_Id(user.getId());
        AdminEmailUnavailableReason reason = AdminEmailAvailability.check(user, template, hostsEvents);
        if (reason != null) {
            throw new ConflictException(ErrorCode.EMAIL_TEMPLATE_UNAVAILABLE,
                    template + " cannot be sent to this account: " + reason);
        }
    }

    private void requireEmail(User user) {
        AdminEmailUnavailableReason reason = AdminEmailAvailability.check(user, AdminEmailTemplate.CUSTOM, true);
        if (reason != null) {
            throw new ConflictException(ErrorCode.EMAIL_TEMPLATE_UNAVAILABLE,
                    "This account cannot be emailed: " + reason);
        }
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private static Locale locale(User user, String requested) {
        return Locale.forLanguageTag(requested != null ? requested : user.getLocale());
    }

    private static AdminEmailPreviewDto toPreview(EmailMessage message) {
        return new AdminEmailPreviewDto(message.toAddress(), message.subject(), message.htmlBody(), message.textBody());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
```

Check imports compile against the real package names: `grep -rn "^package" src/main/java/event_social_media/exception/ResourceNotFoundException.java src/main/java/event_social_media/repository/event/EventRepository.java src/main/java/event_social_media/config/AuthTokenProperties.java`.

- [ ] **Step 2: Compile**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/event_social_media/service/mail/admin/AdminEmailService.java
git commit -m "feat(admin-email): preview and send service"
```

---

### Task 6: Account email endpoints

**Files:**
- Create: `src/main/java/event_social_media/controller/user/AdminUserEmailController.java`
- Test: `src/test/java/event_social_media/controller/user/AdminUserEmailControllerTest.java`

- [ ] **Step 1: Write the failing tests**

Not `@Transactional`: delivery waits for commit, so a rolled-back test transaction would never send (see `AuthControllerEmailFlowTest`).

```java
package event_social_media.controller.user;

import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.event.Event;
import event_social_media.model.user.AuthProvider;
import event_social_media.model.user.User;
import event_social_media.repository.audit.AdminAuditLogRepository;
import event_social_media.repository.user.UserRepository;
import event_social_media.service.notification.email.EmailMessage;
import event_social_media.service.notification.email.EmailSender;
import event_social_media.service.storage.StorageService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminUserEmailControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private UserRepository userRepository;
    @Autowired private AdminAuditLogRepository auditRepository;
    @MockBean private EmailSender emailSender;
    @MockBean private StorageService storageService;

    private UsernamePasswordAuthenticationToken admin() {
        UUID adminId = fixtures.newUser().getId(); // the guidelines gate refuses writes from an id with no acceptance
        return new UsernamePasswordAuthenticationToken(adminId.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private User passwordHost() {
        User user = fixtures.newUser();
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setPasswordHash("hash");
        return userRepository.save(user);
    }

    private static String body(String template, String extra) {
        return "{\"template\":\"" + template + "\"" + extra + "}";
    }

    @Test
    void templates_reportAvailability() throws Exception {
        User host = passwordHost();

        mockMvc.perform(get("/api/admin/users/{id}/emails/templates", host.getId()).with(authentication(admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.key=='EMAIL_VERIFICATION')].unavailableReason").value("ALREADY_VERIFIED"))
                .andExpect(jsonPath("$[?(@.key=='PROVISIONED_HOST_WELCOME')].unavailableReason").value("NO_HOSTED_EVENTS"))
                .andExpect(jsonPath("$[?(@.key=='PASSWORD_RESET')].available").value(true));
    }

    @Test
    void preview_returnsTheEmailWithAPlaceholderLinkAndSendsNothing() throws Exception {
        User host = passwordHost();

        mockMvc.perform(post("/api/admin/users/{id}/emails/preview", host.getId()).with(authentication(admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body("PASSWORD_RESET", ",\"locale\":\"en\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.to").value(host.getEmail()))
                .andExpect(jsonPath("$.subject").value("Reset your password"))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("token=preview")));

        verify(emailSender, never()).send(any());
        assertThat(auditRepository.findAll()).noneMatch(r -> host.getId().equals(r.getTargetId())
                && r.getAction() == AdminAuditAction.EMAIL_SENT);
    }

    @Test
    void send_deliversARealLinkAndAudits() throws Exception {
        User host = passwordHost();

        mockMvc.perform(post("/api/admin/users/{id}/emails/send", host.getId()).with(authentication(admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body("PASSWORD_RESET", "")))
                .andExpect(status().isNoContent());

        ArgumentCaptor<EmailMessage> sent = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(sent.capture());
        assertThat(sent.getValue().toAddress()).isEqualTo(host.getEmail());
        assertThat(sent.getValue().textBody()).contains("token=").doesNotContain("token=preview");
        assertThat(auditRepository.findAll()).anyMatch(r -> host.getId().equals(r.getTargetId())
                && r.getAction() == AdminAuditAction.EMAIL_SENT
                && "PASSWORD_RESET".equals(r.getDetails().get("template")));
    }

    @Test
    void welcome_needsAnEventTheAccountHosts() throws Exception {
        User host = passwordHost();
        Event hosted = fixtures.newEventHostedBy(host);
        Event other = fixtures.newEventHostedBy(fixtures.newUser());

        mockMvc.perform(post("/api/admin/users/{id}/emails/preview", host.getId()).with(authentication(admin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("PROVISIONED_HOST_WELCOME", ",\"eventId\":\"" + other.getId() + "\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(3103));

        mockMvc.perform(post("/api/admin/users/{id}/emails/preview", host.getId()).with(authentication(admin()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("PROVISIONED_HOST_WELCOME", ",\"eventId\":\"" + hosted.getId() + "\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject").value("Your event " + hosted.getTitle() + " is ready"))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("/events/" + hosted.getId())));
    }

    @Test
    void send_ofAnUnavailableTemplate_isAConflict() throws Exception {
        User host = passwordHost(); // already verified

        mockMvc.perform(post("/api/admin/users/{id}/emails/send", host.getId()).with(authentication(admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body("EMAIL_VERIFICATION", "")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5175));
        verify(emailSender, never()).send(any());
    }

    @Test
    void custom_needsASubjectAndBody() throws Exception {
        User host = passwordHost();

        mockMvc.perform(post("/api/admin/users/{id}/emails/preview", host.getId()).with(authentication(admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(body("CUSTOM", ",\"subject\":\"Hi\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value(3104));
    }

    @Test
    void nonAdmins_areForbidden() throws Exception {
        User host = passwordHost();
        var user = new UsernamePasswordAuthenticationToken(fixtures.newUser().getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(get("/api/admin/users/{id}/emails/templates", host.getId()).with(authentication(user)))
                .andExpect(status().isForbidden());
    }
}
```

Before running, confirm the error response's JSON field for the numeric code: `grep -rn "errorCode" src/main/java/event_social_media/exception/*Handler*.java | head -3`. If it is named differently, change `$.errorCode` in the three assertions to match.

- [ ] **Step 2: Run them, expect failures**

Run: `./gradlew test --tests 'event_social_media.controller.user.AdminUserEmailControllerTest'`
Expected: FAIL, 404 for every request (no controller yet).

- [ ] **Step 3: Implement the controller**

```java
package event_social_media.controller.user;

import event_social_media.dto.mail.AdminEmailPreviewDto;
import event_social_media.dto.mail.AdminEmailRequestDto;
import event_social_media.dto.mail.AdminEmailTemplateDto;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.mail.admin.AdminEmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Predefined emails an admin previews and sends to one account. See {@link AdminEmailService}. */
@Tag(name = "Users", description = "Admin emails to one account")
@RestController
@RequestMapping("/api/admin/users/{userId}/emails")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserEmailController {

    private final AdminEmailService adminEmailService;
    private final ClientAddressResolver clientAddressResolver;

    @Operation(summary = "The templates, and whether each can go to this account")
    @GetMapping("/templates")
    public List<AdminEmailTemplateDto> templates(@PathVariable UUID userId) {
        return adminEmailService.templatesFor(userId);
    }

    @Operation(summary = "Render an email without sending it")
    @PostMapping("/preview")
    public AdminEmailPreviewDto preview(@PathVariable UUID userId, @Valid @RequestBody AdminEmailRequestDto dto) {
        return adminEmailService.preview(userId, dto);
    }

    @Operation(summary = "Send an email")
    @PostMapping("/send")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void send(@PathVariable UUID userId, @Valid @RequestBody AdminEmailRequestDto dto,
                     Authentication authentication, HttpServletRequest request) {
        adminEmailService.send(userId, dto, new AdminActor(UUID.fromString((String) authentication.getPrincipal()),
                clientAddressResolver.resolve(request)));
    }
}
```

- [ ] **Step 4: Run the tests, expect a pass**

Run: `./gradlew test --tests 'event_social_media.controller.user.AdminUserEmailControllerTest'`
Expected: PASS. If `templates_reportAvailability` fails because JsonPath filters return arrays, change those three matchers to `.value(org.hamcrest.Matchers.contains("ALREADY_VERIFIED"))` (and likewise for the others).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/controller/user/AdminUserEmailController.java src/test/java/event_social_media/controller/user/AdminUserEmailControllerTest.java
git commit -m "feat(admin-email): templates, preview and send endpoints"
```

---

### Task 7: Welcome email on provisioning, and its preview

**Files:**
- Modify: `src/main/java/event_social_media/dto/event/AdminEventProvisionRequestDto.java`
- Modify: `src/main/java/event_social_media/controller/event/AdminEventProvisioningController.java`
- Test: `src/test/java/event_social_media/controller/event/AdminEventProvisioningEmailTest.java`

- [ ] **Step 1: Write the failing tests**

Non-transactional for the same reason as Task 6; uses `TestFixtures` and the same body as `AdminEventProvisioningControllerTest`.

```java
package event_social_media.controller.event;

import event_social_media.model.platform.PlanScope;
import event_social_media.model.user.User;
import event_social_media.model.user.UserTokenPurpose;
import event_social_media.repository.platform.PlanTierRepository;
import event_social_media.repository.user.UserTokenRepository;
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
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminEventProvisioningEmailTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestFixtures fixtures;
    @Autowired private PlanTierRepository planTierRepository;
    @Autowired private UserTokenRepository userTokenRepository;
    @MockBean private EmailSender emailSender;

    private String body(User host, String notifyHost) {
        String plan = planTierRepository.findByScopeAndEventTypeKeyAndIsDefaultTrue(PlanScope.EVENT, "WEDDING")
                .orElseThrow().getCode();
        return """
                {
                  "hostUserId": "%s",%s
                  "event": {
                    "title": "Admin Provisioned Wedding",
                    "eventType": "WEDDING",
                    "visibility": "PRIVATE",
                    "startAt": "2027-01-01T18:00:00Z",
                    "timezone": "Europe/Athens",
                    "locationName": "Villa Rosa",
                    "brandingSettings": {},
                    "planTierCode": "%s"
                  }
                }
                """.formatted(host.getId(), notifyHost, plan);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void provisioning_emailsTheHostByDefault_withoutAnyPasswordLink() throws Exception {
        User host = fixtures.newUser();

        mockMvc.perform(post("/api/admin/events").contentType(MediaType.APPLICATION_JSON).content(body(host, "")))
                .andExpect(status().isOk());

        ArgumentCaptor<EmailMessage> sent = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(sent.capture());
        assertThat(sent.getValue().toAddress()).isEqualTo(host.getEmail());
        assertThat(sent.getValue().subject()).isEqualTo("Your event Admin Provisioned Wedding is ready");
        assertThat(sent.getValue().textBody()).doesNotContain("token=");
        assertThat(userTokenRepository.findAll()).noneMatch(t -> t.getUser().getId().equals(host.getId())
                && t.getPurpose() == UserTokenPurpose.PASSWORD_RESET);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void provisioning_withNotifyHostFalse_sendsNothing() throws Exception {
        User host = fixtures.newUser();

        mockMvc.perform(post("/api/admin/events").contentType(MediaType.APPLICATION_JSON)
                        .content(body(host, " \"notifyHost\": false,")))
                .andExpect(status().isOk());

        verify(emailSender, never()).send(any());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void welcomePreview_rendersBeforeTheEventExists() throws Exception {
        User host = fixtures.newUser();

        mockMvc.perform(post("/api/admin/events/welcome-preview").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"hostUserId":"%s","title":"Summer Party","startAt":"2027-06-01T15:00:00Z",
                                 "timezone":"Europe/Athens","locationName":"Villa Rosa","locale":"en"}
                                """.formatted(host.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.to").value(host.getEmail()))
                .andExpect(jsonPath("$.subject").value("Your event Summer Party is ready"));
        verify(emailSender, never()).send(any());
    }
}
```

If `UserToken` exposes the user differently (`grep -n "private User\|private UUID user" src/main/java/event_social_media/model/user/UserToken.java`), adjust `t.getUser().getId()` to match.

- [ ] **Step 2: Run them, expect failures**

Run: `./gradlew test --tests 'event_social_media.controller.event.AdminEventProvisioningEmailTest'`
Expected: FAIL. The first test sees no email; the preview gets a 4xx (no mapping, or Jackson rejecting the unknown `notifyHost` property for test 2).

- [ ] **Step 3: Add `notifyHost`** (to `AdminEventProvisionRequestDto`)

```java
    /** Emails the host the provisioned-event welcome; null means true. */
    private Boolean notifyHost;
```

- [ ] **Step 4: Wire the controller**

Replace the body of `AdminEventProvisioningController` (keep its Javadoc) with:

```java
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminEventProvisioningController {

    private final EventService eventService;
    private final AdminEmailService adminEmailService;

    /**
     * The welcome email goes out after {@code createForHost} has committed (this method is not
     * transactional), so a failure to compose or send it can never undo the event.
     */
    @PostMapping("/events")
    public EventResponseDto create(@Valid @RequestBody AdminEventProvisionRequestDto dto) {
        EventResponseDto created = eventService.createForHost(dto.getEvent(), dto.getHostUserId());
        if (!Boolean.FALSE.equals(dto.getNotifyHost())) {
            try {
                adminEmailService.sendProvisionedWelcome(dto.getHostUserId(), created.getId());
            } catch (RuntimeException e) {
                log.error("Event {} was provisioned but its welcome email could not be composed", created.getId(), e);
            }
        }
        return created;
    }

    @PostMapping("/events/welcome-preview")
    public AdminEmailPreviewDto welcomePreview(@Valid @RequestBody AdminWelcomePreviewRequestDto dto) {
        return adminEmailService.previewWelcome(dto);
    }
}
```

Add `@Slf4j` to the class and the imports `lombok.extern.slf4j.Slf4j`, `event_social_media.service.mail.admin.AdminEmailService`, `event_social_media.dto.mail.AdminEmailPreviewDto`, `event_social_media.dto.mail.AdminWelcomePreviewRequestDto`. Check that `EventResponseDto` has `getId()` (`grep -n "private UUID id" src/main/java/event_social_media/dto/event/EventResponseDto.java`).

- [ ] **Step 5: Run the new tests and the existing provisioning tests**

Run: `./gradlew test --tests 'event_social_media.controller.event.AdminEventProvisioning*'`
Expected: PASS for both test classes.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/event/AdminEventProvisionRequestDto.java src/main/java/event_social_media/controller/event/AdminEventProvisioningController.java src/test/java/event_social_media/controller/event/AdminEventProvisioningEmailTest.java
git commit -m "feat(provisioning): email the host a welcome, with a preview"
```

---

### Task 8: FE integration notes, full test run

**Files:**
- Modify: the backend repo's FE integration guide for provisioning (`grep -rl "POST /api/admin/events" docs | head`), or create `docs/integration guides/admin-emails-fe-integration.md` next to it

- [ ] **Step 1: Write the guide**

```markdown
# FE integration: admin emails

Shipped 2026-10-12. Admin only.

## Account emails

- `GET /api/admin/users/{id}/emails/templates` → `[{ key, available, unavailableReason }]`
  - `key`: `PASSWORD_RESET` | `PROVISIONED_HOST_WELCOME` | `EMAIL_VERIFICATION` | `CUSTOM`
  - `unavailableReason`: `ACCOUNT_DELETED` | `NO_EMAIL` | `NOT_ACTIVE` | `NOT_PASSWORD_ACCOUNT` | `ALREADY_VERIFIED` | `NO_HOSTED_EVENTS` | null
- `POST /api/admin/users/{id}/emails/preview` with `{ template, locale?, eventId?, subject?, body? }` → `{ to, subject, html, text }`. Sends nothing. Token links hold `token=preview`.
- `POST /api/admin/users/{id}/emails/send` takes the same body → `204`. Audited as `EMAIL_SENT`.
- `locale`: `en` | `el`, default the account's. `eventId` is required for the welcome template and must be hosted by the account (else `400` 3103). `CUSTOM` needs `subject` (≤150) and `body` (≤5000), else `400` 3104. An unavailable template answers `409` 5175.

## Provisioning

- `POST /api/admin/events` takes optional `notifyHost` (default `true`): emails the host a welcome after the event is created. No password link; a delivery failure never fails provisioning.
- `POST /api/admin/events/welcome-preview` with `{ hostUserId, title, startAt?, timezone?, locationName?, locationAddress?, locale? }` → `{ to, subject, html, text }`. The button's link uses a placeholder event id until the event exists.
```

- [ ] **Step 2: Run the whole suite**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL. Fix any failure before continuing.

- [ ] **Step 3: Commit and push**

```bash
git add docs
git commit -m "docs: admin emails FE integration"
git push -u origin feat/admin-emails
```

Open the PR into `staging` only when the user asks.
