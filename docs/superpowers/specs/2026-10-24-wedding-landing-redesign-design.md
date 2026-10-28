# Wedding landing redesign — design

2026-10-24, updated 2026-10-25 to match what was built. Source: the owner's design file `storywall-gamos-2.html` (Greek, single self-contained HTML). Rules: [docs/seo-guidelines.md](../../seo-guidelines.md). Builds on [2026-10-12-occasion-pages-design.md](2026-10-12-occasion-pages-design.md).

## Goal

Rebuild `/el/gamos` and `/weddings` to match the design file section by section. Tailwind for styling, Framer Motion for animation, no new plain CSS.

Every free text is translated. Pictures that hold words (the RSVP comparison, the QR photo) use the design's Greek pictures on both pages for now; English pictures follow in a separate change.

## Decisions

| Topic | Decision |
| --- | --- |
| Scope | Wedding only. Baptism keeps `OccasionContent`. The main landing keeps its own hero. New sections are built so baptism can switch over later. |
| Pictures with words | The design's own pictures, on both pages. The hero visual and the demo picture are the landing's (the design uses the same files). The RSVP comparison and the QR photo are the design's Greek pictures until the English ones arrive. The first build drew these in HTML; the owner chose the pictures instead (2026-10-25). |
| Picture format | Every picture is WebP. |
| Standalone photos | Reused from the design file: 14 marquee photos and their avatars, 3 "Without" photos, the QR photo, the final CTA photo. |
| Plans | Live plans from `/api/config` through the existing `LandingPricing` / `MarketingPlanCard`. The design's card already matches it; only the section header changes. |
| Prices in copy | "Από 119€" (hero) and the FAQ price answer read the lowest and highest live wedding price from the server config, across every plan and duration (the top is the dearest plan's longest duration). Without config: the hero price chip is left out and the FAQ uses a sentence without prices. |
| FAQ accuracy | Checked against the app on 2026-10-25. Videos are stored in HD (the backend converts them to at most 1920 px and keeps no original), so the download answer promises original resolution for photos only. Wedding plans sell no coverage extension, so the duration answer does not offer renewal. |
| Kept extras | Campaign banner (top), language switcher (header and mobile menu), reviews (between Features and Plans), other-occasions links (above the footer). |
| English | Claude translates; the owner reviews in the PR. Adapted for readers worldwide: no Greece/Cyprus line in the hero; FAQ 14 becomes "Does it work for weddings outside Greece?". Current English SEO keywords kept where they overlap. |
| Kickers | The design's small uppercase kickers stay (the owner asked for the exact page), overriding the house "no eyebrow" rule for this page. |
| Alt text | Every image has localized alt text. The Greek RSVP alts are the design's own. |

## Page, top to bottom

| # | Section | Source | Notes |
| --- | --- | --- | --- |
| 0 | Campaign banner | Reuse `OccasionCampaignBanner` | Only while a campaign runs. |
| 1 | Header | Reuse `LandingHeader` | Links: How it works, Features, Plans, FAQ, Sign in. Keeps the language switcher and the mobile menu. |
| 2 | Hero | New `WeddingHero` | Visible breadcrumb (StoryWall › Γάμος), kicker, **H1 is the big title** ("Ηλεκτρονικό προσκλητήριο & *ιστοσελίδα γάμου*", second half in the brand gradient), subtitle, body, create CTA (its label on two lines, as in the design) + demo link, trust line (No app · Private · One link · From {price}). A campaign can still swap the body and the CTA label, not the picture. The QR wedding page keeps `KeywordHero`. |
| 2a | Hero visual | Reuse `LandingHeroVisual` | The landing's phone feed, cards and stickers, unchanged. A new `className` prop sizes and places it in the wedding hero's grid. |
| 3 | How it works | Reuse `LandingHowItWorks` | Wedding copy. |
| 4 | Demo strip | Reuse `LandingHeroTransition` | `href="#demo"`. |
| 5 | Why StoryWall | New `WeddingWhy` | Heading; **Without** card: 3 tilted photos, 2 chat bubbles, 4 ✕ items. **With** card: subtitle, QR row (photo → arrow → 3 steps; step 1 links to the QR wedding page while that page is live), photo marquee (14 photos, name · role), "Example" stats 248 / 36 / 64 / 86, 4 ✓ chips. |
| 6 | RSVP | New `WeddingRsvp` | Pink gradient panel. The design's pictures: one wide picture (without and with StoryWall) from 761 px, the two halves stacked below. Right column "ALL ANSWERS" with 4 ✓ items in HTML. |
| 7 | Private social | New `WeddingPrivate` | 4 numbered cards with gradient icons. |
| 8 | Demo | Reuse `LandingDemo` | The landing's demo picture with the wedding's alt text, a kicker over the heading, wedding copy. With a kicker the columns keep their shares and the picture overflows its own, as in the design. Shown only when the wedding demo exists (`hasDemo`), as today. |
| 9 | Features | New `WeddingFeatures` | Dark section, 10 items, 5 per row on desktop. Still filtered by the modules the config enables (`occasionFeatureKeys`), so a disabled module is never advertised. |
| 10 | Reviews | Reuse `LandingReviews` | Unchanged. |
| 11 | Plans | Reuse `LandingPricing` | New centered header variant on a white background: kicker "ΠΑΚΕΤΑ", heading, intro. Cards unchanged. |
| 12 | FAQ | Reuse `LandingFaq` / `LandingFaqItem` | New centered header variant. 14 questions. One open at a time through the native exclusive `<details name>`, no script. |
| 13 | Final CTA | Reuse `LandingFinalCta` | Wedding copy, reused photo. |
| 14 | Other occasions | Reuse `OccasionLinks` | Unchanged. |
| 15 | Footer | Reuse `LandingFooter` | Unchanged (it already matches the design). |

## Pictures

Stored as WebP in `public/landing/wedding/`, with descriptive file names. One map, `lib/occasions/weddingMedia.ts`, lists every wedding picture and which avatar belongs to which name, so any picture can be swapped later in one place.

| Picture | File | Words in it |
| --- | --- | --- |
| RSVP, both halves (761 px and up) | `wedding-rsvp-replies-without-and-with.webp` | Greek |
| RSVP, without (phones) | `wedding-rsvp-replies-without.webp` | Greek |
| RSVP, with (phones) | `wedding-rsvp-replies-with.webp` | Greek |
| QR row | `wedding-guest-scans-table-qr.webp` | Greek |
| Marquee, 14 photos and avatars | `wedding-marquee-*.webp` | None |
| "Without" photos | `wedding-without-photo-1..3.webp` | None |
| Private and Features icons | `icons/*.webp` (masks filled with the brand gradient) | None |

The hero visual and the demo picture are the landing's own files in `public/landing/`. The final CTA photo is `public/landing/storywall-final-cta-wedding-santorini.webp`.

**Follow-up:** English versions of the four Greek pictures. `/weddings` switches to them through the same map.

## Copy

- `OccasionPages.WEDDING` in `messages/el.json` and `messages/en.json` is rewritten for the new sections. Keys used only by the old wedding layout (story timeline, themes) are removed. Every key exists in both languages (the existing copy test enforces it).
- Greek text is the design's text word for word. English follows the decisions above.
- SEO meta from the design: Greek title "Ηλεκτρονικό Προσκλητήριο & Ιστοσελίδα Γάμου | StoryWall" and its description; English equivalents.
- Image `alt` text is localized: `rsvp.alts` (both, without, with) and `demo.imageAlt`.

## Motion

Framer Motion only, through the existing `LandingMotionProvider` toggle and `useReducedMotion`:

- Hero: unchanged (phone breathe, feed travel, drift and float on cards and stickers).
- Marquee: one `useMarqueeMotion` hook drives an `x` loop over a duplicated track (48 s, linear). Duplicates are `aria-hidden`. Paused or reduced motion: a still row the user can scroll sideways.
- Everything else: Tailwind hover and focus transitions only.

## SEO (checked against docs/seo-guidelines.md)

- One `<h1>` (the hero title). Server-rendered copy and images. Canonical, hreflang and sitemap unchanged (same URLs).
- JSON-LD: the existing service, breadcrumb and FAQ graph with the 14 questions, filled with the same price text as the page. No `offers` (prices come from config, as today).
- The share image keeps its route and reads the new meta copy.
- Images through `ProtectedImage` with sizes and dimensions, all with alt text.

## Code layout

- `components/occasions/OccasionPage.tsx` renders `WeddingContent` for `WEDDING` and `OccasionContent` for the rest.
- `components/occasions/wedding/`: one small file per section and per part (hero, why, rsvp, private, features, mock photo and icon helpers).
- Logic in `lib/` and `hooks/`: `weddingMedia.ts`, `weddingCopy.ts` (copy types, `splitInTwoLines`), `occasionPriceValues()` in `occasionPrice.ts` for prices from config, `useMarqueeMotion`.
- `WeddingContent` does not import `landing.css`. Any reused section that turns out to depend on its `.landing-page` rules gets those styles moved into its own Tailwind classes, unchanged for the main landing.
- Shared components gain only optional props: `LandingHeroVisual.className`, `LandingDemo` (`copy` with bold words, a string `eyebrow` as a kicker, `imageAlt`), a centered header on `LandingPricing` and `LandingFaq`, and an exclusive group name on `LandingFaqItem`.

## Verification

- Unit: copy parity, `occasionPriceValues`, every wedding picture is WebP and exists, the WEDDING/other split in `OccasionPage`, the existing page test.
- `tsc` and lint clean.
- Visual: the new page next to the design file at 1440, 768 and 390 wide, section by section. Motion toggle and reduced motion checked.
- `curl` on both URLs: 200, one h1, canonical, hreflang, FAQ JSON-LD.
- Baptism page and main landing unchanged.

## Out of scope

The main landing hero (it keeps its screenshot feed), the baptism layout, the QR wedding page, and the English pictures (follow-up).
