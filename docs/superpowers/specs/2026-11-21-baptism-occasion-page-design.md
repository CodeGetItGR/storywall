# Baptism occasion page (KAN-252)

## Goal

Rebuild the baptism page (`/vaptisi`, `/baptisms`) on the wedding page's layout, following the owner's draft (`storywall-vaptisi-prosxedio.html`, a saved copy of the live wedding page with baptism copy, photos and a new Themes section). The wedding sections become shared occasion sections that both pages use. The wedding page must look exactly as it does today.

Out of scope: launching baptism on production (it stays `launched: false`), baptism RSVP pictures (KAN-253), and removing the old generic occasion layout (kept as the fallback for occasions not yet redesigned).

## Decisions

| Topic | Decision |
| --- | --- |
| Reuse | Wedding sections move to `components/occasions/sections/`, occasion-neutral, used by wedding and baptism |
| Demo | Baptism has no demo button, no demo section; the band and the hero's second button go to `#themes` |
| Theme tiles | The first six live baptism presets (`getLandingThemes('BAPTISM', locale)`), fetched on the server |
| Hero phone | The draft's baptism feed screenshot (unicorn theme), saved as a static asset |
| Hero posts | The two floating post photos become the baptism church and table photos |
| Reviews, INVIART | Included as on wedding; both hide themselves without baptism data |
| RSVP pictures | The wedding pictures for now (KAN-253 replaces them) |
| Guests' photos | A still row of three tiles, the middle one lower; wedding keeps its marquee |
| Features | Modules only; no themes card (the page has a Themes section) |
| Launch | Stays hidden on production |
| Metadata | The draft's title and description; "Από {from}" from the live price, left out without one |
| Old copy | Old BAPTISM keys no component reads are removed |
| English | Claude drafts every English line; the owner approves each one old → new before commit |
| Old layout | `OccasionContent` and its parts stay for occasions not yet redesigned |

## Architecture

### Routing

`OccasionPage` today picks `WeddingContent` for WEDDING and `OccasionContent` for the rest. It will pick the shared `OccasionStoryContent` for every event type that has a page config (WEDDING, BAPTISM) and `OccasionContent` otherwise. Server work stays where it is: the config prefetch, the demo preview (only for the old layout), and the themes fetch, now also run for baptism's Themes section (only when `occasionOffersThemes`).

### Page config

`lib/occasions/pageConfig.ts` holds one entry per redesigned occasion:

```ts
type OccasionPageConfig = {
    media: OccasionPageMedia;      // lib/occasions/pageMedia.ts
    demo: boolean;                 // demo button, band to the demo, demo section
    qrLinks: boolean;              // links to the QR wedding page (hero, why, FAQ)
    themes: boolean;               // Themes section, hero and band go to #themes
    guestPhotos: 'marquee' | 'row';
};
```

WEDDING: `demo: true, qrLinks: true, themes: false, guestPhotos: 'marquee'`.
BAPTISM: `demo: false, qrLinks: false, themes: true, guestPhotos: 'row'`.

`demo` still also needs `eventType.hasDemo`, and `qrLinks` still needs the QR page to be live, as today.

### Media

`lib/occasions/weddingMedia.ts` becomes `lib/occasions/pageMedia.ts` with `WEDDING_PAGE_MEDIA` and `BAPTISM_PAGE_MEDIA`:

```ts
type OccasionPageMedia = {
    hero: { feed: OccasionPhoto; posts: readonly [OccasionPhoto, OccasionPhoto] } | null; // null → the landing's own
    withoutPhotos: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    qrPhoto: OccasionPhoto;
    guestPhotos: readonly { photo: OccasionPhoto; avatar: OccasionPhoto }[];
    rsvpPictures: Record<Locale, RsvpPictures>;
    finalCtaImage: LandingImageAsset;
};
```

Wedding keeps every picture it uses today. Baptism uses:

- hero feed: `public/landing/baptism/baptism-feed-unicorn.webp` (978×1764, from the draft); posts: `baptism-ceremony-inside-the-church`, `baptism-celebration-at-the-table`
- without: church, table, outside (the three baptism photos in `public/landing`)
- QR photo: `/landing/guest-scanning-the-storywall-qr-code.webp`
- guest photos: outside + avatar Anna, church + Giorgos, table + Eleni (order and avatars as the draft)
- RSVP pictures: the wedding ones
- final image: `happy-baptism-celebration-outside-the-church-on-a-greek-island`

### Sections

Each section is a thin async server wrapper that reads `OccasionPages.<TYPE>.<section>` and passes plain props to a view component. Views take props only, so they have stories and tests. Wedding files move and are renamed; their markup and classes stay the same.

| Today | Becomes |
| --- | --- |
| `wedding/WeddingContent` | `sections/OccasionStoryContent` |
| `wedding/WeddingHero` | `sections/HeroSection` → `sections/hero/HeroView` |
| `wedding/WeddingWhy` + `why/*` | `sections/WhySection` → `sections/why/WhyView`, `WhyWithout`, `WhyQrSteps`, `WhyMarquee`, new `WhyPhotoRow`, `WhyStats` |
| `wedding/WeddingRsvp` + `rsvp/*` | `sections/RsvpSection` → `sections/rsvp/RsvpView`, `RsvpPictures`, `RsvpChecklist` |
| `wedding/WeddingPrivate` | `sections/PrivateSection` → `sections/private/PrivateView` |
| (new) | `sections/ThemesSection` → `sections/themes/ThemesView`, `ThemeTile`, `ThemesPhone` |
| `wedding/WeddingFeatures` | `sections/FeaturesSection` → `sections/features/FeaturesView` |
| `wedding/WeddingSectionHead`, `WeddingWrap` | `sections/SectionHead`, `sections/SectionWrap` |
| `wedding/WeddingFaqAnswer` | `sections/FaqAnswer` |
| `wedding/mock/*` | `sections/mock/*` |
| `lib/occasions/weddingCopy.ts`, `weddingFeatures.ts` | `lib/occasions/pageCopy.ts`, `pageFeatures.ts` |

Heading ids used by `aria-labelledby` (`wedding-why-title`, …) become occasion-neutral (`why-title`, …); they are not visible and nothing links to them. Anchor ids used in links (`#features`, `#pricing`, `#faq`, `#create`, `#howItWorks`) stay.

### Hero

- Copy: `hero.breadcrumb`, `hero.kicker`, `hero.h1` (with `<em>`), `hero.subtitle`, `hero.body`, `hero.trust[]`, `hero.trustPrice`, `hero.cta`, and for baptism `hero.themesCta` ("Δες τα θέματα").
- Actions: the main button stays as today (plans, or create when signed in). The second button is the demo on wedding, "Δες τα θέματα" → `#themes` on baptism. `OccasionHeroActions` / `LandingHeroActions` get a generic secondary link (`href`, `label`, tracking placement) in place of the demo-only one; the wedding demo passes through it unchanged.
- Visual: `OccasionHeroVisual` with `feed` = the baptism screenshot image and `posts` = two post cards built from the baptism photos. Wedding passes nothing, as today.
- The QR page link shows only with `qrLinks`.

### Band

`LandingHeroTransition` gets optional `label`, `cta`, `href` and tracking `event`. The landing and wedding keep today's defaults. Baptism passes `#themes`, its own CTA ("Δες τα θέματα", shown uppercase by the existing class) and its own section label.

### Why

As wedding, with baptism copy. With `guestPhotos: 'row'`, `WhyPhotoRow` shows the three tiles centred, the middle one lower, no motion (same tile look as the marquee's tiles: rounded photo, white name pill with avatar). The QR row's link shows only with `qrLinks`. Stats and chips come from copy (196 / 28 / 58 / 72 in the draft).

### RSVP, Private

As wedding, with baptism copy (`rsvp.*`, `private.*`). Private keeps four cards with the wedding icons the draft uses.

### Themes (new)

Shown when the config says `themes` and the plans offer themes (`occasionOffersThemes`). Section id `themes`.

- Layout (draft's `.swt`, rewritten in Tailwind): warm gradient background; copy column (kicker, two-line heading, lead, tile grid, button) and the phone on the right from 761px; stacked below. Tiles: 3 per row on phones, 6 from 761px. Button: white pill, "Φτιάξε το StoryWall σου", to the create link, lifts 3px on hover (Tailwind transition, off under `motion-reduce`). Phone: dark 8px frame, rounded, with a caption under it.
- Tiles: each preset's illustration on its background colour, name under it. Alt text: the theme name ("Θέμα {name}" style, to be approved). No tiles (fetch failed or empty) → the grid is left out; the rest of the section stays.
- Copy: `themes.kicker`, `themes.heading[2]`, `themes.lead`, `themes.cta`, `themes.phoneCaption`, `themes.phoneAlt`, `themes.tileAlt`.

### Features

As wedding: modules the baptism plans offer, the baptism's own copy per key, else the shared line. No themes card.

### The rest

Pricing (`pricing.kicker`, `pricing.heading`, `pricing.intro`), Reviews, INVIART, FAQ (14 entries, one open at a time, price and length placeholders where the draft names a price or a duration), final call to action (baptism image), other occasions, footer, sale button, cookie consent: all as on wedding.

## Copy

- Greek: the draft's text, word for word, in the WEDDING key shape under `OccasionPages.BAPTISM`. Where the draft writes a price ("79€") or a duration, the copy uses the same placeholders the wedding copy uses, so it follows the config.
- English: Claude drafts every new English line and shows it to the owner old → new in popups. Nothing is committed before a yes.
- Lines the draft does not have and Claude must write (both languages, each approved): the band's screen-reader label, the themes phone alt text, the theme tile alt pattern, any alt text the shared sections need for baptism photos.
- Metadata: title "Ηλεκτρονικό Προσκλητήριο Βάπτισης & Ιστοσελίδα | StoryWall"; description from the draft with "Από {from}." as a price placeholder (wedding's ICU `select` on `range`). Keywords and `imageAlt` stay unless the owner says otherwise.
- Removed (both languages), once nothing reads them: `BAPTISM.themes` (old shape), `timeline`, `story`, `demoHeading`, `featuresIntro`, `howItWorksHeading`, `howItWorks`, `pricingHeading`, `pricingIntro`, the old `hero` keys the new hero does not read (`headline`, `lead`, `promise`, `imageAlt`, `feed`), the old `finalCta` keys the new one does not read, and the 9 old FAQ entries (replaced by the draft's 14). The BAPTISM entry in `lib/occasions/occasionMedia.ts` goes too if nothing reads it. The exact list is checked by grep during the build and shown to the owner before removal.
- Still read and kept: `name`, `meta.*`, `hero.h1` (share image), `faq` (structured data).

## SEO

The page follows `docs/seo-guidelines.md`: one h1 (the keyword title), Greek/English hreflang parity, title ≤ 60 characters (tested), unique title, FAQ structured data from the same FAQ copy, every image with real alt text. Slugs do not change. Any rule the build breaks is reported as a **BLOCKER**.

## Testing

- Wedding's existing tests move with their components and keep passing unchanged in meaning.
- New tests: the page config picks the layout; baptism renders no demo link or section, has `#themes` links in the hero and band, shows the Themes section with tiles and hides the grid with none; `WhyPhotoRow` renders three tiles with alt text; Features leaves out themes; the copy test keeps English and Greek keys in step.
- Stories (title `Occasions/…`): `HeroView` (wedding, baptism), `WhyView` (marquee, row), `WhyPhotoRow`, `RsvpView`, `PrivateView`, `ThemesView` (six tiles, no tiles), `ThemeTile`, `FeaturesView`.
- Checks: `tsc --noEmit`, `eslint .`, `vitest run`, `next build`.
- Visual: `/vaptisi` and `/gamos` (and English) on the local dev server at 375px and desktop, compared with the draft and with today's wedding page. The PR's visual-regression check must show no wedding change.

## As built

Where the build differs from or adds to the text above:

- `ThemeTile` is its own component (not `LandingThemeTile`) because long theme names must wrap under the tile.
- The hero's floating posts are `OccasionPostCard`s with an avatar each; `OccasionPageMedia` also has `themesPhone` (the Themes section's phone picture, the feed screenshot for baptism, null for wedding).
- The band's CTA is written in capitals in the copy itself.
- The band's screen-reader label is "Θέματα του StoryWall" (approved).
- FAQ 8's sentence about extending the page follows the config (ICU `select` on `extendable`).
- Greek is the draft's text word for word. English was drafted for search (baptism website, digital christening invitation) and each line was approved by the owner.
- The old generic layout stays in the code, reachable by no occasion page that has a config, until KAN-254 removes it.
