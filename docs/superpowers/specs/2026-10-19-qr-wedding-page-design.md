# Wedding QR page and landing SEO fixes — design

2026-10-19. Rules: [docs/seo-guidelines.md](../../seo-guidelines.md).

## Goal

Rank for "QR γάμου" and its variants in Greece, and for "wedding QR code" in English, with one indexable page per language about the wedding QR alone. Say plainly that the QR is included in every plan. Fix the landing's SEO gaps found on the way.

## Why (competitor research, 2026-10-19)

The top Google.gr results for "QR γάμου" are invitation.gr, tomonogramma.gr, easywedding.gr, planning.wedding and weddie.app. What they share:

- A page about the wedding QR alone, never a homepage.
- The search phrase at the start of the title, the h1 and the description.
- Headings phrased as the questions people ask: what it is, where to put it, what to write on the sign, what it costs, whether guests need an app.
- A price or "δωρεάν" in the snippet. The QR alone sells for 35–50 €; planning.wedding gives it free up to 30 photos.
- Only one of the five has the keyword in its slug (weddie ranks with `/el/gallery`). A keyword slug helps a little; the title, h1 and content are what rank.

Google.gr autocomplete for "qr γ" suggests "qr γαμου" first, then "qr για φωτογραφιες γαμου", "qr code για γαμο" and "qr code για ανεβασμα φωτογραφιων".

Production today has two indexable URLs (the landing in each language). Nothing targets these searches: the Greek landing title has no "QR" and no "γάμος", the wedding page `/el/gamos` is unreleased, and the landing's pricing section is missing from the server HTML.

## Decisions

| Topic | Decision |
| --- | --- |
| Pages | `/el/qr-code-gamou` (Greek) and `/wedding-qr-code` (English). Final once live. |
| Live gate | Live on production at once, not behind `UNRELEASED_PAGES_LAUNCHED`. 404 when `/api/config` says the WEDDING event type is off. A failed config fetch does not hide the page. |
| Offer wording | "Το QR γάμου περιλαμβάνεται σε κάθε πακέτο" / "The QR code is included in every plan". Never "δωρεάν" or "free" for something that needs a paid plan. |
| Precondition | QR upload is on for every wedding plan, START included. The owner turns it on in admin; the launch check reads `/api/config` to confirm before the page ships. |
| Layout | Hybrid: landing-style hero, an article-style guide with question headings, wedding pricing, FAQ, final call to action. |
| Copy | Claude drafts both languages; the owner reviews before merge. The English page is written for English searches, not translated from Greek. |
| Printable sign | Out of scope. The page gives ready-to-copy sign wording. A host-facing printable table card with the event's own QR is a separate task. |
| Offer schema | None, as on the landing: prices are indicative and come from config. Prices reach crawlers through the server-rendered pricing cards. |
| Share image | The default `/opengraph-image`. |

## Routing

| URL | Result |
| --- | --- |
| `/el/qr-code-gamou` | Greek page |
| `/wedding-qr-code` | English page |
| `/en/wedding-qr-code` | 308 → `/wedding-qr-code` |
| `/en/qr-code-gamou`, `/el/wedding-qr-code`, any other mix | 404 |

- `lib/qrWeddingPage.ts` (new): `QR_WEDDING_PATHS: Record<Locale, string>`, `getQrWeddingPath(locale)`, `isQrWeddingPath(pathname)`, `qrWeddingLanguageAlternates()` (both languages plus `x-default` → the English URL), mirroring the partner page's helpers in `i18n/publicLocale.ts` and `lib/seo.ts`.
- Greek route: `app/(landing)/[slug]/qr-code-gamou/page.tsx`, rendering only when `slug === 'el'`, like `[slug]/epaggelmaties/page.tsx`.
- English route: `app/(landing)/wedding-qr-code/page.tsx`, like `for-business/page.tsx`.
- The `/en/wedding-qr-code` redirect lives in `app/(landing)/[slug]/[occasion]/page.tsx`, next to the existing `/en/<occasion>` redirect.
- `proxy.ts`: `publicPageLocale` (or the proxy's lookup) returns each URL's own locale, so the page renders in its language for every visitor and crawler.
- `publicTwinPath` maps each QR URL to the other, so the language switcher swaps pages.
- `isLandingPath` in `lib/signupSource.ts` includes `/wedding-qr-code` (`/el/...` is already covered), so the visit source and analytics page path work from both pages.

## SEO plumbing

- Metadata: `buildIndexableMetadata` with the page's own title, description and keywords, `qrWeddingLanguageAlternates()` and `imagePath: OG_IMAGE_PATH`.
- Sitemap: both URLs with their alternates, `changeFrequency: 'weekly'`, `priority: 0.8`, listed only while WEDDING is enabled (same source as the page gate).
- Structured data (`components/qrWedding/QrWeddingStructuredData.tsx`): Organization reference, `Service` (name, description, url, inLanguage, provider), `BreadcrumbList` (home → this page) and `FAQPage` from the FAQ copy.
- Internal links: a footer link on the landing, occasion and QR pages ("QR γάμου" / "Wedding QR code"), next to the partner link.

## Page

`components/qrWedding/QrWeddingPage.tsx` is the server entry: it prefetches `/api/config` into the query cache (like `OccasionPage`), applies the WEDDING gate and composes the sections. Sections reuse landing components where they exist.

1. **Hero** (`QrWeddingHero`, new; same frame as `OccasionHero`): `LandingHeader` with the language alternates, the keyword h1, a headline, a lead sentence, the "included in every plan" line, the create button (`routes.events.new({ type: 'wedding' })` via `occasionCreateHref`), and the wedding phone visual from `occasionMedia('WEDDING')`.
2. **How it works**: `LandingHowItWorks` with the page's three steps.
3. **Guide** (`QrWeddingGuide`, new, server component): three question headings (h2) with short answers. "Where to put it" is a short list; "What to write on the sign" shows three ready-to-copy texts and one tip.
4. **Pricing**: `LandingPricing eventType="WEDDING"` with the heading "Πόσο κοστίζει το QR γάμου;" / "How much does a wedding QR code cost?". The hero line answers it; the cards show the prices.
5. **FAQ**: `LandingFaq` with the page's questions, different from the guide's.
6. **Final call to action**: `LandingFinalCta` with the wedding final image.
7. **Footer** and **cookie consent**.

Each fact has one home: "included in every plan" appears only in the hero (and in the meta description, which is not on the page).

Copy lives in a new `QrWeddingPage` namespace in `messages/el.json` and `messages/en.json`. Client islands reuse namespaces already in `PUBLIC_CLIENT_NAMESPACES`; the new sections are server components and need no client messages.

### Draft copy — Greek

- **Title:** QR Code Γάμου για Φωτογραφίες Καλεσμένων | StoryWall
- **Description:** Οι καλεσμένοι σκανάρουν το QR γάμου και ανεβάζουν φωτογραφίες και βίντεο σε ένα κοινό άλμπουμ. Χωρίς εφαρμογή. Περιλαμβάνεται σε κάθε πακέτο.
- **Keywords:** QR γάμου, QR code γάμου, QR code για φωτογραφίες γάμου, QR code για γάμο, QR code για ανέβασμα φωτογραφιών, φωτογραφίες γάμου από καλεσμένους, κοινό άλμπουμ γάμου
- **h1:** QR γάμου για φωτογραφίες καλεσμένων
- **Headline:** Ένα QR στα τραπέζια. **Όλες οι φωτογραφίες σε ένα άλμπουμ.**
- **Lead:** Οι καλεσμένοι σκανάρουν και ανεβάζουν φωτογραφίες και βίντεο από το κινητό τους. Χωρίς εφαρμογή, χωρίς λογαριασμό.
- **Included line:** Το QR γάμου περιλαμβάνεται σε κάθε πακέτο.
- **CTA:** Φτιάξε το QR του γάμου σου
- **How it works:** "Ένα QR. Όλος ο γάμος."
  1. Δημιούργησε — Φτιάξε το StoryWall του γάμου σου σε λίγα λεπτά.
  2. Τύπωσε το QR — Βάλ' το στα τραπέζια, στην είσοδο ή στο μπαρ.
  3. Οι καλεσμένοι ανεβάζουν — Σκανάρουν με την κάμερα του κινητού και ανεβάζουν φωτογραφίες και βίντεο.
- **Guide:**
  - *Τι είναι το QR γάμου;* Ένας κωδικός που βάζεις στον χώρο του γάμου. Οι καλεσμένοι τον σκανάρουν με την κάμερα του κινητού και ανεβάζουν φωτογραφίες και βίντεο σε ένα κοινό άλμπουμ. Εσύ τα βλέπεις όλα σε ένα σημείο.
  - *Πού να βάλετε το QR στον γάμο;* Στην είσοδο της δεξίωσης · Πάνω σε κάθε τραπέζι · Στο μπαρ · Δίπλα στο photo booth · Στο ευχαριστήριο, για όσους στείλουν φωτογραφίες αργότερα
  - *Τι να γράψετε στην πινακίδα;* Γράψτε ένα από αυτά κάτω από το QR:
    - «Σκανάρετε και ανεβάστε τις φωτογραφίες σας από τον γάμο μας!»
    - «Τραβήξατε κάτι ωραίο; Σκανάρετε το QR και μοιραστείτε το μαζί μας.»
    - «Η δική σας ματιά στη μέρα μας. Ανεβάστε φωτογραφίες και βίντεο.»
    - Tip: Αν έχετε καλεσμένους από το εξωτερικό, γράψτε το και στα αγγλικά.
- **Pricing heading:** Πόσο κοστίζει το QR γάμου;
- **FAQ:**
  - Χρειάζονται εφαρμογή ή λογαριασμό οι καλεσμένοι; — Όχι. Σκανάρουν το QR και ανεβάζουν από τον browser του κινητού.
  - Ανεβαίνουν και βίντεο; — Ναι. Από το ίδιο QR ανεβαίνουν φωτογραφίες και βίντεο.
  - Ποιος βλέπει τις φωτογραφίες; — Μόνο όσοι προσκαλείς. Το άλμπουμ του γάμου σου είναι ιδιωτικό.
  - Μπορώ να κατεβάσω όλες τις φωτογραφίες; — Ναι. Στο άλμπουμ διαλέγεις πολλές μαζί και τις κατεβάζεις.
  - Μέχρι πότε ανεβάζουν οι καλεσμένοι; — Όσο το StoryWall σου είναι online. Το πακέτο ορίζει για πόσο και μπορείς να το επεκτείνεις.
  - Θα τα καταφέρουν οι μεγαλύτεροι καλεσμένοι; — Ναι. Ανοίγουν την κάμερα, σκανάρουν και πατούν ανέβασμα.
- **Final CTA:** "Το QR του γάμου σου, έτοιμο σε λίγα λεπτά." — Φτιάξε το StoryWall του γάμου σου και τύπωσε το QR για τα τραπέζια.
- **Footer link:** QR γάμου

### Draft copy — English

- **Title:** Wedding QR Code for Guest Photos | StoryWall
- **Description:** Guests scan your wedding QR code and upload photos and videos to one shared album. No app, no sign-up. Included in every plan.
- **Keywords:** wedding QR code, QR code for wedding photos, QR code upload wedding photos, wedding photo sharing, shared wedding album, guest photo app
- **h1:** Wedding QR code for guest photos
- **Headline:** One QR code on the tables. **Every guest photo in one album.**
- **Lead:** Guests scan with their phone camera and upload photos and videos. No app, no account.
- **Included line:** The QR code is included in every plan.
- **CTA:** Create your wedding QR code
- **How it works:** "One QR code. The whole wedding."
  1. Create — Set up your wedding's StoryWall in a few minutes.
  2. Print the QR code — Put it on the tables, at the entrance or at the bar.
  3. Guests upload — They scan with their phone camera and add photos and videos.
- **Guide:**
  - *What is a wedding QR code?* A code you place around your venue. Guests scan it with their phone camera and upload photos and videos to one shared album, so you see every guest's photos in one place.
  - *Where to put the QR code at your wedding:* At the reception entrance · On every table · At the bar · Next to the photo booth · On your thank-you cards, for photos that come in later
  - *What to write on the QR sign:* Pick one for under the QR code:
    - "Scan to share your photos from our wedding!"
    - "Got a great shot? Scan the code and share it with us."
    - "Our day through your eyes. Upload your photos and videos here."
    - Tip: If some guests don't read English, add a line in their language.
- **Pricing heading:** How much does a wedding QR code cost?
- **FAQ:**
  - Do guests need an app or an account? — No. They scan the code and upload from their phone's browser.
  - Can guests upload videos too? — Yes. The same QR code takes photos and videos.
  - Who can see the photos? — Only the people you invite. Your wedding album is private.
  - Can I download all the photos? — Yes. In the album, select as many as you like and download them.
  - How long can guests keep uploading? — As long as your StoryWall is online. Your plan sets how long, and you can extend it.
  - Will older guests manage? — Yes. They open the camera, scan and tap upload.
- **Final CTA:** "Your wedding QR code, ready in minutes." — Create your wedding's StoryWall and print the QR code for the tables.
- **Footer link:** Wedding QR code

## Landing fixes

1. **Title and description** (`LandingPage.meta`):
   - el: `Φωτογραφίες καλεσμένων με QR, χωρίς app | StoryWall` — "Οι καλεσμένοι σκανάρουν ένα QR και ανεβάζουν φωτογραφίες και βίντεο από το κινητό, για γάμο, βάπτιση ή πάρτι. Χωρίς εφαρμογή."
   - en: `Guest photos with a QR code, no app | StoryWall` — "Guests scan a QR code and upload photos and videos from their phone, for weddings, baptisms and parties. No app needed."
   The landing keeps the broad message; the QR page owns "QR γάμου", so the two don't compete for it.
2. **FAQPage schema**: `LandingStructuredData` adds a `FAQPage` built from `LandingPage.faq.items`.
3. **Pricing in the server HTML**: production `/el` has no `id="pricing"` section in its HTML. Find why the server render returns null (likely `useLandingPricing`'s `active` on the server) and make the default event type's cards render on the server. Confirm with `curl`.
4. **Greek alt text**: the two English `imageAlt` values in `messages/el.json` (demo preview, wedding couple) get Greek text.
5. **Footer link** to the QR page, as above.

## Testing

- Unit: `lib/qrWeddingPage.ts` helpers; `publicPageLocale`/proxy locale for both URLs; `publicTwinPath` both ways; `isLandingPath('/wedding-qr-code')`; sitemap lists both URLs with alternates and drops them when WEDDING is off; landing structured data contains the FAQ.
- `i18n/publicMessages.test.ts` still passes (no new client namespaces).
- Local `curl` on both URLs: 200, exactly one `<h1>`, the canonical, hreflang for both languages plus x-default, no `noindex`, the FAQPage JSON-LD, plan prices (`€`) in the HTML. Same checks on `/` and `/el` for the landing fixes. `/en/wedding-qr-code` returns 308.
- Visual: both pages at 375 px (primary) and desktop.
- `tsc`, lint and the test suite pass.

## Launch checklist

- QR upload is on for every wedding plan in `/api/config` (owner turns START on in admin first).
- After deploy: `curl` the production URLs, request indexing in Search Console, check the sitemap shows both URLs.

## Out of scope

- The printable table card with the event's own QR (host-facing feature).
- Launching `/el/gamos` and the other occasion pages.
- Offer schema with prices.
- Paid ads and link building.
