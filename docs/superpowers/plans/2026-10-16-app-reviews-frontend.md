# App Reviews — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show signed-in users a one-time "How was Storywall for {event}?" bottom sheet after an event ends, give admins a Reviews panel to approve and feature reviews, and show featured reviews on the landing page.

**Architecture:** The backend decides who is asked (`GET /api/me/review-prompt`, 204 = nothing). A `ReviewPrompt` mounted in `AppShell` fetches it on the home and event feed screens and opens a `Modal variant="sheet"` once, when no other overlay is open. The admin console gets an `appReviews` tab (table + drawer). The landing page reads `landingReviews` from the already-prefetched `GET /api/config`, keeps only its own locale, and hides the section under 3 reviews.

**Tech Stack:** Next.js App Router, React 19, TanStack Query, next-intl, Tailwind, Vitest + Testing Library.

**Depends on:** `docs/superpowers/plans/2026-10-16-app-reviews-backend.md` (routes and the `landingReviews` config field). The frontend can be built and unit-tested before the backend ships; the manual check in Task 9 needs it running.

**Spec:** `docs/superpowers/specs/2026-10-16-app-reviews-design.md`. Plan-time decisions that refine it:
- Featured reviews come from `GET /api/config` → `landingReviews` (not a separate endpoint). Admin changes call `invalidatePublicConfig` so the landing page updates at once.
- Each language version of the landing page shows only reviews written in that language (`review.locale`), and needs 3 of them.
- The prompt shows on `/home` and `/events/{id}/feed` only; never to admins; never on `/demo`.
- No admin "get by id" route: the drawer edits the row it was opened from.

**Branch:** start from the latest `origin/staging` (this worktree's branch `claude/storywall-rating-feature-cdd5d4` is level with it). PR into `staging`.

---

## File Structure

Create:
- `lib/reviews.ts` — constants and pure helpers (consent rule, prompt routes, landing filter, admin list path).
- `lib/reviews.test.ts`
- `hooks/useReviewPrompt.ts` — prompt query + submit/dismiss mutations, `reviewKeys`.
- `hooks/useReviewPrompt.test.tsx`
- `hooks/useReviewPromptSheet.ts` — when to open, what closing means.
- `hooks/useReviewForm.ts` — form state and submit.
- `components/review/ReviewPrompt.tsx` — mount point.
- `components/review/ReviewPromptSheet.tsx` — sheet shell.
- `components/review/ReviewForm.tsx`
- `components/review/ReviewForm.test.tsx`
- `components/review/ReviewStars.tsx` — 1–5 radio group.
- `components/review/ReviewSent.tsx`
- `hooks/useAdminAppReviews.ts` — admin list + patch.
- `hooks/useAppReviewsPanel.ts` — panel state.
- `components/admin/appReviews/AppReviewsPanel.tsx`
- `components/admin/appReviews/AppReviewsTable.tsx`
- `components/admin/appReviews/AppReviewDrawer.tsx`
- `components/admin/appReviews/AppReviewStatusControl.tsx`
- `components/admin/appReviews/AppReviewStatusPill.tsx`
- `components/landing/LandingReviews.tsx`
- `components/landing/LandingReviews.test.tsx`

Modify:
- `lib/api/types.ts` — review types, `AppConfigResponseDto.landingReviews`.
- `lib/api/endpoints.ts` — `me.reviewPrompt`, `me.reviews`, `me.reviewsDismiss`, `admin.appReviews`.
- `components/layout/AppShell.tsx` — mount `ReviewPrompt`.
- `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminShellNav.tsx`, `components/admin/AdminConsole.tsx` — new tab.
- `components/landing/LandingContent.tsx` — place the section.
- `lib/landingTracking.ts` — `'reviews'` section.
- `messages/en.json`, `messages/el.json` — `ReviewPrompt`, `AdminPage.tabs.appReviews`, `AdminPage.appReviews`, `LandingPage.reviews`.

---

### Task 1: Types, endpoints, helpers

**Files:**
- Modify: `lib/api/types.ts`
- Modify: `lib/api/endpoints.ts`
- Create: `lib/reviews.ts`
- Test: `lib/reviews.test.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { describe, expect, it } from 'vitest';

import type { AppLandingReviewDto } from '@/lib/api/types';
import { adminAppReviewsPath, canOfferPublicConsent, isReviewPromptRoute, landingReviewsFor } from '@/lib/reviews';

function review(id: string, locale: string): AppLandingReviewDto {
    return { id, stars: 5, comment: 'Great', firstName: 'Maria', role: 'HOST', eventType: 'WEDDING', locale };
}

describe('canOfferPublicConsent', () => {
    it('needs four or more stars and a comment', () => {
        expect(canOfferPublicConsent(5, 'Loved it')).toBe(true);
        expect(canOfferPublicConsent(4, 'Loved it')).toBe(true);
        expect(canOfferPublicConsent(3, 'Loved it')).toBe(false);
        expect(canOfferPublicConsent(5, '   ')).toBe(false);
        expect(canOfferPublicConsent(null, 'Loved it')).toBe(false);
    });
});

describe('isReviewPromptRoute', () => {
    it('allows home and an event feed only', () => {
        expect(isReviewPromptRoute('/home')).toBe(true);
        expect(isReviewPromptRoute('/events/abc/feed')).toBe(true);
        expect(isReviewPromptRoute('/events/abc/feed/')).toBe(true);
        expect(isReviewPromptRoute('/events/abc/manage')).toBe(false);
        expect(isReviewPromptRoute('/demo/wedding/feed')).toBe(false);
        expect(isReviewPromptRoute('/profile')).toBe(false);
    });
});

describe('landingReviewsFor', () => {
    it('keeps the page language and needs three', () => {
        const reviews = [review('1', 'en'), review('2', 'en'), review('3', 'el'), review('4', 'en')];
        expect(landingReviewsFor(reviews, 'en').map((r) => r.id)).toEqual(['1', '2', '4']);
        expect(landingReviewsFor(reviews, 'el')).toEqual([]);
        expect(landingReviewsFor(undefined, 'en')).toEqual([]);
    });
});

describe('adminAppReviewsPath', () => {
    it('adds the page and an optional status', () => {
        expect(adminAppReviewsPath(0, null)).toBe('/api/admin/app-reviews?page=0&size=50');
        expect(adminAppReviewsPath(2, 'PENDING')).toBe('/api/admin/app-reviews?page=2&size=50&status=PENDING');
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/reviews.test.ts`
Expected: FAIL — `@/lib/reviews` not found.

- [ ] **Step 3: Add the types**

In `lib/api/types.ts`, after the `AppLandingCategoryDto` interface:

```ts
export type AppReviewRole = 'HOST' | 'GUEST';
export type AppReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN';

// GET /api/me/review-prompt → 200 with this, or 204 (null) when there is nothing to ask.
export interface AppReviewPromptDto {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    role: AppReviewRole;
}

// POST /api/me/reviews. The server drops publicConsent unless stars >= 4 and a comment is sent.
export interface AppReviewRequestDto {
    eventId: string;
    stars: number;
    comment: string | null;
    publicConsent: boolean;
}

// GET/PATCH /api/admin/app-reviews. Ratings only, never dismissals.
export interface AdminAppReviewDto {
    id: string;
    stars: number;
    comment: string | null;
    role: AppReviewRole;
    eventType: EventTypeConvention;
    eventId: string;
    userId: string;
    firstName: string;
    locale: string;
    publicConsent: boolean;
    status: AppReviewStatus;
    featured: boolean;
    createdAt: string;
}

export interface AdminAppReviewPatchDto {
    status?: AppReviewStatus;
    featured?: boolean;
}

// GET /api/config → landingReviews. Featured, newest first; the page keeps its own locale's.
export interface AppLandingReviewDto {
    id: string;
    stars: number;
    comment: string;
    firstName: string;
    role: AppReviewRole;
    eventType: EventTypeConvention;
    locale: string;
}
```

In `AppConfigResponseDto`, after `landingCategories: AppLandingCategoryDto[];`:

```ts
    landingReviews: AppLandingReviewDto[];
```

Then run `npx tsc --noEmit` and add `landingReviews: []` to every typed `AppConfigResponseDto` fixture it flags (start with `hooks/useLandingPricingPlans.test.tsx`; `grep -rln "landingCategories:" --include=*.ts --include=*.tsx app components hooks lib providers`).

- [ ] **Step 4: Add the endpoints**

In `lib/api/endpoints.ts`, inside `me: { ... }` after `newsletter: '/api/me/newsletter',`:

```ts
        reviewPrompt: '/api/me/review-prompt',
        reviews: '/api/me/reviews',
        reviewsDismiss: '/api/me/reviews/dismiss',
```

Inside `admin: { ... }`, after the `landingCategories` block:

```ts
        appReviews: {
            list: '/api/admin/app-reviews',
            byId: (id: string) => `/api/admin/app-reviews/${id}`,
        },
```

- [ ] **Step 5: Write the helpers**

`lib/reviews.ts`:

```ts
import { endpoints } from '@/lib/api/endpoints';
import type { AppLandingReviewDto, AppReviewStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export const REVIEW_STAR_VALUES = [1, 2, 3, 4, 5] as const;
export const REVIEW_COMMENT_MAX = 500;
export const APP_REVIEW_STATUSES: AppReviewStatus[] = ['PENDING', 'APPROVED', 'HIDDEN'];
export const ADMIN_APP_REVIEWS_PAGE_SIZE = 50;

// Mirrors the server: consent only counts for 4–5 stars with a comment.
const CONSENT_MIN_STARS = 4;
// Fewer than this in the page's language and the landing section stays hidden.
export const LANDING_REVIEWS_MIN = 3;

const EVENT_FEED_PATH = /^\/events\/[^/]+\/feed\/?$/;

export function canOfferPublicConsent(stars: number | null, comment: string): boolean {
    return stars !== null && stars >= CONSENT_MIN_STARS && comment.trim().length > 0;
}

// The prompt opens on home and an event's feed only, never over tools, settings or the demo.
export function isReviewPromptRoute(pathname: string): boolean {
    return pathname === routes.home || EVENT_FEED_PATH.test(pathname);
}

export function landingReviewsFor(reviews: AppLandingReviewDto[] | undefined, locale: string): AppLandingReviewDto[] {
    const inLocale = (reviews ?? []).filter((review) => review.locale === locale);
    return inLocale.length >= LANDING_REVIEWS_MIN ? inLocale : [];
}

export function adminAppReviewsPath(page: number, status: AppReviewStatus | null): string {
    const params = new URLSearchParams({ page: String(page), size: String(ADMIN_APP_REVIEWS_PAGE_SIZE) });
    if (status) params.set('status', status);
    return `${endpoints.admin.appReviews.list}?${params.toString()}`;
}
```

- [ ] **Step 6: Run the tests and type check**

Run: `npx vitest run lib/reviews.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/reviews.ts lib/reviews.test.ts
git add -u
git commit -m "Add app review types, endpoints and helpers"
```

---

### Task 2: Prompt data hook

**Files:**
- Create: `hooks/useReviewPrompt.ts`
- Test: `hooks/useReviewPrompt.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reviewKeys, useReviewPrompt } from '@/hooks/useReviewPrompt';
import { endpoints } from '@/lib/api/endpoints';
import type { AppReviewPromptDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

const prompt: AppReviewPromptDto = { eventId: 'e1', eventTitle: 'Our wedding', eventType: 'WEDDING', role: 'HOST' };

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    api.get.mockReset().mockResolvedValue(prompt);
    api.post.mockReset().mockResolvedValue(null);
});

describe('useReviewPrompt', () => {
    it('does not fetch while disabled', () => {
        renderHook(() => useReviewPrompt(false), { wrapper });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('fetches the prompt', async () => {
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await waitFor(() => expect(result.current.prompt).toEqual(prompt));
        expect(api.get).toHaveBeenCalledWith(endpoints.me.reviewPrompt);
    });

    it('treats 204 as nothing to ask', async () => {
        api.get.mockResolvedValue(null);
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        expect(result.current.prompt).toBeNull();
    });

    it('submits a rating', async () => {
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await act(() => result.current.submit.mutateAsync({ eventId: 'e1', stars: 5, comment: 'Great', publicConsent: true }));
        expect(api.post).toHaveBeenCalledWith(endpoints.me.reviews, { eventId: 'e1', stars: 5, comment: 'Great', publicConsent: true });
    });

    it('dismisses and forgets the prompt', async () => {
        const { result } = renderHook(() => useReviewPrompt(true), { wrapper });
        await waitFor(() => expect(result.current.prompt).toEqual(prompt));
        await act(() => result.current.dismiss.mutateAsync('e1'));
        expect(api.post).toHaveBeenCalledWith(endpoints.me.reviewsDismiss, { eventId: 'e1' });
        expect(client.getQueryData(reviewKeys.prompt)).toBeNull();
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run hooks/useReviewPrompt.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AppReviewPromptDto, AppReviewRequestDto } from '@/lib/api/types';

export const reviewKeys = {
    prompt: ['me', 'review-prompt'] as const,
};

// GET /api/me/review-prompt: 204 parses to null. Not prefetched on the server:
// it is an optional overlay, and asking once per session is enough.
export function useReviewPrompt(enabled: boolean) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: reviewKeys.prompt,
        queryFn: () => api.get<AppReviewPromptDto | null>(endpoints.me.reviewPrompt),
        enabled,
        staleTime: Infinity,
        retry: false,
    });

    const forget = useCallback(() => queryClient.setQueryData(reviewKeys.prompt, null), [queryClient]);

    const submit = useMutation({
        retry: false,
        mutationFn: (dto: AppReviewRequestDto) => api.post<null>(endpoints.me.reviews, dto),
    });

    const dismiss = useMutation({
        retry: false,
        mutationFn: (eventId: string) => api.post<null>(endpoints.me.reviewsDismiss, { eventId }),
        // Even a failed dismiss hides the prompt for this session.
        onSettled: forget,
    });

    return { prompt: query.data ?? null, submit, dismiss, forget };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useReviewPrompt.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add hooks/useReviewPrompt.ts hooks/useReviewPrompt.test.tsx
git commit -m "Fetch and answer the app review prompt"
```

---

### Task 3: Copy

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Add the top-level `ReviewPrompt` namespace** (next to `BugReport`) in `en.json`:

```json
"ReviewPrompt": {
    "title": "How was Storywall for {eventTitle}?",
    "rating": "Your rating",
    "star": "{count, plural, one {# star} other {# stars}}",
    "comment": "Comment (optional)",
    "consent": "Can we show this on our website?",
    "send": "Send",
    "notNow": "Not now",
    "close": "Close",
    "sent": "Thanks for your rating."
}
```

and in `el.json`:

```json
"ReviewPrompt": {
    "title": "Πώς σας φάνηκε το Storywall στο {eventTitle};",
    "rating": "Η βαθμολογία σας",
    "star": "{count, plural, one {# αστέρι} other {# αστέρια}}",
    "comment": "Σχόλιο (προαιρετικό)",
    "consent": "Μπορούμε να το δείξουμε στον ιστότοπό μας;",
    "send": "Αποστολή",
    "notNow": "Όχι τώρα",
    "close": "Κλείσιμο",
    "sent": "Ευχαριστούμε για τη βαθμολογία σας."
}
```

- [ ] **Step 2: Add the admin copy.** In `AdminPage.tabs` add `"appReviews": "Reviews"` (el: `"appReviews": "Κριτικές"`). Add `AdminPage.appReviews` in `en.json`:

```json
"appReviews": {
    "title": "Reviews",
    "loading": "Loading reviews",
    "empty": "No reviews yet.",
    "count": "{count, plural, one {# review} other {# reviews}}",
    "open": "Open review",
    "filter": "Status",
    "all": "All",
    "columns": {
        "received": "Received",
        "rating": "Rating",
        "comment": "Comment",
        "role": "Role",
        "occasion": "Occasion",
        "consent": "Can show"
    },
    "stars": "{count} of 5",
    "noComment": "No comment",
    "yes": "Yes",
    "no": "No",
    "onLanding": "On landing",
    "role": { "HOST": "Host", "GUEST": "Guest" },
    "status": { "PENDING": "Pending", "APPROVED": "Approved", "HIDDEN": "Hidden" },
    "statusHint": {
        "PENDING": "Not checked yet.",
        "APPROVED": "Checked. Can go on the landing page if the reviewer agreed.",
        "HIDDEN": "Never shown on the website."
    },
    "detailTitle": "Review",
    "close": "Close",
    "comment": "Comment",
    "statusTitle": "Status",
    "featured": "Show on the landing page",
    "featuredNeeds": "Needs Approved and the reviewer's OK.",
    "reviewer": "Reviewer",
    "language": "Language",
    "reviewId": "Review ID",
    "userId": "User ID",
    "eventId": "Event ID"
}
```

and in `el.json`:

```json
"appReviews": {
    "title": "Κριτικές",
    "loading": "Φόρτωση κριτικών",
    "empty": "Δεν υπάρχουν κριτικές ακόμα.",
    "count": "{count, plural, one {# κριτική} other {# κριτικές}}",
    "open": "Άνοιγμα κριτικής",
    "filter": "Κατάσταση",
    "all": "Όλες",
    "columns": {
        "received": "Λήψη",
        "rating": "Βαθμολογία",
        "comment": "Σχόλιο",
        "role": "Ρόλος",
        "occasion": "Περίσταση",
        "consent": "Δημοσίευση"
    },
    "stars": "{count} από 5",
    "noComment": "Χωρίς σχόλιο",
    "yes": "Ναι",
    "no": "Όχι",
    "onLanding": "Στην αρχική",
    "role": { "HOST": "Διοργανωτής", "GUEST": "Καλεσμένος" },
    "status": { "PENDING": "Σε αναμονή", "APPROVED": "Εγκρίθηκε", "HIDDEN": "Κρυφή" },
    "statusHint": {
        "PENDING": "Δεν έχει ελεγχθεί ακόμα.",
        "APPROVED": "Ελέγχθηκε. Μπορεί να μπει στην αρχική αν το επέτρεψε ο χρήστης.",
        "HIDDEN": "Δεν εμφανίζεται ποτέ στον ιστότοπο."
    },
    "detailTitle": "Κριτική",
    "close": "Κλείσιμο",
    "comment": "Σχόλιο",
    "statusTitle": "Κατάσταση",
    "featured": "Εμφάνιση στην αρχική σελίδα",
    "featuredNeeds": "Χρειάζεται έγκριση και τη συναίνεση του χρήστη.",
    "reviewer": "Χρήστης",
    "language": "Γλώσσα",
    "reviewId": "ID κριτικής",
    "userId": "ID χρήστη",
    "eventId": "ID εκδήλωσης"
}
```

- [ ] **Step 3: Add the landing copy.** In `LandingPage` add `en.json`:

```json
"reviews": {
    "heading": "What people say",
    "stars": "{count} out of 5 stars",
    "role": { "HOST": "Host", "GUEST": "Guest" }
}
```

`el.json`:

```json
"reviews": {
    "heading": "Τι λένε για εμάς",
    "stars": "{count} στα 5 αστέρια",
    "role": { "HOST": "Διοργανωτής", "GUEST": "Καλεσμένος" }
}
```

- [ ] **Step 4: Check both files still parse and match**

Run: `node -e "const a=require('./messages/en.json'),b=require('./messages/el.json');const k=(o,p='')=>Object.entries(o).flatMap(([x,v])=>v&&typeof v==='object'&&!Array.isArray(v)?k(v,p+x+'.'):[p+x]);const A=new Set(k(a)),B=new Set(k(b));console.log([...A].filter(x=>!B.has(x)),[...B].filter(x=>!A.has(x)))"`
Expected: `[] []`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "Add app review copy"
```

---

### Task 4: Review form

**Files:**
- Create: `hooks/useReviewForm.ts`
- Create: `components/review/ReviewStars.tsx`
- Create: `components/review/ReviewForm.tsx`
- Test: `components/review/ReviewForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewForm } from '@/components/review/ReviewForm';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

afterEach(cleanup);

function renderForm(onSubmitAction = vi.fn()) {
    render(<ReviewForm eventTitle="Our wedding" isSending={false} error={null} onSubmitAction={onSubmitAction} onNotNowAction={vi.fn()} />);
    return onSubmitAction;
}

function pickStars(count: number) {
    fireEvent.click(screen.getByRole('radio', { name: `star {"count":${count}}` }));
}

describe('ReviewForm', () => {
    it('cannot be sent without a rating', () => {
        renderForm();
        expect((screen.getByRole('button', { name: 'send' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('asks for consent only at four or more stars with a comment', () => {
        renderForm();
        pickStars(5);
        expect(screen.queryByRole('checkbox', { name: 'consent' })).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: 'comment' }), { target: { value: 'Loved it' } });
        expect(screen.getByRole('checkbox', { name: 'consent' })).toBeTruthy();
        pickStars(3);
        expect(screen.queryByRole('checkbox', { name: 'consent' })).toBeNull();
    });

    it('sends the rating, trimmed comment and consent', () => {
        const onSubmit = renderForm();
        pickStars(4);
        fireEvent.change(screen.getByRole('textbox', { name: 'comment' }), { target: { value: '  Loved it ' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'consent' }));
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        expect(onSubmit).toHaveBeenCalledWith({ stars: 4, comment: 'Loved it', publicConsent: true });
    });

    it('drops consent that no longer applies', () => {
        const onSubmit = renderForm();
        pickStars(5);
        fireEvent.change(screen.getByRole('textbox', { name: 'comment' }), { target: { value: 'Loved it' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'consent' }));
        pickStars(2);
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        expect(onSubmit).toHaveBeenCalledWith({ stars: 2, comment: 'Loved it', publicConsent: false });
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/review/ReviewForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the form hook**

```ts
'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { canOfferPublicConsent } from '@/lib/reviews';

export type ReviewFormValues = { stars: number; comment: string | null; publicConsent: boolean };

export function useReviewForm(onSubmitAction: (values: ReviewFormValues) => void) {
    const [stars, setStars] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [consent, setConsent] = useState(false);
    const showConsent = canOfferPublicConsent(stars, comment);

    const handleCommentChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value), []);
    const handleConsentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setConsent(event.target.checked), []);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (stars === null) return;
            onSubmitAction({ stars, comment: comment.trim() || null, publicConsent: showConsent && consent });
        },
        [comment, consent, onSubmitAction, showConsent, stars],
    );

    return { stars, setStars, comment, consent, showConsent, canSend: stars !== null, handleCommentChange, handleConsentChange, handleSubmit };
}
```

- [ ] **Step 4: Write the stars input**

```tsx
'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { REVIEW_STAR_VALUES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

// Native radios (visually hidden) keep arrow-key and screen-reader support.
export function ReviewStars({ value, onChangeAction }: { value: number | null; onChangeAction: (stars: number) => void }) {
    const t = useTranslations('ReviewPrompt');

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onChangeAction(Number(event.target.value));
    }

    return (
        <fieldset className="flex gap-1">
            <legend className="sr-only">{t('rating')}</legend>
            {REVIEW_STAR_VALUES.map((count) => (
                <label key={count} className="cursor-pointer rounded-full p-1 focus-within:ring-2 focus-within:ring-primary">
                    <input
                        type="radio"
                        name="review-stars"
                        value={count}
                        checked={value === count}
                        onChange={handleChange}
                        aria-label={t('star', { count })}
                        className="sr-only"
                    />
                    <Star
                        aria-hidden
                        className={cn('h-9 w-9 transition-colors', value !== null && count <= value ? 'fill-primary text-primary' : 'text-ink-faint')}
                    />
                </label>
            ))}
        </fieldset>
    );
}
```

- [ ] **Step 5: Write the form**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ReviewStars } from '@/components/review/ReviewStars';
import { Button } from '@/components/ui/button';
import { type ReviewFormValues, useReviewForm } from '@/hooks/useReviewForm';
import { REVIEW_COMMENT_MAX } from '@/lib/reviews';

export function ReviewForm({
    eventTitle,
    isSending,
    error,
    onSubmitAction,
    onNotNowAction,
}: {
    eventTitle: string;
    isSending: boolean;
    error: string | null;
    onSubmitAction: (values: ReviewFormValues) => void;
    onNotNowAction: () => void;
}) {
    const t = useTranslations('ReviewPrompt');
    const form = useReviewForm(onSubmitAction);

    return (
        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit}>
            {/* Header */}
            <h2 className="pr-10 text-lg font-bold text-ink">{t('title', { eventTitle })}</h2>

            {/* Rating */}
            <ReviewStars value={form.stars} onChangeAction={form.setStars} />

            {/* Comment */}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                {t('comment')}
                <textarea
                    value={form.comment}
                    onChange={form.handleCommentChange}
                    maxLength={REVIEW_COMMENT_MAX}
                    rows={3}
                    className="resize-none rounded-2xl bg-surface-muted px-4 py-3 text-sm font-normal text-ink focus-ring"
                />
            </label>

            {/* Consent */}
            {form.showConsent ? (
                <label className="flex items-center gap-3 text-sm text-ink">
                    <input type="checkbox" checked={form.consent} onChange={form.handleConsentChange} className="h-5 w-5 accent-primary" />
                    {t('consent')}
                </label>
            ) : null}

            {/* Error */}
            {error ? <p className="text-sm text-status-danger">{error}</p> : null}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="lg" onClick={onNotNowAction}>
                    {t('notNow')}
                </Button>
                <Button type="submit" size="lg" disabled={!form.canSend || isSending}>
                    {t('send')}
                </Button>
            </div>
        </form>
    );
}
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run components/review/ReviewForm.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add hooks/useReviewForm.ts components/review/ReviewStars.tsx components/review/ReviewForm.tsx components/review/ReviewForm.test.tsx
git commit -m "Add the app review form"
```

---

### Task 5: Sheet and mount

**Files:**
- Create: `hooks/useReviewPromptSheet.ts`
- Create: `components/review/ReviewSent.tsx`
- Create: `components/review/ReviewPromptSheet.tsx`
- Create: `components/review/ReviewPrompt.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Write the sheet hook**

```ts
'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useHasOpenOverlay } from '@/hooks/useOverlayPresence';
import type { ReviewFormValues } from '@/hooks/useReviewForm';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { isReviewPromptRoute } from '@/lib/reviews';

// Opens the sheet once, on home or an event feed, when nothing else is open.
// Once open it stays open: the sheet itself counts as an open overlay.
// Closing before sending is a dismissal; closing after sending just hides it.
export function useReviewPromptSheet() {
    const pathname = usePathname();
    const { user } = useAuth();
    const hasOpenOverlay = useHasOpenOverlay();
    const toErrorMessage = useApiErrorMessage();
    const onPromptSurface = Boolean(user) && user?.role !== 'ADMIN' && isReviewPromptRoute(pathname);
    const { prompt, submit, dismiss, forget } = useReviewPrompt(onPromptSurface);
    const [open, setOpen] = useState(false);
    const [sent, setSent] = useState(false);

    // Adjusting state while rendering (not in an effect) avoids a frame with the sheet missing.
    if (!open && prompt && onPromptSurface && !hasOpenOverlay) {
        setOpen(true);
    }

    // Forget the prompt first, in the same update as closing: otherwise the
    // render-time check above would reopen the sheet while the dismiss is in flight.
    const close = useCallback(() => {
        setOpen(false);
        if (!prompt) return;
        const { eventId } = prompt;
        forget();
        if (!sent) dismiss.mutate(eventId);
    }, [dismiss, forget, prompt, sent]);

    const send = useCallback(
        (values: ReviewFormValues) => {
            if (!prompt) return;
            submit.mutate({ eventId: prompt.eventId, ...values }, { onSuccess: () => setSent(true) });
        },
        [prompt, submit],
    );

    return {
        prompt,
        open,
        sent,
        isSending: submit.isPending,
        error: submit.error ? toErrorMessage(submit.error) : null,
        close,
        send,
    };
}
```

Check `useAuth().user.role` is the `PlatformRole` field (it is used as `user?.role === 'ADMIN'` in `AppShell`) and `useApiErrorMessage` returns `(error) => string` (as in `BugReportsPanel`).

- [ ] **Step 2: Write the sent view**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function ReviewSent({ onCloseAction }: { onCloseAction: () => void }) {
    const t = useTranslations('ReviewPrompt');

    return (
        <div className="flex flex-col gap-5">
            {/* Message */}
            <p className="pr-10 text-lg font-bold text-ink">{t('sent')}</p>

            {/* Actions */}
            <div className="flex justify-end">
                <Button type="button" size="lg" onClick={onCloseAction}>
                    {t('close')}
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Write the sheet shell**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ReviewForm } from '@/components/review/ReviewForm';
import { ReviewSent } from '@/components/review/ReviewSent';
import { Modal } from '@/components/ui/modal';
import type { ReviewFormValues } from '@/hooks/useReviewForm';

export function ReviewPromptSheet({
    open,
    eventTitle,
    sent,
    isSending,
    error,
    onCloseAction,
    onSendAction,
}: {
    open: boolean;
    eventTitle: string;
    sent: boolean;
    isSending: boolean;
    error: string | null;
    onCloseAction: () => void;
    onSendAction: (values: ReviewFormValues) => void;
}) {
    const t = useTranslations('ReviewPrompt');

    return (
        <Modal ariaLabel={t('title', { eventTitle })} closeLabel={t('close')} onClose={onCloseAction} open={open} size="sm" variant="sheet">
            <Modal.Body className="p-5 sm:p-6">
                {/* Content */}
                {sent ? (
                    <ReviewSent onCloseAction={onCloseAction} />
                ) : (
                    <ReviewForm eventTitle={eventTitle} isSending={isSending} error={error} onSubmitAction={onSendAction} onNotNowAction={onCloseAction} />
                )}
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 4: Write the mount point**

```tsx
'use client';

import { ReviewPromptSheet } from '@/components/review/ReviewPromptSheet';
import { useReviewPromptSheet } from '@/hooks/useReviewPromptSheet';

export function ReviewPrompt() {
    const sheet = useReviewPromptSheet();

    if (!sheet.prompt) return null;

    return (
        <ReviewPromptSheet
            open={sheet.open}
            eventTitle={sheet.prompt.eventTitle}
            sent={sheet.sent}
            isSending={sheet.isSending}
            error={sheet.error}
            onCloseAction={sheet.close}
            onSendAction={sheet.send}
        />
    );
}
```

- [ ] **Step 5: Mount it in `AppShell`**

In `components/layout/AppShell.tsx`, import `ReviewPrompt` from `@/components/review/ReviewPrompt` and render it right after `<MobileTabBar />`:

```tsx
            <MobileTabBar />
            {/* Review prompt */}
            <ReviewPrompt />
```

`AppShell` only renders its content for a signed-in user, so the prompt never runs signed out.

- [ ] **Step 6: Type check, lint, run the tests**

Run: `npx tsc --noEmit && npx eslint components/review hooks/useReviewPrompt.ts hooks/useReviewPromptSheet.ts hooks/useReviewForm.ts components/layout/AppShell.tsx && npx vitest run components/review hooks/useReviewPrompt.test.tsx providers/AppProviders.test.tsx`
Expected: no errors; tests PASS. If an `AppShell` test now fails on the new query, mock `@/components/review/ReviewPrompt` there the same way `AppProviders.test.tsx` mocks `BetaFeedback`.

- [ ] **Step 7: Commit**

```bash
git add hooks/useReviewPromptSheet.ts components/review components/layout/AppShell.tsx
git commit -m "Show the app review sheet after an event ends"
```

---

### Task 6: Admin data hooks

**Files:**
- Create: `hooks/useAdminAppReviews.ts`
- Create: `hooks/useAppReviewsPanel.ts`

- [ ] **Step 1: Write the data hooks**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { AdminAppReviewDto, AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';
import { adminAppReviewsPath } from '@/lib/reviews';

export const adminAppReviewKeys = {
    all: ['admin', 'app-reviews'] as const,
    list: (page: number, status: AppReviewStatus | null) => ['admin', 'app-reviews', 'list', page, status] as const,
};

export function useAdminAppReviews(page: number, status: AppReviewStatus | null) {
    return useQuery({
        queryKey: adminAppReviewKeys.list(page, status),
        queryFn: () => api.get<Page<AdminAppReviewDto>>(adminAppReviewsPath(page, status)),
        placeholderData: (previous) => previous,
    });
}

// Featuring changes GET /api/config, so the landing page copy is dropped too.
export function usePatchAppReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: AdminAppReviewPatchDto }) =>
            api.patch<AdminAppReviewDto>(endpoints.admin.appReviews.byId(id), patch),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminAppReviewKeys.all });
            invalidatePublicConfig(queryClient);
        },
    });
}
```

- [ ] **Step 2: Write the panel hook**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useAdminAppReviews, usePatchAppReview } from '@/hooks/useAdminAppReviews';
import type { AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';

export function useAppReviewsPanel() {
    const [page, setPage] = useState(0);
    const [status, setStatusFilter] = useState<AppReviewStatus | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const reviewsQuery = useAdminAppReviews(page, status);
    const patchMutation = usePatchAppReview();

    // The drawer shows the row from the current page, so it updates when the list refetches.
    const selected = reviewsQuery.data?.content.find((review) => review.id === selectedId) ?? null;

    const setStatus = useCallback((next: AppReviewStatus | null) => {
        setStatusFilter(next);
        setPage(0);
    }, []);
    const openReview = useCallback((id: string) => setSelectedId(id), []);
    const closeReview = useCallback(() => setSelectedId(null), []);
    const patchSelected = useCallback(
        (patch: AdminAppReviewPatchDto) => {
            if (selectedId) patchMutation.mutate({ id: selectedId, patch });
        },
        [patchMutation, selectedId],
    );

    return {
        page,
        setPage,
        status,
        setStatus,
        reviewsQuery,
        selected,
        openReview,
        closeReview,
        patchSelected,
        isSaving: patchMutation.isPending,
        patchError: patchMutation.error,
    };
}
```

- [ ] **Step 3: Type check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add hooks/useAdminAppReviews.ts hooks/useAppReviewsPanel.ts
git commit -m "Add admin app review data hooks"
```

---

### Task 7: Admin panel

**Files:**
- Create: `components/admin/appReviews/AppReviewStatusPill.tsx`
- Create: `components/admin/appReviews/AppReviewStatusControl.tsx`
- Create: `components/admin/appReviews/AppReviewsTable.tsx`
- Create: `components/admin/appReviews/AppReviewDrawer.tsx`
- Create: `components/admin/appReviews/AppReviewsPanel.tsx`
- Modify: `components/admin/AdminNavigationContext.tsx`
- Modify: `components/admin/AdminShellNav.tsx`
- Modify: `components/admin/AdminConsole.tsx`

Follow the admin design system in `CLAUDE.md` (slate surfaces, status pills, monospace for ids and dates, drawer for editing, a labeled segmented control instead of switches for status). Before starting, load the `design:design-system` skill as `CLAUDE.md` requires for UI work.

- [ ] **Step 1: Status pill**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { AppReviewStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TONE: Record<AppReviewStatus, string> = {
    PENDING: 'bg-status-warn-wash text-status-warn',
    APPROVED: 'bg-status-success-wash text-status-success',
    HIDDEN: 'bg-status-neutral-wash text-status-neutral',
};

export function AppReviewStatusPill({ status }: { status: AppReviewStatus }) {
    const t = useTranslations('AdminPage.appReviews.status');

    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', TONE[status])}>{t(status)}</span>;
}
```

Check the warn/success wash token names against an existing pill (`components/admin/AccountStatusPill.tsx`) and use the same ones.

- [ ] **Step 2: Status segmented control**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { AppReviewStatus } from '@/lib/api/types';
import { APP_REVIEW_STATUSES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

export function AppReviewStatusControl({
    value,
    disabled,
    onChangeAction,
}: {
    value: AppReviewStatus;
    disabled: boolean;
    onChangeAction: (status: AppReviewStatus) => void;
}) {
    const t = useTranslations('AdminPage.appReviews');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const next = event.currentTarget.dataset.status as AppReviewStatus;
        if (next !== value) onChangeAction(next);
    }

    return (
        <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('statusTitle')}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {APP_REVIEW_STATUSES.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-status={option}
                        onClick={handleClick}
                        disabled={disabled}
                        aria-pressed={value === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed',
                            value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`status.${option}`)}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">{t(`statusHint.${value}`)}</p>
        </div>
    );
}
```

- [ ] **Step 3: Table**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AppReviewStatusPill } from '@/components/admin/appReviews/AppReviewStatusPill';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { AdminAppReviewDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function AppReviewsTable({ reviews, onOpenAction }: { reviews: AdminAppReviewDto[]; onOpenAction: (id: string) => void }) {
    const t = useTranslations('AdminPage.appReviews');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.reviewId;
        if (id) onOpenAction(id);
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-5 py-3 font-bold">{t('columns.received')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.rating')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.comment')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.role')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.occasion')}</th>
                        <th className="px-3 py-3 font-bold">{t('columns.consent')}</th>
                        <th className="px-5 py-3 font-bold">{t('statusTitle')}</th>
                    </tr>
                </thead>
                <tbody>
                    {reviews.map((review) => (
                        <tr key={review.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                            <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">{formatDate(locale, review.createdAt, DATE_FORMAT)}</td>
                            <td className="px-3 py-3.5 font-mono text-xs whitespace-nowrap text-ink">{t('stars', { count: review.stars })}</td>
                            <td className="px-3 py-3.5">
                                <button
                                    type="button"
                                    data-review-id={review.id}
                                    onClick={handleOpen}
                                    aria-label={t('open')}
                                    className="block max-w-md truncate text-left font-semibold text-ink hover:underline"
                                >
                                    {review.comment ?? t('noComment')}
                                </button>
                            </td>
                            <td className="px-3 py-3.5">
                                <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                    {t(`role.${review.role}`)}
                                </span>
                            </td>
                            <td className="px-3 py-3.5 text-ink-muted">{eventTypeCopy(review.eventType).name}</td>
                            <td className="px-3 py-3.5 text-ink-muted">{review.publicConsent ? t('yes') : t('no')}</td>
                            <td className="px-5 py-3.5">
                                <div className="flex flex-wrap gap-1.5">
                                    <AppReviewStatusPill status={review.status} />
                                    {review.featured ? (
                                        <span className="inline-flex rounded-full bg-status-success-wash px-2.5 py-1 text-[11px] font-bold text-status-success">
                                            {t('onLanding')}
                                        </span>
                                    ) : null}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 4: Drawer**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { AppReviewStatusControl } from '@/components/admin/appReviews/AppReviewStatusControl';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { AdminAppReviewDto, AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function AppReviewDrawer({
    review,
    isSaving,
    error,
    onPatchAction,
    onCloseAction,
}: {
    review: AdminAppReviewDto;
    isSaving: boolean;
    error: unknown;
    onPatchAction: (patch: AdminAppReviewPatchDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.appReviews');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const canFeature = review.status === 'APPROVED' && review.publicConsent;

    function handleStatus(status: AppReviewStatus) {
        onPatchAction({ status });
    }

    function handleFeatured(featured: boolean) {
        onPatchAction({ featured });
    }

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={t('detailTitle')}
            subtitle={formatDate(locale, review.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
        >
            <div className="space-y-7">
                {/* Review */}
                <section className="space-y-2">
                    <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('comment')}</h3>
                    <p className="font-mono text-xs text-ink-muted">{t('stars', { count: review.stars })}</p>
                    <p className="text-sm leading-6 break-words whitespace-pre-wrap text-ink">{review.comment ?? t('noComment')}</p>
                    <p className="text-sm text-ink-muted">
                        {review.firstName} · {t(`role.${review.role}`)}
                    </p>
                </section>

                {/* Status */}
                <AppReviewStatusControl value={review.status} disabled={isSaving} onChangeAction={handleStatus} />

                {/* Landing */}
                <section className="overflow-hidden rounded-lg border border-border">
                    <AdminSwitch
                        label={t('featured')}
                        description={canFeature ? undefined : t('featuredNeeds')}
                        checked={review.featured}
                        disabled={isSaving || (!canFeature && !review.featured)}
                        onCheckedChangeAction={handleFeatured}
                    />
                </section>

                {/* Error */}
                {error ? <p className="text-sm text-status-danger">{toErrorMessage(error)}</p> : null}

                {/* Identifiers */}
                <section className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <AdminIdentifier label={t('reviewId')} value={review.id} />
                    <AdminIdentifier label={t('userId')} value={review.userId} />
                    <AdminIdentifier label={t('eventId')} value={review.eventId} />
                    <AdminIdentifier label={t('language')} value={review.locale} />
                </section>
            </div>
        </AdminDrawer>
    );
}
```

Check `AdminIdentifier`'s props are `{ label, value }` (as used in `BugReportDrawer`) and `useApiErrorMessage`'s parameter type; widen `error` to that type if needed.

- [ ] **Step 5: Panel**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { AppReviewDrawer } from '@/components/admin/appReviews/AppReviewDrawer';
import { AppReviewsTable } from '@/components/admin/appReviews/AppReviewsTable';
import { AdminPagination } from '@/components/admin/betaFeedback/AdminPagination';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppReviewsPanel } from '@/hooks/useAppReviewsPanel';
import type { AppReviewStatus } from '@/lib/api/types';
import { APP_REVIEW_STATUSES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

const FILTERS: (AppReviewStatus | null)[] = [null, ...APP_REVIEW_STATUSES];

export function AppReviewsPanel() {
    const t = useTranslations('AdminPage.appReviews');
    const panel = useAppReviewsPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.reviewsQuery.data;

    function handleFilter(event: MouseEvent<HTMLButtonElement>) {
        panel.setStatus((event.currentTarget.dataset.status || null) as AppReviewStatus | null);
    }

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Filter */}
            <div role="group" aria-label={t('filter')} className="flex w-fit gap-1 rounded-lg bg-canvas p-1">
                {FILTERS.map((option) => (
                    <button
                        key={option ?? 'all'}
                        type="button"
                        data-status={option ?? ''}
                        onClick={handleFilter}
                        aria-pressed={panel.status === option}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-[12.5px] font-bold transition-colors',
                            panel.status === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {option ? t(`status.${option}`) : t('all')}
                    </button>
                ))}
            </div>

            {/* Review list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {panel.reviewsQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.reviewsQuery.error ? (
                    <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.reviewsQuery.error)}</p>
                ) : null}
                {data && data.content.length === 0 ? <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('empty')}</p> : null}
                {data && data.content.length > 0 ? (
                    <>
                        <AppReviewsTable reviews={data.content} onOpenAction={panel.openReview} />
                        <AdminPagination
                            pageInfo={data.page}
                            page={panel.page}
                            summary={t('count', { count: data.page.totalElements })}
                            onPageChangeAction={panel.setPage}
                        />
                    </>
                ) : null}
            </section>

            {/* Review detail */}
            {panel.selected ? (
                <AppReviewDrawer
                    key={panel.selected.id}
                    review={panel.selected}
                    isSaving={panel.isSaving}
                    error={panel.patchError}
                    onPatchAction={panel.patchSelected}
                    onCloseAction={panel.closeReview}
                />
            ) : null}
        </section>
    );
}
```

- [ ] **Step 6: Register the tab**

`components/admin/AdminNavigationContext.tsx`:
- add `| 'appReviews'` to the `AdminTab` union (after `'errorEvents'`);
- add `'#reviews': 'appReviews',` to `HASH_TO_TAB` and `appReviews: '#reviews',` to `TAB_TO_HASH`;
- import `Star` from `lucide-react` and add `{ key: 'appReviews', label: t('appReviews'), icon: Star },` to the tabs list right after `discountCodes`.

`components/admin/AdminShellNav.tsx`: add `appReviews: 'marketing',` to `TAB_GROUP`.

`components/admin/AdminConsole.tsx`: import `AppReviewsPanel` and add, before the `bugReports` branch:

```tsx
    if (tab === 'appReviews') {
        return (
            <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                <AppReviewsPanel />
            </div>
        );
    }
```

- [ ] **Step 7: Type check, lint, admin nav tests**

Run: `npx tsc --noEmit && npx eslint components/admin hooks/useAdminAppReviews.ts hooks/useAppReviewsPanel.ts && npx vitest run components/admin`
Expected: no errors; tests PASS (update any test that snapshots the full tab list).

- [ ] **Step 8: Commit**

```bash
git add components/admin hooks/useAdminAppReviews.ts hooks/useAppReviewsPanel.ts
git commit -m "Add the admin Reviews panel"
```

---

### Task 8: Landing section

**Files:**
- Create: `components/landing/LandingReviews.tsx`
- Test: `components/landing/LandingReviews.test.tsx`
- Modify: `components/landing/LandingContent.tsx`
- Modify: `lib/landingTracking.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingReviews } from '@/components/landing/LandingReviews';
import type { AppLandingReviewDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

const config = vi.hoisted(() => ({ landingReviews: [] as AppLandingReviewDto[] }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: config }) }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding' }) }));

function review(id: string, locale = 'en'): AppLandingReviewDto {
    return { id, stars: 5, comment: `Comment ${id}`, firstName: 'Maria', role: 'HOST', eventType: 'WEDDING', locale };
}

afterEach(cleanup);
beforeEach(() => {
    config.landingReviews = [];
});

describe('LandingReviews', () => {
    it('renders nothing under three reviews in the page language', () => {
        config.landingReviews = [review('1'), review('2'), review('3', 'el')];
        const { container } = render(<LandingReviews />);
        expect(container.innerHTML).toBe('');
    });

    it('shows the reviews with name, role and occasion', () => {
        config.landingReviews = [review('1'), review('2'), review('3')];
        render(<LandingReviews />);
        expect(screen.getByRole('heading', { name: 'heading' })).toBeTruthy();
        expect(screen.getByText('Comment 1')).toBeTruthy();
        expect(screen.getAllByText('Maria · role.HOST · Wedding')).toHaveLength(3);
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/landing/LandingReviews.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the section to tracking**

In `lib/landingTracking.ts`, add `'reviews'` to the `LandingSection` union after `'feature_details'`.

- [ ] **Step 4: Write the section**

```tsx
'use client';

import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { landingReviewsFor, REVIEW_STAR_VALUES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

// Featured reviews from GET /api/config (prefetched by LandingPage). No review
// structured data: Google gives no rich results for reviews a site shows about itself.
export function LandingReviews() {
    const t = useTranslations('LandingPage.reviews');
    const locale = useLocale();
    const { data: config } = useAppConfig();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const reviews = landingReviewsFor(config?.landingReviews, locale);

    if (reviews.length === 0) return null;

    return (
        /* Reviews */
        <section
            className="relative block bg-white px-5 pt-12 pb-14.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-16 min-[761px]:pb-18"
            id="reviews"
            {...landingSectionAttributes('reviews')}
        >
            {/* Heading */}
            <h2 className="mx-auto mb-7.5 w-full max-w-295 [font-family:var(--editorial)] text-[56px] leading-[0.85] font-normal tracking-[-0.06em] min-[761px]:text-[clamp(56px,5.5vw,88px)]">
                {t('heading')}
            </h2>

            {/* List */}
            <ul className="mx-auto grid w-full max-w-295 grid-cols-1 gap-x-10 gap-y-8 border-t border-[rgb(21_19_19/26%)] pt-8 min-[761px]:grid-cols-3">
                {reviews.map((review) => (
                    <li key={review.id} className="flex flex-col gap-3">
                        <p className="flex gap-0.5" aria-label={t('stars', { count: review.stars })} role="img">
                            {REVIEW_STAR_VALUES.map((count) => (
                                <Star
                                    key={count}
                                    aria-hidden
                                    className={cn('h-4 w-4', count <= review.stars ? 'fill-[#151313] text-[#151313]' : 'text-[rgb(21_19_19/30%)]')}
                                />
                            ))}
                        </p>
                        <blockquote className="m-0 text-[17px] leading-[1.45]">{review.comment}</blockquote>
                        <p className="text-[13px] text-[rgb(21_19_19/70%)]">
                            {review.firstName} · {t(`role.${review.role}`)} · {eventTypeCopy(review.eventType).name}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
```

- [ ] **Step 5: Place it**

In `components/landing/LandingContent.tsx`, import `LandingReviews` and render it inside the first `landing-page` div, after `<LandingFeatureDetails />`:

```tsx
                    {/* Feature details */}
                    <LandingFeatureDetails />

                    {/* Reviews */}
                    <LandingReviews />
```

- [ ] **Step 6: Run the test, type check, lint**

Run: `npx vitest run components/landing && npx tsc --noEmit && npx eslint components/landing lib/landingTracking.ts`
Expected: PASS, no errors.

- [ ] **Step 7: SEO check**

Read `docs/seo-guidelines.md` and check the landing change against it (one `h2` per section, no new structured data, no layout shift: the section renders on the server from the prefetched config, so it is there on first paint). List any broken rule as a **BLOCKER** in the PR description.

- [ ] **Step 8: Commit**

```bash
git add components/landing/LandingReviews.tsx components/landing/LandingReviews.test.tsx components/landing/LandingContent.tsx lib/landingTracking.ts
git commit -m "Show featured reviews on the landing page"
```

---

### Task 9: Full checks and visual confirmation

- [ ] **Step 1: Whole-project checks**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all clean. Fix every lint error before moving on.

- [ ] **Step 2: Run locally against the backend branch**

Use the dev server on `:3000` (the local backend only allows CORS from `:3000`); open it with `preview_start {url: "http://localhost:3000/"}`, never by name. Ask the user for the local test login.

- [ ] **Step 3: Check the prompt** — as a user with an event that ended over 12h ago: open `/home` on a 375px viewport → sheet appears; pick 5 stars, type a comment → consent checkbox appears; send → thanks; close; reload → no sheet. Check a 1280px viewport for cramped layout. Check that opening the composer first keeps the sheet away until it closes.

- [ ] **Step 4: Check the admin panel** (desktop first) — `/admin#reviews`: row shows; open drawer; Approved → "Show on the landing page" enables; switch on → pill "On landing". Check a narrow viewport for obvious breakage.

- [ ] **Step 5: Check the landing page** — with 3 featured reviews in one language, the section shows on that language's landing page only; with fewer, it is gone.

- [ ] **Step 6: Open the PR into `staging`** with the SEO check result in the description.
