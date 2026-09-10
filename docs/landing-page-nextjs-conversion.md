# Landing page → Next.js conversion guide

This doc is the reference for converting the standalone HTML landing page (currently a single exported
file, e.g. `StoryWall-v152-*.html`) into this Next.js app. It describes **this repo's conventions only** —
it does not describe the landing page's content, since that file is still being iterated on and its copy/
images will keep changing after conversion.

## Source file shape (context, not a spec to preserve)

The exported HTML is a single file that accumulated many incremental patches (~60 `<style id="sw-vNN-...">`
blocks and ~15 inline `<script>` blocks, each overriding or patching earlier ones). Treat these as a stack
of overrides, not as independent pieces to transcribe one-for-one:

- For any given element, later `<style>` blocks in document order win (plain CSS cascade + a lot of
  `!important`). Before writing a component's Tailwind classes, resolve what the **final computed style**
  for that element is — don't port every historical override block as a separate CSS rule.
- Inline `<script>` blocks implement: mobile menu toggle, a horizontal "filmstrip" carousel with captions,
  accordion sections (open/close, single-open-at-a-time for the FAQ), arrow/loop navigation, scroll-based
  parallax on the hero, and a mobile phone-mockup fade-in. Each of these becomes either a small hook
  (`hooks/useXyz.ts`) or local component state — not a `<script>` tag.
- The page is single-locale (`lang="el"`) in the export. All copy must be pulled out into `messages/en.json`
  / `messages/el.json` — see Localization below.

## Route placement

The landing page is a new, distinct public route — it does **not** touch the existing root `/` redirect
logic in [app/page.tsx](../app/page.tsx). Create a new top-level route, e.g. `app/(marketing)/welcome/page.tsx`
or `app/landing/page.tsx` (confirm the exact path/slug before finalizing — see Open questions). It needs its
own `layout.tsx` only if it requires different `<html>`/metadata/font setup than the root layout; otherwise
reuse the root layout.

Follow the thin-page convention: `page.tsx` composes; it does not own markup. Example shape:

```tsx
// app/landing/page.tsx
import { LandingContent } from '@/components/landing/LandingContent';

export default function LandingPage() {
    return <LandingContent />;
}
```

If the page needs server-fetched data (it likely doesn't — it's static marketing content), follow the
server-prefetch pattern described in the root `CLAUDE.md` under "Data Fetching". A pure marketing page with
no Spring-owned data does not need it.

## File/component structure

Mirror the existing `components/<domain>/` pattern used by `components/home/`, `components/auth/`, etc.:

```
components/landing/
  LandingContent.tsx        # top-level composition, thin
  LandingHeader.tsx          # nav / header from the hero section
  LandingHero.tsx
  LandingHeroTransitionStrip.tsx
  LandingStoriesFilmstrip.tsx   # the horizontal scroller with captions
  LandingDemoCta.tsx
  LandingExperienceIntro.tsx
  LandingExperienceStack.tsx    # the "swx-stack" feature/photo stack section
  LandingPricing.tsx
  LandingFaq.tsx                # accordion, single-open-at-a-time
  LandingFinalCta.tsx
  index.ts                      # barrel export, matching components/home/index.ts
```

Naming and count of files should follow the source file's actual `<section>` boundaries (hero, transition
strip, stories/platform, demo CTA, experience intro, experience stack, pricing, FAQ, final CTA) — split
further only if a section's own file gets large, per this repo's "small components" rule. Add the mandated
JSX section-boundary comments (`{/* Hero */}`, `{/* Pricing */}`, etc.) above each section per
`CLAUDE.md`'s Visual Hierarchy rules.

## Interactivity → hooks

Anything currently done with inline `<script>` + `document.querySelector` must become a hook under `hooks/`,
following the existing naming pattern (`useXyz.ts`), and return plain values/actions for the component to
render — no DOM queries inside components. Likely hooks:

- `useLandingFilmstrip.ts` — active index, click-to-select, caption text, swipe/drag if present.
- `useLandingAccordion.ts` — reusable for both the "stories" accordion and the FAQ accordion (single-open
  variant should be a parameter/option, not a second hook, if the logic is otherwise identical).
- `useLandingMobileMenu.ts` — open/close state for the mobile nav.
- `useLandingHeroParallax.ts` — only if the parallax effect is kept; prefer a framer-motion
  `useScroll`/`useTransform` pair over manual scroll-listener math (see Animation below).

Check `hooks/index.ts` and add exports there, matching the existing barrel pattern.

## Styling — Tailwind v4, no `tailwind.config.js`

This project uses Tailwind v4 with CSS-based theme config (`@theme` block), not a JS config file. Design
tokens live in [app/globals.css](../app/globals.css) as CSS custom properties, exposed as Tailwind color
utilities (`bg-primary`, `text-ink`, etc.).

- Reuse existing tokens where the landing page's palette matches (`--ink`, `--ink-muted`, `--canvas`,
  `--surface-muted`, `--primary`, `--accent-pink`, `--accent-orange`, `--radius-*` scale). Check
  `app/globals.css` before inventing a new color/radius value.
- If the landing page needs new brand tokens not in the theme (marketing pages often want a distinct
  palette/gradient from the in-app product), add them to the `@theme inline` block in `globals.css` as new
  `--color-*` variables, following the existing section comments (`/* Brand extras */` etc.) rather than
  hardcoding raw hex/rgb values in component `className`s.
- Do not hand-roll a parallel CSS file or `<style>` block for the landing page. Everything becomes Tailwind
  utility classes on JSX, with `cn()` from [lib/utils.ts](../lib/utils.ts) for conditional/merged classes,
  exactly like the rest of the app.
- One-off animations that aren't just entrance/scroll effects (custom keyframes) can go in `globals.css` as
  `@utility` blocks (see the existing `abhaya-body` example) if Tailwind's utilities + framer-motion can't
  express them directly.

## Animation — framer-motion

`framer-motion` is not yet a dependency; add it (`npm install framer-motion`). Use it for:

- Hero/section entrance animations (fade+slide on scroll into view) — `motion.div` + `whileInView`.
- The hero parallax effect — `useScroll` + `useTransform`, not manual scroll listeners.
- Filmstrip/carousel transitions and accordion open/close height animation — `AnimatePresence` +
  `motion.div` with `initial`/`animate`/`exit`, replacing the CSS-transition-based accordion in the source.

Keep animations declarative in the component/hook, not as global CSS keyframes wired to class toggles,
except where a pure CSS transition is simpler and framer-motion would be overkill (e.g. a simple hover
color change stays a Tailwind `transition-colors` utility).

## Localization — next-intl

All visible copy must be extracted into translation keys, not left inline. Follow the existing pattern:

1. Add a new top-level namespace to both `messages/en.json` and `messages/el.json`, e.g. `"LandingPage"`,
   structured by section to mirror the component split:
   ```json
   "LandingPage": {
     "hero": { "title": "...", "subtitle": "...", "cta": "..." },
     "filmstrip": { "eyebrow": "MORE STORIES", "heading": "...", "categories": { "birthday": "..." } },
     "pricing": { ... },
     "faq": { "items": [{ "question": "...", "answer": "..." }] }
   }
   ```
2. The **Greek copy in the source HTML is the `el.json` content** (source `lang="el"`); write the `en.json`
   equivalent as a translation, not a placeholder.
3. Consume via `useTranslations('LandingPage')` in client components (see
   [components/auth/OAuthButtons.tsx](../components/auth/OAuthButtons.tsx) for the pattern) or
   `getTranslations` in a server component/page.
4. Image `alt` text is user-facing copy too — localize it, don't leave the source file's English alt text
   hardcoded.

## Images

The source file links directly to external Pexels URLs for demo photos. Decide per-image whether to:
- keep as remote URLs through `next/image` with a configured remote pattern in `next.config.mjs`, or
- download and serve from `public/`.
Either way, replace raw `<img>` tags with `next/image` (fixed or `fill` layout matching the section's CSS),
and set meaningful, localized `alt` text.

## What NOT to bring over

- No inline `<style>` or `<script>` tags in the converted output.
- No `id`-based CSS hooks with version suffixes (`sw-v103-...`) — those existed only to scope one iteration's
  patch; in components, styling is scoped naturally by the component file.
- No global `!important` overrides — if the cascade requires one in the source, it's a signal the
  "final computed style" for that element needs to be re-derived cleanly (see Source file shape above),
  not copied with `!important` intact.

## Open questions to confirm before/while converting

- Exact route slug (`/welcome`, `/landing`, or something else) and whether it needs its own `layout.tsx`
  (fonts, `<html lang>` override, metadata).
- Whether demo images move into `public/` or stay remote (affects `next.config.mjs` `images.remotePatterns`).
- Any header/nav CTA that should link into the real app (e.g. "Δες το demo" → `routes` helper in
  [lib/routes.ts](../lib/routes.ts)) rather than an in-page anchor.
