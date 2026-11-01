# My business page — web app (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/business` ("My business" / "Η επιχείρησή μου"), one page across all of a vendor's events, plus its entry points (account drawer, profile, per-event page), the `/partner` redirect, and the admin console's Vendor messages inbox.

**Architecture:** A server `page.tsx` prefetches the overview, the first events page and (partners) the partner page data, then hydrates a thin client screen. Each section is a small component under `components/business/`, fed by hooks in `hooks/`. The per-event page's Print prices section moves here; everything else on the per-event page stays.

**Tech Stack:** Next.js App Router, React, TanStack Query, next-intl, Tailwind, recharts, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-01-my-business-page-design.md`.
**Backend:** `docs/superpowers/plans/2026-11-01-my-business-backend.md` must be merged into guestwall-be `staging` first (endpoints and payloads below come from it).

**Rules this plan follows (CLAUDE.md):** thin `page.tsx`/screen; logic in hooks and `lib/`; a JSX comment above every section; all copy localized (en + el); no fact twice on one page; server prefetch + hydrate; destructive or editing flows in sheets; real alt text on every image.

---

## Decisions this plan locks in

- Route `routes.business = '/business'`. `routes.partner` is removed; `/partner` permanently redirects to `/business`.
- Section order (spec): top card → insights → your events → your content → print prices → how guests see you → contact. From `lg`, the top card spans both columns; insights/events/content sit in the main column; print prices/previews/contact in the side column. (Inquiries arrive in phase 2.)
- Non-partners: insights shows Events, Guests, Profile taps, then one row with **Become a partner** (opens the existing `BecomePartnerSheet`). Partners: six counts and the monthly chart.
- Feed card preview: partners with `cardPreview` only. The card is drawn with the real `PartnerCardVariant` and no link.
- Sneak peek sample: types with a Pro album (`content` present). Static, built from the vendor's logo and name with placeholder tiles (no `<img>`, so no alt text needed for the tiles; the logo uses `VendorLogo`, which has alt text).
- Print prices: `ServicesSection` and `ServiceSheet` move here, unchanged, for photographers (`vendorType === 'PHOTOGRAPHER'`). The per-event page keeps only its "prints included" row, inside a small section that links here.
- Account drawer and profile show **My business** when `me.vendor || me.partner`.
- The admin inbox is admin-only (not marketing), under Operations, with a NEW count badge.

## File structure

| File | Responsibility |
|---|---|
| `lib/api/types.ts` (modify) | business, contact and admin DTOs; `vendor` on `UserResponseDto`; `cardPreview` on `PartnerPortalResponseDto` |
| `lib/api/endpoints.ts` (modify) | `me.business*`, `admin.vendorMessages*` |
| `lib/api/errors.ts` (modify) | `NOT_A_VENDOR: 4039` |
| `lib/routes.ts` (modify) | `business`, remove `partner` |
| `lib/business.ts` (create) + test | month labels, which sections show, metric lists |
| `hooks/useBusinessOverview.ts` (create) | overview query + keys |
| `hooks/useBusinessEvents.ts` (create) | infinite events query + keys + page size |
| `hooks/useBusinessContact.ts` (create) + test | contact sheet state and send |
| `hooks/useBusinessPage.ts` (create) | composes the page's data for the screen |
| `hooks/useVendorServicesSection.ts` (modify) | accept `{ vendorType, approvedPartner }` instead of `VendorMeDto` |
| `app/(main)/(app)/business/page.tsx`, `loading.tsx` (create) | prefetch + hydrate, skeleton |
| `app/(main)/(app)/partner/page.tsx` (modify), `loading.tsx` (delete) | redirect |
| `components/business/*` (create) | screen and sections (listed per task) |
| `components/partners/*` (modify/delete) | keep `PartnerTierProgress`, extract `PartnerBalances`; delete the rest |
| `components/vendors/me/VendorMeSection.tsx` (modify) | optional `icon` |
| `components/vendors/me/VendorMeScreen.tsx` (modify) | print prices → link section |
| `components/vendors/me/PrintPricesLinkSection.tsx` (create) | the per-event page's link to `/business` |
| `components/profile/ProfileBusinessLink.tsx` (create) | replaces `ProfileVendorSection` + `ProfilePartnerSection` |
| `components/account/AccountSidebarContent.tsx` (modify) | drawer entry |
| `components/admin/vendorMessages/*`, `hooks/useAdminVendorMessages.ts`, `hooks/useVendorMessagesPanel.ts` (create) | admin inbox |
| `components/admin/AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx` (modify) | register the tab |
| `components/admin/collaborations/CollaboratorPortalLink.tsx` (modify) | link to `/business` |
| `app/robots.ts` (modify) | `/business` private |
| `messages/en.json`, `messages/el.json` (modify) | copy |

---

### Task 0: Branch and setup

- [ ] **Step 1: Branch from the latest staging** (this worktree already holds the spec and plans on `claude/vendor-page-redesign-1fb056`)

```bash
git fetch origin staging
git rebase origin/staging
```

- [ ] **Step 2: node_modules** — if missing, link the main checkout's (lockfiles must match):

```bash
git diff --quiet origin/staging -- package-lock.json && cmd //c mklink /J node_modules ..\\..\\..\\node_modules
```

- [ ] **Step 3: Baseline**

Run: `npx tsc --noEmit && npx vitest run components/partners components/profile components/vendors/me`
Expected: PASS. Note any pre-existing failure before changing anything.

---

### Task 1: Types, endpoints, error code, route

**Files:** `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/routes.ts`

- [ ] **Step 1: Types** — in `UserResponseDto`, after `partner?`:

```ts
    // The account opens the business page (a vendor profile, or a vendor in an event). Null off /api/me.
    vendor?: boolean | null;
```

In `PartnerPortalResponseDto`, after `reach`:

```ts
    // The partner's feed card for the preview on their business page; null while branding is off. No link, no placement.
    cardPreview: PartnerBrandingDto | null;
```

Change `PartnerBrandingDto.linkUrl` and `.placement` to nullable if they aren't (`linkUrl: string | null; placement: … | null`), and fix any caller TypeScript flags (`partnerBrandingHref` is only called for live cards; guard with `linkUrl ? … : null`).

Add after `PartnerTierProgressDto`:

```ts
// GET /api/me/business (spec 2026-11-01). Every vendor gets events, guests and listTaps; the other totals and trend
// come only for partners. content is absent for types without a Pro album. 403 4039 when the account is not a vendor.
export interface BusinessOverviewDto {
    partner: boolean;
    vendorType: PartnerRole | null;
    totals: {
        events: number;
        guests: number;
        listTaps: number;
        proViews?: number;
        postViewers?: number;
        cardTaps?: number;
    };
    // Six months, oldest first; month is YYYY-MM in Athens time.
    trend?: { month: string; views: number }[];
    content?: { proItems: number; sneakPeeks: number; proUsedBytes: number };
}
// GET /api/me/business/events, newest first. views only for partners; open is false once access ended.
export interface BusinessEventDto {
    eventId: string;
    title: string;
    startAt: string;
    vendorType: PartnerRole;
    guests: number;
    views?: number;
    open: boolean;
}
export type VendorContactTopic = 'QUESTION' | 'PROBLEM' | 'PARTNERSHIP' | 'OTHER';
export type VendorContactStatus = 'NEW' | 'ANSWERED';
// POST /api/me/business/messages. At most 2,000 characters; 5 a day.
export interface VendorContactRequestDto {
    topic: VendorContactTopic;
    message: string;
}
export interface VendorContactCreatedDto {
    id: string;
    createdAt: string;
}
// GET /api/admin/vendor-messages. userId is absent once the account is deleted.
export interface VendorContactMessageDto {
    id: string;
    userId?: string;
    businessName?: string;
    replyEmail: string;
    topic: VendorContactTopic;
    message: string;
    status: VendorContactStatus;
    createdAt: string;
    answeredAt?: string;
}
```

- [ ] **Step 2: Endpoints** — in `me`, after `vendorService`:

```ts
        business: '/api/me/business',
        businessEvents: (page: number, size: number) => `/api/me/business/events?page=${page}&size=${size}`,
        businessMessages: '/api/me/business/messages',
```

In `admin` (next to the other admin groups):

```ts
        vendorMessages: {
            list: ({ status, page, size }: { status: VendorContactStatus | null; page: number; size: number }) =>
                `/api/admin/vendor-messages?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page), size: String(size) })}`,
            byId: (id: string) => `/api/admin/vendor-messages/${id}`,
        },
```

(import `VendorContactStatus` type from `@/lib/api/types`).

- [ ] **Step 3: Error code** — in `ERROR_CODES` in `lib/api/errors.ts`, next to `PARTNER_NOT_LINKED`:

```ts
    NOT_A_VENDOR: 4039,
```

- [ ] **Step 4: Route** — in `lib/routes.ts` replace `partner: '/partner',` with:

```ts
    // The vendor's page across their events (spec 2026-11-01). /partner redirects here.
    business: '/business',
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only where `routes.partner` is used (`ProfilePartnerSection.tsx`, `CollaboratorPortalLink.tsx`, `PartnerPortalFrame.tsx`) and possibly `linkUrl` callers. Change `CollaboratorPortalLink` to `routes.business` now; the others are deleted or replaced in Tasks 9–10. Leave them failing until then, or temporarily point them at `routes.business`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(business): types, endpoints and route for the business page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `lib/business.ts`

**Files:** Create `lib/business.ts`, `lib/business.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { businessInsightKeys, businessSections, monthLabel } from '@/lib/business';
import type { BusinessOverviewDto } from '@/lib/api/types';

const base: BusinessOverviewDto = { partner: false, vendorType: 'MUSIC', totals: { events: 2, guests: 40, listTaps: 3 } };

describe('businessInsightKeys', () => {
    it('gives a vendor three counts', () => {
        expect(businessInsightKeys(base)).toEqual(['events', 'guests', 'listTaps']);
    });

    it('gives a partner six', () => {
        const partner = { ...base, partner: true, totals: { ...base.totals, proViews: 5, postViewers: 2, cardTaps: 1 } };
        expect(businessInsightKeys(partner)).toEqual(['events', 'guests', 'proViews', 'postViewers', 'cardTaps', 'listTaps']);
    });
});

describe('businessSections', () => {
    it('shows content and the sneak peek sample only with a Pro album', () => {
        expect(businessSections(base, null)).toMatchObject({ content: false, sneakPeekSample: false, printPrices: false });
        const photo = { ...base, vendorType: 'PHOTOGRAPHER' as const, content: { proItems: 1, sneakPeeks: 0, proUsedBytes: 10 } };
        expect(businessSections(photo, null)).toMatchObject({ content: true, sneakPeekSample: true, printPrices: true });
    });

    it('shows the feed card only when the partner has one', () => {
        expect(businessSections({ ...base, partner: true }, null).feedCard).toBe(false);
        expect(businessSections({ ...base, partner: true }, { variant: 'FEATURE_CARD' } as never).feedCard).toBe(true);
    });

    it('hides the previews section when it would be empty', () => {
        expect(businessSections(base, null).previews).toBe(false);
    });
});

describe('monthLabel', () => {
    it('formats YYYY-MM as a short month', () => {
        expect(monthLabel('en', '2026-10')).toBe('Oct');
        expect(monthLabel('el', '2026-10')).toMatch(/^Οκτ/);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/business.test.ts`
Expected: FAIL — cannot find module `@/lib/business`.

- [ ] **Step 3: Implement**

```ts
import type { BusinessOverviewDto, PartnerBrandingDto } from '@/lib/api/types';

export type BusinessInsightKey = 'events' | 'guests' | 'proViews' | 'postViewers' | 'cardTaps' | 'listTaps';

// The counts the insights strip shows, in order. Partners get the views and card taps too.
export function businessInsightKeys(overview: BusinessOverviewDto): BusinessInsightKey[] {
    if (!overview.partner) return ['events', 'guests', 'listTaps'];
    return ['events', 'guests', 'proViews', 'postViewers', 'cardTaps', 'listTaps'];
}

// Which optional sections the page shows. A section with nothing to show is left out, not drawn empty.
export function businessSections(overview: BusinessOverviewDto, cardPreview: PartnerBrandingDto | null) {
    const content = Boolean(overview.content);
    const feedCard = overview.partner && cardPreview !== null;
    return {
        content,
        printPrices: overview.vendorType === 'PHOTOGRAPHER',
        feedCard,
        sneakPeekSample: content,
        previews: feedCard || content,
    };
}

// "2026-10" → "Oct" / "Οκτ". The month is a calendar month, so UTC keeps it from shifting.
export function monthLabel(locale: string, month: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/business.test.ts`
Expected: PASS. If the Greek short month comes out with a trailing period, the regex still matches.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(business): section and insight rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Data hooks

**Files:** Create `hooks/useBusinessOverview.ts`, `hooks/useBusinessEvents.ts`, `hooks/useBusinessContact.ts`, `hooks/useBusinessContact.test.tsx`; modify `hooks/useVendorServicesSection.ts`

- [ ] **Step 1: Overview hook**

```ts
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BusinessOverviewDto } from '@/lib/api/types';

export const businessKeys = {
    all: ['business'] as const,
    overview: ['business', 'overview'] as const,
    events: ['business', 'events'] as const,
};

// The business page's totals. A 403 (not a vendor) is an answer, not a blip, so it is not retried.
export function useBusinessOverview(enabled = true) {
    return useQuery({
        queryKey: businessKeys.overview,
        queryFn: () => api.get<BusinessOverviewDto>(endpoints.me.business),
        enabled,
        retry: false,
    });
}
```

- [ ] **Step 2: Events hook**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';

import { businessKeys } from '@/hooks/useBusinessOverview';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { BusinessEventDto } from '@/lib/api/types';

export const BUSINESS_EVENTS_PAGE_SIZE = 10;

// The vendor's events, newest first, ten at a time.
export function useBusinessEvents(enabled = true) {
    const query = useInfiniteQuery({
        queryKey: businessKeys.events,
        queryFn: ({ pageParam }) => api.get<Page<BusinessEventDto>>(endpoints.me.businessEvents(pageParam, BUSINESS_EVENTS_PAGE_SIZE)),
        initialPageParam: 0,
        getNextPageParam: (last) => (last.page.number + 1 < last.page.totalPages ? last.page.number + 1 : undefined),
        enabled,
        retry: false,
    });
    const events = query.data?.pages.flatMap((page) => page.content) ?? [];

    return {
        events,
        isLoading: query.isLoading,
        // Only a read with nothing to show counts as failed.
        loadFailed: Boolean(query.error) && events.length === 0,
        hasMore: Boolean(query.hasNextPage),
        isLoadingMore: query.isFetchingNextPage,
        loadMore: () => void query.fetchNextPage(),
        retry: () => void query.refetch(),
    };
}
```

- [ ] **Step 3: Write the failing contact hook test** (`hooks/useBusinessContact.test.tsx`)

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useBusinessContact } from '@/hooks/useBusinessContact';
import messages from '@/messages/en.json';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post },
}));

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

describe('useBusinessContact', () => {
    it('asks for a topic and a message before sending', async () => {
        const { result } = renderHook(() => useBusinessContact(), { wrapper });
        act(() => result.current.openSheet());
        await act(() => result.current.submit());

        expect(post).not.toHaveBeenCalled();
        expect(result.current.topicError).toBe('Pick a topic.');
        expect(result.current.messageError).toBe('Write a message.');
    });

    it('sends the trimmed message and shows it was sent', async () => {
        post.mockResolvedValue({ id: 'm1', createdAt: '2026-11-01T10:00:00Z' });
        const { result } = renderHook(() => useBusinessContact(), { wrapper });
        act(() => {
            result.current.openSheet();
            result.current.setTopic('PROBLEM');
            result.current.setMessage('  Upload stops  ');
        });
        await act(() => result.current.submit());

        expect(post).toHaveBeenCalledWith('/api/me/business/messages', { topic: 'PROBLEM', message: 'Upload stops' });
        expect(result.current.sent).toBe(true);
    });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npx vitest run hooks/useBusinessContact.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the contact hook**

```ts
'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorContactCreatedDto, VendorContactRequestDto, VendorContactTopic } from '@/lib/api/types';

export const VENDOR_CONTACT_MESSAGE_MAX = 2000;

// The "Write to us" sheet: its fields, their errors, and the send.
export function useBusinessContact() {
    const t = useTranslations('BusinessPage.contact');
    const toErrorMessage = useApiErrorMessage();
    const [open, setOpen] = useState(false);
    const [topic, setTopic] = useState<VendorContactTopic | null>(null);
    const [message, setMessage] = useState('');
    const [topicError, setTopicError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const send = useMutation({
        mutationFn: (body: VendorContactRequestDto) => api.post<VendorContactCreatedDto>(endpoints.me.businessMessages, body),
    });

    const openSheet = useCallback(() => {
        setTopic(null);
        setMessage('');
        setTopicError(null);
        setMessageError(null);
        setSendError(null);
        setSent(false);
        setOpen(true);
    }, []);
    const closeSheet = useCallback(() => setOpen(false), []);

    const chooseTopic = useCallback((next: VendorContactTopic) => {
        setTopic(next);
        setTopicError(null);
    }, []);
    const changeMessage = useCallback((next: string) => {
        setMessage(next);
        setMessageError(null);
    }, []);

    const submit = useCallback(async () => {
        const text = message.trim();
        setTopicError(topic ? null : t('topicRequired'));
        setMessageError(text ? null : t('messageRequired'));
        if (!topic || !text) return;
        setSendError(null);
        try {
            await send.mutateAsync({ topic, message: text });
            setSent(true);
        } catch (error) {
            setSendError(toErrorMessage(error));
        }
    }, [message, send, t, toErrorMessage, topic]);

    return {
        open,
        openSheet,
        closeSheet,
        topic,
        setTopic: chooseTopic,
        message,
        setMessage: changeMessage,
        topicError,
        messageError,
        sendError,
        sent,
        isSending: send.isPending,
        submit,
    };
}
```

The test needs the `BusinessPage.contact` copy from Task 11; add those two keys (`topicRequired`, `messageRequired`) to `messages/en.json` now if Task 11 hasn't run.

- [ ] **Step 6: Run the test**

Run: `npx vitest run hooks/useBusinessContact.test.tsx`
Expected: PASS.

- [ ] **Step 7: Widen `useVendorServicesSection`** — change the first parameter only:

```ts
// The Services section: print sizes for approved-partner photographers, one line for other photographers.
// Takes the event's vendor row on the event page, or the business overview's type and partner flag on /business.
export function useVendorServicesSection(
    me: { vendorType: PartnerRole | null; approvedPartner: boolean } | null,
    profileStatus: ProfileStatus,
) {
```

(import `PartnerRole`; drop the now-unused `VendorMeDto` import). `VendorMeDto` still fits structurally.

- [ ] **Step 8: Type-check and run the services tests**

Run: `npx tsc --noEmit && npx vitest run components/vendors/me/ServicesSection.test.tsx`
Expected: PASS (ignoring the `routes.partner` errors from Task 1 if still open).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(business): overview, events and contact hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Page hook

**Files:** Create `hooks/useBusinessPage.ts`

- [ ] **Step 1: Implement**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useBecomePartner } from '@/hooks/useBecomePartner';
import { useBusinessContact } from '@/hooks/useBusinessContact';
import { useBusinessEvents } from '@/hooks/useBusinessEvents';
import { useBusinessOverview } from '@/hooks/useBusinessOverview';
import { usePartnerPortal } from '@/hooks/usePartnerPortal';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useVendorServicesSection } from '@/hooks/useVendorServicesSection';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { businessSections } from '@/lib/business';
import { partnerBalances } from '@/lib/partnerPortal';
import { vendorProfileStatus } from '@/lib/vendors';

// Everything the business page shows, as plain values and actions. The partner data is read only for partners.
export function useBusinessPage() {
    const overview = useBusinessOverview();
    const partner = Boolean(overview.data?.partner);
    const portal = usePartnerPortal(partner);
    const events = useBusinessEvents(Boolean(overview.data));
    const profileQuery = useVendorProfile();
    const profileStatus = vendorProfileStatus(profileQuery);
    const services = useVendorServicesSection(
        overview.data ? { vendorType: overview.data.vendorType, approvedPartner: partner } : null,
        profileStatus,
    );
    const contact = useBusinessContact();
    const becomePartner = useBecomePartner();
    const [profileOpen, setProfileOpen] = useState(false);
    const openProfile = useCallback(() => setProfileOpen(true), []);
    const closeProfile = useCallback(() => setProfileOpen(false), []);

    const notVendor = getErrorCode(overview.error) === ERROR_CODES.NOT_A_VENDOR;
    const cardPreview = portal.data?.cardPreview ?? null;
    const retry = useCallback(() => void overview.refetch(), [overview]);

    return {
        isLoading: overview.isLoading,
        notVendor,
        loadFailed: Boolean(overview.error) && !notVendor,
        retry,
        overview: overview.data ?? null,
        sections: overview.data ? businessSections(overview.data, cardPreview) : null,
        profile: profileQuery.data ?? null,
        balances: portal.data ? partnerBalances(portal.data.totals) : null,
        tierProgress: portal.data?.tierProgress ?? null,
        cardPreview,
        events,
        services,
        contact,
        becomePartner,
        profileOpen,
        openProfile,
        closeProfile,
    };
}
```

`getErrorCode` (from `lib/api/errors.ts`) reads the code off the `ApiError`'s problem detail, as `partnerPortalBlock` does.

- [ ] **Step 2: Make `usePartnerPortal` take `enabled`** (in `hooks/usePartnerPortal.ts`)

```ts
export function usePartnerPortal(enabled = true) {
    return useQuery({
        queryKey: partnerPortalKeys.me,
        queryFn: () => api.get<PartnerPortalResponseDto>(endpoints.partners.me),
        enabled,
        retry: false,
    });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from these files.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(business): page hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Section frame and icons

**Files:** Modify `components/vendors/me/VendorMeSection.tsx`; create `components/business/BusinessSectionIcon.tsx`

- [ ] **Step 1: Optional icon on `VendorMeSection`** — add an `icon?: ReactNode` prop, and render it before the title block:

```tsx
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    {icon}
                    <div className="min-w-0">
                        <h3 id={id} className="text-base font-semibold text-ink">
                            {title}
                        </h3>
                        {hint && <p className="mt-0.5 text-sm leading-snug text-ink-muted">{hint}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
```

Sections without an icon render exactly as before (the wrapper only adds a flex row).

- [ ] **Step 2: Icon tiles** — same wash-and-paper look as `VendorToolIcon`'s `md` size:

```tsx
import { CalendarDays, ChartNoAxesColumn, Eye, Images, Mail, type LucideIcon, Printer } from 'lucide-react';

import { cn } from '@/lib/utils';

export type BusinessSectionKey = 'insights' | 'events' | 'content' | 'printPrices' | 'previews' | 'contact';

// A section's sign on its colored tile, in the style of the event page's tool icons. Decoration only: the
// section title next to it names it.
export function BusinessSectionIcon({ section, className }: { section: BusinessSectionKey; className?: string }) {
    const { icon: Icon, wash, ink } = TILES[section];

    return (
        <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-[0.875rem]', wash, className)}>
            <span className="flex size-7 -rotate-6 items-center justify-center rounded-md bg-card shadow-sm ring-1 ring-ink/5">
                <Icon className={cn('size-4', ink)} strokeWidth={2.25} />
            </span>
        </span>
    );
}

const TILES: Record<BusinessSectionKey, { icon: LucideIcon; wash: string; ink: string }> = {
    insights: { icon: ChartNoAxesColumn, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    events: { icon: CalendarDays, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
    content: { icon: Images, wash: 'bg-status-teal-wash', ink: 'text-status-teal' },
    printPrices: { icon: Printer, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
    previews: { icon: Eye, wash: 'bg-accent-pink/12', ink: 'text-accent-pink' },
    contact: { icon: Mail, wash: 'bg-status-good-wash', ink: 'text-status-good' },
};
```

If `ChartNoAxesColumn` isn't in the installed lucide version, use `BarChart3`.

- [ ] **Step 3: Run the vendor page tests**

Run: `npx vitest run components/vendors/me`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(business): section icons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Top card

**Files:** Create `components/partners/PartnerBalances.tsx`, `components/business/BusinessHero.tsx`; delete `components/partners/PartnerHero.tsx` once unused (Task 10)

- [ ] **Step 1: Extract the balance block** from `PartnerHero` into `PartnerBalances` (same markup, `t = useTranslations('PartnerPortalPage')`):

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatMoney } from '@/lib/billing';
import type { PartnerBalance } from '@/lib/partnerPortal';

// What a partner is still owed, per currency, with what they earned and were paid below it.
export function PartnerBalances({ balances }: { balances: PartnerBalance[] }) {
    const t = useTranslations('PartnerPortalPage');
    const locale = useLocale();

    return (
        <div>
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('totals.title')}</p>
            {balances.length === 0 ? (
                <p className="mt-2 text-lg font-semibold text-ink">{t('totals.empty')}</p>
            ) : (
                <ul className="mt-1 flex flex-col gap-3">
                    {balances.map((balance) => (
                        <li key={balance.currency}>
                            <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">
                                {formatMoney(locale, balance.owedMinor, balance.currency)}
                            </p>
                            <p className="mt-1 text-sm text-ink-muted tabular-nums">
                                {t('totals.earnedPaid', {
                                    earned: formatMoney(locale, balance.earnedMinor, balance.currency),
                                    paid: formatMoney(locale, balance.paidMinor, balance.currency),
                                })}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Top card**

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PartnerBalances } from '@/components/partners/PartnerBalances';
import { PartnerTierProgress } from '@/components/partners/PartnerTierProgress';
import { Button } from '@/components/ui/button';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { PartnerRole, PartnerTierProgressDto, VendorProfileDto } from '@/lib/api/types';
import type { PartnerBalance } from '@/lib/partnerPortal';
import { cn } from '@/lib/utils';

// Who the business is, and for partners what they are owed and their commission.
export function BusinessHero({
    profile,
    vendorType,
    partner,
    balances,
    tierProgress,
    onEditAction,
}: {
    profile: VendorProfileDto | null;
    vendorType: PartnerRole | null;
    partner: boolean;
    balances: PartnerBalance[] | null;
    tierProgress: PartnerTierProgressDto | null;
    onEditAction: () => void;
}) {
    const t = useTranslations('BusinessPage');
    const tVendors = useTranslations('Vendors');
    const name = profile?.businessName ?? t('unnamed');

    return (
        <section aria-labelledby="business-name" className={cn(VENDOR_SECTION_SURFACE, 'relative overflow-hidden p-5 sm:p-7 lg:col-span-2')}>
            {/* Glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />

            {/* Identity */}
            <div className="relative flex items-center gap-3.5">
                <VendorLogo logoUrl={profile?.logoUrl ?? null} name={name} />
                <div className="min-w-0 flex-1">
                    <h2 id="business-name" className="truncate text-xl leading-tight font-bold tracking-tight text-ink sm:text-2xl">
                        {name}
                    </h2>
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                        {vendorType && <span>{tVendors(`types.${vendorType}`)}</span>}
                        {partner && (
                            <span className="rounded-full bg-status-good-wash px-2 py-0.5 text-xs font-semibold text-status-good">{t('partnerPill')}</span>
                        )}
                    </p>
                </div>
                <Button type="button" variant="outline" onClick={onEditAction} className="shrink-0 gap-2 rounded-full px-3">
                    <Pencil className="size-4" aria-hidden="true" />
                    {t('edit')}
                </Button>
            </div>

            {/* Earnings */}
            {partner && balances && (
                <div className={cn('relative mt-7 grid gap-7 border-t border-border pt-6', tierProgress && 'sm:grid-cols-2 sm:gap-0')}>
                    <PartnerBalances balances={balances} />
                    {tierProgress && <PartnerTierProgress progress={tierProgress} className="sm:border-l sm:border-border sm:pl-8" />}
                </div>
            )}
        </section>
    );
}
```

Check `VendorLogo`'s props (`logoUrl`, `name`, alt text from the name) and pass a size if it has one for the hero.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from these files.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(business): top card with identity and earnings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Insights, events, content

**Files:** Create `components/business/BusinessInsightsSection.tsx`, `BusinessTrendChart.tsx`, `BusinessEventsSection.tsx`, `BusinessEventRow.tsx`, `BusinessContentSection.tsx`, `BusinessInsightsSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessInsightsSection } from '@/components/business/BusinessInsightsSection';
import messages from '@/messages/en.json';

vi.mock('@/components/business/BusinessTrendChart', () => ({ BusinessTrendChart: () => <div data-testid="trend" /> }));

function renderSection(partner: boolean) {
    const overview = partner
        ? {
              partner: true,
              vendorType: 'PHOTOGRAPHER' as const,
              totals: { events: 3, guests: 120, listTaps: 4, proViews: 900, postViewers: 60, cardTaps: 12 },
              trend: [{ month: '2026-11', views: 20 }],
          }
        : { partner: false, vendorType: 'MUSIC' as const, totals: { events: 3, guests: 120, listTaps: 4 } };
    const onBecomePartner = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessInsightsSection overview={overview} onBecomePartnerAction={onBecomePartner} />
        </NextIntlClientProvider>,
    );
}

describe('BusinessInsightsSection', () => {
    afterEach(cleanup);

    it('shows a vendor three counts and the partner prompt', () => {
        renderSection(false);
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.queryByText('Photo and video views')).not.toBeInTheDocument();
        expect(screen.queryByTestId('trend')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Become a partner' })).toBeInTheDocument();
    });

    it('shows a partner every count and the chart', () => {
        renderSection(true);
        expect(screen.getByText('Photo and video views')).toBeInTheDocument();
        expect(screen.getByText('900')).toBeInTheDocument();
        expect(screen.getByTestId('trend')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run components/business/BusinessInsightsSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Insights section**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { BusinessTrendChart } from '@/components/business/BusinessTrendChart';
import { Button } from '@/components/ui/button';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import { businessInsightKeys } from '@/lib/business';
import { formatReachCount } from '@/lib/vendorReach';

// The vendor's numbers across their events. Partners see every count and the monthly chart; others see three and an invite.
export function BusinessInsightsSection({
    overview,
    onBecomePartnerAction,
}: {
    overview: BusinessOverviewDto;
    onBecomePartnerAction: () => void;
}) {
    const t = useTranslations('BusinessPage.insights');
    const locale = useLocale();
    const items = businessInsightKeys(overview).map((key) => ({
        key,
        label: t(key),
        value: formatReachCount(locale, overview.totals[key] ?? 0),
    }));

    return (
        <VendorMeSection id="business-insights-title" title={t('title')} icon={<BusinessSectionIcon section="insights" />}>
            {/* Counts */}
            <MetricStrip items={items} wrapLabels />

            {/* Trend */}
            {overview.trend && <BusinessTrendChart trend={overview.trend} />}

            {/* Partner invite */}
            {!overview.partner && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
                    <p className="text-sm text-ink-muted">{t('partnerPrompt')}</p>
                    <Button type="button" size="sm" onClick={onBecomePartnerAction} className="rounded-full">
                        {t('becomePartner')}
                    </Button>
                </div>
            )}
        </VendorMeSection>
    );
}
```

- [ ] **Step 4: Trend chart** (bars; one series, so one color)

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { monthLabel } from '@/lib/business';
import { formatReachCount } from '@/lib/vendorReach';

// Views per month over the last six months.
export function BusinessTrendChart({ trend }: { trend: { month: string; views: number }[] }) {
    const t = useTranslations('BusinessPage.insights');
    const locale = useLocale();
    const formatMonth = useCallback((value: unknown) => monthLabel(locale, String(value)), [locale]);
    const formatCount = useCallback((value: unknown) => formatReachCount(locale, Number(value)), [locale]);
    const formatTooltip = useCallback((value: unknown) => [formatCount(value), t('trendViews')], [formatCount, t]);

    return (
        <figure className="flex flex-col gap-2">
            {/* Title */}
            <figcaption className="text-sm font-semibold text-ink">{t('trendTitle')}</figcaption>

            {/* Chart */}
            <div role="img" aria-label={t('trendTitle')} className="h-44 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickFormatter={formatCount} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip labelFormatter={formatMonth} formatter={formatTooltip} cursor={{ fill: 'var(--canvas)' }} />
                        <Bar dataKey="views" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </figure>
    );
}
```

- [ ] **Step 5: Event row and section**

```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { BusinessEventDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

// One event the vendor worked: name, date and guests, with views for partners. Opens that event's vendor page while access lasts.
export function BusinessEventRow({ event }: { event: BusinessEventDto }) {
    const t = useTranslations('BusinessPage.events');
    const locale = useLocale();
    const body = (
        <>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                <p className="truncate text-xs text-ink-muted">
                    {formatDate(locale, event.startAt, { dateStyle: 'medium' })} · {t('rowGuests', { count: event.guests })}
                    {!event.open && ` · ${t('ended')}`}
                </p>
            </div>
            {event.views !== undefined && <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">{t('rowViews', { count: event.views })}</p>}
            {event.open && <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
        </>
    );

    return (
        <li>
            {event.open ? (
                <AppLink href={routes.events.tools.vendorMe(event.eventId)} className="flex min-h-14 items-center gap-3 py-3">
                    {body}
                </AppLink>
            ) : (
                <div className="flex min-h-14 items-center gap-3 py-3">{body}</div>
            )}
        </li>
    );
}
```

`routes.events.tools.vendorMe(eventId)` is in `lib/routes.ts` (it takes an optional `{ section }`).

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { BusinessEventRow } from '@/components/business/BusinessEventRow';
import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { Button } from '@/components/ui/button';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { BusinessEventDto } from '@/lib/api/types';

// The vendor's events, newest first, ten at a time.
export function BusinessEventsSection({
    events,
    isLoading,
    loadFailed,
    hasMore,
    isLoadingMore,
    onLoadMoreAction,
    onRetryAction,
}: {
    events: BusinessEventDto[];
    isLoading: boolean;
    loadFailed: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMoreAction: () => void;
    onRetryAction: () => void;
}) {
    const t = useTranslations('BusinessPage.events');

    return (
        <VendorMeSection id="business-events-title" title={t('title')} icon={<BusinessSectionIcon section="events" />} busy={isLoading}>
            {isLoading ? (
                <VendorRowsSkeleton />
            ) : loadFailed ? (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
                    <Button type="button" variant="outline" size="sm" onClick={onRetryAction} className="rounded-full">
                        {t('retry')}
                    </Button>
                </div>
            ) : events.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <>
                    {/* Rows */}
                    <ul className="-my-3 divide-y divide-border">
                        {events.map((event) => (
                            <BusinessEventRow key={event.eventId} event={event} />
                        ))}
                    </ul>

                    {/* More */}
                    {hasMore && (
                        <Button type="button" variant="outline" onClick={onLoadMoreAction} disabled={isLoadingMore} className="self-center rounded-full">
                            {t('more')}
                        </Button>
                    )}
                </>
            )}
        </VendorMeSection>
    );
}
```


- [ ] **Step 6: Content section**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { formatReachCount } from '@/lib/vendorReach';

// What the vendor posted across their events.
export function BusinessContentSection({ content }: { content: NonNullable<BusinessOverviewDto['content']> }) {
    const t = useTranslations('BusinessPage.content');
    const tSneakPeek = useTranslations('Vendors.sneakPeek');
    const locale = useLocale();

    return (
        <VendorMeSection id="business-content-title" title={t('title')} icon={<BusinessSectionIcon section="content" />}>
            <MetricStrip
                wrapLabels
                items={[
                    { key: 'proItems', label: t('proItems'), value: formatReachCount(locale, content.proItems) },
                    { key: 'sneakPeeks', label: tSneakPeek('title'), value: formatReachCount(locale, content.sneakPeeks) },
                    { key: 'storage', label: t('storage'), value: formatBytes(content.proUsedBytes) },
                ]}
            />
        </VendorMeSection>
    );
}
```

- [ ] **Step 7: Run the test**

Run: `npx vitest run components/business/BusinessInsightsSection.test.tsx`
Expected: PASS (after the Task 11 copy exists; add the `BusinessPage.insights` keys now if needed).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(business): insights, events and content sections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Previews and contact

**Files:** Create `components/business/BusinessPreviewsSection.tsx`, `SneakPeekSample.tsx`, `BusinessContactSection.tsx`, `BusinessContactSheet.tsx`, `BusinessContactSheet.test.tsx`

- [ ] **Step 1: Sneak peek sample**

```tsx
'use client';

import { ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SneakPeekLabel } from '@/components/feed/post/SneakPeekLabel';
import { VendorLogo } from '@/components/vendors/VendorLogo';

// How a sneak peek post looks in the guests' feed, drawn with the vendor's name and logo and placeholder photos.
export function SneakPeekSample({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    const t = useTranslations('BusinessPage.previews');

    return (
        <article className="overflow-hidden rounded-2xl bg-background ring-1 ring-ink/5">
            {/* Label */}
            <div className="px-4 pt-4">
                <SneakPeekLabel />
            </div>

            {/* Author */}
            <div className="flex items-center gap-2.5 px-4 pt-3">
                <VendorLogo logoUrl={logoUrl} name={name} />
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
            </div>

            {/* Caption */}
            <p className="px-4 pt-2 text-sm text-ink">{t('sampleCaption')}</p>

            {/* Photos */}
            <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-0.5">
                {[0, 1, 2].map((tile) => (
                    <div key={tile} className="flex aspect-square items-center justify-center bg-canvas">
                        <ImageIcon className="size-5 text-ink-faint" />
                    </div>
                ))}
            </div>
        </article>
    );
}
```

- [ ] **Step 2: Previews section**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { SneakPeekSample } from '@/components/business/SneakPeekSample';
import { PartnerCardVariant } from '@/components/feed/partner/PartnerFeedCard';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { usePartnerBrandingCardPreview } from '@/hooks/usePartnerBrandingCard';
import type { PartnerBrandingDto } from '@/lib/api/types';

// What guests see from the vendor: their card in the feed (partners) and a sneak peek post (Pro album types).
export function BusinessPreviewsSection({
    cardPreview,
    showSneakPeek,
    name,
    logoUrl,
}: {
    cardPreview: PartnerBrandingDto | null;
    showSneakPeek: boolean;
    name: string;
    logoUrl: string | null;
}) {
    const t = useTranslations('BusinessPage.previews');

    return (
        <VendorMeSection id="business-previews-title" title={t('title')} icon={<BusinessSectionIcon section="previews" />}>
            {/* Feed card */}
            {cardPreview && (
                <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-ink">{t('feedCard')}</h4>
                    <FeedCardPreview branding={cardPreview} />
                </div>
            )}

            {/* Sneak peek */}
            {showSneakPeek && (
                <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-ink">{t('sneakPeek')}</h4>
                    <SneakPeekSample name={name} logoUrl={logoUrl} />
                </div>
            )}
        </VendorMeSection>
    );
}

function FeedCardPreview({ branding }: { branding: PartnerBrandingDto }) {
    const content = usePartnerBrandingCardPreview(branding);
    return <PartnerCardVariant variant={branding.variant} content={content} />;
}
```

Add to `hooks/usePartnerBrandingCard.ts`:

```ts
/** The same content without a link, for the partner's own preview: a tap must not count as a click. */
export function usePartnerBrandingCardPreview(branding: PartnerBrandingDto): PartnerBrandingCardContent {
    return { ...usePartnerBrandingCard({ ...branding, linkUrl: branding.linkUrl ?? '' }), href: null };
}
```

- [ ] **Step 3: Write the failing contact sheet test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessContactSheet } from '@/components/business/BusinessContactSheet';
import messages from '@/messages/en.json';

function renderSheet(overrides: Partial<Parameters<typeof BusinessContactSheet>[0]> = {}) {
    const props = {
        topic: null,
        message: '',
        topicError: null,
        messageError: null,
        sendError: null,
        sent: false,
        isSending: false,
        replyEmail: 'studio@example.com',
        onTopicChangeAction: vi.fn(),
        onMessageChangeAction: vi.fn(),
        onSubmitAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessContactSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('BusinessContactSheet', () => {
    afterEach(cleanup);

    it('picks a topic and sends', () => {
        const props = renderSheet({ topic: 'QUESTION', message: 'Hi' });
        fireEvent.click(screen.getByRole('radio', { name: 'Problem' }));
        expect(props.onTopicChangeAction).toHaveBeenCalledWith('PROBLEM');
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(props.onSubmitAction).toHaveBeenCalled();
    });

    it('says where the reply goes once sent', () => {
        renderSheet({ sent: true });
        expect(screen.getByText("Sent. We'll reply to studio@example.com.")).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 4: Run to see it fail**

Run: `npx vitest run components/business/BusinessContactSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 5: Contact sheet**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VENDOR_CONTACT_MESSAGE_MAX } from '@/hooks/useBusinessContact';
import type { VendorContactTopic } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TOPICS: readonly VendorContactTopic[] = ['QUESTION', 'PROBLEM', 'PARTNERSHIP', 'OTHER'];

// "Write to us": a topic, a message, and a short confirmation once sent.
export function BusinessContactSheet({
    topic,
    message,
    topicError,
    messageError,
    sendError,
    sent,
    isSending,
    replyEmail,
    onTopicChangeAction,
    onMessageChangeAction,
    onSubmitAction,
    onCloseAction,
}: {
    topic: VendorContactTopic | null;
    message: string;
    topicError: string | null;
    messageError: string | null;
    sendError: string | null;
    sent: boolean;
    isSending: boolean;
    replyEmail: string;
    onTopicChangeAction: (topic: VendorContactTopic) => void;
    onMessageChangeAction: (message: string) => void;
    onSubmitAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('BusinessPage.contact');
    const topicErrorId = useId();
    const messageErrorId = useId();
    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmitAction();
    };

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={t('sheetTitle')} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle')}</h2>

                {sent ? (
                    /* Sent */
                    <div className="mt-4 flex flex-col gap-4">
                        <p role="status" className="text-sm text-ink">
                            {t('sent', { email: replyEmail })}
                        </p>
                        <Button type="button" onClick={onCloseAction} className="rounded-full">
                            {t('close')}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
                        {/* Topic */}
                        <fieldset className="flex flex-col gap-2">
                            <legend className="mb-2 text-sm text-ink">{t('topic')}</legend>
                            <div
                                role="radiogroup"
                                aria-describedby={topicError ? topicErrorId : undefined}
                                className="grid grid-cols-2 gap-2"
                            >
                                {TOPICS.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={topic === value}
                                        onClick={() => onTopicChangeAction(value)}
                                        className={cn(
                                            'min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors',
                                            topic === value ? 'border-primary bg-primary/10 text-ink' : 'border-border bg-background text-ink-muted',
                                        )}
                                    >
                                        {t(`topics.${value}`)}
                                    </button>
                                ))}
                            </div>
                            {topicError && (
                                <p id={topicErrorId} role="alert" className="text-xs text-rose-600">
                                    {topicError}
                                </p>
                            )}
                        </fieldset>

                        {/* Message */}
                        <div className="flex flex-col gap-1">
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('message')}
                                <textarea
                                    value={message}
                                    onChange={(event) => onMessageChangeAction(event.target.value)}
                                    maxLength={VENDOR_CONTACT_MESSAGE_MAX}
                                    rows={5}
                                    aria-invalid={messageError ? true : undefined}
                                    aria-describedby={messageError ? messageErrorId : undefined}
                                    className="rounded-lg border border-border bg-background px-3 py-2"
                                />
                            </label>
                            {messageError && (
                                <p id={messageErrorId} role="alert" className="text-xs text-rose-600">
                                    {messageError}
                                </p>
                            )}
                        </div>

                        {/* Send error */}
                        {sendError && (
                            <p role="alert" className="text-sm text-rose-600">
                                {sendError}
                            </p>
                        )}

                        {/* Footer */}
                        <Button type="submit" disabled={isSending} className="rounded-full">
                            {isSending ? t('sending') : t('send')}
                        </Button>
                    </form>
                )}
            </Modal.Body>
        </Modal>
    );
}
```

The inline `onClick`/`onChange` arrows follow `ServiceSheet`'s neighbours only if the repo allows them; if lint (`react/jsx-no-bind`) objects, move them into `useCallback` handlers that read `event.currentTarget.dataset.topic`, as `BugReportsTable` does.

- [ ] **Step 6: Contact row section**

```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { cn } from '@/lib/utils';

// One row that opens "Write to us".
export function BusinessContactSection({ onOpenAction }: { onOpenAction: () => void }) {
    const t = useTranslations('BusinessPage.contact');

    return (
        <section aria-label={t('title')} className={VENDOR_SECTION_SURFACE}>
            <button type="button" onClick={onOpenAction} className={cn('flex w-full items-center gap-3 p-4 text-left sm:p-5')}>
                <BusinessSectionIcon section="contact" />
                <span className="flex-1 text-base font-semibold text-ink">{t('title')}</span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            </button>
        </section>
    );
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run components/business`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(business): card previews and the contact sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Screen, route, redirect, robots

**Files:** Create `components/business/BusinessScreen.tsx`, `BusinessSkeleton.tsx`, `BusinessNotVendor.tsx`, `BusinessScreen.test.tsx`, `app/(main)/(app)/business/page.tsx`, `loading.tsx`; modify `app/(main)/(app)/partner/page.tsx`, delete `app/(main)/(app)/partner/loading.tsx`; modify `app/robots.ts`

- [ ] **Step 1: Skeleton and not-a-vendor state**

```tsx
import { MetricStripSkeleton } from '@/components/ui/MetricStrip';
import { Skeleton } from '@/components/ui/skeleton';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { cn } from '@/lib/utils';

// The business page's shape while it loads.
export function BusinessSkeleton() {
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Top card */}
            <div className={cn(VENDOR_SECTION_SURFACE, 'h-28 p-5 lg:col-span-2')}>
                <Skeleton className="h-6 w-48" />
            </div>
            {/* Main */}
            <div className={cn(VENDOR_SECTION_SURFACE, 'p-5')}>
                <MetricStripSkeleton count={3} />
            </div>
            {/* Side */}
            <div className={cn(VENDOR_SECTION_SURFACE, 'h-40 p-5')} />
        </div>
    );
}
```

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { PageErrorState } from '@/components/ui/PageErrorState';

// For an account with no vendor profile and no vendor rows.
export function BusinessNotVendor() {
    const t = useTranslations('BusinessPage.notVendor');
    return <PageErrorState title={t('title')} description={t('description')} />;
}
```

Check `PageErrorState`'s required props (it may require an action); if so, pass a back link to the profile using its existing action props.

- [ ] **Step 2: Write the failing screen test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessScreen } from '@/components/business/BusinessScreen';
import messages from '@/messages/en.json';

const page = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useBusinessPage', () => ({ useBusinessPage: () => page.value }));
vi.mock('@/components/business/BusinessTrendChart', () => ({ BusinessTrendChart: () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/business', useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

const ready = {
    isLoading: false,
    notVendor: false,
    loadFailed: false,
    retry: vi.fn(),
    overview: { partner: false, vendorType: 'MUSIC', totals: { events: 1, guests: 10, listTaps: 0 } },
    sections: { content: false, printPrices: false, feedCard: false, sneakPeekSample: false, previews: false },
    profile: { businessName: 'DJ Nikos', logoUrl: null, vendorType: 'MUSIC' },
    balances: null,
    tierProgress: null,
    cardPreview: null,
    events: { events: [], isLoading: false, loadFailed: false, hasMore: false, isLoadingMore: false, loadMore: vi.fn(), retry: vi.fn() },
    services: { visible: false, editing: null },
    contact: { open: false, openSheet: vi.fn() },
    becomePartner: { sheetOpen: false, openSheet: vi.fn(), closeSheet: vi.fn(), defaults: {}, search: '' },
    profileOpen: false,
    openProfile: vi.fn(),
    closeProfile: vi.fn(),
};

function renderScreen() {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessScreen />
        </NextIntlClientProvider>,
    );
}

describe('BusinessScreen', () => {
    afterEach(cleanup);

    it('tells an account that is no vendor what the page is for', () => {
        page.value = { ...ready, overview: null, sections: null, notVendor: true };
        renderScreen();
        expect(screen.getByText('This page is for businesses working at events')).toBeInTheDocument();
    });

    it('shows the sections a plain vendor gets, and leaves out empty ones', () => {
        page.value = ready;
        renderScreen();
        expect(screen.getByRole('heading', { name: 'DJ Nikos' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Your events' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Your content' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'How guests see you' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Contact us/ })).toBeInTheDocument();
    });
});
```

Match the `becomePartner` mock's field names to what `useBecomePartner` really returns (`sheetOpen`, `openSheet`, `closeSheet`, `defaults`, `search` — read its `return`).

- [ ] **Step 3: Run to see it fail**

Run: `npx vitest run components/business/BusinessScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Screen**

```tsx
'use client';

import { BriefcaseBusiness } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessContactSection } from '@/components/business/BusinessContactSection';
import { BusinessContactSheet } from '@/components/business/BusinessContactSheet';
import { BusinessContentSection } from '@/components/business/BusinessContentSection';
import { BusinessEventsSection } from '@/components/business/BusinessEventsSection';
import { BusinessHero } from '@/components/business/BusinessHero';
import { BusinessInsightsSection } from '@/components/business/BusinessInsightsSection';
import { BusinessNotVendor } from '@/components/business/BusinessNotVendor';
import { BusinessPreviewsSection } from '@/components/business/BusinessPreviewsSection';
import { BusinessSkeleton } from '@/components/business/BusinessSkeleton';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { BecomePartnerSheet } from '@/components/vendors/BecomePartnerSheet';
import { ServiceSheet } from '@/components/vendors/me/ServiceSheet';
import { ServicesSection } from '@/components/vendors/me/ServicesSection';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessPage } from '@/hooks/useBusinessPage';
import { routes } from '@/lib/routes';

export function BusinessScreen() {
    const t = useTranslations('BusinessPage');
    const { user } = useAuth();
    const page = useBusinessPage();
    const { overview, sections, profile } = page;
    const name = profile?.businessName ?? t('unnamed');

    return (
        <ModulePageShell maxWidth="5xl" title={t('title')} icon={BriefcaseBusiness} backLabel={t('back')} backHref={routes.profile}>
            {page.isLoading ? (
                <BusinessSkeleton />
            ) : page.notVendor ? (
                <BusinessNotVendor />
            ) : page.loadFailed || !overview || !sections ? (
                <PageErrorState title={t('unavailable.title')} description={t('unavailable.description')} onRetryAction={page.retry} />
            ) : (
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    {/* Top card */}
                    <BusinessHero
                        profile={profile}
                        vendorType={overview.vendorType}
                        partner={overview.partner}
                        balances={page.balances}
                        tierProgress={page.tierProgress}
                        onEditAction={page.openProfile}
                    />

                    {/* Main: numbers and events */}
                    <div className="flex min-w-0 flex-col gap-4">
                        {/* Insights */}
                        <BusinessInsightsSection overview={overview} onBecomePartnerAction={page.becomePartner.openSheet} />

                        {/* Events */}
                        <BusinessEventsSection
                            events={page.events.events}
                            isLoading={page.events.isLoading}
                            loadFailed={page.events.loadFailed}
                            hasMore={page.events.hasMore}
                            isLoadingMore={page.events.isLoadingMore}
                            onLoadMoreAction={page.events.loadMore}
                            onRetryAction={page.events.retry}
                        />

                        {/* Content */}
                        {sections.content && overview.content && <BusinessContentSection content={overview.content} />}
                    </div>

                    {/* Side: what they offer, how guests see them, contact */}
                    <div className="flex min-w-0 flex-col gap-4">
                        {/* Print prices */}
                        {sections.printPrices && (
                            <div id="print-prices">
                                <ServicesSection
                                    approved={page.services.approved}
                                    sizes={page.services.sizes}
                                    canAdd={page.services.canAdd}
                                    needsProfile={page.services.needsProfile}
                                    profileLoading={page.services.profileLoading}
                                    isLoading={page.services.isLoading}
                                    loadFailed={page.services.loadFailed}
                                    error={page.services.sectionError}
                                    includedRow={null}
                                    canApply={!overview.partner}
                                    onAddAction={page.services.openNew}
                                    onEditAction={page.services.openEdit}
                                    onBecomePartnerAction={page.becomePartner.openSheet}
                                />
                            </div>
                        )}

                        {/* Previews */}
                        {sections.previews && (
                            <BusinessPreviewsSection
                                cardPreview={sections.feedCard ? page.cardPreview : null}
                                showSneakPeek={sections.sneakPeekSample}
                                name={name}
                                logoUrl={profile?.logoUrl ?? null}
                            />
                        )}

                        {/* Contact */}
                        <BusinessContactSection onOpenAction={page.contact.openSheet} />
                    </div>
                </div>
            )}

            {/* Details sheet */}
            {page.profileOpen && overview && (
                <VendorProfileSheet open profile={profile} defaultType={overview.vendorType ?? 'OTHER'} onCloseAction={page.closeProfile} />
            )}

            {/* Print size sheet */}
            {page.services.editing && (
                <ServiceSheet
                    key={page.services.editing === 'new' ? 'new' : page.services.editing.id}
                    item={page.services.editing}
                    isSaving={page.services.isSaving}
                    error={page.services.sheetError}
                    onSaveAction={page.services.save}
                    onDeleteAction={page.services.requestDelete}
                    onCloseAction={page.services.close}
                />
            )}

            {/* Contact sheet */}
            {page.contact.open && (
                <BusinessContactSheet
                    topic={page.contact.topic}
                    message={page.contact.message}
                    topicError={page.contact.topicError}
                    messageError={page.contact.messageError}
                    sendError={page.contact.sendError}
                    sent={page.contact.sent}
                    isSending={page.contact.isSending}
                    replyEmail={user?.email ?? ''}
                    onTopicChangeAction={page.contact.setTopic}
                    onMessageChangeAction={page.contact.setMessage}
                    onSubmitAction={page.contact.submit}
                    onCloseAction={page.contact.closeSheet}
                />
            )}

            {/* Partner application */}
            <BecomePartnerSheet
                open={page.becomePartner.sheetOpen}
                defaults={page.becomePartner.defaults}
                search={page.becomePartner.search}
                onCloseAction={page.becomePartner.closeSheet}
            />
        </ModulePageShell>
    );
}
```

Copy the print-size delete confirmation (`ConfirmActionModal` bound to `services.confirmDelete` / `services.confirmRemove` / `services.cancelDelete`) from `VendorMeScreen.tsx` into the screen as well, with its JSX comment. Check the exact `ServicesSection` and `useVendorServicesSection` return names against `VendorMeScreen.tsx` (it is the reference caller).

- [ ] **Step 5: Route** — `app/(main)/(app)/business/page.tsx`

```tsx
import { dehydrate } from '@tanstack/react-query';

import { BusinessScreen } from '@/components/business/BusinessScreen';
import { BUSINESS_EVENTS_PAGE_SIZE } from '@/hooks/useBusinessEvents';
import { businessKeys } from '@/hooks/useBusinessOverview';
import { partnerPortalKeys } from '@/hooks/usePartnerPortal';
import { vendorProfileKeys } from '@/hooks/useVendorProfile';
import { endpoints } from '@/lib/api/endpoints';
import type { Page as ApiPage } from '@/lib/api/pagination';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { BusinessEventDto, BusinessOverviewDto, PartnerPortalResponseDto, VendorProfileDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { PageHydrationBoundary } from '@/providers/PageHydrationBoundary';

// Prefetches the overview, then the first events page, the profile and, for partners, their partner data.
// A 403 (not a vendor) seeds nothing; the client asks again and shows why.
export default async function BusinessPage() {
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const overview = await serverGet<BusinessOverviewDto>(endpoints.me.business, accessToken);
            queryClient.setQueryData(businessKeys.overview, overview);
            const [events, profile, portal] = await Promise.all([
                serverGet<ApiPage<BusinessEventDto>>(endpoints.me.businessEvents(0, BUSINESS_EVENTS_PAGE_SIZE), accessToken).catch(() => null),
                serverGetOrNull<VendorProfileDto>(endpoints.me.vendorProfile, accessToken).catch(() => null),
                overview.partner
                    ? serverGet<PartnerPortalResponseDto>(endpoints.partners.me, accessToken).catch(() => null)
                    : Promise.resolve(null),
            ]);
            if (events) queryClient.setQueryData(businessKeys.events, { pages: [events], pageParams: [0] });
            if (profile) queryClient.setQueryData(vendorProfileKeys.mine, profile);
            if (portal) queryClient.setQueryData(partnerPortalKeys.me, portal);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }

    return (
        <PageHydrationBoundary state={dehydrate(queryClient)}>
            <BusinessScreen />
        </PageHydrationBoundary>
    );
}
```

The print sizes are not prefetched (the event page doesn't either).

`app/(main)/(app)/business/loading.tsx`:

```tsx
import { BusinessSkeleton } from '@/components/business/BusinessSkeleton';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return (
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-8">
            <BusinessSkeleton />
        </div>
    );
}
```

- [ ] **Step 6: Redirect** — replace `app/(main)/(app)/partner/page.tsx` with:

```tsx
import { permanentRedirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// The partner page is now part of the business page (spec 2026-11-01).
export default function PartnerPage() {
    permanentRedirect(routes.business);
}
```

Delete `app/(main)/(app)/partner/loading.tsx`.

- [ ] **Step 7: Robots** — in `app/robots.ts` add `'/business'` to `PRIVATE_PATHS` (keep `'/partner'`).

- [ ] **Step 8: Run the tests and type-check**

Run: `npx vitest run components/business && npx tsc --noEmit`
Expected: PASS; remaining type errors only in files Task 10 removes.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(business): the /business page; /partner redirects to it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Entry points and cleanup

**Files:** Create `components/profile/ProfileBusinessLink.tsx`, `components/vendors/me/PrintPricesLinkSection.tsx`; modify `components/profile/ProfileContent.tsx`, `components/account/AccountSidebarContent.tsx`, `components/vendors/me/VendorMeScreen.tsx`; delete `ProfileVendorSection.tsx` (+ test), `ProfilePartnerSection.tsx`, `components/partners/PartnerPortalBoundary.tsx` (+ test), `PartnerPortalFrame.tsx`, `PartnerPortalSkeleton.tsx`, `PartnerPortalBlocked.tsx`, `PartnerReachSection.tsx` (+ test), `PartnerHero.tsx`

- [ ] **Step 1: Profile link** (replaces both profile sections)

```tsx
'use client';

import { BriefcaseBusiness, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { useMe } from '@/hooks/useMe';
import { routes } from '@/lib/routes';

// Only for vendors and partners: a link to their business page.
export function ProfileBusinessLink() {
    const t = useTranslations('ProfilePage.business');
    const { data: me } = useMe();

    if (!me?.vendor && !me?.partner) return null;

    return (
        <section className="rounded-[1.5rem] bg-card shadow-[0_18px_48px_rgba(35,28,22,0.08)]">
            {/* Business page link */}
            <AppLink href={routes.business} className="flex min-h-14 items-center gap-2 p-4 sm:p-5">
                <BriefcaseBusiness className="size-4 text-primary" aria-hidden="true" />
                <span className="flex-1 text-base font-semibold text-ink">{t('title')}</span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            </AppLink>
        </section>
    );
}
```

In `ProfileContent.tsx` replace the `{/* Vendor details */}` and `{/* Partner page */}` blocks with:

```tsx
                {/* Business page */}
                <ProfileBusinessLink />
```

and fix the imports.

- [ ] **Step 2: Drawer entry** — in `AccountSidebarContent.tsx` add `const { data: me } = useMe();` and, after the Profile link:

```tsx
                        {(me?.vendor || me?.partner) && (
                            <AccountSidebarNavLink href={routes.business} icon={BriefcaseBusiness} label={t('business')} onNavigateAction={onCloseAction} />
                        )}
```

(imports `BriefcaseBusiness` from lucide-react and `useMe`).

- [ ] **Step 3: Per-event page** — `PrintPricesLinkSection.tsx`:

```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { routes } from '@/lib/routes';

// Print prices are set once for every event on the business page; this event keeps only its included prints.
export function PrintPricesLinkSection({ includedRow }: { includedRow: ReactNode }) {
    const t = useTranslations('Vendors.me.printPrices');

    return (
        <VendorMeSection id="vendor-print-prices-title" title={t('title')}>
            {/* Link */}
            <AppLink href={`${routes.business}#print-prices`} className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-ink">
                {t('openBusiness')}
                <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            </AppLink>

            {/* Included prints */}
            {includedRow}
        </VendorMeSection>
    );
}
```

In `VendorMeScreen.tsx`, replace the `{/* Print prices */}` `ServicesSection` block with:

```tsx
                            {/* Print prices */}
                            {services.visible && (
                                <PrintPricesLinkSection
                                    includedRow={
                                        prints.open &&
                                        !prints.includedFailed && (
                                            <PrintsIncludedRow
                                                included={prints.included}
                                                isLoading={prints.isLoadingIncluded}
                                                onEditAction={prints.openIncluded}
                                            />
                                        )
                                    }
                                />
                            )}
```

and remove the `ServiceSheet` block, the services delete confirmation and the now-unused imports. Keep `useVendorServicesSection` only if `services.visible` is still needed (it is; it's cheap — the list query is disabled unless approved). Update `VendorMeScreen.test.tsx` and `ServicesSection.test.tsx` expectations that relied on the print sizes being on this page.

- [ ] **Step 4: Delete the old partner page pieces** listed in **Files**, and their `PartnerPortalPage` copy that nothing uses any more (keep `totals.*` and the tier progress keys used by `PartnerBalances`/`PartnerTierProgress`). Find leftovers:

```bash
grep -rn "PartnerPortalBoundary\|PartnerPortalFrame\|PartnerPortalSkeleton\|PartnerPortalBlocked\|PartnerReachSection\|PartnerHero\|ProfileVendorSection\|ProfilePartnerSection\|routes.partner\b" app components hooks lib
```

Expected: no output. `lib/partnerPortal.ts`'s `partnerPortalBlock` becomes unused: delete it and its test cases.

- [ ] **Step 5: Run everything touched**

Run: `npx tsc --noEmit && npx vitest run components/profile components/account components/vendors components/business components/partners lib hooks`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(business): drawer, profile and event page link to My business

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Copy

**Files:** `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the `BusinessPage` namespace** (top level, next to `PartnerPortalPage`)

English:

```json
"BusinessPage": {
    "title": "My business",
    "back": "Profile",
    "unnamed": "Your business",
    "edit": "Edit",
    "partnerPill": "Partner",
    "notVendor": {
        "title": "This page is for businesses working at events",
        "description": "Join an event from the link a host sent you."
    },
    "unavailable": {
        "title": "Couldn't load this page",
        "description": "Try again in a moment."
    },
    "insights": {
        "title": "Insights",
        "events": "Events",
        "guests": "Guests",
        "proViews": "Photo and video views",
        "postViewers": "Post viewers",
        "cardTaps": "Feed card taps",
        "listTaps": "Profile taps",
        "trendTitle": "Views per month",
        "trendViews": "Views",
        "partnerPrompt": "Partners also see views and card taps.",
        "becomePartner": "Become a partner"
    },
    "events": {
        "title": "Your events",
        "empty": "You haven't joined an event yet.",
        "rowGuests": "{count, plural, one {# guest} other {# guests}}",
        "rowViews": "{count, plural, one {# view} other {# views}}",
        "ended": "Access ended",
        "more": "Show more",
        "loadFailed": "Couldn't load your events.",
        "retry": "Try again"
    },
    "content": {
        "title": "Your content",
        "proItems": "Photos and videos",
        "storage": "Storage used"
    },
    "previews": {
        "title": "How guests see you",
        "feedCard": "Your card in the feed",
        "sneakPeek": "A first look post",
        "sampleCaption": "A first look at the day."
    },
    "contact": {
        "title": "Contact us",
        "sheetTitle": "Write to us",
        "topic": "Topic",
        "topics": {
            "QUESTION": "Question",
            "PROBLEM": "Problem",
            "PARTNERSHIP": "Partnership",
            "OTHER": "Other"
        },
        "message": "Message",
        "send": "Send",
        "sending": "Sending…",
        "sent": "Sent. We'll reply to {email}.",
        "close": "Close",
        "topicRequired": "Pick a topic.",
        "messageRequired": "Write a message."
    }
}
```

Greek (same keys):

```json
"BusinessPage": {
    "title": "Η επιχείρησή μου",
    "back": "Προφίλ",
    "unnamed": "Η επιχείρησή σας",
    "edit": "Επεξεργασία",
    "partnerPill": "Συνεργάτης",
    "notVendor": {
        "title": "Η σελίδα είναι για επιχειρήσεις που δουλεύουν σε εκδηλώσεις",
        "description": "Μπείτε σε μια εκδήλωση από τον σύνδεσμο που σας έστειλε ο διοργανωτής."
    },
    "unavailable": {
        "title": "Η σελίδα δεν φορτώθηκε",
        "description": "Δοκιμάστε ξανά σε λίγο."
    },
    "insights": {
        "title": "Στατιστικά",
        "events": "Εκδηλώσεις",
        "guests": "Καλεσμένοι",
        "proViews": "Προβολές φωτογραφιών και βίντεο",
        "postViewers": "Θεατές αναρτήσεων",
        "cardTaps": "Πατήματα στην κάρτα",
        "listTaps": "Πατήματα στο προφίλ",
        "trendTitle": "Προβολές ανά μήνα",
        "trendViews": "Προβολές",
        "partnerPrompt": "Οι συνεργάτες βλέπουν και προβολές και πατήματα στην κάρτα.",
        "becomePartner": "Γίνετε συνεργάτης"
    },
    "events": {
        "title": "Οι εκδηλώσεις σας",
        "empty": "Δεν έχετε μπει ακόμη σε εκδήλωση.",
        "rowGuests": "{count, plural, one {# καλεσμένος} other {# καλεσμένοι}}",
        "rowViews": "{count, plural, one {# προβολή} other {# προβολές}}",
        "ended": "Η πρόσβαση έληξε",
        "more": "Περισσότερες",
        "loadFailed": "Οι εκδηλώσεις σας δεν φορτώθηκαν.",
        "retry": "Δοκιμάστε ξανά"
    },
    "content": {
        "title": "Το περιεχόμενό σας",
        "proItems": "Φωτογραφίες και βίντεο",
        "storage": "Χώρος σε χρήση"
    },
    "previews": {
        "title": "Πώς σας βλέπουν οι καλεσμένοι",
        "feedCard": "Η κάρτα σας στη ροή",
        "sneakPeek": "Ανάρτηση «Πρώτη ματιά»",
        "sampleCaption": "Μια πρώτη ματιά στη μέρα."
    },
    "contact": {
        "title": "Επικοινωνία",
        "sheetTitle": "Γράψτε μας",
        "topic": "Θέμα",
        "topics": {
            "QUESTION": "Ερώτηση",
            "PROBLEM": "Πρόβλημα",
            "PARTNERSHIP": "Συνεργασία",
            "OTHER": "Άλλο"
        },
        "message": "Μήνυμα",
        "send": "Αποστολή",
        "sending": "Αποστολή…",
        "sent": "Στάλθηκε. Θα απαντήσουμε στο {email}.",
        "close": "Κλείσιμο",
        "topicRequired": "Επιλέξτε θέμα.",
        "messageRequired": "Γράψτε ένα μήνυμα."
    }
}
```

- [ ] **Step 2: Other keys**
  - `AccountDrawer.business`: "My business" / "Η επιχείρησή μου".
  - `ProfilePage.business.title`: "My business" / "Η επιχείρησή μου". Remove `ProfilePage.partner` and the `Vendors.profile.sectionTitle`/`edit` keys only if nothing else uses them (grep first).
  - `Vendors.me.printPrices`: `{ "title": "Print prices", "openBusiness": "Change them in My business" }` / `{ "title": "Τιμές εκτυπώσεων", "openBusiness": "Αλλάξτε τες στη σελίδα «Η επιχείρησή μου»" }`.
  - Admin copy: Task 12.

- [ ] **Step 3: Check the two files have the same keys**

Run: `npx vitest run messages` (if the repo has a parity test) or:

```bash
node -e "const a=require('./messages/en.json'),b=require('./messages/el.json');const k=(o,p='')=>Object.entries(o).flatMap(([x,v])=>typeof v==='object'?k(v,p+x+'.'):[p+x]);const A=new Set(k(a)),B=new Set(k(b));console.log([...A].filter(x=>!B.has(x)),[...B].filter(x=>!A.has(x)))"
```

Expected: `[] []`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(business): English and Greek copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Admin inbox

**Files:** Create `hooks/useAdminVendorMessages.ts`, `hooks/useVendorMessagesPanel.ts`, `components/admin/vendorMessages/VendorMessagesPanel.tsx`, `VendorMessagesTable.tsx`, `VendorMessageDrawer.tsx`, `VendorMessageStatusPill.tsx`, `components/admin/AdminNavigationContext.vendorMessages.test.tsx`; modify `AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx`, `messages/*.json`

- [ ] **Step 1: Data hooks**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { VendorContactMessageDto, VendorContactStatus } from '@/lib/api/types';

export const VENDOR_MESSAGES_PAGE_SIZE = 50;

export const adminVendorMessageKeys = {
    all: ['admin', 'vendor-messages'] as const,
    list: (status: VendorContactStatus | null, page: number) => ['admin', 'vendor-messages', 'list', status, page] as const,
    newCount: ['admin', 'vendor-messages', 'new-count'] as const,
};

export function useAdminVendorMessages(status: VendorContactStatus | null, page: number) {
    return useQuery({
        queryKey: adminVendorMessageKeys.list(status, page),
        queryFn: () =>
            api.get<Page<VendorContactMessageDto>>(endpoints.admin.vendorMessages.list({ status, page, size: VENDOR_MESSAGES_PAGE_SIZE })),
        placeholderData: (previous) => previous,
    });
}

// The nav badge: messages nobody has answered yet.
export function useNewVendorMessagesCount(enabled = true): number {
    const query = useQuery({
        queryKey: adminVendorMessageKeys.newCount,
        enabled,
        queryFn: () => api.get<Page<VendorContactMessageDto>>(endpoints.admin.vendorMessages.list({ status: 'NEW', page: 0, size: 1 })),
    });
    return query.data?.page.totalElements ?? 0;
}

export function useSetVendorMessageStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: VendorContactStatus }) =>
            api.patch<VendorContactMessageDto>(endpoints.admin.vendorMessages.byId(id), { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: adminVendorMessageKeys.all }),
    });
}
```

(Check `api.patch` exists in `lib/api/client.ts`; other admin hooks use it.)

```ts
'use client';

import { useCallback, useState } from 'react';

import { useAdminVendorMessages, useSetVendorMessageStatus } from '@/hooks/useAdminVendorMessages';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { VendorContactMessageDto, VendorContactStatus } from '@/lib/api/types';

// The inbox: a status filter, a page, the open message and its status change.
export function useVendorMessagesPanel() {
    const toErrorMessage = useApiErrorMessage();
    const [status, setStatusFilter] = useState<VendorContactStatus | null>('NEW');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<VendorContactMessageDto | null>(null);
    const [error, setError] = useState<string | null>(null);
    const query = useAdminVendorMessages(status, page);
    const setStatus = useSetVendorMessageStatus();

    const changeFilter = useCallback((next: VendorContactStatus | null) => {
        setStatusFilter(next);
        setPage(0);
    }, []);
    const open = useCallback((message: VendorContactMessageDto) => {
        setError(null);
        setSelected(message);
    }, []);
    const close = useCallback(() => setSelected(null), []);
    const mark = useCallback(
        async (next: VendorContactStatus) => {
            if (!selected) return;
            setError(null);
            try {
                setSelected(await setStatus.mutateAsync({ id: selected.id, status: next }));
            } catch (e) {
                setError(toErrorMessage(e));
            }
        },
        [selected, setStatus, toErrorMessage],
    );

    return { status, changeFilter, page, setPage, query, selected, open, close, mark, isMarking: setStatus.isPending, error };
}
```

- [ ] **Step 2: Status pill, table, drawer, panel** — follow `components/admin/betaFeedback/BugReports*` exactly for layout and classes:
  - `VendorMessageStatusPill`: `NEW` → `bg-status-warn-wash text-status-warn`, `ANSWERED` → `bg-status-good-wash text-status-good`, same pill classes as the bug report role pill.
  - `VendorMessagesTable({ messages, onOpenAction })`: columns Received (mono date), Business (name, or reply email when no name), Topic (neutral pill), Message (first line, a button that opens the drawer via `data-message-id`), Status (pill). `min-w-[760px]`.
  - `VendorMessageDrawer({ message, isMarking, error, onMarkAction, onCloseAction })` using `AdminDrawer`: subtitle = business name; body = topic pill, received date, the full message (`whitespace-pre-wrap`), the reply email in mono with a **Reply by email** link (`mailto:` + `?subject=` "StoryWall" — the address only, no message text in the URL); footer = **Mark answered** (when NEW) or **Mark as new** (when ANSWERED) and Close.
  - `VendorMessagesPanel`: heading, a segmented filter (New / Answered / All) using the console's existing segmented control (`FunnelSegmented`), the table in the bordered surface with loading / error / empty states and `AdminPagination`, and the drawer — same shape as `BugReportsPanel`.

- [ ] **Step 3: Write the failing nav test** (copy the setup of `AdminNavigationContext.reports.test.tsx`; assert the new tab)

```tsx
it('opens Vendor messages from #vendor-messages for admins only', () => {
    // Same render helper as the reports test, with role 'ADMIN' and location.hash = '#vendor-messages'.
    // expect(result.current.tab).toBe('vendorMessages');
    // With role 'MARKETING': expect(result.current.tabs.map((t) => t.key)).not.toContain('vendorMessages');
});
```

Write it out fully from the reports test's helper (its render function and hash setup) — read that file first; the two assertions above are the test.

- [ ] **Step 4: Register the tab**
  - `AdminNavigationContext.tsx`: add `| 'vendorMessages'` to `AdminTab`; `'#vendor-messages': 'vendorMessages'` to the hash map; `vendorMessages: '#vendor-messages'` to `TAB_TO_HASH`; `{ key: 'vendorMessages', label: t('vendorMessages'), icon: Mail }` after `bugReports` (import `Mail`).
  - `AdminShellNav.tsx`: `vendorMessages: 'operations'` in the group map; add `vendorMessages: useNewVendorMessagesCount(canOpenAdminTab(role, 'vendorMessages'))` to `pendingCounts`.
  - `AdminConsole.tsx`: render `<VendorMessagesPanel />` for `tab === 'vendorMessages'` in the same wrapper as bug reports.
  - Not added to `MARKETING_TABS`.

- [ ] **Step 5: Admin copy** — `AdminPage.vendorMessages` (tab label) and an `AdminPage.vendorMessagesPanel` namespace in both languages: title "Vendor messages" / "Μηνύματα επιχειρήσεων", loading, empty "No messages." / "Κανένα μήνυμα.", count (plural), filters new/answered/all, columns received/business/topic/message/status, statuses NEW "New"/"Νέο" and ANSWERED "Answered"/"Απαντήθηκε", topics (same four as the business page), reply "Reply by email"/"Απάντηση με email", markAnswered "Mark answered"/"Σήμανση ως απαντημένο", markNew "Mark as new"/"Σήμανση ως νέο", close "Close"/"Κλείσιμο". Match whether `AdminPage` has Greek translations (if `el.json`'s `AdminPage` is English, follow it).

- [ ] **Step 6: Run the tests**

Run: `npx vitest run components/admin hooks && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(admin): Vendor messages inbox

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Checks and visual review

- [ ] **Step 1: All checks**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run && npx next build`
Expected: all clean. Fix every lint error before moving on.

- [ ] **Step 2: SEO check** against `docs/seo-guidelines.md`: `/business` is a signed-in app page, blocked in `robots.ts` and not in the sitemap; nothing to index. List any rule it breaks as a **BLOCKER** in the reply and the PR.

- [ ] **Step 3: Visual check** — run the worktree dev server on :3000 against the local backend with the backend branch checked out (memory: local backend CORS is :3000 only; open the pane with `preview_start {url: "http://localhost:3000/"}`, never by name). Ask the user for the local test login. Check at 375px and desktop, signed in as:
  1. a partner photographer with branding on (all sections, chart, feed card, print prices, earnings);
  2. a plain DJ vendor (three counts, partner prompt, no content/previews/print prices);
  3. an account that is no vendor (not-a-vendor state);
  Also: send a contact message and see it in the admin console's Vendor messages with the badge; `/partner` redirects; the drawer and profile entries; the event page's Print prices link lands on `#print-prices`.

- [ ] **Step 4: Push and PR (after the user's OK)** — branch `claude/vendor-page-redesign-1fb056` into `staging`, title `feat: My business page`, description with the summary, the backend PR link and deploy order (backend first), the test steps above, and `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
