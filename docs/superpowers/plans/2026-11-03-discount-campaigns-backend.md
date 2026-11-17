# Discount campaigns: backend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. One agent at a time: this repo's CLAUDE.md forbids parallel subagents.

**Goal:** Add a discount campaign record that discounts every plan for a set time, generate tracked link sets from it, and credit paid orders to the link the buyer came through.

**Architecture:** One `discount_campaigns` row is read by a new `PlanPromotionResolver`, which every quote, preview and checkout goes through, so the customer always pays the lower of the plan's own promotion and the campaign. Link sets are ordinary `campaign_links` rows generated in one transaction. Orders store the last-touch UTM values only when they match a saved link.

**Tech Stack:** Spring Boot, JPA, Flyway, MapStruct, Lombok, JUnit 5, AssertJ, Mockito, Testcontainers Postgres (`PostgresTestBase`), H2 for `@SpringBootTest @Transactional`.

**Design:** `docs/superpowers/specs/2026-11-03-discount-campaigns-design.md` in the `storywall` repo.

**Companion:** `docs/superpowers/plans/2026-11-03-discount-campaigns-frontend.md`.

---

## Repo and branches

The repo is `C:\Users\User\IdeaProjects\event_social_media` (`guestwall-be`). Its main checkout is shared and behind, so work in a worktree per step. Each step starts from the latest `staging` and opens a PR into `staging`. Commit messages and PR titles carry the Jira key.

| Step | Jira | Branch | Worktree |
|---|---|---|---|
| 1. Campaign, pricing, public endpoint | KAN-114 | `claude/kan-114-discount-campaigns` | `C:\Users\User\IdeaProjects\guestwall-be-kan-114` |
| 2. Link sets | KAN-116 | `claude/kan-116-campaign-link-sets` | `C:\Users\User\IdeaProjects\guestwall-be-kan-116` |
| 3. Sales tracking | KAN-118 | `claude/kan-118-campaign-sales-tracking` | `C:\Users\User\IdeaProjects\guestwall-be-kan-118` |

Start a step with:

```bash
git -C "C:/Users/User/IdeaProjects/event_social_media" fetch origin staging
git -C "C:/Users/User/IdeaProjects/event_social_media" worktree add "C:/Users/User/IdeaProjects/guestwall-be-kan-114" -b claude/kan-114-discount-campaigns origin/staging
```

Run every test command from that step's worktree. Migration numbers below assume `V206` is still the latest on `staging`. If it isn't, use the next free numbers. Postgres tests need Docker running.

## File structure

**Step 1**
- Create `src/main/resources/db/migration/V207__discount_campaigns.sql`: the table, with the overlap rule enforced in Postgres too.
- Create `model/campaign/DiscountCampaign.java`, `model/campaign/DiscountCampaignStatus.java`: the record and its derived status.
- Create `repository/campaign/DiscountCampaignRepository.java`: live, next up, overlap and link name queries.
- Create `dto/campaign/DiscountCampaignRequestDto.java`, `DiscountCampaignAdminDto.java`, `DiscountCampaignLiveDto.java`.
- Create `service/campaign/DiscountCampaignService.java`: every saving rule, audit, config cache eviction.
- Create `controller/campaign/DiscountCampaignAdminController.java`, `DiscountCampaignPublicController.java`.
- Create `service/billing/breakdown/PlanPromotionResolver.java`: the lower-price rule.
- Modify `service/billing/CheckoutService.java`: public `belowMinimumCharge`.
- Modify `service/billing/breakdown/PriceBreakdownService.java`, `service/collaboration/CollaborationPreviewService.java`: price through the resolver.
- Modify `dto/platform/PlanTierResponseDto.java`, `mapper/platform/PlanTierMapper.java`, `service/platform/PlanTierService.java`: `campaignDiscount*` on public plans.
- Modify `config/SecurityConfig.java`, `exception/ErrorCode.java`, `model/audit/AdminAuditAction.java`, `src/main/resources/i18n/messages.properties`, `messages_el.properties`.

**Step 2**
- Create `V208__campaign_link_sets.sql`, `dto/campaign/CampaignLinkSetRequestDto.java`, `dto/campaign/CampaignLinkSetDto.java`, `service/campaign/CampaignLinkSetService.java`.
- Modify `model/campaign/CampaignLink.java`, `dto/campaign/CampaignLinkDto.java`, `service/campaign/CampaignLinkService.java`, `controller/campaign/CampaignLinkAdminController.java`, `service/campaign/DiscountCampaignService.java`.

**Step 3**
- Create `V209__order_attribution.sql`, `dto/billing/CheckoutAttributionDto.java`, `service/billing/OrderAttribution.java`.
- Modify `model/billing/EventOrder.java`, `dto/billing/ActivationCheckoutRequestDto.java`, `dto/billing/UpgradeCheckoutRequestDto.java`, `controller/billing/CheckoutController.java`, `service/billing/CheckoutService.java`, `repository/platform/FunnelMetricsRepository.java`, `service/platform/CampaignReportService.java`, `dto/platform/CampaignRowDto.java`, `controller/platform/PlatformMetricsAdminController.java`.

All Java paths are under `src/main/java/event_social_media/` and tests under `src/test/java/event_social_media/`.

---

# Step 1: campaign, pricing, public endpoint (KAN-114)

## Task 1: Table and entity

**Files:**
- Create: `src/main/resources/db/migration/V207__discount_campaigns.sql`
- Create: `src/main/java/event_social_media/model/campaign/DiscountCampaign.java`
- Create: `src/main/java/event_social_media/model/campaign/DiscountCampaignStatus.java`
- Create: `src/main/java/event_social_media/repository/campaign/DiscountCampaignRepository.java`
- Test: `src/test/java/event_social_media/migration/V207DiscountCampaignsMigrationTest.java`

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** V207's discount_campaigns table: the percent and schedule CHECKs, and no two active windows overlapping. */
@SpringBootTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.seed.enabled=false"
})
class V207DiscountCampaignsMigrationTest extends PostgresTestBase {

    private static final String INSERT = """
            insert into public.discount_campaigns (name, percent, link_name, starts_at, ends_at, active)
            values (?, ?, ?, now() + (? * interval '1 day'), now() + (? * interval '1 day'), ?)""";

    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void removeInsertedRows() {
        jdbc.update("delete from public.discount_campaigns");
    }

    @Test
    void acceptsAValidRowWithDefaults() {
        jdbc.update(INSERT, "Black Friday", 20, "black-friday", 1, 2, true);
        assertThat(jdbc.queryForObject("select count(*) from public.discount_campaigns", Integer.class)).isEqualTo(1);
    }

    @Test
    void rejectsAPercentOutOfRangeAndAnEndBeforeTheStart() {
        assertThatThrownBy(() -> jdbc.update(INSERT, "a", 0, "a", 1, 2, true)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(INSERT, "b", 100, "b", 1, 2, true)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(INSERT, "c", 20, "c", 2, 1, true)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsADuplicateLinkName() {
        jdbc.update(INSERT, "a", 20, "same", 1, 2, true);
        assertThatThrownBy(() -> jdbc.update(INSERT, "b", 20, "same", 3, 4, true)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsOverlappingActiveWindowsButNotAStoppedOne() {
        jdbc.update(INSERT, "a", 20, "a", 1, 3, true);
        assertThatThrownBy(() -> jdbc.update(INSERT, "b", 20, "b", 2, 4, true)).isInstanceOf(DataIntegrityViolationException.class);
        jdbc.update(INSERT, "c", 20, "c", 2, 4, false);
        jdbc.update(INSERT, "d", 20, "d", 3, 4, true);
        assertThat(jdbc.queryForObject("select count(*) from public.discount_campaigns", Integer.class)).isEqualTo(3);
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.migration.V207DiscountCampaignsMigrationTest"`
Expected: FAIL, the relation `public.discount_campaigns` does not exist.

- [ ] **Step 3: Write the migration**

```sql
-- =====================================================
-- DISCOUNT CAMPAIGNS (spec 2026-11-03-discount-campaigns-design, storywall repo)
--
-- One switch that discounts every plan for a set time. Pricing reads this row; nothing is written
-- onto the plans. Status is derived from active and the dates, never stored. Active windows can't
-- overlap, so at most one campaign is ever live.
-- =====================================================

CREATE TABLE discount_campaigns (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(50)  NOT NULL,
    percent    NUMERIC(5, 2) NOT NULL,
    label      VARCHAR(100) NULL,
    link_name  VARCHAR(60)  NOT NULL,
    starts_at  TIMESTAMPTZ  NOT NULL,
    ends_at    TIMESTAMPTZ  NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT discount_campaigns_percent_check CHECK (percent > 0 AND percent < 100),
    CONSTRAINT discount_campaigns_schedule_check CHECK (ends_at > starts_at),
    CONSTRAINT discount_campaigns_link_name_key UNIQUE (link_name),
    CONSTRAINT discount_campaigns_no_overlap EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&) WHERE (active)
);
```

- [ ] **Step 4: Write the status enum**

```java
package event_social_media.model.campaign;

/** Derived from {@code active} and the dates, never stored. */
public enum DiscountCampaignStatus {
    LIVE, SCHEDULED, ENDED, OFF
}
```

- [ ] **Step 5: Write the entity**

```java
package event_social_media.model.campaign;

import event_social_media.model.base.MutableAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Discounts every plan for a set time. See spec 2026-11-03-discount-campaigns-design (storywall repo).
 * The discount campaign service enforces every rule; H2 has none of the migration's constraints.
 */
@Getter
@Setter
@Entity
@Table(name = "discount_campaigns")
public class DiscountCampaign extends MutableAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @NotNull
    @Column(name = "percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal percent;

    /** Shown at checkout as the discount's name, like a plan's discount label. */
    @Column(name = "label", length = 100)
    private String label;

    /** The base of its links' utm_campaign. Fixed after creation. */
    @NotNull
    @Column(name = "link_name", nullable = false, length = 60, updatable = false)
    private String linkName;

    @NotNull
    @Column(name = "starts_at", nullable = false)
    private OffsetDateTime startsAt;

    @NotNull
    @Column(name = "ends_at", nullable = false)
    private OffsetDateTime endsAt;

    /** False once stopped. A stopped campaign never runs again. */
    @NotNull
    @ColumnDefault("true")
    @Column(name = "active", nullable = false)
    private Boolean active = true;
}
```

- [ ] **Step 6: Write the repository**

```java
package event_social_media.repository.campaign;

import event_social_media.model.campaign.DiscountCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DiscountCampaignRepository extends JpaRepository<DiscountCampaign, UUID> {

    List<DiscountCampaign> findAllByOrderByStartsAtDesc();

    boolean existsByLinkName(String linkName);

    /** The live campaign. Windows can't overlap, so there is at most one. Pass now twice. */
    Optional<DiscountCampaign> findFirstByActiveTrueAndStartsAtLessThanEqualAndEndsAtGreaterThan(
            OffsetDateTime startedBy, OffsetDateTime endsAfter);

    /** The campaign that is live or next up. */
    Optional<DiscountCampaign> findFirstByActiveTrueAndEndsAtGreaterThanOrderByStartsAtAsc(OffsetDateTime now);

    /** Whether another active campaign's window overlaps this one. */
    @Query("""
            select count(c) > 0 from DiscountCampaign c
            where c.active = true and c.id <> :self and c.startsAt < :endsAt and c.endsAt > :startsAt""")
    boolean overlapsAnother(@Param("self") UUID self, @Param("startsAt") OffsetDateTime startsAt,
                            @Param("endsAt") OffsetDateTime endsAt);
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.migration.V207DiscountCampaignsMigrationTest"`
Expected: PASS. `ddl-auto=validate` also confirms the entity matches the table.

- [ ] **Step 8: Commit**

```bash
git add src/main/resources/db/migration/V207__discount_campaigns.sql src/main/java/event_social_media/model/campaign/DiscountCampaign.java src/main/java/event_social_media/model/campaign/DiscountCampaignStatus.java src/main/java/event_social_media/repository/campaign/DiscountCampaignRepository.java src/test/java/event_social_media/migration/V207DiscountCampaignsMigrationTest.java
git commit -m "KAN-114: add the discount_campaigns table and entity"
```

## Task 2: The lower-price resolver

**Files:**
- Create: `src/main/java/event_social_media/service/billing/breakdown/PlanPromotionResolver.java`
- Test: `src/test/java/event_social_media/service/billing/breakdown/PlanPromotionResolverTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.billing.breakdown;

import event_social_media.model.campaign.DiscountCampaign;
import event_social_media.model.platform.CoverageOptionKind;
import event_social_media.model.platform.PlanCoverageOption;
import event_social_media.model.platform.PlanTier;
import event_social_media.repository.campaign.DiscountCampaignRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PlanPromotionResolverTest {

    private final DiscountCampaignRepository repository = mock(DiscountCampaignRepository.class);
    private final PlanPromotionResolver resolver = new PlanPromotionResolver(repository);

    private void noCampaign() {
        when(repository.findFirstByActiveTrueAndStartsAtLessThanEqualAndEndsAtGreaterThan(any(), any()))
                .thenReturn(Optional.empty());
    }

    private void liveCampaign(String percent) {
        DiscountCampaign campaign = new DiscountCampaign();
        campaign.setPercent(new BigDecimal(percent));
        campaign.setLabel("Black Friday");
        when(repository.findFirstByActiveTrueAndStartsAtLessThanEqualAndEndsAtGreaterThan(any(), any()))
                .thenReturn(Optional.of(campaign));
    }

    private static PlanTier plan(String percent) {
        PlanTier plan = new PlanTier();
        plan.setDiscountLabel("Plan sale");
        if (percent != null) plan.setDiscountPercent(new BigDecimal(percent));
        return plan;
    }

    private static PlanCoverageOption option(long price, Long promo) {
        PlanCoverageOption option = new PlanCoverageOption();
        option.setKind(CoverageOptionKind.INITIAL);
        option.setPriceAmountMinor(price);
        option.setPromoPriceAmountMinor(promo);
        return option;
    }

    @Test
    void withoutACampaignThePlansOwnPromotionStands() {
        noCampaign();
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan("10"), option(10_000, null), 10_000);
        assertThat(promotion.percent()).isEqualByComparingTo("10");
        assertThat(promotion.promoPrice()).isNull();
        assertThat(promotion.label()).isEqualTo("Plan sale");
    }

    @Test
    void aBiggerCampaignBeatsASmallerPlanPercent() {
        liveCampaign("20.00");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan("10"), option(10_000, null), 10_000);
        assertThat(promotion.percent().toPlainString()).isEqualTo("20");
        assertThat(promotion.promoPrice()).isNull();
        assertThat(promotion.label()).isEqualTo("Black Friday");
    }

    @Test
    void aBiggerPlanPercentBeatsTheCampaign() {
        liveCampaign("20");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan("30"), option(10_000, null), 10_000);
        assertThat(promotion.percent()).isEqualByComparingTo("30");
        assertThat(promotion.label()).isEqualTo("Plan sale");
    }

    @Test
    void aPromoPriceBelowTheCampaignPriceWins() {
        liveCampaign("20");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan(null), option(10_000, 7_000L), 10_000);
        assertThat(promotion.promoPrice()).isEqualTo(new PriceBreakdownCalculator.PromoPrice(10_000, 7_000));
        assertThat(promotion.percent()).isEqualByComparingTo("0");
        assertThat(promotion.label()).isEqualTo("Plan sale");
    }

    @Test
    void theCampaignBeatsAPromoPriceAboveIt() {
        liveCampaign("40");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan(null), option(10_000, 7_000L), 10_000);
        assertThat(promotion.promoPrice()).isNull();
        assertThat(promotion.percent()).isEqualByComparingTo("40");
        assertThat(promotion.label()).isEqualTo("Black Friday");
    }

    @Test
    void aTieKeepsThePlansOwnPromotion() {
        liveCampaign("20");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan("20"), option(10_000, null), 10_000);
        assertThat(promotion.label()).isEqualTo("Plan sale");
    }

    @Test
    void anUpgradeGapIsComparedOnTheGapNotTheListPrice() {
        // 30% off the 2000 gap by promo price is 1400; 20% off is 1600, so the promo price stays.
        liveCampaign("20");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan(null), option(10_000, 7_000L), 2_000);
        assertThat(promotion.promoPrice()).isNotNull();
    }

    @Test
    void aLineWithNoOptionStillGetsTheCampaign() {
        liveCampaign("20");
        PlanPromotionResolver.PlanPromotion promotion = resolver.forLine(plan(null), null, 10_000);
        assertThat(promotion.percent()).isEqualByComparingTo("20");
    }

    @Test
    void headlineShowsTheBiggerPercentAndItsLabel() {
        liveCampaign("20");
        assertThat(resolver.headlinePercent(plan("10")).toPlainString()).isEqualTo("20");
        assertThat(resolver.headlineLabel(plan("10"))).isEqualTo("Black Friday");
        assertThat(resolver.headlinePercent(plan("30"))).isEqualByComparingTo("30");
        assertThat(resolver.headlineLabel(plan("30"))).isEqualTo("Plan sale");
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.billing.breakdown.PlanPromotionResolverTest"`
Expected: FAIL to compile, `PlanPromotionResolver` does not exist.

- [ ] **Step 3: Write the resolver**

```java
package event_social_media.service.billing.breakdown;

import event_social_media.model.campaign.DiscountCampaign;
import event_social_media.model.platform.PlanCoverageOption;
import event_social_media.model.platform.PlanTier;
import event_social_media.repository.campaign.DiscountCampaignRepository;
import event_social_media.service.billing.CheckoutService;
import event_social_media.service.collaboration.CollaborationPricing;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

/**
 * Which promotion prices a plan line: the plan's own (a promo price, else its percent) or the live
 * discount campaign. The customer pays the lower price and a tie keeps the plan's own; the two never
 * add up. Every quote, preview and checkout prices through here, so none can disagree.
 */
@Service
@RequiredArgsConstructor
public class PlanPromotionResolver {

    private final DiscountCampaignRepository repository;

    /** What the price calculator takes as the plan's promotion. */
    public record PlanPromotion(BigDecimal percent, PriceBreakdownCalculator.PromoPrice promoPrice, String label) {

        /** No promotion: a storage pack or an extension. */
        public static PlanPromotion none(PlanTier plan) {
            return new PlanPromotion(BigDecimal.ZERO, null, plan.getDiscountLabel());
        }
    }

    /**
     * @param option   the duration being priced, or null when the line has none
     * @param listMinor the line's undiscounted amount: a duration's price, or an upgrade's gap
     */
    public PlanPromotion forLine(PlanTier plan, PlanCoverageOption option, long listMinor) {
        Long promoMinor = option != null ? CheckoutService.activePromoPrice(plan, option) : null;
        PriceBreakdownCalculator.PromoPrice promoPrice = promoMinor != null
                ? new PriceBreakdownCalculator.PromoPrice(option.getPriceAmountMinor(), promoMinor)
                : null;
        BigDecimal ownPercent = promoPrice == null ? CheckoutService.activePlanDiscountPercent(plan) : BigDecimal.ZERO;
        PlanPromotion own = new PlanPromotion(ownPercent, promoPrice, plan.getDiscountLabel());

        long ownPrice = promoPrice != null
                ? listMinor - CollaborationPricing.promoPriceCut(listMinor, promoPrice.listMinor(), promoPrice.promoMinor())
                : CollaborationPricing.applyDiscount(listMinor, ownPercent);
        return liveCampaign()
                .filter(campaign -> CollaborationPricing.applyDiscount(listMinor, campaign.getPercent()) < ownPrice)
                .map(campaign -> new PlanPromotion(stripped(campaign.getPercent()), null, campaign.getLabel()))
                .orElse(own);
    }

    /** The percent to advertise for a plan across its durations: the bigger of its own and the campaign's. */
    public BigDecimal headlinePercent(PlanTier plan) {
        BigDecimal own = CheckoutService.activePlanDiscountPercent(plan);
        return liveCampaign()
                .map(DiscountCampaign::getPercent)
                .filter(percent -> percent.compareTo(own) > 0)
                .map(PlanPromotionResolver::stripped)
                .orElse(own);
    }

    /** The name that goes with {@link #headlinePercent}. */
    public String headlineLabel(PlanTier plan) {
        BigDecimal own = CheckoutService.activePlanDiscountPercent(plan);
        return liveCampaign()
                .filter(campaign -> campaign.getPercent().compareTo(own) > 0)
                .map(DiscountCampaign::getLabel)
                .orElse(plan.getDiscountLabel());
    }

    private Optional<DiscountCampaign> liveCampaign() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return repository.findFirstByActiveTrueAndStartsAtLessThanEqualAndEndsAtGreaterThan(now, now);
    }

    /** 20.00 as 20 and 12.50 as 12.5, so the snapshot and the texts carry no trailing zeros. */
    private static BigDecimal stripped(BigDecimal percent) {
        BigDecimal value = percent.stripTrailingZeros();
        return value.scale() < 0 ? value.setScale(0) : value;
    }
}
```

`headlineLabel` uses `Optional.map`, which turns a campaign with a null label into the plan's own label. That is intended: the row must not go nameless.

- [ ] **Step 4: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.billing.breakdown.PlanPromotionResolverTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/billing/breakdown/PlanPromotionResolver.java src/test/java/event_social_media/service/billing/breakdown/PlanPromotionResolverTest.java
git commit -m "KAN-114: add the resolver that picks the lower promotion price"
```

## Task 3: Price everything through the resolver

**Files:**
- Modify: `src/main/java/event_social_media/service/billing/breakdown/PriceBreakdownService.java:171-187`
- Modify: `src/main/java/event_social_media/service/collaboration/CollaborationPreviewService.java:202,224`
- Test: `src/test/java/event_social_media/service/billing/DiscountCampaignPricingTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.billing;

import event_social_media.dto.billing.QuoteRequestDto;
import event_social_media.model.billing.BuyerType;
import event_social_media.model.billing.OrderKind;
import event_social_media.model.billing.PriceBreakdown;
import event_social_media.model.campaign.DiscountCampaign;
import event_social_media.model.event.Event;
import event_social_media.model.platform.PlanTier;
import event_social_media.model.user.User;
import event_social_media.repository.campaign.DiscountCampaignRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.repository.platform.PlanTierRepository;
import event_social_media.service.billing.breakdown.PriceBreakdownService;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class DiscountCampaignPricingTest {

    private static final String TERMS = "2026-10-12";

    @Autowired private CheckoutService checkoutService;
    @Autowired private PriceBreakdownService priceBreakdownService;
    @Autowired private DiscountCampaignRepository campaignRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private PlanTierRepository planTierRepository;
    @Autowired private TestFixtures fixtures;

    private User host;
    private Event draft;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        draft = fixtures.newDraftEventHostedBy(host);
        draft.setStartAt(OffsetDateTime.now().plusDays(30));
        draft.setEndAt(OffsetDateTime.now().plusDays(31));
        eventRepository.saveAndFlush(draft);
    }

    private void campaign(String percent, OffsetDateTime startsAt, OffsetDateTime endsAt, boolean active) {
        DiscountCampaign campaign = new DiscountCampaign();
        campaign.setName("Sale");
        campaign.setPercent(new BigDecimal(percent));
        campaign.setLabel("Black Friday");
        campaign.setLinkName("sale");
        campaign.setStartsAt(startsAt);
        campaign.setEndsAt(endsAt);
        campaign.setActive(active);
        campaignRepository.saveAndFlush(campaign);
    }

    private PriceBreakdown quote() {
        return checkoutService.quote(draft.getId(), host.getId(), new QuoteRequestDto(OrderKind.ACTIVATION, null));
    }

    @Test
    void aLiveCampaignDiscountsAnActivationUnderItsLabel() {
        long list = quote().listTotalMinor();
        campaign("20", OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(1), true);

        PriceBreakdown quote = quote();

        assertThat(quote.discountTotalMinor()).isGreaterThan(0);
        assertThat(quote.totalMinor()).isLessThan(list);
        assertThat(quote.discounts()).anyMatch(discount ->
                discount.source() == PriceBreakdown.DiscountSource.PLAN_PROMOTION && "Black Friday".equals(discount.label()));
    }

    @Test
    void aBiggerPlanDiscountBeatsTheCampaignAndTheyDontAddUp() {
        PlanTier plan = draft.getPlanTier();
        plan.setDiscountPercent(BigDecimal.valueOf(50));
        planTierRepository.saveAndFlush(plan);
        long planOnly = quote().totalMinor();
        campaign("20", OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(1), true);

        assertThat(quote().totalMinor()).isEqualTo(planOnly);
    }

    @Test
    void aCampaignThatHasntStartedEndedOrIsStoppedDiscountsNothing() {
        long list = quote().totalMinor();
        campaign("20", OffsetDateTime.now().plusHours(1), OffsetDateTime.now().plusDays(1), true);
        assertThat(quote().totalMinor()).isEqualTo(list);
        campaignRepository.deleteAllInBatch();
        campaign("20", OffsetDateTime.now().minusDays(2), OffsetDateTime.now().minusDays(1), true);
        assertThat(quote().totalMinor()).isEqualTo(list);
        campaignRepository.deleteAllInBatch();
        campaign("20", OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(1), false);
        assertThat(quote().totalMinor()).isEqualTo(list);
    }

    @Test
    void theQuoteAndTheCheckoutAgree() {
        campaign("20", OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(1), true);
        PriceBreakdown quote = quote();

        assertThat(checkoutService.startActivation(draft.getId(), host.getId(), null, CheckoutConsent.given(TERMS)).breakdown().totalMinor())
                .isEqualTo(quote.totalMinor());
    }

    @Test
    void anExtensionGetsNoCampaign() {
        Event paid = fixtures.newEventHostedBy(host);
        PlanTier plan = paid.getPlanTier();
        var extension = fixtures.addExtensionOption(plan, 1, 1_000);
        campaign("20", OffsetDateTime.now().minusHours(1), OffsetDateTime.now().plusDays(1), true);

        PriceBreakdown breakdown = priceBreakdownService.extension(paid, extension, BuyerType.CONSUMER);

        assertThat(breakdown.discountTotalMinor()).isZero();
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.billing.DiscountCampaignPricingTest"`
Expected: FAIL, the campaign tests see no discount.

- [ ] **Step 3: Route `PriceBreakdownService` through the resolver**

Add the field after `businessProfileRepository`:

```java
    private final PlanPromotionResolver planPromotionResolver;
```

Replace lines 171-187 with:

```java
        // A promotion discounts the plan: an activation or an upgrade. Never a pack or an extension.
        // The resolver picks the lower of the plan's own promotion and the live discount campaign.
        boolean promoted = kind == OrderKind.ACTIVATION || kind == OrderKind.UPGRADE;
        PlanPromotionResolver.PlanPromotion promotion = promoted
                ? planPromotionResolver.forLine(plan, option, planListMinor)
                : PlanPromotionResolver.PlanPromotion.none(plan);
        PriceBreakdown breakdown = PriceBreakdownCalculator.compute(new PriceBreakdownCalculator.Input(
                kind, currency, buyerType, planListMinor, plan.getCode(), plan.getName(), promotion.percent(), promotion.promoPrice(),
                promotion.label(), codePercent, codeLabel, billingProperties.getMaxCombinedDiscountPercent(),
                plan.getSetupPercent(),
                noEventDay ? Short.valueOf((short) 0) : plan.getEventDayPercent(), cfg.getDefaultSetupPercent(),
                cfg.getDefaultEventDayPercent(), addons, pack, coverage, eventStartAt,
                cfg.getCurrentTermsVersion(), billingProperties.getRefundWindowDays()));
```

In the `log.debug` call just below, change the arguments `planPercent, promoMinor` to `promotion.percent(), promotion.promoPrice()`. Delete the unused imports (`BigDecimal` only if nothing else uses it). `PlanPromotionResolver` is in the same package.

- [ ] **Step 4: Route `CollaborationPreviewService` through the resolver**

Add the field after `priceBreakdownService`:

```java
    private final PlanPromotionResolver planPromotionResolver;
```

with the import `event_social_media.service.billing.breakdown.PlanPromotionResolver`. In `upgradeOffer`, replace line 202:

```java
        BigDecimal planPercent = planPromotionResolver.headlinePercent(target);
```

and in the `UpgradeOptionResponseDto` constructor replace `promoted ? target.getDiscountLabel() : null` with:

```java
                planPercent.signum() > 0 ? planPercent : null, promoted ? planPromotionResolver.headlineLabel(target) : null,
```

- [ ] **Step 5: Run the pricing tests and the suites that use these services**

Run: `./gradlew test --tests "event_social_media.service.billing.*" --tests "event_social_media.service.collaboration.*"`
Expected: PASS. Any failing test that constructs one of these services by hand needs the new constructor argument.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/service/billing/breakdown/PriceBreakdownService.java src/main/java/event_social_media/service/collaboration/CollaborationPreviewService.java src/test/java/event_social_media/service/billing/DiscountCampaignPricingTest.java
git commit -m "KAN-114: price quotes, previews and checkouts through the resolver"
```

## Task 4: Campaign service

**Files:**
- Create: `src/main/java/event_social_media/dto/campaign/DiscountCampaignRequestDto.java`, `DiscountCampaignAdminDto.java`, `DiscountCampaignLiveDto.java`
- Create: `src/main/java/event_social_media/service/campaign/DiscountCampaignService.java`
- Modify: `src/main/java/event_social_media/service/billing/CheckoutService.java:1597-1605`
- Modify: `src/main/java/event_social_media/exception/ErrorCode.java`, `src/main/java/event_social_media/model/audit/AdminAuditAction.java`
- Modify: `src/main/resources/i18n/messages.properties`, `src/main/resources/i18n/messages_el.properties`
- Test: `src/test/java/event_social_media/service/campaign/DiscountCampaignServiceTest.java`

- [ ] **Step 1: Add the error codes**

In `ErrorCode.java`, after the last `3xxx` entry (`3121` at the time of writing):

```java
    /** A discount campaign's fields are invalid, or it can no longer be edited. */
    DISCOUNT_CAMPAIGN_INVALID(3122),
```

and after the last `5xxx` entry (`5203` at the time of writing):

```java
    /** A discount campaign's dates overlap another campaign's. */
    DISCOUNT_CAMPAIGN_OVERLAP(5204),
    /** A discount campaign's percent would take a public plan below the minimum charge. */
    DISCOUNT_CAMPAIGN_PRICE_TOO_LOW(5205),
    /** Another discount campaign already uses this link name. */
    DISCOUNT_CAMPAIGN_LINK_NAME_TAKEN(5206),
```

If those numbers are taken on the latest `staging`, use the next free ones and change the frontend's `ERROR_CODES` to match.

- [ ] **Step 2: Add the audit actions**

In `AdminAuditAction.java`, after `CAMPAIGN_LINK_DELETED`:

```java
    /** A discount campaign was created; details: percent, startsAt, endsAt. Target type DISCOUNT_CAMPAIGN. */
    DISCOUNT_CAMPAIGN_CREATED,
    /** A discount campaign was edited; details: percent, startsAt, endsAt. Target type DISCOUNT_CAMPAIGN. */
    DISCOUNT_CAMPAIGN_UPDATED,
    /** A discount campaign was stopped; no details. Target type DISCOUNT_CAMPAIGN. */
    DISCOUNT_CAMPAIGN_STOPPED,
    /** A discount campaign that had not started was deleted; no details. Target type DISCOUNT_CAMPAIGN. */
    DISCOUNT_CAMPAIGN_DELETED,
```

- [ ] **Step 3: Add the localized minimum price message**

Append to `src/main/resources/i18n/messages.properties`:

```properties
discountCampaign.priceTooLow=This percent makes {0} too cheap to charge.
```

Append to `src/main/resources/i18n/messages_el.properties`:

```properties
discountCampaign.priceTooLow=Με αυτό το ποσοστό, {0} δεν μπορούν να χρεωθούν.
```

- [ ] **Step 4: Add `belowMinimumCharge` to `CheckoutService`**

Replace `requireChargeableAmount` (l.1597-1605) with:

```java
    private static void requireChargeableAmount(long amountMinor, String currency, String label, String flow) {
        if (belowMinimumCharge(amountMinor, currency)) {
            log.error("{} blocked: {} would charge {} {} minor units, below the {} minimum of {}",
                    flow, label, amountMinor, currency, currency, MIN_CHARGEABLE_AMOUNT_MINOR.get(currency.toUpperCase()));
            throw new ConflictException(ErrorCode.CHECKOUT_AMOUNT_BELOW_MINIMUM,
                    label + "'s discounted price is below the minimum this platform can charge.");
        }
    }

    /** Whether the provider would refuse this amount. Free is fine, and so is a currency with no known minimum. */
    public static boolean belowMinimumCharge(long amountMinor, String currency) {
        Long minimum = currency == null ? null : MIN_CHARGEABLE_AMOUNT_MINOR.get(currency.toUpperCase());
        return minimum != null && amountMinor > 0 && amountMinor < minimum;
    }
```

- [ ] **Step 5: Write the DTOs**

`DiscountCampaignRequestDto.java`:

```java
package event_social_media.dto.campaign;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Create or edit body. An empty start means now. The link name is fixed once the campaign exists. */
public record DiscountCampaignRequestDto(
        @NotBlank @Size(max = 50) String name,
        @NotNull @DecimalMin("0.01") @DecimalMax("99.99") @Digits(integer = 2, fraction = 2) BigDecimal percent,
        @Size(max = 100) String label,
        @NotBlank @Size(max = 60) String linkName,
        OffsetDateTime startsAt,
        @NotNull OffsetDateTime endsAt) {}
```

`DiscountCampaignAdminDto.java`:

```java
package event_social_media.dto.campaign;

import event_social_media.model.campaign.DiscountCampaignStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DiscountCampaignAdminDto(UUID id, String name, BigDecimal percent, String label, String linkName,
                                       OffsetDateTime startsAt, OffsetDateTime endsAt, DiscountCampaignStatus status,
                                       OffsetDateTime createdAt) {}
```

`DiscountCampaignLiveDto.java`:

```java
package event_social_media.dto.campaign;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** What the banner and the guest card need. */
public record DiscountCampaignLiveDto(UUID id, BigDecimal percent, OffsetDateTime startsAt, OffsetDateTime endsAt) {}
```

- [ ] **Step 6: Write the failing service test**

```java
package event_social_media.service.campaign;

import event_social_media.dto.campaign.DiscountCampaignAdminDto;
import event_social_media.dto.campaign.DiscountCampaignRequestDto;
import event_social_media.exception.ApiException;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.campaign.DiscountCampaignStatus;
import event_social_media.model.platform.PlanScope;
import event_social_media.model.platform.PlanTier;
import event_social_media.repository.audit.AdminAuditLogRepository;
import event_social_media.repository.platform.PlanTierRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class DiscountCampaignServiceTest {

    @Autowired private DiscountCampaignService service;
    @Autowired private AdminAuditLogRepository auditRepository;
    @Autowired private PlanTierRepository planTierRepository;
    @Autowired private TestFixtures fixtures;

    private AdminActor actor;

    @BeforeEach
    void setUp() {
        actor = new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7");
    }

    private static OffsetDateTime hours(int hours) {
        return OffsetDateTime.now(ZoneOffset.UTC).plusHours(hours);
    }

    private static DiscountCampaignRequestDto request(String linkName, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        return new DiscountCampaignRequestDto("Black Friday", new BigDecimal("20"), "Black Friday", linkName, startsAt, endsAt);
    }

    private static ErrorCode codeOf(Throwable thrown) {
        return ((ApiException) thrown).getErrorCode();
    }

    @Test
    void anEmptyStartSavesAsNowAndIsLive() {
        DiscountCampaignAdminDto saved = service.create(request("bf", null, hours(24)), actor);

        assertThat(saved.status()).isEqualTo(DiscountCampaignStatus.LIVE);
        assertThat(saved.startsAt()).isBeforeOrEqualTo(OffsetDateTime.now(ZoneOffset.UTC));
        assertThat(service.findLive()).isPresent().get().matches(live -> live.id().equals(saved.id()));
    }

    @Test
    void aFutureStartIsScheduledAndNotLive() {
        DiscountCampaignAdminDto saved = service.create(request("bf", hours(1), hours(24)), actor);

        assertThat(saved.status()).isEqualTo(DiscountCampaignStatus.SCHEDULED);
        assertThat(service.findLive()).isEmpty();
    }

    @Test
    void rejectsOverlappingDatesButQueuesLaterOnes() {
        service.create(request("a", hours(1), hours(10)), actor);

        assertThatThrownBy(() -> service.create(request("b", hours(5), hours(20)), actor))
                .isInstanceOf(ConflictException.class)
                .satisfies(thrown -> assertThat(codeOf(thrown)).isEqualTo(ErrorCode.DISCOUNT_CAMPAIGN_OVERLAP));
        assertThat(service.create(request("c", hours(10), hours(20)), actor).status())
                .isEqualTo(DiscountCampaignStatus.SCHEDULED);
    }

    @Test
    void aStoppedCampaignNoLongerBlocksItsDates() {
        DiscountCampaignAdminDto first = service.create(request("a", hours(1), hours(10)), actor);
        service.stop(first.id(), actor);

        assertThat(service.create(request("b", hours(5), hours(20)), actor)).isNotNull();
    }

    @Test
    void rejectsAnEndInThePastOrBeforeTheStart() {
        assertThatThrownBy(() -> service.create(request("a", null, hours(-1)), actor)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.create(request("b", hours(5), hours(2)), actor)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsABadOrTakenLinkName() {
        assertThatThrownBy(() -> service.create(request("Μαύρη", null, hours(24)), actor)).isInstanceOf(BadRequestException.class);
        service.create(request("bf", hours(1), hours(2)), actor);
        assertThatThrownBy(() -> service.create(request("BF", hours(3), hours(4)), actor))
                .isInstanceOf(ConflictException.class)
                .satisfies(thrown -> assertThat(codeOf(thrown)).isEqualTo(ErrorCode.DISCOUNT_CAMPAIGN_LINK_NAME_TAKEN));
    }

    @Test
    void theLinkNameCantChange() {
        DiscountCampaignAdminDto saved = service.create(request("bf", hours(1), hours(2)), actor);

        assertThatThrownBy(() -> service.update(saved.id(), request("other", hours(1), hours(2)), actor))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectsAPercentThatTakesAPublicPlanBelowTheMinimumCharge() {
        PlanTier plan = fixtures.defaultPlan(PlanScope.EVENT);
        plan.setIsPublic(true);
        plan.setIsAssignable(true);
        plan.setPriceCurrency("EUR");
        plan.setName("Cheap");
        planTierRepository.saveAndFlush(plan);
        fixtures.addInitialOption(plan, 7, 100);
        DiscountCampaignRequestDto tooMuch = new DiscountCampaignRequestDto("x", new BigDecimal("60"), null, "x", null, hours(24));

        assertThatThrownBy(() -> service.create(tooMuch, actor))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Cheap")
                .satisfies(thrown -> assertThat(codeOf(thrown)).isEqualTo(ErrorCode.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW));
    }

    @Test
    void stoppingEndsItNowAndAStoppedOrEndedCampaignCantBeEdited() {
        DiscountCampaignAdminDto saved = service.create(request("bf", null, hours(24)), actor);

        assertThat(service.stop(saved.id(), actor).status()).isEqualTo(DiscountCampaignStatus.OFF);
        assertThat(service.findLive()).isEmpty();
        assertThatThrownBy(() -> service.stop(saved.id(), actor)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.update(saved.id(), request("bf", null, hours(24)), actor))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void onlyACampaignThatHasntStartedCanBeDeleted() {
        DiscountCampaignAdminDto live = service.create(request("a", null, hours(1)), actor);
        DiscountCampaignAdminDto scheduled = service.create(request("b", hours(2), hours(3)), actor);

        assertThatThrownBy(() -> service.delete(live.id(), actor)).isInstanceOf(BadRequestException.class);
        service.delete(scheduled.id(), actor);
        assertThatThrownBy(() -> service.delete(scheduled.id(), actor)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void everyWriteIsAudited() {
        DiscountCampaignAdminDto saved = service.create(request("bf", hours(1), hours(2)), actor);
        service.update(saved.id(), request("bf", hours(1), hours(3)), actor);
        service.stop(saved.id(), actor);

        assertThat(auditRepository.findAll()).extracting("action").contains(
                AdminAuditAction.DISCOUNT_CAMPAIGN_CREATED,
                AdminAuditAction.DISCOUNT_CAMPAIGN_UPDATED,
                AdminAuditAction.DISCOUNT_CAMPAIGN_STOPPED);
    }
}
```

- [ ] **Step 7: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.campaign.DiscountCampaignServiceTest"`
Expected: FAIL to compile, `DiscountCampaignService` does not exist.

- [ ] **Step 8: Write the service**

```java
package event_social_media.service.campaign;

import event_social_media.dto.campaign.DiscountCampaignAdminDto;
import event_social_media.dto.campaign.DiscountCampaignLiveDto;
import event_social_media.dto.campaign.DiscountCampaignRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ConflictException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.campaign.DiscountCampaign;
import event_social_media.model.campaign.DiscountCampaignStatus;
import event_social_media.model.platform.PlanCoverageOption;
import event_social_media.model.platform.PlanTier;
import event_social_media.repository.campaign.DiscountCampaignRepository;
import event_social_media.repository.platform.PlanTierRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.audit.AdminAuditService;
import event_social_media.service.billing.CheckoutService;
import event_social_media.service.collaboration.CollaborationPricing;
import event_social_media.service.moderation.TextNormalizer;
import event_social_media.service.platform.PlanCoverageOptionService;
import event_social_media.service.platform.PlatformConfigChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Discount campaigns (spec 2026-11-03-discount-campaigns-design, storywall repo). Holds every saving
 * rule; pricing reads the live campaign through PlanPromotionResolver.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DiscountCampaignService {

    static final int NAME_MAX = 50;
    static final int LINK_NAME_MAX = 60;
    private static final int LABEL_MAX = 100;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final Pattern LINK_NAME = Pattern.compile("^[a-z0-9][a-z0-9._-]*$");
    private static final UUID NO_CAMPAIGN = new UUID(0L, 0L);
    private static final String TARGET_TYPE = "DISCOUNT_CAMPAIGN";

    private final DiscountCampaignRepository repository;
    private final PlanTierRepository planTierRepository;
    private final PlanCoverageOptionService planCoverageOptionService;
    private final AdminAuditService adminAuditService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<DiscountCampaignAdminDto> findAll() {
        OffsetDateTime now = now();
        return repository.findAllByOrderByStartsAtDesc().stream().map(campaign -> toAdminDto(campaign, now)).toList();
    }

    /** For GET /api/public/discount-campaign. */
    @Transactional(readOnly = true)
    public Optional<DiscountCampaignLiveDto> findLive() {
        OffsetDateTime now = now();
        return repository.findFirstByActiveTrueAndStartsAtLessThanEqualAndEndsAtGreaterThan(now, now)
                .map(campaign -> new DiscountCampaignLiveDto(campaign.getId(), campaign.getPercent(),
                        campaign.getStartsAt(), campaign.getEndsAt()));
    }

    @Transactional
    public DiscountCampaignAdminDto create(DiscountCampaignRequestDto dto, AdminActor actor) {
        DiscountCampaign campaign = new DiscountCampaign();
        campaign.setLinkName(linkName(dto.linkName(), actor));
        if (repository.existsByLinkName(campaign.getLinkName())) {
            log.warn("Discount campaign write rejected: reason=link_name_taken actorId={}", actor.userId());
            throw new ConflictException(ErrorCode.DISCOUNT_CAMPAIGN_LINK_NAME_TAKEN, "Another campaign already uses this link name");
        }
        apply(campaign, dto, actor);
        DiscountCampaign saved = repository.saveAndFlush(campaign);
        record(actor, AdminAuditAction.DISCOUNT_CAMPAIGN_CREATED, saved);
        eventPublisher.publishEvent(new PlatformConfigChangedEvent());
        log.info("Discount campaign {} created (actorId={})", saved.getId(), actor.userId());
        return toAdminDto(saved, now());
    }

    @Transactional
    public DiscountCampaignAdminDto update(UUID id, DiscountCampaignRequestDto dto, AdminActor actor) {
        DiscountCampaign campaign = require(id);
        DiscountCampaignStatus status = statusOf(campaign, now());
        if (status == DiscountCampaignStatus.ENDED || status == DiscountCampaignStatus.OFF) {
            throw rejected(actor, "finished", "An ended or stopped campaign can't be edited");
        }
        if (!campaign.getLinkName().equals(linkName(dto.linkName(), actor))) {
            throw rejected(actor, "link_name", "The link name can't change");
        }
        apply(campaign, dto, actor);
        DiscountCampaign saved = repository.saveAndFlush(campaign);
        record(actor, AdminAuditAction.DISCOUNT_CAMPAIGN_UPDATED, saved);
        eventPublisher.publishEvent(new PlatformConfigChangedEvent());
        log.info("Discount campaign {} updated (actorId={})", id, actor.userId());
        return toAdminDto(saved, now());
    }

    /** Immediate and final: prices go back to normal now, and it never runs again. */
    @Transactional
    public DiscountCampaignAdminDto stop(UUID id, AdminActor actor) {
        DiscountCampaign campaign = require(id);
        DiscountCampaignStatus status = statusOf(campaign, now());
        if (status == DiscountCampaignStatus.ENDED || status == DiscountCampaignStatus.OFF) {
            throw rejected(actor, "finished", "This campaign has already ended");
        }
        campaign.setActive(false);
        DiscountCampaign saved = repository.saveAndFlush(campaign);
        adminAuditService.record(actor, AdminAuditAction.DISCOUNT_CAMPAIGN_STOPPED, TARGET_TYPE, id, null, Map.of());
        eventPublisher.publishEvent(new PlatformConfigChangedEvent());
        log.info("Discount campaign {} stopped (actorId={})", id, actor.userId());
        return toAdminDto(saved, now());
    }

    /** Only one that has not started: a campaign that ran stays on record. */
    @Transactional
    public void delete(UUID id, AdminActor actor) {
        DiscountCampaign campaign = require(id);
        if (statusOf(campaign, now()) != DiscountCampaignStatus.SCHEDULED) {
            throw rejected(actor, "started", "Only a campaign that has not started can be deleted");
        }
        repository.delete(campaign);
        repository.flush();
        adminAuditService.record(actor, AdminAuditAction.DISCOUNT_CAMPAIGN_DELETED, TARGET_TYPE, id, null, Map.of());
        eventPublisher.publishEvent(new PlatformConfigChangedEvent());
        log.info("Discount campaign {} deleted (actorId={})", id, actor.userId());
    }

    // ---------------------------------------------------------------------------------------------

    private void apply(DiscountCampaign campaign, DiscountCampaignRequestDto dto, AdminActor actor) {
        OffsetDateTime now = now();
        boolean live = campaign.getId() != null && statusOf(campaign, now) == DiscountCampaignStatus.LIVE;
        OffsetDateTime startsAt = dto.startsAt() != null ? dto.startsAt() : live ? campaign.getStartsAt() : now;
        OffsetDateTime endsAt = dto.endsAt();
        if (endsAt == null || !endsAt.isAfter(now) || !endsAt.isAfter(startsAt)) {
            throw rejected(actor, "schedule", "The end must be in the future and after the start");
        }
        BigDecimal percent = percent(dto.percent(), actor);
        UUID self = campaign.getId() != null ? campaign.getId() : NO_CAMPAIGN;
        if (repository.overlapsAnother(self, startsAt, endsAt)) {
            log.warn("Discount campaign write rejected: reason=overlap actorId={}", actor.userId());
            throw new ConflictException(ErrorCode.DISCOUNT_CAMPAIGN_OVERLAP, "Another campaign runs during these dates");
        }
        requireChargeable(percent, actor);
        campaign.setName(name(dto.name(), actor));
        campaign.setLabel(label(dto.label(), actor));
        campaign.setPercent(percent);
        campaign.setStartsAt(startsAt);
        campaign.setEndsAt(endsAt);
    }

    /** Every live duration of every public plan must still be chargeable at this percent. */
    private void requireChargeable(BigDecimal percent, AdminActor actor) {
        List<PlanTier> plans = planTierRepository.findByIsAssignableTrueAndIsPublicTrueOrderByScopeAscSortOrderAsc();
        Map<UUID, List<PlanCoverageOption>> options = planCoverageOptionService.activeInitialByPlan(
                plans.stream().map(PlanTier::getId).toList());
        List<String> tooCheap = plans.stream()
                .filter(plan -> options.getOrDefault(plan.getId(), List.of()).stream().anyMatch(option ->
                        CheckoutService.belowMinimumCharge(
                                CollaborationPricing.applyDiscount(option.getPriceAmountMinor(), percent), plan.getPriceCurrency())))
                .map(PlanTier::getName)
                .toList();
        if (!tooCheap.isEmpty()) {
            String names = String.join(", ", tooCheap);
            log.warn("Discount campaign write rejected: reason=price_too_low plans={} actorId={}", names, actor.userId());
            throw new ConflictException(ErrorCode.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW,
                    "This percent makes " + names + " too cheap to charge.", "discountCampaign.priceTooLow", names);
        }
    }

    private void record(AdminActor actor, AdminAuditAction action, DiscountCampaign campaign) {
        adminAuditService.record(actor, action, TARGET_TYPE, campaign.getId(), null, Map.of(
                "percent", campaign.getPercent().toPlainString(),
                "startsAt", campaign.getStartsAt().toString(),
                "endsAt", campaign.getEndsAt().toString()));
    }

    private static String name(String raw, AdminActor actor) {
        String cleaned = raw == null ? null : TextNormalizer.forStorage(raw);
        if (cleaned == null || cleaned.isEmpty() || cleaned.length() > NAME_MAX) {
            throw rejected(actor, "name", "name must be 1 to " + NAME_MAX + " characters");
        }
        return cleaned;
    }

    private static String label(String raw, AdminActor actor) {
        String cleaned = raw == null ? null : TextNormalizer.forStorage(raw);
        if (cleaned == null || cleaned.isEmpty()) return null;
        if (cleaned.length() > LABEL_MAX) {
            throw rejected(actor, "label", "label must be at most " + LABEL_MAX + " characters");
        }
        return cleaned;
    }

    private static BigDecimal percent(BigDecimal raw, AdminActor actor) {
        if (raw == null || raw.signum() <= 0 || raw.compareTo(HUNDRED) >= 0 || raw.stripTrailingZeros().scale() > 2) {
            throw rejected(actor, "percent", "percent must be above 0 and below 100, with up to two decimals");
        }
        return raw;
    }

    /** The links' base name: lowercase letters, digits, dot, dash and underscore, starting with a letter or digit. */
    static String linkName(String raw, AdminActor actor) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (value.length() > LINK_NAME_MAX || !LINK_NAME.matcher(value).matches()) {
            throw rejected(actor, "link_name", "linkName must be 1 to " + LINK_NAME_MAX + " lowercase letters, digits, dots, dashes or underscores");
        }
        return value;
    }

    private DiscountCampaign require(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("DiscountCampaign", id));
    }

    static DiscountCampaignStatus statusOf(DiscountCampaign campaign, OffsetDateTime now) {
        if (!Boolean.TRUE.equals(campaign.getActive())) return DiscountCampaignStatus.OFF;
        if (!campaign.getEndsAt().isAfter(now)) return DiscountCampaignStatus.ENDED;
        if (campaign.getStartsAt().isAfter(now)) return DiscountCampaignStatus.SCHEDULED;
        return DiscountCampaignStatus.LIVE;
    }

    private static DiscountCampaignAdminDto toAdminDto(DiscountCampaign campaign, OffsetDateTime now) {
        return new DiscountCampaignAdminDto(campaign.getId(), campaign.getName(), campaign.getPercent(), campaign.getLabel(),
                campaign.getLinkName(), campaign.getStartsAt(), campaign.getEndsAt(), statusOf(campaign, now), campaign.getCreatedAt());
    }

    private static BadRequestException rejected(AdminActor actor, String reason, String message) {
        log.warn("Discount campaign write rejected: reason={} actorId={}", reason, actor.userId());
        return new BadRequestException(ErrorCode.DISCOUNT_CAMPAIGN_INVALID, message);
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.campaign.DiscountCampaignServiceTest"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/main/java/event_social_media/dto/campaign src/main/java/event_social_media/service/campaign/DiscountCampaignService.java src/main/java/event_social_media/service/billing/CheckoutService.java src/main/java/event_social_media/exception/ErrorCode.java src/main/java/event_social_media/model/audit/AdminAuditAction.java src/main/resources/i18n src/test/java/event_social_media/service/campaign/DiscountCampaignServiceTest.java
git commit -m "KAN-114: add the discount campaign service and its saving rules"
```

## Task 5: Controllers and security

**Files:**
- Create: `src/main/java/event_social_media/controller/campaign/DiscountCampaignAdminController.java`
- Create: `src/main/java/event_social_media/controller/campaign/DiscountCampaignPublicController.java`
- Modify: `src/main/java/event_social_media/config/SecurityConfig.java:166`
- Test: `src/test/java/event_social_media/controller/campaign/DiscountCampaignControllersTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.controller.campaign;

import event_social_media.model.campaign.DiscountCampaign;
import event_social_media.repository.campaign.DiscountCampaignRepository;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DiscountCampaignControllersTest {

    @Autowired private MockMvc mvc;
    @Autowired private DiscountCampaignRepository repository;
    @Autowired private TestFixtures fixtures;

    private MockHttpServletRequestBuilder listAs(String role) {
        return get("/api/admin/discount-campaigns").with(authentication(new UsernamePasswordAuthenticationToken(
                fixtures.newUser().getId().toString(), null, List.of(new SimpleGrantedAuthority(role)))));
    }

    private DiscountCampaign live() {
        DiscountCampaign campaign = new DiscountCampaign();
        campaign.setName("Sale");
        campaign.setPercent(new BigDecimal("20"));
        campaign.setLinkName("sale");
        campaign.setStartsAt(OffsetDateTime.now().minusHours(1));
        campaign.setEndsAt(OffsetDateTime.now().plusHours(1));
        return repository.saveAndFlush(campaign);
    }

    @Test
    void thePublicEndpointIsOpenAndReturnsTheLiveCampaign() throws Exception {
        DiscountCampaign campaign = live();

        mvc.perform(get("/api/public/discount-campaign"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(campaign.getId().toString()))
                .andExpect(jsonPath("$.percent").value(20));
    }

    @Test
    void thePublicEndpointReturnsNothingWithoutOne() throws Exception {
        mvc.perform(get("/api/public/discount-campaign")).andExpect(status().isNoContent());
    }

    @Test
    void theAdminListIsClosedToEveryoneElse() throws Exception {
        mvc.perform(get("/api/admin/discount-campaigns")).andExpect(status().isUnauthorized());
    }

    @Test
    void marketingCantOpenTheAdminList() throws Exception {
        mvc.perform(listAs("ROLE_MARKETING")).andExpect(status().isForbidden());
    }

    @Test
    void anAdminCanOpenTheAdminList() throws Exception {
        mvc.perform(listAs("ROLE_ADMIN")).andExpect(status().isOk());
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.controller.campaign.DiscountCampaignControllersTest"`
Expected: FAIL with 401 or 404 on the public endpoint.

- [ ] **Step 3: Write the admin controller**

```java
package event_social_media.controller.campaign;

import event_social_media.dto.campaign.DiscountCampaignAdminDto;
import event_social_media.dto.campaign.DiscountCampaignRequestDto;
import event_social_media.security.ClientAddressResolver;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.campaign.DiscountCampaignService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Discounts every plan for a set time. Same permission as editing a plan's discount. */
@RestController
@RequestMapping("/api/admin/discount-campaigns")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DiscountCampaignAdminController {

    private final DiscountCampaignService discountCampaignService;
    private final ClientAddressResolver clientAddressResolver;

    @GetMapping
    public List<DiscountCampaignAdminDto> findAll() {
        return discountCampaignService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DiscountCampaignAdminDto create(@Valid @RequestBody DiscountCampaignRequestDto dto,
                                           Authentication authentication, HttpServletRequest request) {
        return discountCampaignService.create(dto, actor(authentication, request));
    }

    @PutMapping("/{id}")
    public DiscountCampaignAdminDto update(@PathVariable UUID id, @Valid @RequestBody DiscountCampaignRequestDto dto,
                                           Authentication authentication, HttpServletRequest request) {
        return discountCampaignService.update(id, dto, actor(authentication, request));
    }

    @PostMapping("/{id}/stop")
    public DiscountCampaignAdminDto stop(@PathVariable UUID id, Authentication authentication, HttpServletRequest request) {
        return discountCampaignService.stop(id, actor(authentication, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication, HttpServletRequest request) {
        discountCampaignService.delete(id, actor(authentication, request));
    }

    private AdminActor actor(Authentication authentication, HttpServletRequest request) {
        return new AdminActor(UUID.fromString((String) authentication.getPrincipal()), clientAddressResolver.resolve(request));
    }
}
```

- [ ] **Step 4: Write the public controller**

```java
package event_social_media.controller.campaign;

import event_social_media.dto.campaign.DiscountCampaignLiveDto;
import event_social_media.service.campaign.DiscountCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The live discount campaign, for anyone: always 200 with {"campaign": ...}, null without one (Next's data
 * cache only stores 200s, so a 204 would never replace a cached campaign). The Next.js app reads this through its
 * own cached route (/api/discount-campaign), so Spring sees about one call per minute per server instance.
 */
@RestController
@RequestMapping("/api/public/discount-campaign")
@RequiredArgsConstructor
public class DiscountCampaignPublicController {

    private final DiscountCampaignService discountCampaignService;

    public record LiveResponse(DiscountCampaignLiveDto campaign) {}

    @GetMapping
    public LiveResponse findLive() {
        return new LiveResponse(discountCampaignService.findLive().orElse(null));
    }
}
```

- [ ] **Step 5: Open the public path in `SecurityConfig`**

Below the `/api/public/site-notices` line (l.166):

```java
                .requestMatchers(HttpMethod.GET, "/api/public/discount-campaign").permitAll()
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.controller.campaign.DiscountCampaignControllersTest"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/controller/campaign src/main/java/event_social_media/config/SecurityConfig.java src/test/java/event_social_media/controller/campaign/DiscountCampaignControllersTest.java
git commit -m "KAN-114: add the discount campaign admin and public endpoints"
```

## Task 6: Campaign fields on the public plans

**Files:**
- Modify: `src/main/java/event_social_media/dto/platform/PlanTierResponseDto.java`
- Modify: `src/main/java/event_social_media/mapper/platform/PlanTierMapper.java`
- Modify: `src/main/java/event_social_media/service/platform/PlanTierService.java:711-716`
- Test: add to `src/test/java/event_social_media/service/platform/PlanTierServiceTest.java`

- [ ] **Step 1: Write the failing test**

Add these to `PlanTierServiceTest`, with `@Autowired private DiscountCampaignRepository discountCampaignRepository;` and the imports:

```java
    private void campaign(String linkName, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        DiscountCampaign campaign = new DiscountCampaign();
        campaign.setName("Sale");
        campaign.setPercent(new BigDecimal("20"));
        campaign.setLabel("Black Friday");
        campaign.setLinkName(linkName);
        campaign.setStartsAt(startsAt);
        campaign.setEndsAt(endsAt);
        discountCampaignRepository.saveAndFlush(campaign);
    }

    @Test
    void publicPlansCarryTheCampaignThatIsLiveOrNextUp() {
        campaign("later", OffsetDateTime.now().plusDays(5), OffsetDateTime.now().plusDays(6));
        campaign("next", OffsetDateTime.now().plusHours(1), OffsetDateTime.now().plusDays(1));

        PlanTierResponseDto plan = planTierService.findPublicCatalog().get(0);

        assertThat(plan.getCampaignDiscountPercent()).isEqualByComparingTo("20");
        assertThat(plan.getCampaignDiscountLabel()).isEqualTo("Black Friday");
        assertThat(plan.getCampaignDiscountStartsAt()).isBefore(OffsetDateTime.now().plusHours(2));
        assertThat(plan.getCampaignDiscountEndsAt()).isNotNull();
    }

    @Test
    void publicPlansCarryNoCampaignWithoutOne() {
        assertThat(planTierService.findPublicCatalog().get(0).getCampaignDiscountPercent()).isNull();
    }
```

`findPublicCatalog()` needs at least one public, assignable plan. If the test data has none, set `isPublic` and `isAssignable` on `fixtures.defaultPlan(PlanScope.EVENT)` and save it first, as `DiscountCampaignServiceTest` does.

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.platform.PlanTierServiceTest"`
Expected: FAIL to compile, `getCampaignDiscountPercent` does not exist.

- [ ] **Step 3: Add the DTO fields**

Add to `PlanTierResponseDto`:

```java
    // The discount campaign that is live or next up, on public responses only. Filled by
    // PlanTierService#toPublicDtos; the browser checks the dates itself, because the catalog is cached.
    private BigDecimal campaignDiscountPercent;
    private String campaignDiscountLabel;
    private OffsetDateTime campaignDiscountStartsAt;
    private OffsetDateTime campaignDiscountEndsAt;
```

- [ ] **Step 4: Keep the mapper from mapping them**

Add to `PlanTierMapper#toResponseDto`, and extend the comment above it with "The campaign fields likewise.":

```java
    @Mapping(target = "campaignDiscountPercent", ignore = true)
    @Mapping(target = "campaignDiscountLabel", ignore = true)
    @Mapping(target = "campaignDiscountStartsAt", ignore = true)
    @Mapping(target = "campaignDiscountEndsAt", ignore = true)
```

- [ ] **Step 5: Fill them in `PlanTierService`**

Add the field `private final DiscountCampaignRepository discountCampaignRepository;`. In `toPublicDtos`, call `fillCampaign(dtos);` after `fillModuleConfigs(dtos);`, and add:

```java
    /** The campaign that is live or next up, so a catalog cached for minutes still changes prices on time. */
    private void fillCampaign(List<PlanTierResponseDto> dtos) {
        discountCampaignRepository.findFirstByActiveTrueAndEndsAtGreaterThanOrderByStartsAtAsc(OffsetDateTime.now(ZoneOffset.UTC))
                .ifPresent(campaign -> dtos.forEach(dto -> {
                    dto.setCampaignDiscountPercent(campaign.getPercent());
                    dto.setCampaignDiscountLabel(campaign.getLabel());
                    dto.setCampaignDiscountStartsAt(campaign.getStartsAt());
                    dto.setCampaignDiscountEndsAt(campaign.getEndsAt());
                }));
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.platform.PlanTierServiceTest"`
Expected: PASS.

- [ ] **Step 7: Run the whole backend suite**

Run: `./gradlew test`
Expected: PASS. Any snapshot or JSON assertion on `/api/config` that lists exact fields needs the four new nullable fields.

- [ ] **Step 8: Commit and open the PR**

```bash
git add src/main/java/event_social_media/dto/platform/PlanTierResponseDto.java src/main/java/event_social_media/mapper/platform/PlanTierMapper.java src/main/java/event_social_media/service/platform/PlanTierService.java src/test/java/event_social_media/service/platform/PlanTierServiceTest.java
git commit -m "KAN-114: send the live or next campaign on public plans"
git push -u origin claude/kan-114-discount-campaigns
gh pr create --base staging --title "KAN-114: Discount campaign record, pricing and public endpoint" --body-file -
```

The PR body says what changed, that nothing shows until a campaign is created, and that the frontend PR (KAN-115) follows. It ends with the attribution line given in the session.

---

# Step 2: link sets (KAN-116)

Start from the latest `staging` once KAN-114 is merged.

## Task 7: Link columns

**Files:**
- Create: `src/main/resources/db/migration/V208__campaign_link_sets.sql`
- Modify: `src/main/java/event_social_media/model/campaign/CampaignLink.java`
- Modify: `src/main/java/event_social_media/dto/campaign/CampaignLinkDto.java`
- Modify: `src/main/java/event_social_media/service/campaign/CampaignLinkService.java`

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================
-- CAMPAIGN LINK SETS (spec 2026-11-03-discount-campaigns-design, storywall repo)
--
-- link_group ties a generated set's links together, using the discount campaign's link_name.
-- destination_anchor is added after the query when the link is built. destination_path keeps its
-- no-fragment rule, and hand-made links have neither.
-- =====================================================

ALTER TABLE campaign_links
    ADD COLUMN link_group VARCHAR(60) NULL,
    ADD COLUMN destination_anchor VARCHAR(20) NULL,
    ADD CONSTRAINT campaign_links_destination_anchor_check CHECK (destination_anchor IS NULL OR destination_anchor = 'pricing');

CREATE INDEX campaign_links_link_group_idx ON campaign_links (link_group) WHERE link_group IS NOT NULL;
```

- [ ] **Step 2: Add the entity fields**

Add to `CampaignLink`:

```java
    /** A generated set's name, shared by its links. Null on a hand-made link. */
    @Column(name = "link_group", length = 60, updatable = false)
    private String linkGroup;

    /** Added after the query when the link is built. Only {@code pricing}. */
    @Column(name = "destination_anchor", length = 20, updatable = false)
    private String destinationAnchor;
```

- [ ] **Step 3: Add them to the DTO**

Replace the record header in `CampaignLinkDto` so it reads:

```java
public record CampaignLinkDto(UUID id, String name, String destinationPath, String utmSource, String utmMedium,
                              String utmCampaign, OffsetDateTime createdAt, String linkGroup, String destinationAnchor) {}
```

Keep its existing Javadoc and imports. Update `CampaignLinkService.toDto`:

```java
    public static CampaignLinkDto toDto(CampaignLink link) {
        return new CampaignLinkDto(link.getId(), link.getName(), link.getDestinationPath(), link.getUtmSource(),
                link.getUtmMedium(), link.getUtmCampaign(), link.getCreatedAt(), link.getLinkGroup(), link.getDestinationAnchor());
    }
```

- [ ] **Step 4: Share the two validators inside the package**

In `CampaignLinkService`, drop `private` from `name` and `utm` so `CampaignLinkSetService` can use them:

```java
    static String name(String raw, AdminActor actor) {
```

```java
    static String utm(String raw, String field, AdminActor actor) {
```

- [ ] **Step 5: Run the existing link tests**

Run: `./gradlew test --tests "event_social_media.controller.campaign.CampaignLinkAdminControllerTest" --tests "event_social_media.service.platform.CampaignReportPostgresTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V208__campaign_link_sets.sql src/main/java/event_social_media/model/campaign/CampaignLink.java src/main/java/event_social_media/dto/campaign/CampaignLinkDto.java src/main/java/event_social_media/service/campaign/CampaignLinkService.java
git commit -m "KAN-116: add link_group and destination_anchor to campaign links"
```

## Task 8: Generating a set

**Files:**
- Create: `src/main/java/event_social_media/dto/campaign/CampaignLinkSetRequestDto.java`, `CampaignLinkSetDto.java`
- Create: `src/main/java/event_social_media/service/campaign/CampaignLinkSetService.java`
- Modify: `src/main/java/event_social_media/controller/campaign/CampaignLinkAdminController.java`
- Test: `src/test/java/event_social_media/service/campaign/CampaignLinkSetServiceTest.java`

- [ ] **Step 1: Write the DTOs**

```java
package event_social_media.dto.campaign;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The name is at most 50 so the longest link name, with " · Instagram story · Paid · EL", fits in 80. */
public record CampaignLinkSetRequestDto(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 60) String linkName,
        @NotBlank @Pattern(regexp = "en|el") String language) {}
```

```java
package event_social_media.dto.campaign;

import java.util.List;

/** The whole set, whichever of its links this call created. */
public record CampaignLinkSetDto(List<CampaignLinkDto> links, int created) {}
```

- [ ] **Step 2: Write the failing test**

```java
package event_social_media.service.campaign;

import event_social_media.dto.campaign.CampaignLinkDto;
import event_social_media.dto.campaign.CampaignLinkSetDto;
import event_social_media.dto.campaign.CampaignLinkSetRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class CampaignLinkSetServiceTest {

    @Autowired private CampaignLinkSetService service;
    @Autowired private CampaignLinkRepository repository;
    @Autowired private TestFixtures fixtures;

    private AdminActor actor;

    @BeforeEach
    void setUp() {
        actor = new AdminActor(fixtures.newAdmin().getId(), "203.0.113.7");
    }

    private static CampaignLinkSetRequestDto request(String language) {
        return new CampaignLinkSetRequestDto("Black Friday", "bf", language);
    }

    @Test
    void createsEightLinksForALanguage() {
        CampaignLinkSetDto set = service.generate(request("el"), actor);

        assertThat(set.created()).isEqualTo(8);
        assertThat(set.links()).hasSize(8).allSatisfy(link -> {
            assertThat(link.destinationPath()).isEqualTo("/el");
            assertThat(link.destinationAnchor()).isEqualTo("pricing");
            assertThat(link.linkGroup()).isEqualTo("bf");
        });
        assertThat(set.links()).extracting(CampaignLinkDto::utmSource, CampaignLinkDto::utmMedium, CampaignLinkDto::utmCampaign)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("instagram", "social", "bf-post-el"),
                        org.assertj.core.groups.Tuple.tuple("instagram", "social", "bf-story-el"),
                        org.assertj.core.groups.Tuple.tuple("facebook", "social", "bf-post-el"),
                        org.assertj.core.groups.Tuple.tuple("tiktok", "social", "bf-post-el"),
                        org.assertj.core.groups.Tuple.tuple("instagram", "paid_social", "bf-post-el"),
                        org.assertj.core.groups.Tuple.tuple("instagram", "paid_social", "bf-story-el"),
                        org.assertj.core.groups.Tuple.tuple("facebook", "paid_social", "bf-post-el"),
                        org.assertj.core.groups.Tuple.tuple("tiktok", "paid_social", "bf-post-el"));
        assertThat(set.links().get(5).name()).isEqualTo("Black Friday · Instagram story · Paid · EL");
    }

    @Test
    void englishLinksPointAtTheEnglishHome() {
        assertThat(service.generate(request("en"), actor).links()).allSatisfy(link -> {
            assertThat(link.destinationPath()).isEqualTo("/");
            assertThat(link.utmCampaign()).endsWith("-en");
        });
    }

    @Test
    void aRepeatCreatesNothingAndReturnsTheSameSet() {
        CampaignLinkSetDto first = service.generate(request("el"), actor);
        CampaignLinkSetDto second = service.generate(request("el"), actor);

        assertThat(second.created()).isZero();
        assertThat(second.links()).extracting(CampaignLinkDto::id).isEqualTo(first.links().stream().map(CampaignLinkDto::id).toList());
    }

    @Test
    void aDeletedLinkComesBackOnTheNextClick() {
        CampaignLinkSetDto first = service.generate(request("el"), actor);
        repository.deleteById(first.links().get(0).id());
        repository.flush();

        assertThat(service.generate(request("el"), actor).created()).isEqualTo(1);
    }

    @Test
    void aLinkNameThatIsntAUtmValueIsRejectedAndNothingIsSaved() {
        long before = repository.count();

        assertThatThrownBy(() -> service.generate(new CampaignLinkSetRequestDto("x", "Μαύρη", "el"), actor))
                .isInstanceOf(BadRequestException.class);
        assertThat(repository.count()).isEqualTo(before);
    }
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignLinkSetServiceTest"`
Expected: FAIL to compile, `CampaignLinkSetService` does not exist.

- [ ] **Step 4: Write the service**

```java
package event_social_media.service.campaign;

import event_social_media.dto.campaign.CampaignLinkDto;
import event_social_media.dto.campaign.CampaignLinkSetDto;
import event_social_media.dto.campaign.CampaignLinkSetRequestDto;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.campaign.CampaignLink;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.audit.AdminAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The links a campaign needs for social posts and paid ads, in one language. Creates whichever are
 * missing in one transaction and leaves the rest alone, so a repeat click creates no duplicates and a
 * link deleted by hand comes back only when asked for.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignLinkSetService {

    private static final String ANCHOR = "pricing";
    private static final String TARGET_TYPE = "CAMPAIGN_LINK";
    private static final Map<String, String> LANDING_PAGE = Map.of("en", "/", "el", "/el");

    private record Placement(String label, String source, String medium, String format) {}

    private static final List<Placement> SET = List.of(
            new Placement("Instagram post", "instagram", "social", "post"),
            new Placement("Instagram story", "instagram", "social", "story"),
            new Placement("Facebook post", "facebook", "social", "post"),
            new Placement("TikTok post", "tiktok", "social", "post"),
            new Placement("Instagram post · Paid", "instagram", "paid_social", "post"),
            new Placement("Instagram story · Paid", "instagram", "paid_social", "story"),
            new Placement("Facebook post · Paid", "facebook", "paid_social", "post"),
            new Placement("TikTok post · Paid", "tiktok", "paid_social", "post"));

    private final CampaignLinkRepository repository;
    private final AdminAuditService adminAuditService;

    /** Joins the caller's transaction, so a new discount campaign and its links save or fail together. */
    @Transactional
    public CampaignLinkSetDto generate(CampaignLinkSetRequestDto dto, AdminActor actor) {
        String path = LANDING_PAGE.get(dto.language());
        if (path == null) {
            log.warn("Campaign link set rejected: reason=language actorId={}", actor.userId());
            throw new BadRequestException(ErrorCode.CAMPAIGN_LINK_INVALID, "language must be en or el");
        }
        String linkName = CampaignLinkService.utm(dto.linkName(), "linkName", actor);
        List<CampaignLinkDto> links = new ArrayList<>();
        int created = 0;
        for (Placement placement : SET) {
            String utmCampaign = linkName + "-" + placement.format() + "-" + dto.language();
            CampaignLink existing = repository
                    .findByUtmSourceAndUtmMediumAndUtmCampaign(placement.source(), placement.medium(), utmCampaign)
                    .orElse(null);
            if (existing != null) {
                links.add(CampaignLinkService.toDto(existing));
                continue;
            }
            CampaignLink link = new CampaignLink();
            link.setName(CampaignLinkService.name(
                    dto.name() + " · " + placement.label() + " · " + dto.language().toUpperCase(Locale.ROOT), actor));
            link.setDestinationPath(path);
            link.setDestinationAnchor(ANCHOR);
            link.setLinkGroup(linkName);
            link.setUtmSource(placement.source());
            link.setUtmMedium(placement.medium());
            link.setUtmCampaign(utmCampaign);
            CampaignLink saved = repository.saveAndFlush(link);
            adminAuditService.record(actor, AdminAuditAction.CAMPAIGN_LINK_CREATED, TARGET_TYPE, saved.getId(), null,
                    Map.of("utmSource", saved.getUtmSource(), "utmMedium", saved.getUtmMedium(), "utmCampaign", saved.getUtmCampaign()));
            links.add(CampaignLinkService.toDto(saved));
            created++;
        }
        log.info("Campaign link set {} {}: {} created (actorId={})", linkName, dto.language(), created, actor.userId());
        return new CampaignLinkSetDto(links, created);
    }
}
```

- [ ] **Step 5: Add the endpoint**

In `CampaignLinkAdminController`, add the field `private final CampaignLinkSetService campaignLinkSetService;` and:

```java
    /** The 8 links for a language. Creates whichever are missing and returns the whole set. */
    @PostMapping("/sets")
    public CampaignLinkSetDto generateSet(@Valid @RequestBody CampaignLinkSetRequestDto dto,
                                          Authentication authentication, HttpServletRequest request) {
        return campaignLinkSetService.generate(dto, actor(authentication, request));
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.campaign.CampaignLinkSetServiceTest"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/dto/campaign src/main/java/event_social_media/service/campaign/CampaignLinkSetService.java src/main/java/event_social_media/controller/campaign/CampaignLinkAdminController.java src/test/java/event_social_media/service/campaign/CampaignLinkSetServiceTest.java
git commit -m "KAN-116: generate a campaign link set for a language"
```

## Task 9: The Greek set on creating a campaign

**Files:**
- Modify: `src/main/java/event_social_media/service/campaign/DiscountCampaignService.java`
- Test: add to `src/test/java/event_social_media/service/campaign/DiscountCampaignServiceTest.java`

- [ ] **Step 1: Write the failing test**

Add to `DiscountCampaignServiceTest`, with `@Autowired private CampaignLinkRepository linkRepository;`:

```java
    @Test
    void creatingACampaignCreatesItsGreekLinksAndEditingItDoesnt() {
        DiscountCampaignAdminDto saved = service.create(request("bf", hours(1), hours(2)), actor);

        assertThat(linkRepository.findAll()).filteredOn(link -> "bf".equals(link.getLinkGroup())).hasSize(8)
                .allSatisfy(link -> assertThat(link.getDestinationPath()).isEqualTo("/el"));

        linkRepository.deleteAll();
        linkRepository.flush();
        service.update(saved.id(), request("bf", hours(1), hours(3)), actor);

        assertThat(linkRepository.findAll()).isEmpty();
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.campaign.DiscountCampaignServiceTest"`
Expected: FAIL, no links exist.

- [ ] **Step 3: Generate the set in `create`**

In `DiscountCampaignService`, add the field `private final CampaignLinkSetService campaignLinkSetService;`, the import `event_social_media.dto.campaign.CampaignLinkSetRequestDto`, and the constant:

```java
    private static final String AUTO_LINK_LANGUAGE = "el";
```

In `create`, directly after `record(actor, AdminAuditAction.DISCOUNT_CAMPAIGN_CREATED, saved);`:

```java
        // In this transaction, so the URLs exist before the campaign goes live.
        campaignLinkSetService.generate(new CampaignLinkSetRequestDto(saved.getName(), saved.getLinkName(), AUTO_LINK_LANGUAGE), actor);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.campaign.DiscountCampaignServiceTest"`
Expected: PASS.

- [ ] **Step 5: Run the whole backend suite**

Run: `./gradlew test`
Expected: PASS.

- [ ] **Step 6: Commit and open the PR**

```bash
git add src/main/java/event_social_media/service/campaign/DiscountCampaignService.java src/test/java/event_social_media/service/campaign/DiscountCampaignServiceTest.java
git commit -m "KAN-116: create the Greek link set with a new discount campaign"
git push -u origin claude/kan-116-campaign-link-sets
gh pr create --base staging --title "KAN-116: Campaign link sets" --body-file -
```

---

# Step 3: sales tracking (KAN-118)

Start from the latest `staging` once KAN-116 is merged.

## Task 10: Crediting an order

**Files:**
- Create: `src/main/resources/db/migration/V209__order_attribution.sql`
- Create: `src/main/java/event_social_media/dto/billing/CheckoutAttributionDto.java`
- Create: `src/main/java/event_social_media/service/billing/OrderAttribution.java`
- Modify: `src/main/java/event_social_media/model/billing/EventOrder.java`
- Modify: `src/main/java/event_social_media/dto/billing/ActivationCheckoutRequestDto.java`, `UpgradeCheckoutRequestDto.java`
- Modify: `src/main/java/event_social_media/controller/billing/CheckoutController.java:84,126`
- Modify: `src/main/java/event_social_media/service/billing/CheckoutService.java`
- Test: `src/test/java/event_social_media/service/billing/OrderAttributionTest.java`

- [ ] **Step 1: Write the failing test**

```java
package event_social_media.service.billing;

import event_social_media.dto.billing.CheckoutAttributionDto;
import event_social_media.model.billing.EventOrder;
import event_social_media.model.campaign.CampaignLink;
import event_social_media.model.event.Event;
import event_social_media.model.user.User;
import event_social_media.repository.billing.EventOrderRepository;
import event_social_media.repository.campaign.CampaignLinkRepository;
import event_social_media.repository.event.EventRepository;
import event_social_media.service.collaboration.PartnerBrandingAcceptance;
import event_social_media.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class OrderAttributionTest {

    private static final String TERMS = "2026-10-12";

    @Autowired private CheckoutService checkoutService;
    @Autowired private CampaignLinkRepository linkRepository;
    @Autowired private EventOrderRepository orderRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private TestFixtures fixtures;

    private User host;
    private Event draft;

    @BeforeEach
    void setUp() {
        host = fixtures.newUser();
        draft = fixtures.newDraftEventHostedBy(host);
        draft.setStartAt(OffsetDateTime.now().plusDays(30));
        draft.setEndAt(OffsetDateTime.now().plusDays(31));
        eventRepository.saveAndFlush(draft);

        CampaignLink link = new CampaignLink();
        link.setName("Instagram");
        link.setDestinationPath("/el");
        link.setUtmSource("instagram");
        link.setUtmMedium("social");
        link.setUtmCampaign("bf-post-el");
        linkRepository.saveAndFlush(link);
    }

    private EventOrder checkoutWith(CheckoutAttributionDto attribution) {
        checkoutService.startActivation(draft.getId(), host.getId(), null, CheckoutConsent.given(TERMS),
                PartnerBrandingAcceptance.none(), attribution);
        return orderRepository.findAll().stream()
                .filter(order -> draft.getId().equals(order.eventId()))
                .findFirst().orElseThrow();
    }

    @Test
    void storesValuesThatMatchASavedLink_normalized() {
        EventOrder order = checkoutWith(new CheckoutAttributionDto(" Instagram", "SOCIAL", "bf-post-el"));

        assertThat(order.getAttributionUtmSource()).isEqualTo("instagram");
        assertThat(order.getAttributionUtmMedium()).isEqualTo("social");
        assertThat(order.getAttributionUtmCampaign()).isEqualTo("bf-post-el");
    }

    @Test
    void dropsValuesThatMatchNoLink() {
        EventOrder order = checkoutWith(new CheckoutAttributionDto("instagram", "social", "made-up"));

        assertThat(order.getAttributionUtmSource()).isNull();
        assertThat(order.getAttributionUtmCampaign()).isNull();
    }

    @Test
    void anOrderWithNoAttributionStaysEmpty() {
        assertThat(checkoutWith(null).getAttributionUtmSource()).isNull();
    }

    @Test
    void aReissuedSessionKeepsTheFirstCredit() {
        checkoutWith(new CheckoutAttributionDto("instagram", "social", "bf-post-el"));

        EventOrder order = checkoutWith(new CheckoutAttributionDto("facebook", "social", "other"));

        assertThat(order.getAttributionUtmSource()).isEqualTo("instagram");
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./gradlew test --tests "event_social_media.service.billing.OrderAttributionTest"`
Expected: FAIL to compile, `CheckoutAttributionDto` does not exist.

- [ ] **Step 3: Write the migration**

```sql
-- =====================================================
-- ORDER ATTRIBUTION (spec 2026-11-03-discount-campaigns-design, storywall repo)
--
-- The saved campaign link the buyer last came through, set when the order is created. Only
-- activations and upgrades are credited. Orders placed before this have none.
-- =====================================================

ALTER TABLE event_orders
    ADD COLUMN attribution_utm_source VARCHAR(100) NULL,
    ADD COLUMN attribution_utm_medium VARCHAR(100) NULL,
    ADD COLUMN attribution_utm_campaign VARCHAR(100) NULL;

CREATE INDEX event_orders_attribution_idx ON event_orders (paid_at)
    WHERE attribution_utm_source IS NOT NULL;
```

- [ ] **Step 4: Add the entity fields**

Add to `EventOrder`, above `eventId()`:

```java
    /** The saved campaign link the buyer last came through (V209); null when none. Set on creation, never re-stamped. */
    @Column(name = "attribution_utm_source", length = 100, updatable = false)
    private String attributionUtmSource;

    @Column(name = "attribution_utm_medium", length = 100, updatable = false)
    private String attributionUtmMedium;

    @Column(name = "attribution_utm_campaign", length = 100, updatable = false)
    private String attributionUtmCampaign;
```

- [ ] **Step 5: Write the DTO and the value type**

```java
package event_social_media.dto.billing;

import jakarta.validation.constraints.Size;

/** The last campaign link the browser came through. Untrusted: kept only when it matches a saved link. */
public record CheckoutAttributionDto(@Size(max = 100) String source, @Size(max = 100) String medium, @Size(max = 100) String campaign) {}
```

```java
package event_social_media.service.billing;

/** A saved campaign link's values, to credit an order to. */
public record OrderAttribution(String source, String medium, String campaign) {}
```

- [ ] **Step 6: Accept it on the two request bodies**

Add `@Valid CheckoutAttributionDto attribution` as the last component of `ActivationCheckoutRequestDto` and of `UpgradeCheckoutRequestDto`, with the import `jakarta.validation.Valid` if missing. Nothing under `src/main` builds these records positionally. If a test does, it gets `null` as the new last argument.

- [ ] **Step 7: Pass it through `CheckoutController`**

```java
        return checkoutService.startActivation(eventId, callerId, body.collaborationCode(),
                CheckoutConsent.of(body.termsVersion(), body.requestsImmediateStart(), body.acknowledgesWithdrawalTerms()),
                new PartnerBrandingAcceptance(body.acceptsPartnerBranding(), body.partnerBrandingNoticeVersion()),
                body.attribution());
```

```java
        return checkoutService.startUpgrade(eventId, body.planTierCode(), body.coverageOptionId(), callerId,
                CheckoutConsent.of(body.termsVersion(), body.requestsImmediateStart(), body.acknowledgesWithdrawalTerms()),
                body.attribution());
```

- [ ] **Step 8: Thread it through `CheckoutService`**

Add the field after `billingService`:

```java
    private final CampaignLinkRepository campaignLinkRepository;
```

Keep the existing `startActivation` overloads for the many tests that use them, and make them delegate:

```java
    public CheckoutResponseDto startActivation(UUID eventId, UUID callerId, String rawCode, CheckoutConsent consent,
                                               PartnerBrandingAcceptance branding) {
        return startActivation(eventId, callerId, rawCode, consent, branding, null);
    }

    /** With the browser's last campaign link, credited to the order when it matches a saved one. */
    public CheckoutResponseDto startActivation(UUID eventId, UUID callerId, String rawCode, CheckoutConsent consent,
                                               PartnerBrandingAcceptance branding, CheckoutAttributionDto attribution) {
        requireCurrentTerms(consent.termsVersion());
        OrderAttribution credited = credited(attribution);
        return checkout(callerId, synced -> decideActivation(eventId, callerId, rawCode, consent, branding, credited, synced));
    }
```

Do the same for `startUpgrade`:

```java
    public CheckoutResponseDto startUpgrade(UUID eventId, String targetPlanCode, UUID coverageOptionId,
                                            UUID callerId, CheckoutConsent consent) {
        return startUpgrade(eventId, targetPlanCode, coverageOptionId, callerId, consent, null);
    }

    public CheckoutResponseDto startUpgrade(UUID eventId, String targetPlanCode, UUID coverageOptionId,
                                            UUID callerId, CheckoutConsent consent, CheckoutAttributionDto attribution) {
        requireCurrentTerms(consent.termsVersion());
        OrderAttribution credited = credited(attribution);
        return checkout(callerId,
                synced -> decideUpgrade(eventId, targetPlanCode, coverageOptionId, callerId, consent, credited, synced));
    }
```

Add the helper next to them:

```java
    /** The saved link matching these values, trimmed and lowercased as links are stored; null when none. */
    private OrderAttribution credited(CheckoutAttributionDto attribution) {
        if (attribution == null || attribution.source() == null || attribution.medium() == null || attribution.campaign() == null) {
            return null;
        }
        return campaignLinkRepository.findByUtmSourceAndUtmMediumAndUtmCampaign(
                        attribution.source().trim().toLowerCase(Locale.ROOT),
                        attribution.medium().trim().toLowerCase(Locale.ROOT),
                        attribution.campaign().trim().toLowerCase(Locale.ROOT))
                .map(link -> new OrderAttribution(link.getUtmSource(), link.getUtmMedium(), link.getUtmCampaign()))
                .orElse(null);
    }
```

Then:
- Add `OrderAttribution credited` before `BusinessCustomer synced` in the signatures of `decideActivation` and `decideUpgrade`.
- Add `OrderAttribution credited` as the last parameter of `openCheckout`.
- In the two `openCheckout` calls in `decideActivation` (l.237) and `decideUpgrade` (l.460), pass `credited` last.
- In the storage pack (l.519) and extension (l.551) calls, pass `null` last: they are not credited.
- In the `orElseGet` lambda that writes the fresh order, after `fresh.setBuyerProviderCustomerId(customerId);`:

```java
                    if (credited != null) {
                        fresh.setAttributionUtmSource(credited.source());
                        fresh.setAttributionUtmMedium(credited.medium());
                        fresh.setAttributionUtmCampaign(credited.campaign());
                    }
```

Writing only on the fresh order is what keeps a reissued session's first credit.

- [ ] **Step 9: Run the test to verify it passes**

Run: `./gradlew test --tests "event_social_media.service.billing.OrderAttributionTest" --tests "event_social_media.service.billing.CheckoutServiceTest"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/main/resources/db/migration/V209__order_attribution.sql src/main/java/event_social_media/dto/billing src/main/java/event_social_media/service/billing src/main/java/event_social_media/model/billing/EventOrder.java src/main/java/event_social_media/controller/billing/CheckoutController.java src/test/java/event_social_media/service/billing/OrderAttributionTest.java
git commit -m "KAN-118: credit activations and upgrades to the last campaign link"
```

## Task 11: Sales on the campaigns report

**Files:**
- Modify: `src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java`
- Modify: `src/main/java/event_social_media/dto/platform/CampaignRowDto.java`
- Modify: `src/main/java/event_social_media/service/platform/CampaignReportService.java`
- Modify: `src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java:219`
- Test: add to `src/test/java/event_social_media/service/platform/CampaignReportPostgresTest.java`, `src/test/java/event_social_media/controller/platform/CampaignReportsForMarketingTest.java`

- [ ] **Step 1: Write the failing report test**

Add to `CampaignReportPostgresTest`:

```java
    private void creditedOrder(String source, String medium, String campaign, long amountMinor, OffsetDateTime paidAt) {
        User host = fixtures.newUser();
        Event event = fixtures.newEventHostedBy(host);
        entityManager.flush();
        jdbcTemplate.update("""
                update event_orders set paid_at = ?, attribution_utm_source = ?, attribution_utm_medium = ?,
                attribution_utm_campaign = ? where id = ?""",
                paidAt, source, medium, campaign, fixtures.newPaidOrder(event, amountMinor).getId());
    }

    @Test
    void countsCreditedOrdersPaidInTheRange() {
        link("Sale", "instagram", "social", "t2005-sale");
        creditedOrder("instagram", "social", "t2005-sale", 4900, SINCE.plusDays(1));
        creditedOrder("instagram", "social", "t2005-sale", 5100, SINCE.plusDays(2));
        creditedOrder("instagram", "social", "t2005-sale", 9900, UNTIL.plusDays(1));

        CampaignRowDto row = rowFor(campaignReportService.campaigns(SINCE, UNTIL), "t2005-sale");

        assertThat(row.getSales()).isEqualTo(2);
        assertThat(row.getSalesRevenueMinorByCurrency()).containsValue(10_000L);
    }

    @Test
    void aCreditedSaleWithNoSignUpStillShows_andTheSignUpColumnsStayEmpty() {
        link("Sale", "tiktok", "paid_social", "t2005-existing");
        creditedOrder("tiktok", "paid_social", "t2005-existing", 4900, SINCE.plusDays(1));

        CampaignRowDto row = rowFor(campaignReportService.campaigns(SINCE, UNTIL), "t2005-existing");

        assertThat(row.getSales()).isEqualTo(1);
        assertThat(row.getPaidHost()).isZero();
        assertThat(row.getRevenueMinorByCurrency()).isEmpty();
    }
```

In `CampaignReportsForMarketingTest`, in the test that already asserts `revenueMinorByCurrency` is null for a MARKETING caller, add these two lines to its `mockMvc.perform` chain:

```java
                .andExpect(jsonPath("$[0].salesRevenueMinorByCurrency").value(nullValue()))
                .andExpect(jsonPath("$[0].sales").isNumber())
```

- [ ] **Step 2: Run them to verify they fail**

Run: `./gradlew test --tests "event_social_media.service.platform.CampaignReportPostgresTest" --tests "*CampaignReportsForMarketingTest"`
Expected: FAIL to compile, `getSales` does not exist.

- [ ] **Step 3: Add the query**

In `FunnelMetricsRepository`, after `campaignRevenue`:

```java
    /** Paid orders credited to a campaign link, by when they were paid; see V209. */
    @Query(value = """
            select o.attribution_utm_source as "utmSource",
                   o.attribution_utm_medium as "utmMedium",
                   o.attribution_utm_campaign as "utmCampaign",
                   o.currency as "currency",
                   count(*) as "sales",
                   cast(coalesce(sum(o.amount_minor), 0) as bigint) as "amountMinor"
            from event_orders o
            where o.status = 'PAID' and o.settled_by is null and o.amount_minor > 0
              and o.attribution_utm_source is not null
              and o.paid_at >= :since and o.paid_at < :until
            group by 1, 2, 3, 4
            """, nativeQuery = true)
    List<CampaignSalesRow> campaignSales(@Param("since") OffsetDateTime since, @Param("until") OffsetDateTime until);
```

and next to the other projections:

```java
    interface CampaignSalesRow {
        String getUtmSource();
        String getUtmMedium();
        String getUtmCampaign();
        String getCurrency();
        long getSales();
        long getAmountMinor();
    }
```

- [ ] **Step 4: Add the DTO fields**

In `CampaignRowDto`, after `revenueMinorByCurrency`:

```java
    /** Paid orders credited to this link with paid_at in the range, whenever the buyer signed up. */
    private long sales;
    private Map<String, Long> salesRevenueMinorByCurrency = new TreeMap<>();
```

- [ ] **Step 5: Fill them in `CampaignReportService`**

After the `visitRepository.campaigns` loop:

```java
        for (FunnelMetricsRepository.CampaignSalesRow row : funnelRepository.campaignSales(from, to)) {
            CampaignRowDto dto = row(new Key(row.getUtmSource(), row.getUtmMedium(), row.getUtmCampaign()), byKey);
            dto.setSales(dto.getSales() + row.getSales());
            dto.getSalesRevenueMinorByCurrency().put(row.getCurrency(), row.getAmountMinor());
        }
```

- [ ] **Step 6: Hide sales revenue from marketing**

Replace `if (!isAdmin(authentication)) rows.forEach(row -> row.setRevenueMinorByCurrency(null));` in `PlatformMetricsAdminController#campaigns` (l.220):

```java
        if (!isAdmin(authentication)) {
            rows.forEach(row -> {
                row.setRevenueMinorByCurrency(null);
                row.setSalesRevenueMinorByCurrency(null);
            });
        }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `./gradlew test --tests "event_social_media.service.platform.CampaignReportPostgresTest" --tests "*CampaignReportsForMarketingTest"`
Expected: PASS.

- [ ] **Step 8: Run the whole backend suite**

Run: `./gradlew test`
Expected: PASS.

- [ ] **Step 9: Commit and open the PR**

```bash
git add src/main/java/event_social_media/repository/platform/FunnelMetricsRepository.java src/main/java/event_social_media/dto/platform/CampaignRowDto.java src/main/java/event_social_media/service/platform/CampaignReportService.java src/main/java/event_social_media/controller/platform/PlatformMetricsAdminController.java src/test/java/event_social_media
git commit -m "KAN-118: add sales and sales revenue to the campaigns report"
git push -u origin claude/kan-118-campaign-sales-tracking
gh pr create --base staging --title "KAN-118: Credit campaign sales" --body-file -
```
