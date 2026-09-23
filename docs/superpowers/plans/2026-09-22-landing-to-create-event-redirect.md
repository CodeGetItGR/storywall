# Landing → Create-Event Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-out visitor who clicks a "create" CTA on the landing page signs in and lands on `/events/new`, carried there by the generic `next` return-path mechanism.

**Architecture:** The proxy gates `/events/new` like every other `/events/…` route, so signed-out requests get a server redirect to `/login?next=…` through existing code. Landing CTAs simply link to `routes.events.new()`. The register page stops consulting `next` (new accounts land on `/home`, invited ones on `/feed`). The pricing section gains a CTA (one shared on desktop, one per card on mobile) and a one-line verification notice.

**Tech Stack:** Next.js App Router (client components), `next-intl` messages in `messages/en.json` + `messages/el.json`, Vitest (`npm test`), ESLint (`npm run lint`), TypeScript (`npx tsc --noEmit`).

Spec: `docs/superpowers/specs/2026-09-22-landing-to-create-event-redirect-design.md`

---

## File map

| File | Responsibility |
| --- | --- |
| `lib/auth/returnPath.ts` | `next` contract: validation, post-login and post-register destinations, building `next` from a current location. |
| `lib/auth/returnPath.test.ts` | Unit tests for the above. |
| `hooks/useCurrentReturnPath.ts` | New. Client hook: current `pathname + search` as a `next` value. |
| `app/events/new/CreateEventBoundary.tsx` | Client gate; signed-out fallback now preserves `next`. |
| `proxy.ts` / `proxy.test.ts` | Server gate; `/events/new` is protected. |
| `app/register/page.tsx` | Post-register redirect follows the new rules. |
| `components/landing/LandingHero.tsx`, `LandingFinalCta.tsx` | CTAs link to `routes.events.new()`. |
| `components/landing/LandingPricingCta.tsx` | New. The pricing CTA link. |
| `components/landing/LandingPricing.tsx` | Renders shared CTA + notice (desktop) and per-card CTA (mobile). |
| `components/plan/MarketingPlanCard.tsx` | Optional `footer` slot. |
| `messages/en.json`, `messages/el.json` | `LandingPage.pricing.cta`, `LandingPage.pricing.verifyNotice`. |

---

### Task 1: `returnPath.ts` — `buildReturnPath` and `getPostRegisterRedirectPath`

**Files:**
- Modify: `lib/auth/returnPath.ts`
- Test: `lib/auth/returnPath.test.ts`

- [x] **Step 1: Write the failing tests**

Append to `lib/auth/returnPath.test.ts` (inside the file, after the existing `describe`):

```ts
describe('buildReturnPath', () => {
    it('joins pathname and search', () => {
        expect(buildReturnPath('/events/new', '?step=plan')).toBe('/events/new?step=plan');
    });

    it('returns the pathname alone when there is no query', () => {
        expect(buildReturnPath('/events/new', '')).toBe('/events/new');
    });
});

describe('getPostRegisterRedirectPath', () => {
    it('sends a new account with no invite to home', () => {
        expect(getPostRegisterRedirectPath('USER', false)).toBe('/home');
    });

    it('sends an invited account to the feed', () => {
        expect(getPostRegisterRedirectPath('USER', true)).toBe('/feed');
    });

    it('keeps the admin landing page for an administrator', () => {
        expect(getPostRegisterRedirectPath('ADMIN', false)).toBe('/admin');
    });
});
```

Update the import line at the top of the test file:

```ts
import { buildReturnPath, getPostAuthRedirectPath, getPostRegisterRedirectPath, getSafeReturnPath } from '@/lib/auth/returnPath';
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/auth/returnPath.test.ts`
Expected: FAIL — `buildReturnPath` / `getPostRegisterRedirectPath` are not exported.

- [x] **Step 3: Implement**

Replace the whole of `lib/auth/returnPath.ts` with:

```ts
import type { PlatformRole } from '@/lib/api/types';
import { routes } from '@/lib/routes';

// `next` is a generic "return here after sign-in" path. Nothing here knows
// about any specific destination: a caller that wants the user back on a
// route after signing in puts that route (with its own query string, which
// is preserved) in `next`, and the login page sends them there. Parameters
// meant for the auth page itself (invite, email, …) are separate typed
// fields on routes.auth.login / routes.auth.register.
export const AUTH_RETURN_PATH_PARAM = 'next';

const APP_ORIGIN = 'https://storywall.local';

// `next` is read from a URL query parameter, so it must never be used as an
// arbitrary URL. Keep only same-origin, path-based destinations.
export function getSafeReturnPath(value: string | null): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

    try {
        const url = new URL(value, APP_ORIGIN);
        if (url.origin !== APP_ORIGIN) return null;

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

// The current location as a `next` value. `search` is what
// useSearchParams().toString() / URL.search give: '' or '?a=b'.
export function buildReturnPath(pathname: string, search: string): string {
    if (!search) return pathname;
    return search.startsWith('?') ? `${pathname}${search}` : `${pathname}?${search}`;
}

export function getPostAuthRedirectPath(role: PlatformRole, returnPath: string | null): string {
    if (role === 'ADMIN') return routes.admin;
    return getSafeReturnPath(returnPath) ?? routes.feed;
}

// A brand-new account has nothing to show in a feed unless it was invited
// to an event, so it lands on home (which also explains email verification).
// `next` is deliberately not consulted here.
export function getPostRegisterRedirectPath(role: PlatformRole, hasInvite: boolean): string {
    if (role === 'ADMIN') return routes.admin;
    return hasInvite ? routes.feed : routes.home;
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/auth/returnPath.test.ts`
Expected: PASS (all cases, including the pre-existing ones).

- [x] **Step 5: Commit**

```bash
git add lib/auth/returnPath.ts lib/auth/returnPath.test.ts
git commit -m "Add buildReturnPath and getPostRegisterRedirectPath.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `useCurrentReturnPath` hook + `CreateEventBoundary` signed-out fallback

**Files:**
- Create: `hooks/useCurrentReturnPath.ts`
- Modify: `app/events/new/CreateEventBoundary.tsx:21-40`

- [x] **Step 1: Create the hook**

`hooks/useCurrentReturnPath.ts`:

```ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { buildReturnPath } from '@/lib/auth/returnPath';

// The current route (with its query string) as a `next` value for
// routes.auth.login / routes.auth.register.
export function useCurrentReturnPath(): string {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    return buildReturnPath(pathname, searchParams.toString());
}
```

- [x] **Step 2: Use it in the client gate**

In `app/events/new/CreateEventBoundary.tsx`, add the import:

```ts
import { useCurrentReturnPath } from '@/hooks/useCurrentReturnPath';
```

Replace the top of `CreateEventPage` (from `const router = useRouter();` through the `useEffect`) with:

```tsx
    const router = useRouter();
    const { user, isAuthenticated, isBootstrapping } = useAuth();
    const returnPath = useCurrentReturnPath();
    // Confirmed unverified (not just "not yet known") — the home screen is
    // where this is explained and where the flow should have been blocked
    // from starting in the first place; a direct visit to this URL must not
    // be a way around that.
    const isConfirmedUnverified = user?.emailVerified === false;

    useEffect(() => {
        if (isBootstrapping) return;
        // The proxy normally redirects signed-out requests before this
        // renders; this branch only runs when Spring was unreachable there.
        if (!isAuthenticated) {
            router.replace(routes.auth.login({ next: returnPath }));
            return;
        }
        if (user?.role === 'ADMIN') {
            router.replace(routes.admin);
            return;
        }
        if (isConfirmedUnverified) router.replace(routes.home);
    }, [isAuthenticated, isBootstrapping, isConfirmedUnverified, returnPath, router, user?.role]);
```

- [x] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add hooks/useCurrentReturnPath.ts app/events/new/CreateEventBoundary.tsx
git commit -m "Preserve next when the create-event client gate redirects to login.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Proxy protects `/events/new`

**Files:**
- Modify: `proxy.ts:15-21`
- Test: `proxy.test.ts`

- [x] **Step 1: Write the failing test**

In `proxy.test.ts`, change the `request` helper to accept a URL:

```ts
function request(cookies: Partial<Record<keyof typeof AUTH_COOKIES, string>> = {}, url = 'http://localhost/feed') {
    const req = new NextRequest(url);
    if (cookies.accessToken) req.cookies.set(AUTH_COOKIES.accessToken, cookies.accessToken);
    if (cookies.refreshToken) req.cookies.set(AUTH_COOKIES.refreshToken, cookies.refreshToken);
    return req;
}
```

Add inside `describe('proxy', …)`, after the `'redirects to login with no cookies at all'` case:

```ts
    it('redirects a signed-out visit to /events/new to login with the destination in next', async () => {
        const res = await proxy(request({}, 'http://localhost/events/new?step=plan'));
        expect(res.status).toBe(307);
        const location = new URL(res.headers.get('location') ?? '');
        expect(location.pathname).toBe('/login');
        expect(location.searchParams.get('next')).toBe('/events/new?step=plan');
    });
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run proxy.test.ts`
Expected: FAIL — `res.status` is 200 (the request passes through untouched).

- [x] **Step 3: Remove the carve-out**

In `proxy.ts`, replace `isProtectedPath`:

```ts
function isProtectedPath(pathname: string): boolean {
    if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return true;
    // Every /events/... route (new, checkout, settings) needs a session. The
    // client gate on /events/new only adds role and email-verification checks.
    return pathname.startsWith('/events/');
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run proxy.test.ts`
Expected: PASS (all cases).

- [x] **Step 5: Commit**

```bash
git add proxy.ts proxy.test.ts
git commit -m "Gate /events/new in the proxy so signed-out visits carry next to login.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Register page — post-register destination

**Files:**
- Modify: `app/register/page.tsx:15-58`

- [x] **Step 1: Switch the redirect helper**

Change the import:

```ts
import { AUTH_RETURN_PATH_PARAM, getPostRegisterRedirectPath, getSafeReturnPath } from '@/lib/auth/returnPath';
```

In `handleSubmit`, replace:

```ts
            router.replace(getPostAuthRedirectPath(auth.role, returnPath));
```

with:

```ts
            router.replace(getPostRegisterRedirectPath(auth.role, Boolean(inviteToken)));
```

In `handleOAuthSignIn`, replace the same line with the same call, and update its dependency array to:

```ts
        [inviteToken, oauth, router]
```

`returnPath` stays in the file: `useAuthPageRedirect(returnPath)` (an already-signed-in visitor still goes to `next`) and the `routes.auth.login({ invite: inviteToken, next: returnPath })` link both keep using it.

- [x] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app/register/page.tsx`
Expected: no errors (in particular no unused-import warning for `getPostAuthRedirectPath`).

- [x] **Step 3: Commit**

```bash
git add app/register/page.tsx
git commit -m "Send new accounts to home after registration, invited ones to the feed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Hero and final CTA link to the creation form

**Files:**
- Modify: `components/landing/LandingHero.tsx:162,187`
- Modify: `components/landing/LandingFinalCta.tsx:52`

- [x] **Step 1: Hero**

In `components/landing/LandingHero.tsx`, both `<LandingHeroCta … />` usages change

```tsx
href={isSignedIn ? routes.home : routes.register}
```

to

```tsx
href={isSignedIn ? routes.home : routes.events.new()}
```

- [x] **Step 2: Final CTA**

In `components/landing/LandingFinalCta.tsx`, change

```tsx
href={routes.register}
```

to

```tsx
href={routes.events.new()}
```

- [x] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add components/landing/LandingHero.tsx components/landing/LandingFinalCta.tsx
git commit -m "Point landing hero and final CTAs at the create-event form.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Pricing CTA copy

**Files:**
- Modify: `messages/en.json` (`LandingPage.pricing`, around line 3910)
- Modify: `messages/el.json` (`LandingPage.pricing`, around line 3795)

- [x] **Step 1: English**

In `messages/en.json`, inside `"LandingPage" → "pricing"`, add after `"storageNote"`:

```json
            "cta": "CREATE YOUR STORYWALL",
            "verifyNotice": "Verify your email before creating an event.",
```

- [x] **Step 2: Greek**

In `messages/el.json`, inside `"LandingPage" → "pricing"`, add after `"storageNote"`:

```json
            "cta": "ΔΗΜΙΟΥΡΓΗΣΕ ΤΟ STORYWALL ΣΟΥ",
            "verifyNotice": "Επιβεβαίωσε το email σου πριν δημιουργήσεις event.",
```

- [x] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/el.json','utf8'));console.log('ok')"`
Expected: `ok`

- [x] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "Add landing pricing CTA and verification notice copy.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `LandingPricingCta` component + `MarketingPlanCard` footer slot

**Files:**
- Create: `components/landing/LandingPricingCta.tsx`
- Modify: `components/plan/MarketingPlanCard.tsx`

- [x] **Step 1: Create the CTA**

`components/landing/LandingPricingCta.tsx`:

```tsx
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type LandingPricingCtaProps = { className?: string; label: string };

// Links straight to the creation form; the proxy sends signed-out visitors
// through login with this destination in `next`.
export function LandingPricingCta({ className, label }: LandingPricingCtaProps) {
    return (
        <a
            className={cn(
                'items-center justify-center gap-3 rounded-full bg-[#151313] px-6 py-3.5 text-[11px] font-black tracking-[0.08em] text-white uppercase no-underline transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#df7794] motion-reduce:transition-none min-[761px]:px-7 min-[761px]:text-[13px] min-[761px]:tracking-widest',
                className
            )}
            href={routes.events.new()}
        >
            <span>{label}</span>
            <span aria-hidden="true" className="text-[18px] leading-none">
                ↗
            </span>
        </a>
    );
}
```

- [x] **Step 2: Add the `footer` slot to the card**

In `components/plan/MarketingPlanCard.tsx`:

Add to the props type:

```ts
    footer?: ReactNode;
```

and the import at the top:

```ts
import type { ReactNode } from 'react';
```

Destructure `footer` in the function signature (after `onSelectAction`).

In the `{/* Storage estimate */}` bottom `<div>`, after the `{selectionLabel && (…)}` block and before that div closes, add:

```tsx
                {footer}
```

- [x] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/LandingPricingCta.tsx components/plan/MarketingPlanCard.tsx`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add components/landing/LandingPricingCta.tsx components/plan/MarketingPlanCard.tsx
git commit -m "Add LandingPricingCta and an optional footer slot on MarketingPlanCard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Render the pricing CTAs and verification notice

**Files:**
- Modify: `components/landing/LandingPricing.tsx:1-10,81-108`

- [x] **Step 1: Import**

Add:

```ts
import { LandingPricingCta } from '@/components/landing/LandingPricingCta';
```

- [x] **Step 2: Per-card CTA (mobile) and shared CTA + notice (desktop)**

Replace the `{/* Plans */}` block through the closing `</section>` with:

```tsx
            {/* Plans */}
            <div
                aria-labelledby={`landing-pricing-tab-${category}`}
                className="mx-auto mt-9 grid max-w-331 gap-5 min-[761px]:grid-cols-3 min-[761px]:gap-[clamp(24px,3vw,52px)]"
                id="landing-pricing-panel"
                role="tabpanel"
            >
                {categories[category].plans.length &&
                    categories[category].plans.map((plan, index) => (
                        <MarketingPlanCard
                            featured={index === 1}
                            footer={<LandingPricingCta className="mt-5 flex w-full min-[761px]:hidden" label={t('cta')} />}
                            key={`${category}-${plan.name}`}
                            plan={plan}
                            popularLabel={t('popular')}
                            storageLabel={t('storageLabel')}
                        />
                    ))}
            </div>

            {/* Create CTA */}
            <div className="mx-auto mt-8 flex max-w-331 flex-col items-center gap-3 min-[761px]:mt-12">
                <LandingPricingCta className="hidden min-[761px]:flex" label={t('cta')} />
                <p className="text-center text-[12px] text-[#151313]/55">{t('verifyNotice')}</p>
            </div>
        </section>
    );
}
```

- [x] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint components/landing/LandingPricing.tsx`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add components/landing/LandingPricing.tsx
git commit -m "Add create CTA and verification notice to the landing pricing section.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Verification

**Files:** none new.

- [x] **Step 1: Full test, type-check, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, no lint errors.

- [x] **Step 2: Visual check — pricing section**

Start the dev server (`preview_start` with `{ name: "storywall-dev" }` from `.claude/launch.json`) and open `/`.

- At **1280px**: exactly one CTA under the plans grid, no CTA inside any card, the notice once under the CTA.
- At **375px**: one CTA inside each stacked card, no shared CTA under the grid, the notice once below the cards.

Take a screenshot at each width.

- [ ] **Step 3: Flow check — signed out**

In a signed-out session:
1. Click the hero CTA → URL is `/login?next=%2Fevents%2Fnew`.
2. Sign in with a verified non-admin account → lands on `/events/new`.
3. Repeat via the final CTA and via a pricing CTA.

- [ ] **Step 4: Flow check — register**

From `/login?next=%2Fevents%2Fnew`, click the "create account" link → URL keeps `next`. Register a fresh account (no invite) → lands on `/home` with the verification banner.

- [ ] **Step 5: Flow check — signed in**

Signed in as a verified user: hero CTA → `/home`; pricing or final CTA → `/events/new` directly (no login hop).

- [ ] **Step 6: Report**

Summarize results, including the screenshots and any failing step, before handing back.
