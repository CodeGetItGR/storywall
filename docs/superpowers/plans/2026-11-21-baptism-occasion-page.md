# Baptism Occasion Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/vaptisi` and `/baptisms` on the wedding page's layout, following the owner's draft, by turning the wedding sections into shared occasion sections. The wedding page stays exactly as it is.

**Architecture:** A page config per redesigned occasion (`lib/occasions/pageConfig.ts`) holds its pictures and switches: demo, QR links, Themes section, and the guest photo layout. `OccasionPage` renders `OccasionStoryContent` for any occasion with a config, and the old `OccasionContent` otherwise. Each section is a thin async server wrapper. It reads `OccasionPages.<TYPE>.<section>` through a props builder and renders a props-only view. Stories call the same builders with a translator for the toolbar language.

**Tech Stack:** Next.js App Router (server components), next-intl, Tailwind v4, framer-motion (existing marquee only), Vitest + Testing Library, Storybook (`@storybook/nextjs-vite`).

**Spec:** [docs/superpowers/specs/2026-11-21-baptism-occasion-page-design.md](../specs/2026-11-21-baptism-occasion-page-design.md)
**Tickets:** KAN-252 (this work), KAN-253 (baptism RSVP pictures, later), KAN-254 (remove the old generic layout, later)

---

## Ground rules for whoever runs this plan

- **Text.** Never change user-facing text without the owner's explicit yes. Ask in an `AskUserQuestion` popup that shows the exact old → new wording. Task 11 covers all of it. No other task changes a message string.
- **Questions.** Any doubt about spec, UX, copy or data goes to the owner in a popup first.
- **Subagents.** Never dispatch parallel subagents. CLAUDE.md forbids it without explicit permission.
- **Styling.** Tailwind only, no new CSS files. Animation uses Tailwind or framer-motion.
- **Section comments.** Add a JSX comment above every meaningful section boundary.
- **Commits.** Every commit message starts with `KAN-252:` and ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name. A local `next dev` run edits `AGENTS.md`: revert that change and never stage it.
- **Wedding must not change.** Moved code keeps every class string as it is. Only the props plumbing changes.
- **Shell.** Run commands from the worktree root: `C:\Users\User\WebstormProjects\storywall\.claude\worktrees\kan-228-settings-preview-e2ef2b`.

## File map

| Path | What it is |
| --- | --- |
| `lib/occasions/pageCopy.ts` | Copy shapes (renamed from `weddingCopy.ts`) plus `PageTranslator` |
| `lib/occasions/pageFeatures.ts` | Feature order and icons (renamed from `weddingFeatures.ts`) |
| `lib/occasions/pageMedia.ts` | `WEDDING_PAGE_MEDIA`, `BAPTISM_PAGE_MEDIA` (replaces `weddingMedia.ts`) |
| `lib/occasions/pageConfig.ts` | `occasionPageConfig(eventType)` |
| `lib/landingHero.ts` | Adds `HeroSecondaryLink`, `occasionHeroSecondary()` and the hero phone image sizes |
| `components/occasions/sections/OccasionStoryContent.tsx` | The shared page (from `WeddingContent`) |
| `components/occasions/sections/{Hero,Why,Rsvp,Private,Themes,Features}Section.tsx` | Async wrappers |
| `components/occasions/sections/hero/{HeroView,heroViewProps,heroVisual,HeroFeedShot}.tsx` | Hero |
| `components/occasions/sections/why/{WhyView,whyViewProps,WhyGuestTile,WhyPhotoRow,WhyMarquee,WhyQrSteps,WhyStats,WhyWithout}.tsx` | Why |
| `components/occasions/sections/rsvp/{RsvpView,rsvpViewProps,RsvpPictures,RsvpChecklist}.tsx` | RSVP |
| `components/occasions/sections/private/{PrivateView,privateViewProps}.tsx` | Private |
| `components/occasions/sections/themes/{ThemesView,themesViewProps,ThemeTile,ThemesPhone}.tsx` | Themes (new) |
| `components/occasions/sections/features/{FeaturesView,featuresViewProps}.tsx` | Features |
| `components/occasions/sections/{SectionHead,SectionWrap,FaqAnswer}.tsx` | Shared parts (renamed) |
| `components/occasions/sections/mock/*`, `sections/__fixtures__/*` | Moved unchanged |
| `.storybook/copy.ts` | Adds `translatorFor(globals, namespace)` |
| `.storybook/occasionPage.tsx` | `withOccasionPage` decorator (landing tokens + motion provider) |
| `public/landing/baptism/baptism-feed-unicorn.webp` | The draft's feed screenshot |

`components/occasions/wedding/` is empty at the end and gets deleted. `OccasionContent` and its parts stay untouched (KAN-254).

---

### Task 0: Baseline

**Files:** none

- [ ] **Step 1: Check the branch**

Run: `git status --short; git log --oneline -3`
Expected: on `claude/kan-252-baptism-page`, clean, top commit is `KAN-252: Baptism occasion page design` (or the plan commit), and below it `a45adfa8`.

- [ ] **Step 2: Check node_modules**

Run: `Test-Path node_modules\.bin\vitest.cmd`
If it is `False`, link the main checkout's node_modules with a junction (memory note *Worktree node_modules junction*). Compare the lockfiles first: `git diff --no-index ..\..\..\package-lock.json package-lock.json` must print nothing. Then run `New-Item -ItemType Junction -Path node_modules -Target ..\..\..\node_modules`.

- [ ] **Step 3: Run the occasion tests and record the result**

Run: `npx vitest run components/occasions lib/occasions components/landing`
Expected: all pass. Note the count. Every later task must keep these passing, except the tests it moves or rewrites.

---

### Task 1: Move the shared parts and rename the wedding-only names

Pure moves and renames. No behaviour changes.

**Files:**
- Move: `components/occasions/wedding/{WeddingSectionHead,WeddingWrap,WeddingFaqAnswer,WeddingFaqAnswer.test}.tsx` → `components/occasions/sections/{SectionHead,SectionWrap,FaqAnswer,FaqAnswer.test}.tsx`
- Move: `components/occasions/wedding/{mock,__fixtures__,why,rsvp}/` → `components/occasions/sections/{mock,__fixtures__,why,rsvp}/`
- Move: `lib/occasions/weddingCopy.ts` → `lib/occasions/pageCopy.ts`; `lib/occasions/weddingFeatures.ts` (+ `.test.ts`) → `lib/occasions/pageFeatures.ts` (+ `.test.ts`)
- Modify: every importer (found by the script)

- [ ] **Step 1: Move the files with git**

```powershell
New-Item -ItemType Directory -Force components\occasions\sections | Out-Null
git mv components/occasions/wedding/WeddingSectionHead.tsx components/occasions/sections/SectionHead.tsx
git mv components/occasions/wedding/WeddingWrap.tsx components/occasions/sections/SectionWrap.tsx
git mv components/occasions/wedding/WeddingFaqAnswer.tsx components/occasions/sections/FaqAnswer.tsx
git mv components/occasions/wedding/WeddingFaqAnswer.test.tsx components/occasions/sections/FaqAnswer.test.tsx
git mv components/occasions/wedding/mock components/occasions/sections/mock
git mv components/occasions/wedding/__fixtures__ components/occasions/sections/__fixtures__
git mv components/occasions/wedding/why components/occasions/sections/why
git mv components/occasions/wedding/rsvp components/occasions/sections/rsvp
git mv lib/occasions/weddingCopy.ts lib/occasions/pageCopy.ts
git mv lib/occasions/weddingFeatures.ts lib/occasions/pageFeatures.ts
git mv lib/occasions/weddingFeatures.test.ts lib/occasions/pageFeatures.test.ts
```

- [ ] **Step 2: Rewrite the imports and names**

Save this as `C:\Users\User\AppData\Local\Temp\claude\13216b4945ae9278\22f42274-acd6-4928-97b3-704a6e771c97\scratchpad\rename-sections.mjs`. It lives in the scratchpad, not the repo. Run it with `node <that path>` from the worktree root.

```js
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// Order matters: module paths first, then identifiers.
const RULES = [
    [/@\/components\/occasions\/wedding\/WeddingSectionHead/g, '@/components/occasions/sections/SectionHead'],
    [/@\/components\/occasions\/wedding\/WeddingWrap/g, '@/components/occasions/sections/SectionWrap'],
    [/@\/components\/occasions\/wedding\/WeddingFaqAnswer/g, '@/components/occasions/sections/FaqAnswer'],
    [/@\/components\/occasions\/wedding\/(mock|__fixtures__|why|rsvp)\//g, '@/components/occasions/sections/$1/'],
    [/@\/lib\/occasions\/weddingCopy/g, '@/lib/occasions/pageCopy'],
    [/@\/lib\/occasions\/weddingFeatures/g, '@/lib/occasions/pageFeatures'],
    [/\bWeddingSectionHeadProps\b/g, 'SectionHeadProps'],
    [/\bWeddingSectionHead\b/g, 'SectionHead'],
    [/\bWeddingWrap\b/g, 'SectionWrap'],
    [/\bWeddingFaqAnswerProps\b/g, 'FaqAnswerProps'],
    [/\bWeddingFaqAnswer\b/g, 'FaqAnswer'],
    [/\bWeddingMarqueeCopy\b/g, 'OccasionGuestPhotoCopy'],
    [/\bWeddingStatCopy\b/g, 'OccasionStatCopy'],
    [/\bWeddingCardCopy\b/g, 'OccasionCardCopy'],
    [/\bWEDDING_FEATURE_ORDER\b/g, 'OCCASION_PAGE_FEATURE_ORDER'],
    [/\bWEDDING_FEATURE_ICONS\b/g, 'OCCASION_PAGE_FEATURE_ICONS'],
    [/\bWEDDING_PRIVATE_ICONS\b/g, 'OCCASION_PRIVATE_ICONS'],
    [/\bweddingFeatures\b/g, 'occasionPageFeatures'],
];

const files = execSync('git ls-files -- "*.ts" "*.tsx" "*.md"', { encoding: 'utf8' }).split('\n').filter(Boolean);
for (const file of files) {
    if (file.startsWith('docs/superpowers/')) continue;
    const before = readFileSync(file, 'utf8');
    const after = RULES.reduce((text, [pattern, to]) => text.replace(pattern, to), before);
    if (after !== before) {
        writeFileSync(file, after);
        console.log(file);
    }
}
```

Expected: it prints `WeddingContent.tsx`, `WeddingWhy.tsx`, `WeddingRsvp.tsx`, `WeddingPrivate.tsx`, `WeddingFeatures.tsx`, the moved files, their tests and any other importer.

- [ ] **Step 3: Update the comments the rename leaves stale**

In `lib/occasions/pageCopy.ts`, replace the header comment and add the translator type:

```ts
import type { getTranslations } from 'next-intl/server';

// Shapes of an occasion page's copy read with t.raw (OccasionPages.<type>). Strings that hold <b>, <em> or
// <br></br> are read with t.rich by key instead, so they never pass through these types.

// What the section props builders read copy through: getTranslations() on the server, a
// createTranslator() in stories (cast, same runtime shape).
export type PageTranslator = Awaited<ReturnType<typeof getTranslations>>;

// why.with.marquee[n]: a guest's photo. The alt is built from `moment` with why.with.photoAlt,
// or given whole as `alt` where the words need other forms (Greek cases).
export type OccasionGuestPhotoCopy = { name: string; role: string; moment?: string; alt?: string };

// why.with.stats[n]
export type OccasionStatCopy = { value: string; label: string };

// Title and body pairs: rsvp.checklist.items, private.cards.
export type OccasionCardCopy = { title: string; body: string };
```

In `lib/occasions/pageFeatures.ts`:
- Change the comment above the order array to `// The design's order of the features band. occasionFeatureKeys() decides which of them a page shows.`
- Change the private icons comment to `// The four "private social" cards, in order.`

In `components/occasions/sections/mock/mocks.test.tsx`, rename `describe('wedding mocks'` to `describe('occasion page mocks'`. In `lib/occasions/pageFeatures.test.ts`, rename `describe('weddingFeatures'` to `describe('occasionPageFeatures'`.

- [ ] **Step 4: Type-check and test**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run components/occasions lib/occasions`
Expected: the same pass count as Task 0.

- [ ] **Step 5: Commit**

```powershell
git add -A components/occasions lib/occasions
git commit -m "KAN-252: Move the wedding page's shared parts to occasions/sections" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Page media and page config

**Files:**
- Create: `lib/occasions/pageMedia.ts`, `lib/occasions/pageMedia.test.ts` (replaces `weddingMedia.ts` and its test)
- Create: `lib/occasions/pageConfig.ts`, `lib/occasions/pageConfig.test.ts`
- Create: `public/landing/baptism/baptism-feed-unicorn.webp`
- Delete: `lib/occasions/weddingMedia.ts`, `lib/occasions/weddingMedia.test.ts`
- Modify: importers of `weddingMedia` (`WeddingContent.tsx`, `WeddingWhy.tsx`, `sections/rsvp/RsvpPictures.tsx`, `lib/occasions/weddingCopy.test.ts`)

- [ ] **Step 1: Add the feed screenshot**

```powershell
New-Item -ItemType Directory -Force public\landing\baptism | Out-Null
Copy-Item C:\Users\User\AppData\Local\Temp\claude\13216b4945ae9278\22f42274-acd6-4928-97b3-704a6e771c97\scratchpad\draft\img0.webp public\landing\baptism\baptism-feed-unicorn.webp
python -I -c "from PIL import Image; print(Image.open(r'public/landing/baptism/baptism-feed-unicorn.webp').size)"
```

Expected: `(978, 1764)`. If the scratchpad copy is gone, extract it again from `C:\Users\User\Downloads\storywall-vaptisi-prosxedio.html`. It is the first `data:image/webp;base64,` source; both copies in the file are the same image.

- [ ] **Step 2: Write the failing tests**

`lib/occasions/pageMedia.test.ts`:

```ts
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

// Every { src } anywhere in the maps.
function sources(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(sources);
    if (value && typeof value === 'object') {
        const { src } = value as { src?: unknown };
        return typeof src === 'string' ? [src] : Object.values(value).flatMap(sources);
    }
    return [];
}

describe.each([
    ['wedding', WEDDING_PAGE_MEDIA],
    ['baptism', BAPTISM_PAGE_MEDIA],
] as const)('%s page media', (_, media) => {
    it('points every picture at a WebP file in public/', () => {
        for (const src of new Set(sources(media))) {
            expect(src, src).toMatch(/\.webp$/);
            expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
        }
    });

    it('has three photos for "without StoryWall"', () => {
        expect(media.withoutPhotos).toHaveLength(3);
    });
});

describe('page media', () => {
    it("keeps the wedding's fourteen marquee tiles and the landing's hero", () => {
        expect(WEDDING_PAGE_MEDIA.guestPhotos).toHaveLength(14);
        expect(WEDDING_PAGE_MEDIA.hero).toBeNull();
        expect(WEDDING_PAGE_MEDIA.themesPhone).toBeNull();
    });

    it("gives the baptism its feed screenshot, three guest photos and the wedding's RSVP pictures", () => {
        expect(BAPTISM_PAGE_MEDIA.hero?.feed.src).toBe('/landing/baptism/baptism-feed-unicorn.webp');
        expect(BAPTISM_PAGE_MEDIA.themesPhone).toBe(BAPTISM_PAGE_MEDIA.hero?.feed);
        expect(BAPTISM_PAGE_MEDIA.guestPhotos).toHaveLength(3);
        expect(BAPTISM_PAGE_MEDIA.rsvpPictures).toBe(WEDDING_PAGE_MEDIA.rsvpPictures);
    });
});
```

`lib/occasions/pageConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { occasionPageConfig } from '@/lib/occasions/pageConfig';
import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

describe('occasionPageConfig', () => {
    it('gives the wedding its demo, QR links and marquee', () => {
        expect(occasionPageConfig('WEDDING')).toEqual({ media: WEDDING_PAGE_MEDIA, demo: true, qrLinks: true, themes: false, guestPhotos: 'marquee' });
    });

    it('gives the baptism its themes and a still row of photos, without demo or QR links', () => {
        expect(occasionPageConfig('BAPTISM')).toEqual({ media: BAPTISM_PAGE_MEDIA, demo: false, qrLinks: false, themes: true, guestPhotos: 'row' });
    });

    it('leaves every other occasion on the old layout', () => {
        expect(occasionPageConfig('BIRTHDAY')).toBeNull();
    });
});
```

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run lib/occasions/pageMedia.test.ts lib/occasions/pageConfig.test.ts`
Expected: FAIL, the modules cannot be resolved.

- [ ] **Step 4: Write `lib/occasions/pageMedia.ts`**

```ts
import type { Locale } from '@/i18n/config';
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// Every picture an occasion page shows. Swap one here and it changes everywhere it appears.

// A guest's photo with the face on its name pill, or a post card's photo and author.
export type OccasionGuestPhoto = { photo: OccasionPhoto; avatar: OccasionPhoto };

// RSVP replies without and with StoryWall: both side by side from 761 px, one under the other below.
export type OccasionRsvpPictures = { both: OccasionPhoto; without: OccasionPhoto; with: OccasionPhoto };

// The hero phone's screenshot and the two post cards beside it.
export type OccasionHeroMedia = { feed: OccasionPhoto; posts: readonly [OccasionGuestPhoto, OccasionGuestPhoto] };

export type OccasionPageMedia = {
    // null → the landing's own phone feed and post cutouts.
    hero: OccasionHeroMedia | null;
    withoutPhotos: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    qrPhoto: OccasionPhoto;
    // Same order as OccasionPages.<type>.why.with.marquee.
    guestPhotos: readonly OccasionGuestPhoto[];
    // The pictures hold text, so each language has its own set.
    rsvpPictures: Record<Locale, OccasionRsvpPictures>;
    // The phone beside the Themes section; null on a page without one.
    themesPhone: OccasionPhoto | null;
    finalCtaImage: LandingImageAsset;
};

const wedding = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/wedding/${name}.webp`, width, height });
const landing = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/${name}.webp`, width, height });
const guestAvatar = (name: string) => wedding(`wedding-marquee-avatar-${name}`, 160, 160);

const marqueeTile = (photoName: string, avatarName: string): OccasionGuestPhoto => ({
    photo: wedding(`wedding-marquee-${photoName}`, 460, 600),
    avatar: guestAvatar(avatarName),
});

const rsvpPictures = (suffix: string): OccasionRsvpPictures => ({
    both: wedding(`wedding-rsvp-replies-without-and-with${suffix}`, 2044, 1380),
    without: wedding(`wedding-rsvp-replies-without${suffix}`, 800, 1239),
    with: wedding(`wedding-rsvp-replies-with${suffix}`, 900, 990),
});

const WEDDING_RSVP_PICTURES: Record<Locale, OccasionRsvpPictures> = { el: rsvpPictures(''), en: rsvpPictures('-en') };

export const WEDDING_PAGE_MEDIA: OccasionPageMedia = {
    hero: null,
    withoutPhotos: [
        wedding('wedding-without-photo-1', 480, 440),
        wedding('wedding-without-photo-2', 480, 440),
        wedding('wedding-without-photo-3', 480, 440),
    ],
    // The guest scanning the table QR code. Its card and phone show Greek words, on both pages for now.
    qrPhoto: wedding('wedding-guest-scans-table-qr', 800, 600),
    // Nefeli posts two of them.
    guestPhotos: [
        marqueeTile('01-dress-preparation', 'ioanna'),
        marqueeTile('02-night-out', 'maria'),
        marqueeTile('03-taverna-toast', 'kostas'),
        marqueeTile('04-party-dance', 'sofia'),
        marqueeTile('05-groom-friends', 'petros'),
        marqueeTile('06-bride-preparation', 'eleni'),
        marqueeTile('07-guests-at-church', 'anna'),
        marqueeTile('08-couple-arrives', 'giorgos'),
        marqueeTile('09-tender-moment', 'ioanna-koumpara'),
        marqueeTile('10-first-dance', 'nikos'),
        marqueeTile('11-reception-dance', 'katerina'),
        marqueeTile('12-bride-morning', 'nefeli'),
        marqueeTile('13-paris-trip', 'nefeli'),
        marqueeTile('14-paris-arrival', 'orestis'),
    ],
    rsvpPictures: WEDDING_RSVP_PICTURES,
    themesPhone: null,
    finalCtaImage: { src: '/landing/storywall-final-cta-wedding-santorini.webp', width: 1448, height: 1086 },
};

const BAPTISM_CHURCH = landing('baptism-ceremony-inside-the-church', 1448, 1086);
const BAPTISM_TABLE = landing('baptism-celebration-at-the-table', 1448, 1086);
const BAPTISM_OUTSIDE = landing('happy-baptism-celebration-outside-the-church-on-a-greek-island', 1536, 1024);
// The draft's feed screenshot: a baptism on the Unicorn theme.
const BAPTISM_FEED = { src: '/landing/baptism/baptism-feed-unicorn.webp', width: 978, height: 1764 };

export const BAPTISM_PAGE_MEDIA: OccasionPageMedia = {
    hero: {
        feed: BAPTISM_FEED,
        // The post authors' faces are cropped from the baptism photos.
        posts: [
            { photo: BAPTISM_CHURCH, avatar: { ...BAPTISM_OUTSIDE, position: '53% 40%' } },
            { photo: BAPTISM_TABLE, avatar: { ...BAPTISM_TABLE, position: '62% 30%' } },
        ],
    },
    withoutPhotos: [BAPTISM_CHURCH, BAPTISM_TABLE, BAPTISM_OUTSIDE],
    qrPhoto: landing('guest-scanning-the-storywall-qr-code', 700, 875),
    guestPhotos: [
        { photo: BAPTISM_OUTSIDE, avatar: guestAvatar('anna') },
        { photo: BAPTISM_CHURCH, avatar: guestAvatar('giorgos') },
        { photo: BAPTISM_TABLE, avatar: guestAvatar('eleni') },
    ],
    // The wedding's for now; KAN-253 draws the baptism's own.
    rsvpPictures: WEDDING_RSVP_PICTURES,
    themesPhone: BAPTISM_FEED,
    finalCtaImage: BAPTISM_OUTSIDE,
};
```

- [ ] **Step 5: Write `lib/occasions/pageConfig.ts`**

```ts
import type { EventTypeConvention } from '@/lib/api/types';
import { BAPTISM_PAGE_MEDIA, type OccasionPageMedia, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

// How a redesigned occasion page differs from the others.
export type OccasionPageConfig = {
    media: OccasionPageMedia;
    // The hero's demo button, the band to the demo and the demo section. Also needs eventType.hasDemo.
    demo: boolean;
    // Links to the QR wedding page (hero, why, FAQ). Also needs the QR page to be live.
    qrLinks: boolean;
    // The Themes section, with the hero and the band pointing to it. Also needs plans that offer themes.
    themes: boolean;
    // The guests' photos: sliding past, or three standing still.
    guestPhotos: 'marquee' | 'row';
};

const PAGE_CONFIGS: Partial<Record<EventTypeConvention, OccasionPageConfig>> = {
    WEDDING: { media: WEDDING_PAGE_MEDIA, demo: true, qrLinks: true, themes: false, guestPhotos: 'marquee' },
    BAPTISM: { media: BAPTISM_PAGE_MEDIA, demo: false, qrLinks: false, themes: true, guestPhotos: 'row' },
};

// null → the occasion is still on the old generic layout (OccasionContent, removed in KAN-254).
export function occasionPageConfig(eventType: EventTypeConvention): OccasionPageConfig | null {
    return PAGE_CONFIGS[eventType] ?? null;
}
```

- [ ] **Step 6: Point the old importers at the new media and delete `weddingMedia.ts`**

- `components/occasions/wedding/WeddingWhy.tsx`:
  - import `{ WEDDING_PAGE_MEDIA }` from `@/lib/occasions/pageMedia`;
  - replace `WEDDING_MARQUEE[index]!` with `WEDDING_PAGE_MEDIA.guestPhotos[index]!`;
  - replace `WEDDING_QR_PHOTO` with `WEDDING_PAGE_MEDIA.qrPhoto`;
  - replace `WEDDING_WITHOUT_PHOTOS` with `WEDDING_PAGE_MEDIA.withoutPhotos`.
- `components/occasions/wedding/WeddingContent.tsx`: replace `WEDDING_FINAL_CTA_IMAGE` with `WEDDING_PAGE_MEDIA.finalCtaImage`.
- `components/occasions/sections/rsvp/RsvpPictures.tsx`: replace `WEDDING_RSVP_PICTURES[locale]` with `WEDDING_PAGE_MEDIA.rsvpPictures[locale]`. Task 7 replaces this with a prop.
- `lib/occasions/weddingCopy.test.ts`: replace `WEDDING_MARQUEE.length` with `WEDDING_PAGE_MEDIA.guestPhotos.length`.

```powershell
git rm lib/occasions/weddingMedia.ts lib/occasions/weddingMedia.test.ts
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run lib/occasions components/occasions; npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```powershell
git add lib/occasions/pageMedia.ts lib/occasions/pageMedia.test.ts lib/occasions/pageConfig.ts lib/occasions/pageConfig.test.ts public/landing/baptism/baptism-feed-unicorn.webp components/occasions lib/occasions/weddingCopy.test.ts
git commit -m "KAN-252: Page config and pictures for the wedding and baptism pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A generic second hero button

The landing hero's second button only knows the demo. Generalize it to a link with its own tracking, so the baptism can point it at `#themes`.

**Files:**
- Modify: `lib/landingHero.ts`, `lib/landingHero.test.ts` (create the test file if it does not exist)
- Modify: `components/landing/LandingHeroActions.tsx`, `components/landing/LandingHeroActions.test.tsx`, `components/landing/LandingHero.tsx:70`
- Modify: `components/occasions/OccasionHeroActions.tsx`, `components/occasions/OccasionHero.tsx` and `components/qrWedding/QrWeddingHero.tsx` (their call sites only)
- Modify: `components/landing/LandingHeroVisual.tsx` (move the size constants to `lib/landingHero.ts`)

- [ ] **Step 1: Write the failing tests**

Add to `lib/landingHero.test.ts`. Keep any tests already in it; check with `Test-Path lib\landingHero.test.ts`.

```ts
import { describe, expect, it } from 'vitest';

import { occasionHeroSecondary } from '@/lib/landingHero';

describe('occasionHeroSecondary', () => {
    it('is the demo when there is one, counted as a demo click', () => {
        expect(occasionHeroSecondary({ href: '/demo/wedding/feed', label: 'Demo' }, { href: '#themes', label: 'Themes' })).toEqual({
            href: '/demo/wedding/feed',
            label: 'Demo',
            click: { event: 'demo', placement: 'hero' },
        });
    });

    it('is the themes without a demo, counted as a nav click', () => {
        expect(occasionHeroSecondary(null, { href: '#themes', label: 'Themes' })).toEqual({
            href: '#themes',
            label: 'Themes',
            click: { event: 'nav', placement: 'hero', target: 'themes' },
        });
    });

    it('is nothing without either', () => {
        expect(occasionHeroSecondary(null, null)).toBeNull();
    });
});
```

Replace the second test in `components/landing/LandingHeroActions.test.tsx` and add a third:

```tsx
    it('marks the main button with the plain create link on the landing', () => {
        render(
            <LandingHeroActions
                main={landingHeroMainAction(false)}
                mainLabel="Plans"
                secondary={{ href: '/demo', label: 'Demo', click: { event: 'demo', placement: 'hero' } }}
            />,
        );
        expect(screen.getByRole('link', { name: 'Plans' })).toHaveAttribute('data-hero-create', '/events/new');
        expect(screen.getByRole('link', { name: 'Demo' })).not.toHaveAttribute('data-hero-create');
    });

    it('sends the second button where it is told, with its own click', () => {
        render(
            <LandingHeroActions
                plain
                main={landingHeroMainAction(false)}
                mainLabel="Plans"
                secondary={{ href: '#themes', label: 'Themes', click: { event: 'nav', placement: 'hero', target: 'themes' } }}
            />,
        );
        const link = screen.getByRole('link', { name: 'Themes' });
        expect(link).toHaveAttribute('href', '#themes');
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'nav', placement: 'hero', target: 'themes' });
    });
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/landingHero.test.ts components/landing/LandingHeroActions.test.tsx`
Expected: FAIL, because `occasionHeroSecondary` does not exist and `secondary` is not a prop.

- [ ] **Step 3: Add the type, the helper and the sizes to `lib/landingHero.ts`**

At the top, add `import type { LandingClick } from '@/lib/landingTracking';`. Below `occasionHeroMainAction`, add:

```ts
// The hero's second button: where it goes, its label, and the click it counts.
export type HeroSecondaryLink = { href: string; label: string; click: LandingClick };

// An occasion hero's second button: its demo, or without one its themes, or none.
export function occasionHeroSecondary(
    demo: { href: string; label: string } | null,
    themes: { href: string; label: string } | null,
): HeroSecondaryLink | null {
    if (demo) return { ...demo, click: { event: 'demo', placement: 'hero' } };
    if (themes) return { ...themes, click: { event: 'nav', placement: 'hero', target: 'themes' } };
    return null;
}
```

Below `landingHeroImageSizes`, move the four phone constants out of `LandingHeroVisual.tsx`:

```ts
// Shares of the hero visual's width, phone then desktop, matching LandingHeroVisual's classes.
const HERO_PHONE_SHARE = [0.5647, 0.437] as const;
// The screen insets 4.68% + 4.55% of the phone, and the feed track is 105.65% / 105.7% of the screen.
const HERO_PHONE_FEED_SHARE = [HERO_PHONE_SHARE[0] * 0.9077 * 1.0565, HERO_PHONE_SHARE[1] * 0.9077 * 1.057] as const;
export const LANDING_HERO_PHONE_SIZES = landingHeroImageSizes(...HERO_PHONE_SHARE);
// The phone feed's images, the landing's screenshots or an occasion's own.
export const LANDING_HERO_FEED_SIZES = landingHeroImageSizes(...HERO_PHONE_FEED_SHARE);
```

In `LandingHeroVisual.tsx`, delete `PHONE_SHARE`, `PHONE_FEED_SHARE`, `PHONE_SIZES` and `PHONE_FEED_SIZES` with their comments. Import `LANDING_HERO_FEED_SIZES` and `LANDING_HERO_PHONE_SIZES` from `@/lib/landingHero` and use them where `PHONE_FEED_SIZES` and `PHONE_SIZES` were.

- [ ] **Step 4: Rewrite `LandingHeroActions`**

Replace the props type and the demo block:

```tsx
type LandingHeroActionsProps = {
    main: LandingHeroMainAction;
    mainLabel: string;
    // The demo on the landing; an occasion's demo or themes; none for an occasion without either.
    secondary?: HeroSecondaryLink | null;
    // The occasion heroes show plain buttons.
    plain?: boolean;
    // Where the phone create button goes once this hero scrolls away: an occasion's own create link.
    createHref?: string;
};

export function LandingHeroActions({ main, mainLabel, secondary, plain = false, createHref }: LandingHeroActionsProps) {
```

```tsx
            {/* Second button: the arrow shows from desktop up so both buttons fit one phone row */}
            {secondary ? (
                <a
                    className={cn(BUTTON, 'border border-[#151313]/20 bg-white/85 pr-4 text-[#151313] min-[761px]:pr-2', plain && PLAIN)}
                    href={secondary.href}
                    {...landingClickAttributes(secondary.click)}
                >
                    <span>{secondary.label}</span>
                    {plain ? null : (
                        <span aria-hidden="true" className={cn(ARROW, 'hidden text-[#ee9971] min-[761px]:grid')}>
                            ↗
                        </span>
                    )}
                </a>
            ) : null}
```

Import `type HeroSecondaryLink` together with `LandingHeroMainAction` from `@/lib/landingHero`. Drop the `routes` import if nothing else uses it.

- [ ] **Step 5: Update the callers**

`components/landing/LandingHero.tsx:70`:

```tsx
<LandingHeroActions
    main={mainAction}
    mainLabel={mainLabel}
    secondary={{ href: routes.demo, label: t('demoCta'), click: { event: 'demo', placement: 'hero' } }}
/>
```

Import `routes` from `@/lib/routes` if `LandingHero.tsx` does not already.

`components/occasions/OccasionHeroActions.tsx`:

```tsx
'use client';

import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { useOccasionHeroMainAction } from '@/hooks/useOccasionHeroMainAction';
import type { HeroSecondaryLink } from '@/lib/landingHero';

type OccasionHeroActionsProps = {
    createHref: string;
    createLabel: string;
    plansLabel: string;
    // The demo, the themes, or null for the main button only.
    secondary: HeroSecondaryLink | null;
};

// The occasion hero's buttons: the plans (or create, once signed in) and a second link, as plain buttons.
export function OccasionHeroActions({ createHref, createLabel, plansLabel, secondary }: OccasionHeroActionsProps) {
    const { main, label } = useOccasionHeroMainAction(createHref, { create: createLabel, plans: plansLabel });

    return <LandingHeroActions plain createHref={createHref} main={main} mainLabel={label} secondary={secondary} />;
}
```

At each `OccasionHeroActions` call site, replace `demoHref={x} demoLabel={y}` with `secondary={occasionHeroSecondary(x ? { href: x, label: y } : null, null)}`. There are three: `components/occasions/OccasionHero.tsx`, `components/occasions/wedding/WeddingHero.tsx` and `components/qrWedding/QrWeddingHero.tsx`. Find them with `rg -n "OccasionHeroActions" components`.

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run lib/landingHero.test.ts components/landing components/occasions; npx tsc --noEmit`
Expected: PASS. The wedding hero test "shows signed-out visitors the plans first, and the demo when there is one" still passes unchanged.

- [ ] **Step 7: Commit**

```powershell
git add lib/landingHero.ts lib/landingHero.test.ts components/landing/LandingHeroActions.tsx components/landing/LandingHeroActions.test.tsx components/landing/LandingHero.tsx components/landing/LandingHeroVisual.tsx components/occasions/OccasionHeroActions.tsx components/occasions/OccasionHero.tsx components/occasions/wedding/WeddingHero.tsx components/qrWedding/QrWeddingHero.tsx
git commit -m "KAN-252: Let the hero's second button go anywhere, not only to the demo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A band that can point to the themes

**Files:**
- Modify: `components/landing/LandingHeroTransition.tsx`
- Create: `components/landing/LandingHeroTransition.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { routes } from '@/lib/routes';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('LandingHeroTransition', () => {
    it('goes to the demo by default, named and counted as the demo', async () => {
        render(await LandingHeroTransition({}));
        expect(screen.getByRole('region', { name: 'Demo του StoryWall' })).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /ΔΕΣ ΤΟ DEMO/ });
        expect(link).toHaveAttribute('href', routes.demo);
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'demo', placement: 'hero_band' });
    });

    it("takes an occasion's own link, label, button and click", async () => {
        render(
            await LandingHeroTransition({
                click: { event: 'nav', placement: 'hero_band', target: 'themes' },
                cta: 'THEMES',
                href: '#themes',
                label: 'Themes band',
            }),
        );
        expect(screen.getByRole('region', { name: 'Themes band' })).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /THEMES/ });
        expect(link).toHaveAttribute('href', '#themes');
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'nav', placement: 'hero_band', target: 'themes' });
    });
});
```

Note: `getTranslations('LandingPage.transition')` passes a string, so the mock reads Greek.

- [ ] **Step 2: Run it and see the second case fail**

Run: `npx vitest run components/landing/LandingHeroTransition.test.tsx`
Expected: the first test passes and the second fails.

- [ ] **Step 3: Add the props**

```tsx
import { getTranslations } from 'next-intl/server';

import { type LandingClick, landingClickAttributes } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';

type LandingHeroTransitionProps = {
    // Counted as a demo click unless an occasion sends the band elsewhere.
    click?: LandingClick;
    // The button's words; the demo's unless given.
    cta?: string;
    // An occasion page links to its own demo, or to its themes.
    href?: string;
    // The band's name for screen readers; the demo's unless given.
    label?: string;
};

export async function LandingHeroTransition({ click = { event: 'demo', placement: 'hero_band' }, cta, href = routes.demo, label }: LandingHeroTransitionProps) {
    const t = await getTranslations('LandingPage.transition');
```

In the JSX, change `aria-label={t('label')}` to `aria-label={label ?? t('label')}`, `{...landingClickAttributes({ event: 'demo', placement: 'hero_band' })}` to `{...landingClickAttributes(click)}`, and `<span>{t('cta')}</span>` to `<span>{cta ?? t('cta')}</span>`. Leave every class unchanged.

- [ ] **Step 4: Run it and type-check**

Run: `npx vitest run components/landing/LandingHeroTransition.test.tsx; npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add components/landing/LandingHeroTransition.tsx components/landing/LandingHeroTransition.test.tsx
git commit -m "KAN-252: Let an occasion send the hero band to its own section" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hero section

**Files:**
- Create: `components/occasions/sections/hero/HeroView.tsx`, `heroViewProps.tsx`, `heroVisual.tsx`, `HeroFeedShot.tsx`
- Create: `components/occasions/sections/HeroSection.tsx`
- Move: `components/occasions/wedding/WeddingHero.test.tsx` → `components/occasions/sections/HeroSection.test.tsx`
- Delete: `components/occasions/wedding/WeddingHero.tsx`
- Modify: `components/occasions/wedding/WeddingContent.tsx` (uses `HeroSection`)

- [ ] **Step 1: Move the test and point it at `HeroSection`**

```powershell
git mv components/occasions/wedding/WeddingHero.test.tsx components/occasions/sections/HeroSection.test.tsx
```

In the moved file:
- import `HeroSection` from `@/components/occasions/sections/HeroSection`, `findOccasion` from `@/lib/occasions/occasions` and `WEDDING_PAGE_MEDIA` from `@/lib/occasions/pageMedia`;
- rename `describe('WeddingHero'` to `describe('HeroSection (wedding)'`;
- replace the `hero()` helper with:

```tsx
function hero(overrides: Partial<Parameters<typeof HeroSection>[0]> = {}) {
    return HeroSection({
        campaign: null,
        createHref: '/events/new?type=wedding',
        demoHref: '/demo/wedding/feed',
        locale: 'el',
        media: WEDDING_PAGE_MEDIA,
        occasion: findOccasion('WEDDING')!,
        price: SPAN,
        qrHref: null,
        themesHref: null,
        ...overrides,
    });
}
```

Add one case:

```tsx
    it('shows no second button when there is neither a demo nor themes', async () => {
        render(await hero({ demoHref: null, themesHref: null }));
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['StoryWall', 'Δες τα πακέτα']);
    });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/occasions/sections/HeroSection.test.tsx`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Write `components/occasions/sections/hero/HeroView.tsx`**

The markup and classes are `WeddingHero`'s, unchanged. Only the values now come in as props.

```tsx
import { Fragment, type ReactNode } from 'react';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { OccasionHeroActions } from '@/components/occasions/OccasionHeroActions';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import type { Locale } from '@/i18n/config';
import type { HeroSecondaryLink } from '@/lib/landingHero';
import { qrLinkAttributes } from '@/lib/linkClicks';

// The design's background: pink top left, gold top right, coral at the bottom, on white.
const SECTION_CLASS =
    'relative overflow-x-clip bg-white bg-[radial-gradient(42%_52%_at_12%_18%,rgba(248,154,176,0.28),transparent_70%),radial-gradient(40%_50%_at_92%_22%,rgba(252,186,99,0.3),transparent_70%),radial-gradient(50%_60%_at_70%_100%,rgba(255,118,95,0.16),transparent_70%)] text-[#151313]';

// The landing's hero visual: as wide as the landing's phone under 768 px (the section clips the overflow),
// overlapping the copy column's edge from 768 to 900, half the grid from 901 up.
const VISUAL_CLASS = [
    'left-1/2 mt-5.5 ml-[3.7vw] w-[137vw] -translate-x-1/2',
    'min-[768px]:left-0 min-[768px]:mt-2.5 min-[768px]:ml-[max(-20px_-_9vw,50%_-_310px)] min-[768px]:w-[min(620px,118vw)] min-[768px]:translate-x-[3%]',
    'min-[901px]:my-[-3%] min-[901px]:ml-0 min-[901px]:w-[min(860px,54vw)] min-[901px]:justify-self-center',
].join(' ');

export type HeroViewProps = {
    alternatePaths: Record<Locale, string>;
    breadcrumb: { current: string; label: string };
    header: { links: { href: string; label: string; mobileLabel: string }[]; loginLabel: string; mobileLoginLabel: string };
    homeHref: string;
    kicker: ReactNode;
    // The h1: the page's keyword.
    title: ReactNode;
    subtitle: string;
    body: string;
    actions: { createHref: string; createLabel: string; plansLabel: string; secondary: HeroSecondaryLink | null };
    // The QR wedding page while it is live and the page links to it, else null.
    qrLink: { href: string; label: string } | null;
    trust: string[];
    // An occasion's own phone feed and post cards; empty → the landing's.
    visual: { feed?: ReactNode; posts?: readonly [ReactNode, ReactNode] };
};

export function HeroView({ actions, alternatePaths, body, breadcrumb, header, homeHref, kicker, qrLink, subtitle, title, trust, visual }: HeroViewProps) {
    return (
        <section className={SECTION_CLASS}>
            {/* Header, on the hero's background */}
            <LandingHeader
                alternatePaths={alternatePaths}
                className="bg-transparent min-[761px]:backdrop-blur-none"
                homeHref={homeHref}
                links={header.links}
                loginLabel={header.loginLabel}
                mobileLoginLabel={header.mobileLoginLabel}
            />

            {/* Body: on phones the bottom padding makes room for the phone and cards hanging about 25vw below the visual */}
            <div className="pt-6.5 pb-[calc(25.5vw+16px)] min-[421px]:pt-0 min-[761px]:pb-9 min-[768px]:pt-1.5 min-[768px]:pb-10 min-[901px]:pt-9.5 min-[901px]:pb-22.5">
                <div className="mx-auto grid w-[calc(100%-40px)] grid-cols-1 items-center min-[768px]:w-[min(1220px,calc(100%-64px))] min-[768px]:gap-[clamp(20px,3vw,48px)] min-[901px]:grid-cols-2">
                    {/* Copy */}
                    <div className="relative z-20">
                        {/* Breadcrumb */}
                        <nav aria-label={breadcrumb.label} className="mb-3.5 min-[768px]:mb-4.5 min-[768px]:ml-1">
                            <ol className="m-0 flex list-none items-center gap-2 p-0 text-[11px] leading-[normal] font-bold tracking-[0.06em] text-[#151313]/55 uppercase">
                                <li>
                                    <a className="text-[#151313] no-underline hover:underline" href={homeHref}>
                                        StoryWall
                                    </a>
                                </li>
                                <li aria-hidden="true">›</li>
                                <li aria-current="page">{breadcrumb.current}</li>
                            </ol>
                        </nav>
                        {/* Kicker */}
                        <p className="mt-0 mb-4 text-[12px] leading-[1.2] font-medium tracking-[-0.02em] uppercase min-[768px]:mb-5.5 min-[768px]:ml-1 min-[768px]:text-[clamp(13px,0.9vw,16px)]">
                            {kicker}
                        </p>
                        {/* Title */}
                        <h1 className="m-0 [font-family:var(--editorial)] text-[clamp(37px,9vw,45px)] leading-[1.1] font-normal tracking-[-0.045em] min-[768px]:text-[clamp(50px,5.2vw,92px)] min-[768px]:leading-[0.91] min-[768px]:tracking-[-0.055em]">
                            {title}
                        </h1>
                        {/* Subtitle */}
                        <p className="mt-5 mb-0 font-[Georgia,serif] text-[18px] leading-[1.3] min-[768px]:mt-6.5 min-[768px]:ml-1 min-[768px]:max-w-130 min-[768px]:text-[clamp(17px,1.35vw,21px)] min-[768px]:leading-[1.4]">
                            {subtitle}
                        </p>
                        {/* Body */}
                        <p className="mt-3.5 mb-0 text-[15px] leading-[1.55] text-[#151313]/74 min-[768px]:ml-1 min-[768px]:max-w-[min(460px,40vw)]">{body}</p>
                        {/* Actions */}
                        <OccasionHeroActions
                            createHref={actions.createHref}
                            createLabel={actions.createLabel}
                            plansLabel={actions.plansLabel}
                            secondary={actions.secondary}
                        />
                        {/* QR page link */}
                        {qrLink ? (
                            <a
                                className="mt-3.5 inline-block text-[13px] font-semibold text-[#151313] underline underline-offset-3 focus-ring min-[768px]:mt-4.5 min-[768px]:ml-1"
                                href={qrLink.href}
                                {...qrLinkAttributes('hero')}
                            >
                                {qrLink.label}
                                <span aria-hidden="true"> →</span>
                            </a>
                        ) : null}
                        {/* Trust line */}
                        <p className="mt-4.25 mb-0 flex flex-wrap gap-y-1.25 text-[10px] leading-[1.4] font-bold tracking-[0.035em] text-[#151313]/66 min-[768px]:mt-6 min-[768px]:ml-1 min-[768px]:gap-y-1.75 min-[768px]:text-[11px] min-[768px]:leading-[1.25]">
                            {trust.map((item, index) => (
                                <Fragment key={item}>
                                    {index > 0 ? (
                                        <span aria-hidden="true" className="mx-2.5">
                                            ·
                                        </span>
                                    ) : null}
                                    <span>{item}</span>
                                </Fragment>
                            ))}
                        </p>
                    </div>

                    {/* Visual: the phone feed and floating cards */}
                    <OccasionHeroVisual className={VISUAL_CLASS} feed={visual.feed} posts={visual.posts} />
                </div>
            </div>
        </section>
    );
}
```

Before relying on that shape, check `LandingHeader`'s `links` prop type: `rg -n "links" components/landing/LandingHeader.tsx`. If the type is exported, use it instead of the inline one.

- [ ] **Step 4: Write `components/occasions/sections/hero/heroViewProps.tsx`**

```tsx
import type { ReactNode } from 'react';

import type { HeroViewProps } from '@/components/occasions/sections/hero/HeroView';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { occasionHeroSecondary } from '@/lib/landingHero';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';
import type { PageTranslator } from '@/lib/occasions/pageCopy';

type HeroViewPropsInput = {
    alternatePaths: Record<Locale, string>;
    // OccasionPages.campaigns.<id> while a campaign swaps the body and CTA, else null.
    campaign: PageTranslator | null;
    // OccasionPages.common
    common: PageTranslator;
    createHref: string;
    demoHref: string | null;
    // LandingPage
    landing: PageTranslator;
    locale: Locale;
    // OccasionPages.<type>
    page: PageTranslator;
    price: OccasionPriceValues;
    qrHref: string | null;
    themesHref: string | null;
    visual: HeroViewProps['visual'];
};

// The hero's copy and links. The h1 always stays the keyword, whatever the campaign.
export function heroViewProps({ alternatePaths, campaign, common, createHref, demoHref, landing, locale, page, price, qrHref, themesHref, visual }: HeroViewPropsInput): HeroViewProps {
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;

    return {
        alternatePaths,
        breadcrumb: { current: page('hero.breadcrumb'), label: common('breadcrumbLabel') },
        header: { links: occasionHeaderLinks(nav, mobileNav, landing('faq.eyebrow')), loginLabel: nav.at(-1)!, mobileLoginLabel: mobileNav.at(-1)! },
        homeHref: getPublicLandingPath(locale),
        kicker: page.rich('hero.kicker', { b: bold }),
        title: page.rich('hero.h1', {
            em: (chunks) => <em className="[background-image:var(--brand-gradient)] bg-clip-text text-transparent italic min-[768px]:pr-[0.06em]">{chunks}</em>,
        }),
        subtitle: page('hero.subtitle'),
        body: campaign ? campaign('lead') : page('hero.body'),
        actions: {
            createHref,
            createLabel: campaign ? campaign('cta') : page('hero.cta'),
            plansLabel: landing('hero.plansCta'),
            secondary: occasionHeroSecondary(
                demoHref ? { href: demoHref, label: common('heroDemo') } : null,
                themesHref ? { href: themesHref, label: page('hero.themesCta') } : null,
            ),
        },
        qrLink: qrHref ? { href: qrHref, label: page('hero.qrLink') } : null,
        // "From 119€" only when config gave a price.
        trust: [...(page.raw('hero.trust') as string[]), ...(price.range === 'none' ? [] : [page('hero.trustPrice', price)])],
        visual,
    };
}
```

- [ ] **Step 5: Write `HeroFeedShot.tsx` and `heroVisual.tsx`**

`components/occasions/sections/hero/HeroFeedShot.tsx`:

```tsx
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LANDING_HERO_FEED_SIZES } from '@/lib/landingHero';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// An occasion's own feed screenshot, scrolling in the hero phone like the landing's.
export function HeroFeedShot({ alt, photo }: { alt: string; photo: OccasionPhoto }) {
    return (
        <ProtectedImage
            alt={alt}
            className="relative block h-auto w-full max-w-none"
            // The first thing the page paints, so it loads at once.
            fetchPriority="high"
            height={photo.height}
            loading="eager"
            sizes={LANDING_HERO_FEED_SIZES}
            src={photo.src}
            width={photo.width}
        />
    );
}
```

`components/occasions/sections/hero/heroVisual.tsx`:

```tsx
import { OccasionPostCard } from '@/components/occasions/OccasionPostCard';
import { HeroFeedShot } from '@/components/occasions/sections/hero/HeroFeedShot';
import type { HeroViewProps } from '@/components/occasions/sections/hero/HeroView';
import type { OccasionHeroMedia } from '@/lib/occasions/pageMedia';

// The hero phone's feed and the two post cards beside it, from an occasion's own pictures.
export function heroVisual(hero: OccasionHeroMedia, feedAlt: string): HeroViewProps['visual'] {
    const [left, right] = hero.posts;
    return {
        feed: <HeroFeedShot alt={feedAlt} photo={hero.feed} />,
        posts: [
            <OccasionPostCard avatar={left.avatar} key="left" photo={left.photo} tilt="left" />,
            <OccasionPostCard avatar={right.avatar} key="right" photo={right.photo} tilt="right" />,
        ],
    };
}
```

- [ ] **Step 6: Write `components/occasions/sections/HeroSection.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import { heroViewProps } from '@/components/occasions/sections/hero/heroViewProps';
import { HeroView } from '@/components/occasions/sections/hero/HeroView';
import { heroVisual } from '@/components/occasions/sections/hero/heroVisual';
import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type HeroSectionProps = {
    campaign: OccasionCampaign | null;
    createHref: string;
    // null: no demo; the second button goes to the themes, or there is none.
    demoHref: string | null;
    locale: Locale;
    media: OccasionPageMedia;
    occasion: Occasion;
    price: OccasionPriceValues;
    // The QR wedding page while it is live and the page links to it, else null.
    qrHref: string | null;
    // "#themes" while the page shows its Themes section, else null.
    themesHref: string | null;
};

export async function HeroSection({ campaign, createHref, demoHref, locale, media, occasion, price, qrHref, themesHref }: HeroSectionProps) {
    const [page, common, landing] = await Promise.all([
        getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` }),
        getTranslations({ locale, namespace: 'OccasionPages.common' }),
        getTranslations({ locale, namespace: 'LandingPage' }),
    ]);
    const campaignCopy = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;

    return (
        <HeroView
            {...heroViewProps({
                alternatePaths: occasionAlternatePaths(occasion),
                campaign: campaignCopy,
                common,
                createHref,
                demoHref,
                landing,
                locale,
                page,
                price,
                qrHref,
                themesHref,
                visual: media.hero ? heroVisual(media.hero, page('hero.feedAlt')) : {},
            })}
        />
    );
}
```

- [ ] **Step 7: Use it in `WeddingContent` and delete `WeddingHero`**

In `components/occasions/wedding/WeddingContent.tsx`, swap the import and the JSX:

```tsx
                {/* Hero */}
                <HeroSection
                    campaign={campaign}
                    createHref={createHref}
                    demoHref={demoHref}
                    locale={locale}
                    media={WEDDING_PAGE_MEDIA}
                    occasion={occasion}
                    price={price}
                    qrHref={qrHref}
                    themesHref={null}
                />
```

```powershell
git rm components/occasions/wedding/WeddingHero.tsx
```

- [ ] **Step 8: Run the tests and type-check**

Run: `npx vitest run components/occasions; npx tsc --noEmit`
Expected: PASS. Every moved wedding case passes unchanged, plus the new one.

- [ ] **Step 9: Commit**

```powershell
git add components/occasions
git commit -m "KAN-252: Shared hero section for occasion pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Why section, with a still row of guest photos

**Files:**
- Create: `components/occasions/sections/why/WhyGuestTile.tsx`, `WhyPhotoRow.tsx`, `WhyView.tsx`, `whyViewProps.tsx`, `WhyPhotoRow.test.tsx`
- Modify: `components/occasions/sections/why/WhyMarquee.tsx` (uses `WhyGuestTile`)
- Create: `components/occasions/sections/WhySection.tsx`
- Move: `components/occasions/wedding/WeddingWhy.test.tsx` → `components/occasions/sections/WhySection.test.tsx`
- Delete: `components/occasions/wedding/WeddingWhy.tsx`

- [ ] **Step 1: Write the failing tests**

```powershell
git mv components/occasions/wedding/WeddingWhy.test.tsx components/occasions/sections/WhySection.test.tsx
```

In the moved file:
- import `WhySection`, `findOccasion` and `WEDDING_PAGE_MEDIA`;
- rename the describe to `'WhySection (wedding)'`;
- replace the `renderWhy` body with:

```tsx
    return render(
        <LandingMotionProvider>
            {await WhySection({ guestPhotos: 'marquee', locale: 'el', media: WEDDING_PAGE_MEDIA, occasion: findOccasion('WEDDING')!, qrHref })}
        </LandingMotionProvider>,
    );
```

`components/occasions/sections/why/WhyPhotoRow.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WhyPhotoRow } from '@/components/occasions/sections/why/WhyPhotoRow';

const photo = (name: string) => ({ src: `/landing/${name}.webp`, width: 460, height: 600 });
const TILES = ['a', 'b', 'c'].map((name) => ({
    alt: `Photo ${name}`,
    avatar: photo(`avatar-${name}`),
    avatarAlt: `Face ${name}`,
    name: `Name ${name}`,
    photo: photo(name),
    role: 'aunt',
}));

afterEach(cleanup);

describe('WhyPhotoRow', () => {
    it('shows each photo once, named, with who posted it', () => {
        render(<WhyPhotoRow tiles={TILES} />);
        expect(screen.getAllByRole('img', { name: /^Photo / }).map((image) => image.getAttribute('alt'))).toEqual(['Photo a', 'Photo b', 'Photo c']);
        expect(screen.getByText('Name b')).toBeInTheDocument();
    });

    it('stands still and centred, the middle tile lower', () => {
        const { container } = render(<WhyPhotoRow tiles={TILES} />);
        expect(container.firstElementChild).toHaveClass('flex', 'justify-center', 'overflow-hidden');
        expect(container.querySelectorAll('[class*="even:mt-7.5"]')).toHaveLength(3);
    });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run components/occasions/sections/WhySection.test.tsx components/occasions/sections/why/WhyPhotoRow.test.tsx`
Expected: FAIL, the modules are not found.

- [ ] **Step 3: Pull the tile out of the marquee**

`components/occasions/sections/why/WhyGuestTile.tsx`. The markup is the marquee's tile, unchanged:

```tsx
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { MockPhoto } from '@/components/occasions/sections/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

export type WhyGuestTileData = { alt: string; avatar: OccasionPhoto; avatarAlt: string; name: string; photo: OccasionPhoto; role: string };

// One guest's photo with a pill naming who posted it. Every second tile sits lower.
export function WhyGuestTile({ tile }: { tile: WhyGuestTileData }) {
    return (
        <div className="relative h-[clamp(228px,67vw,275px)] w-[clamp(168px,52vw,210px)] flex-none overflow-hidden rounded-3xl even:mt-7.5 min-[601px]:h-60 min-[601px]:w-45 min-[861px]:h-75 min-[861px]:w-57.5">
            <ProtectedImage
                alt={tile.alt}
                className="size-full object-cover"
                height={tile.photo.height}
                loading="lazy"
                sizes="(min-width: 861px) 230px, (min-width: 601px) 180px, 52vw"
                src={tile.photo.src}
                width={tile.photo.width}
            />
            {/* Who posted it; the photo's name already says it */}
            <div aria-hidden="true" className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-full bg-white/94 py-1.5 pr-3 pl-1.5 text-[12px]">
                <MockPhoto alt={tile.avatarAlt} className="size-7 flex-none rounded-full" photo={tile.avatar} sizes="28px" />
                <span className="truncate">
                    <b>{tile.name}</b> · {tile.role}
                </span>
            </div>
        </div>
    );
}
```

In `WhyMarquee.tsx`:
- remove the `WhyMarqueeTile` type and the `OccasionGuestPhotoCopy`, `ProtectedImage`, `MockPhoto` and `OccasionPhoto` imports;
- import `WhyGuestTile` and `type WhyGuestTileData`;
- type the tiles as `WhyGuestTileData[]`;
- make `Tiles` render:

```tsx
        <div aria-hidden={hidden || undefined} className="flex gap-4 pr-4">
            {tiles.map((tile) => (
                <WhyGuestTile key={tile.photo.src} tile={tile} />
            ))}
        </div>
```

`components/occasions/sections/why/WhyPhotoRow.tsx`:

```tsx
import { WhyGuestTile, type WhyGuestTileData } from '@/components/occasions/sections/why/WhyGuestTile';

// A few guests' photos standing still in one centred row, the middle one lower. On a phone the
// outer ones run off the edges, as in the design.
export function WhyPhotoRow({ tiles }: { tiles: WhyGuestTileData[] }) {
    return (
        <div className="mt-6 flex justify-center overflow-hidden pl-2">
            <div className="flex w-max pb-7.5">
                <div className="flex gap-4 pr-4">
                    {tiles.map((tile) => (
                        <WhyGuestTile key={tile.photo.src} tile={tile} />
                    ))}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Write the view and its props builder**

`components/occasions/sections/why/WhyView.tsx`. The markup and classes are `WeddingWhy`'s:

```tsx
import type { ReactNode } from 'react';

import { SectionHead } from '@/components/occasions/sections/SectionHead';
import { SectionWrap } from '@/components/occasions/sections/SectionWrap';
import type { WhyGuestTileData } from '@/components/occasions/sections/why/WhyGuestTile';
import { WhyMarquee } from '@/components/occasions/sections/why/WhyMarquee';
import { WhyPhotoRow } from '@/components/occasions/sections/why/WhyPhotoRow';
import { WhyQrSteps } from '@/components/occasions/sections/why/WhyQrSteps';
import { WhyStats } from '@/components/occasions/sections/why/WhyStats';
import { WHY_LABEL_CLASS, WhyWithout } from '@/components/occasions/sections/why/WhyWithout';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { OccasionStatCopy } from '@/lib/occasions/pageCopy';
import { cn } from '@/lib/utils';

export type WhyViewProps = {
    heading: [string, string];
    kicker: string;
    without: { bubbles: [string, string]; items: string[]; label: string; photos: readonly OccasionPhoto[] };
    with: {
        label: string;
        subtitle: string;
        // The QR row; its first step links to the QR page while `href` is set.
        qr: { alt: string; href: string | null; photo: OccasionPhoto; steps: { body: ReactNode; title: string }[] };
        guestPhotos: { layout: 'marquee' | 'row'; tiles: WhyGuestTileData[] };
        stats: { chips: string[]; example: string; stats: OccasionStatCopy[] };
    };
};

// Why StoryWall: the photos lost without it, then the same occasion with it.
export function WhyView({ heading, kicker, with: withStoryWall, without }: WhyViewProps) {
    const { guestPhotos, qr, stats } = withStoryWall;

    return (
        <section
            aria-labelledby="why-title"
            className="bg-white py-17.5 font-[Arial,Helvetica,sans-serif] leading-[normal] text-[#151313] min-[861px]:pt-22.5 min-[861px]:pb-25"
        >
            <SectionWrap>
                {/* Heading */}
                <SectionHead
                    className="mb-11.5 max-w-245"
                    heading={heading}
                    headingClassName="text-[clamp(38px,4.2vw,68px)] leading-[0.97] tracking-[-0.045em]"
                    id="why-title"
                    kicker={kicker}
                />
                {/* Without StoryWall */}
                <WhyWithout bubbles={without.bubbles} items={without.items} label={without.label} photos={without.photos} />
            </SectionWrap>

            <SectionWrap>
                {/* With StoryWall */}
                <div className="mt-5.5 overflow-hidden rounded-[30px] bg-[#f4f0e8] pt-7.5 pb-8.5">
                    <p className={cn(WHY_LABEL_CLASS, 'text-center text-[#ff765f]')}>{withStoryWall.label}</p>
                    <p className="mx-4.5 mt-4 mb-7.5 text-center [font-family:var(--editorial)] text-[24px] leading-[1.22] tracking-[-0.025em] min-[761px]:mx-auto min-[761px]:mt-4.5 min-[761px]:mb-9 min-[761px]:max-w-237.5 min-[761px]:text-[clamp(24px,2.35vw,32px)]">
                        {withStoryWall.subtitle}
                    </p>
                    {/* QR row */}
                    <WhyQrSteps alt={qr.alt} photo={qr.photo} qrHref={qr.href} steps={qr.steps} />
                    {/* Guests' photos */}
                    {guestPhotos.layout === 'row' ? <WhyPhotoRow tiles={guestPhotos.tiles} /> : <WhyMarquee tiles={guestPhotos.tiles} />}
                    {/* Example and points */}
                    <WhyStats chips={stats.chips} example={stats.example} stats={stats.stats} />
                </div>
            </SectionWrap>
        </section>
    );
}
```

`components/occasions/sections/why/whyViewProps.tsx`:

```tsx
import type { ReactNode } from 'react';

import type { WhyViewProps } from '@/components/occasions/sections/why/WhyView';
import type { OccasionGuestPhotoCopy, OccasionStatCopy, PageTranslator } from '@/lib/occasions/pageCopy';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type WhyViewPropsInput = {
    // ImageAlt
    imageAlt: PageTranslator;
    layout: 'marquee' | 'row';
    media: OccasionPageMedia;
    qrHref: string | null;
    // OccasionPages.<type>.why
    why: PageTranslator;
};

export function whyViewProps({ imageAlt, layout, media, qrHref, why }: WhyViewPropsInput): WhyViewProps {
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const photos = why.raw('with.marquee') as OccasionGuestPhotoCopy[];

    return {
        heading: why.raw('heading') as [string, string],
        kicker: why('kicker'),
        without: {
            bubbles: why.raw('without.bubbles') as [string, string],
            items: why.raw('without.items') as string[],
            label: why('without.label'),
            photos: media.withoutPhotos,
        },
        with: {
            label: why('with.label'),
            subtitle: why('with.subtitle'),
            qr: {
                alt: why('with.qrAlt'),
                href: qrHref,
                photo: media.qrPhoto,
                steps: (why.raw('with.steps') as { title: string }[]).map((step, index) => ({
                    title: step.title,
                    body: why.rich(`with.steps.${index}.body`, { b: bold }),
                })),
            },
            guestPhotos: {
                layout,
                tiles: photos.map((copy, index) => ({
                    ...media.guestPhotos[index]!,
                    alt: copy.alt ?? why('with.photoAlt', { moment: copy.moment ?? '', name: copy.name, role: copy.role }),
                    avatarAlt: imageAlt('profilePhotoOf', { name: copy.name }),
                    name: copy.name,
                    role: copy.role,
                })),
            },
            stats: {
                chips: why.raw('with.chips') as string[],
                example: why('with.example'),
                stats: why.raw('with.stats') as OccasionStatCopy[],
            },
        },
    };
}
```

- [ ] **Step 5: Write `components/occasions/sections/WhySection.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import { whyViewProps } from '@/components/occasions/sections/why/whyViewProps';
import { WhyView } from '@/components/occasions/sections/why/WhyView';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type WhySectionProps = {
    guestPhotos: 'marquee' | 'row';
    locale: Locale;
    media: OccasionPageMedia;
    occasion: Occasion;
    // The QR wedding page while it is live and the page links to it, else null.
    qrHref: string | null;
};

export async function WhySection({ guestPhotos, locale, media, occasion, qrHref }: WhySectionProps) {
    const [why, imageAlt] = await Promise.all([
        getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.why` }),
        getTranslations({ locale, namespace: 'ImageAlt' }),
    ]);
    return <WhyView {...whyViewProps({ imageAlt, layout: guestPhotos, media, qrHref, why })} />;
}
```

- [ ] **Step 6: Use it in `WeddingContent` and delete `WeddingWhy`**

Replace `<WeddingWhy locale={locale} qrHref={qrHref} />` with `<WhySection guestPhotos="marquee" locale={locale} media={WEDDING_PAGE_MEDIA} occasion={occasion} qrHref={qrHref} />` and swap the import.

```powershell
git rm components/occasions/wedding/WeddingWhy.tsx
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run components/occasions; npx tsc --noEmit`
Expected: PASS. "names each marquee photo once" still finds 14 photos and the first name unchanged.

- [ ] **Step 8: Commit**

```powershell
git add components/occasions
git commit -m "KAN-252: Shared why section, with a still row of guest photos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: RSVP section

**Files:**
- Create: `components/occasions/sections/rsvp/RsvpView.tsx`, `rsvpViewProps.tsx`, `components/occasions/sections/RsvpSection.tsx`
- Modify: `components/occasions/sections/rsvp/RsvpPictures.tsx` (pictures come in as a prop)
- Move: `components/occasions/wedding/WeddingRsvp.test.tsx` → `components/occasions/sections/RsvpSection.test.tsx`
- Delete: `components/occasions/wedding/WeddingRsvp.tsx`

- [ ] **Step 1: Move the test and point it at `RsvpSection`**

```powershell
git mv components/occasions/wedding/WeddingRsvp.test.tsx components/occasions/sections/RsvpSection.test.tsx
```

Replace every `await WeddingRsvp({ locale: 'el' })` with `await rsvp('el')` and every `await WeddingRsvp({ locale: 'en' })` with `await rsvp('en')`. Add this helper with its imports (`RsvpSection`, `findOccasion`, `WEDDING_PAGE_MEDIA`, `type Locale`):

```tsx
const rsvp = (locale: Locale) => RsvpSection({ locale, media: WEDDING_PAGE_MEDIA, occasion: findOccasion('WEDDING')! });
```

Rename the describe to `'RsvpSection (wedding)'`.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/occasions/sections/RsvpSection.test.tsx`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Let `RsvpPictures` take its pictures**

```tsx
import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionRsvpPictures } from '@/lib/occasions/pageMedia';

type RsvpPicturesProps = { alts: { both: string; with: string; without: string }; pictures: OccasionRsvpPictures };

// Replies without and with StoryWall: one wide picture from 761 px, the two halves stacked below.
export function RsvpPictures({ alts, pictures }: RsvpPicturesProps) {
    const { both, with: after, without } = pictures;
```

Leave the rest of the file unchanged.

- [ ] **Step 4: Write the view, the props builder and the section**

`components/occasions/sections/rsvp/RsvpView.tsx`. The markup and classes are `WeddingRsvp`'s, and the id is now `rsvp-title`:

```tsx
import type { ReactNode } from 'react';

import { RsvpChecklist } from '@/components/occasions/sections/rsvp/RsvpChecklist';
import { RsvpPictures } from '@/components/occasions/sections/rsvp/RsvpPictures';
import type { OccasionCardCopy } from '@/lib/occasions/pageCopy';
import type { OccasionRsvpPictures } from '@/lib/occasions/pageMedia';

export type RsvpViewProps = {
    alts: { both: string; with: string; without: string };
    checklist: { items: OccasionCardCopy[]; pill: string };
    heading: [string, string];
    intro: ReactNode;
    kicker: string;
    pictures: OccasionRsvpPictures;
};

// RSVP: replies scattered across apps against StoryWall's form, list and stats, on a pink panel.
export function RsvpView({ alts, checklist, heading, intro, kicker, pictures }: RsvpViewProps) {
    return (
        <section aria-labelledby="rsvp-title" className="bg-white pt-5.5 pb-15 font-[Arial,Helvetica,sans-serif] text-[#151313]">
            <div className="mx-auto w-[calc(100%-36px)] rounded-[22px] bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)] px-3 pt-9 pb-5 min-[761px]:w-[min(1220px,calc(100%-64px))] min-[761px]:rounded-[30px] min-[761px]:px-[clamp(16px,2.6vw,36px)] min-[761px]:pt-[clamp(40px,5vw,70px)] min-[761px]:pb-[clamp(30px,3.5vw,48px)]">
                {/* Heading */}
                <div className="mx-auto mb-[clamp(28px,3.5vw,46px)] max-w-250 text-center">
                    <p className="mt-0 mb-4.5 text-[11px] font-extrabold tracking-[0.16em] text-[#ff765f] uppercase">{kicker}</p>
                    <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(36px,4.4vw,68px)] leading-[1.02] font-normal tracking-[-0.04em]" id="rsvp-title">
                        {heading[0]}{' '}
                        <span className="mx-auto block w-fit [background-image:var(--brand-gradient)] bg-clip-text pb-[0.08em] text-transparent">{heading[1]}</span>
                    </h2>
                    <p className="mx-auto mt-5.5 mb-0 max-w-160 text-[clamp(16px,1.45vw,19px)] leading-[1.55] text-[#6f6a64]">{intro}</p>
                </div>
                {/* Pictures and points */}
                <div className="grid grid-cols-1 items-stretch gap-[clamp(14px,1.8vw,26px)] min-[901px]:grid-cols-[minmax(0,1022fr)_minmax(0,370fr)]">
                    <RsvpPictures alts={alts} pictures={pictures} />
                    <RsvpChecklist items={checklist.items} pill={checklist.pill} />
                </div>
            </div>
        </section>
    );
}
```

`components/occasions/sections/rsvp/rsvpViewProps.tsx`:

```tsx
import type { ReactNode } from 'react';

import type { RsvpViewProps } from '@/components/occasions/sections/rsvp/RsvpView';
import type { OccasionCardCopy, PageTranslator } from '@/lib/occasions/pageCopy';
import type { OccasionRsvpPictures } from '@/lib/occasions/pageMedia';

// rsvp: OccasionPages.<type>.rsvp. The intro may bold a few words (<b>).
export function rsvpViewProps(rsvp: PageTranslator, pictures: OccasionRsvpPictures): RsvpViewProps {
    return {
        alts: { both: rsvp('alts.both'), with: rsvp('alts.with'), without: rsvp('alts.without') },
        checklist: { items: rsvp.raw('checklist.items') as OccasionCardCopy[], pill: rsvp('checklist.pill') },
        heading: rsvp.raw('heading') as [string, string],
        intro: rsvp.rich('intro', { b: (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong> }),
        kicker: rsvp('kicker'),
        pictures,
    };
}
```

`components/occasions/sections/RsvpSection.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { rsvpViewProps } from '@/components/occasions/sections/rsvp/rsvpViewProps';
import { RsvpView } from '@/components/occasions/sections/rsvp/RsvpView';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

export async function RsvpSection({ locale, media, occasion }: { locale: Locale; media: OccasionPageMedia; occasion: Occasion }) {
    const rsvp = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.rsvp` });
    return <RsvpView {...rsvpViewProps(rsvp, media.rsvpPictures[locale])} />;
}
```

- [ ] **Step 5: Use it in `WeddingContent` and delete `WeddingRsvp`**

Replace `<WeddingRsvp locale={locale} />` with `<RsvpSection locale={locale} media={WEDDING_PAGE_MEDIA} occasion={occasion} />` and swap the import. Then run `git rm components/occasions/wedding/WeddingRsvp.tsx`.

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run components/occasions; npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add components/occasions
git commit -m "KAN-252: Shared RSVP section" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Private section

**Files:**
- Create: `components/occasions/sections/private/PrivateView.tsx`, `privateViewProps.ts`, `components/occasions/sections/PrivateSection.tsx`
- Move: `components/occasions/wedding/WeddingPrivate.test.tsx` → `components/occasions/sections/PrivateSection.test.tsx`
- Delete: `components/occasions/wedding/WeddingPrivate.tsx`

- [ ] **Step 1: Move the test and point it at `PrivateSection`**

```powershell
git mv components/occasions/wedding/WeddingPrivate.test.tsx components/occasions/sections/PrivateSection.test.tsx
```

Replace `await WeddingPrivate({ locale: 'el' })` with `await PrivateSection({ locale: 'el', occasion: findOccasion('WEDDING')! })`. Import `PrivateSection` and `findOccasion`. Rename the describe to `'PrivateSection (wedding)'`.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/occasions/sections/PrivateSection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write the view, the props builder and the section**

`components/occasions/sections/private/PrivateView.tsx`. The markup and classes are `WeddingPrivate`'s, and the id is now `private-title`:

```tsx
import { GradientIcon } from '@/components/occasions/sections/mock/GradientIcon';
import { SectionHead } from '@/components/occasions/sections/SectionHead';
import { SectionWrap } from '@/components/occasions/sections/SectionWrap';
import type { OccasionCardCopy } from '@/lib/occasions/pageCopy';
import { OCCASION_PRIVATE_ICONS } from '@/lib/occasions/pageFeatures';

export type PrivateViewProps = { cards: OccasionCardCopy[]; heading: [string, string]; intro: string; kicker: string };

// "Only for guests": four numbered cards on what keeps the occasion's social private.
export function PrivateView({ cards, heading, intro, kicker }: PrivateViewProps) {
    return (
        <section
            aria-labelledby="private-title"
            className="bg-white pt-17.5 pb-20 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[561px]:pt-25 min-[561px]:pb-27.5"
        >
            <SectionWrap>
                {/* Heading */}
                <SectionHead
                    className="mb-9 min-[561px]:mb-15"
                    heading={heading}
                    headingClassName="text-[clamp(40px,4.4vw,72px)] leading-[0.95] tracking-[-0.05em]"
                    id="private-title"
                    kicker={kicker}
                >
                    <p className="mx-auto mt-5.5 mb-0 max-w-160 font-[Georgia,serif] text-[clamp(17px,1.3vw,20px)] leading-[1.45] text-[#151313]/78">{intro}</p>
                </SectionHead>
                {/* Cards */}
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[561px]:gap-4.5 min-[601px]:grid-cols-2 min-[1001px]:grid-cols-4">
                    {cards.map((card, index) => (
                        <li
                            className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)] px-6.5 pt-7.5 pb-8.5"
                            key={card.title}
                        >
                            <span
                                aria-hidden="true"
                                className="absolute top-1.5 right-4.5 [background-image:var(--brand-gradient)] bg-clip-text [font-family:var(--editorial)] text-[72px] leading-none text-transparent opacity-90 min-[561px]:text-[92px]"
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {/* A filter on a masked element is masked away, so the shadow is on a wrapper */}
                            <span className="mb-6 block w-fit drop-shadow-[0_4px_8px_rgba(230,126,105,0.14)]">
                                <GradientIcon className="size-14" src={OCCASION_PRIVATE_ICONS[index]!} />
                            </span>
                            <h3 className="relative mt-0 mb-2.5 [font-family:var(--editorial)] text-[clamp(24px,1.9vw,29px)] leading-[1.05] font-normal tracking-[-0.035em]">
                                {card.title}
                            </h3>
                            <p className="relative m-0 text-[15px] leading-[1.55] text-[#151313]/74">{card.body}</p>
                        </li>
                    ))}
                </ul>
            </SectionWrap>
        </section>
    );
}
```

`components/occasions/sections/private/privateViewProps.ts`:

```ts
import type { PrivateViewProps } from '@/components/occasions/sections/private/PrivateView';
import type { OccasionCardCopy, PageTranslator } from '@/lib/occasions/pageCopy';

// copy: OccasionPages.<type>.private
export function privateViewProps(copy: PageTranslator): PrivateViewProps {
    return {
        cards: copy.raw('cards') as OccasionCardCopy[],
        heading: copy.raw('heading') as [string, string],
        intro: copy('intro'),
        kicker: copy('kicker'),
    };
}
```

`components/occasions/sections/PrivateSection.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { privateViewProps } from '@/components/occasions/sections/private/privateViewProps';
import { PrivateView } from '@/components/occasions/sections/private/PrivateView';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export async function PrivateSection({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const copy = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.private` });
    return <PrivateView {...privateViewProps(copy)} />;
}
```

- [ ] **Step 4: Use it in `WeddingContent` and delete `WeddingPrivate`**

Replace `<WeddingPrivate locale={locale} />` with `<PrivateSection locale={locale} occasion={occasion} />` and swap the import. Then run `git rm components/occasions/wedding/WeddingPrivate.tsx`.

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run components/occasions; npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add components/occasions
git commit -m "KAN-252: Shared private section" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Features section

**Files:**
- Create: `components/occasions/sections/features/FeaturesView.tsx`, `featuresViewProps.ts`, `components/occasions/sections/FeaturesSection.tsx`
- Move: `components/occasions/wedding/WeddingFeatures.test.tsx` → `components/occasions/sections/FeaturesSection.test.tsx`
- Delete: `components/occasions/wedding/WeddingFeatures.tsx`

- [ ] **Step 1: Move the test and point it at `FeaturesSection`**

```powershell
git mv components/occasions/wedding/WeddingFeatures.test.tsx components/occasions/sections/FeaturesSection.test.tsx
```

Replace `WeddingFeatures({ featureKeys: [...], locale: 'el' })` with `FeaturesSection({ featureKeys: [...], locale: 'el', occasion: findOccasion('WEDDING')! })`. Rename the describe to `'FeaturesSection (wedding)'`. Add a case for the theme module, which must never show as a card:

```tsx
    it('never lists themes as a feature', async () => {
        render(await FeaturesSection({ featureKeys: ['invitation', 'theme'], locale: 'el', occasion: findOccasion('WEDDING')! }));
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/occasions/sections/FeaturesSection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write the view, the props builder and the section**

`components/occasions/sections/features/FeaturesView.tsx`. The markup and classes are `WeddingFeatures`'s, and the id is now `features-title`:

```tsx
import { GradientIcon } from '@/components/occasions/sections/mock/GradientIcon';
import { SectionHead } from '@/components/occasions/sections/SectionHead';
import { SectionWrap } from '@/components/occasions/sections/SectionWrap';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

export type FeaturesViewProps = {
    features: { body: string; icon: string; key: string; title: string }[];
    heading: [string, string];
    kicker: string;
};

// Everything the occasion website does, on the dark band: five per row from 1101 px, two below.
export function FeaturesView({ features, heading, kicker }: FeaturesViewProps) {
    return (
        <section
            aria-labelledby="features-title"
            className="bg-[#342525] bg-[radial-gradient(ellipse_at_14%_12%,rgba(174,78,67,0.3)_0%,transparent_44%),radial-gradient(ellipse_at_88%_78%,rgba(189,113,65,0.21)_0%,transparent_47%),linear-gradient(125deg,#3b2529_0%,#2e2328_42%,#302523_72%,#402a26_100%)] pt-17.5 pb-15.5 font-[Arial,Helvetica,sans-serif] text-white min-[601px]:pt-[clamp(75px,7vw,110px)] min-[601px]:pb-16.25 min-[761px]:pb-[clamp(70px,7vw,110px)]"
            id={OCCASION_SECTION_IDS.features}
            {...landingSectionAttributes('features')}
        >
            <SectionWrap>
                {/* Heading */}
                <SectionHead
                    className="mb-9 max-w-250 min-[761px]:mb-14"
                    heading={heading}
                    headingClassName="text-[clamp(36px,9vw,46px)] leading-[1.05] tracking-[-0.05em] min-[768px]:text-[clamp(40px,4.6vw,76px)] min-[768px]:leading-[0.95]"
                    id="features-title"
                    kicker={kicker}
                    kickerClassName="text-[#ffca52]"
                    stacked={false}
                />
                {/* Features */}
                <ul className="m-0 grid list-none grid-cols-2 gap-x-4.5 gap-y-8.5 p-0 min-[768px]:gap-x-5.5 min-[768px]:gap-y-7.5 min-[901px]:gap-x-[clamp(18px,2.2vw,34px)] min-[901px]:gap-y-[clamp(22px,3vw,44px)] min-[1101px]:grid-cols-5">
                    {features.map((feature) => (
                        <li className="min-w-0" key={feature.key}>
                            <span className="mb-3.75 block w-fit drop-shadow-[0_4px_8px_rgba(230,126,105,0.14)] min-[768px]:mb-4.5">
                                <GradientIcon className="size-12 min-[768px]:size-15.5" src={feature.icon} />
                            </span>
                            <h3 className="mt-0 mb-2 [font-family:var(--editorial)] text-[clamp(17px,4.7vw,22px)] leading-[1.12] font-normal tracking-[-0.03em] min-[768px]:text-[23px] min-[768px]:leading-[1.05]">
                                {feature.title}
                            </h3>
                            <p className="m-0 text-[clamp(12px,3.25vw,14px)] leading-[1.48] text-white/66 min-[768px]:text-[14px] min-[768px]:leading-[1.5]">{feature.body}</p>
                        </li>
                    ))}
                </ul>
            </SectionWrap>
        </section>
    );
}
```

`components/occasions/sections/features/featuresViewProps.ts`:

```ts
import type { FeaturesViewProps } from '@/components/occasions/sections/features/FeaturesView';
import type { PageTranslator } from '@/lib/occasions/pageCopy';
import { occasionPageFeatures } from '@/lib/occasions/pageFeatures';

type FeaturesViewPropsInput = {
    // OccasionPages.common
    common: PageTranslator;
    // What the plans offer (occasionFeatureKeys), so a module that is off is never advertised.
    featureKeys: string[];
    // OccasionPages.<type>
    page: PageTranslator;
};

// The occasion's own words per feature, else the shared line. A feature with neither is left out,
// and so are themes: a page that sells them has its own Themes section.
export function featuresViewProps({ common, featureKeys, page }: FeaturesViewPropsInput): FeaturesViewProps {
    const features = occasionPageFeatures(featureKeys.filter((key) => key !== 'theme')).flatMap((feature) => {
        const copy = page.has(`features.${feature.key}.title`) ? page : common.has(`features.${feature.key}.title`) ? common : null;
        if (!copy) return [];
        return [{ ...feature, title: copy(`features.${feature.key}.title`), body: copy(`features.${feature.key}.body`) }];
    });
    return { features, heading: page.raw('featuresHead.heading') as [string, string], kicker: page('featuresHead.kicker') };
}
```

`components/occasions/sections/FeaturesSection.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { featuresViewProps } from '@/components/occasions/sections/features/featuresViewProps';
import { FeaturesView } from '@/components/occasions/sections/features/FeaturesView';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export async function FeaturesSection({ featureKeys, locale, occasion }: { featureKeys: string[]; locale: Locale; occasion: Occasion }) {
    const [page, common] = await Promise.all([
        getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` }),
        getTranslations({ locale, namespace: 'OccasionPages.common' }),
    ]);
    return <FeaturesView {...featuresViewProps({ common, featureKeys, page })} />;
}
```

- [ ] **Step 4: Use it in `WeddingContent` and delete `WeddingFeatures`**

Replace `<WeddingFeatures featureKeys={featureKeys} locale={locale} />` with `<FeaturesSection featureKeys={featureKeys} locale={locale} occasion={occasion} />` and swap the import. Then run `git rm components/occasions/wedding/WeddingFeatures.tsx`.

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run components/occasions; npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add components/occasions
git commit -m "KAN-252: Shared features section" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Themes section (new)

This is the draft's `.swt` section, rewritten in Tailwind. Here is each draft rule and its Tailwind:

| Draft | Tailwind |
| --- | --- |
| `.swt` padding 58/20/60, ≥761: 72/5vw/78 | `px-5 pt-14.5 pb-15 min-[761px]:px-[5vw] min-[761px]:pt-18 min-[761px]:pb-19.5` |
| `.swt-in` 1220 grid gap 36, ≥761 cols 1.5fr/.85fr gap 5vw | `mx-auto grid max-w-305 items-center gap-9 min-[761px]:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)] min-[761px]:gap-[5vw]` |
| `.swt-eyebrow` | `mt-0 mb-4.5 text-[12px] font-black tracking-[0.15em] uppercase` |
| `.swt h2` | `m-0 [font-family:var(--editorial)] text-[clamp(42px,10.5vw,58px)] leading-[0.98] font-normal tracking-[-0.055em] min-[761px]:text-[clamp(54px,4.5vw,80px)]` |
| `.swt-lead` | `mt-5.5 mb-0 max-w-155 text-[18px] leading-[1.5] min-[761px]:text-[clamp(19px,1.3vw,23px)]` |
| `.swt-grid` 3 cols gap 12, ≥761 6 cols | `m-0 mt-7.5 grid list-none grid-cols-3 gap-3 p-0 min-[761px]:grid-cols-6` |
| `.swt-card` / `.swt-img` / `.swt-name` | see `ThemeTile` |
| `.swt-btn`, hover lift 3px, ≤420 full width | see `ThemesView` |
| `.swt-phone` / `.swt-cap` | see `ThemesPhone` |

**Files:**
- Create: `components/occasions/sections/themes/ThemeTile.tsx`, `ThemesPhone.tsx`, `ThemesView.tsx`, `themesViewProps.ts`, `ThemesView.test.tsx`
- Create: `components/occasions/sections/ThemesSection.tsx`
- Modify: `lib/landingTracking.ts` (add the `'themes'` section), `lib/occasions/occasionSections.ts` (add the `themes` id)

The landing's `LandingThemeTile` is not reused. It is a scrolling, fixed-width tile that cuts names short with an ellipsis. The draft's tile is a grid cell that wraps the name, with its own shadow and corners.

- [ ] **Step 1: Write the failing test**

`components/occasions/sections/themes/ThemesView.test.tsx`:

```tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemesView, type ThemesViewProps } from '@/components/occasions/sections/themes/ThemesView';

const THEMES = ['Rainbow', 'Unicorn'].map((name, index) => ({
    alt: `Baptism theme ${name}`,
    theme: { backgroundColor: '#f6eefb', id: `t${index}`, illustrationUrl: `/landing/decor-1${index}.webp`, name },
}));

function props(overrides: Partial<ThemesViewProps> = {}): ThemesViewProps {
    return {
        cta: { href: '/events/new?type=baptism', label: 'Create your StoryWall' },
        heading: ['Pick the theme', 'for the baptism.'],
        kicker: 'BAPTISM THEMES',
        lead: 'Unicorn, Little Prince and more.',
        phone: { alt: 'A baptism on the Unicorn theme', caption: 'This is a baptism on the Unicorn theme.', photo: { src: '/landing/baptism/baptism-feed-unicorn.webp', width: 978, height: 1764 } },
        tiles: THEMES,
        ...overrides,
    };
}

afterEach(cleanup);

describe('ThemesView', () => {
    it('is the page themes anchor, under one heading', () => {
        const { container } = render(<ThemesView {...props()} />);
        const section = container.querySelector('section')!;
        expect(section).toHaveAttribute('id', 'themes');
        expect(section).toHaveAttribute('data-landing-section', 'themes');
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Pick the theme for the baptism.');
    });

    it('shows each theme with its picture and name', () => {
        render(<ThemesView {...props()} />);
        const tiles = within(screen.getByRole('list')).getAllByRole('listitem');
        expect(tiles.map((tile) => tile.textContent)).toEqual(['Rainbow', 'Unicorn']);
        expect(screen.getByRole('img', { name: 'Baptism theme Unicorn' })).toBeInTheDocument();
    });

    it('leaves out the grid without themes and keeps the rest', () => {
        render(<ThemesView {...props({ tiles: [] })} />);
        expect(screen.queryByRole('list')).toBeNull();
        expect(screen.getByRole('link', { name: /Create your StoryWall/ })).toHaveAttribute('href', '/events/new?type=baptism');
        expect(screen.getByRole('img', { name: 'A baptism on the Unicorn theme' })).toBeInTheDocument();
    });

    it('counts the button as a create click from the themes', () => {
        render(<ThemesView {...props()} />);
        const link = screen.getByRole('link', { name: /Create your StoryWall/ });
        expect(JSON.parse(link.getAttribute('data-landing-click')!)).toEqual({ event: 'create', placement: 'themes' });
        expect(link).toHaveClass('hover:-translate-y-0.75', 'motion-reduce:transition-none');
    });

    it('shows the phone with its caption', () => {
        render(<ThemesView {...props()} />);
        expect(screen.getByText('This is a baptism on the Unicorn theme.').tagName).toBe('FIGCAPTION');
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/occasions/sections/themes/ThemesView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the section id and the tracking section**

In `lib/occasions/occasionSections.ts`, add `themes: 'themes',` to `OCCASION_SECTION_IDS`, after `features`. Update its comment to: `// The sections an occasion page links to: the header's links, and the hero and band to the themes. howItWorks, pricing and faq are the ids the shared landing sections render.`

In `lib/landingTracking.ts`, add `| 'themes'` to `LandingSection`, after `'features'`.

- [ ] **Step 4: Write the tile, the phone and the view**

`components/occasions/sections/themes/ThemeTile.tsx`:

```tsx
import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { LandingTheme } from '@/lib/landingThemes';

// One theme in the grid: its illustration on its own colour, the name under it.
export function ThemeTile({ alt, theme }: { alt: string; theme: LandingTheme }) {
    return (
        <li className="rounded-[20px] bg-white px-1.75 pt-1.75 pb-3 text-center shadow-[0_10px_24px_-14px_rgba(70,38,24,0.35)]">
            {/* Swatch */}
            <div className="relative aspect-square overflow-hidden rounded-[14px]" style={{ backgroundColor: theme.backgroundColor }}>
                <ProtectedImage alt={alt} className="object-contain" fill loading="lazy" sizes="(min-width: 761px) 150px, 30vw" src={theme.illustrationUrl} />
            </div>
            {/* Name */}
            <span className="mt-2.25 block text-[13px] leading-[1.25]">{theme.name}</span>
        </li>
    );
}
```

`components/occasions/sections/themes/ThemesPhone.tsx`:

```tsx
import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// A phone in a dark frame showing one event on a theme, with a line under it.
export function ThemesPhone({ alt, caption, photo }: { alt: string; caption: string; photo: OccasionPhoto }) {
    return (
        <figure className="m-0 justify-self-center">
            <div className="w-[min(300px,72vw)] overflow-hidden rounded-[38px] border-8 border-solid border-[#151313] bg-[#151313] shadow-[-16px_30px_40px_rgba(70,38,24,0.25)] min-[761px]:w-[min(330px,26vw)]">
                <ProtectedImage
                    alt={alt}
                    className="block h-auto w-full"
                    height={photo.height}
                    loading="lazy"
                    sizes="(min-width: 761px) 330px, 72vw"
                    src={photo.src}
                    width={photo.width}
                />
            </div>
            <figcaption className="mt-3 mb-0 text-center text-[12px] text-[#151313]/70">{caption}</figcaption>
        </figure>
    );
}
```

`components/occasions/sections/themes/ThemesView.tsx`:

```tsx
import { ThemesPhone } from '@/components/occasions/sections/themes/ThemesPhone';
import { ThemeTile } from '@/components/occasions/sections/themes/ThemeTile';
import type { LandingTheme } from '@/lib/landingThemes';
import { landingClickAttributes, landingSectionAttributes } from '@/lib/landingTracking';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

export type ThemesViewProps = {
    cta: { href: string; label: string };
    heading: [string, string];
    kicker: string;
    lead: string;
    // null: no phone; the copy column takes the row.
    phone: { alt: string; caption: string; photo: OccasionPhoto } | null;
    // The live presets for the type; none (fetch failed or empty) leaves out the grid.
    tiles: { alt: string; theme: LandingTheme }[];
};

// The themes a host can pick, on a warm gradient: copy, tiles and a button, with a phone beside them from 761 px.
export function ThemesView({ cta, heading, kicker, lead, phone, tiles }: ThemesViewProps) {
    return (
        <section
            aria-labelledby="themes-title"
            className="bg-[radial-gradient(circle_at_84%_66%,rgba(242,145,77,0.3)_0%,rgba(242,145,77,0.2)_16%,rgba(242,145,77,0.08)_30%,transparent_46%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.34),transparent_34%),linear-gradient(135deg,#f7d9a8_0%,#f8d08f_26%,#f8c87f_52%,#f6be79_76%,#f4b879_100%)] px-5 pt-14.5 pb-15 text-[#151313] min-[761px]:px-[5vw] min-[761px]:pt-18 min-[761px]:pb-19.5"
            id={OCCASION_SECTION_IDS.themes}
            {...landingSectionAttributes('themes')}
        >
            <div className="mx-auto grid max-w-305 items-center gap-9 min-[761px]:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)] min-[761px]:gap-[5vw]">
                {/* Copy */}
                <div>
                    {/* Heading */}
                    <p className="mt-0 mb-4.5 text-[12px] font-black tracking-[0.15em] uppercase">{kicker}</p>
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(42px,10.5vw,58px)] leading-[0.98] font-normal tracking-[-0.055em] min-[761px]:text-[clamp(54px,4.5vw,80px)]"
                        id="themes-title"
                    >
                        {heading[0]}
                        <br />
                        <strong className="font-bold">{heading[1]}</strong>
                    </h2>
                    <p className="mt-5.5 mb-0 max-w-155 text-[18px] leading-[1.5] min-[761px]:text-[clamp(19px,1.3vw,23px)]">{lead}</p>
                    {/* Tiles */}
                    {tiles.length ? (
                        <ul className="m-0 mt-7.5 grid list-none grid-cols-3 gap-3 p-0 min-[761px]:grid-cols-6">
                            {tiles.map((tile) => (
                                <ThemeTile alt={tile.alt} key={tile.theme.id} theme={tile.theme} />
                            ))}
                        </ul>
                    ) : null}
                    {/* Call to action */}
                    <a
                        className="mt-7.5 inline-flex min-h-16 max-w-full items-center gap-5.5 rounded-full bg-white pr-7.5 pl-8.5 text-[12px] font-black tracking-[0.14em] text-[#151313] uppercase no-underline shadow-[0_10px_28px_rgba(21,19,19,0.1)] focus-ring transition-transform duration-300 hover:-translate-y-0.75 motion-reduce:transition-none max-[420px]:w-full max-[420px]:justify-center"
                        href={cta.href}
                        {...landingClickAttributes({ event: 'create', placement: 'themes' })}
                    >
                        <span>{cta.label}</span>
                        <span aria-hidden="true" className="text-[24px] leading-none">
                            ↗
                        </span>
                    </a>
                </div>

                {/* Phone */}
                {phone ? <ThemesPhone alt={phone.alt} caption={phone.caption} photo={phone.photo} /> : null}
            </div>
        </section>
    );
}
```

- [ ] **Step 5: Write the props builder and the section**

`components/occasions/sections/themes/themesViewProps.ts`:

```ts
import type { ThemesViewProps } from '@/components/occasions/sections/themes/ThemesView';
import type { LandingTheme } from '@/lib/landingThemes';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { PageTranslator } from '@/lib/occasions/pageCopy';

type ThemesViewPropsInput = {
    // OccasionPages.<type>.themes
    copy: PageTranslator;
    createHref: string;
    phone: OccasionPhoto | null;
    themes: LandingTheme[];
};

export function themesViewProps({ copy, createHref, phone, themes }: ThemesViewPropsInput): ThemesViewProps {
    return {
        cta: { href: createHref, label: copy('cta') },
        heading: copy.raw('heading') as [string, string],
        kicker: copy('kicker'),
        lead: copy('lead'),
        phone: phone ? { alt: copy('phoneAlt'), caption: copy('phoneCaption'), photo: phone } : null,
        tiles: themes.map((theme) => ({ alt: copy('tileAlt', { name: theme.name }), theme })),
    };
}
```

`components/occasions/sections/ThemesSection.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { themesViewProps } from '@/components/occasions/sections/themes/themesViewProps';
import { ThemesView } from '@/components/occasions/sections/themes/ThemesView';
import type { Locale } from '@/i18n/config';
import type { LandingTheme } from '@/lib/landingThemes';
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type ThemesSectionProps = { createHref: string; locale: Locale; media: OccasionPageMedia; occasion: Occasion; themes: LandingTheme[] };

export async function ThemesSection({ createHref, locale, media, occasion, themes }: ThemesSectionProps) {
    const copy = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.themes` });
    return <ThemesView {...themesViewProps({ copy, createHref, phone: media.themesPhone, themes })} />;
}
```

- [ ] **Step 6: Run the tests, type-check and lint**

Run: `npx vitest run components/occasions/sections/themes lib/occasions; npx tsc --noEmit; npx eslint components/occasions/sections/themes`
Expected: PASS, no type errors, no lint errors.

- [ ] **Step 7: Commit**

```powershell
git add components/occasions/sections/themes components/occasions/sections/ThemesSection.tsx lib/landingTracking.ts lib/occasions/occasionSections.ts
git commit -m "KAN-252: Themes section for occasion pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Baptism copy (owner approval gate)

Nothing in this task is committed before the owner says yes in popups.

**Files:**
- Modify: `messages/el.json`, `messages/en.json` (`OccasionPages.BAPTISM` only)
- Create: `lib/occasions/baptismCopy.test.ts`

- [ ] **Step 1: Check who still reads the old baptism keys**

Run:

```powershell
rg -n "OccasionPages\.BAPTISM|'BAPTISM'" --glob "*.ts" --glob "*.tsx" components lib app
rg -n "timeline|story\.rows|demoHeading|featuresIntro|howItWorksHeading|pricingHeading|pricingIntro|hero\.(headline|lead|promise|feed)" components/occasions lib/occasions
```

Expected: only the old layout's files read them: `OccasionContent`, `OccasionHero`, `OccasionStory`, `OccasionFeatures`, `OccasionPhoneFeed`, `OccasionDemoPreview`. They stay (KAN-254) and are not rendered for baptism after Task 12. Write down any other reader you find and tell the owner in Step 3.

- [ ] **Step 2: Write a review file of every change**

Write a scratchpad script (not in the repo) that loads `messages/el.json` and `messages/en.json`. For every leaf under `OccasionPages.BAPTISM`, it writes one row with the key, the current text (or "new") and the proposed text (or "removed"), for both languages. It should not print unchanged rows. Save the result to `C:\Users\User\AppData\Local\Temp\claude\13216b4945ae9278\22f42274-acd6-4928-97b3-704a6e771c97\scratchpad\baptism-copy-review.md`.

The proposed Greek is the draft's, word for word. It is in Step 4 below. The proposed English is in Step 5.

- [ ] **Step 3: Ask the owner, section by section, in popups**

Use `AskUserQuestion` with up to 4 questions per popup. One question per section:
- Meta
- Hero
- Band
- How it works
- Why
- RSVP
- Private
- Themes
- Features
- Pricing
- FAQ (two popups)
- Final call to action
- Removed keys

Each question's `preview` shows that section's exact old → new rows, Greek and English. Options are "Approve as shown" and "Change something". Answers to "Other" or "Change something" go into the proposal before asking again.

The popups must point out these lines:
- **Band label** (`band.label`, screen readers only). This is new copy that the draft does not have. The draft reused "Demo του StoryWall", which is wrong without a demo. Proposed: el "Θέματα του StoryWall", en "StoryWall themes".
- **FAQ 8.** The extension sentence shows only while an extension is on sale (owner decision, 2026-11-21).
- **Guest photo alt text** (`why.with.marquee[n].alt`). These are given whole because Greek needs "Γιώργο, νονό".
- **The whole English column.** I wrote it; nothing in it is the owner's.
- **Meta keywords and `meta.imageAlt`** stay unchanged.
- **Removed keys:**
  - `hero.headline`, `hero.lead`, `hero.promise`, `hero.imageAlt`, `hero.feed`
  - `themes.heading`, `themes.intro` (the old shape)
  - `timeline`, `story`, `demoHeading`, `featuresIntro`, `howItWorksHeading`, `howItWorks`
  - `pricingHeading`, `pricingIntro`
  - the 9 old FAQ entries
  - the old `finalCta`

  Say that the old layout's code still references them and becomes unreachable for baptism; KAN-254 removes it.

Stop and wait for every answer. Do not write the catalogs until all sections are approved.

- [ ] **Step 4: The Greek `OccasionPages.BAPTISM` (draft, word for word)**

Replace the whole object. Keep `meta.imageAlt` and `meta.keywords` exactly as they are today.

```json
{
    "name": "Βάπτιση",
    "meta": {
        "title": "Ηλεκτρονικό Προσκλητήριο Βάπτισης & Ιστοσελίδα | StoryWall",
        "description": "Ηλεκτρονικό προσκλητήριο βάπτισης με θέματα, RSVP, πρόγραμμα, χάρτες και φωτογραφίες καλεσμένων. Ιδιωτικό, χωρίς εφαρμογή, για Ελλάδα και Κύπρο.{range, select, none {} other { Από {from}.}}",
        "imageAlt": "(unchanged)",
        "keywords": ["(unchanged)"]
    },
    "hero": {
        "h1": "Ηλεκτρονικό προσκλητήριο βάπτισης & <em>ιστοσελίδα βάπτισης</em>",
        "cta": "Φτιάξε το StoryWall σου",
        "themesCta": "Δες τα θέματα",
        "breadcrumb": "Βάπτιση",
        "kicker": "ΤΟ SOCIAL ΓΙΑ ΤΗ <b>ΒΑΠΤΙΣΗ</b>",
        "subtitle": "Μια βάπτιση γεμάτη στιγμές που αξίζει να μείνουν.",
        "body": "Φτιάξε την ιστοσελίδα της βάπτισης με ψηφιακό προσκλητήριο, θέμα της επιλογής σου, RSVP, πρόγραμμα και χάρτες, για βαπτίσεις σε Ελλάδα και Κύπρο. Την ημέρα της βάπτισης οι καλεσμένοι ανεβάζουν τις φωτογραφίες τους, και όλα μένουν σε ένα ιδιωτικό StoryWall, όχι σε δημόσια social.",
        "trust": ["Χωρίς app", "Ιδιωτικό", "Με ένα link"],
        "trustPrice": "Από {from}",
        "feedAlt": "Η αρχική σελίδα μιας βάπτισης στο StoryWall με θέμα Μονόκερος"
    },
    "band": {
        "label": "Θέματα του StoryWall",
        "cta": "ΔΕΣ ΤΑ ΘΕΜΑΤΑ"
    },
    "how": {
        "kicker": "ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ",
        "heading": ["Τρία βήματα.", "Μία ιστορία βάπτισης."],
        "steps": [
            { "title": "Δημιουργείς", "body": "Διαλέγεις πακέτο και θέμα, και φτιάχνεις την ιστοσελίδα της βάπτισης με ημερομηνία, εκκλησία και πρόγραμμα, <b>μέσα σε λίγα λεπτά.</b>" },
            { "title": "Μοιράζεσαι", "body": "Στέλνεις το <b>ηλεκτρονικό προσκλητήριο</b> με ένα link και το <b>QR code</b> για τη συλλογή φωτογραφιών. <b>Χωρίς app.</b>" },
            { "title": "Η ιστορία ξεκινά", "body": "Οι καλεσμένοι επιβεβαιώνουν την παρουσία τους, μοιράζονται posts και stories και <b>ανεβάζουν φωτογραφίες από τη βάπτιση.</b>" }
        ]
    },
    "why": {
        "kicker": "ΓΙΑΤΙ STORYWALL",
        "heading": ["Οι φωτογραφίες της βάπτισης", "δεν πρέπει να χαθούν σε 100 κινητά."],
        "without": {
            "label": "ΧΩΡΙΣ STORYWALL",
            "bubbles": ["Στείλε μου κι εμένα! 🙏", "Ποιος έχει το βίντεο;"],
            "items": ["«Στείλε μου κι εμένα τις φωτό!»", "Φωτογραφίες σε 100 διαφορετικά κινητά", "Ευχές χαμένες σε Viber και Messenger", "Φωτογραφίες του παιδιού σε δημόσια posts"]
        },
        "with": {
            "label": "ΜΕ STORYWALL · ΟΛΑ ΣΕ ΕΝΑ ΜΕΡΟΣ",
            "subtitle": "Από τις προετοιμασίες και το μυστήριο, μέχρι τα πρώτα γενέθλια.",
            "qrAlt": "Καλεσμένος σκανάρει το QR του StoryWall για να ανεβάσει φωτογραφίες",
            "steps": [
                { "title": "Σκανάρουν", "body": "Το QR στο τραπέζι, με την κάμερα του κινητού." },
                { "title": "Ανεβάζουν", "body": "Φωτογραφίες και βίντεο. <b>Χωρίς app.</b>" },
                { "title": "Όλα μαζί", "body": "Στο StoryWall σας, <b>σε αρχική ποιότητα.</b>" }
            ],
            "marquee": [
                { "name": "Άννα", "role": "θεία", "alt": "Η οικογένεια έξω από την εκκλησία — φωτογραφία από Άννα, θεία" },
                { "name": "Γιώργος", "role": "νονός", "alt": "Το μυστήριο στην κολυμπήθρα — φωτογραφία από Γιώργο, νονό" },
                { "name": "Ελένη", "role": "γιαγιά", "alt": "Το τραπέζι της βάπτισης δίπλα στη θάλασσα — φωτογραφία από Ελένη, γιαγιά" }
            ],
            "example": "ΠΑΡΑΔΕΙΓΜΑ · ΜΙΑ ΒΑΠΤΙΣΗ ΣΤΟ STORYWALL",
            "stats": [
                { "value": "196", "label": "ΦΩΤΟΓΡΑΦΙΕΣ" },
                { "value": "28", "label": "ΒΙΝΤΕΟ" },
                { "value": "58", "label": "ΕΥΧΕΣ" },
                { "value": "72", "label": "ΚΑΛΕΣΜΕΝΟΙ" }
            ],
            "chips": ["Όλες οι φωτογραφίες σε ένα μέρος", "Ανεβαίνουν με ένα QR, χωρίς app", "Ευχολόγιο που κατεβάζεις σε PDF", "Ιδιωτικό, μόνο για τους καλεσμένους"]
        }
    },
    "rsvp": {
        "kicker": "RSVP βάπτισης",
        "heading": ["Μην αναρωτιέσαι ποιος θα έρθει.", "Θα ξέρεις. Χωρίς τηλέφωνα και μηνύματα."],
        "intro": "Με το <b>RSVP του StoryWall</b>, οι καλεσμένοι σου επιβεβαιώνουν εύκολα και εσύ έχεις τον πλήρη έλεγχο, από την πρόσκληση μέχρι τη λίστα.",
        "alts": {
            "both": "Χωρίς StoryWall οι απαντήσεις έρχονται διάσπαρτα από Viber, WhatsApp, Messenger, email και SMS. Με StoryWall όλα οργανωμένα: φόρμα RSVP, λίστα καλεσμένων και στατιστικά.",
            "without": "Χωρίς StoryWall: οι απαντήσεις έρχονται διάσπαρτα από Viber, WhatsApp, Messenger, email και SMS.",
            "with": "Με StoryWall: φόρμα RSVP, λίστα καλεσμένων και στατιστικά, όλα οργανωμένα."
        },
        "checklist": {
            "pill": "ΟΛΕΣ ΟΙ ΑΠΑΝΤΗΣΕΙΣ",
            "items": [
                { "title": "Συνοδοί & παιδιά", "body": "Στη βάπτιση έρχονται πολλά παιδιά. Ξέρεις ακριβώς πόσα θα είναι." },
                { "title": "Όλες οι απαντήσεις σε ένα μέρος", "body": "Από Viber, Messenger, WhatsApp, email και SMS." },
                { "title": "Ποιοι έρχονται", "body": "Δες εύκολα ποιοι επιβεβαίωσαν τη συμμετοχή τους." },
                { "title": "Απλή και γρήγορη διαδικασία", "body": "Οι καλεσμένοι απαντούν με ένα κλικ από την πρόσκληση." }
            ]
        }
    },
    "private": {
        "kicker": "Μόνο για καλεσμένους της βάπτισης",
        "heading": ["Ένα ιδιωτικό Social", "γεμάτο στιγμές και συναισθήματα."],
        "intro": "Οι καλεσμένοι ανεβάζουν φωτογραφίες, γράφουν ευχές και σχολιάζουν. Όλα μένουν μεταξύ σας.",
        "cards": [
            { "title": "Ιδιωτικός τοίχος", "body": "Μπαίνουν μόνο όσοι έχουν το link της βάπτισης. Δεν είναι δημόσιος και δεν εμφανίζεται στο Google. Οι φωτογραφίες του παιδιού σας δεν ανεβαίνουν πουθενά δημόσια." },
            { "title": "Διαχείριση από εσένα", "body": "Βλέπεις ποιοι συμμετέχουν και τι ανεβαίνει, από ένα σημείο. Μπορείς να προσθέσεις και συνδιοργανωτή." },
            { "title": "Ρόλοι καλεσμένων", "body": "Γονείς, νονός ή νονά, παππούδες, οικογένεια: ο καθένας φαίνεται με τον ρόλο του." },
            { "title": "Λήψη σε αρχική ποιότητα", "body": "Κατεβάζεις όλες τις φωτογραφίες και τα βίντεο της βάπτισης, και το ευχολόγιο σε PDF." }
        ]
    },
    "themes": {
        "kicker": "ΘΕΜΑΤΑ ΒΑΠΤΙΣΗΣ",
        "heading": ["Διάλεξε το θέμα", "της βάπτισης."],
        "lead": "Μονόκερος, Μικρός Πρίγκιπας, Χάρτινο Καραβάκι και άλλα. Το θέμα ντύνει όλο το StoryWall, από το προσκλητήριο μέχρι τον τοίχο με τις φωτογραφίες.",
        "cta": "Φτιάξε το StoryWall σου",
        "tileAlt": "Θέμα βάπτισης {name}",
        "phoneAlt": "Το StoryWall μιας βάπτισης στο κινητό, με θέμα Μονόκερος",
        "phoneCaption": "Έτσι δείχνει μια βάπτιση με θέμα Μονόκερος."
    },
    "featuresHead": {
        "kicker": "ΔΥΝΑΤΟΤΗΤΕΣ",
        "heading": ["Η δική σου ιστοσελίδα βάπτισης,", "με όλα όσα χρειάζεσαι."]
    },
    "features": {
        "invitation": { "title": "Ηλεκτρονικό προσκλητήριο", "body": "Στέλνεις το προσκλητήριο με ένα link, με το θέμα που διάλεξες, την εκκλησία, τη δεξίωση και χάρτες." },
        "rsvp": { "title": "RSVP βάπτισης", "body": "Οι καλεσμένοι επιβεβαιώνουν την παρουσία τους και βλέπεις όλες τις απαντήσεις μαζί." },
        "gallery": { "title": "Φωτογραφίες καλεσμένων", "body": "Οι καλεσμένοι σκανάρουν ένα QR code και ανεβάζουν φωτογραφίες και βίντεο, χωρίς εγγραφή." },
        "posts": { "title": "Αναρτήσεις & αντιδράσεις", "body": "Φωτογραφίες, μηνύματα, σχόλια και αντιδράσεις στον ιδιωτικό τοίχο της βάπτισης." },
        "stories": { "title": "Stories βάπτισης", "body": "Αυθόρμητες στιγμές από τις προετοιμασίες, το μυστήριο και τη δεξίωση." },
        "playlist": { "title": "Μουσικές προτάσεις", "body": "Οι καλεσμένοι προτείνουν τα αγαπημένα τους τραγούδια για το πάρτι της βάπτισης." },
        "schedule": { "title": "Πρόγραμμα βάπτισης", "body": "Ώρα και εκκλησία του μυστηρίου, χώρος δεξίωσης, για να ξέρουν όλοι πού και πότε." },
        "wishbook": { "title": "Ευχολόγιο", "body": "Οι ευχές για το παιδί σε ένα ψηφιακό βιβλίο, που θα διαβάσει όταν μεγαλώσει." },
        "wishlist": { "title": "Λίστα δώρων / IBAN", "body": "Μοιράζεσαι διακριτικά τον λογαριασμό για τα δώρα." }
    },
    "pricing": {
        "kicker": "ΠΑΚΕΤΑ",
        "heading": "Πακέτα για τη βάπτιση.",
        "intro": "Επίλεξε πακέτο και διάρκεια ανάλογα με τις ανάγκες σου."
    },
    "faqIntro": "Όσα ρωτούν οι γονείς για το ηλεκτρονικό προσκλητήριο και την ιστοσελίδα βάπτισης.",
    "faq": [
        { "q": "Τι είναι η ιστοσελίδα βάπτισης StoryWall;", "a": "Το StoryWall είναι μια ιδιωτική ιστοσελίδα βάπτισης, σαν ένα μικρό social μόνο για εσάς και τους καλεσμένους σας. Συνδυάζει ηλεκτρονικό προσκλητήριο, RSVP, posts, stories, φωτογραφίες από τους καλεσμένους και ψηφιακό ευχολόγιο, ανάλογα με το πακέτο που επιλέγεις. Διαλέγεις και θέμα, όπως Μονόκερος, Μικρός Πρίγκιπας ή Χάρτινο Καραβάκι." },
        { "q": "Πώς λειτουργεί το ηλεκτρονικό προσκλητήριο βάπτισης;", "a": "Φτιάχνεις το StoryWall της βάπτισης με το θέμα που σου αρέσει, την εκκλησία, τον χώρο της δεξίωσης, το πρόγραμμα και τους χάρτες, και στέλνεις το link στους καλεσμένους από Viber, WhatsApp, Messenger, email ή SMS. Το ανοίγουν από το κινητό, χωρίς εφαρμογή, και με μια σύντομη εγγραφή βλέπουν το προσκλητήριο και τον τοίχο της βάπτισης." },
        { "q": "Πώς μαζεύω τις φωτογραφίες των καλεσμένων;", "a": "Βάζεις το QR code στα τραπέζια της δεξίωσης. Οι καλεσμένοι το σκανάρουν με την κάμερα του κινητού και ανεβάζουν φωτογραφίες και βίντεο, χωρίς εφαρμογή και χωρίς εγγραφή. Όλα μαζεύονται σε ξεχωριστή συλλογή στο StoryWall σας, σε αρχική ποιότητα." },
        { "q": "Χρειάζεται οι καλεσμένοι να κατεβάσουν εφαρμογή;", "a": "Όχι. Το StoryWall ανοίγει απευθείας από τον browser του κινητού, μέσω του link ή του QR code, χωρίς εγκατάσταση εφαρμογής." },
        { "q": "Πώς λειτουργεί το RSVP βάπτισης;", "a": "Οι καλεσμένοι απαντούν «Ναι» ή «Όχι» μέσα από το StoryWall της βάπτισης και δηλώνουν πόσοι ενήλικες και πόσα παιδιά θα έρθουν. Μπορούν να σας αφήσουν και ένα μήνυμα. Εσύ βλέπεις αμέσως τη λίστα και τα σύνολα, χωρίς τηλέφωνα και μηνύματα." },
        { "q": "Ποιος βλέπει τις φωτογραφίες του παιδιού;", "a": "Μόνο οι καλεσμένοι σας. Τις φωτογραφίες και τα posts του τοίχου τα βλέπουν όσοι έχουν το link της βάπτισης και έχουν κάνει εγγραφή. Δεν είναι δημόσια και δεν εμφανίζονται στη Google, οπότε οι φωτογραφίες του παιδιού σας δεν κυκλοφορούν σε δημόσια social. Εσείς βλέπετε ποιοι έχουν μπει και, αν θέλετε, μπορείτε να αφαιρέσετε κάποιον. Οι φωτογραφίες που ανεβαίνουν με το QR code είναι διαθέσιμες μόνο σε εσάς, τους γονείς." },
        { "q": "Μπορώ να κατεβάσω όλες τις φωτογραφίες μετά τη βάπτιση;", "a": "Ναι. Κατεβάζεις όλες τις φωτογραφίες και τα βίντεο της βάπτισης, μαζί και όσα ανέβηκαν με το QR code, σε αρχική ποιότητα. Κατεβάζεις επίσης το ευχολόγιο σε PDF." },
        { "q": "Για πόσο διάστημα παραμένει ενεργό το StoryWall;", "a": "Επιλέγεις εσύ πόσους μήνες θα μείνει online, ανάλογα με το πακέτο. Η διάρκεια μετράει από την ημέρα της αγοράς, οπότε αν το ετοιμάσεις 1–2 μήνες πριν τη βάπτιση, σου μένει άνετος χρόνος και μετά, για φωτογραφίες, ευχές και λήψη όλου του υλικού.{extendable, select, yes { Και αν θέλεις να μείνει ανοιχτό για περισσότερο, το επεκτείνεις με ένα κλικ.} other {}}" },
        { "q": "Αντικαθιστά το StoryWall τον φωτογράφο της βάπτισης;", "a": "Όχι, τον συμπληρώνει. Ο φωτογράφος καταγράφει τις επίσημες στιγμές. Το StoryWall μαζεύει τις αυθόρμητες, αυτές που τραβάνε οι καλεσμένοι από τη δική τους ματιά, στα τραπέζια, στο παιχνίδι των παιδιών, στο γλέντι. Μάλιστα, ο φωτογράφος μπορεί να μπει κι αυτός στο StoryWall και να ανεβάσει τις δικές του επαγγελματικές φωτογραφίες." },
        { "q": "Πόσο κοστίζει η ιστοσελίδα βάπτισης StoryWall;", "a": "Η τιμή εξαρτάται από το πακέτο που θα διαλέξεις, τον αριθμό των χρηστών (καλεσμένων) και το πόσους μήνες θέλεις να μείνει online.", "link": { "to": "pricing", "label": "Δες όλα τα πακέτα και τι περιλαμβάνει το καθένα" } },
        { "q": "Πώς στέλνω το ηλεκτρονικό προσκλητήριο στους καλεσμένους;", "a": "Το προσκλητήριο είναι ένα link. Το στέλνεις όπου θέλεις, σε Viber, WhatsApp, Messenger, email ή SMS, στον καθένα ξεχωριστά ή σε μια ομαδική συνομιλία." },
        { "q": "Ηλεκτρονικό ή έντυπο προσκλητήριο βάπτισης;", "a": "Μπορείς να έχεις και τα δύο. Πολλοί γονείς κρατούν έντυπα προσκλητήρια για τον νονό, τους παππούδες και τους στενούς συγγενείς, και στέλνουν το ηλεκτρονικό σε όλους τους καλεσμένους για RSVP, χάρτες και πρόγραμμα." },
        { "q": "Μπορώ να αλλάξω στοιχεία μετά την αποστολή;", "a": "Ναι. Αν αλλάξει η ώρα, η εκκλησία ή το πρόγραμμα, το διορθώνεις και οι καλεσμένοι βλέπουν αμέσως την τελευταία έκδοση, από το ίδιο link. Δεν χρειάζεται να στείλεις τίποτα ξανά. Και αν θέλεις να το μάθουν όλοι αμέσως, ανεβάζεις κι ένα post στον τοίχο της βάπτισης." },
        { "q": "Μπορώ να φτιάξω ηλεκτρονικό προσκλητήριο για βάπτιση στην Κύπρο;", "a": "Ναι, φυσικά. Το StoryWall είναι online, οπότε δουλεύει ακριβώς το ίδιο για βάπτιση (ή βάφτιση) στην Κύπρο: προσκλητήριο, θέμα, RSVP, φωτογραφίες με QR code και ευχολόγιο. Οι καλεσμένοι το ανοίγουν από το κινητό, όπου κι αν βρίσκονται, ακόμα και στο εξωτερικό." }
    ],
    "finalCta": {
        "heading": ["Η βάπτιση", "ξεκινά εδώ."],
        "copyStart": "Φτιάξε το δικό σου StoryWall με ηλεκτρονικό προσκλητήριο, φωτογραφίες και αναμνήσεις",
        "imageAlt": "Οικογένεια γιορτάζει βάπτιση έξω από εκκλησία σε ελληνικό νησί",
        "eyebrow": "Η ΒΑΠΤΙΣΗ ΣΤΟ STORYWALL",
        "copyStrong": "που θα μοιραστείς με τους αγαπημένους σου.",
        "cta": "Φτιάξε το <b>StoryWall</b> σου"
    }
}
```

Notes on that object:
- The draft's Features band also has a "Θέματα βάπτισης" card. It is left out by decision, because the page has its own Themes section.
- The Themes button is shown uppercase by its class, as in the draft.
- The draft's hero post cutouts carry the alt "Δημοσίευση καλεσμένου με φωτογραφία". The page uses `OccasionPostCard` with baptism photos instead, which reads its alt text from the shared `ImageAlt` keys. Mention this in the Hero popup.

- [ ] **Step 5: The English `OccasionPages.BAPTISM` (my proposal; every line needs a yes)**

Keep `meta.imageAlt` and `meta.keywords` as they are today.

```json
{
    "name": "Baptisms",
    "meta": {
        "title": "Digital Baptism Invitation & Website | StoryWall",
        "description": "A digital baptism invitation with themes, RSVP, schedule, maps and guest photos. Private, no app to install.{range, select, none {} other { From {from}.}}",
        "imageAlt": "(unchanged)",
        "keywords": ["(unchanged)"]
    },
    "hero": {
        "h1": "Digital baptism invitation & <em>baptism website</em>",
        "cta": "Create your StoryWall",
        "themesCta": "See the themes",
        "breadcrumb": "Baptism",
        "kicker": "THE PRIVATE SOCIAL FOR <b>THE BAPTISM</b>",
        "subtitle": "A baptism full of moments worth keeping.",
        "body": "Create the baptism website with a digital invitation, a theme of your choice, RSVP, schedule and maps. On the day, guests upload their photos, and everything stays in a private StoryWall, not on public social media.",
        "trust": ["No app", "Private", "One link"],
        "trustPrice": "From {from}",
        "feedAlt": "A baptism's home page on StoryWall, on the Unicorn theme"
    },
    "band": { "label": "StoryWall themes", "cta": "SEE THE THEMES" },
    "how": {
        "kicker": "HOW IT WORKS",
        "heading": ["Three steps.", "One baptism story."],
        "steps": [
            { "title": "Create", "body": "Pick a plan and a theme, and build the baptism website with the date, church and schedule, <b>in just a few minutes.</b>" },
            { "title": "Share", "body": "Send your <b>digital invitation</b> with one link, plus a <b>QR code</b> for collecting photos. <b>No app.</b>" },
            { "title": "The story begins", "body": "Guests RSVP, share posts and stories, and <b>upload photos from the baptism.</b>" }
        ]
    },
    "why": {
        "kicker": "WHY STORYWALL",
        "heading": ["The baptism photos", "shouldn't get lost on 100 phones."],
        "without": {
            "label": "WITHOUT STORYWALL",
            "bubbles": ["Send them to me too! 🙏", "Who has the video?"],
            "items": ["“Can you send me the photos?”", "Photos scattered across 100 phones", "Wishes lost in WhatsApp and Messenger", "Photos of your child in public posts"]
        },
        "with": {
            "label": "WITH STORYWALL · ALL IN ONE PLACE",
            "subtitle": "From the preparations and the ceremony to the first birthday.",
            "qrAlt": "Guest scanning the StoryWall QR code to upload photos",
            "steps": [
                { "title": "Scan", "body": "The QR code on the table, with their phone camera." },
                { "title": "Upload", "body": "Photos and videos. <b>No app.</b>" },
                { "title": "All together", "body": "In your StoryWall, <b>in original quality.</b>" }
            ],
            "marquee": [
                { "name": "Anna", "role": "aunt", "alt": "The family outside the church, a photo by Anna, aunt" },
                { "name": "Giorgos", "role": "godfather", "alt": "The ceremony at the font, a photo by Giorgos, godfather" },
                { "name": "Eleni", "role": "grandmother", "alt": "The baptism table by the sea, a photo by Eleni, grandmother" }
            ],
            "example": "EXAMPLE · ONE BAPTISM ON STORYWALL",
            "stats": [
                { "value": "196", "label": "PHOTOS" },
                { "value": "28", "label": "VIDEOS" },
                { "value": "58", "label": "WISHES" },
                { "value": "72", "label": "GUESTS" }
            ],
            "chips": ["Every photo in one place", "Uploaded with one QR code, no app", "Guest book you download as a PDF", "Private, for your guests only"]
        }
    },
    "rsvp": {
        "kicker": "Baptism RSVP",
        "heading": ["Stop wondering who's coming.", "Every RSVP in one place."],
        "intro": "With <b>StoryWall's RSVP</b>, guests reply in seconds and you stay in control, from the invitation to the final guest list.",
        "alts": {
            "both": "Without StoryWall, RSVPs arrive scattered across WhatsApp, Messenger, email and text. With StoryWall, the RSVP form, guest list and stats are all in one place.",
            "without": "Without StoryWall: RSVPs arrive scattered across WhatsApp, Messenger, email and text.",
            "with": "With StoryWall: RSVP form, guest list and stats, all in one place."
        },
        "checklist": {
            "pill": "ALL YOUR RSVPS",
            "items": [
                { "title": "Plus-ones & kids", "body": "Lots of children come to a baptism. You know exactly how many." },
                { "title": "Every RSVP in one place", "body": "No more chasing replies on WhatsApp, Messenger, email and text." },
                { "title": "Who's coming", "body": "See at a glance who has confirmed." },
                { "title": "Quick and simple", "body": "Guests reply in one tap, right from the invitation." }
            ]
        }
    },
    "private": {
        "kicker": "BAPTISM GUESTS ONLY",
        "heading": ["A private social full of moments.", "Just for you and your people."],
        "intro": "Guests upload photos, write wishes and comment. Everything stays between you.",
        "cards": [
            { "title": "Private wall", "body": "Only people with the baptism link can join. It isn't public and doesn't show up on Google. Your child's photos are never posted anywhere public." },
            { "title": "You're in control", "body": "See who has joined and what's shared, all in one place. You can add a co-host too." },
            { "title": "Guest roles", "body": "Parents, godparents, grandparents, family: everyone appears with their role." },
            { "title": "Original-quality downloads", "body": "Download every baptism photo and video, plus your guest book as a PDF." }
        ]
    },
    "themes": {
        "kicker": "BAPTISM THEMES",
        "heading": ["Pick the theme", "for the baptism."],
        "lead": "Unicorn, Little Prince, Paper Boat and more. The theme dresses the whole StoryWall, from the invitation to the photo wall.",
        "cta": "Create your StoryWall",
        "tileAlt": "{name} baptism theme",
        "phoneAlt": "A baptism's StoryWall on a phone, on the Unicorn theme",
        "phoneCaption": "This is how a baptism looks on the Unicorn theme."
    },
    "featuresHead": { "kicker": "FEATURES", "heading": ["Your own baptism website,", "with everything you need."] },
    "features": {
        "invitation": { "title": "Digital invitation", "body": "Send your invitation with one link: your theme, the church, the reception and maps." },
        "rsvp": { "title": "Baptism RSVP", "body": "Guests confirm attendance and you see every reply together." },
        "gallery": { "title": "Guest photos", "body": "Guests scan a QR code and upload photos and videos, no sign-up needed." },
        "posts": { "title": "Posts & reactions", "body": "Photos, messages, comments and reactions on your private baptism wall." },
        "stories": { "title": "Baptism stories", "body": "Candid moments from the prep, the ceremony and the reception." },
        "playlist": { "title": "Song requests", "body": "Guests suggest their favourite songs for the baptism party." },
        "schedule": { "title": "Baptism schedule", "body": "Ceremony time and church, reception venue, so everyone knows where and when." },
        "wishbook": { "title": "Guest book", "body": "Wishes for your child in a digital book to read when they grow up." },
        "wishlist": { "title": "Gift registry / bank details", "body": "Share the account for gifts, discreetly." }
    },
    "pricing": { "kicker": "PLANS", "heading": "Plans for the baptism.", "intro": "Choose your plan and how long it stays online." },
    "faqIntro": "What parents ask about our baptism website and digital invitation.",
    "faq": [
        { "q": "What is a StoryWall baptism website?", "a": "StoryWall is a private baptism website, like a small social space just for you and your guests. It combines a digital invitation, RSVP, posts, stories, guest photos and a digital guest book, depending on the plan you choose. You pick a theme too, like Unicorn, Little Prince or Paper Boat." },
        { "q": "How does the digital baptism invitation work?", "a": "You create the baptism's StoryWall with the theme you like, the church, the reception venue, the schedule and maps, and send the link to your guests by WhatsApp, Messenger, email or text. They open it on their phone with no app, and after a quick sign-up they see the invitation and the baptism wall." },
        { "q": "How do I collect photos from guests?", "a": "Place the QR code on the reception tables. Guests scan it with their phone camera and upload photos and videos, with no app and no sign-up. Everything is gathered in its own gallery in your StoryWall, in original quality." },
        { "q": "Do guests need to download an app?", "a": "No. StoryWall opens straight in the phone's browser from your link or QR code, with nothing to install." },
        { "q": "How does the baptism RSVP work?", "a": "Guests answer yes or no inside the baptism's StoryWall and say how many adults and children are coming. They can leave you a message too. You see the list and the totals at once, with no calls or messages." },
        { "q": "Who can see my child's photos?", "a": "Only your guests. The wall's photos and posts are visible to people who have the baptism link and have signed up. They aren't public and don't show up on Google, so your child's photos never end up on public social media. You see who has joined and can remove anyone. Photos uploaded with the QR code are visible only to you, the parents." },
        { "q": "Can I download all the photos after the baptism?", "a": "Yes. You download every baptism photo and video, including those uploaded with the QR code, in original quality. You can also download the guest book as a PDF." },
        { "q": "How long does my StoryWall stay online?", "a": "You choose how many months it stays online, depending on the plan. The time starts on the day you buy, so if you set it up 1–2 months before the baptism, you still have plenty of time afterwards for photos, wishes and downloading everything.{extendable, select, yes { And if you want it open for longer, you can extend it in one click.} other {}}" },
        { "q": "Does StoryWall replace the baptism photographer?", "a": "No, it complements them. The photographer captures the official moments. StoryWall collects the candid ones your guests take from their own point of view, at the tables, during the children's games, at the party. Your photographer can even join StoryWall and upload their professional photos." },
        { "q": "How much does a StoryWall baptism website cost?", "a": "The price depends on the plan you choose, the number of users (guests) and how many months you want it to stay online.", "link": { "to": "pricing", "label": "See the plans and what each one includes" } },
        { "q": "How do I send the digital invitation to my guests?", "a": "Your invitation is a link. Send it however you like: WhatsApp, Messenger, email or text, to each guest or to a group chat." },
        { "q": "Digital or printed baptism invitations?", "a": "You can have both. Many parents keep printed invitations for the godparent, the grandparents and close family, and send the digital one to every guest for RSVP, maps and the schedule." },
        { "q": "Can I change details after sending it?", "a": "Yes. If the time, the church or the schedule changes, you fix it and guests see the latest version at once, from the same link. There's nothing to send again. And if you want everyone to know right away, post it on the baptism wall." },
        { "q": "Can I make a digital baptism invitation for Cyprus?", "a": "Yes, of course. StoryWall works online, so it's exactly the same for a baptism in Cyprus: invitation, theme, RSVP, QR photo sharing and guest book. Guests open it on their phone wherever they are, even abroad." }
    ],
    "finalCta": {
        "heading": ["The baptism", "starts here."],
        "copyStart": "Create your StoryWall with a digital invitation, photos and memories",
        "imageAlt": "A family celebrating a baptism outside a church on a Greek island",
        "eyebrow": "THE BAPTISM ON STORYWALL",
        "copyStrong": "to share with the people you love.",
        "cta": "Create your <b>StoryWall</b>"
    }
}
```

The English title is 48 characters. Check it is unique against the wedding title (the copy test does this).

- [ ] **Step 6: After every yes, write the catalogs**

Write the approved objects into `messages/el.json` and `messages/en.json` under `OccasionPages.BAPTISM`. Keep the files' existing formatting: 4-space JSON, and the key order of the object above. Use a small node script in the scratchpad that parses, replaces `OccasionPages.BAPTISM` and writes back with `JSON.stringify(json, null, 4) + '\n'`. Before using it, check that this round-trip leaves the rest of the file unchanged: `git diff --stat` must show only those two files, and the diff must only touch `BAPTISM`.

- [ ] **Step 7: Write the baptism copy test**

`lib/occasions/baptismCopy.test.ts`:

```ts
import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { OccasionFaqEntry } from '@/lib/occasions/occasionFaq';
import type { OccasionLengthValues } from '@/lib/occasions/occasionLength';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { OccasionGuestPhotoCopy } from '@/lib/occasions/pageCopy';
import { OCCASION_PAGE_FEATURE_ORDER } from '@/lib/occasions/pageFeatures';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const SPAN: OccasionPriceValues = { range: 'span', from: '79€', fromName: 'START', to: '179€', toName: 'SIGNATURE' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };
const ONE_LENGTH: OccasionLengthValues = { lengths: 'single', months: '12', monthCount: 12, extendable: 'no' };

// Tags rendered as plain text, so a test reads the words.
const TAGS = { b: (chunks: string) => chunks, em: (chunks: string) => chunks };

describe.each([
    ['el', el],
    ['en', en],
] as const)('baptism copy (%s)', (locale, messages) => {
    const t = createTranslator({
        locale,
        messages: messages as Messages,
        namespace: 'OccasionPages.BAPTISM',
        onError: (error) => {
            throw error;
        },
    });

    it('names the lowest price in the description only when there is one', () => {
        expect(t('meta.description', SPAN)).toContain('79€');
        expect(t('meta.description', NONE)).not.toMatch(/€|\{/);
    });

    it('formats every string that holds tags', () => {
        const rich = ['hero.h1', 'hero.kicker', 'rsvp.intro', 'finalCta.cta', ...[0, 1, 2].flatMap((index) => [`how.steps.${index}.body`, `why.with.steps.${index}.body`])];
        for (const key of rich) expect(t.markup(key, TAGS), key).not.toMatch(/[<>{}]/);
        expect(t('hero.trustPrice', SPAN)).toContain('79€');
        expect(t('themes.tileAlt', { name: 'N' })).toContain('N');
    });

    it('offers an extension only while one is on sale', () => {
        const without = t('faq.7.a', ONE_LENGTH);
        const withExtension = t('faq.7.a', { ...ONE_LENGTH, extendable: 'yes' });
        expect(withExtension.startsWith(`${without} `)).toBe(true);
        expect(without).not.toMatch(/[{}]/);
    });

    it('has 14 questions, linking only to the plans', () => {
        const faq = t.raw('faq') as OccasionFaqEntry[];
        expect(faq).toHaveLength(14);
        expect(faq.flatMap((entry) => (entry.link ? [entry.link.to] : []))).toEqual(['pricing']);
    });

    it('names each guest photo whole, one per picture', () => {
        const photos = t.raw('why.with.marquee') as OccasionGuestPhotoCopy[];
        expect(photos).toHaveLength(BAPTISM_PAGE_MEDIA.guestPhotos.length);
        for (const photo of photos) expect(photo.alt).toBeTruthy();
    });

    it('has copy for design features only, and no themes card', () => {
        const keys = Object.keys(t.raw('features') as Record<string, unknown>);
        expect([...OCCASION_PAGE_FEATURE_ORDER]).toEqual(expect.arrayContaining(keys));
        expect(keys).not.toContain('theme');
    });

    it('has no QR page link, since the baptism page links to none', () => {
        expect(t.has('hero.qrLink')).toBe(false);
    });
});
```

- [ ] **Step 8: Run the copy tests**

Run: `npx vitest run lib/occasions`
Expected: PASS, including `occasionCopy.test.ts`: the same keys in both languages, a title of at most 60 characters, at least 5 FAQs, and unique titles.

- [ ] **Step 9: Commit**

```powershell
git add messages/el.json messages/en.json lib/occasions/baptismCopy.test.ts
git commit -m "KAN-252: Baptism page copy from the draft, with approved English" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The shared page and the routing switch

**Files:**
- Move: `components/occasions/wedding/WeddingContent.tsx` → `components/occasions/sections/OccasionStoryContent.tsx`
- Modify: `components/occasions/OccasionPage.tsx`, `components/occasions/OccasionPage.test.tsx`
- Modify: `components/occasions/sections/{Hero,Why,Rsvp,Private,Features}Section.test.tsx` (baptism cases)
- Create: `components/occasions/sections/ThemesSection.test.tsx`
- Delete: `components/occasions/wedding/` (it should be empty)

- [ ] **Step 1: Write the failing page test**

Rewrite the cases in `components/occasions/OccasionPage.test.tsx`:
- swap the mock `@/components/occasions/wedding/WeddingContent` for `@/components/occasions/sections/OccasionStoryContent`, mocked as `() => null`;
- add a themes-offer mock so the baptism's plans offer themes:

```tsx
vi.mock('@/lib/occasions/occasionFeatures', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/occasions/occasionFeatures')>()),
    occasionOffersThemes: vi.fn(() => true),
}));
```

Import `getLandingThemes` from `@/lib/landingThemes` (already mocked) and `occasionPageConfig`. In `beforeEach`, add `vi.mocked(getLandingThemes).mockClear();`. Then:

```tsx
describe('OccasionPage', () => {
    it('renders the wedding page with its demo and QR links, no themes and no demo snapshot', async () => {
        const wedding = await layout('WEDDING');
        expect(wedding.type).toBe(OccasionStoryContent);
        expect(wedding.props).toMatchObject({
            config: occasionPageConfig('WEDDING'),
            demoHref: routes.demoEventType(eventTypeSlug('WEDDING')),
            length: { lengths: 'none', extendable: 'no' },
            price: { range: 'none' },
            qrHref: '/el/qr-code-gamou',
            themes: null,
        });
        expect(loadOccasionDemoPreview).not.toHaveBeenCalled();
        expect(getLandingThemes).not.toHaveBeenCalled();
    });

    it('renders the baptism page with its themes, and without demo or QR links', async () => {
        const baptism = await layout('BAPTISM');
        expect(baptism.type).toBe(OccasionStoryContent);
        expect(baptism.props).toMatchObject({ config: occasionPageConfig('BAPTISM'), demoHref: null, qrHref: null, themes: [] });
        expect(getLandingThemes).toHaveBeenCalledWith('BAPTISM', 'el');
        expect(loadOccasionDemoPreview).not.toHaveBeenCalled();
    });
});
```

`occasionPageConfig('BIRTHDAY')` returning null, which keeps an occasion on the old layout, is covered in `pageConfig.test.ts`. No ready occasion uses the old layout any more.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/occasions/OccasionPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Move `WeddingContent` and make it the shared page**

```powershell
git mv components/occasions/wedding/WeddingContent.tsx components/occasions/sections/OccasionStoryContent.tsx
```

Edit the moved file:
- **Props:** rename the props type to `OccasionStoryContentProps` and the function to `OccasionStoryContent`. Add `config: OccasionPageConfig` and `themes: LandingTheme[] | null`, the latter commented `// The live theme presets while the page shows its Themes section, else null.`
- **Namespace:** use `OccasionPages.${occasion.eventType}` in place of `'OccasionPages.WEDDING'`.
- **Locals:** after `createHref`, add:

```tsx
    const { media } = config;
    // Without a demo, the band and the hero's second button go to the themes.
    const themesHref = themes ? `#${OCCASION_SECTION_IDS.themes}` : null;
```

- **FAQ:** replace `WeddingFaqAnswer` with `FaqAnswer` in the FAQ map, and `group="wedding-faq"` with `group={\`${occasion.eventType.toLowerCase()}-faq\`}`.
- **Final call to action:** replace `image={WEDDING_PAGE_MEDIA.finalCtaImage}` with `image={media.finalCtaImage}`.
- **Media props:** replace every `media={WEDDING_PAGE_MEDIA}` with `media={media}`.
- **Hero:** pass `themesHref={themesHref}`.
- **Why:** pass `guestPhotos={config.guestPhotos}`.
- **Band:** replace the band with:

```tsx
                {/* Band, down to the demo or the themes */}
                {demoHref ? (
                    <LandingHeroTransition href="#demo" />
                ) : themesHref ? (
                    <LandingHeroTransition
                        click={{ event: 'nav', placement: 'hero_band', target: 'themes' }}
                        cta={t('band.cta')}
                        href={themesHref}
                        label={t('band.label')}
                    />
                ) : null}
```

- **Themes:** after `{/* Private social */}` and its section, add:

```tsx
                {/* Themes */}
                {themes ? <ThemesSection createHref={createHref} locale={locale} media={media} occasion={occasion} themes={themes} /> : null}
```

- **Comments:** update the remaining wording: `// A redesigned occasion page (wedding, baptism), section by section as in the design, with the landing's shared sections.` above the function, and `{/* Reviews from this occasion */}` for the reviews.
- **Imports:** remove `WEDDING_PAGE_MEDIA`. Add `ThemesSection`, `FaqAnswer`, `OCCASION_SECTION_IDS`, `type OccasionPageConfig`, `type LandingTheme`.

- [ ] **Step 4: Route by page config in `OccasionPage`**

Replace the `wedding` constant and everything that depends on it:

```tsx
    // A redesigned occasion draws its own demo phones and themes; the old layout loads its demo snapshot.
    const pageConfig = occasionPageConfig(occasion.eventType);
    const wantsThemes = pageConfig ? pageConfig.themes : true;
    const [preview, themes] = await Promise.all([
        eventType?.hasDemo && !pageConfig ? loadOccasionDemoPreview(occasion.eventType, locale) : null,
        wantsThemes && occasionOffersThemes(config, occasion.eventType) ? getLandingThemes(occasion.eventType, locale) : null,
    ]);
```

```tsx
    const demoHref = eventType?.hasDemo && (pageConfig?.demo ?? true) ? routes.demoEventType(eventTypeSlug(occasion.eventType)) : null;
    // Today the QR page is live whenever weddings are; this follows its own rule if that changes.
    const qrHref = pageConfig?.qrLinks && qrWeddingPageLive(config) ? getQrWeddingPath(locale) : null;
```

```tsx
            {pageConfig ? (
                <OccasionStoryContent
                    campaign={campaign}
                    config={pageConfig}
                    demoHref={demoHref}
                    featureKeys={featureKeys}
                    length={length}
                    locale={locale}
                    occasion={occasion}
                    price={price}
                    qrHref={qrHref}
                    theme={theme}
                    themes={themes}
                />
            ) : (
                <OccasionContent
```

Leave the `OccasionContent` branch's props as they are. Update the imports: `OccasionStoryContent` from `@/components/occasions/sections/OccasionStoryContent` and `occasionPageConfig` from `@/lib/occasions/pageConfig`; remove `WeddingContent`.

- [ ] **Step 5: Add the baptism cases to the section tests**

Each section test gets a `describe('… (baptism)')` with the baptism's own media and occasion:

`HeroSection.test.tsx`. Add the client intl mock, so the post cards can read their alt text:

```tsx
vi.mock('next-intl', async (importOriginal) =>
    (await import('@/components/occasions/sections/__fixtures__/intlClientMock')).withGreekMessages(await importOriginal()),
);
```

Change the visual mock to render what it gets:

```tsx
vi.mock('@/components/occasions/OccasionHeroVisual', () => ({
    OccasionHeroVisual: ({ className, feed, posts }: { className?: string; feed?: ReactNode; posts?: readonly ReactNode[] }) => (
        <div className={className} data-testid="visual">
            {feed}
            {posts}
        </div>
    ),
}));
```

Then add:

```tsx
describe('HeroSection (baptism)', () => {
    const baptism = (overrides: Partial<Parameters<typeof HeroSection>[0]> = {}) =>
        HeroSection({
            campaign: null,
            createHref: '/events/new?type=baptism',
            demoHref: null,
            locale: 'el',
            media: BAPTISM_PAGE_MEDIA,
            occasion: findOccasion('BAPTISM')!,
            price: SPAN,
            qrHref: null,
            themesHref: '#themes',
            ...overrides,
        });

    it('has one h1, the keyword', async () => {
        render(await baptism());
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ηλεκτρονικό προσκλητήριο βάπτισης & ιστοσελίδα βάπτισης');
    });

    it('sends the second button to the themes, with no demo and no QR link', async () => {
        render(await baptism());
        const themes = screen.getByRole('link', { name: 'Δες τα θέματα' });
        expect(themes).toHaveAttribute('href', '#themes');
        expect(JSON.parse(themes.getAttribute('data-landing-click')!)).toEqual({ event: 'nav', placement: 'hero', target: 'themes' });
        expect(screen.queryByRole('link', { name: 'Demo' })).toBeNull();
        expect(screen.queryByRole('link', { name: /QR code/ })).toBeNull();
    });

    it('shows its own feed screenshot and two baptism post cards in the phone', async () => {
        render(await baptism());
        const visual = screen.getByTestId('visual');
        expect(within(visual).getByRole('img', { name: 'Η αρχική σελίδα μιας βάπτισης στο StoryWall με θέμα Μονόκερος' }).getAttribute('src')).toContain('baptism-feed-unicorn');
        expect(within(visual).getAllByRole('img', { name: 'Φωτογραφία καλεσμένου' })).toHaveLength(2);
    });

    it('names its lowest price', async () => {
        render(await baptism({ price: { range: 'span', from: '79€', fromName: 'START', to: '179€', toName: 'SIGNATURE' } }));
        expect(screen.getByText('Από 79€')).toBeInTheDocument();
    });
});
```

Import `ReactNode` and `BAPTISM_PAGE_MEDIA`. The wedding cases still pass: the wedding passes no feed or posts, so the mock renders an empty div with the same classes.

`WhySection.test.tsx`:

```tsx
describe('WhySection (baptism)', () => {
    it('shows three still guest photos named as in the draft, and no QR page link', async () => {
        render(
            <LandingMotionProvider>
                {await WhySection({ guestPhotos: 'row', locale: 'el', media: BAPTISM_PAGE_MEDIA, occasion: findOccasion('BAPTISM')!, qrHref: null })}
            </LandingMotionProvider>,
        );
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Οι φωτογραφίες της βάπτισης δεν πρέπει να χαθούν σε 100 κινητά.');
        const photos = screen.getAllByRole('img', { name: /φωτογραφία από/ });
        expect(photos.map((photo) => photo.getAttribute('alt'))).toEqual([
            'Η οικογένεια έξω από την εκκλησία — φωτογραφία από Άννα, θεία',
            'Το μυστήριο στην κολυμπήθρα — φωτογραφία από Γιώργο, νονό',
            'Το τραπέζι της βάπτισης δίπλα στη θάλασσα — φωτογραφία από Ελένη, γιαγιά',
        ]);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('196')).toBeInTheDocument();
    });
});
```

`RsvpSection.test.tsx`:

```tsx
describe('RsvpSection (baptism)', () => {
    it('bolds the intro and puts children first in the checklist', async () => {
        render(await RsvpSection({ locale: 'el', media: BAPTISM_PAGE_MEDIA, occasion: findOccasion('BAPTISM')! }));
        expect(screen.getByText('RSVP του StoryWall').tagName).toBe('STRONG');
        expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Συνοδοί & παιδιά');
    });
});
```

`PrivateSection.test.tsx`:

```tsx
describe('PrivateSection (baptism)', () => {
    it('shows the four baptism cards', async () => {
        render(await PrivateSection({ locale: 'el', occasion: findOccasion('BAPTISM')! }));
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Ιδιωτικός τοίχος',
            'Διαχείριση από εσένα',
            'Ρόλοι καλεσμένων',
            'Λήψη σε αρχική ποιότητα',
        ]);
        expect(screen.getByText(/Γονείς, νονός ή νονά/)).toBeInTheDocument();
    });
});
```

`FeaturesSection.test.tsx`:

```tsx
describe('FeaturesSection (baptism)', () => {
    it("uses the baptism's own words, the shared line elsewhere, and never a themes card", async () => {
        render(await FeaturesSection({ featureKeys: ['invitation', 'theme', 'quiz_polls'], locale: 'el', occasion: findOccasion('BAPTISM')! }));
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Ηλεκτρονικό προσκλητήριο', 'Κουίζ & Ψηφοφορίες']);
        expect(screen.getByText(/με το θέμα που διάλεξες/)).toBeInTheDocument();
    });
});
```


`components/occasions/sections/ThemesSection.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemesSection } from '@/components/occasions/sections/ThemesSection';
import { findOccasion } from '@/lib/occasions/occasions';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));

const THEMES = [{ backgroundColor: '#e6f6f2', id: 'unicorn', illustrationUrl: '/landing/decor-10.webp', name: 'Μονόκερος' }];

afterEach(cleanup);

describe('ThemesSection (baptism)', () => {
    it("names each tile in the baptism's words and links to create", async () => {
        render(await ThemesSection({ createHref: '/events/new?type=baptism', locale: 'el', media: BAPTISM_PAGE_MEDIA, occasion: findOccasion('BAPTISM')!, themes: THEMES }));
        expect(screen.getByRole('img', { name: 'Θέμα βάπτισης Μονόκερος' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Φτιάξε το StoryWall σου/ })).toHaveAttribute('href', '/events/new?type=baptism');
        expect(screen.getByText('Έτσι δείχνει μια βάπτιση με θέμα Μονόκερος.')).toBeInTheDocument();
    });
});
```

- [ ] **Step 6: Delete the empty wedding folder**

Run: `Get-ChildItem -Recurse components\occasions\wedding`
Expected: nothing. If a file is left, move it into `sections/` first. Then run `Remove-Item components\occasions\wedding -Recurse -Confirm:$false`.

Run: `rg -n "occasions/wedding|WeddingContent|WeddingHero|WeddingWhy|WeddingRsvp|WeddingPrivate|WeddingFeatures|weddingMedia|weddingFeatures|weddingCopy" --glob "!docs/**" .`
Expected: no hits, except `lib/occasions/weddingCopy.test.ts`. Rename that file to `lib/occasions/weddingPageCopy.test.ts` with `git mv`. Its describe stays `'wedding copy (%s)'`, because it tests the wedding's copy.

- [ ] **Step 7: Run everything**

Run: `npx tsc --noEmit; npx eslint components/occasions components/landing lib/occasions lib/landingHero.ts lib/landingTracking.ts; npx vitest run`
Expected: no type errors, no lint errors, and every test passing. If an unrelated vitest file fails, run it alone and compare with `staging`. The known save-my-date timeouts (memory note) are not ours; note them for the PR.

- [ ] **Step 8: Commit**

```powershell
git add -A components/occasions lib/occasions
git commit -m "KAN-252: Baptism page on the shared occasion sections" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Stories

**Files:**
- Modify: `.storybook/copy.ts` (add `translatorFor`)
- Create: `.storybook/occasionPage.tsx`
- Create:
  - `components/occasions/sections/hero/HeroView.stories.tsx`
  - `components/occasions/sections/why/WhyView.stories.tsx`
  - `components/occasions/sections/why/WhyPhotoRow.stories.tsx`
  - `components/occasions/sections/rsvp/RsvpView.stories.tsx`
  - `components/occasions/sections/private/PrivateView.stories.tsx`
  - `components/occasions/sections/themes/ThemesView.stories.tsx`
  - `components/occasions/sections/themes/ThemeTile.stories.tsx`
  - `components/occasions/sections/features/FeaturesView.stories.tsx`

- [ ] **Step 1: Add the translator helper and the page decorator**

Append to `.storybook/copy.ts`:

```ts
import { createTranslator, type Messages } from 'next-intl';

import type { PageTranslator } from '@/lib/occasions/pageCopy';

// A translator over the toolbar language's catalog, for the section props builders the server uses.
export function translatorFor(globals: Globals, namespace: string): PageTranslator {
    const locale = globals.locale === 'el' ? 'el' : 'en';
    return createTranslator({ locale, messages: (locale === 'el' ? el : en) as Messages, namespace }) as unknown as PageTranslator;
}
```

Move the new imports to the top of the file, next to the existing ones.

`.storybook/occasionPage.tsx`:

```tsx
import type { Decorator } from '@storybook/nextjs-vite';

import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// An occasion page's section as it sits on the page: the landing's tokens (fonts, gradient) and its motion toggle.
export const withOccasionPage: Decorator = (Story) => (
    <LandingMotionProvider>
        <div className={LANDING_TOKENS_CLASS}>
            <Story />
        </div>
    </LandingMotionProvider>
);
```

- [ ] **Step 2: Write the stories**

Each story renders its view from the real copy through the same builder the server uses. Titles are `Occasions/…`.

`components/occasions/sections/why/WhyView.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { translatorFor } from '@/.storybook/copy';
import { withOccasionPage } from '@/.storybook/occasionPage';
import { whyViewProps } from '@/components/occasions/sections/why/whyViewProps';
import { WhyView } from '@/components/occasions/sections/why/WhyView';
import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

const meta = { title: 'Occasions/WhyView', decorators: [withOccasionPage] } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// The wedding: fourteen photos sliding past, the scan step linking to the QR page.
export const WeddingMarquee: Story = {
    render: (_, { globals }) => (
        <WhyView
            {...whyViewProps({
                imageAlt: translatorFor(globals, 'ImageAlt'),
                layout: 'marquee',
                media: WEDDING_PAGE_MEDIA,
                qrHref: '/el/qr-code-gamou',
                why: translatorFor(globals, 'OccasionPages.WEDDING.why'),
            })}
        />
    ),
    // The marquee moves, so its frame is never the same twice.
    tags: ['visual-skip'],
};

// The baptism: three photos standing still, no QR page link.
export const BaptismRow: Story = {
    render: (_, { globals }) => (
        <WhyView
            {...whyViewProps({
                imageAlt: translatorFor(globals, 'ImageAlt'),
                layout: 'row',
                media: BAPTISM_PAGE_MEDIA,
                qrHref: null,
                why: translatorFor(globals, 'OccasionPages.BAPTISM.why'),
            })}
        />
    ),
};
```

If the visual check already captures other stories with framer-motion marquees, look at how they are made stable (`rg -n "visual-skip" components/landing`) and follow that instead of skipping.

The other stories follow the same pattern:
- **`HeroView.stories.tsx`:** add `withAppContext` from `.storybook/appContext.tsx` to the decorators, with `parameters: { app: { user: null } }` for signed out. Stories `Wedding` (demo second button, landing visual) and `Baptism` (themes second button, `heroVisual(BAPTISM_PAGE_MEDIA.hero!, …)`), built with `heroViewProps` and `translatorFor` for `OccasionPages.<TYPE>`, `OccasionPages.common` and `LandingPage`. Use `price: { range: 'span', from: '79€', fromName: 'START', to: '179€', toName: 'SIGNATURE' }`, `alternatePaths: { el: '/el/vaptisi', en: '/baptisms' }` and `locale: globals.locale === 'el' ? 'el' : 'en'`. The hero visual floats; tag `visual-skip` if it is not stable, using the same check as above.
- **`WhyPhotoRow.stories.tsx`:** `Default`, with three tiles built from `BAPTISM_PAGE_MEDIA.guestPhotos` and the baptism's `why.with.marquee` alts.
- **`RsvpView.stories.tsx`:** `Wedding` and `Baptism`, from `rsvpViewProps(translatorFor(globals, 'OccasionPages.<TYPE>.rsvp'), media.rsvpPictures[locale])`.
- **`PrivateView.stories.tsx`:** `Wedding` and `Baptism`.
- **`ThemesView.stories.tsx`:**
  - `SixThemes` uses `themesViewProps` with six local fixture themes. Illustrations are `/landing/decor-10.webp` … `/landing/decor-15.webp`. Backgrounds are the draft's `#f6eefb`, `#e7f5ef`, `#fdeaea`, `#c6e8fb`, `#e6f6f2`, `#e7f7fd`. Names are the draft's (Ουράνιο Τόξο, Μικρός Πρίγκιπας, Μικρή Νεράιδα, Χάρτινο Καραβάκι, Μονόκερος, Αεροπλανάκι); in production they come from the backend, so they are fixture data.
  - `NoThemes` uses `themes: []`.
- **`ThemeTile.stories.tsx`:** `Default` and `LongName` (`Μικρός Πρίγκιπας` in a 104px wide wrapper, to show the name wraps). Render inside a `<ul className="m-0 grid w-26 list-none p-0">` because the tile is an `li`.
- **`FeaturesView.stories.tsx`:** `Wedding` (all ten design features) and `Baptism` (the nine with baptism copy), from `featuresViewProps`.

- [ ] **Step 3: Run Storybook's build and the lint**

Run: `npx eslint .storybook components/occasions/sections; npm run build-storybook`
Expected: no lint errors and a clean build. If `react/jsx-no-bind` flags the `render` arrows, check another story file for the pattern used (`rg -n "render:" components --glob "*.stories.tsx" | Select-Object -First 5`) and follow it.

- [ ] **Step 4: Look at each new story**

Run Storybook (`npm run storybook`, in the background) and open each new story at 375px and 1280px, in Greek and English, in the built-in browser pane with `preview_start {url: "http://localhost:6006/"}`. Check for no overlap, readable text and the draft's look for Themes.

- [ ] **Step 5: Commit**

```powershell
git add .storybook/copy.ts .storybook/occasionPage.tsx components/occasions/sections
git commit -m "KAN-252: Stories for the occasion page sections" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Full checks, visual check, PR

**Files:** `docs/superpowers/specs/2026-11-21-baptism-occasion-page-design.md` (record what changed during planning)

- [ ] **Step 1: Update the spec**

Edit the spec to match what was built:
- The theme tile is a new `ThemeTile`, not the landing's, because names must wrap.
- The hero posts are `OccasionPostCard`s with an avatar each, and `OccasionPageMedia` has `themesPhone`.
- The band's CTA is uppercase in the copy itself, like the landing's.
- The old layout stays unreachable until KAN-254.
- FAQ 8's extension sentence follows the config.

- [ ] **Step 2: Run every automated check**

Run each command and record its result:
- `npx tsc --noEmit`, expected: no errors.
- `npx eslint .`, expected: no errors. Fix any warnings in the files this work touched.
- `npx vitest run`, expected: all pass. Name any known unrelated timeout.
- `npx next build`, expected: success. Revert any `AGENTS.md` change it makes.

- [ ] **Step 3: Check the pages yourself**

Never `preview_start {name}` (memory note *Dev server shares .next*). Start the worktree's own dev server on a free port, in the background, against the staging API, so the config, plans and theme presets are real.
1. Find the API base variable: `rg -n "NEXT_PUBLIC_API|API_BASE" lib/api/*.ts .env*`.
2. Run `npx next dev --webpack -p 3101` with that variable set to the staging API.
3. Open `preview_start {url: "http://localhost:3101/el/vaptisi"}`.

At 375×812 and at desktop width, check these pages:
- `/el/vaptisi` and `/baptisms`: compare with the draft screenshots in the scratchpad (`d00–d08.png`, `desk.png`, `mob.png`). Check the hero phone, `#themes` links in the hero and band, the photo row, the Themes section with six tiles, the Features without a themes card, the FAQ (14 entries) and the final image.
- `/el/gamos` and `/weddings`: compare with production `https://www.storywall.gr/el/gamos` at the same widths. They must look identical, including the demo band, the marquee, the QR links and the demo section.

Then:
- Check that `view-source` has one `<h1>`, and FAQ JSON-LD whose 14 questions match the page.
- Run `curl -s http://localhost:3101/el/vaptisi/share-image -o $env:TEMP\og.png` and look at the image: the h1 must be plain text, with no `<em>`.
- Stop the dev server, check that nothing still listens on :3101, and revert `AGENTS.md`.

- [ ] **Step 4: SEO check against `docs/seo-guidelines.md`**

Read the guidelines. Go through them for `/vaptisi` and `/baptisms`:
- one h1 with the keyword;
- title ≤ 60 characters and unique;
- the description has the price only when there is one;
- hreflang pairs;
- FAQ structured data matches the visible FAQ;
- every image has real, localized alt text (the theme tiles, the phones, the guest photos, the avatars, the post cards);
- slugs are unchanged.

List anything that breaks a rule as a **BLOCKER** in the PR and in your reply.

- [ ] **Step 5: Push and open the PR into staging**

```powershell
git push -u origin claude/kan-252-baptism-page
gh pr create --base staging --title "KAN-252: Baptism page on the shared occasion sections" --body-file <scratchpad>\pr-body.md
```

The PR body has these parts:
- **Summary.**
- **What changed:** the sections moved and became shared, the page config, the baptism sections, and the copy approved on 2026-11-21.
- **Wedding unchanged,** and how that was checked.
- **Screenshots** from Step 3.
- **Checks** with their results.
- **SEO,** including any BLOCKER.
- **Follow-ups:** KAN-253, KAN-254.
- The line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Name only KAN-252 in the body (memory note *Jira keys in PR bodies*). Write "KAN-253" and "KAN-254" as plain text with a note that they are follow-ups, or link them without the bare key if the board moves them.

- [ ] **Step 6: Watch the visual check**

The `visual-regression` check will show new stories. Wedding must show no change. Never tick the approve box and never merge with `--admin`. Send the owner the report link and wait. The known tiny diffs from the memory note *Known visual noise may merge* may be listed and merged, but nothing new may.
