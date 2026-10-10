# Cookie consent + Google Ads tag

Date: 2026-10-10. Status: approved design.

## Goal

Track Google Ads conversions (purchases) without breaking EU consent rules. Today the site has no
trackers (only cookieless Vercel Web Analytics) and no consent banner. The legal release notes
(`docs/audits/2026-10-04-legal-release-todo.md`) require a banner with Accept all / Reject all /
Settings, off by default, a "Cookie settings" link, and updated Cookie and Privacy Policies before
any tracker is added.

Google Ads tag id: `AW-18505174908`. Purchase conversion label: not created yet, so this work
installs the base tag only.

## Scope

- Banner and tag live only where they are needed:
  - **Landing page** (`/` and `/{locale}`), where ads point. Banner shows on the first visit. On
    Accept, the tag loads and stores the ad click in Google's first-party `_gcl_aw` cookie.
  - **Checkout success page** (`/events/{eventId}/checkout/success`). No banner. The tag loads only
    if consent was already given, so the purchase can later be attributed.
- No banner and no tag anywhere else: guest event pages (QR), feed, manage, admin, auth.
- Ad final URLs must point to the landing page. Other pages can join the scope later if ads target
  them.
- Out of scope: the purchase `conversion` event (follow-up once the label exists), any analytics
  category, third-party CMPs, Google Tag Manager.

## Consent model

- Before a choice: nothing from Google loads (no script, no cookieless pings).
- Categories: Essential (always on, shown as a disabled switch) and Advertising (one switch).
- Withdrawal is as easy as consent: "Cookie settings" in the landing footer and a button on the
  Cookie Policy page reopen the settings. Turning Advertising off deletes `_gcl_*` cookies.

## Units

### `lib/consent.ts`
- Cookie `sw_consent`, value JSON `{ v: 1, ads: boolean, at: ISO date }`, `Max-Age` 6 months,
  `Path=/`, `SameSite=Lax`, `Secure` on https.
- `readConsent(): Consent | null` (null when missing, malformed, or a different `v`).
- `writeConsent(ads: boolean): Consent`.
- `clearAdCookies()`: expires every `_gcl_*` cookie on the current host and the parent domain.
- Browser-only. Never read on the server, so the landing page stays static and cacheable.

### `hooks/useCookieConsent.ts`
- A small module store read with `useSyncExternalStore` (same pattern as `LandingMotionProvider`'s
  storage), so no context provider is needed. Holds the raw consent cookie and whether the settings
  sheet is open. `consent` is `undefined` until the first client read, so nothing consent-dependent
  renders on the server and there is no hydration mismatch.
- Exposes `consent`, `settingsOpen`, `acceptAll()`, `rejectAll()`, `save(ads)`, `openSettings()`,
  `closeSettings()`. `rejectAll` and `save(false)` call `clearAdCookies()`.
- `hooks/useCookieSettingsDraft.ts` holds the sheet's switch, reset from the saved choice on open.

### `components/consent/CookieBanner.tsx`
- Renders when `consent === null`. Fixed to the bottom, mobile-first, does not block the page.
- One short sentence, a Cookie Policy link, three equal-weight buttons: Accept all, Reject all,
  Settings. Reject is not visually weaker than Accept.

### `components/consent/CookieSettingsSheet.tsx`
- Opened from Settings or a "Cookie settings" link. Essential (always on), Advertising switch
  (initialised from the saved choice, off when none), Save.

### `components/consent/CookieSettingsLink.tsx`
- Button styled as a link that calls `openSettings()`. Used in `LandingFooter` (legal column) and
  on the Cookie Policy page.

### `components/consent/GoogleAdsTag.tsx`
- Renders nothing unless `consent?.ads === true` and `NEXT_PUBLIC_GOOGLE_ADS_ID` is set.
- Loads `https://www.googletagmanager.com/gtag/js?id=<id>` with `next/script`
  (`afterInteractive`) and an inline init that sets Consent Mode v2 defaults to granted
  (`ad_storage`, `ad_user_data`, `ad_personalization`; `analytics_storage` denied), then
  `gtag('js', ...)` and `gtag('config', id)`.
- When consent is withdrawn in the same page session, call
  `gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })`
  and delete `_gcl_*` cookies. The script itself stays loaded until the next navigation.
- `NEXT_PUBLIC_GOOGLE_ADS_ID` is set only in Vercel Production, so localhost and previews send
  nothing.
- Changing the choice in the same page view calls `gtag('consent', 'update', …)` with the new value.

### CSP
- `lib/security/securityHeaders.mjs` allows Google's tag origins (per Google's CSP guide) only
  when `NEXT_PUBLIC_GOOGLE_ADS_ID` is set at build time.

### Mount points
- Landing: `components/landing/LandingContent.tsx` renders `CookieConsent` (banner, sheet, tag).
- Checkout success: renders `GoogleAdsTag` only (no banner, no sheet).
- Cookie Policy page: `CookiePolicySettings` (settings button + sheet) under the document.

## Copy

All visible text localized in `messages/el.json` and `messages/en.json` under a `CookieConsent`
namespace. Plain and short, per the copy rules.

## Policy wording (separate deliverable)

Draft new Cookie Policy and Privacy Policy paragraphs (el + en) naming Google Ads, the `_gcl_*`
cookies, their purpose, retention, the Google transfer, and how to withdraw. The user publishes
them as a new dated version in the backend. **Release blocker:** the banner and tag must not ship
to production before that version is live.

## Testing

- `lib/consent.test.ts`: read/write round trip, malformed and wrong-version cookie return null,
  `clearAdCookies` expires `_gcl_*` only.
- Component tests: banner shows with no choice and hides after one; Reject saves `ads: false` and
  the tag does not render; Accept renders the tag; footer link opens the sheet; Save persists the
  switch.
- Browser check of the landing page at phone and desktop widths; confirm no Google requests before
  Accept and the gtag request after Accept (with the env var set locally for that check only).
- TypeScript and lint clean. SEO guidelines check for the landing page (no new route).
