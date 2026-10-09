# SEO guidelines

Every new route, page or feature is checked against this file before it ships. A **BLOCKER** stops the merge until it is fixed or the owner signs off in the PR. A **should** is flagged in review but does not block.

Helpers live in [lib/seo.ts](../lib/seo.ts): `SITE_URL`, `absoluteUrl`, `NO_INDEX`, `canonicalAlternates`, `landingLanguageAlternates`, `ogLocale`.

## Review checklist for every PR that adds or changes a route

Before merging, decide which of the three kinds the route is:

| Kind | Examples | Must have |
| --- | --- | --- |
| Indexable | Landing (`/`, `/el`), occasion pages, legal pages, contact | Server-rendered content, unique title and description, canonical, hreflang if localized, sitemap entry |
| Utility | Login, register, password reset, email links, newsletter confirm, demo | `robots: NO_INDEX` |
| Private | Event, feed, profile, admin, invite and share links | Path in `PRIVATE_PATHS` in [app/robots.ts](../app/robots.ts), plus `NO_INDEX` where a share link can leak |

A new route that fits none of these, or whose kind is unclear, is a **BLOCKER** until someone decides.

## Indexable pages

- **BLOCKER:** the main content (h1, body copy, key images) must be in the server-rendered HTML. A page that renders only in the browser (a client layout returning `null`, an MSW-backed demo, a fetch-on-mount screen) looks empty to Google. Check with `curl` on the URL: if the h1 and copy aren't there, the page isn't indexable.
- **BLOCKER:** exactly one `<h1>` per page.
- **BLOCKER:** a unique `title` and `description` from `generateMetadata`, localized. No two indexable pages share a title.
- **BLOCKER:** a canonical through `alternates.canonical`, built with `absoluteUrl` / `canonicalAlternates`. Never hand-write the origin or read `process.env` for it.
- **BLOCKER:** a localized page lists every language version plus `x-default` in `alternates.languages`, and every version points back at the others.
- **BLOCKER:** the page is listed in [app/sitemap.ts](../app/sitemap.ts) with the same URL as its canonical (no trailing slash, no query) and its language alternates.
- **BLOCKER:** not blocked by `robots.ts` and not marked noindex.
- **should:** an Open Graph image (the default `app/opengraph-image.tsx` is fine; occasion pages get their own).
- **should:** structured data (JSON-LD) where a type fits, e.g. `FAQPage` for an FAQ block, `Organization`/`WebSite` on the landing ([components/landing/LandingStructuredData.tsx](../components/landing/LandingStructuredData.tsx)).
- **should:** images use `next/image` with real `alt` text in the page's language, and explicit sizes to avoid layout shift.
- **should:** links between indexable pages use plain `<a>`/`<Link>` with `href`, never `onClick` navigation, so crawlers can follow them.

## Utility and private pages

- **BLOCKER:** utility pages (forms, email-link landings, demo) export `robots: NO_INDEX`. A layout can set it for a whole folder, as [app/(main)/demo/layout.tsx](../app/(main)/demo/layout.tsx) does.
- **BLOCKER:** a new session-gated or token-link path prefix is added to `PRIVATE_PATHS` in `robots.ts`. Kept as an explicit list on purpose; it is not derived from `proxy.ts`.
- **BLOCKER:** private and utility pages never appear in the sitemap.
- Never rely on `robots.txt` alone to hide a page that may already be linked from outside. `Disallow` stops crawling, not indexing; use `NO_INDEX` for that.

## Site-wide rules (do not break)

- **BLOCKER:** one production origin, `https://www.storywall.gr` (via `SITE_URL`). The bare domain redirects to `www` with a 308. Anything that emits a URL to search engines (canonicals, sitemap, hreflang, JSON-LD, OG) builds it from `absoluteUrl`.
- **BLOCKER:** `metadataBase` stays set in [lib/rootMetadata.ts](../lib/rootMetadata.ts) for both root layouts.
- **BLOCKER:** staging serves `Disallow: /` (the `NEXT_PUBLIC_APP_ENV === 'staging'` branch in `robots.ts`). Never remove it.
- **BLOCKER:** icons come from the files `app/favicon.ico`, `app/icon.svg` and `app/apple-icon.png`. Don't add an `icons` block to metadata; file icons override it anyway.
- **BLOCKER:** don't change an indexed URL (landing, legal, occasion pages) without a permanent (308) redirect from the old one, and update the sitemap and canonicals in the same PR.
- **BLOCKER:** don't change the locale routing in `proxy.ts` (default locale at `/`, Greek at `/el`, the 307 from `/` based on cookie or Accept-Language) without checking that crawlers can still reach every language version by its own URL.
- **should:** keep landing and occasion pages fast: no blocking client fetches above the fold, images sized, fonts through `next/font`.

## Occasion pages (the roadmap)

Full plan: the "Occasion pages roadmap" doc. Rules that apply when building them:

- One page per occasion, per language, using the slugs in the roadmap doc. Slugs are in the page's language and never change once live.
- **BLOCKER:** an occasion page only goes live once that event type is enabled in the app and has a working demo in that language. No half-empty pages.
- **BLOCKER:** the demo preview on an occasion page is server-rendered (static images or a server-rendered snapshot), not the live MSW demo. The live demo stays noindex and is linked as "Try the demo".
- **BLOCKER:** each page has its own copy written for that occasion and its searches. Swapping only the occasion name in a shared template counts as duplicate content.
- Each page has: an h1 with the main keyword, a short intro, how it works (QR → guests upload → live wall), the static demo preview, features relevant to that occasion, an FAQ (with `FAQPage` JSON-LD), and one clear CTA to sign up.
- Every new occasion page is added to the sitemap and hreflang in the same PR, and linked from the landing page.
- New languages are added one market at a time, each with its own URLs, hreflang and sitemap entries. English pages target English searches globally, not only Greece.
- Open decision: `.gr` tells Google the site is for Greece. Before pushing hard for markets outside Greece, decide whether to move to a `.com` with language folders. That move needs 308 redirects for every indexed URL.

## After shipping an indexable page

- Check it with `curl`: status 200, h1 and copy in the HTML, the right `<link rel="canonical">`, hreflang links, and no `noindex`.
- Request indexing in Google Search Console and confirm the sitemap shows the new URL.
- Watch Search Console coverage for "Crawled – currently not indexed" or "Duplicate without user-selected canonical" on the new URLs.
