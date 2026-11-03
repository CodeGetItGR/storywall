# Shopify Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, noindex `/shop` (`/el/shop`) page that lists products synced from connected Shopify stores, grouped into admin-defined categories, where each product's button opens the product on the seller's Shopify store.

**Architecture:** Spring (guestwall-be) keeps a copy of each connected store's products. A platform admin connects a store (domain + Dev Dashboard client ID + client secret), and Spring gets 24-hour Admin API tokens through the client credentials grant, registers `products/*` webhooks, and runs a full sync. Webhooks keep products current within seconds; a nightly full sync catches deletions, collection-membership changes and missed webhooks. The admin creates storywall categories and maps Shopify collections onto them. Next.js renders `/shop` and product pages entirely on the server from public Spring endpoints.

**Tech Stack:** Spring Boot 3.3, JPA/Hibernate, Flyway, Postgres (H2 in tests), `java.net.http.HttpClient`, Shopify GraphQL Admin API `2026-10`; Next.js App Router, next-intl, TanStack Query (admin only), Vitest.

**Two parts, shipped in order.** Part A (backend) is useful and testable on its own (admin endpoints + public endpoints via curl). Part B (frontend) needs Part A deployed to staging.

---

## Decisions (agreed with the user, 2026-10-27)

| Topic | Decision |
| --- | --- |
| Stores | Several sellers over time; the first is the uncle's store (inviart.gr). |
| Connecting a store | Admin pastes credentials in the admin console. Apps created since 2026 come from Shopify's Dev Dashboard and don't give a permanent token, so the admin pastes the **client ID + client secret** and Spring mints tokens. The app must live in the **seller's own Shopify organization** (the client credentials grant fails with `shop_not_permitted` otherwise). Scope: `read_products`. |
| Freshness | Near-instant: Shopify webhooks `PRODUCTS_CREATE`, `PRODUCTS_UPDATE`, `PRODUCTS_DELETE`, plus a nightly full sync and a "Sync now" button. |
| What appears | A product appears when it is **active, published to the Online Store** (`onlineStoreUrl` not null), and in at least one Shopify collection the admin mapped to a **visible** storywall category of a **visible** store. Overlapping products (wedding websites, QR upload) are excluded simply by not mapping their collections. |
| Categories | Admin-defined, `{en, el}` names, slug, order, visibility; each maps to one or more Shopify collections, e.g. `prosklitiria-gamoy` → "Wedding invitations". |
| Product text | Shown as written in Shopify (plain-text `description`, no HTML). Only storywall's own labels are translated. |
| Buying | Link out to `onlineStoreUrl`. No checkout in storywall. |
| Digital vs printed | Derived: a product is digital when none of its variants require shipping. |
| URLs | `/shop`, `/el/shop`, `/shop/{store}/{handle}`, `/el/shop/{store}/{handle}`. Filter by `?category={slug}`, page by `?page={n}`. |
| SEO | **Noindex everywhere** (`NO_INDEX`), not in the sitemap, no hreflang. Product text duplicates the seller's own site; noindex protects both sites' rankings. |
| Release | Behind `showsUnreleasedPages()`; 404 in production until launched. |

## Shopify API facts this plan relies on

- Token: `POST https://{shop}.myshopify.com/admin/oauth/access_token` with form body `grant_type=client_credentials&client_id=…&client_secret=…` → `{"access_token","scope","expires_in":86399}`. No refresh token; request a new one before expiry. ([docs](https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens))
- GraphQL: `POST https://{shop}.myshopify.com/admin/api/2026-10/graphql.json`, header `X-Shopify-Access-Token`. Single query cost cap 1000 points; `THROTTLED` errors mean wait and retry.
- Webhooks are signed with the app's client secret: `X-Shopify-Hmac-Sha256 = base64(HMAC-SHA256(rawBody, clientSecret))`. Also sent: `X-Shopify-Topic` (`products/update`), `X-Shopify-Shop-Domain`, `X-Shopify-Webhook-Id`. Respond 2xx within 5 s or Shopify retries.
- Adding a product to a manual collection fires `collections/update`, not `products/update`. This plan does not subscribe to collection webhooks; membership changes land with the nightly sync or "Sync now".

**Verify before Task A4:** run the GraphQL queries from Task A4 once against the uncle's store with GraphiQL (or curl) to confirm field names on `2026-10` (`inventoryItem.requiresShipping`, `priceRangeV2`, `webhookSubscriptionCreate(webhookSubscription: {uri})`). If a field was renamed, update the query and the fixture together.

---

## File Structure

### Part A: backend (`C:\Users\User\IdeaProjects\event_social_media`, branch from latest `origin/staging`)

| File | Responsibility |
| --- | --- |
| `src/main/resources/db/migration/V180__shop.sql` | Tables. **Check the highest V-number on `origin/staging` and open branches first** (print-picks holds V179, site-notices V178); bump if taken. |
| `src/main/java/event_social_media/config/ShopProperties.java` | `app.shop.*` settings |
| `model/shop/ShopStore.java`, `ShopCategory.java`, `ShopCategoryCollection.java`, `ShopProduct.java`, `ShopImage.java`, `ShopVariant.java` | Entities / JSON value records |
| `repository/shop/*Repository.java` | Data access, incl. the public product query |
| `service/shop/ShopifyAdminClient.java` | The only class that talks to Shopify over HTTP (token, GraphQL, webhook registration) |
| `service/shop/ShopifyProductMapper.java` | Pure: Shopify product JSON → `ShopifyProduct` record |
| `service/shop/ShopifyProduct.java` | Mapped product record |
| `service/shop/ShopifyWebhookVerifier.java` | Pure: HMAC check |
| `service/shop/ShopProductWriter.java` | Transactional upsert/delete of products |
| `service/shop/ShopSyncService.java` | Full sync, single-product sync, webhook registration |
| `service/shop/ShopSyncJob.java` | Nightly cron |
| `service/shop/ShopWebhookListener.java` | `@Async` handler for verified webhooks |
| `service/shop/ShopStoreAdminService.java`, `ShopCategoryAdminService.java` | Admin CRUD + audit |
| `service/shop/ShopPublicService.java` | Public reads |
| `controller/shop/ShopStoreAdminController.java`, `ShopCategoryAdminController.java`, `ShopController.java`, `ShopWebhookController.java` | HTTP |
| `dto/shop/*` | Request/response DTOs |
| Modify: `config/SecurityConfig.java`, `model/audit/AdminAuditAction.java`, `exception/ErrorCode.java`, `src/main/resources/application.properties`, `src/test/resources/application.properties` | Wiring |

### Part B: frontend (this repo, branch from latest `origin/staging`)

| File | Responsibility |
| --- | --- |
| Modify: `lib/api/types.ts`, `lib/api/endpoints.ts` | DTO types and paths |
| `hooks/useAdminShopStores.ts`, `hooks/useAdminShopCategories.ts` | Admin queries/mutations |
| `hooks/useShopStoreForm.ts`, `hooks/useShopCategoryForm.ts` | Drawer form state |
| `components/admin/shop/ShopPanel.tsx`, `ShopStoresTable.tsx`, `ShopStoreDrawer.tsx`, `ShopCategoriesTable.tsx`, `ShopCategoryDrawer.tsx`, `ShopSyncPill.tsx` | Admin UI |
| Modify: `components/admin/AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx` | New "Shop" tab in the Catalog group |
| `lib/shop.ts` | Paths, price formatting, image sizing, page parsing |
| `lib/shopMetadata.ts` | Titles + `NO_INDEX` |
| Modify: `i18n/publicLocale.ts` | `SHOP_PATHS`, locale for `/el/shop/**` |
| `components/shop/ShopPage.tsx`, `ShopCategoryTabs.tsx`, `ShopProductGrid.tsx`, `ShopProductCard.tsx`, `ShopPagination.tsx`, `ShopProductPage.tsx` | Public UI (server components) |
| `app/(landing)/shop/page.tsx`, `app/(landing)/shop/[store]/[handle]/page.tsx`, `app/(landing)/[slug]/shop/page.tsx`, `app/(landing)/[slug]/shop/[store]/[handle]/page.tsx` | Routes |
| Modify: `lib/security/securityHeaders.mjs` | `img-src https://cdn.shopify.com` |
| Modify: `messages/en.json`, `messages/el.json` | `AdminPage.shop.*`, `Shop.*` |

---

# Part A — Backend

Run all backend commands from `C:\Users\User\IdeaProjects\event_social_media` in a worktree branched from `origin/staging`. Test command shape: `./gradlew test --tests "<FQCN>"`.

### Task A1: Migration and properties

**Files:**
- Create: `src/main/resources/db/migration/V180__shop.sql`
- Create: `src/main/java/event_social_media/config/ShopProperties.java`
- Modify: `src/main/resources/application.properties`, `src/test/resources/application.properties` (the test file fully shadows main; add the same keys to both)
- Test: `src/test/java/event_social_media/migration/ShopMigrationTest.java`

- [ ] **Step 1: Write the failing migration test** (copy the Testcontainers setup from `LandingCategoriesMigrationTest` in the same package; only the assertions below are new)

```java
@Test
void createsShopTables() {
    List<String> tables = jdbc.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'shop_%' ORDER BY table_name",
            String.class);
    assertThat(tables).containsExactly(
            "shop_categories", "shop_category_collections", "shop_product_collections", "shop_products", "shop_stores");
}

@Test
void rejectsBadStoreSlug() {
    assertThatThrownBy(() -> jdbc.update(
            "INSERT INTO shop_stores (name, slug, shop_domain, client_id, client_secret) VALUES ('X', 'Bad Slug', 'x.myshopify.com', 'id', 'secret')"))
            .isInstanceOf(DataIntegrityViolationException.class);
}
```

- [ ] **Step 2: Run it, expect FAIL** (`relation "shop_stores" does not exist`)

Run: `./gradlew test --tests "event_social_media.migration.ShopMigrationTest"`

- [ ] **Step 3: Write the migration**

```sql
-- =====================================================
-- SHOP (plan 2026-10-27-shopify-shop)
--
-- Products copied from connected Shopify stores, shown on the public /shop page. Shopify is the
-- source of truth: rows here are overwritten by every sync and never edited in storywall.
-- client_secret is AES-GCM encrypted by EncryptedStringConverter (v1:... form), hence TEXT.
-- =====================================================

CREATE TABLE shop_stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(80)  NOT NULL,
    slug            VARCHAR(40)  NOT NULL UNIQUE,
    shop_domain     VARCHAR(120) NOT NULL UNIQUE,
    client_id       VARCHAR(120) NOT NULL,
    client_secret   TEXT         NOT NULL,
    is_visible      BOOLEAN      NOT NULL DEFAULT FALSE,
    last_synced_at  TIMESTAMPTZ  NULL,
    last_sync_error VARCHAR(500) NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT shop_stores_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
    CONSTRAINT shop_stores_domain_check CHECK (shop_domain ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$')
);

CREATE TABLE shop_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        JSONB       NOT NULL,
    slug        VARCHAR(40) NOT NULL UNIQUE,
    sort_order  INT         NOT NULL DEFAULT 0,
    is_visible  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shop_categories_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
    CONSTRAINT shop_categories_sort_order_check CHECK (sort_order BETWEEN 0 AND 1000)
);

CREATE TABLE shop_category_collections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID         NOT NULL REFERENCES shop_categories (id) ON DELETE CASCADE,
    store_id         UUID         NOT NULL REFERENCES shop_stores (id) ON DELETE CASCADE,
    collection_gid   VARCHAR(80)  NOT NULL,
    collection_title VARCHAR(255) NOT NULL,
    CONSTRAINT shop_category_collections_unique UNIQUE (category_id, store_id, collection_gid)
);

CREATE INDEX shop_category_collections_store_gid_idx ON shop_category_collections (store_id, collection_gid);

CREATE TABLE shop_products (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id           UUID          NOT NULL REFERENCES shop_stores (id) ON DELETE CASCADE,
    shopify_gid        VARCHAR(80)   NOT NULL,
    handle             VARCHAR(255)  NOT NULL,
    title              VARCHAR(255)  NOT NULL,
    description        TEXT          NOT NULL DEFAULT '',
    product_url        VARCHAR(1000) NOT NULL,
    min_price_cents    BIGINT        NOT NULL,
    max_price_cents    BIGINT        NOT NULL,
    currency           VARCHAR(3)    NOT NULL,
    is_digital         BOOLEAN       NOT NULL,
    images             JSONB         NOT NULL DEFAULT '[]'::jsonb,
    variants           JSONB         NOT NULL DEFAULT '[]'::jsonb,
    shopify_updated_at TIMESTAMPTZ   NOT NULL,
    synced_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT shop_products_gid_unique UNIQUE (store_id, shopify_gid),
    CONSTRAINT shop_products_handle_unique UNIQUE (store_id, handle)
);

CREATE TABLE shop_product_collections (
    product_id     UUID        NOT NULL REFERENCES shop_products (id) ON DELETE CASCADE,
    collection_gid VARCHAR(80) NOT NULL,
    PRIMARY KEY (product_id, collection_gid)
);

CREATE INDEX shop_product_collections_gid_idx ON shop_product_collections (collection_gid);
```

- [ ] **Step 4: Add `ShopProperties`**

```java
package event_social_media.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * The Shopify-synced shop (plan 2026-10-27-shopify-shop). Store credentials live in the database,
 * one row per connected store; only what is the same for every store is here.
 */
@Component
@ConfigurationProperties("app.shop")
@Getter
@Setter
public class ShopProperties {

    /** Shopify Admin API version, e.g. 2026-10. Shopify supports each version for 12 months. */
    private String shopifyApiVersion = "2026-10";

    /**
     * Public origin of this API, e.g. https://api.storywall.gr. Webhooks are registered at
     * {webhookBaseUrl}/api/webhooks/shopify. Blank skips registration (local dev without a tunnel).
     */
    private String webhookBaseUrl = "";
}
```

- [ ] **Step 5: Add properties to both `application.properties` files**

```properties
# Shopify shop (plan 2026-10-27-shopify-shop). Store credentials are per store, in the database.
app.shop.shopify-api-version=${SHOP_SHOPIFY_API_VERSION:2026-10}
app.shop.webhook-base-url=${SHOP_WEBHOOK_BASE_URL:}
app.shop.full-sync.cron=${SHOP_FULL_SYNC_CRON:0 30 3 * * *}
```

In `src/test/resources/application.properties` use fixed values: `app.shop.webhook-base-url=` and `app.shop.full-sync.cron=-` (`-` disables the cron in tests).

- [ ] **Step 6: Run the test, expect PASS**, then commit

```bash
git add src/main/resources/db/migration/V180__shop.sql src/main/java/event_social_media/config/ShopProperties.java src/main/resources/application.properties src/test/resources/application.properties src/test/java/event_social_media/migration/ShopMigrationTest.java
git commit -m "feat(shop): tables and settings for the Shopify-synced shop"
```

### Task A2: Entities and repositories

**Files:**
- Create: `model/shop/ShopStore.java`, `ShopCategory.java`, `ShopCategoryCollection.java`, `ShopProduct.java`, `ShopImage.java`, `ShopVariant.java`
- Create: `repository/shop/ShopStoreRepository.java`, `ShopCategoryRepository.java`, `ShopCategoryCollectionRepository.java`, `ShopProductRepository.java`
- Test: `src/test/java/event_social_media/repository/shop/ShopProductRepositoryTest.java`

- [ ] **Step 1: Write the failing repository test** (H2, `@SpringBootTest @Transactional`, like `LandingCategoryServiceTest`)

```java
@SpringBootTest
@Transactional
class ShopProductRepositoryTest {

    @Autowired private ShopStoreRepository stores;
    @Autowired private ShopCategoryRepository categories;
    @Autowired private ShopCategoryCollectionRepository mappings;
    @Autowired private ShopProductRepository products;

    private ShopStore store(boolean visible) {
        ShopStore s = new ShopStore();
        s.setName("Inviart");
        s.setSlug("inviart-" + UUID.randomUUID().toString().substring(0, 6));
        s.setShopDomain(s.getSlug() + ".myshopify.com");
        s.setClientId("client");
        s.setClientSecret("secret");
        s.setIsVisible(visible);
        return stores.save(s);
    }

    private ShopCategory category(String slug, boolean visible) {
        ShopCategory c = new ShopCategory();
        c.setName(new LinkedHashMap<>(Map.of("en", "Wedding invitations", "el", "Προσκλητήρια γάμου")));
        c.setSlug(slug);
        c.setIsVisible(visible);
        return categories.save(c);
    }

    private void map(ShopCategory c, ShopStore s, String gid) {
        ShopCategoryCollection m = new ShopCategoryCollection();
        m.setCategoryId(c.getId());
        m.setStoreId(s.getId());
        m.setCollectionGid(gid);
        m.setCollectionTitle("Προσκλητήρια Γάμου");
        mappings.save(m);
    }

    private ShopProduct product(ShopStore s, String handle, String... collectionGids) {
        ShopProduct p = new ShopProduct();
        p.setStoreId(s.getId());
        p.setShopifyGid("gid://shopify/Product/" + handle.hashCode());
        p.setHandle(handle);
        p.setTitle(handle);
        p.setProductUrl("https://inviart.gr/products/" + handle);
        p.setMinPriceCents(5800L);
        p.setMaxPriceCents(5800L);
        p.setCurrency("EUR");
        p.setIsDigital(true);
        p.setShopifyUpdatedAt(OffsetDateTime.now());
        p.setCollectionGids(new HashSet<>(Set.of(collectionGids)));
        return products.save(p);
    }

    @Test
    void listsOnlyProductsInMappedCollectionsOfVisibleCategoriesAndStores() {
        ShopStore visible = store(true);
        ShopStore hidden = store(false);
        ShopCategory weddings = category("weddings", true);
        ShopCategory off = category("off", false);
        map(weddings, visible, "gid://shopify/Collection/1");
        map(off, visible, "gid://shopify/Collection/2");
        map(weddings, hidden, "gid://shopify/Collection/1");
        product(visible, "in-weddings", "gid://shopify/Collection/1");
        product(visible, "in-hidden-category", "gid://shopify/Collection/2");
        product(visible, "unmapped", "gid://shopify/Collection/3");
        product(hidden, "hidden-store", "gid://shopify/Collection/1");

        Page<ShopProduct> all = products.findPublic(null, PageRequest.of(0, 24));
        Page<ShopProduct> inWeddings = products.findPublic(weddings.getId(), PageRequest.of(0, 24));

        assertThat(all.map(ShopProduct::getHandle)).containsExactly("in-weddings");
        assertThat(inWeddings.map(ShopProduct::getHandle)).containsExactly("in-weddings");
    }

    @Test
    void productInTwoMappedCollectionsIsListedOnce() {
        ShopStore s = store(true);
        ShopCategory weddings = category("weddings-2", true);
        map(weddings, s, "gid://shopify/Collection/1");
        map(weddings, s, "gid://shopify/Collection/4");
        product(s, "both", "gid://shopify/Collection/1", "gid://shopify/Collection/4");

        assertThat(products.findPublic(weddings.getId(), PageRequest.of(0, 24)).getTotalElements()).isEqualTo(1);
    }
}
```

- [ ] **Step 2: Run it, expect FAIL** (classes missing).

Run: `./gradlew test --tests "event_social_media.repository.shop.ShopProductRepositoryTest"`

- [ ] **Step 3: Write the entities**

```java
// model/shop/ShopStore.java
package event_social_media.model.shop;

import event_social_media.config.crypto.EncryptedStringConverter;
import event_social_media.model.base.MutableAuditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A connected Shopify store. Credentials are a Dev Dashboard app's client ID and secret. */
@Getter
@Setter
@Entity
@Table(name = "shop_stores")
public class ShopStore extends MutableAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    /** The store's segment in /shop/{slug}/{handle}. Never changes once products are live. */
    @Column(name = "slug", nullable = false, length = 40)
    private String slug;

    /** e.g. inviart.myshopify.com. Matches X-Shopify-Shop-Domain on webhooks. */
    @Column(name = "shop_domain", nullable = false, length = 120)
    private String shopDomain;

    @Column(name = "client_id", nullable = false, length = 120)
    private String clientId;

    /** Mints tokens and verifies webhook signatures. Never returned by any endpoint. */
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "client_secret", nullable = false, columnDefinition = "text")
    private String clientSecret;

    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible = false;

    @Column(name = "last_synced_at")
    private OffsetDateTime lastSyncedAt;

    /** The last full sync's failure, cleared by the next success. */
    @Column(name = "last_sync_error", length = 500)
    private String lastSyncError;
}
```

```java
// model/shop/ShopCategory.java
package event_social_media.model.shop;

import event_social_media.model.base.MutableAuditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** A filter on /shop, made of one or more Shopify collections (ShopCategoryCollection). */
@Getter
@Setter
@Entity
@Table(name = "shop_categories")
public class ShopCategory extends MutableAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    /** Exactly {@code en} and {@code el}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "name", nullable = false)
    private Map<String, String> name = new LinkedHashMap<>();

    @Column(name = "slug", nullable = false, length = 40)
    private String slug;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible = true;
}
```

```java
// model/shop/ShopCategoryCollection.java
package event_social_media.model.shop;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/** One Shopify collection of one store, mapped onto a storywall category. */
@Getter
@Setter
@Entity
@Table(name = "shop_category_collections")
public class ShopCategoryCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    /** e.g. gid://shopify/Collection/123 */
    @Column(name = "collection_gid", nullable = false, length = 80)
    private String collectionGid;

    /** Shopify's title when it was mapped, so the admin list renders without calling Shopify. */
    @Column(name = "collection_title", nullable = false)
    private String collectionTitle;
}
```

```java
// model/shop/ShopImage.java
package event_social_media.model.shop;

/** A product image on Shopify's CDN. alt may be null. */
public record ShopImage(String url, String alt) {}
```

```java
// model/shop/ShopVariant.java
package event_social_media.model.shop;

/** A variant as shown on the product page: Shopify's title ("Default Title" for none) and price. */
public record ShopVariant(String title, long priceCents) {}
```

```java
// model/shop/ShopProduct.java
package event_social_media.model.shop;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** A copy of one Shopify product. Overwritten by every sync; never edited in storywall. */
@Getter
@Setter
@Entity
@Table(name = "shop_products")
public class ShopProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(name = "shopify_gid", nullable = false, length = 80)
    private String shopifyGid;

    @Column(name = "handle", nullable = false)
    private String handle;

    @Column(name = "title", nullable = false)
    private String title;

    /** Shopify's plain-text description (HTML already stripped by Shopify). */
    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description = "";

    /** Shopify's onlineStoreUrl: the seller's own product page. */
    @Column(name = "product_url", nullable = false, length = 1000)
    private String productUrl;

    @Column(name = "min_price_cents", nullable = false)
    private Long minPriceCents;

    @Column(name = "max_price_cents", nullable = false)
    private Long maxPriceCents;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    /** True when no variant requires shipping. */
    @Column(name = "is_digital", nullable = false)
    private Boolean isDigital;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "images", nullable = false)
    private List<ShopImage> images = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variants", nullable = false)
    private List<ShopVariant> variants = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "shop_product_collections", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "collection_gid", nullable = false, length = 80)
    private Set<String> collectionGids = new HashSet<>();

    @Column(name = "shopify_updated_at", nullable = false)
    private OffsetDateTime shopifyUpdatedAt;

    @Column(name = "synced_at", nullable = false)
    private OffsetDateTime syncedAt = OffsetDateTime.now();
}
```

- [ ] **Step 4: Write the repositories**

```java
// repository/shop/ShopStoreRepository.java
public interface ShopStoreRepository extends JpaRepository<ShopStore, UUID> {
    Optional<ShopStore> findByShopDomain(String shopDomain);
    Optional<ShopStore> findBySlug(String slug);
    boolean existsByShopDomain(String shopDomain);
    boolean existsBySlug(String slug);
    List<ShopStore> findAllByOrderByNameAsc();
}
```

```java
// repository/shop/ShopCategoryRepository.java
public interface ShopCategoryRepository extends JpaRepository<ShopCategory, UUID> {
    List<ShopCategory> findAllByOrderBySortOrderAscIdAsc();
    Optional<ShopCategory> findBySlugAndIsVisibleTrue(String slug);
    boolean existsBySlug(String slug);

    /** Visible categories that map at least one collection of a visible store. */
    @Query("""
            SELECT c FROM ShopCategory c WHERE c.isVisible = true AND EXISTS (
                SELECT 1 FROM ShopCategoryCollection m, ShopStore s
                WHERE m.categoryId = c.id AND s.id = m.storeId AND s.isVisible = true)
            ORDER BY c.sortOrder ASC, c.id ASC""")
    List<ShopCategory> findPublic();
}
```

```java
// repository/shop/ShopCategoryCollectionRepository.java
public interface ShopCategoryCollectionRepository extends JpaRepository<ShopCategoryCollection, UUID> {
    List<ShopCategoryCollection> findByCategoryId(UUID categoryId);
    List<ShopCategoryCollection> findByCategoryIdIn(Collection<UUID> categoryIds);
    void deleteByCategoryId(UUID categoryId);
}
```

```java
// repository/shop/ShopProductRepository.java
public interface ShopProductRepository extends JpaRepository<ShopProduct, UUID> {

    Optional<ShopProduct> findByStoreIdAndShopifyGid(UUID storeId, String shopifyGid);

    long countByStoreId(UUID storeId);

    @Modifying
    @Query("DELETE FROM ShopProduct p WHERE p.storeId = :storeId AND p.shopifyGid = :gid")
    int deleteByStoreIdAndShopifyGid(UUID storeId, String gid);

    @Query("SELECT p.shopifyGid FROM ShopProduct p WHERE p.storeId = :storeId")
    List<String> findGidsByStoreId(UUID storeId);

    /**
     * Products in at least one collection mapped to a visible category of a visible store.
     * categoryId null = every such category.
     */
    @Query(value = """
            SELECT p FROM ShopProduct p WHERE EXISTS (
                SELECT 1 FROM ShopCategoryCollection m, ShopCategory c, ShopStore s
                WHERE m.storeId = p.storeId AND m.collectionGid MEMBER OF p.collectionGids
                  AND c.id = m.categoryId AND c.isVisible = true
                  AND s.id = p.storeId AND s.isVisible = true
                  AND (:categoryId IS NULL OR c.id = :categoryId))
            ORDER BY p.shopifyUpdatedAt DESC, p.id ASC""",
            countQuery = """
            SELECT COUNT(p) FROM ShopProduct p WHERE EXISTS (
                SELECT 1 FROM ShopCategoryCollection m, ShopCategory c, ShopStore s
                WHERE m.storeId = p.storeId AND m.collectionGid MEMBER OF p.collectionGids
                  AND c.id = m.categoryId AND c.isVisible = true
                  AND s.id = p.storeId AND s.isVisible = true
                  AND (:categoryId IS NULL OR c.id = :categoryId))""")
    Page<ShopProduct> findPublic(@Param("categoryId") UUID categoryId, Pageable pageable);
}
```

`EXISTS` instead of a join keeps a product in two mapped collections from appearing twice and keeps the count query right.

- [ ] **Step 5: Run the test, expect PASS.** If H2 rejects `MEMBER OF` on an element collection, replace that line with `AND EXISTS (SELECT 1 FROM ShopProduct p2 JOIN p2.collectionGids g WHERE p2.id = p.id AND g = m.collectionGid)` in both queries, and re-run. Then add the Postgres twin `src/test/java/event_social_media/migration/ShopProductRepositoryPostgresTest.java` running the same two tests against Testcontainers (copy the setup from `LandingCategoryServicePostgresTest`).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/model/shop src/main/java/event_social_media/repository/shop src/test/java/event_social_media/repository/shop src/test/java/event_social_media/migration/ShopProductRepositoryPostgresTest.java
git commit -m "feat(shop): store, category and product entities with the public product query"
```

### Task A3: Product mapper and webhook verifier (pure)

**Files:**
- Create: `service/shop/ShopifyProduct.java`, `service/shop/ShopifyProductMapper.java`, `service/shop/ShopifyWebhookVerifier.java`
- Create: `src/test/resources/shop/product.json`
- Test: `src/test/java/event_social_media/service/shop/ShopifyProductMapperTest.java`, `ShopifyWebhookVerifierTest.java`

- [ ] **Step 1: Add the fixture** `src/test/resources/shop/product.json` (one `Product` node as the Task A4 query returns it)

```json
{
  "id": "gid://shopify/Product/8812345",
  "handle": "hlektroniko-prosklitirio-gamou-passport",
  "title": "Ηλεκτρονικό προσκλητήριο γάμου PASSPORT",
  "description": "Ψηφιακό προσκλητήριο σε εικόνα.",
  "status": "ACTIVE",
  "onlineStoreUrl": "https://inviart.gr/products/hlektroniko-prosklitirio-gamou-passport",
  "updatedAt": "2026-10-20T09:15:00Z",
  "priceRangeV2": {
    "minVariantPrice": { "amount": "58.0", "currencyCode": "EUR" },
    "maxVariantPrice": { "amount": "64.5", "currencyCode": "EUR" }
  },
  "media": { "nodes": [
    { "preview": { "image": { "url": "https://cdn.shopify.com/s/files/1/a.jpg", "altText": "Passport" } } },
    { "preview": { "image": null } }
  ] },
  "variants": { "nodes": [
    { "title": "Default Title", "price": "58.00", "inventoryItem": { "requiresShipping": false } },
    { "title": "Με βίντεο", "price": "64.50", "inventoryItem": { "requiresShipping": false } }
  ] },
  "collections": { "nodes": [ { "id": "gid://shopify/Collection/1" }, { "id": "gid://shopify/Collection/7" } ] }
}
```

- [ ] **Step 2: Write the failing mapper test**

```java
class ShopifyProductMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ShopifyProductMapper mapper = new ShopifyProductMapper();

    private JsonNode fixture() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/shop/product.json")) {
            return objectMapper.readTree(in);
        }
    }

    @Test
    void mapsPublishedProduct() throws IOException {
        ShopifyProduct p = mapper.map(fixture()).orElseThrow();

        assertThat(p.gid()).isEqualTo("gid://shopify/Product/8812345");
        assertThat(p.handle()).isEqualTo("hlektroniko-prosklitirio-gamou-passport");
        assertThat(p.productUrl()).isEqualTo("https://inviart.gr/products/hlektroniko-prosklitirio-gamou-passport");
        assertThat(p.minPriceCents()).isEqualTo(5800L);
        assertThat(p.maxPriceCents()).isEqualTo(6450L);
        assertThat(p.currency()).isEqualTo("EUR");
        assertThat(p.digital()).isTrue();
        assertThat(p.images()).containsExactly(new ShopImage("https://cdn.shopify.com/s/files/1/a.jpg", "Passport"));
        assertThat(p.variants()).containsExactly(new ShopVariant("Default Title", 5800L), new ShopVariant("Με βίντεο", 6450L));
        assertThat(p.collectionGids()).containsExactlyInAnyOrder("gid://shopify/Collection/1", "gid://shopify/Collection/7");
        assertThat(p.updatedAt()).isEqualTo(OffsetDateTime.parse("2026-10-20T09:15:00Z"));
    }

    @Test
    void notPublishedToOnlineStoreMapsToEmpty() throws IOException {
        ObjectNode node = (ObjectNode) fixture();
        node.putNull("onlineStoreUrl");
        assertThat(mapper.map(node)).isEmpty();
    }

    @Test
    void draftMapsToEmpty() throws IOException {
        ObjectNode node = (ObjectNode) fixture();
        node.put("status", "DRAFT");
        assertThat(mapper.map(node)).isEmpty();
    }

    @Test
    void anyShippedVariantMakesItPrinted() throws IOException {
        ObjectNode node = (ObjectNode) fixture();
        ((ObjectNode) node.at("/variants/nodes/1/inventoryItem")).put("requiresShipping", true);
        assertThat(mapper.map(node).orElseThrow().digital()).isFalse();
    }
}
```

- [ ] **Step 3: Run, expect FAIL.** `./gradlew test --tests "event_social_media.service.shop.ShopifyProductMapperTest"`

- [ ] **Step 4: Implement**

```java
// service/shop/ShopifyProduct.java
package event_social_media.service.shop;

import event_social_media.model.shop.ShopImage;
import event_social_media.model.shop.ShopVariant;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

/** A Shopify product that may appear in the shop: active and published to the Online Store. */
public record ShopifyProduct(
        String gid, String handle, String title, String description, String productUrl,
        long minPriceCents, long maxPriceCents, String currency, boolean digital,
        List<ShopImage> images, List<ShopVariant> variants, Set<String> collectionGids,
        OffsetDateTime updatedAt) {}
```

```java
// service/shop/ShopifyProductMapper.java
package event_social_media.service.shop;

import com.fasterxml.jackson.databind.JsonNode;
import event_social_media.model.shop.ShopImage;
import event_social_media.model.shop.ShopVariant;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Shopify GraphQL Product node → ShopifyProduct. Empty when the product must not appear: not
 * ACTIVE, or not published to the Online Store (onlineStoreUrl null), since the buy link is that URL.
 */
@Component
public class ShopifyProductMapper {

    public Optional<ShopifyProduct> map(JsonNode node) {
        if (!"ACTIVE".equals(node.path("status").asText()) || !node.hasNonNull("onlineStoreUrl")) {
            return Optional.empty();
        }
        List<ShopImage> images = new ArrayList<>();
        for (JsonNode media : node.path("media").path("nodes")) {
            JsonNode image = media.path("preview").path("image");
            if (image.hasNonNull("url")) {
                images.add(new ShopImage(image.get("url").asText(), image.hasNonNull("altText") ? image.get("altText").asText() : null));
            }
        }
        List<ShopVariant> variants = new ArrayList<>();
        boolean digital = true;
        for (JsonNode variant : node.path("variants").path("nodes")) {
            variants.add(new ShopVariant(variant.path("title").asText(), cents(variant.path("price").asText())));
            if (variant.path("inventoryItem").path("requiresShipping").asBoolean(true)) digital = false;
        }
        Set<String> collections = new LinkedHashSet<>();
        for (JsonNode collection : node.path("collections").path("nodes")) {
            collections.add(collection.path("id").asText());
        }
        JsonNode range = node.path("priceRangeV2");
        return Optional.of(new ShopifyProduct(
                node.path("id").asText(),
                node.path("handle").asText(),
                node.path("title").asText(),
                node.path("description").asText(""),
                node.get("onlineStoreUrl").asText(),
                cents(range.path("minVariantPrice").path("amount").asText()),
                cents(range.path("maxVariantPrice").path("amount").asText()),
                range.path("minVariantPrice").path("currencyCode").asText(),
                digital,
                images,
                variants,
                collections,
                OffsetDateTime.parse(node.path("updatedAt").asText())));
    }

    static long cents(String amount) {
        return new BigDecimal(amount).movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
```

- [ ] **Step 5: Run, expect PASS.**

- [ ] **Step 6: Write the failing verifier test**

```java
class ShopifyWebhookVerifierTest {

    private static String sign(String body, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getEncoder().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void acceptsCorrectSignature() throws Exception {
        String body = "{\"id\":1}";
        assertThat(ShopifyWebhookVerifier.verify(body, sign(body, "s3cret"), "s3cret")).isTrue();
    }

    @Test
    void rejectsWrongSecretTamperedBodyAndMissingHeader() throws Exception {
        String body = "{\"id\":1}";
        assertThat(ShopifyWebhookVerifier.verify(body, sign(body, "other"), "s3cret")).isFalse();
        assertThat(ShopifyWebhookVerifier.verify("{\"id\":2}", sign(body, "s3cret"), "s3cret")).isFalse();
        assertThat(ShopifyWebhookVerifier.verify(body, null, "s3cret")).isFalse();
        assertThat(ShopifyWebhookVerifier.verify(body, "not-base64!", "s3cret")).isFalse();
    }
}
```

- [ ] **Step 7: Run, expect FAIL; implement; run, expect PASS**

```java
// service/shop/ShopifyWebhookVerifier.java
package event_social_media.service.shop;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;

/** Shopify signs webhook bodies with the app's client secret: base64(HMAC-SHA256(body)). */
public final class ShopifyWebhookVerifier {

    private ShopifyWebhookVerifier() {}

    public static boolean verify(String rawBody, String hmacHeader, String clientSecret) {
        if (hmacHeader == null || clientSecret == null) return false;
        try {
            byte[] expected = Base64.getDecoder().decode(hmacHeader);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] actual = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(expected, actual);
        } catch (IllegalArgumentException | GeneralSecurityException e) {
            return false;
        }
    }
}
```

- [ ] **Step 8: Commit**

```bash
git add src/main/java/event_social_media/service/shop src/test/java/event_social_media/service/shop src/test/resources/shop
git commit -m "feat(shop): map Shopify products and verify webhook signatures"
```

### Task A4: Shopify Admin client

**Files:**
- Create: `service/shop/ShopifyAdminClient.java`
- Test: `src/test/java/event_social_media/service/shop/ShopifyAdminClientTest.java` (uses JDK `com.sun.net.httpserver.HttpServer` on a random port; no new dependency)

The client builds its base URL from the store domain, so the test needs a seam: a package-private constructor taking a `Function<String, URI>` that maps a domain to its origin. Production uses `domain -> URI.create("https://" + domain)`.

- [ ] **Step 1: Write the failing test**

```java
class ShopifyAdminClientTest {

    private HttpServer server;
    private final AtomicInteger tokenCalls = new AtomicInteger();
    private ShopifyAdminClient client;
    private final ShopifyAdminClient.Credentials creds = new ShopifyAdminClient.Credentials("test.myshopify.com", "cid", "secret");

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/admin/oauth/access_token", exchange -> {
            tokenCalls.incrementAndGet();
            String form = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            assertThat(form).contains("grant_type=client_credentials").contains("client_id=cid").contains("client_secret=secret");
            respond(exchange, "{\"access_token\":\"tok\",\"scope\":\"read_products\",\"expires_in\":86399}");
        });
        server.createContext("/admin/api/2026-10/graphql.json", exchange -> {
            assertThat(exchange.getRequestHeaders().getFirst("X-Shopify-Access-Token")).isEqualTo("tok");
            respond(exchange, "{\"data\":{\"collections\":{\"nodes\":[{\"id\":\"gid://shopify/Collection/1\",\"handle\":\"prosklitiria-gamoy\",\"title\":\"Προσκλητήρια Γάμου\"}],\"pageInfo\":{\"hasNextPage\":false,\"endCursor\":null}}}}");
        });
        server.start();
        ShopProperties props = new ShopProperties();
        client = new ShopifyAdminClient(props, new ObjectMapper(),
                domain -> URI.create("http://localhost:" + server.getAddress().getPort()));
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private static void respond(HttpExchange exchange, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @Test
    void listsCollectionsAndReusesTheToken() {
        assertThat(client.collections(creds))
                .containsExactly(new ShopifyAdminClient.Collection("gid://shopify/Collection/1", "prosklitiria-gamoy", "Προσκλητήρια Γάμου"));
        client.collections(creds);
        assertThat(tokenCalls.get()).isEqualTo(1);
    }
}
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

```java
// service/shop/ShopifyAdminClient.java
package event_social_media.service.shop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.config.ShopProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * The only class that talks to Shopify. Tokens come from the client credentials grant and last 24
 * hours; they are cached in memory per store and minted again 10 minutes before expiry, or after a
 * 401. Nothing token-related is stored in the database.
 */
@Slf4j
@Component
public class ShopifyAdminClient {

    public record Credentials(String shopDomain, String clientId, String clientSecret) {}
    public record Collection(String gid, String handle, String title) {}
    public record ProductPage(List<JsonNode> products, String endCursor, boolean hasNextPage) {}

    /** Thrown for bad credentials (401/403 on the token call). The admin must fix the store. */
    public static class InvalidCredentialsException extends RuntimeException {
        public InvalidCredentialsException(String message) { super(message); }
    }

    private static final Duration TIMEOUT = Duration.ofSeconds(20);
    private static final Duration REFRESH_EARLY = Duration.ofMinutes(10);
    private static final int MAX_THROTTLE_RETRIES = 5;

    // 10 products per page keeps the requested cost (~70 points per product) under Shopify's
    // 1000-point cap per query.
    static final String PRODUCT_FIELDS = """
            id handle title description status onlineStoreUrl updatedAt
            priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
            media(first: 8) { nodes { preview { image { url altText } } } }
            variants(first: 20) { nodes { title price inventoryItem { requiresShipping } } }
            collections(first: 20) { nodes { id } }
            """;
    private static final String PRODUCTS_QUERY = """
            query($after: String) { products(first: 10, after: $after, query: "status:active") {
              nodes { %s } pageInfo { hasNextPage endCursor } } }""".formatted(PRODUCT_FIELDS);
    private static final String PRODUCT_QUERY = "query($id: ID!) { product(id: $id) { %s } }".formatted(PRODUCT_FIELDS);
    private static final String COLLECTIONS_QUERY = """
            query($after: String) { collections(first: 250, after: $after, sortKey: TITLE) {
              nodes { id handle title } pageInfo { hasNextPage endCursor } } }""";
    private static final String WEBHOOK_MUTATION = """
            mutation($topic: WebhookSubscriptionTopic!, $uri: String!) {
              webhookSubscriptionCreate(topic: $topic, webhookSubscription: { uri: $uri, format: JSON }) {
                webhookSubscription { id } userErrors { field message } } }""";

    private record Token(String value, Instant expiresAt) {}

    private final ShopProperties properties;
    private final ObjectMapper objectMapper;
    private final Function<String, URI> origin;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    private final Map<String, Token> tokens = new ConcurrentHashMap<>();

    @Autowired
    public ShopifyAdminClient(ShopProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, domain -> URI.create("https://" + domain));
    }

    ShopifyAdminClient(ShopProperties properties, ObjectMapper objectMapper, Function<String, URI> origin) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.origin = origin;
    }

    /** Mints a token; throws InvalidCredentialsException when Shopify refuses. Used to validate a new store. */
    public void checkCredentials(Credentials creds) {
        tokens.remove(creds.shopDomain());
        token(creds);
    }

    public void forget(String shopDomain) {
        tokens.remove(shopDomain);
    }

    public List<Collection> collections(Credentials creds) {
        List<Collection> result = new ArrayList<>();
        String after = null;
        do {
            JsonNode connection = graphql(creds, COLLECTIONS_QUERY, after == null ? Map.of() : Map.of("after", after)).path("collections");
            for (JsonNode node : connection.path("nodes")) {
                result.add(new Collection(node.path("id").asText(), node.path("handle").asText(), node.path("title").asText()));
            }
            after = connection.path("pageInfo").path("hasNextPage").asBoolean() ? connection.path("pageInfo").path("endCursor").asText() : null;
        } while (after != null);
        return result;
    }

    public ProductPage products(Credentials creds, String after) {
        JsonNode connection = graphql(creds, PRODUCTS_QUERY, after == null ? Map.of() : Map.of("after", after)).path("products");
        List<JsonNode> nodes = new ArrayList<>();
        connection.path("nodes").forEach(nodes::add);
        JsonNode pageInfo = connection.path("pageInfo");
        return new ProductPage(nodes, pageInfo.path("endCursor").asText(null), pageInfo.path("hasNextPage").asBoolean());
    }

    /** Empty when the product no longer exists. */
    public Optional<JsonNode> product(Credentials creds, String gid) {
        JsonNode product = graphql(creds, PRODUCT_QUERY, Map.of("id", gid)).path("product");
        return product.isMissingNode() || product.isNull() ? Optional.empty() : Optional.of(product);
    }

    /** Idempotent: Shopify's "already taken" answer for an existing subscription counts as success. */
    public void registerWebhook(Credentials creds, String topic, String uri) {
        JsonNode result = graphql(creds, WEBHOOK_MUTATION, Map.of("topic", topic, "uri", uri)).path("webhookSubscriptionCreate");
        for (JsonNode error : result.path("userErrors")) {
            String message = error.path("message").asText();
            if (!message.toLowerCase().contains("taken")) {
                throw new IllegalStateException("Shopify webhook " + topic + " not registered: " + message);
            }
        }
    }

    JsonNode graphql(Credentials creds, String query, Map<String, Object> variables) {
        URI uri = origin.apply(creds.shopDomain()).resolve("/admin/api/" + properties.getShopifyApiVersion() + "/graphql.json");
        for (int attempt = 0; ; attempt++) {
            HttpResponse<String> response = send(HttpRequest.newBuilder(uri)
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("X-Shopify-Access-Token", token(creds))
                    .POST(HttpRequest.BodyPublishers.ofString(json(Map.of("query", query, "variables", variables))))
                    .build());
            if (response.statusCode() == 401 && attempt == 0) {
                tokens.remove(creds.shopDomain());
                continue;
            }
            if (response.statusCode() != 200) {
                throw new IllegalStateException("Shopify GraphQL HTTP " + response.statusCode() + " for " + creds.shopDomain());
            }
            JsonNode body = read(response.body());
            JsonNode errors = body.path("errors");
            if (errors.isArray() && !errors.isEmpty()) {
                boolean throttled = "THROTTLED".equals(errors.get(0).path("extensions").path("code").asText());
                if (throttled && attempt < MAX_THROTTLE_RETRIES) {
                    sleep(Duration.ofSeconds(2L * (attempt + 1)));
                    continue;
                }
                throw new IllegalStateException("Shopify GraphQL error for " + creds.shopDomain() + ": " + errors.get(0).path("message").asText());
            }
            return body.path("data");
        }
    }

    private String token(Credentials creds) {
        Token cached = tokens.get(creds.shopDomain());
        if (cached != null && Instant.now().isBefore(cached.expiresAt().minus(REFRESH_EARLY))) return cached.value();
        String form = "grant_type=client_credentials&client_id=" + enc(creds.clientId()) + "&client_secret=" + enc(creds.clientSecret());
        HttpResponse<String> response = send(HttpRequest.newBuilder(origin.apply(creds.shopDomain()).resolve("/admin/oauth/access_token"))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build());
        if (response.statusCode() == 400 || response.statusCode() == 401 || response.statusCode() == 403) {
            throw new InvalidCredentialsException("Shopify refused the credentials for " + creds.shopDomain() + " (HTTP " + response.statusCode() + ")");
        }
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Shopify token HTTP " + response.statusCode() + " for " + creds.shopDomain());
        }
        JsonNode body = read(response.body());
        Token token = new Token(body.path("access_token").asText(), Instant.now().plusSeconds(body.path("expires_in").asLong(86399)));
        tokens.put(creds.shopDomain(), token);
        return token.value();
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new IllegalStateException("Shopify request failed: " + request.uri().getHost(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted calling Shopify", e);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private JsonNode read(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (IOException e) {
            throw new IllegalStateException("Shopify returned invalid JSON", e);
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while throttled by Shopify", e);
        }
    }
}
```

- [ ] **Step 4: Run, expect PASS.** Add two more tests in the same class before committing: (a) a token endpoint answering 401 makes `checkCredentials` throw `InvalidCredentialsException`; (b) a GraphQL answer `{"errors":[{"message":"Throttled","extensions":{"code":"THROTTLED"}}]}` once, then data, returns the data (count calls with an `AtomicInteger`; expect 2).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/event_social_media/service/shop/ShopifyAdminClient.java src/test/java/event_social_media/service/shop/ShopifyAdminClientTest.java
git commit -m "feat(shop): Shopify Admin client with client-credentials tokens"
```

### Task A5: Product writer and sync service

**Files:**
- Create: `service/shop/ShopProductWriter.java`, `service/shop/ShopSyncService.java`, `service/shop/ShopSyncJob.java`
- Test: `src/test/java/event_social_media/service/shop/ShopSyncServiceTest.java`

- [ ] **Step 1: Write the failing test** (`@SpringBootTest @Transactional`, Shopify mocked with `@MockBean ShopifyAdminClient`; Boot 3.3 has no `@MockitoBean`)

```java
@SpringBootTest
@Transactional
class ShopSyncServiceTest {

    @Autowired private ShopSyncService syncService;
    @Autowired private ShopStoreRepository stores;
    @Autowired private ShopProductRepository products;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private ShopifyAdminClient shopify;

    private ShopStore store;

    @BeforeEach
    void setUp() {
        store = new ShopStore();
        store.setName("Inviart");
        store.setSlug("inviart");
        store.setShopDomain("inviart.myshopify.com");
        store.setClientId("cid");
        store.setClientSecret("secret");
        store.setIsVisible(true);
        store = stores.save(store);
    }

    private JsonNode node(String handle, String status) throws IOException {
        ObjectNode n = (ObjectNode) objectMapper.readTree(getClass().getResourceAsStream("/shop/product.json"));
        n.put("id", "gid://shopify/Product/" + handle);
        n.put("handle", handle);
        n.put("status", status);
        return n;
    }

    @Test
    void fullSyncUpsertsActiveProductsAndDeletesMissingOnes() throws IOException {
        when(shopify.products(any(), isNull()))
                .thenReturn(new ShopifyAdminClient.ProductPage(List.of(node("a", "ACTIVE"), node("b", "ACTIVE")), "c1", true));
        when(shopify.products(any(), eq("c1")))
                .thenReturn(new ShopifyAdminClient.ProductPage(List.of(node("draft", "DRAFT")), null, false));
        syncService.fullSync(store.getId());
        assertThat(products.findGidsByStoreId(store.getId()))
                .containsExactlyInAnyOrder("gid://shopify/Product/a", "gid://shopify/Product/b");

        when(shopify.products(any(), isNull()))
                .thenReturn(new ShopifyAdminClient.ProductPage(List.of(node("a", "ACTIVE")), null, false));
        syncService.fullSync(store.getId());
        assertThat(products.findGidsByStoreId(store.getId())).containsExactly("gid://shopify/Product/a");
        assertThat(stores.findById(store.getId()).orElseThrow().getLastSyncedAt()).isNotNull();
    }

    @Test
    void fullSyncFailureIsRecordedAndKeepsProducts() throws IOException {
        when(shopify.products(any(), isNull()))
                .thenReturn(new ShopifyAdminClient.ProductPage(List.of(node("a", "ACTIVE")), null, false));
        syncService.fullSync(store.getId());
        when(shopify.products(any(), isNull())).thenThrow(new IllegalStateException("Shopify GraphQL HTTP 500"));

        syncService.fullSync(store.getId());

        assertThat(products.countByStoreId(store.getId())).isEqualTo(1);
        assertThat(stores.findById(store.getId()).orElseThrow().getLastSyncError()).contains("HTTP 500");
    }

    @Test
    void syncOneUpsertsOrDeletes() throws IOException {
        when(shopify.product(any(), eq("gid://shopify/Product/a"))).thenReturn(Optional.of(node("a", "ACTIVE")));
        syncService.syncOne(store.getShopDomain(), "gid://shopify/Product/a");
        assertThat(products.countByStoreId(store.getId())).isEqualTo(1);

        when(shopify.product(any(), eq("gid://shopify/Product/a"))).thenReturn(Optional.of(node("a", "DRAFT")));
        syncService.syncOne(store.getShopDomain(), "gid://shopify/Product/a");
        assertThat(products.countByStoreId(store.getId())).isZero();
    }
}
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement the writer**

```java
// service/shop/ShopProductWriter.java
package event_social_media.service.shop;

import event_social_media.model.shop.ShopProduct;
import event_social_media.repository.shop.ShopProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.UUID;

/** Product writes, each in its own transaction so a full sync never holds one transaction open. */
@Service
@RequiredArgsConstructor
public class ShopProductWriter {

    private final ShopProductRepository repository;

    @Transactional
    public void upsert(UUID storeId, ShopifyProduct source) {
        ShopProduct product = repository.findByStoreIdAndShopifyGid(storeId, source.gid()).orElseGet(ShopProduct::new);
        product.setStoreId(storeId);
        product.setShopifyGid(source.gid());
        product.setHandle(source.handle());
        product.setTitle(source.title());
        product.setDescription(source.description());
        product.setProductUrl(source.productUrl());
        product.setMinPriceCents(source.minPriceCents());
        product.setMaxPriceCents(source.maxPriceCents());
        product.setCurrency(source.currency());
        product.setIsDigital(source.digital());
        product.setImages(new ArrayList<>(source.images()));
        product.setVariants(new ArrayList<>(source.variants()));
        product.setCollectionGids(new HashSet<>(source.collectionGids()));
        product.setShopifyUpdatedAt(source.updatedAt());
        product.setSyncedAt(OffsetDateTime.now());
        repository.save(product);
    }

    @Transactional
    public void delete(UUID storeId, String gid) {
        repository.deleteByStoreIdAndShopifyGid(storeId, gid);
    }
}
```

- [ ] **Step 4: Implement the sync service**

```java
// service/shop/ShopSyncService.java
package event_social_media.service.shop;

import com.fasterxml.jackson.databind.JsonNode;
import event_social_media.config.ShopProperties;
import event_social_media.model.shop.ShopStore;
import event_social_media.repository.shop.ShopProductRepository;
import event_social_media.repository.shop.ShopStoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Copies products from Shopify. Full sync pages through every active product, upserts the ones that
 * map, then deletes local rows Shopify no longer returned. A failure part-way leaves earlier pages
 * written and deletes nothing, so a flaky run never empties the shop.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShopSyncService {

    static final List<String> WEBHOOK_TOPICS = List.of("PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE");
    static final String WEBHOOK_PATH = "/api/webhooks/shopify";
    private static final int ERROR_MAX = 500;

    private final ShopStoreRepository storeRepository;
    private final ShopProductRepository productRepository;
    private final ShopProductWriter writer;
    private final ShopifyAdminClient shopify;
    private final ShopifyProductMapper mapper;
    private final ShopProperties properties;

    static ShopifyAdminClient.Credentials credentials(ShopStore store) {
        return new ShopifyAdminClient.Credentials(store.getShopDomain(), store.getClientId(), store.getClientSecret());
    }

    public void fullSync(UUID storeId) {
        ShopStore store = storeRepository.findById(storeId).orElse(null);
        if (store == null) return;
        try {
            Set<String> seen = new HashSet<>();
            String after = null;
            do {
                ShopifyAdminClient.ProductPage page = shopify.products(credentials(store), after);
                for (JsonNode node : page.products()) {
                    mapper.map(node).ifPresent(product -> {
                        writer.upsert(storeId, product);
                        seen.add(product.gid());
                    });
                }
                after = page.hasNextPage() ? page.endCursor() : null;
            } while (after != null);
            for (String gid : productRepository.findGidsByStoreId(storeId)) {
                if (!seen.contains(gid)) writer.delete(storeId, gid);
            }
            recordResult(storeId, null);
            log.info("Shop full sync for {} kept {} product(s)", store.getShopDomain(), seen.size());
        } catch (RuntimeException e) {
            log.error("Shop full sync failed for {}", store.getShopDomain(), e);
            recordResult(storeId, e.getMessage());
        }
    }

    /** One product, after a webhook. Deletes it when it no longer qualifies. */
    public void syncOne(String shopDomain, String gid) {
        storeRepository.findByShopDomain(shopDomain).ifPresent(store -> shopify.product(credentials(store), gid)
                .flatMap(mapper::map)
                .ifPresentOrElse(product -> writer.upsert(store.getId(), product), () -> writer.delete(store.getId(), gid)));
    }

    public void deleteOne(String shopDomain, String gid) {
        storeRepository.findByShopDomain(shopDomain).ifPresent(store -> writer.delete(store.getId(), gid));
    }

    /** Skipped when app.shop.webhook-base-url is blank (local dev); the nightly sync still runs. */
    public void registerWebhooks(ShopStore store) {
        if (!StringUtils.hasText(properties.getWebhookBaseUrl())) {
            log.warn("app.shop.webhook-base-url is blank; no webhooks registered for {}", store.getShopDomain());
            return;
        }
        String uri = properties.getWebhookBaseUrl().replaceAll("/+$", "") + WEBHOOK_PATH;
        for (String topic : WEBHOOK_TOPICS) shopify.registerWebhook(credentials(store), topic, uri);
    }

    private void recordResult(UUID storeId, String error) {
        storeRepository.findById(storeId).ifPresent(store -> {
            if (error == null) store.setLastSyncedAt(OffsetDateTime.now());
            store.setLastSyncError(error == null ? null : error.substring(0, Math.min(error.length(), ERROR_MAX)));
            storeRepository.save(store);
        });
    }
}
```

- [ ] **Step 5: Run, expect PASS.**

- [ ] **Step 6: Add the nightly job and an async trigger**

```java
// service/shop/ShopSyncJob.java
package event_social_media.service.shop;

import event_social_media.model.shop.ShopStore;
import event_social_media.repository.shop.ShopStoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Nightly full sync of every store: catches deletions, collection-membership changes (no webhook
 * for those) and missed webhooks. Each store's failure is recorded on the store and doesn't stop
 * the others.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShopSyncJob {

    private final ShopStoreRepository storeRepository;
    private final ShopSyncService syncService;

    @Scheduled(cron = "${app.shop.full-sync.cron:0 30 3 * * *}", zone = "UTC")
    public void runScheduled() {
        for (ShopStore store : storeRepository.findAllByOrderByNameAsc()) {
            syncService.fullSync(store.getId());
        }
    }

    /** "Sync now" and store creation: returns at once, the sync runs on the async pool. */
    @Async
    public void syncInBackground(UUID storeId) {
        syncService.fullSync(storeId);
    }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/main/java/event_social_media/service/shop src/test/java/event_social_media/service/shop/ShopSyncServiceTest.java
git commit -m "feat(shop): full and single-product sync with a nightly job"
```

### Task A6: Webhook endpoint

**Files:**
- Create: `controller/shop/ShopWebhookController.java`, `service/shop/ShopWebhookReceived.java`, `service/shop/ShopWebhookListener.java`
- Modify: `config/SecurityConfig.java` (permitAll list, next to `/api/webhooks/payments/*`)
- Test: `src/test/java/event_social_media/controller/shop/ShopWebhookControllerTest.java`

- [ ] **Step 1: Write the failing test** (`@SpringBootTest @AutoConfigureMockMvc @Transactional`, `@MockBean ShopSyncService`; save a `ShopStore` with domain `inviart.myshopify.com` and secret `s3cret` in `@BeforeEach`; reuse the `sign` helper from `ShopifyWebhookVerifierTest`)

```java
@Test
void verifiedProductUpdateSyncsThatProduct() throws Exception {
    String body = "{\"id\":8812345,\"admin_graphql_api_id\":\"gid://shopify/Product/8812345\"}";
    mockMvc.perform(post("/api/webhooks/shopify").contentType(MediaType.APPLICATION_JSON).content(body)
                    .header("X-Shopify-Topic", "products/update")
                    .header("X-Shopify-Shop-Domain", "inviart.myshopify.com")
                    .header("X-Shopify-Hmac-Sha256", sign(body, "s3cret")))
            .andExpect(status().isOk());
    verify(syncService, timeout(2000)).syncOne("inviart.myshopify.com", "gid://shopify/Product/8812345");
}

@Test
void deleteUsesTheNumericId() throws Exception {
    String body = "{\"id\":8812345}";
    mockMvc.perform(post("/api/webhooks/shopify").contentType(MediaType.APPLICATION_JSON).content(body)
                    .header("X-Shopify-Topic", "products/delete")
                    .header("X-Shopify-Shop-Domain", "inviart.myshopify.com")
                    .header("X-Shopify-Hmac-Sha256", sign(body, "s3cret")))
            .andExpect(status().isOk());
    verify(syncService, timeout(2000)).deleteOne("inviart.myshopify.com", "gid://shopify/Product/8812345");
}

@Test
void badSignatureIs401AndSyncsNothing() throws Exception {
    mockMvc.perform(post("/api/webhooks/shopify").contentType(MediaType.APPLICATION_JSON).content("{\"id\":1}")
                    .header("X-Shopify-Topic", "products/update")
                    .header("X-Shopify-Shop-Domain", "inviart.myshopify.com")
                    .header("X-Shopify-Hmac-Sha256", "AAAA"))
            .andExpect(status().isUnauthorized());
    verifyNoInteractions(syncService);
}

@Test
void unknownShopIs401() throws Exception {
    String body = "{\"id\":1}";
    mockMvc.perform(post("/api/webhooks/shopify").contentType(MediaType.APPLICATION_JSON).content(body)
                    .header("X-Shopify-Topic", "products/update")
                    .header("X-Shopify-Shop-Domain", "other.myshopify.com")
                    .header("X-Shopify-Hmac-Sha256", sign(body, "s3cret")))
            .andExpect(status().isUnauthorized());
}
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

```java
// service/shop/ShopWebhookReceived.java
package event_social_media.service.shop;

/** A verified Shopify webhook, handled after the HTTP response (Shopify wants an answer within 5 s). */
public record ShopWebhookReceived(String shopDomain, String topic, String productGid) {}
```

```java
// service/shop/ShopWebhookListener.java
package event_social_media.service.shop;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ShopWebhookListener {

    private final ShopSyncService syncService;

    @Async
    @EventListener
    public void on(ShopWebhookReceived event) {
        try {
            if ("products/delete".equals(event.topic())) {
                syncService.deleteOne(event.shopDomain(), event.productGid());
            } else {
                syncService.syncOne(event.shopDomain(), event.productGid());
            }
        } catch (RuntimeException e) {
            // The nightly full sync repairs whatever this missed.
            log.error("Shop webhook {} for {} failed", event.topic(), event.shopDomain(), e);
        }
    }
}
```

```java
// controller/shop/ShopWebhookController.java
package event_social_media.controller.shop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import event_social_media.repository.shop.ShopStoreRepository;
import event_social_media.service.ratelimit.RateLimit;
import event_social_media.service.shop.ShopWebhookReceived;
import event_social_media.service.shop.ShopifyWebhookVerifier;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Set;

/**
 * Shopify product webhooks. In the permitAll list because Shopify has no JWT; the HMAC over the raw
 * body, keyed by the store's client secret, is what authenticates it. Raw body, never a DTO, for the
 * same reason as PaymentWebhookController: the signature covers the exact bytes.
 */
@RestController
@RequestMapping("/api/webhooks/shopify")
@RequiredArgsConstructor
public class ShopWebhookController {

    private static final int MAX_BODY_CHARS = 512 * 1024;
    private static final Set<String> TOPICS = Set.of("products/create", "products/update", "products/delete");

    private final ShopStoreRepository storeRepository;
    private final ApplicationEventPublisher events;
    private final ObjectMapper objectMapper;

    @PostMapping
    @RateLimit(name = "webhooks.shopify", limit = 600, windowSeconds = 60)
    public ResponseEntity<Void> receive(@RequestBody String body,
                                        @RequestHeader(value = "X-Shopify-Topic", required = false) String topic,
                                        @RequestHeader(value = "X-Shopify-Shop-Domain", required = false) String shopDomain,
                                        @RequestHeader(value = "X-Shopify-Hmac-Sha256", required = false) String hmac) throws IOException {
        if (body.length() > MAX_BODY_CHARS || shopDomain == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String secret = storeRepository.findByShopDomain(shopDomain).map(s -> s.getClientSecret()).orElse(null);
        if (!ShopifyWebhookVerifier.verify(body, hmac, secret)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        // Verified but not a topic we handle: 200 so Shopify stops retrying.
        if (!TOPICS.contains(topic)) return ResponseEntity.ok().build();
        JsonNode payload = objectMapper.readTree(body);
        String gid = payload.hasNonNull("admin_graphql_api_id")
                ? payload.get("admin_graphql_api_id").asText()
                : "gid://shopify/Product/" + payload.path("id").asText();
        events.publishEvent(new ShopWebhookReceived(shopDomain, topic, gid));
        return ResponseEntity.ok().build();
    }
}
```

- [ ] **Step 4: Open the path in `SecurityConfig`** (inside the existing `permitAll` list, after `/api/webhooks/payments/*`)

```java
                                // Shopify product webhooks. Authenticated by the HMAC over the raw
                                // body, keyed by the store's client secret — see ShopWebhookController.
                                "/api/webhooks/shopify",
```

- [ ] **Step 5: Run, expect PASS. Commit**

```bash
git add src/main/java/event_social_media/controller/shop/ShopWebhookController.java src/main/java/event_social_media/service/shop/ShopWebhookReceived.java src/main/java/event_social_media/service/shop/ShopWebhookListener.java src/main/java/event_social_media/config/SecurityConfig.java src/test/java/event_social_media/controller/shop/ShopWebhookControllerTest.java
git commit -m "feat(shop): signed Shopify product webhooks"
```

### Task A7: Admin — stores

**Files:**
- Create: `dto/shop/ShopStoreAdminDto.java`, `ShopStoreCreateDto.java`, `ShopStorePatchDto.java`, `ShopCollectionDto.java`
- Create: `service/shop/ShopStoreAdminService.java`, `controller/shop/ShopStoreAdminController.java`
- Modify: `model/audit/AdminAuditAction.java`, `exception/ErrorCode.java`
- Test: `src/test/java/event_social_media/controller/shop/ShopStoreAdminControllerTest.java`, `ShopStoreAdminControllerSecurityTest.java` (copy `LandingCategoryAdminControllerSecurityTest`: a non-admin gets 403 on every route)

Endpoints (all `/api/admin/shop/stores`, admin only):

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `` | | `ShopStoreAdminDto[]` |
| POST | `` | `ShopStoreCreateDto` | 201 `ShopStoreAdminDto`; checks credentials, registers webhooks, starts a background full sync |
| PATCH | `/{id}` | `ShopStorePatchDto` | `ShopStoreAdminDto`; a new `clientSecret`/`clientId` is re-checked and webhooks re-registered |
| DELETE | `/{id}` | | 204; cascades its products and category mappings |
| POST | `/{id}/sync` | | 202; background full sync |
| GET | `/{id}/collections` | | `ShopCollectionDto[]`, live from Shopify |

- [ ] **Step 1: Add audit actions and error codes**

```java
    // AdminAuditAction.java, at the end (add a comma after APP_REVIEW_UPDATED)
    /** A Shopify store was connected; details: shopDomain. Target type SHOP_STORE. */
    SHOP_STORE_CREATED,
    /** A Shopify store was edited; details: fields (names only; never the secret). Target type SHOP_STORE. */
    SHOP_STORE_UPDATED,
    /** A Shopify store was removed with its products; details: shopDomain. Target type SHOP_STORE. */
    SHOP_STORE_DELETED,
    /** A shop category was created; no details. Target type SHOP_CATEGORY. */
    SHOP_CATEGORY_CREATED,
    /** A shop category was edited; details: fields. Target type SHOP_CATEGORY. */
    SHOP_CATEGORY_UPDATED,
    /** A shop category was deleted; no details. Target type SHOP_CATEGORY. */
    SHOP_CATEGORY_DELETED,
    /** A shop category's collections were replaced; details: collectionGids. Target type SHOP_CATEGORY. */
    SHOP_CATEGORY_COLLECTIONS_CHANGED
```

```java
    // ErrorCode.java, after the last 51xx code. Check origin/staging and open branches for the
    // highest code first and renumber if 5190–5192 are taken.
    /** Another store already uses this Shopify domain. */
    SHOP_STORE_DOMAIN_TAKEN(5190),
    /** Another store or category already uses this slug. */
    SHOP_SLUG_TAKEN(5191),
    /** Shopify refused the client ID/secret for this domain. */
    SHOP_CREDENTIALS_INVALID(5192),
```

Then search the frontend for how a new error code is surfaced (`lib/api/errorMessageKeys.ts`) and note the three codes for Task B1.

- [ ] **Step 2: DTOs**

```java
// dto/shop/ShopStoreAdminDto.java — never carries clientSecret
public record ShopStoreAdminDto(UUID id, String name, String slug, String shopDomain, String clientId,
                                boolean isVisible, OffsetDateTime lastSyncedAt, String lastSyncError, long productCount) {}
```

```java
// dto/shop/ShopStoreCreateDto.java
@Getter
@Setter
public class ShopStoreCreateDto {
    @NotBlank @Size(max = 80) private String name;
    @NotBlank @Pattern(regexp = "^[a-z0-9][a-z0-9-]{1,39}$") private String slug;
    @NotBlank @Pattern(regexp = "^[a-z0-9][a-z0-9-]*\\.myshopify\\.com$") private String shopDomain;
    @NotBlank @Size(max = 120) private String clientId;
    @NotBlank @Size(max = 200) private String clientSecret;
    private Boolean isVisible;
}
```

```java
// dto/shop/ShopStorePatchDto.java — slug and shopDomain are fixed after creation
@Getter
@Setter
public class ShopStorePatchDto {
    @Size(min = 1, max = 80) private String name;
    @Size(min = 1, max = 120) private String clientId;
    @Size(min = 1, max = 200) private String clientSecret;
    private Boolean isVisible;
}
```

```java
// dto/shop/ShopCollectionDto.java
public record ShopCollectionDto(String gid, String handle, String title) {}
```

- [ ] **Step 3: Write the failing controller test** (`@MockBean ShopifyAdminClient`, `@MockBean ShopSyncJob`; admin auth as in `LandingCategoryAdminControllerTest`)

```java
private static final String CREATE = """
        {"name":"Inviart","slug":"inviart","shopDomain":"inviart.myshopify.com","clientId":"cid","clientSecret":"s3cret"}""";

@Test
void createChecksCredentialsRegistersWebhooksAndStartsSync() throws Exception {
    String body = mockMvc.perform(post("/api/admin/shop/stores").with(authentication(admin))
                    .contentType(MediaType.APPLICATION_JSON).content(CREATE))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.clientSecret").doesNotExist())
            .andExpect(jsonPath("$.isVisible").value(false))
            .andReturn().getResponse().getContentAsString();
    UUID id = UUID.fromString(objectMapper.readTree(body).get("id").asText());
    verify(shopify).checkCredentials(new ShopifyAdminClient.Credentials("inviart.myshopify.com", "cid", "s3cret"));
    verify(syncJob).syncInBackground(id);
    assertThat(auditRepository.findAll()).anyMatch(a -> a.getAction() == AdminAuditAction.SHOP_STORE_CREATED);
}

@Test
void refusedCredentialsAre400AndNothingIsSaved() throws Exception {
    doThrow(new ShopifyAdminClient.InvalidCredentialsException("no")).when(shopify).checkCredentials(any());
    mockMvc.perform(post("/api/admin/shop/stores").with(authentication(admin))
                    .contentType(MediaType.APPLICATION_JSON).content(CREATE))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(5192));
    assertThat(storeRepository.count()).isZero();
}

@Test
void duplicateDomainIsRejectedWithItsCode() throws Exception {
    mockMvc.perform(post("/api/admin/shop/stores").with(authentication(admin)).contentType(MediaType.APPLICATION_JSON).content(CREATE));
    mockMvc.perform(post("/api/admin/shop/stores").with(authentication(admin))
                    .contentType(MediaType.APPLICATION_JSON).content(CREATE.replace("\"slug\":\"inviart\"", "\"slug\":\"inviart-2\"")))
            .andExpect(jsonPath("$.code").value(5190));
}

@Test
void collectionsComeFromShopify() throws Exception {
    when(shopify.collections(any())).thenReturn(List.of(new ShopifyAdminClient.Collection("gid://shopify/Collection/1", "prosklitiria-gamoy", "Προσκλητήρια Γάμου")));
    String id = objectMapper.readTree(mockMvc.perform(post("/api/admin/shop/stores").with(authentication(admin))
            .contentType(MediaType.APPLICATION_JSON).content(CREATE)).andReturn().getResponse().getContentAsString()).get("id").asText();
    mockMvc.perform(get("/api/admin/shop/stores/" + id + "/collections").with(authentication(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].handle").value("prosklitiria-gamoy"));
}
```

- [ ] **Step 4: Run, expect FAIL.**

- [ ] **Step 5: Implement the service**

```java
// service/shop/ShopStoreAdminService.java
package event_social_media.service.shop;

import event_social_media.dto.shop.*;
import event_social_media.exception.BadRequestException;
import event_social_media.exception.ErrorCode;
import event_social_media.exception.ResourceNotFoundException;
import event_social_media.model.audit.AdminAuditAction;
import event_social_media.model.shop.ShopStore;
import event_social_media.repository.shop.ShopProductRepository;
import event_social_media.repository.shop.ShopStoreRepository;
import event_social_media.service.audit.AdminActor;
import event_social_media.service.audit.AdminAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Connects Shopify stores. The secret is write-only: accepted on create/patch, never returned. */
@Service
@RequiredArgsConstructor
public class ShopStoreAdminService {

    private static final String TARGET_TYPE = "SHOP_STORE";

    private final ShopStoreRepository repository;
    private final ShopProductRepository productRepository;
    private final ShopifyAdminClient shopify;
    private final ShopSyncService syncService;
    private final ShopSyncJob syncJob;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<ShopStoreAdminDto> findAll() {
        return repository.findAllByOrderByNameAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public ShopStoreAdminDto create(ShopStoreCreateDto dto, AdminActor actor) {
        if (repository.existsByShopDomain(dto.getShopDomain())) {
            throw new BadRequestException(ErrorCode.SHOP_STORE_DOMAIN_TAKEN, "Store domain already connected");
        }
        if (repository.existsBySlug(dto.getSlug())) {
            throw new BadRequestException(ErrorCode.SHOP_SLUG_TAKEN, "Slug already used");
        }
        ShopifyAdminClient.Credentials creds = new ShopifyAdminClient.Credentials(dto.getShopDomain(), dto.getClientId(), dto.getClientSecret());
        checkCredentials(creds);
        ShopStore store = new ShopStore();
        store.setName(dto.getName().strip());
        store.setSlug(dto.getSlug());
        store.setShopDomain(dto.getShopDomain());
        store.setClientId(dto.getClientId().strip());
        store.setClientSecret(dto.getClientSecret().strip());
        store.setIsVisible(Boolean.TRUE.equals(dto.getIsVisible()));
        ShopStore saved = repository.save(store);
        syncService.registerWebhooks(saved);
        adminAuditService.record(actor, AdminAuditAction.SHOP_STORE_CREATED, TARGET_TYPE, saved.getId(), null,
                Map.of("shopDomain", saved.getShopDomain()));
        afterCommit(() -> syncJob.syncInBackground(saved.getId()));
        return toDto(saved);
    }

    @Transactional
    public ShopStoreAdminDto patch(UUID id, ShopStorePatchDto dto, AdminActor actor) {
        ShopStore store = find(id);
        List<String> fields = new ArrayList<>();
        if (dto.getName() != null) { store.setName(dto.getName().strip()); fields.add("name"); }
        if (dto.getIsVisible() != null) { store.setIsVisible(dto.getIsVisible()); fields.add("isVisible"); }
        boolean credentialsChanged = dto.getClientId() != null || dto.getClientSecret() != null;
        if (credentialsChanged) {
            String clientId = dto.getClientId() != null ? dto.getClientId().strip() : store.getClientId();
            String secret = dto.getClientSecret() != null ? dto.getClientSecret().strip() : store.getClientSecret();
            checkCredentials(new ShopifyAdminClient.Credentials(store.getShopDomain(), clientId, secret));
            store.setClientId(clientId);
            store.setClientSecret(secret);
            if (dto.getClientId() != null) fields.add("clientId");
            if (dto.getClientSecret() != null) fields.add("clientSecret");
        }
        ShopStore saved = repository.save(store);
        if (credentialsChanged) syncService.registerWebhooks(saved);
        if (!fields.isEmpty()) {
            adminAuditService.record(actor, AdminAuditAction.SHOP_STORE_UPDATED, TARGET_TYPE, id, null, Map.of("fields", fields));
        }
        return toDto(saved);
    }

    @Transactional
    public void delete(UUID id, AdminActor actor) {
        ShopStore store = find(id);
        repository.delete(store);
        shopify.forget(store.getShopDomain());
        adminAuditService.record(actor, AdminAuditAction.SHOP_STORE_DELETED, TARGET_TYPE, id, null,
                Map.of("shopDomain", store.getShopDomain()));
    }

    public void syncNow(UUID id) {
        find(id);
        syncJob.syncInBackground(id);
    }

    @Transactional(readOnly = true)
    public List<ShopCollectionDto> collections(UUID id) {
        ShopStore store = find(id);
        return shopify.collections(ShopSyncService.credentials(store)).stream()
                .map(c -> new ShopCollectionDto(c.gid(), c.handle(), c.title()))
                .toList();
    }

    private void checkCredentials(ShopifyAdminClient.Credentials creds) {
        try {
            shopify.checkCredentials(creds);
        } catch (ShopifyAdminClient.InvalidCredentialsException e) {
            throw new BadRequestException(ErrorCode.SHOP_CREDENTIALS_INVALID, e.getMessage());
        }
    }

    private ShopStore find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("ShopStore", id));
    }

    private ShopStoreAdminDto toDto(ShopStore s) {
        return new ShopStoreAdminDto(s.getId(), s.getName(), s.getSlug(), s.getShopDomain(), s.getClientId(),
                s.getIsVisible(), s.getLastSyncedAt(), s.getLastSyncError(), productRepository.countByStoreId(s.getId()));
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) { action.run(); return; }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { action.run(); }
        });
    }
}
```

`afterCommit` matters: the background sync reads the store row, which doesn't exist for other transactions until this one commits. In the `@Transactional` test the commit never happens, so the test's `verify(syncJob).syncInBackground(id)` must be relaxed: either drop that assertion from the controller test and cover it in a non-transactional test, or assert `TestTransaction.flagForCommit(); TestTransaction.end();` before verifying (and clean up the row after). Pick the second; it keeps the behavior under test.

- [ ] **Step 6: Implement the controller** (shape copied from `LandingCategoryAdminController`)

```java
@RestController
@RequestMapping("/api/admin/shop/stores")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ShopStoreAdminController {

    private final ShopStoreAdminService service;
    private final ClientAddressResolver clientAddressResolver;

    @GetMapping
    public List<ShopStoreAdminDto> findAll() { return service.findAll(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShopStoreAdminDto create(@Valid @RequestBody ShopStoreCreateDto dto, Authentication authentication, HttpServletRequest request) {
        return service.create(dto, actor(authentication, request));
    }

    @PatchMapping("/{id}")
    public ShopStoreAdminDto patch(@PathVariable UUID id, @Valid @RequestBody ShopStorePatchDto dto,
                                   Authentication authentication, HttpServletRequest request) {
        return service.patch(id, dto, actor(authentication, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication, HttpServletRequest request) {
        service.delete(id, actor(authentication, request));
    }

    @PostMapping("/{id}/sync")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void sync(@PathVariable UUID id) { service.syncNow(id); }

    @GetMapping("/{id}/collections")
    public List<ShopCollectionDto> collections(@PathVariable UUID id) { return service.collections(id); }

    private AdminActor actor(Authentication authentication, HttpServletRequest request) {
        return new AdminActor(UUID.fromString((String) authentication.getPrincipal()), clientAddressResolver.resolve(request));
    }
}
```

- [ ] **Step 7: Run both test classes, expect PASS. Commit**

```bash
git add src/main/java/event_social_media/dto/shop src/main/java/event_social_media/service/shop/ShopStoreAdminService.java src/main/java/event_social_media/controller/shop/ShopStoreAdminController.java src/main/java/event_social_media/model/audit/AdminAuditAction.java src/main/java/event_social_media/exception/ErrorCode.java src/test/java/event_social_media/controller/shop
git commit -m "feat(shop): admin endpoints to connect and sync Shopify stores"
```

### Task A8: Admin — categories

**Files:**
- Create: `dto/shop/ShopCategoryAdminDto.java`, `ShopCategoryCreateDto.java`, `ShopCategoryPatchDto.java`, `ShopCategoryCollectionsDto.java`
- Create: `service/shop/ShopCategoryAdminService.java`, `controller/shop/ShopCategoryAdminController.java`
- Test: `src/test/java/event_social_media/controller/shop/ShopCategoryAdminControllerTest.java`, `ShopCategoryAdminControllerSecurityTest.java`

Endpoints (`/api/admin/shop/categories`): GET list, POST create (201), PATCH `/{id}`, DELETE `/{id}` (204), PUT `/{id}/collections` (replace mappings).

- [ ] **Step 1: DTOs**

```java
public record ShopCategoryAdminDto(UUID id, Map<String, String> name, String slug, int sortOrder, boolean isVisible,
                                   List<Mapping> collections) {
    public record Mapping(UUID storeId, String collectionGid, String collectionTitle) {}
}
```

```java
@Getter
@Setter
public class ShopCategoryCreateDto {
    @NotNull private Map<@Pattern(regexp = "en|el") String, @NotBlank @Size(max = 40) String> name;
    @NotBlank @Pattern(regexp = "^[a-z0-9][a-z0-9-]{1,39}$") private String slug;
    @Min(0) @Max(1000) private Integer sortOrder;
    private Boolean isVisible;
}
```

```java
@Getter
@Setter
public class ShopCategoryPatchDto {
    private Map<@Pattern(regexp = "en|el") String, @NotBlank @Size(max = 40) String> name;
    @Min(0) @Max(1000) private Integer sortOrder;
    private Boolean isVisible;
}
```

```java
@Getter
@Setter
public class ShopCategoryCollectionsDto {
    @NotNull @Size(max = 50) private List<@Valid Item> collections;

    @Getter
    @Setter
    public static class Item {
        @NotNull private UUID storeId;
        @NotBlank @Pattern(regexp = "^gid://shopify/Collection/\\d+$") private String collectionGid;
        @NotBlank @Size(max = 255) private String collectionTitle;
    }
}
```

- [ ] **Step 2: Write the failing controller test**

```java
@Test
void createMapAndList() throws Exception {
    ShopStore store = savedStore(); // helper: saves a ShopStore directly through the repository
    String id = objectMapper.readTree(mockMvc.perform(post("/api/admin/shop/categories").with(authentication(admin))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":{\"en\":\"Wedding invitations\",\"el\":\"Προσκλητήρια γάμου\"},\"slug\":\"wedding-invitations\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(put("/api/admin/shop/categories/" + id + "/collections").with(authentication(admin))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"collections\":[{\"storeId\":\"" + store.getId() + "\",\"collectionGid\":\"gid://shopify/Collection/1\",\"collectionTitle\":\"Προσκλητήρια Γάμου\"}]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.collections[0].collectionGid").value("gid://shopify/Collection/1"));

    mockMvc.perform(get("/api/admin/shop/categories").with(authentication(admin)))
            .andExpect(jsonPath("$[0].slug").value("wedding-invitations"))
            .andExpect(jsonPath("$[0].collections.length()").value(1));
}

@Test
void nameNeedsBothLanguages() throws Exception {
    mockMvc.perform(post("/api/admin/shop/categories").with(authentication(admin))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":{\"en\":\"Only English\"},\"slug\":\"only-en\"}"))
            .andExpect(status().isBadRequest());
}

@Test
void duplicateSlugIsRejected() throws Exception {
    String body = "{\"name\":{\"en\":\"A\",\"el\":\"Α\"},\"slug\":\"same\"}";
    mockMvc.perform(post("/api/admin/shop/categories").with(authentication(admin)).contentType(MediaType.APPLICATION_JSON).content(body));
    mockMvc.perform(post("/api/admin/shop/categories").with(authentication(admin)).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(jsonPath("$.code").value(5191));
}
```

- [ ] **Step 3: Run, expect FAIL. Implement the service**

```java
// service/shop/ShopCategoryAdminService.java
@Service
@RequiredArgsConstructor
public class ShopCategoryAdminService {

    private static final String TARGET_TYPE = "SHOP_CATEGORY";
    private static final List<String> LOCALES = List.of("en", "el");

    private final ShopCategoryRepository repository;
    private final ShopCategoryCollectionRepository mappingRepository;
    private final ShopStoreRepository storeRepository;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<ShopCategoryAdminDto> findAll() {
        List<ShopCategory> categories = repository.findAllByOrderBySortOrderAscIdAsc();
        Map<UUID, List<ShopCategoryCollection>> mappings = mappingRepository
                .findByCategoryIdIn(categories.stream().map(ShopCategory::getId).toList()).stream()
                .collect(Collectors.groupingBy(ShopCategoryCollection::getCategoryId));
        return categories.stream().map(c -> toDto(c, mappings.getOrDefault(c.getId(), List.of()))).toList();
    }

    @Transactional
    public ShopCategoryAdminDto create(ShopCategoryCreateDto dto, AdminActor actor) {
        if (repository.existsBySlug(dto.getSlug())) throw new BadRequestException(ErrorCode.SHOP_SLUG_TAKEN, "Slug already used");
        ShopCategory category = new ShopCategory();
        category.setName(name(dto.getName()));
        category.setSlug(dto.getSlug());
        if (dto.getSortOrder() != null) category.setSortOrder(dto.getSortOrder());
        if (dto.getIsVisible() != null) category.setIsVisible(dto.getIsVisible());
        ShopCategory saved = repository.save(category);
        adminAuditService.record(actor, AdminAuditAction.SHOP_CATEGORY_CREATED, TARGET_TYPE, saved.getId(), null, Map.of());
        return toDto(saved, List.of());
    }

    @Transactional
    public ShopCategoryAdminDto patch(UUID id, ShopCategoryPatchDto dto, AdminActor actor) {
        ShopCategory category = find(id);
        List<String> fields = new ArrayList<>();
        if (dto.getName() != null) { category.setName(name(dto.getName())); fields.add("name"); }
        if (dto.getSortOrder() != null) { category.setSortOrder(dto.getSortOrder()); fields.add("sortOrder"); }
        if (dto.getIsVisible() != null) { category.setIsVisible(dto.getIsVisible()); fields.add("isVisible"); }
        ShopCategory saved = repository.save(category);
        if (!fields.isEmpty()) adminAuditService.record(actor, AdminAuditAction.SHOP_CATEGORY_UPDATED, TARGET_TYPE, id, null, Map.of("fields", fields));
        return toDto(saved, mappingRepository.findByCategoryId(id));
    }

    @Transactional
    public void delete(UUID id, AdminActor actor) {
        ShopCategory category = find(id);
        mappingRepository.deleteByCategoryId(id); // H2 has no ON DELETE CASCADE in tests
        repository.delete(category);
        adminAuditService.record(actor, AdminAuditAction.SHOP_CATEGORY_DELETED, TARGET_TYPE, id, null, Map.of());
    }

    @Transactional
    public ShopCategoryAdminDto setCollections(UUID id, ShopCategoryCollectionsDto dto, AdminActor actor) {
        ShopCategory category = find(id);
        Set<UUID> storeIds = dto.getCollections().stream().map(ShopCategoryCollectionsDto.Item::getStoreId).collect(Collectors.toSet());
        for (UUID storeId : storeIds) {
            if (!storeRepository.existsById(storeId)) throw new ResourceNotFoundException("ShopStore", storeId);
        }
        mappingRepository.deleteByCategoryId(id);
        mappingRepository.flush();
        Set<String> seen = new HashSet<>();
        List<ShopCategoryCollection> saved = new ArrayList<>();
        for (ShopCategoryCollectionsDto.Item item : dto.getCollections()) {
            if (!seen.add(item.getStoreId() + "|" + item.getCollectionGid())) continue;
            ShopCategoryCollection mapping = new ShopCategoryCollection();
            mapping.setCategoryId(id);
            mapping.setStoreId(item.getStoreId());
            mapping.setCollectionGid(item.getCollectionGid());
            mapping.setCollectionTitle(item.getCollectionTitle().strip());
            saved.add(mappingRepository.save(mapping));
        }
        adminAuditService.record(actor, AdminAuditAction.SHOP_CATEGORY_COLLECTIONS_CHANGED, TARGET_TYPE, id, null,
                Map.of("collectionGids", saved.stream().map(ShopCategoryCollection::getCollectionGid).toList()));
        return toDto(category, saved);
    }

    private Map<String, String> name(Map<String, String> input) {
        if (!input.keySet().equals(Set.copyOf(LOCALES))) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Name needs en and el");
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (String locale : LOCALES) result.put(locale, input.get(locale).strip());
        return result;
    }

    private ShopCategory find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("ShopCategory", id));
    }

    private static ShopCategoryAdminDto toDto(ShopCategory c, List<ShopCategoryCollection> mappings) {
        return new ShopCategoryAdminDto(c.getId(), c.getName(), c.getSlug(), c.getSortOrder(), c.getIsVisible(),
                mappings.stream().map(m -> new ShopCategoryAdminDto.Mapping(m.getStoreId(), m.getCollectionGid(), m.getCollectionTitle())).toList());
    }
}
```

`ErrorCode.VALIDATION_FAILED`: use whatever generic validation code `ErrorCode` already has (grep for the one `LandingCategoryService.normalizedName` throws and use the same constant).

- [ ] **Step 4: Controller** — same shape as `ShopStoreAdminController` with routes GET, POST, PATCH `/{id}`, DELETE `/{id}`, PUT `/{id}/collections` calling the service methods above.

- [ ] **Step 5: Run, expect PASS. Commit**

```bash
git add src/main/java/event_social_media/dto/shop src/main/java/event_social_media/service/shop/ShopCategoryAdminService.java src/main/java/event_social_media/controller/shop/ShopCategoryAdminController.java src/test/java/event_social_media/controller/shop
git commit -m "feat(shop): admin categories mapped onto Shopify collections"
```

### Task A9: Public endpoints

**Files:**
- Create: `dto/shop/ShopCategoryDto.java`, `ShopProductCardDto.java`, `ShopProductDto.java`, `ShopProductPageDto.java`
- Create: `service/shop/ShopPublicService.java`, `controller/shop/ShopController.java`
- Modify: `config/SecurityConfig.java`
- Test: `src/test/java/event_social_media/controller/shop/ShopControllerTest.java`

Endpoints (no auth):

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/shop/categories` | `ShopCategoryDto[]` (visible, with at least one mapping of a visible store) |
| GET | `/api/shop/products?category={slug}&page={n}` | `ShopProductPageDto` (24 per page; unknown/hidden category → 404) |
| GET | `/api/shop/products/{storeSlug}/{handle}` | `ShopProductDto` (404 unless it would be listed) |

- [ ] **Step 1: DTOs**

```java
public record ShopCategoryDto(String slug, Map<String, String> name) {}

public record ShopProductCardDto(String storeSlug, String handle, String title, String imageUrl, String imageAlt,
                                 long minPriceCents, long maxPriceCents, String currency, boolean isDigital) {}

public record ShopProductPageDto(List<ShopProductCardDto> items, int page, int totalPages, long totalItems) {}

public record ShopProductDto(String storeSlug, String storeName, String handle, String title, String description,
                             String productUrl, long minPriceCents, long maxPriceCents, String currency, boolean isDigital,
                             List<ShopImage> images, List<ShopVariant> variants) {}
```

- [ ] **Step 2: Write the failing test** (seed with repositories as in Task A2's helpers: visible store `inviart`, visible category `wedding-invitations` mapped to Collection/1, product `passport` in Collection/1, product `hidden` in unmapped Collection/9)

```java
@Test
void listsCategoriesAndProductsAnonymously() throws Exception {
    mockMvc.perform(get("/api/shop/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slug").value("wedding-invitations"));
    mockMvc.perform(get("/api/shop/products").param("category", "wedding-invitations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].handle").value("passport"))
            .andExpect(jsonPath("$.items[0].storeSlug").value("inviart"))
            .andExpect(jsonPath("$.totalPages").value(1));
}

@Test
void productPageOnlyForListedProducts() throws Exception {
    mockMvc.perform(get("/api/shop/products/inviart/passport"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.productUrl").value("https://inviart.gr/products/passport"));
    mockMvc.perform(get("/api/shop/products/inviart/hidden")).andExpect(status().isNotFound());
}

@Test
void unknownCategoryIs404() throws Exception {
    mockMvc.perform(get("/api/shop/products").param("category", "nope")).andExpect(status().isNotFound());
}
```

- [ ] **Step 3: Run, expect FAIL. Implement**

```java
// service/shop/ShopPublicService.java
@Service
@RequiredArgsConstructor
public class ShopPublicService {

    public static final int PAGE_SIZE = 24;

    private final ShopCategoryRepository categoryRepository;
    private final ShopStoreRepository storeRepository;
    private final ShopProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<ShopCategoryDto> categories() {
        return categoryRepository.findPublic().stream().map(c -> new ShopCategoryDto(c.getSlug(), c.getName())).toList();
    }

    @Transactional(readOnly = true)
    public ShopProductPageDto products(String categorySlug, int page) {
        UUID categoryId = null;
        if (categorySlug != null) {
            categoryId = categoryRepository.findBySlugAndIsVisibleTrue(categorySlug)
                    .orElseThrow(() -> new ResourceNotFoundException("Shop category not found")).getId();
        }
        Page<ShopProduct> result = productRepository.findPublic(categoryId, PageRequest.of(Math.max(page, 0), PAGE_SIZE));
        Map<UUID, String> slugs = storeSlugs();
        return new ShopProductPageDto(result.map(p -> card(p, slugs.get(p.getStoreId()))).getContent(),
                result.getNumber(), result.getTotalPages(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ShopProductDto product(String storeSlug, String handle) {
        ShopStore store = storeRepository.findBySlug(storeSlug).filter(ShopStore::getIsVisible)
                .orElseThrow(() -> new ResourceNotFoundException("Shop product not found"));
        ShopProduct p = productRepository.findPublicByStoreAndHandle(store.getId(), handle)
                .orElseThrow(() -> new ResourceNotFoundException("Shop product not found"));
        return new ShopProductDto(store.getSlug(), store.getName(), p.getHandle(), p.getTitle(), p.getDescription(),
                p.getProductUrl(), p.getMinPriceCents(), p.getMaxPriceCents(), p.getCurrency(), p.getIsDigital(),
                p.getImages(), p.getVariants());
    }

    private Map<UUID, String> storeSlugs() {
        return storeRepository.findAll().stream().collect(Collectors.toMap(ShopStore::getId, ShopStore::getSlug));
    }

    private static ShopProductCardDto card(ShopProduct p, String storeSlug) {
        ShopImage first = p.getImages().isEmpty() ? null : p.getImages().get(0);
        return new ShopProductCardDto(storeSlug, p.getHandle(), p.getTitle(), first == null ? null : first.url(),
                first == null ? null : first.alt(), p.getMinPriceCents(), p.getMaxPriceCents(), p.getCurrency(), p.getIsDigital());
    }
}
```

Add to `ShopProductRepository`:

```java
    /** One product, only if it would appear in the public list. */
    @Query("""
            SELECT p FROM ShopProduct p WHERE p.storeId = :storeId AND p.handle = :handle AND EXISTS (
                SELECT 1 FROM ShopCategoryCollection m, ShopCategory c
                WHERE m.storeId = p.storeId AND m.collectionGid MEMBER OF p.collectionGids
                  AND c.id = m.categoryId AND c.isVisible = true)""")
    Optional<ShopProduct> findPublicByStoreAndHandle(@Param("storeId") UUID storeId, @Param("handle") String handle);
```

(Use the same `MEMBER OF` fallback as Task A2 if H2 needed it there.)

```java
// controller/shop/ShopController.java
@RestController
@RequestMapping("/api/shop")
@RequiredArgsConstructor
public class ShopController {

    private final ShopPublicService service;

    @GetMapping("/categories")
    public List<ShopCategoryDto> categories() { return service.categories(); }

    @GetMapping("/products")
    public ShopProductPageDto products(@RequestParam(required = false) String category,
                                       @RequestParam(defaultValue = "0") int page) {
        return service.products(category, page);
    }

    @GetMapping("/products/{storeSlug}/{handle}")
    public ShopProductDto product(@PathVariable String storeSlug, @PathVariable String handle) {
        return service.product(storeSlug, handle);
    }
}
```

- [ ] **Step 4: Open the reads in `SecurityConfig`** (next to the other public GET matchers)

```java
                        // The public shop: products copied from connected Shopify stores. Read-only.
                        .requestMatchers(HttpMethod.GET, "/api/shop/**").permitAll()
```

- [ ] **Step 5: Run, expect PASS. Run the whole suite** (`./gradlew test`), fix anything it surfaces. **Commit**

```bash
git add src/main/java/event_social_media/dto/shop src/main/java/event_social_media/service/shop/ShopPublicService.java src/main/java/event_social_media/controller/shop/ShopController.java src/main/java/event_social_media/repository/shop/ShopProductRepository.java src/main/java/event_social_media/config/SecurityConfig.java src/test/java/event_social_media/controller/shop/ShopControllerTest.java
git commit -m "feat(shop): public shop categories and products"
```

### Task A10: Staging check, docs and PR

- [ ] **Step 1:** Run `graphify update .` (backend CLAUDE.md rule).
- [ ] **Step 2:** Set `SHOP_WEBHOOK_BASE_URL` on Railway staging to the staging API's public origin. Open the PR into `staging` with the Railway variable listed in the description.
- [ ] **Step 3: Staging smoke test, with the uncle:**
  1. In his Shopify admin, open the Dev Dashboard, create an app, give it the `read_products` scope, release a version and install it on his store. He sends the **client ID and secret through a password manager share or in person, not chat or email**.
  2. In the staging admin console (or with curl as admin), POST the store. Expect 201, then `productCount` > 0 within a few minutes on GET.
  3. GET `/api/admin/shop/stores/{id}/collections` and confirm `prosklitiria-gamoy` is listed.
  4. Create category "Wedding invitations" and map that collection. `curl {staging-api}/api/shop/products?category=wedding-invitations` returns products.
  5. Have him change one product's price in Shopify. Within a few seconds `GET /api/shop/products/inviart/{handle}` shows the new price (proves webhooks).

---

# Part B — Frontend

Run from this worktree after resetting it to `origin/staging` (it starts on `main`). Commands: `npx vitest run <path>`, `npx tsc --noEmit`, `npm run lint`.

### Task B1: Types, endpoints, error copy

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errorMessageKeys.ts`, `messages/en.json`, `messages/el.json`
- Test: `lib/api/endpoints.test.ts` (create if it doesn't exist; otherwise add cases)

- [ ] **Step 1: Write the failing endpoint test**

```ts
import { describe, expect, it } from 'vitest';

import { endpoints } from '@/lib/api/endpoints';

describe('shop endpoints', () => {
    it('builds public and admin shop paths', () => {
        expect(endpoints.shop.products({ category: 'wedding-invitations', page: 2 })).toBe('/api/shop/products?category=wedding-invitations&page=2');
        expect(endpoints.shop.products({ page: 0 })).toBe('/api/shop/products?page=0');
        expect(endpoints.shop.product('inviart', 'hlektroniko-prosklitirio')).toBe('/api/shop/products/inviart/hlektroniko-prosklitirio');
        expect(endpoints.admin.shop.storeCollections('id-1')).toBe('/api/admin/shop/stores/id-1/collections');
        expect(endpoints.admin.shop.categoryCollections('c-1')).toBe('/api/admin/shop/categories/c-1/collections');
    });
});
```

- [ ] **Step 2: Run, expect FAIL.** `npx vitest run lib/api/endpoints.test.ts`

- [ ] **Step 3: Add types** (end of `lib/api/types.ts`)

```ts
// Shop (plan 2026-10-27-shopify-shop). Prices are cents.
export interface ShopCategoryDto {
    slug: string;
    name: LocalizedText;
}

export interface ShopProductCardDto {
    storeSlug: string;
    handle: string;
    title: string;
    imageUrl: string | null;
    imageAlt: string | null;
    minPriceCents: number;
    maxPriceCents: number;
    currency: string;
    isDigital: boolean;
}

export interface ShopProductPageDto {
    items: ShopProductCardDto[];
    page: number;
    totalPages: number;
    totalItems: number;
}

export interface ShopImageDto {
    url: string;
    alt: string | null;
}

export interface ShopVariantDto {
    title: string;
    priceCents: number;
}

export interface ShopProductDto {
    storeSlug: string;
    storeName: string;
    handle: string;
    title: string;
    description: string;
    productUrl: string;
    minPriceCents: number;
    maxPriceCents: number;
    currency: string;
    isDigital: boolean;
    images: ShopImageDto[];
    variants: ShopVariantDto[];
}

export interface AdminShopStoreDto {
    id: string;
    name: string;
    slug: string;
    shopDomain: string;
    clientId: string;
    isVisible: boolean;
    lastSyncedAt: string | null;
    lastSyncError: string | null;
    productCount: number;
}

export interface AdminShopStoreCreateDto {
    name: string;
    slug: string;
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    isVisible: boolean;
}

export type AdminShopStorePatchDto = Partial<Pick<AdminShopStoreCreateDto, 'name' | 'clientId' | 'clientSecret' | 'isVisible'>>;

export interface AdminShopCollectionDto {
    gid: string;
    handle: string;
    title: string;
}

export interface AdminShopCategoryMappingDto {
    storeId: string;
    collectionGid: string;
    collectionTitle: string;
}

export interface AdminShopCategoryDto {
    id: string;
    name: LocalizedText;
    slug: string;
    sortOrder: number;
    isVisible: boolean;
    collections: AdminShopCategoryMappingDto[];
}

export interface AdminShopCategoryCreateDto {
    name: LocalizedText;
    slug: string;
    sortOrder?: number;
    isVisible?: boolean;
}

export type AdminShopCategoryPatchDto = Partial<Omit<AdminShopCategoryCreateDto, 'slug'>>;

export interface AdminShopCategoryCollectionsDto {
    collections: AdminShopCategoryMappingDto[];
}
```

Check `LocalizedText` is `{ en: string; el: string }` (or a compatible record) before using it here; it's already used by `AdminLandingCategoryDto`.

- [ ] **Step 4: Add endpoints** (`lib/api/endpoints.ts`: a top-level `shop` group, and `shop` inside `admin` next to `landingCategories`)

```ts
    shop: {
        categories: '/api/shop/categories',
        products: ({ category, page }: { category?: string; page: number }) => {
            const params = new URLSearchParams();
            if (category) params.set('category', category);
            params.set('page', String(page));
            return `/api/shop/products?${params.toString()}`;
        },
        product: (storeSlug: string, handle: string) => `/api/shop/products/${encodeURIComponent(storeSlug)}/${encodeURIComponent(handle)}`,
    },
```

```ts
        shop: {
            stores: '/api/admin/shop/stores',
            store: (id: string) => `/api/admin/shop/stores/${id}`,
            storeSync: (id: string) => `/api/admin/shop/stores/${id}/sync`,
            storeCollections: (id: string) => `/api/admin/shop/stores/${id}/collections`,
            categories: '/api/admin/shop/categories',
            category: (id: string) => `/api/admin/shop/categories/${id}`,
            categoryCollections: (id: string) => `/api/admin/shop/categories/${id}/collections`,
        },
```

Greek handles contain non-ASCII characters (`ιστοσελίδα-γάμου-1`); `encodeURIComponent` keeps them valid in the path. Update the test's expectation if the handle in the test is changed to a Greek one.

- [ ] **Step 5: Map the three error codes** in `lib/api/errorMessageKeys.ts` the same way neighbouring codes are mapped, with keys `errors.shopStoreDomainTaken`, `errors.shopSlugTaken`, `errors.shopCredentialsInvalid`, and add the copy (Step 6).

- [ ] **Step 6: Messages.** Add to `messages/en.json` / `messages/el.json` (find the existing `errors` namespace the other codes use and put the three error keys there):

```json
"shopStoreDomainTaken": "This store is already connected.",
"shopSlugTaken": "This short name is already used.",
"shopCredentialsInvalid": "Shopify didn't accept the client ID or secret."
```

```json
"shopStoreDomainTaken": "Αυτό το κατάστημα είναι ήδη συνδεδεμένο.",
"shopSlugTaken": "Αυτό το σύντομο όνομα χρησιμοποιείται ήδη.",
"shopCredentialsInvalid": "Το Shopify δεν δέχτηκε το client ID ή το secret."
```

- [ ] **Step 7: Run test + `npx tsc --noEmit`, expect PASS. Commit**

```bash
git add lib/api messages
git commit -m "feat(shop): API types and paths for the Shopify shop"
```

### Task B2: Admin hooks

**Files:**
- Create: `hooks/useAdminShopStores.ts`, `hooks/useAdminShopCategories.ts`
- Test: `hooks/useAdminShopStores.test.tsx`, `hooks/useAdminShopCategories.test.tsx` (copy the harness from `hooks/useAdminLandingCategories.test.tsx`)

- [ ] **Step 1: Write the failing test** (stores; categories mirror it)

```tsx
it('creates a store and refetches the list', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(storeFixture);
    const get = vi.spyOn(api, 'get').mockResolvedValue([storeFixture]);
    const { result } = renderHook(() => ({ list: useAdminShopStores(), create: useCreateShopStore() }), { wrapper });

    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    await act(() => result.current.create.mutateAsync(createInput));

    expect(post).toHaveBeenCalledWith('/api/admin/shop/stores', createInput);
    expect(get).toHaveBeenCalledTimes(2);
});

it('loads collections only for an opened store', () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    renderHook(() => useShopStoreCollections(null), { wrapper });
    expect(get).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, expect FAIL. Implement**

```ts
// hooks/useAdminShopStores.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminShopCollectionDto, AdminShopStoreCreateDto, AdminShopStoreDto, AdminShopStorePatchDto } from '@/lib/api/types';

// Admin Shopify stores (/api/admin/shop/stores). Every write refetches the list.

export const adminShopStoreKeys = {
    all: ['admin', 'shop', 'stores'] as const,
    collections: (id: string) => ['admin', 'shop', 'stores', id, 'collections'] as const,
};

export function useAdminShopStores() {
    return useQuery({
        queryKey: adminShopStoreKeys.all,
        queryFn: () => api.get<AdminShopStoreDto[]>(endpoints.admin.shop.stores),
    });
}

// Live from Shopify, so only for the store whose collections the admin is picking from.
export function useShopStoreCollections(storeId: string | null) {
    return useQuery({
        queryKey: adminShopStoreKeys.collections(storeId ?? ''),
        queryFn: () => api.get<AdminShopCollectionDto[]>(endpoints.admin.shop.storeCollections(storeId ?? '')),
        enabled: storeId !== null,
        staleTime: 60_000,
    });
}

function useRefreshShopStores() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminShopStoreKeys.all });
    }, [queryClient]);
}

export function useCreateShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: (input: AdminShopStoreCreateDto) => api.post<AdminShopStoreDto>(endpoints.admin.shop.stores, input),
        onSuccess: refresh,
    });
}

export function usePatchShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminShopStorePatchDto }) => api.patch<AdminShopStoreDto>(endpoints.admin.shop.store(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.shop.store(id)),
        onSuccess: refresh,
    });
}

export function useSyncShopStore() {
    const refresh = useRefreshShopStores();
    return useMutation({
        mutationFn: (id: string) => api.post<void>(endpoints.admin.shop.storeSync(id)),
        onSuccess: refresh,
    });
}
```

```ts
// hooks/useAdminShopCategories.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
    AdminShopCategoryCollectionsDto,
    AdminShopCategoryCreateDto,
    AdminShopCategoryDto,
    AdminShopCategoryPatchDto,
} from '@/lib/api/types';

// Admin shop categories (/api/admin/shop/categories). Every write refetches the list.

export const adminShopCategoryKeys = {
    all: ['admin', 'shop', 'categories'] as const,
};

export function useAdminShopCategories() {
    return useQuery({
        queryKey: adminShopCategoryKeys.all,
        queryFn: () => api.get<AdminShopCategoryDto[]>(endpoints.admin.shop.categories),
    });
}

function useRefreshShopCategories() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminShopCategoryKeys.all });
    }, [queryClient]);
}

export function useCreateShopCategory() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: (input: AdminShopCategoryCreateDto) => api.post<AdminShopCategoryDto>(endpoints.admin.shop.categories, input),
        onSuccess: refresh,
    });
}

export function usePatchShopCategory() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminShopCategoryPatchDto }) =>
            api.patch<AdminShopCategoryDto>(endpoints.admin.shop.category(id), input),
        onSuccess: refresh,
    });
}

export function useSetShopCategoryCollections() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminShopCategoryCollectionsDto }) =>
            api.put<AdminShopCategoryDto>(endpoints.admin.shop.categoryCollections(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteShopCategory() {
    const refresh = useRefreshShopCategories();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.shop.category(id)),
        onSuccess: refresh,
    });
}
```

- [ ] **Step 3: Run, expect PASS. Commit**

```bash
git add hooks/useAdminShopStores.ts hooks/useAdminShopStores.test.tsx hooks/useAdminShopCategories.ts hooks/useAdminShopCategories.test.tsx
git commit -m "feat(shop): admin hooks for stores and categories"
```

### Task B3: Admin "Shop" panel

Follows the admin design system in CLAUDE.md: sidebar entry under **Catalog**, real tables with compact pills, a right-side `AdminDrawer` per record, monospace for domains/slugs/counts, a `ConfirmActionModal` for delete. Load the `design:design-system` skill before writing this task's UI and copy the table/drawer markup from `components/admin/landingCategories/LandingCategoriesPanel.tsx` and `LandingCategoryDrawer.tsx`.

**Files:**
- Create: `components/admin/shop/ShopPanel.tsx`, `ShopStoresTable.tsx`, `ShopStoreDrawer.tsx`, `ShopCategoriesTable.tsx`, `ShopCategoryDrawer.tsx`, `ShopSyncPill.tsx`
- Create: `hooks/useShopStoreForm.ts`, `hooks/useShopCategoryForm.ts`
- Modify: `components/admin/AdminNavigationContext.tsx` (`AdminTab` union, `HASH_TO_TAB['#shop']`, `TAB_TO_HASH.shop`, tab item with icon `Store` from lucide-react), `components/admin/AdminShellNav.tsx` (`TAB_GROUP.shop = 'catalog'`), `components/admin/AdminConsole.tsx` (`if (tab === 'shop') return <ShopPanel />;`)
- Test: `components/admin/shop/ShopStoreDrawer.test.tsx`, `ShopCategoryDrawer.test.tsx`, `hooks/useShopStoreForm.test.tsx`, `hooks/useShopCategoryForm.test.tsx`

**Panel layout** (`ShopPanel`): two sections, each a heading + "Add" button + table.

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ShopCategoriesTable } from '@/components/admin/shop/ShopCategoriesTable';
import { ShopCategoryDrawer } from '@/components/admin/shop/ShopCategoryDrawer';
import { ShopStoreDrawer } from '@/components/admin/shop/ShopStoreDrawer';
import { ShopStoresTable } from '@/components/admin/shop/ShopStoresTable';
import { useAdminShopCategories } from '@/hooks/useAdminShopCategories';
import { useAdminShopStores } from '@/hooks/useAdminShopStores';
import type { AdminShopCategoryDto, AdminShopStoreDto } from '@/lib/api/types';

// 'new' opens an empty drawer; a record opens it for editing; null closes it.
type Open<T> = T | 'new' | null;

export function ShopPanel() {
    const t = useTranslations('AdminPage.shop');
    const stores = useAdminShopStores();
    const categories = useAdminShopCategories();
    const [store, setStore] = useState<Open<AdminShopStoreDto>>(null);
    const [category, setCategory] = useState<Open<AdminShopCategoryDto>>(null);

    return (
        <div className="flex flex-col gap-10">
            {/* Stores */}
            <ShopStoresTable title={t('stores.title')} query={stores} onAddAction={() => setStore('new')} onOpenAction={setStore} />
            {/* Categories */}
            <ShopCategoriesTable
                title={t('categories.title')}
                query={categories}
                stores={stores.data ?? []}
                onAddAction={() => setCategory('new')}
                onOpenAction={setCategory}
            />
            {/* Drawers */}
            {store && <ShopStoreDrawer store={store === 'new' ? null : store} onCloseAction={() => setStore(null)} />}
            {category && (
                <ShopCategoryDrawer category={category === 'new' ? null : category} stores={stores.data ?? []} onCloseAction={() => setCategory(null)} />
            )}
        </div>
    );
}
```

(`useState` for which drawer is open is trivial wiring; all form state lives in the two form hooks.)

**Stores table columns:** Name · Domain (mono) · Products (mono) · Status (`ShopSyncPill`: "Synced 14:02" success / "Sync failed" danger with the error in `title` / "Syncing…" neutral when `lastSyncedAt` is null) · Visible (pill: "Shown" / "Hidden"). Row click opens the drawer.

**Store drawer fields:** Name; Short name (slug, mono, create only, help: "Used in the shop link."); Shopify domain (mono, create only, placeholder `yourstore.myshopify.com`); Client ID (mono); Client secret (password input; on edit the field is empty with placeholder "Unchanged" and only sent when filled); Shown in shop (switch: one unambiguous flag, allowed by the design rules). Footer: Save; on edit also "Sync now" (calls `useSyncShopStore`, then shows "Sync started") and a Danger section "Remove store" → `ConfirmActionModal` ("Remove {name}? Its products leave the shop." / buttons "Remove store", "Keep store").

**Category drawer fields:** Name (EN), Name (EL), Short name (slug, create only), Order, Shown in shop (switch), and **Collections**: for each connected store, a heading with the store name and a searchable checkbox list of that store's collections from `useShopStoreCollections(storeId)` (loaded when that store's group is expanded; Shopify title + mono handle). Checked items become `collections` in `PUT /collections`. Save sends PATCH/POST first, then PUT collections when the selection changed. Danger section with `ConfirmActionModal` ("Delete {name}? Its products stay in Shopify." / "Delete category", "Keep category").

**Form hooks** own every value, derived flag and handler; the drawers only render. Each hook's test asserts:
- `useShopStoreForm(null)`: `canSave` false until name, slug, domain, client ID and secret are filled; the slug is lower-cased and spaces become `-`; submit calls create with `isVisible: false` by default.
- `useShopStoreForm(store)`: submit sends only changed fields; an empty secret is not sent.
- `useShopCategoryForm(null)`: both names required; submit creates, then sets collections when any are checked.
- `useShopCategoryForm(category)`: toggling a collection marks the selection dirty; save sends PUT only when dirty.

Each drawer test renders the drawer with mocked hooks and checks: required fields block Save; the secret field is a password input; delete opens the confirmation modal and only the confirm button calls delete.

- [ ] **Step 1:** Write `hooks/useShopStoreForm.test.tsx` with the cases above; run, expect FAIL; implement `useShopStoreForm`; run, expect PASS.
- [ ] **Step 2:** Same for `useShopCategoryForm`.
- [ ] **Step 3:** Write the drawer tests; run, expect FAIL; implement `ShopStoreDrawer`, `ShopCategoryDrawer`, `ShopSyncPill`, both tables, `ShopPanel`; run, expect PASS.
- [ ] **Step 4:** Wire the tab (nav context, shell nav group, console). Add a case to the existing nav test that `#shop` opens the Shop tab.
- [ ] **Step 5: Copy.** Add `AdminPage.shop` (and the nav label `AdminPage.shop` used by `AdminNavigationContext` — match the existing key style, e.g. `t('paidServices')`) to `messages/en.json` and `messages/el.json`. Keep every string short; no helper text except the one under the slug field. Greek terms: use the existing admin vocabulary in `el.json`; ask the user about any word you'd be inventing.
- [ ] **Step 6:** `npx tsc --noEmit && npm run lint && npx vitest run components/admin/shop hooks/useShopStoreForm.test.tsx hooks/useShopCategoryForm.test.tsx` → all pass.
- [ ] **Step 7: Visual check (desktop first, it's admin).** Follow memory notes: start nothing with `preview_start {name}`; use the dev server on :3000 and `preview_start {url: "http://localhost:3000/"}`, sign in with the local admin test login (ask the user for it), open `/admin#shop`, screenshot both tables and both drawers at desktop width, then check a 375 px width for overlap.
- [ ] **Step 8: Commit**

```bash
git add components/admin hooks/useShopStoreForm.ts hooks/useShopStoreForm.test.tsx hooks/useShopCategoryForm.ts hooks/useShopCategoryForm.test.tsx messages
git commit -m "feat(shop): admin Shop panel for stores and categories"
```

### Task B4: Shop helpers and locale paths

**Files:**
- Create: `lib/shop.ts`, `lib/shop.test.ts`, `lib/shopMetadata.ts`
- Modify: `i18n/publicLocale.ts`, `i18n/publicLocale.test.ts` (or create the test)

- [ ] **Step 1: Write the failing tests**

```ts
// lib/shop.test.ts
import { describe, expect, it } from 'vitest';

import { formatShopPrice, parseShopPage, shopImageUrl, shopListPath, shopProductPath } from '@/lib/shop';

describe('shop helpers', () => {
    it('builds list and product paths per locale', () => {
        expect(shopListPath('en')).toBe('/shop');
        expect(shopListPath('el', { category: 'wedding-invitations', page: 2 })).toBe('/el/shop?category=wedding-invitations&page=2');
        expect(shopListPath('en', { page: 0 })).toBe('/shop');
        expect(shopProductPath('el', 'inviart', 'ιστοσελίδα-γάμου-1')).toBe('/el/shop/inviart/%CE%B9%CF%83%CF%84%CE%BF%CF%83%CE%B5%CE%BB%CE%AF%CE%B4%CE%B1-%CE%B3%CE%AC%CE%BC%CE%BF%CF%85-1');
    });

    it('formats a single price and a range', () => {
        expect(formatShopPrice('el', 5800, 5800, 'EUR')).toBe('58,00 €');
        expect(formatShopPrice('en', 5800, 6450, 'EUR')).toBe('€58.00 – €64.50');
    });

    it('asks Shopify’s CDN for a resized image', () => {
        expect(shopImageUrl('https://cdn.shopify.com/s/files/1/a.jpg', 480)).toBe('https://cdn.shopify.com/s/files/1/a.jpg?width=480');
        expect(shopImageUrl('https://cdn.shopify.com/s/files/1/a.jpg?v=2', 480)).toBe('https://cdn.shopify.com/s/files/1/a.jpg?v=2&width=480');
    });

    it('parses the page param defensively', () => {
        expect(parseShopPage(undefined)).toBe(0);
        expect(parseShopPage('3')).toBe(3);
        expect(parseShopPage('-1')).toBe(0);
        expect(parseShopPage('abc')).toBe(0);
    });
});
```

```ts
// i18n/publicLocale.test.ts (add)
it('reads the shop pages’ language from the URL', () => {
    expect(publicPageLocale('/shop')).toBe('en');
    expect(publicPageLocale('/el/shop')).toBe('el');
    expect(publicPageLocale('/el/shop/inviart/passport')).toBe('el');
    expect(publicPageLocale('/shop/inviart/passport')).toBe('en');
    expect(publicTwinPath('/shop', 'el')).toBe('/el/shop');
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
// lib/shop.ts
import type { Locale } from '@/i18n/config';
import { SHOP_PATHS } from '@/i18n/publicLocale';

// The public shop (plan 2026-10-27-shopify-shop): paths, prices, images.

export function shopListPath(locale: Locale, { category, page }: { category?: string; page?: number } = {}): string {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (page && page > 0) params.set('page', String(page));
    const query = params.toString();
    return query ? `${SHOP_PATHS[locale]}?${query}` : SHOP_PATHS[locale];
}

export function shopProductPath(locale: Locale, storeSlug: string, handle: string): string {
    return `${SHOP_PATHS[locale]}/${encodeURIComponent(storeSlug)}/${encodeURIComponent(handle)}`;
}

export function formatShopPrice(locale: Locale, minCents: number, maxCents: number, currency: string): string {
    const format = new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency });
    const min = format.format(minCents / 100);
    return minCents === maxCents ? min : `${min} – ${format.format(maxCents / 100)}`;
}

// Shopify's CDN resizes on request, so the shop needs no entry in next.config images.
export function shopImageUrl(url: string, width: number): string {
    return `${url}${url.includes('?') ? '&' : '?'}width=${width}`;
}

export function parseShopPage(value: string | string[] | undefined): number {
    const page = Number(Array.isArray(value) ? value[0] : value);
    return Number.isInteger(page) && page > 0 ? page : 0;
}
```

`Intl` output varies slightly across Node ICU builds (the space before `€` in Greek may be a no-break space). If the price test fails only on whitespace, compare with `.replace(/\s/g, ' ')` on both sides.

In `i18n/publicLocale.ts`:

```ts
// The shop, one URL per language. Product pages live under it: /shop/{store}/{handle}.
export const SHOP_PATHS: Record<Locale, string> = {
    en: '/shop',
    el: '/el/shop',
};

export function isShopPath(pathname: string | null): boolean {
    return locales.some((locale) => pathname === SHOP_PATHS[locale]);
}

function shopPageLocale(pathname: string): Locale | null {
    return locales.find((locale) => pathname === SHOP_PATHS[locale] || pathname.startsWith(`${SHOP_PATHS[locale]}/`)) ?? null;
}
```

Change `publicPageLocale` to return `… ?? shopPageLocale(pathname)` after its existing `find`, and add `if (isShopPath(pathname)) return SHOP_PATHS[target];` to `publicTwinPath`. Check `/el/shop` can't also match an English path: `/shop` doesn't start with `/el/shop/`, and `/el/shop` doesn't start with `/shop/`, so each path maps to one locale.

```ts
// lib/shopMetadata.ts
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { NO_INDEX } from '@/lib/seo';

// Noindex on purpose: product text is copied from the sellers' own stores, and indexing it here
// would compete with them (decision 2026-10-27). Not in the sitemap either.
export async function getShopMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    return { title: t('metaTitle'), robots: NO_INDEX };
}

export async function getShopProductMetadata(locale: Locale, productTitle: string): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    return { title: t('productMetaTitle', { title: productTitle }), robots: NO_INDEX };
}
```

- [ ] **Step 4: Run, expect PASS. Commit**

```bash
git add lib/shop.ts lib/shop.test.ts lib/shopMetadata.ts i18n/publicLocale.ts i18n/publicLocale.test.ts
git commit -m "feat(shop): shop paths, prices and per-URL language"
```

### Task B5: Public shop pages

All four routes are **server components** that read public Spring endpoints with `serverPublicGet` and render HTML; no client fetching, no React Query (the `(landing)` layout has no query client and the data needs no session). Category tabs and pagination are plain `<Link>`s that change `?category`/`?page`. Every route 404s when `showsUnreleasedPages()` is false. Mobile first: one-column cards on phones, 2 at `sm`, 3 at `lg`, 4 at `xl`.

**Files:**
- Create: `components/shop/ShopPage.tsx`, `ShopCategoryTabs.tsx`, `ShopProductGrid.tsx`, `ShopProductCard.tsx`, `ShopPagination.tsx`, `ShopProductPage.tsx`, `renderShop.tsx`
- Create: `app/(landing)/shop/page.tsx`, `app/(landing)/shop/[store]/[handle]/page.tsx`, `app/(landing)/[slug]/shop/page.tsx`, `app/(landing)/[slug]/shop/[store]/[handle]/page.tsx`
- Modify: `lib/security/securityHeaders.mjs` (`img-src`), `messages/en.json`, `messages/el.json` (`Shop.*`)
- Test: `components/shop/ShopProductCard.test.tsx`, `components/shop/ShopPagination.test.tsx`, `app/(landing)/shop/page.test.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/shop/ShopProductCard.test.tsx
it('links to the storywall product page and shows price and kind', async () => {
    render(await ShopProductCard({ locale: 'en', product: cardFixture }));
    expect(screen.getByRole('link')).toHaveAttribute('href', '/shop/inviart/passport');
    expect(screen.getByText('€58.00')).toBeInTheDocument();
    expect(screen.getByText('Digital')).toBeInTheDocument();
});

it('renders without an image', async () => {
    render(await ShopProductCard({ locale: 'en', product: { ...cardFixture, imageUrl: null } }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
```

```tsx
// components/shop/ShopPagination.test.tsx
it('keeps the category in page links and hides itself for one page', async () => {
    const { container, rerender } = render(await ShopPagination({ locale: 'el', category: 'weddings', page: 1, totalPages: 3 }));
    expect(screen.getByRole('link', { name: /Προηγούμενη/ })).toHaveAttribute('href', '/el/shop?category=weddings');
    expect(screen.getByRole('link', { name: /Επόμενη/ })).toHaveAttribute('href', '/el/shop?category=weddings&page=2');
    rerender(await ShopPagination({ locale: 'el', page: 0, totalPages: 1 }));
    expect(container).toBeEmptyDOMElement();
});
```

```ts
// app/(landing)/shop/page.test.ts
it('is noindex and 404s when unreleased pages are hidden', async () => {
    vi.mocked(showsUnreleasedPages).mockReturnValue(false);
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    vi.mocked(showsUnreleasedPages).mockReturnValue(true);
    expect((await generateMetadata()).robots).toEqual({ index: false, follow: true });
});
```

Check how `app/(landing)/[slug]/[occasion]/page.test.ts` mocks `next-intl/server` and `notFound`, and copy that setup.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement the components**

```tsx
// components/shop/ShopPage.tsx
import { getTranslations } from 'next-intl/server';

import { ShopCategoryTabs } from '@/components/shop/ShopCategoryTabs';
import { ShopPagination } from '@/components/shop/ShopPagination';
import { ShopProductGrid } from '@/components/shop/ShopProductGrid';
import type { Locale } from '@/i18n/config';
import type { ShopCategoryDto, ShopProductPageDto } from '@/lib/api/types';

export async function ShopPage({
    locale,
    categories,
    category,
    products,
}: {
    locale: Locale;
    categories: ShopCategoryDto[];
    category?: string;
    products: ShopProductPageDto;
}) {
    const t = await getTranslations({ locale, namespace: 'Shop' });

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
            {/* Header */}
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{t('title')}</h1>
            {/* Categories */}
            <ShopCategoryTabs locale={locale} categories={categories} active={category} />
            {/* Products */}
            {products.items.length === 0 ? (
                <p className="py-16 text-center text-ink-muted">{t('empty')}</p>
            ) : (
                <ShopProductGrid locale={locale} products={products.items} />
            )}
            {/* Pagination */}
            <ShopPagination locale={locale} category={category} page={products.page} totalPages={products.totalPages} />
        </main>
    );
}
```

```tsx
// components/shop/ShopCategoryTabs.tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { ShopCategoryDto } from '@/lib/api/types';
import { shopListPath } from '@/lib/shop';
import { cn } from '@/lib/utils';

// Horizontal scroll on phones instead of wrapping into several rows.
export async function ShopCategoryTabs({ locale, categories, active }: { locale: Locale; categories: ShopCategoryDto[]; active?: string }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const tabs = [{ slug: undefined, label: t('all') }, ...categories.map((c) => ({ slug: c.slug, label: c.name[locale] }))];

    return (
        <nav aria-label={t('categoriesLabel')} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 whitespace-nowrap">
                {tabs.map((tab) => (
                    <li key={tab.slug ?? 'all'}>
                        <Link
                            href={shopListPath(locale, { category: tab.slug })}
                            aria-current={tab.slug === active ? 'page' : undefined}
                            className={cn(
                                'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold',
                                tab.slug === active ? 'bg-ink text-white' : 'bg-surface-muted text-ink hover:bg-surface-strong',
                            )}
                        >
                            {tab.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
```

```tsx
// components/shop/ShopProductGrid.tsx
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import type { Locale } from '@/i18n/config';
import type { ShopProductCardDto } from '@/lib/api/types';

export function ShopProductGrid({ locale, products }: { locale: Locale; products: ShopProductCardDto[] }) {
    return (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
                <li key={`${product.storeSlug}/${product.handle}`}>
                    <ShopProductCard locale={locale} product={product} />
                </li>
            ))}
        </ul>
    );
}
```

```tsx
// components/shop/ShopProductCard.tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { ShopProductCardDto } from '@/lib/api/types';
import { formatShopPrice, shopImageUrl, shopProductPath } from '@/lib/shop';

export async function ShopProductCard({ locale, product }: { locale: Locale; product: ShopProductCardDto }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });

    return (
        <Link href={shopProductPath(locale, product.storeSlug, product.handle)} className="group flex flex-col gap-3">
            {/* Image */}
            <div className="aspect-square overflow-hidden rounded-2xl bg-surface-muted">
                {product.imageUrl && (
                    // Plain img: Shopify's CDN resizes, so the Next optimizer (billed per image) stays out of it.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={shopImageUrl(product.imageUrl, 600)}
                        alt={product.imageAlt ?? product.title}
                        width={600}
                        height={600}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                )}
            </div>
            {/* Details */}
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-ink-muted">{product.isDigital ? t('digital') : t('printed')}</p>
                <h2 className="line-clamp-2 font-semibold text-ink">{product.title}</h2>
                <p className="text-ink">{formatShopPrice(locale, product.minPriceCents, product.maxPriceCents, product.currency)}</p>
            </div>
        </Link>
    );
}
```

```tsx
// components/shop/ShopPagination.tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { shopListPath } from '@/lib/shop';

export async function ShopPagination({ locale, category, page, totalPages }: { locale: Locale; category?: string; page: number; totalPages: number }) {
    if (totalPages <= 1) return null;
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const linkClass = 'inline-flex min-h-11 items-center rounded-full px-5 font-semibold text-ink bg-surface-muted hover:bg-surface-strong';

    return (
        <nav aria-label={t('pagesLabel')} className="flex items-center justify-between gap-4 pt-4">
            {page > 0 ? <Link href={shopListPath(locale, { category, page: page - 1 })} className={linkClass}>{t('previous')}</Link> : <span />}
            <p className="text-sm text-ink-muted">{t('pageOf', { page: page + 1, total: totalPages })}</p>
            {page + 1 < totalPages ? <Link href={shopListPath(locale, { category, page: page + 1 })} className={linkClass}>{t('next')}</Link> : <span />}
        </nav>
    );
}
```

```tsx
// components/shop/ShopProductPage.tsx
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { ShopProductDto } from '@/lib/api/types';
import { formatShopPrice, shopImageUrl, shopListPath } from '@/lib/shop';

// The buy button leaves storywall: Shopify handles cart, payment and shipping.
export async function ShopProductPage({ locale, product }: { locale: Locale; product: ShopProductDto }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const variants = product.variants.filter((v) => v.title !== 'Default Title');

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
            {/* Back */}
            <Link href={shopListPath(locale)} className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('back')}
            </Link>
            <div className="grid gap-8 lg:grid-cols-2">
                {/* Images: swipe on phones, stacked on desktop */}
                <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:overflow-visible lg:px-0">
                    {product.images.map((image) => (
                        <li key={image.url} className="w-[85%] shrink-0 snap-center lg:w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={shopImageUrl(image.url, 1000)}
                                alt={image.alt ?? product.title}
                                width={1000}
                                height={1000}
                                className="aspect-square w-full rounded-2xl bg-surface-muted object-cover"
                            />
                        </li>
                    ))}
                </ul>
                {/* Details */}
                <div className="flex flex-col gap-4">
                    <p className="text-sm font-semibold text-ink-muted">{product.isDigital ? t('digital') : t('printed')}</p>
                    <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{product.title}</h1>
                    <p className="text-xl text-ink">{formatShopPrice(locale, product.minPriceCents, product.maxPriceCents, product.currency)}</p>
                    {variants.length > 0 && (
                        <ul className="flex flex-col gap-1 text-ink">
                            {variants.map((variant) => (
                                <li key={variant.title} className="flex justify-between gap-4">
                                    <span>{variant.title}</span>
                                    <span>{formatShopPrice(locale, variant.priceCents, variant.priceCents, product.currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {/* Buy */}
                    <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-white"
                    >
                        {t('buyAt', { store: product.storeName })}
                        <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                    {/* Description */}
                    {product.description && <p className="whitespace-pre-line text-ink">{product.description}</p>}
                </div>
            </div>
        </main>
    );
}
```

Use the class names the landing components already use for colors (`text-ink`, `bg-primary`, etc.); grep `components/forBusiness` for the actual token names and replace any above that don't exist (`bg-surface-muted`, `bg-surface-strong`, `text-ink-muted` are guesses to confirm).

- [ ] **Step 4: Implement the routes**

```tsx
// components/shop/renderShop.tsx — shared by /shop and /el/shop
import { notFound } from 'next/navigation';

import { ShopPage } from '@/components/shop/ShopPage';
import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { ShopCategoryDto, ShopProductPageDto } from '@/lib/api/types';

export async function renderShop(locale: Locale, category: string | undefined, page: number) {
    let categories: ShopCategoryDto[];
    let products: ShopProductPageDto;
    try {
        [categories, products] = await Promise.all([
            serverPublicGet<ShopCategoryDto[]>(endpoints.shop.categories),
            serverPublicGet<ShopProductPageDto>(endpoints.shop.products({ category, page })),
        ]);
    } catch {
        // An unknown category (404 from Spring) or Spring being down: show the 404 page rather than a broken one.
        notFound();
    }
    return <ShopPage locale={locale} categories={categories} category={category} products={products} />;
}
```

```tsx
// app/(landing)/shop/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { renderShop } from '@/components/shop/renderShop';
import { parseShopPage } from '@/lib/shop';
import { getShopMetadata } from '@/lib/shopMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

type PageProps = { searchParams: Promise<{ category?: string; page?: string }> };

// Noindex; the proxy reads the language from the URL (publicPageLocale).
export async function generateMetadata(): Promise<Metadata> {
    if (!showsUnreleasedPages()) return {};
    return getShopMetadata('en');
}

export default async function Page({ searchParams }: PageProps) {
    if (!showsUnreleasedPages()) notFound();
    const { category, page } = await searchParams;
    return renderShop('en', category, parseShopPage(page));
}
```

```tsx
// app/(landing)/[slug]/shop/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { renderShop } from '@/components/shop/renderShop';
import { parseShopPage } from '@/lib/shop';
import { getShopMetadata } from '@/lib/shopMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ category?: string; page?: string }> };

// Only /el/shop; the English shop is /shop. [slug] because this level also serves English occasion pages.
export function generateStaticParams() {
    return [{ slug: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (slug !== 'el' || !showsUnreleasedPages()) return {};
    return getShopMetadata('el');
}

export default async function Page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    if (slug !== 'el' || !showsUnreleasedPages()) notFound();
    const { category, page } = await searchParams;
    return renderShop('el', category, parseShopPage(page));
}
```

```tsx
// app/(landing)/shop/[store]/[handle]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShopProductPage } from '@/components/shop/ShopProductPage';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { ShopProductDto } from '@/lib/api/types';
import { getShopProductMetadata } from '@/lib/shopMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

type PageProps = { params: Promise<{ store: string; handle: string }> };

async function load(store: string, handle: string): Promise<ShopProductDto | null> {
    try {
        return await serverPublicGet<ShopProductDto>(endpoints.shop.product(decodeURIComponent(store), decodeURIComponent(handle)));
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    if (!showsUnreleasedPages()) return {};
    const { store, handle } = await params;
    const product = await load(store, handle);
    return product ? getShopProductMetadata('en', product.title) : {};
}

export default async function Page({ params }: PageProps) {
    if (!showsUnreleasedPages()) notFound();
    const { store, handle } = await params;
    const product = await load(store, handle);
    if (!product) notFound();
    return <ShopProductPage locale="en" product={product} />;
}
```

`generateMetadata` and the page both call `load`; Next dedupes the identical `fetch` within one render. `serverPublicGet` uses `cache: 'no-store'`, which disables that dedupe, so wrap `load` in React's `cache()` (`import { cache } from 'react'; const load = cache(async (...) => ...)`) to keep it to one request.

`app/(landing)/[slug]/shop/[store]/[handle]/page.tsx` is the same with `params: { slug, store, handle }`, `generateStaticParams` omitted (dynamic), `slug !== 'el'` → `notFound()`, and `locale="el"`.

- [ ] **Step 5: CSP.** In `lib/security/securityHeaders.mjs`, add `'https://cdn.shopify.com'` to `img-src` with a comment: `// Shop product images (plan 2026-10-27-shopify-shop).` Update `lib/security/securityHeaders.test.ts` if it snapshots the directive.

- [ ] **Step 6: Copy** (`Shop` namespace)

```json
"Shop": {
    "metaTitle": "Shop | Storywall",
    "productMetaTitle": "{title} | Storywall shop",
    "title": "Shop",
    "all": "All",
    "categoriesLabel": "Categories",
    "empty": "No products here yet.",
    "digital": "Digital",
    "printed": "Printed",
    "pagesLabel": "Pages",
    "previous": "Previous",
    "next": "Next",
    "pageOf": "Page {page} of {total}",
    "back": "Shop",
    "buyAt": "Buy at {store}"
}
```

```json
"Shop": {
    "metaTitle": "Κατάστημα | Storywall",
    "productMetaTitle": "{title} | Κατάστημα Storywall",
    "title": "Κατάστημα",
    "all": "Όλα",
    "categoriesLabel": "Κατηγορίες",
    "empty": "Δεν υπάρχουν προϊόντα ακόμα.",
    "digital": "Ψηφιακό",
    "printed": "Έντυπο",
    "pagesLabel": "Σελίδες",
    "previous": "Προηγούμενη",
    "next": "Επόμενη",
    "pageOf": "Σελίδα {page} από {total}",
    "back": "Κατάστημα",
    "buyAt": "Αγορά στο {store}"
}
```

Run the copy past the `design:ux-copy` skill and confirm the Greek with the user before merging.

- [ ] **Step 7:** `npx vitest run components/shop "app/(landing)/shop" lib/shop.test.ts i18n && npx tsc --noEmit && npm run lint` → all pass. `i18n/publicMessages.test.ts` must still pass: the shop is server-rendered, so `Shop` is not a client namespace.

- [ ] **Step 8: Visual check (mobile first, it's public).** With the staging API (or local Spring with a connected store): open `http://localhost:3000/el/shop` at 375 px, then `/shop` at desktop width. Check: category chips scroll sideways, cards are one column, the buy button is thumb-reachable on the product page, Greek handles open the right product. `curl -s http://localhost:3000/shop | grep -i 'noindex'` shows the robots meta.

- [ ] **Step 9: Commit**

```bash
git add components/shop "app/(landing)/shop" "app/(landing)/[slug]/shop" lib/security messages
git commit -m "feat(shop): public shop and product pages"
```

### Task B6: SEO check and PR

- [ ] **Step 1:** Check against `docs/seo-guidelines.md`. The shop is **Utility** kind (noindex), which needs: `robots: NO_INDEX` on every page ✔ (Task B4/B5), not in the sitemap ✔ (`app/sitemap.ts` untouched). The guidelines list utility pages as "forms, email-link landings, demo"; a public shop isn't on that list, which makes it "a route whose kind is unclear" → **BLOCKER until the owner signs off in the PR**. Put that line in the PR description so the user can sign off.
- [ ] **Step 2:** Search for anything that links to `/shop` (none yet; adding a link from the landing page is out of scope and needs its own decision).
- [ ] **Step 3:** Open the PR into `staging`, linking the backend PR and listing: the `SHOP_WEBHOOK_BASE_URL` Railway variable, the CSP change, and the SEO sign-off line.

---

## Out of scope (not in this plan)

- Links to the shop from the landing page, app menus or event screens.
- Search on `/shop`.
- `collections/update` webhooks (membership changes wait for the nightly sync or "Sync now").
- Sellers connecting their own store without an admin (OAuth install).
- Any checkout, cart or order handling in storywall.
