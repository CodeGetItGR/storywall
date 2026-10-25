# Wedding Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Project rule: never dispatch parallel subagents without the owner's explicit permission for this task (CLAUDE.md → Workflow). One subagent at a time is fine.

**Goal:** Rebuild `/el/gamos` and `/weddings` to match the owner's design file `storywall-gamos-2.html` section by section, with every picture that has words in it rebuilt as localized HTML.

**Architecture:** `OccasionPage` renders a new server component `WeddingContent` for `WEDDING` and keeps `OccasionContent` for every other occasion. `WeddingContent` composes reused landing sections (header, how it works, demo band, demo, reviews, pricing, FAQ, final CTA, links, footer) with new wedding sections under `components/occasions/wedding/`. All mocks (phone feed, RSVP notifications and phones, demo phones) are presentational server components sized in container units; photos come from one map, `lib/occasions/weddingMedia.ts`. Prices in copy come from the live config through `occasionPriceValues()`.

**Tech Stack:** Next.js 16 App Router (server components), React 19, Tailwind v4, framer-motion 13, next-intl 4 (`t.rich`, `t.markup`, ICU `select`), lucide-react, vitest + @testing-library/react, sharp (photo conversion script only), Figma MCP `generate_image` (`gemini-3.1-flash-image`).

**Spec:** [docs/superpowers/specs/2026-10-24-wedding-landing-redesign-design.md](../specs/2026-10-24-wedding-landing-redesign-design.md)

**Design file (reference for every visual check):** `C:\Users\User\Downloads\storywall-gamos-2.html`. Its stripped copy and extracted images live in the session scratchpad: `C:\Users\User\AppData\Local\Temp\claude\C--Users-User-WebstormProjects-storywall--claude-worktrees-wedding-landing-page-spec-aeadd7\ed2da06d-369a-4cff-9cc9-f104d38fc9c3\scratchpad\design\` (`stripped.html`, `images\img_<hash>.<ext>`). Below, `$SP` means that scratchpad folder and `$WT` means the worktree `C:\Users\User\WebstormProjects\storywall\.claude\worktrees\wedding-landing-page-spec-aeadd7`.

To view the design in the browser pane, serve the original file's folder (a `file://` URL does not open there):

```bash
python -I -m http.server 4599 --directory "C:/Users/User/Downloads"
```

Run it in the background and open `http://localhost:4599/storywall-gamos-2.html` with `preview_start {url}`. Never `preview_start {name}` in this repo (memory: it breaks the shared `.next` cache); the app runs at `http://localhost:3000/`.

---

## Decisions made while planning (not in the spec)

| Topic | Decision |
| --- | --- |
| Meta description price | "Από {price}." comes from live config, like the hero chip; left out when config fails (owner chose this). Every caller of `meta.description` passes the price values: metadata, JSON-LD. |
| Mock language | Greek page: app labels in Greek ("Η ιστορία σου", "Πρόγραμμα", "30 ΔΕΚ 2026", "Ρόδος"); post captions, comments and names exactly as in the design, some in English (owner chose this). English page: everything in English. |
| Price helper | `occasionPriceValues(config, eventType)` in `lib/occasions/occasionPrice.ts`, generic (not wedding-only as the spec's `weddingPriceRange()` said). Range is `span`, `single` (one price, so FAQ 10 never says "from 119€ to 119€") or `none`. |
| Hero cards | Post cards reuse `OccasionPostCard`; comment cards are a new `OccasionCommentCard` next to it. |
| Extra optional props on shared components | Beyond the spec's list: `LandingHeader.className` (transparent over the wedding hero), `LandingHeroVisual.className` (the design sizes the hero visual differently), `LandingHowItWorks` step description as `ReactNode` (bold words), `LandingDemo` `phones` / `previewLabel` / string `eyebrow` / `ReactNode` copy, `LandingFinalCta.centered` + `ReactNode` cta, `LandingFaq.centered` + `group` and `ReactNode` answers, `LandingPricing.kicker`, `OccasionPageShell.className`. All optional; the main landing and baptism render exactly as before. Task 22 updates the spec's "Shared components gain only…" line. |
| Brand marks | Viber, WhatsApp and Messenger from `react-icons/fa` (already a dependency; inline SVG). Email is lucide `Mail`; SMS is a small text badge. |
| Hero links | The hero's demo link reuses `LandingPage.hero.demoCta`. `occasionHeaderLinks()` builds the header links for both the wedding hero and `OccasionHero`, and adds FAQ. |
| Real copy in tests | `components/occasions/wedding/__fixtures__/intlServerMock.ts` makes `getTranslations` serve the real `messages/*.json`, so section tests assert on the design's words. |
| QR links | Why StoryWall step 1 and FAQ 3 link to the QR wedding page only while `qrWeddingPageLive(config)` is true; otherwise the text shows without a link. |
| Phone mocks | `MockPhone` has a fixed 9 / 19.5 screen that is a size container, and a bezel sized in `cqw`, so every screen scales with its phone. |
| Shared section frame | `WeddingWrap` (width and gutters) and `WeddingSectionHead` (kicker, two-line heading, intro) are shared by Why, Private and Features. |
| Demo picture | The two demo phones go in through `LandingDemo`'s `phones` prop and are named once by `previewLabel`. The wedding page loads neither the demo snapshot nor the themes row, which only the old layout used. |
| FAQ links | FAQ entries may carry `link: { to: 'qr' \| 'pricing', label }`. The QR link shows only while the QR wedding page is live. JSON-LD answers never include link labels. |
| Features background | Warm gradient from the design's last `!important` rule for `#dynatotites` (`#3b2529 → #402a26`). Task 21's side-by-side check compares it with the design. |

---

## File structure

**New — logic**

| File | Responsibility |
| --- | --- |
| `lib/landingTokens.ts` | `LANDING_TOKENS_CLASS`: the landing's CSS custom properties as Tailwind classes, for a page that does not load `landing.css`. |
| `lib/occasions/occasionPrice.ts` (+ test) | `occasionPriceValues()`: lowest/highest live plan price for an event type, as ICU values. |
| `lib/occasions/occasionPrice.server.ts` | `loadOccasionPriceValues()`: fetches config (best-effort) and returns the values. Used by metadata. |
| `lib/occasions/occasionFaq.ts` (+ test) | FAQ entry types, `occasionFaqEntries()` which formats answers with price values and keeps link data, and `occasionFaqLinkHref()` which says where a link goes. |
| `lib/occasions/weddingMedia.ts` | Every wedding photo and which face belongs to which name. |
| `lib/occasions/weddingFeatures.ts` (+ test) | Design order of the wedding features and their icon masks. |
| `lib/occasions/weddingCopy.ts` | Types for the wedding copy shapes read with `t.raw`. |
| `lib/occasions/weddingCopy.test.ts` | ICU strings render with and without prices, in both languages. |
| `hooks/useMarqueeMotion.ts` (+ test) | Framer `x` loop for the photo marquee; pauses on hover, motion toggle and reduced motion. |
| `lib/occasions/occasionSections.test.ts` | `occasionHeaderLinks()` builds the same links for both heroes. |
| `components/occasions/wedding/__fixtures__/intlServerMock.ts` | `next-intl/server` mock that serves the real messages, for server component tests. |

**New — UI** (`components/occasions/wedding/`)

| File | Responsibility |
| --- | --- |
| `WeddingContent.tsx` | Page composition, section order, shared copy wiring. |
| `WeddingWrap.tsx`, `WeddingSectionHead.tsx` | Section width and gutters; kicker, two-line heading and intro. |
| `WeddingFaqAnswer.tsx` | An FAQ answer with its optional link. |
| `WeddingHero.tsx` | Hero layout: breadcrumb, kicker, h1, subtitle, body, actions, trust line, visual. |
| `WeddingHeroActions.tsx` | Gradient create CTA + ghost demo link. |
| `feed/WeddingPhoneFeed.tsx` | The hero phone's feed: app bar, cover, date, stories, composer, 9 posts, music card. |
| `feed/FeedAppBar.tsx`, `feed/FeedCover.tsx`, `feed/FeedStories.tsx`, `feed/FeedComposer.tsx`, `feed/FeedPost.tsx`, `feed/FeedMusicCard.tsx` | Feed parts, shared with the demo feed phone. |
| `mock/MockPhone.tsx` | Gold Tailwind bezel around a white `cqw` screen. |
| `mock/MockPhoto.tsx` | `ProtectedImage` for an `OccasionPhoto` (object-position, low priority). |
| `mock/MockStatusBar.tsx` | "17:59" + signal/wifi/battery. |
| `mock/MockTabBar.tsx` | App bottom bar (home, music, mail, share, settings, menu). |
| `mock/GradientIcon.tsx` | Brand-gradient mask icon. |
| `../OccasionCommentCard.tsx` | Tilted comment card beside the hero phone. |
| `WeddingWhy.tsx` + `why/WhyWithout.tsx`, `why/WhyQrSteps.tsx`, `why/WhyMarquee.tsx`, `why/WhyStats.tsx` | "Why StoryWall" section. |
| `WeddingRsvp.tsx` + `rsvp/RsvpComparison.tsx`, `rsvp/RsvpColumnHead.tsx`, `rsvp/RsvpWithout.tsx`, `rsvp/RsvpNotification.tsx`, `rsvp/RsvpAppMark.tsx`, `rsvp/RsvpWith.tsx`, `rsvp/RsvpHostHeader.tsx`, `rsvp/RsvpGuestListScreen.tsx`, `rsvp/RsvpFormScreen.tsx`, `rsvp/RsvpStatsScreen.tsx`, `rsvp/RsvpChecklist.tsx` | RSVP section. |
| `WeddingPrivate.tsx` | Four numbered private-social cards. |
| `WeddingDemoPhones.tsx` + `demo/DemoProfileScreen.tsx`, `demo/DemoFeedScreen.tsx` | The two tilted demo phones. |
| `WeddingFeatures.tsx` | Dark features grid. |

**Modified**

| File | Change |
| --- | --- |
| `components/landing/LandingHeroVisual.tsx` | `comments` and `className` props. |
| `components/occasions/OccasionHeroVisual.tsx` | Pass `comments`, `className` through. |
| `components/landing/LandingHowItWorks.tsx` | Step `description: ReactNode`. |
| `components/landing/LandingPricing.tsx` | `kicker` → centered header on white. |
| `components/landing/LandingFaq.tsx`, `LandingFaqItem.tsx` | `centered`, `group`, `ReactNode` answers. |
| `components/landing/LandingDemo.tsx` | `phones`, `previewLabel`, string `eyebrow`, `ReactNode` copy. |
| `components/landing/LandingFinalCta.tsx` | `centered`; `cta` as `ReactNode`. |
| `components/landing/LandingHeader.tsx` | `className`. |
| `lib/occasions/occasionSections.ts` | `occasionHeaderLinks()`. |
| `components/occasions/OccasionHero.tsx` | Uses `occasionHeaderLinks()`; h1 through `t.markup` (Task 10 gives the wedding h1 an `<em>`). |
| `components/occasions/OccasionPageShell.tsx` | Tailwind replaces the `.occasion-page` rules; `className` prop. |
| `components/landing/landing.css` | `.occasion-page` rules removed. |
| `components/occasions/OccasionPage.tsx` | WEDDING → `WeddingContent`; price values; QR href; no demo snapshot or themes for WEDDING. |
| `components/qrWedding/QrWeddingContent.tsx` | Final CTA photo from `weddingMedia.ts` (same photo). |
| `components/occasions/OccasionStructuredData.tsx` | Price values; formatted FAQ answers. |
| `lib/occasionMetadata.ts` | Description with price values. |
| `lib/occasions/occasionShareImage.ts` | `t.markup` for an h1 with `<em>`. |
| `lib/occasions/occasionMedia.ts` | WEDDING entry removed. |
| `messages/el.json`, `messages/en.json` | `OccasionPages.WEDDING` rewritten; `OccasionPages.common.breadcrumbLabel` added. |
| `docs/superpowers/specs/2026-10-24-wedding-landing-redesign-design.md` | Note the extra optional props. |

---

## Shared conventions for every task

- Commit after each task with the message given; end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Every visible string is a message key. Brand names (Viber, WhatsApp, Messenger, SMS, StoryWall wordmark) and the mock clock "17:59" are not copy.
- JSX section comments above every meaningful visual block (CLAUDE.md).
- Mocks are `aria-hidden="true"` except where a task gives the block one localized label.
- Run single tests with `npx vitest run <path>`; types with `npx tsc --noEmit`; lint with `npx eslint <paths>`.

---

### Task 1: Worktree setup and baseline

**Files:** none (environment only)

- [ ] **Step 1: Confirm the branch is based on the latest staging**

```bash
git -C "$WT" fetch origin staging
git -C "$WT" log --oneline -1 origin/staging
git -C "$WT" merge-base --is-ancestor origin/staging HEAD && echo "up to date"
```

Expected: `up to date`. If not, stop and ask the owner before rebasing (memory: worktrees start on main; this one was reset to staging earlier).

- [ ] **Step 2: Link node_modules to the main checkout (lockfiles must match)**

```bash
cmp -s "$WT/package-lock.json" "C:/Users/User/WebstormProjects/storywall/package-lock.json" && echo "lockfiles match"
```

Expected: `lockfiles match`. Then, in PowerShell:

```powershell
New-Item -ItemType Junction -Path "$env:WT\node_modules" -Target "C:\Users\User\WebstormProjects\storywall\node_modules"
```

(Use the literal worktree path if `$env:WT` is not set.) If the lockfiles differ, stop and ask.

- [ ] **Step 3: Baseline checks**

```bash
npx vitest run lib/occasions components/landing components/occasions "app/(landing)"
npx tsc --noEmit
```

Expected: all pass, no type errors. Note any pre-existing failure in the task log before changing code.

- [ ] **Step 4: Baseline screenshots**

Start the dev server from the worktree only if nothing answers on `http://localhost:3000/` (memory "Dev server shares .next"; open it with `preview_start {url: "http://localhost:3000/"}`, never by name). Find the baptism slug with `grep -n "BAPTISM" -A3 lib/occasions/occasions.ts`. Take full-page screenshots of `/el`, `/el/gamos` and the baptism page at 1440 and 390 wide, and keep them in `$SP/baseline/`. Tasks 8 and 21 compare against them.

No commit (nothing changed; `node_modules` is gitignored).

---

### Task 2: Photos

**Prerequisite:** the owner approved the look of the two test photos (C1 cover, F1 face). Do not start this task without that approval; each call spends Figma AI credits.

**Figma:** file "StoryWall wedding photos", fileKey `zmQIsAwv41dJ3EaGaFoLuc`. Call `create_session` with that key first (task description "Generate wedding landing photos") and pass the returned UUID as `sessionId` on every call. Model `gemini-3.1-flash-image`.

**Files:**
- Create: `$SP/photos/manifest-generated.json`, `$SP/photos/manifest-design.json`, `$SP/scripts/convert-photos.cjs` (scratchpad, not the repo)
- Create: `public/landing/wedding/*.webp`, `public/landing/wedding/icons/*.webp`

- [ ] **Step 1: Generate the 32 remaining photos**

One `generate_image` call per row, with `fileKey`, `sessionId`, `model: "gemini-3.1-flash-image"`, the `width`/`height` given and the prompt exactly as written. Record each result's `image.url` and node id in `$SP/photos/urls.md` (URLs expire after 7 days, so download in Step 2 the same day).

Every scene prompt ends with: `Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs.` Every face prompt ends with: `Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos.` (Shown in full in each row below.)

| Id | width×height | Prompt |
| --- | --- | --- |
| S1 | 1024×1024 | Photorealistic candid selfie of a smiling bride and groom wearing sunglasses on a sunny Greek island terrace, white walls and blue sea behind them, bright summer daylight, warm tones. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| S2 | 1024×1024 | Photorealistic close-up from behind of a bride's elegant low updo with small white flowers and pearl pins, soft window light in a bridal suite, creamy blurred background. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| S3 | 1024×1024 | Photorealistic portrait of a smiling groom in a navy suit and white shirt standing outdoors among olive trees, golden afternoon light, shallow depth of field. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P1 | 1024×768 | Photorealistic candid wedding photograph of a laughing bride with loose blonde waves surrounded by four bridesmaids in matching blush satin robes, getting ready in a bright hotel room with soft window light, warm and joyful. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P2a | 1024×1024 | Photorealistic close-up of a mother's hands buttoning the back of a bride's ivory lace wedding dress, soft daylight from a window, tender moment, shallow depth of field. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P2b | 1024×1024 | Photorealistic tender moment of a bride and her mother with foreheads touching and eyes closed, bride in ivory lace with a veil, mother in a dusty-blue dress, soft window light. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P3 | 1024×768 | Photorealistic candid photo of three smiling groomsmen in light grey suits fixing the groom's black bow tie in a sunny courtyard, playful mood, warm light. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P4 | 1024×768 | Photorealistic photo from behind of elegantly dressed wedding guests walking along a stone path toward a small whitewashed chapel with a blue dome by the sea on a Greek island, late afternoon sun. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P5 | 1024×768 | Photorealistic close-up of a bride and groom exchanging gold rings during a Greek Orthodox wedding ceremony, an Orthodox priest in gold vestments softly blurred behind them, candlelight and warm church light. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P6a | 1024×1024 | Photorealistic photo of a bride and groom laughing as they walk out of a whitewashed chapel while guests throw white and pink petals over them, bright sunlight. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P6b | 1024×1024 | Photorealistic photo of a bride and groom holding hands and walking through two lines of cheering wedding guests on a seaside terrace, motion and joy, warm daylight. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P7 | 1024×768 | Photorealistic photo of a long wedding dinner table by the sea at sunset under string lights, guests raising glasses, white flowers and candles on the table, golden hour. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P8a | 1024×1024 | Photorealistic close-up of a bride and groom slow dancing for their first dance, bride resting her head on the groom's shoulder, warm fairy lights blurred behind them, evening. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P8b | 1024×1024 | Photorealistic wide photo of a bride and groom dancing their first dance in the middle of a dance floor surrounded by guests in a circle, string lights overhead, evening reception. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| P9 | 1024×768 | Photorealistic photo of a joyful bride dancing with arms raised on a crowded dance floor at night, a disco ball and colorful lights above, guests dancing around her. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| K1 | 1024×768 | Photorealistic photo of a bride laughing while dancing with the groom at an outdoor evening reception, he spins her, her dress in motion, warm string lights. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| K2 | 1024×768 | Photorealistic photo of a bride dancing with one arm raised and a big smile, guests clapping around her, warm evening party lights. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| D1 | 1408×968 | Photorealistic candid wedding photograph of a bride and groom about to kiss under green trees in a park, she holds his face, soft daylight, natural green tones. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| D2 | 1024×1024 | Photorealistic photo of a laughing bride and groom in a shower of confetti in front of an old stone building, groom in a dark green suit, bride in a simple ivory dress. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| D3 | 1024×1024 | Photorealistic photo of wedding guests at a long outdoor dinner table raising glasses for a toast at sunset, sea in the background, string lights. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| Q1 | 1024×768 | Photorealistic photo of a smiling wedding guest at a reception table holding her phone up to a small blank white table card with a plain black square code pattern, flowers and glasses on the table, warm evening light. The card and the phone screen show no words or letters. Natural skin texture, gentle film grain. No text, no watermark, no logos, no readable signs. |
| F2 | 1024×1024 | Photorealistic head-and-shoulders portrait of a woman in her late twenties with long straight dark hair and red lipstick, black dress, at an evening wedding reception with warm lights behind her. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| F3 | 1024×1024 | Photorealistic head-and-shoulders portrait of a woman in her forties with a short auburn bob, navy dress, smiling at a daytime garden wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| F4 | 1024×1024 | Photorealistic head-and-shoulders portrait of a woman in her mid twenties with a blonde side braid and a pastel pink dress, laughing at a sunny wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| F5 | 1024×1024 | Photorealistic head-and-shoulders portrait of a woman in her fifties with grey-streaked hair in a low bun and a pearl necklace, warm smile, wedding guest in soft daylight. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| F6 | 1024×1024 | Photorealistic head-and-shoulders portrait of a woman in her thirties with curly black hair and a mustard yellow dress, smiling at an outdoor wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| F7 | 1024×1024 | Photorealistic head-and-shoulders portrait of a woman in her thirties with wavy blonde hair under a straw sun hat and a white linen top, tanned, smiling by the sea. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| M1 | 1024×1024 | Photorealistic head-and-shoulders portrait of a man in his thirties with short dark hair and a trimmed beard, light grey suit, smiling at a wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| M2 | 1024×1024 | Photorealistic head-and-shoulders portrait of a man in his late twenties with dark curly hair and sunglasses pushed up, white shirt with an open collar, sunny wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| M3 | 1024×1024 | Photorealistic head-and-shoulders portrait of a man in his forties with salt-and-pepper hair and glasses, navy blazer, friendly smile at a wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| M4 | 1024×1024 | Photorealistic head-and-shoulders portrait of a man in his thirties with short blond hair and light stubble, beige linen suit, laughing by the sea. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |
| M5 | 1024×1024 | Photorealistic head-and-shoulders portrait of a man in his sixties, bald with a white moustache, dark suit and tie, proud smile at a wedding. Square framing, face centered, looking at the camera. Natural skin texture, shallow depth of field. No text, no watermark, no logos. |

Look at each thumbnail the tool returns. Regenerate (same prompt) any photo with readable text, extra fingers, warped faces or a watermark. Q1 must show no letters on the card or the phone.

- [ ] **Step 2: Download the raw files into their own folder**

For each row, and for the two test photos already in `$SP/photos-test/` (copy them in as `C1.png` and `F1.png`):

```bash
mkdir -p "$SP/photos-raw"
curl -sSL -o "$SP/photos-raw/S1.png" "<image.url from the S1 result>"
```

Expected: 34 PNG files in `$SP/photos-raw/` (C1, F1 and the 32 new ones).

- [ ] **Step 3: Write the conversion script**

`$SP/scripts/convert-photos.cjs`:

```js
// Converts photos to cropped WebP. Usage:
// NODE_PATH=<worktree>/node_modules node convert-photos.cjs <manifest.json> <input dir> <output dir>
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const [, , manifestPath, inputDir, outputDir] = process.argv;
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

(async () => {
    for (const item of manifest) {
        const output = path.join(outputDir, `${item.out}.webp`);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        await sharp(path.join(inputDir, item.in))
            .resize(item.width, item.height, { fit: 'cover', position: item.position ?? 'centre' })
            .webp(item.icon ? { quality: 90, alphaQuality: 100 } : { quality: 80 })
            .toFile(output);
        console.log(`${item.in} -> ${output} (${item.width}x${item.height})`);
    }
})();
```

- [ ] **Step 4: Write the generated-photo manifest**

`$SP/photos/manifest-generated.json`:

```json
[
    { "in": "C1.png", "out": "wedding-feed-cover-couple", "width": 960, "height": 660 },
    { "in": "S1.png", "out": "wedding-story-couple-selfie", "width": 320, "height": 320 },
    { "in": "S2.png", "out": "wedding-story-bride-updo", "width": 320, "height": 320 },
    { "in": "S3.png", "out": "wedding-story-groom-portrait", "width": 320, "height": 320 },
    { "in": "P1.png", "out": "wedding-post-bride-and-bridesmaids", "width": 960, "height": 720 },
    { "in": "P2a.png", "out": "wedding-post-mother-buttons-dress", "width": 720, "height": 720 },
    { "in": "P2b.png", "out": "wedding-post-bride-and-mother", "width": 720, "height": 720 },
    { "in": "P3.png", "out": "wedding-post-groomsmen-bow-tie", "width": 960, "height": 720 },
    { "in": "P4.png", "out": "wedding-post-guests-walk-to-chapel", "width": 960, "height": 720 },
    { "in": "P5.png", "out": "wedding-post-ring-exchange", "width": 960, "height": 720 },
    { "in": "P6a.png", "out": "wedding-post-couple-under-petals", "width": 720, "height": 720 },
    { "in": "P6b.png", "out": "wedding-post-couple-walks-through-guests", "width": 720, "height": 720 },
    { "in": "P7.png", "out": "wedding-post-sunset-dinner", "width": 960, "height": 720 },
    { "in": "P8a.png", "out": "wedding-post-first-dance-close", "width": 720, "height": 720 },
    { "in": "P8b.png", "out": "wedding-post-first-dance-wide", "width": 720, "height": 720 },
    { "in": "P9.png", "out": "wedding-post-bride-dancing", "width": 960, "height": 720 },
    { "in": "K1.png", "out": "wedding-card-couple-dancing", "width": 960, "height": 720 },
    { "in": "K2.png", "out": "wedding-card-bride-dancing", "width": 960, "height": 720 },
    { "in": "D1.png", "out": "wedding-demo-cover-couple-park", "width": 960, "height": 660 },
    { "in": "D2.png", "out": "wedding-demo-couple-confetti", "width": 720, "height": 720 },
    { "in": "D3.png", "out": "wedding-demo-dinner-toast", "width": 720, "height": 720 },
    { "in": "Q1.png", "out": "wedding-guest-scans-table-qr", "width": 960, "height": 720 },
    { "in": "F1.png", "out": "wedding-guest-woman-sage-dress", "width": 320, "height": 320 },
    { "in": "F2.png", "out": "wedding-guest-woman-dark-hair", "width": 320, "height": 320 },
    { "in": "F3.png", "out": "wedding-guest-woman-auburn-bob", "width": 320, "height": 320 },
    { "in": "F4.png", "out": "wedding-guest-woman-blonde-braid", "width": 320, "height": 320 },
    { "in": "F5.png", "out": "wedding-guest-woman-pearl-necklace", "width": 320, "height": 320 },
    { "in": "F6.png", "out": "wedding-guest-woman-curly-hair", "width": 320, "height": 320 },
    { "in": "F7.png", "out": "wedding-guest-woman-sun-hat", "width": 320, "height": 320 },
    { "in": "M1.png", "out": "wedding-guest-man-beard", "width": 320, "height": 320 },
    { "in": "M2.png", "out": "wedding-guest-man-curly-hair", "width": 320, "height": 320 },
    { "in": "M3.png", "out": "wedding-guest-man-glasses", "width": 320, "height": 320 },
    { "in": "M4.png", "out": "wedding-guest-man-linen-suit", "width": 320, "height": 320 },
    { "in": "M5.png", "out": "wedding-guest-man-moustache", "width": 320, "height": 320 }
]
```

- [ ] **Step 5: Write the design-image manifest**

The marquee photos are cropped to the tile's 230×300 at 2×; the "Without" photos to 480×440; icon masks to 128×128.

`$SP/photos/manifest-design.json`:

```json
[
    { "in": "img_6a9c26ee.webp", "out": "wedding-marquee-01-dress-preparation", "width": 460, "height": 600 },
    { "in": "img_e57b4af1.webp", "out": "wedding-marquee-02-night-out", "width": 460, "height": 600 },
    { "in": "img_90cb8d23.webp", "out": "wedding-marquee-03-taverna-toast", "width": 460, "height": 600 },
    { "in": "img_3ddcbc71.webp", "out": "wedding-marquee-04-party-dance", "width": 460, "height": 600 },
    { "in": "img_ffe1df4d.webp", "out": "wedding-marquee-05-groom-friends", "width": 460, "height": 600 },
    { "in": "img_a7bc76d4.webp", "out": "wedding-marquee-06-bride-preparation", "width": 460, "height": 600 },
    { "in": "img_8743bd2c.webp", "out": "wedding-marquee-07-guests-at-church", "width": 460, "height": 600 },
    { "in": "img_8ca3f567.webp", "out": "wedding-marquee-08-couple-arrives", "width": 460, "height": 600 },
    { "in": "img_abb3acef.webp", "out": "wedding-marquee-09-tender-moment", "width": 460, "height": 600 },
    { "in": "img_3434cb26.webp", "out": "wedding-marquee-10-first-dance", "width": 460, "height": 600 },
    { "in": "img_0e07d944.webp", "out": "wedding-marquee-11-reception-dance", "width": 460, "height": 600 },
    { "in": "img_8990abe3.webp", "out": "wedding-marquee-12-bride-morning", "width": 460, "height": 600 },
    { "in": "img_fd015c1b.webp", "out": "wedding-marquee-13-paris-trip", "width": 460, "height": 600 },
    { "in": "img_fb317646.webp", "out": "wedding-marquee-14-paris-arrival", "width": 460, "height": 600 },
    { "in": "img_0383e87f.webp", "out": "wedding-marquee-avatar-ioanna", "width": 160, "height": 160 },
    { "in": "img_2281fb5a.webp", "out": "wedding-marquee-avatar-maria", "width": 160, "height": 160 },
    { "in": "img_926c8d32.webp", "out": "wedding-marquee-avatar-kostas", "width": 160, "height": 160 },
    { "in": "img_ae4bcb43.webp", "out": "wedding-marquee-avatar-sofia", "width": 160, "height": 160 },
    { "in": "img_49ea5121.webp", "out": "wedding-marquee-avatar-petros", "width": 160, "height": 160 },
    { "in": "img_601c79dd.webp", "out": "wedding-marquee-avatar-eleni", "width": 160, "height": 160 },
    { "in": "img_55e9b087.webp", "out": "wedding-marquee-avatar-anna", "width": 160, "height": 160 },
    { "in": "img_468d9fa2.webp", "out": "wedding-marquee-avatar-giorgos", "width": 160, "height": 160 },
    { "in": "img_68a86135.webp", "out": "wedding-marquee-avatar-ioanna-koumpara", "width": 160, "height": 160 },
    { "in": "img_326eda5c.webp", "out": "wedding-marquee-avatar-nikos", "width": 160, "height": 160 },
    { "in": "img_6b8d462e.webp", "out": "wedding-marquee-avatar-katerina", "width": 160, "height": 160 },
    { "in": "img_b498ae48.webp", "out": "wedding-marquee-avatar-nefeli", "width": 160, "height": 160 },
    { "in": "img_31e45028.webp", "out": "wedding-marquee-avatar-orestis", "width": 160, "height": 160 },
    { "in": "img_65fcc49d.webp", "out": "wedding-without-photo-1", "width": 480, "height": 440 },
    { "in": "img_4c3a678a.webp", "out": "wedding-without-photo-2", "width": 480, "height": 440 },
    { "in": "img_06084fff.webp", "out": "wedding-without-photo-3", "width": 480, "height": 440 },
    { "in": "img_ea492e49.png", "out": "icons/invitation", "width": 128, "height": 128, "icon": true },
    { "in": "img_0c9a803a.png", "out": "icons/manage", "width": 128, "height": 128, "icon": true },
    { "in": "img_ae891503.png", "out": "icons/roles", "width": 128, "height": 128, "icon": true },
    { "in": "img_dcd9dea1.png", "out": "icons/download", "width": 128, "height": 128, "icon": true },
    { "in": "img_c1ec45e4.png", "out": "icons/rsvp", "width": 128, "height": 128, "icon": true },
    { "in": "img_36e1cf9d.png", "out": "icons/gallery", "width": 128, "height": 128, "icon": true },
    { "in": "img_e9f25cc2.png", "out": "icons/posts", "width": 128, "height": 128, "icon": true },
    { "in": "img_9412cc71.png", "out": "icons/stories", "width": 128, "height": 128, "icon": true },
    { "in": "img_95e3be3c.png", "out": "icons/playlist", "width": 128, "height": 128, "icon": true },
    { "in": "img_8d3d9357.png", "out": "icons/schedule", "width": 128, "height": 128, "icon": true },
    { "in": "img_066aa382.png", "out": "icons/wishbook", "width": 128, "height": 128, "icon": true },
    { "in": "img_796f14f5.png", "out": "icons/wishlist", "width": 128, "height": 128, "icon": true }
]
```

Before running, check the icon mapping against the design body: `grep -o "sw-uploaded-gradient-icon\" style=\"--sw-icon-mask:url('data:IMG\[img_[0-9a-f]*" "$SP/design/stripped.html"` lists the masks in page order (Private cards 01–04, then the 10 features in design order). Fix any row whose hash disagrees.

- [ ] **Step 6: Convert both sets into the repo**

```bash
NODE_PATH="$WT/node_modules" node "$SP/scripts/convert-photos.cjs" "$SP/photos/manifest-generated.json" "$SP/photos-raw" "$WT/public/landing/wedding"
NODE_PATH="$WT/node_modules" node "$SP/scripts/convert-photos.cjs" "$SP/photos/manifest-design.json" "$SP/design/images" "$WT/public/landing/wedding"
```

Expected: 34 + 42 lines of `-> …webp` and no error.

- [ ] **Step 7: The final CTA photo**

```bash
md5sum "$SP/design/images/img_42c5d049.webp" "$WT/public/landing/storywall-final-cta-wedding-santorini.webp"
```

If the hashes match, the page reuses `/landing/storywall-final-cta-wedding-santorini.webp` (1448×1086). If they differ, copy it as `public/landing/wedding/wedding-final-cta-island-couple.webp` and use that path in Task 7 (`FINAL_CTA_IMAGE`).

- [ ] **Step 8: Check sizes and commit**

```bash
du -ch "$WT/public/landing/wedding"/*.webp "$WT/public/landing/wedding/icons"/*.webp | tail -1
```

Expected: well under 3 MB in total. Then:

```bash
git add public/landing/wedding
git commit -m "feat(occasions): wedding landing photos"
```

---

### Task 3: Landing tokens without landing.css

**Files:**
- Create: `lib/landingTokens.ts`

- [ ] **Step 1: Write the constant**

```ts
// The landing's design tokens (landing.css `.landing-page`) as Tailwind classes, for a page that
// renders the shared landing sections without loading landing.css.
export const LANDING_TOKENS_CLASS = [
    '[--ink:#151313] [--paper:#f4f0e8] [--acid:#ffca52] [--coral:#ff765f] [--line:rgba(21,19,19,0.18)]',
    '[--brand-gradient:linear-gradient(135deg,#d27b9b_0%,#e78274_24%,#f4905f_48%,#f8a560_72%,#fcba63_100%)]',
    "[--editorial:Baskerville,'Iowan_Old_Style','Times_New_Roman',Georgia,serif]",
    'font-[Arial,Helvetica,sans-serif]',
].join(' ');
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (Committed with Task 4.)

---

### Task 4: Move the `.occasion-page` rules into OccasionPageShell

The wedding page must not import `landing.css`, but the shell's tokens, theme accent and motion pause live there. Move them into Tailwind classes; baptism keeps working unchanged.

**Files:**
- Modify: `components/occasions/OccasionPageShell.tsx`
- Modify: `components/landing/landing.css:6392-6408`

- [ ] **Step 1: Replace the shell**

`components/occasions/OccasionPageShell.tsx`:

```tsx
'use client';

import { type ReactNode, useRef } from 'react';

import { useLandingMotionPausedAttribute } from '@/hooks/useLandingMotionPausedAttribute';
import { useLandingStoryInteractions } from '@/hooks/useLandingStoryInteractions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { cn } from '@/lib/utils';

type OccasionPageShellProps = {
    children: ReactNode;
    // Extra tokens for a page that does not load landing.css.
    className?: string;
    theme: OccasionThemeId | null;
};

// The tokens occasion sections read, the campaign banner's accent (a dated theme swaps it), and the
// footer's motion toggle, which pauses every CSS animation on the page. Arbitrary variants, not
// before:/after:, so no pseudo-element gets created.
const SHELL_CLASS = [
    'overflow-x-clip bg-white text-[#151313]',
    "[--ink:#151313] [--editorial:Baskerville,'Iowan_Old_Style','Times_New_Roman',Georgia,serif] [--occasion-accent:#e78274]",
    'data-[occasion-theme=winter]:[--occasion-accent:#5b7fa6]',
    '[body[data-landing-motion-paused]_&_*]:[animation-play-state:paused]!',
    '[body[data-landing-motion-paused]_&_*::before]:[animation-play-state:paused]!',
    '[body[data-landing-motion-paused]_&_*::after]:[animation-play-state:paused]!',
].join(' ');

// The landing's page frame without its analytics: landing events carry no page name, so occasion
// visits would count as landing ones.
export function OccasionPageShell({ children, className, theme }: OccasionPageShellProps) {
    const rootRef = useRef<HTMLElement>(null);
    useLandingMotionPausedAttribute();
    // The story galleries: tap or hover a photo to open it.
    useLandingStoryInteractions(rootRef);

    return (
        <main className={cn(SHELL_CLASS, className)} data-occasion-theme={theme ?? undefined} id="top-preview" ref={rootRef}>
            {children}
        </main>
    );
}
```

- [ ] **Step 2: Delete the moved rules from landing.css**

Remove this whole block at the end of `components/landing/landing.css` (from the comment `/* Occasion pages: the campaign banner's color…` through the closing `}` of the `body[data-landing-motion-paused] .occasion-page *::after` rule):

```css
/* Occasion pages: the campaign banner's color. A dated theme (lib/occasions/themes.ts) swaps it. */
.occasion-page {
    --ink: #151313;
    --editorial: Baskerville, 'Iowan Old Style', 'Times New Roman', Georgia, serif;
    --occasion-accent: #e78274;
}

.occasion-page[data-occasion-theme='winter'] {
    --occasion-accent: #5b7fa6;
}

/* The footer's motion toggle. */
body[data-landing-motion-paused] .occasion-page *,
body[data-landing-motion-paused] .occasion-page *::before,
body[data-landing-motion-paused] .occasion-page *::after {
    animation-play-state: paused !important;
}
```

- [ ] **Step 3: No stale references**

Run: `grep -rn "occasion-page" --include=*.ts --include=*.tsx --include=*.css . | grep -v node_modules`
Expected: no output.

- [ ] **Step 4: Check baptism in the browser**

With the dev server on `http://localhost:3000/` (start it from the worktree only if nothing runs on :3000; see memory "Dev server shares .next"), open `/el/vaftisi` (the baptism slug; confirm with `grep -n "BAPTISM" -A3 lib/occasions/occasions.ts`). In the page, run:

```js
const main = document.querySelector('#top-preview');
[getComputedStyle(main).getPropertyValue('--occasion-accent'), getComputedStyle(main).getPropertyValue('--editorial')]
```

Expected: `#e78274` and the Baskerville stack. Click the footer's motion toggle, then:

```js
getComputedStyle(document.querySelector('.motion-hero-feed-scroll')).animationPlayState
```

Expected: `paused`. Click it again: `running`.

- [ ] **Step 5: Commit**

```bash
git add lib/landingTokens.ts components/occasions/OccasionPageShell.tsx components/landing/landing.css
git commit -m "refactor(occasions): occasion page tokens and motion pause in Tailwind"
```

---

### Task 5: Live price values

**Files:**
- Create: `lib/occasions/occasionPrice.ts`
- Create: `lib/occasions/occasionPrice.server.ts`
- Test: `lib/occasions/occasionPrice.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/occasions/occasionPrice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto, CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { occasionPriceValues } from '@/lib/occasions/occasionPrice';

function makeOption(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return { id: 'opt-3', kind: 'INITIAL', months: 3, priceAmountMinor: 11900, promoPriceAmountMinor: null, sortOrder: 0, active: true, ...overrides };
}

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan-start',
        code: 'START',
        scope: 'EVENT',
        name: 'START',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: true,
        storageBytes: 16 * 1024 * 1024 * 1024,
        maxMembers: 150,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: ['gallery'],
        paidModules: [],
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [makeOption()],
        extensionOptions: [],
        ...overrides,
    };
}

function config(planTiers: PlanTierResponseDto[]): AppConfigResponseDto {
    return { planTiers, memberRolesByEventType: {} } as unknown as AppConfigResponseDto;
}

const NONE = { range: 'none', from: '', fromName: '', to: '', toName: '' };

describe('occasionPriceValues', () => {
    it('has no prices without config', () => {
        expect(occasionPriceValues(null, 'WEDDING')).toEqual(NONE);
    });

    it('spans the cheapest and dearest plan of the event type', () => {
        const plans = [
            makePlan({ id: 'sig', code: 'SIGNATURE', name: 'SIGNATURE', sortOrder: 2, initialOptions: [makeOption({ priceAmountMinor: 25900 })] }),
            makePlan(),
            makePlan({ id: 'bap', code: 'BAPTISM', name: 'BAPTISM', eventTypeKey: 'BAPTISM', initialOptions: [makeOption({ priceAmountMinor: 4900 })] }),
        ];
        expect(occasionPriceValues(config(plans), 'WEDDING')).toEqual({
            range: 'span',
            from: '119€',
            fromName: 'START',
            to: '259€',
            toName: 'SIGNATURE',
        });
    });

    it('prices each plan at its shortest duration', () => {
        const plan = makePlan({
            initialOptions: [makeOption({ id: 'opt-12', months: 12, priceAmountMinor: 14900, sortOrder: 1 }), makeOption()],
        });
        expect(occasionPriceValues(config([plan]), 'WEDDING')).toMatchObject({ range: 'single', from: '119€', to: '119€' });
    });

    it('leaves out plans that are not on sale', () => {
        const hidden = makePlan({ id: 'hidden', name: 'HIDDEN', isPublic: false, initialOptions: [makeOption({ priceAmountMinor: 900 })] });
        const inactive = makePlan({ id: 'inactive', name: 'INACTIVE', initialOptions: [makeOption({ active: false })] });
        expect(occasionPriceValues(config([hidden, inactive]), 'WEDDING')).toEqual(NONE);
        expect(occasionPriceValues(config([hidden, makePlan()]), 'WEDDING')).toMatchObject({ range: 'single', from: '119€' });
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/occasions/occasionPrice.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/occasions/occasionPrice"`.

- [ ] **Step 3: Implement**

`lib/occasions/occasionPrice.ts`:

```ts
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { promotedOptionAmountMinor } from '@/lib/billing';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';
import { formatLandingOptionPrice } from '@/lib/landingPricing';
import { shortestInitialOption } from '@/lib/planTiers';

// Values for an occasion's price sentences ({range, select, …} in its copy): 'span' for two or more
// prices, 'single' for one, 'none' without config or without a plan on sale. A sentence leaves the
// prices out for 'none'.
export type OccasionPriceValues = { range: 'span' | 'single' | 'none'; from: string; fromName: string; to: string; toName: string };

const NO_PRICES: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

// The cheapest and dearest card the occasion's pricing section shows, each at the duration it opens on.
export function occasionPriceValues(config: AppConfigResponseDto | null, eventType: EventTypeConvention): OccasionPriceValues {
    if (!config) return NO_PRICES;
    const { plans } = resolveLandingCategoryPlans(config.planTiers, [eventType], config.memberRolesByEventType);
    const prices = plans
        .flatMap((plan) => {
            const option = shortestInitialOption(plan);
            const price = option ? formatLandingOptionPrice(plan, option) : null;
            return option && price ? [{ amountMinor: promotedOptionAmountMinor(option, plan), name: plan.name, price }] : [];
        })
        .sort((left, right) => left.amountMinor - right.amountMinor);
    const from = prices[0];
    const to = prices.at(-1);
    if (!from || !to) return NO_PRICES;
    return { range: from === to ? 'single' : 'span', from: from.price, fromName: from.name, to: to.price, toName: to.name };
}
```

`lib/occasions/occasionPrice.server.ts`:

```ts
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { occasionPriceValues, type OccasionPriceValues } from '@/lib/occasions/occasionPrice';

// For metadata, which has no config in hand. The config fetch is cached (serverPublicConfigGet), so
// the page's own fetch reuses it. Config failed → no prices.
export async function loadOccasionPriceValues(eventType: EventTypeConvention): Promise<OccasionPriceValues> {
    try {
        return occasionPriceValues(await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get), eventType);
    } catch {
        return occasionPriceValues(null, eventType);
    }
}
```

Note `from === to` compares the entries (one plan → same object), so two plans at the same price still read as a span "from 119€ (START) to 119€ (PLUS)"; that only happens with a misconfigured catalog and stays truthful.

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/occasions/occasionPrice.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/occasions/occasionPrice.ts lib/occasions/occasionPrice.server.ts lib/occasions/occasionPrice.test.ts
git commit -m "feat(occasions): live price values for occasion copy"
```

---

### Task 6: FAQ entries, metadata, JSON-LD and share image read the price values

**Files:**
- Create: `lib/occasions/occasionFaq.ts`
- Test: `lib/occasions/occasionFaq.test.ts`
- Modify: `lib/occasionMetadata.ts`
- Modify: `components/occasions/OccasionStructuredData.tsx`
- Modify: `components/occasions/OccasionPage.tsx`
- Modify: `lib/occasions/occasionShareImage.ts`

- [ ] **Step 1: Write the failing test**

`lib/occasions/occasionFaq.test.ts`:

```ts
import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { type OccasionFaqEntry, occasionFaqEntries } from '@/lib/occasions/occasionFaq';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { readyOccasions } from '@/lib/occasions/occasions';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

describe('occasionFaqEntries', () => {
    it('formats each answer and keeps the question and link', () => {
        const raw: OccasionFaqEntry[] = [
            { q: 'Q1', a: 'raw 1' },
            { q: 'Q2', a: 'raw 2', link: { to: 'pricing', label: 'See plans' } },
        ];
        expect(occasionFaqEntries(raw, (key) => `formatted ${key}`)).toEqual([
            { q: 'Q1', a: 'formatted faq.0.a' },
            { q: 'Q2', a: 'formatted faq.1.a', link: { to: 'pricing', label: 'See plans' } },
        ]);
    });

    it.each([
        ['el', el],
        ['en', en],
    ] as const)('formats every ready occasion FAQ in %s', (locale, messages) => {
        for (const occasion of readyOccasions()) {
            const t = createTranslator({
                locale,
                // Untyped, so a namespace built from the event type is accepted.
                messages: messages as Messages,
                namespace: `OccasionPages.${occasion.eventType}`,
                onError: (error) => {
                    throw error;
                },
            });
            const entries = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, NONE));
            for (const entry of entries) expect(entry.a).not.toMatch(/[{}<>]/);
        }
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/occasions/occasionFaq.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/occasions/occasionFaq"`.

- [ ] **Step 3: Implement**

`lib/occasions/occasionFaq.ts`:

```ts
// Where an FAQ answer can link: the QR wedding page (shown only while it is live) or the plans.
export type OccasionFaqLinkTarget = 'qr' | 'pricing';

// One FAQ entry as the copy stores it (OccasionPages.<type>.faq). The answer may hold
// {range, select, …} price sentences.
export type OccasionFaqEntry = { q: string; a: string; link?: { to: OccasionFaqLinkTarget; label: string } };

// The FAQ in copy order with each answer formatted. format gets the answer's key ("faq.3.a").
export function occasionFaqEntries(raw: OccasionFaqEntry[], format: (key: string) => string): OccasionFaqEntry[] {
    return raw.map((entry, index) => ({ ...entry, a: format(`faq.${index}.a`) }));
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/occasions/occasionFaq.test.ts`
Expected: PASS. (The second case already passes on today's copy; it guards the copy rewrite in Task 10.)

- [ ] **Step 5: Metadata passes the price values**

`lib/occasionMetadata.ts`:

```ts
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { loadOccasionPriceValues } from '@/lib/occasions/occasionPrice.server';
import type { Occasion } from '@/lib/occasions/occasions';
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';

export async function getOccasionMetadata(occasion: Occasion, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.meta` });
    const common = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    // The description may name the lowest price.
    const price = await loadOccasionPriceValues(occasion.eventType);
    return buildOccasionMetadata(occasion, locale, {
        title: t('title'),
        description: t('description', price),
        siteName: common('siteName'),
        imageAlt: t('imageAlt'),
        keywords: t.raw('keywords') as string[],
    });
}
```

- [ ] **Step 6: JSON-LD uses the same values and formatted answers**

`components/occasions/OccasionStructuredData.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type OccasionFaqEntry, occasionFaqEntries } from '@/lib/occasions/occasionFaq';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { servicePageGraph } from '@/lib/structuredData';

type OccasionStructuredDataProps = { locale: Locale; occasion: Occasion; price: OccasionPriceValues };

// The service for this occasion, a breadcrumb and the FAQ, with the same prices as the page.
export async function OccasionStructuredData({ locale, occasion, price }: OccasionStructuredDataProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const faq = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, price));
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(occasionPath(occasion, locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description', price),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        // Answers only: link labels are page navigation, not part of the answer.
        faq: faq.map(({ q, a }) => ({ q, a })),
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
```

- [ ] **Step 7: OccasionPage computes the values once**

In `components/occasions/OccasionPage.tsx`, add the import `import { occasionPriceValues } from '@/lib/occasions/occasionPrice';`, add after `const now = new Date();`:

```tsx
    const price = occasionPriceValues(config, occasion.eventType);
```

and change the structured data line to:

```tsx
            <OccasionStructuredData locale={locale} occasion={occasion} price={price} />
```

(Task 19 adds the WEDDING switch to this file.)

- [ ] **Step 8: Share image reads an h1 with markup**

In `lib/occasions/occasionShareImage.ts`, replace `const image = await occasionOgImage(t('h1'));` with:

```ts
    // The wedding h1 marks its gradient words with <em>; the image shows plain text.
    const image = await occasionOgImage(t.markup('h1', { em: (chunks) => chunks }));
```

- [ ] **Step 9: Types and tests**

```bash
npx tsc --noEmit
npx vitest run lib/occasions "app/(landing)"
```

Expected: no type errors; all pass.

- [ ] **Step 10: Commit**

```bash
git add lib/occasions/occasionFaq.ts lib/occasions/occasionFaq.test.ts lib/occasionMetadata.ts components/occasions/OccasionStructuredData.tsx components/occasions/OccasionPage.tsx lib/occasions/occasionShareImage.ts
git commit -m "feat(occasions): price values in metadata, JSON-LD and FAQ answers"
```

---

### Task 7: Wedding photo map, copy types and feature order

**Files:**
- Create: `lib/occasions/weddingMedia.ts`
- Create: `lib/occasions/weddingCopy.ts`
- Create: `lib/occasions/weddingFeatures.ts`
- Test: `lib/occasions/weddingMedia.test.ts`, `lib/occasions/weddingFeatures.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/occasions/weddingMedia.test.ts`:

```ts
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    WEDDING_DEMO_MEDIA,
    WEDDING_HERO_MEDIA,
    WEDDING_MARQUEE,
    WEDDING_QR_PHOTO,
    WEDDING_RSVP_AVATARS,
    WEDDING_WITHOUT_PHOTOS,
} from '@/lib/occasions/weddingMedia';

// Every { src } anywhere in the maps.
function sources(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(sources);
    if (value && typeof value === 'object') {
        const { src } = value as { src?: unknown };
        return typeof src === 'string' ? [src] : Object.values(value).flatMap(sources);
    }
    return [];
}

describe('wedding media', () => {
    it('points every photo at a file in public/', () => {
        const all = sources([WEDDING_HERO_MEDIA, WEDDING_DEMO_MEDIA, WEDDING_MARQUEE, WEDDING_QR_PHOTO, WEDDING_RSVP_AVATARS, WEDDING_WITHOUT_PHOTOS]);
        expect(all.length).toBeGreaterThan(60);
        for (const src of new Set(all)) expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
    });

    it('has a photo set for each of the nine hero posts and the fourteen marquee tiles', () => {
        expect(WEDDING_HERO_MEDIA.posts).toHaveLength(9);
        expect(WEDDING_MARQUEE).toHaveLength(14);
        expect(WEDDING_RSVP_AVATARS).toHaveLength(5);
    });
});
```

`lib/occasions/weddingFeatures.test.ts`:

```ts
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { WEDDING_FEATURE_ORDER, WEDDING_PRIVATE_ICONS, weddingFeatures } from '@/lib/occasions/weddingFeatures';

describe('weddingFeatures', () => {
    it('puts the offered features in the design order', () => {
        const offered = ['invitation', 'posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook', 'schedule', 'quiz_polls'];
        expect(weddingFeatures(offered).map((feature) => feature.key)).toEqual([...WEDDING_FEATURE_ORDER]);
    });

    it('leaves out what the config does not offer', () => {
        expect(weddingFeatures(['gallery', 'invitation']).map((feature) => feature.key)).toEqual(['invitation', 'gallery']);
    });

    it('puts a feature the design has no slot for last, with the generic icon', () => {
        expect(weddingFeatures(['he_or_she', 'invitation'])).toEqual([
            { key: 'invitation', icon: '/landing/wedding/icons/invitation.webp' },
            { key: 'he_or_she', icon: '/landing/decor-05.webp' },
        ]);
    });

    it('points every icon at a file in public/', () => {
        const icons = [...weddingFeatures([...WEDDING_FEATURE_ORDER]).map((feature) => feature.icon), ...WEDDING_PRIVATE_ICONS];
        for (const icon of icons) expect(existsSync(path.join(process.cwd(), 'public', icon)), icon).toBe(true);
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/occasions/weddingMedia.test.ts lib/occasions/weddingFeatures.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/occasions/weddingMedia"` (and `weddingFeatures`).

- [ ] **Step 3: Write the photo map**

`lib/occasions/weddingMedia.ts` (if Task 2 Step 7 copied a new final CTA photo, set `WEDDING_FINAL_CTA_IMAGE` to it instead):

```ts
import type { LandingImageAsset } from '@/lib/landingMedia';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// Every photo on the wedding page. Swap a photo here and it changes everywhere it appears.
const photo = (name: string, width: number, height: number): OccasionPhoto => ({ src: `/landing/wedding/${name}.webp`, width, height });
const scene = (name: string) => photo(name, 960, 720);
const square = (name: string) => photo(name, 720, 720);
const thumb = (name: string) => photo(name, 320, 320);

// Faces, each shared by several names on the page.
const F1 = thumb('wedding-guest-woman-sage-dress');
const F2 = thumb('wedding-guest-woman-dark-hair');
const F3 = thumb('wedding-guest-woman-auburn-bob');
const F4 = thumb('wedding-guest-woman-blonde-braid');
const F5 = thumb('wedding-guest-woman-pearl-necklace');
const F6 = thumb('wedding-guest-woman-curly-hair');
const F7 = thumb('wedding-guest-woman-sun-hat');
const M1 = thumb('wedding-guest-man-beard');
const M2 = thumb('wedding-guest-man-curly-hair');
const M3 = thumb('wedding-guest-man-glasses');
const M4 = thumb('wedding-guest-man-linen-suit');
const M5 = thumb('wedding-guest-man-moustache');

// One post in a phone feed: its author, one or two photos, and the faces of its two replies.
export type WeddingFeedPostMedia = {
    author: OccasionPhoto;
    photos: readonly [OccasionPhoto] | readonly [OccasionPhoto, OccasionPhoto];
    replies: readonly [OccasionPhoto, OccasionPhoto];
};

export type WeddingHeroMedia = {
    cover: OccasionPhoto;
    // The person holding the phone: "your story" and the composer.
    viewer: OccasionPhoto;
    // Guests, moments, venue.
    stories: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    // Same order as OccasionPages.WEDDING.hero.feed.posts.
    posts: readonly WeddingFeedPostMedia[];
    // The two post cards beside the phone.
    cards: readonly [{ author: OccasionPhoto; photo: OccasionPhoto }, { author: OccasionPhoto; photo: OccasionPhoto }];
    // The two comment cards beside the phone: one or two faces each.
    comments: readonly [readonly OccasionPhoto[], readonly OccasionPhoto[]];
};

const STORIES = [thumb('wedding-story-couple-selfie'), thumb('wedding-story-bride-updo'), thumb('wedding-story-groom-portrait')] as const;

export const WEDDING_HERO_MEDIA: WeddingHeroMedia = {
    cover: photo('wedding-feed-cover-couple', 960, 660),
    viewer: F7,
    stories: STORIES,
    posts: [
        { author: F1, photos: [scene('wedding-post-bride-and-bridesmaids')], replies: [F2, M1] },
        { author: F3, photos: [square('wedding-post-mother-buttons-dress'), square('wedding-post-bride-and-mother')], replies: [F5, F4] },
        { author: M1, photos: [scene('wedding-post-groomsmen-bow-tie')], replies: [M2, M3] },
        { author: F2, photos: [scene('wedding-post-guests-walk-to-chapel')], replies: [F6, M4] },
        { author: F5, photos: [scene('wedding-post-ring-exchange')], replies: [F3, M1] },
        { author: M2, photos: [square('wedding-post-couple-under-petals'), square('wedding-post-couple-walks-through-guests')], replies: [F2, M3] },
        { author: F6, photos: [scene('wedding-post-sunset-dinner')], replies: [F5, F4] },
        { author: M3, photos: [square('wedding-post-first-dance-close'), square('wedding-post-first-dance-wide')], replies: [F2, M4] },
        { author: F4, photos: [scene('wedding-post-bride-dancing')], replies: [F6, M5] },
    ],
    cards: [
        { author: F2, photo: scene('wedding-card-couple-dancing') },
        { author: F4, photo: scene('wedding-card-bride-dancing') },
    ],
    comments: [[F7, M4], [F1]],
};

const DEMO_CONFETTI = square('wedding-demo-couple-confetti');

// The demo section's two phones.
export const WEDDING_DEMO_MEDIA = {
    cover: photo('wedding-demo-cover-couple-park', 960, 660),
    viewer: F7,
    stories: STORIES,
    post: { author: F1, photos: [DEMO_CONFETTI, square('wedding-demo-dinner-toast')] as const },
    // The profile menu's avatar: the couple, cropped to their faces.
    profile: { ...DEMO_CONFETTI, position: '50% 28%' },
} as const;

// "Without StoryWall": three photos scattered on the card.
export const WEDDING_WITHOUT_PHOTOS = [
    photo('wedding-without-photo-1', 480, 440),
    photo('wedding-without-photo-2', 480, 440),
    photo('wedding-without-photo-3', 480, 440),
] as const;

// The guest scanning the table QR code.
export const WEDDING_QR_PHOTO = scene('wedding-guest-scans-table-qr');

const marqueeTile = (photoName: string, avatarName: string) => ({
    photo: photo(`wedding-marquee-${photoName}`, 460, 600),
    avatar: photo(`wedding-marquee-avatar-${avatarName}`, 160, 160),
});

// Same order as OccasionPages.WEDDING.why.with.marquee. Nefeli posts two of them.
export const WEDDING_MARQUEE = [
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
] as const;

// Same order as OccasionPages.WEDDING.rsvp.without.replies.
export const WEDDING_RSVP_AVATARS = [F6, M2, F3, F5, M3] as const;

export const WEDDING_FINAL_CTA_IMAGE: LandingImageAsset = { src: '/landing/storywall-final-cta-wedding-santorini.webp', width: 1448, height: 1086 };
```

- [ ] **Step 4: Write the copy types**

`lib/occasions/weddingCopy.ts`:

```ts
// Shapes of the wedding copy read with t.raw (OccasionPages.WEDDING). Strings that hold <b>, <em> or
// <br></br> are read with t.rich by key instead, so they never pass through these types.

export type WeddingFeedReply = { author: string; text: string };

export type WeddingFeedPost = {
    author: string;
    time: string;
    caption: string;
    likes: number;
    comments: number;
    replies: [WeddingFeedReply, WeddingFeedReply];
};

// The music card between posts 6 and 7.
export type WeddingFeedMusic = {
    labels: [string, string, string];
    values: [string, string, string];
    kicker: string;
    title: string;
    time: string;
    cta: string;
};

// Labels every mocked StoryWall screen shares (OccasionPages.WEDDING.mock).
export type WeddingMockCopy = {
    units: [string, string, string, string];
    stories: { own: string; schedule: string; guests: string; moments: string; venue: string };
    scheduleBadge: [string, string];
    composer: string;
};

// hero.feed
export type WeddingHeroFeedCopy = { title: string; date: string; place: string; posts: WeddingFeedPost[]; music: WeddingFeedMusic };

// demo.feed
export type WeddingDemoFeedCopy = { title: string; date: string; place: string; author: string; time: string };

// demo.profile
export type WeddingDemoProfileCopy = {
    name: string;
    email: string;
    menu: [string, string, string];
    signOut: string;
    back: string;
    title: string;
    panelName: string;
    nameLabel: string;
};

// why.with.marquee[n]
export type WeddingMarqueeCopy = { name: string; role: string; moment: string };

// why.with.stats[n], rsvp.with.stats.tiles[n]
export type WeddingStatCopy = { value: string; label: string };

// rsvp.without.replies[n]
export type WeddingRsvpReplyCopy = { name: string; time: string; answer: string; going: boolean };

// rsvp.with.list[n]; the last row is cut off by the phone, so it has no note.
export type WeddingRsvpGuestCopy = { name: string; party: string; note?: string };

// rsvp.with.form
export type WeddingRsvpFormCopy = {
    title: string;
    attend: string;
    required: string;
    yes: string;
    no: string;
    companions: string;
    adults: string;
    children: string;
    message: string;
    optional: string;
    placeholder: string;
    counter: string;
    submit: string;
};

// rsvp.with.stats
export type WeddingRsvpStatsCopy = {
    active: string;
    tabs: [string, string, string];
    deadline: string;
    deadlineValue: string;
    tiles: [WeddingStatCopy, WeddingStatCopy, WeddingStatCopy, WeddingStatCopy];
    byCategory: string;
    coming: string;
    comingValue: string;
    comingShare: string;
    notComing: string;
    notComingValue: string;
};

// Title and body pairs: rsvp.checklist.items, private.cards.
export type WeddingCardCopy = { title: string; body: string };
```

- [ ] **Step 5: Write the feature order**

`lib/occasions/weddingFeatures.ts`:

```ts
import { occasionFeatureIcon } from '@/lib/occasions/occasionFeatures';

const icon = (name: string) => `/landing/wedding/icons/${name}.webp`;

// The design's order. occasionFeatureKeys() decides which of them the page shows.
export const WEDDING_FEATURE_ORDER = [
    'invitation',
    'rsvp',
    'gallery',
    'posts',
    'stories',
    'playlist',
    'schedule',
    'wishbook',
    'wishlist',
    'quiz_polls',
] as const;

const WEDDING_FEATURE_ICONS: Record<string, string> = {
    invitation: icon('invitation'),
    rsvp: icon('rsvp'),
    gallery: icon('gallery'),
    posts: icon('posts'),
    stories: icon('stories'),
    playlist: icon('playlist'),
    schedule: icon('schedule'),
    wishbook: icon('wishbook'),
    wishlist: icon('wishlist'),
    quiz_polls: icon('roles'),
};

// The four "private social" cards, in order.
export const WEDDING_PRIVATE_ICONS = [icon('invitation'), icon('manage'), icon('roles'), icon('download')] as const;

// The offered features in the design's order. One the design has no slot for goes last, with the
// generic icon.
export function weddingFeatures(offered: readonly string[]): { key: string; icon: string }[] {
    const order = (key: string) => {
        const index = (WEDDING_FEATURE_ORDER as readonly string[]).indexOf(key);
        return index < 0 ? WEDDING_FEATURE_ORDER.length : index;
    };
    return [...offered]
        .sort((left, right) => order(left) - order(right))
        .map((key) => ({ key, icon: WEDDING_FEATURE_ICONS[key] ?? occasionFeatureIcon(key) }));
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/occasions/weddingMedia.test.ts lib/occasions/weddingFeatures.test.ts`
Expected: PASS (6 tests). A failing `existsSync` names the missing file: fix the name in the map or the manifest from Task 2, not the test.

- [ ] **Step 7: Commit**

```bash
git add lib/occasions/weddingMedia.ts lib/occasions/weddingMedia.test.ts lib/occasions/weddingCopy.ts lib/occasions/weddingFeatures.ts lib/occasions/weddingFeatures.test.ts
git commit -m "feat(occasions): wedding photo map, copy types and feature order"
```

---

### Task 8: Optional props on the shared sections

Every prop is optional and its default keeps today's output, so the main landing and baptism do not change.

**Files:**
- Modify: `components/landing/LandingHeroVisual.tsx`, `components/occasions/OccasionHeroVisual.tsx`
- Modify: `components/landing/LandingHowItWorks.tsx`
- Modify: `components/landing/LandingPricing.tsx`
- Modify: `components/landing/LandingFaq.tsx`, `components/landing/LandingFaqItem.tsx`
- Modify: `components/landing/LandingDemo.tsx`
- Modify: `components/landing/LandingFinalCta.tsx`
- Test: `components/landing/LandingHeroVisual.test.tsx`, `components/landing/LandingPricing.test.tsx`
- Create test: `components/landing/LandingSharedSections.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to the `describe` in `components/landing/LandingHeroVisual.test.tsx`:

```tsx
    it("draws an occasion's own comment cards in place of the comment cutouts", () => {
        const { container } = render(
            <LandingHeroVisual comments={[<p key="first">first comment</p>, <p key="second">second comment</p>]} motionPaused={false} />,
        );
        expect(container).toHaveTextContent('first comment');
        expect(container).toHaveTextContent('second comment');
        expect([...container.querySelectorAll('img')].map(sourcePath).filter((src) => src?.includes('sw-comment'))).toEqual([]);
    });

    it('takes its size and place from the page when given', () => {
        const { container } = render(<LandingHeroVisual className="w-10" motionPaused={false} />);
        const root = container.firstElementChild;
        expect(root).toHaveClass('w-10', 'aspect-[1136/1204]');
        expect(root).not.toHaveClass('w-[137vw]');
    });
```

Append to the `describe` in `components/landing/LandingPricing.test.tsx`:

```tsx
    it('centers an occasion header with a kicker, on white', () => {
        state.result = { groups: GROUPS, defaultEventTypeId: 'wedding' };
        render(<LandingPricing eventType="WEDDING" heading="Plans for your wedding." intro="Pick a plan." kicker="PLANS" />);
        const heading = screen.getByRole('heading', { name: 'Plans for your wedding.' });
        expect(screen.getByText('PLANS')).toBeInTheDocument();
        expect(heading.parentElement).toHaveClass('text-center');
        expect(heading.closest('section')).toHaveClass('bg-white');
        expect(heading.closest('section')).not.toHaveClass('bg-[#f4f0e8]');
    });
```

Create `components/landing/LandingSharedSections.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta } from '@/components/landing/LandingFinalCta';

// Every key reads as itself; arrays come back as two keyed lines.
vi.mock('next-intl/server', () => ({
    getTranslations: async () => Object.assign((key: string) => key, { raw: (key: string) => [`${key}.0`, `${key}.1`] }),
}));

afterEach(cleanup);

describe('LandingDemo', () => {
    it('shows an occasion kicker over the heading and its own phones, labelled once', async () => {
        render(
            await LandingDemo({
                copy: <span>own copy</span>,
                eyebrow: 'DEMO',
                heading: ['See a wedding', 'StoryWall.'],
                phones: <div>two phones</div>,
                previewLabel: 'Wedding demo on two phones',
            }),
        );
        expect(screen.getByText('DEMO')).toBeInTheDocument();
        expect(screen.getByText('own copy')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Wedding demo on two phones' })).toHaveTextContent('two phones');
        expect(document.querySelector('img')).toBeNull();
    });
});

describe('LandingFaq', () => {
    it('groups the answers so one stays open, and takes rich answers', async () => {
        render(
            await LandingFaq({
                centered: true,
                copy: { heading: 'FAQ', intro: 'Intro', items: [['Q1', <a href="#pricing" key="a">See plans</a>], ['Q2', 'A2']] },
                group: 'wedding-faq',
            }),
        );
        const details = document.querySelectorAll('details');
        expect([...details].map((item) => item.getAttribute('name'))).toEqual(['wedding-faq', 'wedding-faq']);
        expect(screen.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '#pricing');
        expect(screen.getByRole('heading', { name: 'FAQ' }).parentElement).toHaveClass('text-center');
    });

    it('leaves the landing FAQ ungrouped', async () => {
        render(await LandingFaq({ copy: { heading: 'FAQ', intro: 'Intro', items: [['Q1', 'A1']] } }));
        expect(document.querySelector('details')).not.toHaveAttribute('name');
    });
});

describe('LandingFinalCta', () => {
    it('centers an occasion final CTA with a rich label', async () => {
        render(
            await LandingFinalCta({
                centered: true,
                copy: {
                    copyStart: 'Start',
                    cta: (
                        <>
                            Create your <strong>StoryWall</strong>
                        </>
                    ),
                    heading: ['Your wedding', 'starts here.'],
                    imageAlt: 'Couple',
                },
            }),
        );
        const link = screen.getByRole('link');
        expect(link).toHaveTextContent('Create your StoryWall');
        expect(link).not.toHaveClass('uppercase');
        expect(screen.getByRole('heading').parentElement).toHaveClass('text-center');
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run components/landing/LandingHeroVisual.test.tsx components/landing/LandingPricing.test.tsx components/landing/LandingSharedSections.test.tsx`
Expected: FAIL on the new cases (comment cutouts still drawn, no `text-center`, `details` without `name`); the old cases still pass. `tsc` would also flag the unknown props.

- [ ] **Step 3: LandingHeroVisual — `comments` and `className`**

In `components/landing/LandingHeroVisual.tsx`:

Add the import `import { cn } from '@/lib/utils';`.

Replace the `HERO_VISUAL_CLASS` constant with:

```tsx
const HERO_VISUAL_BASE_CLASS = 'pointer-events-none relative z-10 aspect-[1136/1204] max-w-none';
// The landing's size and place in its hero grid; an occasion page may pass its own.
const HERO_VISUAL_PLACEMENT_CLASS =
    'order-2 left-[3.7vw] mt-[42px] w-[137vw] justify-self-center self-center min-[761px]:order-none min-[761px]:left-auto min-[761px]:m-0 min-[761px]:w-[min(780px,43vw)] min-[761px]:justify-self-start';
```

Below `SECOND_POST_SRC`, add:

```tsx
// The two comment cutouts an occasion page can replace, in order.
const COMMENT_INDEX: Record<string, 0 | 1> = {
    '/landing/sw-scene-item-sw-comment-1.webp': 0,
    '/landing/sw-scene-item-sw-comment-2.webp': 1,
};

// An occasion's own card for a cutout, if it passes one.
function spriteOverride(src: string, posts?: readonly [ReactNode, ReactNode], comments?: readonly [ReactNode, ReactNode]): ReactNode {
    if (posts && src === SECOND_POST_SRC) return posts[1];
    const comment = COMMENT_INDEX[src];
    return comments && comment !== undefined ? comments[comment] : null;
}
```

Replace the props type and signature:

```tsx
type LandingHeroVisualProps = {
    motionPaused: boolean;
    // Replaces the landing's size and place in its hero grid.
    className?: string;
    // An occasion page's own phone feed, two post cards and two comment cards, in place of the
    // wedding screenshots and cutouts.
    comments?: readonly [ReactNode, ReactNode];
    feed?: ReactNode;
    posts?: readonly [ReactNode, ReactNode];
};

export function LandingHeroVisual({ motionPaused, className, comments, feed, posts }: LandingHeroVisualProps) {
```

Replace the root `<div aria-hidden="true" className={HERO_VISUAL_CLASS}>` with:

```tsx
        <div aria-hidden="true" className={cn(HERO_VISUAL_BASE_CLASS, className ?? HERO_VISUAL_PLACEMENT_CLASS)}>
```

In the `restSprites.map`, replace the conditional child

```tsx
                    {posts && sprite.src === SECOND_POST_SRC ? (
                        posts[1]
                    ) : (
                        <ProtectedImage
```

with

```tsx
                    {spriteOverride(sprite.src, posts, comments) ?? (
                        <ProtectedImage
```

(the `ProtectedImage` and its closing `)}` stay as they are).

`components/occasions/OccasionHeroVisual.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

type OccasionHeroVisualProps = {
    className?: string;
    comments?: readonly [ReactNode, ReactNode];
    feed?: ReactNode;
    posts?: readonly [ReactNode, ReactNode];
};

// The landing's phone and floating cards; an occasion with its own photos passes its feed and cards.
export function OccasionHeroVisual({ className, comments, feed, posts }: OccasionHeroVisualProps) {
    const { paused } = useLandingMotion();
    return <LandingHeroVisual className={className} comments={comments} feed={feed} motionPaused={paused} posts={posts} />;
}
```

- [ ] **Step 4: LandingHowItWorks — rich step descriptions**

In `components/landing/LandingHowItWorks.tsx`, add `import type { ReactNode } from 'react';` and change the steps type:

```tsx
    // A description may hold bold words (an occasion page's t.rich).
    steps: { description: ReactNode; title: string }[];
```

Nothing else changes (`key={step.title}` stays; titles are unique).

- [ ] **Step 5: LandingPricing — centered header with a kicker**

In `components/landing/LandingPricing.tsx`, change the props:

```tsx
type LandingPricingProps = {
    // An occasion page shows only its own event type's plans, with no picker, under its own heading.
    eventType?: EventTypeConvention;
    heading?: string;
    intro?: string;
    // With an event type: a small label over a centered heading, on white.
    kicker?: string;
};

export function LandingPricing({ eventType, heading, intro, kicker }: LandingPricingProps) {
```

After `const planCount = …`, add:

```tsx
    const centered = Boolean(eventType && kicker);
```

Replace the `<section` opening tag's `className` with:

```tsx
            // On an occasion page the plans follow white sections, so a paper tone sets them apart; a
            // centered header (the wedding page) follows the dark features and stays white.
            className={cn(
                'px-5 pt-16 pb-16 text-[#151313] min-[761px]:px-[clamp(24px,4vw,72px)] min-[761px]:pt-20 min-[761px]:pb-24',
                centered ? 'bg-white min-[761px]:px-18 min-[761px]:pt-22 min-[761px]:pb-24.5' : eventType ? 'bg-[#f4f0e8]' : 'bg-white',
            )}
```

Replace the whole "Pricing introduction" block (the comment and the `<div className={cn('mx-auto grid', …)}>…</div>`) with:

```tsx
            {centered ? (
                /* Pricing introduction: kicker, heading and intro, centered */
                <div className="mx-auto max-w-180 text-center">
                    <p className="mb-3.5 text-[13px] font-black tracking-[.15em] uppercase">{kicker}</p>
                    <h2
                        className="mt-6 font-[Baskerville,Georgia,serif] text-[clamp(44px,12vw,62px)] leading-[.9] tracking-[-.055em] text-balance min-[761px]:mt-0 min-[761px]:text-[clamp(40.5px,4.275vw,70.5px)]"
                        id="landing-pricing-title"
                    >
                        {heading ?? t('heading')}
                    </h2>
                    <p className="mx-auto mt-4.5 max-w-155 text-sm leading-[1.55] min-[761px]:mt-6.25 min-[761px]:text-base">{intro ?? t('intro')}</p>
                </div>
            ) : (
                /* Pricing introduction: an occasion page lines its heading up with the cards, with no eyebrow */
                <div className={cn('mx-auto grid', eventType ? PLAN_WIDTH[planCount] : 'max-w-300 gap-x-[5vw] min-[761px]:grid-cols-[1fr_2fr]')}>
                    {eventType ? null : <p className="text-[13px] font-black tracking-[.15em]">{t('eyebrow')}</p>}
                    <div>
                        <h2
                            className={cn(
                                'font-[Baskerville,Georgia,serif] text-[clamp(48px,11vw,88px)] leading-[.9] tracking-[-.055em]',
                                eventType ? 'text-balance' : 'mt-5 max-w-205 min-[761px]:mt-0',
                            )}
                            id="landing-pricing-title"
                        >
                            {heading ?? t('heading')}
                        </h2>
                        <p className="mt-5 max-w-155 text-base leading-relaxed">{intro ?? t('intro')}</p>
                    </div>
                </div>
            )}
```

- [ ] **Step 6: LandingFaq and LandingFaqItem — centered header, one open at a time, rich answers**

`components/landing/LandingFaqItem.tsx`, replace the props and the `<details>` opening tag and answer type:

```tsx
import type { ReactNode } from 'react';

import { landingFaqAttributes } from '@/lib/landingTracking';

type LandingFaqItemProps = {
    // May hold a link (an occasion page's FAQ).
    answer: ReactNode;
    // Items with the same group close each other (native exclusive <details name>).
    group?: string;
    index: number;
    question: string;
};

export function LandingFaqItem({ answer, group, index, question }: LandingFaqItemProps) {
    return (
        <details className="group border-b border-[rgb(21_19_19/20%)]" name={group} {...landingFaqAttributes(index + 1)}>
```

(the `<summary>` and the answer `<div>` stay as they are).

`components/landing/LandingFaq.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { LandingFaqItem } from '@/components/landing/LandingFaqItem';
import { landingSectionAttributes } from '@/lib/landingTracking';

type FaqItem = [question: string, answer: ReactNode];

export type LandingFaqCopy = { heading: string; intro: string; items: FaqItem[] };

type LandingFaqProps = {
    // An occasion page's own questions; the landing reads its messages.
    copy?: LandingFaqCopy;
    // Heading and intro centered over the list.
    centered?: boolean;
    // Opening one answer closes the others.
    group?: string;
};

export async function LandingFaq({ copy, centered = false, group }: LandingFaqProps) {
    const t = await getTranslations('LandingPage.faq');
    const { heading, intro, items } = copy ?? { heading: t('heading'), intro: t('intro'), items: t.raw('items') as FaqItem[] };

    return (
        /* FAQ */
        <section
            className="relative block overflow-hidden bg-white px-5 pt-12 pb-14.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-16 min-[761px]:pb-18"
            id="faq"
            {...landingSectionAttributes('faq')}
        >
            {centered ? (
                /* Heading and intro, centered */
                <div className="mx-auto mb-6.5 max-w-190 text-center min-[761px]:mb-7.5">
                    <h2 className="mt-0 mb-[.3em] [font-family:var(--editorial)] text-[68px] leading-[0.82] font-normal tracking-[-0.065em] min-[761px]:text-[clamp(48px,4.875vw,78px)]">
                        {heading}
                    </h2>
                    <p className="mx-auto max-w-107.5 text-[13px] leading-[1.45] min-[761px]:text-sm">{intro}</p>
                </div>
            ) : (
                /* Heading and intro, side by side */
                <div className="mb-6.5 block w-full max-w-295 min-[761px]:mx-auto min-[761px]:mb-7.5 min-[761px]:grid min-[761px]:grid-cols-[auto_minmax(0,1fr)] min-[761px]:items-end min-[761px]:gap-x-10.5 min-[761px]:gap-y-2">
                    <h2 className="m-0 [font-family:var(--editorial)] text-[68px] leading-[0.82] font-normal tracking-[-0.065em] min-[761px]:col-start-1 min-[761px]:row-start-2 min-[761px]:text-[clamp(64px,6.5vw,104px)]">
                        {heading}
                    </h2>
                    <p className="mt-2.5 mb-2 max-w-[92%] text-[13px] leading-[1.45] min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:mt-0 min-[761px]:max-w-107.5 min-[761px]:text-sm">
                        {intro}
                    </p>
                </div>
            )}
            {/* Questions */}
            <div className="mx-auto w-full max-w-295 border-t border-[rgb(21_19_19/26%)]">
                {items.map(([question, answer], index) => (
                    <LandingFaqItem answer={answer} group={group} index={index} key={question} question={question} />
                ))}
            </div>
        </section>
    );
}
```

- [ ] **Step 7: LandingDemo — kicker, own phones, rich copy**

In `components/landing/LandingDemo.tsx`, replace the props type and signature:

```tsx
type LandingDemoProps = {
    // An occasion page's server-rendered preview under the band.
    children?: ReactNode;
    // An occasion page's own sentence in place of the landing's; may hold bold words.
    copy?: ReactNode;
    // true: the landing's eyebrow in its own column. false: no eyebrow, the heading starts on the left.
    // A string: that kicker right above the heading, keeping the three columns.
    eyebrow?: boolean | string;
    heading?: string[];
    href?: string;
    // Drawn phones in place of the landing's picture, announced as one image named previewLabel.
    phones?: ReactNode;
    previewLabel?: string;
};

export async function LandingDemo({ children, copy, eyebrow = true, heading: headingOverride, href = routes.demo, phones, previewLabel }: LandingDemoProps) {
    const t = await getTranslations('LandingPage.demo');
    const heading = headingOverride ?? (t.raw('heading') as string[]);
    const kicker = typeof eyebrow === 'string' ? eyebrow : null;
```

In the `<section>` className, change the columns condition from `eyebrow ? …` to `eyebrow !== false ? …`:

```tsx
                eyebrow !== false ? 'min-[761px]:grid-cols-[0.5fr_1.42fr_0.92fr]' : 'min-[761px]:grid-cols-[1.42fr_0.92fr]',
```

Replace the "Eyebrow" block and the "Heading and link" wrapper's opening `<div>` with:

```tsx
            {/* Eyebrow */}
            {eyebrow === true ? (
                <div className="pt-3 text-[10px] font-black tracking-[0.15em] uppercase min-[761px]:col-start-1 min-[761px]:row-start-1 min-[761px]:mt-3 min-[761px]:self-start min-[761px]:pt-0">
                    {t('eyebrow')}
                </div>
            ) : null}
            {/* Kicker, over the heading */}
            {kicker ? (
                <div className="pt-3 text-[10px] font-black tracking-[0.15em] uppercase min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-4 min-[761px]:self-end min-[761px]:pt-0 min-[761px]:text-[13px]">
                    {kicker}
                </div>
            ) : null}
            {/* Heading and link */}
            <div
                className={cn(
                    'min-[761px]:self-center',
                    kicker
                        ? 'min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:self-start'
                        : eyebrow
                          ? 'min-[761px]:col-start-2 min-[761px]:row-start-1'
                          : 'min-[761px]:col-start-1 min-[761px]:row-start-1',
                )}
            >
```

Replace the "Phones" block with:

```tsx
            {/* Phones */}
            <div
                aria-label={previewLabel ?? t('previewLabel')}
                className={cn(
                    'flex items-center justify-center min-[761px]:col-start-[-2] min-[761px]:self-center min-[761px]:justify-self-end min-[761px]:pr-2',
                    kicker ? 'min-[761px]:row-[1/span_2]' : 'min-[761px]:row-start-1',
                )}
                role={phones ? 'img' : undefined}
            >
                {phones ?? (
                    <ProtectedImage
                        unoptimized
                        alt={t('imageAlt')}
                        className="block h-auto w-[min(620px,118vw)] max-w-none translate-x-[-2vw] object-contain drop-shadow-[-16px_30px_32px_rgba(70,38,24,0.2)] min-[761px]:w-[min(720px,37vw)] min-[761px]:translate-x-0 min-[761px]:translate-y-[10px] min-[761px]:drop-shadow-[-12px_24px_26px_rgba(70,38,24,0.2)]"
                        height={1120}
                        src="/landing/storywall-demo-preview-with-two-angled-smartphones-showing-the-a.webp"
                        loading="lazy"
                        width={1115}
                    />
                )}
            </div>
```

- [ ] **Step 8: LandingFinalCta — centered variant, rich label**

In `components/landing/LandingFinalCta.tsx`:

Add `import type { ReactNode } from 'react';` and `import { cn } from '@/lib/utils';`.

In `LandingFinalCtaCopy`, change `cta: string;` to:

```tsx
    // May hold a bold word (an occasion page's t.rich).
    cta: ReactNode;
```

Add above the component:

```tsx
const CTA_CLASS =
    'motion-final-cta-btn mt-7 flex min-h-15 w-full items-center justify-between gap-7.5 rounded-full bg-white pr-5 pl-5.5 text-[#151313] no-underline shadow-[0_12px_34px_rgba(21,19,19,0.1)] transition-transform duration-280 ease-[ease] hover:-translate-y-0.5 motion-reduce:transition-none min-[761px]:mt-8.5 min-[761px]:min-h-14.5 min-[761px]:w-max min-[761px]:justify-center min-[761px]:px-5.5 min-[761px]:shadow-none';
// The landing's label is small capitals; a centered occasion CTA reads as a sentence.
const CTA_TYPE_CLASS = {
    landing: 'text-[11px] font-black tracking-[0.08em] uppercase min-[761px]:text-[13px] min-[761px]:tracking-widest',
    centered: 'text-[13.75px] font-medium tracking-[0.025em] min-[761px]:text-[16.25px]',
};
```

Change the props type and signature:

```tsx
type LandingFinalCtaProps = {
    // Content centered in its panel, with a sentence-case button (the wedding page).
    centered?: boolean;
    // An occasion page's own copy, photo and create link.
    copy?: LandingFinalCtaCopy;
    href?: string;
    image?: { height: number; src: string; width: number };
};

export async function LandingFinalCta({ centered = false, copy, href = routes.events.new(), image = DEFAULT_IMAGE }: LandingFinalCtaProps) {
```

Change the content panel's opening tag (the `<div className="flex flex-col justify-center bg-[radial-gradient(…` line) to:

```tsx
            <div
                className={cn(
                    'flex flex-col justify-center bg-[radial-gradient(circle_at_84%_15%,rgba(255,255,255,0.28),rgba(0,0,0,0)_31%),linear-gradient(135deg,#ffc969_0%,#f9a462_48%,#f39a72_100%)] px-5 pt-10 pb-11 min-[761px]:box-border min-[761px]:h-180 min-[761px]:px-[7vw]',
                    centered && 'items-center text-center min-[761px]:pt-21.5 min-[761px]:pb-19.5',
                )}
            >
```

Change the button's `className` to:

```tsx
                    className={cn(CTA_CLASS, centered ? CTA_TYPE_CLASS.centered : CTA_TYPE_CLASS.landing)}
```

- [ ] **Step 9: Run the tests**

Run: `npx vitest run components/landing components/occasions`
Expected: PASS, old and new cases.

- [ ] **Step 10: Types and lint**

```bash
npx tsc --noEmit
npx eslint components/landing components/occasions
```

Expected: no errors.

- [ ] **Step 11: Main landing unchanged**

With the dev server on `http://localhost:3000/`, open `/el` at 1440 wide and 390 wide and compare the hero, How it works, demo, pricing, FAQ and final CTA with the baseline screenshots from Task 1 Step 4. Nothing should move. Do the same for the baptism page.

- [ ] **Step 12: Commit**

```bash
git add components/landing components/occasions/OccasionHeroVisual.tsx
git commit -m "feat(landing): optional props on shared sections for occasion pages"
```

---

### Task 9: Marquee motion hook

**Files:**
- Create: `hooks/useMarqueeMotion.ts`
- Test: `hooks/useMarqueeMotion.test.tsx`

The track holds the tiles twice. The hook moves it from `0%` to `-50%` of its own width every `duration` seconds, so the second copy slides into the first one's place. Each copy carries its own trailing gap (`pr-4`) instead of a gap between copies, so `-50%` is exactly one copy.

- [ ] **Step 1: Write the failing test**

`hooks/useMarqueeMotion.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarqueeMotion } from '@/hooks/useMarqueeMotion';
import { LandingMotionProvider, useLandingMotion } from '@/providers/LandingMotionProvider';

const frame = vi.hoisted(() => ({ callback: null as ((time: number, delta: number) => void) | null, reduce: false }));

vi.mock('framer-motion', async (importOriginal) => ({
    ...(await importOriginal<typeof import('framer-motion')>()),
    useAnimationFrame: (callback: (time: number, delta: number) => void) => {
        frame.callback = callback;
    },
    useReducedMotion: () => frame.reduce,
}));

const wrapper = ({ children }: { children: ReactNode }) => <LandingMotionProvider>{children}</LandingMotionProvider>;

function tick(ms: number) {
    act(() => frame.callback?.(0, ms));
}

beforeEach(() => {
    frame.reduce = false;
    window.sessionStorage.clear();
});

afterEach(() => {
    frame.callback = null;
});

describe('useMarqueeMotion', () => {
    it('moves half the track in the given time, then starts over', () => {
        const { result } = renderHook(() => useMarqueeMotion(48), { wrapper });
        tick(12000);
        expect(result.current.x.get()).toBe('-12.5%');
        tick(36000);
        expect(result.current.x.get()).toBe('0%');
    });

    it('stops while hovered', () => {
        const { result } = renderHook(() => useMarqueeMotion(48), { wrapper });
        act(() => result.current.onPointerEnter());
        tick(12000);
        expect(result.current.x.get()).toBe('0%');
        act(() => result.current.onPointerLeave());
        tick(12000);
        expect(result.current.x.get()).toBe('-12.5%');
    });

    it('stands still for reduced motion', () => {
        frame.reduce = true;
        const { result } = renderHook(() => useMarqueeMotion(48), { wrapper });
        tick(12000);
        expect(result.current.still).toBe(true);
        expect(result.current.x.get()).toBe('0%');
    });

    it('stands still while landing motion is paused', () => {
        const { result } = renderHook(() => ({ marquee: useMarqueeMotion(48), motion: useLandingMotion() }), { wrapper });
        act(() => result.current.motion.toggle());
        tick(12000);
        expect(result.current.marquee.still).toBe(true);
        expect(result.current.marquee.x.get()).toBe('0%');
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run hooks/useMarqueeMotion.test.tsx`
Expected: FAIL, `Failed to resolve import "@/hooks/useMarqueeMotion"`.

- [ ] **Step 3: Implement**

`hooks/useMarqueeMotion.ts`:

```ts
'use client';

import { type MotionValue, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';

import { useLandingMotion } from '@/providers/LandingMotionProvider';

type MarqueeMotion = {
    // Reduced motion or the footer's pause: show one copy, still, scrollable by hand.
    still: boolean;
    // The track's translateX, from 0% to -50% (one of its two copies).
    x: MotionValue<string>;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
};

// Slides a track that holds its tiles twice, one copy per `duration` seconds, and stops on hover.
export function useMarqueeMotion(duration: number): MarqueeMotion {
    const reduceMotion = useReducedMotion();
    const { paused } = useLandingMotion();
    const [hovered, setHovered] = useState(false);
    // Share of one copy travelled, 0 to 1. x is set in the same frame (useTransform would lag one frame).
    const progress = useRef(0);
    const x = useMotionValue('0%');
    const still = Boolean(reduceMotion) || paused;

    useAnimationFrame((_, delta) => {
        if (still) {
            if (progress.current !== 0) {
                progress.current = 0;
                x.set('0%');
            }
            return;
        }
        if (hovered) return;
        progress.current = (progress.current + delta / (duration * 1000)) % 1;
        x.set(`${progress.current === 0 ? 0 : -50 * progress.current}%`);
    });

    return { still, x, onPointerEnter: () => setHovered(true), onPointerLeave: () => setHovered(false) };
}
```

(`progress.current === 0 ? 0 : …` keeps `0%` instead of `-0%`.)

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useMarqueeMotion.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useMarqueeMotion.ts hooks/useMarqueeMotion.test.tsx
git commit -m "feat(landing): marquee motion hook"
```

---

### Task 10: Wedding copy in both languages

The new keys are added next to the old ones, and the keys both layouts read keep a shape both understand, so the current wedding page keeps rendering until Task 19 switches it. Task 20 removes the old keys. Until Task 19, the old layout shows FAQ 10 unformatted (`{range, select, …}`); nothing ships in between.

`messages/el.json` has a duplicate key elsewhere, so a whole-file `JSON.parse`/`stringify` would rewrite unrelated lines. The script below edits only one `OccasionPages.<key>` block.

**Files:**
- Create (scratchpad): `$SP/scripts/edit-occasion-copy.cjs`, `$SP/copy/wedding-el.json`, `$SP/copy/wedding-en.json`, `$SP/copy/common-el.json`, `$SP/copy/common-en.json`
- Modify: `messages/el.json`, `messages/en.json`
- Modify: `components/occasions/OccasionHero.tsx`
- Create: `lib/occasions/weddingCopy.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/occasions/weddingCopy.test.ts`:

```ts
import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { OccasionFaqEntry } from '@/lib/occasions/occasionFaq';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { WeddingFeedPost, WeddingMarqueeCopy, WeddingRsvpReplyCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_FEATURE_ORDER } from '@/lib/occasions/weddingFeatures';
import { WEDDING_HERO_MEDIA, WEDDING_MARQUEE, WEDDING_RSVP_AVATARS } from '@/lib/occasions/weddingMedia';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const SPAN: OccasionPriceValues = { range: 'span', from: '119€', fromName: 'START', to: '259€', toName: 'SIGNATURE' };
const SINGLE: OccasionPriceValues = { range: 'single', from: '119€', fromName: 'START', to: '119€', toName: 'START' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

// Tags rendered as plain text, so a test reads the words.
const TAGS = { b: (chunks: string) => chunks, em: (chunks: string) => chunks, br: () => ' ' };

describe.each([
    ['el', el],
    ['en', en],
] as const)('wedding copy (%s)', (locale, messages) => {
    const t = createTranslator({
        locale,
        // Untyped, so a namespace built at runtime is accepted.
        messages: messages as Messages,
        namespace: 'OccasionPages.WEDDING',
        onError: (error) => {
            throw error;
        },
    });

    it('names the lowest price in the description only when there is one', () => {
        expect(t('meta.description', SPAN)).toContain('119€');
        expect(t('meta.description', NONE)).not.toMatch(/€|\{/);
    });

    it('answers the price question for every range', () => {
        expect(t('faq.9.a', SPAN)).toContain('259€ (SIGNATURE)');
        expect(t('faq.9.a', SINGLE)).toContain('119€ (START)');
        expect(t('faq.9.a', SINGLE)).not.toContain('259€');
        expect(t('faq.9.a', NONE)).not.toMatch(/€|\{/);
    });

    it('formats every string that holds tags', () => {
        const rich = [
            'hero.h1',
            'hero.kicker',
            'demo.copy',
            'finalCta.cta',
            ...[0, 1, 2].map((index) => `how.steps.${index}.body`),
            ...[0, 1, 2].map((index) => `why.with.steps.${index}.body`),
        ];
        for (const key of rich) expect(t.markup(key, TAGS), key).not.toMatch(/[<>{}]/);
        expect(t('hero.trustPrice', SPAN)).toContain('119€');
        expect(t('why.with.photoAlt', { moment: 'M', name: 'N', role: 'R' })).toMatch(/M.*N.*R/);
    });

    it('has 14 questions, linking only to the QR page and the plans', () => {
        const faq = t.raw('faq') as OccasionFaqEntry[];
        expect(faq).toHaveLength(14);
        expect(faq.flatMap((entry) => (entry.link ? [entry.link.to] : []))).toEqual(['qr', 'pricing']);
    });

    it('matches the photo map one to one', () => {
        expect((t.raw('hero.feed.posts') as WeddingFeedPost[]).length).toBe(WEDDING_HERO_MEDIA.posts.length);
        expect((t.raw('why.with.marquee') as WeddingMarqueeCopy[]).length).toBe(WEDDING_MARQUEE.length);
        expect((t.raw('rsvp.without.replies') as WeddingRsvpReplyCopy[]).length).toBe(WEDDING_RSVP_AVATARS.length);
    });

    it('has copy for every feature in the design', () => {
        expect(Object.keys(t.raw('features') as Record<string, unknown>).sort()).toEqual([...WEDDING_FEATURE_ORDER].sort());
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/occasions/weddingCopy.test.ts`
Expected: FAIL, `MISSING_MESSAGE` / `FORMATTING_ERROR` on the first keys (`meta.description` has no price yet, `hero.kicker` does not exist).

- [ ] **Step 3: Write the copy-editing script**

`$SP/scripts/edit-occasion-copy.cjs`:

```js
// Deep-merges a patch into OccasionPages.<key> of a messages file, or removes keys from it, and leaves
// every other line of the file as it is.
// Usage: node edit-occasion-copy.cjs <messages.json> <key> <patch.json | -> [--remove a.b,c]
const fs = require('fs');

const [, , file, key, patchFile, flag, removeList] = process.argv;
const text = fs.readFileSync(file, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const pagesAt = text.indexOf('"OccasionPages": {');
const keyAt = text.indexOf(`"${key}": {`, pagesAt);
if (pagesAt < 0 || keyAt < 0) throw new Error(`OccasionPages.${key} not found in ${file}`);
const indent = text.slice(text.lastIndexOf('\n', keyAt) + 1, keyAt);
if (indent !== ' '.repeat(8)) throw new Error(`"${key}" found at the wrong depth in ${file}`);

// The block's closing brace, skipping braces inside strings.
const open = text.indexOf('{', keyAt);
let depth = 0;
let inString = false;
let close = -1;
for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
        if (ch === '\\') i++;
        else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
        close = i;
        break;
    }
}

const value = JSON.parse(text.slice(open, close + 1));
const isObject = (node) => node !== null && typeof node === 'object' && !Array.isArray(node);
function merge(target, patch) {
    for (const [name, next] of Object.entries(patch)) target[name] = isObject(next) && isObject(target[name]) ? merge(target[name], next) : next;
    return target;
}
if (patchFile && patchFile !== '-') merge(value, JSON.parse(fs.readFileSync(patchFile, 'utf8')));
if (flag === '--remove') {
    for (const path of removeList.split(',')) {
        const names = path.split('.');
        const last = names.pop();
        const parent = names.reduce((node, name) => node[name], value);
        if (!(last in parent)) throw new Error(`${path} not found`);
        delete parent[last];
    }
}

const body = JSON.stringify(value, null, 4).split('\n').join(eol + indent);
fs.writeFileSync(file, text.slice(0, open) + body + text.slice(close + 1));
console.log(`${file}: OccasionPages.${key} updated`);
```

- [ ] **Step 4: Write the Greek patch**

`$SP/copy/wedding-el.json` (Greek is the design's text word for word):

```json
{
    "meta": {
        "title": "Ηλεκτρονικό Προσκλητήριο & Ιστοσελίδα Γάμου | StoryWall",
        "description": "Ηλεκτρονικό προσκλητήριο και ιστοσελίδα γάμου με RSVP, πρόγραμμα, χάρτες και φωτογραφίες καλεσμένων. Για Ελλάδα και Κύπρο, χωρίς εφαρμογή.{range, select, none {} other { Από {from}.}}"
    },
    "hero": {
        "breadcrumb": "Γάμος",
        "kicker": "ΤΟ SOCIAL ΓΙΑ ΤΟΝ <b>ΓΑΜΟ ΣΟΥ</b>",
        "h1": "Ηλεκτρονικό προσκλητήριο & <em>ιστοσελίδα γάμου</em>",
        "subtitle": "Ένας γάμος γεμάτος στιγμές που αξίζει να μείνουν.",
        "body": "Φτιάξε τη δική σου ιστοσελίδα γάμου με ψηφιακό προσκλητήριο, RSVP, πρόγραμμα και χάρτες, για γάμους σε Ελλάδα και Κύπρο. Την ημέρα του γάμου οι καλεσμένοι ανεβάζουν τις φωτογραφίες τους, και όλα μένουν στο δικό σου ιδιωτικό StoryWall.",
        "trust": ["Χωρίς app", "Ιδιωτικό", "Με ένα link"],
        "trustPrice": "Από {from}",
        "feed": {
            "title": "James & Olivia",
            "date": "30 ΔΕΚ 2026",
            "place": "Ρόδος",
            "posts": [
                {
                    "author": "Emily R.",
                    "time": "πριν 2 ώρ.",
                    "caption": "Η πιο όμορφη αρχή. 🤍",
                    "likes": 56,
                    "comments": 8,
                    "replies": [
                        { "author": "Sofia L.", "text": "Πανέμορφη! 💕" },
                        { "author": "Nikos P.", "text": "Let's go! 👰🏼✨" }
                    ]
                },
                {
                    "author": "Μαρία Κ.",
                    "time": "πριν 4 ώρ.",
                    "caption": "Μια στιγμή μόνο για τις δυο τους.",
                    "likes": 42,
                    "comments": 6,
                    "replies": [
                        { "author": "Eleni T.", "text": "Συγκίνηση... ❤️" },
                        { "author": "Anna M.", "text": "Πανέμορφες! 🌸" }
                    ]
                },
                {
                    "author": "Nikos P.",
                    "time": "πριν 6 ώρ.",
                    "caption": "The groom squad is ready! 🙌",
                    "likes": 38,
                    "comments": 5,
                    "replies": [
                        { "author": "Alex G.", "text": "Looking sharp! 👌" },
                        { "author": "Petros D.", "text": "Καλή επιτυχία φίλε! 💪" }
                    ]
                },
                {
                    "author": "Sofia L.",
                    "time": "πριν 8 ώρ.",
                    "caption": "Όλοι οι δρόμοι οδηγούν εδώ.",
                    "likes": 64,
                    "comments": 7,
                    "replies": [
                        { "author": "Maria S.", "text": "Υπέροχος χώρος! ❤️" },
                        { "author": "Kostas V.", "text": "Ανυπομονούμε! 🙌" }
                    ]
                },
                {
                    "author": "Ελένη Α.",
                    "time": "πριν 11 ώρ.",
                    "caption": "Και κάπως έτσι... για πάντα. 🤍",
                    "likes": 78,
                    "comments": 12,
                    "replies": [
                        { "author": "Maria K.", "text": "Συγκινητικό! 💕" },
                        { "author": "Nikos P.", "text": "Να ζήσετε! 🙏✨" }
                    ]
                },
                {
                    "author": "Alex T.",
                    "time": "πριν 12 ώρ.",
                    "caption": "Just married! 🎉",
                    "likes": 92,
                    "comments": 14,
                    "replies": [
                        { "author": "Sofia L.", "text": "Τέλεια στιγμή! 😍" },
                        { "author": "Petros D.", "text": "Πάντα ευτυχισμένοι! 🤍" }
                    ]
                },
                {
                    "author": "Chloe B.",
                    "time": "πριν 13 ώρ.",
                    "caption": "Golden hour, good food, our favourite people.",
                    "likes": 64,
                    "comments": 8,
                    "replies": [
                        { "author": "Eleni T.", "text": "Υπέροχες εικόνες! 🌅" },
                        { "author": "Anna M.", "text": "Ονειρεμένο! 🤍" }
                    ]
                },
                {
                    "author": "Γιώργος Ν.",
                    "time": "πριν 14 ώρ.",
                    "caption": "Το πρώτο τους τραγούδι. ✨",
                    "likes": 57,
                    "comments": 6,
                    "replies": [
                        { "author": "Sofia L.", "text": "Μαγικό! ✨" },
                        { "author": "James K.", "text": "Από τις πιο όμορφες στιγμές! 🤍" }
                    ]
                },
                {
                    "author": "Isabella C.",
                    "time": "πριν 15 ώρ.",
                    "caption": "Δεν κατεβαίνουμε από την πίστα! 🔥",
                    "likes": 86,
                    "comments": 11,
                    "replies": [
                        { "author": "Maria S.", "text": "Τι βραδιά! 🔥" },
                        { "author": "Chris T.", "text": "Όλα τέλεια! 🙌" }
                    ]
                }
            ],
            "music": {
                "labels": ["ΗΜ/ΝΙΑ", "ΜΗΝΑΣ", "ΩΡΑ"],
                "values": ["26", "08", "04:40 μ.μ."],
                "kicker": "ΕΝΗΜΕΡΩΣΗ ΛΙΣΤΑΣ",
                "title": "Ενημέρωση λίστας",
                "time": "πριν 10 ώρ.",
                "cta": "Άνοιγμα λίστας"
            }
        }
    },
    "mock": {
        "units": ["Η", "Ω", "Λ", "Δ"],
        "stories": { "own": "Η ιστορία σας", "schedule": "Πρόγραμμα", "guests": "Καλεσμένοι", "moments": "Στιγμές", "venue": "Χώρος" },
        "scheduleBadge": ["ΔΕΚ", "30"],
        "composer": "Μοιραστείτε ένα μήνυμα ή μια στιγμή..."
    },
    "how": {
        "kicker": "ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ",
        "heading": ["Τρία βήματα.", "Μία ιστορία γάμου."],
        "steps": [
            {
                "title": "Δημιουργείς",
                "body": "Διαλέγεις πακέτο και φτιάχνεις την ιστοσελίδα του γάμου σου με ημερομηνία, χώρους και πρόγραμμα, <b>μέσα σε λίγα λεπτά.</b>"
            },
            {
                "title": "Μοιράζεσαι",
                "body": "Στέλνεις το <b>ηλεκτρονικό προσκλητήριο</b> με ένα link και το <b>QR code</b> για τη συλλογή φωτογραφιών. <b>Χωρίς app.</b>"
            },
            {
                "title": "Η ιστορία ξεκινά",
                "body": "Οι καλεσμένοι επιβεβαιώνουν την παρουσία τους, μοιράζονται posts και stories και <b>ανεβάζουν φωτογραφίες από τον γάμο.</b>"
            }
        ]
    },
    "why": {
        "kicker": "ΓΙΑΤΙ STORYWALL",
        "heading": ["Οι φωτογραφίες του γάμου σου", "δεν πρέπει να χαθούν σε 100 κινητά."],
        "without": {
            "label": "ΧΩΡΙΣ STORYWALL",
            "bubbles": ["Στείλε μου κι εμένα! 🙏", "Ποιος έχει το βίντεο;"],
            "items": [
                "«Στείλε μου κι εμένα τις φωτό!»",
                "Φωτογραφίες σε 100 διαφορετικά κινητά",
                "Ευχές χαμένες σε Viber και Messenger",
                "Δημόσια posts που βλέπουν όλοι"
            ]
        },
        "with": {
            "label": "ΜΕ STORYWALL · ΟΛΑ ΣΕ ΕΝΑ ΜΕΡΟΣ",
            "subtitle": "Από τις προετοιμασίες και την ημέρα του γάμου, μέχρι το γαμήλιο ταξίδι.",
            "qrAlt": "Καλεσμένη σκανάρει το QR του StoryWall στο τραπέζι του γάμου",
            "steps": [
                { "title": "Σκανάρουν", "body": "Το QR στο τραπέζι, με την κάμερα του κινητού." },
                { "title": "Ανεβάζουν", "body": "Φωτογραφίες και βίντεο. <b>Χωρίς app.</b>" },
                { "title": "Όλα μαζί", "body": "Στο StoryWall σας, <b>σε αρχική ποιότητα.</b>" }
            ],
            "photoAlt": "{moment} — φωτογραφία από {name}, {role}",
            "marquee": [
                { "name": "Ιωάννα", "role": "φίλη νύφης", "moment": "Προετοιμασία νυφικού" },
                { "name": "Μαρία", "role": "φίλη νύφης", "moment": "Βραδινή έξοδος" },
                { "name": "Κώστας", "role": "φίλος γαμπρού", "moment": "Πρόποση στην ταβέρνα" },
                { "name": "Σοφία", "role": "φίλη νύφης", "moment": "Χορός στο party" },
                { "name": "Πέτρος", "role": "φίλος γαμπρού", "moment": "Παρέα γαμπρού" },
                { "name": "Ελένη", "role": "μητέρα νύφης", "moment": "Προετοιμασία νύφης" },
                { "name": "Άννα", "role": "φίλη νύφης", "moment": "Καλεσμένοι στην εκκλησία" },
                { "name": "Γιώργος", "role": "κουμπάρος", "moment": "Άφιξη νεονύμφων" },
                { "name": "Ιωάννα", "role": "κουμπάρα", "moment": "Τρυφερή στιγμή των νεονύμφων" },
                { "name": "Νίκος", "role": "φίλος γαμπρού", "moment": "Πρώτος χορός" },
                { "name": "Κατερίνα", "role": "ξαδέρφη", "moment": "Χορός στη δεξίωση" },
                { "name": "Νεφέλη", "role": "νύφη", "moment": "Πρωινό της νύφης" },
                { "name": "Νεφέλη", "role": "νύφη", "moment": "Ταξίδι στο Παρίσι" },
                { "name": "Ορέστης", "role": "γαμπρός", "moment": "Άφιξη στο Παρίσι" }
            ],
            "example": "ΠΑΡΑΔΕΙΓΜΑ · ΕΝΑΣ ΓΑΜΟΣ ΣΤΟ STORYWALL",
            "stats": [
                { "value": "248", "label": "ΦΩΤΟΓΡΑΦΙΕΣ" },
                { "value": "36", "label": "ΒΙΝΤΕΟ" },
                { "value": "64", "label": "ΕΥΧΕΣ" },
                { "value": "86", "label": "ΚΑΛΕΣΜΕΝΟΙ" }
            ],
            "chips": [
                "Όλες οι φωτογραφίες σε ένα μέρος",
                "Ανεβαίνουν με ένα QR, χωρίς app",
                "Ευχολόγιο που κατεβάζεις σε PDF",
                "Ιδιωτικό, μόνο για τους καλεσμένους"
            ]
        }
    },
    "rsvp": {
        "heading": ["Μην αναρωτιέσαι ποιος θα έρθει.", "Όλες οι απαντήσεις σε ένα μέρος."],
        "intro": "Με το StoryWall, οι καλεσμένοι σου επιβεβαιώνουν εύκολα και εσύ έχεις τον πλήρη έλεγχο, από την πρόσκληση μέχρι τη λίστα.",
        "label": "Χωρίς StoryWall οι απαντήσεις έρχονται διάσπαρτα από Viber, WhatsApp, Messenger, email και SMS. Με StoryWall όλα οργανωμένα: φόρμα RSVP, λίστα καλεσμένων και στατιστικά.",
        "without": {
            "pill": "ΧΩΡΙΣ STORYWALL",
            "caption": "Οι απαντήσεις έρχονται διάσπαρτα από παντού…",
            "replies": [
                { "name": "Κατερίνα", "time": "πριν από 2 ώρες", "answer": "Ναι, 2 άτομα", "going": true },
                { "name": "Πέτρος", "time": "πριν από 4 ώρες", "answer": "Όχι", "going": false },
                { "name": "Μαρία", "time": "πριν από 1 ημέρα", "answer": "Ναι", "going": true },
                { "name": "Θεοδώρα", "time": "πριν από 1 ημέρα", "answer": "Ναι, 3 άτομα", "going": true },
                { "name": "Γιώργος", "time": "πριν από 2 ημέρες", "answer": "Ναι, 1 άτομο", "going": true }
            ]
        },
        "with": {
            "pill": "ΜΕ STORYWALL",
            "caption": "Όλα οργανωμένα, εύκολα και ξεκάθαρα.",
            "dashboard": "ΠΙΝΑΚΑΣ ΔΙΟΡΓΑΝΩΤΗ",
            "couple": "Νεφέλη & Ορέστης",
            "module": "RSVP",
            "list": [
                { "name": "Νάντια Ευθυμίου", "party": "3 ενήλικες, 1 παιδί", "note": "Με μεγάλη χαρά, θα είμαστε εκεί!" },
                { "name": "Νεφέλη Αντωνίου", "party": "2 ενήλικες", "note": "Let's do this! 🤍" },
                { "name": "Ορέστης Παπαδάκης", "party": "2 ενήλικες", "note": "Πάμε να παντρευτούμε! 😎🥂" },
                { "name": "Στέλιος Ράπτης", "party": "3 ενήλικες, 2 παιδιά", "note": "Θα είμαστε εκεί και οι τέσσερις!" },
                { "name": "Αλέξανδρος Μάρκου", "party": "0 θέσεις", "note": "Δυστυχώς δεν θα μπορέσω να έρθω. Να περάσετε υπέροχα!" },
                { "name": "Μελίνα Δελή", "party": "0 θέσεις", "note": "Δεν θα μπορέσω δυστυχώς…" },
                { "name": "Παναγιώτης Καλαντζής", "party": "2 ενήλικες" }
            ],
            "form": {
                "title": "Το RSVP σας",
                "attend": "ΘΑ ΠΑΡΕΥΡΕΘΕΙΤΕ;",
                "required": "(ΥΠΟΧΡΕΩΤΙΚΟ)",
                "yes": "Ναι",
                "no": "Όχι",
                "companions": "ΣΥΝΟΔΟΙ",
                "adults": "0 ενήλικες",
                "children": "0 παιδιά",
                "message": "ΜΗΝΥΜΑ ΓΙΑ ΤΟΥΣ ΔΙΟΡΓΑΝΩΤΕΣ",
                "optional": "(ΠΡΟΑΙΡΕΤΙΚΟ)",
                "placeholder": "Προαιρετικό: μοιραστείτε τον ενθουσιασμό σας ή ένα ξεχωριστό σημείωμα...",
                "counter": "0/500",
                "submit": "Υποβολή RSVP"
            },
            "stats": {
                "active": "Ενεργό",
                "tabs": ["Στατιστικά", "Λίστα", "Αναφορές"],
                "deadline": "ΠΡΟΘΕΣΜΙΑ RSVP",
                "deadlineValue": "265 ημέρες απομένουν · 15 Ιουλίου 2027",
                "tiles": [
                    { "value": "21", "label": "ΑΠΑΝΤΗΣΕΙΣ" },
                    { "value": "64", "label": "ΣΥΝΟΛΟ ΑΤΟΜΩΝ" },
                    { "value": "47", "label": "ΕΝΗΛΙΚΕΣ" },
                    { "value": "17", "label": "ΠΑΙΔΙΑ" }
                ],
                "byCategory": "ΠΑΡΟΥΣΙΑ ΑΝΑ ΚΑΤΗΓΟΡΙΑ",
                "coming": "Θα έρθουν",
                "comingValue": "64 άτομα",
                "comingShare": "100%",
                "notComing": "Δεν θα έρθουν",
                "notComingValue": "4 απαντήσεις"
            }
        },
        "checklist": {
            "pill": "ΟΛΕΣ ΟΙ ΑΠΑΝΤΗΣΕΙΣ",
            "items": [
                { "title": "Όλες οι απαντήσεις σε ένα μέρος", "body": "Από Viber, Messenger, WhatsApp, email και SMS." },
                { "title": "Ποιοι έρχονται", "body": "Δες εύκολα ποιοι επιβεβαίωσαν τη συμμετοχή τους." },
                { "title": "Συνοδοί & παιδιά", "body": "Γνώρισε τον ακριβή αριθμό καλεσμένων." },
                { "title": "Απλή και γρήγορη διαδικασία", "body": "Οι καλεσμένοι απαντούν με ένα κλικ από την πρόσκληση." }
            ]
        }
    },
    "private": {
        "kicker": "ΜΟΝΟ ΓΙΑ ΚΑΛΕΣΜΕΝΟΥΣ",
        "heading": ["Ένα ιδιωτικό Social γεμάτο στιγμές.", "Για εσάς και τους ανθρώπους σας."],
        "intro": "Οι καλεσμένοι ανεβάζουν φωτογραφίες, γράφουν ευχές και σχολιάζουν. Όλα μένουν μεταξύ σας.",
        "cards": [
            { "title": "Ιδιωτικός τοίχος", "body": "Μπαίνουν μόνο όσοι έχουν το link του γάμου. Δεν είναι δημόσιος και δεν εμφανίζεται στο Google." },
            { "title": "Διαχείριση από εσένα", "body": "Βλέπεις ποιοι συμμετέχουν και τι ανεβαίνει, από ένα σημείο. Μπορείς να προσθέσεις και συνδιοργανωτή." },
            { "title": "Ρόλοι καλεσμένων", "body": "Νύφη, γαμπρός, κουμπάροι, οικογένεια: ο καθένας φαίνεται με τον ρόλο του." },
            { "title": "Λήψη σε αρχική ποιότητα", "body": "Κατεβάζεις όλες τις φωτογραφίες και τα βίντεο του γάμου, και το ευχολόγιο σε PDF." }
        ]
    },
    "demo": {
        "kicker": "DEMO",
        "heading": ["Δες ένα StoryWall", "γάμου."],
        "copy": "Δες το προσκλητήριο, τα posts, τα stories και τις φωτογραφίες<br></br>όπως θα τα βλέπουν <b>οι καλεσμένοι σου.</b>",
        "previewLabel": "Demo του StoryWall γάμου σε δύο κινητά",
        "feed": { "title": "Nicole & Samuel", "date": "28 ΦΕΒ 2028", "place": "Ρόδος", "author": "Emily R.", "time": "πριν 9 ημ." },
        "profile": {
            "name": "Nicole M.",
            "email": "nicole@example.com",
            "menu": ["Εκδηλώσεις", "Πλάνα", "Λειτουργίες"],
            "signOut": "Αποσύνδεση",
            "back": "Πίσω",
            "title": "Προφίλ",
            "panelName": "New Member",
            "nameLabel": "ΟΝΟΜΑ"
        }
    },
    "featuresHead": {
        "kicker": "ΔΥΝΑΤΟΤΗΤΕΣ",
        "heading": ["Η δική σου ιστοσελίδα γάμου,", "με όλα όσα χρειάζεσαι."]
    },
    "features": {
        "invitation": { "title": "Ηλεκτρονικό προσκλητήριο", "body": "Στέλνεις το προσκλητήριο με ένα link, με ημερομηνία, χώρους, πρόγραμμα και χάρτες." },
        "rsvp": { "title": "RSVP γάμου", "body": "Οι καλεσμένοι επιβεβαιώνουν την παρουσία τους και βλέπεις όλες τις απαντήσεις μαζί." },
        "gallery": { "title": "Φωτογραφίες καλεσμένων", "body": "Οι καλεσμένοι σκανάρουν ένα QR code και ανεβάζουν φωτογραφίες και βίντεο, χωρίς εγγραφή." },
        "posts": { "title": "Αναρτήσεις & αντιδράσεις", "body": "Φωτογραφίες, μηνύματα, σχόλια και αντιδράσεις στον ιδιωτικό τοίχο του γάμου." },
        "stories": { "title": "Stories γάμου", "body": "Αυθόρμητες στιγμές από τις προετοιμασίες, την τελετή και τη δεξίωση." },
        "playlist": { "title": "Μουσικές προτάσεις", "body": "Οι καλεσμένοι προτείνουν τα αγαπημένα τους τραγούδια για το γλέντι." },
        "schedule": { "title": "Πρόγραμμα γάμου", "body": "Ώρες και χώροι τελετής και δεξίωσης, για να ξέρουν όλοι πού και πότε." },
        "wishbook": { "title": "Ευχολόγιο", "body": "Οι ευχές των αγαπημένων σου σε ένα ψηφιακό βιβλίο αναμνήσεων." },
        "wishlist": { "title": "Λίστα δώρων / IBAN", "body": "Μοιράζεσαι διακριτικά τις πληροφορίες της λίστας δώρων." },
        "quiz_polls": { "title": "Κουίζ & ψηφοφορίες", "body": "Ένα κουίζ για εσάς τους δύο και ψηφοφορίες για τους καλεσμένους." }
    },
    "pricing": {
        "kicker": "ΠΑΚΕΤΑ",
        "heading": "Πακέτα για τον γάμο σου.",
        "intro": "Επίλεξε πακέτο και διάρκεια ανάλογα με τις ανάγκες σου."
    },
    "faqIntro": "Όσα ρωτούν τα ζευγάρια για το ηλεκτρονικό προσκλητήριο και την ιστοσελίδα γάμου.",
    "faq": [
        {
            "q": "Τι είναι η ιστοσελίδα γάμου StoryWall;",
            "a": "Το StoryWall είναι ένας ιδιωτικός social χώρος για τον γάμο σου. Συνδυάζει ηλεκτρονικό προσκλητήριο, RSVP, αναρτήσεις, stories, φωτογραφίες από τους καλεσμένους και ψηφιακό ευχολόγιο, ανάλογα με το πακέτο που επιλέγεις."
        },
        {
            "q": "Πώς λειτουργεί το ηλεκτρονικό προσκλητήριο γάμου;",
            "a": "Δημιουργείς το StoryWall του γάμου σου και στέλνεις το link στους καλεσμένους. Για να δουν το προσκλητήριο και τον τοίχο του γάμου κάνουν μια σύντομη εγγραφή. Για να ανεβάσουν φωτογραφίες μέσω QR code δεν χρειάζεται εγγραφή."
        },
        {
            "q": "Πώς μαζεύω τις φωτογραφίες των καλεσμένων;",
            "a": "Τοποθετείς το QR code στα τραπέζια της δεξίωσης. Οι καλεσμένοι το σκανάρουν και ανεβάζουν φωτογραφίες και βίντεο χωρίς εφαρμογή και χωρίς εγγραφή. Το υλικό συγκεντρώνεται σε ξεχωριστή συλλογή.",
            "link": { "to": "qr", "label": "Μάθε για το QR γάμου" }
        },
        {
            "q": "Χρειάζεται οι καλεσμένοι να κατεβάσουν εφαρμογή;",
            "a": "Όχι. Το StoryWall ανοίγει απευθείας από τον browser του κινητού, μέσω του link ή του QR code, χωρίς εγκατάσταση εφαρμογής."
        },
        {
            "q": "Πώς λειτουργεί το RSVP γάμου;",
            "a": "Οι καλεσμένοι επιβεβαιώνουν την παρουσία τους μέσα από το StoryWall και βλέπεις όλες τις απαντήσεις συγκεντρωμένες σε ένα σημείο."
        },
        {
            "q": "Ποιος μπορεί να δει τις φωτογραφίες και τις αναρτήσεις;",
            "a": "Το StoryWall είναι ιδιωτικό. Τον τοίχο του γάμου βλέπουν μόνο οι καλεσμένοι που έχουν εγγραφεί. Οι φωτογραφίες που ανεβαίνουν μέσω QR code συγκεντρώνονται σε ξεχωριστή συλλογή."
        },
        {
            "q": "Μπορώ να κατεβάσω όλες τις φωτογραφίες μετά τον γάμο;",
            "a": "Ναι. Κατεβάζεις τις φωτογραφίες και τα βίντεο που συγκεντρώθηκαν στο StoryWall στην αρχική τους ανάλυση."
        },
        {
            "q": "Για πόσο διάστημα παραμένει ενεργό το StoryWall;",
            "a": "Επιλέγεις διάρκεια 3 ή 6 μηνών. Η διάρκεια ξεκινά από την ημέρα αγοράς και μπορείς να την ανανεώσεις."
        },
        {
            "q": "Αντικαθιστά το StoryWall τον φωτογράφο γάμου;",
            "a": "Όχι. Ο φωτογράφος καταγράφει τις επίσημες στιγμές. Το StoryWall συγκεντρώνει τις αυθόρμητες στιγμές που απαθανατίζουν οι καλεσμένοι."
        },
        {
            "q": "Πόσο κοστίζει η ιστοσελίδα γάμου StoryWall;",
            "a": "{range, select, span {Τα πακέτα για γάμο ξεκινούν από {from} ({fromName}) και φτάνουν τα {to} ({toName}), ανάλογα με τον αριθμό των καλεσμένων και τις λειτουργίες που χρειάζεσαι.} single {Το πακέτο για γάμο κοστίζει {from} ({fromName}).} other {Η τιμή εξαρτάται από τον αριθμό των καλεσμένων και τις λειτουργίες που χρειάζεσαι.}}",
            "link": { "to": "pricing", "label": "Δες τα πακέτα" }
        },
        {
            "q": "Πώς στέλνω το ψηφιακό προσκλητήριο στους καλεσμένους;",
            "a": "Το προσκλητήριο είναι ένα link. Το στέλνεις όπου θέλεις: Viber, WhatsApp, Messenger, email ή SMS."
        },
        {
            "q": "Ηλεκτρονικό ή έντυπο προσκλητήριο γάμου;",
            "a": "Και τα δύο ταιριάζουν μαζί. Πολλά ζευγάρια κρατούν έντυπα προσκλητήρια για γονείς, κουμπάρους και στενούς συγγενείς, και στέλνουν το ηλεκτρονικό σε όλους τους καλεσμένους για RSVP, χάρτες και πρόγραμμα."
        },
        {
            "q": "Μπορώ να αλλάξω στοιχεία μετά την αποστολή;",
            "a": "Ναι. Οι πληροφορίες ενημερώνονται σε πραγματικό χρόνο, οπότε οι καλεσμένοι βλέπουν πάντα την τελευταία έκδοση του προσκλητηρίου."
        },
        {
            "q": "Λειτουργεί για γάμους στην Κύπρο;",
            "a": "Ναι. Το StoryWall λειτουργεί online, οπότε το χρησιμοποιείς για γάμο σε Ελλάδα ή Κύπρο με τον ίδιο τρόπο. Οι τιμές είναι σε ευρώ."
        }
    ],
    "finalCta": {
        "eyebrow": "Ο ΓΑΜΟΣ ΣΟΥ ΣΤΟ STORYWALL",
        "copyStart": "Φτιάξε το δικό σου StoryWall με ηλεκτρονικό προσκλητήριο, φωτογραφίες και αναμνήσεις",
        "copyStrong": "που θα μοιραστείς με τους αγαπημένους σου.",
        "cta": "Φτιάξε το <b>StoryWall</b> σου"
    }
}
```

- [ ] **Step 5: Write the English patch**

`$SP/copy/wedding-en.json` (same keys and array lengths as Greek; the owner reviews the English in the PR):

```json
{
    "meta": {
        "title": "Wedding Website & Digital Invitation | StoryWall",
        "description": "A wedding website with your digital invitation, RSVPs, schedule, maps and guest photos. No app for guests to install.{range, select, none {} other { From {from}.}}"
    },
    "hero": {
        "breadcrumb": "Weddings",
        "kicker": "THE SOCIAL FOR <b>YOUR WEDDING</b>",
        "h1": "Digital wedding invitation & <em>wedding website</em>",
        "subtitle": "A wedding full of moments worth keeping.",
        "body": "Make your own wedding website with a digital invitation, RSVPs, a schedule and maps. On the day, guests upload their photos, and everything stays in your own private StoryWall.",
        "trust": ["No app", "Private", "One link"],
        "trustPrice": "From {from}",
        "feed": {
            "title": "James & Olivia",
            "date": "DEC 30, 2026",
            "place": "Rhodes",
            "posts": [
                {
                    "author": "Emily R.",
                    "time": "2h ago",
                    "caption": "The most beautiful beginning. 🤍",
                    "likes": 56,
                    "comments": 8,
                    "replies": [
                        { "author": "Sofia L.", "text": "Gorgeous! 💕" },
                        { "author": "Nikos P.", "text": "Let's go! 👰🏼✨" }
                    ]
                },
                {
                    "author": "Maria K.",
                    "time": "4h ago",
                    "caption": "A moment just for the two of them.",
                    "likes": 42,
                    "comments": 6,
                    "replies": [
                        { "author": "Eleni T.", "text": "So moving... ❤️" },
                        { "author": "Anna M.", "text": "Beautiful! 🌸" }
                    ]
                },
                {
                    "author": "Nikos P.",
                    "time": "6h ago",
                    "caption": "The groom squad is ready! 🙌",
                    "likes": 38,
                    "comments": 5,
                    "replies": [
                        { "author": "Alex G.", "text": "Looking sharp! 👌" },
                        { "author": "Petros D.", "text": "Good luck, mate! 💪" }
                    ]
                },
                {
                    "author": "Sofia L.",
                    "time": "8h ago",
                    "caption": "All roads lead here.",
                    "likes": 64,
                    "comments": 7,
                    "replies": [
                        { "author": "Maria S.", "text": "What a venue! ❤️" },
                        { "author": "Kostas V.", "text": "Can't wait! 🙌" }
                    ]
                },
                {
                    "author": "Eleni A.",
                    "time": "11h ago",
                    "caption": "And just like that... forever. 🤍",
                    "likes": 78,
                    "comments": 12,
                    "replies": [
                        { "author": "Maria K.", "text": "So touching! 💕" },
                        { "author": "Nikos P.", "text": "Congratulations! 🙏✨" }
                    ]
                },
                {
                    "author": "Alex T.",
                    "time": "12h ago",
                    "caption": "Just married! 🎉",
                    "likes": 92,
                    "comments": 14,
                    "replies": [
                        { "author": "Sofia L.", "text": "Perfect moment! 😍" },
                        { "author": "Petros D.", "text": "Happy forever! 🤍" }
                    ]
                },
                {
                    "author": "Chloe B.",
                    "time": "13h ago",
                    "caption": "Golden hour, good food, our favourite people.",
                    "likes": 64,
                    "comments": 8,
                    "replies": [
                        { "author": "Eleni T.", "text": "Beautiful shots! 🌅" },
                        { "author": "Anna M.", "text": "Dreamy! 🤍" }
                    ]
                },
                {
                    "author": "Giorgos N.",
                    "time": "14h ago",
                    "caption": "Their first song. ✨",
                    "likes": 57,
                    "comments": 6,
                    "replies": [
                        { "author": "Sofia L.", "text": "Magical! ✨" },
                        { "author": "James K.", "text": "One of the most beautiful moments! 🤍" }
                    ]
                },
                {
                    "author": "Isabella C.",
                    "time": "15h ago",
                    "caption": "We're not leaving the dance floor! 🔥",
                    "likes": 86,
                    "comments": 11,
                    "replies": [
                        { "author": "Maria S.", "text": "What a night! 🔥" },
                        { "author": "Chris T.", "text": "Everything was perfect! 🙌" }
                    ]
                }
            ],
            "music": {
                "labels": ["DATE", "MONTH", "TIME"],
                "values": ["26", "08", "4:40 PM"],
                "kicker": "PLAYLIST UPDATE",
                "title": "Playlist update",
                "time": "10h ago",
                "cta": "Open playlist"
            }
        }
    },
    "mock": {
        "units": ["D", "H", "M", "S"],
        "stories": { "own": "Your story", "schedule": "Schedule", "guests": "Guests", "moments": "Moments", "venue": "Venue" },
        "scheduleBadge": ["DEC", "30"],
        "composer": "Share a memory, message, or moment..."
    },
    "how": {
        "kicker": "HOW IT WORKS",
        "heading": ["Three steps.", "One wedding story."],
        "steps": [
            { "title": "Create", "body": "Pick a plan and build your wedding website with the date, venues and schedule, <b>in a few minutes.</b>" },
            { "title": "Share", "body": "Send the <b>digital invitation</b> with one link, and the <b>QR code</b> for collecting photos. <b>No app.</b>" },
            { "title": "The story begins", "body": "Guests confirm they are coming, share posts and stories and <b>upload photos from the wedding.</b>" }
        ]
    },
    "why": {
        "kicker": "WHY STORYWALL",
        "heading": ["Your wedding photos", "should not get lost on 100 phones."],
        "without": {
            "label": "WITHOUT STORYWALL",
            "bubbles": ["Send them to me too! 🙏", "Who has the video?"],
            "items": ["“Send me the photos too!”", "Photos on 100 different phones", "Wishes lost in WhatsApp and Messenger", "Public posts anyone can see"]
        },
        "with": {
            "label": "WITH STORYWALL · ALL IN ONE PLACE",
            "subtitle": "From the preparations and the wedding day to the honeymoon.",
            "qrAlt": "A guest scans the StoryWall QR code on a wedding table",
            "steps": [
                { "title": "Scan", "body": "The QR on the table, with the phone camera." },
                { "title": "Upload", "body": "Photos and videos. <b>No app.</b>" },
                { "title": "All together", "body": "In your StoryWall, <b>in original quality.</b>" }
            ],
            "photoAlt": "{moment}, a photo by {name}, {role}",
            "marquee": [
                { "name": "Ioanna", "role": "bride's friend", "moment": "Dress preparations" },
                { "name": "Maria", "role": "bride's friend", "moment": "Night out" },
                { "name": "Kostas", "role": "groom's friend", "moment": "A toast at the taverna" },
                { "name": "Sofia", "role": "bride's friend", "moment": "Dancing at the party" },
                { "name": "Petros", "role": "groom's friend", "moment": "The groom's crew" },
                { "name": "Eleni", "role": "bride's mother", "moment": "Getting the bride ready" },
                { "name": "Anna", "role": "bride's friend", "moment": "Guests at the church" },
                { "name": "Giorgos", "role": "best man", "moment": "The newlyweds arrive" },
                { "name": "Ioanna", "role": "maid of honour", "moment": "A tender moment for the newlyweds" },
                { "name": "Nikos", "role": "groom's friend", "moment": "First dance" },
                { "name": "Katerina", "role": "cousin", "moment": "Dancing at the reception" },
                { "name": "Nefeli", "role": "bride", "moment": "The bride's morning" },
                { "name": "Nefeli", "role": "bride", "moment": "Trip to Paris" },
                { "name": "Orestis", "role": "groom", "moment": "Arriving in Paris" }
            ],
            "example": "EXAMPLE · ONE WEDDING ON STORYWALL",
            "stats": [
                { "value": "248", "label": "PHOTOS" },
                { "value": "36", "label": "VIDEOS" },
                { "value": "64", "label": "WISHES" },
                { "value": "86", "label": "GUESTS" }
            ],
            "chips": ["Every photo in one place", "Uploaded with one QR, no app", "A guestbook you download as a PDF", "Private, for your guests only"]
        }
    },
    "rsvp": {
        "heading": ["Stop wondering who is coming.", "Every answer in one place."],
        "intro": "With StoryWall, your guests reply easily and you stay in full control, from the invitation to the guest list.",
        "label": "Without StoryWall, replies arrive scattered across WhatsApp, Messenger, Viber, email and text. With StoryWall everything is organised: an RSVP form, a guest list and stats.",
        "without": {
            "pill": "WITHOUT STORYWALL",
            "caption": "Replies come in from everywhere…",
            "replies": [
                { "name": "Katerina", "time": "2 hours ago", "answer": "Yes, 2 people", "going": true },
                { "name": "Petros", "time": "4 hours ago", "answer": "No", "going": false },
                { "name": "Maria", "time": "1 day ago", "answer": "Yes", "going": true },
                { "name": "Theodora", "time": "1 day ago", "answer": "Yes, 3 people", "going": true },
                { "name": "Giorgos", "time": "2 days ago", "answer": "Yes, 1 person", "going": true }
            ]
        },
        "with": {
            "pill": "WITH STORYWALL",
            "caption": "Organised, simple and clear.",
            "dashboard": "HOST DASHBOARD",
            "couple": "Nefeli & Orestis",
            "module": "RSVP",
            "list": [
                { "name": "Nadia Efthymiou", "party": "3 adults, 1 child", "note": "So happy, we'll be there!" },
                { "name": "Nefeli Antoniou", "party": "2 adults", "note": "Let's do this! 🤍" },
                { "name": "Orestis Papadakis", "party": "2 adults", "note": "Let's get married! 😎🥂" },
                { "name": "Stelios Raptis", "party": "3 adults, 2 children", "note": "All four of us will be there!" },
                { "name": "Alexandros Markou", "party": "0 seats", "note": "Sadly I can't make it. Have a wonderful day!" },
                { "name": "Melina Deli", "party": "0 seats", "note": "I won't be able to make it, sadly…" },
                { "name": "Panagiotis Kalantzis", "party": "2 adults" }
            ],
            "form": {
                "title": "Your RSVP",
                "attend": "WILL YOU ATTEND?",
                "required": "(REQUIRED)",
                "yes": "Yes",
                "no": "No",
                "companions": "COMPANIONS",
                "adults": "0 adults",
                "children": "0 children",
                "message": "MESSAGE FOR THE HOSTS",
                "optional": "(OPTIONAL)",
                "placeholder": "Optional: share your excitement or a special note...",
                "counter": "0/500",
                "submit": "Submit RSVP"
            },
            "stats": {
                "active": "Active",
                "tabs": ["Stats", "List", "Reports"],
                "deadline": "RSVP DEADLINE",
                "deadlineValue": "265 days left · July 15, 2027",
                "tiles": [
                    { "value": "21", "label": "RESPONSES" },
                    { "value": "64", "label": "TOTAL PEOPLE" },
                    { "value": "47", "label": "ADULTS" },
                    { "value": "17", "label": "CHILDREN" }
                ],
                "byCategory": "ATTENDANCE BY CATEGORY",
                "coming": "Coming",
                "comingValue": "64 people",
                "comingShare": "100%",
                "notComing": "Not coming",
                "notComingValue": "4 responses"
            }
        },
        "checklist": {
            "pill": "ALL ANSWERS",
            "items": [
                { "title": "Every answer in one place", "body": "From WhatsApp, Messenger, Viber, email and text." },
                { "title": "Who is coming", "body": "See at a glance who confirmed." },
                { "title": "Plus-ones & children", "body": "Know the exact number of guests." },
                { "title": "Quick and simple", "body": "Guests reply in one click from the invitation." }
            ]
        }
    },
    "private": {
        "kicker": "FOR GUESTS ONLY",
        "heading": ["A private social full of moments.", "For you and your people."],
        "intro": "Guests upload photos, write wishes and comment. It all stays between you.",
        "cards": [
            { "title": "Private wall", "body": "Only people with your wedding link can get in. It is not public and does not show up on Google." },
            { "title": "You manage it", "body": "See who joins and what gets posted, all in one place. You can add a co-host too." },
            { "title": "Guest roles", "body": "Bride, groom, wedding party, family: everyone shows up with their role." },
            { "title": "Download in original quality", "body": "Download every photo and video from the wedding, and the guestbook as a PDF." }
        ]
    },
    "demo": {
        "kicker": "DEMO",
        "heading": ["See a wedding", "StoryWall."],
        "copy": "See the invitation, posts, stories and photos<br></br>the way <b>your guests will see them.</b>",
        "previewLabel": "Wedding StoryWall demo on two phones",
        "feed": { "title": "Nicole & Samuel", "date": "FEB 28, 2028", "place": "Rhodes", "author": "Emily R.", "time": "9d ago" },
        "profile": {
            "name": "Nicole M.",
            "email": "nicole@example.com",
            "menu": ["Events", "Plans", "Features"],
            "signOut": "Sign out",
            "back": "Back",
            "title": "Profile",
            "panelName": "New Member",
            "nameLabel": "NAME"
        }
    },
    "featuresHead": {
        "kicker": "FEATURES",
        "heading": ["Your own wedding website,", "with everything you need."]
    },
    "features": {
        "invitation": { "title": "Digital invitation", "body": "Send the invitation with one link, with the date, venues, schedule and maps." },
        "rsvp": { "title": "Wedding RSVP", "body": "Guests confirm they are coming and you see every answer together." },
        "gallery": { "title": "Guest photos", "body": "Guests scan a QR code and upload photos and videos, with no sign-up." },
        "posts": { "title": "Posts & reactions", "body": "Photos, messages, comments and reactions on your private wedding wall." },
        "stories": { "title": "Wedding stories", "body": "Candid moments from the preparations, the ceremony and the reception." },
        "playlist": { "title": "Song requests", "body": "Guests suggest their favourite songs for the party." },
        "schedule": { "title": "Wedding schedule", "body": "Ceremony and reception times and venues, so everyone knows where and when." },
        "wishbook": { "title": "Guestbook", "body": "Wishes from the people you love, in one digital keepsake book." },
        "wishlist": { "title": "Gift list / bank details", "body": "Share your gift list details discreetly." },
        "quiz_polls": { "title": "Quiz & polls", "body": "A quiz about the two of you and polls for your guests." }
    },
    "pricing": {
        "kicker": "PLANS",
        "heading": "Plans for your wedding.",
        "intro": "Choose a plan and a duration that fit your needs."
    },
    "faqIntro": "What couples ask about digital wedding invitations and wedding websites.",
    "faq": [
        {
            "q": "What is a StoryWall wedding website?",
            "a": "StoryWall is a private social space for your wedding. It brings together a digital invitation, RSVPs, posts, stories, photos from your guests and a digital guestbook, depending on the plan you choose."
        },
        {
            "q": "How does the digital wedding invitation work?",
            "a": "You create your wedding StoryWall and send the link to your guests. They sign up quickly to see the invitation and the wedding wall. Uploading photos through the QR code needs no sign-up."
        },
        {
            "q": "How do I collect my guests' photos?",
            "a": "Put the QR code on the reception tables. Guests scan it and upload photos and videos with no app and no sign-up. Everything gathers in a separate collection.",
            "link": { "to": "qr", "label": "About wedding QR codes" }
        },
        {
            "q": "Do guests need to download an app?",
            "a": "No. StoryWall opens straight in the phone's browser, from the link or the QR code, with nothing to install."
        },
        {
            "q": "How does the wedding RSVP work?",
            "a": "Guests confirm through StoryWall, and you see every answer together in one place."
        },
        {
            "q": "Who can see the photos and posts?",
            "a": "StoryWall is private. Only guests who have signed up see the wedding wall. Photos uploaded through the QR code gather in a separate collection."
        },
        {
            "q": "Can I download all the photos after the wedding?",
            "a": "Yes. You download the photos and videos gathered on StoryWall in their original resolution."
        },
        {
            "q": "How long does StoryWall stay active?",
            "a": "You choose 3 or 6 months. It starts on the day you buy it, and you can renew it."
        },
        {
            "q": "Does StoryWall replace the wedding photographer?",
            "a": "No. Your photographer captures the official moments. StoryWall gathers the candid moments your guests capture."
        },
        {
            "q": "How much does a StoryWall wedding website cost?",
            "a": "{range, select, span {Wedding plans start at {from} ({fromName}) and go up to {to} ({toName}), depending on the number of guests and the features you need.} single {The wedding plan costs {from} ({fromName}).} other {The price depends on the number of guests and the features you need.}}",
            "link": { "to": "pricing", "label": "See the plans" }
        },
        {
            "q": "How do I send the digital invitation to my guests?",
            "a": "The invitation is a link. Send it wherever you like: WhatsApp, Messenger, Viber, email or text message."
        },
        {
            "q": "Digital or printed wedding invitation?",
            "a": "They work well together. Many couples keep printed invitations for parents, the wedding party and close family, and send the digital one to every guest for RSVPs, maps and the schedule."
        },
        {
            "q": "Can I change details after sending it?",
            "a": "Yes. Changes show up right away, so guests always see the latest version of the invitation."
        },
        {
            "q": "Does it work for weddings outside Greece?",
            "a": "Yes. StoryWall works online, so you use it the same way for a wedding anywhere. Prices are in euros."
        }
    ],
    "finalCta": {
        "eyebrow": "YOUR WEDDING ON STORYWALL",
        "copyStart": "Create your own StoryWall with a digital invitation, photos and memories",
        "copyStrong": "to share with the people you love.",
        "cta": "Create your <b>StoryWall</b>"
    }
}
```

Apostrophes: next-intl formats `faq.*.a`, `features.*`, `hero.*`, `how.*` and `why.with.steps.*` through ICU, where a `'` right before `{`, `}` or `<` starts an escape. None of the strings above has one there; keep it that way when editing ("they are", not "they're", in formatted strings).

`$SP/copy/common-el.json`:

```json
{ "breadcrumbLabel": "Διαδρομή" }
```

`$SP/copy/common-en.json`:

```json
{ "breadcrumbLabel": "Breadcrumb" }
```

- [ ] **Step 6: Apply the patches**

```bash
node "$SP/scripts/edit-occasion-copy.cjs" messages/el.json WEDDING "$SP/copy/wedding-el.json"
node "$SP/scripts/edit-occasion-copy.cjs" messages/en.json WEDDING "$SP/copy/wedding-en.json"
node "$SP/scripts/edit-occasion-copy.cjs" messages/el.json common "$SP/copy/common-el.json"
node "$SP/scripts/edit-occasion-copy.cjs" messages/en.json common "$SP/copy/common-en.json"
npx prettier --write messages/el.json messages/en.json
git diff --stat messages
```

Expected: four `updated` lines; the diff touches only `messages/el.json` and `messages/en.json`. Skim `git diff messages/el.json`: every hunk sits inside `OccasionPages.common` or `OccasionPages.WEDDING`.

- [ ] **Step 7: The old hero reads an h1 with `<em>`**

In `components/occasions/OccasionHero.tsx` (still used by baptism, and by the wedding page until Task 19), replace `h1={t('h1')}` with:

```tsx
            // The wedding h1 marks its gradient words with <em>; this hero shows plain text.
            h1={t.markup('h1', { em: (chunks) => chunks })}
```

- [ ] **Step 8: Run the copy tests**

Run: `npx vitest run lib/occasions`
Expected: PASS, including `occasionCopy.test.ts` (same keys in both languages, feature keys known, title ≤ 60) and `occasionFaq.test.ts` (every FAQ answer formats with no prices).

- [ ] **Step 9: Commit**

```bash
git add messages/el.json messages/en.json components/occasions/OccasionHero.tsx lib/occasions/weddingCopy.test.ts
git commit -m "feat(occasions): wedding landing copy in Greek and English"
```

---

### Task 11: Mock primitives, comment cards and a test helper for real copy

Every drawn screen and card is a server component sized in `cqw` (container widths), so it scales like a picture. Icons inside a mock that is `aria-hidden` need no `aria-hidden` of their own.

**Files:**
- Create: `components/occasions/wedding/__fixtures__/intlServerMock.ts`
- Create: `components/occasions/wedding/mock/MockPhoto.tsx`
- Create: `components/occasions/wedding/mock/MockPhone.tsx`
- Create: `components/occasions/wedding/mock/MockStatusBar.tsx`
- Create: `components/occasions/wedding/mock/MockTabBar.tsx`
- Create: `components/occasions/wedding/mock/GradientIcon.tsx`
- Create: `components/occasions/OccasionCommentCard.tsx`
- Test: `components/occasions/wedding/mock/mocks.test.tsx`

- [ ] **Step 1: Write the test helper**

Wedding section tests render the real Greek copy, so a wrong key or a broken ICU string fails a test. `components/occasions/wedding/__fixtures__/intlServerMock.ts`:

```ts
import { createTranslator, type Messages } from 'next-intl';

import el from '@/messages/el.json';
import en from '@/messages/en.json';

const MESSAGES: Record<string, Messages> = { el, en };

// next-intl/server's getTranslations over the real messages, so a server component test reads the
// page's own copy. A call without a locale reads Greek. In a test file:
// vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
export async function getTranslations(options: string | { locale?: string; namespace?: string }) {
    const { locale = 'el', namespace } = typeof options === 'string' ? { namespace: options } : options;
    return createTranslator({ locale, messages: MESSAGES[locale]!, namespace });
}
```

- [ ] **Step 2: Write the failing test**

`components/occasions/wedding/mock/mocks.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OccasionCommentCard } from '@/components/occasions/OccasionCommentCard';
import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { MockPhone } from '@/components/occasions/wedding/mock/MockPhone';
import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import { MockTabBar } from '@/components/occasions/wedding/mock/MockTabBar';

const FACE = { src: '/landing/wedding/wedding-guest-woman-sun-hat.webp', width: 320, height: 320, position: '50% 20%' };

afterEach(cleanup);

describe('wedding mocks', () => {
    it('draws a decorative photo, cropped where the map says, after the page text', () => {
        const { container } = render(<MockPhoto className="size-10" photo={FACE} sizes="40px" />);
        const image = container.querySelector('img')!;
        expect(image).toHaveAttribute('alt', '');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('fetchpriority', 'low');
        expect(image.style.objectPosition).toBe('50% 20%');
    });

    it('puts the screen in a container, so what it holds scales with the phone', () => {
        render(
            <MockPhone className="w-40">
                <p>screen</p>
            </MockPhone>,
        );
        expect(screen.getByText('screen').parentElement).toHaveClass('[container-type:inline-size]', 'aspect-[9/19.5]');
    });

    it('fills an icon mask with the brand gradient', () => {
        const { container } = render(<GradientIcon className="size-14" src="/landing/wedding/icons/roles.webp" />);
        expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--icon')).toBe("url('/landing/wedding/icons/roles.webp')");
    });

    it('draws six tabs with the first one current', () => {
        const { container } = render(<MockTabBar />);
        const icons = container.querySelectorAll('svg');
        expect(icons).toHaveLength(6);
        expect(icons[0]).toHaveClass('text-[#ff765f]');
    });

    it('draws each comment card with its own faces', () => {
        const { container: heart } = render(<OccasionCommentCard faces={[FACE, FACE]} variant="heart" />);
        expect(heart.querySelectorAll('img')).toHaveLength(2);
        expect(heart.firstElementChild).toHaveClass('aspect-[705/360]');
        const { container: avatar } = render(<OccasionCommentCard faces={[FACE]} variant="avatar" />);
        expect(avatar.querySelectorAll('img')).toHaveLength(1);
        expect(avatar.firstElementChild).toHaveClass('aspect-[557/300]');
    });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/mock/mocks.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/OccasionCommentCard"`.

- [ ] **Step 4: MockPhoto**

`components/occasions/wedding/mock/MockPhoto.tsx`:

```tsx
import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

type MockPhotoProps = {
    className?: string;
    // The hero feed loads its photos at once, so none pops in while the feed scrolls.
    loading?: 'eager' | 'lazy';
    photo: OccasionPhoto;
    sizes: string;
};

// A photo inside a drawn screen or card: decorative, cropped to its frame, fetched after the page text.
export function MockPhoto({ className, loading = 'lazy', photo, sizes }: MockPhotoProps) {
    return (
        <ProtectedImage
            alt=""
            className={cn('object-cover', className)}
            fetchPriority="low"
            height={photo.height}
            loading={loading}
            sizes={sizes}
            src={photo.src}
            style={photo.position ? { objectPosition: photo.position } : undefined}
            width={photo.width}
        />
    );
}
```

- [ ] **Step 5: MockPhone**

`components/occasions/wedding/mock/MockPhone.tsx`:

```tsx
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type MockPhoneProps = {
    children: ReactNode;
    // The phone's width, place and tilt.
    className?: string;
};

// A phone drawn in Tailwind: gold bezel, dark rim, white screen. className places the phone and must
// give it a width. The root is a container, so the bezel is sized from the phone's own width (a %
// padding would follow the parent's); the screen is one too, so what it holds sizes itself in cqw
// and scales with the phone.
export function MockPhone({ children, className }: MockPhoneProps) {
    return (
        <div className={cn('[container-type:inline-size]', className)}>
            <div className="rounded-[14%/6.6%] bg-[linear-gradient(145deg,#f3dfc0_0%,#c9a47a_38%,#8f6a45_62%,#e8cfa6_100%)] p-[2.4cqw] shadow-[0_30px_50px_-24px_rgba(70,38,24,0.45)]">
                <div className="rounded-[12.5%/5.9%] bg-[#1d1a18] p-[1.6cqw]">
                    <div className="relative aspect-[9/19.5] overflow-hidden rounded-[11%/5.2%] bg-white text-[#151313] [container-type:inline-size]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 6: MockStatusBar and MockTabBar**

`components/occasions/wedding/mock/MockStatusBar.tsx`:

```tsx
import { BatteryFull, Signal, Wifi } from 'lucide-react';

// The top of a drawn phone screen. The clock is part of the picture, the same in every language.
export function MockStatusBar() {
    return (
        <div className="flex items-center justify-between px-[7cqw] pt-[3.4cqw] pb-[1.6cqw] text-[3.6cqw] leading-none font-semibold">
            <span>17:59</span>
            <span className="flex items-center gap-[1.2cqw]">
                <Signal className="size-[3.8cqw]" strokeWidth={2.4} />
                <Wifi className="size-[3.8cqw]" strokeWidth={2.4} />
                <BatteryFull className="size-[4.8cqw]" strokeWidth={2} />
            </span>
        </div>
    );
}
```

`components/occasions/wedding/mock/MockTabBar.tsx`:

```tsx
import { House, Mail, Menu, Music, Settings, Share2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
    { name: 'home', Icon: House },
    { name: 'music', Icon: Music },
    { name: 'mail', Icon: Mail },
    { name: 'share', Icon: Share2 },
    { name: 'settings', Icon: Settings },
    { name: 'menu', Icon: Menu },
] as const;

// The app's bottom bar on a drawn screen; home is the current tab.
export function MockTabBar() {
    return (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-[#151313]/8 bg-white px-[3cqw] pt-[3cqw] pb-[5.5cqw]">
            {TABS.map(({ name, Icon }, index) => (
                <Icon className={cn('size-[5.8cqw]', index === 0 ? 'text-[#ff765f]' : 'text-[#151313]/45')} key={name} strokeWidth={1.8} />
            ))}
        </div>
    );
}
```

- [ ] **Step 7: GradientIcon**

`components/occasions/wedding/mock/GradientIcon.tsx` (same mask classes as `OccasionFeatures`):

```tsx
import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

// An icon mask filled with the brand gradient, as on the design's private and feature cards.
export function GradientIcon({ className, src }: { className?: string; src: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'block shrink-0 bg-[linear-gradient(135deg,#f89ab0_0%,#f6a18f_34%,#f4b37b_68%,#f3cf8a_100%)] [mask-image:var(--icon)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-image:var(--icon)] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]',
                className,
            )}
            style={{ '--icon': `url('${src}')` } as CSSProperties}
        />
    );
}
```

The design gives these icons a soft `drop-shadow(0 4px 8px rgba(230,126,105,.14))`. A filter on a masked element is masked away with it, so the card that holds the icon wraps it in a span with `drop-shadow-[0_4px_8px_rgba(230,126,105,0.14)]` (Tasks 16 and 17).

- [ ] **Step 8: OccasionCommentCard**

`components/occasions/OccasionCommentCard.tsx` (next to `OccasionPostCard`, drawn the same way):

```tsx
import { Heart } from 'lucide-react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

// The two comment cutouts beside the landing's hero phone, drawn in code. The root keeps the
// cutout's shape, so it drops into the cutout's place; the card inside is tilted like the cutout.
const SHAPE = {
    // Wide: a gradient heart, two lines, up to two faces.
    heart: { root: 'aspect-[705/360]', card: 'top-[14%] left-[7%] w-[86%] rotate-8' },
    // Small: a face, two lines, an outline heart.
    avatar: { root: 'aspect-[557/300]', card: 'top-[16%] left-[6%] w-[87%] -rotate-8' },
} as const;

type OccasionCommentCardProps = { faces: readonly OccasionPhoto[]; variant: keyof typeof SHAPE };

function Face({ className, photo }: { className: string; photo: OccasionPhoto }) {
    return (
        <ProtectedImage
            alt=""
            className={cn('rounded-full border-[0.9cqw] border-[#fbf9f6] object-cover', className)}
            height={photo.height}
            sizes="48px"
            src={photo.src}
            style={photo.position ? { objectPosition: photo.position } : undefined}
            width={photo.width}
        />
    );
}

// The brand gradient heart. The page draws one heart card, so the gradient id is fixed.
function GradientHeart() {
    return (
        <svg className="size-[13cqw] shrink-0" viewBox="0 0 24 24">
            <defs>
                <linearGradient id="occasion-comment-heart" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ff6f93" />
                    <stop offset="55%" stopColor="#ff936a" />
                    <stop offset="100%" stopColor="#ffd05b" />
                </linearGradient>
            </defs>
            <path
                d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z"
                fill="url(#occasion-comment-heart)"
            />
        </svg>
    );
}

// A tilted comment card beside the hero phone.
export function OccasionCommentCard({ faces, variant }: OccasionCommentCardProps) {
    const shape = SHAPE[variant];
    return (
        <div className={cn('relative [container-type:inline-size]', shape.root)}>
            <div
                className={cn(
                    'absolute flex items-center gap-[4cqw] rounded-[6cqw] bg-[#fbf9f6] px-[6cqw] py-[5cqw] shadow-[0_24px_40px_-18px_rgba(70,38,24,0.35)]',
                    shape.card,
                )}
            >
                {/* Reaction or author */}
                {variant === 'heart' ? <GradientHeart /> : <Face className="size-[13cqw] shrink-0" photo={faces[0]!} />}
                {/* Comment lines */}
                <span className="flex min-w-0 flex-1 flex-col gap-[2.6cqw]">
                    <span className="block h-[2.8cqw] w-full rounded-full bg-[#151313]/12" />
                    <span className="block h-[2.8cqw] w-[64%] rounded-full bg-[#151313]/10" />
                </span>
                {/* Faces or like */}
                {variant === 'heart' ? (
                    <span className="flex shrink-0 -space-x-[4cqw]">
                        {faces.map((face, index) => (
                            <Face className="size-[12cqw]" key={`${face.src}-${index}`} photo={face} />
                        ))}
                    </span>
                ) : (
                    <Heart className="size-[9cqw] shrink-0 text-[#ff5a7a]" strokeWidth={2} />
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 9: Run the test**

Run: `npx vitest run components/occasions/wedding/mock/mocks.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 10: Lint and commit**

```bash
npx eslint components/occasions/wedding/__fixtures__ components/occasions/wedding/mock components/occasions/OccasionCommentCard.tsx
git add components/occasions/wedding/__fixtures__/intlServerMock.ts components/occasions/wedding/mock components/occasions/OccasionCommentCard.tsx
git commit -m "feat(occasions): drawn phone, photo, icon and comment card parts"
```

---

### Task 12: The hero phone feed

The feed copies the design's screenshot (crop: `$SP/crops/feed1-top.png`, `feed2.png`, `feed2-music.png`): logo and countdown, cover with the couple's names and three round buttons, date and place, stories, composer, nine posts with the playlist card between posts 6 and 7. Sizes are in `cqw` of the feed's width (the design's crop is 451 px wide, so 1 cqw ≈ 4.5 px there).

**Files:**
- Create: `components/occasions/wedding/feed/FeedAppBar.tsx`
- Create: `components/occasions/wedding/feed/FeedCover.tsx`
- Create: `components/occasions/wedding/feed/FeedStories.tsx`
- Create: `components/occasions/wedding/feed/FeedComposer.tsx`
- Create: `components/occasions/wedding/feed/FeedPost.tsx`
- Create: `components/occasions/wedding/feed/FeedMusicCard.tsx`
- Create: `components/occasions/wedding/feed/WeddingPhoneFeed.tsx`
- Test: `components/occasions/wedding/feed/WeddingPhoneFeed.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/occasions/wedding/feed/WeddingPhoneFeed.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, type Messages } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { WeddingPhoneFeed } from '@/components/occasions/wedding/feed/WeddingPhoneFeed';
import type { WeddingHeroFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_HERO_MEDIA } from '@/lib/occasions/weddingMedia';
import el from '@/messages/el.json';

const t = createTranslator({ locale: 'el', messages: el as Messages, namespace: 'OccasionPages.WEDDING' });
const copy = t.raw('hero.feed') as WeddingHeroFeedCopy;
const mock = t.raw('mock') as WeddingMockCopy;

function renderFeed() {
    return render(<WeddingPhoneFeed copy={copy} media={WEDDING_HERO_MEDIA} mock={mock} />);
}

afterEach(cleanup);

describe('WeddingPhoneFeed', () => {
    it('draws the cover, the countdown and every post from the copy', () => {
        renderFeed();
        expect(screen.getByText('James & Olivia')).toBeInTheDocument();
        expect(screen.getByText('116')).toBeInTheDocument();
        expect(screen.getByText('Λ')).toBeInTheDocument();
        expect(screen.getByText('Η ιστορία σας')).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(9);
        for (const post of copy.posts) expect(screen.getByText(post.caption)).toBeInTheDocument();
    });

    it('puts the playlist card between posts 6 and 7', () => {
        renderFeed();
        const music = screen.getByText(copy.music.title);
        const [sixth, seventh] = screen.getAllByRole('article').slice(5, 7);
        expect(sixth!.compareDocumentPosition(music) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(seventh!.compareDocumentPosition(music) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('shows two photos side by side on a two-photo post', () => {
        renderFeed();
        const second = screen.getAllByRole('article')[1]!;
        expect(second.querySelectorAll('img[class*="aspect-[3/4]"]')).toHaveLength(2);
    });

    it('loads every photo at once, after the page text', () => {
        const { container } = renderFeed();
        const photos = [...container.querySelectorAll('img')].filter((image) => !image.getAttribute('src')?.endsWith('.svg'));
        expect(photos.length).toBeGreaterThan(30);
        for (const photo of photos) {
            expect(photo).toHaveAttribute('loading', 'eager');
            expect(photo).toHaveAttribute('fetchpriority', 'low');
        }
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/feed/WeddingPhoneFeed.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/wedding/feed/WeddingPhoneFeed"`.

- [ ] **Step 3: FeedAppBar**

`components/occasions/wedding/feed/FeedAppBar.tsx`:

```tsx
import type { WeddingMockCopy } from '@/lib/occasions/weddingCopy';

// Days, hours, minutes, seconds to the wedding: part of the picture, the same in every language.
const COUNTDOWN = ['116', '8', '47', '36'] as const;

// The feed's top bar: logo and the countdown, with the unit letters from copy.
export function FeedAppBar({ units }: { units: WeddingMockCopy['units'] }) {
    return (
        <div className="flex items-center justify-between px-[4cqw] pt-[4cqw] pb-[3cqw]">
            {/* Logo */}
            <span className="flex items-center gap-[2cqw]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark */}
                <img alt="" className="h-[9cqw] w-auto" height={32} src="/assets/Logo.svg" width={30} />
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
                <img alt="" className="h-[8.4cqw] w-auto" height={28} src="/assets/LogoText.svg" width={117} />
            </span>
            {/* Countdown */}
            <span className="flex gap-[3cqw] text-center [font-family:var(--editorial)] leading-none">
                {COUNTDOWN.map((value, index) => (
                    <span className="flex flex-col gap-[0.8cqw]" key={value}>
                        <span className="text-[5.3cqw] font-bold">{value}</span>
                        <span className="text-[3.6cqw] text-[#151313]/55">{units[index]}</span>
                    </span>
                ))}
            </span>
        </div>
    );
}
```

- [ ] **Step 4: FeedCover**

`components/occasions/wedding/feed/FeedCover.tsx`:

```tsx
import { CalendarDays, Church, Gift, MapPin, Martini } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

const ROUND_BUTTON =
    'absolute right-[3cqw] grid size-[11.5cqw] place-items-center rounded-full bg-white/85 text-[#ff765f] shadow-[0_2cqw_5cqw_rgba(0,0,0,0.12)]';

type FeedCoverProps = {
    date: string;
    loading?: 'eager' | 'lazy';
    photo: OccasionPhoto;
    place: string;
    title: string;
};

// The event's cover with the couple's names and the venue, drinks and gifts buttons, then the date
// and place.
export function FeedCover({ date, loading, photo, place, title }: FeedCoverProps) {
    return (
        <>
            {/* Cover */}
            <div className="relative mx-[2.6cqw] overflow-hidden rounded-[5cqw]">
                <MockPhoto className="block aspect-[16/9] w-full" loading={loading} photo={photo} sizes="(min-width: 901px) 360px, 62vw" />
                <p className="absolute inset-x-0 bottom-0 m-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent)] px-[5cqw] pt-[10cqw] pb-[4cqw] [font-family:var(--editorial)] text-[6.2cqw] leading-none text-white">
                    {title}
                </p>
                <span className={cn(ROUND_BUTTON, 'top-[3cqw]')}>
                    <Church className="size-[6cqw]" strokeWidth={1.6} />
                </span>
                <span className={cn(ROUND_BUTTON, 'top-[16.5cqw]')}>
                    <Martini className="size-[6cqw]" strokeWidth={1.6} />
                </span>
                <span className={cn(ROUND_BUTTON, 'bottom-[3cqw]')}>
                    <Gift className="size-[6cqw]" strokeWidth={1.6} />
                </span>
            </div>
            {/* Date and place */}
            <div className="flex items-center justify-between px-[4.4cqw] pt-[3.4cqw] [font-family:var(--editorial)] text-[4cqw] leading-none">
                <span className="flex items-center gap-[1.6cqw]">
                    <CalendarDays className="size-[4.2cqw]" strokeWidth={1.7} />
                    {date}
                </span>
                <span className="flex items-center gap-[1.4cqw]">
                    <MapPin className="size-[4.2cqw]" strokeWidth={1.7} />
                    {place}
                </span>
            </div>
        </>
    );
}
```

- [ ] **Step 5: FeedStories**

`components/occasions/wedding/feed/FeedStories.tsx`:

```tsx
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

const RING = 'block rounded-full bg-[linear-gradient(135deg,#ff6f93,#ff936a_52%,#ffd05b)] p-[0.7cqw]';
const CIRCLE = 'block size-[15.2cqw] rounded-full border-[0.7cqw] border-white';

type FeedStoriesProps = {
    badge: WeddingMockCopy['scheduleBadge'];
    labels: WeddingMockCopy['stories'];
    loading?: 'eager' | 'lazy';
    // Guests, moments, venue.
    stories: readonly [OccasionPhoto, OccasionPhoto, OccasionPhoto];
    // The person holding the phone.
    viewer: OccasionPhoto;
};

function Story({ children, label }: { children: ReactNode; label: string }) {
    return (
        <span className="flex w-[17cqw] shrink-0 flex-col items-center gap-[1.4cqw]">
            {children}
            <span className="max-w-full truncate text-[2.9cqw] leading-tight">{label}</span>
        </span>
    );
}

// The stories row: your own story, the schedule's date, then three stories from the day.
export function FeedStories({ badge, labels, loading, stories, viewer }: FeedStoriesProps) {
    const items = [
        { label: labels.guests, photo: stories[0] },
        { label: labels.moments, photo: stories[1] },
        { label: labels.venue, photo: stories[2] },
    ];

    return (
        <div className="flex items-start gap-[1.6cqw] px-[2.5cqw] pt-[4cqw]">
            {/* Your story */}
            <Story label={labels.own}>
                <span className="relative block rounded-full bg-[#f3e3d8] p-[0.7cqw]">
                    <MockPhoto className={CIRCLE} loading={loading} photo={viewer} sizes="72px" />
                    <span className="absolute right-0 bottom-0 grid size-[5.4cqw] place-items-center rounded-full border-[0.6cqw] border-white bg-[#ff765f] text-white">
                        <Plus className="size-[3.4cqw]" strokeWidth={3} />
                    </span>
                </span>
            </Story>
            <span className="mt-[3.5cqw] h-[11cqw] w-px shrink-0 bg-[#151313]/12" />
            {/* Schedule */}
            <Story label={labels.schedule}>
                <span className={RING}>
                    <span className={cn(CIRCLE, 'flex flex-col items-center justify-center bg-[#fff4e6] leading-none')}>
                        <span className="text-[2.9cqw] font-bold text-[#ff765f]">{badge[0]}</span>
                        <span className="mt-[0.6cqw] text-[5.3cqw] font-bold text-[#c2672f]">{badge[1]}</span>
                    </span>
                </span>
            </Story>
            {/* Guests, moments, venue */}
            {items.map((item) => (
                <Story key={item.label} label={item.label}>
                    <span className={RING}>
                        <MockPhoto className={CIRCLE} loading={loading} photo={item.photo} sizes="72px" />
                    </span>
                </Story>
            ))}
        </div>
    );
}
```

- [ ] **Step 6: FeedComposer**

`components/occasions/wedding/feed/FeedComposer.tsx`:

```tsx
import { ImagePlus } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

type FeedComposerProps = { loading?: 'eager' | 'lazy'; placeholder: string; viewer: OccasionPhoto };

// "Share a memory…": the viewer's face, the placeholder and the photo button.
export function FeedComposer({ loading, placeholder, viewer }: FeedComposerProps) {
    return (
        <div className="flex items-center gap-[3cqw] px-[4cqw] pt-[5cqw] pb-[4cqw]">
            <span className="block shrink-0 rounded-full bg-[#f3e3d8] p-[0.6cqw]">
                <MockPhoto className="block size-[11.5cqw] rounded-full" loading={loading} photo={viewer} sizes="56px" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-full bg-[#fbe9dd] px-[5cqw] py-[3.4cqw] text-[3.8cqw] leading-none text-[#151313]/40">
                {placeholder}
            </span>
            <span className="grid size-[13cqw] shrink-0 place-items-center rounded-full bg-white shadow-[0_1.5cqw_5cqw_rgba(70,38,24,0.14)]">
                <ImagePlus className="size-[5.6cqw] text-[#151313]/70" strokeWidth={1.7} />
            </span>
        </div>
    );
}
```

- [ ] **Step 7: FeedPost**

`components/occasions/wedding/feed/FeedPost.tsx`. The author row and the photos are exported on their own because the demo phone (Task 18) draws a post without caption, reactions or replies.

```tsx
import { Ellipsis, Heart, MessageCircle, Pin } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingFeedPost } from '@/lib/occasions/weddingCopy';
import type { WeddingFeedPostMedia } from '@/lib/occasions/weddingMedia';

type Loading = { loading?: 'eager' | 'lazy' };

// A post's face, name and time, with the pin and more buttons.
export function FeedPostAuthor({ face, loading, name, time }: Loading & { face: OccasionPhoto; name: string; time: string }) {
    return (
        <div className="flex items-start gap-[2.6cqw] px-[1.3cqw]">
            <MockPhoto className="block size-[11.5cqw] shrink-0 rounded-full" loading={loading} photo={face} sizes="56px" />
            <div className="min-w-0 flex-1 pt-[0.6cqw]">
                <p className="m-0 text-[3.3cqw] leading-tight font-bold">{name}</p>
                <p className="m-0 mt-[0.4cqw] text-[2.7cqw] leading-tight text-[#151313]/50">{time}</p>
            </div>
            <Pin className="mt-[1cqw] size-[3.8cqw] text-[#151313]/45" strokeWidth={1.7} />
            <Ellipsis className="mt-[1cqw] ml-[3cqw] size-[4.4cqw] text-[#151313]/45" />
        </div>
    );
}

// One photo across the post, or two side by side.
export function FeedPostPhotos({ loading, photos }: Loading & { photos: WeddingFeedPostMedia['photos'] }) {
    const [first, second] = photos;
    return second ? (
        <div className="grid grid-cols-2 gap-[1.5cqw]">
            <MockPhoto className="block aspect-[3/4] w-full rounded-[1.5cqw]" loading={loading} photo={first} sizes="(min-width: 901px) 180px, 31vw" />
            <MockPhoto className="block aspect-[3/4] w-full rounded-[1.5cqw]" loading={loading} photo={second} sizes="(min-width: 901px) 180px, 31vw" />
        </div>
    ) : (
        <MockPhoto className="block aspect-[4/3] w-full rounded-[1.5cqw]" loading={loading} photo={first} sizes="(min-width: 901px) 360px, 62vw" />
    );
}

// A guest's post: author, caption, photos, likes and comments, and the two latest replies.
export function FeedPost({ copy, loading, media }: Loading & { copy: WeddingFeedPost; media: WeddingFeedPostMedia }) {
    return (
        <article className="border-t border-[#151313]/8 px-[2.6cqw] pt-[3.5cqw] pb-[3cqw]">
            {/* Author */}
            <FeedPostAuthor face={media.author} loading={loading} name={copy.author} time={copy.time} />
            {/* Caption */}
            <p className="mx-[1.3cqw] mt-[2cqw] mb-[2.6cqw] text-[3.3cqw] leading-snug">{copy.caption}</p>
            {/* Photos */}
            <FeedPostPhotos loading={loading} photos={media.photos} />
            {/* Reactions */}
            <div className="mt-[2.4cqw] flex items-center gap-[5cqw] px-[1.3cqw] text-[3.1cqw] leading-none">
                <span className="flex items-center gap-[1.4cqw] text-[#e2445c]">
                    <Heart className="size-[4.6cqw] fill-[#ff5a7a] text-[#ff5a7a]" />
                    {copy.likes}
                </span>
                <span className="flex items-center gap-[1.4cqw] text-[#151313]/60">
                    <MessageCircle className="size-[4.4cqw]" strokeWidth={1.7} />
                    {copy.comments}
                </span>
            </div>
            {/* Replies */}
            <div className="mt-[2.4cqw] flex flex-col gap-[1.6cqw] border-t border-[#151313]/6 px-[1.3cqw] pt-[2.4cqw]">
                {copy.replies.map((reply, index) => (
                    <p className="m-0 flex items-center gap-[1.8cqw] text-[2.8cqw] leading-tight" key={reply.author}>
                        <MockPhoto className="block size-[5cqw] shrink-0 rounded-full" loading={loading} photo={media.replies[index]!} sizes="24px" />
                        <strong className="shrink-0 font-bold">{reply.author}</strong>
                        <span className="truncate">{reply.text}</span>
                    </p>
                ))}
            </div>
        </article>
    );
}
```

- [ ] **Step 8: FeedMusicCard**

`components/occasions/wedding/feed/FeedMusicCard.tsx`, drawn like the app's `components/feed/PlaylistDigestCard.tsx` (same colors as hex: the landing does not load the app theme's `primary`/`accent-orange`):

```tsx
import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { PiMusicNotesPlusFill } from 'react-icons/pi';

import type { WeddingFeedMusic } from '@/lib/occasions/weddingCopy';

// The playlist update between posts, drawn like the app's playlist digest card.
export function FeedMusicCard({ copy }: { copy: WeddingFeedMusic }) {
    return (
        <div className="border-t border-[#151313]/8 px-[2.6cqw] py-[3cqw]">
            <div className="relative isolate overflow-hidden rounded-[4cqw] bg-[linear-gradient(135deg,#9d3868_0%,#ff7a59_55%,#ffb259_100%)] px-[4.4cqw] py-[4cqw] text-white">
                <span className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-white/10 [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]" />
                <PiMusicNotesPlusFill className="absolute top-1/2 left-1/2 -z-10 size-[28cqw] -translate-x-1/2 -translate-y-1/2 text-white/10" />
                {/* Date, month, time */}
                <div className="flex items-end gap-[2cqw]">
                    {copy.labels.map((label, index) => (
                        <Fragment key={label}>
                            {index > 0 ? <span className="mb-[0.4cqw] h-[7cqw] w-px bg-white/80" /> : null}
                            <span>
                                <span className="block text-[2.6cqw] leading-none font-semibold text-white/75 uppercase">{label}</span>
                                <span className="mt-[0.8cqw] block text-[4.6cqw] leading-none font-black tabular-nums">{copy.values[index]}</span>
                            </span>
                        </Fragment>
                    ))}
                </div>
                {/* Title */}
                <div className="mt-[4cqw] grid grid-cols-[1fr_auto] items-center gap-[3cqw]">
                    <div className="min-w-0">
                        <p className="m-0 text-[2.8cqw] font-medium text-white/80 uppercase">{copy.kicker}</p>
                        <p className="m-0 mt-[1.4cqw] text-[4.6cqw] leading-tight font-semibold">{copy.title}</p>
                        <p className="m-0 mt-[1.4cqw] text-[2.8cqw] text-white/75">{copy.time}</p>
                    </div>
                    <PiMusicNotesPlusFill className="size-[19cqw] text-white/90" />
                </div>
                {/* Open playlist */}
                <div className="mt-[3cqw] flex justify-end">
                    <span className="inline-flex items-center gap-[1.6cqw] rounded-full border border-white/30 bg-white/15 px-[3.4cqw] py-[1.6cqw] text-[3cqw] font-semibold">
                        <PiMusicNotesPlusFill className="size-[3.6cqw]" />
                        {copy.cta}
                        <ArrowRight className="size-[3.2cqw]" strokeWidth={2} />
                    </span>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 9: WeddingPhoneFeed**

`components/occasions/wedding/feed/WeddingPhoneFeed.tsx`:

```tsx
import { Fragment } from 'react';

import { FeedAppBar } from '@/components/occasions/wedding/feed/FeedAppBar';
import { FeedComposer } from '@/components/occasions/wedding/feed/FeedComposer';
import { FeedCover } from '@/components/occasions/wedding/feed/FeedCover';
import { FeedMusicCard } from '@/components/occasions/wedding/feed/FeedMusicCard';
import { FeedPost } from '@/components/occasions/wedding/feed/FeedPost';
import { FeedStories } from '@/components/occasions/wedding/feed/FeedStories';
import type { WeddingHeroFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import type { WeddingHeroMedia } from '@/lib/occasions/weddingMedia';

// The playlist card comes before the seventh post, as in the design.
const MUSIC_BEFORE_POST = 6;

type WeddingPhoneFeedProps = { copy: WeddingHeroFeedCopy; media: WeddingHeroMedia; mock: WeddingMockCopy };

// The hero phone's feed, drawn from the wedding photos and copy. Every photo loads at once (low
// priority), so none pops in while the feed scrolls.
export function WeddingPhoneFeed({ copy, media, mock }: WeddingPhoneFeedProps) {
    return (
        // The landing's feed track is 105.65% of the screen, shifted 2.85% left; this padding (2.7% of
        // the track) puts the feed's edges on the screen's.
        <div className="bg-white px-[2.7%] pb-[6cqw] text-[#151313] [container-type:inline-size]">
            {/* App bar */}
            <FeedAppBar units={mock.units} />
            {/* Cover, date and place */}
            <FeedCover date={copy.date} loading="eager" photo={media.cover} place={copy.place} title={copy.title} />
            {/* Stories */}
            <FeedStories badge={mock.scheduleBadge} labels={mock.stories} loading="eager" stories={media.stories} viewer={media.viewer} />
            {/* Composer */}
            <FeedComposer loading="eager" placeholder={mock.composer} viewer={media.viewer} />
            {/* Posts, with the playlist card */}
            {copy.posts.map((post, index) => (
                <Fragment key={post.author}>
                    {index === MUSIC_BEFORE_POST ? <FeedMusicCard copy={copy.music} /> : null}
                    <FeedPost copy={post} loading="eager" media={media.posts[index]!} />
                </Fragment>
            ))}
        </div>
    );
}
```

`WeddingHeroMedia` is exported from `lib/occasions/weddingMedia.ts` in Task 7.

- [ ] **Step 10: Run the test**

Run: `npx vitest run components/occasions/wedding/feed/WeddingPhoneFeed.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 11: Lint and commit**

```bash
npx eslint components/occasions/wedding/feed
git add components/occasions/wedding/feed
git commit -m "feat(occasions): wedding hero phone feed in HTML"
```

---

### Task 13: Wedding hero

Design CSS (`.lp-hero` and children) at the design's breakpoints 767 and 900, written mobile first with `min-[768px]:` and `min-[901px]:`. Our header is in the page flow (80 px under 421 px wide, 124 px from 421 to 760, 112 px from 761), while the design's floats over the hero (88 px), so the content's top padding is the design's minus our header: 26 px under 421, 0 from 421 to 767, 6 px from 768 to 900, 38 px from 901.

**Files:**
- Modify: `components/landing/LandingHeader.tsx`
- Modify: `lib/occasions/occasionSections.ts`
- Create: `lib/occasions/occasionSections.test.ts`
- Modify: `components/occasions/OccasionHero.tsx`
- Create: `components/occasions/wedding/WeddingHeroActions.tsx`
- Create: `components/occasions/wedding/WeddingHero.tsx`
- Test: `components/occasions/wedding/WeddingHero.test.tsx`

- [ ] **Step 1: Write the failing tests**

`lib/occasions/occasionSections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';

describe('occasionHeaderLinks', () => {
    it('links the header to how it works, features, plans and the FAQ', () => {
        const nav = ['Home', 'How it works', 'Features', 'Plans', 'Sign in'];
        const mobileNav = ['Home', 'How', 'Features', 'Plans', 'Sign in'];
        expect(occasionHeaderLinks(nav, mobileNav, 'FAQ')).toEqual([
            { href: '#howItWorks', label: 'How it works', mobileLabel: 'How' },
            { href: '#features', label: 'Features', mobileLabel: 'Features' },
            { href: '#pricing', label: 'Plans', mobileLabel: 'Plans' },
            { href: '#faq', label: 'FAQ', mobileLabel: 'FAQ' },
        ]);
    });
});
```

`components/occasions/wedding/WeddingHero.test.tsx`:

```tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingHero } from '@/components/occasions/wedding/WeddingHero';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
// The header needs auth and the client intl provider, the visual the motion provider; both are
// covered by their own tests.
vi.mock('@/components/landing/LandingHeader', () => ({ LandingHeader: () => <header /> }));
vi.mock('@/components/occasions/OccasionHeroVisual', () => ({
    OccasionHeroVisual: ({ comments, feed, posts }: { comments: ReactNode[]; feed: ReactNode; posts: ReactNode[] }) => (
        <div data-testid="visual">
            {feed}
            {posts}
            {comments}
        </div>
    ),
}));

const SPAN: OccasionPriceValues = { range: 'span', from: '119€', fromName: 'START', to: '259€', toName: 'SIGNATURE' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

function hero(overrides: Partial<Parameters<typeof WeddingHero>[0]> = {}) {
    return WeddingHero({
        alternatePaths: { el: '/el/gamos', en: '/weddings' },
        campaign: null,
        createHref: '/events/new?type=wedding',
        demoHref: '/demo/wedding/feed',
        locale: 'el',
        price: SPAN,
        ...overrides,
    });
}

afterEach(cleanup);

describe('WeddingHero', () => {
    it('has one h1, the keyword', async () => {
        render(await hero());
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('Ηλεκτρονικό προσκλητήριο & ιστοσελίδα γάμου');
        expect(headings[0]!.querySelector('em')).toHaveTextContent('ιστοσελίδα γάμου');
    });

    it('shows a breadcrumb back to the landing', async () => {
        render(await hero());
        const crumb = screen.getByRole('navigation', { name: 'Διαδρομή' });
        expect(within(crumb).getByRole('link', { name: 'StoryWall' })).toHaveAttribute('href', '/el');
        expect(within(crumb).getByText('Γάμος')).toHaveAttribute('aria-current', 'page');
    });

    it('names the lowest price only when config has one', async () => {
        render(await hero());
        expect(screen.getByText('Από 119€')).toBeInTheDocument();
        cleanup();
        render(await hero({ price: NONE }));
        expect(screen.getByText('Με ένα link')).toBeInTheDocument();
        expect(screen.queryByText(/€/)).toBeNull();
    });

    it('links to create, and to the demo when there is one', async () => {
        render(await hero());
        expect(screen.getByRole('link', { name: /Φτιάξε το StoryWall σου/ })).toHaveAttribute('href', '/events/new?type=wedding');
        expect(screen.getByRole('link', { name: /Δες το demo/ })).toHaveAttribute('href', '/demo/wedding/feed');
        cleanup();
        render(await hero({ demoHref: null }));
        expect(screen.queryByRole('link', { name: /Δες το demo/ })).toBeNull();
    });

    it('draws the phone feed and the cards beside it', async () => {
        render(await hero());
        const visual = screen.getByTestId('visual');
        expect(within(visual).getByText('James & Olivia')).toBeInTheDocument();
        expect(within(visual).getAllByRole('article')).toHaveLength(9);
        // 9 posts' photos and faces, plus the two post cards' and the three comment faces.
        expect(visual.querySelectorAll('[class*="aspect-[705/360]"], [class*="aspect-[557/300]"]')).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/occasions/occasionSections.test.ts components/occasions/wedding/WeddingHero.test.tsx`
Expected: FAIL, `occasionHeaderLinks is not a function` and `Failed to resolve import "@/components/occasions/wedding/WeddingHero"`.

- [ ] **Step 3: The header links helper**

Append to `lib/occasions/occasionSections.ts`:

```ts
// The header's links on an occasion page. nav and mobileNav are LandingPage.hero.nav and mobileNav:
// [home, how it works, features, plans, sign in]; the header shows sign in on its own.
export function occasionHeaderLinks(nav: string[], mobileNav: string[], faqLabel: string) {
    return [
        { href: `#${OCCASION_SECTION_IDS.howItWorks}`, label: nav[1]!, mobileLabel: mobileNav[1]! },
        { href: `#${OCCASION_SECTION_IDS.features}`, label: nav[2]!, mobileLabel: mobileNav[2]! },
        { href: `#${OCCASION_SECTION_IDS.pricing}`, label: nav[3]!, mobileLabel: mobileNav[3]! },
        { href: `#${OCCASION_SECTION_IDS.faq}`, label: faqLabel, mobileLabel: faqLabel },
    ];
}
```

In `components/occasions/OccasionHero.tsx`, replace the `links` array with:

```tsx
    const links = occasionHeaderLinks(nav, mobileNav, landing('faq.eyebrow'));
```

and change the import `import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';` to `import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';`.

- [ ] **Step 4: LandingHeader takes a className**

In `components/landing/LandingHeader.tsx`, add `import { cn } from '@/lib/utils';` (if not imported), add to `LandingHeaderProps`:

```tsx
    // An occasion hero that draws its own background behind the header.
    className?: string;
```

add `className` to the destructured props, and change the `<header>` opening tag to:

```tsx
        <header
            className={cn(
                'relative z-30 h-20 bg-white/95 min-[421px]:max-[760px]:h-31 min-[761px]:h-28 min-[761px]:backdrop-blur-sm',
                className,
            )}
        >
```

- [ ] **Step 5: WeddingHeroActions**

`components/occasions/wedding/WeddingHeroActions.tsx` (design: `.lp-cta`, `.lp-arrow`, `.lp-ghost`):

```tsx
import { landingClickAttributes } from '@/lib/landingTracking';

const CREATE =
    'focus-ring inline-flex min-h-14.5 items-center gap-3 rounded-full bg-[linear-gradient(100deg,#ff6f93_0%,#ff936a_52%,#ffd05b_100%)] py-1.75 pr-2 pl-5 [font-family:var(--editorial)] text-[16px] leading-[1.05] text-white no-underline shadow-[0_18px_38px_-16px_rgba(255,111,147,0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4 motion-reduce:transition-none min-[768px]:min-h-18.5 min-[768px]:gap-4 min-[768px]:py-2.5 min-[768px]:pr-2.75 min-[768px]:pl-7 min-[768px]:text-[19px]';
const CREATE_ARROW =
    'grid size-11 shrink-0 place-items-center rounded-full bg-white font-[Arial,Helvetica,sans-serif] text-[24px] font-extralight text-[#ef9772] min-[768px]:size-13.5 min-[768px]:text-[30px]';
const DEMO =
    'focus-ring inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.12em] text-[#151313] uppercase no-underline focus-visible:outline-offset-4 min-[768px]:gap-3 min-[768px]:text-[11px]';
const DEMO_ARROW = 'grid size-9 shrink-0 place-items-center rounded-full border border-[#151313] text-[16px] min-[768px]:size-10.5';

type WeddingHeroActionsProps = {
    createHref: string;
    createLabel: string;
    // null: the wedding demo is off, so there is no demo link.
    demoHref: string | null;
    demoLabel: string;
};

// The hero's gradient create button and the demo link.
export function WeddingHeroActions({ createHref, createLabel, demoHref, demoLabel }: WeddingHeroActionsProps) {
    return (
        <div className="mt-6 flex flex-wrap items-center gap-[15px] min-[768px]:mt-7.5 min-[768px]:gap-x-5.5 min-[768px]:gap-y-3.5">
            {/* Create */}
            <a className={CREATE} href={createHref} {...landingClickAttributes({ event: 'create', placement: 'hero' })}>
                {/* Two balanced lines, as in the design */}
                <span className="max-w-[8.5em] text-balance">{createLabel}</span>
                <span aria-hidden="true" className={CREATE_ARROW}>
                    ↗
                </span>
            </a>
            {/* Demo */}
            {demoHref ? (
                <a className={DEMO} href={demoHref} {...landingClickAttributes({ event: 'demo', placement: 'hero' })}>
                    {demoLabel}
                    <span aria-hidden="true" className={DEMO_ARROW}>
                        ↗
                    </span>
                </a>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 6: WeddingHero**

`components/occasions/wedding/WeddingHero.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import { Fragment } from 'react';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { OccasionCommentCard } from '@/components/occasions/OccasionCommentCard';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import { OccasionPostCard } from '@/components/occasions/OccasionPostCard';
import { WeddingPhoneFeed } from '@/components/occasions/wedding/feed/WeddingPhoneFeed';
import { WeddingHeroActions } from '@/components/occasions/wedding/WeddingHeroActions';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { occasionHeaderLinks } from '@/lib/occasions/occasionSections';
import type { WeddingHeroFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_HERO_MEDIA } from '@/lib/occasions/weddingMedia';

// The design's background: pink top left, gold top right, coral at the bottom, on white.
const SECTION_CLASS =
    'relative bg-white bg-[radial-gradient(42%_52%_at_12%_18%,rgba(248,154,176,0.28),transparent_70%),radial-gradient(40%_50%_at_92%_22%,rgba(252,186,99,0.3),transparent_70%),radial-gradient(50%_60%_at_70%_100%,rgba(255,118,95,0.16),transparent_70%)] text-[#151313]';

// The landing's hero visual, sized and placed as in the design: 115% of the column under 768 px,
// overlapping the copy column's edge from 768 to 900, half the grid from 901 up.
const VISUAL_CLASS = [
    'left-1/2 mt-5.5 w-[min(115%,510px)] -translate-x-1/2',
    'min-[768px]:left-0 min-[768px]:mt-2.5 min-[768px]:ml-[max(-20px_-_9vw,50%_-_310px)] min-[768px]:w-[min(620px,118vw)] min-[768px]:translate-x-[3%]',
    'min-[901px]:my-[-3%] min-[901px]:ml-0 min-[901px]:w-[min(860px,54vw)] min-[901px]:justify-self-center',
].join(' ');

type WeddingHeroProps = {
    alternatePaths: Record<Locale, string>;
    campaign: OccasionCampaign | null;
    createHref: string;
    // null: no wedding demo; the hero shows the create button only.
    demoHref: string | null;
    locale: Locale;
    price: OccasionPriceValues;
};

export async function WeddingHero({ alternatePaths, campaign, createHref, demoHref, locale, price }: WeddingHeroProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    // A campaign may swap the body, the CTA label and the feed's cover. The h1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const home = getPublicLandingPath(locale);
    // "From 119€" only when config gave a price.
    const trust = [...(t.raw('hero.trust') as string[]), ...(price.range === 'none' ? [] : [t('hero.trustPrice', price)])];
    const media = { ...WEDDING_HERO_MEDIA, cover: campaign?.hero?.image ?? WEDDING_HERO_MEDIA.cover };
    const [leftCard, rightCard] = media.cards;

    return (
        <section className={SECTION_CLASS}>
            {/* Header, on the hero's background */}
            <LandingHeader
                alternatePaths={alternatePaths}
                className="bg-transparent min-[761px]:backdrop-blur-none"
                homeHref={home}
                links={occasionHeaderLinks(nav, mobileNav, landing('faq.eyebrow'))}
                loginLabel={nav.at(-1)!}
                mobileLoginLabel={mobileNav.at(-1)!}
            />

            <div className="pt-6.5 pb-9 min-[421px]:pt-0 min-[768px]:pt-1.5 min-[768px]:pb-10 min-[901px]:pt-9.5 min-[901px]:pb-22.5">
                <div className="mx-auto grid w-[calc(100%-40px)] grid-cols-1 items-center min-[768px]:w-[min(1220px,calc(100%-64px))] min-[768px]:gap-[clamp(20px,3vw,48px)] min-[901px]:grid-cols-2">
                    {/* Copy */}
                    <div className="relative z-20">
                        {/* Breadcrumb */}
                        <nav aria-label={common('breadcrumbLabel')} className="mb-3.5 ml-1 min-[768px]:mb-4.5">
                            <ol className="m-0 flex list-none items-center gap-2 p-0 text-[11px] font-bold tracking-[0.06em] text-[#151313]/55 uppercase">
                                <li>
                                    <a className="text-[#151313] no-underline hover:underline" href={home}>
                                        StoryWall
                                    </a>
                                </li>
                                <li aria-hidden="true">›</li>
                                <li aria-current="page">{t('hero.breadcrumb')}</li>
                            </ol>
                        </nav>
                        {/* Kicker */}
                        <p className="mt-0 mb-4 text-[12px] leading-[1.2] font-medium tracking-[-0.02em] uppercase min-[768px]:mb-5.5 min-[768px]:ml-1 min-[768px]:text-[clamp(13px,0.9vw,16px)]">
                            {t.rich('hero.kicker', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
                        </p>
                        {/* Title */}
                        <h1 className="m-0 [font-family:var(--editorial)] text-[clamp(37px,9vw,45px)] leading-[1.02] font-normal tracking-[-0.045em] min-[768px]:text-[clamp(50px,5.2vw,92px)] min-[768px]:leading-[0.91] min-[768px]:tracking-[-0.055em]">
                            {t.rich('hero.h1', {
                                em: (chunks) => (
                                    <em className="bg-clip-text [background-image:var(--brand-gradient)] text-transparent italic min-[768px]:pr-[0.06em]">{chunks}</em>
                                ),
                            })}
                        </h1>
                        {/* Subtitle */}
                        <p className="mt-5 mb-0 font-[Georgia,serif] text-[18px] leading-[1.3] min-[768px]:mt-6.5 min-[768px]:ml-1 min-[768px]:max-w-130 min-[768px]:text-[clamp(17px,1.35vw,21px)] min-[768px]:leading-[1.4]">
                            {t('hero.subtitle')}
                        </p>
                        {/* Body */}
                        <p className="mt-3.5 mb-0 text-[15px] leading-[1.55] text-[#151313]/74 min-[768px]:ml-1 min-[768px]:max-w-[min(460px,40vw)]">
                            {c ? c('lead') : t('hero.body')}
                        </p>
                        {/* Actions */}
                        <WeddingHeroActions
                            createHref={createHref}
                            createLabel={c ? c('cta') : t('hero.cta')}
                            demoHref={demoHref}
                            demoLabel={landing('hero.demoCta')}
                        />
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

                    {/* Visual: the phone feed, two post cards and two comment cards */}
                    <OccasionHeroVisual
                        className={VISUAL_CLASS}
                        comments={[
                            <OccasionCommentCard faces={media.comments[0]} key="heart" variant="heart" />,
                            <OccasionCommentCard faces={media.comments[1]} key="avatar" variant="avatar" />,
                        ]}
                        feed={
                            <WeddingPhoneFeed copy={t.raw('hero.feed') as WeddingHeroFeedCopy} media={media} mock={t.raw('mock') as WeddingMockCopy} />
                        }
                        posts={[
                            <OccasionPostCard avatar={leftCard.author} key="left" photo={leftCard.photo} tilt="left" />,
                            <OccasionPostCard avatar={rightCard.author} key="right" photo={rightCard.photo} tilt="right" />,
                        ]}
                    />
                </div>
            </div>
        </section>
    );
}
```

The test's last expectation counts the two comment cards by their root shape class.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run lib/occasions/occasionSections.test.ts components/occasions/wedding/WeddingHero.test.tsx components/landing components/occasions`
Expected: PASS. The landing and baptism tests still pass (the header's default classes and the occasion hero's links are unchanged).

- [ ] **Step 8: Types, lint, commit**

```bash
npx tsc --noEmit
npx eslint components/landing/LandingHeader.tsx components/occasions lib/occasions
git add components/landing/LandingHeader.tsx lib/occasions/occasionSections.ts lib/occasions/occasionSections.test.ts components/occasions/OccasionHero.tsx components/occasions/wedding/WeddingHeroActions.tsx components/occasions/wedding/WeddingHero.tsx components/occasions/wedding/WeddingHero.test.tsx
git commit -m "feat(occasions): wedding hero with HTML feed and cards"
```

The hero is checked in the browser in Task 19, once the page renders it.

---

### Task 14: Why StoryWall

Design CSS: `.lp-why*`, `.lp-scatter`, `.lp-bub*`, `.swqr*`, `.lp-mq*`, `.lp-stats`, `.lp-chips`, with the design's `#giati` overrides at 600 px. Breakpoints 600, 760, 860 and 900 become `min-[601px]:`, `min-[761px]:`, `min-[861px]:` and `min-[901px]:`.

**Files:**
- Create: `components/occasions/wedding/WeddingWrap.tsx`
- Create: `components/occasions/wedding/WeddingSectionHead.tsx`
- Create: `components/occasions/wedding/why/WhyWithout.tsx`
- Create: `components/occasions/wedding/why/WhyQrSteps.tsx`
- Create: `components/occasions/wedding/why/WhyMarquee.tsx`
- Create: `components/occasions/wedding/why/WhyStats.tsx`
- Create: `components/occasions/wedding/WeddingWhy.tsx`
- Test: `components/occasions/wedding/WeddingWhy.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/occasions/wedding/WeddingWhy.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingWhy } from '@/components/occasions/wedding/WeddingWhy';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

// The marquee reads the landing's motion toggle.
async function renderWhy(qrHref: string | null = '/el/qr-code-gamou') {
    return render(<LandingMotionProvider>{await WeddingWhy({ locale: 'el', qrHref })}</LandingMotionProvider>);
}

afterEach(cleanup);

describe('WeddingWhy', () => {
    it('heads the section and lists what goes wrong without StoryWall', async () => {
        await renderWhy();
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Οι φωτογραφίες του γάμου σου δεν πρέπει να χαθούν σε 100 κινητά.');
        expect(screen.getByText('Φωτογραφίες σε 100 διαφορετικά κινητά')).toBeInTheDocument();
    });

    it('links the scan step to the QR page only while that page is live', async () => {
        await renderWhy('/el/qr-code-gamou');
        expect(screen.getByRole('link', { name: 'Σκανάρουν' })).toHaveAttribute('href', '/el/qr-code-gamou');
        cleanup();
        await renderWhy(null);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByRole('heading', { level: 3, name: 'Σκανάρουν' })).toBeInTheDocument();
    });

    it('names each marquee photo once, by its moment and who took it', async () => {
        await renderWhy();
        const photos = screen.getAllByRole('img', { name: /φωτογραφία από/ });
        expect(photos).toHaveLength(14);
        expect(photos[0]).toHaveAccessibleName('Προετοιμασία νυφικού — φωτογραφία από Ιωάννα, φίλη νύφης');
    });

    it('shows the example numbers and the four points', async () => {
        await renderWhy();
        expect(screen.getByText('248')).toBeInTheDocument();
        expect(screen.getByText('Ευχολόγιο που κατεβάζεις σε PDF')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/WeddingWhy.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/wedding/WeddingWhy"`.

- [ ] **Step 3: WeddingWrap and WeddingSectionHead**

`components/occasions/wedding/WeddingWrap.tsx` (the design's `.lp-wrap`):

```tsx
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// The design's page column: up to 1220 px with 32 px gutters, 20 px gutters up to 760 px, 18 px up to 600 px.
export function WeddingWrap({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('mx-auto w-[calc(100%-36px)] min-[601px]:w-[calc(100%-40px)] min-[761px]:w-[min(1220px,calc(100%-64px))]', className)}>
            {children}
        </div>
    );
}
```

`components/occasions/wedding/WeddingSectionHead.tsx`:

```tsx
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type WeddingSectionHeadProps = {
    // An intro under the heading.
    children?: ReactNode;
    // Width and bottom spacing.
    className?: string;
    heading: [string, string];
    // Size, line height and tracking of the heading.
    headingClassName: string;
    // The heading's id, for the section's aria-labelledby.
    id: string;
    kicker: string;
    // The kicker's color; coral unless given.
    kickerClassName?: string;
    // false: the bold part runs on after the first instead of starting a new line.
    stacked?: boolean;
};

// A centered section head: a small kicker, a heading whose second part is bold, and an optional intro.
export function WeddingSectionHead({
    children,
    className,
    heading,
    headingClassName,
    id,
    kicker,
    kickerClassName = 'text-[#ff765f]',
    stacked = true,
}: WeddingSectionHeadProps) {
    return (
        <div className={cn('mx-auto text-center', className)}>
            <p className={cn('mt-0 mb-4.5 text-[11px] font-extrabold tracking-[0.16em] uppercase', kickerClassName)}>{kicker}</p>
            <h2 className={cn('m-0 [font-family:var(--editorial)] font-normal', headingClassName)} id={id}>
                {heading[0]}{' '}
                {stacked ? <br /> : null}
                <strong className="font-bold">{heading[1]}</strong>
            </h2>
            {children}
        </div>
    );
}
```

The space after the first part keeps the heading's accessible name and text readable as two sentences; before a `<br />` it does not show.

- [ ] **Step 4: WhyWithout**

`components/occasions/wedding/why/WhyWithout.tsx`:

```tsx
import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

// The small caps label at the top of the Without and With cards; each card adds its color.
export const WHY_LABEL_CLASS = 'mt-0 mb-1.5 text-[11px] font-extrabold tracking-[0.16em] uppercase';

// Where each of the three photos lands on the card, and its tilt.
const SCATTER = ['top-7.5 left-[3%] -rotate-9', 'top-0 left-[35%] rotate-6', 'top-10 left-[66%] -rotate-4'] as const;

const BUBBLE =
    'absolute m-0 bg-white px-3.5 py-2.5 text-[12px] font-semibold whitespace-nowrap shadow-[0_10px_24px_-12px_rgba(0,0,0,0.3)] min-[861px]:text-[13px]';

type WhyWithoutProps = {
    bubbles: [string, string];
    items: string[];
    label: string;
    photos: readonly OccasionPhoto[];
};

// "Without StoryWall": three grey photos with two chat bubbles, then what goes wrong.
export function WhyWithout({ bubbles, items, label, photos }: WhyWithoutProps) {
    return (
        <div className="rounded-[30px] bg-[#f2f1ef] px-5 py-6 min-[861px]:px-8.5 min-[861px]:py-7">
            <p className={cn(WHY_LABEL_CLASS, 'text-[#8a857f]')}>{label}</p>
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-2.5 min-[861px]:grid-cols-[1.1fr_0.9fr] min-[861px]:gap-7.5">
                {/* Photos and bubbles */}
                <div aria-hidden="true" className="relative h-55 min-[861px]:h-62.5">
                    {photos.map((photo, index) => (
                        <MockPhoto
                            className={cn(
                                'absolute h-40 w-[31%] rounded-[14px] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.4)] brightness-95 grayscale-60 min-[861px]:h-47.5',
                                SCATTER[index],
                            )}
                            key={photo.src}
                            photo={photo}
                            sizes="(min-width: 861px) 360px, 31vw"
                        />
                    ))}
                    <p className={cn(BUBBLE, 'top-42 left-[4%] rounded-[18px_18px_18px_4px] min-[861px]:top-43 min-[861px]:left-[18%]')}>{bubbles[0]}</p>
                    <p className={cn(BUBBLE, 'top-1.5 right-[2%] rounded-[18px_18px_4px_18px] min-[861px]:top-2 min-[861px]:right-[6%]')}>{bubbles[1]}</p>
                </div>
                {/* What goes wrong */}
                <ul className="m-0 list-none p-0">
                    {items.map((item) => (
                        <li className="flex gap-3 border-t border-[#151313]/18 py-3 text-[15px] text-[#6f6a64]" key={item}>
                            <span aria-hidden="true" className="w-4.5 shrink-0 font-extrabold text-[#b9b3ac]">
                                ✕
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
```

- [ ] **Step 5: WhyQrSteps**

`components/occasions/wedding/why/WhyQrSteps.tsx`:

```tsx
import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

type WhyQrStepsProps = {
    alt: string;
    photo: OccasionPhoto;
    // The QR wedding page while it is live; the first step links to it.
    qrHref: string | null;
    steps: { body: ReactNode; title: string }[];
};

// A guest scanning the table QR, an arrow, then the three steps from scan to album. Stacked up to 900 px.
export function WhyQrSteps({ alt, photo, qrHref, steps }: WhyQrStepsProps) {
    return (
        <div className="mx-auto mb-8.5 flex max-w-280 flex-col items-stretch px-5 min-[901px]:mb-11 min-[901px]:flex-row min-[901px]:items-center min-[901px]:px-10">
            {/* Photo */}
            <ProtectedImage
                alt={alt}
                className="aspect-[4/3] h-auto w-full rounded-[22px] object-cover shadow-[0_16px_34px_rgba(60,40,25,0.16)] min-[901px]:h-56.25 min-[901px]:w-75 min-[901px]:flex-none"
                height={photo.height}
                loading="lazy"
                sizes="(min-width: 901px) 300px, calc(100vw - 76px)"
                src={photo.src}
                width={photo.width}
            />
            <span
                aria-hidden="true"
                className="hidden flex-none basis-22.5 text-center [font-family:var(--editorial)] text-[54px] leading-none font-light text-[rgba(240,150,130,0.45)] min-[901px]:block"
            >
                →
            </span>
            {/* Steps */}
            <ol className="m-0 mt-4.5 flex list-none flex-col p-0 min-[901px]:mt-0 min-[901px]:flex-1 min-[901px]:flex-row">
                {steps.map((step, index) => (
                    <li
                        className="min-w-0 border-t border-[#151313]/14 px-0.5 py-4 min-[901px]:flex-1 min-[901px]:border-t-0 min-[901px]:border-l min-[901px]:px-6.5 min-[901px]:py-1 min-[901px]:first:border-l-0"
                        key={step.title}
                    >
                        <span
                            aria-hidden="true"
                            className="bg-clip-text [background-image:var(--brand-gradient)] text-[12px] font-extrabold tracking-[0.08em] text-transparent"
                        >
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="mt-2 mb-1.5 [font-family:var(--editorial)] text-[25px] leading-[1.1] font-normal tracking-[-0.025em]">
                            {index === 0 && qrHref ? (
                                <a className="focus-ring text-inherit no-underline underline-offset-3 hover:underline" href={qrHref}>
                                    {step.title}
                                </a>
                            ) : (
                                step.title
                            )}
                        </h3>
                        <p className="m-0 text-[14px] leading-[1.45] text-[#5f5a55]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </div>
    );
}
```

- [ ] **Step 6: WhyMarquee**

`components/occasions/wedding/why/WhyMarquee.tsx`. The track holds the tiles twice; `useMarqueeMotion` (Task 9) slides it by one copy. The viewport's `pl-2` is the design's track padding: a viewport clips at its padding edge, so moving tiles still show there.

```tsx
'use client';

import { motion } from 'framer-motion';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import { useMarqueeMotion } from '@/hooks/useMarqueeMotion';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingMarqueeCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

// One copy of the tiles crosses the screen in this many seconds.
const MARQUEE_SECONDS = 48;

export type WhyMarqueeTile = WeddingMarqueeCopy & { alt: string; avatar: OccasionPhoto; photo: OccasionPhoto };

// One copy of the tiles. The copy that only closes the loop is hidden from assistive tech.
function Tiles({ hidden = false, tiles }: { hidden?: boolean; tiles: WhyMarqueeTile[] }) {
    return (
        <div aria-hidden={hidden || undefined} className="flex gap-4 pr-4">
            {tiles.map((tile) => (
                <div
                    className="relative h-[clamp(228px,67vw,275px)] w-[clamp(168px,52vw,210px)] flex-none overflow-hidden rounded-3xl even:mt-7.5 min-[601px]:h-60 min-[601px]:w-45 min-[861px]:h-75 min-[861px]:w-57.5"
                    key={tile.photo.src}
                >
                    <ProtectedImage
                        alt={hidden ? '' : tile.alt}
                        className="size-full object-cover"
                        height={tile.photo.height}
                        loading="lazy"
                        sizes="(min-width: 861px) 230px, (min-width: 601px) 180px, 52vw"
                        src={tile.photo.src}
                        width={tile.photo.width}
                    />
                    {/* Who posted it; the photo's name already says it */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-full bg-white/94 py-1.5 pr-3 pl-1.5 text-[12px]"
                    >
                        <MockPhoto className="size-7 flex-none rounded-full" photo={tile.avatar} sizes="28px" />
                        <span className="truncate">
                            <b>{tile.name}</b> · {tile.role}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// The guests' photos sliding past, paused on hover. For reduced motion or the landing's pause it
// stands still as one copy the user can scroll sideways.
export function WhyMarquee({ tiles }: { tiles: WhyMarqueeTile[] }) {
    const { still, x, onPointerEnter, onPointerLeave } = useMarqueeMotion(MARQUEE_SECONDS);

    return (
        <div className={cn('mt-6 pl-2', still ? 'overflow-x-auto' : 'overflow-hidden')} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
            <motion.div className="flex w-max pb-7.5" style={{ x }}>
                <Tiles tiles={tiles} />
                {still ? null : <Tiles hidden tiles={tiles} />}
            </motion.div>
        </div>
    );
}
```

- [ ] **Step 7: WhyStats**

`components/occasions/wedding/why/WhyStats.tsx`:

```tsx
import type { WeddingStatCopy } from '@/lib/occasions/weddingCopy';

type WhyStatsProps = { chips: string[]; example: string; stats: WeddingStatCopy[] };

// One example wedding in numbers, then the four points.
export function WhyStats({ chips, example, stats }: WhyStatsProps) {
    return (
        <>
            {/* Example */}
            <p className="mt-2.5 mb-0 text-center text-[10px] font-extrabold tracking-[0.16em] text-[#8a857f] uppercase">{example}</p>
            {/* Numbers */}
            <ul className="m-0 mt-2.5 grid list-none grid-cols-2 gap-x-2 gap-y-5 p-0 min-[601px]:gap-x-8.5 min-[861px]:flex min-[861px]:justify-center min-[861px]:gap-[clamp(28px,5vw,70px)]">
                {stats.map((stat) => (
                    <li className="text-center text-[11px] font-bold tracking-[0.14em] text-[#8a857f] uppercase" key={stat.label}>
                        <span className="mb-2.5 block bg-clip-text [background-image:var(--brand-gradient)] [font-family:var(--editorial)] text-[clamp(56px,5.2vw,78px)] leading-none font-normal tracking-[-0.04em] text-transparent">
                            {stat.value}
                        </span>
                        {stat.label}
                    </li>
                ))}
            </ul>
            {/* Points */}
            <ul className="m-0 mt-6.5 flex list-none flex-wrap justify-center gap-2 px-2 min-[601px]:gap-2.5 min-[601px]:px-5">
                {chips.map((chip) => (
                    <li className="rounded-full bg-white px-4 py-2.5 text-[11px] leading-[1.4] font-semibold min-[601px]:text-[13px] min-[601px]:leading-normal" key={chip}>
                        <span aria-hidden="true">✓ </span>
                        {chip}
                    </li>
                ))}
            </ul>
        </>
    );
}
```

- [ ] **Step 8: WeddingWhy**

`components/occasions/wedding/WeddingWhy.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { WeddingSectionHead } from '@/components/occasions/wedding/WeddingSectionHead';
import { WeddingWrap } from '@/components/occasions/wedding/WeddingWrap';
import { WhyMarquee } from '@/components/occasions/wedding/why/WhyMarquee';
import { WhyQrSteps } from '@/components/occasions/wedding/why/WhyQrSteps';
import { WhyStats } from '@/components/occasions/wedding/why/WhyStats';
import { WHY_LABEL_CLASS, WhyWithout } from '@/components/occasions/wedding/why/WhyWithout';
import type { Locale } from '@/i18n/config';
import type { WeddingMarqueeCopy, WeddingStatCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_MARQUEE, WEDDING_QR_PHOTO, WEDDING_WITHOUT_PHOTOS } from '@/lib/occasions/weddingMedia';
import { cn } from '@/lib/utils';

type WeddingWhyProps = {
    locale: Locale;
    // The QR wedding page while it is live, else null.
    qrHref: string | null;
};

// Why StoryWall: the photos lost without it, then the same wedding with it.
export async function WeddingWhy({ locale, qrHref }: WeddingWhyProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING.why' });
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const steps = (t.raw('with.steps') as { title: string }[]).map((step, index) => ({
        title: step.title,
        body: t.rich(`with.steps.${index}.body`, { b: bold }),
    }));
    const tiles = (t.raw('with.marquee') as WeddingMarqueeCopy[]).map((copy, index) => ({
        ...copy,
        ...WEDDING_MARQUEE[index]!,
        alt: t('with.photoAlt', copy),
    }));

    return (
        <section
            aria-labelledby="wedding-why-title"
            className="bg-white py-17.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[861px]:pt-22.5 min-[861px]:pb-25"
        >
            <WeddingWrap>
                {/* Heading */}
                <WeddingSectionHead
                    className="mb-11.5 max-w-245"
                    heading={t.raw('heading') as [string, string]}
                    headingClassName="text-[clamp(38px,4.2vw,68px)] leading-[0.97] tracking-[-0.045em]"
                    id="wedding-why-title"
                    kicker={t('kicker')}
                />
                {/* Without StoryWall */}
                <WhyWithout
                    bubbles={t.raw('without.bubbles') as [string, string]}
                    items={t.raw('without.items') as string[]}
                    label={t('without.label')}
                    photos={WEDDING_WITHOUT_PHOTOS}
                />
            </WeddingWrap>

            <WeddingWrap>
                {/* With StoryWall */}
                <div className="mt-5.5 overflow-hidden rounded-[30px] bg-[#f4f0e8] pt-7.5 pb-8.5">
                    <p className={cn(WHY_LABEL_CLASS, 'text-center text-[#ff765f]')}>{t('with.label')}</p>
                    <p className="mx-4.5 mt-4 mb-7.5 text-center [font-family:var(--editorial)] text-[24px] leading-[1.22] tracking-[-0.025em] min-[761px]:mx-auto min-[761px]:mt-4.5 min-[761px]:mb-9 min-[761px]:max-w-237.5 min-[761px]:text-[clamp(24px,2.35vw,32px)]">
                        {t('with.subtitle')}
                    </p>
                    {/* QR row */}
                    <WhyQrSteps alt={t('with.qrAlt')} photo={WEDDING_QR_PHOTO} qrHref={qrHref} steps={steps} />
                    {/* Guests' photos */}
                    <WhyMarquee tiles={tiles} />
                    {/* Example and points */}
                    <WhyStats chips={t.raw('with.chips') as string[]} example={t('with.example')} stats={t.raw('with.stats') as WeddingStatCopy[]} />
                </div>
            </WeddingWrap>
        </section>
    );
}
```

- [ ] **Step 9: Run the test**

Run: `npx vitest run components/occasions/wedding/WeddingWhy.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 10: Lint and commit**

```bash
npx eslint components/occasions/wedding
git add components/occasions/wedding/WeddingWrap.tsx components/occasions/wedding/WeddingSectionHead.tsx components/occasions/wedding/why components/occasions/wedding/WeddingWhy.tsx components/occasions/wedding/WeddingWhy.test.tsx
git commit -m "feat(occasions): wedding Why StoryWall section"
```

---

### Task 15: RSVP

Design CSS: `.swr-*` (box, head, grid, right column). The two composites (`img_dcf89bd8` desktop, `img_f689116a` and `img_9c8bc844` mobile) are drawn in code, measured from `$SP/crops/rsvp-*.png`. Each column is a container: the reply cards and their head are sized in `cqw` of the Without column, the phones' layout in `cqw` of the With column, and each phone's screen in `cqw` of the screen (`MockPhone`).

**Files:**
- Create: `components/occasions/wedding/rsvp/RsvpAppMark.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpNotification.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpColumnHead.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpWithout.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpHostHeader.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpGuestListScreen.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpFormScreen.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpStatsScreen.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpWith.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpComparison.tsx`
- Create: `components/occasions/wedding/rsvp/RsvpChecklist.tsx`
- Create: `components/occasions/wedding/WeddingRsvp.tsx`
- Test: `components/occasions/wedding/WeddingRsvp.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/occasions/wedding/WeddingRsvp.test.tsx`:

```tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingRsvp } from '@/components/occasions/wedding/WeddingRsvp';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingRsvp', () => {
    it('heads the section with both lines', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Μην αναρωτιέσαι ποιος θα έρθει. Όλες οι απαντήσεις σε ένα μέρος.');
    });

    it('draws the comparison as one picture with a localized name', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        const picture = screen.getByRole('img', { name: /^Χωρίς StoryWall οι απαντήσεις έρχονται διάσπαρτα/ });
        for (const name of ['Κατερίνα', 'Πέτρος', 'Μαρία', 'Θεοδώρα', 'Γιώργος']) expect(within(picture).getByText(name)).toBeInTheDocument();
        expect(within(picture).getByText('Νάντια Ευθυμίου')).toBeInTheDocument();
        expect(within(picture).getByText('Υποβολή RSVP')).toBeInTheDocument();
        expect(within(picture).getByText('265 ημέρες απομένουν · 15 Ιουλίου 2027')).toBeInTheDocument();
    });

    it('marks a no in red and a yes in green', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(within(screen.getByText('Πέτρος').closest('li')!).getByText('Όχι')).toHaveClass('text-[#d93a32]');
        expect(within(screen.getByText('Κατερίνα').closest('li')!).getByText('Ναι, 2 άτομα')).toHaveClass('text-[#2a6834]');
    });

    it('lists the four points beside the picture', async () => {
        render(await WeddingRsvp({ locale: 'el' }));
        expect(screen.getByText('ΟΛΕΣ ΟΙ ΑΠΑΝΤΗΣΕΙΣ')).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Όλες οι απαντήσεις σε ένα μέρος',
            'Ποιοι έρχονται',
            'Συνοδοί & παιδιά',
            'Απλή και γρήγορη διαδικασία',
        ]);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/WeddingRsvp.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/wedding/WeddingRsvp"`.

- [ ] **Step 3: RsvpAppMark**

`components/occasions/wedding/rsvp/RsvpAppMark.tsx`:

```tsx
import { Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import { FaFacebookMessenger, FaViber, FaWhatsapp } from 'react-icons/fa';

import { cn } from '@/lib/utils';

export type RsvpApp = 'viber' | 'whatsapp' | 'messenger' | 'email' | 'sms';

// Each app's color and mark. "SMS" is part of the picture, the same in every language.
const MARK: Record<RsvpApp, { className: string; icon: ReactNode }> = {
    viber: { className: 'bg-[#7360f2]', icon: <FaViber className="size-[5.2cqw]" /> },
    whatsapp: { className: 'bg-[#25d366]', icon: <FaWhatsapp className="size-[5.4cqw]" /> },
    messenger: {
        className: 'bg-[linear-gradient(45deg,#0099ff,#a033ff_60%,#ff5280_90%,#ff7061)]',
        icon: <FaFacebookMessenger className="size-[5cqw]" />,
    },
    email: { className: 'bg-[#f0614f]', icon: <Mail className="size-[4.8cqw]" strokeWidth={2} /> },
    sms: { className: 'bg-[#5cb85c]', icon: <span className="text-[2.6cqw] font-extrabold">SMS</span> },
};

// The badge of the app a reply came from: the app's round mark on a white ring.
export function RsvpAppMark({ app }: { app: RsvpApp }) {
    const mark = MARK[app];
    return (
        <span className="grid size-[11.8cqw] place-items-center rounded-full bg-white shadow-[0_1cqw_3cqw_rgba(70,38,24,0.18)]">
            <span className={cn('grid size-[8.6cqw] place-items-center rounded-full text-white', mark.className)}>{mark.icon}</span>
        </span>
    );
}
```

- [ ] **Step 4: RsvpNotification**

`components/occasions/wedding/rsvp/RsvpNotification.tsx`:

```tsx
import { Check, X } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import { type RsvpApp, RsvpAppMark } from '@/components/occasions/wedding/rsvp/RsvpAppMark';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingRsvpReplyCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

type RsvpNotificationProps = {
    app: RsvpApp;
    avatar: OccasionPhoto;
    // Where the app badge sits left of the card.
    badgeClassName: string;
    // The card's place, width and tilt.
    className: string;
    copy: WeddingRsvpReplyCopy;
};

// One reply as it lands on the couple's phone: the app, the guest, when, and the answer.
export function RsvpNotification({ app, avatar, badgeClassName, className, copy }: RsvpNotificationProps) {
    return (
        <li
            className={cn(
                'relative flex items-center gap-[4.5cqw] rounded-[3.4cqw] bg-[#fbf8f3] py-[3.2cqw] pr-[4cqw] pl-[3.5cqw] shadow-[0_2cqw_5cqw_-2cqw_rgba(70,38,24,0.28)]',
                className,
            )}
        >
            {/* App */}
            <span className={cn('absolute top-1/2 -translate-y-1/2', badgeClassName)}>
                <RsvpAppMark app={app} />
            </span>
            {/* Guest */}
            <MockPhoto className="size-[13.4cqw] shrink-0 rounded-full border-[0.6cqw] border-white" photo={avatar} sizes="64px" />
            <div className="min-w-0">
                <p className="m-0 text-[3.6cqw] leading-tight font-medium">{copy.name}</p>
                <p className="m-0 mt-[0.6cqw] text-[2.7cqw] leading-tight text-[#151313]/55">{copy.time}</p>
                {/* Answer */}
                <span
                    className={cn(
                        'mt-[1.6cqw] inline-flex items-center gap-[1.6cqw] rounded-full px-[3.8cqw] py-[1.6cqw] text-[3.4cqw] leading-none font-medium',
                        copy.going ? 'bg-[#e4f0e1] text-[#2a6834]' : 'bg-[#fde4e1] text-[#d93a32]',
                    )}
                >
                    {copy.going ? <Check className="size-[3.6cqw]" strokeWidth={2.4} /> : <X className="size-[3.6cqw]" strokeWidth={2.4} />}
                    {copy.answer}
                </span>
            </div>
        </li>
    );
}
```

- [ ] **Step 5: RsvpColumnHead and RsvpWithout**

`components/occasions/wedding/rsvp/RsvpColumnHead.tsx`:

```tsx
import { cn } from '@/lib/utils';

const PILL = {
    // Grey: the scattered replies.
    muted: 'bg-[linear-gradient(180deg,#eef0f2,#dfe2e6)] text-[#3d4148] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0.3em_0.8em_-0.4em_rgba(0,0,0,0.25)]',
    // Coral: StoryWall.
    brand: 'bg-[#fde3d9] text-[#e8604a]',
} as const;

type RsvpColumnHeadProps = {
    caption: string;
    // The head's font size; the pill and caption are sized from it.
    className: string;
    pill: string;
    tone: keyof typeof PILL;
};

// A column's pill and one-line caption.
export function RsvpColumnHead({ caption, className, pill, tone }: RsvpColumnHeadProps) {
    return (
        <div className={cn('flex flex-col items-center text-center', className)}>
            <span className={cn('inline-flex h-[2.5em] items-center rounded-full px-[1.5em] leading-none font-bold tracking-[0.12em]', PILL[tone])}>
                {pill}
            </span>
            <span className={cn('mt-[0.6em] text-[0.8em] leading-[1.3]', tone === 'muted' ? 'text-[#3d4148]' : 'text-[#6f6a64]')}>{caption}</span>
        </div>
    );
}
```

`components/occasions/wedding/rsvp/RsvpWithout.tsx`:

```tsx
import type { RsvpApp } from '@/components/occasions/wedding/rsvp/RsvpAppMark';
import { RsvpColumnHead } from '@/components/occasions/wedding/rsvp/RsvpColumnHead';
import { RsvpNotification } from '@/components/occasions/wedding/rsvp/RsvpNotification';
import type { WeddingRsvpReplyCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_RSVP_AVATARS } from '@/lib/occasions/weddingMedia';

// Same order as OccasionPages.WEDDING.rsvp.without.replies.
const RSVP_APPS: readonly RsvpApp[] = ['viber', 'whatsapp', 'messenger', 'email', 'sms'];

// Each card's place, width and tilt, and its badge's offset, as in the design.
const PLACEMENT = [
    { card: 'ml-[23%] w-[61%] rotate-3', badge: '-left-[13.4cqw]' },
    { card: 'ml-[17%] w-[65%] rotate-2', badge: '-left-[11cqw]' },
    { card: 'ml-[35%] w-[57%] rotate-3', badge: '-left-[15cqw]' },
    { card: 'ml-[19%] w-[72%] rotate-2', badge: '-left-[14cqw]' },
    { card: 'ml-[34%] w-[61%] rotate-2', badge: '-left-[12cqw]' },
] as const;

type RsvpWithoutProps = { caption: string; pill: string; replies: WeddingRsvpReplyCopy[] };

// Without StoryWall: five replies from five apps, scattered down the column.
export function RsvpWithout({ caption, pill, replies }: RsvpWithoutProps) {
    return (
        <div className="mx-auto w-[96%] [container-type:inline-size] min-[761px]:w-auto">
            <RsvpColumnHead caption={caption} className="text-[4.2cqw] min-[761px]:text-[5.1cqw]" pill={pill} tone="muted" />
            <ul className="m-0 mt-[3cqw] flex list-none flex-col gap-[2cqw] p-0">
                {replies.map((reply, index) => (
                    <RsvpNotification
                        app={RSVP_APPS[index]!}
                        avatar={WEDDING_RSVP_AVATARS[index]!}
                        badgeClassName={PLACEMENT[index]!.badge}
                        className={PLACEMENT[index]!.card}
                        copy={reply}
                        key={reply.name}
                    />
                ))}
            </ul>
        </div>
    );
}
```

- [ ] **Step 6: RsvpHostHeader and RsvpGuestListScreen**

`components/occasions/wedding/rsvp/RsvpHostHeader.tsx`:

```tsx
import { ChevronDown, LayoutGrid, Users } from 'lucide-react';

export type RsvpHostCopy = { couple: string; dashboard: string; module: string };

type RsvpHostHeaderProps = {
    // The "Active" pill beside the couple's names.
    active?: string;
    // A chevron on the module chip, as a menu.
    chevron?: boolean;
    copy: RsvpHostCopy;
};

// The top of the host dashboard: its label, the couple, and the RSVP module chip.
export function RsvpHostHeader({ active, chevron = false, copy }: RsvpHostHeaderProps) {
    return (
        <div className="px-[5cqw] pt-[3cqw]">
            {/* Dashboard and couple */}
            <p className="m-0 flex items-center gap-[1.4cqw] text-[3cqw] font-semibold tracking-[0.08em] text-[#151313]/50">
                <LayoutGrid className="size-[3.4cqw] text-[#ff765f]" strokeWidth={2} />
                {copy.dashboard}
            </p>
            <div className="mt-[1.4cqw] flex items-center justify-between gap-[2cqw]">
                <p className="m-0 truncate text-[5.2cqw] leading-tight font-bold">{copy.couple}</p>
                {active ? <span className="shrink-0 rounded-full bg-[#fde4e1] px-[2.6cqw] py-[1cqw] text-[3.4cqw] font-semibold text-[#e5484d]">{active}</span> : null}
            </div>
            {/* Module */}
            <div className="mt-[4cqw] flex items-center gap-[2.4cqw] rounded-[6cqw] bg-[#f8ece1] px-[5cqw] py-[5cqw] text-[4.2cqw] leading-none font-bold">
                <Users className="size-[4.6cqw] text-[#ff765f]" strokeWidth={2} />
                {copy.module}
                {chevron ? <ChevronDown className="ml-auto size-[4.4cqw] text-[#151313]/50" strokeWidth={2} /> : null}
            </div>
        </div>
    );
}
```

`components/occasions/wedding/rsvp/RsvpGuestListScreen.tsx`:

```tsx
import { MockStatusBar } from '@/components/occasions/wedding/mock/MockStatusBar';
import { type RsvpHostCopy, RsvpHostHeader } from '@/components/occasions/wedding/rsvp/RsvpHostHeader';
import type { WeddingRsvpGuestCopy } from '@/lib/occasions/weddingCopy';

type RsvpGuestListScreenProps = { host: RsvpHostCopy; list: WeddingRsvpGuestCopy[] };

// The host's list of replies, running off the bottom of the phone.
export function RsvpGuestListScreen({ host, list }: RsvpGuestListScreenProps) {
    return (
        <>
            <MockStatusBar />
            <RsvpHostHeader copy={host} />
            {/* Replies */}
            <ul className="m-0 mt-[3cqw] list-none px-[5cqw] py-0">
                {list.map((guest) => (
                    <li className="border-t border-[#151313]/8 py-[3.4cqw]" key={guest.name}>
                        <p className="m-0 truncate text-[4.6cqw] leading-tight font-bold">{guest.name}</p>
                        <p className="m-0 mt-[0.8cqw] text-[3.6cqw] leading-tight text-[#151313]/50">{guest.party}</p>
                        {guest.note ? <p className="m-0 mt-[1.8cqw] line-clamp-2 text-[3.8cqw] leading-snug">{guest.note}</p> : null}
                    </li>
                ))}
            </ul>
        </>
    );
}
```

- [ ] **Step 7: RsvpFormScreen**

`components/occasions/wedding/rsvp/RsvpFormScreen.tsx`. Spacing follows the center phone in `$SP/crops/rsvp-center.png` (title at 34 cqw from the top of the screen, submit button 160 to 172 cqw, tab bar from 196 cqw).

```tsx
import { ArrowLeft, CircleCheck, CircleX, Minus, Plus, Users } from 'lucide-react';

import { MockStatusBar } from '@/components/occasions/wedding/mock/MockStatusBar';
import { MockTabBar } from '@/components/occasions/wedding/mock/MockTabBar';
import type { WeddingRsvpFormCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

const LABEL = 'm-0 text-[2.9cqw] font-bold tracking-[0.06em] text-[#151313]/70';
const ANSWER = 'flex h-[13.3cqw] items-center justify-center gap-[1.8cqw] rounded-full border-[0.6cqw] text-[3.8cqw] font-semibold';
const ROUND = 'grid size-[7.4cqw] place-items-center rounded-full bg-white';

function Stepper({ label }: { label: string }) {
    return (
        <div className="flex h-[13.9cqw] items-center justify-between rounded-full bg-[#f8ece1] px-[3.2cqw]">
            <span className={ROUND}>
                <Minus className="size-[3.6cqw]" strokeWidth={2.4} />
            </span>
            <span className="text-[3.8cqw] font-bold">{label}</span>
            <span className={ROUND}>
                <Plus className="size-[3.6cqw]" strokeWidth={2.4} />
            </span>
        </div>
    );
}

// The guest's RSVP form with "Yes" picked.
export function RsvpFormScreen({ form, module }: { form: WeddingRsvpFormCopy; module: string }) {
    return (
        <>
            <MockStatusBar />
            {/* App bar */}
            <div className="relative flex items-center justify-center px-[5.5cqw] pt-[6.5cqw] pb-[2cqw]">
                <ArrowLeft className="absolute left-[5.5cqw] size-[5cqw]" strokeWidth={2} />
                <span className="flex items-center gap-[1.8cqw] text-[5cqw] leading-none font-bold">
                    <Users className="size-[5cqw] text-[#2fae8e]" strokeWidth={2} />
                    {module}
                </span>
            </div>
            <div className="px-[5.5cqw] pt-[9.5cqw]">
                <p className="m-0 text-[4.2cqw] font-bold">{form.title}</p>
                {/* Attending */}
                <p className={cn(LABEL, 'mt-[5.5cqw]')}>
                    {form.attend} <span className="font-medium text-[#151313]/40">{form.required}</span>
                </p>
                <div className="mt-[3.3cqw] grid grid-cols-2 gap-[3.3cqw]">
                    <span className={cn(ANSWER, 'border-[#3cc19b] bg-[#e6f7f0] text-[#1f8a6a]')}>
                        <CircleCheck className="size-[4.2cqw]" strokeWidth={2} />
                        {form.yes}
                    </span>
                    <span className={cn(ANSWER, 'border-[#ecd9c4] bg-white text-[#151313]/80')}>
                        <CircleX className="size-[4.2cqw]" strokeWidth={2} />
                        {form.no}
                    </span>
                </div>
                {/* Companions */}
                <p className={cn(LABEL, 'mt-[5cqw] text-center')}>{form.companions}</p>
                <div className="mt-[5.3cqw] flex flex-col gap-[3cqw]">
                    <Stepper label={form.adults} />
                    <Stepper label={form.children} />
                </div>
                {/* Message */}
                <p className={cn(LABEL, 'mt-[5.2cqw]')}>
                    {form.message} <span className="font-medium text-[#151313]/40">{form.optional}</span>
                </p>
                <p className="m-0 mt-[3.3cqw] h-[28cqw] rounded-[5cqw] bg-[#f8ece1] p-[4.4cqw] text-[4cqw] leading-snug text-[#151313]/35">{form.placeholder}</p>
                <p className="m-0 mt-[3cqw] text-right text-[3.2cqw] text-[#151313]/45">{form.counter}</p>
                {/* Submit */}
                <span className="mt-[6cqw] flex h-[12.2cqw] items-center justify-center rounded-full bg-[linear-gradient(90deg,#f45fbf,#ff8c42)] text-[3.8cqw] font-semibold text-white">
                    {form.submit}
                </span>
            </div>
            <MockTabBar />
        </>
    );
}
```

- [ ] **Step 8: RsvpStatsScreen**

`components/occasions/wedding/rsvp/RsvpStatsScreen.tsx`:

```tsx
import { CalendarClock, ChartColumn, FileText, List } from 'lucide-react';

import { MockStatusBar } from '@/components/occasions/wedding/mock/MockStatusBar';
import { MockTabBar } from '@/components/occasions/wedding/mock/MockTabBar';
import { type RsvpHostCopy, RsvpHostHeader } from '@/components/occasions/wedding/rsvp/RsvpHostHeader';
import type { WeddingRsvpStatsCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

// Stats, list, reports; stats is the open tab.
const TAB_ICONS = [ChartColumn, List, FileText] as const;

const ROW = 'flex items-baseline justify-between text-[3.6cqw]';

// The host's RSVP stats: deadline, four totals and attendance.
export function RsvpStatsScreen({ host, stats }: { host: RsvpHostCopy; stats: WeddingRsvpStatsCopy }) {
    return (
        <>
            <MockStatusBar />
            <RsvpHostHeader active={stats.active} chevron copy={host} />
            {/* Tabs */}
            <div className="mt-[4cqw] flex border-b border-[#151313]/8 px-[4cqw] text-[3.6cqw]">
                {stats.tabs.map((tab, index) => {
                    const Icon = TAB_ICONS[index]!;
                    return (
                        <span
                            className={cn(
                                'flex flex-1 items-center justify-center gap-[1.2cqw] border-b-[0.6cqw] py-[2.6cqw]',
                                index === 0 ? 'border-[#ff765f] font-semibold' : 'border-transparent text-[#151313]/55',
                            )}
                            key={tab}
                        >
                            <Icon className="size-[3.6cqw]" strokeWidth={2} />
                            {tab}
                        </span>
                    );
                })}
            </div>
            <div className="px-[5cqw]">
                {/* Deadline */}
                <div className="mt-[4cqw] flex items-center gap-[2.6cqw]">
                    <span className="grid size-[8cqw] shrink-0 place-items-center rounded-full bg-[#fde9e2] text-[#ff765f]">
                        <CalendarClock className="size-[4.2cqw]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[2.8cqw] tracking-[0.06em] text-[#e8604a]">{stats.deadline}</span>
                        <span className="mt-[0.6cqw] block truncate text-[3.4cqw] font-semibold">{stats.deadlineValue}</span>
                    </span>
                </div>
                {/* Totals */}
                <div className="mt-[4cqw] grid grid-cols-2 overflow-hidden rounded-[3cqw] border border-[#151313]/10">
                    {stats.tiles.map((tile) => (
                        <span className="flex flex-col items-center border-[#151313]/10 py-[3.6cqw] odd:border-r [&:nth-child(-n+2)]:border-b" key={tile.label}>
                            <span className="text-[7cqw] leading-none font-bold">{tile.value}</span>
                            <span className="mt-[1.4cqw] text-[2.6cqw] tracking-[0.06em] text-[#151313]/50">{tile.label}</span>
                        </span>
                    ))}
                </div>
                {/* Attendance */}
                <p className="m-0 mt-[4.4cqw] text-[2.8cqw] tracking-[0.06em] text-[#151313]/50">{stats.byCategory}</p>
                <div className={cn(ROW, 'mt-[2.6cqw]')}>
                    <span>{stats.coming}</span>
                    <span className="font-bold">
                        {stats.comingValue} <span className="font-normal text-[#151313]/40">{stats.comingShare}</span>
                    </span>
                </div>
                <span className="mt-[1.6cqw] block h-[1.6cqw] rounded-full bg-[#ff765f]" />
                <div className={cn(ROW, 'mt-[3cqw]')}>
                    <span className="text-[#151313]/55">{stats.notComing}</span>
                    <span className="font-bold">{stats.notComingValue}</span>
                </div>
            </div>
            <MockTabBar />
        </>
    );
}
```

- [ ] **Step 9: RsvpWith, RsvpComparison and RsvpChecklist**

`components/occasions/wedding/rsvp/RsvpWith.tsx`. A phone is 42% of the column wide and about 0.875 of the column tall, so the area's 612/575 leaves room for the tilted ones:

```tsx
import { MockPhone } from '@/components/occasions/wedding/mock/MockPhone';
import { RsvpColumnHead } from '@/components/occasions/wedding/rsvp/RsvpColumnHead';
import { RsvpFormScreen } from '@/components/occasions/wedding/rsvp/RsvpFormScreen';
import { RsvpGuestListScreen } from '@/components/occasions/wedding/rsvp/RsvpGuestListScreen';
import type { RsvpHostCopy } from '@/components/occasions/wedding/rsvp/RsvpHostHeader';
import { RsvpStatsScreen } from '@/components/occasions/wedding/rsvp/RsvpStatsScreen';
import type { WeddingRsvpFormCopy, WeddingRsvpGuestCopy, WeddingRsvpStatsCopy } from '@/lib/occasions/weddingCopy';

type RsvpWithProps = {
    caption: string;
    form: WeddingRsvpFormCopy;
    host: RsvpHostCopy;
    list: WeddingRsvpGuestCopy[];
    pill: string;
    stats: WeddingRsvpStatsCopy;
};

// With StoryWall: the host's list and stats tilted behind the guest's form.
export function RsvpWith({ caption, form, host, list, pill, stats }: RsvpWithProps) {
    return (
        <div className="[container-type:inline-size]">
            <RsvpColumnHead caption={caption} className="text-[3.2cqw]" pill={pill} tone="brand" />
            {/* Phones */}
            <div className="relative mt-[3cqw] aspect-[612/575]">
                <MockPhone className="absolute top-[3%] left-[0.5%] w-[42%] -rotate-4">
                    <RsvpGuestListScreen host={host} list={list} />
                </MockPhone>
                <MockPhone className="absolute top-0 left-[27%] z-10 w-[42%]">
                    <RsvpFormScreen form={form} module={host.module} />
                </MockPhone>
                <MockPhone className="absolute top-[4%] right-[0.5%] w-[42%] rotate-4">
                    <RsvpStatsScreen host={host} stats={stats} />
                </MockPhone>
            </div>
        </div>
    );
}
```

`components/occasions/wedding/rsvp/RsvpComparison.tsx`:

```tsx
import type { ReactNode } from 'react';

type RsvpComparisonProps = {
    // With StoryWall.
    after: ReactNode;
    // Without StoryWall.
    before: ReactNode;
    // What the picture shows, for assistive tech.
    label: string;
};

// Without and with StoryWall as one picture. From 761 px they sit side by side with a curved arrow
// between them; below, stacked.
export function RsvpComparison({ after, before, label }: RsvpComparisonProps) {
    return (
        <div aria-label={label} className="relative grid gap-6.5 min-[761px]:grid-cols-[38fr_62fr]" role="img">
            {before}
            <svg className="absolute top-[7%] left-[37%] hidden w-[11.5%] min-[761px]:block" fill="none" viewBox="0 0 120 90">
                <path d="M6 86C12 44 52 12 108 11" stroke="#d0623a" strokeLinecap="round" strokeWidth={2.4} />
                <path d="M98 3l11 8-10 9" stroke="#d0623a" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} />
            </svg>
            {after}
        </div>
    );
}
```

`components/occasions/wedding/rsvp/RsvpChecklist.tsx` (design: `.swr-right`, `.swr-all*`):

```tsx
import { Check } from 'lucide-react';

import type { WeddingCardCopy } from '@/lib/occasions/weddingCopy';

type RsvpChecklistProps = { items: WeddingCardCopy[]; pill: string };

// "All the answers": the right column's four points. From 901 px the pill scales with the column.
export function RsvpChecklist({ items, pill }: RsvpChecklistProps) {
    return (
        <div className="flex flex-col items-stretch [container-type:inline-size]">
            <p className="m-0 mt-1.5 mb-3.5 flex items-center self-center rounded-full bg-[#e4f0e1] px-6 py-3 text-[13px] leading-none font-bold tracking-[0.14em] whitespace-nowrap text-[#2a6834] min-[901px]:mt-[4.1cqw] min-[901px]:mb-0 min-[901px]:h-[11.9cqw] min-[901px]:px-[7cqw] min-[901px]:py-0 min-[901px]:text-[4.3cqw]">
                {pill}
            </p>
            <ul className="m-0 list-none rounded-3xl bg-white px-[clamp(14px,1.5vw,22px)] pt-2.5 pb-2 min-[901px]:my-auto">
                {items.map((item) => (
                    <li className="flex items-start gap-3 border-t border-[#151313]/9 py-3.25 first:border-t-0" key={item.title}>
                        <span aria-hidden="true" className="grid size-8.5 flex-none place-items-center rounded-full bg-[#e4f0e1]">
                            <Check className="size-4.25 text-[#2a6834]" strokeWidth={2.6} />
                        </span>
                        <div>
                            <h3 className="mt-0.75 mb-1 [font-family:var(--editorial)] text-[clamp(16px,1.3vw,19px)] leading-[1.15] font-normal tracking-[-0.025em]">
                                {item.title}
                            </h3>
                            <p className="m-0 text-[13.5px] leading-[1.4] text-[#7d776f]">{item.body}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

- [ ] **Step 10: WeddingRsvp**

`components/occasions/wedding/WeddingRsvp.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { RsvpChecklist } from '@/components/occasions/wedding/rsvp/RsvpChecklist';
import { RsvpComparison } from '@/components/occasions/wedding/rsvp/RsvpComparison';
import { RsvpWith } from '@/components/occasions/wedding/rsvp/RsvpWith';
import { RsvpWithout } from '@/components/occasions/wedding/rsvp/RsvpWithout';
import type { Locale } from '@/i18n/config';
import type {
    WeddingCardCopy,
    WeddingRsvpFormCopy,
    WeddingRsvpGuestCopy,
    WeddingRsvpReplyCopy,
    WeddingRsvpStatsCopy,
} from '@/lib/occasions/weddingCopy';

// RSVP: replies scattered across apps against StoryWall's form, list and stats, on a pink panel.
export async function WeddingRsvp({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING.rsvp' });
    const heading = t.raw('heading') as [string, string];
    const host = { couple: t('with.couple'), dashboard: t('with.dashboard'), module: t('with.module') };

    return (
        <section aria-labelledby="wedding-rsvp-title" className="bg-white pt-5.5 pb-15 font-[Arial,Helvetica,sans-serif] text-[#151313]">
            <div className="mx-auto w-[calc(100%-36px)] rounded-[22px] bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)] px-3 pt-9 pb-5 min-[761px]:w-[min(1220px,calc(100%-64px))] min-[761px]:rounded-[30px] min-[761px]:px-[clamp(16px,2.6vw,36px)] min-[761px]:pt-[clamp(40px,5vw,70px)] min-[761px]:pb-[clamp(30px,3.5vw,48px)]">
                {/* Heading */}
                <div className="mx-auto mb-[clamp(28px,3.5vw,46px)] max-w-250 text-center">
                    <h2
                        className="m-0 [font-family:var(--editorial)] text-[clamp(36px,4.4vw,68px)] leading-[1.02] font-normal tracking-[-0.04em]"
                        id="wedding-rsvp-title"
                    >
                        {heading[0]}{' '}
                        <span className="mx-auto block w-fit bg-clip-text pb-[0.08em] [background-image:var(--brand-gradient)] text-transparent">{heading[1]}</span>
                    </h2>
                    <p className="mx-auto mt-5.5 mb-0 max-w-160 text-[clamp(16px,1.45vw,19px)] leading-[1.55] text-[#6f6a64]">{t('intro')}</p>
                </div>
                {/* Comparison and points */}
                <div className="grid grid-cols-1 items-stretch gap-[clamp(14px,1.8vw,26px)] min-[901px]:grid-cols-[minmax(0,1022fr)_minmax(0,370fr)]">
                    <RsvpComparison
                        after={
                            <RsvpWith
                                caption={t('with.caption')}
                                form={t.raw('with.form') as WeddingRsvpFormCopy}
                                host={host}
                                list={t.raw('with.list') as WeddingRsvpGuestCopy[]}
                                pill={t('with.pill')}
                                stats={t.raw('with.stats') as WeddingRsvpStatsCopy}
                            />
                        }
                        before={
                            <RsvpWithout
                                caption={t('without.caption')}
                                pill={t('without.pill')}
                                replies={t.raw('without.replies') as WeddingRsvpReplyCopy[]}
                            />
                        }
                        label={t('label')}
                    />
                    <RsvpChecklist items={t.raw('checklist.items') as WeddingCardCopy[]} pill={t('checklist.pill')} />
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 11: Run the test**

Run: `npx vitest run components/occasions/wedding/WeddingRsvp.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 12: Lint and commit**

```bash
npx eslint components/occasions/wedding
git add components/occasions/wedding/rsvp components/occasions/wedding/WeddingRsvp.tsx components/occasions/wedding/WeddingRsvp.test.tsx
git commit -m "feat(occasions): wedding RSVP section drawn in HTML"
```

---

### Task 16: Private social

Design CSS: `.lp-priv*` with the `#idiotiko` overrides: one column up to 600 px, two up to 1000 px, four above.

**Files:**
- Create: `components/occasions/wedding/WeddingPrivate.tsx`
- Test: `components/occasions/wedding/WeddingPrivate.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/occasions/wedding/WeddingPrivate.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingPrivate } from '@/components/occasions/wedding/WeddingPrivate';
import { WEDDING_PRIVATE_ICONS } from '@/lib/occasions/weddingFeatures';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingPrivate', () => {
    it('shows four numbered cards, each with its icon', async () => {
        const { container } = render(await WeddingPrivate({ locale: 'el' }));
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ένα ιδιωτικό Social γεμάτο στιγμές. Για εσάς και τους ανθρώπους σας.');
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Ιδιωτικός τοίχος',
            'Διαχείριση από εσένα',
            'Ρόλοι καλεσμένων',
            'Λήψη σε αρχική ποιότητα',
        ]);
        const cards = screen.getAllByRole('listitem');
        expect(cards.map((card) => card.firstElementChild?.textContent)).toEqual(['01', '02', '03', '04']);
        const icons = [...container.querySelectorAll<HTMLElement>('[class*="mask-image"]')];
        expect(icons.map((icon) => icon.style.getPropertyValue('--icon'))).toEqual(WEDDING_PRIVATE_ICONS.map((src) => `url('${src}')`));
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/WeddingPrivate.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/wedding/WeddingPrivate"`.

- [ ] **Step 3: Implement**

`components/occasions/wedding/WeddingPrivate.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { WeddingSectionHead } from '@/components/occasions/wedding/WeddingSectionHead';
import { WeddingWrap } from '@/components/occasions/wedding/WeddingWrap';
import type { Locale } from '@/i18n/config';
import type { WeddingCardCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_PRIVATE_ICONS } from '@/lib/occasions/weddingFeatures';

// "Only for guests": four numbered cards on what keeps the wedding's social private.
export async function WeddingPrivate({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING.private' });
    const cards = t.raw('cards') as WeddingCardCopy[];

    return (
        <section
            aria-labelledby="wedding-private-title"
            className="bg-white pt-17.5 pb-20 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[561px]:pt-25 min-[561px]:pb-27.5"
        >
            <WeddingWrap>
                {/* Heading */}
                <WeddingSectionHead
                    className="mb-9 max-w-225 min-[561px]:mb-15"
                    heading={t.raw('heading') as [string, string]}
                    headingClassName="text-[clamp(40px,4.4vw,72px)] leading-[0.95] tracking-[-0.05em]"
                    id="wedding-private-title"
                    kicker={t('kicker')}
                >
                    <p className="mx-auto mt-5.5 mb-0 max-w-160 font-[Georgia,serif] text-[clamp(17px,1.3vw,20px)] leading-[1.45] text-[#151313]/78">{t('intro')}</p>
                </WeddingSectionHead>
                {/* Cards */}
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[561px]:gap-4.5 min-[601px]:grid-cols-2 min-[1001px]:grid-cols-4">
                    {cards.map((card, index) => (
                        <li
                            className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#fbedf1_0%,#fcefea_40%,#fdf1e8_70%,#fef5e9_100%)] px-6.5 pt-7.5 pb-8.5"
                            key={card.title}
                        >
                            <span
                                aria-hidden="true"
                                className="absolute top-1.5 right-4.5 bg-clip-text [background-image:var(--brand-gradient)] [font-family:var(--editorial)] text-[72px] leading-none text-transparent opacity-90 min-[561px]:text-[92px]"
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {/* A filter on a masked element is masked away, so the shadow is on a wrapper */}
                            <span className="mb-6 block w-fit drop-shadow-[0_4px_8px_rgba(230,126,105,0.14)]">
                                <GradientIcon className="size-14" src={WEDDING_PRIVATE_ICONS[index]!} />
                            </span>
                            <h3 className="relative mt-0 mb-2.5 [font-family:var(--editorial)] text-[clamp(24px,1.9vw,29px)] leading-[1.05] font-normal tracking-[-0.035em]">
                                {card.title}
                            </h3>
                            <p className="relative m-0 text-[15px] leading-[1.55] text-[#151313]/74">{card.body}</p>
                        </li>
                    ))}
                </ul>
            </WeddingWrap>
        </section>
    );
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/occasions/wedding/WeddingPrivate.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Lint and commit**

```bash
npx eslint components/occasions/wedding/WeddingPrivate.tsx components/occasions/wedding/WeddingPrivate.test.tsx
git add components/occasions/wedding/WeddingPrivate.tsx components/occasions/wedding/WeddingPrivate.test.tsx
git commit -m "feat(occasions): wedding private social cards"
```

---

### Task 17: Wedding features

Design CSS: `.lp-feat*` with the `#dynatotites` overrides. The design's last rule wins under 768 px: two columns at every width there (its 360 px one-column rule comes earlier in the file and loses). The page's `#features` anchor and the features section tracking move here from `OccasionFeatures`.

**Files:**
- Create: `components/occasions/wedding/WeddingFeatures.tsx`
- Test: `components/occasions/wedding/WeddingFeatures.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/occasions/wedding/WeddingFeatures.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingFeatures } from '@/components/occasions/wedding/WeddingFeatures';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));

afterEach(cleanup);

describe('WeddingFeatures', () => {
    it('shows the offered features in the design order, with shared copy where the wedding has none', async () => {
        render(await WeddingFeatures({ featureKeys: ['gallery', 'invitation', 'he_or_she', 'unknown'], locale: 'el' }));
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'Ηλεκτρονικό προσκλητήριο',
            'Φωτογραφίες καλεσμένων',
            'Αγόρι ή κορίτσι;',
        ]);
    });

    it('is the page features anchor, under one heading', async () => {
        const { container } = render(await WeddingFeatures({ featureKeys: ['invitation'], locale: 'el' }));
        expect(container.querySelector('section')).toHaveAttribute('id', 'features');
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Η δική σου ιστοσελίδα γάμου, με όλα όσα χρειάζεσαι.');
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/WeddingFeatures.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/wedding/WeddingFeatures"`.

- [ ] **Step 3: Implement**

`components/occasions/wedding/WeddingFeatures.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { GradientIcon } from '@/components/occasions/wedding/mock/GradientIcon';
import { WeddingSectionHead } from '@/components/occasions/wedding/WeddingSectionHead';
import { WeddingWrap } from '@/components/occasions/wedding/WeddingWrap';
import type { Locale } from '@/i18n/config';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';
import { weddingFeatures } from '@/lib/occasions/weddingFeatures';

type WeddingFeaturesProps = {
    // What the wedding plans offer (occasionFeatureKeys), so a module that is off is never advertised.
    featureKeys: string[];
    locale: Locale;
};

// Everything the wedding website does, on the dark band: five per row from 1101 px, two below.
export async function WeddingFeatures({ featureKeys, locale }: WeddingFeaturesProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    // The wedding's own words, else the shared line. A feature with neither is left out.
    const features = weddingFeatures(featureKeys).flatMap((feature) => {
        const copy = t.has(`features.${feature.key}.title`) ? t : common.has(`features.${feature.key}.title`) ? common : null;
        if (!copy) return [];
        return [{ ...feature, title: copy(`features.${feature.key}.title`), body: copy(`features.${feature.key}.body`) }];
    });

    return (
        <section
            aria-labelledby="wedding-features-title"
            className="bg-[#342525] bg-[radial-gradient(ellipse_at_14%_12%,rgba(174,78,67,0.3)_0%,transparent_44%),radial-gradient(ellipse_at_88%_78%,rgba(189,113,65,0.21)_0%,transparent_47%),linear-gradient(125deg,#3b2529_0%,#2e2328_42%,#302523_72%,#402a26_100%)] pt-17.5 pb-15.5 font-[Arial,Helvetica,sans-serif] text-white min-[601px]:pt-[clamp(75px,7vw,110px)] min-[601px]:pb-16.25 min-[761px]:pb-[clamp(70px,7vw,110px)]"
            id={OCCASION_SECTION_IDS.features}
            {...landingSectionAttributes('features')}
        >
            <WeddingWrap>
                {/* Heading */}
                <WeddingSectionHead
                    className="mb-9 max-w-250 min-[761px]:mb-14"
                    heading={t.raw('featuresHead.heading') as [string, string]}
                    headingClassName="text-[clamp(36px,9vw,46px)] leading-[1.05] tracking-[-0.05em] min-[768px]:text-[clamp(40px,4.6vw,76px)] min-[768px]:leading-[0.95]"
                    id="wedding-features-title"
                    kicker={t('featuresHead.kicker')}
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
                            <p className="m-0 text-[clamp(12px,3.25vw,14px)] leading-[1.48] text-white/66 min-[768px]:text-[14px] min-[768px]:leading-[1.5]">
                                {feature.body}
                            </p>
                        </li>
                    ))}
                </ul>
            </WeddingWrap>
        </section>
    );
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/occasions/wedding/WeddingFeatures.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Lint and commit**

```bash
npx eslint components/occasions/wedding/WeddingFeatures.tsx components/occasions/wedding/WeddingFeatures.test.tsx
git add components/occasions/wedding/WeddingFeatures.tsx components/occasions/wedding/WeddingFeatures.test.tsx
git commit -m "feat(occasions): wedding features on the dark band"
```

---

### Task 18: Demo phones

The design's demo picture (crop: `$SP/crops/demo.png`, 1115×1120 in the original): the profile menu phone tilted left, and the feed phone tilted right in front of it. `LandingDemo` (Task 8) takes it as `phones` and names it once with `previewLabel`.

**Files:**
- Create: `components/occasions/wedding/demo/DemoProfileScreen.tsx`
- Create: `components/occasions/wedding/demo/DemoFeedScreen.tsx`
- Create: `components/occasions/wedding/WeddingDemoPhones.tsx`
- Test: `components/occasions/wedding/WeddingDemoPhones.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/occasions/wedding/WeddingDemoPhones.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, type Messages } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { WeddingDemoPhones } from '@/components/occasions/wedding/WeddingDemoPhones';
import type { Locale } from '@/i18n/config';
import type { WeddingDemoFeedCopy, WeddingDemoProfileCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import el from '@/messages/el.json';

const t = createTranslator({ locale: 'el', messages: el as Messages, namespace: 'OccasionPages.WEDDING' });

function renderPhones(locale: Locale = 'el') {
    return render(
        <WeddingDemoPhones
            feed={t.raw('demo.feed') as WeddingDemoFeedCopy}
            locale={locale}
            mock={t.raw('mock') as WeddingMockCopy}
            profile={t.raw('demo.profile') as WeddingDemoProfileCopy}
        />,
    );
}

afterEach(cleanup);

describe('WeddingDemoPhones', () => {
    it('draws the profile menu and the feed', () => {
        renderPhones();
        expect(screen.getByText('Nicole M.')).toBeInTheDocument();
        for (const item of ['Εκδηλώσεις', 'Πλάνα', 'Λειτουργίες', 'Αποσύνδεση', 'Προφίλ']) expect(screen.getByText(item)).toBeInTheDocument();
        expect(screen.getByText('Nicole & Samuel')).toBeInTheDocument();
        expect(screen.getByText('Emily R.')).toBeInTheDocument();
    });

    it("underlines the page's language", () => {
        renderPhones('el');
        expect(screen.getByText('EL')).toHaveClass('underline');
        expect(screen.getByText('EN')).not.toHaveClass('underline');
        cleanup();
        renderPhones('en');
        expect(screen.getByText('EN')).toHaveClass('underline');
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/occasions/wedding/WeddingDemoPhones.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/occasions/wedding/WeddingDemoPhones"`.

- [ ] **Step 3: DemoProfileScreen**

`components/occasions/wedding/demo/DemoProfileScreen.tsx`:

```tsx
import { ArrowLeft, Calendar, Camera, CreditCard, Layers, LogOut, Pencil } from 'lucide-react';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { Locale } from '@/i18n/config';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingDemoProfileCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

// Events, plans, features.
const MENU_ICONS = [Calendar, CreditCard, Layers] as const;
// The language switch shows both codes; the page's own is underlined.
const LANGUAGES: readonly Locale[] = ['en', 'el'];

const PILL = 'flex h-[13cqw] w-[54cqw] items-center gap-[3cqw] rounded-full bg-white/15 px-[5cqw] text-[3.8cqw] leading-none font-medium';

type DemoProfileScreenProps = { copy: WeddingDemoProfileCopy; locale: Locale; photo: OccasionPhoto };

// The guest's menu on the brand gradient, with the Profile panel sliding in over its right side.
export function DemoProfileScreen({ copy, locale, photo }: DemoProfileScreenProps) {
    return (
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#ef5f8a_0%,#f47a76_42%,#f6995d_100%)] text-white">
            {/* Account */}
            <div className="flex w-[64%] items-center gap-[4cqw] pt-[30cqw] pr-[3cqw] pl-[8cqw]">
                <span className="relative shrink-0">
                    <MockPhoto className="block size-[18cqw] rounded-full border-[0.8cqw] border-white" photo={photo} sizes="80px" />
                    <span className="absolute -right-[0.6cqw] bottom-0 grid size-[6cqw] place-items-center rounded-full border-[0.6cqw] border-white bg-[#ff765f]">
                        <Pencil className="size-[2.8cqw]" strokeWidth={2.4} />
                    </span>
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[4.6cqw] font-bold">{copy.name}</span>
                    <span className="mt-[0.8cqw] block truncate text-[3.4cqw] text-white/80">{copy.email}</span>
                </span>
            </div>
            {/* Language */}
            <div className="mx-[8cqw] mt-[7cqw] flex w-[60%] justify-center gap-[4cqw] border-b border-white/40 pb-[4cqw] text-[3.8cqw] font-semibold">
                {LANGUAGES.map((language) => (
                    <span
                        className={language === locale ? 'underline decoration-[0.5cqw] underline-offset-[1.6cqw]' : 'text-white/70'}
                        key={language}
                    >
                        {language.toUpperCase()}
                    </span>
                ))}
            </div>
            {/* Menu */}
            <ul className="m-0 mt-[6cqw] flex list-none flex-col items-start gap-[3.6cqw] px-[6cqw] py-0">
                {copy.menu.map((item, index) => {
                    const Icon = MENU_ICONS[index]!;
                    return (
                        <li className={PILL} key={item}>
                            <Icon className="size-[4.6cqw]" strokeWidth={1.8} />
                            {item}
                        </li>
                    );
                })}
            </ul>
            {/* Sign out */}
            <span className={cn(PILL, 'absolute bottom-[18cqw] left-[6cqw]')}>
                <LogOut className="size-[4.6cqw]" strokeWidth={1.8} />
                {copy.signOut}
            </span>
            {/* Profile panel, cut by the screen's edge */}
            <div className="absolute top-[22cqw] -right-[10%] bottom-[30%] left-[64%] rounded-[5cqw] bg-white px-[5cqw] pt-[9cqw] text-[#151313] shadow-[-2cqw_0_6cqw_rgba(70,38,24,0.18)]">
                <span className="flex items-center gap-[1cqw] text-[3cqw] text-[#ff765f]">
                    <ArrowLeft className="size-[3cqw]" strokeWidth={2} />
                    {copy.back}
                </span>
                <p className="m-0 mt-[6cqw] text-[5cqw] font-bold">{copy.title}</p>
                <div className="mt-[4cqw] rounded-[4cqw] border border-[#151313]/8 p-[4cqw]">
                    <span className="relative block w-fit">
                        <MockPhoto className="block size-[17cqw] rounded-full" photo={photo} sizes="64px" />
                        <span className="absolute right-0 bottom-0 grid size-[5.4cqw] place-items-center rounded-full bg-[#ff765f] text-white">
                            <Camera className="size-[3cqw]" strokeWidth={2} />
                        </span>
                    </span>
                    <p className="m-0 mt-[4cqw] truncate text-[3.8cqw] font-bold">{copy.panelName}</p>
                    <p className="m-0 mt-[1cqw] truncate text-[3cqw] text-[#151313]/50">{copy.email}</p>
                    <p className="m-0 mt-[5cqw] text-[2.8cqw] tracking-[0.08em] text-[#151313]/50">{copy.nameLabel}</p>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: DemoFeedScreen**

`components/occasions/wedding/demo/DemoFeedScreen.tsx`, built from the hero feed's parts (Task 12):

```tsx
import { Plus } from 'lucide-react';

import { FeedAppBar } from '@/components/occasions/wedding/feed/FeedAppBar';
import { FeedComposer } from '@/components/occasions/wedding/feed/FeedComposer';
import { FeedCover } from '@/components/occasions/wedding/feed/FeedCover';
import { FeedPostAuthor, FeedPostPhotos } from '@/components/occasions/wedding/feed/FeedPost';
import { FeedStories } from '@/components/occasions/wedding/feed/FeedStories';
import type { WeddingDemoFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import type { WEDDING_DEMO_MEDIA } from '@/lib/occasions/weddingMedia';

type DemoFeedScreenProps = { copy: WeddingDemoFeedCopy; media: typeof WEDDING_DEMO_MEDIA; mock: WeddingMockCopy };

// The wedding feed: countdown, cover, stories, composer and the latest post, with the add button.
export function DemoFeedScreen({ copy, media, mock }: DemoFeedScreenProps) {
    return (
        <>
            <FeedAppBar units={mock.units} />
            <FeedCover date={copy.date} photo={media.cover} place={copy.place} title={copy.title} />
            <FeedStories badge={mock.scheduleBadge} labels={mock.stories} stories={media.stories} viewer={media.viewer} />
            <FeedComposer placeholder={mock.composer} viewer={media.viewer} />
            {/* Latest post */}
            <div className="border-t border-[#151313]/8 px-[2.6cqw] pt-[3.5cqw]">
                <FeedPostAuthor face={media.post.author} name={copy.author} time={copy.time} />
                <div className="mt-[2.6cqw]">
                    <FeedPostPhotos photos={media.post.photos} />
                </div>
            </div>
            {/* Add */}
            <span className="absolute right-[4cqw] bottom-[4cqw] grid size-[13cqw] place-items-center rounded-full bg-[linear-gradient(135deg,#ff6f93,#ff936a)] text-white">
                <Plus className="size-[7cqw]" strokeWidth={2.2} />
            </span>
        </>
    );
}
```

`import type { WEDDING_DEMO_MEDIA }` is a type-only import of a value, used only in `typeof`, so nothing ships twice.

- [ ] **Step 5: WeddingDemoPhones**

`components/occasions/wedding/WeddingDemoPhones.tsx`. The root takes the width classes of the picture it replaces in `LandingDemo`:

```tsx
import { DemoFeedScreen } from '@/components/occasions/wedding/demo/DemoFeedScreen';
import { DemoProfileScreen } from '@/components/occasions/wedding/demo/DemoProfileScreen';
import { MockPhone } from '@/components/occasions/wedding/mock/MockPhone';
import type { Locale } from '@/i18n/config';
import type { WeddingDemoFeedCopy, WeddingDemoProfileCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_DEMO_MEDIA } from '@/lib/occasions/weddingMedia';

type WeddingDemoPhonesProps = {
    feed: WeddingDemoFeedCopy;
    locale: Locale;
    mock: WeddingMockCopy;
    profile: WeddingDemoProfileCopy;
};

// The demo section's picture, drawn: the profile menu phone, and the feed phone in front of it.
export function WeddingDemoPhones({ feed, locale, mock, profile }: WeddingDemoPhonesProps) {
    return (
        <div className="relative aspect-[1115/1120] w-[min(620px,118vw)] max-w-none translate-x-[-2vw] min-[761px]:w-[min(720px,37vw)] min-[761px]:translate-x-0 min-[761px]:translate-y-[10px]">
            <MockPhone className="absolute top-[14.5%] left-[17%] w-[40%] -rotate-9">
                <DemoProfileScreen copy={profile} locale={locale} photo={WEDDING_DEMO_MEDIA.profile} />
            </MockPhone>
            <MockPhone className="absolute top-[1.5%] left-[52%] w-[40%] rotate-10">
                <DemoFeedScreen copy={feed} media={WEDDING_DEMO_MEDIA} mock={mock} />
            </MockPhone>
        </div>
    );
}
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run components/occasions/wedding/WeddingDemoPhones.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Types, lint, commit**

```bash
npx tsc --noEmit
npx eslint components/occasions/wedding
git add components/occasions/wedding/demo components/occasions/wedding/WeddingDemoPhones.tsx components/occasions/wedding/WeddingDemoPhones.test.tsx
git commit -m "feat(occasions): wedding demo phones in HTML"
```

---

### Task 19: Assemble the wedding page

`OccasionPage` hands WEDDING to the new `WeddingContent` and keeps `OccasionContent` for every other occasion. `WeddingContent` does not import `landing.css` and renders no `.landing-page` wrapper; the page's tokens come from `LANDING_TOKENS_CLASS` on the shell (Task 3).

**Files:**
- Modify: `lib/occasions/occasionFaq.ts`, `lib/occasions/occasionFaq.test.ts`
- Create: `components/occasions/wedding/WeddingFaqAnswer.tsx`
- Test: `components/occasions/wedding/WeddingFaqAnswer.test.tsx`
- Create: `components/occasions/wedding/WeddingContent.tsx`
- Modify: `components/occasions/OccasionPage.tsx`
- Test: `components/occasions/OccasionPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `lib/occasions/occasionFaq.test.ts` (and add `occasionFaqLinkHref` to its `@/lib/occasions/occasionFaq` import):

```ts
describe('occasionFaqLinkHref', () => {
    it('links to the plans, and to the QR page only while it is live', () => {
        expect(occasionFaqLinkHref('pricing', null)).toBe('#pricing');
        expect(occasionFaqLinkHref('qr', '/el/qr-code-gamou')).toBe('/el/qr-code-gamou');
        expect(occasionFaqLinkHref('qr', null)).toBeNull();
    });
});
```

`components/occasions/wedding/WeddingFaqAnswer.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WeddingFaqAnswer } from '@/components/occasions/wedding/WeddingFaqAnswer';

afterEach(cleanup);

describe('WeddingFaqAnswer', () => {
    it('adds the link after the answer', () => {
        render(<WeddingFaqAnswer answer="Plans start at 119€." href="#pricing" label="See the plans" />);
        expect(screen.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '#pricing');
        expect(screen.getByText(/Plans start at 119€\./)).toBeInTheDocument();
    });

    it('shows the answer alone when the link has nowhere to go', () => {
        render(<WeddingFaqAnswer answer="Put the QR code on the tables." href={null} label="About wedding QR codes" />);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('Put the QR code on the tables.')).toBeInTheDocument();
    });
});
```

`components/occasions/OccasionPage.test.tsx`:

```tsx
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OccasionContent } from '@/components/occasions/OccasionContent';
import { OccasionPage } from '@/components/occasions/OccasionPage';
import { WeddingContent } from '@/components/occasions/wedding/WeddingContent';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import { findOccasion } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: vi.fn() }));
vi.mock('@/lib/occasions/demoPreview.server', () => ({ loadOccasionDemoPreview: vi.fn(async () => null) }));
vi.mock('@/lib/landingThemes', () => ({ getLandingThemes: vi.fn(async () => []) }));
// The page is checked by which layout it hands its props to; each layout has its own tests.
vi.mock('@/components/occasions/OccasionContent', () => ({ OccasionContent: () => null }));
vi.mock('@/components/occasions/wedding/WeddingContent', () => ({ WeddingContent: () => null }));
vi.mock('@/components/occasions/OccasionStructuredData', () => ({ OccasionStructuredData: () => null }));

// Both types on, both with a demo, no plans on sale.
const CONFIG = {
    eventTypes: [
        { eventTypeKey: 'WEDDING', isEnabled: true, hasDemo: true },
        { eventTypeKey: 'BAPTISM', isEnabled: true, hasDemo: true },
    ],
    memberRolesByEventType: {},
    modules: [],
    planTiers: [],
} as unknown as AppConfigResponseDto;

// The layout element under the hydration boundary, after the structured data.
async function layout(eventType: 'WEDDING' | 'BAPTISM') {
    const page = await OccasionPage({ locale: 'el', occasion: findOccasion(eventType)! });
    return (page.props as { children: ReactElement<Record<string, unknown>>[] }).children[1]!;
}

beforeEach(() => {
    vi.mocked(serverPublicConfigGet).mockResolvedValue(CONFIG);
    vi.mocked(loadOccasionDemoPreview).mockClear();
});

describe('OccasionPage', () => {
    it('renders the wedding layout with its prices, demo and QR links, and no demo snapshot', async () => {
        const wedding = await layout('WEDDING');
        expect(wedding.type).toBe(WeddingContent);
        expect(wedding.props).toMatchObject({
            demoHref: routes.demoEventType(eventTypeSlug('WEDDING')),
            price: { range: 'none' },
            qrHref: '/el/qr-code-gamou',
        });
        expect(loadOccasionDemoPreview).not.toHaveBeenCalled();
    });

    it('keeps every other occasion on the shared layout', async () => {
        const baptism = await layout('BAPTISM');
        expect(baptism.type).toBe(OccasionContent);
        expect(loadOccasionDemoPreview).toHaveBeenCalledWith('BAPTISM', 'el');
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/occasions/occasionFaq.test.ts components/occasions/wedding/WeddingFaqAnswer.test.tsx components/occasions/OccasionPage.test.tsx`
Expected: FAIL, `occasionFaqLinkHref is not a function` and `Failed to resolve import` for `WeddingFaqAnswer` and `WeddingContent`.

- [ ] **Step 3: Where an FAQ link points**

Append to `lib/occasions/occasionFaq.ts`, and add `import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';` at the top:

```ts
// Where an FAQ link goes: the plans on this page, or the QR wedding page while it is live (else null,
// and the answer shows without a link).
export function occasionFaqLinkHref(to: OccasionFaqLinkTarget, qrHref: string | null): string | null {
    return to === 'qr' ? qrHref : `#${OCCASION_SECTION_IDS.pricing}`;
}
```

- [ ] **Step 4: WeddingFaqAnswer**

`components/occasions/wedding/WeddingFaqAnswer.tsx` (design: `.lp-faq-link`, underlined, text color inherited):

```tsx
type WeddingFaqAnswerProps = {
    answer: string;
    // null: the link's page is off, so the answer stands alone.
    href: string | null;
    label?: string;
};

// An FAQ answer, with its "Learn more →" link when it has one.
export function WeddingFaqAnswer({ answer, href, label }: WeddingFaqAnswerProps) {
    if (!href || !label) return answer;
    return (
        <>
            {answer}{' '}
            <a className="focus-ring text-inherit underline underline-offset-3" href={href}>
                {label}
                <span aria-hidden="true"> →</span>
            </a>
        </>
    );
}
```

- [ ] **Step 5: WeddingContent**

`components/occasions/wedding/WeddingContent.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta, type LandingFinalCtaCopy } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeroTransition } from '@/components/landing/LandingHeroTransition';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingReviews } from '@/components/landing/LandingReviews';
import { OccasionCampaignBanner } from '@/components/occasions/OccasionCampaignBanner';
import { OccasionLinks } from '@/components/occasions/OccasionLinks';
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { WeddingDemoPhones } from '@/components/occasions/wedding/WeddingDemoPhones';
import { WeddingFaqAnswer } from '@/components/occasions/wedding/WeddingFaqAnswer';
import { WeddingFeatures } from '@/components/occasions/wedding/WeddingFeatures';
import { WeddingHero } from '@/components/occasions/wedding/WeddingHero';
import { WeddingPrivate } from '@/components/occasions/wedding/WeddingPrivate';
import { WeddingRsvp } from '@/components/occasions/wedding/WeddingRsvp';
import { WeddingWhy } from '@/components/occasions/wedding/WeddingWhy';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import { type OccasionFaqEntry, occasionFaqEntries, occasionFaqLinkHref } from '@/lib/occasions/occasionFaq';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import type { WeddingDemoFeedCopy, WeddingDemoProfileCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_FINAL_CTA_IMAGE } from '@/lib/occasions/weddingMedia';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type HowCopy = { heading: [string, string]; kicker: string; steps: { title: string }[] };

type WeddingContentProps = {
    campaign: OccasionCampaign | null;
    // null: no wedding demo; the demo band, the demo and the hero's demo link are left out.
    demoHref: string | null;
    featureKeys: string[];
    locale: Locale;
    occasion: Occasion;
    price: OccasionPriceValues;
    // The QR wedding page while it is live, else null.
    qrHref: string | null;
    theme: OccasionThemeId | null;
};

// The wedding page, section by section as in the design, with the landing's shared sections.
export async function WeddingContent({ campaign, demoHref, featureKeys, locale, occasion, price, qrHref, theme }: WeddingContentProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.WEDDING' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const createHref = occasionCreateHref(occasion, campaign);
    const bold = (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>;
    const how = t.raw('how') as HowCopy;
    const faq = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, price)).map(
        (entry): [string, ReactNode] => [
            entry.q,
            <WeddingFaqAnswer
                answer={entry.a}
                href={entry.link ? occasionFaqLinkHref(entry.link.to, qrHref) : null}
                key={entry.q}
                label={entry.link?.label}
            />,
        ],
    );
    const finalCta: LandingFinalCtaCopy = { ...(t.raw('finalCta') as LandingFinalCtaCopy), cta: t.rich('finalCta.cta', { b: bold }) };

    return (
        // The footer's motion toggle and the marquee read LandingMotionProvider.
        <LandingMotionProvider>
            <OccasionPageShell className={LANDING_TOKENS_CLASS} theme={theme}>
                {/* Campaign banner */}
                {campaign?.banner ? <OccasionCampaignBanner campaign={campaign} locale={locale} /> : null}

                {/* Hero */}
                <WeddingHero
                    alternatePaths={occasionAlternatePaths(occasion)}
                    campaign={campaign}
                    createHref={createHref}
                    demoHref={demoHref}
                    locale={locale}
                    price={price}
                />

                {/* How it works */}
                <LandingHowItWorks
                    copy={{
                        eyebrow: how.kicker,
                        headingStart: how.heading[0],
                        headingEnd: how.heading[1],
                        steps: how.steps.map((step, index) => ({ title: step.title, description: t.rich(`how.steps.${index}.body`, { b: bold }) })),
                    }}
                />

                {/* Demo band, down to the demo */}
                {demoHref ? <LandingHeroTransition href="#demo" /> : null}

                {/* Why StoryWall */}
                <WeddingWhy locale={locale} qrHref={qrHref} />

                {/* RSVP */}
                <WeddingRsvp locale={locale} />

                {/* Private social */}
                <WeddingPrivate locale={locale} />

                {/* Demo, drawn in HTML */}
                {demoHref ? (
                    <LandingDemo
                        copy={t.rich('demo.copy', { b: bold, br: () => <br /> })}
                        eyebrow={t('demo.kicker')}
                        heading={t.raw('demo.heading') as string[]}
                        href={demoHref}
                        phones={
                            <WeddingDemoPhones
                                feed={t.raw('demo.feed') as WeddingDemoFeedCopy}
                                locale={locale}
                                mock={t.raw('mock') as WeddingMockCopy}
                                profile={t.raw('demo.profile') as WeddingDemoProfileCopy}
                            />
                        }
                        previewLabel={t('demo.previewLabel')}
                    />
                ) : null}

                {/* Features */}
                <WeddingFeatures featureKeys={featureKeys} locale={locale} />

                {/* Reviews from weddings */}
                <LandingReviews eventType={occasion.eventType} />

                {/* Plans */}
                <LandingPricing eventType={occasion.eventType} heading={t('pricing.heading')} intro={t('pricing.intro')} kicker={t('pricing.kicker')} />

                {/* FAQ, one answer open at a time */}
                <LandingFaq centered copy={{ heading: landing('faq.heading'), intro: t('faqIntro'), items: faq }} group="wedding-faq" />

                {/* Final call to action */}
                <LandingFinalCta centered copy={finalCta} href={createHref} image={WEDDING_FINAL_CTA_IMAGE} />

                {/* Other occasions */}
                <OccasionLinks locale={locale} occasion={occasion} />

                {/* Footer */}
                <LandingFooter anchorBase={getPublicLandingPath(locale)} />
            </OccasionPageShell>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
```

`finalCta` keeps `heading` and `imageAlt` from the old copy (Task 10 merged the new keys into it) and adds the design's eyebrow, so the final CTA shows its kicker as the design does.

- [ ] **Step 6: OccasionPage picks the layout**

`components/occasions/OccasionPage.tsx` (whole file; Task 6 already added `price`):

```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OccasionContent } from '@/components/occasions/OccasionContent';
import { OccasionStructuredData } from '@/components/occasions/OccasionStructuredData';
import { WeddingContent } from '@/components/occasions/wedding/WeddingContent';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { getQrWeddingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { getLandingThemes } from '@/lib/landingThemes';
import { activeCampaign } from '@/lib/occasions/campaigns';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import { occasionFeatureKeys, occasionOffersThemes } from '@/lib/occasions/occasionFeatures';
import { occasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { Occasion } from '@/lib/occasions/occasions';
import { activeTheme } from '@/lib/occasions/themes';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';
import { makeQueryClient } from '@/lib/queryClient';
import { routes } from '@/lib/routes';

export async function OccasionPage({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const queryClient = makeQueryClient();
    let config: AppConfigResponseDto | null = null;

    try {
        config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort: the page still renders and useAppConfig() fetches on the client.
    }

    // Live only while the event type is on. Unknown (config failed) → render.
    const eventType = config?.eventTypes.find((candidate) => candidate.eventTypeKey === occasion.eventType);
    if (config && !eventType?.isEnabled) notFound();

    // The wedding page draws its own demo phones and has no themes row, so it loads neither.
    const wedding = occasion.eventType === 'WEDDING';
    const [preview, themes] = await Promise.all([
        eventType?.hasDemo && !wedding ? loadOccasionDemoPreview(occasion.eventType, locale) : null,
        !wedding && occasionOffersThemes(config, occasion.eventType) ? getLandingThemes(occasion.eventType, locale) : null,
    ]);
    const copy = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const featureKeys = occasionFeatureKeys(config, occasion.eventType, Object.keys(copy.raw('features') as Record<string, unknown>));
    const now = new Date();
    const price = occasionPriceValues(config, occasion.eventType);
    const campaign = activeCampaign(occasion.eventType, now);
    const demoHref = eventType?.hasDemo ? routes.demoEventType(eventTypeSlug(occasion.eventType)) : null;
    const theme = activeTheme(occasion.eventType, now);
    // Today the QR page is live whenever weddings are; this follows its own rule if that changes.
    const qrHref = qrWeddingPageLive(config) ? getQrWeddingPath(locale) : null;

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OccasionStructuredData locale={locale} occasion={occasion} price={price} />
            {wedding ? (
                <WeddingContent
                    campaign={campaign}
                    demoHref={demoHref}
                    featureKeys={featureKeys}
                    locale={locale}
                    occasion={occasion}
                    price={price}
                    qrHref={qrHref}
                    theme={theme}
                />
            ) : (
                <OccasionContent
                    campaign={campaign}
                    demoHref={demoHref}
                    featureKeys={featureKeys}
                    locale={locale}
                    occasion={occasion}
                    preview={preview}
                    theme={theme}
                    themes={themes}
                />
            )}
        </HydrationBoundary>
    );
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run lib/occasions components/occasions components/landing i18n`
Expected: PASS. `i18n/publicMessages.test.ts` walks the new files from `OccasionPage.tsx`; the only new client components (`WhyMarquee`, `OccasionPageShell`) read no messages.

- [ ] **Step 8: Types and lint**

```bash
npx tsc --noEmit
npx eslint components/occasions lib/occasions
```

Expected: no errors.

- [ ] **Step 9: First look in the browser**

With the dev server on `http://localhost:3000/` (memory "Dev server shares .next": open it only with `preview_start {url: "http://localhost:3000/"}`), open `/el/gamos`. Expected, top to bottom: hero, How it works, the demo band, Why StoryWall, RSVP, Private, Demo, Features (dark), Reviews, Plans, FAQ, final CTA, other occasions, footer. The header's How it works, Features, Plans and FAQ links scroll to their sections, and the demo band's button scrolls to the demo. Section-by-section comparison with the design is Task 21.

- [ ] **Step 10: Commit**

```bash
git add lib/occasions/occasionFaq.ts lib/occasions/occasionFaq.test.ts components/occasions/wedding/WeddingFaqAnswer.tsx components/occasions/wedding/WeddingFaqAnswer.test.tsx components/occasions/wedding/WeddingContent.tsx components/occasions/OccasionPage.tsx components/occasions/OccasionPage.test.tsx
git commit -m "feat(occasions): wedding page renders the redesigned layout"
```

---

### Task 20: Remove what only the old wedding layout used

**Files:**
- Modify: `components/qrWedding/QrWeddingContent.tsx`
- Modify: `lib/occasions/occasionMedia.ts`
- Modify: `messages/el.json`, `messages/en.json`

- [ ] **Step 1: The QR wedding page takes its final photo from the wedding map**

In `components/qrWedding/QrWeddingContent.tsx`, replace the import `import { occasionMedia } from '@/lib/occasions/occasionMedia';` with `import { WEDDING_FINAL_CTA_IMAGE } from '@/lib/occasions/weddingMedia';` and `image={occasionMedia('WEDDING')?.finalImage}` with `image={WEDDING_FINAL_CTA_IMAGE}`. Same photo as before.

- [ ] **Step 2: Drop the WEDDING media entry**

In `lib/occasions/occasionMedia.ts`, delete the whole `WEDDING: { … },` entry of `MEDIA` (its comment "The landing's hero already shows a wedding" included). `INVITATION_PHOTO`, `RSVP_PHOTO`, `WISH_PHOTO` and `asset` stay: baptism uses them.

- [ ] **Step 3: Drop the old wedding copy keys**

```bash
OLD=hero.headline,hero.lead,hero.promise,hero.imageAlt,themes,timeline,story,demoHeading,demoCopy,featuresIntro,howItWorksHeading,howItWorks,pricingHeading,pricingIntro
node "$SP/scripts/edit-occasion-copy.cjs" messages/el.json WEDDING - --remove "$OLD"
node "$SP/scripts/edit-occasion-copy.cjs" messages/en.json WEDDING - --remove "$OLD"
npx prettier --write messages/el.json messages/en.json
node "$SP/scripts/list-keys.cjs" messages/el.json WEDDING
```

Expected: two `... OccasionPages.WEDDING updated` lines, then the key paths. No path starts with `hero.headline`, `hero.lead`, `hero.promise`, `hero.imageAlt`, `themes`, `timeline`, `story`, `demoHeading`, `demoCopy`, `featuresIntro`, `howItWorksHeading`, `howItWorks`, `pricingHeading` or `pricingIntro`. Every path starts with one of `name`, `meta`, `hero` (`breadcrumb`, `kicker`, `h1`, `subtitle`, `body`, `trust`, `trustPrice`, `feed.*`, `cta`), `mock`, `how`, `why`, `rsvp`, `private`, `demo`, `featuresHead`, `features`, `pricing`, `faqIntro`, `faq [array 14]`, `finalCta` (`heading`, `imageAlt`, `eyebrow`, `copyStart`, `copyStrong`, `cta`). `git diff messages` shows hunks inside `OccasionPages.WEDDING` only.

- [ ] **Step 4: No stale references**

```bash
grep -rn "occasionMedia('WEDDING')" --include=*.ts --include=*.tsx . | grep -v node_modules
grep -rn "santorini\|honeymoon-paris" --include=*.ts --include=*.tsx . | grep -v node_modules
```

Expected: the first prints nothing. The second still lists `lib/landingMedia.ts`, `components/landing/LandingFinalCta.tsx`, `lib/forBusinessOccasions.ts`, `components/forBusiness/ForBusinessBenefits.tsx` and `lib/occasions/weddingMedia.ts`: the main landing and the business page use those photos, so no file under `public/landing` is deleted.

- [ ] **Step 5: Tests and types**

```bash
npx vitest run lib/occasions components/occasions components/qrWedding i18n
npx tsc --noEmit
```

Expected: PASS (copy parity, feature keys, the QR page copy test) and no type errors.

- [ ] **Step 6: Commit**

```bash
git add components/qrWedding/QrWeddingContent.tsx lib/occasions/occasionMedia.ts messages/el.json messages/en.json
git commit -m "chore(occasions): remove the old wedding layout's copy and media"
```

---

### Task 21: Verify the page

No new code unless a check fails. Fix a failure in the section's own file, rerun that section's test, and commit it as `fix(occasions): <what>`.

- [ ] **Step 1: Whole suite, types, lint**

```bash
npx vitest run
npx tsc --noEmit
npm run lint
```

Expected: all pass, no errors. Compare with the baseline from Task 1 Step 3; a failure that was there before is noted, not fixed here.

- [ ] **Step 2: Server HTML (SEO)**

With the dev server on `:3000`:

```bash
for URL in http://localhost:3000/el/gamos http://localhost:3000/weddings; do
  OUT="$SP/check-$(basename "$URL").html"
  curl -s -o "$OUT" -w "$URL %{http_code}\n" "$URL"
  echo "h1: $(grep -o '<h1' "$OUT" | wc -l)"
  grep -o '<link rel="canonical"[^>]*>' "$OUT"
  grep -o 'hreflang="[^"]*"' "$OUT" | sort -u
  echo "FAQ questions in JSON-LD: $(grep -o '"@type":"Question"' "$OUT" | wc -l)"
  echo "noindex: $(grep -c noindex "$OUT")"
done
grep -c "ιστοσελίδα γάμου" "$SP/check-gamos.html"
grep -c "Υποβολή RSVP" "$SP/check-gamos.html"
```

Expected for each URL: `200`, `h1: 1`, a canonical on `https://www.storywall.gr/el/gamos` or `/weddings`, hreflang `el`, `en`, `x-default`, `FAQ questions in JSON-LD: 14`, `noindex: 0`. The last two counts are ≥ 1: the h1 and the RSVP mock are in the server HTML. With config reachable, `grep -o "119€" "$SP/check-gamos.html" | head -1` finds the hero price.

- [ ] **Step 3: Section by section against the design**

Open the design (`http://localhost:4599/storywall-gamos-2.html`, server from the header section) and `http://localhost:3000/el/gamos` in two tabs of the browser pane. At 1440, 768 and 390 wide (`resize_window`), scroll both to each section and compare screenshots:

| Section | Look at |
| --- | --- |
| Hero | Breadcrumb, kicker, h1 gradient words, CTA shape, trust line, phone size and the four cards' places |
| How it works | Kicker, two-line gradient heading, bold words in the steps |
| Why StoryWall | Without card (tilted grey photos, two bubbles, ✕ list), the With card's QR row (stacked under 901 px), marquee tile sizes and the alternate drop, the four numbers, the chips |
| RSVP | Pink panel; five tilted cards with their app badges; arrow (761 px and up); three phones; the ALL ANSWERS column beside (901 px and up) or under |
| Private | One column to 600 px, two to 1000 px, four above; big numbers top right |
| Demo | Two tilted phones, the profile panel cut by the screen edge, kicker over the heading |
| Features | Dark warm band; two columns under 1101 px, five above |
| Plans, FAQ, final CTA | Centered headers; FAQ opens one answer at a time; FAQ 3 and 10 links; the CTA's bold "StoryWall" |

Then `/weddings` at 390 and 1440: English is longer, so check that nothing in the mocks is cut mid-word except where the design truncates (names, notes), and that `document.documentElement.scrollWidth <= innerWidth` is `true` in the javascript tool (no sideways page scroll).

- [ ] **Step 4: The page works without landing.css rules**

The reused sections ran inside `.landing-page` on the old layout, which resets links and images. In the javascript tool on `/el/gamos`:

```js
const main = document.querySelector('#top-preview');
({
    underlinedLinks: [...main.querySelectorAll('a')]
        .filter((a) => getComputedStyle(a).textDecorationLine.includes('underline') && !a.closest('details'))
        .map((a) => a.textContent.trim().slice(0, 40)),
    blueLinks: [...main.querySelectorAll('a')].filter((a) => getComputedStyle(a).color === 'rgb(0, 0, 238)').length,
    inlineImages: [...main.querySelectorAll('img')].filter((img) => getComputedStyle(img).display === 'inline').length,
});
```

Expected: `underlinedLinks` lists only the QR step title while hovered (none at rest), `blueLinks: 0`, `inlineImages: 0`. Underlined FAQ links inside `<details>` are the design's. If a reused section shows a default link or an inline image, add the reset to that element in the shared component (`text-inherit no-underline` on the link, `block w-full` on the image): it matches what `.landing-page` gives the main landing, so the main landing does not change. Recheck the main landing in Step 6.

- [ ] **Step 5: Motion**

On `/el/gamos`: the marquee slides and stops while the pointer is on it. Click the footer's motion toggle: the marquee stands still as one row that scrolls sideways, and the hero stops. Click again: both move. The browser pane cannot emulate reduced motion; `hooks/useMarqueeMotion.test.tsx` (Task 9) covers it, so say so in the PR.

- [ ] **Step 6: Nothing else moved**

Open `/el`, `/` and the baptism page at 1440 and 390 and compare with the baseline screenshots in `$SP/baseline/` (Task 1 Step 4). Expected: same layout, same sections. Open `/el/qr-code-gamou`: the final CTA photo is the same as before.

- [ ] **Step 7: SEO guidelines**

Go through [docs/seo-guidelines.md](../../seo-guidelines.md) "Review checklist" and "Occasion pages" for `/el/gamos` and `/weddings`, using Step 2's output: one h1, title and description from `generateMetadata`, canonical, hreflang both ways, sitemap unchanged (same URLs), not noindex, OG image route unchanged, `FAQPage` JSON-LD, images with localized `alt` and sizes, server-rendered demo preview, plain `<a>` links. Write the result as a checklist for the PR; any rule that fails is a **BLOCKER** in the PR description.

---

### Task 22: Spec note and pull request

**Files:**
- Modify: `docs/superpowers/specs/2026-10-24-wedding-landing-redesign-design.md`

- [ ] **Step 1: Bring the spec in line with what was built**

In the spec:

- Replace the line starting `- Shared components gain only optional props:` with:

```markdown
- Shared components gain only optional props: `LandingHeader.className`, `LandingHeroVisual.comments` and `className` (passed through `OccasionHeroVisual`), rich step descriptions on `LandingHowItWorks`, `LandingDemo` `phones`, `previewLabel`, a string `eyebrow` and rich `copy`, a centered header and `kicker` on `LandingPricing`, a centered header, rich answers and an exclusive `group` on `LandingFaq` / `LandingFaqItem`, `LandingFinalCta.centered` with a rich `cta`, and `OccasionPageShell.className`. The main landing and baptism render as before.
```

- Replace these four lines whole (the first line of each pair is the spec today, the second its replacement):

```markdown
| 8 | Demo | Reuse `LandingDemo` | Children: new `WeddingDemoPhones` (profile menu phone + feed phone with countdown). Shown only when the wedding demo exists (`hasDemo`), as today. |
| 8 | Demo | Reuse `LandingDemo` | `phones`: new `WeddingDemoPhones` (profile menu phone + feed phone with countdown), named once by `previewLabel`. Shown only when the wedding demo exists (`hasDemo`), as today. |

- **Hero cards** (`WeddingPostCard`, `WeddingCommentCard`): built like `OccasionPostCard`: avatar, grey skeleton lines, photo, heart and comment icons; comment cards with a gradient heart or outline heart and one or two avatars.
- **Hero cards** (the existing `OccasionPostCard` and a new `OccasionCommentCard` next to it): avatar, grey skeleton lines, photo, heart and comment icons; comment cards with a gradient heart or outline heart and one or two avatars.

- **RSVP notifications** (`RsvpNotification`): app badge (brand marks as inline SVG; Email and SMS as plain icons), avatar, name, relative time, a green "Yes, 2 people" or red "No" pill.
- **RSVP notifications** (`RsvpNotification`): app badge (brand marks from react-icons, which render inline SVG; Email as a lucide icon, SMS as a text badge), avatar, name, relative time, a green "Yes, 2 people" or red "No" pill.

- Logic in `lib/` and `hooks/`: `weddingMedia.ts`, a `weddingPriceRange()` helper from config, `useMarqueeMotion`.
- Logic in `lib/` and `hooks/`: `weddingMedia.ts`, `occasionPriceValues()` (`lib/occasions/occasionPrice.ts`, generic for any event type), `useMarqueeMotion`.
```

- In the Verification list, replace `` `weddingPriceRange` `` with `` `occasionPriceValues` ``.

```bash
git add docs/superpowers/specs/2026-10-24-wedding-landing-redesign-design.md
git commit -m "docs(occasions): wedding spec matches what was built"
```

- [ ] **Step 2: Up to date with staging**

```bash
git fetch origin staging
git merge-base --is-ancestor origin/staging HEAD && echo "up to date"
```

If it is not up to date, bring staging in (in the desktop app's worktree, its `sync_with_base_branch` tool; elsewhere `git merge origin/staging`), resolve conflicts, and rerun Task 21 Step 1.

- [ ] **Step 3: Ask the owner, then open the pull request into staging**

Pushing and opening a PR are visible to others: ask the owner first. On their yes:

```bash
git push -u origin HEAD
gh pr create --base staging --title "feat(occasions): redesigned wedding landing page" --body-file "$SP/pr-body.md"
```

`$SP/pr-body.md`:

```markdown
## Summary
- `/el/gamos` and `/weddings` rebuilt from the owner's design `storywall-gamos-2.html`, section by section.
- Every picture with words in it (hero feed and cards, RSVP comparison, demo phones) is HTML, in both languages.
- Prices in the hero, FAQ, meta description and JSON-LD come from the live config.
- New wedding photos generated in Figma ("StoryWall wedding photos"); marquee, "Without" and final CTA photos reused from the design.
- Baptism and the main landing are unchanged; shared sections gained optional props only.

## SEO (docs/seo-guidelines.md)
<the checklist from Task 21 Step 7; any failure listed as **BLOCKER**>

## Test plan
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`
- [ ] `/el/gamos` and `/weddings` next to the design at 1440, 768 and 390
- [ ] Motion toggle pauses the marquee and the hero (reduced motion covered by the hook test; the browser pane cannot emulate it)
- [ ] Main landing, baptism and the QR wedding page unchanged
- [ ] English copy reviewed by the owner

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Then tell the owner the PR link and that the English copy waits for their review.
