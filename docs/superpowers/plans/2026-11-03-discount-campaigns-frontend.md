# Discount campaigns: frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. One agent at a time: this repo's CLAUDE.md forbids parallel subagents.

**Goal:** Show a live discount campaign everywhere prices appear, in a banner with a countdown and on the guest card, and give admins the screens to run it, generate its links and see its sales.

**Architecture:** The banner is generated from the live campaign (`/api/discount-campaign`, cached by the app's own route), not stored as a notice, and a browser timer removes it at the second it ends. Prices come from new `campaignDiscount*` fields on the public plans, compared in `lib/billing.ts` the same way the server does. The admin screen follows the admin console's table and right drawer.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, next-intl, Tailwind, Vitest, Testing Library.

**Design:** `docs/superpowers/specs/2026-11-03-discount-campaigns-design.md`.

**Companion:** `docs/superpowers/plans/2026-11-03-discount-campaigns-backend.md`. Each frontend step needs its backend step on staging to be checked end to end.

---

## Branches

Start each step from the latest `staging` and open its PR into `staging`. Commit messages and PR titles carry the Jira key.

| Step | Jira | Branch | Needs |
|---|---|---|---|
| 1. Admin screen, prices, banner, guest card | KAN-115 | `claude/kan-115-discount-campaigns` | KAN-114 |
| 2. Link sets | KAN-117 | `claude/kan-117-campaign-link-sets` | KAN-116 |
| 3. Sales tracking | KAN-119 | `claude/kan-119-campaign-sales-tracking` | KAN-118 |

Step 1 continues the branch that holds the design and these plans. Rename it and bring it up to date before Task 1:

```bash
git branch -m claude/global-discount-campaign-banner-a2dc84 claude/kan-115-discount-campaigns
git fetch origin staging
git merge origin/staging
```

## Text that needs sign-off first

The spec's "Copy" table is approved. The building work needs these extra strings, which are **not** approved yet. Get an explicit yes on this table before Task 1, and change the plan's message blocks if any wording changes.

| Where | English | Greek |
|---|---|---|
| Countdown, under a day | 5h 12m | 5ώ 12λ |
| Empty list | No discount campaigns yet. | Δεν υπάρχουν εκπτωτικές καμπάνιες. |
| Drawer title when editing | Edit discount campaign | Επεξεργασία εκπτωτικής καμπάνιας |
| Table column | Status | Κατάσταση |
| Table column | Dates | Ημερομηνίες |
| Error | A campaign already uses this link name. | Αυτό το όνομα συνδέσμων χρησιμοποιείται ήδη. |
| Error | Check the campaign's details. | Ελέγξτε τα στοιχεία της καμπάνιας. |
| Error when the server's text is missing | This percent makes some plans too cheap to charge. | Με αυτό το ποσοστό, κάποια πλάνα δεν μπορούν να χρεωθούν. |
| Delete button | Delete campaign | Διαγραφή καμπάνιας |
| Delete modal title | Delete this campaign? | Διαγραφή της καμπάνιας; |
| Delete modal body | It won't go live. | Δεν θα ξεκινήσει. |
| Drawer section | Links | Σύνδεσμοι |
| Links total row | Total | Σύνολο |
| Links drawer button | Create links | Δημιουργία συνδέσμων |
| Links column | Visits | Επισκέψεις |

The generated links' names, such as `Black Friday · Instagram post · Paid · EL`, come from the backend in English and only admins see them.

## File structure

**Step 1**
- Create `lib/discountCampaign.ts`: query key, dismissal key, whether the campaign beats a notice, the plans link. No React, so server layouts can import it.
- Create `lib/discountCampaign.server.ts`, `app/api/discount-campaign/route.ts`: the cached read.
- Create `hooks/useLiveDiscountCampaign.ts`: the live campaign, null from the second it ends.
- Create `hooks/useCampaignCountdown.ts`, `components/siteNotices/CampaignCountdown.tsx`.
- Create `lib/discountCampaignForm.ts`, `hooks/useAdminDiscountCampaigns.ts`, `hooks/useDiscountCampaignsPanel.ts`, `hooks/useDiscountCampaignForm.ts`.
- Create `components/admin/discountCampaigns/DiscountCampaignsPanel.tsx`, `DiscountCampaignsTable.tsx`, `DiscountCampaignDrawer.tsx`.
- Modify `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/adminUtils.ts`.
- Modify `lib/billing.ts`, `lib/planTiers.ts`: the lower price.
- Modify `hooks/useSiteNoticeBar.ts`, `components/siteNotices/SiteNoticeBanner.tsx`, `components/siteNotices/SiteNoticeBar.tsx`.
- Modify `components/feed/guestOffer/GuestOfferCard.tsx`, `lib/guestOffer.ts`.
- Modify `app/(landing)/layout.tsx`, `app/(main)/layout.tsx`: seed the cache.
- Modify `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminConsole.tsx`, `components/admin/AdminShellNav.tsx`.
- Modify `messages/en.json`, `messages/el.json`.

**Step 2**
- Create `hooks/useDiscountCampaignLinks.ts`, `components/admin/discountCampaigns/DiscountCampaignLinks.tsx`, `components/admin/discountCampaigns/CampaignSetLinkRow.tsx`.
- Create `hooks/useCampaignLinkSetForm.ts`, `components/admin/campaigns/CampaignLinkSetDrawer.tsx`.
- Modify `lib/campaignLinks.ts`, `hooks/useAdminCampaigns.ts`, `hooks/useCampaignsDashboard.ts`, `components/admin/campaigns/CampaignsPanel.tsx`, `components/admin/discountCampaigns/DiscountCampaignDrawer.tsx`, `lib/api/types.ts`, `lib/api/endpoints.ts`, `messages/en.json`, `messages/el.json`.

**Step 3**
- Create `lib/campaignAttribution.ts`, `hooks/useCampaignAttributionTracking.ts`, `components/layout/CampaignAttributionTracker.tsx`.
- Modify `lib/consent.ts`, `providers/AppProviders.tsx`, `providers/PublicProviders.tsx`, `hooks/useBilling.ts`, `hooks/useCreateEventFormController.ts`, `components/admin/campaigns/CampaignsTable.tsx`, `components/admin/discountCampaigns/DiscountCampaignLinks.tsx`, `lib/api/types.ts`, `messages/en.json`, `messages/el.json`.

---

# Step 1: admin screen, prices, banner, guest card (KAN-115)

## Task 1: Types, endpoints and error codes

**Files:**
- Modify: `lib/api/types.ts:135,357`
- Modify: `lib/api/endpoints.ts:95,569`
- Modify: `lib/api/errors.ts:185`, `lib/api/errorMessageKeys.ts:34,349`, `lib/adminUtils.ts:29,108`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the plan fields**

In `PlanTierResponseDto`, after `discountEndsAt`:

```ts
    // The discount campaign that is live or next up, on public responses only. The browser checks the
    // dates itself, because the catalog is cached. Always compared with the plan's own promotion.
    campaignDiscountPercent?: number | null;
    campaignDiscountLabel?: string | null;
    campaignDiscountStartsAt?: string | null;
    campaignDiscountEndsAt?: string | null;
```

- [ ] **Step 2: Add the campaign types**

Below `export type SiteNoticeStatus = ...`:

```ts
// GET /api/public/discount-campaign, read through the app's own route. Null without a live campaign.
export interface DiscountCampaignLiveDto {
    id: string;
    percent: number;
    startsAt: string;
    endsAt: string;
}

export interface AdminDiscountCampaignDto {
    id: string;
    name: string;
    percent: number;
    label: string | null;
    linkName: string;
    startsAt: string;
    endsAt: string;
    status: SiteNoticeStatus;
    createdAt: string;
}

export interface DiscountCampaignRequestDto {
    name: string;
    percent: number;
    label: string | null;
    linkName: string;
    // Null means now.
    startsAt: string | null;
    endsAt: string;
}
```

- [ ] **Step 3: Add the endpoints**

After the public `siteNotices` block:

```ts
    // Read through the app's own cached route (app/api/discount-campaign), never straight from the browser.
    discountCampaign: {
        live: '/api/public/discount-campaign',
    },
```

After the admin `siteNotices` block:

```ts
        discountCampaigns: {
            list: '/api/admin/discount-campaigns',
            byId: (id: string) => `/api/admin/discount-campaigns/${id}`,
            stop: (id: string) => `/api/admin/discount-campaigns/${id}/stop`,
        },
```

- [ ] **Step 4: Add the error codes**

In `ERROR_CODES` (`lib/api/errors.ts`), matching the backend's numbers:

```ts
    DISCOUNT_CAMPAIGN_INVALID: 3122,
    DISCOUNT_CAMPAIGN_OVERLAP: 5204,
    DISCOUNT_CAMPAIGN_PRICE_TOO_LOW: 5205,
    DISCOUNT_CAMPAIGN_LINK_NAME_TAKEN: 5206,
```

In `lib/api/errorMessageKeys.ts`, add to the key union beside `'campaignLinkTaken'`:

```ts
    | 'discountCampaignInvalid'
    | 'discountCampaignOverlap'
    | 'discountCampaignPriceTooLow'
    | 'discountCampaignLinkNameTaken'
```

and to the map beside `[ERROR_CODES.CAMPAIGN_LINK_TAKEN]`:

```ts
    [ERROR_CODES.DISCOUNT_CAMPAIGN_INVALID]: 'discountCampaignInvalid',
    [ERROR_CODES.DISCOUNT_CAMPAIGN_OVERLAP]: 'discountCampaignOverlap',
    [ERROR_CODES.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW]: 'discountCampaignPriceTooLow',
    [ERROR_CODES.DISCOUNT_CAMPAIGN_LINK_NAME_TAKEN]: 'discountCampaignLinkNameTaken',
```

In `lib/adminUtils.ts`, add the same four names to the `AdminErrorMessageKey` union, and after the `CAMPAIGN_LINK_TAKEN` line:

```ts
    if (code === ERROR_CODES.DISCOUNT_CAMPAIGN_INVALID) return 'discountCampaignInvalid';
    if (code === ERROR_CODES.DISCOUNT_CAMPAIGN_OVERLAP) return 'discountCampaignOverlap';
    if (code === ERROR_CODES.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW) return 'discountCampaignPriceTooLow';
    if (code === ERROR_CODES.DISCOUNT_CAMPAIGN_LINK_NAME_TAKEN) return 'discountCampaignLinkNameTaken';
```

- [ ] **Step 5: Add the error messages**

Beside both `campaignLinkTaken` keys in `messages/en.json` (l.5050 and l.6655):

```json
"discountCampaignInvalid": "Check the campaign's details.",
"discountCampaignOverlap": "Another campaign runs during these dates.",
"discountCampaignPriceTooLow": "This percent makes some plans too cheap to charge.",
"discountCampaignLinkNameTaken": "A campaign already uses this link name.",
```

Beside both in `messages/el.json` (l.4775 and l.6621):

```json
"discountCampaignInvalid": "Ελέγξτε τα στοιχεία της καμπάνιας.",
"discountCampaignOverlap": "Άλλη καμπάνια τρέχει αυτές τις ημερομηνίες.",
"discountCampaignPriceTooLow": "Με αυτό το ποσοστό, κάποια πλάνα δεν μπορούν να χρεωθούν.",
"discountCampaignLinkNameTaken": "Αυτό το όνομα συνδέσμων χρησιμοποιείται ήδη.",
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts lib/api/errorMessageKeys.ts lib/adminUtils.ts messages/en.json messages/el.json
git commit -m "KAN-115: add discount campaign types, endpoints and errors"
```

## Task 2: The lower price

**Files:**
- Modify: `lib/billing.ts:117-155`
- Modify: `lib/planTiers.ts:2,66-90`
- Test: `lib/billing.test.ts`, `lib/planTiers.test.ts`

- [ ] **Step 1: Write the failing tests**

Add inside `describe('plan promotions', ...)` in `lib/billing.test.ts`, and import `promotedAmount`, `promotedOption`, `isCampaignDiscountLive`:

```ts
    const campaign = {
        campaignDiscountPercent: 20,
        campaignDiscountLabel: 'Black Friday',
        campaignDiscountStartsAt: '2026-10-07T09:00:00Z',
        campaignDiscountEndsAt: '2026-10-07T11:00:00Z',
    };

    it('reads a campaign as live only inside its dates', () => {
        expect(isCampaignDiscountLive(plan(campaign), now)).toBe(true);
        expect(isCampaignDiscountLive(plan(campaign), new Date('2026-10-07T08:59:00Z'))).toBe(false);
        expect(isCampaignDiscountLive(plan(campaign), new Date('2026-10-07T11:00:00Z'))).toBe(false);
        expect(isCampaignDiscountLive(plan(), now)).toBe(false);
    });

    it('takes the campaign when it is cheaper, under its own label', () => {
        expect(promotedAmount(10_000, plan({ ...campaign, discountPercent: 10, discountLabel: 'Sale' }), now)).toEqual({
            amountMinor: 8_000,
            discountActive: true,
            discountLabel: 'Black Friday',
        });
    });

    it("keeps the plan's own percent when it is cheaper or the same", () => {
        expect(promotedAmount(10_000, plan({ ...campaign, discountPercent: 30, discountLabel: 'Sale' }), now)).toEqual({
            amountMinor: 7_000,
            discountActive: true,
            discountLabel: 'Sale',
        });
        expect(promotedAmount(10_000, plan({ ...campaign, discountPercent: 20, discountLabel: 'Sale' }), now).discountLabel).toBe('Sale');
    });

    it('compares a promo price with the campaign price', () => {
        const below = option({ priceAmountMinor: 10_000, promoPriceAmountMinor: 7_000 });
        const above = option({ priceAmountMinor: 10_000, promoPriceAmountMinor: 9_000 });

        expect(promotedOption(below, plan({ ...campaign, discountLabel: 'Sale' }), now).amountMinor).toBe(7_000);
        expect(promotedOption(above, plan({ ...campaign, discountLabel: 'Sale' }), now)).toEqual({
            amountMinor: 8_000,
            discountActive: true,
            discountLabel: 'Black Friday',
        });
        expect(promotedOptionAmountMinor(above, plan(campaign), now)).toBe(8_000);
    });

    it('drops back to the normal price at the second a campaign ends', () => {
        const atEnd = new Date('2026-10-07T11:00:00Z');

        expect(discountedAmountMinor(10_000, plan(campaign), atEnd)).toBe(10_000);
    });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/billing.test.ts`
Expected: FAIL, `promotedAmount` is not a function.

- [ ] **Step 3: Implement it in `lib/billing.ts`**

Replace `discountedAmountMinor` and `promotedOptionAmountMinor`, keeping the other functions as they are, so the block reads:

```ts
// Whether the discount campaign this plan carries covers `now`. The catalog is cached, so the
// browser checks the dates itself.
export function isCampaignDiscountLive(plan: PlanTierResponseDto, now = new Date()): boolean {
    if (!plan.campaignDiscountPercent || plan.campaignDiscountPercent <= 0) return false;
    const startsAt = parseDiscountBoundary(plan.campaignDiscountStartsAt ?? null);
    const endsAt = parseDiscountBoundary(plan.campaignDiscountEndsAt ?? null);
    if (!startsAt || !endsAt) return false;
    return startsAt.getTime() <= now.getTime() && endsAt.getTime() > now.getTime();
}

// The discount is truncated, never the price, as the server does
// (CollaborationPricing.applyDiscount): 12.5% off 999 takes 124, not 125. The percent carries at
// most two decimals, so it is worked in hundredths to keep the arithmetic exact.
function percentOffMinor(amountMinor: number, percent: number): number {
    const hundredths = Math.round(Math.min(Math.max(percent, 0), 100) * 100);
    return Math.max(0, amountMinor - Math.floor((amountMinor * hundredths) / 10_000));
}

export type PromotedLine = { amountMinor: number; discountActive: boolean; discountLabel: string | null };

// The lower of the plan's own price and the campaign's, as PlanPromotionResolver does on the server.
// A tie keeps the plan's own, and the two never add up.
function promotedLine(listMinor: number, ownMinor: number, ownActive: boolean, plan: PlanTierResponseDto, now: Date): PromotedLine {
    if (isCampaignDiscountLive(plan, now)) {
        const campaignMinor = percentOffMinor(listMinor, plan.campaignDiscountPercent ?? 0);
        if (campaignMinor < ownMinor) {
            return { amountMinor: campaignMinor, discountActive: true, discountLabel: plan.campaignDiscountLabel ?? null };
        }
    }
    return { amountMinor: ownMinor, discountActive: ownActive, discountLabel: plan.discountLabel };
}

// An amount after the best of the plan's percent and the campaign.
export function promotedAmount(listMinor: number, plan: PlanTierResponseDto, now = new Date()): PromotedLine {
    const ownActive = isPlanDiscountActive(plan, now);
    const ownMinor = ownActive ? percentOffMinor(listMinor, plan.discountPercent ?? 0) : listMinor;
    return promotedLine(listMinor, ownMinor, ownActive, plan, now);
}

// The duration's promo price while the plan's promotion window is open, else null.
export function activePromoPriceMinor(option: CoverageOptionResponseDto, plan: PlanTierResponseDto, now = new Date()): number | null {
    if (option.kind !== 'INITIAL' || option.promoPriceAmountMinor === null) return null;
    return isPlanPromotionOpen(plan, now) ? option.promoPriceAmountMinor : null;
}

// One duration's price: its live promo price (which replaces the plan's percent), else the percent,
// and in both cases the campaign when that is lower.
export function promotedOption(option: CoverageOptionResponseDto, plan: PlanTierResponseDto, now = new Date()): PromotedLine {
    const promoMinor = activePromoPriceMinor(option, plan, now);
    return promoMinor !== null ? promotedLine(option.priceAmountMinor, promoMinor, true, plan, now) : promotedAmount(option.priceAmountMinor, plan, now);
}

export function discountedAmountMinor(amountMinor: number, plan: PlanTierResponseDto, now = new Date()): number {
    return promotedAmount(amountMinor, plan, now).amountMinor;
}

export function promotedOptionAmountMinor(option: CoverageOptionResponseDto, plan: PlanTierResponseDto, now = new Date()): number {
    return promotedOption(option, plan, now).amountMinor;
}
```

- [ ] **Step 4: Use it in `lib/planTiers.ts`**

Replace the import on line 2:

```ts
import { promotedAmount, promotedOption } from '@/lib/billing';
```

Replace `optionPriceDetails` and `priceDetails`:

```ts
function optionPriceDetails(plan: PlanTierResponseDto, option: CoverageOptionResponseDto): PlanPriceDetails | null {
    if (!plan.priceCurrency) return null;

    return { ...promotedOption(option, plan), listAmountMinor: option.priceAmountMinor, currency: plan.priceCurrency };
}

function priceDetails(plan: PlanTierResponseDto, listAmountMinor: number | null): PlanPriceDetails | null {
    if (listAmountMinor === null || !plan.priceCurrency) return null;

    return { ...promotedAmount(listAmountMinor, plan), listAmountMinor, currency: plan.priceCurrency };
}
```

- [ ] **Step 5: Run the tests that touch prices**

Run: `npx vitest run lib/billing.test.ts lib/planTiers.test.ts lib/landingPricing.test.ts lib/occasions`
Expected: PASS. Existing assertions stay valid, because a plan with no campaign fields behaves as before.

- [ ] **Step 6: Commit**

```bash
git add lib/billing.ts lib/billing.test.ts lib/planTiers.ts
git commit -m "KAN-115: show the lower of a plan's promotion and the campaign"
```

## Task 3: Reading the live campaign

**Files:**
- Create: `lib/discountCampaign.ts`, `lib/discountCampaign.server.ts`, `app/api/discount-campaign/route.ts`, `hooks/useLiveDiscountCampaign.ts`
- Modify: `app/(landing)/layout.tsx`, `app/(main)/layout.tsx`
- Test: `lib/discountCampaign.server.test.ts`, `lib/discountCampaign.test.ts`, `hooks/useLiveDiscountCampaign.test.tsx`

- [ ] **Step 1: Write the failing tests**

`lib/discountCampaign.server.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchLiveDiscountCampaign', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    const campaign = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

    it('returns the live campaign and keeps it through an outage', async () => {
        const { fetchLiveDiscountCampaign } = await import('@/lib/discountCampaign.server');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(campaign), { status: 200 })));
        expect(await fetchLiveDiscountCampaign()).toEqual(campaign);

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })));
        expect(await fetchLiveDiscountCampaign()).toEqual(campaign);

        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveDiscountCampaign()).toEqual(campaign);
    });

    it('clears the copy when Spring says there is none', async () => {
        const { fetchLiveDiscountCampaign } = await import('@/lib/discountCampaign.server');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(campaign), { status: 200 })));
        await fetchLiveDiscountCampaign();

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));
        expect(await fetchLiveDiscountCampaign()).toBeNull();
    });

    it('returns null when Spring has never answered', async () => {
        const { fetchLiveDiscountCampaign } = await import('@/lib/discountCampaign.server');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveDiscountCampaign()).toBeNull();
    });
});
```

`lib/discountCampaign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { DiscountCampaignLiveDto, SiteNoticeLiveDto } from '@/lib/api/types';
import { campaignShowsOver, discountCampaignDismissalKey, plansHref } from '@/lib/discountCampaign';
import { parseDismissals } from '@/lib/siteNoticeDismissals';

const campaign: DiscountCampaignLiveDto = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };
const notice = (tone: SiteNoticeLiveDto['tone']) => ({ tone }) as SiteNoticeLiveDto;
const NONE = new Set<string>();

describe('discountCampaignDismissalKey', () => {
    it('has the shape the dismissal cookie keeps', () => {
        const id = '7f3b2c1a-0000-4000-8000-000000000000';
        expect(parseDismissals(discountCampaignDismissalKey(id))).toEqual([`${id}:1`]);
    });
});

describe('campaignShowsOver', () => {
    it('shows to the public and to hosts only', () => {
        expect(campaignShowsOver(campaign, null, 'PUBLIC', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, null, 'HOST', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, null, 'GUEST', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, null, 'ADMIN', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, null, 'PENDING', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, null, null, NONE)).toBe(false);
    });

    it('beats an offer or info notice but not a warning', () => {
        expect(campaignShowsOver(campaign, notice('OFFER'), 'PUBLIC', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, notice('INFO'), 'PUBLIC', NONE)).toBe(true);
        expect(campaignShowsOver(campaign, notice('WARNING'), 'PUBLIC', NONE)).toBe(false);
        expect(campaignShowsOver(campaign, notice('CRITICAL'), 'PUBLIC', NONE)).toBe(false);
    });

    it('stays closed once closed', () => {
        expect(campaignShowsOver(campaign, null, 'PUBLIC', new Set(['c1:1']))).toBe(false);
    });
});

describe('plansHref', () => {
    it("points at the plans on the visitor's language", () => {
        expect(plansHref('en')).toBe('/#pricing');
        expect(plansHref('el')).toBe('/el#pricing');
    });
});
```

`hooks/useLiveDiscountCampaign.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { discountCampaignKeys } from '@/lib/discountCampaign';

const START = new Date('2026-11-03T10:00:00Z');
const campaign = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-03T10:00:05Z' };

function wrapperWith(data: typeof campaign | null) {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, refetchInterval: false } } });
    client.setQueryData(discountCampaignKeys.live(), data);
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useLiveDiscountCampaign', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(START);
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('returns the campaign until the second it ends', () => {
        const { result } = renderHook(() => useLiveDiscountCampaign(), { wrapper: wrapperWith(campaign) });
        expect(result.current).toEqual(campaign);

        act(() => {
            vi.advanceTimersByTime(4_000);
        });
        expect(result.current).toEqual(campaign);

        act(() => {
            vi.advanceTimersByTime(1_000);
        });
        expect(result.current).toBeNull();
    });

    it('returns null without a campaign', () => {
        const { result } = renderHook(() => useLiveDiscountCampaign(), { wrapper: wrapperWith(null) });
        expect(result.current).toBeNull();
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/discountCampaign hooks/useLiveDiscountCampaign.test.tsx`
Expected: FAIL, the modules don't exist.

- [ ] **Step 3: Write `lib/discountCampaign.ts`**

```ts
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { DiscountCampaignLiveDto, SiteNoticeLiveDto } from '@/lib/api/types';
import type { SiteNoticeViewArea } from '@/lib/siteNotices';

// The discount campaign's banner (spec 2026-11-03-discount-campaigns-design). No React here, so the
// root layouts can seed the query cache with the same key.

export const discountCampaignKeys = {
    live: () => ['discount-campaign', 'live'] as const,
};

const CAMPAIGN_AREAS: ReadonlySet<SiteNoticeViewArea> = new Set<SiteNoticeViewArea>(['PUBLIC', 'HOST']);

// A campaign's text never changes in a way that should reopen it, so its version is always 1.
export function discountCampaignDismissalKey(id: string): string {
    return `${id}:1`;
}

// Whether the campaign takes the bar from `notice`, the notice that would show otherwise. Only a
// warning or a critical notice keeps it. A closed campaign stays closed.
export function campaignShowsOver(
    campaign: DiscountCampaignLiveDto,
    notice: SiteNoticeLiveDto | null,
    area: SiteNoticeViewArea | null,
    dismissed: ReadonlySet<string>,
): boolean {
    if (area === null || !CAMPAIGN_AREAS.has(area)) return false;
    if (dismissed.has(discountCampaignDismissalKey(campaign.id))) return false;
    return notice === null || notice.tone === 'OFFER' || notice.tone === 'INFO';
}

export function plansHref(locale: Locale): string {
    return `${getPublicLandingPath(locale)}#pricing`;
}
```

- [ ] **Step 4: Write `lib/discountCampaign.server.ts`**

```ts
import { endpoints } from '@/lib/api/endpoints';
import type { DiscountCampaignLiveDto } from '@/lib/api/types';

// Server-only: the live discount campaign from Spring, cached for a minute in Next's data cache. When
// Spring fails, the last good copy this server instance saw is served instead; the browser still
// hides it at its end. Never throws.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3000;

let lastGood: DiscountCampaignLiveDto | null = null;

export async function fetchLiveDiscountCampaign(): Promise<DiscountCampaignLiveDto | null> {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.discountCampaign.live}`, {
            next: { revalidate: REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.status === 204) {
            lastGood = null;
            return null;
        }
        if (!res.ok) return lastGood;
        lastGood = (await res.json()) as DiscountCampaignLiveDto;
        return lastGood;
    } catch {
        return lastGood;
    }
}
```

- [ ] **Step 5: Write `app/api/discount-campaign/route.ts`**

```ts
import { NextResponse } from 'next/server';

import { fetchLiveDiscountCampaign } from '@/lib/discountCampaign.server';

// The live discount campaign for the browser's refetches (hooks/useLiveDiscountCampaign.ts). Same
// caching as app/api/site-notices.
export async function GET() {
    const campaign = await fetchLiveDiscountCampaign();
    return NextResponse.json(campaign, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
    });
}
```

- [ ] **Step 6: Write `hooks/useLiveDiscountCampaign.ts`**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { DiscountCampaignLiveDto } from '@/lib/api/types';
import { discountCampaignKeys } from '@/lib/discountCampaign';

// The live discount campaign, null from the second it ends. Seeded on the server by both root
// layouts; refetched on focus and every five minutes. Reads the app's own cached route.

const CAMPAIGN_URL = '/api/discount-campaign';
const STALE_MS = 60 * 1000;
const REFETCH_MS = 5 * 60 * 1000;
// setTimeout fires at once for anything longer than this.
const MAX_TIMEOUT_MS = 2_147_483_647;

async function fetchCampaign(): Promise<DiscountCampaignLiveDto | null> {
    const res = await fetch(CAMPAIGN_URL);
    if (!res.ok) throw new Error(`Discount campaign failed with status ${res.status}`);
    return (await res.json()) as DiscountCampaignLiveDto | null;
}

export function useLiveDiscountCampaign(): DiscountCampaignLiveDto | null {
    const { data } = useQuery({
        queryKey: discountCampaignKeys.live(),
        queryFn: fetchCampaign,
        staleTime: STALE_MS,
        refetchInterval: REFETCH_MS,
        refetchOnWindowFocus: true,
    });
    const [now, setNow] = useState(() => Date.now());
    const endsAt = data ? Date.parse(data.endsAt) : null;

    useEffect(() => {
        if (endsAt === null || endsAt <= now) return;
        const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(endsAt - Date.now(), 0), MAX_TIMEOUT_MS));
        return () => clearTimeout(timer);
    }, [endsAt, now]);

    return data && endsAt !== null && endsAt > now ? data : null;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run lib/discountCampaign hooks/useLiveDiscountCampaign.test.tsx`
Expected: PASS.

- [ ] **Step 8: Seed the cache in both layouts**

In `app/(landing)/layout.tsx` and `app/(main)/layout.tsx`, replace the existing `try` block with this, and add the imports `discountCampaignKeys` from `@/lib/discountCampaign` and `fetchLiveDiscountCampaign` from `@/lib/discountCampaign.server`:

```ts
    // Public and the same for everyone: cached for a minute, never throw (see the .server files).
    try {
        const [notices, campaign] = await Promise.all([fetchLiveSiteNotices(), fetchLiveDiscountCampaign()]);
        queryClient.setQueryData(siteNoticeKeys.live(), notices);
        queryClient.setQueryData(discountCampaignKeys.live(), campaign);
    } catch {
        // The bar fetches them itself.
    }
```

- [ ] **Step 9: Commit**

```bash
git add lib/discountCampaign.ts lib/discountCampaign.test.ts lib/discountCampaign.server.ts lib/discountCampaign.server.test.ts "app/api/discount-campaign/route.ts" hooks/useLiveDiscountCampaign.ts hooks/useLiveDiscountCampaign.test.tsx "app/(landing)/layout.tsx" "app/(main)/layout.tsx"
git commit -m "KAN-115: read the live discount campaign"
```

## Task 4: The banner

**Files:**
- Create: `hooks/useCampaignCountdown.ts`, `components/siteNotices/CampaignCountdown.tsx`
- Modify: `hooks/useSiteNoticeBar.ts`, `components/siteNotices/SiteNoticeBanner.tsx`, `components/siteNotices/SiteNoticeBar.tsx`
- Modify: `messages/en.json:14`, `messages/el.json:14`
- Test: `hooks/useSiteNoticeBar.test.tsx`, `hooks/useCampaignCountdown.test.tsx`

- [ ] **Step 1: Add the banner text**

In the `SiteNotice` block of `messages/en.json`:

```json
"campaign": "{percent}% off all plans.",
"campaignEndsIn": "Ends in {countdown}.",
"campaignEndsOn": "Ends on {date}",
"seePlans": "See plans",
"countdownDays": "{days}d {hours}h {minutes}m",
"countdownHours": "{hours}h {minutes}m",
"countdownMinutes": "{minutes}m {seconds}s",
```

In the `SiteNotice` block of `messages/el.json`:

```json
"campaign": "{percent}% έκπτωση σε όλα τα πλάνα.",
"campaignEndsIn": "Λήγει σε {countdown}.",
"campaignEndsOn": "Λήγει στις {date}",
"seePlans": "Δείτε τα πλάνα",
"countdownDays": "{days}ημ {hours}ώ {minutes}λ",
"countdownHours": "{hours}ώ {minutes}λ",
"countdownMinutes": "{minutes}λ {seconds}δ",
```

- [ ] **Step 2: Write the failing tests**

Add to `hooks/useSiteNoticeBar.test.tsx`, extending the hoisted state and adding a mock above the imports:

```tsx
const state = vi.hoisted(() => ({
    notices: [] as SiteNoticeLiveDto[],
    apiDown: false,
    campaign: null as DiscountCampaignLiveDto | null,
}));
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: () => state.campaign }));
```

Import `DiscountCampaignLiveDto` beside `SiteNoticeLiveDto`, reset `state.campaign = null` in `afterEach`, and add inside the `describe`:

```tsx
    const campaign: DiscountCampaignLiveDto = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

    it('shows the campaign, with its end and a link to the plans', () => {
        state.campaign = campaign;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current).toMatchObject({
            tone: 'OFFER',
            message: 'campaign',
            link: { href: '/el#pricing', label: 'seePlans' },
            countdownEndsAt: campaign.endsAt,
        });
    });

    it('takes the bar from an offer but not from a warning', () => {
        state.campaign = campaign;
        state.notices = [offer];
        const { result, rerender } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current?.message).toBe('campaign');

        state.notices = [{ ...offer, tone: 'WARNING' }];
        rerender();
        expect(result.current?.message).toBe('20% έκπτωση');
    });

    it('gives way to the notice once closed', () => {
        state.campaign = campaign;
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        act(() => result.current?.onDismiss?.());
        expect(result.current?.message).toBe('20% έκπτωση');
    });

    it('never shows to a guest', () => {
        state.campaign = campaign;
        const { result } = renderHook(() => useSiteNoticeBar('GUEST', ''));
        expect(result.current).toBeNull();
    });

    it('loses to the outage notice', () => {
        state.campaign = campaign;
        state.apiDown = true;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current?.tone).toBe('CRITICAL');
    });
```

`hooks/useCampaignCountdown.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignCountdown } from '@/hooks/useCampaignCountdown';
import messages from '@/messages/en.json';

const NOW = new Date('2026-11-03T10:00:00Z');

function wrapper({ children }: { children: ReactNode }) {
    return (
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {children}
        </NextIntlClientProvider>
    );
}

function countdownUntil(endsAt: string) {
    return renderHook(() => useCampaignCountdown(endsAt), { wrapper }).result;
}

describe('useCampaignCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows days, hours and minutes when there are days left', () => {
        expect(countdownUntil('2026-11-05T15:12:30Z').current.endsIn).toBe('Ends in 2d 5h 12m.');
    });

    it('shows hours and minutes on the last day', () => {
        expect(countdownUntil('2026-11-03T15:12:30Z').current.endsIn).toBe('Ends in 5h 12m.');
    });

    it('shows minutes and seconds in the last hour', () => {
        expect(countdownUntil('2026-11-03T10:12:30Z').current.endsIn).toBe('Ends in 12m 30s.');
    });

    it('hides itself once it ends', () => {
        const result = countdownUntil('2026-11-03T10:00:02Z');
        expect(result.current.visible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(2_000);
        });
        expect(result.current.visible).toBe(false);
    });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run hooks/useSiteNoticeBar.test.tsx hooks/useCampaignCountdown.test.tsx`
Expected: FAIL. The bar never shows the campaign, and `useCampaignCountdown` does not exist.

- [ ] **Step 4: Write `hooks/useCampaignCountdown.ts`**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

import { useCountdown } from '@/hooks/useCountdown';
import { formatDate } from '@/lib/datetime';

const ENDS_ON_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };

function subscribeToNothing() {
    return () => undefined;
}

function isMountedOnClient() {
    return true;
}

function isMountedOnServer() {
    return false;
}

// The campaign's remaining time, ticking every second, and its end date for screen readers. Hidden
// until mounted: the server's clock would differ from the browser's and break hydration.
export function useCampaignCountdown(endsAt: string) {
    const t = useTranslations('SiteNotice');
    const locale = useLocale();
    const { days, hours, minutes, seconds, hasFinished } = useCountdown(Date.parse(endsAt));
    const mounted = useSyncExternalStore(subscribeToNothing, isMountedOnClient, isMountedOnServer);

    const countdown =
        days > 0
            ? t('countdownDays', { days, hours, minutes })
            : hours > 0
              ? t('countdownHours', { hours, minutes })
              : t('countdownMinutes', { minutes, seconds });

    return {
        visible: mounted && !hasFinished,
        endsIn: t('campaignEndsIn', { countdown }),
        endsOn: t('campaignEndsOn', { date: formatDate(locale, endsAt, ENDS_ON_FORMAT) }),
    };
}
```

- [ ] **Step 5: Write `components/siteNotices/CampaignCountdown.tsx`**

```tsx
'use client';

import { useCampaignCountdown } from '@/hooks/useCampaignCountdown';

// Screen readers get the end date once instead of a clock that changes every second.
export function CampaignCountdown({ endsAt }: { endsAt: string }) {
    const { visible, endsIn, endsOn } = useCampaignCountdown(endsAt);
    if (!visible) return null;

    return (
        <>
            <span aria-hidden="true" className="tabular-nums">
                {endsIn}
            </span>
            <span className="sr-only">{endsOn}</span>
        </>
    );
}
```

- [ ] **Step 6: Add the campaign to `hooks/useSiteNoticeBar.ts`**

Replace the file:

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useApiDown } from '@/hooks/useApiHealth';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { useSiteNoticeDismissals } from '@/hooks/useSiteNoticeDismissals';
import { useSiteNotices } from '@/hooks/useSiteNotices';
import type { Locale } from '@/i18n/config';
import type { SiteNoticeLiveDto, SiteNoticeTone } from '@/lib/api/types';
import { campaignShowsOver, discountCampaignDismissalKey, plansHref } from '@/lib/discountCampaign';
import { numberFormat } from '@/lib/format';
import { resolveLocalizedText } from '@/lib/localizedText';
import { dismissalKey, pickSiteNotice, type SiteNoticeViewArea } from '@/lib/siteNotices';

export type SiteNoticeView = {
    tone: SiteNoticeTone;
    message: string;
    link: { href: string; label: string } | null;
    onDismiss: (() => void) | null;
    countdownEndsAt?: string;
};

const NO_NOTICES: SiteNoticeLiveDto[] = [];

// What the bar shows, if anything: the built-in outage notice while Spring is unreachable, otherwise
// the live discount campaign, otherwise the best matching notice that hasn't been closed. A warning
// or critical notice keeps the bar over the campaign.
export function useSiteNoticeBar(area: SiteNoticeViewArea | null, initialDismissed: string): SiteNoticeView | null {
    const t = useTranslations('SiteNotice');
    const locale = useLocale() as Locale;
    const notices = useSiteNotices().data ?? NO_NOTICES;
    const campaign = useLiveDiscountCampaign();
    const apiDown = useApiDown();
    const { dismissed, dismiss } = useSiteNoticeDismissals(initialDismissed);
    const notice = useMemo(() => pickSiteNotice(notices, area, dismissed), [notices, area, dismissed]);
    const key = notice ? dismissalKey(notice) : null;
    const campaignKey = campaign ? discountCampaignDismissalKey(campaign.id) : null;
    const handleDismiss = useCallback(() => {
        if (key) dismiss(key);
    }, [dismiss, key]);
    const handleCampaignDismiss = useCallback(() => {
        if (campaignKey) dismiss(campaignKey);
    }, [dismiss, campaignKey]);

    if (area === null) return null;
    if (apiDown) return { tone: 'CRITICAL', message: t('apiDown'), link: null, onDismiss: null };
    if (campaign && campaignShowsOver(campaign, notice, area, dismissed)) {
        return {
            tone: 'OFFER',
            message: t('campaign', { percent: numberFormat(locale).format(campaign.percent) }),
            link: { href: plansHref(locale), label: t('seePlans') },
            onDismiss: handleCampaignDismiss,
            countdownEndsAt: campaign.endsAt,
        };
    }
    if (!notice) return null;
    return {
        tone: notice.tone,
        message: resolveLocalizedText(notice.message, locale),
        link: notice.linkUrl ? { href: notice.linkUrl, label: resolveLocalizedText(notice.linkLabel, locale) } : null,
        onDismiss: notice.dismissible ? handleDismiss : null,
    };
}
```

- [ ] **Step 7: Render the countdown in the banner**

In `components/siteNotices/SiteNoticeBanner.tsx`, import `CampaignCountdown`, add the optional prop to the destructuring and to the props type:

```tsx
    countdownEndsAt,
```

```tsx
    countdownEndsAt?: string;
```

Inside the `<span className="min-w-0">`, directly after `{message}`:

```tsx
                    {countdownEndsAt && (
                        <>
                            {' '}
                            <CampaignCountdown endsAt={countdownEndsAt} />
                        </>
                    )}
```

In `components/siteNotices/SiteNoticeBar.tsx`, pass it on:

```tsx
    return <SiteNoticeBanner tone={view.tone} message={view.message} link={view.link} onDismiss={view.onDismiss} countdownEndsAt={view.countdownEndsAt} />;
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run hooks/useSiteNoticeBar.test.tsx hooks/useCampaignCountdown.test.tsx components/siteNotices`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add hooks/useCampaignCountdown.ts hooks/useCampaignCountdown.test.tsx components/siteNotices hooks/useSiteNoticeBar.ts hooks/useSiteNoticeBar.test.tsx messages/en.json messages/el.json
git commit -m "KAN-115: show the campaign in the notice bar with a countdown"
```

## Task 5: The guest card

**Files:**
- Modify: `components/feed/guestOffer/GuestOfferCard.tsx`, `lib/guestOffer.ts`
- Test: `components/feed/guestOffer/GuestOfferCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `GuestOfferCard.test.tsx`, next to `let offer`:

```tsx
let campaign: { id: string; percent: number; startsAt: string; endsAt: string } | null = null;
```

next to the other mocks:

```tsx
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: () => campaign }));
vi.mock('@/components/siteNotices/CampaignCountdown', () => ({ CampaignCountdown: () => <span>countdown</span> }));
```

In `beforeEach`, add `campaign = null;`. Inside the `describe`:

```tsx
    const live = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

    it('replaces the claim with the campaign and a link to the plans', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        campaign = live;
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(screen.queryByRole('button', { name: /claim/ })).not.toBeInTheDocument();
        expect(screen.getByText('countdown')).toBeInTheDocument();
        expect(screen.getByText('campaign')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'seePlans' })).toHaveAttribute(
            'href',
            '/?utm_source=storywall&utm_medium=feed&utm_campaign=guest-offer#pricing',
        );
    });

    it('counts a tap on the plans link', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        campaign = live;
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        fireEvent.click(screen.getByRole('link', { name: 'seePlans' }));

        expect(markDiscovered).toHaveBeenCalledOnce();
    });

    it('keeps a code the guest already claimed', () => {
        offer = { discountPercent: 15, code: 'ABC123', endsAt: null };
        campaign = live;
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(screen.queryByText('campaign')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /discover/ })).toBeInTheDocument();
    });

    it('shows the claim again once the campaign ends', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(screen.getByRole('button', { name: /claim/ })).toBeInTheDocument();
    });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/feed/guestOffer/GuestOfferCard.test.tsx`
Expected: FAIL, no `seePlans` link.

- [ ] **Step 3: Add the link helper**

Add to `lib/guestOffer.ts`:

```ts
// The same page at its plans, for the card while a discount campaign is live.
export function guestOfferPlansHref(locale: Locale): string {
    return `${guestOfferLandingHref(locale)}#pricing`;
}
```

- [ ] **Step 4: Update the card**

In `GuestOfferCard.tsx`, add the imports:

```tsx
import { CampaignCountdown } from '@/components/siteNotices/CampaignCountdown';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { numberFormat } from '@/lib/format';
```

and import `guestOfferPlansHref` beside `guestOfferLandingHref`. At the top of the component:

```tsx
    const tNotice = useTranslations('SiteNotice');
    const campaign = useLiveDiscountCampaign();
```

Directly after `if (!offer) return null;`:

```tsx
    // A code the guest already holds stays; otherwise the campaign takes the claim's place.
    const liveCampaign = offer.code ? null : campaign;
```

Replace the message paragraph:

```tsx
                        <p className="mt-1.5 max-w-[34ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                            {liveCampaign ? (
                                <>
                                    {tNotice('campaign', { percent: numberFormat(locale).format(liveCampaign.percent) })}{' '}
                                    <CampaignCountdown endsAt={liveCampaign.endsAt} />
                                </>
                            ) : (
                                t('line')
                            )}
                        </p>
```

Replace the actions conditional so it opens with the campaign case:

```tsx
                    {/* Actions */}
                    {liveCampaign ? (
                        <div className="mt-5 flex flex-wrap gap-2.5 @lg:flex-col @lg:items-stretch">
                            <a
                                href={guestOfferPlansHref(locale)}
                                target="_blank"
                                rel="noopener"
                                onClick={markDiscovered}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                            >
                                {tNotice('seePlans')}
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </div>
                    ) : offer.code ? (
```

Leave the rest of the conditional as it is.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/feed/guestOffer`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/feed/guestOffer lib/guestOffer.ts
git commit -m "KAN-115: advertise the campaign on the guest card"
```

## Task 6: The admin screen

**Files:**
- Create: `lib/discountCampaignForm.ts`, `hooks/useAdminDiscountCampaigns.ts`, `hooks/useDiscountCampaignsPanel.ts`, `hooks/useDiscountCampaignForm.ts`
- Create: `components/admin/discountCampaigns/DiscountCampaignsPanel.tsx`, `DiscountCampaignsTable.tsx`, `DiscountCampaignDrawer.tsx`
- Modify: `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminConsole.tsx`, `components/admin/AdminShellNav.tsx`
- Modify: `messages/en.json`, `messages/el.json`
- Test: `lib/discountCampaignForm.test.ts`, `components/admin/AdminNavigationContext.discountCampaigns.test.tsx`, `components/admin/discountCampaigns/DiscountCampaignDrawer.test.tsx`

- [ ] **Step 1: Add the admin text**

In `messages/en.json`, in `AdminPage.tabs` beside `"discountCodes"` (the block starting l.2998):

```json
"discountCampaigns": "Discount campaigns",
```

In `AdminPage`, before `"siteNotices"` (l.6145):

```json
"discountCampaigns": {
    "create": "New discount campaign",
    "createTitle": "New discount campaign",
    "editTitle": "Edit discount campaign",
    "empty": "No discount campaigns yet.",
    "columns": {
        "name": "Name",
        "percent": "Discount %",
        "status": "Status",
        "dates": "Dates"
    },
    "fields": {
        "name": "Name",
        "percent": "Discount %",
        "label": "Name at checkout",
        "linkName": "Link name",
        "startsAt": "Starts",
        "endsAt": "Ends"
    },
    "stop": "Stop campaign",
    "stopTitle": "Stop this campaign?",
    "stopBody": "Prices go back to normal now.",
    "stopConfirm": "Stop campaign",
    "stopCancel": "Keep it running",
    "delete": "Delete campaign",
    "deleteTitle": "Delete this campaign?",
    "deleteBody": "It won't go live."
},
```

The approved confirmation reads as one line, "Stop this campaign? Prices go back to normal now.", split here into the modal's title and body.

In `messages/el.json`, in `AdminPage.tabs` beside `"discountCodes"` (the block starting l.3120):

```json
"discountCampaigns": "Εκπτωτικές καμπάνιες",
```

In `AdminPage`, before `"siteNotices"` (l.6269):

```json
"discountCampaigns": {
    "create": "Νέα εκπτωτική καμπάνια",
    "createTitle": "Νέα εκπτωτική καμπάνια",
    "editTitle": "Επεξεργασία εκπτωτικής καμπάνιας",
    "empty": "Δεν υπάρχουν εκπτωτικές καμπάνιες.",
    "columns": {
        "name": "Όνομα",
        "percent": "Έκπτωση %",
        "status": "Κατάσταση",
        "dates": "Ημερομηνίες"
    },
    "fields": {
        "name": "Όνομα",
        "percent": "Έκπτωση %",
        "label": "Όνομα στην πληρωμή",
        "linkName": "Όνομα συνδέσμων",
        "startsAt": "Έναρξη",
        "endsAt": "Λήξη"
    },
    "stop": "Διακοπή καμπάνιας",
    "stopTitle": "Διακοπή της καμπάνιας;",
    "stopBody": "Οι τιμές επιστρέφουν στο κανονικό τώρα.",
    "stopConfirm": "Διακοπή καμπάνιας",
    "stopCancel": "Να συνεχιστεί",
    "delete": "Διαγραφή καμπάνιας",
    "deleteTitle": "Διαγραφή της καμπάνιας;",
    "deleteBody": "Δεν θα ξεκινήσει."
},
```

- [ ] **Step 2: Write the failing form test**

`lib/discountCampaignForm.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { EMPTY_DISCOUNT_CAMPAIGN_FORM, formOfCampaign, requestOfCampaignForm } from '@/lib/discountCampaignForm';

describe('requestOfCampaignForm', () => {
    const form = { name: ' Black Friday ', percent: '12.5', label: '  ', linkName: 'black-friday', startsAt: '', endsAt: '2026-11-30T23:59' };

    it('sends an empty start as null and an empty label as null', () => {
        const request = requestOfCampaignForm(form);

        expect(request.name).toBe('Black Friday');
        expect(request.percent).toBe(12.5);
        expect(request.label).toBeNull();
        expect(request.startsAt).toBeNull();
        expect(request.endsAt).toBe(new Date('2026-11-30T23:59').toISOString());
    });

    it('sends a set start as an instant', () => {
        expect(requestOfCampaignForm({ ...form, startsAt: '2026-11-28T00:00' }).startsAt).toBe(new Date('2026-11-28T00:00').toISOString());
    });
});

describe('formOfCampaign', () => {
    it('round trips a saved campaign', () => {
        const campaign: AdminDiscountCampaignDto = {
            id: 'c1',
            name: 'Black Friday',
            percent: 20,
            label: null,
            linkName: 'black-friday',
            startsAt: '2026-11-28T00:00:00Z',
            endsAt: '2026-11-30T00:00:00Z',
            status: 'SCHEDULED',
            createdAt: '2026-11-01T00:00:00Z',
        };

        const form = formOfCampaign(campaign);

        expect(form.percent).toBe('20');
        expect(form.label).toBe('');
        expect(requestOfCampaignForm(form).endsAt).toBe(new Date(campaign.endsAt).toISOString());
    });

    it('starts empty for a new one', () => {
        expect(EMPTY_DISCOUNT_CAMPAIGN_FORM.name).toBe('');
    });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run lib/discountCampaignForm.test.ts`
Expected: FAIL, the module doesn't exist.

- [ ] **Step 4: Write `lib/discountCampaignForm.ts`**

```ts
import { instantToLocalInput } from '@/lib/adminPlanForm';
import type { AdminDiscountCampaignDto, DiscountCampaignRequestDto } from '@/lib/api/types';
import { datetimeLocalValueToIso } from '@/lib/datetime';

// The admin drawer's form for one discount campaign. Times are edited in the admin's own clock
// ("YYYY-MM-DDTHH:mm") and sent as instants. Limits mirror DiscountCampaignService, which checks
// everything else.

export const DISCOUNT_CAMPAIGN_NAME_MAX = 50;
export const DISCOUNT_CAMPAIGN_LABEL_MAX = 100;
export const DISCOUNT_CAMPAIGN_LINK_NAME_MAX = 60;

export type DiscountCampaignForm = {
    name: string;
    percent: string;
    label: string;
    linkName: string;
    startsAt: string;
    endsAt: string;
};

export const EMPTY_DISCOUNT_CAMPAIGN_FORM: DiscountCampaignForm = { name: '', percent: '', label: '', linkName: '', startsAt: '', endsAt: '' };

export function formOfCampaign(campaign: AdminDiscountCampaignDto): DiscountCampaignForm {
    return {
        name: campaign.name,
        percent: String(campaign.percent),
        label: campaign.label ?? '',
        linkName: campaign.linkName,
        startsAt: instantToLocalInput(campaign.startsAt),
        endsAt: instantToLocalInput(campaign.endsAt),
    };
}

export function requestOfCampaignForm(form: DiscountCampaignForm): DiscountCampaignRequestDto {
    return {
        name: form.name.trim(),
        percent: Number(form.percent),
        label: form.label.trim() || null,
        linkName: form.linkName,
        startsAt: datetimeLocalValueToIso(form.startsAt),
        // The field is required, so the browser only submits it filled in.
        endsAt: datetimeLocalValueToIso(form.endsAt) ?? '',
    };
}
```

- [ ] **Step 5: Write `hooks/useAdminDiscountCampaigns.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDiscountCampaignDto, DiscountCampaignRequestDto } from '@/lib/api/types';
import { discountCampaignKeys } from '@/lib/discountCampaign';

// Admin discount campaigns (/api/admin/discount-campaigns). Every write refetches the list, the live
// campaign and the public plans. The live campaign is cached for a minute on the server, so a change
// reaches the bar within about a minute.

export const adminDiscountCampaignKeys = {
    all: ['admin', 'discount-campaigns'] as const,
};

export function useAdminDiscountCampaigns() {
    return useQuery({
        queryKey: adminDiscountCampaignKeys.all,
        queryFn: () => api.get<AdminDiscountCampaignDto[]>(endpoints.admin.discountCampaigns.list),
    });
}

function useRefreshDiscountCampaigns() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminDiscountCampaignKeys.all });
        void queryClient.invalidateQueries({ queryKey: discountCampaignKeys.live() });
        invalidatePublicConfig(queryClient);
    }, [queryClient]);
}

export function useCreateDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: (input: DiscountCampaignRequestDto) => api.post<AdminDiscountCampaignDto>(endpoints.admin.discountCampaigns.list, input),
        onSuccess: refresh,
    });
}

export function useUpdateDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: DiscountCampaignRequestDto }) =>
            api.put<AdminDiscountCampaignDto>(endpoints.admin.discountCampaigns.byId(id), input),
        onSuccess: refresh,
    });
}

export function useStopDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.post<AdminDiscountCampaignDto>(endpoints.admin.discountCampaigns.stop(id), {}),
        onSuccess: refresh,
    });
}

export function useDeleteDiscountCampaign() {
    const refresh = useRefreshDiscountCampaigns();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.discountCampaigns.byId(id)),
        onSuccess: refresh,
    });
}
```

- [ ] **Step 6: Write `hooks/useDiscountCampaignsPanel.ts`**

```ts
'use client';

import { type MouseEvent, useCallback, useRef, useState } from 'react';

import { useAdminDiscountCampaigns } from '@/hooks/useAdminDiscountCampaigns';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';

// token: which opening this is. The drawer is keyed on it, so each opening starts from the saved values.
type DrawerState = { open: boolean; campaign: AdminDiscountCampaignDto | null; token: number };

const NO_CAMPAIGNS: AdminDiscountCampaignDto[] = [];

export function useDiscountCampaignsPanel() {
    const query = useAdminDiscountCampaigns();
    const campaigns = query.data ?? NO_CAMPAIGNS;
    const [drawer, setDrawer] = useState<DrawerState>({ open: false, campaign: null, token: 0 });
    const nextToken = useRef(0);

    const open = useCallback((campaign: AdminDiscountCampaignDto | null) => {
        nextToken.current += 1;
        setDrawer({ open: true, campaign, token: nextToken.current });
    }, []);

    const handleCreateClick = useCallback(() => open(null), [open]);

    const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = campaigns.find((campaign) => campaign.id === event.currentTarget.dataset.campaignId);
            if (found) open(found);
        },
        [campaigns, open],
    );

    const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);

    return { query, campaigns, drawer, handleCreateClick, handleEditClick, closeDrawer };
}
```

- [ ] **Step 7: Write `hooks/useDiscountCampaignForm.ts`**

```ts
'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateDiscountCampaign, useDeleteDiscountCampaign, useStopDiscountCampaign, useUpdateDiscountCampaign } from '@/hooks/useAdminDiscountCampaigns';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { toUtmValue } from '@/lib/campaignLinks';
import { type DiscountCampaignForm, DISCOUNT_CAMPAIGN_LINK_NAME_MAX, EMPTY_DISCOUNT_CAMPAIGN_FORM, formOfCampaign, requestOfCampaignForm } from '@/lib/discountCampaignForm';

type TextField = 'name' | 'percent' | 'label';
type Confirmation = 'stop' | 'delete' | null;

// The server names the plans, in the admin's language, so its text is shown as it is.
function priceTooLowDetail(error: unknown): string | null {
    if (getErrorCode(error) !== ERROR_CODES.DISCOUNT_CAMPAIGN_PRICE_TOO_LOW) return null;
    return (error instanceof ApiError && error.problem?.detail) || null;
}

// The discount campaign drawer's state and actions. The drawer is remounted on every opening, so
// the form starts from the campaign's saved values (or the empty form).
export function useDiscountCampaignForm(campaign: AdminDiscountCampaignDto | null, onDone: () => void) {
    const create = useCreateDiscountCampaign();
    const update = useUpdateDiscountCampaign();
    const stop = useStopDiscountCampaign();
    const remove = useDeleteDiscountCampaign();
    const [form, setForm] = useState<DiscountCampaignForm>(() => (campaign ? formOfCampaign(campaign) : EMPTY_DISCOUNT_CAMPAIGN_FORM));
    const [confirmation, setConfirmation] = useState<Confirmation>(null);
    const [error, setError] = useState<unknown>(null);

    const busy = create.isPending || update.isPending || stop.isPending || remove.isPending;
    const status = campaign?.status ?? null;
    const readOnly = status === 'ENDED' || status === 'OFF';

    function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleLinkNameChange(event: ChangeEvent<HTMLInputElement>) {
        const linkName = toUtmValue(event.currentTarget.value).slice(0, DISCOUNT_CAMPAIGN_LINK_NAME_MAX);
        setForm((current) => ({ ...current, linkName }));
    }

    function setStartsAt(startsAt: string) {
        setForm((current) => ({ ...current, startsAt }));
    }

    function setEndsAt(endsAt: string) {
        setForm((current) => ({ ...current, endsAt }));
    }

    async function save() {
        setError(null);
        try {
            const input = requestOfCampaignForm(form);
            if (campaign) await update.mutateAsync({ id: campaign.id, input });
            else await create.mutateAsync(input);
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || readOnly) return;
        void save();
    }

    function openStopConfirmation() {
        setConfirmation('stop');
    }

    function openDeleteConfirmation() {
        setConfirmation('delete');
    }

    function closeConfirmation() {
        setConfirmation(null);
    }

    async function confirmAction() {
        if (!campaign || !confirmation) return;
        setError(null);
        try {
            if (confirmation === 'stop') await stop.mutateAsync(campaign.id);
            else await remove.mutateAsync(campaign.id);
            setConfirmation(null);
            onDone();
        } catch (caught) {
            setConfirmation(null);
            setError(caught);
        }
    }

    return {
        form,
        busy,
        confirming: stop.isPending || remove.isPending,
        readOnly,
        canStop: status === 'LIVE',
        canDelete: status === 'SCHEDULED',
        linkNameLocked: campaign !== null,
        startLocked: status === 'LIVE',
        error,
        errorDetail: priceTooLowDetail(error),
        confirmation,
        handleTextChange,
        handleLinkNameChange,
        setStartsAt,
        setEndsAt,
        handleSubmit,
        openStopConfirmation,
        openDeleteConfirmation,
        closeConfirmation,
        confirmAction,
    };
}
```

- [ ] **Step 8: Write the failing drawer test**

`components/admin/discountCampaigns/DiscountCampaignDrawer.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DiscountCampaignDrawer } from '@/components/admin/discountCampaigns/DiscountCampaignDrawer';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const idle = { isPending: false, mutateAsync: vi.fn() };
vi.mock('@/hooks/useAdminDiscountCampaigns', () => ({
    useCreateDiscountCampaign: () => idle,
    useUpdateDiscountCampaign: () => idle,
    useStopDiscountCampaign: () => idle,
    useDeleteDiscountCampaign: () => idle,
}));

const campaign = (status: AdminDiscountCampaignDto['status']): AdminDiscountCampaignDto => ({
    id: 'c1',
    name: 'Black Friday',
    percent: 20,
    label: null,
    linkName: 'black-friday',
    startsAt: '2026-11-28T00:00:00Z',
    endsAt: '2026-11-30T00:00:00Z',
    status,
    createdAt: '2026-11-01T00:00:00Z',
});

function renderDrawer(value: AdminDiscountCampaignDto | null) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DiscountCampaignDrawer open campaign={value} onCloseAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
}

describe('DiscountCampaignDrawer', () => {
    afterEach(cleanup);

    it('lets a new campaign pick its link name', () => {
        renderDrawer(null);

        expect(screen.getByRole('textbox', { name: 'Link name' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Stop campaign' })).not.toBeInTheDocument();
    });

    it('offers Stop on a live campaign, with the link name fixed', () => {
        renderDrawer(campaign('LIVE'));

        expect(screen.getByRole('button', { name: 'Stop campaign' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete campaign' })).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Link name' })).toBeDisabled();
    });

    it('offers Delete on a scheduled campaign', () => {
        renderDrawer(campaign('SCHEDULED'));

        expect(screen.getByRole('button', { name: 'Delete campaign' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Stop campaign' })).not.toBeInTheDocument();
    });

    it('is read only once ended', () => {
        renderDrawer(campaign('ENDED'));

        expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: messages.AdminPage.save })).not.toBeInTheDocument();
    });
});
```

Run: `npx vitest run components/admin/discountCampaigns/DiscountCampaignDrawer.test.tsx`
Expected: FAIL, the component doesn't exist.

- [ ] **Step 9: Write `DiscountCampaignDrawer.tsx`**

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useDiscountCampaignForm } from '@/hooks/useDiscountCampaignForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { DISCOUNT_CAMPAIGN_LABEL_MAX, DISCOUNT_CAMPAIGN_LINK_NAME_MAX, DISCOUNT_CAMPAIGN_NAME_MAX } from '@/lib/discountCampaignForm';

const FORM_ID = 'discount-campaign-form';

// Create or edit one discount campaign. The panel remounts it (key) on every opening.
export function DiscountCampaignDrawer({
    open,
    campaign,
    onCloseAction,
}: {
    open: boolean;
    campaign: AdminDiscountCampaignDto | null;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const f = useDiscountCampaignForm(campaign, onCloseAction);
    const { form } = f;

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={f.busy}
                title={campaign ? t('discountCampaigns.editTitle') : t('discountCampaigns.createTitle')}
                footer={
                    <>
                        {/* Danger */}
                        <div>
                            {f.canStop && (
                                <button
                                    type="button"
                                    onClick={f.openStopConfirmation}
                                    disabled={f.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('discountCampaigns.stop')}
                                </button>
                            )}
                            {f.canDelete && (
                                <button
                                    type="button"
                                    onClick={f.openDeleteConfirmation}
                                    disabled={f.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('discountCampaigns.delete')}
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={f.busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            {!f.readOnly && (
                                <button
                                    type="submit"
                                    form={FORM_ID}
                                    disabled={f.busy}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {f.busy && !f.confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                    {t('save')}
                                </button>
                            )}
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={f.handleSubmit}>
                    <fieldset disabled={f.readOnly} className="space-y-5">
                        {/* Details */}
                        <AdminField label={t('discountCampaigns.fields.name')} required>
                            <input
                                name="name"
                                aria-label={t('discountCampaigns.fields.name')}
                                required
                                maxLength={DISCOUNT_CAMPAIGN_NAME_MAX}
                                className={adminInputClass()}
                                value={form.name}
                                onChange={f.handleTextChange}
                            />
                        </AdminField>
                        <AdminField label={t('discountCampaigns.fields.percent')} required>
                            <input
                                name="percent"
                                type="number"
                                aria-label={t('discountCampaigns.fields.percent')}
                                required
                                min="0.01"
                                max="99.99"
                                step="0.01"
                                className={adminInputClass('font-mono')}
                                value={form.percent}
                                onChange={f.handleTextChange}
                            />
                        </AdminField>
                        <AdminField label={t('discountCampaigns.fields.label')} optional>
                            <input
                                name="label"
                                aria-label={t('discountCampaigns.fields.label')}
                                maxLength={DISCOUNT_CAMPAIGN_LABEL_MAX}
                                className={adminInputClass()}
                                value={form.label}
                                onChange={f.handleTextChange}
                            />
                        </AdminField>
                        <AdminField label={t('discountCampaigns.fields.linkName')} required>
                            <input
                                name="linkName"
                                aria-label={t('discountCampaigns.fields.linkName')}
                                required
                                disabled={f.linkNameLocked}
                                maxLength={DISCOUNT_CAMPAIGN_LINK_NAME_MAX}
                                className={adminInputClass('font-mono')}
                                value={form.linkName}
                                onChange={f.handleLinkNameChange}
                            />
                        </AdminField>

                        {/* Schedule */}
                        <div className="grid gap-4">
                            <AdminField label={t('discountCampaigns.fields.startsAt')} optional>
                                <DateTimeField value={form.startsAt} onChange={f.setStartsAt} disabled={f.startLocked} inputClassName={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('discountCampaigns.fields.endsAt')} required>
                                <DateTimeField value={form.endsAt} onChange={f.setEndsAt} required inputClassName={adminInputClass()} />
                            </AdminField>
                        </div>
                    </fieldset>

                    {/* Errors */}
                    {f.error !== null && (
                        <p className="mt-5 text-sm text-status-danger">{f.errorDetail ?? t(`errors.${adminErrorMessageKey(f.error)}`)}</p>
                    )}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={f.confirmation !== null}
                title={f.confirmation === 'delete' ? t('discountCampaigns.deleteTitle') : t('discountCampaigns.stopTitle')}
                body={f.confirmation === 'delete' ? t('discountCampaigns.deleteBody') : t('discountCampaigns.stopBody')}
                confirmLabel={f.confirmation === 'delete' ? t('discountCampaigns.delete') : t('discountCampaigns.stopConfirm')}
                cancelLabel={f.confirmation === 'delete' ? t('cancel') : t('discountCampaigns.stopCancel')}
                tone="danger"
                isConfirming={f.confirming}
                onCloseAction={f.closeConfirmation}
                onConfirmAction={f.confirmAction}
                icon={f.confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
```

- [ ] **Step 10: Write `DiscountCampaignsTable.tsx`**

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { SiteNoticeStatusPill } from '@/components/admin/siteNotices/SiteNoticePills';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { numberFormat } from '@/lib/format';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function DiscountCampaignsTable({
    campaigns,
    onEditAction,
}: {
    campaigns: AdminDiscountCampaignDto[];
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.discountCampaigns');
    const locale = useLocale();

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                {/* Columns */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-3 font-bold">{t('columns.name')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.percent')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.status')}</th>
                        <th className="hidden px-3 py-3 font-bold lg:table-cell">{t('columns.dates')}</th>
                        <th className="w-10 px-2 py-3" />
                    </tr>
                </thead>

                {/* Rows */}
                <tbody>
                    {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="w-full max-w-0 px-4 py-3">
                                <span className="block truncate text-ink">{campaign.name}</span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{numberFormat(locale).format(campaign.percent)}</td>
                            <td className="px-3 py-3">
                                <SiteNoticeStatusPill status={campaign.status} />
                            </td>
                            <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted lg:table-cell">
                                {formatDate(locale, campaign.startsAt, DATE_FORMAT)} → {formatDate(locale, campaign.endsAt, DATE_FORMAT)}
                            </td>
                            <td className="px-2 py-3">
                                <button
                                    type="button"
                                    data-campaign-id={campaign.id}
                                    onClick={onEditAction}
                                    aria-label={`${t('editTitle')} ${campaign.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                >
                                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 11: Write `DiscountCampaignsPanel.tsx`**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DiscountCampaignDrawer } from '@/components/admin/discountCampaigns/DiscountCampaignDrawer';
import { DiscountCampaignsTable } from '@/components/admin/discountCampaigns/DiscountCampaignsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDiscountCampaignsPanel } from '@/hooks/useDiscountCampaignsPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// One switch that discounts every plan (spec 2026-11-03-discount-campaigns-design).
export function DiscountCampaignsPanel() {
    const t = useTranslations('AdminPage');
    const { query, campaigns, drawer, handleCreateClick, handleEditClick, closeDrawer } = useDiscountCampaignsPanel();

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('discountCampaigns.create')}
                </button>
            </div>

            {/* List */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {query.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {!query.isLoading && !query.error && campaigns.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('discountCampaigns.empty')}</p>
                )}
                {campaigns.length > 0 && <DiscountCampaignsTable campaigns={campaigns} onEditAction={handleEditClick} />}
            </section>

            {/* Drawer */}
            <DiscountCampaignDrawer key={drawer.token} open={drawer.open} campaign={drawer.campaign} onCloseAction={closeDrawer} />
        </section>
    );
}
```

- [ ] **Step 12: Write the failing navigation test**

`components/admin/AdminNavigationContext.discountCampaigns.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Discount campaigns tab', () => {
    it('opens from #discount-campaigns', () => {
        window.history.replaceState(null, '', '/admin#discount-campaigns');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('discountCampaigns:Discount campaigns:#discount-campaigns')).toBeInTheDocument();
    });
});
```

Run: `npx vitest run components/admin/AdminNavigationContext.discountCampaigns.test.tsx`
Expected: FAIL, the tab doesn't exist.

- [ ] **Step 13: Add the tab**

In `components/admin/AdminNavigationContext.tsx`:
- Add `| 'discountCampaigns'` to the tab union, after `| 'discountCodes'`.
- Add `'#discount-campaigns': 'discountCampaigns',` to the hash map, after `'#discount-codes'`.
- Add `discountCampaigns: '#discount-campaigns',` to the reverse map, after `discountCodes`.
- Add `{ key: 'discountCampaigns', label: t('discountCampaigns'), icon: Percent },` to the tab list, after `discountCodes`, and import `Percent` from `lucide-react`.

In `components/admin/AdminConsole.tsx`, after the `discountCodes` line, and import the panel:

```tsx
    if (tab === 'discountCampaigns') return <DiscountCampaignsPanel />;
```

In `components/admin/AdminShellNav.tsx`, in `TAB_GROUP`:

```ts
    discountCampaigns: 'marketing',
```

Do **not** add it to `MARKETING_TABS` in `lib/adminAccess.ts`: its endpoints are admin only, and `AdminNavigationContext.marketing.test.tsx` lists that tab set exactly.

- [ ] **Step 14: Run the tests to verify they pass**

Run: `npx vitest run lib/discountCampaignForm.test.ts components/admin/AdminNavigationContext components/admin/discountCampaigns`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add lib/discountCampaignForm.ts lib/discountCampaignForm.test.ts hooks/useAdminDiscountCampaigns.ts hooks/useDiscountCampaignsPanel.ts hooks/useDiscountCampaignForm.ts components/admin messages/en.json messages/el.json
git commit -m "KAN-115: add the discount campaigns admin screen"
```

## Task 7: Check and open the PR

- [ ] **Step 1: Run every check**

Run: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
Expected: all clean. A test that renders `GuestOfferCard` or `SiteNoticeBar` without a `QueryClientProvider` needs `useLiveDiscountCampaign` mocked.

- [ ] **Step 2: Check it on screen**

Ask the user for the local test login, per the memory notes. Use the backend worktree from KAN-114 and the dev server on :3000. Open the browser pane only with `preview_start {url: "http://localhost:3000/"}`, never by name.

At 375px and at desktop width, in English and Greek:
- Create a campaign in `/admin#discount-campaigns` that ends 2 minutes from now.
- The banner shows on `/` and `/home` with a ticking countdown and a working "See plans" link. It does not show to a guest on an event's feed.
- The landing page's plan prices show the discount. A checkout shows the same total.
- The guest card on an event's feed shows the campaign in place of the claim.
- At the end time, the banner goes, the card goes back to the claim and the prices go back without a reload.
- Close the banner on a second campaign and reload: it stays closed.
- A second campaign over the same dates shows "Another campaign runs during these dates."

- [ ] **Step 3: Check against the SEO rules**

No route's metadata or copy changes. `/api/discount-campaign` is an API route. The banner renders inside existing pages without changing landing text. Read `docs/seo-guidelines.md` and list any rule this breaks as a **BLOCKER** in the PR description.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin claude/kan-115-discount-campaigns
gh pr create --base staging --title "KAN-115: Discount campaigns admin screen, prices, banner and guest card" --body-file -
```

The PR body lists what changed and links the backend PR. It ends with the attribution line given in the session. Keep this branch's two docs commits (the spec and these plans) on it, so they reach `staging` with the first PR.

---

# Step 2: link sets (KAN-117)

Start from the latest `staging` once KAN-115 is merged.

## Task 8: Link anchors and the generate call

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/campaignLinks.ts:91-99`, `hooks/useAdminCampaigns.ts`
- Test: `lib/campaignLinks.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/campaignLinks.test.ts`:

```ts
describe('campaignUrl with an anchor', () => {
    const parts = { destinationPath: '/el', utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' };

    it('puts the anchor after the query', () => {
        expect(campaignUrl({ ...parts, destinationAnchor: 'pricing' }, 'https://www.storywall.gr')).toBe(
            'https://www.storywall.gr/el?utm_source=instagram&utm_medium=social&utm_campaign=bf-post-el#pricing',
        );
    });

    it('leaves a link with no anchor as it was', () => {
        expect(campaignUrl({ ...parts, destinationAnchor: null }, 'https://www.storywall.gr')).not.toContain('#');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/campaignLinks.test.ts`
Expected: FAIL, the URL has no `#pricing`.

- [ ] **Step 3: Add the types and endpoint**

In `CampaignLinkDto`, after `createdAt`:

```ts
    // On links made as a set: the set's name, and the anchor added after the query.
    linkGroup?: string | null;
    destinationAnchor?: string | null;
```

After `CampaignLinkRequestDto`:

```ts
export type CampaignLinkLanguage = 'en' | 'el';

// POST /api/admin/campaign-links/sets. Creates whichever of the 8 links are missing.
export interface CampaignLinkSetRequestDto {
    name: string;
    linkName: string;
    language: CampaignLinkLanguage;
}

export interface CampaignLinkSetDto {
    links: CampaignLinkDto[];
    created: number;
}
```

In `endpoints.admin.campaignLinks`:

```ts
            sets: '/api/admin/campaign-links/sets',
```

- [ ] **Step 4: Add the anchor to `campaignUrl`**

Replace `CampaignUrlParts` and `campaignUrl` in `lib/campaignLinks.ts`:

```ts
type CampaignUrlParts = Pick<CampaignLinkRequestDto, 'destinationPath' | 'utmSource' | 'utmMedium' | 'utmCampaign'> & {
    destinationAnchor?: string | null;
};

// The address to share. Empty values are left out, so a half-filled form still previews.
export function campaignUrl(parts: CampaignUrlParts, origin: string = SITE_URL): string {
    const url = new URL(parts.destinationPath, origin);
    if (parts.utmSource) url.searchParams.set('utm_source', parts.utmSource);
    if (parts.utmMedium) url.searchParams.set('utm_medium', parts.utmMedium);
    if (parts.utmCampaign) url.searchParams.set('utm_campaign', parts.utmCampaign);
    if (parts.destinationAnchor) url.hash = parts.destinationAnchor;
    return url.toString();
}
```

- [ ] **Step 5: Add the mutation**

In `hooks/useAdminCampaigns.ts`, add `CampaignLinkSetDto` and `CampaignLinkSetRequestDto` to the type import, and:

```ts
export function useGenerateCampaignLinkSet() {
    const refresh = useRefreshCampaigns();
    return useMutation({
        mutationFn: (input: CampaignLinkSetRequestDto) => api.post<CampaignLinkSetDto>(endpoints.admin.campaignLinks.sets, input),
        onSuccess: refresh,
    });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run lib/campaignLinks.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/campaignLinks.ts lib/campaignLinks.test.ts hooks/useAdminCampaigns.ts
git commit -m "KAN-117: support link anchors and generating a link set"
```

## Task 9: Links in the campaign drawer

**Files:**
- Create: `hooks/useDiscountCampaignLinks.ts`, `components/admin/discountCampaigns/DiscountCampaignLinks.tsx`, `components/admin/discountCampaigns/CampaignSetLinkRow.tsx`
- Modify: `components/admin/discountCampaigns/DiscountCampaignDrawer.tsx`, `messages/en.json`, `messages/el.json`
- Test: `components/admin/discountCampaigns/DiscountCampaignLinks.test.tsx`

- [ ] **Step 1: Add the text**

Add to `AdminPage.discountCampaigns` in `messages/en.json`:

```json
"links": {
    "title": "Links",
    "english": "English links",
    "greek": "Greek links",
    "visits": "Visits"
},
```

and in `messages/el.json`:

```json
"links": {
    "title": "Σύνδεσμοι",
    "english": "Αγγλικοί σύνδεσμοι",
    "greek": "Ελληνικοί σύνδεσμοι",
    "visits": "Επισκέψεις"
},
```

- [ ] **Step 2: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscountCampaignLinks } from '@/components/admin/discountCampaigns/DiscountCampaignLinks';
import type { AdminDiscountCampaignDto, CampaignRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mutateAsync = vi.fn();
let rows: CampaignRowDto[] = [];

vi.mock('@/hooks/useAdminCampaigns', () => ({
    useAdminCampaigns: () => ({ data: rows, isLoading: false, error: null }),
    useGenerateCampaignLinkSet: () => ({ mutateAsync, isPending: false }),
}));

const campaign = { id: 'c1', name: 'Black Friday', linkName: 'bf' } as AdminDiscountCampaignDto;

const row = (id: string, linkGroup: string | null, visits: number) =>
    ({
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: `${id}-post-el`,
        visits,
        link: {
            id,
            name: `Link ${id}`,
            destinationPath: '/el',
            destinationAnchor: 'pricing',
            linkGroup,
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: `${id}-post-el`,
            createdAt: '2026-11-01T00:00:00Z',
        },
    }) as CampaignRowDto;

function renderLinks() {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DiscountCampaignLinks campaign={campaign} />
        </NextIntlClientProvider>,
    );
}

describe('DiscountCampaignLinks', () => {
    beforeEach(() => {
        rows = [];
        mutateAsync.mockReset();
    });

    afterEach(cleanup);

    it("lists only this campaign's links, with their visits", () => {
        rows = [row('a', 'bf', 12), row('b', 'other', 99), row('c', null, 7)];
        renderLinks();

        expect(screen.getByText('Link a')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.queryByText('Link b')).not.toBeInTheDocument();
        expect(screen.queryByText('Link c')).not.toBeInTheDocument();
    });

    it('creates a set for the language of the button', () => {
        renderLinks();

        fireEvent.click(screen.getByRole('button', { name: 'English links' }));
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Black Friday', linkName: 'bf', language: 'en' });

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Black Friday', linkName: 'bf', language: 'el' });
    });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run components/admin/discountCampaigns/DiscountCampaignLinks.test.tsx`
Expected: FAIL, the component doesn't exist.

- [ ] **Step 4: Write `hooks/useDiscountCampaignLinks.ts`**

```ts
'use client';

import { type MouseEvent, useMemo, useState } from 'react';

import { useAdminCampaigns, useGenerateCampaignLinkSet } from '@/hooks/useAdminCampaigns';
import type { AdminDiscountCampaignDto, CampaignLinkLanguage, CampaignRowDto } from '@/lib/api/types';

const NO_ROWS: CampaignRowDto[] = [];

// One discount campaign's links in its drawer, counted over all time, and the two buttons that
// create a language's set. A repeat click creates nothing.
export function useDiscountCampaignLinks(campaign: Pick<AdminDiscountCampaignDto, 'name' | 'linkName'>) {
    const query = useAdminCampaigns(null, null);
    const generate = useGenerateCampaignLinkSet();
    const [error, setError] = useState<unknown>(null);
    const allRows = query.data ?? NO_ROWS;
    const rows = useMemo(() => allRows.filter((row) => row.link?.linkGroup === campaign.linkName), [allRows, campaign.linkName]);

    function handleGenerateClick(event: MouseEvent<HTMLButtonElement>) {
        const language = event.currentTarget.dataset.language as CampaignLinkLanguage;
        setError(null);
        generate.mutateAsync({ name: campaign.name, linkName: campaign.linkName, language }).catch(setError);
    }

    return { rows, isLoading: query.isLoading, busy: generate.isPending, error: error ?? query.error, handleGenerateClick };
}
```

- [ ] **Step 5: Write `CampaignSetLinkRow.tsx`**

```tsx
'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCampaignLinkShare } from '@/hooks/useCampaignLinkShare';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { CampaignRowDto } from '@/lib/api/types';
import { campaignUrl } from '@/lib/campaignLinks';

export function CampaignSetLinkRow({ row }: { row: CampaignRowDto }) {
    const t = useTranslations('AdminPage.campaigns.share');
    const format = useFunnelFormat();
    const link = row.link;
    const { copied, handleCopyClick } = useCampaignLinkShare(link ? campaignUrl(link) : '', link?.name ?? '');
    if (!link) return null;

    return (
        <tr className="border-b border-border last:border-b-0">
            <td className="w-full max-w-0 py-2 pr-3">
                <span className="block truncate text-ink">{link.name}</span>
            </td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.visits)}</td>
            <td className="py-2 pl-3">
                <button
                    type="button"
                    onClick={handleCopyClick}
                    aria-label={`${copied ? t('copied') : t('copy')} ${link.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                >
                    {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                </button>
            </td>
        </tr>
    );
}
```

- [ ] **Step 6: Write `DiscountCampaignLinks.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CampaignSetLinkRow } from '@/components/admin/discountCampaigns/CampaignSetLinkRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDiscountCampaignLinks } from '@/hooks/useDiscountCampaignLinks';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { campaignRowKey } from '@/lib/campaignLinks';

const BUTTON = 'min-h-9 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted disabled:opacity-50';

export function DiscountCampaignLinks({ campaign }: { campaign: AdminDiscountCampaignDto }) {
    const t = useTranslations('AdminPage');
    const { rows, isLoading, busy, error, handleGenerateClick } = useDiscountCampaignLinks(campaign);

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('discountCampaigns.links.title')}</h3>
                <div className="flex gap-2">
                    <button type="button" data-language="en" onClick={handleGenerateClick} disabled={busy} className={BUTTON}>
                        {t('discountCampaigns.links.english')}
                    </button>
                    <button type="button" data-language="el" onClick={handleGenerateClick} disabled={busy} className={BUTTON}>
                        {t('discountCampaigns.links.greek')}
                    </button>
                </div>
            </div>

            {/* List */}
            {isLoading && <LoadingState className="justify-start py-2" />}
            {rows.length > 0 && (
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            <th className="py-2 pr-3 font-bold">{t('discountCampaigns.columns.name')}</th>
                            <th className="px-3 py-2 text-right font-bold">{t('discountCampaigns.links.visits')}</th>
                            <th className="w-8 py-2 pl-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <CampaignSetLinkRow key={campaignRowKey(row)} row={row} />
                        ))}
                    </tbody>
                </table>
            )}

            {/* Errors */}
            {Boolean(error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}
        </section>
    );
}
```

- [ ] **Step 7: Put it in the drawer**

In `DiscountCampaignDrawer.tsx`, import it and render it below the `<form>`, inside `AdminDrawer`, on saved campaigns only:

```tsx
                {/* Links */}
                {campaign && (
                    <div className="mt-6 border-t border-border pt-5">
                        <DiscountCampaignLinks campaign={campaign} />
                    </div>
                )}
```

Add `vi.mock('@/hooks/useAdminCampaigns', () => ({ useAdminCampaigns: () => ({ data: [], isLoading: false, error: null }), useGenerateCampaignLinkSet: () => ({ mutateAsync: vi.fn(), isPending: false }) }));` to `DiscountCampaignDrawer.test.tsx`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run components/admin/discountCampaigns`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add hooks/useDiscountCampaignLinks.ts components/admin/discountCampaigns messages/en.json messages/el.json
git commit -m "KAN-117: show a campaign's links in its drawer with language buttons"
```

## Task 10: Quick buttons on the Campaigns tab

**Files:**
- Create: `hooks/useCampaignLinkSetForm.ts`, `components/admin/campaigns/CampaignLinkSetDrawer.tsx`
- Modify: `hooks/useCampaignsDashboard.ts`, `components/admin/campaigns/CampaignsPanel.tsx`, `messages/en.json`, `messages/el.json`
- Test: `components/admin/campaigns/CampaignLinkSetDrawer.test.tsx`

- [ ] **Step 1: Add the text**

Add to `AdminPage.campaigns` in `messages/en.json`:

```json
"linkSet": {
    "english": "English links",
    "greek": "Greek links",
    "name": "Name",
    "linkName": "Link name",
    "create": "Create links"
},
```

and in `messages/el.json`:

```json
"linkSet": {
    "english": "Αγγλικοί σύνδεσμοι",
    "greek": "Ελληνικοί σύνδεσμοι",
    "name": "Όνομα",
    "linkName": "Όνομα συνδέσμων",
    "create": "Δημιουργία συνδέσμων"
},
```

- [ ] **Step 2: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampaignLinkSetDrawer } from '@/components/admin/campaigns/CampaignLinkSetDrawer';
import messages from '@/messages/en.json';

const mutateAsync = vi.fn().mockResolvedValue({ links: [], created: 8 });
vi.mock('@/hooks/useAdminCampaigns', () => ({
    useGenerateCampaignLinkSet: () => ({ mutateAsync, isPending: false }),
}));

describe('CampaignLinkSetDrawer', () => {
    afterEach(cleanup);

    it('creates the set for its language and closes', async () => {
        const onClose = vi.fn();
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <CampaignLinkSetDrawer open language="el" onCloseAction={onClose} />
            </NextIntlClientProvider>,
        );

        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Summer' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Link name' }), { target: { value: 'Summer Sale!' } });
        fireEvent.submit(screen.getByRole('textbox', { name: 'Name' }).closest('form') as HTMLFormElement);

        await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Summer', linkName: 'summer-sale', language: 'el' });
    });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run components/admin/campaigns/CampaignLinkSetDrawer.test.tsx`
Expected: FAIL, the component doesn't exist.

- [ ] **Step 4: Write `hooks/useCampaignLinkSetForm.ts`**

```ts
'use client';

import { type ChangeEvent, useState } from 'react';

import { useGenerateCampaignLinkSet } from '@/hooks/useAdminCampaigns';
import type { CampaignLinkLanguage } from '@/lib/api/types';
import { toUtmValue } from '@/lib/campaignLinks';
import { DISCOUNT_CAMPAIGN_LINK_NAME_MAX } from '@/lib/discountCampaignForm';

// A language's set of links with no discount campaign behind it. Remounted on every opening.
export function useCampaignLinkSetForm(language: CampaignLinkLanguage, onDone: () => void) {
    const generate = useGenerateCampaignLinkSet();
    const [name, setName] = useState('');
    const [linkName, setLinkName] = useState('');
    const [error, setError] = useState<unknown>(null);

    function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        setName(event.currentTarget.value);
    }

    function handleLinkNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLinkName(toUtmValue(event.currentTarget.value).slice(0, DISCOUNT_CAMPAIGN_LINK_NAME_MAX));
    }

    async function save() {
        setError(null);
        try {
            await generate.mutateAsync({ name: name.trim(), linkName, language });
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (generate.isPending) return;
        void save();
    }

    return { name, linkName, busy: generate.isPending, error, handleNameChange, handleLinkNameChange, handleSubmit };
}
```

- [ ] **Step 5: Write `CampaignLinkSetDrawer.tsx`**

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useCampaignLinkSetForm } from '@/hooks/useCampaignLinkSetForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignLinkLanguage } from '@/lib/api/types';
import { DISCOUNT_CAMPAIGN_LINK_NAME_MAX, DISCOUNT_CAMPAIGN_NAME_MAX } from '@/lib/discountCampaignForm';

const FORM_ID = 'campaign-link-set-form';

// The 8 common links for a language. The panel remounts it (key) on every opening.
export function CampaignLinkSetDrawer({ open, language, onCloseAction }: { open: boolean; language: CampaignLinkLanguage; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = useCampaignLinkSetForm(language, onCloseAction);

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={t('cancel')}
            closeDisabled={f.busy}
            title={language === 'en' ? t('campaigns.linkSet.english') : t('campaigns.linkSet.greek')}
            footer={
                <>
                    <div />
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={f.busy}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form={FORM_ID}
                            disabled={f.busy}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {f.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('campaigns.linkSet.create')}
                        </button>
                    </div>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                {/* Details */}
                <AdminField label={t('campaigns.linkSet.name')} required>
                    <input
                        aria-label={t('campaigns.linkSet.name')}
                        required
                        maxLength={DISCOUNT_CAMPAIGN_NAME_MAX}
                        className={adminInputClass()}
                        value={f.name}
                        onChange={f.handleNameChange}
                    />
                </AdminField>
                <AdminField label={t('campaigns.linkSet.linkName')} required>
                    <input
                        aria-label={t('campaigns.linkSet.linkName')}
                        required
                        maxLength={DISCOUNT_CAMPAIGN_LINK_NAME_MAX}
                        className={adminInputClass('font-mono')}
                        value={f.linkName}
                        onChange={f.handleLinkNameChange}
                    />
                </AdminField>

                {/* Errors */}
                {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
```

- [ ] **Step 6: Add the state to `hooks/useCampaignsDashboard.ts`**

Add the type import `CampaignLinkLanguage`, and beside `drawer`:

```ts
    const [linkSet, setLinkSet] = useState<{ open: boolean; language: CampaignLinkLanguage; token: number }>({ open: false, language: 'el', token: 0 });

    const handleLinkSetClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const language = event.currentTarget.dataset.language as CampaignLinkLanguage;
        nextToken.current += 1;
        setLinkSet({ open: true, language, token: nextToken.current });
    }, []);

    const closeLinkSet = useCallback(() => setLinkSet((current) => ({ ...current, open: false })), []);
```

and add `linkSet, handleLinkSetClick, closeLinkSet` to its return value.

- [ ] **Step 7: Add the buttons to `CampaignsPanel.tsx`**

Import `CampaignLinkSetDrawer`. Replace the single "New link" button with:

```tsx
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            data-language="en"
                            onClick={d.handleLinkSetClick}
                            className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink-muted"
                        >
                            {t('campaigns.linkSet.english')}
                        </button>
                        <button
                            type="button"
                            data-language="el"
                            onClick={d.handleLinkSetClick}
                            className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink-muted"
                        >
                            {t('campaigns.linkSet.greek')}
                        </button>
                        <button
                            type="button"
                            onClick={d.handleCreateClick}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                        >
                            <Plus aria-hidden="true" className="h-4 w-4" />
                            {t('campaigns.create')}
                        </button>
                    </div>
```

and after the existing drawers:

```tsx
            <CampaignLinkSetDrawer key={`set-${d.linkSet.token}`} open={d.linkSet.open} language={d.linkSet.language} onCloseAction={d.closeLinkSet} />
```

- [ ] **Step 8: Run the checks**

Run: `npx vitest run components/admin/campaigns hooks`, `npx tsc --noEmit`, `npx eslint .`
Expected: PASS, clean.

- [ ] **Step 9: Check on screen and open the PR**

With the KAN-116 backend running, at desktop and at 375px:
- Creating a discount campaign makes 8 Greek links in its drawer. "English links" adds 8 more, and a second click adds none.
- A copied link opens `/el#pricing` at the plans, and a visit shows up in the row.
- The Campaigns tab's "Greek links" makes a set with no campaign behind it.

```bash
git add hooks/useCampaignLinkSetForm.ts hooks/useCampaignsDashboard.ts components/admin/campaigns messages/en.json messages/el.json
git commit -m "KAN-117: add link set buttons to the Campaigns tab"
git push -u origin claude/kan-117-campaign-link-sets
gh pr create --base staging --title "KAN-117: Campaign link set buttons" --body-file -
```

---

# Step 3: sales tracking (KAN-119)

Start from the latest `staging` once KAN-117 is merged.

## Task 11: Remembering the link and sending it at checkout

**Files:**
- Create: `lib/campaignAttribution.ts`, `hooks/useCampaignAttributionTracking.ts`, `components/layout/CampaignAttributionTracker.tsx`
- Modify: `lib/consent.ts:4,73`, `providers/AppProviders.tsx:80`, `providers/PublicProviders.tsx:19`
- Modify: `hooks/useBilling.ts:99,149`, `hooks/useCreateEventFormController.ts:418`, `lib/api/types.ts`
- Test: `lib/campaignAttribution.test.ts`, `hooks/useCampaignAttributionTracking.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it } from 'vitest';

import {
    CAMPAIGN_ATTRIBUTION_COOKIE,
    checkoutAttribution,
    currentCampaignArrival,
    readCampaignAttributionCookie,
    rememberCampaignArrival,
    writeCampaignAttributionCookie,
} from '@/lib/campaignAttribution';
import { clearAnalyticsCookies } from '@/lib/consent';

const campaign = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' };

describe('campaign attribution', () => {
    afterEach(() => {
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('remembers the latest link, and a plain page keeps it', () => {
        rememberCampaignArrival('https://www.storywall.gr/?utm_source=instagram&utm_medium=social&utm_campaign=first');
        rememberCampaignArrival('https://www.storywall.gr/pricing');
        expect(currentCampaignArrival()?.utmCampaign).toBe('first');

        rememberCampaignArrival('https://www.storywall.gr/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=second');
        expect(currentCampaignArrival()).toEqual({ utmSource: 'tiktok', utmMedium: 'paid_social', utmCampaign: 'second' });
    });

    it('sends nothing at checkout without a cookie', () => {
        expect(checkoutAttribution()).toEqual({});
    });

    it('sends the last link written', () => {
        writeCampaignAttributionCookie(campaign);
        writeCampaignAttributionCookie({ ...campaign, utmCampaign: 'bf-story-el' });

        expect(checkoutAttribution()).toEqual({ attribution: { source: 'instagram', medium: 'social', campaign: 'bf-story-el' } });
    });

    it('ignores a cookie it cannot read', () => {
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=not-json; Path=/`;
        expect(readCampaignAttributionCookie()).toBeNull();

        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=${encodeURIComponent('{"utmSource":1}')}; Path=/`;
        expect(readCampaignAttributionCookie()).toBeNull();
    });

    it('is cleared when analytics consent goes', () => {
        writeCampaignAttributionCookie(campaign);

        clearAnalyticsCookies();

        expect(readCampaignAttributionCookie()).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/campaignAttribution.test.ts`
Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Write `lib/campaignAttribution.ts`**

```ts
import type { CheckoutAttributionDto } from '@/lib/api/types';
import { type Campaign, campaignFromUrl } from '@/lib/campaignVisits';

// The last campaign link this browser came through, credited to the order it buys (spec
// 2026-11-03-discount-campaigns-design). Unlike the sign-up source, the latest visit wins and it
// works for existing accounts. Written only with analytics consent, and read only from the cookie,
// so a visitor who declined is never credited.

export const CAMPAIGN_ATTRIBUTION_COOKIE = 'sw_campaign';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// This visit's link, until consent allows the cookie. Module memory: gone on the next full page load.
let arrival: Campaign | null = null;

export function rememberCampaignArrival(href: string) {
    const campaign = campaignFromUrl(href);
    if (campaign) arrival = campaign;
}

export function currentCampaignArrival(): Campaign | null {
    return arrival;
}

export function writeCampaignAttributionCookie(campaign: Campaign) {
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(campaign))}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
        // Blocked cookies: nothing is credited.
    }
}

function isCampaign(value: unknown): value is Campaign {
    const candidate = value as Partial<Campaign> | null;
    return typeof candidate?.utmSource === 'string' && typeof candidate.utmMedium === 'string' && typeof candidate.utmCampaign === 'string';
}

export function readCampaignAttributionCookie(): Campaign | null {
    try {
        const prefix = `${CAMPAIGN_ATTRIBUTION_COOKIE}=`;
        const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
        if (!match) return null;
        const parsed: unknown = JSON.parse(decodeURIComponent(match.slice(prefix.length)));
        return isCampaign(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

// Spread into a checkout body. The server keeps it only when it matches a saved link.
export function checkoutAttribution(): { attribution?: CheckoutAttributionDto } {
    const campaign = readCampaignAttributionCookie();
    return campaign ? { attribution: { source: campaign.utmSource, medium: campaign.utmMedium, campaign: campaign.utmCampaign } } : {};
}
```

- [ ] **Step 4: Add the request type**

In `lib/api/types.ts`, above `CheckoutRequestDto`:

```ts
// The last campaign link the browser came through. Kept only when it matches a saved link.
export interface CheckoutAttributionDto {
    source: string;
    medium: string;
    campaign: string;
}
```

Add `attribution?: CheckoutAttributionDto;` to `CheckoutRequestDto` and `UpgradeCheckoutRequestDto`.

- [ ] **Step 5: Clear it with analytics consent**

In `lib/consent.ts`, add the import and change `clearAnalyticsCookies`:

```ts
import { CAMPAIGN_ATTRIBUTION_COOKIE } from '@/lib/campaignAttribution';
```

```ts
// Google Analytics' cookies, and the signup source and campaign link, which are kept only with analytics consent.
export function clearAnalyticsCookies(): void {
    clearCookiesStartingWith(ANALYTICS_COOKIE_PREFIX);
    clearCookiesStartingWith(VISIT_SOURCE_COOKIE);
    clearCookiesStartingWith(CAMPAIGN_ATTRIBUTION_COOKIE);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run lib/campaignAttribution.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing hook test**

`hooks/useCampaignAttributionTracking.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCampaignAttributionTracking } from '@/hooks/useCampaignAttributionTracking';
import { CAMPAIGN_ATTRIBUTION_COOKIE, readCampaignAttributionCookie } from '@/lib/campaignAttribution';
import { VISIT_SOURCE_COOKIE } from '@/lib/signupSource';

let analytics = false;

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/hooks/useCookieConsent', () => ({ useCookieConsent: () => ({ consent: { analytics } }) }));

describe('useCampaignAttributionTracking', () => {
    afterEach(() => {
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
        document.cookie = `${VISIT_SOURCE_COOKIE}=; Max-Age=0; Path=/`;
        window.history.replaceState(null, '', '/');
    });

    it('writes no cookie until analytics is allowed, and leaves the sign-up source alone', () => {
        document.cookie = `${VISIT_SOURCE_COOKIE}=kept; Path=/`;
        window.history.replaceState(null, '', '/?utm_source=instagram&utm_medium=social&utm_campaign=bf-post-el');

        const { rerender } = renderHook(() => useCampaignAttributionTracking());
        expect(readCampaignAttributionCookie()).toBeNull();

        analytics = true;
        rerender();

        expect(readCampaignAttributionCookie()).toEqual({ utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' });
        expect(document.cookie).toContain(`${VISIT_SOURCE_COOKIE}=kept`);
    });
});
```

Run: `npx vitest run hooks/useCampaignAttributionTracking.test.tsx`
Expected: FAIL, the hook doesn't exist.

- [ ] **Step 8: Write the hook and tracker**

`hooks/useCampaignAttributionTracking.ts`:

```ts
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { currentCampaignArrival, rememberCampaignArrival, writeCampaignAttributionCookie } from '@/lib/campaignAttribution';

// Notes the campaign link in the address, and saves it once analytics consent allows.
export function useCampaignAttributionTracking() {
    const pathname = usePathname();
    const { consent } = useCookieConsent();
    const analytics = consent?.analytics === true;

    useEffect(() => {
        rememberCampaignArrival(window.location.href);
    }, [pathname]);

    useEffect(() => {
        const arrival = currentCampaignArrival();
        if (analytics && arrival) writeCampaignAttributionCookie(arrival);
    }, [analytics, pathname]);
}
```

`components/layout/CampaignAttributionTracker.tsx`:

```tsx
'use client';

import { useCampaignAttributionTracking } from '@/hooks/useCampaignAttributionTracking';

export function CampaignAttributionTracker() {
    useCampaignAttributionTracking();
    return null;
}
```

Render `<CampaignAttributionTracker />` directly after `<SignupSourceTracker />` in `providers/AppProviders.tsx` and `providers/PublicProviders.tsx`, with the import beside `SignupSourceTracker`'s.

Run: `npx vitest run hooks/useCampaignAttributionTracking.test.tsx`
Expected: PASS.

- [ ] **Step 9: Send it at checkout**

In `hooks/useBilling.ts`, import `checkoutAttribution` and change the two mutation functions:

```ts
        mutationFn: (input: CheckoutRequestDto) =>
            api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), { ...input, ...checkoutAttribution() }),
```

```ts
        mutationFn: (input: UpgradeCheckoutRequestDto) =>
            api.post<CheckoutResponseDto>(endpoints.events.upgradeCheckout(eventId), { ...input, ...checkoutAttribution() }),
```

In `hooks/useCreateEventFormController.ts`, import it and add to the checkout body, after `...partnerBranding.requestFields,`:

```ts
                    ...checkoutAttribution(),
```

Extension and storage pack checkouts send nothing: they aren't credited.

- [ ] **Step 10: Run the checks**

Run: `npx vitest run hooks lib/consent lib/campaignAttribution.test.ts`, `npx tsc --noEmit`
Expected: PASS, clean. A test that asserts an exact checkout body still passes, because no cookie means nothing is added.

- [ ] **Step 11: Commit**

```bash
git add lib/campaignAttribution.ts lib/campaignAttribution.test.ts lib/consent.ts lib/api/types.ts hooks/useCampaignAttributionTracking.ts hooks/useCampaignAttributionTracking.test.tsx components/layout/CampaignAttributionTracker.tsx providers/AppProviders.tsx providers/PublicProviders.tsx hooks/useBilling.ts hooks/useCreateEventFormController.ts
git commit -m "KAN-119: send the last campaign link at checkout"
```

## Task 12: Sales in the reports

**Files:**
- Modify: `lib/api/types.ts:2745`, `components/admin/campaigns/__fixtures__/campaignOverview.ts`, `components/admin/campaigns/CampaignsTable.tsx`, `components/admin/discountCampaigns/DiscountCampaignLinks.tsx`, `components/admin/discountCampaigns/CampaignSetLinkRow.tsx`, `hooks/useDiscountCampaignLinks.ts`, `messages/en.json`, `messages/el.json`
- Test: `components/admin/campaigns/CampaignsTable.test.tsx`, `components/admin/discountCampaigns/DiscountCampaignLinks.test.tsx`

- [ ] **Step 1: Add the text**

Add to `AdminPage.campaigns.columns` in `messages/en.json` (near l.6036):

```json
"sales": "Sales",
"salesRevenue": "Sales revenue"
```

and in `messages/el.json`:

```json
"sales": "Πωλήσεις",
"salesRevenue": "Έσοδα πωλήσεων"
```

Add to `AdminPage.discountCampaigns.links` in `messages/en.json`:

```json
"sales": "Sales",
"salesRevenue": "Sales revenue",
"total": "Total"
```

and in `messages/el.json`:

```json
"sales": "Πωλήσεις",
"salesRevenue": "Έσοδα πωλήσεων",
"total": "Σύνολο"
```

- [ ] **Step 2: Add the row fields**

In `CampaignRowDto`, after `revenueMinorByCurrency`:

```ts
    // Paid orders credited to this link in the range, whenever the buyer signed up.
    sales: number;
    // Null for a MARKETING caller, like revenue.
    salesRevenueMinorByCurrency: Record<string, number> | null;
```

- [ ] **Step 3: Write the failing tests**

Add `sales: 0, salesRevenueMinorByCurrency: {},` to every row in `components/admin/campaigns/__fixtures__/campaignOverview.ts`.

In `CampaignsTable.test.tsx`, add `sales: 3, salesRevenueMinorByCurrency: { EUR: 14_700 },` to `ROW`. In the first test's `headers` list, put `'Sales'` after `'Paid'` and `'Sales revenue'` after `'Revenue'`. In the MARKETING test (l.65), change the row and the checks:

```tsx
                <CampaignsTable rows={[{ ...ROW, revenueMinorByCurrency: null, salesRevenueMinorByCurrency: null }]} onLinkAction={vi.fn()} />
```

```tsx
        expect(headers).not.toContain('Revenue');
        expect(headers).not.toContain('Sales revenue');
        expect(headers).toContain('Sales');
```

Then add:

```tsx
    it('shows sales and their revenue', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[ROW]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        const cells = within(screen.getAllByRole('row')[1])
            .getAllByRole('cell')
            .map((cell) => cell.textContent);
        expect(cells).toContain('3');
        expect(cells.some((text) => text?.includes('147'))).toBe(true);
    });
```

In `DiscountCampaignLinks.test.tsx`, change `row` so it also sets `sales` and `salesRevenueMinorByCurrency` from new parameters, and add:

```tsx
    it('totals the links', () => {
        rows = [row('a', 'bf', 12, 2, { EUR: 9_800 }), row('b', 'bf', 3, 1, { EUR: 4_900 })];
        renderLinks();

        const total = screen.getByRole('row', { name: /Total/ });
        expect(within(total).getByText('15')).toBeInTheDocument();
        expect(within(total).getByText('3')).toBeInTheDocument();
        expect(within(total).getByText(/147/)).toBeInTheDocument();
    });
```

with the updated helper:

```tsx
const row = (id: string, linkGroup: string | null, visits: number, sales = 0, salesRevenueMinorByCurrency: Record<string, number> = {}) =>
```

and `sales, salesRevenueMinorByCurrency,` in its object, and `within` in the Testing Library import.

- [ ] **Step 4: Run them to verify they fail**

Run: `npx vitest run components/admin/campaigns/CampaignsTable.test.tsx components/admin/discountCampaigns/DiscountCampaignLinks.test.tsx`
Expected: FAIL, no Sales column and no total.

- [ ] **Step 5: Add the columns to `CampaignsTable.tsx`**

Change `min-w-[1080px]` to `min-w-[1240px]`. After the `paidHost` header:

```tsx
                        <th className="px-3 py-3 text-right font-bold">{t('columns.sales')}</th>
```

After the `revenue` header:

```tsx
                        {showRevenue && <th className="px-4 py-3 text-right font-bold">{t('columns.salesRevenue')}</th>}
```

Next to `const revenue = ...`:

```tsx
                        const salesRevenue = row.salesRevenueMinorByCurrency && Object.entries(row.salesRevenueMinorByCurrency);
```

After the `paidHost` cell:

```tsx
                                {/* Sales */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.sales)}</td>
```

After the revenue cell:

```tsx
                                {salesRevenue && (
                                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                                        {salesRevenue.length ? salesRevenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
                                    </td>
                                )}
```

The two cells have to be in the same order as the headers: `paidHost`, `sales`, `revenue`, `salesRevenue`.

- [ ] **Step 6: Add the totals**

In `hooks/useDiscountCampaignLinks.ts`, add the type import and, above the hook:

```ts
export type CampaignLinksTotal = { visits: number; sales: number; salesRevenueMinorByCurrency: Record<string, number> };

function totalOf(rows: CampaignRowDto[]): CampaignLinksTotal {
    const total: CampaignLinksTotal = { visits: 0, sales: 0, salesRevenueMinorByCurrency: {} };
    for (const row of rows) {
        total.visits += row.visits;
        total.sales += row.sales;
        for (const [currency, minor] of Object.entries(row.salesRevenueMinorByCurrency ?? {})) {
            total.salesRevenueMinorByCurrency[currency] = (total.salesRevenueMinorByCurrency[currency] ?? 0) + minor;
        }
    }
    return total;
}
```

Inside the hook, `const total = useMemo(() => totalOf(rows), [rows]);`, and add `total` to its return value.

- [ ] **Step 7: Show them in the drawer**

In `CampaignSetLinkRow.tsx`, add `EMPTY_VALUE` from `@/lib/adminFunnel`, and after the visits cell:

```tsx
            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.sales)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">
                {Object.entries(row.salesRevenueMinorByCurrency ?? {}).map(([currency, minor]) => format.money(minor, currency)).join(' · ') || EMPTY_VALUE}
            </td>
```

In `DiscountCampaignLinks.tsx`, import `useFunnelFormat` and `EMPTY_VALUE`, read `total` from the hook, add `const format = useFunnelFormat();`, and after the visits header:

```tsx
                            <th className="px-3 py-2 text-right font-bold">{t('discountCampaigns.links.sales')}</th>
                            <th className="px-3 py-2 text-right font-bold">{t('discountCampaigns.links.salesRevenue')}</th>
```

After `</tbody>`:

```tsx
                    {/* Total */}
                    <tfoot>
                        <tr className="border-t border-border font-semibold">
                            <th scope="row" className="py-2 pr-3 text-left">
                                {t('discountCampaigns.links.total')}
                            </th>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(total.visits)}</td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(total.sales)}</td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {Object.entries(total.salesRevenueMinorByCurrency).map(([currency, minor]) => format.money(minor, currency)).join(' · ') || EMPTY_VALUE}
                            </td>
                            <td />
                        </tr>
                    </tfoot>
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run components/admin/campaigns components/admin/discountCampaigns`
Expected: PASS.

- [ ] **Step 9: Run every check**

Run: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
Expected: all clean.

- [ ] **Step 10: Check on screen and open the PR**

With the KAN-118 backend running, on :3000:
- Open a saved link's URL signed out, accept analytics cookies, sign in with an existing account and buy a plan with a test payment.
- The link's row shows 1 sale and its revenue on the Campaigns tab and in the campaign's drawer, and "Paid hosts" stays unchanged for that existing account.
- Decline analytics, come through a link and buy: no sale is credited.
- Check the Campaigns table at desktop width and at 375px.

```bash
git add lib/api/types.ts components/admin/campaigns components/admin/discountCampaigns hooks/useDiscountCampaignLinks.ts messages/en.json messages/el.json
git commit -m "KAN-119: show sales and sales revenue for campaign links"
git push -u origin claude/kan-119-campaign-sales-tracking
gh pr create --base staging --title "KAN-119: Campaign sales in the reports" --body-file -
```
