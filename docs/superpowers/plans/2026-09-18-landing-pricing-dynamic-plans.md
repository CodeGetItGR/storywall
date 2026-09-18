# Landing Pricing Dynamic Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's fully static, hardcoded pricing cards (`messages/en.json` / `messages/el.json`) with cards rendered from the real `PlanTierResponseDto` catalog returned by `GET /api/config`, without changing the pricing section's visual design.

**Architecture:** `LandingPricing.tsx`'s presentational card (`LandingPricingCard.tsx`) keeps its exact current props and markup. A new pure module (`lib/landingPricing.ts`) resolves which BE plans feed each of the two landing tabs (by `eventTypeKey`) and derives every card field from real data — price (with discount), storage, guest cap, photo/video estimates (new `media.estimate*` config fields), access window (new `autoDeleteMonths` field), and a feature list built from `moduleKeys` plus a small fixed set of baseline platform features that aren't modules. A new hook (`useLandingPricingPlans.ts`) wires that module to `useAppConfig()` and to the app's existing i18n copy. The landing page (`app/page.tsx`) gets a server-side prefetch of `GET /api/config` so the pricing section renders with real data on first paint instead of flashing empty, following this repo's established prefetch-and-hydrate pattern.

**Tech Stack:** Next.js App Router, React Query (`@tanstack/react-query`), next-intl, Vitest + Testing Library.

---

## Context for the engineer picking this up

- The BE plan catalog is `PlanTierResponseDto[]`, returned publicly (no auth) as `planTiers` on `GET /api/config`, already fetched app-wide via `useAppConfig()` ([hooks/useAppConfig.ts](../../../hooks/useAppConfig.ts)) and bootstrapped on every route via `<AppConfigBootstrap />`.
- Every `EVENT`-scope plan belongs to **exactly one** `eventTypeKey` (confirmed current model — see `docs/integration guides/billing-fe-guide.md` §"eventTypeKey / sharedGroupKey — one plan, one event type"). The landing page's two marketing tabs don't map onto a single BE event type each:
  - **wedding** tab ← plans whose `eventTypeKey` is `WEDDING`, falling back to `BAPTISM` if `WEDDING` has none.
  - **vip** tab ← plans whose `eventTypeKey` is `SOCIAL_EVENT`.
- Two BE fields exist specifically to close gaps in this migration (both from `docs/integration guides/billing-fe-guide.md` and `docs/integration guides/app-config-fe-integration.md`, shipped 2026-09-18) but are **not yet in the local codebase**:
  - `PlanTierResponseDto.autoDeleteMonths: number | null` — months after the event before content is auto-deleted; `null` = never. Replaces the static "Access for N months after the event" copy.
  - `AppMediaConfigDto.estimateAvgImageBytes` / `estimateAvgVideoBytes` / `estimateImageRatio` — an admin-tunable formula for turning a plan's `storageBytes` into "how many photos/videos does this hold," replacing the hardcoded `APPROX_IMAGE_BYTES`/`APPROX_VIDEO_BYTES` constants in `lib/planComparison.ts` and the landing page's static photo/video numbers.
- Nothing else in `PlanTierResponseDto` describes marketing copy (feature bullets, "Everything in X" rollup text, guest-count blurb) — those are derived: guest count from `maxMembers`, feature bullets from `moduleKeys` cross-referenced against the module registry (`AppConfigResponseDto.modules`) and the existing `Modules.<key>.name` i18n namespace (already used by `PlanModuleIcons.tsx`), and a small fixed list of baseline features that apply to every plan and aren't modules at all (Countdown, event schedule, download-all, the unique link).
- `components/landing/LandingPricingCard.tsx` (the presentational card) and `hooks/useLandingPricingCategory.ts` (tab selection state) are **not modified** by this plan — this is what "preserve the design as-is" gets enforced by: the card only ever receives a `LandingPlan` object shaped exactly as it is today, regardless of where that object comes from.
- One deliberate copy simplification: today's `includedNote` is a long, hand-written, comma-joined list of every inherited feature (e.g. `"Posts, comments & reactions · Countdown · ..."`). That string can't be reconstructed generically from data. This plan replaces it with a short generated label, `"Everything in {previousPlanName}"` (the Greek copy already uses almost this exact phrase today — see `el.json`'s existing `"Όλα όσα περιλαμβάνει το START"`), shown in the same slot with the same styling. Flag this to whoever reviews the copy; it's intentional, not a bug.

---

## File Structure

| File | Change |
|---|---|
| `lib/api/types.ts` | Add `autoDeleteMonths` to `PlanTierResponseDto`; add 3 `estimate*` fields to `AppMediaConfigDto` |
| `lib/planComparison.ts` | `mediaEstimate` takes a config object instead of hardcoded constants |
| `lib/planComparison.test.ts` | New — unit tests for `mediaEstimate` |
| `components/plan/EventPlanComparison.tsx` | Thread `media` prop into the updated `mediaEstimate` call |
| `components/plan/PlansContent.tsx` | Thread `media` prop through to `EventPlanComparison` |
| `hooks/usePlansPageData.ts` | Expose `media` from `useAppConfig()` |
| `app/(app)/plans/PageClient.tsx` | Pass `data.media` down |
| `lib/landingPricing.ts` | New — pure grouping/derivation logic + `LandingPlan` type (moved here from the card component) |
| `lib/landingPricing.test.ts` | New — unit tests for the above |
| `hooks/useLandingPricingPlans.ts` | New — wires `useAppConfig()` + i18n copy into `lib/landingPricing.ts` |
| `hooks/useLandingPricingPlans.test.tsx` | New — hook test with a mocked API response |
| `components/landing/LandingPricingCard.tsx` | One-line change: import `LandingPlan` from `lib/landingPricing` instead of declaring it locally |
| `components/landing/LandingPricing.tsx` | Swap `t.raw('categories')` for `useLandingPricingPlans()` |
| `messages/en.json` | Remove static per-plan pricing data; add new copy keys |
| `messages/el.json` | Same, Greek |
| `lib/api/serverFetch.ts` | Add `serverPublicGet` (no auth header, for public endpoints) |
| `app/page.tsx` | Convert to an async Server Component that prefetches `GET /api/config` and hydrates it |

---

### Task 1: Add the two missing BE fields to local types

**Files:**
- Modify: `lib/api/types.ts:112-146` (`PlanTierResponseDto`), `lib/api/types.ts:59-73` (`AppMediaConfigDto`)

- [ ] **Step 1: Add `autoDeleteMonths` to `PlanTierResponseDto`**

In `lib/api/types.ts`, find:

```ts
    storageBytes: number | null;
    maxMembers: number | null;
    priceAmountMinor: number | null;
```

Replace with:

```ts
    storageBytes: number | null;
    maxMembers: number | null;
    // EVENT-scope only; always null on ACCOUNT scope. Months after the event's
    // endAt before it is soft-deleted (same lifecycle as a host-requested
    // deletion). null = never auto-deleted. See billing-fe-guide.md
    // "autoDeleteMonths — how long an event's content survives after it ends".
    autoDeleteMonths: number | null;
    priceAmountMinor: number | null;
```

- [ ] **Step 2: Add the three estimate fields to `AppMediaConfigDto`**

Find:

```ts
export interface AppMediaConfigDto {
    maxFileSizeBytes: number;
    maxRequestSizeBytes: number;
    maxImageBytes: number;
    maxVideoBytes: number;
    maxStoryVideoBytes: number;
    maxStoryVideoDurationSeconds: number;
    maxBatchUploadFiles: number;
    maxBatchStoryItems: number;
    maxMediaPerPost: number;
    maxArchiveSelectedItems: number;
    maxArchivePartBytes: number;
    presignedUrlTtlMinutes: number;
    publicHost: string | null;
}
```

Replace with:

```ts
export interface AppMediaConfigDto {
    maxFileSizeBytes: number;
    maxRequestSizeBytes: number;
    maxImageBytes: number;
    maxVideoBytes: number;
    maxStoryVideoBytes: number;
    maxStoryVideoDurationSeconds: number;
    maxBatchUploadFiles: number;
    maxBatchStoryItems: number;
    maxMediaPerPost: number;
    maxArchiveSelectedItems: number;
    maxArchivePartBytes: number;
    presignedUrlTtlMinutes: number;
    publicHost: string | null;
    // Estimation assumptions for "how many photos/videos does this storage
    // quota hold" — NOT upload-time validation limits. Admin-tunable. See
    // app-config-fe-integration.md "media.estimateAvgImageBytes...".
    estimateAvgImageBytes: number;
    estimateAvgVideoBytes: number;
    estimateImageRatio: number; // fraction 0-1
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (these are additive fields; nothing destructures `AppMediaConfigDto`/`PlanTierResponseDto` exhaustively today).

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat: add autoDeleteMonths and media estimate fields to plan/config types"
```

---

### Task 2: Make `mediaEstimate` use the real config instead of hardcoded constants

**Files:**
- Modify: `lib/planComparison.ts`
- Create: `lib/planComparison.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/planComparison.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { mediaEstimate } from '@/lib/planComparison';

const CONFIG = { estimateAvgImageBytes: 4 * 1024 * 1024, estimateAvgVideoBytes: 90 * 1024 * 1024, estimateImageRatio: 0.7 };

describe('mediaEstimate', () => {
    it('returns null for unlimited storage', () => {
        expect(mediaEstimate(null, CONFIG)).toBeNull();
    });

    it('splits storage by the configured image/video ratio before dividing by the average size', () => {
        const storageBytes = 1024 * 1024 * 1024; // 1 GB
        const result = mediaEstimate(storageBytes, CONFIG);

        const expectedImages = Math.floor((storageBytes * 0.7) / CONFIG.estimateAvgImageBytes);
        const expectedVideos = Math.floor((storageBytes * 0.3) / CONFIG.estimateAvgVideoBytes);

        expect(result).toEqual({ images: expectedImages.toLocaleString(), videos: expectedVideos.toLocaleString() });
    });

    it('never reports zero for a non-zero storage quota', () => {
        const result = mediaEstimate(1024, CONFIG); // tiny quota
        expect(result).toEqual({ images: '1', videos: '1' });
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/planComparison.test.ts`
Expected: FAIL — `mediaEstimate` still takes one argument, or the ratio-split math doesn't match the current implementation.

- [ ] **Step 3: Update the implementation**

In `lib/planComparison.ts`, replace the whole file with:

```ts
import type { PlanTierResponseDto } from '@/lib/api/types';

export interface MediaEstimateConfig {
    estimateAvgImageBytes: number;
    estimateAvgVideoBytes: number;
    estimateImageRatio: number;
}

export const PLAN_COMPARISON_EMPTY = '-';

export function mediaEstimate(storageBytes: number | null, config: MediaEstimateConfig): { images: string; videos: string } | null {
    if (storageBytes === null) return null;

    const images = Math.max(1, Math.floor((storageBytes * config.estimateImageRatio) / config.estimateAvgImageBytes));
    const videos = Math.max(1, Math.floor((storageBytes * (1 - config.estimateImageRatio)) / config.estimateAvgVideoBytes));

    return { images: images.toLocaleString(), videos: videos.toLocaleString() };
}

export function formatPlanText(value: string | null): string {
    return value?.trim() ? value : PLAN_COMPARISON_EMPTY;
}

export function formatPlanDiscount(plan: PlanTierResponseDto): string {
    if (plan.discountPercent === null && !plan.discountLabel) return PLAN_COMPARISON_EMPTY;
    return [plan.discountPercent === null ? null : `${plan.discountPercent}%`, plan.discountLabel].filter(Boolean).join(' · ');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/planComparison.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/planComparison.ts lib/planComparison.test.ts
git commit -m "feat: derive media estimate from admin-configured ratio instead of hardcoded constants"
```

---

### Task 3: Thread the real media config into the one existing `mediaEstimate` caller

`EventPlanComparison.tsx` (used by the event-settings "compare plans" screen) is the only other caller of `mediaEstimate`. It needs `AppMediaConfigDto` to keep compiling and to keep showing correct numbers instead of a type error.

**Files:**
- Modify: `hooks/usePlansPageData.ts`
- Modify: `components/plan/PlansContent.tsx`
- Modify: `components/plan/EventPlanComparison.tsx`
- Modify: `app/(app)/plans/PageClient.tsx`

- [ ] **Step 1: Expose `media` from `usePlansPageData`**

In `hooks/usePlansPageData.ts`, in the returned object, add `media` next to the existing `modules` line:

```ts
        modules: appConfig.data?.modules ?? [],
        media: appConfig.data?.media ?? null,
        paidServices: appConfig.data?.paidServices ?? [],
```

- [ ] **Step 2: Accept and forward `media` in `PlansContent`**

In `components/plan/PlansContent.tsx`, add `media` to the props type and destructure it:

```ts
import type { AppConfigResponseDto, PlanTierResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';
```

becomes:

```ts
import type { AppConfigResponseDto, AppMediaConfigDto, PlanTierResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';
```

Add to `PlansContentProps`:

```ts
    media: AppMediaConfigDto | null;
```

Add `media` to the destructured props list, and pass it to `EventPlanComparison`:

```tsx
                    <EventPlanComparison
                        plans={plans}
                        modules={modules}
                        media={media}
                        paidServices={paidServices}
```

- [ ] **Step 3: Accept `media` in `EventPlanComparison` and use it**

In `components/plan/EventPlanComparison.tsx`:

```ts
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';
```

becomes:

```ts
import type { AppMediaConfigDto, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';
```

Add `media` to the component's props type and destructuring:

```ts
export function EventPlanComparison({
    plans,
    modules,
    media,
    paidServices,
```

```ts
}: {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    media: AppMediaConfigDto | null;
    paidServices: PaidServiceResponseDto[];
```

Update the `media` row's render function:

```tsx
        {
            key: 'media',
            label: t('compare.mediaCapacity'),
            render: (plan) => {
                const estimate = media ? mediaEstimate(plan.storageBytes, media) : null;
                return (
                    <span>
                        {estimate ? t('compare.mediaEstimate', { images: estimate.images, videos: estimate.videos }) : t('compare.unlimitedMedia')}
                    </span>
                );
            },
        },
```

- [ ] **Step 4: Pass `data.media` from the page**

In `app/(app)/plans/PageClient.tsx`, add `media={data.media}` next to the existing `modules={data.modules}` line:

```tsx
        <PlansContent
            checkoutError={data.checkoutError}
            isCheckoutPending={data.isCheckoutPending}
            modules={data.modules}
            media={data.media}
            paidServices={data.paidServices}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/usePlansPageData.ts components/plan/PlansContent.tsx components/plan/EventPlanComparison.tsx "app/(app)/plans/PageClient.tsx"
git commit -m "feat: thread real media estimate config into the plan comparison screen"
```

---

### Task 4: Build the pure landing-pricing derivation module

This is the core logic: which BE plans feed which tab, and how a `PlanTierResponseDto` becomes a `LandingPlan`.

**Files:**
- Create: `lib/landingPricing.ts`
- Create: `lib/landingPricing.test.ts`
- Modify: `components/landing/LandingPricingCard.tsx` (move the `LandingPlan` type out)

- [ ] **Step 1: Move `LandingPlan` out of the card component**

In `components/landing/LandingPricingCard.tsx`, delete these lines (currently lines 1-12):

```ts
import { routes } from '@/lib/routes';

export type LandingPlan = {
    audience: string;
    features: string[];
    includedNote?: string;
    name: string;
    photos: string;
    price: string;
    storage: string;
    videos: string;
};
```

Replace with:

```ts
import type { LandingPlan } from '@/lib/landingPricing';
import { routes } from '@/lib/routes';
```

(The rest of the file — the `LandingPricingCardProps` type and the component body — is unchanged.)

- [ ] **Step 2: Write the failing tests**

Create `lib/landingPricing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { AppMediaConfigDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import {
    buildLandingPlan,
    formatLandingPlanPrice,
    LANDING_PRICING_CATEGORY_EVENT_TYPES,
    type LandingPlanCopy,
    resolveLandingCategoryPlans,
} from '@/lib/landingPricing';

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan-1',
        code: 'START',
        scope: 'EVENT',
        name: 'START',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        storageBytes: 16 * 1024 * 1024 * 1024,
        maxMembers: 150,
        autoDeleteMonths: 3,
        priceAmountMinor: 7900,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: ['gallery'],
        paidModules: [],
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        ...overrides,
    };
}

const MODULES: PlatformModuleResponseDto[] = [
    { id: 'm-gallery', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 },
    { id: 'm-rsvp', moduleKey: 'rsvp', name: 'RSVP', description: null, isEnabled: true, sortOrder: 1 },
    { id: 'm-stories', moduleKey: 'stories', name: 'Stories', description: null, isEnabled: true, sortOrder: 2 },
    { id: 'm-wishbook', moduleKey: 'wishbook', name: 'Guestbook', description: null, isEnabled: true, sortOrder: 3 },
];

const MEDIA: AppMediaConfigDto = {
    maxFileSizeBytes: 0,
    maxRequestSizeBytes: 0,
    maxImageBytes: 0,
    maxVideoBytes: 0,
    maxStoryVideoBytes: 0,
    maxStoryVideoDurationSeconds: 0,
    maxBatchUploadFiles: 0,
    maxBatchStoryItems: 0,
    maxMediaPerPost: 0,
    maxArchiveSelectedItems: 0,
    maxArchivePartBytes: 0,
    presignedUrlTtlMinutes: 0,
    publicHost: null,
    estimateAvgImageBytes: 4 * 1024 * 1024,
    estimateAvgVideoBytes: 90 * 1024 * 1024,
    estimateImageRatio: 0.7,
};

const COPY: LandingPlanCopy = {
    accessMonths: (months) => `Access for ${months} months after the event`,
    accessUnlimited: 'Access never expires',
    baselineFeatures: ['Countdown', 'Event schedule', 'Download all photos & videos', 'Unique StoryWall link'],
    everythingIn: (planName) => `Everything in ${planName}`,
    guestsUnlimited: 'Unlimited guests',
    guestsUpTo: (count) => `Up to ${count} guests`,
    mediaUnlimited: 'Unlimited',
    storageUnlimited: 'Unlimited storage',
};

const MODULE_NAME = (moduleKey: string) => MODULES.find((module_) => module_.moduleKey === moduleKey)?.name ?? moduleKey;

describe('resolveLandingCategoryPlans', () => {
    it('returns the wedding-tab plans sorted by sortOrder', () => {
        const plans = [
            makePlan({ id: 'p2', code: 'SIGNATURE', sortOrder: 2, eventTypeKey: 'WEDDING' }),
            makePlan({ id: 'p1', code: 'START', sortOrder: 0, eventTypeKey: 'WEDDING' }),
            makePlan({ id: 'p3', code: 'VIP_START', sortOrder: 0, eventTypeKey: 'SOCIAL_EVENT' }),
        ];

        const result = resolveLandingCategoryPlans(plans, 'wedding');

        expect(result.map((plan) => plan.code)).toEqual(['START', 'SIGNATURE']);
    });

    it('falls back to BAPTISM for the wedding tab when there are no WEDDING plans', () => {
        const plans = [makePlan({ code: 'BAPTISM_BASIC', eventTypeKey: 'BAPTISM' })];

        const result = resolveLandingCategoryPlans(plans, 'wedding');

        expect(result.map((plan) => plan.code)).toEqual(['BAPTISM_BASIC']);
    });

    it('excludes archived and non-public plans', () => {
        const plans = [
            makePlan({ code: 'ARCHIVED', isAssignable: false }),
            makePlan({ code: 'INTERNAL', isPublic: false }),
            makePlan({ code: 'VISIBLE' }),
        ];

        const result = resolveLandingCategoryPlans(plans, 'wedding');

        expect(result.map((plan) => plan.code)).toEqual(['VISIBLE']);
    });

    it('returns an empty array when the category has no matching event type at all', () => {
        expect(resolveLandingCategoryPlans([makePlan({ eventTypeKey: 'CORPORATE' })], 'vip')).toEqual([]);
    });

    it('defines the wedding and vip category mappings', () => {
        expect(LANDING_PRICING_CATEGORY_EVENT_TYPES).toEqual({ wedding: ['WEDDING', 'BAPTISM'], vip: ['SOCIAL_EVENT'] });
    });
});

describe('formatLandingPlanPrice', () => {
    it('renders a whole-euro price in the existing landing style (no decimals, suffixed symbol)', () => {
        expect(formatLandingPlanPrice(makePlan({ priceAmountMinor: 7900, priceCurrency: 'EUR' }))).toBe('79€');
    });

    it('applies an active discount before formatting', () => {
        const plan = makePlan({ priceAmountMinor: 10000, priceCurrency: 'EUR', discountPercent: 20 });
        expect(formatLandingPlanPrice(plan)).toBe('80€');
    });

    it('returns null when the plan has no price', () => {
        expect(formatLandingPlanPrice(makePlan({ priceAmountMinor: null }))).toBeNull();
    });
});

describe('buildLandingPlan', () => {
    it('builds a full card for a plan with no previous tier', () => {
        const plan = makePlan({ moduleKeys: ['gallery'], maxMembers: 150, storageBytes: 16 * 1024 * 1024 * 1024, autoDeleteMonths: 3 });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card).not.toBeNull();
        expect(card?.name).toBe('START');
        expect(card?.price).toBe('79€');
        expect(card?.audience).toBe('Up to 150 guests');
        expect(card?.storage).toBe('16 GB');
        expect(card?.features).toEqual(['Countdown', 'Event schedule', 'Download all photos & videos', 'Unique StoryWall link', 'Gallery', 'Access for 3 months after the event']);
        expect(card?.includedNote).toBeUndefined();
    });

    it('shows an "Everything in X" rollup when the tier is a strict superset of the previous one', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['gallery'] });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['gallery', 'stories', 'rsvp', 'wishbook'], autoDeleteMonths: 6 });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.includedNote).toBe('Everything in START');
        expect(card?.features).toEqual(['RSVP', 'Stories', 'Guestbook', 'Access for 6 months after the event']);
    });

    it('renders "Unlimited" copy for null storage, members, and access window', () => {
        const plan = makePlan({ storageBytes: null, maxMembers: null, autoDeleteMonths: null });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.storage).toBe('Unlimited storage');
        expect(card?.audience).toBe('Unlimited guests');
        expect(card?.photos).toBe('Unlimited');
        expect(card?.videos).toBe('Unlimited');
        expect(card?.features).toContain('Access never expires');
    });

    it('returns null for a plan with no resolvable price', () => {
        expect(buildLandingPlan(makePlan({ priceAmountMinor: null }), undefined, MODULES, MEDIA, MODULE_NAME, COPY)).toBeNull();
    });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run lib/landingPricing.test.ts`
Expected: FAIL — `lib/landingPricing.ts` doesn't exist yet.

- [ ] **Step 4: Implement `lib/landingPricing.ts`**

```ts
import type { AppMediaConfigDto, EventTypeConvention, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { discountedAmountMinor } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { mediaEstimate } from '@/lib/planComparison';
import { enabledModuleKeys } from '@/lib/planModules';
import { publicAssignablePlans } from '@/lib/planTiers';

export type LandingPricingCategoryKey = 'wedding' | 'vip';

// The two landing tabs don't correspond 1:1 to a BE eventTypeKey. Each entry
// is an ordered list of candidate types for that tab — resolveLandingCategoryPlans
// uses the first one that actually has plans, it never merges plans from two
// types into one tab. See docs/superpowers/plans/2026-09-18-landing-pricing-dynamic-plans.md.
export const LANDING_PRICING_CATEGORY_EVENT_TYPES: Record<LandingPricingCategoryKey, EventTypeConvention[]> = {
    wedding: ['WEDDING', 'BAPTISM'],
    vip: ['SOCIAL_EVENT'],
};

export type LandingPlan = {
    audience: string;
    features: string[];
    includedNote?: string;
    name: string;
    photos: string;
    price: string;
    storage: string;
    videos: string;
};

export interface LandingPlanCopy {
    accessMonths: (months: number) => string;
    accessUnlimited: string;
    baselineFeatures: string[];
    everythingIn: (planName: string) => string;
    guestsUnlimited: string;
    guestsUpTo: (count: number) => string;
    mediaUnlimited: string;
    storageUnlimited: string;
}

export function resolveLandingCategoryPlans(plans: PlanTierResponseDto[], category: LandingPricingCategoryKey): PlanTierResponseDto[] {
    const eventPlans = publicAssignablePlans(plans, 'EVENT');

    for (const eventTypeKey of LANDING_PRICING_CATEGORY_EVENT_TYPES[category]) {
        const forType = eventPlans.filter((plan) => plan.eventTypeKey === eventTypeKey).sort((left, right) => left.sortOrder - right.sortOrder);
        if (forType.length > 0) return forType;
    }

    return [];
}

// Mirrors the landing page's existing static style exactly: a whole euro
// amount with a suffixed symbol and no decimals ("79€"), not
// Intl.NumberFormat's default currency rendering (which would print "€79.00"
// or add locale-specific spacing/decimals and change the visual design).
export function formatLandingPlanPrice(plan: PlanTierResponseDto): string | null {
    if (plan.priceAmountMinor === null || !plan.priceCurrency) return null;

    const amount = discountedAmountMinor(plan.priceAmountMinor, plan) / 100;
    if (plan.priceCurrency === 'EUR' && Number.isInteger(amount)) return `${amount}€`;

    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.priceCurrency }).format(amount);
}

function sortedModuleNames(moduleKeys: string[], modules: PlatformModuleResponseDto[], moduleName: (moduleKey: string) => string): string[] {
    const sortOrderByKey = new Map(modules.map((module_) => [module_.moduleKey, module_.sortOrder]));
    return enabledModuleKeys(moduleKeys, modules)
        .slice()
        .sort((left, right) => (sortOrderByKey.get(left) ?? 0) - (sortOrderByKey.get(right) ?? 0))
        .map(moduleName);
}

// Builds one landing pricing card from a plan tier plus the tier directly
// below it in the same tab (already sorted by sortOrder — see
// resolveLandingCategoryPlans). When every module the previous tier includes
// is also included here, the card shows "Everything in <previous>" plus only
// the newly-added modules, mirroring the original static copy's rollup style
// instead of repeating the full feature list on every card. Returns null for
// a plan with no resolvable price — a pricing card with no price to show
// doesn't belong on the pricing page.
export function buildLandingPlan(
    plan: PlanTierResponseDto,
    previousPlan: PlanTierResponseDto | undefined,
    modules: PlatformModuleResponseDto[],
    media: AppMediaConfigDto,
    moduleName: (moduleKey: string) => string,
    copy: LandingPlanCopy
): LandingPlan | null {
    const price = formatLandingPlanPrice(plan);
    if (price === null) return null;

    const estimate = mediaEstimate(plan.storageBytes, media);
    const accessBullet = plan.autoDeleteMonths === null ? copy.accessUnlimited : copy.accessMonths(plan.autoDeleteMonths);
    const inheritsFromPrevious = previousPlan !== undefined && previousPlan.moduleKeys.every((moduleKey) => plan.moduleKeys.includes(moduleKey));

    const features = inheritsFromPrevious
        ? [
              ...sortedModuleNames(
                  plan.moduleKeys.filter((moduleKey) => !previousPlan!.moduleKeys.includes(moduleKey)),
                  modules,
                  moduleName
              ),
              accessBullet,
          ]
        : [...copy.baselineFeatures, ...sortedModuleNames(plan.moduleKeys, modules, moduleName), accessBullet];

    return {
        audience: plan.maxMembers === null ? copy.guestsUnlimited : copy.guestsUpTo(plan.maxMembers),
        features,
        includedNote: inheritsFromPrevious ? copy.everythingIn(previousPlan!.name) : undefined,
        name: plan.name,
        photos: estimate?.images ?? copy.mediaUnlimited,
        price,
        storage: plan.storageBytes === null ? copy.storageUnlimited : formatBytes(plan.storageBytes),
        videos: estimate?.videos ?? copy.mediaUnlimited,
    };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/landingPricing.test.ts`
Expected: PASS (all tests)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (confirms the `LandingPricingCard.tsx` type-import change from Step 1 compiles).

- [ ] **Step 7: Commit**

```bash
git add lib/landingPricing.ts lib/landingPricing.test.ts components/landing/LandingPricingCard.tsx
git commit -m "feat: add pure landing-pricing plan grouping and derivation logic"
```

---

### Task 5: Wire the derivation module to `useAppConfig()` and i18n

**Files:**
- Create: `hooks/useLandingPricingPlans.ts`
- Create: `hooks/useLandingPricingPlans.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `hooks/useLandingPricingPlans.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';
import type { AppConfigResponseDto } from '@/lib/api/types';

const publicGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { publicGet: (...a: unknown[]) => publicGet(...a) },
    ApiError: class ApiError extends Error {},
}));

const MESSAGES = {
    LandingPage: {
        pricing: {
            baselineFeatures: ['Countdown', 'Event schedule'],
            categories: { wedding: { label: 'Wedding' }, vip: { label: 'VIP' } },
            accessMonths: 'Access for {months} months after the event',
            accessUnlimited: 'Access never expires',
            everythingIn: 'Everything in {plan}',
            guestsUnlimited: 'Unlimited guests',
            guestsUpTo: 'Up to {count} guests',
            mediaUnlimited: 'Unlimited',
            storageUnlimited: 'Unlimited storage',
        },
    },
    Modules: { gallery: { name: 'Gallery' } },
};

function makeConfig(): AppConfigResponseDto {
    return {
        featureFlags: [],
        media: {
            maxFileSizeBytes: 0,
            maxRequestSizeBytes: 0,
            maxImageBytes: 0,
            maxVideoBytes: 0,
            maxStoryVideoBytes: 0,
            maxStoryVideoDurationSeconds: 0,
            maxBatchUploadFiles: 0,
            maxBatchStoryItems: 0,
            maxMediaPerPost: 0,
            maxArchiveSelectedItems: 0,
            maxArchivePartBytes: 0,
            presignedUrlTtlMinutes: 0,
            publicHost: null,
            estimateAvgImageBytes: 4 * 1024 * 1024,
            estimateAvgVideoBytes: 90 * 1024 * 1024,
            estimateImageRatio: 0.7,
        },
        pagination: { defaultPageSize: 20, maxPageSize: 50 },
        planTiers: [
            {
                id: 'p1',
                code: 'START',
                scope: 'EVENT',
                name: 'START',
                description: null,
                sortOrder: 0,
                isDefault: true,
                isAssignable: true,
                isPublic: true,
                storageBytes: 16 * 1024 * 1024 * 1024,
                maxMembers: 150,
                autoDeleteMonths: 3,
                priceAmountMinor: 7900,
                priceCurrency: 'EUR',
                billingPeriod: 'ONE_TIME',
                discountPercent: null,
                discountLabel: null,
                discountStartsAt: null,
                discountEndsAt: null,
                moduleKeys: ['gallery'],
                paidModules: [],
                eventTypeKey: 'WEDDING',
                sharedGroupKey: null,
            },
        ],
        paidServices: [],
        eventModuleKeys: ['gallery'],
        modules: [{ id: 'm1', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 }],
        eventTypes: [],
        eventTypeKeys: ['WEDDING', 'BAPTISM', 'SOCIAL_EVENT'],
        translations: { eventTypes: {} },
        rsvp: { minAdults: 1, maxAdults: 5, minChildren: 0, maxChildren: 4 },
        withdrawal: { termsVersion: '1' } as AppConfigResponseDto['withdrawal'],
        contentLimits: {} as AppConfigResponseDto['contentLimits'],
        reactionTypesByEventType: {},
        rateLimits: [],
        reportTargetTypes: ['POST'],
        reportReasons: ['SPAM'],
    };
}

function wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={MESSAGES}>
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

describe('useLandingPricingPlans', () => {
    it('resolves the wedding tab from the public config catalog', async () => {
        publicGet.mockResolvedValue(makeConfig());

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.categories).not.toBeNull());

        expect(result.current.categories?.wedding.label).toBe('Wedding');
        expect(result.current.categories?.wedding.plans).toHaveLength(1);
        expect(result.current.categories?.wedding.plans[0].name).toBe('START');
        expect(result.current.categories?.wedding.plans[0].price).toBe('79€');
        expect(result.current.categories?.vip.plans).toHaveLength(0);
    });

    it('returns null categories before the config has loaded', () => {
        publicGet.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        expect(result.current.categories).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run hooks/useLandingPricingPlans.test.tsx`
Expected: FAIL — `hooks/useLandingPricingPlans.ts` doesn't exist yet.

- [ ] **Step 3: Implement `hooks/useLandingPricingPlans.ts`**

```ts
'use client';

import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import {
    buildLandingPlan,
    LANDING_PRICING_CATEGORY_EVENT_TYPES,
    type LandingPlan,
    type LandingPlanCopy,
    type LandingPricingCategoryKey,
    resolveLandingCategoryPlans,
} from '@/lib/landingPricing';

export type LandingPricingCategories = Record<LandingPricingCategoryKey, { label: string; plans: LandingPlan[] }>;

const CATEGORY_KEYS = Object.keys(LANDING_PRICING_CATEGORY_EVENT_TYPES) as LandingPricingCategoryKey[];

export function useLandingPricingPlans(): { categories: LandingPricingCategories | null } {
    const t = useTranslations('LandingPage.pricing');
    const tModules = useTranslations('Modules');
    const { data } = useAppConfig();

    if (!data) return { categories: null };

    const moduleName = (moduleKey: string) => (tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : moduleKey);
    const copy: LandingPlanCopy = {
        accessMonths: (months) => t('accessMonths', { months }),
        accessUnlimited: t('accessUnlimited'),
        baselineFeatures: t.raw('baselineFeatures') as string[],
        everythingIn: (planName) => t('everythingIn', { plan: planName }),
        guestsUnlimited: t('guestsUnlimited'),
        guestsUpTo: (count) => t('guestsUpTo', { count }),
        mediaUnlimited: t('mediaUnlimited'),
        storageUnlimited: t('storageUnlimited'),
    };

    const categories = CATEGORY_KEYS.reduce<LandingPricingCategories>((result, category) => {
        const plans = resolveLandingCategoryPlans(data.planTiers, category);
        const landingPlans = plans
            .map((plan, index) => buildLandingPlan(plan, plans[index - 1], data.modules, data.media, moduleName, copy))
            .filter((plan): plan is LandingPlan => plan !== null);
        result[category] = { label: t(`categories.${category}.label`), plans: landingPlans };
        return result;
    }, {} as LandingPricingCategories);

    return { categories };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run hooks/useLandingPricingPlans.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useLandingPricingPlans.ts hooks/useLandingPricingPlans.test.tsx
git commit -m "feat: add hook wiring landing pricing derivation to app config and i18n"
```

---

### Task 6: Update the translation files

Remove the static per-plan pricing data (now generated) and the dead flat `pricing.plans` block; add the new copy keys the hook reads. Tab labels (`categories.wedding.label` / `categories.vip.label`) and every other existing key in `LandingPage.pricing` (`eyebrow`, `heading`, `intro`, `choose`, `popular`, `categoryLabel`, `storageLabel`, `photosLabel`, `videosLabel`, `storageNote`, `note`) stay exactly as they are.

**Files:**
- Modify: `messages/en.json:3371-3512`
- Modify: `messages/el.json:3581-3722`

- [ ] **Step 1: Confirm the flat `pricing.plans` block is genuinely unused**

Run: `npx grep -rn "pricing.plans\|LandingPage.pricing.plans" --include="*.tsx" --include="*.ts" components app hooks`

Expected: no output (already verified during planning — nothing renders `LandingPage.pricing.plans`; only `LandingPage.pricing.categories.*.plans` was used, and only by `LandingPricing.tsx`, which Task 7 rewrites).

- [ ] **Step 2: Rewrite `messages/en.json`'s `pricing` block**

Replace lines 3371-3512 (the whole `"pricing": { ... }` object, from `"eyebrow": "PLANS"` through the closing of the flat `"plans"` array) with:

```json
        "pricing": {
            "eyebrow": "PLANS",
            "heading": "Every event deserves its own StoryWall.",
            "intro": "Three ways to make your event unforgettable.",
            "choose": "CHOOSE PLAN",
            "popular": "most popular",
            "categoryLabel": "Event category",
            "storageLabel": "Storage",
            "photosLabel": "photos",
            "videosLabel": "videos",
            "storageNote": "Estimates assume files up to 5 MB per photo and video clips up to 15 seconds.",
            "categories": {
                "wedding": {
                    "label": "Wedding · Baptism · Gender Reveal · Baby Shower"
                },
                "vip": {
                    "label": "VIP & Social Parties"
                }
            },
            "note": "Prices shown are indicative and may change.",
            "baselineFeatures": ["Countdown", "Event schedule", "Download all photos & videos", "Unique StoryWall link"],
            "guestsUpTo": "Up to {count} guests",
            "guestsUnlimited": "Unlimited guests",
            "storageUnlimited": "Unlimited storage",
            "mediaUnlimited": "Unlimited",
            "accessMonths": "Access for {months} months after the event",
            "accessUnlimited": "Access never expires",
            "everythingIn": "Everything in {plan}"
        },
```

- [ ] **Step 3: Rewrite `messages/el.json`'s `pricing` block**

Replace lines 3581-3722 the same way:

```json
        "pricing": {
            "eyebrow": "ΠΑΚΕΤΑ",
            "heading": "Κάθε event αξίζει το δικό του StoryWall.",
            "intro": "Τρία επίπεδα εμπειρίας. Ένα StoryWall για κάθε event.",
            "choose": "ΕΠΙΛΕΞΕ ΠΑΚΕΤΟ",
            "popular": "most popular",
            "categoryLabel": "Κατηγορία event",
            "storageLabel": "Αποθηκευτικός χώρος",
            "photosLabel": "φωτογραφίες",
            "videosLabel": "βίντεο",
            "storageNote": "Ο υπολογισμός βασίζεται σε αρχεία έως 5 MB ανά φωτογραφία και video clips διάρκειας έως 15″.",
            "categories": {
                "wedding": {
                    "label": "Γάμος · Βάπτιση · Gender Reveal · Baby Shower"
                },
                "vip": {
                    "label": "VIP & Social Parties"
                }
            },
            "note": "Οι τιμές είναι ενδεικτικές για την παρουσίαση και μπορούν να αλλάξουν.",
            "baselineFeatures": ["Αντίστροφη μέτρηση", "Πρόγραμμα εκδήλωσης", "Download όλων των φωτογραφιών & βίντεο", "Μοναδικό link για το StoryWall"],
            "guestsUpTo": "Έως {count} χρήστες",
            "guestsUnlimited": "Απεριόριστοι χρήστες",
            "storageUnlimited": "Απεριόριστος χώρος",
            "mediaUnlimited": "Απεριόριστο",
            "accessMonths": "Πρόσβαση για {months} μήνες μετά το event",
            "accessUnlimited": "Απεριόριστη πρόσβαση",
            "everythingIn": "Όλα όσα περιλαμβάνει το {plan}"
        },
```

- [ ] **Step 4: Validate both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/el.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: replace static landing pricing copy with BE-derived data and new i18n keys"
```

---

### Task 7: Swap the landing pricing section onto the new hook

**Files:**
- Modify: `components/landing/LandingPricing.tsx`

- [ ] **Step 1: Replace the data source**

Replace the whole file:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCard } from '@/components/landing/LandingPricingCard';
import { useLandingPricingCategory } from '@/hooks/useLandingPricingCategory';
import { useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';
import { cn } from '@/lib/utils';

const CATEGORY_ORDER = ['wedding', 'vip'] as const;

export function LandingPricing() {
    const t = useTranslations('LandingPage.pricing');
    const { categories } = useLandingPricingPlans();
    const { category, selectCategory, handleCategoryKeyDown } = useLandingPricingCategory();

    if (!categories) return null;

    return (
        <section
            aria-labelledby="landing-pricing-title"
            className="bg-white px-5 pt-16 pb-16 text-[#151313] min-[761px]:px-[clamp(24px,4vw,72px)] min-[761px]:pt-20 min-[761px]:pb-24"
            id="pricing"
        >
            {/* Pricing introduction */}
            <div className="mx-auto grid max-w-[1200px] gap-x-[5vw] min-[761px]:grid-cols-[1fr_2fr]">
                <p className="text-[13px] font-black tracking-[.15em]">{t('eyebrow')}</p>
                <div>
                    <h2
                        className="mt-5 max-w-[820px] [font-family:Baskerville,Georgia,serif] text-[clamp(48px,11vw,88px)] leading-[.9] tracking-[-.055em] min-[761px]:mt-0"
                        id="landing-pricing-title"
                    >
                        {t('heading')}
                    </h2>
                    <p className="mt-5 max-w-[620px] text-base leading-relaxed">{t('intro')}</p>
                </div>
            </div>

            {/* Event categories */}
            <div
                aria-label={t('categoryLabel')}
                className="mx-auto mt-16 flex max-w-[1324px] border-b border-[#151313]/20 min-[761px]:mt-20"
                role="tablist"
            >
                {CATEGORY_ORDER.map((key) => (
                    <button
                        aria-controls="landing-pricing-panel"
                        aria-selected={category === key}
                        className={cn(
                            'relative min-h-[72px] w-1/2 px-2 pb-4 text-center text-[12px] leading-tight font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#df7794] min-[761px]:min-h-12 min-[761px]:px-6 min-[761px]:text-[17px]',
                            category === key
                                ? 'text-[#151313] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[linear-gradient(90deg,#df7794,#f2c764)]'
                                : 'text-[#151313]/50 hover:text-[#151313]'
                        )}
                        data-category={key}
                        id={`landing-pricing-tab-${key}`}
                        key={key}
                        onClick={selectCategory}
                        onKeyDown={handleCategoryKeyDown}
                        role="tab"
                        tabIndex={category === key ? 0 : -1}
                        type="button"
                    >
                        {categories[key].label}
                    </button>
                ))}
            </div>

            {/* Plans */}
            <div
                aria-labelledby={`landing-pricing-tab-${category}`}
                className="mx-auto mt-9 grid max-w-[1324px] gap-5 min-[761px]:grid-cols-3 min-[761px]:gap-[clamp(24px,3vw,52px)]"
                id="landing-pricing-panel"
                role="tabpanel"
            >
                {categories[category].plans.map((plan, index) => (
                    <LandingPricingCard
                        chooseLabel={t('choose')}
                        featured={index === 1}
                        key={`${category}-${plan.name}`}
                        photosLabel={t('photosLabel')}
                        plan={plan}
                        popularLabel={t('popular')}
                        storageLabel={t('storageLabel')}
                        storageNote={t('storageNote')}
                        videosLabel={t('videosLabel')}
                    />
                ))}
            </div>
            <p className="mx-auto mt-5 max-w-[1324px] text-right text-[11px]">{t('note')}</p>
        </section>
    );
}
```

The only functional changes from the original: `categories` comes from `useLandingPricingPlans()` instead of `t.raw('categories')`, and there's an early `if (!categories) return null;` guard for the (normally unreachable once Task 8 lands) pre-hydration state. Every class name, element, and prop is identical to today.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/LandingPricing.tsx
git commit -m "feat: render landing pricing cards from the real plan catalog"
```

---

### Task 8: Server-side prefetch so the pricing section doesn't flash empty

Per this repo's data-fetching convention (server prefetch + hydrate for route-derivable data), fetch `GET /api/config` in `app/page.tsx` and seed the same query key `useAppConfig()` reads, so the pricing section has real data on first paint instead of waiting for a client-side fetch.

**Files:**
- Modify: `lib/api/serverFetch.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add a public (no-auth) server fetch helper**

In `lib/api/serverFetch.ts`, add alongside the existing `serverGet`:

```ts
// Server-only: like serverGet, but for endpoints that don't require auth (e.g.
// GET /api/config). No Authorization header is sent.
export async function serverPublicGet<T>(path: string): Promise<T> {
    const locale = await getServerLocale();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Accept-Language': locale },
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Server prefetch failed for ${path} with status ${res.status}`);
    }

    return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Prefetch and hydrate in `app/page.tsx`**

Replace the whole file:

```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { LandingContent } from '@/components/landing';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { makeQueryClient } from '@/lib/queryClient';

export default async function Page() {
    const queryClient = makeQueryClient();

    try {
        const config = await serverPublicGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort — useAppConfig() fetches normally on the client if this fails.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <LandingContent />
        </HydrationBoundary>
    );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/serverFetch.ts app/page.tsx
git commit -m "feat: prefetch app config server-side on the landing page"
```

---

### Task 9: Visual verification in the browser

**Files:** none (manual verification step)

- [ ] **Step 1: Start the dev server and open the landing page**

Use the project's preview tooling to start the dev server and navigate to `/`.

- [ ] **Step 2: Verify the pricing section renders real data**

Scroll to the pricing section (`#pricing`). Confirm:
- Both tabs ("Wedding · Baptism · Gender Reveal · Baby Shower" and "VIP & Social Parties") render exactly 3 cards each (assuming the seeded/dev backend has 3 public `WEDDING` and 3 public `SOCIAL_EVENT` plans — if the dev backend's catalog differs, the card count should match whatever it actually has, since the grid is no longer hardcoded to 3).
- Prices show in the `79€`-style format, not `€79.00`.
- The middle card in each tab has the "most popular" badge and the accent border.
- The second and third cards show an "Everything in {previous plan name}" note above their feature list instead of repeating every earlier feature.
- Storage/photos/videos numbers are populated (not blank, not "NaN").
- Switching tabs with a mouse click and with arrow keys still works (unchanged `useLandingPricingCategory` logic).

- [ ] **Step 3: Verify the Greek locale**

Navigate to the `el` locale variant of the landing page. Confirm the tab labels, feature bullets, and price suffix all render in Greek with no missing-translation-key warnings in the browser console (`read_console_messages`).

- [ ] **Step 4: Verify no client-side loading flash**

With the network tab open, hard-reload `/`. Confirm the pricing cards are present in the initial HTML response (view-source or the SSR payload), not inserted after a visible blank gap — this confirms Task 8's prefetch is working.

---

### Task 10: Full verification pass

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new ones from Tasks 2, 4, and 5.

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run type:check`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. Fix any and commit the fix as its own small commit if needed.

- [ ] **Step 4: Search for any remaining stale references**

Run: `npx grep -rn "APPROX_IMAGE_BYTES\|APPROX_VIDEO_BYTES" --include="*.ts" --include="*.tsx" .`
Expected: no output (the old hardcoded constants from `lib/planComparison.ts` are gone).

- [ ] **Step 5: Final commit if anything changed in Steps 1-4**

```bash
git add -A
git commit -m "chore: fix lint/type issues from landing pricing migration"
```

---

## Self-Review Notes

- **Spec coverage:** every confirmed scope item (public data source, tab→eventTypeKey resolution with the WEDDING→BAPTISM fallback, positional "featured" card, price/storage/guests/photos/videos/access-window all derived from real fields, module-driven feature bullets with the "Everything in X" rollup, i18n cleanup, server prefetch) has a task. `LandingPricingCard.tsx`'s markup and `useLandingPricingCategory.ts`'s tab logic are explicitly untouched, per "preserve the design as-is."
- **Known, called-out design trade-off:** `includedNote` becomes a short generated label instead of the original long hand-written list — flagged in "Context for the engineer" above, not hidden in a diff.
- **No placeholders:** every step has complete, runnable code and an exact command with an expected result.
