# Wedding landing redesign — design

2026-10-24. Source: the owner's design file `storywall-gamos-2.html` (Greek, single self-contained HTML). Rules: [docs/seo-guidelines.md](../../seo-guidelines.md). Builds on [2026-10-12-occasion-pages-design.md](2026-10-12-occasion-pages-design.md).

## Goal

Rebuild `/el/gamos` and `/weddings` to match the design file section by section. Every picture in the file that has words in it (the hero phone feed, the RSVP comparison, the demo phones) is rebuilt as HTML, so both languages get their own copy. Tailwind for styling, Framer Motion for animation, no new plain CSS.

## Decisions

| Topic | Decision |
| --- | --- |
| Scope | Wedding only. Baptism keeps `OccasionContent`. The main landing keeps its own hero. New sections are built so baptism can switch over later. |
| Composites | Built in HTML: hero phone feed, hero post and comment cards, RSVP notifications and phones, demo phones. Emoji, heart, note and flash stickers stay images (no text). |
| Photos in composites | Newly generated with Figma AI (`gemini-3.1-flash-image`) into a new scratch file, "StoryWall wedding photos". Two test photos first; the full batch only after the owner approves the look. |
| Standalone photos | Reused from the design file: 14 marquee photos and their avatars, 3 "Without" photos, the final CTA photo. |
| QR photo | Regenerated with no readable words on the sign or the phone, one photo for both languages. |
| Plans | Live plans from `/api/config` through the existing `LandingPricing` / `MarketingPlanCard`. The design's card already matches it; only the section header changes. |
| Prices in copy | "Από 119€" (hero) and the FAQ price answer read the lowest and highest live wedding plan prices from the server config. Without config: the hero price chip is left out and the FAQ uses a sentence without prices. |
| Kept extras | Campaign banner (top), language switcher (header and mobile menu), reviews (between Features and Plans), other-occasions links (above the footer). |
| Demo phones | Static HTML mock of the design's two phones, not the live demo snapshot. |
| English | Claude translates; the owner reviews in the PR. Adapted for readers worldwide: no Greece/Cyprus line in the hero; FAQ 14 becomes "Does it work for weddings outside Greece?". Current English SEO keywords kept where they overlap. |
| Kickers | The design's small uppercase kickers stay (the owner asked for the exact page), overriding the house "no eyebrow" rule for this page. |

## Page, top to bottom

| # | Section | Source | Notes |
| --- | --- | --- | --- |
| 0 | Campaign banner | Reuse `OccasionCampaignBanner` | Only while a campaign runs. |
| 1 | Header | Reuse `LandingHeader` | Links: How it works, Features, Plans, FAQ, Sign in. Keeps the language switcher and the mobile menu. |
| 2 | Hero | New `WeddingHero` | Visible breadcrumb (StoryWall › Γάμος), kicker, **H1 is the big title** ("Ηλεκτρονικό προσκλητήριο & *ιστοσελίδα γάμου*", second half in the brand gradient), subtitle, body, create CTA + demo link, trust line (No app · Private · One link · From {price}). A campaign can still swap the body, CTA label and feed cover. The QR wedding page keeps `KeywordHero`. |
| 2a | Hero visual | Reuse `LandingHeroVisual` | Gets the HTML feed, HTML post cards and **HTML comment cards** (new `comments` prop, like `posts`). Stickers and phone frame unchanged. |
| 3 | How it works | Reuse `LandingHowItWorks` | Wedding copy. |
| 4 | Demo strip | Reuse `LandingHeroTransition` | `href="#demo"`. |
| 5 | Why StoryWall | New `WeddingWhy` | Heading; **Without** card: 3 tilted photos, 2 chat bubbles, 4 ✕ items. **With** card: subtitle, QR row (photo → arrow → 3 steps; step 1 links to the QR wedding page while that page is live), photo marquee (14 photos, name · role), "Example" stats 248 / 36 / 64 / 86, 4 ✓ chips. |
| 6 | RSVP | New `WeddingRsvp` | Pink gradient panel. Desktop: Without column (5 notification cards: Viber, WhatsApp, Messenger, Email, SMS; avatar, name, time, answer pill), curved arrow, With column (3 tilted phones: guest list, RSVP form, stats), right column "ALL ANSWERS" with 4 ✓ items. Mobile: the same parts stacked. |
| 7 | Private social | New `WeddingPrivate` | 4 numbered cards with gradient icons. |
| 8 | Demo | Reuse `LandingDemo` | Children: new `WeddingDemoPhones` (profile menu phone + feed phone with countdown). Shown only when the wedding demo exists (`hasDemo`), as today. |
| 9 | Features | New `WeddingFeatures` | Dark section, 10 items, 5 per row on desktop. Still filtered by the modules the config enables (`occasionFeatureKeys`), so a disabled module is never advertised. |
| 10 | Reviews | Reuse `LandingReviews` | Unchanged. |
| 11 | Plans | Reuse `LandingPricing` | New centered header variant on a white background: kicker "ΠΑΚΕΤΑ", heading, intro. Cards unchanged. |
| 12 | FAQ | Reuse `LandingFaq` / `LandingFaqItem` | New centered header variant. 14 questions. One open at a time through the native exclusive `<details name>`, no script. |
| 13 | Final CTA | Reuse `LandingFinalCta` | Wedding copy, reused photo. |
| 14 | Other occasions | Reuse `OccasionLinks` | Unchanged. |
| 15 | Footer | Reuse `LandingFooter` | Unchanged (it already matches the design). |

## Rebuilt composites

All mocks are presentational server components, sized in container units (`cqw`) so they scale like a picture. A shared `MockPhone` draws the gold bezel (the existing `sw-phone-frame.webp` for the hero; a Tailwind bezel for the tilted phones) and takes its screen as children. Tilts use Tailwind 3D transforms.

- **Hero feed** (`WeddingPhoneFeed`): logo + countdown (D H M S labels from copy), cover with couple name and 3 round icon buttons, date and place, stories row (your story, schedule date badge, guests, moments, venue), composer, 9 posts with 1 or 2 photos, pin and more icons, like and comment counts, two comment lines each, and the "Update list" music card between posts 6 and 7. It scrolls with the existing feed-travel hook.
- **Hero cards** (`WeddingPostCard`, `WeddingCommentCard`): built like `OccasionPostCard`: avatar, grey skeleton lines, photo, heart and comment icons; comment cards with a gradient heart or outline heart and one or two avatars.
- **RSVP notifications** (`RsvpNotification`): app badge (brand marks as inline SVG; Email and SMS as plain icons), avatar, name, relative time, a green "Yes, 2 people" or red "No" pill.
- **RSVP phones** (`RsvpGuestListScreen`, `RsvpFormScreen`, `RsvpStatsScreen`): status bar, host-dashboard header, guest rows, Yes/No buttons, adult and child steppers, message box, gradient submit button, stat tiles 21 / 64 / 47 / 17, attendance bars, bottom tab bar (lucide icons). Static, not the app's real screens.
- **Demo phones** (`DemoProfileScreen`, `DemoFeedScreen`): gradient profile menu (avatar, name, email, EN/EL, Events, Plans, Features, Sign out) with the "Profile" panel overlapping it, and a feed phone (cover "Nicole & Samuel", date, place, stories, composer, one post with 2 photos, + button).

Names, captions, comments, times, dates and places are all copy keys, so each language reads naturally ("30 ΔΕΚ 2026 · Ρόδος" / "DEC 30, 2026 · Rhodes").

## Photos

Stored as WebP in `public/landing/wedding/`, with descriptive file names. One map, `lib/occasions/weddingMedia.ts`, lists every photo and which avatar belongs to which name, so any photo can be swapped later in one place.

**Generated: 22 scenes + 12 faces**

| Id | Used in | Shot |
| --- | --- | --- |
| C1 | Hero feed cover | Couple, foreheads touching, close-up, soft daylight (16:11) |
| S1–S3 | Hero stories | Couple selfie with sunglasses; bride's updo detail; groom portrait outdoors (1:1) |
| P1 | Post 1 | Bride laughing with bridesmaids in robes, getting ready (4:3) |
| P2a, P2b | Post 2 | Mother buttoning the bride's dress; bride and mother foreheads together (1:1) |
| P3 | Post 3 | Groomsmen fixing the groom's bow tie (4:3) |
| P4 | Post 4 | Guests walking to a whitewashed chapel by the sea (4:3) |
| P5 | Post 5 | Ring exchange, Orthodox priest behind (4:3) |
| P6a, P6b | Post 6 | Couple leaving the chapel under petals; couple walking through guests (1:1) |
| P7 | Post 7 | Sunset dinner by the sea under string lights (4:3) |
| P8a, P8b | Post 8 | First dance close-up; first dance wide on the dance floor (1:1) |
| P9 | Post 9 | Bride dancing on a crowded floor, disco ball (4:3) |
| K1, K2 | Hero post cards | Bride laughing while dancing with the groom; bride with arm raised dancing (4:3) |
| D1–D3 | Demo phone | Couple about to kiss in a park (cover); couple laughing in confetti; long dinner table toast at sunset |
| Q1 | QR row | Guest scanning a table QR card with a phone; no readable words anywhere (4:3) |
| F1–F7, M1–M5 | Every avatar | Head-and-shoulders portraits, varied ages, warm natural light (1:1), shared across names |

**Reused from the design file:** marquee photos 1–14 and their avatars, the 3 "Without" photos, the final CTA photo, and the gradient icon masks for Private and Features (rendered with Tailwind `mask-*` + the brand gradient).

## Copy

- `OccasionPages.WEDDING` in `messages/el.json` and `messages/en.json` is rewritten for the new sections. Keys used only by the old wedding layout (story timeline, themes) are removed. Every key exists in both languages (the existing copy test enforces it).
- Greek text is the design's text word for word. English follows the decisions above.
- SEO meta from the design: Greek title "Ηλεκτρονικό Προσκλητήριο & Ιστοσελίδα Γάμου | StoryWall" and its description; English equivalents.
- Image `alt` text is localized. Decorative mocks are `aria-hidden`; the RSVP and demo blocks get one localized label each.

## Motion

Framer Motion only, through the existing `LandingMotionProvider` toggle and `useReducedMotion`:

- Hero: unchanged (phone breathe, feed travel, drift and float on cards and stickers).
- Marquee: one `useMarqueeMotion` hook drives an `x` loop over a duplicated track (48 s, linear). Duplicates are `aria-hidden`. Paused or reduced motion: a still row the user can scroll sideways.
- Everything else: Tailwind hover and focus transitions only.

## SEO (checked against docs/seo-guidelines.md)

- One `<h1>` (the hero title). Server-rendered copy and images. Canonical, hreflang and sitemap unchanged (same URLs).
- JSON-LD: the existing service, breadcrumb and FAQ graph with the 14 questions, filled with the same price text as the page. No `offers` (prices come from config, as today).
- The share image keeps its route and reads the new meta copy.
- Images through `ProtectedImage` with sizes and dimensions.

## Code layout

- `components/occasions/OccasionPage.tsx` renders `WeddingContent` for `WEDDING` and `OccasionContent` for the rest.
- `components/occasions/wedding/`: one small file per section and per mock part (hero, why, rsvp, private, demo phones, features, mocks).
- Logic in `lib/` and `hooks/`: `weddingMedia.ts`, a `weddingPriceRange()` helper from config, `useMarqueeMotion`.
- `WeddingContent` does not import `landing.css`. Any reused section that turns out to depend on its `.landing-page` rules gets those styles moved into its own Tailwind classes, unchanged for the main landing.
- Shared components gain only optional props: `LandingHeroVisual.comments`, a centered header on `LandingPricing` and `LandingFaq`, and an exclusive group name on `LandingFaqItem`.

## Verification

- Unit: copy parity, `weddingPriceRange`, the WEDDING/other split in `OccasionPage`, the existing page test.
- `tsc` and lint clean.
- Visual: the new page next to the design file at 1440 and 390 wide, section by section, plus 768. Motion toggle and reduced motion checked.
- `curl` on both URLs: 200, one h1, canonical, hreflang, FAQ JSON-LD.
- Baptism page and main landing unchanged.

## Out of scope

The main landing hero (it keeps its screenshot feed), the baptism layout, and the QR wedding page.
