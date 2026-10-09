# Module names per event type — BE request + FE plan

Status: proposal, 2026-10-09. Nothing built yet.

## Goal

Admins can give a module a different name and description for an event type, in English and
Greek. Example: `wishbook` stays "Wishbook" for weddings and baptisms but is "Memory capsule" for
reunions. Applies to any module.

## Decisions

| Topic | Decision |
|---|---|
| Level | Per event type only. No per-event override. |
| Languages | English and Greek, both required when an override is set. |
| Fields | `name`, `description` and `cardLabel` (the module's line on plan cards). Nothing else is admin-editable. |
| Sentences | Rewrite FE copy so sentences never name a module ("This isn't available on this event's plan." instead of "Wishbook is not available…"). The name appears only as a standalone label. No Greek gender/case handling needed. |
| Item words | Replace module-specific item words with neutral ones that fit every event type ("message" instead of "wish": "Add message", "No messages yet"). Not admin-editable. |
| Description reach | One description override used everywhere the module is described for that event type: tool card, page subtitle, tools menu, plan/pricing/checkout/upgrade module lists. |
| Surfaces | Host and guest event screens, plus pricing, checkout and plan upgrade for that event type. The admin console keeps platform names. Landing copy not tied to one event type keeps platform names. |
| Voice pack | `toolsScheduleDescription` and `toolsPlaylistDescription` move into this override and are removed from the voice pack. |
| Rewrite set | Sentence rewrite covers the content modules only: wishbook, gallery, playlist, schedule. Co-hosts, theme, stories, RSVP, posts and member roles keep their words in sentences (they describe mechanics). Their standalone labels still go through the override. |
| Short labels | Name + verb labels become neutral ("Download all", "Add song", "Upload QR code"), not `{name}` placeholders. |
| Entry word | Wishbook entries are "message" / "μήνυμα". |
| Plan cards | A plan card line is `cardLabel`, else the module name. A plan detail follows the label after a middle dot: "Gallery · QR upload", "Schedule · up to 5 sessions". The label never sits inside a sentence. Co-hosts keep their own line ("Up to 3 co-hosts"). |

## Backend request

### 1. Storage

Add three nullable columns to the event type ↔ module row (the row behind
`EventTypeModuleResponseDto`):

- `name` — `LocalizedText | null` (`{ en, el }`)
- `description` — `LocalizedText | null` (`{ en, el }`)
- `cardLabel` — `LocalizedText | null` (`{ en, el }`): the module's line on plan cards for this event type

`null` means "use the default" (for `cardLabel`: the resolved name). The three fields are
independent: overriding only one is allowed.

Seed: for each event type, copy its current voice-pack `toolsScheduleDescription` and
`toolsPlaylistDescription` into the `description` of its `schedule` and `playlist` rows (only
where the copy differs from the default — the FE can supply the defaults if useful).

### 2. Admin write — extend the existing PATCH

`PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey}`

```ts
export interface EventTypeModulePatchDto {
    applicability?: EventTypeModuleApplicability;
    defaultConfig?: Record<string, unknown>;
    sortOrder?: number;
    name?: LocalizedText | null; // null clears the override
    description?: LocalizedText | null; // null clears the override
    cardLabel?: LocalizedText | null; // null clears the override
}
```

Validation (400 with a field error code the FE can map):

- When set, both `en` and `el` must be present and non-blank after trimming.
- `name` and `cardLabel`: max 40 characters per locale. `description`: max 160 per locale. (Open to BE's limits.)
- Allowed only when `applicability` is `DEFAULT_ON`. An override on an `UNSUPPORTED` row is
  rejected — or kept but ignored; BE's call, please say which.

`EventTypeModuleResponseDto` returns `name`, `description` and `cardLabel` (nullable) so the admin UI can show
and edit them.

### 3. Public read — `GET /api/config`

Add the overrides next to the voice pack, only for modules that have one:

```ts
export interface AppEventTypeTranslationDto {
    name: LocalizedText;
    tagline: LocalizedText;
    voice: EventTypeVoicePack; // minus toolsScheduleDescription / toolsPlaylistDescription
    modules: Record<ModuleKey, { name: LocalizedText | null; description: LocalizedText | null; cardLabel: LocalizedText | null }>;
}
```

`modules` is always present (empty object when nothing is overridden). Saving an override must
bust the config cache the same way event-type edits do today.

### 4. Voice pack

Drop `toolsScheduleDescription` and `toolsPlaylistDescription` from `EventTypeVoicePack` once the
seed in §1 has run. (The FE doesn't render them today, so there's no FE break.)

## FE plan

### 1. One resolver

`hooks/useModuleCopy.ts` — `useModuleCopy(eventTypeKey)` returns
`(moduleKey) => { name, description, cardLabel }`:

1. Event-type override from `appConfig.translations.eventTypes[key].modules[moduleKey]`,
   localized with `useLocalizedText`.
2. Otherwise the existing `Modules.<key>.name` / `.description` translation.
3. Otherwise the platform module's `name` / `description` (today's `getModuleMeta` fallback).

`cardLabel` falls back to the resolved `name`.

Pure lookup logic goes in `lib/planModules.ts` so it can be unit-tested. `useLocalizedModuleLabel`
stays as is for the admin console, which keeps platform names.

### 2. Collapse duplicate copy

Module names and descriptions are repeated across namespaces today (`ToolsPage.items.*`,
`ToolsMenu.items.*`, `FeedQuickAccessBar`, `MobileTabBar`, `RightContextPanel`, each page's
`title`/`subtitle`, `Modules.*`). Point all event-scoped labels and descriptions at
`useModuleCopy` and delete the duplicate keys from `en.json` and `el.json`. `Modules.<key>` becomes
the single default.

Note: the tool card and page subtitle descriptions are guest-facing ("Leave a message for the
hosts") while `Modules.*.description` is written for hosts buying a plan ("Guests can leave
written wishes…"). With one description everywhere, the default text has to work for both
audiences. Defaults need a rewrite pass (UX copy skill) before this ships.

### 3. Rewrite sentences and item words

Remove module names from sentences and swap item words for neutral ones, in `en` and `el`.
Mentions found in `en.json`, by module:

| Module | Strings | Namespaces |
|---|---|---|
| gallery | 47 | GalleryPage, GalleryQrPage, QrCodePage, ManagePage, NotificationsPage, ProfilePage, EventPlanSettingsPage, CheckoutReviewPage, ApiErrors, LandingPage, qrLink, … |
| schedule | 39 | SchedulePage, FeedScheduleCard, FeedPage, StoryPage, CreateEventPage, HostOnboarding, ApiErrors, LandingPage, … |
| rsvp | 35 | RSVPPage, ManagePage, SchedulePage, HostOnboarding, RootLayout, DemoActAs, ApiErrors, LandingPage, … |
| co_hosts | 28 | ManagePage, ProfilePage, PlanUsage, ApiErrors, LandingPage |
| theme | 28 | ManagePage, CreateEventPage, ApiErrors |
| stories | 20 | StoriesRow, StoryComposer, PublishQueue, ApiErrors, LandingPage |
| playlist | 18 | PlaylistPage, PostCard, MobileTabBar, … |
| wishbook | 12 | WishbookPage, ToolsPage, ToolsMenu, RightContextPanel, FeedQuickAccessBar |
| wishlist | 2 | ModerationStatement |

Counts include `AdminPage` and `LandingPage` hits, which stay as is. Item words ("wish",
"song", "story", "photo") still need a separate pass — they don't contain the module name.
`posts` and `member_roles` weren't counted (generic words); they get the same pass.

Sentences that are clearer with the name ("Wishbook is not available") get a neutral form
("This isn't available on this event's plan."), or the name moves out of the sentence into a
heading rendered with `useModuleCopy`.

### 4. Pricing, checkout, upgrade

`usePlanMarketingCopy`, `useLandingPricingPlans`, `useMarketingPlanOptions`,
`PlanUpgradeModules`, checkout review: build module names/descriptions with `useModuleCopy`
for the plan's event type.

Plan card lines (`moduleFeatureLabel` in `lib/landingPricing.ts`) use `cardLabel`. The built
lines become label + detail: `LandingPage.pricing.galleryWithQrUpload` turns into a detail-only
string ("QR upload") and `scheduleSessions*` into "up to # sessions" / "unlimited sessions",
joined to the label with " · ". `coHosts` stays a full line.

### 5. Admin UI

In `EventTypeEditDrawer`, add a **Module names** section: compact read-only rows, one per
supported module, showing the platform name and the override if set (or "Default"). Clicking a
row opens a focused editor (nested drawer panel) with English/Greek fields for name and
description and plan card label (with a live preview of the card line), a reset-to-default
action, and save. Follows the admin console design system.
Saving invalidates `adminKeys` and `invalidatePublicConfig`.

### 6. Server rendering / SEO

Event pages read the name from app config, which is already loaded for event-type copy. Check
any page `<title>`/metadata that uses a module name (e.g. the wishbook page title) against
`docs/seo-guidelines.md` and make it use the resolved name.

### 7. Tests

- `lib/planModules` resolver: override → translation → platform fallback, per locale.
- `useModuleCopy` with a mocked app config.
- Update report/snapshot tests whose copy changes (wishbook, gallery, RSVP pages).

## Rollout order

1. FE: sentence and item-word rewrite (§3). Ships alone, no BE needed. Collapsing the duplicate
   label keys (§2) waits for step 3: the Greek labels differ per screen on purpose today
   (e.g. "Τραγούδια" in the tab bar vs "Λίστα Τραγουδιών" elsewhere), so picking one name per
   module belongs with wiring `useModuleCopy`.
2. BE: storage, PATCH, config field, seed (§1–§3 of the BE request).
3. FE: `useModuleCopy` wired everywhere (§1, §4) + admin section (§5).
4. BE: remove the two voice-pack keys.
