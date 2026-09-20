# Landing page follow-up audit

## Scope

This document records the landing-page findings that were deliberately deferred after audit item 8. The first pass addressed image delivery, below-the-fold loading, document scrolling, pinch zoom, and the public/provider client boundary. It does not change the items below.

The audit was performed against the production build and a local browser run on 20 September 2026. Measurements are directional and should be re-captured with production analytics and real-user Core Web Vitals before setting performance budgets.

## Priority order

| Order | Finding | Why it matters | Suggested effort |
| --- | --- | --- | --- |
| 1 | Full translation catalog crosses the client boundary | Large HTML/RSC payload and unnecessary client parsing | Medium |
| 2 | SEO metadata is incomplete | Search and social previews lack the signals needed to index and present the page well | Medium |
| 3 | Locale URLs do not express canonical or alternate relationships | Duplicate-language pages cannot be interpreted reliably by search engines | Medium |
| 4 | Footer links are placeholders or target missing anchors | Broken navigation and crawl dead ends | Small, but needs product destinations |
| 5 | No skip link | Keyboard users must traverse the full header before main content | Small |
| 6 | Decorative images are exposed to assistive technology | Repetitive, non-useful announcements increase reading effort | Small |
| 7 | Decorative controls remain in the tab order | Keyboard navigation has unnecessary stops | Small |
| 8 | Motion/auto-advance controls need an explicit pause model | WCAG motion expectations and user control | Medium |
| 9 | Small pricing-note text has insufficient contrast | Low-vision users may not be able to read it | Small |
| 10 | Mobile menu needs a documented focus and escape test | Overlay navigation can trap or misplace focus | Small to medium |

## 9. Send only the translations each client island needs

### Evidence

`app/layout.tsx` currently passes the complete locale message catalog to `NextIntlClientProvider`. The landing page includes both server-rendered and client-rendered islands, so the full catalog is serialized even though each island needs only a small namespace. The audit observed a 323.8 KB HTML response; translation serialization is a material contributor.

### Risk

Every visitor downloads and parses messages for unrelated product areas. This increases initial transfer, HTML parsing, React Server Component payload size, and hydration work. It also makes future copy additions capable of slowing the homepage unintentionally.

### Recommended implementation

1. Keep `getTranslations` in server components for static landing sections. The first pass has already moved the static sections to this model.
2. Split the root provider so the public route gets a small `NextIntlClientProvider` message object that contains only namespaces required by client islands such as the hero, feature gates, pricing, and language switcher.
3. Leave the authenticated application provider with its broader message set until its routes are audited independently.
4. Prefer explicit namespace picks over passing the whole message object. Create one typed helper in `i18n/` that selects the public namespaces, rather than repeating ad-hoc object construction in routes.
5. Confirm missing-message fallback behavior in English and Greek before removing any namespace.

### Acceptance criteria

- The landing route no longer serializes unrelated application/admin strings.
- Both locales render without missing-message warnings.
- The initial HTML/RSC payload is measurably smaller than the pre-change baseline.
- Authenticated routes keep their current translations and do not regress.

### Verification

- Build production output and compare the route payload before and after.
- Navigate every public locale and exercise the client hero/menu/auth CTA.
- Add a test that asserts the public messages helper includes every client-island namespace.

## 10. Add complete SEO metadata

### Evidence

The root route lacks a canonical URL, Open Graph fields, Twitter card metadata, JSON-LD, sitemap output, and robots output. The title and description alone are not enough for dependable rich previews or product-page indexing.

### Recommended implementation

1. Define `metadataBase` from a single production-site URL environment setting.
2. Add page-level title, description, canonical, Open Graph, and Twitter metadata in `app/page.tsx` or a dedicated metadata helper.
3. Generate a 1200×630 social share image that represents the real product. Keep it localized only if the imagery/copy materially differs by locale.
4. Add organization and software-application JSON-LD only for facts that can be maintained accurately (name, URL, logo, description, category, and offers if the pricing is public and stable).
5. Add `app/sitemap.ts` and `app/robots.ts`, listing only canonical public URLs.

### Acceptance criteria

- View-source contains canonical, Open Graph, and Twitter tags with absolute production URLs.
- The page validates in a social-preview debugger.
- Sitemap and robots responses are reachable and contain no private/authenticated routes.
- Structured data validates without unsupported or speculative claims.

### Verification

- Run the Google Rich Results Test and a social preview debugger against staging/production.
- Test the resulting URLs under both supported locales.

## 11. Model locale routing as a search-engine relationship

### Evidence

The public experience supports more than one locale but does not publish canonical or `hreflang` alternate relationships. Search engines may treat localized pages as duplicate variants or choose the wrong one as canonical.

### Recommended implementation

1. Choose and document one URL scheme: locale prefixes such as `/en` and `/el`, or a single default root plus a locale-prefixed alternate.
2. Emit a self-referential canonical for each locale page.
3. Emit `alternates.languages` for every supported locale and `x-default` for the preferred language-picker/default page.
4. Make the sitemap list every language URL once, using the same canonical URL helper.
5. Never decide locale from an uncacheable cookie alone for pages intended to be indexable; redirects should be explicit and crawlers must be able to request a stable locale URL.

### Acceptance criteria

- Each localized page has exactly one self-canonical URL.
- Each page exposes reciprocal language alternates and `x-default`.
- Sitemaps contain the same URL set.
- Locale selection still works for human visitors without creating duplicate indexable URLs.

## 12. Replace placeholder and missing-anchor links

### Evidence

`LandingFooter.tsx` includes placeholder `href="#"` links for event, social, and legal links. Its Explore list targets `#platform` and `#journey`, which were not present as landing-page IDs in the audit. These create dead navigation for users and crawlers.

### Required product decision

Provide the intended destination for each footer label: an internal route, a real external profile, a policy URL, or removal. Do not silently map labels to unrelated destinations.

### Implementation approach

1. Replace parallel label and href arrays with localized link records (`label`, `href`, and optionally `external`).
2. Remove a link when there is no valid destination yet; plain text is better than a fake link.
3. Add the missing section IDs only when the link is intended to be an in-page anchor. Otherwise link to its correct route.
4. For external URLs, use the appropriate `target`/`rel` behavior consistently.

### Acceptance criteria

- No landing-page anchor has `href="#"`.
- Every internal fragment resolves to a unique element.
- Every footer link has a valid, intentional destination.

## 13. Add a keyboard skip link

### Evidence

The page begins with a multi-control header and has no visible-on-focus "Skip to main content" link. Keyboard and switch users have to tab through the header on every navigation.

### Recommended implementation

1. Add one localized skip link as the first focusable element in the root layout or public-page shell.
2. Point it to the landing main landmark (`id="main-content"`).
3. Keep it visually hidden until focused, with clear contrast and a non-animated appearance under reduced motion.
4. Ensure it works after client hydration as well as in server HTML.

### Acceptance criteria

- Pressing Tab from a fresh page load reveals the skip link.
- Activating it moves focus and viewport to the main landmark.
- It is available in every locale and on narrow screens.

## 14. Hide purely decorative collage media from assistive technology

### Evidence

Several experience-collage images use descriptive alt text even though they are visual texture alongside nearby semantic headings and copy. This makes screen-reader output repetitive and distracts from the story content.

### Recommended implementation

1. Classify each landing image as content, functional, or decorative.
2. Use empty `alt=""` for decorative media and avoid wrapping it in a focusable element.
3. Preserve meaningful alt text only where an image conveys information not available in adjacent copy.
4. For grouped content images, use one concise group label rather than narrating every background photograph.

### Acceptance criteria

- Screen-reader traversal announces only meaningful image information.
- No functional control loses its accessible name.
- Decorative images are not announced.

## 15. Remove non-functional tab stops

### Evidence

The landing interactions include decorative or interaction-looking elements that can appear in the tab sequence without a useful action. This adds friction for keyboard users, especially in media-heavy sections.

### Recommended implementation

1. Inspect the tab order in desktop and mobile layouts.
2. Use a semantic `button` only for controls that change state; use regular non-focusable elements for decoration.
3. If a visual card opens a destination, make the entire intended interaction one well-labeled link or button, not nested competing controls.
4. Do not use positive `tabIndex` values.

### Acceptance criteria

- Every Tab stop has a visible focus indicator and a meaningful action.
- Tab order follows the visual reading order.
- There are no keyboard-only dead ends.

## 16. Give users a way to pause moving or auto-advancing content

### Evidence

The landing page contains motion-rich carousels and animated media. `prefers-reduced-motion` is respected globally, but users who do not set that preference still need an explicit way to stop any automatically advancing, time-based content that persists for more than five seconds.

### Recommended implementation

1. Identify which elements actually advance content automatically, rather than merely using decorative CSS animation.
2. For every auto-advancing carousel, provide a visible, localized pause/play control with an accurate accessible name and state.
3. Pause on user interaction and when focus enters the component; never resume unexpectedly.
4. Keep reduced-motion as a default-off or static state for movement that does not add meaning.

### Acceptance criteria

- All auto-advancing content can be paused with keyboard and pointer input.
- The control communicates the current state to assistive technology.
- Content stays paused after navigation away and back within the page where practical.

## 17. Correct low-contrast pricing-note text

### Evidence

The small pricing note was measured at roughly 3.49:1 contrast at about 10 px. Normal text needs at least 4.5:1 contrast, and the small size compounds the readability issue.

### Recommended implementation

1. Increase contrast first, rather than relying only on a larger font.
2. Raise the smallest supporting copy to a readable size and line height.
3. Test all opacity utilities against their actual backgrounds, including hover and dark decorative surfaces.

### Acceptance criteria

- Normal-size text meets WCAG AA 4.5:1 contrast.
- The note remains readable at 200% browser zoom and on a mobile viewport.

## 18. Validate mobile-menu focus behavior

### Evidence

The mobile navigation overlay is interactive and changes the available controls. It requires an explicit test for focus placement, focus containment, Escape behavior, and focus restoration so a regression does not create an inaccessible overlay.

### Recommended implementation

1. On open, move focus to the menu title or first actionable item.
2. Keep focus within the open modal/navigation overlay.
3. Close on Escape and restore focus to the triggering menu button.
4. Mark background content inert while the overlay is open when supported, with an accessible fallback.
5. Ensure screen-reader labels state whether the menu is expanded.

### Acceptance criteria

- Keyboard-only users can open, navigate, and close the menu without escaping to background controls.
- Focus returns to the trigger after closing.
- Screen readers announce the menu state correctly.

## Suggested follow-up sequence

1. Decide the public URL/locale model and footer destinations.
2. Implement scoped translation messages and measure the payload reduction.
3. Implement metadata, canonicals, alternates, sitemap, and robots from the finalized URL model.
4. Address the small, isolated accessibility fixes (skip link, decorative alt text, tab order, contrast).
5. Test motion controls and the mobile menu with keyboard, screen reader, reduced motion, 200% zoom, and a narrow viewport.

## Regression checklist

- Production build, TypeScript, and lint pass.
- Both locales render without missing translations.
- Keyboard Tab / Shift+Tab order is complete and visible.
- Browser zoom and pinch zoom work.
- Browser back/forward restores document scroll position.
- Lighthouse and real-device checks show no new LCP, CLS, or accessibility regression.
