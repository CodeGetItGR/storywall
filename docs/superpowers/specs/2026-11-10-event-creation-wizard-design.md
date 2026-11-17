# Event creation wizard: design

Date: 2026-11-10
Jira: [KAN-197](https://storywall.atlassian.net/browse/KAN-197)
Mockups: [Create event wizard directions](https://claude.ai/artifact/YYV2YQ4WsKGHwcVPB5tRv2) (canvas, final boards from row "Picked" down)
Wording: [2026-11-10-event-creation-wizard-copy.md](2026-11-10-event-creation-wizard-copy.md) (approved, rows 1–84)

## 1. Goal

Today a visitor who taps "Create an event" lands on a sign-in screen before they can do anything. The new flow lets anyone start, asks them to sign in or sign up only near the end, and makes the flow feel playful and inviting on a phone.

- Anyone can start the wizard without an account.
- A pop-up wizard opens over the page they are on.
- The create button is easy to find on every page.
- The type and plan steps make people want the product: real photos, what each type includes, one suggested plan.
- Sign-in comes just before review and pay: Google first, email sign-up with a 6-digit code as the fallback.

Out of scope: the landing and occasion page copy, the checkout provider's own pages, Apple sign-in changes beyond showing today's button, and the admin console.

## 2. Decisions made during brainstorming

| Topic | Decision |
|---|---|
| Account | Google first. Otherwise email sign-up, verified with a 6-digit code typed inside the wizard, framed "for your security". |
| Where it opens | A pop-up over any page, opened from a URL param. `/events/new` stays as a full-page version. |
| Buttons | In all four places: existing CTAs open the pop-up, a site header button, a floating button on phones (public pages), a bigger button on the signed-in home. |
| Step order | type → plan → details → theme (only when the plan has one) → account (guests and unverified accounts only) → review & pay. |
| Look | Direction A "Storybook": one big question per screen, white background, serif headings, the brand gradient on the main button. |
| Type step | Big photo of the picked type, the types as photo chips, "What are we celebrating?" above them, then what the type includes (four big features, a small icon row, a plan note). |
| Plan step | Ask the guest count, suggest one plan, "Compare all plans" opens a sheet. |
| Extras | Live preview on details, a celebration after payment, motion and stickers, real photos per type. |
| Tone | Warm and short, a little playful. No emoji. Stickers instead. |
| Theme step | Today's picker kept: two per row, scrolls down. |
| Button label | Ink (#241f1a) on the brand gradient, not white: white measures 1.8–2.6:1, ink 6.3–9.2:1. The mockups still show white. |
| Stickers | Ship without them. Add them once crisp sticker files exist. |
| Release | Behind a launch flag. Production keeps today's flow until one release turns the wizard on. |

## 3. The flow

### 3.1 Steps and the counter

| # | Step | Shown when |
|---|---|---|
| 1 | Type | Always |
| 2 | Plan | Always |
| 3 | Details | Always |
| 4 | Theme | The chosen plan includes `theme` and the type has presets (today's `isThemeStepAvailable`) |
| 5 | Account | The person is signed out, or signed in with an unverified email |
| 6 | Review & pay | Always |

- The counter shows "n/N" on screen and "Step {current} of {total}" to screen readers. N counts only the steps that apply. A signed-out wedding host sees 5 steps; a signed-out baptism host sees 6.
- Once the account step has been shown in a run, it stays in the count until the run ends, so the total doesn't drop from 5 to 4 the moment they sign in.
- A thin progress bar with the brand gradient replaces today's text breadcrumb.

### 3.2 Who can use it

- **Signed out:** every step. The account step comes after details (and theme).
- **Signed in, verified:** no account step.
- **Signed in, unverified:** the account step opens straight on the code screen and sends a code. Today these accounts are sent to the home screen; that stops.
- **Admins:** create buttons are not shown to them. `/events/new` still redirects them to the admin console, and an admin who signs in at the account step is sent there too, as today.

## 4. Architecture

### 4.1 One wizard, two shells

- **Shared body:** `CreateEventWizard` renders the progress bar, the current step and the pinned footer button. It runs inside today's `CreateEventFormProvider`, so `useCreateEventFormController` stays the single owner of the form's state and submit logic.
- **Pop-up shell:** `CreateEventDialog` is mounted once in the public layout (`app/(landing)/layout.tsx`) and once in the signed-in app layout (`app/(main)/(app)/layout.tsx`).
  - Full-screen sheet on phones, a centred dialog (about 440px wide, 90vh tall) on desktop.
  - Opens when the URL has `create=1`. The existing `type`, `plan`, `option`, `code` and `run` params work alongside it, so today's deep links keep their meaning.
  - Closing it removes those params from the URL. Focus returns to the button that opened it.
- **Page shell:** `/events/new` renders the same `CreateEventWizard` full-page. Old links, bookmarks and the return from checkout keep working.

### 4.2 URL and history

- Step changes keep using a `step` param, but through `pushPageEntry` / `replacePageUrl` from `lib/overlayHistory.ts` instead of `router.push`, in both shells. That avoids a server round trip on every step and follows the repo rule for UI state in search params.
- Opening the pop-up adds a history entry. Each step adds one. Back on a phone goes back one step, and from the type step closes the pop-up.
- A page loaded with `create=1` already in the URL (a shared link) has no entry to go back to. Closing it replaces the URL without the wizard params instead of going back.
- `useCreateEventRun` keeps its job (a run that went to checkout sends Back to the draft), but reads and writes the run on the current URL rather than on `/events/new` only.
- The pop-up does not use `registerOverlayHistory`: a Back onto an entry that still carries an overlay id counts there as a stale entry and steps back once more, which would close the wizard on every step Back. Its open state is the URL (`create=1`) instead, and each wizard entry stores how deep into the wizard it is (`lib/createEventWizardHistory.ts`). Closing goes back that many entries in one step. The modal is opened with `dismissOnBack={false}`.

### 4.3 Saved answers

The answers have to survive a reload, the Google sign-in, the email code step and closing the pop-up by accident.

- New `lib/createEventWizardDraft.ts` (read, write, clear) and a `useCreateEventWizardDraft` hook. The controller reads its starting values from it and writes to it as the host types.
- Stored in localStorage under `storywall.createEventWizard`, with a version number and `savedAt`. Kept 7 days, then ignored.
- Saved: run id, current step, type, plan code, duration picks, guest choice, title, start date and time, time zone, place name, address, maps link, theme pick, gift fields, discount code, and whether the account step has been shown.
- Never saved: passwords, the email code, and the withdrawal and partner checkboxes. Those are ticked fresh on review.
- A link's `type`, `plan`, `option` or `code` wins over the saved value. Changing the type clears the plan and theme, as today.
- Cleared when checkout opens (right after `rememberCreateEventCheckout`), on sign-out, and when the host closes the pop-up from the type step with nothing typed.
- Opening the wizard with saved answers resumes on the saved step, or the furthest step those answers can reach.
- Storage blocked: the wizard still works; a reload starts over.

`lib/pendingCreateEvent.ts` (the path kept for unverified accounts) is no longer needed once those accounts verify inside the wizard. With the flag on, the email verification page reopens the wizard (`?create=1` on home) when saved answers exist, and nothing writes the pending path. The file and its callers go in the cleanup PR after launch.

### 4.4 Access for guests

- **Proxy (`proxy.ts`):** with the launch flag on, `/events/new` stops being a protected path. Every other `/events/...` route stays protected.
- **`/events/new` page:** with the flag on, it renders the new `CreateEventWizardPage`, whose only redirect is the admin one. `CreateEventBoundary` stays as it is for the flag-off flow (sign-in and "unverified → home" redirects included) and goes in the cleanup PR.
- **Plans:** guests need the plan list. Make `GET /api/plan-tiers` public in guestwall-be (section 7). `usePlanTiersForEventType` then runs signed out too, and the `/events/new` server prefetch fetches plans without a token.
- **Theme presets:** `GET /api/theme-presets` is already public.
- **Event creation and checkout** still need a signed-in, verified account. The wizard creates the draft only on review, after the account step.

### 4.5 Public pages stay fast

The public pages ship only the translation namespaces their client islands use (`PUBLIC_CLIENT_NAMESPACES`), and the landing LCP work depends on small client JS.

- `CreateEventDialog` is loaded with `next/dynamic` and does nothing until opened. A create button starts loading it on hover, focus or touch start, so it's ready by the click.
- The wizard's namespaces (`CreateEventPage`, the sign-in and sign-up forms, the code step, checkout review, `Modules`) are fetched when the pop-up first opens, through a server action that returns only those namespaces for the current locale, and passed to a nested `NextIntlClientProvider`. They are not added to `PUBLIC_CLIENT_NAMESPACES`. In the signed-in app the full messages are already loaded, so no fetch is needed.
- `i18n/publicMessages.test.ts` must treat the dynamic import as a boundary, so the landing graph check stays green without listing wizard namespaces.
- Type photos use `next/image` with explicit sizes. The step's chips load small thumbnails; only the picked type loads the large photo.

### 4.6 Buttons that open the wizard

One click listener in the pop-up host (`CreateEventDialogHost`, mounted in the public and app layouts) handles all of them. Decided 2026-11-10, in place of a `CreateEventLink` component.

- Every create button stays a real `<a href="/events/new?...">`, so the link works without JavaScript, in a new tab, and for crawlers.
- A plain left click on any same-origin link to `/events/new` opens the pop-up in place, over the current page, with that link's params. Clicks with a modifier key, `target="_blank"` and downloads follow the link as usual.
- Hovering, focusing or touching such a link starts loading the pop-up's code.
- For admins the listener is off: existing links keep sending them to the admin console. The new buttons (header, rail, phones, home) are hidden for admins.

| Place | What changes |
|---|---|
| Existing CTAs | No code change: the listener catches the existing `routes.events.new(...)` links on the landing hero and final CTA, pricing cards (`LandingPricingCta`, opening on details with the plan picked, as today), `LandingStoryThemes`, occasion pages (`occasionLinks.ts`), the QR wedding page, `EventsQuickRow` and `HomeEmptyState`. No new text on these pages. |
| Site header | `LandingHeader` gets a "Create an event" button (reused wording). The desktop app rail (`DesktopNavRail`) gets the same button above the account link. |
| Floating button, phones | Public pages only, below 761px: a pinned pill at the bottom with the safe-area inset. It appears once the hero's own button has scrolled out of view, and hides while the final CTA is in view, while the mobile menu is open, and while the wizard is open. It is never shown inside an event. |
| Signed-in home | A full-width primary button at the top of the home screen. It stays enabled for unverified accounts, which verify in the wizard. The quick-row tile and empty state open the pop-up too. |

## 5. The steps

The mockups are the visual reference. All wording is in the wording file.

### 5.1 Type

- **Photo (230px):** the picked type's photo from `eventTypes[].imageUrl`, with rounded bottom corners, and the close button, progress bar and counter over it. The sticker on its bottom edge comes later (section 6).
  - When `imageUrl` is null (staging today), use a landing photo for that type from a small map in `lib/createEventCatalog.ts`.
  - Alt text: the type's name, as today.
- **Choices:** "What are we celebrating?" as the step's `h1`, then every enabled type as a photo chip, two per row, in `sortOrder`. A radiogroup with arrow-key support. The picked chip is dark.
- **What's included:** see 5.2.
- **Button:** "Let's plan your wedding" (per type, rows 17–21), pinned at the bottom.
- The step scrolls on phones; the button stays pinned.

### 5.2 What each type includes

New `lib/createEventFeatures.ts`:

- A priority list per type, as approved:

| Type | Big four | Small row |
|---|---|---|
| Wedding | Gallery, QR cards, Wishbook, RSVP | Stories, Playlist, Schedule, Co-hosts |
| Baptism | Gallery, Wishbook, RSVP, Stories | Playlist, Schedule, Theme, Co-hosts |
| Gender reveal | Boy or Girl?, Gallery, Wishbook, RSVP | Stories, Playlist, Schedule, Theme |
| Reunion | Gallery, RSVP, Stories, Co-hosts | Playlist, Schedule, Posts |
| Any other type | Gallery, RSVP, Wishbook, Stories | Playlist, Schedule, Co-hosts, Theme, Posts |

- Each list is filtered by `occasionModuleKeys(config, type)` from `lib/occasions/occasionFeatures.ts`: the modules some public plan of that type includes or sells as an add-on, and that are enabled. A feature no plan offers drops out and the next one moves up.
- After filtering, the first four are the big features and the next ones, up to four, are the small row. The small row may be shorter or empty.
- **Plan note** ("Some features depend on the plan you pick."): shown when any feature shown is missing from at least one public plan of that type.
- **Big feature:** gradient icon (36px), the module name, and one line (rows 9–16, 81–83).
- **Small row:** gradient icon (26px) and the module name only, on a light pink strip.
- **Icons:** the landing icons in `public/landing/wedding/icons/` with the brand gradient mask, as the landing page already does (`GradientIcon`). New line icons are needed for QR cards, Co-hosts, Theme and Boy or Girl?, drawn in the same style.

On production today, weddings have no QR cards, so Stories moves into the big four; gender reveal has one plan with everything but Playlist, so it shows three small icons and no note.

### 5.3 Plan

- **Heading:** "How many guests are you inviting?"
- **Guest chips:** from the full (non-lite) plans in `sortOrder`. Every plan but the largest gives an "Up to {maxMembers}" chip; the largest gives "More than {previous plan's maxMembers}". A plan with no `maxMembers` gets no chip.
- **Suggested plan:** the smallest full plan whose `maxMembers` covers the chip. It opens on `defaultSelectedPlan` (the linked plan, else the first full plan) with its chip selected.
- **Plan card:**
  - "Best fit for you" badge.
  - Plan name, "Up to {count} guests · {storage}", and the price of the picked duration with today's discount display.
  - "Everything in {previous plan}, plus" and up to three gradient icon tiles for the modules this plan adds over the previous one. The first plan shows its own top three tiles with no label.
  - The duration picker as a segmented control, under today's duration label.
- **Links:** "Compare all plans" opens the sheet.
- **Button:** "Continue".
- A link to a lite plan (`?plan=` a lite code) opens on that plan's card with no chip selected.

### 5.4 Compare all plans (sheet)

- A bottom sheet on phones, a side panel on desktop, titled "All plans".
- **Full plans:** radio rows with name, a short feature line (rows 37–39) and "From {price}".
- **Lite plans:** under "Only photos or wishes?", with their months.
- **Button:** "Choose {plan}" picks the plan, closes the sheet and moves the guest chip to match.

### 5.5 Details

- **Live preview card** at the top: the type's photo, "Preview" tag, the title, and the date, time and place as they are typed.
- **Fields:** today's fields and labels per type, the gift toggle where the plan allows it, and validation as today.
- **Time zone:** one line, "Time zone: {zone} · Change". "Change" opens today's time zone list.
- **Button:** "Continue".

### 5.6 Theme

Today's `ThemePresetRadioGroup` (large, two per row, scrolls), with the new heading and line. Shown only when it applies, as today.

### 5.7 Account (guests only)

- **Summary card:** small photo, title, date and plan name.
- **Heading and line:** "Almost there. Save your event" and "Sign in so you can manage it from any device."
- **Google:** the Google button drawn by Google (`useGoogleSignInButton`: outline, pill, "continue_with", the visitor's language). The Apple button shows under it when `NEXT_PUBLIC_OAUTH_APPLE_CLIENT_ID` is set, as on the sign-in page.
- **Email:** "Or sign up with email" opens the sign-up screen. "Already have an account? Sign in" opens the sign-in screen.
- **After sign-in:**
  - verified account → review;
  - new Google or Apple account → today's `OAuthSignupAcceptanceModal`, then review;
  - unverified account → the code screen;
  - admin → close the wizard and go to the admin console.

### 5.8 Sign-up and sign-in screens

- **Sign-up:** today's register form inside the wizard: first and last name, email, password with show toggle, the required acceptance checkbox, and the newsletter checkbox when the config has one. It calls the same register API as `/register`, so sign-up source tracking still applies, and asks the backend for a code email instead of a link.
- **Sign-in:** today's sign-in form inside the wizard. "Forgot password?" opens the reset page in a new tab, so the wizard keeps its place.
- Errors and field rules are today's.

### 5.9 Email code

- **Content:** mail icon with a shield, "Check your email", and "For your security, enter the 6-digit code we sent to {email}".
- **Code boxes:** six boxes that act as one field, with `autocomplete="one-time-code"` and `inputmode="numeric"`. Pasting a code fills all six, and the sixth digit submits.
- **Links:** "Resend code in {time}" counts down from 60 seconds, then becomes "Resend code". "Change email" lets them correct a typo.
- **Errors:** wrong code, expired and too many tries (rows 63–65) show under the boxes.
- On success the session's `emailVerified` refreshes and the wizard goes to review.

### 5.10 Review & pay

- **Heading:** "One last look".
- **Summary card:** an event row with "Edit" (to details) and a plan row with "Change" (to plan).
- **Then, all as today:** price lines, "Have a discount code?", "Due at activation", "What you're buying", the business and partner notices, and the withdrawal boxes.
- **Button:** "Pay {amount}" with a lock icon. Submit logic is today's: create the draft, save later changes, then checkout.

### 5.11 After payment

On `/events/[eventId]/checkout/success`, when the order is paid and it is a draft's first activation:

- **Celebration screen:** confetti, the tilted event card, "Your event is live", and the line under it. The two stickers come later (section 6).
- **Buttons:** "Open event" (the feed) and "Invite guests" (`routes.events.invitationsQr`).
- The 5-second redirect to the feed does not run on this screen. Upgrades, extensions and the processing and timed-out states keep today's page and redirect.

## 6. Visual system

- **Colours and type:**
  - The wizard surface is white (#ffffff); the app canvas around it stays as it is.
  - Brand tokens: primary #ff7a59, accent pink #ff6fa0, accent orange #ffb259, ink #241f1a.
  - Main button gradient `linear-gradient(120deg, #ff6fa0, #ff7a59 55%, #ffb259)`.
  - Headings in the serif, everything else in Geist, as in the app.
- **Contrast:**
  - The gradient button's label is ink (#241f1a), 17px bold: 6.3:1 at the pink and coral stops, 9.2:1 at the orange one. White would be 1.8–2.6:1. This applies to every gradient button in the wizard; the rest of the app is unchanged.
  - Muted text uses #6f6257 or darker on white, never #8a7c70 for text.
- **Touch targets:** at least 44×44px. Chips are 52px tall; the main button is 56px.
- **Motion:**
  - Step changes slide and fade; chips and buttons press in slightly; stickers pop in.
  - Confetti only after payment.
  - Everything is wrapped in `prefers-reduced-motion: no-preference`. With reduced motion, steps cross-fade and nothing moves on its own.
- **Stickers:** the repo's sticker images are soft-focus decor for the landing page and look faded at this size. The wizard ships without stickers. Adding them later needs crisp files (champagne, heart eyes, heart) and the alt text in wording rows 22–24, which stay approved for that.
- **Section comments:** every visual section in the new components gets the JSX comment the repo requires (`{/* Photo */}`, `{/* Types */}`, `{/* Features */}`, ...).

## 7. Backend (guestwall-be)

One backend PR, released and deployed to staging before the frontend.

- **Public plan list:** add `GET /api/plan-tiers` to the `permitAll` list in `SecurityConfig`, next to `/api/theme-presets`, and update the controller's comment. It returns the same public catalog `/api/config` already exposes, narrowed by type.
- **Code on sign-up:** `POST /api/auth/register` accepts `emailVerification: "CODE"`. It then sends the code email (rows 66–67) instead of the link email. Without it, nothing changes.
- **Send a code:** `POST /api/auth/email-code`, signed in, for the caller's own unverified email.
  - At most one send every 60 seconds and 5 an hour, per account.
  - A new code replaces the old one.
- **Verify a code:** `POST /api/auth/email-code/verify` with `{ code }`, signed in.
  - The code is 6 digits, stored hashed, and expires after 10 minutes.
  - After 5 wrong tries it is locked and a new one must be sent.
  - Success marks the email verified, exactly as the link does.
  - Errors use distinct codes for wrong, expired and too many tries, so the wizard can show rows 63–65.
- **Change email:** `PUT /api/auth/email-code/email` with `{ email }`, signed in, allowed only while the email is unverified.
  - Same validation and uniqueness rules as register.
  - Sends a code to the new address.
  - Rate limited like sending a code.
- The link flow (`/verify-email`, `/resend-verification`) keeps working. Event creation still requires a verified email.
- Tests: controller security tests for the new public route and the signed-in code routes; service tests for expiry, lockout, cooldown and the unverified-only email change.

## 8. Accessibility

- The pop-up is a dialog with `aria-modal`, a label from the step heading, focus trapped inside and returned on close. Escape closes it from any step; the answers are saved, so opening it again resumes.
- One `h1` per step: the step's heading.
- Radiogroups (types, guest chips, durations, plans, themes) use roving focus and arrow keys.
- The counter is read as "Step 2 of 5". The progress bar is `aria-hidden`.
- Code boxes are one labelled input ("6-digit code") for screen readers.
- Every image has real, localized alt text: type photos (type name), stickers (rows 22–24), icons are `aria-hidden` next to their visible name.

## 9. SEO

- `/events/new` becomes reachable signed out. It is a utility page: it must export `robots: NO_INDEX`. It stays under `/events/` in `PRIVATE_PATHS` and out of the sitemap.
- The pop-up adds no route. `create=1` and the other params are query strings on pages whose canonical has no query, so canonicals, hreflang and sitemaps don't change.
- Every create button keeps a crawlable `href` (the pop-up opens from a click listener, not from the markup).
- No landing, occasion or for-business copy or metadata changes. The header and floating buttons reuse the existing "Create an event" wording.
- The public page JS and LCP must not regress (section 4.5). Measure the landing page's LCP and JS size before and after on a phone profile.

## 10. Testing

- **Unit (Vitest):**
  - `createEventFeatures`: filtering, promotion when a feature is missing, the plan-note rule, default list for unknown types.
  - Guest chips and the suggested plan from plan lists like staging's and production's.
  - `createEventWizardDraft`: save, read, expiry, version mismatch, blocked storage, clear.
  - Step list and counter with and without theme and account, including the "account stays counted" rule.
- **Component (Testing Library):**
  - Type step (radiogroup keys, features per type, note shown or hidden).
  - Plan step (chips, suggestion, sheet).
  - Account step (each sign-in outcome routes correctly).
  - Code step (paste, auto-submit, countdown, each error).
  - Celebration (reduced motion: no confetti).
- **Integration:**
  - Guest runs the whole flow, signs up with a code, pays (checkout mocked) and lands on the celebration.
  - Reload mid-flow resumes.
  - Back from checkout opens the draft.
  - Unverified account goes straight to the code screen.
  - Admin is redirected.
- **Stories:** Storybook stories for each step and the dialog shell, mobile and desktop.
- **Backend:** see section 7.
- **Checks:** `tsc --noEmit`, `eslint .`, `vitest run`, `next build`.
- **On staging:** phone and desktop widths, signed out and signed in, at least one type with a theme step (baptism) and one without (wedding).

## 11. Release

- **Launch flag:** `CREATE_WIZARD_LAUNCHED` in `lib/unreleasedPages.ts`, with a `showsCreateWizard()` helper built like `showsUnreleasedPages()`.
  - Off: staging and previews show the new wizard; production keeps today's flow. That includes today's sign-in redirect, the protected `/events/new`, today's links, and no header, floating or home buttons.
  - The flag is read on the server by the proxy, the `/events/new` page and the two root layouts. `showsCreateWizard()` reads `VERCEL_ENV`, which the browser never sees, so the layouts pass it to client code through `CreateWizardFlagProvider` (with the "Create an event" label, for public pages that don't ship the `CreateEventPage` messages). The pop-up host and the button placements read it from there.
  - On: one small PR into `staging` flips it, and the next release takes it to production.
- **Order:**
  1. The backend PR goes first. Its changes are additive, so it can reach production any time before the flag flips.
  2. Then the frontend PRs.
- **After launch:** a cleanup PR removes the flag, the old flow's components (the breadcrumb, the old step layout), `lib/pendingCreateEvent.ts` and their translations.
- Release test cases cover every row of section 10's staging list, on staging.storywall.gr.

## 12. Work order

1. guestwall-be: public plan list, code endpoints, register option, email change.
2. Frontend foundations: the launch flag, saved answers, URL and history helpers, the `CreateEventWizard` body, the page shell on the new body (flag on), and the proxy and boundary changes (flag on). With the flag off, everything behaves as today.
3. Pop-up shell, lazy loading on public pages, the link click listener, and the four button placements.
4. New type step and the features teaser.
5. New plan step and the compare sheet.
6. Details live preview and the theme step wording.
7. Account, sign-up, sign-in and code screens.
8. Review restyle and the celebration screen.
9. Wording from the approved file in both languages.
10. Flip the launch flag (its own PR).
11. After the release: cleanup PR (section 11), including the strings in section 11 of the wording file.
