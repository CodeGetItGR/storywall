# Sign-up Source Tracking — Spring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save where each new account came from (a channel plus the raw visit facts), and let the admin Funnel filter by channel and list sign-ups, events, payers and revenue per channel.

**Architecture:** `register` and `oauth` accept an optional, validated `visitSource`. A pure rules class turns it (plus the invite token) into a `SignupChannel`, and the new account stores the channel and the raw facts in write-once columns on `users`. The Funnel queries take a `:channel` bind (the string `'ALL'` for no filter, so nothing binds a typed null) applied to the shared `ACCOUNTS` CTE and, for payment sections, to the order's payer. A new `/funnel/channels` endpoint groups the sign-up window by channel. The admin user endpoints return the saved source.

**Tech Stack:** Spring Boot, Spring Data JPA (native Postgres queries), Flyway, Bean Validation, MapStruct, JUnit 5, MockMvc, Testcontainers (Postgres tests self-skip without Docker).

**Spec:** `docs/superpowers/specs/2026-10-16-signup-source-tracking-design.md` in the storywall repo.

**Repo:** `C:\Users\User\IdeaProjects\event_social_media` (guestwall-be). Start a branch from the latest `staging`:

```bash
cd /c/Users/User/IdeaProjects/event_social_media
git checkout staging && git pull --ff-only
git checkout -b feat/signup-source-tracking
```

Test command form used below (Git Bash): `./gradlew test --tests "<fully.qualified.ClassName>"`.

---

## File map

| File | Responsibility |
|---|---|
| Create `src/main/resources/db/migration/V173__signup_source.sql` | Seven nullable columns on `users` + a check constraint |
| Create `src/main/java/event_social_media/model/user/SignupChannel.java` | The channel enum (`UNKNOWN` is never stored) |
| Modify `src/main/java/event_social_media/model/user/User.java` | Write-once fields for the columns |
| Create `src/main/java/event_social_media/dto/auth/VisitSourceDto.java` | Validated request object |
| Modify `src/main/java/event_social_media/dto/auth/RegisterRequestDto.java` | `@Valid visitSource` |
| Modify `src/main/java/event_social_media/dto/auth/OAuthLoginRequestDto.java` | `@Valid visitSource` |
| Create `src/main/java/event_social_media/service/auth/SignupSourceRules.java` | Classifier + copy onto a new `User` |
| Modify `src/main/java/event_social_media/service/auth/AuthService.java` | Apply on register |
| Modify `src/main/java/event_social_media/service/auth/OAuthService.java` | Apply on OAuth account creation only |
| Modify `src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java` | `:channel` filter + two channel queries |
| Create `src/main/java/event_social_media/dto/platform/FunnelChannelRowDto.java` | One row of `/funnel/channels` |
| Modify `src/main/java/event_social_media/service/platform/FunnelMetricsService.java` | Channel param + `channels()` |
| Modify `src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java` | `channel` params + new endpoint |
| Create `src/main/java/event_social_media/dto/user/SignupSourceDto.java` | Admin view of the saved source |
| Modify `src/main/java/event_social_media/dto/user/UserResponseDto.java` | `signupSource` (admin endpoints only) |
| Modify `src/main/java/event_social_media/mapper/user/UserMapper.java` | Ignore `signupSource` |
| Modify `src/main/java/event_social_media/service/user/UserService.java` | Fill `signupSource` on admin reads |
| Tests | `SignupSourceRulesTest`, `AuthControllerSignupSourceTest`, `OAuthServiceTest` (2 new tests), `FunnelChannelPostgresTest`, `UserServiceSignupSourceTest` |

---

### Task 1: Migration and `SignupChannel`

**Files:**
- Create: `src/main/resources/db/migration/V173__signup_source.sql`
- Create: `src/main/java/event_social_media/model/user/SignupChannel.java`

- [ ] **Step 1: Confirm the next migration number**

Run: `ls src/main/resources/db/migration | sort -V | tail -1`
Expected: `V172__error_event_http_status.sql`. If a higher number exists on `staging`, use the next free one instead of 173 everywhere below.

- [ ] **Step 2: Write the migration**

```sql
-- Where an account came from, saved once when it is created (see SignupSourceRules).
-- Null on every account created before this migration: those read as UNKNOWN.
alter table users
    add column signup_channel       varchar(20),
    add column signup_utm_source    varchar(100),
    add column signup_utm_medium    varchar(100),
    add column signup_utm_campaign  varchar(100),
    add column signup_ad_click      boolean,
    add column signup_referrer_host varchar(255),
    add column signup_landing_page  varchar(255),
    add constraint users_signup_channel_check check (signup_channel in
        ('INVITE', 'GIFT', 'ADS', 'SOCIAL', 'EMAIL', 'PARTNER', 'SEARCH', 'OTHER_SITE', 'DIRECT'));

create index idx_users_signup_channel on users (signup_channel);
```

- [ ] **Step 3: Write the enum**

```java
package event_social_media.model.user;

/**
 * Where an account came from, decided once at sign-up by
 * {@link event_social_media.service.auth.SignupSourceRules}. {@link #UNKNOWN} is never stored: it is
 * how a null {@code users.signup_channel} (no visit source sent, or an account from before the
 * column existed) reads in the admin API.
 */
public enum SignupChannel {
    INVITE,
    GIFT,
    ADS,
    SOCIAL,
    EMAIL,
    PARTNER,
    SEARCH,
    OTHER_SITE,
    DIRECT,
    UNKNOWN
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/migration/V173__signup_source.sql src/main/java/event_social_media/model/user/SignupChannel.java
git commit -m "feat(signup-source): add signup source columns and channel enum"
```

---

### Task 2: `User` fields and `VisitSourceDto`

**Files:**
- Modify: `src/main/java/event_social_media/model/user/User.java` (after `eventCreationLocked`, before `isEmailVerified()`)
- Create: `src/main/java/event_social_media/dto/auth/VisitSourceDto.java`
- Modify: `src/main/java/event_social_media/dto/auth/RegisterRequestDto.java` (end of class)
- Modify: `src/main/java/event_social_media/dto/auth/OAuthLoginRequestDto.java` (end of class)

- [ ] **Step 1: Add the entity fields**

Insert after the `eventCreationLocked` field in `User.java`:

```java
    /**
     * Where this account came from, decided at sign-up by
     * {@link event_social_media.service.auth.SignupSourceRules}. Null when no visit source was sent
     * (reads as {@link SignupChannel#UNKNOWN}). The {@code signup*} fields below are the raw facts it
     * was decided from, kept so a rule change can re-sort old accounts. All are written on insert
     * only.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "signup_channel", length = 20, updatable = false)
    private SignupChannel signupChannel;

    @Column(name = "signup_utm_source", length = 100, updatable = false)
    private String signupUtmSource;

    @Column(name = "signup_utm_medium", length = 100, updatable = false)
    private String signupUtmMedium;

    @Column(name = "signup_utm_campaign", length = 100, updatable = false)
    private String signupUtmCampaign;

    @Column(name = "signup_ad_click", updatable = false)
    private Boolean signupAdClick;

    @Column(name = "signup_referrer_host", length = 255, updatable = false)
    private String signupReferrerHost;

    @Column(name = "signup_landing_page", length = 255, updatable = false)
    private String signupLandingPage;
```

- [ ] **Step 2: Write `VisitSourceDto`**

```java
package event_social_media.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * The visit a sign-up came from, as the browser saw it: campaign parameters, whether it was an ad
 * click, the referring site's host and the first page's route pattern. Never a full URL, a click id
 * or a token. Validated like any other input: the frontend trims to these limits, so only a
 * tampered request fails, with a 400.
 *
 * @see event_social_media.service.auth.SignupSourceRules
 */
@Data
public class VisitSourceDto {

    private static final String NO_CONTROL_CHARACTERS = "^[^\\p{Cntrl}]*$";

    @Size(max = 100)
    @Pattern(regexp = NO_CONTROL_CHARACTERS)
    private String utmSource;

    @Size(max = 100)
    @Pattern(regexp = NO_CONTROL_CHARACTERS)
    private String utmMedium;

    @Size(max = 100)
    @Pattern(regexp = NO_CONTROL_CHARACTERS)
    private String utmCampaign;

    /** True when the landing URL carried a Google Ads click id (gclid, gbraid or wbraid). */
    private Boolean adClick;

    /** The referrer's hostname only, e.g. {@code l.instagram.com}. */
    @Size(max = 255)
    @Pattern(regexp = "^[A-Za-z0-9.-]*$")
    private String referrerHost;

    /** The first page's route pattern, e.g. {@code /gift/[token]}, never the real URL. */
    @NotBlank
    @Size(max = 255)
    @Pattern(regexp = "^/[\\x21-\\x7E]*$")
    private String landingPage;
}
```

- [ ] **Step 3: Add `visitSource` to both request DTOs**

Append to `RegisterRequestDto` (before the closing brace):

```java
    /**
     * Where the visitor came from, sent by the browser. Optional; validated, so a malformed one is a
     * 400 like any other field. Saved on the new account; see
     * {@link event_social_media.service.auth.SignupSourceRules}.
     */
    @Valid
    private VisitSourceDto visitSource;
```

Append to `OAuthLoginRequestDto` (before the closing brace), and add `import jakarta.validation.Valid;`:

```java
    /**
     * Where the visitor came from. Read only when this sign-in creates the account, like the sign-up
     * answers above; ignored on every other sign-in. Validated, so a malformed one is a 400.
     */
    @Valid
    private VisitSourceDto visitSource;
```

- [ ] **Step 4: Compile**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/model/user/User.java src/main/java/event_social_media/dto/auth/VisitSourceDto.java src/main/java/event_social_media/dto/auth/RegisterRequestDto.java src/main/java/event_social_media/dto/auth/OAuthLoginRequestDto.java
git commit -m "feat(signup-source): accept a visit source on register and oauth"
```

---

### Task 3: `SignupSourceRules` (TDD)

**Files:**
- Create: `src/test/java/event_social_media/service/auth/SignupSourceRulesTest.java`
- Create: `src/main/java/event_social_media/service/auth/SignupSourceRules.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.auth;

import event_social_media.dto.auth.VisitSourceDto;
import event_social_media.model.user.SignupChannel;
import event_social_media.model.user.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SignupSourceRulesTest {

    private static VisitSourceDto visit(String utmSource, String utmMedium, boolean adClick, String referrerHost, String landingPage) {
        VisitSourceDto dto = new VisitSourceDto();
        dto.setUtmSource(utmSource);
        dto.setUtmMedium(utmMedium);
        dto.setAdClick(adClick);
        dto.setReferrerHost(referrerHost);
        dto.setLandingPage(landingPage);
        return dto;
    }

    private static VisitSourceDto landing(String referrerHost) {
        return visit(null, null, false, referrerHost, "/");
    }

    @Test
    void noVisitSource_withoutInvite_isUnknown() {
        assertNull(SignupSourceRules.classify(null, false));
    }

    @Test
    void inviteToken_winsOverAnyVisit() {
        assertEquals(SignupChannel.INVITE, SignupSourceRules.classify(visit("instagram", "social", true, "l.instagram.com", "/"), true));
        assertEquals(SignupChannel.INVITE, SignupSourceRules.classify(null, true));
    }

    @Test
    void giftLandingPage_isGift_evenWithAnAdClick() {
        assertEquals(SignupChannel.GIFT, SignupSourceRules.classify(visit(null, null, true, null, "/gift/[token]"), false));
    }

    @Test
    void adClickOrPaidMedium_isAds() {
        assertEquals(SignupChannel.ADS, SignupSourceRules.classify(visit(null, null, true, "www.google.com", "/"), false));
        assertEquals(SignupChannel.ADS, SignupSourceRules.classify(visit("facebook", "paid_social", false, null, "/"), false));
        assertEquals(SignupChannel.ADS, SignupSourceRules.classify(visit("google", "CPC", false, null, "/"), false));
    }

    @Test
    void socialMediumSourceOrReferrer_isSocial() {
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(visit("newsletter-partner", "social", false, null, "/"), false));
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(visit("ig", null, false, null, "/"), false));
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(landing("l.instagram.com"), false));
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(landing("lm.facebook.com"), false));
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(landing("t.co"), false));
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(landing("www.youtube.com"), false));
    }

    @Test
    void emailMedium_isEmail() {
        assertEquals(SignupChannel.EMAIL, SignupSourceRules.classify(visit("mailchimp", "newsletter", false, null, "/"), false));
    }

    @Test
    void partnerMedium_isPartner() {
        assertEquals(SignupChannel.PARTNER, SignupSourceRules.classify(visit("studio-x", "partner", false, null, "/"), false));
    }

    @Test
    void searchEngineReferrer_isSearch() {
        assertEquals(SignupChannel.SEARCH, SignupSourceRules.classify(landing("www.google.gr"), false));
        assertEquals(SignupChannel.SEARCH, SignupSourceRules.classify(landing("duckduckgo.com"), false));
    }

    @Test
    void anyOtherReferrer_isOtherSite() {
        assertEquals(SignupChannel.OTHER_SITE, SignupSourceRules.classify(landing("weddingblog.gr"), false));
        // Not a social site just because the name appears inside another label.
        assertEquals(SignupChannel.OTHER_SITE, SignupSourceRules.classify(landing("notinstagram.example"), false));
    }

    @Test
    void visitWithNothing_isDirect() {
        assertEquals(SignupChannel.DIRECT, SignupSourceRules.classify(landing(null), false));
    }

    @Test
    void ruleOrder_socialSourceBeatsSearchReferrer() {
        assertEquals(SignupChannel.SOCIAL, SignupSourceRules.classify(visit("instagram", null, false, "www.google.com", "/"), false));
    }

    @Test
    void applyTo_copiesTheChannelAndTheRawFacts() {
        User user = new User();
        SignupSourceRules.applyTo(user, visit("instagram", "social", false, "L.Instagram.com", "/[slug]"), false);

        assertEquals(SignupChannel.SOCIAL, user.getSignupChannel());
        assertEquals("instagram", user.getSignupUtmSource());
        assertEquals("social", user.getSignupUtmMedium());
        assertNull(user.getSignupUtmCampaign());
        assertEquals(false, user.getSignupAdClick());
        assertEquals("l.instagram.com", user.getSignupReferrerHost());
        assertEquals("/[slug]", user.getSignupLandingPage());
    }

    @Test
    void applyTo_withoutAVisit_setsOnlyTheInviteChannel() {
        User user = new User();
        SignupSourceRules.applyTo(user, null, true);

        assertEquals(SignupChannel.INVITE, user.getSignupChannel());
        assertNull(user.getSignupLandingPage());
        assertNull(user.getSignupAdClick());
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.auth.SignupSourceRulesTest"`
Expected: FAIL, compilation error `cannot find symbol: class SignupSourceRules`.

- [ ] **Step 3: Write the implementation**

```java
package event_social_media.service.auth;

import event_social_media.dto.auth.VisitSourceDto;
import event_social_media.model.user.SignupChannel;
import event_social_media.model.user.User;

import java.util.Locale;
import java.util.Set;

/**
 * Decides an account's {@link SignupChannel} from the visit it came from, once, at sign-up. The first
 * matching rule wins; see the table in the sign-up source tracking design. Pure: no I/O, so every
 * rule is unit-tested in {@code SignupSourceRulesTest}.
 */
public final class SignupSourceRules {

    private static final String GIFT_PAGE = "/gift/";
    private static final Set<String> PAID_MEDIUMS = Set.of("cpc", "ppc", "paid", "paid_social", "display");
    private static final Set<String> SOCIAL_MEDIUMS = Set.of("social", "social_media");
    private static final Set<String> EMAIL_MEDIUMS = Set.of("email", "newsletter");
    private static final Set<String> SOCIAL_SOURCES =
            Set.of("instagram", "ig", "facebook", "fb", "tiktok", "pinterest", "linkedin", "x", "twitter", "youtube");
    private static final Set<String> SOCIAL_DOMAINS = Set.of("instagram.com", "facebook.com", "fb.com", "tiktok.com",
            "pinterest.com", "linkedin.com", "lnkd.in", "x.com", "t.co", "twitter.com", "youtube.com", "youtu.be");
    private static final Set<String> SEARCH_ENGINES = Set.of("google", "bing", "duckduckgo", "yahoo", "ecosia");

    private SignupSourceRules() {
    }

    /** Null means {@link SignupChannel#UNKNOWN}: no visit was sent and there is no invite. */
    public static SignupChannel classify(VisitSourceDto visit, boolean hasInvite) {
        if (hasInvite) return SignupChannel.INVITE;
        if (visit == null) return null;

        String source = lower(visit.getUtmSource());
        String medium = lower(visit.getUtmMedium());
        String host = lower(visit.getReferrerHost());

        if (visit.getLandingPage() != null && visit.getLandingPage().startsWith(GIFT_PAGE)) return SignupChannel.GIFT;
        if (Boolean.TRUE.equals(visit.getAdClick()) || PAID_MEDIUMS.contains(medium)) return SignupChannel.ADS;
        if (SOCIAL_MEDIUMS.contains(medium) || SOCIAL_SOURCES.contains(source) || isOnDomain(host, SOCIAL_DOMAINS)) {
            return SignupChannel.SOCIAL;
        }
        if (EMAIL_MEDIUMS.contains(medium)) return SignupChannel.EMAIL;
        if ("partner".equals(medium)) return SignupChannel.PARTNER;
        if (isSearchEngine(host)) return SignupChannel.SEARCH;
        if (host != null) return SignupChannel.OTHER_SITE;
        return SignupChannel.DIRECT;
    }

    /** Sets the channel and the raw facts on an account that is being created. */
    public static void applyTo(User user, VisitSourceDto visit, boolean hasInvite) {
        user.setSignupChannel(classify(visit, hasInvite));
        if (visit == null) return;
        user.setSignupUtmSource(visit.getUtmSource());
        user.setSignupUtmMedium(visit.getUtmMedium());
        user.setSignupUtmCampaign(visit.getUtmCampaign());
        user.setSignupAdClick(Boolean.TRUE.equals(visit.getAdClick()));
        user.setSignupReferrerHost(lower(visit.getReferrerHost()));
        user.setSignupLandingPage(visit.getLandingPage());
    }

    private static String lower(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    /** {@code l.instagram.com} is on {@code instagram.com}; {@code notinstagram.example} is not. */
    private static boolean isOnDomain(String host, Set<String> domains) {
        if (host == null) return false;
        for (String domain : domains) {
            if (host.equals(domain) || host.endsWith("." + domain)) return true;
        }
        return false;
    }

    /** {@code www.google.gr} and {@code google.com} are Google: a label named after the engine, then a TLD. */
    private static boolean isSearchEngine(String host) {
        if (host == null) return false;
        String[] labels = host.split("\\.");
        for (int i = 0; i < labels.length - 1; i++) {
            if (SEARCH_ENGINES.contains(labels[i])) return true;
        }
        return false;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.auth.SignupSourceRulesTest"`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/auth/SignupSourceRules.java src/test/java/event_social_media/service/auth/SignupSourceRulesTest.java
git commit -m "feat(signup-source): classify a visit into a signup channel"
```

---

### Task 4: Save the source on register (TDD)

**Files:**
- Create: `src/test/java/event_social_media/controller/auth/AuthControllerSignupSourceTest.java`
- Modify: `src/main/java/event_social_media/service/auth/AuthService.java:151` (in `createAccount`, after `user.setAdultConfirmedAt(...)`)

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.model.user.SignupChannel;
import event_social_media.model.user.User;
import event_social_media.repository.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerSignupSourceTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;

    private static String email() {
        return "source-" + UUID.randomUUID() + "@example.com";
    }

    private static Map<String, Object> body(String email, Object visitSource) {
        Map<String, Object> body = new HashMap<>(Map.of(
                "email", email, "password", "password123", "firstName", "Src", "lastName", "Tester",
                "acceptedGuidelinesVersion", "2026-09-30",
                "acceptedTermsVersion", "2026-10-15", "adultConfirmed", true));
        if (visitSource != null) body.put("visitSource", visitSource);
        return body;
    }

    private static Map<String, Object> instagramVisit() {
        Map<String, Object> visit = new HashMap<>();
        visit.put("utmSource", "instagram");
        visit.put("utmMedium", "social");
        visit.put("utmCampaign", "bio-link");
        visit.put("adClick", false);
        visit.put("referrerHost", "l.instagram.com");
        visit.put("landingPage", "/");
        return visit;
    }

    private void register(Map<String, Object> body, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void register_withAVisitSource_savesTheChannelAndTheFacts() throws Exception {
        String email = email();
        register(body(email, instagramVisit()), 201);

        User user = userRepository.findByEmail(email).orElseThrow();
        assertEquals(SignupChannel.SOCIAL, user.getSignupChannel());
        assertEquals("instagram", user.getSignupUtmSource());
        assertEquals("bio-link", user.getSignupUtmCampaign());
        assertFalse(user.getSignupAdClick());
        assertEquals("l.instagram.com", user.getSignupReferrerHost());
        assertEquals("/", user.getSignupLandingPage());
    }

    @Test
    void register_withoutAVisitSource_leavesTheChannelNull() throws Exception {
        String email = email();
        register(body(email, null), 201);

        assertNull(userRepository.findByEmail(email).orElseThrow().getSignupChannel());
    }

    @Test
    void register_withAnInviteToken_isInvite() throws Exception {
        String email = email();
        Map<String, Object> body = body(email, instagramVisit());
        // Redemption is best-effort: an unknown token still registers.
        body.put("inviteToken", UUID.randomUUID().toString());
        register(body, 201);

        assertEquals(SignupChannel.INVITE, userRepository.findByEmail(email).orElseThrow().getSignupChannel());
    }

    @Test
    void register_withAnOversizedUtmValue_isRejected() throws Exception {
        Map<String, Object> visit = instagramVisit();
        visit.put("utmCampaign", "x".repeat(101));
        String email = email();
        register(body(email, visit), 400);

        assertFalse(userRepository.findByEmail(email).isPresent());
    }

    @Test
    void register_withAFullUrlAsTheReferrerHost_isRejected() throws Exception {
        Map<String, Object> visit = instagramVisit();
        visit.put("referrerHost", "https://l.instagram.com/?u=x");
        register(body(email(), visit), 400);
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.controller.auth.AuthControllerSignupSourceTest"`
Expected: FAIL. `register_withAVisitSource_savesTheChannelAndTheFacts` and `register_withAnInviteToken_isInvite` fail (channel is null); the two 400 tests already pass, since validation exists from Task 2.

If `register_withAnInviteToken_isInvite` fails with a 429 instead, the uninvited-register budget is not the cause (the request carries a token); check `AuthControllerInviteRedemptionTest` for how it mocks invite redemption and copy that setup.

- [ ] **Step 3: Apply the rules in `AuthService.createAccount`**

Insert directly after `user.setAdultConfirmedAt(OffsetDateTime.now());` (line 151):

```java
        SignupSourceRules.applyTo(user, dto.getVisitSource(), dto.getInviteToken() != null);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.controller.auth.AuthControllerSignupSourceTest"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/auth/AuthService.java src/test/java/event_social_media/controller/auth/AuthControllerSignupSourceTest.java
git commit -m "feat(signup-source): save the visit source on register"
```

---

### Task 5: Save the source on OAuth account creation only (TDD)

**Files:**
- Modify: `src/test/java/event_social_media/service/auth/OAuthServiceTest.java` (add two tests after `login_newSubject_newEmail_createsNewOAuthAccount`)
- Modify: `src/main/java/event_social_media/service/auth/OAuthService.java:161` (in `createNewUser`, after `user.setAdultConfirmedAt(...)`)

- [ ] **Step 1: Write the failing tests**

Add these imports if missing: `event_social_media.dto.auth.VisitSourceDto`, `event_social_media.model.user.SignupChannel`. Add the tests:

```java
    private static VisitSourceDto adVisit() {
        VisitSourceDto visit = new VisitSourceDto();
        visit.setAdClick(true);
        visit.setReferrerHost("www.google.com");
        visit.setLandingPage("/");
        return visit;
    }

    @Test
    void login_newAccount_savesTheVisitSource() {
        Mockito.when(oidcIdTokenVerifier.verify(eq(OAuthProvider.GOOGLE), eq("token-src-new")))
                .thenReturn(new OidcClaims("sub-src-new", "src-new@example.com", true, "Src New", null, null, null));
        OAuthLoginRequestDto dto = request("token-src-new");
        dto.setVisitSource(adVisit());

        oAuthService.login(OAuthProvider.GOOGLE, dto, null, null);

        User created = userRepository.findByEmail("src-new@example.com").orElseThrow();
        assertEquals(SignupChannel.ADS, created.getSignupChannel());
        assertEquals("www.google.com", created.getSignupReferrerHost());
    }

    @Test
    void login_toAnExistingAccount_ignoresTheVisitSource() {
        User existing = fixtures.newUser();
        existing.setEmail("src-existing@example.com");
        userRepository.save(existing);
        Mockito.when(oidcIdTokenVerifier.verify(eq(OAuthProvider.GOOGLE), eq("token-src-existing")))
                .thenReturn(new OidcClaims("sub-src-existing", "src-existing@example.com", true, "Src Existing", null, null, null));
        OAuthLoginRequestDto dto = bareRequest("token-src-existing");
        dto.setVisitSource(adVisit());

        oAuthService.login(OAuthProvider.GOOGLE, dto, null, null);

        assertNull(userRepository.findByEmail("src-existing@example.com").orElseThrow().getSignupChannel());
    }
```

- [ ] **Step 2: Run them to verify the first fails**

Run: `./gradlew test --tests "event_social_media.service.auth.OAuthServiceTest"`
Expected: `login_newAccount_savesTheVisitSource` FAILS (channel null). Every other test passes.

- [ ] **Step 3: Apply the rules in `OAuthService.createNewUser`**

Insert directly after `user.setAdultConfirmedAt(OffsetDateTime.now());` (line 161):

```java
        SignupSourceRules.applyTo(user, dto.getVisitSource(), dto.getInviteToken() != null);
```

`linkAndVerify` and the already-linked path are untouched, so an existing account never gets a source.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./gradlew test --tests "event_social_media.service.auth.OAuthServiceTest"`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/auth/OAuthService.java src/test/java/event_social_media/service/auth/OAuthServiceTest.java
git commit -m "feat(signup-source): save the visit source when oauth creates an account"
```

---

### Task 6: Channel filter in the Funnel queries

**Files:**
- Modify: `src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java`
- Modify: `src/main/java/event_social_media/service/platform/FunnelMetricsService.java`

No test in this task: Task 8 covers it against Postgres. This task must leave everything compiling and the existing `FunnelMetricsPostgresTest` green.

- [ ] **Step 1: Add the filter to `ACCOUNTS` and a payer fragment**

In `FunnelMetricsRepository`, replace the `ACCOUNTS` constant with:

```java
    /**
     * Accounts in the funnel population that signed up in {@code [:since, :until)}, narrowed to one
     * sign-up channel unless {@code :channel} is {@code 'ALL'}. A null channel reads as UNKNOWN.
     */
    String ACCOUNTS = """
            accounts as (
                select u.id, u.created_at, u.email_verified_at, u.status, u.last_active_at
                from users u
                where u.is_guest_account = false and u.platform_role = 'USER'
                  and u.created_at >= :since and u.created_at < :until
                  and (:channel = 'ALL' or coalesce(u.signup_channel, 'UNKNOWN') = :channel)
            )""";

    /**
     * For a query over {@code event_orders o}: the order's payer (its buyer, or the event's primary
     * host for orders from before {@code buyer_user_id}) signed up through {@code :channel}. Always
     * true for {@code 'ALL'}.
     */
    String ORDER_PAYER_IN_CHANNEL = """
            (:channel = 'ALL' or exists (
                select 1 from users pu
                where pu.id = coalesce(o.buyer_user_id, (
                    select pm.user_id from event_hosts ph join event_members pm on pm.id = ph.member_id
                    where ph.event_id = o.event_id and ph.display_order = 0))
                  and coalesce(pu.signup_channel, 'UNKNOWN') = :channel))""";
```

- [ ] **Step 2: Bind `:channel` on the four account queries**

Add `@Param("channel") String channel` as the last parameter of `funnel`, `cohorts`, `signupsByProvider` and `accountsByLocale`. Their SQL is unchanged (it already uses `ACCOUNTS`). For example:

```java
    FunnelRow funnel(@Param("since") OffsetDateTime since,
                     @Param("until") OffsetDateTime until,
                     @Param("weekAgo") OffsetDateTime weekAgo,
                     @Param("monthAgo") OffsetDateTime monthAgo,
                     @Param("channel") String channel);
```

- [ ] **Step 3: Filter the payment queries by payer**

Replace each payment query as below (only the SQL `where` and the new parameter change).

`paidEvents`: in the `paid_events` CTE, change the `where` to:

```java
    @Query(value = """
            with paid_events as (
                select distinct o.event_id from event_orders o
                where o.kind = 'ACTIVATION' and o.status = 'PAID' and o.settled_by is null
                  and o.amount_minor > 0 and o.event_id is not null
                  and o.paid_at >= :since and o.paid_at < :until
                  and """ + ORDER_PAYER_IN_CHANNEL + """

            ),
```

The rest of that query stays as it is. Add `@Param("channel") String channel` after `now`.

`revenueByKind`:

```java
    @Query(value = """
            select o.currency as "currency", o.kind as "kind", count(*) as "orders",
                   cast(coalesce(sum(o.amount_minor), 0) as bigint) as "amountMinor"
            from event_orders o
            where o.status in ('PAID', 'REFUNDED') and o.settled_by is null and o.amount_minor > 0
              and o.paid_at >= :since and o.paid_at < :until
              and """ + ORDER_PAYER_IN_CHANNEL + """

            group by o.currency, o.kind
            order by o.currency, o.kind
            """, nativeQuery = true)
    List<RevenueRow> revenueByKind(@Param("since") OffsetDateTime since,
                                   @Param("until") OffsetDateTime until,
                                   @Param("channel") String channel);
```

`payingAccountsByCurrency`: add `and """ + ORDER_PAYER_IN_CHANNEL + """` plus an empty line after `and o.paid_at >= :since and o.paid_at < :until`, before `group by o.currency`, and the `channel` param.

`refundsByCurrency`: add the same line after `where r.status = 'REFUNDED' and r.decided_at >= :since and r.decided_at < :until`, before `group by o.currency`, and the `channel` param.

`refundCount` (it has no `o`, so it gets one through the refund's lines):

```java
    @Query(value = """
            select count(*) from refund_requests r
            where r.status = 'REFUNDED' and r.decided_at >= :since and r.decided_at < :until
              and exists (select 1 from refund_request_lines l join event_orders o on o.id = l.order_id
                          where l.request_id = r.id and """ + ORDER_PAYER_IN_CHANNEL + """
            )
            """, nativeQuery = true)
    long refundCount(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until,
                     @Param("channel") String channel);
```

`adminSettledOrders` and `ordersByBuyerType`: add the `and """ + ORDER_PAYER_IN_CHANNEL + """` line after their `o.paid_at` condition (before `group by` for `ordersByBuyerType`), and the `channel` param.

`discountRedemptions` and `partnerRedemptions` filter by the redeemer:

```java
    @Query(value = """
            select count(*) from discount_redemptions d
            where d.status = 'ACTIVE' and d.redeemed_at >= :since and d.redeemed_at < :until
              and not exists (select 1 from collaboration_redemptions c where c.id = d.id)
              and (:channel = 'ALL' or exists (select 1 from users du where du.id = d.redeemed_by
                   and coalesce(du.signup_channel, 'UNKNOWN') = :channel))
            """, nativeQuery = true)
    long discountRedemptions(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until,
                             @Param("channel") String channel);

    /** Partner codes: see {@link #discountRedemptions}. */
    @Query(value = """
            select count(*) from discount_redemptions d
            join collaboration_redemptions c on c.id = d.id
            where d.status = 'ACTIVE' and d.redeemed_at >= :since and d.redeemed_at < :until
              and (:channel = 'ALL' or exists (select 1 from users du where du.id = d.redeemed_by
                   and coalesce(du.signup_channel, 'UNKNOWN') = :channel))
            """, nativeQuery = true)
    long partnerRedemptions(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until,
                            @Param("channel") String channel);
```

Text-block note: `""" + X + """` must be followed by a newline before the next SQL line. The empty line in the snippets above is that newline. Without it the next SQL keyword is glued to the closing `)` of the fragment.

- [ ] **Step 4: Thread the channel through `FunnelMetricsService`**

Add the import `event_social_media.model.user.SignupChannel`, then:

```java
    /** What the queries bind for "no channel filter": a real string, never a typed null. */
    private static final String ALL_CHANNELS = "ALL";

    private static String channelParam(SignupChannel channel) {
        return channel == null ? ALL_CHANNELS : channel.name();
    }
```

Change the signatures and every repository call:

```java
    public FunnelMetricsResponseDto funnel(OffsetDateTime since, OffsetDateTime until, SignupChannel channel) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime from = since != null ? since : BEGINNING;
        OffsetDateTime to = until != null ? until : END;
        String channelParam = channelParam(channel);

        FunnelMetricsRepository.FunnelRow row = repository.funnel(from, to, now.minusDays(7), now.minusDays(30), channelParam);
```

- `repository.signupsByProvider(from, to, channelParam)`
- `repository.accountsByLocale(from, to, channelParam)`
- `dto.setPaidEvents(paidEvents(from, to, now, channelParam));` → `paidEvents(...)` gains a `String channel` param and calls `repository.paidEvents(from, to, now, channel)`
- `dto.setRevenue(revenue(from, to, channelParam));` → `revenue(...)` gains `String channel`, and passes it to `revenueByKind`, `refundsByCurrency`, `payingAccountsByCurrency`, `refundCount`, `adminSettledOrders`, `ordersByBuyerType`, `discountRedemptions` and `partnerRedemptions`

```java
    public List<FunnelCohortDto> cohorts(int weeks, SignupChannel channel) {
        ...
        for (FunnelMetricsRepository.CohortRow row : repository.cohorts(firstWeek, END, channelParam(channel))) {
```

- [ ] **Step 5: Update the controller and existing callers**

In `PlatformMetricsAdminController`, add the import `event_social_media.model.user.SignupChannel`, then:

```java
    @GetMapping("/funnel")
    public FunnelMetricsResponseDto funnel(
            @RequestParam(required = false) OffsetDateTime since,
            @RequestParam(required = false) OffsetDateTime until,
            @RequestParam(required = false) SignupChannel channel) {
        if (since != null && until != null && until.isBefore(since)) {
            throw new BadRequestException(ErrorCode.DATE_RANGE_INVALID, "'until' must not be before 'since'");
        }
        return funnelMetricsService.funnel(since, until, channel);
    }

    @GetMapping("/funnel/cohorts")
    public List<FunnelCohortDto> funnelCohorts(@RequestParam(defaultValue = "12") int weeks,
                                               @RequestParam(required = false) SignupChannel channel) {
        return funnelMetricsService.cohorts(Math.max(1, Math.min(weeks, 104)), channel);
    }
```

Add one sentence to the `/funnel` Javadoc: "{@code channel} narrows every section to accounts (or, for revenue and paid events, payers) that signed up through it; leaving it out means every channel."

Then find the other callers:

Run: `grep -rn "funnelMetricsService.funnel(\|funnelMetricsService.cohorts(\|\.funnel(SINCE\|\.cohorts(" src/test src/main`

Update every existing call in `FunnelMetricsPostgresTest` (and any other match) to pass `null` as the new last argument.

- [ ] **Step 6: Compile and run the existing funnel test**

Run: `./gradlew test --tests "event_social_media.service.platform.FunnelMetricsPostgresTest"`
Expected: PASS, or SKIPPED when Docker is not running. If skipped, start Docker Desktop and run it again: this test is the guard that the payer fragment did not change the unfiltered numbers.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java src/main/java/event_social_media/service/platform/FunnelMetricsService.java src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java src/test/java/event_social_media/service/platform/FunnelMetricsPostgresTest.java
git commit -m "feat(signup-source): filter the admin funnel by signup channel"
```

---

### Task 7: The `/funnel/channels` endpoint

**Files:**
- Create: `src/main/java/event_social_media/dto/platform/FunnelChannelRowDto.java`
- Modify: `src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java` (two queries + two row interfaces)
- Modify: `src/main/java/event_social_media/service/platform/FunnelMetricsService.java`
- Modify: `src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java`

- [ ] **Step 1: Write the DTO**

```java
package event_social_media.dto.platform;

import event_social_media.model.user.SignupChannel;
import lombok.Data;

import java.util.Map;
import java.util.TreeMap;

/**
 * One row of {@code GET /api/admin/metrics/funnel/channels}: the accounts that signed up in the
 * range through one channel, how many of them created an event and became paid hosts, and what
 * they have paid in total (provider-settled orders of any kind, by currency, in minor units).
 */
@Data
public class FunnelChannelRowDto {
    private SignupChannel channel;
    private long signedUp;
    private long createdEvent;
    private long paidHost;
    private Map<String, Long> revenueMinorByCurrency = new TreeMap<>();
}
```

- [ ] **Step 2: Add the two queries**

Add to `FunnelMetricsRepository` (after `accountsByLocale`):

```java
    /** The sign-up window grouped by channel; {@code :channel} is always {@code 'ALL'} here. */
    @Query(value = "with " + ACCOUNTS + ", " + FACTS + " " + """
            select coalesce(u.signup_channel, 'UNKNOWN') as "channel",
                   count(*) as "signedUp",
                   count(*) filter (where f.first_event_at is not null) as "createdEvent",
                   count(*) filter (where f.is_paid) as "paidHost"
            from facts f join users u on u.id = f.id
            group by 1
            """, nativeQuery = true)
    List<ChannelRow> channels(@Param("since") OffsetDateTime since,
                              @Param("until") OffsetDateTime until,
                              @Param("channel") String channel);

    /**
     * What the same accounts have paid, all time, by channel and currency: PAID, provider-settled,
     * above zero, any order kind. The payer is the buyer, or the primary host for older orders.
     */
    @Query(value = "with " + ACCOUNTS + ", " + FACTS + " " + """
            select coalesce(u.signup_channel, 'UNKNOWN') as "channel", o.currency as "currency",
                   cast(coalesce(sum(o.amount_minor), 0) as bigint) as "amountMinor"
            from event_orders o
            left join primary_hosts ph on ph.event_id = o.event_id
            join accounts a on a.id = coalesce(o.buyer_user_id, ph.user_id)
            join users u on u.id = a.id
            where o.status = 'PAID' and o.settled_by is null and o.amount_minor > 0
            group by 1, 2
            """, nativeQuery = true)
    List<ChannelRevenueRow> channelRevenue(@Param("since") OffsetDateTime since,
                                           @Param("until") OffsetDateTime until,
                                           @Param("channel") String channel);
```

And the row interfaces, next to the others:

```java
    interface ChannelRow {
        String getChannel();
        long getSignedUp();
        long getCreatedEvent();
        long getPaidHost();
    }

    interface ChannelRevenueRow {
        String getChannel();
        String getCurrency();
        long getAmountMinor();
    }
```

- [ ] **Step 3: Assemble the rows in the service**

Add the imports `event_social_media.dto.platform.FunnelChannelRowDto`, `java.util.Comparator` and `java.util.HashMap`, then:

```java
    /** Channels with at least one sign-up in the range, most sign-ups first. */
    @Transactional(readOnly = true)
    public List<FunnelChannelRowDto> channels(OffsetDateTime since, OffsetDateTime until) {
        OffsetDateTime from = since != null ? since : BEGINNING;
        OffsetDateTime to = until != null ? until : END;

        Map<String, FunnelChannelRowDto> byChannel = new HashMap<>();
        for (FunnelMetricsRepository.ChannelRow row : repository.channels(from, to, ALL_CHANNELS)) {
            FunnelChannelRowDto dto = new FunnelChannelRowDto();
            dto.setChannel(SignupChannel.valueOf(row.getChannel()));
            dto.setSignedUp(row.getSignedUp());
            dto.setCreatedEvent(row.getCreatedEvent());
            dto.setPaidHost(row.getPaidHost());
            byChannel.put(row.getChannel(), dto);
        }
        for (FunnelMetricsRepository.ChannelRevenueRow row : repository.channelRevenue(from, to, ALL_CHANNELS)) {
            FunnelChannelRowDto dto = byChannel.get(row.getChannel());
            if (dto != null) dto.getRevenueMinorByCurrency().put(row.getCurrency(), row.getAmountMinor());
        }

        List<FunnelChannelRowDto> rows = new ArrayList<>(byChannel.values());
        rows.sort(Comparator.comparingLong(FunnelChannelRowDto::getSignedUp).reversed()
                .thenComparing(row -> row.getChannel().name()));
        return rows;
    }
```

- [ ] **Step 4: Expose the endpoint**

Add to `PlatformMetricsAdminController`, after `funnelCohorts`, with the import `event_social_media.dto.platform.FunnelChannelRowDto`:

```java
    /**
     * Accounts that signed up in {@code [since, until)} grouped by sign-up channel: how many, how
     * many created an event, how many became paid hosts, and their total provider-settled revenue.
     * Not narrowed by a channel: it is the comparison across channels.
     */
    @GetMapping("/funnel/channels")
    public List<FunnelChannelRowDto> funnelChannels(
            @RequestParam(required = false) OffsetDateTime since,
            @RequestParam(required = false) OffsetDateTime until) {
        if (since != null && until != null && until.isBefore(since)) {
            throw new BadRequestException(ErrorCode.DATE_RANGE_INVALID, "'until' must not be before 'since'");
        }
        return funnelMetricsService.channels(since, until);
    }
```

- [ ] **Step 5: Compile**

Run: `./gradlew compileJava`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/platform/FunnelChannelRowDto.java src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java src/main/java/event_social_media/service/platform/FunnelMetricsService.java src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java
git commit -m "feat(signup-source): add the funnel by-channel endpoint"
```

---

### Task 8: Postgres tests for the filter and the channel rows

**Files:**
- Create: `src/test/java/event_social_media/service/platform/FunnelChannelPostgresTest.java`

- [ ] **Step 1: Write the test**

```java
package event_social_media.service.platform;

import event_social_media.dto.platform.FunnelChannelRowDto;
import event_social_media.dto.platform.FunnelCohortDto;
import event_social_media.dto.platform.FunnelMetricsResponseDto;
import event_social_media.model.billing.EventOrder;
import event_social_media.model.event.Event;
import event_social_media.model.user.SignupChannel;
import event_social_media.model.user.User;
import event_social_media.support.PostgresTestBase;
import event_social_media.support.TestFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The channel filter and {@code /funnel/channels} against real Postgres. Accounts and payments sit in
 * one week of 2004 (FunnelMetricsPostgresTest uses 2003), so counts are immune to other classes' rows.
 */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.seed.enabled=false"
})
@Transactional
class FunnelChannelPostgresTest extends PostgresTestBase {

    private static final OffsetDateTime SINCE = OffsetDateTime.of(2004, 1, 5, 0, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime UNTIL = SINCE.plusWeeks(1);

    @Autowired private FunnelMetricsService funnelMetricsService;
    @Autowired private TestFixtures fixtures;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    private User signedUp(SignupChannel channel, OffsetDateTime at) {
        User user = fixtures.newUser();
        entityManager.flush();
        jdbcTemplate.update("update users set created_at = ?, signup_channel = ? where id = ?",
                at, channel == null ? null : channel.name(), user.getId());
        return user;
    }

    private void paidInWindow(EventOrder order) {
        entityManager.flush();
        jdbcTemplate.update("update event_orders set paid_at = ? where id = ?", SINCE.plusDays(2), order.getId());
    }

    /** social: signed up, hosted, paid 5000. unknown: signed up only. ads: hosted, never paid. */
    private void seed() {
        User social = signedUp(SignupChannel.SOCIAL, SINCE.plusHours(1));
        Event socialEvent = fixtures.newEventHostedBy(social);
        paidInWindow(fixtures.newPaidOrder(socialEvent, 5000));

        signedUp(null, SINCE.plusHours(2));

        User ads = signedUp(SignupChannel.ADS, SINCE.plusHours(3));
        fixtures.newDraftEventHostedBy(ads);
    }

    @Test
    void funnel_narrowsAccountSectionsToOneChannel() {
        seed();

        assertEquals(3, funnelMetricsService.funnel(SINCE, UNTIL, null).getFunnel().getSignedUp());
        assertEquals(1, funnelMetricsService.funnel(SINCE, UNTIL, SignupChannel.SOCIAL).getFunnel().getSignedUp());
        assertEquals(1, funnelMetricsService.funnel(SINCE, UNTIL, SignupChannel.UNKNOWN).getFunnel().getSignedUp());
        assertEquals(0, funnelMetricsService.funnel(SINCE, UNTIL, SignupChannel.EMAIL).getFunnel().getSignedUp());
        assertEquals(1, funnelMetricsService.funnel(SINCE, UNTIL, SignupChannel.ADS).getFunnel().getCreatedEvent());
    }

    @Test
    void funnel_narrowsRevenueAndPaidEventsToThePayersChannel() {
        seed();

        FunnelMetricsResponseDto social = funnelMetricsService.funnel(SINCE, UNTIL, SignupChannel.SOCIAL);
        FunnelMetricsResponseDto ads = funnelMetricsService.funnel(SINCE, UNTIL, SignupChannel.ADS);

        assertEquals(1, social.getPaidEvents().getCount());
        assertEquals(5000, social.getRevenue().getTotals().stream().mapToLong(FunnelMetricsResponseDto.CurrencyTotals::getGrossMinor).sum());
        assertEquals(0, ads.getPaidEvents().getCount());
        assertEquals(0, ads.getRevenue().getTotals().size());
    }

    @Test
    void channels_groupsTheSignupWindowByChannel_mostSignupsFirst() {
        seed();
        signedUp(SignupChannel.SOCIAL, SINCE.plusHours(4));

        List<FunnelChannelRowDto> rows = funnelMetricsService.channels(SINCE, UNTIL);

        assertEquals(List.of(SignupChannel.SOCIAL, SignupChannel.ADS, SignupChannel.UNKNOWN),
                rows.stream().map(FunnelChannelRowDto::getChannel).toList());
        FunnelChannelRowDto social = rows.get(0);
        assertEquals(2, social.getSignedUp());
        assertEquals(1, social.getCreatedEvent());
        assertEquals(1, social.getPaidHost());
        assertEquals(5000, social.getRevenueMinorByCurrency().values().stream().mapToLong(Long::longValue).sum());
        assertEquals(0, rows.get(1).getRevenueMinorByCurrency().size());
    }

    @Test
    void cohorts_narrowToOneChannel() {
        signedUp(SignupChannel.PARTNER, OffsetDateTime.now(ZoneOffset.UTC));

        List<FunnelCohortDto> weeks = funnelMetricsService.cohorts(1, SignupChannel.PARTNER);

        assertEquals(1, weeks.get(weeks.size() - 1).getSignedUp());
    }
}
```

- [ ] **Step 2: Run it**

Run: `./gradlew test --tests "event_social_media.service.platform.FunnelChannelPostgresTest"`
Expected: PASS (4 tests). Docker must be running; if the result is SKIPPED, start Docker Desktop and run it again. A skip is not a pass.

If `channels_groupsTheSignupWindowByChannel_mostSignupsFirst` fails on order because ADS and UNKNOWN both have 1 sign-up, that's expected: the tie-break is by enum name, and `ADS` < `UNKNOWN`, as asserted.

- [ ] **Step 3: Commit**

```bash
git add src/test/java/event_social_media/service/platform/FunnelChannelPostgresTest.java
git commit -m "test(signup-source): cover the funnel channel filter and rows on postgres"
```

---

### Task 9: Signup source on the admin user endpoints (TDD)

**Files:**
- Create: `src/main/java/event_social_media/dto/user/SignupSourceDto.java`
- Modify: `src/main/java/event_social_media/dto/user/UserResponseDto.java`
- Modify: `src/main/java/event_social_media/mapper/user/UserMapper.java`
- Modify: `src/main/java/event_social_media/service/user/UserService.java:86-112`
- Create: `src/test/java/event_social_media/service/user/UserServiceSignupSourceTest.java`

- [ ] **Step 1: Write the DTO and the response field**

```java
package event_social_media.dto.user;

import event_social_media.model.user.SignupChannel;
import lombok.Data;

/** Where an account came from, for the admin user endpoints. {@code UNKNOWN} when nothing was saved. */
@Data
public class SignupSourceDto {
    private SignupChannel channel;
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private Boolean adClick;
    private String referrerHost;
    private String landingPage;
}
```

Add to `UserResponseDto` after `currentTermsVersion`:

```java
        /**
         * Where the account came from. Filled only on the admin user endpoints
         * ({@code GET /api/users}, {@code GET /api/users/{id}}); null on {@code /api/me}.
         */
        private SignupSourceDto signupSource;
```

In `UserMapper`, add a second `@Mapping` to `toResponseDto`:

```java
    @Mapping(target = "emailVerified", expression = "java(entity.isEmailVerified())")
    @Mapping(target = "signupSource", ignore = true)
    UserResponseDto toResponseDto(
            User entity
    );
```

- [ ] **Step 2: Write the failing test**

```java
package event_social_media.service.user;

import event_social_media.dto.user.UserResponseDto;
import event_social_media.model.user.SignupChannel;
import event_social_media.model.user.User;
import event_social_media.support.TestFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@SpringBootTest
@Transactional
class UserServiceSignupSourceTest {

    @Autowired private UserService userService;
    @Autowired private TestFixtures fixtures;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    @Test
    void findById_returnsTheSavedSource() {
        User user = fixtures.newUser();
        entityManager.flush();
        jdbcTemplate.update("update users set signup_channel = 'SOCIAL', signup_utm_source = 'instagram', "
                + "signup_utm_campaign = 'bio-link', signup_landing_page = '/' where id = ?", user.getId());
        entityManager.clear();

        UserResponseDto dto = userService.findById(user.getId());

        assertEquals(SignupChannel.SOCIAL, dto.getSignupSource().getChannel());
        assertEquals("instagram", dto.getSignupSource().getUtmSource());
        assertEquals("bio-link", dto.getSignupSource().getUtmCampaign());
        assertEquals("/", dto.getSignupSource().getLandingPage());
    }

    @Test
    void findAll_readsANullChannelAsUnknown() {
        User user = fixtures.newUser();

        UserResponseDto dto = userService.findAll(PageRequest.of(0, 1), null, user.getEmail()).getContent().get(0);

        assertEquals(SignupChannel.UNKNOWN, dto.getSignupSource().getChannel());
        assertNull(dto.getSignupSource().getUtmSource());
    }
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.user.UserServiceSignupSourceTest"`
Expected: FAIL with `NullPointerException` (`getSignupSource()` is null).

- [ ] **Step 4: Fill it in `UserService`**

Add the imports `event_social_media.dto.user.SignupSourceDto` and `event_social_media.model.user.SignupChannel`, replace `userMapper::toResponseDto` with `this::toAdminResponse` in `findAll` (three places) and `findById`, and add:

```java
    /** The admin view of an account: the shared mapping plus where the account came from. */
    private UserResponseDto toAdminResponse(User user) {
        UserResponseDto dto = userMapper.toResponseDto(user);
        SignupSourceDto source = new SignupSourceDto();
        source.setChannel(user.getSignupChannel() != null ? user.getSignupChannel() : SignupChannel.UNKNOWN);
        source.setUtmSource(user.getSignupUtmSource());
        source.setUtmMedium(user.getSignupUtmMedium());
        source.setUtmCampaign(user.getSignupUtmCampaign());
        source.setAdClick(user.getSignupAdClick());
        source.setReferrerHost(user.getSignupReferrerHost());
        source.setLandingPage(user.getSignupLandingPage());
        dto.setSignupSource(source);
        return dto;
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.user.UserServiceSignupSourceTest"`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/dto/user/SignupSourceDto.java src/main/java/event_social_media/dto/user/UserResponseDto.java src/main/java/event_social_media/mapper/user/UserMapper.java src/main/java/event_social_media/service/user/UserService.java src/test/java/event_social_media/service/user/UserServiceSignupSourceTest.java
git commit -m "feat(signup-source): return the signup source on admin user endpoints"
```

---

### Task 10: Full suite, graph and PR

- [ ] **Step 1: Run the whole suite with Docker running**

Run: `./gradlew test`
Expected: `BUILD SUCCESSFUL`. Postgres classes must run, not skip.

- [ ] **Step 2: Update the knowledge graph** (required by this repo's `CLAUDE.md`)

Run: `graphify update .`

- [ ] **Step 3: Push and open the PR into `staging`**

```bash
git push -u origin feat/signup-source-tracking
gh pr create --base staging --title "Save the sign-up source and split the admin funnel by channel" --body "$(cat <<'EOF'
Saves where each new account came from (channel + raw visit facts) on register and on OAuth account creation, adds a `channel` filter to `/api/admin/metrics/funnel` and `/funnel/cohorts`, adds `/api/admin/metrics/funnel/channels`, and returns `signupSource` on the admin user endpoints.

Spec: storywall `docs/superpowers/specs/2026-10-16-signup-source-tracking-design.md`.

Release note: new Cookie Policy and Privacy Policy versions must be published before the frontend ships `sw_src`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
